# EWES
## Spécification API REST
### Version 1.0 | Statut : Draft

---

# 1. Conventions

Chemin de base `/api/v1` ; JSON UTF-8 ; dates ISO-8601 UTC ; jeton d'accès porteur (bearer) pour les routes protégées ; documentation OpenAPI générée depuis le code source (Swagger NestJS) et publiée sur un chemin non indexé. Les listes utilisent `page`, `limit`, des filtres/tri explicites et renvoient `data` + `meta`. Les mutations renvoient la représentation courante de la ressource.

# 2. Contrat d'erreur

```json
{ "code": "DOCUMENT_ACCESS_FORBIDDEN", "message": "Vous n'avez pas accès à ce document.", "details": [], "requestId": "..." }
```
Les erreurs de validation renvoient des détails de champ exploitables par le client : `details: [{ "field": "email", "messages": ["…"] }]` (pipe global `createValidationPipe`). Le frontend ne doit jamais interpréter un message humain pour piloter une logique.

# 3. Surface de ressources

| Zone | Ressources |
|---|---|
| Public | `/auth`, `/me`, `/pages`, `/services`, `/realisations`, `/articles`, `/documents-publics`, `/contact` |
| Espace privé | `GET/POST /documents-prives/folders`, `GET/PATCH/DELETE /documents-prives/folders/:id` ; `GET/POST /documents-prives/files` (téléversement multipart, champ `file`), `GET/PATCH/DELETE /documents-prives/files/:id`, `POST …/archive` et `…/restore`, `GET …/download` (droit vérifié et téléchargement audité à chaque requête) ; `GET /documents-prives/search?q=` (plein texte limité au périmètre) |
| Gouvernance | `/admin/access-grants/folders` et `/documents` (GET, POST, DELETE : Administrateur) ; `GET /admin/audit-logs` (Administrateur, filtres `actorId`, `action`, `entityType`, `entityId`) |
| Contact | `POST /contact` (public, sans authentification ; 5 messages par IP et par 10 minutes ; en-tête `Idempotency-Key` facultatif ; champ piège `website`) ; admin : `GET /admin/contacts` (filtre `status`, recherche `q` sans casse dans nom/organisation/e-mail/téléphone/message — `%` et `_` cherchés littéralement —, tri `sort` = `createdAt`\|`name`\|`organization` et `order` = `asc`\|`desc`, plus récent d'abord par défaut, organisation absente toujours en dernier, `id` en départage), `GET /admin/contacts/:id`, `PATCH /admin/contacts/:id/status` ; `GET /admin/notifications`, `POST /admin/notifications/:id/retry` |
| Articles (actualités) | `GET /articles` (filtres `type`, `exclude` = slug à écarter de la page et du total — ex. article à la une —, pagination ; `meta.types` = articles publiés par type, indépendamment des filtres), `GET /articles/:slug` ; admin : `/admin/articles` (`publish`/`unpublish`/`archive`, couverture via Médias) |
| Documents publics | `GET /documents-publics` (filtres `category`, `year`, pagination), `GET /documents-publics/:slug`, `GET /documents-publics/files/:fichier` (téléchargement, réécrit en `/files/:fichier` par le site) ; admin : `/admin/documents-publics` (liste : filtres `status`, `category`, `year`, recherche `q` sans casse dans titres/slug/descriptions — `%` et `_` cherchés littéralement —, tri `sort` = `titleFr`\|`category`\|`year`\|`updatedAt` et `order`, publiés les plus récents d'abord sans tri explicite, année absente toujours en dernier, `meta.statuses` = effectifs par statut hors filtre de statut ; création multipart avec le PDF dans le champ `file`, `PUT :id/file` pour remplacer, `GET :id/file` pour relire le PDF quel que soit le statut — brouillon compris, en ligne, `private, no-store`, personnel uniquement —, `publish`/`unpublish`/`archive`, `DELETE` logique ; publication, dépublication, archivage et suppression sont audités : `PUBLIC_DOCUMENT_PUBLISHED`/`_UNPUBLISHED`/`_ARCHIVED`/`_DELETED` avec avant/après) |
| Médias | `POST/GET/DELETE /admin/media` (téléversement multipart, champ `file`) ; `GET /media/:fichier` (service public, réécrit en `/uploads/:fichier` par le site) ; `PUT/DELETE /admin/articles/:id/cover` |
| Portail (Gestionnaire/Administrateur) | `/admin/pages`, `/admin/services`, `/admin/realisations`, `/admin/articles`, `/admin/documents-publics`, `/admin/contacts`, `/admin/dashboard` |
| Espace documentaire privé | `/documents-prives/folders`, `/documents-prives/files`, `/documents-prives/search` |
| Gouvernance | `/admin/users`, `/admin/roles`, `/admin/access-grants`, `/admin/audit-logs` |

# 4. Règles de mutation

`POST /realisations`, `POST /articles` et toute mutation de publication vérifient les droits du rôle avant écriture ; le passage d'un statut `DRAFT` à `PUBLISHED` est une action explicite (jamais un effet de bord d'une simple sauvegarde). `POST /documents-prives/files` valide le type/la taille de fichier et exige un `folderId` existant avec confidentialité résolue. `POST /contact` est accessible sans authentification mais protégé contre la soumission automatisée (limitation de fréquence). Toute route retournant un fichier privé vérifie le droit d'accès à chaque requête — jamais via une URL statique non contrôlée.

# 5. Sécurité et compatibilité

RBAC et vérification de propriété/droit s'appliquent à chaque endpoint protégé. Ne jamais exposer un hash de mot de passe, un jeton de rafraîchissement, ou un chemin de fichier privé non vérifié. Tout changement cassant nécessite une nouvelle version d'API (`/api/v2`).

# 6. Références

`07_Database_Design.md`, `10_Security.md`, `11_Document_Management_System.md`, `17_Testing_Strategy.md`.
