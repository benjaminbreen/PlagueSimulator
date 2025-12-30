import { BuildingMetadata, BuildingType, DistrictType, PlayerStats, SimulationParams } from '../types';

interface ObserveContextInput {
  player: PlayerStats;
  params: SimulationParams;
  district: DistrictType;
  biome: string;
  weather: string;
  sceneMode: 'outdoor' | 'interior';
  interiorInfo: string | null;
  nearbyBuildings: BuildingMetadata[];
}

const buildingLabel = (type: BuildingType) => {
  switch (type) {
    case BuildingType.RESIDENTIAL: return 'residence';
    case BuildingType.COMMERCIAL: return 'shop';
    case BuildingType.RELIGIOUS: return 'mosque';
    case BuildingType.PUBLIC: return 'public hall';
    case BuildingType.MARKET: return 'market stall';
    case BuildingType.MEDICAL: return 'healer';
    case BuildingType.SCHOOL: return 'madrasa';
    default: return 'building';
  }
};

const timeOfDayLabel = (hour: number) => {
  if (hour >= 5 && hour < 8) return 'early morning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'midday';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 20) return 'dusk';
  if (hour >= 20 && hour < 23) return 'night';
  return 'deep night';
};

export const buildObservePrompt = (input: ObserveContextInput) => {
  const { player, params, district, biome, weather, sceneMode, interiorInfo, nearbyBuildings } = input;
  const buildingSnippets = nearbyBuildings
    .slice(0, 4)
    .map((building) => {
      const owner = building.ownerName ? ` of ${building.ownerName}` : '';
      return `${buildingLabel(building.type)}${owner}`;
    });
  const buildingLine = buildingSnippets.length > 0 ? `Nearby: ${buildingSnippets.join(', ')}.` : 'No nearby buildings stand out.';

  return [
    'You are describing a scene in an educational history simulation set in Damascus, 1348.',
    'Strict historical accuracy and gritty realism are required.',
    'Write 3 to 5 simple, grounded sentences. Each sentence must be its own line.',
    'Vary sentence length and structure: mix short, medium, and one longer sentence.',
    'Voice: straightforward, observant, and concrete. Avoid lyrical flourish or overt narration.',
    'Use sensory details and specific objects. Avoid repeating the same opening structure.',
    'Present tense. No bullets, no quotes, no list markers, no dialogue, no stage directions.',
    'Avoid modern terms. Do not mention being an AI or a game.',
    '',
    `Perspective: ${player.name}, ${player.age}-year-old ${player.gender.toLowerCase()} ${player.profession.toLowerCase()}, ${player.socialClass.toLowerCase()}.`,
    `Health: ${player.healthStatus}. Plague state: ${player.plague?.state ?? 'unknown'}.`,
    `Location: ${district.toLowerCase()} district (${biome.toLowerCase()}).`,
    `Scene: ${sceneMode === 'interior' ? 'inside' : 'outdoors'}.`,
    interiorInfo ? `Interior: ${interiorInfo}` : '',
    `Time: ${timeOfDayLabel(params.timeOfDay)} (${params.timeOfDay.toFixed(1)}h). Weather: ${weather}.`,
    buildingLine
  ]
    .filter(Boolean)
    .join('\n');
};
