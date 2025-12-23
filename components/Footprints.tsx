/**
 * Footprints Component
 * Simple decal-based footprint system for sand/soft terrain
 * Uses a pool of reusable decals for performance
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_FOOTPRINTS = 20; // Pool size
const FOOTPRINT_LIFETIME = 12; // Seconds before fade
const STEP_DISTANCE = 0.8; // Distance between footprints

interface Footprint {
  position: THREE.Vector3;
  rotation: number;
  spawnTime: number;
  isLeft: boolean;
}

interface FootprintsProps {
  playerPosition: THREE.Vector3;
  playerRotation: number;
  isWalking: boolean;
  enabled?: boolean; // Only show in desert/sand biomes
}

export const Footprints: React.FC<FootprintsProps> = ({
  playerPosition,
  playerRotation,
  isWalking,
  enabled = true
}) => {
  const footprintsRef = useRef<Footprint[]>([]);
  const lastFootprintPos = useRef(new THREE.Vector3());
  const stepIndex = useRef(0);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Create footprint texture (simple oval shape)
  const footprintTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw footprint shape (elongated oval)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size * 0.15, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add toe indents
    for (let i = 0; i < 5; i++) {
      const x = size / 2 + (i - 2) * size * 0.08;
      const y = size * 0.25;
      const radius = size * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((state) => {
    if (!enabled || !isWalking) return;

    const currentTime = state.clock.elapsedTime;

    // Check if player moved enough for new footprint
    const distMoved = playerPosition.distanceTo(lastFootprintPos.current);
    if (distMoved > STEP_DISTANCE) {
      // Alternate left/right foot
      const isLeft = stepIndex.current % 2 === 0;
      stepIndex.current++;

      // Calculate footprint position (offset from center for left/right)
      const footOffset = isLeft ? -0.2 : 0.2;
      const offsetDir = new THREE.Vector3(
        Math.cos(playerRotation + Math.PI / 2),
        0,
        Math.sin(playerRotation + Math.PI / 2)
      );
      const footprintPos = playerPosition.clone().add(offsetDir.multiplyScalar(footOffset));

      // Add new footprint to pool (replace oldest)
      const newFootprint: Footprint = {
        position: footprintPos,
        rotation: playerRotation,
        spawnTime: currentTime,
        isLeft
      };

      if (footprintsRef.current.length < MAX_FOOTPRINTS) {
        footprintsRef.current.push(newFootprint);
      } else {
        // Replace oldest footprint
        footprintsRef.current.shift();
        footprintsRef.current.push(newFootprint);
      }

      lastFootprintPos.current.copy(playerPosition);
    }

    // Update footprint mesh positions and opacity (fade over time)
    footprintsRef.current.forEach((footprint, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      const age = currentTime - footprint.spawnTime;
      const fadeProgress = age / FOOTPRINT_LIFETIME;

      if (fadeProgress < 1) {
        mesh.position.copy(footprint.position);
        mesh.position.y = 0.02; // Slightly above ground
        mesh.rotation.z = -footprint.rotation;

        // Fade out over lifetime
        const opacity = Math.max(0, 1 - fadeProgress);
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.4;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    });
  });

  if (!enabled || !footprintTexture) return null;

  return (
    <group>
      {Array.from({ length: MAX_FOOTPRINTS }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <planeGeometry args={[0.3, 0.5]} />
          <meshBasicMaterial
            map={footprintTexture}
            transparent
            opacity={0}
            depthWrite={false}
            color="#4a3a2a" // Darker than sand
          />
        </mesh>
      ))}
    </group>
  );
};
