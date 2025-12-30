/**
 * Hanging Carpets Component
 *
 * Renders colorful carpets suspended between buildings in market districts.
 * Uses catenary physics for realistic sag and wind animation.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HangingCarpet, getCarpetCatenaryPoint } from '../../../utils/hangingCarpets';

interface HangingCarpetsProps {
  carpets: HangingCarpet[];
}

/**
 * Create pattern texture for carpet
 */
const createCarpetTexture = (
  carpet: HangingCarpet
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Fill with primary color base
  ctx.fillStyle = carpet.primaryColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw pattern based on type
  ctx.fillStyle = carpet.secondaryColor;
  ctx.strokeStyle = carpet.secondaryColor;
  ctx.lineWidth = 3;

  if (carpet.patternType === 'striped') {
    // Horizontal stripes
    const stripeCount = 16;
    const stripeHeight = canvas.height / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillRect(0, i * stripeHeight, canvas.width, stripeHeight * 0.6);
    }
  } else if (carpet.patternType === 'geometric') {
    // Diamond/geometric pattern
    const gridSize = 8;
    const cellWidth = canvas.width / gridSize;
    const cellHeight = canvas.height / gridSize;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;

        // Draw diamond
        ctx.beginPath();
        ctx.moveTo(x, y - cellHeight * 0.3);
        ctx.lineTo(x + cellWidth * 0.3, y);
        ctx.lineTo(x, y + cellHeight * 0.3);
        ctx.lineTo(x - cellWidth * 0.3, y);
        ctx.closePath();

        if ((row + col) % 2 === 0) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      }
    }
  } else if (carpet.patternType === 'medallion') {
    // Central medallion with border
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Border pattern
    const borderWidth = 40;
    ctx.fillRect(0, 0, canvas.width, borderWidth);
    ctx.fillRect(0, canvas.height - borderWidth, canvas.width, borderWidth);
    ctx.fillRect(0, 0, borderWidth, canvas.height);
    ctx.fillRect(canvas.width - borderWidth, 0, borderWidth, canvas.height);

    // Central medallion (circle with rays)
    const radius = Math.min(canvas.width, canvas.height) * 0.25;

    // Draw rays
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius * 1.5,
        centerY + Math.sin(angle) * radius * 1.5
      );
      ctx.stroke();
    }

    // Central circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle (primary color)
    ctx.fillStyle = carpet.primaryColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
};

const SingleCarpet: React.FC<{ carpet: HangingCarpet }> = ({ carpet }) => {
  const carpetRef = useRef<THREE.Mesh>(null);
  const ropeRef = useRef<THREE.Line>(null);
  const lastUpdateRef = useRef(0);
  const centerPos = useMemo(() => {
    const midX = (carpet.start[0] + carpet.end[0]) * 0.5;
    const midY = (carpet.start[1] + carpet.end[1]) * 0.5;
    const midZ = (carpet.start[2] + carpet.end[2]) * 0.5;
    return new THREE.Vector3(midX, midY, midZ);
  }, [carpet.end, carpet.start]);
  const FAR_SQ = 70 * 70;
  const VERY_FAR_SQ = 100 * 100;

  // Store original positions separately (NOT a reference)
  const originalPositionsRef = useRef<Float32Array | null>(null);

  // Generate carpet geometry with proper UVs for patterns
  const carpetGeometry = useMemo(() => {
    const segments = 16; // Smooth catenary curve
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Generate vertices along catenary curve
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const [x, y, z] = getCarpetCatenaryPoint(carpet, t);

      // Create quad strip (two vertices per segment)
      const dx = carpet.end[0] - carpet.start[0];
      const dz = carpet.end[2] - carpet.start[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Perpendicular direction for width
      const perpX = -dz / dist;
      const perpZ = dx / dist;

      // Top edge of carpet
      positions.push(
        x + perpX * carpet.width / 2,
        y,
        z + perpZ * carpet.width / 2
      );
      uvs.push(t, 0);

      // Bottom edge of carpet
      positions.push(
        x - perpX * carpet.width / 2,
        y,
        z - perpZ * carpet.width / 2
      );
      uvs.push(t, 1);
    }

    // Store original positions as a COPY
    originalPositionsRef.current = new Float32Array(positions);

    // Generate indices for triangle strip
    for (let i = 0; i < segments; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;

      // Two triangles per segment
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [carpet]);

  // Generate rope geometry
  const ropeGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const [x, y, z] = getCarpetCatenaryPoint(carpet, t);
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [carpet]);

  // Wind animation - using stored original positions
  useFrame((state) => {
    if (!carpetRef.current || !originalPositionsRef.current) return;

    const time = state.clock.elapsedTime;
    const camDx = state.camera.position.x - centerPos.x;
    const camDy = state.camera.position.y - centerPos.y;
    const camDz = state.camera.position.z - centerPos.z;
    const distSq = camDx * camDx + camDy * camDy + camDz * camDz;
    const lastUpdate = lastUpdateRef.current;
    if (distSq > VERY_FAR_SQ && time - lastUpdate < 0.5) return;
    if (distSq > FAR_SQ && time - lastUpdate < 0.18) return;
    lastUpdateRef.current = time;
    const windSpeed = 0.4;
    const windStrength = 0.08;

    // Get references to position arrays
    const positions = carpetGeometry.getAttribute('position');
    const originalPositions = originalPositionsRef.current;

    // Calculate direction perpendicular to carpet
    const dx = carpet.end[0] - carpet.start[0];
    const dz = carpet.end[2] - carpet.start[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const perpX = -dz / dist;
    const perpZ = dx / dist;

    // Apply wind sway to each vertex
    for (let i = 0; i < originalPositions.length / 3; i++) {
      const t = (i % 2 === 0 ? i / 2 : (i - 1) / 2) / 16; // Normalized position along carpet

      // Wind sway based on position along carpet (more at ends)
      const swayAmount = Math.sin(time * windSpeed + carpet.windPhase + t * Math.PI) * windStrength;
      const edgeFactor = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edges

      const idx = i * 3;
      // Apply sway from ORIGINAL positions, not accumulated
      positions.array[idx] = originalPositions[idx] + perpX * swayAmount * edgeFactor;
      positions.array[idx + 1] = originalPositions[idx + 1]; // Don't modify Y
      positions.array[idx + 2] = originalPositions[idx + 2] + perpZ * swayAmount * edgeFactor;
    }

    positions.needsUpdate = true;
  });

  // Material with pattern texture
  const carpetMaterial = useMemo(() => {
    const texture = createCarpetTexture(carpet);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
    });
  }, [carpet]);

  const ropeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#4a3a2a',
      linewidth: 2,
    });
  }, []);

  return (
    <group>
      {/* Suspension rope */}
      {/* @ts-expect-error R3F line element conflicts with SVG line type */}
      <line ref={ropeRef} geometry={ropeGeometry} material={ropeMaterial} />

      {/* Carpet mesh */}
      <mesh
        ref={carpetRef}
        geometry={carpetGeometry}
        material={carpetMaterial}
        castShadow
        receiveShadow
      />

      {/* Decorative tassels at corners - LARGER and more visible */}
      {[0, 1].map((end) => {
        const t = end;
        const [x, y, z] = getCarpetCatenaryPoint(carpet, t);

        const dx = carpet.end[0] - carpet.start[0];
        const dz = carpet.end[2] - carpet.start[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const perpX = -dz / dist;
        const perpZ = dx / dist;

        return (
          <group key={end}>
            {/* Tassels on both sides */}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[
                  x + perpX * carpet.width / 2 * side,
                  y - 0.2,
                  z + perpZ * carpet.width / 2 * side
                ]}
                castShadow
              >
                <cylinderGeometry args={[0.08, 0.04, 0.5, 8]} />
                <meshStandardMaterial color={carpet.secondaryColor} roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

export const HangingCarpets: React.FC<HangingCarpetsProps> = ({ carpets }) => {
  return (
    <group>
      {carpets.map((carpet) => (
        <SingleCarpet key={carpet.id} carpet={carpet} />
      ))}
    </group>
  );
};
