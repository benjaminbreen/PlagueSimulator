import { DistrictType } from '../types';
import { seededRandom } from './procedural';
import * as THREE from 'three';

// Heightmap grid for bilinear interpolation - matches terrain mesh exactly
export interface TerrainHeightmap {
  grid: number[][];
  gridSize: number;      // Total world space size (e.g., 250)
  segments: number;      // Number of grid cells (e.g., 120)
  cellSize: number;      // Size of each grid cell in world space
  minX: number;          // World space bounds
  minZ: number;
  maxX: number;
  maxZ: number;
}

// Raw terrain height function - used to BUILD the heightmap
export const getTerrainHeight = (
  district: DistrictType,
  x: number,
  z: number,
  seed: number
): number => {
  if (district !== 'SALHIYYA' && district !== 'OUTSKIRTS_FARMLAND' && district !== 'OUTSKIRTS_DESERT' && district !== 'MOUNTAIN_SHRINE') return 0;
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

  const isOutskirts = district === 'OUTSKIRTS_FARMLAND' || district === 'OUTSKIRTS_DESERT';
  const f1 = isOutskirts ? 0.035 : 0.045;
  const f2 = isOutskirts ? 0.06 : 0.08;
  const h1 = Math.sin((x + s) * f1) * Math.cos((z - s) * f1) * 2.4;
  const h2 = Math.sin((x + z) * f2 + s * 0.3) * 1.2;
  const h3 = Math.cos((z - x) * 0.06 + s * 0.2) * 0.6;
  const scale = isOutskirts ? 0.65 : 1.1;
  return (h1 + h2 + h3) * scale;
};

// Build heightmap from terrain geometry - extracts actual vertex heights
export const buildHeightmapFromGeometry = (
  geometry: THREE.PlaneGeometry,
  gridSize: number,
  segments: number
): TerrainHeightmap => {
  const grid: number[][] = [];
  const pos = geometry.attributes.position as THREE.BufferAttribute;

  // PlaneGeometry vertices are arranged in a grid
  // With segments=120, we have 121x121 vertices (segments+1)
  const verticesPerSide = segments + 1;

  for (let z = 0; z < verticesPerSide; z++) {
    const row: number[] = [];
    for (let x = 0; x < verticesPerSide; x++) {
      const vertexIndex = z * verticesPerSide + x;
      const height = pos.getZ(vertexIndex); // Z is height in PlaneGeometry
      row.push(height);
    }
    grid.push(row);
  }

  const halfSize = gridSize / 2;
  const cellSize = gridSize / segments;

  return {
    grid,
    gridSize,
    segments,
    cellSize,
    minX: -halfSize,
    minZ: -halfSize,
    maxX: halfSize,
    maxZ: halfSize,
  };
};

// Bilinear interpolation sampling - matches GPU rendering exactly
export const sampleTerrainHeight = (
  heightmap: TerrainHeightmap | null,
  x: number,
  z: number
): number => {
  if (!heightmap) return 0;

  // Convert world coordinates to grid coordinates
  const gx = (x - heightmap.minX) / heightmap.cellSize;
  const gz = (z - heightmap.minZ) / heightmap.cellSize;

  // Clamp to valid range
  const clampedGx = Math.max(0, Math.min(heightmap.segments, gx));
  const clampedGz = Math.max(0, Math.min(heightmap.segments, gz));

  // Get cell indices (floor)
  const x0 = Math.floor(clampedGx);
  const z0 = Math.floor(clampedGz);
  const x1 = Math.min(x0 + 1, heightmap.segments);
  const z1 = Math.min(z0 + 1, heightmap.segments);

  // Get fractional position within cell (0-1)
  const fx = clampedGx - x0;
  const fz = clampedGz - z0;

  // Get heights at 4 corners of the cell
  const h00 = heightmap.grid[z0][x0];
  const h10 = heightmap.grid[z0][x1];
  const h01 = heightmap.grid[z1][x0];
  const h11 = heightmap.grid[z1][x1];

  // Bilinear interpolation (same as GPU does for triangle mesh)
  const h0 = h00 * (1 - fx) + h10 * fx;  // Interpolate along x at z0
  const h1 = h01 * (1 - fx) + h11 * fx;  // Interpolate along x at z1
  return h0 * (1 - fz) + h1 * fz;        // Interpolate along z
};
