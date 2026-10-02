import { getTranslations } from 'next-intl/server';
import type { NewsCategory, NewsItem } from '@/data/news';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const ARTICLES_REVALIDATE_SECONDS = 3_600;

export const ARTICLES_TAG = 'articles';

/** Plafond de l'API par requête ; au-delà on pagine. */
const PAGE_SIZE = 100;

/** Type d'article de l'API -> rubrique du site. */
const CATEGORY_BY_TYPE: Record<string, NewsCategory> = {
  ENQUETE: 'survey',
  FORMATION: 'training',
  EVENEMENT: 'event',
  PUBLICATION: 'publication',
  ACTUALITE: 'news',
  COMMUNIQUE: 'communique',
};

interface PublicArticle {
  slug: string;
  type: string;
  titleFr: string;
  titleEn: string | null;
  excerptFr: string | null;
  excerptEn: string | null;
  contextFr: string | null;
  contextEn: string | null;
  contentFr: string;
  contentEn: string | null;
  publishedAt: string | null;
  datePrecision: 'YEAR' | 'MONTH' | 'DAY';
  image: { url: string; altFr: string | null; altEn: string | null } | null;
}

interface ArticlesPage {
  data: PublicArticle[];
  meta: { page: number; limit: number; total: number };
}

async function fetchPage(page: number): Promise<ArticlesPage> {
  const res = await fetch(`${API_URL}/articles?limit=${PAGE_SIZE}&page=${page}`, {
    next: { revalidate: ARTICLES_REVALIDATE_SECONDS, tags: [ARTICLES_TAG] },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ArticlesPage;
}

/** Tous les articles publiés (pagination suivie) ; `null` si l'API échoue. */
async function fetchAllPublished(): Promise<PublicArticle[] | null> {
  try {
    const first = await fetchPage(1);
    const all = [...first.data];
    const pages = Math.ceil(first.meta.total / PAGE_SIZE);
    for (let page = 2; page <= pages; page++) {
      all.push(...(await fetchPage(page)).data);
    }
    return all;
  } catch {
    return null;
  }
}

/** Date ISO à la précision voulue : `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ` (UTC). */
function isoDate(publishedAt: string, precision: PublicArticle['datePrecision']) {
  const day = publishedAt.slice(0, 10);
  return precision === 'YEAR' ? day.slice(0, 4) : precision === 'MONTH' ? day.slice(0, 7) : day;
}

/**
 * Articles du site, pilotés par l'API (plus récents d'abord). Renvoie `null`
 * si l'API échoue ou ne renvoie rien : l'appelant retombe alors sur les
 * messages statiques, le site public ne s'affichant jamais vide ni cassé.
 */
export async function getPublishedNews(
  locale: string,
): Promise<NewsItem[] | null> {
  const articles = await fetchAllPublished();
  if (!articles || articles.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'NewsPage' });
  const english = locale === 'en';
  const pick = (fr: string | null, en: string | null) =>
    (english && en) || fr || '';

  return articles.flatMap((article): NewsItem[] => {
    const category = CATEGORY_BY_TYPE[article.type];
    if (!category || !article.publishedAt) return [];
    const title = pick(article.titleFr, article.titleEn);
    const content = pick(article.contentFr, article.contentEn).trim();
    return [
      {
        id: article.slug,
        category,
        type: t(`categories.${category}`),
        date: isoDate(article.publishedAt, article.datePrecision),
        context: pick(article.contextFr, article.contextEn),
        title,
        excerpt: pick(article.excerptFr, article.excerptEn),
        imageAlt: article.image
          ? pick(article.image.altFr, article.image.altEn) || title
          : title,
        image: article.image?.url,
        body: content ? content.split(/\n{2,}/) : undefined,
      },
    ];
  });
}
