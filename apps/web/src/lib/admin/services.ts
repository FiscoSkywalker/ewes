import { z } from 'zod';
import type { ContentStatus } from './public-documents';
import { poleOfSlug, type PoleKey } from '@/lib/poles';
import type { BadgeTone } from '@/components/admin/ui';

/** Prestation d'un pôle (`offerings` de `GET /admin/services`). */
export interface Offering {
  id: string;
  serviceId: string;
  titleFr: string;
  titleEn: string | null;
  descriptionFr: string;
  descriptionEn: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Pôle tel que renvoyé par `GET /admin/services[/:id]`. */
export interface Service {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string | null;
  taglineFr: string | null;
  taglineEn: string | null;
  descriptionFr: string;
  descriptionEn: string | null;
  imageUrl: string | null;
  imageAltFr: string | null;
  imageAltEn: string | null;
  sortOrder: number;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  offerings: Offering[];
}

/** Ton du portail correspondant à l'accent minéral du pôle (l'Eau porte la couleur de marque). */
export const POLE_TONES: Record<PoleKey, BadgeTone> = {
  env: 'env',
  eau: 'brand',
  ing: 'ing',
};

/**
 * Couleur de texte du pôle : les jetons du portail, validés en clair comme en
 * sombre (≥ 4,5:1), plutôt que la couleur d'accent du site public, pensée pour
 * un fond clair.
 */
export const POLE_TEXT: Record<PoleKey, string> = {
  env: 'text-env',
  eau: 'text-brand',
  ing: 'text-ing',
};

/** Pôle du site que ce service alimente, `null` s'il n'a pas de chapitre sur le site. */
export const poleOf = (service: Pick<Service, 'slug'>) =>
  poleOfSlug(service.slug);

/** Ancre du chapitre du pôle sur la page Nos services. */
export const publicHrefOf = (service: Pick<Service, 'slug'>) => {
  const pole = poleOf(service);
  return pole ? `/fr/services#${pole}` : '/fr/services';
};

/** Mêmes limites que les DTO NestJS (l'API revérifie tout). */
export const poleSchema = z.object({
  nameFr: z
    .string()
    .trim()
    .min(1, 'Le nom en français est obligatoire.')
    .max(200, '200 caractères au plus.'),
  nameEn: z.string().trim().max(200, '200 caractères au plus.'),
  taglineFr: z.string().trim().max(200, '200 caractères au plus.'),
  taglineEn: z.string().trim().max(200, '200 caractères au plus.'),
  descriptionFr: z
    .string()
    .trim()
    .min(1, 'La présentation en français est obligatoire.'),
  descriptionEn: z.string().trim(),
});

export type PoleFormValues = z.infer<typeof poleSchema>;

export function toPoleFormValues(s: Service): PoleFormValues {
  return {
    nameFr: s.nameFr,
    nameEn: s.nameEn ?? '',
    taglineFr: s.taglineFr ?? '',
    taglineEn: s.taglineEn ?? '',
    descriptionFr: s.descriptionFr,
    descriptionEn: s.descriptionEn ?? '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);

export function toPolePayload(v: PoleFormValues) {
  return {
    nameFr: v.nameFr,
    nameEn: orNull(v.nameEn),
    taglineFr: orNull(v.taglineFr),
    taglineEn: orNull(v.taglineEn),
    descriptionFr: v.descriptionFr,
    descriptionEn: orNull(v.descriptionEn),
  };
}

export const offeringSchema = z.object({
  titleFr: z
    .string()
    .trim()
    .min(1, 'Le titre en français est obligatoire.')
    .max(200, '200 caractères au plus.'),
  titleEn: z.string().trim().max(200, '200 caractères au plus.'),
  descriptionFr: z
    .string()
    .trim()
    .min(1, 'La description en français est obligatoire.'),
  descriptionEn: z.string().trim(),
  icon: z.string(),
});

export type OfferingFormValues = z.infer<typeof offeringSchema>;

export const EMPTY_OFFERING: OfferingFormValues = {
  titleFr: '',
  titleEn: '',
  descriptionFr: '',
  descriptionEn: '',
  icon: '',
};

export function toOfferingFormValues(o: Offering): OfferingFormValues {
  return {
    titleFr: o.titleFr,
    titleEn: o.titleEn ?? '',
    descriptionFr: o.descriptionFr,
    descriptionEn: o.descriptionEn ?? '',
    icon: o.icon ?? '',
  };
}

export function toOfferingPayload(v: OfferingFormValues) {
  return {
    titleFr: v.titleFr,
    titleEn: orNull(v.titleEn),
    descriptionFr: v.descriptionFr,
    descriptionEn: orNull(v.descriptionEn),
    icon: orNull(v.icon),
  };
}

const filled = (value: string | null | undefined) => Boolean(value?.trim());

/** Une prestation sans version anglaise s'affiche en français sur le site en anglais. */
export const hasEnglish = (o: Pick<Offering, 'titleEn' | 'descriptionEn'>) =>
  filled(o.titleEn) && filled(o.descriptionEn);

/** La présentation du pôle attend sa version anglaise (l'accroche n'y compte que si elle existe en français). */
export const poleNeedsEnglish = (
  s: Pick<Service, 'nameEn' | 'descriptionEn' | 'taglineFr' | 'taglineEn'>,
) =>
  !filled(s.nameEn) ||
  !filled(s.descriptionEn) ||
  (filled(s.taglineFr) && !filled(s.taglineEn));
