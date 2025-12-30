import * as THREE from 'three';

export type PushableKind = 'bench' | 'clayJar' | 'geranium' | 'basket' | 'olivePot' | 'lemonPot' | 'palmPot' | 'bougainvilleaPot' | 'coin' | 'olive' | 'lemon' | 'potteryShard' | 'linenScrap' | 'candleStub' | 'twine' | 'interior' | 'boulder' | 'crate' | 'amphora' | 'droppedItem' | 'storageChest';
export type PushableMaterial = 'stone' | 'wood' | 'ceramic' | 'cloth' | 'metal';

// Break chances when pushed with force (shift + release)
export const BREAK_CHANCES: Partial<Record<PushableKind, number>> = {
  crate: 0.5,           // 50% chance - wooden crate
  amphora: 0.75,        // 75% chance - ceramic amphora
  clayJar: 0.75,        // 75% chance - ceramic jar
  geranium: 0.75,       // 75% chance - ceramic pot with plant
  olivePot: 0.75,       // 75% chance - ceramic pot
  lemonPot: 0.75,       // 75% chance - ceramic pot
  palmPot: 0.75,        // 75% chance - ceramic pot
  bougainvilleaPot: 0.75, // 75% chance - ceramic pot
};

// Check if an object can break
export const canBreak = (kind: PushableKind, material?: PushableMaterial): boolean => {
  if (kind in BREAK_CHANCES) return true;
  // Interior ceramic items (oil lamps, lanterns, etc.) can also break
  if (kind === 'interior' && material === 'ceramic') return true;
  return false;
};

// Get break chance for an object (0-1)
export const getBreakChance = (kind: PushableKind, material?: PushableMaterial): number => {
  if (kind in BREAK_CHANCES) return BREAK_CHANCES[kind] ?? 0;
  // Interior ceramic items have 75% break chance
  if (kind === 'interior' && material === 'ceramic') return 0.75;
  return 0;
};

// Display names for pushable kinds (for UI)
export const PUSHABLE_DISPLAY_NAMES: Record<PushableKind, string> = {
  bench: 'Stone Bench',
  clayJar: 'Clay Jar',
  geranium: 'Potted Geranium',
  basket: 'Wicker Basket',
  olivePot: 'Olive Tree Pot',
  lemonPot: 'Lemon Tree Pot',
  palmPot: 'Palm Pot',
  bougainvilleaPot: 'Bougainvillea Pot',
  coin: 'Coin',
  olive: 'Olive',
  lemon: 'Lemon',
  potteryShard: 'Pottery Shard',
  linenScrap: 'Linen Scrap',
  candleStub: 'Candle Stub',
  twine: 'Twine',
  interior: 'Object',
  boulder: 'Boulder',
  crate: 'Wooden Crate',
  amphora: 'Amphora',
  droppedItem: 'Item',
  storageChest: 'Storage Chest',
};

export const getPushableDisplayName = (kind: PushableKind): string => {
  return PUSHABLE_DISPLAY_NAMES[kind] || 'Object';
};

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

// Height of climbable pushable objects (for stepping onto them)
export const CLIMBABLE_PUSHABLE_HEIGHTS: Partial<Record<PushableKind, number>> = {
  crate: 0.9,      // Wooden crate
  bench: 0.5,      // Stone bench
  boulder: 0.8,    // Large boulder (variable, but average)
  amphora: 0.7,    // Large amphora
  storageChest: 0.6, // Storage chest
};

// Check if a pushable object can be climbed onto
export const isClimbablePushable = (kind: PushableKind): boolean => {
  return kind in CLIMBABLE_PUSHABLE_HEIGHTS;
};

// Get the height to step up to for a pushable
export const getPushableClimbHeight = (item: PushableObject): number => {
  const baseHeight = CLIMBABLE_PUSHABLE_HEIGHTS[item.kind] ?? 0;
  return item.position.y + baseHeight;
};

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

// Loot drop configuration
export const SHATTER_LOOT_CHANCE = 0.5; // 50% chance to drop loot
export const SHATTER_LOOT_MIN = 1;
export const SHATTER_LOOT_MAX = 2;

// Material types for dropped items based on their category
const ITEM_MATERIALS: Record<string, PushableMaterial> = {
  TEXTILE: 'cloth',
  APOTHECARY: 'ceramic',
  METALSMITH: 'metal',
  TRADER: 'wood',
};

export interface ShatterLootItem {
  itemId: string;
  itemName: string;
  position: [number, number, number];
  material: PushableMaterial;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

/**
 * Generate loot items from a shattered object
 * @param position - Position where the object shattered
 * @param getAllItems - Function that returns all available item templates
 * @returns Array of loot items to spawn (0-2 items)
 */
export const generateShatterLoot = (
  position: THREE.Vector3,
  getAllItems: () => Array<{ name: string; category: string; rarity: string }>
): ShatterLootItem[] => {
  // 50% chance to drop anything
  if (Math.random() > SHATTER_LOOT_CHANCE) {
    return [];
  }

  const allItems = getAllItems();
  if (allItems.length === 0) return [];

  // Determine number of items (1-2)
  const numItems = SHATTER_LOOT_MIN + Math.floor(Math.random() * (SHATTER_LOOT_MAX - SHATTER_LOOT_MIN + 1));
  const loot: ShatterLootItem[] = [];

  // Weight towards common items (70% common, 25% uncommon, 5% rare)
  const getWeightedItem = () => {
    const roll = Math.random();
    const targetRarity = roll < 0.70 ? 'common' : roll < 0.95 ? 'uncommon' : 'rare';
    const eligible = allItems.filter(item => item.rarity === targetRarity);
    if (eligible.length === 0) {
      // Fallback to any item
      return allItems[Math.floor(Math.random() * allItems.length)];
    }
    return eligible[Math.floor(Math.random() * eligible.length)];
  };

  for (let i = 0; i < numItems; i++) {
    const item = getWeightedItem();

    // Scatter position slightly from shatter point
    const scatter = 0.3 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const offsetX = Math.cos(angle) * scatter;
    const offsetZ = Math.sin(angle) * scatter;

    loot.push({
      itemId: `shatter-loot-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      itemName: item.name,
      position: [
        position.x + offsetX,
        position.y + 0.3, // Spawn slightly above ground
        position.z + offsetZ
      ],
      material: ITEM_MATERIALS[item.category] || 'wood',
      category: item.category,
      rarity: item.rarity as 'common' | 'uncommon' | 'rare',
    });
  }

  return loot;
};
