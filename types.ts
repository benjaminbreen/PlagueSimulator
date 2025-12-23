
export enum AgentState {
  HEALTHY = 0,
  INCUBATING = 1,
  INFECTED = 2,
  DECEASED = 3,
}

export enum SocialClass {
  PEASANT = 'Peasant',
  MERCHANT = 'Merchant',
  CLERGY = 'Clergy',
  NOBILITY = 'Nobility',
}

export enum CameraMode {
  THIRD_PERSON = 'THIRD_PERSON',
  OVERHEAD = 'OVERHEAD',
  FIRST_PERSON = 'FIRST_PERSON',
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
  height: number;
  weight: number;
  mood: string;
  // Morale/Rumor system
  awarenessLevel: number;     // 0-100: knowledge of plague spreading in city
  panicLevel: number;         // 0-100: fear/anxiety response
  goalOfDay?: string;
  heldItem?: 'staff' | 'hammer' | 'waterskin' | 'ledger' | 'spear' | 'tray' | 'plank' | 'sack' | 'none';
  robeSpread?: number;
  robeHasTrim?: boolean;
  robeHemBand?: boolean;
  robeOverwrap?: boolean;
  robePattern?: 'none' | 'damask' | 'stripe' | 'chevron';
  hairStyle?: 'short' | 'medium' | 'long' | 'covered';
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
}

export interface PlayerStats {
  name: string;
  age: number;
  profession: string;
  gender: 'Male' | 'Female';
  socialClass: SocialClass;
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
  robePattern: 'none' | 'damask' | 'stripe' | 'chevron';
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
  ARCH_COLUMN = 'ARCH_COLUMN',  // Decorative arch columns for religious buildings
}

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
  role: 'owner' | 'family' | 'guest' | 'servant' | 'apprentice';
  position: [number, number, number];
  rotation: [number, number, number];
  stats: NPCStats;
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
  type: 'heal' | 'buff' | 'debuff';
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

export interface MiniMapData {
  player: { x: number; z: number; yaw: number; cameraYaw: number };
  buildings: Array<{ x: number; z: number; type: BuildingType; size: number; doorSide: number }>;
  npcs: Array<{ x: number; z: number; state: AgentState }>;
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
  if (x === 0 && y === 0) return "Al-Buzuriyah (Main Road)";
  if (x === 1 && y === 1) return "Bab Sharqi (Narrow Alleys)";
  if (x === -1 && y === 2) return "Al-Qaymariyya (Wealthy Quarter)";
  if (x === 0 && y === -2) return "Al-Shaghour (Poor Hovels)";
  if (x === 2 && y === -1) return "The Mamluk Citadel (Civic Quarter)";
  if (x === 1 && y === -1) return "Player's Home (Residential)";
  if (x === -2 && y === 1) return "Al-Salihiyya (Hillside Quarter)";
  if (x === 2 && y === 2) return "Ghouta Farmlands (Rural Fringe)";
  if (x === -3 && y === -1) return "Desert Outskirts (North Track)";
  if (x === -2 && y === -2) return "Caravanserai (Pilgrims' Road)";
  if (x === -3 && y === 3) return "Mount Qassioun (Sacred Mountain)";
  if (x === 1 && y === -3) return "Hauran Highway (Southern Road)";

  // Procedural names for other blocks
  const prefixes = ["Lower", "Upper", "North", "South", "East", "West"];
  const districts = ["Souk", "Maidan", "Harah", "Bazaar", "Quarter"];
  const seed = Math.abs(x * 31 + y * 7);
  const p = prefixes[seed % prefixes.length];
  const d = districts[(seed >> 2) % districts.length];
  return `${p} ${d} Block — ${x}, ${y}`;
};

export type DistrictType = 'MARKET' | 'WEALTHY' | 'HOVELS' | 'CIVIC' | 'RESIDENTIAL' | 'ALLEYS' | 'SALHIYYA' | 'OUTSKIRTS_FARMLAND' | 'OUTSKIRTS_DESERT' | 'CARAVANSERAI' | 'MOUNTAIN_SHRINE' | 'SOUTHERN_ROAD';

export const getDistrictType = (x: number, y: number): DistrictType => {
  if (x === 0 && y === 0) return 'MARKET';
  if (x === -1 && y === 2) return 'WEALTHY';
  if (x === 0 && y === -2) return 'HOVELS';
  if (x === 2 && y === -1) return 'CIVIC';
  if (x === 1 && y === 1) return 'ALLEYS';
  if (x === -2 && y === 1) return 'SALHIYYA';
  if (x === 2 && y === 2) return 'OUTSKIRTS_FARMLAND';
  if (x === -3 && y === -1) return 'OUTSKIRTS_DESERT';
  if (x === -2 && y === -2) return 'CARAVANSERAI';
  if (x === -3 && y === 3) return 'MOUNTAIN_SHRINE';
  if (x === 1 && y === -3) return 'SOUTHERN_ROAD';
  return 'RESIDENTIAL';
};
