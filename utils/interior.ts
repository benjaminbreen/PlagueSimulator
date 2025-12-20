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

const addCommercialLayout = (
  props: InteriorProp[],
  rooms: InteriorRoom[],
  profession: string,
  seed: number
) => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const profLower = profession.toLowerCase();
  const hall = rooms.find((room) => room.type === InteriorRoomType.HALL) ?? rooms[0];

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
    addProp(props, hall, InteriorPropType.BRAZIER, 'Charcoal brazier', wallAnchor(hall, 'south', 0.7));
    if (rand() > 0.4) {
      addProp(props, hall, InteriorPropType.BENCH, 'Low bench', wallAnchor(hall, 'east', 0.7, -2.0), [0, Math.PI / 2, 0]);
    }
    if (rand() > 0.3) {
      addProp(props, hall, InteriorPropType.CHAIR, 'Wooden chair', wallAnchor(hall, 'west', 0.7, 1.4), [0, Math.PI / 2, 0]);
    }
    return;
  }

  if (profLower.includes('khan') || profLower.includes('caravanserai')) {
    addProp(props, hall, InteriorPropType.COUNTER, 'Reception counter', wallAnchor(hall, 'south', 0.8));
    return;
  }

  addProp(props, hall, InteriorPropType.COUNTER, 'Sales counter', wallAnchor(hall, 'south', 0.8));
  const displaySide = rand() > 0.5 ? 'east' : 'west';
  addProp(props, hall, InteriorPropType.DISPLAY, 'Display shelf', wallAnchor(hall, displaySide, 0.7, rand() > 0.5 ? 1.4 : -1.4), [0, displaySide === 'east' ? -Math.PI / 2 : Math.PI / 2, 0]);
  addProp(props, hall, InteriorPropType.BASKET, 'Market baskets', [hall.center[0], 0, hall.center[2] - hall.size[2] / 2 + 2.2], [0, rand() * Math.PI, 0]);
  addProp(props, hall, InteriorPropType.BOLT_OF_CLOTH, 'Bolts of cloth', [hall.center[0] + 1.4, 0.75, hall.center[2] - hall.size[2] / 2 + 0.8], [0, 0, 0]);
  addProp(props, hall, InteriorPropType.SCALE, 'Balance scale', [hall.center[0] - 0.4, 0.85, hall.center[2] - hall.size[2] / 2 + 0.85]);
  addProp(props, hall, InteriorPropType.LEDGER, 'Account ledger', [hall.center[0] + 0.4, 0.85, hall.center[2] - hall.size[2] / 2 + 0.85]);
};

const placePropPosition = (
  type: InteriorPropType,
  room: InteriorRoom,
  rand: () => number
): { position: [number, number, number]; rotation: [number, number, number] } => {
  const [cx, , cz] = room.center;
  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;
  const wallInset = 0.6;
  const wallPick = Math.floor(rand() * 4);
  const wallOffset = () => (rand() - 0.5) * (room.size[0] * 0.5);
  const wallZOffset = () => (rand() - 0.5) * (room.size[2] * 0.5);
  const centerOffset = () => (rand() - 0.5) * (Math.min(room.size[0], room.size[2]) * 0.3);

  const wallAligned = () => {
    if (wallPick === 0) {
      return { position: [cx + wallOffset(), 0, cz - halfD + wallInset], rotation: [0, 0, 0] };
    }
    if (wallPick === 1) {
      return { position: [cx + wallOffset(), 0, cz + halfD - wallInset], rotation: [0, Math.PI, 0] };
    }
    if (wallPick === 2) {
      return { position: [cx - halfW + wallInset, 0, cz + wallZOffset()], rotation: [0, Math.PI / 2, 0] };
    }
    return { position: [cx + halfW - wallInset, 0, cz + wallZOffset()], rotation: [0, -Math.PI / 2, 0] };
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
      return wallAligned();
    case InteriorPropType.BASKET:
      return { position: [cx + (rand() - 0.5) * 2, 0, cz + halfD * 0.1], rotation: [0, rand() * Math.PI * 2, 0] };
    case InteriorPropType.TRAY:
    case InteriorPropType.TEA_SET:
    case InteriorPropType.SCALE:
    case InteriorPropType.LEDGER:
      return { position: [cx + (rand() - 0.5) * 2, 0.75, cz + halfD * 0.1], rotation: [0, rand() * Math.PI * 2, 0] };
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
  seed: number
): InteriorProp[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const props: InteriorProp[] = [];
  const budget = Math.max(roomPropBudget(socialClass), rooms.length * 5);
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
    InteriorPropType.HOOKAH,
  ]);

  if (buildingType === BuildingType.COMMERCIAL) {
    addCommercialLayout(props, rooms, profession, seed + 17);
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
    const count = Math.min(candidates.length, 5 + Math.floor(rand() * 2));
    for (let i = 0; i < count && props.length < budget; i += 1) {
      const template = candidates[Math.floor(rand() * candidates.length)];
      const placement = placePropPosition(template.type, room, rand);
      props.push({
        id: `prop-${room.id}-${props.length}`,
        type: template.type,
        roomId: room.id,
        position: placement.position,
        rotation: placement.rotation,
        scale: [1, 1, 1],
        label: template.label,
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
        const placement = placePropPosition(InteriorPropType.LOW_TABLE, room, rand);
        props.push({
          id: `prop-table-${room.id}`,
          type: InteriorPropType.LOW_TABLE,
          roomId: room.id,
          position: placement.position,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Low table',
        });
      }
    }
    if (room.type === InteriorRoomType.PRIVATE) {
      const hasBed = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.BEDROLL);
      if (!hasBed) {
        const placement = placePropPosition(InteriorPropType.BEDROLL, room, rand);
        props.push({
          id: `prop-bed-${room.id}`,
          type: InteriorPropType.BEDROLL,
          roomId: room.id,
          position: placement.position,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Sleeping pallet',
        });
      }
    }
    if (room.type === InteriorRoomType.WORKSHOP) {
      const hasDesk = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.DESK);
      if (!hasDesk) {
        const placement = placePropPosition(InteriorPropType.DESK, room, rand);
        props.push({
          id: `prop-desk-${room.id}`,
          type: InteriorPropType.DESK,
          roomId: room.id,
          position: placement.position,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Work desk',
        });
      }
    }
    if (room.type === InteriorRoomType.COURTYARD) {
      const hasBasin = props.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.WATER_BASIN);
      if (!hasBasin) {
        const placement = placePropPosition(InteriorPropType.WATER_BASIN, room, rand);
        props.push({
          id: `prop-basin-${room.id}`,
          type: InteriorPropType.WATER_BASIN,
          roomId: room.id,
          position: placement.position,
          rotation: placement.rotation,
          scale: [1, 1, 1],
          label: 'Water basin',
        });
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

const createNPCs = (building: BuildingMetadata, socialClass: SocialClass, rooms: InteriorRoom[], seed: number): InteriorNPC[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const npcs: InteriorNPC[] = [];
  const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? rooms[0];
  const entryBase: [number, number, number] = [entryRoom.center[0], 0, entryRoom.center[2]];
  const otherRoom = rooms.find((room) => room.type === InteriorRoomType.HALL || room.type === InteriorRoomType.PRIVATE) ?? entryRoom;
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
  npcs.push({
    id: `npc-owner-${building.id}`,
    role: 'owner',
    position: placeInRoom(otherRoom, 3),
    rotation: [0, rand() * Math.PI * 2, 0],
    stats: ownerStats,
  });

  if (socialClass !== SocialClass.PEASANT && rand() > 0.6) {
    const guestStats: NPCStats = generateNPCStats(seed + 29);
    npcs.push({
      id: `npc-guest-${building.id}`,
      role: rand() > 0.5 ? 'guest' : 'servant',
      position: placeInRoom(entryRoom, 7),
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
  const baseRoomTypes = overrides?.roomTypes ?? defaultRoomTypes(socialClass, profession, building.type);
  const roomCount = overrides?.roomCount ?? baseRoomTypes.length;
  const size = roomSizeForClass(socialClass);

  const rooms = placeRooms(s, baseRoomTypes.slice(0, roomCount), size);
  s += 50;
  const props = pickProps(rooms, socialClass, building.type, profession, s);
  s += 80;
  const entryRoom = rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? rooms[0];
  const hasLightSource = props.some((prop) => prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.BRAZIER);
  const ensureEntryProp = (type: InteriorPropType, label: string, offset: [number, number, number]) => {
    if (props.some((prop) => prop.type === type)) return;
    props.push({
      id: `prop-${type.toLowerCase()}-${building.id}`,
      type,
      roomId: entryRoom.id,
      position: [entryRoom.center[0] + offset[0], 0, entryRoom.center[2] + offset[2]],
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
  const npcs = createNPCs(building, socialClass, rooms, s);

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

export const generateInteriorObstacles = (spec: InteriorSpec): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  const wallSpacing = 1.2;
  const wallRadius = 0.35;

  spec.rooms.forEach((room) => {
    const [x, , z] = room.center;
    const [w, , d] = room.size;
    const halfW = w / 2;
    const halfD = d / 2;
    const stepsX = Math.ceil(w / wallSpacing);
    const stepsZ = Math.ceil(d / wallSpacing);

    for (let i = 0; i <= stepsX; i += 1) {
      const px = x - halfW + (i * w) / stepsX;
      obstacles.push({ position: [px, 0, z - halfD], radius: wallRadius });
      obstacles.push({ position: [px, 0, z + halfD], radius: wallRadius });
    }
    for (let i = 0; i <= stepsZ; i += 1) {
      const pz = z - halfD + (i * d) / stepsZ;
      obstacles.push({ position: [x - halfW, 0, pz], radius: wallRadius });
      obstacles.push({ position: [x + halfW, 0, pz], radius: wallRadius });
    }
  });

  spec.props.forEach((prop) => {
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
