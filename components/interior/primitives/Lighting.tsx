import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const Flame: React.FC<{ position: [number, number, number]; size: number; color: string; emissive: string }> = ({ position, size, color, emissive }) => {
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

const contactShadowMaterial = new THREE.MeshBasicMaterial({
  color: '#22180f',
  transparent: true,
  opacity: 0.32,
  depthWrite: false
});

export const ContactShadow: React.FC<{ size: [number, number]; y?: number }> = ({ size, y = 0.02 }) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[Math.max(size[0], size[1]) * 0.35, 18]} />
    <primitive object={contactShadowMaterial} />
  </mesh>
);

export const FlickerLight: React.FC<{ position: [number, number, number]; intensity: number; color: string; distance: number; decay: number; flicker?: number }> = ({ position, intensity, color, distance, decay, flicker = 0.12 }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!lightRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5 + position[0] * 2) * flicker;
    lightRef.current.intensity = intensity * pulse;
  });
  return <pointLight ref={lightRef} position={position} intensity={intensity} color={color} distance={distance} decay={decay} />;
};

export const DustBeam: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; width: number; height: number }> = ({ position, rotation, width, height }) => {
  const groupRef = useRef<THREE.Group>(null);
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
      <points geometry={geometry}>
        <pointsMaterial color="#ead9b8" size={0.03} transparent opacity={0.25} depthWrite={false} />
      </points>
    </group>
  );
};
