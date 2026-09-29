'use client';

import { useRef } from 'react';
import { ProjectsExplorer } from '@/components/public/projects-explorer';
import { Hero } from './sections/hero';
import { WorldSection } from './sections/world-section';
import { WaterSection } from './sections/water-section';
import { EnvironmentSection } from './sections/environment-section';
import { EngineeringSection } from './sections/engineering-section';
import { ImpactSection } from './sections/impact-section';
import { ResourcesSection } from './sections/resources-section';
import { FinalCTASection } from './sections/final-cta-section';
import { scrollToElement } from '@/lib/smooth-scroll';
import { useResponsive } from '@/hooks/useResponsive';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWebglAvailable } from '@/hooks/useWebglAvailable';

/**
 * Arbre client de la page d'Accueil (blueprint/15/16 : exception assumée et
 * validée au SSR par défaut — décor immersif WebGL/GSAP, homepage
 * uniquement, voir journal de session Phase 02). `(public)/page.tsx` reste
 * un Server Component pour les métadonnées ; toute l'interactivité vit ici.
 */
export function HomeExperience() {
  const { dpr, particleMultiplier } = useResponsive();
  const reducedMotion = useReducedMotion();

  const webglAvailable = useWebglAvailable();

  // Références de section pour le défilement programmatique (Hero → CTA).
  // Nommées individuellement (plutôt qu'un tableau indexé en JSX) pour que
  // chaque `ref={...}` reste une référence directe et non une expression
  // calculée au rendu.
  const heroRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const environmentRef = useRef<HTMLDivElement>(null);
  const engineeringRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const handleNavigateSection = (index: number) => {
    const sectionRefs = [
      heroRef,
      worldRef,
      waterRef,
      environmentRef,
      engineeringRef,
      projectsRef,
      impactRef,
      resourcesRef,
      ctaRef,
    ];
    scrollToElement(sectionRefs[index]?.current ?? null);
  };

  return (
    <main className="relative min-h-screen bg-background text-sand selection:bg-primary selection:text-white">
      <div className="relative z-10">
        <div ref={heroRef} data-section-index="0">
          <Hero onExplore={() => handleNavigateSection(1)} />
        </div>

        <div ref={worldRef} data-section-index="1">
          <WorldSection />
        </div>

        <div ref={waterRef} data-section-index="2">
          <WaterSection
            reducedMotion={reducedMotion}
            dpr={dpr}
            particleMultiplier={particleMultiplier}
            webglAvailable={webglAvailable}
          />
        </div>

        <div ref={environmentRef} data-section-index="3">
          <EnvironmentSection />
        </div>

        <div ref={engineeringRef} data-section-index="4">
          <EngineeringSection
            reducedMotion={reducedMotion}
            dpr={dpr}
            webglAvailable={webglAvailable}
          />
        </div>

        <div ref={projectsRef} data-section-index="5">
          <ProjectsExplorer variant="home" />
        </div>

        <div ref={impactRef} data-section-index="6">
          <ImpactSection />
        </div>

        <div ref={resourcesRef} data-section-index="7">
          <ResourcesSection />
        </div>

        <div ref={ctaRef} data-section-index="8">
          <FinalCTASection />
        </div>
      </div>
    </main>
  );
}
