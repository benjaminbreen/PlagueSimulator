import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, AgentState, SimulationCounts, SimulationParams, BuildingMetadata } from '../types';
import { generateNPCStats } from '../utils/procedural';
import { NPC } from './NPC';
import { AgentSnapshot, SpatialHash, buildAgentHash } from '../utils/spatial';

interface AgentsProps {
  params: SimulationParams;
  simTime: number;
  onStatsUpdate: (stats: SimulationCounts) => void;
  rats: any[]; 
  buildings: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  maxAgents?: number;
}

export const Agents: React.FC<AgentsProps> = ({ params, simTime, onStatsUpdate, buildings, buildingHash = null, maxAgents = 30 }) => {
  const agentRegistry = useRef<Map<string, { state: AgentState, pos: THREE.Vector3 }>>(new Map());
  const agentHashRef = useRef<SpatialHash<AgentSnapshot> | null>(null);
  const statsTickRef = useRef(0);

  const npcPool = useMemo(() => {
    return Array.from({ length: maxAgents }).map((_, i) => {
      const stats = generateNPCStats(i * 1337);
      const angle = (i / CONSTANTS.AGENT_COUNT) * Math.PI * 2;
      const rad = 15 + Math.random() * 35;
      const initialPos = new THREE.Vector3(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      const initialTarget = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
      return { stats, initialPos, initialTarget };
    });
  }, [maxAgents]);

  const getActiveCount = () => {
    const time = params.timeOfDay;
    // Peak around 10am; minimal around 2am.
    if (time >= 0 && time < 4) return Math.max(0, Math.round((time / 4) * 4));
    if (time >= 4 && time < 7) return 4 + Math.round(((time - 4) / 3) * 8);
    if (time >= 7 && time < 10) return 12 + Math.round(((time - 7) / 3) * (maxAgents - 12));
    if (time >= 10 && time < 18) return maxAgents - Math.round(((time - 10) / 8) * 8);
    if (time >= 18 && time < 22) return 10 - Math.round(((time - 18) / 4) * 8);
    return 2;
  };
  const activeCount = Math.min(maxAgents, getActiveCount());

  const handleUpdate = (id: string, state: AgentState, pos: THREE.Vector3) => {
    agentRegistry.current.set(id, { state, pos });
  };

  useFrame(() => {
    const snapshots: AgentSnapshot[] = [];
    let healthy = 0, incubating = 0, infected = 0, deceased = 0;
    agentRegistry.current.forEach((agent, id) => {
      snapshots.push({ id, state: agent.state, pos: agent.pos });
      if (agent.state === AgentState.HEALTHY) healthy++;
      else if (agent.state === AgentState.INCUBATING) incubating++;
      else if (agent.state === AgentState.INFECTED) infected++;
      else deceased++;
    });

    agentHashRef.current = buildAgentHash(snapshots);

    statsTickRef.current += 1;
    if (statsTickRef.current % 8 === 0) {
      onStatsUpdate({
        healthy,
        incubating,
        infected,
        deceased
      });
    }
  });

  return (
    <group>
      {npcPool.slice(0, activeCount).map((npc, i) => (
        <NPC 
          key={npc.stats.id} 
          stats={npc.stats} 
          position={npc.initialPos} 
          target={npc.initialTarget} 
          getSimTime={() => simTime}
          onUpdate={handleUpdate}
          infectionRate={params.infectionRate}
          quarantine={params.quarantine}
          simulationSpeed={params.simulationSpeed}
          buildings={buildings}
          buildingHash={buildingHash || undefined}
          agentHash={agentHashRef.current || undefined}
          initialState={i === 0 ? AgentState.INCUBATING : AgentState.HEALTHY}
        />
      ))}
    </group>
  );
};
