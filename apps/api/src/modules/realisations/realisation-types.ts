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

/** Images d'une réalisation (galerie) : au-delà, la fiche devient illisible. */
export const MAX_REALISATION_IMAGES = 12;

/** Partenaires et documents associés à une réalisation : même raison. */
export const MAX_REALISATION_PARTNERS = 20;
export const MAX_REALISATION_DOCUMENTS = 20;
/** Longueur d'un nom de partenaire. */
export const MAX_PARTNER_NAME = 150;
