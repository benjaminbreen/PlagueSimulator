import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { InteriorSpec, InteriorProp, InteriorPropType, InteriorRoom, InteriorRoomType, SimulationParams, PlayerStats, Obstacle, SocialClass, BuildingType } from '../types';
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
  onPickupItem?: (pickup: import('../utils/pushables').PickupInfo) => void;
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
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
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
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
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
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
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
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const createPlasterTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = accent;
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
  for (let i = 0; i < 40; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 20 + Math.random() * 60;
    const h = 10 + Math.random() * 30;
    ctx.globalAlpha = 0.08 + Math.random() * 0.08;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
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

const createPatchTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 6; i += 1) {
    const x = Math.random() * 80;
    const y = Math.random() * 80;
    const w = 30 + Math.random() * 40;
    const h = 20 + Math.random() * 30;
    ctx.globalAlpha = 0.12 + Math.random() * 0.08;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const createTileTexture = (base: string, grout: string) => {
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
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

const buildWallWithDoorGeometry = (
  width: number,
  height: number,
  doorWidth: number,
  doorHeight: number,
  thickness: number,
  arch: boolean
) => {
  const halfW = width / 2;
  const baseY = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, baseY);
  shape.lineTo(halfW, baseY);
  shape.lineTo(halfW, baseY + height);
  shape.lineTo(-halfW, baseY + height);
  shape.lineTo(-halfW, baseY);

  const hole = new THREE.Path();
  if (arch) {
    const radius = Math.min(doorWidth / 2, doorHeight * 0.5);
    const rectHeight = Math.max(doorHeight - radius, 0.4);
    hole.moveTo(-doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY + rectHeight);
    hole.absarc(0, baseY + rectHeight, radius, 0, Math.PI, false);
    hole.lineTo(-doorWidth / 2, baseY);
  } else {
    hole.moveTo(-doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY);
    hole.lineTo(doorWidth / 2, baseY + doorHeight);
    hole.lineTo(-doorWidth / 2, baseY + doorHeight);
    hole.lineTo(-doorWidth / 2, baseY);
  }
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
};

const darkenHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const Flame: React.FC<{ position: [number, number, number]; size: number; color: string; emissive: string }> = ({ position, size, color, emissive }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 6 + position[0] * 3) * 0.15;
    meshRef.current.scale.setScalar(pulse);
    materialRef.current.emissiveIntensity = 0.7 + pulse * 0.6;
  });
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshStandardMaterial ref={materialRef} color={color} emissive={emissive} emissiveIntensity={1} />
    </mesh>
  );
};

const contactShadowMaterial = new THREE.MeshStandardMaterial({
  color: '#3b2f24',
  transparent: true,
  opacity: 0.25,
  roughness: 1
});

const ContactShadow: React.FC<{ size: [number, number]; y?: number }> = ({ size, y = 0.02 }) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[Math.max(size[0], size[1]) * 0.35, 18]} />
    <primitive object={contactShadowMaterial} />
  </mesh>
);

const FlickerLight: React.FC<{ position: [number, number, number]; intensity: number; color: string; distance: number; decay: number; flicker?: number }> = ({ position, intensity, color, distance, decay, flicker = 0.12 }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!lightRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5 + position[0] * 2) * flicker;
    lightRef.current.intensity = intensity * pulse;
  });
  return <pointLight ref={lightRef} position={position} intensity={intensity} color={color} distance={distance} decay={decay} />;
};

const DustBeam: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; width: number; height: number }> = ({ position, rotation, width, height }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 80;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * width * 0.8;
      arr[i * 3 + 1] = Math.random() * height;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [width, height]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.06;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, height * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#f3e3c8" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial color="#ead9b8" size={0.03} transparent opacity={0.25} depthWrite={false} />
      </points>
    </group>
  );
};

const Spindle: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  const wheelRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!wheelRef.current) return;
    wheelRef.current.rotation.z = state.clock.elapsedTime * 1.6;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.2, 8]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
      </mesh>
      <mesh ref={wheelRef} position={[0, 0.32, 0]} receiveShadow>
        <torusGeometry args={[0.22, 0.04, 8, 16]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#6a4a32" roughness={0.8} />
      </mesh>
    </group>
  );
};

const DyeVat: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.2, 0]} receiveShadow>
      <cylinderGeometry args={[0.5, 0.55, 0.4, 12]} />
      <meshStandardMaterial color="#5a4534" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.34, 0]} receiveShadow>
      <circleGeometry args={[0.42, 16]} />
      <meshStandardMaterial color="#3d6d8a" emissive="#24465a" emissiveIntensity={0.5} roughness={0.6} />
    </mesh>
  </group>
);

const Anvil: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.2, 0]} receiveShadow>
      <boxGeometry args={[0.7, 0.4, 0.4]} />
      <meshStandardMaterial color="#4b4b4b" roughness={0.7} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0.45, 0]} receiveShadow>
      <boxGeometry args={[0.5, 0.12, 0.35]} />
      <meshStandardMaterial color="#5a5a5a" roughness={0.6} metalness={0.3} />
    </mesh>
  </group>
);

const ToolRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.9, 0]} receiveShadow>
      <boxGeometry args={[1.2, 1.4, 0.12]} />
      <meshStandardMaterial color="#6b4a32" roughness={0.9} />
    </mesh>
    {[[-0.3, 0.5], [0, 0.6], [0.3, 0.4]].map((pos, idx) => (
      <mesh key={`tool-${idx}`} position={[pos[0], pos[1], 0.08]} receiveShadow>
        <boxGeometry args={[0.08, 0.5, 0.04]} />
        <meshStandardMaterial color="#6a5a45" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const Mortar: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.12, 0]} receiveShadow>
      <cylinderGeometry args={[0.16, 0.2, 0.18, 10]} />
      <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
    </mesh>
    <mesh position={[0.12, 0.2, 0]} receiveShadow>
      <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
      <meshStandardMaterial color="#6a4a32" roughness={0.85} />
    </mesh>
  </group>
);

const HerbRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 1.0, 0]} receiveShadow>
      <boxGeometry args={[1.6, 1.2, 0.12]} />
      <meshStandardMaterial color="#6b4a32" roughness={0.9} />
    </mesh>
    {[[-0.5, 0.5], [0, 0.6], [0.5, 0.45]].map((pos, idx) => (
      <mesh key={`herb-${idx}`} position={[pos[0], pos[1], 0.1]} receiveShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#5a7a3a" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const InteriorHoverLabel: React.FC<{ title: string; position: [number, number, number] }> = ({ title, position }) => (
  <Html position={position} center>
    <div className="bg-black/70 border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_18px_rgba(245,158,11,0.25)] pointer-events-none">
      {title}
    </div>
  </Html>
);

const InteriorHoverable: React.FC<{ position?: [number, number, number]; positionVector?: THREE.Vector3; label: string; labelOffset: [number, number, number]; children: React.ReactNode }> = ({ position, positionVector, label, labelOffset, children }) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (positionVector && groupRef.current) {
      groupRef.current.position.copy(positionVector);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {children}
      {hovered && <InteriorHoverLabel title={label} position={labelOffset} />}
    </group>
  );
};

const getPropLabelOffset = (type: InteriorPropType): [number, number, number] => {
  switch (type) {
    case InteriorPropType.COUNTER:
    case InteriorPropType.DISPLAY:
      return [0, 1.6, 0];
    case InteriorPropType.SHELF:
    case InteriorPropType.SCREEN:
      return [0, 1.4, 0];
    case InteriorPropType.FLOOR_LAMP:
    case InteriorPropType.LADDER:
    case InteriorPropType.STAIRS:
      return [0, 2.0, 0];
    case InteriorPropType.FIRE_PIT:
    case InteriorPropType.BRAZIER:
      return [0, 1.2, 0];
    default:
      return [0, 0.9, 0];
  }
};

const InteriorPropWithLabel: React.FC<{
  prop: InteriorProp;
  rugMaterial: THREE.MeshStandardMaterial;
  prayerRugMaterial: THREE.MeshStandardMaterial;
  profession: string;
  roomSize?: [number, number, number];
  positionVector?: THREE.Vector3;
}> = ({ prop, rugMaterial, prayerRugMaterial, profession, roomSize, positionVector }) => {
  const labelOffset = useMemo(() => getPropLabelOffset(prop.type), [prop.type]);
  const zeroVector = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const displayProp = useMemo(() => {
    if (!positionVector) return prop;
    return { ...prop, position: [0, 0, 0] as [number, number, number] };
  }, [prop, positionVector]);
  const groupPosition = positionVector ? undefined : [prop.position[0], prop.position[1], prop.position[2]] as [number, number, number];
  return (
    <InteriorHoverable
      position={groupPosition}
      positionVector={positionVector}
      label={prop.label ?? prop.type}
      labelOffset={labelOffset}
    >
      <InteriorPropMesh
        prop={displayProp}
        rugMaterial={rugMaterial}
        prayerRugMaterial={prayerRugMaterial}
        profession={profession}
        positionVector={positionVector ? zeroVector : undefined}
        roomSize={roomSize}
      />
    </InteriorHoverable>
  );
};

const FirePit: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const count = 40;
  const phases = useRef<Float32Array | null>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const phaseArr = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.15 + Math.random() * 0.2;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = 0.1 + Math.random() * 0.4;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
      phaseArr[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geometryRef.current = geo;
    phases.current = phaseArr;
    return geo;
  }, []);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.frustumCulled = false;
    }
  }, []);

  useFrame((state) => {
    if (!geometryRef.current || !phases.current) return;
    const positionsAttr = geometryRef.current.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positionsAttr.count; i += 1) {
      const phase = phases.current[i];
      const lift = (Math.sin(state.clock.elapsedTime * 4 + phase) + 1) * 0.2;
      positionsAttr.array[i * 3 + 1] = 0.08 + lift;
    }
    positionsAttr.needsUpdate = true;
  });

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
  const phases = useRef<Float32Array | null>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const phaseArr = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = 0.2 + Math.random() * 0.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      phaseArr[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geometryRef.current = geo;
    phases.current = phaseArr;
    return geo;
  }, []);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.frustumCulled = false;
    }
  }, []);

  useFrame((state) => {
    if (!geometryRef.current || !phases.current) return;
    const positionsAttr = geometryRef.current.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positionsAttr.count; i += 1) {
      const phase = phases.current[i];
      const drift = (Math.sin(state.clock.elapsedTime * 1.2 + phase) + 1) * 0.4;
      positionsAttr.array[i * 3 + 1] = 0.2 + drift;
    }
    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[position[0], position[1] + 0.5, position[2]]} geometry={positions}>
      <pointsMaterial color="#6b5b4a" size={0.06} transparent opacity={0.35} />
    </points>
  );
};

const InteriorPropMesh: React.FC<{ prop: InteriorProp; rugMaterial: THREE.MeshStandardMaterial; prayerRugMaterial: THREE.MeshStandardMaterial; profession: string; positionVector?: THREE.Vector3; roomSize?: [number, number, number] }> = ({ prop, rugMaterial, prayerRugMaterial, profession, positionVector, roomSize }) => {
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
    case InteriorPropType.FLOOR_MAT: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.4, 3.2) : 2;
      const depth = roomSize ? Math.min(roomSize[2] * 0.3, 2.4) : 1.4;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#9a845e" roughness={0.9} />
        </mesh>
      );
    }
    case InteriorPropType.RUG: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.7, 8.8) : 6.6;
      const depth = roomSize ? Math.min(roomSize[2] * 0.65, 6.4) : 4.8;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]}>
          <planeGeometry args={[width, depth]} />
          <primitive object={rugMaterial} />
        </mesh>
      );
    }
    case InteriorPropType.PRAYER_RUG: {
      const scale = prop.scale ?? [1, 1, 1];
      const width = roomSize ? Math.min(roomSize[0] * 0.35, 3.6) : 3.0;
      const depth = roomSize ? Math.min(roomSize[2] * 0.35, 2.8) : 2.1;
      return (
        <mesh {...common} position={anchoredPos(0.02)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow scale={[scale[0], 1, scale[2]]}>
          <planeGeometry args={[width, depth]} />
          <primitive object={prayerRugMaterial} />
        </mesh>
      );
    }
    case InteriorPropType.LOW_TABLE:
      return (
        <group {...common}>
          <ContactShadow size={[1.6, 1.6]} />
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
          <mesh position={[-0.3, 0.38, 0.2]} receiveShadow>
            <boxGeometry args={[0.35, 0.06, 0.18]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.BENCH:
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <ContactShadow size={[2.0, 0.6]} />
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
          <mesh position={[0, 0.6, -0.4]} receiveShadow>
            <boxGeometry args={[2.9, 0.8, 0.1]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
          <mesh position={[-1.45, 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.12, 1.0, 0.75]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
          <mesh position={[1.45, 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.12, 1.0, 0.75]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.DISPLAY:
      {
        const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 13 + prop.position[2] * 19) * 10000);
        let localSeed = seed;
        const rand = () => seededRandom(localSeed++);
        const profLower = profession.toLowerCase();
        const isTextile = profLower.includes('weaver') || profLower.includes('textile') || profLower.includes('cloth');
        const isSpice = profLower.includes('spice') || profLower.includes('apothecary') || profLower.includes('herb');
        const isMetal = profLower.includes('metal') || profLower.includes('blacksmith') || profLower.includes('smith');
        const isBaker = profLower.includes('baker') || profLower.includes('bread');
        const wood = rand() > 0.6 ? '#6a4a32' : rand() > 0.3 ? '#5a3d28' : '#7a5b3a';
        const trim = rand() > 0.5 ? '#9a7a54' : '#b08a5a';
        const displayHeight = rand() > 0.6 ? 2.5 : 2.2;
        const hasGlass = rand() > 0.55;
        const hasCarved = rand() > 0.6;
        const clothColors = ['#b88b5a', '#8f6a49', '#c3a16e', '#a17a54'];
        const spiceColors = ['#b86d3c', '#cfa35a', '#8c6a3f', '#a9773f'];
        const metalColors = ['#6f6f6f', '#8a7a6a', '#5c5c5c'];
        const breadColors = ['#b07a4a', '#c18b5a', '#a76f3f'];
        const itemSlots = [-0.9, 0, 0.9];
        const shelfYs = [0.75, 1.45];
        const items: Array<{ label: string; type: 'cloth' | 'jar' | 'ingot' | 'bread' | 'scroll' | 'tool' | 'sack' }> = [];
        const pushItems = (list: Array<{ label: string; type: 'cloth' | 'jar' | 'ingot' | 'bread' | 'scroll' | 'tool' | 'sack' }>) => {
          list.forEach((item) => items.push(item));
        };
        if (isTextile) {
          pushItems([
            { label: 'Dyed cloth', type: 'cloth' },
            { label: 'Folded linen', type: 'cloth' },
            { label: 'Spindle', type: 'tool' },
            { label: 'Wool roll', type: 'cloth' },
            { label: 'Cotton scarf', type: 'cloth' },
            { label: 'Dye jar', type: 'jar' }
          ]);
        } else if (isSpice) {
          pushItems([
            { label: 'Spice jars', type: 'jar' },
            { label: 'Herb bundle', type: 'sack' },
            { label: 'Mortar', type: 'tool' },
            { label: 'Dried dates', type: 'sack' },
            { label: 'Saffron box', type: 'jar' },
            { label: 'Oils', type: 'jar' }
          ]);
        } else if (isMetal) {
          pushItems([
            { label: 'Iron ingots', type: 'ingot' },
            { label: 'Hammer', type: 'tool' },
            { label: 'Knife', type: 'tool' },
            { label: 'Bronze fittings', type: 'ingot' },
            { label: 'Chisel set', type: 'tool' },
            { label: 'Metal buckles', type: 'ingot' }
          ]);
        } else if (isBaker) {
          pushItems([
            { label: 'Bread loaves', type: 'bread' },
            { label: 'Flatbreads', type: 'bread' },
            { label: 'Honey cakes', type: 'bread' },
            { label: 'Sesame rolls', type: 'bread' },
            { label: 'Pita stack', type: 'bread' },
            { label: 'Date pastries', type: 'bread' }
          ]);
        } else {
          pushItems([
            { label: 'Woven basket', type: 'sack' },
            { label: 'Candles', type: 'jar' },
            { label: 'Small jar', type: 'jar' },
            { label: 'Cloth roll', type: 'cloth' },
            { label: 'Ledger', type: 'scroll' },
            { label: 'Utility tools', type: 'tool' }
          ]);
        }
        while (items.length < 6) {
          items.push({ label: 'Goods', type: 'cloth' });
        }
        const renderItem = (item: typeof items[number], pos: [number, number, number], key: string) => {
          const [x, y, z] = pos;
          const worldPos: [number, number, number] = [base.x + x, base.y + y, base.z + z];
          const color = (() => {
            if (item.type === 'cloth') return clothColors[Math.floor(rand() * clothColors.length)];
            if (item.type === 'jar') return spiceColors[Math.floor(rand() * spiceColors.length)];
            if (item.type === 'ingot') return metalColors[Math.floor(rand() * metalColors.length)];
            if (item.type === 'bread') return breadColors[Math.floor(rand() * breadColors.length)];
            if (item.type === 'scroll') return '#cdbb9a';
            return '#7a5a3a';
          })();
          return (
            <InteriorHoverable key={key} position={worldPos} label={item.label} labelOffset={[0, 0.35, 0]}>
              <group position={[x, y, z]}>
                {item.type === 'cloth' && (
                  <mesh receiveShadow>
                    <boxGeometry args={[0.55, 0.16, 0.32]} />
                    <meshStandardMaterial color={color} roughness={0.85} />
                  </mesh>
                )}
                {item.type === 'jar' && (
                  <mesh receiveShadow>
                    <cylinderGeometry args={[0.12, 0.14, 0.3, 10]} />
                    <meshStandardMaterial color={color} roughness={0.8} />
                  </mesh>
                )}
                {item.type === 'ingot' && (
                  <mesh receiveShadow>
                    <boxGeometry args={[0.45, 0.12, 0.26]} />
                    <meshStandardMaterial color={color} roughness={0.6} metalness={0.35} />
                  </mesh>
                )}
                {item.type === 'bread' && (
                  <mesh receiveShadow>
                    <boxGeometry args={[0.4, 0.16, 0.28]} />
                    <meshStandardMaterial color={color} roughness={0.9} />
                  </mesh>
                )}
                {item.type === 'scroll' && (
                  <mesh receiveShadow>
                    <cylinderGeometry args={[0.12, 0.12, 0.34, 8]} />
                    <meshStandardMaterial color={color} roughness={0.85} />
                  </mesh>
                )}
                {item.type === 'tool' && (
                  <group>
                    <mesh receiveShadow>
                      <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
                      <meshStandardMaterial color="#5a3f2a" roughness={0.8} />
                    </mesh>
                    <mesh position={[0.12, 0.05, 0]} receiveShadow>
                      <boxGeometry args={[0.2, 0.08, 0.08]} />
                      <meshStandardMaterial color="#7a6a5a" roughness={0.6} metalness={0.3} />
                    </mesh>
                  </group>
                )}
                {item.type === 'sack' && (
                  <mesh receiveShadow>
                    <sphereGeometry args={[0.18, 10, 8]} />
                    <meshStandardMaterial color={color} roughness={0.9} />
                  </mesh>
                )}
              </group>
            </InteriorHoverable>
          );
        };
        return (
          <group {...common}>
            <mesh position={[0, displayHeight / 2 - 0.1, 0]} receiveShadow>
              <boxGeometry args={[3.4, displayHeight, 0.8]} />
              <meshStandardMaterial color={wood} roughness={0.9} />
            </mesh>
            <mesh position={[0, displayHeight - 0.55, 0.36]} receiveShadow>
              <boxGeometry args={[3.0, 0.12, 0.16]} />
              <meshStandardMaterial color={trim} roughness={0.85} />
            </mesh>
            <mesh position={[0, displayHeight - 1.25, 0.36]} receiveShadow>
              <boxGeometry args={[3.0, 0.12, 0.16]} />
              <meshStandardMaterial color={trim} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.28, 0.36]} receiveShadow>
              <boxGeometry args={[3.0, 0.12, 0.16]} />
              <meshStandardMaterial color={trim} roughness={0.85} />
            </mesh>
            <mesh position={[-1.55, displayHeight / 2 - 0.1, 0]} receiveShadow>
              <boxGeometry args={[0.12, displayHeight - 0.2, 0.7]} />
              <meshStandardMaterial color={darkenHex(wood, 0.85)} roughness={0.9} />
            </mesh>
            <mesh position={[1.55, displayHeight / 2 - 0.1, 0]} receiveShadow>
              <boxGeometry args={[0.12, displayHeight - 0.2, 0.7]} />
              <meshStandardMaterial color={darkenHex(wood, 0.85)} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.6, 0.28]} receiveShadow>
              <boxGeometry args={[3.0, 0.06, 0.1]} />
              <meshStandardMaterial color={darkenHex(wood, 0.8)} roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.32, 0.28]} receiveShadow>
              <boxGeometry args={[3.0, 0.06, 0.1]} />
              <meshStandardMaterial color={darkenHex(wood, 0.8)} roughness={0.9} />
            </mesh>
            {hasCarved && (
              <>
                <mesh position={[0, displayHeight - 0.25, 0.42]} receiveShadow>
                  <boxGeometry args={[3.2, 0.08, 0.06]} />
                  <meshStandardMaterial color={darkenHex(trim, 0.8)} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.18, 0.42]} receiveShadow>
                  <boxGeometry args={[3.2, 0.08, 0.06]} />
                  <meshStandardMaterial color={darkenHex(trim, 0.8)} roughness={0.8} />
                </mesh>
              </>
            )}
            {hasGlass && (
              <mesh position={[0, displayHeight / 2 - 0.1, 0.42]}>
                <planeGeometry args={[3.0, displayHeight - 0.6]} />
                <meshStandardMaterial color="#c8d0d8" transparent opacity={0.12} roughness={0.15} metalness={0.1} />
              </mesh>
            )}
            {shelfYs.map((y, shelfIndex) => (
              <group key={`shelf-${shelfIndex}`}>
                {itemSlots.map((x, idx) => {
                  const item = items[shelfIndex * 3 + idx];
                  return item ? renderItem(item, [x, y, 0.12], `shelf-item-${shelfIndex}-${idx}`) : null;
                })}
              </group>
            ))}
          </group>
        );
      }
    case InteriorPropType.BASKET:
      return (
        <group {...common}>
          <ContactShadow size={[0.6, 0.6]} />
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <cylinderGeometry args={[0.45, 0.5, 0.3, 12, 1, true]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.32, 0]} receiveShadow>
            <torusGeometry args={[0.4, 0.05, 8, 16]} />
            <meshStandardMaterial color="#9a7b58" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.18, 12]} />
            <meshStandardMaterial color="#6b4f2c" roughness={0.95} />
          </mesh>
        </group>
      );
    case InteriorPropType.BOLT_OF_CLOTH:
      return (
        <group {...common}>
          <ContactShadow size={[0.9, 0.4]} />
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.9, 10]} />
            <meshStandardMaterial color="#8a5a4a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.88, 10]} />
            <meshStandardMaterial color="#7b5a3a" roughness={0.85} transparent opacity={0.85} />
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
    case InteriorPropType.LADDER:
      return (
        <group {...common}>
          <mesh position={[-0.25, 1.2, 0]} receiveShadow>
            <boxGeometry args={[0.08, 2.4, 0.12]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0.25, 1.2, 0]} receiveShadow>
            <boxGeometry args={[0.08, 2.4, 0.12]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
          {[-0.6, -0.2, 0.2, 0.6, 1.0].map((y, idx) => (
            <mesh key={`rung-${idx}`} position={[0, y + 1.1, 0]} receiveShadow>
              <boxGeometry args={[0.6, 0.08, 0.12]} />
              <meshStandardMaterial color="#6a4a32" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case InteriorPropType.STAIRS:
      return (
        <group {...common}>
          {[0, 1, 2, 3].map((step) => (
            <mesh key={`step-${step}`} position={[0, 0.2 + step * 0.22, -0.2 - step * 0.35]} receiveShadow>
              <boxGeometry args={[1.6, 0.22, 0.6]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 1.15, -1.1]} receiveShadow>
            <boxGeometry args={[1.7, 0.18, 0.7]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
          </mesh>
        </group>
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
    case InteriorPropType.FLOOR_PILLOWS: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 11 + prop.position[2] * 17) * 10000);
      let localSeed = seed;
      const rand = () => seededRandom(localSeed++);
      const palette = ['#9b4a3c', '#8a6b4f', '#7b3f2d', '#b07a4a', '#6f5a7b', '#9b7a52', '#6b4f3f'];
      const accent = ['#d1b06b', '#c18b5a', '#b58a6a', '#9e6d4a', '#8e6b9b'];
      const base = palette[Math.floor(rand() * palette.length)];
      const stripe = accent[Math.floor(rand() * accent.length)];
      const scaleA = 0.9 + rand() * 0.25;
      const scaleB = 0.8 + rand() * 0.25;
      const pickShape = () => {
        const roll = rand();
        if (roll < 0.1) return 'oct';
        if (roll < 0.7) return 'square';
        return 'round';
      };
      const shapeA = pickShape();
      const shapeB = pickShape();
      return (
        <group {...common}>
          <group position={[0.2, 0.12, 0]}>
            {shapeA === 'square' && (
              <mesh receiveShadow>
                <boxGeometry args={[0.78 * scaleA, 0.22, 0.78 * scaleA]} />
                <meshStandardMaterial color={base} roughness={0.92} />
              </mesh>
            )}
            {shapeA === 'round' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[0.42 * scaleA, 0.46 * scaleA, 0.22, 16]} />
                <meshStandardMaterial color={base} roughness={0.92} />
              </mesh>
            )}
            {shapeA === 'oct' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[0.42 * scaleA, 0.46 * scaleA, 0.22, 8]} />
                <meshStandardMaterial color={base} roughness={0.92} />
              </mesh>
            )}
            <mesh position={[0, 0.12, 0]} receiveShadow>
              <boxGeometry args={[0.1, 0.03, 0.65 * scaleA]} />
              <meshStandardMaterial color={stripe} roughness={0.85} />
            </mesh>
          </group>
          <group position={[-0.35, 0.12, -0.15]}>
            {shapeB === 'square' && (
              <mesh receiveShadow>
                <boxGeometry args={[0.68 * scaleB, 0.2, 0.68 * scaleB]} />
                <meshStandardMaterial color={darkenHex(base, 0.9)} roughness={0.92} />
              </mesh>
            )}
            {shapeB === 'round' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[0.36 * scaleB, 0.4 * scaleB, 0.2, 16]} />
                <meshStandardMaterial color={darkenHex(base, 0.9)} roughness={0.92} />
              </mesh>
            )}
            {shapeB === 'oct' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[0.36 * scaleB, 0.4 * scaleB, 0.2, 8]} />
                <meshStandardMaterial color={darkenHex(base, 0.9)} roughness={0.92} />
              </mesh>
            )}
            <mesh position={[0, 0.1, 0]} receiveShadow>
              <boxGeometry args={[0.6 * scaleB, 0.03, 0.09]} />
              <meshStandardMaterial color={stripe} roughness={0.85} />
            </mesh>
          </group>
        </group>
      );
    }
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
          <ContactShadow size={[1.4, 0.9]} />
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <boxGeometry args={[1.4, 0.25, 0.9]} />
            <meshStandardMaterial color="#6c5a4a" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 0.32, -0.2]} receiveShadow>
            <boxGeometry args={[0.4, 0.12, 0.3]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[-0.35, 0.3, 0.2]} receiveShadow>
            <boxGeometry args={[0.5, 0.1, 0.25]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CHEST: {
      const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 17 + prop.position[2] * 23) * 10000);
      const rand = () => seededRandom(seed + 31);
      const w = 0.9 + rand() * 0.5;
      const d = 0.5 + rand() * 0.3;
      const h = 0.5 + rand() * 0.25;
      const band = rand() > 0.45;
      const trim = rand() > 0.7;
      const wood = rand() > 0.5 ? '#6a4a32' : '#5a3d28';
      const lid = darkenHex(wood, 0.88);
      const metal = '#3f2b1b';
      return (
        <group {...common} position={anchoredPos(h * 0.75)}>
          <mesh receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={wood} roughness={0.85} />
          </mesh>
          <mesh position={[0, h * 0.25, 0]} receiveShadow>
            <boxGeometry args={[w * 1.02, h * 0.35, d * 1.02]} />
            <meshStandardMaterial color={lid} roughness={0.85} />
          </mesh>
          <mesh position={[0, h * 0.05, d / 2 + 0.02]} receiveShadow>
            <boxGeometry args={[w * 0.6, 0.05, 0.06]} />
            <meshStandardMaterial color={metal} roughness={0.9} />
          </mesh>
          {band && (
            <mesh position={[0, 0, 0]} receiveShadow>
              <boxGeometry args={[w * 0.9, 0.06, d * 1.04]} />
              <meshStandardMaterial color={darkenHex(wood, 0.78)} roughness={0.88} />
            </mesh>
          )}
          {trim && (
            <>
              <mesh position={[-w / 2 + 0.06, h * 0.1, -d / 2 + 0.06]} receiveShadow>
                <boxGeometry args={[0.06, h * 0.4, 0.06]} />
                <meshStandardMaterial color={metal} roughness={0.85} />
              </mesh>
              <mesh position={[w / 2 - 0.06, h * 0.1, d / 2 - 0.06]} receiveShadow>
                <boxGeometry args={[0.06, h * 0.4, 0.06]} />
                <meshStandardMaterial color={metal} roughness={0.85} />
              </mesh>
            </>
          )}
        </group>
      );
    }
    case InteriorPropType.SHELF:
      return (
        <group {...common} position={anchoredPos(0.7)}>
          <ContactShadow size={[1.3, 0.35]} />
          <mesh receiveShadow>
            <boxGeometry args={[1.3, 1.4, 0.35]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {[0.2, -0.2].map((y, idx) => (
            <mesh key={`shelf-${idx}`} position={[0, y, 0.16]} receiveShadow>
              <boxGeometry args={[1.2, 0.05, 0.08]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[-0.55, 0.7, 0]} receiveShadow>
            <boxGeometry args={[0.05, 1.4, 0.32]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
          <mesh position={[0.55, 0.7, 0]} receiveShadow>
            <boxGeometry args={[0.05, 1.4, 0.32]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.LAMP:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.2, 8]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.28, 0]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <Flame position={[0, 0.38, 0]} size={0.09} color="#ffcf88" emissive="#ff9a3c" />
        </group>
      );
    case InteriorPropType.CANDLE:
      return (
        <group {...common}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.16, 8]} />
            <meshStandardMaterial color="#f1e1b9" roughness={0.7} />
          </mesh>
          <Flame position={[0, 0.2, 0]} size={0.06} color="#ffd7a1" emissive="#ff8b2e" />
        </group>
      );
    case InteriorPropType.FLOOR_LAMP:
      return (
        <group {...common}>
          <mesh position={[0, 0.6, 0]} receiveShadow>
            <cylinderGeometry args={[0.06, 0.08, 1.2, 10]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.25, 0]} receiveShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.18, 10]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <Flame position={[0, 1.38, 0]} size={0.1} color="#ffcf88" emissive="#ff9a3c" />
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
          <Flame position={[0, 0.45, 0]} size={0.16} color="#ffb347" emissive="#ff7a18" />
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
          <Flame position={[0, 0.42, 0]} size={0.22} color="#ffb347" emissive="#ff7a18" />
          <FirePit position={[0, 0, 0]} />
          <FireSmoke position={[0, 0, 0]} />
        </group>
      );
    case InteriorPropType.AMPHORA:
      return (
        <group {...common}>
          <ContactShadow size={[0.5, 0.5]} />
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <cylinderGeometry args={[0.18, 0.25, 0.5, 10]} />
            <meshStandardMaterial color="#9a6b3a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.55, 0]} receiveShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color="#9a6b3a" roughness={0.95} />
          </mesh>
          <mesh position={[0.12, 0.45, 0]} receiveShadow>
            <boxGeometry args={[0.05, 0.12, 0.06]} />
            <meshStandardMaterial color="#8a5a2f" roughness={0.95} />
          </mesh>
        </group>
      );
    case InteriorPropType.SCREEN:
      return (
        <group {...common} position={anchoredPos(0.9)}>
          <mesh receiveShadow>
            <boxGeometry args={[1.9, 1.9, 0.1]} />
            <meshStandardMaterial color="#6f4b2c" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0, 0.04]} receiveShadow>
            <boxGeometry args={[1.6, 1.6, 0.04]} />
            <meshStandardMaterial color="#5c3f26" roughness={0.85} />
          </mesh>
          {[-0.55, -0.2, 0.2, 0.55].map((x, idx) => (
            <mesh key={`screen-slat-v-${idx}`} position={[x, 0, 0.06]} receiveShadow>
              <boxGeometry args={[0.08, 1.4, 0.04]} />
              <meshStandardMaterial color="#4f3522" roughness={0.88} />
            </mesh>
          ))}
          {[-0.4, 0, 0.4].map((y, idx) => (
            <mesh key={`screen-slat-h-${idx}`} position={[0, y, 0.06]} receiveShadow>
              <boxGeometry args={[1.4, 0.06, 0.04]} />
              <meshStandardMaterial color="#4f3522" roughness={0.88} />
            </mesh>
          ))}
        </group>
      );
    case InteriorPropType.LOOM:
      return (
        <group {...common} position={anchoredPos(0.6)}>
          <ContactShadow size={[1.6, 0.8]} />
          <mesh receiveShadow>
            <boxGeometry args={[1.4, 1.2, 0.6]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0.35]} receiveShadow>
            <boxGeometry args={[1.2, 0.1, 0.08]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.6, 0.35]} receiveShadow>
            <boxGeometry args={[1.2, 0.1, 0.08]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.9, 0.35]} receiveShadow>
            <boxGeometry args={[1.2, 0.1, 0.08]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.SPINDLE:
      return <Spindle position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.DYE_VAT:
      return <DyeVat position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.ANVIL:
      return <Anvil position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.TOOL_RACK:
      return <ToolRack position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.MORTAR:
      return <Mortar position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.HERB_RACK:
      return <HerbRack position={anchoredPos(0)} rotation={rotation} />;
    case InteriorPropType.WATER_BASIN:
      return (
        <group {...common} position={anchoredPos(0.25)}>
          <ContactShadow size={[1.0, 1.0]} />
          <mesh position={[0, 0.12, 0]} receiveShadow>
            <cylinderGeometry args={[0.86, 0.95, 0.24, 16]} />
            <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.28, 0]} receiveShadow>
            <cylinderGeometry args={[0.78, 0.82, 0.2, 16]} />
            <meshStandardMaterial color="#6d4f40" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <torusGeometry args={[0.74, 0.05, 10, 24]} />
            <meshStandardMaterial color="#6b4a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.62, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.1, 0.12, 0.24]} />
            <meshStandardMaterial color="#6a4a3a" roughness={0.9} />
          </mesh>
          <mesh position={[-0.62, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.1, 0.12, 0.24]} />
            <meshStandardMaterial color="#6a4a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.45, 0]} receiveShadow>
            <circleGeometry args={[0.62, 18]} />
            <meshStandardMaterial color="#36546a" emissive="#1f3445" emissiveIntensity={0.28} roughness={0.55} />
          </mesh>
        </group>
      );
    case InteriorPropType.EWER:
      return (
        <group {...common}>
          <ContactShadow size={[0.4, 0.4]} />
          <mesh position={[0, 0.28, 0]} receiveShadow>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.52, 0]} receiveShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.24, 10]} />
            <meshStandardMaterial color="#7d5b40" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.66, 0]} receiveShadow>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#7d5b40" roughness={0.86} />
          </mesh>
          <mesh position={[0.26, 0.42, 0]} rotation={[0, 0, -0.4]} receiveShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.28, 8]} />
            <meshStandardMaterial color="#7a563c" roughness={0.88} />
          </mesh>
          <mesh position={[-0.22, 0.44, 0]} rotation={[0, 0, 0.9]} receiveShadow>
            <torusGeometry args={[0.12, 0.025, 8, 14]} />
            <meshStandardMaterial color="#7a563c" roughness={0.88} />
          </mesh>
        </group>
      );
    case InteriorPropType.CUSHION:
      {
        const seed = Math.floor(seededRandom(prop.id.length + prop.position[0] * 19 + prop.position[2] * 31) * 10000);
        let localSeed = seed;
        const rand = () => seededRandom(localSeed++);
        const palette = ['#9b4a3c', '#8a6b4f', '#7b3f2d', '#6f5a7b', '#9b7a52', '#7d6248', '#b07a4a'];
        const accent = ['#d1b06b', '#c18b5a', '#b58a6a', '#9e6d4a', '#8e6b9b'];
        const base = palette[Math.floor(rand() * palette.length)];
        const trim = accent[Math.floor(rand() * accent.length)];
        const w = 0.72 + rand() * 0.24;
        const d = 0.72 + rand() * 0.24;
        const roll = rand();
        const shape = roll < 0.1 ? 'oct' : roll < 0.7 ? 'square' : 'round';
        return (
          <group {...common} position={anchoredPos(0.12)}>
            {shape === 'square' && (
              <mesh receiveShadow>
                <boxGeometry args={[w, 0.24, d]} />
                <meshStandardMaterial color={base} roughness={0.9} />
              </mesh>
            )}
            {shape === 'round' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[w * 0.5, w * 0.55, 0.24, 16]} />
                <meshStandardMaterial color={base} roughness={0.9} />
              </mesh>
            )}
            {shape === 'oct' && (
              <mesh receiveShadow>
                <cylinderGeometry args={[w * 0.5, w * 0.55, 0.24, 8]} />
                <meshStandardMaterial color={base} roughness={0.9} />
              </mesh>
            )}
            <mesh position={[0, 0.14, 0]} receiveShadow>
              <boxGeometry args={[w * 0.7, 0.03, d * 0.08]} />
              <meshStandardMaterial color={trim} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.14, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
              <boxGeometry args={[d * 0.7, 0.03, w * 0.08]} />
              <meshStandardMaterial color={trim} roughness={0.85} />
            </mesh>
          </group>
        );
      }
    case InteriorPropType.DESK:
      return (
        <group {...common}>
          <ContactShadow size={[1.8, 0.8]} />
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.32, 0.8]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {[
            [0.7, 0.15, 0.3],
            [-0.7, 0.15, 0.3],
            [0.7, 0.15, -0.3],
            [-0.7, 0.15, -0.3],
          ].map((pos, idx) => (
            <mesh key={`desk-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.12, 0.3, 0.12]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0.4, 0.55, -0.1]} receiveShadow>
            <boxGeometry args={[0.4, 0.1, 0.3]} />
            <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.4, 0.55, 0.2]} receiveShadow>
            <boxGeometry args={[0.5, 0.08, 0.2]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.52, 0.32]} receiveShadow>
            <boxGeometry args={[0.6, 0.12, 0.08]} />
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
          <ContactShadow size={[0.7, 0.7]} />
          <mesh position={[0, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          {[
            [0.22, 0.15, 0.22],
            [-0.22, 0.15, 0.22],
            [0.22, 0.15, -0.22],
            [-0.22, 0.15, -0.22],
          ].map((pos, idx) => (
            <mesh key={`chair-leg-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.08, 0.3, 0.08]} />
              <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.7, -0.25]} receiveShadow>
            <boxGeometry args={[0.6, 0.7, 0.1]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.6, -0.25]} receiveShadow>
            <boxGeometry args={[0.5, 0.06, 0.08]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
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
        <group {...common} position={anchoredPos(0.35)}>
          <ContactShadow size={[0.8, 0.8]} />
          <mesh receiveShadow>
            <boxGeometry args={[0.8, 0.6, 0.8]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[0.85, 0.1, 0.85]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.1, 0.4]} receiveShadow>
            <boxGeometry args={[0.75, 0.06, 0.1]} />
            <meshStandardMaterial color="#4a3322" roughness={0.85} />
          </mesh>
        </group>
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
  patchMaterial: THREE.MeshStandardMaterial;
  socialClass: SocialClass;
  buildingType: BuildingType;
  wallHeight: number;
  interiorDoorSide?: 'north' | 'south' | 'east' | 'west' | null;
  exteriorDoorSide?: 'north' | 'south' | 'east' | 'west' | null;
  cutawaySide?: 'north' | 'south' | 'east' | 'west' | null;
  doorVariant: number;
  alcoveSide?: 'north' | 'south' | 'east' | 'west' | null;
  doorLabel?: string | null;
  roomSeed: number;
}> = ({ room, floorMaterial, wallMaterial, wallColor, patchMaterial, socialClass, buildingType, wallHeight, interiorDoorSide, exteriorDoorSide, cutawaySide, doorVariant, alcoveSide, doorLabel, roomSeed }) => {
  const [w, , d] = room.size;
  const wallThickness = 0.2;
  const isEntryDoor = room.type === InteriorRoomType.ENTRY;
  const hasDoor = isEntryDoor;
  const isInteriorDoor = !isEntryDoor && interiorDoorSide;
  const exitDoorSide = isEntryDoor ? exteriorDoorSide ?? null : null;
  const rectDoorWidth = 2.2;
  const rectDoorHeight = 2.3;
  const archDoorWidth = 3.0;
  const archDoorHeight = 2.6;
  const useStallOpening = buildingType === BuildingType.COMMERCIAL && isEntryDoor;
  const stallDoorWidth = Math.min(w * 0.7, 6);
  const stallDoorHeight = 2.4;
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
  const isOrnate = socialClass === SocialClass.NOBILITY
    || buildingType === BuildingType.RELIGIOUS
    || buildingType === BuildingType.CIVIC;
  const showNiches = isOrnate || socialClass === SocialClass.MERCHANT;
  const nicheSide = seededRandom(roomSeed + 7) > 0.5 ? 'north' : 'south';
  const nicheOffset = (seededRandom(roomSeed + 11) - 0.5) * (w * 0.4);
  const nichePos: [number, number, number] = nicheSide === 'north'
    ? [nicheOffset, 1.4, d / 2 - 0.12]
    : [nicheOffset, 1.4, -d / 2 + 0.12];
  const labelDoorSide = exitDoorSide ?? interiorDoorSide ?? null;
  const thresholdPos = labelDoorSide
    ? labelDoorSide === 'north'
      ? [0, 0.02, d / 2 - 0.18]
      : labelDoorSide === 'south'
        ? [0, 0.02, -d / 2 + 0.18]
        : labelDoorSide === 'east'
          ? [w / 2 - 0.18, 0.02, 0]
          : [-w / 2 + 0.18, 0.02, 0]
    : hasDoor
      ? [0, 0.02, d / 2 - 0.18]
      : null;
  const thresholdWidth = labelDoorSide && !exitDoorSide ? 2.6 : 2.0;
  const thresholdRot: [number, number, number] = labelDoorSide === 'east' || labelDoorSide === 'west'
    ? [0, Math.PI / 2, 0]
    : [0, 0, 0];
  const [doorHovered, setDoorHovered] = useState(false);
  const doorHoverWidth = labelDoorSide === interiorDoorSide ? archDoorWidth : rectDoorWidth;
  const doorHoverHeight = labelDoorSide === interiorDoorSide ? archDoorHeight : rectDoorHeight;
  const doorHoverPos: [number, number, number] | null = labelDoorSide
    ? labelDoorSide === 'north'
      ? [0, doorHoverHeight / 2, d / 2 - 0.11]
      : labelDoorSide === 'south'
        ? [0, doorHoverHeight / 2, -d / 2 + 0.11]
        : labelDoorSide === 'east'
          ? [w / 2 - 0.11, doorHoverHeight / 2, 0]
          : [-w / 2 + 0.11, doorHoverHeight / 2, 0]
    : null;
  const doorHoverRot: [number, number, number] = labelDoorSide === 'east' || labelDoorSide === 'west'
    ? [0, Math.PI / 2, 0]
    : [0, 0, 0];
  const archWallW = useMemo(
    () => buildWallWithDoorGeometry(w, wallHeight, archDoorWidth, archDoorHeight, wallThickness, true),
    [w, wallHeight, archDoorWidth, archDoorHeight, wallThickness]
  );
  const archWallD = useMemo(
    () => buildWallWithDoorGeometry(d, wallHeight, archDoorWidth, archDoorHeight, wallThickness, true),
    [d, wallHeight, archDoorWidth, archDoorHeight, wallThickness]
  );
  const rectWallW = useMemo(
    () => buildWallWithDoorGeometry(w, wallHeight, rectDoorWidth, rectDoorHeight, wallThickness, false),
    [w, wallHeight, rectDoorWidth, rectDoorHeight, wallThickness]
  );
  const rectWallD = useMemo(
    () => buildWallWithDoorGeometry(d, wallHeight, rectDoorWidth, rectDoorHeight, wallThickness, false),
    [d, wallHeight, rectDoorWidth, rectDoorHeight, wallThickness]
  );
  const stallWallW = useMemo(
    () => buildWallWithDoorGeometry(w, wallHeight, stallDoorWidth, stallDoorHeight, wallThickness, false),
    [w, wallHeight, stallDoorWidth, stallDoorHeight, wallThickness]
  );
  const stallWallD = useMemo(
    () => buildWallWithDoorGeometry(d, wallHeight, stallDoorWidth, stallDoorHeight, wallThickness, false),
    [d, wallHeight, stallDoorWidth, stallDoorHeight, wallThickness]
  );
  const renderWall = (
    side: 'north' | 'south' | 'east' | 'west',
    position: [number, number, number],
    rotation: [number, number, number]
  ) => {
    if (cutawaySide === side) return null;
    const isExteriorSide = exitDoorSide === side;
    const isInteriorSide = interiorDoorSide === side;
    if (isExteriorSide || isInteriorSide) {
      const useArch = isInteriorSide && !isExteriorSide;
      const geom = (side === 'north' || side === 'south')
        ? (isExteriorSide && useStallOpening ? stallWallW : useArch ? archWallW : rectWallW)
        : (isExteriorSide && useStallOpening ? stallWallD : useArch ? archWallD : rectWallD);
      return <mesh position={position} rotation={rotation} receiveShadow material={wallMaterial} geometry={geom} />;
    }
    const isNorthSouth = side === 'north' || side === 'south';
    const boxArgs: [number, number, number] = isNorthSouth
      ? [w, wallHeight, wallThickness]
      : [d, wallHeight, wallThickness];
    const boxRot: [number, number, number] = isNorthSouth ? [0, 0, 0] : [0, Math.PI / 2, 0];
    return (
      <mesh position={position} rotation={boxRot} receiveShadow material={wallMaterial}>
        <boxGeometry args={boxArgs} />
      </mesh>
    );
  };

  const patchCount = socialClass === SocialClass.PEASANT ? 1 : 2;
  const patchSeed = roomSeed + 101;
  const patchPositions = Array.from({ length: patchCount }).map((_, idx) => {
    const roll = seededRandom(patchSeed + idx * 13);
    const side = roll < 0.25 ? 'north' : roll < 0.5 ? 'south' : roll < 0.75 ? 'east' : 'west';
    const offset = (seededRandom(patchSeed + idx * 17) - 0.5) * (side === 'north' || side === 'south' ? w * 0.6 : d * 0.6);
    const y = 1.2 + seededRandom(patchSeed + idx * 23) * 0.9;
    return { side, offset, y };
  });
  const friezeEnabled = socialClass === SocialClass.NOBILITY || socialClass === SocialClass.MERCHANT;

  return (
    <group position={[room.center[0], 0, room.center[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {renderWall('south', [0, wallHeight / 2, -d / 2], [0, 0, 0])}
      {renderWall('north', [0, wallHeight / 2, d / 2], [0, 0, 0])}
      {renderWall('west', [-w / 2, wallHeight / 2, 0], [0, Math.PI / 2, 0])}
      {renderWall('east', [w / 2, wallHeight / 2, 0], [0, Math.PI / 2, 0])}
      {friezeEnabled && (
        <group>
          {cutawaySide !== 'south' && (
            <mesh position={[0, wallHeight - 0.2, -d / 2 + 0.1]} receiveShadow>
              <boxGeometry args={[w, 0.12, 0.08]} />
              <meshStandardMaterial color={darkenHex(wallColor, 0.7)} roughness={0.85} />
            </mesh>
          )}
          {cutawaySide !== 'north' && (
            <mesh position={[0, wallHeight - 0.2, d / 2 - 0.1]} receiveShadow>
              <boxGeometry args={[w, 0.12, 0.08]} />
              <meshStandardMaterial color={darkenHex(wallColor, 0.7)} roughness={0.85} />
            </mesh>
          )}
          {cutawaySide !== 'west' && (
            <mesh position={[-w / 2 + 0.1, wallHeight - 0.2, 0]} receiveShadow>
              <boxGeometry args={[0.08, 0.12, d]} />
              <meshStandardMaterial color={darkenHex(wallColor, 0.7)} roughness={0.85} />
            </mesh>
          )}
          {cutawaySide !== 'east' && (
            <mesh position={[w / 2 - 0.1, wallHeight - 0.2, 0]} receiveShadow>
              <boxGeometry args={[0.08, 0.12, d]} />
              <meshStandardMaterial color={darkenHex(wallColor, 0.7)} roughness={0.85} />
            </mesh>
          )}
        </group>
      )}
      {patchPositions.map((patch, idx) => {
        if (cutawaySide === patch.side) return null;
        const pos = patch.side === 'north'
          ? [patch.offset, patch.y, d / 2 - 0.14]
          : patch.side === 'south'
            ? [patch.offset, patch.y, -d / 2 + 0.14]
            : patch.side === 'east'
              ? [w / 2 - 0.14, patch.y, patch.offset]
              : [-w / 2 + 0.14, patch.y, patch.offset];
        const rot: [number, number, number] = patch.side === 'east' || patch.side === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0];
        return (
          <mesh key={`patch-${idx}`} position={pos as [number, number, number]} rotation={rot}>
            <planeGeometry args={[1.2, 0.7]} />
            <primitive object={patchMaterial} />
          </mesh>
        );
      })}
      {useStallOpening && exitDoorSide && cutawaySide !== exitDoorSide && (
        <mesh
          position={
            exitDoorSide === 'north'
              ? [0, stallDoorHeight + 0.35, d / 2 - 0.16]
              : exitDoorSide === 'south'
                ? [0, stallDoorHeight + 0.35, -d / 2 + 0.16]
                : exitDoorSide === 'east'
                  ? [w / 2 - 0.16, stallDoorHeight + 0.35, 0]
                  : [-w / 2 + 0.16, stallDoorHeight + 0.35, 0]
          }
          rotation={exitDoorSide === 'east' || exitDoorSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[Math.min(stallDoorWidth + 0.6, w - 0.4), 0.2, 0.18]} />
          <meshStandardMaterial color={darkenHex(wallColor, 0.6)} roughness={0.9} />
        </mesh>
      )}
      {/* Stall counter lip removed to keep opening clear. */}
      {/* Door openings are handled by wall cutouts for both exterior and interior doors. */}
      {thresholdPos && cutawaySide !== labelDoorSide && (
        <mesh position={thresholdPos as [number, number, number]} rotation={thresholdRot} receiveShadow>
          <boxGeometry args={[thresholdWidth, 0.06, 0.28]} />
          <meshStandardMaterial color={trimColor} roughness={0.85} />
        </mesh>
      )}
      {doorLabel && doorHoverPos && cutawaySide !== labelDoorSide && (
        <group>
          <mesh
            position={doorHoverPos}
            rotation={doorHoverRot}
            onPointerOver={(e) => {
              e.stopPropagation();
              setDoorHovered(true);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setDoorHovered(false);
            }}
          >
            <planeGeometry args={[doorHoverWidth, doorHoverHeight]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
          {doorHovered && (
            <InteriorHoverLabel title={doorLabel} position={[doorHoverPos[0], doorHoverPos[1] + 0.6, doorHoverPos[2]]} />
          )}
        </group>
      )}
      {showNiches && (
        <group position={[0, 0, 0]}>
          <mesh position={nichePos} receiveShadow>
            <boxGeometry args={[1.1, 0.7, 0.08]} />
            <meshStandardMaterial color={darkenHex(wallColor, 0.55)} roughness={0.9} />
          </mesh>
          <mesh position={[nichePos[0], nichePos[1] - 0.22, nichePos[2] + (nicheSide === 'north' ? -0.04 : 0.04)]} receiveShadow>
            <boxGeometry args={[0.9, 0.2, 0.12]} />
            <meshStandardMaterial color={darkenHex(wallColor, 0.45)} roughness={0.9} />
          </mesh>
        </group>
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
      {(buildingType === BuildingType.RELIGIOUS || buildingType === BuildingType.CIVIC) && (
        <group>
          <mesh position={[0, wallHeight * 0.55, -d / 2 + 0.14]} receiveShadow>
            <boxGeometry args={[w, 0.12, 0.08]} />
            <meshStandardMaterial color={darkenHex(trimColor, 0.85)} roughness={0.85} />
          </mesh>
          <mesh position={[0, wallHeight * 0.55, d / 2 - 0.14]} receiveShadow>
            <boxGeometry args={[w, 0.12, 0.08]} />
            <meshStandardMaterial color={darkenHex(trimColor, 0.85)} roughness={0.85} />
          </mesh>
          <mesh position={[-w / 2 + 0.14, wallHeight * 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.12, d]} />
            <meshStandardMaterial color={darkenHex(trimColor, 0.85)} roughness={0.85} />
          </mesh>
          <mesh position={[w / 2 - 0.14, wallHeight * 0.55, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.12, d]} />
            <meshStandardMaterial color={darkenHex(trimColor, 0.85)} roughness={0.85} />
          </mesh>
        </group>
      )}
      {isOrnate && (
        <>
          {[
            [-w / 2 + 0.6, wallHeight / 2, -d / 2 + 0.6],
            [w / 2 - 0.6, wallHeight / 2, -d / 2 + 0.6],
            [-w / 2 + 0.6, wallHeight / 2, d / 2 - 0.6],
            [w / 2 - 0.6, wallHeight / 2, d / 2 - 0.6]
          ].map((pos, idx) => (
            <mesh key={`col-${idx}`} position={pos as [number, number, number]} receiveShadow>
              <cylinderGeometry args={[0.25, 0.32, wallHeight, 12]} />
              <meshStandardMaterial color="#c9b79d" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, wallHeight - 0.45, -d / 2 + 0.12]} receiveShadow>
            <boxGeometry args={[3.2, 0.7, 0.08]} />
            <meshStandardMaterial color="#b79e7f" roughness={0.88} />
          </mesh>
          <mesh position={[0, wallHeight - 0.45, d / 2 - 0.12]} receiveShadow>
            <boxGeometry args={[3.2, 0.7, 0.08]} />
            <meshStandardMaterial color="#b79e7f" roughness={0.88} />
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

export const InteriorScene: React.FC<InteriorSceneProps> = ({ spec, params, playerStats, onPickupPrompt, onPickupItem }) => {
  const { scene, gl } = useThree();
  const previousBackground = useRef<THREE.Color | THREE.Texture | null>(null);
  const previousFog = useRef<THREE.Fog | null>(null);
  const previousExposure = useRef<number | null>(null);
  const impactPuffsRef = useRef<ImpactPuffSlot[]>(Array.from({ length: MAX_PUFFS }, () => null));
  const impactPuffIndexRef = useRef(0);
  const npcGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const npcStatesRef = useRef<Array<{
    id: string;
    roomId: string;
    position: THREE.Vector3;
    target: THREE.Vector3;
    speed: number;
    wait: number;
    action: 'sit' | 'stand' | 'read' | 'cook';
  }>>([]);
  const npcWalkRef = useRef<Map<string, boolean>>(new Map());
  const [npcWalkState, setNpcWalkState] = useState<Record<string, boolean>>({});
  const playerRef = useRef<THREE.Group>(null);
  const [pickedUpIds, setPickedUpIds] = useState<Set<string>>(new Set());
  const activeProps = useMemo(
    () => spec.props.filter((prop) => !pickedUpIds.has(prop.id)),
    [spec.props, pickedUpIds]
  );
  useEffect(() => {
    setPickedUpIds(new Set());
  }, [spec.id]);
  const pickupMap = useMemo(() => {
    const map = new Map<InteriorPropType, { itemId: string; label: string }>();
    map.set(InteriorPropType.CANDLE, { itemId: 'interior-candle', label: 'Tallow Candle' });
    map.set(InteriorPropType.LAMP, { itemId: 'interior-lamp', label: 'Oil Lamp' });
    map.set(InteriorPropType.EWER, { itemId: 'interior-ewer', label: 'Water Ewer' });
    map.set(InteriorPropType.WATER_BASIN, { itemId: 'interior-basin', label: 'Water Basin' });
    map.set(InteriorPropType.LEDGER, { itemId: 'interior-ledger', label: 'Ledger' });
    map.set(InteriorPropType.BOOKS, { itemId: 'interior-books', label: 'Manuscripts' });
    map.set(InteriorPropType.INK_SET, { itemId: 'interior-ink-set', label: 'Ink Set' });
    map.set(InteriorPropType.HOOKAH, { itemId: 'interior-hookah', label: 'Hookah Parts' });
    map.set(InteriorPropType.TRAY, { itemId: 'interior-tray', label: 'Serving Tray' });
    map.set(InteriorPropType.TEA_SET, { itemId: 'interior-tea-set', label: 'Tea Service' });
    map.set(InteriorPropType.BOLT_OF_CLOTH, { itemId: 'interior-cloth', label: 'Bolt of Cloth' });
    map.set(InteriorPropType.SPINDLE, { itemId: 'interior-spindle', label: 'Spindle' });
    map.set(InteriorPropType.MORTAR, { itemId: 'interior-mortar', label: 'Mortar & Pestle' });
    map.set(InteriorPropType.HERB_RACK, { itemId: 'interior-herbs', label: 'Herb Bundle' });
    map.set(InteriorPropType.TOOL_RACK, { itemId: 'interior-tools', label: 'Tool Set' });
    map.set(InteriorPropType.BASKET, { itemId: 'interior-basket', label: 'Market Basket' });
    return map;
  }, []);
  const pushables = useMemo<PushableObject[]>(() => {
    const items: PushableObject[] = [];
    const pushableTypes = new Set<InteriorPropType>([
      InteriorPropType.BENCH,
      InteriorPropType.CHAIR,
      InteriorPropType.CUSHION,
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
      InteriorPropType.FLOOR_PILLOWS,
      InteriorPropType.CANDLE,
      InteriorPropType.LEDGER,
      InteriorPropType.BOOKS,
      InteriorPropType.INK_SET,
      InteriorPropType.HOOKAH,
      InteriorPropType.TRAY,
      InteriorPropType.TEA_SET,
      InteriorPropType.SPINDLE,
      InteriorPropType.MORTAR,
      InteriorPropType.HERB_RACK,
      InteriorPropType.TOOL_RACK
    ]);
    const typeOffsets: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 0.25,
      [InteriorPropType.CUSHION]: 0.12,
      [InteriorPropType.CHEST]: 0.45,
      [InteriorPropType.CRATE]: 0.35,
      [InteriorPropType.CANDLE]: 0.08,
      [InteriorPropType.LEDGER]: 0.08,
      [InteriorPropType.BOOKS]: 0.1,
      [InteriorPropType.INK_SET]: 0.1,
      [InteriorPropType.TRAY]: 0.12,
      [InteriorPropType.TEA_SET]: 0.12,
      [InteriorPropType.SPINDLE]: 0.08,
      [InteriorPropType.MORTAR]: 0.12,
      [InteriorPropType.HERB_RACK]: 0.2,
      [InteriorPropType.TOOL_RACK]: 0.2
    };
    const typeRadius: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 1.0,
      [InteriorPropType.CHAIR]: 0.6,
      [InteriorPropType.CUSHION]: 0.55,
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
      [InteriorPropType.FLOOR_PILLOWS]: 0.7,
      [InteriorPropType.CANDLE]: 0.2,
      [InteriorPropType.LEDGER]: 0.25,
      [InteriorPropType.BOOKS]: 0.3,
      [InteriorPropType.INK_SET]: 0.25,
      [InteriorPropType.HOOKAH]: 0.45,
      [InteriorPropType.TRAY]: 0.3,
      [InteriorPropType.TEA_SET]: 0.3,
      [InteriorPropType.SPINDLE]: 0.2,
      [InteriorPropType.MORTAR]: 0.3,
      [InteriorPropType.HERB_RACK]: 0.45,
      [InteriorPropType.TOOL_RACK]: 0.45
    };
    const typeMass: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 2.2,
      [InteriorPropType.CHAIR]: 1.3,
      [InteriorPropType.CUSHION]: 0.5,
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
      [InteriorPropType.FLOOR_PILLOWS]: 0.5,
      [InteriorPropType.CANDLE]: 0.2,
      [InteriorPropType.LEDGER]: 0.2,
      [InteriorPropType.BOOKS]: 0.25,
      [InteriorPropType.INK_SET]: 0.2,
      [InteriorPropType.HOOKAH]: 0.8,
      [InteriorPropType.TRAY]: 0.3,
      [InteriorPropType.TEA_SET]: 0.3,
      [InteriorPropType.SPINDLE]: 0.25,
      [InteriorPropType.MORTAR]: 0.4,
      [InteriorPropType.HERB_RACK]: 0.6,
      [InteriorPropType.TOOL_RACK]: 0.9
    };
    const typeMaterial: Partial<Record<InteriorPropType, 'wood' | 'ceramic' | 'cloth' | 'stone'>> = {
      [InteriorPropType.BENCH]: 'wood',
      [InteriorPropType.CHAIR]: 'wood',
      [InteriorPropType.CUSHION]: 'cloth',
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
      [InteriorPropType.FLOOR_PILLOWS]: 'cloth',
      [InteriorPropType.CANDLE]: 'cloth',
      [InteriorPropType.LEDGER]: 'wood',
      [InteriorPropType.BOOKS]: 'wood',
      [InteriorPropType.INK_SET]: 'ceramic',
      [InteriorPropType.HOOKAH]: 'ceramic',
      [InteriorPropType.TRAY]: 'wood',
      [InteriorPropType.TEA_SET]: 'ceramic',
      [InteriorPropType.SPINDLE]: 'wood',
      [InteriorPropType.MORTAR]: 'stone',
      [InteriorPropType.HERB_RACK]: 'wood',
      [InteriorPropType.TOOL_RACK]: 'wood'
    };
    activeProps.forEach((prop) => {
      if (!pushableTypes.has(prop.type)) return;
      const offsetY = typeOffsets[prop.type] ?? 0;
      const radius = typeRadius[prop.type] ?? 0.6;
      const mass = typeMass[prop.type] ?? 1.0;
      const material = typeMaterial[prop.type] ?? 'wood';
      const position: [number, number, number] = [prop.position[0], prop.position[1] + offsetY, prop.position[2]];
      const item = createPushable(`interior-${prop.id}`, 'interior', position, radius, mass, 0, material);
      item.sourceId = prop.id;
      const pickupMeta = pickupMap.get(prop.type);
      if (pickupMeta) {
        item.pickup = { type: 'item', label: prop.label ?? pickupMeta.label, itemId: pickupMeta.itemId };
      }
      items.push(item);
    });
    return items;
  }, [activeProps, pickupMap]);
  const pushablesRef = useRef<PushableObject[]>(pushables);
  useEffect(() => {
    pushablesRef.current = pushables;
  }, [pushables]);
  const handlePickup = useCallback((itemId: string, pickup: import('../utils/pushables').PickupInfo) => {
    const propId = itemId.startsWith('interior-') ? itemId.slice('interior-'.length) : itemId;
    setPickedUpIds((prev) => {
      if (prev.has(propId)) return prev;
      const next = new Set(prev);
      next.add(propId);
      return next;
    });
    onPickupItem?.(pickup);
  }, [onPickupItem]);
  const entryRoom = useMemo(() => spec.rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? spec.rooms[0], [spec.rooms]);
  const roomMap = useMemo(() => {
    const map = new Map<string, InteriorRoom>();
    spec.rooms.forEach((room) => map.set(room.id, room));
    return map;
  }, [spec.rooms]);
  const wallHeight = spec.wallHeight ?? 3.2;
  const roomHotspots = useMemo(() => {
    const map = new Map<string, Array<{ position: THREE.Vector3; action: 'sit' | 'stand' | 'read' | 'cook' }>>();
    spec.rooms.forEach((room) => map.set(room.id, []));
    activeProps.forEach((prop) => {
      const list = map.get(prop.roomId);
      if (!list) return;
      const pos = new THREE.Vector3(prop.position[0], prop.position[1], prop.position[2]);
      switch (prop.type) {
        case InteriorPropType.CHAIR:
        case InteriorPropType.FLOOR_PILLOWS:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0)), action: 'sit' });
          break;
        case InteriorPropType.LOW_TABLE:
          list.push({ position: pos.clone().add(new THREE.Vector3(0.9, 0, 0)), action: 'sit' });
          list.push({ position: pos.clone().add(new THREE.Vector3(-0.9, 0, 0)), action: 'sit' });
          break;
        case InteriorPropType.DESK:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0.6)), action: 'read' });
          break;
        case InteriorPropType.FIRE_PIT:
        case InteriorPropType.BRAZIER:
          list.push({ position: pos.clone().add(new THREE.Vector3(0.8, 0, 0)), action: 'cook' });
          break;
        case InteriorPropType.COUNTER:
        case InteriorPropType.DISPLAY:
        case InteriorPropType.WATER_BASIN:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0.6)), action: 'stand' });
          break;
        default:
          break;
      }
    });
    return map;
  }, [activeProps, spec.rooms]);
  const playerSpawn = useMemo<[number, number, number]>(() => {
    return [entryRoom.center[0], 0, entryRoom.center[2]];
  }, [entryRoom]);
  const isDay = params.timeOfDay >= 7 && params.timeOfDay <= 17;
  const lampProps = useMemo(
    () => activeProps.filter((prop) => (
      prop.type === InteriorPropType.LAMP
      || prop.type === InteriorPropType.BRAZIER
      || prop.type === InteriorPropType.FIRE_PIT
      || prop.type === InteriorPropType.CANDLE
      || prop.type === InteriorPropType.FLOOR_LAMP
    )),
    [activeProps]
  );
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
  const doorMapForObstacles = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west' | null>();
    interiorDoorMap.forEach((side, id) => map.set(id, side));
    const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
    spec.rooms.forEach((room) => {
      if (room.type === InteriorRoomType.ENTRY) {
        if (!map.has(room.id)) {
          map.set(room.id, entrySide);
        }
      }
    });
    return map;
  }, [spec.rooms, interiorDoorMap, spec.exteriorDoorSide]);
  const activeSpec = useMemo(() => ({ ...spec, props: activeProps }), [spec, activeProps]);
  const rawObstacles = useMemo<Obstacle[]>(() => generateInteriorObstacles(activeSpec, doorMapForObstacles), [activeSpec, doorMapForObstacles]);
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
  const roomLabel = useCallback((room: InteriorRoom) => {
    if (room.type === InteriorRoomType.PRIVATE) return 'Sleeping Room';
    if (room.type === InteriorRoomType.STORAGE) return 'Storage';
    if (room.type === InteriorRoomType.WORKSHOP) return 'Study';
    if (room.type === InteriorRoomType.COURTYARD) return 'Courtyard';
    if (room.type === InteriorRoomType.ENTRY) {
      if (spec.buildingType === BuildingType.COMMERCIAL) return 'Shop';
      return 'Courtyard Exit';
    }
    if (room.type === InteriorRoomType.HALL) {
      const hasFire = activeProps.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.FIRE_PIT);
      if (spec.buildingType === BuildingType.COMMERCIAL) return 'Shop';
      return hasFire ? 'Kitchen' : 'Hall';
    }
    return 'Room';
  }, [activeProps, spec.buildingType]);
  const doorTargetMap = useMemo(() => {
    const map = new Map<string, InteriorRoom>();
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
      if (closest) map.set(room.id, closest);
    });
    return map;
  }, [spec.rooms]);
  const windowMap = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west'>();
    const exteriorSide = spec.exteriorDoorSide;
    const entrySide = exteriorSide === 0 ? 'north' : exteriorSide === 1 ? 'south' : exteriorSide === 2 ? 'east' : 'west';
    spec.rooms.forEach((room) => {
      const index = parseInt(room.id.split('-')[1] || '0', 10);
      const roll = seededRandom(styleSeed + index * 23);
      let side: 'north' | 'south' | 'east' | 'west' = roll < 0.25 ? 'north' : roll < 0.5 ? 'south' : roll < 0.75 ? 'east' : 'west';
      if (room.type === InteriorRoomType.ENTRY && exteriorSide !== undefined) {
        if (spec.buildingType === BuildingType.COMMERCIAL) {
          side = entrySide;
        } else {
          side = exteriorSide === 0 ? 'south' : exteriorSide === 1 ? 'north' : exteriorSide === 2 ? 'west' : 'east';
        }
      }
      map.set(room.id, side);
    });
    return map;
  }, [spec.rooms, styleSeed, spec.exteriorDoorSide, spec.buildingType]);

  const doorVolumes = useMemo(() => {
    const volumes: Array<{
      id: string;
      side: 'north' | 'south' | 'east' | 'west';
      position: THREE.Vector3;
      normal: THREE.Vector3;
      width: number;
      target?: THREE.Vector3;
    }> = [];
    const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
    spec.rooms.forEach((room) => {
      const targetRoom = doorTargetMap.get(room.id);
      if (room.type === InteriorRoomType.ENTRY && !targetRoom) return;
      const side = room.type === InteriorRoomType.ENTRY ? (interiorDoorMap.get(room.id) ?? entrySide) : (interiorDoorMap.get(room.id) ?? 'north');
      const halfW = room.size[0] / 2;
      const halfD = room.size[2] / 2;
      const pos = side === 'north'
        ? new THREE.Vector3(room.center[0], 0, room.center[2] + halfD - 0.15)
        : side === 'south'
          ? new THREE.Vector3(room.center[0], 0, room.center[2] - halfD + 0.15)
          : side === 'east'
            ? new THREE.Vector3(room.center[0] + halfW - 0.15, 0, room.center[2])
            : new THREE.Vector3(room.center[0] - halfW + 0.15, 0, room.center[2]);
      const normal = side === 'north' ? new THREE.Vector3(0, 0, 1)
        : side === 'south' ? new THREE.Vector3(0, 0, -1)
          : side === 'east' ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(-1, 0, 0);
      volumes.push({
        id: room.id,
        side,
        position: pos,
        normal,
        width: 1.2,
        target: targetRoom ? new THREE.Vector3(targetRoom.center[0], 0, targetRoom.center[2]) : undefined
      });
    });
    return volumes;
  }, [spec.rooms, spec.exteriorDoorSide, interiorDoorMap, doorTargetMap]);

  useEffect(() => {
    npcStatesRef.current = spec.npcs.map((npc, index) => {
      let nearestRoom = entryRoom;
      let best = Infinity;
      spec.rooms.forEach((room) => {
        const dx = npc.position[0] - room.center[0];
        const dz = npc.position[2] - room.center[2];
        const dist = dx * dx + dz * dz;
        if (dist < best) {
          best = dist;
          nearestRoom = room;
        }
      });
      const seed = spec.seed + index * 31;
      let randOffset = 0;
      const rand = () => seededRandom(seed + randOffset++);
      const hotspots = roomHotspots.get(nearestRoom.id) ?? [];
      const pickHotspot = () => hotspots[Math.floor(rand() * hotspots.length)];
      const hotspot = hotspots.length > 0 ? pickHotspot() : null;
      const halfW = nearestRoom.size[0] / 2 - 1.2;
      const halfD = nearestRoom.size[2] / 2 - 1.2;
      const offsetX = (rand() - 0.5) * halfW * 1.4;
      const offsetZ = (rand() - 0.5) * halfD * 1.4;
      return {
        id: npc.id,
        roomId: nearestRoom.id,
        position: new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2]),
        target: hotspot ? hotspot.position.clone() : new THREE.Vector3(nearestRoom.center[0] + offsetX, npc.position[1], nearestRoom.center[2] + offsetZ),
        speed: 0.35 + seededRandom(seed + 7) * 0.25,
        wait: seededRandom(seed + 13) * 1.5,
        action: hotspot ? hotspot.action : 'stand'
      };
    });
  }, [spec, entryRoom, spec.rooms, roomHotspots]);

  useFrame((state, delta) => {
    let walkChanged = false;
    const nextWalkState: Record<string, boolean> = { ...npcWalkState };
    npcStatesRef.current.forEach((npc) => {
      const room = roomMap.get(npc.roomId) ?? entryRoom;
      const group = npcGroupRefs.current.get(npc.id);
      if (npc.wait > 0) {
        npc.wait = Math.max(0, npc.wait - delta);
      } else {
        const dir = npc.target.clone().sub(npc.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.3) {
          let randOffset = 0;
          const rand = () => seededRandom(spec.seed + npc.id.length * 17 + randOffset++);
          const hotspots = roomHotspots.get(room.id) ?? [];
          const pickHotspot = () => hotspots[Math.floor(rand() * hotspots.length)];
          const hotspot = hotspots.length > 0 ? pickHotspot() : null;
          if (hotspot) {
            npc.target.copy(hotspot.position);
            npc.action = hotspot.action;
            npc.wait = npc.action === 'read' ? 2.2 + rand() * 2.2
              : npc.action === 'cook' ? 1.8 + rand() * 1.6
                : npc.action === 'sit' ? 1.4 + rand() * 1.4
                  : 0.8 + rand() * 1.2;
          } else {
            const halfW = room.size[0] / 2 - 1.1;
            const halfD = room.size[2] / 2 - 1.1;
            const side = Math.floor(rand() * 4);
            const wallOffset = (rand() - 0.5) * (side < 2 ? room.size[0] * 0.5 : room.size[2] * 0.5);
            if (side === 0) {
              npc.target.set(room.center[0] + wallOffset, npc.position.y, room.center[2] + halfD - 0.5);
            } else if (side === 1) {
              npc.target.set(room.center[0] + wallOffset, npc.position.y, room.center[2] - halfD + 0.5);
            } else if (side === 2) {
              npc.target.set(room.center[0] - halfW + 0.5, npc.position.y, room.center[2] + wallOffset);
            } else {
              npc.target.set(room.center[0] + halfW - 0.5, npc.position.y, room.center[2] + wallOffset);
            }
            npc.action = 'stand';
            npc.wait = 0.6 + rand() * 1.8;
          }
        } else {
          dir.normalize();
          npc.position.add(dir.multiplyScalar(npc.speed * delta));
        }
      }
      const halfW = room.size[0] / 2 - 0.7;
      const halfD = room.size[2] / 2 - 0.7;
      npc.position.x = THREE.MathUtils.clamp(npc.position.x, room.center[0] - halfW, room.center[0] + halfW);
      npc.position.z = THREE.MathUtils.clamp(npc.position.z, room.center[2] - halfD, room.center[2] + halfD);
      if (group) {
        group.position.copy(npc.position);
        const heading = npc.target.clone().sub(npc.position);
        if (heading.lengthSq() > 0.01) {
          group.rotation.y = Math.atan2(heading.x, heading.z);
        }
      }
      const moving = npc.wait <= 0.05 && npc.target.distanceToSquared(npc.position) > 0.15;
      const prevWalk = npcWalkRef.current.get(npc.id) ?? true;
      if (moving !== prevWalk) {
        npcWalkRef.current.set(npc.id, moving);
        nextWalkState[npc.id] = moving;
        walkChanged = true;
      }
    });
    if (walkChanged) {
      setNpcWalkState(nextWalkState);
    }
    if (playerRef.current) {
      const playerPos = playerRef.current.position;
      doorVolumes.forEach((door) => {
        const dx = playerPos.x - door.position.x;
        const dz = playerPos.z - door.position.z;
        const lateral = door.side === 'north' || door.side === 'south' ? Math.abs(dx) : Math.abs(dz);
        const depth = door.side === 'north' || door.side === 'south' ? Math.abs(dz) : Math.abs(dx);
        if (lateral < door.width && depth < 0.5) {
          playerPos.add(door.normal.clone().multiplyScalar(0.06));
        }
      });
    }
  });
  const wallPalette = useMemo(() => {
    const base = spec.socialClass === SocialClass.NOBILITY
      ? ['#d4c5a3', '#c9b693', '#d0bf9f', '#c2ad8a', '#d8c9a9', '#cdb693', '#d9c7a8', '#c6b08b']
      : spec.socialClass === SocialClass.MERCHANT
        ? ['#c8b18f', '#bfa98a', '#c4ae8c', '#b8a07d', '#ccb495', '#bca483', '#c2ad8b', '#b79f7e']
        : spec.socialClass === SocialClass.CLERGY
          ? ['#b7a68b', '#bcae93', '#ae9f85', '#c2b396', '#b2a28a', '#a99a82', '#b5a58b', '#a7947c']
          : ['#b39b7e', '#a98f72', '#9c846a', '#b0977a', '#a38b6f', '#9a8267', '#b09a80', '#a58f73'];
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
      if (spec.socialClass === SocialClass.NOBILITY) {
        const tex = createTileTexture(color, '#6d5a45');
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.8 });
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
      if (spec.buildingType === BuildingType.COMMERCIAL) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
      }
      if (spec.socialClass === SocialClass.PEASANT) {
        const tex = createNoiseTexture(color, '#7b664e');
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.95 });
      }
      const tex = createPlasterTexture(color, '#a99474');
      return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.9 });
    });
  }, [wallPalette, spec.socialClass, spec.buildingType]);
  const patchMaterial = useMemo(() => {
    const accent = '#8f7a5c';
    const tex = createPatchTexture('#ffffff', accent);
    return new THREE.MeshStandardMaterial({
      map: tex ?? undefined,
      color: accent,
      transparent: true,
      opacity: 0.45,
      roughness: 0.95,
      depthWrite: false,
    });
  }, []);
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
      { base: '#6b4f2c', accent: '#e0c08a', pattern: 'stripe' as const },
      { base: '#5e5a3a', accent: '#d6b98f', pattern: 'diamond' as const },
      { base: '#6a3d2f', accent: '#e2b779', pattern: 'stripe' as const },
      { base: '#4f3a5e', accent: '#d2b58f', pattern: 'diamond' as const },
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
      <ambientLight intensity={isDay ? 0.5 : 0.75} color={isDay ? "#e6d7c2" : "#f0ddc2"} />
      <hemisphereLight intensity={isDay ? 0.35 : 0.5} color={isDay ? "#f1e2cf" : "#f3e0c4"} groundColor="#6b5a49" />
      <directionalLight position={[entryRoom.center[0] + 2, 4.2, entryRoom.center[2] - 1]} intensity={isDay ? 0.2 : 0.12} color="#f4d9b2" />
      {!isDay && (
        <FlickerLight position={[entryRoom.center[0], 2.4, entryRoom.center[2]]} intensity={0.8} color="#f0c07d" distance={18} decay={2} flicker={0.08} />
      )}
      <ImpactPuffs puffsRef={impactPuffsRef} />
      {lampProps.map((prop) => {
        const baseY = prop.type === InteriorPropType.CANDLE ? 0.7
          : prop.type === InteriorPropType.FLOOR_LAMP ? 1.6
            : prop.type === InteriorPropType.BRAZIER ? 1.2
              : prop.type === InteriorPropType.FIRE_PIT ? 1.3
                : 1.1;
        const intensity = prop.type === InteriorPropType.CANDLE ? 0.35
          : prop.type === InteriorPropType.FLOOR_LAMP ? 0.7
            : prop.type === InteriorPropType.BRAZIER ? 0.9
              : prop.type === InteriorPropType.FIRE_PIT ? 1.1
                : 0.6;
        const distance = prop.type === InteriorPropType.FIRE_PIT ? 18
          : prop.type === InteriorPropType.BRAZIER ? 15
            : prop.type === InteriorPropType.FLOOR_LAMP ? 14
              : prop.type === InteriorPropType.CANDLE ? 8
                : 12;
        return (
          <FlickerLight
            key={`lamp-light-${prop.id}`}
            position={[prop.position[0], baseY, prop.position[2]]}
            intensity={intensity}
            color="#f0c07d"
            distance={distance}
            decay={2}
            flicker={prop.type === InteriorPropType.CANDLE ? 0.18 : 0.12}
          />
        );
      })}
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
        const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
        const interiorDoorSide = interiorDoorMap.get(room.id) ?? null;
        const exteriorDoorSide = room.type === InteriorRoomType.ENTRY ? entrySide : null;
        const cutawaySide = spec.buildingType === BuildingType.CIVIC || spec.buildingType === BuildingType.RELIGIOUS ? null : 'south';
        const variantSeed = seededRandom(styleSeed + index * 19);
        const doorVariant = spec.buildingType === BuildingType.RELIGIOUS
          ? 1
          : spec.buildingType === BuildingType.CIVIC
            ? 2
            : Math.floor(variantSeed * 3);
        const targetRoom = doorTargetMap.get(room.id);
        const doorLabel = room.type === InteriorRoomType.ENTRY
          ? 'Exit — ESC'
          : targetRoom
            ? `To ${roomLabel(targetRoom)}`
            : null;
        const windowSide = windowMap.get(room.id) ?? 'north';
        const alcoveSides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west']
          .filter((side) => side !== interiorDoorSide && side !== windowSide);
        const alcoveSide = alcoveSides.length
          ? alcoveSides[Math.floor(seededRandom(styleSeed + index * 29) * alcoveSides.length)]
          : null;
        const windowInset = 0.22;
        const glassInset = 0.32;
        const windowOffset = windowSide === 'north'
          ? [0, 1.6, room.size[2] / 2 - windowInset]
          : windowSide === 'south'
            ? [0, 1.6, -room.size[2] / 2 + windowInset]
            : windowSide === 'east'
              ? [room.size[0] / 2 - windowInset, 1.6, 0]
              : [-room.size[0] / 2 + windowInset, 1.6, 0];
        const glassOffset = windowSide === 'north'
          ? [0, 1.6, room.size[2] / 2 - glassInset]
          : windowSide === 'south'
            ? [0, 1.6, -room.size[2] / 2 + glassInset]
            : windowSide === 'east'
              ? [room.size[0] / 2 - glassInset, 1.6, 0]
              : [-room.size[0] / 2 + glassInset, 1.6, 0];
        const stainedSeed = seededRandom(styleSeed + index * 47);
        const stainedColors = ['#8fb6e6', '#c8a2d6', '#d6b56b', '#9ec7a8'];
        const stainedGlass = spec.buildingType === BuildingType.RELIGIOUS && stainedSeed > 0.55;
        const stainedColor = stainedColors[Math.floor(stainedSeed * stainedColors.length)] ?? '#8fb6e6';
        const roomGlow = !isDay
          ? (spec.socialClass === SocialClass.PEASANT ? 0.12 : 0.2)
          : 0;
        return (
          <group key={room.id}>
            <InteriorRoomMesh
              room={room}
              floorMaterial={floorMaterial}
              wallMaterial={wallMaterial}
              wallColor={wallColor}
              patchMaterial={patchMaterial}
              socialClass={spec.socialClass}
              buildingType={spec.buildingType}
              wallHeight={wallHeight}
              interiorDoorSide={interiorDoorSide}
              exteriorDoorSide={exteriorDoorSide}
              cutawaySide={cutawaySide}
              doorVariant={doorVariant}
              alcoveSide={alcoveSide}
              doorLabel={doorLabel}
              roomSeed={styleSeed + index * 31}
            />
            <group position={[room.center[0], 0, room.center[2]]}>
              {!isDay && roomGlow > 0 && (
                <pointLight
                  position={[0, 1.6, 0]}
                  intensity={roomGlow}
                  color="#f0d5b2"
                  distance={Math.max(room.size[0], room.size[2]) * 1.1}
                  decay={2}
                />
              )}
              <mesh position={windowOffset as [number, number, number]} rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]} receiveShadow renderOrder={1}>
                <planeGeometry args={[1.4, 1.2]} />
                <meshStandardMaterial color={stainedGlass ? '#5a3f2c' : '#7a5b42'} roughness={0.85} />
              </mesh>
              <mesh position={glassOffset as [number, number, number]} rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]} renderOrder={2}>
                <planeGeometry args={[1.2, 1.0]} />
                <meshStandardMaterial
                  color={stainedGlass ? stainedColor : '#c9b089'}
                  emissive={stainedGlass ? stainedColor : '#c9b089'}
                  emissiveIntensity={isDay ? (stainedGlass ? 0.65 : 0.45) : 0.1}
                  transparent
                  opacity={isDay ? (stainedGlass ? 0.6 : 0.55) : 0.15}
                  depthWrite={false}
                />
              </mesh>
              {stainedGlass && (
                <group position={[glassOffset[0], glassOffset[1], glassOffset[2] + (windowSide === 'north' ? 0.02 : windowSide === 'south' ? -0.02 : 0)]} rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
                  {[ -0.35, 0, 0.35 ].map((x, idx) => (
                    <mesh key={`glass-bar-v-${idx}`} position={[x, 0, 0]} receiveShadow>
                      <boxGeometry args={[0.05, 0.9, 0.04]} />
                      <meshStandardMaterial color="#6a4a32" roughness={0.85} />
                    </mesh>
                  ))}
                  {[ -0.3, 0.3 ].map((y, idx) => (
                    <mesh key={`glass-bar-h-${idx}`} position={[0, y, 0]} receiveShadow>
                      <boxGeometry args={[1.0, 0.04, 0.04]} />
                      <meshStandardMaterial color="#6a4a32" roughness={0.85} />
                    </mesh>
                  ))}
                </group>
              )}
              {/* Removed oversized light planes; dust beam handles visible light. */}
              {isDay && (
                <pointLight
                  position={[windowOffset[0], 2.2, windowOffset[2] + (windowSide === 'north' ? -0.8 : windowSide === 'south' ? 0.8 : 0)]}
                  intensity={0.85}
                  color="#c8d8f2"
                  distance={18}
                  decay={2}
                />
              )}
              {isDay && (
                <DustBeam
                  position={[
                    windowOffset[0],
                    0.6,
                    windowOffset[2] + (windowSide === 'north' ? -0.7 : windowSide === 'south' ? 0.7 : 0)
                  ]}
                  rotation={windowSide === 'east' || windowSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}
                  width={2.2}
                  height={2.6}
                />
              )}
            </group>
          </group>
        );
      })}

      {activeProps.map((prop, index) => {
        const pushable = pushables.find((item) => item.sourceId === prop.id);
        const roomForProp = spec.rooms.find((room) => room.id === prop.roomId);
        const rugMat = rugMaterials[Math.floor(seededRandom(styleSeed + index * 13) * rugMaterials.length)];
        const prayerMat = prayerRugMaterials[Math.floor(seededRandom(styleSeed + index * 17) * prayerRugMaterials.length)];
        return (
        <InteriorPropWithLabel
          key={prop.id}
          prop={prop}
          rugMaterial={rugMat}
          prayerRugMaterial={prayerMat}
          profession={spec.profession}
          positionVector={pushable?.position}
          roomSize={roomForProp?.size}
        />
      );
      })}

      {spec.npcs.map((npc) => (
        <group
          key={npc.id}
          ref={(node) => {
            if (node) {
              npcGroupRefs.current.set(npc.id, node);
            } else {
              npcGroupRefs.current.delete(npc.id);
            }
          }}
          position={npc.position as [number, number, number]}
          rotation={npc.rotation as [number, number, number]}
        >
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
            enableArmSwing
            isWalking={npcWalkState[npc.id] ?? true}
            isDead={false}
          />
        </group>
      ))}

      <Player
        ref={playerRef}
        cameraMode={params.cameraMode}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
        buildings={[]}
        obstacles={obstacles}
        initialPosition={playerSpawn}
        pushablesRef={pushablesRef}
        onImpactPuff={handleImpactPuff}
        onPickupPrompt={onPickupPrompt}
        onPickup={handlePickup}
      />
    </group>
  );
};
