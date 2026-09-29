'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Building, MapPin } from 'lucide-react';
import type { Project, ProjectCategory } from '@/data/projects';
import { SectionHeading } from './section-heading';
import { ProjectModal } from './project-modal';

type CategoryFilter = ProjectCategory | 'TOUS';

interface ProjectsExplorerProps {
  /** `home` conserve la mise en page pleine largeur du prototype ; `page` s'insère dans une page standard. */
  variant?: 'home' | 'page';
}

/**
 * Portfolio filtrable des réalisations (blueprint/12_Realisations_Portfolio_System.md),
 * partagé entre la section Accueil et la page /realisations — même contenu,
 * mise en page adaptée au contexte.
 */
export function ProjectsExplorer({ variant = 'page' }: ProjectsExplorerProps) {
  const t = useTranslations('Projects');
  const tPage = useTranslations('RealisationsPage');
  const projects = t.raw('items') as Project[];
  const categories = t.raw('categories') as {
    key: CategoryFilter;
    label: string;
  }[];

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('TOUS');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(
    () =>
      activeCategory === 'TOUS'
        ? projects
        : projects.filter((p) => p.category === activeCategory),
    [projects, activeCategory],
  );

  return (
    <section
      className={
        variant === 'home'
          ? 'relative min-h-screen bg-[#e8f0f3] px-6 py-28 text-sand pointer-events-auto md:px-16'
          : 'px-6 py-16 text-sand md:px-16'
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-7 border-b border-sand/20 pb-7 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={
              variant === 'home' ? t('description') : tPage('description')
            }
            className="max-w-3xl"
          />

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`border-b px-1 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeCategory === cat.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-sand/45 hover:border-sand/30 hover:text-sand'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {variant === 'home' && (
          <figure
            className="relative mb-10 min-h-[300px] overflow-hidden sm:min-h-[420px]"
            data-image-reveal
          >
            <Image
              src="/assets/images/ewes-laboratory-cinematic.png"
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/20 via-transparent to-white/10" />
            <figcaption className="absolute bottom-0 left-0 bg-surface-elevated/94 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
              {t('imageCaption')}
            </figcaption>
          </figure>
        )}

        {filteredProjects.length === 0 ? (
          <p className="border-t border-sand/20 py-12 text-center text-sm text-sand/55">
            {tPage('emptyState')}
          </p>
        ) : (
          <div className="border-b border-sand/20" data-stagger>
            {filteredProjects.map((project, index) => (
              <button
                type="button"
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="group grid w-full gap-5 border-t border-sand/20 py-7 text-left transition-colors hover:bg-white/45 sm:grid-cols-[48px_1.4fr_.8fr_110px_32px] sm:items-center sm:px-3"
              >
                <span className="font-heading text-3xl font-medium text-water">
                  0{index + 1}
                </span>
                <div>
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    {project.category.replace('_', ' ')} ·{' '}
                    {t(`statusLabels.${project.status}`)}
                  </div>
                  <h3 className="font-heading text-2xl font-semibold leading-tight text-sand transition-colors group-hover:text-primary">
                    {project.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-sand/52 line-clamp-2">
                    {project.summary}
                  </p>
                </div>
                <div className="space-y-2 text-[11px] text-sand/52">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-primary" />
                    {project.region} · {project.country}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={12} className="text-primary" />
                    {project.client}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-sand/40">
                    {project.keyMetric.label}
                  </div>
                  <div className="mt-1 font-heading text-xl font-semibold text-sand">
                    {project.keyMetric.value}
                  </div>
                </div>
                <ArrowUpRight
                  size={18}
                  className="text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
}
