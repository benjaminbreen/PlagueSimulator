import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS, Obstacle } from '../types';
import { SpatialHash, queryNearbyBuildings } from './spatial';
import { seededRandom } from './procedural';

/**
 * Calculate building height - matches the calculation in Environment.tsx and climbables.ts
 */
function getBuildingRoofHeight(building: BuildingMetadata): number {
  const district = building.district ?? 'RESIDENTIAL';
  const localSeed = building.position[0] * 1000 + building.position[2];

  // This matches the Building component in Environment.tsx
  const baseHeight = district === 'HOVELS' && building.type !== 'RELIGIOUS' && building.type !== 'CIVIC'
    ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
    : building.type === 'RELIGIOUS' || building.type === 'CIVIC' ? 12 : 4 + seededRandom(localSeed + 1) * 6;

  const districtScale =
    district === 'WEALTHY' ? 1.35 :
    district === 'HOVELS' ? 0.65 :
    district === 'CIVIC' ? 1.2 :
    1.0;

  return baseHeight * districtScale;
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
