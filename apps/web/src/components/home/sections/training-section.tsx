'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { TopoContours } from '@/components/public/topo-contours';
import { Link } from '@/i18n/navigation';
import type { Project } from '@/data/projects';

/**
 * « Formation » de l'Accueil, section nuit — homepage uniquement. Le
 * compteur est calculé à partir du registre des réalisations (missions de
 * type Formation), pas saisi à la main.
 */
export function TrainingSection() {
  const t = useTranslations('Training');
  const tProjects = useTranslations('Projects');
  const topics = t.raw('topics') as string[];
  const trainings = (tProjects.raw('items') as Project[]).filter(
    (p) => p.category === 'FORMATION',
  );
  const since = Math.min(...trainings.map((p) => p.year));

  return (
    <section className="tone-night relative overflow-hidden bg-night px-6 py-24 md:px-16 md:py-32">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src="/assets/images/ewes-texture-malachite.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20 mix-blend-luminosity [mask-image:radial-gradient(60%_75%_at_75%_50%,#000_25%,transparent_78%)]"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_90%_10%,rgba(90,209,161,.12),transparent_70%)]" />
      <TopoContours />

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <div>
          <SectionHeading
            eyebrow={t('homeEyebrow')}
            title={t('homeTitle')}
            description={t('description')}
            tone="night"
          />

          <div
            className="my-10 flex items-end gap-5 border-t border-on-night/15 pt-6"
            data-reveal
          >
            <b
              className="font-heading text-8xl font-bold leading-[0.8] tracking-tight text-malachite-bright md:text-9xl"
              data-counter={trainings.length}
            >
              {trainings.length}
            </b>
            <span className="max-w-[16rem] pb-1 text-sm leading-snug text-on-night">
              {t('counterLabel', { year: since })}
            </span>
          </div>

          <Link href="/contact" className="primary-button on-night">
            {t('cta')}
            <ArrowRight size={15} />
          </Link>
        </div>

        <div>
          <figure
            className="relative aspect-[3/2] overflow-hidden"
            data-image-reveal
          >
            <Image
              src="/assets/images/ewes-training-session.jpg"
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </figure>
          <ul className="mt-7 grid sm:grid-cols-2 sm:gap-x-7" data-stagger>
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
  );
}
