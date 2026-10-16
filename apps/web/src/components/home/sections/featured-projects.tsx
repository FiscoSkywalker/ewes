import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ProjectCard } from '@/components/public/project-card';
import {
  projectYear,
  type Project,
  type ProjectCategoryOption,
} from '@/data/projects';
import { ButtonLink } from '@/components/public/ui';

/** Missions montrées sur l'Accueil ; le registre complet est sur /realisations. */
const FEATURED_COUNT = 6;

/**
 * « 04 · Nos réalisations » de l'Accueil — homepage uniquement. Les six
 * missions les plus récentes du registre (mêmes données et mêmes cartes que
 * /realisations), puis le lien vers le registre complet et sa frise.
 */
export function FeaturedProjects({ projects }: { projects: Project[] }) {
  const t = useTranslations('HomeSections');
  const tProjects = useTranslations('Projects');
  const categories = tProjects.raw('categories') as ProjectCategoryOption[];

  const featured = [...projects]
    .sort((a, b) => projectYear(b) - projectYear(a) || b.year - a.year)
    .slice(0, FEATURED_COUNT);
  const categoryByKey = new Map(categories.map((c) => [c.key, c]));

  return (
    <section className="bg-paper px-6 py-14 text-sand md:px-16 md:py-24">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <SectionHeading
            eyebrow={t('projectsEyebrow')}
            title={t('projectsTitle')}
          />
          <p
            className="max-w-md text-base leading-7 text-sand/85 md:justify-self-end"
            data-reveal
          >
            {t('projectsText')}
          </p>
        </div>
        {/* Mobile : rangée à faire glisser ; grille à partir de sm. */}
        <div
          role="region"
          aria-label={t('projectsTitle')}
          tabIndex={0}
          className="-mx-6 snap-x snap-mandatory scroll-px-6 overflow-x-auto px-6 outline-none focus-visible:ring-2 focus-visible:ring-primary sm:mx-0 sm:overflow-visible sm:px-0"
        >
          <ul className="flex gap-5 pb-2 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 sm:pb-0 lg:grid-cols-3">
            {featured.map((project) => (
              <li
                key={project.id}
                className="w-[78vw] max-w-[340px] flex-none snap-start sm:w-auto sm:max-w-none"
              >
                <ProjectCard
                  project={project}
                  category={categoryByKey.get(project.category)}
                />
              </li>
            ))}
          </ul>
        </div>
        <ButtonLink href="/realisations" icon={ArrowRight} className="mt-12">
          {tProjects('viewAll')}
        </ButtonLink>
      </div>
    </section>
  );
}
