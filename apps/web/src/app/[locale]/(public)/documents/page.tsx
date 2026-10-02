import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicDocuments } from '@/lib/api/public-documents';
import { DocumentsLibrary } from '@/components/public/documents-library';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Documents (blueprint/15_Public_Site_Pages.md §5) — Server Component
 * (ISR) ; seule la bibliothèque (recherche, filtres) est un composant client.
 * Les documents viennent de l'API (module `documents-publics`).
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/documents'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DocumentsPage' });
  return { title: t('eyebrow'), description: t('description') };
}

export default async function DocumentsPage({
  params,
}: PageProps<'/[locale]/documents'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DocumentsPage');
  const documents = await getPublicDocuments(locale);

  return (
    <div className="px-6 pb-20 pt-28 text-sand md:px-16 md:pb-28 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          as="h1"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14 max-w-4xl"
        />
        <DocumentsLibrary documents={documents} />
      </div>
    </div>
  );
}
