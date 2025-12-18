import React, { useRef, useState, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { AgentState, NPCStats, SocialClass, CONSTANTS } from '../types';
import { Humanoid } from './Humanoid';

interface NPCProps {
  stats: NPCStats;
  initialState?: AgentState;
  position: THREE.Vector3;
  target: THREE.Vector3;
  onUpdate: (id: string, state: AgentState, pos: THREE.Vector3) => void;
  getSimTime: () => number;
  allAgentsRef: React.MutableRefObject<Map<string, { state: AgentState, pos: THREE.Vector3 }>>;
  infectionRate: number;
  quarantine: boolean;
  simulationSpeed: number;
}

export const NPC: React.FC<NPCProps> = memo(({ 
  stats, 
  initialState = AgentState.HEALTHY, 
  position, 
  target, 
  onUpdate, 
  getSimTime,
  allAgentsRef,
  infectionRate,
  quarantine,
  simulationSpeed
}) => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const stateRef = useRef<AgentState>(initialState);
  const stateStartTimeRef = useRef(getSimTime());
  const currentPosRef = useRef(position.clone());
  const currentTargetRef = useRef(target.clone());

  const colors = useMemo(() => {
    switch (stats.socialClass) {
      case SocialClass.PEASANT: return { body: '#4e342e', head: '#efebe9', turban: '#d2b48c' };
      case SocialClass.MERCHANT: return { body: '#bf360c', head: '#fff3e0', turban: '#ffffff' };
      case SocialClass.CLERGY: return { body: '#1b5e20', head: '#e8f5e9', turban: '#000000' };
      case SocialClass.NOBILITY: return { body: '#4a148c', head: '#f3e5f5', turban: '#ffd700' };
      default: return { body: '#4e342e', head: '#efebe9', turban: '#d2b48c' };
    }
  }, [stats.socialClass]);

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
      
      currentPosRef.current.add(dir.multiplyScalar(speed * delta * simulationSpeed));
      group.current.position.copy(currentPosRef.current);
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
    if (stateRef.current === AgentState.HEALTHY) {
      allAgentsRef.current.forEach((other, otherId) => {
        if (otherId === stats.id) return;
        if (other.state === AgentState.INFECTED || other.state === AgentState.INCUBATING) {
          if (currentPosRef.current.distanceToSquared(other.pos) < 4.0) {
            if (Math.random() < infectionRate * delta * simulationSpeed * 0.5) {
              stateRef.current = AgentState.INCUBATING;
              stateStartTimeRef.current = simTime;
            }
          }
        }
      });
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
        color={stateRef.current === AgentState.DECEASED ? '#111' : colors.body} 
        headColor={colors.head}
        turbanColor={colors.turban}
        scale={[stats.weight, stats.height, stats.weight] as [number, number, number]}
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
