# EWES
## Stratégie de Test
### Version 1.0 | Statut : Draft

---

# 1. Objectif qualité

Prouver les chemins critiques — authentification, RBAC, séparation public/privé, publication de contenu, accès documentaire — avant mise en production, pas seulement le rendu visuel des pages.

# 2. Pyramide de test (adaptée au budget et au calendrier de 3-4 semaines)

| Niveau | Portée |
|---|---|
| Unitaire | Règles métier NestJS (services, validateurs), utilitaires de formatage FR/EN |
| Intégration | Services/repositories NestJS avec base PostgreSQL isolée de test ; adaptateurs mail/stockage mockés |
| Contrat d'API | Validation des DTO, autorisation par rôle, forme des réponses/erreurs |
| UI | Tests de composants React pour les formulaires critiques (contact, publication, gestion des droits) |
| Bout en bout (ciblé) | Parcours visiteur → contact, parcours Gestionnaire → publication, parcours Utilisateur → accès document, tentative d'accès non autorisé |

Le volume de test reste proportionné au périmètre du contrat (620 USD, 3-4 semaines) : priorité absolue aux cas listés en section 3, pas de couverture exhaustive de chaque écran.

# 3. Cas de régression obligatoires

Accès à un document privé sans droit (doit échouer, 403 explicite) ; accès à un contenu `DRAFT`/`ARCHIVED` par URL directe côté public (doit échouer) ; double soumission du formulaire de contact (pas de doublon de notification) ; rotation de jeton de rafraîchissement ; changement de rôle appliqué immédiatement (pas de droit résiduel après révocation) ; absence de traduction EN (repli FR sans erreur) ; publication sans champ obligatoire (bloquée avec message clair).

# 4. Données et environnements de test

Jeux de données déterministes (factories), base de test isolée de la base de production, jamais de données personnelles réelles ni de secrets de production dans les tests. Les tests de contrat s'exécutent contre le schéma OpenAPI généré ; le fournisseur d'e-mail est simulé (stub).

# 5. Portes de qualité

Toute pull request nécessite : formatage/lint, vérification de types, tests pertinents à la zone modifiée, revue de migration Prisma le cas échéant. La mise en production nécessite : exécution des cas de régression obligatoires (section 3), vérification manuelle rapide de la séparation public/privé, vérification du plan de restauration de sauvegarde.

# 6. Références

`08_API_Specification.md`, `09_Business_Rules.md`, `10_Security.md`, `18_Deployment.md`.
