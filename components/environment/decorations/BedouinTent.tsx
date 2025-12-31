import React, { useMemo } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../../../utils/procedural';

type BedouinTentProps = {
  position: [number, number, number];
  seed: number;
  timeOfDay?: number;
};

export const BedouinTent: React.FC<BedouinTentProps> = ({ position, seed, timeOfDay }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const isNight = timeOfDay !== undefined && (timeOfDay < 0.25 || timeOfDay > 0.75);

  const tentConfig = useMemo(() => {
    // Tent dimensions
    const width = 3.5 + rand(1) * 1;
    const depth = 4 + rand(2) * 1.5;
    const height = 2.8 + rand(3) * 0.6;

    // Color scheme: Traditional Bedouin colors
    const colorSchemes = [
      { base: '#8B0000', stripe: '#1a0000', accent: '#D4AF37' }, // Deep red, black, gold
      { base: '#4A2C2A', stripe: '#F5F5DC', accent: '#8B4513' }, // Brown, beige, saddle brown
      { base: '#2C1810', stripe: '#8B4513', accent: '#CD853F' }, // Dark brown, brown, peru
      { base: '#654321', stripe: '#F5DEB3', accent: '#A0522D' }, // Dark tan, wheat, sienna
      { base: '#8B0000', stripe: '#000000', accent: '#FFD700' }, // Crimson, black, gold
      { base: '#3C2415', stripe: '#D2691E', accent: '#F5F5DC' }, // Very dark brown, chocolate, beige
    ];
    const scheme = colorSchemes[Math.floor(rand(4) * colorSchemes.length)];

    // Pattern type
    const patternType = Math.floor(rand(5) * 3); // 0: vertical stripes, 1: diamonds, 2: zigzag
    const stripeCount = 4 + Math.floor(rand(6) * 4); // 4-7 stripes/patterns

    return { width, depth, height, scheme, patternType, stripeCount };
  }, [seed]);

  // Create authentic Bedouin pattern texture
  const tentTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill base color
    ctx.fillStyle = tentConfig.scheme.base;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (tentConfig.patternType === 0) {
      // Vertical stripes (most common Bedouin pattern)
      const stripeWidth = canvas.width / tentConfig.stripeCount;
      for (let i = 0; i < tentConfig.stripeCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? tentConfig.scheme.stripe : tentConfig.scheme.base;
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
      }
      // Add thin accent stripes
      for (let i = 0; i < tentConfig.stripeCount; i += 2) {
        ctx.fillStyle = tentConfig.scheme.accent;
        ctx.fillRect(i * stripeWidth + stripeWidth * 0.4, 0, stripeWidth * 0.2, canvas.height);
      }
    } else if (tentConfig.patternType === 1) {
      // Diamond pattern
      const diamondSize = canvas.width / (tentConfig.stripeCount * 1.5);
      ctx.fillStyle = tentConfig.scheme.stripe;
      for (let y = 0; y < canvas.height; y += diamondSize) {
        for (let x = 0; x < canvas.width; x += diamondSize) {
          const offsetX = (Math.floor(y / diamondSize) % 2) * (diamondSize / 2);
          ctx.beginPath();
          ctx.moveTo(x + offsetX, y + diamondSize / 2);
          ctx.lineTo(x + diamondSize / 2 + offsetX, y);
          ctx.lineTo(x + diamondSize + offsetX, y + diamondSize / 2);
          ctx.lineTo(x + diamondSize / 2 + offsetX, y + diamondSize);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Add accent dots
      ctx.fillStyle = tentConfig.scheme.accent;
      for (let y = diamondSize / 2; y < canvas.height; y += diamondSize) {
        for (let x = diamondSize / 2; x < canvas.width; x += diamondSize) {
          ctx.beginPath();
          ctx.arc(x, y, diamondSize * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Zigzag pattern
      const zigzagHeight = canvas.height / tentConfig.stripeCount;
      ctx.fillStyle = tentConfig.scheme.stripe;
      for (let i = 0; i < tentConfig.stripeCount; i++) {
        const y = i * zigzagHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= canvas.width; x += zigzagHeight / 2) {
          const peakY = y + (x / (zigzagHeight / 2)) % 2 === 0 ? 0 : zigzagHeight / 2;
          ctx.lineTo(x, peakY);
        }
        ctx.lineTo(canvas.width, y + zigzagHeight);
        ctx.lineTo(0, y + zigzagHeight);
        ctx.closePath();
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, [tentConfig]);

  return (
    <group position={position}>
      {/* TENT STRUCTURE */}
      {/* Main tent body - peaked roof shape */}
      <group position={[0, tentConfig.height / 2, 0]}>
        {/* Front face */}
        <mesh position={[0, tentConfig.height / 4, tentConfig.depth / 2]} rotation={[Math.PI / 6, 0, 0]} castShadow>
          <planeGeometry args={[tentConfig.width, tentConfig.height * 0.7]} />
          <meshStandardMaterial
            color={tentConfig.scheme.base}
            map={tentTexture}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Back face */}
        <mesh position={[0, tentConfig.height / 4, -tentConfig.depth / 2]} rotation={[-Math.PI / 6, Math.PI, 0]} castShadow>
          <planeGeometry args={[tentConfig.width, tentConfig.height * 0.7]} />
          <meshStandardMaterial
            color={tentConfig.scheme.base}
            map={tentTexture}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Left side */}
        <mesh position={[-tentConfig.width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <planeGeometry args={[tentConfig.depth, tentConfig.height]} />
          <meshStandardMaterial
            color={tentConfig.scheme.stripe}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Right side */}
        <mesh position={[tentConfig.width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <planeGeometry args={[tentConfig.depth, tentConfig.height]} />
          <meshStandardMaterial
            color={tentConfig.scheme.stripe}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Roof ridge beam */}
        <mesh position={[0, tentConfig.height / 2, 0]} castShadow>
          <boxGeometry args={[tentConfig.width + 0.2, 0.1, 0.1]} />
          <meshStandardMaterial color="#3C2415" roughness={0.6} />
        </mesh>
      </group>

      {/* Tent poles */}
      {[
        [-tentConfig.width / 2.5, tentConfig.height / 2, tentConfig.depth / 3],
        [tentConfig.width / 2.5, tentConfig.height / 2, tentConfig.depth / 3],
        [-tentConfig.width / 2.5, tentConfig.height / 2, -tentConfig.depth / 3],
        [tentConfig.width / 2.5, tentConfig.height / 2, -tentConfig.depth / 3],
      ].map((pos, i) => (
        <mesh key={`pole-${i}`} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, tentConfig.height, 6]} />
          <meshStandardMaterial color="#4A3728" roughness={0.7} />
        </mesh>
      ))}

      {/* CAMPFIRE */}
      <group position={[tentConfig.width * 0.8, 0, 0]}>
        {/* Stone circle */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 0.5;
          return (
            <mesh
              key={`stone-${i}`}
              position={[Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius]}
              rotation={[rand(10 + i) * 0.3, rand(20 + i) * Math.PI * 2, rand(30 + i) * 0.3]}
              castShadow
            >
              <boxGeometry args={[0.25, 0.3, 0.2]} />
              <meshStandardMaterial color="#5a5a5a" roughness={0.95} />
            </mesh>
          );
        })}

        {/* Fire logs */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#3C2415" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#4A3728" roughness={0.8} />
        </mesh>

        {/* Flames (glowing at night) */}
        {isNight && (
          <>
            <mesh position={[0, 0.4, 0]} castShadow>
              <coneGeometry args={[0.2, 0.5, 6]} />
              <meshStandardMaterial
                color="#ff6600"
                emissive="#ff4400"
                emissiveIntensity={2}
                transparent
                opacity={0.8}
              />
            </mesh>
            <mesh position={[0.1, 0.5, -0.05]} castShadow>
              <coneGeometry args={[0.15, 0.4, 5]} />
              <meshStandardMaterial
                color="#ffaa00"
                emissive="#ff8800"
                emissiveIntensity={2.5}
                transparent
                opacity={0.7}
              />
            </mesh>
            <pointLight position={[0, 0.5, 0]} color="#ff6600" intensity={3} distance={6} castShadow />
          </>
        )}

        {/* Tripod for teapot */}
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          const radius = 0.35;
          return (
            <mesh
              key={`tripod-${i}`}
              position={[Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius]}
              rotation={[0.3, -angle, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
              <meshStandardMaterial color="#2C1810" roughness={0.6} metalness={0.3} />
            </mesh>
          );
        })}

        {/* Teapot */}
        <group position={[0, 0.8, 0]}>
          {/* Pot body */}
          <mesh castShadow>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color="#8B7355" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Spout */}
          <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <cylinderGeometry args={[0.03, 0.05, 0.25, 8]} />
            <meshStandardMaterial color="#8B7355" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Handle */}
          <mesh position={[-0.15, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.1, 0.02, 8, 12, Math.PI]} />
            <meshStandardMaterial color="#8B7355" roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      </group>

      {/* HANGING LANTERN */}
      <group position={[0, tentConfig.height * 0.9, tentConfig.depth / 2 + 0.3]}>
        {/* Chain/rope */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
          <meshStandardMaterial color="#2C1810" roughness={0.7} />
        </mesh>

        {/* Lantern frame */}
        <group>
          {/* Top cap */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 0.1, 6]} />
            <meshStandardMaterial color="#3C2415" roughness={0.6} metalness={0.4} />
          </mesh>

          {/* Glass cage */}
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.4, 6]} />
            <meshStandardMaterial
              color={isNight ? '#ffbb77' : '#ddaa88'}
              transparent
              opacity={0.3}
              roughness={0.2}
              emissive={isNight ? '#ff8833' : '#000000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>

          {/* Bottom cap */}
          <mesh position={[0, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.15, 0.1, 6]} />
            <meshStandardMaterial color="#3C2415" roughness={0.6} metalness={0.4} />
          </mesh>

          {/* Inner flame (night only) */}
          {isNight && (
            <>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                  color="#ffaa44"
                  emissive="#ff8833"
                  emissiveIntensity={2}
                />
              </mesh>
              <pointLight position={[0, 0, 0]} color="#ff9944" intensity={1.5} distance={4} castShadow />
            </>
          )}
        </group>
      </group>
    </group>
  );
};
