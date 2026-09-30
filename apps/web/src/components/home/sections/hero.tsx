'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ChevronDown, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useSectionActivity } from '@/hooks/useSectionActivity';

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
        <Image
          src="/assets/images/ewes-hero-cinematic.png"
          alt={t('imageAlt')}
          fill
          priority
          sizes="100vw"
          className="hero-cinematic-image object-cover"
        />
        <div className="hero-cloud hero-cloud-one" />
        <div className="hero-cloud hero-cloud-two" />
        <div className="hero-water-shimmer" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(213,228,234,.98)_0%,rgba(213,228,234,.89)_38%,rgba(213,228,234,.26)_72%,rgba(213,228,234,.16)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(213,228,234,.38),transparent_35%,rgba(181,208,219,.76))]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center">
        <div className="hero-enter max-w-4xl">
          <div className="eyebrow mb-6">{t('eyebrow')}</div>
          <h1 className="hero-title text-sand">
            {t('titleLine1')} <em>{t('titleHighlight')}</em>
          </h1>
          <p className="hero-lead mt-7 text-sand/75">{t('lead')}</p>

          <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="primary-button">
              {t('ctaContact')}
              <ArrowUpRight size={15} />
            </Link>
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
