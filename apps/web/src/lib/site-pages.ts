/**
 * Pages institutionnelles du site public dont l'en-tête (titre, introduction,
 * description pour les moteurs de recherche) se pilote depuis le portail
 * (blueprint/15_Public_Site_Pages.md). Le `slug` relie l'enregistrement en
 * base (`Page`) à la page du site ; `namespace` désigne les textes d'origine
 * (`messages/*.json`) que le site affiche tant que la page n'est pas publiée
 * depuis le portail.
 *
 * L'Accueil en fait partie pour deux textes seulement : le paragraphe d'accroche
 * du premier écran et le titre d'onglet / la description de référencement.
 * Sa mise en scène (titre composé du hero, décor WebGL, sections animées) est
 * composée à part, voir `16_Rendering_State_Strategy.md` §2 : les autres
 * sections restent dans `messages/`.
 */
export type SitePageSlug =
  | 'accueil'
  | 'a-propos'
  | 'services'
  | 'realisations'
  | 'actualites'
  | 'documents'
  | 'contact';

export interface SitePage {
  slug: SitePageSlug;
  /** Nom de la page dans le menu du site, repris dans le portail. */
  label: string;
  /** Adresse publique, sans la langue (`/fr` ou `/en` s'y ajoute). */
  href: string;
  /** Espace de noms des textes d'origine dans `messages/*.json`. */
  namespace:
    | 'HomePage'
    | 'AboutPage'
    | 'ServicesPage'
    | 'RealisationsPage'
    | 'NewsPage'
    | 'DocumentsPage'
    | 'ContactPage';
  /** Ce que la page présente, pour situer l'écran de modification. */
  purpose: string;
  /**
   * Accueil : le « titre » n'est pas affiché en grand (le titre du hero est
   * composé à part) mais devient le titre d'onglet et de résultat de recherche,
   * et l'« introduction » le paragraphe d'accroche. Libellés du formulaire
   * adaptés en conséquence.
   */
  header?: {
    cardDescription: string;
    titleLabel: string;
    titleHint: string;
    introLabel: string;
    introHint: string;
  };
}

export const SITE_PAGES: readonly SitePage[] = [
  {
    slug: 'accueil',
    label: 'Accueil',
    href: '/',
    namespace: 'HomePage',
    purpose:
      'Le premier écran du site : accroche, titre d’onglet et référencement. Le reste de l’Accueil (décor, sections) n’est pas modifiable ici.',
    header: {
      cardDescription:
        'Le titre de l’onglet du navigateur et le paragraphe d’accroche sous le grand titre du site. Le grand titre lui-même ne se modifie pas ici.',
      titleLabel: 'Titre de l’onglet et des résultats de recherche',
      titleHint:
        'Le nom du site tel qu’il apparaît dans l’onglet du navigateur et dans Google, en une ligne.',
      introLabel: 'Texte d’accroche',
      introHint:
        'Une à deux phrases sous le grand titre du premier écran : ce qu’EWES fait, pour qui.',
    },
  },
  {
    slug: 'a-propos',
    label: 'À propos',
    href: '/a-propos',
    namespace: 'AboutPage',
    purpose: 'Présentation d’EWES, chiffres clés, valeurs et équipe.',
  },
  {
    slug: 'services',
    label: 'Nos services',
    href: '/services',
    namespace: 'ServicesPage',
    purpose: 'Les trois pôles d’expertise et leurs prestations.',
  },
  {
    slug: 'realisations',
    label: 'Nos réalisations',
    href: '/realisations',
    namespace: 'RealisationsPage',
    purpose: 'Le portfolio des missions, filtrable par type et par année.',
  },
  {
    slug: 'actualites',
    label: 'Actualités & publications',
    href: '/actualites',
    namespace: 'NewsPage',
    purpose: 'Actualités, événements, formations et publications.',
  },
  {
    slug: 'documents',
    label: 'Documents',
    href: '/documents',
    namespace: 'DocumentsPage',
    purpose: 'La bibliothèque des documents publics à télécharger.',
  },
  {
    slug: 'contact',
    label: 'Contact',
    href: '/contact',
    namespace: 'ContactPage',
    purpose: 'Le formulaire de contact et les coordonnées d’EWES.',
  },
];

export const sitePageOf = (slug: string) =>
  SITE_PAGES.find((page) => page.slug === slug) ?? null;

/** Textes d'en-tête d'une page, dans une langue. */
export interface PageTexts {
  /** Nom de la page (menu du site) ; sert aussi de titre d'onglet. Non modifiable depuis le portail. */
  eyebrow: string;
  title: string;
  intro: string;
}

/** Textes d'origine du site pour chaque page (renvoyés par `GET /api/site-pages/defaults`). */
export type SitePageDefaults = Record<
  SitePageSlug,
  { fr: PageTexts; en: PageTexts }
>;
