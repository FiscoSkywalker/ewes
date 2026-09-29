'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PipeNetworkProps {
  opacity?: number;
}

export const PipeNetwork: React.FC<PipeNetworkProps> = ({ opacity = 1.0 }) => {
  const networkRef = useRef<THREE.Group>(null);
  const pulseRingsRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    networkRef.current?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (pulseRingsRef.current) {
      pulseRingsRef.current.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh;
        // Travel along distribution conduit
        const t = (time * 1.0 + index * 0.38) % 2.6;
        mesh.position.z = -1.3 + t;
      });
    }
  });

  return (
    <group ref={networkRef} position={[0, -0.4, 0]}>
      {/* 1. PRIMARY INTAKE MAIN TRUNK (Section 15: Painted & galvanized steel) */}
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 3.6, 24]} />
        <meshStandardMaterial
          color="#51726a"
          metalness={0.75}
          roughness={0.35}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Bolted Flanges along main trunk */}
      {[-1.2, -0.6, 0.6, 1.2].map((x, i) => (
        <group key={`trunk-flange-${i}`} position={[x, 0.28, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.098, 0.098, 0.025, 16]} />
            <meshStandardMaterial
              color="#8f9e98"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Concrete Support Saddles / Pedestals (Section 15: Supports) */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={`support-pedestal-${i}`} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.24, 0.2]} />
          <meshStandardMaterial color="#777d74" roughness={0.94} />
        </mesh>
      ))}

      {/* 2. LATERAL PROCESS CONDUITS WITH 90° BENDS */}
      {[-0.85, 0, 0.85].map((x, i) => (
        <group key={`sub-pipe-${i}`} position={[x, 0.28, 0]}>
          {/* Main longitudinal pipe run */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 2.7, 16]} />
            <meshStandardMaterial
              color="#60857b"
              metalness={0.7}
              roughness={0.35}
              transparent
              opacity={opacity}
            />
          </mesh>

          {/* Bolted Flange Joint */}
          <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.068, 0.068, 0.02, 16]} />
            <meshStandardMaterial
              color="#a0aaa5"
              metalness={0.8}
              roughness={0.25}
            />
          </mesh>

          {/* Manual Gate Valve / Handwheel (Section 15: Valves) */}
          <group position={[0, 0.07, 0.6]}>
            {/* Valve stem */}
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            {/* Handwheel ring */}
            <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.035, 0.006, 8, 16]} />
              <meshStandardMaterial
                color="#d2ad45"
                metalness={0.68}
                roughness={0.3}
              />
            </mesh>
          </group>

          {/* Concrete Footing at ground */}
          <mesh position={[0, -0.16, 0.6]}>
            <boxGeometry args={[0.12, 0.22, 0.12]} />
            <meshStandardMaterial color="#737970" roughness={0.94} />
          </mesh>
        </group>
      ))}

      {/* 3. Luminous Fluid Flow Pulses (Hydraulic transmission telemetry) */}
      <group ref={pulseRingsRef}>
        {[-0.85, 0, 0.85].map((x, i) => (
          <mesh
            key={`flow-pulse-${i}`}
            position={[x, 0.28, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.052, 0.008, 8, 20]} />
            <meshBasicMaterial
              color="#73c6cf"
              transparent
              opacity={0.5 * opacity}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
