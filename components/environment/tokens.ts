/**
 * Material tokens - reusable material presets for consistent appearance
 * These provide ready-to-use configurations for common materials
 */

import * as THREE from 'three';
import {
  SANDSTONE_PALETTE,
  DARK_SANDSTONE,
  LIGHT_SANDSTONE,
  WOOD_COLORS,
  METAL_COLORS,
  STONE_COLORS,
  FABRIC_COLORS
} from './constants';

// ==================== MATERIAL PRESET INTERFACES ====================

export interface MaterialPreset {
  color?: string | number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
}

export interface MaterialToken {
  standard: MaterialPreset;
  variants?: {
    dark?: MaterialPreset;
    light?: MaterialPreset;
    weathered?: MaterialPreset;
    stained?: MaterialPreset;
  };
}

// ==================== STONE MATERIALS ====================

export const SANDSTONE_MATERIAL: MaterialToken = {
  standard: {
    color: SANDSTONE_PALETTE[0],
    roughness: 0.88,
    metalness: 0.1
  },
  variants: {
    dark: {
      color: DARK_SANDSTONE,
      roughness: 0.92,
      metalness: 0.08
    },
    light: {
      color: LIGHT_SANDSTONE,
      roughness: 0.85,
      metalness: 0.12
    },
    weathered: {
      color: SANDSTONE_PALETTE[3],
      roughness: 0.95,
      metalness: 0.05
    }
  }
};

export const LIMESTONE_MATERIAL: MaterialToken = {
  standard: {
    color: STONE_COLORS.limestone,
    roughness: 0.85,
    metalness: 0.1
  }
};

export const GRANITE_MATERIAL: MaterialToken = {
  standard: {
    color: STONE_COLORS.granite,
    roughness: 0.7,
    metalness: 0.15
  }
};

// ==================== WOOD MATERIALS ====================

export const WOOD_MATERIAL: MaterialToken = {
  standard: {
    color: WOOD_COLORS.medium,
    roughness: 0.9,
    metalness: 0.0
  },
  variants: {
    dark: {
      color: WOOD_COLORS.dark,
      roughness: 0.92,
      metalness: 0.0
    },
    light: {
      color: WOOD_COLORS.light,
      roughness: 0.88,
      metalness: 0.0
    },
    weathered: {
      color: WOOD_COLORS.dark,
      roughness: 0.95,
      metalness: 0.0
    }
  }
};

// ==================== CERAMIC MATERIALS ====================

export const CERAMIC_MATERIAL: MaterialToken = {
  standard: {
    color: '#9b5c2e',
    roughness: 0.85,
    metalness: 0.1
  },
  variants: {
    dark: {
      color: '#7a4a1b',
      roughness: 0.88,
      metalness: 0.08
    },
    light: {
      color: '#b86c3e',
      roughness: 0.82,
      metalness: 0.12
    },
    weathered: {
      color: '#8a4c1e',
      roughness: 0.92,
      metalness: 0.05
    }
  }
};

export const TERRACOTTA_MATERIAL: MaterialToken = {
  standard: {
    color: '#c85a4a',
    roughness: 0.9,
    metalness: 0.05
  }
};

// ==================== METAL MATERIALS ====================

export const BRASS_MATERIAL: MaterialToken = {
  standard: {
    color: METAL_COLORS.brass,
    roughness: 0.3,
    metalness: 0.9
  },
  variants: {
    weathered: {
      color: '#8c6a0b',
      roughness: 0.6,
      metalness: 0.7
    }
  }
};

export const COPPER_MATERIAL: MaterialToken = {
  standard: {
    color: METAL_COLORS.copper,
    roughness: 0.35,
    metalness: 0.9
  },
  variants: {
    weathered: {
      color: '#7a5a2a',
      roughness: 0.65,
      metalness: 0.7
    }
  }
};

export const IRON_MATERIAL: MaterialToken = {
  standard: {
    color: METAL_COLORS.iron,
    roughness: 0.5,
    metalness: 0.95
  },
  variants: {
    weathered: {
      color: '#3a2a1a',
      roughness: 0.8,
      metalness: 0.6
    }
  }
};

// ==================== FABRIC MATERIALS ====================

export const FABRIC_MATERIAL: MaterialToken = {
  standard: {
    color: FABRIC_COLORS.canvas,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide
  },
  variants: {
    light: {
      color: FABRIC_COLORS.linen,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    },
    dark: {
      color: FABRIC_COLORS.burlap,
      roughness: 0.98,
      metalness: 0.0,
      side: THREE.DoubleSide
    }
  }
};

// ==================== PLASTER MATERIALS ====================

export const PLASTER_MATERIAL: MaterialToken = {
  standard: {
    color: '#e8d8c8',
    roughness: 0.9,
    metalness: 0.05
  },
  variants: {
    weathered: {
      color: '#d8c8b8',
      roughness: 0.95,
      metalness: 0.02
    },
    stained: {
      color: '#c8b8a8',
      roughness: 0.92,
      metalness: 0.03
    }
  }
};

// ==================== GLASS MATERIALS ====================

export const GLASS_MATERIAL: MaterialToken = {
  standard: {
    color: '#e8f4f8',
    roughness: 0.1,
    metalness: 0.0,
    opacity: 0.3,
    transparent: true
  },
  variants: {
    weathered: {
      color: '#d8e4e8',
      roughness: 0.3,
      metalness: 0.0,
      opacity: 0.4,
      transparent: true
    }
  }
};

// ==================== FOLIAGE MATERIALS ====================

export const FOLIAGE_MATERIAL: MaterialToken = {
  standard: {
    color: '#4a6a3a',
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide
  },
  variants: {
    dark: {
      color: '#3a5a2a',
      roughness: 0.98,
      metalness: 0.0,
      side: THREE.DoubleSide
    },
    light: {
      color: '#5a7a4a',
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    }
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Creates a THREE.js material from a preset
 */
export const createMaterialFromToken = (
  token: MaterialPreset,
  overrides?: Partial<MaterialPreset>
): THREE.MeshStandardMaterial => {
  const config = { ...token, ...overrides };
  return new THREE.MeshStandardMaterial(config as THREE.MeshStandardMaterialParameters);
};

/**
 * Get a variant from a material token
 */
export const getVariant = (
  token: MaterialToken,
  variant?: 'dark' | 'light' | 'weathered' | 'stained'
): MaterialPreset => {
  if (variant && token.variants?.[variant]) {
    return token.variants[variant];
  }
  return token.standard;
};

/**
 * Quick helpers for common materials
 */
export const materials = {
  sandstone: (variant?: 'dark' | 'light' | 'weathered') =>
    createMaterialFromToken(getVariant(SANDSTONE_MATERIAL, variant)),

  wood: (variant?: 'dark' | 'light' | 'weathered') =>
    createMaterialFromToken(getVariant(WOOD_MATERIAL, variant)),

  ceramic: (variant?: 'dark' | 'light' | 'weathered') =>
    createMaterialFromToken(getVariant(CERAMIC_MATERIAL, variant)),

  brass: (variant?: 'weathered') =>
    createMaterialFromToken(getVariant(BRASS_MATERIAL, variant)),

  fabric: (variant?: 'dark' | 'light') =>
    createMaterialFromToken(getVariant(FABRIC_MATERIAL, variant)),

  plaster: (variant?: 'weathered' | 'stained') =>
    createMaterialFromToken(getVariant(PLASTER_MATERIAL, variant))
};
