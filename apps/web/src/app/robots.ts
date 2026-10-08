import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

/**
 * `robots.txt` : tout le site public est ouvert aux robots. Le portail
 * d'administration n'y est volontairement pas nommé (il porte `noindex` dans
 * son layout) pour ne pas en afficher l'adresse ; seules les routes
 * techniques de l'application sont exclues.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
