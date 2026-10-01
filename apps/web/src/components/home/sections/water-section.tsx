'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';
import { WaterServicesList } from '@/components/public/water-services-list';
import { useSectionActivity } from '@/hooks/useSectionActivity';
import { POLE_ANCHORS } from './services-overview';

/** Préparée pendant un temps mort, ~1 s après le chargement (voir `useSectionActivity`). */
const IDLE_MOUNT_DELAY = 1000;

const WaterCanvas = dynamic(
  () =>
    import('../experience/WaterSectionExperience').then(
      (module) => module.WaterSectionExperience,
    ),
  { ssr: false },
);

interface WaterSectionProps {
  reducedMotion: boolean;
  dpr: number;
  particleMultiplier: number;
  webglAvailable: boolean;
}

/** Chapitre H₂O (Eau) de l'Accueil, avec simulation d'eau WebGL — homepage uniquement. */
export function WaterSection({
  reducedMotion,
  dpr,
  particleMultiplier,
  webglAvailable,
}: WaterSectionProps) {
  const t = useTranslations('Water');
  const { ref, mounted, active } = useSectionActivity<HTMLElement>({
    idleMountDelay: IDLE_MOUNT_DELAY,
  });

  return (
    <section
      ref={ref}
      id={POLE_ANCHORS.eau}
      className="pole-eau section-shell flex items-center overflow-hidden pointer-events-none"
    >
      <div className="strata-core" />
      {webglAvailable && mounted && (
        <WaterCanvas
          active={active}
          reducedMotion={reducedMotion}
          dpr={dpr}
          particleMultiplier={particleMultiplier}
        />
      )}
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(213,228,234,.98)_0%,rgba(213,228,234,.92)_52%,rgba(213,228,234,.28)_82%,transparent_100%)] md:block" />
      {/* Mobile : voile uniforme lisible sur toute la largeur, fondu vers la couleur du fond en haut et en bas. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(213,228,234)_0%,rgba(213,228,234,.9)_14%,rgba(213,228,234,.9)_86%,rgb(213,228,234)_100%)] md:hidden" />
      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="max-w-3xl"
        />
        <WaterServicesList />
      </div>
    </section>
  );
}
