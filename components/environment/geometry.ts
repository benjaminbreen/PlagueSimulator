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
 * Create a matte dirt/sand texture for cemetery ground
 * Stays completely rough (no shine) while providing noisy surface detail
 */
export const createDirtTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);

  // Create noisy dirt texture with high base value (rough/matte)
  // Values stay between 180-255 to ensure no shininess while allowing more variation
  for (let i = 0; i < imageData.data.length; i += 4) {
    // More variation for grainier dirt appearance
    const grain = Math.random() * 75 + 180; // 180-255 range = always rough, more noise
    imageData.data[i] = grain;
    imageData.data[i + 1] = grain;
    imageData.data[i + 2] = grain;
    imageData.data[i + 3] = 255; // Full opacity
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
 * Create a vertical grime band texture (dark at bottom, lighter toward top)
 * Used for wall dirt banding without transparency.
 */
export const createGrimeBandTexture = (width = 64, height = 128): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1); // 0 at top, 1 at bottom (canvas coords)
    const inv = 1 - t; // 1 at top, 0 at bottom
    const base = 95 + inv * 75; // bottom darker, top lighter
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const noise = (Math.random() - 0.5) * 18;
      const value = Math.max(0, Math.min(255, base + noise));
      imageData.data[idx] = value;
      imageData.data[idx + 1] = value;
      imageData.data[idx + 2] = value;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
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
 * Create a procedural plaster/stucco normal map for building walls
 * Smooth, subtle surface variation like whitewashed Mediterranean walls
 * Encodes surface direction as RGB: R=X, G=Y, B=Z (128,128,255 = flat)
 */
export const createPlasterNormalTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  // Seeded random for consistency
  const seeded = (x: number, y: number, offset = 0) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + offset) * 43758.5453;
    return n - Math.floor(n);
  };

  // Smooth noise function (interpolated)
  const smoothNoise = (x: number, y: number, scale: number, offset: number) => {
    const sx = x / scale;
    const sy = y / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;

    // Bilinear interpolation for smoothness
    const v00 = seeded(x0, y0, offset);
    const v10 = seeded(x0 + 1, y0, offset);
    const v01 = seeded(x0, y0 + 1, offset);
    const v11 = seeded(x0 + 1, y0 + 1, offset);

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  };

  // Generate height map first, then convert to normals
  const heightMap: number[] = new Array(size * size).fill(0);

  // Layer 1: Very gentle large-scale undulation (hand-applied plaster)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (smoothNoise(x, y, 48, 0) - 0.5) * 0.15;
    }
  }

  // Layer 2: Medium smooth variation (trowel marks)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (smoothNoise(x, y, 16, 100) - 0.5) * 0.12;
    }
  }

  // Layer 3: Fine grain (plaster texture, very subtle)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (seeded(x, y, 200) - 0.5) * 0.08;
    }
  }

  // Convert height map to normal map using Sobel operator
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Sample neighboring heights (with wrapping)
      const getHeight = (px: number, py: number) => {
        const wx = ((px % size) + size) % size;
        const wy = ((py % size) + size) % size;
        return heightMap[wy * size + wx];
      };

      // Sobel operator for normal calculation
      const tl = getHeight(x - 1, y - 1);
      const t = getHeight(x, y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l = getHeight(x - 1, y);
      const r = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b = getHeight(x, y + 1);
      const br = getHeight(x + 1, y + 1);

      // Calculate normal from height differences
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Gentler strength for smooth plaster look
      const strength = 2.2;
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      // Convert from [-1,1] to [0,255] range
      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);     // R = X
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255); // G = Y
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255); // B = Z
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Create a ground/terrain normal map for outdoor surfaces
 * Represents packed earth, dirt paths, and natural ground variation
 */
export const createGroundNormalTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const seeded = (x: number, y: number, offset = 0) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + offset) * 43758.5453;
    return n - Math.floor(n);
  };

  // Smooth noise for natural ground undulation
  const smoothNoise = (x: number, y: number, scale: number, offset: number) => {
    const sx = x / scale;
    const sy = y / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;

    const v00 = seeded(x0, y0, offset);
    const v10 = seeded(x0 + 1, y0, offset);
    const v01 = seeded(x0, y0 + 1, offset);
    const v11 = seeded(x0 + 1, y0 + 1, offset);

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  };

  const heightMap: number[] = new Array(size * size).fill(0);

  // Layer 1: Large-scale ground undulation (terrain variation)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (smoothNoise(x, y, 64, 0) - 0.5) * 0.12;
    }
  }

  // Layer 2: Medium bumps (rocks, roots, packed earth)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (smoothNoise(x, y, 16, 100) - 0.5) * 0.15;
    }
  }

  // Layer 3: Small pebbles and debris
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (smoothNoise(x, y, 6, 200) - 0.5) * 0.08;
    }
  }

  // Layer 4: Fine grain (sand/dirt texture)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      heightMap[idx] += (seeded(x, y, 300) - 0.5) * 0.05;
    }
  }

  // Convert height map to normal map
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const getHeight = (px: number, py: number) => {
        const wx = ((px % size) + size) % size;
        const wy = ((py % size) + size) % size;
        return heightMap[wy * size + wx];
      };

      const tl = getHeight(x - 1, y - 1);
      const t = getHeight(x, y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l = getHeight(x - 1, y);
      const r = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b = getHeight(x, y + 1);
      const br = getHeight(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const strength = 1.0; // Gentle for ground
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

/**
 * Create a rougher stone normal map for civic/religious buildings
 */
export const createStoneNormalTexture = (size = 256): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const seeded = (x: number, y: number, offset = 0) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + offset) * 43758.5453;
    return n - Math.floor(n);
  };

  const heightMap: number[] = new Array(size * size).fill(0);

  // Coarser grain for stone - but still subtle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // Fine pitting (reduced)
      heightMap[idx] += (seeded(x, y, 0) - 0.5) * 0.15;
      // Medium grain (reduced)
      const sx = x / 4;
      const sy = y / 4;
      heightMap[idx] += (seeded(Math.floor(sx), Math.floor(sy), 50) - 0.5) * 0.18;
      // Large variation
      const lx = x / 16;
      const ly = y / 16;
      heightMap[idx] += (seeded(Math.floor(lx), Math.floor(ly), 150) - 0.5) * 0.1;
    }
  }

  // Convert to normals
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const getHeight = (px: number, py: number) => {
        const wx = ((px % size) + size) % size;
        const wy = ((py % size) + size) % size;
        return heightMap[wy * size + wx];
      };

      const tl = getHeight(x - 1, y - 1);
      const t = getHeight(x, y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l = getHeight(x - 1, y);
      const r = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b = getHeight(x, y + 1);
      const br = getHeight(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const strength = 1.5; // Moderate for stone
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Seeded random for consistent flagstone patterns
const flagstoneSeededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/**
 * Create a limestone flagstone texture for souq floors
 * Irregular worn stone slabs like ancient Damascus markets
 */
export const createLimestoneFlagstoneTexture = (size = 512, seed = 12345): THREE.CanvasTexture | null => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Cool gray-beige limestone base (mortar/joints)
  ctx.fillStyle = '#6a6358';
  ctx.fillRect(0, 0, size, size);

  // Generate irregular flagstone slabs using Voronoi-like cell division
  const numCells = 18; // Number of stone slabs
  const cells: Array<{ x: number; y: number; color: string }> = [];

  // Generate cell centers with some randomness
  for (let i = 0; i < numCells; i++) {
    const angle = (i / numCells) * Math.PI * 2 + flagstoneSeededRandom(seed + i * 7) * 0.5;
    const radius = flagstoneSeededRandom(seed + i * 11 + 100) * size * 0.35 + size * 0.1;
    const x = size / 2 + Math.cos(angle) * radius + (flagstoneSeededRandom(seed + i * 13) - 0.5) * size * 0.3;
    const y = size / 2 + Math.sin(angle) * radius + (flagstoneSeededRandom(seed + i * 17) - 0.5) * size * 0.3;

    // Natural limestone color variation (cooler gray-beige tones)
    const baseR = 180 + Math.floor(flagstoneSeededRandom(seed + i * 23) * 30);
    const baseG = 172 + Math.floor(flagstoneSeededRandom(seed + i * 29) * 28);
    const baseB = 155 + Math.floor(flagstoneSeededRandom(seed + i * 31) * 25);
    cells.push({ x, y, color: `rgb(${baseR},${baseG},${baseB})` });
  }

  // Add some edge cells to ensure coverage
  const edgeCells = [
    { x: 0, y: 0 }, { x: size, y: 0 }, { x: 0, y: size }, { x: size, y: size },
    { x: size / 2, y: 0 }, { x: size / 2, y: size }, { x: 0, y: size / 2 }, { x: size, y: size / 2 }
  ];
  edgeCells.forEach((ec, i) => {
    const baseR = 175 + Math.floor(flagstoneSeededRandom(seed + i * 37 + 500) * 35);
    const baseG = 168 + Math.floor(flagstoneSeededRandom(seed + i * 41 + 500) * 30);
    const baseB = 150 + Math.floor(flagstoneSeededRandom(seed + i * 43 + 500) * 28);
    cells.push({ x: ec.x, y: ec.y, color: `rgb(${baseR},${baseG},${baseB})` });
  });

  // Draw each cell (flagstone) using Voronoi distance
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let minDist = Infinity;
      let secondMinDist = Infinity;
      let closestCell = cells[0];

      // Find closest and second-closest cell center
      for (const cell of cells) {
        // Handle wrapping for seamless tiling
        const dx = Math.min(Math.abs(px - cell.x), size - Math.abs(px - cell.x));
        const dy = Math.min(Math.abs(py - cell.y), size - Math.abs(py - cell.y));
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          secondMinDist = minDist;
          minDist = dist;
          closestCell = cell;
        } else if (dist < secondMinDist) {
          secondMinDist = dist;
        }
      }

      const idx = (py * size + px) * 4;

      // Edge detection for mortar joints
      const edgeFactor = secondMinDist - minDist;
      const isEdge = edgeFactor < 8;

      if (isEdge) {
        // Mortar joint - darker, with some dirt staining
        const mortarDark = 70 + flagstoneSeededRandom(seed + px * 7 + py * 11) * 25;
        data[idx] = mortarDark;
        data[idx + 1] = mortarDark - 5;
        data[idx + 2] = mortarDark - 10;
        data[idx + 3] = 255;
      } else {
        // Stone surface
        const colorMatch = closestCell.color.match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (colorMatch) {
          let r = parseInt(colorMatch[1]);
          let g = parseInt(colorMatch[2]);
          let b = parseInt(colorMatch[3]);

          // Add surface variation (worn polish, dust, staining)
          const wearNoise = flagstoneSeededRandom(seed + px * 3 + py * 5 + 1000);

          // Worn/polished center areas (slightly lighter from foot traffic)
          const centerDist = minDist / 30;
          if (centerDist < 1 && wearNoise > 0.4) {
            const polish = (1 - centerDist) * 12;
            r = Math.min(255, r + polish);
            g = Math.min(255, g + polish);
            b = Math.min(255, b + polish);
          }

          // Random darker patches (dirt, staining from centuries of use)
          if (wearNoise < 0.15) {
            r = Math.max(0, r - 20);
            g = Math.max(0, g - 18);
            b = Math.max(0, b - 15);
          }

          // Subtle surface grain
          const grain = (flagstoneSeededRandom(seed + px * 17 + py * 23) - 0.5) * 8;
          r = Math.max(0, Math.min(255, r + grain));
          g = Math.max(0, Math.min(255, g + grain));
          b = Math.max(0, Math.min(255, b + grain));

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add worn grooves and cracks
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#4a4540';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x1 = flagstoneSeededRandom(seed + i * 47 + 2000) * size;
    const y1 = flagstoneSeededRandom(seed + i * 53 + 2000) * size;
    const x2 = x1 + (flagstoneSeededRandom(seed + i * 59 + 2000) - 0.5) * 60;
    const y2 = y1 + (flagstoneSeededRandom(seed + i * 61 + 2000) - 0.5) * 50;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Occasional darker wear marks from heavy traffic
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 6; i++) {
    const x = flagstoneSeededRandom(seed + i * 67 + 3000) * size;
    const y = flagstoneSeededRandom(seed + i * 71 + 3000) * size;
    const w = 30 + flagstoneSeededRandom(seed + i * 73 + 3000) * 50;
    const h = 20 + flagstoneSeededRandom(seed + i * 79 + 3000) * 35;
    ctx.fillStyle = '#3a3530';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, flagstoneSeededRandom(seed + i * 83) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
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
