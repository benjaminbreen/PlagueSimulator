/**
 * Salhiyya District Decorations
 * Olive and pine trees, grass patches, bushes, and dirt paths between buildings
 */

import React from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { getTerrainHeight, TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';

export const SalhiyyaDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
  buildingPositions?: Array<[number, number, number]>;
  heightmap?: TerrainHeightmap | null;
}> = ({ mapX, mapY, timeOfDay, terrainSeed, onTreePositionsGenerated, buildingPositions = [], heightmap }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'SALHIYYA') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Generate path segments between nearby buildings
  const pathSegments = React.useMemo(() => {
    if (buildingPositions.length === 0) return [];

    interface PathSegment {
      start: [number, number, number];
      end: [number, number, number];
      midpoint: [number, number, number];
      length: number;
      angle: number;
    }

    const segments: PathSegment[] = [];
    const usedPairs = new Set<string>();

    // For each building, connect to 2-3 nearest neighbors
    buildingPositions.forEach((building, i) => {
      // Calculate distances to all other buildings
      const distances = buildingPositions
        .map((other, j) => ({
          index: j,
          distance: Math.sqrt(
            Math.pow(building[0] - other[0], 2) +
            Math.pow(building[2] - other[2], 2)
          )
        }))
        .filter(d => d.index !== i) // Exclude self
        .sort((a, b) => a.distance - b.distance);

      // Connect to 2-3 nearest neighbors
      const connectionCount = Math.min(3, distances.length);
      for (let c = 0; c < connectionCount; c++) {
        const neighborIndex = distances[c].index;
        const neighbor = buildingPositions[neighborIndex];

        // Create unique pair ID (always smaller index first)
        const pairId = i < neighborIndex ? `${i}-${neighborIndex}` : `${neighborIndex}-${i}`;

        // Skip if we've already created this path
        if (usedPairs.has(pairId)) continue;
        usedPairs.add(pairId);

        // Create path segment
        const dx = neighbor[0] - building[0];
        const dz = neighbor[2] - building[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        segments.push({
          start: building,
          end: neighbor,
          midpoint: [
            (building[0] + neighbor[0]) / 2,
            0,
            (building[2] + neighbor[2]) / 2
          ],
          length,
          angle
        });
      }
    });

    return segments;
  }, [buildingPositions]);

  // Olive and pine trees scattered on hillsides
  const trees = [
    [-30, 0, -22], [-25, 0, -15], [-20, 0, -28], [-15, 0, -20], [-28, 0, -8],
    [28, 0, -18], [22, 0, -25], [18, 0, -12], [25, 0, -8], [32, 0, -15],
    [-28, 0, 20], [-22, 0, 28], [-18, 0, 15], [-25, 0, 10], [-32, 0, 25],
    [25, 0, 22], [20, 0, 30], [15, 0, 18], [28, 0, 12], [32, 0, 28],
    [-15, 0, -32], [-10, 0, -25], [12, 0, -30], [8, 0, -20],
    [-12, 0, 30], [-8, 0, 25], [10, 0, 32], [15, 0, 25],
    [0, 0, -35], [0, 0, 35], [-35, 0, 0], [35, 0, 0],
  ] as Array<[number, number, number]>;

  // Report tree positions to parent for collision detection
  React.useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(trees);
    }
  }, [onTreePositionsGenerated]);

  // Grass patches
  const grassPatches = [
    [-20, 0, -15], [-12, 0, -22], [-8, 0, -12], [-25, 0, -5],
    [18, 0, -14], [12, 0, -20], [22, 0, -10], [28, 0, -6],
    [-22, 0, 18], [-15, 0, 25], [-10, 0, 15], [-28, 0, 12],
    [20, 0, 20], [15, 0, 28], [10, 0, 16], [25, 0, 10],
    [-5, 0, -28], [-2, 0, -18], [5, 0, -25], [8, 0, -15],
    [-6, 0, 25], [-3, 0, 18], [4, 0, 28], [6, 0, 20],
  ] as Array<[number, number, number]>;

  // Bushes for undergrowth
  const bushes = [
    [-18, 0, -12], [-14, 0, -18], [-10, 0, -20], [-22, 0, -8],
    [16, 0, -14], [12, 0, -16], [18, 0, -10], [22, 0, -12],
    [-18, 0, 14], [-12, 0, 20], [-15, 0, 16], [-22, 0, 18],
    [14, 0, 16], [18, 0, 20], [12, 0, 12], [20, 0, 18],
    [-8, 0, -24], [-5, 0, -20], [6, 0, -22], [8, 0, -18],
    [-6, 0, 22], [-4, 0, 20], [5, 0, 24], [7, 0, 20],
  ] as Array<[number, number, number]>;

  return (
    <group>
      {/* Trees - mix of olive and pine */}
      {trees.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const isOlive = i % 3 === 0; // Every 3rd tree is olive
        const treeHeight = isOlive ? (3 + Math.sin(i * 1.1) * 0.8) : (5 + Math.sin(i * 1.3) * 1.2);
        const trunkHeight = treeHeight * 0.4;
        const foliageHeight = treeHeight * (isOlive ? 0.5 : 0.6);

        return (
          <group key={`tree-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.15, 0.22, trunkHeight, 6]} />
              <meshStandardMaterial color={isOlive ? "#5a4a3a" : "#4a3a2a"} roughness={0.95} />
            </mesh>
            {/* Foliage */}
            {isOlive ? (
              // Olive tree - round canopy
              <>
                <mesh position={[0, trunkHeight + foliageHeight * 0.5, 0]} castShadow receiveShadow>
                  <sphereGeometry args={[foliageHeight * 0.7, 8, 8]} />
                  <meshStandardMaterial color="#5a6a4a" roughness={0.85} />
                </mesh>
                <mesh position={[0.3, trunkHeight + foliageHeight * 0.3, 0.2]} castShadow receiveShadow>
                  <sphereGeometry args={[foliageHeight * 0.5, 8, 8]} />
                  <meshStandardMaterial color="#4a5a3a" roughness={0.85} />
                </mesh>
              </>
            ) : (
              // Pine tree - conical
              <>
                <mesh position={[0, trunkHeight + foliageHeight / 2, 0]} castShadow receiveShadow>
                  <coneGeometry args={[1.4, foliageHeight, 8]} />
                  <meshStandardMaterial color="#3a5a3a" roughness={0.85} />
                </mesh>
                <mesh position={[0, trunkHeight + foliageHeight * 0.25, 0]} castShadow receiveShadow>
                  <coneGeometry args={[1.8, foliageHeight * 0.6, 8]} />
                  <meshStandardMaterial color="#2f4f2f" roughness={0.85} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Grass patches */}
      {grassPatches.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const grassSize = 1.2 + Math.cos(i * 1.6) * 0.4;

        return (
          <group key={`grass-${i}`} position={[pos[0], h + 0.1, pos[2]]}>
            {/* Multiple grass blades per patch */}
            {[0, 1, 2, 3, 4].map((blade) => {
              const angle = (blade / 5) * Math.PI * 2;
              const bladeSeed = terrainSeed + i * 100 + blade * 17;
              const rand1 = seededRandom(bladeSeed);
              const rand2 = seededRandom(bladeSeed + 1);
              const rand3 = seededRandom(bladeSeed + 2);
              const radius = grassSize * (0.3 + rand1 * 0.4);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const height = 0.3 + rand2 * 0.2;

              return (
                <mesh
                  key={`blade-${blade}`}
                  position={[x, height / 2, z]}
                  rotation={[rand3 * 0.3, angle, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[0.1, height]} />
                  <meshStandardMaterial
                    color={blade % 2 === 0 ? "#4a6a3a" : "#5a7a4a"}
                    roughness={0.9}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Bushes */}
      {bushes.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const bushSize = 0.5 + Math.cos(i * 1.8) * 0.15;

        return (
          <mesh
            key={`bush-${i}`}
            position={[pos[0], h + bushSize * 0.4, pos[2]]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[bushSize, 8, 8]} />
            <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Dirt paths between buildings */}
      {pathSegments.map((segment, i) => {
        const midHeight = heightmap
          ? sampleTerrainHeight(heightmap, segment.midpoint[0], segment.midpoint[2])
          : getTerrainHeight(district, segment.midpoint[0], segment.midpoint[2], terrainSeed);
        const pathWidth = 1.2; // Width of the path in world units

        return (
          <mesh
            key={`path-${i}`}
            position={[segment.midpoint[0], midHeight + 0.02, segment.midpoint[2]]}
            rotation={[-Math.PI / 2, 0, segment.angle]}
            receiveShadow
          >
            <planeGeometry args={[segment.length, pathWidth]} />
            <meshStandardMaterial
              color="#8b7355" // Dirt brown color
              roughness={0.95}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
};
