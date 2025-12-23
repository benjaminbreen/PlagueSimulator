import { TerrainHeightmap, sampleTerrainHeight } from './terrain';
import * as THREE from 'three';

// Sample spacing for gradient calculation (in world units)
const GRADIENT_SAMPLE_DISTANCE = 0.5;

export interface TerrainGradient {
  slope: THREE.Vector3; // Direction and magnitude of steepest descent
  slopeAngle: number;   // Angle in radians (0 = flat, PI/2 = vertical)
  normal: THREE.Vector3; // Surface normal
}

export const calculateTerrainGradient = (
  heightmap: TerrainHeightmap | null,
  x: number,
  z: number
): TerrainGradient => {
  if (!heightmap) {
    return {
      slope: new THREE.Vector3(0, 0, 0),
      slopeAngle: 0,
      normal: new THREE.Vector3(0, 1, 0)
    };
  }

  // Sample heights in 4 cardinal directions
  const h = sampleTerrainHeight(heightmap, x, z);
  const hNorth = sampleTerrainHeight(heightmap, x, z + GRADIENT_SAMPLE_DISTANCE);
  const hSouth = sampleTerrainHeight(heightmap, x, z - GRADIENT_SAMPLE_DISTANCE);
  const hEast = sampleTerrainHeight(heightmap, x + GRADIENT_SAMPLE_DISTANCE, z);
  const hWest = sampleTerrainHeight(heightmap, x - GRADIENT_SAMPLE_DISTANCE, z);

  // Calculate gradient (rise over run)
  const dx = (hEast - hWest) / (2 * GRADIENT_SAMPLE_DISTANCE);
  const dz = (hNorth - hSouth) / (2 * GRADIENT_SAMPLE_DISTANCE);

  // Downhill direction (negative gradient = descent)
  const slope = new THREE.Vector3(-dx, 0, -dz);
  const slopeMagnitude = slope.length();

  // Calculate slope angle (atan of rise/run)
  const slopeAngle = Math.atan(slopeMagnitude);

  // Calculate surface normal (perpendicular to slope)
  const normal = new THREE.Vector3(-dx, 1, -dz).normalize();

  return { slope, slopeAngle, normal };
};
