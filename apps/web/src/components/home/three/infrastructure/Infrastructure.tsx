'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { readScroll } from '@/lib/scroll-state';
import { TreatmentPlant } from './TreatmentPlant';
import { PipeNetwork } from './PipeNetwork';

interface InfrastructureProps {
  reducedMotion?: boolean;
}

export const Infrastructure: React.FC<InfrastructureProps> = ({
  reducedMotion = false,
}) => {
  const infraGroupRef = useRef<THREE.Group>(null);

  // Rotate slowly and angle camera view towards facility
  useFrame(({ clock }) => {
    if (infraGroupRef.current) {
      const { velocity } = readScroll();
      const time = clock.getElapsedTime();
      const scrollRotation = THREE.MathUtils.clamp(velocity * 0.1, -0.22, 0.22);
      const idleRotation = reducedMotion ? 0 : Math.sin(time * 0.15) * 0.055;
      infraGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        infraGroupRef.current.rotation.y,
        -0.35 + idleRotation + scrollRotation,
        reducedMotion ? 1 : 0.08,
      );
    }
  });

  return (
    <group ref={infraGroupRef} position={[0, -0.2, 0]}>
      <TreatmentPlant reducedMotion={reducedMotion} />
      <PipeNetwork />
    </group>
  );
};
