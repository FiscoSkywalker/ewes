import { getLocale, getTranslations } from 'next-intl/server';
import { getNewsListing, getPublishedNews } from '@/lib/api/public-articles';
import {
  NEWS_CATEGORIES,
  NEWS_FALLBACK_IMAGE,
  NEWS_IMAGES,
  type NewsCategory,
  type NewsItem,
} from '@/data/news';

/** Actualités par page de liste (hors actualité à la une). */
export const NEWS_PAGE_SIZE = 6;

/** Garantit un visuel : celui de l'API, sinon `NEWS_IMAGES`, sinon générique. */
function withImage(item: NewsItem): NewsItem {
  return {
    ...item,
    image: item.image ?? NEWS_IMAGES[item.id] ?? NEWS_FALLBACK_IMAGE,
  };
}

/** Repli : actualités des messages `News.items`, plus récentes d'abord. */
async function getStaticNews(locale: string): Promise<NewsItem[]> {
  const t = await getTranslations({ locale, namespace: 'News' });
  return (t.raw('items') as NewsItem[])
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(withImage);
}

/**
 * Toutes les actualités du site public : l'API (module `actualites`,
 * `GET /articles`), avec repli sur les messages `News.items` si elle est
 * injoignable ou ne renvoie aucun article publié. Réservé à la page d'un
 * article (navigation, articles liés) ; la liste et l'Accueil ne lisent que
 * la page dont ils ont besoin.
 */
export async function getAllNews(locale?: string): Promise<NewsItem[]> {
  // Locale explicite hors requête (generateStaticParams).
  const currentLocale = locale ?? (await getLocale());
  const fromApi = await getPublishedNews(currentLocale);
  return fromApi ? fromApi.map(withImage) : getStaticNews(currentLocale);
}

type CategoryCount = { key: NewsCategory; count: number };

/** Rubriques publiées, dans l'ordre du site, avec leur nombre d'actualités. */
function toCategories(
  counts: Partial<Record<NewsCategory, number>>,
): CategoryCount[] {
  return NEWS_CATEGORIES.filter((key) => counts[key]).map((key) => ({
    key,
    count: counts[key]!,
  }));
}

function countByCategory(items: NewsItem[]) {
  const counts: Partial<Record<NewsCategory, number>> = {};
  for (const item of items)
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

export interface NewsListPage {
  /** Actualité à la une : la plus récente, seulement en page 1 non filtrée. */
  featured: NewsItem | null;
  items: NewsItem[];
  /** Page effectivement affichée (la page demandée, ramenée à `pageCount`). */
  page: number;
  pageCount: number;
  /** Nombre total d'actualités publiées (toutes rubriques). */
  total: number;
  categories: CategoryCount[];
}

/**
 * Une page de la liste `/actualites`, paginée et filtrée par l'API : seule la
 * page affichée est chargée. L'actualité à la une (la plus récente) est
 * écartée de la pagination non filtrée — en page 1 comme dans les suivantes —
 * pour ne jamais apparaître deux fois. Repli sur les messages statiques,
 * paginés localement, si l'API est injoignable ou sans article publié.
 */
export async function getNewsListPage(
  category: NewsCategory | null,
  requestedPage: number,
): Promise<NewsListPage> {
  const locale = await getLocale();

  // 1ʳᵉ requête : l'actualité la plus récente + les compteurs par rubrique.
  const head = await getNewsListing(locale, { page: 1, limit: 1 });
  const latest = head?.items[0];
  if (!head || !latest) {
    return paginate(await getStaticNews(locale), category, requestedPage);
  }

  const poolTotal = category ? (head.counts[category] ?? 0) : head.total - 1;
  const pageCount = Math.max(1, Math.ceil(poolTotal / NEWS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  let items: NewsItem[] = [];
  if (poolTotal > 0) {
    const listing = await getNewsListing(locale, {
      page,
      limit: NEWS_PAGE_SIZE,
      category,
      exclude: category ? undefined : latest.id,
    });
    // API tombée entre les deux requêtes : liste entière en repli.
    if (!listing) {
      return paginate(await getStaticNews(locale), category, requestedPage);
    }
    items = listing.items;
  }

  return {
    featured: !category && page === 1 ? withImage(latest) : null,
    items: items.map(withImage),
    page,
    pageCount,
    total: head.total,
    categories: toCategories(head.counts),
  };
}

/** Même découpage que `getNewsListPage`, sur une liste déjà chargée (repli). */
function paginate(
  all: NewsItem[],
  category: NewsCategory | null,
  requestedPage: number,
): NewsListPage {
  const pool = category
    ? all.filter((item) => item.category === category)
    : all.slice(1);
  const pageCount = Math.max(1, Math.ceil(pool.length / NEWS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  return {
    featured: !category && page === 1 ? (all[0] ?? null) : null,
    items: pool.slice((page - 1) * NEWS_PAGE_SIZE, page * NEWS_PAGE_SIZE),
    page,
    pageCount,
    total: all.length,
    categories: toCategories(countByCategory(all)),
  };
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
  categories: CategoryCount[];
}

/**
 * Données de la section Actualités de l'Accueil, lues côté serveur (ISR) et
 * transmises à l'arbre client : aucun appel à l'API depuis le navigateur.
 * Seules les `HOME_NEWS_COUNT` plus récentes sont demandées à l'API (repli
 * sur les messages statiques comme ailleurs). Une erreur inattendue ne doit
 * pas casser l'Accueil : la section affiche alors son état vide.
 */
export async function getHomeNews(): Promise<HomeNews> {
  try {
    const locale = await getLocale();
    const listing = await getNewsListing(locale, {
      page: 1,
      limit: HOME_NEWS_COUNT,
    });
    if (listing && listing.total > 0) {
      return {
        items: listing.items.map(withImage),
        categories: toCategories(listing.counts),
      };
    }
    const all = await getStaticNews(locale);
    return {
      items: all.slice(0, HOME_NEWS_COUNT),
      categories: toCategories(countByCategory(all)),
    };
  } catch (error) {
    console.error('[news] Accueil : actualités indisponibles', error);
    return { items: [], categories: [] };
  }
}
