import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { TopoContours } from '@/components/public/topo-contours';
import type { Project } from '@/data/projects';
import { ButtonLink } from '@/components/public/ui';

/**
 * « 05 · Formation » de l'Accueil, section nuit — homepage uniquement, en
 * version condensée : un paragraphe, le nombre de formations et l'action.
 * Les thèmes de formation se lisent sur la page Nos services. Le compteur
 * est calculé à partir du registre des réalisations (missions de type
 * Formation), pas saisi à la main.
 */
export function TrainingSection({ projects }: { projects: Project[] }) {
  const t = useTranslations('Training');
  const tHome = useTranslations('HomeSections');
  const trainings = projects.filter((p) => p.category === 'FORMATION');
  const since = Math.min(...trainings.map((p) => p.year));

  return (
    <section className="tone-night relative overflow-hidden bg-night px-6 py-14 md:px-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_90%_10%,rgba(90,209,161,.12),transparent_70%)]" />
      <TopoContours />

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow={tHome('trainingEyebrow')}
            title={t('homeTitle')}
            description={t('description')}
            tone="night"
          />

          <div
            className="my-8 flex items-end gap-5 border-t border-on-night/15 pt-6"
            data-reveal
          >
            <b
              className="font-heading text-7xl font-bold leading-[0.8] tracking-tight text-malachite-bright md:text-8xl"
              data-counter={trainings.length}
            >
              {trainings.length}
            </b>
            <span className="max-w-[16rem] pb-1 text-sm leading-snug text-on-night">
              {t('counterLabel', { year: since })}
            </span>
          </div>

          <ButtonLink href="/contact" tone="night" icon={ArrowRight}>
            {t('cta')}
          </ButtonLink>
        </div>

        <figure className="relative hidden aspect-[3/2] overflow-hidden rounded-sheet md:block">
          <Image
            src="/assets/images/ewes-photo-formation.jpg"
            alt={t('imageAlt')}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </figure>
      </div>
    </section>
  );
}
