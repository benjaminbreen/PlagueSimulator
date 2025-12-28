
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';
import { getProfessionSign, ProfessionSign } from '../utils/professionSignData';
import { getTerrainHeight, buildHeightmapFromGeometry, TerrainHeightmap, sampleTerrainHeight } from '../utils/terrain';
import { PushableObject } from '../utils/pushables';
import { LaundryLine, getCatenaryPoint } from '../utils/laundry';
import { HangingCarpet } from '../utils/hangingCarpets';
import { bakeBoxAO, bakeBoxAO_TallBuilding, bakeBoxAO_Civic } from '../utils/vertexAO';
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
import { HangingCarpets } from './environment/decorations/HangingCarpets';
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
  PushableTwine,
  PushableCrate,
  PushableAmphora
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
import { MarketplaceDecor } from './environment/districts/MarketplaceDecor';
import { CaravanseraiComplex } from './environment/districts/CaravanseraiComplex';
import { OutskirtsFarmlandDecor } from './environment/districts/OutskirtsFarmlandDecor';
import { OutskirtsDesertDecor } from './environment/districts/OutskirtsDesertDecor';
import { SouthernRoadDecor } from './environment/districts/SouthernRoadDecor';
import { ChristianQuarterDecor } from './environment/districts/ChristianQuarterDecor';
import JewishQuarterDecor from './environment/districts/JewishQuarterDecor';
import UmayyadMosqueDistrict from './environment/districts/UmayyadMosqueDistrict';
import { MosqueBackground } from './environment/landmarks/MosqueBackground';
import { HorizonBackdrop } from './environment/landmarks/HorizonBackdrop';
import { CentralWell } from './environment/landmarks/CentralWell';
import { BirdFlock } from './environment/landmarks/BirdFlock';
import { WealthyGarden } from './environment/landmarks/WealthyGarden';
import { CitadelComplex } from './environment/landmarks/CitadelComplex';
import { ClimbableAccessory } from './environment/climbables';
import { generateClimbablesForBuilding } from '../utils/climbables';

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

// District-specific color overrides - Jewish Quarter uses darker stone (dhimmi restrictions)
const JEWISH_QUARTER_COLORS = {
  [BuildingType.RESIDENTIAL]: [
    '#8a7a68', // Dark stone
    '#7a6a58', // Darker stone
    '#6a5a48', // Very dark stone
    '#7a6858', // Warm dark stone
    '#8a7868', // Medium dark stone
    '#9a8878', // Lighter dark stone
  ],
  [BuildingType.COMMERCIAL]: [
    '#8a7a68', // Dark stone
    '#7a6a58', // Darker stone
    '#8a7868', // Medium dark stone
    '#9a8878', // Lighter dark stone
    '#7a6858', // Warm dark stone
  ],
  [BuildingType.RELIGIOUS]: [
    '#6a5a48', // Very dark stone (modest synagogues)
    '#7a6a58', // Dark stone
    '#8a7a68', // Medium dark stone
  ],
  [BuildingType.CIVIC]: [
    '#7a6a58', // Dark stone
    '#8a7a68', // Medium dark stone
    '#9a8878', // Lighter dark stone
  ],
};

const CHRISTIAN_QUARTER_COLORS = {
  [BuildingType.RESIDENTIAL]: [
    '#d8cebb', // Pale stone
    '#c8beab', // Light stone
    '#b8ae9b', // Medium stone
    '#c8b8a8', // Warm stone
    '#d0c0b0', // Light warm stone
  ],
  [BuildingType.COMMERCIAL]: [
    '#d0c4b0', // Pale limestone
    '#c0b4a0', // Light limestone
    '#c8bcaa', // Medium limestone
    '#d8ccba', // Bright limestone
  ],
  [BuildingType.RELIGIOUS]: [
    '#e8dcc8', // Bright church stone
    '#f0e4d0', // Very pale stone
    '#d8ccb8', // Warm stone
  ],
  [BuildingType.CIVIC]: [
    '#d8ccb8', // Warm stone
    '#c8bcaa', // Medium stone
    '#d0c4b0', // Pale stone
  ],
};

interface EnvironmentProps {
  mapX: number;
  mapY: number;
  sessionSeed?: number; // Random seed per game session for procedural variation
  onGroundClick?: (point: THREE.Vector3) => void;
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void;
  onClimbablesGenerated?: (climbables: import('../types').ClimbableAccessory[]) => void;
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
  hangingCarpets?: HangingCarpet[];
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
  isSprinting?: boolean;
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
const CAT_FLEE_SPEED = 1.8;
const CAT_FLEE_RANGE = 3.0;  // Distance at which cat flees from NPCs
const CAT_SPRINT_STARTLE_RANGE = 3.5;  // Distance at which sprinting player startles cat
const CAT_COLLISION_RADIUS = 0.7;  // Cat's collision radius

// Dog constants
const DOG_WALK_SPEED = 0.8;
const DOG_RUN_SPEED = 2.0;
const DOG_FOLLOW_DISTANCE = 6.0;  // Distance at which dog follows NPCs
const DOG_MIN_FOLLOW_DISTANCE = 3.0;  // Minimum distance to maintain from NPCs
const DOG_COLLISION_RADIUS = 0.9;  // Dog's collision radius

interface BallPhysics {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  lastBatTime: number;
}

interface PlazaCatProps {
  waypoints: [number, number, number][];
  seed?: number;
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
  isSprinting?: boolean;
  ballPhysics?: React.MutableRefObject<BallPhysics>;
}

export const PlazaCat: React.FC<PlazaCatProps> = ({ waypoints, seed = 0, catPositionRef, ratPositions, npcPositions, playerPosition, isSprinting, ballPhysics }) => {
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
    mode: 'sleep' as 'sleep' | 'walk' | 'idle' | 'hunt' | 'pounce' | 'flee' | 'jump' | 'stretch' | 'bat',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0,
    huntTarget: null as THREE.Vector3 | null,
    pounceTimer: 0,
    fleeTarget: null as THREE.Vector3 | null,
    headTrackTarget: null as THREE.Vector3 | null,
    jumpStart: null as THREE.Vector3 | null,
    jumpEnd: null as THREE.Vector3 | null,
    jumpProgress: 0,
    stretchProgress: 0,
    batProgress: 0,
    batDirection: new THREE.Vector3()
  });

  // Randomize cat appearance based on seed
  const catAppearance = useMemo(() => {
    const rng = (s: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return { val: s / 0x7fffffff, next: s }; };
    let s = seed + 54321;
    const r1 = rng(s); s = r1.next;
    const r2 = rng(s);
    const variant = CAT_VARIANTS[Math.floor(r1.val * CAT_VARIANTS.length)];
    const scale = (0.8 + r2.val * 0.5) * 1.69; // Size varies from 1.35 to 2.2 (69% bigger)
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

    // Collision detection helper
    const isPositionBlocked = (pos: THREE.Vector3): boolean => {
      // Check fountain collision (center of plaza, outer basin radius ~3.8 + cat radius)
      const fountainDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (fountainDist < 4.6) return true; // Fountain outer basin + collision buffer

      // Check player collision
      if (playerPosition) {
        const distToPlayer = pos.distanceTo(playerPosition);
        if (distToPlayer < CAT_COLLISION_RADIUS + 0.5) return true;
      }

      // Check NPC collisions
      if (npcPositions) {
        for (const npcPos of npcPositions) {
          const distToNPC = pos.distanceTo(npcPos);
          if (distToNPC < CAT_COLLISION_RADIUS + 0.5) return true;
        }
      }

      return false;
    };

    // Check for nearby NPCs/player to flee from (highest priority, even interrupts hunting)
    let shouldFlee = false;
    let nearestThreat: THREE.Vector3 | null = null;
    let nearestThreatDist = Infinity;

    // Check sprinting player first (more scary)
    if (playerPosition && isSprinting) {
      const distToPlayer = current.distanceTo(playerPosition);
      if (distToPlayer < CAT_SPRINT_STARTLE_RANGE) {
        shouldFlee = true;
        nearestThreat = playerPosition.clone();
        nearestThreatDist = distToPlayer;
      }
    }

    // Check regular NPCs (including non-sprinting player)
    if (npcPositions && npcPositions.length > 0) {
      for (const npcPos of npcPositions) {
        const dist = current.distanceTo(npcPos);
        if (dist < CAT_FLEE_RANGE && dist < nearestThreatDist) {
          shouldFlee = true;
          nearestThreat = npcPos.clone();
          nearestThreatDist = dist;
        }
      }
    }

    if (shouldFlee && nearestThreat) {
      // Find farthest waypoint from threat
      let farthestWaypoint: THREE.Vector3 | null = null;
      let maxDist = 0;
      for (const wp of waypoints) {
        const wpVec = new THREE.Vector3(...wp);
        const distFromThreat = wpVec.distanceTo(nearestThreat);
        if (distFromThreat > maxDist) {
          maxDist = distFromThreat;
          farthestWaypoint = wpVec;
        }
      }

      if (farthestWaypoint && state.current.mode !== 'flee') {
        state.current.mode = 'flee';
        state.current.fleeTarget = farthestWaypoint;
        state.current.timer = 3; // Flee for at least 3 seconds
      }
    } else if (state.current.mode === 'flee' && state.current.timer <= 0) {
      // Safe now, go back to normal behavior
      state.current.mode = 'idle';
      state.current.fleeTarget = null;
      state.current.timer = 2 + Math.random() * 3;
    }

    // Check for nearby rats to hunt (unless sleeping, fleeing, or already pouncing)
    if (ratPositions && ratPositions.length > 0 && state.current.mode !== 'sleep' && state.current.mode !== 'pounce' && state.current.mode !== 'flee') {
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

    // Check for nearby ball to bat (playful behavior, not when fleeing, sleeping, or already batting)
    if (ballPhysics && state.current.mode !== 'flee' && state.current.mode !== 'sleep' && state.current.mode !== 'bat' && state.current.mode !== 'pounce') {
      const ball = ballPhysics.current;
      const distToBall = current.distanceTo(ball.position);
      const timeSinceLastBat = state.current.breathCycle - ball.lastBatTime;

      // Cat notices ball within 5 units and hasn't batted recently
      if (distToBall < 5.0 && timeSinceLastBat > 8.0) {
        // 30% chance to bat when nearby (cats are selective)
        if (Math.random() < 0.3) {
          state.current.mode = 'bat';
          state.current.batProgress = 0;
          state.current.batDirection = ball.position.clone().sub(current).normalize();
          ball.lastBatTime = state.current.breathCycle;
        }
      }
    }

    // Breathing animation (subtle body scale pulse)
    const breathScale = 1 + Math.sin(state.current.breathCycle * 2) * 0.015;
    bodyRef.current.scale.setScalar(breathScale);

    // Ear twitches (occasional, more frequent when hunting or tracking)
    const isTracking = state.current.headTrackTarget !== null;
    const earTwitchFreq = state.current.mode === 'hunt' ? 4 : (isTracking ? 5 : 8);
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const twitch = Math.sin(state.current.breathCycle * earTwitchFreq + i * Math.PI) > 0.9 ? 0.15 : 0;
        ear.rotation.z = (i === 0 ? 0.2 : -0.2) + twitch;
      }
    });

    // Tail wave animation - faster when hunting, rigid when fleeing
    const tailSpeed = state.current.mode === 'hunt' ? 6 : (state.current.mode === 'flee' ? 8 : 3);
    const tailIntensity = state.current.mode === 'flee' ? 0.15 : (state.current.mode === 'hunt' ? 0.4 : (state.current.mode === 'walk' ? 0.25 : 0.12));
    tailSegments.current.forEach((seg, i) => {
      if (seg) {
        const phase = state.current.breathCycle * tailSpeed - i * 0.4;
        // When fleeing, tail is more rigid/straight (puffed up effect)
        if (state.current.mode === 'flee') {
          seg.rotation.z = 0.1 + Math.sin(phase) * tailIntensity;
          seg.rotation.y = 0;
        } else {
          seg.rotation.z = Math.sin(phase) * tailIntensity;
          seg.rotation.y = Math.cos(phase * 0.7) * tailIntensity * 0.4;
        }
      }
    });

    // Bat mode - playfully swat the ball
    if (state.current.mode === 'bat' && ballPhysics) {
      state.current.batProgress += delta * 3; // Quick bat motion

      if (state.current.batProgress >= 1) {
        // Bat complete, return to idle
        state.current.mode = 'idle';
        state.current.batProgress = 0;
        state.current.timer = 1 + Math.random() * 2;
        return;
      }

      const ball = ballPhysics.current;
      const t = state.current.batProgress;

      // Phase 1 (0-0.3): Crouch and aim
      // Phase 2 (0.3-0.6): Quick swipe
      // Phase 3 (0.6-1.0): Follow through
      const phase = t < 0.3 ? 'aim' : (t < 0.6 ? 'swipe' : 'follow');

      if (phase === 'aim') {
        // Look at ball and crouch
        groupRef.current.lookAt(new THREE.Vector3(ball.position.x, current.y, ball.position.z));

        if (headRef.current) {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.10; // Lower head
        }

        legRefs.current.forEach((leg, i) => {
          if (leg?.upper && leg?.lower) {
            const isFront = i < 2;
            if (isFront) {
              // Front paws ready
              leg.upper.rotation.z = 0.3;
              leg.lower.rotation.z = 0.1;
            } else {
              // Haunches crouched
              leg.upper.rotation.z = 0.8;
              leg.lower.rotation.z = -1.0;
            }
          }
        });
      } else if (phase === 'swipe') {
        // Quick swipe motion - apply force to ball at peak
        const swipeT = (t - 0.3) / 0.3;

        if (headRef.current) {
          headRef.current.position.y = 0.12;
        }

        // Front left paw swipes
        if (legRefs.current[0]?.upper && legRefs.current[0]?.lower) {
          legRefs.current[0].upper.rotation.z = -0.4 - swipeT * 0.6;
          legRefs.current[0].lower.rotation.z = 0.2 + swipeT * 0.3;
        }

        // Apply force to ball at swipe peak (t ~ 0.45)
        if (t > 0.4 && t < 0.5) {
          const distToBall = current.distanceTo(ball.position);
          if (distToBall < 1.2) {
            // Hit! Apply force away from cat
            const forceDir = state.current.batDirection.clone();
            const forceMag = 4.0 + Math.random() * 2.0;
            ball.velocity.set(
              forceDir.x * forceMag,
              1.5 + Math.random() * 1.0, // Pop up
              forceDir.z * forceMag
            );
          }
        }
      } else {
        // Follow through - watch ball
        if (headRef.current) {
          const dir = ball.position.clone().sub(current);
          dir.y = 0;
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;
          headRef.current.rotation.y = targetHeadAngle;
          headRef.current.position.y = 0.14; // Head up watching
        }

        // Return legs to normal
        legRefs.current.forEach((leg, i) => {
          if (leg?.upper && leg?.lower) {
            const isFront = i < 2;
            leg.upper.rotation.z = isFront ? 0.1 : 0.6;
            leg.lower.rotation.z = isFront ? 0 : -0.8;
          }
        });
      }

      // Tail swishing excitedly during bat
      tailSegments.current.forEach((seg, i) => {
        if (seg) {
          const swishSpeed = 10;
          const phase = state.current.breathCycle * swishSpeed - i * 0.3;
          seg.rotation.z = Math.sin(phase) * 0.5;
          seg.rotation.y = Math.cos(phase * 0.8) * 0.3;
        }
      });

      return;
    }

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
      // But still tracks nearby movement (like a real cat)
      let trackTarget: THREE.Vector3 | null = null;
      const SLEEP_TRACK_RANGE = 4.0; // Shorter range when sleeping

      // Only track rats when sleeping (more interesting prey)
      if (ratPositions && ratPositions.length > 0) {
        for (const ratPos of ratPositions) {
          const dist = current.distanceTo(ratPos);
          if (dist < SLEEP_TRACK_RANGE) {
            trackTarget = ratPos;
            break;
          }
        }
      }

      if (headRef.current) {
        if (trackTarget) {
          // Calculate head rotation to look at rat
          const dir = trackTarget.clone().sub(current);
          dir.y = 0;
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;

          // Very slow tracking when sleeping
          headRef.current.rotation.y = THREE.MathUtils.lerp(
            headRef.current.rotation.y,
            targetHeadAngle,
            0.02
          );
          state.current.headTrackTarget = trackTarget;
        } else {
          // Sleeping position, head tucked
          headRef.current.rotation.y = -0.3;
          state.current.headTrackTarget = null;
        }
        headRef.current.position.y = 0.08;
      }
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 0.8;
          leg.lower.rotation.z = -1.2;
        }
      });

      if (state.current.timer <= 0) {
        // Wake up with a stretch
        state.current.mode = 'stretch';
        state.current.stretchProgress = 0;
        state.current.timer = 1.2; // Stretch duration
      }
      return;
    }

    if (state.current.mode === 'stretch') {
      state.current.stretchProgress += delta;

      if (state.current.stretchProgress >= 1.2) {
        // Stretch complete, decide next action
        state.current.mode = Math.random() > 0.3 ? 'walk' : 'idle';
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 6 + Math.random() * 6;
        state.current.stretchProgress = 0;
        return;
      }

      const t = state.current.stretchProgress;
      const stretchPhase = t < 0.4 ? 'extend' : (t < 0.8 ? 'arch' : 'release');

      if (headRef.current) {
        if (stretchPhase === 'extend') {
          // Head down, extending forward
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.06;
        } else if (stretchPhase === 'arch') {
          // Head up, back arched
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.15;
        } else {
          // Release back to normal
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.12;
        }
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;

          if (stretchPhase === 'extend') {
            // Front legs extended forward, back legs crouched
            if (isFront) {
              leg.upper.rotation.z = -0.4;
              leg.lower.rotation.z = 0.2;
            } else {
              leg.upper.rotation.z = 0.8;
              leg.lower.rotation.z = -1.2;
            }
          } else if (stretchPhase === 'arch') {
            // All legs extended, back arched
            if (isFront) {
              leg.upper.rotation.z = -0.2;
              leg.lower.rotation.z = 0.1;
            } else {
              leg.upper.rotation.z = 0.2;
              leg.lower.rotation.z = -0.3;
            }
          } else {
            // Release to standing
            leg.upper.rotation.z = isFront ? 0.1 : 0.6;
            leg.lower.rotation.z = isFront ? 0 : -0.8;
          }
        }
      });

      // Tail raised during stretch
      tailSegments.current.forEach((seg, i) => {
        if (seg) {
          if (stretchPhase === 'arch') {
            seg.rotation.z = 0.3 - i * 0.05;
            seg.rotation.y = 0;
          }
        }
      });

      return;
    }

    if (state.current.mode === 'idle') {
      // Head tracking: Look at nearby rats or NPCs when idle
      let trackTarget: THREE.Vector3 | null = null;
      const TRACK_RANGE = 6.0;

      // Prefer watching rats over NPCs
      if (ratPositions && ratPositions.length > 0) {
        for (const ratPos of ratPositions) {
          const dist = current.distanceTo(ratPos);
          if (dist < TRACK_RANGE) {
            trackTarget = ratPos;
            break;
          }
        }
      }

      // If no rats nearby, watch NPCs
      if (!trackTarget && npcPositions && npcPositions.length > 0) {
        for (const npcPos of npcPositions) {
          const dist = current.distanceTo(npcPos);
          if (dist < TRACK_RANGE) {
            trackTarget = npcPos;
            break;
          }
        }
      }

      if (headRef.current) {
        if (trackTarget) {
          // Calculate head rotation to look at target
          const dir = trackTarget.clone().sub(current);
          dir.y = 0; // Keep head level
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;

          // Smoothly rotate head
          headRef.current.rotation.y = THREE.MathUtils.lerp(
            headRef.current.rotation.y,
            targetHeadAngle,
            0.05
          );

          // Store track target for ear twitching
          state.current.headTrackTarget = trackTarget;
        } else {
          // No target, gentle idle head movement
          headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.5) * 0.2;
          state.current.headTrackTarget = null;
        }
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

    // Flee mode - run away from NPCs/player
    if (state.current.mode === 'flee' && state.current.fleeTarget) {
      const target = state.current.fleeTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.5) {
        // Reached safe spot, idle briefly
        state.current.mode = 'idle';
        state.current.fleeTarget = null;
        state.current.timer = 3 + Math.random() * 4;
        return;
      }

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_FLEE_SPEED));

      // Check for collision and try alternate angles if blocked
      if (isPositionBlocked(nextPos)) {
        let foundPath = false;
        const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * CAT_FLEE_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            foundPath = true;
            break;
          }
        }
        if (!foundPath) {
          // Completely stuck, just stop
          state.current.mode = 'idle';
          state.current.timer = 1;
          return;
        }
      } else {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));

      // Very fast walk cycle when fleeing
      state.current.walkCycle += delta * 18;

      if (headRef.current) {
        headRef.current.rotation.y = 0;
        headRef.current.position.y = 0.11; // Slightly lowered, focused on escape
      }

      // Ears flattened back when fleeing
      earRefs.current.forEach((ear, i) => {
        if (ear) {
          ear.rotation.z = (i === 0 ? -0.4 : 0.4); // Flattened backwards
          ear.rotation.x = -0.3;
        }
      });

      // Very fast leg movement
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.6;
          leg.lower.rotation.z = Math.sin(cycle - 0.5) * 0.5 - 0.2;
        }
      });
      return;
    }

    // Hunt mode - chase the nearest rat
    if (state.current.mode === 'hunt' && state.current.huntTarget) {
      const target = state.current.huntTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_HUNT_SPEED));

      // Check for collision during hunting
      if (isPositionBlocked(nextPos)) {
        // Try to go around obstacle
        let foundPath = false;
        const angles = [Math.PI / 4, -Math.PI / 4];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * CAT_HUNT_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            foundPath = true;
            break;
          }
        }
        if (!foundPath) {
          // Give up hunt if blocked
          state.current.mode = 'idle';
          state.current.huntTarget = null;
          state.current.timer = 2;
          return;
        }
      } else {
        current.copy(nextPos);
      }

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

    // Jump mode - arc over to elevated waypoints
    if (state.current.mode === 'jump' && state.current.jumpStart && state.current.jumpEnd) {
      state.current.jumpProgress += delta * 2.5; // Jump speed

      if (state.current.jumpProgress >= 1) {
        // Jump complete, land and idle
        current.copy(state.current.jumpEnd);
        state.current.mode = 'idle';
        state.current.jumpStart = null;
        state.current.jumpEnd = null;
        state.current.jumpProgress = 0;
        state.current.timer = 2 + Math.random() * 3;
        return;
      }

      const t = state.current.jumpProgress;
      const start = state.current.jumpStart;
      const end = state.current.jumpEnd;

      // Horizontal interpolation
      current.x = THREE.MathUtils.lerp(start.x, end.x, t);
      current.z = THREE.MathUtils.lerp(start.z, end.z, t);

      // Parabolic arc for jump (peaks at t=0.5)
      const arcHeight = 0.6; // Jump arc height
      const baseY = THREE.MathUtils.lerp(start.y, end.y, t);
      current.y = baseY + arcHeight * 4 * t * (1 - t);

      // Look toward landing spot
      groupRef.current.lookAt(new THREE.Vector3(end.x, current.y, end.z));

      // Jump animation
      const jumpPhase = t < 0.3 ? 'crouch' : (t < 0.7 ? 'spring' : 'land');

      if (headRef.current) {
        headRef.current.rotation.y = 0;
        headRef.current.position.y = jumpPhase === 'crouch' ? 0.08 : 0.14;
      }

      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          if (jumpPhase === 'crouch') {
            // Crouch before jump
            leg.upper.rotation.z = 0.9;
            leg.lower.rotation.z = -1.4;
          } else if (jumpPhase === 'spring') {
            // Extend legs during jump
            leg.upper.rotation.z = -0.2;
            leg.lower.rotation.z = -0.1;
          } else {
            // Prepare for landing
            leg.upper.rotation.z = 0.5;
            leg.lower.rotation.z = -0.6;
          }
        }
      });
      return;
    }

    // Walking mode
    const target = new THREE.Vector3(...waypoints[state.current.targetIndex]);
    const dir = target.clone().sub(current);
    const heightDiff = Math.abs(target.y - current.y);

    // Check if we need to jump (height difference > 0.15 units)
    if (heightDiff > 0.15 && state.current.mode === 'walk') {
      const dist2D = Math.sqrt(dir.x * dir.x + dir.z * dir.z);

      // Only jump if we're close enough horizontally
      if (dist2D < 2.0) {
        state.current.mode = 'jump';
        state.current.jumpStart = current.clone();
        state.current.jumpEnd = target.clone();
        state.current.jumpProgress = 0;
        return;
      }
    }

    const dist = dir.length();

    if (dist < 0.1) {
      state.current.mode = Math.random() > 0.5 ? 'sleep' : 'idle';
      state.current.timer = 8 + Math.random() * 10;
      return;
    }

    dir.normalize();
    const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_WALK_SPEED));

    // Check for collision during walking
    if (isPositionBlocked(nextPos)) {
      // Try to go around obstacle
      let foundPath = false;
      const angles = [Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3];
      for (const angleOffset of angles) {
        const altDir = dir.clone();
        const cos = Math.cos(angleOffset);
        const sin = Math.sin(angleOffset);
        const newX = altDir.x * cos - altDir.z * sin;
        const newZ = altDir.x * sin + altDir.z * cos;
        altDir.set(newX, 0, newZ);
        const altPos = current.clone().add(altDir.multiplyScalar(delta * CAT_WALK_SPEED));
        if (!isPositionBlocked(altPos)) {
          current.copy(altPos);
          foundPath = true;
          break;
        }
      }
      if (!foundPath) {
        // Pick a new waypoint if completely blocked
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.mode = 'idle';
        state.current.timer = 1;
        return;
      }
    } else {
      current.copy(nextPos);
    }

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

// Dog color variants
const DOG_VARIANTS = [
  { name: 'Brown', primary: '#6b4423', secondary: '#4a3016', eyeColor: '#2a1a0a' },
  { name: 'Gray', primary: '#6a6a6a', secondary: '#4a4a4a', eyeColor: '#2a2a2a' },
  { name: 'Black', primary: '#2a2a2a', secondary: '#1a1a1a', eyeColor: '#0a0a0a' },
  { name: 'White', primary: '#e8e8e8', secondary: '#d0d0d0', eyeColor: '#2a2a2a' },
  { name: 'Mottled', primary: '#8b6843', secondary: '#d4a574', eyeColor: '#3a2814' },
];

interface StrayDogProps {
  seed?: number;
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
  spawnPosition?: [number, number, number];
}

export const StrayDog: React.FC<StrayDogProps> = ({ seed = 0, npcPositions, playerPosition, spawnPosition = [10, 0, 10] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<THREE.Mesh[]>([]);
  const legRefs = useRef<{ upper: THREE.Group; lower: THREE.Group }[]>([]);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  const state = useRef({
    mode: 'idle' as 'idle' | 'sniff' | 'walk' | 'run' | 'follow' | 'rest' | 'bark' | 'scratch',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0,
    followTarget: null as THREE.Vector3 | null,
    wanderTarget: null as THREE.Vector3 | null,
    barkTimer: 0,
    scratchProgress: 0,
    tailWagSpeed: 1,
    sniffProgress: 0
  });

  // Randomize dog appearance
  const dogAppearance = useMemo(() => {
    const rng = (s: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return { val: s / 0x7fffffff, next: s }; };
    let s = seed + 12345;
    const r1 = rng(s); s = r1.next;
    const r2 = rng(s); s = r2.next;
    const r3 = rng(s);
    const variant = DOG_VARIANTS[Math.floor(r1.val * DOG_VARIANTS.length)];
    const scale = 1.2 + r2.val * 2.0; // Size varies from 1.2 to 3.2 (small to very large dog)
    const tailLength = 0.08 + r3.val * 0.12; // Tail length varies from 0.08 to 0.20
    return { variant, scale, tailLength };
  }, [seed]);

  const furMaterial = useMemo(() => (
    <meshStandardMaterial color={dogAppearance.variant.primary} roughness={0.95} />
  ), [dogAppearance]);
  const darkFurMaterial = useMemo(() => (
    <meshStandardMaterial color={dogAppearance.variant.secondary} roughness={0.95} />
  ), [dogAppearance]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;
    state.current.breathCycle += delta;

    // Collision detection helper
    const isPositionBlocked = (pos: THREE.Vector3): boolean => {
      // Check player collision
      if (playerPosition) {
        const distToPlayer = pos.distanceTo(playerPosition);
        if (distToPlayer < DOG_COLLISION_RADIUS + 0.5) return true;
      }

      // Check NPC collisions
      if (npcPositions) {
        for (const npcPos of npcPositions) {
          const distToNPC = pos.distanceTo(npcPos);
          if (distToNPC < DOG_COLLISION_RADIUS + 0.5) return true;
        }
      }

      return false;
    };

    // AI: Look for NPCs to follow (dogs are social and curious)
    if (state.current.mode !== 'rest' && state.current.mode !== 'bark' && state.current.mode !== 'scratch') {
      if (npcPositions && npcPositions.length > 0) {
        let nearestNPC: THREE.Vector3 | null = null;
        let nearestDist = DOG_FOLLOW_DISTANCE;

        for (const npcPos of npcPositions) {
          const dist = current.distanceTo(npcPos);
          if (dist < DOG_FOLLOW_DISTANCE && dist > DOG_MIN_FOLLOW_DISTANCE) {
            if (!nearestNPC || dist < nearestDist) {
              nearestNPC = npcPos.clone();
              nearestDist = dist;
            }
          }
        }

        if (nearestNPC && Math.random() < 0.4) {
          state.current.followTarget = nearestNPC;
          state.current.mode = 'follow';
        } else if (state.current.mode === 'follow' && !nearestNPC) {
          state.current.mode = 'idle';
          state.current.followTarget = null;
          state.current.timer = 2;
        }
      }
    }

    // Breathing animation
    const breathScale = 1 + Math.sin(state.current.breathCycle * 1.5) * 0.02;
    bodyRef.current.scale.setScalar(breathScale);

    // Tail wagging animation (wags more when following or happy)
    const wagIntensity = state.current.mode === 'follow' ? 0.6 : (state.current.mode === 'walk' ? 0.3 : 0.15);
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(state.current.breathCycle * state.current.tailWagSpeed * 4) * wagIntensity;
    }

    // Ear movements (perk up when alert)
    const earAlert = state.current.mode === 'follow' || state.current.mode === 'bark';
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const baseAngle = earAlert ? -0.1 : 0.2;
        const flutter = Math.sin(state.current.breathCycle * 3 + i * Math.PI) > 0.85 ? 0.1 : 0;
        ear.rotation.x = baseAngle + flutter;
      }
    });

    // Mode-specific behaviors
    if (state.current.mode === 'rest') {
      // Lying down
      if (headRef.current) {
        headRef.current.position.y = 0.08;
        headRef.current.rotation.x = 0.3;
      }

      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 1.2;
          leg.lower.rotation.z = -1.5;
        }
      });

      if (state.current.timer <= 0) {
        state.current.mode = Math.random() > 0.5 ? 'sniff' : 'walk';
        state.current.timer = 3 + Math.random() * 4;
      }
      return;
    }

    if (state.current.mode === 'bark') {
      state.current.barkTimer -= delta;

      if (headRef.current) {
        const barkPhase = Math.sin(state.current.barkTimer * 20);
        headRef.current.rotation.x = -0.3 + barkPhase * 0.2;
        headRef.current.position.y = 0.16;
      }

      if (state.current.barkTimer <= 0) {
        state.current.mode = 'idle';
        state.current.timer = 2;
      }
      return;
    }

    if (state.current.mode === 'scratch') {
      state.current.scratchProgress += delta * 4;

      if (state.current.scratchProgress >= 1) {
        state.current.mode = 'idle';
        state.current.scratchProgress = 0;
        state.current.timer = 2;
        return;
      }

      // Sitting, scratching with back leg
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(state.current.scratchProgress * 15) * 0.15;
        headRef.current.position.y = 0.14;
      }

      // Back right leg scratching motion
      if (legRefs.current[3]?.upper && legRefs.current[3]?.lower) {
        const scratchPhase = Math.sin(state.current.scratchProgress * 15);
        legRefs.current[3].upper.rotation.z = 0.8 + scratchPhase * 0.4;
        legRefs.current[3].lower.rotation.z = -1.0 + scratchPhase * 0.6;
      }

      return;
    }

    if (state.current.mode === 'sniff') {
      state.current.sniffProgress += delta;

      if (headRef.current) {
        headRef.current.position.y = 0.04; // Nose to ground
        headRef.current.rotation.x = 0.6;
        headRef.current.rotation.y = Math.sin(state.current.sniffProgress * 2) * 0.3;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.2 : 0.7;
          leg.lower.rotation.z = isFront ? -0.1 : -1.0;
        }
      });

      if (state.current.sniffProgress > 3) {
        state.current.mode = 'walk';
        state.current.sniffProgress = 0;
        state.current.timer = 4;
      }
      return;
    }

    if (state.current.mode === 'follow' && state.current.followTarget) {
      const target = state.current.followTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      // Maintain distance
      if (dist < DOG_MIN_FOLLOW_DISTANCE) {
        state.current.mode = 'idle';
        state.current.followTarget = null;
        state.current.timer = 1;
        return;
      }

      dir.normalize();
      const speed = dist > 10 ? DOG_RUN_SPEED : DOG_WALK_SPEED;
      const nextPos = current.clone().add(dir.multiplyScalar(delta * speed));

      if (!isPositionBlocked(nextPos)) {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));
      state.current.walkCycle += delta * (speed > 1 ? 12 : 8);

      // Walking/running animation
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.3) * 0.08;
        headRef.current.position.y = 0.16 + Math.sin(state.current.walkCycle * 2) * 0.02;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.5;
          leg.lower.rotation.z = Math.sin(cycle - 0.4) * 0.4 - 0.3;
        }
      });

      return;
    }

    if (state.current.mode === 'idle') {
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.4) * 0.3;
        headRef.current.position.y = 0.16;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.1 : 0.7;
          leg.lower.rotation.z = isFront ? -0.1 : -1.0;
        }
      });

      if (state.current.timer <= 0) {
        const rand = Math.random();
        if (rand > 0.7) {
          state.current.mode = 'sniff';
          state.current.sniffProgress = 0;
        } else if (rand > 0.5) {
          state.current.mode = 'rest';
          state.current.timer = 8 + Math.random() * 10;
        } else if (rand > 0.4) {
          state.current.mode = 'bark';
          state.current.barkTimer = 1 + Math.random() * 1;
        } else if (rand > 0.3) {
          state.current.mode = 'scratch';
          state.current.scratchProgress = 0;
        } else {
          state.current.mode = 'walk';
          state.current.timer = 5 + Math.random() * 5;
          // Pick random wander target
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 15;
          state.current.wanderTarget = new THREE.Vector3(
            current.x + Math.cos(angle) * dist,
            0,
            current.z + Math.sin(angle) * dist
          );
        }
      }
      return;
    }

    // Walking mode
    if (state.current.mode === 'walk') {
      if (!state.current.wanderTarget) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 15;
        state.current.wanderTarget = new THREE.Vector3(
          current.x + Math.cos(angle) * dist,
          0,
          current.z + Math.sin(angle) * dist
        );
      }

      const target = state.current.wanderTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 1.0) {
        state.current.mode = 'idle';
        state.current.wanderTarget = null;
        state.current.timer = 2 + Math.random() * 3;
        return;
      }

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * DOG_WALK_SPEED));

      if (!isPositionBlocked(nextPos)) {
        current.copy(nextPos);
      } else {
        // Try alternate angles
        const angles = [Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * DOG_WALK_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            break;
          }
        }
      }

      groupRef.current.lookAt(target);
      state.current.walkCycle += delta * 8;

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.5) * 0.12;
        headRef.current.position.y = 0.16 + Math.sin(state.current.walkCycle * 2) * 0.02;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.5;
          leg.lower.rotation.z = Math.sin(cycle - 0.4) * 0.4 - 0.3;
        }
      });
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={spawnPosition}
      scale={dogAppearance.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={`${dogAppearance.variant.name} Stray Dog`}
          lines={['Wandering the streets', 'Loyal but independent', 'Part of the city']}
          offset={[0, 0.6 / dogAppearance.scale, 0]}
        />
      )}

      {/* Body group */}
      <group ref={bodyRef} position={[0, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Main body - elongated for dog shape */}
        <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.08, 0.28, 6, 10]} />
          {furMaterial}
        </mesh>

        {/* Rear haunch */}
        <mesh position={[-0.12, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.09, 10, 8]} />
          {furMaterial}
        </mesh>

        {/* Chest */}
        <mesh position={[0.14, 0.19, 0]} castShadow>
          <sphereGeometry args={[0.075, 10, 8]} />
          {furMaterial}
        </mesh>

        {/* Head group */}
        <group ref={headRef} position={[0.22, 0.18, 0]}>
          {/* Main head */}
          <mesh castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            {furMaterial}
          </mesh>

          {/* Snout - elongated for dog */}
          <mesh position={[0.07, -0.01, 0]} castShadow>
            <boxGeometry args={[0.08, 0.05, 0.05]} />
            {darkFurMaterial}
          </mesh>

          {/* Nose */}
          <mesh position={[0.11, -0.01, 0]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
          </mesh>

          {/* Floppy ears */}
          <mesh
            ref={el => { if (el) earRefs.current[0] = el; }}
            position={[-0.02, 0.05, 0.05]}
            rotation={[0.2, 0, 0.4]}
            castShadow
          >
            <boxGeometry args={[0.04, 0.08, 0.02]} />
            {darkFurMaterial}
          </mesh>
          <mesh
            ref={el => { if (el) earRefs.current[1] = el; }}
            position={[-0.02, 0.05, -0.05]}
            rotation={[-0.2, 0, -0.4]}
            castShadow
          >
            <boxGeometry args={[0.04, 0.08, 0.02]} />
            {darkFurMaterial}
          </mesh>

          {/* Eyes */}
          <mesh position={[0.04, 0.02, 0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={dogAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.04, 0.02, -0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={dogAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
        </group>

        {/* Legs - Front Left */}
        <group position={[0.1, 0.08, 0.055]} ref={el => { if (el && !legRefs.current[0]) legRefs.current[0] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[0]) legRefs.current[0].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            {/* Paw */}
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        {/* Legs - Front Right */}
        <group position={[0.1, 0.08, -0.055]} ref={el => { if (el && !legRefs.current[1]) legRefs.current[1] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[1]) legRefs.current[1].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        {/* Legs - Back Left */}
        <group position={[-0.08, 0.08, 0.055]} ref={el => { if (el && !legRefs.current[2]) legRefs.current[2] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[2]) legRefs.current[2].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.022, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        {/* Legs - Back Right */}
        <group position={[-0.08, 0.08, -0.055]} ref={el => { if (el && !legRefs.current[3]) legRefs.current[3] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[3]) legRefs.current[3].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.022, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        {/* Tail - curved upward with randomized length */}
        <group ref={tailRef} position={[-0.18, 0.2, 0]}>
          <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
            <capsuleGeometry args={[0.015, dogAppearance.tailLength, 4, 8]} />
            {furMaterial}
          </mesh>
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
      if (item.kind === 'crate') return <PushableCrate key={item.id} item={item} />;
      if (item.kind === 'amphora') return <PushableAmphora key={item.id} item={item} />;
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

  // Note: Climbables now generated at Environment level for correct world positioning

  const buildingMaterial = useMemo(() => {
    if (!(mainMaterial instanceof THREE.MeshStandardMaterial)) return mainMaterial;
    const mat = mainMaterial.clone();

    // PERFORMANCE: Vertex colors disabled (was causing severe FPS drop to 10 FPS)
    // mat.vertexColors = true;

    // Apply district-specific color variants or default
    let colorVariants = BUILDING_COLOR_VARIANTS[data.type];

    // Override with district-specific colors for Jewish and Christian quarters
    if (data.district === 'JEWISH_QUARTER' && JEWISH_QUARTER_COLORS[data.type]) {
      colorVariants = JEWISH_QUARTER_COLORS[data.type];
      mat.roughness = 0.95; // Darker stone is rougher
    } else if (data.district === 'CHRISTIAN_QUARTER' && CHRISTIAN_QUARTER_COLORS[data.type]) {
      colorVariants = CHRISTIAN_QUARTER_COLORS[data.type];
    }

    // Apply color variant - each building gets one of the color options
    if (colorVariants && colorVariants.length > 0) {
      const colorIndex = Math.floor(seededRandom(localSeed + 77) * colorVariants.length);
      mat.color.set(colorVariants[colorIndex]);
    }

    // Apply texture variation for commercial/civic buildings
    let needsShaderUpdate = false;
    if ((data.type === BuildingType.COMMERCIAL || data.type === BuildingType.CIVIC) && noiseTextures && noiseTextures.length > 0) {
      // Tie texture intensity to color variant - pale colors get subtle texture, darker get more visible
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

    // GRAPHICS: Sun-baked emissive glow during peak daylight (10am-3pm)
    // Applies to ALL buildings for warm sun-radiating effect
    // Use torchIntensity as proxy for time-of-day (low = day, high = night)
    const isDaytime = torchIntensity < 0.8; // Day when torch intensity is low
    const isNoonish = torchIntensity < 0.4; // Peak sun when torches are minimal

    if (isDaytime && isNoonish) {
      // Sun-baked warm glow (subtle golden emissive)
      const emissiveIntensity = (0.8 - torchIntensity) / 0.8 * 0.12; // Inverse of torch intensity
      buildingMaterial.emissive.setRGB(0.92, 0.82, 0.62); // Warm sun-baked stone
      buildingMaterial.emissiveIntensity = emissiveIntensity;
    } else {
      // Fade out emissive outside peak sun hours
      buildingMaterial.emissiveIntensity = THREE.MathUtils.lerp(buildingMaterial.emissiveIntensity, 0, 0.1);
    }
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
  // PERFORMANCE: Torches disabled (user reported 10 FPS)
  const torchCount = 0;
  const torchOffsets: [number, number, number][] = [];
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
      <mesh
        castShadow
        receiveShadow
        userData={{ isBuildingWall: true, buildingId: data.id }}
      >
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

      {/* MEZUZAH - Jewish doorframe scripture cases (Jewish Quarter only) */}
      {data.district === 'JEWISH_QUARTER' && (
        <group position={doorPos} rotation={[0, doorRotation, 0]}>
          <mesh
            position={[1.2, 1.3, 0.05]}
            rotation={[0, 0, Math.PI / 12]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.25, 0.06]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
          </mesh>
          {/* Small decorative Hebrew letter shin (ש) on mezuzah */}
          <mesh
            position={[1.2, 1.3, 0.09]}
            rotation={[0, 0, Math.PI / 12]}
          >
            <boxGeometry args={[0.03, 0.06, 0.01]} />
            <meshStandardMaterial color="#d4c4b4" roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* PROFESSION SIGNAGE - Historically accurate merchant signs */}
      {data.type === BuildingType.COMMERCIAL && data.ownerProfession && (() => {
        const professionSign = getProfessionSign(data.ownerProfession);
        if (!professionSign) return null;

        const signScale = professionSign.scale;
        const signHeight = professionSign.heightOffset;
        const bracketLen = professionSign.bracketOffset;

        // Helper function to render different sign geometries
        const renderSignGeometry = () => {
          const mat = (
            <meshStandardMaterial
              color={professionSign.color}
              metalness={professionSign.metalness ?? 0}
              roughness={professionSign.roughness ?? 0.9}
              emissive={professionSign.emissive ?? 'black'}
              emissiveIntensity={professionSign.emissive ? (nightFactor * 0.4) : 0}
              side={THREE.DoubleSide}
            />
          );

          switch (professionSign.geometry) {
            case 'bowl':
              return (
                <mesh castShadow>
                  <sphereGeometry args={[0.18 * signScale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat}
                </mesh>
              );

            case 'vessel':
            case 'pitcher':
              return (
                <group>
                  {/* Main vessel body */}
                  <mesh position={[0, -0.05, 0]} castShadow>
                    <cylinderGeometry args={[0.12 * signScale, 0.15 * signScale, 0.3 * signScale, 12]} />
                    {mat}
                  </mesh>
                  {/* Neck */}
                  <mesh position={[0, 0.12, 0]} castShadow>
                    <cylinderGeometry args={[0.06 * signScale, 0.08 * signScale, 0.15 * signScale, 10]} />
                    {mat}
                  </mesh>
                  {/* Lip */}
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[0.08 * signScale, 0.06 * signScale, 0.04 * signScale, 10]} />
                    {mat}
                  </mesh>
                </group>
              );

            case 'horseshoe':
              return (
                <mesh rotation={[0, 0, 0]} castShadow>
                  <torusGeometry args={[0.15 * signScale, 0.04 * signScale, 8, 16, Math.PI]} />
                  {mat}
                </mesh>
              );

            case 'key':
              return (
                <group>
                  {/* Key shaft */}
                  <mesh position={[0, 0.15, 0]} castShadow>
                    <cylinderGeometry args={[0.025 * signScale, 0.025 * signScale, 0.4 * signScale, 8]} />
                    {mat}
                  </mesh>
                  {/* Key head (ring) */}
                  <mesh position={[0, -0.08, 0]} castShadow>
                    <torusGeometry args={[0.08 * signScale, 0.03 * signScale, 8, 12]} />
                    {mat}
                  </mesh>
                  {/* Key teeth */}
                  <mesh position={[0.03 * signScale, 0.33, 0]} castShadow>
                    <boxGeometry args={[0.06 * signScale, 0.08 * signScale, 0.03 * signScale]} />
                    {mat}
                  </mesh>
                </group>
              );

            case 'fabric':
              return (
                <group>
                  {/* Fabric banner */}
                  <mesh castShadow>
                    <boxGeometry args={[0.6 * signScale, 0.5 * signScale, 0.02]} />
                    {mat}
                  </mesh>
                  {/* Decorative fringe */}
                  {professionSign.secondaryColor && (
                    <mesh position={[0, -0.27 * signScale, 0.01]}>
                      <boxGeometry args={[0.6 * signScale, 0.04 * signScale, 0.01]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} side={THREE.DoubleSide} />
                    </mesh>
                  )}
                </group>
              );

            case 'mortar':
              return (
                <group>
                  {/* Mortar bowl */}
                  <mesh position={[0, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.12 * signScale, 0.08 * signScale, 0.15 * signScale, 12]} />
                    {mat}
                  </mesh>
                  {/* Pestle */}
                  <mesh position={[0.05 * signScale, 0.05, 0.05 * signScale]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                    <cylinderGeometry args={[0.025 * signScale, 0.035 * signScale, 0.25 * signScale, 8]} />
                    {mat}
                  </mesh>
                  {/* Green healing symbol for apothecary */}
                  {professionSign.secondaryColor && (
                    <mesh position={[0, 0, 0.13 * signScale]}>
                      <boxGeometry args={[0.08 * signScale, 0.15 * signScale, 0.02]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                    </mesh>
                  )}
                </group>
              );

            case 'bread':
              return (
                <group>
                  {/* Pretzel/bread shape */}
                  <mesh rotation={[0, 0, 0]} castShadow>
                    <torusGeometry args={[0.15 * signScale, 0.05 * signScale, 10, 16]} />
                    {mat}
                  </mesh>
                  {/* Cross piece for pretzel */}
                  <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                    <torusGeometry args={[0.12 * signScale, 0.045 * signScale, 10, 16, Math.PI / 2]} />
                    {mat}
                  </mesh>
                </group>
              );

            case 'rug':
              return (
                <group>
                  {/* Rug surface */}
                  <mesh castShadow>
                    <boxGeometry args={[0.5 * signScale, 0.6 * signScale, 0.03 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Pattern stripes */}
                  {professionSign.secondaryColor && (
                    <>
                      <mesh position={[0, 0.15 * signScale, 0.02 * signScale]}>
                        <boxGeometry args={[0.45 * signScale, 0.08 * signScale, 0.01]} />
                        <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} />
                      </mesh>
                      <mesh position={[0, -0.15 * signScale, 0.02 * signScale]}>
                        <boxGeometry args={[0.45 * signScale, 0.08 * signScale, 0.01]} />
                        <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} />
                      </mesh>
                    </>
                  )}
                </group>
              );

            case 'lamp':
              return (
                <group>
                  {/* Lantern frame */}
                  <mesh castShadow>
                    <cylinderGeometry args={[0.08 * signScale, 0.1 * signScale, 0.25 * signScale, 6]} />
                    {mat}
                  </mesh>
                  {/* Top cap */}
                  <mesh position={[0, 0.15 * signScale, 0]} castShadow>
                    <coneGeometry args={[0.09 * signScale, 0.1 * signScale, 6]} />
                    {mat}
                  </mesh>
                  {/* Glass panels (emissive) */}
                  <mesh>
                    <cylinderGeometry args={[0.075 * signScale, 0.095 * signScale, 0.22 * signScale, 6]} />
                    <meshStandardMaterial
                      color="#ffeed0"
                      transparent
                      opacity={0.3}
                      emissive={professionSign.emissive ?? '#ff9944'}
                      emissiveIntensity={nightFactor * 0.6}
                    />
                  </mesh>
                </group>
              );

            case 'censer':
              return (
                <group>
                  {/* Incense burner body */}
                  <mesh castShadow>
                    <sphereGeometry args={[0.1 * signScale, 10, 8]} />
                    {mat}
                  </mesh>
                  {/* Top with holes */}
                  <mesh position={[0, 0.08 * signScale, 0]} castShadow>
                    <cylinderGeometry args={[0.05 * signScale, 0.08 * signScale, 0.06 * signScale, 8]} />
                    {mat}
                  </mesh>
                  {/* Hanging chain segments */}
                  <mesh position={[0, 0.2 * signScale, 0]}>
                    <cylinderGeometry args={[0.01 * signScale, 0.01 * signScale, 0.2 * signScale, 6]} />
                    <meshStandardMaterial color="#5a5a5a" metalness={0.6} roughness={0.5} />
                  </mesh>
                </group>
              );

            case 'medallion':
              return (
                <group>
                  {/* Circular medallion base */}
                  <mesh castShadow>
                    <cylinderGeometry args={[0.2 * signScale, 0.2 * signScale, 0.05 * signScale, 16]} />
                    {mat}
                  </mesh>
                  {/* Carved detail ring */}
                  <mesh position={[0, 0, 0.03 * signScale]}>
                    <torusGeometry args={[0.15 * signScale, 0.02 * signScale, 8, 16]} />
                    <meshStandardMaterial
                      color={professionSign.secondaryColor ?? '#6a5a4a'}
                      metalness={professionSign.metalness ?? 0}
                      roughness={(professionSign.roughness ?? 0.9) + 0.1}
                    />
                  </mesh>
                </group>
              );

            case 'tools':
              return (
                <group>
                  {/* Crossed tools (saw and plane) */}
                  {/* Tool 1 - Saw */}
                  <mesh position={[-0.05 * signScale, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                    <boxGeometry args={[0.35 * signScale, 0.05 * signScale, 0.03 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Tool 2 - Plane/Chisel */}
                  <mesh position={[0.05 * signScale, 0, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                    <boxGeometry args={[0.35 * signScale, 0.04 * signScale, 0.03 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Metal blades */}
                  {professionSign.secondaryColor && (
                    <>
                      <mesh position={[-0.05 * signScale, 0.12 * signScale, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                        <boxGeometry args={[0.15 * signScale, 0.04 * signScale, 0.02 * signScale]} />
                        <meshStandardMaterial color={professionSign.secondaryColor} metalness={0.7} roughness={0.4} />
                      </mesh>
                      <mesh position={[0.05 * signScale, 0.12 * signScale, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                        <boxGeometry args={[0.15 * signScale, 0.03 * signScale, 0.02 * signScale]} />
                        <meshStandardMaterial color={professionSign.secondaryColor} metalness={0.7} roughness={0.4} />
                      </mesh>
                    </>
                  )}
                </group>
              );

            case 'amphora':
              return (
                <group>
                  {/* Main body */}
                  <mesh castShadow>
                    <cylinderGeometry args={[0.12 * signScale, 0.08 * signScale, 0.35 * signScale, 12]} />
                    {mat}
                  </mesh>
                  {/* Neck */}
                  <mesh position={[0, 0.22 * signScale, 0]} castShadow>
                    <cylinderGeometry args={[0.05 * signScale, 0.08 * signScale, 0.15 * signScale, 10]} />
                    {mat}
                  </mesh>
                  {/* Handles */}
                  <mesh position={[0.1 * signScale, 0.05 * signScale, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <torusGeometry args={[0.06 * signScale, 0.02 * signScale, 6, 8, Math.PI]} />
                    {mat}
                  </mesh>
                  <mesh position={[-0.1 * signScale, 0.05 * signScale, 0]} rotation={[Math.PI / 2, 0, Math.PI]} castShadow>
                    <torusGeometry args={[0.06 * signScale, 0.02 * signScale, 6, 8, Math.PI]} />
                    {mat}
                  </mesh>
                </group>
              );

            case 'shuttle':
              return (
                <group>
                  {/* Weaving shuttle body */}
                  <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
                    <boxGeometry args={[0.4 * signScale, 0.06 * signScale, 0.05 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Pointed ends */}
                  <mesh position={[0.18 * signScale, 0, 0]} rotation={[0, 0, Math.PI / 6 - Math.PI / 4]} castShadow>
                    <coneGeometry args={[0.03 * signScale, 0.08 * signScale, 6]} />
                    {mat}
                  </mesh>
                  {/* Colored thread */}
                  {professionSign.secondaryColor && (
                    <mesh rotation={[0, 0, Math.PI / 6]}>
                      <cylinderGeometry args={[0.025 * signScale, 0.025 * signScale, 0.2 * signScale, 8]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                    </mesh>
                  )}
                </group>
              );

            case 'bag':
              return (
                <group>
                  {/* Leather bag body */}
                  <mesh castShadow>
                    <boxGeometry args={[0.25 * signScale, 0.3 * signScale, 0.15 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Strap */}
                  <mesh position={[0, 0.2 * signScale, 0]} castShadow>
                    <cylinderGeometry args={[0.015 * signScale, 0.015 * signScale, 0.15 * signScale, 8]} />
                    {mat}
                  </mesh>
                </group>
              );

            case 'soap':
              return (
                <group>
                  {/* Stacked soap bars */}
                  <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[0.15 * signScale, 0.08 * signScale, 0.12 * signScale]} />
                    {mat}
                  </mesh>
                  <mesh position={[0.05 * signScale, 0.08 * signScale, 0]} castShadow>
                    <boxGeometry args={[0.14 * signScale, 0.08 * signScale, 0.11 * signScale]} />
                    {mat}
                  </mesh>
                  {/* Olive accent */}
                  {professionSign.secondaryColor && (
                    <mesh position={[0, 0.14 * signScale, 0.07 * signScale]}>
                      <sphereGeometry args={[0.02 * signScale, 8, 6]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                    </mesh>
                  )}
                </group>
              );

            default:
              return null;
          }
        };

        // Position sign relative to door
        return (
          <group position={doorPos} rotation={[0, doorRotation, 0]}>
            {/* Bracket for hanging signs */}
            {professionSign.type === 'hanging' && bracketLen > 0 && (
              <>
                {/* Horizontal bracket arm extending from wall */}
                <mesh position={[bracketLen / 2, signHeight, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.03, 0.03, bracketLen, 6]} />
                  <meshStandardMaterial color="#3a3430" roughness={0.9} />
                </mesh>
                {/* Vertical support */}
                <mesh position={[0, signHeight - 0.1, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
                  <meshStandardMaterial color="#3a3430" roughness={0.9} />
                </mesh>
                {/* Diagonal brace */}
                <mesh position={[bracketLen / 4, signHeight - 0.05, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <cylinderGeometry args={[0.02, 0.02, bracketLen * 0.6, 6]} />
                  <meshStandardMaterial color="#3a3430" roughness={0.9} />
                </mesh>
                {/* Sign hanging from bracket */}
                <group position={[bracketLen, signHeight - 0.25, 0]}>
                  {renderSignGeometry()}
                </group>
              </>
            )}

            {/* Mounted signs (above door) */}
            {professionSign.type === 'mounted' && (
              <>
                {/* Wooden shelf/mounting plate */}
                <mesh position={[0, signHeight - 0.1, 0.2]} castShadow>
                  <boxGeometry args={[0.5 * signScale, 0.05, 0.15]} />
                  <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
                </mesh>
                {/* Sign on shelf */}
                <group position={[0, signHeight + 0.05, 0.2]}>
                  {renderSignGeometry()}
                </group>
              </>
            )}

            {/* Banner signs (hanging from rod above door) */}
            {professionSign.type === 'banner' && (
              <>
                {/* Horizontal hanging rod */}
                <mesh position={[0, signHeight + 0.1, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 0.8 * signScale, 8]} />
                  <meshStandardMaterial color="#3a3430" roughness={0.9} />
                </mesh>
                {/* Fabric/rug hanging from rod */}
                <group position={[0, signHeight - 0.25, 0.15]}>
                  {renderSignGeometry()}
                </group>
              </>
            )}
          </group>
        );
      })()}

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

      {/* Climbable Accessories rendered at Environment level for correct world positioning */}
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
  const glowMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  const windowData = useMemo(() => {
    const data: Array<{ matrix: THREE.Matrix4; hasGlow: boolean; glowIntensity: number; colorIndex: number }> = [];
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
        // GRAPHICS: Randomized brightness - wide range from dim candles to bright lanterns
        // Range from 0.3 (very dim) to 2.3 (very bright) for realistic variation
        const glowIntensity = 0.3 + windowGlowRoll * 2.0;

        // Three color variations weighted by historical accuracy:
        // 60% dim candles (cheap), 30% medium lanterns, 10% bright lanterns (expensive)
        const colorRoll = seededRandom(localSeed + side + 200);
        const colorIndex = colorRoll < 0.60 ? 0 : colorRoll < 0.90 ? 1 : 2;

        data.push({
          matrix: tempObj.matrix.clone(),
          hasGlow,
          glowIntensity,
          colorIndex
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
      const glowColorIndices: number[] = [];
      const tempMatrix = new THREE.Matrix4();
      const tempPosition = new THREE.Vector3();
      const tempQuaternion = new THREE.Quaternion();
      const tempScale = new THREE.Vector3();
      const forwardOffset = new THREE.Vector3(0, 0, 0.06); // Offset forward in local space

      windowData.forEach((data) => {
        if (data.hasGlow) {
          // Decompose the original matrix
          data.matrix.decompose(tempPosition, tempQuaternion, tempScale);

          // Apply forward offset in local space (perpendicular to wall)
          const offsetWorld = forwardOffset.clone().applyQuaternion(tempQuaternion);
          tempPosition.add(offsetWorld);

          // Recompose matrix with offset position
          tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

          glowMeshRef.current!.setMatrixAt(glowIndex, tempMatrix);
          glowIntensities.push(data.glowIntensity);
          glowColorIndices.push(data.colorIndex);
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

        // GRAPHICS: Set per-instance color index as instance attribute
        const colorIndexArray = new Float32Array(glowColorIndices);
        glowMeshRef.current.geometry.setAttribute(
          'instanceColorIndex',
          new THREE.InstancedBufferAttribute(colorIndexArray, 1)
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

  // Create custom shader material with per-instance intensity and color variation
  const glowMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: '#2a1810', // Very dark warm brown - only emissive shows through
      emissive: '#a65a1f', // Deep warm amber base
      emissiveIntensity: 1.8,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Store ref for dynamic updates
    glowMaterialRef.current = material;

    // Modify shader to use per-instance glow intensity and color
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute float instanceGlowIntensity;
        attribute float instanceColorIndex;
        varying float vGlowIntensity;
        varying float vColorIndex;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vGlowIntensity = instanceGlowIntensity;
        vColorIndex = instanceColorIndex;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying float vGlowIntensity;
        varying float vColorIndex;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Warm candlelit/lantern colors - deep amber tones, not bright yellow
        vec3 color0 = vec3(0.65, 0.35, 0.12); // Deep warm orange (dim candles)
        vec3 color1 = vec3(0.78, 0.42, 0.16); // Rich amber (medium lanterns)
        vec3 color2 = vec3(0.85, 0.50, 0.20); // Warm bright amber (bright lanterns)

        // Select color based on index
        vec3 selectedColor = color0;
        if (vColorIndex > 1.5) {
          selectedColor = color2;
        } else if (vColorIndex > 0.5) {
          selectedColor = color1;
        }

        // Apply per-instance color and intensity variation
        totalEmissiveRadiance = selectedColor * vGlowIntensity;`
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
        <instancedMesh ref={glowMeshRef} args={[undefined, undefined, glowCount]} material={glowMaterial}>
          <boxGeometry args={[1.0, 1.5, 0.02]} />
        </instancedMesh>
      )}
    </>
  );
};

export const Buildings: React.FC<{
  mapX: number,
  mapY: number,
  sessionSeed?: number,
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void,
  nearBuildingId?: string | null,
  torchIntensity: number;
  nightFactor: number;
  heightmap?: TerrainHeightmap | null;
}> = ({ mapX, mapY, sessionSeed = 0, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor, heightmap }) => {
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
      // Warm natural linens (common)
      new THREE.MeshStandardMaterial({ color: '#f0e8d8', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // bright cream linen
      new THREE.MeshStandardMaterial({ color: '#ead9b7', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // warm flax
      new THREE.MeshStandardMaterial({ color: '#e8d5b0', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // pale wheat
      new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // natural linen
      // Warm tans
      new THREE.MeshStandardMaterial({ color: '#d4b890', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // warm tan
      new THREE.MeshStandardMaterial({ color: '#c8a878', roughness: 0.95, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // golden tan
      // Vibrant indigos
      new THREE.MeshStandardMaterial({ color: '#4a6b9a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // bright indigo
      new THREE.MeshStandardMaterial({ color: '#3a5a8a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // deep indigo
      // Warm earth tones
      new THREE.MeshStandardMaterial({ color: '#c09050', roughness: 0.92, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // golden ochre
      new THREE.MeshStandardMaterial({ color: '#b88848', roughness: 0.92, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // warm amber
      // Accent colors
      new THREE.MeshStandardMaterial({ color: '#c85a4a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // warm terracotta
      new THREE.MeshStandardMaterial({ color: '#b8654a', roughness: 0.9, side: THREE.DoubleSide, bumpMap: CACHED_LINEN_TEXTURE, bumpScale: 0.015 }), // burnt sienna
    ],
    awningStriped: [
      // White & indigo stripes (very common in Damascus)
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#5a7aaa', roughness: 0.9, side: THREE.DoubleSide }), // white & bright indigo
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#4a6a9a', roughness: 0.9, side: THREE.DoubleSide }), // white & deep indigo
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#6a8aba', roughness: 0.9, side: THREE.DoubleSide }), // white & light indigo
      // White & green stripes (Ottoman style)
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#5a8a6a', roughness: 0.9, side: THREE.DoubleSide }), // white & emerald green
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#6a9a7a', roughness: 0.9, side: THREE.DoubleSide }), // white & sage green
      // Warm linen & tan stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#e8d0a8', roughness: 0.95, side: THREE.DoubleSide }), // cream & tan stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#d8b888', roughness: 0.95, side: THREE.DoubleSide }), // linen & golden tan
      // Accent color stripes
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[1], color: '#d86850', roughness: 0.9, side: THREE.DoubleSide }), // white & warm red
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[2], color: '#c89850', roughness: 0.9, side: THREE.DoubleSide }), // white & golden ochre
      new THREE.MeshStandardMaterial({ map: CACHED_STRIPE_TEXTURES[0], color: '#b87a98', roughness: 0.9, side: THREE.DoubleSide })  // white & purple
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
    let seed = (mapX * 100) + mapY + sessionSeed; // Include session seed for procedural variation

    if (district === 'ALLEYS') {
      const cellSize = 7;
      const halfCells = 4;
      const openCells = new Set<string>();
      let pathX = 0;
      for (let z = -halfCells; z <= halfCells; z++) {
        const stepRoll = seededRandom(seed + z * 31);
        if (stepRoll > 0.66 && pathX < halfCells - 1) pathX += 1;
        else if (stepRoll < 0.33 && pathX > -halfCells + 1) pathX -= 1;
        // Widen main path from 2 cells to 3 cells for better movement
        openCells.add(`${pathX - 1},${z}`);
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
          // Reduced from 0.05 to 0.18 for better movement (was 95% density, now 82%)
          if (seededRandom(localSeed) < 0.18) continue;
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

    // Note: OUTSKIRTS_FARMLAND, OUTSKIRTS_DESERT, MOUNTAIN_SHRINE, SOUTHERN_ROAD, CARAVANSERAI
    // are handled with early returns above, so only remaining districts reach here
    const size = CONSTANTS.MARKET_SIZE * (
      district === 'WEALTHY' ? 1.15
        : district === 'HOVELS' ? 0.9
          : district === 'CIVIC' ? 1.1
            : district === 'SALHIYYA' ? 0.5
              : 1.0
    );
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (
      district === 'WEALTHY' ? 1.25
        : district === 'HOVELS' ? 0.75
          : district === 'CIVIC' ? 1.1
            : district === 'SALHIYYA' ? 1.0
              : 1.0
    );
    const street = CONSTANTS.STREET_WIDTH * (
      district === 'WEALTHY' ? 2.2
        : district === 'HOVELS' ? 1.3  // Increased from 0.85 to 1.3 for better movement (was 4.25 units, now 6.5 units)
          : district === 'CIVIC' ? 2.6
            : district === 'SALHIYYA' ? 1.8
              : 1.0
    );
    const gap = baseBuilding + street;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        const skipChance = district === 'WEALTHY' ? 0.55
          : district === 'HOVELS' ? 0.35  // Increased from 0.2 to 0.35 for better movement (was 80% density, now 65%)
            : district === 'CIVIC' ? 0.7
              : district === 'SALHIYYA' ? 0.2
                : 0.3;
        if (chance < skipChance) continue;
        if (district === 'CIVIC' && (x * x + z * z) < (gap * 2.2) * (gap * 2.2)) continue;
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        if (district === 'SALHIYYA') {
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
  }, [mapX, mapY, sessionSeed, heightmap]);

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
  // Small expansion to include near shadow casters without rendering distant off-screen buildings
  const [visibleBuildings, setVisibleBuildings] = React.useState<BuildingMetadata[]>(metadata);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const frustumMatrix = useMemo(() => new THREE.Matrix4(), []);
  const expandedFrustum = useMemo(() => new THREE.Frustum(), []);
  const boundingSphere = useMemo(() => new THREE.Sphere(), []);
  const lastCullUpdateRef = React.useRef(0);
  const SHADOW_CULL_EXPAND = 15;

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

    // Push each plane outward by adjusting constant (small expansion for near shadows)
    for (let i = 0; i < 4; i++) {
      expandedFrustum.planes[i].constant += SHADOW_CULL_EXPAND;
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

    // PERFORMANCE: Only update state if visibility actually changed (avoid unnecessary re-renders)
    // Check both length and content by comparing building IDs
    if (visible.length !== visibleBuildings.length ||
        visible.some((b, i) => b.id !== visibleBuildings[i]?.id)) {
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

  // Drag detection for click-to-move (prevent camera drag from triggering movement)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 5; // pixels - movement beyond this is considered a drag

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
    : district === 'JEWISH_QUARTER' ? pick(GROUND_PALETTE.JEWISH_QUARTER)
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
    : district === 'JEWISH_QUARTER' ? '#b09a7d' // Lighter stone, distinct from alleys
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
      roughness: 1.0,
      metalness: 0,
      envMapIntensity: 0.2,
      // Desert sand: no roughness map for flatter, drier appearance
      roughnessMap: (district === 'CARAVANSERAI' || district === 'OUTSKIRTS_DESERT') ? null : roughnessTexture || null,
      bumpMap: (district === 'CARAVANSERAI' || district === 'OUTSKIRTS_DESERT') ? null : roughnessTexture || null,
      bumpScale: 0.0025
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

    // GRAPHICS: Sun-baked ground emissive glow during peak sun (10am-3pm)
    // dayFactor peaks at noon, use it to drive emissive
    if (dayFactor > 0.7) {
      // Subtle warm emissive for sun-baked ground during peak heat
      const emissiveIntensity = (dayFactor - 0.7) / 0.3 * 0.15;
      groundMaterial.emissive.setRGB(0.88, 0.78, 0.58);
      groundMaterial.emissiveIntensity = emissiveIntensity;
    } else {
      groundMaterial.emissiveIntensity = THREE.MathUtils.lerp(groundMaterial.emissiveIntensity, 0, 0.05);
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
          // Track pointer down position to detect drag
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          // Only trigger click-to-move if pointer hasn't moved much (not a drag)
          if (pointerDownPosRef.current) {
            const dx = e.clientX - pointerDownPosRef.current.x;
            const dy = e.clientY - pointerDownPosRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < DRAG_THRESHOLD) {
              // This was a click, not a drag - trigger movement
              onClick?.(e.point);
            }

            pointerDownPosRef.current = null;
          }
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

export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, sessionSeed = 0, onGroundClick, onBuildingsGenerated, onClimbablesGenerated, onHeightmapBuilt, onTreePositionsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false, pushables = [], fogColor, heightmap, laundryLines = [], hangingCarpets = [], catPositionRef, ratPositions, npcPositions, playerPosition, isSprinting, showCityWalls = true }) => {
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

  // Store climbables at Environment level for proper world-space rendering
  const [climbablesForRendering, setClimbablesForRendering] = React.useState<import('../types').ClimbableAccessory[]>([]);

  const handleBuildingsGenerated = React.useCallback((buildings: BuildingMetadata[]) => {
    // Extract building positions
    setBuildingPositions(buildings.map(b => b.position));
    // Forward to original callback
    onBuildingsGenerated?.(buildings);

    // Generate all climbables for all buildings
    const allClimbables: import('../types').ClimbableAccessory[] = [];
    for (const building of buildings) {
      const buildingSeed = building.position[0] * 1000 + building.position[2] + 5000;
      const buildingClimbables = generateClimbablesForBuilding(building, district, buildingSeed);
      allClimbables.push(...buildingClimbables);
    }

    // Store for rendering and pass to callback
    setClimbablesForRendering(allClimbables);
    onClimbablesGenerated?.(allClimbables);
  }, [onBuildingsGenerated, onClimbablesGenerated, district]);

  // Determine if stray dog should spawn (50% chance in non-marketplace biomes)
  const dogSpawn = useMemo(() => {
    if (mapX === 0 && mapY === 0) return null; // No dog in marketplace (has cat)

    const dogSeed = mapX * 1000 + mapY * 13 + 999;
    const spawnRoll = seededRandom(dogSeed);

    if (spawnRoll < 0.5) return null; // 50% chance no dog

    // Generate random spawn position near edges of map (dogs roam from outskirts)
    const posRoll1 = seededRandom(dogSeed + 1);
    const posRoll2 = seededRandom(dogSeed + 2);

    const angle = posRoll1 * Math.PI * 2;
    const dist = 15 + posRoll2 * 10; // Spawn 15-25 units from center

    const position: [number, number, number] = [
      Math.cos(angle) * dist,
      0,
      Math.sin(angle) * dist
    ];

    return {
      seed: dogSeed,
      position
    };
  }, [mapX, mapY]);

  return (
    <HoverWireframeContext.Provider value={enableHoverWireframe}>
      <HoverLabelContext.Provider value={enableHoverLabel}>
        <group>
          <Ground onClick={onGroundClick} district={district} seed={groundSeed} terrainSeed={terrainSeed} timeOfDay={timeOfDay} fogColor={fogColor} onHeightmapBuilt={onHeightmapBuilt} />
          <Buildings mapX={mapX} mapY={mapY} sessionSeed={sessionSeed} onBuildingsGenerated={handleBuildingsGenerated} nearBuildingId={nearBuildingId} torchIntensity={torchIntensity} nightFactor={nightFactor} heightmap={heightmap} />
          {/* Render climbables at world level (not inside Building groups) */}
          {climbablesForRendering.map((accessory) => (
            <ClimbableAccessory key={accessory.id} accessory={accessory} nightFactor={nightFactor} />
          ))}
          <MosqueBackground mapX={mapX} mapY={mapY} />
          <HorizonBackdrop timeOfDay={timeOfDay} showCityWalls={displayCityWalls} wallRadius={CONSTANTS.BOUNDARY + 8} district={district} mapX={mapX} mapY={mapY} />
          <CentralWell mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} catPositionRef={catPositionRef} ratPositions={ratPositions} npcPositions={npcPositions} playerPosition={playerPosition} isSprinting={isSprinting} />
          <MarketplaceDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
           <BirdFlock mapX={mapX} mapY={mapY} center={[0, 7, 0]} count={5} bounds={22} />
          <WealthyGarden mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} buildingPositions={buildingPositions} />
          <CitadelComplex mapX={mapX} mapY={mapY} />
          <OutskirtsFarmlandDecor mapX={mapX} mapY={mapY} />
          <OutskirtsDesertDecor mapX={mapX} mapY={mapY} />
          <SouthernRoadDecor mapX={mapX} mapY={mapY} />
          <SalhiyyaDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} onTreePositionsGenerated={onTreePositionsGenerated} buildingPositions={buildingPositions} heightmap={heightmap} />
          <ChristianQuarterDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} heightmap={heightmap} />
          <JewishQuarterDecor mapX={mapX} mapY={mapY} terrainHeightmap={heightmap} sessionSeed={terrainSeed} />
          <UmayyadMosqueDistrict mapX={mapX} mapY={mapY} terrainHeightmap={heightmap} sessionSeed={terrainSeed} playerPosition={playerPosition} />
          <MountainShrineDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} onTreePositionsGenerated={onTreePositionsGenerated} />
          <CaravanseraiComplex mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          {pushables.length > 0 && <PushableDecorations items={pushables} />}
          {laundryLines.length > 0 && <LaundryLines lines={laundryLines} time={time} />}
          {hangingCarpets && hangingCarpets.length > 0 && <HangingCarpets carpets={hangingCarpets} />}
          {dogSpawn && (
            <StrayDog
              seed={dogSpawn.seed}
              spawnPosition={dogSpawn.position}
              npcPositions={npcPositions}
              playerPosition={playerPosition}
            />
          )}
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
