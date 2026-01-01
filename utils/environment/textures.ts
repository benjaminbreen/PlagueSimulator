import * as THREE from 'three';

const createStripeTexture = (colorA: string, colorB: string, stripeCount = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stripeWidth = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

export const CACHED_STRIPE_TEXTURES = [
  createStripeTexture('#ead9b7', '#cdb68f'),
  createStripeTexture('#e0cdaa', '#bca888'),
  createStripeTexture('#e2d3b2', '#b7b79a')
];

// Islamic geometric pattern for decorative bands - 8-pointed star interlace
const createGeometricBandTexture = (
  bgColor: string,
  patternColor: string,
  accentColor: string
) => {
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size * 2; // Wide for horizontal tiling
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellSize = size / 2;

  // Draw repeating 8-pointed star pattern
  for (let cx = 0; cx < 4; cx++) {
    const centerX = cx * cellSize + cellSize / 2;
    const centerY = size / 2;

    ctx.strokeStyle = patternColor;
    ctx.lineWidth = 3;

    // 8-pointed star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const outerR = cellSize * 0.4;
      const innerR = cellSize * 0.2;

      const outerX = centerX + Math.cos(angle) * outerR;
      const outerY = centerY + Math.sin(angle) * outerR;
      const innerAngle = angle + Math.PI / 8;
      const innerX = centerX + Math.cos(innerAngle) * innerR;
      const innerY = centerY + Math.sin(innerAngle) * innerR;

      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.stroke();

    // Center dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Connecting lines between stars
    if (cx < 3) {
      ctx.strokeStyle = patternColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX + cellSize * 0.4, centerY);
      ctx.lineTo(centerX + cellSize * 0.6, centerY);
      ctx.stroke();
    }
  }

  // Top and bottom border lines
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(canvas.width, 4);
  ctx.moveTo(0, size - 4);
  ctx.lineTo(canvas.width, size - 4);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

// Kufic-inspired angular calligraphy band pattern
const createKuficBandTexture = (bgColor: string, patternColor: string) => {
  const canvas = document.createElement('canvas');
  const width = 256;
  const height = 64;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = patternColor;
  ctx.strokeStyle = patternColor;
  ctx.lineWidth = 2;

  // Stylized angular Kufic-like repeating motif
  const unitWidth = width / 4;
  for (let u = 0; u < 4; u++) {
    const ox = u * unitWidth;

    // Vertical bars of varying heights (like Kufic alif/lam)
    ctx.fillRect(ox + 8, 12, 6, 40);
    ctx.fillRect(ox + 20, 20, 6, 32);
    ctx.fillRect(ox + 32, 8, 6, 48);
    ctx.fillRect(ox + 44, 24, 6, 28);

    // Horizontal connecting baseline
    ctx.fillRect(ox + 8, 48, 48, 4);

    // Small decorative squares
    ctx.fillRect(ox + 52, 36, 8, 8);
  }

  // Top border
  ctx.fillRect(0, 0, width, 3);
  ctx.fillRect(0, height - 3, width, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

// Muqarnas-inspired stepped/honeycomb pattern
const createMuqarnasBandTexture = (bgColor: string, patternColor: string, shadowColor: string) => {
  const canvas = document.createElement('canvas');
  const width = 192;
  const height = 64;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const cellW = width / 6;

  // Draw repeating pointed arch / honeycomb cells
  for (let i = 0; i < 6; i++) {
    const cx = i * cellW + cellW / 2;

    // Shadow/depth on left side
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx - cellW / 2 + 2, height);
    ctx.lineTo(cx, 8);
    ctx.lineTo(cx, height);
    ctx.closePath();
    ctx.fill();

    // Main pointed arch shape
    ctx.fillStyle = patternColor;
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx + cellW / 2 - 2, height);
    ctx.lineTo(cx, height - 8);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - cellW / 2 + 2, height);
    ctx.lineTo(cx, 8);
    ctx.lineTo(cx + cellW / 2 - 2, height);
    ctx.stroke();
  }

  // Bottom border
  ctx.fillStyle = patternColor;
  ctx.fillRect(0, height - 3, width, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

// Pre-cached pattern textures for medical buildings (green/cream) - higher contrast
export const CACHED_MEDICAL_PATTERN = createGeometricBandTexture('#f5f0e8', '#3a6a3a', '#1a4a1a');

// Pre-cached pattern textures for civic/government buildings (blue/cream) - higher contrast
export const CACHED_CIVIC_PATTERN = createKuficBandTexture('#f0e8d8', '#2a4a6a');

// Muqarnas pattern for special buildings
export const CACHED_MUQARNAS_PATTERN = createMuqarnasBandTexture('#d4c4a8', '#8a7a5a', '#5a4a3a');
