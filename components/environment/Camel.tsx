import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from '../../utils/procedural';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from './shared/HoverSystem';

// Camel behavior constants
const CAMEL_WALK_SPEED = 0.4;
const CAMEL_FLEE_SPEED = 0.8;
const CAMEL_FLEE_DISTANCE = 4.0; // Start fleeing when player is this close
const CAMEL_SAFE_DISTANCE = 8.0; // Stop fleeing when player is this far

// Camel color variants - authentic Middle Eastern camel colors
const CAMEL_COLORS = [
  { name: 'Sandy', body: '#d4a574', accent: '#c49464', dark: '#8a6644', woolly: '#e8c89a' },
  { name: 'Tawny', body: '#c8956a', accent: '#b8855a', dark: '#7a5a3a', woolly: '#dab58a' },
  { name: 'Dun', body: '#bfa07a', accent: '#a8906a', dark: '#6a5a4a', woolly: '#d4c0a0' },
  { name: 'Cream', body: '#e8d4b8', accent: '#d8c4a8', dark: '#9a8a7a', woolly: '#f4e8d8' },
  { name: 'Russet', body: '#a67c52', accent: '#966c42', dark: '#5a4028', woolly: '#c8a878' },
];

// Pack/load color options
const PACK_CLOTH_COLORS = ['#8b4513', '#4a6741', '#8b0000', '#1e3a5f', '#5c4033', '#6b3fa0'];
const PACK_BUNDLE_COLORS = ['#d4a574', '#8b7355', '#a0522d', '#c4a484', '#deb887'];
const PACK_ROPE_COLORS = ['#6b4423', '#8b7355', '#5c4033'];

type CamelBehavior = 'idle' | 'walk' | 'graze' | 'flee';

interface CamelProps {
  seed?: number;
  spawnPosition?: [number, number, number];
  playerPosition?: THREE.Vector3;
}

export const Camel: React.FC<CamelProps> = ({
  seed = 0,
  spawnPosition = [0, 0, 0],
  playerPosition
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const neckRefs = useRef<THREE.Group[]>([]);
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const legRefs = useRef<{ hip: THREE.Group; upper: THREE.Group; lower: THREE.Group; hoof: THREE.Group }[]>([]);
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<THREE.Mesh[]>([]);

  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  // Animation state
  const state = useRef({
    behavior: 'idle' as CamelBehavior,
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
    bodySway: 0,
  });

  // Appearance configuration
  const appearance = useMemo(() => {
    const rng = (offset: number) => seededRandom(seed + offset);
    const colorVariant = CAMEL_COLORS[Math.floor(rng(10) * CAMEL_COLORS.length)];
    const scale = 1.0 + rng(20) * 0.5; // 1.0 - 1.5 (current smallest to 1.5x larger)
    const humpSize = 0.85 + rng(30) * 0.3; // Hump variation
    const neckLength = 0.95 + rng(40) * 0.15; // Neck length variation
    const legLength = 0.95 + rng(50) * 0.1;

    return {
      colors: colorVariant,
      scale,
      humpSize,
      neckLength,
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
    const loadType = Math.floor(rng(40) * 3); // 0: saddlebags, 1: large bundles, 2: mixed cargo
    const hasBlanket = rng(50) > 0.3;
    const hasWaterSkins = rng(60) > 0.6;

    return {
      clothColor,
      bundleColor,
      ropeColor,
      loadType,
      hasBlanket,
      hasWaterSkins,
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

  const woollyMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.woolly} roughness={0.98} />
  ), [appearance.colors.woolly]);

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;

    const s = state.current;
    const pos = groupRef.current.position;

    // Update timers
    s.timer -= delta;
    s.breathCycle += delta * 1.2;
    s.earFlickTimer -= delta;
    s.tailSwishTimer -= delta;

    // Check for player proximity - flee behavior
    if (playerPosition) {
      const distToPlayer = pos.distanceTo(playerPosition);

      if (distToPlayer < CAMEL_FLEE_DISTANCE && s.behavior !== 'flee') {
        // Start fleeing
        s.behavior = 'flee';
        s.timer = 5;
        // Set flee direction away from player
        const fleeDir = pos.clone().sub(playerPosition).normalize();
        s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      } else if (s.behavior === 'flee' && distToPlayer > CAMEL_SAFE_DISTANCE) {
        // Stop fleeing
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
      }
    }

    // Behavior state machine
    if (s.timer <= 0 && s.behavior !== 'flee') {
      const rand = Math.random();
      if (s.behavior === 'idle') {
        if (rand > 0.5) {
          s.behavior = 'walk';
          s.timer = 6 + Math.random() * 8;
          // Pick random wander target
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 12;
          s.wanderTarget = new THREE.Vector3(
            spawnPosition[0] + Math.cos(angle) * dist,
            0,
            spawnPosition[2] + Math.sin(angle) * dist
          );
        } else {
          s.behavior = 'graze';
          s.timer = 4 + Math.random() * 5;
          s.grazeProgress = 0;
        }
      } else if (s.behavior === 'walk') {
        s.behavior = Math.random() > 0.6 ? 'graze' : 'idle';
        s.timer = 3 + Math.random() * 4;
        s.wanderTarget = null;
      } else if (s.behavior === 'graze') {
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
      }
    }

    // --- IDLE BEHAVIOR ---
    if (s.behavior === 'idle') {
      s.walkCycle *= 0.95; // Decay walk cycle

      // Maintain facing direction
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Subtle breathing
      if (bodyRef.current) {
        const breathScale = 1 + Math.sin(s.breathCycle) * 0.015;
        bodyRef.current.scale.set(1, breathScale, 1);
      }

      // Occasional ear flick
      if (s.earFlickTimer <= 0) {
        s.earFlickTimer = 2 + Math.random() * 4;
      }

      // Occasional tail swish
      if (s.tailSwishTimer <= 0) {
        s.tailSwishTimer = 1.5 + Math.random() * 3;
      }

      // Head slowly looking around
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(s.breathCycle * 0.3) * 0.15;
        headRef.current.rotation.z = 0.1 + Math.sin(s.breathCycle * 0.2) * 0.05;
      }

      // Legs at rest
      legRefs.current.forEach((leg) => {
        if (leg?.hip) {
          leg.hip.rotation.z *= 0.9;
        }
        if (leg?.upper) {
          leg.upper.rotation.z *= 0.9;
        }
        if (leg?.lower) {
          leg.lower.rotation.z = THREE.MathUtils.lerp(leg.lower.rotation.z, 0.1, 0.1);
        }
      });
    }

    // --- WALK BEHAVIOR (with proper pacing gait) ---
    if (s.behavior === 'walk' && s.wanderTarget) {
      const target = s.wanderTarget;
      const dir = target.clone().sub(pos);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 1.5) {
        s.behavior = 'idle';
        s.timer = 2 + Math.random() * 3;
        s.wanderTarget = null;
      } else {
        dir.normalize();

        // Move toward target
        pos.add(dir.multiplyScalar(delta * CAMEL_WALK_SPEED));

        // Face direction of travel (model faces +X, so offset by -π/2)
        s.targetAngle = Math.atan2(dir.x, dir.z);
        s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 2);
        groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

        // Animate walk cycle
        s.walkCycle += delta * 3.5;

        // Body sway (side to side) - characteristic of pacing gait
        s.bodySway = Math.sin(s.walkCycle) * 0.04;
        if (bodyRef.current) {
          bodyRef.current.rotation.z = s.bodySway;
          // Add bounce to base height (1.4 * legLen), don't replace it
          const baseBodyY = 1.4 * appearance.legLength;
          bodyRef.current.position.y = baseBodyY + Math.abs(Math.sin(s.walkCycle * 2)) * 0.03;
        }

        // PACING GAIT: Both legs on same side move together
        // Left side (indices 0, 2) vs Right side (indices 1, 3)
        legRefs.current.forEach((leg, i) => {
          if (!leg?.hip || !leg?.upper || !leg?.lower || !leg?.hoof) return;

          const isLeft = i % 2 === 0;
          const isFront = i < 2;
          const phase = isLeft ? s.walkCycle : s.walkCycle + Math.PI;

          // Hip rotation (forward/back swing) - rotate around Z for forward motion
          const hipSwing = Math.sin(phase) * 0.35;
          leg.hip.rotation.z = hipSwing;

          // Upper leg (slight counter-rotation)
          leg.upper.rotation.z = -hipSwing * 0.3;

          // Lower leg (knee bend during lift)
          const liftPhase = Math.sin(phase - 0.3);
          leg.lower.rotation.z = liftPhase > 0 ? liftPhase * 0.5 : 0.05;

          // Hoof (stays level-ish)
          leg.hoof.rotation.z = -leg.lower.rotation.z * 0.5;
        });

        // Head bob follows body rhythm
        if (headRef.current) {
          s.headBob = Math.sin(s.walkCycle * 2) * 0.06;
          headRef.current.rotation.z = 0.15 + s.headBob;
          headRef.current.position.y = Math.sin(s.walkCycle * 2) * 0.02;
        }

        // Neck segments follow with delay
        neckRefs.current.forEach((neck, i) => {
          if (neck) {
            const delay = i * 0.15;
            neck.rotation.z = Math.sin(s.walkCycle * 2 - delay) * 0.03;
            neck.rotation.x = Math.sin(s.walkCycle - delay) * 0.02;
          }
        });
      }
    }

    // --- GRAZE BEHAVIOR ---
    if (s.behavior === 'graze') {
      s.grazeProgress += delta * 0.5;
      s.jawChewTimer += delta * 8;

      // Maintain facing direction
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Lower head to ground
      const headLower = Math.min(s.grazeProgress * 2, 1);

      // Animate neck bending down
      neckRefs.current.forEach((neck, i) => {
        if (neck) {
          const bendAmount = headLower * (0.2 + i * 0.15);
          neck.rotation.z = bendAmount;
        }
      });

      if (headRef.current) {
        headRef.current.rotation.z = 0.6 * headLower;
        // Small side-to-side grazing motion
        headRef.current.rotation.y = Math.sin(s.grazeProgress * 2) * 0.2;
      }

      // Jaw chewing motion
      if (jawRef.current) {
        jawRef.current.rotation.z = Math.sin(s.jawChewTimer) * 0.08;
      }

      // Occasional step while grazing
      if (Math.sin(s.grazeProgress * 1.5) > 0.95) {
        const stepLeg = Math.floor(s.grazeProgress * 2) % 4;
        if (legRefs.current[stepLeg]?.hip) {
          legRefs.current[stepLeg].hip.rotation.z = 0.15;
        }
      }
    }

    // --- FLEE BEHAVIOR ---
    if (s.behavior === 'flee' && playerPosition) {
      // Move away from player
      const fleeDir = pos.clone().sub(playerPosition);
      fleeDir.y = 0;
      fleeDir.normalize();

      pos.add(fleeDir.multiplyScalar(delta * CAMEL_FLEE_SPEED));

      // Face away from player
      s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 4);
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Faster walk cycle
      s.walkCycle += delta * 5.5;

      // More pronounced body motion
      s.bodySway = Math.sin(s.walkCycle) * 0.06;
      if (bodyRef.current) {
        bodyRef.current.rotation.z = s.bodySway;
        // Add bounce to base height, don't replace it
        const baseBodyY = 1.4 * appearance.legLength;
        bodyRef.current.position.y = baseBodyY + Math.abs(Math.sin(s.walkCycle * 2)) * 0.05;
      }

      // Faster leg animation (same pacing pattern)
      legRefs.current.forEach((leg, i) => {
        if (!leg?.hip || !leg?.upper || !leg?.lower || !leg?.hoof) return;

        const isLeft = i % 2 === 0;
        const phase = isLeft ? s.walkCycle : s.walkCycle + Math.PI;

        leg.hip.rotation.z = Math.sin(phase) * 0.5;
        leg.upper.rotation.z = -Math.sin(phase) * 0.15;
        leg.lower.rotation.z = Math.max(0, Math.sin(phase - 0.3)) * 0.7;
        leg.hoof.rotation.z = -leg.lower.rotation.z * 0.5;
      });

      // Head held higher when fleeing, ears back
      if (headRef.current) {
        headRef.current.rotation.z = -0.1 + Math.sin(s.walkCycle * 2) * 0.08;
      }

      earRefs.current.forEach((ear) => {
        if (ear) {
          ear.rotation.x = 0.4; // Ears back
        }
      });
    }

    // --- UNIVERSAL ANIMATIONS ---

    // Ear flicking (random twitches)
    earRefs.current.forEach((ear, i) => {
      if (ear && s.behavior !== 'flee') {
        const baseRotation = 0.15;
        const flick = s.earFlickTimer < 0.3 && i === (s.earFlickTimer > 0.15 ? 0 : 1)
          ? Math.sin(s.earFlickTimer * 30) * 0.3
          : 0;
        ear.rotation.x = baseRotation + flick;
        ear.rotation.z = (i === 0 ? 0.2 : -0.2) + Math.sin(s.breathCycle * 0.5 + i) * 0.05;
      }
    });

    // Tail swishing
    if (tailRef.current) {
      const swish = s.tailSwishTimer < 0.5
        ? Math.sin(s.tailSwishTimer * 15) * 0.4
        : Math.sin(s.breathCycle * 0.8) * 0.1;
      tailRef.current.rotation.x = 0.3 + swish * 0.3;
      tailRef.current.rotation.z = swish;
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  // Geometry constants
  const legLen = appearance.legLength;
  const neckLen = appearance.neckLength;

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
          title={`${appearance.colors.name} Camel`}
          lines={[
            packConfig ? 'Laden with goods' : 'Unburdened',
            'Ship of the desert',
            'Patient and strong'
          ]}
          offset={[0, 2.5 / appearance.scale, 0]}
        />
      )}

      {/* Main body group */}
      <group ref={bodyRef} position={[0, 1.4 * legLen, 0]}>

        {/* === TORSO === */}
        {/* Main body - elongated barrel shape */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.35, 1.0, 8, 16]} />
          {bodyMaterial}
        </mesh>

        {/* Chest (front body mass) */}
        <mesh position={[0.45, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.32, 10, 8]} />
          {bodyMaterial}
        </mesh>

        {/* Hindquarters */}
        <mesh position={[-0.5, 0, 0]} castShadow>
          <sphereGeometry args={[0.34, 10, 8]} />
          {accentMaterial}
        </mesh>

        {/* Belly (underneath) */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
          {accentMaterial}
        </mesh>

        {/* === HUMP === */}
        <group position={[0.05, 0.35, 0]} scale={[appearance.humpSize, appearance.humpSize, appearance.humpSize]}>
          {/* Main hump mass */}
          <mesh castShadow>
            <sphereGeometry args={[0.32, 10, 10]} />
            {bodyMaterial}
          </mesh>
          {/* Hump peak */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <sphereGeometry args={[0.22, 8, 8]} />
            {accentMaterial}
          </mesh>
          {/* Slight forward lean to hump */}
          <mesh position={[0.1, 0.05, 0]} rotation={[0, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.15, 0.2, 6, 8]} />
            {bodyMaterial}
          </mesh>
        </group>

        {/* === WOOLLY PATCHES === */}
        {/* Chest wool */}
        <mesh position={[0.55, -0.1, 0]} castShadow>
          <sphereGeometry args={[0.18, 8, 6]} />
          {woollyMaterial}
        </mesh>
        {/* Shoulder wool patches */}
        <mesh position={[0.3, 0.15, 0.25]} castShadow>
          <sphereGeometry args={[0.12, 6, 6]} />
          {woollyMaterial}
        </mesh>
        <mesh position={[0.3, 0.15, -0.25]} castShadow>
          <sphereGeometry args={[0.12, 6, 6]} />
          {woollyMaterial}
        </mesh>

        {/* === NECK (3 segments for articulation) === */}
        <group position={[0.6, 0.2, 0]}>
          {/* Neck base */}
          <group ref={(el) => { if (el) neckRefs.current[0] = el; }}>
            <mesh position={[0.15, 0.2, 0]} rotation={[0, 0, -0.8]} castShadow>
              <capsuleGeometry args={[0.14, 0.35 * neckLen, 6, 10]} />
              {bodyMaterial}
            </mesh>

            {/* Neck middle */}
            <group position={[0.25, 0.45 * neckLen, 0]} ref={(el) => { if (el) neckRefs.current[1] = el; }}>
              <mesh rotation={[0, 0, -0.5]} castShadow>
                <capsuleGeometry args={[0.11, 0.35 * neckLen, 6, 10]} />
                {bodyMaterial}
              </mesh>

              {/* Neck top / throat */}
              <group position={[0.15, 0.35 * neckLen, 0]} ref={(el) => { if (el) neckRefs.current[2] = el; }}>
                <mesh rotation={[0, 0, -0.2]} castShadow>
                  <capsuleGeometry args={[0.09, 0.25 * neckLen, 6, 10]} />
                  {accentMaterial}
                </mesh>

                {/* Throat wool tuft */}
                <mesh position={[0, -0.05, 0.08]} castShadow>
                  <sphereGeometry args={[0.06, 6, 6]} />
                  {woollyMaterial}
                </mesh>

                {/* === HEAD === */}
                <group ref={headRef} position={[0.12, 0.32 * neckLen, 0]}>
                  {/* Skull */}
                  <mesh castShadow>
                    <boxGeometry args={[0.22, 0.14, 0.14]} />
                    {bodyMaterial}
                  </mesh>

                  {/* Forehead bulge */}
                  <mesh position={[-0.05, 0.06, 0]} castShadow>
                    <sphereGeometry args={[0.08, 8, 6]} />
                    {bodyMaterial}
                  </mesh>

                  {/* Muzzle */}
                  <mesh position={[0.18, -0.02, 0]} castShadow>
                    <boxGeometry args={[0.18, 0.1, 0.1]} />
                    {accentMaterial}
                  </mesh>

                  {/* Split upper lip (characteristic) */}
                  <mesh position={[0.28, -0.04, 0.025]} castShadow>
                    <sphereGeometry args={[0.025, 6, 6]} />
                    {darkMaterial}
                  </mesh>
                  <mesh position={[0.28, -0.04, -0.025]} castShadow>
                    <sphereGeometry args={[0.025, 6, 6]} />
                    {darkMaterial}
                  </mesh>

                  {/* Lower jaw (animated) */}
                  <mesh ref={jawRef} position={[0.15, -0.07, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.04, 0.08]} />
                    {darkMaterial}
                  </mesh>

                  {/* Nostrils */}
                  <mesh position={[0.27, 0, 0.03]}>
                    <sphereGeometry args={[0.015, 6, 6]} />
                    <meshStandardMaterial color="#2a1a0a" roughness={0.5} />
                  </mesh>
                  <mesh position={[0.27, 0, -0.03]}>
                    <sphereGeometry args={[0.015, 6, 6]} />
                    <meshStandardMaterial color="#2a1a0a" roughness={0.5} />
                  </mesh>

                  {/* Eyes */}
                  <mesh position={[0.02, 0.04, 0.07]}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshStandardMaterial color="#1a0a00" roughness={0.3} />
                  </mesh>
                  <mesh position={[0.02, 0.04, -0.07]}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshStandardMaterial color="#1a0a00" roughness={0.3} />
                  </mesh>

                  {/* Eyelids/brow ridge */}
                  <mesh position={[0, 0.06, 0.065]} rotation={[0.3, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.02, 0.04]} />
                    {accentMaterial}
                  </mesh>
                  <mesh position={[0, 0.06, -0.065]} rotation={[-0.3, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.02, 0.04]} />
                    {accentMaterial}
                  </mesh>

                  {/* Ears */}
                  <mesh
                    ref={(el) => { if (el) earRefs.current[0] = el; }}
                    position={[-0.08, 0.08, 0.06]}
                    rotation={[0.15, 0, 0.2]}
                    castShadow
                  >
                    <coneGeometry args={[0.03, 0.1, 6]} />
                    {accentMaterial}
                  </mesh>
                  <mesh
                    ref={(el) => { if (el) earRefs.current[1] = el; }}
                    position={[-0.08, 0.08, -0.06]}
                    rotation={[0.15, 0, -0.2]}
                    castShadow
                  >
                    <coneGeometry args={[0.03, 0.1, 6]} />
                    {accentMaterial}
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* === TAIL === */}
        <group ref={tailRef} position={[-0.75, 0.1, 0]} rotation={[0.3, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.02, 0.35, 6]} />
            {accentMaterial}
          </mesh>
          {/* Tail tuft */}
          <mesh position={[0, -0.2, 0]} castShadow>
            <sphereGeometry args={[0.05, 6, 6]} />
            {darkMaterial}
          </mesh>
        </group>

        {/* === LEGS (4 with hip, upper, lower, hoof segments) === */}
        {[
          { x: 0.35, z: 0.2, front: true, left: true },   // Front left
          { x: 0.35, z: -0.2, front: true, left: false }, // Front right
          { x: -0.45, z: 0.2, front: false, left: true }, // Back left
          { x: -0.45, z: -0.2, front: false, left: false }, // Back right
        ].map((legPos, i) => (
          <group key={`leg-${i}`} position={[legPos.x, -0.25, legPos.z]}>
            {/* Hip joint */}
            <group ref={(el) => {
              if (el && !legRefs.current[i]) {
                legRefs.current[i] = { hip: el, upper: null as any, lower: null as any, hoof: null as any };
              } else if (el && legRefs.current[i]) {
                legRefs.current[i].hip = el;
              }
            }}>
              <mesh castShadow>
                <sphereGeometry args={[0.1, 8, 6]} />
                {bodyMaterial}
              </mesh>

              {/* Upper leg */}
              <group
                position={[0, -0.25 * legLen, 0]}
                ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].upper = el; }}
              >
                <mesh castShadow>
                  <capsuleGeometry args={[0.07, 0.35 * legLen, 6, 8]} />
                  {bodyMaterial}
                </mesh>

                {/* Knee/elbow */}
                <mesh position={[0, -0.22 * legLen, 0]} castShadow>
                  <sphereGeometry args={[0.065, 6, 6]} />
                  {accentMaterial}
                </mesh>

                {/* Lower leg */}
                <group
                  position={[0, -0.4 * legLen, 0]}
                  ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].lower = el; }}
                >
                  <mesh castShadow>
                    <capsuleGeometry args={[0.05, 0.4 * legLen, 6, 8]} />
                    {accentMaterial}
                  </mesh>

                  {/* Fetlock (ankle) */}
                  <mesh position={[0, -0.22 * legLen, 0]} castShadow>
                    <sphereGeometry args={[0.045, 6, 6]} />
                    {darkMaterial}
                  </mesh>

                  {/* Hoof/foot pad group */}
                  <group
                    position={[0, -0.35 * legLen, 0]}
                    ref={(el) => { if (el && legRefs.current[i]) legRefs.current[i].hoof = el; }}
                  >
                    {/* Two-toed foot pad */}
                    <mesh position={[0.02, 0, 0]} castShadow>
                      <boxGeometry args={[0.06, 0.04, 0.08]} />
                      {darkMaterial}
                    </mesh>
                    <mesh position={[-0.02, 0, 0]} castShadow>
                      <boxGeometry args={[0.06, 0.04, 0.08]} />
                      {darkMaterial}
                    </mesh>
                    {/* Padded sole */}
                    <mesh position={[0, -0.02, 0]} castShadow>
                      <cylinderGeometry args={[0.06, 0.07, 0.02, 8]} />
                      <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        ))}

        {/* === PACK/LOAD (if present) === */}
        {packConfig && (
          <group position={[0.05, 0.55, 0]}>
            {/* Saddle blanket */}
            {packConfig.hasBlanket && (
              <mesh position={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.9, 0.08, 0.65]} />
                <meshStandardMaterial color={packConfig.clothColor} roughness={0.95} />
              </mesh>
            )}

            {/* Girth strap */}
            <mesh position={[0.2, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.35, 0.025, 6, 16]} />
              <meshStandardMaterial color={packConfig.ropeColor} roughness={0.9} />
            </mesh>

            {packConfig.loadType === 0 && (
              /* Saddlebags */
              <>
                <mesh position={[-0.15, 0.1, 0.4]} castShadow>
                  <boxGeometry args={[0.4, 0.3, 0.25]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.92} />
                </mesh>
                <mesh position={[-0.15, 0.1, -0.4]} castShadow>
                  <boxGeometry args={[0.4, 0.3, 0.25]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.92} />
                </mesh>
                {/* Connecting strap */}
                <mesh position={[-0.15, 0.25, 0]} castShadow>
                  <boxGeometry args={[0.3, 0.05, 0.9]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.9} />
                </mesh>
              </>
            )}

            {packConfig.loadType === 1 && (
              /* Large wrapped bundles */
              <>
                <mesh position={[0, 0.2, 0.35]} rotation={[0, 0, 0.1]} castShadow>
                  <capsuleGeometry args={[0.15, 0.5, 6, 10]} />
                  <meshStandardMaterial color={packConfig.clothColor} roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.2, -0.35]} rotation={[0, 0, -0.1]} castShadow>
                  <capsuleGeometry args={[0.15, 0.5, 6, 10]} />
                  <meshStandardMaterial color={packConfig.clothColor} roughness={0.95} />
                </mesh>
                {/* Rope binding */}
                <mesh position={[0.1, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.45, 0.02, 4, 12]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.85} />
                </mesh>
              </>
            )}

            {packConfig.loadType === 2 && (
              /* Mixed cargo - boxes and bundles */
              <>
                <mesh position={[-0.1, 0.15, 0.32]} castShadow>
                  <boxGeometry args={[0.35, 0.25, 0.22]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.9} />
                </mesh>
                <mesh position={[0.15, 0.1, -0.35]} castShadow>
                  <boxGeometry args={[0.28, 0.2, 0.2]} />
                  <meshStandardMaterial color={packConfig.clothColor} roughness={0.92} />
                </mesh>
                <mesh position={[-0.2, 0.12, -0.3]} rotation={[0.1, 0.3, 0]} castShadow>
                  <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
                  <meshStandardMaterial color={packConfig.bundleColor} roughness={0.88} />
                </mesh>
                {/* Rope net */}
                <mesh position={[0, 0.3, 0]} castShadow>
                  <boxGeometry args={[0.6, 0.02, 0.7]} />
                  <meshStandardMaterial color={packConfig.ropeColor} roughness={0.9} wireframe />
                </mesh>
              </>
            )}

            {/* Water skins (goat bladders) */}
            {packConfig.hasWaterSkins && (
              <>
                <mesh position={[0.35, -0.1, 0.3]} rotation={[0, 0, 0.5]} castShadow>
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
                </mesh>
                <mesh position={[0.35, -0.1, -0.3]} rotation={[0, 0, -0.5]} castShadow>
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
                </mesh>
              </>
            )}
          </group>
        )}
      </group>
    </group>
  );
};

export default Camel;
