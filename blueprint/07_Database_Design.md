# EWES
## Modèle de Données
### Version 1.0 | Statut : Draft

---

# 1. Conventions

PostgreSQL et Prisma font autorité. Clés primaires UUID, horodatages UTC, `createdAt`/`updatedAt` systématiques, suppression douce (`deletedAt`) uniquement où la traçabilité l'exige (réalisations, documents, utilisateurs), statuts pilotés par enum, contenu multilingue porté par des colonnes jumelées (`titleFr`/`titleEn`, etc.) plutôt qu'une table de traduction séparée, pour rester simple au regard du budget.

# 2. Modèle d'agrégats principal

| Agrégat | Entités principales |
|---|---|
| Identité | User, Role, Session, PasswordResetToken |
| Contenu institutionnel | Page (Accueil/À propos/Contact — blocs de contenu), Service (Environnement/Eau/Travaux), Expert |
| Réalisations | Realisation, RealisationImage, RealisationDocument, RealisationPartner |
| Actualités | Article (type: actualité/événement/formation/communiqué), ArticleDocument, ArticleImage |
| Documents publics | PublicDocument (brochures, fiches techniques, certificats publiables) |
| Espace documentaire privé | Folder (arborescence catégorie/sous-catégorie/projet/année/département), PrivateDocument, FolderAccessGrant, DocumentAccessGrant |
| Contact | ContactMessage |
| Système | Notification, AuditLog, MediaAsset |

# 3. Relations critiques

Un `User` possède un `Role` (ADMINISTRATEUR, GESTIONNAIRE, UTILISATEUR) et zéro ou plusieurs `FolderAccessGrant`/`DocumentAccessGrant`. Un `Service` (pôle) porte un nom, une accroche, une description et une position (`sortOrder`), et possède zéro ou plusieurs `ServiceOffering` (prestations ordonnées, FR/EN) qui suivent son statut de publication ; son slug est verrouillé après la première publication (`publishedAt`). Une `Realisation` peut être rattachée à un `Service` (domaine, facultatif depuis le 2026-10-02), porte un type de mission (`projectType` : EIES, AUDIT, MONITORING, AGREMENT, FORMATION, ETUDE), une année et une année de fin (`yearEnd`, missions pluriannuelles), et référence zéro ou plusieurs `RealisationDocument`/`RealisationImage`. Un `Folder` peut contenir des sous-dossiers (auto-référence) et des `PrivateDocument` ; chaque fichier hérite du niveau de confidentialité de son dossier sauf surcharge explicite. Un `AuditLog` référence l'acteur (`User`), l'action et l'entité concernée ; il est en écriture seule (append-only).

# 4. Invariants

Un contenu (Realisation, Article, Page) n'est visible côté public que si son statut est `PUBLISHED` et sa date de publication atteinte. La modification d'un contenu publié ne casse jamais les liens existants (slug stable). Un `PrivateDocument` sans `FolderAccessGrant`/`DocumentAccessGrant` correspondant à l'utilisateur courant n'apparaît dans aucune requête qui lui est adressée — le filtrage par droit se fait en base, pas seulement côté UI. Les `AuditLog` ne sont ni modifiables ni supprimables via l'API applicative.

# 5. Index requis

Email unique sur `User` ; `slug` unique par langue sur `Realisation`/`Article`/`Page` ; `Realisation(service_id, status, publishedAt)` ; `Article(type, status, publishedAt)` ; `Folder(parentId)` ; `PrivateDocument(folderId)` ; `FolderAccessGrant(userId, folderId)` unique ; `ContactMessage(createdAt)` ; `AuditLog(actorId, createdAt)`.

# 6. Rétention des données

Les messages de contact, les documents privés et les journaux d'audit suivent une politique de rétention à définir avec EWES (par défaut : conservation indéfinie tant que le compte du prestataire est actif, sauvegarde chiffrée quotidienne, restauration testée). Aucune donnée personnelle sensible au-delà des coordonnées de contact n'est collectée en V1.

# 7. Références

`08_API_Specification.md`, `09_Business_Rules.md`, `10_Security.md`, `11_Document_Management_System.md`, `12_Realisations_Portfolio_System.md`.
