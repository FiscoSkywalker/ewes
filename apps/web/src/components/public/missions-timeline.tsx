'use client';

import { useTranslations } from 'next-intl';
import {
  projectYear,
  type Project,
  type ProjectCategoryOption,
} from '@/data/projects';

interface MissionsTimelineProps {
  projects: Project[];
  categoryById: Map<string, ProjectCategoryOption>;
  /** Réalisations retenues par le type et la recherche (les autres sont estompées). */
  matches: Set<string>;
  year: number | null;
  onYear: (year: number | null) => void;
  onOpen: (project: Project) => void;
}

/**
 * Frise « un point = une mission » de la page Réalisations : une colonne par
 * année, un point par réalisation. Cliquer une année filtre la galerie,
 * cliquer un point ouvre sa fiche. Série unique (pas de palette
 * catégorielle) : l'état « hors filtre » est porté par l'opacité et le
 * contour, jamais par une seconde teinte seule.
 */
export function MissionsTimeline({
  projects,
  categoryById,
  matches,
  year,
  onYear,
  onOpen,
}: MissionsTimelineProps) {
  const t = useTranslations('RealisationsPage.timeline');

  const byYear = new Map<number, Project[]>();
  for (const project of projects) {
    const key = projectYear(project);
    byYear.set(key, [...(byYear.get(key) ?? []), project]);
  }
  const allYears = [...byYear.keys()];
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => minYear + index,
  );
  const peak = Math.max(...[...byYear.values()].map((list) => list.length));
  const peakYear = years.find((y) => byYear.get(y)?.length === peak);
  const matchCount = (y: number) =>
    (byYear.get(y) ?? []).filter((p) => matches.has(p.id)).length;

  const selected = year ?? null;
  const headline =
    selected !== null
      ? { value: matchCount(selected), label: t('inYear', { year: String(selected) }) }
      : { value: matches.size, label: t('total', { from: String(minYear), to: String(maxYear) }) };

  return (
    <figure
      className="missions-timeline tone-night relative mb-16 overflow-hidden rounded-sheet bg-night p-6 sm:p-10"
      data-reveal
    >
      <div
        className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <figcaption className="mt-3 max-w-md font-heading text-2xl font-bold leading-tight text-on-night sm:text-3xl">
            {t('title')}
          </figcaption>
        </div>
        <p className="sm:text-right" aria-live="polite">
          <span className="block font-heading text-5xl font-bold leading-none tracking-tight text-on-night">
            {headline.value}
          </span>
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.14em]">
            {headline.label}
          </span>
        </p>
      </div>

      {/* Frise */}
      <div
        className="relative mt-10 grid items-end gap-1 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}
      >
        {years.map((y, columnIndex) => {
          const list = byYear.get(y) ?? [];
          const active = selected === y;
          const dimmedColumn = selected !== null && !active;
          // Infobulles alignées vers l'intérieur aux extrémités de la frise.
          const tipAlign =
            columnIndex < 3
              ? 'left-0'
              : columnIndex > years.length - 4
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';

          return (
            <div
              key={y}
              className="relative flex flex-col items-center"
              style={{ minHeight: `calc(${peak} * var(--dot-step) + 2.5rem)` }}
            >
              {/* Colonne cliquable (fond) : filtre par année. */}
              <button
                type="button"
                disabled={!list.length}
                aria-pressed={active}
                aria-label={t('yearButton', { year: String(y), count: list.length })}
                onClick={() => onYear(active ? null : y)}
                className={`absolute inset-0 rounded-card transition-colors disabled:cursor-default ${
                  active ? 'bg-on-night/10' : 'enabled:hover:bg-on-night/5'
                }`}
              />

              <ul className="relative mt-auto flex w-full flex-col-reverse items-center gap-[var(--dot-gap)] pb-8">
                {list.map((project) => {
                  const match = matches.has(project.id) && !dimmedColumn;
                  const option = categoryById.get(project.category);
                  return (
                    <li key={project.id} className="group/dot relative flex w-full justify-center">
                      <button
                        type="button"
                        onClick={() => onOpen(project)}
                        aria-label={t('dotLabel', {
                          client: project.client,
                          year: String(y),
                        })}
                        className={`aspect-square w-full max-w-[var(--dot-size)] rounded-full transition-all duration-300 hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-night ${
                          match
                            ? 'bg-malachite-bright shadow-[0_0_14px_-2px_var(--color-malachite-bright)]'
                            : 'border border-on-night/30 bg-transparent'
                        }`}
                      />
                      <span
                        role="tooltip"
                        className={`pointer-events-none absolute bottom-[calc(100%+10px)] z-10 w-56 rounded-control bg-on-night px-3.5 py-3 text-left opacity-0 shadow-xl transition-opacity group-hover/dot:opacity-100 group-focus-within/dot:opacity-100 ${tipAlign}`}
                      >
                        <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-malachite">
                          {option?.tag} · {y}
                        </span>
                        <span className="mt-1 block text-xs font-semibold leading-snug text-night">
                          {project.client}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-night/70">
                          {project.mission}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <span
                className={`pointer-events-none absolute bottom-1.5 font-mono text-[9px] leading-none sm:text-[10px] ${
                  active
                    ? 'font-bold text-on-night'
                    : list.length
                      ? 'text-on-night-muted'
                      : 'text-on-night-muted/40'
                }`}
              >
                {String(y).slice(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ligne de base + légende */}
      <div className="pointer-events-none relative -mt-7 mb-7 h-px bg-on-night/15" aria-hidden="true" />
      <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-on-night/10 pt-5 font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-malachite-bright" />
          {t('legendMatch')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-on-night/40" />
          {t('legendOther')}
        </span>
        {peakYear && (
          <span className="text-on-night-muted/70">
            {t('peak', { year: String(peakYear), count: peak })}
          </span>
        )}
        <span className="ml-auto hidden text-on-night-muted/70 md:inline">
          {t('hint')}
        </span>
      </div>
    </figure>
  );
}
