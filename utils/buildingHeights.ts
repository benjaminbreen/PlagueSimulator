import { BuildingMetadata, BuildingType, DistrictType } from '../types';
import { seededRandom } from './procedural';

export const getBuildingHeight = (building: BuildingMetadata, districtOverride?: DistrictType): number => {
  const district = districtOverride ?? building.district ?? 'RESIDENTIAL';
  const localSeed = building.position[0] * 1000 + building.position[2];

  let baseHeight: number;
  if (district === 'WEALTHY' && (building.type === BuildingType.RESIDENTIAL || building.type === BuildingType.COMMERCIAL)) {
    // Wealthy residences are large 2-3 story mansions - 50% taller than before
    baseHeight = 9.0 + seededRandom(localSeed + 9) * 1.5;
  } else if (district === 'HOVELS' && building.type !== BuildingType.RELIGIOUS && building.type !== BuildingType.CIVIC) {
    baseHeight = (3 + seededRandom(localSeed + 1) * 1.6) * 1.2;
  } else if (building.type === BuildingType.RELIGIOUS || building.type === BuildingType.CIVIC) {
    baseHeight = 12;
  } else {
    baseHeight = 4 + seededRandom(localSeed + 1) * 6;
  }

  const districtScale =
    district === 'WEALTHY' ? 1.5 :
    district === 'HOVELS' ? 0.65 :
    district === 'CIVIC' ? 1.2 :
    1.0;

  return baseHeight * districtScale;
};
