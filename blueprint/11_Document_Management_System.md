# EWES
## Espace Documentaire Privé
### Version 1.0 | Statut : Draft

---

# 1. Objectif

Centraliser les documents administratifs, juridiques, fiscaux, techniques, RH, projets et archives historiques d'EWES dans un espace séparé du site public, avec classement, recherche et accès contrôlés par utilisateur.

# 2. Modèle de classement

Chaque dossier est positionné dans une arborescence (sous-dossiers autorisés) et porte : catégorie, sous-catégorie, projet (optionnel), année, département, niveau de confidentialité (`PUBLIC_INTERNE`, `RESTREINT`, `CONFIDENTIEL`). Un fichier hérite de la confidentialité de son dossier, avec possibilité de surcharge explicite au niveau du fichier.

# 3. Droits d'accès

Les droits sont attribués par dossier (`FolderAccessGrant`) et, exceptionnellement, par fichier isolé (`DocumentAccessGrant`) pour un document sorti de son contexte de dossier. Seul un Administrateur crée ou modifie un droit. Un droit attribué est toujours explicite et nominatif — jamais déduit du seul rôle applicatif (`UTILISATEUR` ne donne aucun accès par défaut, il faut un grant).

# 4. Recherche

La recherche s'exécute uniquement sur le périmètre de dossiers/fichiers auquel l'utilisateur courant a droit (filtrage en base, pas en façade). En V1, la recherche s'appuie sur les capacités full-text natives de PostgreSQL (nom de fichier, catégorie, projet, description) — pas de moteur de recherche externe, cohérent avec le budget d'hébergement.

# 5. Cycle de vie d'un fichier

Téléversement (validation type/taille) → classement (dossier + confidentialité) → consultation/téléchargement (vérifié à chaque requête) → archivage (statut, reste consultable selon droit) → suppression (réservée à l'Administrateur, tracée en audit, jamais silencieuse).

# 6. Stockage

Les fichiers sont stockés sur le volume disque du VPS, hors de toute racine servie directement par Nginx. Le téléchargement passe systématiquement par une route API NestJS qui vérifie le droit avant de streamer le contenu. Cette approche évite la dépendance à un service de stockage objet payant non budgété, tout en gardant l'interface `StorageProvider` prête pour une migration future si le volume de documents le justifie.

# 7. Critères d'acceptation

Un Utilisateur ne voit dans l'arborescence que les nœuds auxquels il a droit (pas de dossier visible mais grisé qui révélerait son existence). Un lien de téléchargement expiré, révoqué ou hors périmètre renvoie une erreur explicite sans exposer de détail sur le contenu du fichier. Toute attribution/révocation de droit est auditée.

# 8. Références

`07_Database_Design.md`, `09_Business_Rules.md`, `10_Security.md`, `14_Admin_Backoffice.md`.
