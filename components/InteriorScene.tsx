import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { InteriorSpec, InteriorProp, InteriorPropType, InteriorRoom, InteriorRoomType, SimulationParams, PlayerStats, Obstacle, SocialClass, BuildingType, NPCStats, AgentState, CONSTANTS, PANIC_SUSCEPTIBILITY, NpcStateOverride, NPCPlagueMeta, PlagueType } from '../types';
import { EXPOSURE_CONFIG, calculatePlagueProtection } from '../utils/plagueExposure';
import { exposePlayerToPlague } from '../utils/plague';
import { createNpcPlagueMeta } from '../utils/npcHealth';
import { seededRandom } from '../utils/procedural';
import { Player } from './Player';
import { Humanoid } from './Humanoid';
import { generateInteriorObstacles } from '../utils/interior';
import { PushableObject, createPushable } from '../utils/pushables';
import { ImpactPuffs, ImpactPuffSlot, MAX_PUFFS } from './ImpactPuffs';
import { createRugTexture, createNoiseTexture, createPlankTexture, createWallTexture, createPlasterTexture, createPatchTexture, createTileTexture, createReligiousWallTexture, createCivicWallTexture, createAdobeWallTexture, createGeometricBandTexture, createPackedEarthTexture, createWidePlankTexture, createNarrowPlankTexture, createHerringboneTexture, createTerracottaTileTexture, createStoneSlabTexture, createBrickFloorTexture, createReedMatTexture } from './interior/materials';
import { FlickerLight } from './interior/primitives/Lighting';
import { InteriorPropRenderer } from './interior/PropRenderer';
import InteriorRoomMesh from './interior/RoomMesh';

interface InteriorSceneProps {
  spec: InteriorSpec;
  params: SimulationParams;
  simTime: number;
  playerStats: PlayerStats;
  onPickupPrompt?: (label: string | null) => void;
  onPickupItem?: (pickup: import('../utils/pushables').PickupInfo) => void;
  onNpcSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  onNpcUpdate?: (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, location: 'outdoor' | 'interior', plagueMeta?: NPCPlagueMeta) => void;
  onPlagueExposure?: (plague: import('../types').PlagueStatus) => void;
  selectedNpcId?: string | null;
  showDemographicsOverlay?: boolean;
  npcStateOverride?: NpcStateOverride | null;
}

 


export const InteriorScene: React.FC<InteriorSceneProps> = ({ spec, params, simTime, playerStats, onPickupPrompt, onPickupItem, onNpcSelect, onNpcUpdate, onPlagueExposure, selectedNpcId, showDemographicsOverlay = false, npcStateOverride }) => {
  const { scene, gl } = useThree();
  const previousBackground = useRef<THREE.Color | THREE.Texture | null>(null);
  const previousFog = useRef<THREE.Fog | null>(null);
  const previousExposure = useRef<number | null>(null);
  const impactPuffsRef = useRef<ImpactPuffSlot[]>(Array.from({ length: MAX_PUFFS }, () => null));
  const impactPuffIndexRef = useRef(0);
  const npcGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const npcStatesRef = useRef<Array<{
    id: string;
    roomId: string;
    position: THREE.Vector3;
    target: THREE.Vector3;
    speed: number;
    wait: number;
    action: 'sit' | 'stand' | 'read' | 'cook';
    state: AgentState;
    stateStartTime: number;
    plagueMeta?: NPCPlagueMeta;
    awareness: number;
    panic: number;
    infectionTimer: number;
    rumorTimer: number;
  }>>([]);
  const npcWalkRef = useRef<Map<string, boolean>>(new Map());
  const [npcWalkState, setNpcWalkState] = useState<Record<string, boolean>>({});
  const [, setHealthTick] = useState(0);
  const lastOverrideNonceRef = useRef<number | null>(null);
  const registrySyncTimerRef = useRef(0);
  const exposureCheckTimerRef = useRef(0);
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

  const hashStringToSeed = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash || 1;
  };
  const playerRef = useRef<THREE.Group>(null);
  const [pickedUpIds, setPickedUpIds] = useState<Set<string>>(new Set());
  const [hoveredNpcId, setHoveredNpcId] = useState<string | null>(null);
  const npcStatsMap = useMemo(() => new Map(spec.npcs.map((npc) => [npc.id, npc.stats])), [spec.npcs]);

  // Helper function to determine ring color based on health state
  const getHealthRingColor = (state: AgentState) => {
    switch (state) {
      case AgentState.HEALTHY: return '#22c55e';
      case AgentState.INCUBATING: return '#fbbf24';
      case AgentState.INFECTED: return '#f97316';
      case AgentState.DECEASED: return '#6b7280';
      default: return '#22c55e';
    }
  };

  const activeProps = useMemo(() => {
    const roomMap = new Map(spec.rooms.map((room) => [room.id, room]));
    const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : 'west';
    const openSide: 'north' | 'south' | 'east' | 'west' | null = spec.buildingType === BuildingType.CIVIC || spec.buildingType === BuildingType.RELIGIOUS
      ? null
      : entrySide;
    const keepInsideOpenSide = (room: InteriorRoom, pos: [number, number, number], inset = 1.8): [number, number, number] => {
      if (!openSide) return pos;
      const [cx, , cz] = room.center;
      const halfW = room.size[0] / 2;
      const halfD = room.size[2] / 2;
      const next: [number, number, number] = [...pos];
      if (openSide === 'south') {
        const minZ = cz - halfD + inset;
        if (next[2] < minZ) next[2] = minZ;
      } else if (openSide === 'north') {
        const maxZ = cz + halfD - inset;
        if (next[2] > maxZ) next[2] = maxZ;
      } else if (openSide === 'west') {
        const minX = cx - halfW + inset;
        if (next[0] < minX) next[0] = minX;
      } else if (openSide === 'east') {
        const maxX = cx + halfW - inset;
        if (next[0] > maxX) next[0] = maxX;
      }
      return next;
    };
    return spec.props
      .filter((prop) => !pickedUpIds.has(prop.id))
      .map((prop) => {
        const room = roomMap.get(prop.roomId) ?? spec.rooms[0];
        const needsInset = prop.type === InteriorPropType.RUG
          || prop.type === InteriorPropType.PRAYER_RUG
          || prop.type === InteriorPropType.FLOOR_MAT
          || prop.type === InteriorPropType.FIRE_PIT
          || prop.type === InteriorPropType.BRAZIER
          || prop.type === InteriorPropType.DESK;
        const margin = needsInset ? 1.1 : 0.75;
        const [cx, , cz] = room.center;
        // Ensure halfW/halfD are always positive (minimum 0.5 units from center)
        const halfW = Math.max(0.5, room.size[0] / 2 - margin);
        const halfD = Math.max(0.5, room.size[2] / 2 - margin);

        // Check if prop position is valid (not NaN or outside room bounds)
        let propX = prop.position[0];
        let propZ = prop.position[2];
        // Reset to center if prop is outside room (more than halfW/halfD from center)
        if (isNaN(propX) || Math.abs(propX - cx) > room.size[0] / 2 + 0.5) propX = cx;
        if (isNaN(propZ) || Math.abs(propZ - cz) > room.size[2] / 2 + 0.5) propZ = cz;

        let clamped: [number, number, number] = [
          Math.max(cx - halfW, Math.min(cx + halfW, propX)),
          prop.position[1],
          Math.max(cz - halfD, Math.min(cz + halfD, propZ)),
        ];
        if (room.type === InteriorRoomType.ENTRY) {
          clamped = keepInsideOpenSide(room, clamped, 2.0);
        }
        return { ...prop, position: clamped, roomId: room.id };
      });
  }, [spec.props, pickedUpIds, spec.rooms, spec.exteriorDoorSide, spec.buildingType]);
  useEffect(() => {
    setPickedUpIds(new Set());
  }, [spec.id]);
  const pickupMap = useMemo(() => {
    const map = new Map<InteriorPropType, { itemId: string; label: string }>();
    map.set(InteriorPropType.CANDLE, { itemId: 'interior-candle', label: 'Tallow Candle' });
    map.set(InteriorPropType.LAMP, { itemId: 'interior-lamp', label: 'Oil Lamp' });
    map.set(InteriorPropType.EWER, { itemId: 'interior-ewer', label: 'Water Ewer' });
    map.set(InteriorPropType.WATER_BASIN, { itemId: 'interior-basin', label: 'Water Basin' });
    map.set(InteriorPropType.LEDGER, { itemId: 'interior-ledger', label: 'Ledger' });
    map.set(InteriorPropType.BOOKS, { itemId: 'interior-books', label: 'Manuscripts' });
    map.set(InteriorPropType.INK_SET, { itemId: 'interior-ink-set', label: 'Ink Set' });
    map.set(InteriorPropType.HOOKAH, { itemId: 'interior-hookah', label: 'Hookah Parts' });
    map.set(InteriorPropType.TRAY, { itemId: 'interior-tray', label: 'Serving Tray' });
    map.set(InteriorPropType.TEA_SET, { itemId: 'interior-tea-set', label: 'Tea Service' });
    map.set(InteriorPropType.BOLT_OF_CLOTH, { itemId: 'interior-cloth', label: 'Bolt of Cloth' });
    map.set(InteriorPropType.SPINDLE, { itemId: 'interior-spindle', label: 'Spindle' });
    map.set(InteriorPropType.MORTAR, { itemId: 'interior-mortar', label: 'Mortar & Pestle' });
    map.set(InteriorPropType.HERB_RACK, { itemId: 'interior-herbs', label: 'Herb Bundle' });
    map.set(InteriorPropType.TOOL_RACK, { itemId: 'interior-tools', label: 'Tool Set' });
    map.set(InteriorPropType.BASKET, { itemId: 'interior-basket', label: 'Market Basket' });
    return map;
  }, []);
  const pushables = useMemo<PushableObject[]>(() => {
    const items: PushableObject[] = [];
    const pushableTypes = new Set<InteriorPropType>([
      InteriorPropType.BENCH,
      InteriorPropType.CHAIR,
      InteriorPropType.CUSHION,
      InteriorPropType.BASKET,
      InteriorPropType.CRATE,
      InteriorPropType.CHEST,
      InteriorPropType.COUNTER,
      InteriorPropType.DISPLAY,
      InteriorPropType.LOW_TABLE,
      InteriorPropType.BOLT_OF_CLOTH,
      InteriorPropType.AMPHORA,
      InteriorPropType.EWER,
      InteriorPropType.WATER_BASIN,
      InteriorPropType.LAMP,
      InteriorPropType.FLOOR_PILLOWS,
      InteriorPropType.CANDLE,
      InteriorPropType.LEDGER,
      InteriorPropType.BOOKS,
      InteriorPropType.INK_SET,
      InteriorPropType.HOOKAH,
      InteriorPropType.TRAY,
      InteriorPropType.TEA_SET,
      InteriorPropType.SPINDLE,
      InteriorPropType.MORTAR,
      InteriorPropType.HERB_RACK,
      InteriorPropType.TOOL_RACK
    ]);
    const typeOffsets: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 0.25,
      [InteriorPropType.CUSHION]: 0.12,
      [InteriorPropType.CHEST]: 0.45,
      [InteriorPropType.CRATE]: 0.35,
      [InteriorPropType.CANDLE]: 0.08,
      [InteriorPropType.LEDGER]: 0.08,
      [InteriorPropType.BOOKS]: 0.1,
      [InteriorPropType.INK_SET]: 0.1,
      [InteriorPropType.TRAY]: 0.12,
      [InteriorPropType.TEA_SET]: 0.12,
      [InteriorPropType.SPINDLE]: 0.08,
      [InteriorPropType.MORTAR]: 0.12,
      [InteriorPropType.HERB_RACK]: 0.2,
      [InteriorPropType.TOOL_RACK]: 0.2
    };
    const typeRadius: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 1.0,
      [InteriorPropType.CHAIR]: 0.6,
      [InteriorPropType.CUSHION]: 0.55,
      [InteriorPropType.BASKET]: 0.5,
      [InteriorPropType.CRATE]: 0.6,
      [InteriorPropType.CHEST]: 0.75,
      [InteriorPropType.COUNTER]: 1.2,
      [InteriorPropType.DISPLAY]: 0.9,
      [InteriorPropType.LOW_TABLE]: 0.8,
      [InteriorPropType.BOLT_OF_CLOTH]: 0.6,
      [InteriorPropType.AMPHORA]: 0.4,
      [InteriorPropType.EWER]: 0.35,
      [InteriorPropType.WATER_BASIN]: 0.7,
      [InteriorPropType.LAMP]: 0.3,
      [InteriorPropType.FLOOR_PILLOWS]: 0.7,
      [InteriorPropType.CANDLE]: 0.2,
      [InteriorPropType.LEDGER]: 0.25,
      [InteriorPropType.BOOKS]: 0.3,
      [InteriorPropType.INK_SET]: 0.25,
      [InteriorPropType.HOOKAH]: 0.45,
      [InteriorPropType.TRAY]: 0.3,
      [InteriorPropType.TEA_SET]: 0.3,
      [InteriorPropType.SPINDLE]: 0.2,
      [InteriorPropType.MORTAR]: 0.3,
      [InteriorPropType.HERB_RACK]: 0.45,
      [InteriorPropType.TOOL_RACK]: 0.45
    };
    const typeMass: Partial<Record<InteriorPropType, number>> = {
      [InteriorPropType.BENCH]: 2.2,
      [InteriorPropType.CHAIR]: 1.3,
      [InteriorPropType.CUSHION]: 0.5,
      [InteriorPropType.BASKET]: 0.6,
      [InteriorPropType.CRATE]: 1.4,
      [InteriorPropType.CHEST]: 1.8,
      [InteriorPropType.COUNTER]: 3.2,
      [InteriorPropType.DISPLAY]: 2.4,
      [InteriorPropType.LOW_TABLE]: 1.2,
      [InteriorPropType.BOLT_OF_CLOTH]: 0.8,
      [InteriorPropType.AMPHORA]: 0.7,
      [InteriorPropType.EWER]: 0.5,
      [InteriorPropType.WATER_BASIN]: 1.6,
      [InteriorPropType.LAMP]: 0.5,
      [InteriorPropType.FLOOR_PILLOWS]: 0.5,
      [InteriorPropType.CANDLE]: 0.2,
      [InteriorPropType.LEDGER]: 0.2,
      [InteriorPropType.BOOKS]: 0.25,
      [InteriorPropType.INK_SET]: 0.2,
      [InteriorPropType.HOOKAH]: 0.8,
      [InteriorPropType.TRAY]: 0.3,
      [InteriorPropType.TEA_SET]: 0.3,
      [InteriorPropType.SPINDLE]: 0.25,
      [InteriorPropType.MORTAR]: 0.4,
      [InteriorPropType.HERB_RACK]: 0.6,
      [InteriorPropType.TOOL_RACK]: 0.9
    };
    const typeMaterial: Partial<Record<InteriorPropType, 'wood' | 'ceramic' | 'cloth' | 'stone'>> = {
      [InteriorPropType.BENCH]: 'wood',
      [InteriorPropType.CHAIR]: 'wood',
      [InteriorPropType.CUSHION]: 'cloth',
      [InteriorPropType.BASKET]: 'cloth',
      [InteriorPropType.CRATE]: 'wood',
      [InteriorPropType.CHEST]: 'wood',
      [InteriorPropType.COUNTER]: 'wood',
      [InteriorPropType.DISPLAY]: 'wood',
      [InteriorPropType.LOW_TABLE]: 'wood',
      [InteriorPropType.BOLT_OF_CLOTH]: 'cloth',
      [InteriorPropType.AMPHORA]: 'ceramic',
      [InteriorPropType.EWER]: 'ceramic',
      [InteriorPropType.WATER_BASIN]: 'stone',
      [InteriorPropType.LAMP]: 'ceramic',
      [InteriorPropType.FLOOR_PILLOWS]: 'cloth',
      [InteriorPropType.CANDLE]: 'cloth',
      [InteriorPropType.LEDGER]: 'wood',
      [InteriorPropType.BOOKS]: 'wood',
      [InteriorPropType.INK_SET]: 'ceramic',
      [InteriorPropType.HOOKAH]: 'ceramic',
      [InteriorPropType.TRAY]: 'wood',
      [InteriorPropType.TEA_SET]: 'ceramic',
      [InteriorPropType.SPINDLE]: 'wood',
      [InteriorPropType.MORTAR]: 'stone',
      [InteriorPropType.HERB_RACK]: 'wood',
      [InteriorPropType.TOOL_RACK]: 'wood'
    };
    activeProps.forEach((prop) => {
      if (!pushableTypes.has(prop.type)) return;
      const offsetY = typeOffsets[prop.type] ?? 0;
      const radius = typeRadius[prop.type] ?? 0.6;
      const mass = typeMass[prop.type] ?? 1.0;
      const material = typeMaterial[prop.type] ?? 'wood';
      const position: [number, number, number] = [prop.position[0], prop.position[1] + offsetY, prop.position[2]];
      const item = createPushable(`interior-${prop.id}`, 'interior', position, radius, mass, 0, material);
      item.sourceId = prop.id;
      const pickupMeta = pickupMap.get(prop.type);
      if (pickupMeta) {
        item.pickup = { type: 'item', label: prop.label ?? pickupMeta.label, itemId: pickupMeta.itemId };
      }
      items.push(item);
    });
    return items;
  }, [activeProps, pickupMap]);
  const pushablesRef = useRef<PushableObject[]>(pushables);
  useEffect(() => {
    pushablesRef.current = pushables;
  }, [pushables]);
  const handlePickup = useCallback((itemId: string, pickup: import('../utils/pushables').PickupInfo) => {
    const propId = itemId.startsWith('interior-') ? itemId.slice('interior-'.length) : itemId;
    setPickedUpIds((prev) => {
      if (prev.has(propId)) return prev;
      const next = new Set(prev);
      next.add(propId);
      return next;
    });
    onPickupItem?.(pickup);
  }, [onPickupItem]);
  const entryRoom = useMemo(() => spec.rooms.find((room) => room.type === InteriorRoomType.ENTRY) ?? spec.rooms[0], [spec.rooms]);
  const roomMap = useMemo(() => {
    const map = new Map<string, InteriorRoom>();
    spec.rooms.forEach((room) => map.set(room.id, room));
    return map;
  }, [spec.rooms]);
  const wallHeight = spec.wallHeight ?? 3.2;
  const roomHotspots = useMemo(() => {
    const map = new Map<string, Array<{ position: THREE.Vector3; action: 'sit' | 'stand' | 'read' | 'cook' }>>();
    spec.rooms.forEach((room) => map.set(room.id, []));
    activeProps.forEach((prop) => {
      const list = map.get(prop.roomId);
      if (!list) return;
      const pos = new THREE.Vector3(prop.position[0], prop.position[1], prop.position[2]);
      switch (prop.type) {
        case InteriorPropType.CHAIR:
        case InteriorPropType.FLOOR_PILLOWS:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0)), action: 'sit' });
          break;
        case InteriorPropType.LOW_TABLE:
          list.push({ position: pos.clone().add(new THREE.Vector3(0.9, 0, 0)), action: 'sit' });
          list.push({ position: pos.clone().add(new THREE.Vector3(-0.9, 0, 0)), action: 'sit' });
          break;
        case InteriorPropType.DESK:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0.6)), action: 'read' });
          break;
        case InteriorPropType.FIRE_PIT:
        case InteriorPropType.BRAZIER:
          list.push({ position: pos.clone().add(new THREE.Vector3(0.8, 0, 0)), action: 'cook' });
          break;
        case InteriorPropType.COUNTER:
        case InteriorPropType.DISPLAY:
        case InteriorPropType.WATER_BASIN:
          list.push({ position: pos.clone().add(new THREE.Vector3(0, 0, 0.6)), action: 'stand' });
          break;
        default:
          break;
      }
    });
    return map;
  }, [activeProps, spec.rooms]);
  const playerSpawn = useMemo<[number, number, number]>(() => {
    return [entryRoom.center[0], 0, entryRoom.center[2]];
  }, [entryRoom]);
  const isDay = params.timeOfDay >= 7 && params.timeOfDay <= 17;
  const lampProps = useMemo(
    () => activeProps.filter((prop) => (
      prop.type === InteriorPropType.LAMP
      || prop.type === InteriorPropType.BRAZIER
      || prop.type === InteriorPropType.FIRE_PIT
      || prop.type === InteriorPropType.CANDLE
      || prop.type === InteriorPropType.FLOOR_LAMP
      || prop.type === InteriorPropType.LANTERN
    )),
    [activeProps]
  );
  const styleSeed = useMemo(() => spec.seed + spec.rooms.length * 31, [spec.seed, spec.rooms.length]);
  const interiorDoorMap = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west'>();
    spec.rooms.forEach((room) => {
      let closest: InteriorRoom | null = null;
      let closestDist = Infinity;
      spec.rooms.forEach((candidate) => {
        if (candidate.id === room.id) return;
        const dx = candidate.center[0] - room.center[0];
        const dz = candidate.center[2] - room.center[2];
        const dist = Math.hypot(dx, dz);
        if (dist < closestDist) {
          closest = candidate;
          closestDist = dist;
        }
      });
      if (!closest) return;
      const dx = closest.center[0] - room.center[0];
      const dz = closest.center[2] - room.center[2];
      if (Math.abs(dx) > Math.abs(dz)) {
        map.set(room.id, dx > 0 ? 'east' : 'west');
      } else {
        map.set(room.id, dz > 0 ? 'north' : 'south');
      }
    });
    return map;
  }, [spec.rooms]);

  // Calculate shared walls between adjacent rooms to avoid z-fighting
  // Each shared wall is only rendered by one room (the one with lower index)
  const sharedWallsMap = useMemo(() => {
    const map = new Map<string, ('north' | 'south' | 'east' | 'west')[]>();
    spec.rooms.forEach((room) => map.set(room.id, []));

    // Check each pair of rooms for adjacency
    for (let i = 0; i < spec.rooms.length; i++) {
      const roomA = spec.rooms[i];
      for (let j = i + 1; j < spec.rooms.length; j++) {
        const roomB = spec.rooms[j];
        const dx = roomB.center[0] - roomA.center[0];
        const dz = roomB.center[2] - roomA.center[2];

        // Check if rooms are adjacent (centers close enough given their sizes)
        const halfWidthA = roomA.size[0] / 2;
        const halfDepthA = roomA.size[2] / 2;
        const halfWidthB = roomB.size[0] / 2;
        const halfDepthB = roomB.size[2] / 2;

        // Adjacent on X axis (east-west)
        if (Math.abs(dx) < (halfWidthA + halfWidthB + 0.5) && Math.abs(dx) > 0.5 && Math.abs(dz) < Math.max(halfDepthA, halfDepthB)) {
          if (dx > 0) {
            // Room B is east of Room A
            // Room A owns the east wall, Room B skips its west wall
            map.get(roomB.id)?.push('west');
          } else {
            // Room B is west of Room A
            // Room A owns the west wall, Room B skips its east wall
            map.get(roomB.id)?.push('east');
          }
        }

        // Adjacent on Z axis (north-south)
        if (Math.abs(dz) < (halfDepthA + halfDepthB + 0.5) && Math.abs(dz) > 0.5 && Math.abs(dx) < Math.max(halfWidthA, halfWidthB)) {
          if (dz > 0) {
            // Room B is north of Room A
            // Room A owns the north wall, Room B skips its south wall
            map.get(roomB.id)?.push('south');
          } else {
            // Room B is south of Room A
            // Room A owns the south wall, Room B skips its north wall
            map.get(roomB.id)?.push('north');
          }
        }
      }
    }
    return map;
  }, [spec.rooms]);

  const doorMapForObstacles = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west' | null>();
    interiorDoorMap.forEach((side, id) => map.set(id, side));
    const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
    spec.rooms.forEach((room) => {
      if (room.type === InteriorRoomType.ENTRY) {
        if (!map.has(room.id)) {
          map.set(room.id, entrySide);
        }
      }
    });
    return map;
  }, [spec.rooms, interiorDoorMap, spec.exteriorDoorSide]);
  const activeSpec = useMemo(() => ({ ...spec, props: activeProps }), [spec, activeProps]);
  const rawObstacles = useMemo<Obstacle[]>(() => generateInteriorObstacles(activeSpec, doorMapForObstacles), [activeSpec, doorMapForObstacles]);
  const obstacles = useMemo<Obstacle[]>(() => {
    if (pushables.length === 0) return rawObstacles;
    return rawObstacles.filter((obstacle) => {
      const nearPushable = pushables.some((item) => {
        const dx = obstacle.position[0] - item.position.x;
        const dz = obstacle.position[2] - item.position.z;
        return Math.hypot(dx, dz) < 0.25;
      });
      return !nearPushable;
    });
  }, [rawObstacles, pushables]);
  const roomLabel = useCallback((room: InteriorRoom) => {
    if (room.type === InteriorRoomType.PRIVATE) return 'Sleeping Room';
    if (room.type === InteriorRoomType.STORAGE) return 'Storage';
    if (room.type === InteriorRoomType.WORKSHOP) return 'Study';
    if (room.type === InteriorRoomType.COURTYARD) return 'Courtyard';
    if (room.type === InteriorRoomType.ENTRY) {
      if (spec.buildingType === BuildingType.COMMERCIAL) return 'Shop';
      return 'Courtyard Exit';
    }
    if (room.type === InteriorRoomType.HALL) {
      const hasFire = activeProps.some((prop) => prop.roomId === room.id && prop.type === InteriorPropType.FIRE_PIT);
      if (spec.buildingType === BuildingType.COMMERCIAL) return 'Shop';
      return hasFire ? 'Kitchen' : 'Hall';
    }
    return 'Room';
  }, [activeProps, spec.buildingType]);
  const doorTargetMap = useMemo(() => {
    const map = new Map<string, InteriorRoom>();
    spec.rooms.forEach((room) => {
      let closest: InteriorRoom | null = null;
      let closestDist = Infinity;
      spec.rooms.forEach((candidate) => {
        if (candidate.id === room.id) return;
        const dx = candidate.center[0] - room.center[0];
        const dz = candidate.center[2] - room.center[2];
        const dist = Math.hypot(dx, dz);
        if (dist < closestDist) {
          closest = candidate;
          closestDist = dist;
        }
      });
      if (closest) map.set(room.id, closest);
    });
    return map;
  }, [spec.rooms]);
  const windowMap = useMemo(() => {
    const map = new Map<string, 'north' | 'south' | 'east' | 'west'>();
    const exteriorSide = spec.exteriorDoorSide;
    const entrySide = exteriorSide === 0 ? 'north' : exteriorSide === 1 ? 'south' : exteriorSide === 2 ? 'east' : 'west';
    spec.rooms.forEach((room) => {
      const index = parseInt(room.id.split('-')[1] || '0', 10);
      const roll = seededRandom(styleSeed + index * 23);
      let side: 'north' | 'south' | 'east' | 'west' = roll < 0.25 ? 'north' : roll < 0.5 ? 'south' : roll < 0.75 ? 'east' : 'west';
      if (room.type === InteriorRoomType.ENTRY && exteriorSide !== undefined) {
        if (spec.buildingType === BuildingType.COMMERCIAL) {
          side = entrySide;
        } else {
          side = exteriorSide === 0 ? 'south' : exteriorSide === 1 ? 'north' : exteriorSide === 2 ? 'west' : 'east';
        }
      }
      map.set(room.id, side);
    });
    return map;
  }, [spec.rooms, styleSeed, spec.exteriorDoorSide, spec.buildingType]);

  const doorVolumes = useMemo(() => {
    const volumes: Array<{
      id: string;
      side: 'north' | 'south' | 'east' | 'west';
      position: THREE.Vector3;
      normal: THREE.Vector3;
      width: number;
      target?: THREE.Vector3;
    }> = [];
    const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
    spec.rooms.forEach((room) => {
      const targetRoom = doorTargetMap.get(room.id);
      if (room.type === InteriorRoomType.ENTRY && !targetRoom) return;
      const side = room.type === InteriorRoomType.ENTRY ? (interiorDoorMap.get(room.id) ?? entrySide) : (interiorDoorMap.get(room.id) ?? 'north');
      const halfW = room.size[0] / 2;
      const halfD = room.size[2] / 2;
      const pos = side === 'north'
        ? new THREE.Vector3(room.center[0], 0, room.center[2] + halfD - 0.15)
        : side === 'south'
          ? new THREE.Vector3(room.center[0], 0, room.center[2] - halfD + 0.15)
          : side === 'east'
            ? new THREE.Vector3(room.center[0] + halfW - 0.15, 0, room.center[2])
            : new THREE.Vector3(room.center[0] - halfW + 0.15, 0, room.center[2]);
      const normal = side === 'north' ? new THREE.Vector3(0, 0, 1)
        : side === 'south' ? new THREE.Vector3(0, 0, -1)
          : side === 'east' ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(-1, 0, 0);
      volumes.push({
        id: room.id,
        side,
        position: pos,
        normal,
        width: 1.2,
        target: targetRoom ? new THREE.Vector3(targetRoom.center[0], 0, targetRoom.center[2]) : undefined
      });
    });
    return volumes;
  }, [spec.rooms, spec.exteriorDoorSide, interiorDoorMap, doorTargetMap]);

  useEffect(() => {
    npcStatesRef.current = spec.npcs.map((npc, index) => {
      let nearestRoom = entryRoom;
      let best = Infinity;
      spec.rooms.forEach((room) => {
        const dx = npc.position[0] - room.center[0];
        const dz = npc.position[2] - room.center[2];
        const dist = dx * dx + dz * dz;
        if (dist < best) {
          best = dist;
          nearestRoom = room;
        }
      });
      const seed = spec.seed + index * 31;
      let randOffset = 0;
      const rand = () => seededRandom(seed + randOffset++);
      const hotspots = roomHotspots.get(nearestRoom.id) ?? [];
      const pickHotspot = () => hotspots[Math.floor(rand() * hotspots.length)];
      const hotspot = hotspots.length > 0 ? pickHotspot() : null;
      const halfW = nearestRoom.size[0] / 2 - 1.2;
      const halfD = nearestRoom.size[2] / 2 - 1.2;
      const offsetX = (rand() - 0.5) * halfW * 1.4;
      const offsetZ = (rand() - 0.5) * halfD * 1.4;
      return {
        id: npc.id,
        roomId: nearestRoom.id,
        position: new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2]),
        target: hotspot ? hotspot.position.clone() : new THREE.Vector3(nearestRoom.center[0] + offsetX, npc.position[1], nearestRoom.center[2] + offsetZ),
        speed: 0.35 + seededRandom(seed + 7) * 0.25,
        wait: seededRandom(seed + 13) * 1.5,
        action: hotspot ? hotspot.action : 'stand',
        state: npc.state ?? AgentState.HEALTHY,
        stateStartTime: simTime,
        plagueMeta: npc.plagueMeta ?? (npc.state === AgentState.INCUBATING ? createNpcPlagueMeta(hashStringToSeed(npc.id) + Math.floor(simTime * 10), simTime) : undefined),
        awareness: npc.stats.awarenessLevel,
        panic: npc.stats.panicLevel,
        infectionTimer: 0,
        rumorTimer: 0,
      };
    });
  }, [spec, entryRoom, spec.rooms, roomHotspots, simTime]);

  useEffect(() => {
    if (!npcStateOverride) return;
    if (lastOverrideNonceRef.current === npcStateOverride.nonce) return;
    lastOverrideNonceRef.current = npcStateOverride.nonce;
    if (npcStateOverride.id === '*') {
      npcStatesRef.current.forEach((npc) => {
        npc.state = npcStateOverride.state;
        npc.stateStartTime = simTime;
        if (npcStateOverride.state === AgentState.INCUBATING) {
          npc.plagueMeta = createNpcPlagueMeta(hashStringToSeed(npc.id) + Math.floor(simTime * 10), simTime);
        } else if (npcStateOverride.state === AgentState.HEALTHY) {
          npc.plagueMeta = {
            plagueType: PlagueType.NONE,
            exposureTime: null,
            incubationHours: null,
            deathHours: null,
            onsetTime: null
          };
        } else if (npcStateOverride.state === AgentState.INFECTED) {
          npc.plagueMeta = createNpcPlagueMeta(hashStringToSeed(npc.id) + Math.floor(simTime * 10), simTime);
          npc.plagueMeta.onsetTime = simTime;
        }
      });
      setHealthTick((prev) => prev + 1);
      return;
    }
    const target = npcStatesRef.current.find((npc) => npc.id === npcStateOverride.id);
    if (target) {
      target.state = npcStateOverride.state;
      target.stateStartTime = simTime;
      if (npcStateOverride.state === AgentState.INCUBATING) {
        target.plagueMeta = createNpcPlagueMeta(hashStringToSeed(target.id) + Math.floor(simTime * 10), simTime);
      } else if (npcStateOverride.state === AgentState.HEALTHY) {
        target.plagueMeta = {
          plagueType: PlagueType.NONE,
          exposureTime: null,
          incubationHours: null,
          deathHours: null,
          onsetTime: null
        };
      } else if (npcStateOverride.state === AgentState.INFECTED) {
        target.plagueMeta = createNpcPlagueMeta(hashStringToSeed(target.id) + Math.floor(simTime * 10), simTime);
        target.plagueMeta.onsetTime = simTime;
      }
      setHealthTick((prev) => prev + 1);
    }
  }, [npcStateOverride, simTime]);

  useFrame((state, delta) => {
    let walkChanged = false;
    const nextWalkState: Record<string, boolean> = { ...npcWalkState };
    let healthChanged = false;
    const npcSnapshots = npcStatesRef.current.map((npc) => ({
      id: npc.id,
      pos: npc.position,
      state: npc.state,
      plagueType: npc.plagueMeta?.plagueType,
      awareness: npc.awareness,
      panic: npc.panic
    }));
    npcStatesRef.current.forEach((npc) => {
      const room = roomMap.get(npc.roomId) ?? entryRoom;
      const group = npcGroupRefs.current.get(npc.id);
      if (npc.state === AgentState.DECEASED) {
        if (group) {
          group.position.copy(npc.position);
        }
        return;
      }
      if (npc.wait > 0) {
        npc.wait = Math.max(0, npc.wait - delta);
      } else {
        const dir = npc.target.clone().sub(npc.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.3) {
          let randOffset = 0;
          const rand = () => seededRandom(spec.seed + npc.id.length * 17 + randOffset++);
          const hotspots = roomHotspots.get(room.id) ?? [];
          const pickHotspot = () => hotspots[Math.floor(rand() * hotspots.length)];
          const hotspot = hotspots.length > 0 ? pickHotspot() : null;
          if (hotspot) {
            npc.target.copy(hotspot.position);
            npc.action = hotspot.action;
            npc.wait = npc.action === 'read' ? 2.2 + rand() * 2.2
              : npc.action === 'cook' ? 1.8 + rand() * 1.6
                : npc.action === 'sit' ? 1.4 + rand() * 1.4
                  : 0.8 + rand() * 1.2;
          } else {
            const halfW = room.size[0] / 2 - 1.1;
            const halfD = room.size[2] / 2 - 1.1;
            const side = Math.floor(rand() * 4);
            const wallOffset = (rand() - 0.5) * (side < 2 ? room.size[0] * 0.5 : room.size[2] * 0.5);
            if (side === 0) {
              npc.target.set(room.center[0] + wallOffset, npc.position.y, room.center[2] + halfD - 0.5);
            } else if (side === 1) {
              npc.target.set(room.center[0] + wallOffset, npc.position.y, room.center[2] - halfD + 0.5);
            } else if (side === 2) {
              npc.target.set(room.center[0] - halfW + 0.5, npc.position.y, room.center[2] + wallOffset);
            } else {
              npc.target.set(room.center[0] + halfW - 0.5, npc.position.y, room.center[2] + wallOffset);
            }
            npc.action = 'stand';
            npc.wait = 0.6 + rand() * 1.8;
          }
        } else {
          dir.normalize();
          const step = dir.clone().multiplyScalar(npc.speed * delta);
          const nextPos = npc.position.clone().add(step);

          // COLLISION DETECTION: Check if path is blocked by interior obstacles
          let blocked = false;
          const NPC_RADIUS = 0.5;
          for (const obstacle of obstacles) {
            const dx = nextPos.x - obstacle.position[0];
            const dz = nextPos.z - obstacle.position[2];
            const distSq = dx * dx + dz * dz;
            const limit = (obstacle.radius + NPC_RADIUS) * (obstacle.radius + NPC_RADIUS);
            if (distSq < limit) {
              blocked = true;
              break;
            }
          }

          if (!blocked) {
            // Path is clear, move normally
            npc.position.copy(nextPos);
          } else {
            // OBSTACLE AVOIDANCE: Try alternative angles (like outdoor NPCs)
            const angles = [
              Math.PI / 2,      // 90° left
              -Math.PI / 2,     // 90° right
              Math.PI / 3,      // 60° left
              -Math.PI / 3,     // 60° right
              2 * Math.PI / 3,  // 120° left
              -2 * Math.PI / 3  // 120° right
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
              ).normalize().multiplyScalar(npc.speed * delta * 1.2);

              const tryPos = npc.position.clone().add(rotatedDir);

              // Check if this angle is clear of obstacles
              let clearPath = true;
              for (const obstacle of obstacles) {
                const dx = tryPos.x - obstacle.position[0];
                const dz = tryPos.z - obstacle.position[2];
                const distSq = dx * dx + dz * dz;
                const limit = (obstacle.radius + NPC_RADIUS) * (obstacle.radius + NPC_RADIUS);
                if (distSq < limit) {
                  clearPath = false;
                  break;
                }
              }

              if (clearPath) {
                npc.position.copy(tryPos);
                foundPath = true;
                break;
              }
            }

            // If all angles blocked, pick new target (stuck recovery)
            if (!foundPath) {
              let randOffset = 0;
              const rand = () => seededRandom(spec.seed + npc.id.length * 19 + randOffset++);
              const hotspots = roomHotspots.get(room.id) ?? [];
              const pickHotspot = () => hotspots[Math.floor(rand() * hotspots.length)];
              const hotspot = hotspots.length > 0 ? pickHotspot() : null;

              if (hotspot) {
                npc.target.copy(hotspot.position);
                npc.action = hotspot.action;
              } else {
                const halfW = room.size[0] / 2 - 1.1;
                const halfD = room.size[2] / 2 - 1.1;
                const offsetX = (rand() - 0.5) * halfW * 1.4;
                const offsetZ = (rand() - 0.5) * halfD * 1.4;
                npc.target.set(room.center[0] + offsetX, npc.position.y, room.center[2] + offsetZ);
                npc.action = 'stand';
              }
              npc.wait = 0.3; // Small pause before trying new path
            }
          }
        }
      }
      const halfW = room.size[0] / 2 - 0.7;
      const halfD = room.size[2] / 2 - 0.7;
      npc.position.x = THREE.MathUtils.clamp(npc.position.x, room.center[0] - halfW, room.center[0] + halfW);
      npc.position.z = THREE.MathUtils.clamp(npc.position.z, room.center[2] - halfD, room.center[2] + halfD);
      if (group) {
        group.position.copy(npc.position);
        const heading = npc.target.clone().sub(npc.position);
        if (heading.lengthSq() > 0.01) {
          group.rotation.y = Math.atan2(heading.x, heading.z);
        }
      }
      const moving = npc.wait <= 0.05 && npc.target.distanceToSquared(npc.position) > 0.15;
      const prevWalk = npcWalkRef.current.get(npc.id) ?? true;
      if (moving !== prevWalk) {
        npcWalkRef.current.set(npc.id, moving);
        nextWalkState[npc.id] = moving;
        walkChanged = true;
      }
    });

    npcStatesRef.current.forEach((npc) => {
      const npcStats = npcStatsMap.get(npc.id);
      const panicMod = npcStats ? (PANIC_SUSCEPTIBILITY[npcStats.socialClass] ?? 1.0) : 1.0;

      const hoursInState = simTime - npc.stateStartTime;
      if (npc.state === AgentState.INCUBATING) {
        const exposureTime = npc.plagueMeta?.exposureTime ?? npc.stateStartTime;
        const incubationHours = npc.plagueMeta?.incubationHours ?? CONSTANTS.HOURS_TO_INFECTED;
        if (simTime - exposureTime >= incubationHours) {
          npc.state = AgentState.INFECTED;
          npc.stateStartTime = simTime;
          if (npc.plagueMeta) {
            npc.plagueMeta.onsetTime = simTime;
          }
          healthChanged = true;
        }
      } else if (npc.state === AgentState.INFECTED) {
        const onsetTime = npc.plagueMeta?.onsetTime ?? npc.stateStartTime;
        const deathHours = npc.plagueMeta?.deathHours ?? (CONSTANTS.HOURS_TO_DEATH - CONSTANTS.HOURS_TO_INFECTED);
        if (simTime - onsetTime >= deathHours) {
          npc.state = AgentState.DECEASED;
          npc.stateStartTime = simTime;
          healthChanged = true;
        }
      }

      if (npc.state === AgentState.HEALTHY) {
        npc.infectionTimer += delta * params.simulationSpeed;
        if (npc.infectionTimer >= 1.0) {
          npc.infectionTimer = 0;
          for (const other of npcSnapshots) {
            if (other.id === npc.id) continue;
            if (other.state === AgentState.INFECTED || other.state === AgentState.INCUBATING) {
              if (npc.position.distanceToSquared(other.pos) < 4.0) {
                const contagionMod = other.state === AgentState.INFECTED
                  ? (other.plagueType === PlagueType.PNEUMONIC ? 1 : other.plagueType === PlagueType.BUBONIC ? 0.35 : 0.2)
                  : (other.plagueType === PlagueType.PNEUMONIC ? 0.35 : 0.12);
                const exposureChance = Math.min(0.25, params.infectionRate * params.simulationSpeed * 0.5 * 60 * contagionMod);
                if (Math.random() < exposureChance) {
                  npc.state = AgentState.INCUBATING;
                  npc.stateStartTime = simTime;
                  npc.plagueMeta = createNpcPlagueMeta(hashStringToSeed(npc.id) + Math.floor(simTime * 10), simTime);
                  healthChanged = true;
                  break;
                }
              }
            }
          }
        }
      }

      npc.rumorTimer += delta * params.simulationSpeed;
      if (npc.rumorTimer >= 0.6) {
        npc.rumorTimer = 0;
        for (const other of npcSnapshots) {
          if (other.id === npc.id) continue;
          const distSq = npc.position.distanceToSquared(other.pos);
          if (other.state === AgentState.DECEASED && distSq < 9) {
            npc.awareness = Math.min(100, npc.awareness + 25);
            npc.panic = Math.min(100, npc.panic + 18 * panicMod);
          } else if (other.state === AgentState.INFECTED && distSq < 6) {
            npc.awareness = Math.min(100, npc.awareness + 3);
            npc.panic = Math.min(100, npc.panic + 1.4 * panicMod);
          }
          if (distSq < 16 && other.awareness > npc.awareness + 10) {
            const transfer = (other.awareness - npc.awareness) * 0.08;
            npc.awareness = Math.min(100, npc.awareness + transfer);
            npc.panic = Math.min(100, npc.panic + transfer * 0.4 * panicMod);
          }
        }
      }
    });

    if (walkChanged) {
      setNpcWalkState(nextWalkState);
    }
    if (healthChanged) {
      setHealthTick((prev) => prev + 1);
    }
    if (onNpcUpdate) {
      registrySyncTimerRef.current += delta * params.simulationSpeed;
      if (registrySyncTimerRef.current >= 1.2) {
        registrySyncTimerRef.current = 0;
        npcStatesRef.current.forEach((npc) => {
          onNpcUpdate(npc.id, npc.state, npc.position, npc.awareness, npc.panic, 'interior', npc.plagueMeta);
        });
      }
    }
    if (playerRef.current && onPlagueExposure && playerStats.plague.state === AgentState.HEALTHY) {
      exposureCheckTimerRef.current += delta;
      if (exposureCheckTimerRef.current >= EXPOSURE_CONFIG.CHECK_INTERVAL_SECONDS) {
        exposureCheckTimerRef.current = 0;
        const pos = playerRef.current.position;
        const protectionMultiplier = calculatePlagueProtection(playerStats.inventory);

        const nearbyInfected = npcStatesRef.current.filter((npc) => {
          if (npc.state !== AgentState.INFECTED) return false;
          const dist = Math.hypot(npc.position.x - pos.x, npc.position.z - pos.z);
          return dist < EXPOSURE_CONFIG.INFECTED_RADIUS;
        });

        if (nearbyInfected.length > 0) {
          const pneumonicCount = nearbyInfected.filter((npc) => npc.plagueMeta?.plagueType === PlagueType.PNEUMONIC).length;
          const infectedDensity = Math.min(1, nearbyInfected.length / EXPOSURE_CONFIG.MAX_INFECTED_DENSITY);
          const pneumonicBoost = pneumonicCount > 0 ? 1.4 : 0.4;
          const exposureChance = EXPOSURE_CONFIG.INFECTED_BASE_CHANCE * infectedDensity * pneumonicBoost * protectionMultiplier;
          if (Math.random() < Math.min(0.2, exposureChance)) {
            const updatedPlague = exposePlayerToPlague(playerStats.plague, 'airborne', 0.8, simTime);
            if (updatedPlague.state !== AgentState.HEALTHY) {
              onPlagueExposure(updatedPlague);
              onPickupPrompt?.('You feel a sudden chill...');
              setTimeout(() => onPickupPrompt?.(null), 2000);
              return;
            }
          }
        }

        const nearbyCorpses = npcStatesRef.current.filter((npc) => {
          if (npc.state !== AgentState.DECEASED) return false;
          const dist = Math.hypot(npc.position.x - pos.x, npc.position.z - pos.z);
          return dist < EXPOSURE_CONFIG.CORPSE_RADIUS;
        });

        if (nearbyCorpses.length > 0) {
          const exposureChance = EXPOSURE_CONFIG.CORPSE_BASE_CHANCE * protectionMultiplier;
          if (Math.random() < Math.min(0.15, exposureChance)) {
            const updatedPlague = exposePlayerToPlague(playerStats.plague, 'contact', 0.6, simTime);
            if (updatedPlague.state !== AgentState.HEALTHY) {
              onPlagueExposure(updatedPlague);
              onPickupPrompt?.('You feel a sudden chill...');
              setTimeout(() => onPickupPrompt?.(null), 2000);
            }
          }
        }
      }
    }
    if (playerRef.current) {
      const playerPos = playerRef.current.position;
      doorVolumes.forEach((door) => {
        const dx = playerPos.x - door.position.x;
        const dz = playerPos.z - door.position.z;
        const lateral = door.side === 'north' || door.side === 'south' ? Math.abs(dx) : Math.abs(dz);
        const depth = door.side === 'north' || door.side === 'south' ? Math.abs(dz) : Math.abs(dx);
        if (lateral < door.width && depth < 0.5) {
          playerPos.add(door.normal.clone().multiplyScalar(0.06));
        }
      });
    }
  });
  const wallPalette = useMemo(() => {
    const base = spec.socialClass === SocialClass.NOBILITY
      ? ['#e8decf', '#d9cbb3', '#d4c5a3', '#c9b693', '#d0bf9f', '#c2ad8a', '#f0e8d8', '#e3d6c4']
      : spec.socialClass === SocialClass.MERCHANT
        ? ['#efe5d5', '#d6c7ad', '#c8b18f', '#bfa98a', '#c4ae8c', '#ccb495', '#e8dcc7', '#d7c6ae']
        : spec.socialClass === SocialClass.CLERGY
          ? ['#cdbfa7', '#b7a68b', '#bcae93', '#ae9f85', '#c2b396', '#a99a82', '#d9ccb7', '#c6b8a2']
          : ['#b39b7e', '#a98f72', '#9c846a', '#b0977a', '#a38b6f', '#9a8267', '#b09a80', '#a58f73'];
    return base;
  }, [spec.socialClass]);
  const floorPalette = useMemo(() => {
    // Civic buildings get marble or polished wood colors
    if (spec.buildingType === BuildingType.CIVIC) {
      const isMarbel = Math.random() > 0.5;
      return isMarbel
        ? ['#e8e4d8', '#ddd9cd', '#f0ece0'] // Cream marble tones
        : ['#8a6b4f', '#7a5b3f', '#9a7b5f']; // Polished wood tones
    }
    const base = spec.socialClass === SocialClass.NOBILITY
      ? ['#a98c6d', '#9b7f61', '#b09474']
      : spec.socialClass === SocialClass.MERCHANT
        ? ['#9c8164', '#8e7458', '#a2876a']
        : spec.socialClass === SocialClass.CLERGY
          ? ['#8f785e', '#836d55', '#9a8063']
          : ['#8a7359', '#7b664e', '#957b60'];
    return base;
  }, [spec.socialClass, spec.buildingType]);
  const floorMaterials = useMemo(() => {
    // Floor type selection based on building type, social class, and variation
    const floorVariant = seededRandom(styleSeed * 3.7);

    const base = floorPalette.map((color, index) => {
      const accent = '#5a4737';
      const grout = '#6a5a4a';

      // Civic buildings - marble or stone slabs
      if (spec.buildingType === BuildingType.CIVIC) {
        const isMarble = floorPalette[0].startsWith('#e') || floorPalette[0].startsWith('#d') || floorPalette[0].startsWith('#f');
        if (isMarble) {
          // Polished marble - solid color, very smooth
          return new THREE.MeshStandardMaterial({
            color,
            roughness: 0.2,
            metalness: 0.08
          });
        }
        // Stone slabs for non-marble civic
        const tex = createStoneSlabTexture(color, grout);
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.75 });
      }

      // Religious buildings - keep existing marble treatment
      if (spec.buildingType === BuildingType.RELIGIOUS) {
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.25,
          metalness: 0.05
        });
      }

      // Commercial buildings - stone slabs, brick, or terracotta
      if (spec.buildingType === BuildingType.COMMERCIAL) {
        if (floorVariant < 0.4) {
          const tex = createStoneSlabTexture(color, grout);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.8 });
        } else if (floorVariant < 0.7) {
          const tex = createBrickFloorTexture('#a07050', '#7a6a5a');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color: '#a07050', roughness: 0.85 });
        } else {
          const tex = createTerracottaTileTexture('#c08060', grout);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color: '#c08060', roughness: 0.75 });
        }
      }

      // Peasant dwellings - packed earth, reed mats, or rough planks
      if (spec.socialClass === SocialClass.PEASANT) {
        if (floorVariant < 0.5) {
          // Packed earth floor
          const tex = createPackedEarthTexture(color, '#5a4a3a');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.95 });
        } else if (floorVariant < 0.8) {
          // Reed mat over earth
          const tex = createReedMatTexture('#a09070', '#8a7a60');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color: '#a09070', roughness: 0.9 });
        } else {
          // Rough worn planks
          const tex = createPlankTexture(color, accent);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.92 });
        }
      }

      // Nobility - herringbone wood, fine tile, or terracotta
      if (spec.socialClass === SocialClass.NOBILITY) {
        if (floorVariant < 0.45) {
          // Herringbone parquet
          const tex = createHerringboneTexture(color, accent);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.7 });
        } else if (floorVariant < 0.75) {
          // Fine geometric tile
          const tex = createTileTexture(color, '#6d5a45');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.65 });
        } else {
          // Terracotta with fine grout
          const tex = createTerracottaTileTexture('#b87858', '#6a5a4a');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color: '#b87858', roughness: 0.7 });
        }
      }

      // Merchant class - wide planks, narrow planks, or terracotta
      if (spec.socialClass === SocialClass.MERCHANT) {
        if (floorVariant < 0.4) {
          const tex = createWidePlankTexture(color, accent);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.8 });
        } else if (floorVariant < 0.7) {
          const tex = createNarrowPlankTexture(color, accent);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.82 });
        } else {
          const tex = createTerracottaTileTexture('#b08060', grout);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color: '#b08060', roughness: 0.75 });
        }
      }

      // Clergy - fine planks or tile
      if (spec.socialClass === SocialClass.CLERGY) {
        if (floorVariant < 0.5) {
          const tex = createWidePlankTexture(color, accent);
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.78 });
        } else {
          const tex = createTileTexture(color, '#6d5a45');
          return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.72 });
        }
      }

      // Default fallback
      return new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    });
    return base;
  }, [floorPalette, spec.socialClass, spec.buildingType, styleSeed]);
  const wallMaterials = useMemo(() => {
    return wallPalette.map((color, index) => {
      const isReligious = spec.buildingType === BuildingType.RELIGIOUS;
      const isCivic = spec.buildingType === BuildingType.CIVIC;
      const isCommercial = spec.buildingType === BuildingType.COMMERCIAL;
      const isPeasant = spec.socialClass === SocialClass.PEASANT;
      const isWealthy = spec.socialClass === SocialClass.NOBILITY || spec.socialClass === SocialClass.MERCHANT;
      const accent = isPeasant ? '#7b664e' : '#a99474';

      // Religious buildings: clean, bright plaster with subtle lime wash marks
      if (isReligious) {
        const tex = createReligiousWallTexture(color, accent);
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.85 });
      }

      // Civic buildings: use solid color to avoid texture limit (has many Damascus lanterns)
      if (isCivic) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
      }

      // Peasant dwellings: rough adobe/mud walls
      if (isPeasant) {
        const tex = createAdobeWallTexture(color, accent);
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.96 });
      }

      // Wealthy residences: smooth plaster with subtle weathering
      if (isWealthy) {
        const tex = createPlasterTexture(color, accent);
        return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.88 });
      }

      // Commercial or default: simple noise texture
      const tex = isCommercial ? createNoiseTexture(color, accent) : createPlasterTexture(color, accent);
      return new THREE.MeshStandardMaterial({ map: tex ?? undefined, color, roughness: 0.92 });
    });
  }, [wallPalette, spec.socialClass, spec.buildingType, styleSeed]);

  // Band/dado material - uses solid texture now (no transparency issues)
  const patchMaterial = useMemo(() => {
    const isReligious = spec.buildingType === BuildingType.RELIGIOUS;
    const isCivic = spec.buildingType === BuildingType.CIVIC;
    const isWealthy = spec.socialClass === SocialClass.NOBILITY || spec.socialClass === SocialClass.MERCHANT;
    const baseColor = isReligious ? '#d4c9b8' : isCivic ? '#c8bba8' : '#b8a890';
    const accent = '#8f7a5c';

    // Skip textures for civic buildings to avoid texture limit
    const tex = isCivic ? null : (isReligious || isWealthy)
      ? createGeometricBandTexture(baseColor, accent)
      : createPatchTexture(baseColor, accent);

    return new THREE.MeshStandardMaterial({
      map: tex ?? undefined,
      color: baseColor,
      transparent: true,
      opacity: 0.35,
      roughness: 0.92,
      depthWrite: false,
    });
  }, [spec.buildingType, spec.socialClass]);
  const handleImpactPuff = useMemo(() => {
    return (position: THREE.Vector3, intensity: number) => {
      const idx = impactPuffIndexRef.current++ % MAX_PUFFS;
      impactPuffsRef.current[idx] = {
        position: position.clone(),
        start: performance.now(),
        intensity,
        jitter: [(Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16],
        duration: 0.45 + intensity * 0.4
      };
    };
  }, []);
  const rugMaterials = useMemo(() => {
    const options = [
      { base: '#7b3f3f', accent: '#e0c08a', pattern: 'diamond' as const },
      { base: '#6a4b3b', accent: '#d5b07a', pattern: 'stripe' as const },
      { base: '#7a5a3a', accent: '#e2c497', pattern: 'diamond' as const },
      { base: '#5d3f55', accent: '#d6b08b', pattern: 'stripe' as const },
      { base: '#6b4f2c', accent: '#e0c08a', pattern: 'stripe' as const },
      { base: '#5e5a3a', accent: '#d6b98f', pattern: 'diamond' as const },
      { base: '#6a3d2f', accent: '#e2b779', pattern: 'stripe' as const },
      { base: '#4f3a5e', accent: '#d2b58f', pattern: 'diamond' as const },
    ];
    return options.map((opt) => {
      const texture = createRugTexture(opt.base, opt.accent, opt.pattern);
      return new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: opt.base,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    });
  }, []);
  const prayerRugMaterials = useMemo(() => {
    const options = [
      { base: '#6c3d4a', accent: '#d9b889', pattern: 'diamond' as const },  // Deep burgundy
      { base: '#5a4a3d', accent: '#caa978', pattern: 'stripe' as const },   // Warm brown
      { base: '#4a3d5c', accent: '#d4c088', pattern: 'diamond' as const },  // Deep purple
      { base: '#3d5a4a', accent: '#d9c47a', pattern: 'stripe' as const },   // Forest green
      { base: '#5c3d3d', accent: '#e0c090', pattern: 'diamond' as const },  // Rust red
      { base: '#4a4a5c', accent: '#d6c590', pattern: 'stripe' as const },   // Slate blue
      { base: '#5c4a3d', accent: '#d2b888', pattern: 'diamond' as const },  // Sienna
      { base: '#3d4a5c', accent: '#e0d090', pattern: 'stripe' as const },   // Navy blue
    ];
    return options.map((opt) => {
      const texture = createRugTexture(opt.base, opt.accent, opt.pattern);
      return new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: opt.base,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    });
  }, []);

  useEffect(() => {
    previousBackground.current = scene.background as THREE.Color | THREE.Texture | null;
    previousFog.current = scene.fog;
    previousExposure.current = gl.toneMappingExposure;
    scene.background = new THREE.Color('#07090d');
    scene.fog = null;
    gl.toneMappingExposure = 1.25;
    return () => {
      scene.background = previousBackground.current;
      scene.fog = previousFog.current;
      if (previousExposure.current !== null) {
        gl.toneMappingExposure = previousExposure.current;
      }
    };
  }, [scene, gl]);

  return (
    <group>
      <ambientLight intensity={isDay ? 0.6 : 0.9} color={isDay ? "#eadcc8" : "#f3e1c6"} />
      <hemisphereLight intensity={isDay ? 0.45 : 0.7} color={isDay ? "#f4e4cf" : "#f5e1c6"} groundColor="#6b5a49" />
      <directionalLight position={[entryRoom.center[0] + 2, 4.2, entryRoom.center[2] - 1]} intensity={isDay ? 0.28 : 0.16} color="#f4d9b2" />
      {!isDay && (
        <FlickerLight position={[entryRoom.center[0], 2.4, entryRoom.center[2]]} intensity={0.8} color="#f0c07d" distance={18} decay={2} flicker={0.08} />
      )}
      <ImpactPuffs puffsRef={impactPuffsRef} />
      {lampProps.map((prop) => {
        const baseY = prop.type === InteriorPropType.CANDLE ? prop.position[1] + 0.2
          : prop.type === InteriorPropType.LANTERN ? prop.position[1] - 0.15
            : prop.type === InteriorPropType.FLOOR_LAMP ? 1.6
              : prop.type === InteriorPropType.BRAZIER ? 1.2
                : prop.type === InteriorPropType.FIRE_PIT ? 1.3
                  : 1.1;
        const intensity = prop.type === InteriorPropType.CANDLE ? 0.4
          : prop.type === InteriorPropType.LANTERN ? 0.85
            : prop.type === InteriorPropType.FLOOR_LAMP ? 0.75
              : prop.type === InteriorPropType.BRAZIER ? 1.0
                : prop.type === InteriorPropType.FIRE_PIT ? 1.15
                  : 0.7;
        const distance = prop.type === InteriorPropType.FIRE_PIT ? 18
          : prop.type === InteriorPropType.BRAZIER ? 16
            : prop.type === InteriorPropType.FLOOR_LAMP ? 15
              : prop.type === InteriorPropType.CANDLE ? 9
                : prop.type === InteriorPropType.LANTERN ? 16
                  : 12;
        return (
          <FlickerLight
            key={`lamp-light-${prop.id}`}
            position={[prop.position[0], baseY, prop.position[2]]}
            intensity={intensity}
            color={prop.type === InteriorPropType.LANTERN ? "#f7c48a" : "#f0c07d"}
            distance={distance}
            decay={2}
            flicker={prop.type === InteriorPropType.CANDLE ? 0.18 : 0.12}
          />
        );
      })}
      {isDay && (
        <>
          <mesh position={[entryRoom.center[0], 1.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.12]}>
            <planeGeometry args={[1.4, 1.1]} />
            <meshStandardMaterial color="#b3c5e6" emissive="#b3c5e6" emissiveIntensity={0.55} transparent opacity={0.6} />
          </mesh>
          <pointLight position={[entryRoom.center[0], 2.4, entryRoom.center[2] - entryRoom.size[2] / 2 + 0.8]} intensity={0.7} color="#c8d8f2" distance={18} decay={2} />
        </>
      )}

      {spec.rooms.map((room, index) => {
        const wallIndex = Math.floor(seededRandom(styleSeed + index * 7) * wallMaterials.length);
        const wallMaterial = wallMaterials[wallIndex];
        const wallColor = wallPalette[wallIndex] ?? '#b7a48a';
        const floorMaterial = floorMaterials[Math.floor(seededRandom(styleSeed + index * 11) * floorMaterials.length)];
        const entrySide = spec.exteriorDoorSide === 0 ? 'north' : spec.exteriorDoorSide === 1 ? 'south' : spec.exteriorDoorSide === 2 ? 'east' : spec.exteriorDoorSide === 3 ? 'west' : 'north';
        const interiorDoorSide = interiorDoorMap.get(room.id) ?? null;
        const exteriorDoorSide = room.type === InteriorRoomType.ENTRY ? entrySide : null;
        const cutawaySide = spec.buildingType === BuildingType.CIVIC || spec.buildingType === BuildingType.RELIGIOUS
          ? null
          : room.type === InteriorRoomType.ENTRY
            ? entrySide
            : null;
        const variantSeed = seededRandom(styleSeed + index * 19);
        const doorVariant = spec.buildingType === BuildingType.RELIGIOUS
          ? 1
          : spec.buildingType === BuildingType.CIVIC
            ? 2
            : Math.floor(variantSeed * 3);
        const targetRoom = doorTargetMap.get(room.id);
        const doorLabel = room.type === InteriorRoomType.ENTRY
          ? 'Exit — ESC'
          : targetRoom
            ? `To ${roomLabel(targetRoom)}`
            : null;
        const windowSide = windowMap.get(room.id) ?? 'north';
        const alcoveSides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west']
          .filter((side) => side !== interiorDoorSide && side !== windowSide);
        const alcoveSide = alcoveSides.length
          ? alcoveSides[Math.floor(seededRandom(styleSeed + index * 29) * alcoveSides.length)]
          : null;
        const windowInset = 0.22;
        const glassInset = 0.32;
        const windowOffset = windowSide === 'north'
          ? [0, 1.6, room.size[2] / 2 - windowInset]
          : windowSide === 'south'
            ? [0, 1.6, -room.size[2] / 2 + windowInset]
            : windowSide === 'east'
              ? [room.size[0] / 2 - windowInset, 1.6, 0]
              : [-room.size[0] / 2 + windowInset, 1.6, 0];
        const glassOffset = windowSide === 'north'
          ? [0, 1.6, room.size[2] / 2 - glassInset]
          : windowSide === 'south'
            ? [0, 1.6, -room.size[2] / 2 + glassInset]
            : windowSide === 'east'
              ? [room.size[0] / 2 - glassInset, 1.6, 0]
              : [-room.size[0] / 2 + glassInset, 1.6, 0];
        const stainedSeed = seededRandom(styleSeed + index * 47);
        const stainedColors = ['#8fb6e6', '#c8a2d6', '#d6b56b', '#9ec7a8'];
        const stainedGlass = spec.buildingType === BuildingType.RELIGIOUS && stainedSeed > 0.55;
        const stainedColor = stainedColors[Math.floor(stainedSeed * stainedColors.length)] ?? '#8fb6e6';
        const roomGlow = !isDay
          ? (spec.socialClass === SocialClass.PEASANT ? 0.12 : 0.2)
          : 0;
        return (
          <group key={room.id}>
            <InteriorRoomMesh
              room={room}
              floorMaterial={floorMaterial}
              wallMaterial={wallMaterial}
              wallColor={wallColor}
              patchMaterial={patchMaterial}
              socialClass={spec.socialClass}
              buildingType={spec.buildingType}
              wallHeight={wallHeight}
              interiorDoorSide={interiorDoorSide}
              exteriorDoorSide={exteriorDoorSide}
              cutawaySide={cutawaySide}
              doorVariant={doorVariant}
              alcoveSide={alcoveSide}
              doorLabel={doorLabel}
              roomSeed={styleSeed + index * 31}
              sharedWalls={sharedWallsMap.get(room.id) ?? []}
            />
            <group position={[room.center[0], 0, room.center[2]]}>
              {!isDay && roomGlow > 0 && (
                <pointLight
                  position={[0, 1.6, 0]}
                  intensity={roomGlow}
                  color="#f0d5b2"
                  distance={Math.max(room.size[0], room.size[2]) * 1.1}
                  decay={2}
                />
              )}
              {/* Window panels temporarily removed for visual comparison. */}
              {/* Removed oversized light planes; dust beam handles visible light. */}
              {isDay && (
                <pointLight
                  position={[windowOffset[0], 2.2, windowOffset[2] + (windowSide === 'north' ? -0.8 : windowSide === 'south' ? 0.8 : 0)]}
                  intensity={0.45}
                  color="#b9cbe8"
                  distance={14}
                  decay={2}
                />
              )}
            </group>
          </group>
        );
      })}

      {activeProps.map((prop, index) => {
        const pushable = pushables.find((item) => item.sourceId === prop.id);
        const roomForProp = spec.rooms.find((room) => room.id === prop.roomId);
        const rugMat = rugMaterials[Math.floor(seededRandom(styleSeed + index * 13) * rugMaterials.length)];
        const prayerMat = prayerRugMaterials[Math.floor(seededRandom(styleSeed + index * 17) * prayerRugMaterials.length)];
        return (
          <InteriorPropRenderer
            key={prop.id}
            prop={prop}
            rugMaterial={rugMat}
            prayerRugMaterial={prayerMat}
            profession={spec.profession}
            positionVector={pushable?.position}
            roomSize={roomForProp?.size}
          />
        );
      })}

      {spec.npcs.map((npc) => (
        <group
          key={npc.id}
          ref={(node) => {
            if (node) {
              npcGroupRefs.current.set(npc.id, node);
            } else {
              npcGroupRefs.current.delete(npc.id);
            }
          }}
          position={npc.position as [number, number, number]}
          rotation={npc.rotation as [number, number, number]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredNpcId(npc.id);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredNpcId(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            const stateEntry = npcStatesRef.current.find((entry) => entry.id === npc.id);
            const healthState = stateEntry?.state ?? npc.state ?? AgentState.HEALTHY;
            if (onNpcSelect) {
              onNpcSelect({ stats: npc.stats, state: healthState });
            }
          }}
        >
          {selectedNpcId === npc.id && (() => {
            const stateEntry = npcStatesRef.current.find((entry) => entry.id === npc.id);
            const healthState = stateEntry?.state ?? npc.state ?? AgentState.HEALTHY;
            return (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[0.75, 0.95, 32]} />
              <meshBasicMaterial color={getHealthRingColor(healthState)} transparent opacity={0.7} />
            </mesh>
            );
          })()}
          {showDemographicsOverlay && (() => {
            const stateEntry = npcStatesRef.current.find((entry) => entry.id === npc.id);
            const healthState = stateEntry?.state ?? npc.state ?? AgentState.HEALTHY;
            return (
            <Html transform={false} position={[0, 2.7, 0]} center>
              <div className={`rounded-md px-3 py-2 text-[12px] text-amber-100/80 backdrop-blur-sm shadow-lg pointer-events-none border ${
                healthState === AgentState.INFECTED
                  ? 'bg-black/85 border-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.55)]'
                  : healthState === AgentState.INCUBATING
                    ? 'bg-black/85 border-yellow-400/80 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                    : 'bg-black/80 border-amber-900/40'
              }`}>
                {(healthState === AgentState.INFECTED || healthState === AgentState.INCUBATING) && (
                  <div className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${
                    healthState === AgentState.INFECTED ? 'bg-red-500/20 text-red-200' : 'bg-yellow-400/20 text-yellow-100'
                  }`}>
                    {healthState === AgentState.INFECTED ? 'Infected' : 'Incubating'}
                  </div>
                )}
                <div className="font-semibold text-amber-100">
                  {npc.stats.gender}, {npc.stats.age}
                  <span className="text-amber-500/40 mx-1">•</span>
                  <span className="text-amber-100/90">{npc.stats.profession}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`uppercase tracking-widest text-[10px] ${getReligionColor(npc.stats.religion)}`}>{npc.stats.religion}</span>
                  <span className="text-amber-500/40">•</span>
                  <span className={`uppercase tracking-widest text-[10px] ${getEthnicityColor(npc.stats.ethnicity)}`}>{npc.stats.ethnicity}</span>
                </div>
              </div>
            </Html>
            );
          })()}
          <Humanoid
            color={npc.stats.socialClass === SocialClass.NOBILITY ? '#6a5b4a' : '#6b5a45'}
            headColor="#e2c6a2"
            turbanColor="#cdbb9a"
            headscarfColor="#bfae96"
            robeAccentColor="#8a6b4f"
            hairColor="#2f241b"
            gender={npc.stats.gender}
            scale={[npc.stats.weight, npc.stats.height, npc.stats.weight] as [number, number, number]}
            robeHasTrim={npc.stats.robeHasTrim}
            robeHemBand={npc.stats.robeHemBand}
            robeSpread={npc.stats.robeSpread}
            robeOverwrap={npc.stats.robeOverwrap}
            hairStyle={npc.stats.hairStyle}
            headwearStyle={npc.stats.headwearStyle}
            sleeveCoverage={npc.stats.sleeveCoverage}
            footwearStyle={npc.stats.footwearStyle}
            footwearColor={npc.stats.footwearColor}
            accessories={npc.stats.accessories}
            enableArmSwing
            isWalking={npcWalkState[npc.id] ?? true}
            isDead={(npcStatesRef.current.find((entry) => entry.id === npc.id)?.state ?? npc.state) === AgentState.DECEASED}
            sicknessLevel={(npcStatesRef.current.find((entry) => entry.id === npc.id)?.state ?? npc.state) === AgentState.INFECTED ? 1 : (npcStatesRef.current.find((entry) => entry.id === npc.id)?.state ?? npc.state) === AgentState.INCUBATING ? 0.4 : 0}
          />
        </group>
      ))}

      <Player
        ref={playerRef}
        cameraMode={params.cameraMode}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
        buildings={[]}
        obstacles={obstacles}
        initialPosition={playerSpawn}
        pushablesRef={pushablesRef}
        onImpactPuff={handleImpactPuff}
        onPickupPrompt={onPickupPrompt}
        onPickup={handlePickup}
      />
    </group>
  );
};
