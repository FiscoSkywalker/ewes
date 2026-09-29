import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/public/section-heading';
import { ServicesStrata } from '@/components/public/services-strata';

/**
 * Page Nos services (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component. Les trois pôles en colonne stratigraphique dépliable
 * (`ServicesStrata`, seul composant client), puis les publics servis et le
 * volet Formation, sans le décor WebGL réservé à la page d'Accueil.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ServicesPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function ServicesPage() {
  const tPage = await getTranslations('ServicesPage');
  const tOverview = await getTranslations('ServicesOverview');
  const tExpertises = await getTranslations('Expertises');
  const tTraining = await getTranslations('Training');
  const audiences = tExpertises.raw('items') as {
    title: string;
    text: string;
  }[];
  const topics = tTraining.raw('topics') as string[];

  return (
    <div className="text-sand">
      <section className="bg-paper-muted px-6 pb-20 pt-28 md:px-16 md:pt-36">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="mb-14 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
            <SectionHeading eyebrow={tPage('eyebrow')} title={tPage('title')} />
            <p
              className="max-w-md text-sm leading-7 text-sand/72 md:justify-self-end"
              data-reveal
            >
              {tPage('description')}
            </p>
          </div>

          <ServicesStrata />

          <h2 className="mt-16 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {tOverview('audiencesTitle')}
          </h2>
          <div
            className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            data-stagger
          >
            {audiences.map((item) => (
              <article
                key={item.title}
                className="border-t border-sand/30 pt-5"
              >
                <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-sand">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-sand/70">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tone-night bg-night px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-24">
          <div>
            <SectionHeading
              eyebrow={tTraining('homeEyebrow')}
              title={tTraining('title')}
              description={tTraining('description')}
              tone="night"
            />
            <p className="mt-5 max-w-2xl text-sm leading-7" data-reveal>
              {tTraining('text')}
            </p>
          </div>
          <div className="self-end" data-reveal>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-malachite-bright">
              {tTraining('topicsTitle')}
            </h3>
            <ul className="mt-4">
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-baseline gap-3 border-b border-on-night/12 py-3 text-sm text-on-night"
                >
                  <span
                    className="text-xs text-malachite-bright"
                    aria-hidden="true"
                  >
                    ✳
                  </span>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
