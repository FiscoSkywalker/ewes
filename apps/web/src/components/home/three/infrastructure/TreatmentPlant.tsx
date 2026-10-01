'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { readScroll } from '@/lib/scroll-state';

interface TreatmentPlantProps {
  reducedMotion?: boolean;
}

export const TreatmentPlant: React.FC<TreatmentPlantProps> = ({
  reducedMotion = false,
}) => {
  const plantRef = useRef<THREE.Group>(null);
  const clarifierBridge1Ref = useRef<THREE.Group>(null);
  const clarifierBridge2Ref = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    plantRef.current?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, []);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const scrollBoost = Math.min(Math.abs(readScroll().velocity) * 0.3, 0.55);
    if (clarifierBridge1Ref.current) {
      clarifierBridge1Ref.current.rotation.y += delta * (0.12 + scrollBoost);
    }
    if (clarifierBridge2Ref.current) {
      clarifierBridge2Ref.current.rotation.y -=
        delta * (0.09 + scrollBoost * 0.8);
    }
  });

  return (
    <group ref={plantRef} position={[0, -0.45, 0]}>
      {/* 1. REINFORCED CONCRETE APRON / FOUNDATION (Section 20: Concrete PBR) */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[5.2, 0.12, 4.0]} />
        <meshStandardMaterial
          color="#747b72"
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>

      {/* Expansion seams and access driveway markers */}
      <gridHelper
        args={[5.2, 20, '#b8a66a', '#5f6861']}
        position={[0, 0.005, 0]}
      />

      {/* 2. PRIMARY CIRCULAR CLARIFIER (Basin A) */}
      <group position={[-1.35, 0.16, 0.5]}>
        {/* Outer reinforced concrete tank wall */}
        <mesh>
          <cylinderGeometry args={[0.78, 0.78, 0.32, 36, 1, true]} />
          <meshStandardMaterial
            color="#777f78"
            roughness={0.9}
            metalness={0.03}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Peripheral Effluent Launder (Overflow weir trough) */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.06, 36, 1, true]} />
          <meshStandardMaterial
            color="#929b94"
            roughness={0.72}
            metalness={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Tank floor */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.77, 0.77, 0.02, 36]} />
          <meshStandardMaterial color="#46514b" roughness={0.94} />
        </mesh>
        {/* Natural treated water layer inside basin */}
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.76, 0.76, 0.02, 36]} />
          <meshPhysicalMaterial
            color="#2b7885"
            roughness={0.14}
            metalness={0.02}
            clearcoat={0.9}
            clearcoatRoughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Central feed well cylinder */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.22, 16, 1, true]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.5}
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Rotating galvanized steel bridge with safety handrails */}
        <group ref={clarifierBridge1Ref} position={[0, 0.22, 0]}>
          {/* Main walkway beam */}
          <mesh>
            <boxGeometry args={[1.52, 0.03, 0.1]} />
            <meshStandardMaterial
              color="#9ba7a2"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Handrails (Left & Right) */}
          <mesh position={[0, 0.08, 0.045]}>
            <boxGeometry args={[1.52, 0.08, 0.006]} />
            <meshStandardMaterial
              color="#d4b353"
              metalness={0.45}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.08, -0.045]}>
            <boxGeometry args={[1.52, 0.08, 0.006]} />
            <meshStandardMaterial
              color="#d4b353"
              metalness={0.45}
              roughness={0.4}
            />
          </mesh>
          {/* Center motor / drive mechanism */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* 3. SECONDARY CIRCULAR CLARIFIER (Basin B) */}
      <group position={[1.35, 0.16, 0.5]}>
        <mesh>
          <cylinderGeometry args={[0.78, 0.78, 0.32, 36, 1, true]} />
          <meshStandardMaterial
            color="#777f78"
            roughness={0.9}
            metalness={0.03}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.06, 36, 1, true]} />
          <meshStandardMaterial
            color="#929b94"
            roughness={0.72}
            metalness={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.77, 0.77, 0.02, 36]} />
          <meshStandardMaterial color="#46514b" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.76, 0.76, 0.02, 36]} />
          <meshPhysicalMaterial
            color="#337f8d"
            roughness={0.14}
            metalness={0.02}
            clearcoat={0.9}
            clearcoatRoughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.22, 16, 1, true]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.5}
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        <group ref={clarifierBridge2Ref} position={[0, 0.22, 0]}>
          <mesh>
            <boxGeometry args={[1.52, 0.03, 0.1]} />
            <meshStandardMaterial
              color="#9ba7a2"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.08, 0.045]}>
            <boxGeometry args={[1.52, 0.08, 0.006]} />
            <meshStandardMaterial
              color="#d4b353"
              metalness={0.45}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.08, -0.045]}>
            <boxGeometry args={[1.52, 0.08, 0.006]} />
            <meshStandardMaterial
              color="#d4b353"
              metalness={0.45}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* 4. RECTANGULAR FILTRATION CELLS & FLOC CHANNELS (Section 14) */}
      {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
        <group key={`filter-cell-${i}`} position={[x, 0.14, -0.85]}>
          {/* Concrete dividing basin walls */}
          <mesh>
            <boxGeometry args={[0.45, 0.28, 0.95]} />
            <meshStandardMaterial
              color="#747c75"
              roughness={0.92}
              metalness={0.03}
            />
          </mesh>
          {/* Water filtration surface */}
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.38, 0.02, 0.88]} />
            <meshStandardMaterial
              color="#398a96"
              roughness={0.15}
              transparent
              opacity={0.82}
            />
          </mesh>
          {/* Surface wash header pipe */}
          <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* 5. ELEVATED TREATED WATER STORAGE TANKS (Section 16: Cylindrical reservoirs) */}
      {[-2.0, 2.0].map((x, i) => (
        <group key={`res-tank-${i}`} position={[x, 0.38, -0.9]}>
          {/* Tank shell */}
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.76, 24]} />
            <meshStandardMaterial
              color="#88938e"
              metalness={0.62}
              roughness={0.34}
            />
          </mesh>
          {/* Conical roof */}
          <mesh position={[0, 0.42, 0]}>
            <coneGeometry args={[0.44, 0.12, 24]} />
            <meshStandardMaterial
              color="#626d67"
              metalness={0.52}
              roughness={0.44}
            />
          </mesh>
          {/* Access cage ladder on tank side */}
          <mesh position={[0.43, 0, 0]}>
            <boxGeometry args={[0.02, 0.74, 0.08]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 6. SCADA CONTROL PAVILION & SERVICE BUILDING (Section 14 & 20) */}
      <group position={[0, 0.32, -1.35]}>
        {/* Main control architecture */}
        <mesh>
          <boxGeometry args={[1.3, 0.64, 0.75]} />
          <meshStandardMaterial
            color="#4c5852"
            roughness={0.66}
            metalness={0.08}
          />
        </mesh>
        {/* Supervisory Observation Glazing (Section 20: Glass) — reflets de
            la carte d'environnement plutôt que `transmission`, qui imposait
            un second rendu complet de la scène à chaque image. */}
        <mesh position={[0, 0.06, 0.38]}>
          <planeGeometry args={[1.0, 0.28]} />
          <meshStandardMaterial
            color="#8fc5c4"
            roughness={0.1}
            metalness={0.2}
            transparent
            opacity={0.78}
          />
        </mesh>
        {/* Telemetry SCADA Mast */}
        <mesh position={[0.45, 0.5, 0]}>
          <cylinderGeometry args={[0.008, 0.015, 0.42, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
      </group>

      {/* Access walkways, drainage and safety details provide a believable scale. */}
      {[-2.35, 2.35].map((x) => (
        <group key={`edge-rail-${x}`} position={[x, 0.18, 0]}>
          <mesh>
            <boxGeometry args={[0.025, 0.34, 3.55]} />
            <meshStandardMaterial
              color="#c8a845"
              metalness={0.5}
              roughness={0.38}
            />
          </mesh>
          {[-1.65, -0.82, 0, 0.82, 1.65].map((z) => (
            <mesh key={z} position={[0, -0.08, z]}>
              <boxGeometry args={[0.035, 0.42, 0.035]} />
              <meshStandardMaterial
                color="#c8a845"
                metalness={0.5}
                roughness={0.38}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.02, 1.62]}>
        <boxGeometry args={[4.7, 0.025, 0.22]} />
        <meshStandardMaterial color="#525d56" roughness={0.88} />
      </mesh>
    </group>
  );
};
