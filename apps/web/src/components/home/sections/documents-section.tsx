'use client';

import { useTranslations } from 'next-intl';
import {
  DocumentsShowcase,
  type ShowcaseDocument,
} from '@/components/public/documents-showcase';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * « 05 · Documents » de l'Accueil — homepage uniquement. Les documents sont
 * pour l'instant des exemples tirés des messages (`HomeDocuments.items`), en
 * attendant le branchement sur l'API.
 */
export function DocumentsSection() {
  const t = useTranslations('HomeDocuments');
  const documents = t.raw('items') as ShowcaseDocument[];

  return (
    <section className="bg-white px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('lead')}
          className="mb-12 max-w-4xl"
        />
        <DocumentsShowcase documents={documents} />
      </div>
    </section>
  );
}
