/**
 * StoneStaircase - External L-shaped stone staircase
 *
 * Common in Levantine architecture for rooftop access.
 * Auto-climb (requiresHold: false) - player walks up naturally.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ClimbableAccessory } from '../../../types';

interface StoneStaircaseProps {
  accessory: ClimbableAccessory;
  nightFactor?: number;
}

// Stone colors
const STONE_PRIMARY = '#a98963';
const STONE_SECONDARY = '#8b7355';
const STONE_DARK = '#6b5a4a';

export const StoneStaircase: React.FC<StoneStaircaseProps> = ({
  accessory,
  nightFactor = 0,
}) => {
  const { basePosition, width, height, depth, wallSide } = accessory;

  // Calculate rotation based on wall side
  const rotation = useMemo(() => {
    switch (wallSide) {
      case 0: return [0, 0, 0];           // North wall
      case 1: return [0, -Math.PI / 2, 0]; // East wall
      case 2: return [0, Math.PI, 0];      // South wall
      case 3: return [0, Math.PI / 2, 0];  // West wall
      default: return [0, 0, 0];
    }
  }, [wallSide]);

  // Calculate step dimensions
  const stepHeight = 0.35;
  const stepDepth = 0.45;
  const stepCount = Math.max(4, Math.floor(height / stepHeight));
  const actualStepHeight = height / stepCount;

  // Generate step data
  const steps = useMemo(() => {
    const result: Array<{ y: number; z: number; width: number }> = [];
    for (let i = 0; i < stepCount; i++) {
      result.push({
        y: i * actualStepHeight + actualStepHeight / 2,
        z: -i * stepDepth * 0.8,
        width: width * (1 - i * 0.01), // Slight taper
      });
    }
    return result;
  }, [stepCount, actualStepHeight, stepDepth, width]);

  // Landing platform at top
  const landingWidth = width * 1.2;
  const landingDepth = 1.2;
  const landingY = height - 0.1;
  const landingZ = -stepCount * stepDepth * 0.8 - landingDepth / 2;

  return (
    <group
      position={[basePosition[0], basePosition[1], basePosition[2]]}
      rotation={rotation as [number, number, number]}
    >
      {/* Steps */}
      {steps.map((step, index) => (
        <mesh
          key={`step-${index}`}
          position={[0, step.y, step.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[step.width, actualStepHeight, stepDepth]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? STONE_PRIMARY : STONE_SECONDARY}
            roughness={0.88}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Side wall (left) */}
      <mesh
        position={[-width / 2 - 0.1, height / 2, -(stepCount * stepDepth * 0.8) / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.2, height * 0.85, stepCount * stepDepth * 0.8 + 0.4]} />
        <meshStandardMaterial
          color={STONE_SECONDARY}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Side wall (right) - partial, for aesthetics */}
      <mesh
        position={[width / 2 + 0.1, height * 0.3, -(stepCount * stepDepth * 0.8) / 3]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.15, height * 0.5, stepCount * stepDepth * 0.5]} />
        <meshStandardMaterial
          color={STONE_SECONDARY}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Landing platform at top */}
      <mesh
        position={[0, landingY, landingZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[landingWidth, 0.25, landingDepth]} />
        <meshStandardMaterial
          color={STONE_PRIMARY}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {/* Landing edge/lip */}
      <mesh
        position={[0, landingY + 0.08, landingZ + landingDepth / 2 + 0.05]}
        castShadow
      >
        <boxGeometry args={[landingWidth, 0.1, 0.1]} />
        <meshStandardMaterial
          color={STONE_DARK}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Decorative post at top corner */}
      <mesh
        position={[-width / 2 - 0.1, height + 0.25, landingZ - landingDepth / 2 + 0.15]}
        castShadow
      >
        <boxGeometry args={[0.25, 0.5, 0.25]} />
        <meshStandardMaterial
          color={STONE_DARK}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {/* Cap on post */}
      <mesh
        position={[-width / 2 - 0.1, height + 0.55, landingZ - landingDepth / 2 + 0.15]}
        castShadow
      >
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial
          color={STONE_PRIMARY}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};

export default StoneStaircase;
