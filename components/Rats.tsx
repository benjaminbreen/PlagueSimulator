import React, { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationParams, CONSTANTS, AgentState } from '../types';
import { AgentSnapshot, SpatialHash } from '../utils/spatial';

// Speed constants by state
const SPEED_IDLE = 0;
const SPEED_WANDER = 2.5;
const SPEED_FLEE = 9.0;

// Threat detection ranges
const PLAYER_FLEE_RANGE = 4.0;
const CAT_FLEE_RANGE = 10.0;
const NPC_FLEE_RANGE = 3.0;
const SAFE_DISTANCE = 12.0;

// Minimum rats always present
const MIN_RATS = 3;
const MAX_RATS = 8; // PERFORMANCE: Reduced from 50 to 8

// Temp objects for instanced mesh updates
const tempBody = new THREE.Object3D();
const tempHead = new THREE.Object3D();
const tempTail = new THREE.Object3D();
const tempEarL = new THREE.Object3D();
const tempEarR = new THREE.Object3D();
const tempHeadOffset = new THREE.Vector3();
const tempTailOffset = new THREE.Vector3();
const tempEarOffsetL = new THREE.Vector3();
const tempEarOffsetR = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
// Temp vectors for rat AI calculations
const tempWanderDir = new THREE.Vector3();
const tempToCenter = new THREE.Vector3();

export type RatState = 'idle' | 'wander' | 'flee';

export class Rat {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetVelocity: THREE.Vector3;
  active: boolean;
  state: RatState;
  stateTimer: number;
  animPhase: number;
  size: number;
  fleeTarget: THREE.Vector3 | null;

  constructor(index: number) {
    // Spread rats around map edges (prefer cover)
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 25;
    this.position = new THREE.Vector3(
      Math.cos(angle) * radius,
      0.05,
      Math.sin(angle) * radius
    );
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetVelocity = new THREE.Vector3(0, 0, 0);
    this.active = true;
    this.state = Math.random() > 0.5 ? 'idle' : 'wander';
    this.stateTimer = 1 + Math.random() * 3;
    this.animPhase = Math.random() * Math.PI * 2;
    this.size = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
    this.fleeTarget = null;
  }

  update(
    dt: number,
    params: SimulationParams,
    playerPos?: THREE.Vector3,
    catPos?: THREE.Vector3,
    npcPositions?: THREE.Vector3[],
    corpsePositions?: THREE.Vector3[]
  ) {
    if (!this.active || dt <= 0) return;

    this.stateTimer -= dt;

    // Check for threats
    let threat: THREE.Vector3 | null = null;
    let threatDistance = Infinity;

    if (playerPos) {
      const playerDist = this.position.distanceTo(playerPos);
      if (playerDist < PLAYER_FLEE_RANGE) {
        threat = playerPos;
        threatDistance = playerDist;
      }
    }

    if (catPos) {
      const catDist = this.position.distanceTo(catPos);
      if (catDist < CAT_FLEE_RANGE && catDist < threatDistance) {
        threat = catPos;
        threatDistance = catDist;
      }
    }

    // Check for nearby NPCs
    if (npcPositions) {
      for (const npcPos of npcPositions) {
        const npcDist = this.position.distanceTo(npcPos);
        if (npcDist < NPC_FLEE_RANGE && npcDist < threatDistance) {
          threat = npcPos;
          threatDistance = npcDist;
        }
      }
    }

    // State transitions
    if (threat) {
      if (this.state !== 'flee') {
        this.state = 'flee';
        this.stateTimer = 2 + Math.random();
      }
      // Flee direction: away from threat
      const fleeDir = this.position.clone().sub(threat);
      fleeDir.y = 0;
      fleeDir.normalize();
      // Add some randomness to avoid predictable paths
      fleeDir.x += (Math.random() - 0.5) * 0.3;
      fleeDir.z += (Math.random() - 0.5) * 0.3;
      fleeDir.normalize();
      this.targetVelocity.copy(fleeDir).multiplyScalar(SPEED_FLEE);
    } else if (this.state === 'flee') {
      // Check if safe from all threats
      const playerSafe = !playerPos || this.position.distanceTo(playerPos) > SAFE_DISTANCE;
      const catSafe = !catPos || this.position.distanceTo(catPos) > SAFE_DISTANCE;
      let npcSafe = true;
      if (npcPositions) {
        for (const npcPos of npcPositions) {
          if (this.position.distanceTo(npcPos) < SAFE_DISTANCE * 0.5) {
            npcSafe = false;
            break;
          }
        }
      }
      if ((playerSafe && catSafe && npcSafe) || this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = 1 + Math.random() * 2;
        this.targetVelocity.set(0, 0, 0);
      }
    } else if (this.stateTimer <= 0) {
      // Cycle between idle and wander
      if (this.state === 'idle') {
        this.state = 'wander';
        this.stateTimer = 3 + Math.random() * 5;
        // PERFORMANCE: Reuse temp vectors instead of creating new ones
        tempToCenter.copy(this.position).normalize();
        tempWanderDir.set(
          Math.random() - 0.5,
          0,
          Math.random() - 0.5
        ).normalize();
        // Bias away from center
        tempWanderDir.add(tempToCenter.multiplyScalar(0.3)).normalize();
        this.targetVelocity.copy(tempWanderDir).multiplyScalar(SPEED_WANDER);
      } else {
        this.state = 'idle';
        this.stateTimer = 1 + Math.random() * 3;
        this.targetVelocity.set(0, 0, 0);
      }
    }

    // Corpse attraction - rats seek out corpses as food source
    // Only when wandering or idle (not fleeing)
    if ((this.state === 'wander' || this.state === 'idle') && corpsePositions && corpsePositions.length > 0) {
      let nearestCorpse: THREE.Vector3 | null = null;
      let nearestDist = 8.0; // Attraction range

      for (const corpsePos of corpsePositions) {
        const dist = this.position.distanceTo(corpsePos);
        if (dist < nearestDist) {
          nearestCorpse = corpsePos;
          nearestDist = dist;
        }
      }

      if (nearestCorpse && nearestDist > 0.5) { // Don't stack on corpse
        const dx = nearestCorpse.x - this.position.x;
        const dz = nearestCorpse.z - this.position.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          // Bias velocity toward corpse (subtle attraction)
          this.targetVelocity.x += (dx / len) * SPEED_WANDER * 0.4;
          this.targetVelocity.z += (dz / len) * SPEED_WANDER * 0.4;
        }
      }
    }

    // Smooth velocity interpolation
    const lerpFactor = this.state === 'flee' ? 8 : 4;
    this.velocity.lerp(this.targetVelocity, Math.min(1, lerpFactor * dt));

    // Boundary handling
    const boundary = CONSTANTS.MARKET_SIZE - 3;
    if (Math.abs(this.position.x) > boundary) {
      this.velocity.x *= -0.5;
      this.targetVelocity.x *= -0.5;
      this.position.x = Math.sign(this.position.x) * boundary;
    }
    if (Math.abs(this.position.z) > boundary) {
      this.velocity.z *= -0.5;
      this.targetVelocity.z *= -0.5;
      this.position.z = Math.sign(this.position.z) * boundary;
    }

    // Avoid center well
    if (this.position.length() < 5) {
      const pushOut = this.position.clone().normalize().multiplyScalar(0.5);
      this.velocity.add(pushOut);
    }

    // Apply movement
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.position.y = 0.05; // Keep on ground
  }
}

interface RatsProps {
  params: SimulationParams;
  playerPos?: THREE.Vector3;
  catPos?: THREE.Vector3;
  npcPositions?: THREE.Vector3[];
  ratsRef?: React.MutableRefObject<Rat[] | null>;
  agentHashRef?: React.MutableRefObject<SpatialHash<AgentSnapshot> | null>;
}

export const Rats = forwardRef<Rat[], RatsProps>(({ params, playerPos, catPos, npcPositions, ratsRef, agentHashRef }, ref) => {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const tailRef = useRef<THREE.InstancedMesh>(null);
  const earRef = useRef<THREE.InstancedMesh>(null);

  // PERFORMANCE: Throttle updates and cache NPC/corpse lists
  const npcCheckTimerRef = useRef(0);
  const corpseCheckTimerRef = useRef(0);
  const nearUpdateTimerRef = useRef(0);
  const farUpdateTimerRef = useRef(0);
  const cachedNpcPositions = useRef<THREE.Vector3[] | undefined>(undefined);
  const cachedCorpsePositions = useRef<THREE.Vector3[]>([]);

  const rats = useMemo(() => {
    const arr: Rat[] = [];
    for (let i = 0; i < MAX_RATS; i++) arr.push(new Rat(i));
    return arr;
  }, []);

  useImperativeHandle(ref, () => rats, [rats]);

  // Expose rat array to parent for plague exposure checks
  if (ratsRef) {
    ratsRef.current = rats;
  }

  // Rat color - dark brown/gray
  const ratColor = useMemo(() => new THREE.Color('#2a1f1a'), []);
  const ratColorDark = useMemo(() => new THREE.Color('#1a1210'), []);

  useFrame((state, delta) => {
    const baseDelta = Math.min(delta, 0.1);
    const scaledDelta = baseDelta * params.simulationSpeed;
    const NEAR_UPDATE_INTERVAL = 0.08; // ~12.5Hz
    const FAR_UPDATE_INTERVAL = 0.25;  // 4Hz
    const NPC_CHECK_INTERVAL = 0.1;    // 10Hz
    const CORPSE_CHECK_INTERVAL = 0.5; // 2Hz
    const FAR_DISTANCE = 18;
    const farDistanceSq = FAR_DISTANCE * FAR_DISTANCE;

    nearUpdateTimerRef.current += baseDelta;
    farUpdateTimerRef.current += baseDelta;
    npcCheckTimerRef.current += baseDelta;
    corpseCheckTimerRef.current += baseDelta;

    const shouldUpdateNear = nearUpdateTimerRef.current >= NEAR_UPDATE_INTERVAL;
    const shouldUpdateFar = farUpdateTimerRef.current >= FAR_UPDATE_INTERVAL;
    if (!shouldUpdateNear && !shouldUpdateFar) return;

    const nearDt = shouldUpdateNear ? nearUpdateTimerRef.current * params.simulationSpeed : 0;
    const farDt = shouldUpdateFar ? farUpdateTimerRef.current * params.simulationSpeed : 0;
    if (shouldUpdateNear) nearUpdateTimerRef.current = 0;
    if (shouldUpdateFar) farUpdateTimerRef.current = 0;

    if (npcCheckTimerRef.current >= NPC_CHECK_INTERVAL) {
      cachedNpcPositions.current = npcPositions;
      npcCheckTimerRef.current = 0;
    }

    // Calculate active rat count: minimum + hygiene bonus
    const hygieneBonus = params.hygieneLevel < 0.4
      ? Math.floor((MAX_RATS - MIN_RATS) * (0.4 - params.hygieneLevel) / 0.4)
      : 0;
    const activeCount = MIN_RATS + hygieneBonus;

    // Extract corpse positions for rat attraction (low frequency, no allocations)
    if (agentHashRef?.current && corpseCheckTimerRef.current >= CORPSE_CHECK_INTERVAL) {
      const corpses = cachedCorpsePositions.current;
      corpses.length = 0;
      agentHashRef.current.buckets.forEach(bucket => {
        for (const agent of bucket) {
          if (agent.state === AgentState.DECEASED) {
            corpses.push(agent.pos);
          }
        }
      });
      corpseCheckTimerRef.current = 0;
    }

    // Update rats with throttled NPC positions and corpse positions
    rats.forEach((rat, i) => {
      rat.active = i < activeCount;
      if (rat.active) {
        rat.animPhase += scaledDelta * 12;
        const isFar = playerPos ? rat.position.distanceToSquared(playerPos) > farDistanceSq : false;
        const updateDt = isFar ? farDt : nearDt;
        if (updateDt > 0) {
          rat.update(
            updateDt,
            params,
            playerPos,
            catPos,
            isFar ? undefined : cachedNpcPositions.current,
            isFar ? undefined : cachedCorpsePositions.current
          );
        }
      }
    });

    // Update instanced meshes - PERFORMANCE: Only 8 instances now (was 50)
    if (!bodyRef.current || !headRef.current || !tailRef.current || !earRef.current) return;

    rats.forEach((rat, i) => {
      if (rat.active) {
        const speed = rat.velocity.length();
        const isMoving = speed > 0.1;
        const bodyBob = isMoving ? Math.sin(rat.animPhase * 2) * 0.01 : 0;
        const tailWag = Math.sin(rat.animPhase) * (isMoving ? 0.4 : 0.15);
        const s = rat.size;

        // Calculate facing direction
        let angle = 0;
        if (rat.velocity.lengthSq() > 0.01) {
          angle = Math.atan2(rat.velocity.x, rat.velocity.z);
        }

        // Body - elongated ellipsoid
        tempBody.position.set(rat.position.x, rat.position.y + 0.06 * s + bodyBob, rat.position.z);
        tempBody.rotation.set(0, angle, 0);
        tempBody.scale.set(0.08 * s, 0.06 * s, 0.14 * s);
        tempBody.updateMatrix();
        bodyRef.current!.setMatrixAt(i, tempBody.matrix);

        // Head - smaller sphere at front
        const headOffset = tempHeadOffset.set(0, 0.02, 0.12 * s).applyAxisAngle(
          upAxis,
          angle
        );
        tempHead.position.set(
          rat.position.x + headOffset.x,
          rat.position.y + 0.07 * s + bodyBob,
          rat.position.z + headOffset.z
        );
        tempHead.rotation.set(0, angle, 0);
        tempHead.scale.set(0.05 * s, 0.045 * s, 0.055 * s);
        tempHead.updateMatrix();
        headRef.current!.setMatrixAt(i, tempHead.matrix);

        // Tail - thin cylinder at back, wagging
        const tailOffset = tempTailOffset.set(0, 0, -0.14 * s).applyAxisAngle(
          upAxis,
          angle
        );
        tempTail.position.set(
          rat.position.x + tailOffset.x,
          rat.position.y + 0.05 * s,
          rat.position.z + tailOffset.z
        );
        tempTail.rotation.set(0.3, angle + tailWag, 0);
        tempTail.scale.set(0.012 * s, 0.12 * s, 0.012 * s);
        tempTail.updateMatrix();
        tailRef.current!.setMatrixAt(i, tempTail.matrix);

        // Ears - two small spheres on head (combined into one instance, positioned twice)
        const earOffsetL = tempEarOffsetL.set(-0.025 * s, 0.035, 0.1 * s).applyAxisAngle(
          upAxis,
          angle
        );
        const earOffsetR = tempEarOffsetR.set(0.025 * s, 0.035, 0.1 * s).applyAxisAngle(
          upAxis,
          angle
        );
        // Use two indices for ears (i*2 and i*2+1)
        tempEarL.position.set(
          rat.position.x + earOffsetL.x,
          rat.position.y + 0.09 * s + bodyBob,
          rat.position.z + earOffsetL.z
        );
        tempEarL.scale.set(0.02 * s, 0.015 * s, 0.015 * s);
        tempEarL.updateMatrix();
        earRef.current!.setMatrixAt(i * 2, tempEarL.matrix);

        tempEarR.position.set(
          rat.position.x + earOffsetR.x,
          rat.position.y + 0.09 * s + bodyBob,
          rat.position.z + earOffsetR.z
        );
        tempEarR.scale.set(0.02 * s, 0.015 * s, 0.015 * s);
        tempEarR.updateMatrix();
        earRef.current!.setMatrixAt(i * 2 + 1, tempEarR.matrix);
      } else {
        // Hide inactive rats
        tempBody.scale.set(0, 0, 0);
        tempBody.updateMatrix();
        bodyRef.current!.setMatrixAt(i, tempBody.matrix);
        headRef.current!.setMatrixAt(i, tempBody.matrix);
        tailRef.current!.setMatrixAt(i, tempBody.matrix);
        earRef.current!.setMatrixAt(i * 2, tempBody.matrix);
        earRef.current!.setMatrixAt(i * 2 + 1, tempBody.matrix);
      }
    });

    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    tailRef.current.instanceMatrix.needsUpdate = true;
    earRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Body - PERFORMANCE: castShadow removed (rats too small for visible shadows) */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX_RATS]}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshStandardMaterial color={ratColor} roughness={0.95} />
      </instancedMesh>

      {/* Head - PERFORMANCE: castShadow removed */}
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX_RATS]}>
        <sphereGeometry args={[1, 5, 4]} />
        <meshStandardMaterial color={ratColor} roughness={0.95} />
      </instancedMesh>

      {/* Tail - PERFORMANCE: castShadow removed */}
      <instancedMesh ref={tailRef} args={[undefined, undefined, MAX_RATS]}>
        <cylinderGeometry args={[0.3, 1, 1, 4]} />
        <meshStandardMaterial color={ratColorDark} roughness={0.9} />
      </instancedMesh>

      {/* Ears (2 per rat) */}
      <instancedMesh ref={earRef} args={[undefined, undefined, MAX_RATS * 2]}>
        <sphereGeometry args={[1, 4, 3]} />
        <meshStandardMaterial color={ratColorDark} roughness={0.95} />
      </instancedMesh>
    </group>
  );
});
