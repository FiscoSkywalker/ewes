# EWES
## Architecture Applicative
### Version 1.0 | Statut : Draft

---

# 1. Contexte système

Une application Next.js (TypeScript, App Router) sert à la fois le site public et le portail d'administration/espace documentaire, en consommant une API NestJS (REST) qui coordonne PostgreSQL/Prisma, le stockage de fichiers sur disque et l'envoi d'e-mails transactionnels. Un unique VPS héberge l'ensemble via Docker Compose + Nginx.

# 2. Principe directeur de rendu (non négociable — voir aussi `16_Rendering_State_Strategy.md`)

- **Site public** (Accueil, À propos, Nos services, Nos réalisations, Actualités & publications, Documents publics, Contact) : rendu serveur privilégié (SSR/SSG/ISR selon la fraîcheur des données), composants client minimisés. Objectif : SEO optimal et affichage rapide avant même le chargement du JS.
- **Portail d'administration et espace documentaire privé** : ces zones sont derrière authentification, sans besoin de SEO. Elles sont traitées comme une application client-side (dashboard interactif), sans forcer de SSR qui alourdirait le temps de réponse serveur sans bénéfice.
- Éviter la sur-hydratation : ne jamais transformer une page entière en "client component" pour isoler un seul élément interactif (formulaire, filtre, upload) — isoler cet élément dans un sous-composant client ciblé.
- Mettre en cache/ISR les pages publiques à contenu stable (À propos, Nos services) ; revalider plus fréquemment les pages à contenu dynamique (Actualités, Réalisations).

# 3. Frontières backend (modules NestJS)

`auth`, `users` (rôles Administrateur/Gestionnaire/Utilisateur), `pages` (contenu institutionnel), `services` (pôles Environnement/Eau/Travaux), `realisations` (portfolio), `actualites` (articles/événements/formations/communiqués), `documents-publics`, `documents-prives` (dossiers, fichiers, permissions), `contact`, `notifications`, `media`, `audit`, `admin`.

Chaque module possède ses contrôleurs (traduction HTTP uniquement), ses DTO validés, ses services applicatifs (règles métier) et ses adaptateurs de persistance (Prisma derrière des repositories/services). Les changements inter-modules passent par des événements applicatifs explicites, jamais par une écriture directe dans les tables d'un autre module.

# 4. Frontières frontend (Next.js)

`app/(public)/...` : routes publiques, Server Components par défaut, données récupérées côté serveur.
`app/(admin)/...` : routes protégées, largement Client Components avec récupération de données via TanStack Query, layout dashboard dédié.
`app/api-client/` ou équivalent : couche de client HTTP typée vers l'API NestJS, partagée entre les deux zones.
Les composants interactifs isolés (formulaire de contact, filtre de portfolio, uploader de documents) vivent dans des sous-composants marqués `"use client"`, jamais au niveau de la page entière côté public.

# 5. Données et asynchrone

PostgreSQL est la source de vérité. Compte tenu du budget d'hébergement (120 USD/an), aucune file de messages dédiée (Redis/queue) n'est requise pour ce volume : les tâches asynchrones (envoi d'e-mail, revalidation ISR) sont traitées directement par NestJS avec une logique de retry simple. Cette décision est révisable si le volume de trafic ou de notifications le justifie (voir `20_Project_Roadmap.md`).

# 6. Adaptateurs externes

`StorageProvider` (disque local du VPS en V1, interface prête pour un stockage objet externe si besoin futur), `MailProvider` (SMTP via un fournisseur à confirmer par EWES), `SearchProvider` (recherche PostgreSQL native — `pg_trgm`/full-text — en V1, pas de moteur de recherche externe). Les objets spécifiques à un fournisseur ne doivent jamais fuiter dans les modèles de domaine.

# 7. Contraintes non-fonctionnelles

Tous les endpoints publics de l'API sont versionnés (`/api/v1`). Les mutations sensibles (publication, changement de droits) sont idempotentes lorsque le retry est probable. Les logs portent un identifiant de corrélation. La séparation public/privé est appliquée à la fois au niveau routes Next.js (middleware d'authentification) et au niveau API NestJS (guards RBAC) — jamais l'un sans l'autre.

# 8. Références

`00_Project_Blueprint.md`, `07_Database_Design.md`, `08_API_Specification.md`, `16_Rendering_State_Strategy.md`, `18_Deployment.md`.
