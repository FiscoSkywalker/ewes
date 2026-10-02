import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ArrowDown,
  ArrowRight,
  FlaskConical,
  GraduationCap,
  Landmark,
  Pickaxe,
} from 'lucide-react';
import { getPoleServices } from '@/lib/api/public-services';
import { SectionHeading } from '@/components/public/section-heading';
import {
  SERVICE_POLES,
  ServiceChapter,
  type ServicePole,
} from '@/components/public/service-chapter';
import { ButtonLink } from '@/components/public/ui';

/**
 * Page Nos services (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component sans îlot client. Sommaire des trois pôles, un chapitre par pôle
 * (`ServiceChapter` : introduction collante + prestations en cartes), la
 * méthode, les publics servis et le volet Formation. Pas de décor WebGL
 * (réservé à l'Accueil).
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/services'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ServicesPage' });
  return { title: t('eyebrow'), description: t('description') };
}

const POLES: ServicePole[] = ['env', 'eau', 'ing'];
const AUDIENCE_ICONS = [Pickaxe, Landmark, GraduationCap, FlaskConical];

/** Entrée du sommaire (lien d'ancre vers le chapitre du pôle). */
function SummaryLink({
  pole,
  index,
  label,
  count,
}: {
  pole: ServicePole;
  index: number;
  label: string;
  count: string;
}) {
  return (
    <li>
      <a
        href={`#${pole}`}
        className={`pole-${pole} group flex items-center gap-4 rounded-card border border-border-subtle bg-surface-elevated p-4 transition-all duration-300 hover:border-border hover:bg-white hover:shadow-[0_18px_40px_-26px_rgba(21,52,66,0.5)]`}
      >
        <span
          className="pattern-swatch h-12 w-12 flex-none rounded-control border border-border-subtle"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pole">
            {String(index + 1).padStart(2, '0')} · {count}
          </span>
          <span className="mt-0.5 block font-heading text-lg font-bold leading-tight text-sand">
            {label}
          </span>
        </span>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-sand transition-colors group-hover:border-pole group-hover:bg-pole group-hover:text-white">
          <ArrowDown size={15} />
        </span>
      </a>
    </li>
  );
}

export default async function ServicesPage({
  params,
}: PageProps<'/[locale]/services'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tPage = await getTranslations('ServicesPage');
  const tOverview = await getTranslations('ServicesOverview');
  const tPoles = {
    env: await getTranslations('Environment'),
    eau: await getTranslations('Water'),
    ing: await getTranslations('Engineering'),
  };
  // Contenu des pôles piloté par l'API ; repli sur les messages si absent.
  const poleData = await getPoleServices(locale);
  const poleCount = (pole: ServicePole) => {
    const config = SERVICE_POLES[pole];
    const total =
      poleData[pole]?.offerings.length ??
      (tPoles[pole].raw(config.listKey) as unknown[]).length;
    return tOverview(pole === 'ing' ? 'fields' : 'services', { count: total });
  };
  const tMethod = await getTranslations('Method');
  const tExpertises = await getTranslations('Expertises');
  const tTraining = await getTranslations('Training');
  const steps = tMethod.raw('steps') as { title: string; text: string }[];
  const audiences = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];
  const topics = tTraining.raw('topics') as string[];

  return (
    <div className="text-sand">
      {/* En-tête + sommaire */}
      <section className="bg-paper-muted px-6 pb-20 pt-28 md:px-16 md:pb-24 md:pt-36">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-20">
          <SectionHeading
            as="h1"
            eyebrow={tPage('eyebrow')}
            title={tPage('title')}
            description={tPage('description')}
          />
          <nav aria-label={tOverview('indexLabel')} data-reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {tOverview('indexLabel')}
            </p>
            <ul className="flex flex-col gap-3">
              {POLES.map((pole, index) => (
                <SummaryLink
                  key={pole}
                  pole={pole}
                  index={index}
                  label={poleData[pole]?.name ?? tOverview(`poles.${pole}`)}
                  count={poleCount(pole)}
                />
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {POLES.map((pole, index) => (
        <ServiceChapter
          key={pole}
          pole={pole}
          index={index + 1}
          data={poleData[pole]}
        />
      ))}

      {/* Méthode */}
      <section className="tone-night relative isolate overflow-hidden bg-night px-6 py-20 md:px-16 md:py-28">
        <div
          className="pointer-events-none absolute -left-40 top-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-malachite/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <SectionHeading
              eyebrow={tMethod('eyebrow')}
              title={tMethod('title')}
              tone="night"
            />
            <p
              className="max-w-md text-sm leading-7 lg:justify-self-end"
              data-reveal
            >
              {tMethod('text')}
            </p>
          </div>

          <ol
            className="relative mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8"
            data-stagger
          >
            <span
              className="absolute left-6 right-6 top-6 hidden h-px bg-linear-to-r from-primary via-malachite-bright to-copper-bright opacity-60 lg:block"
              aria-hidden="true"
            />
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-on-night/20 bg-night font-mono text-sm font-bold text-malachite-bright">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-6 font-heading text-xl font-bold leading-snug text-on-night">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Publics servis */}
      <section className="bg-white px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto w-full max-w-[1440px]">
          <SectionHeading
            eyebrow={tOverview('audiencesTitle')}
            title={tExpertises('title')}
            className="mb-14 max-w-4xl"
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
            {audiences.map((item, index) => {
              const Icon = AUDIENCE_ICONS[index] ?? FlaskConical;
              return (
                <li
                  key={item.title}
                  className="flex flex-col rounded-sheet bg-paper p-7 transition-colors duration-300 hover:bg-paper-muted"
                >
                  <Icon size={22} strokeWidth={1.75} className="text-primary" />
                  <h3 className="mt-8 font-heading text-lg font-bold leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-sand/65">
                    {item.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Formation */}
      <section className="bg-paper-muted px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
          <figure
            className="relative aspect-[4/3] overflow-hidden rounded-sheet"
            data-image-reveal
          >
            <Image
              src="/assets/images/ewes-training-session.jpg"
              alt={tTraining('imageAlt')}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </figure>
          <div>
            <SectionHeading
              eyebrow={tTraining('eyebrow')}
              title={tTraining('title')}
              description={tTraining('description')}
            />
            <h3 className="mt-10 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {tTraining('topicsTitle')}
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2" data-stagger>
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold text-sand"
                >
                  {topic}
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact" icon={ArrowRight} className="mt-10">
              {tTraining('cta')}
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
