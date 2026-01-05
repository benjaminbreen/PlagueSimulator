import { BuildingMetadata, BuildingType, InteriorSpec, InteriorFloor, InteriorRoom, InteriorRoomType, InteriorProp, InteriorPropType, InteriorNPC, InteriorOverrides, SocialClass, NPCStats, Obstacle, getProfessionCategory, ProfessionCategory, PROFESSION_SIZE_SCALE, AgentState, InteriorMerchantData, MerchantType, FamilyMember } from '../types';
import { generateNPCStats, seededRandom } from './procedural';
import { professionToMerchantType } from './merchantGeneration';
import { generateMerchantInventory } from './merchantItems';

// Family context for player home interiors
export interface FamilyInteriorContext {
  isPlayerHome: boolean;
  familyMembers: FamilyMember[];
  familyNpcStats: Map<string, NPCStats>;
}

const ROOM_HEIGHT = 3.4;

const professionClassHints: Array<{ keywords: string[]; class: SocialClass }> = [
  { keywords: ['Governor', 'Sultan', 'Officer', 'Court'], class: SocialClass.NOBILITY },
  { keywords: ['Merchant', 'Spice', 'Draper', 'Trader'], class: SocialClass.MERCHANT },
  { keywords: ['Qur\'an', 'Teacher', 'Scribe', 'Caretaker'], class: SocialClass.CLERGY },
];

const inferSocialClass = (building: BuildingMetadata): SocialClass => {
  const prof = building.ownerProfession.toLowerCase();
  for (const hint of professionClassHints) {
    if (hint.keywords.some((kw) => prof.includes(kw.toLowerCase()))) return hint.class;
  }
  if (building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC) return SocialClass.NOBILITY;
  if (building.type === BuildingType.SCHOOL) return SocialClass.CLERGY;
  if (building.type === BuildingType.MEDICAL || building.type === BuildingType.HOSPITALITY) return SocialClass.MERCHANT;
  return SocialClass.PEASANT;
};

const roomSizeForClass = (socialClass: SocialClass): number => {
  if (socialClass === SocialClass.NOBILITY) return 14;
  if (socialClass === SocialClass.MERCHANT) return 13;
  if (socialClass === SocialClass.CLERGY) return 11;
  return 9;
};

const resolveRoomSize = (socialClass: SocialClass, sizeScale: number, buildingType: BuildingType, storyCount?: 1 | 2 | 3, profession?: string): number => {
  const base = roomSizeForClass(socialClass) * sizeScale;
  // Civic buildings are 30% smaller (0.72), religious buildings stay larger
  const typeBoost = (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL)
    ? 0.72
    : buildingType === BuildingType.RELIGIOUS
      ? 1.1
      : 1;
  // Apply profession category size scaling for residential buildings
  const profCategory = profession ? getProfessionCategory(profession) : 'LABORER';
  const profScale = buildingType === BuildingType.RESIDENTIAL ? PROFESSION_SIZE_SCALE[profCategory] : 1.0;
  // Scale interior size based on story count: 1 story = 1x, 2 stories = 1.5x, 3 stories = 2x
  const storyMultiplier = storyCount === 3 ? 2.0 : storyCount === 2 ? 1.5 : 1.0;
  const raw = base * typeBoost * storyMultiplier * profScale;
  return Math.max(6, Math.min(32, raw));  // Allow smaller minimum for poor laborers
};

const roomCountForClass = (socialClass: SocialClass): number => {
  if (socialClass === SocialClass.NOBILITY) return 4;
  if (socialClass === SocialClass.MERCHANT) return 3;
  if (socialClass === SocialClass.CLERGY) return 2;
  return 1;
};

const defaultRoomTypes = (socialClass: SocialClass, profession: string, buildingType: BuildingType): InteriorRoomType[] => {
  const types: InteriorRoomType[] = [InteriorRoomType.ENTRY];
  const prof = profession.toLowerCase();

  // Civic/school/medical buildings: always 2 rooms (ENTRY + HALL for main office)
  if (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL) {
    types.push(InteriorRoomType.HALL);
    return types;
  }

  if (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY) {
    if (prof.includes('inn') || prof.includes('funduq') || prof.includes('khan') || prof.includes('wakala')) {
      types.push(InteriorRoomType.HALL, InteriorRoomType.PRIVATE);  // Inn common room + guest rooms
    } else if (prof.includes('caravanserai')) {
      types.push(InteriorRoomType.HALL, InteriorRoomType.PRIVATE, InteriorRoomType.STORAGE);  // Lodging + storage
    } else {
      types.push(InteriorRoomType.HALL, InteriorRoomType.STORAGE);  // Standard shop
    }
    return types;
  }

  if (socialClass === SocialClass.NOBILITY) {
    types.push(InteriorRoomType.HALL, InteriorRoomType.PRIVATE, InteriorRoomType.COURTYARD);
  } else if (socialClass === SocialClass.MERCHANT) {
    types.push(InteriorRoomType.HALL, InteriorRoomType.STORAGE);
  } else if (socialClass === SocialClass.CLERGY) {
    types.push(InteriorRoomType.PRIVATE);
  } else {
    types.push(InteriorRoomType.PRIVATE);
  }
  if (profession.toLowerCase().includes('scribe')) {
    types.push(InteriorRoomType.WORKSHOP);
  }
  return types.slice(0, roomCountForClass(socialClass));
};

const getFloorRoomTypes = (
  baseTypes: InteriorRoomType[],
  floorType: 'public' | 'private',
  profession: string
): InteriorRoomType[] => {
  if (floorType === 'public') return baseTypes;
  const prof = profession.toLowerCase();
  const keep = baseTypes.filter((type) => (
    type === InteriorRoomType.PRIVATE
    || type === InteriorRoomType.STORAGE
    || type === InteriorRoomType.WORKSHOP
  ));
  const needsWorkshop = /scribe|copyist|teacher|madrasa|scholar/.test(prof);
  if (needsWorkshop && !keep.includes(InteriorRoomType.WORKSHOP)) {
    keep.push(InteriorRoomType.WORKSHOP);
  }
  if (!keep.includes(InteriorRoomType.PRIVATE)) {
    keep.unshift(InteriorRoomType.PRIVATE);
  }
  if (keep.length === 0) {
    return [InteriorRoomType.PRIVATE];
  }
  return keep;
};

const overlaps = (a: InteriorRoom, b: InteriorRoom, padding = -0.2) => {
  const [ax, , az] = a.center;
  const [bx, , bz] = b.center;
  const [aw, , ad] = a.size;
  const [bw, , bd] = b.size;
  return Math.abs(ax - bx) < (aw + bw) / 2 + padding && Math.abs(az - bz) < (ad + bd) / 2 + padding;
};

const placeRooms = (seed: number, roomTypes: InteriorRoomType[], size: number): InteriorRoom[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const rooms: InteriorRoom[] = [];

  const base: InteriorRoom = {
    id: 'room-0',
    type: roomTypes[0],
    center: [0, 0, 0],
    size: [size, ROOM_HEIGHT, size],
  };
  rooms.push(base);

  const directions: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let i = 1; i < roomTypes.length; i += 1) {
    const parent = rooms[Math.floor(rand() * rooms.length)];
    const dir = directions[Math.floor(rand() * directions.length)];
    const childSize = size * (0.85 + rand() * 0.2);
    const offset = (parent.size[0] + childSize) / 2;
    const candidate: InteriorRoom = {
      id: `room-${i}`,
      type: roomTypes[i],
      center: [
        parent.center[0] + dir[0] * offset,
        0,
        parent.center[2] + dir[1] * offset,
      ],
      size: [childSize, ROOM_HEIGHT, childSize],
    };
    if (rooms.some((room) => overlaps(room, candidate))) {
      i -= 1;
      s += 3;
      if (rooms.length > 6) break;
      continue;
    }
    rooms.push(candidate);
  }

  return rooms;
};

/**
 * INN-SPECIFIC: Place rooms in a linear hallway layout (hotel corridor style)
 * Creates a central hallway with bedrooms on alternating sides
 */
const placeInnRooms = (seed: number, bedroomCount: number, baseSize: number): InteriorRoom[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const rooms: InteriorRoom[] = [];

  // Hallway dimensions - narrow central corridor
  const hallwayWidth = 2.8;
  const hallwayLength = Math.min(baseSize * 1.2, 28); // Long corridor, capped at 28 units

  // Bedroom dimensions
  const bedroomWidth = Math.max(4.5, (baseSize - hallwayWidth) / 2); // Rooms on each side
  const bedroomDepth = Math.max(4, hallwayLength / Math.ceil(bedroomCount / 2) - 0.5); // Space along hallway

  // Central hallway
  rooms.push({
    id: 'room-hall-0',
    type: InteriorRoomType.HALL,
    center: [0, 0, 0],
    size: [hallwayWidth, ROOM_HEIGHT, hallwayLength]
  });

  // Place bedrooms alternating left/right along the hallway
  for (let i = 0; i < bedroomCount; i++) {
    const side = i % 2 === 0 ? 1 : -1; // Alternate left (1) and right (-1)
    const row = Math.floor(i / 2); // Which row along the hallway
    const totalRows = Math.ceil(bedroomCount / 2);

    // Position along hallway (z-axis)
    const zPos = (row / totalRows) * hallwayLength - (hallwayLength / 2) + (bedroomDepth / 2);

    // Position perpendicular to hallway (x-axis)
    const xPos = side * (hallwayWidth / 2 + bedroomWidth / 2);

    // Add slight random variation to bedroom size for realism
    const sizeVariation = 0.9 + rand() * 0.2; // 90%-110% of base size

    rooms.push({
      id: `room-bedroom-${i + 1}`,
      type: InteriorRoomType.PRIVATE,
      center: [xPos, 0, zPos],
      size: [bedroomWidth * sizeVariation, ROOM_HEIGHT, bedroomDepth * sizeVariation]
    });
  }

  return rooms;
};

const propTemplates: Array<{
  room: InteriorRoomType[];
  type: InteriorPropType;
  label: string;
  minClass?: SocialClass;
}> = [
  { room: [InteriorRoomType.ENTRY], type: InteriorPropType.FLOOR_MAT, label: 'Woven floor mat' },
  { room: [InteriorRoomType.ENTRY, InteriorRoomType.PRIVATE], type: InteriorPropType.PRAYER_RUG, label: 'Prayer rug' },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.LOW_TABLE, label: 'Low table' },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.CUSHION, label: 'Cushion' },
  { room: [InteriorRoomType.PRIVATE], type: InteriorPropType.BEDROLL, label: 'Sleeping pallet' },
  { room: [InteriorRoomType.PRIVATE], type: InteriorPropType.WALL_HANGING, label: 'Wall hanging', minClass: SocialClass.MERCHANT },
  { room: [InteriorRoomType.PRIVATE], type: InteriorPropType.CHEST, label: 'Storage chest' },
  { room: [InteriorRoomType.STORAGE], type: InteriorPropType.AMPHORA, label: 'Amphorae' },
  { room: [InteriorRoomType.STORAGE], type: InteriorPropType.CRATE, label: 'Stacked crates' },
  { room: [InteriorRoomType.WORKSHOP], type: InteriorPropType.DESK, label: 'Work desk' },
  { room: [InteriorRoomType.WORKSHOP], type: InteriorPropType.INK_SET, label: 'Ink set' },
  { room: [InteriorRoomType.WORKSHOP], type: InteriorPropType.BOOKS, label: 'Manuscripts' },
  { room: [InteriorRoomType.COURTYARD], type: InteriorPropType.WATER_BASIN, label: 'Water basin' },
  { room: [InteriorRoomType.COURTYARD, InteriorRoomType.HALL], type: InteriorPropType.EWER, label: 'Water ewer' },
  { room: [InteriorRoomType.COURTYARD], type: InteriorPropType.RUG, label: 'Courtyard rug', minClass: SocialClass.MERCHANT },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.RUG, label: 'Wool rug', minClass: SocialClass.MERCHANT },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.SHELF, label: 'Shelving' },
  { room: [InteriorRoomType.ENTRY], type: InteriorPropType.LAMP, label: 'Oil lamp' },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.BRAZIER, label: 'Charcoal brazier', minClass: SocialClass.MERCHANT },
  { room: [InteriorRoomType.HALL, InteriorRoomType.PRIVATE], type: InteriorPropType.FIRE_PIT, label: 'Cooking hearth' },
  { room: [InteriorRoomType.PRIVATE], type: InteriorPropType.SCREEN, label: 'Woven screen', minClass: SocialClass.MERCHANT },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.CHAIR, label: 'Wooden chair', minClass: SocialClass.MERCHANT },
  // Food items - appear in halls/private rooms
  { room: [InteriorRoomType.HALL, InteriorRoomType.PRIVATE], type: InteriorPropType.FOOD_BOWL, label: 'Ceramic bowl' },
  { room: [InteriorRoomType.HALL], type: InteriorPropType.DATE_BASKET, label: 'Basket of dates' },
  { room: [InteriorRoomType.HALL, InteriorRoomType.STORAGE], type: InteriorPropType.WATER_JUG, label: 'Water pitcher' },
  { room: [InteriorRoomType.STORAGE], type: InteriorPropType.GRAIN_SACK, label: 'Grain sack' },
];

const roomPropBudget = (socialClass: SocialClass, profession?: string): number => {
  if (socialClass === SocialClass.NOBILITY) return 22;
  if (socialClass === SocialClass.MERCHANT) return 17;
  if (socialClass === SocialClass.CLERGY) return 13;

  // Further reduce for poorest professions
  if (profession) {
    const category = getProfessionCategory(profession);
    if (category === 'LABORER') return 6;  // Very minimal - destitute
    if (category === 'SERVICE') return 8;  // Slightly more
  }
  return 11; // Regular peasant
};

// Generate worn/damaged labels for poor homes
const wornLabel = (baseLabel: string, socialClass: SocialClass, rand: () => number): string => {
  if (socialClass !== SocialClass.PEASANT) return baseLabel;
  if (rand() > 0.5) return baseLabel; // 50% chance of worn label

  const wornPrefixes = ['Worn', 'Patched', 'Frayed', 'Old', 'Threadbare', 'Mended'];
  const prefix = wornPrefixes[Math.floor(rand() * wornPrefixes.length)];
  return `${prefix} ${baseLabel.toLowerCase()}`;
};

// Interior display type for specialized commercial props (separate from the trading MerchantType enum)
type InteriorDisplayType = 'spice' | 'textile' | 'perfume' | 'metal' | 'ceramic' | 'leather' | 'jeweler' | 'general';

const getInteriorDisplayType = (profession: string): InteriorDisplayType => {
  const prof = profession.toLowerCase();
  if (/spice|herb|drug|apothecary/.test(prof)) return 'spice';
  if (/cloth|textile|silk|fabric|draper|tailor/.test(prof)) return 'textile';
  if (/perfume|incense|aromatic|attar/.test(prof)) return 'perfume';
  if (/metal|copper|brass|gold|silver|smith/.test(prof)) return 'metal';
  if (/potter|ceramic|tile/.test(prof)) return 'ceramic';
  if (/leather|hide|tanner|cobbler/.test(prof)) return 'leather';
  if (/jewel|gem|pearl/.test(prof)) return 'jeweler';
  return 'general';
};

const roomPropBudgetByType = (room: InteriorRoom, socialClass: SocialClass): number => {
  const classBoost = socialClass === SocialClass.NOBILITY ? 3 : socialClass === SocialClass.MERCHANT ? 2 : 0;
  switch (room.type) {
    case InteriorRoomType.ENTRY: return 5 + classBoost;
    case InteriorRoomType.HALL: return 9 + classBoost;
    case InteriorRoomType.PRIVATE: return 7 + classBoost;
    case InteriorRoomType.WORKSHOP: return 8 + classBoost;
    case InteriorRoomType.STORAGE: return 6 + classBoost;
    case InteriorRoomType.COURTYARD: return 6 + classBoost;
    default: return 7 + classBoost;
  }
};

const addProp = (
  props: InteriorProp[],
  room: InteriorRoom,
  type: InteriorPropType,
  label: string,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
) => {
  props.push({
    id: `prop-${type}-${room.id}-${props.length}`,
    type,
    roomId: room.id,
    position,
    rotation,
    scale,
    label,
  });
};

const upsertProp = (
  props: InteriorProp[],
  room: InteriorRoom,
  type: InteriorPropType,
  label: string,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
) => {
  const existing = props.find((prop) => prop.roomId === room.id && prop.type === type);
  if (existing) {
    existing.position = position;
    existing.rotation = rotation;
    existing.label = label;
  } else {
    addProp(props, room, type, label, position, rotation);
  }
};

const wallAnchor = (
  room: InteriorRoom,
  side: 'north' | 'south' | 'east' | 'west',
  inset = 0.9,
  offset = 0
): [number, number, number] => {
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;
  if (side === 'north') return [cx + offset, 0, cz + halfD - inset];
  if (side === 'south') return [cx + offset, 0, cz - halfD + inset];
  if (side === 'east') return [cx + halfW - inset, 0, cz + offset];
  return [cx - halfW + inset, 0, cz + offset];
};

const faceIntoRoom = (side: 'north' | 'south' | 'east' | 'west'): [number, number, number] => {
  if (side === 'north') return [0, Math.PI, 0];
  if (side === 'south') return [0, 0, 0];
  if (side === 'east') return [0, -Math.PI / 2, 0];
  return [0, Math.PI / 2, 0];
};

const cornerAnchor = (
  room: InteriorRoom,
  corner: 'ne' | 'nw' | 'se' | 'sw',
  inset = 0.7,
  height = 2.3
): [number, number, number] => {
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2 - inset;
  const halfD = room.size[2] / 2 - inset;
  if (corner === 'ne') return [cx + halfW, height, cz + halfD];
  if (corner === 'nw') return [cx - halfW, height, cz + halfD];
  if (corner === 'se') return [cx + halfW, height, cz - halfD];
  return [cx - halfW, height, cz - halfD];
};

const clampToRoom = (room: InteriorRoom, pos: [number, number, number], margin = 0.6): [number, number, number] => {
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2 - margin;
  const halfD = room.size[2] / 2 - margin;
  return [
    Math.max(cx - halfW, Math.min(cx + halfW, pos[0])),
    pos[1],
    Math.max(cz - halfD, Math.min(cz + halfD, pos[2]))
  ];
};

// Helper to find walls that ARE shared with adjacent rooms (interior doorways)
export const getSharedWalls = (room: InteriorRoom, allRooms: InteriorRoom[]): ('north' | 'south' | 'east' | 'west')[] => {
  const sharedWalls: ('north' | 'south' | 'east' | 'west')[] = [];
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;

  allRooms.forEach((otherRoom) => {
    if (otherRoom.id === room.id) return;
    const [ox, , oz] = otherRoom.center;
    const otherHalfW = otherRoom.size[0] / 2;
    const otherHalfD = otherRoom.size[2] / 2;
    const dx = ox - cx;
    const dz = oz - cz;

    // Adjacent on X axis (east-west)
    if (Math.abs(dx) < (halfW + otherHalfW + 0.5) && Math.abs(dx) > 0.5 && Math.abs(dz) < Math.max(halfD, otherHalfD)) {
      if (dx > 0 && !sharedWalls.includes('east')) sharedWalls.push('east');
      if (dx < 0 && !sharedWalls.includes('west')) sharedWalls.push('west');
    }
    // Adjacent on Z axis (north-south)
    if (Math.abs(dz) < (halfD + otherHalfD + 0.5) && Math.abs(dz) > 0.5 && Math.abs(dx) < Math.max(halfW, otherHalfW)) {
      if (dz > 0 && !sharedWalls.includes('north')) sharedWalls.push('north');
      if (dz < 0 && !sharedWalls.includes('south')) sharedWalls.push('south');
    }
  });
  return sharedWalls;
};

/**
 * INN-SPECIFIC: Get door placement for inn hallway layout
 * All bedrooms should have doors facing the central hallway
 */
const getInnDoorMap = (rooms: InteriorRoom[]): Map<string, 'north' | 'south' | 'east' | 'west' | null> => {
  const map = new Map<string, 'north' | 'south' | 'east' | 'west' | null>();
  const hallway = rooms.find(r => r.type === InteriorRoomType.HALL);

  if (!hallway) {
    // Fallback to standard door mapping if no hallway found
    return new Map(rooms.map(r => [r.id, null]));
  }

  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.HALL) {
      map.set(room.id, null); // Hallway has no door
      return;
    }

    // Bedrooms face the hallway - determine which wall
    // If bedroom is to the left (negative x), door is on east wall (facing right to hallway)
    // If bedroom is to the right (positive x), door is on west wall (facing left to hallway)
    const isLeftSide = room.center[0] < hallway.center[0];
    map.set(room.id, isLeftSide ? 'east' : 'west');
  });

  return map;
};

const getInteriorDoorMap = (rooms: InteriorRoom[], entrySide: 'north' | 'south' | 'east' | 'west'): Map<string, 'north' | 'south' | 'east' | 'west' | null> => {
  const map = new Map<string, 'north' | 'south' | 'east' | 'west' | null>();
  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.ENTRY) {
      map.set(room.id, entrySide);
      return;
    }
    let closest: InteriorRoom | null = null;
    let closestDist = Infinity;
    rooms.forEach((candidate) => {
      if (candidate.id === room.id) return;
      const dx = candidate.center[0] - room.center[0];
      const dz = candidate.center[2] - room.center[2];
      const dist = Math.hypot(dx, dz);
      if (dist < closestDist) {
        closest = candidate;
        closestDist = dist;
      }
    });
    if (!closest) {
      map.set(room.id, null);
      return;
    }
    const dx = closest.center[0] - room.center[0];
    const dz = closest.center[2] - room.center[2];
    if (Math.abs(dx) > Math.abs(dz)) {
      map.set(room.id, dx > 0 ? 'east' : 'west');
    } else {
      map.set(room.id, dz > 0 ? 'north' : 'south');
    }
  });
  return map;
};

const adjustPropsForDoorways = (
  props: InteriorProp[],
  rooms: InteriorRoom[],
  doorMap: Map<string, 'north' | 'south' | 'east' | 'west' | null>
) => {
  const noBlock = new Set<InteriorPropType>([
    InteriorPropType.RUG,
    InteriorPropType.PRAYER_RUG,
    InteriorPropType.FLOOR_MAT,
    InteriorPropType.FLOOR_PILLOWS,
    InteriorPropType.CUSHION,
    InteriorPropType.LANTERN,
    InteriorPropType.CANDLE,
  ]);
  const doorClearance = 1.9;
  const wallThreshold = 0.65;

  props.forEach((prop) => {
    if (noBlock.has(prop.type)) return;
    const room = rooms.find((r) => r.id === prop.roomId);
    if (!room) return;
    const doorSide = doorMap.get(room.id);
    if (!doorSide) return;

    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2;
    const halfD = room.size[2] / 2;
    const [px, py, pz] = prop.position;
    let nextX = px;
    let nextZ = pz;

    if (doorSide === 'north' && (cz + halfD - pz) < wallThreshold && Math.abs(px - cx) < doorClearance) {
      const sign = px >= cx ? 1 : -1;
      nextX = cx + sign * (doorClearance + 0.6);
    } else if (doorSide === 'south' && (pz - (cz - halfD)) < wallThreshold && Math.abs(px - cx) < doorClearance) {
      const sign = px >= cx ? 1 : -1;
      nextX = cx + sign * (doorClearance + 0.6);
    } else if (doorSide === 'east' && (cx + halfW - px) < wallThreshold && Math.abs(pz - cz) < doorClearance) {
      const sign = pz >= cz ? 1 : -1;
      nextZ = cz + sign * (doorClearance + 0.6);
    } else if (doorSide === 'west' && (px - (cx - halfW)) < wallThreshold && Math.abs(pz - cz) < doorClearance) {
      const sign = pz >= cz ? 1 : -1;
      nextZ = cz + sign * (doorClearance + 0.6);
    }

    if (nextX !== px || nextZ !== pz) {
      prop.position = clampToRoom(room, [nextX, py, nextZ], 0.7);
    }
  });
};

const keepInsideOpenSide = (
  room: InteriorRoom,
  pos: [number, number, number],
  openSide: 'north' | 'south' | 'east' | 'west' | null,
  inset = 1.8
): [number, number, number] => {
  if (!openSide) return pos;
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;
  const next: [number, number, number] = [...pos];
  if (openSide === 'south') {
    const minZ = cz - halfD + inset;
    if (next[2] < minZ) next[2] = minZ;
  } else if (openSide === 'north') {
    const maxZ = cz + halfD - inset;
    if (next[2] > maxZ) next[2] = maxZ;
  } else if (openSide === 'west') {
    const minX = cx - halfW + inset;
    if (next[0] < minX) next[0] = minX;
  } else if (openSide === 'east') {
    const maxX = cx + halfW - inset;
    if (next[0] > maxX) next[0] = maxX;
  }
  return next;
};

const addCommercialLayout = (
  props: InteriorProp[],
  rooms: InteriorRoom[],
  profession: string,
  seed: number,
  entrySide: 'north' | 'south' | 'east' | 'west',
  doorMap: Map<string, 'north' | 'south' | 'east' | 'west' | null>,
  sharedWallsMap: Map<string, ('north' | 'south' | 'east' | 'west')[]>
) => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const profLower = profession.toLowerCase();
  const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY);
  const hall = rooms.find((room) => room.type === InteriorRoomType.HALL) ?? rooms[0];
  const clampToRoom = (room: InteriorRoom, pos: [number, number, number], margin = 0.6): [number, number, number] => {
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - margin;
    const halfD = room.size[2] / 2 - margin;
    return [
      Math.max(cx - halfW, Math.min(cx + halfW, pos[0])),
      pos[1],
      Math.max(cz - halfD, Math.min(cz + halfD, pos[2]))
    ];
  };
  const oppositeSide = (side: 'north' | 'south' | 'east' | 'west') => {
    if (side === 'north') return 'south';
    if (side === 'south') return 'north';
    if (side === 'east') return 'west';
    return 'east';
  };
  const getSafeSide = (room: InteriorRoom, preferred: 'north' | 'south' | 'east' | 'west') => {
    const blocked = new Set(sharedWallsMap.get(room.id) ?? []);
    const doorSide = doorMap.get(room.id);
    if (doorSide) blocked.add(doorSide);
    if (!blocked.has(preferred)) return preferred;
    const allSides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    const safe = allSides.filter((side) => !blocked.has(side));
    return safe[0] ?? preferred;
  };
  const wallAnchorSafe = (room: InteriorRoom, side: 'north' | 'south' | 'east' | 'west', inset = 0.9, offset = 0) => {
    const safeSide = getSafeSide(room, side);
    return wallAnchor(room, safeSide, inset, offset);
  };
  const counterSide = oppositeSide(entrySide);

  // INN/FUNDUQ/KHAN/WAKALA/CARAVANSERAI: Common room with long table, benches, fireplace
  if (profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai') || profLower.includes('caravanserai')) {
    const commonRoom = entryRoom ?? hall;
    const [rcx, , rcz] = commonRoom.center;
    const roomWidth = commonRoom.size[0];
    const roomDepth = commonRoom.size[2];

    // LONG COMMUNAL TABLE down the center
    const tableLength = Math.min(roomDepth * 0.6, 8);
    const tableY = 0.78; // Standard table height (for placing items ON the table)
    addProp(props, commonRoom, InteriorPropType.LOW_TABLE, 'Long communal table',
      clampToRoom(commonRoom, [rcx, 0, rcz]),  // Table at ground level
      [0, entrySide === 'east' || entrySide === 'west' ? Math.PI / 2 : 0, 0],
      [1.8, 0.78, tableLength / 1.5] // Wide, long table
    );

    // BENCHES on both sides of the table
    const benchOffset = 1.2; // Distance from table center
    const benchLength = tableLength * 0.8;

    // Bench orientation depends on table orientation
    const benchRotation = entrySide === 'east' || entrySide === 'west' ? Math.PI / 2 : 0;

    addProp(props, commonRoom, InteriorPropType.BENCH, 'Long bench',
      clampToRoom(commonRoom, [rcx - benchOffset, 0, rcz]),
      [0, benchRotation, 0],
      [0.5, 0.5, benchLength]
    );
    addProp(props, commonRoom, InteriorPropType.BENCH, 'Long bench',
      clampToRoom(commonRoom, [rcx + benchOffset, 0, rcz]),
      [0, benchRotation, 0],
      [0.5, 0.5, benchLength]
    );

    // WALL-MOUNTED FIREPLACE (stone hearth)
    const fireplaceSide = getSafeSide(commonRoom, counterSide);
    addProp(props, commonRoom, InteriorPropType.WALL_FIREPLACE, 'Stone hearth',
      clampToRoom(commonRoom, wallAnchorSafe(commonRoom, fireplaceSide, 0.5, 0)),
      faceIntoRoom(fireplaceSide)
    );

    // OIL LAMPS instead of braziers (hanging from ceiling or on table)
    addProp(props, commonRoom, InteriorPropType.FLOOR_LAMP, 'Oil lamp',
      clampToRoom(commonRoom, [rcx - 2, tableY, rcz]),
      [0, 0, 0]
    );
    addProp(props, commonRoom, InteriorPropType.FLOOR_LAMP, 'Oil lamp',
      clampToRoom(commonRoom, [rcx + 2, tableY, rcz]),
      [0, 0, 0]
    );

    // COUNTER for innkeeper
    const counterWall = oppositeSide(entrySide);
    addProp(props, commonRoom, InteriorPropType.COUNTER, 'Inn counter',
      clampToRoom(commonRoom, wallAnchorSafe(commonRoom, counterWall, 0.7, 0)),
      faceIntoRoom(counterWall)
    );

    // Table settings (trays, cups)
    addProp(props, commonRoom, InteriorPropType.TRAY, 'Serving tray',
      clampToRoom(commonRoom, [rcx - 1.2, tableY, rcz + 1.0])
    );
    addProp(props, commonRoom, InteriorPropType.TRAY, 'Serving tray',
      clampToRoom(commonRoom, [rcx + 1.2, tableY, rcz - 1.0])
    );

    return;
  }

  // Position counter more centrally with space behind for shopkeeper
  const [cx, , cz] = hall.center;
  const counterOffset = entrySide === 'north' || entrySide === 'south' ? hall.size[2] * 0.15 : hall.size[0] * 0.15;
  let counterPos: [number, number, number];
  if (entrySide === 'north') {
    counterPos = [cx, 0, cz + counterOffset]; // Counter south of center, faces north towards entrance
  } else if (entrySide === 'south') {
    counterPos = [cx, 0, cz - counterOffset]; // Counter north of center, faces south towards entrance
  } else if (entrySide === 'east') {
    counterPos = [cx - counterOffset, 0, cz]; // Counter west of center, faces east towards entrance
  } else {
    counterPos = [cx + counterOffset, 0, cz]; // Counter east of center, faces west towards entrance
  }
  counterPos = clampToRoom(hall, counterPos, 2.5);
  addProp(props, hall, InteriorPropType.COUNTER, 'Sales counter', counterPos, faceIntoRoom(counterSide));
  const displaySide = entrySide === 'east' || entrySide === 'west'
    ? (entrySide === 'east' ? 'north' : 'south')
    : (entrySide === 'north' ? 'east' : 'west');
  const displayRot = faceIntoRoom(displaySide);
  addProp(
    props,
    hall,
    InteriorPropType.DISPLAY,
    'Display shelf',
    clampToRoom(hall, wallAnchor(hall, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4)),
    displayRot
  );
  addProp(props, hall, InteriorPropType.BASKET, 'Market baskets', clampToRoom(hall, [hall.center[0], 0, hall.center[2] - hall.size[2] / 2 + 2.2]), [0, rand() * Math.PI, 0]);
  // Only add bolts of cloth for textile-related professions
  if (profLower.includes('weaver') || profLower.includes('textile') || profLower.includes('draper') || profLower.includes('tailor') || profLower.includes('cloth')) {
    // Add simple wood table with bolts of cloth on top
    addProp(props, hall, InteriorPropType.LOW_TABLE, 'Cloth display table', clampToRoom(hall, [hall.center[0] + 1.4, 0, hall.center[2] - hall.size[2] / 2 + 0.8]), [0, 0, 0]);
    addProp(props, hall, InteriorPropType.BOLT_OF_CLOTH, 'Bolts of cloth', clampToRoom(hall, [hall.center[0] + 1.4, 0.45, hall.center[2] - hall.size[2] / 2 + 0.8]), [0, 0, 0]);
  }
  const counterTopY = 1.18;
  addProp(props, hall, InteriorPropType.SCALE, 'Balance scale', clampToRoom(hall, [counterPos[0] - 0.5, counterTopY, counterPos[2] + 0.12]));
  addProp(props, hall, InteriorPropType.LEDGER, 'Account ledger', clampToRoom(hall, [counterPos[0] + 0.5, counterTopY, counterPos[2] + 0.12]));
  if (profLower.includes('weaver') || profLower.includes('textile') || profLower.includes('draper')) {
    addProp(props, hall, InteriorPropType.LOOM, 'Weaving loom', clampToRoom(hall, wallAnchor(hall, 'north', 0.8, 0)));
    addProp(props, hall, InteriorPropType.BOLT_OF_CLOTH, 'Dyed cloth bolts', clampToRoom(hall, wallAnchor(hall, 'north', 0.7, 1.6)), [0, Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.SPINDLE, 'Spinning spindle', clampToRoom(hall, wallAnchor(hall, 'west', 0.9, -1.2)));
    addProp(props, hall, InteriorPropType.DYE_VAT, 'Dye vat', clampToRoom(hall, wallAnchor(hall, 'east', 0.9, 1.0)));
  }
  if (profLower.includes('spice') || profLower.includes('apothecary') || profLower.includes('perfume') || profLower.includes('drug')) {
    addProp(props, hall, InteriorPropType.BASKET, 'Spice baskets', clampToRoom(hall, wallAnchor(hall, 'east', 0.8, 0.6)), [0, Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.TRAY, 'Spice tray', clampToRoom(hall, wallAnchor(hall, 'west', 0.8, -0.4)), [0, -Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.MORTAR, 'Mortar & pestle', clampToRoom(hall, [hall.center[0], 0.82, hall.center[2] - hall.size[2] / 2 + 0.9]));
    addProp(props, hall, InteriorPropType.HERB_RACK, 'Herb rack', clampToRoom(hall, wallAnchor(hall, 'north', 0.5, -1.5)), faceIntoRoom('north'));
    // Medicine shelf is wider than counter and should go behind it
    addProp(props, hall, InteriorPropType.MEDICINE_SHELF, 'Medicine shelf', clampToRoom(hall, wallAnchor(hall, counterSide, 0.4, 0)), faceIntoRoom(counterSide));
  }
  if (profLower.includes('smith') || profLower.includes('blacksmith') || profLower.includes('armorer')) {
    addProp(props, hall, InteriorPropType.ANVIL, 'Anvil', clampToRoom(hall, [hall.center[0] + 0.6, 0, hall.center[2] - 0.4]));
    addProp(props, hall, InteriorPropType.TOOL_RACK, 'Tool rack', clampToRoom(hall, wallAnchor(hall, 'north', 0.7, 1.2)), faceIntoRoom('north'));
  }
  if (profLower.includes('baker')) {
    addProp(props, hall, InteriorPropType.TRAY, 'Bread tray', clampToRoom(hall, [hall.center[0] - 0.4, 0.75, hall.center[2] - hall.size[2] / 2 + 0.9]));
    addProp(props, hall, InteriorPropType.BASKET, 'Flour baskets', clampToRoom(hall, wallAnchor(hall, 'east', 0.8, -0.6)), [0, Math.PI / 2, 0]);
    // Baker food items
    addProp(props, hall, InteriorPropType.BREAD_LOAF, 'Fresh flatbreads', clampToRoom(hall, [hall.center[0] + 1.2, 0.9, hall.center[2] - 0.8]));
    addProp(props, hall, InteriorPropType.GRAIN_SACK, 'Flour sack', clampToRoom(hall, wallAnchor(hall, 'west', 0.6, 1.2)));
  }

  // Cook and food service items (inns, funduqs serve meals)
  if (profLower.includes('cook') || profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('wakala') || profLower.includes('caravanserai')) {
    addProp(props, hall, InteriorPropType.COOKING_POT, 'Copper cooking pot', clampToRoom(hall, wallAnchor(hall, 'east', 1.0, -1.5)));
    addProp(props, hall, InteriorPropType.SPICE_JAR, 'Spice jars', clampToRoom(hall, [hall.center[0] - 1.5, 0.8, hall.center[2] + 1.5]));
    if (rand() > 0.4) {
      addProp(props, hall, InteriorPropType.DATE_BASKET, 'Fresh dates', clampToRoom(hall, [hall.center[0] + 1.0, 0.7, hall.center[2] - 1.2]));
    }
  }

  // Merchant-specific display items based on display type
  const displayType = getInteriorDisplayType(profession);
  if (displayType !== 'general') {
    const displayRoom = entryRoom ?? hall;
    const [dcx, , dcz] = displayRoom.center;

    switch (displayType) {
      case 'spice':
        addProp(props, displayRoom, InteriorPropType.SPICE_DISPLAY, 'Spice jars display', clampToRoom(displayRoom, [dcx + 1.5, 0.9, dcz - 1.0]));
        // Enhance existing basket labels
        props.filter(p => p.type === InteriorPropType.BASKET && p.roomId === displayRoom.id).forEach(p => p.label = 'Dried herbs basket');
        break;

      case 'textile':
        // Enhance bolt of cloth labels
        const fabrics = ['Damascus silk', 'Fine cotton', 'Dyed wool', 'Embroidered linen'];
        props.filter(p => p.type === InteriorPropType.BOLT_OF_CLOTH).forEach((p, i) => {
          p.label = fabrics[i % fabrics.length];
        });
        break;

      case 'perfume':
        addProp(props, displayRoom, InteriorPropType.PERFUME_BOTTLES, 'Perfume bottles', clampToRoom(displayRoom, [dcx + 1.2, 0.9, dcz - 0.8]));
        addProp(props, displayRoom, InteriorPropType.BRAZIER, 'Incense brazier', clampToRoom(displayRoom, [dcx - 1.0, 0, dcz + 0.5]));
        break;

      case 'metal':
        addProp(props, displayRoom, InteriorPropType.METAL_SAMPLES, 'Metalwork samples', clampToRoom(displayRoom, [dcx + 1.5, 0.8, dcz - 1.2]));
        break;

      case 'ceramic':
        addProp(props, displayRoom, InteriorPropType.CERAMIC_DISPLAY, 'Pottery display', clampToRoom(displayRoom, [dcx + 1.8, 0, dcz - 0.5]));
        break;

      case 'leather':
        addProp(props, displayRoom, InteriorPropType.LEATHER_GOODS, 'Leather goods', clampToRoom(displayRoom, wallAnchor(displayRoom, 'west', 0.5, -1.0)));
        break;

      case 'jeweler':
        addProp(props, displayRoom, InteriorPropType.JEWELRY_CASE, 'Jewelry display case', clampToRoom(displayRoom, [dcx, 0.85, dcz - 0.3]));
        // Extra lamp for jewelry viewing
        addProp(props, displayRoom, InteriorPropType.LAMP, 'Display lamp', clampToRoom(displayRoom, [dcx + 0.5, 0.9, dcz - 0.3]));
        break;
    }
  }
};

const placePropPosition = (
  type: InteriorPropType,
  room: InteriorRoom,
  rand: () => number,
  avoidSide?: 'north' | 'south' | 'east' | 'west'
): { position: [number, number, number]; rotation: [number, number, number] } => {
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;
  const wallInset = 0.6;
  let wallPick = Math.floor(rand() * 4);
  const wallOffset = () => (rand() - 0.5) * (room.size[0] * 0.5);
  const wallZOffset = () => (rand() - 0.5) * (room.size[2] * 0.5);
  const centerOffset = () => (rand() - 0.5) * (Math.min(room.size[0], room.size[2]) * 0.2);

  const wallPickToSide = (pick: number): 'north' | 'south' | 'east' | 'west' => {
    if (pick === 0) return 'south';
    if (pick === 1) return 'north';
    if (pick === 2) return 'west';
    return 'east';
  };
  if (avoidSide) {
    const side = wallPickToSide(wallPick);
    if (side === avoidSide) {
      wallPick = (wallPick + 1) % 4;
    }
  }

  const adjustForDoor = (pos: [number, number, number]): [number, number, number] => {
    if (!avoidSide) return pos;
    const doorHalf = 2.4; // Increased from 1.6 for better doorway clearance
    if (avoidSide === 'north' && Math.abs(pos[0] - cx) < doorHalf && pos[2] > cz) {
      return [pos[0] + (rand() > 0.5 ? doorHalf : -doorHalf), pos[1], pos[2]];
    }
    if (avoidSide === 'south' && Math.abs(pos[0] - cx) < doorHalf && pos[2] < cz) {
      return [pos[0] + (rand() > 0.5 ? doorHalf : -doorHalf), pos[1], pos[2]];
    }
    if (avoidSide === 'east' && Math.abs(pos[2] - cz) < doorHalf && pos[0] > cx) {
      return [pos[0], pos[1], pos[2] + (rand() > 0.5 ? doorHalf : -doorHalf)];
    }
    if (avoidSide === 'west' && Math.abs(pos[2] - cz) < doorHalf && pos[0] < cx) {
      return [pos[0], pos[1], pos[2] + (rand() > 0.5 ? doorHalf : -doorHalf)];
    }
    return pos;
  };

  const wallAligned = (): { position: [number, number, number]; rotation: [number, number, number] } => {
    if (wallPick === 0) {
      // South wall - face north (into room)
      return { position: adjustForDoor([cx + wallOffset(), 0, cz - halfD + wallInset]), rotation: [0, Math.PI, 0] };
    }
    if (wallPick === 1) {
      // North wall - face south (into room)
      return { position: adjustForDoor([cx + wallOffset(), 0, cz + halfD - wallInset]), rotation: [0, 0, 0] };
    }
    if (wallPick === 2) {
      // West wall - face east (into room)
      return { position: adjustForDoor([cx - halfW + wallInset, 0, cz + wallZOffset()]), rotation: [0, Math.PI / 2, 0] };
    }
    // East wall - face west (into room)
    return { position: adjustForDoor([cx + halfW - wallInset, 0, cz + wallZOffset()]), rotation: [0, -Math.PI / 2, 0] };
  };

  switch (type) {
    case InteriorPropType.BEDROLL:
    case InteriorPropType.CHEST:
    case InteriorPropType.DESK:
    case InteriorPropType.SHELF:
    case InteriorPropType.WATER_BASIN:
    case InteriorPropType.EWER:
    case InteriorPropType.SCREEN:
    case InteriorPropType.CHAIR:
    case InteriorPropType.COUNTER:
    case InteriorPropType.DISPLAY:
    case InteriorPropType.BOLT_OF_CLOTH:
    case InteriorPropType.BASKET:
    case InteriorPropType.TRAY:
    case InteriorPropType.TEA_SET:
    case InteriorPropType.SCALE:
    case InteriorPropType.LEDGER:
    case InteriorPropType.BOOKS:
    case InteriorPropType.INK_SET:
    case InteriorPropType.LADDER:
    case InteriorPropType.STAIRS:
    case InteriorPropType.CANDLE:
    case InteriorPropType.FLOOR_LAMP:
    case InteriorPropType.LANTERN:
    case InteriorPropType.SPINDLE:
    case InteriorPropType.DYE_VAT:
    case InteriorPropType.ANVIL:
    case InteriorPropType.TOOL_RACK:
    case InteriorPropType.MORTAR:
    case InteriorPropType.HERB_RACK:
      return wallAligned();
    case InteriorPropType.FIRE_PIT:
    case InteriorPropType.BRAZIER:
      return { position: [cx + centerOffset(), 0, cz + centerOffset()], rotation: [0, rand() * Math.PI * 2, 0] };
    case InteriorPropType.HOOKAH:
      return { position: [cx + (rand() - 0.5) * 2.4, 0, cz + (rand() - 0.5) * 2.4], rotation: [0, rand() * Math.PI * 2, 0] };
    case InteriorPropType.WALL_HANGING:
      return { position: [cx + wallOffset(), 0, cz - halfD + 0.15], rotation: [0, 0, 0] };
    case InteriorPropType.RUG:
    case InteriorPropType.PRAYER_RUG:
    case InteriorPropType.FLOOR_MAT:
    case InteriorPropType.FLOOR_PILLOWS:
      return { position: [cx + centerOffset(), 0, cz + centerOffset()], rotation: [0, rand() * Math.PI, 0] };
    case InteriorPropType.LOW_TABLE:
      return { position: [cx + centerOffset(), 0, cz + centerOffset()], rotation: [0, rand() * Math.PI * 2, 0] };
    default:
      return wallAligned();
  }
};

const pickProps = (
  rooms: InteriorRoom[],
  socialClass: SocialClass,
  buildingType: BuildingType,
  profession: string,
  seed: number,
  entrySide: 'north' | 'south' | 'east' | 'west',
  doorMap: Map<string, 'north' | 'south' | 'east' | 'west' | null>,
  sharedWallsMap: Map<string, ('north' | 'south' | 'east' | 'west')[]>,
  floorType: 'public' | 'private'
): InteriorProp[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const props: InteriorProp[] = [];
  const budget = Math.max(roomPropBudget(socialClass, profession), rooms.length * 3);
  const roomCounts = new Map<string, number>();
  const roomCaps = new Map<string, number>();
  rooms.forEach((room) => {
    roomCounts.set(room.id, 0);
    roomCaps.set(room.id, roomPropBudgetByType(room, socialClass));
  });
  const profLower = profession.toLowerCase();
  const extraTemplates: typeof propTemplates = [];
  const uniqueTypes = new Set([
    InteriorPropType.COUNTER,
    InteriorPropType.DISPLAY,
    InteriorPropType.SCALE,
    InteriorPropType.LEDGER,
    InteriorPropType.BOLT_OF_CLOTH,
    InteriorPropType.DESK,
    InteriorPropType.SHELF,
    InteriorPropType.BRAZIER,
    InteriorPropType.FIRE_PIT,
    InteriorPropType.BEDROLL,
    InteriorPropType.LAMP,
    InteriorPropType.FLOOR_LAMP,
    InteriorPropType.CANDLE,
    InteriorPropType.HOOKAH,
  ]);

  if (floorType === 'public' && (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY)) {
    addCommercialLayout(props, rooms, profession, seed + 17, entrySide, doorMap, sharedWallsMap);
  }

  if (socialClass === SocialClass.NOBILITY) {
    extraTemplates.push(
      { room: [InteriorRoomType.HALL], type: InteriorPropType.RUG, label: 'Knotted wool rug', minClass: SocialClass.NOBILITY },
      { room: [InteriorRoomType.HALL], type: InteriorPropType.SCREEN, label: 'Carved screen', minClass: SocialClass.NOBILITY },
      { room: [InteriorRoomType.PRIVATE], type: InteriorPropType.WALL_HANGING, label: 'Silk wall hanging', minClass: SocialClass.NOBILITY },
    );
  }
  if (socialClass === SocialClass.PEASANT) {
    extraTemplates.push(
      { room: [InteriorRoomType.HALL, InteriorRoomType.PRIVATE], type: InteriorPropType.FIRE_PIT, label: 'Cooking hearth' },
      { room: [InteriorRoomType.HALL], type: InteriorPropType.WATER_BASIN, label: 'Water basin' },
      { room: [InteriorRoomType.HALL], type: InteriorPropType.EWER, label: 'Water ewer' },
    );
  }
  if (buildingType === BuildingType.RELIGIOUS || profLower.includes('qur')) {
    extraTemplates.push(
      { room: [InteriorRoomType.PRIVATE, InteriorRoomType.HALL], type: InteriorPropType.PRAYER_RUG, label: 'Prayer rug' },
      { room: [InteriorRoomType.WORKSHOP, InteriorRoomType.HALL], type: InteriorPropType.DESK, label: 'Study desk' },
      { room: [InteriorRoomType.WORKSHOP, InteriorRoomType.HALL], type: InteriorPropType.BOOKS, label: 'Manuscripts' },
    );
  }
  if (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL || profLower.includes('scribe')) {
    extraTemplates.push(
      { room: [InteriorRoomType.HALL, InteriorRoomType.WORKSHOP], type: InteriorPropType.DESK, label: 'Writing desk' },
      { room: [InteriorRoomType.HALL, InteriorRoomType.WORKSHOP], type: InteriorPropType.BOOKS, label: 'Ledgers' },
      { room: [InteriorRoomType.HALL], type: InteriorPropType.CHAIR, label: 'Carved chair', minClass: SocialClass.MERCHANT },
    );
  }
  if (floorType === 'public' && (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY)) {
    // Skip extra templates for inns - already handled in addCommercialLayout
    if (profLower.includes('caravanserai')) {
      extraTemplates.push(
        { room: [InteriorRoomType.HALL], type: InteriorPropType.COUNTER, label: 'Reception counter' },
        { room: [InteriorRoomType.STORAGE], type: InteriorPropType.CRATE, label: 'Cargo crates' },
        { room: [InteriorRoomType.STORAGE], type: InteriorPropType.AMPHORA, label: 'Oil amphorae' },
      );
    } else {
      extraTemplates.push(
        { room: [InteriorRoomType.HALL], type: InteriorPropType.COUNTER, label: 'Sales counter' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.DISPLAY, label: 'Display shelf' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.BASKET, label: 'Market baskets' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.SCALE, label: 'Balance scale' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.LEDGER, label: 'Account ledger' },
      );
    }
  }

  // Check if this is an inn/caravanserai (guest rooms get minimal furniture via applyRoomLayouts)
  const profLowerCase = profession.toLowerCase();
  const isInnBuilding = profLowerCase.includes('inn') || profLowerCase.includes('funduq') || profLowerCase.includes('khan') || profLowerCase.includes('wakala') || profLowerCase.includes('caravanserai');

  rooms.forEach((room) => {
    // Skip narrow corridors (inn hallways) - they shouldn't have furniture
    // Hallway width is 2.8, normal halls are 4.5+
    if (room.type === InteriorRoomType.HALL && room.size[0] < 3.5) return;

    // Skip inn guest rooms (PRIVATE rooms in inns) - they get minimal furniture in applyRoomLayouts
    if (room.type === InteriorRoomType.PRIVATE && isInnBuilding && floorType === 'private') return;

    const candidates = [...propTemplates, ...extraTemplates].filter((template) => {
      if (!template.room.includes(room.type)) return false;
      if (template.minClass && socialClass !== template.minClass && socialClass !== SocialClass.NOBILITY) return false;
      if (uniqueTypes.has(template.type) && props.some((prop) => prop.roomId === room.id && prop.type === template.type)) return false;
      return true;
    });
    const count = Math.min(candidates.length, 4 + Math.floor(rand() * 2));
    for (let i = 0; i < count && props.length < budget; i += 1) {
      const template = candidates[Math.floor(rand() * candidates.length)];
      const cap = roomCaps.get(room.id) ?? 6;
      const current = roomCounts.get(room.id) ?? 0;
      if (current >= cap) break;
      // For ENTRY rooms, avoid the exterior door side
      // For other rooms, avoid any shared walls (interior doorways)
      let avoidSide: 'north' | 'south' | 'east' | 'west' | undefined;
      if (room.type === InteriorRoomType.ENTRY) {
        avoidSide = entrySide;
      } else {
        const sharedWalls = getSharedWalls(room, rooms);
        if (sharedWalls.length > 0) {
          avoidSide = sharedWalls[0]; // Avoid the first shared wall (interior doorway)
        }
      }
      const placement = placePropPosition(template.type, room, rand, avoidSide);

      // Use larger margins for large props to prevent wall clipping
      let margin = 0.6;
      if (template.type === InteriorPropType.FLOOR_MAT) {
        margin = 1.8; // Floor mat can be 3.2 wide, so needs 1.6+ margin
      } else if (template.type === InteriorPropType.RUG || template.type === InteriorPropType.PRAYER_RUG) {
        margin = 3.5; // Rugs can be very large (8.8 wide), need more margin
      } else if (template.type === InteriorPropType.BENCH || template.type === InteriorPropType.LOW_TABLE) {
        margin = 1.2; // Tables and benches are also fairly large
      } else if (template.type === InteriorPropType.COUNTER) {
        margin = 2.5; // Counter is 4.2 wide, needs large margin
      }

      const clamped = clampToRoom(room, placement.position, margin);
      props.push({
        id: `prop-${room.id}-${props.length}`,
        type: template.type,
        roomId: room.id,
        position: clamped,
        rotation: placement.rotation,
        scale: [1, 1, 1],
        label: template.label,
      });
      roomCounts.set(room.id, current + 1);
    }
  });

  rooms.forEach((room) => {
    // Skip narrow corridors (inn hallways) - they shouldn't have furniture/lighting
    if (room.type === InteriorRoomType.HALL && room.size[0] < 3.5) return;

    const hasLight = props.some((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.LAMP
      || prop.type === InteriorPropType.BRAZIER
      || prop.type === InteriorPropType.FIRE_PIT
      || prop.type === InteriorPropType.CANDLE
      || prop.type === InteriorPropType.FLOOR_LAMP
    ));
    if (!hasLight) {
      let avoidSide: 'north' | 'south' | 'east' | 'west' | undefined;
      if (room.type === InteriorRoomType.ENTRY) {
        avoidSide = entrySide;
      } else {
        const sharedWalls = getSharedWalls(room, rooms);
        if (sharedWalls.length > 0) {
          avoidSide = sharedWalls[0];
        }
      }
      const placement = placePropPosition(InteriorPropType.LAMP, room, rand, avoidSide);
      const clamped = clampToRoom(room, placement.position);
      props.push({
        id: `prop-lamp-${room.id}`,
        type: InteriorPropType.LAMP,
        roomId: room.id,
        position: clamped,
        rotation: placement.rotation,
        scale: [1, 1, 1],
        label: 'Oil lamp',
      });
    }
  });

  if (socialClass !== SocialClass.PEASANT) {
    // Find a hall that isn't a narrow corridor (corridor width is 2.8, normal halls are 4.5+)
    const hall = rooms.find((room) => room.type === InteriorRoomType.HALL && room.size[0] >= 3.5) ?? rooms[0];
    const hasRug = props.some((prop) => prop.type === InteriorPropType.RUG);
    if (!hasRug && hall.size[0] >= 3.5) {
      const placement = placePropPosition(InteriorPropType.RUG, hall, rand);
      const clamped = clampToRoom(hall, placement.position, 3.5); // Rugs are very large (8.8 wide)
      props.push({
        id: `prop-rug-${hall.id}`,
        type: InteriorPropType.RUG,
        roomId: hall.id,
        position: clamped,
        rotation: placement.rotation,
        scale: [1, 1, 1],
        label: 'Knotted rug',
      });
    }
  }

  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.HALL) {
      // Skip narrow corridors (inn hallways) - they shouldn't have furniture
      if (room.size[0] < 3.5) return;
      // Skip auto-table for inns - they have custom communal table layout
      if (profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai')) return;
      const hasTable = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
      if (!hasTable) {
        // Non-entry rooms don't need to avoid door sides
        const placement = placePropPosition(InteriorPropType.LOW_TABLE, room, rand, undefined);
        const clamped = clampToRoom(room, placement.position, 1.2); // Tables are fairly large
        props.push({
          id: `prop-table-${room.id}`,
          type: InteriorPropType.LOW_TABLE,
          roomId: room.id,
          position: clamped,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Low table',
        });
      }
      if (room.size[0] > 14 && rand() > 0.55) {
        const placement = placePropPosition(InteriorPropType.LOW_TABLE, room, rand, undefined);
        const clamped = clampToRoom(room, placement.position);
        props.push({
          id: `prop-table-${room.id}-extra`,
          type: InteriorPropType.LOW_TABLE,
          roomId: room.id,
          position: clamped,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Low table',
        });
      }
    }
    if (room.type === InteriorRoomType.PRIVATE) {
      const hasBed = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.BEDROLL);
      if (!hasBed) {
        const placement = placePropPosition(InteriorPropType.BEDROLL, room, rand, undefined);
        const clamped = clampToRoom(room, placement.position);
        props.push({
          id: `prop-bed-${room.id}`,
          type: InteriorPropType.BEDROLL,
          roomId: room.id,
          position: clamped,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Sleeping pallet',
        });
      }
    }
    if (room.type === InteriorRoomType.WORKSHOP) {
      const hasDesk = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.DESK);
      if (!hasDesk) {
        const placement = placePropPosition(InteriorPropType.DESK, room, rand, undefined);
        const clamped = clampToRoom(room, placement.position);
        props.push({
          id: `prop-desk-${room.id}`,
          type: InteriorPropType.DESK,
          roomId: room.id,
          position: clamped,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Work desk',
        });
      }
    }
    if (room.type === InteriorRoomType.COURTYARD) {
      const hasBasin = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.WATER_BASIN);
      if (!hasBasin) {
        const placement = placePropPosition(InteriorPropType.WATER_BASIN, room, rand, undefined);
        const clamped = clampToRoom(room, placement.position);
        props.push({
          id: `prop-basin-${room.id}`,
          type: InteriorPropType.WATER_BASIN,
          roomId: room.id,
          position: clamped,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Water basin',
        });
      }
    }
  });

  // Prune and centralize fire sources: one per room.
  rooms.forEach((room) => {
    const fireSources = props.filter((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.FIRE_PIT || prop.type === InteriorPropType.BRAZIER
    ));
    if (fireSources.length > 1) {
      const hasPit = fireSources.find((prop) => prop.type === InteriorPropType.FIRE_PIT);
      const keep = hasPit ?? fireSources[0];
      props.splice(0, props.length, ...props.filter((prop) => {
        if (prop.roomId !== room.id) return true;
        if (prop.type !== InteriorPropType.FIRE_PIT && prop.type !== InteriorPropType.BRAZIER) return true;
        return prop.id === keep.id;
      }));
    }
    const kept = props.find((prop) => prop.roomId === room.id && prop.type === InteriorPropType.FIRE_PIT);
    if (kept && room.type === InteriorRoomType.HALL) {
      // Offset fire pit slightly from center to avoid clustering
      kept.position = [room.center[0] + 1.2, 0, room.center[2] - 0.8];
    }
  });

  // Add table and counter candles.
  rooms.forEach((room) => {
    const tables = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
    const counters = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.COUNTER);
    const desks = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.DESK);
    if (tables.length === 0 && counters.length === 0 && desks.length === 0) return;
    const existingCandles = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.CANDLE);
    const maxCandles = socialClass === SocialClass.NOBILITY ? 2 : socialClass === SocialClass.MERCHANT ? 1 : 0;
    if (existingCandles.length >= maxCandles) return;
    const pick = (list: InteriorProp[]) => list[Math.floor(rand() * list.length)];
    const target = tables.length ? pick(tables) : counters.length ? pick(counters) : pick(desks);
    const baseY = target.type === InteriorPropType.COUNTER ? 1.22 : target.type === InteriorPropType.DESK ? 0.95 : 0.45;
    props.push({
      id: `prop-candle-${room.id}-${existingCandles.length}`,
      type: InteriorPropType.CANDLE,
      roomId: room.id,
      position: [target.position[0], baseY, target.position[2]],
      rotation: [0, rand() * Math.PI * 2, 0],
      scale: [1, 1, 1],
      label: 'Beeswax candle',
    });
  });

  // Add lighting - type depends on social class and building type.
  // Ordinary people (peasant, merchant) get oil lamps and candles.
  // Wealthy (nobility, clergy) and religious/civic buildings get ornate Damascus lanterns.
  rooms.forEach((room) => {
    // Skip narrow corridors (inn hallways) - they shouldn't have furniture/lighting
    if (room.type === InteriorRoomType.HALL && room.size[0] < 3.5) return;

    // Skip inn guest rooms - they already get a single lamp in applyRoomLayouts
    if (room.type === InteriorRoomType.PRIVATE && isInnBuilding && floorType === 'private') return;

    const hasFireSource = props.some((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.BRAZIER || prop.type === InteriorPropType.FIRE_PIT
    ));

    const roomArea = room.size[0] * room.size[2];
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - 1.5;
    const halfD = room.size[2] / 2 - 1.5;

    // Determine if this room should have fancy Damascus lanterns or simple oil lamps
    const useDamascusLanterns = (
      buildingType === BuildingType.RELIGIOUS ||
      buildingType === BuildingType.CIVIC ||
      buildingType === BuildingType.SCHOOL ||
      buildingType === BuildingType.MEDICAL ||
      socialClass === SocialClass.NOBILITY ||
      socialClass === SocialClass.CLERGY
    );

    if (useDamascusLanterns) {
      // Wealthy and religious/civic buildings get ornate Damascus lanterns
      let lanternCount = 2;
      if (buildingType === BuildingType.RELIGIOUS || buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL) {
        // Reduced lantern count for civic buildings to avoid GPU texture limit
        const isCivicLike = buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL;
        lanternCount = isCivicLike ? 3 : 4;
        if (roomArea > 100) lanternCount = isCivicLike ? 3 : 5;
      } else if (socialClass === SocialClass.NOBILITY && roomArea > 80) {
        lanternCount = 3;
      }

      if (hasFireSource) lanternCount = Math.max(1, lanternCount - 1);
      lanternCount = Math.min(2, lanternCount);

      const existingLanterns = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LANTERN).length;
      const lanternsToAdd = Math.max(0, lanternCount - existingLanterns);
      const sharedWallsForLanterns = getSharedWalls(room, rooms);

      // For ENTRY rooms, also avoid the exterior door side (no wall there)
      const lanternWallsToAvoid = [...sharedWallsForLanterns];
      if (room.type === InteriorRoomType.ENTRY) {
        if (!lanternWallsToAvoid.includes(entrySide)) {
          lanternWallsToAvoid.push(entrySide);
        }
      }

      // Define lantern positions avoiding shared walls and entry side
      const lanternPositions: Array<{ x: number; z: number; walls: ('north' | 'south' | 'east' | 'west')[] }> = [
        { x: cx + (rand() - 0.5) * 1.0, z: cz + (rand() - 0.5) * 1.0, walls: [] }, // Center
        { x: cx - halfW * 0.4, z: cz - halfD * 0.4, walls: ['south', 'west'] },
        { x: cx + halfW * 0.4, z: cz - halfD * 0.4, walls: ['south', 'east'] },
        { x: cx - halfW * 0.4, z: cz + halfD * 0.4, walls: ['north', 'west'] },
        { x: cx + halfW * 0.4, z: cz + halfD * 0.4, walls: ['north', 'east'] },
      ];

      // Filter positions to avoid walls to avoid
      const safeLanternPositions = lanternPositions.filter(pos =>
        pos.walls.length === 0 || !pos.walls.some(wall => lanternWallsToAvoid.includes(wall))
      );

      for (let i = 0; i < lanternsToAdd && i < safeLanternPositions.length; i++) {
        const pos = safeLanternPositions[i];
        const clamped = clampToRoom(room, [pos.x, 2.2, pos.z]);
        props.push({
          id: `prop-lantern-${room.id}-${i}`,
          type: InteriorPropType.LANTERN,
          roomId: room.id,
          position: clamped,
          rotation: [0, rand() * Math.PI * 2, 0],
          scale: [1, 1, 1],
          label: 'Damascus lantern',
        });
      }
    } else {
      // Ordinary people (peasant, merchant) get oil lamps and candles
      // More numerous simple lighting for proper illumination
      let floorLampCount = 2; // Standing oil lamps
      let tableLampCount = 1; // Tabletop oil lamps
      let candleCount = 2; // Candles for additional light

      // Larger rooms get more lights
      if (roomArea > 80) {
        floorLampCount = 3;
        tableLampCount = 2;
        candleCount = 3;
      }
      if (roomArea > 120) {
        floorLampCount = 4;
        tableLampCount = 2;
        candleCount = 4;
      }

      if (hasFireSource) {
        floorLampCount = Math.max(1, floorLampCount - 1);
        candleCount = Math.max(1, candleCount - 1);
      }

      // PEASANT class gets minimal lighting - they're too poor for multiple lamps
      // A ragpicker would have a single crude clay lamp, not brass floor lamps
      if (socialClass === SocialClass.PEASANT) {
        floorLampCount = 0; // Too poor for standing brass lamps
        tableLampCount = 1; // Single crude clay lamp
        candleCount = hasFireSource ? 0 : 1; // Maybe one tallow candle if no fire
      }

      // Add standing floor oil lamps - avoid placing near shared walls or exterior open sides
      const existingFloorLamps = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.FLOOR_LAMP).length;
      const floorLampsToAdd = Math.max(0, floorLampCount - existingFloorLamps);
      const sharedWalls = getSharedWalls(room, rooms);

      // For ENTRY rooms, also avoid the exterior door side (no wall there)
      const wallsToAvoid = [...sharedWalls];
      if (room.type === InteriorRoomType.ENTRY) {
        if (!wallsToAvoid.includes(entrySide)) {
          wallsToAvoid.push(entrySide);
        }
      }

      // Define corner positions and which walls they're near - use 0.5 multiplier for safer placement
      const cornerPositions: Array<{ x: number; z: number; walls: ('north' | 'south' | 'east' | 'west')[] }> = [
        { x: cx - halfW * 0.5, z: cz - halfD * 0.5, walls: ['south', 'west'] },
        { x: cx + halfW * 0.5, z: cz - halfD * 0.5, walls: ['south', 'east'] },
        { x: cx - halfW * 0.5, z: cz + halfD * 0.5, walls: ['north', 'west'] },
        { x: cx + halfW * 0.5, z: cz + halfD * 0.5, walls: ['north', 'east'] },
      ];

      // Filter out corners that are near walls to avoid (shared or exterior open)
      const safeCorners = cornerPositions.filter(corner =>
        !corner.walls.some(wall => wallsToAvoid.includes(wall))
      );
      // If all corners are near walls to avoid, fall back to center positions
      const positionsToUse = safeCorners.length > 0 ? safeCorners : [
        { x: cx, z: cz - halfD * 0.25, walls: [] },
        { x: cx, z: cz + halfD * 0.25, walls: [] },
        { x: cx - halfW * 0.25, z: cz, walls: [] },
        { x: cx + halfW * 0.25, z: cz, walls: [] },
      ];

      for (let i = 0; i < floorLampsToAdd && i < positionsToUse.length; i++) {
        const pos = positionsToUse[i];
        const clamped = clampToRoom(room, [pos.x, 0, pos.z]);
        props.push({
          id: `prop-floor-lamp-${room.id}-${i}`,
          type: InteriorPropType.FLOOR_LAMP,
          roomId: room.id,
          position: clamped,
          rotation: [0, rand() * Math.PI * 2, 0],
          scale: [1, 1, 1],
          label: 'Standing oil lamp',
        });
      }

      // Add tabletop oil lamps (placed on tables/counters later)
      const existingTableLamps = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LAMP).length;
      const tableLampsToAdd = Math.max(0, tableLampCount - existingTableLamps);

      for (let i = 0; i < tableLampsToAdd; i++) {
        // Place near center or on surfaces
        const x = cx + (rand() - 0.5) * halfW * 0.6;
        const z = cz + (rand() - 0.5) * halfD * 0.6;
        const clamped = clampToRoom(room, [x, 0.7, z]);

        props.push({
          id: `prop-lamp-${room.id}-${i}`,
          type: InteriorPropType.LAMP,
          roomId: room.id,
          position: clamped,
          rotation: [0, rand() * Math.PI * 2, 0],
          scale: [1, 1, 1],
          label: 'Oil lamp',
        });
      }

      // Add candles for supplementary lighting - only on surfaces
      const existingCandles = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.CANDLE).length;
      const candlesToAdd = Math.max(0, candleCount - existingCandles);

      // Find available surfaces for candles
      const tables = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
      const counters = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.COUNTER);
      const desks = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.DESK);
      const allSurfaces = [...tables, ...counters, ...desks];

      // Only add candles if there are surfaces to put them on
      if (allSurfaces.length > 0) {
        for (let i = 0; i < candlesToAdd && i < allSurfaces.length; i++) {
          const surface = allSurfaces[i % allSurfaces.length];
          // Determine correct height based on surface type
          const baseY = surface.type === InteriorPropType.COUNTER
            ? 1.22
            : surface.type === InteriorPropType.DESK
              ? 0.95
              : 0.45; // LOW_TABLE

          // Place candle on surface with small random offset from center
          const offsetX = (rand() - 0.5) * 0.4;
          const offsetZ = (rand() - 0.5) * 0.4;

          props.push({
            id: `prop-candle-${room.id}-${i}`,
            type: InteriorPropType.CANDLE,
            roomId: room.id,
            position: [surface.position[0] + offsetX, baseY, surface.position[2] + offsetZ],
            rotation: [0, rand() * Math.PI * 2, 0],
            scale: [1, 1, 1],
            label: 'Candle',
          });
        }
      }
    }
  });

  rooms.forEach((room) => {
    const table = props.find((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
    if (!table) return;
    const cluster = props.filter((prop) => prop.roomId === room.id && (prop.type === InteriorPropType.CUSHION || prop.type === InteriorPropType.FLOOR_PILLOWS));
    const positions: Array<[number, number, number]> = [
      [table.position[0] + 1.0, 0, table.position[2]],
      [table.position[0] - 1.0, 0, table.position[2]],
      [table.position[0], 0, table.position[2] + 1.0],
      [table.position[0], 0, table.position[2] - 1.0],
    ];
    cluster.forEach((prop, index) => {
      const pos = positions[index % positions.length];
      prop.position = [pos[0], 0, pos[2]];
    });
  });

  return props;
};

const applyRoomLayouts = (
  props: InteriorProp[],
  rooms: InteriorRoom[],
  buildingType: BuildingType,
  profession: string,
  socialClass: SocialClass,
  seed: number,
  entrySide: 'north' | 'south' | 'east' | 'west',
  doorMap: Map<string, 'north' | 'south' | 'east' | 'west' | null>,
  sharedWallsMap: Map<string, ('north' | 'south' | 'east' | 'west')[]>,
  floorType: 'public' | 'private',
  familyContext?: FamilyInteriorContext
) => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const profLower = profession.toLowerCase();
  const isCommercial = buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY || profLower.includes('merchant') || profLower.includes('shop');
  const isInnLike = profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai');
  const getSafeSide = (room: InteriorRoom, preferred: 'north' | 'south' | 'east' | 'west') => {
    const blocked = new Set(sharedWallsMap.get(room.id) ?? []);
    const doorSide = doorMap.get(room.id);
    if (doorSide) blocked.add(doorSide);
    if (!blocked.has(preferred)) return preferred;
    const allSides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    const safe = allSides.filter((side) => !blocked.has(side));
    return safe[0] ?? preferred;
  };
  const wallAnchorSafe = (room: InteriorRoom, side: 'north' | 'south' | 'east' | 'west', inset = 0.9, offset = 0) => {
    const safeSide = getSafeSide(room, side);
    return wallAnchor(room, safeSide, inset, offset);
  };
  const oppositeSide = (side: 'north' | 'south' | 'east' | 'west') => {
    if (side === 'north') return 'south';
    if (side === 'south') return 'north';
    if (side === 'east') return 'west';
    return 'east';
  };

  // Helper to find walls that are NOT shared with adjacent rooms
  const getSafeWalls = (room: InteriorRoom): ('north' | 'south' | 'east' | 'west')[] => {
    const allWalls: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    const sharedWalls: ('north' | 'south' | 'east' | 'west')[] = [];

    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2;
    const halfD = room.size[2] / 2;

    rooms.forEach((otherRoom) => {
      if (otherRoom.id === room.id) return;

      const [ox, , oz] = otherRoom.center;
      const otherHalfW = otherRoom.size[0] / 2;
      const otherHalfD = otherRoom.size[2] / 2;

      // Check if rooms are adjacent and which wall is shared
      const dx = ox - cx;
      const dz = oz - cz;

      // Adjacent on X axis (east-west)
      if (Math.abs(dx) < (halfW + otherHalfW + 0.5) && Math.abs(dx) > 0.5 && Math.abs(dz) < Math.max(halfD, otherHalfD)) {
        if (dx > 0 && !sharedWalls.includes('east')) sharedWalls.push('east');
        if (dx < 0 && !sharedWalls.includes('west')) sharedWalls.push('west');
      }

      // Adjacent on Z axis (north-south)
      if (Math.abs(dz) < (halfD + otherHalfD + 0.5) && Math.abs(dz) > 0.5 && Math.abs(dx) < Math.max(halfW, otherHalfW)) {
        if (dz > 0 && !sharedWalls.includes('north')) sharedWalls.push('north');
        if (dz < 0 && !sharedWalls.includes('south')) sharedWalls.push('south');
      }
    });

    return allWalls.filter(wall => !sharedWalls.includes(wall));
  };

  // Helper to check if a position has adequate spacing from existing large props
  const largePropTypes = new Set<InteriorPropType>([
    InteriorPropType.WORKBENCH,
    InteriorPropType.COUNTER,
    InteriorPropType.RAISED_BED,
    InteriorPropType.LOW_BED,
    InteriorPropType.DESK,
    InteriorPropType.STAIRS,
    InteriorPropType.LADDER,
  ]);

  const hasSpacingFromLargeProps = (room: InteriorRoom, pos: [number, number, number], minDist = 2.0): boolean => {
    const roomProps = props.filter((prop) => prop.roomId === room.id && largePropTypes.has(prop.type));
    return roomProps.every((prop) => {
      const dx = pos[0] - prop.position[0];
      const dz = pos[2] - prop.position[2];
      return Math.hypot(dx, dz) >= minDist;
    });
  };

  const clampToRoom = (room: InteriorRoom, pos: [number, number, number], margin = 0.6): [number, number, number] => {
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - margin;
    const halfD = room.size[2] / 2 - margin;
    return [
      Math.max(cx - halfW, Math.min(cx + halfW, pos[0])),
      pos[1],
      Math.max(cz - halfD, Math.min(cz + halfD, pos[2]))
    ];
  };
  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.ENTRY) {
      // Special handling for religious sanctuary - the ENTRY room IS the main sanctuary
      if (buildingType === BuildingType.RELIGIOUS) {
        const [cx, , cz] = room.center;
        const [roomWidth, , roomDepth] = room.size;
        const halfW = roomWidth / 2;
        const halfD = roomDepth / 2;

        // Calculate arch inset based on room width - arches should be inside the walls
        const wallMargin = 1.8;
        const maxArchInset = halfW - wallMargin;
        const archInset = Math.min(maxArchInset, Math.max(1.5, roomWidth * 0.25));

        // Only add arches if room is wide enough
        if (roomWidth >= 8 && roomDepth >= 8) {
          const archSpacing = 3.2;
          const maxArchDepth = halfD - 2.0;
          const numArches = Math.max(1, Math.min(4, Math.floor((roomDepth - 4) / archSpacing)));

          for (let i = 0; i < numArches; i++) {
            const zOffset = (i - (numArches - 1) / 2) * archSpacing;
            const clampedZ = Math.max(cz - maxArchDepth, Math.min(cz + maxArchDepth, cz + zOffset));

            props.push({
              id: `arch-east-${room.id}-${i}`,
              type: InteriorPropType.ARCH_COLUMN,
              roomId: room.id,
              position: [cx + archInset, 0, clampedZ],
              rotation: [0, Math.PI / 2, 0],
              scale: [1, 1, 1],
              label: 'Stone arch',
            });

            props.push({
              id: `arch-west-${room.id}-${i}`,
              type: InteriorPropType.ARCH_COLUMN,
              roomId: room.id,
              position: [cx - archInset, 0, clampedZ],
              rotation: [0, -Math.PI / 2, 0],
              scale: [1, 1, 1],
              label: 'Stone arch',
            });
          }
        }

        // Add grid of prayer rugs
        const rugSpacingX = 1.7;
        const rugSpacingZ = 2.4;
        const rugMargin = 1.5;

        const rugAreaHalfW = roomWidth >= 8 ? Math.min(archInset - 1.2, halfW - rugMargin) : halfW - rugMargin;
        const rugAreaHalfD = halfD - rugMargin;
        const availableWidth = rugAreaHalfW * 2;
        const availableDepth = rugAreaHalfD * 2;

        const rugsPerRow = Math.max(1, Math.floor(availableWidth / rugSpacingX));
        const numRows = Math.max(1, Math.floor(availableDepth / rugSpacingZ));

        const gridWidth = (rugsPerRow - 1) * rugSpacingX;
        const gridDepth = (numRows - 1) * rugSpacingZ;
        const gridStartX = cx - gridWidth / 2;
        const gridStartZ = cz - gridDepth / 2;

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < rugsPerRow; col++) {
            const rugX = gridStartX + col * rugSpacingX;
            const rugZ = gridStartZ + row * rugSpacingZ;
            const clampedX = Math.max(cx - halfW + rugMargin, Math.min(cx + halfW - rugMargin, rugX));
            const clampedZ = Math.max(cz - halfD + rugMargin, Math.min(cz + halfD - rugMargin, rugZ));

            props.push({
              id: `prayer-rug-${room.id}-${row}-${col}`,
              type: InteriorPropType.PRAYER_RUG,
              roomId: room.id,
              position: [clampedX, 0, clampedZ],
              rotation: [0, 0, 0],
              scale: [0.6, 1, 0.6],
              label: 'Prayer rug',
            });
          }
        }

        // Add mihrab rug and lantern
        const mihrabZ = Math.max(cz - halfD + 2.0, cz - halfD + rugMargin + 0.5);
        upsertProp(props, room, InteriorPropType.RUG, 'Mihrab rug', clampToRoom(room, [cx, 0, mihrabZ]));
        upsertProp(props, room, InteriorPropType.LANTERN, 'Sanctuary lamp', [cx, 2.2, cz]);
        return;
      }

      // Normal entry room for non-religious buildings
      const safeSide = oppositeSide(entrySide);
      const profCategory = getProfessionCategory(profession);

      // For single-room dwellings, add sleeping area (first floors without private rooms)
      const hasPrivateRoom = rooms.some((r) => r.type === InteriorRoomType.PRIVATE);
      if (!hasPrivateRoom && buildingType === BuildingType.RESIDENTIAL) {
        // Add bed in corner opposite the door
        const bedSide = safeSide === 'north' ? 'south' : safeSide === 'south' ? 'north' : safeSide === 'east' ? 'west' : 'east';
        if (socialClass === SocialClass.NOBILITY) {
          upsertProp(props, room, InteriorPropType.LOW_BED, 'Low wooden bed', clampToRoom(room, wallAnchorSafe(room, bedSide, 1.1, 0.8)));
        } else if (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY) {
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchorSafe(room, bedSide, 0.9, 0.8)));
        } else if (profCategory === 'LABORER' || profCategory === 'SERVICE') {
          upsertProp(props, room, InteriorPropType.SLEEPING_MAT, 'Sleeping mat', clampToRoom(room, wallAnchorSafe(room, bedSide, 0.9, 0.8)));
        } else {
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchorSafe(room, bedSide, 0.9, 0.8)));
        }

        // Profession-specific props for single-room dwellings
        // Note: workbenches use opposite corner from chest to avoid overlap
        const workSide = safeSide === 'north' ? 'east' : safeSide === 'south' ? 'west' : safeSide === 'east' ? 'south' : 'north';
        switch (profCategory) {
          case 'ARTISAN': {
            // Place workbench on perpendicular wall with spacing from other furniture
            const workbenchPos = clampToRoom(room, wallAnchorSafe(room, workSide, 1.2, 0));
            if (hasSpacingFromLargeProps(room, workbenchPos, 1.8)) {
              upsertProp(props, room, InteriorPropType.WORKBENCH, 'Work bench', workbenchPos);
            }
            break;
          }
          case 'AGRICULTURAL':
            upsertProp(props, room, InteriorPropType.PRODUCE_BASKET, 'Produce basket', clampToRoom(room, wallAnchorSafe(room, workSide, 0.6, 0)));
            break;
          case 'TRANSPORT':
            upsertProp(props, room, InteriorPropType.ROPE_COIL, 'Rope coil', clampToRoom(room, wallAnchorSafe(room, workSide, 0.5, 0)));
            break;
          default:
            break;
        }
      }

      upsertProp(props, room, InteriorPropType.FLOOR_MAT, 'Woven floor mat', clampToRoom(room, wallAnchorSafe(room, safeSide, 1.4, 0)));
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchorSafe(room, safeSide, 0.8, 0.8)));
      upsertProp(props, room, InteriorPropType.LAMP, 'Oil lamp', clampToRoom(room, wallAnchorSafe(room, safeSide, 0.8, -0.6)));
      return;
    }
    if (room.type === InteriorRoomType.PRIVATE) {
      const profCategory = getProfessionCategory(profession);

      // Get walls that are NOT shared with adjacent rooms
      const safeWalls = getSafeWalls(room);
      // Priority order for wall assignments: prefer south for bed, then other walls for furniture
      const wallPriority: ('north' | 'south' | 'east' | 'west')[] = ['south', 'north', 'east', 'west'];
      const bedWall = wallPriority.find(w => safeWalls.includes(w)) ?? 'south';
      const remainingWalls = safeWalls.filter(w => w !== bedWall);
      const chestWall = remainingWalls.find(w => w === 'east') ?? remainingWalls[0] ?? 'east';
      const workWall = remainingWalls.find(w => w === 'west' && w !== chestWall) ?? remainingWalls.find(w => w !== chestWall) ?? 'west';
      const decorWall = remainingWalls.find(w => w === 'north' && w !== chestWall && w !== workWall) ?? remainingWalls.find(w => w !== chestWall && w !== workWall) ?? 'north';

      const sleepProps = new Set<InteriorPropType>([
        InteriorPropType.RAISED_BED,
        InteriorPropType.LOW_BED,
        InteriorPropType.BEDROLL,
        InteriorPropType.SLEEPING_MAT
      ]);
      const canPlaceSleepProp = (pos: [number, number, number], minDist = 1.9) => {
        const roomBeds = props.filter((prop) => prop.roomId === room.id && sleepProps.has(prop.type));
        return roomBeds.every((prop) => {
          const dx = pos[0] - prop.position[0];
          const dz = pos[2] - prop.position[2];
          return Math.hypot(dx, dz) >= minDist;
        });
      };

      // Check if this is an inn/caravanserai guest room - they get minimal, sparse furnishing
      const profLower = profession.toLowerCase();
      const isInnRoom = floorType === 'private' && (profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai'));

      // INN GUEST ROOMS: Minimal furnishing only
      if (isInnRoom) {
        // Simple bed - bedroll for basic inns, low bed for nicer ones
        const isNicerInn = profLower.includes('funduq') || profLower.includes('khan');
        if (isNicerInn) {
          upsertProp(props, room, InteriorPropType.LOW_BED, 'Low wooden bed', clampToRoom(room, wallAnchorSafe(room, bedWall, 1.1, 0)));
        } else {
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchorSafe(room, bedWall, 0.9, 0)));
        }
        // Essential furniture only: desk, chair, wash basin
        upsertProp(props, room, InteriorPropType.DESK, 'Writing desk', clampToRoom(room, wallAnchorSafe(room, workWall, 0.9, -0.8)));
        upsertProp(props, room, InteriorPropType.CHAIR, 'Wooden chair', clampToRoom(room, wallAnchorSafe(room, workWall, 0.6, -1.2)));
        upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Wash basin', clampToRoom(room, wallAnchorSafe(room, chestWall, 0.7, 0.4)));
        // Single oil lamp - placed on desk surface
        upsertProp(props, room, InteriorPropType.LAMP, 'Oil lamp', clampToRoom(room, wallAnchorSafe(room, workWall, 0.9, -0.5)), [0, 0, 0], [1, 1, 1], 0.85);
        return; // Skip all other furniture for inn rooms
      }

      // Choose bed type based on social class
      if (socialClass === SocialClass.NOBILITY) {
        upsertProp(props, room, InteriorPropType.RAISED_BED, 'Raised bed with curtains', clampToRoom(room, wallAnchorSafe(room, bedWall, 1.4, 0)));
      } else if (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY) {
        upsertProp(props, room, InteriorPropType.LOW_BED, 'Low wooden bed', clampToRoom(room, wallAnchorSafe(room, bedWall, 1.1, 0)));
      } else if (profCategory === 'LABORER' || profCategory === 'SERVICE') {
        upsertProp(props, room, InteriorPropType.SLEEPING_MAT, 'Sleeping mat', clampToRoom(room, wallAnchorSafe(room, bedWall, 0.9, 0)));
      } else {
        upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchorSafe(room, bedWall, 0.9, 0)));
      }

      // Sleeping clusters for private upper rooms (family sleeping near primary bed)
      if (floorType === 'private') {
        // For player's home, ensure enough beds for family members
        let extraBedsNeeded = 0;
        if (familyContext?.isPlayerHome && familyContext.familyMembers.length > 0) {
          const childCount = familyContext.familyMembers.filter(m => m.relationship === 'child').length;
          const siblingCount = familyContext.familyMembers.filter(m => m.relationship === 'sibling').length;
          const hasElderParent = familyContext.familyMembers.some(m => m.relationship === 'parent');
          // Main bed covers player + spouse, others need separate sleeping spots
          // Children/siblings share (2 per bed), elders get their own
          extraBedsNeeded = Math.ceil((childCount + siblingCount) / 2) + (hasElderParent ? 1 : 0);
        }

        const clusterRoll = rand();
        const baseClusterCount = clusterRoll > 0.7 ? 2 : clusterRoll > 0.35 ? 1 : 0;
        const clusterCount = Math.max(baseClusterCount, extraBedsNeeded);

        // Distribute beds around different walls
        const allSides: ('north' | 'south' | 'east' | 'west')[] = ['east', 'west', 'north', 'south']
          .filter(s => s !== bedWall) as ('north' | 'south' | 'east' | 'west')[];

        for (let i = 0; i < clusterCount; i += 1) {
          // Cycle through available walls, with smaller offsets to stay in room
          const side = allSides[i % allSides.length];
          const offsetIndex = Math.floor(i / allSides.length);
          const offset = (offsetIndex * 1.5 + 0.8) * (i % 2 === 0 ? 1 : -1);

          // Bed quality based on social class - children/servants get simpler bedding
          const clusterType = socialClass === SocialClass.NOBILITY
            ? InteriorPropType.LOW_BED  // Noble children get low beds
            : socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY
              ? InteriorPropType.BEDROLL
              : InteriorPropType.SLEEPING_MAT;
          const clusterLabel = clusterType === InteriorPropType.LOW_BED
            ? 'Low wooden bed'
            : clusterType === InteriorPropType.BEDROLL
              ? 'Sleeping pallet'
              : 'Sleeping mat';
          const clusterPos = clampToRoom(room, wallAnchorSafe(room, side, 1.1, offset));
          if (canPlaceSleepProp(clusterPos)) {
            upsertProp(props, room, clusterType, clusterLabel, clusterPos);
          }
        }
      }

      // Basic furniture - place against a safe wall
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchorSafe(room, chestWall, 0.8, -0.6)));

      // Wash basin for personal rooms
      upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Wash basin', clampToRoom(room, wallAnchorSafe(room, workWall, 0.7, 0.4)));

      if (floorType === 'private') {
        const householdFactor = Math.min(1, rooms.length / 3);
        const baseToyChance = socialClass === SocialClass.NOBILITY
          ? 0.4
          : socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY
            ? 0.3
            : 0.18;
        const toyChance = baseToyChance * (0.7 + householdFactor);
        const hasToy = rand() < toyChance;
        if (hasToy) {
          upsertProp(props, room, InteriorPropType.CHILD_TOY, 'Wooden toy', clampToRoom(room, [room.center[0] + (rand() - 0.5) * 1.2, 0, room.center[2] + (rand() - 0.5) * 1.2]));
        }
        if ((socialClass === SocialClass.NOBILITY || socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY) && (hasToy || rand() < 0.35)) {
          const cradlePos = clampToRoom(room, wallAnchorSafe(room, decorWall, 0.8, 0.4));
          if (canPlaceSleepProp(cradlePos, 1.6)) {
            upsertProp(props, room, InteriorPropType.CRADLE, 'Wooden cradle', cradlePos);
          }
        }
      }

      // Profession-specific props - use safe walls
      // Note: Large work furniture (workbenches) only on ground floor, not in upstairs bedrooms
      switch (profCategory) {
        case 'ARTISAN': {
          // Only place workbench on ground floor; upstairs bedrooms get just tool storage
          if (floorType === 'public') {
            const workbenchPos = clampToRoom(room, wallAnchorSafe(room, workWall, 1.2, 0));
            if (hasSpacingFromLargeProps(room, workbenchPos, 1.8)) {
              upsertProp(props, room, InteriorPropType.WORKBENCH, 'Work bench', workbenchPos);
            }
          }
          upsertProp(props, room, InteriorPropType.TOOL_RACK, 'Tool rack', clampToRoom(room, wallAnchorSafe(room, decorWall, 0.6, -0.8)));
          break;
        }
        case 'MILITARY':
          upsertProp(props, room, InteriorPropType.WEAPON_RACK, 'Weapon rack', clampToRoom(room, wallAnchorSafe(room, workWall, 0.8, 0)));
          break;
        case 'SCHOLARLY':
          upsertProp(props, room, InteriorPropType.DESK, 'Writing desk', clampToRoom(room, wallAnchorSafe(room, workWall, 0.9, 0)));
          upsertProp(props, room, InteriorPropType.BOOKS, 'Manuscripts', clampToRoom(room, wallAnchorSafe(room, decorWall, 0.6, 0.6)));
          upsertProp(props, room, InteriorPropType.PRAYER_RUG, 'Prayer rug', clampToRoom(room, [room.center[0], 0, room.center[2]]));
          break;
        case 'AGRICULTURAL':
          upsertProp(props, room, InteriorPropType.PRODUCE_BASKET, 'Produce basket', clampToRoom(room, wallAnchorSafe(room, workWall, 0.6, 0.4)));
          upsertProp(props, room, InteriorPropType.TOOL_RACK, 'Garden tools', clampToRoom(room, wallAnchorSafe(room, decorWall, 0.6, -0.6)));
          break;
        case 'TRANSPORT':
          upsertProp(props, room, InteriorPropType.ROPE_COIL, 'Rope coil', clampToRoom(room, wallAnchorSafe(room, workWall, 0.5, 0)));
          upsertProp(props, room, InteriorPropType.CRATE, 'Travel chest', clampToRoom(room, wallAnchorSafe(room, decorWall, 0.7, 0.5)));
          break;
        case 'LABORER':
        case 'SERVICE':
          // Minimal furnishings - just water jug
          upsertProp(props, room, InteriorPropType.WATER_JUG, 'Water jug', clampToRoom(room, wallAnchorSafe(room, workWall, 0.4, 0)));
          break;
        default:
          // Default: prayer rug for others
          upsertProp(props, room, InteriorPropType.PRAYER_RUG, 'Prayer rug', clampToRoom(room, [room.center[0], 0, room.center[2]]));
      }

      // Wall hanging for wealthier classes - use a safe wall
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.WALL_HANGING, 'Wall hanging', clampToRoom(room, wallAnchorSafe(room, decorWall, 0.2, 0)));
      }
      return;
    }
    if (room.type === InteriorRoomType.WORKSHOP) {
      const safeWalls = getSafeWalls(room);
      const deskWall = safeWalls.find(w => w === 'north') ?? safeWalls[0] ?? 'north';
      const shelfWall = safeWalls.find(w => w === 'west' && w !== deskWall) ?? safeWalls.find(w => w !== deskWall) ?? 'west';
      upsertProp(props, room, InteriorPropType.DESK, 'Work desk', clampToRoom(room, wallAnchorSafe(room, deskWall, 0.9, 0)));
      upsertProp(props, room, InteriorPropType.CHAIR, 'Work chair', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 2.0]), [0, 0, 0]);
      upsertProp(props, room, InteriorPropType.BOOKS, 'Manuscripts', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.INK_SET, 'Ink set', clampToRoom(room, [room.center[0] + 0.4, 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchorSafe(room, shelfWall, 0.7, -0.4)));
      return;
    }
    if (room.type === InteriorRoomType.STORAGE) {
      const safeWalls = getSafeWalls(room);
      const crateWall = safeWalls.find(w => w === 'east') ?? safeWalls[0] ?? 'east';
      const amphoraWall = safeWalls.find(w => w === 'south' && w !== crateWall) ?? safeWalls.find(w => w !== crateWall) ?? 'south';
      upsertProp(props, room, InteriorPropType.CRATE, 'Stacked crates', clampToRoom(room, wallAnchorSafe(room, crateWall, 0.9, 0.6)));
      upsertProp(props, room, InteriorPropType.AMPHORA, 'Amphorae', clampToRoom(room, wallAnchorSafe(room, amphoraWall, 0.8, -0.6)));
      return;
    }
    if (room.type === InteriorRoomType.COURTYARD) {
      upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Water basin', clampToRoom(room, [room.center[0], 0, room.center[2]]));
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.RUG, 'Courtyard rug', clampToRoom(room, [room.center[0], 0, room.center[2] + 1.2]));
      }
      return;
    }
    if (room.type === InteriorRoomType.HALL) {
      // Skip narrow corridors (inn hallways) - they shouldn't have furniture
      if (room.size[0] < 3.5) return;

      if (floorType === 'public' && isCommercial && !isInnLike) {
        const counterSide = oppositeSide(entrySide);

        // Position counter more centrally with space behind for shopkeeper
        const [rcx, , rcz] = room.center;
        const counterOffset = entrySide === 'north' || entrySide === 'south' ? room.size[2] * 0.15 : room.size[0] * 0.15;
        let counterPos: [number, number, number];
        if (entrySide === 'north') {
          counterPos = [rcx, 0, rcz + counterOffset];
        } else if (entrySide === 'south') {
          counterPos = [rcx, 0, rcz - counterOffset];
        } else if (entrySide === 'east') {
          counterPos = [rcx - counterOffset, 0, rcz];
        } else {
          counterPos = [rcx + counterOffset, 0, rcz];
        }
        counterPos = clampToRoom(room, counterPos, 2.5);

        upsertProp(
          props,
          room,
          InteriorPropType.COUNTER,
          'Sales counter',
          counterPos,
          faceIntoRoom(counterSide)
        );
        const displaySide = entrySide === 'east' || entrySide === 'west'
          ? (entrySide === 'east' ? 'north' : 'south')
          : (entrySide === 'north' ? 'east' : 'west');
        const displayRot = faceIntoRoom(displaySide);
        upsertProp(
          props,
          room,
          InteriorPropType.DISPLAY,
          'Display shelf',
          clampToRoom(room, wallAnchorSafe(room, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4)),
          displayRot
        );
        const counterTopY = 1.18;
        upsertProp(props, room, InteriorPropType.SCALE, 'Balance scale', clampToRoom(room, [counterPos[0] - 0.5, counterTopY, counterPos[2] + 0.12]));
        upsertProp(props, room, InteriorPropType.LEDGER, 'Account ledger', clampToRoom(room, [counterPos[0] + 0.5, counterTopY, counterPos[2] + 0.12]));
        upsertProp(props, room, InteriorPropType.BASKET, 'Market baskets', clampToRoom(room, wallAnchorSafe(room, 'west', 0.8, 1.2)));
        return;
      }
      // Civic/school/medical buildings get office furnishings, not cooking equipment
      if (floorType === 'public' && (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL)) {
        const [rcx, , rcz] = room.center;
        const halfW = room.size[0] / 2;
        const halfD = room.size[2] / 2;
        const deskLabel = buildingType === BuildingType.SCHOOL
          ? 'Teacher\'s desk'
          : buildingType === BuildingType.MEDICAL
            ? 'Physician\'s desk'
            : 'Governor\'s desk';
        const docsLabel = buildingType === BuildingType.SCHOOL
          ? 'Lesson scrolls'
          : buildingType === BuildingType.MEDICAL
            ? 'Medical notes'
            : 'Official documents';
        const shelfLabel = buildingType === BuildingType.MEDICAL ? 'Remedy shelf' : 'Document shelf';
        // Large desk against back wall
        upsertProp(props, room, InteriorPropType.DESK, deskLabel, clampToRoom(room, [rcx, 0, rcz + halfD * 0.5]), faceIntoRoom('north'));
        // Chair behind desk
        upsertProp(props, room, InteriorPropType.CHAIR, 'Carved chair', clampToRoom(room, [rcx, 0, rcz + halfD * 0.7]), faceIntoRoom('north'));
        // Books/ledgers on desk
        upsertProp(props, room, InteriorPropType.BOOKS, docsLabel, clampToRoom(room, [rcx - 0.3, 0.85, rcz + halfD * 0.5]));
        upsertProp(props, room, InteriorPropType.INK_SET, 'Ink set', clampToRoom(room, [rcx + 0.4, 0.85, rcz + halfD * 0.5]));
        // Rug in front of desk
        upsertProp(props, room, InteriorPropType.RUG, 'Persian rug', clampToRoom(room, [rcx, 0, rcz - halfD * 0.2]));
        // Shelf on side wall
        upsertProp(props, room, InteriorPropType.SHELF, shelfLabel, clampToRoom(room, wallAnchorSafe(room, 'west', 0.6, 0)), faceIntoRoom('west'));
        // Brazier for warmth (not cooking) in corner
        upsertProp(props, room, InteriorPropType.BRAZIER, 'Warming brazier', clampToRoom(room, [rcx + halfW * 0.6, 0, rcz - halfD * 0.5]));

        if (buildingType === BuildingType.SCHOOL) {
          // Student seating and study surfaces
          upsertProp(props, room, InteriorPropType.BENCH, 'Student bench', clampToRoom(room, [rcx - halfW * 0.2, 0, rcz - halfD * 0.2]), faceIntoRoom('north'));
          upsertProp(props, room, InteriorPropType.BENCH, 'Student bench', clampToRoom(room, [rcx + halfW * 0.2, 0, rcz - halfD * 0.2]), faceIntoRoom('north'));
          upsertProp(props, room, InteriorPropType.LOW_TABLE, 'Study table', clampToRoom(room, [rcx, 0, rcz - halfD * 0.05]));
          upsertProp(props, room, InteriorPropType.FLOOR_MAT, 'Woven floor mat', clampToRoom(room, [rcx - 0.8, 0, rcz - halfD * 0.45]));
          upsertProp(props, room, InteriorPropType.LECTERN, 'Reading stand', clampToRoom(room, [rcx + halfW * 0.2, 0, rcz - halfD * 0.45]), faceIntoRoom('north'));
        }

        if (buildingType === BuildingType.MEDICAL) {
          // Clinic tools and patient care props
          upsertProp(props, room, InteriorPropType.MEDICINE_SHELF, 'Medicine shelf', clampToRoom(room, wallAnchorSafe(room, 'east', 0.6, 0.4)), faceIntoRoom('east'));
          upsertProp(props, room, InteriorPropType.TREATMENT_SHELF, 'Treatment shelf', clampToRoom(room, wallAnchorSafe(room, 'west', 0.6, -0.2)), faceIntoRoom('west'));
          upsertProp(props, room, InteriorPropType.MORTAR, 'Mortar & pestle', clampToRoom(room, [rcx - 0.2, 0.82, rcz - halfD * 0.1]));
          upsertProp(props, room, InteriorPropType.HERB_RACK, 'Herb rack', clampToRoom(room, wallAnchorSafe(room, 'north', 0.6, -0.8)), faceIntoRoom('north'));
          upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Wash basin', clampToRoom(room, wallAnchorSafe(room, 'south', 0.7, 0.6)));
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Patient bedroll', clampToRoom(room, [rcx + halfW * 0.1, 0, rcz - halfD * 0.55]));
          upsertProp(props, room, InteriorPropType.SCREEN, 'Privacy screen', clampToRoom(room, [rcx + halfW * 0.25, 0, rcz - halfD * 0.35]), faceIntoRoom('west'));
        }
        return;
      }
      // Regular residential HALL rooms
      upsertProp(props, room, InteriorPropType.FIRE_PIT, 'Cooking hearth', clampToRoom(room, [room.center[0] + 1.5, 0, room.center[2] + 0.6]));
      upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Water basin', clampToRoom(room, wallAnchorSafe(room, 'east', 0.9, -0.8)));
      upsertProp(props, room, InteriorPropType.EWER, 'Water ewer', clampToRoom(room, wallAnchorSafe(room, 'east', 0.8, -0.4)));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchorSafe(room, 'north', 0.7, 0)));
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.RUG, 'Wool rug', clampToRoom(room, [room.center[0] - 1.0, 0, room.center[2] - 0.8]));
      }
    }
  });
};

const createNPCs = (
  building: BuildingMetadata,
  socialClass: SocialClass,
  rooms: InteriorRoom[],
  props: InteriorProp[],
  seed: number,
  familyContext?: FamilyInteriorContext
): InteriorNPC[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const npcs: InteriorNPC[] = [];
  const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? rooms[0];
  const otherRoom = rooms.find((room) => room.type === InteriorRoomType.HALL || room.type === InteriorRoomType.PRIVATE) ?? entryRoom;
  const findProp = (types: InteriorPropType[]) => props.find((prop) => types.includes(prop.type));
  const clampToRoom = (room: InteriorRoom, pos: [number, number, number]): [number, number, number] => {
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - 0.8;
    const halfD = room.size[2] / 2 - 0.8;
    return [
      Math.max(cx - halfW, Math.min(cx + halfW, pos[0])),
      pos[1],
      Math.max(cz - halfD, Math.min(cz + halfD, pos[2]))
    ];
  };
  const avoidProps = (room: InteriorRoom, pos: [number, number, number]): [number, number, number] => {
    const roomProps = props.filter((prop) => prop.roomId === room.id);
    let adjusted = [...pos] as [number, number, number];
    roomProps.forEach((prop) => {
      // Use appropriate radius based on prop type to match obstacle generation
      const propRadius = prop.type === InteriorPropType.COUNTER
        ? 1.4
        : prop.type === InteriorPropType.DISPLAY
          ? 1.1
          : prop.type === InteriorPropType.BENCH
            ? 1.0
            : prop.type === InteriorPropType.LOW_TABLE
              ? 0.8
              : 0.6;

      const dx = adjusted[0] - prop.position[0];
      const dz = adjusted[2] - prop.position[2];
      const dist = Math.hypot(dx, dz);
      const minDist = propRadius + 0.5; // Add 0.5 for NPC personal space

      if (dist < minDist) {
        const push = minDist - dist;
        const nx = dx === 0 ? 1 : dx / dist;
        const nz = dz === 0 ? 0 : dz / dist;
        adjusted = [adjusted[0] + nx * push, adjusted[1], adjusted[2] + nz * push];
      }
    });
    return clampToRoom(room, adjusted);
  };
  const placeByProp = (prop: InteriorProp | undefined, fallbackRoom: InteriorRoom, offset: [number, number, number]): [number, number, number] => {
    if (!prop) return placeInRoom(fallbackRoom, 11);
    const base: [number, number, number] = [prop.position[0] + offset[0], prop.position[1] + offset[1], prop.position[2] + offset[2]];
    const room = rooms.find((candidate) => candidate.id === prop.roomId) ?? fallbackRoom;
    return avoidProps(room, base);
  };
  const placeInRoom = (room: InteriorRoom, offsetSeed: number): [number, number, number] => {
    let localSeed = seed + offsetSeed;
    const randLocal = () => seededRandom(localSeed++);
    const margin = 1.6;
    const x = room.center[0] + (randLocal() - 0.5) * (room.size[0] - margin * 2);
    const z = room.center[2] + (randLocal() - 0.5) * (room.size[2] - margin * 2);
    return [x, 0, z];
  };
  const ownerStats = generateNPCStats(seed + 11);
  ownerStats.name = building.ownerName;
  ownerStats.profession = building.ownerProfession;
  ownerStats.gender = building.ownerGender;
  ownerStats.socialClass = socialClass;
  let ownerPosition: [number, number, number] = placeInRoom(otherRoom, 3);
  let ownerRotation: [number, number, number] = [0, rand() * Math.PI * 2, 0];
  if (building.type === BuildingType.COMMERCIAL || building.type === BuildingType.HOSPITALITY) {
    const counter = props.find((prop) => prop.type === InteriorPropType.COUNTER);
    if (counter) {
      const room = rooms.find((candidate) => candidate.id === counter.roomId) ?? entryRoom;
      const dx = counter.position[0] - room.center[0];
      const dz = counter.position[2] - room.center[2];
      if (Math.abs(dx) > Math.abs(dz)) {
        ownerPosition = [counter.position[0] + (dx < 0 ? -1.0 : 1.0), 0, counter.position[2]];
        ownerRotation = [0, dx < 0 ? Math.PI / 2 : -Math.PI / 2, 0];
      } else {
        ownerPosition = [counter.position[0], 0, counter.position[2] + (dz < 0 ? -1.0 : 1.0)];
        ownerRotation = [0, dz < 0 ? 0 : Math.PI, 0];
      }
      ownerPosition = avoidProps(room, ownerPosition);
    }
  }

  // Check if owner has a tradeable profession and generate merchant data
  const merchantType = professionToMerchantType(building.ownerProfession);
  let merchantData: InteriorMerchantData | undefined;
  if (merchantType) {
    const inventory = generateMerchantInventory(merchantType, `interior-${building.id}`, seed + 200, 0);
    const haggleModifier = 0.85 + rand() * 0.35; // 0.85-1.20
    const greetings = [
      `Welcome to my ${building.ownerProfession.toLowerCase()} shop!`,
      `Salaam, friend. Looking for quality ${merchantType === MerchantType.APOTHECARY ? 'remedies' : merchantType === MerchantType.TEXTILE ? 'fabrics' : merchantType === MerchantType.METALSMITH ? 'metalwork' : 'goods'}?`,
      `Please, come in. I have the finest wares in Damascus.`,
      `A customer! Let me show you what I have.`,
    ];
    const greeting = greetings[Math.floor(rand() * greetings.length)];
    merchantData = {
      merchantType,
      inventory,
      greeting,
      haggleModifier,
    };
  }

  // For player's home, don't add random owner - add family members instead
  console.log('[Family Debug interior.ts] familyContext check:', {
    hasFamilyContext: !!familyContext,
    isPlayerHome: familyContext?.isPlayerHome,
    familyMembersLength: familyContext?.familyMembers?.length,
    familyNpcStatsSize: familyContext?.familyNpcStats?.size
  });

  if (familyContext?.isPlayerHome && familyContext.familyMembers.length > 0) {
    console.log('[Family Debug interior.ts] Adding family members as NPCs');
    // Add family members as NPCs
    const seatProps = props.filter(p =>
      p.type === InteriorPropType.CUSHION ||
      p.type === InteriorPropType.FLOOR_PILLOWS ||
      p.type === InteriorPropType.BENCH
    );
    const cookProp = findProp([InteriorPropType.FIRE_PIT, InteriorPropType.BRAZIER]);

    // Track child-specific index for spacing
    let childIndex = 0;
    let siblingIndex = 0;

    familyContext.familyMembers.forEach((member, idx) => {
      const stats = familyContext.familyNpcStats.get(member.npcId);
      console.log('[Family Debug interior.ts] Processing family member:', {
        name: member.name,
        npcId: member.npcId,
        hasStats: !!stats,
        alive: member.alive
      });
      if (!stats || !member.alive) return;

      // Position based on relationship with better spacing
      let position: [number, number, number];
      let rotation: [number, number, number] = [0, rand() * Math.PI * 2, 0];

      // Use different seat props for different family members to spread them out
      const getSeatProp = (preferredIdx: number) => seatProps[preferredIdx % Math.max(1, seatProps.length)];

      if (member.relationship === 'spouse') {
        // Spouse near hearth or cooking area
        position = cookProp
          ? placeByProp(cookProp, entryRoom, [0.6 + rand() * 0.3, 0, 0.3 + rand() * 0.3])
          : placeByProp(getSeatProp(0), entryRoom, [0.5 + rand() * 0.4, 0, 0.4 + rand() * 0.4]);
      } else if (member.relationship === 'child') {
        // Children spread around the room - use child-specific index
        const room = otherRoom || entryRoom;
        const spreadX = (childIndex % 2) * 1.5 - 0.75; // Alternate left/right
        const spreadZ = Math.floor(childIndex / 2) * 1.2; // Stack front/back
        position = placeByProp(getSeatProp(childIndex + 1), room, [spreadX + rand() * 0.3, 0, spreadZ + rand() * 0.3]);
        childIndex++;
      } else if (member.relationship === 'parent') {
        // Elder parent seated on cushions - different corner
        position = placeByProp(getSeatProp(idx), otherRoom || entryRoom, [0.7 + rand() * 0.4, 0, -0.5 + rand() * 0.3]);
      } else {
        // Siblings - spread along wall
        const spreadZ = siblingIndex * 1.5;
        position = placeByProp(getSeatProp(siblingIndex + 3), entryRoom, [-0.4 + rand() * 0.3, 0, spreadZ + rand() * 0.3]);
        siblingIndex++;
      }

      npcs.push({
        id: member.npcId, // Use the registry NPC ID
        role: 'family',
        position,
        rotation,
        stats,
        state: AgentState.HEALTHY,
      });
    });
  } else {
    // Not player home - add normal owner NPC
    npcs.push({
      id: `npc-owner-${building.id}`,
      role: 'owner',
      position: ownerPosition,
      rotation: ownerRotation,
      stats: ownerStats,
      state: AgentState.HEALTHY,
      merchantData,
    });
  }

  if (building.type === BuildingType.SCHOOL) {
    const studentCount = 3 + Math.floor(rand() * 2); // 3-4 students
    const seatProp = findProp([InteriorPropType.BENCH, InteriorPropType.LOW_TABLE, InteriorPropType.FLOOR_MAT, InteriorPropType.LECTERN]);
    for (let i = 0; i < studentCount; i += 1) {
      const studentStats = generateNPCStats(seed + 60 + i * 5);
      studentStats.profession = 'Student';
      studentStats.socialClass = rand() > 0.7 ? SocialClass.MERCHANT : SocialClass.CLERGY;
      studentStats.age = 10 + Math.floor(rand() * 12);
      const studentPos = placeByProp(seatProp, otherRoom, [0.4, 0, 0.3]);
      npcs.push({
        id: `npc-student-${building.id}-${i}`,
        role: 'student',
        position: studentPos,
        rotation: [0, Math.PI, 0],
        stats: studentStats,
        state: AgentState.HEALTHY,
      });
    }
  }

  if (building.type === BuildingType.MEDICAL) {
    const patientCount = 2 + Math.floor(rand() * 2); // 2-3 patients
    const bedProp = findProp([InteriorPropType.BEDROLL, InteriorPropType.FLOOR_MAT, InteriorPropType.CUSHION]);
    for (let i = 0; i < patientCount; i += 1) {
      const patientStats = generateNPCStats(seed + 90 + i * 6);
      patientStats.profession = 'Patient';
      patientStats.socialClass = rand() > 0.55 ? SocialClass.PEASANT : SocialClass.MERCHANT;
      patientStats.age = 14 + Math.floor(rand() * 50);
      const patientPos = placeByProp(bedProp, otherRoom, [0.3, 0, 0.2]);
      npcs.push({
        id: `npc-patient-${building.id}-${i}`,
        role: 'patient',
        position: patientPos,
        rotation: [0, rand() * Math.PI * 2, 0],
        stats: patientStats,
        state: AgentState.HEALTHY,
      });
    }
  }

  if (building.type !== BuildingType.SCHOOL && building.type !== BuildingType.MEDICAL && socialClass !== SocialClass.PEASANT && rand() > 0.6) {
    const guestStats: NPCStats = generateNPCStats(seed + 29);
    const seatProp = findProp([InteriorPropType.BENCH, InteriorPropType.CHAIR, InteriorPropType.FLOOR_PILLOWS, InteriorPropType.LOW_TABLE]);
    const cookProp = findProp([InteriorPropType.FIRE_PIT, InteriorPropType.BRAZIER]);
    const guestRole = rand() > 0.5 ? 'guest' : 'servant';
    const guestPos = guestRole === 'servant' && cookProp
      ? placeByProp(cookProp, entryRoom, [0.8, 0, 0.2])
      : placeByProp(seatProp, otherRoom, [0.6, 0, 0.4]);
    npcs.push({
      id: `npc-guest-${building.id}`,
      role: guestRole,
      position: guestPos,
      rotation: [0, rand() * Math.PI * 2, 0],
      stats: guestStats,
      state: AgentState.HEALTHY,
    });
  }

  // Add worshippers to religious buildings (3-6 NPCs in the main sanctuary)
  if (building.type === BuildingType.RELIGIOUS) {
    const numWorshippers = 3 + Math.floor(rand() * 4);  // 3 to 6 worshippers
    const sanctuary = entryRoom;  // The entry room is the main sanctuary for religious buildings
    const halfW = sanctuary.size[0] / 2 - 2.0;
    const halfD = sanctuary.size[2] / 2 - 2.0;

    for (let i = 0; i < numWorshippers; i++) {
      const worshipperStats = generateNPCStats(seed + 50 + i * 7);
      worshipperStats.socialClass = rand() > 0.7 ? SocialClass.MERCHANT : rand() > 0.5 ? SocialClass.CLERGY : SocialClass.PEASANT;

      // Place worshippers on the prayer rugs - spread across the room
      const x = sanctuary.center[0] + (rand() - 0.5) * halfW * 1.6;
      const z = sanctuary.center[2] + (rand() - 0.5) * halfD * 1.6;
      const worshipperPos = avoidProps(sanctuary, [x, 0, z]);

      npcs.push({
        id: `npc-worshipper-${building.id}-${i}`,
        role: 'worshipper',
        position: worshipperPos,
        rotation: [0, Math.PI, 0],  // All facing the same direction (toward qibla/altar)
        stats: worshipperStats,
        state: AgentState.HEALTHY,
      });
    }
  }

  // Add guests to inns/funduqs/khans/wakalas/caravanserais (2-4 travelers in common room)
  const profLower = building.ownerProfession.toLowerCase();
  if (building.type === BuildingType.HOSPITALITY || profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai')) {
    const numGuests = 2 + Math.floor(rand() * 3);  // 2 to 4 guests
    const commonRoom = rooms.find((room) => room.type === InteriorRoomType.HALL) ?? entryRoom;

    // Find benches/tables where guests sit
    const benchProps = props.filter((prop) =>
      prop.type === InteriorPropType.BENCH ||
      prop.type === InteriorPropType.LOW_TABLE ||
      prop.type === InteriorPropType.FLOOR_PILLOWS
    );

    for (let i = 0; i < numGuests; i++) {
      const guestStats = generateNPCStats(seed + 120 + i * 8);

      // Generate diverse traveler professions
      const travelerProfessions = ['Merchant', 'Trader', 'Pilgrim', 'Camel Driver', 'Silk Merchant', 'Spice Trader', 'Scholar', 'Messenger'];
      guestStats.profession = travelerProfessions[Math.floor(rand() * travelerProfessions.length)];
      guestStats.socialClass = rand() > 0.6 ? SocialClass.MERCHANT : SocialClass.PEASANT;
      guestStats.age = 18 + Math.floor(rand() * 45);

      // Position guests near benches/tables in common room
      let guestPos: [number, number, number];
      if (benchProps.length > 0 && i < benchProps.length) {
        const benchProp = benchProps[i % benchProps.length];
        const offsetX = (rand() - 0.5) * 1.5;
        const offsetZ = (rand() - 0.5) * 1.5;
        guestPos = avoidProps(commonRoom, [
          benchProp.position[0] + offsetX,
          0,
          benchProp.position[2] + offsetZ
        ]);
      } else {
        // Fallback: place randomly in common room
        guestPos = placeInRoom(commonRoom, 150 + i * 10);
      }

      npcs.push({
        id: `npc-guest-${building.id}-${i}`,
        role: 'guest',
        position: guestPos,
        rotation: [0, rand() * Math.PI * 2, 0],
        stats: guestStats,
        state: AgentState.HEALTHY,
      });
    }
  }

  return npcs;
};

// Create sleeping guests for inn upstairs bedrooms
const createInnUpstairsGuests = (
  building: BuildingMetadata,
  rooms: InteriorRoom[],
  props: InteriorProp[],
  seed: number
): InteriorNPC[] => {
  let s = seed + 300;  // Different seed offset to avoid collision with ground floor guests
  const rand = () => seededRandom(s++);
  const npcs: InteriorNPC[] = [];

  // Find bedroom rooms (PRIVATE type)
  const bedrooms = rooms.filter((room) => room.type === InteriorRoomType.PRIVATE);
  const numGuestsUpstairs = Math.min(bedrooms.length, 1 + Math.floor(rand() * 3));  // 1-3 guests upstairs

  for (let i = 0; i < numGuestsUpstairs; i++) {
    const bedroom = bedrooms[i % bedrooms.length];
    const guestStats = generateNPCStats(seed + 400 + i * 11);

    // Generate traveler professions
    const travelerProfessions = ['Merchant', 'Trader', 'Pilgrim', 'Scholar', 'Messenger', 'Silk Trader', 'Caravan Driver'];
    guestStats.profession = travelerProfessions[Math.floor(rand() * travelerProfessions.length)];
    guestStats.socialClass = rand() > 0.5 ? SocialClass.MERCHANT : SocialClass.PEASANT;
    guestStats.age = 20 + Math.floor(rand() * 40);

    // Find bed in the bedroom
    const bedProp = props.find((prop) =>
      prop.roomId === bedroom.id &&
      (prop.type === InteriorPropType.SLEEPING_MAT ||
       prop.type === InteriorPropType.LOW_BED ||
       prop.type === InteriorPropType.RAISED_BED ||
       prop.type === InteriorPropType.BEDROLL)
    );

    // Position guest near bed if found, otherwise center of room
    let guestPos: [number, number, number];
    if (bedProp) {
      guestPos = [
        bedProp.position[0] + (rand() - 0.5) * 0.8,
        0,
        bedProp.position[2] + (rand() - 0.5) * 0.8
      ];
    } else {
      guestPos = [
        bedroom.center[0] + (rand() - 0.5) * (bedroom.size[0] - 2),
        0,
        bedroom.center[2] + (rand() - 0.5) * (bedroom.size[2] - 2)
      ];
    }

    npcs.push({
      id: `npc-guest-upstairs-${building.id}-${i}`,
      role: 'guest',
      position: guestPos,
      rotation: [0, rand() * Math.PI * 2, 0],
      stats: guestStats,
      state: AgentState.HEALTHY,
    });
  }

  return npcs;
};

const buildNarratorState = (spec: InteriorSpec) => ({
  buildingId: spec.buildingId,
  roomCount: spec.rooms.length,
  socialClass: spec.socialClass,
  profession: spec.profession,
  rooms: spec.rooms.map((room) => ({ id: room.id, type: room.type, size: room.size })),
  objects: spec.props.map((prop) => ({ id: prop.id, type: prop.type, roomId: prop.roomId, label: prop.label })),
  npcs: spec.npcs.map((npc) => ({ id: npc.id, role: npc.role, name: npc.stats.name, profession: npc.stats.profession })),
});

export const generateInteriorSpec = (
  building: BuildingMetadata,
  seed: number,
  overrides?: InteriorOverrides,
  familyContext?: FamilyInteriorContext
): InteriorSpec => {
  const socialClass = inferSocialClass(building);
  const profession = building.ownerProfession;
  const sizeScale = building.sizeScale ?? 1;
  const profLower = profession.toLowerCase();
  const isCommercial = building.type === BuildingType.COMMERCIAL || building.type === BuildingType.HOSPITALITY;
  const isInnLike = isCommercial && (profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('wakala') || profLower.includes('caravanserai'));
  const isCaravan = isCommercial && (profLower.includes('khan') || profLower.includes('caravanserai'));
  const isShopStall = isCommercial && !isInnLike && !isCaravan;
  const allowMultiRoom = building.type === BuildingType.CIVIC
    || building.type === BuildingType.RELIGIOUS
    || building.type === BuildingType.SCHOOL
    || building.type === BuildingType.MEDICAL
    || isInnLike
    || isCaravan
    || socialClass === SocialClass.NOBILITY
    || (socialClass === SocialClass.MERCHANT && sizeScale > 1.2);
  let baseRoomTypes = overrides?.roomTypes ?? defaultRoomTypes(socialClass, profession, building.type);
  if (isShopStall || !allowMultiRoom) {
    baseRoomTypes = [InteriorRoomType.ENTRY];
  }
  if (sizeScale < 0.9) {
    baseRoomTypes = baseRoomTypes.slice(0, 1);
  } else if (sizeScale < 1.05) {
    baseRoomTypes = baseRoomTypes.slice(0, Math.min(2, baseRoomTypes.length));
  }
  // Civic/school/medical buildings: strictly limit to max 2 rooms
  if (building.type === BuildingType.CIVIC || building.type === BuildingType.SCHOOL || building.type === BuildingType.MEDICAL) {
    baseRoomTypes = baseRoomTypes.slice(0, 2);
  }
  const entrySide = building.doorSide === 0 ? 'north' : building.doorSide === 1 ? 'south' : building.doorSide === 2 ? 'east' : 'west';
  const isMultiStory = (building.sizeScale ?? 1) > 1.15
    || building.type === BuildingType.CIVIC
    || building.type === BuildingType.RELIGIOUS
    || building.type === BuildingType.SCHOOL
    || building.type === BuildingType.MEDICAL
    || building.type === BuildingType.HOSPITALITY  // Inns always have 2-3 stories
    || (building.storyCount ?? 1) >= 2;  // Use actual story count as fallback

  const buildFloor = (level: number, floorType: 'public' | 'private', includeExteriorDoor: boolean) => {
    let localSeed = seed + level * 997;
    const rand = () => seededRandom(localSeed++);
    const profLower = profession.toLowerCase();
    const isInn = profLower.includes('inn') || profLower.includes('funduq') || profLower.includes('khan') || profLower.includes('wakala') || profLower.includes('caravanserai');

    let roomTypes = getFloorRoomTypes(baseRoomTypes, floorType, profession);
    if (floorType === 'private') {
      roomTypes = roomTypes.filter((type) => type !== InteriorRoomType.ENTRY);

      // INN UPSTAIRS: Multiple guest bedrooms
      if (isInn) {
        const guestRoomCount = 4 + Math.floor(rand() * 2); // 4-5 guest rooms
        roomTypes = [
          InteriorRoomType.HALL,  // Hallway connecting rooms
          ...Array(guestRoomCount).fill(InteriorRoomType.PRIVATE) // Guest bedrooms
        ];
      }
    }
    let roomCount = overrides?.roomCount ?? roomTypes.length;
    if (floorType === 'private' && !isInn) {
      roomCount = Math.min(roomCount, 2);
    }
    let size = resolveRoomSize(socialClass, sizeScale, building.type, building.storyCount, profession);
    if (floorType === 'private') {
      size = size * 0.9;
    }
    if (isShopStall && floorType === 'public') {
      size = Math.max(8, size * 0.8);
    }

    const openSide: 'north' | 'south' | 'east' | 'west' | null = (floorType === 'public'
      && (building.type !== BuildingType.CIVIC && building.type !== BuildingType.RELIGIOUS && building.type !== BuildingType.SCHOOL && building.type !== BuildingType.MEDICAL))
      ? entrySide
      : null;

    // INN UPSTAIRS: Use linear hallway layout instead of grid
    const rooms = (floorType === 'private' && isInn)
      ? placeInnRooms(localSeed, roomCount - 1, size) // -1 because placeInnRooms creates hallway separately
      : placeRooms(localSeed, roomTypes.slice(0, roomCount), size);
    localSeed += 50;

    // INN UPSTAIRS: Use special door mapping for hallway layout
    const interiorDoorMap = (floorType === 'private' && isInn)
      ? getInnDoorMap(rooms)
      : getInteriorDoorMap(rooms, entrySide);
    const sharedWallsMap = new Map<string, ('north' | 'south' | 'east' | 'west')[]>(
      rooms.map((room) => [room.id, getSharedWalls(room, rooms)])
    );
    const props = pickProps(rooms, socialClass, building.type, profession, localSeed, entrySide, interiorDoorMap, sharedWallsMap, floorType);
    applyRoomLayouts(props, rooms, building.type, profession, socialClass, localSeed + 31, entrySide, interiorDoorMap, sharedWallsMap, floorType, familyContext);
    adjustPropsForDoorways(props, rooms, interiorDoorMap);
    localSeed += 80;

    const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? rooms[0];
    const hasLightSource = props.some((prop) => prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.BRAZIER || prop.type === InteriorPropType.LANTERN);
    const wallHeight = Math.max(3.0, Math.min(5.2, 3.1 + sizeScale * 0.9 + (
      building.type === BuildingType.CIVIC
      || building.type === BuildingType.RELIGIOUS
      || building.type === BuildingType.SCHOOL
      || building.type === BuildingType.MEDICAL
        ? 0.4
        : 0
    )));

    if (floorType === 'public') {
      // Place ladder/stairs in a corner, avoiding entry side and shared walls (interior doorways)
      const sharedWalls = getSharedWalls(entryRoom, rooms);
      const allSides: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
      const safeWalls = allSides.filter(side => side !== entrySide && !sharedWalls.includes(side));
      const ladderSide: 'north' | 'south' | 'east' | 'west' = safeWalls.length > 0
        ? safeWalls[0]
        : (entrySide === 'north' ? 'east' : entrySide === 'south' ? 'west' : entrySide === 'east' ? 'north' : 'south');
      const cornerOffset = safeWalls.length >= 2
        ? (safeWalls.includes('east') ? 1 : safeWalls.includes('west') ? -1 : 0)
        : (ladderSide === 'north' || ladderSide === 'south' ? 0.8 : 0);
      if (!isShopStall && isMultiStory) {
        const entryMinDim = Math.min(entryRoom.size[0], entryRoom.size[2]);
        const preferLadder = socialClass === SocialClass.PEASANT || entryMinDim < 10.5;
        const stairType = preferLadder ? InteriorPropType.LADDER : InteriorPropType.STAIRS;
        if (!props.some((prop) => prop.type === stairType)) {
          const stairRun = stairType === InteriorPropType.STAIRS ? 3.4 : 0.8;
          const axisLength = (ladderSide === 'north' || ladderSide === 'south')
            ? entryRoom.size[2]
            : entryRoom.size[0];
          const stairInset = Math.max(1.2, Math.min(stairRun + 0.6, axisLength - 1.2));
          const cornerPos = cornerOffset * (entryRoom.size[0] * 0.25);
          const basePos = wallAnchor(entryRoom, ladderSide, stairInset, cornerPos);
          const stairPos = clampToRoom(entryRoom, basePos, 1.2);
          const stairRot: [number, number, number] = faceIntoRoom(ladderSide);
          // Calculate luxury level based on social class and building type
          let luxuryLevel = socialClass === SocialClass.PEASANT ? 0
            : socialClass === SocialClass.MERCHANT ? 1
            : socialClass === SocialClass.CLERGY ? 2
            : 3; // NOBILITY
          // Religious and civic buildings get a bump
          if (building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC) {
            luxuryLevel = Math.min(3, luxuryLevel + 1);
          }
          props.push({
            id: `prop-${stairType.toLowerCase()}-${building.id}`,
            type: stairType,
            roomId: entryRoom.id,
            position: stairPos,
            rotation: stairRot,
            scale: [1, 1, 1],
            label: stairType === InteriorPropType.LADDER ? 'Wooden ladder' : 'Stairway',
            luxuryLevel,
          });
        }
      }

      if (!isShopStall) {
        const orientOffset = (offset: [number, number, number]): [number, number, number] => {
          if (entrySide === 'north') return [offset[0], offset[1], -Math.abs(offset[2])];
          if (entrySide === 'south') return [offset[0], offset[1], Math.abs(offset[2])];
          if (entrySide === 'east') return [-Math.abs(offset[0]), offset[1], offset[2]];
          return [Math.abs(offset[0]), offset[1], offset[2]];
        };
        const ensureEntryProp = (type: InteriorPropType, label: string, offset: [number, number, number]) => {
          if (props.some((prop) => prop.type === type)) return;
          const adjusted = orientOffset(offset);
          const clamped = clampToRoom(entryRoom, [entryRoom.center[0] + adjusted[0], 0, entryRoom.center[2] + adjusted[2]]);
          props.push({
            id: `prop-${type.toLowerCase()}-${building.id}`,
            type,
            roomId: entryRoom.id,
            position: clamped,
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            label,
          });
        };
        ensureEntryProp(InteriorPropType.FLOOR_MAT, 'Woven floor mat', [0.4, 0, 0.4]);
        ensureEntryProp(InteriorPropType.CHEST, 'Storage chest', [-1.6, 0, 1.2]);
        ensureEntryProp(InteriorPropType.LOW_TABLE, 'Low table', [1.2, 0, -0.6]);
        ensureEntryProp(InteriorPropType.CUSHION, 'Cushion', [1.6, 0, 0.2]);
        ensureEntryProp(InteriorPropType.LAMP, 'Oil lamp', [-0.8, 0, -0.8]);
      }
    }

    const addLantern = () => {
      const lanternRoom = building.type === BuildingType.CIVIC
        || building.type === BuildingType.RELIGIOUS
        || building.type === BuildingType.SCHOOL
        || building.type === BuildingType.MEDICAL
        ? rooms.find((room) => room.type === InteriorRoomType.HALL || room.type === InteriorRoomType.ENTRY)
        : rooms.find((room) => room.type === InteriorRoomType.PRIVATE || room.type === InteriorRoomType.ENTRY);
      if (!lanternRoom) return;
      const roomLanterns = props.filter((prop) => prop.roomId === lanternRoom.id && prop.type === InteriorPropType.LANTERN).length;
      if (roomLanterns >= 2) return;
      const corner = entrySide === 'north'
        ? 'se'
        : entrySide === 'south'
          ? 'ne'
          : entrySide === 'east'
            ? 'sw'
            : 'se';
      const lanternHeight = Math.min(wallHeight - 0.8, 2.4);
      const pos = cornerAnchor(lanternRoom, corner, 1.5, lanternHeight);
      props.push({
        id: `prop-lantern-${building.id}-${level}`,
        type: InteriorPropType.LANTERN,
        roomId: lanternRoom.id,
        position: clampToRoom(lanternRoom, pos, 1.2),
        rotation: [0, 0, 0],
        scale: [3, 3, 3],
        label: 'Hanging lantern',
      });
    };

    // Only wealthy residences get ornate Damascus lanterns - nobility and clergy only
    // Merchants get nice brass lamps but not hanging lanterns with colored glass
    const isWealthyResidence = building.type === BuildingType.RESIDENTIAL && (
      socialClass === SocialClass.NOBILITY ||
      socialClass === SocialClass.CLERGY
    );
    if (building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC || building.type === BuildingType.SCHOOL || building.type === BuildingType.MEDICAL || isWealthyResidence) {
      addLantern();
    }
    if (!hasLightSource && entryRoom) {
      props.push({
        id: `prop-lamp-${building.id}-${level}`,
        type: InteriorPropType.LAMP,
        roomId: entryRoom.id,
        position: [entryRoom.center[0] + 0.6, 0, entryRoom.center[2] - 0.4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        label: 'Oil lamp',
      });
    }

    // Generate NPCs: public floors get shopkeepers/guests, inn private floors get sleeping guests
    const npcs = floorType === 'public'
      ? createNPCs(building, socialClass, rooms, props, localSeed, familyContext)
      : (floorType === 'private' && isInn)
        ? createInnUpstairsGuests(building, rooms, props, localSeed)
        : [];

    props.forEach((prop) => {
      const room = rooms.find((candidate) => candidate.id === prop.roomId);
      if (!room) return;
      prop.position = clampToRoom(room, prop.position, 0.8);
      if (room.type === InteriorRoomType.ENTRY) {
        prop.position = keepInsideOpenSide(room, prop.position, openSide, 2.0);
      }
    });

    if (floorType === 'public' && overrides?.extraProps) {
      overrides.extraProps.forEach((extra, index) => {
        const room = rooms[index % rooms.length];
        props.push({
          id: extra.id ?? `prop-extra-${index}`,
          type: extra.type,
          roomId: extra.roomId ?? room.id,
          position: extra.position ?? room.center,
          rotation: extra.rotation ?? [0, 0, 0],
          scale: extra.scale ?? [1, 1, 1],
          label: extra.label ?? extra.type,
          tags: extra.tags,
        });
      });
    }

    props.forEach((prop) => {
      let room = rooms.find((candidate) => candidate.id === prop.roomId);
      if (!room) {
        room = entryRoom;
        prop.roomId = entryRoom.id;
        prop.position = [...entryRoom.center] as [number, number, number];
      }
      if (isNaN(prop.position[0]) || isNaN(prop.position[2]) ||
          Math.abs(prop.position[0] - room.center[0]) > room.size[0] * 1.2 ||
          Math.abs(prop.position[2] - room.center[2]) > room.size[2] * 1.2) {
        prop.position = [...room.center] as [number, number, number];
      }
      const needsExtraInset = prop.type === InteriorPropType.RUG
        || prop.type === InteriorPropType.PRAYER_RUG
        || prop.type === InteriorPropType.FLOOR_MAT
        || prop.type === InteriorPropType.FIRE_PIT
        || prop.type === InteriorPropType.BRAZIER
        || prop.type === InteriorPropType.DESK;
      const margin = needsExtraInset ? 1.2 : 0.8;
      prop.position = clampToRoom(room, prop.position, margin);
      if (room.type === InteriorRoomType.ENTRY) {
        prop.position = keepInsideOpenSide(room, prop.position, openSide, 2.0);
      }
    });

    if (floorType === 'public' && overrides?.extraNPCs) {
      overrides.extraNPCs.forEach((extra, index) => {
        const stats = extra.stats ?? generateNPCStats(seed + 101 + index);
        npcs.push({
          id: extra.id ?? `npc-extra-${index}`,
          role: extra.role,
          position: extra.position ?? [0, 0, 0],
          rotation: extra.rotation ?? [0, 0, 0],
          stats,
          state: extra.state ?? AgentState.HEALTHY,
        });
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      const issues: string[] = [];
      props.forEach((prop) => {
        const room = rooms.find((candidate) => candidate.id === prop.roomId);
        if (!room) {
          issues.push(`${prop.id} missing room ${prop.roomId}`);
          return;
        }
        const [cx, , cz] = room.center;
        const halfW = room.size[0] / 2 - 0.4;
        const halfD = room.size[2] / 2 - 0.4;
        const dx = Math.abs(prop.position[0] - cx);
        const dz = Math.abs(prop.position[2] - cz);
        if (dx > halfW || dz > halfD) {
          issues.push(`${prop.id} outside ${room.id} (${dx.toFixed(2)}, ${dz.toFixed(2)})`);
        }
      });
      if (issues.length) {
        console.warn(`[interior] placement issues for ${building.id}`, issues);
      }
    }

    const floorPrefix = `floor-${level}-`;
    props.forEach((prop) => {
      if (!prop.id.startsWith(floorPrefix)) {
        prop.id = `${floorPrefix}${prop.id}`;
      }
    });

    const floorSpec: InteriorSpec = {
      id: `interior-${building.id}-floor-${level}`,
      buildingId: building.id,
      buildingType: building.type,
      seed: localSeed,
      socialClass,
      profession,
      exteriorDoorSide: includeExteriorDoor ? building.doorSide : undefined,
      wallHeight,
      rooms,
      props,
      npcs,
      narratorState: {
        buildingId: building.id,
        roomCount: rooms.length,
        socialClass,
        profession,
        rooms: [],
        objects: [],
        npcs: [],
      },
    };
    floorSpec.narratorState = buildNarratorState(floorSpec);

    return {
      level,
      floorType,
      seed: localSeed,
      rooms,
      props,
      npcs,
      wallHeight,
      exteriorDoorSide: includeExteriorDoor ? building.doorSide : undefined,
      narratorState: floorSpec.narratorState,
    };
  };

  const floor0 = buildFloor(0, 'public', true);
  let floor1: InteriorFloor | null = null;
  if (isMultiStory) {
    floor1 = buildFloor(1, 'private', false);
    const stair = floor0.props.find((prop) => prop.type === InteriorPropType.STAIRS || prop.type === InteriorPropType.LADDER);
    if (stair) {
      floor1.props.push({
        id: `floor-1-prop-stair-landing-${building.id}`,
        type: stair.type,
        roomId: floor1.rooms[0]?.id ?? stair.roomId,
        position: [...stair.position],
        rotation: [...stair.rotation],
        scale: [1, 1, 1],
        label: 'Stair Landing',
        luxuryLevel: stair.luxuryLevel,
      });
    }

    // Add roof hatch on top floor for roof access
    // All multi-story buildings with exterior ladders get hatches for rooftop access
    // Find suitable room - prefer private room or storage, avoid entry/hall
    const hatchRoom = floor1.rooms.find(r =>
      r.type === InteriorRoomType.PRIVATE || r.type === InteriorRoomType.STORAGE
    ) || floor1.rooms[0];

    if (hatchRoom) {
        // Calculate luxury level for hatch appearance
        let hatchLuxury = socialClass === SocialClass.PEASANT ? 0
          : socialClass === SocialClass.MERCHANT ? 1
          : socialClass === SocialClass.CLERGY ? 2
          : 3;

        // Place hatch slightly offset from center to avoid furniture
        const hatchOffsetX = (seededRandom(seed + 7778) - 0.5) * (hatchRoom.size[0] * 0.3);
        const hatchOffsetZ = (seededRandom(seed + 7779) - 0.5) * (hatchRoom.size[2] * 0.3);

        floor1.props.push({
          id: `roof-hatch-${building.id}`,
          type: InteriorPropType.ROOF_HATCH,
          roomId: hatchRoom.id,
          position: [
            hatchRoom.center[0] + hatchOffsetX,
            0.02,
            hatchRoom.center[2] + hatchOffsetZ
          ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          label: 'Roof hatch',
          luxuryLevel: hatchLuxury,
        });

        // Mark building as having a roof hatch and store world position
        building.hasRoofHatch = true;
        building.roofHatchWorldPos = [
          building.position[0] + hatchRoom.center[0] + hatchOffsetX,
          building.position[1], // Will be adjusted to roof height when used
          building.position[2] + hatchRoom.center[2] + hatchOffsetZ
        ];
    }
  }

  const floors = floor1 ? [floor0, floor1] : [floor0];
  // Cap lanterns: max 2 per room, max 4 per building
  const applyLanternCaps = (floorsToCap: InteriorFloor[]) => {
    let totalLanterns = 0;
    floorsToCap.forEach((floor) => {
      const roomCounts = new Map<string, number>();
      floor.props = floor.props.filter((prop) => {
        if (prop.type !== InteriorPropType.LANTERN) return true;
        const roomCount = roomCounts.get(prop.roomId) ?? 0;
        if (roomCount >= 2 || totalLanterns >= 4) return false;
        roomCounts.set(prop.roomId, roomCount + 1);
        totalLanterns += 1;
        return true;
      });
    });
  };
  applyLanternCaps(floors);
  floors.forEach((floor) => {
    const floorSpec: InteriorSpec = {
      id: `interior-${building.id}-floor-${floor.level}`,
      buildingId: building.id,
      buildingType: building.type,
      seed: floor.seed,
      socialClass,
      profession,
      exteriorDoorSide: floor.exteriorDoorSide,
      wallHeight: floor.wallHeight,
      rooms: floor.rooms,
      props: floor.props,
      npcs: floor.npcs,
      narratorState: floor.narratorState,
    };
    floor.narratorState = buildNarratorState(floorSpec);
  });

  const spec: InteriorSpec = {
    id: `interior-${building.id}`,
    buildingId: building.id,
    buildingType: building.type,
    seed,
    socialClass,
    profession,
    exteriorDoorSide: building.doorSide,
    wallHeight: floor0.wallHeight,
    rooms: floor0.rooms,
    props: floor0.props,
    npcs: floor0.npcs,
    narratorState: floor0.narratorState,
    floors,
  };
  return spec;
};

export const generateInteriorObstacles = (
  spec: InteriorSpec,
  doorMap?: Map<string, 'north' | 'south' | 'east' | 'west' | null>
): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  const wallSpacing = 1.2;
  const wallRadius = 0.35;
  const doorWidth = 3.0;
  const doorClearance = doorWidth / 2 + 0.4;

  spec.rooms.forEach((room) => {
    const [x, , z] = room.center;
    const [w, , d] = room.size;
    const halfW = w / 2;
    const halfD = d / 2;
    const doorSide = doorMap?.get(room.id) ?? (room.type === InteriorRoomType.ENTRY ? 'north' : null);
    const stepsX = Math.ceil(w / wallSpacing);
    const stepsZ = Math.ceil(d / wallSpacing);

    for (let i = 0; i <= stepsX; i += 1) {
      const px = x - halfW + (i * w) / stepsX;
      if (!(doorSide === 'south' && Math.abs(px - x) < doorClearance)) {
        obstacles.push({ position: [px, 0, z - halfD], radius: wallRadius });
      }
      if (!(doorSide === 'north' && Math.abs(px - x) < doorClearance)) {
        obstacles.push({ position: [px, 0, z + halfD], radius: wallRadius });
      }
    }
    for (let i = 0; i <= stepsZ; i += 1) {
      const pz = z - halfD + (i * d) / stepsZ;
      if (!(doorSide === 'west' && Math.abs(pz - z) < doorClearance)) {
        obstacles.push({ position: [x - halfW, 0, pz], radius: wallRadius });
      }
      if (!(doorSide === 'east' && Math.abs(pz - z) < doorClearance)) {
        obstacles.push({ position: [x + halfW, 0, pz], radius: wallRadius });
      }
    }
  });

  spec.props.forEach((prop) => {
    if (
      prop.type === InteriorPropType.RUG
      || prop.type === InteriorPropType.PRAYER_RUG
      || prop.type === InteriorPropType.FLOOR_MAT
      || prop.type === InteriorPropType.FLOOR_PILLOWS
      || prop.type === InteriorPropType.CUSHION
      || prop.type === InteriorPropType.LANTERN
    ) {
      return;
    }
    // Larger radii for furniture NPCs should avoid completely
    const radius = prop.type === InteriorPropType.COUNTER
      ? 1.8
      : prop.type === InteriorPropType.DISPLAY
        ? 1.5
        : prop.type === InteriorPropType.BENCH
          ? 1.2
          : prop.type === InteriorPropType.LOW_TABLE
            ? 1.0
            : prop.type === InteriorPropType.STORAGE_CHEST
              ? 0.9
              : prop.type === InteriorPropType.BARREL
                ? 0.7
                : 0.6;
    obstacles.push({ position: prop.position, radius });
  });

  return obstacles;
};
