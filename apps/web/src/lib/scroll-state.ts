/**
 * État de défilement partagé, lu à la demande (pull) par les boucles de rendu
 * WebGL (`useFrame`) plutôt que poussé dans l'état React à chaque événement
 * `scroll` : l'ancien `useScrollProgress` faisait un `setState` par événement,
 * ce qui re-rendait toute la page d'Accueil à chaque frame de défilement.
 *
 * `readScroll()` peut être appelé plusieurs fois par frame (une fois par
 * canvas) : le calcul n'est fait qu'une fois par horodatage.
 */
export interface ScrollSnapshot {
  /** Position de défilement normalisée (0 = haut de page, 1 = bas de page). */
  progress: number;
  /** Vitesse lissée en px/ms ; retombe à 0 quand le défilement s'arrête. */
  velocity: number;
}

const snapshot: ScrollSnapshot = { progress: 0, velocity: 0 };

const VELOCITY_SMOOTHING = 0.2;
const MAX_SCROLL_REFRESH_MS = 400;
/** Au-delà, la boucle de rendu était en pause : la vitesse mesurée n'a plus de sens. */
const STALE_FRAME_MS = 250;

let initialised = false;
let lastY = 0;
let lastTime = 0;
let maxScroll = 0;
let maxScrollCheckedAt = -Infinity;

export function readScroll(now: number = performance.now()): ScrollSnapshot {
  if (initialised && now === lastTime) return snapshot;

  const y = window.scrollY;
  if (!initialised) {
    initialised = true;
    lastY = y;
    lastTime = now;
  }

  // `scrollHeight` peut forcer un recalcul de mise en page : on le lit au plus
  // toutes les 400 ms plutôt qu'à chaque frame.
  if (now - maxScrollCheckedAt > MAX_SCROLL_REFRESH_MS) {
    maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0,
    );
    maxScrollCheckedAt = now;
  }

  const elapsed = now - lastTime;
  if (elapsed > STALE_FRAME_MS) {
    snapshot.velocity = 0;
  } else {
    const raw = (y - lastY) / Math.max(elapsed, 1);
    snapshot.velocity += (raw - snapshot.velocity) * VELOCITY_SMOOTHING;
  }

  snapshot.progress =
    maxScroll > 0 ? Math.min(Math.max(y / maxScroll, 0), 1) : 0;
  lastY = y;
  lastTime = now;
  return snapshot;
}
