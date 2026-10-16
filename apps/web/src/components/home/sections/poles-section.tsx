import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import {
  SERVICE_POLES,
  type PoleContent,
  type ServicePole,
} from '@/components/public/service-chapter';
import { Link } from '@/i18n/navigation';
import { POLE_DEFAULT_IMAGES } from '@/lib/poles';

const POLES: ServicePole[] = ['env', 'eau', 'ing'];
/** Nombre de prestations phares montrées par carte (le détail est sur /services). */
const HIGHLIGHTS = 4;

interface RawService {
  title: string;
}

/**
 * Carte d'un pôle : bande à motif du pôle, index et code, photo, titre, une
 * phrase, trois ou quatre prestations phares et un lien vers le chapitre du
 * pôle sur la page Nos services (où se lisent toutes les prestations).
 */
function PoleCard({
  pole,
  index,
  data,
}: {
  pole: ServicePole;
  index: number;
  data?: PoleContent;
}) {
  const t = useTranslations('HomeSections');
  const tOverview = useTranslations('ServicesOverview');
  const config = SERVICE_POLES[pole];
  const tPole = useTranslations(config.namespace);
  const services: RawService[] =
    data?.offerings ?? (tPole.raw(config.listKey) as RawService[]);
  const name = data?.name ?? tOverview(`poles.${pole}`);
  const tagline = data ? data.tagline : tPole('title');

  return (
    <article
      className={`pole-${pole} flex flex-col overflow-hidden rounded-sheet border border-border-subtle bg-surface-elevated`}
    >
      <span
        className="pattern-swatch block h-2.5 border-b border-border-subtle"
        aria-hidden="true"
      />
      <figure className="relative aspect-[21/9] overflow-hidden bg-background sm:aspect-[16/9]">
        <Image
          src={data?.image?.src ?? POLE_DEFAULT_IMAGES[pole]}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-[50%_60%]"
        />
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-surface-elevated py-1 pl-1 pr-3 font-mono text-xs font-bold tracking-[0.08em] text-pole">
          <span
            className="pattern-swatch h-5 w-5 rounded-full border border-border-subtle"
            aria-hidden="true"
          />
          {String(index + 1).padStart(2, '0')} · {config.code}
        </span>
      </figure>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="font-heading text-2xl font-bold leading-tight text-sand">
          {name}
        </h3>
        {tagline && (
          <p className="mt-2 text-base font-medium leading-snug text-pole">
            {tagline}
          </p>
        )}
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-muted">
          {t('poleHighlights')}
        </p>
        <ul className="mt-3 grid gap-2">
          {services.slice(0, HIGHLIGHTS).map((service) => (
            <li
              key={service.title}
              className="flex gap-3 text-[15px] leading-6 text-sand"
            >
              <span
                className="mt-2.5 h-1.5 w-1.5 flex-none rotate-45 bg-pole"
                aria-hidden="true"
              />
              {service.title}
            </li>
          ))}
        </ul>
        <Link
          href={`/services#${pole}`}
          className="mt-auto inline-flex items-center gap-1.5 self-start border-b border-sand/30 pb-0.5 pt-6 text-sm font-bold text-sand transition-colors hover:border-pole hover:text-pole"
        >
          {t('poleLink')}
          <span className="sr-only"> {name}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/**
 * « 02 · Nos 3 pôles » de l'Accueil — homepage uniquement. Un seul passage :
 * une carte par pôle. Le détail des prestations, les publics servis et les
 * chapitres par pôle vivent sur la page Nos services.
 */
export function PolesSection({
  poles,
}: {
  /** Contenu des pôles venu de l'API ; un pôle absent retombe sur les messages. */
  poles?: Partial<Record<ServicePole, PoleContent>>;
}) {
  const t = useTranslations('HomeSections');

  return (
    <section className="bg-paper-muted px-6 py-14 text-sand md:px-16 md:py-24">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <SectionHeading eyebrow={t('polesEyebrow')} title={t('polesTitle')} />
          <p
            className="max-w-md text-base leading-7 text-sand/85 md:justify-self-end"
            data-reveal
          >
            {t('polesText')}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {POLES.map((pole, index) => (
            <PoleCard
              key={pole}
              pole={pole}
              index={index}
              data={poles?.[pole]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
