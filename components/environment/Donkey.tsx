import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from '../../utils/procedural';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from './shared/HoverSystem';

// Donkey behavior constants
const DONKEY_WALK_SPEED = 0.35;
const DONKEY_FLEE_SPEED = 0.7;
const DONKEY_FLEE_DISTANCE = 3.5;
const DONKEY_SAFE_DISTANCE = 7.0;

// Donkey color variants - authentic working donkey colors
const DONKEY_COLORS = [
  { name: 'Gray', body: '#8a8a8a', accent: '#6a6a6a', dark: '#4a4a4a', muzzle: '#d8d0c8' },
  { name: 'Brown', body: '#7a6a5a', accent: '#5a4a3a', dark: '#3a2a1a', muzzle: '#c8b8a8' },
  { name: 'Dun', body: '#a89878', accent: '#887858', dark: '#584838', muzzle: '#d8c8b8' },
  { name: 'Dark Gray', body: '#5a5a5a', accent: '#4a4a4a', dark: '#2a2a2a', muzzle: '#b8b0a8' },
  { name: 'Roan', body: '#9a7a6a', accent: '#7a5a4a', dark: '#4a3a2a', muzzle: '#d0c0b0' },
];

// Pack colors for laden donkeys
const PACK_CLOTH_COLORS = ['#6b4423', '#3a5a4a', '#5a3a3a', '#4a4a6a', '#5c4033', '#3a4a3a'];
const PACK_BUNDLE_COLORS = ['#c8b090', '#a89070', '#b8a080', '#9a8a7a', '#d0c0a0'];
const PACK_ROPE_COLORS = ['#5a4a3a', '#6b5a4a', '#4a3a2a'];

type DonkeyBehavior = 'idle' | 'walk' | 'graze' | 'flee';

interface DonkeyProps {
  seed?: number;
  spawnPosition?: [number, number, number];
  playerPosition?: THREE.Vector3;
}

export const Donkey: React.FC<DonkeyProps> = ({
  seed = 0,
  spawnPosition = [0, 0, 0],
  playerPosition
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const legRefs = useRef<{ hip: THREE.Group; upper: THREE.Group; lower: THREE.Group; hoof: THREE.Group }[]>([]);
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<THREE.Group[]>([]);
  const maneRef = useRef<THREE.Group>(null);

  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  // Animation state
  const state = useRef({
    behavior: 'idle' as DonkeyBehavior,
    timer: 3 + seededRandom(seed + 1) * 4,
    walkCycle: 0,
    breathCycle: seededRandom(seed + 2) * Math.PI * 2,
    headBob: 0,
    targetAngle: seededRandom(seed + 3) * Math.PI * 2,
    currentAngle: seededRandom(seed + 3) * Math.PI * 2,
    wanderTarget: null as THREE.Vector3 | null,
    grazeProgress: 0,
    earFlickTimer: 0,
    tailSwishTimer: 0,
    jawChewTimer: 0,
  });

  // Appearance configuration
  const appearance = useMemo(() => {
    const rng = (offset: number) => seededRandom(seed + offset);
    const colorVariant = DONKEY_COLORS[Math.floor(rng(10) * DONKEY_COLORS.length)];
    const scale = 0.85 + rng(20) * 0.35; // 0.85 - 1.2 (donkeys are smaller than camels)
    const earLength = 0.9 + rng(30) * 0.2; // Ear variation
    const bodyLength = 0.95 + rng(40) * 0.1;
    const legLength = 0.95 + rng(50) * 0.1;

    return {
      colors: colorVariant,
      scale,
      earLength,
      bodyLength,
      legLength,
    };
  }, [seed]);

  // Pack/load configuration - 50% chance
  const packConfig = useMemo(() => {
    const rng = (offset: number) => seededRandom(seed + 100 + offset);
    const hasLoad = rng(0) > 0.5;

    if (!hasLoad) return null;

    const clothColor = PACK_CLOTH_COLORS[Math.floor(rng(10) * PACK_CLOTH_COLORS.length)];
    const bundleColor = PACK_BUNDLE_COLORS[Math.floor(rng(20) * PACK_BUNDLE_COLORS.length)];
    const ropeColor = PACK_ROPE_COLORS[Math.floor(rng(30) * PACK_ROPE_COLORS.length)];
    const loadType = Math.floor(rng(40) * 3); // 0: saddlebags, 1: firewood bundle, 2: baskets
    const hasBlanket = rng(50) > 0.4;

    return {
      clothColor,
      bundleColor,
      ropeColor,
      loadType,
      hasBlanket,
    };
  }, [seed]);

  // Materials
  const bodyMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.body} roughness={0.92} />
  ), [appearance.colors.body]);

  const accentMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.accent} roughness={0.95} />
  ), [appearance.colors.accent]);

  const darkMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.dark} roughness={0.9} />
  ), [appearance.colors.dark]);

  const muzzleMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.muzzle} roughness={0.88} />
  ), [appearance.colors.muzzle]);

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;

    const s = state.current;
    const pos = groupRef.current.position;
    const legLen = appearance.legLength;
    const baseBodyY = 1.0 * legLen;

    // Update timers
    s.timer -= delta;
    s.breathCycle += delta * 1.4;
    s.earFlickTimer -= delta;
    s.tailSwishTimer -= delta;

    // Check for player proximity - flee behavior
    if (playerPosition) {
      const distToPlayer = pos.distanceTo(playerPosition);

      if (distToPlayer < DONKEY_FLEE_DISTANCE && s.behavior !== 'flee') {
        s.behavior = 'flee';
        s.timer = 4;
        const fleeDir = pos.clone().sub(playerPosition).normalize();
        s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      } else if (s.behavior === 'flee' && distToPlayer > DONKEY_SAFE_DISTANCE) {
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
      }
    }

    // Behavior state machine
    if (s.timer <= 0 && s.behavior !== 'flee') {
      const rand = Math.random();
      if (s.behavior === 'idle') {
        if (rand > 0.45) {
          s.behavior = 'walk';
          s.timer = 5 + Math.random() * 6;
          const angle = Math.random() * Math.PI * 2;
          const dist = 6 + Math.random() * 10;
          s.wanderTarget = new THREE.Vector3(
            spawnPosition[0] + Math.cos(angle) * dist,
            0,
            spawnPosition[2] + Math.sin(angle) * dist
          );
        } else {
          s.behavior = 'graze';
          s.timer = 5 + Math.random() * 6;
          s.grazeProgress = 0;
        }
      } else if (s.behavior === 'walk') {
        s.behavior = Math.random() > 0.5 ? 'graze' : 'idle';
        s.timer = 3 + Math.random() * 4;
        s.wanderTarget = null;
      } else if (s.behavior === 'graze') {
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
      }
    }

    // --- IDLE BEHAVIOR ---
    if (s.behavior === 'idle') {
      s.walkCycle *= 0.95;

      // Maintain facing direction
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Breathing
      if (bodyRef.current) {
        const breathScale = 1 + Math.sin(s.breathCycle) * 0.02;
        bodyRef.current.scale.set(1, breathScale, 1);
        bodyRef.current.position.y = baseBodyY;
      }

      // Random ear flicks
      if (s.earFlickTimer <= 0) {
        s.earFlickTimer = 1.5 + Math.random() * 3;
      }

      // Tail swish
      if (s.tailSwishTimer <= 0) {
        s.tailSwishTimer = 1 + Math.random() * 2;
      }

      // Head looking around
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(s.breathCycle * 0.25) * 0.2;
        headRef.current.rotation.z = Math.sin(s.breathCycle * 0.15) * 0.08;
      }

      // Legs at rest
      legRefs.current.forEach((leg) => {
        if (leg?.hip) leg.hip.rotation.z *= 0.9;
        if (leg?.upper) leg.upper.rotation.z *= 0.9;
        if (leg?.lower) leg.lower.rotation.z = THREE.MathUtils.lerp(leg.lower.rotation.z, 0.08, 0.1);
      });
    }

    // --- WALK BEHAVIOR (diagonal gait - unlike camel's pacing) ---
    if (s.behavior === 'walk' && s.wanderTarget) {
      const target = s.wanderTarget;
      const dir = target.clone().sub(pos);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 1.2) {
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
        s.wanderTarget = null;
      } else {
        dir.normalize();
        pos.add(dir.multiplyScalar(delta * DONKEY_WALK_SPEED));

        s.targetAngle = Math.atan2(dir.x, dir.z);
        s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 2.5);
        groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

        s.walkCycle += delta * 4;

        // Body bounce
        if (bodyRef.current) {
          bodyRef.current.position.y = baseBodyY + Math.abs(Math.sin(s.walkCycle * 2)) * 0.025;
          bodyRef.current.rotation.z = Math.sin(s.walkCycle) * 0.02;
        }

        // DIAGONAL GAIT: Front-left + Back-right, then Front-right + Back-left
        legRefs.current.forEach((leg, i) => {
          if (!leg?.hip || !leg?.upper || !leg?.lower || !leg?.hoof) return;

          const isFront = i < 2;
          const isLeft = i % 2 === 0;
          // Diagonal pairing: front-left with back-right
          const phase = (isFront === isLeft) ? s.walkCycle : s.walkCycle + Math.PI;

          leg.hip.rotation.z = Math.sin(phase) * 0.3;
          leg.upper.rotation.z = -Math.sin(phase) * 0.15;
          const lift = Math.sin(phase - 0.3);
          leg.lower.rotation.z = lift > 0 ? lift * 0.4 : 0.05;
          leg.hoof.rotation.z = -leg.lower.rotation.z * 0.6;
        });

        // Head bob
        if (headRef.current) {
          s.headBob = Math.sin(s.walkCycle * 2) * 0.05;
          headRef.current.rotation.z = 0.1 + s.headBob;
        }

        // Neck follows
        if (neckRef.current) {
          neckRef.current.rotation.z = Math.sin(s.walkCycle * 2) * 0.03;
        }
      }
    }

    // --- GRAZE BEHAVIOR ---
    if (s.behavior === 'graze') {
      s.grazeProgress += delta * 0.4;
      s.jawChewTimer += delta * 6;

      // Maintain facing direction
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      const headLower = Math.min(s.grazeProgress * 2.5, 1);

      // Neck bends down
      if (neckRef.current) {
        neckRef.current.rotation.z = 0.4 * headLower;
      }

      if (headRef.current) {
        headRef.current.rotation.z = 0.5 * headLower;
        headRef.current.rotation.y = Math.sin(s.grazeProgress * 1.5) * 0.25;
        headRef.current.position.y = -0.05 * headLower;
      }

      // Jaw chewing
      if (jawRef.current) {
        jawRef.current.rotation.z = Math.sin(s.jawChewTimer) * 0.1;
      }

      // Body stays level
      if (bodyRef.current) {
        bodyRef.current.position.y = baseBodyY;
      }

      // Front legs slightly forward when grazing
      legRefs.current.forEach((leg, i) => {
        if (!leg?.hip) return;
        const isFront = i < 2;
        if (isFront) {
          leg.hip.rotation.z = 0.1 * headLower;
        }
      });
    }

    // --- FLEE BEHAVIOR ---
    if (s.behavior === 'flee' && playerPosition) {
      const fleeDir = pos.clone().sub(playerPosition);
      fleeDir.y = 0;
      fleeDir.normalize();

      pos.add(fleeDir.multiplyScalar(delta * DONKEY_FLEE_SPEED));

      s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 5);
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      s.walkCycle += delta * 6;

      if (bodyRef.current) {
        bodyRef.current.position.y = baseBodyY + Math.abs(Math.sin(s.walkCycle * 2)) * 0.04;
        bodyRef.current.rotation.z = Math.sin(s.walkCycle) * 0.03;
      }

      // Faster diagonal gait
      legRefs.current.forEach((leg, i) => {
        if (!leg?.hip || !leg?.upper || !leg?.lower || !leg?.hoof) return;

        const isFront = i < 2;
        const isLeft = i % 2 === 0;
        const phase = (isFront === isLeft) ? s.walkCycle : s.walkCycle + Math.PI;

        leg.hip.rotation.z = Math.sin(phase) * 0.45;
        leg.upper.rotation.z = -Math.sin(phase) * 0.2;
        leg.lower.rotation.z = Math.max(0, Math.sin(phase - 0.3)) * 0.6;
        leg.hoof.rotation.z = -leg.lower.rotation.z * 0.5;
      });

      // Head up, ears back when fleeing
      if (headRef.current) {
        headRef.current.rotation.z = -0.15 + Math.sin(s.walkCycle * 2) * 0.1;
      }

      earRefs.current.forEach((ear) => {
        if (ear) {
          ear.rotation.x = 0.5; // Ears pinned back
        }
      });
    }

    // --- UNIVERSAL ANIMATIONS ---

    // Ear movement (donkeys have very expressive ears)
    earRefs.current.forEach((ear, i) => {
      if (ear && s.behavior !== 'flee') {
        const baseRotation = -0.3; // Ears naturally upright/forward
        const flick = s.earFlickTimer < 0.4 && i === (s.earFlickTimer > 0.2 ? 0 : 1)
          ? Math.sin(s.earFlickTimer * 25) * 0.4
          : 0;
        ear.rotation.x = baseRotation + flick + Math.sin(s.breathCycle * 0.4 + i * 2) * 0.1;
        ear.rotation.z = (i === 0 ? 0.15 : -0.15) + Math.sin(s.breathCycle * 0.3 + i) * 0.08;
      }
    });

    // Tail swishing (donkeys swish at flies frequently)
    if (tailRef.current) {
      const swish = s.tailSwishTimer < 0.6
        ? Math.sin(s.tailSwishTimer * 18) * 0.5
        : Math.sin(s.breathCycle * 0.6) * 0.15;
      tailRef.current.rotation.x = 0.2 + Math.abs(swish) * 0.2;
      tailRef.current.rotation.z = swish;
    }

    // Mane slight movement
    if (maneRef.current) {
      maneRef.current.rotation.z = Math.sin(s.breathCycle * 0.5) * 0.03;
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  const legLen = appearance.legLength;
  const bodyLen = appearance.bodyLength;
  const earLen = appearance.earLength;

  return (
    <group
      ref={groupRef}
      position={spawnPosition}
      scale={appearance.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={`${appearance.colors.name} Donkey`}
          lines={[
            packConfig ? 'Carrying goods' : 'Unburdened',
            'Stubborn but reliable',
            'Beast of burden'
          ]}
          offset={[0, 1.8 / appearance.scale, 0]}
        />
      )}

      {/* Main body group */}
      <group ref={bodyRef} position={[0, 1.0 * legLen, 0]}>

        {/* === TORSO === */}
        {/* Main barrel body */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.28, 0.7 * bodyLen, 8, 14]} />
          {bodyMaterial}
        </mesh>

        {/* Chest */}
        <mesh position={[0.32 * bodyLen, 0, 0]} castShadow>
          <sphereGeometry args={[0.26, 10, 8]} />
          {bodyMaterial}
        </mesh>

        {/* Hindquarters */}
        <mesh position={[-0.38 * bodyLen, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.28, 10, 8]} />
          {accentMaterial}
        </mesh>

        {/* Belly */}
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.22, 0.5 * bodyLen, 6, 10]} />
          {accentMaterial}
        </mesh>

        {/* === CROSS MARKING (characteristic donkey feature) === */}
        <mesh position={[0.1, 0.28, 0]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.06]} />
          {darkMaterial}
        </mesh>
        <mesh position={[0.1, 0.28, 0]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.03, 0.35]} />
          {darkMaterial}
        </mesh>

        {/* === NECK === */}
        <group ref={neckRef} position={[0.4 * bodyLen, 0.12, 0]}>
          {/* Neck base */}
          <mesh position={[0.1, 0.15, 0]} rotation={[0, 0, -0.6]} castShadow>
            <capsuleGeometry args={[0.12, 0.3, 6, 10]} />
            {bodyMaterial}
          </mesh>

          {/* Neck upper */}
          <mesh position={[0.18, 0.32, 0]} rotation={[0, 0, -0.4]} castShadow>
            <capsuleGeometry args={[0.1, 0.22, 6, 10]} />
            {bodyMaterial}
          </mesh>

          {/* === MANE (upright, stiff like donkeys have) === */}
          <group ref={maneRef} position={[0.08, 0.25, 0]}>
            {[0, 0.08, 0.16, 0.24].map((offset, i) => (
              <mesh key={`mane-${i}`} position={[-0.02 + offset * 0.3, offset, 0]} rotation={[0, 0, -0.3 - i * 0.1]} castShadow>
                <boxGeometry args={[0.04, 0.12 - i * 0.015, 0.03]} />
                {darkMaterial}
              </mesh>
            ))}
          </group>

          {/* === HEAD === */}
          <group ref={headRef} position={[0.22, 0.42, 0]}>
            {/* Skull */}
            <mesh castShadow>
              <boxGeometry args={[0.2, 0.12, 0.12]} />
              {bodyMaterial}
            </mesh>

            {/* Forehead */}
            <mesh position={[-0.04, 0.04, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 6]} />
              {bodyMaterial}
            </mesh>

            {/* Long muzzle (donkeys have longer faces than horses) */}
            <mesh position={[0.16, -0.02, 0]} castShadow>
              <boxGeometry args={[0.18, 0.1, 0.1]} />
              {muzzleMaterial}
            </mesh>

            {/* Nose/nostrils area */}
            <mesh position={[0.26, -0.01, 0]} castShadow>
              <sphereGeometry args={[0.05, 8, 6]} />
              {muzzleMaterial}
            </mesh>

            {/* Nostrils */}
            <mesh position={[0.3, 0, 0.025]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
            </mesh>
            <mesh position={[0.3, 0, -0.025]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
            </mesh>

            {/* Lower jaw */}
            <mesh ref={jawRef} position={[0.12, -0.06, 0]} castShadow>
              <boxGeometry args={[0.14, 0.04, 0.08]} />
              {accentMaterial}
            </mesh>

            {/* Eyes */}
            <mesh position={[0.02, 0.03, 0.06]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
            <mesh position={[0.02, 0.03, -0.06]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>

            {/* Eye whites (visible on donkeys) */}
            <mesh position={[0.015, 0.035, 0.062]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshStandardMaterial color="#e8e0d8" roughness={0.4} />
            </mesh>
            <mesh position={[0.015, 0.035, -0.062]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshStandardMaterial color="#e8e0d8" roughness={0.4} />
            </mesh>

            {/* === EARS (very long and expressive) === */}
            <group
              ref={(el) => { if (el) earRefs.current[0] = el; }}
              position={[-0.06, 0.08, 0.05]}
            >
              {/* Ear base */}
              <mesh rotation={[-0.3, 0, 0.2]} castShadow>
                <coneGeometry args={[0.035, 0.18 * earLen, 6]} />
                {accentMaterial}
              </mesh>
              {/* Ear tip (darker) */}
              <mesh position={[0, 0.12 * earLen, 0.01]} rotation={[-0.3, 0, 0.2]} castShadow>
                <coneGeometry args={[0.02, 0.08 * earLen, 6]} />
                {darkMaterial}
              </mesh>
              {/* Inner ear (pink-ish) */}
              <mesh position={[0.01, 0.05 * earLen, 0]} rotation={[-0.2, 0, 0.3]} castShadow>
                <planeGeometry args={[0.025, 0.1 * earLen]} />
                <meshStandardMaterial color="#c8a8a0" roughness={0.9} side={THREE.DoubleSide} />
              </mesh>
            </group>

            <group
              ref={(el) => { if (el) earRefs.current[1] = el; }}
              position={[-0.06, 0.08, -0.05]}
            >
              <mesh rotation={[-0.3, 0, -0.2]} castShadow>
                <coneGeometry args={[0.035, 0.18 * earLen, 6]} />
                {accentMaterial}
              </mesh>
              <mesh position={[0, 0.12 * earLen, -0.01]} rotation={[-0.3, 0, -0.2]} castShadow>
                <coneGeometry args={[0.02, 0.08 * earLen, 6]} />
                {darkMaterial}
              </mesh>
              <mesh position={[-0.01, 0.05 * earLen, 0]} rotation={[-0.2, 0, -0.3]} castShadow>
                <planeGeometry args={[0.025, 0.1 * earLen]} />
                <meshStandardMaterial color="#c8a8a0" roughness={0.9} side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* Forelock (tuft of mane on forehead) */}
            <mesh position={[-0.08, 0.06, 0]} rotation={[0.2, 0, -0.3]} castShadow>
              <boxGeometry args={[0.04, 0.08, 0.04]} />
              {darkMaterial}
            </mesh>
          </group>
        </group>

        {/* === TAIL (with tuft at end) === */}
        <group ref={tailRef} position={[-0.55 * bodyLen, 0.08, 0]} rotation={[0.2, 0, 0]}>
          {/* Tail base */}
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.025, 0.15, 6]} />
            {accentMaterial}
          </mesh>
          {/* Tail middle */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.015, 0.15, 6]} />
            {accentMaterial}
          </mesh>
          {/* Tail tuft (donkeys have tufted tails like cows) */}
          <mesh position={[0, -0.22, 0]} castShadow>
            <sphereGeometry args={[0.04, 6, 6]} />
            {darkMaterial}
          </mesh>
          <mesh position={[0, -0.28, 0]} castShadow>
            <coneGeometry args={[0.035, 0.08, 6]} />
            {darkMaterial}
          </mesh>
        </group>

        {/* === LEGS === */}
        {[
          { x: 0.28 * bodyLen, z: 0.14, front: true, left: true },
          { x: 0.28 * bodyLen, z: -0.14, front: true, left: false },
          { x: -0.32 * bodyLen, z: 0.14, front: false, left: true },
          { x: -0.32 * bodyLen, z: -0.14, front: false, left: false },
        ].map((legPos, i) => (
          <group key={`leg-${i}`} position={[legPos.x, -0.2, legPos.z]}>
            {/* Hip joint */}
            <group ref={(el) => {
              if (el && !legRefs.current[i]) {
                legRefs.current[i] = { hip: el, upper: null as any, lower: null as any, hoof: null as any };
              } else if (el && legRefs.current[i]) {
                legRefs.current[i].hip = el;
              }
            }}>
              <mesh castShadow>
                <sphereGeometry args={[0.07, 8, 6]} />
                {bodyMaterial}
              </mesh>

              {/* Upper leg */}
              <group
                position={[0, -0.18 * legLen, 0]}
                ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].upper = el; }}
              >
                <mesh castShadow>
                  <capsuleGeometry args={[0.05, 0.25 * legLen, 6, 8]} />
                  {bodyMaterial}
                </mesh>

                {/* Knee */}
                <mesh position={[0, -0.15 * legLen, 0]} castShadow>
                  <sphereGeometry args={[0.045, 6, 6]} />
                  {accentMaterial}
                </mesh>

                {/* Lower leg */}
                <group
                  position={[0, -0.28 * legLen, 0]}
                  ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].lower = el; }}
                >
                  <mesh castShadow>
                    <capsuleGeometry args={[0.035, 0.28 * legLen, 6, 8]} />
                    {accentMaterial}
                  </mesh>

                  {/* Fetlock */}
                  <mesh position={[0, -0.16 * legLen, 0]} castShadow>
                    <sphereGeometry args={[0.032, 6, 6]} />
                    {darkMaterial}
                  </mesh>

                  {/* Hoof */}
                  <group
                    position={[0, -0.24 * legLen, 0]}
                    ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].hoof = el; }}
                  >
                    <mesh castShadow>
                      <cylinderGeometry args={[0.04, 0.045, 0.05, 8]} />
                      {darkMaterial}
                    </mesh>
                    {/* Hoof bottom */}
                    <mesh position={[0, -0.025, 0]} castShadow>
                      <cylinderGeometry args={[0.045, 0.04, 0.015, 8]} />
                      <meshStandardMaterial color="#2a2218" roughness={0.95} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        ))}

        {/* === PACK/LOAD (if present) === */}
        {packConfig && (
          <group position={[0, 0.3, 0]}>
            {/* Saddle blanket */}
            {packConfig.hasBlanket && (
              <mesh position={[0, -0.02, 0]} castShadow>
                <boxGeometry args={[0.6 * bodyLen, 0.06, 0.5]} />
                <meshStandardMaterial color={packConfig.clothColor} roughness={0.95} />
              </mesh>
            )}

            {/* Girth strap */}
            <mesh position={[0.1, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.28, 0.02, 6, 16]} />
              <meshStandardMaterial color={packConfig.ropeColor} roughness={0.9} />
            </mesh>

            {packConfig.loadType === 0 && (
              /* Saddlebags */
              <>
                <mesh position={[0, 0.05, 0.32]} castShadow>
                  <boxGeometry args={[0.35, 0.22, 0.18]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.92} />
                </mesh>
                <mesh position={[0, 0.05, -0.32]} castShadow>
                  <boxGeometry args={[0.35, 0.22, 0.18]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.92} />
                </mesh>
                <mesh position={[0, 0.16, 0]} castShadow>
                  <boxGeometry args={[0.25, 0.04, 0.7]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.9} />
                </mesh>
              </>
            )}

            {packConfig.loadType === 1 && (
              /* Firewood bundle */
              <>
                <group position={[0, 0.15, 0]}>
                  {/* Bundle of sticks */}
                  {[-0.08, 0, 0.08].map((zOff, i) => (
                    <group key={`wood-row-${i}`}>
                      {[-0.12, -0.04, 0.04, 0.12].map((xOff, j) => (
                        <mesh key={`stick-${i}-${j}`} position={[xOff, i * 0.04, zOff]} rotation={[0, 0, Math.PI / 2 + (j % 2) * 0.1]} castShadow>
                          <cylinderGeometry args={[0.02, 0.025, 0.35, 6]} />
                          <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
                        </mesh>
                      ))}
                    </group>
                  ))}
                </group>
                {/* Rope binding */}
                <mesh position={[0.08, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.15, 0.015, 4, 12]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.85} />
                </mesh>
                <mesh position={[-0.08, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.15, 0.015, 4, 12]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.85} />
                </mesh>
              </>
            )}

            {packConfig.loadType === 2 && (
              /* Baskets */
              <>
                <mesh position={[0.05, 0.12, 0.28]} castShadow>
                  <cylinderGeometry args={[0.12, 0.1, 0.2, 8]} />
                  <meshStandardMaterial color="#8a7a5a" roughness={0.95} />
                </mesh>
                <mesh position={[-0.05, 0.12, -0.28]} castShadow>
                  <cylinderGeometry args={[0.12, 0.1, 0.2, 8]} />
                  <meshStandardMaterial color="#8a7a5a" roughness={0.95} />
                </mesh>
                {/* Basket contents (vegetables/goods poking out) */}
                <mesh position={[0.05, 0.24, 0.28]} castShadow>
                  <sphereGeometry args={[0.06, 6, 6]} />
                  <meshStandardMaterial color="#7a9a5a" roughness={0.9} />
                </mesh>
                <mesh position={[-0.05, 0.24, -0.28]} castShadow>
                  <sphereGeometry args={[0.06, 6, 6]} />
                  <meshStandardMaterial color="#9a7a4a" roughness={0.9} />
                </mesh>
                {/* Connecting pole */}
                <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.65, 6]} />
                  <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
                </mesh>
              </>
            )}
          </group>
        )}
      </group>
    </group>
  );
};

export default Donkey;
