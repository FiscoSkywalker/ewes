# EWES
## Personas et Besoins d'Accès
### Version 1.0 | Statut : Draft

---

# 1. Objet

Les personas ci-dessous sont des contraintes de conception, pas des profils marketing. Chaque écran, permission et message d'erreur doit être compréhensible par son utilisateur cible, dans des conditions réalistes de connexion et de langue.

# 2. Visiteur institutionnel — Grace

**Contexte :** représentante d'un bailleur de fonds ou d'un client potentiel, consulte le site depuis un mobile ou un ordinateur de bureau, peut lire en français ou en anglais, connexion parfois limitée.
**Objectifs :** comprendre rapidement le positionnement d'EWES, vérifier des réalisations concrètes, trouver un document technique, contacter la bonne personne.
**Points de friction actuels :** contenus génériques, navigation peu hiérarchisée, absence de preuve de réalisations récentes.
**Exigences de conception :** page d'accueil qui résume l'offre en quelques secondes, portfolio filtrable, fiches réalisations avec résultats concrets, formulaire de contact simple, bascule de langue visible et fiable.

# 3. Gestionnaire de contenu — Chantal (équipe EWES)

**Contexte :** membre de l'équipe EWES désigné pour publier du contenu, non technique, doit pouvoir agir seule après la formation courte prévue au contrat.
**Objectifs :** publier une réalisation ou une actualité rapidement, gérer les documents publics, sans dépendre du prestataire.
**Exigences de conception :** interface d'administration guidée, formulaires validés avec messages clairs, prévisualisation avant publication, aucune action irréversible sans confirmation.

# 4. Administrateur — David (équipe EWES ou direction)

**Contexte :** responsable de la gouvernance globale du site : rôles, droits documentaires, configuration.
**Objectifs :** garder la maîtrise des accès, auditer les actions sensibles, gérer les utilisateurs de l'espace documentaire privé.
**Exigences de conception :** tableau de bord synthétique, gestion des rôles/droits explicite, journal d'audit consultable, actions critiques (suppression, changement de droits) confirmées et tracées.

# 5. Utilisateur documentaire — collaborateur interne ou partenaire habilité

**Contexte :** accès restreint à l'espace documentaire privé, ne voit que les dossiers/fichiers qui lui sont attribués (projet, département, année).
**Objectifs :** retrouver rapidement un document, sans naviguer dans une arborescence qui ne le concerne pas.
**Exigences de conception :** vue filtrée par défaut sur son périmètre, recherche limitée à ce périmètre, aucun indice visuel sur l'existence de dossiers hors accès.

# 6. Équipe Planning Events (transmission)

**Contexte :** prestataire en charge de la mise en production et de la formation courte de l'équipe EWES à l'administration du site (livrable 05).
**Objectifs :** documenter le fonctionnement, transmettre les accès, s'assurer que l'équipe EWES est autonome à la fin de la prestation.
**Exigences de conception :** documentation d'administration claire (voir `14_Admin_Backoffice.md`), pas de dépendance technique cachée non documentée.

# 7. Accessibilité et localisation

Les deux langues supportées sont le français (par défaut) et l'anglais. Les libellés doivent rester compréhensibles sans jargon technique, les dates et unités localisées, et le contraste suffisant pour une lecture confortable sur mobile. Tout texte de production doit être centralisable pour permettre la maintenance des deux langues sans dupliquer le code.

# 8. Références

`04_User_Flows.md`, `05_UI_UX_System.md`, `10_Security.md`, `14_Admin_Backoffice.md`.
