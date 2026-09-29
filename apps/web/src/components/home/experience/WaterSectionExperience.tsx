'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { WaterSurface } from '../three/water/WaterSurface';
import { WaterParticles } from '../three/water/WaterParticles';

interface WaterSectionExperienceProps {
  scrollProgress: number;
  velocity: number;
  reducedMotion: boolean;
  dpr: number;
  particleMultiplier: number;
}

function WaterStage({
  scrollProgress,
  velocity,
  reducedMotion,
  particleMultiplier,
}: Omit<WaterSectionExperienceProps, 'dpr'>) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || reducedMotion) return;
    const scrollInfluence = THREE.MathUtils.clamp(
      velocity * 0.035,
      -0.08,
      0.08,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      scrollInfluence,
      0.1,
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      THREE.MathUtils.clamp(-velocity * 0.045, -0.18, 0.18),
      0.09,
    );
  });

  return (
    <>
      <fog attach="fog" args={['#d5e4ea', 8, 22]} />
      <Environment resolution={96}>
        <Lightformer
          form="rect"
          intensity={2}
          color="#f7fbfc"
          position={[4, 6, 3]}
          scale={[5, 5, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1.1}
          color="#8dbaca"
          position={[-4, 1, -4]}
          scale={3}
        />
      </Environment>
      <hemisphereLight args={['#eef8fb', '#7897a2', 0.85]} />
      <directionalLight
        position={[7, 12, 6]}
        intensity={1.25}
        color="#fff4d9"
      />

      <group ref={groupRef}>
        <WaterSurface
          scrollProgress={scrollProgress}
          velocity={velocity}
          reducedMotion={reducedMotion}
        />
        <WaterParticles
          count={reducedMotion ? 0 : Math.round(560 * particleMultiplier)}
          scrollProgress={scrollProgress}
        />
      </group>
    </>
  );
}

/** Canvas WebGL dédié à la section Eau — chargé dynamiquement (`ssr:false`), homepage uniquement. */
export function WaterSectionExperience({
  dpr,
  ...stageProps
}: WaterSectionExperienceProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 2.2, 3.75], fov: 45, near: 0.1, far: 80 }}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Suspense fallback={null}>
          <WaterStage {...stageProps} />
        </Suspense>
      </Canvas>
    </div>
  );
}
