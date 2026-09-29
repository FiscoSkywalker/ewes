import type Lenis from 'lenis';

/**
 * Point d'accès unique à l'instance Lenis du site public. Le défilement
 * programmatique (bouton « Découvrir » du hero) doit passer par Lenis : un
 * `scrollIntoView({ behavior: 'smooth' })` natif entre en conflit avec le
 * lissage de Lenis et provoque des à-coups.
 */
let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function scrollToElement(element: HTMLElement | null) {
  if (!element) return;
  if (instance) {
    instance.scrollTo(element, { duration: 1.2 });
  } else {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}
