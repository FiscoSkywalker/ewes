import { z } from 'zod';
import type { LocalizedFigure } from '@/lib/key-figures';

/** D'où vient la valeur d'un chiffre (`KeyFigureSource` de l'API). */
export type KeyFigureSource =
  'FIXED' | 'YEARS_SINCE' | 'MISSIONS' | 'TRAININGS';

export const SOURCES: KeyFigureSource[] = [
  'FIXED',
  'YEARS_SINCE',
  'MISSIONS',
  'TRAININGS',
];

export const SOURCE_LABELS: Record<KeyFigureSource, string> = {
  FIXED: 'Nombre saisi à la main',
  YEARS_SINCE: 'Années écoulées depuis une année',
  MISSIONS: 'Nombre de missions référencées (automatique)',
  TRAININGS: 'Nombre de formations réalisées (automatique)',
};

/** Étiquette courte d'une valeur calculée, pour la liste. */
export const SOURCE_BADGES: Partial<Record<KeyFigureSource, string>> = {
  MISSIONS: 'Automatique : missions',
  TRAININGS: 'Automatique : formations',
};

/** Nombres actuels des sources calculées en direct (`GET /admin/key-figures/counts`). */
export interface LiveCounts {
  missions: number;
  trainings: number;
}

/** Chiffre clé tel que renvoyé par `GET /admin/key-figures`. */
export interface KeyFigure {
  id: string;
  source: KeyFigureSource;
  value: number;
  sinceYear: number | null;
  suffixFr: string | null;
  suffixEn: string | null;
  labelFr: string;
  labelEn: string | null;
  subtextFr: string | null;
  subtextEn: string | null;
  sortOrder: number;
  isVisible: boolean;
  /** Valeur effectivement affichée sur le site (calculée si `sinceYear` est renseignée). */
  displayedValue: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_VALUE = 1_000_000;
const currentYear = () => new Date().getFullYear();

/**
 * Mêmes limites que les DTO NestJS (l'API revérifie tout). Les nombres sont
 * saisis comme du texte puis convertis par `toPayload`.
 */
export const figureSchema = z
  .object({
    source: z.enum(['FIXED', 'YEARS_SINCE', 'MISSIONS', 'TRAININGS']),
    value: z.string().trim(),
    sinceYear: z.string().trim(),
    suffixFr: z.string().trim().max(20, '20 caractères au plus.'),
    suffixEn: z.string().trim().max(20, '20 caractères au plus.'),
    labelFr: z
      .string()
      .trim()
      .min(1, 'Le libellé en français est obligatoire.')
      .max(120, '120 caractères au plus.'),
    labelEn: z.string().trim().max(120, '120 caractères au plus.'),
    subtextFr: z.string().trim().max(300, '300 caractères au plus.'),
    subtextEn: z.string().trim().max(300, '300 caractères au plus.'),
    isVisible: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.source === 'FIXED') {
      const n = Number(v.value);
      if (!/^\d+$/.test(v.value) || n > MAX_VALUE) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: `Un nombre entier de 0 à ${MAX_VALUE.toLocaleString('fr')}.`,
        });
      }
    } else if (v.source === 'YEARS_SINCE') {
      const year = Number(v.sinceYear);
      if (!/^\d{4}$/.test(v.sinceYear) || year < 1900 || year > currentYear()) {
        ctx.addIssue({
          code: 'custom',
          path: ['sinceYear'],
          message: `Une année entre 1900 et ${currentYear()}.`,
        });
      }
    }
  });

export type FigureFormValues = z.infer<typeof figureSchema>;

export const EMPTY_FIGURE: FigureFormValues = {
  source: 'FIXED',
  value: '',
  sinceYear: '',
  suffixFr: '',
  suffixEn: '',
  labelFr: '',
  labelEn: '',
  subtextFr: '',
  subtextEn: '',
  isVisible: true,
};

export function toFormValues(f: KeyFigure): FigureFormValues {
  return {
    source: f.source,
    value: String(f.value),
    sinceYear: f.sinceYear !== null ? String(f.sinceYear) : '',
    suffixFr: f.suffixFr ?? '',
    suffixEn: f.suffixEn ?? '',
    labelFr: f.labelFr,
    labelEn: f.labelEn ?? '',
    subtextFr: f.subtextFr ?? '',
    subtextEn: f.subtextEn ?? '',
    isVisible: f.isVisible,
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/**
 * Corps JSON. Un champ facultatif vidé part en `null` (l'API l'efface, le site
 * retombe sur le français). Seule la source « nombre saisi » lit `value`, et
 * seule « années écoulées » lit l'année de départ (effacée pour les autres).
 */
export function toPayload(v: FigureFormValues) {
  return {
    source: v.source,
    value: v.source === 'FIXED' ? Number(v.value) : 0,
    sinceYear: v.source === 'YEARS_SINCE' ? Number(v.sinceYear) : null,
    suffixFr: orNull(v.suffixFr),
    suffixEn: orNull(v.suffixEn),
    labelFr: v.labelFr,
    labelEn: orNull(v.labelEn),
    subtextFr: orNull(v.subtextFr),
    subtextEn: orNull(v.subtextEn),
    isVisible: v.isVisible,
  };
}

/** Un chiffre sans version anglaise s'affiche en français sur le site en anglais. */
export const hasEnglish = (f: Pick<KeyFigure, 'labelEn'>) =>
  Boolean(f.labelEn?.trim());

/** Chiffre tel que l'affiche le site, dans une langue (même repli sur le français). */
export function localize(f: KeyFigure, locale: 'fr' | 'en'): LocalizedFigure {
  const english = locale === 'en';
  return {
    value: f.displayedValue,
    suffix: ((english && f.suffixEn) || f.suffixFr || '').trim(),
    label: (english && f.labelEn) || f.labelFr,
    subtext: (english && f.subtextEn) || f.subtextFr || '',
  };
}
