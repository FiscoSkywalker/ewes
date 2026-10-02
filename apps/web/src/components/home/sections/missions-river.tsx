'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import {
  projectYear,
  type Project,
  type ProjectCategoryOption,
} from '@/data/projects';
import { ProjectCover } from '@/components/public/project-cover';
import { Link } from '@/i18n/navigation';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Pas horizontal entre deux missions sur la rivière (px). */
const STEP = 170;
/** Largeur d'une carte (les cartes alternent au-dessus / au-dessous). */
const CARD_W = 300;
/** Hauteur de la bande de la rivière (px). */
const BAND = 100;
/** Écart entre la bande et les cartes (px). */
const GAP = 14;
/** Position du « front » de lecture dans la fenêtre (part de la largeur). */
const FRONT = 0.62;
/**
 * Défilement vertical consommé par px de déplacement horizontal. 0,4 :
 * ~1 950 px de section figée sur un écran de 1440 px (deux écrans) ; à 0,8,
 * la phase figée (~3 900 px) donnait l'impression d'une page bloquée.
 */
const SCROLL_RATIO = 0.4;

/** Méandre de la rivière : ordonnée (dans la bande) pour une abscisse. */
const riverY = (x: number) =>
  BAND / 2 + 22 * Math.sin(x / 95) + 8 * Math.sin(x / 37 + 1);

/**
 * « 03 · Nos réalisations » de l'Accueil — homepage uniquement. Les missions
 * du registre (mêmes données, mêmes couvertures que /realisations), dans
 * l'ordre chronologique, posées le long d'une rivière qui se dessine au fil
 * du défilement : un point = une mission, comme la frise de la page
 * Réalisations. Chaque carte ouvre sa fiche sur /realisations (`#id`).
 *
 * Grand écran : la section se fige et le défilement vertical fait avancer la
 * frise (ScrollTrigger, écritures directes dans le DOM — pas de re-rendu à
 * chaque image). Mobile et « animations réduites » : frise à faire glisser
 * horizontalement, même rendu. Rendu serveur : tout est affiché, atteint.
 */
export function MissionsRiver({ projects }: { projects: Project[] }) {
  const t = useTranslations('Projects');
  const tRiver = useTranslations('Projects.river');
  const categories = t.raw('categories') as ProjectCategoryOption[];

  const missions = useMemo(
    () =>
      [...projects].sort(
        (a, b) => projectYear(a) - projectYear(b) || a.year - b.year,
      ),
    [projects],
  );
  const tagByKey = useMemo(
    () => new Map(categories.map((c) => [c.key, c.tag])),
    [categories],
  );

  const firstYear = projectYear(missions[0]);
  const lastYear = projectYear(missions[missions.length - 1]);
  const stripWidth = missions.length * STEP;
  const dots = missions.map((project, index) => {
    const x = index * STEP + STEP / 2;
    const y = riverY(x);
    const previous = missions[index - 1];
    return {
      project,
      x,
      y,
      above: index % 2 === 0,
      newYear: !previous || projectYear(previous) !== projectYear(project),
    };
  });
  const riverPath = useMemo(() => {
    const points: string[] = [];
    for (let x = 0; x <= stripWidth; x += 8)
      points.push(`${x},${riverY(x).toFixed(1)}`);
    return `M${points.join('L')}`;
  }, [stripWidth]);

  const [pinned, setPinned] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const flowRef = useRef<SVGPathElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);

  // Mode figé réservé aux grands écrans sans préférence « animations réduites ».
  useLayoutEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPinned(wide.matches && !reduced.matches);
    sync();
    wide.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      wide.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const strip = stripRef.current;
    if (!section || !viewport || !track || !strip) return;

    const items = Array.from(
      strip.querySelectorAll<HTMLElement>('[data-mission]'),
    );
    let lastReached = -1;

    // Position du front dans la frise, mesurée hors de la boucle de
    // défilement : lire `clientWidth`/`offsetLeft` juste après avoir écrit
    // une transformation forçait une mise en page synchrone à chaque image.
    let frontOffset = 0;
    const measureFront = () => {
      frontOffset = viewport.clientWidth * FRONT - strip.offsetLeft;
    };
    measureFront();

    /**
     * Met la frise à jour pour un décalage horizontal donné (px). Les
     * écritures visent l'élément concerné (tracé, barre) et non un ancêtre :
     * une variable CSS posée sur la frise recalculait le style de ses 34
     * cartes à chaque image.
     */
    const update = (shift: number) => {
      const front = shift + frontOffset;
      const progress = Math.min(1, Math.max(0, front / stripWidth));
      if (flowRef.current)
        flowRef.current.style.strokeDashoffset = (1 - progress).toFixed(4);
      const reached = Math.max(
        0,
        Math.min(missions.length, Math.floor((front - STEP / 2) / STEP) + 1),
      );
      if (reached === lastReached) return;
      lastReached = reached;
      items.forEach((item) => {
        item.dataset.reached = String(Number(item.dataset.mission) < reached);
      });
      const current = missions[Math.max(0, reached - 1)];
      if (yearRef.current)
        yearRef.current.textContent = String(projectYear(current));
      if (countRef.current) countRef.current.textContent = String(reached);
    };

    const resetAll = () => {
      track.style.transform = '';
      section.style.height = '';
      if (flowRef.current) flowRef.current.style.strokeDashoffset = '0';
      items.forEach((item) => {
        item.dataset.reached = 'true';
      });
      if (yearRef.current) yearRef.current.textContent = String(lastYear);
      if (countRef.current)
        countRef.current.textContent = String(missions.length);
    };

    if (!pinned) {
      // Frise à faire glisser : le front suit le défilement horizontal.
      const onScroll = () => update(viewport.scrollLeft);
      const onResize = () => {
        measureFront();
        onScroll();
      };
      viewport.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      onScroll();
      return () => {
        viewport.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        resetAll();
      };
    }

    let overflow = 0;
    const measure = () => {
      overflow = Math.max(0, track.scrollWidth - viewport.clientWidth);
      section.style.height = `${overflow * SCROLL_RATIO + window.innerHeight}px`;
      measureFront();
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    const advance = (progress: number) => {
      const shift = progress * overflow;
      track.style.transform = `translate3d(${-shift}px,0,0)`;
      if (progressBarRef.current)
        progressBarRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      update(shift);
    };

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => advance(self.progress),
    });
    advance(trigger.progress);
    // La hauteur de la section a changé : recalcule les déclencheurs suivants.
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      trigger.kill();
      resetAll();
      ScrollTrigger.refresh();
    };
  }, [pinned, missions, stripWidth, lastYear]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="missions-river-title"
      className="relative bg-paper text-sand"
    >
      <div
        className={`flex flex-col overflow-hidden ${
          pinned ? 'sticky top-0 h-svh pb-8 pt-24' : 'py-24 md:py-32'
        }`}
      >
        {/* En-tête : titre + compteur */}
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-6 md:grid-cols-[1fr_auto] md:items-end md:px-16">
          <div>
            <p className="eyebrow mb-4">{t('eyebrow')}</p>
            <h2
              id="missions-river-title"
              className="section-title text-4xl sm:text-5xl lg:text-6xl"
            >
              {tRiver('title')}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-sand/72 [@media(max-height:760px)]:hidden">
              {tRiver('description')}
            </p>
          </div>

          <div className="flex items-end gap-5 md:justify-end" aria-hidden>
            <span
              ref={yearRef}
              className="font-heading text-6xl font-bold leading-none tracking-tight text-transparent tabular-nums [-webkit-text-stroke:1.5px_var(--color-sand)] lg:text-8xl"
            >
              {lastYear}
            </span>
            <span className="pb-1.5 font-mono text-[10px] uppercase leading-5 tracking-[0.14em] text-muted">
              <span className="block font-heading text-3xl font-bold normal-case leading-none tracking-tight text-sand tabular-nums">
                <span ref={countRef}>{missions.length}</span>
                <span className="text-muted">/{missions.length}</span>
              </span>
              {tRiver('counter', { from: String(firstYear) })}
            </span>
          </div>
        </div>

        {/* Frise */}
        <div
          ref={viewportRef}
          className={`relative mt-8 ${
            pinned
              ? 'min-h-0 flex-1 overflow-hidden'
              : 'h-[600px] overflow-x-auto overflow-y-hidden [scrollbar-width:thin]'
          }`}
          data-lenis-prevent={pinned ? undefined : true}
        >
          <div
            ref={trackRef}
            className="flex h-full w-max items-stretch pl-6 pr-6 will-change-transform md:pl-16 md:pr-16"
          >
            <div
              ref={stripRef}
              className="relative h-full flex-none"
              style={{ width: stripWidth }}
            >
              {/* Rivière */}
              <svg
                width={stripWidth}
                height={BAND}
                viewBox={`0 0 ${stripWidth} ${BAND}`}
                className="absolute left-0 top-1/2 -translate-y-1/2 overflow-visible"
                aria-hidden
              >
                <defs>
                  <linearGradient id="missions-river-flow" x1="0" x2="1">
                    <stop offset="0" stopColor="var(--color-primary)" />
                    <stop offset="0.7" stopColor="var(--color-malachite)" />
                    <stop offset="1" stopColor="var(--color-copper)" />
                  </linearGradient>
                </defs>
                <path
                  d={riverPath}
                  fill="none"
                  stroke="var(--color-water)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  opacity="0.22"
                />
                <path
                  d={riverPath}
                  fill="none"
                  stroke="var(--color-sand)"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                  opacity="0.3"
                />
                <path
                  ref={flowRef}
                  d={riverPath}
                  fill="none"
                  stroke="url(#missions-river-flow)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={0}
                />
              </svg>

              {dots.map(({ project, x, y, above, newYear }, index) => {
                const period = project.yearEnd
                  ? `${project.year}–${project.yearEnd}`
                  : project.year;
                const bandTop = `calc(50% - ${BAND / 2}px)`;
                return (
                  <div
                    key={project.id}
                    data-mission={index}
                    data-reached="true"
                    className="group"
                  >
                    {/* Point + trait vers la carte */}
                    <span
                      className="absolute w-px bg-sand/20 transition-colors duration-500 group-data-[reached=true]:bg-primary/50"
                      style={{
                        left: x,
                        top: above
                          ? `calc(50% - ${BAND / 2 + GAP}px)`
                          : `calc(${bandTop} + ${y}px)`,
                        height: above ? GAP + y : BAND - y + GAP,
                      }}
                      aria-hidden
                    />
                    <span
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sand/30 bg-paper transition-all duration-500 group-data-[reached=true]:scale-125 group-data-[reached=true]:border-malachite group-data-[reached=true]:bg-malachite group-data-[reached=true]:shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-malachite)_18%,transparent)]"
                      style={{ left: x, top: `calc(${bandTop} + ${y}px)` }}
                      aria-hidden
                    />
                    {newYear && (
                      <span
                        className="absolute -translate-x-1/2 rounded-full bg-sand px-2 py-0.5 font-mono text-[10px] font-bold text-paper transition-opacity duration-500 group-data-[reached=false]:opacity-30"
                        style={{
                          left: x,
                          top: `calc(${bandTop} + ${above ? y + 12 : y - 30}px)`,
                        }}
                        aria-hidden
                      >
                        {projectYear(project)}
                      </span>
                    )}

                    {/* Carte */}
                    <Link
                      href={`/realisations#${project.id}`}
                      aria-label={tRiver('openLabel', {
                        client: project.client,
                        year: String(period),
                      })}
                      className="absolute flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-elevated shadow-[0_20px_40px_-30px_rgba(21,52,66,0.5)] transition-[opacity,translate,box-shadow,border-color] duration-700 ease-out hover:z-10 hover:border-border hover:shadow-[0_28px_56px_-28px_rgba(21,52,66,0.6)] group-data-[reached=false]:translate-y-3 group-data-[reached=false]:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      style={{
                        left: x - CARD_W / 2,
                        width: CARD_W,
                        height: `min(calc(50% - ${BAND / 2 + GAP}px), 290px)`,
                        ...(above
                          ? { bottom: `calc(50% + ${BAND / 2 + GAP}px)` }
                          : { top: `calc(50% + ${BAND / 2 + GAP}px)` }),
                      }}
                    >
                      <ProjectCover
                        project={project}
                        tag={tagByKey.get(project.category)}
                        sizes={`${CARD_W}px`}
                        className="min-h-12 w-full flex-1"
                      />
                      <span className="flex flex-none flex-col gap-1 p-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-malachite">
                          {period}
                        </span>
                        <span className="line-clamp-1 font-heading text-base font-bold leading-tight text-sand">
                          {project.client}
                        </span>
                        <span className="line-clamp-2 text-xs leading-5 text-sand/65">
                          {project.mission}
                        </span>
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Arrivée — décalée du débordement de la dernière carte hors de la frise. */}
            <div
              className="flex w-[380px] flex-none flex-col justify-center pl-16"
              style={{ marginLeft: (CARD_W - STEP) / 2 }}
            >
              <p className="font-heading text-3xl font-bold leading-tight tracking-tight">
                {tRiver('endTitle', {
                  count: missions.length,
                  from: String(firstYear),
                  to: String(lastYear),
                })}
              </p>
              <p className="mt-3 text-sm leading-6 text-sand/65">
                {tRiver('endText')}
              </p>
              <div className="mt-8 flex flex-col items-start gap-4">
                <Link href="/realisations" className="primary-button">
                  {t('viewAll')} <ArrowRight size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="border-b border-sand/25 pb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:border-sand hover:text-sand"
                >
                  {tRiver('contactCta')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Pied : consigne + progression */}
        <div className="mx-auto mt-6 flex w-full max-w-[1440px] items-center gap-6 px-6 md:px-16">
          <p className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {pinned ? tRiver('scrollHint') : tRiver('swipeHint')}
          </p>
          {pinned && (
            <span className="relative h-[2px] flex-1 overflow-hidden bg-border-subtle">
              <span
                ref={progressBarRef}
                className="absolute inset-0 origin-left bg-linear-to-r from-primary via-malachite to-copper"
                style={{ transform: 'scaleX(0)' }}
              />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
