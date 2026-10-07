import type { PublicSiteSettings } from '@/lib/site-settings';

/** Documents légaux du site, dans l'ordre où le pied de page les présente. */
export const LEGAL_SLUGS = [
  'mentions-legales',
  'confidentialite',
  'cookies',
  'conditions-utilisation',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/**
 * Dernière révision des textes. À mettre à jour à chaque changement de fond
 * (finalités, durées, prestataires, cookies), jamais pour une coquille.
 */
export const LEGAL_UPDATED_ISO = '2026-10-07';

/**
 * Bloc de contenu. Le texte accepte un balisage minimal : `**gras**` et
 * `[libellé](adresse)` (adresse interne `/…`, `mailto:`, `tel:` ou `https:`).
 */
export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  /** Encadré : ce qu'il faut retenir, ou un point d'attention. */
  | { type: 'note'; text: string }
  /** Couples libellé / valeur (identité de l'éditeur). */
  | { type: 'facts'; rows: [label: string, value: string][] }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  /** Nom du document (menu, onglet, fil d'ariane). */
  eyebrow: string;
  title: string;
  intro: string;
  /** Description pour les moteurs de recherche. */
  description: string;
  sections: LegalSection[];
}

/** Ce que les textes empruntent aux réglages du site (coordonnées, mentions légales). */
export type LegalContext = Pick<
  PublicSiteSettings,
  'phone' | 'email' | 'legal'
> & {
  /** Adresse du siège dans la langue du document. */
  address: string;
};

export type LegalBuilder = (
  ctx: LegalContext,
) => Record<LegalSlug, LegalDocument>;

/** Titres courts des documents, pour les liens (pied de page, renvois). */
export type LegalLabels = Record<LegalSlug, string>;
