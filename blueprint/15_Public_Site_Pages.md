# EWES
## Spécification des Pages Publiques
### Version 1.0 | Statut : Draft

---

# 1. Objet

Ce document détaille le contenu attendu et les exigences de rendu de chaque page du site public. Pas d'application mobile native : le site est responsive, mobile-first, servi en web uniquement.

# 2. Pages et contenu attendu

| Page | Contenu attendu |
|---|---|
| Accueil | Identité, proposition de valeur, domaines d'expertise, chiffres clés, réalisations mises en avant, actualités récentes, appel à contact |
| À propos | Présentation, historique, vision, mission, valeurs, organisation, équipe et experts |
| Nos services | Pôles Environnement, Eau et Travaux d'ingénierie détaillés |
| Nos réalisations | Portfolio filtrable par domaine, année, localisation, type de projet |
| Actualités & publications | Actualités, articles, événements, formations, communiqués, publications techniques |
| Documents | Documents publics téléchargeables + accès à l'espace documentaire privé (authentification requise) |
| Contact | Formulaire, téléphone, e-mail, localisation, horaires, liens professionnels |

# 3. Exigences par écran

Chaque page à données définit ses états : chargement, vide, erreur. La page Nos réalisations et Actualités affichent un état vide explicite si aucun contenu ne correspond aux filtres actifs, jamais une page blanche. La page Contact affiche une confirmation claire après soumission réussie, et les erreurs de validation par champ en cas d'échec.

# 4. Rendu et performance

Accueil, À propos, Nos services : SSG/ISR à revalidation longue (contenu stable). Nos réalisations, Actualités & publications : ISR à revalidation courte ou SSR selon la fraîcheur requise (voir `16_Rendering_State_Strategy.md`). Documents (liste publique) : ISR. Contact : page statique avec formulaire en composant client isolé.

# 5. Routes protégées

L'accès à l'espace documentaire privé depuis la page Documents redirige vers l'authentification si l'utilisateur n'est pas connecté, puis vers le portail documentaire (zone client-side, hors SEO). Une session expirée ramène vers une route sûre sans exposer de contenu mis en cache localement.

# 6. Références

`04_User_Flows.md`, `05_UI_UX_System.md`, `16_Rendering_State_Strategy.md`.

> Note (2026-10-02) — **Fiche réalisation** (`/[locale]/realisations/[slug]`, `app/[locale]/(public)/realisations/[slug]/page.tsx`) : Server Component, SSG (`generateStaticParams` : une page par langue et par réalisation publiée) avec ISR par étiquettes (`realisations`, `realisation:<slug>` — revalidées par l'API à la publication, modification, dépublication ou suppression). Brouillon, archivée, supprimée ou slug inconnu : **404** ; une panne de l'API lève une erreur (jamais mise en cache comme un 404) et, à la construction, une API injoignable ne bloque pas le site (les fiches se génèrent alors à la première visite). Contenu : fil d'Ariane, type, titre (FR/EN avec repli sur le français), client si publiable, période, lieu ; couverture = première image de la galerie, sinon la couverture générée ; sections Présentation / Objectifs / Résultats **seulement si elles ont du contenu** (paragraphes séparés par une ligne vide), « Nature de la mission » (texte de référence du type, toujours établi) avec invitation à contacter l'équipe quand rien d'autre n'est publié ; galerie des images suivantes (texte alternatif propre à chaque image) ; documents à télécharger (uniquement ceux publiés ; nom, format, poids, pages, année) ; colonne latérale : faits, partenaires & bailleurs, appel à contact, partage ; « Autres missions de ce type » (3 plus récentes). Métadonnées (titre, description tirée de la présentation, Open Graph avec l'image principale) et données structurées schema.org `CreativeWork`. La fiche de lecture modale de `/realisations` renvoie à cette page (« Voir la fiche complète ») et affiche désormais lieu et résumé. Les références statiques de repli (API vide) n'ont pas de fiche.

> Note (2026-10-03) — **En-tête commun des pages.** Les six pages (À propos, Nos services, Nos réalisations, Actualités, Documents, Contact) lisent leur titre (h1), leur introduction et leur description `<meta>` via `resolvePageHeader(slug, locale, repli)` (`lib/api/public-pages.ts`) : la page institutionnelle publiée du même slug, sinon les textes d'origine de `messages/`. Description absente : extrait de l'introduction (160 caractères, coupé sur une fin de mot) **dans la langue de la page** — jamais la description française sur le site anglais. **Nos services** : l'icône de chaque prestation vient de la base (`icon`, repli sur la position d'origine), le visuel du pôle aussi (`imageUrl`, repli sur le visuel d'origine ; texte alternatif FR/EN, à défaut le nom du pôle). L'ordre des pôles (ENV → H₂O → ING) reste fixe.

> Note (2026-10-03) — **Accueil et pôles.** Les trois chapitres ENV / H₂O / ING de l'Accueil (nom en sur-titre « ENV · Environnement », accroche = titre, présentation, liste des prestations avec leurs pictogrammes), l'aperçu des pôles, les noms de pôles du pied de page et de la galerie d'experts de À propos lisent le même contenu que Nos services : le portail (`getPoleServices`), avec repli sur `messages/` si l'API est injoignable ou le pôle non publié. Modifier un pôle dans le portail le change donc partout. **Restent dans `messages/`** : les sur-titres de section autres que celui du pôle, la légende et l'image du chapitre ENV (photo dédiée à l'Accueil, indépendante du visuel du pôle qui n'alimente que Nos services), les chiffres clés, les valeurs, l'équipe et les références.

> Note (2026-10-03) — **Chiffres clés de À propos.** La bande est lue sur `GET /key-figures` (`getKeyFigures`, composant `KeyFiguresStrip`) ; repli sur `messages/` seulement si l'API est **injoignable** — une liste vide (tout masqué) est respectée et la bande n'est pas affichée. Valeurs mises en forme selon la langue (« 12 000 » / « 12,000 »), suffixe en couleur, précision facultative.

> Note (2026-10-03) — **Équipe & experts de À propos.** La galerie lit `GET /experts` (`getExperts`, étiquettes `experts` et `services`) ; repli sur les profils provisoires de `messages/` **seulement si l'API est injoignable**. Une liste vide (aucun expert publié) **masque toute la section** (ancre `#equipe`) : des personnes fictives ne s'affichent jamais à la place d'une équipe non publiée. Pôle, années d'expérience, présentation et spécialités sont facultatifs (sans pôle : accent neutre et pas de pastille ; sans photo : monogramme).

> Note (2026-10-03) — **Coordonnées pilotées par le portail.** Téléphone, e-mail, adresse (FR/EN), horaires et réseaux sociaux viennent de `GET /site-settings` (`getSiteSettings`, tag de cache `site-settings`, revalidé à chaque enregistrement) ; `data/contact.ts` n'est plus qu'un **repli** si l'API est injoignable. Le layout public lit les réglages une fois et les passe aux composants client par `SiteSettingsProvider` (bloc Contact de l'accueil, formulaire, carte d'horaires). La carte d'horaires de la page Contact affiche désormais les jours réellement ouverts (`lib/office-hours.ts`, partagé avec l'aperçu du portail) au lieu de « Lundi–Vendredi » figé. Le pied de page affiche les réseaux renseignés (liens en nouvel onglet, annoncé aux lecteurs d'écran) ; sans adresse enregistrée, un réseau n'apparaît pas.

> Note (2026-10-05) — **Corps d'une actualité** : `components/public/article-body.tsx` (Server Component) affiche le HTML nettoyé par l'API (`bodyHtml`) ou, pour les articles d'avant l'éditeur et les textes de repli de `messages/`, des paragraphes. Mise en forme `.article-prose` (partagée avec l'éditeur du portail) ; lettrine seulement si l'article s'ouvre sur un paragraphe ; temps de lecture calculé sur le texte visible.

> Note (2026-10-07) — **Lightbox de la galerie d'une réalisation.** Sur la fiche `/[locale]/realisations/[slug]`, chaque vignette de la galerie s'ouvre en grand dans une fenêtre modale (`<dialog>` natif : Échap, piège du focus, retour du focus sur la vignette) avec image précédente / suivante en boucle (boutons, flèches du clavier, glissement au doigt), compteur « Image n sur N » (la couverture compte dans N), texte alternatif en légende et fermeture (bouton, Échap, clic hors de l'image). Seul `components/public/gallery-lightbox.tsx` est un composant client ; la page reste rendue côté serveur. Textes : `RealisationsPage.detail.lightbox` (FR/EN).

> Note (2026-10-08) — **Pages légales** : `/[locale]/mentions-legales`, `/confidentialite`, `/cookies`, `/conditions-utilisation` (mêmes adresses en FR et EN), liées depuis le pied de page. Server Components (ISR par l'étiquette `site-settings`), aucun JavaScript client. Mise en page commune `components/public/legal-document.tsx` (en-tête avec date de révision, sommaire collé à gauche sur grand écran / repliable sur mobile, sections numérotées, tableaux repliés en fiches sur mobile, renvois vers les autres documents). **Contenu dans le code** (`lib/legal/content-fr.ts` et `content-en.ts`, FR = référence ; toute modification se fait dans les deux ; `LEGAL_UPDATED_ISO` à mettre à jour à chaque changement de fond), complété par les réglages du site (coordonnées, mentions saisies dans Paramètres > Informations légales : une mention vide n'est pas affichée ; sans hébergeur renseigné, texte de repli « communiqué sur demande »). Base juridique : **Code du numérique RDC (ordonnance-loi n° 23/010 du 13 mars 2023)**, articles vérifiés sur le texte intégral : 52 (identification de l'éditeur), 47 (propriété intellectuelle), 186 (déclaration à l'APD), 192-196 (consentement, principes), 195 (données sensibles), 198-199 (transmission, réquisitions), 201-202 (hébergement en RDC, transferts), 209-216 (droits des personnes : accès/copie 60 j, rectification 30 j, effacement 30 j, opposition 30 j, portabilité), 219-221 (obligations, information à la collecte), 222 (délégué), 244 (violation), 262-263 (APD). Le Code ne contient **aucune disposition propre aux cookies** : la page Cookies applique les principes de transparence et de minimisation (art. 193-194). Le site n'utilise que des traceurs strictement nécessaires (cookie de session `NEXT_LOCALE` seulement si la langue choisie diffère de celle du navigateur ; cookies httpOnly du portail ; `localStorage` d'affichage du portail) : **pas de bandeau**. Si une mesure d'audience ou un traceur non nécessaire était ajouté, un consentement préalable et une mise à jour de ces textes seraient requis. Le formulaire de Contact renvoie vers la politique de confidentialité (information à la collecte, art. 220).
