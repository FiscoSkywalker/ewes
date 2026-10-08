# EWES
## Déploiement et Exploitation
### Version 1.0 | Statut : Draft

---

# 1. Environnements

Local (développement) et production sont isolés, avec bases de données, secrets et configuration distincts. Compte tenu du budget d'hébergement (120 USD/an pour un an d'exploitation), un environnement de préproduction dédié n'est pas budgété par défaut ; la recette (Article 9 du contrat) s'effectue sur un déploiement de production non encore ouvert publiquement (fenêtre de validation avant bascule DNS/annonce), ou sur un sous-domaine de préproduction si l'hébergement retenu le permet sans coût additionnel. `.env.example` documente les noms de variables uniquement ; aucun secret réel n'entre dans le dépôt Git.

# 2. Topologie de production

VPS Ubuntu, Docker Compose avec : reverse proxy Nginx (TLS obligatoire), application Next.js, API NestJS, PostgreSQL, volume disque dédié aux fichiers de l'espace documentaire privé (non exposé directement par Nginx). Derrière Nginx, l'API doit déclarer `TRUST_PROXY_HOPS=1` : sans cela, tous les visiteurs apparaissent avec l'adresse du proxy, partagent la même limite de fréquence (contact, connexion) et le journal d'audit enregistre l'adresse du proxy. Nginx doit transmettre `X-Forwarded-For` (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, à l'API comme au serveur Next) : le portail (routes BFF `app/api/*` de Next) en reprend la **dernière** adresse — celle qu'a ajoutée Nginx, les précédentes étant falsifiables par le client — et la transmet à l'API avec le user-agent du navigateur (`apps/web/src/lib/api/client-context.ts`), de sorte que limitation de fréquence et audit voient le vrai client et non le serveur Next. L'API ne doit donc être joignable que par Nginx et Next (aucun port publié), puisque `TRUST_PROXY_HOPS=1` lui fait croire cet en-tête. Le volume `PRIVATE_STORAGE_PATH` (documents privés) doit être persistant, hors de toute racine servie par Nginx et inclus dans les sauvegardes chiffrées au même titre que la base. Un second volume (`PUBLIC_MEDIA_PATH`) conserve les images publiques téléversées : il doit être persistant et inclus dans les sauvegardes ; le site les expose via la réécriture `/uploads/*` vers l'API, jamais par un accès direct au disque. PostgreSQL n'est jamais exposé sur une interface publique. Le certificat HTTPS est fourni par le service d'hébergement retenu ou via Let's Encrypt/Certbot si l'hébergement ne l'inclut pas nativement.

L'API doit pouvoir joindre le site Next (`WEB_REVALIDATE_URL`, adresse interne, jamais publiée) : outre la revalidation à chaque publication, elle sert à la **parution programmée** — un minuteur interne (`PUBLICATION_WATCH_INTERVAL_SECONDS`, 60 s par défaut) revalide le cache du site à l'instant où la date d'un contenu est atteinte (voir `16_Rendering_State_Strategy.md` §2). Une seule instance de l'API est prévue (en lancer plusieurs ne casserait rien : revalider deux fois est inoffensif) ; si l'API est arrêtée à cet instant, le rattrapage se fait au redémarrage (jusqu'à 65 min en arrière).

Le site Next doit connaître son adresse publique : `NEXT_PUBLIC_SITE_URL` (HTTPS définitif, sans barre finale) alimente les adresses canoniques, les `hreflang`, `sitemap.xml` et `robots.txt` (voir `15_Public_Site_Pages.md` §4). Variable lue **à la construction** de l'image (préfixe `NEXT_PUBLIC_`) : la fixer avant le build de production, sans quoi le sitemap annoncerait `http://localhost:3000`. Après la mise en ligne, déclarer le sitemap dans la Google Search Console.

# 3. Pipeline de livraison

Sur chaque changement : formatage, lint, vérification de types, tests pertinents, build. À la mise en production : sauvegarde de la base de données avant migration, exécution de la migration Prisma revue, déploiement des images, vérification de santé (health check), surveillance post-déploiement. Un rollback restaure l'image applicative précédente ; toute migration non réversible nécessite un plan de restauration testé au préalable.

# 4. Observabilité

Logs structurés (horodatage, niveau, identifiant de corrélation, contexte sans donnée sensible). Suivi minimal : disponibilité HTTP, erreurs 5xx, échecs d'envoi d'e-mail, échecs de sauvegarde. Compte tenu du volume attendu, pas d'outil d'observabilité externe payant en V1 ; les logs Docker/Nginx et un contrôle de santé applicatif suffisent au périmètre initial.

# 5. Résilience

Sauvegarde quotidienne chiffrée de la base de données et des fichiers de l'espace documentaire privé, avec rétention à définir avec EWES. Test de restauration à effectuer avant la mise en production officielle et à répéter périodiquement. Accès serveur en moindre privilège (SSH par clé, pas de mot de passe).

> Note (2026-10-08) — **Conservation.** L'API archive le journal d'audit de plus de 12 mois et supprime les messages de contact de plus de 24 mois (`RETENTION_SWEEP_INTERVAL_HOURS`, 24 h par défaut, `0` désactive ; une seule instance de l'API est prévue, en lancer plusieurs ne casserait rien). Les sauvegardes doivent couvrir **`audit_logs_archive`** : l'archive est la seule copie des entrées anciennes, qu'elle garde 5 ans après les faits avant de les supprimer. Une suppression de message de contact est définitive : elle l'est aussi pour les anciennes sauvegardes tant qu'elles sont conservées, à prendre en compte dans leur rétention.

# 6. Runbook d'incident (minimal)

**Compte compromis :** révoquer les sessions/jetons de l'utilisateur, forcer la réinitialisation du mot de passe, vérifier l'audit des actions récentes de ce compte.
**Fuite suspectée d'un document privé :** identifier le document et les droits en vigueur via l'audit, révoquer les accès superflus, informer l'Administrateur désigné côté EWES.
**Panne d'hébergement :** basculer sur la dernière sauvegarde valide, vérifier l'intégrité de la base et des fichiers restaurés avant réouverture.

# 7. Références

`10_Security.md`, `17_Testing_Strategy.md`, `20_Project_Roadmap.md`.

> Note (2026-10-02) — **sharp** (vignettes des images, `apps/api`) : bibliothèque native livrée avec ses binaires précompilés (Linux glibc et musl, Windows, macOS) ; l'image Docker de l'API doit installer les dépendances **dans l'image** (`npm ci` sur la plateforme cible, jamais copier un `node_modules` d'une autre machine). Les vignettes vivent dans `PUBLIC_MEDIA_PATH/thumbs/` : elles se refabriquent seules à la première demande, donc **inutiles à sauvegarder** (le volume des images, lui, l'est).
