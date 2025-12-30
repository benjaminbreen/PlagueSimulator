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
    case BuildingType.MEDICAL: return 'clinic';
    case BuildingType.SCHOOL: return 'madrasa';
    case BuildingType.HOSPITALITY: return 'inn';
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
    'Strict historical accuracy and gritty realism are required, also creative brilliance and economy of form. You are a genius.',
    'Write exactly 3 sentences. Each senence its own line.',
    'Aim for close-grained, grounded observation with concrete, specific details.',
    'Vary sentence length and structure; avoid a fixed template. In one sentence you are Hemingway, in another Woolf, in anoher Mann. Never overdo it. At least one senence should be short. Maybe even 2-3 words.',
    'Use only details consistent with the known scene. If uncertain, add small plausible details that fit the setting.',
    'Avoid stock sensory openings like "the air smells..." or "the air hangs..." and avoid scent lists.',
    'Vary syntax: use at least one sentence that begins with a subordinate clause, a participial phrase, or an inversion.',
    'Allow one sentence to be slightly wry or gently observant without being lyrical.',
    'No first or second person. No "I", "you", "we", or "our".',
    'Avoid overt narration or metaphor; keep it plain, precise, and real.',
    'No dialogue or stage directions.',
    'Example tone and structure:',
    'At the shopfront a small brazier is empty, its ash disturbed by a breeze that does not reach the rest of the lane....',
    'A child’s wooden toy has worn a pale track into the dirt where it has been dragged back and forth...',
    'The awning rope is tied in a knot with a frayed tail, and the tail twitches now and again. Beyond the corner the sound changes; it seems more crowded there.',
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
