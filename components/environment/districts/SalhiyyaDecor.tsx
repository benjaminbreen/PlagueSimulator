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

  // Olive and pine trees scattered on hillsides - expanded to fill ±50 range
  const trees = [
    // Inner hillside trees (original coverage)
    [-30, 0, -22], [-25, 0, -15], [-20, 0, -28], [-15, 0, -20], [-28, 0, -8],
    [28, 0, -18], [22, 0, -25], [18, 0, -12], [25, 0, -8], [32, 0, -15],
    [-28, 0, 20], [-22, 0, 28], [-18, 0, 15], [-25, 0, 10], [-32, 0, 25],
    [25, 0, 22], [20, 0, 30], [15, 0, 18], [28, 0, 12], [32, 0, 28],
    [-15, 0, -32], [-10, 0, -25], [12, 0, -30], [8, 0, -20],
    [-12, 0, 30], [-8, 0, 25], [10, 0, 32], [15, 0, 25],
    [0, 0, -35], [0, 0, 35], [-35, 0, 0], [35, 0, 0],
    // Outer perimeter trees - fill empty space
    [-45, 0, -32], [-42, 0, -18], [-38, 0, -28], [-48, 0, -12], [-40, 0, -38],
    [42, 0, -25], [45, 0, -35], [38, 0, -20], [48, 0, -28], [40, 0, -15],
    [-42, 0, 32], [-45, 0, 22], [-38, 0, 35], [-48, 0, 28], [-40, 0, 18],
    [42, 0, 28], [45, 0, 35], [38, 0, 22], [48, 0, 20], [40, 0, 32],
    [-48, 0, 0], [-42, 0, 8], [48, 0, 0], [42, 0, -8],
    [0, 0, -48], [0, 0, 48], [-35, 0, -42], [35, 0, 42],
  ] as Array<[number, number, number]>;

  // Report tree positions to parent for collision detection
  React.useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(trees);
    }
  }, [onTreePositionsGenerated]);

  // Grass patches - expanded coverage
  const grassPatches = [
    // Inner patches
    [-20, 0, -15], [-12, 0, -22], [-8, 0, -12], [-25, 0, -5],
    [18, 0, -14], [12, 0, -20], [22, 0, -10], [28, 0, -6],
    [-22, 0, 18], [-15, 0, 25], [-10, 0, 15], [-28, 0, 12],
    [20, 0, 20], [15, 0, 28], [10, 0, 16], [25, 0, 10],
    [-5, 0, -28], [-2, 0, -18], [5, 0, -25], [8, 0, -15],
    [-6, 0, 25], [-3, 0, 18], [4, 0, 28], [6, 0, 20],
    // Outer perimeter patches
    [-38, 0, -22], [-42, 0, -12], [-35, 0, -32], [-45, 0, -8],
    [35, 0, -22], [42, 0, -15], [38, 0, -32], [45, 0, -25],
    [-35, 0, 25], [-42, 0, 32], [-38, 0, 15], [-45, 0, 22],
    [38, 0, 28], [42, 0, 20], [35, 0, 35], [45, 0, 18],
  ] as Array<[number, number, number]>;

  // Bushes for undergrowth - expanded coverage
  const bushes = [
    // Inner bushes
    [-18, 0, -12], [-14, 0, -18], [-10, 0, -20], [-22, 0, -8],
    [16, 0, -14], [12, 0, -16], [18, 0, -10], [22, 0, -12],
    [-18, 0, 14], [-12, 0, 20], [-15, 0, 16], [-22, 0, 18],
    [14, 0, 16], [18, 0, 20], [12, 0, 12], [20, 0, 18],
    [-8, 0, -24], [-5, 0, -20], [6, 0, -22], [8, 0, -18],
    [-6, 0, 22], [-4, 0, 20], [5, 0, 24], [7, 0, 20],
    // Outer perimeter bushes
    [-40, 0, -18], [-44, 0, -28], [-36, 0, -25], [-48, 0, -15],
    [40, 0, -20], [44, 0, -28], [36, 0, -18], [48, 0, -22],
    [-40, 0, 22], [-44, 0, 28], [-36, 0, 18], [-48, 0, 25],
    [40, 0, 25], [44, 0, 18], [36, 0, 32], [48, 0, 28],
  ] as Array<[number, number, number]>;

  // Retaining walls following contour lines - Damascus hillside architecture
  const retainingWalls = React.useMemo(() => {
    interface WallSegment {
      start: [number, number, number];
      end: [number, number, number];
      midpoint: [number, number, number];
      length: number;
      angle: number;
      height: number;
    }

    const walls: WallSegment[] = [];

    // Create wall segments at elevation transitions
    // Walls run perpendicular to the slope (following contour lines)
    // Reduced to just key terracing points
    const wallLines = [
      // Lower tier
      { x1: -25, z1: 20, x2: 25, z2: 20, elevation: 2.0 },
      // Mid tier
      { x1: -30, z1: 0, x2: 30, z2: 0, elevation: 3.0 },
      // Upper tier (northwest section only)
      { x1: -35, z1: -20, x2: 5, z2: -20, elevation: 4.0 },
    ];

    wallLines.forEach((line, idx) => {
      const segments = 2; // Break each wall into 2 segments for natural look
      for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        const x1 = line.x1 + (line.x2 - line.x1) * t1;
        const z1 = line.z1 + (line.z2 - line.z1) * t1;
        const x2 = line.x1 + (line.x2 - line.x1) * t2;
        const z2 = line.z1 + (line.z2 - line.z1) * t2;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        walls.push({
          start: [x1, 0, z1],
          end: [x2, 0, z2],
          midpoint: [(x1 + x2) / 2, 0, (z1 + z2) / 2],
          length,
          angle,
          height: 0.8 + Math.sin(idx * 0.7 + i) * 0.2, // Vary wall height naturally
        });
      }
    });

    return walls;
  }, []);

  // Stepped pathways climbing the hillside - main thoroughfares
  const steppedPaths = React.useMemo(() => {
    interface StepSegment {
      position: [number, number, number];
      width: number;
      depth: number;
      rotation: number;
    }

    const paths: StepSegment[] = [];

    // Main stepped path from lower southeast to upper northwest
    const mainPath = {
      startX: 20,
      startZ: 30,
      endX: -30,
      endZ: -30,
      steps: 25,
    };

    for (let i = 0; i < mainPath.steps; i++) {
      const t = i / mainPath.steps;
      const x = mainPath.startX + (mainPath.endX - mainPath.startX) * t;
      const z = mainPath.startZ + (mainPath.endZ - mainPath.startZ) * t;
      const elevation = t * 5; // Climb 5 units over the path

      // Direction angle
      const dx = mainPath.endX - mainPath.startX;
      const dz = mainPath.endZ - mainPath.startZ;
      const angle = Math.atan2(dz, dx);

      paths.push({
        position: [x, elevation, z],
        width: 2.0,
        depth: 2.5,
        rotation: angle,
      });
    }

    // Secondary path from east to west (crossing main path)
    const secondaryPath = {
      startX: 35,
      startZ: 0,
      endX: -35,
      endZ: -5,
      steps: 18,
    };

    for (let i = 0; i < secondaryPath.steps; i++) {
      const t = i / secondaryPath.steps;
      const x = secondaryPath.startX + (secondaryPath.endX - secondaryPath.startX) * t;
      const z = secondaryPath.startZ + (secondaryPath.endZ - secondaryPath.startZ) * t;
      const elevation = t * 3; // Gentler climb

      const dx = secondaryPath.endX - secondaryPath.startX;
      const dz = secondaryPath.endZ - secondaryPath.startZ;
      const angle = Math.atan2(dz, dx);

      paths.push({
        position: [x, elevation, z],
        width: 1.8,
        depth: 2.2,
        rotation: angle,
      });
    }

    return paths;
  }, []);

  return (
    <group>
      {/* Trees - mix of olive and pine */}
      {trees.map((pos, i) => {
        const h = heightmap
          ? sampleTerrainHeight(heightmap, pos[0], pos[2])
          : getTerrainHeight(district, pos[0], pos[2], terrainSeed);
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
        const h = heightmap
          ? sampleTerrainHeight(heightmap, pos[0], pos[2])
          : getTerrainHeight(district, pos[0], pos[2], terrainSeed);
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
        const h = heightmap
          ? sampleTerrainHeight(heightmap, pos[0], pos[2])
          : getTerrainHeight(district, pos[0], pos[2], terrainSeed);
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

      {/* Retaining walls - terraced hillside architecture */}
      {retainingWalls.map((wall, i) => {
        const midHeight = heightmap
          ? sampleTerrainHeight(heightmap, wall.midpoint[0], wall.midpoint[2])
          : getTerrainHeight(district, wall.midpoint[0], wall.midpoint[2], terrainSeed);

        return (
          <group key={`wall-${i}`}>
            {/* Main wall body */}
            <mesh
              position={[wall.midpoint[0], midHeight + wall.height / 2, wall.midpoint[2]]}
              rotation={[0, wall.angle, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wall.length, wall.height, 0.3]} />
              <meshStandardMaterial
                color="#c4a574" // Sandstone/limestone color
                roughness={0.95}
              />
            </mesh>
            {/* Wall cap - slightly darker for visual definition */}
            <mesh
              position={[wall.midpoint[0], midHeight + wall.height + 0.05, wall.midpoint[2]]}
              rotation={[0, wall.angle, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wall.length + 0.1, 0.12, 0.4]} />
              <meshStandardMaterial
                color="#b09060"
                roughness={0.9}
              />
            </mesh>
          </group>
        );
      })}

      {/* Stepped pathways - stairways climbing the hillside */}
      {steppedPaths.map((step, i) => {
        const baseHeight = heightmap
          ? sampleTerrainHeight(heightmap, step.position[0], step.position[2])
          : getTerrainHeight(district, step.position[0], step.position[2], terrainSeed);

        return (
          <group key={`step-${i}`}>
            {/* Step tread (walking surface) */}
            <mesh
              position={[step.position[0], baseHeight + 0.15, step.position[2]]}
              rotation={[-Math.PI / 2, 0, step.rotation]}
              receiveShadow
            >
              <planeGeometry args={[step.depth, step.width]} />
              <meshStandardMaterial
                color="#a89070" // Light sandstone for steps
                roughness={0.92}
              />
            </mesh>
            {/* Step riser (vertical face) */}
            <mesh
              position={[
                step.position[0] - Math.cos(step.rotation) * step.depth / 2,
                baseHeight + 0.075,
                step.position[2] - Math.sin(step.rotation) * step.depth / 2
              ]}
              rotation={[0, step.rotation, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[step.width, 0.15, 0.05]} />
              <meshStandardMaterial
                color="#8b7355" // Darker for riser
                roughness={0.95}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
