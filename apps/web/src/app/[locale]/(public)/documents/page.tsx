import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DocumentsLibrary } from '@/components/public/documents-library';
import type { ShowcaseDocument } from '@/components/public/documents-showcase';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Documents (blueprint/15_Public_Site_Pages.md §5) — Server Component
 * (ISR) ; seule la bibliothèque (recherche, filtres) est un composant client.
 * Les documents sont des exemples tirés des messages (`HomeDocuments.items`,
 * partagés avec l'Accueil) en attendant le branchement sur l'API.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('DocumentsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function DocumentsPage() {
  const t = await getTranslations('DocumentsPage');
  const tDoc = await getTranslations('HomeDocuments');
  const documents = tDoc.raw('items') as ShowcaseDocument[];

  return (
    <div className="px-6 pb-20 pt-28 text-sand md:px-16 md:pb-28 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
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
