import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS, Obstacle } from '../types';
import { SpatialHash, queryNearbyBuildings } from './spatial';

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
      return true;
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
