import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { InteriorSpec, InteriorProp, InteriorPropType, InteriorRoom, SimulationParams, PlayerStats, Obstacle, SocialClass } from '../types';
import { seededRandom } from '../utils/procedural';
import { Player } from './Player';
import { Humanoid } from './Humanoid';
import { generateInteriorObstacles } from '../utils/interior';

interface InteriorSceneProps {
  spec: InteriorSpec;
  params: SimulationParams;
  playerStats: PlayerStats;
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
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const createNoiseTexture = (base: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
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
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
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
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

const InteriorPropMesh: React.FC<{ prop: InteriorProp; rugMaterial: THREE.MeshStandardMaterial; prayerRugMaterial: THREE.MeshStandardMaterial }> = ({ prop, rugMaterial, prayerRugMaterial }) => {
  const common = { position: prop.position as [number, number, number], rotation: prop.rotation as [number, number, number] };
  switch (prop.type) {
    case InteriorPropType.FLOOR_MAT:
      return (
        <mesh {...common} position={[prop.position[0], 0.02, prop.position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2, 1.4]} />
          <meshStandardMaterial color="#9a845e" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.RUG:
      return (
        <mesh {...common} position={[prop.position[0], 0.02, prop.position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.2, 3.0]} />
          <primitive object={rugMaterial} />
        </mesh>
      );
    case InteriorPropType.PRAYER_RUG:
      return (
        <mesh {...common} position={[prop.position[0], 0.02, prop.position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.0, 1.4]} />
          <primitive object={prayerRugMaterial} />
        </mesh>
      );
    case InteriorPropType.LOW_TABLE:
      return (
        <group {...common}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[0.6, 0.7, 0.2, 10]} />
            <meshStandardMaterial color="#6b4d33" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.1, 8]} />
            <meshStandardMaterial color="#4a3322" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.BENCH:
      return (
        <mesh {...common} position={[prop.position[0], 0.2, prop.position[2]]} receiveShadow>
          <boxGeometry args={[1.6, 0.2, 0.5]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.BEDROLL:
      return (
        <mesh {...common} position={[prop.position[0], 0.15, prop.position[2]]} receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.3, 10]} />
          <meshStandardMaterial color="#6c5a4a" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.CHEST:
      return (
        <mesh {...common} position={[prop.position[0], 0.35, prop.position[2]]} receiveShadow>
          <boxGeometry args={[0.8, 0.5, 0.5]} />
          <meshStandardMaterial color="#5c3f2a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.SHELF:
      return (
        <mesh {...common} position={[prop.position[0], 0.6, prop.position[2]]} receiveShadow>
          <boxGeometry args={[1.0, 1.2, 0.3]} />
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
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.8} />
          </mesh>
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
        <mesh {...common} position={[prop.position[0], 0.8, prop.position[2]]} receiveShadow>
          <boxGeometry args={[1.4, 1.6, 0.08]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.LOOM:
      return (
        <mesh {...common} position={[prop.position[0], 0.6, prop.position[2]]} receiveShadow>
          <boxGeometry args={[1.4, 1.2, 0.6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.WATER_BASIN:
      return (
        <mesh {...common} position={[prop.position[0], 0.2, prop.position[2]]} receiveShadow>
          <cylinderGeometry args={[0.6, 0.7, 0.3, 12]} />
          <meshStandardMaterial color="#7b5a4a" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.EWER:
      return (
        <group {...common}>
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.4, 8]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
          <mesh position={[0.18, 0.35, 0]} receiveShadow>
            <boxGeometry args={[0.08, 0.12, 0.05]} />
            <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
          </mesh>
        </group>
      );
    case InteriorPropType.CUSHION:
      return (
        <mesh {...common} position={[prop.position[0], 0.1, prop.position[2]]} receiveShadow>
          <boxGeometry args={[0.6, 0.2, 0.6]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.DESK:
      return (
        <mesh {...common} position={[prop.position[0], 0.4, prop.position[2]]} receiveShadow>
          <boxGeometry args={[1.2, 0.3, 0.6]} />
          <meshStandardMaterial color="#6a4a32" roughness={0.9} />
        </mesh>
      );
    case InteriorPropType.BOOKS:
      return (
        <mesh {...common} position={[prop.position[0], 0.5, prop.position[2]]} receiveShadow>
          <boxGeometry args={[0.5, 0.12, 0.3]} />
          <meshStandardMaterial color="#5c3b2a" roughness={0.85} />
        </mesh>
      );
    case InteriorPropType.CHAIR:
      return (
        <group {...common}>
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, -0.2]} receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.08]} />
            <meshStandardMaterial color="#6a4a32" roughness={0.9} />
          </mesh>
        </group>
      );
    case InteriorPropType.WALL_HANGING:
      return (
        <mesh {...common} position={[prop.position[0], 1.6, prop.position[2]]} receiveShadow>
          <planeGeometry args={[1.6, 1.0]} />
          <meshStandardMaterial color="#7a3f3f" roughness={0.8} />
        </mesh>
      );
    case InteriorPropType.INK_SET:
      return (
        <mesh {...common} position={[prop.position[0], 0.5, prop.position[2]]} receiveShadow>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
          <meshStandardMaterial color="#3d2a1a" roughness={0.8} />
        </mesh>
      );
    case InteriorPropType.CRATE:
      return (
        <mesh {...common} position={[prop.position[0], 0.35, prop.position[2]]} receiveShadow>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
        </mesh>
      );
    default:
      return null;
  }
};

const InteriorRoomMesh: React.FC<{
  room: InteriorRoom;
  floorMaterial: THREE.MeshStandardMaterial;
  wallMaterial: THREE.MeshStandardMaterial;
  socialClass: SocialClass;
  interiorDoorSide?: 'north' | 'south' | 'east' | 'west' | null;
}> = ({ room, floorMaterial, wallMaterial, socialClass, interiorDoorSide }) => {
  const [w, , d] = room.size;
  const wallThickness = 0.2;
  const wallHeight = 3.2;
  const hasDoor = room.type === 'ENTRY';
  const doorWidth = 2.2;
  const doorHeight = 2.4;
  const canCutNorth = interiorDoorSide === 'north' && !hasDoor;
  return (
    <group position={[room.center[0], 0, room.center[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <primitive object={floorMaterial} />
      </mesh>
      {interiorDoorSide !== 'south' && (
        <mesh position={[0, wallHeight / 2, -d / 2]} receiveShadow>
          <boxGeometry args={[w, wallHeight, wallThickness]} />
          <primitive object={wallMaterial} />
        </mesh>
      )}
      {interiorDoorSide === 'south' && (
        <>
          <mesh position={[0, wallHeight - doorHeight / 2, -d / 2]} receiveShadow>
            <boxGeometry args={[doorWidth, wallHeight - doorHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[-(w - doorWidth) / 4, wallHeight / 2, -d / 2]} receiveShadow>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[(w - doorWidth) / 4, wallHeight / 2, -d / 2]} receiveShadow>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
        </>
      )}
      {canCutNorth ? (
        <>
          <mesh position={[0, wallHeight - doorHeight / 2, d / 2]} receiveShadow>
            <boxGeometry args={[doorWidth, wallHeight - doorHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[-(w - doorWidth) / 4, wallHeight / 2, d / 2]} receiveShadow>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[(w - doorWidth) / 4, wallHeight / 2, d / 2]} receiveShadow>
            <boxGeometry args={[(w - doorWidth) / 2, wallHeight, wallThickness]} />
            <primitive object={wallMaterial} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, wallHeight / 2, d / 2]} receiveShadow>
          <boxGeometry args={[w, wallHeight, wallThickness]} />
          <primitive object={wallMaterial} />
        </mesh>
      )}
      {interiorDoorSide !== 'west' && (
        <mesh position={[-w / 2, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[wallThickness, wallHeight, d]} />
          <primitive object={wallMaterial} />
        </mesh>
      )}
      {interiorDoorSide === 'west' && (
        <>
          <mesh position={[-w / 2, wallHeight - doorHeight / 2, 0]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[-w / 2, wallHeight / 2, -(d - doorWidth) / 4]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[-w / 2, wallHeight / 2, (d - doorWidth) / 4]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
            <primitive object={wallMaterial} />
          </mesh>
        </>
      )}
      {interiorDoorSide !== 'east' && (
        <mesh position={[w / 2, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[wallThickness, wallHeight, d]} />
          <primitive object={wallMaterial} />
        </mesh>
      )}
      {interiorDoorSide === 'east' && (
        <>
          <mesh position={[w / 2, wallHeight - doorHeight / 2, 0]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[w / 2, wallHeight / 2, -(d - doorWidth) / 4]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
            <primitive object={wallMaterial} />
          </mesh>
          <mesh position={[w / 2, wallHeight / 2, (d - doorWidth) / 4]} receiveShadow>
            <boxGeometry args={[wallThickness, wallHeight, (d - doorWidth) / 2]} />
            <primitive object={wallMaterial} />
          </mesh>
        </>
      )}
      {hasDoor && (
        <group position={[0, 1.1, d / 2 - 0.12]}>
          <mesh receiveShadow>
            <boxGeometry args={[2.2, 2.3, 0.12]} />
            <meshStandardMaterial color="#4a3b2b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.05, 0.08]} receiveShadow>
            <boxGeometry args={[2.4, 2.5, 0.08]} />
            <meshStandardMaterial color="#7a5b42" roughness={0.9} />
          </mesh>
        </group>
      )}
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
    </group>
  );
};

export const InteriorScene: React.FC<InteriorSceneProps> = ({ spec, params, playerStats }) => {
  const { scene, gl } = useThree();
  const previousBackground = useRef<THREE.Color | THREE.Texture | null>(null);
  const previousFog = useRef<THREE.Fog | null>(null);
  const previousExposure = useRef<number | null>(null);
  const obstacles = useMemo<Obstacle[]>(() => generateInteriorObstacles(spec), [spec]);
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
      return new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    });
  }, [wallPalette, spec.socialClass]);
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
      <ambientLight intensity={0.55} color="#d6c9b3" />
      <hemisphereLight intensity={0.45} color="#e6d8c0" groundColor="#6a5847" />
      {!isDay && (
        <pointLight position={[entryRoom.center[0], 2.4, entryRoom.center[2]]} intensity={0.9} color="#f0c07d" distance={20} decay={2} />
      )}
      {lampProps.map((prop) => (
        <pointLight
          key={`lamp-light-${prop.id}`}
          position={[prop.position[0], 1.8, prop.position[2]]}
          intensity={0.75}
          color="#f0c07d"
          distance={16}
          decay={2}
        />
      ))}
      {isDay && (
        <>
          <directionalLight position={[entryRoom.center[0] + 6, 4.2, entryRoom.center[2] + 3]} intensity={0.6} color="#e2edff" />
          <mesh position={[entryRoom.center[0], 1.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.12]}>
            <planeGeometry args={[1.4, 1.1]} />
            <meshStandardMaterial color="#b3c5e6" emissive="#b3c5e6" emissiveIntensity={0.55} transparent opacity={0.6} />
          </mesh>
          <pointLight position={[entryRoom.center[0], 2.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.8]} intensity={0.7} color="#c8d8f2" distance={18} decay={2} />
        </>
      )}

      {spec.rooms.map((room, index) => {
        const wallMaterial = wallMaterials[Math.floor(seededRandom(styleSeed + index * 7) * wallMaterials.length)];
        const floorMaterial = floorMaterials[Math.floor(seededRandom(styleSeed + index * 11) * floorMaterials.length)];
        const interiorDoorSide = interiorDoorMap.get(room.id) ?? null;
        return (
          <InteriorRoomMesh
            key={room.id}
            room={room}
            floorMaterial={floorMaterial}
            wallMaterial={wallMaterial}
            socialClass={spec.socialClass}
            interiorDoorSide={interiorDoorSide}
          />
        );
      })}

      {spec.props.map((prop, index) => {
        const rugMat = rugMaterials[Math.floor(seededRandom(styleSeed + index * 13) * rugMaterials.length)];
        const prayerMat = prayerRugMaterials[Math.floor(seededRandom(styleSeed + index * 17) * prayerRugMaterials.length)];
        return (
          <InteriorPropMesh
            key={prop.id}
            prop={prop}
            rugMaterial={rugMat}
            prayerRugMaterial={prayerMat}
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
      />
    </group>
  );
};
