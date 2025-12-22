import { DistrictType } from '../types';
import { seededRandom } from './procedural';

export const getTerrainHeight = (
  district: DistrictType,
  x: number,
  z: number,
  seed: number
): number => {
  if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS') return 0;
  const s = seededRandom(seed) * 100;
  const f1 = district === 'OUTSKIRTS' ? 0.035 : 0.045;
  const f2 = district === 'OUTSKIRTS' ? 0.06 : 0.08;
  const h1 = Math.sin((x + s) * f1) * Math.cos((z - s) * f1) * 2.4;
  const h2 = Math.sin((x + z) * f2 + s * 0.3) * 1.2;
  const h3 = Math.cos((z - x) * 0.06 + s * 0.2) * 0.6;
  const scale = district === 'OUTSKIRTS' ? 0.65 : 0.55;
  return (h1 + h2 + h3) * scale;
};
