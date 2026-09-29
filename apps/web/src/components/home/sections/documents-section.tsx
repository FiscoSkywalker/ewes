'use client';

import { useTranslations } from 'next-intl';
import { DocumentsOverview } from '@/components/public/documents-overview';
import { SectionHeading } from '@/components/public/section-heading';

/** « 05 · Documents » de l'Accueil — homepage uniquement. */
export function DocumentsSection() {
  const t = useTranslations('HomeDocuments');

  return (
    <section className="bg-white px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          className="mb-14 max-w-4xl"
        />
        <DocumentsOverview showPageLink />
      </div>
    </section>
  );
}
