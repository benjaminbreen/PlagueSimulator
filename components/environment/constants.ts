/**
 * Shared constants for environment rendering
 * Colors, palettes, sizes, and numeric values used across districts
 */

// ==================== COLOR PALETTES ====================

export const SANDSTONE_PALETTE = ['#d4c4a8', '#c8b896', '#dac8b0', '#c4b490'];
export const DARK_SANDSTONE = '#a89878';
export const LIGHT_SANDSTONE = '#e4d4b8';

export const POT_COLORS = {
  terracotta: ['#8b5a2b', '#a56a3b', '#7a4a1b'],
  clay: ['#9b5c2e', '#b86c3e', '#8a4c1e'],
  ceramic: ['#a86b3a', '#c87a48', '#8a5a2e']
};

export const FLOWER_COLORS = {
  geranium: ['#8b3b3b', '#d64a4a', '#e85a5a'],
  bougainvillea: ['#d64a7a', '#e85a8a', '#c8396a']
};

export const WOOD_COLORS = {
  dark: '#5a4a3a',
  medium: '#6a5a4a',
  light: '#7a6a5a'
};

export const FABRIC_COLORS = {
  linen: '#d8c8b8',
  canvas: '#c8b8a8',
  burlap: '#a89888'
};

export const STONE_COLORS = {
  granite: '#6a6a5a',
  limestone: '#c4b8a8',
  basalt: '#3a3a3a'
};

// Hover/interaction colors
export const HOVER_WIREFRAME_COLORS = {
  default: '#3bdc7f',
  poi: '#f4c542',
  danger: '#ef5a4c'
};

// Ground/terrain colors
export const GROUND_PALETTE = {
  MARKET: ['#e3c595', '#dbbe8e', '#d4b687', '#cdae80', '#c6a679'],
  WEALTHY: ['#5a8a48', '#4f7d3d', '#649850', '#558a42'],  // Lush garden green like Salhiyya
  HOVELS: ['#b68a5f', '#a47b54', '#9a734d'],
  ALLEYS: ['#b68a5f', '#a47b54', '#9a734d'],
  RESIDENTIAL: ['#c8b8a8', '#b8a898', '#d8c8b8'],
  CIVIC: ['#d8c2a0', '#d1b896'],
  SALHIYYA: ['#6a8a4a', '#5f7d45', '#548040'],
  OUTSKIRTS_FARMLAND: ['#6e8f4a', '#5f7f42', '#6a934f', '#57823f'],
  OUTSKIRTS_DESERT: ['#d89556', '#c8904e', '#db9e62', '#c87d42'], // Warm amber-yellow-orange desert sand
  MOUNTAIN_SHRINE: ['#6b7d5a', '#7a8a68', '#889775', '#5f6e4f'],
  CARAVANSERAI: ['#c8a86f', '#c19d64', '#b7935d'],
  SOUTHERN_ROAD: ['#c2a47c', '#b6956d', '#aa8b63'],
  DEFAULT: ['#e2c8a2', '#dbc29a']
};

// Lighting colors
export const SILHOUETTE_COLORS = {
  night: '#0a0a0a',
  twilight: '#1a1a1a',
  day: '#2a2a2a'
};

export const WALL_COLORS = {
  night: '#2a2a2a',
  twilight: '#5a5a5a',
  day: '#6a6a5a'
};

export const MOUNTAIN_COLORS = {
  night: '#000000',
  twilight: '#0a0a14',
  day: '#1a1a2a'
};

export const SMOKE_COLORS = {
  night: '#1a1a1a',
  twilight: '#4a4a4a',
  day: '#6a6a6a'
};

export const HORIZON_SKY_COLORS = {
  night: '#0f1829',
  twilight: '#f7b25a',
  day: '#2f95ee'
};

// ==================== SIZE CONSTANTS ====================

export const TREE_SIZES = {
  palm: {
    trunkRadius: [0.12, 0.15],
    trunkHeight: [2.5, 3.5],
    frondLength: [1.2, 1.8],
    frondCount: [8, 12]
  },
  olive: {
    trunkRadius: [0.15, 0.2],
    trunkHeight: [2.0, 3.0],
    canopyRadius: [1.0, 1.5]
  },
  cypress: {
    trunkRadius: [0.15, 0.2],
    trunkHeight: [4.0, 6.0],
    canopyRadius: [0.8, 1.2]
  },
  pine: {
    trunkRadius: [0.2, 0.25],
    trunkHeight: [5.0, 7.0],
    canopyRadius: [1.5, 2.0]
  }
};

export const POT_SIZES = {
  small: 0.7,
  medium: 1.0,
  large: 1.3
};

export const BUILDING_SIZES = {
  minWidth: 3.0,
  maxWidth: 8.0,
  minDepth: 3.0,
  maxDepth: 8.0,
  minHeight: 2.5,
  maxHeight: 5.0
};

// ==================== NUMERIC CONSTANTS ====================

export const TEXTURE_SIZES = {
  noise: 256,
  grime: 256,
  blotch: 512
};

export const OPACITY_VALUES = {
  noise: 0.2,
  hoverFade: 0.35,
  hoverOutline: 0.85,
  glass: 0.3
};

export const SPACING = {
  buildingMinDistance: 2.0,
  treeMinDistance: 4.0,
  decorMinDistance: 1.5,
  pathWidth: 2.5
};

export const PHYSICS = {
  gravity: -9.8,
  friction: 0.8,
  restitution: 0.3
};

// ==================== DISTRICT-SPECIFIC SETTINGS ====================

export const DISTRICT_DECOR_DENSITY = {
  MARKET: 0.8,
  WEALTHY: 0.6,
  HOVELS: 0.3,
  ALLEYS: 0.2,
  RESIDENTIAL: 0.5,
  CIVIC: 0.4,
  SALHIYYA: 0.4,
  OUTSKIRTS_FARMLAND: 0.35,
  OUTSKIRTS_DESERT: 0.2,
  MOUNTAIN_SHRINE: 0.5,
  CARAVANSERAI: 0.6
};

// ==================== AWNING COLORS ====================

export const AWNING_COLORS = {
  faded: ['#c85848', '#5a7a8a', '#d4c468', '#8a6a4a', '#7a5a5a'],
  vibrant: ['#e86858', '#6a8a9a', '#e4d478', '#9a7a5a', '#8a6a6a']
};

// ==================== FOOD/PRODUCE COLORS ====================

export const PRODUCE_COLORS = {
  bread: '#d4b48a',
  dates: '#6a4a2a',
  pomegranate: '#8a2a2a',
  olives: '#4a5a3a',
  figs: '#7a5a6a',
  grain: '#c8b888',
  spices: {
    saffron: '#f4c430',
    cumin: '#8a6a3a',
    cinnamon: '#7a4a2a',
    turmeric: '#e4b420'
  }
};

// ==================== METAL COLORS ====================

export const METAL_COLORS = {
  brass: '#b8860b',
  copper: '#b87333',
  bronze: '#8c7853',
  iron: '#4a4a4a',
  gold: '#ffd700'
};
