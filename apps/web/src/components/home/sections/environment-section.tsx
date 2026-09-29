'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';
import { EnvironmentServicesList } from '@/components/public/environment-services-list';
import { POLE_ANCHORS } from './services-overview';

/** Chapitre ENV (Environnement) de l'Accueil, accent malachite — homepage uniquement. */
export function EnvironmentSection() {
  const t = useTranslations('Environment');

  return (
    <section
      id={POLE_ANCHORS.env}
      className="pole-env section-shell flex items-center bg-paper-muted pointer-events-none"
    >
      <div className="strata-core" />
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
        <figure
          className="relative min-h-[520px] overflow-hidden lg:min-h-[760px]"
          data-image-reveal
        >
          <Image
            src="/assets/images/ewes-environment-field.png"
            alt={t('imageAlt')}
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/35 via-transparent to-white/10" />
          <figcaption className="absolute bottom-0 right-0 bg-paper/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
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
