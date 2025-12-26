import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, AgentState, SimulationCounts, SimulationParams, BuildingMetadata, Obstacle, NPCStats, DistrictType, getDistrictType, PlayerActionEvent, NpcStateOverride } from '../types';
import { generateNPCStats } from '../utils/procedural';
import { NPC } from './NPC';
import { AgentSnapshot, SpatialHash, buildAgentHash } from '../utils/spatial';
import { TerrainHeightmap } from '../utils/terrain';

export interface MoraleStats {
  avgAwareness: number;  // 0-100 average plague awareness
  avgPanic: number;      // 0-100 average panic level
  agentCount: number;    // Number of living NPCs
}

interface AgentsProps {
  params: SimulationParams;
  simTime: number;
  onStatsUpdate: (stats: SimulationCounts) => void;
  onMoraleUpdate?: (morale: MoraleStats) => void;
  actionEvent?: PlayerActionEvent | null;
  rats: any[];
  buildings: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  obstacles?: Obstacle[];
  maxAgents?: number;
  agentHashRef?: React.MutableRefObject<SpatialHash<AgentSnapshot> | null>;
  impactMapRef?: React.MutableRefObject<Map<string, { time: number; intensity: number }>>;
  playerRef?: React.RefObject<THREE.Group>;
  onNpcSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  selectedNpcId?: string | null;
  district?: DistrictType;
  terrainSeed?: number;
  heightmap?: TerrainHeightmap | null;
  showDemographicsOverlay?: boolean;
  npcStateOverride?: NpcStateOverride | null;
}

export const Agents: React.FC<AgentsProps> = ({
  params,
  simTime,
  onStatsUpdate,
  onMoraleUpdate,
  actionEvent,
  buildings,
  buildingHash = null,
  obstacles = [],
  maxAgents = 30,
  agentHashRef: externalAgentHashRef,
  impactMapRef,
  playerRef,
  onNpcSelect,
  selectedNpcId = null,
  district,
  terrainSeed,
  heightmap,
  showDemographicsOverlay = false,
  npcStateOverride
}) => {
  const agentRegistry = useRef<Map<string, { state: AgentState, pos: THREE.Vector3, awareness: number, panic: number }>>(new Map());
  const localAgentHashRef = useRef<SpatialHash<AgentSnapshot> | null>(null);
  const statsTickRef = useRef(0);

  const npcPool = useMemo(() => {
    const districtType = district ?? getDistrictType(params.mapX, params.mapY);
    const sampleRing = (minR: number, maxR: number) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = minR + Math.random() * (maxR - minR);
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    };
    return Array.from({ length: maxAgents }).map((_, i) => {
      const stats = generateNPCStats(i * 1337, { districtType });
      const initialPos = sampleRing(10, 30);
      const initialTarget = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
      return { stats, initialPos, initialTarget };
    });
  }, [maxAgents, params.mapX, params.mapY]);

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
  const minVisible = params.timeOfDay >= 6 && params.timeOfDay <= 22 ? 8 : 4;
  const activeCount = Math.min(maxAgents, Math.max(minVisible, getActiveCount()));

  const handleUpdate = (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number) => {
    agentRegistry.current.set(id, { state, pos, awareness, panic });
  };

  useFrame(() => {
    const snapshots: AgentSnapshot[] = [];
    let healthy = 0, incubating = 0, infected = 0, deceased = 0;
    let totalAwareness = 0, totalPanic = 0, agentCount = 0;
    agentRegistry.current.forEach((agent, id) => {
      snapshots.push({
        id,
        state: agent.state,
        pos: agent.pos,
        awareness: agent.awareness,
        panic: agent.panic
      });
      if (agent.state === AgentState.HEALTHY) healthy++;
      else if (agent.state === AgentState.INCUBATING) incubating++;
      else if (agent.state === AgentState.INFECTED) infected++;
      else deceased++;

      // Aggregate morale data (excluding deceased)
      if (agent.state !== AgentState.DECEASED) {
        totalAwareness += agent.awareness;
        totalPanic += agent.panic;
        agentCount++;
      }
    });

    const builtHash = buildAgentHash(snapshots);
    localAgentHashRef.current = builtHash;
    if (externalAgentHashRef) {
      externalAgentHashRef.current = builtHash;
    }

    statsTickRef.current += 1;
    if (statsTickRef.current % 8 === 0) {
      onStatsUpdate({
        healthy,
        incubating,
        infected,
        deceased
      });

      // Report morale stats
      if (onMoraleUpdate && agentCount > 0) {
        onMoraleUpdate({
          avgAwareness: totalAwareness / agentCount,
          avgPanic: totalPanic / agentCount,
          agentCount
        });
      }
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
          obstacles={obstacles}
          agentHash={localAgentHashRef.current || undefined}
          impactMapRef={impactMapRef}
          playerRef={playerRef}
          timeOfDay={params.timeOfDay}
          initialState={i === 0 ? AgentState.INCUBATING : AgentState.HEALTHY}
          onSelect={onNpcSelect}
          isSelected={selectedNpcId === npc.stats.id}
          district={district ?? getDistrictType(params.mapX, params.mapY)}
          terrainSeed={terrainSeed}
          heightmap={heightmap}
          actionEvent={actionEvent}
          showDemographicsOverlay={showDemographicsOverlay}
          npcStateOverride={npcStateOverride}
        />
      ))}
    </group>
  );
};
