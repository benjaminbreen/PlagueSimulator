import * as THREE from 'three';
import { BuildingMetadata } from '../types';

export interface SpatialHash<T> {
  cellSize: number;
  buckets: Map<string, T[]>;
}

const keyFor = (x: number, z: number, cellSize: number) => {
  const ix = Math.floor(x / cellSize);
  const iz = Math.floor(z / cellSize);
  return `${ix},${iz}`;
};

export const buildBuildingHash = (buildings: BuildingMetadata[], cellSize = 12): SpatialHash<BuildingMetadata> => {
  const buckets = new Map<string, BuildingMetadata[]>();
  for (const b of buildings) {
    const key = keyFor(b.position[0], b.position[2], cellSize);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(b);
    else buckets.set(key, [b]);
  }
  return { cellSize, buckets };
};

export const queryNearbyBuildings = (pos: THREE.Vector3, hash: SpatialHash<BuildingMetadata>) => {
  const { cellSize, buckets } = hash;
  const ix = Math.floor(pos.x / cellSize);
  const iz = Math.floor(pos.z / cellSize);
  const results: BuildingMetadata[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = `${ix + dx},${iz + dz}`;
      const bucket = buckets.get(key);
      if (bucket) results.push(...bucket);
    }
  }
  return results;
};

export interface AgentSnapshot {
  id: string;
  state: number;
  pos: THREE.Vector3;
}

export const buildAgentHash = (agents: AgentSnapshot[], cellSize = 6): SpatialHash<AgentSnapshot> => {
  const buckets = new Map<string, AgentSnapshot[]>();
  for (const agent of agents) {
    const key = keyFor(agent.pos.x, agent.pos.z, cellSize);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(agent);
    else buckets.set(key, [agent]);
  }
  return { cellSize, buckets };
};

export const queryNearbyAgents = (pos: THREE.Vector3, hash: SpatialHash<AgentSnapshot>) => {
  const { cellSize, buckets } = hash;
  const ix = Math.floor(pos.x / cellSize);
  const iz = Math.floor(pos.z / cellSize);
  const results: AgentSnapshot[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = `${ix + dx},${iz + dz}`;
      const bucket = buckets.get(key);
      if (bucket) results.push(...bucket);
    }
  }
  return results;
};
