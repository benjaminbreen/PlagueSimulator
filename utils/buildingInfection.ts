import { AgentState, BuildingInfectionState, BuildingMetadata, BuildingType } from '../types';

const STATUS_PRIORITY: Array<BuildingInfectionState['status']> = ['clear', 'incubating', 'infected', 'deceased'];

const pickStatus = (current: BuildingInfectionState['status'], next: BuildingInfectionState['status']) => {
  return STATUS_PRIORITY.indexOf(next) > STATUS_PRIORITY.indexOf(current) ? next : current;
};

const decayHoursForStatus = (status: BuildingInfectionState['status'], buildingType: BuildingType) => {
  let base = 0;
  if (status === 'deceased') base = 12;
  if (status === 'infected') base = 8;
  if (status === 'incubating') base = 6;
  if (base === 0) return 0;
  if (buildingType === BuildingType.RELIGIOUS || buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL) return base * 2;
  if (buildingType === BuildingType.COMMERCIAL || buildingType === BuildingType.HOSPITALITY) return base * 1.5;
  return base;
};

export const updateBuildingInfections = (
  buildings: BuildingMetadata[],
  npcMap: Map<string, { state: AgentState; homeBuildingId: string | null; location: 'outdoor' | 'interior' }>,
  previous: Map<string, BuildingInfectionState>,
  simTime: number
) => {
  const nextMap = new Map<string, BuildingInfectionState>();
  const buildingIds = new Set(buildings.map((b) => b.id));
  const interiorStatusByBuilding = new Map<string, BuildingInfectionState['status']>();

  npcMap.forEach((record) => {
    if (record.location !== 'interior' || !record.homeBuildingId) return;
    const existing = interiorStatusByBuilding.get(record.homeBuildingId) ?? 'clear';
    if (record.state === AgentState.DECEASED) {
      interiorStatusByBuilding.set(record.homeBuildingId, pickStatus(existing, 'deceased'));
    } else if (record.state === AgentState.INFECTED) {
      interiorStatusByBuilding.set(record.homeBuildingId, pickStatus(existing, 'infected'));
    } else if (record.state === AgentState.INCUBATING) {
      interiorStatusByBuilding.set(record.homeBuildingId, pickStatus(existing, 'incubating'));
    }
  });

  buildings.forEach((building) => {
    const status = interiorStatusByBuilding.get(building.id) ?? 'clear';

    const prev = previous.get(building.id);
    if (status === 'clear' && prev && prev.status !== 'clear') {
      const decay = decayHoursForStatus(prev.status, building.type);
      if (simTime - prev.lastSeenSimTime < decay) {
        nextMap.set(building.id, prev);
        return;
      }
    }

    nextMap.set(building.id, {
      status,
      lastSeenSimTime: status === 'clear' ? (prev?.lastSeenSimTime ?? simTime) : simTime
    });
  });

  // Carry forward any previous infections for buildings that vanished to avoid hard resets.
  previous.forEach((state, id) => {
    if (!buildingIds.has(id) && state.status !== 'clear') {
      nextMap.set(id, state);
    }
  });

  return nextMap;
};
