import React, { useRef, useState, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { AgentState, NPCStats, SocialClass, CONSTANTS, BuildingMetadata, Obstacle } from '../types';
import { Humanoid } from './Humanoid';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from '../utils/spatial';
import { seededRandom } from '../utils/procedural';

interface NPCProps {
  stats: NPCStats;
  initialState?: AgentState;
  position: THREE.Vector3;
  target: THREE.Vector3;
  onUpdate: (id: string, state: AgentState, pos: THREE.Vector3) => void;
  getSimTime: () => number;
  infectionRate: number;
  quarantine: boolean;
  simulationSpeed: number;
  buildings: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  agentHash?: SpatialHash<AgentSnapshot> | null;
  obstacles?: Obstacle[];
}

export const NPC: React.FC<NPCProps> = memo(({ 
  stats, 
  initialState = AgentState.HEALTHY, 
  position, 
  target, 
  onUpdate, 
  getSimTime,
  infectionRate,
  quarantine,
  simulationSpeed,
  buildings,
  buildingHash = null,
  agentHash = null,
  obstacles = []
}) => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const stateRef = useRef<AgentState>(initialState);
  const stateStartTimeRef = useRef(getSimTime());
  const currentPosRef = useRef(position.clone());
  const currentTargetRef = useRef(target.clone());

  const colors = useMemo(() => {
    switch (stats.socialClass) {
      case SocialClass.PEASANT: return { body: '#6b5a45', head: '#e2c6a2', turban: '#cdbb9a' };
      case SocialClass.MERCHANT: return { body: '#7b5a4a', head: '#e6c9a6', turban: '#d9c9a8' };
      case SocialClass.CLERGY: return { body: '#4a4f59', head: '#d9c4a0', turban: '#bfa57e' };
      case SocialClass.NOBILITY: return { body: '#6a5b4a', head: '#e6c9a6', turban: '#cbb58c' };
      default: return { body: '#6b5a45', head: '#e2c6a2', turban: '#cdbb9a' };
    }
  }, [stats.socialClass]);

  const appearance = useMemo(() => {
    const seed = Number(stats.id.split('-')[1] || '1');
    const tone = seededRandom(seed + 11);
    const skin = `hsl(${26 + Math.round(tone * 8)}, ${28 + Math.round(tone * 18)}%, ${30 + Math.round(tone * 18)}%)`;
    const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
    const hair = hairPalette[Math.floor(seededRandom(seed + 17) * hairPalette.length)];
    const scarfPalette = ['#d6c2a4', '#c7b08c', '#c2a878', '#bfa57e'];
    const scarf = scarfPalette[Math.floor(seededRandom(seed + 29) * scarfPalette.length)];
    const robePalette = ['#6f6a3f', '#7b5a4a', '#6b5a45', '#5c4b3a', '#4a4f59'];
    const robe = robePalette[Math.floor(seededRandom(seed + 41) * robePalette.length)];
    const accentPalette = ['#e1d3b3', '#d9c9a8', '#cbb58c', '#bfa57e'];
    const accent = accentPalette[Math.floor(seededRandom(seed + 43) * accentPalette.length)];
    return { skin, scarf, robe, accent, hair };
  }, [stats.id]);

  const pickNewTarget = () => {
    const range = CONSTANTS.MARKET_SIZE - 12;
    currentTargetRef.current.set(
      (Math.random() - 0.5) * 2 * range,
      0,
      (Math.random() - 0.5) * 2 * range
    );
  };

  useFrame((_, delta) => {
    if (!group.current || stateRef.current === AgentState.DECEASED) return;

    const simTime = getSimTime();
    // Freeze movement and logic if simulation is paused
    if (simulationSpeed <= 0) return;

    const effectiveDelta = delta * (simulationSpeed > 1 ? 1 : simulationSpeed);

    // 1. Movement Logic
    const dir = currentTargetRef.current.clone().sub(currentPosRef.current);
    const dist = dir.length();
    
    if (dist < 1.0) {
      pickNewTarget();
    } else {
      dir.normalize();
      let speed = stateRef.current === AgentState.INFECTED ? 0.7 : 2.0;
      if (quarantine && stateRef.current === AgentState.INFECTED) speed = 0;
      
      const step = dir.multiplyScalar(speed * delta * simulationSpeed);
      const nextPos = currentPosRef.current.clone().add(step);
      if (isBlockedByBuildings(nextPos, buildings, 0.5, buildingHash || undefined) || isBlockedByObstacles(nextPos, obstacles, 0.5)) {
        pickNewTarget();
      } else {
        currentPosRef.current.copy(nextPos);
        group.current.position.copy(currentPosRef.current);
      }
      group.current.lookAt(currentPosRef.current.clone().add(dir));
    }

    // 2. State Progression
    const hoursInState = simTime - stateStartTimeRef.current;
    if (stateRef.current === AgentState.INCUBATING && hoursInState >= CONSTANTS.HOURS_TO_INFECTED) {
      stateRef.current = AgentState.INFECTED;
      stateStartTimeRef.current = simTime;
    } else if (stateRef.current === AgentState.INFECTED && hoursInState >= (CONSTANTS.HOURS_TO_DEATH - CONSTANTS.HOURS_TO_INFECTED)) {
      stateRef.current = AgentState.DECEASED;
      stateStartTimeRef.current = simTime;
    }

    // 3. Infection Spread (Local Registry Lookup)
    if (stateRef.current === AgentState.HEALTHY && agentHash) {
      const neighbors = queryNearbyAgents(currentPosRef.current, agentHash);
      for (const other of neighbors) {
        if (other.id === stats.id) continue;
        if (other.state === AgentState.INFECTED || other.state === AgentState.INCUBATING) {
          if (currentPosRef.current.distanceToSquared(other.pos) < 4.0) {
            if (Math.random() < infectionRate * delta * simulationSpeed * 0.5) {
              stateRef.current = AgentState.INCUBATING;
              stateStartTimeRef.current = simTime;
              break;
            }
          }
        }
      }
    }

    // 4. Report back to Registry
    onUpdate(stats.id, stateRef.current, currentPosRef.current);
  });

  return (
    <group 
      ref={group} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      <Humanoid 
        color={stats.gender === 'Female' ? appearance.robe : (stateRef.current === AgentState.DECEASED ? '#111' : colors.body)} 
        headColor={appearance.skin}
        turbanColor={colors.turban}
        headscarfColor={appearance.scarf}
        robeAccentColor={appearance.accent}
        hairColor={appearance.hair}
        gender={stats.gender}
        scale={[stats.weight, stats.height, stats.weight] as [number, number, number]}
        robeHasTrim={stats.robeHasTrim}
        robeHemBand={stats.robeHemBand}
        robeSpread={stats.robeSpread}
        robeOverwrap={stats.robeOverwrap}
        hairStyle={stats.hairStyle}
        headwearStyle={stats.headwearStyle}
        sleeveCoverage={stats.sleeveCoverage}
        footwearStyle={stats.footwearStyle}
        footwearColor={stats.footwearColor}
        accessories={stats.accessories}
        enableArmSwing
        armSwingMode="both"
        isWalking={simulationSpeed > 0 && stateRef.current !== AgentState.DECEASED && (!quarantine || stateRef.current !== AgentState.INFECTED)}
        isDead={stateRef.current === AgentState.DECEASED}
        walkSpeed={10 * simulationSpeed}
      />

      {hovered && (
        <Html distanceFactor={15} position={[0, 2.5, 0]} center>
          <div className="bg-black/90 backdrop-blur-md p-4 rounded-xl border border-amber-600/40 text-amber-50 w-52 shadow-2xl pointer-events-none select-none">
            <h4 className="historical-font text-amber-400 border-b border-amber-900/50 pb-2 mb-2 uppercase text-xs tracking-wider font-bold">{stats.name}</h4>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-amber-500/60 font-bold">AGE</span><span>{stats.age} Years</span></div>
              <div className="flex justify-between"><span className="text-amber-500/60 font-bold">CLASS</span><span>{stats.socialClass}</span></div>
              <div className="flex justify-between"><span className="text-amber-500/60 font-bold">PROFESSION</span><span>{stats.profession}</span></div>
              <div className="flex justify-between">
                <span className="text-amber-500/60 font-bold">HEALTH</span>
                <span className={`font-bold ${
                  stateRef.current === AgentState.HEALTHY ? 'text-green-400' : 
                  stateRef.current === AgentState.DECEASED ? 'text-gray-500' : 'text-red-500'
                }`}>
                  {stateRef.current === AgentState.HEALTHY ? 'Sound' : 
                   stateRef.current === AgentState.DECEASED ? 'Fallen' : 
                   stateRef.current === AgentState.INFECTED ? 'Afflicted' : 'Unwell'}
                </span>
              </div>
              <div className="flex justify-between italic text-amber-100/40 mt-1">
                 <span>{stats.gender}</span>
                 <span>"{stats.mood}"</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});
