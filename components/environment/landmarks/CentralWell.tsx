/**
 * Central Well Component
 * Animated fountain in the central market square with water particles
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HoverableGroup } from '../shared/HoverSystem';
import { HOVER_WIREFRAME_COLORS } from '../constants';
import { PlazaCat } from '../../Environment';

export const CentralWell: React.FC<{ mapX: number, mapY: number; timeOfDay?: number; catPositionRef?: React.MutableRefObject<THREE.Vector3>; ratPositions?: THREE.Vector3[] }> = ({ mapX, mapY, timeOfDay, catPositionRef, ratPositions }) => {
  if (mapX !== 0 || mapY !== 0) return null;
  const waterRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const rippleRef2 = useRef<THREE.Mesh>(null);
  const rippleRef3 = useRef<THREE.Mesh>(null);
  const spoutRef = useRef<THREE.Points>(null);
  const splashRef = useRef<THREE.Points>(null);
  const spoutGeometry = useRef<THREE.BufferGeometry | null>(null);
  const splashGeometry = useRef<THREE.BufferGeometry | null>(null);
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Animated water texture
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base water gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#3a8fba');
    gradient.addColorStop(0.4, '#2a7090');
    gradient.addColorStop(0.7, '#1b5a7a');
    gradient.addColorStop(1, '#1a4f6a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add concentric ripple patterns
    for (let r = 0; r < 6; r++) {
      const radius = 30 + r * 35;
      ctx.beginPath();
      ctx.arc(128, 128, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 200, 230, ${0.3 - r * 0.04})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Add sparkle highlights
    for (let i = 0; i < 20; i++) {
      const x = 40 + Math.random() * 176;
      const y = 40 + Math.random() * 176;
      const highlight = ctx.createRadialGradient(x, y, 0, x, y, 8);
      highlight.addColorStop(0, 'rgba(200, 230, 255, 0.4)');
      highlight.addColorStop(1, 'rgba(100, 180, 220, 0)');
      ctx.fillStyle = highlight;
      ctx.fillRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;

    // Animate water texture rotation and offset
    if (waterTexture) {
      waterTexture.rotation = t * 0.05;
      waterTexture.offset.set(Math.sin(t * 0.3) * 0.05, Math.cos(t * 0.25) * 0.05);
    }

    waterRef.current.rotation.z = t * 0.08;
    waterRef.current.position.y = 1.05 + Math.sin(t * 2.5) * 0.015;

    // Animate ripples with staggered timing
    if (rippleRef.current) {
      const scale = 1 + (Math.sin(t * 2.0) + 1) * 0.03;
      rippleRef.current.scale.set(scale, scale, 1);
      (rippleRef.current.material as THREE.MeshStandardMaterial).opacity = 0.4 + Math.sin(t * 2.0 + 0.5) * 0.15;
    }
    if (rippleRef2.current) {
      const scale = 1 + (Math.sin(t * 1.5 + 1.0) + 1) * 0.035;
      rippleRef2.current.scale.set(scale, scale, 1);
      (rippleRef2.current.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 1.5 + 1.2) * 0.12;
    }
    if (rippleRef3.current) {
      const scale = 1 + (Math.sin(t * 1.2 + 2.0) + 1) * 0.04;
      rippleRef3.current.scale.set(scale, scale, 1);
      (rippleRef3.current.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(t * 1.2 + 2.5) * 0.1;
    }

    // Animate fountain spout with realistic parabolic arcs
    if (spoutRef.current && spoutGeometry.current) {
      const positions = spoutGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        // Each droplet has its own phase in the arc
        const phase = (t * 1.5 + i * 0.12) % 1.2;
        const arcProgress = phase / 1.2;
        // Parabolic trajectory: starts at pillar top (2.5), rises slightly, then falls to water (1.0)
        // Peak at about 2.8, then fall to 1.0
        const peakHeight = 2.9;
        const startHeight = 2.5;
        const endHeight = 1.0;
        const height = arcProgress < 0.3
          ? startHeight + (peakHeight - startHeight) * (arcProgress / 0.3)  // Rising
          : peakHeight - (peakHeight - endHeight) * ((arcProgress - 0.3) / 0.7);  // Falling
        positions.array[ix + 1] = height;
        // Spread outward as droplets fall
        const spread = 0.05 + arcProgress * 0.6;
        const angle = (i / positions.count) * Math.PI * 2 + t * 0.15;
        positions.array[ix] = Math.cos(angle) * spread;
        positions.array[ix + 2] = Math.sin(angle) * spread;
      }
      positions.needsUpdate = true;
    }

    // Animate splash particles at water surface
    if (splashRef.current && splashGeometry.current) {
      const positions = splashGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const phase = (t * 2.0 + i * 0.3) % 1.0;
        // Splashes radiate outward and fade
        const radius = 0.3 + phase * 0.8;
        const angle = (i / positions.count) * Math.PI * 2 + i * 0.5;
        positions.array[ix] = Math.cos(angle) * radius;
        positions.array[ix + 1] = 1.02 + Math.sin(phase * Math.PI) * 0.15;
        positions.array[ix + 2] = Math.sin(angle) * radius;
      }
      positions.needsUpdate = true;
    }
  });

  // Main fountain spout particles
  const spoutPoints = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.05 + Math.random() * 0.03;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 2.5 + Math.random() * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    spoutGeometry.current = geometry;
    return geometry;
  }, []);

  // Splash particles where water hits the surface
  const splashPoints = useMemo(() => {
    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 1.02;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    splashGeometry.current = geometry;
    return geometry;
  }, []);

  return (
    <HoverableGroup
      position={[0, 0, 0]}
      boxSize={[14, 6, 10]}
      color={HOVER_WIREFRAME_COLORS.poi}
      labelTitle="Market Fountain"
      labelLines={['Fresh water', 'Carved limestone', 'City gathering place']}
      labelOffset={[0, 4.2, 0]}
    >
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.4, 3.8, 1.1, 20]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.25, 20, 1, true]} />
        <meshStandardMaterial color="#b79e7f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <torusGeometry args={[3.1, 0.2, 8, 24]} />
        <meshStandardMaterial color="#9b7b4f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.4, 16]} />
        <meshStandardMaterial color="#7b5a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.3, 12]} />
        <meshStandardMaterial color="#a98963" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 12]} />
        <meshStandardMaterial color="#bfa57e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 0.9, 10]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
      {/* Animated water surface with texture */}
      <mesh ref={waterRef} position={[0, 1.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial
          map={waterTexture || undefined}
          color="#2a7090"
          roughness={0.15}
          metalness={0.7}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Main fountain spout */}
      <points ref={spoutRef} geometry={spoutPoints} position={[0, 0, 0]}>
        <pointsMaterial color="#a8ddf5" size={0.08} sizeAttenuation transparent opacity={0.9} />
      </points>
      {/* Splash particles at water surface */}
      <points ref={splashRef} geometry={splashPoints} position={[0, 0, 0]}>
        <pointsMaterial color="#c8eeff" size={0.04} sizeAttenuation transparent opacity={0.7} />
      </points>
      {/* Animated ripple rings */}
      <mesh ref={rippleRef} position={[0, 1.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 1.0, 32]} />
        <meshStandardMaterial color="#7ac5e5" transparent opacity={0.4} roughness={0.05} metalness={0.5} />
      </mesh>
      <mesh ref={rippleRef2} position={[0, 1.015, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.9, 1.6, 32]} />
        <meshStandardMaterial color="#5aabcc" transparent opacity={0.3} roughness={0.05} metalness={0.5} />
      </mesh>
      <mesh ref={rippleRef3} position={[0, 1.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.4, 2.2, 32]} />
        <meshStandardMaterial color="#4a95b5" transparent opacity={0.2} roughness={0.05} metalness={0.5} />
      </mesh>
      <HoverableGroup
        position={[-9, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <HoverableGroup
        position={[9, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <PlazaCat
        waypoints={[[-12, 0, 9], [12, 0, -9], [6, 0, 6], [-5, 0.25, 3]]}
        catPositionRef={catPositionRef}
        ratPositions={ratPositions}
      />
    </HoverableGroup>
  );
};

