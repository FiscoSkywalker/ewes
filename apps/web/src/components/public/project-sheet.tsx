'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { Project, ProjectCategoryOption } from '@/data/projects';
import { Link } from '@/i18n/navigation';
import { setScrollLocked } from '@/lib/smooth-scroll';
import { ProjectCover } from './project-cover';

interface ProjectSheetProps {
  project: Project | null;
  category?: ProjectCategoryOption;
  /** Réalisations voisines dans la liste filtrée (navigation dans la fiche). */
  previous?: Project;
  next?: Project;
  onNavigate: (project: Project) => void;
  onClose: () => void;
}

/**
 * Fiche de lecture d'une réalisation, dans un `<dialog>` modal natif
 * (piège du focus, touche Échap et fond gérés par le navigateur). Seuls les
 * faits établis sont affichés ; les champs facultatifs (lieu, résumé,
 * image) apparaissent dès que l'API les fournit.
 */
export function ProjectSheet({
  project,
  category,
  previous,
  next,
  onNavigate,
  onClose,
}: ProjectSheetProps) {
  const t = useTranslations('RealisationsPage.sheet');
  const tCategory = useTranslations('RealisationsPage.categoryDetails');
  const tDetail = useTranslations('RealisationsPage.detail');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project && !dialog.open) {
      dialog.showModal();
      setScrollLocked(true);
    } else if (!project && dialog.open) {
      dialog.close();
    }
  }, [project]);

  // Nouvelle fiche (précédente / suivante) : retour en haut.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [project?.id]);

  useEffect(() => () => setScrollLocked(false), []);

  const period = project
    ? project.yearEnd
      ? `${project.year}–${project.yearEnd}`
      : `${project.year}`
    : '';
  const duration = project?.yearEnd ? project.yearEnd - project.year + 1 : null;

  const facts = project
    ? [
        [t('period'), period],
        ...(duration ? [[t('duration'), t('years', { count: duration })]] : []),
        [t('client'), project.client],
        [t('type'), category?.label ?? project.category],
        ...(project.location ? [[t('location'), project.location]] : []),
      ]
    : [];

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setScrollLocked(false);
        onClose();
      }}
      onClick={(event) => {
        // Clic sur le fond (hors du panneau) : fermeture.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      aria-labelledby="project-sheet-title"
      className="project-sheet m-auto max-h-[92svh] w-[min(100%-2rem,960px)] overflow-hidden rounded-sheet bg-surface-elevated p-0 text-sand shadow-[0_40px_120px_-30px_rgba(6,22,27,0.8)] backdrop:bg-night-deep/75 backdrop:backdrop-blur-sm"
    >
      {project && (
        <div
          ref={bodyRef}
          className="max-h-[92svh] overflow-y-auto overscroll-contain"
          data-lenis-prevent
        >
          <div className="relative">
            <ProjectCover
              project={project}
              tag={category?.tag}
              sizes="(min-width: 960px) 960px, 100vw"
              className="h-56 md:h-72"
            />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t('close')}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-night/55 text-on-night backdrop-blur-md transition-colors hover:bg-on-night hover:text-night"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-10 p-7 sm:p-10 md:grid-cols-[1fr_240px] md:gap-14">
            <div>
              <p className="eyebrow">{t('eyebrow')}</p>
              <h2
                id="project-sheet-title"
                className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              >
                {project.client}
              </h2>

              <h3 className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                {t('mission')}
              </h3>
              <p className="mt-3 border-l-2 border-malachite pl-5 font-heading text-xl leading-snug">
                {project.mission}
              </p>
              {project.summary && (
                <p className="mt-6 text-sm leading-7 text-sand/80">
                  {project.summary}
                </p>
              )}

              <h3 className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                {t('nature', { type: category?.label ?? project.category })}
              </h3>
              <p className="mt-3 text-sm leading-7 text-sand/80">
                {tCategory(project.category)}
              </p>
              {project.slug && (
                <Link
                  href={`/realisations/${project.slug}`}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-sand px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-paper transition-opacity hover:opacity-85"
                >
                  {tDetail('openSheet')} <ArrowRight size={13} />
                </Link>
              )}
            </div>

            <aside className="md:border-l md:border-border-subtle md:pl-8">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-1">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold leading-6">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 rounded-card bg-paper-muted p-5">
                <p className="text-sm font-semibold leading-6">
                  {t('ctaTitle')}
                </p>
                <Link
                  href="/contact"
                  className="mt-3 inline-flex items-center gap-2 border-b border-sand/25 pb-0.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:border-sand"
                >
                  {t('cta')} <ArrowRight size={13} />
                </Link>
              </div>
            </aside>
          </div>

          <nav
            aria-label={t('navLabel')}
            className="grid grid-cols-2 border-t border-border-subtle"
          >
            {[
              {
                item: previous,
                label: t('previous'),
                icon: ArrowLeft,
                align: 'text-left',
              },
              {
                item: next,
                label: t('next'),
                icon: ArrowRight,
                align: 'text-right',
              },
            ].map(({ item, label, icon: Icon, align }, index) => (
              <button
                key={label}
                type="button"
                disabled={!item}
                onClick={() => item && onNavigate(item)}
                className={`group flex flex-col gap-1.5 px-7 py-6 transition-colors hover:bg-paper-muted disabled:pointer-events-none disabled:opacity-35 sm:px-10 ${align} ${index === 1 ? 'items-end border-l border-border-subtle' : 'items-start'}`}
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {index === 0 && <Icon size={12} />}
                  {label}
                  {index === 1 && <Icon size={12} />}
                </span>
                <span className="line-clamp-1 text-sm font-semibold">
                  {item?.client ?? '—'}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </dialog>
  );
}
