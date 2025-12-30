import { seededRandom } from './procedural';
import {
  DistrictType,
  EventContextSnapshot,
  EventInstance,
  EventDefinition,
  SocialClass
} from '../types';
import { ConversationImpact } from './friendliness';
import { getEventsForBiome, EVENT_CATALOG } from './events/catalog';

const SOCIAL_RANK: Record<SocialClass, number> = {
  [SocialClass.NOBILITY]: 4,
  [SocialClass.CLERGY]: 3,
  [SocialClass.MERCHANT]: 2,
  [SocialClass.PEASANT]: 1
};

export function getBiomeForDistrict(district: DistrictType): 'marketplace' | 'religious' | 'wealthy' | 'hovels' | 'desert' | 'scrubland' | 'farmland' | 'civic' | 'road' | 'gate' {
  switch (district) {
    case 'MARKET':
    case 'CARAVANSERAI':
    case 'SOUQ_AXIS':
      return 'marketplace';
    case 'UMAYYAD_MOSQUE':
    case 'MOUNTAIN_SHRINE':
      return 'religious';
    case 'WEALTHY':
    case 'SALHIYYA':
      return 'wealthy';
    case 'HOVELS':
    case 'JEWISH_QUARTER':
    case 'CHRISTIAN_QUARTER':
      return 'hovels';
    case 'OUTSKIRTS_DESERT':
      return 'desert';
    case 'OUTSKIRTS_SCRUBLAND':
      return 'scrubland';
    case 'OUTSKIRTS_FARMLAND':
      return 'farmland';
    case 'CIVIC':
      return 'civic';
    case 'STRAIGHT_STREET':
    case 'MIDAN':
    case 'SOUTHERN_ROAD':
      return 'road';
    case 'BAB_SHARQI':
      return 'gate';
    default:
      return 'marketplace';
  }
}

function buildInstance(def: EventDefinition, source: EventInstance['source'], context: EventContextSnapshot): EventInstance {
  return {
    id: `${def.id}-${Date.now()}`,
    source,
    context,
    content: {
      title: def.title,
      body: def.body,
      options: def.options
    },
    definitionId: def.id
  };
}

export function checkBiomeRandomEvent(
  context: EventContextSnapshot,
  seedSalt: number,
  existingEventIds: string[]
): EventInstance | null {
  const biome = getBiomeForDistrict(context.environment.district);
  const candidates = getEventsForBiome(biome);
  if (candidates.length === 0) return null;

  const roll = seededRandom(seedSalt);
  if (roll < 0.85) return null;

  const pickIndex = Math.floor(seededRandom(seedSalt + 17) * candidates.length);
  const def = candidates[pickIndex];
  if (existingEventIds.includes(def.id)) return null;

  return buildInstance(def, 'environment', context);
}

export function checkConversationTrigger(
  context: EventContextSnapshot,
  impact: ConversationImpact,
  existingEventIds: string[]
): EventInstance | null {
  if (!context.npc) return null;

  const playerRank = SOCIAL_RANK[context.player.socialClass];
  const npcRank = SOCIAL_RANK[context.npc.socialClass];
  if (npcRank < playerRank) return null;

  const threatMemory = context.flags?.threatMemory ?? 0;
  const nobleAnyInsult = context.npc.socialClass === SocialClass.NOBILITY
    && (impact.threatLevel > 0 || impact.offenseLevel > 0);
  const isThreatening = nobleAnyInsult || impact.threatLevel >= 40 || impact.offenseLevel >= 50;
  if (!isThreatening) return null;

  let eventId = 'conversation_guard_warning';
  const isRepeatThreat = threatMemory >= 1;
  const isSevereThreat = impact.threatLevel >= 70 || impact.offenseLevel >= 70;

  if (context.npc.socialClass === SocialClass.NOBILITY && nobleAnyInsult) {
    eventId = 'event_authority_detains_player';
  } else if (isRepeatThreat || isSevereThreat) {
    eventId = 'event_authority_detains_player';
  } else if (context.environment.district === 'MARKET' || context.environment.district === 'CARAVANSERAI') {
    eventId = 'conversation_summon_market_authority';
  } else if (context.environment.district === 'WEALTHY') {
    eventId = 'conversation_summon_household_guard';
  } else {
    eventId = 'conversation_summon_watch';
  }

  if (existingEventIds.includes(eventId)) return null;

  const def = EVENT_CATALOG.find(event => event.id === eventId);
  if (!def) return null;

  return buildInstance(def, 'conversation', context);
}
