#!/usr/bin/env bash
# Déploiement sur le VPS (lancé par GitHub Actions, ou à la main pour un retour arrière).
#
#   ./ops/deploy/deploy.sh <étiquette-d-image>     # p. ex. sha-1a2b3c4
#   ./ops/deploy/deploy.sh --rollback              # revient à l'étiquette précédente
#
# Séquence (blueprint/18_Deployment.md §3) : téléchargement des images -> sauvegarde de
# la base -> migrations -> droits du rôle d'exécution -> remplacement des conteneurs ->
# contrôle de santé -> invalidation du cache du site. Un échec AVANT le remplacement des
# conteneurs laisse la version en cours intacte.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

COMPOSE=./ops/deploy/compose.sh
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERREUR : %s\n' "$*" >&2; exit 1; }

env_value() { # valeur d'une variable d'un fichier .env, sans l'exécuter
  grep -E "^$1=" "$2" 2>/dev/null | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

[ -f .env ] || die "Fichier .env introuvable dans $(pwd) (voir ops/deploy/README.md)."
DOMAIN="$(env_value DOMAIN .env)"
[ -n "$DOMAIN" ] || die "DOMAIN est absent de .env."
[ -f "/srv/ewes/certbot/conf/live/$DOMAIN/fullchain.pem" ] \
  || die "Pas de certificat pour $DOMAIN : lancer d'abord ops/deploy/init-tls.sh."

previous_tag="$(env_value IMAGE_TAG .image.env)"
previous_repo="$(env_value IMAGE_REPO .image.env)"

if [ "${1:-}" = "--rollback" ]; then
  [ -f .image.env.prev ] || die "Pas de version précédente enregistrée (.image.env.prev)."
  new_tag="$(env_value IMAGE_TAG .image.env.prev)"
  new_repo="$(env_value IMAGE_REPO .image.env.prev)"
else
  new_tag="${1:?Usage : deploy.sh <étiquette-d-image> | --rollback}"
  new_repo="${IMAGE_REPO:-$previous_repo}"
fi
[ -n "$new_repo" ] || die "IMAGE_REPO inconnu (variable d'environnement IMAGE_REPO, ex. ghcr.io/fiscoskywalker/ewes)."
[ -n "$new_tag" ] || die "Étiquette d'image vide."

restore_image_env() {
  if [ -f .image.env.prev ] && [ "${keep_new_env:-0}" != "1" ]; then
    cp .image.env.prev .image.env
  fi
}

log "Version cible : $new_repo:$new_tag (actuelle : ${previous_tag:-aucune})"
if [ -f .image.env ]; then cp .image.env .image.env.prev; fi
printf 'IMAGE_REPO=%s\nIMAGE_TAG=%s\n' "$new_repo" "$new_tag" > .image.env

$COMPOSE config -q || { restore_image_env; die "Configuration Compose invalide (variable manquante dans .env ?)."; }

log "Téléchargement des images"
$COMPOSE --profile tools pull api web tools || { restore_image_env; die "Téléchargement des images impossible."; }

log "Démarrage de PostgreSQL"
$COMPOSE up -d --wait postgres

# Sauvegarde avant migration. Copie locale, dossier privé de l'utilisateur de déploiement,
# les trois dernières seulement : la sauvegarde chiffrée quotidienne (ops/backup) reste
# la référence.
if $COMPOSE exec -T postgres psql -U ewes -d ewes -tAc "SELECT to_regclass('public._prisma_migrations')" | grep -q '_prisma_migrations'; then
  log "Sauvegarde de la base avant migration"
  install -d -m 700 /srv/ewes/pre-deploy
  dump="/srv/ewes/pre-deploy/ewes-$(date -u +%Y%m%dT%H%M%SZ)-avant-${new_tag}.dump"
  ( umask 077; $COMPOSE exec -T postgres pg_dump -U ewes -d ewes -Fc > "$dump" ) \
    || { rm -f "$dump"; restore_image_env; die "Sauvegarde avant migration impossible : déploiement annulé."; }
  ls -1t /srv/ewes/pre-deploy/*.dump 2>/dev/null | tail -n +4 | xargs -r rm -f --
else
  log "Base vide : pas de sauvegarde préalable"
fi

log "Migrations Prisma"
$COMPOSE run --rm tools || { restore_image_env; die "Migration en échec : les conteneurs en cours n'ont pas été touchés."; }

log "Droits du rôle d'exécution"
./ops/deploy/db-roles.sh

log "Remplacement des conteneurs"
if ! $COMPOSE up -d --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS" api web nginx certbot; then
  $COMPOSE ps || true
  $COMPOSE logs --tail 60 api web || true
  if [ -n "$previous_tag" ] && [ "$previous_tag" != "$new_tag" ]; then
    log "Retour automatique à $previous_tag (les migrations déjà appliquées restent en base)"
    cp .image.env.prev .image.env
    $COMPOSE up -d --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS" api web nginx certbot || true
  fi
  die "La version $new_tag ne devient pas saine."
fi

# Le site est construit sans accès à l'API (CI) : ses pages sont pré-rendues avec les textes
# de repli. On invalide donc tout le cache du site : chaque page relit l'API à sa première visite.
log "Invalidation du cache du site"
$COMPOSE exec -T api node -e '
fetch(process.env.WEB_REVALIDATE_URL, {
  method: "POST",
  headers: { "content-type": "application/json", "x-revalidate-secret": process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ all: true }),
}).then((res) => { console.log("HTTP", res.status); process.exit(res.ok ? 0 : 1); })
  .catch((error) => { console.error(String(error)); process.exit(1); });
' || echo "Avertissement : invalidation du cache impossible ; les pages afficheront les textes d'origine (24 h au plus). Relancer le déploiement."

# Une page invalidée est régénérée en arrière-plan à sa première visite : on la visite
# nous-mêmes, pour que le premier vrai visiteur ne reçoive pas les textes de repli.
log "Préchauffage des pages"
$COMPOSE exec -T web node -e '
const pages = ["", "/services", "/a-propos", "/realisations", "/actualites", "/documents", "/contact"];
(async () => {
  for (const locale of ["fr", "en"]) {
    for (const page of pages) {
      await fetch(`http://127.0.0.1:3000/${locale}${page}`).then((res) => res.arrayBuffer()).catch(() => undefined);
    }
  }
})();
' || true

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $new_repo:$new_tag" >> .deploy-history

# Anciennes images : on garde 30 jours pour pouvoir revenir en arrière.
docker image prune -af --filter "until=720h" > /dev/null || true

log "Déploiement terminé : $new_tag"
