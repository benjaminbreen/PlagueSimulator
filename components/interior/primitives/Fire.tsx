import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const FirePit: React.FC<{ position: [number, number, number] }> = ({ position }) => {
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

export const FireSmoke: React.FC<{ position: [number, number, number] }> = ({ position }) => {
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
