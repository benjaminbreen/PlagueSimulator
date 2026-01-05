import React, { useMemo } from 'react';
import { ClimbableAccessory } from '../../types';
import { calculateRooftopHatchPosition } from '../../utils/climbables';

/**
 * Renders rooftop hatches for multi-story buildings with exterior ladders.
 * Hatches are placed on the roof near the ladder landing position,
 * offset toward the center of the building.
 */

type RooftopHatchesProps = {
  climbables: ClimbableAccessory[];
};

const RooftopHatch: React.FC<{
  position: [number, number, number];
  rotation: number;
}> = ({ position, rotation }) => {
  const hatchSize = 0.9;
  const woodColor = '#5a4030';
  const woodDarkColor = '#4a3020';
  const ironColor = '#3a3a3a';

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Hatch frame (square on roof surface) */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[hatchSize + 0.12, 0.08, hatchSize + 0.12]} />
        <meshStandardMaterial color={woodDarkColor} roughness={0.9} />
      </mesh>

      {/* Inner opening (dark void) */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[hatchSize - 0.1, 0.02, hatchSize - 0.1]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>

      {/* Hatch door (trapdoor) - propped open */}
      <mesh position={[0, 0.28, -(hatchSize / 2 + 0.06)]} rotation={[-1.0, 0, 0]} castShadow>
        <boxGeometry args={[hatchSize - 0.08, 0.05, hatchSize - 0.08]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>

      {/* Panel detail on trapdoor */}
      <mesh position={[0, 0.30, -(hatchSize / 2 + 0.08)]} rotation={[-1.0, 0, 0]} receiveShadow>
        <boxGeometry args={[hatchSize * 0.55, 0.02, hatchSize * 0.55]} />
        <meshStandardMaterial color={woodDarkColor} roughness={0.9} />
      </mesh>

      {/* Iron hinges */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={`hinge-${i}`} position={[x, 0.06, hatchSize / 2 - 0.1]}>
          <boxGeometry args={[0.1, 0.025, 0.07]} />
          <meshStandardMaterial color={ironColor} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* Iron ring handle on trapdoor */}
      <mesh position={[0, 0.35, -(hatchSize / 2 - 0.1)]} rotation={[-1.0, 0, 0]}>
        <torusGeometry args={[0.06, 0.015, 8, 12]} />
        <meshStandardMaterial color={ironColor} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Slight raised edge around hatch for visibility */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[hatchSize + 0.25, 0.04, hatchSize + 0.25]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
      </mesh>
    </group>
  );
};

export const RooftopHatches: React.FC<RooftopHatchesProps> = ({ climbables }) => {
  // Memoize the filtered hatches to avoid recalculating every render
  const hatches = useMemo(() => {
    // Filter for ladder-type climbables that are marked as multi-story
    const eligibleClimbables = climbables.filter(c =>
      (c.type === 'WOODEN_LADDER' || c.type === 'LEAN_TO') && c.isMultiStory
    );

    // Group by building to avoid multiple hatches per building
    const buildingHatches = new Map<string, ClimbableAccessory>();
    for (const climbable of eligibleClimbables) {
      if (!buildingHatches.has(climbable.buildingId)) {
        buildingHatches.set(climbable.buildingId, climbable);
      }
    }

    return Array.from(buildingHatches.values());
  }, [climbables]);

  return (
    <>
      {hatches.map((climbable) => {
        const { position, rotation } = calculateRooftopHatchPosition(climbable);
        // Use actual roof height from climbable.roofY if available
        const hatchPosition: [number, number, number] = [
          position[0],
          climbable.roofY ?? position[1],
          position[2]
        ];
        return (
          <RooftopHatch
            key={`hatch-${climbable.buildingId}`}
            position={hatchPosition}
            rotation={rotation}
          />
        );
      })}
    </>
  );
};
