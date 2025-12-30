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

export function getBiomeForDistrict(district: DistrictType): 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic' {
  switch (district) {
    case 'MARKET':
    case 'CARAVANSERAI':
    case 'STRAIGHT_STREET':
    case 'SOUQ_AXIS':
    case 'MIDAN':
    case 'BAB_SHARQI':
      return 'marketplace';
    case 'WEALTHY':
      return 'wealthy';
    case 'HOVELS':
      return 'hovels';
    case 'OUTSKIRTS_DESERT':
    case 'SOUTHERN_ROAD':
      return 'desert';
    case 'CIVIC':
    case 'UMAYYAD_MOSQUE':
      return 'civic';
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
