import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS } from '../types';
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
