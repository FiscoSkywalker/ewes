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

Un `User` possède un `Role` (ADMINISTRATEUR, GESTIONNAIRE, UTILISATEUR) et zéro ou plusieurs `FolderAccessGrant`/`DocumentAccessGrant`. Un `Service` (pôle) porte un nom, une accroche, une description et une position (`sortOrder`), et possède zéro ou plusieurs `ServiceOffering` (prestations ordonnées, FR/EN) qui suivent son statut de publication ; son slug est verrouillé après la première publication (`publishedAt`). Un `ContactMessage` (nom, organisation, e-mail, téléphone, besoin, message, langue) n'est jamais modifié après sa soumission : seul son statut de suivi (NOUVEAU/TRAITE) évolue ; une clé d'idempotence et une empreinte du contenu détectent les doubles envois. Une `Notification` porte son type, son destinataire, une clé d'idempotence unique, le nombre de tentatives et l'éventuelle dernière erreur. Un `PrivateDocument` porte son dossier, un nom, une description, un type et une taille, une surcharge facultative de confidentialité, un statut (ACTIVE/ARCHIVED), l'auteur du téléversement et un nom de stockage interne jamais exposé. L'`AuditLog` est en écriture seule **garanti par PostgreSQL** (déclencheurs : ni UPDATE, ni DELETE, ni TRUNCATE, sauf l'anonymisation `actorId -> NULL` d'un utilisateur supprimé) et consigne l'acteur, l'action, l'entité, les valeurs avant/après, l'adresse IP et le navigateur. Un `PublicDocument` est un PDF public téléchargeable (rapport, guide, fiche technique, brochure) : slug stable, titre et résumé FR/EN, catégorie (`DocumentCategory` : rapport, guide, fiche technique, brochure, certificat), année, nombre de pages, service (pôle) facultatif, statut/date de publication ; son fichier est stocké sous `PUBLIC_MEDIA_PATH/documents` sous un nom aléatoire et n'est servi que tant que le document est publié (brouillon, archivé et supprimé logiquement sont inatteignables, même par leur nom de fichier). Un `Media` est une image publique téléversée depuis le portail (nom stocké aléatoire, type réel JPEG/PNG/WebP, 5 Mo max) ; une `ArticleImage`/`RealisationImage` la référence par son URL publique `/uploads/<fichier>`, et un média encore référencé ne peut pas être supprimé. `Media.altFr`/`altEn` (nullables, migration `20261006111500_media_default_alt`) portent le **texte alternatif par défaut** de l'image : c'est une valeur de départ, copiée dans le contenu qui choisit l'image, pas une référence — les `altFr`/`altEn` d'`ArticleImage`, `RealisationImage` et `Service.imageAlt*` restent la valeur affichée par le site. Un `Article` porte un type (`ACTUALITE`, `EVENEMENT`, `FORMATION`, `COMMUNIQUE`, `ENQUETE`, `PUBLICATION`), un contexte court FR/EN, un résumé, un corps (HTML restreint — titres h2/h3, gras, italique, listes, citation, liens, images `/uploads/*` — nettoyé par l'API à chaque écriture ; les articles écrits avant l'éditeur restent du texte brut, paragraphes séparés par une ligne vide, jusqu'à leur prochaine modification), une date de publication et sa précision d'affichage (`datePrecision` : année, mois ou jour) ; son visuel de couverture est sa première `ArticleImage`. Une `Realisation` peut être rattachée à un `Service` (domaine, facultatif depuis le 2026-10-02), porte un type de mission (`projectType` : EIES, AUDIT, MONITORING, AGREMENT, FORMATION, ETUDE), une année et une année de fin (`yearEnd`, missions pluriannuelles), et référence zéro ou plusieurs `RealisationDocument`/`RealisationImage`. Un `Folder` peut contenir des sous-dossiers (auto-référence) et des `PrivateDocument` ; chaque fichier hérite du niveau de confidentialité de son dossier sauf surcharge explicite. Un `AuditLog` référence l'acteur (`User`), l'action et l'entité concernée ; il est en écriture seule (append-only).

# 4. Invariants

Un contenu (Realisation, Article, Page) n'est visible côté public que si son statut est `PUBLISHED` et sa date de publication atteinte. La modification d'un contenu publié ne casse jamais les liens existants (slug stable). Un `PrivateDocument` sans `FolderAccessGrant`/`DocumentAccessGrant` correspondant à l'utilisateur courant n'apparaît dans aucune requête qui lui est adressée — le filtrage par droit se fait en base, pas seulement côté UI. Les `AuditLog` ne sont ni modifiables ni supprimables via l'API applicative.

# 5. Index requis

Email unique sur `User` ; `slug` unique par langue sur `Realisation`/`Article`/`Page` ; `Realisation(service_id, status, publishedAt)` ; `Article(type, status, publishedAt)` ; `Folder(parentId)` ; `PrivateDocument(folderId)` ; `FolderAccessGrant(userId, folderId)` unique ; `ContactMessage(createdAt)` ; `AuditLog(actorId, createdAt)`.

# 6. Rétention des données

Les messages de contact, les documents privés et les journaux d'audit suivent une politique de rétention à définir avec EWES (par défaut : conservation indéfinie tant que le compte du prestataire est actif, sauvegarde chiffrée quotidienne, restauration testée). Aucune donnée personnelle sensible au-delà des coordonnées de contact n'est collectée en V1.

# 7. Références

`08_API_Specification.md`, `09_Business_Rules.md`, `10_Security.md`, `11_Document_Management_System.md`, `12_Realisations_Portfolio_System.md`.

> Note (2026-10-02) — `RealisationDocument` et `RealisationPartner` portent une colonne `position` (ordre d'affichage choisi, comme `RealisationImage`) ; migration `20261002215356_realisation_links_position`. Un partenaire est un simple nom propre à chaque réalisation (pas d'entité) : l'annuaire de l'administration les regroupe par nom, casse ignorée.

> Note (2026-10-03) — migration `20261002230530_site_content_design` : `Page` gagne `metaDescriptionFr/En` (description des moteurs de recherche, facultative ; absente, le site reprend un extrait de l'introduction de la même langue) ; `Service` gagne `imageUrl`, `imageAltFr`, `imageAltEn` (visuel du pôle = adresse `/uploads/<nom>` d'une image de la médiathèque, absent = visuel d'origine du site) ; `ServiceOffering` gagne `icon` (clé de pictogramme, ex. `droplets`). L'existant est repris par la migration : les pictogrammes qui dépendaient jusqu'ici de la position de la prestation sont figés en base. Un `Service` référencé comme visuel compte parmi les usages d'un `Media` (type `SERVICE`) : l'image ne peut plus être supprimée. Le slug d'un `Service` relie le pôle à son identité visuelle sur le site (`environnement`, `eau`, `ingenierie`) ; l'ordre des trois pôles est fixe (récit de l'Accueil) et `Service.sortOrder` n'est pas modifiable depuis le portail.

> Note (2026-10-03) — migration `20261003001254_key_figures` : table `KeyFigure` (chiffre clé de la page À propos) : `value`, `sinceYear` (renseignée, la valeur affichée est `année courante − sinceYear`, calculée à chaque lecture et jamais stockée ; `value` est alors ignorée), `suffixFr/En`, `labelFr/En`, `subtextFr/En`, `sortOrder`, `isVisible` (masqué = conservé mais non exposé). La migration reprend les quatre chiffres affichés jusqu'ici (`messages/*.json` → `Metrics`) si la table est vide. Huit chiffres au plus (règle de l'API, `MAX_KEY_FIGURES`).

> Note (2026-10-03) — migration `20261003003644_key_figure_source` : `KeyFigure.source` (`KeyFigureSource` : `FIXED`, `YEARS_SINCE`, `MISSIONS`, `TRAININGS`, défaut `FIXED` ; les chiffres qui avaient une année de départ passent en `YEARS_SINCE`). `value` n'est lue que pour `FIXED`, `sinceYear` que pour `YEARS_SINCE` (effacée sinon). `MISSIONS` et `TRAININGS` comptent les réalisations publiées, non supprimées, dont la date de publication est atteinte (même règle que la lecture publique) ; `TRAININGS` ajoute `projectType = 'FORMATION'`.

> Note (2026-10-03) — migration `20261003005052_expert_profile` : `Expert` gagne `specialtiesFr/En` (`TEXT[]`), `yearsOfExperience`, `sortOrder`, `status` (`ContentStatus`, défaut `DRAFT`) et `publishedAt`. `photoUrl` référence une image de la médiathèque (`/uploads/<nom>`) et compte parmi les usages d'un `Media` (type `EXPERT`) ; `serviceId` (pôle) donne l'accent de couleur et le nom du pôle sur la fiche. Les six profils provisoires de `/a-propos` (personnes fictives) sont importés par `npm run db:seed` **en brouillon**. Un `Expert` est supprimé définitivement (aucun autre contenu ne le référence), avec une entrée d'audit.

> Note (2026-10-03) — migration `20261003093156_user_invitations` : table `user_invitations` (`UserInvitation` : `email` normalisé, `fullName`, `role`, `tokenHash` unique — SHA-256 du jeton, jamais le jeton —, `invitedById` (`SET NULL`), `expiresAt`, `lastSentAt`, `acceptedAt`, `revokedAt`). Une invitation est **en attente** tant qu'elle n'est ni acceptée ni retirée, **expirée** si `expiresAt` est passé. Le compte (`User`) n'existe qu'à l'acceptation : aucun mot de passe factice en base, `User.passwordHash` reste obligatoire. Une seule invitation en attente par adresse (règle de service ; une expirée est remplacée par la nouvelle).

> Note (2026-10-03) — migration `20261003121902_login_lockout` : table `login_failures` (`LoginFailure` : `email` normalisé — saisi, compte existant ou non —, `createdAt` ; index `(email, createdAt)` et `(createdAt)`). Table de travail du verrouillage de connexion : pas de clé étrangère, pas d'adresse IP ; purgée à chaque nouvel échec (lignes plus vieilles que la fenêtre), effacée par une connexion réussie ou un déverrouillage.

> Note (2026-10-03) — migration `20261003122037_site_settings` : table `site_settings` (`SiteSettings`), **une seule ligne** (`id` = « site », créée au premier enregistrement ; sans elle, `DEFAULT_SITE_SETTINGS` de l'API s'applique) : `phone`, `email`, `addressFr`, `addressEn?`, `officeDays` (`Int[]`, `Date.getDay()`), `opensAt`, `closesAt` (« HH:MM », heure de Lubumbashi), `linkedinUrl?`, `facebookUrl?`, `xUrl?`, `youtubeUrl?`, `contactRecipientEmail?`, `contactAutoReply` (défaut vrai). Aucun secret (les identifiants SMTP restent dans l'environnement).

> Note (2026-10-05) — migration `20261005141158_user_profile` : `users.avatarName` (nom du fichier de la photo sous `PRIVATE_STORAGE_PATH/avatars`, `NULL` = initiales) et `users.passwordChangedAt` (dernier changement par la personne, `NULL` = mot de passe d'activation).
