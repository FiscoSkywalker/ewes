import { z } from 'zod';

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const DOCUMENT_CATEGORIES = [
  'REPORT',
  'GUIDE',
  'DATASHEET',
  'BROCHURE',
  'CERTIFICATE',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  REPORT: 'Rapport',
  GUIDE: 'Guide',
  DATASHEET: 'Fiche technique',
  BROCHURE: 'Brochure',
  CERTIFICATE: 'Certificat',
};

/** Document public tel que renvoyé par `GET /admin/documents-publics[/:id]`. */
export interface PublicDocument {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string | null;
  excerptFr: string | null;
  excerptEn: string | null;
  category: DocumentCategory;
  year: number | null;
  pages: number | null;
  serviceId: string | null;
  service: { slug: string } | null;
  status: ContentStatus;
  publishedAt: string | null;
  fileType: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

/** Pôle proposé dans le formulaire (`GET /admin/services`, champs utilisés). */
export interface ServiceOption {
  id: string;
  nameFr: string;
}

/** Même plafond que l'API (`MAX_DOCUMENT_BYTES`) : un refus évite un téléversement inutile. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Même motif que l'API (`SLUG_PATTERN`). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** « Guide EIES 2025 » → `guide-eies-2025` (accents retirés, 120 caractères au plus). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      `${label} : entier entre ${min} et ${max}.`,
    );

/**
 * Les champs du formulaire sont des textes ; `toPayload` les convertit.
 * Mêmes limites que les DTO NestJS (l'API revérifie tout, et ses refus
 * s'affichent champ par champ).
 */
export const documentSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Le slug est obligatoire.')
    .max(120, '120 caractères au plus.')
    .regex(SLUG_PATTERN, 'Minuscules, chiffres et tirets uniquement.'),
  titleFr: z
    .string()
    .trim()
    .min(1, 'Le titre en français est obligatoire.')
    .max(300, '300 caractères au plus.'),
  titleEn: z.string().trim().max(300, '300 caractères au plus.'),
  excerptFr: z.string().trim(),
  excerptEn: z.string().trim(),
  category: z.enum(DOCUMENT_CATEGORIES, {
    error: 'Choisissez une catégorie.',
  }),
  year: optionalInt('Année', 1900, 2100),
  pages: optionalInt('Pages', 1, 100_000),
  serviceId: z.string(),
});

export type DocumentFormValues = z.infer<typeof documentSchema>;

export const EMPTY_DOCUMENT: DocumentFormValues = {
  slug: '',
  titleFr: '',
  titleEn: '',
  excerptFr: '',
  excerptEn: '',
  category: 'REPORT',
  year: '',
  pages: '',
  serviceId: '',
};

export function toFormValues(document: PublicDocument): DocumentFormValues {
  return {
    slug: document.slug,
    titleFr: document.titleFr,
    titleEn: document.titleEn ?? '',
    excerptFr: document.excerptFr ?? '',
    excerptEn: document.excerptEn ?? '',
    category: document.category,
    year: document.year?.toString() ?? '',
    pages: document.pages?.toString() ?? '',
    serviceId: document.serviceId ?? '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/**
 * Corps JSON d'une modification (`PATCH`). Un champ facultatif vidé part en
 * `null` : l'API l'efface, et le site retombe sur le français plutôt que
 * d'afficher un texte vide.
 */
export function toUpdatePayload(values: DocumentFormValues) {
  return {
    slug: values.slug,
    titleFr: values.titleFr,
    titleEn: orNull(values.titleEn),
    excerptFr: orNull(values.excerptFr),
    excerptEn: orNull(values.excerptEn),
    category: values.category,
    year: values.year === '' ? null : Number(values.year),
    pages: values.pages === '' ? null : Number(values.pages),
    serviceId: orNull(values.serviceId),
  };
}

/** Corps multipart d'une création (`POST`) : les champs vides sont simplement omis. */
export function toCreateFormData(values: DocumentFormValues, file: File) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== '') data.append(key, value);
  }
  data.append('file', file);
  return data;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString('fr', { maximumFractionDigits: 1 })} Mo`;
}

/** Contrôle du fichier choisi, avant tout envoi ; `null` si acceptable. */
export function fileProblem(file: File): string | null {
  if (file.size === 0) return 'Ce fichier est vide.';
  if (file.size > MAX_FILE_BYTES)
    return `Fichier trop volumineux (${formatBytes(file.size)}) : 20 Mo au plus.`;
  const looksPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  return looksPdf ? null : 'Seuls les fichiers PDF sont acceptés.';
}
