
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { CameraMode, BuildingMetadata, PlayerStats, Obstacle } from '../types';
import { Humanoid } from './Humanoid';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from '../utils/spatial';
import { PushableObject } from '../utils/pushables';

const PLAYER_SPEED = 6;
const RUN_SPEED = 11;
const CAMERA_SENSITIVITY = 1.5;
const JUMP_FORCE = 8;
const GRAVITY = -24;
const OVERHEAD_ZOOM_SPEED = 1.2;
const OVERHEAD_ROTATE_SPEED = 1.5;
const OVERHEAD_POLAR_ANGLE = 0.3;
const MARKER_COLOR = '#fbbf24';

interface PlayerProps {
  initialPosition?: [number, number, number];
  targetPosition?: THREE.Vector3 | null;
  setTargetPosition: (v: THREE.Vector3 | null) => void;
  cameraMode: CameraMode;
  buildings?: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  obstacles?: Obstacle[];
  timeOfDay?: number;
  playerStats?: PlayerStats;
  agentHashRef?: React.MutableRefObject<SpatialHash<AgentSnapshot> | null>;
  onAgentImpact?: (id: string, intensity: number) => void;
  pushablesRef?: React.MutableRefObject<PushableObject[]>;
  onImpactPuff?: (position: THREE.Vector3, intensity: number) => void;
}

export const Player = forwardRef<THREE.Group, PlayerProps>(({ 
  initialPosition = [0, 0, 0], 
  cameraMode,
  buildings = [],
  buildingHash = null,
  obstacles = [],
  timeOfDay = 12,
  playerStats,
  agentHashRef,
  onAgentImpact,
  pushablesRef,
  onImpactPuff
}, ref) => {
  const group = useRef<THREE.Group>(null);
  const orbitRef = useRef<any>(null);
  const pointerRef = useRef<any>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const markerGlowRef = useRef<THREE.Mesh>(null);
  const markerGlowMap = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.55);
    grad.addColorStop(0, 'rgba(255, 190, 80, 0)');
    grad.addColorStop(0.4, 'rgba(255, 190, 80, 0.15)');
    grad.addColorStop(0.7, 'rgba(255, 190, 80, 0.35)');
    grad.addColorStop(1, 'rgba(255, 190, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);
  const lastPlayerPos = useRef(new THREE.Vector3());
  const fpYaw = useRef(0);
  const fpPitch = useRef(0);
  const { camera } = useThree();
  const [isWalking, setIsWalking] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const walkingRef = useRef(false);
  const sprintingRef = useRef(false);
  const jumpPhaseRef = useRef(0);
  const isJumpingRef = useRef(false);
  const lastGroundedRef = useRef(true);
  const footstepTimerRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const jumpChargeRef = useRef(0);
  const chargingRef = useRef(false);
  const npcImpactCooldownRef = useRef<Map<string, number>>(new Map());
  const objectSoundCooldownRef = useRef(0);
  const objectImpactCooldownRef = useRef<Map<string, number>>(new Map());
  const jumpAnticipationRef = useRef(0);
  const landingImpulseRef = useRef(0);
  const lastJumpChargeRef = useRef(0);
  
  // Physics states
  const velV = useRef(0);
  const isGrounded = useRef(true);
  const coyoteTimer = useRef(0);
  const jumpBuffer = useRef(0);
  const jumpTimer = useRef(0);
  const sprintCharge = useRef(0);
  const landingDamp = useRef(0);
  const lastSpace = useRef(false);

  useImperativeHandle(ref, () => group.current!, []);

  const [keys, setKeys] = useState({ 
    up: false, down: false, left: false, right: false, 
    w: false, a: false, s: false, d: false,
    shift: false, space: false
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!audioCtxRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          audioCtxRef.current = new AudioCtor();
          const ctx = audioCtxRef.current;
          const length = ctx.sampleRate * 0.2;
          const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
          }
          noiseBufferRef.current = buffer;
        }
      }
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

  const playFootstep = (variant: 'walk' | 'run') => {
    const ctx = audioCtxRef.current;
    const buffer = noiseBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = variant === 'run' ? 520 : 420;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = variant === 'run' ? 0.22 : 0.16;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  };

  const playJump = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 180;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.12);
  };

  const playLand = () => {
    const ctx = audioCtxRef.current;
    const buffer = noiseBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  };

  const playObjectImpact = (material: PushableObject['material'], intensity: number) => {
    const ctx = audioCtxRef.current;
    const buffer = noiseBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    if (material === 'ceramic') {
      filter.frequency.value = 680 + intensity * 220;
      filter.Q.value = 1.1;
    } else if (material === 'wood') {
      filter.frequency.value = 320 + intensity * 140;
      filter.Q.value = 0.8;
    } else if (material === 'cloth') {
      filter.frequency.value = 220 + intensity * 80;
      filter.Q.value = 0.5;
    } else {
      filter.frequency.value = 420 + intensity * 160;
      filter.Q.value = 0.9;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0.1 + intensity * 0.14;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  };

  const playNpcBump = (intensity: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 160 + intensity * 90;
    gain.gain.value = 0.08 + intensity * 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.stop(ctx.currentTime + 0.09);
  };

  const applyJump = (charge = 0) => {
    const boost = charge * 4;
    velV.current = JUMP_FORCE + boost;
    isGrounded.current = false;
    jumpTimer.current = 0;
    jumpBuffer.current = 0;
    lastJumpChargeRef.current = charge;
    playJump();
  };

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
      fpYaw.current += (keys.a ? CAMERA_SENSITIVITY * delta : 0);
      fpYaw.current -= (keys.d ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current += (keys.w ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current -= (keys.s ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current = THREE.MathUtils.clamp(fpPitch.current, -1.2, 1.2);
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

    // 2. Jumping Physics + buffers
    const spacePressed = keys.space && !lastSpace.current;
    const spaceReleased = !keys.space && lastSpace.current;
    lastSpace.current = keys.space;
    if (spacePressed) {
      jumpBuffer.current = 0.12;
      if (isGrounded.current) {
        chargingRef.current = true;
        jumpChargeRef.current = 0;
        jumpAnticipationRef.current = 1;
      }
    }

    if (isGrounded.current) {
      coyoteTimer.current = 0;
    } else {
      coyoteTimer.current += delta;
    }
    if (jumpBuffer.current > 0) {
      jumpBuffer.current -= delta;
    }

    if (chargingRef.current && keys.space && isGrounded.current) {
      jumpChargeRef.current = Math.min(1, jumpChargeRef.current + delta * 0.9);
      jumpAnticipationRef.current = Math.min(1, jumpAnticipationRef.current + delta * 2);
    }
    if (spaceReleased && chargingRef.current && isGrounded.current) {
      applyJump(jumpChargeRef.current);
      jumpAnticipationRef.current = 0;
      if (jumpChargeRef.current > 0.35) {
        onImpactPuff?.(group.current.position, 0.25 + jumpChargeRef.current * 0.25);
      }
      chargingRef.current = false;
    }

    const canJump = !chargingRef.current && (isGrounded.current || coyoteTimer.current < 0.12) && jumpBuffer.current > 0;
    if (canJump) {
      applyJump(sprintCharge.current);
    }

    if (!isGrounded.current) {
      velV.current += GRAVITY * delta;
      group.current.position.y += velV.current * delta;
      if (group.current.position.y <= 0) {
        group.current.position.y = 0;
        velV.current = 0;
        isGrounded.current = true;
        landingDamp.current = 0.2;
        chargingRef.current = false;
        landingImpulseRef.current = 1;
      }
    }
    if (isGrounded.current && !lastGroundedRef.current) {
      playLand();
      onImpactPuff?.(group.current.position, 0.7);
    }
    lastGroundedRef.current = isGrounded.current;
    if (landingDamp.current > 0) {
      landingDamp.current = Math.max(0, landingDamp.current - delta);
    }
    if (jumpAnticipationRef.current > 0 && (!chargingRef.current || !isGrounded.current)) {
      jumpAnticipationRef.current = Math.max(0, jumpAnticipationRef.current - delta * 3);
    }
    if (landingImpulseRef.current > 0) {
      landingImpulseRef.current = Math.max(0, landingImpulseRef.current - delta * 3);
    }
    if (!isGrounded.current) {
      jumpTimer.current += delta;
    }
    isJumpingRef.current = !isGrounded.current;
    jumpPhaseRef.current = Math.min(1, jumpTimer.current / 0.6);

    // 2b. Pushable object drift/friction
    if (pushablesRef?.current) {
      const now = state.clock.elapsedTime;
      const items = pushablesRef.current;
      for (const item of items) {
        if (item.velocity.lengthSq() < 0.00001) continue;
        const speed = item.velocity.length();
        const next = item.position.clone().add(item.velocity.clone().multiplyScalar(delta));
        const blocked = isBlockedByBuildings(next, buildings, item.radius, buildingHash || undefined)
          || isBlockedByObstacles(next, obstacles, item.radius);
        if (!blocked) {
          item.position.copy(next);
        } else {
          item.velocity.multiplyScalar(-0.2);
          const last = objectImpactCooldownRef.current.get(item.id) || 0;
          if (now - last > 0.18 && speed > 0.45) {
            const intensity = Math.min(1, speed / 3);
            playObjectImpact(item.material, intensity);
            if (intensity > 0.4) {
              onImpactPuff?.(item.position, intensity);
            }
            objectImpactCooldownRef.current.set(item.id, now);
          }
        }
        const friction = 3.0 + item.mass * 0.4;
        item.velocity.multiplyScalar(Math.max(0, 1 - friction * delta));
        if (item.velocity.lengthSq() < 0.00002) {
          item.velocity.set(0, 0, 0);
        }
      }

      // Object-object collision resolve (cheap, small counts)
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          const offset = a.position.clone().sub(b.position);
          offset.y = 0;
          const distSq = offset.lengthSq();
          const limit = a.radius + b.radius;
          if (distSq > 0.0001 && distSq < limit * limit) {
            const dist = Math.sqrt(distSq);
            const normal = offset.multiplyScalar(1 / dist);
            const overlap = limit - dist;
            a.position.add(normal.clone().multiplyScalar(overlap * 0.5));
            b.position.add(normal.clone().multiplyScalar(-overlap * 0.5));
            const relVel = a.velocity.clone().sub(b.velocity);
            const relAlong = relVel.dot(normal);
            if (relAlong < 0) {
              const restitution = 0.2;
              const impulse = (-(1 + restitution) * relAlong) / (1 / a.mass + 1 / b.mass);
              const impulseVec = normal.clone().multiplyScalar(impulse);
              a.velocity.add(impulseVec.clone().multiplyScalar(1 / a.mass));
              b.velocity.sub(impulseVec.clone().multiplyScalar(1 / b.mass));
              const intensity = Math.min(1, Math.abs(relAlong) * 0.6);
              if (intensity > 0.35) {
                const lastA = objectImpactCooldownRef.current.get(a.id) || 0;
                const lastB = objectImpactCooldownRef.current.get(b.id) || 0;
                if (now - Math.max(lastA, lastB) > 0.2) {
                  playObjectImpact(a.material, intensity);
                  onImpactPuff?.(a.position, intensity);
                  objectImpactCooldownRef.current.set(a.id, now);
                  objectImpactCooldownRef.current.set(b.id, now);
                }
              }
            }
          }
        }
      }
    }

    // 3. Movement Logic (Arrow Keys)
    let moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3();
    if (cameraMode === CameraMode.FIRST_PERSON) {
      camera.getWorldDirection(forward);
    } else {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    if (keys.up) moveVec.add(forward);
    if (keys.down) moveVec.sub(forward);
    if (keys.right) moveVec.add(right);
    if (keys.left) moveVec.sub(right);
    if (cameraMode === CameraMode.FIRST_PERSON) {
      // WASD controls look in first person; movement uses arrow keys.
    }

    const moving = moveVec.lengthSq() > 0.01;
    if (walkingRef.current !== moving) {
      walkingRef.current = moving;
      setIsWalking(moving);
    }
    const sprinting = moving && keys.shift;
    if (sprintingRef.current !== sprinting) {
      sprintingRef.current = sprinting;
      setIsSprinting(sprinting);
    }

    let currentSpeed = 0;
    if (moving) {
      moveVec.normalize();
      const airControl = isGrounded.current ? 1 : 0.6;
      const damp = landingDamp.current > 0 ? 0.7 : 1.0;
      currentSpeed = (keys.shift ? RUN_SPEED : PLAYER_SPEED) * airControl * damp;
      const moveDelta = moveVec.multiplyScalar(currentSpeed * delta);
      const nextX = group.current.position.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
      if (!isBlockedByBuildings(nextX, buildings, 0.6, buildingHash || undefined) && !isBlockedByObstacles(nextX, obstacles, 0.6)) {
        group.current.position.x = nextX.x;
      }
      const nextZ = group.current.position.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
      if (!isBlockedByBuildings(nextZ, buildings, 0.6, buildingHash || undefined) && !isBlockedByObstacles(nextZ, obstacles, 0.6)) {
        group.current.position.z = nextZ.z;
      }
      
      if (cameraMode !== CameraMode.FIRST_PERSON) {
        const targetRot = Math.atan2(moveVec.x, moveVec.z);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot, 0.1);
      }
    }

    if (moving && keys.shift && isGrounded.current) {
      sprintCharge.current = Math.min(1, sprintCharge.current + delta * 0.6);
    } else {
      sprintCharge.current = Math.max(0, sprintCharge.current - delta * 0.8);
    }

    if (moving && isGrounded.current) {
      footstepTimerRef.current += delta;
      const cadence = keys.shift ? 0.18 : 0.32;
      if (footstepTimerRef.current >= cadence) {
        playFootstep(keys.shift ? 'run' : 'walk');
        footstepTimerRef.current = 0;
      }
    } else {
      footstepTimerRef.current = 0;
    }

    // 3c. NPC collision bump + impact pulse
    if (agentHashRef?.current) {
      const neighbors = queryNearbyAgents(group.current.position, agentHashRef.current);
      const playerRadius = 0.6;
      const npcRadius = 0.5;
      const limit = playerRadius + npcRadius;
      const effectiveSpeed = moving ? currentSpeed : 0.6;
      for (const neighbor of neighbors) {
        const offset = group.current.position.clone().sub(neighbor.pos);
        offset.y = 0;
        const distSq = offset.lengthSq();
        if (distSq > 0.0001 && distSq < limit * limit) {
          const dist = Math.sqrt(distSq);
          const normal = offset.multiplyScalar(1 / dist);
          const pushOut = (limit - dist) + 0.02;
          const bounce = 0.05 + effectiveSpeed * 0.02;
          group.current.position.add(normal.clone().multiplyScalar(pushOut + bounce));
          const now = state.clock.elapsedTime;
          const last = npcImpactCooldownRef.current.get(neighbor.id) || 0;
          if (now - last > 0.45) {
            npcImpactCooldownRef.current.set(neighbor.id, now);
            const intensity = Math.min(1, 0.35 + effectiveSpeed / RUN_SPEED);
            onAgentImpact?.(neighbor.id, intensity);
            playNpcBump(intensity);
          }
        }
      }
    }

    // 3d. Pushable object shove
    if (pushablesRef?.current && moving && currentSpeed > 0.01) {
      const playerPos = group.current.position.clone();
      const playerRadius = 0.6;
      for (const item of pushablesRef.current) {
        const offset = item.position.clone().sub(playerPos);
        offset.y = 0;
        const distSq = offset.lengthSq();
        const limit = playerRadius + item.radius;
        if (distSq > 0.0001 && distSq < limit * limit) {
          const dist = Math.sqrt(distSq);
          const normal = offset.multiplyScalar(1 / dist);
          const overlap = limit - dist;
          const shove = Math.min(1.2, (currentSpeed / RUN_SPEED) * 1.4);
          const impulse = normal.clone().multiplyScalar(shove / Math.max(0.5, item.mass));
          item.velocity.add(impulse);
          const next = item.position.clone().add(impulse.clone().multiplyScalar(0.2));
          const blocked = isBlockedByBuildings(next, buildings, item.radius, buildingHash || undefined)
            || isBlockedByObstacles(next, obstacles, item.radius);
          if (!blocked) {
            item.position.copy(next);
          } else {
            item.velocity.multiplyScalar(0.1);
          }
          group.current.position.add(normal.clone().multiplyScalar(-overlap * 0.35));
          const now = state.clock.elapsedTime;
          const intensity = Math.min(1, shove);
          if (now - objectSoundCooldownRef.current > 0.12) {
            playObjectImpact(item.material, intensity);
            objectSoundCooldownRef.current = now;
          }
          if (intensity > 0.5) {
            onImpactPuff?.(item.position, intensity);
          }
        }
      }
    }

    // 4. Camera Positioning
    if (cameraMode === CameraMode.FIRST_PERSON) {
      camera.position.set(group.current.position.x, 1.7 + group.current.position.y, group.current.position.z);
      camera.rotation.set(fpPitch.current, fpYaw.current, 0);
      group.current.rotation.y = fpYaw.current;
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

    // 5. Marker positioning
    if (markerRef.current) {
      // Keep marker on ground while jumping
      markerRef.current.position.y = -group.current.position.y + 0.05;
      if (markerGlowRef.current) {
        markerGlowRef.current.position.y = -group.current.position.y + 0.02;
      }
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
        <PointerLockControls ref={pointerRef} makeDefault />
      )}
      <group ref={group} position={initialPosition}>
        {cameraMode !== CameraMode.FIRST_PERSON && (
          <Humanoid
            color={playerStats?.robeBaseColor || (playerStats?.gender === 'Female' ? playerStats.robeColor : '#2a3b55')}
            headColor={playerStats?.skinTone}
            turbanColor={playerStats?.headwearColor || playerStats?.hairColor || '#ffffff'}
            headscarfColor={playerStats?.headscarfColor}
            gender={playerStats?.gender}
            hairColor={playerStats?.hairColor}
            scale={playerStats ? [playerStats.weight, playerStats.height, playerStats.weight] : undefined}
            enableArmSwing
            armSwingMode={(timeOfDay >= 19 || timeOfDay < 5) ? 'left' : 'both'}
            robeAccentColor={playerStats?.robeAccentColor}
            robeHasSash={playerStats?.robeHasSash}
            robeSleeves={playerStats?.robeSleeves}
            robeHasTrim={playerStats?.robeHasTrim ?? true}
            robeHemBand={playerStats?.robeHemBand}
            robeSpread={playerStats?.robeSpread}
            robeOverwrap={playerStats?.robeOverwrap}
            robePattern={playerStats?.robePattern}
            hairStyle={playerStats?.hairStyle}
            headwearStyle={playerStats?.headwearStyle}
            sleeveCoverage={playerStats?.sleeveCoverage}
            footwearStyle={playerStats?.footwearStyle}
            footwearColor={playerStats?.footwearColor}
            accessories={playerStats?.accessories}
            isWalking={isWalking}
            isSprinting={isSprinting}
            isJumpingRef={isJumpingRef}
            jumpPhaseRef={jumpPhaseRef}
            jumpAnticipationRef={jumpAnticipationRef}
            landingImpulseRef={landingImpulseRef}
            jumpChargeRef={lastJumpChargeRef}
            animationBoost={1.35}
            distanceFromCamera={0}
            showGroundShadow={false}
          />
        )}
        
        {/* Player Torch */}
        {(cameraMode !== CameraMode.FIRST_PERSON) && (timeOfDay >= 19 || timeOfDay < 5) && (
          <group position={[0.35, 1.05, 0.25]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.04, 0.06, 0.4, 8]} />
              <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9} />
            </mesh>
            <pointLight intensity={1.1} distance={16} decay={2} color="#ffb347" />
          </group>
        )}

        {/* Glowing Marker */}
        <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <circleGeometry args={[1.0, 32]} />
          <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.12} />
        </mesh>
        <mesh ref={markerGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial
            map={markerGlowMap ?? undefined}
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
});
