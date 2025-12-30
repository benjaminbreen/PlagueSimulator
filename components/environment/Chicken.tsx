import React, { useContext, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from '../../utils/procedural';
import { HoverLabel, HoverLabelContext, HoverWireframeContext, useHoverFade } from './shared/HoverSystem';

// Chicken behavior constants
const CHICKEN_WALK_SPEED = 0.6;
const CHICKEN_RUN_SPEED = 2.5;
const CHICKEN_SCATTER_DISTANCE = 3.0;
const CHICKEN_SAFE_DISTANCE = 8.0;

// Chicken color variants
const CHICKEN_COLORS = [
  { name: 'Brown', body: '#8b5a2b', wing: '#6b4423', tail: '#4a3016', comb: '#cc3333' },
  { name: 'White', body: '#f5f5dc', wing: '#e8e8d0', tail: '#d0d0c0', comb: '#dd4444' },
  { name: 'Red', body: '#a0522d', wing: '#8b4513', tail: '#5c3317', comb: '#cc2222' },
  { name: 'Speckled', body: '#c4a35a', wing: '#a08040', tail: '#705030', comb: '#cc3333' },
  { name: 'Black', body: '#2a2a2a', wing: '#1a1a1a', tail: '#0a0a0a', comb: '#bb2222' },
];

type ChickenBehavior = 'idle' | 'peck' | 'scratch' | 'walk' | 'scatter';

interface ChickenProps {
  seed?: number;
  spawnPosition?: [number, number, number];
  playerPosition?: THREE.Vector3;
  isRooster?: boolean;
}

export const Chicken: React.FC<ChickenProps> = ({
  seed = 0,
  spawnPosition = [0, 0, 0],
  playerPosition,
  isRooster = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const wingRefs = useRef<THREE.Group[]>([]);
  const legRefs = useRef<THREE.Group[]>([]);
  const tailRef = useRef<THREE.Group>(null);

  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);

  // Animation state
  const state = useRef({
    behavior: 'idle' as ChickenBehavior,
    timer: 1 + seededRandom(seed + 1) * 2,
    walkCycle: 0,
    peckCycle: 0,
    scratchCycle: 0,
    breathCycle: seededRandom(seed + 2) * Math.PI * 2,
    targetAngle: seededRandom(seed + 3) * Math.PI * 2,
    currentAngle: seededRandom(seed + 3) * Math.PI * 2,
    wanderTarget: null as THREE.Vector3 | null,
    wingFlap: 0,
  });

  // Appearance configuration
  const appearance = useMemo(() => {
    const rng = (offset: number) => seededRandom(seed + offset);
    const colorVariant = CHICKEN_COLORS[Math.floor(rng(10) * CHICKEN_COLORS.length)];
    const scale = isRooster ? (0.9 + rng(20) * 0.2) : (0.7 + rng(20) * 0.2);
    const tailSize = isRooster ? 1.4 : 0.6;

    return {
      colors: colorVariant,
      scale,
      tailSize,
      isRooster,
    };
  }, [seed, isRooster]);

  // Materials
  const bodyMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.body} roughness={0.95} />
  ), [appearance.colors.body]);

  const wingMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.wing} roughness={0.95} />
  ), [appearance.colors.wing]);

  const tailMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.tail} roughness={0.92} />
  ), [appearance.colors.tail]);

  const combMaterial = useMemo(() => (
    <meshStandardMaterial color={appearance.colors.comb} roughness={0.7} />
  ), [appearance.colors.comb]);

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;

    const s = state.current;
    const pos = groupRef.current.position;

    // Update timers
    s.timer -= delta;
    s.breathCycle += delta * 2;

    // Check for player proximity - scatter behavior
    if (playerPosition) {
      const distToPlayer = pos.distanceTo(playerPosition);

      if (distToPlayer < CHICKEN_SCATTER_DISTANCE && s.behavior !== 'scatter') {
        s.behavior = 'scatter';
        s.timer = 2 + Math.random() * 1;
        s.wingFlap = 0;
        const fleeDir = pos.clone().sub(playerPosition).normalize();
        s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      } else if (s.behavior === 'scatter' && distToPlayer > CHICKEN_SAFE_DISTANCE) {
        s.behavior = 'idle';
        s.timer = 1 + Math.random() * 2;
      }
    }

    // Behavior state machine
    if (s.timer <= 0 && s.behavior !== 'scatter') {
      const rand = Math.random();
      if (s.behavior === 'idle') {
        if (rand > 0.6) {
          s.behavior = 'peck';
          s.timer = 2 + Math.random() * 3;
          s.peckCycle = 0;
        } else if (rand > 0.35) {
          s.behavior = 'scratch';
          s.timer = 1.5 + Math.random() * 2;
          s.scratchCycle = 0;
        } else {
          s.behavior = 'walk';
          s.timer = 3 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          const dist = 2 + Math.random() * 4;
          s.wanderTarget = new THREE.Vector3(
            spawnPosition[0] + Math.cos(angle) * dist,
            0,
            spawnPosition[2] + Math.sin(angle) * dist
          );
        }
      } else {
        s.behavior = 'idle';
        s.timer = 0.5 + Math.random() * 1.5;
      }
    }

    // --- IDLE BEHAVIOR ---
    if (s.behavior === 'idle') {
      s.walkCycle *= 0.9;

      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Subtle body bob
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.15 + Math.sin(s.breathCycle) * 0.005;
      }

      // Head looks around
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(s.breathCycle * 0.5) * 0.4;
        headRef.current.rotation.z = Math.sin(s.breathCycle * 0.3) * 0.1;
      }

      // Wings at rest
      wingRefs.current.forEach((wing, i) => {
        if (wing) {
          wing.rotation.z = (i === 0 ? 0.1 : -0.1);
        }
      });

      // Legs still
      legRefs.current.forEach((leg) => {
        if (leg) leg.rotation.z *= 0.9;
      });
    }

    // --- PECK BEHAVIOR ---
    if (s.behavior === 'peck') {
      s.peckCycle += delta * 8;

      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Rapid pecking motion
      if (headRef.current) {
        const peckPhase = Math.sin(s.peckCycle);
        headRef.current.rotation.z = 0.3 + peckPhase * 0.4;
        headRef.current.position.y = -peckPhase * 0.02;
      }

      // Body dips slightly
      if (bodyRef.current) {
        bodyRef.current.rotation.z = Math.sin(s.peckCycle) * 0.05;
      }
    }

    // --- SCRATCH BEHAVIOR ---
    if (s.behavior === 'scratch') {
      s.scratchCycle += delta * 12;

      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      // Alternating leg scratches
      legRefs.current.forEach((leg, i) => {
        if (leg) {
          const phase = s.scratchCycle + i * Math.PI;
          const isScratching = Math.sin(phase) > 0.7;
          leg.rotation.z = isScratching ? Math.sin(phase * 3) * 0.5 : 0;
        }
      });

      // Body shifts side to side
      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.sin(s.scratchCycle * 0.5) * 0.08;
      }

      // Head watches ground
      if (headRef.current) {
        headRef.current.rotation.z = 0.2;
      }
    }

    // --- WALK BEHAVIOR ---
    if (s.behavior === 'walk' && s.wanderTarget) {
      const target = s.wanderTarget;
      const dir = target.clone().sub(pos);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.5) {
        s.behavior = 'idle';
        s.timer = 1 + Math.random() * 2;
        s.wanderTarget = null;
      } else {
        dir.normalize();
        pos.add(dir.multiplyScalar(delta * CHICKEN_WALK_SPEED));

        s.targetAngle = Math.atan2(dir.x, dir.z);
        s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 5);
        groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

        s.walkCycle += delta * 12;

        // Bobbing walk
        if (bodyRef.current) {
          bodyRef.current.position.y = 0.15 + Math.abs(Math.sin(s.walkCycle)) * 0.02;
        }

        // Head bobs forward
        if (headRef.current) {
          headRef.current.rotation.z = 0.1 + Math.sin(s.walkCycle * 2) * 0.1;
          headRef.current.position.x = Math.sin(s.walkCycle * 2) * 0.01;
        }

        // Leg animation
        legRefs.current.forEach((leg, i) => {
          if (leg) {
            const phase = s.walkCycle + i * Math.PI;
            leg.rotation.z = Math.sin(phase) * 0.4;
          }
        });
      }
    }

    // --- SCATTER BEHAVIOR ---
    if (s.behavior === 'scatter' && playerPosition) {
      const fleeDir = pos.clone().sub(playerPosition);
      fleeDir.y = 0;
      fleeDir.normalize();

      pos.add(fleeDir.multiplyScalar(delta * CHICKEN_RUN_SPEED));

      s.targetAngle = Math.atan2(fleeDir.x, fleeDir.z);
      s.currentAngle = THREE.MathUtils.lerp(s.currentAngle, s.targetAngle, delta * 8);
      groupRef.current.rotation.y = s.currentAngle - Math.PI / 2;

      s.walkCycle += delta * 20;
      s.wingFlap += delta * 25;

      // Frantic running
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.18 + Math.abs(Math.sin(s.walkCycle)) * 0.04;
        bodyRef.current.rotation.z = Math.sin(s.walkCycle) * 0.1;
      }

      // Wings flap
      wingRefs.current.forEach((wing, i) => {
        if (wing) {
          const baseAngle = i === 0 ? 0.3 : -0.3;
          wing.rotation.z = baseAngle + Math.sin(s.wingFlap) * 0.5;
        }
      });

      // Frantic legs
      legRefs.current.forEach((leg, i) => {
        if (leg) {
          const phase = s.walkCycle + i * Math.PI;
          leg.rotation.z = Math.sin(phase) * 0.6;
        }
      });

      // Head stretched forward
      if (headRef.current) {
        headRef.current.rotation.z = -0.2;
      }
    }

    // --- TAIL ANIMATION ---
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(s.breathCycle * 0.5) * 0.05;
    }
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

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
          title={appearance.isRooster ? `${appearance.colors.name} Rooster` : `${appearance.colors.name} Hen`}
          lines={[
            appearance.isRooster ? 'Proud and vigilant' : 'Busy foraging',
            'Scratching for seeds',
            'Part of the farm'
          ]}
          offset={[0, 0.5 / appearance.scale, 0]}
        />
      )}

      {/* Main body group */}
      <group ref={bodyRef} position={[0, 0.15, 0]}>
        {/* Body - oval shape */}
        <mesh rotation={[0.2, 0, 0]} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
          {bodyMaterial}
        </mesh>

        {/* Breast */}
        <mesh position={[0.06, -0.02, 0]} castShadow>
          <sphereGeometry args={[0.09, 8, 6]} />
          {bodyMaterial}
        </mesh>

        {/* Back/rump */}
        <mesh position={[-0.06, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 6]} />
          {bodyMaterial}
        </mesh>

        {/* Wings */}
        <group
          ref={(el) => { if (el) wingRefs.current[0] = el; }}
          position={[0, 0, 0.08]}
        >
          <mesh rotation={[0, 0, 0.1]} castShadow>
            <boxGeometry args={[0.14, 0.06, 0.03]} />
            {wingMaterial}
          </mesh>
        </group>
        <group
          ref={(el) => { if (el) wingRefs.current[1] = el; }}
          position={[0, 0, -0.08]}
        >
          <mesh rotation={[0, 0, -0.1]} castShadow>
            <boxGeometry args={[0.14, 0.06, 0.03]} />
            {wingMaterial}
          </mesh>
        </group>

        {/* Neck */}
        <group ref={headRef} position={[0.12, 0.06, 0]}>
          {/* Neck cylinder */}
          <mesh position={[0.02, 0.03, 0]} rotation={[0, 0, -0.3]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.08, 6]} />
            {bodyMaterial}
          </mesh>

          {/* Head */}
          <mesh position={[0.06, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.04, 8, 6]} />
            {bodyMaterial}
          </mesh>

          {/* Beak */}
          <mesh position={[0.1, 0.07, 0]} rotation={[0, 0, -0.2]} castShadow>
            <coneGeometry args={[0.015, 0.04, 4]} />
            <meshStandardMaterial color="#e8b030" roughness={0.6} />
          </mesh>

          {/* Comb */}
          {appearance.isRooster ? (
            // Rooster has large comb
            <>
              <mesh position={[0.05, 0.13, 0]} castShadow>
                <boxGeometry args={[0.05, 0.04, 0.01]} />
                {combMaterial}
              </mesh>
              <mesh position={[0.03, 0.115, 0]} castShadow>
                <boxGeometry args={[0.02, 0.03, 0.01]} />
                {combMaterial}
              </mesh>
              <mesh position={[0.07, 0.115, 0]} castShadow>
                <boxGeometry args={[0.02, 0.03, 0.01]} />
                {combMaterial}
              </mesh>
            </>
          ) : (
            // Hen has small comb
            <mesh position={[0.05, 0.11, 0]} castShadow>
              <boxGeometry args={[0.025, 0.02, 0.008]} />
              {combMaterial}
            </mesh>
          )}

          {/* Wattle */}
          <mesh position={[0.08, 0.04, 0]} castShadow>
            <sphereGeometry args={[appearance.isRooster ? 0.018 : 0.01, 6, 6]} />
            {combMaterial}
          </mesh>

          {/* Eyes */}
          <mesh position={[0.07, 0.09, 0.025]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
          </mesh>
          <mesh position={[0.07, 0.09, -0.025]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
          </mesh>
        </group>

        {/* Tail */}
        <group ref={tailRef} position={[-0.12, 0.04, 0]} rotation={[-0.3, 0, 0]}>
          {appearance.isRooster ? (
            // Rooster has fancy tail feathers
            <>
              {[-0.02, 0, 0.02].map((zOff, i) => (
                <mesh
                  key={`tail-${i}`}
                  position={[-0.04 * appearance.tailSize, 0.06 * appearance.tailSize, zOff]}
                  rotation={[0, zOff * 2, 0.8]}
                  castShadow
                >
                  <boxGeometry args={[0.02, 0.15 * appearance.tailSize, 0.01]} />
                  {tailMaterial}
                </mesh>
              ))}
              {/* Sickle feathers */}
              <mesh position={[-0.06, 0.1, 0.01]} rotation={[0, 0.2, 1]} castShadow>
                <boxGeometry args={[0.015, 0.18 * appearance.tailSize, 0.008]} />
                {tailMaterial}
              </mesh>
              <mesh position={[-0.06, 0.1, -0.01]} rotation={[0, -0.2, 1]} castShadow>
                <boxGeometry args={[0.015, 0.18 * appearance.tailSize, 0.008]} />
                {tailMaterial}
              </mesh>
            </>
          ) : (
            // Hen has modest tail
            <mesh position={[-0.02, 0.02, 0]} rotation={[0, 0, 0.6]} castShadow>
              <boxGeometry args={[0.04, 0.06, 0.05]} />
              {tailMaterial}
            </mesh>
          )}
        </group>

        {/* Legs */}
        {[0.04, -0.04].map((zPos, i) => (
          <group
            key={`leg-${i}`}
            position={[0, -0.1, zPos]}
            ref={(el) => { if (el) legRefs.current[i] = el; }}
          >
            {/* Upper leg */}
            <mesh castShadow>
              <cylinderGeometry args={[0.012, 0.015, 0.06, 4]} />
              <meshStandardMaterial color="#d4a030" roughness={0.8} />
            </mesh>

            {/* Lower leg */}
            <mesh position={[0, -0.05, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.012, 0.05, 4]} />
              <meshStandardMaterial color="#d4a030" roughness={0.8} />
            </mesh>

            {/* Foot */}
            <group position={[0, -0.08, 0]}>
              {/* Toes */}
              <mesh position={[0.015, 0, 0]} rotation={[0, 0.3, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.004, 0.006, 0.025, 4]} />
                <meshStandardMaterial color="#d4a030" roughness={0.8} />
              </mesh>
              <mesh position={[0.015, 0, 0.01]} rotation={[0.4, 0.2, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.004, 0.006, 0.02, 4]} />
                <meshStandardMaterial color="#d4a030" roughness={0.8} />
              </mesh>
              <mesh position={[0.015, 0, -0.01]} rotation={[-0.4, 0.2, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.004, 0.006, 0.02, 4]} />
                <meshStandardMaterial color="#d4a030" roughness={0.8} />
              </mesh>
              {/* Back toe */}
              <mesh position={[-0.01, 0, 0]} rotation={[0, -0.2, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.003, 0.005, 0.015, 4]} />
                <meshStandardMaterial color="#d4a030" roughness={0.8} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};

export default Chicken;
