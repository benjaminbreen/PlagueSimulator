/**
 * Umayyad Mosque District
 *
 * The Great Mosque of Damascus and its immediate surroundings.
 * Features the mosque at center with open courtyard space, surrounded by
 * dense urban buildings and narrow alleys at the perimeter.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { sampleTerrainHeight, TerrainHeightmap } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';
import UmayyadMosque from '../landmarks/UmayyadMosque';

interface UmayyadMosqueDistrictProps {
  mapX: number;
  mapY: number;
  terrainHeightmap: TerrainHeightmap;
  sessionSeed: number;
  playerPosition?: THREE.Vector3;
}

const UmayyadMosqueDistrict: React.FC<UmayyadMosqueDistrictProps> = ({
  mapX,
  mapY,
  terrainHeightmap,
  sessionSeed,
  playerPosition
}) => {
  const district = getDistrictType(mapX, mapY);

  const perimeterBuildings = useMemo(() => {
    if (district !== 'UMAYYAD_MOSQUE') return [];

    const seed = mapX * 1000 + mapY * 13 + sessionSeed;
    const items: JSX.Element[] = [];
    let idCounter = 0;

    const rand = (offset = 0) => seededRandom(seed + offset);

    // Dense buildings around the perimeter (at edges of the district)
    // Create a ring of buildings at ~25-30 units from center
    const buildingCount = 16;
    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const distance = 25 + rand(i * 50) * 5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = sampleTerrainHeight(terrainHeightmap, x, z);

      const width = 3 + rand(i * 100) * 2;
      const depth = 3 + rand(i * 100 + 25) * 2;
      const height = 4 + rand(i * 100 + 50) * 3;
      const rotation = angle + Math.PI / 2; // Face inward toward mosque

      items.push(
        <group key={`building-${idCounter++}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.95} />
          </mesh>
          {/* Doorway */}
          <mesh position={[width / 2 + 0.01, height * 0.25, 0]}>
            <boxGeometry args={[0.1, height * 0.4, 1]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
          </mesh>
        </group>
      );
    }

    // Add a few shops/stalls around the outer edge
    const shopCount = 8;
    for (let i = 0; i < shopCount; i++) {
      const angle = (i / shopCount) * Math.PI * 2 + Math.PI / shopCount;
      const distance = 22 + rand(i * 75) * 3;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = sampleTerrainHeight(terrainHeightmap, x, z);

      items.push(
        <group key={`shop-${idCounter++}`} position={[x, y, z]}>
          {/* Shop canopy */}
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[2, 0.1, 2]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
          </mesh>
          {/* Support posts */}
          <mesh position={[-0.8, 1, -0.8]}>
            <cylinderGeometry args={[0.08, 0.08, 2, 6]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
          </mesh>
          <mesh position={[0.8, 1, -0.8]}>
            <cylinderGeometry args={[0.08, 0.08, 2, 6]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
          </mesh>
        </group>
      );
    }

    return items;
  }, [mapX, mapY, district, terrainHeightmap, sessionSeed]);

  if (district !== 'UMAYYAD_MOSQUE') return null;

  return (
    <group>
      {/* The mosque itself at center */}
      <UmayyadMosque mapX={mapX} mapY={mapY} playerPosition={playerPosition} />

      {/* Surrounding buildings */}
      {perimeterBuildings}
    </group>
  );
};

export default UmayyadMosqueDistrict;
