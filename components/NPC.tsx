import React, { useRef, useState, useMemo, memo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { AgentState, NPCStats, SocialClass, CONSTANTS, BuildingMetadata, BuildingType, DistrictType, Obstacle, PANIC_SUSCEPTIBILITY, PlayerActionEvent, NpcStateOverride, NPCPlagueMeta, PlagueType } from '../types';
import { Humanoid } from './Humanoid';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from '../utils/spatial';
import { seededRandom } from '../utils/procedural';
import { sampleTerrainHeight, TerrainHeightmap } from '../utils/terrain';
import { createNpcPlagueMeta } from '../utils/npcHealth';

const hashStringToSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
};

// Helper function to calculate door position from building metadata
const getDoorPosition = (building: BuildingMetadata): THREE.Vector3 => {
  const half = (CONSTANTS.BUILDING_SIZE * (building.sizeScale ?? 1)) / 2;
  const [x, y, z] = building.position;

  switch (building.doorSide) {
    case 0: return new THREE.Vector3(x, y, z + half + 0.5);  // North (+ a bit outside)
    case 1: return new THREE.Vector3(x, y, z - half - 0.5);  // South
    case 2: return new THREE.Vector3(x + half + 0.5, y, z);  // East
    case 3: return new THREE.Vector3(x - half - 0.5, y, z);  // West
    default: return new THREE.Vector3(x, y, z + half + 0.5);
  }
};

// Helper function to find nearest building to a position
const findNearestBuilding = (
  pos: THREE.Vector3,
  buildings: BuildingMetadata[],
  maxDist = 15
): BuildingMetadata | null => {
  let nearest = null;
  let minDist = maxDist;

  for (const building of buildings) {
    const doorPos = getDoorPosition(building);
    const dist = pos.distanceTo(doorPos);
    if (dist < minDist) {
      minDist = dist;
      nearest = building;
    }
  }

  return nearest;
};

// Localized miasma effect around corpses
const CorpseMiasma: React.FC = memo(() => {
  const groupRef = useRef<THREE.Group>(null);
  const particleCount = 6;

  // Pre-generate particle positions and phases
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      angle: (i / particleCount) * Math.PI * 2,
      radius: 0.8 + Math.random() * 0.4,
      height: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.3,
      scale: 0.4 + Math.random() * 0.3
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Animate each particle child
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;

      // Circular drift with vertical bobbing
      const angle = p.angle + t * p.speed;
      child.position.x = Math.cos(angle) * p.radius;
      child.position.z = Math.sin(angle) * p.radius;
      child.position.y = p.height + Math.sin(t * 1.5 + p.phase) * 0.2;

      // Pulse scale
      const scale = p.scale * (0.8 + Math.sin(t * 2 + p.phase) * 0.2);
      child.scale.setScalar(scale);
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0.5]}>
      {particles.map((p, i) => (
        <mesh key={i} position={[0, p.height, 0]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial
            color="#4a5a3a"
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Central darker core */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshBasicMaterial
          color="#2a3a2a"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

// NPC approach behavior for friendly NPCs
interface NPCApproachState {
  isApproaching: boolean;
  approachCooldown: number; // Timestamp when cooldown expires
}

interface NPCProps {
  stats: NPCStats;
  initialState?: AgentState;
  plagueMeta?: NPCPlagueMeta;
  position: THREE.Vector3;
  target: THREE.Vector3;
  onUpdate: (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, plagueMeta?: NPCPlagueMeta) => void;
  getSimTime: () => number;
  infectionRate: number;
  quarantine: boolean;
  simulationSpeed: number;
  buildings: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  agentHash?: SpatialHash<AgentSnapshot> | null;
  obstacles?: Obstacle[];
  obstacleHash?: SpatialHash<Obstacle> | null;
  impactMapRef?: React.MutableRefObject<Map<string, { time: number; intensity: number }>>;
  playerRef?: React.RefObject<THREE.Group>;
  playerStats?: { disposition?: number; charisma?: number; religion?: string; ethnicity?: string; socialClass?: string } | null;
  timeOfDay: number;
  onSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  onNPCInitiatedEncounter?: (npc: { stats: NPCStats; state: AgentState }) => void;
  isSelected?: boolean;
  district?: DistrictType;
  terrainSeed?: number;
  heightmap?: TerrainHeightmap | null;
  actionEvent?: PlayerActionEvent | null;
  showDemographicsOverlay?: boolean;
  npcStateOverride?: NpcStateOverride | null;
  /** Global cooldown ref shared across all NPCs to prevent approach spam */
  globalApproachCooldownRef?: React.MutableRefObject<number>;
}

export const NPC: React.FC<NPCProps> = memo(({
  stats,
  initialState = AgentState.HEALTHY,
  plagueMeta,
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
  obstacles = [],
  obstacleHash = null,
  impactMapRef,
  playerRef,
  playerStats = null,
  timeOfDay,
  onSelect,
  onNPCInitiatedEncounter,
  isSelected = false,
  district,
  terrainSeed,
  heightmap,
  actionEvent,
  showDemographicsOverlay = false,
  npcStateOverride,
  globalApproachCooldownRef
}) => {
  const ENABLE_SIMPLE_LOD = true;
  const SIMPLE_LOD_DISTANCE = 45;
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [displayState, setDisplayState] = useState<AgentState>(initialState);
  const lastStateRef = useRef<AgentState>(initialState);
  const { camera } = useThree();

  const stateRef = useRef<AgentState>(initialState);
  const stateStartTimeRef = useRef(getSimTime());
  const plagueTypeRef = useRef<PlagueType>(plagueMeta?.plagueType ?? PlagueType.NONE);
  const exposureTimeRef = useRef<number | null>(plagueMeta?.exposureTime ?? null);
  const incubationHoursRef = useRef<number | null>(plagueMeta?.incubationHours ?? null);
  const deathHoursRef = useRef<number | null>(plagueMeta?.deathHours ?? null);
  const onsetTimeRef = useRef<number | null>(plagueMeta?.onsetTime ?? null);
  const currentPosRef = useRef(position.clone());
  const currentTargetRef = useRef(target.clone());
  const retargetTimerRef = useRef(0);
  const nextRetargetRef = useRef(3 + Math.random() * 5);
  const impactStartRef = useRef(0);
  const impactIntensityRef = useRef(0);
  const impactPulseRef = useRef(0);
  const lastSentPlagueMetaRef = useRef<string>('');

  useEffect(() => {
    if (!plagueMeta) return;
    plagueTypeRef.current = plagueMeta.plagueType;
    exposureTimeRef.current = plagueMeta.exposureTime;
    incubationHoursRef.current = plagueMeta.incubationHours;
    deathHoursRef.current = plagueMeta.deathHours;
    onsetTimeRef.current = plagueMeta.onsetTime;
  }, [plagueMeta?.plagueType, plagueMeta?.exposureTime, plagueMeta?.incubationHours, plagueMeta?.deathHours, plagueMeta?.onsetTime]);
  const playerImpactCooldownRef = useRef(0);
  const impactGroupRef = useRef<THREE.Group>(null);
  const statusMarkerRef = useRef<THREE.Mesh>(null);
  const statusMarkerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const propGroupRef = useRef<THREE.Group>(null);
  const idSeed = useMemo(() => hashStringToSeed(stats.id), [stats.id]);
  const propPhase = useMemo(() => seededRandom(idSeed + 77) * Math.PI * 2, [idSeed]);
  const impactStemMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactDotMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactExclaimRef = useRef<THREE.Group>(null);
  const impactExclaimMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const [moodOverride, setMoodOverride] = useState<string | null>(null);
  const moodExpireRef = useRef(0);

  // PERFORMANCE: Throttle spatial queries - cache neighbors and update every 3 frames
  const cachedNeighborsRef = useRef<AgentSnapshot[]>([]);
  const spatialQueryFrameCountRef = useRef(0);

  // PERFORMANCE: Distance LOD - calculate distance from camera for detail level
  const distanceFromCameraRef = useRef(0);

  // PERFORMANCE: Throttle infection checks to once per second instead of every frame
  const infectionCheckTimerRef = useRef(0);

  // MORALE SYSTEM: Track awareness and panic levels
  const awarenessRef = useRef(stats.awarenessLevel);
  const panicRef = useRef(stats.panicLevel);
  const rumorCheckTimerRef = useRef(0);
  const lastWitnessedDeathIdRef = useRef<string | null>(null);

  // PLAYER ACTION RESPONSE: Track last processed action
  const lastActionTimestampRef = useRef(0);

  // NPC APPROACH SYSTEM: Track when friendly NPCs approach the player
  const isApproachingPlayerRef = useRef(false);
  const approachCooldownRef = useRef(0); // Sim time when NPC can approach again
  const lastApproachCheckRef = useRef(0); // Throttle approach checks
  const approachCheckCountRef = useRef(0); // Counter for seeded random variation

  const movementTempsRef = useRef({
    dir: new THREE.Vector3(),
    step: new THREE.Vector3(),
    nextPos: new THREE.Vector3(),
    repel: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    rotatedDir: new THREE.Vector3(),
    tryPos: new THREE.Vector3(),
    lookAtTarget: new THREE.Vector3(),
    playerOffset: new THREE.Vector3(),
    playerNormal: new THREE.Vector3(),
    playerPush: new THREE.Vector3(),
    playerTargetPush: new THREE.Vector3()
  });
  const avoidanceRotations = useMemo(
    () => ([
      { cos: Math.cos(Math.PI / 2), sin: Math.sin(Math.PI / 2) },       // 90° left
      { cos: Math.cos(-Math.PI / 2), sin: Math.sin(-Math.PI / 2) },     // 90° right
      { cos: Math.cos(Math.PI / 3), sin: Math.sin(Math.PI / 3) },       // 60° left
      { cos: Math.cos(-Math.PI / 3), sin: Math.sin(-Math.PI / 3) },     // 60° right
      { cos: Math.cos(2 * Math.PI / 3), sin: Math.sin(2 * Math.PI / 3) },   // 120° left
      { cos: Math.cos(-2 * Math.PI / 3), sin: Math.sin(-2 * Math.PI / 3) }  // 120° right
    ]),
    []
  );

  // PERFORMANCE: Cache speed modifiers (only recalculate when hour or state changes)
  const cachedSpeedRef = useRef(2.0);
  const lastSpeedUpdateHourRef = useRef(-1);
  const lastSpeedUpdateStateRef = useRef<AgentState>(initialState);

  // PERFORMANCE: Simplify far-away NPC steering without throttling visible movement
  const FAR_SIMPLIFY_DISTANCE = 45;

  // BUILDING ENTRY/EXIT: Track when NPCs go inside buildings
  const activityStateRef = useRef<'WANDERING' | 'INSIDE_BUILDING'>('WANDERING');
  const targetBuildingRef = useRef<string | null>(null);
  const insideBuildingIdRef = useRef<string | null>(null);
  const buildingExitTimeRef = useRef(0);

  // STUCK DETECTION: Jiggle counter to detect NPCs vibrating against walls
  const lastPositionRef = useRef(position.clone());
  const stuckFramesRef = useRef(0);
  const STUCK_THRESHOLD = 90; // ~1.5 seconds at 60fps

  const colors = useMemo(() => {
    switch (stats.socialClass) {
      case SocialClass.PEASANT: return { body: '#6b5a45', head: '#e2c6a2' };
      case SocialClass.MERCHANT: return { body: '#7b5a4a', head: '#e6c9a6' };
      case SocialClass.CLERGY: return { body: '#4a4f59', head: '#d9c4a0' };
      case SocialClass.NOBILITY: return { body: '#6a5b4a', head: '#e6c9a6' };
      default: return { body: '#6b5a45', head: '#e2c6a2' };
    }
  }, [stats.socialClass]);

  // GRAPHICS: 1 in 2 NPCs carry a torch at night
  const carriesTorch = useMemo(() => {
    // Use stats.id to seed the random so it's consistent per NPC
    const idHash = stats.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (idHash % 2) === 0; // 50% chance (1 in 2)
  }, [stats.headwearStyle, stats.id]);

  const appearance = useMemo(() => {
    const seed = idSeed;
    const tone = seededRandom(seed + 11);
    // Levantine/Mediterranean skin tones - olive to light brown (hue 24-34, sat 25-42%, light 48-66%)
    const skin = `hsl(${24 + Math.round(tone * 10)}, ${25 + Math.round(tone * 17)}%, ${48 + Math.round(tone * 18)}%)`;
    // Use stats.hairColor (includes age-based graying) or fallback to generated
    const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626', '#3a2c22'];
    const hair = stats.hairColor ?? hairPalette[Math.floor(seededRandom(seed + 17) * hairPalette.length)];
    const scarfPalette = ['#d6c2a4', '#c7b08c', '#c2a878', '#bfa57e', '#e1d3b3'];
    const scarf = scarfPalette[Math.floor(seededRandom(seed + 29) * scarfPalette.length)];
    const robePalette = ['#6f6a3f', '#7b5a4a', '#6b5a45', '#5c4b3a', '#4a4f59', '#8b5a4a', '#5a6e7a'];
    const accentPalette = ['#e1d3b3', '#d9c9a8', '#cbb58c', '#bfa57e', '#d6c8a8'];
    let robe = stats.robeBaseColor ?? robePalette[Math.floor(seededRandom(seed + 41) * robePalette.length)];
    let accent = stats.robeAccentColor ?? accentPalette[Math.floor(seededRandom(seed + 43) * accentPalette.length)];
    const headwearPalette = ['#8b2e2e', '#1f1f1f', '#cbb48a', '#7b5a4a', '#3f5d7a', '#e8dfcf'];
    const headwearIndex = Math.floor(seededRandom(seed + 55) * headwearPalette.length);
    let headwear = stats.headwearColor ?? (stats.headwearStyle === 'straw'
      ? '#cbb48a'
      : stats.headwearStyle === 'fez'
        ? (seededRandom(seed + 57) > 0.5 ? '#8b2e2e' : '#cbb48a')
        : headwearPalette[headwearIndex]);
    const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(stats.profession);
    const isSoldier = /Guard|Soldier|Mamluk/i.test(stats.profession);
    const isOfficer = /Officer/i.test(stats.profession);
    if (isReligiousLeader) {
      robe = stats.robeBaseColor ?? '#2f2b26';
      accent = stats.robeAccentColor ?? '#c8b892';
      headwear = stats.headwearColor ?? '#e8dfcf';
    } else if (isSoldier) {
      robe = stats.robeBaseColor ?? (isOfficer ? '#3b2f2b' : '#2f3438');
      accent = stats.robeAccentColor ?? (isOfficer ? '#b59b6a' : '#8b5e3c');
      headwear = stats.headwearColor ?? (isOfficer ? '#8b2e2e' : '#3a3a3a');
    }
    return { skin, scarf, robe, accent, hair, headwear };
  }, [stats.headwearStyle, stats.id, stats.profession, stats.robeBaseColor, stats.robeAccentColor, stats.headwearColor, stats.hairColor, idSeed]);
  const moodDisplay = moodOverride ?? stats.mood;
  const lastOverrideNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!npcStateOverride || (npcStateOverride.id !== stats.id && npcStateOverride.id !== '*')) return;
    if (lastOverrideNonceRef.current === npcStateOverride.nonce) return;
    lastOverrideNonceRef.current = npcStateOverride.nonce;
    stateRef.current = npcStateOverride.state;
    stateStartTimeRef.current = getSimTime();
    if (npcStateOverride.state === AgentState.INCUBATING) {
      const meta = createNpcPlagueMeta(idSeed + Math.floor(getSimTime() * 10), getSimTime());
      plagueTypeRef.current = meta.plagueType;
      exposureTimeRef.current = meta.exposureTime;
      incubationHoursRef.current = meta.incubationHours;
      deathHoursRef.current = meta.deathHours;
      onsetTimeRef.current = meta.onsetTime;
    } else if (npcStateOverride.state === AgentState.HEALTHY) {
      plagueTypeRef.current = PlagueType.NONE;
      exposureTimeRef.current = null;
      incubationHoursRef.current = null;
      deathHoursRef.current = null;
      onsetTimeRef.current = null;
    } else if (npcStateOverride.state === AgentState.INFECTED && plagueTypeRef.current === PlagueType.NONE) {
      const meta = createNpcPlagueMeta(idSeed + Math.floor(getSimTime() * 10), getSimTime());
      plagueTypeRef.current = meta.plagueType;
      exposureTimeRef.current = meta.exposureTime;
      incubationHoursRef.current = meta.incubationHours;
      deathHoursRef.current = meta.deathHours;
      onsetTimeRef.current = getSimTime();
    }
  }, [npcStateOverride, stats.id, getSimTime]);
  const getReligionColor = (value: string) => {
    switch (value) {
      case 'Sunni Islam': return 'text-amber-200';
      case 'Shia Islam': return 'text-amber-300';
      case 'Eastern Orthodox': return 'text-sky-200';
      case 'Armenian Apostolic': return 'text-rose-200';
      case 'Syriac Orthodox': return 'text-cyan-200';
      case 'Jewish': return 'text-emerald-200';
      case 'Druze': return 'text-violet-200';
      default: return 'text-amber-100';
    }
  };

  const getEthnicityColor = (value: string) => {
    switch (value) {
      case 'Arab': return 'text-amber-100';
      case 'Aramaean/Syriac': return 'text-cyan-200';
      case 'Kurdish': return 'text-lime-200';
      case 'Turkic': return 'text-sky-200';
      case 'Circassian': return 'text-indigo-200';
      case 'Armenian': return 'text-rose-200';
      case 'Greek/Rum': return 'text-blue-200';
      case 'Persian': return 'text-purple-200';
      default: return 'text-amber-100';
    }
  };

  const pickNewTarget = (avoidDirection?: THREE.Vector3, isStuck = false) => {
    const range = CONSTANTS.MARKET_SIZE - 12;

    // STUCK BEHAVIOR: Target nearest building door to escape
    if (isStuck) {
      const nearestBuilding = findNearestBuilding(currentPosRef.current, buildings);
      if (nearestBuilding) {
        const doorPos = getDoorPosition(nearestBuilding);
        currentTargetRef.current.copy(doorPos);
        targetBuildingRef.current = nearestBuilding.id;
        return;
      }
    }

    // MORALE: High-panic NPCs flee from infected/deceased and seek shelter
    if (panicRef.current > 50 && agentHash) {
      const threats = queryNearbyAgents(currentPosRef.current, agentHash)
        .filter(a => a.id !== stats.id && (a.state === AgentState.INFECTED || a.state === AgentState.DECEASED));

      if (threats.length > 0) {
        // Calculate escape direction (opposite of threat centroid)
        const threatCenter = new THREE.Vector3();
        threats.forEach(t => threatCenter.add(t.pos));
        threatCenter.divideScalar(threats.length);

        const escapeDir = currentPosRef.current.clone().sub(threatCenter).normalize();
        const escapeDistance = 15 + Math.random() * 10;

        currentTargetRef.current.set(
          currentPosRef.current.x + escapeDir.x * escapeDistance,
          0,
          currentPosRef.current.z + escapeDir.z * escapeDistance
        );
        targetBuildingRef.current = null;
        return;
      }

      // High panic NPCs more likely to seek shelter (40% vs 20%)
      if (Math.random() < 0.4) {
        const nearestBuilding = findNearestBuilding(currentPosRef.current, buildings, 25);
        if (nearestBuilding) {
          const doorPos = getDoorPosition(nearestBuilding);
          currentTargetRef.current.copy(doorPos);
          targetBuildingRef.current = nearestBuilding.id;
          return;
        }
      }
    }

    // SICKNESS: Incubating/infected NPCs are more likely to seek shelter
    if ((stateRef.current === AgentState.INCUBATING || stateRef.current === AgentState.INFECTED) && Math.random() < 0.45) {
      const nearestBuilding = findNearestBuilding(currentPosRef.current, buildings, 28);
      if (nearestBuilding) {
        const doorPos = getDoorPosition(nearestBuilding);
        currentTargetRef.current.copy(doorPos);
        targetBuildingRef.current = nearestBuilding.id;
        return;
      }
    }

    // OCCASIONAL BUILDING VISITS: 20% chance to target a building door
    if (Math.random() < 0.2) {
      const eligibleBuildings = buildings.filter(b => {
        // Clergy prefer religious buildings
        if (stats.socialClass === SocialClass.CLERGY && b.type === BuildingType.RELIGIOUS) return true;
        // Merchants prefer commercial
        if (stats.socialClass === SocialClass.MERCHANT && b.type === BuildingType.COMMERCIAL) return true;
        // Everyone can enter residential
        if (b.type === BuildingType.RESIDENTIAL) return true;
        return false;
      });

      if (eligibleBuildings.length > 0) {
        const randomBuilding = eligibleBuildings[Math.floor(Math.random() * eligibleBuildings.length)];
        const doorPos = getDoorPosition(randomBuilding);
        currentTargetRef.current.copy(doorPos);
        targetBuildingRef.current = randomBuilding.id;
        return;
      }
    }

    // UNSTUCK WITH DIRECTIONAL BIAS: Move away from the obstacle
    if (avoidDirection) {
      const avoidAngle = Math.atan2(avoidDirection.z, avoidDirection.x);
      const escapeAngle = avoidAngle + Math.PI + (Math.random() - 0.5) * Math.PI / 2; // 180° ± 45°
      const distance = range * (0.5 + Math.random() * 0.5); // 50-100% of range

      currentTargetRef.current.set(
        currentPosRef.current.x + Math.cos(escapeAngle) * distance,
        0,
        currentPosRef.current.z + Math.sin(escapeAngle) * distance
      );
      targetBuildingRef.current = null;
      return;
    }

    // NORMAL RANDOM TARGETING
    currentTargetRef.current.set(
      (Math.random() - 0.5) * 2 * range,
      0,
      (Math.random() - 0.5) * 2 * range
    );
    targetBuildingRef.current = null;
  };

  const getHealthRingColor = (state: AgentState) => {
    switch (state) {
      case AgentState.HEALTHY: return '#22c55e';
      case AgentState.INCUBATING: return '#fbbf24';
      case AgentState.INFECTED: return '#f97316';
      case AgentState.DECEASED: return '#6b7280';
      default: return '#22c55e';
    }
  };

  useFrame((_, delta) => {
    if (!group.current || stateRef.current === AgentState.DECEASED) return;

    const simTime = getSimTime();
    // Freeze movement and logic if simulation is paused
    if (simulationSpeed <= 0) return;
    const baseDelta = Math.min(delta, 0.1);
    const simDelta = baseDelta * simulationSpeed;

    // BUILDING ENTRY/EXIT: Handle NPCs inside buildings
    if (activityStateRef.current === 'INSIDE_BUILDING') {
      // NPC is inside a building - don't render or run movement AI
      if (group.current) {
        group.current.visible = false;
      }

      // Check if it's time to exit
      if (simTime >= buildingExitTimeRef.current) {
        const building = buildings.find(b => b.id === insideBuildingIdRef.current);
        if (building) {
          const doorPos = getDoorPosition(building);

          // EXIT SPAWN VALIDATION: Try multiple positions to avoid spawning inside obstacles
          let exitPos: THREE.Vector3 | null = null;
          let attempts = 0;
          const MAX_ATTEMPTS = 8;

          while (!exitPos && attempts < MAX_ATTEMPTS) {
            const testPos = doorPos.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                0,
                (Math.random() - 0.5) * 3
              ).normalize().multiplyScalar(1.5 + Math.random() * 1.0)
            );

            // Validate: not inside building, not blocked by obstacles
            if (!isBlockedByBuildings(testPos, buildings, 0.5, buildingHash || undefined) &&
                !isBlockedByObstacles(testPos, obstacles, 0.5, obstacleHash || undefined)) {
              exitPos = testPos;
            }
            attempts++;
          }

          // Use validated position, or fallback to door position if all attempts failed
          currentPosRef.current.copy(exitPos || doorPos);
          if (group.current) {
            group.current.position.copy(currentPosRef.current);
            group.current.visible = true;
          }
        }

        // Reset to wandering state
        activityStateRef.current = 'WANDERING';
        insideBuildingIdRef.current = null;
        targetBuildingRef.current = null;
        pickNewTarget(); // Pick new destination after exiting
        retargetTimerRef.current = 0;
        nextRetargetRef.current = 3 + Math.random() * 5;
      }

      return; // Skip all other logic while inside
    }

    // Ensure NPC is visible when wandering
    if (group.current && !group.current.visible) {
      group.current.visible = true;
    }

    // PERFORMANCE: Calculate distance from camera for visual LOD (used by Humanoid component)
    distanceFromCameraRef.current = currentPosRef.current.distanceTo(camera.position);
    const isFar = distanceFromCameraRef.current > FAR_SIMPLIFY_DISTANCE;

    const temps = movementTempsRef.current;

    // 1. Movement Logic
    retargetTimerRef.current += delta;
    const dir = temps.dir.copy(currentTargetRef.current).sub(currentPosRef.current);
    const dist = dir.length();
    
    if (dist < 1.0 || retargetTimerRef.current > nextRetargetRef.current) {
      pickNewTarget();
      retargetTimerRef.current = 0;
      nextRetargetRef.current = 3 + Math.random() * 5;
    } else {
      dir.normalize();
      if (agentHash && !isFar) {
        // PERFORMANCE: Only query spatial hash every 3 frames (3x reduction in queries)
        spatialQueryFrameCountRef.current++;
        if (spatialQueryFrameCountRef.current >= 3) {
          cachedNeighborsRef.current = queryNearbyAgents(currentPosRef.current, agentHash);
          spatialQueryFrameCountRef.current = 0;
        }

        // Use cached neighbors for steering calculation
        const repel = temps.repel.set(0, 0, 0);
        for (const other of cachedNeighborsRef.current) {
          if (other.id === stats.id) continue;
          const offset = temps.offset.copy(currentPosRef.current).sub(other.pos);
          const d2 = offset.lengthSq();
          if (d2 > 0.0001 && d2 < 4.0) {
            offset.normalize();
            repel.addScaledVector(offset, 0.35 / d2);
          }
        }
        if (repel.lengthSq() > 0.0001) {
          dir.add(repel).normalize();
        }
      }
        // PERFORMANCE: Cache speed calculation - only recalculate when hour or state changes
        const currentHour = Math.floor(simTime % 24);
        const stateChanged = stateRef.current !== lastSpeedUpdateStateRef.current;
        if (currentHour !== lastSpeedUpdateHourRef.current || stateChanged) {
          const time = simTime % 24;
          const nightSlow = time < 6 || time > 20 ? 0.8 : 1.0;
          const baseSpeed = stateRef.current === AgentState.INFECTED ? 0.7 : 2.0;
          cachedSpeedRef.current = baseSpeed * nightSlow;
          lastSpeedUpdateHourRef.current = currentHour;
          lastSpeedUpdateStateRef.current = stateRef.current;
        }
        let speed = cachedSpeedRef.current;
        if (quarantine && stateRef.current === AgentState.INFECTED) speed = 0;

        // MORALE: Panicked NPCs move faster (fleeing behavior)
        if (panicRef.current > 70) {
          speed *= 1.35;
        } else if (panicRef.current > 40) {
          speed *= 1.15;
        }

        // PLAGUE BEHAVIOR: Infected NPCs stumble and move erratically
        if (stateRef.current === AgentState.INFECTED) {
          // Random stumbling - occasionally veer off course
          if (Math.random() < 0.08) { // 8% chance per frame to stumble
            const stumbleAngle = (Math.random() - 0.5) * Math.PI * 0.5; // Up to 45 degrees either way
            const cos = Math.cos(stumbleAngle);
            const sin = Math.sin(stumbleAngle);
            const newX = dir.x * cos - dir.z * sin;
            const newZ = dir.x * sin + dir.z * cos;
            dir.set(newX, 0, newZ).normalize();
          }
          // Occasional pause (staggering)
          if (Math.random() < 0.03) {
            speed *= 0.1; // Nearly stop briefly
          }
        } else if (stateRef.current === AgentState.INCUBATING) {
          // Incubating NPCs occasionally slow down (feeling unwell)
          if (Math.random() < 0.02) {
            speed *= 0.5;
          }
        }

        const step = temps.step.copy(dir).multiplyScalar(speed * simDelta);
        const nextPos = temps.nextPos.copy(currentPosRef.current).add(step);

        // PERFORMANCE & BEHAVIOR: Multi-angle obstacle avoidance (6 directions instead of 2)
        if (isBlockedByBuildings(nextPos, buildings, 0.5, buildingHash || undefined) || isBlockedByObstacles(nextPos, obstacles, 0.5, obstacleHash || undefined)) {
          let foundPath = false;
          if (!isFar) {
            for (const rot of avoidanceRotations) {
              // Rotate direction vector by angle
              const rotatedDir = temps.rotatedDir.set(
                dir.x * rot.cos - dir.z * rot.sin,
                0,
                dir.x * rot.sin + dir.z * rot.cos
              ).normalize().multiplyScalar(1.8); // Increased from 0.6 to actually clear obstacles

              const tryPos = temps.tryPos.copy(currentPosRef.current).add(rotatedDir);

              // Check if this angle is clear
              if (!isBlockedByBuildings(tryPos, buildings, 0.5, buildingHash || undefined) &&
                  !isBlockedByObstacles(tryPos, obstacles, 0.5, obstacleHash || undefined)) {
                currentPosRef.current.copy(tryPos);
                foundPath = true;
                break;
              }
            }
          }

          // Only retarget if all 6 directions are blocked (truly stuck)
          if (!foundPath) {
            pickNewTarget(dir, true); // Pass direction to avoid and isStuck=true
            retargetTimerRef.current = 0;
            nextRetargetRef.current = 3 + Math.random() * 5;
          }
        } else {
          currentPosRef.current.copy(nextPos);
        }
        if (group.current) {
          group.current.position.copy(currentPosRef.current);
          group.current.lookAt(temps.lookAtTarget.copy(currentPosRef.current).add(dir));
        }

        // BUILDING ENTRY: Check if NPC reached their target building door
        if (targetBuildingRef.current) {
          const building = buildings.find(b => b.id === targetBuildingRef.current);
          if (building) {
            const doorPos = getDoorPosition(building);
            const distToDoor = currentPosRef.current.distanceTo(doorPos);

            if (distToDoor < 1.5) {
              // Enter the building!
              activityStateRef.current = 'INSIDE_BUILDING';
              insideBuildingIdRef.current = building.id;

              // MORALE: Panicked people hide longer, high awareness people avoid public
              let stayDuration = 1 + Math.random() * 4; // Base: 1-5 sim minutes
              if (panicRef.current > 60) {
                stayDuration += 2 + Math.random() * 3; // +2-5 extra minutes if panicked
              }
              if (awarenessRef.current > 70 && Math.random() < 0.4) {
                stayDuration += 4; // Sometimes stay much longer if very aware
              }
              buildingExitTimeRef.current = simTime + stayDuration;
              targetBuildingRef.current = null;

              // Hide the NPC
              if (group.current) {
                group.current.visible = false;
              }

              return; // Stop processing this frame
            }
          }
        }
      }
    // 1b. Player collision bounceback
    if (!isFar && playerRef?.current) {
      const playerPos = playerRef.current.position;
      const offset = temps.playerOffset.copy(currentPosRef.current).sub(playerPos);
      offset.y = 0;
      const distSq = offset.lengthSq();
      const limit = 1.05;
      if (distSq > 0.0001 && distSq < limit * limit) {
        const dist = Math.sqrt(distSq);
        const normal = temps.playerNormal.copy(offset).multiplyScalar(1 / dist);
        currentPosRef.current.add(temps.playerPush.copy(normal).multiplyScalar(0.12));
        if (group.current) {
          group.current.position.copy(currentPosRef.current);
        }
        currentTargetRef.current.add(temps.playerTargetPush.copy(normal).multiplyScalar(2.0));
        const now = performance.now();
        if (impactMapRef?.current && now - playerImpactCooldownRef.current > 400) {
          impactMapRef.current.set(stats.id, { time: now, intensity: 0.7 });
          playerImpactCooldownRef.current = now;
        }
      }

      // NPC APPROACH BEHAVIOR: Friendly NPCs may approach the player
      // Only check every ~1 second of sim time to reduce overhead
      // Check both individual and global cooldowns
      const globalCooldownActive = globalApproachCooldownRef?.current && simTime < globalApproachCooldownRef.current;
      if (
        onNPCInitiatedEncounter &&
        !isSelected &&
        stateRef.current === AgentState.HEALTHY &&
        simTime - lastApproachCheckRef.current > 1 &&
        simTime > approachCooldownRef.current &&
        !globalCooldownActive
      ) {
        lastApproachCheckRef.current = simTime;
        approachCheckCountRef.current += 1;

        const distToPlayer = Math.sqrt(distSq);
        const APPROACH_NOTICE_DISTANCE = 12; // NPCs notice player within this range
        const APPROACH_INITIATE_DISTANCE = 2.5; // Close enough to trigger encounter

        // Only consider approaching if player is in notice range
        if (distToPlayer < APPROACH_NOTICE_DISTANCE && distToPlayer > APPROACH_INITIATE_DISTANCE) {
          // Calculate approach probability based on disposition and factors
          const baseDisposition = stats.disposition ?? 50;

          // Disposition must be high enough (friendly NPCs)
          if (baseDisposition >= 60 && panicRef.current < 40) {
            // Calculate effective friendliness with player factors
            let approachScore = baseDisposition;

            // Same religion bonus
            if (playerStats?.religion && stats.religion === playerStats.religion) {
              approachScore += 15;
            }
            // Same ethnicity bonus
            if (playerStats?.ethnicity && stats.ethnicity === playerStats.ethnicity) {
              approachScore += 10;
            }
            // Player charisma bonus
            if (playerStats?.charisma) {
              approachScore += (playerStats.charisma - 5) * 3;
            }
            // Time of day factor (people less likely to approach at night)
            if (timeOfDay < 6 || timeOfDay > 20) {
              approachScore -= 30;
            }
            // Panic reduces approach likelihood
            approachScore -= panicRef.current;

            // Use seeded random for consistent behavior (varies by NPC and check count)
            const approachChance = Math.max(0, (approachScore - 70) / 100);
            const checkSeed = idSeed + approachCheckCountRef.current * 7919; // Prime for better distribution
            if (seededRandom(checkSeed) < approachChance * 0.15) { // Cap at ~4.5% per check for high scores
              // Start approaching the player!
              isApproachingPlayerRef.current = true;
              const offsetSeed = checkSeed + 1;
              currentTargetRef.current.set(
                playerPos.x + (seededRandom(offsetSeed) - 0.5) * 2,
                0,
                playerPos.z + (seededRandom(offsetSeed + 1) - 0.5) * 2
              );
              targetBuildingRef.current = null; // Cancel any building destination
            }
          }
        }

        // Check if approaching NPC should abort or has reached the player
        if (isApproachingPlayerRef.current) {
          // Abort if player moved out of range
          if (distToPlayer > APPROACH_NOTICE_DISTANCE + 5) {
            isApproachingPlayerRef.current = false;
            approachCooldownRef.current = simTime + 5; // Short cooldown for range abort
          }
          // Abort if panic increased past threshold
          else if (panicRef.current >= 40) {
            isApproachingPlayerRef.current = false;
            approachCooldownRef.current = simTime + 8; // Medium cooldown for panic abort
          }
          // Abort if player selected this NPC (player initiated encounter instead)
          else if (isSelected) {
            isApproachingPlayerRef.current = false;
            // No cooldown - player took over the encounter
          }
          // NPC reached player - trigger encounter!
          else if (distToPlayer < APPROACH_INITIATE_DISTANCE) {
            isApproachingPlayerRef.current = false;
            approachCooldownRef.current = simTime + 10; // Don't approach again for 10 sim minutes

            // Call the encounter handler
            onNPCInitiatedEncounter({
              stats: { ...stats, panicLevel: panicRef.current, awarenessLevel: awarenessRef.current },
              state: stateRef.current
            });
          }
        }
      }
    }

    // 1c. STUCK DETECTION: Jiggle counter to detect NPCs vibrating against walls
    if (currentPosRef.current.distanceToSquared(lastPositionRef.current) < 0.01) {
      // NPC hasn't moved significantly - might be stuck
      stuckFramesRef.current++;
      if (stuckFramesRef.current > STUCK_THRESHOLD) {
        // TRULY STUCK: NPC has been vibrating in same spot for 1.5+ seconds
        // Escape by teleporting to nearest building door
        pickNewTarget(undefined, true); // isStuck=true triggers building door targeting
        stuckFramesRef.current = 0;
        retargetTimerRef.current = 0;
        nextRetargetRef.current = 3 + Math.random() * 5;
      }
    } else {
      // NPC is moving normally - reset counter
      stuckFramesRef.current = 0;
      lastPositionRef.current.copy(currentPosRef.current);
    }

    // 2. State Progression
    if (stateRef.current === AgentState.INCUBATING) {
      const exposureTime = exposureTimeRef.current ?? stateStartTimeRef.current;
      const incubationHours = incubationHoursRef.current ?? CONSTANTS.HOURS_TO_INFECTED;
      if (simTime - exposureTime >= incubationHours) {
        stateRef.current = AgentState.INFECTED;
        stateStartTimeRef.current = simTime;
        onsetTimeRef.current = simTime;
        isApproachingPlayerRef.current = false; // Sick NPCs don't approach
      }
    } else if (stateRef.current === AgentState.INFECTED) {
      const onsetTime = onsetTimeRef.current ?? stateStartTimeRef.current;
      const deathHours = deathHoursRef.current ?? (CONSTANTS.HOURS_TO_DEATH - CONSTANTS.HOURS_TO_INFECTED);
      if (simTime - onsetTime >= deathHours) {
        stateRef.current = AgentState.DECEASED;
        stateStartTimeRef.current = simTime;
        isApproachingPlayerRef.current = false; // Dead NPCs don't approach
      }
    }

    let cachedNeighbors: AgentSnapshot[] | null = null;
    const getNeighbors = () => {
      if (!cachedNeighbors && agentHash) {
        cachedNeighbors = queryNearbyAgents(currentPosRef.current, agentHash);
      }
      return cachedNeighbors ?? [];
    };

    // 3. Infection Spread (Throttled to once per second for performance)
    if (stateRef.current === AgentState.HEALTHY && agentHash) {
      infectionCheckTimerRef.current += simDelta;

      // Only check infection once per second instead of every frame (60x performance improvement)
      if (infectionCheckTimerRef.current >= 1.0) {
        infectionCheckTimerRef.current = 0;

        const neighbors = getNeighbors();
        for (const other of neighbors) {
          if (other.id === stats.id) continue;
          if (other.state === AgentState.INFECTED || other.state === AgentState.INCUBATING) {
            if (currentPosRef.current.distanceToSquared(other.pos) < 4.0) {
              // Compensate for 1-second intervals to maintain same infection rate
              // At 60fps, we went from 60 checks/sec to 1 check/sec, so multiply by 60
              const contagionMod = other.state === AgentState.INFECTED
                ? (other.plagueType === PlagueType.PNEUMONIC ? 1 : other.plagueType === PlagueType.BUBONIC ? 0.35 : 0.2)
                : (other.plagueType === PlagueType.PNEUMONIC ? 0.35 : 0.12);
              const exposureChance = Math.min(0.25, infectionRate * simulationSpeed * 0.5 * 60 * contagionMod);
              if (Math.random() < exposureChance) {
                const meta = createNpcPlagueMeta(idSeed + Math.floor(simTime * 10), simTime);
                plagueTypeRef.current = meta.plagueType;
                exposureTimeRef.current = meta.exposureTime;
                incubationHoursRef.current = meta.incubationHours;
                deathHoursRef.current = meta.deathHours;
                onsetTimeRef.current = meta.onsetTime;
                stateRef.current = AgentState.INCUBATING;
                stateStartTimeRef.current = simTime;
                isApproachingPlayerRef.current = false; // Sick NPCs don't approach
                break;
              }
            }
          }
        }
      }
    }

    // 3b. RUMOR SPREAD & PANIC (Throttled to twice per second - faster than plague)
    if (agentHash) {
      rumorCheckTimerRef.current += simDelta;

      if (rumorCheckTimerRef.current >= 0.5) {
        rumorCheckTimerRef.current = 0;

        const neighbors = getNeighbors();
        const panicMod = PANIC_SUSCEPTIBILITY[stats.socialClass] ?? 1.0;

        for (const other of neighbors) {
          if (other.id === stats.id) continue;

          const distSq = currentPosRef.current.distanceToSquared(other.pos);

          // WITNESS DEATH: Seeing a body causes major panic spike
          if (other.state === AgentState.DECEASED && distSq < 9) {
            if (lastWitnessedDeathIdRef.current !== other.id) {
              lastWitnessedDeathIdRef.current = other.id;
              awarenessRef.current = Math.min(100, awarenessRef.current + 30);
              panicRef.current = Math.min(100, panicRef.current + 25 * panicMod);
              setMoodOverride('Horrified');
              moodExpireRef.current = performance.now() + 20000;
            }
          }
          // WITNESS INFECTED: Seeing visibly sick people increases awareness
          else if (other.state === AgentState.INFECTED && distSq < 6) {
            awarenessRef.current = Math.min(100, awarenessRef.current + 3);
            panicRef.current = Math.min(100, panicRef.current + 1.5 * panicMod);
          }

          // RUMOR SPREAD: Information flows from high awareness to low
          // Rumors spread further than plague (16 distSq = 4 unit radius)
          if (distSq < 16) {
            const theirAwareness = other.awareness ?? 0;
            const myAwareness = awarenessRef.current;

            if (theirAwareness > myAwareness + 10) {
              // I learn from them - transfer rate based on difference
              const transfer = (theirAwareness - myAwareness) * 0.08;
              awarenessRef.current = Math.min(100, myAwareness + transfer);

              // Panic follows awareness with class modifier
              panicRef.current = Math.min(100, panicRef.current + transfer * 0.4 * panicMod);
            }
          }
        }

        // Panic decays slowly over time (calm returns)
        // Decay rate: ~5% per simulated hour at normal speed
        panicRef.current = Math.max(0, panicRef.current - 0.08);

        // Awareness decays very slowly (people don't forget)
        awarenessRef.current = Math.max(0, awarenessRef.current - 0.01);
      }
    }

    // 3c. PLAYER ACTION RESPONSE
    if (actionEvent && actionEvent.timestamp > lastActionTimestampRef.current) {
      const actionPos = new THREE.Vector3(actionEvent.position[0], actionEvent.position[1], actionEvent.position[2]);
      const distToAction = currentPosRef.current.distanceTo(actionPos);

      // Only respond if within action radius
      if (distToAction <= actionEvent.radius) {
        lastActionTimestampRef.current = actionEvent.timestamp;
        const panicMod = PANIC_SUSCEPTIBILITY[stats.socialClass] ?? 1.0;

        if (actionEvent.effect === 'aoe_panic') {
          // WARN: Increase panic and scatter away from player
          awarenessRef.current = Math.min(100, awarenessRef.current + 25 + Math.random() * 10);
          panicRef.current = Math.min(100, panicRef.current + (15 + Math.random() * 10) * panicMod);

          // Set target to flee away from player
          const escapeDir = currentPosRef.current.clone().sub(actionPos).normalize();
          const escapeDistance = 12 + Math.random() * 8;
          currentTargetRef.current.set(
            currentPosRef.current.x + escapeDir.x * escapeDistance,
            0,
            currentPosRef.current.z + escapeDir.z * escapeDistance
          );
          targetBuildingRef.current = null;

          setMoodOverride('Alarmed');
          moodExpireRef.current = performance.now() + 8000;
        } else if (actionEvent.effect === 'aoe_calm') {
          // ENCOURAGE: Decrease panic, some NPCs move toward player
          panicRef.current = Math.max(0, panicRef.current - (20 + Math.random() * 10) / panicMod);

          // 40% chance to gather toward player
          if (Math.random() < 0.4) {
            currentTargetRef.current.set(
              actionPos.x + (Math.random() - 0.5) * 4,
              0,
              actionPos.z + (Math.random() - 0.5) * 4
            );
            targetBuildingRef.current = null;
          }

          setMoodOverride('Reassured');
          moodExpireRef.current = performance.now() + 6000;
        } else if (actionEvent.effect === 'aoe_heal') {
          // HEAL: Can cure incubating NPCs, reduce symptoms of infected
          if (stateRef.current === AgentState.INCUBATING) {
            // 60% chance to cure if caught early (incubating)
            if (Math.random() < 0.6) {
              stateRef.current = AgentState.HEALTHY;
              stateStartTimeRef.current = simTime;
              plagueTypeRef.current = PlagueType.NONE;
              exposureTimeRef.current = null;
              incubationHoursRef.current = null;
              deathHoursRef.current = null;
              onsetTimeRef.current = null;
              setMoodOverride('Grateful');
              moodExpireRef.current = performance.now() + 15000;
              panicRef.current = Math.max(0, panicRef.current - 30);
            } else {
              setMoodOverride('Hopeful');
              moodExpireRef.current = performance.now() + 8000;
            }
          } else if (stateRef.current === AgentState.INFECTED) {
            // 20% chance to cure if already infected (harder to heal)
            if (Math.random() < 0.2) {
              stateRef.current = AgentState.HEALTHY;
              stateStartTimeRef.current = simTime;
              plagueTypeRef.current = PlagueType.NONE;
              exposureTimeRef.current = null;
              incubationHoursRef.current = null;
              deathHoursRef.current = null;
              onsetTimeRef.current = null;
              setMoodOverride('Grateful');
              moodExpireRef.current = performance.now() + 20000;
              panicRef.current = Math.max(0, panicRef.current - 40);
            } else {
              // At least reduce panic and reset death timer slightly
              panicRef.current = Math.max(0, panicRef.current - 15);
              setMoodOverride('Comforted');
              moodExpireRef.current = performance.now() + 10000;
            }
          } else if (stateRef.current === AgentState.HEALTHY) {
            // Healthy NPCs are grateful for the attention
            setMoodOverride('Appreciative');
            moodExpireRef.current = performance.now() + 5000;
            panicRef.current = Math.max(0, panicRef.current - 10);
          }
        }
      }
    }

    if (lastStateRef.current !== stateRef.current) {
      lastStateRef.current = stateRef.current;
      setDisplayState(stateRef.current);
    }

    // 4. Report back to Registry
    let plagueMetaSnapshot: NPCPlagueMeta | undefined;
    if (plagueTypeRef.current !== PlagueType.NONE) {
      const metaKey = [
        plagueTypeRef.current,
        exposureTimeRef.current ?? 'n',
        incubationHoursRef.current ?? 'n',
        deathHoursRef.current ?? 'n',
        onsetTimeRef.current ?? 'n'
      ].join('|');
      if (metaKey !== lastSentPlagueMetaRef.current) {
        lastSentPlagueMetaRef.current = metaKey;
        plagueMetaSnapshot = {
          plagueType: plagueTypeRef.current,
          exposureTime: exposureTimeRef.current,
          incubationHours: incubationHoursRef.current,
          deathHours: deathHoursRef.current,
          onsetTime: onsetTimeRef.current
        };
      }
    }
    onUpdate(stats.id, stateRef.current, currentPosRef.current, awarenessRef.current, panicRef.current, plagueMetaSnapshot);

    // 5. Impact pulse update (cheap)
    if (impactMapRef?.current) {
      const impact = impactMapRef.current.get(stats.id);
      if (impact && impact.time > impactStartRef.current) {
        impactStartRef.current = impact.time;
        impactIntensityRef.current = impact.intensity;
        if (impact.intensity >= 0.7) {
          const moodOptions = ['Aggressive', 'Horrified', 'Super Annoyed', 'Perturbed'];
          const nextMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
          moodExpireRef.current = performance.now() + 12000;
          if (moodOverride !== nextMood) {
            setMoodOverride(nextMood);
          }
          if (isSelected && onSelect) {
            onSelect({ stats: { ...stats, mood: nextMood }, state: stateRef.current });
          }
        }
      }
    }
    if (moodOverride && moodExpireRef.current > 0 && performance.now() > moodExpireRef.current) {
      moodExpireRef.current = 0;
      setMoodOverride(null);
      if (isSelected && onSelect) {
        onSelect({ stats: { ...stats, mood: stats.mood }, state: stateRef.current });
      }
    }
    if (impactStartRef.current > 0) {
      const elapsed = (performance.now() - impactStartRef.current) / 1000;
      const fade = Math.max(0, 1 - elapsed / 0.8);
      impactPulseRef.current = fade * impactIntensityRef.current;
    } else {
      impactPulseRef.current = 0;
    }
    const impactColor = stateRef.current === AgentState.INFECTED || stateRef.current === AgentState.INCUBATING
      ? '#ff5c4d'
      : '#7dff70';
    if (impactStemMatRef.current) {
      impactStemMatRef.current.color.set(impactColor);
    }
    if (impactDotMatRef.current) {
      impactDotMatRef.current.color.set(impactColor);
    }
    if (impactGroupRef.current) {
      const pulse = impactPulseRef.current;
      impactGroupRef.current.visible = pulse > 0.05;
      impactGroupRef.current.scale.setScalar(0.6 + pulse * 0.6);
      if (impactStemMatRef.current) {
        impactStemMatRef.current.opacity = 0.5 + pulse * 0.5;
      }
      if (impactDotMatRef.current) {
        impactDotMatRef.current.opacity = 0.5 + pulse * 0.5;
      }
    }
    if (impactExclaimRef.current) {
      const pulse = impactPulseRef.current;
      const show = pulse > 0.05 && impactIntensityRef.current >= 0.7;
      impactExclaimRef.current.visible = show;
      if (show) {
        impactExclaimRef.current.scale.setScalar(0.6 + pulse * 0.8);
      }
      if (impactExclaimMatRef.current) {
        impactExclaimMatRef.current.opacity = 0.7 + pulse * 0.3;
      }
    }

    if (statusMarkerRef.current && statusMarkerMatRef.current) {
      const show = displayState === AgentState.INCUBATING || displayState === AgentState.INFECTED;
      statusMarkerRef.current.visible = show;
      if (show) {
        statusMarkerMatRef.current.color.set(getHealthRingColor(displayState));
      }
    }
    if (propGroupRef.current && stats.heldItem && stats.heldItem !== 'none') {
      const t = performance.now() * 0.001 + propPhase;
      const sway = Math.sin(t) * 0.08;
      const bob = Math.sin(t * 1.3) * 0.03;
      propGroupRef.current.rotation.z = sway;
      propGroupRef.current.position.y = 1.02 + bob;
    }

    if (group.current && (district === 'SALHIYYA' || district === 'OUTSKIRTS_FARMLAND' || district === 'OUTSKIRTS_DESERT' || district === 'MOUNTAIN_SHRINE')) {
      group.current.position.y = sampleTerrainHeight(heightmap, currentPosRef.current.x, currentPosRef.current.z);
    } else if (group.current) {
      group.current.position.y = 0;
    }
  });

  return (
    <group
      ref={group}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) {
          onSelect({ stats: { ...stats, mood: moodDisplay }, state: stateRef.current });
        }
      }}
    >
      <mesh ref={statusMarkerRef} position={[0, 2.55, 0]} visible={false}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshBasicMaterial ref={statusMarkerMatRef} color="#f97316" />
      </mesh>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.75, 0.95, 32]} />
          <meshBasicMaterial color={getHealthRingColor(displayState)} transparent opacity={0.7} />
        </mesh>
      )}
        <group ref={impactGroupRef} position={[0, 2.6, 0]} visible={false}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
            <meshBasicMaterial ref={impactStemMatRef} color="#7dff70" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial ref={impactDotMatRef} color="#7dff70" transparent opacity={0.9} />
          </mesh>
        </group>
        <group ref={impactExclaimRef} position={[0, 3.05, 0]} visible={false}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.06, 0.22, 0.06]} />
            <meshBasicMaterial ref={impactExclaimMatRef} color="#ef4444" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.9} />
          </mesh>
        </group>
        <Humanoid
          color={stateRef.current === AgentState.DECEASED ? '#111' : appearance.robe}
        headColor={appearance.skin}
        turbanColor={appearance.headwear}
        headscarfColor={appearance.scarf}
        robeAccentColor={appearance.accent}
        hairColor={appearance.hair}
          gender={stats.gender}
          age={stats.age}
        scale={[stats.weight, stats.height, stats.weight] as [number, number, number]}
        robeHasTrim={stats.robeHasTrim}
        robeHasSash={stats.robeHasSash}
        robeHemBand={stats.robeHemBand}
        robeSpread={stats.robeSpread}
        robeOverwrap={stats.robeOverwrap}
        robePattern={stats.robePattern}
        robePatternScale={stats.robePatternScale}
        sashPattern={stats.sashPattern}
        hairStyle={stats.hairStyle}
        headwearStyle={stats.headwearStyle}
        facialHair={stats.facialHair}
        sleeveCoverage={stats.sleeveCoverage}
        footwearStyle={stats.footwearStyle}
        footwearColor={stats.footwearColor}
        accessories={stats.accessories}
        sicknessLevel={stateRef.current === AgentState.INFECTED ? 1.0 : stateRef.current === AgentState.INCUBATING ? 0.4 : 0}
        isInfected={stateRef.current === AgentState.INFECTED}
        isIncubating={stateRef.current === AgentState.INCUBATING}
        enableArmSwing
        armSwingMode="both"
        isWalking={simulationSpeed > 0 && stateRef.current !== AgentState.DECEASED && (!quarantine || stateRef.current !== AgentState.INFECTED)}
        isDead={stateRef.current === AgentState.DECEASED}
        walkSpeed={10 * simulationSpeed * (
          stateRef.current === AgentState.INFECTED ? 0.5 :  // 50% slower when infected
          stateRef.current === AgentState.INCUBATING ? 0.8 : // 20% slower when incubating
          1.0 // Normal speed
        )}
        distanceFromCamera={distanceFromCameraRef.current}
        enableSimpleLod={ENABLE_SIMPLE_LOD}
        simpleLodDistance={SIMPLE_LOD_DISTANCE}
        />
        {stats.heldItem && stats.heldItem !== 'none' && (
          <group ref={propGroupRef} position={[0.38, 1.02, 0.15]}>
            {stats.heldItem === 'staff' && (
              <group>
                <mesh castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.42, 0.08]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <cylinderGeometry args={[0.015, 0.015, 0.25, 6]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
              </group>
            )}
            {stats.heldItem === 'hammer' && (
              <group>
                <mesh position={[0, -0.1, 0]} castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.18, 0]} castShadow>
                  <boxGeometry args={[0.12, 0.06, 0.06]} />
                  <meshStandardMaterial color="#6b7280" roughness={0.6} />
                </mesh>
              </group>
            )}
            {stats.heldItem === 'waterskin' && (
              <group>
                <mesh position={[0, -0.05, 0]} castShadow>
                  <sphereGeometry args={[0.08, 10, 10]} />
                  <meshStandardMaterial color="#7b5a3a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.08, 0]} castShadow>
                  <boxGeometry args={[0.08, 0.02, 0.02]} />
                  <meshStandardMaterial color="#c2a878" roughness={0.9} />
                </mesh>
              </group>
            )}
            {stats.heldItem === 'ledger' && (
              <mesh position={[0, 0.02, 0]} castShadow>
                <boxGeometry args={[0.14, 0.1, 0.04]} />
                <meshStandardMaterial color="#3b2a1a" roughness={0.85} />
              </mesh>
            )}
            {stats.heldItem === 'spear' && (
              <group>
                <mesh position={[0, -0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 1.0, 6]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.35, 0]} castShadow>
                  <coneGeometry args={[0.04, 0.12, 6]} />
                  <meshStandardMaterial color="#a9a9a9" roughness={0.5} />
                </mesh>
              </group>
            )}
            {stats.heldItem === 'tray' && (
              <group>
                <mesh position={[0, 0.05, 0]} castShadow>
                  <boxGeometry args={[0.2, 0.03, 0.14]} />
                  <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
                </mesh>
                <mesh position={[-0.05, 0.08, 0.02]} castShadow>
                  <sphereGeometry args={[0.03, 8, 8]} />
                  <meshStandardMaterial color="#d9b37c" roughness={0.8} />
                </mesh>
                <mesh position={[0.05, 0.08, -0.02]} castShadow>
                  <sphereGeometry args={[0.03, 8, 8]} />
                  <meshStandardMaterial color="#d2a96f" roughness={0.8} />
                </mesh>
              </group>
            )}
            {stats.heldItem === 'plank' && (
              <mesh position={[0, 0.05, 0]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.08]} />
                <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
              </mesh>
            )}
            {stats.heldItem === 'sack' && (
              <group position={[-0.15, 0.2, -0.1]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.12, 12, 10]} />
                  <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.12, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.02, 0.02]} />
                  <meshStandardMaterial color="#c2a878" roughness={0.9} />
                </mesh>
              </group>
            )}
          </group>
        )}

      {/* GRAPHICS: NPC Torch (1 in 5 NPCs carry a torch at night) */}
      {carriesTorch && (timeOfDay >= 19 || timeOfDay < 5) && stateRef.current !== AgentState.DECEASED && (
        <group position={[0.35, 1.05, 0.25]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.4, 8]} />
            <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9} />
          </mesh>
          <pointLight intensity={1.1} distance={16} decay={2} color="#ffb347" />
        </group>
      )}

      {/* PLAGUE: Miasma effect around corpses */}
      {displayState === AgentState.DECEASED && (
        <CorpseMiasma />
      )}

      {showDemographicsOverlay && displayState !== AgentState.DECEASED && (
        <Html transform={false} position={[0, 2.9, 0]} center>
          <div className={`rounded-md px-3 py-2 text-[12px] text-amber-100/80 backdrop-blur-sm shadow-lg pointer-events-none border ${
            displayState === AgentState.INFECTED
              ? 'bg-black/85 border-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.55)]'
              : displayState === AgentState.INCUBATING
                ? 'bg-black/85 border-yellow-400/80 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                : 'bg-black/80 border-amber-900/40'
          }`}>
            {(displayState === AgentState.INFECTED || displayState === AgentState.INCUBATING) && (
              <div className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${
                displayState === AgentState.INFECTED ? 'bg-red-500/20 text-red-200' : 'bg-yellow-400/20 text-yellow-100'
              }`}>
                {displayState === AgentState.INFECTED ? 'Infected' : 'Incubating'}
              </div>
            )}
            <div className="font-semibold text-amber-100">
              {stats.gender}, {stats.age}
              <span className="text-amber-500/40 mx-1">•</span>
              <span className="text-amber-100/90">{stats.profession}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`uppercase tracking-widest text-[10px] ${getReligionColor(stats.religion)}`}>{stats.religion}</span>
              <span className="text-amber-500/40">•</span>
              <span className={`uppercase tracking-widest text-[10px] ${getEthnicityColor(stats.ethnicity)}`}>{stats.ethnicity}</span>
            </div>
          </div>
        </Html>
      )}

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
              <div className="border-t border-amber-900/30 pt-1.5 mt-1.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500/60 font-bold w-20">AWARENESS</span>
                  <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, awarenessRef.current)}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-amber-100/60">{Math.round(awarenessRef.current)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500/60 font-bold w-20">PANIC</span>
                  <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      panicRef.current < 36 ? 'bg-emerald-500' :
                      panicRef.current < 56 ? 'bg-yellow-500' :
                      panicRef.current < 76 ? 'bg-orange-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.min(100, panicRef.current)}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-amber-100/60">{Math.round(panicRef.current)}%</span>
                </div>
              </div>
              <div className="flex justify-between italic text-amber-100/40 mt-1">
                 <span>{stats.gender}</span>
                 <span>"{moodDisplay}"</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});
