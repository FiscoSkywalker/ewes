import { getLocale, getTranslations } from 'next-intl/server';
import { getPublishedNews } from '@/lib/api/public-articles';
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
 * Point d'accès unique aux actualités du site public : l'API (module
 * `actualites`, `GET /articles`), avec repli sur les messages `News.items`
 * si elle est injoignable ou ne renvoie aucun article publié.
 */
export async function getAllNews(locale?: string): Promise<NewsItem[]> {
  // Locale explicite hors requête (generateStaticParams).
  const currentLocale = locale ?? (await getLocale());
  const fromApi = await getPublishedNews(currentLocale);

  // Repli : API indisponible ou sans article publié.
  const items =
    fromApi ??
    (
      (
        await getTranslations({ locale: currentLocale, namespace: 'News' })
      ).raw('items') as NewsItem[]
    ).sort((a, b) => b.date.localeCompare(a.date));

  return items.map((item) => ({
    ...item,
    image: item.image ?? NEWS_IMAGES[item.id] ?? NEWS_FALLBACK_IMAGE,
  }));
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

/** Actualités affichées dans le carnet de bord de l'Accueil. */
export const HOME_NEWS_COUNT = 4;

export interface HomeNews {
  items: NewsItem[];
  /** Rubriques publiées et leur nombre d'actualités (liens vers /actualites). */
  categories: { key: NewsCategory; count: number }[];
}

/**
 * Données de la section Actualités de l'Accueil, lues côté serveur (ISR) et
 * transmises à l'arbre client : aucun appel à l'API depuis le navigateur.
 * Une API indisponible ne doit pas casser l'Accueil : la section affiche
 * alors son état vide.
 */
export async function getHomeNews(): Promise<HomeNews> {
  try {
    const all = await getAllNews();
    const counts = new Map<NewsCategory, number>();
    for (const item of all)
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return {
      items: all.slice(0, HOME_NEWS_COUNT),
      categories: NEWS_CATEGORIES.filter((key) => counts.has(key)).map(
        (key) => ({ key, count: counts.get(key)! }),
      ),
    };
  } catch (error) {
    console.error('[news] Accueil : actualités indisponibles', error);
    return { items: [], categories: [] };
  }
}
