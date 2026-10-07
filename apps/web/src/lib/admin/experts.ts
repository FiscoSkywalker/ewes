import { z } from 'zod';
import type { ContentStatus } from './public-documents';

/** Expert tel que renvoyé par `GET /admin/experts[/:id]`. */
export interface Expert {
  id: string;
  fullName: string;
  roleFr: string;
  roleEn: string | null;
  bioFr: string | null;
  bioEn: string | null;
  specialtiesFr: string[];
  specialtiesEn: string[];
  yearsOfExperience: number | null;
  photoUrl: string | null;
  /** Point focal du portrait, en % de l'image ; `null` : cadrage par défaut. */
  photoFocalX: number | null;
  photoFocalY: number | null;
  serviceId: string | null;
  service: { id: string; slug: string; nameFr: string } | null;
  sortOrder: number;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Point focal d'un portrait : la zone de l'image qui reste visible quand elle est recadrée. */
export interface FocalPoint {
  /** 0 = bord gauche, 100 = bord droit. */
  x: number;
  /** 0 = haut, 100 = bas. */
  y: number;
}

/** Cadrage d'un portrait sans point focal choisi (centre, quart supérieur : un visage de portrait). */
export const DEFAULT_FOCAL: FocalPoint = { x: 50, y: 25 };

/** Valeur CSS `object-position` d'un portrait recadré sur son point focal. */
export const objectPositionOf = (focal: FocalPoint | null) => {
  const { x, y } = focal ?? DEFAULT_FOCAL;
  return `${x}% ${y}%`;
};

/** Mêmes limites que l'API (`MAX_EXPERT_SPECIALTIES` et DTO). */
export const MAX_SPECIALTIES = 12;
export const SPECIALTY_MAX_LENGTH = 40;

/** Mêmes limites que les DTO NestJS (l'API revérifie tout). */
export const expertSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(120, '120 caractères au plus.'),
  roleFr: z
    .string()
    .trim()
    .min(1, 'La fonction en français est obligatoire.')
    .max(200, '200 caractères au plus.'),
  roleEn: z.string().trim().max(200, '200 caractères au plus.'),
  bioFr: z.string().trim().max(1200, '1 200 caractères au plus.'),
  bioEn: z.string().trim().max(1200, '1 200 caractères au plus.'),
  specialtiesFr: z.array(z.string()).max(MAX_SPECIALTIES),
  specialtiesEn: z.array(z.string()).max(MAX_SPECIALTIES),
  yearsOfExperience: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (/^\d{1,2}$/.test(value) && Number(value) <= 70),
      'Un nombre entier de 0 à 70.',
    ),
  serviceId: z.string(),
  photoUrl: z.string(),
  photoFocal: z
    .object({
      x: z.number().int().min(0).max(100),
      y: z.number().int().min(0).max(100),
    })
    .nullable(),
});

export type ExpertFormValues = z.infer<typeof expertSchema>;

export const EMPTY_EXPERT: ExpertFormValues = {
  fullName: '',
  roleFr: '',
  roleEn: '',
  bioFr: '',
  bioEn: '',
  specialtiesFr: [],
  specialtiesEn: [],
  yearsOfExperience: '',
  serviceId: '',
  photoUrl: '',
  photoFocal: null,
};

export function toFormValues(e: Expert): ExpertFormValues {
  return {
    fullName: e.fullName,
    roleFr: e.roleFr,
    roleEn: e.roleEn ?? '',
    bioFr: e.bioFr ?? '',
    bioEn: e.bioEn ?? '',
    specialtiesFr: e.specialtiesFr,
    specialtiesEn: e.specialtiesEn,
    yearsOfExperience:
      e.yearsOfExperience !== null ? String(e.yearsOfExperience) : '',
    serviceId: e.serviceId ?? '',
    photoUrl: e.photoUrl ?? '',
    photoFocal:
      e.photoFocalX !== null && e.photoFocalY !== null
        ? { x: e.photoFocalX, y: e.photoFocalY }
        : null,
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/** Corps JSON : un champ facultatif vidé part en `null` (l'API l'efface, le site retombe sur le français). */
export function toPayload(v: ExpertFormValues) {
  return {
    fullName: v.fullName,
    roleFr: v.roleFr,
    roleEn: orNull(v.roleEn),
    bioFr: orNull(v.bioFr),
    bioEn: orNull(v.bioEn),
    specialtiesFr: v.specialtiesFr,
    specialtiesEn: v.specialtiesEn,
    yearsOfExperience:
      v.yearsOfExperience === '' ? null : Number(v.yearsOfExperience),
    serviceId: orNull(v.serviceId),
    photoUrl: orNull(v.photoUrl),
    // Sans photo, un point focal n'a pas de sens : il part avec elle.
    photoFocalX: v.photoUrl ? (v.photoFocal?.x ?? null) : null,
    photoFocalY: v.photoUrl ? (v.photoFocal?.y ?? null) : null,
  };
}

/** Initiales d'un nom (monogramme sans portrait), comme sur le site. */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => /^\p{Lu}/u.test(part))
    .slice(-2)
    .map((part) => part[0])
    .join('');
}

const filled = (value: string | null | undefined) => Boolean(value?.trim());

/** Fonction, présentation et spécialités : ce qui attend encore sa version anglaise. */
export const englishGaps = (e: Expert) => {
  const gaps: string[] = [];
  if (!filled(e.roleEn)) gaps.push('fonction');
  if (filled(e.bioFr) && !filled(e.bioEn)) gaps.push('présentation');
  if (e.specialtiesFr.length > 0 && e.specialtiesEn.length === 0) {
    gaps.push('spécialités');
  }
  return gaps;
};
