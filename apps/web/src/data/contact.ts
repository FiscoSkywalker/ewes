import type { PublicSiteSettings } from '@/lib/site-settings';

/**
 * Coordonnées publiques d'EWES — **valeurs de repli**. Elles se modifient dans
 * le portail (Paramètres > Général) ; ce fichier ne sert que lorsque l'API est
 * injoignable (build sans API, panne), pour que le site n'affiche jamais un
 * numéro vide. Source des valeurs d'origine : `raw/PROFIL_EWES.md`
 * (« Informations de contact ») ; à garder alignées sur
 * `apps/api/src/modules/site-settings/site-settings.defaults.ts`.
 *
 * Horaires : absents de `raw/PROFIL_EWES.md`, valeurs provisoires À VALIDER
 * PAR EWES (blueprint/15_Public_Site_Pages.md exige des horaires sur la page
 * Contact). Heure de Lubumbashi (UTC+2).
 */
export const FALLBACK_SITE_SETTINGS: PublicSiteSettings = {
  phone: '+243 81 81 53 110',
  phoneHref: 'tel:+243818153110',
  email: 'arthurkaniki@gmail.com',
  addressFr:
    '1809, Av. Araucarias, Q/Hewa-Bora, C/Ruashi, Ville de Lubumbashi, RDC',
  addressEn:
    '1809, Araucarias Avenue, Hewa-Bora district, Ruashi commune, Lubumbashi, DRC',
  // Itinéraire : lien de recherche Google Maps, sans clé d'API.
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    '1809, Av. Araucarias, Q/Hewa-Bora, C/Ruashi, Ville de Lubumbashi, RDC',
  )}`,
  officeDays: [1, 2, 3, 4, 5],
  opensAt: '08:00',
  closesAt: '17:00',
  timeZone: 'Africa/Lubumbashi',
  social: { linkedin: null, facebook: null, x: null, youtube: null },
};
