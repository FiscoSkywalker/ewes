# EWES
## Module Réalisations / Projets (Portfolio)
### Version 1.0 | Statut : Draft

---

# 1. Objectif

Constituer progressivement un portfolio de réalisations utile aux présentations commerciales et aux appels d'offres, administrable sans intervention technique.

# 2. Contenu d'une fiche réalisation

Titre, catégorie/domaine (Environnement, Eau, Travaux d'ingénierie), client (uniquement si publiable — voir `09_Business_Rules.md`), localisation, période, description, objectifs, résultats, galerie d'images, documents associés, partenaires, experts impliqués. Chaque champ texte porte une version FR et une version EN.

# 3. Cycle de vie

`DRAFT` → `PUBLISHED` → `ARCHIVED` (dépublié mais conservé en base pour historique interne). Une fiche `DRAFT` ou `ARCHIVED` n'est jamais accessible par URL publique directe. La publication exige au minimum : titre FR, catégorie, période, une image de couverture.

> **Note du 2026-10-02 (écart assumé, à valider avec EWES)** : l'implémentation exige à la publication le titre FR, l'année et le type de mission ; la catégorie/domaine (`serviceId`), la localisation et l'image de couverture sont **facultatives** pour l'instant, car les 34 références du profil EWES n'ont ni localisation ni image, et les catégories de mission ne se rattachent pas proprement aux trois pôles. Rétablir ces exigences quand les fiches détaillées et le module `media` existeront. Le client n'est exposé publiquement que si `isClientPublic` est vrai.

# 4. Classement et filtrage public

Le portfolio public se filtre par domaine, année, localisation et type de projet. Ces quatre champs sont donc obligatoires à la publication pour garantir un filtrage cohérent — une fiche qui ne les porte pas reste bloquée en `DRAFT`.

# 5. Gestion depuis l'administration

Un Gestionnaire crée/modifie/publie/dépublie une fiche. L'ordre d'affichage par défaut est la date de publication décroissante ; une mise en avant manuelle (fiches "vitrine" sur l'Accueil) est possible via un indicateur dédié, limité à un nombre restreint de fiches simultanées pour préserver la lisibilité de la page d'Accueil.

# 6. Rendu

Liste de réalisations et fiche détail sont rendues en SSG/ISR (contenu qui change peu à modérément) — voir `16_Rendering_State_Strategy.md`. Le filtrage côté client (par domaine/année/localisation/type) est un composant client isolé, sans transformer la page liste en client component global.

# 7. Références

`04_User_Flows.md`, `07_Database_Design.md`, `09_Business_Rules.md`, `15_Public_Site_Pages.md`, `16_Rendering_State_Strategy.md`.

> Note (2026-10-02) — **galerie d'images livrée** : `PUT /admin/realisations/:id/images` (voir `08`), écran « Images » de la fiche (`GalleryCard`) et image principale sur la liste d'administration et sur le site public (`Project.image`/`imageAlt`, repli sur la couverture générée).

> Note (2026-10-02) — **partenaires et documents associés livrés** : `PUT /admin/realisations/:id/partners` et `/documents` (voir `08`), panneaux « Partenaires & bailleurs » (saisie assistée par les noms déjà employés) et « Documents associés » (sélecteur de la bibliothèque des documents publics) sur la fiche, et écran **Partenaires & bailleurs** (`/admin/realisations/partenaires`) : chaque organisation une fois, réalisations qui la citent, renommer / unifier les graphies / retirer partout (audités). Règle de publication : un document associé n'est visible publiquement que s'il est lui-même publié (date atteinte) ; il reste listé en administration avec son statut. Les noms de partenaires sont publics (affichés sur la fiche publique, à venir). Prochaine étape : la fiche publique d'une réalisation.

> Note (2026-10-02) — **fiche publique livrée** (voir `15`) : la publication est désormais visible par une URL stable `/realisations/{slug}` ; la fiche de lecture modale y renvoie.
