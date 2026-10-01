'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  // Static capability check — it never changes after mount, so there is
  // nothing to subscribe to.
  return () => {};
}

/**
 * Résultat mis en cache : `useSyncExternalStore` appelle `getSnapshot` à
 * chaque rendu. Sans cache, chaque re-rendu de l'Accueil créait un nouveau
 * contexte WebGL de test (coûteux, plusieurs ms) ; au-delà d'une quinzaine,
 * le navigateur sacrifie les plus anciens — dont ceux des scènes eau et
 * maquette, qui disparaissaient (écran vide, scintillement).
 */
let cached: boolean | undefined;

function getSnapshot() {
  if (cached === undefined) {
    const probe = document.createElement('canvas');
    const context = window.WebGLRenderingContext
      ? ((probe.getContext('webgl2') ?? probe.getContext('webgl')) as
          WebGLRenderingContext | WebGL2RenderingContext | null)
      : null;
    cached = Boolean(context);
    // Libère tout de suite le contexte de test plutôt qu'au ramasse-miettes.
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return cached;
}

function getServerSnapshot() {
  return true;
}

/** Détection WebGL via `useSyncExternalStore` (pas de setState dans un effet). */
export function useWebglAvailable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
