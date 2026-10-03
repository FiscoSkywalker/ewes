import type { SiteSettings } from '@prisma/client';
import { OFFICE_TIME_ZONE } from './site-settings.defaults.js';

/** Réglages courants : la ligne enregistrée, ou les valeurs d'origine (`updatedAt` vide). */
export type CurrentSettings = Omit<SiteSettings, 'id' | 'updatedAt'> & {
  updatedAt: Date | null;
};

/** Champ de réglage de chaque réseau social, pour les validations et l'audit. */
export const SOCIAL_FIELDS = {
  linkedin: 'linkedinUrl',
  facebook: 'facebookUrl',
  x: 'xUrl',
  youtube: 'youtubeUrl',
} as const;

/** Lien `tel:` déduit du numéro affiché (chiffres et « + » initial seulement). */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`;
}

/** Itinéraire Google Maps (lien de recherche, sans clé d'API) vers l'adresse française. */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Réglages « Général » vus du portail. */
export function toGeneralView(settings: CurrentSettings) {
  return {
    phone: settings.phone,
    email: settings.email,
    addressFr: settings.addressFr,
    addressEn: settings.addressEn,
    officeDays: settings.officeDays,
    opensAt: settings.opensAt,
    closesAt: settings.closesAt,
    linkedinUrl: settings.linkedinUrl,
    facebookUrl: settings.facebookUrl,
    xUrl: settings.xUrl,
    youtubeUrl: settings.youtubeUrl,
    updatedAt: settings.updatedAt,
  };
}

/** Ce que le site public affiche : valeurs dérivées incluses, rien de la messagerie. */
export function toPublicView(settings: CurrentSettings) {
  return {
    phone: settings.phone,
    phoneHref: phoneHref(settings.phone),
    email: settings.email,
    addressFr: settings.addressFr,
    addressEn: settings.addressEn,
    mapsUrl: mapsUrl(settings.addressFr),
    officeDays: settings.officeDays,
    opensAt: settings.opensAt,
    closesAt: settings.closesAt,
    timeZone: OFFICE_TIME_ZONE,
    social: {
      linkedin: settings.linkedinUrl,
      facebook: settings.facebookUrl,
      x: settings.xUrl,
      youtube: settings.youtubeUrl,
    },
  };
}
