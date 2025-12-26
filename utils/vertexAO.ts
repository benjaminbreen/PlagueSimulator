import * as THREE from 'three';

export interface AOParams {
  cornerDarkening: number;   // 0-1: How dark corners get (0.3 = 30% darker)
  edgeDarkening: number;     // 0-1: How dark edges get
  bottomDarkening: number;   // 0-1: Ground contact AO
  topBrightening: number;    // 0-1: Sky-facing surfaces get lighter
}

export const DEFAULT_AO: AOParams = {
  cornerDarkening: 0.35,    // Corners 35% darker
  edgeDarkening: 0.15,      // Edges 15% darker
  bottomDarkening: 0.45,    // Bottom 45% darker (ground contact)
  topBrightening: 0.10,     // Top 10% brighter (sky exposure)
};

/**
 * Bake ambient occlusion into box geometry vertex colors
 * Box vertices are at 8 corners - we darken based on:
 * - Y position (ground contact)
 * - Corner vs face-center (geometric occlusion)
 * - Edge proximity
 */
export function bakeBoxAO(
  geometry: THREE.BoxGeometry,
  params: AOParams = DEFAULT_AO
): THREE.BoxGeometry {
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;

  // Create color attribute
  const colors = new Float32Array(vertexCount * 3);

  // Get box bounds
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const sizeY = box.max.y - box.min.y;

  for (let i = 0; i < vertexCount; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    // Normalize positions to 0-1
    const normY = (y - box.min.y) / sizeY;

    // Calculate occlusion factors
    let ao = 1.0; // Start with full brightness

    // BOTTOM DARKENING: Ground contact (quadratic falloff)
    const bottomFactor = Math.pow(1 - normY, 2);
    ao *= 1 - (bottomFactor * params.bottomDarkening);

    // TOP BRIGHTENING: Sky exposure (inverse of bottom)
    const topFactor = Math.pow(normY, 2);
    ao *= 1 + (topFactor * params.topBrightening);

    // CORNER DETECTION: Check if vertex is near box corner
    const isNearCornerX = Math.abs(Math.abs(x) - Math.abs(box.max.x)) < 0.01;
    const isNearCornerZ = Math.abs(Math.abs(z) - Math.abs(box.max.z)) < 0.01;
    const isCorner = isNearCornerX && isNearCornerZ;

    if (isCorner) {
      ao *= 1 - params.cornerDarkening;
    }

    // EDGE DETECTION: On edge but not corner
    const isEdge = (isNearCornerX || isNearCornerZ) && !isCorner;
    if (isEdge) {
      ao *= 1 - params.edgeDarkening;
    }

    // Clamp to reasonable range
    ao = THREE.MathUtils.clamp(ao, 0.3, 1.1);

    // Set RGB (all same value for monochrome AO)
    colors[i * 3] = ao;
    colors[i * 3 + 1] = ao;
    colors[i * 3 + 2] = ao;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geometry;
}

/**
 * Variant for tall buildings - exaggerate vertical gradient
 */
export function bakeBoxAO_TallBuilding(
  geometry: THREE.BoxGeometry,
  heightMultiplier: number = 1.5
): THREE.BoxGeometry {
  return bakeBoxAO(geometry, {
    cornerDarkening: 0.35,
    edgeDarkening: 0.15,
    bottomDarkening: Math.min(0.65, 0.55 * heightMultiplier), // Stronger ground contact
    topBrightening: 0.15,
  });
}

/**
 * Variant for civic buildings - cleaner, less dramatic
 */
export function bakeBoxAO_Civic(geometry: THREE.BoxGeometry): THREE.BoxGeometry {
  return bakeBoxAO(geometry, {
    cornerDarkening: 0.25,  // Less dramatic
    edgeDarkening: 0.10,
    bottomDarkening: 0.35,
    topBrightening: 0.12,   // Brighter whitewash
  });
}
