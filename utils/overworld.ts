import { DistrictType, getDistrictType } from '../types';
import { getBiomeForDistrict } from './eventTriggers';

export type OverworldBiome = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic';

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
  'OUTSKIRTS_DESERT'
]);

const INTERSTITIAL_DISTRICTS = new Set<DistrictType>([
  'ALLEYS',
  'RESIDENTIAL'
]);

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
  marketplace: { fill: '#b88b3a', stroke: '#f2c982' },
  wealthy: { fill: '#5f8096', stroke: '#b7d1e3' },
  hovels: { fill: '#7c4b3a', stroke: '#d7a18d' },
  desert: { fill: '#8a7a5f', stroke: '#e3cda6' },
  civic: { fill: '#4f6c87', stroke: '#9ac0dd' }
};
