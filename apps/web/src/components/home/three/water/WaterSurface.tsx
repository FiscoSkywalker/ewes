'use client';

/**
 * GPGPU water simulation driven by three.js/react-three-fiber's imperative
 * render loop (`useFrame`) and effects that configure mutable Three.js
 * objects (textures, GPU compute targets) — outside React's render phase,
 * per the standard R3F pattern. See WaterParticles.tsx for the same note.
 */
/* eslint-disable react-hooks/immutability */

import { useEffect, useRef, useMemo } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  GPUComputationRenderer,
  Variable,
} from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import * as THREE from 'three';
import { readScroll } from '@/lib/scroll-state';
import {
  heightfieldFragmentShader,
  waterVertexShader,
  waterFragmentShader,
} from '@/shaders/water/waterShader';

interface WaterSurfaceProps {
  reducedMotion?: boolean;
}

const SIMULATION_SIZE = 128;

export function WaterSurface({ reducedMotion = false }: WaterSurfaceProps) {
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointerRef = useRef(new THREE.Vector2(1000, 1000));
  const pointerStrengthRef = useRef(0);
  const nextAmbientRippleRef = useRef(2.5);
  const normalTexture = useTexture('/assets/3d/water/water-normals.jpg');

  const simulation = useMemo(() => {
    const gpu = new GPUComputationRenderer(
      SIMULATION_SIZE,
      SIMULATION_SIZE,
      gl,
    );
    gpu.setDataType(THREE.HalfFloatType);
    const initialTexture = gpu.createTexture();
    (initialTexture.image.data as Float32Array).fill(0);

    const variable: Variable = gpu.addVariable(
      'heightfield',
      heightfieldFragmentShader,
      initialTexture,
    );
    gpu.setVariableDependencies(variable, [variable]);
    variable.material.uniforms.uMouse = {
      value: new THREE.Vector2(1000, 1000),
    };
    variable.material.uniforms.uMouseSize = { value: 105 };
    variable.material.uniforms.uMouseStrength = { value: 0 };
    variable.wrapS = THREE.ClampToEdgeWrapping;
    variable.wrapT = THREE.ClampToEdgeWrapping;

    const error = gpu.init();
    if (error) {
      console.warn('Simulation d’eau désactivée :', error);
    }

    return { gpu, variable, ready: !error };
  }, [gl]);

  useEffect(() => {
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.colorSpace = THREE.NoColorSpace;
    normalTexture.needsUpdate = true;
    return () => simulation.gpu.dispose();
  }, [normalTexture, simulation]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0.65 },
      uWaveHeight: { value: 0.18 },
      uFrequency: { value: 1.1 },
      uDeepColor: { value: new THREE.Color('#061a29') },
      uSurfaceColor: { value: new THREE.Color('#184e68') },
      uFoamColor: { value: new THREE.Color('#e2eff5') },
      uElevationMultiplier: { value: 1.8 },
      uOpacity: { value: 0.94 },
      uLightPosition: { value: new THREE.Vector3(6, 10, 4) },
      uHeightMap: { value: null as THREE.Texture | null },
      uNormalMap: { value: normalTexture },
    }),
    [normalTexture],
  );

  useFrame(({ clock }, delta) => {
    if (!materialRef.current) return;
    const { progress: scrollProgress, velocity } = readScroll();
    const dynamicSpeed = 0.65 + Math.min(Math.abs(velocity) * 1.5, 2.0);
    materialRef.current.uniforms.uTime.value += delta * dynamicSpeed;

    const waterLocalProgress = Math.min(
      Math.max((scrollProgress - 0.3) / 0.25, 0),
      1,
    );
    materialRef.current.uniforms.uWaveHeight.value = reducedMotion
      ? 0.035
      : 0.07 + Math.sin(waterLocalProgress * Math.PI) * 0.08;

    if (simulation.ready && !reducedMotion) {
      const elapsed = clock.getElapsedTime();
      if (
        elapsed > nextAmbientRippleRef.current &&
        pointerStrengthRef.current === 0
      ) {
        pointerRef.current.set(
          THREE.MathUtils.randFloatSpread(1.35),
          THREE.MathUtils.randFloatSpread(1.35),
        );
        pointerStrengthRef.current = 0.007;
        nextAmbientRippleRef.current = elapsed + 3.2 + Math.random() * 2.8;
      }

      const computeUniforms = simulation.variable.material.uniforms;
      computeUniforms.uMouse.value.copy(pointerRef.current);
      computeUniforms.uMouseStrength.value = pointerStrengthRef.current;
      simulation.gpu.compute();
      materialRef.current.uniforms.uHeightMap.value =
        simulation.gpu.getCurrentRenderTarget(simulation.variable).texture;
      pointerStrengthRef.current = 0;
      pointerRef.current.set(1000, 1000);
    }
  });

  const disturbWater = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv || reducedMotion) return;
    pointerRef.current.set(event.uv.x * 2 - 1, event.uv.y * 2 - 1);
    pointerStrengthRef.current = 0.018;
  };

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2.3, 0, 0]}
      position={[0, -0.6, 0]}
      onPointerMove={disturbWater}
      onPointerDown={disturbWater}
      receiveShadow
    >
      <planeGeometry args={[14, 14, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
