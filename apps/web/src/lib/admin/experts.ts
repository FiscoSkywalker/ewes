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
  serviceId: string | null;
  service: { id: string; slug: string; nameFr: string } | null;
  sortOrder: number;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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
