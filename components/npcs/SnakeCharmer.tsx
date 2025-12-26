/**
 * Snake Charmer Sufi NPC - Fully Animated Version
 * Member of the Saʿdiyya (سعدية) tariqa - known for snake-charming and spectacular rituals
 * Founded by Saʿd al-Dīn al-Shaybānī al-Jibāwī (d. 736/1335)
 */

import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { NPCStats, SocialClass, AgentState } from '../../types';

interface SnakeCharmerProps {
  position: [number, number, number];
  timeOfDay?: number;
  onApproach?: (distance: number) => void;
  onSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  isSelected?: boolean;
}

export const SnakeCharmer: React.FC<SnakeCharmerProps> = ({
  position,
  timeOfDay = 12,
  onApproach,
  onSelect,
  isSelected = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const snakeRef = useRef<THREE.Group>(null);
  const sufiBodyRef = useRef<THREE.Group>(null);
  const sufiHeadRef = useRef<THREE.Group>(null);
  const incenseSmokeRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);

  const isNight = timeOfDay >= 19 || timeOfDay < 5;
  const lanternGlow = isNight ? 1.0 : 0;

  // Animation state
  const animTime = useRef(0);

  // Procedurally generated NPC stats
  const npcStats = useMemo<NPCStats>(() => {
    const seed = position[0] * 1000 + position[2];
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const names = ['Jalal', 'Rashid', 'Yusuf', 'Ibrahim', 'Ahmad'];
    const name = names[Math.floor(seededRandom(seed) * names.length)];
    const age = 35 + Math.floor(seededRandom(seed + 1) * 25);

    return {
      id: `sufi-mystic-${position[0]}-${position[2]}`,
      name: `${name} al-Saʿdi`,
      age,
      profession: 'Sufi Snake Charmer',
      gender: 'Male',
      socialClass: SocialClass.CLERGY,
      ethnicity: 'Arab',
      religion: 'Sunni Islam',
      language: 'Arabic',
      height: 165 + seededRandom(seed + 2) * 15,
      weight: 65 + seededRandom(seed + 3) * 20,
      mood: 'Mystical',
      awarenessLevel: 45,
      panicLevel: 10,
      goalOfDay: 'Charm snakes and offer blessings',
      heldItem: 'none',
      headwearStyle: 'turban',
      accessories: ['Prayer beads', 'Incense burner', 'Al-nāy flute']
    };
  }, [position]);

  // Animate sufi and snake
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    animTime.current += delta;
    const time = animTime.current;

    const dist = camera.position.distanceTo(
      new THREE.Vector3(position[0], position[1] + 1, position[2])
    );
    onApproach?.(dist);

    // Sufi body breathing and swaying
    if (sufiBodyRef.current) {
      const breathe = Math.sin(time * 1.5) * 0.03;
      const sway = Math.sin(time * 0.8) * 0.04;
      sufiBodyRef.current.position.y = 0.18 + breathe;
      sufiBodyRef.current.rotation.z = sway;
    }

    // Sufi head subtle movement
    if (sufiHeadRef.current) {
      const headTilt = Math.sin(time * 0.6) * 0.08;
      const headTurn = Math.sin(time * 0.4) * 0.1;
      sufiHeadRef.current.rotation.x = headTilt;
      sufiHeadRef.current.rotation.y = headTurn;
    }

    // Snake sinuous movement - longer, more graceful (scaled down to half size)
    if (snakeRef.current) {
      const primaryWave = Math.sin(time * 1.3) * 0.11;
      const rise = Math.sin(time * 0.7) * 0.2;
      snakeRef.current.rotation.z = primaryWave;
      snakeRef.current.position.y = 0.25 + rise;

      // Animate individual snake segments
      snakeRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Group || child instanceof THREE.Mesh) {
          const segmentPhase = time * 1.2 + i * 0.3;
          const segmentSway = Math.sin(segmentPhase) * 0.12;
          const segmentTwist = Math.sin(segmentPhase * 0.5) * 0.15;

          if (child.rotation) {
            child.rotation.z = segmentSway;
            child.rotation.y = segmentTwist;
          }
        }
      });
    }

    // Incense smoke animation
    if (incenseSmokeRef.current) {
      const dummy = new THREE.Object3D();
      const count = incenseSmokeRef.current.count;

      for (let i = 0; i < count; i++) {
        const t = (time * 0.3 + i * 0.2) % 1;
        const x = Math.sin(t * Math.PI * 4) * 0.1;
        const y = t * 0.8;
        const z = Math.cos(t * Math.PI * 3) * 0.08;
        const scale = (1 - t) * 0.15;

        dummy.position.set(x, y, z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        incenseSmokeRef.current.setMatrixAt(i, dummy.matrix);
      }
      incenseSmokeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Randomized color palette for robe
  const colors = useMemo(() => {
    const seed = position[0] * 1000 + position[2];
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    // 7 color palettes for robe variety
    const robePalettes = [
      { robe: '#3a5266', robeHighlight: '#4a6278', robeShadow: '#2a4256' }, // Deep blue
      { robe: '#5a3a42', robeHighlight: '#6a4a52', robeShadow: '#4a2a32' }, // Burgundy
      { robe: '#3a5a3a', robeHighlight: '#4a6a4a', robeShadow: '#2a4a2a' }, // Forest green
      { robe: '#5a4a2a', robeHighlight: '#6a5a3a', robeShadow: '#4a3a1a' }, // Earthy brown
      { robe: '#4a3a5a', robeHighlight: '#5a4a6a', robeShadow: '#3a2a4a' }, // Deep purple
      { robe: '#5a5a3a', robeHighlight: '#6a6a4a', robeShadow: '#4a4a2a' }, // Olive
      { robe: '#3a4a5a', robeHighlight: '#4a5a6a', robeShadow: '#2a3a4a' }  // Slate blue
    ];

    const paletteIndex = Math.floor(seededRandom(seed + 500) * robePalettes.length);
    const selectedPalette = robePalettes[paletteIndex];

    return {
      ...selectedPalette,
      turban: '#e8d8b8',
      turbanBand: '#c8a878',
      skin: '#c89864',
      skinShadow: '#a87854',
      eye: '#2a2a1a',
      eyeWhite: '#f0e8d8',
      flute: '#8b7355',
      fluteDetail: '#6b5335',
      basketWeave: '#9a7a52',
      basketDark: '#7a5a32',
      snake: '#556a3a',
      snakeDark: '#3a4a2a',
      snakePattern: '#6a7a4a',
      snakeBelly: '#c8c89a',
      brass: '#c8a858',
      brassDark: '#a88838',
      rugBase: '#8a3a3a',
      rugPattern: '#c85a4a',
      rugAccent: '#4a6a7a',
      coin: '#d4b86a',
      wood: '#6a5340',
      woodDark: '#5a4330'
    };
  }, [position]);

  // Memoized coin positions
  const coinPositions = useMemo(() => {
    const seed = position[0] * 1000 + position[2];
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 + seededRandom(seed + i) * 0.3;
      const r = 0.06 + seededRandom(seed + i + 50) * 0.05;
      return {
        position: [
          Math.cos(angle) * r,
          0.04 + seededRandom(seed + i + 100) * 0.03,
          Math.sin(angle) * r
        ] as [number, number, number],
        rotation: [
          -Math.PI / 2 + seededRandom(seed + i + 200) * 0.4,
          seededRandom(seed + i + 250) * 0.3,
          seededRandom(seed + i + 300) * Math.PI
        ] as [number, number, number]
      };
    });
  }, [position]);

  return (
    <group
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) {
          onSelect({ stats: npcStats, state: AgentState.HEALTHY });
        }
      }}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[1.5, 1.75, 32]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={15} position={[0, 3.0, 0]} center>
          <div className="bg-black/90 backdrop-blur-md p-4 rounded-xl border border-purple-600/40 text-purple-50 w-56 shadow-2xl pointer-events-none select-none">
            <h4 className="historical-font text-purple-400 border-b border-purple-900/50 pb-2 mb-2 uppercase text-xs tracking-wider font-bold">
              {npcStats.name}
            </h4>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-purple-500/60 font-bold">AGE</span><span>{npcStats.age} Years</span></div>
              <div className="flex justify-between"><span className="text-purple-500/60 font-bold">CLASS</span><span>{npcStats.socialClass}</span></div>
              <div className="flex justify-between"><span className="text-purple-500/60 font-bold">PROFESSION</span><span>{npcStats.profession}</span></div>
              <div className="flex justify-between"><span className="text-purple-500/60 font-bold">MOOD</span><span>{npcStats.mood}</span></div>
              <div className="flex justify-between"><span className="text-purple-500/60 font-bold">GOAL</span><span className="text-right">{npcStats.goalOfDay}</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-purple-900/50 text-[9px] text-purple-300/70 italic">
              Saʿdiyya Tariqa • Snake Charmer
            </div>
          </div>
        </Html>
      )}

      <group ref={groupRef}>
        {/* Persian carpet/rug with geometric patterns */}
        <group position={[0, 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[2.2, 2.2]} />
            <meshStandardMaterial color={colors.rugBase} roughness={0.9} />
          </mesh>
          {/* Rug border pattern */}
          {[
            [-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0],
            [-0.8, -1.0], [0.8, -1.0], [1.0, -0.8], [1.0, 0.8],
            [0.8, 1.0], [-0.8, 1.0], [-1.0, 0.8], [-1.0, -0.8]
          ].map((pos, i) => (
            <mesh key={`rug-${i}`} position={[pos[0], 0.015, pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.08, 6]} />
              <meshStandardMaterial color={colors.rugPattern} roughness={0.85} />
            </mesh>
          ))}
          {/* Central medallion */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <torusGeometry args={[0.35, 0.04, 6, 8]} />
            <meshStandardMaterial color={colors.rugAccent} roughness={0.85} />
          </mesh>
        </group>

        {/* Animated Sufi figure */}
        <group ref={sufiBodyRef} position={[0, 0.18, 0]}>
          {/* Seated lower body with robe folds */}
          <group position={[0, 0.3, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.5, 0.55, 0.45, 12]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            {/* Robe fold details */}
            {Array.from({ length: 4 }).map((_, i) => {
              const angle = (i / 4) * Math.PI * 2;
              return (
                <mesh
                  key={`fold-${i}`}
                  position={[Math.cos(angle) * 0.45, -0.1, Math.sin(angle) * 0.45]}
                  rotation={[0, angle, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.15, 0.35, 0.08]} />
                  <meshStandardMaterial color={colors.robeShadow} roughness={0.9} />
                </mesh>
              );
            })}
          </group>

          {/* Torso with robe details */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.32, 0.55, 10]} />
            <meshStandardMaterial color={colors.robe} roughness={0.85} />
          </mesh>
          {/* Decorative robe trim */}
          <mesh position={[0, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 10]} />
            <meshStandardMaterial color={colors.turbanBand} roughness={0.7} metalness={0.3} />
          </mesh>

          {/* Shoulders */}
          <mesh position={[-0.25, 0.85, 0]} castShadow>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>
          <mesh position={[0.25, 0.85, 0]} castShadow>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 1.05, 0.02]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.12, 8]} />
            <meshStandardMaterial color={colors.skin} roughness={0.75} />
          </mesh>

          {/* Head with visible eyes and facial features */}
          <group ref={sufiHeadRef} position={[0, 1.15, 0.05]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color={colors.skin} roughness={0.7} />
            </mesh>

            {/* EYES - clearly visible */}
            {/* Left eye */}
            <mesh position={[-0.07, 0.04, 0.15]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color={colors.eyeWhite} roughness={0.3} />
            </mesh>
            <mesh position={[-0.07, 0.04, 0.165]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color={colors.eye} roughness={0.9} />
            </mesh>
            {/* Right eye */}
            <mesh position={[0.07, 0.04, 0.15]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color={colors.eyeWhite} roughness={0.3} />
            </mesh>
            <mesh position={[0.07, 0.04, 0.165]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color={colors.eye} roughness={0.9} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, 0, 0.16]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.03, 0.08, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.75} />
            </mesh>

            {/* Beard */}
            <mesh position={[0, -0.08, 0.1]} castShadow>
              <sphereGeometry args={[0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
            </mesh>
          </group>

          {/* Turban - RAISED HIGHER so eyes are visible */}
          <group position={[0, 1.38, 0.05]}>
            {/* Base wrap */}
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.18, 0.18, 16]} />
              <meshStandardMaterial color={colors.turban} roughness={0.8} />
            </mesh>
            {/* Turban wraps - layered */}
            {Array.from({ length: 3 }).map((_, i) => (
              <mesh key={`turban-${i}`} position={[0, i * 0.05, 0]} rotation={[0, (i * Math.PI) / 6, 0]} castShadow>
                <torusGeometry args={[0.19 - i * 0.02, 0.04, 8, 12]} />
                <meshStandardMaterial color={i === 1 ? colors.turbanBand : colors.turban} roughness={0.8} />
              </mesh>
            ))}
            {/* Turban top knot */}
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={colors.turbanBand} roughness={0.75} />
            </mesh>
          </group>

          {/* Arms with proper joints */}
          {/* Left arm - holding flute to mouth */}
          <group position={[-0.25, 0.8, 0]}>
            <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 3.5]} castShadow>
              <cylinderGeometry args={[0.065, 0.075, 0.32, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[-0.12, 0.05, 0.12]} rotation={[Math.PI / 4, 0, Math.PI / 2.5]} castShadow>
              <cylinderGeometry args={[0.055, 0.065, 0.28, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[-0.08, 0.22, 0.18]} castShadow>
              <sphereGeometry args={[0.055, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>

          {/* Right arm - supporting flute */}
          <group position={[0.25, 0.8, 0]}>
            <mesh position={[0, -0.08, 0]} rotation={[0, 0, -Math.PI / 5]} castShadow>
              <cylinderGeometry args={[0.065, 0.075, 0.3, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[0.1, -0.02, 0.1]} rotation={[-Math.PI / 6, 0, -Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.055, 0.065, 0.26, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[0.15, 0.08, 0.12]} castShadow>
              <sphereGeometry args={[0.055, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>

          {/* Al-nāy (reed flute) - detailed with finger holes */}
          <group position={[0, 1.0, 0.18]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.022, 0.028, 0.7, 12]} />
              <meshStandardMaterial color={colors.flute} roughness={0.6} />
            </mesh>
            {/* Decorative bands */}
            {[-0.25, -0.1, 0.1, 0.25].map((pos, i) => (
              <mesh key={`band-${i}`} position={[0, pos, 0]} castShadow>
                <cylinderGeometry args={[0.032, 0.032, 0.025, 12]} />
                <meshStandardMaterial color={colors.fluteDetail} roughness={0.7} />
              </mesh>
            ))}
            {/* Finger holes */}
            {[-0.15, -0.05, 0.05, 0.15, 0.25].map((pos, i) => (
              <mesh key={`hole-${i}`} position={[0.025, pos, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 0.015, 6]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Woven basket with detailed weave pattern */}
        <group position={[-0.65, 0, 0.35]}>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.34, 0.4, 16]} />
            <meshStandardMaterial color={colors.basketWeave} roughness={0.95} />
          </mesh>
          {/* Weave texture - horizontal bands */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`weave-${i}`} position={[0, 0.1 + i * 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.31, 0.31, 0.02, 16]} />
              <meshStandardMaterial color={i % 2 === 0 ? colors.basketWeave : colors.basketDark} roughness={0.95} />
            </mesh>
          ))}
          {/* Basket rim */}
          <mesh position={[0, 0.48, 0]} castShadow>
            <torusGeometry args={[0.3, 0.04, 8, 16]} />
            <meshStandardMaterial color={colors.basketDark} roughness={0.9} />
          </mesh>

          {/* Basket lid - propped open */}
          <mesh position={[0.4, 0.22, 0]} rotation={[0, 0, Math.PI / 3]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.06, 16]} />
            <meshStandardMaterial color={colors.basketDark} roughness={0.95} />
          </mesh>

          {/* SINUOUS SNAKE - NO HOOD, graceful and flowing (scaled to half size) */}
          <group ref={snakeRef} position={[0, 0.25, 0]}>
            {/* 14 segments for ultra-smooth sinuous movement */}
            {Array.from({ length: 14 }).map((_, i) => {
              const t = i / 13;
              const baseWidth = 0.075; // Half of original 0.15
              const width = baseWidth * (1 - t * 0.6); // Taper from base to tip
              const yOffset = i * 0.06; // Half of original 0.12
              const naturalCurve = Math.sin(t * Math.PI * 0.8) * 0.075; // Half of original 0.15

              return (
                <group key={`snake-seg-${i}`} position={[naturalCurve, yOffset, 0]}>
                  {/* Main body segment */}
                  <mesh castShadow receiveShadow>
                    <capsuleGeometry args={[width * 0.9, 0.06, 8, 12]} /> {/* Height halved from 0.12 */}
                    <meshStandardMaterial
                      color={i % 2 === 0 ? colors.snake : colors.snakeDark}
                      roughness={0.4}
                    />
                  </mesh>

                  {/* Scale pattern - diamond shapes */}
                  {i < 13 && Array.from({ length: 6 }).map((_, si) => {
                    const angle = (si / 6) * Math.PI * 2;
                    return (
                      <mesh
                        key={`scale-${si}`}
                        position={[Math.cos(angle) * width * 0.85, 0.015, Math.sin(angle) * width * 0.85]}
                        rotation={[0, angle, 0]}
                      >
                        <circleGeometry args={[width * 0.18, 4]} />
                        <meshStandardMaterial color={colors.snakePattern} roughness={0.5} />
                      </mesh>
                    );
                  })}

                  {/* Belly scales (lighter color on bottom) */}
                  {i > 0 && i < 12 && (
                    <mesh position={[0, -0.025, width * 0.8]} rotation={[Math.PI / 2, 0, 0]}> {/* y halved */}
                      <planeGeometry args={[width * 1.4, 0.05]} /> {/* Height halved */}
                      <meshStandardMaterial color={colors.snakeBelly} roughness={0.6} />
                    </mesh>
                  )}
                </group>
              );
            })}

            {/* Snake head - elegant, no hood (scaled to half size) */}
            <group position={[0, 0.875, 0]}> {/* Height halved from 1.75 */}
              {/* Head body - slightly flattened */}
              <mesh castShadow>
                <capsuleGeometry args={[0.04, 0.06, 8, 12]} /> {/* Both dimensions halved */}
                <meshStandardMaterial color={colors.snake} roughness={0.4} />
              </mesh>

              {/* Eyes - glowing amber */}
              <mesh position={[0.02, 0.03, 0.04]}> {/* All positions halved */}
                <sphereGeometry args={[0.0075, 8, 8]} /> {/* Radius halved */}
                <meshStandardMaterial
                  color="#ffcc44"
                  emissive="#ff8800"
                  emissiveIntensity={0.6}
                />
              </mesh>
              <mesh position={[-0.02, 0.03, 0.04]}> {/* All positions halved */}
                <sphereGeometry args={[0.0075, 8, 8]} /> {/* Radius halved */}
                <meshStandardMaterial
                  color="#ffcc44"
                  emissive="#ff8800"
                  emissiveIntensity={0.6}
                />
              </mesh>

              {/* Forked tongue - extends forward */}
              <group position={[0, 0, 0.06]} rotation={[0.2, 0, 0]}> {/* z position halved */}
                <mesh position={[-0.004, 0, 0.025]}> {/* All halved */}
                  <cylinderGeometry args={[0.0015, 0.0015, 0.05, 4]} /> {/* All halved */}
                  <meshStandardMaterial color="#cc3333" emissive="#ff0000" emissiveIntensity={0.2} />
                </mesh>
                <mesh position={[0.004, 0, 0.025]}> {/* All halved */}
                  <cylinderGeometry args={[0.0015, 0.0015, 0.05, 4]} /> {/* All halved */}
                  <meshStandardMaterial color="#cc3333" emissive="#ff0000" emissiveIntensity={0.2} />
                </mesh>
              </group>

              {/* Nostril slits */}
              <mesh position={[0.0125, 0.01, 0.045]} rotation={[0, 0, Math.PI / 4]}> {/* All halved */}
                <cylinderGeometry args={[0.0025, 0.0025, 0.0075, 4]} /> {/* All halved */}
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              <mesh position={[-0.0125, 0.01, 0.045]} rotation={[0, 0, -Math.PI / 4]}> {/* All halved */}
                <cylinderGeometry args={[0.0025, 0.0025, 0.0075, 4]} /> {/* All halved */}
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Ornate wooden table */}
        <group position={[0.75, 0, 0]}>
          {/* Table top with wood grain effect */}
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.65, 0.06, 0.45]} />
            <meshStandardMaterial color={colors.wood} roughness={0.85} />
          </mesh>
          {/* Wood grain lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={`grain-${i}`} position={[-0.25 + i * 0.12, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.03, 0.45]} />
              <meshStandardMaterial color={colors.woodDark} roughness={0.9} transparent opacity={0.3} />
            </mesh>
          ))}

          {/* Carved table legs */}
          {[[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]].map((pos, i) => (
            <group key={`leg-${i}`} position={[pos[0], 0.19, pos[1]]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.05, 0.06, 0.38, 8]} />
                <meshStandardMaterial color={colors.woodDark} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <torusGeometry args={[0.055, 0.015, 6, 8]} />
                <meshStandardMaterial color={colors.wood} roughness={0.85} />
              </mesh>
            </group>
          ))}

          {/* Collection basket with detailed coins */}
          <group position={[0, 0.42, 0.12]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.14, 0.16, 0.1, 12]} />
              <meshStandardMaterial color={colors.basketWeave} roughness={0.95} />
            </mesh>
            {/* Basket weave detail */}
            {Array.from({ length: 3 }).map((_, i) => (
              <mesh key={`basket-band-${i}`} position={[0, -0.03 + i * 0.04, 0]}>
                <cylinderGeometry args={[0.145, 0.145, 0.008, 12]} />
                <meshStandardMaterial color={colors.basketDark} roughness={0.95} />
              </mesh>
            ))}

            {/* Coins with embossed details */}
            {coinPositions.map((coin, i) => (
              <group key={`coin-${i}`} position={coin.position} rotation={coin.rotation}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.045, 0.045, 0.012, 12]} />
                  <meshStandardMaterial
                    color={colors.coin}
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
                <mesh position={[0, 0.007, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.002, 8]} />
                  <meshStandardMaterial
                    color={colors.brass}
                    metalness={0.8}
                    roughness={0.25}
                  />
                </mesh>
              </group>
            ))}
          </group>

          {/* Ornate brass lantern at night */}
          {isNight && (
            <group position={[-0.2, 0.42, -0.12]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.09, 0.11, 0.22, 6]} />
                <meshStandardMaterial
                  color={colors.brass}
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
              {/* Glass panels */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                return (
                  <mesh
                    key={`glass-${i}`}
                    position={[Math.cos(angle) * 0.095, 0, Math.sin(angle) * 0.095]}
                    rotation={[0, angle, 0]}
                  >
                    <planeGeometry args={[0.14, 0.2]} />
                    <meshStandardMaterial
                      color="#ffaa55"
                      transparent
                      opacity={0.4}
                      emissive="#ff8833"
                      emissiveIntensity={lanternGlow * 0.5}
                    />
                  </mesh>
                );
              })}
              <mesh position={[0, 0.15, 0]} castShadow>
                <coneGeometry args={[0.1, 0.12, 6]} />
                <meshStandardMaterial
                  color={colors.brassDark}
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
              <mesh position={[0, 0.22, 0]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial
                  color={colors.brass}
                  metalness={0.9}
                  roughness={0.15}
                />
              </mesh>

              {/* Flame */}
              <group position={[0, 0.08, 0]}>
                <pointLight
                  color="#ff9944"
                  intensity={lanternGlow * 3.5}
                  distance={10}
                  decay={2}
                />
                <mesh>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial
                    color="#ffcc66"
                    emissive="#ff8833"
                    emissiveIntensity={lanternGlow * 3}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <mesh scale={[0.6, 0.8, 0.6]}>
                  <sphereGeometry args={[0.045, 6, 6]} />
                  <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffaa44"
                    emissiveIntensity={lanternGlow * 4}
                    transparent
                    opacity={0.7}
                  />
                </mesh>
              </group>

              <mesh position={[0, 0, 0]} scale={[1.8, 1.5, 1.8]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial
                  color="#ff9944"
                  transparent
                  opacity={lanternGlow * 0.1}
                  depthWrite={false}
                />
              </mesh>
            </group>
          )}

          {/* Incense burner with smoke */}
          <group position={[0.15, 0.42, -0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.08, 8]} />
              <meshStandardMaterial
                color={colors.brassDark}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.003, 0.003, 0.12, 4]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <sphereGeometry args={[0.008, 4, 4]} />
              <meshStandardMaterial
                color="#ff6633"
                emissive="#ff3300"
                emissiveIntensity={1.5}
              />
            </mesh>

            {/* Incense smoke particles */}
            <instancedMesh ref={incenseSmokeRef} args={[undefined, undefined, 12]} position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshStandardMaterial
                color="#aaaaaa"
                transparent
                opacity={0.3}
                depthWrite={false}
              />
            </instancedMesh>
          </group>
        </group>

        {/* Prayer beads (tasbih) - 33 beads */}
        <group position={[0.55, 0.025, -0.45]}>
          {Array.from({ length: 33 }).map((_, i) => {
            const angle = (i / 33) * Math.PI * 2;
            const r = 0.15;
            const beadColor = i % 11 === 0 ? colors.turbanBand : '#4a3a2a';
            return (
              <group
                key={`bead-${i}`}
                position={[Math.cos(angle) * r, 0.01, Math.sin(angle) * r]}
              >
                <mesh castShadow>
                  <sphereGeometry args={[0.018, 6, 6]} />
                  <meshStandardMaterial color={beadColor} roughness={0.5} />
                </mesh>
                {i < 32 && (
                  <mesh
                    position={[
                      Math.cos(angle + Math.PI / 33) * 0.08,
                      0,
                      Math.sin(angle + Math.PI / 33) * 0.08
                    ]}
                    rotation={[0, angle + Math.PI / 2, 0]}
                  >
                    <cylinderGeometry args={[0.003, 0.003, 0.09, 4]} />
                    <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
                  </mesh>
                )}
              </group>
            );
          })}
          {/* Tassel */}
          <group position={[0, 0, 0.15]}>
            {Array.from({ length: 5 }).map((_, i) => (
              <mesh key={`tassel-${i}`} position={[(i - 2) * 0.015, -0.05, 0]}>
                <cylinderGeometry args={[0.002, 0.004, 0.08, 4]} />
                <meshStandardMaterial color={colors.turbanBand} roughness={0.7} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Sacred geometric pattern on rug */}
        <mesh position={[0, 0.025, -0.35]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <torusGeometry args={[0.18, 0.025, 6, 8]} />
          <meshStandardMaterial color={colors.rugAccent} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.03, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.14, 8]} />
          <meshStandardMaterial color={colors.rugPattern} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};
