# EWES
## Spécification Sécurité
### Version 1.0 | Statut : Draft

---

# 1. Identité

Les mots de passe utilisent Argon2id. Les jetons d'accès sont de courte durée ; les jetons de rafraîchissement sont rotés, stockés hachés, révocables et liés à une session. Les endpoints d'authentification sont limités en fréquence et ne révèlent jamais si un compte existe.

# 2. Autorisation

Rôles : `ADMINISTRATEUR`, `GESTIONNAIRE`, `UTILISATEUR`, plus l'accès public anonyme au site vitrine. Le RBAC est appliqué côté serveur (guards NestJS) en complément de la vérification de propriété/droit documentaire — jamais uniquement côté interface. Masquer un bouton dans l'UI n'est pas une mesure de sécurité.

# 3. Défenses applicatives

Validation et transformation systématique des DTO (class-validator), requêtes Prisma paramétrées, liste blanche CORS, HTTPS obligatoire, en-têtes de sécurité standards, limitation de taille/type des fichiers téléversés, limitation de fréquence sur les endpoints publics (contact, authentification). Les logs de sécurité portent un identifiant de corrélation et excluent systématiquement mots de passe, jetons et contenu de documents privés.

# 4. Protection des données

Collecte minimale de données personnelles (coordonnées de contact uniquement en V1). Accès aux documents privés restreint par droit explicite, jamais par simple connaissance d'une URL. Les fichiers privés sont servis via une route API authentifiée à chaque requête (pas de lien statique persistant). Sauvegardes chiffrées. Aucun secret n'est jamais committé dans le dépôt ; les valeurs sensibles passent exclusivement par les variables d'environnement (`.env`, non versionné).

# 5. Séparation public / privé

La séparation entre le site public et l'espace documentaire privé est appliquée à deux niveaux indépendants : middleware Next.js (routes protégées, redirection si non authentifié) et guards NestJS (vérification RBAC + droit sur chaque endpoint). Un contournement du frontend ne doit jamais suffire à accéder à une ressource privée.

# 6. Audit et réponse aux incidents

Sont audités : connexions/échecs d'authentification, changements de rôle, changements de droit documentaire, publication/suppression de contenu, téléversement/téléchargement de document privé, changement de configuration sensible. Un runbook d'incident minimal (compromission de compte, fuite de document, panne d'hébergement) est tenu dans `18_Deployment.md`.

# 7. Références

`08_API_Specification.md`, `09_Business_Rules.md`, `11_Document_Management_System.md`, `18_Deployment.md`.

> Note (2026-10-03) — **Comptes et invitations.** Jeton d'invitation : 32 octets aléatoires, conservé haché (SHA-256), à usage unique (activation atomique), valable 7 jours ; un renvoi l'invalide ; jeton inconnu ou retiré = réponse générique, « expiré » et « déjà utilisé » ne sont dits qu'au porteur d'un vrai jeton. **Le rôle d'un compte créé par invitation est celui de l'invitation, jamais celui du client.** Changement de rôle et désactivation : réservés à l'Administrateur, audités (avant/après), jamais sur soi-même, et **jamais sur le dernier administrateur actif** ; ils **révoquent toutes les sessions** du compte (plus de renouvellement). **Limite connue** : le jeton d'accès est sans état (§1) et reste valable jusqu'à 15 minutes après un changement de rôle ou une désactivation ; une vérification en base à chaque requête le réduirait à zéro au prix d'une requête par appel — à décider si cette fenêtre est jugée trop longue. Mot de passe : longueur 12 à 128, pas de règle de composition.

> Note (2026-10-03) — **Traçabilité de l'authentification** (§6 appliqué). Actions : `AUTH_LOGIN_SUCCEEDED` (auteur = le compte ; `method` : `password` ou `invitation`), `AUTH_LOGIN_FAILED` (**sans auteur** — personne n'est authentifié —, élément = le compte visé s'il existe ; `reason` : `unknown_account`, `inactive_account`, `wrong_password` ; `email` saisi, normalisé, jamais plus), `AUTH_TOKEN_REUSE_DETECTED` (jeton de rafraîchissement dont le hash ne correspond plus à sa session : session fermée par prudence ; une simple expiration n'est pas tracée). Adresse IP et navigateur viennent du contexte de la requête (proxy de confiance). **Jamais** le mot de passe saisi, un jeton ou un hash : vérifié par test sur les trois cas d'échec et sur le succès. **Une connexion réussie est tracée obligatoirement** (sans trace, pas de session rendue) ; **un échec l'est au mieux** : une panne du journal ne transforme pas un 401 en erreur serveur et la réponse reste identique pour les trois motifs (pas d'énumération de comptes). Non tracés volontairement : les renouvellements de session (toutes les 15 min), les déconnexions, les requêtes refusées par la limite de fréquence (429) et les requêtes mal formées. **Limite connue** : le journal étant inaltérable, un attaquant distribué peut le faire grossir (5 échecs/min/IP autorisés avant le 429) ; surveiller sa taille en production et décider d'une conservation avec EWES.

> Note (2026-10-03) — **Verrouillage après échecs de connexion répétés** (§1 appliqué). **Règle** : une adresse saisie qui cumule **5 échecs en 15 minutes** (`LOGIN_LOCKOUT_MAX_FAILURES`, `LOGIN_LOCKOUT_MINUTES`) est refusée avec `429 LOGIN_LOCKED` (« Réessayez dans N minutes ») **même avec le bon mot de passe** ; contrôlée avant toute lecture du compte. **Pas de découverte de comptes** : le compteur est tenu **par adresse saisie, compte existant ou non** — une adresse inconnue se verrouille et répond exactement comme une adresse connue. **Fenêtre glissante** : le verrou tombe quand le plus ancien des échecs comptés sort de la fenêtre ; **une tentative refusée n'est pas comptée** (on ne prolonge pas un verrou en insistant : limite le déni de service contre un compte légitime). Une connexion réussie remet le compteur à zéro. **Déverrouillage anticipé** : Administrateur seul (`POST /admin/users/:id/unlock`, audité `USER_UNLOCKED`) ; la personne verrouillée n'a aucun moyen de le faire. **Trace** : `AUTH_ACCOUNT_LOCKED` **une seule fois**, à l'échec qui fait basculer (adresse, nombre d'échecs, fin du verrou ; sans compte visé si l'adresse est inconnue) ; les tentatives refusées ne sont pas tracées une à une. **Stockage** : table de travail `login_failures` (adresse normalisée + date, sans adresse IP), purgée au fil de l'eau — la trace durable reste dans le journal d'audit. Le compteur est tenu **au mieux** (une panne ne change pas la réponse 401), la **vérification du verrou ne l'est pas** (base indisponible = connexion impossible de toute façon). **Compromis assumé** : quelqu'un qui connaît une adresse peut la verrouiller 15 minutes (déni de service ciblé) ; atténué par la limite par IP (5 connexions/min), l'absence de prolongation et le déverrouillage par l'Administrateur ; le verrou n'ouvre aucun accès.

> Note (2026-10-05) — **Changement de mot de passe et photo de profil.** **Mot de passe** : l'actuel est redemandé (une session ouverte ne suffit pas) ; ses échecs comptent dans **le même verrouillage que la connexion** (§1) — cette porte ne laisse pas deviner plus vite que l'écran de connexion — et la route est limitée à 5/min ; un succès remet le compteur à zéro. Un changement **ferme toutes les autres sessions** (la courante, identifiée par `sid` dans le jeton d'accès, continue ; sans `sid`, toutes sont fermées par prudence), **alerte la personne par e-mail** (sans secret ni lien) et est audité sans aucun mot de passe. **Photo** : fichier privé dans `PRIVATE_STORAGE_PATH/avatars` (sauvegardé avec l'espace privé, aucune variable de plus), servi seulement à son propriétaire après authentification, jamais par une adresse publique ; **toujours ré-encodée** (recadrée 512 px, WebP, EXIF/GPS retirés), type jugé sur le contenu, SVG exclu. **Sessions** : fermeture limitée aux sessions de la personne du jeton.

> Note (2026-10-05) — **Lecture des photos par l'Administrateur.** La photo reste un fichier privé : la route `GET /admin/users/:id/avatar` est réservée au rôle Administrateur (guard serveur) ; Gestionnaire et Utilisateur ne voient que la leur (`GET /me/avatar`). Le portail la lit par requête authentifiée, jamais par une adresse publique.
