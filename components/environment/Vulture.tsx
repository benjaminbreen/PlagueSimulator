import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from '../../utils/procedural';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from './shared/HoverSystem';

// Vulture behavior constants
const VULTURE_SOAR_SPEED = 0.3;
const VULTURE_GLIDE_SPEED = 0.5;
const VULTURE_MIN_HEIGHT = 8;
const VULTURE_MAX_HEIGHT = 25;
const VULTURE_CIRCLE_RADIUS_MIN = 8;
const VULTURE_CIRCLE_RADIUS_MAX = 20;

// Vulture color variants (Griffon vultures common in Middle East)
const VULTURE_COLORS = [
  { name: 'Griffon', body: '#5a4a3a', wing: '#3a2a1a', head: '#c8b8a8', ruff: '#e8d8c8' },
  { name: 'Egyptian', body: '#f0e8d8', wing: '#2a2a2a', head: '#e8c878', ruff: '#f8f0e0' },
  { name: 'Black', body: '#2a2a2a', wing: '#1a1a1a', head: '#4a4a4a', ruff: '#3a3a3a' },
];

type VultureBehavior = 'soar' | 'glide' | 'descend' | 'perch';

interface VultureProps {
  seed?: number;
  spawnPosition?: [number, number, number];
  playerPosition?: THREE.Vector3;
}

export const Vulture: React.FC<VultureProps> = ({
  seed = 0,
  spawnPosition = [0, 15, 0],
  playerPosition
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const wingRefs = useRef<THREE.Group[]>([]);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  // Animation state
  const state = useRef({
    behavior: 'soar' as VultureBehavior,
    timer: 10 + seededRandom(seed + 1) * 20,
    circleAngle: seededRandom(seed + 2) * Math.PI * 2,
    circleRadius: VULTURE_CIRCLE_RADIUS_MIN + seededRandom(seed + 3) * (VULTURE_CIRCLE_RADIUS_MAX - VULTURE_CIRCLE_RADIUS_MIN),
    height: VULTURE_MIN_HEIGHT + seededRandom(seed + 4) * (VULTURE_MAX_HEIGHT - VULTURE_MIN_HEIGHT),
    targetHeight: VULTURE_MIN_HEIGHT + seededRandom(seed + 5) * (VULTURE_MAX_HEIGHT - VULTURE_MIN_HEIGHT),
    wingPhase: seededRandom(seed + 6) * Math.PI * 2,
    bankAngle: 0,
    headLook: 0,
    circleDirection: seededRandom(seed + 7) > 0.5 ? 1 : -1,
    thermalOffset: seededRandom(seed + 8) * 0.5,
  });

  // Appearance configuration
  const appearance = useMemo(() => {
    const rng = (offset: number) => seededRandom(seed + offset);
    const colorVariant = VULTURE_COLORS[Math.floor(rng(10) * VULTURE_COLORS.length)];
    const scale = 0.8 + rng(20) * 0.4;
    const wingspan = 1.8 + rng(30) * 0.4;

    return {
      colors: colorVariant,
      scale,
      wingspan,
    };
  }, [seed]);

  // Materials
  const bodyMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.body} roughness={0.9} />
  ), [appearance.colors.body]);

  const wingMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.wing} roughness={0.92} side={THREE.DoubleSide} />
  ), [appearance.colors.wing]);

  const headMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.head} roughness={0.7} />
  ), [appearance.colors.head]);

  const ruffMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.ruff} roughness={0.95} />
  ), [appearance.colors.ruff]);

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;

    const s = state.current;
    s.timer -= delta;

    // Base position around spawn
    const centerX = spawnPosition[0];
    const centerZ = spawnPosition[2];

    // Behavior transitions
    if (s.timer <= 0) {
      const rand = Math.random();
      if (s.behavior === 'soar') {
        if (rand > 0.7) {
          s.behavior = 'glide';
          s.timer = 5 + Math.random() * 8;
        } else {
          // Change circle direction or radius
          s.circleDirection *= -1;
          s.circleRadius = VULTURE_CIRCLE_RADIUS_MIN + Math.random() * (VULTURE_CIRCLE_RADIUS_MAX - VULTURE_CIRCLE_RADIUS_MIN);
          s.targetHeight = VULTURE_MIN_HEIGHT + Math.random() * (VULTURE_MAX_HEIGHT - VULTURE_MIN_HEIGHT);
          s.timer = 15 + Math.random() * 20;
        }
      } else if (s.behavior === 'glide') {
        s.behavior = 'soar';
        s.timer = 10 + Math.random() * 15;
      }
    }

    // --- SOAR BEHAVIOR (circling on thermals) ---
    if (s.behavior === 'soar') {
      // Circle around center point
      s.circleAngle += delta * VULTURE_SOAR_SPEED * s.circleDirection;

      // Gradually adjust height (thermal lift)
      s.height = THREE.MathUtils.lerp(s.height, s.targetHeight, delta * 0.3);
      const thermalBob = Math.sin(s.circleAngle * 2 + s.thermalOffset) * 0.5;

      const x = centerX + Math.cos(s.circleAngle) * s.circleRadius;
      const z = centerZ + Math.sin(s.circleAngle) * s.circleRadius;

      groupRef.current.position.set(x, s.height + thermalBob, z);

      // Face direction of travel (tangent to circle)
      const facingAngle = s.circleAngle + (s.circleDirection > 0 ? Math.PI / 2 : -Math.PI / 2);
      groupRef.current.rotation.y = facingAngle;

      // Bank into the turn
      s.bankAngle = THREE.MathUtils.lerp(s.bankAngle, s.circleDirection * 0.3, delta * 2);
      bodyRef.current.rotation.z = s.bankAngle;

      // Wings mostly flat with slight adjustments
      s.wingPhase += delta * 0.5;
      wingRefs.current.forEach((wing, i) => {
        if (wing) {
          const baseAngle = i === 0 ? -0.05 : 0.05;
          const soarWobble = Math.sin(s.wingPhase + i * Math.PI) * 0.03;
          wing.rotation.z = baseAngle + soarWobble;
          wing.rotation.x = Math.sin(s.wingPhase * 0.3) * 0.02;
        }
      });
    }

    // --- GLIDE BEHAVIOR (straighter flight) ---
    if (s.behavior === 'glide') {
      // Continue in current direction but straighter
      s.circleAngle += delta * VULTURE_GLIDE_SPEED * s.circleDirection * 0.3;

      // Slowly descend
      s.height = THREE.MathUtils.lerp(s.height, s.height - 0.5, delta * 0.2);
      s.height = Math.max(s.height, VULTURE_MIN_HEIGHT);

      const x = centerX + Math.cos(s.circleAngle) * s.circleRadius;
      const z = centerZ + Math.sin(s.circleAngle) * s.circleRadius;

      groupRef.current.position.set(x, s.height, z);

      const facingAngle = s.circleAngle + (s.circleDirection > 0 ? Math.PI / 2 : -Math.PI / 2);
      groupRef.current.rotation.y = facingAngle;

      // Level out
      s.bankAngle = THREE.MathUtils.lerp(s.bankAngle, 0, delta * 2);
      bodyRef.current.rotation.z = s.bankAngle;

      // Wings slightly angled down for glide
      wingRefs.current.forEach((wing, i) => {
        if (wing) {
          wing.rotation.z = i === 0 ? -0.15 : 0.15;
        }
      });
    }

    // --- HEAD MOVEMENT ---
    if (headRef.current) {
      // Look down at ground (scanning for carrion)
      s.headLook += delta * 0.8;
      headRef.current.rotation.z = 0.4 + Math.sin(s.headLook) * 0.15;
      headRef.current.rotation.y = Math.sin(s.headLook * 0.5) * 0.3;
    }

    // --- TAIL MOVEMENT ---
    if (tailRef.current) {
      // Tail adjusts for steering
      tailRef.current.rotation.z = -s.bankAngle * 0.5;
      tailRef.current.rotation.y = Math.sin(s.wingPhase * 0.3) * 0.1;
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  const ws = appearance.wingspan;

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
          title={`${appearance.colors.name} Vulture`}
          lines={[
            'Circling overhead',
            'Searching for carrion',
            'Patient scavenger'
          ]}
          offset={[0, 1.5 / appearance.scale, 0]}
        />
      )}

      {/* Main body group */}
      <group ref={bodyRef}>
        {/* Body - elongated */}
        <mesh rotation={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.5, 8, 12]} />
          {bodyMaterial}
        </mesh>

        {/* Neck ruff (characteristic collar of feathers) */}
        <mesh position={[0.28, 0, 0]} castShadow>
          <torusGeometry args={[0.1, 0.05, 8, 12]} />
          {ruffMaterial}
        </mesh>

        {/* Neck */}
        <group ref={headRef} position={[0.35, 0, 0]}>
          {/* Neck - bare/sparsely feathered */}
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.3]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.15, 8]} />
            {headMaterial}
          </mesh>

          {/* Head - bald */}
          <mesh position={[0.15, 0.02, 0]} castShadow>
            <sphereGeometry args={[0.06, 10, 8]} />
            {headMaterial}
          </mesh>

          {/* Beak - hooked for tearing */}
          <mesh position={[0.2, 0, 0]} rotation={[0, 0, -0.4]} castShadow>
            <coneGeometry args={[0.025, 0.08, 6]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
          </mesh>

          {/* Beak hook */}
          <mesh position={[0.23, -0.02, 0]} rotation={[0, 0, -1]} castShadow>
            <coneGeometry args={[0.012, 0.025, 4]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
          </mesh>

          {/* Eyes */}
          <mesh position={[0.16, 0.04, 0.04]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.3} />
          </mesh>
          <mesh position={[0.16, 0.04, -0.04]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.3} />
          </mesh>
        </group>

        {/* Wings - large and broad */}
        <group
          ref={(el) => { if (el) wingRefs.current[0] = el; }}
          position={[0, 0, 0.12]}
        >
          {/* Wing root */}
          <mesh position={[0, 0, 0.2]} rotation={[0, 0, -0.05]} castShadow>
            <boxGeometry args={[0.5, 0.04, 0.35]} />
            {wingMaterial}
          </mesh>
          {/* Wing mid */}
          <mesh position={[-0.05, 0, 0.5]} rotation={[0, 0, -0.05]} castShadow>
            <boxGeometry args={[0.4, 0.03, 0.3]} />
            {wingMaterial}
          </mesh>
          {/* Wing tip (primary feathers) */}
          <mesh position={[-0.1, 0, 0.75]} rotation={[0, 0, -0.08]} castShadow>
            <boxGeometry args={[0.3, 0.02, 0.2]} />
            {wingMaterial}
          </mesh>
          {/* Finger feathers */}
          {[0, 0.05, 0.1, 0.15].map((xOff, i) => (
            <mesh
              key={`finger-l-${i}`}
              position={[-0.15 + xOff, 0, 0.88 + i * 0.02]}
              rotation={[0, 0.1 * i, -0.1]}
              castShadow
            >
              <boxGeometry args={[0.08, 0.015, 0.04]} />
              {wingMaterial}
            </mesh>
          ))}
        </group>

        <group
          ref={(el) => { if (el) wingRefs.current[1] = el; }}
          position={[0, 0, -0.12]}
        >
          {/* Wing root */}
          <mesh position={[0, 0, -0.2]} rotation={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[0.5, 0.04, 0.35]} />
            {wingMaterial}
          </mesh>
          {/* Wing mid */}
          <mesh position={[-0.05, 0, -0.5]} rotation={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[0.4, 0.03, 0.3]} />
            {wingMaterial}
          </mesh>
          {/* Wing tip */}
          <mesh position={[-0.1, 0, -0.75]} rotation={[0, 0, 0.08]} castShadow>
            <boxGeometry args={[0.3, 0.02, 0.2]} />
            {wingMaterial}
          </mesh>
          {/* Finger feathers */}
          {[0, 0.05, 0.1, 0.15].map((xOff, i) => (
            <mesh
              key={`finger-r-${i}`}
              position={[-0.15 + xOff, 0, -0.88 - i * 0.02]}
              rotation={[0, -0.1 * i, 0.1]}
              castShadow
            >
              <boxGeometry args={[0.08, 0.015, 0.04]} />
              {wingMaterial}
            </mesh>
          ))}
        </group>

        {/* Tail - fan-shaped */}
        <group ref={tailRef} position={[-0.35, 0, 0]}>
          {[-0.06, -0.03, 0, 0.03, 0.06].map((zOff, i) => (
            <mesh
              key={`tail-${i}`}
              position={[-0.1, 0, zOff]}
              rotation={[0, zOff * 0.5, 0]}
              castShadow
            >
              <boxGeometry args={[0.2, 0.02, 0.06]} />
              {wingMaterial}
            </mesh>
          ))}
        </group>

        {/* Legs (tucked during flight) */}
        <mesh position={[-0.1, -0.12, 0.03]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.015, 0.15, 4]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
        </mesh>
        <mesh position={[-0.1, -0.12, -0.03]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.015, 0.15, 4]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
        </mesh>

        {/* Feet/talons (folded) */}
        <mesh position={[-0.15, -0.2, 0.03]} castShadow>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
        </mesh>
        <mesh position={[-0.15, -0.2, -0.03]} castShadow>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};

export default Vulture;
