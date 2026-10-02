# EWES
## Portail d'Administration
### Version 1.0 | Statut : Draft

---

# 1. Objectif

Le portail d'administration est le plan de contrôle opérationnel : il permet à l'équipe EWES de gérer la plateforme de façon autonome après la transmission, sans intervention technique permanente du prestataire.

# 2. Zones du portail

Tableau de bord (synthèse) ; contenu éditorial (pages, services, experts, médias, catégories) ; réalisations/projets ; actualités & publications ; documents publics ; espace documentaire privé (dossiers, fichiers, droits) ; messages de contact ; utilisateurs & rôles ; journal d'audit ; paramètres.

> **Navigation implémentée (2026-10-02)** — source unique : `apps/web/src/lib/admin/navigation.ts` (menu, fil d'Ariane, palette de commandes et garde d'affichage en dérivent). A = Administrateur, G = Gestionnaire, U = Utilisateur.
>
> | Groupe | Entrées (sous-entrées) | Rôles |
> |---|---|---|
> | Pilotage | Tableau de bord `/admin` | A, G |
> | Contenus du site | Pages institutionnelles ; Pôles & services (Pôles et prestations, Experts) ; Réalisations (Toutes, Nouvelle, Partenaires & bailleurs) ; Actualités & publications (Tous les articles, Nouvel article) ; Documents publics (Bibliothèque, Publier un document) ; Médiathèque | A, G |
> | Espace documentaire | Dossiers & fichiers ; Recherche ; Archives | A, G, U |
> | | Droits d'accès (Par dossier, Par document) | A |
> | Relation client | Messages de contact (À traiter, Traités) — pastille du nombre de messages non traités | A, G |
> | Administration | Utilisateurs & rôles (Tous les comptes, Inviter) ; Journal d'audit ; Suivi des e-mails (pastille des envois en échec) ; Paramètres (Général, Messagerie) | A |
> | Compte (menu utilisateur) | Mon profil ; Guide d'utilisation | A, G, U |
>
> L'Utilisateur arrive directement sur l'espace documentaire (pas de tableau de bord). Masquer une entrée est un **confort d'affichage** : chaque écran appelle une route NestJS protégée par ses propres guards ; une adresse ouverte sans le rôle requis affiche « Accès non autorisé » sans fil d'Ariane (rien n'est révélé de la section), et le serveur refuserait de toute façon les données. Écrans réels livrés (2026-10-02) : tableau de bord, Messages de contact (À traiter, Traités, détail, recherche et tri), Suivi des e-mails, Réalisations (tableau ou cartes, recherche, tri, filtres et effectifs par statut ; fiche : formulaire bilingue, prérequis de publication, avancement de la version anglaise, vitrine plafonnée), Actualités & publications (liste avec vignettes ; fiche : date de parution choisie ou programmée, couverture, version anglaise) et Documents publics (bibliothèque : recherche, tri, filtres et effectifs par statut, création, fiche : modification, publication/dépublication/archivage, remplacement et relecture du PDF, suppression avec saisie du slug). Les écrans non encore construits affichent un état « en préparation » listant ce qu'ils permettront (route attrape-tout `app/admin/(portal)/[...slug]`) ; un écran réel créé à son adresse le remplace automatiquement. **À valider avec EWES** : contenu de « Paramètres » (aucun paramètre éditable n'est spécifié à ce jour) et « Partenaires & bailleurs » comme écran dédié.

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

> Note (2026-10-03) — **Pages institutionnelles** (`/admin/pages`, `/admin/pages/<slug>`) et **Pôles & services** (`/admin/services`, `/admin/services/<id>`) livrés. La sous-entrée « Prestations » est supprimée : les prestations se gèrent dans leur pôle (contexte, pictogramme, aperçu). **Experts** reste « en préparation » (le site affiche encore des profils provisoires, voir `data/experts.ts`). Pages couvertes : À propos, Nos services, Nos réalisations, Actualités & publications, Documents, Contact (registre `lib/site-pages.ts`) ; **l'Accueil n'en fait pas partie** (mise en scène WebGL composée à part). Seul l'en-tête (titre, introduction, description de référencement) est piloté ; les sections riches (chiffres clés, valeurs, équipe, références) restent dans `messages/`. Une page n'existe en base qu'après un premier enregistrement (brouillon) ; tant qu'elle n'est pas publiée, le site affiche son texte d'origine.
