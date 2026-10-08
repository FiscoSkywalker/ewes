# EWES
## Règles Métier
### Version 1.0 | Statut : Draft

---

# 1. Publication de contenu

Un contenu (Page, Réalisation, Article, Document public) existe en `DRAFT` par défaut. Seule une action explicite de publication le fait passer en `PUBLISHED`, avec horodatage. La dépublication (`ARCHIVED` ou retour `DRAFT`) retire immédiatement le contenu du site public, y compris de tout cache ISR (revalidation déclenchée par la mutation). Un contenu publié conserve son identifiant/slug lors des modifications ultérieures, pour ne jamais casser un lien déjà partagé ou indexé.

# 2. Bilinguisme

Chaque contenu éditorial porte des champs FR et EN. Le FR est la langue par défaut : un champ EN manquant ne bloque jamais l'affichage, mais est signalé au Gestionnaire dans l'interface d'administration. La publication est autorisée avec une traduction EN incomplète (pragmatisme éditorial), mais l'absence de FR (langue de référence) bloque la publication.

# 3. Réalisations et portfolio

Une réalisation appartient à un domaine (Service) et peut lister des documents/partenaires associés. Le classement (année, localisation, type de projet) est obligatoire à la publication pour garantir le filtrage du portfolio. Un client n'est mentionné nommément que si son caractère publiable a été explicitement validé par EWES lors de la saisie.

# 4. Espace documentaire privé et confidentialité

Un dossier définit un niveau de confidentialité hérité par ses fichiers, sauf surcharge explicite au niveau du fichier. Seul un Administrateur peut créer un dossier de premier niveau ou modifier les droits d'accès. Un Gestionnaire peut classer des fichiers dans les dossiers pour lesquels il a lui-même un droit d'écriture. Un accès attribué à un Utilisateur est toujours scellé à un périmètre explicite (dossier(s) ou fichier(s) précis) — jamais un accès implicite par déduction de rôle.

# 5. Rôles et gouvernance

`ADMINISTRATEUR` : accès complet, seul rôle habilité à gérer les rôles et les droits documentaires. `GESTIONNAIRE` : création/modification/classement/publication des contenus et documents qui lui sont autorisés. `UTILISATEUR` : accès en lecture/téléchargement limité aux dossiers et documents qui lui sont explicitement attribués. Un changement de rôle ou de droit est toujours tracé dans l'audit avec l'acteur, la date et la valeur avant/après.

# 6. Contact

Un message de contact valide déclenche une notification interne et un accusé de réception automatique à l'expéditeur. Un message ne peut pas être modifié après soumission ; seul son statut de suivi (nouveau/traité) est modifiable par l'équipe EWES.

# 7. Audit

Toute action de publication/dépublication, changement de droit documentaire, changement de rôle et suppression de contenu ou de document produit une entrée d'audit non modifiable. L'audit est consultable par l'Administrateur uniquement. Les entrées de plus de 12 mois sont déplacées automatiquement dans une archive, elle aussi inaltérable et consultable par l'Administrateur (`07` §6) ; elles y restent jusqu'à 5 ans après les faits, puis sont supprimées (durée annoncée dans la politique de confidentialité). Les messages de contact sont supprimés 24 mois après leur dernière mise à jour.

# 8. Références

`02_Functional_Requirements.md`, `07_Database_Design.md`, `10_Security.md`, `11_Document_Management_System.md`, `12_Realisations_Portfolio_System.md`.
