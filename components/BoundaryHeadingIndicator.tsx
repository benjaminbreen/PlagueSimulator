import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, getDistrictType, getLocationLabel } from '../types';

type HeadingDirection = 'North' | 'South' | 'East' | 'West';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DIRECTION_META: Record<HeadingDirection, { dx: number; dy: number; yaw: number }> = {
  North: { dx: 0, dy: 1, yaw: 0 },
  South: { dx: 0, dy: -1, yaw: Math.PI },
  East: { dx: 1, dy: 0, yaw: -Math.PI / 2 },
  West: { dx: -1, dy: 0, yaw: Math.PI / 2 }
};

export const BoundaryHeadingIndicator: React.FC<{
  playerRef: React.RefObject<THREE.Group>;
  mapX: number;
  mapY: number;
}> = ({ playerRef, mapX, mapY }) => {
  const groupRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const lastLabelRef = useRef('');
  const lastVisibleRef = useRef(false);
  const lastYawRef = useRef(0);
  const lastOpacityRef = useRef(0);

  const [label, setLabel] = useState('');
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  const district = useMemo(() => getDistrictType(mapX, mapY), [mapX, mapY]);
  const boundary = district === 'SOUTHERN_ROAD' ? CONSTANTS.SOUTHERN_ROAD_BOUNDARY : CONSTANTS.TRANSITION_RADIUS;
  const warningDistance = 10;

  useFrame(() => {
    const player = playerRef.current;
    if (!player) return;
    const pos = player.position;

    if (groupRef.current) {
      groupRef.current.position.set(pos.x, pos.y + 2.4, pos.z);
    }

    const distToEdge = boundary - Math.max(Math.abs(pos.x), Math.abs(pos.z));
    const shouldShow = distToEdge <= warningDistance;
    if (shouldShow !== lastVisibleRef.current) {
      lastVisibleRef.current = shouldShow;
      setVisible(shouldShow);
    }
    if (!shouldShow) return;

    const eastDist = boundary - pos.x;
    const westDist = boundary + pos.x;
    const northDist = boundary - pos.z;
    const southDist = boundary + pos.z;

    let direction: HeadingDirection = 'North';
    let minDist = eastDist;
    direction = 'East';

    if (westDist < minDist) { minDist = westDist; direction = 'West'; }
    if (northDist < minDist) { minDist = northDist; direction = 'North'; }
    if (southDist < minDist) { minDist = southDist; direction = 'South'; }

    const meta = DIRECTION_META[direction];
    const nextMapX = mapX + meta.dx;
    const nextMapY = mapY + meta.dy;
    const nextLabel = `Heading ${direction} to ${getLocationLabel(nextMapX, nextMapY)}`;

    if (nextLabel !== lastLabelRef.current) {
      lastLabelRef.current = nextLabel;
      setLabel(nextLabel);
    }

    if (arrowRef.current && Math.abs(lastYawRef.current - meta.yaw) > 0.001) {
      lastYawRef.current = meta.yaw;
      arrowRef.current.rotation.y = meta.yaw;
    }

    const nextOpacity = clamp(1 - distToEdge / warningDistance, 0, 1);
    if (Math.abs(nextOpacity - lastOpacityRef.current) > 0.02) {
      lastOpacityRef.current = nextOpacity;
      setOpacity(nextOpacity);
    }
  });

  if (!visible || !label) return null;

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
