import * as THREE from 'three';

export type PushableKind = 'bench' | 'clayJar' | 'geranium' | 'interior';
export type PushableMaterial = 'stone' | 'wood' | 'ceramic' | 'cloth';

export interface PushableObject {
  id: string;
  kind: PushableKind;
  material: PushableMaterial;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  mass: number;
  rotation?: number;
  sourceId?: string;
}

export const createPushable = (
  id: string,
  kind: PushableKind,
  position: [number, number, number],
  radius: number,
  mass: number,
  rotation = 0,
  material?: PushableMaterial
): PushableObject => ({
  id,
  kind,
  material: material ?? (kind === 'clayJar' || kind === 'geranium' ? 'ceramic' : 'stone'),
  position: new THREE.Vector3(position[0], position[1], position[2]),
  velocity: new THREE.Vector3(),
  radius,
  mass,
  rotation
});
