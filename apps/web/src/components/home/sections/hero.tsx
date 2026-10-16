'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowUpRight, ChevronDown, MapPin } from 'lucide-react';
import { useSectionActivity } from '@/hooks/useSectionActivity';
import { ButtonLink, TextLink } from '@/components/public/ui';
import { scrollToElement } from '@/lib/smooth-scroll';

interface HeroProps {
  /** Paragraphe d'accroche, piloté depuis le portail (page « accueil »). */
  lead: string;
  /** Ligne de preuve, calculée à partir des mêmes données que le reste du site. */
  proof: { year: number; missions: number; operators: number };
  /** Section vers laquelle mène « Faire défiler ». */
  exploreTargetId: string;
}

/**
 * Premier écran de l'Accueil — homepage uniquement. Dit en cinq secondes qui
 * est EWES : petit titre (métier + lieu), titre, sous-titre explicite, deux
 * actions et une ligne de preuve chiffrée.
 *
 * Voile latéral (≥ md) : plein derrière le texte, transparent à partir de
 * ~55 % de la largeur, pour que la photo de terrain reste lisible à droite.
 * Mobile : la photo occupe un bloc à part sous le texte (aucun texte posé sur
 * l'image), ce qui garantit le contraste sans voiler la photo.
 */
export function Hero({ lead, proof, exploreTargetId }: HeroProps) {
  const t = useTranslations('Hero');
  const { ref, active } = useSectionActivity<HTMLElement>();

  return (
    <section
      ref={ref}
      data-paused={!active}
      className="relative flex flex-col overflow-hidden bg-background md:min-h-svh md:justify-end md:px-16 md:pb-6 md:pt-32"
    >
      <div
        className="relative order-2 aspect-[16/9] overflow-hidden md:absolute md:inset-0 md:order-none md:aspect-auto"
        data-parallax-media
      >
        {/* Même photo sur tous les écrans, redimensionnée et convertie
            (WebP/AVIF) par l'optimiseur de Next : c'est l'élément LCP. */}
        <Image
          src="/assets/images/ewes-photo-site-minier.jpg"
          alt={t('imageAlt')}
          fill
          // `priority` est déprécié depuis Next 16 et ne relève plus la
          // priorité réseau : l'image partait en priorité basse.
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="hero-cinematic-image object-cover"
        />
        <div className="hero-cloud hero-cloud-one" />
        <div className="hero-cloud hero-cloud-two" />
        <div className="hero-water-shimmer" />
      </div>
      {/* Voile latéral : opaque sous le texte, nul au-delà de ~55 % de la largeur. */}
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(213,228,234)_0%,rgba(213,228,234,.96)_34%,rgba(213,228,234,.7)_45%,rgba(213,228,234,0)_56%)] md:block" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center px-6 pb-10 pt-28 md:px-0 md:pb-0 md:pt-0">
        <div className="hero-enter max-w-[46rem]">
          <p className="eyebrow mb-6 [--pole:var(--color-primary-deep)]">
            {t('eyebrow')}
          </p>
          <h1 className="hero-title text-sand">
            {t('titleLine1')} <em>{t('titleHighlight')}</em>
          </h1>
          <p className="hero-lead mt-7 text-sand/85">{lead}</p>

          <div className="pointer-events-auto mt-8 flex flex-col items-start gap-x-7 gap-y-4 sm:flex-row sm:items-center">
            <ButtonLink href="/contact" icon={ArrowUpRight}>
              {t('ctaContact')}
            </ButtonLink>
            <TextLink href="/services" icon={ArrowRight}>
              {t('ctaServices')}
            </TextLink>
          </div>

          <p className="mt-8 border-t border-sand/20 pt-4 font-mono text-xs uppercase tracking-[0.08em] text-sand">
            {t('proof', proof)}
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-8 hidden w-full max-w-[1440px] items-center justify-between border-t border-sand/20 pt-5 text-xs uppercase tracking-[0.1em] text-sand md:flex">
        <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1">
          <MapPin size={13} className="text-primary" aria-hidden="true" />
          {t('locationLabel')}
        </div>
        <button
          type="button"
          onClick={() =>
            scrollToElement(document.getElementById(exploreTargetId))
          }
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 transition-colors hover:text-primary"
        >
          {t('scrollLabel')}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
