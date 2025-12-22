import { BuildingMetadata, BuildingType, InteriorSpec, InteriorRoom, InteriorRoomType, InteriorProp, InteriorPropType, InteriorNPC, InteriorOverrides, SocialClass, NPCStats, Obstacle } from '../types';
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
  if (building.type === BuildingType.CIVIC || building.type === BuildingType.RELIGIOUS) return SocialClass.NOBILITY;
  return SocialClass.PEASANT;
};

const roomSizeForClass = (socialClass: SocialClass): number => {
  if (socialClass === SocialClass.NOBILITY) return 18;
  if (socialClass === SocialClass.MERCHANT) return 15;
  if (socialClass === SocialClass.CLERGY) return 12;
  return 10;
};

const resolveRoomSize = (socialClass: SocialClass, sizeScale: number, buildingType: BuildingType): number => {
  const base = roomSizeForClass(socialClass) * sizeScale;
  const typeBoost = buildingType === BuildingType.CIVIC || buildingType === BuildingType.RELIGIOUS ? 1.15 : 1;
  const raw = base * typeBoost;
  return Math.max(8, Math.min(22, raw));
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

  if (buildingType === BuildingType.COMMERCIAL) {
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
  const hall = rooms.find((room) => room.type === InteriorRoomType.HALL) ?? rooms[0];
  const clampToRoom = (room: InteriorRoom, pos: [number, number, number]): [number, number, number] => {
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - 0.6;
    const halfD = room.size[2] / 2 - 0.6;
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
    const tableCount = hall.size[0] > 14 ? 3 : 2;
    for (let i = 0; i < tableCount; i += 1) {
      const offsetX = (i - (tableCount - 1) / 2) * 3.2;
      const basePos: [number, number, number] = [hall.center[0] + offsetX, 0, hall.center[2] + (i % 2 === 0 ? 1.0 : -1.0)];
      addProp(props, hall, InteriorPropType.LOW_TABLE, 'Low table', basePos);
      const pillows = [
        [basePos[0] + 1.0, 0, basePos[2]],
        [basePos[0] - 1.0, 0, basePos[2]],
        [basePos[0], 0, basePos[2] + 1.0],
        [basePos[0], 0, basePos[2] - 1.0],
      ];
      pillows.forEach((pos) => {
        addProp(props, hall, InteriorPropType.FLOOR_PILLOWS, 'Floor pillows', pos, [0, rand() * Math.PI * 2, 0]);
      });
      addProp(props, hall, InteriorPropType.TRAY, 'Serving tray', [basePos[0] + 0.2, 0.78, basePos[2] - 0.1]);
      addProp(props, hall, InteriorPropType.TEA_SET, 'Sherbet service', [basePos[0] - 0.2, 0.78, basePos[2] + 0.1]);
      if (rand() > 0.4) {
        addProp(props, hall, InteriorPropType.HOOKAH, 'Hookah', [basePos[0] + 1.2, 0, basePos[2] + 0.6]);
      }
    }
    addProp(props, hall, InteriorPropType.BRAZIER, 'Charcoal brazier', clampToRoom(hall, wallAnchor(hall, counterSide, 0.7)));
    if (rand() > 0.4) {
      addProp(props, hall, InteriorPropType.BENCH, 'Low bench', clampToRoom(hall, wallAnchor(hall, 'east', 0.7, -2.0)), [0, Math.PI / 2, 0]);
    }
    if (rand() > 0.3) {
      addProp(props, hall, InteriorPropType.CHAIR, 'Wooden chair', clampToRoom(hall, wallAnchor(hall, 'west', 0.7, 1.4)), [0, Math.PI / 2, 0]);
    }
    return;
  }

  if (profLower.includes('khan') || profLower.includes('caravanserai')) {
    addProp(props, hall, InteriorPropType.COUNTER, 'Reception counter', clampToRoom(hall, wallAnchor(hall, counterSide, 0.8)));
    return;
  }

  addProp(props, hall, InteriorPropType.COUNTER, 'Sales counter', clampToRoom(hall, wallAnchor(hall, counterSide, 1.6)));
  const displaySide = entrySide === 'east' || entrySide === 'west'
    ? (entrySide === 'east' ? 'north' : 'south')
    : (entrySide === 'north' ? 'east' : 'west');
  addProp(props, hall, InteriorPropType.DISPLAY, 'Display shelf', clampToRoom(hall, wallAnchor(hall, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4)), [0, displaySide === 'east' ? -Math.PI / 2 : Math.PI / 2, 0]);
  addProp(props, hall, InteriorPropType.BASKET, 'Market baskets', clampToRoom(hall, [hall.center[0], 0, hall.center[2] - hall.size[2] / 2 + 2.2]), [0, rand() * Math.PI, 0]);
  addProp(props, hall, InteriorPropType.BOLT_OF_CLOTH, 'Bolts of cloth', clampToRoom(hall, [hall.center[0] + 1.4, 0.75, hall.center[2] - hall.size[2] / 2 + 0.8]), [0, 0, 0]);
  addProp(props, hall, InteriorPropType.SCALE, 'Balance scale', clampToRoom(hall, [hall.center[0] - 0.4, 0.85, hall.center[2] - hall.size[2] / 2 + 0.85]));
  addProp(props, hall, InteriorPropType.LEDGER, 'Account ledger', clampToRoom(hall, [hall.center[0] + 0.4, 0.85, hall.center[2] - hall.size[2] / 2 + 0.85]));
  if (profLower.includes('weaver') || profLower.includes('textile') || profLower.includes('draper')) {
    addProp(props, hall, InteriorPropType.LOOM, 'Weaving loom', clampToRoom(hall, wallAnchor(hall, 'north', 0.8, 0)));
    addProp(props, hall, InteriorPropType.BOLT_OF_CLOTH, 'Dyed cloth bolts', clampToRoom(hall, wallAnchor(hall, 'north', 0.7, 1.6)), [0, Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.SPINDLE, 'Spinning spindle', clampToRoom(hall, wallAnchor(hall, 'west', 0.9, -1.2)));
    addProp(props, hall, InteriorPropType.DYE_VAT, 'Dye vat', clampToRoom(hall, wallAnchor(hall, 'east', 0.9, 1.0)));
  }
  if (profLower.includes('spice') || profLower.includes('apothecary') || profLower.includes('perfume')) {
    addProp(props, hall, InteriorPropType.BASKET, 'Spice baskets', clampToRoom(hall, wallAnchor(hall, 'east', 0.8, 0.6)), [0, Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.TRAY, 'Spice tray', clampToRoom(hall, wallAnchor(hall, 'west', 0.8, -0.4)), [0, -Math.PI / 2, 0]);
    addProp(props, hall, InteriorPropType.MORTAR, 'Mortar & pestle', clampToRoom(hall, [hall.center[0], 0.82, hall.center[2] - hall.size[2] / 2 + 0.9]));
    addProp(props, hall, InteriorPropType.HERB_RACK, 'Herb rack', clampToRoom(hall, wallAnchor(hall, 'north', 0.7, -1.0)));
  }
  if (profLower.includes('smith') || profLower.includes('blacksmith') || profLower.includes('armorer')) {
    addProp(props, hall, InteriorPropType.ANVIL, 'Anvil', clampToRoom(hall, [hall.center[0] + 0.6, 0, hall.center[2] - 0.4]));
    addProp(props, hall, InteriorPropType.TOOL_RACK, 'Tool rack', clampToRoom(hall, wallAnchor(hall, 'north', 0.7, 1.2)));
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

  const wallAligned = () => {
    if (wallPick === 0) {
      return { position: adjustForDoor([cx + wallOffset(), 0, cz - halfD + wallInset]), rotation: [0, 0, 0] };
    }
    if (wallPick === 1) {
      return { position: adjustForDoor([cx + wallOffset(), 0, cz + halfD - wallInset]), rotation: [0, Math.PI, 0] };
    }
    if (wallPick === 2) {
      return { position: adjustForDoor([cx - halfW + wallInset, 0, cz + wallZOffset()]), rotation: [0, Math.PI / 2, 0] };
    }
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

  if (buildingType === BuildingType.COMMERCIAL) {
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
  if (buildingType === BuildingType.CIVIC || profLower.includes('scribe')) {
    extraTemplates.push(
      { room: [InteriorRoomType.HALL, InteriorRoomType.WORKSHOP], type: InteriorPropType.DESK, label: 'Writing desk' },
      { room: [InteriorRoomType.HALL, InteriorRoomType.WORKSHOP], type: InteriorPropType.BOOKS, label: 'Ledgers' },
      { room: [InteriorRoomType.HALL], type: InteriorPropType.CHAIR, label: 'Carved chair', minClass: SocialClass.MERCHANT },
    );
  }
  if (buildingType === BuildingType.COMMERCIAL) {
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
        { room: [InteriorRoomType.HALL], type: InteriorPropType.BOLT_OF_CLOTH, label: 'Bolts of cloth', minClass: SocialClass.MERCHANT },
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
      const clamped = clampToRoom(room, placement.position);
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
      props.push({
        id: `prop-rug-${hall.id}`,
        type: InteriorPropType.RUG,
        roomId: hall.id,
        position: placement.position,
        rotation: placement.rotation,
        scale: [1, 1, 1],
        label: 'Knotted rug',
      });
    }
  }

  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.HALL) {
      const hasTable = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
      if (!hasTable) {
        const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
        const placement = placePropPosition(InteriorPropType.LOW_TABLE, room, rand, avoidSide);
        const clamped = clampToRoom(room, placement.position);
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
        const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
        const placement = placePropPosition(InteriorPropType.LOW_TABLE, room, rand, avoidSide);
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
        const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
        const placement = placePropPosition(InteriorPropType.BEDROLL, room, rand, avoidSide);
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
        const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
        const placement = placePropPosition(InteriorPropType.DESK, room, rand, avoidSide);
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
        const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
        const placement = placePropPosition(InteriorPropType.WATER_BASIN, room, rand, avoidSide);
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
      kept.position = [room.center[0], 0, room.center[2]];
    }
  });

  // Add table candles.
  rooms.forEach((room) => {
    const tables = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.LOW_TABLE);
    if (tables.length === 0) return;
    const existingCandles = props.filter((prop) => prop.roomId === room.id && prop.type === InteriorPropType.CANDLE);
    const maxCandles = socialClass === SocialClass.NOBILITY ? 2 : socialClass === SocialClass.MERCHANT ? 1 : 0;
    if (existingCandles.length >= maxCandles) return;
    const table = tables[Math.floor(rand() * tables.length)];
    props.push({
      id: `prop-candle-${room.id}-${existingCandles.length}`,
      type: InteriorPropType.CANDLE,
      roomId: room.id,
      position: [table.position[0], 0.45, table.position[2]],
      rotation: [0, rand() * Math.PI * 2, 0],
      scale: [1, 1, 1],
      label: 'Beeswax candle',
    });
  });

  // Add floor lamps in larger rooms lacking light sources.
  rooms.forEach((room) => {
    const hasLight = props.some((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.BRAZIER || prop.type === InteriorPropType.FIRE_PIT || prop.type === InteriorPropType.FLOOR_LAMP
    ));
    if (hasLight) return;
    const shouldStand = socialClass !== SocialClass.PEASANT && (room.size[0] > 12 || room.size[2] > 12);
    const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
    const placement = placePropPosition(shouldStand ? InteriorPropType.FLOOR_LAMP : InteriorPropType.LAMP, room, rand, avoidSide);
    const clamped = clampToRoom(room, placement.position);
    props.push({
      id: `prop-floor-lamp-${room.id}`,
      type: shouldStand ? InteriorPropType.FLOOR_LAMP : InteriorPropType.LAMP,
      roomId: room.id,
      position: clamped,
      rotation: placement.rotation,
      scale: [1, 1, 1],
      label: shouldStand ? 'Oil floor lamp' : 'Oil lamp',
    });
  });

  // Add extra lamps for non-peasant rooms to lift night visibility.
  rooms.forEach((room) => {
    if (socialClass === SocialClass.PEASANT) return;
    const lampCount = props.filter((prop) => prop.roomId === room.id && (
      prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.FLOOR_LAMP
    )).length;
    if (lampCount >= 2) return;
    const avoidSide = room.type === InteriorRoomType.ENTRY ? entrySide : undefined;
    const placement = placePropPosition(InteriorPropType.LAMP, room, rand, avoidSide);
    const clamped = clampToRoom(room, placement.position);
    props.push({
      id: `prop-lamp-extra-${room.id}-${lampCount}`,
      type: InteriorPropType.LAMP,
      roomId: room.id,
      position: clamped,
      rotation: placement.rotation,
      scale: [1, 1, 1],
      label: 'Oil lamp',
    });
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
  const isCommercial = buildingType === BuildingType.COMMERCIAL || profLower.includes('merchant') || profLower.includes('shop');
  const oppositeSide = (side: 'north' | 'south' | 'east' | 'west') => {
    if (side === 'north') return 'south';
    if (side === 'south') return 'north';
    if (side === 'east') return 'west';
    return 'east';
  };
  const clampToRoom = (room: InteriorRoom, pos: [number, number, number]): [number, number, number] => {
    const [cx, , cz] = room.center;
    const halfW = room.size[0] / 2 - 0.6;
    const halfD = room.size[2] / 2 - 0.6;
    return [
      Math.max(cx - halfW, Math.min(cx + halfW, pos[0])),
      pos[1],
      Math.max(cz - halfD, Math.min(cz + halfD, pos[2]))
    ];
  };
  rooms.forEach((room) => {
    if (room.type === InteriorRoomType.ENTRY) {
      const safeSide = oppositeSide(entrySide);
      upsertProp(props, room, InteriorPropType.FLOOR_MAT, 'Woven floor mat', clampToRoom(room, wallAnchor(room, safeSide, 1.4, 0)));
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchor(room, safeSide, 0.8, -0.8)));
      upsertProp(props, room, InteriorPropType.LAMP, 'Oil lamp', clampToRoom(room, wallAnchor(room, safeSide, 0.8, 0.6)));
      return;
    }
    if (room.type === InteriorRoomType.PRIVATE) {
      upsertProp(props, room, InteriorPropType.BEDROLL, 'Sleeping pallet', clampToRoom(room, wallAnchor(room, 'south', 0.9, 0)));
      upsertProp(props, room, InteriorPropType.CHEST, 'Storage chest', clampToRoom(room, wallAnchor(room, 'east', 0.8, -0.6)));
      upsertProp(props, room, InteriorPropType.PRAYER_RUG, 'Prayer rug', clampToRoom(room, [room.center[0], 0, room.center[2]]));
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.WALL_HANGING, 'Wall hanging', clampToRoom(room, wallAnchor(room, 'north', 0.2, 0)));
      }
      return;
    }
    if (room.type === InteriorRoomType.WORKSHOP) {
      upsertProp(props, room, InteriorPropType.DESK, 'Work desk', clampToRoom(room, wallAnchor(room, 'north', 0.9, 0)));
      upsertProp(props, room, InteriorPropType.CHAIR, 'Work chair', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 2.0]), [0, 0, 0]);
      upsertProp(props, room, InteriorPropType.BOOKS, 'Manuscripts', clampToRoom(room, [room.center[0], 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.INK_SET, 'Ink set', clampToRoom(room, [room.center[0] + 0.4, 0, room.center[2] - room.size[2] / 2 + 1.8]));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchor(room, 'west', 0.7, -0.4)));
      return;
    }
    if (room.type === InteriorRoomType.STORAGE) {
      upsertProp(props, room, InteriorPropType.CRATE, 'Stacked crates', clampToRoom(room, wallAnchor(room, 'east', 0.9, 0.6)));
      upsertProp(props, room, InteriorPropType.AMPHORA, 'Amphorae', clampToRoom(room, wallAnchor(room, 'south', 0.8, -0.6)));
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
      if (isCommercial) {
        const counterSide = oppositeSide(entrySide);
        upsertProp(props, room, InteriorPropType.COUNTER, 'Sales counter', clampToRoom(room, wallAnchor(room, counterSide, 1.6, 0)));
        const displaySide = entrySide === 'east' || entrySide === 'west'
          ? (entrySide === 'east' ? 'north' : 'south')
          : (entrySide === 'north' ? 'east' : 'west');
        upsertProp(props, room, InteriorPropType.DISPLAY, 'Display shelf', clampToRoom(room, wallAnchor(room, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4)), [0, displaySide === 'east' ? -Math.PI / 2 : Math.PI / 2, 0]);
        upsertProp(props, room, InteriorPropType.SCALE, 'Balance scale', clampToRoom(room, [room.center[0] - 0.4, 0, room.center[2] - room.size[2] / 2 + 0.9]));
        upsertProp(props, room, InteriorPropType.LEDGER, 'Account ledger', clampToRoom(room, [room.center[0] + 0.4, 0, room.center[2] - room.size[2] / 2 + 0.9]));
        upsertProp(props, room, InteriorPropType.BASKET, 'Market baskets', clampToRoom(room, wallAnchor(room, 'west', 0.8, 1.2)));
        return;
      }
      upsertProp(props, room, InteriorPropType.FIRE_PIT, 'Cooking hearth', clampToRoom(room, [room.center[0], 0, room.center[2] + 0.6]));
      upsertProp(props, room, InteriorPropType.WATER_BASIN, 'Water basin', clampToRoom(room, wallAnchor(room, 'east', 0.9, -0.8)));
      upsertProp(props, room, InteriorPropType.EWER, 'Water ewer', clampToRoom(room, wallAnchor(room, 'east', 0.8, -0.4)));
      upsertProp(props, room, InteriorPropType.SHELF, 'Wall shelf', clampToRoom(room, wallAnchor(room, 'north', 0.7, 0)));
      if (socialClass !== SocialClass.PEASANT) {
        upsertProp(props, room, InteriorPropType.RUG, 'Wool rug', clampToRoom(room, [room.center[0], 0, room.center[2] - 0.8]));
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
      const dx = adjusted[0] - prop.position[0];
      const dz = adjusted[2] - prop.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist < 0.8) {
        const push = 0.9 - dist;
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
  if (building.type === BuildingType.COMMERCIAL) {
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
  overrides?: InteriorOverrides
): InteriorSpec => {
  let s = seed;
  const socialClass = inferSocialClass(building);
  const profession = building.ownerProfession;
  const sizeScale = building.sizeScale ?? 1;
  const profLower = profession.toLowerCase();
  const isCommercial = building.type === BuildingType.COMMERCIAL;
  const isInnLike = isCommercial && (profLower.includes('inn') || profLower.includes('sherbet'));
  const isCaravan = isCommercial && (profLower.includes('khan') || profLower.includes('caravanserai'));
  const isShopStall = isCommercial && !isInnLike && !isCaravan && sizeScale <= 1.1;
  let baseRoomTypes = overrides?.roomTypes ?? defaultRoomTypes(socialClass, profession, building.type);
  if (isShopStall) {
    baseRoomTypes = [InteriorRoomType.ENTRY];
  } else if (!isCommercial && building.type !== BuildingType.CIVIC && building.type !== BuildingType.RELIGIOUS) {
    if (socialClass !== SocialClass.NOBILITY && sizeScale <= 1.1) {
      baseRoomTypes = [InteriorRoomType.ENTRY];
    }
  }
  if (sizeScale < 0.9) {
    baseRoomTypes = baseRoomTypes.slice(0, 1);
  } else if (sizeScale < 1.05) {
    baseRoomTypes = baseRoomTypes.slice(0, Math.min(2, baseRoomTypes.length));
  }
  const roomCount = overrides?.roomCount ?? baseRoomTypes.length;
  let size = resolveRoomSize(socialClass, sizeScale, building.type);
  if (isShopStall) {
    size = Math.max(8, size * 0.8);
  }

  const entrySide = building.doorSide === 0 ? 'north' : building.doorSide === 1 ? 'south' : building.doorSide === 2 ? 'east' : 'west';
  const rooms = placeRooms(s, baseRoomTypes.slice(0, roomCount), size);
  s += 50;
  const props = pickProps(rooms, socialClass, building.type, profession, s, entrySide);
  applyRoomLayouts(props, rooms, building.type, profession, socialClass, s + 31, entrySide);
  s += 80;
  const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? rooms[0];
  const hasLightSource = props.some((prop) => prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.BRAZIER);
  const wallHeight = Math.max(3.0, Math.min(5.2, 3.1 + sizeScale * 0.9 + (building.type === BuildingType.CIVIC || building.type === BuildingType.RELIGIOUS ? 0.4 : 0)));
  const ladderSide: 'north' | 'south' | 'east' | 'west' = entrySide === 'north' || entrySide === 'south' ? 'east' : 'north';
  const isMultiStory = (building.sizeScale ?? 1) > 1.15 || building.type === BuildingType.CIVIC || building.type === BuildingType.RELIGIOUS;
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

  if (overrides?.extraNPCs) {
    overrides.extraNPCs.forEach((extra, index) => {
      const stats = extra.stats ?? generateNPCStats(seed + 101 + index);
      npcs.push({
        id: extra.id ?? `npc-extra-${index}`,
        role: extra.role,
        position: extra.position ?? [0, 0, 0],
        rotation: extra.rotation ?? [0, 0, 0],
        stats,
      });
    });
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
    ) {
      return;
    }
    const radius = prop.type === InteriorPropType.COUNTER
      ? 1.4
      : prop.type === InteriorPropType.DISPLAY
        ? 1.1
        : prop.type === InteriorPropType.BENCH
          ? 1.0
          : prop.type === InteriorPropType.LOW_TABLE
            ? 0.8
            : 0.6;
    obstacles.push({ position: prop.position, radius });
  });

  return obstacles;
};
