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

export const darkenHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
