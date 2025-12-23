
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';
import { getTerrainHeight, buildHeightmapFromGeometry, TerrainHeightmap, sampleTerrainHeight } from '../utils/terrain';
import { PushableObject } from '../utils/pushables';
import { LaundryLine, getCatenaryPoint } from '../utils/laundry';

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

// Create a radial grime/AO texture with noise for building contact areas
const createGrimeTexture = (size = 256) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fill with transparent background
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const maxRadius = size * 0.48;

  // Create radial gradient with noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / maxRadius;

      if (normalizedDist <= 1.0) {
        // Radial fade from edge to center (dark at edge, fade to center)
        const radialFade = 1 - normalizedDist;

        // Add noise for organic effect
        const noise = Math.random() * 0.25 + 0.75;

        // Softer falloff for visible grounding
        const alpha = Math.pow(radialFade, 1.2) * noise;

        if (alpha > 0.05) {
          ctx.fillStyle = `rgba(15, 12, 8, ${alpha})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
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

// PERFORMANCE: Cache textures at module level to avoid recreation on every mount
// Saves ~327KB of canvas operations + 8 texture uploads per map change
const CACHED_NOISE_TEXTURES = [
  createNoiseTexture(256, 0.15), // Light texture
  createNoiseTexture(256, 0.25), // Medium-light
  createNoiseTexture(256, 0.35), // Medium (original)
  createNoiseTexture(256, 0.45), // Medium-heavy
  createNoiseTexture(256, 0.55), // Heavy texture
];

const CACHED_STRIPE_TEXTURES = [
  createStripeTexture('#ead9b7', '#cdb68f'),
  createStripeTexture('#e0cdaa', '#bca888'),
  createStripeTexture('#e2d3b2', '#b7b79a')
];

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

  const nightTintRef = useRef(new THREE.Color());
  const tintedColorRef = useRef(new THREE.Color());

  useEffect(() => {
    if (!(material instanceof THREE.MeshStandardMaterial) || !(baseMaterial instanceof THREE.MeshStandardMaterial)) return;
    nightTintRef.current.set(tintColor);
    tintedColorRef.current.copy(baseMaterial.color).lerp(nightTintRef.current, nightFactor);
    tintedColorRef.current.multiplyScalar(1 - nightFactor * darkenScale);
    material.color.copy(tintedColorRef.current);
    // REMOVED: needsUpdate - color changes don't require shader recompilation
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
  onHeightmapBuilt?: (heightmap: TerrainHeightmap | null) => void;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
  nearBuildingId?: string | null;
  timeOfDay?: number;
  enableHoverWireframe?: boolean;
  enableHoverLabel?: boolean;
  pushables?: PushableObject[];
  fogColor?: THREE.Color;
  heightmap?: TerrainHeightmap | null;
  laundryLines?: LaundryLine[];
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

// Cat color variants
const CAT_VARIANTS = [
  { name: 'Brown Tabby', primary: '#6b5a4b', secondary: '#4a3d32', eyeColor: '#3d5c3d' },
  { name: 'Orange Tabby', primary: '#c4713b', secondary: '#8b4513', eyeColor: '#d4a017' },
  { name: 'Gray Tabby', primary: '#6e6e6e', secondary: '#4a4a4a', eyeColor: '#7db37d' },
  { name: 'Siamese', primary: '#e8dcc8', secondary: '#6b5344', eyeColor: '#4a90c2' },
  { name: 'Tortoiseshell', primary: '#5c4033', secondary: '#c4713b', eyeColor: '#d4a017' },
  { name: 'Black', primary: '#1a1a1a', secondary: '#0a0a0a', eyeColor: '#d4a017' },
  { name: 'White', primary: '#f0ebe0', secondary: '#d8d0c0', eyeColor: '#4a90c2' },
  { name: 'Ginger', primary: '#d4711a', secondary: '#a05010', eyeColor: '#3d5c3d' },
];

const PlazaCat: React.FC<{ waypoints: [number, number, number][]; seed?: number }> = ({ waypoints, seed = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailSegments = useRef<THREE.Group[]>([]);
  const legRefs = useRef<{ upper: THREE.Group; lower: THREE.Group }[]>([]);
  const earRefs = useRef<THREE.Mesh[]>([]);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const state = useRef({
    targetIndex: 0,
    mode: 'sleep' as 'sleep' | 'walk' | 'idle',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0
  });

  // Randomize cat appearance based on seed
  const catAppearance = useMemo(() => {
    const rng = (s: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return { val: s / 0x7fffffff, next: s }; };
    let s = seed + 54321;
    const r1 = rng(s); s = r1.next;
    const r2 = rng(s);
    const variant = CAT_VARIANTS[Math.floor(r1.val * CAT_VARIANTS.length)];
    const scale = 0.8 + r2.val * 0.5; // Size varies from 0.8 to 1.3
    return { variant, scale };
  }, [seed]);

  // Materials based on cat variant
  const furMaterial = useMemo(() => (
    <meshStandardMaterial color={catAppearance.variant.primary} roughness={0.95} />
  ), [catAppearance]);
  const darkFurMaterial = useMemo(() => (
    <meshStandardMaterial color={catAppearance.variant.secondary} roughness={0.95} />
  ), [catAppearance]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;
    state.current.breathCycle += delta;

    // Breathing animation (subtle body scale pulse)
    const breathScale = 1 + Math.sin(state.current.breathCycle * 2) * 0.015;
    bodyRef.current.scale.setScalar(breathScale);

    // Ear twitches (occasional)
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const twitch = Math.sin(state.current.breathCycle * 8 + i * Math.PI) > 0.95 ? 0.1 : 0;
        ear.rotation.z = (i === 0 ? 0.2 : -0.2) + twitch;
      }
    });

    // Tail wave animation - travels down segments (reduced since nested rotations accumulate)
    tailSegments.current.forEach((seg, i) => {
      if (seg) {
        const phase = state.current.breathCycle * 3 - i * 0.4;
        const intensity = state.current.mode === 'walk' ? 0.25 : 0.12;
        seg.rotation.z = Math.sin(phase) * intensity;
        seg.rotation.y = Math.cos(phase * 0.7) * intensity * 0.4;
      }
    });

    if (state.current.mode === 'sleep') {
      // Sleeping: curled up, gentle breathing
      if (headRef.current) {
        headRef.current.rotation.y = -0.3; // Head turned to side
        headRef.current.position.y = 0.08; // Lower head
      }
      // Tuck legs under body (use Z rotation since body is rotated -90° on Y)
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 0.8;
          leg.lower.rotation.z = -1.2;
        }
      });

      if (state.current.timer <= 0) {
        state.current.mode = Math.random() > 0.3 ? 'walk' : 'idle';
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 6 + Math.random() * 6;
      }
      return;
    }

    if (state.current.mode === 'idle') {
      // Idle: sitting, alert
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.5) * 0.2;
        headRef.current.position.y = 0.12;
      }
      // Legs in sitting position (use Z rotation since body is rotated -90° on Y)
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.1 : 0.6;
          leg.lower.rotation.z = isFront ? 0 : -0.8;
        }
      });

      if (state.current.timer <= 0) {
        state.current.mode = 'walk';
        state.current.timer = 6 + Math.random() * 6;
      }
      return;
    }

    // Walking mode
    const target = new THREE.Vector3(...waypoints[state.current.targetIndex]);
    const dir = target.clone().sub(current);
    const dist = dir.length();

    if (dist < 0.1) {
      state.current.mode = Math.random() > 0.5 ? 'sleep' : 'idle';
      state.current.timer = 8 + Math.random() * 10;
      return;
    }

    dir.normalize();
    current.add(dir.multiplyScalar(delta * 0.5));
    groupRef.current.lookAt(target);

    // Advance walk cycle
    state.current.walkCycle += delta * 8;

    // Head bob while walking
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.5) * 0.08;
      headRef.current.position.y = 0.12 + Math.sin(state.current.walkCycle * 2) * 0.01;
    }

    // Leg animation - opposite pairs move together (use Z rotation since body is rotated -90° on Y)
    legRefs.current.forEach((leg, i) => {
      if (leg?.upper && leg?.lower) {
        const isFront = i < 2;
        const isLeft = i % 2 === 0;
        // Diagonal pairs: front-left with back-right, front-right with back-left
        const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
        const cycle = state.current.walkCycle + phaseOffset;

        // Upper leg swings forward/back (Z axis after body rotation)
        leg.upper.rotation.z = Math.sin(cycle) * 0.4;
        // Lower leg follows with delay
        leg.lower.rotation.z = Math.sin(cycle - 0.5) * 0.3 - 0.2;
      }
    });
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={waypoints[0]}
      scale={catAppearance.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={`${catAppearance.variant.name} Cat`}
          lines={['Local stray', 'Dozing between strolls', 'Likes warm benches']}
          offset={[0, 0.4 / catAppearance.scale, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[0.5, 0.35, 0.3]} color={HOVER_WIREFRAME_COLORS.default} position={[0, 0.12, 0]} />
          <HoverOutlineBox size={[0.55, 0.39, 0.34]} color={HOVER_WIREFRAME_COLORS.default} opacity={0.35} position={[0, 0.12, 0]} />
        </>
      )}

      {/* Body group - raised 0.07 so paws touch ground, rotated so cat faces -Z for lookAt */}
      <group ref={bodyRef} position={[0, 0.07, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Main body - elongated ellipsoid */}
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
          {furMaterial}
        </mesh>

        {/* Rear haunch - slightly larger back */}
        <mesh position={[-0.08, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          {furMaterial}
        </mesh>

        {/* Chest - front of body */}
        <mesh position={[0.1, 0.13, 0]} castShadow>
          <sphereGeometry args={[0.055, 8, 6]} />
          {furMaterial}
        </mesh>

        {/* Head group */}
        <group ref={headRef} position={[0.16, 0.12, 0]}>
          {/* Main head - slightly wedge-shaped */}
          <mesh castShadow>
            <sphereGeometry args={[0.055, 8, 8]} />
            {furMaterial}
          </mesh>

          {/* Muzzle/snout */}
          <mesh position={[0.04, -0.01, 0]} castShadow>
            <sphereGeometry args={[0.03, 6, 6]} />
            {furMaterial}
          </mesh>

          {/* Ears */}
          <mesh
            ref={el => { if (el) earRefs.current[0] = el; }}
            position={[-0.01, 0.055, 0.03]}
            rotation={[0.1, 0, 0.2]}
            castShadow
          >
            <coneGeometry args={[0.025, 0.045, 4]} />
            {furMaterial}
          </mesh>
          <mesh
            ref={el => { if (el) earRefs.current[1] = el; }}
            position={[-0.01, 0.055, -0.03]}
            rotation={[-0.1, 0, -0.2]}
            castShadow
          >
            <coneGeometry args={[0.025, 0.045, 4]} />
            {furMaterial}
          </mesh>

          {/* Inner ears (pink) */}
          <mesh position={[-0.005, 0.05, 0.028]} rotation={[0.1, 0, 0.2]}>
            <coneGeometry args={[0.015, 0.03, 4]} />
            <meshStandardMaterial color="#d4a5a5" roughness={1} />
          </mesh>
          <mesh position={[-0.005, 0.05, -0.028]} rotation={[-0.1, 0, -0.2]}>
            <coneGeometry args={[0.015, 0.03, 4]} />
            <meshStandardMaterial color="#d4a5a5" roughness={1} />
          </mesh>

          {/* Eyes */}
          <mesh position={[0.035, 0.015, 0.025]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color={catAppearance.variant.eyeColor} roughness={0.3} />
          </mesh>
          <mesh position={[0.035, 0.015, -0.025]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color={catAppearance.variant.eyeColor} roughness={0.3} />
          </mesh>
          {/* Pupils */}
          <mesh position={[0.045, 0.015, 0.025]}>
            <sphereGeometry args={[0.006, 4, 4]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          <mesh position={[0.045, 0.015, -0.025]}>
            <sphereGeometry args={[0.006, 4, 4]} />
            <meshBasicMaterial color="#111111" />
          </mesh>

          {/* Nose */}
          <mesh position={[0.068, -0.015, 0]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshStandardMaterial color="#2a1a12" roughness={0.5} />
          </mesh>

          {/* Whiskers (thin cylinders) */}
          {[-1, 1].map(side => (
            <group key={side} position={[0.05, -0.01, side * 0.02]}>
              {[0, 1, 2].map(i => (
                <mesh
                  key={i}
                  position={[0.02, (i - 1) * 0.008, side * 0.015]}
                  rotation={[0, side * 0.3, (i - 1) * 0.15]}
                >
                  <cylinderGeometry args={[0.001, 0.001, 0.04, 3]} />
                  <meshBasicMaterial color="#888888" transparent opacity={0.6} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* Legs - 4 articulated legs */}
        {[
          { pos: [0.08, 0.06, 0.04], front: true, left: true },
          { pos: [0.08, 0.06, -0.04], front: true, left: false },
          { pos: [-0.08, 0.06, 0.04], front: false, left: true },
          { pos: [-0.08, 0.06, -0.04], front: false, left: false },
        ].map((leg, i) => (
          <group key={i} position={leg.pos as [number, number, number]}>
            {/* Upper leg pivot */}
            <group ref={el => { if (el) legRefs.current[i] = { ...legRefs.current[i], upper: el }; }}>
              <mesh position={[0, -0.03, 0]} castShadow>
                <capsuleGeometry args={[0.018, 0.04, 3, 6]} />
                {furMaterial}
              </mesh>
              {/* Lower leg pivot */}
              <group
                position={[0, -0.055, 0]}
                ref={el => { if (el) legRefs.current[i] = { ...legRefs.current[i], lower: el }; }}
              >
                <mesh position={[0, -0.025, 0]} castShadow>
                  <capsuleGeometry args={[0.014, 0.035, 3, 6]} />
                  {furMaterial}
                </mesh>
                {/* Paw */}
                <mesh position={[0.005, -0.05, 0]} castShadow>
                  <sphereGeometry args={[0.018, 6, 4]} />
                  {darkFurMaterial}
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* Tail - nested segments for cascading wave animation */}
        <group position={[-0.14, 0.1, 0]} rotation={[0, 0, 0.3]}>
          <group ref={el => { if (el) tailSegments.current[0] = el; }}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.014, 0.035, 3, 6]} />
              {furMaterial}
            </mesh>
            <group position={[-0.045, 0, 0]} ref={el => { if (el) tailSegments.current[1] = el; }}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <capsuleGeometry args={[0.012, 0.03, 3, 6]} />
                {furMaterial}
              </mesh>
              <group position={[-0.04, 0, 0]} ref={el => { if (el) tailSegments.current[2] = el; }}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <capsuleGeometry args={[0.01, 0.025, 3, 6]} />
                  {furMaterial}
                </mesh>
                <group position={[-0.035, 0, 0]} ref={el => { if (el) tailSegments.current[3] = el; }}>
                  <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                    <capsuleGeometry args={[0.006, 0.02, 3, 6]} />
                    {darkFurMaterial}
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
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

const PushableGeraniumPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColors = ['#8b5a2b', '#a56a3b', '#7a4a1b'];
  const flowerColors = ['#8b3b3b', '#d64a4a', '#e85a5a'];
  const potColor = potColors[style] || potColors[0];
  const flowerColor = flowerColors[style] || flowerColors[0];

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

const PushableOlivePot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColors = ['#9b5c2e', '#b86c3e', '#8a4c1e'];
  const potColor = potColors[style] || potColors[0];

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

const PushableLemonPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColors = ['#9b5c2e', '#b86b3e', '#8a5228'];
  const potColor = potColors[style] || potColors[0];

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

const PushablePalmPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColors = ['#a86b3a', '#c87a48', '#8a5a2e'];
  const potColor = potColors[style] || potColors[0];

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

const PushableBougainvilleaPot: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.potSize ?? 1.0;
  const style = item.potStyle ?? 0;
  const potColors = ['#9b5c2e', '#b87a4e', '#8a4a1e'];
  const potColor = potColors[style] || potColors[0];
  const flowerColors = ['#d64a7a', '#e85a8a', '#c8396a'];
  const flowerColor = flowerColors[style] || flowerColors[0];

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

const PushableBoulder: React.FC<{ item: PushableObject }> = ({ item }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Update position
    meshRef.current.position.copy(item.position);

    // Update rotation from angular velocity
    if (item.angularVelocity) {
      const angle = item.angularVelocity.length() * 0.016; // Assume 60fps
      if (angle > 0.001) {
        const axis = item.angularVelocity.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        meshRef.current.quaternion.multiply(quaternion);
      }
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <dodecahedronGeometry args={[item.radius / 0.7, 0]} />
      <meshStandardMaterial color="#6a6a5a" roughness={0.95} />
    </mesh>
  );
};

const PushableDecorations: React.FC<{ items: PushableObject[] }> = ({ items }) => (
  <>
    {items.map((item) => {
      if (item.kind === 'boulder') return <PushableBoulder key={item.id} item={item} />;
      if (item.kind === 'bench') return <PushableBench key={item.id} item={item} />;
      if (item.kind === 'clayJar') return <PushableClayJar key={item.id} item={item} />;
      if (item.kind === 'geranium') return <PushableGeraniumPot key={item.id} item={item} />;
      if (item.kind === 'basket') return <PushableBasket key={item.id} item={item} />;
      if (item.kind === 'olivePot') return <PushableOlivePot key={item.id} item={item} />;
      if (item.kind === 'lemonPot') return <PushableLemonPot key={item.id} item={item} />;
      if (item.kind === 'palmPot') return <PushablePalmPot key={item.id} item={item} />;
      if (item.kind === 'bougainvilleaPot') return <PushableBougainvilleaPot key={item.id} item={item} />;
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
  grimeTexture?: THREE.Texture | null;
}> = ({ data, mainMaterial, otherMaterials, isNear, torchIntensity, district, nightFactor, noiseTextures, grimeTexture }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
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
    let needsShaderUpdate = false;
    if ((data.type === BuildingType.COMMERCIAL || data.type === BuildingType.CIVIC) && noiseTextures && noiseTextures.length > 0) {
      // Randomly choose a texture intensity variant (0-4)
      const textureVariant = Math.floor(seededRandom(localSeed + 88) * noiseTextures.length);
      mat.map = noiseTextures[textureVariant];
      mat.bumpMap = noiseTextures[textureVariant];
      // Also vary bump intensity slightly
      const bumpVariation = 0.015 + seededRandom(localSeed + 89) * 0.015; // Range: 0.015-0.03
      mat.bumpScale = bumpVariation;
      needsShaderUpdate = true; // Textures require shader recompilation
    }

    if (data.type === BuildingType.RESIDENTIAL) {
      const roughnessJitter = (seededRandom(localSeed + 55) - 0.5) * 0.1;
      mat.roughness = THREE.MathUtils.clamp(0.8 + roughnessJitter, 0.65, 0.9);
      mat.metalness = 0.03;
      mat.envMapIntensity = 1.35;
      // No shader update needed - these are just uniform changes
    }

    // Only trigger shader recompilation if we actually added/removed textures
    if (needsShaderUpdate) {
      mat.needsUpdate = true;
    }
    return mat;
  }, [data.type, localSeed, mainMaterial, noiseTextures]);
  const baseColorRef = useRef<THREE.Color>(new THREE.Color());
  const fadeTargetRef = useRef<THREE.Color>(new THREE.Color('#1f2328'));
  const lastFadeUpdateRef = useRef(0);

  useEffect(() => {
    if (buildingMaterial instanceof THREE.MeshStandardMaterial) {
      baseColorRef.current.copy(buildingMaterial.color);
    }
  }, [buildingMaterial]);

  // PERFORMANCE: Throttle distance fade to every 0.5s instead of every frame
  // Reduces 30-50 distanceTo() calculations per frame to 6-10 per second
  useFrame((state) => {
    if (!groupRef.current) return;
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return;

    const elapsed = state.clock.elapsedTime;
    if (elapsed - lastFadeUpdateRef.current < 0.5) return;
    lastFadeUpdateRef.current = elapsed;

    const dist = camera.position.distanceTo(groupRef.current.position);
    const fade = THREE.MathUtils.clamp((dist - 18) / 60, 0, 0.55);
    buildingMaterial.color.copy(baseColorRef.current).lerp(fadeTargetRef.current, fade);
  });
  const baseResidentialColor = useMemo(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return null;
    return buildingMaterial.color.clone();
  }, [buildingMaterial]);

  // PERFORMANCE FIX: Throttle material updates to every 2 seconds instead of every frame
  // This reduces GPU uploads from 30 per frame (1800/sec) to 15 per 2s (7.5/sec) = 240x less frequent!
  const lastMaterialUpdateRef = useRef(0);
  const nightTintRef = useRef(new THREE.Color('#6f7f96'));
  const tintedColorRef = useRef(new THREE.Color());

  useFrame((state) => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return;
    if (!baseResidentialColor || data.type !== BuildingType.RESIDENTIAL) return;

    const elapsed = state.clock.elapsedTime;
    // Update every 2 seconds instead of every frame (60 FPS → 0.5 updates/sec = 120x reduction!)
    if (elapsed - lastMaterialUpdateRef.current < 2.0) return;
    lastMaterialUpdateRef.current = elapsed;

    const nightDarken = 1 - nightFactor * 0.55;
    tintedColorRef.current.copy(baseResidentialColor).lerp(nightTintRef.current, nightFactor);
    tintedColorRef.current.multiplyScalar(nightDarken);

    // FIX: Update baseColorRef so distance fade uses the tinted color as base
    // This prevents the two useFrame hooks from fighting each other
    baseColorRef.current.copy(tintedColorRef.current);

    buildingMaterial.envMapIntensity = 1.35 - nightFactor * 0.9;
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
      {/* Ground contact grime - subtle AO with noise for natural grounding */}
      {grimeTexture && (
        <mesh position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[buildingSize * 1.2, buildingSize * 1.2]} />
          <meshBasicMaterial
            map={grimeTexture}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
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
  const glowMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
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
        // GRAPHICS: Randomized brightness - some windows much brighter than others
        // Range from 0.8 (dim) to 2.5 (very bright) for realistic variation
        const glowIntensity = 0.8 + windowGlowRoll * 1.7;

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
      const glowIntensities: number[] = [];

      windowData.forEach((data) => {
        if (data.hasGlow) {
          glowMeshRef.current!.setMatrixAt(glowIndex, data.matrix);
          glowIntensities.push(data.glowIntensity);
          glowIndex++;
        }
      });

      if (glowIndex > 0) {
        glowMeshRef.current.count = glowIndex;
        glowMeshRef.current.instanceMatrix.needsUpdate = true;

        // GRAPHICS: Set per-instance glow intensity as instance attribute
        const intensityArray = new Float32Array(glowIntensities);
        glowMeshRef.current.geometry.setAttribute(
          'instanceGlowIntensity',
          new THREE.InstancedBufferAttribute(intensityArray, 1)
        );
      }
    }
  }, [windowData]);

  // BUGFIX: Dynamically update emissiveIntensity when nightFactor changes
  useEffect(() => {
    if (glowMaterialRef.current) {
      // Base intensity scales with nightFactor: 0 during day, 1.8 at full night
      const baseIntensity = nightFactor > 0.2 ? nightFactor * 1.8 : 0;
      glowMaterialRef.current.emissiveIntensity = baseIntensity;
    }
  }, [nightFactor]);

  const glowCount = useMemo(() => windowData.filter(d => d.hasGlow).length, [windowData]);

  // Create custom shader material with per-instance intensity variation
  const glowMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: '#f5d7a3',
      emissive: '#ff9a3c', // Warmer, more orange-amber glow
      emissiveIntensity: 1.8,
      roughness: 0.9,
      metalness: 0.05,
    });

    // Modify shader to use per-instance glow intensity
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute float instanceGlowIntensity;
        varying float vGlowIntensity;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vGlowIntensity = instanceGlowIntensity;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying float vGlowIntensity;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Apply per-instance intensity variation
        totalEmissiveRadiance *= vGlowIntensity;`
      );
    };

    return material;
  }, []);

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
          <primitive object={glowMaterial} ref={glowMaterialRef} />
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
  heightmap?: TerrainHeightmap | null;
}> = ({ mapX, mapY, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor, heightmap }) => {
  // PERFORMANCE: Use cached textures instead of recreating on every mount
  const noiseTextures = CACHED_NOISE_TEXTURES;
  const grimeTexture = useMemo(() => createGrimeTexture(256), []);
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
  }, []);

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
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#ead9b7', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#e0cdaa', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#e2d3b2', roughness: 0.95, side: THREE.DoubleSide })
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
    if (district === 'MOUNTAIN_SHRINE') {
      // No regular buildings on the mountain - just the shrine (handled separately)
      return [];
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
    if (district === 'SOUTHERN_ROAD') {
      const roadOffset = 12;
      const spacing = 18;
      const span = 3;
      for (let i = -span; i <= span; i++) {
        const z = i * spacing;
        const localSeedLeft = seed + i * 1337 + 11;
        const localSeedRight = seed + i * 1337 + 47;
        const left = generateBuildingMetadata(localSeedLeft, -roadOffset, z);
        const right = generateBuildingMetadata(localSeedRight, roadOffset, z);
        left.sizeScale = 0.9;
        right.sizeScale = 0.9;
        if (seededRandom(localSeedLeft) > 0.7) {
          left.type = BuildingType.COMMERCIAL;
          left.ownerProfession = 'Trader';
        }
        if (seededRandom(localSeedRight) > 0.7) {
          right.type = BuildingType.COMMERCIAL;
          right.ownerProfession = 'Water-Carrier';
        }
        bldMetadata.push(left, right);
      }
      return bldMetadata.filter((b) => {
        const keep = seededRandom(seed + b.position[0] * 17 + b.position[2] * 23) > 0.25;
        return keep;
      });
    }
    if (district === 'CARAVANSERAI') {
      // No regular buildings - the caravanserai structure is handled separately
      return [];
    }

    const size = CONSTANTS.MARKET_SIZE * (district === 'WEALTHY' ? 1.15 : district === 'HOVELS' ? 0.9 : district === 'CIVIC' ? 1.1 : district === 'SALHIYYA' ? 0.5 : 1.0);
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (district === 'WEALTHY' ? 1.25 : district === 'HOVELS' ? 0.75 : district === 'CIVIC' ? 1.1 : district === 'SALHIYYA' ? 1.0 : 1.0);
    const street = CONSTANTS.STREET_WIDTH * (district === 'WEALTHY' ? 2.2 : district === 'HOVELS' ? 0.85 : district === 'CIVIC' ? 2.6 : district === 'SALHIYYA' ? 1.8 : 1.0);
    const gap = baseBuilding + street;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        const skipChance = district === 'WEALTHY' ? 0.55 : district === 'HOVELS' ? 0.2 : district === 'CIVIC' ? 0.7 : district === 'SALHIYYA' ? 0.2 : 0.3;
        if (chance < skipChance) continue;
        if (district === 'CIVIC' && (x * x + z * z) < (gap * 2.2) * (gap * 2.2)) continue;
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (district === 'SALHIYYA' || district === 'OUTSKIRTS' || district === 'MOUNTAIN_SHRINE') {
          const h = heightmap ? sampleTerrainHeight(heightmap, x, z) : getTerrainHeight(district, x, z, terrainSeed);
          data.position = [x, h, z];
        }
        bldMetadata.push(data);
      }
    }
    return bldMetadata;
  }, [mapX, mapY, heightmap]);

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
          grimeTexture={grimeTexture}
        />
      ))}
    </group>
  );
};

export const Ground: React.FC<{ onClick?: (point: THREE.Vector3) => void; district: DistrictType; seed: number; terrainSeed: number; timeOfDay?: number; fogColor?: THREE.Color; onHeightmapBuilt?: (heightmap: TerrainHeightmap | null) => void }> = ({ onClick, district, seed, terrainSeed, timeOfDay, fogColor, onHeightmapBuilt }) => {
  const roughnessTexture = useMemo(() => createNoiseTexture(128, 0.05), []);
  const blotchTexture = useMemo(() => createBlotchTexture(512), []);
  const { camera, scene } = useThree();

  // Calculate heat intensity for shimmer effect (peak at midday)
  const time = timeOfDay ?? 12;
  const sunAngle = (time / 24) * Math.PI * 2;
  const sunElevation = Math.sin(sunAngle - Math.PI / 2);
  const dayFactor = Math.max(0, Math.min(1, (sunElevation + 0.1) / 0.45)); // 0-1, peaks at noon
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
    if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS' && district !== 'MOUNTAIN_SHRINE') return null;
    const gridSize = district === 'SALHIYYA' ? 80 : 250;
    const segments = district === 'SALHIYYA' ? 60 : 120;
    return buildTerrain(gridSize, segments);
  }, [district, terrainSeed]);
  const innerTerrainGeometry = useMemo(() => {
    if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS' && district !== 'MOUNTAIN_SHRINE') return null;
    const gridSize = district === 'SALHIYYA' ? 30 : 60;
    const segments = district === 'SALHIYYA' ? 30 : 40;
    return buildTerrain(gridSize, segments);
  }, [district, terrainSeed]);

  // BUGFIX: Build heightmap from main terrain geometry for accurate character positioning
  const heightmap = useMemo(() => {
    if (!terrainGeometry) return null;
    const gridSize = district === 'SALHIYYA' ? 80 : 250;
    const segments = district === 'SALHIYYA' ? 60 : 120;
    return buildHeightmapFromGeometry(terrainGeometry, gridSize, segments);
  }, [terrainGeometry, district]);

  // Pass heightmap back to parent via callback
  useEffect(() => {
    if (onHeightmapBuilt) {
      onHeightmapBuilt(heightmap);
    }
  }, [heightmap, onHeightmapBuilt]);
  const baseGeometry = useMemo(() => new THREE.PlaneGeometry(250, 250, 1, 1), []);
  const innerBaseGeometry = useMemo(() => new THREE.PlaneGeometry(60, 60, 1, 1), []);

    const groundPalette = useMemo(() => ({
      MARKET: ['#e3c595', '#dbbe8e', '#d4b687', '#cdae80', '#c6a679'],
      WEALTHY: ['#d7d1c4', '#cfc7b6'],
      HOVELS: ['#b68a5f', '#a47b54', '#9a734d'],
      ALLEYS: ['#b68a5f', '#a47b54', '#9a734d'],
      SALHIYYA: ['#6a8a4a', '#5f7d45', '#548040'], // Grass greens
      OUTSKIRTS: ['#b7a987', '#aa9a77', '#9f8f6c'],
      MOUNTAIN_SHRINE: ['#6b7d5a', '#7a8a68', '#889775', '#5f6e4f'], // Forest greens
      CARAVANSERAI: ['#c8a86f', '#c19d64', '#b7935d'],
      SOUTHERN_ROAD: ['#c2a47c', '#b6956d', '#aa8b63'],
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
    : district === 'MOUNTAIN_SHRINE' ? pick(groundPalette.MOUNTAIN_SHRINE)
    : district === 'CARAVANSERAI' ? pick(groundPalette.CARAVANSERAI)
    : district === 'SOUTHERN_ROAD' ? pick(groundPalette.SOUTHERN_ROAD)
    : district === 'CIVIC' ? pick(groundPalette.CIVIC)
    : pick(groundPalette.DEFAULT);
  const overlayColor = district === 'WEALTHY' ? '#c3b9a9'
    : district === 'HOVELS' || district === 'ALLEYS' ? '#9a734d'
    : district === 'SALHIYYA' ? '#4a6a3a' // Grass overlay
    : district === 'OUTSKIRTS' ? '#8f7f5f'
    : district === 'MOUNTAIN_SHRINE' ? '#5a6b48'
    : district === 'CARAVANSERAI' ? '#b08a52'
    : district === 'SOUTHERN_ROAD' ? '#a77f55'
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
      roughnessMap: district === 'CARAVANSERAI' ? null : roughnessTexture || null,
      bumpMap: district === 'CARAVANSERAI' ? null : roughnessTexture || null,
      bumpScale: 0.0035
    });

    // Inject custom shader code for distance-based horizon fade + heat shimmer
    material.onBeforeCompile = (shader) => {
      // Add uniforms for camera position, sky color, time, and heat intensity
      shader.uniforms.cameraPos = { value: new THREE.Vector3() };
      shader.uniforms.skyColor = { value: new THREE.Color(0xd5e5f0) }; // Lighter, desaturated sky
      shader.uniforms.time = { value: 0.0 };
      shader.uniforms.heatIntensity = { value: 0.0 }; // 0-1, based on dayFactor

      // Inject into vertex shader for heat shimmer displacement
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPosition;
        uniform float time;
        uniform float heatIntensity;
        uniform vec3 cameraPos;

        // Simple noise function for heat shimmer
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

        // HEAT SHIMMER: Subtle vertex displacement for distant ground during hot day
        float distFromCamera = length(vWorldPosition.xz - cameraPos.xz);
        float shimmerStart = 25.0; // Start shimmer at medium distance
        float shimmerFactor = smoothstep(shimmerStart, shimmerStart + 60.0, distFromCamera);

        if (heatIntensity > 0.3 && shimmerFactor > 0.0) {
          // Multi-octave shimmer for more natural heat wave effect
          vec2 shimmerCoord = vWorldPosition.xz * 0.15 + time * 0.3;
          float shimmer1 = noise(shimmerCoord) * 2.0 - 1.0;
          float shimmer2 = noise(shimmerCoord * 2.3 + time * 0.5) * 2.0 - 1.0;
          float shimmer = (shimmer1 + shimmer2 * 0.5) / 1.5;

          // Apply subtle vertical displacement (max ~0.2 units at distance)
          float displacement = shimmer * shimmerFactor * heatIntensity * 0.25;
          transformed.y += displacement;
        }`
      );

      // Inject into fragment shader for distance-based fade
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPosition;
        uniform vec3 cameraPos;
        uniform vec3 skyColor;`
      );
      // Conditionally include dithering - skip for caravanserai to avoid artifacts
      const ditherCode = district === 'CARAVANSERAI'
        ? ''
        : '#include <dithering_fragment>';

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `${ditherCode}

        // Distance-based horizon fade (only affects distant ground, not nearby)
        float distFromCamera = length(vWorldPosition.xz - cameraPos.xz);
        float horizonFadeStart = 80.0;  // Start fading at 80 units
        float horizonFadeEnd = 140.0;   // Fully sky color at 140 units
        float horizonFade = smoothstep(horizonFadeStart, horizonFadeEnd, distFromCamera);

        // Blend to sky color at horizon - subtle and transparent
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyColor, horizonFade * 0.5);`
      );

      // Store reference to update uniforms
      material.userData.shader = shader;
    };

    return material;
  }, [roughnessTexture, baseColor, district]);

  // Update shader uniforms every frame for camera position, sky color, time, and heat
  useFrame((state) => {
    const shader = groundMaterial.userData.shader;
    if (shader) {
      shader.uniforms.cameraPos.value.copy(camera.position);
      shader.uniforms.time.value = state.clock.elapsedTime;

      // Heat shimmer intensity peaks during hot midday (10am-2pm)
      // Only active when dayFactor > 0.7 (strong sun)
      const heatIntensity = dayFactor > 0.7 ? (dayFactor - 0.7) / 0.3 : 0;
      shader.uniforms.heatIntensity.value = heatIntensity;

      // WEATHER-AWARE HORIZON: Use passed fogColor (weather-adjusted) or fallback to scene background
      if (fogColor) {
        shader.uniforms.skyColor.value.copy(fogColor);
      } else if (scene.background instanceof THREE.Color) {
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <primitive object={terrainGeometry ?? baseGeometry} attach="geometry" />
        <primitive object={groundOverlayMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
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
  const rippleRef3 = useRef<THREE.Mesh>(null);
  const spoutRef = useRef<THREE.Points>(null);
  const splashRef = useRef<THREE.Points>(null);
  const spoutGeometry = useRef<THREE.BufferGeometry | null>(null);
  const splashGeometry = useRef<THREE.BufferGeometry | null>(null);
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Animated water texture
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base water gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#3a8fba');
    gradient.addColorStop(0.4, '#2a7090');
    gradient.addColorStop(0.7, '#1b5a7a');
    gradient.addColorStop(1, '#1a4f6a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add concentric ripple patterns
    for (let r = 0; r < 6; r++) {
      const radius = 30 + r * 35;
      ctx.beginPath();
      ctx.arc(128, 128, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 200, 230, ${0.3 - r * 0.04})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Add sparkle highlights
    for (let i = 0; i < 20; i++) {
      const x = 40 + Math.random() * 176;
      const y = 40 + Math.random() * 176;
      const highlight = ctx.createRadialGradient(x, y, 0, x, y, 8);
      highlight.addColorStop(0, 'rgba(200, 230, 255, 0.4)');
      highlight.addColorStop(1, 'rgba(100, 180, 220, 0)');
      ctx.fillStyle = highlight;
      ctx.fillRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;

    // Animate water texture rotation and offset
    if (waterTexture) {
      waterTexture.rotation = t * 0.05;
      waterTexture.offset.set(Math.sin(t * 0.3) * 0.05, Math.cos(t * 0.25) * 0.05);
    }

    waterRef.current.rotation.z = t * 0.08;
    waterRef.current.position.y = 1.05 + Math.sin(t * 2.5) * 0.015;

    // Animate ripples with staggered timing
    if (rippleRef.current) {
      const scale = 1 + (Math.sin(t * 2.0) + 1) * 0.03;
      rippleRef.current.scale.set(scale, scale, 1);
      (rippleRef.current.material as THREE.MeshStandardMaterial).opacity = 0.4 + Math.sin(t * 2.0 + 0.5) * 0.15;
    }
    if (rippleRef2.current) {
      const scale = 1 + (Math.sin(t * 1.5 + 1.0) + 1) * 0.035;
      rippleRef2.current.scale.set(scale, scale, 1);
      (rippleRef2.current.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 1.5 + 1.2) * 0.12;
    }
    if (rippleRef3.current) {
      const scale = 1 + (Math.sin(t * 1.2 + 2.0) + 1) * 0.04;
      rippleRef3.current.scale.set(scale, scale, 1);
      (rippleRef3.current.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(t * 1.2 + 2.5) * 0.1;
    }

    // Animate fountain spout with realistic parabolic arcs
    if (spoutRef.current && spoutGeometry.current) {
      const positions = spoutGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        // Each droplet has its own phase in the arc
        const phase = (t * 1.5 + i * 0.12) % 1.2;
        const arcProgress = phase / 1.2;
        // Parabolic trajectory: starts at pillar top (2.5), rises slightly, then falls to water (1.0)
        // Peak at about 2.8, then fall to 1.0
        const peakHeight = 2.9;
        const startHeight = 2.5;
        const endHeight = 1.0;
        const height = arcProgress < 0.3
          ? startHeight + (peakHeight - startHeight) * (arcProgress / 0.3)  // Rising
          : peakHeight - (peakHeight - endHeight) * ((arcProgress - 0.3) / 0.7);  // Falling
        positions.array[ix + 1] = height;
        // Spread outward as droplets fall
        const spread = 0.05 + arcProgress * 0.6;
        const angle = (i / positions.count) * Math.PI * 2 + t * 0.15;
        positions.array[ix] = Math.cos(angle) * spread;
        positions.array[ix + 2] = Math.sin(angle) * spread;
      }
      positions.needsUpdate = true;
    }

    // Animate splash particles at water surface
    if (splashRef.current && splashGeometry.current) {
      const positions = splashGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const phase = (t * 2.0 + i * 0.3) % 1.0;
        // Splashes radiate outward and fade
        const radius = 0.3 + phase * 0.8;
        const angle = (i / positions.count) * Math.PI * 2 + i * 0.5;
        positions.array[ix] = Math.cos(angle) * radius;
        positions.array[ix + 1] = 1.02 + Math.sin(phase * Math.PI) * 0.15;
        positions.array[ix + 2] = Math.sin(angle) * radius;
      }
      positions.needsUpdate = true;
    }
  });

  // Main fountain spout particles
  const spoutPoints = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.05 + Math.random() * 0.03;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 2.5 + Math.random() * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    spoutGeometry.current = geometry;
    return geometry;
  }, []);

  // Splash particles where water hits the surface
  const splashPoints = useMemo(() => {
    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 1.02;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    splashGeometry.current = geometry;
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
        <cylinderGeometry args={[3.2, 3.2, 0.25, 20, 1, true]} />
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
      {/* Animated water surface with texture */}
      <mesh ref={waterRef} position={[0, 1.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial
          map={waterTexture || undefined}
          color="#2a7090"
          roughness={0.15}
          metalness={0.7}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Main fountain spout */}
      <points ref={spoutRef} geometry={spoutPoints} position={[0, 0, 0]}>
        <pointsMaterial color="#a8ddf5" size={0.08} sizeAttenuation transparent opacity={0.9} />
      </points>
      {/* Splash particles at water surface */}
      <points ref={splashRef} geometry={splashPoints} position={[0, 0, 0]}>
        <pointsMaterial color="#c8eeff" size={0.04} sizeAttenuation transparent opacity={0.7} />
      </points>
      {/* Animated ripple rings */}
      <mesh ref={rippleRef} position={[0, 1.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 1.0, 32]} />
        <meshStandardMaterial color="#7ac5e5" transparent opacity={0.4} roughness={0.05} metalness={0.5} />
      </mesh>
      <mesh ref={rippleRef2} position={[0, 1.015, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.9, 1.6, 32]} />
        <meshStandardMaterial color="#5aabcc" transparent opacity={0.3} roughness={0.05} metalness={0.5} />
      </mesh>
      <mesh ref={rippleRef3} position={[0, 1.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.4, 2.2, 32]} />
        <meshStandardMaterial color="#4a95b5" transparent opacity={0.2} roughness={0.05} metalness={0.5} />
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
      <PlazaCat waypoints={[[-12, 0, 9], [12, 0, -9], [6, 0, 6], [-5, 0.25, 3]]} />
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

const MountainShrineDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
}> = ({ mapX, mapY, timeOfDay, terrainSeed, onTreePositionsGenerated }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'MOUNTAIN_SHRINE') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Cedar trees - positioned on the hillsides
  const trees = [
    [-25, 0, -15], [-18, 0, -22], [-12, 0, -18], [-8, 0, -25],
    [20, 0, -18], [15, 0, -12], [22, 0, -8], [18, 0, -20],
    [-22, 0, 12], [-15, 0, 18], [-10, 0, 15], [-20, 0, 20],
    [12, 0, 15], [18, 0, 20], [10, 0, 22], [15, 0, 12],
    [-28, 0, 0], [28, 0, -2], [-15, 0, -8], [16, 0, 8],
    [-10, 0, -12], [12, 0, -15], [-8, 0, 18], [8, 0, -22],
  ] as Array<[number, number, number]>;

  // Report tree positions to parent for collision detection
  React.useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(trees);
    }
  }, [onTreePositionsGenerated]);

  // Rocks scattered on hillsides
  const rocks = [
    [-30, 0, -20], [-22, 0, -8], [-15, 0, -25], [-8, 0, -15],
    [25, 0, -15], [18, 0, -5], [12, 0, -20], [20, 0, -25],
    [-25, 0, 15], [-18, 0, 22], [-12, 0, 8], [-20, 0, 25],
    [15, 0, 18], [22, 0, 25], [8, 0, 12], [18, 0, 8],
    [-12, 0, 5], [10, 0, -8], [-18, 0, -12], [15, 0, -18],
  ] as Array<[number, number, number]>;

  // Bushes for undergrowth
  const bushes = [
    [-20, 0, -12], [-14, 0, -18], [-10, 0, -20], [-16, 0, -8],
    [18, 0, -14], [12, 0, -18], [15, 0, -10], [20, 0, -16],
    [-18, 0, 14], [-12, 0, 20], [-15, 0, 16], [-22, 0, 18],
    [14, 0, 16], [20, 0, 20], [12, 0, 12], [16, 0, 18],
  ] as Array<[number, number, number]>;

  // Path waypoints from base to shrine at top
  const pathPoints = [
    [0, 0, -40], // Start at bottom
    [-8, 0, -30],
    [-12, 0, -20],
    [-8, 0, -10],
    [0, 0, -5],
    [6, 0, 2],
    [4, 0, 8],
    [0, 0, 12], // Near shrine
  ] as Array<[number, number, number]>;

  // Torches along path (every other waypoint)
  const torches = pathPoints.filter((_, i) => i % 2 === 1);

  return (
    <group>
      {/* Cedar Trees */}
      {trees.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const treeHeight = 6 + Math.sin(i * 1.3) * 1.5;
        const trunkHeight = treeHeight * 0.5;
        const foliageHeight = treeHeight * 0.55;

        return (
          <group key={`tree-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.25, 0.35, trunkHeight, 6]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
            </mesh>
            {/* Foliage - conical cedar shape */}
            <mesh position={[0, trunkHeight + foliageHeight / 2, 0]} castShadow receiveShadow>
              <coneGeometry args={[1.8, foliageHeight, 8]} />
              <meshStandardMaterial color="#3a5a3a" roughness={0.85} />
            </mesh>
            <mesh position={[0, trunkHeight + foliageHeight * 0.25, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2, foliageHeight * 0.7, 8]} />
              <meshStandardMaterial color="#2f4f2f" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* Rocks - NOW DYNAMIC PHYSICS OBJECTS, rendered via PushableDecorations
      {rocks.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const rockSize = 0.8 + Math.sin(i * 2.1) * 0.4;
        const rotation = [
          Math.PI * 0.1 * Math.sin(i),
          Math.PI * 2 * Math.sin(i * 0.7),
          Math.PI * 0.15 * Math.cos(i)
        ] as [number, number, number];

        return (
          <mesh key={`rock-${i}`} position={[pos[0], h + rockSize * 0.4, pos[2]]} rotation={rotation} castShadow receiveShadow>
            <dodecahedronGeometry args={[rockSize, 0]} />
            <meshStandardMaterial color="#6a6a5a" roughness={0.95} />
          </mesh>
        );
      })}
      */}

      {/* Bushes */}
      {bushes.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const bushSize = 0.6 + Math.cos(i * 1.8) * 0.2;

        return (
          <group key={`bush-${i}`} position={[pos[0], h, pos[2]]}>
            <mesh position={[0, bushSize * 0.5, 0]} castShadow receiveShadow>
              <sphereGeometry args={[bushSize, 6, 5]} />
              <meshStandardMaterial color="#4a6a4a" roughness={0.9} />
            </mesh>
            <mesh position={[bushSize * 0.3, bushSize * 0.3, bushSize * 0.2]} castShadow receiveShadow>
              <sphereGeometry args={[bushSize * 0.7, 6, 5]} />
              <meshStandardMaterial color="#456645" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Path segments */}
      {pathPoints.map((point, i) => {
        if (i === pathPoints.length - 1) return null;
        const nextPoint = pathPoints[i + 1];
        const midX = (point[0] + nextPoint[0]) / 2;
        const midZ = (point[2] + nextPoint[2]) / 2;
        const h = getTerrainHeight(district, midX, midZ, terrainSeed);
        const dx = nextPoint[0] - point[0];
        const dz = nextPoint[2] - point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        return (
          <mesh
            key={`path-${i}`}
            position={[midX, h + 0.05, midZ]}
            rotation={[-Math.PI / 2, 0, angle]}
            receiveShadow
          >
            <planeGeometry args={[1.5, length]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Torches along path */}
      {torches.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);

        return (
          <group key={`torch-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Torch post */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
            </mesh>
            {/* Torch top */}
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {/* Flame */}
            {nightFactor > 0.05 && (
              <>
                <mesh position={[0, 3.4, 0]}>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial
                    color="#ff8a3c"
                    emissive="#ff6a1c"
                    emissiveIntensity={0.8 + Math.sin(Date.now() * 0.005 + i) * 0.2}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight
                  position={[0, 3.5, 0]}
                  intensity={2.5 * nightFactor}
                  distance={15}
                  decay={2}
                  color="#ff9a4c"
                  castShadow
                />
              </>
            )}
          </group>
        );
      })}

      {/* Islamic Shrine at the peak */}
      <group position={[0, getTerrainHeight(district, 0, 15, terrainSeed), 15]}>
        {/* Main shrine building - small domed structure */}
        <group>
          {/* Base platform */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[4.5, 5, 0.4, 8]} />
            <meshStandardMaterial color="#b8a890" roughness={0.85} />
          </mesh>

          {/* Octagonal walls */}
          <mesh position={[0, 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.2, 3.5, 3.6, 8]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.88} />
          </mesh>

          {/* Decorative band */}
          <mesh position={[0, 3.6, 0]} castShadow>
            <cylinderGeometry args={[3.3, 3.3, 0.3, 8]} />
            <meshStandardMaterial color="#8a7a5a" roughness={0.8} />
          </mesh>

          {/* Dome */}
          <mesh position={[0, 4.8, 0]} castShadow>
            <sphereGeometry args={[2.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#7a9a8a" roughness={0.6} metalness={0.3} />
          </mesh>

          {/* Crescent finial */}
          <mesh position={[0, 7.4, 0]} castShadow rotation={[0, 0, Math.PI * 0.15]}>
            <torusGeometry args={[0.3, 0.08, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.7} />
          </mesh>

          {/* Arched doorway */}
          <mesh position={[0, 1.5, 3.55]} castShadow>
            <boxGeometry args={[1.2, 2.4, 0.2]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.7, 3.55]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.2, 8, 1, false, 0, Math.PI]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>

          {/* Windows (4 sides) */}
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => (
            <group key={`window-${i}`} rotation={[0, angle, 0]}>
              <mesh position={[0, 2.5, 3.4]} castShadow>
                <boxGeometry args={[0.6, 0.8, 0.1]} />
                <meshStandardMaterial color="#2a4a5a" roughness={0.3} metalness={0.2} opacity={0.6} transparent />
              </mesh>
            </group>
          ))}

          {/* Interior lighting at night */}
          {nightFactor > 0.05 && (
            <>
              <pointLight
                position={[0, 2, 0]}
                intensity={3 * nightFactor}
                distance={12}
                decay={2}
                color="#ffd8a8"
              />
              <mesh position={[0, 1.5, 3.6]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial
                  color="#ffb86c"
                  emissive="#ff9a4c"
                  emissiveIntensity={0.6 * nightFactor}
                />
              </mesh>
            </>
          )}
        </group>

        {/* Prayer mat outside */}
        <mesh position={[0, 0.42, 5.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial color="#8a4a4a" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

const SalhiyyaDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
  buildingPositions?: Array<[number, number, number]>;
  heightmap?: TerrainHeightmap | null;
}> = ({ mapX, mapY, timeOfDay, terrainSeed, onTreePositionsGenerated, buildingPositions = [], heightmap }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'SALHIYYA') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Generate path segments between nearby buildings
  const pathSegments = React.useMemo(() => {
    if (buildingPositions.length === 0) return [];

    interface PathSegment {
      start: [number, number, number];
      end: [number, number, number];
      midpoint: [number, number, number];
      length: number;
      angle: number;
    }

    const segments: PathSegment[] = [];
    const usedPairs = new Set<string>();

    // For each building, connect to 2-3 nearest neighbors
    buildingPositions.forEach((building, i) => {
      // Calculate distances to all other buildings
      const distances = buildingPositions
        .map((other, j) => ({
          index: j,
          distance: Math.sqrt(
            Math.pow(building[0] - other[0], 2) +
            Math.pow(building[2] - other[2], 2)
          )
        }))
        .filter(d => d.index !== i) // Exclude self
        .sort((a, b) => a.distance - b.distance);

      // Connect to 2-3 nearest neighbors
      const connectionCount = Math.min(3, distances.length);
      for (let c = 0; c < connectionCount; c++) {
        const neighborIndex = distances[c].index;
        const neighbor = buildingPositions[neighborIndex];

        // Create unique pair ID (always smaller index first)
        const pairId = i < neighborIndex ? `${i}-${neighborIndex}` : `${neighborIndex}-${i}`;

        // Skip if we've already created this path
        if (usedPairs.has(pairId)) continue;
        usedPairs.add(pairId);

        // Create path segment
        const dx = neighbor[0] - building[0];
        const dz = neighbor[2] - building[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        segments.push({
          start: building,
          end: neighbor,
          midpoint: [
            (building[0] + neighbor[0]) / 2,
            0,
            (building[2] + neighbor[2]) / 2
          ],
          length,
          angle
        });
      }
    });

    return segments;
  }, [buildingPositions]);

  // Olive and pine trees scattered on hillsides
  const trees = [
    [-30, 0, -22], [-25, 0, -15], [-20, 0, -28], [-15, 0, -20], [-28, 0, -8],
    [28, 0, -18], [22, 0, -25], [18, 0, -12], [25, 0, -8], [32, 0, -15],
    [-28, 0, 20], [-22, 0, 28], [-18, 0, 15], [-25, 0, 10], [-32, 0, 25],
    [25, 0, 22], [20, 0, 30], [15, 0, 18], [28, 0, 12], [32, 0, 28],
    [-15, 0, -32], [-10, 0, -25], [12, 0, -30], [8, 0, -20],
    [-12, 0, 30], [-8, 0, 25], [10, 0, 32], [15, 0, 25],
    [0, 0, -35], [0, 0, 35], [-35, 0, 0], [35, 0, 0],
  ] as Array<[number, number, number]>;

  // Report tree positions to parent for collision detection
  React.useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(trees);
    }
  }, [onTreePositionsGenerated]);

  // Grass patches
  const grassPatches = [
    [-20, 0, -15], [-12, 0, -22], [-8, 0, -12], [-25, 0, -5],
    [18, 0, -14], [12, 0, -20], [22, 0, -10], [28, 0, -6],
    [-22, 0, 18], [-15, 0, 25], [-10, 0, 15], [-28, 0, 12],
    [20, 0, 20], [15, 0, 28], [10, 0, 16], [25, 0, 10],
    [-5, 0, -28], [-2, 0, -18], [5, 0, -25], [8, 0, -15],
    [-6, 0, 25], [-3, 0, 18], [4, 0, 28], [6, 0, 20],
  ] as Array<[number, number, number]>;

  // Bushes for undergrowth
  const bushes = [
    [-18, 0, -12], [-14, 0, -18], [-10, 0, -20], [-22, 0, -8],
    [16, 0, -14], [12, 0, -16], [18, 0, -10], [22, 0, -12],
    [-18, 0, 14], [-12, 0, 20], [-15, 0, 16], [-22, 0, 18],
    [14, 0, 16], [18, 0, 20], [12, 0, 12], [20, 0, 18],
    [-8, 0, -24], [-5, 0, -20], [6, 0, -22], [8, 0, -18],
    [-6, 0, 22], [-4, 0, 20], [5, 0, 24], [7, 0, 20],
  ] as Array<[number, number, number]>;

  return (
    <group>
      {/* Trees - mix of olive and pine */}
      {trees.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const isOlive = i % 3 === 0; // Every 3rd tree is olive
        const treeHeight = isOlive ? (3 + Math.sin(i * 1.1) * 0.8) : (5 + Math.sin(i * 1.3) * 1.2);
        const trunkHeight = treeHeight * 0.4;
        const foliageHeight = treeHeight * (isOlive ? 0.5 : 0.6);

        return (
          <group key={`tree-${i}`} position={[pos[0], h, pos[2]]}>
            {/* Trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.15, 0.22, trunkHeight, 6]} />
              <meshStandardMaterial color={isOlive ? "#5a4a3a" : "#4a3a2a"} roughness={0.95} />
            </mesh>
            {/* Foliage */}
            {isOlive ? (
              // Olive tree - round canopy
              <>
                <mesh position={[0, trunkHeight + foliageHeight * 0.5, 0]} castShadow receiveShadow>
                  <sphereGeometry args={[foliageHeight * 0.7, 8, 8]} />
                  <meshStandardMaterial color="#5a6a4a" roughness={0.85} />
                </mesh>
                <mesh position={[0.3, trunkHeight + foliageHeight * 0.3, 0.2]} castShadow receiveShadow>
                  <sphereGeometry args={[foliageHeight * 0.5, 8, 8]} />
                  <meshStandardMaterial color="#4a5a3a" roughness={0.85} />
                </mesh>
              </>
            ) : (
              // Pine tree - conical
              <>
                <mesh position={[0, trunkHeight + foliageHeight / 2, 0]} castShadow receiveShadow>
                  <coneGeometry args={[1.4, foliageHeight, 8]} />
                  <meshStandardMaterial color="#3a5a3a" roughness={0.85} />
                </mesh>
                <mesh position={[0, trunkHeight + foliageHeight * 0.25, 0]} castShadow receiveShadow>
                  <coneGeometry args={[1.8, foliageHeight * 0.6, 8]} />
                  <meshStandardMaterial color="#2f4f2f" roughness={0.85} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Grass patches */}
      {grassPatches.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const grassSize = 1.2 + Math.cos(i * 1.6) * 0.4;

        return (
          <group key={`grass-${i}`} position={[pos[0], h + 0.1, pos[2]]}>
            {/* Multiple grass blades per patch */}
            {[0, 1, 2, 3, 4].map((blade) => {
              const angle = (blade / 5) * Math.PI * 2;
              const bladeSeed = terrainSeed + i * 100 + blade * 17;
              const rand1 = seededRandom(bladeSeed);
              const rand2 = seededRandom(bladeSeed + 1);
              const rand3 = seededRandom(bladeSeed + 2);
              const radius = grassSize * (0.3 + rand1 * 0.4);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const height = 0.3 + rand2 * 0.2;

              return (
                <mesh
                  key={`blade-${blade}`}
                  position={[x, height / 2, z]}
                  rotation={[rand3 * 0.3, angle, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[0.1, height]} />
                  <meshStandardMaterial
                    color={blade % 2 === 0 ? "#4a6a3a" : "#5a7a4a"}
                    roughness={0.9}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Bushes */}
      {bushes.map((pos, i) => {
        const h = getTerrainHeight(district, pos[0], pos[2], terrainSeed);
        const bushSize = 0.5 + Math.cos(i * 1.8) * 0.15;

        return (
          <mesh
            key={`bush-${i}`}
            position={[pos[0], h + bushSize * 0.4, pos[2]]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[bushSize, 8, 8]} />
            <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Dirt paths between buildings */}
      {pathSegments.map((segment, i) => {
        const midHeight = heightmap
          ? sampleTerrainHeight(heightmap, segment.midpoint[0], segment.midpoint[2])
          : getTerrainHeight(district, segment.midpoint[0], segment.midpoint[2], terrainSeed);
        const pathWidth = 1.2; // Width of the path in world units

        return (
          <mesh
            key={`path-${i}`}
            position={[segment.midpoint[0], midHeight + 0.02, segment.midpoint[2]]}
            rotation={[-Math.PI / 2, 0, segment.angle]}
            receiveShadow
          >
            <planeGeometry args={[segment.length, pathWidth]} />
            <meshStandardMaterial
              color="#8b7355" // Dirt brown color
              roughness={0.95}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
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

const SouthernRoadDecor: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'SOUTHERN_ROAD') return null;
  const roadWidth = 8;
  const ditchOffset = 7.5;
  const ditchWidth = 1.6;
  const length = 110;
  const treeSpots: Array<[number, number, number]> = [
    [-18, 0, -32],
    [18, 0, -26],
    [-16, 0, -8],
    [16, 0, 6],
    [-18, 0, 24],
    [18, 0, 34]
  ];
  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[roadWidth, 0.06, length]} />
        <meshStandardMaterial color="#b08a5a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[roadWidth * 0.55, 0.04, length]} />
        <meshStandardMaterial color="#a0794d" roughness={0.95} />
      </mesh>
      <mesh position={[-ditchOffset, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ditchWidth, 0.3, length]} />
        <meshStandardMaterial color="#8a6a43" roughness={0.98} />
      </mesh>
      <mesh position={[ditchOffset, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ditchWidth, 0.3, length]} />
        <meshStandardMaterial color="#8a6a43" roughness={0.98} />
      </mesh>
      {treeSpots.map((pos, i) => (
        <group key={`road-tree-${i}`} position={pos}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 3.6, 6]} />
            <meshStandardMaterial color="#7f5c3b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <sphereGeometry args={[1.2, 8, 6]} />
            <meshStandardMaterial color="#3f6a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.8, 3.6, 0]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[2.2, 0.14, 0.5]} />
            <meshStandardMaterial color="#3b6538" roughness={0.85} />
          </mesh>
          <mesh position={[-0.8, 3.6, 0]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[2.2, 0.14, 0.5]} />
            <meshStandardMaterial color="#3b6538" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CaravanseraiComplex: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CARAVANSERAI') return null;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Procedural variation based on map position
  const seed = mapX * 100 + mapY;
  const variation = seededRandom(seed);

  // Sandstone colors with slight variation
  const sandstonePalette = ['#d4c4a8', '#c8b896', '#dac8b0', '#c4b490'];
  const sandstoneColor = sandstonePalette[Math.floor(variation * sandstonePalette.length)];

  // Sandstone block texture for arcade walls
  const sandstoneBlockTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base sandstone color
    ctx.fillStyle = sandstoneColor;
    ctx.fillRect(0, 0, 256, 256);

    // Draw stone blocks in a pattern
    const blockWidth = 64;
    const blockHeight = 32;
    ctx.strokeStyle = '#9a8868';
    ctx.lineWidth = 2;

    for (let y = 0; y < 256; y += blockHeight) {
      const offset = (y / blockHeight) % 2 === 0 ? 0 : blockWidth / 2;
      for (let x = -blockWidth / 2 + offset; x < 256; x += blockWidth) {
        ctx.strokeRect(x, y, blockWidth, blockHeight);
        // Add subtle shading variation
        const shade = seededRandom(seed + x + y * 256);
        ctx.fillStyle = shade > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 2, y + 2, blockWidth - 4, blockHeight - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, [seed, sandstoneColor]);

  // Water texture and animation
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create water-like pattern
    const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradient.addColorStop(0, '#4a9fc9');
    gradient.addColorStop(0.5, '#3588aa');
    gradient.addColorStop(1, '#2a7090');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Add some subtle wave patterns (using seeded random for consistency)
    for (let i = 0; i < 12; i++) {
      const x = seededRandom(seed + i * 10) * 128;
      const y = seededRandom(seed + i * 10 + 5) * 128;
      const size = 15 + seededRandom(seed + i * 10 + 3) * 20;
      const ripple = ctx.createRadialGradient(x, y, 0, x, y, size);
      ripple.addColorStop(0, 'rgba(120, 180, 230, 0.25)');
      ripple.addColorStop(1, 'rgba(60, 140, 200, 0)');
      ctx.fillStyle = ripple;
      ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [seed]);

  const waterRef = useRef<THREE.Mesh>(null);
  const jetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const splashRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    if (waterRef.current && waterTexture) {
      // Animate texture offset for water flow effect
      waterTexture.offset.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
      waterTexture.offset.y = Math.cos(state.clock.elapsedTime * 0.15) * 0.02;
    }
    const t = state.clock.elapsedTime;
    jetRefs.current.forEach((jet, i) => {
      if (!jet) return;
      const phase = t * 1.8 + i * 1.2;
      const height = 0.8 + Math.sin(phase) * 0.2;
      jet.scale.set(1, height, 1);
      jet.position.y = 0.25 + height * 0.3;
    });
    splashRefs.current.forEach((splash, i) => {
      if (!splash) return;
      const phase = t * 2 + i * 1.1;
      const pulse = 0.7 + Math.sin(phase) * 0.2;
      splash.scale.set(pulse, pulse, pulse);
      if (splash.material && 'opacity' in splash.material) {
        (splash.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(phase) * 0.1;
      }
    });
  });

  // Caravanserai dimensions
  const outerSize = 70;  // Large square courtyard
  const wallThickness = 2.5;
  const wallHeight = 10;
  const entranceWidth = 8;
  const arcadeDepth = 6;

  const darkSandstone = '#a89878';
  const lightSandstone = '#e4d4b8';

  // Number of arcade bays per side (procedurally varied)
  const baysPerSide = 6 + Math.floor(variation * 2); // 6-7 bays

  // Create arcade bays with arches
  const createArcadeBays = (sideLength: number, depth: number, height: number, rotation: number, offset: [number, number, number]) => {
    const bays = [];
    const bayWidth = sideLength / baysPerSide;

    for (let i = 0; i < baysPerSide; i++) {
      const x = -sideLength / 2 + bayWidth * i + bayWidth / 2;
      const pillarWidth = bayWidth * 0.2;
      const archWidth = bayWidth * 0.8;

      // Pillars
      if (i < baysPerSide) {
        bays.push(
          <mesh
            key={`pillar-${i}`}
            position={[x - bayWidth / 2 + pillarWidth / 2, height / 2, depth / 2 + 0.06]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pillarWidth, height, Math.max(0.6, depth - 0.12)]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>
        );
      }

      // Arched opening
      bays.push(
        <group key={`arch-${i}`} position={[x, 0, depth / 2]}>
          {/* Arch base */}
          <mesh position={[0, height * 0.3, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[archWidth, height * 0.6, Math.max(0.6, depth - 0.1)]} />
            <meshStandardMaterial
              map={sandstoneBlockTexture}
              color={sandstoneColor}
              roughness={0.9}
            />
          </mesh>
          {/* Arch top (half-cylinder) */}
          <mesh position={[0, height * 0.6, -0.05]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[archWidth / 2, archWidth / 2, Math.max(0.6, depth - 0.12), 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={lightSandstone} roughness={0.88} />
          </mesh>
          {/* Merchant stall goods (alternating types) */}
          {i % 3 === 0 && (
            <mesh position={[0, 1, depth * 0.35]} castShadow>
              <boxGeometry args={[archWidth * 0.6, 1.5, depth * 0.25]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#8a6a4a' : '#6a5a4a'} roughness={0.9} />
            </mesh>
          )}
          {i % 3 === 1 && (
            <group position={[0, 0.8, depth * 0.35]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.5, 1.6, 12]} />
                <meshStandardMaterial color="#9a7a5a" roughness={0.9} />
              </mesh>
              <mesh position={[0.7, 0, 0]} castShadow>
                <cylinderGeometry args={[0.35, 0.45, 1.4, 10]} />
                <meshStandardMaterial color="#aa8a6a" roughness={0.9} />
              </mesh>
            </group>
          )}
          {/* Sleeping mat for residential bays */}
          {i % 3 === 2 && (
            <mesh position={[0, 0.05, depth * 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[archWidth * 0.5, depth * 0.4]} />
              <meshStandardMaterial color="#7a5a4a" roughness={0.95} />
            </mesh>
          )}
        </group>
      );
    }

    return (
      <group position={offset} rotation={[0, rotation, 0]}>
        {bays}
        {/* Top wall section above arcades */}
        <mesh position={[0, height + wallHeight * 0.15, depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[sideLength, wallHeight * 0.3, depth]} />
          <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
        </mesh>
      </group>
    );
  };

  // Four directional entrances with half-dome arches
  const createEntrance = (rotation: number, offset: [number, number, number], direction: string) => {
    return (
      <group position={offset} rotation={[0, rotation, 0]}>
        {/* Entrance arch structure */}
        <group>
          {/* Side pillars */}
          <mesh position={[-entranceWidth / 2 - 1, wallHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, wallHeight, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>
          <mesh position={[entranceWidth / 2 + 1, wallHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, wallHeight, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>

          {/* Arch opening */}
          <mesh position={[0, wallHeight * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[entranceWidth, wallHeight * 0.8, wallThickness * 2]} />
            <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
          </mesh>

          {/* Half-dome arch top */}
          <mesh position={[0, wallHeight * 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[entranceWidth / 2, entranceWidth / 2, wallThickness * 2, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={lightSandstone} roughness={0.85} />
          </mesh>

          {/* Decorative half-sphere dome above arch */}
          <mesh position={[0, wallHeight + 1.5, 0]} castShadow receiveShadow>
            <sphereGeometry args={[entranceWidth / 3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#9aaa9a" roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Entrance passage */}
          <mesh position={[0, 3, -wallThickness]} receiveShadow>
            <boxGeometry args={[entranceWidth - 0.5, 6, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.93} />
          </mesh>
        </group>

        {/* Wall torches on entrance */}
        {[-entranceWidth / 2 - 2, entranceWidth / 2 + 2].map((x, idx) => (
          <group key={`entrance-torch-${direction}-${idx}`} position={[x, wallHeight * 0.6, 1]}>
            <mesh castShadow>
              <boxGeometry args={[0.15, 1.2, 0.15]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.7, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {nightFactor > 0.05 && (
              <>
                <mesh position={[0, 0.9, 0]}>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial
                    color="#ff8a3c"
                    emissive="#ff6a1c"
                    emissiveIntensity={0.7 + Math.sin(Date.now() * 0.004 + idx) * 0.2}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight
                  position={[0, 1, 0]}
                  intensity={2.8 * nightFactor}
                  distance={18}
                  decay={2}
                  color="#ff9a4c"
                  castShadow
                />
              </>
            )}
          </group>
        ))}
      </group>
    );
  };

  // Corner towers
  const createCornerTower = (x: number, z: number) => {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.5, 3, wallHeight, 8]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.91} />
        </mesh>
        <mesh position={[0, wallHeight + 1, 0]} castShadow>
          <cylinderGeometry args={[2.8, 2.5, 2, 8]} />
          <meshStandardMaterial color={sandstoneColor} roughness={0.88} />
        </mesh>
        {/* Tower torch */}
        {nightFactor > 0.05 && (
          <pointLight
            position={[0, wallHeight + 1.5, 0]}
            intensity={3 * nightFactor}
            distance={25}
            decay={2}
            color="#ff9a4c"
            castShadow
          />
        )}
      </group>
    );
  };

  const courtyardSize = outerSize - arcadeDepth * 2;
  const wallSegmentLength = (outerSize - entranceWidth) / 2 - 3; // Account for entrance and towers

  return (
    <group>
      {/* Four outer wall segments (between entrances and corners) */}
      {/* North wall segments */}
      <mesh position={[-outerSize / 2 + wallSegmentLength / 2 + 3, wallHeight / 2, -outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2 - wallSegmentLength / 2 - 3, wallHeight / 2, -outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* South wall segments */}
      <mesh position={[-outerSize / 2 + wallSegmentLength / 2 + 3, wallHeight / 2, outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2 - wallSegmentLength / 2 - 3, wallHeight / 2, outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* East wall segments */}
      <mesh position={[outerSize / 2, wallHeight / 2, -outerSize / 2 + wallSegmentLength / 2 + 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2, wallHeight / 2, outerSize / 2 - wallSegmentLength / 2 - 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* West wall segments */}
      <mesh position={[-outerSize / 2, wallHeight / 2, -outerSize / 2 + wallSegmentLength / 2 + 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[-outerSize / 2, wallHeight / 2, outerSize / 2 - wallSegmentLength / 2 - 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* Four directional entrances */}
      {createEntrance(0, [0, 0, -outerSize / 2], 'north')}
      {createEntrance(Math.PI, [0, 0, outerSize / 2], 'south')}
      {createEntrance(Math.PI / 2, [outerSize / 2, 0, 0], 'east')}
      {createEntrance(-Math.PI / 2, [-outerSize / 2, 0, 0], 'west')}

      {/* Corner towers */}
      {createCornerTower(-outerSize / 2, -outerSize / 2)}
      {createCornerTower(outerSize / 2, -outerSize / 2)}
      {createCornerTower(-outerSize / 2, outerSize / 2)}
      {createCornerTower(outerSize / 2, outerSize / 2)}

      {/* Inner arcade bays (four sides) */}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, 0, [0, 0, -outerSize / 2 + arcadeDepth / 2 + 2])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, Math.PI, [0, 0, outerSize / 2 - arcadeDepth / 2 - 2])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, Math.PI / 2, [outerSize / 2 - arcadeDepth / 2 - 2, 0, 0])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, -Math.PI / 2, [-outerSize / 2 + arcadeDepth / 2 + 2, 0, 0])}

      {/* Central ornate square fountain */}
      <group position={[0, 0, 0]}>
        {/* Outer fountain basin (square) */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 1.2, 8]} />
          <meshStandardMaterial color={lightSandstone} roughness={0.82} />
        </mesh>

        {/* Ornate terracotta tile border around fountain */}
        {/* North and South borders */}
        {[-4.3, 4.3].map((z, zi) => (
          <group key={`tile-border-ns-${zi}`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <mesh key={`tile-ns-${zi}-${i}`} position={[-4 + i, 1.25, z]} castShadow>
                <boxGeometry args={[0.85, 0.15, 0.5]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#b86b4a' : '#c47a55'} roughness={0.75} />
              </mesh>
            ))}
          </group>
        ))}
        {/* East and West borders */}
        {[-4.3, 4.3].map((x, xi) => (
          <group key={`tile-border-ew-${xi}`}>
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={`tile-ew-${xi}-${i}`} position={[x, 1.25, -3 + i]} castShadow>
                <boxGeometry args={[0.5, 0.15, 0.85]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#c47a55' : '#b86b4a'} roughness={0.75} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Corner decorative tiles */}
        {[[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]].map((corner, ci) => (
          <mesh key={`corner-tile-${ci}`} position={[corner[0], 1.28, corner[1]]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.18, 8]} />
            <meshStandardMaterial color="#a55a3a" roughness={0.7} />
          </mesh>
        ))}

        {/* Inner basin */}
        <mesh position={[0, 1, 0]} receiveShadow>
          <boxGeometry args={[7, 0.4, 7]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.85} />
        </mesh>

        {/* Water surface - animated with texture */}
        <mesh ref={waterRef} position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.6, 6.6]} />
          <meshStandardMaterial
            map={waterTexture}
            color="#5599cc"
            roughness={0.15}
            metalness={0.3}
            transparent
            opacity={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>

        {/* Central fountain pillar */}
        <mesh position={[0, 2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.5, 2, 8]} />
          <meshStandardMaterial color={lightSandstone} roughness={0.8} />
        </mesh>

        {/* Fountain top ball */}
        <mesh position={[0, 3.2, 0]} castShadow>
          <sphereGeometry args={[0.6, 12, 8]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.85} />
        </mesh>

        {/* Four fountain jets - emerging from the ball */}
        {[
          [0.3, 0],
          [-0.3, 0],
          [0, 0.3],
          [0, -0.3]
        ].map((offset, i) => (
          <group key={`fountain-jet-${i}`} position={[offset[0], 3.15, offset[1]]}>
            <mesh
              ref={(node) => {
                jetRefs.current[i] = node;
              }}
              position={[0, 0.3, 0]}
            >
              <cylinderGeometry args={[0.05, 0.08, 0.7, 8]} />
              <meshStandardMaterial color="#6bb6e8" emissive="#4a9fc9" emissiveIntensity={0.6} transparent opacity={0.75} />
            </mesh>
            <mesh
              ref={(node) => {
                splashRefs.current[i] = node;
              }}
              position={[0, -1.9, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.18, 0.32, 12]} />
              <meshStandardMaterial color="#7fc3ef" transparent opacity={0.4} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Decorative corner posts */}
        {[
          [-3, 0, -3],
          [3, 0, -3],
          [-3, 0, 3],
          [3, 0, 3],
        ].map((pos, i) => (
          <mesh key={`fountain-post-${i}`} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 1.5, 6]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
      </group>

      {/* Camels resting in courtyard */}
      {[
        [-15, 0, -12],
        [12, 0, -15],
        [-12, 0, 15],
        [15, 0, 12],
      ].map((pos, i) => (
        <group key={`camel-${i}`} position={pos as [number, number, number]}>
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

      {/* Merchant crates and goods scattered in courtyard */}
      {[
        [-20, 0, 0],
        [20, 0, 0],
        [0, 0, -20],
        [0, 0, 20],
      ].map((pos, i) => (
        <mesh key={`crate-${i}`} position={[pos[0], 0.5, pos[2]]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 1, 1.2]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.93} />
        </mesh>
      ))}

      {/* Ground paving pattern in courtyard */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[courtyardSize, courtyardSize]} />
        <meshStandardMaterial color="#c8b896" roughness={0.95} displacementScale={0} />
      </mesh>

      {/* Entry/Exit areas - paved approach paths in four cardinal directions */}
      {/* North entry area */}
      <group position={[0, 0, -outerSize / 2 - 8]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 14]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {/* Stone border */}
        {[-6.2, 6.2].map((x, i) => (
          <mesh key={`n-border-${i}`} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.4, 0.25, 14]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {/* Hitching posts for animals */}
        {[-4, 0, 4].map((x, i) => (
          <mesh key={`n-post-${i}`} position={[x, 0.6, -5]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* South entry area */}
      <group position={[0, 0, outerSize / 2 + 8]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 14]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((x, i) => (
          <mesh key={`s-border-${i}`} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.4, 0.25, 14]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((x, i) => (
          <mesh key={`s-post-${i}`} position={[x, 0.6, 5]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* East entry area */}
      <group position={[outerSize / 2 + 8, 0, 0]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[14, 12]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((z, i) => (
          <mesh key={`e-border-${i}`} position={[0, 0.2, z]} castShadow>
            <boxGeometry args={[14, 0.25, 0.4]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((z, i) => (
          <mesh key={`e-post-${i}`} position={[5, 0.6, z]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* West entry area */}
      <group position={[-outerSize / 2 - 8, 0, 0]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[14, 12]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((z, i) => (
          <mesh key={`w-border-${i}`} position={[0, 0.2, z]} castShadow>
            <boxGeometry args={[14, 0.25, 0.4]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((z, i) => (
          <mesh key={`w-post-${i}`} position={[-5, 0.6, z]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
// Laundry Lines Component with Animation
const LaundryLines: React.FC<{ lines: LaundryLine[]; time: number }> = ({ lines, time }) => {
  return (
    <group>
      {lines.map((line) => (
        <LaundryLineRenderer key={line.id} line={line} time={time} />
      ))}
    </group>
  );
};

const LaundryLineRenderer: React.FC<{ line: LaundryLine; time: number }> = ({ line }) => {
  const ropeRef = useRef<THREE.Line>(null);

  // Create rope geometry using catenary curve
  const ropeGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = getCatenaryPoint(line, t);
      points.push(new THREE.Vector3(point[0], point[1], point[2]));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [line]);

  return (
    <group>
      {/* Rope */}
      <line ref={ropeRef} geometry={ropeGeometry}>
        <lineBasicMaterial color="#8b7355" linewidth={2} />
      </line>

      {/* Cloth items */}
      {line.clothItems.map((cloth, i) => {
        const catenaryPos = getCatenaryPoint(line, cloth.position);
        return (
          <ClothItem
            key={`${line.id}-cloth-${i}`}
            cloth={cloth}
            position={catenaryPos}
            windPhase={line.windPhase}
          />
        );
      })}
    </group>
  );
};

const ClothItem: React.FC<{
  cloth: import('../utils/laundry').ClothItem;
  position: [number, number, number];
  windPhase: number;
}> = ({ cloth, position, windPhase }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate cloth with wind
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const totalPhase = time + cloth.swayPhase + windPhase;

    // Horizontal sway
    const swayX = Math.sin(totalPhase * 1.2) * 0.15;
    const swayZ = Math.cos(totalPhase * 1.5) * 0.08;

    // Vertical bounce
    const bounceY = Math.sin(totalPhase * 0.8) * 0.08;

    // Apply animation
    meshRef.current.position.set(
      position[0] + swayX,
      position[1] + bounceY,
      position[2] + swayZ
    );

    // Slight rotation for more realism
    meshRef.current.rotation.y = cloth.rotation + Math.sin(totalPhase * 1.5) * 0.1;
    meshRef.current.rotation.z = Math.sin(totalPhase * 1.3) * 0.05;
  });

  return (
    <group>
      {/* Clothespin/peg */}
      <mesh position={position}>
        <cylinderGeometry args={[0.02, 0.025, 0.05, 6]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
      </mesh>

      {/* Cloth */}
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[cloth.size[0], cloth.size[1]]} />
        <meshStandardMaterial
          color={cloth.color}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};


export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, onGroundClick, onBuildingsGenerated, onHeightmapBuilt, onTreePositionsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false, pushables = [], fogColor, heightmap, laundryLines = [] }) => {
  const district = getDistrictType(mapX, mapY);
  const groundSeed = seededRandom(mapX * 1000 + mapY * 13 + 7);
  const terrainSeed = mapX * 1000 + mapY * 13 + 19;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  // Track building positions for path generation
  const [buildingPositions, setBuildingPositions] = React.useState<Array<[number, number, number]>>([]);

  const handleBuildingsGenerated = React.useCallback((buildings: BuildingMetadata[]) => {
    // Extract building positions
    setBuildingPositions(buildings.map(b => b.position));
    // Forward to original callback
    onBuildingsGenerated?.(buildings);
  }, [onBuildingsGenerated]);

  return (
    <HoverWireframeContext.Provider value={enableHoverWireframe}>
      <HoverLabelContext.Provider value={enableHoverLabel}>
        <group>
          <Ground onClick={onGroundClick} district={district} seed={groundSeed} terrainSeed={terrainSeed} timeOfDay={timeOfDay} fogColor={fogColor} onHeightmapBuilt={onHeightmapBuilt} />
          <Buildings mapX={mapX} mapY={mapY} onBuildingsGenerated={handleBuildingsGenerated} nearBuildingId={nearBuildingId} torchIntensity={torchIntensity} nightFactor={nightFactor} heightmap={heightmap} />
          <MosqueBackground mapX={mapX} mapY={mapY} />
          <HorizonBackdrop timeOfDay={timeOfDay} />
          <CentralWell mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          <WealthyGarden mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          <CitadelComplex mapX={mapX} mapY={mapY} />
          <OutskirtsDecor mapX={mapX} mapY={mapY} />
          <SouthernRoadDecor mapX={mapX} mapY={mapY} />
          <SalhiyyaDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} onTreePositionsGenerated={onTreePositionsGenerated} buildingPositions={buildingPositions} heightmap={heightmap} />
          <MountainShrineDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} onTreePositionsGenerated={onTreePositionsGenerated} />
          <CaravanseraiComplex mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          {pushables.length > 0 && <PushableDecorations items={pushables} />}
          {laundryLines.length > 0 && <LaundryLines lines={laundryLines} time={time} />}
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
