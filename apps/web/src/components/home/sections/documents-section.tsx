import { useTranslations } from 'next-intl';
import {
  DocumentsShowcase,
  type ShowcaseDocument,
} from '@/components/public/documents-showcase';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * « 07 · Documents » de l'Accueil — homepage uniquement. Les documents sont
 * lus côté serveur (API `documents-publics`) et transmis en props.
 */
export function DocumentsSection({
  documents,
}: {
  documents: ShowcaseDocument[];
}) {
  const t = useTranslations('HomeDocuments');
  const tHome = useTranslations('HomeSections');

  return (
    <section className="bg-white px-6 py-14 text-sand md:px-16 md:py-24">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={tHome('documentsEyebrow')}
          title={t('title')}
          description={t('lead')}
          className="mb-12 max-w-4xl"
        />
        <DocumentsShowcase documents={documents} />
      </div>
    </section>
  );
}
