# EWES
## Parcours Utilisateurs
### Version 1.0 | Statut : Draft

---

# 1. Parcours visiteur — découverte à contact

1. Le visiteur arrive sur l'Accueil (SSG/ISR) et identifie les trois pôles d'expertise et les réalisations mises en avant.
2. Il explore Nos services ou Nos réalisations, filtre par domaine/année/localisation.
3. Il ouvre une fiche réalisation publiée, consulte la galerie et les documents associés.
4. Il consulte Actualités & publications, télécharge un document public si besoin.
5. Il utilise le formulaire Contact ; le message est validé côté serveur et déclenche une notification interne.
6. Il peut basculer FR/EN à tout moment sans perdre le contexte de navigation (même page, langue changée).

# 2. Parcours Gestionnaire — publication de contenu

1. Le Gestionnaire s'authentifie sur le portail d'administration (zone client-side, hors SEO).
2. Il crée ou modifie une réalisation/actualité : titre, catégorie, contenu FR/EN, médias, documents associés.
3. Il prévisualise avant publication ; le contenu reste en brouillon tant qu'il n'est pas explicitement publié.
4. Il publie ; le contenu apparaît immédiatement sur le site public (ISR revalidé ou requête serveur selon la page).
5. Une action de publication crée une entrée d'audit (acteur, horodatage, action).

# 3. Parcours Administrateur — gestion documentaire et droits

1. L'Administrateur crée un dossier dans l'espace documentaire privé (catégorie, sous-catégorie, projet, année, département, niveau de confidentialité).
2. Il téléverse des fichiers ; chaque fichier hérite ou surcharge la confidentialité du dossier.
3. Il attribue l'accès à un ou plusieurs Utilisateurs/Gestionnaires selon le périmètre requis.
4. Il consulte le journal d'audit pour vérifier les accès et modifications sensibles.

# 4. Parcours Utilisateur documentaire — recherche et téléchargement

1. L'Utilisateur s'authentifie ; il ne voit que les dossiers/fichiers qui lui sont attribués.
2. Il recherche par mot-clé, catégorie ou projet dans son périmètre uniquement.
3. Il télécharge un fichier ; l'accès est vérifié côté serveur à chaque requête (pas de confiance en un lien statique persistant sans contrôle).

# 5. Parcours de bascule linguistique

Le sélecteur de langue est disponible sur toutes les pages publiques et le portail d'administration. Si une traduction EN est absente pour un contenu, l'interface affiche la version FR avec une indication explicite plutôt qu'une page vide ou une erreur.

# 6. Cas limites

Formulaire de contact soumis en double (idempotence côté serveur), session expirée pendant une édition (brouillon préservé), fichier volumineux rejeté avec message clair, tentative d'accès à un document hors périmètre (403 explicite sans révéler l'existence du fichier), traduction manquante à la publication (avertissement au Gestionnaire, pas de blocage).

# 7. Références

`02_Functional_Requirements.md`, `09_Business_Rules.md`, `11_Document_Management_System.md`, `12_Realisations_Portfolio_System.md`, `13_Notification_System.md`.
