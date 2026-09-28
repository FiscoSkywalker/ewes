# EWES
## AI Development Blueprint
### Version 1.0 | Statut : Draft

---

# Informations du document

| Propriété | Valeur |
|---|---|
| Projet | Modernisation du site web institutionnel d'EWES |
| Document | 00_Project_Blueprint |
| Version | 1.0 |
| Statut | Draft |
| Prestataire | Planning Events S.A.R.L. |
| Client | EWES S.A.R.L. |
| Contrat de référence | `raw/01-contrat-prestation-ewes.md` + `raw/02-annexe-1-proposition-technique-financiere-ewes.md` |
| Agents cibles | Claude Code, Cursor, et tout agent IA reprenant le projet |
| Dernière mise à jour | Septembre 2026 |

---

# 1. Objet de ce document

Ce document est la **source de vérité unique** du projet EWES. Toute décision d'architecture, règle métier, convention de code, spécification d'API et priorité de développement doit s'aligner sur ce blueprint et les 21 documents qui composent ce système AIOS (`blueprint/`).

Tout agent IA (Claude Code, Cursor ou autre) qui intervient sur ce projet doit considérer ce blueprint comme la spécification de plus haut niveau, à lire avant de générer du code. En cas de contradiction entre documents, ce blueprint prévaut, sauf mise à jour explicite d'un document plus spécifique.

Le contrat et son Annexe 1 (`raw/`) restent la référence contractuelle et commerciale. Ce blueprint les traduit en spécifications techniques exploitables ; il ne les remplace pas.

# 2. Pourquoi un système AIOS ici

Le projet sera développé avec plusieurs outils (Claude Code, Cursor) et sur plusieurs sessions, dont certaines seront interrompues par des limites d'usage (ex. fenêtre de 5h de Claude Code). Aucune session n'a de mémoire garantie de la précédente. Le système AIOS (`blueprint/`) est donc la mémoire persistante du projet : tout agent doit pouvoir reprendre le travail à froid en lisant ces documents, sans dépendre de l'historique de conversation.

Voir `19_AI_Coding_Rules.md` pour le protocole de lecture en début de session et `21_Backlog_and_Session_Handoff.md` pour le protocole de relais entre sessions/outils.

# 3. Aperçu du projet

EWES (environnement, eau, travaux d'ingénierie) fait évoluer son site vitrine vers une plateforme institutionnelle bilingue (FR/EN), administrable en autonomie, composée de trois espaces partageant un même socle technique :

- **Site public** : Accueil, À propos, Nos services, Nos réalisations, Actualités & publications, Documents (publics), Contact.
- **Portail d'administration** : gestion éditoriale, gestion documentaire, gestion des contacts, tableau de bord, rôles.
- **Espace documentaire privé** : dossiers/fichiers classés (catégorie, sous-catégorie, projet, année, département, confidentialité), recherche, accès contrôlés par utilisateur.

# 4. Vision

Faire de la présence digitale d'EWES un actif numérique durable : une vitrine crédible qui valorise l'expertise et les réalisations, et un outil interne qui centralise et sécurise l'information documentaire — administrable sans intervention technique permanente après la transmission.

# 5. Principes produit

1. **Le contenu public prime sur le décor.** Chaque page publique doit charger vite, être lisible dès le premier rendu (avant hydratation JS) et bien référencée.
2. **Autonomie éditoriale réelle.** Une personne non technique doit pouvoir publier une réalisation, une actualité ou un document sans assistance.
3. **Séparation stricte public / privé.** Rien de l'espace documentaire privé ne doit être accessible ou indexable sans authentification et droits explicites.
4. **Sobriété d'infrastructure.** Le budget d'hébergement est limité (120 USD/an) : privilégier des choix techniques simples, auto-hébergeables, sans dépendance à des services tiers payants non budgétés.
5. **Bilingue par construction.** Le FR/EN n'est pas une surcouche ajoutée après coup ; chaque contenu éditorial porte ses deux versions dès le modèle de données.
6. **Extensible sans réécriture.** Les évolutions futures (chatbot RAG, espace partenaires, appels d'offres, etc. — voir `20_Project_Roadmap.md`) doivent pouvoir se greffer sans refonte du socle.

# 6. Périmètre inclus (montant initial 620 USD)

Conception ergonomique, développement Next.js/NestJS, intégration des contenus fournis par EWES, modules Réalisations et Archivage (espace documentaire privé), sécurisation HTTPS, portail d'administration avec rôles, formation courte de l'équipe EWES, mise en production.

# 7. Hors périmètre initial

Rédaction éditoriale intégrale des textes, tournages vidéo ou séances photo professionnelles, numérisation/saisie massive d'archives papier historiques, module Chatbot IA (RAG) — voir `Article 10` du contrat et section 16 de l'Annexe 1. Ces éléments font l'objet d'un accord distinct s'ils sont activés.

# 8. Stack technique cible

| Couche | Choix |
|---|---|
| Frontend (public + admin) | Next.js (App Router) + TypeScript |
| Backend | NestJS + API REST (OpenAPI/Swagger) |
| Base de données | PostgreSQL (Prisma comme ORM recommandé) |
| Authentification | JWT (access + refresh), RBAC, Argon2id |
| Stockage fichiers | Volume disque du VPS, accès via routes API authentifiées (pas de service cloud payant non budgété) |
| Déploiement | Docker Compose + Nginx (reverse proxy) + HTTPS |
| i18n | FR (défaut) / EN, porté par le modèle de données, pas de traduction automatique |

Détails complets : `06_Application_Architecture.md`, `07_Database_Design.md`, `18_Deployment.md`.

# 9. Architecture de rendu (principe directeur, non négociable)

- **Site public** : rendu serveur (SSR/SSG/ISR selon la fraîcheur du contenu), composants client minimisés. Objectif SEO et affichage rapide dès la première requête.
- **Portail d'administration et espace documentaire privé** : traités comme une application client-side (dashboard interactif), sans SSR forcé inutile.
- Ne jamais rendre une page entière "client component" pour isoler un seul élément interactif (formulaire, filtre, upload) : isoler cet élément dans un sous-composant client ciblé.
- Voir `16_Rendering_State_Strategy.md` pour le détail page par page.

# 10. Modules fonctionnels

Authentification & rôles, Pages institutionnelles (CMS léger), Services (Environnement / Eau / Travaux d'ingénierie), Réalisations/Projets (portfolio filtrable), Actualités & publications, Documents publics téléchargeables, Espace documentaire privé, Contact, Administration (éditorial, documentaire, contacts, tableau de bord), Notifications e-mail, Journalisation/audit.

# 11. Non-objectifs (hors roadmap initiale)

Pas d'application mobile native, pas de paiement en ligne, pas de marketplace, pas de chatbot IA en V1, pas de multi-organisation/multi-site.

# 12. Contraintes non-fonctionnelles

Performance (chargement rapide, mobile-first), Sécurité (HTTPS, RBAC, séparation public/privé, sauvegardes), SEO (méta-données, sitemap, URLs propres), Maintenabilité (code que l'équipe Planning Events ou tout repreneur peut reprendre), Observabilité minimale (logs structurés), Bilinguisme complet.

# 13. Définition du succès

Le projet est réussi quand : le site est moderne et performant sur mobile ; un visiteur comprend l'offre EWES en quelques secondes ; l'équipe EWES publie réalisations/actualités sans aide technique ; les documents privés sont classés, retrouvables et protégés par des accès pertinents ; la mise en production est faite, documentée et transmise avec formation.

# 14. Table des documents du système AIOS

| # | Document | Contenu |
|---|---|---|
| 00 | Project_Blueprint | Ce document — vision d'ensemble |
| 01 | Product_Vision | Positionnement produit, portée commerciale, métriques |
| 02 | Functional_Requirements | Exigences fonctionnelles observables |
| 03 | User_Personas | Profils utilisateurs et contraintes de conception |
| 04 | User_Flows | Parcours utilisateurs critiques |
| 05 | UI_UX_System | Design system bilingue institutionnel |
| 06 | Application_Architecture | Architecture Next.js/NestJS, frontières de modules |
| 07 | Database_Design | Modèle de données PostgreSQL/Prisma |
| 08 | API_Specification | Conventions REST, contrat d'erreur, ressources |
| 09 | Business_Rules | Règles métier (publication, confidentialité, accès) |
| 10 | Security | Authentification, RBAC, protection des données |
| 11 | Document_Management_System | Espace documentaire privé |
| 12 | Realisations_Portfolio_System | Module Réalisations/Projets |
| 13 | Notification_System | Notifications e-mail |
| 14 | Admin_Backoffice | Portail d'administration |
| 15 | Public_Site_Pages | Spécification des pages publiques |
| 16 | Rendering_State_Strategy | Stratégie SSR/SSG/ISR/CSR et état client |
| 17 | Testing_Strategy | Stratégie de test |
| 18 | Deployment | Déploiement Docker/Nginx/HTTPS |
| 19 | AI_Coding_Rules | Règles pour agents IA, protocole de session |
| 20 | Project_Roadmap | Planning, jalons de paiement, évolutions |
| 21 | Backlog_and_Session_Handoff | Backlog de tâches et journal de session |

# Fin de la Partie 1

Les sections suivantes détaillent la vision produit complète, les exigences fonctionnelles, l'architecture technique et le plan d'exécution que chaque document ultérieur référence.
