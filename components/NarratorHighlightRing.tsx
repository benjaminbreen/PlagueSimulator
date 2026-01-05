import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NarratorHighlightRingProps {
  position: [number, number, number];
  startedAt: number;
  expiresAt: number;
  color?: string;
}

export const NarratorHighlightRing: React.FC<NarratorHighlightRingProps> = ({ position, startedAt, expiresAt, color = '#f2d27a' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const now = Date.now();
    const remaining = Math.max(0, expiresAt - now);
    const duration = Math.max(1, expiresAt - startedAt);
    const t = remaining / duration;
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 4) * 0.12;
    meshRef.current.scale.setScalar(pulse);
    materialRef.current.opacity = 0.15 + t * 0.55;
    if (remaining <= 0) {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.45, 0.7, 48]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent depthWrite={false} />
    </mesh>
  );
};
