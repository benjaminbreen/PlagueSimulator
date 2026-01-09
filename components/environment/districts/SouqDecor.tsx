/**
 * SouqDecor - 14th Century Damascus Covered Market
 *
 * Authentic Mamluk-era souq with:
 * - Stone arcades lining both sides of the corridor
 * - Fabric awnings spanning the street for shade
 * - Hanging oil lamps for evening atmosphere
 * - Small shop niches built into the arcade walls
 * - Mashrabiya (wooden lattice) screens
 * - Central clear walking corridor
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

interface SouqDecorProps {
  mapX: number;
  mapY: number;
  timeOfDay?: number;
}

// Mamluk-era color palette
const STONE_COLORS = {
  arcade: '#d8c8a8',      // Warm limestone
  arcadeDark: '#c8b898',  // Darker limestone for depth
  column: '#e0d0b0',      // Light column stone
  floor: '#c0b090',       // Worn stone floor
};

const AWNING_COLORS = [
  '#c85a4a', // Warm terracotta red
  '#4a6b8a', // Deep indigo blue
  '#d8a848', // Golden ochre
  '#8a5a4a', // Dark rust
  '#5a7a5a', // Forest green
  '#a86838', // Burnt sienna
  '#6a5a8a', // Muted purple
];

const WOOD_COLORS = {
  dark: '#4a3a2a',
  medium: '#6a5040',
  light: '#8a7060',
  mashrabiya: '#5a4a3a',
};

// Arcade column component
const ArcadeColumn: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => {
  const columnRadius = 0.25;
  const baseHeight = 0.3;
  const capitalHeight = 0.25;

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, baseHeight / 2, 0]}>
        <boxGeometry args={[0.6, baseHeight, 0.6]} />
        <meshStandardMaterial color={STONE_COLORS.column} roughness={0.85} />
      </mesh>
      {/* Column shaft */}
      <mesh position={[0, baseHeight + (height - baseHeight - capitalHeight) / 2, 0]}>
        <cylinderGeometry args={[columnRadius, columnRadius * 1.1, height - baseHeight - capitalHeight, 8]} />
        <meshStandardMaterial color={STONE_COLORS.column} roughness={0.8} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, height - capitalHeight / 2, 0]}>
        <boxGeometry args={[0.5, capitalHeight, 0.5]} />
        <meshStandardMaterial color={STONE_COLORS.column} roughness={0.85} />
      </mesh>
    </group>
  );
};

// Pointed arch (Mamluk style) between columns
const PointedArch: React.FC<{
  position: [number, number, number];
  rotation: number;
  width: number;
  height: number;
}> = ({ position, rotation, width, height }) => {
  const archThickness = 0.2;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Horizontal beam at top */}
      <mesh position={[0, height - 0.15, 0]}>
        <boxGeometry args={[width, 0.3, archThickness]} />
        <meshStandardMaterial color={STONE_COLORS.arcadeDark} roughness={0.85} />
      </mesh>
      {/* Decorative band below */}
      <mesh position={[0, height - 0.35, 0]}>
        <boxGeometry args={[width, 0.1, archThickness + 0.02]} />
        <meshStandardMaterial color={STONE_COLORS.arcade} roughness={0.8} />
      </mesh>
    </group>
  );
};

// Fabric awning spanning the street
const StreetAwning: React.FC<{
  position: [number, number, number];
  width: number;
  depth: number;
  color: string;
  seed: number;
}> = ({ position, width, depth, color, seed }) => {
  const sagAmount = 0.3 + seededRandom(seed) * 0.2;
  const tilt = (seededRandom(seed + 1) - 0.5) * 0.1;

  return (
    <group position={position}>
      {/* Main fabric - slightly sagging */}
      <mesh rotation={[tilt, 0, 0]} position={[0, -sagAmount / 2, 0]}>
        <boxGeometry args={[width, 0.05, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Support ropes at edges */}
      <mesh position={[-width / 2 + 0.05, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshStandardMaterial color={WOOD_COLORS.light} roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 - 0.05, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshStandardMaterial color={WOOD_COLORS.light} roughness={0.9} />
      </mesh>
    </group>
  );
};

// Hanging oil lamp
const HangingLamp: React.FC<{
  position: [number, number, number];
  lit: boolean;
}> = ({ position, lit }) => {
  return (
    <group position={position}>
      {/* Chain */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 4]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Lamp body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial
          color="#b87333"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Lamp base ring */}
      <mesh position={[0, -0.08, 0]}>
        <torusGeometry args={[0.08, 0.02, 6, 12]} />
        <meshStandardMaterial color="#a06020" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Light glow (if lit) */}
      {lit && (
        <pointLight
          position={[0, -0.1, 0]}
          color="#ff9944"
          intensity={0.8}
          distance={6}
          decay={2}
        />
      )}
    </group>
  );
};

// Small shop niche built into arcade wall
const ShopNiche: React.FC<{
  position: [number, number, number];
  rotation: number;
  seed: number;
}> = ({ position, rotation, seed }) => {
  const nicheWidth = 2.5 + seededRandom(seed) * 1;
  const nicheHeight = 2.8;
  const nicheDepth = 1.5;
  const hasAwning = seededRandom(seed + 10) > 0.3;
  const awningColor = AWNING_COLORS[Math.floor(seededRandom(seed + 11) * AWNING_COLORS.length)];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Back wall */}
      <mesh position={[0, nicheHeight / 2, -nicheDepth / 2]}>
        <boxGeometry args={[nicheWidth, nicheHeight, 0.2]} />
        <meshStandardMaterial color={STONE_COLORS.arcadeDark} roughness={0.9} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-nicheWidth / 2, nicheHeight / 2, 0]}>
        <boxGeometry args={[0.2, nicheHeight, nicheDepth]} />
        <meshStandardMaterial color={STONE_COLORS.arcade} roughness={0.85} />
      </mesh>
      <mesh position={[nicheWidth / 2, nicheHeight / 2, 0]}>
        <boxGeometry args={[0.2, nicheHeight, nicheDepth]} />
        <meshStandardMaterial color={STONE_COLORS.arcade} roughness={0.85} />
      </mesh>
      {/* Counter/display surface */}
      <mesh position={[0, 0.9, 0.2]}>
        <boxGeometry args={[nicheWidth - 0.3, 0.1, nicheDepth * 0.6]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} />
      </mesh>
      {/* Goods on counter - simple colored boxes */}
      {[...Array(3)].map((_, i) => (
        <mesh key={i} position={[-0.6 + i * 0.6, 1.05, 0.2]}>
          <boxGeometry args={[0.3 + seededRandom(seed + i * 100) * 0.2, 0.2, 0.25]} />
          <meshStandardMaterial
            color={['#c85a4a', '#4a6b8a', '#d8a848', '#5a7a5a'][i % 4]}
            roughness={0.7}
          />
        </mesh>
      ))}
      {/* Optional awning */}
      {hasAwning && (
        <mesh position={[0, nicheHeight - 0.2, nicheDepth * 0.3]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[nicheWidth + 0.2, 0.05, 1.2]} />
          <meshStandardMaterial color={awningColor} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// Mashrabiya (wooden lattice screen) projecting from wall
const Mashrabiya: React.FC<{
  position: [number, number, number];
  rotation: number;
}> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Frame */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[1.2, 1.5, 0.05]} />
        <meshStandardMaterial color={WOOD_COLORS.mashrabiya} roughness={0.8} />
      </mesh>
      {/* Lattice pattern (simplified) */}
      <mesh position={[0, 0, 0.42]}>
        <boxGeometry args={[1.0, 1.3, 0.02]} />
        <meshStandardMaterial
          color={WOOD_COLORS.dark}
          roughness={0.85}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Bottom support bracket */}
      <mesh position={[0, -0.85, 0.2]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.05]} />
        <meshStandardMaterial color={WOOD_COLORS.medium} roughness={0.8} />
      </mesh>
    </group>
  );
};

export const SouqDecor: React.FC<SouqDecorProps> = ({ mapX, mapY, timeOfDay = 12 }) => {
  const district = getDistrictType(mapX, mapY);

  // Only render for SOUQ_AXIS district
  if (district !== 'SOUQ_AXIS') return null;

  const seed = mapX * 1000 + mapY * 31 + 7777;
  const isEvening = timeOfDay < 6 || timeOfDay > 18;

  // Generate arcade columns along both sides - SPREAD OUT over larger area
  const arcadeElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const corridorWidth = 12; // Wider central walking area
    const arcadeSpacing = 7; // More space between columns
    const arcadeHeight = 4.5;
    const numColumns = 6; // Fewer columns, spread over longer distance

    // Left side arcade (west)
    for (let i = -numColumns / 2; i <= numColumns / 2; i++) {
      const z = i * arcadeSpacing;
      const localSeed = seed + i * 100;

      // Column
      elements.push(
        <ArcadeColumn
          key={`col-left-${i}`}
          position={[-corridorWidth / 2 - 1, 0, z]}
          height={arcadeHeight}
        />
      );

      // Arch between columns (except last)
      if (i < numColumns / 2) {
        elements.push(
          <PointedArch
            key={`arch-left-${i}`}
            position={[-corridorWidth / 2 - 1, 0, z + arcadeSpacing / 2]}
            rotation={0}
            width={arcadeSpacing - 0.5}
            height={arcadeHeight}
          />
        );
      }

      // Shop niche behind arcade (every other column) - reduced
      if (i % 3 === 0 && Math.abs(i) < numColumns / 2) {
        elements.push(
          <ShopNiche
            key={`shop-left-${i}`}
            position={[-corridorWidth / 2 - 4, 0, z]}
            rotation={Math.PI / 2}
            seed={localSeed + 500}
          />
        );
      }

      // Occasional mashrabiya on upper level - reduced frequency
      if (seededRandom(localSeed + 200) > 0.85) {
        elements.push(
          <Mashrabiya
            key={`mash-left-${i}`}
            position={[-corridorWidth / 2 - 0.5, arcadeHeight + 1.5, z]}
            rotation={Math.PI / 2}
          />
        );
      }
    }

    // Right side arcade (east)
    for (let i = -numColumns / 2; i <= numColumns / 2; i++) {
      const z = i * arcadeSpacing;
      const localSeed = seed + i * 100 + 1000;

      // Column
      elements.push(
        <ArcadeColumn
          key={`col-right-${i}`}
          position={[corridorWidth / 2 + 1, 0, z]}
          height={arcadeHeight}
        />
      );

      // Arch between columns (except last)
      if (i < numColumns / 2) {
        elements.push(
          <PointedArch
            key={`arch-right-${i}`}
            position={[corridorWidth / 2 + 1, 0, z + arcadeSpacing / 2]}
            rotation={0}
            width={arcadeSpacing - 0.5}
            height={arcadeHeight}
          />
        );
      }

      // Shop niche behind arcade (offset from left side) - reduced
      if ((i + 1) % 3 === 0 && Math.abs(i) < numColumns / 2) {
        elements.push(
          <ShopNiche
            key={`shop-right-${i}`}
            position={[corridorWidth / 2 + 4, 0, z]}
            rotation={-Math.PI / 2}
            seed={localSeed + 500}
          />
        );
      }

      // Occasional mashrabiya - reduced
      if (seededRandom(localSeed + 200) > 0.85) {
        elements.push(
          <Mashrabiya
            key={`mash-right-${i}`}
            position={[corridorWidth / 2 + 0.5, arcadeHeight + 1.5, z]}
            rotation={-Math.PI / 2}
          />
        );
      }
    }

    return elements;
  }, [seed]);

  // Generate street awnings - spread out more
  const awningElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const awningSpacing = 12; // Much wider spacing
    const awningHeight = 4.2;
    const corridorWidth = 12;

    for (let i = -2; i <= 2; i++) {
      const z = i * awningSpacing;
      const localSeed = seed + i * 50 + 2000;

      // Skip some for variety
      if (seededRandom(localSeed) < 0.25) continue;

      const awningColor = AWNING_COLORS[Math.floor(seededRandom(localSeed + 1) * AWNING_COLORS.length)];

      elements.push(
        <StreetAwning
          key={`awning-${i}`}
          position={[0, awningHeight, z]}
          width={corridorWidth + 2}
          depth={5}
          color={awningColor}
          seed={localSeed}
        />
      );
    }

    return elements;
  }, [seed]);

  // Generate hanging lamps - fewer, more spread out
  const lampElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const lampSpacing = 10; // Much wider spacing
    const lampHeight = 3.5;

    for (let i = -2; i <= 2; i++) {
      const z = i * lampSpacing;
      const localSeed = seed + i * 30 + 3000;

      // Alternate left and right
      const xOffset = i % 2 === 0 ? -4 : 4;

      elements.push(
        <HangingLamp
          key={`lamp-${i}`}
          position={[xOffset, lampHeight, z]}
          lit={isEvening}
        />
      );
    }

    return elements;
  }, [seed, isEvening]);

  // Decorative floor pattern (central worn stone path) - wider
  const floorElements = useMemo(() => {
    const elements: JSX.Element[] = [];

    // Central worn stone strip - wider
    elements.push(
      <mesh key="floor-center" position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 60]} />
        <meshStandardMaterial
          color="#b0a080"
          roughness={0.95}
          transparent
          opacity={0.5}
        />
      </mesh>
    );

    // Worn grooves from cart wheels - wider apart
    elements.push(
      <mesh key="floor-groove-left" position={[-2, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 55]} />
        <meshStandardMaterial color="#8a7a60" roughness={1} transparent opacity={0.4} />
      </mesh>
    );
    elements.push(
      <mesh key="floor-groove-right" position={[2, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 55]} />
        <meshStandardMaterial color="#8a7a60" roughness={1} transparent opacity={0.4} />
      </mesh>
    );

    return elements;
  }, []);

  return (
    <group>
      {arcadeElements}
      {awningElements}
      {lampElements}
      {floorElements}
    </group>
  );
};

export default SouqDecor;
