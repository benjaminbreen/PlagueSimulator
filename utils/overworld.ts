import { DistrictType, getDistrictType } from '../types';
import { getBiomeForDistrict } from './eventTriggers';

export type OverworldBiome = 'marketplace' | 'religious' | 'wealthy' | 'hovels' | 'desert' | 'scrubland' | 'farmland' | 'civic' | 'road' | 'gate';

export type OverworldTile = {
  mapX: number;
  mapY: number;
  district: DistrictType;
  biome: OverworldBiome;
  label: string;
  isInterstitial: boolean;
  isMajor: boolean;
};

const MAJOR_DISTRICTS = new Set<DistrictType>([
  'MARKET',
  'UMAYYAD_MOSQUE',
  'CIVIC',
  'SALHIYYA',
  'JEWISH_QUARTER',
  'CHRISTIAN_QUARTER',
  'HOVELS',
  'WEALTHY',
  'CARAVANSERAI',
  'MOUNTAIN_SHRINE',
  'SOUTHERN_ROAD',
  'STRAIGHT_STREET',
  'SOUQ_AXIS',
  'MIDAN',
  'BAB_SHARQI',
  'OUTSKIRTS_FARMLAND',
  'OUTSKIRTS_DESERT',
  'OUTSKIRTS_SCRUBLAND',
  'RESIDENTIAL',
  'ROADSIDE',
  'ALLEYS'
]);

// These districts render slightly smaller/dimmer but still visible
const INTERSTITIAL_DISTRICTS = new Set<DistrictType>([]);

export const getDistrictLabel = (district: DistrictType) => {
  switch (district) {
    case 'MARKET': return 'Market';
    case 'UMAYYAD_MOSQUE': return 'Great Mosque';
    case 'CIVIC': return 'Civic';
    case 'SALHIYYA': return 'Al-Salihiyya';
    case 'JEWISH_QUARTER': return 'Jewish Quarter';
    case 'CHRISTIAN_QUARTER': return 'Christian Quarter';
    case 'HOVELS': return 'Hovels';
    case 'WEALTHY': return 'Wealthy Quarter';
    case 'CARAVANSERAI': return 'Caravanserai';
    case 'MOUNTAIN_SHRINE': return 'Mountain Shrine';
    case 'SOUTHERN_ROAD': return 'Southern Road';
    case 'STRAIGHT_STREET': return 'Straight Street';
    case 'SOUQ_AXIS': return 'Souq Axis';
    case 'MIDAN': return 'Al-Midan';
    case 'BAB_SHARQI': return 'Bab Sharqi';
    case 'OUTSKIRTS_FARMLAND': return 'Ghouta Farmlands';
    case 'OUTSKIRTS_DESERT': return 'Desert Outskirts';
    case 'OUTSKIRTS_SCRUBLAND': return 'Scrublands';
    case 'ROADSIDE': return 'Roadside';
    case 'ALLEYS': return 'Alleys';
    default: return 'Residential';
  }
};

export const buildOverworldGrid = (centerX: number, centerY: number, radius: number): OverworldTile[] => {
  const tiles: OverworldTile[] = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const mapX = centerX + dx;
      const mapY = centerY + dy;
      const district = getDistrictType(mapX, mapY);
      const biome = getBiomeForDistrict(district);
      tiles.push({
        mapX,
        mapY,
        district,
        biome,
        label: getDistrictLabel(district),
        isInterstitial: INTERSTITIAL_DISTRICTS.has(district),
        isMajor: MAJOR_DISTRICTS.has(district)
      });
    }
  }
  return tiles;
};

export const BIOME_COLORS: Record<OverworldBiome, { fill: string; stroke: string }> = {
  marketplace: { fill: '#d4a756', stroke: '#f2c982' },    // Amber/gold - markets
  religious: { fill: '#5a9a7a', stroke: '#8fc8b0' },      // Emerald green - mosques/shrines
  wealthy: { fill: '#6a5a8a', stroke: '#a89ac8' },        // Purple - wealth
  hovels: { fill: '#8a5a4a', stroke: '#c89070' },         // Brown - poor quarters
  desert: { fill: '#c8906a', stroke: '#e8c0a0' },         // Sandy orange - desert
  scrubland: { fill: '#7a8a5a', stroke: '#a8b890' },      // Olive green - scrubland
  farmland: { fill: '#6a9a5a', stroke: '#98c888' },       // Bright green - farms
  civic: { fill: '#6a7a9a', stroke: '#98a8c8' },          // Steel blue - citadel
  road: { fill: '#9a8a6a', stroke: '#c8b898' },           // Tan - roads
  gate: { fill: '#8a6a5a', stroke: '#b8a090' }            // Dark tan - gates
};
