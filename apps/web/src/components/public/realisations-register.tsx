'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  PROJECT_CATEGORY_TONE,
  projectYear,
  type Project,
  type ProjectCategory,
  type ProjectCategoryOption,
} from '@/data/projects';
import { Link } from '@/i18n/navigation';
import { SectionHeading } from './section-heading';
import { EmptyState, FilterChip } from '@/components/public/ui';

interface RealisationsRegisterProps {
  /** Nombre de lignes affichées avant « Afficher tout » ; tout est affiché si absent. */
  initialCount?: number;
  /** Titres et introduction (par défaut ceux de l'Accueil). */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Lien vers la page /realisations (section de l'Accueil). */
  showPageLink?: boolean;
}

/**
 * Registre des réalisations (blueprint/12_Realisations_Portfolio_System.md) :
 * histogramme des missions par année (cliquable), filtres par type avec
 * compteurs et tableau Année / Client / Mission / Type. Partagé entre
 * l'Accueil (aperçu repliable) et /realisations (registre complet). Données :
 * les 34 références du profil EWES, en attendant le module NestJS
 * `realisations`.
 */
export function RealisationsRegister({
  initialCount,
  eyebrow,
  title,
  description,
  showPageLink = false,
}: RealisationsRegisterProps) {
  const t = useTranslations('Projects');
  const projects = t.raw('items') as Project[];
  const categories = t.raw('categories') as ProjectCategoryOption[];

  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) => projectYear(b) - projectYear(a) || b.year - a.year,
      ),
    [projects],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.key, c])),
    [categories],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<ProjectCategory, number>();
    for (const p of projects)
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return counts;
  }, [projects]);

  const byCategory = sorted.filter((p) => !category || p.category === category);
  const rows = byCategory.filter((p) => !year || projectYear(p) === year);

  const years = sorted.map(projectYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearCounts = new Map<number, number>();
  for (const p of byCategory)
    yearCounts.set(projectYear(p), (yearCounts.get(projectYear(p)) ?? 0) + 1);
  const peak = Math.max(1, ...yearCounts.values());
  const histogram = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => minYear + index,
  );

  const collapsible = initialCount !== undefined && rows.length > initialCount;
  const shown = collapsible && !expanded ? rows.slice(0, initialCount) : rows;

  const selectCategory = (next: ProjectCategory | null) => {
    setCategory(next);
    setYear(null);
    setExpanded(false);
  };

  const status = [
    t('status', { count: rows.length }),
    category && categoryById.get(category)?.label,
    year,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="bg-paper px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <SectionHeading
            eyebrow={eyebrow ?? t('eyebrow')}
            title={title ?? t('title')}
          />
          <p
            className="max-w-md text-sm leading-7 text-sand/72 md:justify-self-end"
            data-reveal
          >
            {description ?? t('description')}
          </p>
        </div>

        <div
          role="group"
          aria-label={t('histogramLabel')}
          className="mb-8 grid h-36 gap-[3px] md:h-44 md:gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${histogram.length}, minmax(0, 1fr))`,
          }}
        >
          {histogram.map((y) => {
            const count = yearCounts.get(y) ?? 0;
            const active = year === y;
            return (
              <button
                key={y}
                type="button"
                disabled={!count}
                aria-pressed={active}
                aria-label={t('yearBar', { year: y, count })}
                onClick={() => {
                  setYear(active ? null : y);
                  setExpanded(false);
                }}
                className="group relative h-full disabled:cursor-default"
              >
                {/* Zone des barres : réserve la place du compteur (haut) et de l'année (bas). */}
                <span className="absolute inset-x-0 bottom-5 top-5">
                  <span
                    className={`absolute inset-x-0 bottom-0 min-h-[3px] transition-[height,background] duration-500 ${
                      active
                        ? 'bg-sand'
                        : count
                          ? 'bg-gradient-to-t from-primary to-malachite group-hover:from-sand group-hover:to-sand'
                          : 'bg-paper-muted'
                    }`}
                    style={{ height: `${(count / peak) * 100}%` }}
                  >
                    <span
                      className={`absolute inset-x-0 -top-4 text-center font-mono text-[10px] leading-none text-sand transition-opacity ${
                        active
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {count || ''}
                    </span>
                  </span>
                </span>
                <span
                  className={`absolute inset-x-0 bottom-0 text-center font-mono text-[9px] leading-none md:text-[10px] ${
                    active ? 'font-bold text-sand' : 'text-muted'
                  }`}
                >
                  {String(y).slice(2)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={t('filtersLabel')}
          className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]"
          data-lenis-prevent
        >
          <FilterChip
            active={!category}
            count={projects.length}
            onClick={() => selectCategory(null)}
            shape="square"
          >
            {t('all')}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.key}
              active={category === c.key}
              count={categoryCounts.get(c.key) ?? 0}
              onClick={() => selectCategory(c.key)}
              shape="square"
            >
              {c.label}
            </FilterChip>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="hidden grid-cols-[110px_1.1fr_1.6fr_150px] gap-6 pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid"
        >
          <span>{t('columns.year')}</span>
          <span>{t('columns.client')}</span>
          <span>{t('columns.mission')}</span>
          <span>{t('columns.type')}</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            variant="plain"
            className="border-t border-sand py-12"
            message={t('emptyState')}
          />
        ) : (
          <ul
            key={`${category ?? 'all'}-${year ?? 'all'}`}
            className="border-t border-sand"
          >
            {shown.map((project, index) => {
              const option = categoryById.get(project.category);
              return (
                <li
                  key={project.id}
                  className="register-row group grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-sand/15 py-5 transition-colors md:grid-cols-[110px_1.1fr_1.6fr_150px] md:items-baseline md:gap-6 md:px-2 md:hover:bg-paper-muted"
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                >
                  <span className="font-mono text-xs text-malachite">
                    {project.yearEnd
                      ? `${project.year}–${project.yearEnd}`
                      : project.year}
                  </span>
                  <span className="col-span-2 font-heading text-xl font-semibold leading-tight text-sand transition-transform duration-500 md:col-span-1 md:group-hover:translate-x-2">
                    {project.client}
                  </span>
                  <span className="col-span-2 text-sm leading-6 text-sand/70 md:col-span-1">
                    {project.mission}
                  </span>
                  <span className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start">
                    <span
                      className={`inline-block border border-current px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.06em] ${PROJECT_CATEGORY_TONE[project.category]}`}
                    >
                      {option?.tag}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {collapsible && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                className="border border-sand/25 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-sand transition-colors hover:border-sand hover:bg-sand hover:text-paper"
              >
                {expanded
                  ? t('showLess')
                  : t('showAll', { count: rows.length })}
              </button>
            )}
            <p className="font-mono text-[11px] text-muted" aria-live="polite">
              {status}
            </p>
          </div>

          {showPageLink && (
            <Link
              href="/realisations"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:text-sand"
            >
              {t('viewAll')} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
