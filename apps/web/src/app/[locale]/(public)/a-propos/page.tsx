import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Building2, MapPin, Phone } from 'lucide-react';
import type { ImpactMetric } from '@/data/metrics';
import { getKeyFigures } from '@/lib/api/public-key-figures';
import type { LocalizedFigure } from '@/lib/key-figures';
import { KeyFiguresStrip } from '@/components/public/key-figures-strip';
import type { Expert } from '@/data/experts';
import { ExpertsGallery } from '@/components/public/experts-gallery';
import { SectionHeading } from '@/components/public/section-heading';
import { resolvePageHeader } from '@/lib/api/public-pages';
import { getPoleServices } from '@/lib/api/public-services';
import { getExperts } from '@/lib/api/public-experts';
import { getSiteSettings } from '@/lib/api/public-site-settings';
import { addressFor } from '@/lib/site-settings';
import { ButtonLink } from '@/components/public/ui';

/**
 * Page À propos (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component ; seul le bandeau des experts (`ExpertsGallery`) est un îlot
 * client. Contenus du profil EWES (`raw/PROFIL_EWES.md`) : qui sommes-nous,
 * chiffres clés, atouts, équipe, publics, recherche et références.
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutPage' });
  const header = await resolvePageHeader('a-propos', locale, {
    title: t('title'),
    intro: t('description'),
  });
  return { title: t('eyebrow'), description: header.description };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('World');
  const tPage = await getTranslations('AboutPage');
  // Titre et introduction pilotés par la page `a-propos` du portail admin ;
  // repli sur les messages statiques si elle n'est pas publiée / API injoignable.
  const header = await resolvePageHeader('a-propos', locale, {
    title: tPage('title'),
    intro: tPage('description'),
  });
  const settings = await getSiteSettings();
  const tExpertises = await getTranslations('Expertises');
  const tResearch = await getTranslations('Research');
  const tMetrics = await getTranslations('Metrics');
  // Chiffres clés pilotés par le portail ; repli sur les messages si l'API est
  // injoignable (une liste vide, elle, est respectée : tout est masqué).
  const figures: LocalizedFigure[] =
    (await getKeyFigures(locale)) ??
    (tMetrics.raw('items') as ImpactMetric[]).map((metric) => ({
      ...metric,
      suffix: metric.suffix.trim(),
    }));
  const values = t.raw('values') as { title: string; text: string }[];
  const clients = t.raw('clients') as string[];
  const expertises = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];
  const research = tResearch.raw('items') as { title: string; text: string }[];
  // Équipe pilotée par le portail ; les profils provisoires des messages ne servent que si
  // l'API est injoignable. Une équipe non publiée (liste vide) masque la section.
  const experts =
    (await getExperts(locale)) ?? (tPage.raw('team.experts') as Expert[]);
  // Noms des pôles pilotés par le portail (repli sur les messages).
  const poles = await getPoleServices(locale);
  const poleNames = {
    env: poles.env?.name,
    eau: poles.eau?.name,
    ing: poles.ing?.name,
  };

  return (
    <div className="text-sand">
      {/* En-tête */}
      <section className="bg-paper-muted px-6 pb-20 pt-28 md:px-16 md:pb-28 md:pt-36">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20">
          <SectionHeading
            as="h1"
            eyebrow={tPage('eyebrow')}
            title={header.title}
            description={header.intro}
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
            <div
              className="flex flex-col gap-4 text-sm leading-6 text-sand/72"
              data-reveal
            >
              <p className="flex items-start gap-3">
                <MapPin size={15} className="mt-1 flex-none text-primary" />
                {addressFor(settings, locale)}
              </p>
              <a
                href={settings.phoneHref}
                className="flex items-center gap-3 transition-colors hover:text-primary"
              >
                <Phone size={15} className="flex-none text-primary" />
                {settings.phone}
              </a>
              <p className="border-t border-border pt-4 text-xs leading-5 text-sand/60">
                {t('networkLine')}
              </p>
            </div>
          </div>

          <KeyFiguresStrip
            figures={figures}
            locale={locale}
            className="mt-16"
          />
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
      {experts.length > 0 && (
        <section id="equipe" className="bg-white px-6 py-20 md:px-16 md:py-28">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="mb-12 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
              <SectionHeading
                eyebrow={t('teamTitle')}
                title={tPage('team.title')}
              />
              <p
                className="max-w-md text-sm leading-7 text-sand/72 lg:justify-self-end"
                data-reveal
              >
                {t('teamText')}
              </p>
            </div>
            <ExpertsGallery experts={experts} poleNames={poleNames} />
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {tPage('team.hint')}
            </p>
          </div>
        </section>
      )}

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
            <SectionHeading
              eyebrow={tPage('clientsEyebrow')}
              title={t('clientsTitle')}
            />
            <p
              className="max-w-md text-sm leading-7 text-sand/72 lg:justify-self-end"
              data-reveal
            >
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
            <ButtonLink
              href="/contact"
              tone="night"
              icon={ArrowRight}
              className="w-fit flex-none"
            >
              {tPage('cta.button')}
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
