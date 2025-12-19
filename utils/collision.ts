import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS, Obstacle } from '../types';
import { SpatialHash, queryNearbyBuildings } from './spatial';

export const isBlockedByBuildings = (
  position: THREE.Vector3,
  buildings: BuildingMetadata[],
  radius = 0.6,
  hash?: SpatialHash<BuildingMetadata>
) => {
  const half = CONSTANTS.BUILDING_SIZE / 2;
  const candidates = hash ? queryNearbyBuildings(position, hash) : buildings;
  for (const b of candidates) {
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
  radius = 0.6
) => {
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
