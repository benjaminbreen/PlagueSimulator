/**
 * Desert Outskirts Decorations
 * Arid scrubland, crossroads sign, sparse structures
 */

import React from 'react';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import { BedouinTent } from '../decorations/BedouinTent';

// Helper to get Bedouin tent positions for merchant generation
export const getBedouinTentPositions = (mapX: number, mapY: number, district: string): Array<{ pos: [number, number, number]; seed: number }> => {
  if (district !== 'OUTSKIRTS_DESERT') return [];

  const seed = mapX * 73 + mapY * 139;
  const rand = (offset: number) => seededRandom(seed + offset);
  const tentCount = 1 + (rand(100) > 0.4 ? 1 : 0); // 1-2 tents
  const tents: Array<{ pos: [number, number, number]; seed: number }> = [];

  for (let i = 0; i < tentCount; i++) {
    const angle = rand(110 + i) * Math.PI * 2;
    const distance = 12 + rand(120 + i) * 10;
    tents.push({
      pos: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance],
      seed: seed + i * 50
    });
  }

  return tents;
};

export const OutskirtsDesertDecor: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'OUTSKIRTS_DESERT') return null;

  // Bedouin tent spawning (1-2 tents always)
  const seed = mapX * 73 + mapY * 139;
  const rand = (offset: number) => seededRandom(seed + offset);
  const tentCount = 1 + (rand(100) > 0.4 ? 1 : 0); // 1-2 tents
  const tents: Array<{ pos: [number, number, number]; seed: number }> = [];
  for (let i = 0; i < tentCount; i++) {
    const angle = rand(110 + i) * Math.PI * 2;
    const distance = 12 + rand(120 + i) * 10;
    tents.push({
      pos: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance],
      seed: seed + i * 50
    });
  }

  const scrub: Array<[number, number, number]> = [
    [-14, 0, -8],
    [12, 0, -10],
    [-6, 0, 12],
    [10, 0, 14],
    [0, 0, 6],
  ];
  const signs: Array<[number, number, number]> = [
    [0, 0, 0],
    [-10, 0, -6],
  ];
  const sheds: Array<[number, number, number]> = [
    [16, 0, 6],
    [-18, 0, 10],
  ];
  const palms: Array<[number, number, number]> = [
    [-12, 0, -2],
    [8, 0, 12],
    [18, 0, -6],
  ];

  return (
    <group>
      {scrub.map((pos, i) => (
        <mesh key={`scrub-${i}`} position={pos} castShadow>
          <sphereGeometry args={[0.7, 7, 5]} />
          <meshStandardMaterial color="#7a7a4a" roughness={0.9} />
        </mesh>
      ))}
      {signs.map((pos, i) => (
        <group key={`sign-${i}`} position={pos}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 2.0, 6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
            <boxGeometry args={[1.6, 0.4, 0.08]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.4, 0]} rotation={[0, -Math.PI / 6, 0]} castShadow>
            <boxGeometry args={[1.2, 0.3, 0.08]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {sheds.map((pos, i) => (
        <group key={`shed-${i}`} position={pos}>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.6, 1.6, 2.0]} />
            <meshStandardMaterial color="#c8b89a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.7, 0]} castShadow>
            <boxGeometry args={[2.9, 0.25, 2.3]} />
            <meshStandardMaterial color="#7a644a" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {palms.map((pos, i) => {
        const frondCount = 12;
        const seed = i * 0.618;
        return (
          <group key={`palm-${i}`} position={pos}>
            {/* Trunk with segmented texture pattern */}
            <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.28, 5.2, 8]} />
              <meshStandardMaterial
                color="#8a6a4a"
                roughness={0.95}
                bumpScale={0.15}
              />
            </mesh>

            {/* Date clusters at crown */}
            {[0, 1, 2, 3].map((clusterIdx) => {
              const angle = (clusterIdx / 4) * Math.PI * 2 + seed;
              const x = Math.cos(angle) * 0.3;
              const z = Math.sin(angle) * 0.3;
              return (
                <mesh
                  key={`dates-${clusterIdx}`}
                  position={[x, 5.0, z]}
                  castShadow
                >
                  <sphereGeometry args={[0.25, 6, 5]} />
                  <meshStandardMaterial color="#8a5a2a" roughness={0.8} />
                </mesh>
              );
            })}

            {/* Individual palm fronds radiating from crown - simplified droopy fronds */}
            {Array.from({ length: frondCount }).map((_, frondIdx) => {
              const angle = (frondIdx / frondCount) * Math.PI * 2 + seed; // Radial angle around tree
              const droop = 0.4 + (Math.sin(seed + frondIdx) * 0.1); // Downward droop (0.3-0.5 radians)
              const length = 2.8 + (Math.sin(seed * 2 + frondIdx) * 0.5); // Frond length variation

              return (
                <group
                  key={`frond-${frondIdx}`}
                  position={[0, 5.2, 0]}
                  rotation={[0, angle, 0]} // First rotate radially around tree
                >
                  {/* Rotate frond to point outward and droop down */}
                  <mesh
                    position={[0, 0, 0]}
                    rotation={[Math.PI / 2 + droop, 0, 0]} // 90° to horizontal + droop angle
                    castShadow
                  >
                    <coneGeometry args={[0.4, length, 6, 1, true]} />
                    <meshStandardMaterial
                      color="#4a7a2a"
                      roughness={0.75}
                      side={2}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Bedouin Tents */}
      {tents.map((tent, i) => (
        <BedouinTent key={`tent-${i}`} position={tent.pos} seed={tent.seed} timeOfDay={timeOfDay} />
      ))}
    </group>
  );
};
