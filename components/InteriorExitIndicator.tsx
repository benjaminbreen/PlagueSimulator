import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { getLocationLabel } from '../types';

type EntrySide = 'north' | 'south' | 'east' | 'west';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ENTRY_META: Record<EntrySide, { yaw: number }> = {
  north: { yaw: 0 },
  south: { yaw: Math.PI },
  east: { yaw: Math.PI / 2 },
  west: { yaw: -Math.PI / 2 }
};

export const InteriorExitIndicator: React.FC<{
  playerRef: React.RefObject<THREE.Group>;
  entrySide: EntrySide;
  entryRoom: { center: [number, number, number]; size: [number, number, number] };
  mapX: number;
  mapY: number;
}> = ({ playerRef, entrySide, entryRoom, mapX, mapY }) => {
  const groupRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const lastVisibleRef = useRef(false);
  const lastOpacityRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  const label = `Exit to ${getLocationLabel(mapX, mapY)}`;
  const warningDistance = 0.45;

  useFrame(() => {
    const player = playerRef.current;
    if (!player) return;
    const pos = player.position;

    if (groupRef.current) {
      groupRef.current.position.set(pos.x, pos.y + 2.4, pos.z);
    }

    const [cx, , cz] = entryRoom.center;
    const halfW = entryRoom.size[0] / 2;
    const halfD = entryRoom.size[2] / 2;
    const distToExit = entrySide === 'north'
      ? (cz + halfD - pos.z)
      : entrySide === 'south'
        ? (pos.z - (cz - halfD))
        : entrySide === 'east'
          ? (cx + halfW - pos.x)
          : (pos.x - (cx - halfW));

    const shouldShow = distToExit <= warningDistance && distToExit >= 0;
    if (shouldShow !== lastVisibleRef.current) {
      lastVisibleRef.current = shouldShow;
      setVisible(shouldShow);
    }
    if (!shouldShow) return;

    if (arrowRef.current) {
      arrowRef.current.rotation.y = ENTRY_META[entrySide].yaw;
    }

    const nextOpacity = clamp(1 - distToExit / warningDistance, 0, 1);
    if (Math.abs(nextOpacity - lastOpacityRef.current) > 0.02) {
      lastOpacityRef.current = nextOpacity;
      setOpacity(nextOpacity);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <group ref={arrowRef} position={[0, 0.25, 0]}>
        <mesh position={[0, 0.05, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 10]} />
          <meshStandardMaterial color="#f2c16b" emissive="#f5b75c" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0, 0.05, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.18, 0.32, 12]} />
          <meshStandardMaterial color="#ffd38a" emissive="#ffcc70" emissiveIntensity={0.8} />
        </mesh>
      </group>
      <Html transform={false} position={[0, 0.8, 0]} center>
        <div
          className="pointer-events-none select-none whitespace-nowrap rounded-full border border-amber-300/70 bg-black/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-amber-100 shadow-[0_0_18px_rgba(252,211,77,0.35)]"
          style={{ opacity }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
};
