/**
 * Placement utilities for procedural object positioning
 * Seeded random helpers, spacing checks, and clustering algorithms
 */

import * as THREE from 'three';
import { seededRandom } from '../../utils/procedural';
import { sampleTerrainHeight, TerrainHeightmap } from '../../utils/terrain';
import { PlacementConstraint, SpatialCell } from './types';

// ==================== SEEDED RANDOM UTILITIES ====================

/**
 * Pick a random element from an array using seeded random
 */
export const pickRandom = <T>(array: T[], seed: number): T => {
  const index = Math.floor(seededRandom(seed) * array.length);
  return array[index];
};

/**
 * Pick multiple random elements from an array
 */
export const pickRandomMultiple = <T>(
  array: T[],
  count: number,
  seed: number
): T[] => {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    results.push(pickRandom(array, seed + i));
  }
  return results;
};

/**
 * Shuffle an array using seeded random
 */
export const shuffleArray = <T>(array: T[], seed: number): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Generate a random position within bounds
 */
export const randomPosition = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  seed: number
): [number, number, number] => {
  const x = bounds.minX + seededRandom(seed) * (bounds.maxX - bounds.minX);
  const z = bounds.minZ + seededRandom(seed + 1) * (bounds.maxZ - bounds.minZ);
  return [x, 0, z];
};

/**
 * Generate random rotation (0 to 2π)
 */
export const randomRotation = (seed: number): number => {
  return seededRandom(seed) * Math.PI * 2;
};

/**
 * Generate random scale within range
 */
export const randomScale = (min: number, max: number, seed: number): number => {
  return min + seededRandom(seed) * (max - min);
};

// ==================== DISTANCE & SPACING ====================

/**
 * Calculate 2D distance between two points (ignoring Y)
 */
export const distance2D = (
  p1: [number, number, number],
  p2: [number, number, number]
): number => {
  const dx = p1[0] - p2[0];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dz * dz);
};

/**
 * Check if a position is far enough from all existing positions
 */
export const checkMinDistance = (
  position: [number, number, number],
  existingPositions: [number, number, number][],
  minDistance: number
): boolean => {
  for (const existing of existingPositions) {
    if (distance2D(position, existing) < minDistance) {
      return false;
    }
  }
  return true;
};

/**
 * Find all positions within a radius
 */
export const findNearby = (
  position: [number, number, number],
  positions: [number, number, number][],
  radius: number
): [number, number, number][] => {
  return positions.filter((p) => distance2D(position, p) <= radius);
};

// ==================== SPATIAL GRID ====================

/**
 * Create a spatial grid for efficient proximity queries
 */
export class SpatialGrid {
  private grid: Map<string, SpatialCell>;
  private cellSize: number;

  constructor(cellSize: number = 5.0) {
    this.grid = new Map();
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Add an object to the grid
   */
  add(id: string, position: [number, number, number]): void {
    const key = this.getCellKey(position[0], position[2]);
    const cell = this.grid.get(key) || {
      x: Math.floor(position[0] / this.cellSize),
      z: Math.floor(position[2] / this.cellSize),
      occupied: false,
      occupants: []
    };
    cell.occupied = true;
    cell.occupants.push(id);
    this.grid.set(key, cell);
  }

  /**
   * Check if a cell is occupied
   */
  isOccupied(position: [number, number, number]): boolean {
    const key = this.getCellKey(position[0], position[2]);
    const cell = this.grid.get(key);
    return cell ? cell.occupied : false;
  }

  /**
   * Get all objects in nearby cells
   */
  getNearby(position: [number, number, number], radius: number): string[] {
    const results: string[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(position[0] / this.cellSize);
    const centerZ = Math.floor(position[2] / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerX + dx},${centerZ + dz}`;
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell.occupants);
        }
      }
    }

    return results;
  }
}

// ==================== TERRAIN-AWARE PLACEMENT ====================

/**
 * Get terrain-adjusted position using heightmap
 */
export const getTerrainPosition = (
  x: number,
  z: number,
  heightmap?: TerrainHeightmap,
  yOffset: number = 0
): [number, number, number] => {
  if (!heightmap) {
    return [x, yOffset, z];
  }

  const y = sampleTerrainHeight(heightmap, x, z) + yOffset;
  return [x, y, z];
};

/**
 * Calculate slope at a position (returns angle in radians)
 */
export const calculateSlope = (
  x: number,
  z: number,
  heightmap?: TerrainHeightmap,
  sampleDistance: number = 0.5
): number => {
  if (!heightmap) return 0;

  const h0 = sampleTerrainHeight(heightmap, x, z);
  const hN = sampleTerrainHeight(heightmap, x, z + sampleDistance);
  const hS = sampleTerrainHeight(heightmap, x, z - sampleDistance);
  const hE = sampleTerrainHeight(heightmap, x + sampleDistance, z);
  const hW = sampleTerrainHeight(heightmap, x - sampleDistance, z);

  const slopeZ = (hN - hS) / (2 * sampleDistance);
  const slopeX = (hE - hW) / (2 * sampleDistance);

  return Math.atan(Math.sqrt(slopeX * slopeX + slopeZ * slopeZ));
};

/**
 * Check if a position meets placement constraints
 */
export const meetsConstraints = (
  position: [number, number, number],
  constraint: PlacementConstraint,
  heightmap?: TerrainHeightmap
): boolean => {
  // Check slope if required
  if (constraint.requiresFlat || constraint.maxSlope !== undefined) {
    const slope = calculateSlope(position[0], position[2], heightmap);
    const maxSlope = constraint.maxSlope ?? 0.1;
    if (slope > maxSlope) {
      return false;
    }
  }

  return true;
};

// ==================== CLUSTERING & DISTRIBUTION ====================

/**
 * Generate clustered positions (Poisson disc sampling approximation)
 */
export const generateClusteredPositions = (
  count: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  minDistance: number,
  seed: number,
  maxAttempts: number = 30
): [number, number, number][] => {
  const positions: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let placed = false;

    while (attempts < maxAttempts && !placed) {
      const candidate = randomPosition(bounds, seed + i * 1000 + attempts);

      if (checkMinDistance(candidate, positions, minDistance)) {
        positions.push(candidate);
        placed = true;
      }

      attempts++;
    }
  }

  return positions;
};

/**
 * Generate positions around a center point
 */
export const generateRadialPositions = (
  center: [number, number, number],
  count: number,
  minRadius: number,
  maxRadius: number,
  seed: number
): [number, number, number][] => {
  const positions: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(seed + i * 2) * Math.PI * 2;
    const radius = minRadius + seededRandom(seed + i * 2 + 1) * (maxRadius - minRadius);

    const x = center[0] + Math.cos(angle) * radius;
    const z = center[2] + Math.sin(angle) * radius;

    positions.push([x, center[1], z]);
  }

  return positions;
};

/**
 * Generate positions along a path/line
 */
export const generatePathPositions = (
  start: [number, number, number],
  end: [number, number, number],
  spacing: number,
  randomOffset: number = 0,
  seed: number = 0
): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const count = Math.floor(length / spacing);

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = start[0] + dx * t;
    const z = start[2] + dz * t;

    // Add random offset perpendicular to path
    if (randomOffset > 0) {
      const perpX = -dz / length;
      const perpZ = dx / length;
      const offset = (seededRandom(seed + i) - 0.5) * randomOffset * 2;

      positions.push([
        x + perpX * offset,
        start[1],
        z + perpZ * offset
      ]);
    } else {
      positions.push([x, start[1], z]);
    }
  }

  return positions;
};

// ==================== ANCHOR POINTS ====================

/**
 * Find anchor points on building walls
 */
export const findWallAnchors = (
  buildingPosition: [number, number, number],
  buildingSize: { width: number; depth: number },
  buildingRotation: number,
  count: number = 4
): [number, number, number][] => {
  const anchors: [number, number, number][] = [];
  const hw = buildingSize.width / 2;
  const hd = buildingSize.depth / 2;

  // Generate anchor points on each wall
  const cos = Math.cos(buildingRotation);
  const sin = Math.sin(buildingRotation);

  for (let i = 0; i < count; i++) {
    const side = i % 4;
    const offset = (i / count) * 2 - 1; // -1 to 1

    let localX = 0;
    let localZ = 0;

    switch (side) {
      case 0: // North wall
        localX = offset * hw;
        localZ = hd;
        break;
      case 1: // East wall
        localX = hw;
        localZ = offset * hd;
        break;
      case 2: // South wall
        localX = offset * hw;
        localZ = -hd;
        break;
      case 3: // West wall
        localX = -hw;
        localZ = offset * hd;
        break;
    }

    // Rotate and translate
    const worldX = buildingPosition[0] + localX * cos - localZ * sin;
    const worldZ = buildingPosition[2] + localX * sin + localZ * cos;

    anchors.push([worldX, buildingPosition[1], worldZ]);
  }

  return anchors;
};
