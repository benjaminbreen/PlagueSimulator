/**
 * Boulder Component
 * Rolling boulder with physics-based rotation
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PushableObject } from '../../../utils/pushables';

// ==================== BOULDER ====================

export const PushableBoulder: React.FC<{ item: PushableObject }> = ({ item }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Update position
    meshRef.current.position.copy(item.position);

    // Update rotation from angular velocity
    if (item.angularVelocity) {
      const angle = item.angularVelocity.length() * 0.016; // Assume 60fps
      if (angle > 0.001) {
        const axis = item.angularVelocity.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        meshRef.current.quaternion.multiply(quaternion);
      }
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <dodecahedronGeometry args={[item.radius / 0.7, 0]} />
      <meshStandardMaterial color="#6a6a5a" roughness={0.95} />
    </mesh>
  );
};
