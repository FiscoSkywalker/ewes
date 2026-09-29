import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RealisationsRegister } from '@/components/public/realisations-register';

/**
 * Page Nos réalisations (blueprint/12_Realisations_Portfolio_System.md) —
 * registre complet (histogramme par année, filtres par type), même composant
 * que la section de l'Accueil (`RealisationsRegister`), sans repli.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RealisationsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function RealisationsPage() {
  const t = await getTranslations('RealisationsPage');

  return (
    <div className="bg-paper pt-12 md:pt-16">
      <RealisationsRegister
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
    </div>
  );
}
