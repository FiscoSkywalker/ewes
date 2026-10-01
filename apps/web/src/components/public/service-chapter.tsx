import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Building2,
  ClipboardCheck,
  Cpu,
  Droplets,
  Factory,
  FileCheck,
  FileSearch,
  Filter,
  FlaskConical,
  Gauge,
  GraduationCap,
  Leaf,
  Microscope,
  Recycle,
  Trash2,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';

export type ServicePole = 'env' | 'eau' | 'ing';

interface PoleConfig {
  code: string;
  namespace: 'Environment' | 'Water' | 'Engineering';
  /** Clé des prestations dans les messages du pôle. */
  listKey: 'services' | 'items';
  image: string;
  icons: LucideIcon[];
  background: string;
}

export const SERVICE_POLES: Record<ServicePole, PoleConfig> = {
  env: {
    code: 'ENV',
    namespace: 'Environment',
    listKey: 'services',
    image: '/assets/images/ewes-environment-field.png',
    icons: [FileCheck, ClipboardCheck, Droplets, Trash2, Activity, Wind, Microscope, Leaf],
    background: 'bg-paper',
  },
  eau: {
    code: 'H₂O',
    namespace: 'Water',
    listKey: 'services',
    image: '/assets/images/ewes-water-standpipe.jpg',
    icons: [FileSearch, Recycle, Waves, Filter, Droplets, FlaskConical, GraduationCap, Factory],
    background: 'bg-white',
  },
  ing: {
    code: 'ING',
    namespace: 'Engineering',
    listKey: 'items',
    image: '/assets/images/ewes-laboratory-cinematic.png',
    icons: [Gauge, Building2, Cpu, Zap],
    background: 'bg-paper',
  },
};

/** Prestation telle que stockée dans les messages (le pôle Eau utilise `desc`). */
interface RawService {
  title: string;
  text?: string;
  desc?: string;
}

/** Contenu d'un pôle venu de l'API (une seule langue déjà choisie). */
export interface PoleContent {
  name: string;
  tagline: string | null;
  description: string;
  offerings: { title: string; text: string }[];
}

/** Nombre de prestations d'un pôle, formaté (« 8 prestations », « 4 volets »). */
export function usePoleCount(pole: ServicePole) {
  const t = useTranslations('ServicesOverview');
  const config = SERVICE_POLES[pole];
  const tPole = useTranslations(config.namespace);
  const count = (tPole.raw(config.listKey) as unknown[]).length;
  return t(pole === 'ing' ? 'fields' : 'services', { count });
}

/**
 * Chapitre d'un pôle sur /services : colonne d'introduction collante
 * (index, code, accroche, photo) et grille des prestations en cartes.
 * Compatible Server Component.
 */
export function ServiceChapter({
  pole,
  index,
  data,
}: {
  pole: ServicePole;
  index: number;
  /** Contenu piloté par l'API ; absent = repli sur les messages statiques. */
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

  return (
    <section
      id={pole}
      aria-labelledby={`${pole}-title`}
      className={`pole-${pole} relative scroll-mt-20 ${config.background}`}
    >
      <div className="pattern-swatch h-2.5 border-y border-border-subtle" aria-hidden="true" />

      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-6 py-20 md:px-16 md:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {/* Introduction du pôle */}
        <div className="self-start lg:sticky lg:top-28">
          <div className="flex items-center gap-4" data-reveal>
            <span className="font-heading text-6xl font-bold leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--pole)]">
              {String(index).padStart(2, '0')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated py-1 pl-1 pr-3 font-mono text-[11px] font-bold tracking-[0.12em] text-pole">
              <span className="pattern-swatch h-5 w-5 rounded-full border border-border-subtle" aria-hidden="true" />
              {config.code}
            </span>
          </div>

          <h2
            id={`${pole}-title`}
            className="section-title mt-8 text-4xl text-sand sm:text-5xl lg:text-6xl"
            data-split
          >
            {data?.name ?? t(`poles.${pole}`)}
          </h2>
          {(data ? data.tagline : tPole('title')) && (
            <p className="mt-5 font-heading text-xl font-semibold leading-snug text-pole" data-reveal>
              {data ? data.tagline : tPole('title')}
            </p>
          )}
          <p className="mt-4 max-w-xl text-sm leading-7 text-sand/72 sm:text-base" data-reveal>
            {data?.description ?? tPole('description')}
          </p>

          <figure className="relative mt-10 aspect-[4/3] overflow-hidden rounded-sheet" data-image-reveal>
            <Image
              src={config.image}
              alt={tPole('imageAlt')}
              fill
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-night/60 via-transparent to-transparent" aria-hidden="true" />
            <figcaption className="absolute bottom-4 left-4 flex items-center gap-3 rounded-card bg-white/90 px-4 py-3 backdrop-blur-md">
              <span className="h-2.5 w-2.5 rounded-full bg-pole" aria-hidden="true" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-sand">
                {count}
              </span>
            </figcaption>
          </figure>
        </div>

        {/* Prestations */}
        <ul className="grid content-start gap-4 sm:grid-cols-2" data-stagger>
          {services.map((service, serviceIndex) => {
            const Icon = config.icons[serviceIndex] ?? FileCheck;
            return (
              <li
                key={service.title}
                className="group relative flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-elevated p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:bg-white hover:shadow-[0_24px_48px_-30px_rgba(21,52,66,0.5)] sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-control bg-[color-mix(in_srgb,var(--pole)_11%,transparent)] text-pole transition-colors duration-300 group-hover:bg-pole group-hover:text-white">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {String(serviceIndex + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-lg font-bold leading-snug text-sand sm:text-xl">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-sand/65">
                  {service.text ?? service.desc}
                </p>
                <span
                  className="absolute inset-x-0 bottom-0 h-0.75 origin-left scale-x-0 bg-pole transition-transform duration-500 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
