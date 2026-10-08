import { excerpt } from '@/lib/text';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const PAGE_REVALIDATE_SECONDS = 86_400;

export interface PublicPage {
  slug: string;
  titleFr: string;
  titleEn: string | null;
  contentFr: string;
  contentEn: string | null;
  metaDescriptionFr: string | null;
  metaDescriptionEn: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export function pageTag(slug: string) {
  return `page:${slug}`;
}

/**
 * Lecture serveur d'une page publiée. Renvoie `null` si la page n'existe pas
 * (404) ou si l'API est injoignable : l'appelant retombe sur son contenu
 * statique plutôt que de casser le rendu public.
 */
export async function fetchPublishedPage(
  slug: string,
): Promise<PublicPage | null> {
  try {
    const res = await fetch(`${API_URL}/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: PAGE_REVALIDATE_SECONDS, tags: [pageTag(slug)] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicPage;
  } catch {
    return null;
  }
}

/** Texte localisé d'une page, avec repli explicite sur le français (EN absent). */
export function localizePage(page: PublicPage, locale: string) {
  const english = locale === 'en';
  return {
    title: (english && page.titleEn) || page.titleFr,
    content: (english && page.contentEn) || page.contentFr,
    // Jamais la description française sur le site anglais : à défaut de la
    // sienne, l'appelant en tire un extrait de l'introduction de la langue.
    metaDescription:
      (english ? page.metaDescriptionEn : page.metaDescriptionFr) || null,
  };
}

/** Textes d'origine du site, affichés tant que la page n'est pas publiée depuis le portail. */
export interface PageHeaderFallback {
  title: string;
  intro: string;
}

export interface PageHeader {
  title: string;
  /** Paragraphe d'introduction sous le titre. */
  intro: string;
  /** Description des moteurs de recherche et des aperçus de partage. */
  description: string;
}

/**
 * En-tête d'une page du site : le texte publié depuis le portail (page
 * institutionnelle du même slug), sinon les textes d'origine. Une description
 * de référencement absente est tirée de l'introduction, pour qu'un texte
 * modifié ne laisse pas l'ancien dans les résultats de recherche.
 */
export async function resolvePageHeader(
  slug: string,
  locale: string,
  fallback: PageHeaderFallback,
): Promise<PageHeader> {
  const page = await fetchPublishedPage(slug);
  if (!page) {
    return {
      title: fallback.title,
      intro: fallback.intro,
      description: excerpt(fallback.intro),
    };
  }
  const { title, content, metaDescription } = localizePage(page, locale);
  return {
    title,
    intro: content,
    description: metaDescription ?? excerpt(content),
  };
}
