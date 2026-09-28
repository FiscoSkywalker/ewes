# EWES
## Spécification des Pages Publiques
### Version 1.0 | Statut : Draft

---

# 1. Objet

Ce document détaille le contenu attendu et les exigences de rendu de chaque page du site public. Pas d'application mobile native : le site est responsive, mobile-first, servi en web uniquement.

# 2. Pages et contenu attendu

| Page | Contenu attendu |
|---|---|
| Accueil | Identité, proposition de valeur, domaines d'expertise, chiffres clés, réalisations mises en avant, actualités récentes, appel à contact |
| À propos | Présentation, historique, vision, mission, valeurs, organisation, équipe et experts |
| Nos services | Pôles Environnement, Eau et Travaux d'ingénierie détaillés |
| Nos réalisations | Portfolio filtrable par domaine, année, localisation, type de projet |
| Actualités & publications | Actualités, articles, événements, formations, communiqués, publications techniques |
| Documents | Documents publics téléchargeables + accès à l'espace documentaire privé (authentification requise) |
| Contact | Formulaire, téléphone, e-mail, localisation, horaires, liens professionnels |

# 3. Exigences par écran

Chaque page à données définit ses états : chargement, vide, erreur. La page Nos réalisations et Actualités affichent un état vide explicite si aucun contenu ne correspond aux filtres actifs, jamais une page blanche. La page Contact affiche une confirmation claire après soumission réussie, et les erreurs de validation par champ en cas d'échec.

# 4. Rendu et performance

Accueil, À propos, Nos services : SSG/ISR à revalidation longue (contenu stable). Nos réalisations, Actualités & publications : ISR à revalidation courte ou SSR selon la fraîcheur requise (voir `16_Rendering_State_Strategy.md`). Documents (liste publique) : ISR. Contact : page statique avec formulaire en composant client isolé.

# 5. Routes protégées

L'accès à l'espace documentaire privé depuis la page Documents redirige vers l'authentification si l'utilisateur n'est pas connecté, puis vers le portail documentaire (zone client-side, hors SEO). Une session expirée ramène vers une route sûre sans exposer de contenu mis en cache localement.

# 6. Références

`04_User_Flows.md`, `05_UI_UX_System.md`, `16_Rendering_State_Strategy.md`.
