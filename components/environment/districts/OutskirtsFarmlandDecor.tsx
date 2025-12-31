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

  const fields: FieldDef[] = [
    {
      pos: [-18 + jitter(1.2), 0.01, -8 + jitter(1.0)],
      size: [19, 10],
      rotation: jitter(0.06),
      color: '#6f8f48',
      furrowColor: '#577a3b',
      cropType: 0,
      cropPositions: []
    },
    {
      pos: [12 + jitter(1.0), 0.01, -12 + jitter(1.0)],
      size: [17, 8],
      rotation: jitter(0.06),
      color: '#5f7f3f',
      furrowColor: '#4f6f35',
      cropType: 0,
      cropPositions: []
    },
    {
      pos: [-4 + jitter(1.0), 0.01, 16 + jitter(1.2)],
      size: [15, 11],
      rotation: jitter(0.06),
      color: '#6a8b46',
      furrowColor: '#587b3d',
      cropType: 0,
      cropPositions: []
    }
  ];

  const canals: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }> = [
    { pos: [-8 + jitter(0.8), 0.02, -8 + jitter(0.6)], size: [20, 1.6], rotation: 0.02 + jitter(0.04) },
    { pos: [12 + jitter(0.6), 0.02, -12 + jitter(0.6)], size: [17, 1.4], rotation: -0.02 + jitter(0.04) },
    { pos: [-4 + jitter(0.6), 0.02, 15 + jitter(0.8)], size: [15, 1.6], rotation: 0.01 + jitter(0.04) }
  ];

  const paths: Array<{ pos: [number, number, number]; size: [number, number]; rotation: number }> = [
    { pos: [2 + jitter(0.4), 0.012, -2 + jitter(0.4)], size: [36, 2.2], rotation: 0.02 + jitter(0.04) },
    { pos: [-10 + jitter(0.4), 0.012, 10 + jitter(0.4)], size: [26, 1.8], rotation: -0.02 + jitter(0.04) }
  ];

  const houses: Array<[number, number, number, number]> = [
    [-24 + jitter(1.2), 0, 18 + jitter(1.0), 1],
    [24 + jitter(1.0), 0, 20 + jitter(1.0), -1],
    [20 + jitter(0.8), 0, -24 + jitter(0.8), 1]
  ];

  const haystacks: Array<[number, number, number]> = [
    [-8 + jitter(0.8), 0, 3 + jitter(0.8)],
    [14 + jitter(0.8), 0, -4 + jitter(0.8)],
    [2 + jitter(0.8), 0, 18 + jitter(0.8)]
  ];

  const boulders: Array<[number, number, number]> = Array.from({ length: 6 }).map(() => [
    -22 + rand() * 44,
    0,
    -22 + rand() * 44
  ]);

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
        positions.push({
          x: -field.size[0] / 2 + spacing * (c + 0.5) + jitter(spacing * 0.4),
          z: -field.size[1] / 2 + spacing * (r + 0.5) + jitter(spacing * 0.4),
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

  const hasRiver = rand() < 0.5;
  const riverEdge = rand() > 0.5 ? 26 : -26;
  const river = hasRiver ? {
    pos: [0 + jitter(2.0), 0.012, riverEdge + jitter(0.8)] as [number, number, number],
    size: [84, 6.2] as [number, number],
    rotation: jitter(0.04),
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

  const orchardRows: Array<[number, number, number]> = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      orchardRows.push([
        -6 + col * 4.2 + jitter(0.5),
        0,
        -2 + row * 4.2 + jitter(0.5)
      ]);
    }
  }

  const fencePosts: Array<[number, number, number]> = [];
  for (let idx = 0; idx < 7; idx += 1) {
    fencePosts.push([-24 + idx * 4.2, 0, -14 + jitter(0.4)]);
    fencePosts.push([22 - idx * 4.2, 0, 20 + jitter(0.4)]);
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
  if (district !== 'OUTSKIRTS_FARMLAND') return null;

  const layout = useMemo(() => buildFarmlandLayout(mapX, mapY), [mapX, mapY]);
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

      {/* River */}
      {layout.river && (
        <HoverableGroup
          position={layout.river.pos}
          boxSize={[layout.river.size[0], 0.6, layout.river.size[1] + 0.6]}
          boxOffset={[0, 0.1, 0]}
          labelTitle="Irrigation Channel"
          labelLines={['Fresh water', 'Artery of the fields']}
          labelOffset={[0, 1.2, 0]}
        >
          <group rotation={[0, layout.river.rotation, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={layout.river.size} />
              <meshStandardMaterial color="#2f4f5a" roughness={0.6} metalness={0.1} transparent opacity={0.75} />
            </mesh>
            <mesh ref={waterFlowRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[layout.river.size[0] * 0.6, layout.river.size[1] * 0.55]} />
              <meshStandardMaterial color="#3f6a78" roughness={0.35} metalness={0.2} transparent opacity={0.45} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.03, layout.river.size[1] / 2 + 0.2]} castShadow>
              <boxGeometry args={[layout.river.size[0], 0.12, 0.3]} />
              <meshStandardMaterial color="#6b7c55" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.03, -layout.river.size[1] / 2 - 0.2]} castShadow>
              <boxGeometry args={[layout.river.size[0], 0.12, 0.3]} />
              <meshStandardMaterial color="#6b7c55" roughness={0.95} />
            </mesh>
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

      {/* Irrigation canals */}
      {layout.canals.map((canal, idx) => (
        <HoverableGroup
          key={`canal-${idx}`}
          position={canal.pos}
          boxSize={[canal.size[0], 0.6, canal.size[1] + 0.8]}
          boxOffset={[0, 0.1, 0]}
          labelTitle="Irrigation Canal"
          labelLines={['Fed by Barada', 'Stone-lined banks']}
          labelOffset={[0, 1.2, 0]}
        >
          <group rotation={[0, canal.rotation, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={canal.size} />
              <meshStandardMaterial color="#3f5a4c" roughness={0.8} transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, 0.03, canal.size[1] / 2]} castShadow>
              <boxGeometry args={[canal.size[0], 0.12, 0.18]} />
              <meshStandardMaterial color="#6b7c55" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.03, -canal.size[1] / 2]} castShadow>
              <boxGeometry args={[canal.size[0], 0.12, 0.18]} />
              <meshStandardMaterial color="#6b7c55" roughness={0.95} />
            </mesh>
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
