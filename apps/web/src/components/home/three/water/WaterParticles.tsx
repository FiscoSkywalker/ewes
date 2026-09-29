'use client';

/**
 * `useFrame` runs in react-three-fiber's imperative render loop, outside
 * React's render phase — mutating refs/typed arrays there every frame is
 * the standard, recommended R3F performance pattern (avoids re-rendering
 * React for 60fps updates), not a purity violation. The `react-hooks/*`
 * rules below don't have an exemption for this, so they're disabled
 * file-wide rather than line-by-line across the whole animation loop.
 */
/* eslint-disable react-hooks/purity, react-hooks/immutability */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterParticlesProps {
  count?: number;
}

export const WaterParticles: React.FC<WaterParticlesProps> = ({
  count = 900,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Vector streamline data (coherent laminar flow field)
  const [positions, particleMeta] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const meta: {
      t: number;
      speed: number;
      radius: number;
      phase: number;
      streamlineId: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const streamlineId = i % 12;
      const angleOffset = (streamlineId / 12) * Math.PI * 2;
      const t = Math.random();
      const radius = 0.3 + (i % 6) * 0.28;

      pos[i * 3] = Math.cos(angleOffset) * radius;
      pos[i * 3 + 1] = (t - 0.5) * 6;
      pos[i * 3 + 2] = Math.sin(angleOffset) * radius;

      meta.push({
        t,
        speed: 0.25 + (Math.sin(i) * 0.5 + 0.5) * 0.35,
        radius,
        phase: angleOffset,
        streamlineId,
      });
    }

    return [pos, meta];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const m = particleMeta[i];
      // Progress along laminar streamline
      m.t = (m.t + delta * m.speed * 0.4) % 1.0;

      // Curvilinear trajectory (simulating conveyance through intake and treatment conduits)
      const currentY = (m.t - 0.5) * 5.5;
      // Slight hydrodynamic constriction near center (venturi effect)
      const constriction = 1.0 - 0.3 * Math.exp(-Math.pow(currentY * 0.8, 2));
      const currentRadius = m.radius * constriction;
      const swirlAngle = m.phase + currentY * 0.45;

      const idx = i * 3;
      array[idx] = Math.cos(swirlAngle) * currentRadius;
      array[idx + 1] = currentY;
      array[idx + 2] = Math.sin(swirlAngle) * currentRadius;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.024}
        color="#7dd3fc"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
