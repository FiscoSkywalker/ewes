'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';
import { EngineeringItemsList } from '@/components/public/engineering-items-list';

const EngineeringCanvas = dynamic(
  () =>
    import('../experience/EngineeringSectionExperience').then(
      (module) => module.EngineeringSectionExperience,
    ),
  { ssr: false },
);

interface EngineeringSectionProps {
  scrollProgress: number;
  velocity: number;
  reducedMotion: boolean;
  dpr: number;
  webglAvailable: boolean;
}

/** Section "Travaux d'ingénierie" de l'Accueil, avec maquette 3D WebGL — homepage uniquement. */
export function EngineeringSection({
  scrollProgress,
  velocity,
  reducedMotion,
  dpr,
  webglAvailable,
}: EngineeringSectionProps) {
  const t = useTranslations('Engineering');

  return (
    <section className="section-shell flex items-center overflow-hidden pointer-events-none">
      {webglAvailable && (
        <EngineeringCanvas
          scrollProgress={scrollProgress}
          velocity={velocity}
          reducedMotion={reducedMotion}
          dpr={dpr}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(213,228,234,.98)_0%,rgba(213,228,234,.9)_48%,rgba(213,228,234,.18)_78%,transparent_100%)]" />
      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <div className="max-w-3xl">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
          <EngineeringItemsList />
        </div>
      </div>
    </section>
  );
}
