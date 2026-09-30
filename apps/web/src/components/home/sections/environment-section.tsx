'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';
import { EnvironmentServicesList } from '@/components/public/environment-services-list';
import { POLE_ANCHORS } from './services-overview';

/** Chapitre ENV (Environnement) de l'Accueil, accent malachite — homepage uniquement. */
export function EnvironmentSection() {
  const t = useTranslations('Environment');
  const figureRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // IntersectionObserver plutôt que ScrollTrigger : insensible aux décalages de
  // mise en page (polices, images au-dessus) qui faussaient la position de
  // déclenchement et faisaient arriver la photo en retard. Marge de 25 % pour
  // lancer le dévoilement avant que la photo n'entre à l'écran.
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px 25% 0px' },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={POLE_ANCHORS.env}
      className="pole-env section-shell flex items-center bg-paper-muted pointer-events-none"
    >
      <div className="strata-core" />
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
        <figure
          ref={figureRef}
          data-inview={inView}
          className="soft-reveal relative min-h-[520px] overflow-hidden bg-paper lg:min-h-[760px]"
        >
          <div className="soft-reveal-mask absolute inset-0">
            <div className="soft-reveal-media absolute inset-0">
              {/* Parallaxe au défilement (desktop) puis dérive lente de la « caméra ». */}
              <div
                className="absolute inset-x-0 inset-y-[-9%]"
                data-section-parallax
              >
                <div className="hero-cinematic-image absolute inset-0">
                  <Image
                    src="/assets/images/ewes-environment-terrain.webp"
                    alt={t('imageAlt')}
                    fill
                    loading="eager"
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/55 via-transparent to-malachite/15 mix-blend-multiply" />
            <div className="absolute inset-0 bg-linear-to-b from-white/15 via-transparent to-transparent" />
            <div className="pointer-events-none absolute left-4 top-4 h-10 w-10 border-l-2 border-t-2 border-white/70" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 border-b-2 border-l-2 border-white/70" />
          </div>
          <figcaption className="soft-reveal-caption absolute bottom-0 right-0 bg-paper/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
            {t('imageCaption')}
          </figcaption>
        </figure>

        <div className="ml-auto max-w-3xl">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
          <EnvironmentServicesList />
        </div>
      </div>
    </section>
  );
}
