'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { NewsMeta } from '@/components/public/news-card';
import {
  NEWS_FALLBACK_IMAGE,
  formatNewsDate,
  type NewsItem,
} from '@/data/news';
import type { HomeNews } from '@/lib/news';
import { useInView } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Link } from '@/i18n/navigation';
import { ButtonLink, EmptyState, TextLink } from '@/components/public/ui';

/** Durée d'affichage d'une actualité avant de passer à la suivante (ms). */
const ROTATION_MS = 7000;

/**
 * « 04 · Actualités & publications » de l'Accueil — homepage uniquement.
 * Carnet de bord : un panneau « À la une » et un sommaire numéroté. Survoler
 * ou atteindre au clavier une ligne du sommaire l'affiche dans le panneau
 * (balayage de l'image) ; sans interaction, les actualités défilent seules.
 *
 * Données : lues côté serveur par `getHomeNews()` (`src/lib/news.ts`, futur
 * `GET /actualites`) et reçues en props — aucun appel API depuis le
 * navigateur. Normes : un seul lien par actualité dans le sommaire, `<time
 * dateTime>`, rotation automatique suspendable (WCAG 2.2.2), suspendue au
 * survol et au focus, désactivée si l'utilisateur réduit les animations ;
 * état vide explicite (blueprint/15 §3).
 */
export function NewsSection({ news }: { news: HomeNews }) {
  const t = useTranslations('News');
  const tPage = useTranslations('NewsPage');
  const locale = useLocale();
  const reducedMotion = useReducedMotion();

  const { items, categories } = news;
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Hors écran, la rotation s'arrête : elle re-rendait la section toutes
  // les 7 s et rejouait le balayage d'image pendant qu'on défilait ailleurs.
  const { ref: sectionRef, inView } = useInView<HTMLElement>();

  const rotating =
    items.length > 1 && !reducedMotion && !paused && !hovering && inView;

  const show = (index: number) => {
    if (index === active) return;
    setPrevious(active);
    setActive(index);
  };

  const current: NewsItem | undefined = items[active];

  return (
    <section
      ref={sectionRef}
      data-paused={!inView}
      aria-labelledby="home-news-title"
      className="bg-paper-muted px-6 py-24 text-sand md:px-16 md:py-32"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={<span id="home-news-title">{t('title')}</span>}
          />
          <div className="flex flex-col gap-5 md:items-end">
            {categories.length > 0 && (
              <nav aria-label={t('categoriesLabel')}>
                <ul className="flex flex-wrap gap-2 md:justify-end">
                  {categories.map(({ key, count }) => (
                    <li key={key}>
                      <Link
                        href={{
                          pathname: '/actualites',
                          query: { categorie: key },
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-sand/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-sand/75 transition-colors hover:border-sand hover:text-sand"
                      >
                        {tPage(`categories.${key}`)}
                        <span className="font-mono text-[10px] font-normal opacity-70">
                          {count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <TextLink
              href="/actualites"
              icon={ArrowRight}
              className="flex-none"
            >
              {t('viewAll')}
            </TextLink>
          </div>
        </div>

        {!current ? (
          <EmptyState
            message={t('empty')}
            action={
              <ButtonLink href="/documents" icon={ArrowRight}>
                {t('emptyCta')}
              </ButtonLink>
            }
          />
        ) : (
          <div
            className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-14"
            onPointerEnter={(e) =>
              e.pointerType === 'mouse' && setHovering(true)
            }
            onPointerLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget))
                setHovering(false);
            }}
            data-reveal
          >
            {/* À la une : l'actualité active */}
            <article className="tone-night group relative flex min-h-[520px] flex-col justify-end overflow-hidden rounded-sheet bg-night focus-within:ring-2 focus-within:ring-primary lg:min-h-[600px]">
              {items.map((item, index) => {
                const state =
                  index === active
                    ? 'z-20 [clip-path:inset(0_0_0_0)] transition-[clip-path] duration-[900ms] ease-[cubic-bezier(0.7,0,0.2,1)]'
                    : index === previous
                      ? 'z-10 [clip-path:inset(0_0_0_0)]'
                      : 'z-0 [clip-path:inset(0_100%_0_0)]';
                return (
                  <div
                    key={item.id}
                    className={`absolute inset-0 ${state}`}
                    aria-hidden="true"
                  >
                    <Image
                      src={item.image ?? NEWS_FALLBACK_IMAGE}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                    />
                  </div>
                );
              })}
              <div
                className="absolute inset-0 z-30 bg-linear-to-t from-night via-night/55 to-night/5"
                aria-hidden="true"
              />

              <span className="absolute left-5 top-5 z-40 inline-flex items-center gap-2 rounded-full bg-night/65 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-on-night backdrop-blur-md">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-malachite-bright" />
                {tPage('featured')}
              </span>

              <div
                key={current.id}
                className="register-row relative z-40 p-7 sm:p-10 lg:p-12"
              >
                <NewsMeta item={current} tone="night" />
                <h3 className="mt-5 max-w-2xl font-heading text-3xl font-bold leading-tight text-on-night sm:text-4xl">
                  {current.title}
                </h3>
                <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-7 text-on-night-muted sm:text-base">
                  {current.excerpt}
                </p>
                <Link
                  href={`/actualites/${current.id}`}
                  aria-label={t('readLabel', { title: current.title })}
                  className="mt-8 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-on-night outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {tPage('readMore')}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-on-night/25 transition-colors group-hover:border-malachite-bright group-hover:bg-malachite-bright group-hover:text-night">
                    <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </article>

            {/* Sommaire */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  {t('indexLabel')}
                </h3>
                {items.length > 1 && !reducedMotion && (
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={paused ? t('play') : t('pause')}
                    aria-pressed={paused}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-sand/20 text-sand transition-colors hover:border-sand"
                  >
                    {paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                )}
              </div>

              <ol>
                {items.map((item, index) => {
                  const isActive = index === active;
                  return (
                    <li
                      key={item.id}
                      className="relative border-b border-sand/15"
                    >
                      <Link
                        href={`/actualites/${item.id}`}
                        onPointerEnter={() => show(index)}
                        onFocus={() => show(index)}
                        aria-current={isActive ? 'true' : undefined}
                        className="group/row grid grid-cols-[2.5rem_1fr_auto] items-start gap-4 py-6 outline-none focus-visible:bg-paper"
                      >
                        <span
                          className={`font-heading text-2xl font-bold leading-none tabular-nums transition-colors ${
                            isActive
                              ? 'text-malachite'
                              : 'text-transparent [-webkit-text-stroke:1px_var(--color-sand)] opacity-40'
                          }`}
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <span className="flex flex-wrap items-center gap-x-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                            <span className="text-malachite">
                              {tPage(`categories.${item.category}`)}
                            </span>
                            <time dateTime={item.date}>
                              {formatNewsDate(item.date, locale)}
                            </time>
                          </span>
                          <span
                            className={`mt-2 block font-heading text-lg font-semibold leading-snug transition-colors ${
                              isActive ? 'text-sand' : 'text-sand/60'
                            } group-hover/row:text-sand`}
                          >
                            {item.title}
                          </span>
                        </span>
                        <ArrowUpRight
                          size={16}
                          className={`mt-1 transition-all duration-300 ${
                            isActive
                              ? 'text-sand opacity-100'
                              : 'text-muted opacity-0 group-hover/row:opacity-100'
                          }`}
                          aria-hidden="true"
                        />
                      </Link>

                      {/* Progression de la rotation automatique */}
                      {isActive && items.length > 1 && !reducedMotion && (
                        <span
                          className="absolute inset-x-0 -bottom-px h-[2px] overflow-hidden"
                          aria-hidden="true"
                        >
                          <span
                            key={`${item.id}-${active}`}
                            className="news-progress block h-full origin-left bg-linear-to-r from-primary via-malachite to-copper"
                            style={{
                              animationDuration: `${ROTATION_MS}ms`,
                              animationPlayState: rotating
                                ? 'running'
                                : 'paused',
                            }}
                            onAnimationEnd={() =>
                              show((active + 1) % items.length)
                            }
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              <Link
                href="/documents"
                className="group/doc mt-auto flex items-center justify-between gap-4 pt-8 text-sm text-sand/72 transition-colors hover:text-sand"
              >
                <span>{tPage('library.title')}</span>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border transition-colors group-hover/doc:border-sand group-hover/doc:bg-sand group-hover/doc:text-paper">
                  <ArrowRight size={14} />
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
