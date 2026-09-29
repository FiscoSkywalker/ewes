'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { Project, ProjectCategory } from '@/data/projects';
import { Link } from '@/i18n/navigation';
import { SectionHeading } from './section-heading';

type CategoryFilter = ProjectCategory | 'TOUS';

/** Nombre de références affichées dans la section de l'Accueil. */
const HOME_PREVIEW_COUNT = 6;

interface ProjectsExplorerProps {
  /** `home` : aperçu pleine largeur avec lien vers la page ; `page` : liste complète dans une page standard. */
  variant?: 'home' | 'page';
}

/**
 * Portfolio filtrable des réalisations (blueprint/12_Realisations_Portfolio_System.md),
 * partagé entre la section Accueil (aperçu) et la page /realisations (liste
 * complète). Contenu limité aux références du profil EWES.
 */
export function ProjectsExplorer({ variant = 'page' }: ProjectsExplorerProps) {
  const t = useTranslations('Projects');
  const tPage = useTranslations('RealisationsPage');
  const projects = t.raw('items') as Project[];
  const categories = t.raw('categories') as {
    key: CategoryFilter;
    label: string;
  }[];
  const categoryLabels = useMemo(
    () => new Map(categories.map((category) => [category.key, category.label])),
    [categories],
  );

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('TOUS');

  const filteredProjects = useMemo(() => {
    const filtered =
      activeCategory === 'TOUS'
        ? projects
        : projects.filter((p) => p.category === activeCategory);
    return variant === 'home'
      ? filtered.slice(0, HOME_PREVIEW_COUNT)
      : filtered;
  }, [projects, activeCategory, variant]);

  return (
    <section
      className={
        variant === 'home'
          ? 'relative bg-[#e8f0f3] px-6 py-28 text-sand pointer-events-auto md:px-16'
          : 'px-6 pb-16 pt-28 text-sand md:px-16 md:pt-36'
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
                aria-pressed={activeCategory === cat.key}
                className={`border-b px-1 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
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
          <div className="border-b border-sand/20">
            {filteredProjects.map((project, index) => (
              <article
                key={project.id}
                className="grid gap-x-6 gap-y-2 border-t border-sand/20 py-6 sm:grid-cols-[48px_1fr_150px] sm:items-start sm:px-3"
              >
                <span className="font-heading text-2xl font-medium text-water sm:text-3xl">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    {categoryLabels.get(project.category)}
                  </div>
                  <h3 className="font-heading text-xl font-semibold leading-tight text-sand sm:text-2xl">
                    {project.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-sand/60">
                    {project.detail}
                  </p>
                </div>
                <div className="font-heading text-lg font-semibold text-sand sm:text-right">
                  {project.year}
                </div>
              </article>
            ))}
          </div>
        )}

        {variant === 'home' && (
          <div className="mt-8 flex justify-end">
            <Link
              href="/realisations"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:text-sand"
            >
              {t('viewAll')} <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
