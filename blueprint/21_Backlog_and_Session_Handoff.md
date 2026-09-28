# EWES
## Backlog et Relais de Session
### Version 1.0 | Statut : Vivant (mis à jour à chaque session)

---

# 1. Objet

Ce document est le point d'entrée opérationnel de chaque session de travail, quel que soit l'outil (Claude Code, Cursor) ou l'agent. Il complète `19_AI_Coding_Rules.md`. Contrairement aux documents 00-20 (spécifications stables), celui-ci change à chaque session : cocher les tâches faites, ajouter une entrée au journal, signaler les blocages.

# 2. Protocole de reprise (à lire en premier, à chaque session)

1. Lire `00_Project_Blueprint.md` (vision) et `19_AI_Coding_Rules.md` (règles) si ce n'est pas déjà fait dans cette session.
2. Lire la section 6 (Journal de session) de ce document — dernière entrée uniquement suffit en général — pour connaître le dernier état connu et la prochaine étape indiquée.
3. Reprendre les tâches non cochées de la phase en cours (section 4) dans l'ordre, sauf blocage signalé en section 5.
4. Ne jamais recommencer une tâche déjà cochée sans vérifier d'abord l'état réel du code (une tâche cochée est réputée faite).

# 3. Protocole de fin de session (obligatoire, même en cas d'interruption)

1. Committer le travail, y compris incomplet (message de checkpoint explicite si la tâche n'est pas finie).
2. Cocher les tâches terminées ci-dessous.
3. Ajouter une entrée au Journal de session (section 6) : outil, date, ce qui a été fait, décisions prises, blocages, prochaine étape précise et actionnable (pas "continuer le module X" mais "implémenter l'endpoint POST /admin/realisations avec validation DTO X").
4. Mettre à jour un document 00-20 si une décision d'architecture ou de règle métier a été prise pendant la session.

# 4. Backlog par phase (aligné sur `20_Project_Roadmap.md`)

## Phase 01 — Cadrage & design
- [x] Initialiser le dépôt Git, structure du monorepo (`apps/web`, `apps/api`), `.gitignore`, `.env.example` — workspaces npm à la racine
- [x] Initialiser le projet Next.js (App Router, TypeScript, Tailwind, next-intl)
- [x] Initialiser le projet NestJS (TypeScript, Swagger, structure de modules — voir `06_Application_Architecture.md` §3) — 13 modules squelettes + `health`
- [x] Modéliser le schéma Prisma complet à partir de `07_Database_Design.md` (`apps/api/prisma/schema.prisma`, formaté)
- [x] Intégrer Prisma dans NestJS (`PrismaService`/`PrismaModule` globaux, adaptateur `@prisma/adapter-pg` — obligatoire depuis Prisma 7, voir journal ci-dessous) ; `prisma generate` validé
- [x] Connecter Prisma à une base réelle et exécuter la première migration (`prisma migrate dev --name init`) — 22 tables créées, serveur NestJS démarré avec succès contre la vraie base, `GET /api/v1/health` et `/api/docs` répondent
- [x] Docker Compose de développement (postgres a minima) — testé et fonctionnel ; **port hôte déplacé à 5433** (voir décisions du journal : un service PostgreSQL natif Windows occupait déjà le 5432 sur cette machine)
- [x] Définir les tokens de design Tailwind à partir de `05_UI_UX_System.md`
- [x] Configurer next-intl (FR par défaut / EN) et le routing i18n — structure `app/[locale]/(public)` posée ; `app/(admin)` volontairement laissé à la Phase 04
- [x] Mettre en place lint/format/typecheck strict sur `apps/web` et `apps/api` — ESLint+Prettier (web), oxlint+Prettier (api), Prettier consolidé à la racine, `build` sert de typecheck strict sur les deux apps
- [ ] Valider les contenus et visuels fournis par EWES *(dépend du client — voir section 5)*

## Phase 02 — Développement du site public
- [x] Layout public (header, footer, sélecteur de langue) — fait en Phase 01 en même temps que la structure i18n ; contenu de navigation encore statique (pas de module `pages`/`services` derrière)
- [ ] Module NestJS `pages` (contenu Accueil/À propos/Contact) + endpoints publics
- [ ] Page Accueil (SSG/ISR)
- [ ] Page À propos (SSG/ISR)
- [ ] Module NestJS `services` + page Nos services
- [ ] Composants partagés du design system (bouton, carte, chip de statut, état vide/erreur/chargement)
- [ ] Formulaire de Contact (composant client isolé) + module NestJS `contact` + déclenchement notification
- [ ] Tests d'intégration API de base (contact, lecture pages/services)

## Phase 03 — Réalisations & archivage
- [ ] Module NestJS `realisations` (CRUD, statuts DRAFT/PUBLISHED/ARCHIVED, classement)
- [ ] Page liste Nos réalisations (ISR + filtre client isolé)
- [ ] Page fiche réalisation (SSG/ISR)
- [ ] Module NestJS `actualites` + pages liste/détail
- [ ] Module NestJS `documents-publics` + section publique de la page Documents
- [x] Modèle Prisma Folder / PrivateDocument / FolderAccessGrant / DocumentAccessGrant + migration — fait dès la Phase 01 (schéma complet modélisé d'un bloc) ; reste à implémenter la logique CRUD/droits ci-dessous
- [ ] Module NestJS `documents-prives` (CRUD dossiers/fichiers, vérification de droit, upload/download sécurisé — voir `11_Document_Management_System.md`)
- [ ] Recherche documentaire full-text PostgreSQL scoping par droit
- [ ] Tests : accès document sans droit → 403 ; contenu DRAFT/ARCHIVED inaccessible publiquement

## Phase 04 — Administration & sécurité
- [ ] Authentification (JWT access/refresh, Argon2id, rotation, révocation)
- [ ] RBAC (guards NestJS, rôles ADMINISTRATEUR/GESTIONNAIRE/UTILISATEUR)
- [ ] Middleware Next.js de protection des routes du portail admin
- [ ] Layout portail admin (navigation, TanStack Query)
- [ ] Écrans admin : éditorial, documentaire, contacts, tableau de bord
- [ ] Gestion des utilisateurs / rôles / droits documentaires (Administrateur)
- [ ] Journal d'audit (modèle + écriture sur actions sensibles + écran de consultation)
- [ ] Sauvegardes automatiques (script + cron VPS)
- [ ] Revue de sécurité : séparation public/privé à deux niveaux (`10_Security.md` §5)

## Phase 05 — Tests & mise en production
- [ ] Exécuter les cas de régression obligatoires (`17_Testing_Strategy.md` §3)
- [ ] Recette avec EWES (Article 9) *(dépend du client)*
- [ ] Corrections issues de la recette
- [ ] Provisionner le VPS de production, Docker Compose prod + Nginx + HTTPS
- [ ] Configurer le fournisseur SMTP définitif *(dépend du client — voir section 5)*
- [ ] Migration Prisma de production + sauvegarde préalable
- [ ] Déploiement + vérification du health check
- [ ] Rédiger la documentation d'administration
- [ ] Formation courte de l'équipe EWES
- [ ] Remise des accès (Article 13)

# 5. Décisions ouvertes / dépendances côté EWES

| Sujet | Statut | Bloque |
|---|---|---|
| Fournisseur d'hébergement définitif | À confirmer | Phase 05 (topologie prod) |
| Fournisseur SMTP (e-mail transactionnel) | À confirmer | Phase 04 (notifications), Phase 05 |
| Nom de domaine (disponibilité supposée) | À confirmer | Phase 05 (HTTPS/DNS) |
| Désignation des Gestionnaires et Utilisateurs initiaux (droits documentaires) | À confirmer | Phase 04 |
| Contenus (textes, visuels, documents) validés | En attente | Phase 01/02/03 |

Toute tâche bloquée par une dépendance client reste visible dans son backlog de phase (section 4) mais ne doit pas empêcher l'agent de travailler sur les tâches non bloquées suivantes.

# 6. Journal de session

Ajouter une nouvelle entrée en haut de cette section à chaque fin de session. Ne jamais supprimer les entrées précédentes (historique utile pour comprendre les décisions passées).

```
### Session — <date> — <outil : Claude Code | Cursor>
Fait : <tâches cochées / travail réalisé>
Décisions : <choix techniques ou métier tranchés, et pourquoi>
Blocages : <dépendance non résolue, question ouverte pour EWES ou Planning Events>
Prochaine étape : <action concrète et immédiatement actionnable pour la prochaine session>
```

### Session — 2026-09-28 (3) — Claude Code
Fait : Docker Desktop confirmé opérationnel par l'utilisateur. Démarré le conteneur Postgres dev (`npm run db:up`), exécuté et validé la première migration Prisma (`prisma migrate dev --name init` → 22 tables créées conformes au schéma). Démarré le serveur NestJS complet en conditions réelles : tous les modules s'initialisent, `PrismaModule` se connecte effectivement à la base, `GET /api/v1/health` répond `{"status":"ok"}` et `/api/docs` (Swagger) répond 200. Phase 01 du backlog désormais complète à l'exception de la validation des contenus (dépend du client).
Décisions : **le port hôte Postgres du `docker-compose.yml` est 5433, pas 5432** — un service PostgreSQL natif Windows (`postgres.exe`, préexistant sur cette machine, sans rapport avec ce projet) occupait déjà le 5432, ce qui causait un routage aléatoire des connexions vers la mauvaise base (`P1010: User was denied access`). `.env.example`, `.env` (racine, gitignored) et `apps/api/.env` sont alignés sur 5433 — ne pas revenir à 5432 sans vérifier d'abord qu'aucun service natif ne l'occupe (`netstat -ano | findstr :5432` sous Windows).
Blocages : aucun technique. Reste en attente côté client : hébergement définitif, fournisseur SMTP, nom de domaine, désignation des premiers Gestionnaires/Utilisateurs, contenus/visuels (voir section 5).
Prochaine étape : démarrer la Phase 02 — lire `02_Functional_Requirements.md` §2.1-2.2 et `07_Database_Design.md` (entités `Page`/`Service`) avant de coder, puis implémenter le module NestJS `pages` (CRUD minimal + endpoint public de lecture par slug) et la page Accueil connectée (remplacer le contenu statique de `HomePage` par un appel serveur au module `pages`). Aucun commit git n'a encore été fait sur ce projet à ce stade — proposer à l'utilisateur de committer ce premier scaffold fonctionnel avant d'aller plus loin.

### Session — 2026-09-28 (2) — Claude Code
Fait : scaffold complet de la Phase 01. `apps/web` : Next.js App Router + TypeScript + Tailwind v4, i18n `next-intl` (FR défaut/EN) avec routing `[locale]/(public)`, layout public (header/nav/footer/sélecteur de langue), page d'Accueil placeholder, tokens de design (couleurs/rayons) en `@theme` CSS. `apps/api` : NestJS avec Swagger (`/api/docs`), `ValidationPipe` global, préfixe `/api/v1`, CORS, 13 modules squelettes (`auth`, `users`, `pages`, `services`, `realisations`, `actualites`, `documents-publics`, `documents-prives`, `contact`, `notifications`, `media`, `audit`, `admin`) + module `health`. Schéma Prisma complet écrit et formaté. `PrismaService`/`PrismaModule` globaux créés avec l'adaptateur `@prisma/adapter-pg`. Build, lint (ESLint web / oxlint api) et tests (vitest unit + e2e) verts sur les deux apps. `docker-compose.yml`, `.env.example`, `package.json` racine (workspaces) et Prettier consolidé à la racine.
Décisions : **Prisma 7 casse la déclaration `url` dans `datasource` du schema.prisma** — la connexion se déclare désormais dans `apps/api/prisma.config.ts` (`defineConfig` + `env()`) et `PrismaClient` exige un adaptateur de pilote explicite (`@prisma/adapter-pg` + `pg`), câblé dans `PrismaService` à partir de `DATABASE_URL` (voir `apps/api/src/prisma/prisma.service.ts`) — toute future doc/code doit suivre ce pattern, pas l'ancien `datasource { url = env(...) }`. Épinglé `prisma`/`@prisma/client` en version exacte `7.10.0` (pas de caret) car le tag npm `latest` de `prisma` pointait vers une release candidate `8.0.0-rc` non alignée avec `@prisma/client` stable — à revérifier avant toute montée de version. `app/(admin)` volontairement pas créé en Phase 01 (scope strict, c'est une tâche de Phase 04). Module NestJS `admin` réservé au tableau de bord transverse et à la gouvernance (rôles/droits), pas aux CRUD de contenu qui vivent chacun dans leur module domaine avec un contrôleur `/admin/...` dédié.
Blocages : **réseau très instable sur cette machine** — plusieurs `npm install` ont échoué en `ECONNRESET` en cours de route, un retry a suffi à chaque fois mais a pris du temps (jusqu'à 17 min pour une résolution complète sans lockfile). **Collision npm workspaces** : deux `npm install` lancés en tâche de fond en parallèle se sont marché dessus (hoisting vers la racine dès qu'un `package.json` racine avec `workspaces` existe) et ont corrompu `node_modules` (`ENOTEMPTY`) — leçon pour la suite : ne jamais lancer deux `npm install` concurrents dans ce repo, même dans des dossiers différents, une fois les workspaces actifs. Des `package-lock.json` orphelins dans `apps/web` et `apps/api` (créés avant la mise en place des workspaces) ont aussi dû être supprimés. **Docker Desktop** vient d'être installé par l'utilisateur mais n'est pas encore détectable (`docker --version` échoue toujours, aucun dossier dans `Program Files`) — probablement encore en cours d'installation ou nécessite un redémarrage ; à revérifier en priorité à la prochaine session.
Prochaine étape : vérifier que `docker --version` répond, puis `npm run db:up` (racine) pour démarrer Postgres, puis dans `apps/api` : `npx prisma migrate dev --name init` pour la première migration. Une fois la base connectée, terminer la Phase 01 en cochant la dernière tâche technique, puis démarrer la Phase 02 (module `pages` NestJS + page À propos) en lisant `02_Functional_Requirements.md` et `07_Database_Design.md` au préalable. Ne pas oublier de committer (aucun commit git n'a encore été fait cette session malgré le travail réalisé — l'utilisateur n'a pas demandé de commit).

### Session — 2026-09-28 — Claude Code
Fait : création complète du système AIOS (`blueprint/00` à `21`), du `CLAUDE.md` racine et des règles Cursor, à partir du contrat et de l'Annexe 1 (`raw/`). Aucun code applicatif écrit — cette session était dédiée au cadrage documentaire préalable, conformément à la demande.
Décisions : stack figée sur Next.js App Router + NestJS + PostgreSQL/Prisma ; pas de file de messages (Redis/queue) ni de store global en V1, choix justifié par le budget d'hébergement (120 USD/an) et le volume attendu — voir `06_Application_Architecture.md` §5 et `16_Rendering_State_Strategy.md` §5 ; stockage de fichiers sur disque du VPS plutôt qu'un service cloud payant ; documents du blueprint rédigés en français (public cible EWES/Planning Events).
Blocages : aucun pour la documentation. Pour le code, voir section 5 (hébergement, SMTP, domaine, contenus à confirmer par EWES).
Prochaine étape : démarrer la Phase 01 du backlog (section 4) — initialisation du dépôt et des projets Next.js/NestJS — en lisant `00_Project_Blueprint.md`, `06_Application_Architecture.md` et `07_Database_Design.md` avant de coder.

# 7. Références

`19_AI_Coding_Rules.md`, `20_Project_Roadmap.md`, `00_Project_Blueprint.md`.
