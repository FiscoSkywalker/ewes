# EWES
## Vision Produit et Portée Commerciale
### Version 1.0 | Statut : Draft

---

# 1. Objet

Ce document traduit le blueprint en direction produit mesurable : pourquoi la plateforme existe, à qui elle s'adresse, ce que la version initiale (620 USD) livre, et à quoi se mesure sa réussite.

# 2. Positionnement produit

EWES est une société d'ingénierie intervenant dans l'environnement, l'eau et les travaux. Le site est son principal actif de crédibilité auprès de partenaires, bailleurs de fonds et clients potentiels. La plateforme n'est pas une vitrine statique : c'est un système de publication et d'archivage que l'équipe EWES pilote elle-même une fois la prestation transmise.

# 3. Énoncé de vision

Permettre à tout visiteur (partenaire, bailleur, client) de comprendre en quelques secondes ce que fait EWES, de consulter ses réalisations et publications, et de contacter l'équipe — pendant que l'équipe EWES gère en interne un espace documentaire sécurisé, classé et retrouvable, sans dépendre d'un prestataire technique au quotidien.

# 4. Principes produit

1. **Crédibilité avant décoration.** Chaque page publique doit démontrer une expertise réelle (réalisations, chiffres, publications), pas seulement une esthétique.
2. **Publication sans friction technique.** Un gestionnaire de contenu doit pouvoir créer/modifier une réalisation ou une actualité en moins de temps qu'il n'en faut pour rédiger un e-mail.
3. **Confidentialité par défaut.** Un document privé n'est jamais accessible sans droit explicite ; l'ambiguïté sur les accès est traitée comme un défaut, pas une nuance.
4. **Résilience budgétaire.** Le socle technique doit fonctionner de façon fiable sur un hébergement modeste (120 USD/an), sans dépendance cachée à un service tiers non budgété.
5. **Cœur commercial extensible.** L'espace documentaire, le module Réalisations et les notifications sont conçus comme des briques indépendantes pour absorber les évolutions listées à l'Article 14 du contrat (statistiques, espace partenaires, chatbot IA, etc.) sans réécriture du socle.

# 5. Portée de la version commerciale initiale (620 USD)

| Domaine | Capacité incluse |
|---|---|
| Site public | Accueil, À propos, Nos services, Nos réalisations, Actualités & publications, Documents publics, Contact — bilingue FR/EN |
| Réalisations | Création, modification, publication/dépublication, classement (domaine, année, localisation, type) |
| Actualités & publications | Articles, événements, formations, communiqués, documents téléchargeables |
| Espace documentaire privé | Dossiers/fichiers classés (catégorie, sous-catégorie, projet, année, département, confidentialité), recherche, droits d'accès |
| Administration | Gestion éditoriale, documentaire, contacts, tableau de bord, rôles Administrateur/Gestionnaire/Utilisateur |
| Fondations techniques | SEO, performance, HTTPS, sauvegardes, journalisation |

# 6. Frontières explicites

La version initiale sert une seule organisation (EWES), un seul site, sans multi-tenant. La rédaction éditoriale des textes, les tournages vidéo/photo professionnels et la numérisation massive d'archives papier sont hors périmètre (contenus fournis par EWES). Le chatbot IA (RAG) est une perspective d'évolution distincte, non budgétée en V1 (voir `20_Project_Roadmap.md` section évolutions). L'architecture doit permettre son ajout ultérieur sans exposer de complexité inutile dans la V1.

# 7. Métriques de succès

| Objectif | Cible initiale |
|---|---|
| Lisibilité de l'offre | Un visiteur identifie les 3 pôles d'expertise (Environnement, Eau, Travaux) dès la page d'Accueil |
| Autonomie éditoriale | Un Gestionnaire publie une réalisation sans support technique |
| Fiabilité documentaire | Aucun document privé accessible sans droit explicite vérifié côté serveur |
| Performance | Pages publiques utilisables avant complétion de l'hydratation JS |
| Bilinguisme | Bascule FR/EN fonctionnelle sur 100% des pages publiques sans perte de contexte |
| Mise en production | Recette validée, accès transmis, formation courte effectuée |

# 8. Dépendances et hypothèses

Le nom de domaine est supposé déjà disponible et le SSL inclus dans l'offre d'hébergement retenue (hypothèse contractuelle, Article 7/11). Les contenus (textes, visuels, documents) sont fournis et validés par EWES selon le calendrier ; tout retard de fourniture impacte le planning (`20_Project_Roadmap.md`). Le fournisseur d'hébergement et le service d'e-mail transactionnel (SMTP) restent à confirmer par EWES avant l'étape 04 (Administration & sécurité).

# 9. Évolutions envisagées (hors V1, ordre indicatif)

Statistiques avancées, espace partenaires, formulaires spécialisés, espace candidat, gestion des appels d'offres, bibliothèque scientifique, notifications enrichies, validation documentaire, Chatbot IA (RAG) — voir Article 14 du contrat et section 16 de l'Annexe 1 pour le modèle économique prospectif du chatbot.

# 10. Références

`00_Project_Blueprint.md`, `02_Functional_Requirements.md`, `09_Business_Rules.md`, `20_Project_Roadmap.md`.
