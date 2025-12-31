import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDistrictType } from '../../types';
import { seededRandom } from '../../utils/procedural';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from './shared/HoverSystem';
import { Camel } from './Camel';
import { Donkey } from './Donkey';
import { Chicken } from './Chicken';
import { Vulture } from './Vulture';

// Dog constants
const DOG_WALK_SPEED = 0.8;
const DOG_RUN_SPEED = 2.0;
const DOG_FOLLOW_DISTANCE = 6.0;
const DOG_MIN_FOLLOW_DISTANCE = 3.0;
const DOG_COLLISION_RADIUS = 0.9;

// Dog color variants
const DOG_VARIANTS = [
  { name: 'Brown', primary: '#6b4423', secondary: '#4a3016', eyeColor: '#2a1a0a' },
  { name: 'Gray', primary: '#6a6a6a', secondary: '#4a4a4a', eyeColor: '#2a2a2a' },
  { name: 'Black', primary: '#2a2a2a', secondary: '#1a1a1a', eyeColor: '#0a0a0a' },
  { name: 'White', primary: '#e8e8e8', secondary: '#d0d0d0', eyeColor: '#2a2a2a' },
  { name: 'Mottled', primary: '#8b6843', secondary: '#d4a574', eyeColor: '#3a2814' },
];

interface StrayDogProps {
  seed?: number;
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
  spawnPosition?: [number, number, number];
}

export const StrayDog: React.FC<StrayDogProps> = ({ seed = 0, npcPositions, playerPosition, spawnPosition = [10, 0, 10] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<THREE.Mesh[]>([]);
  const legRefs = useRef<{ upper: THREE.Group; lower: THREE.Group }[]>([]);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  const state = useRef({
    mode: 'idle' as 'idle' | 'sniff' | 'walk' | 'run' | 'follow' | 'rest' | 'bark' | 'scratch',
    timer: 0,
    walkCycle: 0,
    breathCycle: 0,
    followTarget: null as THREE.Vector3 | null,
    wanderTarget: null as THREE.Vector3 | null,
    barkTimer: 0,
    scratchProgress: 0,
    tailWagSpeed: 1,
    sniffProgress: 0
  });

  const dogAppearance = useMemo(() => {
    const rng = (s: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return { val: s / 0x7fffffff, next: s }; };
    let s = seed + 12345;
    const r1 = rng(s); s = r1.next;
    const r2 = rng(s); s = r2.next;
    const r3 = rng(s);
    const variant = DOG_VARIANTS[Math.floor(r1.val * DOG_VARIANTS.length)];
    const scale = 1.2 + r2.val * 2.0;
    const tailLength = 0.08 + r3.val * 0.12;
    return { variant, scale, tailLength };
  }, [seed]);

  const furMaterial = useMemo(() => (
    <meshStandardMaterial color={dogAppearance.variant.primary} roughness={0.95} />
  ), [dogAppearance]);
  const darkFurMaterial = useMemo(() => (
    <meshStandardMaterial color={dogAppearance.variant.secondary} roughness={0.95} />
  ), [dogAppearance]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;
    state.current.breathCycle += delta;

    const isPositionBlocked = (pos: THREE.Vector3): boolean => {
      if (playerPosition) {
        const distToPlayer = pos.distanceTo(playerPosition);
        if (distToPlayer < DOG_COLLISION_RADIUS + 0.5) return true;
      }
      if (npcPositions) {
        for (const npcPos of npcPositions) {
          const distToNPC = pos.distanceTo(npcPos);
          if (distToNPC < DOG_COLLISION_RADIUS + 0.5) return true;
        }
      }
      return false;
    };

    if (state.current.mode !== 'rest' && state.current.mode !== 'bark' && state.current.mode !== 'scratch') {
      if (npcPositions && npcPositions.length > 0) {
        let nearestNPC: THREE.Vector3 | null = null;
        let nearestDist = DOG_FOLLOW_DISTANCE;

        for (const npcPos of npcPositions) {
          const dist = current.distanceTo(npcPos);
          if (dist < DOG_FOLLOW_DISTANCE && dist > DOG_MIN_FOLLOW_DISTANCE) {
            if (!nearestNPC || dist < nearestDist) {
              nearestNPC = npcPos.clone();
              nearestDist = dist;
            }
          }
        }

        if (nearestNPC && Math.random() < 0.4) {
          state.current.followTarget = nearestNPC;
          state.current.mode = 'follow';
        } else if (state.current.mode === 'follow' && !nearestNPC) {
          state.current.mode = 'idle';
          state.current.followTarget = null;
          state.current.timer = 2;
        }
      }
    }

    const breathScale = 1 + Math.sin(state.current.breathCycle * 1.5) * 0.02;
    bodyRef.current.scale.setScalar(breathScale);

    const wagIntensity = state.current.mode === 'follow' ? 0.6 : (state.current.mode === 'walk' ? 0.3 : 0.15);
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(state.current.breathCycle * state.current.tailWagSpeed * 4) * wagIntensity;
    }

    const earAlert = state.current.mode === 'follow' || state.current.mode === 'bark';
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        const baseAngle = earAlert ? -0.1 : 0.2;
        const flutter = Math.sin(state.current.breathCycle * 3 + i * Math.PI) > 0.85 ? 0.1 : 0;
        ear.rotation.x = baseAngle + flutter;
      }
    });

    if (state.current.mode === 'rest') {
      if (headRef.current) {
        headRef.current.position.y = 0.08;
        headRef.current.rotation.x = 0.3;
      }
      legRefs.current.forEach((leg) => {
        if (leg?.upper && leg?.lower) {
          leg.upper.rotation.z = 1.2;
          leg.lower.rotation.z = -1.5;
        }
      });
      if (state.current.timer <= 0) {
        state.current.mode = Math.random() > 0.5 ? 'sniff' : 'walk';
        state.current.timer = 3 + Math.random() * 4;
      }
      return;
    }

    if (state.current.mode === 'bark') {
      state.current.barkTimer -= delta;
      if (headRef.current) {
        const barkPhase = Math.sin(state.current.barkTimer * 20);
        headRef.current.rotation.x = -0.3 + barkPhase * 0.2;
        headRef.current.position.y = 0.16;
      }
      if (state.current.barkTimer <= 0) {
        state.current.mode = 'idle';
        state.current.timer = 2;
      }
      return;
    }

    if (state.current.mode === 'scratch') {
      state.current.scratchProgress += delta * 4;
      if (state.current.scratchProgress >= 1) {
        state.current.mode = 'idle';
        state.current.scratchProgress = 0;
        state.current.timer = 2;
        return;
      }
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(state.current.scratchProgress * 15) * 0.15;
        headRef.current.position.y = 0.14;
      }
      if (legRefs.current[3]?.upper && legRefs.current[3]?.lower) {
        const scratchPhase = Math.sin(state.current.scratchProgress * 15);
        legRefs.current[3].upper.rotation.z = 0.8 + scratchPhase * 0.4;
        legRefs.current[3].lower.rotation.z = -1.0 + scratchPhase * 0.6;
      }
      return;
    }

    if (state.current.mode === 'sniff') {
      state.current.sniffProgress += delta;
      if (headRef.current) {
        headRef.current.position.y = 0.04;
        headRef.current.rotation.x = 0.6;
        headRef.current.rotation.y = Math.sin(state.current.sniffProgress * 2) * 0.3;
      }
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.2 : 0.7;
          leg.lower.rotation.z = isFront ? -0.1 : -1.0;
        }
      });
      if (state.current.sniffProgress > 3) {
        state.current.mode = 'walk';
        state.current.sniffProgress = 0;
        state.current.timer = 4;
      }
      return;
    }

    if (state.current.mode === 'follow' && state.current.followTarget) {
      const target = state.current.followTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < DOG_MIN_FOLLOW_DISTANCE) {
        state.current.mode = 'idle';
        state.current.followTarget = null;
        state.current.timer = 1;
        return;
      }

      dir.normalize();
      const speed = dist > 10 ? DOG_RUN_SPEED : DOG_WALK_SPEED;
      const nextPos = current.clone().add(dir.multiplyScalar(delta * speed));

      if (!isPositionBlocked(nextPos)) {
        current.copy(nextPos);
      }

      groupRef.current.lookAt(new THREE.Vector3(target.x, current.y, target.z));
      state.current.walkCycle += delta * (speed > 1 ? 12 : 8);

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.3) * 0.08;
        headRef.current.position.y = 0.16 + Math.sin(state.current.walkCycle * 2) * 0.02;
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
      return;
    }

    if (state.current.mode === 'idle') {
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.breathCycle * 0.4) * 0.3;
        headRef.current.position.y = 0.16;
      }
      legRefs.current.forEach((leg, i) => {
        if (leg?.upper && leg?.lower) {
          const isFront = i < 2;
          leg.upper.rotation.z = isFront ? 0.1 : 0.7;
          leg.lower.rotation.z = isFront ? -0.1 : -1.0;
        }
      });
      if (state.current.timer <= 0) {
        const rand = Math.random();
        if (rand > 0.7) {
          state.current.mode = 'sniff';
          state.current.sniffProgress = 0;
        } else if (rand > 0.5) {
          state.current.mode = 'rest';
          state.current.timer = 8 + Math.random() * 10;
        } else if (rand > 0.4) {
          state.current.mode = 'bark';
          state.current.barkTimer = 1 + Math.random() * 1;
        } else if (rand > 0.3) {
          state.current.mode = 'scratch';
          state.current.scratchProgress = 0;
        } else {
          state.current.mode = 'walk';
          state.current.timer = 5 + Math.random() * 5;
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 15;
          state.current.wanderTarget = new THREE.Vector3(
            current.x + Math.cos(angle) * dist,
            0,
            current.z + Math.sin(angle) * dist
          );
        }
      }
      return;
    }

    if (state.current.mode === 'walk') {
      if (!state.current.wanderTarget) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 15;
        state.current.wanderTarget = new THREE.Vector3(
          current.x + Math.cos(angle) * dist,
          0,
          current.z + Math.sin(angle) * dist
        );
      }

      const target = state.current.wanderTarget;
      const dir = target.clone().sub(current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 1.0) {
        state.current.mode = 'idle';
        state.current.wanderTarget = null;
        state.current.timer = 2 + Math.random() * 3;
        return;
      }

      dir.normalize();
      const nextPos = current.clone().add(dir.multiplyScalar(delta * DOG_WALK_SPEED));

      if (!isPositionBlocked(nextPos)) {
        current.copy(nextPos);
      } else {
        const angles = [Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];
        for (const angleOffset of angles) {
          const altDir = dir.clone();
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const newX = altDir.x * cos - altDir.z * sin;
          const newZ = altDir.x * sin + altDir.z * cos;
          altDir.set(newX, 0, newZ);
          const altPos = current.clone().add(altDir.multiplyScalar(delta * DOG_WALK_SPEED));
          if (!isPositionBlocked(altPos)) {
            current.copy(altPos);
            break;
          }
        }
      }

      groupRef.current.lookAt(target);
      state.current.walkCycle += delta * 8;

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(state.current.walkCycle * 0.5) * 0.12;
        headRef.current.position.y = 0.16 + Math.sin(state.current.walkCycle * 2) * 0.02;
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
      position={spawnPosition}
      scale={dogAppearance.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={`${dogAppearance.variant.name} Stray Dog`}
          lines={['Wandering the streets', 'Loyal but independent', 'Part of the city']}
          offset={[0, 0.6 / dogAppearance.scale, 0]}
        />
      )}

      <group ref={bodyRef} position={[0, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.08, 0.28, 6, 10]} />
          {furMaterial}
        </mesh>

        <mesh position={[-0.12, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.09, 10, 8]} />
          {furMaterial}
        </mesh>

        <mesh position={[0.14, 0.19, 0]} castShadow>
          <sphereGeometry args={[0.075, 10, 8]} />
          {furMaterial}
        </mesh>

        <group ref={headRef} position={[0.22, 0.18, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            {furMaterial}
          </mesh>

          <mesh position={[0.07, -0.01, 0]} castShadow>
            <boxGeometry args={[0.08, 0.05, 0.05]} />
            {darkFurMaterial}
          </mesh>

          <mesh position={[0.11, -0.01, 0]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
          </mesh>

          <mesh
            ref={el => { if (el) earRefs.current[0] = el; }}
            position={[-0.02, 0.05, 0.05]}
            rotation={[0.2, 0, 0.4]}
            castShadow
          >
            <boxGeometry args={[0.04, 0.08, 0.02]} />
            {darkFurMaterial}
          </mesh>
          <mesh
            ref={el => { if (el) earRefs.current[1] = el; }}
            position={[-0.02, 0.05, -0.05]}
            rotation={[-0.2, 0, -0.4]}
            castShadow
          >
            <boxGeometry args={[0.04, 0.08, 0.02]} />
            {darkFurMaterial}
          </mesh>

          <mesh position={[0.04, 0.02, 0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={dogAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.04, 0.02, -0.035]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={dogAppearance.variant.eyeColor} roughness={0.2} />
          </mesh>
        </group>

        <group position={[0.1, 0.08, 0.055]} ref={el => { if (el && !legRefs.current[0]) legRefs.current[0] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[0]) legRefs.current[0].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[0.1, 0.08, -0.055]} ref={el => { if (el && !legRefs.current[1]) legRefs.current[1] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[1]) legRefs.current[1].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.018, 0.02, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[-0.08, 0.08, 0.055]} ref={el => { if (el && !legRefs.current[2]) legRefs.current[2] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[2]) legRefs.current[2].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.022, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group position={[-0.08, 0.08, -0.055]} ref={el => { if (el && !legRefs.current[3]) legRefs.current[3] = { upper: el, lower: null as any }; }}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.15, 6]} />
            {furMaterial}
          </mesh>
          <group position={[0, -0.08, 0]} ref={el => { if (el && legRefs.current[3]) legRefs.current[3].lower = el; }}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.022, 0.12, 6]} />
              {darkFurMaterial}
            </mesh>
            <mesh position={[0, -0.065, 0]} castShadow>
              <sphereGeometry args={[0.025, 6, 6]} />
              {darkFurMaterial}
            </mesh>
          </group>
        </group>

        <group ref={tailRef} position={[-0.18, 0.2, 0]}>
          <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
            <capsuleGeometry args={[0.015, dogAppearance.tailLength, 4, 8]} />
            {furMaterial}
          </mesh>
        </group>
      </group>
    </group>
  );
};

interface PackAnimalProps {
  kind: 'donkey' | 'camel';
  seed?: number;
  spawnPosition?: [number, number, number];
}

const PackAnimal: React.FC<PackAnimalProps> = ({ kind, seed = 0, spawnPosition = [0, 0, 0] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legRefs = useRef<THREE.Group[]>([]);
  const tailRef = useRef<THREE.Mesh>(null);
  const earRefs = useRef<THREE.Mesh[]>([]);
  const state = useRef({
    angle: seededRandom(seed + 3) * Math.PI * 2,
    speed: 0.15 + seededRandom(seed + 7) * 0.15,
    radius: 2.5 + seededRandom(seed + 11) * 3.5,
    phase: seededRandom(seed + 13) * Math.PI * 2,
    mode: 'walk' as 'walk' | 'idle',
    timer: 4 + seededRandom(seed + 17) * 4,
    dir: seededRandom(seed + 23) > 0.5 ? 1 : -1
  });

  const appearance = useMemo(() => {
    if (kind === 'camel') {
      const base = seededRandom(seed + 31);
      const shade = seededRandom(seed + 33);
      const scale = 1.25 + base * 0.45;
      return {
        scale,
        body: shade > 0.66 ? '#d8b07a' : shade > 0.33 ? '#caa277' : '#b68a5c',
        accent: shade > 0.66 ? '#b6895f' : shade > 0.33 ? '#a77f55' : '#996b44',
        dark: shade > 0.66 ? '#8a633f' : shade > 0.33 ? '#7c5a3b' : '#6a4c32'
      };
    }
    const base = seededRandom(seed + 41);
    const shade = seededRandom(seed + 43);
    const scale = 1.0 + base * 0.3;
    return {
      scale,
      body: shade > 0.66 ? '#a08f7c' : shade > 0.33 ? '#8f7f6a' : '#7d6d5b',
      accent: shade > 0.66 ? '#7b6a57' : shade > 0.33 ? '#6b5a49' : '#5a4a3d',
      dark: shade > 0.66 ? '#56493d' : shade > 0.33 ? '#4a3f33' : '#3b3229'
    };
  }, [kind, seed]);

  const loadConfig = useMemo(() => {
    const hasLoad = seededRandom(seed + 55) > 0.45;
    const cloth = seededRandom(seed + 57) > 0.5 ? '#7b4c32' : '#3f5f6f';
    const strap = seededRandom(seed + 59) > 0.5 ? '#6b4b2f' : '#4a3a2a';
    const bundle = seededRandom(seed + 61) > 0.5 ? '#9a7b4f' : '#7a6a5a';
    return { hasLoad, cloth, strap, bundle };
  }, [seed]);

  const bodyMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.body} roughness={0.9} />
  ), [appearance.body]);
  const accentMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.accent} roughness={0.92} />
  ), [appearance.accent]);
  const darkMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.dark} roughness={0.95} />
  ), [appearance.dark]);
  const clothMaterial = useMemo(() => (
    <meshStandardMaterial color={loadConfig.cloth} roughness={0.95} />
  ), [loadConfig.cloth]);
  const strapMaterial = useMemo(() => (
    <meshStandardMaterial color={loadConfig.strap} roughness={0.9} />
  ), [loadConfig.strap]);
  const bundleMaterial = useMemo(() => (
    <meshStandardMaterial color={loadConfig.bundle} roughness={0.92} />
  ), [loadConfig.bundle]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const s = state.current;
    s.timer -= delta;

    if (s.timer <= 0) {
      s.mode = s.mode === 'walk' ? 'idle' : 'walk';
      s.timer = s.mode === 'walk' ? 5 + seededRandom(seed + 19) * 4 : 2 + seededRandom(seed + 29) * 3;
    }

    const baseX = spawnPosition[0];
    const baseZ = spawnPosition[2];
    if (s.mode === 'walk') {
      s.angle += delta * s.speed * s.dir;
      const nextX = baseX + Math.cos(s.angle) * s.radius;
      const nextZ = baseZ + Math.sin(s.angle) * s.radius;
      groupRef.current.position.set(nextX, spawnPosition[1], nextZ);
      groupRef.current.rotation.y = -s.angle + Math.PI / 2;
    } else {
      groupRef.current.position.set(baseX, spawnPosition[1], baseZ);
    }

    s.phase += delta * (s.mode === 'walk' ? 5 : 1.5);
    const stride = s.mode === 'walk' ? 0.6 : 0.1;
    legRefs.current.forEach((leg, i) => {
      if (!leg) return;
      const offset = i % 2 === 0 ? 0 : Math.PI;
      leg.rotation.x = Math.sin(s.phase + offset) * stride;
    });

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(s.phase * 0.4) * (s.mode === 'walk' ? 0.08 : 0.04);
      headRef.current.rotation.z = Math.sin(s.phase * 0.25) * (s.mode === 'walk' ? 0.03 : 0.02);
    }
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(s.phase * 0.8) * 0.25;
    }
    earRefs.current.forEach((ear, i) => {
      if (!ear) return;
      ear.rotation.x = Math.sin(s.phase * 0.6 + i) * 0.12 + (kind === 'camel' ? 0.1 : 0.25);
    });
  });

  const isCamel = kind === 'camel';
  const bodyLength = isCamel ? 1.6 : 1.2;
  const bodyHeight = isCamel ? 0.65 : 0.5;
  const legHeight = isCamel ? 0.65 : 0.5;

  return (
    <group ref={groupRef} position={spawnPosition} scale={appearance.scale}>
      <group position={[0, legHeight * 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[bodyLength, bodyHeight, 0.5]} />
          {bodyMaterial}
        </mesh>
        <mesh position={[0.1, bodyHeight * 0.55, 0]} castShadow>
          <boxGeometry args={[bodyLength * 0.7, bodyHeight * 0.6, 0.35]} />
          {accentMaterial}
        </mesh>

        {isCamel && (
          <mesh position={[-0.1, bodyHeight * 0.75, 0]} castShadow>
            <sphereGeometry args={[0.28, 12, 10]} />
            {accentMaterial}
          </mesh>
        )}

        {!isCamel && (
          <mesh position={[0, bodyHeight * 0.5, 0]} castShadow>
            <boxGeometry args={[0.6, 0.2, 0.45]} />
            {accentMaterial}
          </mesh>
        )}

        <group ref={headRef} position={[bodyLength * 0.5, bodyHeight * 0.25, 0]}>
          <mesh rotation={[0, 0, -0.15]} castShadow>
            <boxGeometry args={[0.42, 0.2, 0.2]} />
            {bodyMaterial}
          </mesh>
          <mesh position={[0.28, 0.04, 0]} castShadow>
            <boxGeometry args={[0.32, 0.18, 0.16]} />
            {darkMaterial}
          </mesh>
          <mesh position={[0.4, 0.02, 0.035]} castShadow>
            <sphereGeometry args={[0.03, 8, 6]} />
            {darkMaterial}
          </mesh>
          <mesh position={[0.4, 0.02, -0.035]} castShadow>
            <sphereGeometry args={[0.03, 8, 6]} />
            {darkMaterial}
          </mesh>
          <mesh position={[0.3, 0.14, 0.06]} castShadow>
            <boxGeometry args={[0.05, 0.18, 0.04]} />
            {darkMaterial}
          </mesh>
          <mesh position={[0.3, 0.14, -0.06]} castShadow>
            <boxGeometry args={[0.05, 0.18, 0.04]} />
            {darkMaterial}
          </mesh>
          <mesh ref={el => { if (el) earRefs.current[0] = el; }} position={[-0.05, 0.18, 0.08]} castShadow>
            <coneGeometry args={[0.05, 0.18, 6]} />
            {accentMaterial}
          </mesh>
          <mesh ref={el => { if (el) earRefs.current[1] = el; }} position={[-0.05, 0.18, -0.08]} castShadow>
            <coneGeometry args={[0.05, 0.18, 6]} />
            {accentMaterial}
          </mesh>
        </group>

        <mesh ref={tailRef} position={[-bodyLength * 0.5, bodyHeight * 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 0.25, 6]} />
          {darkMaterial}
        </mesh>
        <mesh position={[-bodyLength * 0.5 - 0.04, bodyHeight * 0.12, 0]} castShadow>
          <sphereGeometry args={[0.04, 8, 6]} />
          {darkMaterial}
        </mesh>

        {loadConfig.hasLoad && (
          <>
            <mesh position={[-0.1, bodyHeight * 0.65, 0]} castShadow>
              <boxGeometry args={[bodyLength * 0.7, 0.12, 0.55]} />
              {clothMaterial}
            </mesh>
            <mesh position={[-0.05, bodyHeight * 0.82, 0.22]} castShadow>
              <boxGeometry args={[0.35, 0.2, 0.2]} />
              {bundleMaterial}
            </mesh>
            <mesh position={[-0.05, bodyHeight * 0.82, -0.22]} castShadow>
              <boxGeometry args={[0.35, 0.2, 0.2]} />
              {bundleMaterial}
            </mesh>
            <mesh position={[-0.1, bodyHeight * 0.58, 0]} castShadow>
              <torusGeometry args={[0.22, 0.025, 6, 12]} />
              {strapMaterial}
            </mesh>
          </>
        )}

        {new Array(4).fill(0).map((_, i) => {
          const x = i < 2 ? bodyLength * 0.35 : -bodyLength * 0.35;
          const z = i % 2 === 0 ? 0.18 : -0.18;
          return (
            <group key={`${kind}-leg-${i}`} position={[x, -legHeight * 0.5, z]} ref={el => { if (el) legRefs.current[i] = el; }}>
              <mesh castShadow>
                <cylinderGeometry args={[0.06, 0.07, legHeight, 6]} />
                {bodyMaterial}
              </mesh>
              <mesh position={[0, -legHeight * 0.5, 0]} castShadow>
                <boxGeometry args={[0.1, 0.05, 0.14]} />
                {darkMaterial}
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

interface EnvironmentFaunaProps {
  mapX: number;
  mapY: number;
  npcPositions?: THREE.Vector3[];
  playerPosition?: THREE.Vector3;
}

export const EnvironmentFauna: React.FC<EnvironmentFaunaProps> = ({ mapX, mapY, npcPositions, playerPosition }) => {
  const dogSpawn = useMemo(() => {
    if (mapX === 0 && mapY === 0) return null;
    const dogSeed = mapX * 1000 + mapY * 13 + 999;
    const spawnRoll = seededRandom(dogSeed);
    if (spawnRoll < 0.5) return null;

    const posRoll1 = seededRandom(dogSeed + 1);
    const posRoll2 = seededRandom(dogSeed + 2);

    const angle = posRoll1 * Math.PI * 2;
    const dist = 15 + posRoll2 * 10;
    const position: [number, number, number] = [
      Math.cos(angle) * dist,
      0,
      Math.sin(angle) * dist
    ];

    return {
      seed: dogSeed,
      position
    };
  }, [mapX, mapY]);

  const packAnimals = useMemo(() => {
    const district = getDistrictType(mapX, mapY);
    const seedBase = mapX * 1000 + mapY * 13 + 7711;
    const rand = (offset: number) => seededRandom(seedBase + offset);

    const results: Array<{ kind: 'donkey' | 'camel'; seed: number; position: [number, number, number] }> = [];
    const inMarketplace = district === 'MARKET';
    const canHaveDonkey = district === 'OUTSKIRTS_FARMLAND' || district === 'SOUTHERN_ROAD' || district === 'ROADSIDE' || district === 'RESIDENTIAL';
    const canHaveCamel = district === 'OUTSKIRTS_DESERT' || district === 'CARAVANSERAI' || district === 'SOUTHERN_ROAD' || district === 'ROADSIDE';
    const rareOtherBiome = !inMarketplace && rand(3) < 0.1;
    const allowDonkey = canHaveDonkey || (rareOtherBiome && rand(5) < 0.5);
    const allowCamel = canHaveCamel || (rareOtherBiome && rand(7) < 0.5);

    if (allowDonkey) {
      const count = canHaveDonkey && rand(7) > 0.6 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const angle = rand(11 + i * 7) * Math.PI * 2;
        const dist = 10 + rand(17 + i * 11) * 10;
        results.push({
          kind: 'donkey',
          seed: seedBase + i * 101,
          position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist]
        });
      }
    }

    if (allowCamel) {
      const count = canHaveCamel && rand(29) > 0.7 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const angle = rand(37 + i * 9) * Math.PI * 2;
        const dist = 12 + rand(41 + i * 13) * 12;
        results.push({
          kind: 'camel',
          seed: seedBase + 500 + i * 97,
          position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist]
        });
      }
    }

    return results;
  }, [mapX, mapY]);

  // Chicken spawning for farm, roadside, and hovels areas
  const chickens = useMemo(() => {
    const district = getDistrictType(mapX, mapY);
    const seedBase = mapX * 1000 + mapY * 13 + 5555;
    const rand = (offset: number) => seededRandom(seedBase + offset);

    const results: Array<{ seed: number; position: [number, number, number]; isRooster: boolean }> = [];

    const isFarmland = district === 'OUTSKIRTS_FARMLAND';
    const isRoadside = district === 'ROADSIDE';
    const isHovels = district === 'HOVELS';

    if (isFarmland || isRoadside || isHovels) {
      // Number of chickens: 4-8 for farmland, 2-4 for roadside, 3-6 for hovels
      const baseCount = isFarmland ? 4 : isHovels ? 3 : 2;
      const extraCount = isFarmland ? 4 : isHovels ? 3 : 2;
      const count = baseCount + Math.floor(rand(1) * extraCount);

      // Spawn chickens in a loose flock
      const flockCenterAngle = rand(2) * Math.PI * 2;
      const flockCenterDist = 8 + rand(3) * 10;
      const flockCenterX = Math.cos(flockCenterAngle) * flockCenterDist;
      const flockCenterZ = Math.sin(flockCenterAngle) * flockCenterDist;

      // One rooster per flock
      const roosterIndex = Math.floor(rand(4) * count);

      for (let i = 0; i < count; i++) {
        const offsetAngle = rand(10 + i * 3) * Math.PI * 2;
        const offsetDist = rand(20 + i * 5) * 3;
        results.push({
          seed: seedBase + i * 77,
          position: [
            flockCenterX + Math.cos(offsetAngle) * offsetDist,
            0,
            flockCenterZ + Math.sin(offsetAngle) * offsetDist
          ],
          isRooster: i === roosterIndex
        });
      }
    }

    return results;
  }, [mapX, mapY]);

  // Vulture spawning for scrubland areas
  const vultures = useMemo(() => {
    const district = getDistrictType(mapX, mapY);
    const seedBase = mapX * 1000 + mapY * 13 + 8888;
    const rand = (offset: number) => seededRandom(seedBase + offset);

    const results: Array<{ seed: number; position: [number, number, number] }> = [];

    const isScrubland = district === 'OUTSKIRTS_SCRUBLAND';
    const isDesert = district === 'OUTSKIRTS_DESERT';

    if (isScrubland) {
      // 2-4 vultures circling in scrubland
      const count = 2 + Math.floor(rand(1) * 3);

      for (let i = 0; i < count; i++) {
        const angle = rand(10 + i * 5) * Math.PI * 2;
        const dist = 5 + rand(20 + i * 7) * 15;
        const height = 10 + rand(30 + i * 3) * 15;
        results.push({
          seed: seedBase + i * 111,
          position: [
            Math.cos(angle) * dist,
            height,
            Math.sin(angle) * dist
          ]
        });
      }
    } else if (isDesert && rand(50) > 0.7) {
      // Occasional vulture in desert (30% chance, 1-2 birds)
      const count = 1 + (rand(51) > 0.5 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const angle = rand(60 + i * 5) * Math.PI * 2;
        const dist = 10 + rand(70 + i * 7) * 20;
        const height = 12 + rand(80 + i * 3) * 18;
        results.push({
          seed: seedBase + 500 + i * 111,
          position: [
            Math.cos(angle) * dist,
            height,
            Math.sin(angle) * dist
          ]
        });
      }
    }

    return results;
  }, [mapX, mapY]);

  return (
    <group>
      {dogSpawn && (
        <StrayDog
          seed={dogSpawn.seed}
          spawnPosition={dogSpawn.position}
          npcPositions={npcPositions}
          playerPosition={playerPosition}
        />
      )}
      {packAnimals.map((animal) => (
        animal.kind === 'camel' ? (
          <Camel
            key={`camel-${animal.seed}`}
            seed={animal.seed}
            spawnPosition={animal.position}
            playerPosition={playerPosition}
          />
        ) : (
          <Donkey
            key={`donkey-${animal.seed}`}
            seed={animal.seed}
            spawnPosition={animal.position}
            playerPosition={playerPosition}
          />
        )
      ))}
      {chickens.map((chicken) => (
        <Chicken
          key={`chicken-${chicken.seed}`}
          seed={chicken.seed}
          spawnPosition={chicken.position}
          playerPosition={playerPosition}
          isRooster={chicken.isRooster}
        />
      ))}
      {vultures.map((vulture) => (
        <Vulture
          key={`vulture-${vulture.seed}`}
          seed={vulture.seed}
          spawnPosition={vulture.position}
          playerPosition={playerPosition}
        />
      ))}
    </group>
  );
};
