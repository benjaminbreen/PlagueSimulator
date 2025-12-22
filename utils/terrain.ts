import { DistrictType } from '../types';
import { seededRandom } from './procedural';

export const getTerrainHeight = (
  district: DistrictType,
  x: number,
  z: number,
  seed: number
): number => {
  if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS' && district !== 'MOUNTAIN_SHRINE') return 0;
  const s = seededRandom(seed) * 100;

  // Mountain shrine: gentle hilly terrain rising toward center
  if (district === 'MOUNTAIN_SHRINE') {
    const distFromCenter = Math.sqrt(x * x + z * z);
    // Create main hill rising to peak at center (gentler slope)
    const hillHeight = Math.max(0, 6 - distFromCenter * 0.08);
    // Add rolling terrain with multiple frequencies (reduced amplitude)
    const h1 = Math.sin((x + s) * 0.06) * Math.cos((z - s) * 0.06) * 1.5;
    const h2 = Math.sin((x + z) * 0.09 + s * 0.3) * 1.0;
    const h3 = Math.cos((z - x) * 0.07 + s * 0.25) * 0.8;
    const h4 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.7; // Large rolling hills
    return hillHeight + h1 + h2 + h3 + h4;
  }

  const f1 = district === 'OUTSKIRTS' ? 0.035 : 0.045;
  const f2 = district === 'OUTSKIRTS' ? 0.06 : 0.08;
  const h1 = Math.sin((x + s) * f1) * Math.cos((z - s) * f1) * 2.4;
  const h2 = Math.sin((x + z) * f2 + s * 0.3) * 1.2;
  const h3 = Math.cos((z - x) * 0.06 + s * 0.2) * 0.6;
  const scale = district === 'OUTSKIRTS' ? 0.65 : 0.55;
  return (h1 + h2 + h3) * scale;
};
