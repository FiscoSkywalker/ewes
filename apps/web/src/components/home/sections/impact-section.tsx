'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ImpactMetric } from '@/data/metrics';
import { SectionHeading } from '@/components/public/section-heading';

/** Section "Notre impact" de l'Accueil (chiffres clés) — homepage uniquement. */
export function ImpactSection() {
  const t = useTranslations('Impact');
  const tMetrics = useTranslations('Metrics');
  const metrics = tMetrics.raw('items') as ImpactMetric[];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#dce9ee] px-6 py-28 md:px-16">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.95fr_1.05fr]">
        <div className="relative min-h-[580px] lg:min-h-[720px]" data-reveal>
          <figure
            className="absolute left-0 top-0 h-[67%] w-[88%] overflow-hidden"
            data-image-reveal
          >
            <Image
              src="/assets/images/ewes-impact-community.png"
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1024px) 42vw, 88vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/28 via-transparent to-white/10" />
          </figure>

          <div className="absolute bottom-0 right-0 z-10 h-[68%] w-[52%]">
            <Image
              src="/assets/images/ewes-engineer-cutout-clean.png"
              alt={t('cutoutAlt')}
              fill
              sizes="(min-width: 1024px) 26vw, 52vw"
              className="object-contain object-bottom"
            />
          </div>

          <div className="absolute bottom-[25%] left-[6%] z-20 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-surface-elevated text-center shadow-[0_18px_55px_rgba(41,83,100,.18)]">
            <strong
              className="font-heading text-4xl font-bold text-primary"
              data-counter={t('badgeValue')}
            >
              {t('badgeValue')}
            </strong>
            <span className="mt-1 max-w-[80px] text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-sand/55">
              {t('badgeLabel')}
            </span>
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />

          <div
            className="mt-10 grid border-t border-sand/20 sm:grid-cols-2"
            data-stagger
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-b border-sand/20 py-5 sm:odd:pr-6 sm:even:border-l sm:even:pl-6"
              >
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-heading text-4xl font-bold text-primary"
                    data-counter={metric.value}
                  >
                    {metric.value}
                  </span>
                  <span className="font-heading text-lg font-semibold text-primary">
                    {metric.suffix}
                  </span>
                </div>
                <h3 className="mt-1 font-heading text-base font-semibold leading-tight text-sand">
                  {metric.label}
                </h3>
                <p className="mt-1 text-[10px] leading-4 text-sand/48">
                  {metric.subtext}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
