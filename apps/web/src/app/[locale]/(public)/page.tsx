import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { resolvePageHeader } from '@/lib/api/public-pages';
import { getPublicDocuments } from '@/lib/api/public-documents';
import { getProjects } from '@/lib/api/public-realisations';
import { getPoleServices } from '@/lib/api/public-services';
import { HomeExperience } from '@/components/home/home-experience';
import { getHomeNews } from '@/lib/news';
import { pageSeo } from '@/lib/seo';

/**
 * Accueil — blueprint/15_Public_Site_Pages.md. Server Component pour les
 * métadonnées et les données dynamiques : le rendu est délégué à
 * `HomeExperience`, un arbre client assumé (décor immersif WebGL/GSAP, voir
 * le journal de session Phase 02 pour la justification de cet écart au SSR
 * par défaut). Les actualités sont lues ici, côté serveur, puis transmises
 * en props : jamais d'appel API depuis le navigateur.
 *
 * Seuls trois textes viennent du module `pages` (slug `accueil`, publié depuis
 * le portail) : le titre d'onglet, la description de référencement et le
 * paragraphe d'accroche du hero. Sans page publiée, textes d'origine
 * (`messages/`, espace de noms `HomePage`).
 */

/** Textes d'origine de l'Accueil, affichés tant que la page n'est pas publiée. */
async function resolveHomeHeader(locale: string) {
  const t = await getTranslations({ locale, namespace: 'HomePage' });
  return resolvePageHeader('accueil', locale, {
    title: t('title'),
    intro: t('description'),
  });
}

/** ISR : fraîcheur des actualités (blueprint/16 §2, 5 à 15 min). */
export const revalidate = 600;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const header = await resolveHomeHeader(locale);
  return {
    // Titre complet : l'Accueil n'ajoute pas le suffixe « | EWES S.A.R.L. ».
    title: { absolute: header.title },
    description: header.description,
    ...pageSeo(locale, ''),
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [header, news, poles, projects, documents] = await Promise.all([
    resolveHomeHeader(locale),
    getHomeNews(),
    getPoleServices(locale),
    getProjects(locale),
    getPublicDocuments(locale),
  ]);
  return (
    <HomeExperience
      lead={header.intro}
      news={news}
      poles={poles}
      projects={projects}
      documents={documents}
    />
  );
}
