/**
 * Islamic Ornaments Components
 * Authentic 14th century Mamluk-era Damascus architectural elements
 *
 * Features:
 * - Muqarnas (honeycomb vaulting)
 * - Geometric tile patterns
 * - Ornate fountains with water channels
 * - Lion sculptures and decorative statuary
 * - Arcade columns with pointed arches
 * - Mashrabiya (carved lattice screens)
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from '../../../utils/procedural';

// ========================================
// COLOR PALETTES
// ========================================

const ISLAMIC_COLORS = {
  // Tile colors - authentic Iznik and Damascus palette
  cobaltBlue: '#1a4a7a',
  turquoise: '#2a8a7a',
  deepGreen: '#2a5a4a',
  gold: '#c9a23a',
  cream: '#e8dcc8',
  terracotta: '#b86a4a',
  burgundy: '#7a2a3a',
  white: '#f0e8dc',

  // Stone colors
  limestone: '#d8ccb8',
  marble: '#e8e0d8',
  sandstone: '#c8b090',
  darkStone: '#8a7a6a',

  // Metal colors
  bronze: '#8a6a3a',
  copper: '#9a6a4a',
  brass: '#c8a050',
};

// ========================================
// MUQARNAS - Honeycomb Vaulting
// ========================================

interface MuqarnasProps {
  position?: [number, number, number];
  width?: number;
  depth?: number;
  tiers?: number;
  color?: string;
  accentColor?: string;
}

/**
 * Muqarnas - Traditional Islamic honeycomb/stalactite vaulting
 * Used above doorways, in dome transitions, and mihrab niches
 */
export const Muqarnas: React.FC<MuqarnasProps> = ({
  position = [0, 0, 0],
  width = 2,
  depth = 1,
  tiers = 3,
  color = ISLAMIC_COLORS.limestone,
  accentColor = ISLAMIC_COLORS.cobaltBlue,
}) => {
  const cells = useMemo(() => {
    const result: Array<{
      pos: [number, number, number];
      scale: [number, number, number];
      rotation: number;
      isAccent: boolean;
    }> = [];

    for (let tier = 0; tier < tiers; tier++) {
      const tierHeight = 0.15 + tier * 0.12;
      const tierWidth = width * (1 - tier * 0.15);
      const cellsInTier = 4 + tier * 2;
      const cellWidth = tierWidth / cellsInTier;

      for (let i = 0; i < cellsInTier; i++) {
        const x = (i - (cellsInTier - 1) / 2) * cellWidth;
        const y = tier * 0.18;
        const z = depth * 0.3 * (1 - tier / tiers);

        result.push({
          pos: [x, y, z],
          scale: [cellWidth * 0.9, 0.15 + tier * 0.05, depth * 0.25],
          rotation: (tier + i) * 0.2,
          isAccent: (tier + i) % 3 === 0,
        });
      }
    }
    return result;
  }, [width, depth, tiers]);

  return (
    <group position={position}>
      {/* Base corbel */}
      <mesh position={[0, -0.1, depth * 0.15]} castShadow>
        <boxGeometry args={[width * 1.1, 0.12, depth * 0.4]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Muqarnas cells */}
      {cells.map((cell, i) => (
        <mesh
          key={i}
          position={cell.pos}
          rotation={[0, cell.rotation, 0]}
          castShadow
        >
          <boxGeometry args={cell.scale} />
          <meshStandardMaterial
            color={cell.isAccent ? accentColor : color}
            roughness={0.75}
          />
        </mesh>
      ))}

      {/* Top crown */}
      <mesh position={[0, tiers * 0.18, 0]} castShadow>
        <boxGeometry args={[width * 0.6, 0.08, depth * 0.3]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} />
      </mesh>
    </group>
  );
};

// ========================================
// GEOMETRIC TILE PATTERNS
// ========================================

interface GeometricTileProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
  pattern?: 'star8' | 'star6' | 'hexagonal' | 'arabesque';
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

/**
 * GeometricTile - Islamic geometric pattern tile panel
 * Uses canvas texture for authentic patterns
 */
export const GeometricTile: React.FC<GeometricTileProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 2,
  pattern = 'star8',
  primaryColor = ISLAMIC_COLORS.cobaltBlue,
  secondaryColor = ISLAMIC_COLORS.cream,
  accentColor = ISLAMIC_COLORS.gold,
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, 512, 512);

    const cx = 256;
    const cy = 256;

    if (pattern === 'star8') {
      // Eight-pointed star pattern (classic Islamic)
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 8;
      ctx.fillStyle = primaryColor;

      // Draw 8-pointed star
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const nextAngle = ((i + 1) / 8) * Math.PI * 2;
        const outerR = 200;
        const innerR = 80;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.lineTo(cx + Math.cos(angle + Math.PI / 8) * innerR, cy + Math.sin(angle + Math.PI / 8) * innerR);
        ctx.lineTo(cx + Math.cos(nextAngle) * outerR, cy + Math.sin(nextAngle) * outerR);
        ctx.stroke();
      }

      // Central octagon
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const r = 60;
        if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      // Corner stars (smaller)
      const corners = [[0, 0], [512, 0], [0, 512], [512, 512]];
      corners.forEach(([cornerX, cornerY]) => {
        ctx.fillStyle = primaryColor;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const nextAngle = ((i + 1) / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cornerX + Math.cos(angle) * 100, cornerY + Math.sin(angle) * 100);
          ctx.lineTo(cornerX + Math.cos(angle + Math.PI / 8) * 40, cornerY + Math.sin(angle + Math.PI / 8) * 40);
          ctx.lineTo(cornerX + Math.cos(nextAngle) * 100, cornerY + Math.sin(nextAngle) * 100);
          ctx.stroke();
        }
      });

    } else if (pattern === 'star6') {
      // Six-pointed star pattern
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 6;

      // Draw interlocking triangles
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + (layer * Math.PI / 3);
          const x = cx + Math.cos(angle) * 180;
          const y = cy + Math.sin(angle) * 180;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Central hexagon
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(angle) * 70;
        const y = cy + Math.sin(angle) * 70;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

    } else if (pattern === 'hexagonal') {
      // Hexagonal tessellation
      const hexR = 80;
      const drawHex = (hx: number, hy: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const x = hx + Math.cos(angle) * hexR;
          const y = hy + Math.sin(angle) * hexR;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      };

      // Honeycomb pattern
      const rows = 4;
      const cols = 4;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * hexR * 1.5 + (row % 2) * hexR * 0.75;
          const y = row * hexR * 1.3;
          const color = (row + col) % 2 === 0 ? primaryColor : secondaryColor;
          drawHex(x, y, color);
        }
      }

    } else if (pattern === 'arabesque') {
      // Flowing arabesque curves
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 5;

      // Draw flowing curves
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const cp1x = cx + Math.cos(angle) * 100;
        const cp1y = cy + Math.sin(angle) * 100;
        const cp2x = cx + Math.cos(angle + 0.5) * 200;
        const cp2y = cy + Math.sin(angle + 0.5) * 200;
        const endX = cx + Math.cos(angle + Math.PI / 4) * 220;
        const endY = cy + Math.sin(angle + Math.PI / 4) * 220;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.stroke();
      }

      // Central rosette
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 500);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [pattern, primaryColor, secondaryColor, accentColor]);

  if (!texture) return null;

  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
};

// ========================================
// ORNATE FOUNTAIN
// ========================================

interface OrnateFountainProps {
  position?: [number, number, number];
  scale?: number;
  variant?: 'tiered' | 'basin' | 'wall' | 'octagonal';
  hasWaterAnimation?: boolean;
}

/**
 * OrnateFountain - Elaborate multi-tiered fountain
 * Authentic Mamluk-era Damascus courtyard fountain
 */
export const OrnateFountain: React.FC<OrnateFountainProps> = ({
  position = [0, 0, 0],
  scale = 1,
  variant = 'tiered',
  hasWaterAnimation = true,
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const lastUpdateRef = useRef(0);
  const centerPos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);
  const FAR_SQ = 70 * 70;
  const VERY_FAR_SQ = 100 * 100;

  useFrame((state) => {
    if (waterRef.current && hasWaterAnimation) {
      const time = state.clock.elapsedTime;
      const dx = state.camera.position.x - centerPos.x;
      const dy = state.camera.position.y - centerPos.y;
      const dz = state.camera.position.z - centerPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const lastUpdate = lastUpdateRef.current;
      if (distSq > VERY_FAR_SQ && time - lastUpdate < 0.5) return;
      if (distSq > FAR_SQ && time - lastUpdate < 0.2) return;
      lastUpdateRef.current = time;
      // Gentle ripple effect
      waterRef.current.position.y = 0.02 + Math.sin(time * 2) * 0.01;
    }
  });

  const s = scale;

  if (variant === 'tiered') {
    return (
      <group position={position}>
        {/* Base pool - octagonal */}
        <mesh position={[0, 0.15 * s, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.5 * s, 2.8 * s, 0.3 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.6} />
        </mesh>

        {/* Base pool water */}
        <mesh ref={waterRef} position={[0, 0.32 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.3 * s, 8]} />
          <meshStandardMaterial
            color="#3a7090"
            roughness={0.1}
            metalness={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Middle tier */}
        <mesh position={[0, 0.6 * s, 0]} castShadow>
          <cylinderGeometry args={[1.2 * s, 1.5 * s, 0.5 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
        </mesh>

        {/* Middle tier decorative band */}
        <mesh position={[0, 0.65 * s, 0]} castShadow>
          <torusGeometry args={[1.35 * s, 0.08 * s, 8, 16]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.cobaltBlue} roughness={0.6} />
        </mesh>

        {/* Middle water surface */}
        <mesh position={[0, 0.88 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1 * s, 8]} />
          <meshStandardMaterial
            color="#4a8aa0"
            roughness={0.1}
            metalness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Top tier */}
        <mesh position={[0, 1.2 * s, 0]} castShadow>
          <cylinderGeometry args={[0.5 * s, 0.7 * s, 0.4 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.6} />
        </mesh>

        {/* Central spout pillar */}
        <mesh position={[0, 1.7 * s, 0]} castShadow>
          <cylinderGeometry args={[0.12 * s, 0.15 * s, 0.8 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
        </mesh>

        {/* Finial */}
        <mesh position={[0, 2.2 * s, 0]} castShadow>
          <sphereGeometry args={[0.15 * s, 12, 10]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.brass} roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Water spouts - 4 cardinal directions */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={`spout-${i}`}
              position={[
                Math.cos(angle) * 0.7 * s,
                1.4 * s,
                Math.sin(angle) * 0.7 * s
              ]}
              rotation={[Math.PI / 6, angle + Math.PI / 2, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.04 * s, 0.06 * s, 0.25 * s, 6]} />
              <meshStandardMaterial color={ISLAMIC_COLORS.bronze} roughness={0.5} metalness={0.5} />
            </mesh>
          );
        })}

        {/* Decorative rim details */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={`rim-${i}`}
              position={[
                Math.cos(angle) * 2.6 * s,
                0.35 * s,
                Math.sin(angle) * 2.6 * s
              ]}
              castShadow
            >
              <sphereGeometry args={[0.12 * s, 8, 6]} />
              <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.8} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (variant === 'octagonal') {
    return (
      <group position={position}>
        {/* Octagonal basin */}
        <mesh position={[0, 0.25 * s, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2 * s, 2.2 * s, 0.5 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.5} />
        </mesh>

        {/* Inner lip */}
        <mesh position={[0, 0.52 * s, 0]} castShadow>
          <torusGeometry args={[1.8 * s, 0.1 * s, 8, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
        </mesh>

        {/* Water */}
        <mesh ref={waterRef} position={[0, 0.45 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.7 * s, 8]} />
          <meshStandardMaterial
            color="#3a7090"
            roughness={0.1}
            metalness={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Central jet base */}
        <mesh position={[0, 0.5 * s, 0]} castShadow>
          <cylinderGeometry args={[0.3 * s, 0.4 * s, 0.3 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
        </mesh>

        {/* Central jet */}
        <mesh position={[0, 1.0 * s, 0]} castShadow>
          <cylinderGeometry args={[0.08 * s, 0.1 * s, 0.8 * s, 8]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.bronze} roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Geometric tile inlay on sides */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
          return (
            <mesh
              key={`tile-${i}`}
              position={[
                Math.cos(angle) * 2.05 * s,
                0.25 * s,
                Math.sin(angle) * 2.05 * s
              ]}
              rotation={[0, -angle + Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.8 * s, 0.4 * s]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? ISLAMIC_COLORS.cobaltBlue : ISLAMIC_COLORS.turquoise}
                roughness={0.5}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  // Wall fountain variant
  return (
    <group position={position}>
      {/* Back panel */}
      <mesh position={[0, 1 * s, -0.1 * s]} castShadow receiveShadow>
        <boxGeometry args={[1.5 * s, 2 * s, 0.15 * s]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
      </mesh>

      {/* Decorative arch */}
      <mesh position={[0, 1.6 * s, 0]} castShadow>
        <torusGeometry args={[0.5 * s, 0.08 * s, 8, 16, Math.PI]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.cobaltBlue} roughness={0.6} />
      </mesh>

      {/* Spout */}
      <mesh position={[0, 1 * s, 0.1 * s]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06 * s, 0.08 * s, 0.3 * s, 6]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.bronze} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Basin */}
      <mesh position={[0, 0.3 * s, 0.3 * s]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6 * s, 0.7 * s, 0.4 * s, 12]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.5} />
      </mesh>

      {/* Water in basin */}
      <mesh ref={waterRef} position={[0, 0.52 * s, 0.3 * s]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55 * s, 12]} />
        <meshStandardMaterial
          color="#3a7090"
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};

// ========================================
// LION SCULPTURE
// ========================================

interface LionSculptureProps {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  material?: 'stone' | 'bronze';
}

/**
 * LionSculpture - Guardian lion sculpture
 * Common in Mamluk palace and mansion entrances
 */
export const LionSculpture: React.FC<LionSculptureProps> = ({
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  material = 'stone',
}) => {
  const s = scale;
  const color = material === 'bronze' ? ISLAMIC_COLORS.bronze : ISLAMIC_COLORS.limestone;
  const metalness = material === 'bronze' ? 0.6 : 0;
  const roughness = material === 'bronze' ? 0.4 : 0.8;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base plinth */}
      <mesh position={[0, 0.15 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2 * s, 0.3 * s, 0.8 * s]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.darkStone} roughness={0.9} />
      </mesh>

      {/* Body - elongated sphere */}
      <mesh position={[0, 0.6 * s, 0]} castShadow>
        <sphereGeometry args={[0.4 * s, 10, 8]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0.1 * s, 0.55 * s, 0]} castShadow>
        <sphereGeometry args={[0.35 * s, 10, 8]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>

      {/* Head */}
      <mesh position={[0.45 * s, 0.85 * s, 0]} castShadow>
        <sphereGeometry args={[0.3 * s, 10, 8]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>

      {/* Mane */}
      <mesh position={[0.35 * s, 0.9 * s, 0]} castShadow>
        <sphereGeometry args={[0.35 * s, 8, 6]} />
        <meshStandardMaterial color={color} roughness={roughness + 0.1} metalness={metalness} />
      </mesh>

      {/* Snout */}
      <mesh position={[0.7 * s, 0.75 * s, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.2 * s, 0.15 * s, 0.18 * s]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>

      {/* Front legs */}
      {[-0.15, 0.15].map((z, i) => (
        <mesh key={`front-leg-${i}`} position={[0.3 * s, 0.3 * s, z * s]} castShadow>
          <cylinderGeometry args={[0.08 * s, 0.1 * s, 0.5 * s, 8]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}

      {/* Back legs */}
      {[-0.15, 0.15].map((z, i) => (
        <mesh key={`back-leg-${i}`} position={[-0.2 * s, 0.3 * s, z * s]} castShadow>
          <cylinderGeometry args={[0.08 * s, 0.1 * s, 0.5 * s, 8]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}

      {/* Tail */}
      <mesh position={[-0.5 * s, 0.7 * s, 0]} rotation={[0, 0, 0.8]} castShadow>
        <cylinderGeometry args={[0.03 * s, 0.05 * s, 0.4 * s, 6]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[-0.65 * s, 0.9 * s, 0]} castShadow>
        <sphereGeometry args={[0.06 * s, 6, 6]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>

      {/* Ears */}
      {[-0.1, 0.1].map((z, i) => (
        <mesh key={`ear-${i}`} position={[0.35 * s, 1.1 * s, z * s]} castShadow>
          <coneGeometry args={[0.06 * s, 0.12 * s, 4]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
    </group>
  );
};

// ========================================
// ARCADE COLUMN WITH POINTED ARCH
// ========================================

interface ArcadeColumnProps {
  position?: [number, number, number];
  height?: number;
  hasArch?: boolean;
  archSpan?: number;
  columnStyle?: 'simple' | 'ornate' | 'twisted';
}

/**
 * ArcadeColumn - Column with optional pointed Islamic arch
 * For courtyards and covered walkways
 */
export const ArcadeColumn: React.FC<ArcadeColumnProps> = ({
  position = [0, 0, 0],
  height = 3,
  hasArch = false,
  archSpan = 3,
  columnStyle = 'simple',
}) => {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.15, 12]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.6} />
      </mesh>

      {/* Column shaft */}
      {columnStyle === 'simple' && (
        <mesh position={[0, height / 2 + 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.28, height - 0.8, 12]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.5} />
        </mesh>
      )}

      {columnStyle === 'ornate' && (
        <>
          <mesh position={[0, height / 2 + 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.28, height - 0.8, 12]} />
            <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.5} />
          </mesh>
          {/* Decorative bands */}
          {[0.3, 0.5, 0.7].map((frac, i) => (
            <mesh key={i} position={[0, height * frac + 0.4, 0]} castShadow>
              <torusGeometry args={[0.28, 0.03, 8, 16]} />
              <meshStandardMaterial color={ISLAMIC_COLORS.cobaltBlue} roughness={0.6} />
            </mesh>
          ))}
        </>
      )}

      {columnStyle === 'twisted' && (
        <>
          {/* Simplified twisted column using segments */}
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 0.5 + i * (height - 1) / 8;
            const angle = i * 0.3;
            return (
              <mesh key={i} position={[0, y, 0]} rotation={[0, angle, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, (height - 1) / 8 + 0.05, 8]} />
                <meshStandardMaterial color={ISLAMIC_COLORS.marble} roughness={0.5} />
              </mesh>
            );
          })}
        </>
      )}

      {/* Capital */}
      <mesh position={[0, height, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.28, 0.2, 12]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
      </mesh>
      <mesh position={[0, height + 0.15, 0]} castShadow>
        <boxGeometry args={[0.7, 0.12, 0.7]} />
        <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.8} />
      </mesh>

      {/* Pointed arch (if enabled) */}
      {hasArch && (
        <group position={[archSpan / 2, height + 0.2, 0]}>
          {/* Arch segments (simplified pointed arch) */}
          <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]} castShadow>
            <torusGeometry args={[archSpan / 2, 0.15, 8, 16, Math.PI]} />
            <meshStandardMaterial color={ISLAMIC_COLORS.limestone} roughness={0.7} />
          </mesh>
          {/* Keystone */}
          <mesh position={[0, archSpan / 2 + 0.6, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.4]} />
            <meshStandardMaterial color={ISLAMIC_COLORS.cobaltBlue} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ========================================
// MASHRABIYA (LATTICE SCREEN)
// ========================================

interface MashrabiyaProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  pattern?: 'diamond' | 'star' | 'hexagonal';
}

/**
 * Mashrabiya - Carved wooden lattice screen
 * Traditional window/balcony screen for privacy and air flow
 */
export const Mashrabiya: React.FC<MashrabiyaProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.5,
  height = 2,
  pattern = 'diamond',
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Wood background
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, 256, 256);

    // Draw lattice pattern
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 8;

    if (pattern === 'diamond') {
      // Diamond lattice
      const spacing = 32;
      for (let i = -8; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(i * spacing, 0);
        ctx.lineTo(i * spacing + 256, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * spacing + 256, 0);
        ctx.lineTo(i * spacing, 256);
        ctx.stroke();
      }
    } else if (pattern === 'star') {
      // Star pattern at intersections
      const spacing = 64;
      for (let x = spacing / 2; x < 256; x += spacing) {
        for (let y = spacing / 2; y < 256; y += spacing) {
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = spacing * 0.4;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    } else {
      // Hexagonal pattern
      const r = 24;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const x = col * r * 1.5 + (row % 2) * r * 0.75;
          const y = row * r * 1.3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 1.5, height / 2);
    tex.needsUpdate = true;
    return tex;
  }, [pattern, width, height]);

  if (!texture) return null;

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.08]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      {/* Lattice panel */}
      <mesh position={[0, 0, 0.05]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.85}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
};

// ========================================
// DECORATIVE URN
// ========================================

interface DecorativeUrnProps {
  position?: [number, number, number];
  scale?: number;
  variant?: 'amphora' | 'vase' | 'jar';
  color?: string;
}

export const DecorativeUrn: React.FC<DecorativeUrnProps> = ({
  position = [0, 0, 0],
  scale = 1,
  variant = 'amphora',
  color = ISLAMIC_COLORS.terracotta,
}) => {
  const s = scale;

  if (variant === 'amphora') {
    return (
      <group position={position}>
        {/* Base */}
        <mesh position={[0, 0.1 * s, 0]} castShadow>
          <cylinderGeometry args={[0.15 * s, 0.2 * s, 0.2 * s, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 0.5 * s, 0]} castShadow>
          <sphereGeometry args={[0.35 * s, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.9 * s, 0]} castShadow>
          <cylinderGeometry args={[0.12 * s, 0.2 * s, 0.4 * s, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Rim */}
        <mesh position={[0, 1.15 * s, 0]} castShadow>
          <torusGeometry args={[0.15 * s, 0.04 * s, 8, 16]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
        {/* Handles */}
        {[-1, 1].map((side, i) => (
          <mesh
            key={i}
            position={[side * 0.35 * s, 0.7 * s, 0]}
            rotation={[0, 0, side * 0.3]}
            castShadow
          >
            <torusGeometry args={[0.12 * s, 0.03 * s, 8, 12, Math.PI]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))}
      </group>
    );
  }

  if (variant === 'vase') {
    return (
      <group position={position}>
        <mesh position={[0, 0.3 * s, 0]} castShadow>
          <cylinderGeometry args={[0.25 * s, 0.15 * s, 0.6 * s, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.65 * s, 0]} castShadow>
          <cylinderGeometry args={[0.18 * s, 0.25 * s, 0.3 * s, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Decorative band */}
        <mesh position={[0, 0.5 * s, 0]} castShadow>
          <torusGeometry args={[0.26 * s, 0.03 * s, 8, 16]} />
          <meshStandardMaterial color={ISLAMIC_COLORS.cobaltBlue} roughness={0.6} />
        </mesh>
      </group>
    );
  }

  // Jar variant
  return (
    <group position={position}>
      <mesh position={[0, 0.25 * s, 0]} castShadow>
        <sphereGeometry args={[0.3 * s, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.5 * s, 0]} castShadow>
        <cylinderGeometry args={[0.15 * s, 0.25 * s, 0.2 * s, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
};

// Export color palette for use elsewhere
export { ISLAMIC_COLORS };
