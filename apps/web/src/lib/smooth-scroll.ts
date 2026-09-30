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

export function scrollToElement(
  element: HTMLElement | null,
  options: { offset?: number; duration?: number } = {},
) {
  if (!element) return;
  if (instance) {
    instance.scrollTo(element, { duration: 1.2, ...options });
  } else {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

/** Gèle le défilement de la page (fenêtre modale ouverte). */
export function setScrollLocked(locked: boolean) {
  if (locked) instance?.stop();
  else instance?.start();
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}
