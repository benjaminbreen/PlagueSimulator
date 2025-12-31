/**
 * Hovels District (Al-Shaghour) Decorations
 *
 * The poor quarter of Damascus in 1348. Features:
 * - Communal bread ovens (tabun) - shared clay dome ovens
 * - Water jugs near doorways - daily water storage
 * - Chickens wandering the streets
 * - Narrow cramped alleys with small single-story dwellings
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

// Communal bread oven (tabun) - clay dome oven for baking flatbread
const CommunalBreadOven: React.FC<{ position: [number, number, number]; seed: number }> = ({ position, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);

  // Slight variation in size
  const scale = 0.9 + rand(1) * 0.2;

  // Color variation - worn clay
  const clayColors = ['#9a7a5a', '#8a6a4a', '#aa8a6a'];
  const clayColor = clayColors[Math.floor(rand(2) * clayColors.length)];

  // Is the oven currently in use (has fire/smoke)?
  const isActive = rand(3) > 0.6;

  return (
    <group position={position} scale={scale}>
      {/* Stone base platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.0, 1.1, 0.2, 12]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.98} />
      </mesh>

      {/* Clay dome oven body - hemisphere */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.9, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={clayColor} roughness={0.95} />
      </mesh>

      {/* Soot/smoke staining at top */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.96} />
      </mesh>

      {/* Opening (arched entrance for loading bread) */}
      <mesh position={[0.7, 0.45, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.98} />
      </mesh>

      {/* Clay arch frame around opening */}
      <mesh position={[0.85, 0.45, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.35, 0.08, 8, 12, Math.PI]} />
        <meshStandardMaterial color={clayColor} roughness={0.95} />
      </mesh>

      {/* Lower opening for adding fuel */}
      <mesh position={[0.7, 0.15, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.98} />
      </mesh>

      {/* Ash pile at base */}
      <mesh position={[0.9, 0.02, 0.1]} receiveShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.98} />
      </mesh>
      <mesh position={[0.95, 0.02, -0.05]} receiveShadow>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.98} />
      </mesh>

      {/* Firewood stack nearby */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`wood-${i}`}
          position={[
            -0.6 + (i % 2) * 0.08,
            0.25 + Math.floor(i / 2) * 0.12,
            -0.4 + (i % 2) * 0.05
          ]}
          rotation={[0, rand(10 + i) * Math.PI * 2, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.05, 0.4, 6]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.92} />
        </mesh>
      ))}

      {/* Active oven: glowing coals visible in opening */}
      {isActive && (
        <>
          <mesh position={[0.65, 0.45, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={0.8} />
          </mesh>
          {/* Dim orange glow from lower fuel opening */}
          <mesh position={[0.65, 0.15, 0]}>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshStandardMaterial color="#ff6622" emissive="#ff6622" emissiveIntensity={0.6} />
          </mesh>
        </>
      )}

      {/* Simple wooden paddle for loading bread (leaning against oven) */}
      <mesh position={[-0.3, 0.5, 0.7]} rotation={[-0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.08, 1.2, 0.3]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.22, 0.12, 0.85]} rotation={[-0.3, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Water jug cluster near doorway
const DoorwayWaterJugs: React.FC<{ position: [number, number, number]; seed: number }> = ({ position, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);

  // 1-3 jugs per doorway
  const jugCount = 1 + Math.floor(rand(1) * 3);

  return (
    <group position={position}>
      {Array.from({ length: jugCount }).map((_, i) => {
        const offsetX = (i - jugCount / 2) * 0.25;
        const offsetZ = rand(10 + i) * 0.15 - 0.075;
        const rotation = rand(20 + i) * Math.PI * 2;
        const scale = 0.8 + rand(30 + i) * 0.3;

        // Simple clay amphora/jug
        return (
          <group key={`jug-${i}`} position={[offsetX, 0, offsetZ]} rotation={[0, rotation, 0]} scale={scale}>
            {/* Jug body */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
              <sphereGeometry args={[0.12, 8, 10, 0, Math.PI * 2, 0, Math.PI]} />
              <meshStandardMaterial color="#9a7a5a" roughness={0.95} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
              <meshStandardMaterial color="#9a7a5a" roughness={0.95} />
            </mesh>

            {/* Rim */}
            <mesh position={[0, 0.31, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.02, 8]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
            </mesh>

            {/* Handle (simple loop) */}
            <mesh position={[0.09, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <torusGeometry args={[0.05, 0.015, 6, 8]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.94} />
            </mesh>

            {/* Base */}
            <mesh position={[0, 0.02, 0]} receiveShadow>
              <cylinderGeometry args={[0.08, 0.06, 0.04, 8]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.96} />
            </mesh>

            {/* Water inside (visible at top if looking down) */}
            {rand(40 + i) > 0.3 && (
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.02, 8]} />
                <meshStandardMaterial color="#4a6a7a" roughness={0.2} transparent opacity={0.7} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

interface HovelsDecorProps {
  mapX: number;
  mapY: number;
  buildingPositions?: Array<[number, number, number]>;
}

export const HovelsDecor: React.FC<HovelsDecorProps> = ({ mapX, mapY, buildingPositions = [] }) => {
  const district = getDistrictType(mapX, mapY);

  if (district !== 'HOVELS') return null;

  const seedBase = mapX * 1000 + mapY * 13 + 4444;
  const rand = (offset: number) => seededRandom(seedBase + offset);

  // Place 2-3 communal bread ovens in the district
  const ovenCount = 2 + Math.floor(rand(1) * 2);
  const ovens = useMemo(() => {
    return Array.from({ length: ovenCount }).map((_, i) => {
      const angle = rand(10 + i * 5) * Math.PI * 2;
      const dist = 8 + rand(20 + i * 7) * 12;
      return {
        position: [Math.cos(angle) * dist, 0.2, Math.sin(angle) * dist] as [number, number, number],
        seed: seedBase + i * 100
      };
    });
  }, [seedBase, ovenCount]);

  // Place water jugs near building doors
  const waterJugs = useMemo(() => {
    // Only place jugs near residential buildings
    const validBuildings = buildingPositions.filter((_, idx) => {
      // Use building position to determine if it should have water jugs
      // About 60% of buildings get water jugs
      const buildingSeed = seedBase + idx * 17;
      return seededRandom(buildingSeed) > 0.4;
    });

    return validBuildings.map((buildingPos, idx) => {
      // Place jug cluster near the building entrance
      // Offset slightly from building center (varies by building)
      const offsetAngle = rand(100 + idx) * Math.PI * 2;
      const offsetDist = 3.5 + rand(200 + idx) * 1.5; // Near the door

      return {
        position: [
          buildingPos[0] + Math.cos(offsetAngle) * offsetDist,
          buildingPos[1],
          buildingPos[2] + Math.sin(offsetAngle) * offsetDist
        ] as [number, number, number],
        seed: seedBase + idx * 50
      };
    });
  }, [buildingPositions, seedBase]);

  return (
    <group>
      {/* Communal bread ovens */}
      {ovens.map((oven, i) => (
        <CommunalBreadOven key={`oven-${i}`} position={oven.position} seed={oven.seed} />
      ))}

      {/* Water jugs near doorways */}
      {waterJugs.map((jug, i) => (
        <DoorwayWaterJugs key={`jug-${i}`} position={jug.position} seed={jug.seed} />
      ))}
    </group>
  );
};

export default HovelsDecor;
