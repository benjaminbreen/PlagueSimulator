/**
 * Historically accurate profession signage for 14th century Mamluk Damascus
 *
 * In medieval Damascus, most people were illiterate, so pictorial signage was essential.
 * Merchants used hanging objects, symbolic tools, and fabric banners to identify their trades.
 */

export interface ProfessionSign {
  type: 'hanging' | 'mounted' | 'banner';
  geometry: 'bowl' | 'vessel' | 'pitcher' | 'horseshoe' | 'key' | 'fabric' | 'mortar' | 'bread' |
            'rug' | 'lamp' | 'censer' | 'medallion' | 'tools' | 'amphora' | 'shuttle' | 'bag' | 'soap';
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string; // For lanterns and lamps at night
  secondaryColor?: string; // For multi-colored objects
  bracketOffset: number; // Distance from wall for hanging signs (0 for mounted)
  heightOffset: number; // Height above door center
  scale: number; // Overall size multiplier
}

/**
 * Comprehensive mapping of all 25 commercial professions to their historical signs
 */
export const PROFESSION_SIGN_MAP: Record<string, ProfessionSign> = {
  // ==================== METAL TRADES ====================

  'Blacksmith': {
    type: 'hanging',
    geometry: 'horseshoe',
    color: '#2a2420', // Dark iron
    metalness: 0.7,
    roughness: 0.6,
    bracketOffset: 0.4,
    heightOffset: 0.8,
    scale: 1.0
  },

  'Coppersmith': {
    type: 'hanging',
    geometry: 'bowl',
    color: '#b87333', // Burnished copper
    metalness: 0.8,
    roughness: 0.3,
    bracketOffset: 0.45,
    heightOffset: 0.7,
    scale: 1.1
  },

  'Locksmith': {
    type: 'hanging',
    geometry: 'key',
    color: '#cd7f32', // Brass
    metalness: 0.75,
    roughness: 0.4,
    bracketOffset: 0.4,
    heightOffset: 0.8,
    scale: 1.3
  },

  'Jeweler': {
    type: 'mounted',
    geometry: 'medallion',
    color: '#ffd700', // Gold
    metalness: 0.9,
    roughness: 0.2,
    bracketOffset: 0,
    heightOffset: 0.9,
    scale: 0.9
  },

  // ==================== FOOD & SERVICES ====================

  'Baker': {
    type: 'mounted',
    geometry: 'bread',
    color: '#d4a574', // Golden brown bread
    metalness: 0,
    roughness: 0.95,
    bracketOffset: 0,
    heightOffset: 0.85,
    scale: 1.0
  },

  'Sherbet Seller': {
    type: 'hanging',
    geometry: 'pitcher',
    color: '#20b2aa', // Blue-green ceramic glaze
    metalness: 0.1,
    roughness: 0.5,
    bracketOffset: 0.35,
    heightOffset: 0.7,
    scale: 1.0
  },

  'Sherbet House Keeper': {
    type: 'hanging',
    geometry: 'pitcher',
    color: '#20b2aa',
    metalness: 0.1,
    roughness: 0.5,
    bracketOffset: 0.35,
    heightOffset: 0.7,
    scale: 1.1
  },

  'Oil Presser': {
    type: 'mounted',
    geometry: 'amphora',
    color: '#d2691e', // Terracotta
    metalness: 0,
    roughness: 0.8,
    bracketOffset: 0,
    heightOffset: 0.75,
    scale: 1.2
  },

  'Barber-Surgeon': {
    type: 'hanging',
    geometry: 'bowl',
    color: '#cd7f32', // Brass basin (traditional barber sign)
    metalness: 0.8,
    roughness: 0.3,
    secondaryColor: '#c85555', // Red accent for surgeon aspect
    bracketOffset: 0.45,
    heightOffset: 0.75,
    scale: 1.0
  },

  'Innkeeper': {
    type: 'hanging',
    geometry: 'lamp',
    color: '#cd7f32', // Brass lantern
    metalness: 0.7,
    roughness: 0.4,
    emissive: '#ff9944', // Warm glow at night
    bracketOffset: 0.4,
    heightOffset: 0.8,
    scale: 1.0
  },

  // ==================== TEXTILE TRADES ====================

  'Draper': {
    type: 'banner',
    geometry: 'fabric',
    color: '#8b0000', // Rich crimson
    metalness: 0,
    roughness: 0.6,
    bracketOffset: 0,
    heightOffset: 0.75,
    scale: 1.2
  },

  'Weaver': {
    type: 'hanging',
    geometry: 'shuttle',
    color: '#6a4a2a', // Wood
    metalness: 0,
    roughness: 0.9,
    secondaryColor: '#4169e1', // Colored thread
    bracketOffset: 0.4,
    heightOffset: 0.8,
    scale: 1.1
  },

  'Silk Merchant': {
    type: 'banner',
    geometry: 'fabric',
    color: '#9370db', // Iridescent purple
    metalness: 0.3,
    roughness: 0.3, // Shiny silk
    bracketOffset: 0,
    heightOffset: 0.8,
    scale: 1.3
  },

  'Leather Worker': {
    type: 'hanging',
    geometry: 'bag',
    color: '#8b4513', // Brown leather
    metalness: 0,
    roughness: 0.7,
    bracketOffset: 0.35,
    heightOffset: 0.7,
    scale: 1.0
  },

  'Rug Merchant': {
    type: 'banner',
    geometry: 'rug',
    color: '#8b0000', // Deep red with patterns
    metalness: 0,
    roughness: 0.8,
    secondaryColor: '#00008b', // Blue patterns
    bracketOffset: 0,
    heightOffset: 0.75,
    scale: 1.1
  },

  // ==================== ARTISAN TRADES ====================

  'Spice Merchant': {
    type: 'mounted',
    geometry: 'mortar',
    color: '#8b7355', // Stone gray
    metalness: 0,
    roughness: 0.9,
    bracketOffset: 0,
    heightOffset: 0.85,
    scale: 1.1
  },

  'Apothecary': {
    type: 'mounted',
    geometry: 'mortar',
    color: '#8b7355', // Stone mortar
    metalness: 0,
    roughness: 0.9,
    secondaryColor: '#228b22', // Green healing symbol
    bracketOffset: 0,
    heightOffset: 0.85,
    scale: 1.2
  },

  'Perfumer': {
    type: 'hanging',
    geometry: 'censer',
    color: '#cd7f32', // Brass incense burner
    metalness: 0.75,
    roughness: 0.4,
    bracketOffset: 0.4,
    heightOffset: 0.75,
    scale: 0.9
  },

  'Potter': {
    type: 'mounted',
    geometry: 'vessel',
    color: '#d2691e', // Terracotta
    metalness: 0,
    roughness: 0.7,
    secondaryColor: '#4682b4', // Blue glaze accent
    bracketOffset: 0,
    heightOffset: 0.8,
    scale: 1.1
  },

  'Glassblower': {
    type: 'hanging',
    geometry: 'lamp',
    color: '#4169e1', // Colored glass - blue
    metalness: 0.2,
    roughness: 0.1, // Very shiny glass
    emissive: '#6495ed', // Slight glow
    bracketOffset: 0.4,
    heightOffset: 0.75,
    scale: 0.95
  },

  'Soap Maker': {
    type: 'mounted',
    geometry: 'soap',
    color: '#f5f5dc', // Cream soap
    metalness: 0,
    roughness: 0.6,
    secondaryColor: '#228b22', // Green olive accent
    bracketOffset: 0,
    heightOffset: 0.8,
    scale: 1.0
  },

  'Carpenter': {
    type: 'mounted',
    geometry: 'tools',
    color: '#6a4a2a', // Wood handles
    metalness: 0.3,
    roughness: 0.8,
    secondaryColor: '#5a5a5a', // Metal tools
    bracketOffset: 0,
    heightOffset: 0.85,
    scale: 1.1
  },

  // ==================== HOSPITALITY ====================

  'Khan Warden': {
    type: 'mounted',
    geometry: 'medallion',
    color: '#8b6f47', // Carved wood
    metalness: 0,
    roughness: 0.85,
    bracketOffset: 0,
    heightOffset: 0.9,
    scale: 1.2
  },

  'Caravanserai Keeper': {
    type: 'mounted',
    geometry: 'medallion',
    color: '#8b6f47', // Carved wood camel
    metalness: 0,
    roughness: 0.85,
    bracketOffset: 0,
    heightOffset: 0.9,
    scale: 1.3
  },
};

/**
 * Helper function to get profession sign data
 */
export function getProfessionSign(profession: string): ProfessionSign | null {
  return PROFESSION_SIGN_MAP[profession] ?? null;
}
