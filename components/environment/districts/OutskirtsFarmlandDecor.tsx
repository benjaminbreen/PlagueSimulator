/**
 * Farmland Outskirts Decorations (Ghouta)
 * Irrigated fields, orchards, paths, rural houses, and farm clutter.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import { HoverableGroup } from '../shared/HoverSystem';
import { BedouinTent } from '../decorations/BedouinTent';

type FieldDef = {
  pos: [number, number, number];
  size: [number, number];
  rotation: number;
  color: string;
  furrowColor: string;
  cropType: number;
  cropPositions: Array<{ x: number; z: number; scale: number }>;
};

type FarmlandLayout = {
  fields: FieldDef[];
  canals: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }>;
  paths: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }>;
  houses: Array<[number, number, number, number]>;
  haystacks: Array<[number, number, number]>;
  boulders: Array<[number, number, number]>;
  orchardRows: Array<[number, number, number]>;
  fencePosts: Array<[number, number, number]>;
  scarecrow: [number, number, number];
  river: { pos: [number, number, number]; size: [number, number]; rotation: number } | null;
  waterwheel: { pos: [number, number, number]; rotation: number; scale: number } | null;
  tent: { pos: [number, number, number]; seed: number } | null;
};

export const buildFarmlandLayout = (mapX: number, mapY: number): FarmlandLayout => {
  const seed = mapX * 1000 + mapY * 100 + 911;
  let i = 0;
  const rand = () => seededRandom(seed + i++ * 37);
  const jitter = (amount: number) => (rand() - 0.5) * amount;

  // Spread fields across the whole map - not just center
  const fields: FieldDef[] = [
    // Northwest field
    {
      pos: [-18 + jitter(1.2), 0.01, -16 + jitter(1.0)],
      size: [14, 9],
      rotation: jitter(0.06),
      color: '#6f8f48',
      furrowColor: '#577a3b',
      cropType: 0,
      cropPositions: []
    },
    // Northeast field
    {
      pos: [16 + jitter(1.0), 0.01, -14 + jitter(1.0)],
      size: [12, 10],
      rotation: jitter(0.06),
      color: '#5f7f3f',
      furrowColor: '#4f6f35',
      cropType: 0,
      cropPositions: []
    },
    // Southwest field
    {
      pos: [-16 + jitter(1.0), 0.01, 14 + jitter(1.2)],
      size: [13, 10],
      rotation: jitter(0.06),
      color: '#6a8b46',
      furrowColor: '#587b3d',
      cropType: 0,
      cropPositions: []
    },
    // Southeast field
    {
      pos: [14 + jitter(1.0), 0.01, 16 + jitter(1.0)],
      size: [11, 9],
      rotation: jitter(0.06),
      color: '#5a7a3a',
      furrowColor: '#4a6a30',
      cropType: 0,
      cropPositions: []
    },
    // Small central field
    {
      pos: [jitter(2.0), 0.01, jitter(2.0)],
      size: [8, 7],
      rotation: jitter(0.08),
      color: '#658a42',
      furrowColor: '#557a38',
      cropType: 0,
      cropPositions: []
    }
  ];

  // Main irrigation canal - one long channel cutting diagonally across the entire farmland
  // This represents a branch of the Barada river system that fed the Ghouta
  // Map is ~52 units across, diagonal needs ~75 units to span corner to corner
  const mainCanalAngle = 0.2 + jitter(0.08); // Slight diagonal
  const canals: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }> = [
    // Main canal running diagonally across the whole map - 80 units ensures edge-to-edge
    { pos: [0, 0.02, 0], size: [80, 2.2], rotation: mainCanalAngle },
    // Secondary feeder canal branching off (only sometimes) - also long enough to reach edges
    ...(rand() > 0.5 ? [{
      pos: [0, 0.02, 0] as [number, number, number],
      size: [75, 1.6] as [number, number],
      rotation: -mainCanalAngle + jitter(0.05) // Opposite diagonal direction
    }] : [])
  ];

  // Helper function to check if a position is too close to any canal
  // Canals are rotated lines through origin - distance to rotated line is |x*sin(θ) - z*cos(θ)|
  const CANAL_CLEARANCE = 2.0; // Clearance distance from canals for crops/trees
  const isNearCanal = (x: number, z: number, clearance: number): boolean => {
    for (const canal of canals) {
      const theta = canal.rotation;
      const halfWidth = canal.size[1] / 2;
      // Distance from point to rotated line through origin
      const distToLine = Math.abs(x * Math.sin(theta) - z * Math.cos(theta));
      if (distToLine < halfWidth + clearance) {
        return true;
      }
    }
    return false;
  };

  // Dirt paths crossing the farmland - simple straight lines, flat on ground
  // Note: size is [width, height] where width is along local X, height along local Y
  // After -PI/2 X rotation, local Y becomes world Z, so [width, depth] in world space
  const paths: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }> = [
    // Main east-west path (long in X direction)
    { pos: [0 + jitter(0.4), 0.012, 8 + jitter(0.4)], size: [52, 2.2], rotation: jitter(0.03) },
    // North-south path - swap dimensions to make it long in Z direction, no Y rotation needed
    { pos: [-10 + jitter(0.4), 0.012, 0 + jitter(0.4)], size: [1.8, 48], rotation: jitter(0.03) }
  ];

  // Houses pushed to far edges
  const houses: Array<[number, number, number, number]> = [
    [-24 + jitter(1.2), 0, -22 + jitter(1.0), 1],
    [24 + jitter(1.0), 0, 22 + jitter(1.0), -1],
    [22 + jitter(0.8), 0, -20 + jitter(0.8), 1]
  ];

  // Haystacks spread across different zones - filter out those on canals
  const haystackCandidates: Array<[number, number, number]> = [
    [-20 + jitter(1.0), 0, -6 + jitter(1.0)],
    [18 + jitter(1.0), 0, 8 + jitter(1.0)],
    [-14 + jitter(1.0), 0, 18 + jitter(1.0)],
    [8 + jitter(1.0), 0, -18 + jitter(1.0)],
  ];
  const haystacks = haystackCandidates.filter(([x, _, z]) => !isNearCanal(x, z, CANAL_CLEARANCE));

  // Boulders distributed across edges - filter out those on canals
  const boulderCandidates: Array<[number, number, number]> = Array.from({ length: 8 }).map((_, idx) => {
    const angle = (idx / 8) * Math.PI * 2 + rand() * 0.5;
    const distance = 16 + rand() * 8;
    return [
      Math.cos(angle) * distance + jitter(2.0),
      0,
      Math.sin(angle) * distance + jitter(2.0)
    ];
  });
  const boulders = boulderCandidates.filter(([x, _, z]) => !isNearCanal(x, z, CANAL_CLEARANCE));

  const cropTypes = 5;
  fields.forEach((field, fieldIdx) => {
    const cropType = Math.floor(rand() * cropTypes);
    const spacing = 1.1 + rand() * 0.3;
    const rows = Math.max(6, Math.floor(field.size[1] / spacing));
    const cols = Math.max(10, Math.floor(field.size[0] / spacing));
    const positions: Array<{ x: number; z: number; scale: number }> = [];

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (positions.length > 140) break;
        if (rand() > 0.92) continue;
        const localX = -field.size[0] / 2 + spacing * (c + 0.5) + jitter(spacing * 0.4);
        const localZ = -field.size[1] / 2 + spacing * (r + 0.5) + jitter(spacing * 0.4);
        // Transform to world coordinates (accounting for field position and rotation)
        const cos = Math.cos(field.rotation);
        const sin = Math.sin(field.rotation);
        const worldX = field.pos[0] + localX * cos - localZ * sin;
        const worldZ = field.pos[2] + localX * sin + localZ * cos;
        // Skip if too close to a canal
        if (isNearCanal(worldX, worldZ, CANAL_CLEARANCE)) continue;
        positions.push({
          x: localX,
          z: localZ,
          scale: 0.85 + rand() * 0.35
        });
      }
    }

    fields[fieldIdx] = {
      ...field,
      cropType,
      cropPositions: positions
    };
  });

  // River - runs along one edge of the map, spanning the full width
  const hasRiver = rand() < 0.5;
  const riverEdge = rand() > 0.5 ? 22 : -22; // Position along north or south edge
  const river = hasRiver ? {
    pos: [0, 0.012, riverEdge] as [number, number, number],
    size: [90, 5.5] as [number, number], // 90 units ensures full edge-to-edge coverage
    rotation: jitter(0.03), // Very slight angle for naturalism
  } : null;
  const waterwheel = hasRiver ? {
    pos: [
      (rand() - 0.5) * 32,
      0,
      river!.pos[2] + (riverEdge > 0 ? -1.8 : 1.8) + jitter(0.4)
    ] as [number, number, number],
    rotation: rand() > 0.5 ? Math.PI / 2 : -Math.PI / 2,
    scale: 1.25 + rand() * 0.6
  } : null;

  // Orchards distributed in multiple groves across the map
  // Generate candidate positions first, then filter out those near canals
  const orchardCandidates: Array<[number, number, number]> = [];

  // Northwest orchard grove
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      orchardCandidates.push([
        -20 + col * 4.5 + jitter(0.8),
        0,
        -4 + row * 4.5 + jitter(0.8)
      ]);
    }
  }

  // Northeast orchard grove
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      orchardCandidates.push([
        10 + col * 4.5 + jitter(0.8),
        0,
        -18 + row * 4.5 + jitter(0.8)
      ]);
    }
  }

  // Southwest orchard grove
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      orchardCandidates.push([
        -8 + col * 5.0 + jitter(0.8),
        0,
        18 + row * 4.5 + jitter(0.8)
      ]);
    }
  }

  // Southeast scattered trees
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      orchardCandidates.push([
        16 + col * 5.0 + jitter(1.0),
        0,
        4 + row * 5.0 + jitter(1.0)
      ]);
    }
  }

  // Filter out orchard trees that would be placed on canals
  const orchardRows = orchardCandidates.filter(
    ([x, _, z]) => !isNearCanal(x, z, CANAL_CLEARANCE + 1.0) // Extra clearance for trees
  );

  // Fence posts around field perimeters - spread out
  const fencePosts: Array<[number, number, number]> = [];
  // Northern fence line
  for (let idx = 0; idx < 6; idx += 1) {
    fencePosts.push([-22 + idx * 8.5 + jitter(0.5), 0, -22 + jitter(0.4)]);
  }
  // Southern fence line
  for (let idx = 0; idx < 6; idx += 1) {
    fencePosts.push([-22 + idx * 8.5 + jitter(0.5), 0, 22 + jitter(0.4)]);
  }
  // Western fence line
  for (let idx = 0; idx < 4; idx += 1) {
    fencePosts.push([-22 + jitter(0.4), 0, -14 + idx * 10 + jitter(0.5)]);
  }
  // Eastern fence line
  for (let idx = 0; idx < 4; idx += 1) {
    fencePosts.push([22 + jitter(0.4), 0, -14 + idx * 10 + jitter(0.5)]);
  }

  // Bedouin tent spawning (0-1 tent in outer perimeter only)
  const hasTent = rand() > 0.5;
  const tent = hasTent ? (() => {
    const angle = rand() * Math.PI * 2;
    const distance = 18 + rand() * 8; // Outer perimeter (18-26 units from center)
    return {
      pos: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance] as [number, number, number],
      seed: seed + 888
    };
  })() : null;

  return {
    fields,
    canals,
    paths,
    houses,
    haystacks,
    boulders,
    orchardRows,
    fencePosts,
    scarecrow: [8 + jitter(0.8), 0, 6 + jitter(0.8)] as [number, number, number],
    river,
    waterwheel,
    tent
  };
};

export const getFarmlandLandmarks = (mapX: number, mapY: number): Array<{ x: number; z: number; label: string }> => {
  const layout = buildFarmlandLayout(mapX, mapY);
  const landmarks: Array<{ x: number; z: number; label: string }> = [];

  layout.houses.forEach((house, idx) => {
    landmarks.push({ x: house[0], z: house[2], label: idx === 0 ? 'Farmhouse' : 'Farm Dwelling' });
  });

  layout.fields.forEach((field, idx) => {
    landmarks.push({ x: field.pos[0], z: field.pos[2], label: idx === 0 ? 'Fields' : 'Crop Field' });
  });

  if (layout.waterwheel) {
    landmarks.push({ x: layout.waterwheel.pos[0], z: layout.waterwheel.pos[2], label: 'Waterwheel' });
  }

  if (layout.river) {
    landmarks.push({ x: layout.river.pos[0], z: layout.river.pos[2], label: 'Irrigation Canal' });
  }

  const orchardCenter = layout.orchardRows.reduce(
    (acc, pos) => ({ x: acc.x + pos[0], z: acc.z + pos[2] }),
    { x: 0, z: 0 }
  );
  if (layout.orchardRows.length > 0) {
    landmarks.push({
      x: orchardCenter.x / layout.orchardRows.length,
      z: orchardCenter.z / layout.orchardRows.length,
      label: 'Orchard'
    });
  }

  if (layout.haystacks.length > 0) {
    const hayCenter = layout.haystacks.reduce(
      (acc, pos) => ({ x: acc.x + pos[0], z: acc.z + pos[2] }),
      { x: 0, z: 0 }
    );
    landmarks.push({
      x: hayCenter.x / layout.haystacks.length,
      z: hayCenter.z / layout.haystacks.length,
      label: 'Haystack'
    });
  }

  landmarks.push({ x: layout.scarecrow[0], z: layout.scarecrow[2], label: 'Scarecrow' });

  return landmarks;
};

export const OutskirtsFarmlandDecor: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  // Include all Ghouta districts - the famous irrigated orchards surrounding Damascus
  // RABWE is the river gorge with mills and orchards; NORTH_GHOUTA is northern irrigated farmland
  if (district !== 'OUTSKIRTS_FARMLAND' && district !== 'EAST_GHOUTA' && district !== 'SOUTH_GHOUTA' && district !== 'NORTH_GHOUTA' && district !== 'RABWE') return null;

  const layout = useMemo(() => buildFarmlandLayout(mapX, mapY), [mapX, mapY]);
  const seed = mapX * 1000 + mapY * 100 + 911; // Same seed as buildFarmlandLayout
  const waterwheelRef = useRef<THREE.Group>(null);
  const waterFlowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (waterwheelRef.current) {
      // Spin around the wheel axle (local Y axis)
      waterwheelRef.current.rotation.y += delta * 0.9;
    }
    if (waterFlowRef.current && layout.river) {
      const travel = layout.river.size[0] * 0.5;
      const speed = 1.6;
      waterFlowRef.current.position.x = ((waterFlowRef.current.position.x + delta * speed) % travel) - travel / 2;
    }
  });

  return (
    <group>
      {/* Paths */}
      {layout.paths.map((path, idx) => (
        <mesh key={`path-${idx}`} position={path.pos} rotation={[-Math.PI / 2, path.rotation, 0]} receiveShadow>
          <planeGeometry args={path.size} />
          <meshStandardMaterial color="#9a7b57" roughness={0.98} />
        </mesh>
      ))}

      {/* Fields + furrows */}
      {layout.fields.map((field, idx) => {
        const rowCount = Math.max(6, Math.floor(field.size[1] / 1.4));
        const rowSpacing = field.size[1] / (rowCount + 1);
        const cropPalette = [
          { stem: '#c6b16a', head: '#d7c27a', height: 0.6, headScale: 0.18 }, // wheat
          { stem: '#c2ad63', head: '#cdb66f', height: 0.55, headScale: 0.16 }, // barley
          { stem: '#7c8f4a', head: '#8fa455', height: 0.35, headScale: 0.14 }, // lentils
          { stem: '#7a8a45', head: '#9db163', height: 0.4, headScale: 0.16 },  // chickpeas
          { stem: '#7f8d6a', head: '#9aa67b', height: 0.5, headScale: 0.15 }   // flax
        ];
        const crop = cropPalette[field.cropType];
        return (
          <HoverableGroup
            key={`field-${idx}`}
            position={field.pos}
            boxSize={[field.size[0], 0.6, field.size[1]]}
            boxOffset={[0, 0.1, 0]}
            labelTitle="Crop Field"
            labelLines={['Irrigated furrows', 'Local staples', 'Seasonal harvest']}
            labelOffset={[0, 1.1, 0]}
          >
            <group rotation={[0, field.rotation, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={field.size} />
                <meshStandardMaterial color={field.color} roughness={0.95} />
              </mesh>
              {Array.from({ length: rowCount }).map((_, r) => (
                <mesh
                  key={`furrow-${idx}-${r}`}
                  position={[0, 0.03, -field.size[1] / 2 + rowSpacing * (r + 1)]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[field.size[0] * 0.92, 0.05, 0.22]} />
                  <meshStandardMaterial color={field.furrowColor} roughness={0.95} />
                </mesh>
              ))}
              {field.cropPositions.map((pos, cropIdx) => (
                <group key={`crop-${idx}-${cropIdx}`} position={[pos.x, 0.02, pos.z]} scale={[pos.scale, pos.scale, pos.scale]}>
                  <mesh position={[0, crop.height / 2, 0]} castShadow>
                    <cylinderGeometry args={[0.03, 0.04, crop.height, 5]} />
                    <meshStandardMaterial color={crop.stem} roughness={0.9} />
                  </mesh>
                  <mesh position={[0, crop.height + 0.05, 0]} castShadow>
                    <sphereGeometry args={[crop.headScale, 6, 5]} />
                    <meshStandardMaterial color={crop.head} roughness={0.85} />
                  </mesh>
                </group>
              ))}
            </group>
          </HoverableGroup>
        );
      })}

      {/* River - naturalistic water like canal district but with irregular banks */}
      {layout.river && (
        <HoverableGroup
          position={layout.river.pos}
          boxSize={[layout.river.size[0], 0.6, layout.river.size[1] + 0.6]}
          boxOffset={[0, 0.1, 0]}
          labelTitle="Barada River Branch"
          labelLines={['Fresh water from the mountains', 'Lifeblood of the Ghouta']}
          labelOffset={[0, 1.2, 0]}
        >
          <group rotation={[0, layout.river.rotation, 0]}>
            {/* Water depth layer (darker underneath) - like canal district */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[layout.river.size[0], layout.river.size[1] - 0.4]} />
              <meshStandardMaterial color="#1a3a4a" roughness={0.9} transparent opacity={0.7} />
            </mesh>
            {/* Main water surface - reflective like canal water */}
            <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[layout.river.size[0], layout.river.size[1] - 0.6]} />
              <meshStandardMaterial
                color="#3a6a7a"
                transparent
                opacity={0.88}
                roughness={0.12}
                metalness={0.28}
                envMapIntensity={0.75}
              />
            </mesh>
            {/* Animated flow highlight */}
            <mesh ref={waterFlowRef} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[layout.river.size[0] * 0.5, layout.river.size[1] * 0.4]} />
              <meshStandardMaterial color="#4a7a8a" roughness={0.08} metalness={0.35} transparent opacity={0.35} depthWrite={false} />
            </mesh>
            {/* Irregular naturalistic banks - earth and reeds, not stone */}
            {Array.from({ length: 12 }).map((_, i) => {
              const xPos = -layout.river.size[0] / 2 + (i / 11) * layout.river.size[0];
              const jitterZ = (seededRandom(seed + i * 31) - 0.5) * 0.8;
              const bankWidth = 0.4 + seededRandom(seed + i * 37) * 0.5;
              return (
                <React.Fragment key={`bank-${i}`}>
                  {/* Top bank - muddy earth with vegetation */}
                  <mesh position={[xPos, 0.06, layout.river.size[1] / 2 + 0.3 + jitterZ]} castShadow>
                    <boxGeometry args={[layout.river.size[0] / 10, 0.15, bankWidth]} />
                    <meshStandardMaterial color="#5a6b45" roughness={0.95} />
                  </mesh>
                  {/* Bottom bank */}
                  <mesh position={[xPos, 0.06, -layout.river.size[1] / 2 - 0.3 - jitterZ]} castShadow>
                    <boxGeometry args={[layout.river.size[0] / 10, 0.15, bankWidth]} />
                    <meshStandardMaterial color="#5a6b45" roughness={0.95} />
                  </mesh>
                </React.Fragment>
              );
            })}
            {/* Reed clumps along banks */}
            {Array.from({ length: 6 }).map((_, i) => {
              const xPos = -layout.river.size[0] / 3 + (i / 5) * (layout.river.size[0] * 0.66);
              const side = seededRandom(seed + i * 43) > 0.5 ? 1 : -1;
              const zPos = side * (layout.river.size[1] / 2 + 0.1);
              return (
                <group key={`reeds-${i}`} position={[xPos, 0, zPos]}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <mesh key={j} position={[(j - 1.5) * 0.15, 0.4, 0]} rotation={[0.1 * (j - 1.5), 0, 0.05 * (j - 1.5)]}>
                      <cylinderGeometry args={[0.02, 0.03, 0.8, 4]} />
                      <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        </HoverableGroup>
      )}

      {/* Waterwheel */}
      {layout.waterwheel && (
        <HoverableGroup
          position={layout.waterwheel.pos}
          boxSize={[4.4, 4.4, 2.0]}
          boxOffset={[0, 1.6, 0]}
          labelTitle="Waterwheel"
          labelLines={['Lifted buckets', 'Irrigation work']}
          labelOffset={[0, 3.8, 0]}
        >
          <group
            ref={waterwheelRef}
            position={[0, 0, 0]}
            rotation={[0, layout.waterwheel.rotation, 0]}
            scale={[layout.waterwheel.scale, layout.waterwheel.scale, layout.waterwheel.scale]}
          >
            <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[1.1, 0.08, 8, 16]} />
              <meshStandardMaterial color="#6a4f32" roughness={0.85} />
            </mesh>
            {Array.from({ length: 10 }).map((_, idx) => (
              <mesh
                key={`wheel-spoke-${idx}`}
                position={[0, 1.2, 0]}
                rotation={[0, (idx / 10) * Math.PI * 2, 0]}
                castShadow
              >
                <boxGeometry args={[0.08, 0.08, 2.1]} />
                <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
              </mesh>
            ))}
            {Array.from({ length: 8 }).map((_, idx) => (
              <mesh
                key={`wheel-paddle-${idx}`}
                position={[0, 1.2, 0]}
                rotation={[0, (idx / 8) * Math.PI * 2, 0]}
                castShadow
              >
                <boxGeometry args={[0.15, 0.6, 0.5]} />
                <meshStandardMaterial color="#6a4f32" roughness={0.85} />
              </mesh>
            ))}
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 2.6, 8]} />
              <meshStandardMaterial color="#4a3526" roughness={0.9} />
            </mesh>
          </group>
        </HoverableGroup>
      )}

      {/* Irrigation canals - improved water quality with earthen banks */}
      {layout.canals.map((canal, idx) => (
        <HoverableGroup
          key={`canal-${idx}`}
          position={canal.pos}
          boxSize={[canal.size[0], 0.6, canal.size[1] + 0.8]}
          boxOffset={[0, 0.1, 0]}
          labelTitle="Irrigation Ditch"
          labelLines={['Fed by Barada', 'Earthen banks']}
          labelOffset={[0, 1.2, 0]}
        >
          <group rotation={[0, canal.rotation, 0]}>
            {/* Water depth layer */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[canal.size[0], canal.size[1] - 0.2]} />
              <meshStandardMaterial color="#1a3a4a" roughness={0.9} transparent opacity={0.6} />
            </mesh>
            {/* Main water surface - reflective */}
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[canal.size[0], canal.size[1] - 0.3]} />
              <meshStandardMaterial
                color="#3a6a7a"
                transparent
                opacity={0.85}
                roughness={0.15}
                metalness={0.25}
                envMapIntensity={0.6}
              />
            </mesh>
            {/* Irregular earthen banks */}
            {Array.from({ length: 6 }).map((_, i) => {
              const xPos = -canal.size[0] / 2 + (i / 5) * canal.size[0];
              const jitterZ = (seededRandom(seed + idx * 100 + i * 31) - 0.5) * 0.3;
              return (
                <React.Fragment key={`canal-bank-${i}`}>
                  <mesh position={[xPos, 0.04, canal.size[1] / 2 + 0.12 + jitterZ]} castShadow>
                    <boxGeometry args={[canal.size[0] / 5, 0.1, 0.25 + seededRandom(seed + i * 41) * 0.15]} />
                    <meshStandardMaterial color="#5a6b45" roughness={0.95} />
                  </mesh>
                  <mesh position={[xPos, 0.04, -canal.size[1] / 2 - 0.12 - jitterZ]} castShadow>
                    <boxGeometry args={[canal.size[0] / 5, 0.1, 0.25 + seededRandom(seed + i * 47) * 0.15]} />
                    <meshStandardMaterial color="#5a6b45" roughness={0.95} />
                  </mesh>
                </React.Fragment>
              );
            })}
          </group>
        </HoverableGroup>
      ))}

      {/* Farmhouses */}
      {layout.houses.map((pos, idx) => (
        <HoverableGroup
          key={`farmhouse-${idx}`}
          position={[pos[0], pos[1], pos[2]]}
          boxSize={[4.6, 2.8, 3.8]}
          boxOffset={[0, 1.2, 0]}
          labelTitle="Private Residence"
          labelLines={['Farm family dwelling', 'Mudbrick and timber']}
          labelOffset={[0, 3.2, 0]}
        >
          <group rotation={[0, pos[3] * 0.2, 0]}>
            <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[4.2, 2.4, 3.4]} />
              <meshStandardMaterial color="#e6ddcf" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.45, 0]} castShadow>
              <boxGeometry args={[4.6, 0.4, 3.8]} />
              <meshStandardMaterial color="#7a644a" roughness={0.95} />
            </mesh>
            <mesh position={[1.1, 0.4, 1.72]} castShadow>
              <boxGeometry args={[0.9, 1.4, 0.2]} />
              <meshStandardMaterial color="#5a4635" roughness={0.9} />
            </mesh>
            <mesh position={[-1.6, 1.4, -1.8]} castShadow>
              <boxGeometry args={[0.6, 0.5, 0.6]} />
              <meshStandardMaterial color="#6b5743" roughness={0.9} />
            </mesh>
            <mesh position={[-1.6, 1.8, -1.8]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, 0.6, 6]} />
              <meshStandardMaterial color="#4f3d30" roughness={0.95} />
            </mesh>
          </group>
        </HoverableGroup>
      ))}

      {/* Orchards */}
      <HoverableGroup
        position={[0, 0, 2]}
        boxSize={[28, 4, 18]}
        boxOffset={[0, 2, 0]}
        labelTitle="Orchard Grove"
        labelLines={['Fruit trees', 'Shade and scent']}
        labelOffset={[0, 4.6, 0]}
      >
        <group>
          {layout.orchardRows.map((pos, idx) => {
            const canopyScale = 1.1 + (idx % 3) * 0.1;
            return (
              <group key={`orchard-tree-${idx}`} position={pos}>
                <mesh position={[0, 1.6, 0]} castShadow>
                  <cylinderGeometry args={[0.18, 0.26, 3.2, 6]} />
                  <meshStandardMaterial color="#7a5b3a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 3.0, 0]} castShadow>
                  <sphereGeometry args={[1.2 * canopyScale, 8, 6]} />
                  <meshStandardMaterial color="#4c7a3c" roughness={0.85} />
                </mesh>
                <mesh position={[0.4, 2.6, 0.3]} castShadow>
                  <sphereGeometry args={[0.35, 6, 5]} />
                  <meshStandardMaterial color="#4b7034" roughness={0.85} />
                </mesh>
              </group>
            );
          })}
        </group>
      </HoverableGroup>

      {/* Haystacks */}
      {layout.haystacks.map((pos, idx) => (
        <HoverableGroup
          key={`hay-${idx}`}
          position={pos}
          boxSize={[2.4, 1.8, 2.4]}
          boxOffset={[0, 0.9, 0]}
          labelTitle="Haystack"
          labelLines={['Dried fodder', 'Seasonal stores']}
          labelOffset={[0, 2.0, 0]}
        >
          <group>
            <mesh position={[0, 0.7, 0]} castShadow>
              <coneGeometry args={[1.2, 1.6, 8]} />
              <meshStandardMaterial color="#c2a05a" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[1.1, 1.3, 0.3, 8]} />
              <meshStandardMaterial color="#b1904c" roughness={0.95} />
            </mesh>
          </group>
        </HoverableGroup>
      ))}

      {/* Scarecrow */}
      <HoverableGroup
        position={layout.scarecrow}
        boxSize={[1.6, 2.8, 1.2]}
        boxOffset={[0, 1.3, 0]}
        labelTitle="Scarecrow"
        labelLines={['Field guardian', 'Rag and reed']}
        labelOffset={[0, 2.8, 0]}
      >
        <group>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.4, 6]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[1.4, 0.08, 0.08]} />
            <meshStandardMaterial color="#6a4a2f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <sphereGeometry args={[0.18, 6, 5]} />
            <meshStandardMaterial color="#c5b090" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.7, 0]} castShadow>
            <boxGeometry args={[0.7, 0.6, 0.12]} />
            <meshStandardMaterial color="#6f5a4a" roughness={0.95} />
          </mesh>
        </group>
      </HoverableGroup>

      {/* Fence posts */}
      {layout.fencePosts.map((pos, idx) => (
        <group key={`fence-${idx}`} position={pos}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.18, 0.06, 0.9]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Scatter stones */}
      {layout.boulders.map((pos, idx) => (
        <mesh key={`farm-boulder-${idx}`} position={pos} castShadow>
          <sphereGeometry args={[0.5 + (idx % 3) * 0.15, 7, 6]} />
          <meshStandardMaterial color="#6b6b5a" roughness={0.95} />
        </mesh>
      ))}

      {/* Bedouin Tent */}
      {layout.tent && <BedouinTent position={layout.tent.pos} seed={layout.tent.seed} timeOfDay={timeOfDay} />}
    </group>
  );
};
