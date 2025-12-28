/**
 * Climbables Utility - Procedural placement and collision detection
 * for climbable outdoor accessories (ladders, staircases, trellises, etc.)
 */

import {
  ClimbableType,
  ClimbableAccessory,
  CLIMBABLE_CONFIG,
  BuildingMetadata,
  BuildingType,
  DistrictType,
  CONSTANTS,
} from '../types';
import { seededRandom } from './procedural';

// ==================== PLACEMENT RULES ====================

interface ClimbableRule {
  type: ClimbableType;
  probability: number;           // 0-1 chance to spawn
  minStories: number;            // Minimum building stories required
  maxPerBuilding: number;        // Max of this type per building
}

// District-specific climbable rules
const DISTRICT_RULES: Record<DistrictType, ClimbableRule[]> = {
  WEALTHY: [
    { type: 'STONE_STAIRCASE', probability: 0.7, minStories: 2, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.8, minStories: 1, maxPerBuilding: 2 },
    { type: 'MASHRABIYA', probability: 0.6, minStories: 2, maxPerBuilding: 2 },
  ],
  RESIDENTIAL: [
    { type: 'STONE_STAIRCASE', probability: 0.4, minStories: 2, maxPerBuilding: 1 },
    { type: 'WOODEN_LADDER', probability: 0.5, minStories: 1, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.6, minStories: 1, maxPerBuilding: 2 },
  ],
  HOVELS: [
    { type: 'WOODEN_LADDER', probability: 0.6, minStories: 1, maxPerBuilding: 2 },
    { type: 'LEAN_TO', probability: 0.3, minStories: 1, maxPerBuilding: 1 },
  ],
  ALLEYS: [
    { type: 'WOODEN_LADDER', probability: 0.6, minStories: 1, maxPerBuilding: 2 },
    { type: 'LEAN_TO', probability: 0.4, minStories: 1, maxPerBuilding: 1 },
  ],
  JEWISH_QUARTER: [
    { type: 'STONE_STAIRCASE', probability: 0.5, minStories: 2, maxPerBuilding: 1 },
    { type: 'WOODEN_LADDER', probability: 0.5, minStories: 1, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.5, minStories: 1, maxPerBuilding: 2 },
  ],
  MARKET: [
    { type: 'WOODEN_LADDER', probability: 0.4, minStories: 1, maxPerBuilding: 1 },
    { type: 'LEAN_TO', probability: 0.5, minStories: 1, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.3, minStories: 1, maxPerBuilding: 1 },
  ],
  CIVIC: [
    { type: 'STONE_STAIRCASE', probability: 0.6, minStories: 2, maxPerBuilding: 1 },
    { type: 'MASHRABIYA', probability: 0.4, minStories: 2, maxPerBuilding: 1 },
  ],
  SALHIYYA: [
    { type: 'STONE_STAIRCASE', probability: 0.5, minStories: 2, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.7, minStories: 1, maxPerBuilding: 2 },
  ],
  OUTSKIRTS_FARMLAND: [
    { type: 'WOODEN_LADDER', probability: 0.7, minStories: 1, maxPerBuilding: 1 },
    { type: 'LEAN_TO', probability: 0.4, minStories: 1, maxPerBuilding: 1 },
  ],
  OUTSKIRTS_DESERT: [
    { type: 'WOODEN_LADDER', probability: 0.5, minStories: 1, maxPerBuilding: 1 },
  ],
  MOUNTAIN_SHRINE: [
    { type: 'STONE_STAIRCASE', probability: 0.8, minStories: 1, maxPerBuilding: 1 },
  ],
  CARAVANSERAI: [
    { type: 'STONE_STAIRCASE', probability: 0.5, minStories: 2, maxPerBuilding: 1 },
    { type: 'WOODEN_LADDER', probability: 0.6, minStories: 1, maxPerBuilding: 2 },
  ],
  SOUTHERN_ROAD: [
    { type: 'WOODEN_LADDER', probability: 0.4, minStories: 1, maxPerBuilding: 1 },
    { type: 'LEAN_TO', probability: 0.3, minStories: 1, maxPerBuilding: 1 },
  ],
  CHRISTIAN_QUARTER: [
    { type: 'STONE_STAIRCASE', probability: 0.5, minStories: 2, maxPerBuilding: 1 },
    { type: 'WOODEN_LADDER', probability: 0.5, minStories: 1, maxPerBuilding: 1 },
    { type: 'GRAPE_TRELLIS', probability: 0.6, minStories: 1, maxPerBuilding: 2 },
  ],
  UMAYYAD_MOSQUE: [
    { type: 'STONE_STAIRCASE', probability: 0.4, minStories: 2, maxPerBuilding: 1 },
    { type: 'WOODEN_LADDER', probability: 0.3, minStories: 1, maxPerBuilding: 1 },
  ],
};

// ==================== PLACEMENT ALGORITHM ====================

/**
 * Pick a wall side that's not the door side
 */
function pickNonDoorSide(doorSide: number, rand: () => number): 0 | 1 | 2 | 3 {
  const candidates = [0, 1, 2, 3].filter(s => s !== doorSide) as (0 | 1 | 2 | 3)[];
  return candidates[Math.floor(rand() * candidates.length)];
}

/**
 * Calculate world position for a climbable on a building wall
 */
function calculateWallPosition(
  building: BuildingMetadata,
  wallSide: 0 | 1 | 2 | 3,
  wallOffset: number,
  depth: number
): [number, number, number] {
  const buildingSize = CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1);
  const halfSize = buildingSize / 2;
  const [bx, , bz] = building.position;

  // Calculate position based on wall side
  switch (wallSide) {
    case 0: // North (+Z)
      return [bx + wallOffset * halfSize * 0.7, 0, bz + halfSize + depth / 2];
    case 1: // East (+X)
      return [bx + halfSize + depth / 2, 0, bz + wallOffset * halfSize * 0.7];
    case 2: // South (-Z)
      return [bx + wallOffset * halfSize * 0.7, 0, bz - halfSize - depth / 2];
    case 3: // West (-X)
      return [bx - halfSize - depth / 2, 0, bz + wallOffset * halfSize * 0.7];
    default:
      return [bx, 0, bz + halfSize + depth / 2];
  }
}

/**
 * Create a climbable accessory for a building
 */
function createClimbable(
  building: BuildingMetadata,
  type: ClimbableType,
  wallSide: 0 | 1 | 2 | 3,
  wallOffset: number,
  buildingHeight: number,
  seed: number
): ClimbableAccessory {
  const config = CLIMBABLE_CONFIG[type];
  const rand = () => seededRandom(seed++);

  // Vary dimensions slightly
  const width = config.baseWidth * (0.9 + rand() * 0.2);
  const height = Math.min(config.baseHeight, buildingHeight - 0.5);
  const depth = config.baseDepth;

  const basePosition = calculateWallPosition(building, wallSide, wallOffset, depth);

  // For staircases, top position is offset by stair depth (they extend outward)
  const isStaircase = type === 'STONE_STAIRCASE' || type === 'LEAN_TO';
  const stairTopOffset = isStaircase ? depth * 0.8 : 0;

  let topX = basePosition[0];
  let topZ = basePosition[2];

  // Stairs extend OUTWARD from building (away from wall) - same direction player moves
  if (isStaircase) {
    switch (wallSide) {
      case 0: topZ += stairTopOffset; break; // North wall - stairs extend north (away from building)
      case 1: topX += stairTopOffset; break; // East wall - stairs extend east (away from building)
      case 2: topZ -= stairTopOffset; break; // South wall - stairs extend south (away from building)
      case 3: topX -= stairTopOffset; break; // West wall - stairs extend west (away from building)
    }
  }

  const topPosition: [number, number, number] = [topX, basePosition[1] + height, topZ];

  return {
    id: `climbable-${building.id}-${type}-${wallSide}`,
    type,
    buildingId: building.id,
    wallSide,
    wallOffset,
    basePosition,
    topPosition,
    width,
    height,
    depth,
    climbSpeed: config.climbSpeed,
    requiresHold: config.requiresHold,
  };
}

/**
 * Calculate building height (matches Environment.tsx logic)
 */
function calculateBuildingHeight(building: BuildingMetadata, district: DistrictType): number {
  const storyCount = building.storyCount ?? 1;
  const baseHeight = 3.0 + storyCount * 2.5;

  // District multipliers
  const districtMult =
    district === 'WEALTHY' ? 1.35 :
    district === 'HOVELS' ? 0.65 :
    district === 'CIVIC' ? 1.2 :
    1.0;

  return baseHeight * districtMult * (building.sizeScale ?? 1);
}

/**
 * Generate all climbable accessories for a building
 */
export function generateClimbablesForBuilding(
  building: BuildingMetadata,
  district: DistrictType,
  seed: number
): ClimbableAccessory[] {
  const accessories: ClimbableAccessory[] = [];
  const rules = DISTRICT_RULES[district] || DISTRICT_RULES.RESIDENTIAL;
  const buildingHeight = calculateBuildingHeight(building, district);
  const storyCount = building.storyCount ?? 1;

  let localSeed = seed;
  const rand = () => seededRandom(localSeed++);

  // Track used wall sides to avoid overlap
  const usedSides = new Set<number>();
  usedSides.add(building.doorSide); // Never place on door side

  for (const rule of rules) {
    // Check story requirement
    if (storyCount < rule.minStories) continue;

    // Roll for probability
    if (rand() > rule.probability) continue;

    // Check if we can place more of this type
    const existingOfType = accessories.filter(a => a.type === rule.type).length;
    if (existingOfType >= rule.maxPerBuilding) continue;

    // Find an available wall side
    const availableSides = [0, 1, 2, 3].filter(s => !usedSides.has(s));
    if (availableSides.length === 0) continue;

    const wallSide = availableSides[Math.floor(rand() * availableSides.length)] as 0 | 1 | 2 | 3;
    const wallOffset = (rand() - 0.5) * 0.6; // Spread along wall

    const accessory = createClimbable(
      building,
      rule.type,
      wallSide,
      wallOffset,
      buildingHeight,
      localSeed
    );

    accessories.push(accessory);

    // Mark side as used (except for trellises which can stack)
    if (rule.type !== 'GRAPE_TRELLIS') {
      usedSides.add(wallSide);
    }
  }

  return accessories;
}

// ==================== COLLISION DETECTION ====================

/**
 * Find nearest climbable within interaction range
 */
export function findNearbyClimbable(
  playerPosition: { x: number; y: number; z: number },
  playerFacing: number, // Rotation in radians (rotation.y, 0 = facing +Z)
  climbables: ClimbableAccessory[],
  maxDistance: number = 1.5,
  fromRooftop: boolean = false // Allow detection from top of climbable for descent
): ClimbableAccessory | null {
  let nearest: ClimbableAccessory | null = null;
  let nearestDist = maxDistance;

  for (const climbable of climbables) {
    // Check from base position (ground) or top position (roof)
    const checkPos = fromRooftop ? climbable.topPosition : climbable.basePosition;
    const [cx, cy, cz] = checkPos;

    const dx = cx - playerPosition.x;
    const dz = cz - playerPosition.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // For rooftop descent, also check vertical distance
    if (fromRooftop) {
      const dy = Math.abs(cy - playerPosition.y);
      if (dy > 1.5) continue; // Too far vertically from roof edge
    }

    if (horizontalDist >= nearestDist) continue;

    // Check if player is facing the climbable
    // playerFacing uses rotation.y convention: 0 = +Z, PI/2 = -X, PI = -Z, -PI/2 = +X
    // We need angle from player TO climbable in same convention
    const angleToClimbable = Math.atan2(-dx, -dz); // Negated to match rotation.y convention

    let angleDiff = angleToClimbable - playerFacing;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) < Math.PI / 2) { // Within 90 degree cone
      nearest = climbable;
      nearestDist = horizontalDist;
    }
  }

  return nearest;
}

/**
 * Check if player is on a rooftop
 */
export function isOnRooftop(
  position: { x: number; y: number; z: number },
  buildings: BuildingMetadata[],
  district: DistrictType
): BuildingMetadata | null {
  for (const building of buildings) {
    const buildingSize = CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1);
    const halfSize = buildingSize / 2;
    const [bx, , bz] = building.position;
    const roofHeight = calculateBuildingHeight(building, district);

    // Check if within building bounds
    const dx = Math.abs(position.x - bx);
    const dz = Math.abs(position.z - bz);

    if (dx < halfSize && dz < halfSize) {
      // Check if at roof height (within 0.5 units)
      const heightDiff = Math.abs(position.y - roofHeight);
      if (heightDiff < 0.5) {
        return building;
      }
    }
  }

  return null;
}

/**
 * Get roof height for a building at a world position
 */
export function getRoofHeightAt(
  position: { x: number; z: number },
  buildings: BuildingMetadata[],
  district: DistrictType
): number | null {
  for (const building of buildings) {
    const buildingSize = CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1);
    const halfSize = buildingSize / 2;
    const [bx, , bz] = building.position;

    // Check if within building bounds
    const dx = Math.abs(position.x - bx);
    const dz = Math.abs(position.z - bz);

    if (dx < halfSize && dz < halfSize) {
      return calculateBuildingHeight(building, district);
    }
  }

  return null;
}

/**
 * Check if player is near edge of a rooftop (for falling)
 */
export function isNearRoofEdge(
  position: { x: number; z: number },
  building: BuildingMetadata,
  edgeThreshold: number = 0.5
): boolean {
  const buildingSize = CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1);
  const halfSize = buildingSize / 2;
  const [bx, , bz] = building.position;

  const dx = Math.abs(position.x - bx);
  const dz = Math.abs(position.z - bz);

  // Near edge if within threshold of building boundary
  return dx > halfSize - edgeThreshold || dz > halfSize - edgeThreshold;
}

// ==================== SPATIAL HASH ====================

/**
 * Spatial hash for O(1) climbable lookup
 * Divides world into grid cells; each cell contains climbables whose base or top is nearby
 */
export class ClimbableSpatialHash {
  private cellSize: number;
  private cells: Map<string, ClimbableAccessory[]> = new Map();
  private climbables: ClimbableAccessory[] = [];

  constructor(cellSize: number = 5.0) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  /**
   * Build the spatial hash from a list of climbables
   */
  build(climbables: ClimbableAccessory[]): void {
    this.cells.clear();
    this.climbables = climbables;

    for (const climbable of climbables) {
      // Add to cell containing base position
      const [baseX, , baseZ] = climbable.basePosition;
      const baseKey = this.getCellKey(baseX, baseZ);
      if (!this.cells.has(baseKey)) {
        this.cells.set(baseKey, []);
      }
      this.cells.get(baseKey)!.push(climbable);

      // Also add to cell containing top position (may be same cell)
      const [topX, , topZ] = climbable.topPosition;
      const topKey = this.getCellKey(topX, topZ);
      if (topKey !== baseKey) {
        if (!this.cells.has(topKey)) {
          this.cells.set(topKey, []);
        }
        this.cells.get(topKey)!.push(climbable);
      }
    }
  }

  /**
   * Get climbables near a position (checks current cell + 8 neighbors)
   */
  getNearby(x: number, z: number): ClimbableAccessory[] {
    const result: ClimbableAccessory[] = [];
    const seen = new Set<string>();

    // Check 3x3 grid of cells around position
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const climbable of cell) {
            if (!seen.has(climbable.id)) {
              seen.add(climbable.id);
              result.push(climbable);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Get all climbables (for fallback)
   */
  getAll(): ClimbableAccessory[] {
    return this.climbables;
  }
}

/**
 * Find nearby climbable using spatial hash (faster version)
 */
export function findNearbyClimbableFast(
  playerPosition: { x: number; y: number; z: number },
  playerFacing: number,
  spatialHash: ClimbableSpatialHash,
  maxDistance: number = 1.5,
  fromRooftop: boolean = false
): ClimbableAccessory | null {
  const nearby = spatialHash.getNearby(playerPosition.x, playerPosition.z);
  return findNearbyClimbable(playerPosition, playerFacing, nearby, maxDistance, fromRooftop);
}
