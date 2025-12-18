import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, AgentState, SimulationCounts, SimulationParams } from '../types';
import { generateNPCStats } from '../utils/procedural';
import { NPC } from './NPC';

interface AgentsProps {
  params: SimulationParams;
  simTime: number;
  onStatsUpdate: (stats: SimulationCounts) => void;
  rats: any[]; 
}

export const Agents: React.FC<AgentsProps> = ({ params, simTime, onStatsUpdate }) => {
  const agentRegistry = useRef<Map<string, { state: AgentState, pos: THREE.Vector3 }>>(new Map());

  const npcPool = useMemo(() => {
    return Array.from({ length: CONSTANTS.AGENT_COUNT }).map((_, i) => {
      const stats = generateNPCStats(i * 1337);
      const angle = (i / CONSTANTS.AGENT_COUNT) * Math.PI * 2;
      const rad = 15 + Math.random() * 35;
      const initialPos = new THREE.Vector3(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      const initialTarget = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
      return { stats, initialPos, initialTarget };
    });
  }, []);

  const handleUpdate = (id: string, state: AgentState, pos: THREE.Vector3) => {
    agentRegistry.current.set(id, { state, pos });
  };

  useFrame(() => {
    let healthy = 0, incubating = 0, infected = 0, deceased = 0;
    agentRegistry.current.forEach(agent => {
      if (agent.state === AgentState.HEALTHY) healthy++;
      else if (agent.state === AgentState.INCUBATING) incubating++;
      else if (agent.state === AgentState.INFECTED) infected++;
      else deceased++;
    });

    onStatsUpdate({
      healthy,
      incubating,
      infected,
      deceased
    });
  });

  return (
    <group>
      {npcPool.map((npc, i) => (
        <NPC 
          key={npc.stats.id} 
          stats={npc.stats} 
          position={npc.initialPos} 
          target={npc.initialTarget} 
          getSimTime={() => simTime}
          onUpdate={handleUpdate}
          allAgentsRef={agentRegistry}
          infectionRate={params.infectionRate}
          quarantine={params.quarantine}
          simulationSpeed={params.simulationSpeed}
          initialState={i === 0 ? AgentState.INCUBATING : AgentState.HEALTHY}
        />
      ))}
    </group>
  );
};
