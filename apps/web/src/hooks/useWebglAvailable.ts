'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  // Static capability check — it never changes after mount, so there is
  // nothing to subscribe to.
  return () => {};
}

function getSnapshot() {
  const probe = document.createElement('canvas');
  return Boolean(
    window.WebGLRenderingContext &&
    (probe.getContext('webgl2') || probe.getContext('webgl')),
  );
}

function getServerSnapshot() {
  return true;
}

/** Détection WebGL via `useSyncExternalStore` (pas de setState dans un effet). */
export function useWebglAvailable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
