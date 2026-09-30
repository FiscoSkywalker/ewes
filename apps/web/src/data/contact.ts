/**
 * Coordonnées publiques d'EWES — source : `raw/PROFIL_EWES.md`
 * (« Informations de contact »). Un seul endroit pour le pied de page, la page
 * Contact, le bloc d'appel à l'action et le formulaire. L'adresse, elle, est
 * traduite (messages `Footer.address`).
 */
export const EWES_CONTACT = {
  phoneDisplay: '+243 81 81 53 110',
  phoneHref: 'tel:+243818153110',
  email: 'arthurkaniki@gmail.com',
  website: 'www.ewes.cd',
} as const;

/**
 * Horaires d'ouverture du siège, en heure de Lubumbashi (UTC+2). Absents de
 * `raw/PROFIL_EWES.md` : valeurs provisoires, À VALIDER PAR EWES
 * (blueprint/15_Public_Site_Pages.md exige des horaires sur la page Contact).
 * Jours au format `Date.getDay()` (0 = dimanche).
 */
export const EWES_OFFICE_HOURS = {
  timeZone: 'Africa/Lubumbashi',
  openDays: [1, 2, 3, 4, 5],
  opensAt: '08:00',
  closesAt: '17:00',
} as const;

/** Itinéraire vers le siège (lien de recherche Google Maps, sans clé d'API). */
export const EWES_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  '1809 Avenue Araucarias, Ruashi, Lubumbashi, RDC',
)}`;
