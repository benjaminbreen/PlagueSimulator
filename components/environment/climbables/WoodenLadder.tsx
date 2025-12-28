/**
 * WoodenLadder - Climbable wooden ladder against building walls
 *
 * Simple vertical ladder with rungs. Common in hovels and markets.
 * Requires holding W to climb (requiresHold: true).
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ClimbableAccessory } from '../../../types';

interface WoodenLadderProps {
  accessory: ClimbableAccessory;
  nightFactor?: number;
}

// Ladder colors
const WOOD_COLOR = '#6b5a42';
const WOOD_DARK = '#4a3f2d';

export const WoodenLadder: React.FC<WoodenLadderProps> = ({
  accessory,
  nightFactor = 0,
}) => {
  const { basePosition, width, height, wallSide } = accessory;

  // Calculate rotation based on wall side
  const rotation = useMemo(() => {
    switch (wallSide) {
      case 0: return [0, 0, 0];           // North - face south
      case 1: return [0, -Math.PI / 2, 0]; // East - face west
      case 2: return [0, Math.PI, 0];      // South - face north
      case 3: return [0, Math.PI / 2, 0];  // West - face east
      default: return [0, 0, 0];
    }
  }, [wallSide]);

  // Calculate number of rungs (one every ~0.4 units)
  const rungCount = Math.max(3, Math.floor(height / 0.4));
  const rungSpacing = height / (rungCount + 1);

  // Generate rung positions
  const rungs = useMemo(() => {
    const positions: number[] = [];
    for (let i = 1; i <= rungCount; i++) {
      positions.push(i * rungSpacing);
    }
    return positions;
  }, [rungCount, rungSpacing]);

  // Rail dimensions
  const railRadius = 0.04;
  const railLength = height + 0.3; // Extend slightly above
  const rungRadius = 0.03;
  const rungLength = width * 0.9;
  const railSpacing = width * 0.4;

  return (
    <group
      position={[basePosition[0], basePosition[1], basePosition[2]]}
      rotation={rotation as [number, number, number]}
    >
      {/* Left rail */}
      <mesh
        position={[-railSpacing, railLength / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[railRadius, railRadius * 1.1, railLength, 8]} />
        <meshStandardMaterial
          color={WOOD_COLOR}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Right rail */}
      <mesh
        position={[railSpacing, railLength / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[railRadius, railRadius * 1.1, railLength, 8]} />
        <meshStandardMaterial
          color={WOOD_COLOR}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Rungs */}
      {rungs.map((y, index) => (
        <mesh
          key={`rung-${index}`}
          position={[0, y, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[rungRadius, rungRadius, rungLength, 6]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? WOOD_COLOR : WOOD_DARK}
            roughness={0.92}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Top hook/bracket (attaches to wall) */}
      <mesh
        position={[0, height + 0.15, -0.05]}
        castShadow
      >
        <boxGeometry args={[width * 0.5, 0.1, 0.15]} />
        <meshStandardMaterial
          color={WOOD_DARK}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Bottom feet (angled slightly) */}
      <mesh
        position={[-railSpacing, 0.05, 0.02]}
        rotation={[0.1, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.08, 0.1, 0.12]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      <mesh
        position={[railSpacing, 0.05, 0.02]}
        rotation={[0.1, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.08, 0.1, 0.12]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
    </group>
  );
};

export default WoodenLadder;
