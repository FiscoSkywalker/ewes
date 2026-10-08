#!/usr/bin/env bash
# Fonctions communes à backup.sh et restore.sh (sourcé, jamais exécuté seul).
# Aucun secret ici ni dans la configuration : le chiffrement n'utilise que la clé
# PUBLIQUE de EWES/Planning Events ; la clé privée ne vit jamais sur le serveur.

log() {
  local level=$1
  shift
  printf '%s %-5s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$*"
}

die() {
  log ERROR "$*" >&2
  exit 1
}

# Charge la configuration (BACKUP_ENV_FILE, /etc/ewes/backup.env par défaut) puis
# applique les valeurs par défaut.
load_config() {
  local file=${BACKUP_ENV_FILE:-/etc/ewes/backup.env}
  [ -r "$file" ] || die "configuration illisible : $file (modèle : ops/backup/backup.env.example)"
  # shellcheck disable=SC1090
  . "$file"
  BACKUP_PG_USER=${BACKUP_PG_USER:-ewes}
  BACKUP_PG_DB=${BACKUP_PG_DB:-ewes}
  BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
}

require_vars() {
  local name
  for name in "$@"; do
    [ -n "${!name:-}" ] || die "variable $name absente de la configuration"
  done
}

# Commande dans le conteneur PostgreSQL. Les connexions locales du conteneur
# (socket Unix) n'exigent pas de mot de passe : aucun secret n'est manipulé ici.
pg_exec() {
  docker exec -i "$BACKUP_PG_CONTAINER" "$@"
}

# Nom d'un dossier de sauvegarde : 20261008T023000Z (UTC, triable).
RUN_DIR_GLOB='20??????T??????Z'
