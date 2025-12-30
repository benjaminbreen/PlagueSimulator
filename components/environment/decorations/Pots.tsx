/**
 * Potted Plant Components
 * Various potted plants for marketplace and district decorations with size/style variation
 */

import React from 'react';
import { PushableObject } from '../../../utils/pushables';
import { POT_COLORS, FLOWER_COLORS } from '../constants';
import { HoverableGroup } from '../shared/HoverSystem';

// ==================== SHATTERED POT (shared) ====================

const ShatteredPot: React.FC<{
  item: PushableObject;
  potColor: string;
  hasPlant?: boolean;
  plantColor?: string;
}> = ({ item, potColor, hasPlant = false, plantColor = '#3a5a2a' }) => {
  const scale = item.potSize ?? 1.0;

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.2 * scale, 0.5 * scale, 1.2 * scale]}
      labelTitle="Shattered Pot"
      labelLines={['Broken pottery', 'Ceramic shards']}
      labelOffset={[0, 0.4 * scale, 0]}
    >
      <group scale={[scale, scale, scale]} rotation={[0, item.rotation ?? 0, 0]}>
        {/* Pottery shards scattered on ground */}
        <mesh position={[0.12, 0.02, 0.15]} rotation={[-Math.PI / 2, 0, 0.4]} castShadow>
          <boxGeometry args={[0.2, 0.14, 0.03]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[-0.14, 0.02, 0.08]} rotation={[-Math.PI / 2, 0, -0.3]} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.03]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[0.08, 0.02, -0.12]} rotation={[-Math.PI / 2, 0, 0.6]} castShadow>
          <boxGeometry args={[0.15, 0.10, 0.025]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[-0.1, 0.02, -0.1]} rotation={[-Math.PI / 2, 0, -0.5]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.025]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        {/* Base fragment */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.12, 8]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        {/* Spilled dirt */}
        <mesh position={[0.05, 0.03, 0.02]} castShadow>
          <sphereGeometry args={[0.18, 6, 6]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
        </mesh>
        {/* Wilted plant remains if applicable */}
        {hasPlant && (
          <>
            <mesh position={[0.1, 0.08, 0.05]} rotation={[0.4, 0.2, 0.6]} castShadow>
              <cylinderGeometry args={[0.02, 0.03, 0.15, 6]} />
              <meshStandardMaterial color={plantColor} roughness={0.9} />
            </mesh>
            <mesh position={[-0.08, 0.06, -0.05]} rotation={[-0.3, 0.4, -0.5]} castShadow>
              <cylinderGeometry args={[0.02, 0.025, 0.12, 6]} />
              <meshStandardMaterial color={plantColor} roughness={0.9} />
            </mesh>
          </>
        )}
      </group>
    </HoverableGroup>
  );
};

// ==================== GERANIUM POT ====================

export const PushableGeraniumPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColor = POT_COLORS.terracotta[style] || POT_COLORS.terracotta[0];
  const flowerColor = FLOWER_COLORS.geranium[style] || FLOWER_COLORS.geranium[0];

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#3a4a2a" />;
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.1 * scale, 1.2 * scale, 1.1 * scale]}
      labelTitle="Geranium Pot"
      labelLines={['Fragrant petals', 'Terracotta pot', 'Sunlit stoop']}
      labelOffset={[0, 1.2 * scale, 0]}
    >
      <group scale={[scale, scale, scale]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshStandardMaterial color={flowerColor} roughness={0.85} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};

// ==================== OLIVE POT ====================

export const PushableOlivePot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColor = POT_COLORS.clay[style] || POT_COLORS.clay[0];

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#3f5d3a" />;
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.2 * scale, 1.6 * scale, 1.2 * scale]}
      labelTitle="Olive Tree Pot"
      labelLines={['Terracotta planter', 'Olive sapling', 'Courtyard decor']}
      labelOffset={[0, 1.2 * scale, 0]}
    >
      <group scale={[scale, scale, scale]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.45, 12]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.5, 8]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <sphereGeometry args={[0.55, 10, 8]} />
          <meshStandardMaterial color="#3f5d3a" roughness={0.85} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};

// ==================== LEMON POT ====================

export const PushableLemonPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColor = POT_COLORS.clay[style] || POT_COLORS.clay[0];

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#4a6b3a" />;
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.2 * scale, 1.6 * scale, 1.2 * scale]}
      labelTitle="Lemon Tree Pot"
      labelLines={['Terracotta planter', 'Citrus sapling', 'Courtyard decor']}
      labelOffset={[0, 1.2 * scale, 0]}
    >
      <group scale={[scale, scale, scale]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.45, 12]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.5, 8]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.95} />
        </mesh>
        <mesh position={[0.05, 0.88, 0]} castShadow>
          <sphereGeometry args={[0.55, 10, 8]} />
          <meshStandardMaterial color="#4a6b3a" roughness={0.85} />
        </mesh>
        <mesh position={[0.25, 0.72, 0.12]} castShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#d6b43f" roughness={0.75} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};

// ==================== PALM POT ====================

export const PushablePalmPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColor = POT_COLORS.ceramic[style] || POT_COLORS.ceramic[0];

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#4a6a2a" />;
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.3 * scale, 1.8 * scale, 1.3 * scale]}
      labelTitle="Palm Pot"
      labelLines={['Ceramic planter', 'Date palm', 'Desert flora']}
      labelOffset={[0, 1.4 * scale, 0]}
    >
      <group scale={[scale, scale, scale]}>
        {/* Pot */}
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.6, 0.5, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        {/* Trunk */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.8, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
        </mesh>
        {/* Fronds */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.3, 1.1, Math.sin(angle) * 0.3]}
              rotation={[Math.cos(angle) * 0.6, angle, Math.sin(angle) * 0.6]}
              castShadow
            >
              <boxGeometry args={[0.08, 0.5, 0.02]} />
              <meshStandardMaterial color="#4a6a2a" roughness={0.85} />
            </mesh>
          );
        })}
      </group>
    </HoverableGroup>
  );
};

// ==================== BOUGAINVILLEA POT ====================

export const PushableBougainvilleaPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColor = POT_COLORS.clay[style] || POT_COLORS.clay[0];
  const flowerColor = FLOWER_COLORS.bougainvillea[style] || FLOWER_COLORS.bougainvillea[0];

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#3a5a2a" />;
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[1.2 * scale, 1.4 * scale, 1.2 * scale]}
      labelTitle="Bougainvillea Pot"
      labelLines={['Terracotta planter', 'Flowering vine', 'Vibrant blooms']}
      labelOffset={[0, 1.1 * scale, 0]}
    >
      <group scale={[scale, scale, scale]}>
        {/* Pot */}
        <mesh castShadow>
          <cylinderGeometry args={[0.42, 0.52, 0.42, 12]} />
          <meshStandardMaterial color={potColor} roughness={0.9} />
        </mesh>
        {/* Vines/stems */}
        <mesh position={[0.1, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} />
          <meshStandardMaterial color="#3a5a2a" roughness={0.95} />
        </mesh>
        <mesh position={[-0.1, 0.45, 0.05]} rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.5, 6]} />
          <meshStandardMaterial color="#3a5a2a" roughness={0.95} />
        </mesh>
        {/* Flowers - cascading */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const angle = (i / 3.5) * Math.PI * 2;
          const height = 0.6 + (i % 3) * 0.15;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.35, height, Math.sin(angle) * 0.35]}
              castShadow
            >
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshStandardMaterial color={flowerColor} roughness={0.75} />
            </mesh>
          );
        })}
      </group>
    </HoverableGroup>
  );
};
