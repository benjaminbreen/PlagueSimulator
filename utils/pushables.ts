import * as THREE from 'three';

export type PushableKind = 'bench' | 'clayJar' | 'geranium' | 'basket' | 'olivePot' | 'lemonPot' | 'palmPot' | 'bougainvilleaPot' | 'coin' | 'olive' | 'lemon' | 'potteryShard' | 'linenScrap' | 'candleStub' | 'twine' | 'interior' | 'boulder' | 'crate' | 'amphora' | 'droppedItem' | 'storageChest' | 'gravestone' | 'mausoleum';
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
  mausoleum: 'Mausoleum',
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
  mausoleumEpitaph?: {               // Custom epitaph for major mausoleums
    name: string;                    // Name of the deceased
    title: string;                   // Full title/position
    deathYear: number;               // Year of death (Hijri)
    deathYearCE: number;             // Year of death (CE)
    inscription: string;             // Carved inscription text
    historicalNote?: string;         // Historical context for player
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

/**
 * Historical mausoleum epitaphs for Qubaybat district
 * Based on actual historical figures buried in Damascus by 1348 CE
 */
export const QUBAYBAT_MAUSOLEUM_EPITAPHS: Array<{
  name: string;
  title: string;
  deathYear: number;      // Hijri
  deathYearCE: number;
  inscription: string;
  historicalNote: string;
}> = [
  {
    name: 'Shams al-Din al-Dhahabi',
    title: 'Imam, Hafiz, and Master of Hadith Sciences',
    deathYear: 748,
    deathYearCE: 1348,
    inscription: 'Here lies the Imam Shams al-Din Muhammad ibn Ahmad al-Dhahabi, who preserved the lives of the righteous in his writings. He was the greatest historian of his age, author of the Siyar A\'lam al-Nubala. May Allah illuminate his grave as he illuminated the path of knowledge.',
    historicalNote: 'Al-Dhahabi was one of the greatest Islamic historians, dying in Damascus just as the Black Death arrived. His biographical dictionary remains a crucial historical source.',
  },
  {
    name: 'Jamal al-Din Yusuf al-Mizzi',
    title: 'Shaykh al-Islam and Hadith Master of the Levant',
    deathYear: 742,
    deathYearCE: 1341,
    inscription: 'In the name of Allah, the Most Gracious, the Most Merciful. This is the resting place of the noble Imam al-Mizzi, compiler of Tahdhib al-Kamal. He devoted sixty years to the science of hadith. Every soul shall taste death.',
    historicalNote: 'Al-Mizzi was the foremost hadith scholar of Damascus and father-in-law of Ibn Kathir. His work organizing hadith transmitter biographies remains authoritative.',
  },
  {
    name: 'Emir Sayf al-Din Tankiz al-Husami',
    title: 'Viceroy of Damascus and Builder of Monuments',
    deathYear: 740,
    deathYearCE: 1340,
    inscription: 'This turbah contains the remains of the noble Emir Tankiz, naib of al-Sham for twenty-eight years under Sultan al-Nasir Muhammad. He built madrasas, khans, and bridges. His works endure though he has passed to Allah\'s mercy.',
    historicalNote: 'Tankiz was the powerful Mamluk governor who transformed Damascus with ambitious building projects. He fell from favor and was executed in Alexandria, but his body was returned to Damascus.',
  },
  {
    name: 'Sitt Hajar bint al-Qadi Kamal al-Din',
    title: 'Scholar and Teacher of Women',
    deathYear: 735,
    deathYearCE: 1335,
    inscription: 'She taught the daughters of Damascus to read the Holy Quran and instructed them in the sciences of religion. A woman of piety and learning, she is now with the righteous women of Paradise. Inna lillahi wa inna ilayhi raji\'un.',
    historicalNote: 'Women scholars were not uncommon in medieval Damascus, often teaching other women in private settings and receiving ijazas (teaching licenses) from male scholars.',
  },
  {
    name: 'Emir Arghun Shah al-Nasiri',
    title: 'Commander of the Damascus Citadel Guard',
    deathYear: 744,
    deathYearCE: 1343,
    inscription: 'The Emir Arghun Shah served the Sultan faithfully for thirty years. He was known for his justice to the soldiers under his command and his charity to the poor of Damascus. May Allah accept his good deeds.',
    historicalNote: 'Mamluk military commanders often built elaborate tombs, their domes visible across the cemetery districts as symbols of their status and piety.',
  },
  {
    name: 'Abu al-Fida Ismail ibn Kathir',
    title: 'Student of al-Mizzi, Compiler of Tafsir',
    deathYear: 746,
    deathYearCE: 1345,
    inscription: 'Here rests the young scholar Abu al-Fida, son-in-law of al-Mizzi, who began a great tafsir of the Quran. Though called early to Paradise, his works shall continue. The best provision is piety.',
    historicalNote: 'Note: This represents a fictional early death. The real Ibn Kathir lived until 1373, but the epitaph reflects the high mortality among scholars\' families.',
  },
  {
    name: 'Khadija bint Emir Baybars al-Mansuri',
    title: 'Daughter of the Emir, Patroness of the Poor',
    deathYear: 738,
    deathYearCE: 1338,
    inscription: 'Khadija, daughter of the great Emir Baybars, established a waqf for feeding the poor of Damascus. She distributed bread at this very gate each Friday. Now she awaits the reward of the generous.',
    historicalNote: 'Wealthy women often established charitable endowments (waqf) that provided ongoing services to the community after their deaths.',
  },
  {
    name: 'Sharaf al-Din al-Barzali',
    title: 'Chronicler of Damascus',
    deathYear: 739,
    deathYearCE: 1339,
    inscription: 'Al-Barzali recorded the events of his time so that those who come after might learn. His chronicle preserves the memory of sultans and scholars, plagues and victories. Knowledge is the inheritance of the prophets.',
    historicalNote: 'Al-Barzali\'s chronicle of Damascus was an important source for later historians, documenting the social and political life of the city.',
  },
];

/**
 * Get a mausoleum epitaph by index (for the major tombs in Qubaybat)
 */
export const getMausoleumEpitaph = (index: number) => {
  return QUBAYBAT_MAUSOLEUM_EPITAPHS[index % QUBAYBAT_MAUSOLEUM_EPITAPHS.length];
};
