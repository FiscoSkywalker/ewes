'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import type { Project } from '@/data/projects';
import { TextLink } from '@/components/public/ui';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Milestone {
  year: string;
  text: string;
}

/**
 * « 01 · À propos » de l'Accueil — homepage uniquement. Trois temps liés au
 * défilement :
 * 1. le récit d'origine s'écrit mot à mot (chaque mot passe d'estompé à net) ;
 * 2. la photo d'équipe s'ouvre comme un diaphragme jusqu'au plein cadre, et
 *    les chiffres clés s'y posent ;
 * 3. les repères (2008 → 2025) se lisent comme une règle graduée.
 * Contenus identiques à la page À propos (messages `HomeAbout`, `Research`,
 * `World`) ; les chiffres sont calculés à partir des données, jamais saisis.
 * Progression écrite en variables CSS (pas de re-rendu React) ; rendu serveur
 * et « animations réduites » : tout est affiché, net et ouvert.
 */
export function AboutSection({ projects }: { projects: Project[] }) {
  const t = useTranslations('HomeAbout');
  const tResearch = useTranslations('Research');
  const tWorld = useTranslations('World');

  const timeline = t.raw('timeline') as Milestone[];
  const objectives = tResearch.raw('items') as {
    title: string;
    text: string;
  }[];
  const operators = (tWorld.raw('clients') as string[]).length;
  const firstYear = Math.min(...projects.map((p) => p.year));
  const words = t('lead').split(' ');

  const stats = [
    { value: firstYear, label: t('stats.firstStudy'), plain: true },
    { value: projects.length, label: t('stats.missions') },
    { value: operators, label: t('stats.operators') },
    { value: 3, label: t('stats.poles') },
  ];

  const leadRef = useRef<HTMLParagraphElement>(null);
  const apertureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const lead = leadRef.current;
    const aperture = apertureRef.current;
    if (!lead || !aperture) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const triggers = [
      ScrollTrigger.create({
        trigger: lead,
        start: 'top 80%',
        end: 'bottom 45%',
        onUpdate: (self) =>
          lead.style.setProperty('--read', self.progress.toFixed(4)),
      }),
      ScrollTrigger.create({
        trigger: aperture,
        start: 'top 90%',
        end: 'center 55%',
        onUpdate: (self) =>
          aperture.style.setProperty('--open', self.progress.toFixed(4)),
      }),
    ];
    lead.style.setProperty('--read', triggers[0].progress.toFixed(4));
    aperture.style.setProperty('--open', triggers[1].progress.toFixed(4));

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      lead.style.setProperty('--read', '1');
      aperture.style.setProperty('--open', '1');
    };
  }, []);

  return (
    <section className="overflow-hidden bg-paper px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          className="max-w-4xl"
        />

        {/* 1 · Récit d'origine, écrit au fil du défilement */}
        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-24">
          <div>
            <p
              ref={leadRef}
              className="max-w-4xl font-heading text-2xl font-semibold leading-snug tracking-tight sm:text-3xl lg:text-[2.6rem] lg:leading-[1.2]"
              style={{ '--read': 1, '--words': words.length } as CSSProperties}
            >
              {words.map((word, index) => (
                // Pas de `transition` ici : l'opacité suit déjà le défilement
                // lissé par Lenis, et une transition relancée à chaque image
                // sur chaque mot ne faisait qu'ajouter du travail.
                <span
                  key={index}
                  style={{
                    opacity: `clamp(0.16, calc(var(--read) * (var(--words) + 4) - ${index}), 1)`,
                  }}
                >
                  {word}{' '}
                </span>
              ))}
            </p>
            <p
              className="mt-8 max-w-2xl text-sm leading-7 text-sand/72 sm:text-base"
              data-reveal
            >
              {t('text')}
            </p>
          </div>

          <aside className="pole-env self-end">
            <div
              className="border-l-[3px] border-malachite bg-paper-muted p-7"
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
            <TextLink href="/a-propos" icon={ArrowUpRight} className="mt-8">
              {t('moreLink')}
            </TextLink>
          </aside>
        </div>
      </div>

      {/* 2 · Diaphragme : la photo s'ouvre jusqu'au plein cadre */}
      <div
        ref={apertureRef}
        className="relative -mx-6 mt-20 md:-mx-16 lg:mt-28"
        style={
          {
            '--open': 1,
            clipPath:
              'inset(0 calc((1 - var(--open)) * 18%) round calc((1 - var(--open)) * 28px)',
          } as CSSProperties
        }
      >
        <figure className="relative aspect-[4/3] overflow-hidden bg-night md:aspect-[21/9]">
          <Image
            src="/assets/images/ewes-apropos-equipe.webp"
            alt={t('imageAlt')}
            fill
            sizes="100vw"
            className="object-cover will-change-transform"
            style={{ transform: 'scale(calc(1.18 - 0.18 * var(--open)))' }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-night/80 via-night/10 to-white/5" />
          <figcaption className="absolute left-6 top-6 rounded-full bg-paper/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sand backdrop-blur-sm md:left-16 md:top-8">
            {t('imageCaption')}
          </figcaption>
        </figure>

        {/* Chiffres clés : posés sur la photo (≥ md), dessous sur mobile */}
        <dl
          className="grid grid-cols-2 bg-night text-on-night md:absolute md:inset-x-0 md:bottom-0 md:grid-cols-4 md:bg-transparent md:px-16 md:pb-10"
          style={{ opacity: 'clamp(0, calc(var(--open) * 2.2 - 1.2), 1)' }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col border-on-night/15 px-6 py-6 md:px-6 md:py-0 md:first:pl-0 ${
                index % 2 === 0 ? 'border-r' : ''
              } ${index < 2 ? 'border-b md:border-b-0' : ''} md:border-r md:last:border-r-0`}
            >
              <dt className="order-2 mt-3 max-w-[16rem] font-mono text-[10px] uppercase leading-4 tracking-[0.1em] text-on-night-muted">
                {stat.label}
              </dt>
              <dd className="font-heading text-5xl font-bold tabular-nums tracking-tight sm:text-6xl lg:text-7xl">
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

      {/* 3 · Repères, comme une règle graduée */}
      <div className="pole-env mx-auto mt-20 w-full max-w-[1440px] lg:mt-28">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {t('timelineTitle')}
        </h3>
        <ol
          className="relative mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:before:absolute lg:before:inset-x-0 lg:before:top-[97px] lg:before:h-px lg:before:bg-sand/25"
          data-stagger
        >
          {timeline.map((item) => (
            <li key={item.year} className="relative lg:pr-10">
              <b className="block font-heading text-6xl font-bold leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--color-malachite)] lg:text-7xl">
                {item.year}
              </b>
              <span
                className="relative z-10 mt-5 block h-2.5 w-2.5 rotate-45 border-[1.5px] border-malachite bg-paper"
                aria-hidden
              />
              <p className="mt-4 max-w-xs text-[15px] leading-snug text-sand">
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
