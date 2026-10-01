import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Building2, MapPin, Phone } from 'lucide-react';
import type { ImpactMetric } from '@/data/metrics';
import type { Expert } from '@/data/experts';
import { EWES_CONTACT } from '@/data/contact';
import { ExpertsGallery } from '@/components/public/experts-gallery';
import { SectionHeading } from '@/components/public/section-heading';
import { Link } from '@/i18n/navigation';
import { fetchPublishedPage, localizePage } from '@/lib/api/public-pages';

/**
 * Page À propos (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component ; seul le bandeau des experts (`ExpertsGallery`) est un îlot
 * client. Contenus du profil EWES (`raw/PROFIL_EWES.md`) : qui sommes-nous,
 * chiffres clés, atouts, équipe, publics, recherche et références.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AboutPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Titre et introduction pilotés par la page `a-propos` du portail admin ;
  // repli sur les messages statiques si elle n'est pas publiée / API injoignable.
  const cmsPage = await fetchPublishedPage('a-propos');
  const cms = cmsPage ? localizePage(cmsPage, locale) : null;
  const t = await getTranslations('World');
  const tPage = await getTranslations('AboutPage');
  const tExpertises = await getTranslations('Expertises');
  const tResearch = await getTranslations('Research');
  const tMetrics = await getTranslations('Metrics');
  const metrics = tMetrics.raw('items') as ImpactMetric[];
  const values = t.raw('values') as { title: string; text: string }[];
  const clients = t.raw('clients') as string[];
  const expertises = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];
  const research = tResearch.raw('items') as { title: string; text: string }[];
  const experts = tPage.raw('team.experts') as Expert[];

  return (
    <div className="text-sand">
      {/* En-tête */}
      <section className="bg-paper-muted px-6 pb-20 pt-28 md:px-16 md:pb-28 md:pt-36">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20">
          <SectionHeading
            eyebrow={tPage('eyebrow')}
            title={cms?.title ?? tPage('title')}
            description={cms?.content ?? tPage('description')}
          />
          <figure className="relative" data-reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sheet">
              <Image
                src="/assets/images/ewes-apropos-equipe.webp"
                alt={t('imageAlt')}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="absolute -bottom-8 left-6 right-6 flex flex-col gap-4 rounded-card bg-surface-elevated p-5 shadow-[0_24px_48px_-24px_rgba(21,52,66,0.45)] sm:left-auto sm:right-8 sm:w-80">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                <Building2 size={13} /> {t('hqLabel')}
              </span>
              <span>
                <span className="block font-heading text-3xl font-bold leading-none">
                  {t('hqCity')}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t('hqRegion')}
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Qui sommes-nous + chiffres clés */}
      <section className="bg-paper px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-20">
            <SectionHeading
              eyebrow={t('eyebrow')}
              title={t('title')}
              description={t('description')}
            />
            <div className="flex flex-col gap-4 text-sm leading-6 text-sand/72" data-reveal>
              <p className="flex items-start gap-3">
                <MapPin size={15} className="mt-1 flex-none text-primary" />
                {t('addressLine1')}
              </p>
              <a
                href={EWES_CONTACT.phoneHref}
                className="flex items-center gap-3 transition-colors hover:text-primary"
              >
                <Phone size={15} className="flex-none text-primary" />
                {EWES_CONTACT.phoneDisplay}
              </a>
              <p className="border-t border-border pt-4 text-xs leading-5 text-sand/60">
                {t('networkLine')}
              </p>
            </div>
          </div>

          <dl
            className="mt-16 grid overflow-hidden rounded-sheet border border-border bg-surface-elevated sm:grid-cols-2 lg:grid-cols-4"
            data-stagger
          >
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`flex flex-col p-7 sm:p-8 ${index > 0 ? 'border-t border-border sm:border-t-0' : ''} ${index % 2 === 1 ? 'sm:border-l' : ''} ${index >= 2 ? 'sm:border-t lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : ''}`}
              >
                <dt className="order-2 mt-3 font-heading text-base font-semibold leading-tight">
                  {metric.label}
                </dt>
                <dd className="order-1 flex items-baseline gap-1 font-heading text-5xl font-bold tracking-tight text-sand">
                  {metric.value}
                  <span className="text-xl text-primary">{metric.suffix}</span>
                </dd>
                <dd className="order-3 mt-2 text-xs leading-5 text-sand/55">
                  {metric.subtext}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Ce qui fait notre force */}
      <section className="tone-night relative isolate overflow-hidden bg-night px-6 py-20 md:px-16 md:py-28">
        <div
          className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto w-full max-w-[1440px]">
          <SectionHeading
            eyebrow={tPage('valuesEyebrow')}
            title={t('valuesTitle')}
            tone="night"
          />
          <ol className="mt-14 grid gap-4 md:grid-cols-3" data-stagger>
            {values.map((value, index) => (
              <li
                key={value.title}
                className="rounded-sheet border border-on-night/12 bg-on-night/[0.04] p-8 backdrop-blur-sm"
              >
                <span className="font-heading text-6xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-malachite-bright)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-8 font-heading text-2xl font-bold leading-tight text-on-night">
                  {value.title}
                </h3>
                <p className="mt-3 text-sm leading-6">{value.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Équipe & experts */}
      <section className="bg-white px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="mb-12 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <SectionHeading
              eyebrow={t('teamTitle')}
              title={tPage('team.title')}
            />
            <p className="max-w-md text-sm leading-7 text-sand/72 lg:justify-self-end" data-reveal>
              {t('teamText')}
            </p>
          </div>
          <ExpertsGallery experts={experts} />
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {tPage('team.hint')}
          </p>
        </div>
      </section>

      {/* Publics & recherche */}
      <section className="bg-paper px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto grid w-full max-w-[1440px] gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow={tExpertises('eyebrow')}
              title={tExpertises('title')}
            />
            <ul className="mt-10 flex flex-col gap-3" data-stagger>
              {expertises.map((item) => (
                <li
                  key={item.title}
                  className="rounded-card border border-border-subtle bg-surface-elevated p-6"
                >
                  <h3 className="font-heading text-lg font-bold leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-sand/65">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading
              eyebrow={tResearch('eyebrow')}
              title={tResearch('title')}
              description={tResearch('description')}
            />
            <ol className="mt-10 border-t border-sand/20" data-stagger>
              {research.map((item, index) => (
                <li
                  key={item.title}
                  className="grid grid-cols-[56px_1fr] gap-4 border-b border-sand/20 py-6"
                >
                  <span className="font-heading text-3xl font-bold text-water">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-bold leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-sand/65">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Références */}
      <section className="bg-white px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="mb-12 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <SectionHeading eyebrow={tPage('clientsEyebrow')} title={t('clientsTitle')} />
            <p className="max-w-md text-sm leading-7 text-sand/72 lg:justify-self-end" data-reveal>
              {t('clientsText')}
            </p>
          </div>
          <ul
            className="grid grid-cols-2 overflow-hidden rounded-sheet border border-border sm:grid-cols-3 lg:grid-cols-5"
            data-stagger
          >
            {clients.map((client) => (
              <li
                key={client}
                className="-mb-px -mr-px flex min-h-28 items-center justify-center border-b border-r border-border p-6 text-center font-heading text-lg font-bold text-sand/70 transition-colors duration-300 hover:bg-paper hover:text-sand"
              >
                {client}
              </li>
            ))}
          </ul>

          <div className="mt-16 flex flex-col gap-6 rounded-sheet bg-night p-8 text-on-night sm:p-10 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xl font-heading text-2xl font-bold leading-tight sm:text-3xl">
              {tPage('cta.title')}
            </h2>
            <Link href="/contact" className="primary-button on-night w-fit flex-none">
              {tPage('cta.button')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
