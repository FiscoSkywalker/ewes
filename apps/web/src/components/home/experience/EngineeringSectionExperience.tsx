'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Infrastructure } from '../three/infrastructure/Infrastructure';

interface EngineeringSectionExperienceProps {
  scrollProgress: number;
  velocity: number;
  reducedMotion: boolean;
  dpr: number;
}

function EngineeringStage({
  scrollProgress,
  velocity,
  reducedMotion,
}: Omit<EngineeringSectionExperienceProps, 'dpr'>) {
  const stageRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!stageRef.current || reducedMotion) return;
    stageRef.current.position.y = THREE.MathUtils.lerp(
      stageRef.current.position.y,
      THREE.MathUtils.clamp(-velocity * 0.05, -0.2, 0.2),
      0.1,
    );
    stageRef.current.rotation.z = THREE.MathUtils.lerp(
      stageRef.current.rotation.z,
      THREE.MathUtils.clamp(velocity * 0.018, -0.04, 0.04),
      0.08,
    );
  });

  return (
    <>
      <fog attach="fog" args={['#d5e4ea', 9, 24]} />
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={2.3}
          color="#ffffff"
          position={[5, 7, 4]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1}
          color="#75a9bd"
          position={[-4, 1, -4]}
          scale={3}
        />
      </Environment>
      <hemisphereLight args={['#f2f9fb', '#7897a2', 0.9]} />
      <ambientLight intensity={0.34} color="#edf7f9" />
      <directionalLight
        position={[7, 12, 6]}
        intensity={1.35}
        color="#fff4d9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00025}
      />

      <group ref={stageRef} position={[1.15, 0, 0]}>
        <Infrastructure
          scrollProgress={scrollProgress}
          velocity={velocity}
          reducedMotion={reducedMotion}
        />
      </group>
    </>
  );
}

/** Canvas WebGL dédié à la section Ingénierie — chargé dynamiquement (`ssr:false`), homepage uniquement. */
export function EngineeringSectionExperience({
  dpr,
  ...stageProps
}: EngineeringSectionExperienceProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-0">
      <Canvas
        camera={{ position: [1.05, 1.7, 3.85], fov: 45, near: 0.1, far: 80 }}
        dpr={dpr}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <EngineeringStage {...stageProps} />
        </Suspense>
      </Canvas>
    </div>
  );
}
