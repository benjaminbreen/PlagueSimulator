/**
 * Building architecture multipliers based on profession and type.
 * Extracted as a pure function so both visual rendering and climbable
 * positioning use the same values.
 */

import { BuildingMetadata, BuildingType } from '../types';

export interface BuildingMultipliers {
  heightMultiplier: number;
  footprintScale: number;
}

/**
 * Calculate architecture multipliers for a building based on owner profession and type.
 * These affect visual building size - must be used for accurate roof positioning.
 */
export function getBuildingMultipliers(building: BuildingMetadata): BuildingMultipliers {
  let heightMultiplier = 1.0;
  let footprintScale = 1.0;

  // RELIGIOUS BUILDINGS
  if (building.ownerProfession === 'Friday Mosque Imam') {
    footprintScale = 1.6;
  } else if (building.ownerProfession === 'Imam') {
    footprintScale = 1.3;
  } else if (building.ownerProfession === 'Madrasa Director') {
    footprintScale = 1.3;
    heightMultiplier = 1.2;
  } else if (building.ownerProfession === 'Shaykh') {
    footprintScale = 1.1;
  } else if (building.ownerProfession === 'Shrine Keeper') {
    footprintScale = 1.0;
    heightMultiplier = 1.3;
  }

  // CIVIC BUILDINGS
  if (building.ownerProfession === 'Mamluk Governor') {
    footprintScale = 1.4;
    heightMultiplier = 1.2;
  } else if (building.ownerProfession === 'Court Qadi') {
    footprintScale = 1.2;
  } else if (building.ownerProfession === 'Hammam Keeper') {
    footprintScale = 1.2;
  } else if (building.ownerProfession === 'Court Physician') {
    footprintScale = 1.1;
  } else if (building.ownerProfession === 'Market Inspector') {
    footprintScale = 1.0;
  } else if (building.ownerProfession === 'Notary') {
    footprintScale = 0.9;
  } else if (building.ownerProfession === 'Fountain Keeper') {
    footprintScale = 0.6;
  }

  // Building type overrides (use max to not reduce existing values)
  if (building.type === BuildingType.MEDICAL) {
    footprintScale = Math.max(1.05, footprintScale);
  }

  if (building.type === BuildingType.SCHOOL) {
    footprintScale = Math.max(1.1, footprintScale);
    heightMultiplier = Math.max(1.05, heightMultiplier);
  }

  if (building.type === BuildingType.HOSPITALITY) {
    footprintScale = Math.max(1.05, footprintScale);
  }

  return { heightMultiplier, footprintScale };
}
