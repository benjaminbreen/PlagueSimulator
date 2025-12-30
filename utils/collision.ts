import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS, Obstacle } from '../types';
import { SpatialHash, queryNearbyBuildings } from './spatial';
import { getBuildingHeight } from './buildingHeights';

/**
 * Calculate building height - matches the calculation in Environment.tsx and climbables.ts
 */
function getBuildingRoofHeight(building: BuildingMetadata): number {
  return getBuildingHeight(building, building.district);
}

export const isBlockedByBuildings = (
  position: THREE.Vector3,
  buildings: BuildingMetadata[],
  radius = 0.6,
  hash?: SpatialHash<BuildingMetadata>
) => {
  const candidates = hash ? queryNearbyBuildings(position, hash) : buildings;
  for (const b of candidates) {
    const half = (CONSTANTS.BUILDING_SIZE * (b.sizeScale ?? 1)) / 2;
    const dx = Math.abs(position.x - b.position[0]);
    const dz = Math.abs(position.z - b.position[2]);
    if (dx < half + radius && dz < half + radius) {
      if (b.hasCourtyard) {
        const courtyardScale = b.courtyardScale ?? 0.55;
        const courtyardHalf = half * courtyardScale;
        const relX = position.x - b.position[0];
        const relZ = position.z - b.position[2];
        const gateWidth = Math.min(half * 0.7, half - 0.2);
        const gateDepth = half * 0.6;
        const absX = Math.abs(relX);
        const absZ = Math.abs(relZ);

        // Inside courtyard: no block
        if (absX < courtyardHalf && absZ < courtyardHalf) {
          return false;
        }

        // Gate corridor: allow entry
        if (b.doorSide === 0 && relZ > half - gateDepth && absX < gateWidth / 2) return false;
        if (b.doorSide === 2 && relZ < -half + gateDepth && absX < gateWidth / 2) return false;
        if (b.doorSide === 1 && relX > half - gateDepth && absZ < gateWidth / 2) return false;
        if (b.doorSide === 3 && relX < -half + gateDepth && absZ < gateWidth / 2) return false;
      }

      // Calculate roof height using the same formula as Environment.tsx
      const roofHeight = getBuildingRoofHeight(b);

      // Only block if player is BELOW roof level (not on rooftop)
      // Add tolerance (1.0 units) to match Player.tsx roof detection
      if (position.y < roofHeight - 1.0) {
        return true;
      }
      // Player is at or above roof level - don't block (they're on the roof)
    }
  }
  return false;
};

export const isBlockedByObstacles = (
  position: THREE.Vector3,
  obstacles: Obstacle[],
  radius = 0.6,
  hash?: SpatialHash<Obstacle>
) => {
  const OBSTACLE_HASH_MIN = 32;
  if (hash && obstacles.length >= OBSTACLE_HASH_MIN) {
    const { cellSize, buckets } = hash;
    const maxRadius = hash.maxRadius ?? 0;
    const cellRange = Math.max(1, Math.ceil((radius + maxRadius) / cellSize));
    const ix = Math.floor(position.x / cellSize);
    const iz = Math.floor(position.z / cellSize);
    for (let dxCell = -cellRange; dxCell <= cellRange; dxCell++) {
      for (let dzCell = -cellRange; dzCell <= cellRange; dzCell++) {
        const key = `${ix + dxCell},${iz + dzCell}`;
        const bucket = buckets.get(key);
        if (!bucket) continue;
        for (const obstacle of bucket) {
          const dx = position.x - obstacle.position[0];
          const dz = position.z - obstacle.position[2];
          const distSq = dx * dx + dz * dz;
          const limit = obstacle.radius + radius;
          if (distSq < limit * limit) {
            return true;
          }
        }
      }
    }
    return false;
  }
  for (const obstacle of obstacles) {
    const dx = position.x - obstacle.position[0];
    const dz = position.z - obstacle.position[2];
    const distSq = dx * dx + dz * dz;
    const limit = obstacle.radius + radius;
    if (distSq < limit * limit) {
      return true;
    }
  }
  return false;
};
