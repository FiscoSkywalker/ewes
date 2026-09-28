# EWES
## Exigences Fonctionnelles
### Version 1.0 | Statut : Draft

---

# 1. Objet

Ce document définit le comportement observable de la plateforme pour la version commerciale initiale. Les règles détaillées priment dans `09_Business_Rules.md` ; les contrats d'API priment dans `08_API_Specification.md`.

# 2. Capacités du visiteur (site public)

## 2.1 Navigation et découverte
Le visiteur accède sans authentification à : Accueil, À propos, Nos services, Nos réalisations (portfolio filtrable par domaine/année/localisation/type), Actualités & publications, Documents publics, Contact. Chaque page est disponible en FR et en EN via un sélecteur de langue persistant.

## 2.2 Réalisations
Le visiteur consulte les fiches publiées uniquement (statut "publié"). Une fiche dépubliée ou en brouillon ne doit jamais être accessible par URL directe.

## 2.3 Actualités & publications
Le visiteur consulte articles, événements, formations, communiqués et télécharge les documents publics associés (brochures, fiches techniques, certificats publiables). Le tri par date est disponible par défaut.

## 2.4 Contact
Le visiteur soumet un formulaire (nom, coordonnées, message) validé côté serveur. La soumission déclenche une notification interne (voir `13_Notification_System.md`) et un accusé de réception à l'expéditeur.

## 2.5 Documents
La page Documents distingue clairement les documents publics (accessibles à tous) et l'accès à l'espace documentaire privé (nécessite authentification), sans jamais révéler par erreur l'existence ou le contenu d'un document privé à un visiteur non autorisé.

# 3. Capacités du Gestionnaire et de l'Administrateur (portail d'administration)

| Module | Exigences |
|---|---|
| Éditorial | Créer/modifier/publier/dépublier pages institutionnelles, services, réalisations, actualités, experts, médias, catégories |
| Documentaire | Créer/organiser dossiers et fichiers, définir la confidentialité, rechercher, archiver, gérer les utilisateurs et leurs droits |
| Contacts | Consulter les messages reçus, marquer le statut de suivi, exporter si nécessaire |
| Tableau de bord | Vue synthétique : contenus publiés, documents stockés, utilisateurs actifs, dernières actions |
| Gouvernance | Gérer les rôles et droits (Administrateur uniquement pour la création/modification de rôles) |

L'Administrateur a accès complet. Le Gestionnaire agit sur les contenus et documents qui lui sont autorisés, sans accès à la configuration de sécurité ni à la gestion des rôles.

# 4. Capacités de l'Utilisateur documentaire

Un Utilisateur (rôle limité) se connecte, consulte et télécharge uniquement les dossiers/fichiers qui lui sont explicitement attribués. Il ne voit ni la structure ni l'existence des dossiers hors de son périmètre d'accès.

# 5. Exigences système

La plateforme doit : servir chaque page publique avec un rendu serveur (SEO), stocker les médias hors du dépôt applicatif, enregistrer un historique des actions sensibles (audit), envoyer des notifications transactionnelles par e-mail, exposer une API REST documentée et versionnée, et appliquer HTTPS sur l'ensemble des échanges.

# 6. Critères d'acceptation

- Un contenu en brouillon ou dépublié n'est jamais accessible ni indexable côté public.
- Un Utilisateur documentaire ne peut jamais accéder à un dossier qui ne lui a pas été explicitement attribué, même par manipulation d'URL.
- Un Gestionnaire ne peut pas modifier la configuration de sécurité ni les rôles.
- Une soumission de formulaire de contact invalide (champs manquants, format incorrect) est rejetée avec un message exploitable, sans perte silencieuse.
- Chaque action de publication, suppression ou changement de droit sur un document produit une entrée d'audit horodatée et attribuée à un acteur identifié.
- Le contenu FR et EN d'une même entité reste synchronisé structurellement : l'absence de traduction EN n'empêche pas l'affichage de la page (repli sur la langue par défaut avec indication explicite).

# 7. Références

`03_User_Personas.md`, `04_User_Flows.md`, `07_Database_Design.md`, `09_Business_Rules.md`, `11_Document_Management_System.md`, `12_Realisations_Portfolio_System.md`, `14_Admin_Backoffice.md`, `15_Public_Site_Pages.md`.
