import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { InteriorProp, InteriorPropType } from '../../types';
import { seededRandom } from '../../utils/procedural';
import { ContactShadow, Flame } from './primitives/Lighting';
import { FirePit, FireSmoke } from './primitives/Fire';
import { Spindle, DyeVat, Anvil, ToolRack, Mortar, HerbRack, MedicineShelf } from './primitives/Workshop';

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
    case InteriorPropType.LOW_TABLE: {
      // Detailed low table with octagonal top, carved legs, and support structure
      const woodColor = '#6b4d33';
      const darkWood = '#4a3322';
      const lightWood = '#8a6b4f';
      const tableHeight = 0.45; // Taller off the ground

      return (
        <group {...common}>
          {/* Octagonal tabletop - more interesting than circle */}
          <mesh position={[0, tableHeight, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.9, 0.92, 0.06, 8]} />
            <meshStandardMaterial color={woodColor} roughness={0.88} />
          </mesh>

          {/* Top surface planks for detail */}
          {Array.from({ length: 5 }).map((_, i) => {
            const offset = -0.7 + i * 0.35;
            return (
              <mesh key={`plank-${i}`} position={[offset, tableHeight + 0.032, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.32, 0.008, 1.7]} />
                <meshStandardMaterial color={lightWood} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Decorative edge molding around octagon */}
          <mesh position={[0, tableHeight + 0.035, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.93, 0.95, 0.02, 8]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>

          {/* Four carved legs with decorative turnings */}
          {[
            [0.55, tableHeight / 2, 0.55],
            [-0.55, tableHeight / 2, 0.55],
            [0.55, tableHeight / 2, -0.55],
            [-0.55, tableHeight / 2, -0.55],
          ].map((pos, idx) => (
            <group key={`leg-group-${idx}`}>
              {/* Main leg shaft */}
              <mesh position={pos as [number, number, number]} receiveShadow castShadow>
                <cylinderGeometry args={[0.055, 0.07, tableHeight, 8]} />
                <meshStandardMaterial color={darkWood} roughness={0.92} />
              </mesh>

              {/* Decorative rings on leg */}
              <mesh position={[pos[0], tableHeight * 0.7, pos[2]]} receiveShadow castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.04, 8]} />
                <meshStandardMaterial color={woodColor} roughness={0.88} />
              </mesh>
              <mesh position={[pos[0], tableHeight * 0.3, pos[2]]} receiveShadow castShadow>
                <cylinderGeometry args={[0.075, 0.075, 0.035, 8]} />
                <meshStandardMaterial color={woodColor} roughness={0.88} />
              </mesh>

              {/* Leg foot/base */}
              <mesh position={[pos[0], 0.02, pos[2]]} receiveShadow castShadow>
                <cylinderGeometry args={[0.09, 0.085, 0.04, 8]} />
                <meshStandardMaterial color={darkWood} roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Cross braces between legs for stability */}
          {/* Front-back braces */}
          <mesh position={[0.55, tableHeight * 0.25, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.08, 0.06, 1.1]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>
          <mesh position={[-0.55, tableHeight * 0.25, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.08, 0.06, 1.1]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>

          {/* Side braces */}
          <mesh position={[0, tableHeight * 0.25, 0.55]} receiveShadow castShadow>
            <boxGeometry args={[1.1, 0.06, 0.08]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, tableHeight * 0.25, -0.55]} receiveShadow castShadow>
            <boxGeometry args={[1.1, 0.06, 0.08]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>

          {/* Apron/skirt around table edge */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * 0.82;
            const z = Math.sin(angle) * 0.82;
            return (
              <mesh
                key={`apron-${i}`}
                position={[x, tableHeight - 0.08, z]}
                rotation={[0, angle + Math.PI / 2, 0]}
                receiveShadow
                castShadow
              >
                <boxGeometry args={[0.65, 0.1, 0.04]} />
                <meshStandardMaterial color={darkWood} roughness={0.92} />
              </mesh>
            );
          })}
        </group>
      );
    }
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
    case InteriorPropType.COUNTER: {
      // Large merchant sales counter with detailed construction
      const woodColor = '#6a4a32';
      const lightWood = '#8a6b4f';
      const darkWood = '#5a3f2a';
      const wornWood = '#7a5a3a';

      return (
        <group {...common}>
          {/* Main counter body - larger and more substantial */}
          <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
            <boxGeometry args={[4.2, 1.2, 1.1]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>

          {/* Top counter surface - worn from use */}
          <mesh position={[0, 1.22, 0.05]} receiveShadow castShadow>
            <boxGeometry args={[4.3, 0.08, 1.0]} />
            <meshStandardMaterial color={wornWood} roughness={0.75} />
          </mesh>

          {/* Top counter edge trim */}
          <mesh position={[0, 1.26, 0.55]} receiveShadow castShadow>
            <boxGeometry args={[4.3, 0.04, 0.08]} />
            <meshStandardMaterial color={lightWood} roughness={0.8} />
          </mesh>

          {/* Customer-facing decorative panel with planks */}
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={`front-plank-${i}`} position={[-1.8 + i * 0.6, 0.6, -0.5]} receiveShadow castShadow>
              <boxGeometry args={[0.55, 1.0, 0.06]} />
              <meshStandardMaterial color={darkWood} roughness={0.92} />
            </mesh>
          ))}

          {/* Reinforcement trim on front panel */}
          <mesh position={[0, 1.05, -0.53]} receiveShadow castShadow>
            <boxGeometry args={[4.0, 0.08, 0.04]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.25, -0.53]} receiveShadow castShadow>
            <boxGeometry args={[4.0, 0.08, 0.04]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>

          {/* Corner posts/legs with decorative caps */}
          {[-1.95, 1.95].map((x) => (
            <group key={`leg-${x}`}>
              {/* Main leg */}
              <mesh position={[x, 0.6, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.16, 1.15, 0.9]} />
                <meshStandardMaterial color={darkWood} roughness={0.92} />
              </mesh>
              {/* Decorative cap at top */}
              <mesh position={[x, 1.2, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.2, 0.06, 0.94]} />
                <meshStandardMaterial color={lightWood} roughness={0.85} />
              </mesh>
            </group>
          ))}

          {/* Middle support posts for stability */}
          {[-0.8, 0.8].map((x) => (
            <mesh key={`support-${x}`} position={[x, 0.6, 0]} receiveShadow castShadow>
              <boxGeometry args={[0.12, 1.1, 0.85]} />
              <meshStandardMaterial color={darkWood} roughness={0.92} />
            </mesh>
          ))}

          {/* Under-counter storage shelf */}
          <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
            <boxGeometry args={[3.9, 0.06, 0.85]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>

          {/* Side panels */}
          <mesh position={[-2.03, 0.6, 0.2]} receiveShadow castShadow>
            <boxGeometry args={[0.06, 1.1, 0.7]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>
          <mesh position={[2.03, 0.6, 0.2]} receiveShadow castShadow>
            <boxGeometry args={[0.06, 1.1, 0.7]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>

          {/* Decorative molding along top edge */}
          <mesh position={[0, 1.3, 0.05]} receiveShadow castShadow>
            <boxGeometry args={[4.4, 0.04, 1.05]} />
            <meshStandardMaterial color={lightWood} roughness={0.8} />
          </mesh>

          {/* Metal reinforcement corners */}
          {[-1.95, 1.95].map((x) =>
            [-0.45, 0.45].map((z) => (
              <mesh key={`corner-${x}-${z}`} position={[x, 0.08, z]} receiveShadow castShadow>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.6} metalness={0.3} />
              </mesh>
            ))
          )}

          {/* Storage compartment doors (visible from merchant side) */}
          {[-1.0, 1.0].map((x) => (
            <group key={`door-${x}`}>
              <mesh position={[x, 0.7, 0.52]} receiveShadow castShadow>
                <boxGeometry args={[0.85, 0.9, 0.05]} />
                <meshStandardMaterial color={woodColor} roughness={0.88} />
              </mesh>
              {/* Door handle */}
              <mesh position={[x + (x > 0 ? -0.3 : 0.3), 0.7, 0.56]} receiveShadow castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.7} metalness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }
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
      return (
        <group {...common}>
          {/* Top trim */}
          <mesh position={[0, displayHeight - 0.06, 0]} receiveShadow>
            <boxGeometry args={[2.4, 0.12, 0.6]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          {/* Bottom trim */}
          <mesh position={[0, 0.06, 0]} receiveShadow>
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
    case InteriorPropType.SHELF: {
      // Wall-mounted shelf with support brackets and small items
      const shelfWood = '#6a4a32';
      const lightWood = '#8a6b4f';
      const darkWood = '#5a3d28';
      const metalBracket = '#4a4a4a';

      return (
        <group {...common} position={anchoredPos(0)}>
          {/* Backing board */}
          <mesh position={[0, 0.6, -0.12]} receiveShadow castShadow>
            <boxGeometry args={[1.6, 1.3, 0.04]} />
            <meshStandardMaterial color={shelfWood} roughness={0.9} />
          </mesh>

          {/* Bottom shelf plank */}
          <mesh position={[0, 0.3, 0.02]} receiveShadow castShadow>
            <boxGeometry args={[1.5, 0.08, 0.25]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>

          {/* Middle shelf plank */}
          <mesh position={[0, 0.7, 0.02]} receiveShadow castShadow>
            <boxGeometry args={[1.5, 0.08, 0.25]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>

          {/* Top shelf plank */}
          <mesh position={[0, 1.1, 0.02]} receiveShadow castShadow>
            <boxGeometry args={[1.5, 0.08, 0.25]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
          </mesh>

          {/* Support brackets (L-shaped metal) */}
          {[-0.6, 0.6].map((x, i) => (
            <group key={`bracket-bottom-${i}`} position={[x, 0.3, 0]}>
              <mesh position={[0, -0.08, -0.04]} receiveShadow castShadow>
                <boxGeometry args={[0.06, 0.16, 0.04]} />
                <meshStandardMaterial color={metalBracket} roughness={0.6} metalness={0.6} />
              </mesh>
              <mesh position={[0, 0, 0.04]} receiveShadow castShadow>
                <boxGeometry args={[0.06, 0.04, 0.16]} />
                <meshStandardMaterial color={metalBracket} roughness={0.6} metalness={0.6} />
              </mesh>
            </group>
          ))}

          {[-0.6, 0.6].map((x, i) => (
            <group key={`bracket-middle-${i}`} position={[x, 0.7, 0]}>
              <mesh position={[0, -0.08, -0.04]} receiveShadow castShadow>
                <boxGeometry args={[0.06, 0.16, 0.04]} />
                <meshStandardMaterial color={metalBracket} roughness={0.6} metalness={0.6} />
              </mesh>
              <mesh position={[0, 0, 0.04]} receiveShadow castShadow>
                <boxGeometry args={[0.06, 0.04, 0.16]} />
                <meshStandardMaterial color={metalBracket} roughness={0.6} metalness={0.6} />
              </mesh>
            </group>
          ))}

          {/* Decorative edge trim on shelves */}
          {[0.3, 0.7, 1.1].map((y, i) => (
            <mesh key={`trim-${i}`} position={[0, y, 0.15]} receiveShadow>
              <boxGeometry args={[1.52, 0.03, 0.02]} />
              <meshStandardMaterial color={darkWood} roughness={0.8} />
            </mesh>
          ))}

          {/* Small items on shelves */}
          {/* Bottom shelf - clay jars */}
          <mesh position={[-0.5, 0.42, 0.05]} receiveShadow castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.16, 8]} />
            <meshStandardMaterial color="#9a6a4a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.15, 0.42, 0.05]} receiveShadow castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.14, 8]} />
            <meshStandardMaterial color="#8a5a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.2, 0.42, 0.05]} receiveShadow castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.18, 8]} />
            <meshStandardMaterial color="#aa7a5a" roughness={0.85} />
          </mesh>

          {/* Middle shelf - scrolls and small box */}
          <mesh position={[-0.4, 0.78, 0.05]} rotation={[0, 0, Math.PI / 2]} receiveShadow castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#c8b896" roughness={0.8} />
          </mesh>
          <mesh position={[-0.1, 0.8, 0.05]} receiveShadow castShadow>
            <boxGeometry args={[0.16, 0.1, 0.12]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0.35, 0.78, 0.05]} rotation={[0, 0.3, Math.PI / 2]} receiveShadow castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.22, 8]} />
            <meshStandardMaterial color="#d8c8a6" roughness={0.8} />
          </mesh>

          {/* Top shelf - candles and small items */}
          <mesh position={[-0.45, 1.18, 0.05]} receiveShadow castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
            <meshStandardMaterial color="#e8d8b8" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.2, 0.05]} receiveShadow castShadow>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.85} />
          </mesh>
          <mesh position={[0.45, 1.18, 0.05]} receiveShadow castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
            <meshStandardMaterial color="#e8d8b8" roughness={0.7} />
          </mesh>
        </group>
      );
    }
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
    case InteriorPropType.SLEEPING_MAT:
      // Simple reed/straw mat on floor - for poorest residents
      return (
        <group {...common} position={anchoredPos(0.02)}>
          <ContactShadow size={[1.8, 0.9]} />
          {/* Woven reed mat */}
          <mesh receiveShadow>
            <boxGeometry args={[1.8, 0.04, 0.9]} />
            <meshStandardMaterial color="#a89060" roughness={0.95} />
          </mesh>
          {/* Thin blanket/covering */}
          <mesh position={[0.2, 0.05, 0]} receiveShadow>
            <boxGeometry args={[1.2, 0.03, 0.7]} />
            <meshStandardMaterial color="#7a6a50" roughness={0.9} />
          </mesh>
          {/* Small bundled pillow */}
          <mesh position={[0.7, 0.08, 0]} receiveShadow>
            <boxGeometry args={[0.25, 0.1, 0.3]} />
            <meshStandardMaterial color="#9a8a6a" roughness={0.88} />
          </mesh>
        </group>
      );
    case InteriorPropType.LOW_BED:
      // Low wooden platform with cushions - middle class
      return (
        <group {...common} position={anchoredPos(0.15)}>
          <ContactShadow size={[2.2, 1.2]} />
          {/* Wooden platform base */}
          <mesh receiveShadow>
            <boxGeometry args={[2.2, 0.18, 1.2]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {/* Raised edges */}
          <mesh position={[0, 0.14, -0.55]} receiveShadow>
            <boxGeometry args={[2.2, 0.12, 0.1]} />
            <meshStandardMaterial color="#5a3a28" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.14, 0.55]} receiveShadow>
            <boxGeometry args={[2.2, 0.12, 0.1]} />
            <meshStandardMaterial color="#5a3a28" roughness={0.88} />
          </mesh>
          {/* Mattress/cushion */}
          <mesh position={[0, 0.22, 0]} receiveShadow>
            <boxGeometry args={[2.0, 0.12, 1.0]} />
            <meshStandardMaterial color="#8a6a5a" roughness={0.85} />
          </mesh>
          {/* Pillow/bolster */}
          <mesh position={[0.8, 0.32, 0]} receiveShadow>
            <boxGeometry args={[0.35, 0.14, 0.5]} />
            <meshStandardMaterial color="#a89078" roughness={0.82} />
          </mesh>
          {/* Blanket/covering */}
          <mesh position={[-0.3, 0.3, 0]} receiveShadow>
            <boxGeometry args={[1.2, 0.06, 0.9]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.RAISED_BED:
      // Raised platform bed with frame and curtain posts - wealthy
      return (
        <group {...common} position={anchoredPos(0.35)}>
          <ContactShadow size={[2.6, 1.4]} />
          {/* Raised wooden platform */}
          <mesh receiveShadow>
            <boxGeometry args={[2.6, 0.5, 1.4]} />
            <meshStandardMaterial color="#5a3a28" roughness={0.88} />
          </mesh>
          {/* Decorative base trim */}
          <mesh position={[0, -0.2, 0]} receiveShadow>
            <boxGeometry args={[2.7, 0.12, 1.5]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.9} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 0.32, 0]} receiveShadow>
            <boxGeometry args={[2.4, 0.18, 1.2]} />
            <meshStandardMaterial color="#7a5a4a" roughness={0.82} />
          </mesh>
          {/* Bolster pillows */}
          <mesh position={[1.0, 0.48, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#b8a088" roughness={0.8} />
          </mesh>
          <mesh position={[1.0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
            <meshStandardMaterial color="#b8a088" roughness={0.8} />
          </mesh>
          {/* Bed posts for curtains */}
          <mesh position={[-1.2, 0.9, -0.6]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[-1.2, 0.9, 0.6]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[1.2, 0.9, -0.6]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[1.2, 0.9, 0.6]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          {/* Top frame connecting posts */}
          <mesh position={[0, 1.55, -0.6]} receiveShadow>
            <boxGeometry args={[2.5, 0.08, 0.08]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.55, 0.6]} receiveShadow>
            <boxGeometry args={[2.5, 0.08, 0.08]} />
            <meshStandardMaterial color="#4a2a1a" roughness={0.85} />
          </mesh>
          {/* Rich blanket/coverlet */}
          <mesh position={[-0.2, 0.48, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.08, 1.1]} />
            <meshStandardMaterial color="#6a3a3a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.WORKBENCH:
      // Artisan work surface
      return (
        <group {...common} position={anchoredPos(0.45)}>
          <ContactShadow size={[2.0, 1.0]} />
          {/* Sturdy legs */}
          <mesh position={[-0.8, 0, -0.35]} receiveShadow>
            <boxGeometry args={[0.12, 0.9, 0.12]} />
            <meshStandardMaterial color="#5a4030" roughness={0.92} />
          </mesh>
          <mesh position={[0.8, 0, -0.35]} receiveShadow>
            <boxGeometry args={[0.12, 0.9, 0.12]} />
            <meshStandardMaterial color="#5a4030" roughness={0.92} />
          </mesh>
          <mesh position={[-0.8, 0, 0.35]} receiveShadow>
            <boxGeometry args={[0.12, 0.9, 0.12]} />
            <meshStandardMaterial color="#5a4030" roughness={0.92} />
          </mesh>
          <mesh position={[0.8, 0, 0.35]} receiveShadow>
            <boxGeometry args={[0.12, 0.9, 0.12]} />
            <meshStandardMaterial color="#5a4030" roughness={0.92} />
          </mesh>
          {/* Thick work surface */}
          <mesh position={[0, 0.48, 0]} receiveShadow>
            <boxGeometry args={[2.0, 0.12, 0.9]} />
            <meshStandardMaterial color="#7a5a40" roughness={0.9} />
          </mesh>
          {/* Lower shelf */}
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.06, 0.7]} />
            <meshStandardMaterial color="#6a4a35" roughness={0.92} />
          </mesh>
        </group>
      );
    case InteriorPropType.WEAPON_RACK:
      // Military weapon storage
      return (
        <group {...common} position={anchoredPos(0.9)}>
          {/* Back board */}
          <mesh position={[0, 0.5, -0.1]} receiveShadow>
            <boxGeometry args={[1.4, 1.6, 0.08]} />
            <meshStandardMaterial color="#5a4030" roughness={0.9} />
          </mesh>
          {/* Weapon pegs/hooks */}
          <mesh position={[-0.4, 0.8, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.08, 0.2]} />
            <meshStandardMaterial color="#3a2820" roughness={0.85} />
          </mesh>
          <mesh position={[0.4, 0.8, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.08, 0.2]} />
            <meshStandardMaterial color="#3a2820" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.08, 0.2]} />
            <meshStandardMaterial color="#3a2820" roughness={0.85} />
          </mesh>
          {/* Spear/staff resting */}
          <mesh position={[-0.3, 0.6, 0.1]} rotation={[0, 0, 0.1]} receiveShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 6]} />
            <meshStandardMaterial color="#6a5040" roughness={0.88} />
          </mesh>
          {/* Sword shape */}
          <mesh position={[0.3, 0.7, 0.08]} receiveShadow>
            <boxGeometry args={[0.08, 0.9, 0.02]} />
            <meshStandardMaterial color="#8a8a8a" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      );
    case InteriorPropType.PRODUCE_BASKET:
      // Agricultural produce storage
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <ContactShadow size={[0.8, 0.8]} />
          {/* Woven basket */}
          <mesh receiveShadow>
            <cylinderGeometry args={[0.35, 0.3, 0.5, 12]} />
            <meshStandardMaterial color="#a08050" roughness={0.92} />
          </mesh>
          {/* Produce mound */}
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color="#7a9a50" roughness={0.85} />
          </mesh>
          {/* A few individual items */}
          <mesh position={[0.15, 0.35, 0.1]} receiveShadow>
            <sphereGeometry args={[0.08, 6, 4]} />
            <meshStandardMaterial color="#c4a030" roughness={0.8} />
          </mesh>
          <mesh position={[-0.1, 0.38, -0.08]} receiveShadow>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color="#8a5030" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.ROPE_COIL:
      // Transport/travel equipment
      return (
        <group {...common} position={anchoredPos(0.15)}>
          <ContactShadow size={[0.6, 0.6]} />
          {/* Coiled rope */}
          <mesh receiveShadow>
            <torusGeometry args={[0.2, 0.05, 8, 16]} />
            <meshStandardMaterial color="#a08860" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]} receiveShadow>
            <torusGeometry args={[0.18, 0.05, 8, 16]} />
            <meshStandardMaterial color="#9a8255" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.24, 0]} receiveShadow>
            <torusGeometry args={[0.15, 0.05, 8, 16]} />
            <meshStandardMaterial color="#a08860" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.WATER_JUG:
      // Simple water container
      return (
        <group {...common} position={anchoredPos(0.2)}>
          <ContactShadow size={[0.4, 0.4]} />
          {/* Clay jug body */}
          <mesh receiveShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.35, 10]} />
            <meshStandardMaterial color="#b08060" roughness={0.85} />
          </mesh>
          {/* Neck */}
          <mesh position={[0, 0.22, 0]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.1, 0.12, 10]} />
            <meshStandardMaterial color="#a07050" roughness={0.85} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.14, 0.1, 0]} rotation={[0, 0, 0.3]} receiveShadow>
            <torusGeometry args={[0.08, 0.02, 6, 8, Math.PI]} />
            <meshStandardMaterial color="#a07050" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CHEST: {
      // Medieval storage chest with metal hardware, lock, and decorative bands
      const chestWood = '#6a4a32';
      const darkWood = '#5a3d28';
      const lightWood = '#8a6b4f';
      const ironHardware = '#3a3a3a';
      const brass = '#b8860b';

      return (
        <group {...common} position={anchoredPos(0.3)}>
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
          <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
            <boxGeometry args={[1.18, 0.08, 0.63]} />
            <meshStandardMaterial color={lightWood} roughness={0.85} />
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

          {/* Horizontal metal bands */}
          <mesh position={[0, 0.12, 0.335]} receiveShadow castShadow>
            <boxGeometry args={[1.25, 0.05, 0.02]} />
            <meshStandardMaterial color={ironHardware} roughness={0.55} metalness={0.75} />
          </mesh>
          <mesh position={[0, -0.12, 0.335]} receiveShadow castShadow>
            <boxGeometry args={[1.25, 0.05, 0.02]} />
            <meshStandardMaterial color={ironHardware} roughness={0.55} metalness={0.75} />
          </mesh>

          {/* Lock plate and keyhole */}
          <mesh position={[0, 0.05, 0.34]} receiveShadow castShadow>
            <boxGeometry args={[0.18, 0.22, 0.015]} />
            <meshStandardMaterial color={brass} roughness={0.4} metalness={0.85} />
          </mesh>
          {/* Keyhole */}
          <mesh position={[0, 0.05, 0.35]} receiveShadow castShadow>
            <cylinderGeometry args={[0.02, 0.015, 0.02, 8]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0.35]} receiveShadow castShadow>
            <boxGeometry args={[0.008, 0.03, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.3} />
          </mesh>

          {/* Decorative rivets on metal bands */}
          {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
            <group key={`rivet-group-${i}`}>
              <mesh position={[x, 0.12, 0.345]} castShadow>
                <sphereGeometry args={[0.015, 6, 4]} />
                <meshStandardMaterial color={brass} roughness={0.45} metalness={0.8} />
              </mesh>
              <mesh position={[x, -0.12, 0.345]} castShadow>
                <sphereGeometry args={[0.015, 6, 4]} />
                <meshStandardMaterial color={brass} roughness={0.45} metalness={0.8} />
              </mesh>
            </group>
          ))}

          {/* Side hinges */}
          {[-0.5, 0.5].map((x, i) => (
            <group key={`hinge-${i}`}>
              <mesh position={[x, 0.28, -0.33]} receiveShadow castShadow>
                <boxGeometry args={[0.08, 0.04, 0.06]} />
                <meshStandardMaterial color={ironHardware} roughness={0.5} metalness={0.8} />
              </mesh>
              <mesh position={[x, 0.28, -0.33]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} rotation={[0, 0, Math.PI / 2]} />
                <meshStandardMaterial color={brass} roughness={0.4} metalness={0.85} />
              </mesh>
            </group>
          ))}

          {/* Wood grain detail planks */}
          {[-0.3, 0, 0.3].map((x, i) => (
            <mesh key={`plank-${i}`} position={[x, 0, 0.33]} receiveShadow>
              <boxGeometry args={[0.25, 0.52, 0.01]} />
              <meshStandardMaterial color={lightWood} roughness={0.87} />
            </mesh>
          ))}
        </group>
      );
    }
    case InteriorPropType.AMPHORA:
      return (
        <group {...common} position={anchoredPos(0.28)}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.25, 0.35, 0.55, 10]} />
            <meshStandardMaterial color="#a46a3f" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.CRATE: {
      // Realistic wooden crate with individual slats, corner posts, and metal bands
      const crateWood = '#7a5a3a';
      const darkWood = '#5a3f2a';
      const metalBand = '#4a4a4a';
      const crateWidth = 0.9;
      const crateHeight = 0.5;
      const crateDepth = 0.9;

      return (
        <group {...common} position={anchoredPos(crateHeight / 2)}>
          <ContactShadow size={[crateWidth, crateDepth]} />

          {/* Corner posts */}
          {[
            [-crateWidth / 2 + 0.03, 0, -crateDepth / 2 + 0.03],
            [crateWidth / 2 - 0.03, 0, -crateDepth / 2 + 0.03],
            [-crateWidth / 2 + 0.03, 0, crateDepth / 2 - 0.03],
            [crateWidth / 2 - 0.03, 0, crateDepth / 2 - 0.03],
          ].map((pos, idx) => (
            <mesh key={`post-${idx}`} position={pos as [number, number, number]} receiveShadow castShadow>
              <boxGeometry args={[0.06, crateHeight, 0.06]} />
              <meshStandardMaterial color={darkWood} roughness={0.92} />
            </mesh>
          ))}

          {/* Front slats */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = -crateHeight / 2 + 0.06 + i * 0.11;
            return (
              <mesh key={`front-${i}`} position={[0, y, crateDepth / 2]} receiveShadow castShadow>
                <boxGeometry args={[crateWidth - 0.1, 0.08, 0.03]} />
                <meshStandardMaterial color={crateWood} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Back slats */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = -crateHeight / 2 + 0.06 + i * 0.11;
            return (
              <mesh key={`back-${i}`} position={[0, y, -crateDepth / 2]} receiveShadow castShadow>
                <boxGeometry args={[crateWidth - 0.1, 0.08, 0.03]} />
                <meshStandardMaterial color={crateWood} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Left slats */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = -crateHeight / 2 + 0.06 + i * 0.11;
            return (
              <mesh key={`left-${i}`} position={[-crateWidth / 2, y, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.03, 0.08, crateDepth - 0.1]} />
                <meshStandardMaterial color={crateWood} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Right slats */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = -crateHeight / 2 + 0.06 + i * 0.11;
            return (
              <mesh key={`right-${i}`} position={[crateWidth / 2, y, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.03, 0.08, crateDepth - 0.1]} />
                <meshStandardMaterial color={crateWood} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Bottom slats */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -crateWidth / 2 + 0.1 + i * 0.15;
            return (
              <mesh key={`bottom-${i}`} position={[x, -crateHeight / 2, 0]} receiveShadow>
                <boxGeometry args={[0.08, 0.03, crateDepth - 0.1]} />
                <meshStandardMaterial color={darkWood} roughness={0.92} />
              </mesh>
            );
          })}

          {/* Metal reinforcement bands */}
          <mesh position={[0, crateHeight / 2 - 0.08, 0]} receiveShadow castShadow>
            <boxGeometry args={[crateWidth + 0.02, 0.03, crateDepth + 0.02]} />
            <meshStandardMaterial color={metalBand} roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, -crateHeight / 2 + 0.08, 0]} receiveShadow castShadow>
            <boxGeometry args={[crateWidth + 0.02, 0.03, crateDepth + 0.02]} />
            <meshStandardMaterial color={metalBand} roughness={0.5} metalness={0.7} />
          </mesh>

          {/* Nails visible on slats */}
          {[-0.3, 0, 0.3].map((x, i) => (
            <mesh key={`nail-${i}`} position={[x, crateHeight / 2 - 0.15, crateDepth / 2 + 0.02]} castShadow>
              <cylinderGeometry args={[0.008, 0.01, 0.04, 6]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.8} />
            </mesh>
          ))}
        </group>
      );
    }
    case InteriorPropType.CUSHION: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 7 + prop.position[2] * 9) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);

      // Rich 14th century fabric color palettes
      const colorPalettes = [
        { base: '#c84848', accent: '#f8d888', name: 'crimson' },
        { base: '#4858d8', accent: '#f8e8c8', name: 'royal blue' },
        { base: '#9848d8', accent: '#e8d8b8', name: 'purple' },
        { base: '#48b848', accent: '#f8f8e8', name: 'emerald' },
        { base: '#d8a838', accent: '#8a5a2a', name: 'gold' },
        { base: '#c86848', accent: '#f8e8d8', name: 'terracotta' },
        { base: '#48c8c8', accent: '#f8d888', name: 'turquoise' },
        { base: '#d848b8', accent: '#f8f8e8', name: 'magenta' },
      ];

      const colors = colorPalettes[Math.floor(rand() * colorPalettes.length)];

      const w = 0.85 + rand() * 0.35; // Wider cushions
      const d = 0.85 + rand() * 0.35;
      const h = 0.14 + rand() * 0.06; // Much flatter/shorter

      // Four distinct cushion styles
      const styleRoll = rand();
      const style = styleRoll < 0.25 ? 'satin-round' : styleRoll < 0.5 ? 'striped-square' : styleRoll < 0.75 ? 'octagonal-tufted' : 'embroidered-round';

      if (style === 'satin-round') {
        // Circular cushion with piping and subtle satin textile sheen
        return (
          <group {...common} position={anchoredPos(h / 2)}>
            <ContactShadow size={[w, d]} />

            {/* Main cushion body - flat with slight bulge */}
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[w * 0.48, w * 0.49, h, 24]} />
              <meshStandardMaterial color={colors.base} roughness={0.35} metalness={0.08} />
            </mesh>

            {/* Horizontal piping around edge */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <torusGeometry args={[w * 0.48, 0.02, 8, 24]} />
              <meshStandardMaterial color={colors.accent} roughness={0.4} metalness={0.06} />
            </mesh>

            {/* Center button with fabric gather */}
            <mesh position={[0, h / 2 + 0.015, 0]} receiveShadow castShadow>
              <sphereGeometry args={[0.038, 10, 8]} />
              <meshStandardMaterial color={colors.accent} roughness={0.5} metalness={0.05} />
            </mesh>

            {/* Radiating gathers from button */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <mesh
                  key={`gather-${i}`}
                  position={[0, h / 2 + 0.006, 0]}
                  rotation={[0, angle, 0]}
                  receiveShadow
                >
                  <boxGeometry args={[w * 0.35, 0.01, 0.02]} />
                  <meshStandardMaterial color={colors.base} roughness={0.4} metalness={0.06} transparent opacity={0.6} />
                </mesh>
              );
            })}
          </group>
        );
      } else if (style === 'striped-square') {
        // Square cushion with stripes and corner tassels
        const stripeColor1 = colors.base;
        const stripeColor2 = colors.accent;

        return (
          <group {...common} position={anchoredPos(h / 2)}>
            <ContactShadow size={[w, d]} />

            {/* Main cushion base layer - flat */}
            <mesh receiveShadow castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={stripeColor1} roughness={0.65} metalness={0.04} />
            </mesh>

            {/* Decorative stripes across cushion */}
            {Array.from({ length: 5 }).map((_, i) => {
              const offset = -w * 0.4 + (i * w * 0.2);
              return (
                <mesh key={`stripe-${i}`} position={[offset, h / 2 + 0.008, 0]} receiveShadow castShadow>
                  <boxGeometry args={[w * 0.12, 0.012, d * 0.96]} />
                  <meshStandardMaterial color={stripeColor2} roughness={0.7} metalness={0.03} />
                </mesh>
              );
            })}

            {/* Edge trim/piping on all four sides */}
            <mesh position={[0, h / 2 + 0.006, d / 2]} receiveShadow castShadow>
              <boxGeometry args={[w * 1.02, 0.015, 0.028]} />
              <meshStandardMaterial color={stripeColor2} roughness={0.6} metalness={0.04} />
            </mesh>
            <mesh position={[0, h / 2 + 0.006, -d / 2]} receiveShadow castShadow>
              <boxGeometry args={[w * 1.02, 0.015, 0.028]} />
              <meshStandardMaterial color={stripeColor2} roughness={0.6} metalness={0.04} />
            </mesh>
            <mesh position={[w / 2, h / 2 + 0.006, 0]} receiveShadow castShadow>
              <boxGeometry args={[0.028, 0.015, d * 1.02]} />
              <meshStandardMaterial color={stripeColor2} roughness={0.6} metalness={0.04} />
            </mesh>
            <mesh position={[-w / 2, h / 2 + 0.006, 0]} receiveShadow castShadow>
              <boxGeometry args={[0.028, 0.015, d * 1.02]} />
              <meshStandardMaterial color={stripeColor2} roughness={0.6} metalness={0.04} />
            </mesh>

            {/* Corner tassels */}
            {[
              [w / 2 + 0.02, h / 2 + 0.012, d / 2 + 0.02],
              [-w / 2 - 0.02, h / 2 + 0.012, d / 2 + 0.02],
              [w / 2 + 0.02, h / 2 + 0.012, -d / 2 - 0.02],
              [-w / 2 - 0.02, h / 2 + 0.012, -d / 2 - 0.02],
            ].map((pos, idx) => (
              <group key={`tassel-${idx}`} position={pos as [number, number, number]}>
                {/* Tassel knot */}
                <mesh receiveShadow castShadow>
                  <sphereGeometry args={[0.03, 8, 6]} />
                  <meshStandardMaterial color={stripeColor2} roughness={0.7} metalness={0.02} />
                </mesh>
                {/* Tassel threads */}
                <mesh position={[0, -0.04, 0]} receiveShadow castShadow>
                  <coneGeometry args={[0.02, 0.07, 8]} />
                  <meshStandardMaterial color={stripeColor2} roughness={0.75} metalness={0.0} />
                </mesh>
              </group>
            ))}
          </group>
        );
      } else if (style === 'octagonal-tufted') {
        // Octagonal cushion with tufted pattern
        return (
          <group {...common} position={anchoredPos(h / 2)}>
            <ContactShadow size={[w, d]} />

            {/* Main octagonal cushion body - flat */}
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[w * 0.47, w * 0.49, h, 8]} />
              <meshStandardMaterial color={colors.base} roughness={0.55} metalness={0.05} />
            </mesh>

            {/* Horizontal piping around edge */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <torusGeometry args={[w * 0.47, 0.018, 8, 8]} />
              <meshStandardMaterial color={colors.accent} roughness={0.5} metalness={0.05} />
            </mesh>

            {/* Tufted button pattern - center and 8 surrounding */}
            <mesh position={[0, h / 2 + 0.012, 0]} receiveShadow castShadow>
              <sphereGeometry args={[0.032, 8, 6]} />
              <meshStandardMaterial color={colors.accent} roughness={0.55} metalness={0.04} />
            </mesh>

            {/* Surrounding tufting buttons */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const x = Math.cos(angle) * w * 0.25;
              const z = Math.sin(angle) * d * 0.25;
              return (
                <mesh key={`tuft-${i}`} position={[x, h / 2 + 0.01, z]} receiveShadow castShadow>
                  <sphereGeometry args={[0.024, 6, 5]} />
                  <meshStandardMaterial color={colors.accent} roughness={0.55} metalness={0.04} />
                </mesh>
              );
            })}

            {/* Subtle fabric folds between tufts */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <mesh
                  key={`fold-${i}`}
                  position={[0, h / 2 + 0.004, 0]}
                  rotation={[0, angle, 0]}
                  receiveShadow
                >
                  <boxGeometry args={[w * 0.3, 0.008, 0.018]} />
                  <meshStandardMaterial color={colors.base} roughness={0.6} metalness={0.03} transparent opacity={0.5} />
                </mesh>
              );
            })}
          </group>
        );
      } else {
        // Embroidered round cushion with decorative patterns
        return (
          <group {...common} position={anchoredPos(h / 2)}>
            <ContactShadow size={[w, d]} />

            {/* Main round cushion body - flat */}
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[w * 0.46, w * 0.48, h, 20]} />
              <meshStandardMaterial color={colors.base} roughness={0.65} metalness={0.04} />
            </mesh>

            {/* Horizontal piping around edge */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <torusGeometry args={[w * 0.46, 0.016, 8, 20]} />
              <meshStandardMaterial color={colors.accent} roughness={0.55} metalness={0.04} />
            </mesh>

            {/* Embroidered flower pattern in center */}
            <mesh position={[0, h / 2 + 0.01, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.012, 8]} />
              <meshStandardMaterial color={colors.accent} roughness={0.65} metalness={0.03} />
            </mesh>

            {/* Flower petals */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const x = Math.cos(angle) * 0.09;
              const z = Math.sin(angle) * 0.09;
              return (
                <mesh key={`petal-${i}`} position={[x, h / 2 + 0.012, z]} receiveShadow castShadow>
                  <sphereGeometry args={[0.03, 8, 6]} />
                  <meshStandardMaterial color={colors.accent} roughness={0.65} metalness={0.03} />
                </mesh>
              );
            })}

            {/* Decorative stitching pattern around edge */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              const x = Math.cos(angle) * w * 0.38;
              const z = Math.sin(angle) * d * 0.38;
              return (
                <mesh key={`stitch-${i}`} position={[x, h / 2 + 0.008, z]} receiveShadow>
                  <sphereGeometry args={[0.012, 6, 4]} />
                  <meshStandardMaterial color={colors.accent} roughness={0.7} metalness={0.02} />
                </mesh>
              );
            })}
          </group>
        );
      }
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
    case InteriorPropType.LAMP: {
      // Ornate oil lamp with glass globe, brass stand, and decorative elements
      const brassColor = '#b8860b';
      const darkBrass = '#8a6409';
      const glassColor = '#d8e8f0';

      return (
        <group {...common} position={anchoredPos(0.2)}>
          <ContactShadow size={[0.4, 0.4]} />

          {/* Point light for actual illumination */}
          <pointLight
            position={[0, 0.4, 0]}
            color="#ffc470"
            intensity={1.2}
            distance={4}
            decay={2}
          />

          {/* Base plate */}
          <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.04, 12]} />
            <meshStandardMaterial color={brassColor} roughness={0.45} metalness={0.85} />
          </mesh>

          {/* Decorative base ring */}
          <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
            <torusGeometry args={[0.17, 0.015, 8, 12]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.9} />
          </mesh>

          {/* Central pedestal */}
          <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.22, 8]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative knob on pedestal */}
          <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshStandardMaterial color={darkBrass} roughness={0.45} metalness={0.85} />
          </mesh>

          {/* Oil reservoir (bowl) */}
          <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.14, 0.16, 0.08, 12]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative band on reservoir */}
          <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.145, 0.145, 0.02, 16]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Wick holder (burner) */}
          <mesh position={[0, 0.34, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.06, 10]} />
            <meshStandardMaterial color={darkBrass} roughness={0.55} metalness={0.75} />
          </mesh>

          {/* Glass chimney/globe - transparent with slight tint */}
          <mesh position={[0, 0.48, 0]} receiveShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.32, 12, 1, true]} />
            <meshStandardMaterial
              color={glassColor}
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.0}
              side={2}
            />
          </mesh>

          {/* Glass globe top cap */}
          <mesh position={[0, 0.65, 0]} receiveShadow>
            <sphereGeometry args={[0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={glassColor}
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.0}
              side={2}
            />
          </mesh>

          {/* Brass top finial */}
          <mesh position={[0, 0.68, 0]} receiveShadow castShadow>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshStandardMaterial color={brassColor} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Handle (curved) */}
          <mesh position={[0.16, 0.35, 0]} rotation={[0, 0, -Math.PI / 6]} receiveShadow castShadow>
            <torusGeometry args={[0.08, 0.015, 8, 12, Math.PI]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Handle attachment points */}
          <mesh position={[0.12, 0.3, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.04, 6]} />
            <meshStandardMaterial color={darkBrass} roughness={0.45} metalness={0.85} />
          </mesh>
          <mesh position={[0.15, 0.44, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.04, 6]} />
            <meshStandardMaterial color={darkBrass} roughness={0.45} metalness={0.85} />
          </mesh>

          {/* Flame inside glass */}
          <Flame position={[0, 0.42, 0]} size={0.11} color="#ffc888" emissive="#ff9a3c" />
        </group>
      );
    }
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
    case InteriorPropType.FLOOR_LAMP: {
      // Standing floor oil lamp - tall version of the tabletop lamp
      const brassColor = '#b8860b';
      const darkBrass = '#8a6409';
      const glassColor = '#d8e8f0';

      return (
        <group {...common} position={anchoredPos(0)}>
          <ContactShadow size={[0.6, 0.6]} />

          {/* Point light for actual illumination */}
          <pointLight
            position={[0, 1.55, 0]}
            color="#ffc470"
            intensity={2.2}
            distance={7}
            decay={2}
          />

          {/* Large base plate - weighted for stability */}
          <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.28, 0.32, 0.06, 16]} />
            <meshStandardMaterial color={brassColor} roughness={0.45} metalness={0.85} />
          </mesh>

          {/* Decorative base ring */}
          <mesh position={[0, 0.07, 0]} receiveShadow castShadow>
            <torusGeometry args={[0.26, 0.02, 8, 16]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.9} />
          </mesh>

          {/* Lower pedestal transition */}
          <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.16, 8]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative knob on lower pedestal */}
          <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={darkBrass} roughness={0.45} metalness={0.85} />
          </mesh>

          {/* Main vertical pole */}
          <mesh position={[0, 0.8, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.04, 0.05, 1.3, 12]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative bands along pole */}
          <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.9, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.85} />
          </mesh>
          <mesh position={[0, 1.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Upper transition piece */}
          <mesh position={[0, 1.38, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.09, 0.06, 0.12, 10]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Oil reservoir (bowl) at top */}
          <mesh position={[0, 1.48, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.1, 14]} />
            <meshStandardMaterial color={brassColor} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative band on reservoir */}
          <mesh position={[0, 1.5, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.165, 0.165, 0.025, 18]} />
            <meshStandardMaterial color={darkBrass} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Wick holder (burner) */}
          <mesh position={[0, 1.55, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.08, 12]} />
            <meshStandardMaterial color={darkBrass} roughness={0.55} metalness={0.75} />
          </mesh>

          {/* Glass chimney/globe - transparent with slight tint */}
          <mesh position={[0, 1.7, 0]} receiveShadow>
            <cylinderGeometry args={[0.13, 0.11, 0.38, 14, 1, true]} />
            <meshStandardMaterial
              color={glassColor}
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.0}
              side={2}
            />
          </mesh>

          {/* Glass globe top cap */}
          <mesh position={[0, 1.9, 0]} receiveShadow>
            <sphereGeometry args={[0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={glassColor}
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.0}
              side={2}
            />
          </mesh>

          {/* Brass top finial */}
          <mesh position={[0, 1.94, 0]} receiveShadow castShadow>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color={brassColor} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Three decorative feet at base */}
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
            <mesh
              key={`foot-${idx}`}
              position={[Math.cos(angle) * 0.25, 0.02, Math.sin(angle) * 0.25]}
              receiveShadow
              castShadow
            >
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color={darkBrass} roughness={0.5} metalness={0.8} />
            </mesh>
          ))}

          {/* Flame inside glass */}
          <Flame position={[0, 1.62, 0]} size={0.13} color="#ffc888" emissive="#ff9a3c" />
        </group>
      );
    }
    case InteriorPropType.LANTERN: {
      // 14th century Damascus geometric metal lantern with randomized shapes and colors
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 29 + prop.position[2] * 37) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);

      const scale = prop.scale ?? [1, 1, 1];
      const lanternScale = Math.max(scale[0], scale[1], scale[2]) * 1.15; // Slightly larger than base

      // Randomize shape: 0=hexagonal, 1=octagonal, 2=cylindrical, 3=star
      const shapeType = Math.floor(rand() * 4);
      const sides = shapeType === 0 ? 6 : shapeType === 1 ? 8 : shapeType === 2 ? 12 : 6;
      const bodyHeight = 0.6 + rand() * 0.2;
      const bodyRadius = 0.35 + rand() * 0.15;

      // Colored glass palette - rich Damascus colors
      const glassColors = [
        { color: '#4a7a9a', emissive: '#3a6a8a' }, // Deep blue
        { color: '#7a4a6a', emissive: '#6a3a5a' }, // Purple
        { color: '#8a5a3a', emissive: '#7a4a2a' }, // Amber
        { color: '#4a7a5a', emissive: '#3a6a4a' }, // Green
        { color: '#9a4a4a', emissive: '#8a3a3a' }, // Ruby red
        { color: '#6a6a8a', emissive: '#5a5a7a' }, // Indigo
      ];

      // Randomize glass color per lantern
      const primaryGlass = glassColors[Math.floor(rand() * glassColors.length)];
      const secondaryGlass = glassColors[Math.floor(rand() * glassColors.length)];

      // Metal colors - brass, copper, bronze
      const metalOptions = ['#b8860b', '#b87333', '#8c7853'];
      const metalColor = metalOptions[Math.floor(rand() * metalOptions.length)];
      const darkMetal = metalColor === '#b8860b' ? '#8a6409' : metalColor === '#b87333' ? '#8a5425' : '#6a5a3a';

      // Point light color based on glass
      const lightColor = rand() > 0.5 ? '#ffb347' : '#ffd7a1';
      const lightIntensity = 3.5 + rand() * 2.5; // Much brighter (3.5-6.0)

      return (
        <group {...common} position={anchoredPos(prop.position[1] > 0 ? prop.position[1] : 2.2)}>
          {/* Point light for actual illumination - outside scaled group */}
          <pointLight
            position={[0, 0, 0]}
            color={lightColor}
            intensity={lightIntensity}
            distance={12}
            decay={1.8}
            castShadow
            shadow-mapSize-width={256}
            shadow-mapSize-height={256}
            shadow-bias={-0.0005}
          />

          <group scale={[lanternScale, lanternScale, lanternScale]}>


          {/* Chain hanging from ceiling */}
          <mesh position={[0, 0.85, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.015, 0.018, 0.8, 8]} />
            <meshStandardMaterial color={darkMetal} roughness={0.6} metalness={0.7} />
          </mesh>

          {/* Top decorative cap with geometric pattern */}
          <mesh position={[0, 0.48, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.14, sides]} />
            <meshStandardMaterial color={metalColor} roughness={0.55} metalness={0.75} />
          </mesh>

          {/* Ornamental band under cap with pierced cutouts */}
          <mesh position={[0, 0.42, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.04, sides * 2]} />
            <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative star cutouts in top band */}
          {Array.from({ length: sides * 2 }).map((_, i) => {
            const angle = (i / (sides * 2)) * Math.PI * 2;
            const x = Math.cos(angle) * 0.175;
            const z = Math.sin(angle) * 0.175;
            return (
              <mesh
                key={`top-star-${i}`}
                position={[x, 0.42, z]}
                rotation={[0, angle, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.015, 0.015, 0.06, 4]} />
                <meshStandardMaterial
                  color={lightColor}
                  emissive={lightColor}
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}

          {/* Vertical hammered metal ribs - structural frame */}
          {Array.from({ length: sides }).map((_, i) => {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * bodyRadius;
            const z = Math.sin(angle) * bodyRadius;
            return (
              <mesh
                key={`rib-${i}`}
                position={[x, 0.15, z]}
                rotation={[0, angle, 0]}
                receiveShadow
                castShadow
              >
                <boxGeometry args={[0.04, bodyHeight * 0.98, 0.03]} />
                <meshStandardMaterial color={darkMetal} roughness={0.65} metalness={0.8} />
              </mesh>
            );
          })}

          {/* Horizontal metal bands connecting ribs - top, middle, bottom */}
          {[0.38, 0.15, -0.08].map((yPos, idx) => (
            <mesh
              key={`h-band-${idx}`}
              position={[0, yPos, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              receiveShadow
              castShadow
            >
              <torusGeometry args={[bodyRadius, 0.012, 6, sides]} />
              <meshStandardMaterial color={darkMetal} roughness={0.6} metalness={0.75} />
            </mesh>
          ))}

          {/* Colored glass panels - fill spaces between ribs, angled inward for geometric look */}
          {Array.from({ length: sides }).map((_, i) => {
            const angle = (i / sides) * Math.PI * 2 + Math.PI / sides;
            // Position slightly inward from rib radius for faceted look
            const inwardRadius = bodyRadius * 0.92;
            const x = Math.cos(angle) * inwardRadius;
            const z = Math.sin(angle) * inwardRadius;
            const glassStyle = i % 2 === 0 ? primaryGlass : secondaryGlass;
            const panelWidth = (2 * Math.PI * bodyRadius) / sides - 0.06;

            return (
              <mesh
                key={`glass-${i}`}
                position={[x, 0.15, z]}
                rotation={[0.08, angle, 0]} // Slight inward tilt
                receiveShadow
              >
                <boxGeometry args={[panelWidth, bodyHeight * 0.85, 0.008]} />
                <meshStandardMaterial
                  color={glassStyle.color}
                  emissive={glassStyle.emissive}
                  emissiveIntensity={1.5}
                  transparent
                  opacity={0.85}
                  roughness={0.15}
                  metalness={0.05}
                />
              </mesh>
            );
          })}

          {/* Middle pierced band with geometric cutouts - lets light create patterns */}
          {Array.from({ length: sides * 3 }).map((_, i) => {
            const angle = (i / (sides * 3)) * Math.PI * 2;
            const x = Math.cos(angle) * (bodyRadius * 1.03);
            const z = Math.sin(angle) * (bodyRadius * 1.03);
            // Alternate between dots and diamonds
            const isDiamond = i % 2 === 0;
            return (
              <mesh
                key={`cutout-${i}`}
                position={[x, 0.15, z]}
                rotation={[0, angle, isDiamond ? Math.PI / 4 : 0]}
                castShadow
              >
                <boxGeometry args={isDiamond ? [0.025, 0.025, 0.04] : [0.015, 0.015, 0.04]} />
                <meshStandardMaterial
                  color={lightColor}
                  emissive={lightColor}
                  emissiveIntensity={0.9}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            );
          })}

          {/* Bottom decorative cap */}
          <mesh position={[0, -0.15 - bodyHeight / 2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.2, 0.16, 0.12, sides]} />
            <meshStandardMaterial color={metalColor} roughness={0.55} metalness={0.75} />
          </mesh>

          {/* Bottom ornamental ring */}
          <mesh position={[0, -0.08 - bodyHeight / 2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.04, sides * 2]} />
            <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Decorative star cutouts in bottom band */}
          {Array.from({ length: sides * 2 }).map((_, i) => {
            const angle = (i / (sides * 2)) * Math.PI * 2;
            const x = Math.cos(angle) * 0.175;
            const z = Math.sin(angle) * 0.175;
            return (
              <mesh
                key={`bottom-star-${i}`}
                position={[x, -0.08 - bodyHeight / 2, z]}
                rotation={[0, angle, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.015, 0.015, 0.06, 4]} />
                <meshStandardMaterial
                  color={lightColor}
                  emissive={lightColor}
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}

          {/* Hanging finial/drop */}
          <mesh position={[0, -0.24 - bodyHeight / 2, 0]} receiveShadow castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.85} />
          </mesh>

          {/* Internal flame */}
          <Flame position={[0, 0.12, 0]} size={0.12} color={lightColor} emissive="#ff8a2e" />
          </group>
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
    case InteriorPropType.BOLT_OF_CLOTH: {
      // Pile of 3-4 rolled textile bolts in different colors
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 11 + prop.position[2] * 13) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);

      // Fabric options with color and texture properties
      const fabricOptions = [
        { base: '#c84848', accent: '#a83838', roughness: 0.3, metalness: 0.1 },  // Crimson silk
        { base: '#4858a8', accent: '#3848b8', roughness: 0.3, metalness: 0.1 },  // Sapphire
        { base: '#48a868', accent: '#38a848', roughness: 0.3, metalness: 0.1 },  // Emerald
        { base: '#d8a838', accent: '#b88828', roughness: 0.4, metalness: 0.08 }, // Gold brocade
        { base: '#8a6a4a', accent: '#6a4a3a', roughness: 0.85, metalness: 0.0 }, // Brown linen
        { base: '#c89870', accent: '#a87850', roughness: 0.8, metalness: 0.0 },  // Beige cotton
        { base: '#9848a8', accent: '#7838b8', roughness: 0.35, metalness: 0.1 }, // Purple
        { base: '#48b8b8', accent: '#38a8a8', roughness: 0.3, metalness: 0.1 },  // Turquoise
        { base: '#f8f0e0', accent: '#e8e0d0', roughness: 0.5, metalness: 0.05 }, // Ivory
        { base: '#c86848', accent: '#a84838', roughness: 0.45, metalness: 0.08 }, // Terracotta
        { base: '#6a5878', accent: '#5a4868', roughness: 0.4, metalness: 0.1 },  // Dusty violet
        { base: '#b8a080', accent: '#a89070', roughness: 0.75, metalness: 0.0 }, // Tan wool
      ];

      // Randomly select 3-4 unique fabrics
      const numBolts = 3 + (rand() > 0.5 ? 1 : 0);
      const shuffled = [...fabricOptions].sort(() => rand() - 0.5);
      const selectedFabrics = shuffled.slice(0, numBolts);

      // Pre-calculate radii for positioning
      const baseRadius = 0.08;

      return (
        <group {...common} position={anchoredPos(0)}>
          {selectedFabrics.map((fabric, i) => {
            const length = 0.5 + rand() * 0.15;
            const radius = 0.07 + rand() * 0.02;
            // Bottom row: y = radius so bolts sit on floor
            // Top row: y = radius * 2 + bottomRadius so they stack
            const isTopRow = i >= 2;
            const xOffset = i === 0 ? -0.16 : i === 1 ? 0.16 : i === 2 ? 0 : 0.1;
            const zOffset = (rand() - 0.5) * 0.04;
            const yPos = isTopRow ? baseRadius * 2 + radius : radius;
            const rotY = (rand() - 0.5) * 0.3;

            return (
              <group key={`bolt-${i}`} position={[xOffset, yPos, zOffset]} rotation={[0, rotY, 0]}>
                {/* Main fabric roll */}
                <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow castShadow>
                  <cylinderGeometry args={[radius, radius, length, 16]} />
                  <meshStandardMaterial
                    color={fabric.base}
                    roughness={fabric.roughness}
                    metalness={fabric.metalness}
                  />
                </mesh>

                {/* Visible rolled edge on one end */}
                <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
                  <torusGeometry args={[radius * 0.7, 0.006, 6, 16]} />
                  <meshStandardMaterial color={fabric.accent} roughness={fabric.roughness + 0.1} />
                </mesh>

                {/* Wooden spindle core peeking out */}
                <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
                  <cylinderGeometry args={[radius * 0.18, radius * 0.18, length + 0.06, 8]} />
                  <meshStandardMaterial color="#5a4030" roughness={0.9} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    }
    case InteriorPropType.BASKET: {
      // Realistic woven basket with multiple segments and handles
      const basketColor = '#9a7b50';
      const weaveColor = '#8a6b4f';
      const darkWeave = '#7a5b3f';

      return (
        <group {...common} position={anchoredPos(0.25)}>
          {/* Base */}
          <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.32, 0.35, 0.06, 16]} />
            <meshStandardMaterial color={darkWeave} roughness={0.95} />
          </mesh>

          {/* Main basket body - segmented for woven appearance */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = 0.08 + i * 0.09;
            const topRadius = 0.36 - i * 0.015;
            const bottomRadius = 0.38 - i * 0.015;
            const color = i % 2 === 0 ? basketColor : weaveColor;

            return (
              <mesh key={`segment-${i}`} position={[0, y, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[topRadius, bottomRadius, 0.08, 16]} />
                <meshStandardMaterial color={color} roughness={0.92} />
              </mesh>
            );
          })}

          {/* Rim */}
          <mesh position={[0, 0.52, 0]} receiveShadow castShadow>
            <torusGeometry args={[0.35, 0.025, 8, 16]} />
            <meshStandardMaterial color={darkWeave} roughness={0.88} />
          </mesh>

          {/* Vertical weave ribs for texture */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * 0.37;
            const z = Math.sin(angle) * 0.37;

            return (
              <mesh
                key={`rib-${i}`}
                position={[x, 0.28, z]}
                rotation={[0, angle, 0]}
                receiveShadow
              >
                <boxGeometry args={[0.015, 0.48, 0.015]} />
                <meshStandardMaterial color={darkWeave} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Handle 1 */}
          <group position={[0.32, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh receiveShadow castShadow>
              <torusGeometry args={[0.15, 0.02, 6, 10, Math.PI]} />
              <meshStandardMaterial color={basketColor} roughness={0.88} />
            </mesh>
          </group>

          {/* Handle 2 (opposite side) */}
          <group position={[-0.32, 0.35, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <mesh receiveShadow castShadow>
              <torusGeometry args={[0.15, 0.02, 6, 10, Math.PI]} />
              <meshStandardMaterial color={basketColor} roughness={0.88} />
            </mesh>
          </group>
        </group>
      );
    }
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

      // Vivid color palettes - richer tones for floor pillows
      const vividPalettes = [
        ['#d84848', '#c83838', '#e85858'], // Crimson reds
        ['#4868d8', '#3858c8', '#5878e8'], // Sapphire blues
        ['#9848d8', '#8838c8', '#a858e8'], // Amethyst purples
        ['#48b848', '#38a838', '#58c858'], // Jade greens
        ['#e8b838', '#d8a828', '#f8c848'], // Saffron golds
        ['#d87848', '#c86838', '#e88858'], // Terracotta
        ['#48c8c8', '#38b8b8', '#58d8d8'], // Cyan
        ['#d848b8', '#c838a8', '#e858c8'], // Fuchsia
      ];

      const palette = vividPalettes[Math.floor(rand() * vividPalettes.length)];
      const base = palette[Math.floor(rand() * palette.length)];
      const accentColors = ['#f8f8e8', '#e8e8d8', '#f8e8c8', '#ffe8a8'];
      const trim = accentColors[Math.floor(rand() * accentColors.length)];

      const w = 0.7 + rand() * 0.3;
      const d = 0.7 + rand() * 0.3;
      const h = 0.3 + rand() * 0.12; // Thicker floor pillows

      // Three texture types: silk, linen, damask
      const textureRoll = rand();
      const textureType = textureRoll < 0.33 ? 'silk' : textureRoll < 0.66 ? 'linen' : 'damask';

      // Material properties based on texture
      const materialProps = textureType === 'silk'
        ? { roughness: 0.25, metalness: 0.15 } // Smooth and lustrous silk
        : textureType === 'linen'
        ? { roughness: 0.9, metalness: 0.0 } // Matte and textured linen
        : { roughness: 0.45, metalness: 0.08 }; // Damask - subtle sheen

      const shapeRoll = rand();
      const shape = shapeRoll < 0.12 ? 'oct' : shapeRoll < 0.7 ? 'square' : 'round';

      return (
        <group {...common} position={anchoredPos(h / 2)}>
          {/* Main pillow body */}
          {shape === 'square' && (
            <mesh receiveShadow castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={base} {...materialProps} />
            </mesh>
          )}
          {shape === 'round' && (
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.53, h, 24]} />
              <meshStandardMaterial color={base} {...materialProps} />
            </mesh>
          )}
          {shape === 'oct' && (
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[w * 0.5, w * 0.53, h, 8]} />
              <meshStandardMaterial color={base} {...materialProps} />
            </mesh>
          )}

          {/* Decorative piping/trim around edges */}
          <mesh position={[0, h / 2 + 0.012, 0]} receiveShadow>
            <torusGeometry args={[w * 0.43, 0.025, 6, shape === 'square' ? 4 : shape === 'oct' ? 8 : 20]} />
            <meshStandardMaterial color={trim} roughness={0.35} metalness={0.25} />
          </mesh>

          {/* Texture-specific decorative details */}
          {textureType === 'damask' && (
            <>
              {/* Damask - ornate center medallion */}
              <mesh position={[0, h / 2 + 0.018, 0]} receiveShadow>
                <cylinderGeometry args={[w * 0.18, w * 0.18, 0.02, 12]} />
                <meshStandardMaterial color={trim} roughness={0.4} metalness={0.2} />
              </mesh>
              {/* Radiating pattern elements */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * w * 0.28;
                const z = Math.sin(angle) * d * 0.28;
                return (
                  <mesh key={`petal-${i}`} position={[x, h / 2 + 0.018, z]} receiveShadow>
                    <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
                    <meshStandardMaterial color={trim} roughness={0.4} metalness={0.2} />
                  </mesh>
                );
              })}
            </>
          )}

          {textureType === 'silk' && (
            <>
              {/* Silk - tufted button center */}
              <mesh position={[0, h / 2 + 0.02, 0]} receiveShadow>
                <sphereGeometry args={[0.05, 10, 8]} />
                <meshStandardMaterial color={trim} roughness={0.2} metalness={0.35} />
              </mesh>
              {/* Radiating pleats/folds */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                return (
                  <mesh
                    key={`pleat-${i}`}
                    position={[0, h / 2 + 0.008, 0]}
                    rotation={[0, angle, 0]}
                    receiveShadow
                  >
                    <boxGeometry args={[w * 0.5, 0.01, 0.03]} />
                    <meshStandardMaterial color={base} {...materialProps} opacity={0.7} transparent />
                  </mesh>
                );
              })}
            </>
          )}

          {textureType === 'linen' && (
            <>
              {/* Linen - simple embroidered border pattern */}
              <mesh position={[0, h / 2 + 0.012, 0]} receiveShadow>
                <boxGeometry args={[w * 0.65, 0.018, d * 0.08]} />
                <meshStandardMaterial color={trim} roughness={0.85} />
              </mesh>
              <mesh position={[0, h / 2 + 0.012, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[d * 0.65, 0.018, w * 0.08]} />
                <meshStandardMaterial color={trim} roughness={0.85} />
              </mesh>
              {/* Corner tassels */}
              {[-w * 0.4, w * 0.4].map((x) =>
                [-d * 0.4, d * 0.4].map((z, idx) => (
                  <group key={`tassel-${x}-${z}-${idx}`} position={[x, h / 2 + 0.015, z]}>
                    <mesh receiveShadow>
                      <sphereGeometry args={[0.03, 6, 5]} />
                      <meshStandardMaterial color={trim} roughness={0.75} />
                    </mesh>
                  </group>
                ))
              )}
            </>
          )}
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
    case InteriorPropType.MEDICINE_SHELF:
      return <MedicineShelf position={anchoredPos(0)} rotation={rotation} />;
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
