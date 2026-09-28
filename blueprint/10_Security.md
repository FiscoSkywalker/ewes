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
