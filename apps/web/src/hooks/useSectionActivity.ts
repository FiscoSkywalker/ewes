'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Pilote le cycle de vie d'un canvas WebGL selon la position de sa section :
 * - `mounted` passe à `true` (définitivement) quand la section approche de
 *   l'écran — évite de créer les contextes WebGL et de compiler les shaders
 *   au chargement de la page, pendant que l'utilisateur commence à défiler ;
 * - `active` suit la visibilité réelle — la boucle de rendu est suspendue
 *   hors écran au lieu de dessiner en continu pour rien.
 */
export function useSectionActivity<T extends Element>() {
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
    return () => {
      mountObserver.disconnect();
      activeObserver.disconnect();
    };
  }, []);

  return { ref, mounted, active };
}
