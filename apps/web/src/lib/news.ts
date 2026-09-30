import { getTranslations } from 'next-intl/server';
import {
  NEWS_CATEGORIES,
  NEWS_FALLBACK_IMAGE,
  NEWS_IMAGES,
  type NewsCategory,
  type NewsItem,
} from '@/data/news';

/** Actualités par page de liste (hors actualité à la une). */
export const NEWS_PAGE_SIZE = 6;

/**
 * Point d'accès unique aux actualités du site public. Lit aujourd'hui les
 * messages ; à remplacer par l'appel au module NestJS `actualites`
 * (`GET /actualites?locale=&categorie=&page=`) sans toucher aux pages.
 */
export async function getAllNews(locale?: string): Promise<NewsItem[]> {
  // Locale explicite hors requête (generateStaticParams).
  const t = locale
    ? await getTranslations({ locale, namespace: 'News' })
    : await getTranslations('News');
  return (t.raw('items') as NewsItem[])
    .map((item) => ({
      ...item,
      image: item.image ?? NEWS_IMAGES[item.id] ?? NEWS_FALLBACK_IMAGE,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNewsItem(id: string) {
  const all = await getAllNews();
  const index = all.findIndex((item) => item.id === id);
  if (index === -1) return null;
  return {
    item: all[index],
    /** Plus récente / plus ancienne, pour la navigation entre articles. */
    newer: all[index - 1] ?? null,
    older: all[index + 1] ?? null,
    related: all
      .filter((other) => other.id !== id)
      .sort(
        (a, b) =>
          Number(b.category === all[index].category) -
          Number(a.category === all[index].category),
      )
      .slice(0, 3),
  };
}

export function parseCategory(value: unknown): NewsCategory | null {
  return NEWS_CATEGORIES.includes(value as NewsCategory)
    ? (value as NewsCategory)
    : null;
}

export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Temps de lecture estimé (≈ 200 mots/minute), si l'article a un corps. */
export function readingMinutes(item: NewsItem) {
  if (!item.body?.length) return null;
  const words = item.body.join(' ').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
