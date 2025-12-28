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
  if (buildingType === BuildingType.RELIGIOUS || buildingType === BuildingType.CIVIC) return base * 2;
  if (buildingType === BuildingType.COMMERCIAL) return base * 1.5;
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

  buildings.forEach((building) => {
    let status: BuildingInfectionState['status'] = 'clear';
    npcMap.forEach((record) => {
      if (record.homeBuildingId !== building.id || record.location !== 'interior') return;
      if (record.state === AgentState.DECEASED) status = pickStatus(status, 'deceased');
      else if (record.state === AgentState.INFECTED) status = pickStatus(status, 'infected');
      else if (record.state === AgentState.INCUBATING) status = pickStatus(status, 'incubating');
    });

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
