const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const PAGE_REVALIDATE_SECONDS = 86_400;

export interface PublicPage {
  slug: string;
  titleFr: string;
  titleEn: string | null;
  contentFr: string;
  contentEn: string | null;
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
  };
}
