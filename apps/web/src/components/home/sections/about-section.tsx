import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { TextLink } from '@/components/public/ui';

export interface HomeStats {
  year: number;
  missions: number;
  operators: number;
  poles: number;
}

/**
 * « 01 · Qui est EWES » de l'Accueil — homepage uniquement. Présentation en
 * deux ou trois lignes, photo d'équipe et quatre chiffres clés sur fond uni
 * (jamais posés sur la photo). Les objectifs de recherche et les repères
 * historiques se lisent sur la page À propos et dans les réalisations.
 * Chiffres calculés à partir des données, jamais saisis ; seules les
 * quantités s'animent (l'année de création est affichée telle quelle).
 */
export function AboutSection({ stats }: { stats: HomeStats }) {
  const t = useTranslations('HomeSections');
  const tAbout = useTranslations('HomeAbout');

  const figures = [
    { value: stats.year, label: tAbout('stats.founded'), animate: false },
    { value: stats.missions, label: tAbout('stats.missions'), animate: true },
    { value: stats.operators, label: tAbout('stats.operators'), animate: true },
    { value: stats.poles, label: tAbout('stats.poles'), animate: true },
  ];

  return (
    <section
      id="qui-est-ewes"
      className="scroll-mt-20 bg-paper px-6 py-14 text-sand md:px-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow={t('aboutEyebrow')}
              title={t('aboutTitle')}
            />
            <p
              className="mt-6 max-w-2xl text-base leading-8 text-sand/85"
              data-reveal
            >
              {t('aboutText')}
            </p>
            <TextLink href="/a-propos" icon={ArrowUpRight} className="mt-7">
              {t('aboutLink')}
            </TextLink>
          </div>

          <figure className="relative aspect-[16/9] overflow-hidden rounded-sheet bg-night sm:aspect-[3/2]">
            <Image
              src="/assets/images/ewes-photo-equipe-terrain.jpg"
              alt={tAbout('imageAlt')}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </figure>
        </div>

        <dl className="mt-12 grid grid-cols-2 overflow-hidden rounded-sheet bg-night text-on-night md:grid-cols-4">
          {figures.map((figure, index) => (
            <div
              key={figure.label}
              className={`flex flex-col border-on-night/15 px-6 py-7 md:px-8 ${
                index % 2 === 0 ? 'border-r' : ''
              } ${index < 2 ? 'border-b md:border-b-0' : ''} md:border-r md:last:border-r-0`}
            >
              <dt className="order-2 mt-2 font-mono text-xs uppercase leading-5 tracking-[0.08em] text-on-night-muted">
                {figure.label}
              </dt>
              <dd className="font-heading text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                {figure.animate ? (
                  <span data-counter={figure.value}>{figure.value}</span>
                ) : (
                  figure.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
