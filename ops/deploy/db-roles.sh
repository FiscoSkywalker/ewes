#!/usr/bin/env bash
# Rôle PostgreSQL d'EXÉCUTION distinct du rôle des migrations (blueprint/10_Security.md,
# constat 8). `ewes` (propriétaire des tables) ne sert qu'aux migrations et aux
# sauvegardes ; l'API se connecte en `ewes_app`, qui ne peut que lire/écrire les lignes :
# ni DROP/ALTER, donc pas de retrait des déclencheurs qui rendent le journal d'audit
# inaltérable, même en cas d'injection SQL.
#
# Idempotent : relancé à chaque déploiement, après les migrations (les tables nouvelles
# sont couvertes en plus par les droits par défaut ci-dessous). Lit DB_APP_PASSWORD
# dans .env sans l'exécuter.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

password="$(grep -E '^DB_APP_PASSWORD=' .env | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [ -z "$password" ]; then
  echo "DB_APP_PASSWORD absent de .env." >&2
  exit 1
fi

# Le mot de passe passe par l'environnement du conteneur (\getenv), pas par la ligne de
# commande de psql, où ps le montrerait.
./ops/deploy/compose.sh exec -T -e APP_PASSWORD="$password" postgres \
  psql -v ON_ERROR_STOP=1 -q -U ewes -d ewes <<'SQL'
\getenv app_password APP_PASSWORD

SELECT NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ewes_app') AS missing \gset
\if :missing
  CREATE ROLE ewes_app LOGIN;
\endif
ALTER ROLE ewes_app WITH LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;

GRANT CONNECT ON DATABASE ewes TO ewes_app;
GRANT USAGE ON SCHEMA public TO ewes_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ewes_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ewes_app;
-- L'historique des migrations n'a aucune raison d'être lisible par l'application.
REVOKE ALL ON TABLE public._prisma_migrations FROM ewes_app;

-- Tables et séquences créées par les migrations futures (rôle `ewes`).
ALTER DEFAULT PRIVILEGES FOR ROLE ewes IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ewes_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ewes IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ewes_app;
SQL

echo "Rôle ewes_app à jour."
