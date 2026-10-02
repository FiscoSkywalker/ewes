# EWES
## Déploiement et Exploitation
### Version 1.0 | Statut : Draft

---

# 1. Environnements

Local (développement) et production sont isolés, avec bases de données, secrets et configuration distincts. Compte tenu du budget d'hébergement (120 USD/an pour un an d'exploitation), un environnement de préproduction dédié n'est pas budgété par défaut ; la recette (Article 9 du contrat) s'effectue sur un déploiement de production non encore ouvert publiquement (fenêtre de validation avant bascule DNS/annonce), ou sur un sous-domaine de préproduction si l'hébergement retenu le permet sans coût additionnel. `.env.example` documente les noms de variables uniquement ; aucun secret réel n'entre dans le dépôt Git.

# 2. Topologie de production

VPS Ubuntu, Docker Compose avec : reverse proxy Nginx (TLS obligatoire), application Next.js, API NestJS, PostgreSQL, volume disque dédié aux fichiers de l'espace documentaire privé (non exposé directement par Nginx). Derrière Nginx, l'API doit déclarer `TRUST_PROXY_HOPS=1` : sans cela, tous les visiteurs apparaissent avec l'adresse du proxy, partagent la même limite de fréquence (contact, connexion) et le journal d'audit enregistre l'adresse du proxy. Nginx doit transmettre `X-Forwarded-For`. Le volume `PRIVATE_STORAGE_PATH` (documents privés) doit être persistant, hors de toute racine servie par Nginx et inclus dans les sauvegardes chiffrées au même titre que la base. Un second volume (`PUBLIC_MEDIA_PATH`) conserve les images publiques téléversées : il doit être persistant et inclus dans les sauvegardes ; le site les expose via la réécriture `/uploads/*` vers l'API, jamais par un accès direct au disque. PostgreSQL n'est jamais exposé sur une interface publique. Le certificat HTTPS est fourni par le service d'hébergement retenu ou via Let's Encrypt/Certbot si l'hébergement ne l'inclut pas nativement.

# 3. Pipeline de livraison

Sur chaque changement : formatage, lint, vérification de types, tests pertinents, build. À la mise en production : sauvegarde de la base de données avant migration, exécution de la migration Prisma revue, déploiement des images, vérification de santé (health check), surveillance post-déploiement. Un rollback restaure l'image applicative précédente ; toute migration non réversible nécessite un plan de restauration testé au préalable.

# 4. Observabilité

Logs structurés (horodatage, niveau, identifiant de corrélation, contexte sans donnée sensible). Suivi minimal : disponibilité HTTP, erreurs 5xx, échecs d'envoi d'e-mail, échecs de sauvegarde. Compte tenu du volume attendu, pas d'outil d'observabilité externe payant en V1 ; les logs Docker/Nginx et un contrôle de santé applicatif suffisent au périmètre initial.

# 5. Résilience

Sauvegarde quotidienne chiffrée de la base de données et des fichiers de l'espace documentaire privé, avec rétention à définir avec EWES. Test de restauration à effectuer avant la mise en production officielle et à répéter périodiquement. Accès serveur en moindre privilège (SSH par clé, pas de mot de passe).

# 6. Runbook d'incident (minimal)

**Compte compromis :** révoquer les sessions/jetons de l'utilisateur, forcer la réinitialisation du mot de passe, vérifier l'audit des actions récentes de ce compte.
**Fuite suspectée d'un document privé :** identifier le document et les droits en vigueur via l'audit, révoquer les accès superflus, informer l'Administrateur désigné côté EWES.
**Panne d'hébergement :** basculer sur la dernière sauvegarde valide, vérifier l'intégrité de la base et des fichiers restaurés avant réouverture.

# 7. Références

`10_Security.md`, `17_Testing_Strategy.md`, `20_Project_Roadmap.md`.
