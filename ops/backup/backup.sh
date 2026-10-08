#!/usr/bin/env bash
# Sauvegarde chiffrée EWES : base PostgreSQL + documents privés (avec avatars/) +
# médias et documents publics. Lancée chaque nuit par cron (ewes-backup.cron).
# Procédure complète : ops/backup/README.md ; décisions : blueprint/18_Deployment.md §5.
#
#   backup.sh                 sauvegarde complète
#   backup.sh --check [N]     code de sortie 0 si la dernière réussite a moins de N heures
#                             (36 par défaut), 1 sinon — pour une supervision externe
set -Eeuo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$HERE/common.sh"

load_config
require_vars BACKUP_DIR

if [ "${1:-}" = "--check" ]; then
  max_hours=${2:-36}
  if [ -f "$BACKUP_DIR/last-success" ] && [ -n "$(find "$BACKUP_DIR/last-success" -mmin "-$((max_hours * 60))")" ]; then
    exit 0
  fi
  log ERROR "aucune sauvegarde réussie depuis plus de ${max_hours} h" >&2
  exit 1
fi

require_vars BACKUP_PG_CONTAINER BACKUP_PRIVATE_DIR BACKUP_PUBLIC_DIR BACKUP_GPG_RECIPIENT
case "$BACKUP_RETENTION_DAYS" in '' | *[!0-9]* | 0) die "BACKUP_RETENTION_DAYS doit être un entier >= 1" ;; esac

STEP="préparation"
STAGING=""
LOCK_DIR="$BACKUP_DIR/.lock"
LOCK_HELD=0

write_status() {
  printf '%s %s\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)${2:+ $2}" >"$BACKUP_DIR/status" 2>/dev/null || true
}

on_exit() {
  local rc=$?
  trap - EXIT
  if [ -n "$STAGING" ]; then rm -rf "$STAGING"; fi
  if [ "$rc" -ne 0 ] && [ "$LOCK_HELD" -eq 1 ]; then
    write_status FAIL "étape : $STEP"
    log ERROR "sauvegarde ÉCHOUÉE (étape : $STEP)" >&2
    command -v logger >/dev/null 2>&1 && logger -p user.err -t ewes-backup "sauvegarde échouée (étape : $STEP)" || true
  fi
  if [ "$LOCK_HELD" -eq 1 ]; then rm -rf "$LOCK_DIR"; fi
  exit "$rc"
}
trap on_exit EXIT

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Verrou : une seule sauvegarde à la fois (pas de flock, absent de certains systèmes).
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  other=$(cat "$LOCK_DIR/pid" 2>/dev/null || true)
  if [ -n "$other" ] && kill -0 "$other" 2>/dev/null; then
    die "une sauvegarde est déjà en cours (pid $other)"
  fi
  log WARN "verrou orphelin (pid ${other:-?}) repris"
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR"
fi
echo $$ >"$LOCK_DIR/pid"
LOCK_HELD=1

# --- Contrôles préalables : mieux vaut échouer ici qu'au milieu d'un flux. -------
STEP="contrôles préalables"
command -v gpg >/dev/null 2>&1 || die "gpg est introuvable"
command -v docker >/dev/null 2>&1 || die "docker est introuvable"
if [ -n "${BACKUP_RSYNC_TARGET:-}" ]; then
  command -v rsync >/dev/null 2>&1 || die "rsync est introuvable (BACKUP_RSYNC_TARGET est défini)"
fi
gpg --batch --list-keys "$BACKUP_GPG_RECIPIENT" >/dev/null 2>&1 \
  || die "clé publique '$BACKUP_GPG_RECIPIENT' absente du trousseau de $(id -un) (gpg --import)"
[ "$(docker inspect -f '{{.State.Running}}' "$BACKUP_PG_CONTAINER" 2>/dev/null || true)" = "true" ] \
  || die "le conteneur PostgreSQL '$BACKUP_PG_CONTAINER' ne tourne pas"
[ -d "$BACKUP_PRIVATE_DIR" ] || die "dossier des documents privés introuvable : $BACKUP_PRIVATE_DIR"
[ -d "$BACKUP_PUBLIC_DIR" ] || die "dossier des médias publics introuvable : $BACKUP_PUBLIC_DIR"

# Chiffre l'entrée standard pour le destinataire (clé publique seule). Le contrôle
# de confiance est désactivé : la clé a été importée volontairement par un humain.
encrypt_to() {
  gpg --batch --yes --quiet --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" \
    --output "$1" --encrypt
}

# Archive un dossier vers la sortie standard. tar renvoie 1 quand un fichier change
# pendant la lecture (un téléversement en cours) : l'archive reste valide, on le note.
tar_dir() {
  local rc=0
  tar -C "$1" -cf - "${@:2}" . || rc=$?
  if [ "$rc" -eq 1 ]; then
    log WARN "un fichier a changé pendant l'archivage de $1 (sans gravité)" >&2
    rc=0
  fi
  return "$rc"
}

ensure_not_empty() {
  [ -s "$1" ] || die "fichier de sauvegarde vide : $1"
}

RUN=$(date -u +%Y%m%dT%H%M%SZ)
STAGING="$BACKUP_DIR/.incomplete-$RUN"
mkdir "$STAGING"
log INFO "sauvegarde $RUN démarrée"

# La base d'abord, les fichiers ensuite : un fichier ajouté entre-temps n'est qu'un
# fichier sans ligne en base (inoffensif), alors que l'inverse laisserait des
# documents référencés sans contenu.
STEP="base de données"
pg_exec pg_dump -U "$BACKUP_PG_USER" -d "$BACKUP_PG_DB" --format=custom | encrypt_to "$STAGING/db.dump.gpg"
ensure_not_empty "$STAGING/db.dump.gpg"
pg_version=$(pg_exec psql -U "$BACKUP_PG_USER" -d "$BACKUP_PG_DB" -Atc 'SHOW server_version' | tr -d '\r')

STEP="documents privés"
tar_dir "$BACKUP_PRIVATE_DIR" | encrypt_to "$STAGING/private-files.tar.gpg"
ensure_not_empty "$STAGING/private-files.tar.gpg"

# Les vignettes (thumbs/) se refabriquent seules à la première demande.
STEP="médias et documents publics"
tar_dir "$BACKUP_PUBLIC_DIR" --exclude=./thumbs | encrypt_to "$STAGING/public-media.tar.gpg"
ensure_not_empty "$STAGING/public-media.tar.gpg"

STEP="empreintes"
{
  echo "date_utc=$RUN"
  echo "host=$(hostname)"
  echo "postgresql=$pg_version"
  echo "database=$BACKUP_PG_DB"
  echo "recipient=$BACKUP_GPG_RECIPIENT"
} >"$STAGING/MANIFEST"
(cd "$STAGING" && sha256sum db.dump.gpg private-files.tar.gpg public-media.tar.gpg MANIFEST >SHA256SUMS)

STEP="finalisation"
mv "$STAGING" "$BACKUP_DIR/$RUN"
STAGING=""
size=$(du -sh "$BACKUP_DIR/$RUN" | cut -f1)
log INFO "sauvegarde $RUN terminée ($size)"

# Rétention : seulement après une réussite (une série d'échecs ne vide pas le dossier).
STEP="rétention"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name "$RUN_DIR_GLOB" -mtime "+$BACKUP_RETENTION_DAYS" \
  -print -exec rm -rf {} + | sed 's/^/purge : /' || true
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '.incomplete-*' -mtime +1 -exec rm -rf {} + || true

touch "$BACKUP_DIR/last-success"

# Copie hors serveur (facultative mais fortement recommandée : une sauvegarde qui
# vit sur le disque qu'elle protège ne résiste pas à la perte du VPS). Sans
# --delete : la suppression locale ou un VPS vidé n'efface jamais la copie distante.
if [ -n "${BACKUP_RSYNC_TARGET:-}" ]; then
  STEP="copie hors serveur"
  rsync -a "$BACKUP_DIR/$RUN" "$BACKUP_RSYNC_TARGET"
  log INFO "copie hors serveur envoyée vers $BACKUP_RSYNC_TARGET"
fi

write_status OK "$RUN"
