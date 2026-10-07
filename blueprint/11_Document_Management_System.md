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

> **Règles d'accès implémentées (2026-10-02, à valider avec EWES)** — le modèle de droits ne distinguait pas lecture et écriture, ni ne précisait l'effet de la confidentialité ; décisions prises, fail-closed :
> 1. Un droit de dossier couvre ce dossier **et tous ses sous-dossiers** (héritage descendant). Un droit sur un sous-dossier ne donne jamais accès à son parent, qui reste invisible (le sous-dossier apparaît comme racine dans l'arborescence de l'utilisateur).
> 2. **Écriture** (téléverser, classer, modifier, archiver) = rôle GESTIONNAIRE **et** droit sur le dossier. L'UTILISATEUR lit et télécharge seulement ; l'ADMINISTRATEUR a tout, seul à créer un dossier de premier niveau, fixer la confidentialité d'un dossier, supprimer et gérer les droits.
> 3. **Confidentialité** : une surcharge de document **plus stricte** que son dossier retire l'héritage du droit de dossier — seul un droit sur ce document (`DocumentAccessGrant`) ou l'Administrateur y accède. Égale ou plus laxiste : sans effet sur l'accès. Hors Administrateur, on ne peut ni abaisser la confidentialité d'un document ni téléverser avec une surcharge inférieure à celle du dossier.
> 4. Hors périmètre : **403 identique** que la ressource existe ou non (aucune fuite d'existence) ; seul l'Administrateur obtient un 404. Chaque refus est audité.
> 5. Fichiers : PDF, JPEG, PNG, WebP, DOCX, XLSX, PPTX reconnus par leur contenu, 25 Mo max, stockés sous `PRIVATE_STORAGE_PATH` sous un nom aléatoire, servis uniquement en pièce jointe par la route authentifiée. Suppression = logique (le fichier reste sur le disque, inatteignable ; un dossier contenant un document, même supprimé, ne peut pas être supprimé).
> 6. Audités : création/modification/**déplacement**/suppression de dossier, téléversement, modification, **remplacement de fichier**, archivage/restauration, suppression, **téléchargement**, attribution/révocation de droit (valeurs avant/après), refus d'accès.

# 4. Recherche

La recherche s'exécute uniquement sur le périmètre de dossiers/fichiers auquel l'utilisateur courant a droit (filtrage en base, pas en façade). En V1, la recherche s'appuie sur les capacités full-text natives de PostgreSQL (nom de fichier, catégorie, projet, description) — pas de moteur de recherche externe, cohérent avec le budget d'hébergement.

> **Précisions (2026-10-05)** — le plein texte PostgreSQL utilise la configuration `simple` (pas de lemmatisation : « rapport » ne trouvait pas « Rapports ») ; il est donc doublé d'une recherche **par fragment** (`ILIKE`) sur les mêmes champs : nom et description du document, nom, catégorie, sous-catégorie, projet et département du dossier. Filtres facultatifs : état (actif/archivé), famille de fichier, catégorie et année du dossier. Les filtres de classement ne s'appliquent qu'aux dossiers lisibles par l'appelant : un document partagé isolément n'est jamais retrouvé par le classement d'un dossier qui lui est fermé (testé).

# 5. Cycle de vie d'un fichier

Téléversement (validation type/taille) → classement (dossier + confidentialité) → consultation/téléchargement (vérifié à chaque requête) → archivage (statut, reste consultable selon droit) → suppression (réservée à l'Administrateur, tracée en audit, jamais silencieuse).

# 6. Stockage

Les fichiers sont stockés sur le volume disque du VPS, hors de toute racine servie directement par Nginx. Le téléchargement passe systématiquement par une route API NestJS qui vérifie le droit avant de streamer le contenu. Cette approche évite la dépendance à un service de stockage objet payant non budgété, tout en gardant l'interface `StorageProvider` prête pour une migration future si le volume de documents le justifie.

# 7. Critères d'acceptation

Un Utilisateur ne voit dans l'arborescence que les nœuds auxquels il a droit (pas de dossier visible mais grisé qui révélerait son existence). Un lien de téléchargement expiré, révoqué ou hors périmètre renvoie une erreur explicite sans exposer de détail sur le contenu du fichier. Toute attribution/révocation de droit est auditée.

# 8. Écrans (livrés le 2026-10-05)

Code : `apps/web/src/components/admin/private-docs/`, pages sous `app/admin/(portal)/documents/`, types et aides dans `lib/admin/private-docs.ts`. Tout écran n'affiche que ce que l'API renvoie ; `canWrite` (dossier, document) vient du serveur et ne sert qu'à proposer ou non une action, que le serveur revérifie.

| Écran | Adresse | Rôles | Contenu |
|---|---|---|---|
| Dossiers & fichiers | `/admin/documents`, dossier ouvert `?dossier=<id>` | A, G, U | Accueil : dossiers de premier niveau du périmètre, « Partagés avec vous » (documents isolés, hors Administrateur), « Ajoutés récemment », champ de recherche. Dossier : fil d'Ariane, classement, confidentialité, sous-dossiers, documents triables, téléversement (bouton, glisser-déposer, plusieurs fichiers, avancement réel par fichier), nouveau sous-dossier, modifier/supprimer le dossier |
| Recherche | `/admin/documents/recherche?q=` | A, G, U | Requête dans l'adresse, filtres état / type / catégorie / année, termes surlignés, emplacement de chaque résultat |
| Archives | `/admin/documents/archives` | A, G, U | Documents archivés du périmètre, recherche, tri, « Restaurer » pour qui peut écrire |
| Droits par dossier | `/admin/documents/droits`, `?dossier=<id>` | A | Arborescence avec nombre de droits directs ; par dossier : accès directs (retirables), accès hérités d'un parent (renvoi vers ce parent) ; sans dossier choisi : « qui accède à quoi » par personne |
| Droits par document | `/admin/documents/droits/documents`, `?document=<id>` | A | Documents partagés isolément, personnes par document, « Partager un document » (recherche puis choix des personnes) |

Décisions d'interface prises (à valider avec EWES) :
1. **Téléchargement par requête authentifiée puis remise au navigateur** (pas un simple lien) : une session expirée est renouvelée, un droit retiré entre-temps donne un message explicite (critère §7).
2. **Aperçu** : images uniquement, à la demande (le fichier passe par la route de téléchargement, donc tracé `DOCUMENT_DOWNLOADED`). Pas d'aperçu PDF/Office.
3. **Suppression** d'un document : confirmation explicite, sans saisie du nom (impraticable sur téléphone) ; elle n'est pas réversible depuis le portail.
4. **Remplacer un fichier** (depuis le 2026-10-07) : action « Remplacer le fichier » de la fiche et du menu d'un document (droit d'écriture, document non archivé). Le document garde son identifiant, son nom, son dossier, sa confidentialité et tous ses droits ; seul le contenu change (le type suit le nouveau fichier). Pas de gestion de versions en V1 : l'ancien fichier **reste sur le disque, inatteignable** (comme une suppression logique) et son nom de stockage est consigné dans l'audit (`DOCUMENT_REPLACED`, champ « Ancien fichier conservé »), pour qu'un remplacement par erreur reste récupérable par l'exploitant. Un document archivé doit d'abord être restauré (`409 DOCUMENT_ARCHIVED`). Refus et validation identiques au téléversement (415, 413, 400).
5. **Déplacer un dossier** (depuis le 2026-10-07) : « Déplacer le dossier » dans le menu du dossier, **Administrateur seul**. Les droits suivent l'arborescence (un droit de dossier couvre ses descendants) : déplacer un dossier change donc qui peut le voir, ce qui est une modification de droits, réservée à l'Administrateur (§3). Le dossier garde sa confidentialité, ses droits directs et ses documents ; il peut aller sous n'importe quel dossier ou au premier niveau, jamais sous lui-même ni sous un de ses descendants (`409 FOLDER_MOVE_INVALID`, contrôlé dans une transaction sérialisable). La fenêtre annonce avant de confirmer qui gagne et qui perd la visibilité, et avertit si la destination est moins confidentielle. Audité (`FOLDER_MOVED`, parent avant/après). Un document, lui, se déplace avec avertissement si sa confidentialité héritée change.
6. Un document dont le dossier n'est pas lisible apparaît sans emplacement (« Partagé avec vous »).

# 9. Références

`07_Database_Design.md`, `09_Business_Rules.md`, `10_Security.md`, `14_Admin_Backoffice.md`.
