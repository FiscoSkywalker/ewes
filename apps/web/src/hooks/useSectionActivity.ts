'use client';

import { useEffect, useRef, useState } from 'react';

/** Délai sans défilement avant d'oser monter une scène en tâche de fond. */
const SCROLL_QUIET_MS = 400;

interface SectionActivityOptions {
  /**
   * Monte aussi la section pendant un temps mort du navigateur, ce délai
   * (ms) après la fin du chargement de la page, même si elle est encore
   * loin. Le travail lourd (téléchargement de three.js, contexte WebGL,
   * compilation des shaders) se fait alors pendant que le visiteur lit le
   * hero, au lieu de figer le défilement quand il approche de la section.
   */
  idleMountDelay?: number;
}

/**
 * Pilote le cycle de vie d'un canvas WebGL selon la position de sa section :
 * - `mounted` passe à `true` (définitivement) quand la section approche de
 *   l'écran, ou plus tôt pendant un temps mort (`idleMountDelay`) — évite de
 *   créer les contextes WebGL au tout premier chargement ;
 * - `active` suit la visibilité réelle — la boucle de rendu est suspendue
 *   hors écran au lieu de dessiner en continu pour rien.
 */
export function useSectionActivity<T extends Element>({
  idleMountDelay,
}: SectionActivityOptions = {}) {
  const ref = useRef<T>(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const mountObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          mountObserver.disconnect();
        }
      },
      { rootMargin: '150% 0px' },
    );
    const activeObserver = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '10% 0px' },
    );

    mountObserver.observe(element);
    activeObserver.observe(element);

    let timer: number | undefined;
    let idleHandle: number | undefined;
    let lastScrollAt = 0;
    const onScroll = () => {
      lastScrollAt = performance.now();
    };
    const mountWhenIdle = (delay = idleMountDelay) => {
      timer = window.setTimeout(() => {
        const mount = () => {
          // Le montage est une longue tâche : jamais en plein geste de
          // défilement, on attend que la page soit immobile.
          if (performance.now() - lastScrollAt < SCROLL_QUIET_MS) {
            mountWhenIdle(SCROLL_QUIET_MS);
            return;
          }
          setMounted(true);
          mountObserver.disconnect();
          window.removeEventListener('scroll', onScroll);
        };
        if ('requestIdleCallback' in window) {
          idleHandle = window.requestIdleCallback(mount, { timeout: 3000 });
        } else {
          mount();
        }
      }, delay);
    };
    const onLoad = () => mountWhenIdle();
    if (idleMountDelay !== undefined) {
      window.addEventListener('scroll', onScroll, { passive: true });
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }

    return () => {
      mountObserver.disconnect();
      activeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('load', onLoad);
      window.clearTimeout(timer);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    };
  }, [idleMountDelay]);

  return { ref, mounted, active };
}
