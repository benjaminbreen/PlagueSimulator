import * as THREE from 'three';

export const buildWallWithDoorGeometry = (
  width: number,
  height: number,
  doorWidth: number,
  doorHeight: number,
  thickness: number,
  arch: boolean
) => {
  const halfW = width / 2;
  const baseY = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, baseY);
  shape.lineTo(halfW, baseY);
  shape.lineTo(halfW, baseY + height);
  shape.lineTo(-halfW, baseY + height);
  shape.lineTo(-halfW, baseY);

  const hole = new THREE.Path();
  if (arch) {
    const radius = Math.min(doorWidth / 2, doorHeight * 0.5);
    const rectHeight = Math.max(doorHeight - radius, 0.4);
    hole.moveTo(-doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY + rectHeight);
    hole.absarc(0, baseY + rectHeight, radius, 0, Math.PI, false);
    hole.lineTo(-doorWidth / 2, baseY);
  } else {
    hole.moveTo(-doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY + doorHeight);
    hole.lineTo(-doorWidth / 2, baseY + doorHeight);
    hole.lineTo(-doorWidth / 2, baseY);
  }
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
};

// Grand civic archway with authentic 14th century Islamic arch shapes
export const buildWallWithGrandArchway = (
  width: number,
  height: number,
  thickness: number,
  archType: number // 0=horseshoe, 1=pointed, 2=multifoil, 3=ogee
) => {
  const halfW = width / 2;
  const baseY = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, baseY);
  shape.lineTo(halfW, baseY);
  shape.lineTo(halfW, baseY + height);
  shape.lineTo(-halfW, baseY + height);
  shape.lineTo(-halfW, baseY);

  // Grand archway dimensions - much larger than regular doors
  const archWidth = Math.min(width * 0.65, 3.4);
  const archHeight = Math.min(height * 0.95, 3.6);
  const halfArchW = archWidth / 2;

  const hole = new THREE.Path();

  if (archType === 0) {
    // Horseshoe arch (characteristic of Islamic architecture)
    const radius = archWidth * 0.52;
    const centerY = baseY + archHeight - radius * 0.92;
    const startAngle = Math.PI + 0.3;
    const endAngle = -0.3;

    hole.moveTo(-halfArchW, baseY);
    hole.lineTo(-halfArchW, centerY);
    hole.absarc(0, centerY, radius, startAngle, endAngle, false);
    hole.lineTo(halfArchW, baseY);
    hole.lineTo(-halfArchW, baseY);
  } else if (archType === 1) {
    // Pointed arch (Gothic/Islamic pointed)
    const peakHeight = baseY + archHeight;
    const shoulderHeight = baseY + archHeight * 0.65;

    hole.moveTo(-halfArchW, baseY);
    hole.lineTo(-halfArchW, shoulderHeight);
    hole.quadraticCurveTo(-halfArchW * 0.3, peakHeight - 0.2, 0, peakHeight);
    hole.quadraticCurveTo(halfArchW * 0.3, peakHeight - 0.2, halfArchW, shoulderHeight);
    hole.lineTo(halfArchW, baseY);
    hole.lineTo(-halfArchW, baseY);
  } else if (archType === 2) {
    // Multifoil arch (scalloped lobes)
    const lobes = 5;
    const radius = archWidth / (lobes * 1.8);
    const centerY = baseY + archHeight - radius;

    hole.moveTo(-halfArchW, baseY);
    hole.lineTo(-halfArchW, centerY - radius * 0.5);

    for (let i = 0; i < lobes; i++) {
      const angle = Math.PI / (lobes - 1) * i;
      const x = -halfArchW + (archWidth / (lobes - 1)) * i;
      const lobeCenterY = centerY - radius * 0.3;
      const startAngle = Math.PI - angle * 0.3;
      const endAngle = angle * 0.3;
      hole.absarc(x, lobeCenterY, radius, startAngle, endAngle, false);
    }

    hole.lineTo(halfArchW, baseY);
    hole.lineTo(-halfArchW, baseY);
  } else {
    // Ogee arch (S-curved, characteristic of later Islamic architecture)
    const peakHeight = baseY + archHeight;
    const inflectionY = baseY + archHeight * 0.7;

    hole.moveTo(-halfArchW, baseY);
    hole.lineTo(-halfArchW, baseY + archHeight * 0.3);
    hole.bezierCurveTo(
      -halfArchW * 1.2, inflectionY - 0.4,
      -halfArchW * 0.4, inflectionY + 0.2,
      0, peakHeight
    );
    hole.bezierCurveTo(
      halfArchW * 0.4, inflectionY + 0.2,
      halfArchW * 1.2, inflectionY - 0.4,
      halfArchW, baseY + archHeight * 0.3
    );
    hole.lineTo(halfArchW, baseY);
    hole.lineTo(-halfArchW, baseY);
  }

  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
};

export const darkenHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
