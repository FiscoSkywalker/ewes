/**
 * Valeurs d'origine des réglages, utilisées tant qu'aucun enregistrement n'existe
 * (source : `raw/PROFIL_EWES.md`). Les horaires sont provisoires, À VALIDER PAR
 * EWES (blueprint/15_Public_Site_Pages.md exige des horaires sur la page Contact).
 * Le site public garde une copie de repli (`apps/web/src/data/contact.ts`) pour
 * le cas où l'API est injoignable.
 */
export const DEFAULT_SITE_SETTINGS = {
  phone: '+243 81 81 53 110',
  email: 'arthurkaniki@gmail.com',
  addressFr:
    '1809, Av. Araucarias, Q/Hewa-Bora, C/Ruashi, Ville de Lubumbashi, RDC',
  addressEn:
    '1809, Araucarias Avenue, Hewa-Bora district, Ruashi commune, Lubumbashi, DRC',
  officeDays: [1, 2, 3, 4, 5],
  opensAt: '08:00',
  closesAt: '17:00',
  linkedinUrl: null,
  facebookUrl: null,
  xUrl: null,
  youtubeUrl: null,
  contactRecipientEmail: null,
  contactAutoReply: true,
  // Représentant légal : contrat de prestation. Les autres mentions légales sont inconnues du projet.
  legalRepresentative: 'Arthur Kaniki Tshamala',
  legalRccm: null,
  legalIdNat: null,
  legalNif: null,
  legalCapital: null,
  hostingName: null,
  hostingAddress: null,
  privacyEmail: null,
  apdReceipt: null,
};

/** Fuseau des horaires d'ouverture (le siège est à Lubumbashi, UTC+2, sans heure d'été). */
export const OFFICE_TIME_ZONE = 'Africa/Lubumbashi';
