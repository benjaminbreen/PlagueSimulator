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
      {/* CARVED STONE SEAT - layered construction */}
      {/* Seat top surface (main sitting area) */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.7]} />
        <meshStandardMaterial color="#b89a73" roughness={0.85} />
      </mesh>

      {/* Seat edge molding (decorative lip) */}
      <mesh position={[0, -0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.05, 0.75]} />
        <meshStandardMaterial color="#a98963" roughness={0.9} />
      </mesh>

      {/* Seat underside (thicker for structural look) */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[1.75, 0.08, 0.65]} />
        <meshStandardMaterial color="#9a7a5a" roughness={0.95} />
      </mesh>

      {/* Carved decorative border on seat front */}
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
        <mesh key={`front-carving-${i}`} position={[x, 0, 0.38]} castShadow>
          <boxGeometry args={[0.15, 0.06, 0.03]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
        </mesh>
      ))}

      {/* LEFT LEG - carved stone support */}
      {/* Main leg pillar */}
      <mesh position={[-0.65, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.3, 0.7]} />
        <meshStandardMaterial color="#9a7a5a" roughness={0.92} />
      </mesh>
      {/* Leg capital (top detail) */}
      <mesh position={[-0.65, -0.05, 0]} castShadow>
        <boxGeometry args={[0.28, 0.06, 0.73]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
      </mesh>
      {/* Leg base (wider bottom) */}
      <mesh position={[-0.65, -0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.04, 0.73]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
      </mesh>
      {/* Decorative carved panel on leg */}
      <mesh position={[-0.65, -0.22, 0.36]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#7a5a3f" roughness={0.98} />
      </mesh>

      {/* RIGHT LEG - carved stone support */}
      {/* Main leg pillar */}
      <mesh position={[0.65, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.3, 0.7]} />
        <meshStandardMaterial color="#9a7a5a" roughness={0.92} />
      </mesh>
      {/* Leg capital (top detail) */}
      <mesh position={[0.65, -0.05, 0]} castShadow>
        <boxGeometry args={[0.28, 0.06, 0.73]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
      </mesh>
      {/* Leg base (wider bottom) */}
      <mesh position={[0.65, -0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.04, 0.73]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
      </mesh>
      {/* Decorative carved panel on leg */}
      <mesh position={[0.65, -0.22, 0.36]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#7a5a3f" roughness={0.98} />
      </mesh>

      {/* ORNAMENTAL BRACKETS connecting seat to legs */}
      {/* Left bracket - curved support */}
      <mesh position={[-0.65, -0.08, 0.32]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.93} />
      </mesh>
      <mesh position={[-0.65, -0.08, -0.32]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.93} />
      </mesh>

      {/* Right bracket - curved support */}
      <mesh position={[0.65, -0.08, 0.32]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.93} />
      </mesh>
      <mesh position={[0.65, -0.08, -0.32]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.93} />
      </mesh>

      {/* Stone weathering detail (darker patches) */}
      <mesh position={[-0.4, 0, 0.15]} receiveShadow>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.98} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.5, 0, -0.2]} receiveShadow>
        <boxGeometry args={[0.25, 0.02, 0.18]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.98} transparent opacity={0.5} />
      </mesh>
    </group>
  </HoverableGroup>
);

// ==================== CLAY JAR ====================

export const PushableClayJar: React.FC<{ item: PushableObject }> = ({ item }) => {
  // If shattered, show pottery shards
  if (item.isShattered) {
    return (
      <HoverableGroup
        position={[item.position.x, item.position.y, item.position.z]}
        positionVector={item.position}
        boxSize={[0.9, 0.4, 0.9]}
        labelTitle="Shattered Jar"
        labelLines={['Broken pottery', 'Ceramic shards']}
        labelOffset={[0, 0.35, 0]}
      >
        <group rotation={[0, item.rotation ?? 0, 0]}>
          {/* Pottery shards scattered on ground */}
          <mesh position={[0.08, 0.02, 0.1]} rotation={[-Math.PI / 2, 0, 0.4]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.025]} />
            <meshStandardMaterial color="#a9703a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.1, 0.02, 0.03]} rotation={[-Math.PI / 2, 0, -0.3]} castShadow>
            <boxGeometry args={[0.15, 0.10, 0.025]} />
            <meshStandardMaterial color="#9a6030" roughness={0.9} />
          </mesh>
          <mesh position={[0.03, 0.02, -0.1]} rotation={[-Math.PI / 2, 0, 0.7]} castShadow>
            <boxGeometry args={[0.12, 0.08, 0.02]} />
            <meshStandardMaterial color="#a9703a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.06, 0.02, -0.08]} rotation={[-Math.PI / 2, 0, -0.5]} castShadow>
            <boxGeometry args={[0.10, 0.07, 0.02]} />
            <meshStandardMaterial color="#9a6030" roughness={0.9} />
          </mesh>
          {/* Base fragment */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 0.1, 8]} />
            <meshStandardMaterial color="#9a6030" roughness={0.9} />
          </mesh>
        </group>
      </HoverableGroup>
    );
  }

  // Intact jar - AMPHORA STYLE with handles
  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[0.8, 0.9, 0.8]}
      labelTitle="Clay Jar"
      labelLines={['Glazed ceramic', 'Stored goods', 'Earthenware']}
      labelOffset={[0, 0.7, 0]}
    >
      <group rotation={[0, item.rotation ?? 0, 0]}>
        {/* AMPHORA BASE - pointed bottom typical of ancient storage jars */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.12, 0.16, 12]} />
          <meshStandardMaterial color="#9a6030" roughness={0.92} />
        </mesh>
        {/* Base disk so the jar sits on the ground */}
        <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.02, 12]} />
          <meshStandardMaterial color="#8a5528" roughness={0.92} />
        </mesh>

        {/* LOWER BODY - wide belly for storage */}
        <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.12, 0.2, 16]} />
          <meshStandardMaterial color="#a9703a" roughness={0.88} />
        </mesh>

        {/* MID BODY - widest point */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.32, 0.16, 16]} />
          <meshStandardMaterial color="#b98050" roughness={0.85} />
        </mesh>

        {/* UPPER BODY - tapering toward neck */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.35, 0.14, 16]} />
          <meshStandardMaterial color="#a9703a" roughness={0.88} />
        </mesh>

        {/* SHOULDER - transition to neck */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.28, 0.12, 16]} />
          <meshStandardMaterial color="#9a6030" roughness={0.9} />
        </mesh>

        {/* NECK - narrow cylindrical neck */}
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.18, 14]} />
          <meshStandardMaterial color="#a9703a" roughness={0.9} />
        </mesh>

        {/* RIM - flared opening */}
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.15, 0.06, 14]} />
          <meshStandardMaterial color="#8a5a2a" roughness={0.85} />
        </mesh>

        {/* LIP - top edge */}
        <mesh position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.18, 0.02, 8, 16]} />
          <meshStandardMaterial color="#7a4a1a" roughness={0.9} />
        </mesh>

        {/* HANDLES - characteristic amphora loop handles */}
        {/* Left handle */}
        <mesh position={[-0.28, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.12, 0.025, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#9a6030" roughness={0.92} />
        </mesh>
        {/* Left handle attachment (top) */}
        <mesh position={[-0.30, 0.64, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#8a5a2a" roughness={0.95} />
        </mesh>
        {/* Left handle attachment (bottom) */}
        <mesh position={[-0.32, 0.40, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#8a5a2a" roughness={0.95} />
        </mesh>

        {/* Right handle */}
        <mesh position={[0.28, 0.52, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <torusGeometry args={[0.12, 0.025, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#9a6030" roughness={0.92} />
        </mesh>
        {/* Right handle attachment (top) */}
        <mesh position={[0.30, 0.64, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#8a5a2a" roughness={0.95} />
        </mesh>
        {/* Right handle attachment (bottom) */}
        <mesh position={[0.32, 0.40, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#8a5a2a" roughness={0.95} />
        </mesh>

        {/* DECORATIVE BANDS - painted/glazed stripes */}
        <mesh position={[0, 0.46, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.04, 16]} />
          <meshStandardMaterial color="#6a3a1a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 16]} />
          <meshStandardMaterial color="#6a3a1a" roughness={0.7} />
        </mesh>

        {/* GLAZE DRIP EFFECT - darker patch running down */}
        <mesh position={[0.15, 0.45, 0.25]} receiveShadow>
          <boxGeometry args={[0.08, 0.3, 0.02]} />
          <meshStandardMaterial color="#7a5030" roughness={0.8} transparent opacity={0.6} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};

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
    <group rotation={[0, item.rotation ?? 0, 0]}>
      {/* WOVEN BASKET BODY - layered construction for texture */}

      {/* Base - wider bottom */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.42, 0.06, 16]} />
        <meshStandardMaterial color="#9a7a52" roughness={0.98} />
      </mesh>

      {/* Main body - tapered sides with woven texture rings */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 0.09 + i * 0.05;
        const topR = 0.35 - i * 0.015;
        const botR = 0.38 - i * 0.015;
        const color = i % 2 === 0 ? '#a67c52' : '#b68c62';

        return (
          <mesh key={`weave-${i}`} position={[0, y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[topR, botR, 0.05, 18]} />
            <meshStandardMaterial color={color} roughness={0.96} />
          </mesh>
        );
      })}

      {/* Rim reinforcement - darker woven band */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.34, 0.04, 18]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.98} />
      </mesh>

      {/* Top edge - rolled lip */}
      <mesh position={[0, 0.39, 0]} castShadow>
        <torusGeometry args={[0.35, 0.025, 10, 20]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.97} />
      </mesh>

      {/* WOVEN TEXTURE DETAIL - vertical ribs/strands */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 0.38;
        const z = Math.sin(angle) * 0.38;

        return (
          <mesh key={`rib-${i}`} position={[x, 0.2, z]} rotation={[0, -angle, 0]} castShadow>
            <boxGeometry args={[0.02, 0.32, 0.015]} />
            <meshStandardMaterial color="#9a7552" roughness={0.99} />
          </mesh>
        );
      })}

      {/* BASKET HANDLES - woven reed handles */}
      {/* Left handle */}
      <group position={[-0.32, 0.28, 0]}>
        {/* Handle arch */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.14, 0.02, 8, 14, Math.PI]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.96} />
        </mesh>
        {/* Handle attachment - woven binding */}
        <mesh position={[0, -0.14, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.06, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.06, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.98} />
        </mesh>
        {/* Wrapped cord detail on handle */}
        {[0, 1, 2, 3].map((j) => {
          const offset = -0.12 + j * 0.08;
          return (
            <mesh key={`left-cord-${j}`} position={[0, offset, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[Math.abs(offset) + 0.02, 0.008, 6, 10]} />
              <meshStandardMaterial color="#6a4a2a" roughness={0.99} />
            </mesh>
          );
        })}
      </group>

      {/* Right handle */}
      <group position={[0.32, 0.28, 0]}>
        {/* Handle arch */}
        <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
          <torusGeometry args={[0.14, 0.02, 8, 14, Math.PI]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.96} />
        </mesh>
        {/* Handle attachment - woven binding */}
        <mesh position={[0, -0.14, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.06, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.06, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.98} />
        </mesh>
        {/* Wrapped cord detail on handle */}
        {[0, 1, 2, 3].map((j) => {
          const offset = -0.12 + j * 0.08;
          return (
            <mesh key={`right-cord-${j}`} position={[0, offset, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <torusGeometry args={[Math.abs(offset) + 0.02, 0.008, 6, 10]} />
              <meshStandardMaterial color="#6a4a2a" roughness={0.99} />
            </mesh>
          );
        })}
      </group>

      {/* BASE PATTERN - woven star/cross pattern on bottom */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={`base-weave-${i}`} position={[0, 0.01, 0]} rotation={[0, angle, Math.PI / 2]} receiveShadow>
            <boxGeometry args={[0.02, 0.6, 0.015]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.99} />
          </mesh>
        );
      })}
    </group>
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

export const PushableCrate: React.FC<{ item: PushableObject }> = ({ item }) => {
  // If shattered, show broken wood pieces instead of intact crate
  if (item.isShattered) {
    return (
      <HoverableGroup
        position={[item.position.x, item.position.y, item.position.z]}
        positionVector={item.position}
        boxSize={[1.4, 0.5, 1.4]}
        labelTitle="Broken Crate"
        labelLines={['Splintered wood', 'Destroyed cargo']}
        labelOffset={[0, 0.4, 0]}
      >
        <group rotation={[0, item.rotation ?? 0, 0]}>
          {/* Scattered wood planks */}
          <mesh position={[0.15, 0.05, 0.2]} rotation={[-0.1, 0.3, 0.15]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.15]} />
            <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.2, 0.04, -0.15]} rotation={[0.05, -0.4, -0.1]} castShadow>
            <boxGeometry args={[0.45, 0.08, 0.12]} />
            <meshStandardMaterial color="#5a4a2a" roughness={0.95} />
          </mesh>
          <mesh position={[0.25, 0.03, -0.25]} rotation={[0.2, 0.5, 0.08]} castShadow>
            <boxGeometry args={[0.35, 0.06, 0.1]} />
            <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.1, 0.06, 0.3]} rotation={[-0.15, -0.2, 0.3]} castShadow>
            <boxGeometry args={[0.4, 0.07, 0.13]} />
            <meshStandardMaterial color="#5a4a2a" roughness={0.95} />
          </mesh>
          {/* Corner piece */}
          <mesh position={[0, 0.08, 0]} rotation={[0.1, 0.1, 0.05]} castShadow>
            <boxGeometry args={[0.25, 0.25, 0.25]} />
            <meshStandardMaterial color="#5a4a2a" roughness={0.95} />
          </mesh>
          {/* Small splinters */}
          <mesh position={[-0.3, 0.02, 0.1]} rotation={[0, 0.8, 0.1]} castShadow>
            <boxGeometry args={[0.2, 0.04, 0.05]} />
            <meshStandardMaterial color="#7a6a4a" roughness={0.85} />
          </mesh>
          <mesh position={[0.35, 0.02, 0.05]} rotation={[0, -0.6, -0.1]} castShadow>
            <boxGeometry args={[0.18, 0.03, 0.04]} />
            <meshStandardMaterial color="#7a6a4a" roughness={0.85} />
          </mesh>
        </group>
      </HoverableGroup>
    );
  }

  // Intact crate
  return (
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
};

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

// ==================== STORAGE CHEST ====================

export const PushableStorageChest: React.FC<{ item: PushableObject }> = ({ item }) => {
  const chestWood = '#6a4a32';
  const darkWood = '#5a3d28';
  const ironHardware = '#3a3a3a';
  const brass = '#b8860b';

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y + 0.28, item.position.z]}
      positionVector={item.position}
      boxSize={[1.4, 0.8, 0.9]}
      labelTitle="Storage Chest"
      labelLines={['Locked chest', 'Press O to open', 'Merchant goods']}
      labelOffset={[0, 0.7, 0]}
    >
      <group rotation={[0, item.rotation ?? 0, 0]}>
        {/* Main chest body */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.2, 0.55, 0.65]} />
          <meshStandardMaterial color={chestWood} roughness={0.9} />
        </mesh>

        {/* Lid (slightly curved top) */}
        <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.22, 0.12, 0.67]} />
          <meshStandardMaterial color={darkWood} roughness={0.88} />
        </mesh>

        {/* Base/feet */}
        {[
          [-0.5, -0.3, -0.28],
          [0.5, -0.3, -0.28],
          [-0.5, -0.3, 0.28],
          [0.5, -0.3, 0.28],
        ].map((pos, i) => (
          <mesh key={`foot-${i}`} position={pos as [number, number, number]} receiveShadow castShadow>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshStandardMaterial color={darkWood} roughness={0.92} />
          </mesh>
        ))}

        {/* Iron corner reinforcements */}
        {[
          [-0.58, 0, -0.31],
          [0.58, 0, -0.31],
          [-0.58, 0, 0.31],
          [0.58, 0, 0.31],
        ].map((pos, i) => (
          <mesh key={`corner-${i}`} position={pos as [number, number, number]} receiveShadow castShadow>
            <boxGeometry args={[0.04, 0.6, 0.04]} />
            <meshStandardMaterial color={ironHardware} roughness={0.5} metalness={0.8} />
          </mesh>
        ))}

        {/* Horizontal metal band */}
        <mesh position={[0, 0.12, 0.335]} receiveShadow castShadow>
          <boxGeometry args={[1.25, 0.05, 0.02]} />
          <meshStandardMaterial color={ironHardware} roughness={0.55} metalness={0.75} />
        </mesh>

        {/* Lock plate */}
        <mesh position={[0, 0.1, 0.34]} receiveShadow castShadow>
          <boxGeometry args={[0.15, 0.15, 0.02]} />
          <meshStandardMaterial color={brass} roughness={0.3} metalness={0.9} />
        </mesh>

        {/* Keyhole */}
        <mesh position={[0, 0.08, 0.36]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 6]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      </group>
    </HoverableGroup>
  );
};
