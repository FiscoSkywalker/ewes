'use client';

import { useRef } from 'react';
import { ContactBlock } from '@/components/public/contact-block';
import { RealisationsRegister } from '@/components/public/realisations-register';
import { Hero } from './sections/hero';
import { AboutSection } from './sections/about-section';
import { ClientsMarquee } from './sections/clients-marquee';
import { ServicesOverview } from './sections/services-overview';
import { EnvironmentSection } from './sections/environment-section';
import { WaterSection } from './sections/water-section';
import { EngineeringSection } from './sections/engineering-section';
import { MethodSection } from './sections/method-section';
import { TrainingSection } from './sections/training-section';
import { NewsSection } from './sections/news-section';
import { DocumentsSection } from './sections/documents-section';
import { scrollToElement } from '@/lib/smooth-scroll';
import { useResponsive } from '@/hooks/useResponsive';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWebglAvailable } from '@/hooks/useWebglAvailable';

/** Lignes du registre visibles à l'Accueil avant « Afficher tout ». */
const HOME_REGISTER_ROWS = 8;

/**
 * Arbre client de la page d'Accueil (blueprint/15/16 : exception assumée et
 * validée au SSR par défaut — décor immersif WebGL/GSAP, homepage
 * uniquement, voir journal de session Phase 02). `(public)/page.tsx` reste
 * un Server Component pour les métadonnées ; toute l'interactivité vit ici.
 *
 * Récit (fusion du prototype « storytelling » et de l'expérience immersive) :
 * hero → ils nous font confiance → qui nous sommes → les trois pôles comme
 * une colonne stratigraphique (ENV → H₂O → ING, avec l'eau et la maquette
 * 3D) → méthode → registre des missions → formation → actualités →
 * documents → contact.
 */
export function HomeExperience() {
  const { dpr, particleMultiplier } = useResponsive();
  const reducedMotion = useReducedMotion();
  const webglAvailable = useWebglAvailable();

  const aboutRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative bg-background text-sand selection:bg-primary selection:text-white">
      <Hero onExplore={() => scrollToElement(aboutRef.current)} />

      <ClientsMarquee />

      <div ref={aboutRef}>
        <AboutSection />
      </div>

      <ServicesOverview />
      <EnvironmentSection />
      <WaterSection
        reducedMotion={reducedMotion}
        dpr={dpr}
        particleMultiplier={particleMultiplier}
        webglAvailable={webglAvailable}
      />
      <EngineeringSection
        reducedMotion={reducedMotion}
        dpr={dpr}
        webglAvailable={webglAvailable}
      />

      <MethodSection />
      <RealisationsRegister initialCount={HOME_REGISTER_ROWS} showPageLink />
      <TrainingSection />
      <NewsSection />
      <DocumentsSection />
      <ContactBlock />
    </div>
  );
}
