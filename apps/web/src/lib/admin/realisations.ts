import { z } from 'zod';
import type { ContentStatus } from './public-documents';

/** Types de mission (champ `projectType`), alignés sur les filtres du site public. */
export const REALISATION_TYPES = [
  'EIES',
  'AUDIT',
  'MONITORING',
  'AGREMENT',
  'FORMATION',
  'ETUDE',
] as const;
export type RealisationType = (typeof REALISATION_TYPES)[number];

/** Libellé de filtre (pluriel) et étiquette courte d'une fiche. */
export const TYPE_LABELS: Record<
  RealisationType,
  { label: string; tag: string }
> = {
  EIES: { label: 'Études d’impact', tag: 'EIES' },
  AUDIT: { label: 'Audits', tag: 'Audit' },
  MONITORING: { label: 'Monitoring & rapports', tag: 'Monitoring' },
  AGREMENT: { label: 'Agréments & certificats', tag: 'Agrément' },
  FORMATION: { label: 'Formations', tag: 'Formation' },
  ETUDE: { label: 'Études & recherche', tag: 'Étude' },
};

/** Mêmes plafonds que l'API (`MAX_FEATURED_REALISATIONS`). */
export const MAX_FEATURED = 6;

/** Image de la galerie d'une réalisation (la première est l'image principale). */
export interface RealisationImage {
  id: string;
  /** Adresse publique relative (`/uploads/<nom>`). */
  url: string;
  altFr: string | null;
  altEn: string | null;
  position: number;
}

/** Plafond de l'API (`MAX_REALISATION_IMAGES`). */
export const MAX_REALISATION_IMAGES = 12;

/** Réalisation telle que renvoyée par `GET /admin/realisations[/:id]`. */
export interface Realisation {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string | null;
  clientName: string | null;
  isClientPublic: boolean;
  location: string | null;
  year: number | null;
  yearEnd: number | null;
  projectType: RealisationType | null;
  descriptionFr: string | null;
  descriptionEn: string | null;
  objectivesFr: string | null;
  objectivesEn: string | null;
  resultsFr: string | null;
  resultsEn: string | null;
  status: ContentStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  serviceId: string | null;
  service: { slug: string } | null;
  images: RealisationImage[];
  createdAt: string;
  updatedAt: string;
}

const optionalYear = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d{4}$/.test(value) &&
          Number(value) >= 1900 &&
          Number(value) <= 2100),
      `${label} : une année entre 1900 et 2100.`,
    );

/**
 * Les champs sont des textes ; `toPayload` les convertit. Mêmes limites que
 * les DTO NestJS (l'API revérifie tout, ses refus s'affichent sous les champs).
 */
export const realisationSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Le slug est obligatoire.')
      .max(120, '120 caractères au plus.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Minuscules, chiffres et tirets uniquement.',
      ),
    titleFr: z
      .string()
      .trim()
      .min(1, 'L’intitulé en français est obligatoire.')
      .max(500, '500 caractères au plus.'),
    titleEn: z.string().trim().max(500, '500 caractères au plus.'),
    descriptionFr: z.string().trim(),
    descriptionEn: z.string().trim(),
    objectivesFr: z.string().trim(),
    objectivesEn: z.string().trim(),
    resultsFr: z.string().trim(),
    resultsEn: z.string().trim(),
    projectType: z.union([z.enum(REALISATION_TYPES), z.literal('')]),
    year: optionalYear('Année'),
    yearEnd: optionalYear('Année de fin'),
    location: z.string().trim().max(200, '200 caractères au plus.'),
    serviceId: z.string(),
    clientName: z.string().trim().max(300, '300 caractères au plus.'),
    isClientPublic: z.boolean(),
    isFeatured: z.boolean(),
  })
  .refine(
    (v) =>
      v.year === '' || v.yearEnd === '' || Number(v.yearEnd) >= Number(v.year),
    {
      path: ['yearEnd'],
      message: 'L’année de fin ne peut pas précéder l’année de début.',
    },
  )
  .refine((v) => v.yearEnd === '' || v.year !== '', {
    path: ['year'],
    message: 'Indiquez l’année de début pour une mission pluriannuelle.',
  });

export type RealisationFormValues = z.infer<typeof realisationSchema>;

export const EMPTY_REALISATION: RealisationFormValues = {
  slug: '',
  titleFr: '',
  titleEn: '',
  descriptionFr: '',
  descriptionEn: '',
  objectivesFr: '',
  objectivesEn: '',
  resultsFr: '',
  resultsEn: '',
  projectType: '',
  year: '',
  yearEnd: '',
  location: '',
  serviceId: '',
  clientName: '',
  isClientPublic: false,
  isFeatured: false,
};

export function toFormValues(r: Realisation): RealisationFormValues {
  return {
    slug: r.slug,
    titleFr: r.titleFr,
    titleEn: r.titleEn ?? '',
    descriptionFr: r.descriptionFr ?? '',
    descriptionEn: r.descriptionEn ?? '',
    objectivesFr: r.objectivesFr ?? '',
    objectivesEn: r.objectivesEn ?? '',
    resultsFr: r.resultsFr ?? '',
    resultsEn: r.resultsEn ?? '',
    projectType: r.projectType ?? '',
    year: r.year?.toString() ?? '',
    yearEnd: r.yearEnd?.toString() ?? '',
    location: r.location ?? '',
    serviceId: r.serviceId ?? '',
    clientName: r.clientName ?? '',
    isClientPublic: r.isClientPublic,
    isFeatured: r.isFeatured,
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/**
 * Corps JSON (création et modification). Un champ facultatif vidé part en
 * `null` : l'API l'efface, et le site retombe sur le français plutôt que
 * d'afficher un texte vide.
 */
export function toPayload(v: RealisationFormValues) {
  return {
    slug: v.slug,
    titleFr: v.titleFr,
    titleEn: orNull(v.titleEn),
    descriptionFr: orNull(v.descriptionFr),
    descriptionEn: orNull(v.descriptionEn),
    objectivesFr: orNull(v.objectivesFr),
    objectivesEn: orNull(v.objectivesEn),
    resultsFr: orNull(v.resultsFr),
    resultsEn: orNull(v.resultsEn),
    projectType: v.projectType === '' ? null : v.projectType,
    year: v.year === '' ? null : Number(v.year),
    yearEnd: v.yearEnd === '' ? null : Number(v.yearEnd),
    location: orNull(v.location),
    serviceId: orNull(v.serviceId),
    clientName: orNull(v.clientName),
    isClientPublic: v.clientName === '' ? false : v.isClientPublic,
    isFeatured: v.isFeatured,
  };
}

/** « 2023 », « 2022–2024 », ou rien. */
export function periodLabel(r: Pick<Realisation, 'year' | 'yearEnd'>) {
  if (r.year === null) return null;
  return r.yearEnd && r.yearEnd !== r.year
    ? `${r.year}–${r.yearEnd}`
    : `${r.year}`;
}
