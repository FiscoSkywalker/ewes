'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { PoleImage } from '@/components/public/pole-image';
import { scrollToElement } from '@/lib/smooth-scroll';

export const POLE_ANCHORS = {
  env: 'pole-environnement',
  eau: 'pole-eau',
  ing: 'pole-ingenierie',
} as const;

const POLE_CODES = { env: 'ENV', eau: 'H₂O', ing: 'ING' } as const;

/**
 * « 02 · Nos services » de l'Accueil — homepage uniquement. Colonne
 * stratigraphique des trois pôles (motif de légende, nombre de prestations),
 * qui sert de sommaire vers les chapitres ENV → H₂O → ING juste en dessous,
 * puis les publics servis par EWES.
 */
export function ServicesOverview() {
  const t = useTranslations('ServicesOverview');
  const tEnvironment = useTranslations('Environment');
  const tWater = useTranslations('Water');
  const tEngineering = useTranslations('Engineering');
  const tExpertises = useTranslations('Expertises');
  const audiences = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];

  const strata = [
    {
      pole: 'env' as const,
      count: t('services', {
        count: (tEnvironment.raw('services') as unknown[]).length,
      }),
    },
    {
      pole: 'eau' as const,
      count: t('services', {
        count: (tWater.raw('services') as unknown[]).length,
      }),
    },
    {
      pole: 'ing' as const,
      count: t('fields', {
        count: (tEngineering.raw('items') as unknown[]).length,
      }),
    },
  ];

  return (
    <section className="bg-paper-muted px-6 pb-8 pt-24 text-sand md:px-16 md:pt-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
          <p
            className="max-w-md text-sm leading-7 text-sand/72 md:justify-self-end"
            data-reveal
          >
            {t('aside')}
          </p>
        </div>

        <nav aria-label={t('indexLabel')} className="border-t border-sand">
          {strata.map(({ pole, count }) => (
            <a
              key={pole}
              href={`#${POLE_ANCHORS[pole]}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToElement(document.getElementById(POLE_ANCHORS[pole]));
              }}
              className={`pole-${pole} group relative flex items-center gap-4 border-b border-sand py-6 pl-14 pr-2 transition-colors hover:bg-paper md:gap-8 md:py-8 md:pl-32`}
            >
              <PoleImage pole={pole} />
              <span className="hidden w-14 font-mono text-xs text-pole md:block">
                {POLE_CODES[pole]}
              </span>
              <span className="section-title min-w-0 flex-1 text-3xl uppercase transition-transform duration-500 group-hover:translate-x-2 sm:text-5xl lg:text-6xl">
                {t(`poles.${pole}`)}
              </span>
              <span className="hidden font-mono text-xs text-muted sm:block">
                {count}
              </span>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-sand/25 transition-colors group-hover:border-pole group-hover:bg-pole group-hover:text-white">
                <ArrowDown size={16} />
              </span>
            </a>
          ))}
        </nav>

        <div className="mt-16">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {t('audiencesTitle')}
          </h3>
          <div
            className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            data-stagger
          >
            {audiences.map((item) => (
              <article
                key={item.title}
                className="border-t border-sand/30 pt-5"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-sand">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-sand/70">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
