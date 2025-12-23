import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { InteriorProp, InteriorPropType } from '../../types';
import { seededRandom } from '../../utils/procedural';
import { ContactShadow, Flame } from './primitives/Lighting';
import { FirePit, FireSmoke } from './primitives/Fire';
import { Spindle, DyeVat, Anvil, ToolRack, Mortar, HerbRack } from './primitives/Workshop';

const InteriorHoverLabel: React.FC<{ title: string; position: [number, number, number] }> = ({ title, position }) => (
  <Html position={position} center>
    <div className="bg-black/70 border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_18px_rgba(245,158,11,0.25)] pointer-events-none">
      {title}
    </div>
  </Html>
);

const InteriorHoverable: React.FC<{ position?: [number, number, number]; positionVector?: THREE.Vector3; label: string; labelOffset: [number, number, number]; children: React.ReactNode }> = ({ position, positionVector, label, labelOffset, children }) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (positionVector && groupRef.current) {
      groupRef.current.position.copy(positionVector);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {children}
      {hovered && <InteriorHoverLabel title={label} position={labelOffset} />}
    </group>
  );
};

const getPropLabelOffset = (type: InteriorPropType): [number, number, number] => {
  switch (type) {
    case InteriorPropType.COUNTER:
    case InteriorPropType.DISPLAY:
      return [0, 1.6, 0];
    case InteriorPropType.SHELF:
    case InteriorPropType.SCREEN:
      return [0, 1.4, 0];
    case InteriorPropType.FLOOR_LAMP:
    case InteriorPropType.LADDER:
    case InteriorPropType.STAIRS:
    case InteriorPropType.LANTERN:
      return [0, 2.0, 0];
    case InteriorPropType.FIRE_PIT:
    case InteriorPropType.BRAZIER:
      return [0, 1.2, 0];
    default:
      return [0, 0.9, 0];
  }
};

const InteriorPropMesh: React.FC<{
  prop: InteriorProp;
  rugMaterial: THREE.MeshStandardMaterial;
  prayerRugMaterial: THREE.MeshStandardMaterial;
  profession: string;
  positionVector?: THREE.Vector3;
  roomSize?: [number, number, number];
}> = ({ prop, rugMaterial, prayerRugMaterial, profession, positionVector, roomSize }) => {
  const itemRef = useRef<THREE.Object3D>(null);
  const base = positionVector ?? new THREE.Vector3(prop.position[0], prop.position[1], prop.position[2]);
  const rotation = prop.rotation as [number, number, number];
  const common = { position: [base.x, base.y, base.z] as [number, number, number], rotation, ref: itemRef };
  const anchoredPos = (y: number) => positionVector ? [base.x, base.y, base.z] as [number, number, number] : [prop.position[0], y, prop.position[2]] as [number, number, number];

  useFrame(() => {
    if (positionVector && itemRef.current) {
      itemRef.current.position.copy(positionVector);
    }
  });

  switch (prop.type) {
    case InteriorPropType.FLOOR_MAT: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.4, 3.2) : 2;
      const depth = roomSize ? Math.min(roomSize[2] * 0.3, 2.4) : 1.4;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#9a845e" roughness={0.9} />
        </mesh>
      );
    }
    case InteriorPropType.RUG: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.7, 8.8) : 6.6;
      const depth = roomSize ? Math.min(roomSize[2] * 0.65, 6.4) : 4.8;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]} material={rugMaterial}>
          <planeGeometry args={[width, depth]} />
        </mesh>
      );
    }
    case InteriorPropType.PRAYER_RUG: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.35, 3.6) : 3.0;
      const depth = roomSize ? Math.min(roomSize[2] * 0.35, 2.8) : 2.1;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]} material={prayerRugMaterial}>
          <planeGeometry args={[width, depth]} />
        </mesh>
      );
    }
    case InteriorPropType.LOW_TABLE:
      return (
        <group {...common}>
          <ContactShadow size={[1.6, 1.6]} />
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <cylinderGeometry args={[0.85, 0.95, 0.18, 12]} />
            <meshStandardMaterial color="#6b4d33" roughness={0.9} />
          </mesh>
          {[
            [0.45, 0.14, 0.45],
            [-0.45, 0.14, 0.45],
            [0.45, 0.14, -0.45],
            [-0.45, 0.14, -0.45],
          ].map((pos, idx) => (
            <mesh key={`leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.28, 8]} />
              <meshStandardMaterial color="#4a3322" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0.3, 0.38, -0.2]} receiveShadow>
            <boxGeometry args={[0.4, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[-0.3, 0.38, 0.2]} receiveShadow>
            <boxGeometry args={[0.35, 0.06, 0.18]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BENCH:
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <ContactShadow size={[2.0, 0.6]} />
          <mesh receiveShadow>
            <boxGeometry args={[2.0, 0.18, 0.6]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          {[
            [0.8, -0.1, 0.2],
            [-0.8, -0.1, 0.2],
            [0.8, -0.1, -0.2],
            [-0.8, -0.1, -0.2],
          ].map((pos, idx) => (
            <mesh key={`bench-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.12, 0.2, 0.12]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case InteriorPropType.COUNTER:
      return (
        <group {...common}>
          <mesh position={[0, 0.55, 0]} receiveShadow>
            <boxGeometry args={[3.2, 1.1, 0.9]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.1, 0.1]} receiveShadow>
            <boxGeometry args={[3.0, 0.2, 0.7]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.6, -0.4]} receiveShadow>
            <boxGeometry args={[2.9, 0.8, 0.1]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
          <mesh position={[-1.45, 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.12, 1.0, 0.75]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
          <mesh position={[1.45, 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.12, 1.0, 0.75]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.DISPLAY: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 13 + prop.position[2] * 19) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);
      const profLower = profession.toLowerCase();
      const isTextile = profLower.includes('weaver') || profLower.includes('textile') || profLower.includes('cloth');
      const isSpice = profLower.includes('spice') || profLower.includes('apothecary') || profLower.includes('herb');
      const isMetal = profLower.includes('metal') || profLower.includes('blacksmith') || profLower.includes('smith');
      const isBaker = profLower.includes('baker') || profLower.includes('bread');
      const wood = rand() > 0.6 ? '#6a4a32' : rand() > 0.3 ? '#5a3d28' : '#7a5b3a';
      const trim = rand() > 0.5 ? '#9a7a54' : '#b08a5a';
      const displayHeight = rand() > 0.6 ? 2.5 : 2.2;
      const hasGlass = rand() > 0.55;
      const hasCarved = rand() > 0.6;
      const clothColors = ['#b88b5a', '#8f6a49', '#c3a16e', '#a17a54'];
      const spiceColors = ['#b86d3c', '#cfa35a', '#8c6a3f', '#a9773f'];
      const metalColors = ['#6f6f6f', '#8a7a6a', '#5c5c5c'];
      const breadColors = ['#b07a4a', '#c18b5a', '#a76f3f'];
      const itemSlots = [-0.9, 0, 0.9];
      const shelfYs = [0.78, 1.45];
      const items: Array<{ label: string; type: 'cloth' | 'jar' | 'ingot' | 'bread' | 'scroll' | 'tool' | 'sack' }> = [];
      const pushItems = (list: Array<{ label: string; type: 'cloth' | 'jar' | 'ingot' | 'bread' | 'scroll' | 'tool' | 'sack' }>) => {
        list.forEach((item) => items.push(item));
      };
      if (isTextile) {
        pushItems([
          { label: 'Dyed cloth', type: 'cloth' },
          { label: 'Folded linen', type: 'cloth' },
          { label: 'Spindle', type: 'tool' },
          { label: 'Wool roll', type: 'cloth' },
          { label: 'Cotton scarf', type: 'cloth' },
          { label: 'Dye jar', type: 'jar' }
        ]);
      } else if (isSpice) {
        pushItems([
          { label: 'Spice jars', type: 'jar' },
          { label: 'Herb bundle', type: 'sack' },
          { label: 'Mortar', type: 'tool' },
          { label: 'Dried dates', type: 'sack' },
          { label: 'Saffron box', type: 'jar' },
          { label: 'Oils', type: 'jar' }
        ]);
      } else if (isMetal) {
        pushItems([
          { label: 'Iron ingots', type: 'ingot' },
          { label: 'Hammer', type: 'tool' },
          { label: 'Knife', type: 'tool' },
          { label: 'Bronze fittings', type: 'ingot' },
          { label: 'Chisel set', type: 'tool' },
          { label: 'Metal buckles', type: 'ingot' }
        ]);
      } else if (isBaker) {
        pushItems([
          { label: 'Bread loaves', type: 'bread' },
          { label: 'Flatbreads', type: 'bread' },
          { label: 'Honey cakes', type: 'bread' },
          { label: 'Sesame rolls', type: 'bread' },
          { label: 'Pita stack', type: 'bread' },
          { label: 'Date pastries', type: 'bread' }
        ]);
      } else {
        pushItems([
          { label: 'Woven basket', type: 'sack' },
          { label: 'Candles', type: 'jar' },
          { label: 'Small jar', type: 'jar' },
          { label: 'Cloth roll', type: 'cloth' },
          { label: 'Ledger', type: 'scroll' },
          { label: 'Utility tools', type: 'tool' }
        ]);
      }
      while (items.length < 6) {
        items.push({ label: 'Goods', type: 'cloth' });
      }
      const renderItem = (item: typeof items[number], pos: [number, number, number], key: string) => {
        const [x, y, z] = pos;
        const color = (() => {
          if (item.type === 'cloth') return clothColors[Math.floor(rand() * clothColors.length)];
          if (item.type === 'jar') return spiceColors[Math.floor(rand() * spiceColors.length)];
          if (item.type === 'ingot') return metalColors[Math.floor(rand() * metalColors.length)];
          if (item.type === 'bread') return breadColors[Math.floor(rand() * breadColors.length)];
          if (item.type === 'scroll') return '#cdbb9a';
          return '#7a5a3a';
        })();
        return (
          <InteriorHoverable key={key} position={[x, y, z]} label={item.label} labelOffset={[0, 0.35, 0]}>
            <group>
              {item.type === 'cloth' && (
                <mesh receiveShadow>
                  <boxGeometry args={[0.55, 0.16, 0.32]} />
                  <meshStandardMaterial color={color} roughness={0.85} />
                </mesh>
              )}
              {item.type === 'jar' && (
                <mesh receiveShadow>
                  <cylinderGeometry args={[0.16, 0.2, 0.3, 10]} />
                  <meshStandardMaterial color={color} roughness={0.8} />
                </mesh>
              )}
              {item.type === 'ingot' && (
                <mesh receiveShadow>
                  <boxGeometry args={[0.32, 0.12, 0.2]} />
                  <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
                </mesh>
              )}
              {item.type === 'bread' && (
                <mesh receiveShadow>
                  <cylinderGeometry args={[0.22, 0.26, 0.18, 10]} />
                  <meshStandardMaterial color={color} roughness={0.9} />
                </mesh>
              )}
              {item.type === 'scroll' && (
                <mesh receiveShadow>
                  <boxGeometry args={[0.4, 0.08, 0.18]} />
                  <meshStandardMaterial color={color} roughness={0.85} />
                </mesh>
              )}
              {item.type === 'tool' && (
                <mesh receiveShadow>
                  <boxGeometry args={[0.36, 0.08, 0.12]} />
                  <meshStandardMaterial color={color} roughness={0.85} />
                </mesh>
              )}
              {item.type === 'sack' && (
                <mesh receiveShadow>
                  <boxGeometry args={[0.35, 0.2, 0.25]} />
                  <meshStandardMaterial color={color} roughness={0.9} />
                </mesh>
              )}
            </group>
          </InteriorHoverable>
        );
      };
      const isWallAligned = prop.rotation && (Math.abs(prop.rotation[1]) > 0.2);
      const localZ = isWallAligned ? -0.18 : 0;
      return (
        <group {...common} position={[common.position[0], common.position[1], common.position[2] + localZ]}>
          <mesh position={[0, displayHeight * 0.5 - 0.2, 0]} receiveShadow>
            <boxGeometry args={[2.6, displayHeight, 0.7]} />
            <meshStandardMaterial color={wood} roughness={0.9} />
          </mesh>
          <mesh position={[0, displayHeight * 0.5 + 0.2, 0]} receiveShadow>
            <boxGeometry args={[2.4, 0.12, 0.6]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          <mesh position={[0, displayHeight * 0.5 - 0.55, 0]} receiveShadow>
            <boxGeometry args={[2.4, 0.12, 0.6]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          {hasCarved && (
            <mesh position={[0, displayHeight * 0.5 - 0.1, 0.32]} receiveShadow>
              <boxGeometry args={[2.2, 0.08, 0.06]} />
              <meshStandardMaterial color={trim} roughness={0.8} />
            </mesh>
          )}
          {hasGlass && (
            <mesh position={[0, displayHeight * 0.5 - 0.05, 0.36]} receiveShadow>
              <boxGeometry args={[2.2, displayHeight - 0.5, 0.04]} />
              <meshStandardMaterial color="#cfd6e1" transparent opacity={0.2} roughness={0.1} metalness={0.2} />
            </mesh>
          )}
          <mesh position={[0, shelfYs[0], 0.06]} receiveShadow>
            <boxGeometry args={[2.2, 0.08, 0.55]} />
            <meshStandardMaterial color={trim} roughness={0.8} />
          </mesh>
          <mesh position={[0, shelfYs[1], 0.06]} receiveShadow>
            <boxGeometry args={[2.2, 0.08, 0.55]} />
            <meshStandardMaterial color={trim} roughness={0.8} />
          </mesh>
          {shelfYs.map((shelfY, shelfIndex) =>
            itemSlots.map((x, slotIndex) => {
              const item = items[shelfIndex * 3 + slotIndex];
              return renderItem(item, [x, shelfY + 0.08, 0.08], `item-${shelfIndex}-${slotIndex}`);
            })
          )}
        </group>
      );
    }
    case InteriorPropType.SHELF:
      return (
        <group {...common}>
          <mesh position={[0, 0.6, 0]} receiveShadow>
            <boxGeometry args={[1.6, 1.2, 0.3]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0.1]} receiveShadow>
            <boxGeometry args={[1.4, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.9, 0.1]} receiveShadow>
            <boxGeometry args={[1.4, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BEDROLL:
      return (
        <group {...common} position={anchoredPos(0.05)}>
          <ContactShadow size={[1.4, 0.7]} />
          <mesh receiveShadow>
            <boxGeometry args={[1.4, 0.22, 0.7]} />
            <meshStandardMaterial color="#8c7b5a" roughness={0.9} />
          </mesh>
          <mesh position={[0.45, 0.16, 0]} receiveShadow>
            <boxGeometry args={[0.3, 0.12, 0.4]} />
            <meshStandardMaterial color="#b8a27d" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CHEST:
      return (
        <group {...common} position={anchoredPos(0.3)}>
          <mesh receiveShadow>
            <boxGeometry args={[1.1, 0.55, 0.6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <boxGeometry args={[1.0, 0.15, 0.55]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.1, 0.31]} receiveShadow>
            <boxGeometry args={[0.9, 0.1, 0.02]} />
            <meshStandardMaterial color="#9a7a54" roughness={0.7} metalness={0.1} />
          </mesh>
        </group>
      );
    case InteriorPropType.AMPHORA:
      return (
        <group {...common} position={anchoredPos(0.28)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.25, 0.35, 0.55, 10]} />
            <meshStandardMaterial color="#a46a3f" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.CRATE:
      return (
        <group {...common} position={anchoredPos(0.22)}>
          <mesh receiveShadow>
            <boxGeometry args={[0.8, 0.45, 0.8]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[0.78, 0.06, 0.78]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.CUSHION: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 7 + prop.position[2] * 9) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);
      const palette = [
        '#a35e3b', '#b0724a', '#7a4d35', '#8a5b3f',
        '#6f5a45', '#7a5a3a', '#8a6b4f', '#a87a4f'
      ];
      const accent = ['#d3b27a', '#c89b6a', '#b8895a', '#a9784a'];
      const base = palette[Math.floor(rand() * palette.length)];
      const trim = accent[Math.floor(rand() * accent.length)];
      const w = 0.72 + rand() * 0.24;
      const d = 0.72 + rand() * 0.24;
      const roll = rand();
      const shape = roll < 0.1 ? 'oct' : roll < 0.7 ? 'square' : 'round';
      return (
        <group {...common} position={anchoredPos(0.12)}>
          {shape === 'square' && (
            <mesh receiveShadow>
              <boxGeometry args={[w, 0.24, d]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          {shape === 'round' && (
            <mesh receiveShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.55, 0.24, 16]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          {shape === 'oct' && (
            <mesh receiveShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.55, 0.24, 8]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[w * 0.7, 0.03, d * 0.08]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.14, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <boxGeometry args={[d * 0.7, 0.03, w * 0.08]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
        </group>
      );
    }
    case InteriorPropType.DESK:
      return (
        <group {...common}>
          <ContactShadow size={[1.8, 0.8]} />
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.32, 0.8]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {[
            [0.7, 0.15, 0.3],
            [-0.7, 0.15, 0.3],
            [0.7, 0.15, -0.3],
            [-0.7, 0.15, -0.3],
          ].map((pos, idx) => (
            <mesh key={`desk-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.12, 0.3, 0.12]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0.4, 0.55, -0.1]} receiveShadow>
            <boxGeometry args={[0.4, 0.1, 0.3]} />
            <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.4, 0.55, 0.2]} receiveShadow>
            <boxGeometry args={[0.5, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.52, 0.32]} receiveShadow>
            <boxGeometry args={[0.6, 0.12, 0.08]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BOOKS:
      return (
        <mesh {...common} position={anchoredPos(0.55)} receiveShadow>
          <boxGeometry args={[0.7, 0.14, 0.4]} />
          <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.CHAIR:
      return (
        <group {...common}>
          <ContactShadow size={[0.7, 0.7]} />
          <mesh position={[0, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {[
            [0.22, 0.15, 0.22],
            [-0.22, 0.15, 0.22],
            [0.22, 0.15, -0.22],
            [-0.22, 0.15, -0.22],
          ].map((pos, idx) => (
            <mesh key={`chair-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.08, 0.3, 0.08]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.7, -0.22]} receiveShadow>
            <boxGeometry args={[0.6, 0.45, 0.08]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.SCALE:
      return (
        <group {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 0.7)}>
          <mesh receiveShadow>
            <boxGeometry args={[0.4, 0.08, 0.4]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.16, 0]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.8} />
          </mesh>
        </group>
      );
    case InteriorPropType.LEDGER:
      return (
        <mesh {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 0.72)} receiveShadow>
          <boxGeometry args={[0.35, 0.08, 0.25]} />
          <meshStandardMaterial color="#a8916a" roughness={0.8} />
        </mesh>
      );
    case InteriorPropType.INK_SET:
      return (
        <group {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 0.7)}>
          <mesh receiveShadow>
            <boxGeometry args={[0.22, 0.06, 0.22]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
          <mesh position={[0.08, 0.1, 0.08]} receiveShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
            <meshStandardMaterial color="#1d1a16" roughness={0.7} />
          </mesh>
        </group>
      );
    case InteriorPropType.SCREEN:
      return (
        <group {...common}>
          <mesh position={[0, 0.8, 0]} receiveShadow>
            <boxGeometry args={[1.4, 1.6, 0.12]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.8, 0.08]} receiveShadow>
            <boxGeometry args={[1.2, 1.2, 0.04]} />
            <meshStandardMaterial color="#6b4a32" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.WALL_HANGING:
      return (
        <mesh {...common} position={anchoredPos(1.4)} receiveShadow>
          <planeGeometry args={[1.4, 1.0]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.WATER_BASIN:
      return (
        <group {...common} position={anchoredPos(0.15)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.6, 0.7, 0.3, 12]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <circleGeometry args={[0.45, 16]} />
            <meshStandardMaterial color="#3d6d8a" emissive="#24465a" emissiveIntensity={0.5} roughness={0.5} />
          </mesh>
        </group>
      );
    case InteriorPropType.EWER:
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.3, 10]} />
            <meshStandardMaterial color="#a6784e" roughness={0.85} />
          </mesh>
          <mesh position={[0.12, 0.25, 0]} receiveShadow>
            <boxGeometry args={[0.06, 0.18, 0.06]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.8} />
          </mesh>
        </group>
      );
    case InteriorPropType.LAMP:
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.2, 0.25, 0.25, 10]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
          <Flame position={[0, 0.38, 0]} size={0.09} color="#ffcf88" emissive="#ff9a3c" />
        </group>
      );
    case InteriorPropType.CANDLE:
      return (
        <group {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 0.05)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
            <meshStandardMaterial color="#d8c7a2" roughness={0.7} />
          </mesh>
          <Flame position={[0, 0.2, 0]} size={0.06} color="#ffd7a1" emissive="#ff8b2e" />
        </group>
      );
    case InteriorPropType.FLOOR_LAMP:
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.12, 0.15, 0.35, 10]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.85} />
          </mesh>
          <Flame position={[0, 1.38, 0]} size={0.1} color="#ffcf88" emissive="#ff9a3c" />
        </group>
      );
    case InteriorPropType.LANTERN: {
      const scale = prop.scale ?? [1, 1, 1];
      const lanternScale = Math.max(scale[0], scale[1], scale[2]);
      return (
        <group {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 2.2)} scale={[lanternScale, lanternScale, lanternScale]}>
          {/* Chain/rope hanging from ceiling */}
          <mesh position={[0, 0.7, 0]} receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#4a3424" roughness={0.8} />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 0.42, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.12, 8]} />
            <meshStandardMaterial color="#5a4330" roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Main lantern body */}
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#c79a5a" roughness={0.45} metalness={0.35} />
          </mesh>
          {/* Glass panels */}
          <mesh position={[0, 0.18, 0.21]} receiveShadow>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial color="#7cc0d8" emissive="#6aa4c2" emissiveIntensity={0.8} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0.18, -0.21]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial color="#d8a06f" emissive="#c88956" emissiveIntensity={0.8} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.21, 0.18, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial color="#a7c58a" emissive="#8fb56f" emissiveIntensity={0.8} transparent opacity={0.7} />
          </mesh>
          <mesh position={[-0.21, 0.18, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial color="#c7b06a" emissive="#b6954b" emissiveIntensity={0.8} transparent opacity={0.7} />
          </mesh>
          {/* Bottom cap */}
          <mesh position={[0, -0.04, 0]} receiveShadow>
            <cylinderGeometry args={[0.14, 0.1, 0.1, 8]} />
            <meshStandardMaterial color="#5a4330" roughness={0.7} metalness={0.2} />
          </mesh>
          <Flame position={[0, 0.18, 0]} size={0.08} color="#ffd2a2" emissive="#ff9a3c" />
        </group>
      );
    }
    case InteriorPropType.BRAZIER:
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.5, 0.6, 0.3, 10]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
          <Flame position={[0, 0.45, 0]} size={0.16} color="#ffb347" emissive="#ff7a18" />
          <FireSmoke position={[0, 0, 0]} />
        </group>
      );
    case InteriorPropType.FIRE_PIT:
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.7, 0.85, 0.3, 12]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
          <Flame position={[0, 0.42, 0]} size={0.22} color="#ffb347" emissive="#ff7a18" />
          <FirePit position={[0, 0, 0]} />
          <FireSmoke position={[0, 0, 0]} />
        </group>
      );
    case InteriorPropType.LOOM:
      return (
        <group {...common} position={anchoredPos(0.1)}>
          <mesh receiveShadow>
            <boxGeometry args={[2.0, 1.2, 0.3]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.4, 0.18]} receiveShadow>
            <boxGeometry args={[1.8, 0.6, 0.05]} />
            <meshStandardMaterial color="#d6c2a4" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.BOLT_OF_CLOTH:
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <mesh receiveShadow>
            <boxGeometry args={[0.8, 0.3, 0.4]} />
            <meshStandardMaterial color="#9b7b5a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, 0.15]} receiveShadow>
            <boxGeometry args={[0.7, 0.06, 0.25]} />
            <meshStandardMaterial color="#bfa57e" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BASKET:
      return (
        <group {...common} position={anchoredPos(0.15)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.35, 0.4, 0.3, 12]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.TRAY:
      return (
        <group {...common} position={anchoredPos(0.75)}>
          <mesh receiveShadow>
            <boxGeometry args={[0.5, 0.06, 0.35]} />
            <meshStandardMaterial color="#a88b5a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.TEA_SET:
      return (
        <group {...common} position={anchoredPos(0.78)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.2, 10]} />
            <meshStandardMaterial color="#c89b6a" roughness={0.85} />
          </mesh>
          <mesh position={[0.18, 0, 0]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
            <meshStandardMaterial color="#b8895a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.HOOKAH:
      return (
        <group {...common} position={anchoredPos(0.15)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.12, 0.2, 0.3, 10]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.FLOOR_PILLOWS: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 17 + prop.position[2] * 23) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);
      const basePalette = ['#b06a4a', '#9b5a3f', '#b8895a', '#8a5b3f', '#7a4d35', '#a9784a'];
      const accent = ['#e1d3b3', '#d9c9a8', '#cbb58c'];
      const base = basePalette[Math.floor(rand() * basePalette.length)];
      const trim = accent[Math.floor(rand() * accent.length)];
      const roll = rand();
      const shape = roll < 0.1 ? 'oct' : roll < 0.7 ? 'square' : 'round';
      const w = 0.7 + rand() * 0.25;
      const d = 0.7 + rand() * 0.25;
      return (
        <group {...common} position={anchoredPos(0.12)}>
          {shape === 'square' && (
            <mesh receiveShadow>
              <boxGeometry args={[w, 0.2, d]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          {shape === 'round' && (
            <mesh receiveShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.55, 0.2, 16]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          {shape === 'oct' && (
            <mesh receiveShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.55, 0.2, 8]} />
              <meshStandardMaterial color={base} roughness={0.9} />
            </mesh>
          )}
          <mesh position={[0, 0.12, 0]} receiveShadow>
            <boxGeometry args={[w * 0.7, 0.03, d * 0.08]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <boxGeometry args={[d * 0.7, 0.03, w * 0.08]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
        </group>
      );
    }
    case InteriorPropType.LADDER:
    case InteriorPropType.STAIRS:
      return (
        <group {...common} position={anchoredPos(0)}>
          <mesh receiveShadow>
            <boxGeometry args={[1.4, 2.2, 0.6]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.SPINDLE:
      return <Spindle position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.DYE_VAT:
      return <DyeVat position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.ANVIL:
      return <Anvil position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.TOOL_RACK:
      return <ToolRack position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.MORTAR:
      return <Mortar position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.HERB_RACK:
      return <HerbRack position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.ARCH_COLUMN: {
      // Decorative arch column for religious buildings - horseshoe arch style
      const columnHeight = 3.2;
      const columnRadius = 0.18;
      const archHeight = 0.8;
      const archWidth = 2.8; // Space between columns
      const stoneColor = '#d4c4a8';
      const accentColor = '#c4b498';

      return (
        <group {...common} position={anchoredPos(0)}>
          {/* Left column */}
          <group position={[-archWidth / 2, 0, 0]}>
            {/* Column base */}
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius * 1.4, columnRadius * 1.5, 0.2, 16]} />
              <meshStandardMaterial color={accentColor} roughness={0.85} />
            </mesh>
            {/* Column shaft */}
            <mesh position={[0, columnHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius, columnRadius, columnHeight, 16]} />
              <meshStandardMaterial color={stoneColor} roughness={0.8} />
            </mesh>
            {/* Column capital */}
            <mesh position={[0, columnHeight - 0.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius * 1.5, columnRadius * 1.2, 0.25, 16]} />
              <meshStandardMaterial color={accentColor} roughness={0.85} />
            </mesh>
          </group>

          {/* Right column */}
          <group position={[archWidth / 2, 0, 0]}>
            {/* Column base */}
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius * 1.4, columnRadius * 1.5, 0.2, 16]} />
              <meshStandardMaterial color={accentColor} roughness={0.85} />
            </mesh>
            {/* Column shaft */}
            <mesh position={[0, columnHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius, columnRadius, columnHeight, 16]} />
              <meshStandardMaterial color={stoneColor} roughness={0.8} />
            </mesh>
            {/* Column capital */}
            <mesh position={[0, columnHeight - 0.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[columnRadius * 1.5, columnRadius * 1.2, 0.25, 16]} />
              <meshStandardMaterial color={accentColor} roughness={0.85} />
            </mesh>
          </group>

          {/* Horseshoe arch - created with torus segment */}
          <group position={[0, columnHeight + 0.1, 0]}>
            {/* Main arch span */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <torusGeometry args={[archWidth / 2, 0.12, 8, 24, Math.PI]} />
              <meshStandardMaterial color={stoneColor} roughness={0.8} />
            </mesh>
            {/* Arch keystone */}
            <mesh position={[0, archWidth / 2 - 0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.25, 0.25]} />
              <meshStandardMaterial color={accentColor} roughness={0.85} />
            </mesh>
            {/* Decorative band on arch */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.08]} receiveShadow>
              <torusGeometry args={[archWidth / 2 - 0.15, 0.04, 6, 24, Math.PI]} />
              <meshStandardMaterial color={accentColor} roughness={0.9} />
            </mesh>
          </group>
        </group>
      );
    }
    default:
      return null;
  }
};

export const InteriorPropRenderer: React.FC<{
  prop: InteriorProp;
  rugMaterial: THREE.MeshStandardMaterial;
  prayerRugMaterial: THREE.MeshStandardMaterial;
  profession: string;
  roomSize?: [number, number, number];
  positionVector?: THREE.Vector3;
}> = ({ prop, rugMaterial, prayerRugMaterial, profession, roomSize, positionVector }) => {
  const labelOffset = useMemo(() => getPropLabelOffset(prop.type), [prop.type]);
  const zeroVector = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const displayProp = useMemo(() => {
    if (!positionVector) return prop;
    return { ...prop, position: [0, 0, 0] as [number, number, number] };
  }, [prop, positionVector]);
  const groupPosition = positionVector ? undefined : [prop.position[0], prop.position[1], prop.position[2]] as [number, number, number];
  return (
    <InteriorHoverable
      position={groupPosition}
      positionVector={positionVector}
      label={prop.label ?? prop.type}
      labelOffset={labelOffset}
    >
      <InteriorPropMesh
        prop={displayProp}
        rugMaterial={rugMaterial}
        prayerRugMaterial={prayerRugMaterial}
        profession={profession}
        positionVector={positionVector ? zeroVector : undefined}
        roomSize={roomSize}
      />
    </InteriorHoverable>
  );
};
