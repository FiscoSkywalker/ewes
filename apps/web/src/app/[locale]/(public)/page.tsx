import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeExperience } from '@/components/home/home-experience';

/**
 * Accueil — blueprint/15_Public_Site_Pages.md. Server Component pour les
 * métadonnées uniquement : le rendu est délégué à `HomeExperience`, un
 * arbre client assumé (décor immersif WebGL/GSAP, voir le journal de
 * session Phase 02 pour la justification de cet écart au SSR par défaut).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Hero');
  return {
    description: t('lead'),
  };
}

export default function HomePage() {
  return <HomeExperience />;
}
