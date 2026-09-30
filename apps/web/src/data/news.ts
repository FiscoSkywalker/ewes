/** Rubriques des actualités (clés stables, libellés dans `NewsPage.categories`). */
export const NEWS_CATEGORIES = [
  'survey',
  'training',
  'event',
  'publication',
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/**
 * Actualité publiée (textes dans `messages/*.json` → `News.items`). Contenu
 * statique en attendant le module NestJS `actualites` (Phase 03) ; la forme
 * suit ce que renverra l'API, l'accès passe par `src/lib/news.ts`.
 */
export interface NewsItem {
  /** Identifiant, utilisé aussi comme slug d'URL (`/actualites/{id}`). */
  id: string;
  category: NewsCategory;
  /** Libellé de la rubrique (grille de l'Accueil). */
  type: string;
  /** Date ISO 8601 : `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`. */
  date: string;
  context: string;
  title: string;
  excerpt: string;
  imageAlt: string;
  /** Fourni par l'API ; sinon `NEWS_IMAGES`, puis visuel générique. */
  image?: string;
  /** Corps de l'article, en paragraphes. Absent : l'extrait fait office de texte. */
  body?: string[];
}

/** Visuel de chaque actualité (placeholders générés, voir ATTRIBUTIONS.md). */
export const NEWS_IMAGES: Record<string, string> = {
  'barometre-rse-2025': '/assets/images/ewes-news-rse-survey.jpg',
  'metalkol-carbone-2024': '/assets/images/ewes-laboratory-cinematic.png',
  'inspecteurs-2023': '/assets/images/ewes-environment-field.png',
};

export const NEWS_FALLBACK_IMAGE = '/assets/images/ewes-environment-fallback.png';

/** Date lisible selon sa précision (« 2025 », « mars 2025 », « 12 mars 2025 »). */
export function formatNewsDate(date: string, locale: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!month) return String(year);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    ...(day ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(Date.UTC(year, month - 1, day || 1));
}
