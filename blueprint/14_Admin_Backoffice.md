# EWES
## Portail d'Administration
### Version 1.0 | Statut : Draft

---

# 1. Objectif

Le portail d'administration est le plan de contrôle opérationnel : il permet à l'équipe EWES de gérer la plateforme de façon autonome après la transmission, sans intervention technique permanente du prestataire.

# 2. Zones du portail

Tableau de bord (synthèse) ; contenu éditorial (pages, services, experts, médias, catégories) ; réalisations/projets ; actualités & publications ; documents publics ; espace documentaire privé (dossiers, fichiers, droits) ; messages de contact ; utilisateurs & rôles ; journal d'audit ; paramètres.

# 3. Matrice de permissions

| Rôle | Accès |
|---|---|
| `ADMINISTRATEUR` | Accès complet, y compris rôles, droits documentaires et configuration |
| `GESTIONNAIRE` | Contenu éditorial, réalisations, actualités, documents publics, classement documentaire dans son périmètre autorisé — pas de gestion des rôles ni des droits documentaires d'autrui |
| `UTILISATEUR` | Pas d'accès au portail d'administration ; accès en lecture à l'espace documentaire privé uniquement, selon droits attribués |

# 4. Actions critiques

Suppression de contenu, révocation de droit documentaire, changement de rôle, suppression d'utilisateur : chacune exige une confirmation explicite et produit une entrée d'audit avec valeur avant/après. Aucune de ces actions n'est réversible par simple annulation de formulaire.

# 5. UX opérationnelle

Le tableau de bord affiche par défaut les éléments nécessitant une action (brouillons en attente, nouveaux messages de contact non traités). Les listes de contenu supportent le filtrage par statut et le tri par date. La vue détail d'un contenu affiche son historique de publication (audit lié).

# 6. Documentation et transmission

Le portail doit être utilisable après la courte formation prévue au contrat (livrable 05), sans support technique permanent. Une documentation d'administration (guide utilisateur des zones ci-dessus) accompagne la mise en production — voir `20_Project_Roadmap.md` étape 05.

# 7. Références

`02_Functional_Requirements.md`, `09_Business_Rules.md`, `10_Security.md`, `11_Document_Management_System.md`.
