import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProjectsExplorer } from '@/components/public/projects-explorer';

/**
 * Page Nos réalisations (blueprint/12_Realisations_Portfolio_System.md) —
 * portfolio filtrable, même contenu et composant que la section Accueil
 * (`ProjectsExplorer`), sans le décor cinématique.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RealisationsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default function RealisationsPage() {
  return <ProjectsExplorer variant="page" />;
}
