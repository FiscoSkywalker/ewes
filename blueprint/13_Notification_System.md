# EWES
## Système de Notifications
### Version 1.0 | Statut : Draft

---

# 1. Canal

E-mail transactionnel uniquement en V1 (SMTP, fournisseur à confirmer par EWES avant l'étape 04 du planning). Pas de push mobile (pas d'application mobile), pas de SMS. Un centre de notifications in-app côté portail d'administration peut être ajouté ultérieurement (voir `20_Project_Roadmap.md`) sans faire partie du périmètre initial.

# 2. Catalogue d'événements

Nouveau message de contact (notification interne à l'équipe EWES désignée), accusé de réception automatique à l'expéditeur du formulaire de contact, attribution/révocation d'un droit d'accès documentaire (notification à l'Utilisateur concerné), création de compte utilisateur avec définition du mot de passe, expiration de session pour action sensible.

# 3. Traitement

Un événement métier committé (ex. message de contact enregistré) déclenche l'envoi via `MailProvider`. Compte tenu du faible volume attendu (site institutionnel, pas de trafic transactionnel de masse), l'envoi est traité directement par NestJS avec une logique de retry simple (3 tentatives, backoff court) plutôt qu'une file de messages dédiée — décision cohérente avec la contrainte de budget d'hébergement (voir `06_Application_Architecture.md` section 5).

# 4. Confidentialité

Les e-mails transactionnels ne contiennent jamais le contenu d'un document privé, uniquement une référence et un lien vers une ressource authentifiée. Les adresses de contact de tiers ne sont jamais exposées dans un e-mail groupé.

# 5. Critères d'acceptation

Un événement dupliqué (ex. double soumission du formulaire de contact) ne produit pas de notification en double (idempotence). Un échec d'envoi après épuisement des tentatives est journalisé et visible par l'Administrateur (pas d'échec silencieux). Un utilisateur peut toujours retrouver l'information notifiée directement depuis le portail (l'e-mail n'est jamais l'unique source de vérité).

# 6. Références

`04_User_Flows.md`, `07_Database_Design.md`, `10_Security.md`.
