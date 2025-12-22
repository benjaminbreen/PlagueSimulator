
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';
import { getTerrainHeight } from '../utils/terrain';
import { PushableObject } from '../utils/pushables';

// Utility to generate a procedural noise texture to avoid external loading errors
const createNoiseTexture = (size = 256, opacity = 0.2) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const val = Math.random() * 255;
    imageData.data[i] = val;
    imageData.data[i + 1] = val;
    imageData.data[i + 2] = val;
    imageData.data[i + 3] = 255 * opacity;
  }
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createBlotchTexture = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 120;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const HOVER_WIREFRAME_COLORS = {
  default: '#3bdc7f',
  poi: '#f4c542',
  danger: '#ef5a4c'
};

const HoverWireframeContext = React.createContext(false);
const HoverLabelContext = React.createContext(false);

const useHoverFade = (ref: React.RefObject<THREE.Object3D>, active: boolean, opacity = 0.35) => {
  const originals = useRef(new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!originals.current.has(mat)) {
          originals.current.set(mat, {
            opacity: mat.opacity ?? 1,
            transparent: mat.transparent ?? false,
            depthWrite: mat.depthWrite ?? true
          });
        }
        if (active) {
          mat.transparent = true;
          mat.opacity = Math.min(mat.opacity ?? 1, opacity);
          mat.depthWrite = false;
          mat.needsUpdate = true;
        } else {
          const original = originals.current.get(mat);
          if (original) {
            mat.opacity = original.opacity;
            mat.transparent = original.transparent;
            mat.depthWrite = original.depthWrite;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [active, opacity, ref]);
};

const HoverOutlineBox: React.FC<{ size: [number, number, number]; color: string; opacity?: number; position?: [number, number, number] }> = ({ size, color, opacity = 0.85, position }) => {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), [size[0], size[1], size[2]]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  return <lineSegments geometry={geometry} material={material} position={position} />;
};

const HoverLabel: React.FC<{ title: string; lines?: string[]; offset?: [number, number, number] }> = ({ title, lines = [], offset = [0, 1.4, 0] }) => (
  <Html position={offset} center>
    <div className="pointer-events-none rounded-lg border border-amber-700/40 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="text-[11px] text-amber-400">{title}</div>
      {lines.length > 0 && (
        <div className="mt-1 space-y-0.5 text-[9px] text-amber-200/70">
          {lines.slice(0, 4).map((line, index) => (
            <div key={`${title}-line-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  </Html>
);

const HoverableGroup: React.FC<{
  position?: [number, number, number];
  positionVector?: THREE.Vector3;
  boxSize: [number, number, number];
  boxOffset?: [number, number, number];
  color?: string;
  labelTitle?: string;
  labelLines?: string[];
  labelOffset?: [number, number, number];
  children: React.ReactNode;
}> = ({ position, positionVector, boxSize, boxOffset, color = HOVER_WIREFRAME_COLORS.default, labelTitle, labelLines, labelOffset, children }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  useHoverFade(groupRef, wireframeEnabled && hovered);

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
      {labelEnabled && hovered && labelTitle && <HoverLabel title={labelTitle} lines={labelLines} offset={labelOffset} />}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={boxSize} color={color} position={boxOffset} />
          <HoverOutlineBox size={[boxSize[0] * 1.04, boxSize[1] * 1.04, boxSize[2] * 1.04]} color={color} opacity={0.35} position={boxOffset} />
        </>
      )}
    </group>
  );
};

const createStripeTexture = (colorA: string, colorB: string, stripeCount = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stripeWidth = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const useNightTintedMaterial = (
  baseMaterial: THREE.Material,
  nightFactor: number,
  tintColor: string,
  darkenScale = 0.6
) => {
  const material = useMemo(() => {
    if (baseMaterial instanceof THREE.MeshStandardMaterial) {
      return baseMaterial.clone();
    }
    return baseMaterial;
  }, [baseMaterial]);

  useEffect(() => {
    if (!(material instanceof THREE.MeshStandardMaterial) || !(baseMaterial instanceof THREE.MeshStandardMaterial)) return;
    const baseColor = baseMaterial.color.clone();
    const nightTint = new THREE.Color(tintColor);
    const tinted = baseColor.clone().lerp(nightTint, nightFactor);
    tinted.multiplyScalar(1 - nightFactor * darkenScale);
    material.color.copy(tinted);
    material.needsUpdate = true;
  }, [material, baseMaterial, nightFactor, tintColor, darkenScale]);

  return material;
};

const Dome: React.FC<{ material: THREE.Material; position: [number, number, number]; radius: number; nightFactor: number }> = ({ material, position, radius, nightFactor }) => {
  const tintedMaterial = useNightTintedMaterial(material, nightFactor, '#647489', 0.75);
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <primitive object={tintedMaterial} />
    </mesh>
  );
};
// Color palettes for different districts and building functions
// Each type has 5 color variants for visual variety (cream/linen/clay ranges)
const BUILDING_PALETTES = {
  [BuildingType.RESIDENTIAL]: { color: '#d6ccb7', metalness: 0, roughness: 0.85 },
  [BuildingType.COMMERCIAL]: { color: '#a68a64', metalness: 0, roughness: 1.0 },
  [BuildingType.RELIGIOUS]: { color: '#e8dcc4', metalness: 0.05, roughness: 0.7 },
  [BuildingType.CIVIC]: { color: '#d4a373', metalness: 0.1, roughness: 0.65 },
};

// Color variants for each building type - subtle cream/linen/clay variations
const BUILDING_COLOR_VARIANTS = {
  [BuildingType.RESIDENTIAL]: [
    '#d6ccb7', // Original - warm cream
    '#e2d8c5', // Lighter linen
    '#c9bea8', // Darker clay
    '#dfd5bf', // Pale cream
    '#d0c4ad', // Muted tan
  ],
  [BuildingType.COMMERCIAL]: [
    '#a68a64', // Original - tan/khaki
    '#b89974', // Warmer sand
    '#9c7f5a', // Darker clay
    '#b2916f', // Golden tan
    '#a08460', // Muted earth
  ],
  [BuildingType.RELIGIOUS]: [
    '#e8dcc4', // Original - off-white cream
    '#f0e6d2', // Pale ivory
    '#ddd1ba', // Warm linen
    '#ebe0ca', // Soft cream
    '#e3d6be', // Subtle beige
  ],
  [BuildingType.CIVIC]: [
    '#d4a373', // Original - sandy terracotta
    '#deb083', // Light clay
    '#c89868', // Rich terracotta
    '#d7a87a', // Warm sand
    '#cca06f', // Muted adobe
  ],
};

interface EnvironmentProps {
  mapX: number;
  mapY: number;
  onGroundClick?: (point: THREE.Vector3) => void;
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void;
  nearBuildingId?: string | null;
  timeOfDay?: number;
  enableHoverWireframe?: boolean;
  enableHoverLabel?: boolean;
  pushables?: PushableObject[];
}

const Awning: React.FC<{ material: THREE.Material; position: [number, number, number]; rotation: [number, number, number]; width: number; seed: number; nightFactor: number }> = ({ material, position, rotation, width, seed, nightFactor }) => {
  const ref = useRef<THREE.Mesh>(null);
  const tintedMaterial = useNightTintedMaterial(material, nightFactor, '#657183', 0.7);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = rotation[0] + Math.sin(state.clock.elapsedTime + seed) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
       <planeGeometry args={[width, 3]} />
       <primitive object={tintedMaterial} />
    </mesh>
  );
};

const Torch: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; intensity: number }> = ({ position, rotation, intensity }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 8]} />
        <meshStandardMaterial color="#5a3b25" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={intensity * 1.2} />
      </mesh>
    </group>
  );
};

const PotTree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.1, 1.0, 1.1]}
    labelTitle="Potted Olive Tree"
    labelLines={['Fragrant foliage', 'Terracotta pot', 'Shaded fruit']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const GeraniumPot: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.9, 1.0, 0.9]}
    labelTitle="Geranium Pot"
    labelLines={['Flowering blooms', 'Clay planter', 'Gardened by locals']}
    labelOffset={[0, 1.0, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.3, 0.4, 0.35, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <sphereGeometry args={[0.35, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
    <mesh position={[0.12, 0.55, 0.05]} castShadow>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#c43b3b" roughness={0.85} />
    </mesh>
    <mesh position={[-0.08, 0.58, -0.06]} castShadow>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#d14848" roughness={0.85} />
    </mesh>
    <mesh position={[0.02, 0.62, 0.12]} castShadow>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#b83333" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const PlazaCat: React.FC<{ waypoints: [number, number, number][] }> = ({ waypoints }) => {
  const catRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const state = useRef({ targetIndex: 0, mode: 'sleep', timer: 0 });

  useFrame((_, delta) => {
    if (!catRef.current || !groupRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;

    if (state.current.mode === 'sleep') {
      groupRef.current.rotation.z = Math.sin(state.current.timer * 2) * 0.04;
      if (tailRef.current) tailRef.current.rotation.y = Math.sin(state.current.timer * 1.5) * 0.3;
      if (state.current.timer <= 0) {
        state.current.mode = 'walk';
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 6 + Math.random() * 6;
      }
      return;
    }

    const target = new THREE.Vector3(...waypoints[state.current.targetIndex]);
    const dir = target.clone().sub(current);
    const dist = dir.length();
    if (dist < 0.1) {
      state.current.mode = 'sleep';
      state.current.timer = 8 + Math.random() * 10;
      return;
    }
    dir.normalize();
    current.add(dir.multiplyScalar(delta * 0.6));
    groupRef.current.lookAt(target);
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(state.current.timer * 4) * 0.2;
    if (headRef.current) headRef.current.rotation.y = Math.sin(state.current.timer * 3) * 0.1;
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={waypoints[0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title="Market Cat"
          lines={['Local stray', 'Dozing between strolls', 'Likes warm benches']}
          offset={[0, 0.6, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[0.6, 0.4, 0.6]} color={HOVER_WIREFRAME_COLORS.default} />
          <HoverOutlineBox size={[0.65, 0.44, 0.65]} color={HOVER_WIREFRAME_COLORS.default} opacity={0.35} />
        </>
      )}
      <group ref={catRef}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.3, 8]} />
          <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
        </mesh>
      <mesh position={[0.18, 0.16, 0]} castShadow ref={headRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 0.23, 0.04]} castShadow>
        <coneGeometry args={[0.03, 0.05, 6]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 0.23, -0.04]} castShadow>
        <coneGeometry args={[0.03, 0.05, 6]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.16, 0.04]} castShadow>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#111111" roughness={1} />
      </mesh>
      <mesh position={[0.24, 0.16, -0.04]} castShadow>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#111111" roughness={1} />
      </mesh>
      <mesh position={[0.26, 0.14, 0]} castShadow>
        <sphereGeometry args={[0.007, 6, 6]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} />
      </mesh>
      <mesh position={[0.08, 0.04, 0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.08, 0.04, 0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.08, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
        <mesh ref={tailRef} position={[-0.2, 0.14, 0]} rotation={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
          <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

const ClayJar: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.7, 0.7, 0.7]}
    labelTitle="Clay Jar"
    labelLines={['Water storage', 'Hand-thrown', 'Market utility']}
    labelOffset={[0, 0.9, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.25, 0.35, 0.6, 10]} />
      <meshStandardMaterial color="#a9703a" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

const Amphora: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.9, 1.1, 0.9]}
    labelTitle="Amphora"
    labelLines={['Storage vessel', 'Fired clay', 'Stamped shoulder']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.2, 0.35, 0.7, 10]} />
      <meshStandardMaterial color="#a06b3a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <sphereGeometry args={[0.28, 10, 8]} />
      <meshStandardMaterial color="#a06b3a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.72, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.16, 0.2, 10]} />
      <meshStandardMaterial color="#8f5f33" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

const StoneSculpture: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.0, 1.1, 1.0]}
    labelTitle="Stone Plinth"
    labelLines={['Decorative carving', 'Local limestone', 'Weathered edges']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <boxGeometry args={[0.8, 0.3, 0.8]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.25, 0.3, 0.7, 10]} />
      <meshStandardMaterial color="#a98963" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const CornerTurret: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.6, 2.8, 1.6]}
    labelTitle="Roof Turret"
    labelLines={['Defensive lookout', 'Baked brick', 'City skyline mark']}
    labelOffset={[0, 2.3, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.6, 0.7, 2.2, 12]} />
      <meshStandardMaterial color="#c9b79d" roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.2, 0]} castShadow>
      <coneGeometry args={[0.7, 0.6, 10]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const Bench: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[2.2, 0.6, 1.1]}
    labelTitle="Stone Bench"
    labelLines={['Resting place', 'Cool limestone', 'Market shade']}
    labelOffset={[0, 0.6, 0]}
  >
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
  </HoverableGroup>
);

const PushableBench: React.FC<{ item: PushableObject }> = ({ item }) => (
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

const PushableClayJar: React.FC<{ item: PushableObject }> = ({ item }) => (
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

const PushableGeraniumPot: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[1.1, 1.2, 1.1]}
    labelTitle="Geranium Pot"
    labelLines={['Fragrant petals', 'Terracotta pot', 'Sunlit stoop']}
    labelOffset={[0, 1.2, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color="#8b3b3b" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const PushableBasket: React.FC<{ item: PushableObject }> = ({ item }) => (
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

const PushableOlivePot: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[1.2, 1.6, 1.2]}
    labelTitle="Olive Tree Pot"
    labelLines={['Terracotta planter', 'Olive sapling', 'Courtyard decor']}
    labelOffset={[0, 1.2, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.45, 0.55, 0.45, 12]} />
      <meshStandardMaterial color="#9b5c2e" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.55, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.08, 0.5, 8]} />
      <meshStandardMaterial color="#6b4a2a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.9, 0]} castShadow>
      <sphereGeometry args={[0.55, 10, 8]} />
      <meshStandardMaterial color="#3f5d3a" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const PushableLemonPot: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[1.2, 1.6, 1.2]}
    labelTitle="Lemon Tree Pot"
    labelLines={['Terracotta planter', 'Citrus sapling', 'Courtyard decor']}
    labelOffset={[0, 1.2, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.45, 0.55, 0.45, 12]} />
      <meshStandardMaterial color="#9b5c2e" roughness={0.9} />
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
  </HoverableGroup>
);

const PushableCoin: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Coin'}
    labelLines={['Lost in the dust']}
    labelOffset={[0, 0.4, 0]}
  >
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]} castShadow>
      <cylinderGeometry args={[0.14, 0.14, 0.03, 12]} />
      <meshStandardMaterial color="#c8a54a" roughness={0.35} metalness={0.6} />
    </mesh>
  </HoverableGroup>
);

const PushableOlive: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Olives'}
    labelLines={['Freshly fallen']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh castShadow>
      <sphereGeometry args={[0.08, 8, 6]} />
      <meshStandardMaterial color="#54683f" roughness={0.75} />
    </mesh>
    <mesh position={[0.12, 0.02, 0.06]} castShadow>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshStandardMaterial color="#4a5f3a" roughness={0.75} />
    </mesh>
  </HoverableGroup>
);

const PushableLemon: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Lemon'}
    labelLines={['Bright citrus']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh castShadow>
      <sphereGeometry args={[0.1, 10, 8]} />
      <meshStandardMaterial color="#d9b443" roughness={0.7} />
    </mesh>
  </HoverableGroup>
);

const PushablePotteryShard: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Pottery Shard'}
    labelLines={['Broken earthenware']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]} castShadow>
      <boxGeometry args={[0.22, 0.18, 0.03]} />
      <meshStandardMaterial color="#9c5f3a" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const PushableLinenScrap: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Linen Scrap'}
    labelLines={['Frayed cloth']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]} castShadow>
      <planeGeometry args={[0.28, 0.22]} />
      <meshStandardMaterial color="#d8cbb0" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  </HoverableGroup>
);

const PushableCandleStub: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.5, 0.4, 0.5]}
    labelTitle={item.pickup?.label ?? 'Candle Stub'}
    labelLines={['Beeswax remnant']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
      <meshStandardMaterial color="#e7d7a8" roughness={0.8} />
    </mesh>
  </HoverableGroup>
);

const PushableTwine: React.FC<{ item: PushableObject }> = ({ item }) => (
  <HoverableGroup
    position={[item.position.x, item.position.y, item.position.z]}
    positionVector={item.position}
    boxSize={[0.6, 0.4, 0.6]}
    labelTitle={item.pickup?.label ?? 'Twine'}
    labelLines={['Palm fiber']}
    labelOffset={[0, 0.35, 0]}
  >
    <mesh rotation={[-Math.PI / 2, 0, item.rotation || 0]} castShadow>
      <torusGeometry args={[0.12, 0.02, 6, 12]} />
      <meshStandardMaterial color="#bfa373" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const PushableDecorations: React.FC<{ items: PushableObject[] }> = ({ items }) => (
  <>
    {items.map((item) => {
      if (item.kind === 'bench') return <PushableBench key={item.id} item={item} />;
      if (item.kind === 'clayJar') return <PushableClayJar key={item.id} item={item} />;
      if (item.kind === 'geranium') return <PushableGeraniumPot key={item.id} item={item} />;
      if (item.kind === 'basket') return <PushableBasket key={item.id} item={item} />;
      if (item.kind === 'olivePot') return <PushableOlivePot key={item.id} item={item} />;
      if (item.kind === 'lemonPot') return <PushableLemonPot key={item.id} item={item} />;
      if (item.kind === 'coin') return <PushableCoin key={item.id} item={item} />;
      if (item.kind === 'olive') return <PushableOlive key={item.id} item={item} />;
      if (item.kind === 'lemon') return <PushableLemon key={item.id} item={item} />;
      if (item.kind === 'potteryShard') return <PushablePotteryShard key={item.id} item={item} />;
      if (item.kind === 'linenScrap') return <PushableLinenScrap key={item.id} item={item} />;
      if (item.kind === 'candleStub') return <PushableCandleStub key={item.id} item={item} />;
      if (item.kind === 'twine') return <PushableTwine key={item.id} item={item} />;
      return null;
    })}
  </>
);

const Building: React.FC<{
  data: BuildingMetadata;
  mainMaterial: THREE.Material;
  otherMaterials: any;
  isNear: boolean;
  torchIntensity: number;
  district: DistrictType;
  nightFactor: number;
  noiseTextures?: THREE.Texture[];
}> = ({ data, mainMaterial, otherMaterials, isNear, torchIntensity, district, nightFactor, noiseTextures }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const localSeed = data.position[0] * 1000 + data.position[2];
  const baseHeight = district === 'HOVELS' && data.type !== BuildingType.RELIGIOUS && data.type !== BuildingType.CIVIC
    ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
    : data.type === BuildingType.RELIGIOUS || data.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;
  const height = baseHeight * districtScale;
  const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale * (data.sizeScale ?? 1);
  const buildingMaterial = useMemo(() => {
    if (!(mainMaterial instanceof THREE.MeshStandardMaterial)) return mainMaterial;
    const mat = mainMaterial.clone();

    // Apply color variant - each building gets one of 5 color options
    const colorVariants = BUILDING_COLOR_VARIANTS[data.type];
    if (colorVariants && colorVariants.length > 0) {
      const colorIndex = Math.floor(seededRandom(localSeed + 77) * colorVariants.length);
      mat.color.set(colorVariants[colorIndex]);
    }

    // Apply texture variation for commercial/civic buildings
    if ((data.type === BuildingType.COMMERCIAL || data.type === BuildingType.CIVIC) && noiseTextures && noiseTextures.length > 0) {
      // Randomly choose a texture intensity variant (0-4)
      const textureVariant = Math.floor(seededRandom(localSeed + 88) * noiseTextures.length);
      mat.map = noiseTextures[textureVariant];
      mat.bumpMap = noiseTextures[textureVariant];
      // Also vary bump intensity slightly
      const bumpVariation = 0.015 + seededRandom(localSeed + 89) * 0.015; // Range: 0.015-0.03
      mat.bumpScale = bumpVariation;
    }

    if (data.type === BuildingType.RESIDENTIAL) {
      const roughnessJitter = (seededRandom(localSeed + 55) - 0.5) * 0.1;
      mat.roughness = THREE.MathUtils.clamp(0.8 + roughnessJitter, 0.65, 0.9);
      mat.metalness = 0.03;
      mat.envMapIntensity = 1.35;
    }
    mat.needsUpdate = true;
    return mat;
  }, [data.type, localSeed, mainMaterial, noiseTextures]);
  const baseResidentialColor = useMemo(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return null;
    return buildingMaterial.color.clone();
  }, [buildingMaterial]);

  // PERFORMANCE FIX: Throttle material updates to every 2 seconds instead of every frame
  // This reduces GPU uploads from 30 per frame (1800/sec) to 15 per 2s (7.5/sec) = 240x less frequent!
  const lastMaterialUpdateRef = useRef(0);

  useFrame((state) => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return;
    if (!baseResidentialColor || data.type !== BuildingType.RESIDENTIAL) return;

    const elapsed = state.clock.elapsedTime;
    // Update every 2 seconds instead of every frame (60 FPS → 0.5 updates/sec = 120x reduction!)
    if (elapsed - lastMaterialUpdateRef.current < 2.0) return;
    lastMaterialUpdateRef.current = elapsed;

    const nightTint = new THREE.Color('#6f7f96');
    const nightDarken = 1 - nightFactor * 0.55;
    const tinted = baseResidentialColor.clone().lerp(nightTint, nightFactor);
    tinted.multiplyScalar(nightDarken);
    buildingMaterial.color.copy(tinted);
    buildingMaterial.envMapIntensity = 1.35 - nightFactor * 0.9;
    buildingMaterial.needsUpdate = true;
  });

  // Door positioning based on metadata
  const doorRotation = data.doorSide * (Math.PI / 2);
  const doorOffset = buildingSize / 2 + 0.1;
  const doorPos: [number, number, number] = [0, -height / 2 + 1.25, 0];
  const doorVariant = Math.floor(seededRandom(localSeed + 21) * 3);
  
  if (data.doorSide === 0) doorPos[2] = doorOffset; // N
  else if (data.doorSide === 1) doorPos[0] = doorOffset; // E
  else if (data.doorSide === 2) doorPos[2] = -doorOffset; // S
  else if (data.doorSide === 3) doorPos[0] = -doorOffset; // W

  const activeGlow = isNear || hovered;
  const wireColor = data.isQuarantined ? HOVER_WIREFRAME_COLORS.danger : data.isPointOfInterest ? HOVER_WIREFRAME_COLORS.poi : HOVER_WIREFRAME_COLORS.default;
  useHoverFade(groupRef, wireframeEnabled && hovered, 0.35);
  const torchChance = seededRandom(localSeed + 17);
  const torchCount = torchChance > 0.97 ? 2 : torchChance > 0.9 ? 1 : 0;
  const torchOffsets: [number, number, number][] = [];
  if (torchCount >= 1) torchOffsets.push([buildingSize / 2 + 0.2, -height * 0.15, 0]);
  if (torchCount >= 2) torchOffsets.push([-buildingSize / 2 - 0.2, -height * 0.15, 0]);
  const hasMarketOrnaments = district === 'MARKET' && seededRandom(localSeed + 81) > 0.6;
  const hasResidentialClutter = district !== 'MARKET' && seededRandom(localSeed + 83) > 0.5;
  const clutterType = Math.floor(seededRandom(localSeed + 84) * 3);
  const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);
  const hasTurret = district === 'MARKET' && seededRandom(localSeed + 91) > 0.85;
  const hasWealthyDoorOrnaments = district === 'WEALTHY' && seededRandom(localSeed + 121) > 0.35;
  const hasWealthyWindowTrim = district === 'WEALTHY' && seededRandom(localSeed + 123) > 0.4;
  const hasCrenelation = seededRandom(localSeed + 141) > 0.75;
  const hasRoofCap = seededRandom(localSeed + 145) > 0.6;
  const hasParapetRing = seededRandom(localSeed + 149) > 0.7;
  const dirtBandHeight = height * 0.2;
  const crenelRef = useRef<THREE.InstancedMesh>(null);
  const crenelTemp = useMemo(() => new THREE.Object3D(), []);
  const crenelPositions = useMemo<[number, number, number][]>(() => {
    if (!hasCrenelation) return [];
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 12; i += 1) {
      const side = i % 4;
      const step = Math.floor(i / 4) - 1;
      const offset = buildingSize * 0.42;
      const x = side === 0 ? -offset : side === 1 ? offset : step * (buildingSize * 0.3);
      const z = side === 2 ? -offset : side === 3 ? offset : step * (buildingSize * 0.3);
      positions.push([x, 0, z]);
    }
    return positions;
  }, [buildingSize, hasCrenelation]);
  useEffect(() => {
    if (!crenelRef.current || crenelPositions.length === 0) return;
    crenelPositions.forEach((pos, index) => {
      crenelTemp.position.set(pos[0], pos[1], pos[2]);
      crenelTemp.updateMatrix();
      crenelRef.current!.setMatrixAt(index, crenelTemp.matrix);
    });
    crenelRef.current.instanceMatrix.needsUpdate = true;
  }, [crenelPositions, crenelTemp]);
  const doorOutwardOffset: [number, number, number] =
    data.doorSide === 0 ? [0, 0, 0.6]
    : data.doorSide === 1 ? [0.6, 0, 0]
    : data.doorSide === 2 ? [0, 0, -0.6]
    : [-0.6, 0, 0];
  const doorSideOffset: [number, number, number] =
    data.doorSide === 0 || data.doorSide === 2 ? [1.4, 0, 0] : [0, 0, 1.4];

  return (
    <group 
      ref={groupRef}
      position={[data.position[0], height / 2, data.position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={data.type === BuildingType.RELIGIOUS ? 'Holy Sanctuary' : data.type === BuildingType.CIVIC ? "Governor's Office" : data.type === BuildingType.COMMERCIAL ? 'Merchant Stall' : 'Private Residence'}
          lines={[
            data.ownerName,
            data.ownerProfession,
            `Age ${data.ownerAge}`,
            data.isQuarantined ? 'Quarantined' : 'Open'
          ]}
          offset={[0, height / 2 + 1.4, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[buildingSize * 1.02, height * 1.02, buildingSize * 1.02]} color={wireColor} />
          <HoverOutlineBox size={[buildingSize * 1.06, height * 1.06, buildingSize * 1.06]} color={wireColor} opacity={0.35} />
        </>
      )}
      {/* Main weathered sandstone structure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[buildingSize, height, buildingSize]} />
        <primitive object={buildingMaterial} />
      </mesh>
      {/* Ambient dirt banding */}
      <mesh position={[0, -height * 0.35, 0]} receiveShadow>
        <boxGeometry args={[buildingSize * 1.01, dirtBandHeight, buildingSize * 1.01]} />
        <meshStandardMaterial color="#5e4b37" transparent opacity={0.18} roughness={1} />
      </mesh>
      
      {/* Dome for Religious/Civic */}
      {(data.type === BuildingType.RELIGIOUS || (district !== 'HOVELS' && seededRandom(localSeed + 2) > 0.85)) && (
        <Dome
          position={[0, height / 2, 0]}
          radius={buildingSize / 2.2}
          nightFactor={nightFactor}
          material={otherMaterials.dome[Math.floor(seededRandom(localSeed + 73) * otherMaterials.dome.length)]}
        />
      )}
      {/* Poor hovel roof detailing */}
      {district === 'HOVELS' && data.type === BuildingType.RESIDENTIAL && (
        <group position={[0, height / 2 + 0.08, 0]}>
          <mesh castShadow>
            <boxGeometry args={[buildingSize * 0.95, 0.12, buildingSize * 0.95]} />
            <meshStandardMaterial color="#6b5a42" roughness={0.98} />
          </mesh>
          <mesh position={[-0.3, 0.1, 0.1]} rotation={[0, 0.2, 0.05]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, buildingSize * 0.8, 6]} />
            <meshStandardMaterial color="#4b3b2a" roughness={0.95} />
          </mesh>
          <mesh position={[0.2, 0.1, -0.15]} rotation={[0, -0.15, -0.04]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, buildingSize * 0.7, 6]} />
            <meshStandardMaterial color="#4f3d2a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.14, 0.2]} rotation={[0.1, 0, 0.08]} castShadow>
            <boxGeometry args={[buildingSize * 0.5, 0.06, 0.25]} />
            <meshStandardMaterial color="#5a4936" roughness={0.96} />
          </mesh>
        </group>
      )}
      {/* Subtle roof caps / parapet ring */}
      {hasRoofCap && (
        <mesh position={[0, height / 2 + 0.08, 0]} receiveShadow>
          <boxGeometry args={[buildingSize * 0.6, 0.16, buildingSize * 0.6]} />
          <meshStandardMaterial color="#9b7b4f" roughness={0.85} />
        </mesh>
      )}
      {hasParapetRing && (
        <mesh position={[0, height / 2 + 0.12, 0]} receiveShadow>
          <boxGeometry args={[buildingSize * 0.92, 0.18, buildingSize * 0.92]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.9} />
        </mesh>
      )}
      {hasCrenelation && (
        <instancedMesh ref={crenelRef} args={[undefined, undefined, crenelPositions.length]} position={[0, height / 2 + 0.2, 0]} receiveShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#a98963" roughness={0.95} />
        </instancedMesh>
      )}

      {/* DETAILED DOORWAY */}
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
        {district === 'WEALTHY' && (
          <>
            <mesh position={[0, 0.1, -0.05]} castShadow>
              <boxGeometry args={[3.1, 3.2, 0.12]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.7, 0.12]} castShadow>
              <boxGeometry args={[2.8, 0.25, 0.18]} />
              <meshStandardMaterial color="#7a5b42" roughness={0.9} />
            </mesh>
          </>
        )}
        {doorVariant === 0 && (
          <mesh castShadow>
            <boxGeometry args={[2.5, 2.5, 0.2]} />
            <meshStandardMaterial color="#4a3b2b" />
          </mesh>
        )}
        {doorVariant === 1 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.4, 2.2, 0.2]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
            <mesh position={[0, 1.05, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.0, 1.0, 0.2, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
          </>
        )}
        {doorVariant === 2 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.8, 2.8, 0.2]} />
              <meshStandardMaterial color="#5b4634" />
            </mesh>
            <mesh position={[0, 0, 0.12]} castShadow>
              <boxGeometry args={[2.3, 2.3, 0.15]} />
              <meshStandardMaterial color="#3d2e21" />
            </mesh>
          </>
        )}
        <mesh position={[0, -1.35, 0.25]} receiveShadow>
          <boxGeometry args={[2.8, 0.2, 0.6]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {/* Door Panels */}
        <mesh position={[0, 0, 0.1]} castShadow>
           <boxGeometry args={[1.8, 2.3, 0.1]} />
           <meshStandardMaterial 
             color={activeGlow ? "#8b4513" : "#3d2817"} 
             emissive={activeGlow ? "#fbbf24" : "black"}
             emissiveIntensity={activeGlow ? 0.3 : 0}
             roughness={0.8}
           />
        </mesh>
        {doorVariant === 1 && (
          <mesh position={[0, 1.15, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.9, 0.9, 0.1, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={activeGlow ? "#fbbf24" : "#3d2817"} emissive={activeGlow ? "#fbbf24" : "black"} emissiveIntensity={activeGlow ? 0.2 : 0} />
          </mesh>
        )}
      </group>

      {/* Roof Parapet / Cap for Wealthy */}
      {district === 'WEALTHY' && seededRandom(localSeed + 31) > 0.6 && (
        <>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[buildingSize + 0.6, 0.3, buildingSize + 0.6]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[0, height / 2 + 0.35, 0]} castShadow>
            <boxGeometry args={[buildingSize + 0.4, 0.08, buildingSize + 0.4]} />
            <meshStandardMaterial color="#bfae96" roughness={0.85} />
          </mesh>
          {seededRandom(localSeed + 37) > 0.7 && (
            <mesh position={[0, height / 2 + 0.6, 0]} castShadow>
              <sphereGeometry args={[buildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#bda88b" roughness={0.8} />
            </mesh>
          )}
        </>
      )}

      {/* WINDOWS - Now rendered with instanced meshes for better performance */}

      {/* Animated Awnings */}
      {(data.type === BuildingType.COMMERCIAL || seededRandom(localSeed + 3) > 0.6) && (
        <Awning 
          material={seededRandom(localSeed + 5) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 6) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 4) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.42, buildingSize / 2 + 0.2]}
          rotation={[0.35 + seededRandom(localSeed + 15) * 1.15, 0, 0]}
          width={buildingSize * (0.72 + seededRandom(localSeed + 16) * 0.12)}
          seed={localSeed}
          nightFactor={nightFactor}
        />
      )}

      {/* Secondary Awning / Beam Protrusions */}
      {seededRandom(localSeed + 61) > 0.75 && (
        <Awning 
          material={seededRandom(localSeed + 63) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 64) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 62) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.58, -buildingSize / 2 - 0.2]}
          rotation={[0.3 + seededRandom(localSeed + 66) * 1.0, Math.PI, 0]}
          width={buildingSize * (0.55 + seededRandom(localSeed + 67) * 0.1)}
          seed={localSeed + 2}
          nightFactor={nightFactor}
        />
      )}
      {seededRandom(localSeed + 71) > 0.6 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={`beam-${i}`} position={[buildingSize / 2 + 0.4, -height / 2 + 1 + i * 1.4, (i - 1) * 1.2]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.15]} />
              <meshStandardMaterial color="#3d2817" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Market ornaments - now rendered with instanced meshes */}
      {hasResidentialClutter && (
        <group position={[0, -height / 2, 0]}>
          {/* Amphora/ClayJar (clutterType === 0) - now instanced */}
          {clutterType === 1 && <PotTree position={[-buildingSize / 2 - 0.9, 0.2, 1.1]} />}
          {clutterType === 2 && <StoneSculpture position={[buildingSize / 2 + 0.7, 0.2, 1.3]} />}
        </group>
      )}
      {hasWealthyDoorOrnaments && (
        <group position={[0, -height / 2, 0]}>
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] + doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] + doorSideOffset[2]
          ]} />
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] - doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] - doorSideOffset[2]
          ]} />
        </group>
      )}

      {hasTurret && (
        <CornerTurret position={[buildingSize / 2 - 0.6, height / 2 - 1.1, buildingSize / 2 - 0.6]} />
      )}

      {/* Wall Torches */}
      {torchOffsets.map((offset, index) => (
        <Torch
          key={`torch-${data.id}-${index}`}
          position={[offset[0], offset[1], offset[2]]}
          rotation={[0, offset[0] > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          intensity={torchIntensity}
        />
      ))}
    </group>
  );
};

// Instanced Decorative Elements - renders pots, jars, benches with single draw calls
const InstancedDecorations: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
}> = ({ buildings, district }) => {
  const clayJarMeshRef = useRef<THREE.InstancedMesh>(null);
  const potTreeBaseMeshRef = useRef<THREE.InstancedMesh>(null);
  const potTreeFoliageMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  const decorationData = useMemo(() => {
    const clayJars: THREE.Matrix4[] = [];
    const potTreeBases: THREE.Matrix4[] = [];
    const potTreeFoliage: THREE.Matrix4[] = [];
    const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;

    buildings.forEach((building) => {
      const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale * (building.sizeScale ?? 1);
      const localSeed = building.position[0] * 1000 + building.position[2];
      const baseHeight = district === 'HOVELS' && building.type !== BuildingType.RELIGIOUS && building.type !== BuildingType.CIVIC
        ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
        : building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
      const height = baseHeight * districtScale;

      const hasMarketOrnaments = district === 'MARKET' && seededRandom(localSeed + 81) > 0.6;
      const hasResidentialClutter = district !== 'MARKET' && seededRandom(localSeed + 83) > (district === 'HOVELS' ? 0.25 : 0.5);
      const clutterType = Math.floor(seededRandom(localSeed + 84) * 3);
      const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);

      if (hasMarketOrnaments) {
        if (ornamentType === 0) {
          // PotTree
          tempObj.position.set(building.position[0] + buildingSize / 2 + 0.8, building.position[1] + 0.2, building.position[2] + 1.2);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          potTreeBases.push(tempObj.matrix.clone());
          tempObj.position.y += 0.45;
          tempObj.updateMatrix();
          potTreeFoliage.push(tempObj.matrix.clone());
        } else if (ornamentType === 1) {
          // Clay Jars
          tempObj.position.set(building.position[0] + buildingSize / 2 + 0.7, building.position[1] + 0.3, building.position[2] + 1);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          clayJars.push(tempObj.matrix.clone());

          tempObj.position.set(building.position[0] + buildingSize / 2 + 1.1, building.position[1] + 0.3, building.position[2] + 1.3);
          tempObj.updateMatrix();
          clayJars.push(tempObj.matrix.clone());
        } else if (ornamentType === 2) {
          // PotTree
          tempObj.position.set(building.position[0] - buildingSize / 2 - 0.8, building.position[1] + 0.2, building.position[2] - 1.2);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          potTreeBases.push(tempObj.matrix.clone());
          tempObj.position.y += 0.45;
          tempObj.updateMatrix();
          potTreeFoliage.push(tempObj.matrix.clone());
        }
      }

      if (hasResidentialClutter && clutterType === 0) {
        // Amphora - rendered as clay jar for simplicity in instanced version
        tempObj.position.set(building.position[0] + buildingSize / 2 + 0.9, building.position[1] + 0.25, building.position[2] - 1.1);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        clayJars.push(tempObj.matrix.clone());
      }
      if (district === 'HOVELS' && seededRandom(localSeed + 88) > 0.6) {
        tempObj.position.set(building.position[0] - buildingSize / 2 - 0.6, building.position[1] + 0.25, building.position[2] + 0.9);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        clayJars.push(tempObj.matrix.clone());
      }
      if (district === 'WEALTHY' && seededRandom(localSeed + 90) > 0.5) {
        tempObj.position.set(building.position[0] + buildingSize / 2 + 1.1, building.position[1] + 0.2, building.position[2] + 1.5);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        potTreeBases.push(tempObj.matrix.clone());
        tempObj.position.y += 0.45;
        tempObj.updateMatrix();
        potTreeFoliage.push(tempObj.matrix.clone());
      }
    });

    return { clayJars, potTreeBases, potTreeFoliage };
  }, [buildings, district]);

  useEffect(() => {
    if (clayJarMeshRef.current && decorationData.clayJars.length > 0) {
      decorationData.clayJars.forEach((matrix, i) => {
        clayJarMeshRef.current!.setMatrixAt(i, matrix);
      });
      clayJarMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (potTreeBaseMeshRef.current && decorationData.potTreeBases.length > 0) {
      decorationData.potTreeBases.forEach((matrix, i) => {
        potTreeBaseMeshRef.current!.setMatrixAt(i, matrix);
      });
      potTreeBaseMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (potTreeFoliageMeshRef.current && decorationData.potTreeFoliage.length > 0) {
      decorationData.potTreeFoliage.forEach((matrix, i) => {
        potTreeFoliageMeshRef.current!.setMatrixAt(i, matrix);
      });
      potTreeFoliageMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [decorationData]);

  return (
    <>
      {/* Clay Jars */}
      {decorationData.clayJars.length > 0 && (
        <instancedMesh ref={clayJarMeshRef} args={[undefined, undefined, decorationData.clayJars.length]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 0.6, 10]} />
          <meshStandardMaterial color="#a9703a" roughness={0.95} />
        </instancedMesh>
      )}

      {/* Pot Tree Bases */}
      {decorationData.potTreeBases.length > 0 && (
        <instancedMesh ref={potTreeBaseMeshRef} args={[undefined, undefined, decorationData.potTreeBases.length]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </instancedMesh>
      )}

      {/* Pot Tree Foliage */}
      {decorationData.potTreeFoliage.length > 0 && (
        <instancedMesh ref={potTreeFoliageMeshRef} args={[undefined, undefined, decorationData.potTreeFoliage.length]} castShadow>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
        </instancedMesh>
      )}
    </>
  );
};

// Instanced Window System - renders all windows with a single draw call
const InstancedWindows: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
  nightFactor: number;
}> = ({ buildings, district, nightFactor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  const windowData = useMemo(() => {
    const data: Array<{ matrix: THREE.Matrix4; hasGlow: boolean; glowIntensity: number }> = [];
    const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;

    buildings.forEach((building) => {
      const localSeed = building.position[0] * 1000 + building.position[2];
      const baseHeight = district === 'HOVELS' && building.type !== BuildingType.RELIGIOUS && building.type !== BuildingType.CIVIC
        ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
        : building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
      const height = baseHeight * districtScale;
    const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale * (building.sizeScale ?? 1);

      // Create windows for each side
      [0, 1, 2, 3].forEach((side) => {
        if (side === building.doorSide && seededRandom(localSeed + side) < 0.8) return;
        const sideRand = seededRandom(localSeed + side + 10);
        if (sideRand < 0.3) return;

        const rot = side * (Math.PI / 2);
        const off = buildingSize / 2 + 0.05;
        const wPos = new THREE.Vector3(building.position[0], height / 2 - 2 + building.position[1], building.position[2]);
        if (side === 0) wPos.z += off;
        else if (side === 1) wPos.x += off;
        else if (side === 2) wPos.z -= off;
        else if (side === 3) wPos.x -= off;

        tempObj.position.copy(wPos);
        tempObj.rotation.set(0, rot, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();

        const windowGlowRoll = seededRandom(localSeed + side + 120);
        const hasGlow = windowGlowRoll > 0.5 && nightFactor > 0.2;
        const glowIntensity = windowGlowRoll > 0.9 ? 0.5 : 0.25;

        data.push({
          matrix: tempObj.matrix.clone(),
          hasGlow,
          glowIntensity
        });
      });
    });

    return data;
  }, [buildings, district, nightFactor]);

  useEffect(() => {
    if (!meshRef.current) return;

    windowData.forEach((data, i) => {
      meshRef.current!.setMatrixAt(i, data.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (glowMeshRef.current) {
      let glowIndex = 0;
      windowData.forEach((data) => {
        if (data.hasGlow) {
          glowMeshRef.current!.setMatrixAt(glowIndex, data.matrix);
          glowIndex++;
        }
      });
      if (glowIndex > 0) {
        glowMeshRef.current.count = glowIndex;
        glowMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [windowData]);

  const glowCount = useMemo(() => windowData.filter(d => d.hasGlow).length, [windowData]);

  return (
    <>
      {/* Window frames */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, windowData.length]} receiveShadow>
        <boxGeometry args={[1.4, 2.1, 0.08]} />
        <meshStandardMaterial color="#1f140a" roughness={1} />
      </instancedMesh>

      {/* Window glow for lit windows at night */}
      {glowCount > 0 && (
        <instancedMesh ref={glowMeshRef} args={[undefined, undefined, glowCount]}>
          <boxGeometry args={[1.0, 1.5, 0.02]} />
          <meshStandardMaterial
            color="#f5d7a3"
            emissive="#f2b760"
            emissiveIntensity={nightFactor > 0.2 ? 0.3 : 0}
            roughness={0.9}
            metalness={0.05}
          />
        </instancedMesh>
      )}
    </>
  );
};

export const Buildings: React.FC<{
  mapX: number,
  mapY: number,
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void,
  nearBuildingId?: string | null,
  torchIntensity: number;
  nightFactor: number;
}> = ({ mapX, mapY, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor }) => {
  // Create multiple noise texture variants with different intensities for variety
  const noiseTextures = useMemo(() => [
    createNoiseTexture(256, 0.15), // Light texture
    createNoiseTexture(256, 0.25), // Medium-light
    createNoiseTexture(256, 0.35), // Medium (original)
    createNoiseTexture(256, 0.45), // Medium-heavy
    createNoiseTexture(256, 0.55), // Heavy texture
  ], []);
  const { camera } = useThree();

  const materials = useMemo(() => {
    const matMap = new Map<BuildingType, THREE.MeshStandardMaterial>();
    Object.entries(BUILDING_PALETTES).forEach(([type, props]) => {
      const applyTexture = type === BuildingType.COMMERCIAL || type === BuildingType.CIVIC;
      matMap.set(type as BuildingType, new THREE.MeshStandardMaterial({
        ...props,
        map: applyTexture ? noiseTextures[2] : null, // Use medium texture as base
        bumpMap: applyTexture ? noiseTextures[2] : null,
        bumpScale: applyTexture ? 0.02 : 0,
      }));
    });
    return matMap;
  }, [noiseTextures]);

  const otherMaterials = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 1.0 }),
    dome: [
      new THREE.MeshStandardMaterial({ color: '#b8a98e', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#a6947a', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#c7b89c', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#b8c3c9', roughness: 0.7 }) // pale blue
    ],
    awning: [
      new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.95, side: THREE.DoubleSide }), // linen
      new THREE.MeshStandardMaterial({ color: '#c8b08a', roughness: 0.95, side: THREE.DoubleSide }), // tan
      new THREE.MeshStandardMaterial({ color: '#b79a74', roughness: 0.95, side: THREE.DoubleSide }), // earth
      new THREE.MeshStandardMaterial({ color: '#e0cfa6', roughness: 0.95, side: THREE.DoubleSide }), // pale linen
      new THREE.MeshStandardMaterial({ color: '#3b4f6b', roughness: 0.9, side: THREE.DoubleSide }), // indigo (wealthy)
      new THREE.MeshStandardMaterial({ color: '#4a356a', roughness: 0.9, side: THREE.DoubleSide }), // purple (wealthy)
      new THREE.MeshStandardMaterial({ color: '#2f4f7a', roughness: 0.9, side: THREE.DoubleSide }), // blue (wealthy)
      new THREE.MeshStandardMaterial({ color: '#b0813a', roughness: 0.9, side: THREE.DoubleSide }), // ochre (wealthy)
    ],
    awningStriped: [
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#ead9b7', '#cdb68f'), color: '#ead9b7', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e0cdaa', '#bca888'), color: '#e0cdaa', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e2d3b2', '#b7b79a'), color: '#e2d3b2', roughness: 0.95, side: THREE.DoubleSide })
    ]
  }), []);

  const metadata = useMemo(() => {
    const bldMetadata: BuildingMetadata[] = [];
    const district = getDistrictType(mapX, mapY);
    const terrainSeed = mapX * 1000 + mapY * 13 + 19;
    let seed = (mapX * 100) + mapY;

    if (district === 'ALLEYS') {
      const cellSize = 7;
      const halfCells = 4;
      const openCells = new Set<string>();
      let pathX = 0;
      for (let z = -halfCells; z <= halfCells; z++) {
        const stepRoll = seededRandom(seed + z * 31);
        if (stepRoll > 0.66 && pathX < halfCells - 1) pathX += 1;
        else if (stepRoll < 0.33 && pathX > -halfCells + 1) pathX -= 1;
        openCells.add(`${pathX},${z}`);
        openCells.add(`${pathX + 1},${z}`);
      }

      const branchCount = seededRandom(seed + 99) > 0.5 ? 3 : 2;
      for (let i = 0; i < branchCount; i++) {
        const z = Math.floor(seededRandom(seed + 120 + i) * (halfCells * 2 - 2)) - (halfCells - 1);
        const baseX = Math.round(Math.sin(z * 0.7 + seed) * 1.6);
        const dir = seededRandom(seed + 160 + i) > 0.5 ? 1 : -1;
        const length = seededRandom(seed + 180 + i) > 0.5 ? 2 : 1;
        for (let l = 1; l <= length; l++) {
          openCells.add(`${baseX + dir * l},${z}`);
        }
      }

      for (let x = -halfCells; x <= halfCells; x++) {
        for (let z = -halfCells; z <= halfCells; z++) {
          const key = `${x},${z}`;
          if (openCells.has(key)) continue;
          const worldX = x * cellSize;
          const worldZ = z * cellSize;
          const localSeed = seed + Math.abs(worldX) * 1000 + Math.abs(worldZ);
          if (seededRandom(localSeed) < 0.05) continue;
          const data = generateBuildingMetadata(localSeed, worldX, worldZ);
          bldMetadata.push(data);
        }
      }
      return bldMetadata;
    }
    if (district === 'OUTSKIRTS') {
      const positions: Array<[number, number, number]> = [
        [-12, 0, -8],
        [14, 0, 6],
        [-6, 0, 12],
        [8, 0, -14],
        [0, 0, 4],
        [18, 0, -4],
      ];
      const terrainSeed = mapX * 1000 + mapY * 13 + 19;
      positions.forEach((pos, idx) => {
        const [x, y, z] = pos;
        const localSeed = seed + idx * 1337;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (idx === 0) {
          data.type = BuildingType.COMMERCIAL;
          data.ownerProfession = 'Trader';
        }
        if (idx === 1) {
          data.type = BuildingType.RESIDENTIAL;
          data.ownerProfession = 'Water-Carrier';
        }
        const h = getTerrainHeight(district, x, z, terrainSeed);
        data.position = [x, h, z];
        bldMetadata.push(data);
      });
      return bldMetadata;
    }
    if (district === 'CARAVANSERAI') {
      const positions: Array<[number, number, number]> = [
        [-10, 0, -6],
        [12, 0, -6],
        [-12, 0, 8],
        [10, 0, 10],
        [0, 0, -12],
        [0, 0, 14],
      ];
      positions.forEach((pos, idx) => {
        const [x, y, z] = pos;
        const localSeed = seed + idx * 1337;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (idx === 0) {
          data.type = BuildingType.COMMERCIAL;
          data.ownerProfession = 'Caravan Trader';
        }
        if (idx === 1) {
          data.type = BuildingType.RESIDENTIAL;
          data.ownerProfession = 'Stable Keeper';
        }
        data.position = [x, y, z];
        bldMetadata.push(data);
      });
      return bldMetadata;
    }

    const size = CONSTANTS.MARKET_SIZE * (district === 'WEALTHY' ? 1.15 : district === 'HOVELS' ? 0.9 : district === 'CIVIC' ? 1.1 : 1.0);
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (district === 'WEALTHY' ? 1.25 : district === 'HOVELS' ? 0.75 : district === 'CIVIC' ? 1.1 : 1.0);
    const street = CONSTANTS.STREET_WIDTH * (district === 'WEALTHY' ? 2.2 : district === 'HOVELS' ? 0.85 : district === 'CIVIC' ? 2.6 : 1.0);
    const gap = baseBuilding + street;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        const skipChance = district === 'WEALTHY' ? 0.55 : district === 'HOVELS' ? 0.2 : district === 'CIVIC' ? 0.7 : 0.3;
        if (chance < skipChance) continue;
        if (district === 'CIVIC' && (x * x + z * z) < (gap * 2.2) * (gap * 2.2)) continue;
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (district === 'SALHIYYA' || district === 'OUTSKIRTS') {
          const h = getTerrainHeight(district, x, z, terrainSeed);
          data.position = [x, h, z];
        }
        bldMetadata.push(data);
      }
    }
    return bldMetadata;
  }, [mapX, mapY]);

  React.useEffect(() => {
    onBuildingsGenerated?.(metadata);
  }, [metadata, onBuildingsGenerated]);

  const district = getDistrictType(mapX, mapY);

  // Frustum culling - only render buildings visible to camera
  // EXPANDED frustum to include shadow casters (buildings can cast shadows from off-screen)
  const [visibleBuildings, setVisibleBuildings] = React.useState<BuildingMetadata[]>(metadata);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const frustumMatrix = useMemo(() => new THREE.Matrix4(), []);
  const expandedFrustum = useMemo(() => new THREE.Frustum(), []);
  const boundingSphere = useMemo(() => new THREE.Sphere(), []);
  const lastCullUpdateRef = React.useRef(0);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    // Update frustum culling every 0.2 seconds (5 times per second)
    if (elapsed - lastCullUpdateRef.current < 0.2) return;
    lastCullUpdateRef.current = elapsed;

    frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(frustumMatrix);

    // Create expanded frustum for shadow casting
    // We need to render buildings outside view if they cast shadows into view
    const expandedProjection = camera.projectionMatrix.clone();
    const planes = frustum.planes;

    // Expand frustum planes by moving them outward
    expandedFrustum.planes[0] = planes[0].clone(); // left
    expandedFrustum.planes[1] = planes[1].clone(); // right
    expandedFrustum.planes[2] = planes[2].clone(); // top
    expandedFrustum.planes[3] = planes[3].clone(); // bottom
    expandedFrustum.planes[4] = planes[4].clone(); // near
    expandedFrustum.planes[5] = planes[5].clone(); // far

    // Push each plane outward by adjusting constant (expands frustum by ~50 units for shadows)
    for (let i = 0; i < 4; i++) {
      expandedFrustum.planes[i].constant += 50;
    }

    const visible: BuildingMetadata[] = [];
    for (const building of metadata) {
      // Create bounding sphere for building (approximate radius of 10 units)
      boundingSphere.set(
        new THREE.Vector3(building.position[0], building.position[1], building.position[2]),
        10 // radius - covers most building sizes
      );

      // Use expanded frustum to include shadow casters
      if (expandedFrustum.intersectsSphere(boundingSphere)) {
        visible.push(building);
      }
    }

    // Only update state if visibility changed
    if (visible.length !== visibleBuildings.length) {
      setVisibleBuildings(visible);
    }
  });

  return (
    <group>
      {/* Instanced rendering for performance - reduces draw calls by ~10x */}
      <InstancedWindows buildings={visibleBuildings} district={district} nightFactor={nightFactor} />
      <InstancedDecorations buildings={visibleBuildings} district={district} />

      {/* Individual buildings (now without windows and some decorations, which are instanced above) */}
      {/* FRUSTUM CULLED - only renders buildings visible to camera (30-40% performance gain) */}
      {visibleBuildings.map((data) => (
        <Building
          key={data.id}
          data={data}
          mainMaterial={materials.get(data.type) || materials.get(BuildingType.RESIDENTIAL)!}
          otherMaterials={otherMaterials}
          isNear={nearBuildingId === data.id}
          torchIntensity={torchIntensity}
          district={district}
          nightFactor={nightFactor}
          noiseTextures={noiseTextures}
        />
      ))}
    </group>
  );
};

export const Ground: React.FC<{ onClick?: (point: THREE.Vector3) => void; district: DistrictType; seed: number; terrainSeed: number }> = ({ onClick, district, seed, terrainSeed }) => {
  const roughnessTexture = useMemo(() => createNoiseTexture(128, 0.05), []);
  const blotchTexture = useMemo(() => createBlotchTexture(512), []);
  const { camera, scene } = useThree();
  const buildTerrain = (size: number, segments: number) => {
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const height = getTerrainHeight(district, x, y, terrainSeed);
      pos.setZ(i, height);
    }
    geom.computeVertexNormals();
    return geom;
  };
  const terrainGeometry = useMemo(() => {
    if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS') return null;
    return buildTerrain(250, 120);
  }, [district, terrainSeed]);
  const innerTerrainGeometry = useMemo(() => {
    if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS') return null;
    return buildTerrain(60, 40);
  }, [district, terrainSeed]);
  const baseGeometry = useMemo(() => new THREE.PlaneGeometry(250, 250, 1, 1), []);
  const innerBaseGeometry = useMemo(() => new THREE.PlaneGeometry(60, 60, 1, 1), []);

    const groundPalette = useMemo(() => ({
      MARKET: ['#e3c595', '#dbbe8e', '#d4b687', '#cdae80', '#c6a679'],
      WEALTHY: ['#d7d1c4', '#cfc7b6'],
      HOVELS: ['#b68a5f', '#a47b54', '#9a734d'],
      ALLEYS: ['#b68a5f', '#a47b54', '#9a734d'],
      SALHIYYA: ['#b4a27a', '#a8956f', '#9f8c69'],
      OUTSKIRTS: ['#b7a987', '#aa9a77', '#9f8f6c'],
      CARAVANSERAI: ['#c8a86f', '#c19d64', '#b7935d'],
      CIVIC: ['#d8c2a0', '#d1b896'],
      DEFAULT: ['#e2c8a2', '#dbc29a']
    }), []);
  const pick = (list: string[]) => list[Math.floor(seed * list.length) % list.length];
  const baseColor = district === 'MARKET' ? pick(groundPalette.MARKET)
    : district === 'WEALTHY' ? pick(groundPalette.WEALTHY)
    : district === 'HOVELS' ? pick(groundPalette.HOVELS)
    : district === 'ALLEYS' ? pick(groundPalette.ALLEYS)
    : district === 'SALHIYYA' ? pick(groundPalette.SALHIYYA)
    : district === 'OUTSKIRTS' ? pick(groundPalette.OUTSKIRTS)
    : district === 'CARAVANSERAI' ? pick(groundPalette.CARAVANSERAI)
    : district === 'CIVIC' ? pick(groundPalette.CIVIC)
    : pick(groundPalette.DEFAULT);
  const overlayColor = district === 'WEALTHY' ? '#c3b9a9'
    : district === 'HOVELS' || district === 'ALLEYS' ? '#9a734d'
    : district === 'SALHIYYA' ? '#917f5f'
    : district === 'OUTSKIRTS' ? '#8f7f5f'
    : district === 'CARAVANSERAI' ? '#b08a52'
    : '#d2b483';

  // PERFORMANCE & REALISM: Custom shader with distance-based horizon fade
  // Solves the "fog soup" problem by only fading at the horizon, not nearby objects
  const groundMaterial = useMemo(() => {
    if (roughnessTexture) {
      roughnessTexture.repeat.set(6, 6);
    }
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.95,
      metalness: 0,
      roughnessMap: roughnessTexture || null,
      bumpMap: roughnessTexture || null,
      bumpScale: 0.0035
    });

    // Inject custom shader code for distance-based horizon fade
    material.onBeforeCompile = (shader) => {
      // Add uniforms for camera position and sky color
      shader.uniforms.cameraPos = { value: new THREE.Vector3() };
      shader.uniforms.skyColor = { value: new THREE.Color(0x2f95ee) }; // Default day sky

      // Inject into vertex shader to pass world position to fragment
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPosition;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;`
      );

      // Inject into fragment shader for distance-based fade
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPosition;
        uniform vec3 cameraPos;
        uniform vec3 skyColor;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>

        // Distance-based horizon fade (only affects distant ground, not nearby)
        float distFromCamera = length(vWorldPosition.xz - cameraPos.xz);
        float horizonFadeStart = 80.0;  // Start fading at 80 units
        float horizonFadeEnd = 140.0;   // Fully sky color at 140 units
        float horizonFade = smoothstep(horizonFadeStart, horizonFadeEnd, distFromCamera);

        // Blend to sky color at horizon
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyColor, horizonFade * 0.85);`
      );

      // Store reference to update uniforms
      material.userData.shader = shader;
    };

    return material;
  }, [roughnessTexture, baseColor]);

  // Update shader uniforms every frame for camera position and sky color
  useFrame(() => {
    const shader = groundMaterial.userData.shader;
    if (shader) {
      shader.uniforms.cameraPos.value.copy(camera.position);
      // Get sky color from scene background
      if (scene.background instanceof THREE.Color) {
        shader.uniforms.skyColor.value.copy(scene.background);
      }
    }
  });

  const groundOverlayMaterial = useMemo(() => {
    if (blotchTexture) {
      blotchTexture.repeat.set(2, 2);
    }
    return new THREE.MeshStandardMaterial({
      color: overlayColor,
      transparent: true,
      opacity: 0.35,
      map: blotchTexture || null,
      depthWrite: false,
      roughness: 1,
      metalness: 0
    });
  }, [blotchTexture, overlayColor]);

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        position={[0, -0.1, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick?.(e.point);
        }}
      >
        <primitive object={terrainGeometry ?? baseGeometry} attach="geometry" />
        <primitive object={groundMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.095, 0]}>
        <primitive object={terrainGeometry ?? baseGeometry} attach="geometry" />
        <primitive object={groundOverlayMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <primitive object={innerTerrainGeometry ?? innerBaseGeometry} attach="geometry" />
        <meshStandardMaterial color={baseColor} roughness={1} opacity={0.18} transparent />
      </mesh>
    </group>
  );
};

export const MosqueBackground: React.FC<{ mapX: number, mapY: number }> = ({ mapX, mapY }) => {
  if (Math.abs(mapX) > 2 || Math.abs(mapY) > 2) return null;
  return (
    <group position={[-90 - mapX * 10, 0, -90 - mapY * 10]}>
      <mesh position={[0, 15, 0]} castShadow>
          <sphereGeometry args={[20, 32, 32, 0, Math.PI * 2, 0, Math.PI/2]} />
          <meshStandardMaterial color="#a89f91" roughness={0.7} />
      </mesh>
      <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[20, 20, 15, 32]} />
          <meshStandardMaterial color="#c2b280" roughness={0.8} />
      </mesh>
      <mesh position={[25, 20, 10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
      <mesh position={[-25, 20, -10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
    </group>
  );
};

const HorizonBackdrop: React.FC<{ timeOfDay?: number }> = ({ timeOfDay }) => {
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const twilightFactor = time >= 17 && time < 19 ? (time - 17) / 2 : time >= 5 && time < 7 ? (7 - time) / 2 : 0;
  const dayFactor = time >= 7 && time < 17 ? 1 : time >= 5 && time < 7 ? (time - 5) / 2 : time >= 17 && time < 19 ? (19 - time) / 2 : 0;

  // Distant silhouette colors - very dark, low opacity
  const silhouetteColor = nightFactor > 0.8 ? '#0a0a0a' : twilightFactor > 0 ? '#1a1a1a' : '#2a2a2a';
  const silhouetteOpacity = nightFactor > 0.8 ? 0.4 : twilightFactor > 0 ? 0.5 : 0.45;

  // Wall color - weathered stone (kept close for boundary)
  const wallColor = nightFactor > 0.8 ? '#2a2a2a' : twilightFactor > 0 ? '#5a5a5a' : '#6a6a5a';

  // Mountain ring - very dark, far distance
  const mountainColor = nightFactor > 0.8 ? '#000000' : twilightFactor > 0 ? '#0a0a14' : '#1a1a2a';
  const mountainOpacity = nightFactor > 0.8 ? 0.35 : twilightFactor > 0 ? 0.45 : 0.5;

  // Smoke color - atmospheric
  const smokeColor = nightFactor > 0.8 ? '#1a1a1a' : twilightFactor > 0 ? '#4a4a4a' : '#6a6a6a';
  const smokeOpacity = nightFactor > 0.8 ? 0.15 : twilightFactor > 0 ? 0.25 : 0.3;

  // Instanced city buildings - SINGLE DRAW CALL
  const buildingInstancesRef = useRef<THREE.InstancedMesh>(null);
  const buildingCount = 70;

  React.useEffect(() => {
    if (!buildingInstancesRef.current) return;

    const tempObj = new THREE.Object3D();
    const baseRadius = 105; // Pushed farther out

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const radiusVariation = ((i * 7) % 5) * 3;
      const radius = baseRadius + radiusVariation;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Procedural height variation (3-8 units) - shorter for distance
      const height = 3 + ((i * 11) % 6);
      // Procedural width variation (2-5 units) - narrower
      const width = 2 + ((i * 13) % 4);
      const depth = 2 + ((i * 17) % 4);

      tempObj.position.set(x, height / 2, z);
      tempObj.scale.set(width, height, depth);
      tempObj.rotation.y = angle + Math.PI / 2;
      tempObj.updateMatrix();
      buildingInstancesRef.current.setMatrixAt(i, tempObj.matrix);
    }

    buildingInstancesRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* INSTANCED DISTANT CITY - Single draw call for 70 buildings at horizon */}
      <instancedMesh ref={buildingInstancesRef} args={[undefined, undefined, buildingCount]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
      </instancedMesh>

      {/* DAMASCUS CITY WALLS - Octagonal ring with gate breaks */}
      <group>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const nextAngle = ((i + 1) / 8) * Math.PI * 2;
          const radius = 82;

          const x1 = Math.cos(angle) * radius;
          const z1 = Math.sin(angle) * radius;
          const x2 = Math.cos(nextAngle) * radius;
          const z2 = Math.sin(nextAngle) * radius;

          const midX = (x1 + x2) / 2;
          const midZ = (z1 + z2) / 2;
          const wallAngle = Math.atan2(z2 - z1, x2 - x1);
          const wallLength = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);

          // Skip walls at cardinal directions (gates: North, South, East, West)
          const isGate = i === 0 || i === 2 || i === 4 || i === 6;

          if (!isGate) {
            return (
              <mesh key={`wall-${i}`} position={[midX, 4, midZ]} rotation={[0, wallAngle, 0]} castShadow={false}>
                <boxGeometry args={[wallLength * 0.8, 8, 2]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} />
              </mesh>
            );
          }
          return null;
        })}
      </group>

      {/* DISTANT HORIZON SILHOUETTES - Far away, unreachable */}
      {/* PERFORMANCE OPTIMIZED: Using instanced meshes instead of individual meshes (46 → 6 draw calls) */}

      {/* Distant minarets scattered on horizon - INSTANCED */}
      {(() => {
        const minaretInstancesRef = useRef<THREE.InstancedMesh>(null);
        const minaretData = [
          { angle: 0, radius: 145, height: 12 },      // North
          { angle: Math.PI / 4, radius: 150, height: 10 },   // NE
          { angle: Math.PI / 2, radius: 155, height: 14 },   // East
          { angle: 3 * Math.PI / 4, radius: 148, height: 9 }, // SE
          { angle: Math.PI, radius: 152, height: 11 },      // South
          { angle: 5 * Math.PI / 4, radius: 147, height: 13 }, // SW
          { angle: 3 * Math.PI / 2, radius: 160, height: 11 }, // West
          { angle: 7 * Math.PI / 4, radius: 143, height: 10 }, // NW
        ];

        React.useEffect(() => {
          if (!minaretInstancesRef.current) return;
          const tempObj = new THREE.Object3D();
          minaretData.forEach((minaret, i) => {
            const x = Math.cos(minaret.angle) * minaret.radius;
            const z = Math.sin(minaret.angle) * minaret.radius;
            tempObj.position.set(x, minaret.height / 2, z);
            // Scale to vary height per minaret
            tempObj.scale.set(1, minaret.height / 11, 1); // normalize to avg height
            tempObj.updateMatrix();
            minaretInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          });
          minaretInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={minaretInstancesRef} args={[undefined, undefined, 8]} castShadow={false}>
            <cylinderGeometry args={[0.8, 1.0, 11, 6]} />
            <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
          </instancedMesh>
        );
      })()}

      {/* Distant dome clusters - INSTANCED (bases and caps separate) */}
      {(() => {
        const domeBasesRef = useRef<THREE.InstancedMesh>(null);
        const domeCapsRef = useRef<THREE.InstancedMesh>(null);
        const domeData = [
          { angle: Math.PI / 6, radius: 142 },       // North
          { angle: Math.PI / 3, radius: 158 },       // NE
          { angle: 5 * Math.PI / 6, radius: 149 },   // SE
          { angle: 4 * Math.PI / 3, radius: 146 },   // SW
          { angle: 5 * Math.PI / 3, radius: 154 },   // NW
        ];

        React.useEffect(() => {
          if (!domeBasesRef.current || !domeCapsRef.current) return;
          const tempObj = new THREE.Object3D();
          domeData.forEach((dome, i) => {
            const x = Math.cos(dome.angle) * dome.radius;
            const z = Math.sin(dome.angle) * dome.radius;

            // Base cylinder
            tempObj.position.set(x, 4, z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            domeBasesRef.current.setMatrixAt(i, tempObj.matrix);

            // Dome cap
            tempObj.position.set(x, 9, z);
            tempObj.updateMatrix();
            domeCapsRef.current.setMatrixAt(i, tempObj.matrix);
          });
          domeBasesRef.current.instanceMatrix.needsUpdate = true;
          domeCapsRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <>
            <instancedMesh ref={domeBasesRef} args={[undefined, undefined, 5]} castShadow={false}>
              <cylinderGeometry args={[3, 3, 8, 8]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
            </instancedMesh>
            <instancedMesh ref={domeCapsRef} args={[undefined, undefined, 5]} castShadow={false}>
              <sphereGeometry args={[3.5, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
            </instancedMesh>
          </>
        );
      })()}

      {/* Distant tree silhouettes - INSTANCED (trunks and canopies separate) */}
      {(() => {
        const treeTrunksRef = useRef<THREE.InstancedMesh>(null);
        const treeCanopiesRef = useRef<THREE.InstancedMesh>(null);

        React.useEffect(() => {
          if (!treeTrunksRef.current || !treeCanopiesRef.current) return;
          const tempObj = new THREE.Object3D();

          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + 0.2;
            const radius = 140 + ((i * 7) % 4) * 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = 6 + ((i * 5) % 4);

            // Trunk
            tempObj.position.set(x, height / 2, z);
            tempObj.scale.set(1, height / 7.5, 1); // normalize to avg height
            tempObj.updateMatrix();
            treeTrunksRef.current.setMatrixAt(i, tempObj.matrix);

            // Canopy
            tempObj.position.set(x, height + 1.5, z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            treeCanopiesRef.current.setMatrixAt(i, tempObj.matrix);
          }

          treeTrunksRef.current.instanceMatrix.needsUpdate = true;
          treeCanopiesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <>
            <instancedMesh ref={treeTrunksRef} args={[undefined, undefined, 12]} castShadow={false}>
              <cylinderGeometry args={[0.3, 0.4, 7.5, 4]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity * 0.8} />
            </instancedMesh>
            <instancedMesh ref={treeCanopiesRef} args={[undefined, undefined, 12]} castShadow={false}>
              <sphereGeometry args={[1.8, 6, 4]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity * 0.7} />
            </instancedMesh>
          </>
        );
      })()}

      {/* Chimney smoke - atmospheric detail - INSTANCED */}
      {(() => {
        const smokeInstancesRef = useRef<THREE.InstancedMesh>(null);
        const smokeData = [
          { x: 100, z: 100 },
          { x: -110, z: 95 },
          { x: 105, z: -100 },
          { x: -95, z: -105 },
        ];

        React.useEffect(() => {
          if (!smokeInstancesRef.current) return;
          const tempObj = new THREE.Object3D();
          smokeData.forEach((smoke, i) => {
            tempObj.position.set(smoke.x, 8, smoke.z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            smokeInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          });
          smokeInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={smokeInstancesRef} args={[undefined, undefined, 4]} castShadow={false}>
            <cylinderGeometry args={[1.5, 0.5, 6, 6]} />
            <meshStandardMaterial color={smokeColor} roughness={1} transparent opacity={smokeOpacity} />
          </instancedMesh>
        );
      })()}

      {/* Mount Qasioun - very distant mountain ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <ringGeometry args={[165, 180, 64]} />
        <meshStandardMaterial color={mountainColor} transparent opacity={mountainOpacity} roughness={1} />
      </mesh>

      {/* HORIZON LINE GRADIENT - Smooth transition where ground meets sky */}
      {/* Sky color for blending */}
      {(() => {
        const horizonSkyColor = nightFactor > 0.8 ? '#0f1829' : twilightFactor > 0 ? '#f7b25a' : '#2f95ee';

        return (
          <>
            {/* Multiple thin rings creating gradient from ground to sky */}
            {[
              { height: 0.1, radius: [100, 180], opacity: 0.5, colorMix: 0 },    // Ground color
              { height: 0.5, radius: [100, 180], opacity: 0.45, colorMix: 0.15 },
              { height: 1.0, radius: [100, 180], opacity: 0.4, colorMix: 0.3 },
              { height: 1.8, radius: [100, 180], opacity: 0.35, colorMix: 0.45 },
              { height: 2.8, radius: [100, 180], opacity: 0.3, colorMix: 0.6 },
              { height: 4.0, radius: [100, 180], opacity: 0.25, colorMix: 0.75 },
              { height: 5.5, radius: [100, 180], opacity: 0.2, colorMix: 0.85 },
              { height: 7.5, radius: [100, 180], opacity: 0.15, colorMix: 0.95 },  // Sky color
            ].map((layer, i) => {
              // Blend from ground color to sky color
              const groundColor = new THREE.Color('#d4b894'); // Warm ground
              const skyColor = new THREE.Color(horizonSkyColor);
              const blendedColor = groundColor.clone().lerp(skyColor, layer.colorMix);

              return (
                <mesh key={`horizon-gradient-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, layer.height, 0]}>
                  <ringGeometry args={[layer.radius[0], layer.radius[1], 64]} />
                  <meshStandardMaterial
                    color={blendedColor}
                    transparent
                    opacity={layer.opacity * (nightFactor > 0.8 ? 0.6 : twilightFactor > 0 ? 0.8 : 1.0)}
                    roughness={1}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </>
        );
      })()}
    </group>
  );
};

export const CentralWell: React.FC<{ mapX: number, mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  if (mapX !== 0 || mapY !== 0) return null;
  const waterRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const rippleRef2 = useRef<THREE.Mesh>(null);
  const spoutRef = useRef<THREE.Points>(null);
  const spoutGeometry = useRef<THREE.BufferGeometry | null>(null);
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;
    waterRef.current.rotation.z = t * 0.1;
    waterRef.current.position.y = 0.82 + Math.sin(t * 2) * 0.02;
    if (rippleRef.current) {
      const scale = 1 + (Math.sin(t * 1.6) + 1) * 0.02;
      rippleRef.current.scale.set(scale, scale, 1);
      rippleRef.current.material.opacity = 0.35 + Math.sin(t * 1.6 + 0.5) * 0.1;
    }
    if (rippleRef2.current) {
      const scale = 1 + (Math.sin(t * 1.2 + 1.4) + 1) * 0.025;
      rippleRef2.current.scale.set(scale, scale, 1);
      rippleRef2.current.material.opacity = 0.25 + Math.sin(t * 1.2 + 1.2) * 0.08;
    }
    if (spoutRef.current && spoutGeometry.current) {
      const positions = spoutGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const x = positions.array[ix] as number;
        const z = positions.array[ix + 2] as number;
        const baseY = (i % 12) * 0.06;
        positions.array[ix + 1] = 0.9 + ((t * 0.6 + i * 0.12) % 0.7) + baseY;
        positions.array[ix] = x * (1 + Math.sin(t + i) * 0.05);
        positions.array[ix + 2] = z * (1 + Math.cos(t + i) * 0.05);
      }
      positions.needsUpdate = true;
    }
  });

  const spoutPoints = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.06 + Math.random() * 0.04;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.9 + Math.random() * 0.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    spoutGeometry.current = geometry;
    return geometry;
  }, []);

  return (
    <HoverableGroup
      position={[0, 0, 0]}
      boxSize={[14, 6, 10]}
      color={HOVER_WIREFRAME_COLORS.poi}
      labelTitle="Market Fountain"
      labelLines={['Fresh water', 'Carved limestone', 'City gathering place']}
      labelOffset={[0, 4.2, 0]}
    >
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.4, 3.8, 1.1, 20]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.25, 20]} />
        <meshStandardMaterial color="#b79e7f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <torusGeometry args={[3.1, 0.2, 8, 24]} />
        <meshStandardMaterial color="#9b7b4f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.4, 16]} />
        <meshStandardMaterial color="#7b5a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.3, 12]} />
        <meshStandardMaterial color="#a98963" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 12]} />
        <meshStandardMaterial color="#bfa57e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 0.9, 10]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
      <mesh ref={waterRef} position={[0, 0.82, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[2.6, 24]} />
        <meshStandardMaterial color="#1b4f7a" roughness={0.15} metalness={0.7} />
      </mesh>
      <points ref={spoutRef} geometry={spoutPoints} position={[0, 0.7, 0]}>
        <pointsMaterial color="#9bd4f2" size={0.055} sizeAttenuation transparent opacity={0.85} />
      </points>
      <mesh ref={rippleRef} position={[0, 0.83, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.1, 2.3, 32]} />
        <meshStandardMaterial color="#6aa5c9" transparent opacity={0.35} roughness={0.1} metalness={0.4} />
      </mesh>
      <mesh ref={rippleRef2} position={[0, 0.835, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.8, 2.1, 32]} />
        <meshStandardMaterial color="#5a95ba" transparent opacity={0.25} roughness={0.1} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
          <boxGeometry args={[4.6, 0.2, 4.6]} />
          <meshStandardMaterial color="#3d2817" roughness={1.0} />
      </mesh>
      <HoverableGroup
        position={[-9, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <HoverableGroup
        position={[9, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <PlazaCat waypoints={[[-12, 0.28, 9], [12, 0.28, -9], [6, 0.12, 6]]} />
    </HoverableGroup>
  );
};

const WealthyGarden: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'WEALTHY') return null;
  const seed = seededRandom(mapX * 1000 + mapY * 31 + 17);
  const fountainSpots = [
    [-10, 0, 8],
    [10, 0, -8],
  ] as Array<[number, number, number]>;
  const treeSpots = [
    [-14, 0, -2],
    [14, 0, 2],
    [0, 0, -14],
  ] as Array<[number, number, number]>;
  const flowerSpots = [
    [-6, 0, 12],
    [6, 0, -12],
    [-12, 0, -10],
    [12, 0, 10],
  ] as Array<[number, number, number]>;

  return (
    <group>
      {fountainSpots.map((spot, i) => (
        <group key={`wealthy-fountain-${i}`} position={spot}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.4, 1.6, 0.7, 18]} />
            <meshStandardMaterial color="#c9c1b3" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.2, 18]} />
            <meshStandardMaterial color="#d8d0c2" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.05, 18]} />
            <meshStandardMaterial color="#2b6b8f" roughness={0.2} metalness={0.4} />
          </mesh>
        </group>
      ))}
      {treeSpots.map((spot, i) => (
        <group key={`wealthy-tree-${i}`} position={spot}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1.4, 6]} />
            <meshStandardMaterial color="#7b5a3c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.7, 0]} castShadow>
            <sphereGeometry args={[0.9, 10, 8]} />
            <meshStandardMaterial color="#3f6b3c" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {flowerSpots.map((spot, i) => (
        <group key={`wealthy-flower-${i}`} position={spot}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            <circleGeometry args={[2.2, 18]} />
            <meshStandardMaterial color={seed > 0.5 ? '#4f7b4a' : '#5a874f'} roughness={1} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <sphereGeometry args={[0.4, 8, 6]} />
            <meshStandardMaterial color={seed > 0.5 ? '#c26b6b' : '#b86f4a'} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CitadelComplex: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CIVIC') return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Outer walls */}
      <mesh position={[0, 3.5, -18]} castShadow receiveShadow>
        <boxGeometry args={[50, 7, 3]} />
        <meshStandardMaterial color="#8d8273" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 18]} castShadow receiveShadow>
        <boxGeometry args={[50, 7, 3]} />
        <meshStandardMaterial color="#8d8273" roughness={0.9} />
      </mesh>
      <mesh position={[-24, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 7, 36]} />
        <meshStandardMaterial color="#85796a" roughness={0.92} />
      </mesh>
      <mesh position={[24, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 7, 36]} />
        <meshStandardMaterial color="#85796a" roughness={0.92} />
      </mesh>

      {/* Corner towers */}
      {[
        [-24, 5.2, -18],
        [24, 5.2, -18],
        [-24, 5.2, 18],
        [24, 5.2, 18],
      ].map((pos, i) => (
        <mesh key={`tower-${i}`} position={pos as [number, number, number]} castShadow receiveShadow>
          <cylinderGeometry args={[3.2, 3.6, 10.5, 10]} />
          <meshStandardMaterial color="#7e7265" roughness={0.9} />
        </mesh>
      ))}

      {/* Gatehouse */}
      <group position={[0, 0, -18]}>
        <mesh position={[0, 3.8, -2.2]} castShadow receiveShadow>
          <boxGeometry args={[12, 7.6, 6]} />
          <meshStandardMaterial color="#7a6e5f" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.2, -5]} castShadow>
          <boxGeometry args={[5, 2.4, 0.6]} />
          <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
        </mesh>
      </group>

      {/* Inner keep */}
      <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 15, 16]} />
        <meshStandardMaterial color="#8b8073" roughness={0.88} />
      </mesh>
      <mesh position={[0, 15.5, 0]} castShadow>
        <boxGeometry args={[18, 1.4, 18]} />
        <meshStandardMaterial color="#9a8e7f" roughness={0.9} />
      </mesh>

      {/* Courtyard outbuildings */}
      <mesh position={[-10, 1.6, 8]} castShadow receiveShadow>
        <boxGeometry args={[8, 3.2, 6]} />
        <meshStandardMaterial color="#7c6f60" roughness={0.92} />
      </mesh>
      <mesh position={[12, 1.4, 6]} castShadow receiveShadow>
        <boxGeometry args={[6, 2.8, 5]} />
        <meshStandardMaterial color="#706457" roughness={0.92} />
      </mesh>
      <mesh position={[8, 1.2, -6]} castShadow receiveShadow>
        <boxGeometry args={[5, 2.4, 4]} />
        <meshStandardMaterial color="#6a5e52" roughness={0.93} />
      </mesh>
    </group>
  );
};

const OutskirtsDecor: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'OUTSKIRTS') return null;
  const palms = [
    [-18, 0, -10],
    [16, 0, -6],
    [-8, 0, 16],
    [10, 0, 14]
  ] as Array<[number, number, number]>;
  const jars = [
    [-4, 0, -6],
    [6, 0, 4]
  ] as Array<[number, number, number]>;

  return (
    <group>
      {palms.map((pos, i) => (
        <group key={`palm-${i}`} position={pos}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 4.4, 6]} />
            <meshStandardMaterial color="#8b6a4a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.6, 0]} castShadow>
            <sphereGeometry args={[1.4, 8, 6]} />
            <meshStandardMaterial color="#3f6b3c" roughness={0.85} />
          </mesh>
          <mesh position={[0.9, 4.2, 0]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[2.4, 0.15, 0.6]} />
            <meshStandardMaterial color="#3c6a3a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.9, 4.2, 0]} rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[2.4, 0.15, 0.6]} />
            <meshStandardMaterial color="#3c6a3a" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {jars.map((pos, i) => (
        <mesh key={`outskirt-jar-${i}`} position={pos} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 0.8, 10]} />
          <meshStandardMaterial color="#a9703a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

const CaravanseraiComplex: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CARAVANSERAI') return null;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  const lanterns: Array<[number, number, number]> = [
    [-12, 4.2, -10],
    [12, 4.2, -10],
    [-12, 4.2, 10],
    [12, 4.2, 10],
    [0, 4.2, -14],
    [0, 4.2, 14],
  ];

  const camels: Array<[number, number, number]> = [
    [-6, 0, -2],
    [6, 0, 2],
  ];

  return (
    <group>
      {/* Outer walls */}
      <mesh position={[0, 4, -18]} castShadow receiveShadow>
        <boxGeometry args={[60, 8, 3]} />
        <meshStandardMaterial color="#8b6a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4, 18]} castShadow receiveShadow>
        <boxGeometry args={[60, 8, 3]} />
        <meshStandardMaterial color="#8b6a4a" roughness={0.9} />
      </mesh>
      <mesh position={[-28, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 8, 36]} />
        <meshStandardMaterial color="#7f5f44" roughness={0.92} />
      </mesh>
      <mesh position={[28, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 8, 36]} />
        <meshStandardMaterial color="#7f5f44" roughness={0.92} />
      </mesh>

      {/* Gatehouse */}
      <mesh position={[0, 4, -18]} castShadow receiveShadow>
        <boxGeometry args={[14, 8, 6]} />
        <meshStandardMaterial color="#7a5a40" roughness={0.88} />
      </mesh>
      <mesh position={[0, 2, -21]} castShadow>
        <boxGeometry args={[6, 4, 1]} />
        <meshStandardMaterial color="#5a3b26" roughness={0.9} />
      </mesh>

      {/* Inner arcade blocks */}
      <mesh position={[0, 2, -8]} castShadow receiveShadow>
        <boxGeometry args={[36, 4, 6]} />
        <meshStandardMaterial color="#9b7a52" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2, 8]} castShadow receiveShadow>
        <boxGeometry args={[36, 4, 6]} />
        <meshStandardMaterial color="#9b7a52" roughness={0.9} />
      </mesh>

      {/* Central fountain */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.6, 1, 18]} />
        <meshStandardMaterial color="#a98b62" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.4, 0.35, 12]} />
        <meshStandardMaterial color="#bfa27a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 20]} />
        <meshStandardMaterial color="#2a6f8d" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* Camels */}
      {camels.map((pos, i) => (
        <group key={`camel-${i}`} position={pos}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[2.2, 1.2, 0.8]} />
            <meshStandardMaterial color="#b58a5a" roughness={0.9} />
          </mesh>
          <mesh position={[0.6, 1.4, 0]} castShadow>
            <boxGeometry args={[0.8, 0.8, 0.6]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.9} />
          </mesh>
          <mesh position={[1.4, 1.6, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.9} />
          </mesh>
          {[-0.8, 0.8].map((lx) => (
            <mesh key={`camel-leg-${i}-${lx}`} position={[lx, 0.2, 0]} castShadow>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Hanging lanterns */}
      {lanterns.map((pos, i) => (
        <group key={`lantern-${i}`} position={pos}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshStandardMaterial color="#ffd188" emissive="#ff9a3c" emissiveIntensity={0.6 * nightFactor} />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.45, 0.35]} castShadow>
            <boxGeometry args={[0.6, 0.15, 0.05]} />
            <meshStandardMaterial color="#5a4028" roughness={0.95} />
          </mesh>
          {nightFactor > 0.05 && (
            <>
              <spotLight
                position={[0, -0.1, 0]}
                intensity={2.2 * nightFactor}
                distance={28}
                angle={0.7}
                penumbra={0.7}
                decay={2}
                color="#ffb65a"
                castShadow
                shadow-mapSize={[512, 512]}
              />
              <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 4, 0, 0]} castShadow>
                <boxGeometry args={[0.9, 0.9, 0.05]} />
                <meshStandardMaterial color="#6b4a2d" roughness={0.95} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
};

export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, onGroundClick, onBuildingsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false, pushables = [] }) => {
  const district = getDistrictType(mapX, mapY);
  const groundSeed = seededRandom(mapX * 1000 + mapY * 13 + 7);
  const terrainSeed = mapX * 1000 + mapY * 13 + 19;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  return (
    <HoverWireframeContext.Provider value={enableHoverWireframe}>
      <HoverLabelContext.Provider value={enableHoverLabel}>
        <group>
          <Ground onClick={onGroundClick} district={district} seed={groundSeed} terrainSeed={terrainSeed} />
          <Buildings mapX={mapX} mapY={mapY} onBuildingsGenerated={onBuildingsGenerated} nearBuildingId={nearBuildingId} torchIntensity={torchIntensity} nightFactor={nightFactor} />
          <MosqueBackground mapX={mapX} mapY={mapY} />
          <HorizonBackdrop timeOfDay={timeOfDay} />
          <CentralWell mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          <WealthyGarden mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          <CitadelComplex mapX={mapX} mapY={mapY} />
          <OutskirtsDecor mapX={mapX} mapY={mapY} />
          <CaravanseraiComplex mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          {pushables.length > 0 && <PushableDecorations items={pushables} />}
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
