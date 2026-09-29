import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/public/section-heading';
import { CheckCircle2 } from 'lucide-react';
import { WaterServicesList } from '@/components/public/water-services-list';
import { EnvironmentServicesList } from '@/components/public/environment-services-list';
import { EngineeringItemsList } from '@/components/public/engineering-items-list';

/**
 * Page Nos services (blueprint/15_Public_Site_Pages.md) — SSG/ISR, Server
 * Component. Empile les trois pôles (Eau, Environnement, Ingénierie) déjà
 * détaillés à l'Accueil, puis le volet Formation, sans le décor WebGL
 * réservé à la page d'Accueil.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ServicesPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function ServicesPage() {
  const tPage = await getTranslations('ServicesPage');
  const tWater = await getTranslations('Water');
  const tEnvironment = await getTranslations('Environment');
  const tEngineering = await getTranslations('Engineering');
  const tTraining = await getTranslations('Training');
  const topics = tTraining.raw('topics') as string[];

  return (
    <div className="text-sand">
      <section className="px-6 pb-16 pt-28 md:px-16 md:pt-36">
        <SectionHeading
          eyebrow={tPage('eyebrow')}
          title={tPage('title')}
          description={tPage('description')}
        />
      </section>

      <section className="bg-surface px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <SectionHeading
            eyebrow={tWater('eyebrow')}
            title={tWater('title')}
            description={tWater('description')}
            className="max-w-3xl"
          />
          <WaterServicesList />
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
          <figure className="relative min-h-[360px] overflow-hidden lg:min-h-[520px]">
            <Image
              src="/assets/images/ewes-environment-field.png"
              alt={tEnvironment('imageAlt')}
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/35 via-transparent to-white/10" />
            <figcaption className="absolute bottom-0 right-0 bg-surface-elevated/92 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sand">
              {tEnvironment('imageCaption')}
            </figcaption>
          </figure>
          <div className="ml-auto max-w-3xl">
            <SectionHeading
              eyebrow={tEnvironment('eyebrow')}
              title={tEnvironment('title')}
              description={tEnvironment('description')}
            />
            <EnvironmentServicesList />
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:px-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-3xl">
            <SectionHeading
              eyebrow={tEngineering('eyebrow')}
              title={tEngineering('title')}
              description={tEngineering('description')}
            />
            <EngineeringItemsList />
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <SectionHeading
              eyebrow={tTraining('eyebrow')}
              title={tTraining('title')}
              description={tTraining('description')}
            />
            <p className="mt-5 max-w-2xl text-sm leading-7 text-sand/65">
              {tTraining('text')}
            </p>
          </div>
          <div className="self-end border-y border-sand/20 py-6" data-reveal>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {tTraining('topicsTitle')}
            </h3>
            <ul className="mt-5 space-y-3">
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-start gap-3 text-sm leading-6 text-sand/75"
                >
                  <CheckCircle2
                    size={16}
                    className="mt-1 shrink-0 text-primary"
                  />
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
