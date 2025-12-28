
export enum AgentState {
  HEALTHY = 0,
  INCUBATING = 1,
  INFECTED = 2,
  DECEASED = 3,
}

export enum PlagueType {
  NONE = 'none',
  BUBONIC = 'bubonic',    // 80% chance when infected - flea-borne
  PNEUMONIC = 'pneumonic', // 15% chance - airborne
  SEPTICEMIC = 'septicemic' // 5% chance - blood infection
}

export enum BuboLocation {
  NONE = 'none',
  GROIN = 'groin',     // 60% of bubonic cases
  ARMPIT = 'armpit',   // 30% of bubonic cases
  NECK = 'neck'        // 10% of bubonic cases
}

export interface PlagueStatus {
  // State
  plagueType: PlagueType;
  state: AgentState;

  // Timeline (in game time)
  exposureTime: number | null;
  onsetTime: number | null;
  daysInfected: number;

  // Bubonic-specific
  buboLocation: BuboLocation;
  buboBurst: boolean; // Has bubo been lanced or burst naturally

  // Core symptoms (0-100 severity)
  fever: number;
  weakness: number;
  buboes: number;          // Only for bubonic
  coughingBlood: number;   // Only for pneumonic
  skinBleeding: number;    // Late stage or septicemic
  delirium: number;        // Late stage
  gangrene: number;        // Very late stage

  // Derived metrics
  overallSeverity: number; // 0-100 for UI display
  survivalChance: number;  // 0-100% estimated survival
}

export enum SocialClass {
  PEASANT = 'Peasant',
  MERCHANT = 'Merchant',
  CLERGY = 'Clergy',
  NOBILITY = 'Nobility',
}

export type Ethnicity =
  | 'Arab'
  | 'Aramaean/Syriac'
  | 'Kurdish'
  | 'Turkic'
  | 'Circassian'
  | 'Armenian'
  | 'Greek/Rum'
  | 'Persian'
  | 'Frankish';  // Italian, Venetian, Genoese, Provençal merchants and visitors

export type Religion =
  | 'Sunni Islam'
  | 'Shia Islam'
  | 'Eastern Orthodox'
  | 'Armenian Apostolic'
  | 'Syriac Orthodox'
  | 'Jewish'
  | 'Druze'
  | 'Latin Christian';  // Roman Catholic - Frankish/Italian visitors

export type Language = 'Arabic' | 'Syriac' | 'Armenian' | 'Greek' | 'Persian' | 'Turkic' | 'Latin';

export enum CameraMode {
  FIRST_PERSON = 'FIRST_PERSON',
  OVER_SHOULDER = 'OVER_SHOULDER',
  THIRD_PERSON = 'THIRD_PERSON',
  OVERHEAD = 'OVERHEAD',
}

// Panic susceptibility by social class (wealthy are more insulated from panic)
export const PANIC_SUSCEPTIBILITY: Record<SocialClass, number> = {
  [SocialClass.NOBILITY]: 0.6,   // Wealthy, removed from daily street life
  [SocialClass.CLERGY]: 0.75,    // Faith provides some comfort
  [SocialClass.MERCHANT]: 1.0,   // Baseline - concerned about business
  [SocialClass.PEASANT]: 1.25,   // Most vulnerable, least resources
};

export enum BuildingType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  RELIGIOUS = 'RELIGIOUS',
  CIVIC = 'CIVIC',
}

export interface NPCStats {
  id: string;
  name: string;
  age: number;
  profession: string;
  gender: 'Male' | 'Female';
  socialClass: SocialClass;
  ethnicity: Ethnicity;
  religion: Religion;
  language: Language;
  height: number;
  weight: number;
  // Personality system
  disposition: number;        // 0-100: baseline friendliness/personality (persistent)
  mood: string;               // Current emotional state (derived from disposition)
  // Morale/Rumor system
  awarenessLevel: number;     // 0-100: knowledge of plague spreading in city
  panicLevel: number;         // 0-100: fear/anxiety response
  goalOfDay?: string;
  heldItem?: 'staff' | 'hammer' | 'waterskin' | 'ledger' | 'spear' | 'tray' | 'plank' | 'sack' | 'none';
  robeSpread?: number;
  robeHasTrim?: boolean;
  robeHemBand?: boolean;
  robeOverwrap?: boolean;
  robePattern?: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric';
  robeBaseColor?: string;
  robeAccentColor?: string;
  robeHasSash?: boolean;
  robePatternScale?: number;
  sashPattern?: 'none' | 'stripe';
  hairStyle?: 'short' | 'medium' | 'long' | 'covered';
  hairColor?: string;
  facialHair?: 'none' | 'stubble' | 'short_beard' | 'full_beard' | 'mustache' | 'goatee';
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
  headwearColor?: string;
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
}

export interface NPCPlagueMeta {
  plagueType: PlagueType;
  exposureTime: number | null;
  incubationHours: number | null;
  deathHours: number | null;
  onsetTime: number | null;
}

export type NpcLocation = 'outdoor' | 'interior';

export interface NPCRecord {
  id: string;
  stats: NPCStats;
  state: AgentState;
  stateStartTime: number;
  plagueMeta?: NPCPlagueMeta;
  location: NpcLocation;
  homeBuildingId: string | null;
  lastOutdoorPos: [number, number, number];
  scheduleSeed: number;
  lastUpdateSimTime: number;
  isEphemeral: boolean;
  role?: string;
  districtType?: DistrictType;
}

export interface PlayerStats {
  name: string;
  age: number;
  profession: string;
  gender: 'Male' | 'Female';
  socialClass: SocialClass;
  ethnicity: Ethnicity;
  religion: Religion;
  language: Language;
  height: number;
  weight: number;
  family: string;
  healthStatus: string;
  skinTone: string;
  hairColor: string;
  robeColor: string;
  headscarfColor: string;
  skinDescription: string;
  hairDescription: string;
  robeDescription: string;
  headwearDescription: string;
  robeBaseColor: string;
  robeAccentColor: string;
  robeHasSash: boolean;
  robeSleeves: boolean;
  robeHasTrim: boolean;
  robeHemBand: boolean;
  robeSpread: number;
  robeOverwrap: boolean;
  robePattern: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric';
  hairStyle: 'short' | 'medium' | 'long' | 'covered';
  headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
  sleeveCoverage: 'full' | 'lower' | 'none';
  footwearStyle: 'sandals' | 'shoes' | 'bare';
  footwearColor: string;
  footwearDescription: string;
  accessories: string[];
  headwearColor: string;
  healthHistory: string;
  clothing: string[];
  strength: number;
  piety: number;
  perceptiveness: number;
  neuroticism: number;
  charisma: number;
  humors: {
    blood: number;
    phlegm: number;
    yellowBile: number;
    blackBile: number;
  };
  humoralBalance: number;
  currency: number;         // Dirhams (Islamic currency)
  inventory: PlayerItem[];
  maxInventorySlots: number; // Start with 20
  plague: PlagueStatus;      // Plague infection status
}

export interface BuildingMetadata {
  id: string;
  type: BuildingType;
  ownerName: string;
  ownerAge: number;
  ownerProfession: string;
  ownerGender: 'Male' | 'Female';
  position: [number, number, number];
  sizeScale?: number;
  storyCount?: 1 | 2 | 3;
  doorSide: number; // 0: North, 1: South, 2: East, 3: West
  hasSymmetricalWindows: boolean;
  isPointOfInterest?: boolean;
  isQuarantined?: boolean;
  isOpen?: boolean;
}

export enum InteriorRoomType {
  ENTRY = 'ENTRY',
  HALL = 'HALL',
  PRIVATE = 'PRIVATE',
  STORAGE = 'STORAGE',
  WORKSHOP = 'WORKSHOP',
  COURTYARD = 'COURTYARD',
}

export enum InteriorPropType {
  FLOOR_MAT = 'FLOOR_MAT',
  RUG = 'RUG',
  PRAYER_RUG = 'PRAYER_RUG',
  LOW_TABLE = 'LOW_TABLE',
  BENCH = 'BENCH',
  COUNTER = 'COUNTER',
  DISPLAY = 'DISPLAY',
  BASKET = 'BASKET',
  BOLT_OF_CLOTH = 'BOLT_OF_CLOTH',
  SCALE = 'SCALE',
  LEDGER = 'LEDGER',
  TRAY = 'TRAY',
  TEA_SET = 'TEA_SET',
  FLOOR_PILLOWS = 'FLOOR_PILLOWS',
  HOOKAH = 'HOOKAH',
  BEDROLL = 'BEDROLL',
  CHEST = 'CHEST',
  SHELF = 'SHELF',
  LAMP = 'LAMP',
  BRAZIER = 'BRAZIER',
  FIRE_PIT = 'FIRE_PIT',
  AMPHORA = 'AMPHORA',
  SCREEN = 'SCREEN',
  LOOM = 'LOOM',
  WATER_BASIN = 'WATER_BASIN',
  EWER = 'EWER',
  CUSHION = 'CUSHION',
  DESK = 'DESK',
  INK_SET = 'INK_SET',
  BOOKS = 'BOOKS',
  CHAIR = 'CHAIR',
  WALL_HANGING = 'WALL_HANGING',
  CRATE = 'CRATE',
  LADDER = 'LADDER',
  STAIRS = 'STAIRS',
  CANDLE = 'CANDLE',
  FLOOR_LAMP = 'FLOOR_LAMP',
  LANTERN = 'LANTERN',
  SPINDLE = 'SPINDLE',
  DYE_VAT = 'DYE_VAT',
  ANVIL = 'ANVIL',
  TOOL_RACK = 'TOOL_RACK',
  MORTAR = 'MORTAR',
  HERB_RACK = 'HERB_RACK',
  MEDICINE_SHELF = 'MEDICINE_SHELF',  // Wide shelf with drug jars for apothecaries
  ARCH_COLUMN = 'ARCH_COLUMN',  // Decorative arch columns for religious buildings
  // Bed types (historically accurate for medieval Damascus)
  SLEEPING_MAT = 'SLEEPING_MAT',    // Simple reed/straw mat for poorest
  LOW_BED = 'LOW_BED',              // Low wooden platform with cushions (middle class)
  RAISED_BED = 'RAISED_BED',        // Raised platform bed with curtains (wealthy)
  // Profession-specific props
  WORKBENCH = 'WORKBENCH',          // Artisan work surface
  WEAPON_RACK = 'WEAPON_RACK',      // Military weapon storage
  PRODUCE_BASKET = 'PRODUCE_BASKET', // Agricultural produce storage
  ROPE_COIL = 'ROPE_COIL',          // Transport/travel equipment
  WATER_JUG = 'WATER_JUG',          // Simple water container
}

// Profession lifestyle categories for interior generation
export type ProfessionCategory =
  | 'LABORER'      // Minimal furniture, small rooms (Day-Laborer, Porter, Beggar)
  | 'ARTISAN'      // Workshop tools, work materials (Spinner, Dyer, Tailor)
  | 'AGRICULTURAL' // Garden tools, produce storage (Gardener, Orchard Keeper)
  | 'SCHOLARLY'    // Books, writing materials (Copyist, Madrasa Student)
  | 'MILITARY'     // Weapons, armor, functional (City Guard, Mamluk Soldier)
  | 'SERVICE'      // Utilitarian, work-related (Servant, Cook)
  | 'TRANSPORT'    // Ropes, harnesses, travel gear (Donkey Driver, Camel Driver)
  | 'MERCHANT';    // Handled by COMMERCIAL building type

export const getProfessionCategory = (profession: string): ProfessionCategory => {
  const prof = profession.toLowerCase();

  // Military
  if (/guard|soldier|mamluk|retired guard/i.test(prof)) return 'MILITARY';

  // Scholarly/Religious
  if (/copyist|student|scribe|imam|qadi|mufti|muezzin|teacher/i.test(prof)) return 'SCHOLARLY';

  // Agricultural
  if (/garden|orchard|farmer|shepherd|goatherd|miller|cheese/i.test(prof)) return 'AGRICULTURAL';

  // Transport
  if (/driver|muleteer|porter|camel|donkey|stable/i.test(prof)) return 'TRANSPORT';

  // Service
  if (/servant|cook|bath attendant|launderer|messenger/i.test(prof)) return 'SERVICE';

  // Artisan (textile, construction, skilled crafts)
  if (/spinner|dyer|embroid|tailor|silk|felt|weaver|cobbler|rope|mat|basket|woodcarv|mason|plaster|whitewash|brick|tile/i.test(prof)) return 'ARTISAN';

  // Laborer (default for unskilled/poor)
  if (/labor|sweep|grave|rag|night watch|beggar|unemployed|widow|pilgrim|tanner/i.test(prof)) return 'LABORER';

  // Commercial professions
  if (/merchant|seller|shop|keeper|trader/i.test(prof)) return 'MERCHANT';

  // Default to laborer for unknown
  return 'LABORER';
};

// Size multipliers for profession categories
export const PROFESSION_SIZE_SCALE: Record<ProfessionCategory, number> = {
  LABORER: 0.7,
  SERVICE: 0.8,
  TRANSPORT: 0.85,
  ARTISAN: 1.0,
  AGRICULTURAL: 1.0,
  SCHOLARLY: 0.9,
  MILITARY: 1.0,
  MERCHANT: 1.1,
};

export interface InteriorRoom {
  id: string;
  type: InteriorRoomType;
  center: [number, number, number];
  size: [number, number, number];
}

export interface InteriorProp {
  id: string;
  type: InteriorPropType;
  roomId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  label: string;
  tags?: string[];
}

export interface InteriorNPC {
  id: string;
  role: 'owner' | 'family' | 'guest' | 'servant' | 'apprentice' | 'worshipper';
  position: [number, number, number];
  rotation: [number, number, number];
  stats: NPCStats;
  state: AgentState;
  plagueMeta?: NPCPlagueMeta;
}

export interface InteriorNarratorState {
  buildingId: string;
  roomCount: number;
  socialClass: SocialClass;
  profession: string;
  rooms: Array<{ id: string; type: InteriorRoomType; size: [number, number, number] }>;
  objects: Array<{ id: string; type: InteriorPropType; roomId: string; label: string }>;
  npcs: Array<{ id: string; role: string; name: string; profession: string }>;
}

export interface InteriorSpec {
  id: string;
  buildingId: string;
  buildingType: BuildingType;
  seed: number;
  socialClass: SocialClass;
  profession: string;
  exteriorDoorSide?: number;
  wallHeight?: number;
  rooms: InteriorRoom[];
  props: InteriorProp[];
  npcs: InteriorNPC[];
  narratorState: InteriorNarratorState;
}

export interface InteriorOverrides {
  roomCount?: number;
  roomTypes?: InteriorRoomType[];
  extraProps?: Array<Partial<InteriorProp> & { type: InteriorPropType }>;
  extraNPCs?: Array<Partial<InteriorNPC> & { role: InteriorNPC['role'] }>;
}

export interface Obstacle {
  position: [number, number, number];
  radius: number;
}

// ==================== CLIMBABLE TYPES ====================

export type ClimbableType =
  | 'STONE_STAIRCASE'    // External stairs to rooftops (common, multi-story buildings)
  | 'WOODEN_LADDER'      // Removable ladders (poor homes, storage access)
  | 'GRAPE_TRELLIS'      // Wooden frame on walls (ubiquitous in Damascus)
  | 'MASHRABIYA'         // Lattice balcony projections (wealthy/commercial)
  | 'LEAN_TO';           // Reed/wood shade structures (markets, poor districts)

export interface ClimbableAccessory {
  id: string;
  type: ClimbableType;
  buildingId: string;

  // Position on building wall
  wallSide: 0 | 1 | 2 | 3;        // 0=North, 1=East, 2=South, 3=West
  wallOffset: number;             // Position along wall (-1 to 1, 0 = center)

  // World positions (computed from building)
  basePosition: [number, number, number];
  topPosition: [number, number, number];

  // Dimensions
  width: number;
  height: number;
  depth: number;

  // Climbing behavior
  climbSpeed: number;             // Units per second when climbing
  requiresHold: boolean;          // True = hold W to climb, False = auto-walk
}

export interface ClimbingState {
  isClimbing: boolean;
  climbableId: string | null;
  climbProgress: number;          // 0 = base, 1 = top
  climbDirection: 'up' | 'down' | 'none';
}

// Climbable configuration per type
export const CLIMBABLE_CONFIG: Record<ClimbableType, {
  climbSpeed: number;
  requiresHold: boolean;
  baseWidth: number;
  baseHeight: number;
  baseDepth: number;
}> = {
  STONE_STAIRCASE: {
    climbSpeed: 4.0,
    requiresHold: false,
    baseWidth: 2.0,
    baseHeight: 6.0,
    baseDepth: 1.5,
  },
  WOODEN_LADDER: {
    climbSpeed: 5.0,
    requiresHold: true,
    baseWidth: 0.6,
    baseHeight: 4.0,
    baseDepth: 0.3,
  },
  GRAPE_TRELLIS: {
    climbSpeed: 2.5,
    requiresHold: true,
    baseWidth: 3.0,
    baseHeight: 4.5,
    baseDepth: 0.4,
  },
  MASHRABIYA: {
    climbSpeed: 3.0,
    requiresHold: false,
    baseWidth: 2.5,
    baseHeight: 1.8,
    baseDepth: 1.2,
  },
  LEAN_TO: {
    climbSpeed: 3.5,
    requiresHold: false,
    baseWidth: 2.5,
    baseHeight: 2.5,
    baseDepth: 2.0,
  },
};

export enum MarketStallType {
  SPICES = 'SPICES',           // Saffron, cumin, pepper
  TEXTILES = 'TEXTILES',       // Damask fabric, silk
  POTTERY = 'POTTERY',         // Ceramic bowls, plates
  METALWORK = 'METALWORK',     // Brass, copper goods
  RUGS = 'RUGS',              // Carpets, prayer rugs
  FOOD = 'FOOD',              // Dates, olives, bread
  PERFUMES = 'PERFUMES',      // Oils, incense
  GLASSWARE = 'GLASSWARE'     // Damascus glasswork
}

export interface MarketStall {
  id: string;
  type: MarketStallType;
  position: [number, number, number];
  rotation: number; // 0, 90, 180, 270 degrees
  size: 'small' | 'medium' | 'large';
  awningColor: string;
  woodColor: string;
  goodsColor: string; // Primary color of displayed goods
}

export enum MerchantType {
  TEXTILE = 'TEXTILE',        // Fabrics, robes, clothing
  APOTHECARY = 'APOTHECARY',  // Medicines, spices, herbs
  METALSMITH = 'METALSMITH',  // Weapons, tools, brass goods
  TRADER = 'TRADER'           // General goods, food, misc
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'debuff' | 'plagueProtection';
  value: number;
  duration?: number; // For temporary effects
}

export interface MerchantItem {
  id: string;
  name: string;
  description: string;
  category: MerchantType;
  basePrice: number; // In dirhams (Islamic currency)
  quantity: number;  // How many merchant has
  rarity: 'common' | 'uncommon' | 'rare';
  icon?: string;     // For future icon system
  effects?: ItemEffect[]; // For consumables (healing, etc)
}

export interface MerchantInventory {
  merchantId: string;
  items: MerchantItem[];
  lastRestockTime: number;  // Sim time when inventory last refreshed
  restockInterval: number;  // Hours between restocks (24-48)
}

export interface MerchantNPC {
  id: string;
  type: MerchantType;
  stats: NPCStats;          // Name, age, appearance (reuse existing)
  locationId: string;       // Either stall ID or building ID
  locationType: 'STALL' | 'INTERIOR';
  position: [number, number, number];
  inventory: MerchantInventory;
  haggleModifier: number;   // 0.8-1.2 (affects final prices)
  greeting: string;         // Procedurally generated flavor text
}

export interface PlayerItem {
  id: string;
  itemId: string;    // Reference to base MerchantItem
  quantity: number;
  acquiredAt: number; // Sim time
}

export type SpecialNPCType = 'SUFI_MYSTIC' | 'ASTROLOGER' | 'SCRIBE';

export interface MiniMapData {
  player: { x: number; z: number; yaw: number; cameraYaw: number };
  buildings: Array<{ x: number; z: number; type: BuildingType; size: number; doorSide: number }>;
  npcs: Array<{ x: number; z: number; state: AgentState }>;
  specialNPCs: Array<{ x: number; z: number; type: SpecialNPCType }>;
  district: DistrictType;
  radius: number;
}

export interface SimulationParams {
  infectionRate: number; 
  hygieneLevel: number; 
  quarantine: boolean;
  simulationSpeed: number; 
  timeOfDay: number; 
  cameraMode: CameraMode;
  mapX: number;
  mapY: number;
  uiMinimized: boolean;
}

export interface DevSettings {
  enabled: boolean;
  weatherOverride: 'auto' | 'CLEAR' | 'OVERCAST' | 'SANDSTORM';
  cloudCoverOverride: number | null;
  humidityOverride: number | null;
  fogDensityScale: number;
  showPerfPanel: boolean;
  showHoverWireframe: boolean;
  showShadows: boolean;
  showClouds: boolean;
  showFog: boolean;
  showTorches: boolean;
  showNPCs: boolean;
  showRats: boolean;
  showMiasma: boolean;
  showCityWalls: boolean;
  showSoundDebug: boolean;
}

export interface SimulationStats {
  healthy: number;
  incubating: number;
  infected: number;
  deceased: number;
  daysPassed: number;
  simTime: number; 
}

export interface SimulationCounts {
  healthy: number;
  incubating: number;
  infected: number;
  deceased: number;
}

export interface NpcStateOverride {
  id: string;
  state: AgentState;
  nonce: number;
}

export type BuildingInfectionStatus = 'clear' | 'incubating' | 'infected' | 'deceased';

export interface BuildingInfectionState {
  status: BuildingInfectionStatus;
  lastSeenSimTime: number;
}

export const CONSTANTS = {
  AGENT_COUNT: 45,
  MARKET_SIZE: 60,
  BUILDING_SIZE: 8,
  STREET_WIDTH: 5,
  BOUNDARY: 55,
  PROXIMITY_THRESHOLD: 10,
  HOURS_TO_INCUBATE: 1,
  HOURS_TO_INFECTED: 2,
  HOURS_TO_DEATH: 24,
  REAL_SECONDS_PER_SIM_HOUR: 1, 
};

export interface PlayerState {
  position: [number, number, number];
  isMoving: boolean;
}

// ============================================
// PLAYER ACTION SYSTEM
// ============================================

export type ActionId = 'warn' | 'encourage' | 'observe' | 'pray' | 'trade' | 'heal';
export type ActionHotkey = '1' | '2' | '3';
export type ActionEffect = 'aoe_panic' | 'aoe_calm' | 'none' | 'aoe_heal' | 'self_buff';

export interface PlayerAction {
  id: ActionId;
  name: string;
  description: string;
  icon: string;              // Lucide icon name
  cooldownSeconds: number;
  radius: number;            // Effect radius in world units
  requiresCharisma?: number; // Minimum charisma to use
  effect: ActionEffect;
}

export interface ActionSlotState {
  slot1: ActionId;
  slot2: ActionId;
  slot3: ActionId;
  cooldowns: Record<ActionId, number>;  // simTime when usable again
  lastTriggered: { actionId: ActionId; timestamp: number; position: [number, number, number] } | null;
}

export const PLAYER_ACTIONS: Record<ActionId, PlayerAction> = {
  warn: {
    id: 'warn',
    name: 'Warn',
    description: 'Alert nearby people to danger. They scatter in fear.',
    icon: 'AlertTriangle',
    cooldownSeconds: 15,
    radius: 8,
    effect: 'aoe_panic'
  },
  encourage: {
    id: 'encourage',
    name: 'Encourage',
    description: 'Calm the populace with reassuring words. Some may gather.',
    icon: 'Heart',
    cooldownSeconds: 30,
    radius: 6,
    requiresCharisma: 3,
    effect: 'aoe_calm'
  },
  observe: {
    id: 'observe',
    name: 'Observe',
    description: 'Watch and learn from your surroundings.',
    icon: 'Eye',
    cooldownSeconds: 0,
    radius: 0,
    effect: 'none'
  },
  pray: {
    id: 'pray',
    name: 'Pray',
    description: 'Seek divine comfort to steady your nerves.',
    icon: 'Sparkles',
    cooldownSeconds: 60,
    radius: 0,
    effect: 'self_buff'
  },
  trade: {
    id: 'trade',
    name: 'Trade',
    description: 'Initiate a trade with nearby merchants.',
    icon: 'Coins',
    cooldownSeconds: 0,
    radius: 3,
    effect: 'none'
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    description: 'Use medical supplies to treat the afflicted.',
    icon: 'Cross',
    cooldownSeconds: 45,
    radius: 2,
    effect: 'aoe_heal'
  }
};

export interface PlayerActionEvent {
  actionId: ActionId;
  position: [number, number, number];
  timestamp: number;
  effect: ActionEffect;
  radius: number;
}

export const getLocationLabel = (x: number, y: number) => {
  // Helper function for radius-based matching (defined below)
  const isNear = (targetX: number, targetY: number, radius: number): boolean => {
    const dx = x - targetX;
    const dy = y - targetY;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  };

  // Use radius-based matching for main districts (same as getDistrictType)
  if (isNear(0, 0, 0.8)) return "Al-Buzuriyah (Central Bazaar)";
  if (isNear(0, 2, 0.8)) return "Umayyad Mosque (Great Mosque)";
  if (isNear(-2, 1, 0.8)) return "The Mamluk Citadel (Civic Quarter)";
  if (isNear(-4, 4, 0.8)) return "Al-Salihiyya (Hillside Quarter)";
  if (isNear(0, -2, 0.8)) return "Al-Yahud (Jewish Quarter)";
  if (isNear(3, 0, 0.8)) return "Al-Nasara (Christian Quarter)";
  if (isNear(0, -4, 0.8)) return "Al-Shaghour (Poor Hovels)";
  if (isNear(-2, 3, 0.8)) return "Al-Qaymariyya (Wealthy Quarter)";
  if (isNear(4, 1, 0.8)) return "Bab Sharqi (Eastern District)";
  if (isNear(5, 2, 1.5)) return "Ghouta Farmlands (Rural Fringe)";
  if (isNear(6, 0, 1.5)) return "Desert Outskirts (Syrian Desert)";

  // Procedural names for other blocks
  const prefixes = ["Lower", "Upper", "North", "South", "East", "West"];
  const districts = ["Souk", "Maidan", "Harah", "Bazaar", "Quarter"];
  const seed = Math.abs(x * 31 + y * 7);
  const p = prefixes[seed % prefixes.length];
  const d = districts[(seed >> 2) % districts.length];
  return `${p} ${d} Block — ${x}, ${y}`;
};

export type DistrictType = 'MARKET' | 'WEALTHY' | 'HOVELS' | 'CIVIC' | 'RESIDENTIAL' | 'ALLEYS' | 'JEWISH_QUARTER' | 'CHRISTIAN_QUARTER' | 'UMAYYAD_MOSQUE' | 'SALHIYYA' | 'OUTSKIRTS_FARMLAND' | 'OUTSKIRTS_DESERT' | 'CARAVANSERAI' | 'MOUNTAIN_SHRINE' | 'SOUTHERN_ROAD';

/**
 * Helper: Check if coordinate is within radius of a point (handles fractional coordinates)
 */
const isNearPoint = (x: number, targetX: number, y: number, targetY: number, radius: number): boolean => {
  const dx = x - targetX;
  const dy = y - targetY;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
};

/**
 * Get district type based on map coordinates
 * 2x scaled grid with radius-based matching to handle fractional coordinates
 * Geography: West = mountains, East = desert, North = Qassioun slopes, South = plains
 */
export const getDistrictType = (mapX: number, mapY: number): DistrictType => {
  // Major landmarks (radius 0.8 to handle walking through their edges)
  if (isNearPoint(mapX, 0, mapY, 0, 0.8)) return 'MARKET';
  if (isNearPoint(mapX, 0, mapY, 2, 0.8)) return 'UMAYYAD_MOSQUE';  // Great Mosque - north of market
  if (isNearPoint(mapX, -2, mapY, 1, 0.8)) return 'CIVIC';  // Citadel - northwest corner
  if (isNearPoint(mapX, -4, mapY, 4, 0.8)) return 'SALHIYYA';  // Hillside - UP the mountain (higher Y)
  if (isNearPoint(mapX, 0, mapY, -2, 0.8)) return 'JEWISH_QUARTER';  // Al-Yahud - south-central
  if (isNearPoint(mapX, 3, mapY, 0, 0.8)) return 'CHRISTIAN_QUARTER';  // Bab Touma - EAST on Straight Street axis
  if (isNearPoint(mapX, 0, mapY, -4, 0.8)) return 'HOVELS';  // Al-Shaghour - far south
  if (isNearPoint(mapX, -2, mapY, 3, 0.8)) return 'WEALTHY';  // Al-Qaymariyya - northwest

  // Eastern areas (Bab Sharqi and outskirts)
  if (isNearPoint(mapX, 4, mapY, 1, 0.8)) return 'ALLEYS';  // Bab Sharqi - Eastern District alleys

  // Outskirts - historically accurate geography
  if (isNearPoint(mapX, 5, mapY, 2, 1.5)) return 'OUTSKIRTS_FARMLAND';  // Ghouta - SOUTHEAST (irrigated oasis)
  if (isNearPoint(mapX, 6, mapY, 0, 1.5)) return 'OUTSKIRTS_DESERT';  // Syrian Desert - EAST (correct!)
  if (isNearPoint(mapX, -6, mapY, 3, 1.5)) return 'OUTSKIRTS_FARMLAND';  // Mountain foothills - WEST (was desert, now farmland)
  if (isNearPoint(mapX, -4, mapY, -4, 0.8)) return 'CARAVANSERAI';  // Silk Market - southwest
  if (isNearPoint(mapX, -6, mapY, 6, 1.2)) return 'MOUNTAIN_SHRINE';  // Mt. Qassioun peak - far northwest UP
  if (isNearPoint(mapX, 2, mapY, -6, 1.2)) return 'SOUTHERN_ROAD';  // Hauran Highway - far south

  // Interstitial districts - connective tissue with region-based logic
  // Between Citadel and Mosque
  if (mapX >= -2 && mapX <= 0 && mapY >= 1 && mapY <= 2) return 'ALLEYS';

  // Between Market and Mosque (north-south corridor)
  if (Math.abs(mapX) < 0.8 && mapY > 0 && mapY < 2) return 'ALLEYS';

  // Between Jewish Quarter and Christian Quarter (SINGLE alleys district - they're close!)
  if (mapX > 0 && mapX < 3 && mapY >= -2 && mapY <= 0) return 'ALLEYS';

  // Around Salhiyya hillside (residential on slopes)
  if (mapX >= -4 && mapX <= -2 && mapY >= 2 && mapY <= 4) return 'RESIDENTIAL';

  // Around Wealthy Quarter
  if (mapX >= -3 && mapX <= -1 && mapY >= 2 && mapY <= 3.5) return 'WEALTHY';

  // Around Hovels (southern poor districts)
  if (Math.abs(mapX) < 2 && mapY >= -4 && mapY <= -2.5) return 'HOVELS';

  // East of Market toward Christian Quarter (Straight Street area)
  if (mapX > 0.8 && mapX < 2.5 && Math.abs(mapY) < 0.8) return 'RESIDENTIAL';

  // Near center but not in specific landmarks = dense alleys
  const distFromCenter = Math.sqrt(mapX * mapX + mapY * mapY);
  if (distFromCenter < 3) return 'ALLEYS';

  // Default fallback
  return 'RESIDENTIAL';
};

// ============================================
// CONVERSATION SYSTEM
// ============================================

export interface ConversationMessage {
  id: string;
  role: 'player' | 'npc' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationSummary {
  npcId: string;
  simTime: number;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ConversationState {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface EncounterEnvironment {
  timeOfDay: number;
  weather: string;
  district: string;
  nearbyInfected: number;
  nearbyDeceased: number;
}

// Note: Also defined in components/Agents.tsx - keep in sync
export interface MoraleStats {
  avgAwareness: number;
  avgPanic: number;
  agentCount: number;
}

export interface EncounterContext {
  npc: NPCStats;
  player: PlayerStats;
  environment: EncounterEnvironment;
  publicMorale: MoraleStats;
  simulationStats: SimulationStats;
  conversationHistory: ConversationSummary[];
}
