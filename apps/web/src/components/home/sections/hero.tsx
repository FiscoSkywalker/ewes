'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpRight, ChevronDown, MapPin, ShieldCheck } from 'lucide-react';
import { useSectionActivity } from '@/hooks/useSectionActivity';
import { ButtonLink } from '@/components/public/ui';

interface HeroProps {
  onExplore: () => void;
}

/** Premier écran de l'Accueil — homepage uniquement. */
export function Hero({ onExplore }: HeroProps) {
  const t = useTranslations('Hero');
  const { ref, active } = useSectionActivity<HTMLElement>();

  return (
    <section
      ref={ref}
      data-paused={!active}
      className="relative flex min-h-[112svh] flex-col justify-end overflow-hidden px-6 pb-6 pt-32 md:px-16"
    >
      <div className="absolute inset-0 overflow-hidden" data-parallax-media>
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/assets/images/ewes-hero-mobile.webp"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/ewes-hero-cinematic.webp"
            alt={t('imageAlt')}
            fetchPriority="high"
            className="hero-cinematic-image absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <div className="hero-cloud hero-cloud-one" />
        <div className="hero-cloud hero-cloud-two" />
        <div className="hero-water-shimmer" />
      </div>
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(213,228,234,.98)_0%,rgba(213,228,234,.89)_38%,rgba(213,228,234,.26)_72%,rgba(213,228,234,.16)_100%)] md:block" />
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(213,228,234,.38),transparent_35%,rgba(181,208,219,.76))] md:block" />
      {/* Mobile : voile vertical (le texte occupe toute la largeur) qui finit exactement sur la couleur du fond, sans ligne de raccord. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(213,228,234,.5)_0%,rgba(213,228,234,.82)_30%,rgba(213,228,234,.9)_65%,rgb(213,228,234)_100%)] md:hidden" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center">
        <div className="hero-enter max-w-4xl">
          <div className="eyebrow mb-6">{t('eyebrow')}</div>
          <h1 className="hero-title text-sand">
            {t('titleLine1')} <em>{t('titleHighlight')}</em>
          </h1>
          <p className="hero-lead mt-7 text-sand/75">{t('lead')}</p>

          <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact" icon={ArrowUpRight}>
              {t('ctaContact')}
            </ButtonLink>
            <div className="flex items-center gap-3 border-l border-sand/25 px-5 py-3 text-xs text-sand/70">
              <ShieldCheck size={16} className="text-primary" />
              {t('shieldLabel')}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-8 flex w-full max-w-[1440px] items-center justify-between border-t border-sand/12 pt-5 text-[11px] uppercase tracking-[0.16em] text-sand/55">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-primary" />
          {t('locationLabel')}
        </div>
        <button
          type="button"
          onClick={onExplore}
          className="pointer-events-auto hidden items-center gap-2 transition-colors hover:text-primary sm:flex"
        >
          {t('scrollLabel')}
          <ChevronDown size={14} />
        </button>
      </div>
    </section>
  );
}
