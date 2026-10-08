import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getRealisationSlugs } from '@/lib/api/public-realisations';
import { getAllNews } from '@/lib/news';
import { STATIC_PUBLIC_PATHS, absoluteUrl, languageUrls } from '@/lib/seo';

/**
 * `sitemap.xml` du site public : pages fixes, fiches de réalisations et
 * actualités publiées, dans chaque langue avec leurs alternates `hreflang`.
 * Le portail d'administration et l'espace documentaire privé n'y figurent
 * jamais. Rafraîchi à la demande avec les étiquettes `realisations` et
 * `articles` (publication, dépublication, suppression), sinon toutes les heures.
 */
export const revalidate = 3_600;

type Entry = MetadataRoute.Sitemap[number];

/** Une entrée par langue pour une même page. */
function entriesFor(path: string, lastModified?: Date): Entry[] {
  const languages = languageUrls(path);
  return routing.locales.map((locale) => ({
    url: absoluteUrl(locale, path),
    ...(lastModified && { lastModified }),
    alternates: { languages },
  }));
}

/** Date de parution d'un article (`AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`), si lisible. */
function publicationDate(date: string): Date | undefined {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [realisationSlugs, news] = await Promise.all([
    getRealisationSlugs(),
    getAllNews(routing.defaultLocale),
  ]);

  return [
    ...STATIC_PUBLIC_PATHS.flatMap((path) => entriesFor(path)),
    ...realisationSlugs.flatMap((slug) => entriesFor(`/realisations/${slug}`)),
    ...news.flatMap((item) =>
      entriesFor(`/actualites/${item.id}`, publicationDate(item.date)),
    ),
  ];
}
