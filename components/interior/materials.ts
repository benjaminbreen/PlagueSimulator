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

// ============ FLOOR TEXTURES ============

// Packed earth/dirt floor - for peasant dwellings
export const createPackedEarthTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Earthy base
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Uneven patches of color variation
  for (let i = 0; i < 45; i++) {
    const x = seededRandom(i * 2.3) * canvas.width;
    const y = seededRandom(i * 3.7) * canvas.height;
    const w = 20 + seededRandom(i * 5.1) * 50;
    const h = 15 + seededRandom(i * 7.3) * 40;
    ctx.globalAlpha = 0.08 + seededRandom(i * 9.7) * 0.1;
    ctx.fillStyle = seededRandom(i * 11.1) > 0.5 ? accent : base;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, seededRandom(i * 13.3) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small stones/pebbles embedded
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 25; i++) {
    const x = seededRandom(i * 17.1) * canvas.width;
    const y = seededRandom(i * 19.3) * canvas.height;
    const r = 2 + seededRandom(i * 23.7) * 5;
    ctx.fillStyle = seededRandom(i * 29.1) > 0.5 ? '#8a7a6a' : '#6a5a4a';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
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

// Wide wood planks - for merchant homes
export const createWidePlankTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Wide planks with gaps
  const plankHeight = 42;
  for (let i = 0; i < 7; i++) {
    const y = i * plankHeight;

    // Plank gap/joint line
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();

    // Wood grain lines within plank
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    for (let g = 0; g < 4; g++) {
      const gy = y + 8 + g * 9 + (seededRandom(i * 100 + g) - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      // Wavy grain
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.lineTo(x, gy + (seededRandom(i * 200 + g * 10 + x) - 0.5) * 2);
      }
      ctx.stroke();
    }

    // Subtle color variation per plank
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = seededRandom(i * 7.3) > 0.5 ? accent : base;
    ctx.fillRect(0, y + 2, canvas.width, plankHeight - 4);
  }

  // Knots
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 4; i++) {
    const x = seededRandom(i * 31.7) * canvas.width;
    const y = seededRandom(i * 37.1) * canvas.height;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4, seededRandom(i * 41.3) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
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

// Narrow planks - different style wood floor
export const createNarrowPlankTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Narrow planks with staggered joints
  const plankHeight = 18;
  for (let i = 0; i < 15; i++) {
    const y = i * plankHeight;
    const stagger = (i % 3) * 80;

    // Plank joint lines
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();

    // Vertical end joints (staggered)
    ctx.globalAlpha = 0.3;
    for (let j = 0; j < 3; j++) {
      const x = stagger + j * 120;
      if (x > 0 && x < canvas.width) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + plankHeight);
        ctx.stroke();
      }
    }

    // Subtle grain
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 0.5;
    const gy = y + plankHeight / 2;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(canvas.width, gy + (seededRandom(i * 5.3) - 0.5) * 2);
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

// Herringbone wood pattern - for wealthy homes
export const createHerringboneTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const blockW = 48;
  const blockH = 16;

  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 8; col++) {
      const isEven = (row + col) % 2 === 0;
      const x = col * blockW - (row % 2) * blockW / 2;
      const y = row * blockH;

      // Alternate block colors slightly
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = seededRandom(row * 100 + col) > 0.5 ? accent : base;

      ctx.save();
      ctx.translate(x + blockW / 2, y + blockH / 2);
      ctx.rotate(isEven ? Math.PI / 6 : -Math.PI / 6);
      ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);

      // Block outline
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(-blockW / 2, -blockH / 2, blockW, blockH);
      ctx.restore();
    }
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

// Terracotta tile - Mediterranean/Damascus style with authentic worn patina
export const createTerracottaTileTexture = (base: string, grout: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark grout base
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tileSize = 80;
  const gap = 6;
  const tilesPerRow = Math.ceil(canvas.width / (tileSize + gap));

  // Parse base color
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);

  for (let row = 0; row < tilesPerRow + 1; row++) {
    for (let col = 0; col < tilesPerRow + 1; col++) {
      const x = col * (tileSize + gap) + gap / 2;
      const y = row * (tileSize + gap) + gap / 2;

      // Each tile has unique color variation (fired clay varies naturally)
      const tileSeed = row * 17 + col * 31;
      const variation = seededRandom(tileSeed);
      const warmth = seededRandom(tileSeed + 100);

      // Warm terracotta tones with natural variation
      const vr = Math.floor(Math.max(80, Math.min(255, r + (variation - 0.5) * 40 + warmth * 15)));
      const vg = Math.floor(Math.max(40, Math.min(200, g + (variation - 0.5) * 30)));
      const vb = Math.floor(Math.max(30, Math.min(150, b + (variation - 0.5) * 25)));

      // Main tile body
      ctx.fillStyle = `rgb(${vr},${vg},${vb})`;
      ctx.globalAlpha = 1;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Subtle gradient for depth (lighter in center, darker at edges)
      const gradient = ctx.createRadialGradient(
        x + tileSize / 2, y + tileSize / 2, 0,
        x + tileSize / 2, y + tileSize / 2, tileSize * 0.7
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.06)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Worn/chipped edges - asymmetric for realism
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = grout;
      // Top edge wear
      ctx.fillRect(x, y, tileSize, 2 + seededRandom(tileSeed + 1) * 2);
      // Left edge wear
      ctx.fillRect(x, y, 2 + seededRandom(tileSeed + 2) * 2, tileSize);
      // Random corner chips
      if (seededRandom(tileSeed + 3) > 0.7) {
        ctx.beginPath();
        ctx.arc(x, y, 4 + seededRandom(tileSeed + 4) * 6, 0, Math.PI / 2);
        ctx.fill();
      }
      if (seededRandom(tileSeed + 5) > 0.8) {
        ctx.beginPath();
        ctx.arc(x + tileSize, y + tileSize, 3 + seededRandom(tileSeed + 6) * 5, Math.PI, Math.PI * 1.5);
        ctx.fill();
      }

      // Clay texture - small pits and surface irregularities
      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 15; i++) {
        const px = x + seededRandom(tileSeed * 100 + i) * tileSize;
        const py = y + seededRandom(tileSeed * 200 + i) * tileSize;
        const psize = 1 + seededRandom(tileSeed * 300 + i) * 3;
        ctx.fillStyle = seededRandom(i * 3.7) > 0.6 ? 'rgba(0,0,0,0.5)' : 'rgba(255,200,150,0.3)';
        ctx.beginPath();
        ctx.arc(px, py, psize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional darker firing spots (kiln marks)
      if (seededRandom(tileSeed + 50) > 0.85) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#4a3020';
        const spotX = x + 10 + seededRandom(tileSeed + 51) * (tileSize - 20);
        const spotY = y + 10 + seededRandom(tileSeed + 52) * (tileSize - 20);
        ctx.beginPath();
        ctx.ellipse(spotX, spotY, 8 + seededRandom(tileSeed + 53) * 12, 6 + seededRandom(tileSeed + 54) * 8, seededRandom(tileSeed + 55) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wear patterns from foot traffic (subtle lighter patches)
      if (seededRandom(tileSeed + 60) > 0.7) {
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#f0d8c0';
        const wearX = x + seededRandom(tileSeed + 61) * tileSize * 0.6;
        const wearY = y + seededRandom(tileSeed + 62) * tileSize * 0.6;
        ctx.beginPath();
        ctx.ellipse(wearX + 15, wearY + 15, 15, 10, seededRandom(tileSeed + 63) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Add overall aged patina
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 100; i++) {
    const px = seededRandom(i * 7.1) * canvas.width;
    const py = seededRandom(i * 11.3) * canvas.height;
    ctx.fillStyle = seededRandom(i * 13.7) > 0.5 ? '#2a1a10' : '#e8d0b0';
    ctx.fillRect(px, py, 2 + seededRandom(i * 17.1) * 4, 2 + seededRandom(i * 19.3) * 4);
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

// Stone slab floor - for commercial spaces
export const createStoneSlabTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Irregular stone slabs
  const slabs = [
    { x: 0, y: 0, w: 100, h: 80 },
    { x: 100, y: 0, w: 80, h: 60 },
    { x: 180, y: 0, w: 76, h: 70 },
    { x: 0, y: 80, w: 70, h: 90 },
    { x: 70, y: 60, w: 90, h: 70 },
    { x: 160, y: 70, w: 96, h: 80 },
    { x: 0, y: 170, w: 85, h: 86 },
    { x: 85, y: 130, w: 80, h: 75 },
    { x: 165, y: 150, w: 91, h: 106 },
    { x: 85, y: 205, w: 80, h: 51 },
  ];

  slabs.forEach((slab, i) => {
    // Slight color variation per slab
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = seededRandom(i * 7.3) > 0.5 ? accent : base;
    ctx.fillRect(slab.x, slab.y, slab.w, slab.h);

    // Joint lines
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(slab.x + 1, slab.y + 1, slab.w - 2, slab.h - 2);

    // Surface wear
    ctx.globalAlpha = 0.04;
    for (let j = 0; j < 5; j++) {
      const px = slab.x + seededRandom(i * 100 + j) * slab.w;
      const py = slab.y + seededRandom(i * 200 + j) * slab.h;
      ctx.fillStyle = '#000';
      ctx.fillRect(px, py, 8, 6);
    }
  });

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
};

// Brick floor pattern - herringbone bricks
export const createBrickFloorTexture = (base: string, mortar: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Mortar base
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const brickW = 40;
  const brickH = 18;
  const gap = 3;

  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 8; col++) {
      const isHorizontal = (row + col) % 2 === 0;
      const x = col * (brickW + gap);
      const y = row * (brickH + gap);

      // Brick color variation
      const variation = seededRandom(row * 10 + col);
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      const vr = Math.floor(r + (variation - 0.5) * 25);
      const vg = Math.floor(g + (variation - 0.5) * 20);
      const vb = Math.floor(b + (variation - 0.5) * 15);
      ctx.fillStyle = `rgb(${vr},${vg},${vb})`;
      ctx.globalAlpha = 1;

      if (isHorizontal) {
        ctx.fillRect(x, y, brickW, brickH);
      } else {
        ctx.fillRect(x, y, brickH, brickW);
      }

      // Subtle surface texture
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = seededRandom(row * 50 + col) > 0.5 ? '#000' : mortar;
      if (isHorizontal) {
        ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
      } else {
        ctx.fillRect(x + 2, y + 2, brickH - 4, brickW - 4);
      }
    }
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

// Simple reed mat floor - for peasant dwellings
export const createReedMatTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Woven reed pattern - horizontal strands
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const y = i * 6.5 + (seededRandom(i * 3.1) - 0.5) * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < canvas.width; x += 15) {
      ctx.lineTo(x, y + (seededRandom(i * 100 + x) - 0.5) * 3);
    }
    ctx.stroke();
  }

  // Cross-weave pattern
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    const x = i * 13 + (seededRandom(i * 7.7) - 0.5) * 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (seededRandom(i * 11.3) - 0.5) * 5, canvas.height);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
};
