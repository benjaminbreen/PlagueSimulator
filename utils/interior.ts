import { BuildingMetadata, BuildingType, InteriorSpec, InteriorRoom, InteriorRoomType, InteriorProp, InteriorPropType, InteriorNPC, InteriorOverrides, SocialClass, NPCStats, Obstacle, getProfessionCategory, ProfessionCategory, PROFESSION_SIZE_SCALE, AgentState } from '../types';
import { generateNPCStats, seededRandom } from './procedural';

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
    if (prof.includes('inn') || prof.includes('sherbet')) {
      types.push(InteriorRoomType.HALL, InteriorRoomType.PRIVATE);
    } else if (prof.includes('khan') || prof.includes('caravanserai')) {
      types.push(InteriorRoomType.HALL, InteriorRoomType.STORAGE);
    } else {
      types.push(InteriorRoomType.HALL, InteriorRoomType.STORAGE);
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
];

const roomPropBudget = (socialClass: SocialClass): number => {
  if (socialClass === SocialClass.NOBILITY) return 22;
  if (socialClass === SocialClass.MERCHANT) return 17;
  if (socialClass === SocialClass.CLERGY) return 13;
  return 11;
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

// Helper to find walls that are NOT shared with adjacent rooms
const getSharedWalls = (room: InteriorRoom, allRooms: InteriorRoom[]): ('north' | 'south' | 'east' | 'west')[] => {
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
  entrySide: 'north' | 'south' | 'east' | 'west'
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
  const counterSide = oppositeSide(entrySide);

  if (profLower.includes('inn') || profLower.includes('sherbet')) {
    const cafeRoom = entryRoom ?? hall;
    const tableCount = cafeRoom.size[0] > 14 ? 3 : 2;
    for (let i = 0; i < tableCount; i += 1) {
      const offsetX = (i - (tableCount - 1) / 2) * 3.2;
      const basePos: [number, number, number] = [cafeRoom.center[0] + offsetX, 0, cafeRoom.center[2] + (i % 2 === 0 ? 1.0 : -1.0)];
      addProp(props, cafeRoom, InteriorPropType.LOW_TABLE, 'Low table', clampToRoom(cafeRoom, basePos));
      const pillows: [number, number, number][] = [
        [basePos[0] + 1.0, 0, basePos[2]],
        [basePos[0] - 1.0, 0, basePos[2]],
        [basePos[0], 0, basePos[2] + 1.0],
        [basePos[0], 0, basePos[2] - 1.0],
      ];
      pillows.forEach((pos) => {
        addProp(props, cafeRoom, InteriorPropType.FLOOR_PILLOWS, 'Floor pillows', clampToRoom(cafeRoom, pos), [0, rand() * Math.PI * 2, 0]);
      });
      addProp(props, cafeRoom, InteriorPropType.TRAY, 'Serving tray', clampToRoom(cafeRoom, [basePos[0] + 0.2, 0.78, basePos[2] - 0.1]));
      addProp(props, cafeRoom, InteriorPropType.TEA_SET, 'Sherbet service', clampToRoom(cafeRoom, [basePos[0] - 0.2, 0.78, basePos[2] + 0.1]));
      if (rand() > 0.4) {
        addProp(props, cafeRoom, InteriorPropType.HOOKAH, 'Hookah', clampToRoom(cafeRoom, [basePos[0] + 1.2, 0, basePos[2] + 0.6]));
      }
    }
    addProp(props, cafeRoom, InteriorPropType.BRAZIER, 'Charcoal brazier', clampToRoom(cafeRoom, wallAnchor(cafeRoom, counterSide, 0.7)));
    if (rand() > 0.4) {
      addProp(props, cafeRoom, InteriorPropType.BENCH, 'Low bench', clampToRoom(cafeRoom, wallAnchor(cafeRoom, 'east', 0.7, -2.0)), [0, Math.PI / 2, 0]);
    }
    if (rand() > 0.3) {
      addProp(props, cafeRoom, InteriorPropType.CHAIR, 'Wooden chair', clampToRoom(cafeRoom, wallAnchor(cafeRoom, 'west', 0.7, 1.4)), [0, Math.PI / 2, 0]);
    }
    return;
  }

  if (profLower.includes('khan') || profLower.includes('caravanserai')) {
    addProp(
      props,
      hall,
      InteriorPropType.COUNTER,
      'Reception counter',
      clampToRoom(hall, wallAnchor(hall, counterSide, 0.8)),
      faceIntoRoom(counterSide)
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
    const doorHalf = 1.6;
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
  entrySide: 'north' | 'south' | 'east' | 'west'
): InteriorProp[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const props: InteriorProp[] = [];
  const budget = Math.max(roomPropBudget(socialClass), rooms.length * 5);
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

  if (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY) {
    addCommercialLayout(props, rooms, profession, seed + 17, entrySide);
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
  if (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY) {
    if (profLower.includes('inn') || profLower.includes('sherbet')) {
      extraTemplates.push(
        { room: [InteriorRoomType.HALL], type: InteriorPropType.FLOOR_PILLOWS, label: 'Floor pillows' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.TRAY, label: 'Serving tray' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.TEA_SET, label: 'Sherbet service' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.HOOKAH, label: 'Hookah' },
        { room: [InteriorRoomType.HALL], type: InteriorPropType.BRAZIER, label: 'Charcoal brazier' },
      );
    } else if (profLower.includes('khan') || profLower.includes('caravanserai')) {
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

  rooms.forEach((room) => {
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
      const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
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
    const hasLight = props.some((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.LAMP
      || prop.type === InteriorPropType.BRAZIER
      || prop.type === InteriorPropType.FIRE_PIT
      || prop.type === InteriorPropType.CANDLE
      || prop.type === InteriorPropType.FLOOR_LAMP
    ));
    if (!hasLight) {
      const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
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
    const hall = rooms.find((room) => room.type === InteriorRoomType.HALL) ?? rooms[0];
    const hasRug = props.some((prop) => prop.type === InteriorPropType.RUG);
    if (!hasRug) {
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
      if (profLower.includes('inn') || profLower.includes('sherbet')) return;
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
  entrySide: 'north' | 'south' | 'east' | 'west'
) => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const profLower = profession.toLowerCase();
  const isCommercial = buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY || profLower.includes('merchant') || profLower.includes('shop');
  const isInnLike = profLower.includes('inn') || profLower.includes('sherbet');
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
          upsertProp(props, room, InteriorPropType.LOW_BED, 'Low wooden bed', clampToRoom(room, wallAnchor(room, bedSide, 1.1, 0.8)));
        } else if (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY) {
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchor(room, bedSide, 0.9, 0.8)));
        } else if (profCategory === 'LABORER' || profCategory === 'SERVICE') {
          upsertProp(props, room, InteriorPropType.SLEEPING_MAT, 'Sleeping mat', clampToRoom(room, wallAnchor(room, bedSide, 0.9, 0.8)));
        } else {
          upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchor(room, bedSide, 0.9, 0.8)));
        }

        // Profession-specific props for single-room dwellings
        switch (profCategory) {
          case 'ARTISAN':
            upsertProp(props, room, InteriorPropType.WORKBENCH, 'Work bench', clampToRoom(room, wallAnchor(room, safeSide, 1.0, -0.8)));
            break;
          case 'AGRICULTURAL':
            upsertProp(props, room, InteriorPropType.PRODUCE_BASKET, 'Produce basket', clampToRoom(room, wallAnchor(room, safeSide, 0.6, -0.6)));
            break;
          case 'TRANSPORT':
            upsertProp(props, room, InteriorPropType.ROPE_COIL, 'Rope coil', clampToRoom(room, wallAnchor(room, safeSide, 0.5, -0.5)));
            break;
          default:
            break;
        }
      }

      upsertProp(props, room, InteriorPropType.FLOOR_MAT, 'Woven floor mat', clampToRoom(room, wallAnchor(room, safeSide, 1.4, 0)));
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchor(room, safeSide, 0.8, -0.8)));
      upsertProp(props, room, InteriorPropType.LAMP, 'Oil lamp', clampToRoom(room, wallAnchor(room, safeSide, 0.8, 0.6)));
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

      // Choose bed type based on social class
      if (socialClass === SocialClass.NOBILITY) {
        upsertProp(props, room, InteriorPropType.RAISED_BED, 'Raised bed with curtains', clampToRoom(room, wallAnchor(room, bedWall, 1.4, 0)));
      } else if (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.CLERGY) {
        upsertProp(props, room, InteriorPropType.LOW_BED, 'Low wooden bed', clampToRoom(room, wallAnchor(room, bedWall, 1.1, 0)));
      } else if (profCategory === 'LABORER' || profCategory === 'SERVICE') {
        upsertProp(props, room, InteriorPropType.SLEEPING_MAT, 'Sleeping mat', clampToRoom(room, wallAnchor(room, bedWall, 0.9, 0)));
      } else {
        upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchor(room, bedWall, 0.9, 0)));
      }

      // Basic furniture - place against a safe wall
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchor(room, chestWall, 0.8, -0.6)));

      // Profession-specific props - use safe walls
      switch (profCategory) {
        case 'ARTISAN':
          upsertProp(props, room, InteriorPropType.WORKBENCH, 'Work bench', clampToRoom(room, wallAnchor(room, workWall, 1.0, 0)));
          upsertProp(props, room, InteriorPropType.TOOL_RACK, 'Tool rack', clampToRoom(room, wallAnchor(room, decorWall, 0.6, -0.8)));
          break;
        case 'MILITARY':
          upsertProp(props, room, InteriorPropType.WEAPON_RACK, 'Weapon rack', clampToRoom(room, wallAnchor(room, workWall, 0.8, 0)));
          break;
        case 'SCHOLARLY':
          upsertProp(props, room, InteriorPropType.DESK, 'Writing desk', clampToRoom(room, wallAnchor(room, workWall, 0.9, 0)));
          upsertProp(props, room, InteriorPropType.BOOKS, 'Manuscripts', clampToRoom(room, wallAnchor(room, decorWall, 0.6, 0.6)));
          upsertProp(props, room, InteriorPropType.PRAYER_RUG, 'Prayer rug', clampToRoom(room, [room.center[0], 0, room.center[2]]));
          break;
        case 'AGRICULTURAL':
          upsertProp(props, room, InteriorPropType.PRODUCE_BASKET, 'Produce basket', clampToRoom(room, wallAnchor(room, workWall, 0.6, 0.4)));
          upsertProp(props, room, InteriorPropType.TOOL_RACK, 'Garden tools', clampToRoom(room, wallAnchor(room, decorWall, 0.6, -0.6)));
          break;
        case 'TRANSPORT':
          upsertProp(props, room, InteriorPropType.ROPE_COIL, 'Rope coil', clampToRoom(room, wallAnchor(room, workWall, 0.5, 0)));
          upsertProp(props, room, InteriorPropType.CRATE, 'Travel chest', clampToRoom(room, wallAnchor(room, decorWall, 0.7, 0.5)));
          break;
        case 'LABORER':
        case 'SERVICE':
          // Minimal furnishings - just water jug
          upsertProp(props, room, InteriorPropType.WATER_JUG, 'Water jug', clampToRoom(room, wallAnchor(room, workWall, 0.4, 0)));
          break;
        default:
          // Default: prayer rug for others
          upsertProp(props, room, InteriorPropType.PRAYER_RUG, 'Prayer rug', clampToRoom(room, [room.center[0], 0, room.center[2]]));
      }

      // Wall hanging for wealthier classes - use a safe wall
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.WALL_HANGING, 'Wall hanging', clampToRoom(room, wallAnchor(room, decorWall, 0.2, 0)));
      }
      return;
    }
    if (room.type === InteriorRoomType.WORKSHOP) {
      const safeWalls = getSafeWalls(room);
      const deskWall = safeWalls.find(w => w === 'north') ?? safeWalls[0] ?? 'north';
      const shelfWall = safeWalls.find(w => w === 'west' && w !== deskWall) ?? safeWalls.find(w => w !== deskWall) ?? 'west';
      upsertProp(props, room, InteriorPropType.DESK, 'Work desk', clampToRoom(room, wallAnchor(room, deskWall, 0.9, 0)));
      upsertProp(props, room, InteriorPropType.CHAIR, 'Work chair', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 2.0]), [0, 0, 0]);
      upsertProp(props, room, InteriorPropType.BOOKS, 'Manuscripts', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.INK_SET, 'Ink set', clampToRoom(room, [room.center[0] + 0.4, 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchor(room, shelfWall, 0.7, -0.4)));
      return;
    }
    if (room.type === InteriorRoomType.STORAGE) {
      const safeWalls = getSafeWalls(room);
      const crateWall = safeWalls.find(w => w === 'east') ?? safeWalls[0] ?? 'east';
      const amphoraWall = safeWalls.find(w => w === 'south' && w !== crateWall) ?? safeWalls.find(w => w !== crateWall) ?? 'south';
      upsertProp(props, room, InteriorPropType.CRATE, 'Stacked crates', clampToRoom(room, wallAnchor(room, crateWall, 0.9, 0.6)));
      upsertProp(props, room, InteriorPropType.AMPHORA, 'Amphorae', clampToRoom(room, wallAnchor(room, amphoraWall, 0.8, -0.6)));
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
      if (isCommercial && !isInnLike) {
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
          clampToRoom(room, wallAnchor(room, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4)),
          displayRot
        );
        const counterTopY = 1.18;
        upsertProp(props, room, InteriorPropType.SCALE, 'Balance scale', clampToRoom(room, [counterPos[0] - 0.5, counterTopY, counterPos[2] + 0.12]));
        upsertProp(props, room, InteriorPropType.LEDGER, 'Account ledger', clampToRoom(room, [counterPos[0] + 0.5, counterTopY, counterPos[2] + 0.12]));
        upsertProp(props, room, InteriorPropType.BASKET, 'Market baskets', clampToRoom(room, wallAnchor(room, 'west', 0.8, 1.2)));
        return;
      }
      // Civic/school/medical buildings get office furnishings, not cooking equipment
      if (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL) {
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
        upsertProp(props, room, InteriorPropType.SHELF, shelfLabel, clampToRoom(room, wallAnchor(room, 'west', 0.6, 0)), faceIntoRoom('west'));
        // Brazier for warmth (not cooking) in corner
        upsertProp(props, room, InteriorPropType.BRAZIER, 'Warming brazier', clampToRoom(room, [rcx + halfW * 0.6, 0, rcz - halfD * 0.5]));
        return;
      }
      // Regular residential HALL rooms
      upsertProp(props, room, InteriorPropType.FIRE_PIT, 'Cooking hearth', clampToRoom(room, [room.center[0] + 1.5, 0, room.center[2] + 0.6]));
      upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Water basin', clampToRoom(room, wallAnchor(room, 'east', 0.9, -0.8)));
      upsertProp(props, room, InteriorPropType.EWER, 'Water ewer', clampToRoom(room, wallAnchor(room, 'east', 0.8, -0.4)));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchor(room, 'north', 0.7, 0)));
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
  seed: number
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
  npcs.push({
    id: `npc-owner-${building.id}`,
    role: 'owner',
    position: ownerPosition,
    rotation: ownerRotation,
    stats: ownerStats,
    state: AgentState.HEALTHY,
  });

  if (socialClass !== SocialClass.PEASANT && rand() > 0.6) {
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
  overrides?: InteriorOverrides
): InteriorSpec => {
  let s = seed;
  const socialClass = inferSocialClass(building);
  const profession = building.ownerProfession;
  const sizeScale = building.sizeScale ?? 1;
  const profLower = profession.toLowerCase();
  const isCommercial = building.type === BuildingType.COMMERCIAL || building.type === BuildingType.HOSPITALITY;
  const isInnLike = isCommercial && (profLower.includes('inn') || profLower.includes('sherbet'));
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
  const roomCount = overrides?.roomCount ?? baseRoomTypes.length;
  let size = resolveRoomSize(socialClass, sizeScale, building.type, building.storyCount, profession);
  if (isShopStall) {
    size = Math.max(8, size * 0.8);
  }

  const entrySide = building.doorSide === 0 ? 'north' : building.doorSide === 1 ? 'south' : building.doorSide === 2 ? 'east' : 'west';
  const openSide: 'north' | 'south' | 'east' | 'west' | null = building.type === BuildingType.CIVIC
    || building.type === BuildingType.RELIGIOUS
    || building.type === BuildingType.SCHOOL
    || building.type === BuildingType.MEDICAL
    ? null
    : entrySide;
  const rooms = placeRooms(s, baseRoomTypes.slice(0, roomCount), size);
  s += 50;
  const props = pickProps(rooms, socialClass, building.type, profession, s, entrySide);
  applyRoomLayouts(props, rooms, building.type, profession, socialClass, s + 31, entrySide);
  s += 80;
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
  // Place ladder on perpendicular wall to entry (so all 4 directions are possible)
  const ladderSide: 'north' | 'south' | 'east' | 'west' =
    entrySide === 'north' ? 'east' :
    entrySide === 'south' ? 'west' :
    entrySide === 'east' ? 'north' : 'south';
  const isMultiStory = (building.sizeScale ?? 1) > 1.15
    || building.type === BuildingType.CIVIC
    || building.type === BuildingType.RELIGIOUS
    || building.type === BuildingType.SCHOOL
    || building.type === BuildingType.MEDICAL;
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
  if (!isShopStall && isMultiStory) {
    const stairType = socialClass === SocialClass.PEASANT ? InteriorPropType.LADDER : InteriorPropType.STAIRS;
    if (!props.some((prop) => prop.type === stairType)) {
      const stairPos = clampToRoom(
        entryRoom,
        wallAnchor(entryRoom, ladderSide, 0.7, ladderSide === 'north' || ladderSide === 'south' ? 0.6 : -0.6)
      );
      const stairRot: [number, number, number] = ladderSide === 'east'
        ? [0, -Math.PI / 2, 0]
        : ladderSide === 'west'
          ? [0, Math.PI / 2, 0]
          : ladderSide === 'south'
            ? [0, Math.PI, 0]
            : [0, 0, 0];
      props.push({
        id: `prop-${stairType.toLowerCase()}-${building.id}`,
        type: stairType,
        roomId: entryRoom.id,
        position: stairPos,
        rotation: stairRot,
        scale: [1, 1, 1],
        label: stairType === InteriorPropType.LADDER ? 'Wooden ladder' : 'Stairway',
      });
    }
  }
  if (!isShopStall) {
    ensureEntryProp(InteriorPropType.FLOOR_MAT, 'Woven floor mat', [0.4, 0, 0.4]);
    ensureEntryProp(InteriorPropType.CHEST, 'Storage chest', [-1.6, 0, 1.2]);
    ensureEntryProp(InteriorPropType.LOW_TABLE, 'Low table', [1.2, 0, -0.6]);
    ensureEntryProp(InteriorPropType.CUSHION, 'Cushion', [1.6, 0, 0.2]);
  }
  ensureEntryProp(InteriorPropType.LAMP, 'Oil lamp', [-0.8, 0, -0.8]);

  const addLantern = () => {
    const lanternRoom = building.type === BuildingType.CIVIC
      || building.type === BuildingType.RELIGIOUS
      || building.type === BuildingType.SCHOOL
      || building.type === BuildingType.MEDICAL
      ? rooms.find((room) => room.type === InteriorRoomType.HALL || room.type === InteriorRoomType.ENTRY)
      : rooms.find((room) => room.type === InteriorRoomType.PRIVATE || room.type === InteriorRoomType.ENTRY);
    if (!lanternRoom) return;
    const hasLantern = props.some((prop) => prop.roomId === lanternRoom.id && prop.type === InteriorPropType.LANTERN);
    if (hasLantern) return;
    const corner = entrySide === 'north'
      ? 'se'
      : entrySide === 'south'
        ? 'ne'
        : entrySide === 'east'
          ? 'sw'
          : 'se';
    // Position lantern well inside room (inset 1.5 from corner), at a lower height for visibility
    const lanternHeight = Math.min(wallHeight - 0.8, 2.4);  // Lower, more visible height
    const pos = cornerAnchor(lanternRoom, corner, 1.5, lanternHeight);
    props.push({
      id: `prop-lantern-${building.id}`,
      type: InteriorPropType.LANTERN,
      roomId: lanternRoom.id,
      position: clampToRoom(lanternRoom, pos, 1.2),  // Use larger margin to keep inside walls
      rotation: [0, 0, 0],
      scale: [3, 3, 3],  // Larger scale for more prominent appearance
      label: 'Hanging lantern',
    });
  };

  if (building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC || building.type === BuildingType.SCHOOL || building.type === BuildingType.MEDICAL || building.type === BuildingType.RESIDENTIAL) {
    addLantern();
  }
  if (!hasLightSource) {
    props.push({
      id: `prop-lamp-${building.id}`,
      type: InteriorPropType.LAMP,
      roomId: entryRoom.id,
      position: [entryRoom.center[0] + 0.6, 0, entryRoom.center[2] - 0.4],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      label: 'Oil lamp',
    });
  }
  const npcs = createNPCs(building, socialClass, rooms, props, s);

  // Final clamp to ensure props never fall outside their room bounds.
  props.forEach((prop) => {
    const room = rooms.find((candidate) => candidate.id === prop.roomId);
    if (!room) return;
    prop.position = clampToRoom(room, prop.position, 0.8);
    if (room.type === InteriorRoomType.ENTRY) {
      prop.position = keepInsideOpenSide(room, prop.position, openSide, 2.0);
    }
  });

  if (overrides?.extraProps) {
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

  // Final safety pass: ensure every prop is tied to a valid room and clamped.
  props.forEach((prop) => {
    let room = rooms.find((candidate) => candidate.id === prop.roomId);
    if (!room) {
      room = entryRoom;
      prop.roomId = entryRoom.id;
      prop.position = [...entryRoom.center] as [number, number, number];
    }

    // Check for NaN or invalid positions and reset to room center
    // Use stricter bounds (1.2x room size) to catch props that are way outside
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

  if (overrides?.extraNPCs) {
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

  const spec: InteriorSpec = {
    id: `interior-${building.id}`,
    buildingId: building.id,
    buildingType: building.type,
    seed,
    socialClass,
    profession,
    exteriorDoorSide: building.doorSide,
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
  spec.narratorState = buildNarratorState(spec);
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
