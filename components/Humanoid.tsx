
import React, { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HumanoidProps {
  color?: string;
  headColor?: string;
  turbanColor?: string;
  scale?: [number, number, number];
  isWalking?: boolean;
  isSprinting?: boolean;
  isDead?: boolean;
  walkSpeed?: number;
}

export const Humanoid: React.FC<HumanoidProps> = memo(({ 
  color = '#2a3b55', 
  headColor = '#e0ac69', 
  turbanColor = '#f0f0f0',
  scale = [1, 1, 1] as [number, number, number],
  isWalking = false,
  isSprinting = false,
  isDead = false,
  walkSpeed = 10
}) => {
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isDead) {
      if (bodyGroup.current) {
        bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, Math.PI / 2, 0.1);
        bodyGroup.current.position.y = THREE.MathUtils.lerp(bodyGroup.current.position.y, -0.85, 0.1);
      }
      return;
    }

    const effectiveWalkSpeed = isSprinting ? walkSpeed * 1.8 : walkSpeed;
    const t = state.clock.elapsedTime * effectiveWalkSpeed;
    const amp = isWalking ? (isSprinting ? 0.6 : 0.4) : 0.02;
    
    // Leg & Arm swinging
    if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t) * amp;
    if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t + Math.PI) * amp;
    if (leftArm.current) leftArm.current.rotation.x = Math.sin(t + Math.PI) * amp;
    if (rightArm.current) rightArm.current.rotation.x = Math.sin(t) * amp;
    
    if (bodyGroup.current) {
      // Bobbing
      bodyGroup.current.position.y = isWalking ? Math.abs(Math.sin(t * 2)) * (isSprinting ? 0.1 : 0.05) : 0;
      
      // Sprinting lean
      const targetRotationX = isSprinting ? 0.3 : 0;
      bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, targetRotationX, 0.1);
    }
  });

  return (
    <group scale={scale}>
      <group ref={bodyGroup}>
        {!isDead && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.5, 16]} />
            <meshBasicMaterial color="black" transparent opacity={0.3} />
          </mesh>
        )}

        {/* Torso */}
        <mesh ref={torso} position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 0.9, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        
        {/* Head */}
        <group position={[0, 1.75, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <torusGeometry args={[0.12, 0.08, 12, 16]} />
            <meshStandardMaterial color={turbanColor} />
          </mesh>
        </group>

        {/* Arms */}
        <mesh ref={leftArm} position={[-0.35, 1.4, 0]} castShadow>
          <boxGeometry args={[0.12, 0.6, 0.12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh ref={rightArm} position={[0.35, 1.4, 0]} castShadow>
          <boxGeometry args={[0.12, 0.6, 0.12]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Legs */}
        <mesh ref={leftLeg} position={[-0.15, 0.45, 0]} castShadow>
          <boxGeometry args={[0.15, 0.8, 0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh ref={rightLeg} position={[0.15, 0.45, 0]} castShadow>
          <boxGeometry args={[0.15, 0.8, 0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
});
