export interface NarratorContextItem {
  label: string;
  direction: string;
  distance: number;
  detail?: string;
  id?: string;
  kind?: 'npc' | 'family' | 'merchant' | 'special' | 'building' | 'object' | 'interior-npc' | 'interior-prop';
  position?: [number, number, number];
}

export interface NarratorContext {
  sceneMode: 'outdoor' | 'interior';
  mapX: number;
  mapY: number;
  simTime: number;
  district: string;
  locationLabel: string;
  nearbyDistricts?: Array<{
    direction: string;
    district: string;
    biome: string;
    locationLabel: string;
    mapX: number;
    mapY: number;
  }>;
  timeOfDay: number;
  weather: string;
  player: {
    name: string;
    profession: string;
    socialClass: string;
    healthStatus: string;
    plagueState: string;
    wealth: number;
    reputation: number;
    currency: number;
    symptoms: string[];
    activeProtections: string[];
    recentRemedies: string[];
  };
  currentTask?: string | null;
  nearbyBuildings: NarratorContextItem[];
  nearbyNpcs: NarratorContextItem[];
  nearbyObjects: NarratorContextItem[];
  interiorInfo?: string | null;
  recentExchanges?: Array<{ player: string; narrator: string }>;
}

const formatItems = (items: NarratorContextItem[], emptyLabel: string) => {
  if (items.length === 0) return emptyLabel;
  return items
    .map((item) => {
      const detail = item.detail ? ` (${item.detail})` : '';
      return `${item.label}${detail} to the ${item.direction} (${item.distance.toFixed(1)}m)`;
    })
    .join('; ');
};

const describeWealth = (wealth: number) => {
  if (wealth >= 80) return 'comfortably provided for';
  if (wealth >= 60) return 'modestly well-off';
  if (wealth >= 40) return 'getting by';
  if (wealth >= 20) return 'scraping by';
  return 'near destitution';
};

const describeReputation = (reputation: number) => {
  if (reputation >= 80) return 'well regarded';
  if (reputation >= 60) return 'respected';
  if (reputation >= 40) return 'known, neither celebrated nor shunned';
  if (reputation >= 20) return 'kept at a distance';
  return 'spoken of with suspicion';
};

const describePlagueState = (state: string | undefined | null) => {
  const normalized = String(state ?? '').toLowerCase();
  if (normalized === 'infected') return 'you feel a quiet dread under the skin';
  if (normalized === 'incubating') return 'a vague unease sits behind the ribs';
  if (normalized === 'symptomatic') return 'the illness makes itself known in small, stubborn ways';
  if (normalized === 'recovering') return 'your body feels tired but steadier than before';
  if (normalized === 'deceased') return 'no living breath remains';
  return 'your body feels ordinary for the moment';
};

export const buildNarratorPrompt = (question: string, context: NarratorContext) => {
  const { player, sceneMode, district, locationLabel, timeOfDay, weather, interiorInfo, nearbyBuildings, nearbyNpcs, nearbyObjects, nearbyDistricts, currentTask } = context;
  const buildingLine = formatItems(nearbyBuildings, 'No notable buildings are within view.');
  const npcLine = formatItems(nearbyNpcs, 'No nearby figures are clearly visible.');
  const objectLine = formatItems(nearbyObjects, 'No notable objects are within arm\'s reach.');
  const wealthNote = describeWealth(player.wealth);
  const reputationNote = describeReputation(player.reputation);
  const plagueNote = describePlagueState(player.plagueState);
  const exchangeLines = (context.recentExchanges ?? [])
    .slice(-5)
    .flatMap((entry) => [`Player: ${entry.player}`, `Narrator: ${entry.narrator}`]);
  const districtLine = nearbyDistricts && nearbyDistricts.length > 0
    ? nearbyDistricts
        .map((entry) => `${entry.direction}: ${entry.locationLabel} (${entry.district}, ${entry.biome})`)
        .join('; ')
    : 'No adjacent districts are known.';

  return [
    'You are the omniscient narrator for a historically grounded Damascus, 1348 simulation, a plague simulator educational game designed by a professional historian who loves Hilary Mantel type high quality historical fiction.',
    'Write in second-person present tense. Tone: restrained, grounded, and observant (Bleak House), never faux-lyrical or cliched.',
    'Match the answer to the question type: if it is philosophical, be probing and thoughtful; if it is practical, be succinct and factual.',
    'Aim to answer using primarily SCENE DATA; do not invent people, trades, or objects not listed.',
    'Do not mention numeric stats or labels; paraphrase them into natural observation.',
    'Length: 2-4 sentences. No stage directions. No cliches. If the player asks for a list (of anything!) give it to them.',
    'Use relative directions when referencing items (north, northeast, etc.).',
    'If the question touches on bodily state, reflect it in plain sensations (fatigue, chill, ache) without clinical terms. Be creative with how you describe reputation and health, make it like a real narrator.',
    'Keep continuity with the recent exchanges; do not contradict the narrator\'s own statements unless correcting a clear mistake.',
    '',
    `Player input: ${question}`,
    ...(exchangeLines.length > 0 ? ['', 'Recent exchanges (most recent last):', ...exchangeLines] : []),
    '',
    'SCENE DATA',
    `Location: ${locationLabel} (${district}). Mode: ${sceneMode}.`,
    interiorInfo ? `Interior: ${interiorInfo}.` : '',
    `Time: ${timeOfDay.toFixed(1)}h. Weather: ${weather}.`,
    `Player: ${player.name}, ${player.profession}, ${player.socialClass}. Health: ${player.healthStatus}.`,
    `Condition: ${plagueNote}. Standing: ${reputationNote}. Means: ${wealthNote}.`,
    player.symptoms.length > 0 ? `Symptoms: ${player.symptoms.join('; ')}` : '',
    player.activeProtections.length > 0 ? `Protective measures in effect: ${player.activeProtections.join('; ')}` : '',
    player.recentRemedies.length > 0 ? `Recent remedies: ${player.recentRemedies.join('; ')}` : '',
    currentTask ? `Current task: ${currentTask}` : '',
    `Nearby districts: ${districtLine}`,
    `Nearby buildings: ${buildingLine}`,
    `Nearby figures: ${npcLine}`,
    `Nearby objects: ${objectLine}`
  ]
    .filter(Boolean)
    .join('\n');
};
