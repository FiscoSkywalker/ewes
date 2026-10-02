'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ChevronDown, Search, X } from 'lucide-react';
import {
  projectYear,
  type Project,
  type ProjectCategory,
  type ProjectCategoryOption,
} from '@/data/projects';
import { scrollToElement } from '@/lib/smooth-scroll';
import { MissionsTimeline } from './missions-timeline';
import { ProjectCover } from './project-cover';
import { ProjectSheet } from './project-sheet';
import {
  Button,
  EmptyState,
  FilterChip,
  Pagination,
} from '@/components/public/ui';

/** Réalisations par page (grille de 3 × 3). */
const PAGE_SIZE = 9;

/** Recherche insensible à la casse et aux accents. */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Galerie paginée des réalisations (blueprint/12_Realisations_Portfolio_System.md)
 * : chiffres clés, recherche, filtres par type et par année, cartes illustrées
 * et fiche de lecture (`ProjectSheet`, ouvrable par lien direct `#id`).
 * Données : les références du profil EWES (`Projects.items`), en attendant le
 * module NestJS `realisations` — la pagination pourra alors passer côté API.
 */
export function RealisationsGallery({
  projects,
  categories,
}: {
  projects: Project[];
  categories: ProjectCategoryOption[];
}) {
  const t = useTranslations('RealisationsPage');
  const gridRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

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
  const years = useMemo(() => [...new Set(sorted.map(projectYear))], [sorted]);

  const stats = [
    { value: String(projects.length), label: t('stats.missions') },
    {
      value: String(new Set(projects.map((p) => p.client)).size),
      label: t('stats.clients'),
    },
    {
      value: `${Math.min(...projects.map((p) => p.year))}–${years[0]}`,
      label: t('stats.period'),
    },
  ];

  const needle = normalize(query.trim());
  // Type + recherche (la frise estompe le reste) ; l'année s'applique ensuite.
  const matching = sorted.filter(
    (p) =>
      (!category || p.category === category) &&
      (!needle || normalize(`${p.client} ${p.mission}`).includes(needle)),
  );
  const matchingIds = new Set(matching.map((p) => p.id));
  const filtered = matching.filter((p) => !year || projectYear(p) === year);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const shown = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters = needle !== '' || category !== null || year !== null;

  const updateFilters = (update: () => void) => {
    update();
    setPage(1);
  };
  const reset = () =>
    updateFilters(() => {
      setQuery('');
      setCategory(null);
      setYear(null);
    });

  const goToPage = (next: number) => {
    setPage(next);
    scrollToElement(gridRef.current, { offset: -120, duration: 0.9 });
  };

  // Fiche de lecture : synchronisée avec l'ancre de l'URL (lien partageable).
  const openSheet = useCallback((project: Project | null) => {
    setOpenId(project?.id ?? null);
    const url = `${window.location.pathname}${window.location.search}${project ? `#${project.id}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id && projects.some((p) => p.id === id)) setOpenId(id);
    };
    const frame = requestAnimationFrame(syncFromHash);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, [projects]);

  const openProject = openId ? sorted.find((p) => p.id === openId) : undefined;
  // Navigation dans la fiche : dans la liste filtrée si la fiche en fait partie.
  const sequence =
    openProject && filtered.includes(openProject) ? filtered : sorted;
  const openIndex = openProject ? sequence.indexOf(openProject) : -1;

  return (
    <div>
      {/* Chiffres clés */}
      <dl
        className="mb-16 grid grid-cols-1 overflow-hidden rounded-sheet border border-border bg-surface-elevated sm:grid-cols-3"
        data-reveal
      >
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`flex flex-col gap-2 p-7 sm:p-8 ${index > 0 ? 'border-t border-border sm:border-l sm:border-t-0' : ''}`}
          >
            <dt className="order-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {stat.label}
            </dt>
            <dd className="order-1 font-heading text-4xl font-bold tracking-tight text-sand sm:text-5xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <MissionsTimeline
        projects={sorted}
        categoryById={categoryById}
        matches={matchingIds}
        year={year}
        onYear={(next) => updateFilters(() => setYear(next))}
        onOpen={openSheet}
      />

      {/* Recherche et filtres */}
      <div ref={gridRef} className="flex scroll-mt-32 flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">{t('searchLabel')}</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) =>
                updateFilters(() => setQuery(event.target.value))
              }
              placeholder={t('searchPlaceholder')}
              className="h-13 w-full rounded-full border border-border bg-surface-elevated pl-12 pr-5 text-sm text-sand outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-white"
            />
          </label>
          <label className="relative md:w-60">
            <span className="sr-only">{t('yearLabel')}</span>
            <select
              value={year ?? ''}
              onChange={(event) =>
                updateFilters(() =>
                  setYear(
                    event.target.value ? Number(event.target.value) : null,
                  ),
                )
              }
              className="h-13 w-full appearance-none rounded-full border border-border bg-surface-elevated pl-5 pr-11 text-sm font-semibold text-sand outline-none transition-colors focus:border-primary"
            >
              <option value="">{t('allYears')}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
          </label>
        </div>

        <div
          role="group"
          aria-label={t('filtersLabel')}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          data-lenis-prevent
        >
          <FilterChip
            active={!category}
            count={projects.length}
            onClick={() => updateFilters(() => setCategory(null))}
          >
            {t('all')}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.key}
              active={category === c.key}
              count={categoryCounts.get(c.key) ?? 0}
              onClick={() => updateFilters(() => setCategory(c.key))}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>

        <p
          className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
          aria-live="polite"
        >
          {t('results', { count: filtered.length })}
          {pageCount > 1 &&
            ` · ${t('pageOf', { page: currentPage, total: pageCount })}`}
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 border-b border-sand/25 pb-0.5 text-sand transition-colors hover:border-sand"
            >
              <X size={12} /> {t('reset')}
            </button>
          )}
        </p>
      </div>

      {/* Cartes */}
      {shown.length > 0 ? (
        <ul
          key={`${category}-${year}-${needle}-${currentPage}`}
          className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((project, index) => {
            const option = categoryById.get(project.category);
            return (
              <li
                key={project.id}
                className="register-row"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  type="button"
                  onClick={() => openSheet(project)}
                  aria-haspopup="dialog"
                  className="group flex h-full w-full flex-col overflow-hidden rounded-sheet border border-border-subtle bg-surface-elevated text-left transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_28px_56px_-30px_rgba(21,52,66,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <ProjectCover
                    project={project}
                    tag={option?.tag}
                    sizes="(min-width: 1280px) 460px, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/10] w-full"
                  />
                  <span className="flex flex-1 flex-col p-6 sm:p-7">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-malachite">
                      {project.yearEnd
                        ? `${project.year}–${project.yearEnd}`
                        : project.year}
                      {project.location && ` · ${project.location}`}
                    </span>
                    <span className="mt-2 font-heading text-xl font-bold leading-tight text-sand">
                      {project.client}
                    </span>
                    <span className="mb-6 mt-3 line-clamp-3 text-sm leading-6 text-sand/70">
                      {project.mission}
                    </span>
                    <span className="mt-auto flex items-center justify-between border-t border-border-subtle pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-sand">
                      {t('openSheet')}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors group-hover:border-sand group-hover:bg-sand group-hover:text-paper">
                        <ArrowUpRight
                          size={15}
                          className="transition-transform duration-300 group-hover:rotate-45"
                        />
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Search}
          message={t('emptyState')}
          action={<Button onClick={reset}>{t('reset')}</Button>}
        />
      )}

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        label={t('pagination.label')}
        onPageChange={goToPage}
        className="mt-14"
      />

      <ProjectSheet
        project={openProject ?? null}
        category={
          openProject ? categoryById.get(openProject.category) : undefined
        }
        previous={openIndex > 0 ? sequence[openIndex - 1] : undefined}
        next={openIndex >= 0 ? sequence[openIndex + 1] : undefined}
        onNavigate={openSheet}
        onClose={() => openSheet(null)}
      />
    </div>
  );
}
