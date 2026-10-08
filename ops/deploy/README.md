# Déploiement EWES — Docker, GitHub Actions, VPS

Guide pas à pas pour la mise en production et pour les mises à jour. Décisions d'architecture : `blueprint/18_Deployment.md`.

## Ce que ça donne

```
git push (branche main)
   └─► GitHub Actions (gratuit : dépôt public)
         1. CI : format, lint, types, build, tests unitaires + e2e sur une vraie base
         2. construit 3 images Docker (api, migrations, site) → GHCR (registre GitHub, gratuit)
         3. se connecte au VPS en SSH et lance ops/deploy/deploy.sh
               pull des images → sauvegarde de la base → migrations → remplacement des conteneurs
               → contrôle de santé → invalidation du cache du site
         4. vérifie que https://votre-domaine répond
```

Sur le VPS, cinq conteneurs : `nginx` (seul à ouvrir les ports 80/443), `web` (Next.js), `api` (NestJS), `postgres`, `certbot` (renouvellement du certificat). Fichiers de données sur le disque du VPS : `/srv/ewes/storage/{private,public}` (documents), `/srv/ewes/certbot` (certificats).

**Coût : 0 en dehors du VPS et du nom de domaine** (budget d'hébergement du contrat : 120 USD/an). GitHub Actions est gratuit et illimité pour un dépôt public (2 000 min/mois pour un dépôt privé — largement suffisant, un déploiement dure ~6 min), GHCR et Let's Encrypt sont gratuits.

---

## Étape 1 — Ce qu'il faut avoir

| Élément | Détail |
|---|---|
| VPS | Ubuntu 22.04 ou 24.04, **2 Go de RAM minimum** (1 Go : ajouter 2 Go de swap), 20 Go de disque, IPv4 publique |
| Nom de domaine | Accès à sa zone DNS (chez le registrar ou l'hébergeur) |
| Compte GitHub | Celui qui possède le dépôt `FiscoSkywalker/ewes` |
| Un poste avec `ssh` et `openssl` | Git Bash (Windows), macOS ou Linux |
| Fournisseur SMTP | Pour les e-mails (contact, invitations). **Choix à confirmer par EWES** (`blueprint/21` §5). Facultatif au premier déploiement : sans SMTP, le site fonctionne mais n'envoie aucun e-mail |

## Étape 2 — DNS

Chez le registrar : un enregistrement **A** `votre-domaine → IP du VPS` (et **AAAA** si le VPS a une IPv6). Vérifier avant de continuer (la propagation peut prendre de quelques minutes à quelques heures) :

```bash
nslookup votre-domaine        # doit afficher l'IP du VPS
```

Let's Encrypt (étape 7) échoue tant que ce n'est pas le cas.

## Étape 3 — Installer Docker sur le VPS

Connexion initiale en `root` (les identifiants viennent du fournisseur du VPS), puis :

```bash
ssh root@IP_DU_VPS
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh        # installe Docker et le plugin Compose
docker compose version                         # doit répondre (v2.x)
apt install -y ufw unattended-upgrades         # pare-feu, mises à jour de sécurité automatiques
```

Si le VPS n'a que 1 Go de RAM : `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab`.

## Étape 4 — Clé SSH de déploiement (sur VOTRE poste, pas sur le VPS)

C'est la clé que GitHub Actions utilisera pour se connecter. Elle ne sert qu'à ça.

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-ewes" -f ./ewes-deploy
#   ewes-deploy      → clé PRIVÉE  (deviendra le secret GitHub VPS_SSH_KEY)
#   ewes-deploy.pub  → clé PUBLIQUE (à installer sur le VPS, étape 5)
```

Empreinte du serveur (pour le secret `VPS_KNOWN_HOSTS`, qui évite qu'on se fasse passer pour votre VPS) :

```bash
ssh-keyscan -t ed25519 IP_DU_VPS
# ligne du type :  203.0.113.10 ssh-ed25519 AAAAC3Nza...
```

Gardez cette ligne complète. Supprimez `ewes-deploy` de votre disque une fois le secret créé dans GitHub (étape 8).

## Étape 5 — Préparer le VPS (une fois)

Depuis votre poste, copier le script puis l'exécuter :

```bash
scp ops/deploy/setup-vps.sh root@IP_DU_VPS:/root/
ssh root@IP_DU_VPS "bash /root/setup-vps.sh \"$(cat ewes-deploy.pub)\""
```

Il crée l'utilisateur `deploy` (clé ci-dessus), les dossiers `/opt/ewes` et `/srv/ewes/...` avec les bons propriétaires, et active le pare-feu (SSH, 80, 443). Test : `ssh -i ewes-deploy deploy@IP_DU_VPS docker ps` doit répondre sans mot de passe.

> L'utilisateur `deploy` est dans le groupe `docker`, ce qui équivaut à un accès administrateur à la machine : protégez la clé comme un mot de passe. Une fois tout testé, désactivez la connexion SSH par mot de passe (`PasswordAuthentication no` dans `/etc/ssh/sshd_config.d/`, puis `systemctl reload ssh`) — `blueprint/18` §5 : « SSH par clé, pas de mot de passe ».

## Étape 6 — Les clés et mots de passe (`.env` du VPS)

Aucun de ces secrets ne passe par GitHub : ils vivent uniquement dans `/opt/ewes/.env` sur le VPS (`chmod 600`). Le modèle est `.env.production.example`.

**Où obtenir chaque valeur :**

| Variable | Comment l'obtenir |
|---|---|
| `DOMAIN` | Votre domaine, sans `https://` (ex. `ewes-rdc.com`) |
| `POSTGRES_PASSWORD` | Généré : `openssl rand -hex 24` |
| `DB_APP_PASSWORD` | Généré : `openssl rand -hex 24` (différent du précédent) |
| `JWT_ACCESS_SECRET` | Généré : `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Généré : `openssl rand -hex 32` (différent) |
| `REVALIDATE_SECRET` | Généré : `openssl rand -hex 32` |
| `SEED_ADMIN_EMAIL` | L'adresse du premier Administrateur (désignée par EWES) |
| `SEED_ADMIN_PASSWORD` | Un mot de passe de votre choix, **12 caractères minimum**, sans « change-me » ni « example » — à changer dans le portail après la première connexion |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Fournis par le fournisseur d'e-mail (voir ci-dessous) |
| `SMTP_FROM` | Expéditeur affiché, ex. `"EWES <no-reply@votre-domaine>"` |
| `CONTACT_NOTIFICATION_EMAIL` | Boîte qui reçoit les messages du formulaire de contact |

Les valeurs « générées » le sont **sur le VPS**, en une commande qui crée le fichier :

```bash
ssh deploy@IP_DU_VPS
cd /opt/ewes
umask 077
cat > .env <<EOF
DOMAIN=votre-domaine
POSTGRES_PASSWORD=$(openssl rand -hex 24)
DB_APP_PASSWORD=$(openssl rand -hex 24)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
REVALIDATE_SECRET=$(openssl rand -hex 32)
SEED_ADMIN_EMAIL=admin@votre-domaine
SEED_ADMIN_PASSWORD=A-CHANGER-mot-de-passe-long
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="EWES <no-reply@votre-domaine>"
CONTACT_NOTIFICATION_EMAIL=
EOF
nano .env       # remplacer DOMAIN, SEED_ADMIN_*, et les SMTP_* quand ils sont connus
```

**Sauvegardez ce fichier** (gestionnaire de mots de passe de Planning Events + coffre d'EWES) : sans lui, les mots de passe de la base ne peuvent pas être retrouvés. Il n'est écrit nulle part ailleurs.

**Fournisseur SMTP — les options gratuites ou déjà payées :**

- La **messagerie du nom de domaine** si l'hébergement/registrar en inclut une (le plus simple et le plus crédible : `no-reply@votre-domaine`). Les paramètres SMTP sont dans l'interface du fournisseur (hôte, port 587, identifiant, mot de passe).
- Un service d'envoi à offre gratuite (ex. Brevo, ~300 e-mails/jour gratuits) : créer un compte, valider le domaine d'envoi (enregistrements DNS SPF/DKIM indiqués par le service, sinon les e-mails finissent en spam), puis relever hôte / port / identifiant / clé SMTP dans les paramètres SMTP du compte.
- Éviter une boîte Gmail personnelle (limites, mot de passe d'application, image peu institutionnelle).

Les e-mails d'invitation et de réinitialisation passent par là : le choix appartient à EWES, il reste ouvert dans le backlog. On peut déployer sans, et renseigner `SMTP_*` plus tard (modifier `.env`, puis `./ops/deploy/compose.sh up -d api`).

## Étape 7 — Premier certificat HTTPS (une fois)

Les fichiers de déploiement arrivent d'habitude via GitHub Actions ; pour ce tout premier certificat, il faut les mettre une première fois sur le VPS (le dépôt est public) :

```bash
ssh deploy@IP_DU_VPS
git clone --depth 1 https://github.com/FiscoSkywalker/ewes.git /tmp/ewes-src
mkdir -p /opt/ewes/ops && cp /tmp/ewes-src/docker-compose.prod.yml /opt/ewes/ && cp -r /tmp/ewes-src/ops/deploy /opt/ewes/ops/ && rm -rf /tmp/ewes-src
cd /opt/ewes && chmod +x ops/deploy/*.sh
./ops/deploy/init-tls.sh vous@votre-domaine      # e-mail pour les alertes d'expiration
```

Réussite : « Certificat obtenu pour … ». Ensuite le renouvellement est automatique (service `certbot`, toutes les 12 h, rechargement de Nginx toutes les 6 h). Le DNS doit déjà pointer vers le VPS (étape 2), et les ports 80/443 être ouverts chez le fournisseur du VPS s'il a un pare-feu à lui.

## Étape 8 — Configurer GitHub (une fois)

Dépôt → **Settings → Secrets and variables → Actions**.

**Onglet « Variables » → New repository variable :**

| Nom | Valeur |
|---|---|
| `SITE_URL` | `https://votre-domaine` (sans barre finale). Figée dans le site à sa construction (sitemap, adresses canoniques, formulaire de contact) |

**Onglet « Secrets » → New repository secret :**

| Nom | Valeur |
|---|---|
| `VPS_HOST` | L'IP du VPS (ou son nom DNS) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Le contenu **complet** du fichier `ewes-deploy` (clé privée, lignes `-----BEGIN…` à `-----END…` incluses) |
| `VPS_KNOWN_HOSTS` | La ligne obtenue avec `ssh-keyscan` à l'étape 4 |

## Étape 9 — Premier déploiement

Soit un `git push` sur `main`, soit **Actions → Deploy → Run workflow** (laisser le champ « image_tag » vide). Suivre l'exécution dans l'onglet Actions. Durée : ~10 à 15 min la première fois (construction sans cache), ~5 à 6 min ensuite.

Au premier passage, `deploy.sh` démarre PostgreSQL, applique les migrations (base vide), crée le rôle d'exécution `ewes_app`, lance les conteneurs.

**Créer le compte Administrateur** (une seule fois, sur le VPS) :

```bash
ssh deploy@IP_DU_VPS
cd /opt/ewes
./ops/deploy/compose.sh run --rm tools npx tsx prisma/seed.ts
```

Se connecter sur `https://votre-domaine/admin` avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, **changer le mot de passe** dans « Mon profil », puis retirer `SEED_ADMIN_PASSWORD` de `.env`.

Vérifications : le site s'affiche en HTTPS (FR et EN), `http://` redirige, la connexion au portail fonctionne, un envoi du formulaire de contact aboutit (message visible dans le portail), un téléversement d'image réussit.

## Étape 10 — Sauvegardes (avant l'ouverture publique)

Procédure dédiée : `ops/backup/README.md` (clé GPG générée hors du serveur, cron, test de restauration). Les chemins par défaut de `backup.env.example` correspondent à ce déploiement (`ewes-postgres-1`, `/srv/ewes/storage/...`). **À installer par `root`**, à partir d'une copie du dépôt (les scripts de sauvegarde ne sont volontairement pas écrasés par le déploiement : ils sont exécutés par root).

---

## Au quotidien

**Mettre à jour le site** : committer, `git push` sur `main`. C'est tout. (Travailler plutôt sur une branche + pull request : la CI s'exécute sur la PR, le déploiement n'a lieu qu'à la fusion dans `main`.)

**Retour arrière** : Actions → Deploy → Run workflow → champ `image_tag` = l'étiquette d'une version précédente (`sha-1a2b3c4`, visible dans le titre des exécutions passées ; les images restent 30 jours sur le VPS). Ou, sur le VPS : `./ops/deploy/deploy.sh --rollback`. Un retour arrière ne défait pas les migrations déjà appliquées : si une migration non réversible est en cause, restaurer la sauvegarde faite juste avant (`/srv/ewes/pre-deploy/`, les 3 dernières, format `pg_restore`).

**Commandes utiles sur le VPS** (depuis `/opt/ewes`) :

```bash
./ops/deploy/compose.sh ps                  # état des conteneurs
./ops/deploy/compose.sh logs -f api         # journaux (api, web, nginx, postgres, certbot)
./ops/deploy/compose.sh restart web
cat .deploy-history                         # historique des déploiements
```

**Ajouter une variable** : modifier `.env` sur le VPS, puis `./ops/deploy/compose.sh up -d api web`. Si elle commence par `NEXT_PUBLIC_`, elle est figée à la construction : modifier le workflow/Dockerfile et redéployer.

**Changer de domaine** : changer `DOMAIN` (`.env`) et la variable GitHub `SITE_URL`, refaire l'étape 7, puis redéployer (le site est reconstruit avec la nouvelle adresse).

## Pourquoi c'est organisé ainsi

- **Images construites par GitHub, pas par le VPS** : construire Next.js demande 1,5 à 2 Go de RAM, le petit VPS n'a pas à le faire ; il ne fait que télécharger les couches modifiées.
- **Le site est construit sans l'API** (elle n'existe pas dans la CI) : ses pages sont pré-rendues avec les textes de repli, puis `deploy.sh` invalide leurs caches pour qu'elles lisent l'API dès le déploiement.
- **Deux rôles PostgreSQL** (constat 8 de `blueprint/10_Security.md`) : `ewes` (propriétaire, migrations, sauvegardes) et `ewes_app` (l'API ; lecture/écriture des lignes seulement, donc incapable de retirer les déclencheurs d'inaltérabilité du journal d'audit).
- **L'API n'est pas exposée**, à une exception : `POST /api/v1/contact` (le formulaire public l'appelle depuis le navigateur). `/api/revalidate` est bloqué par Nginx. PostgreSQL et l'API n'ont aucun port publié.
- **Dépôt public** : le code et `raw/` (contrat) y sont lisibles par tous. Les secrets, eux, n'y sont jamais.

## Dépannage

| Symptôme | Piste |
|---|---|
| `init-tls.sh` échoue (« Timeout during connect », « unauthorized ») | DNS pas encore propagé, ou ports 80/443 fermés (pare-feu du fournisseur) |
| Workflow : « La variable de dépôt SITE_URL est absente » | Étape 8, onglet **Variables** (pas Secrets) |
| Workflow : `Permission denied (publickey)` | `VPS_SSH_KEY` incomplète (retours à la ligne, `BEGIN/END` manquants), ou clé publique non installée pour `deploy` |
| Workflow : `Host key verification failed` | `VPS_KNOWN_HOSTS` ne correspond pas au VPS (serveur réinstallé ?) : relancer `ssh-keyscan` |
| Workflow : `denied` en poussant sur ghcr.io | Settings → Actions → General → Workflow permissions : choisir « Read and write permissions » ; vérifier aussi qu'un paquet `ewes-*` n'existe pas déjà sous un autre dépôt |
| `deploy.sh` : « Configuration de production refusée » (API) | Un secret manque, est trop court ou identique à un autre : le message nomme la variable (jamais sa valeur) |
| Pages du site avec les textes d'origine au lieu du contenu du portail | Cache non invalidé : `./ops/deploy/compose.sh restart web`, ou attendre l'expiration (≤ 1 h) |
| 502 de Nginx juste après un déploiement | Quelques secondes le temps que `web` démarre ; persistant : `compose.sh logs web api` |
| Fichiers téléversés en erreur « permission denied » | Propriétaire des dossiers : `chown -R 1000:1000 /srv/ewes/storage` (en root) |
