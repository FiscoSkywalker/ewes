/**
 * Actualité publiée (textes dans `messages/*.json` → `News.items`). Contenu
 * statique en attendant le module NestJS `actualites` (Phase 03).
 */
export interface NewsItem {
  id: string;
  type: string;
  date: string;
  context: string;
  title: string;
  excerpt: string;
  imageAlt: string;
}

/** Visuel de chaque actualité (placeholders générés, voir ATTRIBUTIONS.md). */
export const NEWS_IMAGES: Record<string, string> = {
  'barometre-rse-2025': '/assets/images/ewes-news-rse-survey.jpg',
  'metalkol-carbone-2024': '/assets/images/ewes-laboratory-cinematic.png',
  'inspecteurs-2023': '/assets/images/ewes-environment-field.png',
};
