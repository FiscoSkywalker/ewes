#!/usr/bin/env bash
# Restauration et test de restauration des sauvegardes EWES.
# À lancer sur une machine qui possède la clé PRIVÉE (jamais laissée sur le serveur
# en dehors de l'opération) — voir ops/backup/README.md.
#
#   restore.sh verify <sauvegarde>                      contrôle les empreintes
#   restore.sh test <sauvegarde>                        restaure dans une base et un dossier
#                                                       temporaires, compte, puis supprime
#   restore.sh restore-db <sauvegarde> <base> [--replace]
#                                                       restaure la base ; refuse d'écraser une
#                                                       base existante sans --replace
#   restore.sh restore-files <sauvegarde> <private|public> <dossier>
#                                                       extrait vers un dossier vide ou absent
#
# <sauvegarde> = dossier daté (ex. /var/backups/ewes/20261008T023000Z).
set -Eeuo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$HERE/common.sh"

usage() {
  sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

[ $# -ge 2 ] || usage
CMD=$1
RUN_PATH=${2%/}
shift 2

load_config
[ -d "$RUN_PATH" ] || die "sauvegarde introuvable : $RUN_PATH"

decrypt() {
  gpg --batch --quiet --decrypt "$1"
}

verify() {
  log INFO "contrôle des empreintes de $RUN_PATH"
  (cd "$RUN_PATH" && sha256sum --check --quiet SHA256SUMS) || die "empreintes invalides : sauvegarde altérée ou incomplète"
  log INFO "empreintes valides"
}

require_pg() {
  require_vars BACKUP_PG_CONTAINER
  [ "$(docker inspect -f '{{.State.Running}}' "$BACKUP_PG_CONTAINER" 2>/dev/null || true)" = "true" ] \
    || die "le conteneur PostgreSQL '$BACKUP_PG_CONTAINER' ne tourne pas"
}

pg_database_exists() {
  [ "$(pg_exec psql -U "$BACKUP_PG_USER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$1'" | tr -d '\r')" = "1" ]
}

# Noms de base : lettres, chiffres et _ uniquement (ils sont insérés dans du SQL).
check_db_name() {
  case "$1" in '' | *[!A-Za-z0-9_]*) die "nom de base invalide : '$1'" ;; esac
}

restore_db_into() {
  decrypt "$RUN_PATH/db.dump.gpg" \
    | pg_exec pg_restore -U "$BACKUP_PG_USER" -d "$1" --no-owner --exit-on-error
}

extract_files() { # <private|public> <dossier>
  local archive
  case "$1" in
    private) archive=private-files.tar.gpg ;;
    public) archive=public-media.tar.gpg ;;
    *) die "type de fichiers inconnu : '$1' (private ou public)" ;;
  esac
  decrypt "$RUN_PATH/$archive" | tar -xpf - -C "$2"
}

case "$CMD" in
  verify)
    verify
    ;;

  test)
    require_pg
    verify
    scratch="ewes_restore_test_$$"
    scratch_dir=$(mktemp -d)
    cleanup() {
      pg_exec dropdb -U "$BACKUP_PG_USER" --if-exists --force "$scratch" >/dev/null 2>&1 || true
      rm -rf "$scratch_dir"
    }
    trap cleanup EXIT

    log INFO "restauration de la base dans '$scratch'"
    pg_exec createdb -U "$BACKUP_PG_USER" "$scratch"
    restore_db_into "$scratch"
    for table in users sessions pages private_documents public_documents media contact_messages audit_logs audit_logs_archive; do
      count=$(pg_exec psql -U "$BACKUP_PG_USER" -d "$scratch" -Atc "SELECT count(*) FROM \"$table\"" | tr -d '\r') \
        || die "table '$table' illisible dans la base restaurée"
      printf '  %-22s %s ligne(s)\n' "$table" "$count"
    done

    for kind in private public; do
      mkdir "$scratch_dir/$kind"
      extract_files "$kind" "$scratch_dir/$kind"
      printf '  fichiers %-13s %s\n' "$kind" "$(find "$scratch_dir/$kind" -type f | wc -l | tr -d ' ')"
    done
    log INFO "test de restauration RÉUSSI (base et dossiers temporaires supprimés)"
    ;;

  restore-db)
    [ $# -ge 1 ] || usage
    database=$1
    replace=0
    [ "${2:-}" = "--replace" ] && replace=1
    check_db_name "$database"
    require_pg
    verify
    if pg_database_exists "$database"; then
      [ "$replace" -eq 1 ] || die "la base '$database' existe déjà : arrêter l'API puis relancer avec --replace"
      log WARN "remplacement de la base '$database' (l'API doit être arrêtée)"
      pg_exec dropdb -U "$BACKUP_PG_USER" --force "$database"
    fi
    pg_exec createdb -U "$BACKUP_PG_USER" "$database"
    restore_db_into "$database"
    log INFO "base '$database' restaurée"
    ;;

  restore-files)
    [ $# -ge 2 ] || usage
    kind=$1
    dest=$2
    verify
    if [ -e "$dest" ]; then
      [ -d "$dest" ] && [ -z "$(ls -A "$dest")" ] || die "$dest existe et n'est pas vide : choisir un dossier vide ou absent"
    else
      mkdir -p "$dest"
    fi
    extract_files "$kind" "$dest"
    log INFO "fichiers '$kind' extraits dans $dest (vérifier propriétaire et droits avant de remonter le volume)"
    ;;

  *)
    usage
    ;;
esac
