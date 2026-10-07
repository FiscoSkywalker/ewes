import { addressFor, type PublicSiteSettings } from '@/lib/site-settings';
import { buildLegalEn, LEGAL_LABELS_EN } from './content-en';
import { buildLegalFr, LEGAL_LABELS_FR } from './content-fr';
import {
  LEGAL_SLUGS,
  type LegalContext,
  type LegalDocument,
  type LegalLabels,
  type LegalSlug,
} from './types';

export { LEGAL_SLUGS, LEGAL_UPDATED_ISO } from './types';
export type {
  LegalBlock,
  LegalDocument,
  LegalLabels,
  LegalSlug,
} from './types';

export const isLegalSlug = (value: string): value is LegalSlug =>
  (LEGAL_SLUGS as readonly string[]).includes(value);

/** Titres courts des documents légaux dans la langue du visiteur (pied de page, renvois). */
export const legalLabels = (locale: string): LegalLabels =>
  locale === 'en' ? LEGAL_LABELS_EN : LEGAL_LABELS_FR;

/**
 * Document légal dans la langue du visiteur, complété par les réglages du
 * site (coordonnées, mentions légales saisies dans le portail). Le français
 * est la langue de référence : toute autre langue retombe dessus.
 */
export function getLegalDocument(
  slug: LegalSlug,
  locale: string,
  settings: PublicSiteSettings,
): LegalDocument {
  const ctx: LegalContext = {
    phone: settings.phone,
    email: settings.email,
    legal: settings.legal,
    address: addressFor(settings, locale),
  };
  const build = locale === 'en' ? buildLegalEn : buildLegalFr;
  return build(ctx)[slug];
}
