import type { ServicePole } from '@/components/public/service-chapter';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const SERVICES_REVALIDATE_SECONDS = 86_400;

export const SERVICES_TAG = 'services';

/** Slug du service en base pour chaque pôle affiché sur le site. */
export const POLE_SLUGS: Record<ServicePole, string> = {
  env: 'environnement',
  eau: 'eau',
  ing: 'ingenierie',
};

interface PublicOffering {
  titleFr: string;
  titleEn: string | null;
  descriptionFr: string;
  descriptionEn: string | null;
}

export interface PublicService {
  slug: string;
  nameFr: string;
  nameEn: string | null;
  taglineFr: string | null;
  taglineEn: string | null;
  descriptionFr: string;
  descriptionEn: string | null;
  offerings: PublicOffering[];
}

/** Service tel qu'affiché : une seule langue, repli explicite sur le français. */
export interface LocalizedService {
  name: string;
  tagline: string | null;
  description: string;
  offerings: { title: string; text: string }[];
}

/**
 * Lecture serveur des services publiés. Renvoie `null` si l'API est
 * injoignable ou répond une erreur : l'appelant retombe sur ses messages
 * statiques plutôt que de casser le rendu public.
 */
export async function fetchPublishedServices(): Promise<PublicService[] | null> {
  try {
    const res = await fetch(`${API_URL}/services`, {
      next: { revalidate: SERVICES_REVALIDATE_SECONDS, tags: [SERVICES_TAG] },
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data: PublicService[] }).data;
  } catch {
    return null;
  }
}

export function localizeService(
  service: PublicService,
  locale: string,
): LocalizedService {
  const english = locale === 'en';
  return {
    name: (english && service.nameEn) || service.nameFr,
    tagline: (english && service.taglineEn) || service.taglineFr,
    description: (english && service.descriptionEn) || service.descriptionFr,
    offerings: service.offerings.map((offering) => ({
      title: (english && offering.titleEn) || offering.titleFr,
      text: (english && offering.descriptionEn) || offering.descriptionFr,
    })),
  };
}

/** Données localisées par pôle ; un pôle absent de l'API reste `undefined`. */
export async function getPoleServices(
  locale: string,
): Promise<Partial<Record<ServicePole, LocalizedService>>> {
  const services = await fetchPublishedServices();
  const result: Partial<Record<ServicePole, LocalizedService>> = {};
  if (!services) return result;
  for (const pole of Object.keys(POLE_SLUGS) as ServicePole[]) {
    const service = services.find((s) => s.slug === POLE_SLUGS[pole]);
    if (service) result[pole] = localizeService(service, locale);
  }
  return result;
}
