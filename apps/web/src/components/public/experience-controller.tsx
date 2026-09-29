'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { registerLenis } from '@/lib/smooth-scroll';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ExperienceControllerProps {
  children: ReactNode;
}

/**
 * Défilement fluide (Lenis) synchronisé avec GSAP ScrollTrigger, appliqué à
 * l'ensemble du site public pour une identité de défilement cohérente
 * (blueprint/16_Rendering_State_Strategy.md §4 : composant client isolé,
 * monté une seule fois dans la coquille publique).
 *
 * Réglage volontairement léger : interpolation `lerp` rapide (la précédente
 * durée de 1,4 s donnait une sensation de « traînée » lourde) et défilement
 * tactile natif (pas de `syncTouch`), le plus fluide sur mobile.
 */
export function ExperienceController({ children }: ExperienceControllerProps) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.13,
      smoothWheel: true,
      wheelMultiplier: 1,
    });
    registerLenis(lenis);

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    // Sans lissage de retard, GSAP rattrape les frames perdues d'un coup
    // (sauts visibles après un pic de charge) ; 500 ms/33 ms = comportement
    // par défaut de GSAP, qui absorbe ces pics proprement.
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      gsap.ticker.remove(updateTicker);
      registerLenis(null);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
