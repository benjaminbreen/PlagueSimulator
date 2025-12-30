import { seededRandom } from '../procedural';
import { BuildingType } from '../../types';

// Door type based on building characteristics
export type DoorStyle = 'plank' | 'paneled' | 'studded' | 'carved' | 'arched' | 'double';

export const getDoorStyle = (
  buildingType: BuildingType,
  district: string,
  sizeScale: number,
  seed: number
): DoorStyle => {
  const roll = seededRandom(seed);

  // Religious buildings - ornate arched or double doors
  if (buildingType === 3) { // RELIGIOUS
    return roll > 0.4 ? 'arched' : 'double';
  }

  // Civic buildings - studded or double doors
  if (buildingType === 2) { // CIVIC
    return roll > 0.5 ? 'studded' : 'double';
  }

  // Wealthy district - carved or studded
  if (district === 'WEALTHY' || district === 'SALHIYYA') {
    return roll > 0.5 ? 'carved' : 'studded';
  }

  // Poor areas - simple plank doors
  if (district === 'HOVELS') {
    return 'plank';
  }

  // Large commercial buildings
  if (buildingType === 1 && sizeScale > 1.05) { // COMMERCIAL
    return roll > 0.6 ? 'studded' : 'paneled';
  }

  // Default residential - paneled or plank
  return roll > 0.4 ? 'paneled' : 'plank';
};
