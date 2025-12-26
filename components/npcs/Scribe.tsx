/**
 * Scribe/Calligrapher NPC (Kātib/Warrāq - كاتب/ورّاق)
 * Professional letter writer and manuscript copier
 * Essential service in medieval Damascus for contracts, letters, documents
 */

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { NPCStats, SocialClass, AgentState } from '../../types';

interface ScribeProps {
  position: [number, number, number];
  timeOfDay?: number;
  onSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  isSelected?: boolean;
}

export const Scribe: React.FC<ScribeProps> = ({
  position,
  timeOfDay = 12,
  onSelect,
  isSelected = false
}) => {
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const penRef = useRef<THREE.Group>(null);
  const parchmentRef = useRef<THREE.Group>(null);
  const animTime = useRef(0);
  const writingPhase = useRef(0);
  const [hovered, setHovered] = useState(false);

  const isNight = timeOfDay >= 19 || timeOfDay < 5;

  // Procedurally generated NPC stats
  const npcStats = useMemo<NPCStats>(() => {
    const seed = position[0] * 1000 + position[2];
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const names = ['Mustafa', 'Ali', 'Hamza', 'Tariq', 'Nasir'];
    const name = names[Math.floor(seededRandom(seed) * names.length)];
    const age = 40 + Math.floor(seededRandom(seed + 1) * 35);

    return {
      id: `scribe-${position[0]}-${position[2]}`,
      name: `${name} al-Warrāq`,
      age,
      profession: 'Scribe & Calligrapher',
      gender: 'Male',
      socialClass: SocialClass.MERCHANT,
      ethnicity: 'Arab',
      religion: 'Sunni Islam',
      language: 'Arabic',
      height: 164 + seededRandom(seed + 2) * 16,
      weight: 68 + seededRandom(seed + 3) * 22,
      mood: 'Focused',
      awarenessLevel: 60,
      panicLevel: 25,
      goalOfDay: 'Copy manuscripts and write letters',
      heldItem: 'none',
      headwearStyle: 'turban',
      accessories: ['Reed pens', 'Colored inks', 'Wax seal']
    };
  }, [position]);

  // Enhanced animate writing motion with more variation
  useFrame((state, delta) => {
    animTime.current += delta;
    const time = animTime.current;

    // Writing cycle - dip pen, write, pause, repeat (slower for realism)
    writingPhase.current = (time * 0.5) % 5; // 5 second cycle
    const isDipping = writingPhase.current < 0.6;
    const isWriting = writingPhase.current >= 0.6 && writingPhase.current < 3.8;
    const isPaused = writingPhase.current >= 3.8;

    // Head movement - more detailed focus behavior with natural sway
    if (headRef.current) {
      let headTilt, headTurn, headNod;

      if (isDipping) {
        // Looking at ink pots
        headTilt = -0.35 + Math.sin(time * 2) * 0.02;
        headTurn = -0.25 + Math.sin(time * 1.5) * 0.05;
        headNod = Math.sin(time * 1.8) * 0.03;
      } else if (isWriting) {
        // Following pen across page with more natural movement
        headTilt = -0.25 + Math.sin(time * 0.8) * 0.04;
        headTurn = Math.sin(time * 2.5) * 0.15;
        headNod = Math.sin(time * 3) * 0.025;
      } else {
        // Reading what was written - slight head raise
        headTilt = -0.18 + Math.sin(time * 1.2) * 0.05;
        headTurn = Math.sin(time * 0.6) * 0.1;
        headNod = Math.sin(time * 2.2) * 0.02;
      }

      headRef.current.rotation.x = headTilt + headNod;
      headRef.current.rotation.y = headTurn;
      // Add subtle head tilt for more natural movement
      headRef.current.rotation.z = Math.sin(time * 0.7) * 0.04;
    }

    // Right arm and pen - refined writing motion with more flourish
    if (rightArmRef.current && penRef.current) {
      if (isDipping) {
        // Dipping pen in ink - lift and dip motion
        const dip = Math.sin(time * 4) * 0.06;
        rightArmRef.current.rotation.z = -Math.PI / 4 + dip * 0.8;
        rightArmRef.current.rotation.x = Math.sin(time * 4) * 0.04;
        penRef.current.position.y = 0.38 + dip * 0.5;
        penRef.current.position.x = 0.25;
      } else if (isWriting) {
        // Writing motion - horizontal calligraphic strokes with varied speed
        const writeMotion = Math.sin(time * 3.2) * 0.2;
        const pressure = Math.abs(Math.sin(time * 3.2)) * 0.025;
        const flourish = Math.sin(time * 6.4) * 0.01; // Quick detail strokes
        rightArmRef.current.rotation.z = -Math.PI / 3.5 - pressure;
        rightArmRef.current.rotation.x = Math.sin(time * 3.2) * 0.08;
        penRef.current.position.x = 0.25 + writeMotion;
        penRef.current.position.y = 0.45 - pressure + flourish;
        penRef.current.position.z = -0.25 + Math.sin(time * 3.2) * 0.01;
      } else {
        // Paused - lifting pen slightly, examining work
        rightArmRef.current.rotation.z = -Math.PI / 4.5 + Math.sin(time * 1.2) * 0.02;
        rightArmRef.current.rotation.x = Math.sin(time * 1.0) * 0.03;
        penRef.current.position.y = 0.52;
        penRef.current.position.x = 0.25;
      }
    }

    // Left arm - supporting/steadying parchment with more subtle movement
    if (leftArmRef.current) {
      const steady = Math.sin(time * 0.8) * 0.025;
      const adjust = isDipping ? Math.sin(time * 2) * 0.04 : 0;
      leftArmRef.current.rotation.z = Math.PI / 5 + steady;
      leftArmRef.current.rotation.x = adjust;
    }

    // Animate parchment slightly when writing (from pen pressure)
    if (parchmentRef.current && isWriting) {
      const ripple = Math.abs(Math.sin(time * 3.2)) * 0.008;
      parchmentRef.current.position.y = 0.45 - ripple;
    } else if (parchmentRef.current) {
      parchmentRef.current.position.y = 0.45;
    }
  });

  const colors = {
    robe: '#4a5a3a',
    robeHighlight: '#5a6a4a',
    turban: '#c8b898',
    turbanBand: '#a89868',
    skin: '#c89864',
    skinShadow: '#a87854',
    carpet: '#5a3a3a',
    carpetPattern: '#7a4a3a',
    wood: '#6a5340',
    woodDark: '#5a4330',
    parchment: '#f0e8d0',
    parchmentOld: '#e0d8c0',
    parchmentDrying: '#f8f0e0',
    ink: '#1a1a2a',
    inkRed: '#8a3a3a',
    inkGold: '#c8a858',
    ceramic: '#d0c8b0',
    ceramicDark: '#b0a890'
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
          <ringGeometry args={[1.3, 1.5, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={15} position={[0, 2.5, 0]} center>
          <div className="bg-black/90 backdrop-blur-md p-4 rounded-xl border border-yellow-600/40 text-yellow-50 w-56 shadow-2xl pointer-events-none select-none">
            <h4 className="historical-font text-yellow-400 border-b border-yellow-900/50 pb-2 mb-2 uppercase text-xs tracking-wider font-bold">
              {npcStats.name}
            </h4>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-yellow-500/60 font-bold">AGE</span><span>{npcStats.age} Years</span></div>
              <div className="flex justify-between"><span className="text-yellow-500/60 font-bold">CLASS</span><span>{npcStats.socialClass}</span></div>
              <div className="flex justify-between"><span className="text-yellow-500/60 font-bold">PROFESSION</span><span>{npcStats.profession}</span></div>
              <div className="flex justify-between"><span className="text-yellow-500/60 font-bold">MOOD</span><span>{npcStats.mood}</span></div>
              <div className="flex justify-between"><span className="text-yellow-500/60 font-bold">GOAL</span><span className="text-right">{npcStats.goalOfDay}</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-yellow-900/50 text-[9px] text-yellow-300/70 italic">
              Master of calligraphy
            </div>
          </div>
        </Html>
      )}

      <group>
        {/* Work carpet */}
        <group position={[0, 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[2.2, 2.0]} />
            <meshStandardMaterial color={colors.carpet} roughness={0.9} />
          </mesh>
          {/* Simple border pattern */}
          {[-0.95, -0.45, 0, 0.45, 0.95].map((x, i) => (
            <mesh key={`border-${i}`} position={[x, 0.015, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.08, 0.015, 0.012]} />
              <meshStandardMaterial color={colors.carpetPattern} roughness={0.85} />
            </mesh>
          ))}
        </group>

        {/* Seated scribe figure */}
        <group position={[0, 0.15, 0.1]}>
          {/* Lower body - seated cross-legged */}
          <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.42, 0.38, 12]} />
            <meshStandardMaterial color={colors.robe} roughness={0.85} />
          </mesh>

          {/* Torso - leaning forward slightly */}
          <mesh position={[0, 0.58, -0.05]} rotation={[0.15, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.48, 10]} />
            <meshStandardMaterial color={colors.robe} roughness={0.85} />
          </mesh>

          {/* Shoulders */}
          <mesh position={[-0.2, 0.72, -0.05]} castShadow>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>
          <mesh position={[0.2, 0.72, -0.05]} castShadow>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={colors.robeHighlight} roughness={0.85} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 0.88, -0.03]} castShadow>
            <cylinderGeometry args={[0.065, 0.075, 0.1, 8]} />
            <meshStandardMaterial color={colors.skin} roughness={0.75} />
          </mesh>

          {/* Head - focused downward */}
          <group ref={headRef} position={[0, 1.0, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial color={colors.skin} roughness={0.7} />
            </mesh>

            {/* Eyes - looking down at work */}
            <mesh position={[-0.055, 0, 0.13]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial color="#f0e8d8" roughness={0.3} />
            </mesh>
            <mesh position={[-0.055, -0.005, 0.142]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#2a2a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0.055, 0, 0.13]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial color="#f0e8d8" roughness={0.3} />
            </mesh>
            <mesh position={[0.055, -0.005, 0.142]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#2a2a1a" roughness={0.9} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.02, 0.14]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.022, 0.065, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.75} />
            </mesh>

            {/* Mustache and beard */}
            <mesh position={[0, -0.06, 0.11]} castShadow>
              <boxGeometry args={[0.12, 0.03, 0.06]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.1, 0.08]} castShadow>
              <sphereGeometry args={[0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
            </mesh>
          </group>

          {/* Simple turban */}
          <group position={[0, 1.2, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.17, 0.15, 0.14, 16]} />
              <meshStandardMaterial color={colors.turban} roughness={0.8} />
            </mesh>
            {Array.from({ length: 2 }).map((_, i) => (
              <mesh key={`turban-${i}`} position={[0, i * 0.04, 0]} rotation={[0, (i * Math.PI) / 6, 0]} castShadow>
                <torusGeometry args={[0.16 - i * 0.01, 0.03, 8, 12]} />
                <meshStandardMaterial color={i === 0 ? colors.turbanBand : colors.turban} roughness={0.8} />
              </mesh>
            ))}
          </group>

          {/* Left arm - resting on knee */}
          <group ref={leftArmRef} position={[-0.2, 0.68, -0.05]}>
            <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI / 5]} castShadow>
              <cylinderGeometry args={[0.055, 0.065, 0.26, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[-0.08, -0.22, 0.1]} rotation={[Math.PI / 4, 0, Math.PI / 3]} castShadow>
              <cylinderGeometry args={[0.048, 0.055, 0.22, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[-0.12, -0.32, 0.18]} castShadow>
              <sphereGeometry args={[0.048, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>

          {/* Right arm - writing */}
          <group ref={rightArmRef} position={[0.2, 0.68, -0.05]}>
            <mesh position={[0, -0.1, 0]} rotation={[0, 0, -Math.PI / 3.5]} castShadow>
              <cylinderGeometry args={[0.055, 0.065, 0.28, 8]} />
              <meshStandardMaterial color={colors.robe} roughness={0.85} />
            </mesh>
            <mesh position={[0.1, -0.18, 0.12]} rotation={[-Math.PI / 4, 0, -Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.048, 0.055, 0.24, 8]} />
              <meshStandardMaterial color={colors.skin} roughness={0.75} />
            </mesh>
            <mesh position={[0.15, -0.24, 0.2]} castShadow>
              <sphereGeometry args={[0.048, 6, 6]} />
              <meshStandardMaterial color={colors.skinShadow} roughness={0.8} />
            </mesh>
          </group>
        </group>

        {/* LOW WOODEN WRITING DESK */}
        <group position={[0, 0.4, -0.25]}>
          {/* Desktop - angled for writing */}
          <mesh rotation={[-Math.PI / 12, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.85, 0.04, 0.5]} />
            <meshStandardMaterial color={colors.wood} roughness={0.85} />
          </mesh>
          {/* Wood grain */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`grain-${i}`} position={[-0.35 + i * 0.14, 0.022, 0]} rotation={[-Math.PI / 12, 0, 0]}>
              <planeGeometry args={[0.025, 0.5]} />
              <meshStandardMaterial color={colors.woodDark} roughness={0.9} transparent opacity={0.25} />
            </mesh>
          ))}

          {/* Decorative carved edge */}
          <mesh position={[0, 0, -0.25]} rotation={[-Math.PI / 12, 0, 0]} castShadow>
            <boxGeometry args={[0.85, 0.05, 0.03]} />
            <meshStandardMaterial color={colors.woodDark} roughness={0.9} />
          </mesh>

          {/* Legs - splayed for stability */}
          {[[-0.35, -0.15], [0.35, -0.15], [-0.35, 0.15], [0.35, 0.15]].map((pos, i) => (
            <mesh key={`leg-${i}`} position={[pos[0], -0.2, pos[1]]} rotation={[0, 0, (i % 2 === 0 ? 0.1 : -0.1)]} castShadow>
              <cylinderGeometry args={[0.04, 0.045, 0.4, 8]} />
              <meshStandardMaterial color={colors.woodDark} roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* PARCHMENT being written on */}
        <group ref={parchmentRef} position={[0.25, 0.45, -0.25]} rotation={[-Math.PI / 12, 0, 0]}>
          <mesh receiveShadow>
            <planeGeometry args={[0.5, 0.4]} />
            <meshStandardMaterial color={colors.parchment} roughness={0.85} />
          </mesh>
          {/* Written lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={`text-${i}`} position={[0, 0.12 - i * 0.035, 0.001]}>
              <planeGeometry args={[0.38, 0.008]} />
              <meshStandardMaterial color={colors.ink} roughness={0.9} />
            </mesh>
          ))}
          {/* Current line being written - partially done */}
          <mesh position={[-0.1, -0.16, 0.001]}>
            <planeGeometry args={[0.18, 0.008]} />
            <meshStandardMaterial color={colors.ink} roughness={0.9} />
          </mesh>
        </group>

        {/* REED PEN (Qalam) */}
        <group ref={penRef} position={[0.25, 0.48, -0.22]} rotation={[Math.PI / 2.5, 0, Math.PI / 6]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.007, 0.01, 0.22, 8]} />
            <meshStandardMaterial color="#9a8a6a" roughness={0.85} />
          </mesh>
          {/* Nib - split tip */}
          <mesh position={[0, -0.112, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.003, 0.02, 0.008]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
          </mesh>
        </group>

        {/* INK POTS - three colors */}
        <group position={[-0.28, 0.42, -0.3]}>
          {/* Black ink */}
          <group position={[0, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.05, 0.055, 0.09, 12]} />
              <meshStandardMaterial color={colors.ceramic} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color={colors.ink} roughness={0.95} />
            </mesh>
          </group>

          {/* Red ink */}
          <group position={[0.11, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.045, 0.05, 0.08, 12]} />
              <meshStandardMaterial color={colors.ceramicDark} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.045, 0]} castShadow>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color={colors.inkRed} roughness={0.95} />
            </mesh>
          </group>

          {/* Gold ink - precious */}
          <group position={[0.22, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.04, 0.045, 0.07, 12]} />
              <meshStandardMaterial color={colors.ceramic} roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.04, 0]} castShadow>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial
                color={colors.inkGold}
                metalness={0.6}
                roughness={0.4}
              />
            </mesh>
          </group>
        </group>

        {/* PEN TRIMMING KNIFE */}
        <group position={[-0.25, 0.42, -0.15]} rotation={[-Math.PI / 12, 0, -Math.PI / 3]}>
          {/* Handle */}
          <mesh castShadow>
            <cylinderGeometry args={[0.012, 0.015, 0.1, 8]} />
            <meshStandardMaterial color={colors.woodDark} roughness={0.85} />
          </mesh>
          {/* Blade */}
          <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.05, 0.002, 0.015]} />
            <meshStandardMaterial color="#c8c8d0" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>

        {/* FINISHED PARCHMENTS - rolled scrolls */}
        <group position={[0.4, 0.03, 0.3]}>
          {Array.from({ length: 3 }).map((_, i) => (
            <group key={`scroll-${i}`} position={[i * 0.08, i * 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.35, 12]} />
                <meshStandardMaterial color={colors.parchmentOld} roughness={0.85} />
              </mesh>
              {/* Ribbon tie */}
              <mesh position={[0, 0, 0]}>
                <torusGeometry args={[0.03, 0.005, 6, 12]} />
                <meshStandardMaterial color="#8a3a3a" roughness={0.7} />
              </mesh>
            </group>
          ))}
        </group>

        {/* PARCHMENTS HANGING TO DRY - on rope line */}
        <group position={[0, 1.2, 0.5]}>
          {/* Rope */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 1.4, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
          </mesh>

          {/* Hanging parchments */}
          {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
            <group key={`hanging-${i}`} position={[x, 0, 0]}>
              {/* Clothespin */}
              <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <boxGeometry args={[0.015, 0.04, 0.01]} />
                <meshStandardMaterial color={colors.wood} roughness={0.9} />
              </mesh>
              {/* Parchment sheet */}
              <mesh position={[0, -0.15, 0]} rotation={[0.1 + Math.sin(i) * 0.15, 0, 0]} castShadow>
                <planeGeometry args={[0.25, 0.3]} />
                <meshStandardMaterial color={colors.parchmentDrying} roughness={0.85} side={THREE.DoubleSide} />
              </mesh>
              {/* Written text on hanging parchment */}
              {Array.from({ length: 5 }).map((_, li) => (
                <mesh
                  key={`hline-${li}`}
                  position={[0, -0.08 + li * 0.015, -0.15]}
                  rotation={[0.1 + Math.sin(i) * 0.15, 0, 0]}
                >
                  <planeGeometry args={[0.18, 0.005]} />
                  <meshStandardMaterial color={colors.ink} roughness={0.9} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Rope support posts */}
          <mesh position={[-0.7, -0.6, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 1.2, 8]} />
            <meshStandardMaterial color={colors.woodDark} roughness={0.9} />
          </mesh>
          <mesh position={[0.7, -0.6, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 1.2, 8]} />
            <meshStandardMaterial color={colors.woodDark} roughness={0.9} />
          </mesh>
        </group>

        {/* STACK OF BLANK PARCHMENTS - ready to use */}
        <group position={[0.35, 0.42, -0.4]} rotation={[-Math.PI / 12, 0, 0.1]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={`blank-${i}`} position={[0, i * 0.008, 0]} receiveShadow castShadow>
              <boxGeometry args={[0.3, 0.005, 0.4]} />
              <meshStandardMaterial color={colors.parchment} roughness={0.85} />
            </mesh>
          ))}
        </group>

        {/* Oil lamp for night work */}
        {isNight && (
          <group position={[-0.35, 0.42, -0.45]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.055, 0.07, 0.055, 12]} />
              <meshStandardMaterial color="#a87a5a" roughness={0.7} />
            </mesh>
            <mesh position={[0.07, 0.035, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.07, 8]} />
              <meshStandardMaterial color="#a87a5a" roughness={0.7} />
            </mesh>
            {/* Flame */}
            <group position={[0.07, 0.075, 0]}>
              <pointLight color="#ff9944" intensity={2.8} distance={7} decay={2} />
              <mesh>
                <sphereGeometry args={[0.022, 8, 8]} />
                <meshStandardMaterial
                  color="#ffcc66"
                  emissive="#ff8833"
                  emissiveIntensity={2.8}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            </group>
          </group>
        )}

        {/* Wax seal stamp - for sealing letters */}
        <group position={[-0.15, 0.42, -0.42]}>
          {/* Handle */}
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.08, 8]} />
            <meshStandardMaterial color={colors.wood} roughness={0.85} />
          </mesh>
          {/* Seal head - brass */}
          <mesh position={[0, -0.05, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
            <meshStandardMaterial color="#c8a858" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
