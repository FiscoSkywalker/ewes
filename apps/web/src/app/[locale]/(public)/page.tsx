import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicDocuments } from '@/lib/api/public-documents';
import { getProjects } from '@/lib/api/public-realisations';
import { getPoleServices } from '@/lib/api/public-services';
import { HomeExperience } from '@/components/home/home-experience';
import { getHomeNews } from '@/lib/news';

/**
 * Accueil — blueprint/15_Public_Site_Pages.md. Server Component pour les
 * métadonnées et les données dynamiques : le rendu est délégué à
 * `HomeExperience`, un arbre client assumé (décor immersif WebGL/GSAP, voir
 * le journal de session Phase 02 pour la justification de cet écart au SSR
 * par défaut). Les actualités sont lues ici, côté serveur, puis transmises
 * en props : jamais d'appel API depuis le navigateur.
 */

/** ISR : fraîcheur des actualités (blueprint/16 §2, 5 à 15 min). */
export const revalidate = 600;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Hero' });
  return {
    description: t('lead'),
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [news, poles, projects, documents] = await Promise.all([
    getHomeNews(),
    getPoleServices(locale),
    getProjects(locale),
    getPublicDocuments(locale),
  ]);
  return (
    <HomeExperience
      news={news}
      poles={poles}
      projects={projects}
      documents={documents}
    />
  );
}
