'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Visibilité continue d'un élément (IntersectionObserver). Sert à suspendre
 * le travail en boucle — rotations automatiques, animations décoratives —
 * tant que la section est hors écran : sans cela, ces minuteries re-rendaient
 * des sections invisibles et recalculaient la mise en page pendant que le
 * visiteur défilait ailleurs. `false` avant le montage (rendu serveur).
 */
export function useInView<T extends Element>(rootMargin = '0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
