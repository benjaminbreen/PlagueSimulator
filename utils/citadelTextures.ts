/**
 * Procedural textures for Mamluk Citadel
 * Generates historically accurate Islamic architectural patterns
 */

import * as THREE from 'three';

/**
 * Creates ablaq pattern texture (alternating light/dark stone courses)
 * Signature Mamluk architectural feature
 */
export const createAblaqTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const courseHeight = 64; // Pixels per course
  const numCourses = 8;

  // Draw alternating stone courses
  for (let i = 0; i < numCourses; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d9c9a9' : '#4a4a4a';
    ctx.fillRect(0, i * courseHeight, 512, courseHeight);

    // Add stone block joints for realism
    ctx.strokeStyle = i % 2 === 0 ? '#c9b999' : '#3a3a3a';
    ctx.lineWidth = 2;

    // Vertical joints every 80 pixels
    for (let x = 0; x < 512; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, i * courseHeight);
      ctx.lineTo(x, (i + 1) * courseHeight);
      ctx.stroke();
    }

    // Add subtle mortar lines
    ctx.strokeStyle = i % 2 === 0 ? '#b8a989' : '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, i * courseHeight);
    ctx.lineTo(512, i * courseHeight);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Creates Islamic geometric tile pattern (8-pointed stars)
 * Used for palace decorations and gateway panels
 */
export const createGeometricTileTexture = (
  baseColor: string = '#1a4a7a',
  accentColor: string = '#c9a23a'
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = accentColor;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;

  // Draw repeating 8-pointed star pattern
  const tileSize = 128;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const cx = x + tileSize / 2;
      const cy = y + tileSize / 2;

      // Draw 8-pointed star
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = (i / 8) * Math.PI;
        const radius = i % 2 === 0 ? 40 : 20;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Add smaller decorative circles at star points
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = cx + Math.cos(angle) * 40;
        const py = cy + Math.sin(angle) * 40;

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Creates geometric paving pattern for courtyards
 * Octagonal tiles with square infills
 */
export const createCourtyardPavingTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base stone color
  ctx.fillStyle = '#d8ccb8';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 2;

  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      // Draw octagon
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = x + tileSize / 2 + Math.cos(angle) * tileSize * 0.4;
        const py = y + tileSize / 2 + Math.sin(angle) * tileSize * 0.4;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Fill small squares between octagons
      if (x > 0 && y > 0) {
        ctx.fillStyle = '#a89886';
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.strokeStyle = '#4a4a4a';
        ctx.strokeRect(x - 8, y - 8, 16, 16);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Creates simple stone paving for roads
 * Rectangular blocks with joints
 */
export const createStonePavingTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9a8a7a';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#6a5a4a';
  ctx.lineWidth = 2;

  // Horizontal joints
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Vertical joints (staggered)
  for (let y = 0; y < 512; y += 64) {
    const offset = (y / 64) % 2 === 0 ? 0 : 128;
    for (let x = offset; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 64);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Creates wood texture for doors and gates
 * Vertical planks with grain
 */
export const createWoodTexture = (darkMode: boolean = false): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseColor = darkMode ? '#3a2a1a' : '#6a4a2a';
  const grainColor = darkMode ? '#2a1a0a' : '#5a3a1a';

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Vertical planks
  const plankWidth = 64;
  ctx.strokeStyle = grainColor;
  ctx.lineWidth = 2;

  for (let x = 0; x < 512; x += plankWidth) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();

    // Wood grain lines
    ctx.lineWidth = 1;
    for (let y = 0; y < 512; y += 40) {
      const variation = Math.sin(y * 0.1 + x * 0.05) * 10;
      ctx.beginPath();
      ctx.moveTo(x + 10, y);
      ctx.lineTo(x + plankWidth - 10 + variation, y);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Creates brass/bronze texture for decorative elements
 * Metallic appearance with patina
 */
export const createBrassTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base brass color
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(0, 0, 256, 256);

  // Add subtle patina spots
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = Math.random() * 10 + 5;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#8a660b');
    gradient.addColorStop(1, '#b8860b');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};
