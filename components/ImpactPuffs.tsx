import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface ImpactPuff {
  position: THREE.Vector3;
  start: number;
  intensity: number;
  jitter: [number, number];
  duration: number;
}

export type ImpactPuffSlot = ImpactPuff | null;

export const MAX_PUFFS = 16;

export const ImpactPuffs: React.FC<{ puffsRef: React.MutableRefObject<ImpactPuffSlot[]> }> = ({ puffsRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();
  const glowTexture = useMemo(() => {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(150, 125, 100, 0.45)';
    for (let i = 0; i < 170; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 1.2 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(150, 125, 100, 0.28)';
    for (let i = 0; i < 110; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 0.9 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const now = performance.now();
    const slots = puffsRef.current;
    for (let i = 0; i < MAX_PUFFS; i += 1) {
      const puff = slots[i] ?? null;
      if (!puff) {
        tempObj.position.set(0, -9999, 0);
        tempObj.scale.setScalar(0);
        tempObj.quaternion.copy(camera.quaternion);
        tempObj.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObj.matrix);
        continue;
      }
      const age = (now - puff.start) / 1000;
      if (age > puff.duration) {
        tempObj.position.set(0, -9999, 0);
        tempObj.scale.setScalar(0);
        tempObj.quaternion.copy(camera.quaternion);
        tempObj.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObj.matrix);
        continue;
      }
      const life = Math.min(1, age / puff.duration);
      const baseScale = 0.28 + life * 1.2;
      const intensityScale = 0.5 + puff.intensity * 0.5;
      const scale = baseScale * intensityScale;
      const swirl = Math.sin(life * Math.PI * 2);
      const driftX = puff.jitter[0] + swirl * 0.06;
      const driftZ = puff.jitter[1] + Math.cos(life * Math.PI * 2) * 0.06;
      tempObj.position.set(
        puff.position.x + driftX,
        puff.position.y + 0.16 + life * 0.7,
        puff.position.z + driftZ
      );
      tempObj.scale.set(scale, scale, scale);
      tempObj.quaternion.copy(camera.quaternion);
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PUFFS]} renderOrder={3}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={glowTexture ?? undefined}
        color="#c7b093"
        transparent
        opacity={0.38}
        blending={THREE.NormalBlending}
        depthWrite={false}
        depthTest={false}
      />
    </instancedMesh>
  );
};
