import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getSiteSettings } from '@/lib/api/public-site-settings';
import { getLegalDocument, type LegalSlug } from '@/lib/legal';
import { LegalDocument } from '@/components/public/legal-document';
import { pageSeo } from '@/lib/seo';

/** Métadonnées d'un document légal : titre d'onglet et description dans la langue de la page. */
export async function legalMetadata(
  slug: LegalSlug,
  params: Promise<{ locale: string }>,
): Promise<Metadata> {
  const { locale } = await params;
  const document = getLegalDocument(slug, locale, await getSiteSettings());
  return {
    title: document.eyebrow,
    description: document.description,
    ...pageSeo(locale, `/${slug}`),
  };
}

/**
 * Corps commun des pages légales (`/mentions-legales`, `/confidentialite`,
 * `/cookies`, `/conditions-utilisation`) : rendu serveur, ISR par l'étiquette
 * des réglages du site (les mentions saisies dans le portail s'y affichent
 * dès l'enregistrement).
 */
export async function LegalPage({
  slug,
  params,
}: {
  slug: LegalSlug;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const document = getLegalDocument(slug, locale, await getSiteSettings());
  return <LegalDocument slug={slug} locale={locale} document={document} />;
}
