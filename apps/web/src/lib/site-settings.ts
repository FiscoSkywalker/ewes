import type { OfficeHours } from '@/lib/office-hours';

/** Réseaux sociaux affichables dans le pied de page, dans l'ordre d'affichage. */
export const SOCIAL_NETWORKS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]['id'];

/** Mentions légales telles que servies par `GET /site-settings` : une mention absente n'est pas affichée. */
export interface PublicLegalInfo {
  representative: string | null;
  rccm: string | null;
  idNat: string | null;
  nif: string | null;
  capital: string | null;
  hostingName: string | null;
  hostingAddress: string | null;
  /** Point de contact des droits sur les données (à défaut, l'e-mail public). */
  privacyEmail: string;
  /** Référence du récépissé de déclaration à l'Autorité de protection des données. */
  apdReceipt: string | null;
}

/** Coordonnées publiques telles que servies par `GET /site-settings`. */
export interface PublicSiteSettings {
  phone: string;
  phoneHref: string;
  email: string;
  addressFr: string;
  /** Absente : le site anglais affiche l'adresse française. */
  addressEn: string | null;
  mapsUrl: string;
  officeDays: number[];
  opensAt: string;
  closesAt: string;
  timeZone: string;
  social: Record<SocialNetworkId, string | null>;
  legal: PublicLegalInfo;
}

/** Adresse dans la langue du visiteur, avec le même repli que l'API (français). */
export function addressFor(
  settings: Pick<PublicSiteSettings, 'addressFr' | 'addressEn'>,
  locale: string,
) {
  return (locale === 'en' && settings.addressEn) || settings.addressFr;
}

/** Horaires d'ouverture tirés des réglages. */
export function hoursOf(settings: PublicSiteSettings): OfficeHours {
  return {
    days: settings.officeDays,
    opensAt: settings.opensAt,
    closesAt: settings.closesAt,
    timeZone: settings.timeZone,
  };
}

/** Réseaux renseignés, prêts à afficher : un réseau sans adresse n'apparaît pas. */
export function activeSocials(settings: Pick<PublicSiteSettings, 'social'>) {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const href = settings.social[network.id];
    return href ? [{ ...network, href }] : [];
  });
}
