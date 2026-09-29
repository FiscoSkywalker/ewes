'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Building2, MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { Link } from '@/i18n/navigation';
import { EWES_CONTACT } from '@/data/contact';

/** Section "Qui sommes-nous" de l'Accueil — homepage uniquement. */
export function WorldSection() {
  const t = useTranslations('World');

  return (
    <section className="section-shell flex items-center bg-surface pointer-events-none">
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[.92fr_1.08fr]">
        <div>
          <div className="max-w-2xl">
            <SectionHeading
              eyebrow={t('eyebrow')}
              title={t('title')}
              description={t('description')}
            />
          </div>

          <div
            className="pointer-events-auto mt-12 max-w-4xl border-y border-sand/20"
            data-stagger
          >
            <div className="grid md:grid-cols-[1fr_1.4fr]">
              <div className="border-b border-sand/20 py-6 md:border-b-0 md:border-r md:pr-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <Building2 size={15} />
                  {t('hqLabel')}
                </div>
                <div className="mt-3 font-heading text-3xl font-semibold">
                  {t('hqCity')}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-sand/45">
                  {t('hqRegion')}
                </div>
              </div>
              <div className="py-6 md:pl-8">
                <p className="flex items-start gap-3 text-sm leading-6 text-sand/70">
                  <MapPin size={14} className="mt-1 shrink-0 text-primary" />
                  {t('addressLine1')}
                </p>
                <a
                  href={EWES_CONTACT.phoneHref}
                  className="mt-2 block pl-7 text-sm leading-6 text-sand/55 transition-colors hover:text-primary"
                >
                  {EWES_CONTACT.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-5 border-t border-sand/20 py-5 sm:flex-row sm:items-center">
              <p className="max-w-lg text-xs leading-5 text-sand/55">
                {t('networkLine')}
              </p>
              <Link
                href="/realisations"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary hover:text-sand"
              >
                {t('referenceMission')} <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <figure
          className="relative min-h-[460px] overflow-hidden lg:min-h-[680px]"
          data-image-reveal
        >
          <Image
            src="/assets/images/ewes-about-field-team.png"
            alt={t('imageAlt')}
            fill
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/35 via-transparent to-white/10" />
          <figcaption className="absolute bottom-0 left-0 bg-surface-elevated/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
            {t('imageCaption')}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
