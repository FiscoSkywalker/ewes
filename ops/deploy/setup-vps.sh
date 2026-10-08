#!/usr/bin/env bash
# Préparation d'un VPS Ubuntu NEUF, à lancer UNE fois en root. Docker doit être installé
# (voir ops/deploy/README.md, étape 3).
#
#   sudo bash setup-vps.sh "<clé publique SSH de déploiement>"
#
# Crée l'utilisateur `deploy` (celui que GitHub Actions utilise), les dossiers de données
# avec les bons propriétaires, et ferme le pare-feu hors SSH/HTTP/HTTPS. Idempotent.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "À lancer en root (sudo)." >&2
  exit 1
fi
PUBLIC_KEY="${1:?Usage : setup-vps.sh \"<clé publique SSH de déploiement>\"}"

command -v docker > /dev/null || { echo "Docker n'est pas installé." >&2; exit 1; }

echo "==> Utilisateur deploy"
if ! id deploy > /dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
fi
# Le groupe docker équivaut à un accès root sur la machine : la clé de déploiement est
# donc à protéger comme un mot de passe administrateur.
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
grep -qxF "$PUBLIC_KEY" /home/deploy/.ssh/authorized_keys || echo "$PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys

echo "==> Dossiers"
# Application (fichiers de Compose, scripts, .env)
install -d -m 750 -o deploy -g deploy /opt/ewes
# Documents : uid 1000 = utilisateur `node` des conteneurs api/web. Sauvegardés par ops/backup.
install -d -m 750 -o 1000 -g 1000 /srv/ewes/storage/private /srv/ewes/storage/public
# Certificats, et copies de la base avant migration
install -d -m 755 /srv/ewes/certbot/conf /srv/ewes/certbot/www
install -d -m 700 -o deploy -g deploy /srv/ewes/pre-deploy

echo "==> Pare-feu (ufw)"
if command -v ufw > /dev/null; then
  ufw allow OpenSSH > /dev/null
  ufw allow 80/tcp > /dev/null
  ufw allow 443/tcp > /dev/null
  ufw --force enable > /dev/null
  ufw status | head -n 8
else
  echo "ufw absent : installer-le (apt install ufw) ou configurer le pare-feu du fournisseur."
fi

echo "Terminé. Tester depuis votre poste : ssh deploy@<ip-du-vps> docker ps"
