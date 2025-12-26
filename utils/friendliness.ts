/**
 * Friendliness System
 *
 * Calculates effective friendliness based on NPC disposition, player stats,
 * social dynamics, and conversation history. Also analyzes conversation
 * impact on NPC disposition and panic levels.
 */

import {
  NPCStats,
  PlayerStats,
  SocialClass,
  ConversationMessage,
  ConversationSummary
} from '../types';

// Friendliness levels for greeting selection
export type FriendlinessLevel = 'friendly' | 'neutral' | 'unfriendly';

// Class hierarchy for social dynamics
const CLASS_RANK: Record<SocialClass, number> = {
  [SocialClass.NOBILITY]: 4,
  [SocialClass.CLERGY]: 3,
  [SocialClass.MERCHANT]: 2,
  [SocialClass.PEASANT]: 1
};

// Clamp helper
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Calculate effective friendliness based on multiple factors
 * Returns a value from 0-100
 */
export function calculateEffectiveFriendliness(
  npc: NPCStats,
  player: PlayerStats,
  conversationHistory?: ConversationSummary[]
): number {
  // Base: NPC's innate disposition (0-100)
  let friendliness = npc.disposition;

  // Player charisma bonus/penalty (-15 to +15)
  // Charisma 5 is neutral, below = penalty, above = bonus
  const charismaModifier = (player.charisma - 5) * 3;
  friendliness += charismaModifier;

  // Same religion bonus (+10)
  if (npc.religion === player.religion) {
    friendliness += 10;
  }

  // Same ethnicity bonus (+8)
  if (npc.ethnicity === player.ethnicity) {
    friendliness += 8;
  }

  // Class differential (-15 to +10)
  // If player outranks NPC: NPC is more deferential/respectful (+)
  // If NPC outranks player: NPC may be dismissive (-)
  const playerRank = CLASS_RANK[player.socialClass];
  const npcRank = CLASS_RANK[npc.socialClass];
  const classGap = playerRank - npcRank;

  if (classGap > 0) {
    // Player outranks NPC - NPC is more respectful
    friendliness += classGap * 5; // +5 to +15
  } else if (classGap < 0) {
    // NPC outranks player - NPC may be dismissive
    // But this is dampened - not everyone is rude to lower classes
    friendliness += classGap * 3; // -3 to -9
  }

  // Conversation history modifier (-30 to +20)
  if (conversationHistory && conversationHistory.length > 0) {
    const historyMod = getConversationHistoryModifier(conversationHistory);
    friendliness += historyMod;
  }

  // Panic reduces friendliness (high panic = less friendly)
  if (npc.panicLevel > 50) {
    friendliness -= (npc.panicLevel - 50) / 2; // Up to -25 at 100 panic
  }

  return clamp(Math.round(friendliness), 0, 100);
}

/**
 * Get modifier from past conversation history with this NPC
 */
function getConversationHistoryModifier(history: ConversationSummary[]): number {
  if (history.length === 0) return 0;

  let modifier = 0;

  // Weight recent conversations more heavily
  const recentHistory = history.slice(-5); // Last 5 conversations

  for (let i = 0; i < recentHistory.length; i++) {
    const conv = recentHistory[i];
    const recencyWeight = (i + 1) / recentHistory.length; // More recent = higher weight

    switch (conv.sentiment) {
      case 'positive':
        modifier += 5 * recencyWeight;
        break;
      case 'negative':
        modifier -= 8 * recencyWeight; // Negative experiences are remembered more
        break;
      case 'neutral':
        modifier += 1 * recencyWeight; // Slight positive for familiarity
        break;
    }
  }

  return clamp(Math.round(modifier), -30, 20);
}

/**
 * Convert numeric friendliness to categorical level for greeting selection
 */
export function getFriendlinessLevel(effectiveFriendliness: number): FriendlinessLevel {
  if (effectiveFriendliness >= 55) return 'friendly';
  if (effectiveFriendliness >= 35) return 'neutral';
  return 'unfriendly';
}

/**
 * Impact of a conversation on NPC disposition and panic
 */
export interface ConversationImpact {
  friendlinessChange: number; // Change to apply to disposition (-30 to +15)
  panicChange: number;        // Change to apply to panic (-10 to +40)
  sentiment: 'positive' | 'neutral' | 'negative'; // Overall sentiment for history
}

/**
 * Analyze player messages to determine conversation impact
 */
export function analyzeConversationImpact(
  messages: ConversationMessage[]
): ConversationImpact {
  const playerMessages = messages.filter(m => m.role === 'player');

  if (playerMessages.length === 0) {
    return { friendlinessChange: 0, panicChange: 0, sentiment: 'neutral' };
  }

  let friendlinessDelta = 0;
  let panicDelta = 0;

  for (const msg of playerMessages) {
    const text = msg.content.toLowerCase();
    const words = text.split(/\s+/);

    // === THREATENING/SCARY LANGUAGE ===

    // Extreme threats (major panic, big friendliness drop)
    if (/you will die|going to die|death comes for you|plague will take you|curse you/.test(text)) {
      panicDelta += 20;
      friendlinessDelta -= 15;
    }
    // Death/plague mentions (moderate panic)
    else if (/\b(die|dying|death|plague|pestilence|curse|damned|doom)\b/.test(text)) {
      panicDelta += 8;
      friendlinessDelta -= 5;
    }

    // Mentions of sickness nearby
    if (/sick|infected|ill|fever|buboes|black death/.test(text)) {
      panicDelta += 5;
    }

    // Shouting (ALL CAPS detection)
    const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase());
    if (capsWords.length >= 2) {
      panicDelta += 3;
      friendlinessDelta -= 3;
    }

    // === AGGRESSIVE/INSULTING LANGUAGE ===

    if (/\b(fool|idiot|stupid|worthless|scum|pig|dog|filth|wretch)\b/.test(text)) {
      friendlinessDelta -= 10;
    }
    if (/get out|go away|leave me|shut up|be silent/.test(text)) {
      friendlinessDelta -= 6;
    }
    if (/\b(hate|despise|loathe)\b/.test(text)) {
      friendlinessDelta -= 8;
    }

    // === POSITIVE/KIND LANGUAGE ===

    // Blessings and well-wishes
    if (/\b(bless|blessing|peace be|god protect|allah protect|safe journey)\b/.test(text)) {
      friendlinessDelta += 4;
      panicDelta -= 2;
    }

    // Friendly terms
    if (/\b(friend|brother|sister|neighbor|kind|thank|grateful)\b/.test(text)) {
      friendlinessDelta += 3;
    }

    // Offers of help
    if (/help you|assist you|protect you|warn you|save you/.test(text)) {
      friendlinessDelta += 5;
      panicDelta -= 3;
    }

    // Gifts/trade (positive commercial interaction)
    if (/\b(gift|offer|trade|buy|purchase|coin|pay)\b/.test(text)) {
      friendlinessDelta += 2;
    }

    // Compliments
    if (/\b(fine|excellent|beautiful|wonderful|wise|skilled)\b/.test(text)) {
      friendlinessDelta += 2;
    }

    // === NEUTRAL/INFORMATIONAL ===

    // Questions are generally neutral
    if (/\?$/.test(msg.content.trim())) {
      // Questions are fine, slight positive for engagement
      friendlinessDelta += 0.5;
    }
  }

  // Clamp values
  friendlinessDelta = clamp(Math.round(friendlinessDelta), -30, 15);
  panicDelta = clamp(Math.round(panicDelta), -10, 40);

  // Determine overall sentiment
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (friendlinessDelta >= 5) {
    sentiment = 'positive';
  } else if (friendlinessDelta <= -5) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  return {
    friendlinessChange: friendlinessDelta,
    panicChange: panicDelta,
    sentiment
  };
}

/**
 * Apply conversation impact to NPC stats
 * Returns updated disposition and panic levels
 */
export function applyConversationImpact(
  npc: NPCStats,
  impact: ConversationImpact
): { newDisposition: number; newPanicLevel: number } {
  const newDisposition = clamp(npc.disposition + impact.friendlinessChange, 0, 100);
  const newPanicLevel = clamp(npc.panicLevel + impact.panicChange, 0, 100);

  return { newDisposition, newPanicLevel };
}

/**
 * Generate a summary of relationship quality for UI display
 */
export function getRelationshipDescription(effectiveFriendliness: number): string {
  if (effectiveFriendliness >= 80) return 'Very Friendly';
  if (effectiveFriendliness >= 60) return 'Friendly';
  if (effectiveFriendliness >= 45) return 'Neutral';
  if (effectiveFriendliness >= 30) return 'Cool';
  if (effectiveFriendliness >= 15) return 'Unfriendly';
  return 'Hostile';
}
