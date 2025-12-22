import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { InteriorSpec, InteriorProp, InteriorPropType, InteriorRoom, SimulationParams, PlayerStats, Obstacle, SocialClass, BuildingType } from '../types';
import { seededRandom } from '../utils/procedural';
import { Player } from './Player';
import { Humanoid } from './Humanoid';
import { generateInteriorObstacles } from '../utils/interior';
import { PushableObject, createPushable } from '../utils/pushables';
import { ImpactPuffs, ImpactPuffSlot, MAX_PUFFS } from './ImpactPuffs';

interface InteriorSceneProps {
  spec: InteriorSpec;
  params: SimulationParams;
  playerStats: PlayerStats;
  onPickupPrompt?: (label: string | null) => void;
}

const createRugTexture = (base: string, accent: string, pattern: 'stripe' | 'diamond') => {
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
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const createNoiseTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 2000; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = Math.random() > 0.5 ? base : accent;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
};

const createPlankTexture = (base: string, accent: string) => {
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
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

const createWallTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? accent : base;
    ctx.fillRect(0, i * 32, canvas.width, 8);
  }
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 600; i += 1) {
    ctx.fillStyle = accent;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const darkenHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const FirePit: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const count = 40;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.15 + Math.random() * 0.2;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = 0.2 + Math.random() * 0.4;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geometryRef.current = geo;
    return geo;
  }, []);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.frustumCulled = false;
    }
  }, []);

  useEffect(() => {
    if (!geometryRef.current) return;
    const positionsAttr = geometryRef.current.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positionsAttr.count; i += 1) {
      positionsAttr.array[i * 3 + 1] = 0.1 + Math.random() * 0.5;
    }
    positionsAttr.needsUpdate = true;
  }, []);

  return (
    <points ref={pointsRef} position={[position[0], position[1] + 0.2, position[2]]} geometry={positions}>
      <pointsMaterial color="#ffb060" size={0.04} transparent opacity={0.8} />
    </points>
  );
};

const FireSmoke: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const count = 24;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = 0.2 + Math.random() * 0.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geometryRef.current = geo;
    return geo;
  }, []);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.frustumCulled = false;
    }
  }, []);

  useEffect(() => {
    if (!geometryRef.current) return;
    const positionsAttr = geometryRef.current.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positionsAttr.count; i += 1) {
      positionsAttr.array[i * 3 + 1] = 0.2 + Math.random() * 1.0;
    }
    positionsAttr.needsUpdate = true;
  }, []);

  return (
    <points ref={pointsRef} position={[position[0], position[1] + 0.5, position[2]]} geometry={positions}>
      <pointsMaterial color="#6b5b4a" size={0.06} transparent opacity={0.35} />
    </points>
  );
};

const InteriorPropMesh: React.FC<{ prop: InteriorProp; rugMaterial: THREE.MeshStandardMaterial; prayerRugMaterial: THREE.MeshStandardMaterial; positionVector?: THREE.Vector3 }> = ({ prop, rugMaterial, prayerRugMaterial, positionVector }) => {
  const itemRef = useRef<THREE.Object3D>(null);
  const base = positionVector ?? new THREE.Vector3(prop.position[0], prop.position[1], prop.position[2]);
  const rotation = prop.rotation as [number, number, number];
  const common = { position: [base.x, base.y, base.z] as [number, number, number], rotation, ref: itemRef };
  const anchoredPos = (y: number) => positionVector ? [base.x, base.y, base.z] as [number, number, number] : [prop.position[0], y, prop.position[2]] as [number, number, number];

  useFrame(() => {
    if (positionVector && itemRef.current) {
      itemRef.current.position.copy(positionVector);
    }
  });
  switch (prop.type) {
    case InteriorPropType.FLOOR_MAT:
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2, 1.4]} />
          <meshStandardMaterial color="#9a845e" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.RUG:
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6.6, 4.8]} />
          <primitive object={rugMaterial} />
        </mesh>
      );
    case InteriorPropType.PRAYER_RUG:
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.0, 2.1]} />
          <primitive object={prayerRugMaterial} />
        </mesh>
      );
    case InteriorPropType.LOW_TABLE:
      return (
        <group {...common}>
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <cylinderGeometry args={[0.85, 0.95, 0.18, 12]} />
            <meshStandardMaterial color="#6b4d33" roughness={0.9} />
          </mesh>
          {[
            [0.45, 0.14, 0.45],
            [-0.45, 0.14, 0.45],
            [0.45, 0.14, -0.45],
            [-0.45, 0.14, -0.45],
          ].map((pos, idx) => (
            <mesh key={`leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.28, 8]} />
              <meshStandardMaterial color="#4a3322" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0.3, 0.38, -0.2]} receiveShadow>
            <boxGeometry args={[0.4, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BENCH:
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <mesh receiveShadow>
            <boxGeometry args={[2.0, 0.18, 0.6]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          {[
            [0.8, -0.1, 0.2],
            [-0.8, -0.1, 0.2],
            [0.8, -0.1, -0.2],
            [-0.8, -0.1, -0.2],
          ].map((pos, idx) => (
            <mesh key={`bench-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.12, 0.2, 0.12]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case InteriorPropType.COUNTER:
      return (
        <group {...common}>
          <mesh position={[0, 0.55, 0]} receiveShadow>
            <boxGeometry args={[3.2, 1.1, 0.9]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.1, 0.1]} receiveShadow>
            <boxGeometry args={[3.0, 0.2, 0.7]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.DISPLAY:
      return (
        <group {...common}>
          <mesh position={[0, 0.9, 0]} receiveShadow>
            <boxGeometry args={[2.4, 1.6, 0.5]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.2, 0.3]} receiveShadow>
            <boxGeometry args={[2.0, 0.12, 0.1]} />
            <meshStandardMaterial color="#9a7a54" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BASKET:
      return (
        <group {...common}>
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <cylinderGeometry args={[0.45, 0.5, 0.3, 12, 1, true]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.32, 0]} receiveShadow>
            <torusGeometry args={[0.4, 0.05, 8, 16]} />
            <meshStandardMaterial color="#9a7b58" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.BOLT_OF_CLOTH:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.9, 10]} />
            <meshStandardMaterial color="#8a5a4a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.8} />
          </mesh>
        </group>
      );
    case InteriorPropType.SCALE:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.42, 0]} receiveShadow>
            <boxGeometry args={[0.5, 0.06, 0.08]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0.22, 0.34, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 10]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[-0.22, 0.34, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 10]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.LEDGER:
      return (
        <mesh {...common} position={anchoredPos(prop.position[1] + 0.05)} receiveShadow>
          <boxGeometry args={[0.5, 0.06, 0.35]} />
          <meshStandardMaterial color="#5a3f2a" roughness={0.8} />
        </mesh>
      );
    case InteriorPropType.TRAY:
      return (
        <group {...common}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <cylinderGeometry args={[0.35, 0.4, 0.06, 16]} />
            <meshStandardMaterial color="#9a7b58" roughness={0.8} />
          </mesh>
          <mesh position={[0.1, 0.14, 0.05]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
            <meshStandardMaterial color="#d1b37c" roughness={0.6} />
          </mesh>
          <mesh position={[-0.1, 0.14, -0.05]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
            <meshStandardMaterial color="#d1b37c" roughness={0.6} />
          </mesh>
        </group>
      );
    case InteriorPropType.TEA_SET:
      return (
        <group {...common}>
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.3, 10]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.12, 0.1]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
            <meshStandardMaterial color="#d1b37c" roughness={0.6} />
          </mesh>
          <mesh position={[-0.2, 0.12, -0.1]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
            <meshStandardMaterial color="#d1b37c" roughness={0.6} />
          </mesh>
        </group>
      );
    case InteriorPropType.FLOOR_PILLOWS:
      return (
        <group {...common}>
          <mesh position={[0.2, 0.12, 0]} receiveShadow>
            <boxGeometry args={[0.7, 0.22, 0.7]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
          </mesh>
          <mesh position={[-0.35, 0.12, -0.15]} receiveShadow>
            <boxGeometry args={[0.6, 0.2, 0.6]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.HOOKAH:
      return (
        <group {...common}>
          <mesh position={[0, 0.22, 0]} receiveShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.4, 10]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.48, 0]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
            <meshStandardMaterial color="#9a7a54" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.66, 0]} receiveShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#b08a5a" roughness={0.7} />
          </mesh>
          <mesh position={[0.35, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
            <torusGeometry args={[0.28, 0.03, 8, 16]} />
            <meshStandardMaterial color="#4a3b2a" roughness={0.8} />
          </mesh>
        </group>
      );
    case InteriorPropType.BEDROLL:
      return (
        <group {...common}>
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <boxGeometry args={[1.4, 0.25, 0.9]} />
            <meshStandardMaterial color="#6c5a4a" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 0.32, -0.2]} receiveShadow>
            <boxGeometry args={[0.4, 0.12, 0.3]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CHEST:
      return (
        <group {...common} position={anchoredPos(0.45)}>
          <mesh receiveShadow>
            <boxGeometry args={[1.0, 0.6, 0.6]} />
            <meshStandardMaterial color="#5c3f2a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <boxGeometry args={[1.02, 0.2, 0.62]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.SHELF:
      return (
        <mesh {...common} position={anchoredPos(0.7)} receiveShadow>
          <boxGeometry args={[1.3, 1.4, 0.35]} />
          <meshStandardMaterial color="#6a4a32" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.LAMP:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.2, 8]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#ffcc88" emissive="#ffb46b" emissiveIntensity={0.7} />
          </mesh>
        </group>
      );
    case InteriorPropType.BRAZIER:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.4, 0.5, 0.3, 10]} />
            <meshStandardMaterial color="#5c4b3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.34, 0]} receiveShadow>
            <torusGeometry args={[0.38, 0.06, 8, 16]} />
            <meshStandardMaterial color="#6a5a45" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.8} />
          </mesh>
          <FirePit position={[0, 0, 0]} />
        </group>
      );
    case InteriorPropType.FIRE_PIT:
      return (
        <group {...common}>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <cylinderGeometry args={[0.7, 0.8, 0.3, 12]} />
            <meshStandardMaterial color="#4d3b2a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.7} />
          </mesh>
          <FirePit position={[0, 0, 0]} />
          <FireSmoke position={[0, 0, 0]} />
        </group>
      );
    case InteriorPropType.AMPHORA:
      return (
        <group {...common}>
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <cylinderGeometry args={[0.18, 0.25, 0.5, 10]} />
            <meshStandardMaterial color="#9a6b3a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.55, 0]} receiveShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color="#9a6b3a" roughness={0.95} />
          </mesh>
        </group>
      );
    case InteriorPropType.SCREEN:
      return (
        <mesh {...common} position={anchoredPos(0.9)} receiveShadow>
          <boxGeometry args={[1.8, 1.8, 0.1]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.LOOM:
      return (
        <mesh {...common} position={anchoredPos(0.6)} receiveShadow>
          <boxGeometry args={[1.4, 1.2, 0.6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.WATER_BASIN:
      return (
        <mesh {...common} position={anchoredPos(0.25)} receiveShadow>
          <cylinderGeometry args={[0.8, 0.9, 0.35, 12]} />
          <meshStandardMaterial color="#7b5a4a" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.EWER:
      return (
        <group {...common}>
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <cylinderGeometry args={[0.16, 0.22, 0.45, 8]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0.22, 0.42, 0]} receiveShadow>
            <boxGeometry args={[0.1, 0.14, 0.06]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CUSHION:
      return (
        <mesh {...common} position={anchoredPos(0.12)} receiveShadow>
          <boxGeometry args={[0.8, 0.25, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.DESK:
      return (
        <group {...common}>
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.32, 0.8]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 0.55, -0.1]} receiveShadow>
            <boxGeometry args={[0.4, 0.1, 0.3]} />
            <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.4, 0.55, 0.2]} receiveShadow>
            <boxGeometry args={[0.5, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BOOKS:
      return (
        <mesh {...common} position={anchoredPos(0.55)} receiveShadow>
          <boxGeometry args={[0.7, 0.14, 0.4]} />
          <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.CHAIR:
      return (
        <group {...common}>
          <mesh position={[0, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.7, -0.2]} receiveShadow>
            <boxGeometry args={[0.6, 0.6, 0.1]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.WALL_HANGING:
      return (
        <group {...common} position={anchoredPos(1.6)}>
          <mesh receiveShadow>
            <planeGeometry args={[2.2, 1.4]} />
            <meshStandardMaterial color="#7a3f3f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.6, 0.02]} receiveShadow>
            <boxGeometry args={[1.9, 0.08, 0.05]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.INK_SET:
      return (
        <mesh {...common} position={anchoredPos(0.5)} receiveShadow>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
          <meshStandardMaterial color="#3d2a1a" roughness={0.8} />
        </mesh>
      );
    case InteriorPropType.CRATE:
      return (
        <mesh {...common} position={anchoredPos(0.35)} receiveShadow>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      );
    default:
      return null;
  }
};

const DoorFrame: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  variant: number;
}> = ({ position, rotation, variant }) => {
  if (variant === 0) {
    return (
      <group position={position} rotation={rotation}>
        <mesh receiveShadow>
          <boxGeometry args={[2.6, 2.7, 0.12]} />
          <meshStandardMaterial color="#7a5b42" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.08]} receiveShadow>
          <boxGeometry args={[2.2, 2.3, 0.08]} />
          <meshStandardMaterial color="#4a3b2b" roughness={0.85} />
        </mesh>
      </group>
    );
  }
  if (variant === 1) {
    return (
      <group position={position} rotation={rotation}>
        <mesh receiveShadow>
          <boxGeometry args={[2.8, 2.9, 0.12]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.9, 0.1]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.1, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#6b4a32" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={[2.6, 2.7, 0.12]} />
        <meshStandardMaterial color="#6a4a32" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.9, 0.08]} receiveShadow>
        <boxGeometry args={[2.6, 0.3, 0.08]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
    </group>
  );
};

const InteriorRoomMesh: React.FC<{
  room: InteriorRoom;
  floorMaterial: THREE.MeshStandardMaterial;
  wallMaterial: THREE.MeshStandardMaterial;
  wallColor: string;
  socialClass: SocialClass;
  interiorDoorSide?: 'north' | 'south' | 'east' | 'west' | null;
  doorVariant: number;
  alcoveSide?: 'north' | 'south' | 'east' | 'west' | null;
}> = ({ room, floorMaterial, wallMaterial, wallColor, socialClass, interiorDoorSide, doorVariant, alcoveSide }) => {
  const [w, , d] = room.size;
  const wallThickness = 0.2;
  const wallHeight = 3.2;
  const hasDoor = room.type === 'ENTRY';
  const doorWidth = 2.2;
  const doorHeight = 2.4;
  const canCutNorth = interiorDoorSide === 'north' && !hasDoor;
  const trimColor = darkenHex(wallColor, 0.7);
  const bandHeight = 0.35;
  const bandDepth = 0.08;
  const alcoveDepth = 0.22;
  const alcoveSize: [number, number] = [1.6, 1.2];
  const alcovePos: [number, number, number] | null = alcoveSide === 'north'
    ? [0, 1.3, d / 2 - alcoveDepth]
    : alcoveSide === 'south'
      ? [0, 1.3, -d / 2 + alcoveDepth]
      : alcoveSide === 'east'
        ? [w / 2 - alcoveDepth, 1.3, 0]
        : alcoveSide === 'west'
          ? [-w / 2 + alcoveDepth, 1.3, 0]
          : null;
  const alcoveRotation: [number, number, number] = alcoveSide === 'east' || alcoveSide === 'west'
    ? [0, Math.PI / 2, 0]
    : [0, 0, 0];
  return (
    <group position={[room.center[0], 0, room.center[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {interiorDoorSide !== 'south' && (
        <mesh position={[0, wallHeight / 2, -d / 2]} receiveShadow material={wallMaterial}>
          <boxGeometry args={[w, wallHeight, wallThickness]} />
        </mesh>
      )}
      {interiorDoorSide === 'south' && (
        <>
          <mesh position={[0, wallHeight - doorHeight / 2, -d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[doorWidth, wallHeight - doorHeight, wallThickness]} />
          </mesh>
          <mesh position={[-(w - doorWidth) / 4, wallHeight / 2, -d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
          </mesh>
          <mesh position={[(w - doorWidth) / 4, wallHeight / 2, -d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
          </mesh>
        </>
      )}
      {canCutNorth ? (
        <>
          <mesh position={[0, wallHeight - doorHeight / 2, d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[doorWidth, wallHeight - doorHeight, wallThickness]} />
          </mesh>
          <mesh position={[-(w - doorWidth) / 4, wallHeight / 2, d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
          </mesh>
          <mesh position={[(w - doorWidth) / 4, wallHeight / 2, d / 2]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, wallHeight / 2, d / 2]} receiveShadow material={wallMaterial}>
          <boxGeometry args={[w, wallHeight, wallThickness]} />
        </mesh>
      )}
      {interiorDoorSide !== 'west' && (
        <mesh position={[-w / 2, wallHeight / 2, 0]} receiveShadow material={wallMaterial}>
          <boxGeometry args={[wallThickness, wallHeight, d]} />
        </mesh>
      )}
      {interiorDoorSide === 'west' && (
        <>
          <mesh position={[-w / 2, wallHeight - doorHeight / 2, 0]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
          </mesh>
          <mesh position={[-w / 2, wallHeight / 2, -(d - doorWidth) / 4]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
          </mesh>
          <mesh position={[-w / 2, wallHeight / 2, (d - doorWidth) / 4]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
          </mesh>
        </>
      )}
      {interiorDoorSide !== 'east' && (
        <mesh position={[w / 2, wallHeight / 2, 0]} receiveShadow material={wallMaterial}>
          <boxGeometry args={[wallThickness, wallHeight, d]} />
        </mesh>
      )}
      {interiorDoorSide === 'east' && (
        <>
          <mesh position={[w / 2, wallHeight - doorHeight / 2, 0]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
          </mesh>
          <mesh position={[w / 2, wallHeight / 2, -(d - doorWidth) / 4]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
          </mesh>
          <mesh position={[w / 2, wallHeight / 2, (d - doorWidth) / 4]} receiveShadow material={wallMaterial}>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
          </mesh>
        </>
      )}
      {hasDoor && (
        <DoorFrame position={[0, 1.1, d / 2 - 0.12]} rotation={[0, 0, 0]} variant={doorVariant} />
      )}
      {!hasDoor && interiorDoorSide && (
        <DoorFrame
          position={
            interiorDoorSide === 'north'
              ? [0, 1.1, d / 2 - 0.12]
              : interiorDoorSide === 'south'
                ? [0, 1.1, -d / 2 + 0.12]
                : interiorDoorSide === 'east'
                  ? [w / 2 - 0.12, 1.1, 0]
                  : [-w / 2 + 0.12, 1.1, 0]
          }
          rotation={
            interiorDoorSide === 'east' || interiorDoorSide === 'west'
              ? [0, Math.PI / 2, 0]
              : [0, 0, 0]
          }
          variant={doorVariant}
        />
      )}
      <group>
        <mesh position={[0, bandHeight / 2, -d / 2 + bandDepth]} receiveShadow>
          <boxGeometry args={[w, bandHeight, bandDepth]} />
          <meshStandardMaterial color={trimColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, bandHeight / 2, d / 2 - bandDepth]} receiveShadow>
          <boxGeometry args={[w, bandHeight, bandDepth]} />
          <meshStandardMaterial color={trimColor} roughness={0.9} />
        </mesh>
        <mesh position={[-w / 2 + bandDepth, bandHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[bandDepth, bandHeight, d]} />
          <meshStandardMaterial color={trimColor} roughness={0.9} />
        </mesh>
        <mesh position={[w / 2 - bandDepth, bandHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[bandDepth, bandHeight, d]} />
          <meshStandardMaterial color={trimColor} roughness={0.9} />
        </mesh>
      </group>
      {socialClass === SocialClass.NOBILITY && (
        <>
          <mesh position={[-w / 2 + 0.6, wallHeight / 2, -d / 2 + 0.6]} receiveShadow>
            <cylinderGeometry args={[0.25, 0.3, wallHeight, 10]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[w / 2 - 0.6, wallHeight / 2, -d / 2 + 0.6]} receiveShadow>
            <cylinderGeometry args={[0.25, 0.3, wallHeight, 10]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[0, wallHeight - 0.4, -d / 2 + 0.12]} receiveShadow>
            <boxGeometry args={[2.6, 0.6, 0.08]} />
            <meshStandardMaterial color="#b79e7f" roughness={0.9} />
          </mesh>
        </>
      )}
      {socialClass === SocialClass.MERCHANT && (
        <mesh position={[0, wallHeight - 0.5, -d / 2 + 0.12]} receiveShadow>
          <boxGeometry args={[2.2, 0.4, 0.08]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.9} />
        </mesh>
      )}
      {alcovePos && (
        <group position={alcovePos} rotation={alcoveRotation}>
          <mesh position={[0, 0, -0.01]} receiveShadow>
            <boxGeometry args={[alcoveSize[0], alcoveSize[1], alcoveDepth]} />
            <meshStandardMaterial color={darkenHex(wallColor, 0.75)} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.06]} receiveShadow>
            <boxGeometry args={[alcoveSize[0] + 0.12, alcoveSize[1] + 0.12, 0.08]} />
            <meshStandardMaterial color={darkenHex(wallColor, 0.6)} roughness={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const InteriorScene: React.FC<InteriorSceneProps> = ({ spec, params, playerStats, onPickupPrompt }) => {
  const { scene, gl } = useThree();
  const previousBackground = useRef<THREE.Color | THREE.Texture | null>(null);
  const previousFog = useRef<THREE.Fog | null>(null);
  const previousExposure = useRef<number | null>(null);
  const impactPuffsRef = useRef<ImpactPuffSlot[]>(Array.from({ length: MAX_PUFFS }, () => null));
  const impactPuffIndexRef = useRef(0);
  const pushables = useMemo<PushableObject[]>(() => {
    const items: PushableObject[] = [];
    const pushableTypes = new Set<InteriorPropType>([
      InteriorPropType.BENCH,
      InteriorPropType.CHAIR,
      InteriorPropType.BASKET,
      InteriorPropType.CRATE,
      InteriorPropType.CHEST,
      InteriorPropType.COUNTER,
      InteriorPropType.DISPLAY,
      InteriorPropType.LOW_TABLE,
      InteriorPropType.BOLT_OF_CLOTH,
      InteriorPropType.AMPHORA,
      InteriorPropType.EWER,
      InteriorPropType.WATER_BASIN,
      InteriorPropType.LAMP,
      InteriorPropType.FLOOR_PILLOWS
    ]);
    const typeOffsets: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 0.25,
      [InteriorPropType.CHEST]: 0.45,
      [InteriorPropType.CRATE]: 0.35
    };
    const typeRadius: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 1.0,
      [InteriorPropType.CHAIR]: 0.6,
      [InteriorPropType.BASKET]: 0.5,
      [InteriorPropType.CRATE]: 0.6,
      [InteriorPropType.CHEST]: 0.75,
      [InteriorPropType.COUNTER]: 1.2,
      [InteriorPropType.DISPLAY]: 0.9,
      [InteriorPropType.LOW_TABLE]: 0.8,
      [InteriorPropType.BOLT_OF_CLOTH]: 0.6,
      [InteriorPropType.AMPHORA]: 0.4,
      [InteriorPropType.EWER]: 0.35,
      [InteriorPropType.WATER_BASIN]: 0.7,
      [InteriorPropType.LAMP]: 0.3,
      [InteriorPropType.FLOOR_PILLOWS]: 0.7
    };
    const typeMass: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 2.2,
      [InteriorPropType.CHAIR]: 1.3,
      [InteriorPropType.BASKET]: 0.6,
      [InteriorPropType.CRATE]: 1.4,
      [InteriorPropType.CHEST]: 1.8,
      [InteriorPropType.COUNTER]: 3.2,
      [InteriorPropType.DISPLAY]: 2.4,
      [InteriorPropType.LOW_TABLE]: 1.2,
      [InteriorPropType.BOLT_OF_CLOTH]: 0.8,
      [InteriorPropType.AMPHORA]: 0.7,
      [InteriorPropType.EWER]: 0.5,
      [InteriorPropType.WATER_BASIN]: 1.6,
      [InteriorPropType.LAMP]: 0.5,
      [InteriorPropType.FLOOR_PILLOWS]: 0.5
    };
    const typeMaterial: Partial<Record<InteriorPropType, 'wood' | 'ceramic' | 'cloth' | 'stone'>> = {
      [InteriorPropType.BENCH]: 'wood',
      [InteriorPropType.CHAIR]: 'wood',
      [InteriorPropType.BASKET]: 'cloth',
      [InteriorPropType.CRATE]: 'wood',
      [InteriorPropType.CHEST]: 'wood',
      [InteriorPropType.COUNTER]: 'wood',
      [InteriorPropType.DISPLAY]: 'wood',
      [InteriorPropType.LOW_TABLE]: 'wood',
      [InteriorPropType.BOLT_OF_CLOTH]: 'cloth',
      [InteriorPropType.AMPHORA]: 'ceramic',
      [InteriorPropType.EWER]: 'ceramic',
      [InteriorPropType.WATER_BASIN]: 'stone',
      [InteriorPropType.LAMP]: 'ceramic',
      [InteriorPropType.FLOOR_PILLOWS]: 'cloth'
    };
    spec.props.forEach((prop) => {
      if (!pushableTypes.has(prop.type)) return;
      const offsetY = typeOffsets[prop.type] ?? 0;
      const radius = typeRadius[prop.type] ?? 0.6;
      const mass = typeMass[prop.type] ?? 1.0;
      const material = typeMaterial[prop.type] ?? 'wood';
      const position: [number, number, number] = [prop.position[0], prop.position[1] + offsetY, prop.position[2]];
      const item = createPushable(`interior-${prop.id}`, 'interior', position, radius, mass, 0, material);
      item.sourceId = prop.id;
      items.push(item);
    });
    return items;
  }, [spec.props]);
  const pushablesRef = useRef<PushableObject[]>(pushables);
  useEffect(() => {
    pushablesRef.current = pushables;
  }, [pushables]);
  const rawObstacles = useMemo<Obstacle[]>(() => generateInteriorObstacles(spec), [spec]);
  const obstacles = useMemo<Obstacle[]>(() => {
    if (pushables.length === 0) return rawObstacles;
    return rawObstacles.filter((obstacle) => {
      const nearPushable = pushables.some((item) => {
        const dx = obstacle.position[0] - item.position.x;
        const dz = obstacle.position[2] - item.position.z;
        return Math.hypot(dx, dz) < 0.25;
      });
      return !nearPushable;
    });
  }, [rawObstacles, pushables]);
  const entryRoom = useMemo(() => spec.rooms.find((room) => room.type === 'ENTRY') ?? spec.rooms[0], [spec.rooms]);
  const playerSpawn = useMemo<[number, number, number]>(() => {
    return [entryRoom.center[0], 0, entryRoom.center[2]];
  }, [entryRoom]);
  const isDay = params.timeOfDay >= 7 && params.timeOfDay <= 17;
  const lampProps = useMemo(() => spec.props.filter((prop) => prop.type === InteriorPropType.LAMP || prop.type === InteriorPropType.BRAZIER || prop.type === InteriorPropType.FIRE_PIT), [spec.props]);
  const styleSeed = useMemo(() => spec.seed + spec.rooms.length * 31, [spec.seed, spec.rooms.length]);
  const interiorDoorMap = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west'>();
    spec.rooms.forEach((room) => {
      let closest: InteriorRoom | null = null;
      let closestDist = Infinity;
      spec.rooms.forEach((candidate) => {
        if (candidate.id === room.id) return;
        const dx = candidate.center[0] - room.center[0];
        const dz = candidate.center[2] - room.center[2];
        const dist = Math.hypot(dx, dz);
        if (dist < closestDist) {
          closest = candidate;
          closestDist = dist;
        }
      });
      if (!closest) return;
      const dx = closest.center[0] - room.center[0];
      const dz = closest.center[2] - room.center[2];
      if (Math.abs(dx) > Math.abs(dz)) {
        map.set(room.id, dx > 0 ? 'east' : 'west');
      } else {
        map.set(room.id, dz > 0 ? 'north' : 'south');
      }
    });
    return map;
  }, [spec.rooms]);
  const windowMap = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west'>();
    spec.rooms.forEach((room) => {
      const index = parseInt(room.id.split('-')[1] || '0', 10);
      const roll = seededRandom(styleSeed + index * 23);
      const side = roll < 0.25 ? 'north' : roll < 0.5 ? 'south' : roll < 0.75 ? 'east' : 'west';
      map.set(room.id, side);
    });
    return map;
  }, [spec.rooms, styleSeed]);
  const wallPalette = useMemo(() => {
    const base = spec.socialClass === SocialClass.NOBILITY
      ? ['#c8b694', '#d2c2a2', '#bda888']
      : spec.socialClass === SocialClass.MERCHANT
        ? ['#bfa98a', '#c6b18f', '#b39a78']
        : spec.socialClass === SocialClass.CLERGY
          ? ['#b4a58c', '#b9aa90', '#a9977d']
          : ['#b39b7e', '#a98f72', '#9c846a'];
    return base;
  }, [spec.socialClass]);
  const floorPalette = useMemo(() => {
    const base = spec.socialClass === SocialClass.NOBILITY
      ? ['#a98c6d', '#9b7f61', '#b09474']
      : spec.socialClass === SocialClass.MERCHANT
        ? ['#9c8164', '#8e7458', '#a2876a']
        : spec.socialClass === SocialClass.CLERGY
          ? ['#8f785e', '#836d55', '#9a8063']
          : ['#8a7359', '#7b664e', '#957b60'];
    return base;
  }, [spec.socialClass]);
  const floorMaterials = useMemo(() => {
    const base = floorPalette.map((color, index) => {
      if (spec.socialClass === SocialClass.PEASANT) {
        const tex = createNoiseTexture(color, '#6f5a45');
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.95 });
      }
      if (spec.socialClass === SocialClass.MERCHANT || spec.socialClass === SocialClass.CLERGY) {
        const tex = createPlankTexture(color, '#5a4737');
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.9 });
      }
      return new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    });
    return base;
  }, [floorPalette, spec.socialClass]);
  const wallMaterials = useMemo(() => {
    return wallPalette.map((color) => {
      if (spec.socialClass === SocialClass.PEASANT) {
        const tex = createNoiseTexture(color, '#7b664e');
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.95 });
      }
      const tex = createWallTexture(color, '#9a8668');
      return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.9 });
    });
  }, [wallPalette, spec.socialClass]);
  const handleImpactPuff = useMemo(() => {
    return (position: THREE.Vector3, intensity: number) => {
      const idx = impactPuffIndexRef.current++ % MAX_PUFFS;
      impactPuffsRef.current[idx] = {
        position: position.clone(),
        start: performance.now(),
        intensity,
        jitter: [(Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16],
        duration: 0.45 + intensity * 0.4
      };
    };
  }, []);
  const rugMaterials = useMemo(() => {
    const options = [
      { base: '#7b3f3f', accent: '#e0c08a', pattern: 'diamond' as const },
      { base: '#6a4b3b', accent: '#d5b07a', pattern: 'stripe' as const },
      { base: '#7a5a3a', accent: '#e2c497', pattern: 'diamond' as const },
      { base: '#5d3f55', accent: '#d6b08b', pattern: 'stripe' as const },
    ];
    return options.map((opt) => {
      const texture = createRugTexture(opt.base, opt.accent, opt.pattern);
      return new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: opt.base,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    });
  }, []);
  const prayerRugMaterials = useMemo(() => {
    const options = [
      { base: '#6c3d4a', accent: '#d9b889', pattern: 'diamond' as const },
      { base: '#5a4a3d', accent: '#caa978', pattern: 'stripe' as const },
    ];
    return options.map((opt) => {
      const texture = createRugTexture(opt.base, opt.accent, opt.pattern);
      return new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: opt.base,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    });
  }, []);

  useEffect(() => {
    previousBackground.current = scene.background as THREE.Color | THREE.Texture | null;
    previousFog.current = scene.fog;
    previousExposure.current = gl.toneMappingExposure;
    scene.background = new THREE.Color('#07090d');
    scene.fog = null;
    gl.toneMappingExposure = 1.25;
    return () => {
      scene.background = previousBackground.current;
      scene.fog = previousFog.current;
      if (previousExposure.current !== null) {
        gl.toneMappingExposure = previousExposure.current;
      }
    };
  }, [scene, gl]);

  return (
    <group>
      <ambientLight intensity={0.35} color="#d6c9b3" />
      <hemisphereLight intensity={0.25} color="#e6d8c0" groundColor="#6a5847" />
      {!isDay && (
        <pointLight position={[entryRoom.center[0], 2.4, entryRoom.center[2]]} intensity={1.0} color="#f0c07d" distance={20} decay={2} />
      )}
      <ImpactPuffs puffsRef={impactPuffsRef} />
      {lampProps.map((prop) => (
        <pointLight
          key={`lamp-light-${prop.id}`}
          position={[prop.position[0], 1.8, prop.position[2]]}
          intensity={0.85}
          color="#f0c07d"
          distance={16}
          decay={2}
        />
      ))}
      {isDay && (
        <>
          <directionalLight position={[entryRoom.center[0] + 6, 4.2, entryRoom.center[2] + 3]} intensity={0.7} color="#e2edff" />
          <mesh position={[entryRoom.center[0], 1.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.12]}>
            <planeGeometry args={[1.4, 1.1]} />
            <meshStandardMaterial color="#b3c5e6" emissive="#b3c5e6" emissiveIntensity={0.55} transparent opacity={0.6} />
          </mesh>
          <pointLight position={[entryRoom.center[0], 2.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.8]} intensity={0.7} color="#c8d8f2" distance={18} decay={2} />
        </>
      )}

      {spec.rooms.map((room, index) => {
        const wallIndex = Math.floor(seededRandom(styleSeed + index * 7) * wallMaterials.length);
        const wallMaterial = wallMaterials[wallIndex];
        const wallColor = wallPalette[wallIndex] ?? '#b7a48a';
        const floorMaterial = floorMaterials[Math.floor(seededRandom(styleSeed + index * 11) * floorMaterials.length)];
        const interiorDoorSide = interiorDoorMap.get(room.id) ?? null;
        const variantSeed = seededRandom(styleSeed + index * 19);
        const doorVariant = spec.buildingType === BuildingType.RELIGIOUS
          ? 1
          : spec.buildingType === BuildingType.CIVIC
            ? 2
            : Math.floor(variantSeed * 3);
        const windowSide = windowMap.get(room.id) ?? 'north';
        const alcoveSides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west']
          .filter((side) => side !== interiorDoorSide && side !== windowSide);
        const alcoveSide = alcoveSides.length
          ? alcoveSides[Math.floor(seededRandom(styleSeed + index * 29) * alcoveSides.length)]
          : null;
        const windowOffset = windowSide === 'north'
          ? [0, 1.6, room.size[2] / 2 - 0.12]
          : windowSide === 'south'
            ? [0, 1.6, -room.size[2] / 2 + 0.12]
            : windowSide === 'east'
              ? [room.size[0] / 2 - 0.12, 1.6, 0]
              : [-room.size[0] / 2 + 0.12, 1.6, 0];
        return (
          <group key={room.id}>
            <InteriorRoomMesh
              room={room}
              floorMaterial={floorMaterial}
              wallMaterial={wallMaterial}
              wallColor={wallColor}
              socialClass={spec.socialClass}
              interiorDoorSide={interiorDoorSide}
              doorVariant={doorVariant}
              alcoveSide={alcoveSide}
            />
            <group position={[room.center[0], 0, room.center[2]]}>
              <mesh position={windowOffset as [number, number, number]} rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]} receiveShadow>
                <planeGeometry args={[1.4, 1.2]} />
                <meshStandardMaterial color="#7a5b42" roughness={0.85} />
              </mesh>
              <mesh position={[windowOffset[0], windowOffset[1], windowOffset[2] + (windowSide === 'north' ? 0.06 : windowSide === 'south' ? -0.06 : 0)]} rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
                <planeGeometry args={[1.2, 1.0]} />
                <meshStandardMaterial color="#c9b089" emissive="#c9b089" emissiveIntensity={isDay ? 0.45 : 0.1} transparent opacity={isDay ? 0.55 : 0.15} />
              </mesh>
              {isDay && (
                <pointLight
                  position={[windowOffset[0], 2.2, windowOffset[2] + (windowSide === 'north' ? -0.8 : windowSide === 'south' ? 0.8 : 0)]}
                  intensity={0.85}
                  color="#c8d8f2"
                  distance={18}
                  decay={2}
                />
              )}
            </group>
          </group>
        );
      })}

      {spec.props.map((prop, index) => {
        const pushable = pushables.find((item) => item.sourceId === prop.id);
        const rugMat = rugMaterials[Math.floor(seededRandom(styleSeed + index * 13) * rugMaterials.length)];
        const prayerMat = prayerRugMaterials[Math.floor(seededRandom(styleSeed + index * 17) * prayerRugMaterials.length)];
        return (
          <InteriorPropMesh
            key={prop.id}
            prop={prop}
            rugMaterial={rugMat}
            prayerRugMaterial={prayerMat}
            positionVector={pushable?.position}
          />
        );
      })}

      {spec.npcs.map((npc) => (
        <group key={npc.id} position={npc.position as [number, number, number]} rotation={npc.rotation as [number, number, number]}>
          <Humanoid
            color={npc.stats.socialClass === SocialClass.NOBILITY ? '#6a5b4a' : '#6b5a45'}
            headColor="#e2c6a2"
            turbanColor="#cdbb9a"
            headscarfColor="#bfae96"
            robeAccentColor="#8a6b4f"
            hairColor="#2f241b"
            gender={npc.stats.gender}
            scale={[npc.stats.weight, npc.stats.height, npc.stats.weight] as [number, number, number]}
            robeHasTrim={npc.stats.robeHasTrim}
            robeHemBand={npc.stats.robeHemBand}
            robeSpread={npc.stats.robeSpread}
            robeOverwrap={npc.stats.robeOverwrap}
            hairStyle={npc.stats.hairStyle}
            headwearStyle={npc.stats.headwearStyle}
            sleeveCoverage={npc.stats.sleeveCoverage}
            footwearStyle={npc.stats.footwearStyle}
            footwearColor={npc.stats.footwearColor}
            accessories={npc.stats.accessories}
            enableArmSwing={false}
            isWalking={false}
            isDead={false}
          />
        </group>
      ))}

      <Player
        cameraMode={params.cameraMode}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
        buildings={[]}
        obstacles={obstacles}
        initialPosition={playerSpawn}
        pushablesRef={pushablesRef}
        onImpactPuff={handleImpactPuff}
        onPickupPrompt={onPickupPrompt}
      />
    </group>
  );
};
