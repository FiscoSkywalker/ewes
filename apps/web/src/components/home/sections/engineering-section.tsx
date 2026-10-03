'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';
import { EngineeringItemsList } from '@/components/public/engineering-items-list';
import { useSectionActivity } from '@/hooks/useSectionActivity';
import { poleEyebrow } from '@/lib/poles';
import type { PoleContent } from '@/components/public/service-chapter';
import { POLE_ANCHORS } from './services-overview';

/** Préparée après la scène de l'eau, pour ne pas cumuler les deux en un seul temps mort. */
const IDLE_MOUNT_DELAY = 2500;

const EngineeringCanvas = dynamic(
  () =>
    import('../experience/EngineeringSectionExperience').then(
      (module) => module.EngineeringSectionExperience,
    ),
  { ssr: false },
);

interface EngineeringSectionProps {
  reducedMotion: boolean;
  dpr: number;
  webglAvailable: boolean;
  /** Contenu du pôle piloté par le portail ; absent, les textes d'origine des messages. */
  data?: PoleContent;
}

/** Chapitre ING (Travaux d'ingénierie) de l'Accueil, accent cuivre, avec maquette 3D WebGL — homepage uniquement. */
export function EngineeringSection({
  reducedMotion,
  dpr,
  webglAvailable,
  data,
}: EngineeringSectionProps) {
  const t = useTranslations('Engineering');
  const { ref, mounted, active } = useSectionActivity<HTMLElement>({
    idleMountDelay: IDLE_MOUNT_DELAY,
  });

  return (
    <section
      ref={ref}
      id={POLE_ANCHORS.ing}
      className="pole-ing section-shell flex items-center overflow-hidden pointer-events-none"
    >
      <div className="strata-core" />
      {webglAvailable && mounted && (
        <EngineeringCanvas
          active={active}
          reducedMotion={reducedMotion}
          dpr={dpr}
        />
      )}
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(213,228,234,.98)_0%,rgba(213,228,234,.9)_48%,rgba(213,228,234,.18)_78%,transparent_100%)] md:block" />
      {/* Mobile : voile uniforme lisible sur toute la largeur, fondu vers la couleur du fond en haut et en bas. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(213,228,234)_0%,rgba(213,228,234,.9)_14%,rgba(213,228,234,.9)_86%,rgb(213,228,234)_100%)] md:hidden" />
      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <div className="max-w-3xl">
          <SectionHeading
            eyebrow={data ? poleEyebrow('ing', data.name) : t('eyebrow')}
            title={data ? (data.tagline ?? data.name) : t('title')}
            description={data ? data.description : t('description')}
          />
          <EngineeringItemsList offerings={data?.offerings} />
        </div>
      </div>
    </section>
  );
}
