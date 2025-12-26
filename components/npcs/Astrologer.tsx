/**
 * Astrologer/Astronomer NPC (Munajjim - منجّم)
 * Scholarly figure consulting celestial charts and brass astrolabe
 * Common in 14th century Damascus - city had famous Umayyad Observatory
 */

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { NPCStats, SocialClass, AgentState } from '../../types';

interface AstrologerProps {
  position: [number, number, number];
  timeOfDay?: number;
  onSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  isSelected?: boolean;
}

export const Astrologer: React.FC<AstrologerProps> = ({
  position,
  timeOfDay = 12,
  onSelect,
  isSelected = false
}) => {
  const astrolabeRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const animTime = useRef(0);
  const [hovered, setHovered] = useState(false);

  const isNight = timeOfDay >= 19 || timeOfDay < 5;

  // Procedurally generated NPC stats
  const npcStats = useMemo<NPCStats>(() => {
    const seed = position[0] * 1000 + position[2];
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const names = ['Hasan', 'Omar', 'Khalil', 'Mansur', 'Zakariya'];
    const name = names[Math.floor(seededRandom(seed) * names.length)];
    const age = 45 + Math.floor(seededRandom(seed + 1) * 30);

    return {
      id: `astrologer-${position[0]}-${position[2]}`,
      name: `${name} al-Munajjim`,
      age,
      profession: 'Astrologer & Astronomer',
      gender: 'Male',
      socialClass: SocialClass.MERCHANT,
      ethnicity: 'Persian',
      religion: 'Shia Islam',
      language: 'Persian',
      height: 162 + seededRandom(seed + 2) * 18,
      weight: 70 + seededRandom(seed + 3) * 25,
      mood: 'Contemplative',
      awarenessLevel: 75,
      panicLevel: 35,
      goalOfDay: 'Consult the stars for omens',
      heldItem: 'none',
      headwearStyle: 'turban',
      accessories: ['Brass astrolabe', 'Star charts', 'Ink and quill']
    };
  }, [position]);

  // Simplified animations
  useFrame((state, delta) => {
    animTime.current += delta;
    const time = animTime.current;

    // Astrolabe rotation - consulting the instrument
    if (astrolabeRef.current) {
      const rotation = Math.sin(time * 0.4) * 0.5;
      const tilt = Math.sin(time * 0.35) * 0.15;
      astrolabeRef.current.rotation.y = rotation;
      astrolabeRef.current.rotation.x = Math.PI / 6 + tilt;
    }

    // Head movement - looking between astrolabe and charts
    if (headRef.current) {
      const headTurn = Math.sin(time * 0.35) * 0.25;
      const headTilt = Math.sin(time * 0.5) * 0.08;
      headRef.current.rotation.y = headTurn;
      headRef.current.rotation.x = headTilt - 0.15;
    }
  });

  const colors = {
    robe: '#2a4a5a',
    robeHighlight: '#3a5a6a',
    turban: '#d8c8a8',
    turbanBand: '#a89878',
    turbanStars: '#f4e4b8',
    skin: '#c89864',
    skinShadow: '#a87854',
    carpet: '#6a3a3a',
    carpetPattern: '#8a5a4a',
    brass: '#c8a858',
    brassDetail: '#d4b86a',
    brassDark: '#a88838',
    parchment: '#f0e8d0',
    parchmentOld: '#d8d0b8',
    ink: '#1a1a2a',
    inkRed: '#8a3a3a',
    wood: '#6a5340'
  };

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
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={15} position={[0, 2.5, 0]} center>
          <div className="bg-black/90 backdrop-blur-md p-4 rounded-xl border border-blue-600/40 text-blue-50 w-56 shadow-2xl pointer-events-none select-none">
            <h4 className="historical-font text-blue-400 border-b border-blue-900/50 pb-2 mb-2 uppercase text-xs tracking-wider font-bold">
              {npcStats.name}
            </h4>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-blue-500/60 font-bold">AGE</span><span>{npcStats.age} Years</span></div>
              <div className="flex justify-between"><span className="text-blue-500/60 font-bold">CLASS</span><span>{npcStats.socialClass}</span></div>
              <div className="flex justify-between"><span className="text-blue-500/60 font-bold">PROFESSION</span><span>{npcStats.profession}</span></div>
              <div className="flex justify-between"><span className="text-blue-500/60 font-bold">MOOD</span><span>{npcStats.mood}</span></div>
              <div className="flex justify-between"><span className="text-blue-500/60 font-bold">GOAL</span><span className="text-right">{npcStats.goalOfDay}</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-blue-900/50 text-[9px] text-blue-300/70 italic">
              Consulting celestial omens
            </div>
          </div>
        </Html>
      )}

      <group>
        {/* Prayer carpet base */}
        <group position={[0, 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1.8, 1.8]} />
            <meshStandardMaterial color={colors.carpet} roughness={0.9} />
          </mesh>
          {/* Carpet border pattern */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((x) =>
            [-0.8, 0.8].map((z, i) => (
              <mesh key={`border-x-${x}-${i}`} position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.06, 6]} />
                <meshStandardMaterial color={colors.carpetPattern} roughness={0.85} />
              </mesh>
            ))
          )}
          {[-0.8, 0.8].map((x) =>
            [-0.4, 0, 0.4].map((z, i) => (
              <mesh key={`border-z-${x}-${i}`} position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.06, 6]} />
                <meshStandardMaterial color={colors.carpetPattern} roughness={0.85} />
              </mesh>
            ))
          )}
        </group>

        {/* Seated scholar figure */}
        <group position={[0, 0.15, 0]}>
          {/* Lower body - seated cross-legged */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.4, 0.45, 0.4, 12]} />
            <meshStandardMaterial color={colors.robe} roughness={0.85} />
          </mesh>
          {/* Robe folds */}
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i / 4) * Math.PI * 2;
            return (
              <mesh
                key={`fold-${i}`}
                position={[Math.cos(angle) * 0.35, 0.15, Math.sin(angle) * 0.35]}
                rotation={[0, angle, 0]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.3, 0.06]} />
                <meshStandardMaterial color={colors.robe} roughness={0.9} />
              </mesh>
            );
          })}

          {/* Torso */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.28, 0.5, 10]} />
            <meshStandardMaterial color={colors.robe} roughness={0.85} />
          </mesh>

          {/* Shoulders */}
          <mesh position={[-0.22, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>
          <mesh position={[0.22, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 8]} />
            <meshStandardMaterial color={colors.skin} roughness={0.75} />
          </mesh>

          {/* Head with beard */}
          <group ref={headRef} position={[0, 1.05, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color={colors.skin} roughness={0.7} />
            </mesh>

            {/* Eyes */}
            <mesh position={[-0.06, 0.03, 0.14]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#f0e8d8" roughness={0.3} />
            </mesh>
            <mesh position={[-0.06, 0.03, 0.155]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#2a2a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0.06, 0.03, 0.14]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#f0e8d8" roughness={0.3} />
            </mesh>
            <mesh position={[0.06, 0.03, 0.155]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#2a2a1a" roughness={0.9} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.01, 0.15]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.025, 0.07, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.75} />
            </mesh>

            {/* Gray beard - scholarly appearance */}
            <mesh position={[0, -0.08, 0.09]} castShadow>
              <sphereGeometry args={[0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
              <meshStandardMaterial color="#5a5a5a" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.15, 0.06]} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.08]} />
              <meshStandardMaterial color="#5a5a5a" roughness={0.95} />
            </mesh>
          </group>

          {/* Turban with astronomical star motifs */}
          <group position={[0, 1.25, 0]}>
            {/* Base wrap */}
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.16, 0.16, 16]} />
              <meshStandardMaterial color={colors.turban} roughness={0.8} />
            </mesh>
            {/* Turban layers */}
            {Array.from({ length: 3 }).map((_, i) => (
              <mesh key={`turban-${i}`} position={[0, i * 0.045, 0]} rotation={[0, (i * Math.PI) / 5, 0]} castShadow>
                <torusGeometry args={[0.17 - i * 0.015, 0.035, 8, 12]} />
                <meshStandardMaterial color={i === 1 ? colors.turbanBand : colors.turban} roughness={0.8} />
              </mesh>
            ))}
            {/* Star decorations on turban */}
            {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
              <mesh
                key={`star-${i}`}
                position={[Math.cos(angle) * 0.16, 0.08, Math.sin(angle) * 0.16]}
                rotation={[-Math.PI / 2, 0, angle]}
              >
                <cylinderGeometry args={[0.018, 0.018, 0.005, 5]} />
                <meshStandardMaterial color={colors.turbanStars} metalness={0.4} roughness={0.6} />
              </mesh>
            ))}
          </group>

          {/* Left arm - gesturing at charts */}
          <group position={[-0.22, 0.7, 0]}>
            <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 0.28, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[-0.15, -0.08, 0.18]} rotation={[-Math.PI / 3, 0, Math.PI / 3]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.24, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[-0.22, -0.05, 0.3]} castShadow>
              <sphereGeometry args={[0.05, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>

          {/* Right arm - holding astrolabe */}
          <group position={[0.22, 0.7, 0]}>
            <mesh position={[0, -0.1, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 0.3, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[0.12, -0.15, 0.15]} rotation={[-Math.PI / 4, 0, -Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.26, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[0.2, -0.18, 0.25]} castShadow>
              <sphereGeometry args={[0.05, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>
        </group>

        {/* BRASS ASTROLABE - the iconic centerpiece */}
        <group ref={astrolabeRef} position={[0.35, 0.75, 0.3]} rotation={[Math.PI / 6, 0, 0]}>
          {/* Main circular body */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.03, 32]} />
            <meshStandardMaterial
              color={colors.brass}
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>

          {/* Rim detail */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <torusGeometry args={[0.22, 0.015, 8, 32]} />
            <meshStandardMaterial
              color={colors.brassDetail}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* Zodiac ring */}
          <mesh position={[0, 0.025, 0]}>
            <torusGeometry args={[0.18, 0.008, 6, 24]} />
            <meshStandardMaterial
              color={colors.brassDark}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>

          {/* Celestial markings - radial lines */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <mesh
                key={`mark-${i}`}
                position={[Math.cos(angle) * 0.15, 0.03, Math.sin(angle) * 0.15]}
                rotation={[-Math.PI / 2, 0, angle]}
              >
                <boxGeometry args={[0.01, 0.08, 0.005]} />
                <meshStandardMaterial color={colors.brassDark} roughness={0.4} />
              </mesh>
            );
          })}

          {/* Central pivot */}
          <mesh position={[0, 0.035, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
            <meshStandardMaterial
              color={colors.brassDetail}
              metalness={0.85}
              roughness={0.15}
            />
          </mesh>

          {/* Rotating alidade (sighting rule) */}
          <group rotation={[0, Math.PI / 4, 0]}>
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[0.35, 0.008, 0.015]} />
              <meshStandardMaterial
                color={colors.brassDark}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            {/* Sighting holes */}
            <mesh position={[0.15, 0.04, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
            <mesh position={[-0.15, 0.04, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          </group>

          {/* Suspension ring */}
          <mesh position={[0, 0.05, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.008, 8, 12]} />
            <meshStandardMaterial
              color={colors.brass}
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>
        </group>

        {/* Star charts and parchments spread around */}
        {/* Chart 1 - left side */}
        <group position={[-0.5, 0.025, 0.2]} rotation={[-Math.PI / 2, 0, -0.3]}>
          <mesh receiveShadow>
            <planeGeometry args={[0.45, 0.35]} />
            <meshStandardMaterial color={colors.parchment} roughness={0.85} />
          </mesh>
          {/* Zodiac circle drawn on chart */}
          <mesh position={[0, 0, 0.002]}>
            <torusGeometry args={[0.12, 0.004, 6, 16]} />
            <meshStandardMaterial color={colors.ink} roughness={0.9} />
          </mesh>
          {/* Star markings */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={`star1-${i}`}
                position={[Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, 0.002]}
              >
                <cylinderGeometry args={[0.008, 0.008, 0.002, 5]} />
                <meshStandardMaterial color={colors.inkRed} roughness={0.8} />
              </mesh>
            );
          })}
        </group>

        {/* Chart 2 - front */}
        <group position={[0.1, 0.025, 0.55]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <mesh receiveShadow>
            <planeGeometry args={[0.38, 0.5]} />
            <meshStandardMaterial color={colors.parchmentOld} roughness={0.85} />
          </mesh>
          {/* Written calculations */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`line-${i}`} position={[0, -0.15 + i * 0.06, 0.002]}>
              <planeGeometry args={[0.28, 0.01]} />
              <meshStandardMaterial color={colors.ink} roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* Chart 3 - right side */}
        <group position={[0.55, 0.025, -0.1]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <mesh receiveShadow>
            <planeGeometry args={[0.4, 0.4]} />
            <meshStandardMaterial color={colors.parchment} roughness={0.85} />
          </mesh>
          {/* Constellation diagram */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh
              key={`const-${i}`}
              position={[(Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, 0.002]}
            >
              <cylinderGeometry args={[0.006, 0.006, 0.002, 5]} />
              <meshStandardMaterial color={colors.ink} roughness={0.8} />
            </mesh>
          ))}
        </group>

        {/* Ink pots and writing tools */}
        <group position={[-0.45, 0.03, -0.35]}>
          {/* Ceramic ink pot */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.05, 0.08, 12]} />
            <meshStandardMaterial color="#4a5a6a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.085, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
          </mesh>

          {/* Reed pen (qalam) */}
          <mesh position={[0.08, 0.025, 0.06]} rotation={[0, 0, -Math.PI / 6]} castShadow>
            <cylinderGeometry args={[0.006, 0.008, 0.18, 8]} />
            <meshStandardMaterial color="#8a7a5a" roughness={0.85} />
          </mesh>
        </group>

        {/* Compass */}
        <group position={[0.5, 0.03, 0.45]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.015, 16]} />
            <meshStandardMaterial
              color={colors.brass}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Needle */}
          <mesh position={[0, 0.012, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.06, 0.004, 0.008]} />
            <meshStandardMaterial color="#8a3a3a" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>

        {/* Oil lamp for night work */}
        {isNight && (
          <group position={[-0.35, 0.03, 0.5]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.06, 12]} />
              <meshStandardMaterial color="#a87a5a" roughness={0.7} />
            </mesh>
            <mesh position={[0.08, 0.04, 0]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
              <meshStandardMaterial color="#a87a5a" roughness={0.7} />
            </mesh>
            {/* Flame */}
            <group position={[0.08, 0.08, 0]}>
              <pointLight color="#ff9944" intensity={2.5} distance={6} decay={2} />
              <mesh>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshStandardMaterial
                  color="#ffcc66"
                  emissive="#ff8833"
                  emissiveIntensity={2.5}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            </group>
          </group>
        )}
      </group>
    </group>
  );
};
