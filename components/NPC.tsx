import React, { useRef, useState, useMemo, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { AgentState, NPCStats, SocialClass, CONSTANTS, BuildingMetadata, BuildingType, DistrictType, Obstacle } from '../types';
import { Humanoid } from './Humanoid';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from '../utils/spatial';
import { seededRandom } from '../utils/procedural';
import { getTerrainHeight } from '../utils/terrain';

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
  impactMapRef?: React.MutableRefObject<Map<string, { time: number; intensity: number }>>;
  playerRef?: React.RefObject<THREE.Group>;
  timeOfDay: number;
  onSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  isSelected?: boolean;
  district?: DistrictType;
  terrainSeed?: number;
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
  obstacles = [],
  impactMapRef,
  playerRef,
  timeOfDay,
  onSelect,
  isSelected = false,
  district,
  terrainSeed
}) => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [displayState, setDisplayState] = useState<AgentState>(initialState);
  const lastStateRef = useRef<AgentState>(initialState);
  const { camera } = useThree();

  const stateRef = useRef<AgentState>(initialState);
  const stateStartTimeRef = useRef(getSimTime());
  const currentPosRef = useRef(position.clone());
  const currentTargetRef = useRef(target.clone());
  const retargetTimerRef = useRef(0);
  const nextRetargetRef = useRef(3 + Math.random() * 5);
  const impactStartRef = useRef(0);
  const impactIntensityRef = useRef(0);
  const impactPulseRef = useRef(0);
  const playerImpactCooldownRef = useRef(0);
  const impactGroupRef = useRef<THREE.Group>(null);
  const statusMarkerRef = useRef<THREE.Mesh>(null);
  const statusMarkerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const propGroupRef = useRef<THREE.Group>(null);
  const propPhase = useMemo(() => seededRandom(Number(stats.id.split('-')[1] || '1') + 77) * Math.PI * 2, [stats.id]);
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

  // PERFORMANCE: Cache speed modifiers (only recalculate when hour or state changes)
  const cachedSpeedRef = useRef(2.0);
  const lastSpeedUpdateHourRef = useRef(-1);
  const lastSpeedUpdateStateRef = useRef<AgentState>(initialState);

  // BUILDING ENTRY/EXIT: Track when NPCs go inside buildings
  const activityStateRef = useRef<'WANDERING' | 'INSIDE_BUILDING'>('WANDERING');
  const targetBuildingRef = useRef<string | null>(null);
  const insideBuildingIdRef = useRef<string | null>(null);
  const buildingExitTimeRef = useRef(0);

  const colors = useMemo(() => {
    switch (stats.socialClass) {
      case SocialClass.PEASANT: return { body: '#6b5a45', head: '#e2c6a2' };
      case SocialClass.MERCHANT: return { body: '#7b5a4a', head: '#e6c9a6' };
      case SocialClass.CLERGY: return { body: '#4a4f59', head: '#d9c4a0' };
      case SocialClass.NOBILITY: return { body: '#6a5b4a', head: '#e6c9a6' };
      default: return { body: '#6b5a45', head: '#e2c6a2' };
    }
  }, [stats.socialClass]);

  // GRAPHICS: 1 in 5 NPCs carry a torch at night
  const carriesTorch = useMemo(() => {
    // Use stats.id to seed the random so it's consistent per NPC
    const idHash = stats.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (idHash % 5) === 0; // 20% chance (1 in 5)
  }, [stats.headwearStyle, stats.id]);

  const appearance = useMemo(() => {
    const seed = Number(stats.id.split('-')[1] || '1');
    const tone = seededRandom(seed + 11);
    const skin = `hsl(${26 + Math.round(tone * 8)}, ${28 + Math.round(tone * 18)}%, ${30 + Math.round(tone * 18)}%)`;
    const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
    const hair = hairPalette[Math.floor(seededRandom(seed + 17) * hairPalette.length)];
    const scarfPalette = ['#d6c2a4', '#c7b08c', '#c2a878', '#bfa57e'];
    const scarf = scarfPalette[Math.floor(seededRandom(seed + 29) * scarfPalette.length)];
    const robePalette = ['#6f6a3f', '#7b5a4a', '#6b5a45', '#5c4b3a', '#4a4f59'];
    let robe = robePalette[Math.floor(seededRandom(seed + 41) * robePalette.length)];
    const accentPalette = ['#e1d3b3', '#d9c9a8', '#cbb58c', '#bfa57e'];
    let accent = accentPalette[Math.floor(seededRandom(seed + 43) * accentPalette.length)];
    const headwearPalette = ['#8b2e2e', '#1f1f1f', '#cbb48a', '#7b5a4a', '#3f5d7a'];
    const headwearIndex = Math.floor(seededRandom(seed + 55) * headwearPalette.length);
    let headwear = stats.headwearStyle === 'straw'
      ? '#cbb48a'
      : stats.headwearStyle === 'fez'
        ? (seededRandom(seed + 57) > 0.5 ? '#8b2e2e' : '#cbb48a')
        : headwearPalette[headwearIndex];
    const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(stats.profession);
    const isSoldier = /Guard|Soldier|Mamluk/i.test(stats.profession);
    const isOfficer = /Officer/i.test(stats.profession);
    if (isReligiousLeader) {
      robe = '#2f2b26';
      accent = '#c8b892';
      headwear = '#e8dfcf';
    } else if (isSoldier) {
      robe = isOfficer ? '#3b2f2b' : '#2f3438';
      accent = isOfficer ? '#b59b6a' : '#8b5e3c';
      headwear = isOfficer ? '#8b2e2e' : '#3a3a3a';
    }
    return { skin, scarf, robe, accent, hair, headwear };
  }, [stats.headwearStyle, stats.id, stats.profession]);
  const moodDisplay = moodOverride ?? stats.mood;

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
          // Spawn just outside the door with a small random offset
          const exitOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
          ).normalize().multiplyScalar(1.5);
          currentPosRef.current.copy(doorPos).add(exitOffset);
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

    // 1. Movement Logic
    retargetTimerRef.current += delta;
    const dir = currentTargetRef.current.clone().sub(currentPosRef.current);
    const dist = dir.length();
    
    if (dist < 1.0 || retargetTimerRef.current > nextRetargetRef.current) {
      pickNewTarget();
      retargetTimerRef.current = 0;
      nextRetargetRef.current = 3 + Math.random() * 5;
    } else {
      dir.normalize();
      if (agentHash) {
        // PERFORMANCE: Only query spatial hash every 3 frames (3x reduction in queries)
        spatialQueryFrameCountRef.current++;
        if (spatialQueryFrameCountRef.current >= 3) {
          cachedNeighborsRef.current = queryNearbyAgents(currentPosRef.current, agentHash);
          spatialQueryFrameCountRef.current = 0;
        }

        // Use cached neighbors for steering calculation
        const repel = new THREE.Vector3();
        for (const other of cachedNeighborsRef.current) {
          if (other.id === stats.id) continue;
          const offset = currentPosRef.current.clone().sub(other.pos);
          const d2 = offset.lengthSq();
          if (d2 > 0.0001 && d2 < 4.0) {
            repel.add(offset.normalize().multiplyScalar(0.35 / d2));
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

      const step = dir.multiplyScalar(speed * delta * simulationSpeed);
      const nextPos = currentPosRef.current.clone().add(step);

      // PERFORMANCE & BEHAVIOR: Multi-angle obstacle avoidance (6 directions instead of 2)
      if (isBlockedByBuildings(nextPos, buildings, 0.5, buildingHash || undefined) || isBlockedByObstacles(nextPos, obstacles, 0.5)) {
        // Try 6 angles: 90° left/right, 60° diagonals, 120° half-back
        // This prevents NPCs from getting stuck in corners
        const angles = [
          Math.PI / 2,      // 90° left
          -Math.PI / 2,     // 90° right
          Math.PI / 3,      // 60° left (diagonal)
          -Math.PI / 3,     // 60° right (diagonal)
          2 * Math.PI / 3,  // 120° left (half-back)
          -2 * Math.PI / 3  // 120° right (half-back)
        ];

        let foundPath = false;
        for (const angle of angles) {
          // Rotate direction vector by angle
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rotatedDir = new THREE.Vector3(
            dir.x * cos - dir.z * sin,
            0,
            dir.x * sin + dir.z * cos
          ).normalize().multiplyScalar(0.6);

          const tryPos = currentPosRef.current.clone().add(rotatedDir);

          // Check if this angle is clear
          if (!isBlockedByBuildings(tryPos, buildings, 0.5, buildingHash || undefined) &&
              !isBlockedByObstacles(tryPos, obstacles, 0.5)) {
            currentPosRef.current.copy(tryPos);
            foundPath = true;
            break;
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
        group.current.lookAt(currentPosRef.current.clone().add(dir));
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
            buildingExitTimeRef.current = simTime + (1 + Math.random() * 4); // 1-5 sim minutes inside
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
    if (playerRef?.current) {
      const playerPos = playerRef.current.position;
      const offset = currentPosRef.current.clone().sub(playerPos);
      offset.y = 0;
      const distSq = offset.lengthSq();
      const limit = 1.05;
      if (distSq > 0.0001 && distSq < limit * limit) {
        const dist = Math.sqrt(distSq);
        const normal = offset.multiplyScalar(1 / dist);
        currentPosRef.current.add(normal.clone().multiplyScalar(0.12));
        if (group.current) {
          group.current.position.copy(currentPosRef.current);
        }
        currentTargetRef.current.add(normal.clone().multiplyScalar(2.0));
        const now = performance.now();
        if (impactMapRef?.current && now - playerImpactCooldownRef.current > 400) {
          impactMapRef.current.set(stats.id, { time: now, intensity: 0.7 });
          playerImpactCooldownRef.current = now;
        }
      }
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

    // 3. Infection Spread (Throttled to once per second for performance)
    if (stateRef.current === AgentState.HEALTHY && agentHash) {
      infectionCheckTimerRef.current += delta * simulationSpeed;

      // Only check infection once per second instead of every frame (60x performance improvement)
      if (infectionCheckTimerRef.current >= 1.0) {
        infectionCheckTimerRef.current = 0;

        const neighbors = queryNearbyAgents(currentPosRef.current, agentHash);
        for (const other of neighbors) {
          if (other.id === stats.id) continue;
          if (other.state === AgentState.INFECTED || other.state === AgentState.INCUBATING) {
            if (currentPosRef.current.distanceToSquared(other.pos) < 4.0) {
              // Compensate for 1-second intervals to maintain same infection rate
              // At 60fps, we went from 60 checks/sec to 1 check/sec, so multiply by 60
              if (Math.random() < infectionRate * simulationSpeed * 0.5 * 60) {
                stateRef.current = AgentState.INCUBATING;
                stateStartTimeRef.current = simTime;
                break;
              }
            }
          }
        }
      }
    }

    if (lastStateRef.current !== stateRef.current) {
      lastStateRef.current = stateRef.current;
      setDisplayState(stateRef.current);
    }

    // 4. Report back to Registry
    onUpdate(stats.id, stateRef.current, currentPosRef.current);

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

    if (group.current && (district === 'SALHIYYA' || district === 'OUTSKIRTS') && terrainSeed !== undefined) {
      group.current.position.y = getTerrainHeight(district, currentPosRef.current.x, currentPosRef.current.z, terrainSeed);
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
          color={stats.gender === 'Female' ? appearance.robe : (stateRef.current === AgentState.DECEASED ? '#111' : colors.body)}
        headColor={appearance.skin}
        turbanColor={appearance.headwear}
        headscarfColor={appearance.scarf}
        robeAccentColor={appearance.accent}
        hairColor={appearance.hair}
        gender={stats.gender}
        scale={[stats.weight, stats.height, stats.weight] as [number, number, number]}
        robeHasTrim={stats.robeHasTrim}
        robeHemBand={stats.robeHemBand}
        robeSpread={stats.robeSpread}
        robeOverwrap={stats.robeOverwrap}
        robePattern={stats.robePattern}
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
        distanceFromCamera={distanceFromCameraRef.current}
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
                 <span>"{moodDisplay}"</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});
