'use client';

import { useEffect, type ReactNode } from 'react';
import { registerLenis } from '@/lib/smooth-scroll';
import { loadMotion, whenIdle } from '@/lib/motion';

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
    // Lenis et GSAP sont chargés après le premier affichage (voir lib/motion) :
    // d'ici là, le défilement natif du navigateur s'applique.
    let disposed = false;
    let dispose = () => {};
    const cancelIdle = whenIdle(async () => {
      const { gsap, ScrollTrigger, Lenis } = await loadMotion();
      if (disposed) return;

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
      gsap.ticker.lagSmoothing(500, 33);

      dispose = () => {
        gsap.ticker.remove(updateTicker);
        registerLenis(null);
        lenis.destroy();
      };
    });

    return () => {
      disposed = true;
      cancelIdle();
      dispose();
    };
  }, []);

  return <>{children}</>;
}
