# Crédits des ressources visuelles

## Globe terrestre

- `earth-day.jpg`, `earth-normal.jpg`, `earth-specular.jpg` et `earth-clouds.png`
- Source de distribution : exemples officiels de Three.js (`mrdoob/three.js`)
- Imagerie d’origine : NASA Visible Earth / Blue Marble
- Usage : texture, relief, masque spéculaire et couche nuageuse du globe EWES
- Référence : https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/

## Eau

- `water-normals.jpg`
- Source : exemples officiels de Three.js (`mrdoob/three.js`)
- Usage : micro-détails de normales de la surface d’eau

La simulation de surface s’inspire de l’approche heightfield GPU et des principes
optiques du projet MIT `jeantimex/threejs-water`, port Three.js de l’expérience
originale d’Evan Wallace :

- https://github.com/jeantimex/threejs-water
- https://madebyevan.com/webgl-water/

L’implémentation du site est une adaptation indépendante écrite pour
React Three Fiber ; aucun fichier source du projet de référence n’est embarqué.

## Photographies d’EWES (ancien site ewes.cd)

Photographies réelles fournies par EWES (archive des médias de l’ancien site,
octobre 2026). Les originaux ne dépassent pas 500 px de large : ils sont
agrandis ×2 (Lanczos + accentuation légère) pour limiter le flou. À remplacer
par les fichiers haute définition dès qu’EWES les fournit (mêmes noms).

| Fichier                                                               | Original                                                              | Emplacement                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| `images/ewes-photo-site-minier.jpg` (+ `-mobile`, recadrage vertical) | `2020/01/Management-de-lEnvironnement-et-Audit-Environnemental-1.jpg` | Hero de l’Accueil, écran de connexion du portail |
| `images/ewes-photo-equipe-terrain.jpg`                                | `2021/12/apd.jpg`                                                     | « À propos » de l’Accueil, en-tête de /a-propos  |
| `images/ewes-photo-environnement.jpg`                                 | `2021/12/ess.jpg`                                                     | Section Environnement de l’Accueil               |
| `images/ewes-photo-prelevement-roche.jpg`                             | `2021/12/8.jpg`                                                       | Pôle Environnement (visuel par défaut)           |
| `images/ewes-photo-eau-jaugeage.jpg`                                  | `2021/12/IMG-20210906-WA0084.jpg`                                     | Pôle Eau (visuel par défaut)                     |
| `images/ewes-photo-station-traitement.jpg`                            | `2021/12/ariaewes17.jpg`                                              | Pôle Travaux d’ingénierie (visuel par défaut)    |
| `images/ewes-photo-formation.jpg`                                     | `2021/12/GIZ18.jpg`                                                   | Section Formation (Accueil, /services)           |
| `images/ewes-photo-enquete-communautaire.jpg`                         | `2021/12/3.jpg`                                                       | Actualité « Baromètre RSE 2025 »                 |
| `images/ewes-photo-conference.jpg`                                    | `2021/12/jsf.jpg`                                                     | Actualité « Metalkol 2024 »                      |
| `images/ewes-photo-vulgarisation-code-minier.jpg`                     | `2021/12/GIZ17.jpg`                                                   | Actualité « Inspecteurs 2023 »                   |
| `images/ewes-photo-carriere.jpg`                                      | `2021/12/9.jpg`                                                       | Visuel de repli des actualités                   |

Les portraits nominatifs de l’archive (`2021/11/*.jpg`) ne sont pas utilisés :
ils seront rattachés aux fiches d’experts depuis le portail, avec les fonctions
réelles des personnes.

## Logos des clients et partenaires (`partners/`)

Logos repris de l’ancien site ewes.cd (`2021/12/`), 150 × 150 px, bande
« Ils nous ont fait confiance » de l’Accueil (`src/data/clients.ts`). Le logo
de Kamoto Copper Company (`KCC.png`) et le doublon de l’Université de Kinshasa
ne sont pas repris (KCC figure déjà avec son logo actuel).

## Visuels repris du prototype « storytelling » (`prototype/`)

- `images/ewes-texture-malachite.jpg` (texture de fond de la section Formation)
- `brand/ewes-logo-light.png` (logo officiel, lettres claires pour fonds sombres)
