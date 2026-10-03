# EWES
## Système de Notifications
### Version 1.0 | Statut : Draft

---

# 1. Canal

E-mail transactionnel uniquement en V1 (SMTP, fournisseur à confirmer par EWES avant l'étape 04 du planning). Pas de push mobile (pas d'application mobile), pas de SMS. Un centre de notifications in-app côté portail d'administration peut être ajouté ultérieurement (voir `20_Project_Roadmap.md`) sans faire partie du périmètre initial.

> **Panneau de notifications du portail (2026-10-02)** — la cloche de la barre supérieure n'est pas (encore) un centre de notifications serveur : elle reflète en direct, toutes les 60 s, les éléments qui attendent une action — nouveaux messages de contact (Administrateur, Gestionnaire) et e-mails en échec définitif (Administrateur), lus dans `GET /admin/contacts?status=NOUVEAU` et `GET /admin/notifications?status=failed`. Seul l'état « lu » est local au navigateur (horodatage par compte) ; l'information reste toujours retrouvable dans l'écran concerné (§5).

# 2. Catalogue d'événements

Nouveau message de contact (notification interne à l'équipe EWES désignée), accusé de réception automatique à l'expéditeur du formulaire de contact, attribution/révocation d'un droit d'accès documentaire (notification à l'Utilisateur concerné), création de compte utilisateur avec définition du mot de passe, expiration de session pour action sensible.

# 3. Traitement

Un événement métier committé (ex. message de contact enregistré) déclenche l'envoi via `MailProvider`. Compte tenu du faible volume attendu (site institutionnel, pas de trafic transactionnel de masse), l'envoi est traité directement par NestJS avec une logique de retry simple (3 tentatives, backoff court) plutôt qu'une file de messages dédiée — décision cohérente avec la contrainte de budget d'hébergement (voir `06_Application_Architecture.md` section 5).

> **Implémentation (2026-10-02)** : adaptateur SMTP (`nodemailer`) derrière le port `MailProvider`, configuré par `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` et `CONTACT_NOTIFICATION_EMAIL` (le fournisseur définitif reste à confirmer par EWES : aucun changement de code, seulement des variables d'environnement). Chaque envoi est d'abord enregistré (`Notification`, clé d'idempotence unique : un événement dupliqué ne produit jamais deux e-mails), puis tenté 3 fois (0 s, 1 s, 3 s) en arrière-plan sans bloquer la requête qui l'a déclenché. Un échec définitif reste visible (`failedAt`, `lastError`) dans `GET /admin/notifications?status=failed` et se rejoue par `POST /admin/notifications/:id/retry` (Administrateur). Si le SMTP n'est pas configuré, l'envoi échoue explicitement (`MAIL_NOT_CONFIGURED`, sans nouvelles tentatives inutiles) au lieu de simuler un succès. Les e-mails sont en texte brut. Limite anti-abus : au plus 3 accusés de réception par adresse et par heure (le message est enregistré et l'équipe notifiée dans tous les cas). Pas de reprise automatique des envois « en attente » au redémarrage : un envoi interrompu se rejoue depuis l'administration.

# 4. Confidentialité

Les e-mails transactionnels ne contiennent jamais le contenu d'un document privé, uniquement une référence et un lien vers une ressource authentifiée. Les adresses de contact de tiers ne sont jamais exposées dans un e-mail groupé.

# 5. Critères d'acceptation

Un événement dupliqué (ex. double soumission du formulaire de contact) ne produit pas de notification en double (idempotence). Un échec d'envoi après épuisement des tentatives est journalisé et visible par l'Administrateur (pas d'échec silencieux). Un utilisateur peut toujours retrouver l'information notifiée directement depuis le portail (l'e-mail n'est jamais l'unique source de vérité).

# 6. Références

`04_User_Flows.md`, `07_Database_Design.md`, `10_Security.md`.

> Note (2026-10-03) — **Invitation à un compte** : type `USER_INVITATION`, texte brut en français, adressé à la personne invitée (nom, rôle et portée du rôle, lien d'activation valable 7 jours, expiration datée). Le lien porte le jeton dans le **fragment** (`/admin/invitation#<jeton>`) : le navigateur ne l'envoie jamais au serveur ni dans un Referer. Comme le texte contient un secret, la notification est marquée `sensitive` : **dès l'envoi réussi, le texte est effacé de la base** (il ne reste que le sujet) ; tant qu'elle n'est pas partie, il est conservé pour permettre le rejeu. Un renvoi crée une nouvelle notification (nouveau jeton, nouvelle clé d'idempotence). L'échec d'envoi n'annule pas l'invitation : il est visible dans le suivi des e-mails, et l'administrateur dispose du lien pour le transmettre lui-même.

> Note (2026-10-03) — **Réglages de messagerie.** Le destinataire des messages de contact se choisit dans Paramètres > Messagerie (`SiteSettings.contactRecipientEmail`) ; vide, la variable `CONTACT_NOTIFICATION_EMAIL` s'applique. L'accusé de réception à l'expéditeur peut être coupé (`contactAutoReply`) : le message reste enregistré et l'équipe prévenue. Le port `MailProvider` expose `status()` (hôte, port, chiffrement, expéditeur, identifiant défini ou non, variables manquantes — jamais le mot de passe). Type `MAIL_TEST` : e-mail de test envoyé immédiatement (`NotificationsService.sendNow`, une tentative) au compte connecté ; un test en échec apparaît dans le suivi des e-mails comme tout échec et se rejoue de la même façon.
