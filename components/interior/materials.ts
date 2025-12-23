import * as THREE from 'three';

// Seeded random for consistent textures
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export const createRugTexture = (base: string, accent: string, pattern: 'stripe' | 'diamond') => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  if (pattern === 'stripe') {
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * 24);
      ctx.lineTo(canvas.width, i * 24 + 12);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 4; i += 1) {
      const offset = i * 24;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, offset);
      ctx.lineTo(canvas.width - offset, canvas.height / 2);
      ctx.lineTo(canvas.width / 2, canvas.height - offset);
      ctx.lineTo(offset, canvas.height / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

export const createNoiseTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle noise for rough plaster effect
  for (let i = 0; i < 1500; i += 1) {
    const x = seededRandom(i * 1.1) * canvas.width;
    const y = seededRandom(i * 2.3) * canvas.height;
    ctx.fillStyle = seededRandom(i * 3.7) > 0.5 ? base : accent;
    ctx.globalAlpha = 0.06 + seededRandom(i * 4.1) * 0.06;
    ctx.fillRect(x, y, 2 + seededRandom(i * 5.3) * 2, 2 + seededRandom(i * 6.7) * 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
};

export const createPlankTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 12; i += 1) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, i * 20);
    ctx.lineTo(canvas.width, i * 20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

// Smooth plastered wall with subtle weathering - for wealthy homes
export const createWallTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base color
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle vertical variation (whitewash drips)
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 20; i++) {
    const x = seededRandom(i * 7.3) * canvas.width;
    const width = 8 + seededRandom(i * 11.7) * 20;
    ctx.fillStyle = accent;
    ctx.fillRect(x, 0, width, canvas.height);
  }

  // Subtle texture grain
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 800; i += 1) {
    const x = seededRandom(i * 1.3) * canvas.width;
    const y = seededRandom(i * 2.7) * canvas.height;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

// Smooth plaster with subtle weathering marks - for middle class and wealthy
export const createPlasterTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid base
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle bottom darkening (dust/wear)
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle weathering patches
  for (let i = 0; i < 15; i += 1) {
    const x = seededRandom(i * 3.1) * canvas.width;
    const y = seededRandom(i * 5.3) * canvas.height;
    const w = 15 + seededRandom(i * 7.7) * 35;
    const h = 10 + seededRandom(i * 9.1) * 25;
    ctx.globalAlpha = 0.03 + seededRandom(i * 11.3) * 0.04;
    ctx.fillStyle = accent;

    // Rounded rectangle for softer patches
    ctx.beginPath();
    const radius = 4;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 1.2);
  return texture;
};

// Decorative wall band/dado pattern - solid with subtle variation
export const createPatchTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid base - NOT transparent
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle worn patches
  for (let i = 0; i < 8; i += 1) {
    const x = seededRandom(i * 13.7) * 100;
    const y = seededRandom(i * 17.3) * 100;
    const w = 20 + seededRandom(i * 19.1) * 30;
    const h = 15 + seededRandom(i * 23.7) * 20;
    ctx.globalAlpha = 0.06 + seededRandom(i * 29.3) * 0.06;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

export const createTileTexture = (base: string, grout: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = grout;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  const step = 32;
  for (let i = 0; i <= canvas.width; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

// Religious building walls - smooth plaster with subtle sacred geometry hints
export const createReligiousWallTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Clean, bright base
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Very subtle vertical striations (lime wash application marks)
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 30; i++) {
    const x = seededRandom(i * 3.7) * canvas.width;
    const width = 2 + seededRandom(i * 5.3) * 6;
    ctx.fillStyle = accent;
    ctx.fillRect(x, 0, width, canvas.height);
  }

  // Subtle light spots (from lime deposits)
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 20; i++) {
    const x = seededRandom(i * 7.1) * canvas.width;
    const y = seededRandom(i * 11.3) * canvas.height;
    const r = 5 + seededRandom(i * 13.7) * 15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

// Civic building walls - more formal, stone-like appearance
export const createCivicWallTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid base
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle horizontal coursing lines (ashlar stone effect)
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = (i + 1) * 32 + (seededRandom(i * 7.3) - 0.5) * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Very subtle vertical joints
  ctx.globalAlpha = 0.025;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : 64;
    for (let col = 0; col < 4; col++) {
      const x = col * 128 + offset + (seededRandom(row * 100 + col) - 0.5) * 8;
      const y1 = row * 32;
      const y2 = (row + 1) * 32;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
  }

  // Slight weathering
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 25; i++) {
    const x = seededRandom(i * 11.7) * canvas.width;
    const y = seededRandom(i * 13.1) * canvas.height;
    const w = 10 + seededRandom(i * 17.3) * 20;
    const h = 8 + seededRandom(i * 19.7) * 15;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

// Rough mud/adobe wall for peasant dwellings
export const createAdobeWallTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Earthy base
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Uneven surface texture
  for (let i = 0; i < 60; i++) {
    const x = seededRandom(i * 3.1) * canvas.width;
    const y = seededRandom(i * 5.7) * canvas.height;
    const w = 8 + seededRandom(i * 7.3) * 25;
    const h = 6 + seededRandom(i * 9.1) * 20;
    ctx.globalAlpha = 0.06 + seededRandom(i * 11.7) * 0.08;
    ctx.fillStyle = seededRandom(i * 13.3) > 0.5 ? accent : base;
    ctx.fillRect(x, y, w, h);
  }

  // Small cracks and imperfections
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x1 = seededRandom(i * 17.1) * canvas.width;
    const y1 = seededRandom(i * 19.3) * canvas.height;
    const x2 = x1 + (seededRandom(i * 23.7) - 0.5) * 40;
    const y2 = y1 + (seededRandom(i * 29.1) - 0.5) * 30;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
};

// Decorative geometric band for wealthy/religious buildings
export const createGeometricBandTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base color
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Simple repeating diamond/chevron pattern
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.25;

  const step = 16;
  for (let x = 0; x < canvas.width + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, canvas.height / 2);
    ctx.lineTo(x + step / 2, 8);
    ctx.lineTo(x + step, canvas.height / 2);
    ctx.lineTo(x + step / 2, canvas.height - 8);
    ctx.closePath();
    ctx.stroke();
  }

  // Top and bottom border lines
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(canvas.width, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 3);
  ctx.lineTo(canvas.width, canvas.height - 3);
  ctx.stroke();

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
};
