import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PushableGravestone } from './environment/decorations/PushableGravestone';
import type { PushableObject } from '../utils/pushables';

interface GravestonePreview3DProps {
  epitaph: {
    name: string;
    age: number;
    title?: string;
    inscription?: string;
  };
  graveShape?: 'rectangular' | 'arch' | 'peaked' | 'platform';
  graveType?: 'flat' | 'raised' | 'double_marker';
  graveScale?: number;
}

export const GravestonePreview3D: React.FC<GravestonePreview3DProps> = ({
  epitaph,
  graveShape = 'arch',
  graveType = 'flat',
  graveScale = 1.0
}) => {
  // Create a mock PushableObject for the gravestone
  const mockGravestone: PushableObject = {
    id: 'preview-gravestone',
    kind: 'gravestone',
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: 0,
    mass: 50,
    graveShape,
    graveType,
    graveScale,
    graveEpitaph: epitaph,
    tippedRotation: 0,
    isTipped: false,
    wobbleAngle: 0
  };

  return (
    <div className="h-full w-full rounded-2xl border border-amber-900/30 bg-gradient-to-br from-stone-950/90 via-stone-900/70 to-stone-950/90">
      <Canvas camera={{ position: [2.5, 1.8, 2.5], fov: 40 }}>
        {/* Ambient lighting - soft overall illumination */}
        <ambientLight intensity={0.4} color="#e8d5b7" />

        {/* Main directional light - simulates sun/moonlight */}
        <directionalLight
          position={[4, 6, 3]}
          intensity={1.2}
          color="#f5e6d3"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Fill light - softens shadows */}
        <directionalLight
          position={[-3, 2, -2]}
          intensity={0.3}
          color="#9aa5b1"
        />

        {/* Warm accent light - gives depth */}
        <pointLight
          position={[1, 1, 2]}
          intensity={0.6}
          color="#f8d8a3"
        />

        {/* Ground plane to receive shadows */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.05, 0]}
          receiveShadow
        >
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial
            color="#6b5d4f"
            roughness={0.95}
            metalness={0}
          />
        </mesh>

        {/* The gravestone itself */}
        <group position={[0, 0, 0]}>
          <PushableGravestone item={mockGravestone} />
        </group>

        {/* OrbitControls for rotation and zoom */}
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={6}
          maxPolarAngle={Math.PI / 2} // Prevent going below ground
          autoRotate
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
};
