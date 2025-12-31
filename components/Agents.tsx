import React, { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS, AgentState, SimulationCounts, SimulationParams, BuildingMetadata, BuildingInfectionState, Obstacle, NPCStats, DistrictType, getDistrictType, PlayerActionEvent, NpcStateOverride, NPCRecord, PlayerStats } from '../types';
import { NPC } from './NPC';
import { AgentSnapshot, SpatialHash, buildAgentHash } from '../utils/spatial';
import { TerrainHeightmap } from '../utils/terrain';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { seededRandom } from '../utils/procedural';

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
  const hashDirtyRef = useRef(true);
  const statsDirtyRef = useRef(true);
  const forceTimerRef = useRef(0);
  const lastHashPosRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const HASH_MOVE_EPS_SQ = 0.01;
  const spawnFixRef = useRef<Set<string>>(new Set());
  const spawnTempsRef = useRef({
    base: new THREE.Vector3(),
    candidate: new THREE.Vector3()
  });

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

  // PERFORMANCE: Memoize handlers to prevent NPC re-renders from reference changes
  const handleUpdate = useCallback((id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, plagueMeta?: import('../types').NPCPlagueMeta) => {
    const prev = agentRegistry.current.get(id);
    agentRegistry.current.set(id, {
      state,
      pos,
      awareness,
      panic,
      plagueType: plagueMeta?.plagueType ?? prev?.plagueType
    });
    if (!prev || prev.state !== state || Math.abs(prev.awareness - awareness) > 0.1 || Math.abs(prev.panic - panic) > 0.1) {
      statsDirtyRef.current = true;
    }
    const lastPos = lastHashPosRef.current.get(id);
    if (!lastPos) {
      lastHashPosRef.current.set(id, { x: pos.x, y: pos.y, z: pos.z });
      hashDirtyRef.current = true;
    } else {
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      const dz = pos.z - lastPos.z;
      if (dx * dx + dy * dy + dz * dz > HASH_MOVE_EPS_SQ) {
        lastPos.x = pos.x;
        lastPos.y = pos.y;
        lastPos.z = pos.z;
        hashDirtyRef.current = true;
      }
    }
    if (onNpcUpdate) {
      const now = performance.now() * 0.001;
      const lastSync = lastSyncByIdRef.current.get(id) ?? 0;
      if (now - lastSync >= 0.2) {
        lastSyncByIdRef.current.set(id, now);
        onNpcUpdate(id, state, pos, awareness, panic, 'outdoor', plagueMeta);
      }
    }
  }, [onNpcUpdate]);

  // Wrapped handler for NPC-initiated encounters that sets global cooldown
  const handleNPCInitiatedEncounter = useCallback((npc: { stats: NPCStats; state: AgentState }) => {
    globalApproachCooldownRef.current = simTime + GLOBAL_APPROACH_COOLDOWN;
    onNPCInitiatedEncounter?.(npc);
  }, [simTime, onNPCInitiatedEncounter]);

  useFrame((_, delta) => {
    hashTimerRef.current += delta;
    forceTimerRef.current += delta;
    const shouldTick = hashTimerRef.current >= 0.2;
    if (!shouldTick) return;
    hashTimerRef.current = 0;

    const forceUpdate = forceTimerRef.current >= 1.0;
    const shouldRebuildHash = hashDirtyRef.current || !localAgentHashRef.current || forceUpdate;
    const shouldUpdateStats = statsDirtyRef.current || forceUpdate;
    if (!shouldRebuildHash && !shouldUpdateStats) return;

    let healthy = 0, incubating = 0, infected = 0, deceased = 0;
    let totalAwareness = 0, totalPanic = 0, agentCount = 0;

    if (shouldRebuildHash) {
      const snapshots: AgentSnapshot[] = [];
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
      hashDirtyRef.current = false;
    } else {
      agentRegistry.current.forEach((agent) => {
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
    }
    statsDirtyRef.current = false;
    if (forceUpdate) {
      forceTimerRef.current = 0;
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
        if (!spawnFixRef.current.has(record.id)) {
          spawnFixRef.current.add(record.id);
          const base = spawnTempsRef.current.base.set(
            record.lastOutdoorPos[0],
            record.lastOutdoorPos[1],
            record.lastOutdoorPos[2]
          );
          const blockedByObstacles = isBlockedByObstacles(base, obstacles, 0.6, obstacleHash ?? undefined);
          const blockedByBuildings = isBlockedByBuildings(base, buildings, 0.6, buildingHash ?? undefined);
          if (blockedByObstacles || blockedByBuildings) {
            const candidate = spawnTempsRef.current.candidate;
            const seedBase = record.scheduleSeed ?? 0;
            let seedOffset = 0;
            let found = false;
            for (let ring = 1; ring <= 4 && !found; ring += 1) {
              const radius = 1.5 * ring;
              const samples = 8 + ring * 2;
              for (let i = 0; i < samples; i += 1) {
                const jitter = (seededRandom(seedBase + seedOffset++) - 0.5) * 0.4;
                const angle = (i / samples) * Math.PI * 2 + jitter;
                candidate.set(
                  base.x + Math.cos(angle) * radius,
                  base.y,
                  base.z + Math.sin(angle) * radius
                );
                if (!isBlockedByObstacles(candidate, obstacles, 0.6, obstacleHash ?? undefined) &&
                    !isBlockedByBuildings(candidate, buildings, 0.6, buildingHash ?? undefined)) {
                  record.lastOutdoorPos[0] = candidate.x;
                  record.lastOutdoorPos[1] = candidate.y;
                  record.lastOutdoorPos[2] = candidate.z;
                  found = true;
                  break;
                }
              }
            }
          }
        }

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
            homeBuildingId={record.homeBuildingId}
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
