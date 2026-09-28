# EWES — Modernisation du site institutionnel

Projet pour Planning Events (prestataire) / EWES S.A.R.L. (client). Site institutionnel bilingue (FR/EN) : vitrine publique + portail d'administration + espace documentaire privé. Contrat et périmètre commercial : `raw/`.

## Source de vérité

Le système AIOS dans `blueprint/` (`00` à `21`) fait autorité sur toute décision d'architecture, règle métier ou priorité — voir `blueprint/00_Project_Blueprint.md`.

## Avant de coder (chaque session)

1. Lire `blueprint/00_Project_Blueprint.md`, `blueprint/19_AI_Coding_Rules.md`, puis la dernière entrée du journal dans `blueprint/21_Backlog_and_Session_Handoff.md`.
2. Lire le document de domaine concerné par la tâche (ex. `blueprint/11_Document_Management_System.md` pour l'espace documentaire).

## Avant de terminer une session (limite d'usage, ou passage à Cursor)

Committer le travail (même incomplet), cocher les tâches faites et ajouter une entrée au journal dans `blueprint/21_Backlog_and_Session_Handoff.md` avec une prochaine étape actionnable. Détail complet du protocole : `blueprint/19_AI_Coding_Rules.md` §3 et `blueprint/21_Backlog_and_Session_Handoff.md` §3.

## Stack

Next.js (App Router, TypeScript) pour le site public **et** le portail admin · NestJS (API REST) · PostgreSQL/Prisma · Docker + Nginx + HTTPS.

## Règles non négociables (détail complet : `blueprint/19_AI_Coding_Rules.md`)

- Site public : rendu serveur (SSR/SSG/ISR), composants client isolés au strict nécessaire. Portail admin / espace documentaire privé : application client-side, pas de SSR forcé. Voir `blueprint/16_Rendering_State_Strategy.md`.
- Aucune confiance en un statut, rôle ou droit envoyé par le client : toute vérification RBAC/confidentialité se fait côté serveur (`blueprint/10_Security.md`).
- Sobriété d'infrastructure : pas de dépendance tierce payante non budgétée (hébergement 120 USD/an) sans validation explicite.
- Ne jamais committer de secret ; `.env` reste hors dépôt.
