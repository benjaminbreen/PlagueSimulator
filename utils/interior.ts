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

const defaultRoomTypes = (socialClass: SocialClass, profession: string): InteriorRoomType[] => {
  const types: InteriorRoomType[] = [InteriorRoomType.ENTRY];
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

const pickProps = (rooms: InteriorRoom[], socialClass: SocialClass, seed: number): InteriorProp[] => {
  let s = seed;
  const rand = () => seededRandom(s++);
  const props: InteriorProp[] = [];
  const budget = Math.max(roomPropBudget(socialClass), rooms.length * 5);

  rooms.forEach((room) => {
    const candidates = propTemplates.filter((template) => template.room.includes(room.type) && (!template.minClass || socialClass === template.minClass || socialClass === SocialClass.NOBILITY));
    const count = Math.min(candidates.length, 5 + Math.floor(rand() * 2));
    for (let i = 0; i < count && props.length < budget; i += 1) {
      const template = candidates[Math.floor(rand() * candidates.length)];
      const margin = 1.2;
      let x = room.center[0] + (rand() - 0.5) * (room.size[0] - margin * 2);
      let z = room.center[2] + (rand() - 0.5) * (room.size[2] - margin * 2);
      if (template.type === InteriorPropType.WALL_HANGING) {
        z = room.center[2] - room.size[2] / 2 + 0.15;
      }
      props.push({
        id: `prop-${room.id}-${props.length}`,
        type: template.type,
        roomId: room.id,
        position: [x, 0, z],
        rotation: [0, rand() * Math.PI * 2, 0],
        scale: [1, 1, 1],
        label: template.label,
      });
    }
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
  const baseRoomTypes = overrides?.roomTypes ?? defaultRoomTypes(socialClass, profession);
  const roomCount = overrides?.roomCount ?? baseRoomTypes.length;
  const size = roomSizeForClass(socialClass);

  const rooms = placeRooms(s, baseRoomTypes.slice(0, roomCount), size);
  s += 50;
  const props = pickProps(rooms, socialClass, s);
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
    const radius = prop.type === InteriorPropType.BENCH ? 1.0 : prop.type === InteriorPropType.LOW_TABLE ? 0.8 : 0.6;
    obstacles.push({ position: prop.position, radius });
  });

  return obstacles;
};
