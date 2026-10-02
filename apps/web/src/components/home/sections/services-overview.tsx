'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  GraduationCap,
  Landmark,
  Pickaxe,
} from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import {
  SERVICE_POLES,
  usePoleCount,
  type PoleContent,
  type ServicePole,
} from '@/components/public/service-chapter';
import { Link } from '@/i18n/navigation';
import { scrollToElement } from '@/lib/smooth-scroll';
import { TextLink } from '@/components/public/ui';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const POLE_ANCHORS = {
  env: 'pole-environnement',
  eau: 'pole-eau',
  ing: 'pole-ingenierie',
} as const;

const POLES: ServicePole[] = ['env', 'eau', 'ing'];
const AUDIENCE_ICONS = [Pickaxe, Landmark, GraduationCap, FlaskConical];

/** Prestation telle que stockée dans les messages (le pôle Eau utilise `desc`). */
interface RawService {
  title: string;
}

/**
 * Planche d'un pôle : repère sur la ligne qui relie les pôles, index et code,
 * illustration (qui se dépose de bas en haut, comme une couche sédimentaire,
 * selon `--layer`), bande à motif du pôle, puis accroche et liens. Au survol
 * ou au focus clavier, la liste des prestations remonte sur l'illustration.
 */
function PolePlate({
  pole,
  index,
  relation,
  data,
}: {
  pole: ServicePole;
  index: number;
  relation?: string;
  data?: PoleContent;
}) {
  const t = useTranslations('ServicesOverview');
  const config = SERVICE_POLES[pole];
  const tPole = useTranslations(config.namespace);
  const services: RawService[] =
    data?.offerings ?? (tPole.raw(config.listKey) as RawService[]);
  const staticCount = usePoleCount(pole);
  const count = data
    ? t(pole === 'ing' ? 'fields' : 'services', { count: services.length })
    : staticCount;
  const anchor = POLE_ANCHORS[pole];

  return (
    <article
      className={`pole-${pole} group relative flex w-[78vw] max-w-[400px] flex-none snap-start flex-col sm:w-[44vw] lg:w-auto lg:max-w-none`}
      style={
        {
          '--layer': `clamp(0, calc(var(--rise) * 1.8 - ${index * 0.4}), 1)`,
        } as CSSProperties
      }
    >
      {/* Repère sur la ligne + relation vers le pôle suivant */}
      <div className="relative flex h-5 items-center">
        <span
          className="relative z-10 block h-2.5 w-2.5 rotate-45 border-[1.5px] border-pole transition-colors duration-500"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--pole) calc(var(--layer) * 100%), var(--color-paper-muted))',
          }}
          aria-hidden="true"
        />
        {relation && (
          <span
            className="absolute right-6 z-10 hidden items-center gap-1.5 bg-paper-muted pl-3 pr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted lg:inline-flex"
            aria-hidden="true"
          >
            {relation} <ArrowRight size={11} />
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end gap-4">
        <span className="font-heading text-6xl font-bold leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--pole)]">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated py-1 pl-1 pr-3 font-mono text-[11px] font-bold tracking-[0.12em] text-pole">
          <span
            className="pattern-swatch h-5 w-5 rounded-full border border-border-subtle"
            aria-hidden="true"
          />
          {config.code}
        </span>
        <span className="mb-2 ml-auto font-mono text-[11px] text-muted">
          {count}
        </span>
      </div>

      {/* Illustration, déposée comme une strate */}
      <figure
        className="relative mt-6 aspect-[4/5] overflow-hidden rounded-sheet border border-border-subtle bg-background"
        style={{
          clipPath: 'inset(calc((1 - var(--layer)) * 100%) 0 0 0 round 16px)',
        }}
      >
        <Image
          src={`/assets/images/ewes-pole-${pole}.webp`}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 78vw"
          className="object-cover object-[50%_60%] transition-transform duration-[1.2s] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]"
          style={{ translate: '0 calc((1 - var(--layer)) * 12%)' }}
        />

        {/* Prestations : remontent au survol (écrans avec pointeur) */}
        <div
          className="absolute inset-x-3 bottom-3 hidden translate-y-[calc(100%+1rem)] rounded-card bg-paper/94 p-5 shadow-[0_24px_48px_-30px_rgba(21,52,66,0.6)] backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:hover)]:block"
          aria-hidden="true"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-pole">
            {count}
          </p>
          <ol className="mt-3 grid gap-1.5">
            {services.map((service, serviceIndex) => (
              <li
                key={service.title}
                className="grid grid-cols-[26px_1fr] text-[13px] leading-5 text-sand"
              >
                <span className="font-mono text-[10px] leading-5 text-pole">
                  {String(serviceIndex + 1).padStart(2, '0')}
                </span>
                {service.title}
              </li>
            ))}
          </ol>
        </div>
      </figure>

      <span
        className="pattern-swatch mt-3 block h-2.5 origin-left rounded-full border border-border-subtle"
        style={{ transform: 'scaleX(var(--layer))' }}
        aria-hidden="true"
      />

      <h3 className="section-title mt-7 text-3xl uppercase text-sand sm:text-4xl">
        {/* Lien étiré : toute la planche mène au chapitre du pôle. */}
        <a
          href={`#${anchor}`}
          onClick={(event) => {
            event.preventDefault();
            scrollToElement(document.getElementById(anchor));
          }}
          className="outline-none after:absolute after:inset-0 after:rounded-sheet focus-visible:after:outline-2 focus-visible:after:outline-offset-8 focus-visible:after:outline-pole"
        >
          {data?.name ?? t(`poles.${pole}`)}
        </a>
      </h3>
      {(data ? data.tagline : tPole('title')) && (
        <p className="mt-3 font-heading text-lg font-semibold leading-snug text-pole">
          {data ? data.tagline : tPole('title')}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-7">
        <span className="inline-flex items-center gap-3 whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-sand">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-sand/25 transition-colors duration-300 group-hover:border-pole group-hover:bg-pole group-hover:text-white">
            <ArrowDown size={15} />
          </span>
          <span className="hidden sm:inline">{t('chapterLink')}</span>
        </span>
        <Link
          href={`/services#${pole}`}
          className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap border-b border-sand/25 pb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:border-pole hover:text-pole"
        >
          {t('detailLink')} <ArrowUpRight size={13} />
        </Link>
      </div>
    </article>
  );
}

/**
 * « 02 · Nos services » de l'Accueil — homepage uniquement. Les trois pôles
 * en triptyque de planches illustrées, reliées par une ligne à repères (écho
 * de la règle des repères du « 01 · À propos ») qui dit leur enchaînement :
 * l'environnement oriente l'eau, qui guide l'ingénierie. Au défilement, la
 * ligne se trace et chaque illustration se dépose comme une couche
 * sédimentaire, avant la descente dans les chapitres ENV → H₂O → ING juste
 * en dessous. Puis la légende des publics servis.
 * Mêmes codes que la page Nos services (index en relief, pastille à motif,
 * nombre de prestations). Progression en variable CSS (pas de re-rendu
 * React) ; rendu serveur et « animations réduites » : tout est affiché.
 */
export function ServicesOverview({
  poles,
}: {
  /** Contenu des pôles venu de l'API ; un pôle absent retombe sur les messages. */
  poles?: Partial<Record<ServicePole, PoleContent>>;
}) {
  const t = useTranslations('ServicesOverview');
  const tExpertises = useTranslations('Expertises');
  const relations = t.raw('relations') as string[];
  const audiences = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];

  const platesRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const plates = platesRef.current;
    if (!plates) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const trigger = ScrollTrigger.create({
      trigger: plates,
      start: 'top 85%',
      end: 'top 30%',
      onUpdate: (self) =>
        plates.style.setProperty('--rise', self.progress.toFixed(4)),
    });
    plates.style.setProperty('--rise', trigger.progress.toFixed(4));

    return () => {
      trigger.kill();
      plates.style.setProperty('--rise', '1');
    };
  }, []);

  return (
    <section className="overflow-hidden bg-paper-muted px-6 pb-20 pt-24 text-sand md:px-16 md:pb-28 md:pt-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-14 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end lg:mb-20">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
          <p
            className="max-w-md text-sm leading-7 text-sand/72 md:justify-self-end"
            data-reveal
          >
            {t('aside')}
          </p>
        </div>

        {/* Triptyque des pôles (défilement horizontal sous lg) */}
        <nav aria-label={t('indexLabel')}>
          <div
            ref={platesRef}
            className="relative -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-6 px-6 pb-4 [scrollbar-width:none] md:-mx-16 md:scroll-px-16 md:px-16 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-10 lg:overflow-visible lg:px-0 lg:pb-0 xl:gap-14"
            style={{ '--rise': 1 } as CSSProperties}
          >
            <span
              className="pointer-events-none absolute left-0 right-0 top-2.5 hidden h-px origin-left bg-sand/25 lg:block"
              style={{ transform: 'scaleX(var(--rise))' }}
              aria-hidden="true"
            />
            {POLES.map((pole, index) => (
              <PolePlate
                key={pole}
                pole={pole}
                index={index}
                relation={relations[index]}
                data={poles?.[pole]}
              />
            ))}
          </div>
        </nav>

        {/* Légende : pour qui nous travaillons */}
        <div className="mt-20 border-t border-sand lg:mt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-4 pt-6">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {t('audiencesTitle')}
            </h3>
            <TextLink href="/services" icon={ArrowUpRight}>
              {t('allLink')}
            </TextLink>
          </div>
          <ul
            className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0"
            data-stagger
          >
            {audiences.map((item, index) => {
              const Icon = AUDIENCE_ICONS[index] ?? FlaskConical;
              return (
                <li
                  key={item.title}
                  className="border-sand/15 lg:border-l lg:px-8 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <p className="mt-5 font-heading text-lg font-bold leading-snug text-sand">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-sand/65">
                    {item.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
