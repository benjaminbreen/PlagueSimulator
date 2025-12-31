import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingMetadata, BuildingType, DistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

export interface BirdcagePlacement {
  position: [number, number, number];
  bracketLength: number;
  cageSeed: number;
  sizeScale: number;
}

const HangingBirdcage: React.FC<BirdcagePlacement> = ({ position, bracketLength, cageSeed, sizeScale }) => {
  const cageRef = useRef<THREE.Group>(null);
  const birdRef = useRef<THREE.Group>(null);
  const birdColor = seededRandom(cageSeed + 1) > 0.5 ? '#d4a45d' : '#7a5a3a';
  const birdSize = 0.08;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Subtle cage sway
    if (cageRef.current) {
      cageRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
      cageRef.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.015;
    }
    // Bird hop and head bob
    if (birdRef.current) {
      birdRef.current.position.y = Math.sin(t * 2 + cageSeed) * 0.015;
      birdRef.current.rotation.y = Math.sin(t * 1.2 + cageSeed) * 0.3;
    }
  });

  const cageRadius = 0.18;
  const cageHeight = 0.4;

  return (
    <group position={position} scale={[sizeScale, sizeScale, sizeScale]}>
      {/* Chain/hanging wire from hook to cage */}
      <mesh position={[0, 0, bracketLength / 2]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, bracketLength, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* The cage group - positioned hanging from bracket end */}
      <group ref={cageRef} position={[0, -0.18, bracketLength]}>
        {/* Top ring */}
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[cageRadius, 0.015, 6, 16]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.85} metalness={0.4} />
        </mesh>
        {/* Mid ring */}
        <mesh position={[0, -cageHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[cageRadius * 0.9, 0.012, 6, 16]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.85} metalness={0.4} />
        </mesh>
        {/* Bottom ring */}
        <mesh position={[0, -cageHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[cageRadius, 0.015, 6, 16]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.85} metalness={0.4} />
        </mesh>

        {/* Vertical bars */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const x = Math.cos(angle) * (cageRadius - 0.01);
          const z = Math.sin(angle) * (cageRadius - 0.01);
          return (
            <mesh
              key={`bar-${i}`}
              position={[x, -cageHeight / 2, z]}
              castShadow
            >
              <cylinderGeometry args={[0.008, 0.008, cageHeight, 4]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.85} metalness={0.4} />
            </mesh>
          );
        })}

        {/* Hanging hook */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, cageRadius * 1.1, 4]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.85} metalness={0.4} />
        </mesh>

        {/* Base plate */}
        <mesh position={[0, -cageHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[cageRadius - 0.02, 12]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.9} metalness={0.2} />
        </mesh>

        {/* Perch */}
        <mesh position={[0, -cageHeight * 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, cageRadius * 1.4, 6]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
        </mesh>

        {/* Bird */}
        <group ref={birdRef} position={[0, -cageHeight * 0.55, 0]} scale={[birdSize, birdSize, birdSize]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshStandardMaterial color={birdColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.18, 0, 0]} castShadow>
            <sphereGeometry args={[0.1, 6, 4]} />
            <meshStandardMaterial color={birdColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.28, 0.02, 0]} castShadow>
            <coneGeometry args={[0.05, 0.1, 6]} />
            <meshStandardMaterial color="#d4a35a" roughness={0.7} />
          </mesh>
          {/* Eye */}
          <mesh position={[0.2, 0.04, 0.04]}>
            <sphereGeometry args={[0.02, 6, 4]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export function getBirdcagePlacements(
  buildings: BuildingMetadata[],
  district: DistrictType,
  mapSeed: number
): BirdcagePlacement[] {
  if (district === 'HOVELS' || district === 'OUTSKIRTS_DESERT') return [];

  const cages: BirdcagePlacement[] = [];
  const eligibleBuildings = buildings.filter((b) =>
    b.type === BuildingType.RESIDENTIAL || b.type === BuildingType.COMMERCIAL
  );

  for (let i = 0; i < eligibleBuildings.length; i += 1) {
    if (cages.length >= 2) break;
    const building = eligibleBuildings[i];
    const seed = mapSeed + building.position[0] * 100 + building.position[2] * 17;
    const roll = seededRandom(seed + 1);
    if (roll > 0.15) continue;

    const bracketLength = 0.5 + seededRandom(seed + 3) * 0.35;
    const sizeScale = 1 + seededRandom(seed + 9) * 1.0;
    const offsetX = (seededRandom(seed + 5) - 0.5) * 1.2;
    const offsetZ = (seededRandom(seed + 6) > 0.5 ? 1 : -1) * (1.2 + seededRandom(seed + 7) * 0.6);
    const height = 2.2 + seededRandom(seed + 8) * 1.0;
    const position: [number, number, number] = [
      building.position[0] + offsetX,
      building.position[1] + height,
      building.position[2] + offsetZ
    ];

    cages.push({
      position,
      bracketLength,
      cageSeed: seed,
      sizeScale
    });
  }

  return cages;
}

export const BirdcageSystem: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
  mapSeed: number;
}> = ({ buildings, district, mapSeed }) => {
  const birdcages = useMemo(
    () => getBirdcagePlacements(buildings, district, mapSeed),
    [buildings, district, mapSeed]
  );

  if (birdcages.length === 0) return null;

  return (
    <group>
      {birdcages.map((cage, i) => (
        <HangingBirdcage key={`birdcage-${i}`} {...cage} />
      ))}
    </group>
  );
};
