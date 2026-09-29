'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { Link } from '@/i18n/navigation';
import type { Project } from '@/data/projects';

interface Milestone {
  year: string;
  text: string;
}

/**
 * « 01 · À propos » de l'Accueil — homepage uniquement. Récit d'origine,
 * repères, objectifs de recherche et chiffres clés. Les chiffres sont
 * calculés à partir des données (registre des réalisations, liste des
 * clients du profil) : aucun chiffre n'est saisi à la main.
 */
export function AboutSection() {
  const t = useTranslations('HomeAbout');
  const tResearch = useTranslations('Research');
  const tWorld = useTranslations('World');
  const tProjects = useTranslations('Projects');

  const timeline = t.raw('timeline') as Milestone[];
  const objectives = tResearch.raw('items') as {
    title: string;
    text: string;
  }[];
  const projects = tProjects.raw('items') as Project[];
  const operators = (tWorld.raw('clients') as string[]).length;
  const firstYear = Math.min(...projects.map((p) => p.year));

  const stats = [
    { value: firstYear, label: t('stats.firstStudy'), plain: true },
    { value: projects.length, label: t('stats.missions') },
    { value: operators, label: t('stats.operators') },
    { value: 3, label: t('stats.poles') },
  ];

  return (
    <section className="bg-paper px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          className="max-w-4xl"
        />

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-24">
          <div>
            <p
              className="max-w-3xl text-xl leading-snug text-sand sm:text-2xl"
              data-reveal
            >
              {t('lead')}
            </p>
            <p
              className="mt-6 max-w-2xl text-sm leading-7 text-sand/72 sm:text-base"
              data-reveal
            >
              {t('text')}
            </p>

            <figure
              className="relative mt-10 aspect-[3/2] overflow-hidden"
              data-image-reveal
            >
              <Image
                src="/assets/images/ewes-about-field-team.png"
                alt={t('imageAlt')}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/30 via-transparent to-white/10" />
              <figcaption className="absolute bottom-0 left-0 bg-paper/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
                {t('imageCaption')}
              </figcaption>
            </figure>
          </div>

          <aside className="pole-env">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {t('timelineTitle')}
            </h3>
            <ol className="relative mt-6 grid gap-7 pl-7 before:absolute before:bottom-2 before:left-1 before:top-2 before:w-px before:bg-sand/25">
              {timeline.map((item) => (
                <li
                  key={item.year}
                  className="relative before:absolute before:-left-7 before:top-1.5 before:h-2.5 before:w-2.5 before:rotate-45 before:border-[1.5px] before:border-malachite before:bg-paper"
                  data-reveal
                >
                  <b className="block font-mono text-xs font-medium text-malachite">
                    {item.year}
                  </b>
                  <p className="mt-1 text-[15px] leading-snug text-sand">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>

            <div
              className="mt-12 border-l-[3px] border-malachite bg-paper-muted p-7"
              data-reveal
            >
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {t('objectivesTitle')}
              </h3>
              <ol className="mt-5 grid gap-3.5">
                {objectives.map((item, index) => (
                  <li
                    key={item.title}
                    className="grid grid-cols-[32px_1fr] text-sm leading-6 text-sand/85"
                  >
                    <span className="font-mono text-[11px] leading-6 text-malachite">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ol>
            </div>

            <Link
              href="/a-propos"
              className="mt-8 inline-flex items-center gap-2 border-b border-sand/25 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-sand transition-colors hover:border-sand"
            >
              {t('moreLink')} <ArrowUpRight size={14} />
            </Link>
          </aside>
        </div>

        <dl className="mt-20 grid grid-cols-2 border-t border-sand lg:mt-28 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`border-b border-sand/15 py-6 pr-4 ${
                index % 2 === 0 ? 'border-r' : 'pl-4'
              } lg:border-b-0 lg:border-r lg:px-6 lg:pb-0 lg:first:pl-0 lg:last:border-r-0`}
            >
              <dt className="min-h-[2.6em] font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {stat.label}
              </dt>
              <dd className="mt-3 font-heading text-5xl font-bold tabular-nums text-sand sm:text-6xl lg:text-7xl">
                <span
                  data-counter={stat.value}
                  {...(stat.plain ? { 'data-counter-plain': '' } : {})}
                >
                  {stat.value}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
