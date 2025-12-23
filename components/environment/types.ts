/**
 * Shared type definitions for environment components
 * Keeps component interfaces consistent and reusable
 */

import * as THREE from 'three';
import { DistrictType, BuildingMetadata } from '../../types';
import { TerrainHeightmap } from '../../utils/terrain';

// ==================== DISTRICT DECOR PROPS ====================

/**
 * Common props passed to all district decoration components
 */
export interface DistrictDecorProps {
  /** Map X coordinate (seed for procedural generation) */
  mapX: number;
  /** Map Y coordinate (seed for procedural generation) */
  mapY: number;
  /** District type */
  district: DistrictType;
  /** Optional heightmap for terrain-following placement */
  heightmap?: TerrainHeightmap;
  /** Time of day (0-1, where 0.5 is noon) */
  timeOfDay?: number;
}

// ==================== TREE/FOLIAGE TYPES ====================

/**
 * Tree instance data for rendering
 */
export interface TreeInstance {
  position: [number, number, number];
  scale: number;
  rotation: number;
  /** Optional species override */
  species?: 'palm' | 'olive' | 'cypress' | 'pine';
}

/**
 * Foliage patch data
 */
export interface FoliagePatch {
  position: [number, number, number];
  count: number;
  radius: number;
  species: 'grass' | 'shrub' | 'flower';
}

// ==================== DECORATION TYPES ====================

/**
 * Generic decoration instance
 */
export interface DecorationInstance {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  scale?: number;
  variant?: number;
}

/**
 * Market stall data
 */
export interface MarketStall {
  id: string;
  position: [number, number, number];
  rotation: number;
  awningColor: string;
  merchandiseType: 'bread' | 'dates' | 'fabric' | 'spices' | 'pottery' | 'produce';
  /** NPC merchant associated with this stall */
  merchantId?: string;
}

/**
 * Fountain configuration
 */
export interface FountainConfig {
  position: [number, number, number];
  size: number;
  waterLevel: number;
  jetCount: number;
  basinRadius: number;
}

// ==================== BUILDING TYPES ====================

/**
 * Extended building data with rendering info
 */
export interface BuildingRenderData extends BuildingMetadata {
  /** Computed color based on district/wealth */
  color: string;
  /** Whether building has been hovered */
  isHovered?: boolean;
  /** Building-specific decorations */
  decorations?: DecorationInstance[];
}

/**
 * Wall segment for building construction
 */
export interface WallSegment {
  start: [number, number, number];
  end: [number, number, number];
  height: number;
  thickness: number;
  hasDoor?: boolean;
  hasWindow?: boolean;
}

// ==================== LIGHTING TYPES ====================

/**
 * Light source instance
 */
export interface LightSource {
  position: [number, number, number];
  color: string;
  intensity: number;
  radius: number;
  type: 'torch' | 'lantern' | 'window' | 'fire';
}

/**
 * Shadow configuration
 */
export interface ShadowConfig {
  enabled: boolean;
  mapSize: number;
  camera: {
    near: number;
    far: number;
    fov: number;
  };
}

// ==================== PLACEMENT TYPES ====================

/**
 * Spatial grid cell for object placement
 */
export interface SpatialCell {
  x: number;
  z: number;
  occupied: boolean;
  occupants: string[];
}

/**
 * Placement constraint for procedural generation
 */
export interface PlacementConstraint {
  minDistance?: number;
  maxDistance?: number;
  avoidBuildings?: boolean;
  avoidPaths?: boolean;
  requiresFlat?: boolean;
  maxSlope?: number;
}

// ==================== TEXTURE TYPES ====================

/**
 * Procedural texture configuration
 */
export interface ProceduralTextureConfig {
  size: number;
  seed: number;
  type: 'noise' | 'grime' | 'blotch' | 'pattern';
  opacity?: number;
  color?: string;
}

// ==================== ANIMATION TYPES ====================

/**
 * Animation state for decorative elements
 */
export interface AnimationState {
  time: number;
  phase: number;
  speed: number;
  amplitude: number;
}

/**
 * Wind configuration for cloth/foliage animation
 */
export interface WindConfig {
  direction: THREE.Vector2;
  strength: number;
  gustFrequency: number;
  turbulence: number;
}

// ==================== HOVER/INTERACTION TYPES ====================

/**
 * Hover state for interactive objects
 */
export interface HoverState {
  isHovered: boolean;
  showWireframe: boolean;
  showLabel: boolean;
  color: string;
}

/**
 * Label configuration for hover tooltips
 */
export interface LabelConfig {
  title: string;
  lines?: string[];
  offset?: [number, number, number];
}

// ==================== CALLBACKS ====================

/**
 * Callback for tree position reporting (used for obstacle registration)
 */
export type TreePositionCallback = (trees: TreeInstance[]) => void;

/**
 * Callback for merchant interaction
 */
export type MerchantInteractionCallback = (merchantId: string, position: THREE.Vector3) => void;

// ==================== RENDERER TYPES ====================

/**
 * Render statistics for dev logging
 */
export interface RenderStats {
  district: DistrictType;
  buildings: number;
  decorations: number;
  trees: number;
  lights: number;
  triangles?: number;
}

/**
 * LOD (Level of Detail) configuration
 */
export interface LODConfig {
  near: { distance: number; detail: 'high' };
  medium: { distance: number; detail: 'medium' };
  far: { distance: number; detail: 'low' };
}
