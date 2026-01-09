/**
 * Qassioun Caves (Magharat Qassioun) - Sacred Cave System
 *
 * Historical Context:
 * - Magharat al-Dam (Cave of Blood) - where Cain supposedly killed Abel
 * - Magharat al-Arba'in (Cave of the Forty) - where 40 prophets took shelter
 * - Important pilgrimage site in medieval Damascus
 *
 * Visual Design:
 * - Open canyon/gorge with rocky walls rising from ground level
 * - Organic irregular rock formations (not boxy)
 * - Overhanging cliffs at edges suggesting cave entrance
 * - Glittering crystals with point lights
 * - Sacred shrine in central area
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

interface QassiounCavesDecorProps {
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
}

// Color palette for cave
const CAVE_COLORS = {
  rockDark: '#3a3530',
  rockMid: '#4a4540',
  rockLight: '#5a5550',
  rockWarm: '#4a4038',
  crystal: '#7ab8c4',
  crystalGlow: '#a0e8f4',
  crystalAmber: '#d4a574',
  crystalPurple: '#9a7abc',
  water: '#2a4a5a',
  shrine: '#c8b898',
};

// Organic rock boulder - uses dodecahedron for irregular shape
const RockBoulder: React.FC<{
  position: [number, number, number];
  scale: [number, number, number];
  seed: number;
}> = ({ position, scale, seed }) => {
  const color = seededRandom(seed) > 0.5 ? CAVE_COLORS.rockDark
    : seededRandom(seed + 1) > 0.5 ? CAVE_COLORS.rockMid : CAVE_COLORS.rockWarm;
  const rotation: [number, number, number] = [
    seededRandom(seed + 10) * 0.3,
    seededRandom(seed + 11) * Math.PI * 2,
    seededRandom(seed + 12) * 0.3,
  ];

  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
};

// Tall cliff/rock column formation
const CliffFormation: React.FC<{
  position: [number, number, number];
  height: number;
  baseRadius: number;
  seed: number;
}> = ({ position, height, baseRadius, seed }) => {
  // Stack multiple irregular shapes to create organic cliff
  const segments = useMemo(() => {
    const result: Array<{
      y: number;
      radius: number;
      rotation: number;
    }> = [];
    const numSegments = 3 + Math.floor(seededRandom(seed) * 3);

    for (let i = 0; i < numSegments; i++) {
      const t = i / (numSegments - 1);
      result.push({
        y: t * height,
        radius: baseRadius * (1 - t * 0.3) * (0.8 + seededRandom(seed + i * 10) * 0.4),
        rotation: seededRandom(seed + i * 20) * Math.PI * 2,
      });
    }
    return result;
  }, [height, baseRadius, seed]);

  const color = seededRandom(seed + 100) > 0.5 ? CAVE_COLORS.rockDark : CAVE_COLORS.rockMid;

  return (
    <group position={position}>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={[0, seg.y, 0]}
          rotation={[0, seg.rotation, 0]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[seg.radius, 1]} />
          <meshStandardMaterial color={color} roughness={0.92} flatShading />
        </mesh>
      ))}
    </group>
  );
};

// Overhanging rock ledge
const OverhangingLedge: React.FC<{
  position: [number, number, number];
  rotation: number;
  length: number;
  seed: number;
}> = ({ position, rotation, length, seed }) => {
  const color = seededRandom(seed) > 0.6 ? CAVE_COLORS.rockDark : CAVE_COLORS.rockWarm;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main ledge body */}
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[length, 1.5, 3 + seededRandom(seed + 1) * 2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Underside stalactites */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={i}
          position={[2 + i * (length / 4), -0.8, (seededRandom(seed + i + 20) - 0.5) * 2]}
          rotation={[0.1, 0, 0]}
        >
          <coneGeometry args={[0.15, 0.6 + seededRandom(seed + i + 30) * 0.4, 5]} />
          <meshStandardMaterial color={CAVE_COLORS.rockLight} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// Crystal cluster component with glow
const CrystalCluster: React.FC<{
  position: [number, number, number];
  color: string;
  glowColor: string;
  scale?: number;
  seed: number;
}> = ({ position, color, glowColor, scale = 1, seed }) => {
  const crystals = useMemo(() => {
    const result: Array<{ pos: [number, number, number]; rot: [number, number, number]; h: number; r: number }> = [];
    const count = 3 + Math.floor(seededRandom(seed) * 4);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seededRandom(seed + i) * 0.5;
      const dist = seededRandom(seed + i + 10) * 0.4;
      const height = 0.4 + seededRandom(seed + i + 20) * 0.8;
      const radius = 0.08 + seededRandom(seed + i + 30) * 0.12;
      const tilt = (seededRandom(seed + i + 40) - 0.5) * 0.6;

      result.push({
        pos: [Math.cos(angle) * dist, height / 2, Math.sin(angle) * dist],
        rot: [tilt, seededRandom(seed + i + 50) * Math.PI, 0],
        h: height,
        r: radius,
      });
    }
    return result;
  }, [seed]);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {crystals.map((crystal, i) => (
        <mesh key={i} position={crystal.pos} rotation={crystal.rot}>
          <coneGeometry args={[crystal.r, crystal.h, 5]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      {/* Glow light */}
      <pointLight
        position={[0, 0.5, 0]}
        color={glowColor}
        intensity={0.5}
        distance={10}
        decay={2}
      />
    </group>
  );
};

// Stalactite hanging from ceiling/overhang
const Stalactite: React.FC<{
  position: [number, number, number];
  length: number;
  seed: number;
}> = ({ position, length, seed }) => {
  const baseRadius = 0.12 + seededRandom(seed) * 0.08;

  return (
    <mesh position={position} rotation={[Math.PI, 0, seededRandom(seed + 5) * 0.2]}>
      <coneGeometry args={[baseRadius, length, 6]} />
      <meshStandardMaterial color={CAVE_COLORS.rockMid} roughness={0.88} />
    </mesh>
  );
};

// Stalagmite rising from floor
const Stalagmite: React.FC<{
  position: [number, number, number];
  height: number;
  seed: number;
}> = ({ position, height, seed }) => {
  const baseRadius = 0.15 + seededRandom(seed) * 0.12;

  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <coneGeometry args={[baseRadius, height, 6]} />
      <meshStandardMaterial color={CAVE_COLORS.rockLight} roughness={0.85} />
    </mesh>
  );
};

// Sacred shrine component
const SacredShrine: React.FC<{
  position: [number, number, number];
}> = ({ position }) => {
  return (
    <group position={position}>
      {/* Stone platform */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2.5, 3, 0.4, 8]} />
        <meshStandardMaterial color={CAVE_COLORS.shrine} roughness={0.8} />
      </mesh>
      {/* Inner platform */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[1.8, 2, 0.2, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.75} />
      </mesh>
      {/* Central stone marker */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.8, 1.5, 0.8]} />
        <meshStandardMaterial color="#e8d8c8" roughness={0.7} />
      </mesh>
      {/* Decorative top */}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial color="#d4c4a4" roughness={0.6} />
      </mesh>
      {/* Shrine light */}
      <pointLight
        position={[0, 2.8, 0]}
        color="#ffe8c0"
        intensity={0.8}
        distance={18}
        decay={2}
      />
      {/* Surrounding candles/offerings - just 2 for performance */}
      {[0, 1].map((i) => {
        const angle = (i / 2) * Math.PI;
        const x = Math.cos(angle) * 1.8;
        const z = Math.sin(angle) * 1.8;
        return (
          <group key={i} position={[x, 0.5, z]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.3, 6]} />
              <meshStandardMaterial color="#d4c4a4" roughness={0.8} />
            </mesh>
            <pointLight
              position={[0, 0.3, 0]}
              color="#ff9944"
              intensity={0.25}
              distance={4}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
};

// Cave pool with subtle reflection
const CavePool: React.FC<{
  position: [number, number, number];
  radius: number;
}> = ({ position, radius }) => {
  return (
    <group position={position}>
      {/* Pool basin - slight depression */}
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius + 0.4, 16]} />
        <meshStandardMaterial color={CAVE_COLORS.rockDark} roughness={0.95} />
      </mesh>
      {/* Water surface */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 16]} />
        <meshStandardMaterial
          color={CAVE_COLORS.water}
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

export const QassiounCavesDecor: React.FC<QassiounCavesDecorProps> = ({
  mapX,
  mapY,
  timeOfDay = 12,
  terrainSeed,
}) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'QASSIOUN_CAVES') return null;

  const seed = mapX * 1000 + mapY * 31 + terrainSeed;
  const isNight = timeOfDay < 6 || timeOfDay > 19;

  // Generate perimeter cliff walls - organic rock formations around edges
  const cliffWalls = useMemo(() => {
    const elements: JSX.Element[] = [];
    const perimeterRadius = 38;
    const numFormations = 10; // Reduced from 16

    for (let i = 0; i < numFormations; i++) {
      const angle = (i / numFormations) * Math.PI * 2;
      const localSeed = seed + i * 100;

      // Vary distance from center
      const dist = perimeterRadius + (seededRandom(localSeed) - 0.5) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Main cliff formation
      const height = 6 + seededRandom(localSeed + 1) * 6;
      const baseRadius = 2.5 + seededRandom(localSeed + 2) * 2;

      elements.push(
        <CliffFormation
          key={`cliff-${i}`}
          position={[x, 0, z]}
          height={height}
          baseRadius={baseRadius}
          seed={localSeed}
        />
      );

      // Add one boulder per cliff (reduced from 2)
      const boulderAngle = angle + (seededRandom(localSeed + 30) - 0.5) * 0.5;
      const boulderDist = dist - 3 - seededRandom(localSeed + 31) * 4;
      const bx = Math.cos(boulderAngle) * boulderDist;
      const bz = Math.sin(boulderAngle) * boulderDist;

      elements.push(
        <RockBoulder
          key={`boulder-${i}`}
          position={[bx, 0.5 + seededRandom(localSeed + 32) * 0.5, bz]}
          scale={[
            1.5 + seededRandom(localSeed + 33) * 1.5,
            1 + seededRandom(localSeed + 34) * 1,
            1.5 + seededRandom(localSeed + 35) * 1.5,
          ]}
          seed={localSeed + 40}
        />
      );

      // Add overhanging ledges on fewer formations (raised threshold)
      if (seededRandom(localSeed + 50) > 0.75) {
        const ledgeHeight = height * 0.6 + seededRandom(localSeed + 51) * 2;
        const inwardAngle = angle + Math.PI;

        elements.push(
          <OverhangingLedge
            key={`overhang-${i}`}
            position={[x, ledgeHeight, z]}
            rotation={inwardAngle}
            length={4 + seededRandom(localSeed + 52) * 3}
            seed={localSeed + 53}
          />
        );
      }
    }

    return elements;
  }, [seed]);

  // Scattered rocks and boulders inside the cave area
  const interiorRocks = useMemo(() => {
    const elements: JSX.Element[] = [];
    const numRocks = 12; // Reduced from 25

    for (let i = 0; i < numRocks; i++) {
      const localSeed = seed + i * 200;
      const angle = seededRandom(localSeed) * Math.PI * 2;
      const dist = 8 + seededRandom(localSeed + 1) * 22;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Skip if too close to shrine center
      if (Math.sqrt(x * x + z * z) < 5) continue;

      const scale: [number, number, number] = [
        0.8 + seededRandom(localSeed + 2) * 1.2,
        0.5 + seededRandom(localSeed + 3) * 0.8,
        0.8 + seededRandom(localSeed + 4) * 1.2,
      ];

      elements.push(
        <RockBoulder
          key={`interior-rock-${i}`}
          position={[x, scale[1] * 0.4, z]}
          scale={scale}
          seed={localSeed + 5}
        />
      );
    }

    return elements;
  }, [seed]);

  // Crystal clusters positioned around the cave (reduced for performance)
  const crystalClusters = useMemo(() => {
    const clusters: JSX.Element[] = [];
    const crystalPositions = [
      // Strategic placement - 5 clusters instead of 10
      { pos: [-26, 2, -16] as [number, number, number], color: CAVE_COLORS.crystal, glow: CAVE_COLORS.crystalGlow, scale: 1.5 },
      { pos: [24, 1.5, -20] as [number, number, number], color: CAVE_COLORS.crystalAmber, glow: '#ffe0a0', scale: 1.4 },
      { pos: [-20, 2, 22] as [number, number, number], color: CAVE_COLORS.crystalPurple, glow: '#c0a0e0', scale: 1.3 },
      { pos: [22, 0.2, 16] as [number, number, number], color: CAVE_COLORS.crystal, glow: CAVE_COLORS.crystalGlow, scale: 1.2 },
      { pos: [-10, 0.1, -10] as [number, number, number], color: CAVE_COLORS.crystalAmber, glow: '#ffe0a0', scale: 1.0 },
    ];

    crystalPositions.forEach((crystal, i) => {
      clusters.push(
        <CrystalCluster
          key={`crystal-${i}`}
          position={crystal.pos}
          color={crystal.color}
          glowColor={crystal.glow}
          scale={crystal.scale}
          seed={seed + i * 300}
        />
      );
    });

    return clusters;
  }, [seed]);

  // Stalagmites on cave floor (reduced for performance)
  const stalagmites = useMemo(() => {
    const formations: JSX.Element[] = [];
    const count = 15; // Reduced from 30

    for (let i = 0; i < count; i++) {
      const localSeed = seed + i * 400;
      const angle = seededRandom(localSeed) * Math.PI * 2;
      const dist = 6 + seededRandom(localSeed + 1) * 26;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Don't place in shrine area
      if (Math.sqrt(x * x + z * z) < 5) continue;

      formations.push(
        <Stalagmite
          key={`stalagmite-${i}`}
          position={[x, 0, z]}
          height={0.6 + seededRandom(localSeed + 2) * 1.2}
          seed={localSeed + 3}
        />
      );
    }

    return formations;
  }, [seed]);

  // Stalactites hanging from overhangs (reduced for performance)
  const stalactites = useMemo(() => {
    const formations: JSX.Element[] = [];
    const count = 10; // Reduced from 20

    for (let i = 0; i < count; i++) {
      const localSeed = seed + i * 500;
      const angle = seededRandom(localSeed) * Math.PI * 2;
      // Place along inner edge of cliffs
      const dist = 30 + seededRandom(localSeed + 1) * 6;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const height = 5 + seededRandom(localSeed + 2) * 4;

      formations.push(
        <Stalactite
          key={`stalactite-${i}`}
          position={[x, height, z]}
          length={0.8 + seededRandom(localSeed + 3) * 1.5}
          seed={localSeed + 4}
        />
      );
    }

    return formations;
  }, [seed]);

  // Ambient cave lighting (optimized - only 2 bright torches)
  const ambientLighting = useMemo(() => {
    const lights: JSX.Element[] = [];

    // Dim overall cave lighting - darker than outside
    lights.push(
      <ambientLight key="cave-ambient" intensity={isNight ? 0.08 : 0.2} color="#8090a0" />
    );

    // Just 2 torches with much stronger light to illuminate the cave
    const torchPositions: [number, number, number][] = [
      [-15, 0, 0],  // West side
      [15, 0, 0],   // East side
    ];

    torchPositions.forEach((pos, i) => {
      lights.push(
        <group key={`torch-${i}`} position={pos}>
          <pointLight
            color="#ff9955"
            intensity={1.8}    // Much brighter (was 0.4)
            distance={35}      // Much larger range (was 12)
            decay={1.5}        // Slower falloff
            position={[0, 1.5, 0]}
          />
          {/* Torch holder */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
          {/* Larger flame */}
          <mesh position={[0, 1.4, 0]}>
            <coneGeometry args={[0.15, 0.35, 6]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff4400"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      );
    });

    return lights;
  }, [isNight]);

  return (
    <group>
      {/* Perimeter cliff walls */}
      {cliffWalls}

      {/* Interior scattered rocks */}
      {interiorRocks}

      {/* Crystal clusters with glow */}
      {crystalClusters}

      {/* Stalagmites */}
      {stalagmites}

      {/* Stalactites */}
      {stalactites}

      {/* Sacred shrine in center */}
      <SacredShrine position={[0, 0, 0]} />

      {/* Cave pools - just 2 for performance */}
      <CavePool position={[12, 0, -12]} radius={2.5} />
      <CavePool position={[-14, 0, 14]} radius={2} />

      {/* Atmospheric lighting */}
      {ambientLighting}
    </group>
  );
};

export default QassiounCavesDecor;
