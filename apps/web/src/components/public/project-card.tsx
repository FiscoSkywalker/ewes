import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import {
  PROJECT_CATEGORY_TONE,
  type Project,
  type ProjectCategoryOption,
} from '@/data/projects';
import { Link } from '@/i18n/navigation';
import { ProjectCover } from './project-cover';

/**
 * Carte d'une mission (couverture, type, mission, client, période) menant à sa
 * fiche détaillée. Utilisée pour prolonger la lecture d'une fiche ; une
 * référence sans fiche (repli statique) n'est pas cliquable.
 */
export function ProjectCard({
  project,
  category,
}: {
  project: Project;
  category?: ProjectCategoryOption;
}) {
  const t = useTranslations('RealisationsPage.detail');
  const period = project.yearEnd
    ? `${project.year}–${project.yearEnd}`
    : `${project.year}`;

  const body = (
    <>
      <ProjectCover
        project={project}
        tag={category?.tag}
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[16/10] rounded-card"
      />
      <span className="mt-5 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
        <span className={PROJECT_CATEGORY_TONE[project.category]}>
          {category?.tag ?? project.category}
        </span>
        <span className="text-muted">{period}</span>
      </span>
      <span className="mt-2 line-clamp-3 font-heading text-lg font-bold leading-snug">
        {project.mission}
      </span>
      {project.client && (
        <span className="mt-1 line-clamp-1 text-sm text-sand/70">
          {project.client}
        </span>
      )}
      {project.slug && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sand/70 transition-colors group-hover:text-sand">
          {t('openSheet')}
          <ArrowUpRight
            size={13}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      )}
    </>
  );

  const className = 'group flex h-full flex-col';
  return project.slug ? (
    <Link href={`/realisations/${project.slug}`} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
