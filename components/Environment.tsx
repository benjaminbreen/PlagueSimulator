
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';
import { getTerrainHeight, buildHeightmapFromGeometry, TerrainHeightmap, sampleTerrainHeight } from '../utils/terrain';
import { PushableObject } from '../utils/pushables';
import { LaundryLine, getCatenaryPoint } from '../utils/laundry';
import {
  HOVER_WIREFRAME_COLORS,
  SANDSTONE_PALETTE,
  DARK_SANDSTONE,
  LIGHT_SANDSTONE,
  POT_COLORS,
  FLOWER_COLORS,
  GROUND_PALETTE
} from './environment/constants';
import {
  createNoiseTexture,
  createGrimeTexture,
  createBlotchTexture,
  createLinenTexture
} from './environment/geometry';
import { LaundryLines } from './environment/decorations/LaundryLines';
import {
  PushableGeraniumPot,
  PushableOlivePot,
  PushableLemonPot,
  PushablePalmPot,
  PushableBougainvilleaPot
} from './environment/decorations/Pots';
import {
  PushableBench,
  PushableClayJar,
  PushableBasket,
  PushableCoin,
  PushableOlive,
  PushableLemon,
  PushablePotteryShard,
  PushableLinenScrap,
  PushableCandleStub,
  PushableTwine
} from './environment/decorations/Pushables';
import { PushableBoulder } from './environment/decorations/Boulder';
import {
  HoverWireframeContext,
  HoverLabelContext,
  HoverableGroup,
  HoverOutlineBox,
  HoverLabel,
  useHoverFade
} from './environment/shared/HoverSystem';
import { MountainShrineDecor } from './environment/districts/MountainShrineDecor';
import { SalhiyyaDecor } from './environment/districts/SalhiyyaDecor';
import { CaravanseraiComplex } from './environment/districts/CaravanseraiComplex';
import { OutskirtsFarmlandDecor } from './environment/districts/OutskirtsFarmlandDecor';
import { OutskirtsDesertDecor } from './environment/districts/OutskirtsDesertDecor';
import { SouthernRoadDecor } from './environment/districts/SouthernRoadDecor';
import { MosqueBackground } from './environment/landmarks/MosqueBackground';
import { HorizonBackdrop } from './environment/landmarks/HorizonBackdrop';
import { CentralWell } from './environment/landmarks/CentralWell';
import { WealthyGarden } from './environment/landmarks/WealthyGarden';
import { CitadelComplex } from './environment/landmarks/CitadelComplex';

// Texture generators, constants, and hover system now imported from environment/

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

const CACHED_LINEN_TEXTURE = createLinenTexture(256);

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
    '#f0ebe0', // Bright whitewash
    '#ede8dc', // Pure white lime
    '#e8e3d5', // Pale cream whitewash
    '#e2d8c5', // Light linen
    '#dfd5bf', // Soft cream
    '#d6ccb7', // Warm cream
    '#d0c4ad', // Muted tan
    '#c9bea8', // Darker clay (less common)
  ],
  [BuildingType.COMMERCIAL]: [
    '#ede8dc', // Whitewashed lime
    '#e8e0d0', // Bright limestone
    '#e0d8c8', // Pale whitewash
    '#d8d0c0', // Light cream
    '#d4c4a8', // Pale limestone
    '#c8a87a', // Light sand
    '#b89668', // Warm golden sand
    '#a68a64', // Medium tan/khaki (less common)
  ],
  [BuildingType.RELIGIOUS]: [
    '#e8dcc4', // Original - off-white cream
    '#f0e6d2', // Pale ivory
    '#ddd1ba', // Warm linen
    '#ebe0ca', // Soft cream
    '#e3d6be', // Subtle beige
  ],
  [BuildingType.CIVIC]: [
    '#f0ebe0', // Bright whitewash
    '#ede8dc', // Pure white lime
    '#e8e3d5', // Pale cream whitewash
    '#e0d8c8', // Light cream
    '#ddd5c5', // Soft whitewash
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
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
  showCityWalls?: boolean;
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

const CAT_HUNT_RANGE = 8.0;  // Distance at which cat notices rats
const CAT_POUNCE_RANGE = 1.0;  // Distance at which cat pounces
const CAT_WALK_SPEED = 0.5;
const CAT_HUNT_SPEED = 1.2;

interface PlazaCatProps {
  waypoints: [number, number, number][];
  seed?: number;
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
}

export const PlazaCat: React.FC<PlazaCatProps> = ({ waypoints, seed = 0, catPositionRef, ratPositions }) => {
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
    mode: 'sleep' as 'sleep' | 'walk' | 'idle' | 'hunt' | 'pounce',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0,
    huntTarget: null as THREE.Vector3 | null,
    pounceTimer: 0
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

    // Update cat position ref for rats to use
    if (catPositionRef) {
      catPositionRef.current.copy(current);
    }

    // Check for nearby rats to hunt (unless sleeping or already pouncing)
    if (ratPositions && ratPositions.length > 0 && state.current.mode !== 'sleep' && state.current.mode !== 'pounce') {
      let nearestRat: THREE.Vector3 | null = null;
      let nearestDist = CAT_HUNT_RANGE;

      for (const ratPos of ratPositions) {
        const dist = current.distanceTo(ratPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestRat = ratPos.clone();
        }
      }

      if (nearestRat) {
        state.current.huntTarget = nearestRat;
        if (state.current.mode !== 'hunt') {
          state.current.mode = 'hunt';
        }
        // Check for pounce
        if (nearestDist < CAT_POUNCE_RANGE) {
          state.current.mode = 'pounce';
          state.current.pounceTimer = 0.5;
        }
      } else if (state.current.mode === 'hunt') {
        // Lost sight of rats, go back to walking
        state.current.mode = 'walk';
        state.current.huntTarget = null;
        state.current.timer = 3 + Math.random() * 4;
      }
    }

    // Breathing animation (subtle body scale pulse)
    const breathScale = 1 + Math.sin(state.current.breathCycle * 2) * 0.015;
    bodyRef.current.scale.setScalar(breathScale);

    // Ear twitches (occasional, more frequent when hunting)
    const earTwitchFreq = state.current.mode === 'hunt' ? 4 : 8;
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const twitch = Math.sin(state.current.breathCycle * earTwitchFreq + i * Math.PI) > 0.9 ? 0.15 : 0;
        ear.rotation.z = (i === 0 ? 0.2 : -0.2) + twitch;
      }
    });

    // Tail wave animation - faster when hunting
    const tailSpeed = state.current.mode === 'hunt' ? 6 : 3;
    const tailIntensity = state.current.mode === 'hunt' ? 0.4 : (state.current.mode === 'walk' ? 0.25 : 0.12);
    tailSegments.current.forEach((seg, i) => {
      if (seg) {
        const phase = state.current.breathCycle * tailSpeed - i * 0.4;
        seg.rotation.z = Math.sin(phase) * tailIntensity;
        seg.rotation.y = Math.cos(phase * 0.7) * tailIntensity * 0.4;
      }
    });

    // Pounce mode - quick lunge animation
    if (state.current.mode === 'pounce') {
      state.current.pounceTimer -= delta;

      // Crouch and spring
      if (headRef.current) {
        headRef.current.position.y = 0.08;
      }
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 0.6;
          leg.lower.rotation.z = -0.8;
        }
      });

      if (state.current.pounceTimer <= 0) {
        // Pounce finished, rats likely fled, go to idle
        state.current.mode = 'idle';
        state.current.huntTarget = null;
        state.current.timer = 2 + Math.random() * 3;
      }
      return;
    }

    if (state.current.mode === 'sleep') {
      // Sleeping: curled up, gentle breathing
      if (headRef.current) {
        headRef.current.rotation.y = -0.3;
        headRef.current.position.y = 0.08;
      }
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
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.5) * 0.2;
        headRef.current.position.y = 0.12;
      }
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

    // Hunt mode - chase the nearest rat
    if (state.current.mode === 'hunt' && state.current.huntTarget) {
      const target = state.current.huntTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      dir.normalize();
      current.add(dir.multiplyScalar(delta * CAT_HUNT_SPEED));
      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));

      // Faster walk cycle when hunting
      state.current.walkCycle += delta * 14;

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.3) * 0.05;
        headRef.current.position.y = 0.1; // Lower, more focused
      }

      // Fast leg movement
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.5;
          leg.lower.rotation.z = Math.sin(cycle - 0.5) * 0.4 - 0.2;
        }
      });
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
    current.add(dir.multiplyScalar(delta * CAT_WALK_SPEED));
    groupRef.current.lookAt(target);

    state.current.walkCycle += delta * 8;

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.5) * 0.08;
      headRef.current.position.y = 0.12 + Math.sin(state.current.walkCycle * 2) * 0.01;
    }

    legRefs.current.forEach((leg, i) => {
      if (leg?.upper && leg?.lower) {
        const isFront = i < 2;
        const isLeft = i % 2 === 0;
        const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
        const cycle = state.current.walkCycle + phaseOffset;
        leg.upper.rotation.z = Math.sin(cycle) * 0.4;
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

// Pushable decoration components now imported from environment/decorations/

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
  allowOrnate: boolean;
}> = ({ data, mainMaterial, otherMaterials, isNear, torchIntensity, district, nightFactor, noiseTextures, grimeTexture, allowOrnate }) => {
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
  const baseHeightScaled = baseHeight * districtScale;
  const baseBuildingSize = CONSTANTS.BUILDING_SIZE * districtScale * (data.sizeScale ?? 1);

  // Architectural features based on profession (historically authentic)
  const professionArchitecture = useMemo(() => {
    const arch = {
      hasDome: false,
      domeCount: 1,
      domeScale: 1.0,
      hasMinaret: false,
      minaretHeight: 0,
      footprintScale: 1.0,
      heightMultiplier: 1.0,
      hasSteamVents: false,
      hasMultipleDoors: false,
      hasCivicStripes: false, // Blue & white ablaq bands for civic buildings
    };

    // RELIGIOUS BUILDINGS - authentic Islamic architecture
    if (data.ownerProfession === 'Friday Mosque Imam') {
      // Jami - large Friday mosque
      arch.hasDome = true;
      arch.domeScale = 1.1; // Smaller dome with drum base
      arch.hasMinaret = true;
      arch.minaretHeight = baseHeightScaled * 1.8;
      arch.footprintScale = 1.6; // Wide for grand mosque
      arch.hasMultipleDoors = true;
    } else if (data.ownerProfession === 'Imam') {
      // Masjid - neighborhood mosque
      arch.hasDome = true;
      arch.domeScale = 0.85; // Smaller dome with drum
      arch.hasMinaret = seededRandom(localSeed + 300) > 0.5;
      arch.minaretHeight = baseHeightScaled * 1.3;
      arch.footprintScale = 1.3; // Wider to fit dome properly
    } else if (data.ownerProfession === 'Madrasa Director') {
      // Madrasa - Islamic school with courtyard
      arch.footprintScale = 1.3; // Large footprint
      arch.hasMultipleDoors = true;
      arch.heightMultiplier = 1.2;
      // No dome - rectangular plan
    } else if (data.ownerProfession === 'Shaykh') {
      // Zawiya - Sufi lodge
      arch.hasDome = seededRandom(localSeed + 301) > 0.6;
      arch.domeScale = 0.7; // Small dome with drum
      arch.footprintScale = 1.1; // Slightly wider for dome
    } else if (data.ownerProfession === 'Shrine Keeper') {
      // Mausoleum/Tomb
      arch.hasDome = true;
      arch.domeScale = 0.95; // Medium dome with drum
      arch.footprintScale = 1.0; // Wider for prominent dome
      arch.heightMultiplier = 1.3; // Tall and prominent
    }

    // CIVIC BUILDINGS - public services architecture
    if (data.ownerProfession === 'Mamluk Governor') {
      // Governor's palace
      arch.footprintScale = 1.4; // Large
      arch.heightMultiplier = 1.2;
      arch.hasMultipleDoors = true;
      arch.hasCivicStripes = true; // Prominent civic building
    } else if (data.ownerProfession === 'Court Qadi') {
      // Court/Tribunal
      arch.footprintScale = 1.2; // Large hall
      arch.hasMultipleDoors = true;
      arch.hasCivicStripes = true; // Important civic building
    } else if (data.ownerProfession === 'Hammam Keeper') {
      // Public bath - distinctive multiple domes
      arch.hasDome = true;
      arch.domeCount = 3;
      arch.domeScale = 0.6;
      arch.hasSteamVents = true;
      arch.footprintScale = 1.2;
      arch.hasCivicStripes = true; // Public facility
    } else if (data.ownerProfession === 'Court Physician') {
      // Medical clinic
      arch.footprintScale = 1.1;
      arch.hasMultipleDoors = true;
      arch.hasCivicStripes = true;
    } else if (data.ownerProfession === 'Market Inspector') {
      // Muhtasib office - trade regulation
      arch.footprintScale = 1.0;
      arch.hasCivicStripes = true; // Official civic building
    } else if (data.ownerProfession === 'Notary') {
      // Document office - smaller
      arch.footprintScale = 0.9;
      arch.hasCivicStripes = seededRandom(localSeed + 302) > 0.5; // 50% chance
    } else if (data.ownerProfession === 'Fountain Keeper') {
      // Sabil - public fountain (very small)
      arch.footprintScale = 0.6;
      arch.hasDome = true;
      arch.domeScale = 0.7;
    }

    return arch;
  }, [data.ownerProfession, localSeed, baseHeightScaled]);

  // Apply profession-based architectural scaling
  const finalBuildingSize = baseBuildingSize * professionArchitecture.footprintScale;
  const finalHeight = baseHeightScaled * professionArchitecture.heightMultiplier;

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
      // Tie texture intensity to color variant - pale colors get subtle texture, darker get more visible
      const colorVariants = BUILDING_COLOR_VARIANTS[data.type];
      const colorIndex = Math.floor(seededRandom(localSeed + 77) * colorVariants.length);

      // Whitewashed buildings (first 4 variants) get very subtle texture
      // Darker buildings get more visible texture
      if (colorIndex < 4) {
        // Whitewashed - very subtle texture
        mat.bumpMap = noiseTextures[0];
        mat.bumpScale = 0.03;
        mat.envMapIntensity = 2.2;
        needsShaderUpdate = true;
      } else if (colorIndex < 6) {
        // Medium colors - moderate texture
        mat.bumpMap = noiseTextures[1];
        mat.bumpScale = 0.08;
        mat.envMapIntensity = 1.8;
        needsShaderUpdate = true;
      } else {
        // Darker colors - more visible texture
        const textureVariant = Math.min(2 + (colorIndex - 6), noiseTextures.length - 1);
        mat.bumpMap = noiseTextures[textureVariant];
        mat.bumpScale = 0.12;
        mat.envMapIntensity = 1.5;
        needsShaderUpdate = true;
      }
    }

    if (data.type === BuildingType.RESIDENTIAL) {
      const roughnessJitter = (seededRandom(localSeed + 55) - 0.5) * 0.1;
      mat.roughness = THREE.MathUtils.clamp(0.8 + roughnessJitter, 0.65, 0.9);
      mat.metalness = 0.13;
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
  const fadeTargetRef = useRef<THREE.Color>(new THREE.Color('#d4c4a8')); // Warm beige/sand tone instead of bluish gray
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
    const fade = THREE.MathUtils.clamp((dist - 45) / 60, 0, 0.55); // Start fade at greater distance (45 instead of 18)
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
  const doorOffset = finalBuildingSize / 2 + 0.1;
  const doorPos: [number, number, number] = [0, -finalHeight / 2 + 1.25, 0];
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
  if (torchCount >= 1) torchOffsets.push([finalBuildingSize / 2 + 0.2, -finalHeight * 0.15, 0]);
  if (torchCount >= 2) torchOffsets.push([-finalBuildingSize / 2 - 0.2, -finalHeight * 0.15, 0]);
  const hasMarketOrnaments = district === 'MARKET' && seededRandom(localSeed + 81) > 0.6;
  const hasResidentialClutter = district !== 'MARKET' && seededRandom(localSeed + 83) > 0.5;
  const clutterType = Math.floor(seededRandom(localSeed + 84) * 3);
  const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);
  const hasTurret = district === 'MARKET' && seededRandom(localSeed + 91) > 0.85;
  const hasWealthyDoorOrnaments = district === 'WEALTHY' && seededRandom(localSeed + 121) > 0.35;
  const hasWealthyWindowTrim = district === 'WEALTHY' && seededRandom(localSeed + 123) > 0.4;
  const isOrnateBuilding = allowOrnate;
  const [showOrnateDetails, setShowOrnateDetails] = useState(true);
  const lastOrnateCheckRef = useRef(0);
  const hasCrenelation = seededRandom(localSeed + 141) > 0.75;
  const hasRoofCap = seededRandom(localSeed + 145) > 0.6;
  const hasParapetRing = seededRandom(localSeed + 149) > 0.7;
  const dirtBandHeight = finalHeight * 0.2;
  const crenelRef = useRef<THREE.InstancedMesh>(null);
  const crenelTemp = useMemo(() => new THREE.Object3D(), []);
  const crenelPositions = useMemo<[number, number, number][]>(() => {
    if (!hasCrenelation) return [];
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 12; i += 1) {
      const side = i % 4;
      const step = Math.floor(i / 4) - 1;
      const offset = finalBuildingSize * 0.42;
      const x = side === 0 ? -offset : side === 1 ? offset : step * (finalBuildingSize * 0.3);
      const z = side === 2 ? -offset : side === 3 ? offset : step * (finalBuildingSize * 0.3);
      positions.push([x, 0, z]);
    }
    return positions;
  }, [finalBuildingSize, hasCrenelation]);
  useEffect(() => {
    if (!crenelRef.current || crenelPositions.length === 0) return;
    crenelPositions.forEach((pos, index) => {
      crenelTemp.position.set(pos[0], pos[1], pos[2]);
      crenelTemp.updateMatrix();
      crenelRef.current!.setMatrixAt(index, crenelTemp.matrix);
    });
    crenelRef.current.instanceMatrix.needsUpdate = true;
  }, [crenelPositions, crenelTemp]);

  useFrame((state) => {
    if (!isOrnateBuilding) return;
    const elapsed = state.clock.elapsedTime;
    if (elapsed - lastOrnateCheckRef.current < 0.3) return;
    lastOrnateCheckRef.current = elapsed;
    const dx = camera.position.x - data.position[0];
    const dy = camera.position.y - finalHeight * 0.5;
    const dz = camera.position.z - data.position[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    const shouldShow = distSq < 20 * 20;
    if (shouldShow !== showOrnateDetails) {
      setShowOrnateDetails(shouldShow);
    }
  });
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
      position={[data.position[0], finalHeight / 2, data.position[2]]}
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
          offset={[0, finalHeight / 2 + 1.4, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[finalBuildingSize * 1.02, finalHeight * 1.02, finalBuildingSize * 1.02]} color={wireColor} />
          <HoverOutlineBox size={[finalBuildingSize * 1.06, finalHeight * 1.06, finalBuildingSize * 1.06]} color={wireColor} opacity={0.35} />
        </>
      )}
      {/* Main weathered sandstone structure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[finalBuildingSize, finalHeight, finalBuildingSize]} />
        <primitive object={buildingMaterial} />
      </mesh>
      {/* Ground contact grime - subtle AO with noise for natural grounding */}
      {grimeTexture && (
        <mesh position={[0, -finalHeight / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[finalBuildingSize * 1.2, finalBuildingSize * 1.2]} />
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
      <mesh position={[0, -finalHeight * 0.35, 0]} receiveShadow>
        <boxGeometry args={[finalBuildingSize * 1.01, dirtBandHeight, finalBuildingSize * 1.01]} />
        <meshStandardMaterial color="#5e4b37" transparent opacity={0.18} roughness={1} />
      </mesh>

      {/* CIVIC ABLAQ BANDS - Blue & white horizontal stripes (Mamluk civic architecture) */}
      {/* Stripes intelligently avoid doorway on the door side */}
      {professionArchitecture.hasCivicStripes && (
        <group>
          {[0.25, 0.45, 0.65, 0.85].map((hFrac, i) => {
            const stripeY = -finalHeight / 2 + finalHeight * hFrac;
            const stripeHeight = finalHeight * 0.05;
            const isBlue = i % 2 === 0;
            const color = isBlue ? '#4a6b8a' : '#e8dcc8';
            const doorY = -finalHeight / 2 + 1.25; // Door center height
            const doorHeight = 2.5; // Door height

            // Check if this stripe intersects with door height
            const stripeTop = stripeY + stripeHeight / 2;
            const stripeBottom = stripeY - stripeHeight / 2;
            const doorTop = doorY + doorHeight / 2;
            const doorBottom = doorY - doorHeight / 2;
            const intersectsDoor = stripeBottom < doorTop && stripeTop > doorBottom;

            return (
              <group key={`civic-stripe-${i}`}>
                {/* Four sides of the building */}
                {[0, 1, 2, 3].map((side) => {
                  const isDoorSide = side === data.doorSide;

                  if (side === 0 || side === 2) {
                    // North (0) or South (2) sides
                    const zPos = side === 0 ? finalBuildingSize / 2 : -finalBuildingSize / 2;

                    if (isDoorSide && intersectsDoor) {
                      // Split stripe around door
                      const doorWidth = 3.0;
                      const wallWidth = finalBuildingSize - doorWidth - 0.5;
                      return (
                        <group key={`side-${side}`}>
                          {/* Left portion */}
                          <mesh position={[-finalBuildingSize / 2 + wallWidth / 4, stripeY, zPos]} receiveShadow>
                            <boxGeometry args={[wallWidth / 2, stripeHeight, 0.02]} />
                            <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                          </mesh>
                          {/* Right portion */}
                          <mesh position={[finalBuildingSize / 2 - wallWidth / 4, stripeY, zPos]} receiveShadow>
                            <boxGeometry args={[wallWidth / 2, stripeHeight, 0.02]} />
                            <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                          </mesh>
                        </group>
                      );
                    } else {
                      // Full stripe
                      return (
                        <mesh key={`side-${side}`} position={[0, stripeY, zPos]} receiveShadow>
                          <boxGeometry args={[finalBuildingSize, stripeHeight, 0.02]} />
                          <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                        </mesh>
                      );
                    }
                  } else {
                    // East (1) or West (3) sides
                    const xPos = side === 1 ? finalBuildingSize / 2 : -finalBuildingSize / 2;

                    if (isDoorSide && intersectsDoor) {
                      // Split stripe around door
                      const doorWidth = 3.0;
                      const wallWidth = finalBuildingSize - doorWidth - 0.5;
                      return (
                        <group key={`side-${side}`}>
                          {/* Front portion */}
                          <mesh position={[xPos, stripeY, -finalBuildingSize / 2 + wallWidth / 4]} receiveShadow>
                            <boxGeometry args={[0.02, stripeHeight, wallWidth / 2]} />
                            <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                          </mesh>
                          {/* Back portion */}
                          <mesh position={[xPos, stripeY, finalBuildingSize / 2 - wallWidth / 4]} receiveShadow>
                            <boxGeometry args={[0.02, stripeHeight, wallWidth / 2]} />
                            <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                          </mesh>
                        </group>
                      );
                    } else {
                      // Full stripe
                      return (
                        <mesh key={`side-${side}`} position={[xPos, stripeY, 0]} receiveShadow>
                          <boxGeometry args={[0.02, stripeHeight, finalBuildingSize]} />
                          <meshStandardMaterial color={color} roughness={0.85} metalness={isBlue ? 0.05 : 0} />
                        </mesh>
                      );
                    }
                  }
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* Dome for Religious/Civic - profession-based architecture */}
      {professionArchitecture.hasDome && (
        <>
          {professionArchitecture.domeCount === 1 ? (
            <>
              {/* Drum/Parapet base - octagonal structure supporting the dome */}
              <mesh position={[0, finalHeight / 2 + 0.15, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[
                  finalBuildingSize * 0.42, // Top radius
                  finalBuildingSize * 0.45, // Bottom radius (slightly wider)
                  0.5, // Height of drum
                  8 // Octagonal
                ]} />
                <meshStandardMaterial color="#c4b196" roughness={0.85} />
              </mesh>
              {/* Decorative band around drum */}
              <mesh position={[0, finalHeight / 2 + 0.35, 0]} receiveShadow>
                <cylinderGeometry args={[
                  finalBuildingSize * 0.43,
                  finalBuildingSize * 0.43,
                  0.12,
                  8
                ]} />
                <meshStandardMaterial color="#b8a98e" roughness={0.82} />
              </mesh>
              <Dome
                position={[0, finalHeight / 2 + 0.45, 0]}
                radius={(finalBuildingSize / 2.2) * professionArchitecture.domeScale}
                nightFactor={nightFactor}
                material={(() => {
                  // Important religious buildings get special dome materials
                  if (data.ownerProfession === 'Friday Mosque Imam') {
                    // Gold or turquoise for grand mosques
                    const roll = seededRandom(localSeed + 73);
                    if (roll > 0.7) return otherMaterials.dome[7]; // Burnished gold
                    if (roll > 0.4) return otherMaterials.dome[6]; // Turquoise
                    return otherMaterials.dome[3]; // Deep blue
                  } else if (data.ownerProfession === 'Shrine Keeper') {
                    // Turquoise or green for shrines/tombs
                    const roll = seededRandom(localSeed + 73);
                    if (roll > 0.6) return otherMaterials.dome[6]; // Turquoise
                    if (roll > 0.3) return otherMaterials.dome[9]; // Green
                    return otherMaterials.dome[4]; // Medium blue
                  } else if (data.type === BuildingType.RELIGIOUS) {
                    // Religious buildings favor blue/turquoise glazed tiles
                    const roll = seededRandom(localSeed + 73);
                    if (roll > 0.6) return otherMaterials.dome[3 + Math.floor(seededRandom(localSeed + 74) * 4)]; // Blue/turquoise range
                    return otherMaterials.dome[Math.floor(seededRandom(localSeed + 75) * 3)]; // Sandstone
                  }
                  // Civic buildings use traditional sandstone
                  return otherMaterials.dome[Math.floor(seededRandom(localSeed + 73) * 3)];
                })()}
              />
            </>
          ) : (
            // Multiple small domes (for hammam)
            <>
              {/* Drum base for dome 1 */}
              <mesh position={[-finalBuildingSize * 0.25, finalHeight / 2 + 0.1, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[finalBuildingSize * 0.22, finalBuildingSize * 0.24, 0.35, 8]} />
                <meshStandardMaterial color="#c4b196" roughness={0.85} />
              </mesh>
              <Dome
                position={[-finalBuildingSize * 0.25, finalHeight / 2 + 0.3, 0]}
                radius={(finalBuildingSize / 2.2) * professionArchitecture.domeScale}
                nightFactor={nightFactor}
                material={otherMaterials.dome[Math.floor(seededRandom(localSeed + 73) * 3)]} // Sandstone for hammam
              />
              {/* Drum base for dome 2 */}
              <mesh position={[finalBuildingSize * 0.25, finalHeight / 2 + 0.1, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[finalBuildingSize * 0.22, finalBuildingSize * 0.24, 0.35, 8]} />
                <meshStandardMaterial color="#c4b196" roughness={0.85} />
              </mesh>
              <Dome
                position={[finalBuildingSize * 0.25, finalHeight / 2 + 0.3, 0]}
                radius={(finalBuildingSize / 2.2) * professionArchitecture.domeScale}
                nightFactor={nightFactor}
                material={otherMaterials.dome[Math.floor(seededRandom(localSeed + 74) * 3)]} // Sandstone for hammam
              />
              {/* Drum base for dome 3 */}
              <mesh position={[0, finalHeight / 2 + 0.1, finalBuildingSize * 0.25]} castShadow receiveShadow>
                <cylinderGeometry args={[finalBuildingSize * 0.22, finalBuildingSize * 0.24, 0.35, 8]} />
                <meshStandardMaterial color="#c4b196" roughness={0.85} />
              </mesh>
              <Dome
                position={[0, finalHeight / 2 + 0.3, finalBuildingSize * 0.25]}
                radius={(finalBuildingSize / 2.2) * professionArchitecture.domeScale}
                nightFactor={nightFactor}
                material={otherMaterials.dome[Math.floor(seededRandom(localSeed + 75) * 3)]} // Sandstone for hammam
              />
            </>
          )}
        </>
      )}

      {/* Minaret for mosques */}
      {professionArchitecture.hasMinaret && (
        <group position={[finalBuildingSize * 0.35, finalHeight / 2, finalBuildingSize * 0.35]}>
          {/* Minaret shaft */}
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.5, professionArchitecture.minaretHeight, 8]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.85} />
          </mesh>
          {/* Balcony */}
          <mesh position={[0, professionArchitecture.minaretHeight * 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.55, 0.2, 12]} />
            <meshStandardMaterial color="#c9b99a" roughness={0.88} />
          </mesh>
          {/* Top dome/cap */}
          <mesh position={[0, professionArchitecture.minaretHeight * 0.5 + 0.2, 0]} castShadow>
            <sphereGeometry args={[0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#8b7355" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* Steam vents for hammam */}
      {professionArchitecture.hasSteamVents && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh
              key={`vent-${i}`}
              position={[
                (i - 1) * finalBuildingSize * 0.3,
                finalHeight / 2 + 0.3,
                finalBuildingSize * 0.3
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.15, 0.2, 0.4, 6]} />
              <meshStandardMaterial color="#6b5a42" roughness={0.92} />
            </mesh>
          ))}
        </group>
      )}
      {/* Poor hovel roof detailing */}
      {district === 'HOVELS' && data.type === BuildingType.RESIDENTIAL && (
        <group position={[0, finalHeight / 2 + 0.08, 0]}>
          <mesh castShadow>
            <boxGeometry args={[finalBuildingSize * 0.95, 0.12, finalBuildingSize * 0.95]} />
            <meshStandardMaterial color="#6b5a42" roughness={0.98} />
          </mesh>
          <mesh position={[-0.3, 0.1, 0.1]} rotation={[0, 0.2, 0.05]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, finalBuildingSize * 0.8, 6]} />
            <meshStandardMaterial color="#4b3b2a" roughness={0.95} />
          </mesh>
          <mesh position={[0.2, 0.1, -0.15]} rotation={[0, -0.15, -0.04]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, finalBuildingSize * 0.7, 6]} />
            <meshStandardMaterial color="#4f3d2a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.14, 0.2]} rotation={[0.1, 0, 0.08]} castShadow>
            <boxGeometry args={[finalBuildingSize * 0.5, 0.06, 0.25]} />
            <meshStandardMaterial color="#5a4936" roughness={0.96} />
          </mesh>
        </group>
      )}
      {/* Subtle roof caps / parapet ring */}
      {hasRoofCap && (
        <mesh position={[0, finalHeight / 2 + 0.08, 0]} receiveShadow>
          <boxGeometry args={[finalBuildingSize * 0.6, 0.16, finalBuildingSize * 0.6]} />
          <meshStandardMaterial color="#9b7b4f" roughness={0.85} />
        </mesh>
      )}
      {hasParapetRing && (
        <mesh position={[0, finalHeight / 2 + 0.12, 0]} receiveShadow>
          <boxGeometry args={[finalBuildingSize * 0.92, 0.18, finalBuildingSize * 0.92]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.9} />
        </mesh>
      )}
      {hasCrenelation && (
        <instancedMesh ref={crenelRef} args={[undefined, undefined, crenelPositions.length]} position={[0, finalHeight / 2 + 0.2, 0]} receiveShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#a98963" roughness={0.95} />
        </instancedMesh>
      )}

      {/* DETAILED DOORWAY */}
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
      {isOrnateBuilding && (
        <>
            {/* Ornate door frame with ablaq pattern */}
            <mesh position={[0, 0.1, -0.05]} castShadow>
              <boxGeometry args={[3.1, 3.2, 0.12]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
            </mesh>
            {/* Alternating ablaq bands on door frame */}
            <mesh position={[0, 1.2, -0.03]} castShadow>
              <boxGeometry args={[3.0, 0.15, 0.1]} />
              <meshStandardMaterial color="#2a2420" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.9, -0.03]} castShadow>
              <boxGeometry args={[3.0, 0.12, 0.1]} />
              <meshStandardMaterial color="#e8dcc8" roughness={0.85} />
            </mesh>
            {/* Carved stone lintel with geometric pattern */}
            <mesh position={[0, 1.7, 0.12]} castShadow>
              <boxGeometry args={[2.8, 0.35, 0.22]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.85} />
            </mesh>
            {/* Central carved medallion on lintel */}
            <mesh position={[0, 1.7, 0.25]} rotation={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 8]} />
              <meshStandardMaterial color="#8b7355" roughness={0.9} />
            </mesh>
            {/* Corner decorative bosses */}
            <mesh position={[-1.2, 1.7, 0.22]} castShadow>
              <sphereGeometry args={[0.1, 6, 4]} />
              <meshStandardMaterial color="#a08060" roughness={0.85} />
            </mesh>
            <mesh position={[1.2, 1.7, 0.22]} castShadow>
              <sphereGeometry args={[0.1, 6, 4]} />
              <meshStandardMaterial color="#a08060" roughness={0.85} />
            </mesh>
            {/* Pointed arch above door (Mamluk style) */}
            <mesh position={[0, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[1.3, 1.3, 0.15, 12, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#c4b196" roughness={0.88} />
            </mesh>
            {/* Inner arch shadow line */}
            <mesh position={[0, 2.0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 0.08, 12, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
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
          <mesh position={[0, finalHeight / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[finalBuildingSize + 0.6, 0.3, finalBuildingSize + 0.6]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[0, finalHeight / 2 + 0.35, 0]} castShadow>
            <boxGeometry args={[finalBuildingSize + 0.4, 0.08, finalBuildingSize + 0.4]} />
            <meshStandardMaterial color="#bfae96" roughness={0.85} />
          </mesh>
          {seededRandom(localSeed + 37) > 0.7 && (
            <mesh position={[0, finalHeight / 2 + 0.6, 0]} castShadow>
              <sphereGeometry args={[finalBuildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#bda88b" roughness={0.8} />
            </mesh>
          )}
        </>
      )}

      {/* ORNATE ABLAQ BANDS - Alternating light/dark stone horizontal stripes (Mamluk Damascus style) */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 201) > 0.75 && (
        <group>
          {[0.2, 0.4, 0.6, 0.8].map((hFrac, i) => (
            <mesh key={`ablaq-${i}`} position={[0, -finalHeight / 2 + finalHeight * hFrac, 0]} receiveShadow>
              <boxGeometry args={[finalBuildingSize * 1.01, finalHeight * 0.06, finalBuildingSize * 1.01]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#2a2420' : '#e8dcc8'}
                roughness={0.85}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ORNATE MUQARNAS CORBELS - Decorative brackets under roofline */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 211) > 0.78 && (
        <group position={[0, finalHeight / 2 - 0.3, 0]}>
          {/* Four sides of corbels */}
          {[0, 1, 2, 3].map((side) => {
            const angle = side * Math.PI / 2;
            const offset = finalBuildingSize / 2 + 0.08;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 || side === 2 ? 0 : Math.PI / 2;
            const numCorbels = Math.floor(finalBuildingSize / 1.2);
            return (
              <group key={`corbel-side-${side}`} position={[x, 0, z]} rotation={[0, rot, 0]}>
                {Array.from({ length: numCorbels }).map((_, ci) => {
                  const spacing = finalBuildingSize / numCorbels;
                  const xPos = (ci - (numCorbels - 1) / 2) * spacing;
                  return (
                    <group key={`corbel-${ci}`} position={[xPos, 0, 0]}>
                      {/* Stepped muqarnas bracket */}
                      <mesh castShadow>
                        <boxGeometry args={[0.25, 0.15, 0.2]} />
                        <meshStandardMaterial color="#c4b196" roughness={0.9} />
                      </mesh>
                      <mesh position={[0, -0.12, 0.08]} castShadow>
                        <boxGeometry args={[0.2, 0.12, 0.15]} />
                        <meshStandardMaterial color="#b9a588" roughness={0.9} />
                      </mesh>
                      <mesh position={[0, -0.22, 0.14]} castShadow>
                        <boxGeometry args={[0.15, 0.1, 0.1]} />
                        <meshStandardMaterial color="#ae9a7a" roughness={0.9} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* ORNATE WALL NICHES - Decorative mihrab-style alcoves */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 221) > 0.8 && (
        <group>
          {[0, 1, 2, 3].filter(() => seededRandom(localSeed + 225 + Math.random() * 100) > 0.5).slice(0, 2).map((side) => {
            const offset = finalBuildingSize / 2 + 0.02;
            const x = side === 1 ? offset : side === 3 ? -offset : (seededRandom(localSeed + 230 + side) - 0.5) * finalBuildingSize * 0.5;
            const z = side === 0 ? offset : side === 2 ? -offset : (seededRandom(localSeed + 235 + side) - 0.5) * finalBuildingSize * 0.5;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const nicheY = -finalHeight * 0.1 + seededRandom(localSeed + 240 + side) * finalHeight * 0.2;
            return (
              <group key={`niche-${side}`} position={[x, nicheY, z]} rotation={[0, rot, 0]}>
                {/* Recessed niche frame */}
                <mesh position={[0, 0, -0.08]} castShadow>
                  <boxGeometry args={[0.9, 1.4, 0.2]} />
                  <meshStandardMaterial color="#3d3428" roughness={0.95} />
                </mesh>
                {/* Pointed arch top */}
                <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.45, 0.45, 0.12, 8, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.85} />
                </mesh>
                {/* Inner carved panel */}
                <mesh position={[0, -0.1, 0.02]}>
                  <boxGeometry args={[0.6, 0.9, 0.05]} />
                  <meshStandardMaterial color="#4a3d30" roughness={0.9} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* ORNATE CARVED MEDALLIONS - Geometric stone rosettes */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 251) > 0.77 && (
        <group>
          {[0, 1, 2, 3].map((side) => {
            if (seededRandom(localSeed + 255 + side * 7) < 0.6) return null;
            const offset = finalBuildingSize / 2 + 0.03;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const medallionY = finalHeight * 0.15 + seededRandom(localSeed + 260 + side) * finalHeight * 0.15;
            return (
              <group key={`medallion-${side}`} position={[x, medallionY, z]} rotation={[0, rot, 0]}>
                {/* Outer ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.35, 0.06, 8, 16]} />
                  <meshStandardMaterial color="#d4c4a8" roughness={0.85} />
                </mesh>
                {/* Inner carved star pattern */}
                <mesh position={[0, 0, 0.02]}>
                  <circleGeometry args={[0.28, 8]} />
                  <meshStandardMaterial color="#8b7355" roughness={0.9} />
                </mesh>
                {/* Center boss */}
                <mesh position={[0, 0, 0.05]}>
                  <sphereGeometry args={[0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.8} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* WINDOWS - Now rendered with instanced meshes for better performance */}

      {/* ORNATE WINDOW SURROUNDS - Mashrabiya-style carved frames for wealthy buildings */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 271) > 0.7 && (
        <group>
          {/* Add decorative window surrounds on 2 sides (avoiding door side) */}
          {[0, 1, 2, 3].filter(s => s !== data.doorSide).slice(0, 2).map((side) => {
            const offset = finalBuildingSize / 2 + 0.04;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const windowY = finalHeight / 2 - 2;
            return (
              <group key={`window-surround-${side}`} position={[x, windowY, z]} rotation={[0, rot, 0]}>
                {/* Outer carved frame */}
                <mesh position={[0, 0, 0]} castShadow>
                  <boxGeometry args={[2.0, 2.8, 0.1]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.9} />
                </mesh>
                {/* Inner recessed panel */}
                <mesh position={[0, 0, 0.03]}>
                  <boxGeometry args={[1.6, 2.4, 0.06]} />
                  <meshStandardMaterial color="#2a2420" roughness={0.95} />
                </mesh>
                {/* Pointed arch header */}
                <mesh position={[0, 1.5, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.8, 0.8, 0.1, 8, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#c4b196" roughness={0.88} />
                </mesh>
                {/* Mashrabiya-style horizontal dividers */}
                {[-0.6, 0, 0.6].map((yOff, i) => (
                  <mesh key={`div-${i}`} position={[0, yOff, 0.06]}>
                    <boxGeometry args={[1.5, 0.08, 0.04]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.9} />
                  </mesh>
                ))}
                {/* Vertical dividers */}
                {[-0.4, 0.4].map((xOff, i) => (
                  <mesh key={`vdiv-${i}`} position={[xOff, -0.1, 0.06]}>
                    <boxGeometry args={[0.06, 2.0, 0.04]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.9} />
                  </mesh>
                ))}
              </group>
            );
          })}
        </group>
      )}

      {/* Animated Awnings */}
      {(data.type === BuildingType.COMMERCIAL || data.type === BuildingType.CIVIC || seededRandom(localSeed + 3) > 0.6) && (
        <Awning
          material={(() => {
            // Civic buildings with blue & white stripes (Mamluk/Ottoman style)
            // Exclude Fountain Keeper since sabils are too small for elaborate awnings
            const civicProfessions = ['Hammam Keeper', 'Court Qadi', 'Mamluk Governor', 'Court Physician', 'Market Inspector', 'Notary'];
            if (data.type === BuildingType.CIVIC && civicProfessions.includes(data.ownerProfession)) {
              return otherMaterials.civicStripes[Math.floor(seededRandom(localSeed + 6) * otherMaterials.civicStripes.length)];
            }
            // Regular awnings for other buildings
            return seededRandom(localSeed + 5) > 0.5
              ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 6) * otherMaterials.awningStriped.length)]
              : otherMaterials.awning[
                  Math.floor(
                    seededRandom(localSeed + 4) *
                      (district === 'WEALTHY' ? otherMaterials.awning.length : 9)
                  )
                ];
          })()}
          position={[0, -finalHeight / 2 + finalHeight * 0.42, finalBuildingSize / 2 + 0.2]}
          rotation={[0.35 + seededRandom(localSeed + 15) * 1.15, 0, 0]}
          width={finalBuildingSize * (0.72 + seededRandom(localSeed + 16) * 0.12)}
          seed={localSeed}
          nightFactor={nightFactor}
        />
      )}

      {/* Secondary Awning / Beam Protrusions */}
      {seededRandom(localSeed + 61) > 0.75 && (
        <Awning
          material={(() => {
            // Civic buildings with blue & white stripes
            // Exclude Fountain Keeper since sabils are too small for elaborate awnings
            const civicProfessions = ['Hammam Keeper', 'Court Qadi', 'Mamluk Governor', 'Court Physician', 'Market Inspector', 'Notary'];
            if (data.type === BuildingType.CIVIC && civicProfessions.includes(data.ownerProfession)) {
              return otherMaterials.civicStripes[Math.floor(seededRandom(localSeed + 64) * otherMaterials.civicStripes.length)];
            }
            // Regular awnings
            return seededRandom(localSeed + 63) > 0.5
              ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 64) * otherMaterials.awningStriped.length)]
              : otherMaterials.awning[
                  Math.floor(
                    seededRandom(localSeed + 62) *
                      (district === 'WEALTHY' ? otherMaterials.awning.length : 9)
                  )
                ];
          })()}
          position={[0, -finalHeight / 2 + finalHeight * 0.58, -finalBuildingSize / 2 - 0.2]}
          rotation={[0.3 + seededRandom(localSeed + 66) * 1.0, Math.PI, 0]}
          width={finalBuildingSize * (0.55 + seededRandom(localSeed + 67) * 0.1)}
          seed={localSeed + 2}
          nightFactor={nightFactor}
        />
      )}
      {seededRandom(localSeed + 71) > 0.6 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={`beam-${i}`} position={[finalBuildingSize / 2 + 0.4, -finalHeight / 2 + 1 + i * 1.4, (i - 1) * 1.2]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.15]} />
              <meshStandardMaterial color="#3d2817" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Market ornaments - now rendered with instanced meshes */}
      {hasResidentialClutter && (
        <group position={[0, -finalHeight / 2, 0]}>
          {/* Amphora/ClayJar (clutterType === 0) - now instanced */}
          {clutterType === 1 && <PotTree position={[-finalBuildingSize / 2 - 0.9, 0.2, 1.1]} />}
          {clutterType === 2 && <StoneSculpture position={[finalBuildingSize / 2 + 0.7, 0.2, 1.3]} />}
        </group>
      )}
      {hasWealthyDoorOrnaments && (
        <group position={[0, -finalHeight / 2, 0]}>
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
        <CornerTurret position={[finalBuildingSize / 2 - 0.6, finalHeight / 2 - 1.1, finalBuildingSize / 2 - 0.6]} />
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
        // Only use bump map (physical texture), no color map - lets base colors show through
        bumpMap: applyTexture ? noiseTextures[2] : null,
        bumpScale: applyTexture ? 0.2 : 0, // TEMPORARY: Cranked way up for testing
      }));
    });
    return matMap;
  }, []);

  const otherMaterials = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 1.0 }),
    dome: [
      // Traditional sandstone domes
      new THREE.MeshStandardMaterial({ color: '#b8a98e', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#a6947a', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#c7b89c', roughness: 0.7 }),
      // Blue glazed tiles (Mamluk style)
      new THREE.MeshStandardMaterial({ color: '#4a6b8a', roughness: 0.5, metalness: 0.1 }), // deep blue glaze
      new THREE.MeshStandardMaterial({ color: '#5a7b9a', roughness: 0.5, metalness: 0.1 }), // medium blue glaze
      new THREE.MeshStandardMaterial({ color: '#6a8baa', roughness: 0.5, metalness: 0.1 }), // light blue glaze
      // Turquoise (traditional Islamic architecture)
      new THREE.MeshStandardMaterial({ color: '#3a9aa0', roughness: 0.5, metalness: 0.15 }), // turquoise
      // Gold/brass domes (for important mosques)
      new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.3, metalness: 0.4 }), // burnished gold
      new THREE.MeshStandardMaterial({ color: '#c9a550', roughness: 0.35, metalness: 0.35 }), // aged gold
      // Green glazed tiles (traditional)
      new THREE.MeshStandardMaterial({ color: '#5a7a5a', roughness: 0.55, metalness: 0.1 }), // dark green
    ],
    awning: [
      // Natural undyed fabrics (common)
      new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // natural linen
      new THREE.MeshStandardMaterial({ color: '#e0cfa6', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // pale hemp
      new THREE.MeshStandardMaterial({ color: '#c8b08a', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // tan canvas
      // Indigo blues (very popular in Damascus)
      new THREE.MeshStandardMaterial({ color: '#3a5a7a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // deep indigo
      new THREE.MeshStandardMaterial({ color: '#4a6b8a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // medium indigo
      new THREE.MeshStandardMaterial({ color: '#5a7b9a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // light indigo
      // Madder reds (common affordable dye)
      new THREE.MeshStandardMaterial({ color: '#8b4a4a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // brick red
      new THREE.MeshStandardMaterial({ color: '#a05555', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // terracotta red
      // Earth tones - umbers and ochres
      new THREE.MeshStandardMaterial({ color: '#9a7555', roughness: 0.92, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // raw umber
      new THREE.MeshStandardMaterial({ color: '#b08040', roughness: 0.92, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // yellow ochre
      new THREE.MeshStandardMaterial({ color: '#8b6040', roughness: 0.92, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // burnt umber
      // Saffron yellows (more expensive but available)
      new THREE.MeshStandardMaterial({ color: '#c9a550', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // saffron gold
    ],
    awningStriped: [
      // Natural striped linens
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#ead9b7', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#e0cdaa', roughness: 0.95, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#e2d3b2', roughness: 0.95, side: THREE.DoubleSide }),
      // Colorful striped awnings (indigo, red, ochre)
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#4a6b8a', roughness: 0.9, side: THREE.DoubleSide }), // indigo stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#a05555', roughness: 0.9, side: THREE.DoubleSide }), // red stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#b08040', roughness: 0.9, side: THREE.DoubleSide }), // ochre stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#c9a550', roughness: 0.9, side: THREE.DoubleSide })  // saffron stripes
    ],
    // Blue and white striped materials for civic buildings (authentic Mamluk/Ottoman style)
    civicStripes: [
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#3a5a7a', roughness: 0.88, side: THREE.DoubleSide }), // deep blue & white
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#4a6b8a', roughness: 0.88, side: THREE.DoubleSide }), // medium blue & white
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#5a7b9a', roughness: 0.88, side: THREE.DoubleSide }), // light blue & white
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
    if (district === 'OUTSKIRTS_FARMLAND' || district === 'OUTSKIRTS_DESERT') {
      const positions: Array<[number, number, number]> = district === 'OUTSKIRTS_FARMLAND'
        ? [
          [-16, 0, -10],
          [14, 0, 8],
          [-6, 0, 14],
        ]
        : [
          [-24, 0, -18],
          [22, 0, 16],
          [-8, 0, 26],
          [26, 0, -6],
          [-26, 0, 8],
        ];
      positions.forEach((pos, idx) => {
        const [x, y, z] = pos;
        const localSeed = seed + idx * 1337;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (idx === 0) {
          data.type = BuildingType.COMMERCIAL;
          data.ownerProfession = district === 'OUTSKIRTS_FARMLAND' ? 'Farmer' : 'Trader';
        }
        if (idx === 1) {
          data.type = BuildingType.RESIDENTIAL;
          data.ownerProfession = district === 'OUTSKIRTS_FARMLAND' ? 'Field Worker' : 'Water-Carrier';
        }
        data.position = [x, y, z];
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

    const size = CONSTANTS.MARKET_SIZE * (
      district === 'WEALTHY' ? 1.15
        : district === 'HOVELS' ? 0.9
          : district === 'CIVIC' ? 1.1
            : district === 'SALHIYYA' ? 0.5
              : district === 'OUTSKIRTS_FARMLAND' ? 0.75
                : district === 'OUTSKIRTS_DESERT' ? 0.8
                  : 1.0
    );
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (
      district === 'WEALTHY' ? 1.25
        : district === 'HOVELS' ? 0.75
          : district === 'CIVIC' ? 1.1
            : district === 'SALHIYYA' ? 1.0
              : district === 'OUTSKIRTS_FARMLAND' ? 0.85
                : district === 'OUTSKIRTS_DESERT' ? 0.9
                  : 1.0
    );
    const street = CONSTANTS.STREET_WIDTH * (
      district === 'WEALTHY' ? 2.2
        : district === 'HOVELS' ? 0.85
          : district === 'CIVIC' ? 2.6
            : district === 'SALHIYYA' ? 1.8
              : district === 'OUTSKIRTS_FARMLAND' ? 2.0
                : district === 'OUTSKIRTS_DESERT' ? 2.2
                  : 1.0
    );
    const gap = baseBuilding + street;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        const skipChance = district === 'WEALTHY' ? 0.55
          : district === 'HOVELS' ? 0.2
            : district === 'CIVIC' ? 0.7
              : district === 'SALHIYYA' ? 0.2
                : district === 'OUTSKIRTS_FARMLAND' ? 0.7
                  : district === 'OUTSKIRTS_DESERT' ? 0.78
                    : 0.3;
        if (chance < skipChance) continue;
        if (district === 'CIVIC' && (x * x + z * z) < (gap * 2.2) * (gap * 2.2)) continue;
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (district === 'SALHIYYA' || district === 'MOUNTAIN_SHRINE') {
          const h = heightmap ? sampleTerrainHeight(heightmap, x, z) : getTerrainHeight(district, x, z, terrainSeed);
          data.position = [x, h, z];
        }
        bldMetadata.push(data);
      }
    }

    // MARKETPLACE LIMITS: Enforce max 1 religious and 3 civic buildings
    let limitedMetadata = bldMetadata;
    if (district === 'MARKET') {
      const religious = bldMetadata.filter(b => b.type === BuildingType.RELIGIOUS);
      const civic = bldMetadata.filter(b => b.type === BuildingType.CIVIC);

      // Keep only the first religious building (best positioned)
      const keepReligious = new Set(religious.slice(0, 1).map(b => b.id));

      // Keep only the first 3 civic buildings (best positioned)
      const keepCivic = new Set(civic.slice(0, 3).map(b => b.id));

      limitedMetadata = bldMetadata.filter(b => {
        if (b.type === BuildingType.RELIGIOUS) return keepReligious.has(b.id);
        if (b.type === BuildingType.CIVIC) return keepCivic.has(b.id);
        return true; // Keep all commercial and residential
      });
    }

    // Filter out residential/commercial buildings too close to civic/religious buildings
    // This creates natural spacing and breathing room around important buildings
    const civicReligious = limitedMetadata.filter(b => b.type === BuildingType.CIVIC || b.type === BuildingType.RELIGIOUS);
    const MIN_DISTANCE_SQ = gap * gap * 1.5; // ~1.2x grid spacing squared (reduced for denser layout)

    const filtered = limitedMetadata.filter(b => {
      // Always keep civic and religious buildings
      if (b.type === BuildingType.CIVIC || b.type === BuildingType.RELIGIOUS) return true;

      // Check distance to all civic/religious buildings
      for (const important of civicReligious) {
        const dx = b.position[0] - important.position[0];
        const dz = b.position[2] - important.position[2];
        const distSq = dx * dx + dz * dz;

        // Remove if too close to a civic/religious building
        if (distSq < MIN_DISTANCE_SQ) return false;
      }

      return true;
    });

    return filtered;
  }, [mapX, mapY, heightmap]);

  React.useEffect(() => {
    onBuildingsGenerated?.(metadata);
  }, [metadata, onBuildingsGenerated]);

  const district = getDistrictType(mapX, mapY);
  const ornateBuildingIds = useMemo(() => {
    const candidates = metadata.filter((b) => {
      if (b.type === BuildingType.RELIGIOUS || b.type === BuildingType.CIVIC) return true;
      if (district === 'WEALTHY') return true;
      return b.sizeScale ? b.sizeScale > 1.15 : false;
    });
    const scored = candidates.map((b) => {
      const base = b.type === BuildingType.RELIGIOUS ? 3 : b.type === BuildingType.CIVIC ? 2 : district === 'WEALTHY' ? 1 : 0;
      const score = base + seededRandom(b.position[0] * 1000 + b.position[2] + 919);
      return { id: b.id, score };
    });
    scored.sort((a, b) => b.score - a.score);
    // Wealthy quarter gets 10 ornate buildings, other districts get 4
    const maxOrnate = district === 'WEALTHY' ? 10 : 4;
    return new Set(scored.slice(0, maxOrnate).map((item) => item.id));
  }, [metadata, district]);

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
          allowOrnate={ornateBuildingIds.has(data.id)}
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
    if (district !== 'SALHIYYA' && district !== 'MOUNTAIN_SHRINE') return null;
    const gridSize = district === 'SALHIYYA' ? 80 : 250;
    const segments = district === 'SALHIYYA' ? 60 : 120;
    return buildTerrain(gridSize, segments);
  }, [district, terrainSeed]);
  const innerTerrainGeometry = useMemo(() => {
    if (district !== 'SALHIYYA' && district !== 'MOUNTAIN_SHRINE') return null;
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

  // Using imported GROUND_PALETTE from environment/constants
  const pick = (list: string[]) => list[Math.floor(seed * list.length) % list.length];
  const baseColor = district === 'MARKET' ? pick(GROUND_PALETTE.MARKET)
    : district === 'WEALTHY' ? pick(GROUND_PALETTE.WEALTHY)
    : district === 'HOVELS' ? pick(GROUND_PALETTE.HOVELS)
    : district === 'ALLEYS' ? pick(GROUND_PALETTE.ALLEYS)
    : district === 'SALHIYYA' ? pick(GROUND_PALETTE.SALHIYYA)
    : district === 'OUTSKIRTS_FARMLAND' ? pick(GROUND_PALETTE.OUTSKIRTS_FARMLAND)
    : district === 'OUTSKIRTS_DESERT' ? pick(GROUND_PALETTE.OUTSKIRTS_DESERT)
    : district === 'MOUNTAIN_SHRINE' ? pick(GROUND_PALETTE.MOUNTAIN_SHRINE)
    : district === 'CARAVANSERAI' ? pick(GROUND_PALETTE.CARAVANSERAI)
    : district === 'SOUTHERN_ROAD' ? pick(GROUND_PALETTE.SOUTHERN_ROAD)
    : district === 'CIVIC' ? pick(GROUND_PALETTE.CIVIC)
    : pick(GROUND_PALETTE.DEFAULT);
  const overlayColor = district === 'WEALTHY' ? '#c3b9a9'
    : district === 'HOVELS' || district === 'ALLEYS' ? '#9a734d'
    : district === 'SALHIYYA' ? '#4a6a3a' // Grass overlay
    : district === 'OUTSKIRTS_FARMLAND' ? '#4f6f3b'
    : district === 'OUTSKIRTS_DESERT' ? '#d17a4a' // Warm terracotta overlay (unused - overlay disabled for desert)
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
      // Desert sand should be completely matte (no shine/wetness)
      roughness: district === 'OUTSKIRTS_DESERT' ? 1.0 : 0.95,
      metalness: 0,
      // Desert sand: no roughness map for flatter, drier appearance
      roughnessMap: (district === 'CARAVANSERAI' || district === 'OUTSKIRTS_DESERT') ? null : roughnessTexture || null,
      bumpMap: (district === 'CARAVANSERAI' || district === 'OUTSKIRTS_DESERT') ? null : roughnessTexture || null,
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

      {/* Skip overlay for desert - no moisture/wetness effect */}
      {district !== 'OUTSKIRTS_DESERT' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
          <primitive object={terrainGeometry ?? baseGeometry} attach="geometry" />
          <primitive object={groundOverlayMaterial} />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <primitive object={innerTerrainGeometry ?? innerBaseGeometry} attach="geometry" />
        <meshStandardMaterial color={baseColor} roughness={1} opacity={0.18} transparent />
      </mesh>
    </group>
  );
};

// MosqueBackground extracted to ./environment/landmarks/MosqueBackground.tsx

// HorizonBackdrop extracted to ./environment/landmarks/HorizonBackdrop.tsx

// CentralWell extracted to ./environment/landmarks/CentralWell.tsx

// WealthyGarden extracted to ./environment/landmarks/WealthyGarden.tsx

// CitadelComplex extracted to ./environment/landmarks/CitadelComplex.tsx

// MountainShrineDecor extracted to ./environment/districts/MountainShrineDecor.tsx

// SalhiyyaDecor extracted to ./environment/districts/SalhiyyaDecor.tsx

// OutskirtsFarmlandDecor extracted to ./environment/districts/OutskirtsFarmlandDecor.tsx
// OutskirtsDesertDecor extracted to ./environment/districts/OutskirtsDesertDecor.tsx

// SouthernRoadDecor extracted to ./environment/districts/SouthernRoadDecor.tsx

// CaravanseraiComplex extracted to ./environment/districts/CaravanseraiComplex.tsx

// LaundryLines now imported from ./environment/decorations/LaundryLines

export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, onGroundClick, onBuildingsGenerated, onHeightmapBuilt, onTreePositionsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false, pushables = [], fogColor, heightmap, laundryLines = [], catPositionRef, ratPositions, showCityWalls = true }) => {
  const district = getDistrictType(mapX, mapY);
  const groundSeed = seededRandom(mapX * 1000 + mapY * 13 + 7);
  const terrainSeed = mapX * 1000 + mapY * 13 + 19;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  // Hide city walls in marketplace - it's an open commercial district
  const displayCityWalls = district === 'MARKET' ? false : showCityWalls;

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
          <HorizonBackdrop timeOfDay={timeOfDay} showCityWalls={displayCityWalls} wallRadius={CONSTANTS.BOUNDARY + 8} district={district} />
          <CentralWell mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} catPositionRef={catPositionRef} ratPositions={ratPositions} />
          <WealthyGarden mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} buildingPositions={buildingPositions} />
          <CitadelComplex mapX={mapX} mapY={mapY} />
          <OutskirtsFarmlandDecor mapX={mapX} mapY={mapY} />
          <OutskirtsDesertDecor mapX={mapX} mapY={mapY} />
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
