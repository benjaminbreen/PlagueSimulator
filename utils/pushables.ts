import * as THREE from 'three';

export type PushableKind = 'bench' | 'clayJar' | 'geranium' | 'basket' | 'olivePot' | 'lemonPot' | 'palmPot' | 'bougainvilleaPot' | 'coin' | 'olive' | 'lemon' | 'potteryShard' | 'linenScrap' | 'candleStub' | 'twine' | 'interior' | 'boulder' | 'crate' | 'amphora' | 'droppedItem' | 'storageChest' | 'gravestone';
export type PushableMaterial = 'stone' | 'wood' | 'ceramic' | 'cloth' | 'metal';

// Break chances when pushed with force (shift + release)
export const BREAK_CHANCES: Partial<Record<PushableKind, number>> = {
  crate: 0.5,           // 50% chance - wooden crate
  amphora: 0.35,        // 35% chance - ceramic amphora (sturdy storage vessel)
  clayJar: 0.25,        // 25% chance - ceramic jar (thick pottery)
  geranium: 0.60,       // 60% chance - ceramic pot with plant (more fragile)
  olivePot: 0.60,       // 60% chance - ceramic pot
  lemonPot: 0.60,       // 60% chance - ceramic pot
  palmPot: 0.60,        // 60% chance - ceramic pot
  bougainvilleaPot: 0.60, // 60% chance - ceramic pot
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
  gravestone: 'Gravestone',
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
  graveShape?: 'rectangular' | 'arch' | 'peaked' | 'platform'; // For gravestones
  graveScale?: number;               // Scale multiplier for gravestones
  graveType?: 'flat' | 'raised' | 'double_marker' | 'ornate'; // Grave burial type
  isTipped?: boolean;                // For gravestones - knocked over state
  tippedRotation?: number;           // Current tipped rotation angle (0 to Math.PI/2)
  wobbleAngle?: number;              // Wobble rotation angle (oscillates around 0)
  wobbleVelocity?: number;           // Angular velocity for wobble oscillation
  graveEpitaph?: {                   // Procedurally generated epitaph
    name: string;                    // Deceased's name
    age: number;                     // Age at death
    title?: string;                  // Optional title/descriptor
    inscription?: string;            // Optional Quranic verse or saying
  };
}

// Swingable objects (hanging from ceiling, like lanterns)
export interface SwingableObject {
  id: string;
  sourceId: string;                  // Reference to the interior prop
  anchorPoint: THREE.Vector3;        // Fixed ceiling attachment point
  position: THREE.Vector3;           // Current position (calculated from pendulum)
  ropeLength: number;                // Length of chain/rope
  angle: THREE.Vector2;              // Current angles from vertical (x, z) in radians
  angularVelocity: THREE.Vector2;    // Angular velocity (x, z)
  radius: number;                    // Collision radius
  mass: number;                      // Mass for physics
  isShattered?: boolean;             // Can break if hit too hard
  shatterTime?: number;
}

export const createSwingable = (
  id: string,
  sourceId: string,
  anchorPoint: [number, number, number],
  ropeLength: number,
  radius: number,
  mass: number
): SwingableObject => {
  const anchor = new THREE.Vector3(anchorPoint[0], anchorPoint[1], anchorPoint[2]);
  return {
    id,
    sourceId,
    anchorPoint: anchor,
    position: anchor.clone().add(new THREE.Vector3(0, -ropeLength, 0)), // Start hanging straight down
    ropeLength,
    angle: new THREE.Vector2(0, 0), // Start at rest
    angularVelocity: new THREE.Vector2(0, 0),
    radius,
    mass
  };
};

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

// Historically accurate 14th century Damascus epitaph generation
const DAMASCENE_NAMES = {
  male: [
    'Ahmad', 'Muhammad', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Uthman', 'Ibrahim', 'Ismail', 'Yusuf',
    'Musa', 'Dawud', 'Sulayman', 'Khalid', 'Salah al-Din', 'Nur al-Din', 'Mahmud', 'Abdullah', 'Zakariya', 'Yahya',
    'Umar', 'Jamal', 'Nasir', 'Mansur', 'Harun', 'Bilal', 'Talha', 'Zubayr', 'Abu Bakr', 'Anas'
  ],
  female: [
    'Fatima', 'Aisha', 'Khadija', 'Zaynab', 'Maryam', 'Hafsa', 'Ruqayya', 'Umm Kulthum', 'Asma', 'Safiya',
    'Layla', 'Salma', 'Sawda', 'Hind', 'Zahra', 'Noor', 'Amina', 'Rabiah', 'Sukayna', 'Umm Salama'
  ]
};

const FAMILY_NAMES = [
  'ibn Ahmad', 'ibn Muhammad', 'ibn Ali', 'ibn Hassan', 'ibn Ibrahim', 'ibn Yusuf', 'ibn Khalid',
  'al-Dimashqi', 'al-Shami', 'al-Masri', 'al-Baghdadi', 'al-Halabi', 'al-Tabrizi', 'al-Isfahani'
];

const TITLES = [
  'Devoted mother', 'Beloved father', 'Pious scholar', 'Righteous merchant', 'Faithful servant of Allah',
  'Keeper of the faith', 'Guardian of orphans', 'Skilled physician', 'Noble qadi', 'Respected imam',
  'Generous benefactor', 'Wise elder', 'Humble servant', 'Devout worshipper', 'Protector of the weak',
  'Teacher of knowledge', 'Pilgrim to Mecca', 'Reciter of Quran', 'Builder of mosques', 'Healer of the sick'
];

const QURAN_VERSES = [
  'Inna lillahi wa inna ilayhi raji\'un', // To Allah we belong and to Him we return
  'Every soul shall taste death',
  'Allah is the best of providers',
  'Blessed are those who believe',
  'Peace be upon the righteous',
  'The mercy of Allah encompasses all',
  'In remembrance of Allah do hearts find rest',
  'Allah loves those who are patient',
  'Verily with hardship comes ease',
  'He who created death and life to test you'
];

/**
 * Generate a historically accurate epitaph for a 14th century Damascus gravestone
 */
export const generateGraveEpitaph = (seed: number): {
  name: string;
  age: number;
  title?: string;
  inscription?: string;
} => {
  const rand = () => {
    // Simple seeded random
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const isMale = rand() > 0.5;
  const firstName = isMale
    ? DAMASCENE_NAMES.male[Math.floor(rand() * DAMASCENE_NAMES.male.length)]
    : DAMASCENE_NAMES.female[Math.floor(rand() * DAMASCENE_NAMES.female.length)];

  const familyName = FAMILY_NAMES[Math.floor(rand() * FAMILY_NAMES.length)];
  const name = `${firstName} ${familyName}`;

  // Age distribution: weighted toward adults (20-70), with some children and elderly
  const ageRoll = rand();
  let age: number;
  if (ageRoll < 0.15) {
    age = Math.floor(rand() * 15) + 1; // Children (1-15)
  } else if (ageRoll < 0.85) {
    age = Math.floor(rand() * 50) + 20; // Adults (20-69)
  } else {
    age = Math.floor(rand() * 25) + 70; // Elderly (70-94)
  }

  // 60% chance of having a title
  const title = rand() < 0.6 ? TITLES[Math.floor(rand() * TITLES.length)] : undefined;

  // 50% chance of having a Quranic inscription
  const inscription = rand() < 0.5 ? QURAN_VERSES[Math.floor(rand() * QURAN_VERSES.length)] : undefined;

  return { name, age, title, inscription };
};
