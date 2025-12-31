import { getDistrictType } from '../types';
import { seededRandom } from './procedural';

export interface BedouinTentLocation {
  pos: [number, number, number];
  seed: number;
  mapX: number;
  mapY: number;
}

// Get all Bedouin tent positions for a given tile
export const getBedouinTentPositionsForTile = (mapX: number, mapY: number): BedouinTentLocation[] => {
  const district = getDistrictType(mapX, mapY);
  const tents: BedouinTentLocation[] = [];

  if (district === 'OUTSKIRTS_DESERT') {
    // OUTSKIRTS_DESERT: 1-2 tents always
    const seed = mapX * 73 + mapY * 139;
    const rand = (offset: number) => seededRandom(seed + offset);
    const tentCount = 1 + (rand(100) > 0.4 ? 1 : 0); // 1-2 tents

    for (let i = 0; i < tentCount; i++) {
      const angle = rand(110 + i) * Math.PI * 2;
      const distance = 12 + rand(120 + i) * 10;
      tents.push({
        pos: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance],
        seed: seed + i * 50,
        mapX,
        mapY
      });
    }
  } else if (district === 'OUTSKIRTS_SCRUBLAND') {
    // OUTSKIRTS_SCRUBLAND: 0-1 tent
    const seed = mapX * 89 + mapY * 151;
    const rand = (offset: number) => seededRandom(seed + offset);
    const hasTent = rand(600) > 0.5;

    if (hasTent) {
      // Use the same positioning logic as in OutskirtsScrublandDecor
      const areaHalf = 22;
      const trackAngle = rand(900) * Math.PI * 2;
      const trackDir: [number, number] = [Math.cos(trackAngle), Math.sin(trackAngle)];
      const trackPerp: [number, number] = [-trackDir[1], trackDir[0]];

      const t = (rand(610) - 0.5) * areaHalf * 1.4;
      const offset = (rand(620) - 0.5) * 6;

      tents.push({
        pos: [
          trackDir[0] * t + trackPerp[0] * offset,
          0,
          trackDir[1] * t + trackPerp[1] * offset
        ],
        seed: seed + 777,
        mapX,
        mapY
      });
    }
  } else if (district === 'OUTSKIRTS_FARMLAND') {
    // OUTSKIRTS_FARMLAND: 0-1 tent in outer perimeter
    const seed = mapX * 1000 + mapY * 100 + 911;
    let i = 0;
    const rand = () => seededRandom(seed + i++ * 37);

    // Skip to the tent generation part of the seed sequence
    for (let skip = 0; skip < 200; skip++) rand();

    const hasTent = rand() > 0.5;
    if (hasTent) {
      const angle = rand() * Math.PI * 2;
      const distance = 18 + rand() * 8; // Outer perimeter
      tents.push({
        pos: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance],
        seed: seed + 888,
        mapX,
        mapY
      });
    }
  }

  return tents;
};
