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
import { createLimestoneFlagstoneTexture } from '../geometry';

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

// Hanging textile/carpet display - attached to arcade beam
const HangingTextile: React.FC<{
  position: [number, number, number];
  rotation: number;
  color: string;
  width: number;
  height: number;
  beamHeight?: number;
}> = ({ position, rotation, color, width, height, beamHeight = 4.2 }) => {
  const ropeLength = beamHeight - position[1] - height / 2 - 0.1;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Horizontal support beam attached to arcade */}
      <mesh position={[0, beamHeight - position[1], -0.3]}>
        <boxGeometry args={[width + 0.4, 0.12, 0.15]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      {/* Bracket connecting beam to arcade wall */}
      <mesh position={[0, beamHeight - position[1] - 0.15, -0.45]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      {/* Ropes from beam to hanging rod */}
      <mesh position={[-width / 2 + 0.1, height / 2 + 0.1 + ropeLength / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, ropeLength, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 - 0.1, height / 2 + 0.1 + ropeLength / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, ropeLength, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      {/* Hanging rod */}
      <mesh position={[0, height / 2 + 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, width + 0.2, 6]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} />
      </mesh>
      {/* Textile - slight drape */}
      <mesh position={[0, 0, 0.05]} rotation={[0.08, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Decorative border stripe */}
      <mesh position={[0, -height / 2 + 0.15, 0.06]}>
        <planeGeometry args={[width, 0.2]} />
        <meshStandardMaterial color="#2a2520" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Spice merchant stall with table and mounds
const SpiceStall: React.FC<{
  position: [number, number, number];
  rotation: number;
  seed: number;
}> = ({ position, rotation, seed }) => {
  const spiceColors = [
    '#e4b420', // Turmeric
    '#8b4513', // Cinnamon
    '#c41e3a', // Sumac/red pepper
    '#2d5016', // Dried herbs
    '#d4a574', // Cumin
    '#8b0000', // Paprika
  ];

  const moundCount = 4 + Math.floor(seededRandom(seed) * 3);
  const mounds = [];

  for (let i = 0; i < moundCount; i++) {
    const x = (i - moundCount / 2 + 0.5) * 0.38;
    const z = (seededRandom(seed + i * 7) - 0.5) * 0.25;
    const color = spiceColors[Math.floor(seededRandom(seed + i * 11) * spiceColors.length)];
    const size = 0.7 + seededRandom(seed + i * 13) * 0.3;

    mounds.push(
      <mesh key={i} position={[x, 0.18, z]}>
        <coneGeometry args={[size * 0.15, size * 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    );
  }

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Table/counter */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.7]} />
        <meshStandardMaterial color={WOOD_COLORS.medium} roughness={0.85} />
      </mesh>
      {/* Table legs */}
      <mesh position={[-0.9, 0.22, 0.25]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      <mesh position={[0.9, 0.22, 0.25]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      <mesh position={[-0.9, 0.22, -0.25]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      <mesh position={[0.9, 0.22, -0.25]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      {/* Bowls/containers holding spices */}
      {mounds.map((_, i) => {
        const x = (i - moundCount / 2 + 0.5) * 0.38;
        return (
          <mesh key={`bowl-${i}`} position={[x, 0.52, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.08, 8]} />
            <meshStandardMaterial color="#8a7060" roughness={0.8} />
          </mesh>
        );
      })}
      {/* Spice mounds on top of bowls */}
      <group position={[0, 0.52, 0]}>
        {mounds}
      </group>
    </group>
  );
};

// Stacked sacks/goods
const StackedSacks: React.FC<{
  position: [number, number, number];
  count: number;
  seed: number;
}> = ({ position, count, seed }) => {
  const sacks = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const offsetX = (col - 0.5) * 0.55 + (seededRandom(seed + i * 7) - 0.5) * 0.1;
    const offsetY = row * 0.35;
    const offsetZ = (seededRandom(seed + i * 11) - 0.5) * 0.15;
    const sackColor = seededRandom(seed + i * 13) > 0.5 ? '#a08060' : '#8a7050';
    sacks.push(
      <mesh key={i} position={[offsetX, offsetY + 0.18, offsetZ]}>
        <sphereGeometry args={[0.22, 6, 5]} />
        <meshStandardMaterial color={sackColor} roughness={0.95} />
      </mesh>
    );
  }
  return <group position={position}>{sacks}</group>;
};

// Metalware display rack with hanging items
const MetalwareRack: React.FC<{
  position: [number, number, number];
  rotation: number;
  seed: number;
}> = ({ position, rotation, seed }) => {
  const types: Array<'pot' | 'lamp' | 'tray'> = ['pot', 'lamp', 'tray'];
  const count = 3 + Math.floor(seededRandom(seed) * 3);
  const items = [];

  for (let i = 0; i < count; i++) {
    const x = (i - count / 2 + 0.5) * 0.4;
    const type = types[Math.floor(seededRandom(seed + i * 11) * types.length)];
    const metalColor = type === 'lamp' ? '#b87333' : type === 'tray' ? '#c9a227' : '#a06020';
    const chainLength = 0.3 + seededRandom(seed + i * 13) * 0.25;

    items.push(
      <group key={i} position={[x, -chainLength / 2, 0]}>
        {/* Chain */}
        <mesh position={[0, chainLength / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, chainLength, 4]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Hook at top */}
        <mesh position={[0, chainLength, 0]}>
          <torusGeometry args={[0.025, 0.008, 4, 8, Math.PI]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Item */}
        {type === 'pot' && (
          <mesh position={[0, -0.05, 0]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.35} />
          </mesh>
        )}
        {type === 'lamp' && (
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 0.15, 8]} />
            <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
          </mesh>
        )}
        {type === 'tray' && (
          <mesh position={[0, -0.02, 0]} rotation={[0.25, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.015, 10]} />
            <meshStandardMaterial color={metalColor} metalness={0.6} roughness={0.25} />
          </mesh>
        )}
      </group>
    );
  }

  const rackWidth = count * 0.4 + 0.3;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Horizontal display bar */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, rackWidth, 6]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} />
      </mesh>
      {/* Support brackets to wall */}
      <mesh position={[-rackWidth / 2 + 0.1, 0.15, -0.15]}>
        <boxGeometry args={[0.08, 0.35, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      <mesh position={[rackWidth / 2 - 0.1, 0.15, -0.15]}>
        <boxGeometry args={[0.08, 0.35, 0.08]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>
      {/* Back mounting plate */}
      <mesh position={[0, 0.15, -0.22]}>
        <boxGeometry args={[rackWidth, 0.5, 0.06]} />
        <meshStandardMaterial color={WOOD_COLORS.medium} roughness={0.85} />
      </mesh>
      {/* Hanging items */}
      {items}
    </group>
  );
};

// Basket display
const BasketDisplay: React.FC<{
  position: [number, number, number];
  seed: number;
}> = ({ position, seed }) => {
  const baskets = [];
  const count = 2 + Math.floor(seededRandom(seed) * 2);
  for (let i = 0; i < count; i++) {
    const x = (i - count / 2 + 0.5) * 0.45;
    const basketColor = ['#8a6a40', '#7a5a35', '#9a7a50'][Math.floor(seededRandom(seed + i * 17) * 3)];
    baskets.push(
      <mesh key={i} position={[x, 0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.25, 8]} />
        <meshStandardMaterial color={basketColor} roughness={0.9} />
      </mesh>
    );
  }
  return <group position={position}>{baskets}</group>;
};

// Ceramic pottery display
const PotteryDisplay: React.FC<{
  position: [number, number, number];
  seed: number;
}> = ({ position, seed }) => {
  const pots = [];
  const count = 3 + Math.floor(seededRandom(seed) * 2);
  for (let i = 0; i < count; i++) {
    const x = (i - count / 2 + 0.5) * 0.3;
    const height = 0.2 + seededRandom(seed + i * 23) * 0.15;
    const potColor = ['#a05030', '#8a4525', '#b86040', '#7a3a20'][Math.floor(seededRandom(seed + i * 29) * 4)];
    pots.push(
      <mesh key={i} position={[x, height / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.1, height, 8]} />
        <meshStandardMaterial color={potColor} roughness={0.75} />
      </mesh>
    );
  }
  return <group position={position}>{pots}</group>;
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

  // Limestone flagstone floor - authentic Damascus souq paving
  const flagstoneTexture = useMemo(() => {
    return createLimestoneFlagstoneTexture(512, seed + 9999);
  }, [seed]);

  const floorElements = useMemo(() => {
    const elements: JSX.Element[] = [];

    // Main flagstone floor covering the souq corridor
    // Create material with the flagstone texture
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: flagstoneTexture,
      roughness: 0.92,
      metalness: 0.02,
      bumpMap: flagstoneTexture,
      bumpScale: 0.015,
    });

    // Large flagstone floor area
    elements.push(
      <mesh key="floor-flagstone" position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMaterial}>
        <planeGeometry args={[50, 70]} />
      </mesh>
    );

    // Worn grooves from cart wheels - subtle darker lines
    elements.push(
      <mesh key="floor-groove-left" position={[-1.8, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 65]} />
        <meshStandardMaterial color="#5a5248" roughness={1} transparent opacity={0.35} />
      </mesh>
    );
    elements.push(
      <mesh key="floor-groove-right" position={[1.8, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 65]} />
        <meshStandardMaterial color="#5a5248" roughness={1} transparent opacity={0.35} />
      </mesh>
    );

    // Central wear strip where most foot traffic occurs (slightly polished/lighter)
    elements.push(
      <mesh key="floor-wear-center" position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 65]} />
        <meshStandardMaterial color="#c8bca8" roughness={0.85} transparent opacity={0.12} />
      </mesh>
    );

    return elements;
  }, [flagstoneTexture]);

  // Hanging textiles and carpets - colorful displays along the arcade
  const textileElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const textileColors = [
      '#8b2323', // Deep crimson
      '#1a4a6e', // Indigo blue
      '#6b4423', // Warm brown
      '#2e5a3a', // Forest green
      '#5a3a6a', // Purple
      '#c4a035', // Golden ochre
    ];
    const corridorWidth = 12;

    // Hanging textiles on left side
    for (let i = -2; i <= 2; i++) {
      const z = i * 8 + 3;
      const localSeed = seed + i * 77 + 4000;
      if (seededRandom(localSeed) > 0.4) continue; // Only some spots have textiles

      const color = textileColors[Math.floor(seededRandom(localSeed + 1) * textileColors.length)];
      const width = 1.2 + seededRandom(localSeed + 2) * 0.8;
      const height = 1.5 + seededRandom(localSeed + 3) * 1.0;

      elements.push(
        <HangingTextile
          key={`textile-left-${i}`}
          position={[-corridorWidth / 2 + 0.5, 2.5, z]}
          rotation={Math.PI / 2}
          color={color}
          width={width}
          height={height}
        />
      );
    }

    // Hanging textiles on right side
    for (let i = -2; i <= 2; i++) {
      const z = i * 8 - 1;
      const localSeed = seed + i * 83 + 5000;
      if (seededRandom(localSeed) > 0.4) continue;

      const color = textileColors[Math.floor(seededRandom(localSeed + 1) * textileColors.length)];
      const width = 1.2 + seededRandom(localSeed + 2) * 0.8;
      const height = 1.5 + seededRandom(localSeed + 3) * 1.0;

      elements.push(
        <HangingTextile
          key={`textile-right-${i}`}
          position={[corridorWidth / 2 - 0.5, 2.5, z]}
          rotation={-Math.PI / 2}
          color={color}
          width={width}
          height={height}
        />
      );
    }

    return elements;
  }, [seed]);

  // Spice merchant stalls with proper tables
  const spiceElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const corridorWidth = 12;

    // Spice stall positions - placed against arcade walls
    const stallPositions = [
      { x: -corridorWidth / 2 - 2.5, z: -8, rot: Math.PI / 2 },
      { x: -corridorWidth / 2 - 2.5, z: 10, rot: Math.PI / 2 },
      { x: corridorWidth / 2 + 2.5, z: 0, rot: -Math.PI / 2 },
    ];

    stallPositions.forEach((pos, i) => {
      elements.push(
        <SpiceStall
          key={`spice-stall-${i}`}
          position={[pos.x, 0, pos.z]}
          rotation={pos.rot}
          seed={seed + i * 97 + 6000}
        />
      );
    });

    return elements;
  }, [seed]);

  // Stacked goods (sacks, baskets, pottery) along the edges
  const goodsElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const corridorWidth = 12;

    // Stacked sacks along arcade edges
    const sackPositions = [
      { x: -corridorWidth / 2 - 0.3, z: -12 },
      { x: -corridorWidth / 2 - 0.3, z: 15 },
      { x: corridorWidth / 2 + 0.3, z: -8 },
      { x: corridorWidth / 2 + 0.3, z: 12 },
    ];

    sackPositions.forEach((pos, i) => {
      const localSeed = seed + i * 101 + 7000;
      const count = 3 + Math.floor(seededRandom(localSeed) * 3);
      elements.push(
        <StackedSacks
          key={`sacks-${i}`}
          position={[pos.x, 0, pos.z]}
          count={count}
          seed={localSeed}
        />
      );
    });

    // Basket displays
    const basketPositions = [
      { x: -corridorWidth / 2 - 1.5, z: 3 },
      { x: corridorWidth / 2 + 1.5, z: -3 },
    ];

    basketPositions.forEach((pos, i) => {
      elements.push(
        <BasketDisplay
          key={`baskets-${i}`}
          position={[pos.x, 0, pos.z]}
          seed={seed + i * 107 + 8000}
        />
      );
    });

    // Pottery displays
    const potteryPositions = [
      { x: -corridorWidth / 2 - 1.8, z: -15 },
      { x: corridorWidth / 2 + 1.8, z: 18 },
    ];

    potteryPositions.forEach((pos, i) => {
      elements.push(
        <PotteryDisplay
          key={`pottery-${i}`}
          position={[pos.x, 0, pos.z]}
          seed={seed + i * 113 + 9000}
        />
      );
    });

    return elements;
  }, [seed]);

  // Metalware display racks - mounted on arcade walls
  const metalwareElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const corridorWidth = 12;

    // Rack positions - mounted on arcade columns/walls
    const rackPositions = [
      { x: -corridorWidth / 2 - 0.5, z: -4, rot: Math.PI / 2, y: 2.8 },
      { x: corridorWidth / 2 + 0.5, z: 8, rot: -Math.PI / 2, y: 2.6 },
      { x: -corridorWidth / 2 - 0.5, z: 16, rot: Math.PI / 2, y: 3.0 },
    ];

    rackPositions.forEach((pos, i) => {
      elements.push(
        <MetalwareRack
          key={`metalware-rack-${i}`}
          position={[pos.x, pos.y, pos.z]}
          rotation={pos.rot}
          seed={seed + i * 119 + 10000}
        />
      );
    });

    return elements;
  }, [seed]);

  return (
    <group>
      {arcadeElements}
      {awningElements}
      {lampElements}
      {floorElements}
      {textileElements}
      {spiceElements}
      {goodsElements}
      {metalwareElements}
    </group>
  );
};

export default SouqDecor;
