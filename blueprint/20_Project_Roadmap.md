# EWES
## Feuille de Route
### Version 1.0 | Statut : Draft

---

# 1. Principe de livraison

Chaque étape se termine par une tranche verticale démontrable, alignée sur le planning contractuel (3 à 4 semaines à compter de la signature/premier acompte — Article 4 du contrat). Ne pas démarrer une intégration dépendant d'un tiers non confirmé (fournisseur SMTP, hébergement définitif) avant validation de cette dépendance par EWES.

# 2. Plan de réalisation (aligné sur l'Annexe 1, section 13)

| Étape | Contenu | Sortie attendue |
|---|---|---|
| 01 — Cadrage & design | Arborescence, contenus fournis par EWES, direction graphique, maquettes, schéma de données validé | Maquettes validées, `07_Database_Design.md` finalisé, environnements initialisés |
| 02 — Développement du site | Pages publiques (Accueil, À propos, Nos services), rendu SSR/SSG, bilinguisme, design system | Site public navigable avec contenu réel ou de test |
| 03 — Réalisations & archivage | Module Réalisations/Projets, espace documentaire privé (dossiers, fichiers, droits), recherche | Portfolio et espace documentaire fonctionnels |
| 04 — Administration & sécurité | Portail d'administration, rôles, RBAC, sauvegardes, contrôle des accès, notifications | Portail complet, sécurité en place |
| 05 — Tests & mise en production | Recette (Article 9), corrections, déploiement, documentation, formation courte, remise des accès | Site en production, équipe EWES formée |

# 3. Jalons de paiement (Article 8 du contrat — rappel, non fonctionnel)

30% à la signature (démarrage/cadrage) — 40% à la validation de la version fonctionnelle privée (fin approximative de l'étape 03/début 04) — 30% à la mise en production. La "version fonctionnelle privée" doit donc être démontrable avant de considérer l'étape 04 terminée : c'est un jalon de validation client, pas seulement une étape technique.

# 4. Définition de terminé (Definition of Done)

Exigences fonctionnelles acceptées ; effets sur rôles/droits/erreurs implémentés ; lint/types/tests pertinents passent ; blueprint mis à jour si une décision a évolué ; implications de sécurité revues pour toute nouvelle route touchant l'espace documentaire privé ; comportement démontré en local et, à partir de l'étape 05, sur l'environnement de production.

# 5. Évolutions post-mise en production (hors périmètre initial, ordre indicatif)

Statistiques avancées, espace partenaires, formulaires spécialisés, espace candidat, gestion des appels d'offres, bibliothèque scientifique, notifications enrichies, validation documentaire, puis **Chatbot IA (RAG)** — développement/intégration estimé à 350 USD (unique) + 5 à 15 USD/mois de consommation API LLM à la charge d'EWES (Article 10 du contrat, section 16 de l'Annexe 1). Chaque évolution fait l'objet d'un accord ou devis distinct et d'une mise à jour du blueprint avant implémentation.

# 6. Portes de mise en production

Aucune vulnérabilité critique ouverte ; restauration de sauvegarde testée ; séparation public/privé vérifiée manuellement ; formation courte de l'équipe EWES effectuée ; documentation d'administration remise ; validation client (recette, Article 9) obtenue par écrit.

# 7. Références

`00_Project_Blueprint.md`, `01_Product_Vision.md`, `18_Deployment.md`, `21_Backlog_and_Session_Handoff.md`, `raw/01-contrat-prestation-ewes.md`, `raw/02-annexe-1-proposition-technique-financiere-ewes.md`.
