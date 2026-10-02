import { z } from 'zod';
import type { ContentStatus } from './public-documents';

/** Rubriques d'actualité (`ArticleType`), alignées sur le site public. */
export const ARTICLE_TYPES = [
  'ACTUALITE',
  'EVENEMENT',
  'FORMATION',
  'COMMUNIQUE',
  'ENQUETE',
  'PUBLICATION',
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const TYPE_LABELS: Record<ArticleType, string> = {
  ACTUALITE: 'Actualité',
  EVENEMENT: 'Événement',
  FORMATION: 'Formation',
  COMMUNIQUE: 'Communiqué',
  ENQUETE: 'Enquête',
  PUBLICATION: 'Publication',
};

/** Précision de la date affichée (`DatePrecision`) : une enquête de 2025 s'affiche « 2025 ». */
export const DATE_PRECISIONS = ['DAY', 'MONTH', 'YEAR'] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export const PRECISION_LABELS: Record<DatePrecision, string> = {
  DAY: 'Le jour (12 mars 2025)',
  MONTH: 'Le mois (mars 2025)',
  YEAR: 'L’année (2025)',
};

export interface ArticleImage {
  id: string;
  url: string;
  altFr: string | null;
  altEn: string | null;
  position: number;
}

/** Article tel que renvoyé par `GET /admin/articles[/:id]` (couverture = première image). */
export interface Article {
  id: string;
  slug: string;
  type: ArticleType;
  titleFr: string;
  titleEn: string | null;
  excerptFr: string | null;
  excerptEn: string | null;
  contextFr: string | null;
  contextEn: string | null;
  contentFr: string;
  contentEn: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  datePrecision: DatePrecision;
  images: ArticleImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Les champs sont des textes ; `toPayload` les convertit. Mêmes limites que
 * les DTO NestJS (l'API revérifie tout, ses refus s'affichent sous les champs).
 */
export const articleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Le slug est obligatoire.')
    .max(120, '120 caractères au plus.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Minuscules, chiffres et tirets uniquement.',
    ),
  type: z.enum(ARTICLE_TYPES, { error: 'Choisissez une rubrique.' }),
  titleFr: z
    .string()
    .trim()
    .min(1, 'Le titre en français est obligatoire.')
    .max(300, '300 caractères au plus.'),
  titleEn: z.string().trim().max(300, '300 caractères au plus.'),
  excerptFr: z.string().trim(),
  excerptEn: z.string().trim(),
  contextFr: z.string().trim().max(200, '200 caractères au plus.'),
  contextEn: z.string().trim().max(200, '200 caractères au plus.'),
  contentFr: z.string().trim(),
  contentEn: z.string().trim(),
  datePrecision: z.enum(DATE_PRECISIONS),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;

export const EMPTY_ARTICLE: ArticleFormValues = {
  slug: '',
  type: 'ACTUALITE',
  titleFr: '',
  titleEn: '',
  excerptFr: '',
  excerptEn: '',
  contextFr: '',
  contextEn: '',
  contentFr: '',
  contentEn: '',
  datePrecision: 'DAY',
};

export function toFormValues(a: Article): ArticleFormValues {
  return {
    slug: a.slug,
    type: a.type,
    titleFr: a.titleFr,
    titleEn: a.titleEn ?? '',
    excerptFr: a.excerptFr ?? '',
    excerptEn: a.excerptEn ?? '',
    contextFr: a.contextFr ?? '',
    contextEn: a.contextEn ?? '',
    contentFr: a.contentFr,
    contentEn: a.contentEn ?? '',
    datePrecision: a.datePrecision,
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/**
 * Corps JSON (création et modification). Un champ facultatif vidé part en
 * `null` (l'API l'efface, le site retombe sur le français) ; le contenu
 * français, lui, ne peut pas être `null` : il part en chaîne vide.
 */
export function toPayload(v: ArticleFormValues) {
  return {
    slug: v.slug,
    type: v.type,
    titleFr: v.titleFr,
    titleEn: orNull(v.titleEn),
    excerptFr: orNull(v.excerptFr),
    excerptEn: orNull(v.excerptEn),
    contextFr: orNull(v.contextFr),
    contextEn: orNull(v.contextEn),
    contentFr: v.contentFr,
    contentEn: orNull(v.contentEn),
    datePrecision: v.datePrecision,
  };
}

const FORMATS: Record<DatePrecision, Intl.DateTimeFormatOptions> = {
  DAY: { day: 'numeric', month: 'long', year: 'numeric' },
  MONTH: { month: 'long', year: 'numeric' },
  YEAR: { year: 'numeric' },
};

/** Date de parution telle que le site l'affichera (selon la précision choisie). */
export function publicationDate(
  article: Pick<Article, 'publishedAt' | 'datePrecision'>,
): string | null {
  if (!article.publishedAt) return null;
  return new Intl.DateTimeFormat('fr', FORMATS[article.datePrecision]).format(
    new Date(article.publishedAt),
  );
}

/** Image de couverture : la première, s'il y en a une. */
export const coverOf = (article: Pick<Article, 'images'>) =>
  article.images[0] ?? null;

/** Types d'images acceptés par la médiathèque, et plafond (`MAX_IMAGE_BYTES`, 5 Mo). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Contrôle de l'image choisie, avant tout envoi ; `null` si acceptable. */
export function imageProblem(file: File): string | null {
  if (file.size === 0) return 'Ce fichier est vide.';
  if (file.size > MAX_IMAGE_BYTES)
    return 'Image trop volumineuse : 5 Mo au plus.';
  return IMAGE_TYPES.includes(file.type)
    ? null
    : 'Formats acceptés : JPEG, PNG ou WebP.';
}
