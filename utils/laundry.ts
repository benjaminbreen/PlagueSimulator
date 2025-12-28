import { DistrictType } from '../types';
import { seededRandom } from './procedural';

export type ClothType = 'tunic' | 'scarf' | 'sheet' | 'cloth' | 'child';

export interface ClothItem {
  type: ClothType;
  position: number; // 0-1 along rope
  color: string;
  size: [number, number];
  swayPhase: number;
  rotation: number;
}

export interface LaundryLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  clothItems: ClothItem[];
  windPhase: number;
  length: number;
  sag: number;
}

// District-specific color palettes
const CLOTH_COLORS: Record<DistrictType, string[]> = {
  MARKET: ['#d8c8b8', '#c8b8a8', '#b8a898', '#a89888'],
  WEALTHY: ['#c85a4a', '#5a7a8a', '#8a6a9a', '#e8d8c8', '#d8c8b8'],
  HOVELS: ['#6a5a4a', '#8a7a6a', '#5a4a3a', '#7a6a5a'],
  ALLEYS: ['#7a6a5a', '#9a8a7a', '#6a5a4a', '#8a7a6a'],
  JEWISH_QUARTER: ['#7a6a5a', '#9a8a7a', '#6a5a4a', '#8a7a6a'],
  RESIDENTIAL: ['#d8c8b8', '#e8d8c8', '#c8b8a8', '#b8a898'],
  CIVIC: ['#c8b8a8', '#d8c8b8', '#b8a898'],
  UMAYYAD_MOSQUE: ['#e8d8c8', '#d8c8b8', '#c8b8a8'],
  SALHIYYA: ['#c8b8a8', '#b8a898', '#d8c8b8'],
  OUTSKIRTS_FARMLAND: ['#8a7a6a', '#9a8a7a', '#7a6a5a'],
  OUTSKIRTS_DESERT: ['#9a8872', '#a4937c', '#8f7f6b'],
  MOUNTAIN_SHRINE: ['#b8a898', '#c8b8a8'],
  CARAVANSERAI: ['#a89888', '#b8a898', '#c8b8a8'],
  CHRISTIAN_QUARTER: ['#7a6a5a', '#9a8a7a', '#6a5a4a', '#8a7a6a'],
  SOUTHERN_ROAD: ['#9a8872', '#a4937c', '#8f7f6b'],
};

// District-specific density (percentage of valid building pairs)
const LINE_DENSITY: Record<DistrictType, number> = {
  HOVELS: 0.7,
  ALLEYS: 0.6,
  JEWISH_QUARTER: 0.6,
  RESIDENTIAL: 0.4,
  MARKET: 0.2,
  WEALTHY: 0.1,
  CIVIC: 0.15,
  UMAYYAD_MOSQUE: 0.2,
  SALHIYYA: 0.3,
  OUTSKIRTS_FARMLAND: 0.4,
  OUTSKIRTS_DESERT: 0.2,
  MOUNTAIN_SHRINE: 0.2,
  CARAVANSERAI: 0.3,
  CHRISTIAN_QUARTER: 0.6,
  SOUTHERN_ROAD: 0.3,
};

export const shouldGenerateLaundryLine = (district: DistrictType, seed: number): boolean => {
  const density = LINE_DENSITY[district] || 0.3;
  return seededRandom(seed) < density;
};

export const getClothColors = (district: DistrictType): string[] => {
  return CLOTH_COLORS[district] || CLOTH_COLORS.RESIDENTIAL;
};

export const createClothItem = (
  type: ClothType,
  position: number,
  color: string,
  seed: number
): ClothItem => {
  const sizes: Record<ClothType, [number, number]> = {
    tunic: [0.8, 1.2],
    scarf: [0.6, 0.6],
    sheet: [1.2, 1.4],
    cloth: [0.5, 0.7],
    child: [0.5, 0.8],
  };

  return {
    type,
    position,
    color,
    size: sizes[type],
    swayPhase: seededRandom(seed) * Math.PI * 2,
    rotation: (seededRandom(seed + 1) - 0.5) * 0.3,
  };
};

export const generateLaundryLine = (
  id: string,
  start: [number, number, number],
  end: [number, number, number],
  district: DistrictType,
  seed: number
): LaundryLine => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const sag = 0.3 + length * 0.05; // Natural rope sag

  // Generate cloth items
  const colors = getClothColors(district);
  const clothTypes: ClothType[] = ['tunic', 'scarf', 'sheet', 'cloth', 'child'];
  const itemCount = 3 + Math.floor(seededRandom(seed + 10) * 5); // 3-7 items
  const clothItems: ClothItem[] = [];

  for (let i = 0; i < itemCount; i++) {
    const position = (i + 1) / (itemCount + 1); // Evenly spaced
    const type = clothTypes[Math.floor(seededRandom(seed + 20 + i) * clothTypes.length)];
    const color = colors[Math.floor(seededRandom(seed + 30 + i) * colors.length)];

    clothItems.push(createClothItem(type, position, color, seed + 40 + i));
  }

  return {
    id,
    start,
    end,
    clothItems,
    windPhase: seededRandom(seed + 100) * Math.PI * 2,
    length,
    sag,
  };
};

// Calculate catenary curve position
export const getCatenaryPoint = (
  line: LaundryLine,
  t: number // 0-1 along the line
): [number, number, number] => {
  const { start, end, length, sag } = line;

  // Linear interpolation for x and z
  const x = start[0] + (end[0] - start[0]) * t;
  const z = start[2] + (end[2] - start[2]) * t;

  // Catenary curve for y (sag in middle)
  const a = length / (2 * sag);
  const xOffset = (t - 0.5) * length;
  const catenaryY = a * (Math.cosh(xOffset / a) - 1);
  const y = start[1] - catenaryY;

  return [x, y, z];
};
