/**
 * Mountain Shrine District Decorations
 * Cedar trees, rocks, bushes, path, torches, and Islamic shrine at peak
 */

import React from 'react';
import { getDistrictType } from '../../../types';
import { getTerrainHeight } from '../../../utils/terrain';

export const MountainShrineDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
}> = ({ mapX, mapY, timeOfDay, terrainSeed, onTreePositionsGenerated }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'MOUNTAIN_SHRINE') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Cedar trees - positioned on the hillsides
  const trees = [
    [-25, 0, -15], [-18, 0, -22], [-12, 0, -18], [-8, 0, -25],
    [20, 0, -18], [15, 0, -12], [22, 0, -8], [18, 0, -20],
    [-22, 0, 12], [-15, 0, 18], [-10, 0, 15], [-20, 0, 20],
    [12, 0, 15], [18, 0, 20], [10, 0, 22], [15, 0, 12],
    [-28, 0, 0], [28, 0, -2], [-15, 0, -8], [16, 0, 8],
    [-10, 0, -12], [12, 0, -15], [-8, 0, 18], [8, 0, -22],
  ] as Array<[number, number, number]>;

  // Report tree positions to parent for collision detection
  React.useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(trees);
    }
  }, [onTreePositionsGenerated]);

  // Rocks scattered on hillsides
  const rocks = [
    [-30, 0, -20], [-22, 0, -8], [-15, 0, -25], [-8, 0, -15],
    [25, 0, -15], [18, 0, -5], [12, 0, -20], [20, 0, -25],
    [-25, 0, 15], [-18, 0, 22], [-12, 0, 8], [-20, 0, 25],
    [15, 0, 18], [22, 0, 25], [8, 0, 12], [18, 0, 8],
    [-12, 0, 5], [10, 0, -8], [-18, 0, -12], [15, 0, -18],
  ] as Array<[number, number, number]>;

  // Bushes for undergrowth
  const bushes = [
    [-20, 0, -12], [-14, 0, -18], [-10, 0, -20], [-16, 0, -8],
    [18, 0, -14], [12, 0, -18], [15, 0, -10], [20, 0, -16],
    [-18, 0, 14], [-12, 0, 20], [-15, 0, 16], [-22, 0, 18],
    [14, 0, 16], [20, 0, 20], [12, 0, 12], [16, 0, 18],
  ] as Array<[number, number, number]>;

  // Path waypoints from base to shrine at top
  const pathPoints = [
    [0, 0, -40], // Start at bottom
    [-8, 0, -30],
    [-12, 0, -20],
    [-8, 0, -10],
    [0, 0, -5],
    [6, 0, 2],
    [4, 0, 8],
    [0, 0, 12], // Near shrine
  ] as Array<[number, number, number]>;

  // Torches along path (every other waypoint)
  const torches = pathPoints.filter((_, i) => i % 2 === 1);

  return (
    <group>
      {/* Cedar Trees */}
      {trees.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const treeHeight = 6 + Math.sin(i * 1.3) * 1.5;
        const trunkHeight = treeHeight * 0.5;
        const foliageHeight = treeHeight * 0.55;

        return (
          <group key={`tree-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.25, 0.35, trunkHeight, 6]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
            </mesh>
            {/* Foliage - conical cedar shape */}
            <mesh position={[0, trunkHeight + foliageHeight / 2, 0]} castShadow receiveShadow>
              <coneGeometry args={[1.8, foliageHeight, 8]} />
              <meshStandardMaterial color="#3a5a3a" roughness={0.85} />
            </mesh>
            <mesh position={[0, trunkHeight + foliageHeight * 0.25, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2, foliageHeight * 0.7, 8]} />
              <meshStandardMaterial color="#2f4f2f" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* Rocks - NOW DYNAMIC PHYSICS OBJECTS, rendered via PushableDecorations
      {rocks.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const rockSize = 0.8 + Math.sin(i * 2.1) * 0.4;
        const rotation = [
          Math.PI * 0.1 * Math.sin(i),
          Math.PI * 2 * Math.sin(i * 0.7),
          Math.PI * 0.15 * Math.cos(i)
        ] as [number, number, number];

        return (
          <mesh key={`rock-${i}`} position={[pos[0], h + rockSize * 0.4, pos[2]]} rotation={rotation} castShadow receiveShadow>
            <dodecahedronGeometry args={[rockSize, 0]} />
            <meshStandardMaterial color="#6a6a5a" roughness={0.95} />
          </mesh>
        );
      })}
      */}

      {/* Bushes */}
      {bushes.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const bushSize = 0.6 + Math.cos(i * 1.8) * 0.2;

        return (
          <group key={`bush-${i}`} position={[pos[0], h, pos[2]]}>
            <mesh position={[0, bushSize * 0.5, 0]} castShadow receiveShadow>
              <sphereGeometry args={[bushSize, 6, 5]} />
              <meshStandardMaterial color="#4a6a4a" roughness={0.9} />
            </mesh>
            <mesh position={[bushSize * 0.3, bushSize * 0.3, bushSize * 0.2]} castShadow receiveShadow>
              <sphereGeometry args={[bushSize * 0.7, 6, 5]} />
              <meshStandardMaterial color="#456645" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Path segments */}
      {pathPoints.map((point, i) => {
        if (i === pathPoints.length - 1) return null;
        const nextPoint = pathPoints[i + 1];
        const midX = (point[0] + nextPoint[0]) / 2;
        const midZ = (point[2] + nextPoint[2]) / 2;
        const h = getTerrainHeight(district, midX, midZ, terrainSeed);
        const dx = nextPoint[0] - point[0];
        const dz = nextPoint[2] - point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        return (
          <mesh
            key={`path-${i}`}
            position={[midX, h + 0.05, midZ]}
            rotation={[-Math.PI / 2, 0, angle]}
            receiveShadow
          >
            <planeGeometry args={[1.5, length]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Torches along path */}
      {torches.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);

        return (
          <group key={`torch-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Torch post */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
            </mesh>
            {/* Torch top */}
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {/* Flame */}
            {nightFactor > 0.05 && (
              <>
                <mesh position={[0, 3.4, 0]}>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial
                    color="#ff8a3c"
                    emissive="#ff6a1c"
                    emissiveIntensity={0.8 + Math.sin(Date.now() * 0.005 + i) * 0.2}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight
                  position={[0, 3.5, 0]}
                  intensity={2.5 * nightFactor}
                  distance={15}
                  decay={2}
                  color="#ff9a4c"
                  castShadow
                />
              </>
            )}
          </group>
        );
      })}

      {/* Islamic Shrine at the peak */}
      <group position={[0, getTerrainHeight(district, 0, 15, terrainSeed), 15]}>
        {/* Main shrine building - small domed structure */}
        <group>
          {/* Base platform */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[4.5, 5, 0.4, 8]} />
            <meshStandardMaterial color="#b8a890" roughness={0.85} />
          </mesh>

          {/* Octagonal walls */}
          <mesh position={[0, 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.2, 3.5, 3.6, 8]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.88} />
          </mesh>

          {/* Decorative band */}
          <mesh position={[0, 3.6, 0]} castShadow>
            <cylinderGeometry args={[3.3, 3.3, 0.3, 8]} />
            <meshStandardMaterial color="#8a7a5a" roughness={0.8} />
          </mesh>

          {/* Dome */}
          <mesh position={[0, 4.8, 0]} castShadow>
            <sphereGeometry args={[2.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#7a9a8a" roughness={0.6} metalness={0.3} />
          </mesh>

          {/* Crescent finial */}
          <mesh position={[0, 7.4, 0]} castShadow rotation={[0, 0, Math.PI * 0.15]}>
            <torusGeometry args={[0.3, 0.08, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.7} />
          </mesh>

          {/* Arched doorway */}
          <mesh position={[0, 1.5, 3.55]} castShadow>
            <boxGeometry args={[1.2, 2.4, 0.2]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.7, 3.55]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.2, 8, 1, false, 0, Math.PI]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>

          {/* Windows (4 sides) */}
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => (
            <group key={`window-${i}`} rotation={[0, angle, 0]}>
              <mesh position={[0, 2.5, 3.4]} castShadow>
                <boxGeometry args={[0.6, 0.8, 0.1]} />
                <meshStandardMaterial color="#2a4a5a" roughness={0.3} metalness={0.2} opacity={0.6} transparent />
              </mesh>
            </group>
          ))}

          {/* Interior lighting at night */}
          {nightFactor > 0.05 && (
            <>
              <pointLight
                position={[0, 2, 0]}
                intensity={3 * nightFactor}
                distance={12}
                decay={2}
                color="#ffd8a8"
              />
              <mesh position={[0, 1.5, 3.6]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial
                  color="#ffb86c"
                  emissive="#ff9a4c"
                  emissiveIntensity={0.6 * nightFactor}
                />
              </mesh>
            </>
          )}
        </group>

        {/* Prayer mat outside */}
        <mesh position={[0, 0.42, 5.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial color="#8a4a4a" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
