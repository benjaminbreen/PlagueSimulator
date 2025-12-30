
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';
import { getBuildingHeight } from '../utils/buildingHeights';
import { getTerrainHeight, buildHeightmapFromGeometry, TerrainHeightmap, sampleTerrainHeight } from '../utils/terrain';
import { PushableObject } from '../utils/pushables';
import { LaundryLine, getCatenaryPoint } from '../utils/laundry';
import { HangingCarpet } from '../utils/hangingCarpets';
import { bakeBoxAO, bakeBoxAO_TallBuilding, bakeBoxAO_Civic } from '../utils/vertexAO';
import { CACHED_STRIPE_TEXTURES } from '../utils/environment/textures';
import { getWoodTexture } from '../utils/environment/wood';
import { getDoorStyle } from '../utils/environment/doorStyle';
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
import { CourtyardBuilding } from './environment/buildings/CourtyardBuilding';
import { BuildingOrnaments } from './environment/buildings/BuildingOrnaments';
import { useNightTintedMaterial } from './environment/shared/nightMaterials';
import {
  HoverWireframeContext,
  HoverLabelContext,
  HoverableGroup,
  HoverOutlineBox,
  HoverLabel,
  useHoverFade
} from './environment/shared/HoverSystem';
import { EnvironmentDistricts } from './environment/EnvironmentDistricts';
import { EnvironmentFauna } from './environment/EnvironmentFauna';
import { EnvironmentBase } from './environment/EnvironmentBase';
import { EnvironmentDecor } from './environment/EnvironmentDecor';
import { BuildingFrontDetails } from './environment/buildings/BuildingFrontDetails';
import { generateClimbablesForBuilding } from '../utils/climbables';
import { ISLAMIC_COLORS } from './environment/decorations/IslamicOrnaments';

// Texture generators, constants, and hover system now imported from environment/

// PERFORMANCE: Cache textures at module level to avoid recreation on every mount
// Saves ~327KB of canvas operations + 8 texture uploads per map change
const CACHED_NOISE_TEXTURES = [
  createNoiseTexture(256, 0.15), // Light texture
  createNoiseTexture(256, 0.25), // Medium-light
  createNoiseTexture(256, 0.35), // Medium (original)
  createNoiseTexture(256, 0.45), // Medium-heavy
  createNoiseTexture(256, 0.55), // Heavy texture
];

const CACHED_LINEN_TEXTURE = createLinenTexture(256);
 

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
  [BuildingType.SCHOOL]: { color: '#ddd3c1', metalness: 0.05, roughness: 0.75 },
  [BuildingType.MEDICAL]: { color: '#c8d0c2', metalness: 0.03, roughness: 0.8 },
  [BuildingType.HOSPITALITY]: { color: '#bfa07a', metalness: 0.05, roughness: 0.9 },
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
  [BuildingType.SCHOOL]: [
    '#eee6d5', // Pale ivory
    '#e8dfcf', // Soft limestone
    '#e2d8c5', // Light linen
    '#d8cdbc', // Warm cream
    '#d1c6b3', // Subtle beige
  ],
  [BuildingType.MEDICAL]: [
    '#dde3d8', // Pale sage
    '#d2d9cf', // Soft green-gray
    '#c8d0c2', // Muted sage
    '#d9d2c6', // Warm stone
    '#cfc6b8', // Neutral clay
  ],
  [BuildingType.HOSPITALITY]: [
    '#e8dcc8', // Light clay
    '#e2d2ba', // Warm sand
    '#d6c4a8', // Soft tan
    '#c8b08f', // Warm beige
    '#bfa07a', // Rich tan
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
  [BuildingType.SCHOOL]: [
    '#8a7a68',
    '#7a6a58',
    '#8a7868',
    '#9a8878',
    '#7a6858',
  ],
  [BuildingType.MEDICAL]: [
    '#8a7a68',
    '#7a6a58',
    '#8a7868',
    '#9a8878',
    '#7a6858',
  ],
  [BuildingType.HOSPITALITY]: [
    '#8a7a68',
    '#7a6a58',
    '#8a7868',
    '#9a8878',
    '#7a6858',
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
  [BuildingType.SCHOOL]: [
    '#d8cebb',
    '#c8beab',
    '#b8ae9b',
    '#c8b8a8',
    '#d0c0b0',
  ],
  [BuildingType.MEDICAL]: [
    '#d0c4b0',
    '#c0b4a0',
    '#c8bcaa',
    '#d8ccba',
  ],
  [BuildingType.HOSPITALITY]: [
    '#d0c4b0',
    '#c0b4a0',
    '#c8bcaa',
    '#d8ccba',
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
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;
  const baseHeightScaled = getBuildingHeight(data, district);
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
      arch.domeCount = 2;
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
    if ((data.type === BuildingType.COMMERCIAL
      || data.type === BuildingType.CIVIC
      || data.type === BuildingType.SCHOOL
      || data.type === BuildingType.MEDICAL
      || data.type === BuildingType.HOSPITALITY) && noiseTextures && noiseTextures.length > 0) {
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
  const doorStyle = getDoorStyle(data.type, district, data.sizeScale ?? 1, localSeed + 21);
  const woodTexture = getWoodTexture(district, data.type, localSeed);
  const hasCourtyard = data.hasCourtyard && district === 'WEALTHY' && (data.type === BuildingType.RESIDENTIAL || data.type === BuildingType.COMMERCIAL);
  const courtyardScale = data.courtyardScale ?? 0.55;
  const courtyardSize = finalBuildingSize * courtyardScale;
  const wallThickness = Math.max(0.35, finalBuildingSize * 0.08);
  const gateWidth = Math.min(finalBuildingSize * 0.35, finalBuildingSize - wallThickness * 2);
  const gateHeight = finalHeight * 0.55;
  const halfSize = finalBuildingSize / 2;
  
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
  const marketDistrict = district === 'MARKET' || district === 'STRAIGHT_STREET' || district === 'SOUQ_AXIS' || district === 'MIDAN';
  const hasMarketOrnaments = marketDistrict && seededRandom(localSeed + 81) > 0.6;
  const hasResidentialClutter = !marketDistrict && seededRandom(localSeed + 83) > 0.5;
  const clutterType = Math.floor(seededRandom(localSeed + 84) * 3);
  const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);
  const hasTurret = marketDistrict && seededRandom(localSeed + 91) > 0.85;
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

  // Courtyard wall colors - rich warm sandstone (moved outside conditional for hooks compliance)
  const courtyardWallColor = useMemo(() => {
    const colors = ['#c9b89a', '#d4c4a8', '#c0a880', '#b8a070', '#d0c090'];
    return colors[Math.floor(seededRandom(localSeed + 500) * colors.length)];
  }, [localSeed]);

  if (hasCourtyard) {
    return (
      <CourtyardBuilding
        data={data}
        finalHeight={finalHeight}
        finalBuildingSize={finalBuildingSize}
        courtyardSize={courtyardSize}
        wallThickness={wallThickness}
        gateWidth={gateWidth}
        gateHeight={gateHeight}
        halfSize={halfSize}
        localSeed={localSeed}
        courtyardWallColor={courtyardWallColor}
        wireColor={wireColor}
        labelEnabled={labelEnabled}
        wireframeEnabled={wireframeEnabled}
        hovered={hovered}
        setHovered={setHovered}
        groupRef={groupRef}
        otherMaterials={otherMaterials}
      />
    );
  }


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
          title={
            data.type === BuildingType.RELIGIOUS ? 'Holy Sanctuary'
              : data.type === BuildingType.CIVIC ? "Governor's Office"
                : data.type === BuildingType.SCHOOL ? 'Madrasa'
                  : data.type === BuildingType.MEDICAL ? 'Clinic'
                    : data.type === BuildingType.HOSPITALITY ? 'Inn'
                      : data.type === BuildingType.COMMERCIAL ? 'Merchant Stall'
                        : 'Private Residence'
          }
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

      {/* DETAILED DOORWAY - Style-based rendering */}
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
        {/* Door threshold/step */}
        <mesh position={[0, -1.35, 0.25]} receiveShadow>
          <boxGeometry args={[2.8, 0.2, 0.6]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>

        {/* PLANK DOOR - Simple rough planks for poor areas */}
        {doorStyle === 'plank' && (
          <group>
            {/* Rough plank door with visible gaps */}
            <mesh castShadow>
              <boxGeometry args={[2.2, 2.4, 0.15]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#5a4535"
                roughness={0.95}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.2 : 0}
              />
            </mesh>
            {/* Vertical plank lines */}
            {[-0.7, 0, 0.7].map((x, i) => (
              <mesh key={i} position={[x, 0, 0.08]}>
                <boxGeometry args={[0.04, 2.3, 0.02]} />
                <meshStandardMaterial color="#2a1a10" roughness={1} />
              </mesh>
            ))}
            {/* Iron strap hinges */}
            <mesh position={[-0.95, 0.7, 0.1]} castShadow>
              <boxGeometry args={[0.4, 0.08, 0.03]} />
              <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.3} />
            </mesh>
            <mesh position={[-0.95, -0.5, 0.1]} castShadow>
              <boxGeometry args={[0.35, 0.08, 0.03]} />
              <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.3} />
            </mesh>
          </group>
        )}

        {/* PANELED DOOR - Standard residential with recessed panels */}
        {doorStyle === 'paneled' && (
          <group>
            {/* Door frame */}
            <mesh castShadow>
              <boxGeometry args={[2.4, 2.5, 0.18]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#4a3828"
                roughness={0.85}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.25 : 0}
              />
            </mesh>
            {/* Recessed panels (2x2 grid) */}
            {[[-0.45, 0.5], [0.45, 0.5], [-0.45, -0.5], [0.45, -0.5]].map(([x, y], i) => (
              <mesh key={i} position={[x, y, 0.1]} castShadow>
                <boxGeometry args={[0.7, 0.8, 0.06]} />
                <meshStandardMaterial map={woodTexture} color="#3d2817" roughness={0.9} />
              </mesh>
            ))}
            {/* Simple ring pull */}
            <mesh position={[0.7, 0, 0.12]} rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.12, 0.025, 8, 16]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.6} metalness={0.4} />
            </mesh>
          </group>
        )}

        {/* STUDDED DOOR - Heavy door with iron studs for civic/wealthy */}
        {doorStyle === 'studded' && (
          <group>
            {/* Heavy door base */}
            <mesh castShadow>
              <boxGeometry args={[2.6, 2.7, 0.22]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#3d2817"
                roughness={0.8}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.3 : 0}
              />
            </mesh>
            {/* Grid of iron studs */}
            {[-0.8, -0.4, 0, 0.4, 0.8].map((x) =>
              [-0.9, -0.45, 0, 0.45, 0.9].map((y) => (
                <mesh key={`${x}-${y}`} position={[x, y, 0.13]} castShadow>
                  <sphereGeometry args={[0.06, 6, 4]} />
                  <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
                </mesh>
              ))
            )}
            {/* Large iron ring pull */}
            <mesh position={[0.85, 0, 0.15]} rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.18, 0.035, 8, 16]} />
              <meshStandardMaterial color="#5a5045" roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Iron plate behind ring */}
            <mesh position={[0.85, 0, 0.12]}>
              <circleGeometry args={[0.12, 8]} />
              <meshStandardMaterial color="#4a4035" roughness={0.6} metalness={0.4} />
            </mesh>
          </group>
        )}

        {/* CARVED DOOR - Ornate geometric patterns for wealthy areas */}
        {doorStyle === 'carved' && (
          <group>
            {/* Door base with carved appearance */}
            <mesh castShadow>
              <boxGeometry args={[2.5, 2.6, 0.2]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#5a4030"
                roughness={0.75}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.35 : 0}
              />
            </mesh>
            {/* Central geometric star pattern (8-pointed) */}
            <mesh position={[0, 0.2, 0.12]} rotation={[0, 0, Math.PI/8]}>
              <circleGeometry args={[0.5, 8]} />
              <meshStandardMaterial color="#4a3525" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.2, 0.14]} rotation={[0, 0, 0]}>
              <circleGeometry args={[0.35, 8]} />
              <meshStandardMaterial color="#3d2817" roughness={0.85} />
            </mesh>
            {/* Decorative border frame */}
            <mesh position={[0, 0, 0.11]}>
              <boxGeometry args={[2.2, 2.3, 0.04]} />
              <meshStandardMaterial color="#4a3525" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.115]}>
              <boxGeometry args={[2.0, 2.1, 0.04]} />
              <meshStandardMaterial map={woodTexture} color="#3d2817" roughness={0.8} />
            </mesh>
            {/* Brass door knocker (hand shape) */}
            <mesh position={[0, 0.8, 0.15]}>
              <boxGeometry args={[0.15, 0.25, 0.04]} />
              <meshStandardMaterial color="#b8954a" roughness={0.4} metalness={0.6} />
            </mesh>
          </group>
        )}

        {/* ARCHED DOOR - Pointed Islamic arch for religious buildings */}
        {doorStyle === 'arched' && (
          <group>
            {/* Main door body */}
            <mesh castShadow>
              <boxGeometry args={[2.4, 2.2, 0.2]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#3d2817"
                roughness={0.8}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.3 : 0}
              />
            </mesh>
            {/* Pointed arch top */}
            <mesh position={[0, 1.15, 0.1]}>
              <circleGeometry args={[1.2, 16, 0, Math.PI]} />
              <meshStandardMaterial map={woodTexture} color="#3d2817" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Stone arch frame */}
            <mesh position={[0, 1.25, -0.02]} castShadow>
              <circleGeometry args={[1.4, 16, 0, Math.PI]} />
              <meshStandardMaterial color="#c4b196" roughness={0.88} side={THREE.DoubleSide} />
            </mesh>
            {/* Decorative radiating pattern on arch */}
            {[0.2, 0.5, 0.8].map((t, i) => {
              const angle = Math.PI * t;
              const x = Math.cos(angle) * 0.9;
              const y = 1.15 + Math.sin(angle) * 0.9;
              return (
                <mesh key={i} position={[x, y, 0.12]} rotation={[0, 0, angle - Math.PI/2]}>
                  <boxGeometry args={[0.08, 0.4, 0.03]} />
                  <meshStandardMaterial color="#5a4535" roughness={0.9} />
                </mesh>
              );
            })}
          </group>
        )}

        {/* DOUBLE DOOR - Grand entrance for mosques and large civic buildings */}
        {doorStyle === 'double' && (
          <group>
            {/* Left door */}
            <mesh position={[-0.75, 0, 0]} castShadow>
              <boxGeometry args={[1.3, 2.5, 0.2]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#3d2817"
                roughness={0.8}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.25 : 0}
              />
            </mesh>
            {/* Right door */}
            <mesh position={[0.75, 0, 0]} castShadow>
              <boxGeometry args={[1.3, 2.5, 0.2]} />
              <meshStandardMaterial
                map={woodTexture}
                color="#3d2817"
                roughness={0.8}
                emissive={activeGlow ? "#fbbf24" : "black"}
                emissiveIntensity={activeGlow ? 0.25 : 0}
              />
            </mesh>
            {/* Central seam/meeting rail */}
            <mesh position={[0, 0, 0.12]}>
              <boxGeometry args={[0.08, 2.4, 0.04]} />
              <meshStandardMaterial color="#2a1a10" roughness={0.9} />
            </mesh>
            {/* Decorative panels on each door */}
            {[-0.75, 0.75].map((dx) => (
              <group key={dx}>
                <mesh position={[dx, 0.5, 0.12]} castShadow>
                  <boxGeometry args={[0.9, 0.8, 0.05]} />
                  <meshStandardMaterial map={woodTexture} color="#4a3525" roughness={0.85} />
                </mesh>
                <mesh position={[dx, -0.5, 0.12]} castShadow>
                  <boxGeometry args={[0.9, 0.8, 0.05]} />
                  <meshStandardMaterial map={woodTexture} color="#4a3525" roughness={0.85} />
                </mesh>
              </group>
            ))}
            {/* Matching ring pulls on each door */}
            {[-0.4, 0.4].map((x) => (
              <mesh key={x} position={[x, 0, 0.15]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.12, 0.025, 8, 16]} />
                <meshStandardMaterial color="#6a5a4a" roughness={0.5} metalness={0.5} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      <BuildingFrontDetails
        data={data}
        doorPos={doorPos}
        doorRotation={doorRotation}
        nightFactor={nightFactor}
      />

      {/* Roof Parapet / Cap for Wealthy - Enhanced with turrets, crenellations, and decorative elements */}
      {district === 'WEALTHY' && (
        <>
          {/* Base parapet band */}
          <mesh position={[0, finalHeight / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[finalBuildingSize + 0.6, 0.3, finalBuildingSize + 0.6]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[0, finalHeight / 2 + 0.35, 0]} castShadow>
            <boxGeometry args={[finalBuildingSize + 0.4, 0.08, finalBuildingSize + 0.4]} />
            <meshStandardMaterial color="#bfae96" roughness={0.85} />
          </mesh>

          {/* Decorative crenellations/merlons along roofline */}
          {seededRandom(localSeed + 32) > 0.3 && (
            <group position={[0, finalHeight / 2 + 0.5, 0]}>
              {[0, 1, 2, 3].map((side) => {
                const halfSize = (finalBuildingSize + 0.5) / 2;
                const numMerlons = Math.floor(finalBuildingSize / 0.9);
                return Array.from({ length: numMerlons }).map((_, mi) => {
                  const offset = (mi - (numMerlons - 1) / 2) * 0.9;
                  const x = side === 1 ? halfSize : side === 3 ? -halfSize : offset;
                  const z = side === 0 ? halfSize : side === 2 ? -halfSize : offset;
                  if (side === 1 || side === 3) {
                    return (
                      <mesh key={`merlon-${side}-${mi}`} position={[x, 0.15, offset]} castShadow>
                        <boxGeometry args={[0.25, 0.35, 0.4]} />
                        <meshStandardMaterial color="#c4b08a" roughness={0.88} />
                      </mesh>
                    );
                  }
                  return (
                    <mesh key={`merlon-${side}-${mi}`} position={[offset, 0.15, z]} castShadow>
                      <boxGeometry args={[0.4, 0.35, 0.25]} />
                      <meshStandardMaterial color="#c4b08a" roughness={0.88} />
                    </mesh>
                  );
                });
              })}
            </group>
          )}

          {/* Corner turrets - small decorative towers at corners */}
          {seededRandom(localSeed + 35) > 0.55 && (
            <group>
              {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([cx, cz], ti) => {
                if (seededRandom(localSeed + 36 + ti) > 0.6) return null;
                const halfSize = (finalBuildingSize + 0.3) / 2;
                return (
                  <group key={`turret-${ti}`} position={[cx * halfSize, finalHeight / 2 + 0.6, cz * halfSize]}>
                    {/* Turret base */}
                    <mesh castShadow>
                      <cylinderGeometry args={[0.5, 0.55, 0.8, 8]} />
                      <meshStandardMaterial color="#c9b79d" roughness={0.85} />
                    </mesh>
                    {/* Turret cap - conical or domed */}
                    {seededRandom(localSeed + 38 + ti) > 0.5 ? (
                      <mesh position={[0, 0.55, 0]} castShadow>
                        <coneGeometry args={[0.45, 0.6, 8]} />
                        <meshStandardMaterial color="#9a8570" roughness={0.8} />
                      </mesh>
                    ) : (
                      <mesh position={[0, 0.45, 0]} castShadow>
                        <sphereGeometry args={[0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial color="#b5a58a" roughness={0.8} />
                      </mesh>
                    )}
                    {/* Finial on top */}
                    <mesh position={[0, 0.95, 0]} castShadow>
                      <sphereGeometry args={[0.12, 6, 5]} />
                      <meshStandardMaterial color="#d4c4a0" roughness={0.7} metalness={0.15} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}

          {/* Central dome or lantern - for larger mansions */}
          {seededRandom(localSeed + 37) > 0.6 && (
            <group position={[0, finalHeight / 2 + 0.4, 0]}>
              {seededRandom(localSeed + 39) > 0.5 ? (
                // Small dome
                <>
                  <mesh position={[0, 0.15, 0]} castShadow>
                    <cylinderGeometry args={[finalBuildingSize / 3.5, finalBuildingSize / 3, 0.35, 12]} />
                    <meshStandardMaterial color="#c9b99a" roughness={0.85} />
                  </mesh>
                  <mesh position={[0, 0.5, 0]} castShadow>
                    <sphereGeometry args={[finalBuildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#bda88b" roughness={0.8} />
                  </mesh>
                  {/* Finial */}
                  <mesh position={[0, 0.5 + finalBuildingSize / 4.5, 0]} castShadow>
                    <sphereGeometry args={[0.15, 8, 6]} />
                    <meshStandardMaterial color="#d8c8a0" roughness={0.6} metalness={0.2} />
                  </mesh>
                </>
              ) : (
                // Decorative lantern/pavilion
                <>
                  <mesh position={[0, 0.3, 0]} castShadow>
                    <boxGeometry args={[finalBuildingSize / 3, 0.6, finalBuildingSize / 3]} />
                    <meshStandardMaterial color="#c4b496" roughness={0.85} />
                  </mesh>
                  {/* Small arched openings on lantern */}
                  {[0, 1, 2, 3].map((side) => {
                    const lOff = finalBuildingSize / 6 + 0.02;
                    const lx = side === 1 ? lOff : side === 3 ? -lOff : 0;
                    const lz = side === 0 ? lOff : side === 2 ? -lOff : 0;
                    return (
                      <mesh key={`lantern-arch-${side}`} position={[lx, 0.3, lz]} castShadow>
                        <boxGeometry args={[side % 2 === 0 ? 0.35 : 0.08, 0.4, side % 2 === 0 ? 0.08 : 0.35]} />
                        <meshStandardMaterial color="#2a2420" roughness={0.95} />
                      </mesh>
                    );
                  })}
                  {/* Pyramid roof on lantern */}
                  <mesh position={[0, 0.75, 0]} castShadow>
                    <coneGeometry args={[finalBuildingSize / 4, 0.5, 4]} />
                    <meshStandardMaterial color="#9a8a70" roughness={0.8} />
                  </mesh>
                  <mesh position={[0, 1.05, 0]} castShadow>
                    <sphereGeometry args={[0.1, 6, 5]} />
                    <meshStandardMaterial color="#d4c4a0" roughness={0.6} metalness={0.2} />
                  </mesh>
                </>
              )}
            </group>
          )}

          {/* Decorative roof finials/pinnacles at roof edges */}
          {seededRandom(localSeed + 40) > 0.5 && (
            <group position={[0, finalHeight / 2 + 0.45, 0]}>
              {[
                [0, (finalBuildingSize + 0.5) / 2],
                [0, -(finalBuildingSize + 0.5) / 2],
                [(finalBuildingSize + 0.5) / 2, 0],
                [-(finalBuildingSize + 0.5) / 2, 0]
              ].map(([fx, fz], fi) => {
                if (seededRandom(localSeed + 41 + fi) > 0.65) return null;
                return (
                  <group key={`finial-${fi}`} position={[fx, 0, fz]}>
                    <mesh castShadow>
                      <cylinderGeometry args={[0.08, 0.12, 0.25, 6]} />
                      <meshStandardMaterial color="#c4b496" roughness={0.85} />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} castShadow>
                      <sphereGeometry args={[0.1, 6, 5]} />
                      <meshStandardMaterial color="#d8c8a8" roughness={0.7} metalness={0.1} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}
        </>
      )}

      <BuildingOrnaments
        data={data}
        district={district}
        finalBuildingSize={finalBuildingSize}
        finalHeight={finalHeight}
        localSeed={localSeed}
        isOrnateBuilding={isOrnateBuilding}
        showOrnateDetails={showOrnateDetails}
        doorPos={doorPos}
        doorOutwardOffset={doorOutwardOffset}
        doorSideOffset={doorSideOffset}
        hasResidentialClutter={hasResidentialClutter}
        clutterType={clutterType}
        hasWealthyDoorOrnaments={hasWealthyDoorOrnaments}
        hasTurret={hasTurret}
        torchOffsets={torchOffsets}
        torchIntensity={torchIntensity}
        otherMaterials={otherMaterials}
        nightFactor={nightFactor}
      />

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

      const marketDistrict = district === 'MARKET' || district === 'STRAIGHT_STREET' || district === 'SOUQ_AXIS' || district === 'MIDAN';
      const hasMarketOrnaments = marketDistrict && seededRandom(localSeed + 81) > 0.6;
      const hasResidentialClutter = !marketDistrict && seededRandom(localSeed + 83) > (district === 'HOVELS' ? 0.25 : 0.5);
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

// ==================== INSTANCED GROUND CLUTTER ====================
// Bread ovens, firewood stacks, rolled carpets - placed near buildings

const InstancedGroundClutter: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
}> = ({ buildings, district }) => {
  // Refs for each prop type
  const ovenDomeRef = useRef<THREE.InstancedMesh>(null);
  const ovenOpeningRef = useRef<THREE.InstancedMesh>(null);
  const ovenBaseRef = useRef<THREE.InstancedMesh>(null);
  const firewoodLogRef = useRef<THREE.InstancedMesh>(null);
  const carpetRef = useRef<THREE.InstancedMesh>(null);
  const carpetTasselRef = useRef<THREE.InstancedMesh>(null);
  // Biome-specific refs
  const cartWheelRef = useRef<THREE.InstancedMesh>(null);
  const strawPileRef = useRef<THREE.InstancedMesh>(null);
  const luggageRef = useRef<THREE.InstancedMesh>(null);
  const sandalRackRef = useRef<THREE.InstancedMesh>(null);
  const sandalRackShelfRef = useRef<THREE.InstancedMesh>(null);
  const basinRef = useRef<THREE.InstancedMesh>(null);
  const basinWaterRef = useRef<THREE.InstancedMesh>(null);
  const birdbathBaseRef = useRef<THREE.InstancedMesh>(null);
  const birdbathBowlRef = useRef<THREE.InstancedMesh>(null);
  const decorTileRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  // Carpet color palette - rich Damascus textile colors
  const CARPET_COLORS = useMemo(() => [
    '#8B2323', // Deep crimson
    '#6B3A3A', // Burgundy
    '#4A3728', // Chocolate brown
    '#2B4B6F', // Indigo blue
    '#3D5A3D', // Forest green
    '#6B4423', // Rust
    '#483D8B', // Slate blue
    '#8B4513', // Saddle brown
  ], []);

  // Wood colors for firewood variation
  const WOOD_COLORS = useMemo(() => [
    '#5a4030', // Dark brown
    '#6b4a35', // Medium brown
    '#7a5a45', // Light brown
    '#4a3525', // Very dark
    '#8b6b50', // Pale wood
  ], []);

  // Decorative tile colors - Islamic geometric tile palette
  const TILE_COLORS = useMemo(() => [
    '#2a5a8a', // Cobalt blue
    '#1a7a6a', // Teal/turquoise
    '#4a3a6a', // Deep purple
    '#8a6a3a', // Golden ochre
    '#3a6a4a', // Emerald green
    '#6a3a4a', // Burgundy
    '#5a7a8a', // Grey-blue
  ], []);

  const clutterData = useMemo(() => {
    const ovens: { dome: THREE.Matrix4; opening: THREE.Matrix4; base: THREE.Matrix4 }[] = [];
    const firewood: { matrix: THREE.Matrix4; colorIndex: number }[] = [];
    const carpets: { roll: THREE.Matrix4; tassel: THREE.Matrix4; colorIndex: number }[] = [];
    // Biome-specific data
    const cartWheels: THREE.Matrix4[] = [];
    const strawPiles: THREE.Matrix4[] = [];
    const luggage: THREE.Matrix4[] = [];
    const sandalRacks: { frame: THREE.Matrix4; shelf: THREE.Matrix4 }[] = [];
    const basins: { base: THREE.Matrix4; water: THREE.Matrix4 }[] = [];
    const birdbaths: { base: THREE.Matrix4; bowl: THREE.Matrix4 }[] = [];
    const decorTiles: { matrix: THREE.Matrix4; colorIndex: number }[] = [];

    const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;

    buildings.forEach((building) => {
      const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale * (building.sizeScale ?? 1);
      const localSeed = building.position[0] * 1000 + building.position[2];
      const bx = building.position[0];
      const by = building.position[1];
      const bz = building.position[2];

      // BREAD OVENS - more common in residential areas (hovels, residential)
      // ~12% chance, not in market or wealthy
      if (district !== 'MARKET' && district !== 'WEALTHY' && seededRandom(localSeed + 500) > 0.88) {
        const side = Math.floor(seededRandom(localSeed + 501) * 4);
        if (side !== building.doorSide) {
          const ovenSize = 0.6 + seededRandom(localSeed + 502) * 0.3;
          let ox = bx, oz = bz;
          let ovenRot = 0;

          if (side === 0) { oz += buildingSize / 2 + 1.0; ovenRot = 0; }
          else if (side === 1) { ox += buildingSize / 2 + 1.0; ovenRot = Math.PI / 2; }
          else if (side === 2) { oz -= buildingSize / 2 + 1.0; ovenRot = Math.PI; }
          else { ox -= buildingSize / 2 + 1.0; ovenRot = -Math.PI / 2; }

          // Dome
          tempObj.position.set(ox, by + ovenSize * 0.4, oz);
          tempObj.rotation.set(0, ovenRot, 0);
          tempObj.scale.set(ovenSize, ovenSize, ovenSize);
          tempObj.updateMatrix();
          const domeMatrix = tempObj.matrix.clone();

          // Base rim (cylinder around bottom of dome)
          tempObj.position.set(ox, by + 0.08, oz);
          tempObj.rotation.set(0, 0, 0);
          tempObj.scale.set(ovenSize * 1.1, 1, ovenSize * 1.1);
          tempObj.updateMatrix();
          const baseMatrix = tempObj.matrix.clone();

          // Opening (dark hole at front)
          const openingOffset = new THREE.Vector3(0, -0.1, 0.45 * ovenSize);
          openingOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), ovenRot);
          tempObj.position.set(ox + openingOffset.x, by + ovenSize * 0.25, oz + openingOffset.z);
          tempObj.scale.set(ovenSize * 0.5, ovenSize * 0.6, 0.1);
          tempObj.updateMatrix();
          const openingMatrix = tempObj.matrix.clone();

          ovens.push({ dome: domeMatrix, opening: openingMatrix, base: baseMatrix });
        }
      }

      // FIREWOOD STACKS - common everywhere, ~18% chance
      if (seededRandom(localSeed + 510) > 0.82) {
        const side = Math.floor(seededRandom(localSeed + 511) * 4);
        if (side !== building.doorSide) {
          let fx = bx, fz = bz;
          const stackRot = seededRandom(localSeed + 512) * 0.3 - 0.15;

          if (side === 0) { fz += buildingSize / 2 + 0.6; }
          else if (side === 1) { fx += buildingSize / 2 + 0.6; }
          else if (side === 2) { fz -= buildingSize / 2 + 0.6; }
          else { fx -= buildingSize / 2 + 0.6; }

          // Create a stack of 4-6 logs
          const logCount = 4 + Math.floor(seededRandom(localSeed + 513) * 3);
          for (let i = 0; i < logCount; i++) {
            const layer = Math.floor(i / 2);
            const xOff = (i % 2) * 0.25 - 0.125 + seededRandom(localSeed + 514 + i) * 0.1;
            const yOff = layer * 0.18;
            const zOff = seededRandom(localSeed + 515 + i) * 0.15 - 0.075;
            const logRot = stackRot + (side === 1 || side === 3 ? Math.PI / 2 : 0);
            const colorIndex = Math.floor(seededRandom(localSeed + 516 + i) * WOOD_COLORS.length);

            tempObj.position.set(fx + xOff, by + 0.1 + yOff, fz + zOff);
            tempObj.rotation.set(0, logRot, Math.PI / 2);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            firewood.push({ matrix: tempObj.matrix.clone(), colorIndex });
          }
        }
      }

      // ROLLED CARPETS - more common in market/wealthy, ~10% overall
      const carpetChance = (district === 'MARKET' || district === 'STRAIGHT_STREET' || district === 'SOUQ_AXIS' || district === 'MIDAN')
        ? 0.82
        : district === 'WEALTHY' ? 0.85 : 0.92;
      if (seededRandom(localSeed + 520) > carpetChance) {
        const side = Math.floor(seededRandom(localSeed + 521) * 4);
        if (side !== building.doorSide) {
          let cx = bx, cz = bz;
          let carpetRot = 0;
          const lean = 0.25 + seededRandom(localSeed + 522) * 0.15; // Lean angle against wall

          if (side === 0) { cz += buildingSize / 2 + 0.3; carpetRot = 0; }
          else if (side === 1) { cx += buildingSize / 2 + 0.3; carpetRot = Math.PI / 2; }
          else if (side === 2) { cz -= buildingSize / 2 + 0.3; carpetRot = Math.PI; }
          else { cx -= buildingSize / 2 + 0.3; carpetRot = -Math.PI / 2; }

          const carpetLength = 1.2 + seededRandom(localSeed + 523) * 0.6;
          const colorIndex = Math.floor(seededRandom(localSeed + 524) * CARPET_COLORS.length);

          // Rolled carpet cylinder - leaning against wall
          tempObj.position.set(cx, by + carpetLength * 0.45, cz);
          tempObj.rotation.set(lean, carpetRot, 0);
          tempObj.scale.set(1, carpetLength, 1);
          tempObj.updateMatrix();
          const rollMatrix = tempObj.matrix.clone();

          // Tassel at bottom
          const tasselOffset = new THREE.Vector3(0, -carpetLength * 0.5, 0.15);
          tasselOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), lean);
          tasselOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carpetRot);
          tempObj.position.set(cx + tasselOffset.x, by + 0.1, cz + tasselOffset.z);
          tempObj.rotation.set(0, carpetRot, 0);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          const tasselMatrix = tempObj.matrix.clone();

          carpets.push({ roll: rollMatrix, tassel: tasselMatrix, colorIndex });
        }
      }

      // ========== BIOME-SPECIFIC ITEMS ==========

      // HOVELS: Broken cart wheels (~15% chance)
      if (district === 'HOVELS' && seededRandom(localSeed + 700) > 0.85) {
        const side = Math.floor(seededRandom(localSeed + 701) * 4);
        if (side !== building.doorSide) {
          let wx = bx, wz = bz;
          if (side === 0) wz += buildingSize / 2 + 0.5;
          else if (side === 1) wx += buildingSize / 2 + 0.5;
          else if (side === 2) wz -= buildingSize / 2 + 0.5;
          else wx -= buildingSize / 2 + 0.5;

          const wheelLean = 0.3 + seededRandom(localSeed + 702) * 0.4;
          const wheelRot = seededRandom(localSeed + 703) * Math.PI * 2;

          tempObj.position.set(wx, by + 0.4, wz);
          tempObj.rotation.set(wheelLean, wheelRot, Math.PI / 2);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          cartWheels.push(tempObj.matrix.clone());
        }
      }

      // HOVELS: Straw piles (~20% chance)
      if (district === 'HOVELS' && seededRandom(localSeed + 710) > 0.8) {
        const side = Math.floor(seededRandom(localSeed + 711) * 4);
        if (side !== building.doorSide) {
          let sx = bx, sz = bz;
          if (side === 0) sz += buildingSize / 2 + 0.8;
          else if (side === 1) sx += buildingSize / 2 + 0.8;
          else if (side === 2) sz -= buildingSize / 2 + 0.8;
          else sx -= buildingSize / 2 + 0.8;

          const pileScale = 0.6 + seededRandom(localSeed + 712) * 0.5;
          tempObj.position.set(sx, by + 0.15 * pileScale, sz);
          tempObj.rotation.set(0, seededRandom(localSeed + 713) * Math.PI, 0);
          tempObj.scale.set(pileScale, pileScale * 0.6, pileScale);
          tempObj.updateMatrix();
          strawPiles.push(tempObj.matrix.clone());
        }
      }

      // CARAVANSERAI: Luggage boxes (~25% chance)
      if ((district === 'CARAVANSERAI' || district === 'OUTSKIRTS_DESERT') && seededRandom(localSeed + 720) > 0.75) {
        const side = Math.floor(seededRandom(localSeed + 721) * 4);
        if (side !== building.doorSide) {
          let lx = bx, lz = bz;
          if (side === 0) lz += buildingSize / 2 + 0.7;
          else if (side === 1) lx += buildingSize / 2 + 0.7;
          else if (side === 2) lz -= buildingSize / 2 + 0.7;
          else lx -= buildingSize / 2 + 0.7;

          tempObj.position.set(lx, by + 0.25, lz);
          tempObj.rotation.set(0, seededRandom(localSeed + 722) * 0.3 - 0.15, 0);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          luggage.push(tempObj.matrix.clone());
        }
      }

      // RELIGIOUS: Sandal racks (~20% chance, near doors)
      if (district === 'RELIGIOUS' && seededRandom(localSeed + 730) > 0.8) {
        // Place near door
        let rx = bx, rz = bz;
        const doorSide = building.doorSide;
        if (doorSide === 0) { rz += buildingSize / 2 + 0.3; rx += 1.5; }
        else if (doorSide === 1) { rx += buildingSize / 2 + 0.3; rz += 1.5; }
        else if (doorSide === 2) { rz -= buildingSize / 2 + 0.3; rx -= 1.5; }
        else { rx -= buildingSize / 2 + 0.3; rz -= 1.5; }

        const rackRot = doorSide * (Math.PI / 2);
        tempObj.position.set(rx, by + 0.4, rz);
        tempObj.rotation.set(0, rackRot, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        const frameMatrix = tempObj.matrix.clone();

        tempObj.position.set(rx, by + 0.25, rz);
        tempObj.updateMatrix();
        const shelfMatrix = tempObj.matrix.clone();

        sandalRacks.push({ frame: frameMatrix, shelf: shelfMatrix });
      }

      // RELIGIOUS: Ablution basins (rare - max 2 per map, tracked separately)
      if (district === 'RELIGIOUS' && basins.length < 2 && seededRandom(localSeed + 740) > 0.92) {
        let abx = bx, abz = bz;
        const abSide = Math.floor(seededRandom(localSeed + 741) * 4);
        if (abSide === 0) abz += buildingSize / 2 + 1.5;
        else if (abSide === 1) abx += buildingSize / 2 + 1.5;
        else if (abSide === 2) abz -= buildingSize / 2 + 1.5;
        else abx -= buildingSize / 2 + 1.5;

        tempObj.position.set(abx, by + 0.35, abz);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        const baseMatrix = tempObj.matrix.clone();

        tempObj.position.set(abx, by + 0.5, abz);
        tempObj.updateMatrix();
        const waterMatrix = tempObj.matrix.clone();

        basins.push({ base: baseMatrix, water: waterMatrix });
      }

      // WEALTHY: Bird baths (~12% chance)
      if ((district === 'WEALTHY' || district === 'SALHIYYA') && seededRandom(localSeed + 750) > 0.88) {
        const side = Math.floor(seededRandom(localSeed + 751) * 4);
        if (side !== building.doorSide) {
          let bbx = bx, bbz = bz;
          if (side === 0) bbz += buildingSize / 2 + 1.2;
          else if (side === 1) bbx += buildingSize / 2 + 1.2;
          else if (side === 2) bbz -= buildingSize / 2 + 1.2;
          else bbx -= buildingSize / 2 + 1.2;

          tempObj.position.set(bbx, by + 0.4, bbz);
          tempObj.rotation.set(0, 0, 0);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          const baseMatrix = tempObj.matrix.clone();

          tempObj.position.set(bbx, by + 0.75, bbz);
          tempObj.updateMatrix();
          const bowlMatrix = tempObj.matrix.clone();

          birdbaths.push({ base: baseMatrix, bowl: bowlMatrix });
        }
      }

      // WEALTHY: Decorative tiles near doorways (~30% chance)
      if ((district === 'WEALTHY' || district === 'SALHIYYA') && seededRandom(localSeed + 760) > 0.7) {
        let tx = bx, tz = bz;
        const doorSide = building.doorSide;
        if (doorSide === 0) tz += buildingSize / 2 + 0.6;
        else if (doorSide === 1) tx += buildingSize / 2 + 0.6;
        else if (doorSide === 2) tz -= buildingSize / 2 + 0.6;
        else tx -= buildingSize / 2 + 0.6;

        const colorIndex = Math.floor(seededRandom(localSeed + 761) * TILE_COLORS.length);
        tempObj.position.set(tx, by + 0.02, tz);
        tempObj.rotation.set(-Math.PI / 2, 0, doorSide * (Math.PI / 2));
        tempObj.scale.set(1.5, 1.5, 1);
        tempObj.updateMatrix();
        decorTiles.push({ matrix: tempObj.matrix.clone(), colorIndex });
      }
    });

    return { ovens, firewood, carpets, cartWheels, strawPiles, luggage, sandalRacks, basins, birdbaths, decorTiles };
  }, [buildings, district, CARPET_COLORS, WOOD_COLORS, TILE_COLORS]);

  useEffect(() => {
    // Set oven matrices
    if (ovenDomeRef.current && clutterData.ovens.length > 0) {
      clutterData.ovens.forEach((data, i) => {
        ovenDomeRef.current!.setMatrixAt(i, data.dome);
        if (ovenOpeningRef.current) ovenOpeningRef.current.setMatrixAt(i, data.opening);
        if (ovenBaseRef.current) ovenBaseRef.current.setMatrixAt(i, data.base);
      });
      ovenDomeRef.current.instanceMatrix.needsUpdate = true;
      if (ovenOpeningRef.current) ovenOpeningRef.current.instanceMatrix.needsUpdate = true;
      if (ovenBaseRef.current) ovenBaseRef.current.instanceMatrix.needsUpdate = true;
    }

    // Set firewood matrices and colors
    if (firewoodLogRef.current && clutterData.firewood.length > 0) {
      const tempColor = new THREE.Color();

      clutterData.firewood.forEach((data, i) => {
        firewoodLogRef.current!.setMatrixAt(i, data.matrix);
        tempColor.set(WOOD_COLORS[data.colorIndex]);
        firewoodLogRef.current!.setColorAt(i, tempColor);
      });
      firewoodLogRef.current.instanceMatrix.needsUpdate = true;
      if (firewoodLogRef.current.instanceColor) firewoodLogRef.current.instanceColor.needsUpdate = true;
    }

    // Set carpet matrices and colors
    if (carpetRef.current && clutterData.carpets.length > 0) {
      const tempColor = new THREE.Color();

      clutterData.carpets.forEach((data, i) => {
        carpetRef.current!.setMatrixAt(i, data.roll);
        if (carpetTasselRef.current) carpetTasselRef.current.setMatrixAt(i, data.tassel);

        // Set per-instance color using Three.js built-in method
        tempColor.set(CARPET_COLORS[data.colorIndex]);
        carpetRef.current!.setColorAt(i, tempColor);
      });

      carpetRef.current.instanceMatrix.needsUpdate = true;
      if (carpetRef.current.instanceColor) carpetRef.current.instanceColor.needsUpdate = true;
      if (carpetTasselRef.current) carpetTasselRef.current.instanceMatrix.needsUpdate = true;
    }

    // ========== BIOME-SPECIFIC MATRIX UPDATES ==========

    // Cart wheels (HOVELS)
    if (cartWheelRef.current && clutterData.cartWheels.length > 0) {
      clutterData.cartWheels.forEach((matrix, i) => {
        cartWheelRef.current!.setMatrixAt(i, matrix);
      });
      cartWheelRef.current.instanceMatrix.needsUpdate = true;
    }

    // Straw piles (HOVELS)
    if (strawPileRef.current && clutterData.strawPiles.length > 0) {
      clutterData.strawPiles.forEach((matrix, i) => {
        strawPileRef.current!.setMatrixAt(i, matrix);
      });
      strawPileRef.current.instanceMatrix.needsUpdate = true;
    }

    // Luggage (CARAVANSERAI)
    if (luggageRef.current && clutterData.luggage.length > 0) {
      clutterData.luggage.forEach((matrix, i) => {
        luggageRef.current!.setMatrixAt(i, matrix);
      });
      luggageRef.current.instanceMatrix.needsUpdate = true;
    }

    // Sandal racks (RELIGIOUS)
    if (sandalRackRef.current && clutterData.sandalRacks.length > 0) {
      clutterData.sandalRacks.forEach((data, i) => {
        sandalRackRef.current!.setMatrixAt(i, data.frame);
        if (sandalRackShelfRef.current) sandalRackShelfRef.current.setMatrixAt(i, data.shelf);
      });
      sandalRackRef.current.instanceMatrix.needsUpdate = true;
      if (sandalRackShelfRef.current) sandalRackShelfRef.current.instanceMatrix.needsUpdate = true;
    }

    // Ablution basins (RELIGIOUS)
    if (basinRef.current && clutterData.basins.length > 0) {
      clutterData.basins.forEach((data, i) => {
        basinRef.current!.setMatrixAt(i, data.base);
        if (basinWaterRef.current) basinWaterRef.current.setMatrixAt(i, data.water);
      });
      basinRef.current.instanceMatrix.needsUpdate = true;
      if (basinWaterRef.current) basinWaterRef.current.instanceMatrix.needsUpdate = true;
    }

    // Bird baths (WEALTHY)
    if (birdbathBaseRef.current && clutterData.birdbaths.length > 0) {
      clutterData.birdbaths.forEach((data, i) => {
        birdbathBaseRef.current!.setMatrixAt(i, data.base);
        if (birdbathBowlRef.current) birdbathBowlRef.current.setMatrixAt(i, data.bowl);
      });
      birdbathBaseRef.current.instanceMatrix.needsUpdate = true;
      if (birdbathBowlRef.current) birdbathBowlRef.current.instanceMatrix.needsUpdate = true;
    }

    // Decorative tiles (WEALTHY) - with per-instance colors
    if (decorTileRef.current && clutterData.decorTiles.length > 0) {
      const tempColor = new THREE.Color();

      clutterData.decorTiles.forEach((data, i) => {
        decorTileRef.current!.setMatrixAt(i, data.matrix);
        tempColor.set(TILE_COLORS[data.colorIndex]);
        decorTileRef.current!.setColorAt(i, tempColor);
      });
      decorTileRef.current.instanceMatrix.needsUpdate = true;
      if (decorTileRef.current.instanceColor) decorTileRef.current.instanceColor.needsUpdate = true;
    }
  }, [clutterData, CARPET_COLORS, WOOD_COLORS, TILE_COLORS]);

  return (
    <>
      {/* Bread Oven - terracotta clay dome with base */}
      {clutterData.ovens.length > 0 && (
        <>
          {/* Dome */}
          <instancedMesh ref={ovenDomeRef} args={[undefined, undefined, clutterData.ovens.length]} castShadow receiveShadow>
            <sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a86840" roughness={0.9} />
          </instancedMesh>
          {/* Base rim - darker clay */}
          <instancedMesh ref={ovenBaseRef} args={[undefined, undefined, clutterData.ovens.length]} castShadow>
            <cylinderGeometry args={[0.52, 0.55, 0.16, 12]} />
            <meshStandardMaterial color="#8a5530" roughness={0.95} />
          </instancedMesh>
          {/* Oven opening - dark interior */}
          <instancedMesh ref={ovenOpeningRef} args={[undefined, undefined, clutterData.ovens.length]}>
            <circleGeometry args={[0.2, 8]} />
            <meshStandardMaterial color="#1a1008" roughness={1} />
          </instancedMesh>
        </>
      )}

      {/* Firewood Logs - rough brown wood with per-instance colors */}
      {clutterData.firewood.length > 0 && (
        <instancedMesh ref={firewoodLogRef} args={[undefined, undefined, clutterData.firewood.length]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.5, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.95} />
        </instancedMesh>
      )}

      {/* Rolled Carpets - colorful rolled cylinders with per-instance colors */}
      {clutterData.carpets.length > 0 && (
        <>
          <instancedMesh ref={carpetRef} args={[undefined, undefined, clutterData.carpets.length]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 1, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.85} />
          </instancedMesh>
          {/* Tassels at carpet ends - golden fringe */}
          <instancedMesh ref={carpetTasselRef} args={[undefined, undefined, clutterData.carpets.length]}>
            <cylinderGeometry args={[0.12, 0.08, 0.15, 8]} />
            <meshStandardMaterial color="#c9a86c" roughness={0.9} />
          </instancedMesh>
        </>
      )}

      {/* ========== BIOME-SPECIFIC PROPS ========== */}

      {/* HOVELS: Broken Cart Wheels */}
      {clutterData.cartWheels.length > 0 && (
        <instancedMesh ref={cartWheelRef} args={[undefined, undefined, clutterData.cartWheels.length]} castShadow>
          <torusGeometry args={[0.4, 0.05, 6, 16]} />
          <meshStandardMaterial color="#5a4530" roughness={0.95} />
        </instancedMesh>
      )}

      {/* HOVELS: Straw Piles */}
      {clutterData.strawPiles.length > 0 && (
        <instancedMesh ref={strawPileRef} args={[undefined, undefined, clutterData.strawPiles.length]} castShadow>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial color="#c4a55a" roughness={1} />
        </instancedMesh>
      )}

      {/* CARAVANSERAI: Luggage Boxes / Travel Chests */}
      {clutterData.luggage.length > 0 && (
        <instancedMesh ref={luggageRef} args={[undefined, undefined, clutterData.luggage.length]} castShadow>
          <boxGeometry args={[0.7, 0.45, 0.45]} />
          <meshStandardMaterial color="#6a4a30" roughness={0.9} />
        </instancedMesh>
      )}

      {/* RELIGIOUS: Sandal Racks */}
      {clutterData.sandalRacks.length > 0 && (
        <>
          {/* Rack frame (vertical posts) */}
          <instancedMesh ref={sandalRackRef} args={[undefined, undefined, clutterData.sandalRacks.length]} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.08]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </instancedMesh>
          {/* Shelf */}
          <instancedMesh ref={sandalRackShelfRef} args={[undefined, undefined, clutterData.sandalRacks.length]}>
            <boxGeometry args={[0.75, 0.04, 0.25]} />
            <meshStandardMaterial color="#6a4a2a" roughness={0.95} />
          </instancedMesh>
        </>
      )}

      {/* RELIGIOUS: Ablution Basins */}
      {clutterData.basins.length > 0 && (
        <>
          {/* Stone basin base */}
          <instancedMesh ref={basinRef} args={[undefined, undefined, clutterData.basins.length]} castShadow receiveShadow>
            <cylinderGeometry args={[0.6, 0.7, 0.5, 12]} />
            <meshStandardMaterial color="#9a8a7a" roughness={0.85} />
          </instancedMesh>
          {/* Water surface */}
          <instancedMesh ref={basinWaterRef} args={[undefined, undefined, clutterData.basins.length]}>
            <circleGeometry args={[0.55, 16]} />
            <meshStandardMaterial color="#4a7a9a" roughness={0.2} metalness={0.1} transparent opacity={0.8} />
          </instancedMesh>
        </>
      )}

      {/* WEALTHY: Bird Baths */}
      {clutterData.birdbaths.length > 0 && (
        <>
          {/* Pedestal base */}
          <instancedMesh ref={birdbathBaseRef} args={[undefined, undefined, clutterData.birdbaths.length]} castShadow>
            <cylinderGeometry args={[0.15, 0.25, 0.7, 10]} />
            <meshStandardMaterial color="#c8b8a8" roughness={0.7} />
          </instancedMesh>
          {/* Bowl */}
          <instancedMesh ref={birdbathBowlRef} args={[undefined, undefined, clutterData.birdbaths.length]} castShadow>
            <cylinderGeometry args={[0.4, 0.35, 0.15, 12]} />
            <meshStandardMaterial color="#d8c8b8" roughness={0.6} />
          </instancedMesh>
        </>
      )}

      {/* WEALTHY: Decorative Tiles - Islamic geometric tiles with varied colors */}
      {clutterData.decorTiles.length > 0 && (
        <instancedMesh ref={decorTileRef} args={[undefined, undefined, clutterData.decorTiles.length]} receiveShadow>
          <planeGeometry args={[1.2, 1.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.15} />
        </instancedMesh>
      )}
    </>
  );
};

// ==================== HANGING BIRDCAGE ====================
// Rare decorative element with animated bird - max 2 per map
// Cage hangs from a metal bracket extending from the wall

const HangingBirdcage: React.FC<{
  position: [number, number, number];
  wallSide: number; // 0-3 for N/E/S/W
  birdColor: string;
  birdSize: number;
  seed: number;
}> = ({ position, wallSide, birdColor, birdSize, seed }) => {
  const birdRef = useRef<THREE.Group>(null);
  const cageRef = useRef<THREE.Group>(null);
  const rotation = wallSide * (Math.PI / 2);

  // Animate bird - gentle hopping and head movement, plus subtle cage sway
  useFrame(({ clock }) => {
    if (!birdRef.current) return;
    const t = clock.getElapsedTime() + seed;

    // Hopping motion
    const hop = Math.abs(Math.sin(t * 3)) * 0.03;
    birdRef.current.position.y = hop;

    // Head tilt
    birdRef.current.rotation.z = Math.sin(t * 2) * 0.1;
    birdRef.current.rotation.y = Math.sin(t * 1.5) * 0.2;

    // Subtle cage sway
    if (cageRef.current) {
      cageRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
      cageRef.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.015;
    }
  });

  const bracketLength = 0.5; // How far bracket extends from wall
  const cageRadius = 0.18;
  const cageHeight = 0.4;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Metal wall bracket - extends outward from wall */}
      <mesh position={[0, 0, bracketLength / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.02, bracketLength, 6]} />
        <meshStandardMaterial color="#3a3530" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Wall mounting plate */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshStandardMaterial color="#4a4540" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Hook at end of bracket - small loop */}
      <mesh position={[0, -0.04, bracketLength]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.04, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#3a3530" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Chain/hanging wire from hook to cage */}
      <mesh position={[0, -0.12, bracketLength]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 4]} />
        <meshStandardMaterial color="#5a5550" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* The cage group - positioned hanging from bracket end */}
      <group ref={cageRef} position={[0, -0.18, bracketLength]}>
        {/* Cage ring (top) - horizontal torus */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[cageRadius, 0.015, 6, 16]} />
          <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Cage ring (middle) - horizontal torus */}
        <mesh position={[0, -cageHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[cageRadius * 0.9, 0.012, 6, 16]} />
          <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Cage ring (bottom) - horizontal torus */}
        <mesh position={[0, -cageHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[cageRadius, 0.015, 6, 16]} />
          <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Cage bars (vertical) - connect top and bottom rings */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * (cageRadius - 0.01);
          const z = Math.sin(angle) * (cageRadius - 0.01);
          return (
            <mesh
              key={i}
              position={[x, -cageHeight / 2, z]}
            >
              <cylinderGeometry args={[0.008, 0.008, cageHeight, 4]} />
              <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
            </mesh>
          );
        })}

        {/* Dome top - curved bars meeting at center */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={`dome-${i}`}
              position={[0, 0.08, 0]}
              rotation={[0.6, angle, 0]}
            >
              <cylinderGeometry args={[0.006, 0.006, cageRadius * 1.1, 4]} />
              <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
            </mesh>
          );
        })}

        {/* Top finial */}
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#5a5550" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Cage floor */}
        <mesh position={[0, -cageHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[cageRadius - 0.02, 12]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>

        {/* Bird perch */}
        <mesh position={[0, -cageHeight * 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, cageRadius * 1.4, 6]} />
          <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
        </mesh>

        {/* Bird - sitting on perch */}
        <group ref={birdRef} position={[0, -cageHeight * 0.55, 0]} scale={[birdSize, birdSize, birdSize]}>
          {/* Body */}
          <mesh>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color={birdColor} roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh position={[0.04, 0.03, 0]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshStandardMaterial color={birdColor} roughness={0.7} />
          </mesh>
          {/* Eye */}
          <mesh position={[0.055, 0.04, 0.015]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshStandardMaterial color="#101010" roughness={0.3} />
          </mesh>
          {/* Beak */}
          <mesh position={[0.07, 0.03, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.012, 0.03, 4]} />
            <meshStandardMaterial color="#d4a020" roughness={0.6} />
          </mesh>
          {/* Tail */}
          <mesh position={[-0.06, -0.01, 0]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.05, 0.015, 0.025]} />
            <meshStandardMaterial color={birdColor} roughness={0.7} />
          </mesh>
          {/* Wing */}
          <mesh position={[0, 0, 0.035]} rotation={[0.2, 0, 0]}>
            <sphereGeometry args={[0.035, 6, 4]} />
            <meshStandardMaterial color={birdColor} roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// Birdcage placement component - handles finding valid positions
const BirdcageSystem: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
  mapSeed: number;
}> = ({ buildings, district, mapSeed }) => {
  // Only show in MARKET or ALLEYS
  if (district !== 'MARKET' && district !== 'ALLEYS') return null;

  // Find up to 2 valid birdcage positions
  const birdcages = useMemo(() => {
    const cages: Array<{
      position: [number, number, number];
      wallSide: number;
      birdColor: string;
      birdSize: number;
      seed: number;
    }> = [];

    const BIRD_COLORS = [
      '#e6c832', // Canary yellow
      '#4a9e4a', // Green
      '#d45a30', // Orange
      '#6a8fc0', // Blue-grey
      '#c44040', // Red
      '#f0e0a0', // Cream
    ];

    // Shuffle buildings deterministically and pick first 2 valid ones
    const shuffled = [...buildings].sort((a, b) =>
      seededRandom(a.position[0] * 100 + a.position[2] + mapSeed) -
      seededRandom(b.position[0] * 100 + b.position[2] + mapSeed + 1)
    );

    for (const building of shuffled) {
      if (cages.length >= 2) break;

      const localSeed = building.position[0] * 1000 + building.position[2] + mapSeed;

      // Only 15% of eligible buildings get a cage
      if (seededRandom(localSeed + 600) > 0.15) continue;

      // Pick a wall side (not door side)
      const side = Math.floor(seededRandom(localSeed + 601) * 4);
      if (side === building.doorSide) continue;

      const buildingSize = CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1);
      const bx = building.position[0];
      const by = building.position[1];
      const bz = building.position[2];

      let cx = bx, cz = bz;
      const height = 2.5 + seededRandom(localSeed + 602) * 1.5; // 2.5-4 units high

      if (side === 0) cz += buildingSize / 2 + 0.05;
      else if (side === 1) cx += buildingSize / 2 + 0.05;
      else if (side === 2) cz -= buildingSize / 2 + 0.05;
      else cx -= buildingSize / 2 + 0.05;

      const birdColor = BIRD_COLORS[Math.floor(seededRandom(localSeed + 603) * BIRD_COLORS.length)];
      const birdSize = 0.8 + seededRandom(localSeed + 604) * 0.4;

      cages.push({
        position: [cx, by + height, cz],
        wallSide: side,
        birdColor,
        birdSize,
        seed: localSeed
      });
    }

    return cages;
  }, [buildings, district, mapSeed]);

  return (
    <>
      {birdcages.map((cage, i) => (
        <HangingBirdcage key={`birdcage-${i}`} {...cage} />
      ))}
    </>
  );
};

// Instanced Window System - renders all windows with a single draw call
const InstancedWindows: React.FC<{
  buildings: BuildingMetadata[];
  district: DistrictType;
  nightFactor: number;
}> = ({ buildings, district, nightFactor }) => {
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const interiorRef = useRef<THREE.InstancedMesh>(null);
  const hBarRef = useRef<THREE.InstancedMesh>(null);
  const vBarRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const glowMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  // Window styles: 'simple' (50%), 'lattice' (30%), 'shuttered' (20%)
  type WindowStyle = 'simple' | 'lattice' | 'shuttered';

  const windowData = useMemo(() => {
    const data: Array<{
      frameMatrix: THREE.Matrix4;
      topFrameMatrix: THREE.Matrix4;
      barMatrix: THREE.Matrix4;
      shutterMatrix: THREE.Matrix4;
      style: WindowStyle;
      hasGlow: boolean;
      glowIntensity: number;
      colorIndex: number
    }>= [];
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
        // Always skip windows on door side
        if (side === building.doorSide) return;
        const sideRand = seededRandom(localSeed + side + 10);
        if (sideRand < 0.3) return;

        const rot = side * (Math.PI / 2);
        const off = buildingSize / 2 + 0.05;

        // Window Y position: ensure it's well above ground (min 2.5 units) and scaled to building height
        // Place window at roughly 60% up the building, but minimum 2.5 units above ground
        const windowY = Math.max(2.5, height * 0.55) + building.position[1];

        const wPos = new THREE.Vector3(building.position[0], windowY, building.position[2]);
        if (side === 0) wPos.z += off;
        else if (side === 1) wPos.x += off;
        else if (side === 2) wPos.z -= off;
        else if (side === 3) wPos.x -= off;

        // Determine window style: 50% simple, 30% lattice, 20% shuttered
        const styleRoll = seededRandom(localSeed + side + 300);
        const style: WindowStyle = styleRoll < 0.5 ? 'simple' : styleRoll < 0.8 ? 'lattice' : 'shuttered';

        // Dark recess position (slightly into wall)
        const recessOffset = new THREE.Vector3(0, 0, -0.02);
        recessOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        tempObj.position.copy(wPos).add(recessOffset);
        tempObj.rotation.set(0, rot, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        const frameMatrix = tempObj.matrix.clone();

        // Top frame border position (at top of window, on wall surface)
        const topOffset = new THREE.Vector3(0, 0.9, 0.06);
        topOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        tempObj.position.copy(wPos).add(topOffset);
        tempObj.updateMatrix();
        const topFrameMatrix = tempObj.matrix.clone();

        // Bar position (in front of recess) - only used for lattice style
        const barOffset = new THREE.Vector3(0, 0, 0.06);
        barOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        tempObj.position.copy(wPos).add(barOffset);
        tempObj.updateMatrix();
        const barMatrix = tempObj.matrix.clone();

        // Shutter position (on left side of window, angled open) - only for shuttered style
        const shutterOffset = new THREE.Vector3(-0.55, 0, 0.15);
        shutterOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        tempObj.position.copy(wPos).add(shutterOffset);
        // Angle the shutter slightly open (rotated around Y by additional 25 degrees)
        tempObj.rotation.set(0, rot + 0.4, 0);
        tempObj.updateMatrix();
        const shutterMatrix = tempObj.matrix.clone();

        const windowGlowRoll = seededRandom(localSeed + side + 120);
        const hasGlow = windowGlowRoll > 0.5 && nightFactor > 0.2;
        const glowIntensity = 0.3 + windowGlowRoll * 2.0;

        const colorRoll = seededRandom(localSeed + side + 200);
        const colorIndex = colorRoll < 0.60 ? 0 : colorRoll < 0.90 ? 1 : 2;

        data.push({
          frameMatrix,
          topFrameMatrix,
          barMatrix,
          shutterMatrix,
          style,
          hasGlow,
          glowIntensity,
          colorIndex
        });
      });
    });

    return data;
  }, [buildings, district, nightFactor]);

  // Count windows by style for instanced mesh sizing
  const latticeWindows = useMemo(() => windowData.filter(d => d.style === 'lattice'), [windowData]);
  const shutteredWindows = useMemo(() => windowData.filter(d => d.style === 'shuttered'), [windowData]);

  // Refs for style-specific meshes
  const shutterRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!frameRef.current) return;

    // Set matrices for all windows (dark recess and top frame)
    windowData.forEach((data, i) => {
      frameRef.current!.setMatrixAt(i, data.frameMatrix);
      if (interiorRef.current) interiorRef.current.setMatrixAt(i, data.topFrameMatrix);
    });
    frameRef.current.instanceMatrix.needsUpdate = true;
    if (interiorRef.current) interiorRef.current.instanceMatrix.needsUpdate = true;

    // Set matrices only for lattice-style windows (crossbars)
    if (hBarRef.current && vBarRef.current) {
      latticeWindows.forEach((data, i) => {
        hBarRef.current!.setMatrixAt(i, data.barMatrix);
        vBarRef.current!.setMatrixAt(i, data.barMatrix);
      });
      hBarRef.current.instanceMatrix.needsUpdate = true;
      vBarRef.current.instanceMatrix.needsUpdate = true;
    }

    // Set matrices only for shuttered windows
    if (shutterRef.current) {
      shutteredWindows.forEach((data, i) => {
        shutterRef.current!.setMatrixAt(i, data.shutterMatrix);
      });
      shutterRef.current.instanceMatrix.needsUpdate = true;
    }

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
          // Decompose the frame matrix for glow positioning
          data.frameMatrix.decompose(tempPosition, tempQuaternion, tempScale);

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
  }, [windowData, latticeWindows, shutteredWindows]);

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
      {/* Window dark interior recess - all windows have this */}
      <instancedMesh ref={frameRef} args={[undefined, undefined, windowData.length]}>
        <boxGeometry args={[1.2, 1.8, 0.08]} />
        <meshStandardMaterial
          color={nightFactor > 0.3 ? "#1a1208" : "#2a1a10"}
          roughness={0.95}
        />
      </instancedMesh>

      {/* Top wooden frame border - all windows have this */}
      <instancedMesh ref={interiorRef} args={[undefined, undefined, windowData.length]}>
        <boxGeometry args={[1.4, 0.1, 0.1]} />
        <meshStandardMaterial color="#8a7458" roughness={0.85} />
      </instancedMesh>

      {/* Horizontal divider bar - only lattice style (30%) */}
      {latticeWindows.length > 0 && (
        <instancedMesh ref={hBarRef} args={[undefined, undefined, latticeWindows.length]}>
          <boxGeometry args={[1.2, 0.08, 0.12]} />
          <meshStandardMaterial color="#7a6450" roughness={0.8} />
        </instancedMesh>
      )}

      {/* Vertical divider bar - only lattice style (30%) */}
      {latticeWindows.length > 0 && (
        <instancedMesh ref={vBarRef} args={[undefined, undefined, latticeWindows.length]}>
          <boxGeometry args={[0.08, 1.6, 0.12]} />
          <meshStandardMaterial color="#7a6450" roughness={0.8} />
        </instancedMesh>
      )}

      {/* Wooden shutter - only shuttered style (20%) */}
      {shutteredWindows.length > 0 && (
        <instancedMesh ref={shutterRef} args={[undefined, undefined, shutteredWindows.length]} castShadow>
          <boxGeometry args={[0.6, 1.7, 0.06]} />
          <meshStandardMaterial color="#6a5440" roughness={0.75} />
        </instancedMesh>
      )}

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
  isSprinting?: boolean;
}> = ({ mapX, mapY, sessionSeed = 0, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor, heightmap, isSprinting = false }) => {
  // PERFORMANCE: Use cached textures instead of recreating on every mount
  const noiseTextures = CACHED_NOISE_TEXTURES;
  const grimeTexture = useMemo(() => createGrimeTexture(256), []);
  const { camera } = useThree();

  const materials = useMemo(() => {
    const matMap = new Map<BuildingType, THREE.MeshStandardMaterial>();
    Object.entries(BUILDING_PALETTES).forEach(([type, props]) => {
      const applyTexture = type === BuildingType.COMMERCIAL
        || type === BuildingType.CIVIC
        || type === BuildingType.SCHOOL
        || type === BuildingType.MEDICAL
        || type === BuildingType.HOSPITALITY;
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
      // cellSize must be > BUILDING_SIZE (8) to have gaps between buildings
      const cellSize = 11;  // ~3 unit gaps between buildings
      const halfCells = 3;  // 7x7 grid fits in map area
      const openCells = new Set<string>();

      // Create main road - always 2 cells wide (22 units)
      let pathX = 0;
      for (let z = -halfCells; z <= halfCells; z++) {
        const stepRoll = seededRandom(seed + z * 31);
        if (stepRoll > 0.75 && pathX < halfCells - 2) pathX += 1;
        else if (stepRoll < 0.25 && pathX > -halfCells + 1) pathX -= 1;
        // Main path is always 2 cells wide
        openCells.add(`${pathX},${z}`);
        openCells.add(`${pathX + 1},${z}`);
      }

      // Add 1 cross alley
      const crossZ = Math.floor(seededRandom(seed + 210) * (halfCells * 2)) - halfCells;
      for (let x = -halfCells; x <= halfCells; x++) {
        openCells.add(`${x},${crossZ}`);
      }

      // Place buildings with random jitter for organic feel
      for (let x = -halfCells; x <= halfCells; x++) {
        for (let z = -halfCells; z <= halfCells; z++) {
          if (openCells.has(`${x},${z}`)) continue;
          const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z) * 17;
          if (seededRandom(localSeed) < 0.18) continue;  // 18% skip = 82% density but with gaps
          // Add small random offset for organic placement
          const jitterX = (seededRandom(localSeed + 1) - 0.5) * 1.5;
          const jitterZ = (seededRandom(localSeed + 2) - 0.5) * 1.5;
          const worldX = x * cellSize + jitterX;
          const worldZ = z * cellSize + jitterZ;
          const data = generateBuildingMetadata(localSeed, worldX, worldZ, district);
          bldMetadata.push(data);
        }
      }
      return bldMetadata;
    }
    if (district === 'MOUNTAIN_SHRINE') {
      // No regular buildings on the mountain - just the shrine (handled separately)
      return [];
    }
    if (district === 'OUTSKIRTS_SCRUBLAND') {
      // Scrublands have 0-3 buildings handled by decorative system
      // No regular procedural buildings
      return [];
    }
    if (district === 'ROADSIDE') {
      // Roadside: Mix of buildings along road and set back from road
      const roadOffset = 11; // Buildings on sides of road
      const spacing = 16;
      const span = 3;

      // Buildings along the road (6-8 total, similar to SOUTHERN_ROAD but less dense)
      for (let i = -span; i <= span; i++) {
        const z = i * spacing;
        const localSeedLeft = seed + i * 1337 + 13;
        const localSeedRight = seed + i * 1337 + 53;

        // Skip some positions for less density than SOUTHERN_ROAD
        if (seededRandom(localSeedLeft) < 0.25) continue;
        if (seededRandom(localSeedRight) < 0.25) continue;

        const left = generateBuildingMetadata(localSeedLeft, -roadOffset, z, district);
        const right = generateBuildingMetadata(localSeedRight, roadOffset, z, district);

        left.sizeScale = 0.85;
        right.sizeScale = 0.85;

        // Mix of residential and commercial
        if (seededRandom(localSeedLeft + 100) > 0.6) {
          left.type = BuildingType.COMMERCIAL;
          left.ownerProfession = seededRandom(localSeedLeft + 200) > 0.5 ? 'Trader' : 'Innkeeper';
        } else {
          left.type = BuildingType.RESIDENTIAL;
          left.ownerProfession = 'Traveler';
        }

        if (seededRandom(localSeedRight + 100) > 0.6) {
          right.type = BuildingType.COMMERCIAL;
          right.ownerProfession = seededRandom(localSeedRight + 200) > 0.5 ? 'Water-Carrier' : 'Merchant';
        } else {
          right.type = BuildingType.RESIDENTIAL;
          right.ownerProfession = 'Farmer';
        }

        bldMetadata.push(left, right);
      }

      // Buildings set back from road (3-5 farms/houses)
      const distantCount = 3 + Math.floor(seededRandom(seed + 5000) * 3);
      for (let i = 0; i < distantCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (24 + seededRandom(seed + 6000 + i) * 8);
        const z = -30 + (i * 20) + seededRandom(seed + 7000 + i) * 12;
        const localSeed = seed + i * 2337;

        const building = generateBuildingMetadata(localSeed, x, z, district);
        building.sizeScale = 0.95;

        // Most are farms, some are houses
        if (seededRandom(localSeed + 100) > 0.4) {
          building.type = BuildingType.COMMERCIAL;
          building.ownerProfession = 'Farmer';
        } else {
          building.type = BuildingType.RESIDENTIAL;
          building.ownerProfession = 'Field Worker';
        }

        bldMetadata.push(building);
      }

      // Small labeled outbuildings (barns, storage sheds, stables) - 3-5 total
      const outbuildingCount = 3 + Math.floor(seededRandom(seed + 8000) * 3);
      for (let i = 0; i < outbuildingCount; i++) {
        const side = seededRandom(seed + 8100 + i) > 0.5 ? -1 : 1;
        const x = side * (15 + seededRandom(seed + 8200 + i) * 12);
        const z = -35 + (i * 18) + seededRandom(seed + 8300 + i) * 10;
        const localSeed = seed + i * 3337;

        const outbuilding = generateBuildingMetadata(localSeed, x, z, district);
        outbuilding.sizeScale = 0.55; // Much smaller than regular buildings
        outbuilding.type = BuildingType.COMMERCIAL;

        // Various outbuilding types
        const typeRoll = seededRandom(localSeed + 100);
        if (typeRoll > 0.7) {
          outbuilding.ownerProfession = 'Stable';
        } else if (typeRoll > 0.4) {
          outbuilding.ownerProfession = 'Barn';
        } else {
          outbuilding.ownerProfession = 'Storage';
        }

        bldMetadata.push(outbuilding);
      }

      return bldMetadata;
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
        const data = generateBuildingMetadata(localSeed, x, z, district);
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
        const left = generateBuildingMetadata(localSeedLeft, -roadOffset, z, district);
        const right = generateBuildingMetadata(localSeedRight, roadOffset, z, district);
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
    if (district === 'BAB_SHARQI') {
      const roadOffset = 14;
      const spacing = 14;
      const span = 4;
      const gateBuffer = 12;
      for (let i = -span; i <= span; i++) {
        const z = i * spacing;
        if (z > CONSTANTS.BOUNDARY - gateBuffer) continue;
        const localSeedLeft = seed + i * 1337 + 19;
        const localSeedRight = seed + i * 1337 + 59;
        const jitterXLeft = (seededRandom(localSeedLeft + 3) - 0.5) * 1.2;
        const jitterXRight = (seededRandom(localSeedRight + 5) - 0.5) * 1.2;
        const left = generateBuildingMetadata(localSeedLeft, -roadOffset + jitterXLeft, z, district);
        const right = generateBuildingMetadata(localSeedRight, roadOffset + jitterXRight, z, district);
        left.sizeScale = 0.95;
        right.sizeScale = 0.95;
        if (seededRandom(localSeedLeft) > 0.65) {
          left.type = BuildingType.COMMERCIAL;
          left.ownerProfession = 'Textile Merchant';
        }
        if (seededRandom(localSeedRight) > 0.65) {
          right.type = BuildingType.COMMERCIAL;
          right.ownerProfession = 'Spice Trader';
        }
        bldMetadata.push(left, right);
      }
      return bldMetadata.filter((b) => {
        const keep = seededRandom(seed + b.position[0] * 17 + b.position[2] * 23) > 0.2;
        return keep;
      });
    }
    if (district === 'CARAVANSERAI') {
      // No regular buildings - the caravanserai structure is handled separately
      return [];
    }
    if (district === 'UMAYYAD_MOSQUE') {
      // No regular procedural buildings - the mosque complex is handled by UmayyadMosqueDistrict component
      // which includes the main mosque structure, courtyard, and decorative perimeter buildings
      return [];
    }

    // Note: OUTSKIRTS_FARMLAND, OUTSKIRTS_DESERT, OUTSKIRTS_SCRUBLAND, ROADSIDE, MOUNTAIN_SHRINE,
    // SOUTHERN_ROAD, BAB_SHARQI, CARAVANSERAI, UMAYYAD_MOSQUE are handled with early returns above, so only remaining districts reach here
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
      district === 'WEALTHY' ? 3.5  // Increased from 2.2 to 3.5 for more spacious wealthy district
        : district === 'HOVELS' ? 1.3  // Increased from 0.85 to 1.3 for better movement (was 4.25 units, now 6.5 units)
          : district === 'CIVIC' ? 2.6
            : district === 'SALHIYYA' ? 1.8
              : 1.0
    );
    const gap = baseBuilding + street;

    // Buffer zone around central garden/plaza in WEALTHY district
    const gardenBufferRadius = district === 'WEALTHY' ? 35 : gap * 1.5;
    const marketPlazaBufferRadius = (district === 'MARKET' && mapX === 0 && mapY === 0) ? 20 : 0;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        const skipChance = district === 'WEALTHY' ? 0.30  // Lower skip chance to ensure 4-5+ residences
          : district === 'HOVELS' ? 0.35  // Increased from 0.2 to 0.35 for better movement (was 80% density, now 65%)
            : district === 'CIVIC' ? 0.7
              : district === 'SALHIYYA' ? 0.2
                : 0.3;
        if (chance < skipChance) continue;
        if (district === 'CIVIC' && (x * x + z * z) < (gap * 2.2) * (gap * 2.2)) continue;
        // WEALTHY district: larger buffer around the central garden/plaza
        if (district === 'WEALTHY' && (x * x + z * z) < gardenBufferRadius * gardenBufferRadius) continue;
        // MARKET central plaza: keep clear around fountain and columns
        if (marketPlazaBufferRadius > 0 && (x * x + z * z) < marketPlazaBufferRadius * marketPlazaBufferRadius) continue;
        const data = generateBuildingMetadata(localSeed, x, z, district);
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

    // WEALTHY DISTRICT LIMITS: Max 1 civic and 1 religious - this is a residential area
    if (district === 'WEALTHY') {
      const religious = bldMetadata.filter(b => b.type === BuildingType.RELIGIOUS);
      const civic = bldMetadata.filter(b => b.type === BuildingType.CIVIC);

      // Keep at most 1 religious building (small neighborhood mosque)
      const keepReligious = new Set(religious.slice(0, 1).map(b => b.id));

      // Keep at most 1 civic building
      const keepCivic = new Set(civic.slice(0, 1).map(b => b.id));

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
  const tempVec3 = useMemo(() => new THREE.Vector3(), []);
  const lastCullUpdateRef = React.useRef(0);
  const SHADOW_CULL_EXPAND = 15;

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const cullInterval = isSprinting ? 0.35 : 0.2;
    // Update frustum culling periodically to reduce per-frame cost
    if (elapsed - lastCullUpdateRef.current < cullInterval) return;
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
        tempVec3.set(building.position[0], building.position[1], building.position[2]),
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
      {/* Windows use ALL buildings (not visibleBuildings) to prevent flicker from mesh recreation during frustum culling */}
      <InstancedWindows buildings={metadata} district={district} nightFactor={nightFactor} />
      <InstancedDecorations buildings={visibleBuildings} district={district} />
      <InstancedGroundClutter buildings={visibleBuildings} district={district} />
      <BirdcageSystem buildings={visibleBuildings} district={district} mapSeed={sessionSeed} />

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
  const mapScale = CONSTANTS.MAP_RADIUS / 55;
  const scaleSize = (size: number) => size * mapScale;
  const scaleSegments = (segments: number) => Math.max(8, Math.round(segments * mapScale));
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
    const gridSize = district === 'SALHIYYA' ? scaleSize(80) : scaleSize(250);
    const segments = district === 'SALHIYYA' ? scaleSegments(60) : scaleSegments(120);
    return buildTerrain(gridSize, segments);
  }, [district, terrainSeed]);
  const innerTerrainGeometry = useMemo(() => {
    if (district !== 'SALHIYYA' && district !== 'MOUNTAIN_SHRINE') return null;
    const gridSize = district === 'SALHIYYA' ? scaleSize(30) : scaleSize(60);
    const segments = district === 'SALHIYYA' ? scaleSegments(30) : scaleSegments(40);
    return buildTerrain(gridSize, segments);
  }, [district, terrainSeed]);

  // BUGFIX: Build heightmap from main terrain geometry for accurate character positioning
  const heightmap = useMemo(() => {
    if (!terrainGeometry) return null;
    const gridSize = district === 'SALHIYYA' ? scaleSize(80) : scaleSize(250);
    const segments = district === 'SALHIYYA' ? scaleSegments(60) : scaleSegments(120);
    return buildHeightmapFromGeometry(terrainGeometry, gridSize, segments);
  }, [terrainGeometry, district]);

  // Pass heightmap back to parent via callback
  useEffect(() => {
    if (onHeightmapBuilt) {
      onHeightmapBuilt(heightmap);
    }
  }, [heightmap, onHeightmapBuilt]);
  const baseGeometry = useMemo(() => new THREE.PlaneGeometry(scaleSize(250), scaleSize(250), 1, 1), []);
  const innerBaseGeometry = useMemo(() => new THREE.PlaneGeometry(scaleSize(60), scaleSize(60), 1, 1), []);

  // Using imported GROUND_PALETTE from environment/constants
  const pick = (list: string[]) => list[Math.floor(seed * list.length) % list.length];
  const baseColor = (district === 'MARKET' || district === 'STRAIGHT_STREET' || district === 'SOUQ_AXIS' || district === 'MIDAN') ? pick(GROUND_PALETTE.MARKET)
    : district === 'WEALTHY' ? pick(GROUND_PALETTE.WEALTHY)
    : district === 'HOVELS' ? pick(GROUND_PALETTE.HOVELS)
    : (district === 'ALLEYS' || district === 'BAB_SHARQI') ? pick(GROUND_PALETTE.ALLEYS)
    : district === 'JEWISH_QUARTER' ? pick(GROUND_PALETTE.JEWISH_QUARTER)
    : district === 'SALHIYYA' ? pick(GROUND_PALETTE.SALHIYYA)
    : district === 'OUTSKIRTS_FARMLAND' ? pick(GROUND_PALETTE.OUTSKIRTS_FARMLAND)
    : district === 'OUTSKIRTS_DESERT' ? pick(GROUND_PALETTE.OUTSKIRTS_DESERT)
    : district === 'OUTSKIRTS_SCRUBLAND' ? pick(GROUND_PALETTE.OUTSKIRTS_SCRUBLAND)
    : district === 'ROADSIDE' ? pick(GROUND_PALETTE.ROADSIDE)
    : district === 'MOUNTAIN_SHRINE' ? pick(GROUND_PALETTE.MOUNTAIN_SHRINE)
    : district === 'CARAVANSERAI' ? pick(GROUND_PALETTE.CARAVANSERAI)
    : district === 'SOUTHERN_ROAD' ? pick(GROUND_PALETTE.SOUTHERN_ROAD)
    : district === 'CIVIC' ? pick(GROUND_PALETTE.CIVIC)
    : pick(GROUND_PALETTE.DEFAULT);
  const overlayColor = district === 'WEALTHY' ? '#c3b9a9'
    : district === 'HOVELS' || district === 'ALLEYS' || district === 'BAB_SHARQI' ? '#9a734d'
    : district === 'JEWISH_QUARTER' ? '#b09a7d' // Lighter stone, distinct from alleys
    : district === 'SALHIYYA' ? '#4a6a3a' // Grass overlay
    : district === 'OUTSKIRTS_FARMLAND' ? '#4f6f3b'
    : district === 'OUTSKIRTS_DESERT' ? '#d17a4a' // Warm terracotta overlay (unused - overlay disabled for desert)
    : district === 'OUTSKIRTS_SCRUBLAND' ? '#6a7a4a' // Dry grass overlay
    : district === 'ROADSIDE' ? '#a89878' // Dirt path overlay
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


export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, sessionSeed = 0, onGroundClick, onBuildingsGenerated, onClimbablesGenerated, onHeightmapBuilt, onTreePositionsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false, pushables = [], fogColor, heightmap, laundryLines = [], hangingCarpets = [], catPositionRef, ratPositions, npcPositions, playerPosition, isSprinting, showCityWalls = true }) => {
  const district = getDistrictType(mapX, mapY);
  const groundSeed = seededRandom(mapX * 1000 + mapY * 13 + 7);
  const terrainSeed = mapX * 1000 + mapY * 13 + 19;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  // City walls only appear on certain perimeter districts, and even then randomly
  const wallSeed = mapX * 73 + mapY * 137;
  const wallRoll = ((wallSeed % 100) / 100);
  const isPerimeterDistrict = district === 'OUTSKIRTS_DESERT' || district === 'OUTSKIRTS_FARMLAND' ||
    district === 'SOUTHERN_ROAD' || district === 'CARAVANSERAI';
  const displayCityWalls = showCityWalls && isPerimeterDistrict && wallRoll > 0.4;

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
    let stairAdded = false;
    for (const building of buildings) {
      const buildingSeed = building.position[0] * 1000 + building.position[2] + 5000;
      const preferredStairSide = ((building.doorSide + 2) % 4) as 0 | 1 | 2 | 3;
      const buildingClimbables = generateClimbablesForBuilding(building, district, buildingSeed, {
        allowStairs: !stairAdded,
        preferStairSide: preferredStairSide
      });
      if (!stairAdded && buildingClimbables.some((item) => item.type === 'STONE_STAIRCASE')) {
        stairAdded = true;
      }
      allClimbables.push(...buildingClimbables);
    }

    // Store for rendering and pass to callback
    setClimbablesForRendering(allClimbables);
    onClimbablesGenerated?.(allClimbables);
  }, [onBuildingsGenerated, onClimbablesGenerated, district]);

  return (
    <HoverWireframeContext.Provider value={enableHoverWireframe}>
      <HoverLabelContext.Provider value={enableHoverLabel}>
        <group>
          <EnvironmentBase
            mapX={mapX}
            mapY={mapY}
            district={district}
            groundSeed={groundSeed}
            terrainSeed={terrainSeed}
            timeOfDay={timeOfDay}
            fogColor={fogColor}
            heightmap={heightmap}
            nearBuildingId={nearBuildingId}
            torchIntensity={torchIntensity}
            nightFactor={nightFactor}
            showCityWalls={displayCityWalls}
            onGroundClick={onGroundClick}
            onHeightmapBuilt={onHeightmapBuilt}
            onBuildingsGenerated={handleBuildingsGenerated}
            sessionSeed={sessionSeed}
            climbables={climbablesForRendering}
            isSprinting={isSprinting}
            GroundComponent={Ground}
            BuildingsComponent={Buildings}
          />
          <EnvironmentDistricts
            mapX={mapX}
            mapY={mapY}
            timeOfDay={timeOfDay}
            terrainSeed={terrainSeed}
            heightmap={heightmap}
            buildingPositions={buildingPositions}
            playerPosition={playerPosition}
            catPositionRef={catPositionRef}
            ratPositions={ratPositions}
            npcPositions={npcPositions}
            isSprinting={isSprinting}
            onTreePositionsGenerated={onTreePositionsGenerated}
          />
          <EnvironmentDecor
            pushables={pushables}
            laundryLines={laundryLines}
            hangingCarpets={hangingCarpets}
            time={time}
          />
          <EnvironmentFauna
            mapX={mapX}
            mapY={mapY}
            npcPositions={npcPositions}
            playerPosition={playerPosition}
          />
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
