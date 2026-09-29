import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DocumentsOverview } from '@/components/public/documents-overview';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Documents (blueprint/15_Public_Site_Pages.md §5) — liste publique en
 * ISR (Server Component) + passerelle vers l'espace documentaire privé
 * (`DocumentsOverview`, partagé avec l'Accueil). L'espace documentaire privé
 * lui-même (blueprint/11_Document_Management_System.md) n'est pas encore
 * implémenté (module `documents-prives`, Phase 03) : le lien pointe donc
 * temporairement vers le portail admin existant, seul point
 * d'authentification fonctionnel à ce stade.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('DocumentsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function DocumentsPage() {
  const t = await getTranslations('DocumentsPage');

  return (
    <div className="px-6 pb-20 pt-28 text-sand md:px-16 md:pb-28 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14"
        />
        <DocumentsOverview />
      </div>
    </div>
  );
}
