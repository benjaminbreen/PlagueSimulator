import { AgentState, BuildingMetadata, BuildingType, DistrictType, NPCRecord, NPCStats, SocialClass, PlagueType } from '../types';
import { seedNpcInfection, seedNpcInfectedNearDeath } from './npcHealth';
import { generateNPCStats, seededRandom } from './procedural';

export const getTileKey = (mapX: number, mapY: number) => `${mapX},${mapY}`;

export const hashToSeed = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const buildResidentStats = (seed: number, building: BuildingMetadata, socialClass: SocialClass, districtType: DistrictType, genderOverride?: NPCStats['gender']) => {
  const stats = generateNPCStats(seed, { districtType });
  stats.name = building.ownerName;
  stats.profession = building.ownerProfession;
  stats.gender = genderOverride ?? building.ownerGender;
  stats.socialClass = socialClass;
  return stats;
};

const sampleRing = (seed: number, minR: number, maxR: number) => {
  const rand = () => seededRandom(seed++);
  const angle = rand() * Math.PI * 2;
  const radius = minR + rand() * (maxR - minR);
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number];
};

const createBuildingNPCRecords = (
  building: BuildingMetadata,
  districtType: DistrictType,
  simTime: number
): NPCRecord[] => {
  const seed = hashToSeed(building.id);
  const socialClass = building.type === BuildingType.RELIGIOUS
    ? SocialClass.CLERGY
    : building.type === BuildingType.CIVIC
      ? SocialClass.MERCHANT
      : building.type === BuildingType.COMMERCIAL
        ? SocialClass.MERCHANT
        : SocialClass.PEASANT;
  const ownerStats = buildResidentStats(seed + 11, building, socialClass, districtType);
  const baseRecord = (id: string, stats: NPCStats, role: string): NPCRecord => {
    stats.id = id;
    return {
      id,
      stats,
      state: AgentState.HEALTHY,
      stateStartTime: simTime,
      plagueMeta: {
        plagueType: PlagueType.NONE,
        exposureTime: null,
        incubationHours: null,
        deathHours: null,
        onsetTime: null
      },
      location: 'outdoor',
      homeBuildingId: building.id,
      lastOutdoorPos: sampleRing(seed + id.length * 17, 10, 30),
      scheduleSeed: seed + id.length * 97,
      lastUpdateSimTime: simTime,
      isEphemeral: false,
      role,
      districtType
    };
  };

  const records: NPCRecord[] = [
    baseRecord(`npc-owner-${building.id}`, ownerStats, 'owner')
  ];

  const guestChance = seededRandom(seed + 29);
  if (building.type !== BuildingType.RELIGIOUS && guestChance > 0.6) {
    const guestStats = generateNPCStats(seed + 29, { districtType });
    records.push(baseRecord(`npc-guest-${building.id}`, guestStats, guestChance > 0.8 ? 'servant' : 'guest'));
  }

  if (building.type === BuildingType.RELIGIOUS) {
    const worshippers = 3 + Math.floor(seededRandom(seed + 50) * 4);
    for (let i = 0; i < worshippers; i += 1) {
      const worshipperStats = generateNPCStats(seed + 50 + i * 7, { districtType });
      records.push(baseRecord(`npc-worshipper-${building.id}-${i}`, worshipperStats, 'worshipper'));
    }
  }

  return records;
};

const createStreetNPCRecords = (
  tileSeed: number,
  districtType: DistrictType,
  simTime: number,
  count: number
): NPCRecord[] => {
  const records: NPCRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const stats = generateNPCStats(tileSeed + i * 1337, { districtType });
    const id = `npc-street-${tileSeed}-${i}`;
    stats.id = id;
    records.push({
      id,
      stats,
      state: AgentState.HEALTHY,
      stateStartTime: simTime,
      plagueMeta: {
        plagueType: PlagueType.NONE,
        exposureTime: null,
        incubationHours: null,
        deathHours: null,
        onsetTime: null
      },
      location: 'outdoor',
      homeBuildingId: null,
      lastOutdoorPos: sampleRing(tileSeed + i * 19, 8, 32),
      scheduleSeed: tileSeed + i * 83,
      lastUpdateSimTime: simTime,
      isEphemeral: false,
      role: 'street',
      districtType
    });
  }
  return records;
};

export const createTileNPCRegistry = (
  buildings: BuildingMetadata[],
  districtType: DistrictType,
  simTime: number,
  tileSeed: number,
  streetCount: number
) => {
  const npcMap = new Map<string, NPCRecord>();
  buildings.forEach((building) => {
    const records = createBuildingNPCRecords(building, districtType, simTime);
    records.forEach((record) => npcMap.set(record.id, record));
  });

  createStreetNPCRecords(tileSeed, districtType, simTime, streetCount).forEach((record) => {
    npcMap.set(record.id, record);
  });

  // Seed initial incubating cases once at the start of a playthrough.
  // Uses deterministic seeded RNG for reproducibility
  if (simTime <= 0.1 && npcMap.size > 0) {
    const ids = Array.from(npcMap.keys());
    let rngSeed = tileSeed + 99999; // Offset to avoid collision with other seeded values
    const rand = () => seededRandom(rngSeed++);

    // Separate building residents from street NPCs
    const buildingResidentIds = ids.filter(id => {
      const record = npcMap.get(id);
      return record?.homeBuildingId !== null;
    });
    const streetNpcIds = ids.filter(id => {
      const record = npcMap.get(id);
      return record?.homeBuildingId === null;
    });

    // Fisher-Yates shuffle to randomly order IDs without splice mutation issues
    for (let i = buildingResidentIds.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [buildingResidentIds[i], buildingResidentIds[j]] = [buildingResidentIds[j], buildingResidentIds[i]];
    }

    // Always start with at least one infected building by infecting a building resident
    // and placing them inside their home
    if (buildingResidentIds.length > 0) {
      const firstInfectedId = buildingResidentIds[0];
      const record = npcMap.get(firstInfectedId);
      if (record) {
        seedNpcInfectedNearDeath(record, simTime);
        record.location = 'interior'; // Ensure they start inside so building is marked infected
      }
    }

    // Seed additional infected NPCs (can be street or building NPCs)
    const allShuffledIds = [...buildingResidentIds.slice(1), ...streetNpcIds];
    for (let i = allShuffledIds.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [allShuffledIds[i], allShuffledIds[j]] = [allShuffledIds[j], allShuffledIds[i]];
    }

    const additionalInfectedCount = Math.min(allShuffledIds.length, Math.floor(rand() * 2));
    for (let i = 0; i < additionalInfectedCount; i += 1) {
      const id = allShuffledIds[i];
      const record = npcMap.get(id);
      if (!record) continue;
      seedNpcInfectedNearDeath(record, simTime);
    }

    // Seed incubating cases from remaining NPCs
    const remainingIds = allShuffledIds.slice(additionalInfectedCount);
    const incubatingCount = Math.min(remainingIds.length, 1 + Math.floor(rand() * 4));
    for (let i = 0; i < incubatingCount; i += 1) {
      const id = remainingIds[i];
      const record = npcMap.get(id);
      if (!record) continue;
      seedNpcInfection(record, simTime);
    }
  }

  return {
    npcMap,
    lastScheduleSimTime: simTime
  };
};
