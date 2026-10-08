import type { Metadata } from 'next';
import { routing, type AppLocale } from '@/i18n/routing';

/**
 * Référencement du site public (blueprint/15_Public_Site_Pages.md §SEO) : une
 * seule source pour l'URL publique, les adresses canoniques, les alternates
 * `hreflang` FR/EN, le `sitemap.xml` et le `robots.txt`.
 */
export const SITE_NAME = 'EWES S.A.R.L.';

/** Pages publiques indexables (chemin sans préfixe de langue ; `''` = Accueil). */
export const STATIC_PUBLIC_PATHS = [
  '',
  '/a-propos',
  '/services',
  '/realisations',
  '/actualites',
  '/documents',
  '/contact',
  '/mentions-legales',
  '/confidentialite',
  '/cookies',
  '/conditions-utilisation',
] as const;

const OPEN_GRAPH_LOCALE: Record<AppLocale, string> = {
  fr: 'fr_FR',
  en: 'en_US',
};

/** URL publique du site, sans barre finale (`NEXT_PUBLIC_SITE_URL`). */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return url.replace(/\/+$/, '');
}

/** Chemin localisé d'une page (le préfixe de langue est toujours présent). */
export function localizedPath(locale: string, path: string): string {
  return `/${locale}${path}`;
}

/** Adresse absolue d'une page dans une langue donnée. */
export function absoluteUrl(locale: string, path: string): string {
  return `${getSiteUrl()}${localizedPath(locale, path)}`;
}

/** Adresses de toutes les versions linguistiques d'une page, plus `x-default` (FR). */
export function languageUrls(
  path: string,
  search = '',
): Record<string, string> {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [
        locale,
        absoluteUrl(locale, path) + search,
      ]),
    ),
    'x-default': absoluteUrl(routing.defaultLocale, path) + search,
  };
}

/**
 * `canonical` + `hreflang` d'une page. Chaque version est canonique pour
 * elle-même : un contenu EN encore replié sur le FR n'est pas ramené vers le FR.
 * `search` (ex. `?page=2`) s'ajoute aux deux, pour les listes paginées.
 */
export function pageAlternates(
  locale: string,
  path: string,
  search = '',
): NonNullable<Metadata['alternates']> {
  return {
    canonical: absoluteUrl(locale, path) + search,
    languages: languageUrls(path, search),
  };
}

/**
 * Open Graph commun : adresse, nom du site et langue. Le titre et la
 * description d'une page restent ceux de ses métadonnées ; passer `extra`
 * pour une fiche (type `article`, image, date).
 */
export function pageOpenGraph(
  locale: string,
  path: string,
  extra: NonNullable<Metadata['openGraph']> = {},
): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    url: absoluteUrl(locale, path),
    siteName: SITE_NAME,
    locale: OPEN_GRAPH_LOCALE[locale as AppLocale] ?? locale,
    ...extra,
  } as NonNullable<Metadata['openGraph']>;
}

/** Les deux blocs de métadonnées SEO d'une page, à étaler dans `generateMetadata`. */
export function pageSeo(
  locale: string,
  path: string,
): Pick<Metadata, 'alternates' | 'openGraph'> {
  return {
    alternates: pageAlternates(locale, path),
    openGraph: pageOpenGraph(locale, path),
  };
}
