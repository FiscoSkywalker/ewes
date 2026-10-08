#!/usr/bin/env bash
# Raccourci Docker Compose de PRODUCTION : fournit le fichier de pile et les deux
# fichiers de variables (.env = secrets, .image.env = images à lancer, écrit par deploy.sh).
#
#   ./ops/deploy/compose.sh ps
#   ./ops/deploy/compose.sh logs -f api
#   ./ops/deploy/compose.sh restart web
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

env_files=(--env-file .env)
if [ -f .image.env ]; then
  env_files+=(--env-file .image.env)
fi

exec docker compose -f docker-compose.prod.yml "${env_files[@]}" "$@"
