/**
 * Chargement différé des bibliothèques d'animation du site public (GSAP,
 * ScrollTrigger, Lenis) : elles ne servent qu'au défilement et aux
 * effets d'entrée, jamais au premier affichage. Les charger après celui-ci
 * les sort du chemin critique (LCP, temps de blocage). Un seul module est
 * importé à la demande (`motion-modules`), partagé par tous les appelants.
 */
export function loadMotion() {
  return import('./motion-modules');
}

export type Motion = Awaited<ReturnType<typeof loadMotion>>;

/**
 * Exécute `task` quand le navigateur est inactif (repli : court délai), et
 * renvoie de quoi l'annuler.
 */
export function whenIdle(task: () => void): () => void {
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(task, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = globalThis.setTimeout(task, 200);
  return () => globalThis.clearTimeout(handle);
}
