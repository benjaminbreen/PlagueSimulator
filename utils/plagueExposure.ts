/**
 * Plague Exposure System Configuration
 * Historically accurate transmission rates for Yersinia pestis (Black Death)
 * Balanced for engaging gameplay while maintaining realism
 */

export const EXPOSURE_CONFIG = {
  // Base exposure chances per second (when in range)
  RAT_BASE_CHANCE: 0.008,      // 0.8% per second near rats (flea bites)
  INFECTED_BASE_CHANCE: 0.003, // 0.3% per second near infected NPCs (pneumonic)
  CORPSE_BASE_CHANCE: 0.0015,  // 0.15% per second near corpses (contact)

  // Detection radii (world units)
  RAT_RADIUS: 2.5,             // Rat activity/flea jump range
  INFECTED_RADIUS: 3.0,        // Pneumonic droplet range
  CORPSE_RADIUS: 1.5,          // Close contact with contaminated materials

  // Density caps (for multiplier calculation)
  MAX_RAT_DENSITY: 5,          // Maximum rats to count for exposure
  MAX_INFECTED_DENSITY: 3,     // Maximum infected NPCs to count

  // System timing
  CHECK_INTERVAL_SECONDS: 1.0, // How often to check for exposure

  // Visual feedback
  FLEA_BITE_PARTICLE_SIZE: 0.3, // Impact puff size for flea bites

  // Protection multipliers (historically accurate for 14th century Damascus)
  PROTECTION: {
    AROMATIC_HERB_POUCH: 0.7,    // Herb pouch (rue, wormwood, mint): 30% reduction
    FACE_CLOTH: 0.85,             // Simple cloth veil: 15% reduction
    VINEGAR_CLOTH: 0.65,          // Vinegar-soaked cloth: 35% reduction (most effective)
    FRANKINCENSE: 0.9,            // Burning frankincense/incense: 10% reduction
    QURANIC_AMULET: 0.95,         // Protective talisman: 5% reduction (spiritual/placebo)
  }
} as const;

/**
 * Expected infection rates with base config:
 * - 30s near rats: ~20% infection chance
 * - 60s near infected NPC: ~15% infection chance
 * - 10s looting corpse: ~1.5% infection chance
 * - Careful avoidant play: ~0% infection chance
 */

/**
 * Calculate total plague protection multiplier from player inventory
 * Protection items stack multiplicatively (each reduces remaining risk)
 * Example: 30% reduction + 15% reduction = 1 - (0.7 * 0.85) = 40.5% total reduction
 */
export function calculatePlagueProtection(inventory: Array<{ itemId: string; quantity: number }>): number {
  let protectionMultiplier = 1.0;

  // Check for each protective item in inventory
  const hasAromaticHerbPouch = inventory.some(item => item.itemId === 'aromatic_herb_pouch' && item.quantity > 0);
  const hasFaceCloth = inventory.some(item => item.itemId === 'face_cloth' && item.quantity > 0);
  const hasVinegarCloth = inventory.some(item => item.itemId === 'vinegar_cloth' && item.quantity > 0);
  const hasFrankincense = inventory.some(item => item.itemId === 'frankincense' && item.quantity > 0);
  const hasQuranicAmulet = inventory.some(item => item.itemId === 'quranic_amulet' && item.quantity > 0);

  // Stack protection multiplicatively
  if (hasAromaticHerbPouch) protectionMultiplier *= EXPOSURE_CONFIG.PROTECTION.AROMATIC_HERB_POUCH;
  if (hasFaceCloth) protectionMultiplier *= EXPOSURE_CONFIG.PROTECTION.FACE_CLOTH;
  if (hasVinegarCloth) protectionMultiplier *= EXPOSURE_CONFIG.PROTECTION.VINEGAR_CLOTH;
  if (hasFrankincense) protectionMultiplier *= EXPOSURE_CONFIG.PROTECTION.FRANKINCENSE;
  if (hasQuranicAmulet) protectionMultiplier *= EXPOSURE_CONFIG.PROTECTION.QURANIC_AMULET;

  return protectionMultiplier;
}
