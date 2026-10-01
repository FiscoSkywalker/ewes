'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Prépare une scène dès son montage, même si sa boucle de rendu est encore
 * suspendue (`frameloop="never"`, section hors écran) : compile les shaders
 * en tâche de fond (`compileAsync`, extension KHR_parallel_shader_compile
 * quand elle existe) puis dessine une image (carte d'environnement,
 * ombres). Sans cela, toute cette compilation tombait sur la première image
 * affichée — le défilement se figeait au moment même où la section entrait
 * à l'écran. À placer en dernier enfant du `<Suspense>` de la scène : il ne
 * s'exécute qu'une fois les textures chargées et la scène complète.
 */
export function ScenePrewarm() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const advance = useThree((state) => state.advance);

  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) advance(performance.now());
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, advance]);

  return null;
}
