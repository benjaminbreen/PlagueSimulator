/**
 * Hanging Carpets for Market Districts
 *
 * In medieval Damascus markets, rug merchants displayed their wares by hanging
 * elaborate carpets between buildings, creating colorful canopies that were
 * both advertisement and shade.
 */

import { seededRandom } from './procedural';

export interface HangingCarpet {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  primaryColor: string;
  secondaryColor: string;
  patternType: 'geometric' | 'striped' | 'medallion';
  width: number; // Carpet width perpendicular to suspension
  windPhase: number;
  length: number;
  sag: number;
}

// Vibrant period-appropriate carpet colors from Damascus/Persian tradition
const CARPET_COLORS = {
  primary: [
    '#8b0000', // Deep red (most common)
    '#dc143c', // Crimson
    '#b8860b', // Dark goldenrod
    '#00008b', // Deep blue
    '#8b4513', // Saddle brown
    '#006400', // Dark green
  ],
  secondary: [
    '#daa520', // Goldenrod accent
    '#f5deb3', // Wheat/cream
    '#4169e1', // Royal blue
    '#228b22', // Forest green
    '#cd853f', // Peru/tan
    '#8b0000', // Dark red
  ],
};

/**
 * Generate a hanging carpet between two points
 */
export const generateHangingCarpet = (
  id: string,
  start: [number, number, number],
  end: [number, number, number],
  seed: number
): HangingCarpet => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);

  // Displayed carpets are kept taut to show patterns (less sag than laundry)
  const sag = 0.15 + length * 0.03;

  // Pick colors
  const primaryColor = CARPET_COLORS.primary[
    Math.floor(seededRandom(seed) * CARPET_COLORS.primary.length)
  ];
  const secondaryColor = CARPET_COLORS.secondary[
    Math.floor(seededRandom(seed + 1) * CARPET_COLORS.secondary.length)
  ];

  // Pattern type
  const patternRoll = seededRandom(seed + 2);
  const patternType = patternRoll < 0.4 ? 'geometric'
    : patternRoll < 0.7 ? 'medallion'
    : 'striped';

  // Carpet width (2-3.5 meters)
  const width = 2.0 + seededRandom(seed + 3) * 1.5;

  return {
    id,
    start,
    end,
    primaryColor,
    secondaryColor,
    patternType,
    width,
    windPhase: seededRandom(seed + 4) * Math.PI * 2,
    length,
    sag,
  };
};

/**
 * Calculate catenary curve position (same physics as laundry lines)
 */
export const getCarpetCatenaryPoint = (
  carpet: HangingCarpet,
  t: number // 0-1 along the line
): [number, number, number] => {
  const { start, end, length, sag } = carpet;

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

/**
 * Generate 4-5 hanging carpets for a market district
 * Returns valid carpet placements between buildings
 */
export const generateMarketCarpets = (
  buildings: Array<{ position: [number, number, number]; sizeScale?: number; storyCount?: number }>,
  mapX: number,
  mapY: number,
  sessionSeed: number
): HangingCarpet[] => {
  const seed = mapX * 1000 + mapY * 13 + sessionSeed + 7777;
  const carpets: HangingCarpet[] = [];

  // Target 4-5 carpets
  const targetCount = 4 + Math.floor(seededRandom(seed) * 2);

  // Shuffle buildings for random pairing
  const shuffled = [...buildings].sort(
    () => seededRandom(seed + carpets.length * 17) - 0.5
  );

  let attempts = 0;
  const maxAttempts = 50;

  for (let i = 0; i < shuffled.length - 1 && carpets.length < targetCount && attempts < maxAttempts; i++) {
    attempts++;

    const building1 = shuffled[i];
    const building2 = shuffled[i + 1];

    const dx = building2.position[0] - building1.position[0];
    const dz = building2.position[2] - building1.position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Only hang carpets between buildings 8-20 units apart
    if (distance < 8 || distance > 20) continue;

    // Calculate building sizes (default 3.5 units)
    const size1 = 3.5 * (building1.sizeScale ?? 1.0);
    const size2 = 3.5 * (building2.sizeScale ?? 1.0);

    // Calculate roof heights based on story count (3 units per story)
    const stories1 = building1.storyCount ?? 2;
    const stories2 = building2.storyCount ?? 2;
    const roofHeight1 = stories1 * 3.0;
    const roofHeight2 = stories2 * 3.0;

    // Calculate direction from building1 to building2
    const dirX = dx / distance;
    const dirZ = dz / distance;

    // Position anchor points at roof edges facing each other
    // Offset by half building size in the direction toward the other building
    const anchor1: [number, number, number] = [
      building1.position[0] + dirX * size1 * 0.5,
      roofHeight1 - 0.2, // Slightly below roof peak
      building1.position[2] + dirZ * size1 * 0.5
    ];

    const anchor2: [number, number, number] = [
      building2.position[0] - dirX * size2 * 0.5,
      roofHeight2 - 0.2,
      building2.position[2] - dirZ * size2 * 0.5
    ];

    const carpet = generateHangingCarpet(
      `carpet-${mapX}-${mapY}-${carpets.length}`,
      anchor1,
      anchor2,
      seed + i * 100
    );

    carpets.push(carpet);
  }

  return carpets;
};
