/**
 * Geometry builders and geometric utility functions
 * Procedural mesh generation and shape helpers
 */

import * as THREE from 'three';

// ==================== TEXTURE GENERATORS ====================

/**
 * Generate a procedural noise texture
 */
export const createNoiseTexture = (size = 256, opacity = 0.2): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const val = Math.random() * 255;
    imageData.data[i] = val;
    imageData.data[i + 1] = val;
    imageData.data[i + 2] = val;
    imageData.data[i + 3] = 255 * opacity;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Create a radial grime/AO texture for building contact areas
 */
export const createGrimeTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const maxRadius = size * 0.48;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / maxRadius;

      if (normalizedDist <= 1.0) {
        const radialFade = 1 - normalizedDist;
        const noise = Math.random() * 0.25 + 0.75;
        const alpha = Math.pow(radialFade, 1.2) * noise;

        if (alpha > 0.05) {
          ctx.fillStyle = `rgba(15, 12, 8, ${alpha})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Create a blotch texture for surface variation
 */
export const createBlotchTexture = (size = 512): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 120;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Create a woven linen texture for fabric (awnings, textiles)
 */
export const createLinenTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fill with base white/cream
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const threadWidth = 3;
  const spacing = 4;

  // Draw woven pattern - horizontal threads
  for (let y = 0; y < size; y += spacing) {
    for (let x = 0; x < size; x += spacing * 2) {
      const brightness = 220 + Math.random() * 15; // Slight variation
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x, y, spacing, threadWidth);
    }
  }

  // Draw woven pattern - vertical threads (interlaced)
  for (let x = 0; x < size; x += spacing) {
    for (let y = 0; y < size; y += spacing * 2) {
      const brightness = 230 + Math.random() * 15; // Slightly brighter for over-thread
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x, y, threadWidth, spacing);
    }
  }

  // Add subtle noise for fabric texture
  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    imageData.data[i] += noise;     // R
    imageData.data[i + 1] += noise; // G
    imageData.data[i + 2] += noise; // B
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Tile the weave pattern
  return texture;
};

// ==================== SHAPE BUILDERS ====================

/**
 * Create a rounded box geometry (box with beveled edges)
 */
export const createRoundedBox = (
  width: number,
  height: number,
  depth: number,
  radius: number = 0.05,
  segments: number = 2
): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const hw = width / 2 - radius;
  const hh = height / 2 - radius;

  shape.moveTo(-hw, -hh + radius);
  shape.lineTo(-hw, hh - radius);
  shape.quadraticCurveTo(-hw, hh, -hw + radius, hh);
  shape.lineTo(hw - radius, hh);
  shape.quadraticCurveTo(hw, hh, hw, hh - radius);
  shape.lineTo(hw, -hh + radius);
  shape.quadraticCurveTo(hw, -hh, hw - radius, -hh);
  shape.lineTo(-hw + radius, -hh);
  shape.quadraticCurveTo(-hw, -hh, -hw, -hh + radius);

  const extrudeSettings = {
    depth,
    bevelEnabled: true,
    bevelThickness: radius,
    bevelSize: radius,
    bevelSegments: segments
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

/**
 * Create an octagonal prism (8-sided column)
 */
export const createOctagonalPrism = (
  radius: number,
  height: number
): THREE.BufferGeometry => {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
  return geometry;
};

/**
 * Create a dome geometry (hemisphere)
 */
export const createDome = (
  radius: number,
  segments: number = 16
): THREE.BufferGeometry => {
  const geometry = new THREE.SphereGeometry(
    radius,
    segments,
    segments,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  return geometry;
};

/**
 * Create an arch geometry
 */
export const createArch = (
  width: number,
  height: number,
  depth: number,
  archHeight: number = 0.6
): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  // Create arch shape
  const hw = width / 2;
  const archRadius = hw;
  const archTop = height * archHeight;

  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, archTop);
  shape.absarc(0, archTop, archRadius, Math.PI, 0, false);
  shape.lineTo(hw, 0);
  shape.lineTo(-hw, 0);

  const extrudeSettings = {
    depth,
    bevelEnabled: false
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

// ==================== CATENARY CURVE ====================

/**
 * Calculate a point on a catenary curve (for ropes, cables, laundry lines)
 * @param start Starting point
 * @param end Ending point
 * @param sag Amount of sag in the middle
 * @param t Parameter from 0 to 1
 */
export const getCatenaryPoint = (
  start: [number, number, number],
  end: [number, number, number],
  sag: number,
  t: number
): [number, number, number] => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);

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
 * Create a catenary curve geometry
 */
export const createCatenaryCurve = (
  start: [number, number, number],
  end: [number, number, number],
  sag: number,
  segments: number = 20
): THREE.BufferGeometry => {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = getCatenaryPoint(start, end, sag, t);
    points.push(new THREE.Vector3(point[0], point[1], point[2]));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
};

// ==================== GEOMETRIC UTILITIES ====================

/**
 * Calculate surface normal from three points
 */
export const calculateNormal = (
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): THREE.Vector3 => {
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  return new THREE.Vector3().crossVectors(v1, v2).normalize();
};

/**
 * Create a ring of points around a center
 */
export const createRingPoints = (
  center: [number, number, number],
  radius: number,
  count: number,
  startAngle: number = 0
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[2] + Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, center[1], z));
  }

  return points;
};

/**
 * Subdivide a line into segments
 */
export const subdivideLine = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);
    points.push(point);
  }

  return points;
};

/**
 * Calculate bounding box dimensions from geometry
 */
export const getGeometryBounds = (
  geometry: THREE.BufferGeometry
): { width: number; height: number; depth: number } => {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  return {
    width: bbox.max.x - bbox.min.x,
    height: bbox.max.y - bbox.min.y,
    depth: bbox.max.z - bbox.min.z
  };
};

/**
 * Center geometry at origin
 */
export const centerGeometry = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const center = new THREE.Vector3(
    (bbox.max.x + bbox.min.x) / 2,
    (bbox.max.y + bbox.min.y) / 2,
    (bbox.max.z + bbox.min.z) / 2
  );
  geometry.translate(-center.x, -center.y, -center.z);
  return geometry;
};
