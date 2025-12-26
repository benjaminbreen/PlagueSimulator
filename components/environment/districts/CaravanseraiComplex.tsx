/**
 * Caravanserai District Complex
 * Large fortified courtyard with arcade bays, fountain, camels, and merchant goods
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import { SANDSTONE_PALETTE, DARK_SANDSTONE, LIGHT_SANDSTONE } from '../constants';

export const CaravanseraiComplex: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CARAVANSERAI') return null;
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Procedural variation based on map position
  const seed = mapX * 100 + mapY;
  const variation = seededRandom(seed);

  // Sandstone colors with slight variation (imported from environment/constants)
  const sandstoneColor = SANDSTONE_PALETTE[Math.floor(variation * SANDSTONE_PALETTE.length)];

  // Sandstone block texture for arcade walls
  const sandstoneBlockTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base sandstone color
    ctx.fillStyle = sandstoneColor;
    ctx.fillRect(0, 0, 256, 256);

    // Draw stone blocks in a pattern
    const blockWidth = 64;
    const blockHeight = 32;
    ctx.strokeStyle = '#9a8868';
    ctx.lineWidth = 2;

    for (let y = 0; y < 256; y += blockHeight) {
      const offset = (y / blockHeight) % 2 === 0 ? 0 : blockWidth / 2;
      for (let x = -blockWidth / 2 + offset; x < 256; x += blockWidth) {
        ctx.strokeRect(x, y, blockWidth, blockHeight);
        // Add subtle shading variation
        const shade = seededRandom(seed + x + y * 256);
        ctx.fillStyle = shade > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 2, y + 2, blockWidth - 4, blockHeight - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, [seed, sandstoneColor]);

  // Water texture and animation
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create water-like pattern
    const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradient.addColorStop(0, '#4a9fc9');
    gradient.addColorStop(0.5, '#3588aa');
    gradient.addColorStop(1, '#2a7090');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Add some subtle wave patterns (using seeded random for consistency)
    for (let i = 0; i < 12; i++) {
      const x = seededRandom(seed + i * 10) * 128;
      const y = seededRandom(seed + i * 10 + 5) * 128;
      const size = 15 + seededRandom(seed + i * 10 + 3) * 20;
      const ripple = ctx.createRadialGradient(x, y, 0, x, y, size);
      ripple.addColorStop(0, 'rgba(120, 180, 230, 0.25)');
      ripple.addColorStop(1, 'rgba(60, 140, 200, 0)');
      ctx.fillStyle = ripple;
      ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [seed]);

  const waterRef = useRef<THREE.Mesh>(null);
  const jetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const splashRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    if (waterRef.current && waterTexture) {
      // Animate texture offset for water flow effect
      waterTexture.offset.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
      waterTexture.offset.y = Math.cos(state.clock.elapsedTime * 0.15) * 0.02;
    }
    const t = state.clock.elapsedTime;
    jetRefs.current.forEach((jet, i) => {
      if (!jet) return;
      const phase = t * 1.8 + i * 1.2;
      const height = 0.8 + Math.sin(phase) * 0.2;
      jet.scale.set(1, height, 1);
      jet.position.y = 0.25 + height * 0.3;
    });
    splashRefs.current.forEach((splash, i) => {
      if (!splash) return;
      const phase = t * 2 + i * 1.1;
      const pulse = 0.7 + Math.sin(phase) * 0.2;
      splash.scale.set(pulse, pulse, pulse);
      if (splash.material && 'opacity' in splash.material) {
        (splash.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(phase) * 0.1;
      }
    });
  });

  // Caravanserai dimensions
  const outerSize = 70;  // Large square courtyard
  const wallThickness = 2.5;
  const wallHeight = 10;
  const entranceWidth = 8;
  const arcadeDepth = 6;

  // Using imported sandstone colors from environment/constants
  const darkSandstone = DARK_SANDSTONE;
  const lightSandstone = LIGHT_SANDSTONE;

  // Number of arcade bays per side (procedurally varied)
  const baysPerSide = 6 + Math.floor(variation * 2); // 6-7 bays

  // Create arcade bays with arches
  const createArcadeBays = (sideLength: number, depth: number, height: number, rotation: number, offset: [number, number, number]) => {
    const bays = [];
    const bayWidth = sideLength / baysPerSide;

    for (let i = 0; i < baysPerSide; i++) {
      const x = -sideLength / 2 + bayWidth * i + bayWidth / 2;
      const pillarWidth = bayWidth * 0.2;
      const archWidth = bayWidth * 0.8;

      // Pillars
      if (i < baysPerSide) {
        bays.push(
          <mesh
            key={`pillar-${i}`}
            position={[x - bayWidth / 2 + pillarWidth / 2, height / 2, depth / 2 + 0.06]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pillarWidth, height, Math.max(0.6, depth - 0.12)]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>
        );
      }

      // Arched opening
      bays.push(
        <group key={`arch-${i}`} position={[x, 0, depth / 2]}>
          {/* Arch base */}
          <mesh position={[0, height * 0.3, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[archWidth, height * 0.6, Math.max(0.6, depth - 0.1)]} />
            <meshStandardMaterial
              map={sandstoneBlockTexture}
              color={sandstoneColor}
              roughness={0.9}
            />
          </mesh>
          {/* Arch top (half-cylinder) */}
          <mesh position={[0, height * 0.6, -0.05]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[archWidth / 2, archWidth / 2, Math.max(0.6, depth - 0.12), 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={lightSandstone} roughness={0.88} />
          </mesh>
          {/* Merchant stall goods (alternating types) */}
          {i % 3 === 0 && (
            <mesh position={[0, 1, depth * 0.35]} castShadow>
              <boxGeometry args={[archWidth * 0.6, 1.5, depth * 0.25]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#8a6a4a' : '#6a5a4a'} roughness={0.9} />
            </mesh>
          )}
          {i % 3 === 1 && (
            <group position={[0, 0.8, depth * 0.35]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.5, 1.6, 12]} />
                <meshStandardMaterial color="#9a7a5a" roughness={0.9} />
              </mesh>
              <mesh position={[0.7, 0, 0]} castShadow>
                <cylinderGeometry args={[0.35, 0.45, 1.4, 10]} />
                <meshStandardMaterial color="#aa8a6a" roughness={0.9} />
              </mesh>
            </group>
          )}
          {/* Sleeping mat for residential bays */}
          {i % 3 === 2 && (
            <mesh position={[0, 0.05, depth * 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[archWidth * 0.5, depth * 0.4]} />
              <meshStandardMaterial color="#7a5a4a" roughness={0.95} />
            </mesh>
          )}
        </group>
      );
    }

    return (
      <group position={offset} rotation={[0, rotation, 0]}>
        {bays}
        {/* Top wall section above arcades */}
        <mesh position={[0, height + wallHeight * 0.15, depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[sideLength, wallHeight * 0.3, depth]} />
          <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
        </mesh>
      </group>
    );
  };

  // Four directional entrances with half-dome arches
  const createEntrance = (rotation: number, offset: [number, number, number], direction: string) => {
    return (
      <group position={offset} rotation={[0, rotation, 0]}>
        {/* Entrance arch structure */}
        <group>
          {/* Side pillars */}
          <mesh position={[-entranceWidth / 2 - 1, wallHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, wallHeight, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>
          <mesh position={[entranceWidth / 2 + 1, wallHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, wallHeight, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.92} />
          </mesh>

          {/* Arch opening */}
          <mesh position={[0, wallHeight * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[entranceWidth, wallHeight * 0.8, wallThickness * 2]} />
            <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
          </mesh>

          {/* Half-dome arch top */}
          <mesh position={[0, wallHeight * 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[entranceWidth / 2, entranceWidth / 2, wallThickness * 2, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={lightSandstone} roughness={0.85} />
          </mesh>

          {/* Decorative half-sphere dome above arch */}
          <mesh position={[0, wallHeight + 1.5, 0]} castShadow receiveShadow>
            <sphereGeometry args={[entranceWidth / 3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#9aaa9a" roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Entrance passage */}
          <mesh position={[0, 3, -wallThickness]} receiveShadow>
            <boxGeometry args={[entranceWidth - 0.5, 6, wallThickness * 2]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.93} />
          </mesh>
        </group>

        {/* Wall torches on entrance */}
        {[-entranceWidth / 2 - 2, entranceWidth / 2 + 2].map((x, idx) => (
          <group key={`entrance-torch-${direction}-${idx}`} position={[x, wallHeight * 0.6, 1]}>
            <mesh castShadow>
              <boxGeometry args={[0.15, 1.2, 0.15]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.7, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {nightFactor > 0.05 && (
              <>
                <mesh position={[0, 0.9, 0]}>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial
                    color="#ff8a3c"
                    emissive="#ff6a1c"
                    emissiveIntensity={0.7 + Math.sin(Date.now() * 0.004 + idx) * 0.2}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight
                  position={[0, 1, 0]}
                  intensity={2.8 * nightFactor}
                  distance={18}
                  decay={2}
                  color="#ff9a4c"
                  castShadow
                />
              </>
            )}
          </group>
        ))}
      </group>
    );
  };

  // Corner towers
  const createCornerTower = (x: number, z: number) => {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.5, 3, wallHeight, 8]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.91} />
        </mesh>
        <mesh position={[0, wallHeight + 1, 0]} castShadow>
          <cylinderGeometry args={[2.8, 2.5, 2, 8]} />
          <meshStandardMaterial color={sandstoneColor} roughness={0.88} />
        </mesh>
        {/* Tower torch */}
        {nightFactor > 0.05 && (
          <pointLight
            position={[0, wallHeight + 1.5, 0]}
            intensity={3 * nightFactor}
            distance={25}
            decay={2}
            color="#ff9a4c"
            castShadow
          />
        )}
      </group>
    );
  };

  const courtyardSize = outerSize - arcadeDepth * 2;
  const wallSegmentLength = (outerSize - entranceWidth) / 2 - 3; // Account for entrance and towers

  return (
    <group>
      {/* Four outer wall segments (between entrances and corners) */}
      {/* North wall segments */}
      <mesh position={[-outerSize / 2 + wallSegmentLength / 2 + 3, wallHeight / 2, -outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2 - wallSegmentLength / 2 - 3, wallHeight / 2, -outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* South wall segments */}
      <mesh position={[-outerSize / 2 + wallSegmentLength / 2 + 3, wallHeight / 2, outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2 - wallSegmentLength / 2 - 3, wallHeight / 2, outerSize / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallSegmentLength, wallHeight, wallThickness]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* East wall segments */}
      <mesh position={[outerSize / 2, wallHeight / 2, -outerSize / 2 + wallSegmentLength / 2 + 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[outerSize / 2, wallHeight / 2, outerSize / 2 - wallSegmentLength / 2 - 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* West wall segments */}
      <mesh position={[-outerSize / 2, wallHeight / 2, -outerSize / 2 + wallSegmentLength / 2 + 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>
      <mesh position={[-outerSize / 2, wallHeight / 2, outerSize / 2 - wallSegmentLength / 2 - 3]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallSegmentLength]} />
        <meshStandardMaterial color={sandstoneColor} roughness={0.9} />
      </mesh>

      {/* Four directional entrances */}
      {createEntrance(0, [0, 0, -outerSize / 2], 'north')}
      {createEntrance(Math.PI, [0, 0, outerSize / 2], 'south')}
      {createEntrance(Math.PI / 2, [outerSize / 2, 0, 0], 'east')}
      {createEntrance(-Math.PI / 2, [-outerSize / 2, 0, 0], 'west')}

      {/* Corner towers */}
      {createCornerTower(-outerSize / 2, -outerSize / 2)}
      {createCornerTower(outerSize / 2, -outerSize / 2)}
      {createCornerTower(-outerSize / 2, outerSize / 2)}
      {createCornerTower(outerSize / 2, outerSize / 2)}

      {/* Inner arcade bays (four sides) */}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, 0, [0, 0, -outerSize / 2 + arcadeDepth / 2 + 2])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, Math.PI, [0, 0, outerSize / 2 - arcadeDepth / 2 - 2])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, Math.PI / 2, [outerSize / 2 - arcadeDepth / 2 - 2, 0, 0])}
      {createArcadeBays(outerSize - 10, arcadeDepth, 6, -Math.PI / 2, [-outerSize / 2 + arcadeDepth / 2 + 2, 0, 0])}

      {/* Central ornate square fountain */}
      <group position={[0, 0, 0]}>
        {/* Outer fountain basin (square) */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 1.2, 8]} />
          <meshStandardMaterial color={lightSandstone} roughness={0.82} />
        </mesh>

        {/* Ornate terracotta tile border around fountain */}
        {/* North and South borders */}
        {[-4.3, 4.3].map((z, zi) => (
          <group key={`tile-border-ns-${zi}`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <mesh key={`tile-ns-${zi}-${i}`} position={[-4 + i, 1.25, z]} castShadow>
                <boxGeometry args={[0.85, 0.15, 0.5]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#b86b4a' : '#c47a55'} roughness={0.75} />
              </mesh>
            ))}
          </group>
        ))}
        {/* East and West borders */}
        {[-4.3, 4.3].map((x, xi) => (
          <group key={`tile-border-ew-${xi}`}>
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={`tile-ew-${xi}-${i}`} position={[x, 1.25, -3 + i]} castShadow>
                <boxGeometry args={[0.5, 0.15, 0.85]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#c47a55' : '#b86b4a'} roughness={0.75} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Corner decorative tiles */}
        {[[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]].map((corner, ci) => (
          <mesh key={`corner-tile-${ci}`} position={[corner[0], 1.28, corner[1]]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.18, 8]} />
            <meshStandardMaterial color="#a55a3a" roughness={0.7} />
          </mesh>
        ))}

        {/* Inner basin */}
        <mesh position={[0, 1, 0]} receiveShadow>
          <boxGeometry args={[7, 0.4, 7]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.85} />
        </mesh>

        {/* Water surface - animated with texture */}
        <mesh ref={waterRef} position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.6, 6.6]} />
          <meshStandardMaterial
            map={waterTexture}
            color="#5599cc"
            roughness={0.15}
            metalness={0.3}
            transparent
            opacity={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>

        {/* Central fountain pillar */}
        <mesh position={[0, 2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.5, 2, 8]} />
          <meshStandardMaterial color={lightSandstone} roughness={0.8} />
        </mesh>

        {/* Fountain top ball */}
        <mesh position={[0, 3.2, 0]} castShadow>
          <sphereGeometry args={[0.6, 12, 8]} />
          <meshStandardMaterial color={darkSandstone} roughness={0.85} />
        </mesh>

        {/* Four fountain jets - emerging from the ball */}
        {[
          [0.3, 0],
          [-0.3, 0],
          [0, 0.3],
          [0, -0.3]
        ].map((offset, i) => (
          <group key={`fountain-jet-${i}`} position={[offset[0], 3.15, offset[1]]}>
            <mesh
              ref={(node) => {
                jetRefs.current[i] = node;
              }}
              position={[0, 0.3, 0]}
            >
              <cylinderGeometry args={[0.05, 0.08, 0.7, 8]} />
              <meshStandardMaterial color="#6bb6e8" emissive="#4a9fc9" emissiveIntensity={0.6} transparent opacity={0.75} />
            </mesh>
            <mesh
              ref={(node) => {
                splashRefs.current[i] = node;
              }}
              position={[0, -1.9, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.18, 0.32, 12]} />
              <meshStandardMaterial color="#7fc3ef" transparent opacity={0.4} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Decorative corner posts */}
        {[
          [-3, 0, -3],
          [3, 0, -3],
          [-3, 0, 3],
          [3, 0, 3],
        ].map((pos, i) => (
          <mesh key={`fountain-post-${i}`} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 1.5, 6]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
      </group>

      {/* Camels resting in courtyard */}
      {[
        [-15, 0, -12],
        [12, 0, -15],
        [-12, 0, 15],
        [15, 0, 12],
      ].map((pos, i) => (
        <group key={`camel-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[2.2, 1.2, 0.8]} />
            <meshStandardMaterial color="#b58a5a" roughness={0.9} />
          </mesh>
          <mesh position={[0.6, 1.4, 0]} castShadow>
            <boxGeometry args={[0.8, 0.8, 0.6]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.9} />
          </mesh>
          <mesh position={[1.4, 1.6, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.9} />
          </mesh>
          {[-0.8, 0.8].map((lx) => (
            <mesh key={`camel-leg-${i}-${lx}`} position={[lx, 0.2, 0]} castShadow>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Merchant crates and goods scattered in courtyard */}
      {[
        [-20, 0, 0],
        [20, 0, 0],
        [0, 0, -20],
        [0, 0, 20],
      ].map((pos, i) => (
        <mesh key={`crate-${i}`} position={[pos[0], 0.5, pos[2]]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 1, 1.2]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.93} />
        </mesh>
      ))}

      {/* Ground paving pattern in courtyard */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[courtyardSize, courtyardSize]} />
        <meshStandardMaterial color="#c8b896" roughness={0.95} displacementScale={0} />
      </mesh>

      {/* Entry/Exit areas - paved approach paths in four cardinal directions */}
      {/* North entry area */}
      <group position={[0, 0, -outerSize / 2 - 8]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 14]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {/* Stone border */}
        {[-6.2, 6.2].map((x, i) => (
          <mesh key={`n-border-${i}`} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.4, 0.25, 14]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {/* Hitching posts for animals */}
        {[-4, 0, 4].map((x, i) => (
          <mesh key={`n-post-${i}`} position={[x, 0.6, -5]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* South entry area */}
      <group position={[0, 0, outerSize / 2 + 8]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 14]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((x, i) => (
          <mesh key={`s-border-${i}`} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.4, 0.25, 14]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((x, i) => (
          <mesh key={`s-post-${i}`} position={[x, 0.6, 5]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* East entry area */}
      <group position={[outerSize / 2 + 8, 0, 0]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[14, 12]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((z, i) => (
          <mesh key={`e-border-${i}`} position={[0, 0.2, z]} castShadow>
            <boxGeometry args={[14, 0.25, 0.4]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((z, i) => (
          <mesh key={`e-post-${i}`} position={[5, 0.6, z]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* West entry area */}
      <group position={[-outerSize / 2 - 8, 0, 0]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[14, 12]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.92} />
        </mesh>
        {[-6.2, 6.2].map((z, i) => (
          <mesh key={`w-border-${i}`} position={[0, 0.2, z]} castShadow>
            <boxGeometry args={[14, 0.25, 0.4]} />
            <meshStandardMaterial color={darkSandstone} roughness={0.88} />
          </mesh>
        ))}
        {[-4, 0, 4].map((z, i) => (
          <mesh key={`w-post-${i}`} position={[-5, 0.6, z]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
};


