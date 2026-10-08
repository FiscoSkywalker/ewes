import { cache } from 'react';
import { FALLBACK_SITE_SETTINGS } from '@/data/contact';
import type { PublicSiteSettings } from '@/lib/site-settings';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const SITE_SETTINGS_REVALIDATE_SECONDS = 86_400;

export const SITE_SETTINGS_TAG = 'site-settings';

/**
 * Lecture serveur des coordonnées publiques (téléphone, e-mail, adresse,
 * horaires, réseaux sociaux). Si l'API est injoignable ou répond une erreur,
 * le site garde ses valeurs de repli (`data/contact.ts`) : jamais de numéro
 * ou d'adresse vide. Mémorisée le temps d'un rendu (`cache`) : le pied de page,
 * le fournisseur du layout et la page Contact n'appellent l'API qu'une fois.
 */
export const getSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  try {
    const res = await fetch(`${API_URL}/site-settings`, {
      next: {
        revalidate: SITE_SETTINGS_REVALIDATE_SECONDS,
        tags: [SITE_SETTINGS_TAG],
      },
    });
    if (!res.ok) return FALLBACK_SITE_SETTINGS;
    const { data } = (await res.json()) as { data: PublicSiteSettings };
    return data;
  } catch {
    return FALLBACK_SITE_SETTINGS;
  }
});
