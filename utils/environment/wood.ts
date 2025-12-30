import * as THREE from 'three';
import { seededRandom } from '../procedural';

// Wood color presets: [R, G, B] base values - all lightened for visibility
type WoodColor = 'walnut' | 'oak' | 'maple' | 'bleached';
const WOOD_COLORS: Record<WoodColor, [number, number, number]> = {
  walnut: [110, 75, 50],     // Dark walnut - warm brown (lightened)
  oak: [150, 115, 80],       // Medium oak - warm tan
  maple: [185, 155, 115],    // Light maple - golden honey
  bleached: [215, 200, 180], // Pale sunbleached - whitewashed
};

// Create wood texture with specific color
const createColoredWoodTexture = (color: WoodColor) => {
  const [baseR, baseG, baseB] = WOOD_COLORS[color];
  const canvas = document.createElement('canvas');
  const width = 256, height = 256;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // First pass: mottled noise base
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);

    const lowFreq = Math.sin(x * 0.02) * Math.cos(y * 0.015) * 0.3;
    const medFreq = Math.sin(x * 0.1 + y * 0.02) * 0.2;
    const highFreq = (Math.random() - 0.5) * 0.25;
    const variation = 1 + lowFreq + medFreq + highFreq;

    imageData.data[i] = Math.min(255, Math.max(0, baseR * variation));
    imageData.data[i + 1] = Math.min(255, Math.max(0, baseG * variation));
    imageData.data[i + 2] = Math.min(255, Math.max(0, baseB * variation));
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Second pass: vertical grain lines
  ctx.globalCompositeOperation = 'multiply';
  for (let x = 0; x < width; x += 3) {
    const grainStrength = 0.85 + Math.sin(x * 0.5) * 0.1 + Math.random() * 0.05;
    ctx.strokeStyle = `rgba(${Math.floor(baseR * grainStrength)}, ${Math.floor(baseG * grainStrength)}, ${Math.floor(baseB * grainStrength)}, 0.4)`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    let y = 0;
    const waveOffset = Math.random() * Math.PI * 2;
    ctx.moveTo(x, y);
    while (y < height) {
      ctx.lineTo(x + Math.sin(y * 0.03 + waveOffset) * 2, y);
      y += 3;
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Third pass: wood knots
  const knotCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < knotCount; i++) {
    const kx = 30 + Math.random() * (width - 60);
    const ky = 40 + Math.random() * (height - 80);
    const knotSize = 8 + Math.random() * 12;

    const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, knotSize);
    gradient.addColorStop(0, `rgba(${baseR * 0.4}, ${baseG * 0.4}, ${baseB * 0.4}, 0.9)`);
    gradient.addColorStop(0.4, `rgba(${baseR * 0.6}, ${baseG * 0.6}, ${baseB * 0.6}, 0.6)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(kx, ky, knotSize, knotSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 1; ring < 5; ring++) {
      ctx.strokeStyle = `rgba(${baseR * 0.7}, ${baseG * 0.7}, ${baseB * 0.7}, ${0.2 / ring})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, knotSize + ring * 5, (knotSize + ring * 5) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Fourth pass: weathering
  const weatherGradient = ctx.createLinearGradient(0, height * 0.75, 0, height);
  weatherGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  weatherGradient.addColorStop(1, 'rgba(20, 15, 10, 0.35)');
  ctx.fillStyle = weatherGradient;
  ctx.fillRect(0, height * 0.75, width, height * 0.25);

  const edgeGradientL = ctx.createLinearGradient(0, 0, width * 0.1, 0);
  edgeGradientL.addColorStop(0, 'rgba(20, 15, 10, 0.2)');
  edgeGradientL.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = edgeGradientL;
  ctx.fillRect(0, 0, width * 0.1, height);

  const edgeGradientR = ctx.createLinearGradient(width * 0.9, 0, width, 0);
  edgeGradientR.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edgeGradientR.addColorStop(1, 'rgba(20, 15, 10, 0.2)');
  ctx.fillStyle = edgeGradientR;
  ctx.fillRect(width * 0.9, 0, width * 0.1, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Cached wood textures - four color variants
const CACHED_WOOD_TEXTURES = {
  walnut: createColoredWoodTexture('walnut'),    // Dark
  oak: createColoredWoodTexture('oak'),          // Medium
  maple: createColoredWoodTexture('maple'),      // Light golden
  bleached: createColoredWoodTexture('bleached'), // Pale sunbleached
};

// Get wood texture based on building characteristics and seed
export const getWoodTexture = (district: string, buildingType: number, seed: number) => {
  const roll = seededRandom(seed + 500);

  // Wealthy areas - mix of dark prestigious woods AND pale bleached (sunbleached is fashionable)
  if (district === 'WEALTHY' || district === 'SALHIYYA') {
    if (roll > 0.7) return CACHED_WOOD_TEXTURES.walnut;
    if (roll > 0.4) return CACHED_WOOD_TEXTURES.bleached; // Pale is prestigious too
    return CACHED_WOOD_TEXTURES.oak;
  }

  // Religious buildings - darker, more somber
  if (buildingType === 3) { // RELIGIOUS
    if (roll > 0.5) return CACHED_WOOD_TEXTURES.walnut;
    return CACHED_WOOD_TEXTURES.oak;
  }

  // Poor areas - weathered lighter woods
  if (district === 'HOVELS') {
    if (roll > 0.6) return CACHED_WOOD_TEXTURES.bleached; // Sun-damaged
    if (roll > 0.3) return CACHED_WOOD_TEXTURES.maple;
    return CACHED_WOOD_TEXTURES.oak;
  }

  // Default: full variety
  if (roll > 0.75) return CACHED_WOOD_TEXTURES.walnut;
  if (roll > 0.5) return CACHED_WOOD_TEXTURES.oak;
  if (roll > 0.25) return CACHED_WOOD_TEXTURES.maple;
  return CACHED_WOOD_TEXTURES.bleached;
};
