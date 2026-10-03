import type { OfficeHours } from '@/lib/office-hours';

/** Réseaux sociaux affichables dans le pied de page, dans l'ordre d'affichage. */
export const SOCIAL_NETWORKS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]['id'];

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
