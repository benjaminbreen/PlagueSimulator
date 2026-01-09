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
export const CACHED_WOOD_TEXTURES = {
  walnut: createColoredWoodTexture('walnut'),    // Dark
  oak: createColoredWoodTexture('oak'),          // Medium
  maple: createColoredWoodTexture('maple'),      // Light golden
  bleached: createColoredWoodTexture('bleached'), // Pale sunbleached
};

// Get wood texture based on building characteristics and seed
// ==================== FOLIAGE TEXTURE ====================
// Simple procedural leaf texture for tree canopies

const createFoliageTexture = () => {
  const canvas = document.createElement('canvas');
  const width = 256, height = 256;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base green with noise
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);

    // Multi-frequency noise for organic look
    const noise1 = Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.15;
    const noise2 = Math.sin(x * 0.4 + y * 0.3) * 0.1;
    const noise3 = (Math.random() - 0.5) * 0.15;
    const variation = 1 + noise1 + noise2 + noise3;

    // Base green color
    const baseR = 55, baseG = 85, baseB = 50;
    imageData.data[i] = Math.min(255, Math.max(0, baseR * variation));
    imageData.data[i + 1] = Math.min(255, Math.max(0, baseG * variation));
    imageData.data[i + 2] = Math.min(255, Math.max(0, baseB * variation));
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Add leaf-like spots (darker shadow patches)
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 8 + Math.random() * 20;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(30, 50, 30, 0.4)');
    gradient.addColorStop(0.6, 'rgba(40, 60, 35, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add lighter highlight spots (sun hitting leaves)
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 5 + Math.random() * 12;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(120, 150, 80, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Cached foliage texture
export const CACHED_FOLIAGE_TEXTURE = createFoliageTexture();

// Pre-made foliage material for tree canopies
export const FOLIAGE_MATERIAL = new THREE.MeshStandardMaterial({
  map: CACHED_FOLIAGE_TEXTURE,
  roughness: 0.85,
  color: new THREE.Color('#4a6a3a'),
});

// Darker variant for cypress/pine
export const DARK_FOLIAGE_MATERIAL = new THREE.MeshStandardMaterial({
  map: CACHED_FOLIAGE_TEXTURE,
  roughness: 0.9,
  color: new THREE.Color('#3a5a3a'),
});

// ==================== GRASS TEXTURE ====================
// Ground texture for grassy districts (Salhiyya, Wealthy, etc.)

const createGrassTexture = () => {
  const canvas = document.createElement('canvas');
  const width = 512, height = 512;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Simple seeded random for consistent but non-repeating noise
  const seededNoise = (x: number, y: number, seed: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  // Base green with pure random variation (no sin/cos patterns)
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);

    // Use seeded noise at different scales for organic variation
    const noise1 = (seededNoise(x * 0.02, y * 0.02, 1) - 0.5) * 0.25;
    const noise2 = (seededNoise(x * 0.08, y * 0.08, 2) - 0.5) * 0.15;
    const noise3 = (Math.random() - 0.5) * 0.12;
    const variation = 1 + noise1 + noise2 + noise3;

    // Greener base color
    const baseR = 65, baseG = 115, baseB = 50;
    imageData.data[i] = Math.min(255, Math.max(0, baseR * variation));
    imageData.data[i + 1] = Math.min(255, Math.max(0, baseG * variation));
    imageData.data[i + 2] = Math.min(255, Math.max(0, baseB * variation));
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Add grass blade streaks - more random angles to avoid stripe patterns
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const length = 8 + Math.random() * 18;
    // More varied angles to break up any stripe patterns
    const angle = Math.random() * Math.PI * 2;

    const gradient = ctx.createLinearGradient(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    const brightness = 0.3 + Math.random() * 0.25;
    gradient.addColorStop(0, `rgba(${50 + Math.random() * 40}, ${90 + Math.random() * 50}, ${40 + Math.random() * 30}, ${brightness})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  // Add irregular darker patches (shadows/bare spots) - more organic shapes
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 15 + Math.random() * 35;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(50, 75, 35, 0.3)');
    gradient.addColorStop(0.5, 'rgba(60, 85, 45, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Random ellipse rotation and aspect ratio
    ctx.ellipse(x, y, size, size * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add lighter patches - fewer and more subtle
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 12 + Math.random() * 25;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(100, 140, 70, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add tiny details (subtle, not too many)
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = `rgba(${50 + Math.random() * 30}, ${80 + Math.random() * 40}, ${40 + Math.random() * 20}, 0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); // Slightly less tiling to reduce repetition visibility
  return texture;
};

// Cached grass texture
export const CACHED_GRASS_TEXTURE = createGrassTexture();

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
