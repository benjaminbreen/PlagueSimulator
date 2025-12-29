import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, AgentState, SimulationCounts, SimulationParams, BuildingMetadata, BuildingInfectionState, Obstacle, NPCStats, DistrictType, getDistrictType, PlayerActionEvent, NpcStateOverride, NPCRecord, PlayerStats } from '../types';
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
  buildingInfection?: Record<string, BuildingInfectionState>;
  obstacles?: Obstacle[];
  obstacleHash?: SpatialHash<Obstacle> | null;
  maxAgents?: number;
  agentHashRef?: React.MutableRefObject<SpatialHash<AgentSnapshot> | null>;
  impactMapRef?: React.MutableRefObject<Map<string, { time: number; intensity: number }>>;
  playerRef?: React.RefObject<THREE.Group>;
  onNpcSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  onNpcUpdate?: (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, location: 'outdoor' | 'interior', plagueMeta?: import('../types').NPCPlagueMeta) => void;
  selectedNpcId?: string | null;
  district?: DistrictType;
  terrainSeed?: number;
  heightmap?: TerrainHeightmap | null;
  showDemographicsOverlay?: boolean;
  npcStateOverride?: NpcStateOverride | null;
  npcPool?: NPCRecord[];
  /** Player stats for NPC friendliness calculation */
  playerStats?: PlayerStats | null;
  /** Callback when a friendly NPC approaches and initiates an encounter */
  onNPCInitiatedEncounter?: (npc: { stats: NPCStats; state: AgentState }) => void;
}

export const Agents: React.FC<AgentsProps> = ({
  params,
  simTime,
  onStatsUpdate,
  onMoraleUpdate,
  actionEvent,
  buildings,
  buildingHash = null,
  buildingInfection,
  obstacles = [],
  obstacleHash = null,
  maxAgents = 30,
  agentHashRef: externalAgentHashRef,
  impactMapRef,
  playerRef,
  onNpcSelect,
  onNpcUpdate,
  selectedNpcId = null,
  district,
  terrainSeed,
  heightmap,
  showDemographicsOverlay = false,
  npcStateOverride,
  npcPool = [],
  playerStats,
  onNPCInitiatedEncounter
}) => {
  const agentRegistry = useRef<Map<string, { state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, plagueType?: import('../types').PlagueType }>>(new Map());
  const localAgentHashRef = useRef<SpatialHash<AgentSnapshot> | null>(null);
  const statsTickRef = useRef(0);
  const hashTimerRef = useRef(0);
  const lastSyncByIdRef = useRef<Map<string, number>>(new Map());

  // GLOBAL COOLDOWN: Prevent multiple NPCs from approaching player at once
  const globalApproachCooldownRef = useRef(0); // Sim time when any NPC can approach again
  const GLOBAL_APPROACH_COOLDOWN = 30; // 30 sim minutes between NPC-initiated encounters

  const pool = npcPool;

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
  const activeCount = Math.min(maxAgents || pool.length, Math.max(minVisible, getActiveCount(), 0));

  const handleUpdate = (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, plagueMeta?: import('../types').NPCPlagueMeta) => {
    const prev = agentRegistry.current.get(id);
    agentRegistry.current.set(id, {
      state,
      pos,
      awareness,
      panic,
      plagueType: plagueMeta?.plagueType ?? prev?.plagueType
    });
    if (onNpcUpdate) {
      const now = performance.now() * 0.001;
      const lastSync = lastSyncByIdRef.current.get(id) ?? 0;
      if (now - lastSync >= 0.2) {
        lastSyncByIdRef.current.set(id, now);
        onNpcUpdate(id, state, pos, awareness, panic, 'outdoor', plagueMeta);
      }
    }
  };

  // Wrapped handler for NPC-initiated encounters that sets global cooldown
  const handleNPCInitiatedEncounter = (npc: { stats: NPCStats; state: AgentState }) => {
    globalApproachCooldownRef.current = simTime + GLOBAL_APPROACH_COOLDOWN;
    onNPCInitiatedEncounter?.(npc);
  };

  useFrame((_, delta) => {
    hashTimerRef.current += delta;
    const shouldRebuildHash = hashTimerRef.current >= 0.2 || !localAgentHashRef.current;
    if (!shouldRebuildHash) return;
    hashTimerRef.current = 0;

    const snapshots: AgentSnapshot[] = [];
    let healthy = 0, incubating = 0, infected = 0, deceased = 0;
    let totalAwareness = 0, totalPanic = 0, agentCount = 0;
    agentRegistry.current.forEach((agent, id) => {
      snapshots.push({
        id,
        state: agent.state,
        pos: agent.pos,
        plagueType: agent.plagueType,
        awareness: agent.awareness,
        panic: agent.panic
      });
      if (agent.state === AgentState.HEALTHY) healthy++;
      else if (agent.state === AgentState.INCUBATING) incubating++;
      else if (agent.state === AgentState.INFECTED) infected++;
      else deceased++;

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
    if (statsTickRef.current % 2 === 0) {
      onStatsUpdate({
        healthy,
        incubating,
        infected,
        deceased
      });

      if (onMoraleUpdate && agentCount > 0) {
        onMoraleUpdate({
          avgAwareness: totalAwareness / agentCount,
          avgPanic: totalPanic / agentCount,
          agentCount
        });
      }
    }
  });

  const activeSlice = useMemo(() => pool.slice(0, activeCount), [pool, activeCount]);
  const positionTargetsRef = useRef(new Map<string, { pos: THREE.Vector3; target: THREE.Vector3 }>());

  return (
    <group>
      {activeSlice.map((record) => {
        let cached = positionTargetsRef.current.get(record.stats.id);
        if (!cached) {
          cached = {
            pos: new THREE.Vector3(record.lastOutdoorPos[0], record.lastOutdoorPos[1], record.lastOutdoorPos[2]),
            target: new THREE.Vector3(record.lastOutdoorPos[0] + 4, 0, record.lastOutdoorPos[2] + 4)
          };
          positionTargetsRef.current.set(record.stats.id, cached);
        } else {
          cached.pos.set(record.lastOutdoorPos[0], record.lastOutdoorPos[1], record.lastOutdoorPos[2]);
          cached.target.set(record.lastOutdoorPos[0] + 4, 0, record.lastOutdoorPos[2] + 4);
        }

        return (
          <NPC
            key={record.stats.id}
            stats={record.stats}
            position={cached.pos}
            target={cached.target}
            getSimTime={() => simTime}
            onUpdate={handleUpdate}
            infectionRate={params.infectionRate}
            quarantine={params.quarantine}
            simulationSpeed={params.simulationSpeed}
            buildings={buildings}
            buildingHash={buildingHash || undefined}
            buildingInfection={buildingInfection}
            obstacles={obstacles}
            obstacleHash={obstacleHash || undefined}
            agentHash={localAgentHashRef.current || undefined}
            impactMapRef={impactMapRef}
            playerRef={playerRef}
            timeOfDay={params.timeOfDay}
            initialState={record.state}
            plagueMeta={record.plagueMeta}
            onSelect={onNpcSelect}
            isSelected={selectedNpcId === record.stats.id}
            district={district ?? getDistrictType(params.mapX, params.mapY)}
            terrainSeed={terrainSeed}
            heightmap={heightmap}
            actionEvent={actionEvent}
            showDemographicsOverlay={showDemographicsOverlay}
            npcStateOverride={npcStateOverride}
            playerStats={playerStats}
            onNPCInitiatedEncounter={onNPCInitiatedEncounter ? handleNPCInitiatedEncounter : undefined}
            globalApproachCooldownRef={globalApproachCooldownRef}
          />
        );
      })}
    </group>
  );
};
