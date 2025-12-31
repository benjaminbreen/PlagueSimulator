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
        {/* Base disk so the bottom doesn't look missing */}
        <mesh position={[0, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.02, 10]} />
          <meshStandardMaterial color={potColor} roughness={0.92} />
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

  // Secondary flower color (slightly lighter/darker variation)
  const flowerColor2 = style === 0 ? '#ff6080' : style === 1 ? '#e84070' : '#ff9080';

  if (item.isShattered) {
    return <ShatteredPot item={item} potColor={potColor} hasPlant plantColor="#3a4a2a" />;
  }

  // Geranium flower cluster positions - round heads on stems
  const flowerClusters = [
    { pos: [0, 0.75, 0], size: 0.18, rot: 0 },
    { pos: [0.22, 0.68, 0.12], size: 0.14, rot: 0.4 },
    { pos: [-0.18, 0.70, 0.15], size: 0.15, rot: -0.3 },
    { pos: [0.12, 0.65, -0.2], size: 0.13, rot: 0.2 },
    { pos: [-0.15, 0.62, -0.18], size: 0.12, rot: -0.5 },
  ];

  // Leaf positions - geraniums have distinctive round scalloped leaves
  const leaves = [
    { pos: [0.25, 0.38, 0.18], rot: [0.3, 0.5, 0.2], size: 1.0 },
    { pos: [-0.22, 0.40, 0.2], rot: [0.2, -0.4, -0.15], size: 0.9 },
    { pos: [0.2, 0.35, -0.22], rot: [0.25, 2.2, 0.1], size: 0.85 },
    { pos: [-0.18, 0.36, -0.2], rot: [0.3, -2.0, -0.2], size: 0.9 },
    { pos: [0.28, 0.32, 0], rot: [0.35, 1.2, 0.25], size: 0.8 },
    { pos: [-0.26, 0.34, 0.05], rot: [0.3, -1.0, -0.2], size: 0.85 },
    { pos: [0, 0.42, 0.28], rot: [0.4, 0, 0], size: 0.95 },
    { pos: [0, 0.38, -0.26], rot: [0.35, Math.PI, 0], size: 0.9 },
  ];

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
        {/* REALISTIC TERRACOTTA POT */}
        {/* Pot base - wider bottom */}
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.38, 0.48, 0.12, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.88} />
        </mesh>
        {/* Pot body - tapered */}
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.38, 0.18, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.88} />
        </mesh>
        {/* Pot rim - flared lip */}
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.38, 0.35, 0.04, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.85} />
        </mesh>
        {/* Decorative band around pot */}
        <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.37, 0.02, 8, 14]} />
          <meshStandardMaterial color="#8a5a3a" roughness={0.9} />
        </mesh>
        {/* Soil visible at top */}
        <mesh position={[0, 0.29, 0]} receiveShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.02, 12]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.98} />
        </mesh>

        {/* GERANIUM STEMS - multiple sturdy green stems */}
        {/* Central stem */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.38, 8]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
        </mesh>
        {/* Secondary stems */}
        <mesh position={[0.12, 0.42, 0.08]} rotation={[0.15, 0.4, 0.2]} castShadow>
          <cylinderGeometry args={[0.02, 0.028, 0.32, 6]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
        </mesh>
        <mesh position={[-0.1, 0.44, 0.1]} rotation={[0.12, -0.3, -0.18]} castShadow>
          <cylinderGeometry args={[0.02, 0.028, 0.30, 6]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
        </mesh>
        <mesh position={[0.08, 0.40, -0.12]} rotation={[-0.18, 0.2, 0.15]} castShadow>
          <cylinderGeometry args={[0.018, 0.025, 0.28, 6]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
        </mesh>
        <mesh position={[-0.1, 0.38, -0.1]} rotation={[-0.15, -0.35, -0.12]} castShadow>
          <cylinderGeometry args={[0.018, 0.025, 0.26, 6]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
        </mesh>

        {/* GERANIUM LEAVES - distinctive round, scalloped leaves with zone markings */}
        {leaves.map((leaf, i) => (
          <group
            key={`leaf-${i}`}
            position={leaf.pos as [number, number, number]}
            rotation={leaf.rot as [number, number, number]}
          >
            {/* Main leaf body - flattened sphere for round shape */}
            <mesh castShadow>
              <sphereGeometry args={[0.12 * leaf.size, 10, 8]} />
              <meshStandardMaterial
                color={i % 3 === 0 ? '#3a6a3a' : i % 3 === 1 ? '#4a7a4a' : '#3a5a2a'}
                roughness={0.75}
              />
            </mesh>
            {/* Dark zone marking (characteristic geranium leaf pattern) */}
            <mesh position={[0, 0.01, 0]} scale={[0.7, 0.5, 0.7]}>
              <sphereGeometry args={[0.1 * leaf.size, 8, 6]} />
              <meshStandardMaterial color="#2a4a2a" roughness={0.8} transparent opacity={0.6} />
            </mesh>
            {/* Leaf stem attachment */}
            <mesh position={[0, 0, -0.1 * leaf.size]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.015, 0.08, 6]} />
              <meshStandardMaterial color="#5a7a4a" roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* FLOWER CLUSTERS - geraniums have round umbel flower heads */}
        {flowerClusters.map((cluster, i) => (
          <group
            key={`cluster-${i}`}
            position={cluster.pos as [number, number, number]}
            rotation={[0, cluster.rot, 0]}
          >
            {/* Flower head base - green calyx area */}
            <mesh position={[0, -0.04, 0]} castShadow>
              <sphereGeometry args={[cluster.size * 0.4, 6, 5]} />
              <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
            </mesh>

            {/* Individual florets - geraniums have many small 5-petaled flowers in a cluster */}
            {Array.from({ length: i === 0 ? 12 : 8 }).map((_, j) => {
              const floretAngle = (j / (i === 0 ? 12 : 8)) * Math.PI * 2;
              const floretRadius = cluster.size * 0.6;
              const floretHeight = (j % 3) * 0.02;
              const fx = Math.cos(floretAngle) * floretRadius;
              const fz = Math.sin(floretAngle) * floretRadius;

              return (
                <group key={`floret-${j}`} position={[fx, floretHeight, fz]}>
                  {/* Individual flower - 5 petals */}
                  {[0, 1, 2, 3, 4].map((petalIdx) => {
                    const petalAngle = (petalIdx / 5) * Math.PI * 2 + floretAngle;
                    const px = Math.cos(petalAngle) * 0.025;
                    const pz = Math.sin(petalAngle) * 0.025;
                    return (
                      <mesh
                        key={`petal-${petalIdx}`}
                        position={[px, 0, pz]}
                        rotation={[0.3, petalAngle, 0]}
                        castShadow
                      >
                        <boxGeometry args={[0.035, 0.008, 0.025]} />
                        <meshStandardMaterial
                          color={j % 2 === 0 ? flowerColor : flowerColor2}
                          roughness={0.6}
                        />
                      </mesh>
                    );
                  })}
                  {/* Flower center */}
                  <mesh>
                    <sphereGeometry args={[0.012, 6, 5]} />
                    <meshStandardMaterial color="#f8e8a0" roughness={0.5} />
                  </mesh>
                </group>
              );
            })}

            {/* Center florets - tighter packed */}
            {[0, 1, 2, 3].map((centerIdx) => {
              const ca = (centerIdx / 4) * Math.PI * 2 + 0.4;
              const cr = cluster.size * 0.25;
              return (
                <mesh
                  key={`center-${centerIdx}`}
                  position={[Math.cos(ca) * cr, 0.02, Math.sin(ca) * cr]}
                  castShadow
                >
                  <sphereGeometry args={[0.025, 6, 5]} />
                  <meshStandardMaterial color={flowerColor} roughness={0.55} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* Unopened buds - small green spheres */}
        <mesh position={[0.18, 0.58, 0.15]} castShadow>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshStandardMaterial color="#5a7a4a" roughness={0.8} />
        </mesh>
        <mesh position={[-0.2, 0.55, -0.12]} castShadow>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshStandardMaterial color="#4a6a3a" roughness={0.8} />
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

  // Foliage clusters for organic citrus tree shape
  const foliageClusters = [
    { pos: [0, 0.85, 0], scale: [1.2, 1.0, 1.1] },
    { pos: [-0.25, 0.92, 0.15], scale: [0.8, 0.7, 0.8] },
    { pos: [0.3, 0.8, -0.2], scale: [0.9, 0.8, 0.85] },
    { pos: [-0.15, 0.75, -0.25], scale: [0.7, 0.65, 0.7] },
    { pos: [0.2, 0.98, 0.25], scale: [0.85, 0.75, 0.8] },
  ];

  // Lemon positions - hanging from branches
  const lemons = [
    { pos: [0.35, 0.72, 0.15], size: 0.08 },
    { pos: [-0.28, 0.68, 0.22], size: 0.075 },
    { pos: [0.15, 0.82, -0.3], size: 0.07 },
    { pos: [-0.2, 0.9, -0.15], size: 0.078 },
    { pos: [0.25, 0.95, 0.3], size: 0.072 },
  ];

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
        {/* REALISTIC TERRACOTTA POT */}
        {/* Pot base */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.48, 0.58, 0.16, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.88} />
        </mesh>
        {/* Pot body */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.48, 0.2, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.88} />
        </mesh>
        {/* Pot rim */}
        <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.47, 0.45, 0.04, 14]} />
          <meshStandardMaterial color={potColor} roughness={0.85} />
        </mesh>
        {/* Decorative band */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.46, 0.46, 0.05, 14]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.92} />
        </mesh>
        {/* Soil */}
        <mesh position={[0, 0.33, 0]} receiveShadow>
          <cylinderGeometry args={[0.43, 0.43, 0.02, 12]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.98} />
        </mesh>

        {/* LEMON TREE TRUNK - gnarled citrus wood */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 0.4, 8]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.94} />
        </mesh>
        {/* Trunk texture knot */}
        <mesh position={[0.06, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.96} />
        </mesh>
        {/* Upper trunk */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.25, 8]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.94} />
        </mesh>

        {/* MAIN BRANCHES - citrus trees have multiple branches */}
        <mesh position={[0.2, 0.78, 0.1]} rotation={[0.3, 0.4, 0.5]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.35, 6]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.95} />
        </mesh>
        <mesh position={[-0.18, 0.8, -0.12]} rotation={[-0.25, -0.5, -0.4]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.32, 6]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.95} />
        </mesh>
        <mesh position={[0.12, 0.82, -0.18]} rotation={[0.2, -0.3, 0.3]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.28, 6]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.95} />
        </mesh>
        <mesh position={[-0.15, 0.75, 0.16]} rotation={[0.35, 0.4, -0.3]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.3, 6]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.95} />
        </mesh>

        {/* FOLIAGE - Multiple irregular clusters for realistic citrus crown */}
        {foliageClusters.map((cluster, j) => (
          <mesh
            key={`foliage-${j}`}
            position={cluster.pos as [number, number, number]}
            scale={cluster.scale as [number, number, number]}
            castShadow
          >
            <sphereGeometry args={[0.5, 8, 7]} />
            <meshStandardMaterial
              color={j % 3 === 0 ? '#4a6b3a' : j % 3 === 1 ? '#5a7b4a' : '#3a5b2a'}
              roughness={0.87}
            />
          </mesh>
        ))}

        {/* Individual leaves for detail - glossy citrus leaves */}
        {[
          [0.4, 0.85, 0.2],
          [-0.35, 0.88, 0.15],
          [0.25, 0.95, -0.25],
          [-0.3, 0.78, -0.2],
          [0.15, 1.0, 0.3],
          [-0.2, 0.72, 0.28],
        ].map(([x, y, z], j) => (
          <mesh key={`leaf-${j}`} position={[x, y, z]} rotation={[Math.random() * 0.5, Math.random() * Math.PI * 2, 0]} castShadow>
            <boxGeometry args={[0.12, 0.01, 0.18]} />
            <meshStandardMaterial color="#5a8a4a" roughness={0.3} metalness={0.1} />
          </mesh>
        ))}

        {/* LEMONS - realistic citrus fruits with stems */}
        {lemons.map((lemon, i) => (
          <group key={`lemon-${i}`} position={lemon.pos as [number, number, number]}>
            {/* Lemon fruit - slightly oval shape */}
            <mesh castShadow>
              <sphereGeometry args={[lemon.size, 8, 8]} />
              <meshStandardMaterial color="#e6c84f" roughness={0.7} />
            </mesh>
            {/* Stem attachment - small brown nub */}
            <mesh position={[0, lemon.size, 0]} castShadow>
              <cylinderGeometry args={[0.01, 0.015, 0.03, 6]} />
              <meshStandardMaterial color="#5a4a2a" roughness={0.9} />
            </mesh>
            {/* Blossom end - tiny dark spot */}
            <mesh position={[0, -lemon.size, 0]}>
              <sphereGeometry args={[0.008, 6, 4]} />
              <meshStandardMaterial color="#3a3a2a" roughness={0.95} />
            </mesh>
          </group>
        ))}

        {/* White blossoms - citrus flowers */}
        {[
          [0.32, 0.92, -0.18],
          [-0.25, 0.85, 0.25],
        ].map(([x, y, z], i) => (
          <group key={`blossom-${i}`} position={[x, y, z]}>
            {/* 5 petals arranged in star */}
            {[0, 1, 2, 3, 4].map((petalIdx) => {
              const angle = (petalIdx / 5) * Math.PI * 2;
              return (
                <mesh
                  key={`petal-${petalIdx}`}
                  position={[Math.cos(angle) * 0.025, 0, Math.sin(angle) * 0.025]}
                  rotation={[0, angle, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.04, 0.01, 0.02]} />
                  <meshStandardMaterial color="#f8f8f0" roughness={0.4} />
                </mesh>
              );
            })}
            {/* Yellow center */}
            <mesh>
              <sphereGeometry args={[0.012, 6, 5]} />
              <meshStandardMaterial color="#e8d060" roughness={0.5} />
            </mesh>
          </group>
        ))}
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
        {/* REALISTIC CERAMIC POT */}
        {/* Pot base */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.65, 0.2, 16]} />
          <meshStandardMaterial color={potColor} roughness={0.85} />
        </mesh>
        {/* Pot body (tapered) */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.55, 0.3, 16]} />
          <meshStandardMaterial color={potColor} roughness={0.85} />
        </mesh>
        {/* Pot rim */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.5, 0.04, 16]} />
          <meshStandardMaterial color={potColor} roughness={0.8} />
        </mesh>
        {/* Decorative band */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.51, 0.51, 0.06, 16]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Soil */}
        <mesh position={[0, 0.44, 0]} receiveShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.02, 12]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.98} />
        </mesh>

        {/* DATE PALM TRUNK with realistic segments */}
        {/* Base trunk segment */}
        <mesh position={[0, 0.58, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.15, 10]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
        </mesh>
        {/* Trunk segment ring (darker) */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 10]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.98} />
        </mesh>
        {/* Mid trunk segment */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.10, 0.11, 0.2, 10]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
        </mesh>
        {/* Trunk segment ring */}
        <mesh position={[0, 0.88, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.03, 10]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.98} />
        </mesh>
        {/* Upper trunk segment */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.10, 0.18, 10]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
        </mesh>
        {/* Crown base (where fronds emerge) */}
        <mesh position={[0, 1.12, 0]} castShadow>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color="#5a6a3a" roughness={0.9} />
        </mesh>

        {/* REALISTIC PALM FRONDS - 6-8 fronds radiating out */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * Math.PI * 2 + (style * 0.3); // Vary by pot style
          const elevation = -0.2 - (i % 3) * 0.15; // Stagger heights
          const curvature = 0.7 + (i % 2) * 0.2; // Vary droop

          return (
            <group key={`frond-${i}`} position={[0, 1.15, 0]} rotation={[0, angle, 0]}>
              {/* Frond stem (rachis) - 4x longer */}
              <mesh position={[0, 0, 1.0]} rotation={[curvature, 0, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.03, 2.0, 6]} />
                <meshStandardMaterial color="#6a7a4a" roughness={0.9} />
              </mesh>

              {/* Leaflets along the frond stem - 4x larger */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((j) => {
                const leafOffset = (j / 11) * 1.8; // Distribute along longer stem
                const leafAngle = (j % 2 === 0 ? 0.5 : -0.5); // Alternate sides
                const leafSize = 0.48 - j * 0.028; // 4x larger, smaller toward tip

                return (
                  <group
                    key={`leaf-${j}`}
                    position={[0, Math.sin(curvature) * leafOffset * 0.3, leafOffset]}
                    rotation={[curvature + j * 0.05, 0, leafAngle]}
                  >
                    {/* Individual leaflet */}
                    <mesh castShadow>
                      <boxGeometry args={[leafSize, 0.01, 0.24]} />
                      <meshStandardMaterial
                        color={j < 4 ? '#5a7a3a' : j < 8 ? '#4a6a2a' : '#3a5a2a'}
                        roughness={0.85}
                        side={2} // DoubleSide
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* Date clusters (small brown spheres) */}
        {[0, 1, 2].map((clusterIdx) => {
          const clusterAngle = (clusterIdx / 3) * Math.PI * 2 + style;
          const clusterX = Math.cos(clusterAngle) * 0.08;
          const clusterZ = Math.sin(clusterAngle) * 0.08;

          return (
            <group key={`dates-${clusterIdx}`} position={[clusterX, 1.0, clusterZ]}>
              {[0, 1, 2, 3].map((dateIdx) => (
                <mesh
                  key={`date-${dateIdx}`}
                  position={[
                    (Math.random() - 0.5) * 0.06,
                    -dateIdx * 0.04,
                    (Math.random() - 0.5) * 0.06
                  ]}
                  castShadow
                >
                  <sphereGeometry args={[0.018, 6, 4]} />
                  <meshStandardMaterial color="#6a4a2a" roughness={0.8} />
                </mesh>
              ))}
            </group>
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
