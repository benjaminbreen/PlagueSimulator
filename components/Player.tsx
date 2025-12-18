
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { CameraMode } from '../types';
import { Humanoid } from './Humanoid';

const PLAYER_SPEED = 6;
const RUN_SPEED = 11;
const CAMERA_SENSITIVITY = 1.5;
const JUMP_FORCE = 8;
const GRAVITY = -24;
const OVERHEAD_ZOOM_SPEED = 1.2;
const OVERHEAD_ROTATE_SPEED = 1.5;
const OVERHEAD_POLAR_ANGLE = 0.3;

interface PlayerProps {
  initialPosition?: [number, number, number];
  targetPosition?: THREE.Vector3 | null;
  setTargetPosition: (v: THREE.Vector3 | null) => void;
  cameraMode: CameraMode;
}

export const Player = forwardRef<THREE.Group, PlayerProps>(({ 
  initialPosition = [0, 0, 0], 
  cameraMode
}, ref) => {
  const group = useRef<THREE.Group>(null);
  const orbitRef = useRef<any>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const lastPlayerPos = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const [isWalking, setIsWalking] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  
  // Physics states
  const velV = useRef(0);
  const isGrounded = useRef(true);

  useImperativeHandle(ref, () => group.current!, []);

  const [keys, setKeys] = useState({ 
    up: false, down: false, left: false, right: false, 
    w: false, a: false, s: false, d: false,
    shift: false, space: false
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup') setKeys(prev => ({ ...prev, up: true }));
      if (k === 'arrowdown') setKeys(prev => ({ ...prev, down: true }));
      if (k === 'arrowleft') setKeys(prev => ({ ...prev, left: true }));
      if (k === 'arrowright') setKeys(prev => ({ ...prev, right: true }));
      if (k === 'w') setKeys(prev => ({ ...prev, w: true }));
      if (k === 'a') setKeys(prev => ({ ...prev, a: true }));
      if (k === 's') setKeys(prev => ({ ...prev, s: true }));
      if (k === 'd') setKeys(prev => ({ ...prev, d: true }));
      if (k === 'shift') setKeys(prev => ({ ...prev, shift: true }));
      if (k === ' ') setKeys(prev => ({ ...prev, space: true }));
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup') setKeys(prev => ({ ...prev, up: false }));
      if (k === 'arrowdown') setKeys(prev => ({ ...prev, down: false }));
      if (k === 'arrowleft') setKeys(prev => ({ ...prev, left: false }));
      if (k === 'arrowright') setKeys(prev => ({ ...prev, right: false }));
      if (k === 'w') setKeys(prev => ({ ...prev, w: false }));
      if (k === 'a') setKeys(prev => ({ ...prev, a: false }));
      if (k === 's') setKeys(prev => ({ ...prev, s: false }));
      if (k === 'd') setKeys(prev => ({ ...prev, d: false }));
      if (k === 'shift') setKeys(prev => ({ ...prev, shift: false }));
      if (k === ' ') setKeys(prev => ({ ...prev, space: false }));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (!orbitRef.current || !group.current) return;
    if (cameraMode === CameraMode.OVERHEAD) {
      lastPlayerPos.current.copy(group.current.position);
      orbitRef.current.target.copy(group.current.position);
      orbitRef.current.update();
    }
  }, [cameraMode]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // 1. Camera Adjustment Logic (WASD)
    if (cameraMode === CameraMode.FIRST_PERSON) {
      if (keys.a) group.current.rotation.y += CAMERA_SENSITIVITY * delta;
      if (keys.d) group.current.rotation.y -= CAMERA_SENSITIVITY * delta;
    } else if (cameraMode === CameraMode.OVERHEAD && orbitRef.current) {
      const angle = OVERHEAD_ROTATE_SPEED * delta;
      if (keys.a) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() + angle);
      if (keys.d) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - angle);

      if (keys.w || keys.s) {
        const target = orbitRef.current.target.clone();
        const offset = camera.position.clone().sub(target);
        const distance = offset.length();
        const zoomFactor = 1 + (keys.s ? OVERHEAD_ZOOM_SPEED : -OVERHEAD_ZOOM_SPEED) * delta;
        const clamped = THREE.MathUtils.clamp(
          distance * zoomFactor,
          orbitRef.current.minDistance,
          orbitRef.current.maxDistance
        );
        offset.normalize().multiplyScalar(clamped);
        camera.position.copy(target.clone().add(offset));
      }
    } else if (orbitRef.current) {
      const angle = CAMERA_SENSITIVITY * delta;
      if (keys.a) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() + angle);
      if (keys.d) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - angle);
      if (keys.w) orbitRef.current.setPolarAngle(Math.max(0.1, orbitRef.current.getPolarAngle() - angle));
      if (keys.s) orbitRef.current.setPolarAngle(Math.min(Math.PI / 2.1, orbitRef.current.getPolarAngle() + angle));
    }

    // 2. Jumping Physics
    if (keys.space && isGrounded.current) {
      velV.current = JUMP_FORCE;
      isGrounded.current = false;
    }

    if (!isGrounded.current) {
      velV.current += GRAVITY * delta;
      group.current.position.y += velV.current * delta;
      if (group.current.position.y <= 0) {
        group.current.position.y = 0;
        velV.current = 0;
        isGrounded.current = true;
      }
    }

    // 3. Movement Logic (Arrow Keys)
    let moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(group.current.quaternion);
    if (cameraMode !== CameraMode.FIRST_PERSON) {
        forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraMode === CameraMode.FIRST_PERSON ? group.current.quaternion : camera.quaternion);
    right.y = 0; right.normalize();

    if (keys.up) moveVec.add(forward);
    if (keys.down) moveVec.sub(forward);
    if (keys.right) moveVec.add(right);
    if (keys.left) moveVec.sub(right);

    const moving = moveVec.lengthSq() > 0.01;
    setIsWalking(moving);
    setIsSprinting(moving && keys.shift);

    if (moving) {
      moveVec.normalize();
      const speed = keys.shift ? RUN_SPEED : PLAYER_SPEED;
      group.current.position.add(moveVec.multiplyScalar(speed * delta));
      
      if (cameraMode !== CameraMode.FIRST_PERSON) {
        const targetRot = Math.atan2(moveVec.x, moveVec.z);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot, 0.1);
      }
    }

    // 4. Camera Positioning
    if (cameraMode === CameraMode.FIRST_PERSON) {
      camera.position.set(group.current.position.x, 1.75 + group.current.position.y, group.current.position.z);
      camera.rotation.y = group.current.rotation.y;
    } else if (cameraMode === CameraMode.OVERHEAD && orbitRef.current) {
      const playerPos = group.current.position;
      if (playerPos.distanceToSquared(lastPlayerPos.current) > 0.0001) {
        const offset = camera.position.clone().sub(orbitRef.current.target);
        orbitRef.current.target.copy(playerPos);
        camera.position.copy(playerPos.clone().add(offset));
        lastPlayerPos.current.copy(playerPos);
      }
      orbitRef.current.update();
    } else if (cameraMode === CameraMode.THIRD_PERSON && orbitRef.current) {
      orbitRef.current.target.lerp(group.current.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);
    }

    // 5. Marker Animation
    if (markerRef.current) {
      markerRef.current.rotation.z += delta * 0.5;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      markerRef.current.scale.set(pulse, pulse, 1);
      // Keep marker on ground while jumping
      markerRef.current.position.y = -group.current.position.y + 0.05;
    }
  });

  return (
    <>
      {cameraMode !== CameraMode.FIRST_PERSON ? (
        <OrbitControls 
          ref={orbitRef} 
          makeDefault 
          minDistance={cameraMode === CameraMode.OVERHEAD ? 10 : 5} 
          maxDistance={cameraMode === CameraMode.OVERHEAD ? 120 : 50} 
          minPolarAngle={cameraMode === CameraMode.OVERHEAD ? OVERHEAD_POLAR_ANGLE : 0.1}
          maxPolarAngle={cameraMode === CameraMode.OVERHEAD ? OVERHEAD_POLAR_ANGLE : Math.PI / 2.1}
          enablePan={cameraMode === CameraMode.OVERHEAD}
          enableRotate={cameraMode === CameraMode.THIRD_PERSON}
          screenSpacePanning={cameraMode === CameraMode.OVERHEAD}
          mouseButtons={cameraMode === CameraMode.OVERHEAD ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : undefined}
        />
      ) : (
        <PointerLockControls />
      )}
      <group ref={group} position={initialPosition}>
        <Humanoid 
          color="#2a3b55" 
          turbanColor="#ffffff" 
          isWalking={isWalking} 
          isSprinting={isSprinting}
        />
        
        {/* Glowing Marker */}
        <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <circleGeometry args={[1.0, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.1} />
        </mesh>
      </group>
    </>
  );
});
