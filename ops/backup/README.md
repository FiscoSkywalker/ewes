# Sauvegardes EWES

Sauvegarde quotidienne **chiffrée** de la base PostgreSQL et des fichiers (documents privés avec `avatars/`, médias et documents publics). Décisions : `blueprint/18_Deployment.md` §5.

| Fichier | Rôle |
|---|---|
| `backup.sh` | Sauvegarde complète ; `--check [heures]` pour une supervision |
| `restore.sh` | `verify`, `test` (test de restauration sans toucher à la production), `restore-db`, `restore-files` |
| `common.sh` | Fonctions communes |
| `backup.env.example` | Configuration (aucun secret) → `/etc/ewes/backup.env` |
| `ewes-backup.cron` | Planification → `/etc/cron.d/ewes-backup` |

Chaque exécution produit un dossier daté (`/var/backups/ewes/20261008T023000Z/`) : `db.dump.gpg`, `private-files.tar.gpg`, `public-media.tar.gpg`, `SHA256SUMS`, `MANIFEST`. Le dossier est créé sous un nom provisoire puis renommé : une sauvegarde interrompue n'est jamais prise pour valide. Les vignettes (`thumbs/`) sont exclues, elles se refabriquent seules.

## Clé de chiffrement (une seule fois, hors du serveur)

Le serveur ne détient que la clé **publique** : le vol du VPS ou du dossier de sauvegarde ne donne accès à rien. La clé privée est indispensable pour restaurer — la perdre rend toutes les sauvegardes illisibles.

```bash
# Sur le poste de l'administrateur (pas sur le VPS)
gpg --quick-generate-key "EWES sauvegardes <contact@…>" default default never   # passphrase forte
gpg --armor --export "EWES sauvegardes" > ewes-backup-public.asc
gpg --armor --export-secret-keys "EWES sauvegardes" > ewes-backup-PRIVATE.asc    # à coffrer
```

Ranger `ewes-backup-PRIVATE.asc` et sa passphrase à **au moins deux endroits distincts** (gestionnaire de mots de passe de Planning Events, coffre d'EWES), jamais dans le dépôt ni sur le VPS.

## Installation sur le VPS

```bash
apt install gnupg rsync                      # gpg est déjà présent sur Ubuntu
gpg --import ewes-backup-public.asc          # en root : le trousseau de root sert à cron
install -d -m 700 /etc/ewes
install -m 600 ops/backup/backup.env.example /etc/ewes/backup.env   # puis l'éditer
install -m 644 ops/backup/ewes-backup.cron /etc/cron.d/ewes-backup
chmod +x ops/backup/*.sh
```

Dans `backup.env`, `BACKUP_PRIVATE_DIR` et `BACKUP_PUBLIC_DIR` sont les dossiers **du VPS** montés dans l'API sur `PRIVATE_STORAGE_PATH` et `PUBLIC_MEDIA_PATH` : le Compose de production doit donc les monter en *bind mounts* (et non en volumes nommés). Première exécution à la main, puis vérification :

```bash
sudo ops/backup/backup.sh
ls -l /var/backups/ewes/                     # un dossier daté, status = OK
```

Rotation du journal (`/etc/logrotate.d/ewes-backup`) : `/var/log/ewes-backup.log { weekly rotate 8 compress missingok notifempty }`.

## Copie hors serveur

Une sauvegarde qui reste sur le disque du VPS ne protège pas de la perte du VPS. Renseigner `BACKUP_RSYNC_TARGET` (hôte SSH appartenant à EWES ou Planning Events, clé SSH de root autorisée) : chaque dossier daté y est copié, **sans suppression** côté distant (un VPS vidé n'efface pas la copie). La purge des anciennes copies se fait sur la destination.

## Supervision

Un échec écrit `FAIL …` dans `/var/backups/ewes/status`, une ligne dans `/var/log/ewes-backup.log` et dans syslog (`journalctl -t ewes-backup`). Pour être prévenu : `backup.sh --check` (code 1 si aucune réussite depuis 36 h) à brancher sur la supervision HTTP/cron existante.

## Test de restauration (avant la mise en production, puis chaque trimestre)

Sur une machine qui possède la clé privée **et** un conteneur PostgreSQL de même version majeure (idéalement une copie du dossier daté sur un poste de test, pas la production) :

```bash
restore.sh test /chemin/20261008T023000Z
```

Contrôle les empreintes, restaure la base dans une base temporaire, compte les lignes des tables clés (dont `audit_logs_archive`), extrait les deux archives de fichiers, puis supprime tout. Noter la date et le résultat dans le journal de session.

## Restauration réelle (panne ou erreur grave)

1. Arrêter l'API et le site (`docker compose stop api web`) ; garder PostgreSQL démarré.
2. Importer temporairement la clé privée (`gpg --import`), à retirer ensuite (`gpg --delete-secret-keys`).
3. Base : `restore.sh restore-db <sauvegarde> ewes --replace` (sans `--replace` le script refuse d'écraser une base existante).
4. Fichiers : `restore.sh restore-files <sauvegarde> private /srv/ewes/storage/private` et idem `public` — le dossier cible doit être vide ou absent ; vérifier propriétaire et droits attendus par le conteneur de l'API.
5. Redémarrer, contrôler le health check, la connexion au portail, l'ouverture d'un document privé et d'un média public.

La restauration ramène l'état de la sauvegarde : tout ce qui a été saisi ensuite est perdu, y compris les messages de contact supprimés par la rétention (24 mois) et réapparus dans une ancienne sauvegarde.
