import * as THREE from 'three';

export type PushableKind = 'bench' | 'clayJar' | 'geranium' | 'basket' | 'olivePot' | 'lemonPot' | 'palmPot' | 'bougainvilleaPot' | 'coin' | 'olive' | 'lemon' | 'potteryShard' | 'linenScrap' | 'candleStub' | 'twine' | 'interior' | 'boulder' | 'crate' | 'amphora' | 'droppedItem';
export type PushableMaterial = 'stone' | 'wood' | 'ceramic' | 'cloth' | 'metal';

export interface PickupInfo {
  type: 'coin' | 'item' | 'produce';
  label: string;
  itemId?: string;
  value?: number;
}

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
  pickup?: PickupInfo;
  appearance?: import('../types').ItemAppearance;
  angularVelocity?: THREE.Vector3;  // For rolling rotation (boulders)
  isSleeping?: boolean;              // Performance optimization (boulders)
  lastSlopeCheck?: number;           // Throttle gradient calculations (boulders)
  potStyle?: number;                 // 0-2 for pot style variation
  potSize?: number;                  // 0.7-1.3 scale multiplier
  isShattered?: boolean;             // For ceramic objects - becomes true when hit hard
  shatterTime?: number;              // Timestamp when shattered (for visual effects)
}

export const createPushable = (
  id: string,
  kind: PushableKind,
  position: [number, number, number],
  radius: number,
  mass: number,
  rotation = 0,
  material?: PushableMaterial,
  appearance?: import('../types').ItemAppearance
): PushableObject => ({
  id,
  kind,
  material: material ?? (
    kind === 'clayJar' || kind === 'geranium' || kind === 'amphora' ? 'ceramic' :
    kind === 'crate' || kind === 'basket' ? 'wood' :
    'stone'
  ),
  position: new THREE.Vector3(position[0], position[1], position[2]),
  velocity: new THREE.Vector3(),
  radius,
  mass,
  rotation,
  appearance
});
