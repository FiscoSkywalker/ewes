import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProjects } from '@/lib/api/public-realisations';
import type { ProjectCategoryOption } from '@/data/projects';
import { RealisationsGallery } from '@/components/public/realisations-gallery';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Nos réalisations (blueprint/12_Realisations_Portfolio_System.md) —
 * Server Component ; la galerie paginée et la fiche de lecture sont le seul
 * îlot client. L'Accueil garde son registre compact (`RealisationsRegister`).
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/realisations'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'RealisationsPage' });
  return { title: t('eyebrow'), description: t('description') };
}

export default async function RealisationsPage({
  params,
}: PageProps<'/[locale]/realisations'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('RealisationsPage');
  const tProjects = await getTranslations('Projects');
  const projects = await getProjects(locale);

  return (
    <div className="bg-paper px-6 pb-24 pt-28 text-sand md:px-16 md:pb-32 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14 max-w-4xl"
        />
        <RealisationsGallery
          projects={projects}
          categories={tProjects.raw('categories') as ProjectCategoryOption[]}
        />
      </div>
    </div>
  );
}
