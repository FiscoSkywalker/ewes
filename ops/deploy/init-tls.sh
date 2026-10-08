#!/usr/bin/env bash
# Première obtention du certificat HTTPS (Let's Encrypt), à faire UNE fois, avant le premier
# déploiement. Prérequis : le DNS du domaine (enregistrement A, et AAAA si IPv6) pointe déjà
# vers ce VPS, et les ports 80/443 sont ouverts.
#
#   ./ops/deploy/init-tls.sh <adresse-email-pour-les-alertes-d-expiration>
#
# Principe : Nginx ne démarre pas sans certificat, et Let's Encrypt a besoin de Nginx pour
# valider le domaine. On crée donc un certificat provisoire auto-signé, on démarre Nginx
# seul, on obtient le vrai certificat par le défi « fichier », puis on recharge Nginx.
# Le renouvellement est ensuite automatique (service `certbot` du Compose).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

EMAIL="${1:?Usage : init-tls.sh <adresse-email>}"
COMPOSE=./ops/deploy/compose.sh

# Compose interpole tout le fichier, y compris les images de api/web, qu'on ne démarre pas
# ici : des valeurs factices évitent l'erreur « variable manquante » avant le 1er déploiement.
export IMAGE_REPO="${IMAGE_REPO:-init}" IMAGE_TAG="${IMAGE_TAG:-init}"

DOMAIN="$(grep -E '^DOMAIN=' .env | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
[ -n "$DOMAIN" ] || { echo "DOMAIN est absent de .env." >&2; exit 1; }

CONF=/srv/ewes/certbot/conf
WWW=/srv/ewes/certbot/www
LIVE="$CONF/live/$DOMAIN"

if [ -f "$LIVE/fullchain.pem" ] && ! openssl x509 -in "$LIVE/fullchain.pem" -noout -issuer | grep -qi "CN *= *$DOMAIN"; then
  echo "Un certificat existe déjà pour $DOMAIN : rien à faire."
  exit 0
fi

mkdir -p "$LIVE" "$WWW"

echo "==> Certificat provisoire"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$LIVE/privkey.pem" -out "$LIVE/fullchain.pem" \
  -subj "/CN=$DOMAIN" 2>/dev/null

echo "==> Démarrage de Nginx"
# Nginx seul : web et api n'existent pas encore (il les résout à la demande).
$COMPOSE up -d --no-deps nginx
sleep 3

echo "==> Demande du vrai certificat à Let's Encrypt"
rm -rf "$LIVE" "$CONF/archive/$DOMAIN" "$CONF/renewal/$DOMAIN.conf"
$COMPOSE run --rm --no-deps --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo "==> Rechargement de Nginx"
$COMPOSE exec -T nginx nginx -s reload

echo "Certificat obtenu pour $DOMAIN. Prochaine étape : le premier déploiement."
