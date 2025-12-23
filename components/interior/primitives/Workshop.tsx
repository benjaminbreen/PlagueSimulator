import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const Spindle: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
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

export const DyeVat: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
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

export const Anvil: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
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

export const ToolRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
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

export const Mortar: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
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

export const HerbRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
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
