import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Building2, MapPin } from 'lucide-react';
import type { ImpactMetric } from '@/data/metrics';
import { SectionHeading } from '@/components/public/section-heading';
import { EWES_CONTACT } from '@/data/contact';

/**
 * Page À propos (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component. Reprend le bloc "Qui sommes-nous" de l'Accueil (namespace
 * `World`), enrichi des atouts, de l'équipe, des références clients, des
 * expertises et des objectifs de recherche décrits dans le profil EWES
 * (`raw/PROFIL_EWES.md`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AboutPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function AboutPage() {
  const t = await getTranslations('World');
  const tPage = await getTranslations('AboutPage');
  const tImpact = await getTranslations('Impact');
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

  return (
    <div className="text-sand">
      <section className="px-6 pb-16 pt-28 md:px-16 md:pt-36">
        <SectionHeading
          eyebrow={tPage('eyebrow')}
          title={tPage('title')}
          description={tPage('description')}
        />
      </section>

      <section className="bg-paper px-6 py-16 md:px-16">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[.92fr_1.08fr]">
          <div>
            <SectionHeading
              eyebrow={t('eyebrow')}
              title={t('title')}
              description={t('description')}
            />

            <div className="mt-12 max-w-4xl border-y border-sand/20">
              <div className="grid md:grid-cols-[1fr_1.4fr]">
                <div className="border-b border-sand/20 py-6 md:border-b-0 md:border-r md:pr-8">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    <Building2 size={15} />
                    {t('hqLabel')}
                  </div>
                  <div className="mt-3 font-heading text-3xl font-semibold">
                    {t('hqCity')}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.12em] text-sand/45">
                    {t('hqRegion')}
                  </div>
                </div>
                <div className="py-6 md:pl-8">
                  <p className="flex items-start gap-3 text-sm leading-6 text-sand/70">
                    <MapPin size={14} className="mt-1 shrink-0 text-primary" />
                    {t('addressLine1')}
                  </p>
                  <a
                    href={EWES_CONTACT.phoneHref}
                    className="mt-2 block pl-7 text-sm leading-6 text-sand/55 transition-colors hover:text-primary"
                  >
                    {EWES_CONTACT.phoneDisplay}
                  </a>
                </div>
              </div>
              <div className="border-t border-sand/20 py-5">
                <p className="max-w-lg text-xs leading-5 text-sand/55">
                  {t('networkLine')}
                </p>
              </div>
            </div>
          </div>

          <figure className="relative min-h-[360px] overflow-hidden lg:min-h-[560px]">
            <Image
              src="/assets/images/ewes-about-field-team.png"
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/35 via-transparent to-white/10" />
            <figcaption className="absolute bottom-0 left-0 bg-surface-elevated/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
              {t('imageCaption')}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="section-title text-3xl text-sand sm:text-4xl">
            {t('valuesTitle')}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 border-t border-sand/20 pt-8 sm:grid-cols-3">
            {values.map((value) => (
              <div key={value.title}>
                <h3 className="font-heading text-lg font-semibold text-sand">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-sand/60">
                  {value.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="section-title text-3xl text-sand sm:text-4xl">
            {t('teamTitle')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sand/60">
            {t('teamText')}
          </p>
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="section-title text-3xl text-sand sm:text-4xl">
            {t('clientsTitle')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sand/60">
            {t('clientsText')}
          </p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {clients.map((client) => (
              <li
                key={client}
                className="border border-sand/20 bg-surface-elevated px-4 py-2 font-heading text-lg font-semibold text-sand"
              >
                {client}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <SectionHeading
            eyebrow={tExpertises('eyebrow')}
            title={tExpertises('title')}
            className="max-w-4xl"
          />
          <div className="mt-10 grid grid-cols-1 border-t border-sand/20 sm:grid-cols-2">
            {expertises.map((item) => (
              <div
                key={item.title}
                className="border-b border-sand/20 py-6 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"
              >
                <h3 className="font-heading text-xl font-semibold text-sand">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-sand/60">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <SectionHeading
            eyebrow={tResearch('eyebrow')}
            title={tResearch('title')}
            description={tResearch('description')}
            className="max-w-4xl"
          />
          <div className="mt-10 grid grid-cols-1 border-t border-sand/20 sm:grid-cols-2">
            {research.map((item, index) => (
              <div
                key={item.title}
                className="grid grid-cols-[48px_1fr] gap-4 border-b border-sand/20 py-6 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"
              >
                <span className="font-heading text-3xl font-medium text-water">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-sand">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-sand/60">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <SectionHeading
          eyebrow={tImpact('eyebrow')}
          title={tImpact('title')}
          description={tImpact('description')}
        />
        <div className="mx-auto mt-10 grid max-w-[1440px] border-t border-sand/20 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="border-b border-sand/20 py-5 sm:odd:pr-6 sm:even:border-l sm:even:pl-6 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-primary">
                  {metric.value}
                </span>
                <span className="font-heading text-lg font-semibold text-primary">
                  {metric.suffix}
                </span>
              </div>
              <h3 className="mt-1 font-heading text-base font-semibold leading-tight text-sand">
                {metric.label}
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-sand/48">
                {metric.subtext}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
