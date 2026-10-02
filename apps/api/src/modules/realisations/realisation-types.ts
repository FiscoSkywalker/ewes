/**
 * Types de mission du portfolio (champ `projectType`), alignés sur les
 * filtres du site public (messages `Projects.categories`).
 */
export const REALISATION_TYPES = [
  'EIES',
  'AUDIT',
  'MONITORING',
  'AGREMENT',
  'FORMATION',
  'ETUDE',
] as const;

export type RealisationType = (typeof REALISATION_TYPES)[number];

/** Nombre maximal de réalisations « vitrine » simultanées (12_Realisations §5). */
export const MAX_FEATURED_REALISATIONS = 6;
