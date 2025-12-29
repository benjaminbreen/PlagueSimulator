/**
 * Pushable Decoration Components
 * Benches, jars, baskets, coins, and collectible items
 */

import React from 'react';
import * as THREE from 'three';
import { PushableObject } from '../../../utils/pushables';
import { HoverableGroup } from '../shared/HoverSystem';
import { InventoryItemMesh } from '../../items/ItemMeshes';
import { getItemDetailsByItemId } from '../../../utils/merchantItems';
import { ItemAppearance } from '../../../types';

// ==================== BENCH ====================

export const PushableBench: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[2.2, 0.6, 1.1]}
    labelTitle="Stone Bench"
    labelLines={['Resting place', 'Cool limestone', 'Market shade']}
    labelOffset={[0, 0.6, 0]}
  >
    <group rotation={[0, item.rotation ?? 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.2, 0.7]} />
        <meshStandardMaterial color="#a98963" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, -0.1, 0]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.7]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, -0.1, 0]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.7]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
    </group>
  </HoverableGroup>
);

// ==================== CLAY JAR ====================

export const PushableClayJar: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.8, 0.9, 0.8]}
    labelTitle="Clay Jar"
    labelLines={['Glazed ceramic', 'Stored goods', 'Earthenware']}
    labelOffset={[0, 0.7, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.25, 0.35, 0.6, 10]} />
      <meshStandardMaterial color="#a9703a" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

// ==================== BASKET ====================

export const PushableBasket: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.9, 0.6, 0.9]}
    labelTitle="Wicker Basket"
    labelLines={['Woven reeds', 'Market goods', 'Handmade']}
    labelOffset={[0, 0.6, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.4, 0.35, 12]} />
      <meshStandardMaterial color="#a67c52" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.2, 0]} castShadow>
      <torusGeometry args={[0.32, 0.03, 8, 18]} />
      <meshStandardMaterial color="#8b6a3e" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

// ==================== COIN ====================

export const PushableCoin: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Coin'}
    labelLines={['Lost in the dust']}
    labelOffset={[0, 0.4, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]}>
      <cylinderGeometry args={[0.14, 0.14, 0.03, 12]} />
      <meshStandardMaterial color="#c8a54a" roughness={0.35} metalness={0.6} />
    </mesh>
  </HoverableGroup>
);

// ==================== OLIVE ====================

export const PushableOlive: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Olives'}
    labelLines={['Freshly fallen']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small objects - no shadow casting */}
    <mesh>
      <sphereGeometry args={[0.08, 8, 6]} />
      <meshStandardMaterial color="#54683f" roughness={0.75} />
    </mesh>
    <mesh position={[0.12, 0.02, 0.06]}>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshStandardMaterial color="#4a5f3a" roughness={0.75} />
    </mesh>
  </HoverableGroup>
);

// ==================== LEMON ====================

export const PushableLemon: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Lemon'}
    labelLines={['Bright citrus']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh>
      <sphereGeometry args={[0.1, 10, 8]} />
      <meshStandardMaterial color="#d9b443" roughness={0.7} />
    </mesh>
  </HoverableGroup>
);

// ==================== POTTERY SHARD ====================

export const PushablePotteryShard: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Pottery Shard'}
    labelLines={['Broken earthenware']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]}>
      <boxGeometry args={[0.22, 0.18, 0.03]} />
      <meshStandardMaterial color="#9c5f3a" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

// ==================== LINEN SCRAP ====================

export const PushableLinenScrap: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Linen Scrap'}
    labelLines={['Frayed cloth']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]}>
      <planeGeometry args={[0.28, 0.22]} />
      <meshStandardMaterial color="#d8cbb0" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  </HoverableGroup>
);

// ==================== CANDLE STUB ====================

export const PushableCandleStub: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Candle Stub'}
    labelLines={['Beeswax remnant']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh>
      <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
      <meshStandardMaterial color="#e7d7a8" roughness={0.8} />
    </mesh>
  </HoverableGroup>
);

// ==================== TWINE ====================

export const PushableTwine: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Twine'}
    labelLines={['Palm fiber']}
    labelOffset={[0, 0.35, 0]}
  >
    {/* PERFORMANCE: Small object - no shadow casting */}
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]}>
      <torusGeometry args={[0.12, 0.02, 6, 12]} />
      <meshStandardMaterial color="#bfa373" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

// ==================== DROPPED ITEM ====================

export const PushableDroppedItem: React.FC<{ item: PushableObject }> = ({ item }) => {
  const itemId = item.pickup?.itemId ?? 'unknown';
  const details = getItemDetailsByItemId(itemId);
  const name = details?.name ?? item.pickup?.label ?? 'Dropped Item';
  const category = details?.category ?? 'Apparel';
  const rarity = details?.rarity ?? 'common';
  const appearance = item.appearance as ItemAppearance | undefined;

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[0.7, 0.6, 0.7]}
      labelTitle={name}
      labelLines={['Dropped item']}
      labelOffset={[0, 0.6, 0]}
    >
      <group rotation={[0, item.rotation ?? 0, 0]}>
        <InventoryItemMesh
          itemId={itemId}
          name={name}
          category={String(category)}
          rarity={rarity}
          appearance={appearance}
        />
      </group>
    </HoverableGroup>
  );
};

// ==================== CRATE ====================

export const PushableCrate: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[1.0, 1.0, 1.0]}
    labelTitle="Wooden Crate"
    labelLines={['Heavy cargo', 'Merchant goods', 'Pushable']}
    labelOffset={[0, 0.8, 0]}
  >
    <group rotation={[0, item.rotation ?? 0, 0]}>
      {/* Main crate body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
      </mesh>
      {/* Wood slats for detail */}
      <mesh position={[0, 0, 0.46]} castShadow>
        <boxGeometry args={[0.92, 0.1, 0.05]} />
        <meshStandardMaterial color="#5a4a2a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.46]} castShadow>
        <boxGeometry args={[0.92, 0.1, 0.05]} />
        <meshStandardMaterial color="#5a4a2a" roughness={0.95} />
      </mesh>
    </group>
  </HoverableGroup>
);

// ==================== AMPHORA ====================

export const PushableAmphora: React.FC<{ item: PushableObject }> = ({ item }) => {
  const jarHeight = 1.2;
  const jarRadius = 0.35;

  // If shattered, show pottery shards instead of intact jar
  if (item.isShattered) {
    return (
      <HoverableGroup
        position={[item.position.x, item.position.y, item.position.z]}
        positionVector={item.position}
        boxSize={[1.2, 0.4, 1.2]}
        labelTitle="Shattered Amphora"
        labelLines={['Broken pottery', 'Ceramic shards']}
        labelOffset={[0, 0.4, 0]}
      >
        <group rotation={[0, item.rotation ?? 0, 0]}>
          {/* Pottery shards scattered on ground */}
          <mesh position={[0.1, 0.02, 0.15]} rotation={[-Math.PI / 2, 0, 0.3]} castShadow>
            <boxGeometry args={[0.25, 0.18, 0.03]} />
            <meshStandardMaterial color="#8b6a4a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.15, 0.02, 0.05]} rotation={[-Math.PI / 2, 0, -0.5]} castShadow>
            <boxGeometry args={[0.22, 0.15, 0.03]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0.05, 0.02, -0.12]} rotation={[-Math.PI / 2, 0, 0.8]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.03]} />
            <meshStandardMaterial color="#8b6a4a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.08, 0.02, -0.18]} rotation={[-Math.PI / 2, 0, -0.2]} castShadow>
            <boxGeometry args={[0.15, 0.10, 0.03]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          {/* Base fragment */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[jarRadius * 0.6, jarRadius * 0.7, 0.15, 8]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
        </group>
      </HoverableGroup>
    );
  }

  // Intact amphora
  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[0.9, 1.4, 0.9]}
      labelTitle="Amphora"
      labelLines={['Ceramic jar', 'Storage vessel', 'Fragile!']}
      labelOffset={[0, 1.2, 0]}
    >
      <group rotation={[0, item.rotation ?? 0, 0]}>
        {/* Main body - bulbous */}
        <mesh position={[0, jarHeight * 0.4, 0]} castShadow receiveShadow>
          <sphereGeometry args={[jarRadius, 8, 8]} />
          <meshStandardMaterial color="#8b6a4a" roughness={0.85} />
        </mesh>

        {/* Neck - narrow cylinder */}
        <mesh position={[0, jarHeight * 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.15, jarRadius * 0.7, jarHeight * 0.4, 8]} />
          <meshStandardMaterial color="#8b6a4a" roughness={0.85} />
        </mesh>

        {/* Base - flat bottom */}
        <mesh position={[0, jarHeight * 0.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[jarRadius * 0.8, jarRadius * 0.9, jarHeight * 0.2, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
        </mesh>

        {/* Handles - two side loops */}
        <mesh position={[jarRadius * 0.6, jarHeight * 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.12, 0.05, 6, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
        <mesh position={[-jarRadius * 0.6, jarHeight * 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.12, 0.05, 6, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};
