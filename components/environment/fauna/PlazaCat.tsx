import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from '../shared/HoverSystem';

// Cat color variants
const CAT_VARIANTS = [
  { name: 'Brown Tabby', primary: '#6b5a4b', secondary: '#4a3d32', eyeColor: '#3d5c3d' },
  { name: 'Orange Tabby', primary: '#c4713b', secondary: '#8b4513', eyeColor: '#d4a017' },
  { name: 'Gray Tabby', primary: '#6e6e6e', secondary: '#4a4a4a', eyeColor: '#7db37d' },
  { name: 'Siamese', primary: '#e8dcc8', secondary: '#6b5344', eyeColor: '#4a90c2' },
  { name: 'Tortoiseshell', primary: '#5c4033', secondary: '#c4713b', eyeColor: '#d4a017' },
  { name: 'Black', primary: '#1a1a1a', secondary: '#0a0a0a', eyeColor: '#d4a017' },
  { name: 'White', primary: '#f0ebe0', secondary: '#d8d0c0', eyeColor: '#4a90c2' },
  { name: 'Ginger', primary: '#d4711a', secondary: '#a05010', eyeColor: '#3d5c3d' },
];

const CAT_HUNT_RANGE = 8.0;
const CAT_POUNCE_RANGE = 1.0;
const CAT_WALK_SPEED = 0.5;
const CAT_HUNT_SPEED = 1.2;
const CAT_FLEE_SPEED = 1.8;
const CAT_FLEE_RANGE = 3.0;
const CAT_SPRINT_STARTLE_RANGE = 3.5;
const CAT_COLLISION_RADIUS = 0.7;

export interface BallPhysics {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  lastBatTime: number;
}

interface PlazaCatProps {
  waypoints: [number, number, number][];
  seed?: number;
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
  isSprinting?: boolean;
  ballPhysics?: React.MutableRefObject<BallPhysics>;
}

export const PlazaCat: React.FC<PlazaCatProps> = ({ waypoints, seed = 0, catPositionRef, ratPositions, npcPositions, playerPosition, isSprinting, ballPhysics }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailSegments = useRef<THREE.Group[]>([]);
  const legRefs = useRef<{ upper: THREE.Group; lower: THREE.Group }[]>([]);
  const earRefs = useRef<THREE.Mesh[]>([]);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const state = useRef({
    targetIndex: 0,
    mode: 'sleep' as 'sleep' | 'walk' | 'idle' | 'hunt' | 'pounce' | 'flee' | 'jump' | 'stretch' | 'bat',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0,
    huntTarget: null as THREE.Vector3 | null,
    pounceTimer: 0,
    fleeTarget: null as THREE.Vector3 | null,
    headTrackTarget: null as THREE.Vector3 | null,
    jumpStart: null as THREE.Vector3 | null,
    jumpEnd: null as THREE.Vector3 | null,
    jumpProgress: 0,
    stretchProgress: 0,
    batProgress: 0,
    batDirection: new THREE.Vector3()
  });

  const catAppearance = useMemo(() => {
    const rng = (s: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return { val: s / 0x7fffffff, next: s }; };
    let s = seed + 54321;
    const r1 = rng(s); s = r1.next;
    const r2 = rng(s);
    const variant = CAT_VARIANTS[Math.floor(r1.val * CAT_VARIANTS.length)];
    const scale = (0.8 + r2.val * 0.5) * 1.69;
    return { variant, scale };
  }, [seed]);

  const furMaterial = useMemo(() => (
    <meshStandardMaterial color={catAppearance.variant.primary} roughness={0.95} />
  ), [catAppearance]);
  const darkFurMaterial = useMemo(() => (
    <meshStandardMaterial color={catAppearance.variant.secondary} roughness={0.95} />
  ), [catAppearance]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;
    state.current.breathCycle += delta;

    if (catPositionRef) {
      catPositionRef.current.copy(current);
    }

    const isPositionBlocked = (pos: THREE.Vector3): boolean => {
      const fountainDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (fountainDist < 4.6) return true;
      if (playerPosition) {
        const distToPlayer = pos.distanceTo(playerPosition);
        if (distToPlayer < CAT_COLLISION_RADIUS + 0.5) return true;
      }
      if (npcPositions) {
        for (const npcPos of npcPositions) {
          const distToNPC = pos.distanceTo(npcPos);
          if (distToNPC < CAT_COLLISION_RADIUS + 0.5) return true;
        }
      }
      return false;
    };

    let shouldFlee = false;
    let nearestThreat: THREE.Vector3 | null = null;
    let nearestThreatDist = Infinity;

    if (playerPosition && isSprinting) {
      const distToPlayer = current.distanceTo(playerPosition);
      if (distToPlayer < CAT_SPRINT_STARTLE_RANGE) {
        shouldFlee = true;
        nearestThreat = playerPosition.clone();
        nearestThreatDist = distToPlayer;
      }
    }

    if (npcPositions && npcPositions.length > 0) {
      for (const npcPos of npcPositions) {
        const dist = current.distanceTo(npcPos);
        if (dist < CAT_FLEE_RANGE && dist < nearestThreatDist) {
          shouldFlee = true;
          nearestThreat = npcPos.clone();
          nearestThreatDist = dist;
        }
      }
    }

    if (shouldFlee && nearestThreat) {
      let farthestWaypoint: THREE.Vector3 | null = null;
      let maxDist = 0;
      for (const wp of waypoints) {
        const wpVec = new THREE.Vector3(...wp);
        const distFromThreat = wpVec.distanceTo(nearestThreat);
        if (distFromThreat > maxDist) {
          maxDist = distFromThreat;
          farthestWaypoint = wpVec;
        }
      }

      if (farthestWaypoint && state.current.mode !== 'flee') {
        state.current.mode = 'flee';
        state.current.fleeTarget = farthestWaypoint;
        state.current.timer = 3;
      }
    } else if (state.current.mode === 'flee' && state.current.timer <= 0) {
      state.current.mode = 'idle';
      state.current.fleeTarget = null;
      state.current.timer = 2 + Math.random() * 3;
    }

    if (ratPositions && ratPositions.length > 0 && state.current.mode !== 'sleep' && state.current.mode !== 'pounce' && state.current.mode !== 'flee') {
      let nearestRat: THREE.Vector3 | null = null;
      let nearestDist = CAT_HUNT_RANGE;

      for (const ratPos of ratPositions) {
        const dist = current.distanceTo(ratPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestRat = ratPos.clone();
        }
      }

      if (nearestRat) {
        state.current.huntTarget = nearestRat;
        if (state.current.mode !== 'hunt') {
          state.current.mode = 'hunt';
        }
        if (nearestDist < CAT_POUNCE_RANGE) {
          state.current.mode = 'pounce';
          state.current.pounceTimer = 0.5;
        }
      } else if (state.current.mode === 'hunt') {
        state.current.mode = 'walk';
        state.current.huntTarget = null;
        state.current.timer = 3 + Math.random() * 4;
      }
    }

    if (ballPhysics && state.current.mode !== 'flee' && state.current.mode !== 'sleep' && state.current.mode !== 'bat' && state.current.mode !== 'pounce') {
      const ball = ballPhysics.current;
      const distToBall = current.distanceTo(ball.position);
      const timeSinceLastBat = state.current.breathCycle - ball.lastBatTime;

      if (distToBall < 5.0 && timeSinceLastBat > 8.0) {
        if (Math.random() < 0.3) {
          state.current.mode = 'bat';
          state.current.batProgress = 0;
          state.current.batDirection = ball.position.clone().sub(current).normalize();
          ball.lastBatTime = state.current.breathCycle;
        }
      }
    }

    const breathScale = 1 + Math.sin(state.current.breathCycle * 2) * 0.015;
    bodyRef.current.scale.setScalar(breathScale);

    const isTracking = state.current.headTrackTarget !== null;
    const earTwitchFreq = state.current.mode === 'hunt' ? 4 : (isTracking ? 5 : 8);
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const twitch = Math.sin(state.current.breathCycle * earTwitchFreq + i * Math.PI) > 0.9 ? 0.15 : 0;
        ear.rotation.z = (i === 0 ? 0.2 : -0.2) + twitch;
      }
    });

    const tailSpeed = state.current.mode === 'hunt' ? 6 : (state.current.mode === 'flee' ? 8 : 3);
    const tailIntensity = state.current.mode === 'flee' ? 0.15 : (state.current.mode === 'hunt' ? 0.4 : (state.current.mode === 'walk' ? 0.25 : 0.12));
    tailSegments.current.forEach((seg, i) => {
      if (seg) {
        const phase = state.current.breathCycle * tailSpeed - i * 0.4;
        if (state.current.mode === 'flee') {
          seg.rotation.z = 0.1 + Math.sin(phase) * tailIntensity;
          seg.rotation.y = 0;
        } else {
          seg.rotation.z = Math.sin(phase) * tailIntensity;
          seg.rotation.y = Math.cos(phase * 0.7) * tailIntensity * 0.4;
        }
      }
    });

    if (state.current.mode === 'bat' && ballPhysics) {
      state.current.batProgress += delta * 3;

      if (state.current.batProgress >= 1) {
        state.current.mode = 'idle';
        state.current.batProgress = 0;
        state.current.timer = 1 + Math.random() * 2;
        return;
      }

      const ball = ballPhysics.current;
      const t = state.current.batProgress;
      const phase = t < 0.3 ? 'aim' : (t < 0.6 ? 'swipe' : 'follow');

      if (phase === 'aim') {
        groupRef.current.lookAt(new THREE.Vector3(ball.position.x, current.y, ball.position.z));

        if (headRef.current) {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.10;
        }

        legRefs.current.forEach((leg, i) => {
          if (leg?.upper && leg?.lower) {
            const isFront = i < 2;
            if (isFront) {
              leg.upper.rotation.z = 0.3;
              leg.lower.rotation.z = 0.1;
            } else {
              leg.upper.rotation.z = 0.8;
              leg.lower.rotation.z = -1.0;
            }
          }
        });
      } else if (phase === 'swipe') {
        const swipeT = (t - 0.3) / 0.3;

        if (headRef.current) {
          headRef.current.position.y = 0.12;
        }

        if (legRefs.current[0]?.upper && legRefs.current[0]?.lower) {
          legRefs.current[0].upper.rotation.z = -0.4 - swipeT * 0.6;
          legRefs.current[0].lower.rotation.z = 0.2 + swipeT * 0.3;
        }

        if (t > 0.4 && t < 0.5) {
          const distToBall = current.distanceTo(ball.position);
          if (distToBall < 1.2) {
            const forceDir = state.current.batDirection.clone();
            const forceMag = 4.0 + Math.random() * 2.0;
            ball.velocity.set(
              forceDir.x * forceMag,
              1.5 + Math.random() * 1.0,
              forceDir.z * forceMag
            );
          }
        }
      } else {
        if (headRef.current) {
          const dir = ball.position.clone().sub(current);
          dir.y = 0;
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;
          headRef.current.rotation.y = targetHeadAngle;
          headRef.current.position.y = 0.14;
        }

        legRefs.current.forEach((leg, i) => {
          if (leg?.upper && leg?.lower) {
            const isFront = i < 2;
            leg.upper.rotation.z = isFront ? 0.1 : 0.6;
            leg.lower.rotation.z = isFront ? 0 : -0.8;
          }
        });
      }

      tailSegments.current.forEach((seg, i) => {
        if (seg) {
          const swishSpeed = 10;
          const phase = state.current.breathCycle * swishSpeed - i * 0.3;
          seg.rotation.z = Math.sin(phase) * 0.5;
          seg.rotation.y = Math.cos(phase * 0.8) * 0.3;
        }
      });

      return;
    }

    if (state.current.mode === 'pounce') {
      state.current.pounceTimer -= delta;
      if (headRef.current) {
        headRef.current.position.y = 0.08;
      }
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 0.6;
          leg.lower.rotation.z = -0.8;
        }
      });
      if (state.current.pounceTimer <= 0) {
        state.current.mode = 'idle';
        state.current.huntTarget = null;
        state.current.timer = 2 + Math.random() * 3;
      }
      return;
    }

    if (state.current.mode === 'sleep') {
      let trackTarget: THREE.Vector3 | null = null;
      const SLEEP_TRACK_RANGE = 4.0;

      if (ratPositions && ratPositions.length > 0) {
        for (const ratPos of ratPositions) {
          const dist = current.distanceTo(ratPos);
          if (dist < SLEEP_TRACK_RANGE) {
            trackTarget = ratPos;
            break;
          }
        }
      }

      if (headRef.current) {
        if (trackTarget) {
          const dir = trackTarget.clone().sub(current);
          dir.y = 0;
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;
          headRef.current.rotation.y = THREE.MathUtils.lerp(
            headRef.current.rotation.y,
            targetHeadAngle,
            0.02
          );
          state.current.headTrackTarget = trackTarget;
        } else {
          headRef.current.rotation.y = -0.3;
          state.current.headTrackTarget = null;
        }
        headRef.current.position.y = 0.08;
      }
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 0.8;
          leg.lower.rotation.z = -1.2;
        }
      });

      if (state.current.timer <= 0) {
        state.current.mode = 'stretch';
        state.current.stretchProgress = 0;
        state.current.timer = 1.2;
      }
      return;
    }

    if (state.current.mode === 'stretch') {
      state.current.stretchProgress += delta;

      if (state.current.stretchProgress >= 1.2) {
        state.current.mode = Math.random() > 0.3 ? 'walk' : 'idle';
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 6 + Math.random() * 6;
        state.current.stretchProgress = 0;
        return;
      }

      const t = state.current.stretchProgress;
      const stretchPhase = t < 0.4 ? 'extend' : (t < 0.8 ? 'arch' : 'release');

      if (headRef.current) {
        if (stretchPhase === 'extend') {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.06;
        } else if (stretchPhase === 'arch') {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.15;
        } else {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0.12;
        }
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;

          if (stretchPhase === 'extend') {
            if (isFront) {
              leg.upper.rotation.z = -0.4;
              leg.lower.rotation.z = 0.2;
            } else {
              leg.upper.rotation.z = 0.8;
              leg.lower.rotation.z = -1.2;
            }
          } else if (stretchPhase === 'arch') {
            if (isFront) {
              leg.upper.rotation.z = -0.2;
              leg.lower.rotation.z = 0.1;
            } else {
              leg.upper.rotation.z = 0.2;
              leg.lower.rotation.z = -0.3;
            }
          } else {
            leg.upper.rotation.z = isFront ? 0.1 : 0.6;
            leg.lower.rotation.z = isFront ? 0 : -0.8;
          }
        }
      });

      tailSegments.current.forEach((seg, i) => {
        if (seg) {
          if (stretchPhase === 'arch') {
            seg.rotation.z = 0.3 - i * 0.05;
            seg.rotation.y = 0;
          }
        }
      });

      return;
    }

    if (state.current.mode === 'idle') {
      let trackTarget: THREE.Vector3 | null = null;
      const TRACK_RANGE = 6.0;

      if (ratPositions && ratPositions.length > 0) {
        for (const ratPos of ratPositions) {
          const dist = current.distanceTo(ratPos);
          if (dist < TRACK_RANGE) {
            trackTarget = ratPos;
            break;
          }
        }
      }

      if (!trackTarget && npcPositions && npcPositions.length > 0) {
        for (const npcPos of npcPositions) {
          const dist = current.distanceTo(npcPos);
          if (dist < TRACK_RANGE) {
            trackTarget = npcPos;
            break;
          }
        }
      }

      if (headRef.current) {
        if (trackTarget) {
          const dir = trackTarget.clone().sub(current);
          dir.y = 0;
          const angle = Math.atan2(dir.x, dir.z);
          const bodyAngle = groupRef.current.rotation.y;
          const targetHeadAngle = angle - bodyAngle + Math.PI / 2;
          headRef.current.rotation.y = THREE.MathUtils.lerp(
            headRef.current.rotation.y,
            targetHeadAngle,
            0.05
          );
          state.current.headTrackTarget = trackTarget;
        } else {
          headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.5) * 0.2;
          state.current.headTrackTarget = null;
        }
        headRef.current.position.y = 0.12;
      }
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.1 : 0.6;
          leg.lower.rotation.z = isFront ? 0 : -0.8;
        }
      });

      if (state.current.timer <= 0) {
        state.current.mode = 'walk';
        state.current.timer = 6 + Math.random() * 6;
      }
      return;
    }

    if (state.current.mode === 'flee' && state.current.fleeTarget) {
      const target = state.current.fleeTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.5) {
        state.current.mode = 'idle';
        state.current.fleeTarget = null;
        state.current.timer = 3 + Math.random() * 4;
        return;
      }

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_FLEE_SPEED));

      if (isPositionBlocked(nextPos)) {
        let foundPath = false;
        const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * CAT_FLEE_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            foundPath = true;
            break;
          }
        }
        if (!foundPath) {
          state.current.mode = 'idle';
          state.current.timer = 1;
          return;
        }
      } else {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));
      state.current.walkCycle += delta * 18;

      if (headRef.current) {
        headRef.current.rotation.y = 0;
        headRef.current.position.y = 0.11;
      }

      earRefs.current.forEach((ear, i) => {
        if (ear) {
          ear.rotation.z = (i === 0 ? -0.4 : 0.4);
          ear.rotation.x = -0.3;
        }
      });

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.6;
          leg.lower.rotation.z = Math.sin(cycle - 0.5) * 0.5 - 0.2;
        }
      });
      return;
    }

    if (state.current.mode === 'hunt' && state.current.huntTarget) {
      const target = state.current.huntTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_HUNT_SPEED));

      if (isPositionBlocked(nextPos)) {
        let foundPath = false;
        const angles = [Math.PI / 4, -Math.PI / 4];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * CAT_HUNT_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            foundPath = true;
            break;
          }
        }
        if (!foundPath) {
          state.current.mode = 'idle';
          state.current.huntTarget = null;
          state.current.timer = 2;
          return;
        }
      } else {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));
      state.current.walkCycle += delta * 14;

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.3) * 0.05;
        headRef.current.position.y = 0.1;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.55;
          leg.lower.rotation.z = Math.sin(cycle - 0.5) * 0.45 - 0.2;
        }
      });
      return;
    }

    if (state.current.mode === 'walk') {
      state.current.walkCycle += delta * 6;

      if (state.current.timer <= 0) {
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 5 + Math.random() * 5;
      }

      const target = new THREE.Vector3(...waypoints[state.current.targetIndex]);
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.4) {
        state.current.mode = 'idle';
        state.current.timer = 2 + Math.random() * 3;
        return;
      }
      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * CAT_WALK_SPEED));
      if (!isPositionBlocked(nextPos)) {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.3) * 0.08;
        headRef.current.position.y = 0.12 + Math.sin(state.current.walkCycle * 2) * 0.02;
      }

      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          const phaseOffset = (isFront === isLeft) ? 0 : Math.PI;
          const cycle = state.current.walkCycle + phaseOffset;
          leg.upper.rotation.z = Math.sin(cycle) * 0.5;
          leg.lower.rotation.z = Math.sin(cycle - 0.4) * 0.4 - 0.3;
        }
      });
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={waypoints[0]}
      scale={catAppearance.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={`${catAppearance.variant.name} Cat`}
          lines={['Market cat', 'Wary but curious', 'Hunts rats']}
          offset={[0, 0.7 / catAppearance.scale, 0]}
        />
      )}

      <group ref={bodyRef} position={[0, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.07, 0.24, 6, 10]} />
          {furMaterial}
        </mesh>

        <mesh position={[-0.1, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.09, 10, 8]} />
          {furMaterial}
        </mesh>

        <mesh position={[0.12, 0.13, 0]} castShadow>
          <sphereGeometry args={[0.075, 10, 8]} />
          {furMaterial}
        </mesh>

        <group ref={headRef} position={[0.2, 0.13, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.065, 10, 10]} />
            {furMaterial}
          </mesh>

          <mesh position={[0.07, -0.01, 0]} castShadow>
            <boxGeometry args={[0.07, 0.05, 0.05]} />
            {darkFurMaterial}
          </mesh>

          <mesh position={[0.1, -0.01, 0]}>
            <sphereGeometry args={[0.013, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
          </mesh>

          <mesh
            ref={el => { if (el) earRefs.current[0] = el; }}
            position={[-0.02, 0.06, 0.05]}
            rotation={[0.2, 0, 0.4]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.07, 0.02]} />
            {darkFurMaterial}
          </mesh>
          <mesh
            ref={el => { if (el) earRefs.current[1] = el; }}
            position={[-0.02, 0.06, -0.05]}
            rotation={[-0.2, 0, -0.4]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.07, 0.02]} />
            {darkFurMaterial}
          </mesh>

          <mesh position={[0.035, 0.02, 0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={catAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.035, 0.02, -0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={catAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
        </group>

        <group position={[0.08, 0.06, 0.05]} ref={el => { if (el && !legRefs.current[0]) legRefs.current[0] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.07, 0]} ref={el => { if (el && legRefs.current[0]) legRefs.current[0].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.014, 0.018, 0.1, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[0.08, 0.06, -0.05]} ref={el => { if (el && !legRefs.current[1]) legRefs.current[1] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.07, 0]} ref={el => { if (el && legRefs.current[1]) legRefs.current[1].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.014, 0.018, 0.1, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[-0.08, 0.06, 0.05]} ref={el => { if (el && !legRefs.current[2]) legRefs.current[2] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.07, 0]} ref={el => { if (el && legRefs.current[2]) legRefs.current[2].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.014, 0.018, 0.1, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[-0.08, 0.06, -0.05]} ref={el => { if (el && !legRefs.current[3]) legRefs.current[3] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.07, 0]} ref={el => { if (el && legRefs.current[3]) legRefs.current[3].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.014, 0.018, 0.1, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[-0.14, 0.1, 0]} rotation={[0, 0, 0.3]}>
          <group ref={el => { if (el) tailSegments.current[0] = el; }}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.014, 0.035, 3, 6]} />
              {furMaterial}
            </mesh>
            <group position={[-0.045, 0, 0]} ref={el => { if (el) tailSegments.current[1] = el; }}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <capsuleGeometry args={[0.012, 0.03, 3, 6]} />
                {furMaterial}
              </mesh>
              <group position={[-0.04, 0, 0]} ref={el => { if (el) tailSegments.current[2] = el; }}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <capsuleGeometry args={[0.01, 0.025, 3, 6]} />
                  {furMaterial}
                </mesh>
                <group position={[-0.035, 0, 0]} ref={el => { if (el) tailSegments.current[3] = el; }}>
                  <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                    <capsuleGeometry args={[0.006, 0.02, 3, 6]} />
                    {darkFurMaterial}
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
