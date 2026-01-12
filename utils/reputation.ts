/**
 * Reputation System
 *
 * Manages player reputation tiers and their consequences throughout the game.
 * Reputation affects: merchant prices, NPC willingness to talk, building access,
 * medical treatment availability, and guard behavior.
 */

import { BuildingType } from '../types';

export enum ReputationTier {
  PARIAH = 'PARIAH',           // 0-15: Actively shunned, may be attacked
  DISGRACED = 'DISGRACED',     // 16-35: Refused service, hostile treatment
  UNKNOWN = 'UNKNOWN',         // 36-50: Neutral, default treatment
  RESPECTED = 'RESPECTED',     // 51-70: Minor benefits, friendly treatment
  ESTEEMED = 'ESTEEMED',       // 71-85: Significant benefits, sought out
  LEGENDARY = 'LEGENDARY'      // 86-100: Maximum benefits, special access
}

/**
 * Get the reputation tier based on numeric reputation value
 */
export function getReputationTier(reputation: number): ReputationTier {
  if (reputation <= 15) return ReputationTier.PARIAH;
  if (reputation <= 35) return ReputationTier.DISGRACED;
  if (reputation <= 50) return ReputationTier.UNKNOWN;
  if (reputation <= 70) return ReputationTier.RESPECTED;
  if (reputation <= 85) return ReputationTier.ESTEEMED;
  return ReputationTier.LEGENDARY;
}

/**
 * Get human-readable label for reputation tier
 */
export function getReputationLabel(tier: ReputationTier): string {
  switch (tier) {
    case ReputationTier.PARIAH: return 'Pariah';
    case ReputationTier.DISGRACED: return 'Disgraced';
    case ReputationTier.UNKNOWN: return 'Unknown';
    case ReputationTier.RESPECTED: return 'Respected';
    case ReputationTier.ESTEEMED: return 'Esteemed';
    case ReputationTier.LEGENDARY: return 'Legendary';
  }
}

/**
 * Get the price modifier for merchant transactions
 * < 1.0 = discount, > 1.0 = markup
 */
export function getPriceModifier(tier: ReputationTier): number {
  switch (tier) {
    case ReputationTier.PARIAH: return 2.0;      // +100% (if they deal at all)
    case ReputationTier.DISGRACED: return 1.5;   // +50%
    case ReputationTier.UNKNOWN: return 1.0;     // normal
    case ReputationTier.RESPECTED: return 0.9;   // -10%
    case ReputationTier.ESTEEMED: return 0.8;    // -20%
    case ReputationTier.LEGENDARY: return 0.7;   // -30%
  }
}

/**
 * Get the sell price modifier (how much merchants pay when buying from player)
 * Higher = better deal for player
 */
export function getSellPriceModifier(tier: ReputationTier): number {
  switch (tier) {
    case ReputationTier.PARIAH: return 0.3;      // Merchants rip you off
    case ReputationTier.DISGRACED: return 0.5;   // Poor prices
    case ReputationTier.UNKNOWN: return 0.7;     // Standard (base rate)
    case ReputationTier.RESPECTED: return 0.8;   // Fair prices
    case ReputationTier.ESTEEMED: return 0.85;   // Good prices
    case ReputationTier.LEGENDARY: return 0.9;   // Best prices
  }
}

/**
 * Get the medical treatment cost modifier
 */
export function getMedicalCostModifier(tier: ReputationTier): number {
  switch (tier) {
    case ReputationTier.PARIAH: return 0;        // Refused treatment
    case ReputationTier.DISGRACED: return 1.5;   // +50%
    case ReputationTier.UNKNOWN: return 1.0;     // normal
    case ReputationTier.RESPECTED: return 0.9;   // -10%
    case ReputationTier.ESTEEMED: return 0.75;   // -25%
    case ReputationTier.LEGENDARY: return 0.5;   // -50% (honored patient)
  }
}

/**
 * Check if merchant will deal with player at all
 */
export function willMerchantDeal(tier: ReputationTier): boolean {
  return tier !== ReputationTier.PARIAH;
}

/**
 * Get merchant refusal message if they won't deal
 */
export function getMerchantRefusalMessage(tier: ReputationTier): string | null {
  if (tier === ReputationTier.PARIAH) {
    const messages = [
      "The merchant turns away. \"I have nothing for someone of your... reputation.\"",
      "\"Leave my stall. I won't be seen dealing with the likes of you.\"",
      "The merchant makes a warding gesture and refuses to meet your eyes.",
      "\"Go away! Your presence is bad for business.\""
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

/**
 * Check if NPC will engage in conversation
 */
export function willNpcTalk(tier: ReputationTier, npcDisposition: number): boolean {
  switch (tier) {
    case ReputationTier.PARIAH:
      return false; // No one talks to a pariah
    case ReputationTier.DISGRACED:
      return npcDisposition > 70; // Only very friendly NPCs
    default:
      return true;
  }
}

/**
 * Get NPC refusal message when they won't talk
 */
export function getNpcRefusalMessage(tier: ReputationTier): string | null {
  if (tier === ReputationTier.PARIAH) {
    const messages = [
      "They hurry away, avoiding your gaze.",
      "The person crosses to the other side of the street.",
      "They make a sign against evil and turn their back.",
      "\"Stay away from me!\" They retreat quickly."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  if (tier === ReputationTier.DISGRACED) {
    const messages = [
      "\"I have nothing to say to you.\" They turn away.",
      "They give you a cold look and walk past.",
      "\"Perhaps another time.\" Their tone suggests never.",
      "They pretend not to hear you."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

/**
 * Check if player can access a building based on reputation
 */
export function canAccessBuilding(
  tier: ReputationTier,
  buildingType: BuildingType,
  isWealthyDistrict: boolean
): boolean {
  switch (tier) {
    case ReputationTier.PARIAH:
      // Pariahs can only enter religious buildings (mosques accept all for prayer)
      // and their own home
      return buildingType === BuildingType.RELIGIOUS;
    case ReputationTier.DISGRACED:
      // Disgraced cannot enter wealthy homes or civic buildings
      if (isWealthyDistrict && buildingType === BuildingType.RESIDENTIAL) return false;
      if (buildingType === BuildingType.CIVIC) return false;
      return true;
    default:
      return true;
  }
}

/**
 * Get building access denial message
 */
export function getBuildingDenialMessage(tier: ReputationTier, buildingType: BuildingType): string {
  if (tier === ReputationTier.PARIAH) {
    if (buildingType === BuildingType.COMMERCIAL) {
      return "The shopkeeper bars the door. \"Not you. Get out.\"";
    }
    return "You are not welcome here. The door remains firmly shut.";
  }
  if (tier === ReputationTier.DISGRACED) {
    if (buildingType === BuildingType.CIVIC) {
      return "The guards block your path. \"No entry for troublemakers.\"";
    }
    return "The owner eyes you suspiciously and bars the entrance.";
  }
  return "You cannot enter here.";
}

/**
 * Check if player can receive medical treatment
 */
export function canReceiveMedicalTreatment(tier: ReputationTier): boolean {
  return tier !== ReputationTier.PARIAH;
}

/**
 * Get medical treatment refusal message
 */
export function getMedicalRefusalMessage(tier: ReputationTier): string | null {
  if (tier === ReputationTier.PARIAH) {
    const messages = [
      "\"Leave this place! I will not treat one such as you.\"",
      "The physician turns away in disgust. \"Find help elsewhere.\"",
      "\"My oath does not extend to those who have forsaken all honor.\"",
      "\"Get out before I call the guards!\""
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

/**
 * Check if guards should be hostile to player
 */
export function shouldGuardsBeHostile(tier: ReputationTier): boolean {
  return tier === ReputationTier.PARIAH;
}

/**
 * Check if guards should be suspicious (extra watchful)
 */
export function shouldGuardsBeSuspicious(tier: ReputationTier): boolean {
  return tier === ReputationTier.PARIAH || tier === ReputationTier.DISGRACED;
}

/**
 * Get context string for LLM conversations based on reputation
 */
export function getReputationContextForLLM(tier: ReputationTier): string {
  switch (tier) {
    case ReputationTier.PARIAH:
      return "The player is a pariah in Damascus - widely reviled and shunned. You should be hostile, fearful, or dismissive. You may refuse to engage or demand they leave.";
    case ReputationTier.DISGRACED:
      return "The player has a poor reputation in the city. You are wary and reluctant to engage with them. Keep responses short and suspicious.";
    case ReputationTier.UNKNOWN:
      return "The player is a stranger to you - treat them neutrally as you would any unfamiliar person.";
    case ReputationTier.RESPECTED:
      return "The player has a good reputation in Damascus. You are friendly and more willing to help or share information.";
    case ReputationTier.ESTEEMED:
      return "The player is well-known and highly regarded in Damascus. You treat them with respect and are eager to assist. You may share secrets or offer special help.";
    case ReputationTier.LEGENDARY:
      return "The player is legendary in Damascus - a figure of great renown. You are honored to speak with them and will go out of your way to help. You treat them with deep respect bordering on reverence.";
  }
}

/**
 * Get color class for UI display
 */
export function getReputationColorClass(tier: ReputationTier): string {
  switch (tier) {
    case ReputationTier.PARIAH: return 'text-red-500';
    case ReputationTier.DISGRACED: return 'text-orange-400';
    case ReputationTier.UNKNOWN: return 'text-gray-400';
    case ReputationTier.RESPECTED: return 'text-green-400';
    case ReputationTier.ESTEEMED: return 'text-blue-400';
    case ReputationTier.LEGENDARY: return 'text-yellow-400';
  }
}

/**
 * Get background color class for UI badges
 */
export function getReputationBgClass(tier: ReputationTier): string {
  switch (tier) {
    case ReputationTier.PARIAH: return 'bg-red-900/50';
    case ReputationTier.DISGRACED: return 'bg-orange-900/50';
    case ReputationTier.UNKNOWN: return 'bg-gray-800/50';
    case ReputationTier.RESPECTED: return 'bg-green-900/50';
    case ReputationTier.ESTEEMED: return 'bg-blue-900/50';
    case ReputationTier.LEGENDARY: return 'bg-yellow-900/50';
  }
}
