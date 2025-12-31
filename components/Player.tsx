
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { CameraMode, BuildingMetadata, PlayerStats, Obstacle, DistrictType, PlayerActionEvent, AgentState, ClimbableAccessory, ClimbingState, PlagueType, CONSTANTS } from '../types';
import { Humanoid } from './Humanoid';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import {
  createClimbingState,
  initiateClimbing,
  stopClimbing,
  updateClimbing,
  calculateRoofEntryPosition,
  calculateGroundExitPosition,
  CLIMBING_CONSTANTS
} from '../utils/climbing';
import { findNearbyClimbable, findNearbyClimbableFast, getRoofHeightAt, ClimbableSpatialHash } from '../utils/climbables';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from '../utils/spatial';
import { PushableObject, PickupInfo, PushableMaterial, isClimbablePushable, getPushableClimbHeight, canBreak, getBreakChance, generateShatterLoot, ShatterLootItem } from '../utils/pushables';
import { sampleTerrainHeight, TerrainHeightmap } from '../utils/terrain';
import { calculateTerrainGradient } from '../utils/terrain-gradient';
import { collisionSounds, CollisionMaterial } from './audio/CollisionSounds';
import { EXPOSURE_CONFIG, calculatePlagueProtection } from '../utils/plagueExposure';
import { Rat } from './Rats';
import { getAllItems, getItemDetailsByItemId } from '../utils/merchantItems';

// Map pushable materials to collision sound materials
const materialToSound = (mat: PushableMaterial): CollisionMaterial => {
  switch (mat) {
    case 'ceramic': return 'ceramic';
    case 'wood': return 'wood';
    case 'stone': return 'stone';
    case 'cloth': return 'cloth';
    case 'metal': return 'metal';
    default: return 'stone';
  }
};

const PLAYER_SPEED = 6;
const RUN_SPEED = 11;
const CAMERA_SENSITIVITY = 4.2;

// Helper for smooth angle interpolation that takes the shortest path around the circle
// Prevents the "long way around" issue when switching between opposite directions
const lerpAngle = (current: number, target: number, t: number): number => {
  // Normalize both angles to -π to π range
  let diff = target - current;

  // Wrap difference to -π to π (shortest path)
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return current + diff * t;
};
const JUMP_FORCE = 8;
const GRAVITY = -24;
const OVERHEAD_ZOOM_SPEED = 1.2;
const OVERHEAD_ROTATE_SPEED = 1.5;
const OVERHEAD_POLAR_ANGLE = 0.3;
const MARKER_COLOR = '#fbbf24';
const ORBIT_DAMPING = 0.18;
const ORBIT_RECENTER_SPEED = 1.6;

interface PlayerProps {
  initialPosition?: [number, number, number];
  targetPosition?: THREE.Vector3 | null;
  setTargetPosition: (v: THREE.Vector3 | null) => void;
  cameraMode: CameraMode;
  buildings?: BuildingMetadata[];
  buildingHash?: SpatialHash<BuildingMetadata> | null;
  obstacles?: Obstacle[];
  obstacleHash?: SpatialHash<Obstacle> | null;
  timeOfDay?: number;
  playerStats?: PlayerStats;
  agentHashRef?: React.MutableRefObject<SpatialHash<AgentSnapshot> | null>;
  onAgentImpact?: (id: string, intensity: number) => void;
  pushablesRef?: React.MutableRefObject<PushableObject[]>;
  onImpactPuff?: (position: THREE.Vector3, intensity: number) => void;
  district?: DistrictType;
  terrainSeed?: number;
  heightmap?: TerrainHeightmap | null;
  onPickupPrompt?: (label: string | null) => void;
  onPickup?: (itemId: string, pickup: PickupInfo) => void;
  onPushCharge?: (charge: number) => void;
  pushTriggerRef?: React.MutableRefObject<number | null>;
  dossierMode?: boolean;
  actionEvent?: PlayerActionEvent | null;
  sprintStateRef?: React.MutableRefObject<boolean>;
  ratsRef?: React.MutableRefObject<Rat[] | null>;
  onPlagueExposure?: (type: 'flea' | 'airborne' | 'contact', intensity: number) => void;
  simTime?: number;
  climbables?: ClimbableAccessory[];
  onClimbingStateChange?: (state: ClimbingState | boolean) => void;
  onClimbablePrompt?: (prompt: string | null) => void;
  climbInputRef?: React.RefObject<'up' | 'down' | 'cancel' | null>;
  pickupTriggerRef?: React.MutableRefObject<boolean>;    // Mobile/touch trigger for pickup
  climbTriggerRef?: React.MutableRefObject<boolean>;     // Mobile/touch trigger for initiating climb
  onFallDamage?: (fallHeight: number, fatal: boolean) => void;
  cameraViewTarget?: [number, number, number] | null;
  onPlayerStartMove?: () => void;
  observeMode?: boolean;
  gameLoading?: boolean;
  onShatterLoot?: (loot: ShatterLootItem[], sourceObjectKind: import('../utils/pushables').PushableKind) => void;
  interiorEntrySide?: 'north' | 'south' | 'east' | 'west' | null;
  interiorEntryToken?: string | null;
}

export const Player = forwardRef<THREE.Group, PlayerProps>(({
  initialPosition = [0, 0, 0],
  targetPosition,
  setTargetPosition,
  cameraMode,
  buildings = [],
  buildingHash = null,
  obstacles = [],
  obstacleHash = null,
  timeOfDay = 12,
  playerStats,
  agentHashRef,
  onAgentImpact,
  pushablesRef,
  onImpactPuff,
  district,
  terrainSeed,
  heightmap,
  onPickupPrompt,
  onPickup,
  onPushCharge,
  pushTriggerRef,
  dossierMode = false,
  actionEvent,
  sprintStateRef,
  ratsRef,
  onPlagueExposure,
  simTime,
  climbables = [],
  onClimbingStateChange,
  onClimbablePrompt,
  climbInputRef,
  pickupTriggerRef,
  climbTriggerRef,
  onFallDamage,
  cameraViewTarget,
  onPlayerStartMove,
  observeMode = false,
  gameLoading = true,
  onShatterLoot,
  interiorEntrySide = null,
  interiorEntryToken = null
}, ref) => {
  const group = useRef<THREE.Group>(null);
  const orbitRef = useRef<any>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const markerGlowRef = useRef<THREE.Mesh>(null);
  const interiorPanRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startAngle: number;
    targetAngle: number;
    startDistance: number;
    targetDistance: number;
  } | null>(null);
  const pendingInteriorPanRef = useRef<{ side: 'north' | 'south' | 'east' | 'west'; duration: number } | null>(null);
  const interiorPanTokenRef = useRef<string | null>(null);

  // Spatial hash for fast climbable lookup (O(1) instead of O(n))
  const climbableSpatialHash = useMemo(() => {
    const hash = new ClimbableSpatialHash(5.0);
    hash.build(climbables);
    return hash;
  }, [climbables]);

  // Extract visible item names from player inventory for rendering on character
  const visibleItems = useMemo(() => {
    if (!playerStats?.inventory) return [];
    const itemNames: string[] = [];
    for (const item of playerStats.inventory) {
      const details = getItemDetailsByItemId(item.itemId);
      if (details?.name) {
        itemNames.push(details.name);
      }
    }
    return itemNames;
  }, [playerStats?.inventory]);

  // Detect cosmetic items (kohl, henna) for visual effects on character
  const cosmeticEffects = useMemo(() => {
    if (!playerStats?.inventory) return undefined;
    let hasKohl = false;
    let hasHenna = false;
    for (const item of playerStats.inventory) {
      const details = getItemDetailsByItemId(item.itemId);
      if (details?.name) {
        const nameLower = details.name.toLowerCase();
        if (nameLower.includes('kohl')) hasKohl = true;
        if (nameLower.includes('henna')) hasHenna = true;
      }
    }
    if (!hasKohl && !hasHenna) return undefined;
    return { hasKohl, hasHenna };
  }, [playerStats?.inventory]);

  const markerGlowMap = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.55);
    grad.addColorStop(0, 'rgba(255, 190, 80, 0)');
    grad.addColorStop(0.4, 'rgba(255, 190, 80, 0.15)');
    grad.addColorStop(0.7, 'rgba(255, 190, 80, 0.35)');
    grad.addColorStop(1, 'rgba(255, 190, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);
  const lastPlayerPos = useRef(new THREE.Vector3());
  const fpYaw = useRef(0);
  const fpPitch = useRef(0);

  // Mouse drag state for first-person camera look
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const mouseDeltaRef = useRef({ x: 0, y: 0 });

  const { camera, size } = useThree();
  const [isWalking, setIsWalking] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const walkingRef = useRef(false);
  const sprintingRef = useRef(false);
  const jumpPhaseRef = useRef(0);
  const isJumpingRef = useRef(false);
  const lastGroundedRef = useRef(true);
  const footstepTimerRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const jumpChargeRef = useRef(0);
  const exposureCheckTimer = useRef(0);
  const chargingRef = useRef(false);
  const npcImpactCooldownRef = useRef<Map<string, number>>(new Map());
  const objectSoundCooldownRef = useRef(0);
  const objectImpactCooldownRef = useRef<Map<string, number>>(new Map());
  const jumpAnticipationRef = useRef(0);
  const landingImpulseRef = useRef(0);
  const lastJumpChargeRef = useRef(0);
  const boulderTempsRef = useRef({
    normal: new THREE.Vector3(),
    displacement: new THREE.Vector3(),
    impulse: new THREE.Vector3(),
    angularImpulse: new THREE.Vector3()
  });
  
  // Physics states
  const velV = useRef(0);
  const velH = useRef(new THREE.Vector3(0, 0, 0)); // Horizontal velocity (for jump dismount)
  const isGrounded = useRef(true);
  const coyoteTimer = useRef(0);
  const jumpBuffer = useRef(0);
  const jumpTimer = useRef(0);
  const sprintCharge = useRef(0);
  const landingDamp = useRef(0);
  const lastSpace = useRef(false);
  const lastCRef = useRef(false); // For C key edge detection (climbing)
  const fallStartHeight = useRef<number | null>(null); // Track height when falling started for fall damage
  const lastMovePosRef = useRef(new THREE.Vector3());
  const stuckTimerRef = useRef(0);
  const interactSwingRef = useRef(0);
  const interactChargeRef = useRef(0);
  const interactChargingRef = useRef(false);
  const interactTriggerRef = useRef<number | null>(null);
  const pickupPromptRef = useRef<string | null>(null);
  const nearestPickupRef = useRef<{ id: string; pickup: PickupInfo } | null>(null);

  // Climbing state
  const climbingStateRef = useRef<ClimbingState>(createClimbingState());
  const activeClimbableRef = useRef<ClimbableAccessory | null>(null);
  const nearbyClimbableRef = useRef<ClimbableAccessory | null>(null);
  const nearbyClimbablePushableRef = useRef<PushableObject | null>(null); // For climbing onto crates, etc.
  const standingOnPushableRef = useRef<PushableObject | null>(null); // Track what object we're standing on
  const [isClimbing, setIsClimbing] = useState(false);
  const climbAnimationPhaseRef = useRef(0);

  // Action animation state (warn, encourage, observe)
  const actionAnimationRef = useRef<{ action: string; progress: number } | null>(null);

  // ANIMATION: Turn/pivot, walk-run transition, and movement inertia refs
  const turnPhaseRef = useRef(0); // 0-1 progress through pivot animation
  const lastRotationRef = useRef(0); // Previous frame's rotation for angular velocity
  const angularVelocityRef = useRef(0); // Current turn rate (radians per frame)
  const movementStartTimeRef = useRef(0); // When walking started (for start inertia)
  const movementStopTimeRef = useRef(0); // When walking stopped (for stop inertia)
  const wasWalkingRef = useRef(false); // Track previous walking state
  const wasSprintingRef = useRef(false); // Track previous sprint state
  const sprintTransitionRef = useRef(0); // 0 = walk, 1 = full sprint (for blending)
  const actionStartTimeRef = useRef<number>(0);

  // Wall occlusion system for over-shoulder camera
  const occludedMeshesRef = useRef<Set<THREE.Mesh>>(new Set());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const occlusionCheckFrameRef = useRef(0);
  const orbitOcclusionFrameRef = useRef(0);
  const orbitOcclusionTurnRef = useRef(1);
  const orbitOcclusionTempsRef = useRef({
    offset: new THREE.Vector3(),
    candidate: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    position: new THREE.Vector3()
  });
  const orbitOcclusionAxisRef = useRef(new THREE.Vector3(0, 1, 0));
  const ACTION_DURATION = 1.5; // seconds for full animation

  // Sprint camera pullback (over-shoulder mode)
  const sprintCameraOffsetRef = useRef(0); // 0 = normal, 1 = full sprint zoom

  // Dynamic FOV for sprint effect
  const currentFovRef = useRef(75); // Base FOV
  const BASE_FOV = 35;
  const SPRINT_FOV = 52; // Wider when sprinting

  // Camera bob for landing impact
  const cameraBobRef = useRef(0); // Current vertical offset from landing

  // Camera collision - how far to pull camera forward when obstructed
  const cameraCollisionOffsetRef = useRef(0);

  // Camera mode transition system
  const prevCameraModeRef = useRef<CameraMode>(cameraMode);
  const modeTransitionProgressRef = useRef(1); // 0 = just switched, 1 = complete
  const transitionStartPosRef = useRef<THREE.Vector3 | null>(null);
  const transitionStartTargetRef = useRef<THREE.Vector3 | null>(null);

  // Cinematic dolly zoom for third-person mode
  const thirdPersonDollyProgress = useRef(0); // 0 = start, 1 = fully zoomed in
  const thirdPersonStartDistance = useRef<number | null>(null);
  const thirdPersonSmoothDistance = useRef<number | null>(null); // Smoothly interpolated distance
  const thirdPersonSmoothPolar = useRef<number | null>(null); // Smoothly interpolated polar
  const thirdPersonStartAzimuth = useRef<number | null>(null); // Starting horizontal angle
  const thirdPersonSmoothAzimuth = useRef<number | null>(null); // Smoothly interpolated azimuth
  const DOLLY_DURATION = 2; // seconds for full zoom-in
  const DOLLY_ZOOM_FACTOR = 0.8; // End at 80% of starting distance
  const DOLLY_AZIMUTH_PAN = -0.5; // Pan ~30 degrees right to center player facing camera
  const DOLLY_PAN_DELAY = 0.6; // Start azimuth pan after 60% of dolly complete

  // Dossier mode camera state
  const savedCameraPos = useRef<THREE.Vector3 | null>(null);
  const savedCameraTarget = useRef<THREE.Vector3 | null>(null);

  useImperativeHandle(ref, () => group.current!, []);

  // Track if we've initialized position for this initialPosition
  const lastInitialPosRef = useRef<string>('');
  const pendingSpawnValidationRef = useRef(false);

  useEffect(() => {
    if (!group.current) return;

    // Create a key from initialPosition to detect actual changes
    const posKey = `${initialPosition[0]},${initialPosition[1]},${initialPosition[2]}`;

    // Skip if we've already initialized for this position
    if (lastInitialPosRef.current !== posKey) {
      lastInitialPosRef.current = posKey;
      pendingSpawnValidationRef.current = true;
    }
    if (!pendingSpawnValidationRef.current) return;

    // BUGFIX: Use bilinear interpolation for accurate terrain sampling
    const ground = sampleTerrainHeight(heightmap, initialPosition[0], initialPosition[2]);
    const spawnPos = new THREE.Vector3(initialPosition[0], ground + initialPosition[1], initialPosition[2]);
    const hasCollisionData = buildings.length > 0 || obstacles.length > 0;

    if (!hasCollisionData) {
      group.current.position.copy(spawnPos);
      lastPlayerPos.current.copy(spawnPos);
      lastMovePosRef.current.copy(spawnPos);
      return;
    }

    const radius = 0.6;
    const blockedAtSpawn = isBlockedByBuildings(spawnPos, buildings, radius, buildingHash || undefined) ||
      isBlockedByObstacles(spawnPos, obstacles, radius, obstacleHash || undefined);
    const currentPos = group.current.position.clone();
    const blockedAtCurrent = isBlockedByBuildings(currentPos, buildings, radius, buildingHash || undefined) ||
      isBlockedByObstacles(currentPos, obstacles, radius, obstacleHash || undefined);

    // If the player already moved away and is not blocked, don't snap them back.
    if (!blockedAtSpawn && !blockedAtCurrent && currentPos.distanceTo(spawnPos) > 1.5) {
      pendingSpawnValidationRef.current = false;
      return;
    }

    // Validate spawn isn't inside a building - if so, find safe position
    if (blockedAtSpawn || blockedAtCurrent) {
      // Try to find a nearby safe position
      const offsets = [2, 4, 6, 8, 10, 12, 14];
      let safePos: THREE.Vector3 | null = null;
      for (const r of offsets) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const candidate = new THREE.Vector3(
            spawnPos.x + Math.cos(angle) * r,
            spawnPos.y,
            spawnPos.z + Math.sin(angle) * r
          );
          const candidateGround = sampleTerrainHeight(heightmap, candidate.x, candidate.z);
          candidate.y = candidateGround + initialPosition[1];
          if (!isBlockedByBuildings(candidate, buildings, radius, buildingHash || undefined) &&
              !isBlockedByObstacles(candidate, obstacles, radius, obstacleHash || undefined)) {
            safePos = candidate;
            break;
          }
        }
        if (safePos) break;
      }

      if (!safePos) {
        const boundary = district === 'SOUTHERN_ROAD' ? CONSTANTS.SOUTHERN_ROAD_BOUNDARY : CONSTANTS.TRANSITION_RADIUS;
        const edgeInset = boundary - 4;
        const center = new THREE.Vector3(0, spawnPos.y, 0);
        for (let t = 0.15; t <= 0.75; t += 0.15) {
          const candidate = spawnPos.clone().lerp(center, t);
          const candidateGround = sampleTerrainHeight(heightmap, candidate.x, candidate.z);
          candidate.y = candidateGround + initialPosition[1];
          if (!isBlockedByBuildings(candidate, buildings, radius, buildingHash || undefined) &&
              !isBlockedByObstacles(candidate, obstacles, radius, obstacleHash || undefined) &&
              Math.abs(candidate.x) < edgeInset &&
              Math.abs(candidate.z) < edgeInset) {
            safePos = candidate;
            break;
          }
        }
      }

      if (!safePos) {
        const boundary = district === 'SOUTHERN_ROAD' ? CONSTANTS.SOUTHERN_ROAD_BOUNDARY : CONSTANTS.TRANSITION_RADIUS;
        const edgeInset = boundary - 6;
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radiusRoll = Math.random() * edgeInset * 0.8;
          const candidate = new THREE.Vector3(
            Math.cos(angle) * radiusRoll,
            spawnPos.y,
            Math.sin(angle) * radiusRoll
          );
          const candidateGround = sampleTerrainHeight(heightmap, candidate.x, candidate.z);
          candidate.y = candidateGround + initialPosition[1];
          if (!isBlockedByBuildings(candidate, buildings, radius, buildingHash || undefined) &&
              !isBlockedByObstacles(candidate, obstacles, radius, obstacleHash || undefined)) {
            safePos = candidate;
            break;
          }
        }
      }

      const finalPos = safePos || spawnPos;
      group.current.position.copy(finalPos);
      lastPlayerPos.current.copy(finalPos);
      lastMovePosRef.current.copy(finalPos);
    } else {
      group.current.position.copy(spawnPos);
      lastPlayerPos.current.copy(spawnPos);
      lastMovePosRef.current.copy(spawnPos);
    }

    pendingSpawnValidationRef.current = false;
  }, [initialPosition, heightmap, buildings, buildingHash, obstacles, obstacleHash, district]);

  const [keys, setKeys] = useState({
    up: false, down: false, left: false, right: false,
    w: false, a: false, s: false, d: false,
    shift: false, space: false, c: false
  });
  const [northLocked, setNorthLocked] = useState(false);
  const recenterRef = useRef(false);
  const recenterAmount = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (observeMode) return;
      const k = e.key.toLowerCase();
      if (!audioCtxRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          audioCtxRef.current = new AudioCtor();
          const ctx = audioCtxRef.current;
          const length = ctx.sampleRate * 0.2;
          const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
          }
          noiseBufferRef.current = buffer;
        }
      }
      if (k === 'arrowup') setKeys(prev => ({ ...prev, up: true }));
      if (k === 'arrowdown') setKeys(prev => ({ ...prev, down: true }));
      if (k === 'arrowleft') setKeys(prev => ({ ...prev, left: true }));
      if (k === 'arrowright') setKeys(prev => ({ ...prev, right: true }));
      if (k === 'w') setKeys(prev => ({ ...prev, w: true }));
      if (k === 'a') setKeys(prev => ({ ...prev, a: true }));
      if (k === 's') setKeys(prev => ({ ...prev, s: true }));
      if (k === 'd') setKeys(prev => ({ ...prev, d: true }));
      if (k === 'shift') {
        setKeys(prev => ({ ...prev, shift: true }));
        if (!interactChargingRef.current && !walkingRef.current) {
          interactChargingRef.current = true;
          interactChargeRef.current = 0;
        }
      }
      if (k === ' ') setKeys(prev => ({ ...prev, space: true }));
      if (k === 'c') setKeys(prev => ({ ...prev, c: true }));
      if (k === 'r') {
        recenterRef.current = true;
        recenterAmount.current = 1;
      }
      if (k === 'n') {
        setNorthLocked(prev => !prev);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (observeMode) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup') setKeys(prev => ({ ...prev, up: false }));
      if (k === 'arrowdown') setKeys(prev => ({ ...prev, down: false }));
      if (k === 'arrowleft') setKeys(prev => ({ ...prev, left: false }));
      if (k === 'arrowright') setKeys(prev => ({ ...prev, right: false }));
      if (k === 'w') setKeys(prev => ({ ...prev, w: false }));
      if (k === 'a') setKeys(prev => ({ ...prev, a: false }));
      if (k === 's') setKeys(prev => ({ ...prev, s: false }));
      if (k === 'd') setKeys(prev => ({ ...prev, d: false }));
      if (k === 'shift') {
        setKeys(prev => ({ ...prev, shift: false }));
        if (interactChargingRef.current) {
          const strength = Math.min(1, interactChargeRef.current);
          const triggerStrength = Math.max(strength, nearestPickupRef.current ? 0.2 : 0);
          if (triggerStrength > 0.12) {
            interactSwingRef.current = triggerStrength;
            interactTriggerRef.current = triggerStrength;
          }
          interactChargingRef.current = false;
          interactChargeRef.current = 0;
        }
      }
      if (k === ' ') setKeys(prev => ({ ...prev, space: false }));
      if (k === 'c') setKeys(prev => ({ ...prev, c: false }));
      if (k === 'r') {
        recenterRef.current = false;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [observeMode]);

  useEffect(() => {
    if (!observeMode) return;
    setKeys({
      up: false,
      down: false,
      left: false,
      right: false,
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      c: false
    });
    velV.current = 0;
    velH.current.set(0, 0, 0);
    isDraggingRef.current = false;
    mouseDeltaRef.current.x = 0;
    mouseDeltaRef.current.y = 0;
  }, [observeMode]);

  // Mouse and touch drag handlers for first-person camera look
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (observeMode) return;
      if (cameraMode === CameraMode.FIRST_PERSON) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (observeMode) return;
      if (cameraMode === CameraMode.FIRST_PERSON && isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        mouseDeltaRef.current.x += dx;
        mouseDeltaRef.current.y += dy;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    // Touch equivalents for mobile - with deadzone to distinguish tap (move) from swipe (look)
    let touchStartPos = { x: 0, y: 0 };
    let touchMoved = false;
    const TOUCH_DEADZONE = 10; // pixels before registering as camera movement

    const onTouchStart = (e: TouchEvent) => {
      if (observeMode) return;
      if (cameraMode === CameraMode.FIRST_PERSON && e.touches.length === 1) {
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchMoved = false;
      }
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
      touchMoved = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (observeMode) return;
      if (cameraMode === CameraMode.FIRST_PERSON && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        // Check if we've moved past the deadzone
        const totalDx = e.touches[0].clientX - touchStartPos.x;
        const totalDy = e.touches[0].clientY - touchStartPos.y;
        const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
        if (totalDist > TOUCH_DEADZONE) {
          isDraggingRef.current = true;
          touchMoved = true;
          mouseDeltaRef.current.x += dx;
          mouseDeltaRef.current.y += dy;
        }
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [cameraMode, observeMode]);

  // Mobile camera rotation button handler
  useEffect(() => {
    const ROTATION_AMOUNT = 30; // pixels equivalent
    const handleMobileCameraRotate = (e: Event) => {
      const customEvent = e as CustomEvent<{ direction: 'left' | 'right' | 'up' | 'down' }>;
      if (cameraMode !== CameraMode.FIRST_PERSON) return;

      switch (customEvent.detail.direction) {
        case 'left':
          mouseDeltaRef.current.x -= ROTATION_AMOUNT;
          break;
        case 'right':
          mouseDeltaRef.current.x += ROTATION_AMOUNT;
          break;
        case 'up':
          mouseDeltaRef.current.y -= ROTATION_AMOUNT;
          break;
        case 'down':
          mouseDeltaRef.current.y += ROTATION_AMOUNT;
          break;
      }
    };
    window.addEventListener('mobileCameraRotate', handleMobileCameraRotate);
    return () => {
      window.removeEventListener('mobileCameraRotate', handleMobileCameraRotate);
    };
  }, [cameraMode]);

  // Trigger action animation when actionEvent changes
  useEffect(() => {
    if (actionEvent && actionEvent.actionId) {
      actionAnimationRef.current = { action: actionEvent.actionId, progress: 0 };
      actionStartTimeRef.current = performance.now();
    }
  }, [actionEvent]);

  // Reset climbing state only if the climbable we're on no longer exists
  // This prevents false resets when climbables array reference changes but content is the same
  useEffect(() => {
    if (climbingStateRef.current.isClimbing && activeClimbableRef.current) {
      const stillExists = climbables.some(c => c.id === activeClimbableRef.current?.id);
      if (!stillExists) {
        climbingStateRef.current = stopClimbing(climbingStateRef.current);
        activeClimbableRef.current = null;
        setIsClimbing(false);
        onClimbingStateChange?.(false);
        onClimbablePrompt?.(null);
      }
    }
  }, [climbables]);

  // Reset climbing fully on district/map change
  useEffect(() => {
    if (climbingStateRef.current.isClimbing) {
      climbingStateRef.current = stopClimbing(climbingStateRef.current);
      activeClimbableRef.current = null;
      setIsClimbing(false);
      onClimbingStateChange?.(false);
    }
    onClimbablePrompt?.(null);
  }, [district]);

  const playFootstep = (variant: 'walk' | 'run') => {
    const ctx = audioCtxRef.current;
    const buffer = noiseBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = variant === 'run' ? 520 : 420;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = variant === 'run' ? 0.22 : 0.16;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  };

  const playJump = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 180;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.12);
  };

  const playPickup = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.12);
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.stop(ctx.currentTime + 0.16);
  };

  const playLand = () => {
    const ctx = audioCtxRef.current;
    const buffer = noiseBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    source.stop(ctx.currentTime + 0.2);

    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    const thudFilter = ctx.createBiquadFilter();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(120, ctx.currentTime);
    thudOsc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);
    thudFilter.type = 'lowpass';
    thudFilter.frequency.value = 180;
    thudGain.gain.value = 0.08;
    thudOsc.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start();
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    thudOsc.stop(ctx.currentTime + 0.16);
  };

  const playObjectImpact = (material: PushableObject['material'] | 'wall', intensity: number) => {
    // Use the new collision sounds system
    if (material === 'wall') {
      collisionSounds.play('wall', intensity);
    } else {
      collisionSounds.play(materialToSound(material as PushableMaterial), intensity);
    }
  };

  const playNpcBump = (intensity: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 160 + intensity * 90;
    gain.gain.value = 0.08 + intensity * 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.stop(ctx.currentTime + 0.09);
  };

  const applyJump = (charge = 0, launchBoost = 0, forwardBoost = 0) => {
    const boost = charge * 5 + launchBoost;
    velV.current = JUMP_FORCE + boost;
    if (forwardBoost > 0) {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current?.rotation.y ?? 0);
      velH.current.add(forward.multiplyScalar(forwardBoost));
    }
    isGrounded.current = false;
    jumpTimer.current = 0;
    jumpBuffer.current = 0;
    lastJumpChargeRef.current = charge;
    // Track height when jump started for fall damage calculation
    if (group.current) {
      fallStartHeight.current = group.current.position.y;
    }
    playJump();
  };

  useEffect(() => {
    if (!orbitRef.current || !group.current) return;

    // Detect camera mode change and start transition
    if (cameraMode !== prevCameraModeRef.current) {
      // Save current camera state for smooth transition
      transitionStartPosRef.current = camera.position.clone();
      transitionStartTargetRef.current = orbitRef.current.target.clone();
      modeTransitionProgressRef.current = 0;
      prevCameraModeRef.current = cameraMode;

      // Reset cinematic dolly zoom when entering third-person
      if (cameraMode === CameraMode.THIRD_PERSON) {
        thirdPersonDollyProgress.current = 0;
        thirdPersonStartDistance.current = null;
        thirdPersonSmoothDistance.current = null;
        thirdPersonSmoothPolar.current = null;
        thirdPersonStartAzimuth.current = null;
        thirdPersonSmoothAzimuth.current = null;
      }
    }

    if (cameraMode === CameraMode.OVERHEAD) {
      lastPlayerPos.current.copy(group.current.position);
      orbitRef.current.target.copy(group.current.position);
      orbitRef.current.update();
    }
  }, [cameraMode, camera]);

  useEffect(() => {
    if (!interiorEntryToken) {
      interiorPanTokenRef.current = null;
      return;
    }
    if (!interiorEntrySide) return;
    if (interiorPanTokenRef.current === interiorEntryToken) return;
    interiorPanTokenRef.current = interiorEntryToken;
    pendingInteriorPanRef.current = { side: interiorEntrySide, duration: 0.9 };
  }, [interiorEntrySide, interiorEntryToken]);

  useFrame((state, delta) => {
    if (!group.current) return;

    const getEntryAzimuth = (side: 'north' | 'south' | 'east' | 'west') => {
      if (side === 'north') return 0;
      if (side === 'south') return Math.PI;
      if (side === 'east') return Math.PI / 2;
      return -Math.PI / 2;
    };
    const shortestAngleDiff = (from: number, to: number) => {
      const diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
      return diff;
    };

    // Camera mode transition - advance transition progress
    if (modeTransitionProgressRef.current < 1) {
      modeTransitionProgressRef.current = Math.min(1, modeTransitionProgressRef.current + delta * 2.5); // ~0.4s transition
    }

    // 0. Dossier Mode Camera Animation
    if (dossierMode && orbitRef.current) {
      // Save original camera position on first frame of dossier mode
      if (!savedCameraPos.current) {
        savedCameraPos.current = camera.position.clone();
        savedCameraTarget.current = orbitRef.current.target.clone();
      }

      // Set camera view offset to center player in RIGHT half of screen
      // Modal takes up left 50%, so we want player centered at 75% position
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.setViewOffset(
          size.width,        // Full viewport width
          size.height,       // Full viewport height
          -size.width / 4,   // Shift left by 25% to move center point to 75% position
          0,                 // No vertical shift
          size.width,        // Render full width
          size.height        // Render full height
        );
      }

      // Calculate portrait camera position (in front of player at eye level)
      const playerPos = group.current.position;
      const portraitCameraPos = new THREE.Vector3(
        playerPos.x,
        playerPos.y + 1.6,  // Eye level
        playerPos.z + 2.5   // 2.5 units in front
      );
      const portraitTarget = new THREE.Vector3(
        playerPos.x,
        playerPos.y + 1.5,  // Look at face
        playerPos.z
      );

      // Smooth lerp to portrait position
      camera.position.lerp(portraitCameraPos, 0.08);
      orbitRef.current.target.lerp(portraitTarget, 0.08);
      orbitRef.current.update();
    } else {
      // Always clear camera view offset when NOT in dossier mode
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.clearViewOffset();
      }

      // Lerp back to original position when modal closes
      if (savedCameraPos.current && orbitRef.current) {
        camera.position.lerp(savedCameraPos.current, 0.08);
        orbitRef.current.target.lerp(savedCameraTarget.current!, 0.08);
        orbitRef.current.update();

        // Clear saved position when close enough
        if (camera.position.distanceTo(savedCameraPos.current) < 0.1) {
          savedCameraPos.current = null;
          savedCameraTarget.current = null;
        }
      }
    }

    // Skip all movement and interaction logic when in dossier mode
    if (dossierMode) return;

    // === CLIMBING SYSTEM ===

    // Skip climbing in first-person mode (W/S control camera pitch there)
    if (cameraMode !== CameraMode.FIRST_PERSON) {

      const playerPos = {
        x: group.current.position.x,
        y: group.current.position.y,
        z: group.current.position.z
      };
      const playerFacing = group.current.rotation.y;

      // Helper to sample terrain height
      const getTerrainHeight = (x: number, z: number) =>
        sampleTerrainHeight(heightmap, x, z);

      // Check if player is on a rooftop (for descent detection)
      const roofHeight = district ? getRoofHeightAt(
        { x: playerPos.x, z: playerPos.z },
        buildings,
        district
      ) : null;
      const isOnRoof = roofHeight !== null && Math.abs(playerPos.y - roofHeight) < 0.5;

      // Detect nearby climbable when not climbing
      if (!climbingStateRef.current.isClimbing) {
        // Check from ground OR from rooftop (for descent) - use spatial hash for O(1) lookup
        const nearbyFromGround = findNearbyClimbableFast(playerPos, playerFacing, climbableSpatialHash, CLIMBING_CONSTANTS.CLIMB_DETECTION_RADIUS, false);
        const nearbyFromRoof = isOnRoof ? findNearbyClimbableFast(playerPos, playerFacing, climbableSpatialHash, CLIMBING_CONSTANTS.CLIMB_DETECTION_RADIUS, true) : null;
        const nearby = nearbyFromGround || nearbyFromRoof;
        nearbyClimbableRef.current = nearby;

        // Check for nearby climbable pushable objects (crates, benches, etc.)
        let nearbyPushable: PushableObject | null = null;
        if (pushablesRef?.current && isGrounded.current && !standingOnPushableRef.current) {
          const PUSHABLE_CLIMB_RANGE = 1.8;
          let bestDist = Infinity;
          // Convert player rotation to facing vector
          const facingVec = new THREE.Vector3(Math.sin(playerFacing), 0, Math.cos(playerFacing));
          for (const item of pushablesRef.current) {
            if (!isClimbablePushable(item.kind)) continue;
            const dx = item.position.x - playerPos.x;
            const dz = item.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < PUSHABLE_CLIMB_RANGE && dist < bestDist) {
              // Check if facing the object (within ~90 degree cone)
              const toObject = new THREE.Vector3(dx, 0, dz).normalize();
              const dot = facingVec.dot(toObject);
              if (dot > 0.3) {
                bestDist = dist;
                nearbyPushable = item;
              }
            }
          }
        }
        nearbyClimbablePushableRef.current = nearbyPushable;

        // Update climbable prompt (ladders/stairs take priority over pushables)
        if (nearby && onClimbablePrompt) {
          if (nearbyFromRoof) {
            onClimbablePrompt('Press C to descend');
          } else {
            onClimbablePrompt('Press C to climb');
          }
        } else if (nearbyPushable && onClimbablePrompt) {
          onClimbablePrompt('Press C to climb onto');
        } else if (!nearby && !nearbyPushable && onClimbablePrompt) {
          onClimbablePrompt(null);
        }

        // Check for climb initiation (press C near a climbable, or mobile/touch trigger)
        const cJustPressed = keys.c && !lastCRef.current;
        const mobileTrigger = climbTriggerRef?.current === true;
        if (mobileTrigger && climbTriggerRef) {
          climbTriggerRef.current = false; // Reset immediately
        }
        const wantsClimb = cJustPressed || mobileTrigger;
        const wantsClimbUp = wantsClimb && nearbyFromGround && isGrounded.current;
        const wantsClimbDown = wantsClimb && nearbyFromRoof && isOnRoof;
        const wantsClimbPushable = wantsClimb && nearbyPushable && isGrounded.current && !nearby;

        if (wantsClimbUp && nearbyFromGround) {
          // Start climbing from bottom
          climbingStateRef.current = initiateClimbing(climbingStateRef.current, nearbyFromGround);
          activeClimbableRef.current = nearbyFromGround;
          setIsClimbing(true);
          climbAnimationPhaseRef.current = 0; // Reset animation phase
          onClimbingStateChange?.(true); // Notify UI of climbing state
          velV.current = 0;
          // IMPORTANT: Mark C as already processed so the cancel check doesn't trigger on same frame
          lastCRef.current = true;
        } else if (wantsClimbDown && nearbyFromRoof) {
          // Start climbing from top (descending)
          climbingStateRef.current = initiateClimbing(climbingStateRef.current, nearbyFromRoof, true);
          activeClimbableRef.current = nearbyFromRoof;
          setIsClimbing(true);
          climbAnimationPhaseRef.current = 0;
          onClimbingStateChange?.(true); // Notify UI of climbing state
          velV.current = 0;
          // IMPORTANT: Mark C as already processed so the cancel check doesn't trigger on same frame
          lastCRef.current = true;
        } else if (wantsClimbPushable && nearbyPushable) {
          // Step up onto the pushable object (crate, bench, etc.)
          const targetHeight = getPushableClimbHeight(nearbyPushable);
          // Move player to center of object at the top
          group.current.position.set(
            nearbyPushable.position.x,
            targetHeight,
            nearbyPushable.position.z
          );
          standingOnPushableRef.current = nearbyPushable;
          velV.current = 0;
          isGrounded.current = true;
          lastCRef.current = true;
        }
      }

      // Handle climbing movement
      if (climbingStateRef.current.isClimbing && activeClimbableRef.current) {
        const climbable = activeClimbableRef.current;

        // Edge-detect space press for jump (don't use held state)
        const spaceJustPressed = keys.space && !lastSpace.current;

        // Edge-detect C press for cancel (step off gracefully)
        const cJustPressed = keys.c && !lastCRef.current;

        // Check for mobile UI input (held state - UI manages setting/clearing via pointer events)
        const mobileUp = climbInputRef?.current === 'up';
        const mobileDown = climbInputRef?.current === 'down';
        const mobileCancel = climbInputRef?.current === 'cancel';

        // Build climbing input (keyboard OR mobile)
        const climbInput = {
          up: keys.up || keys.w || mobileUp,
          down: keys.down || keys.s || mobileDown,
          jump: spaceJustPressed
        };

        // Update climbing state
        const result = updateClimbing(climbingStateRef.current, climbable, climbInput, delta);
        climbingStateRef.current = result.newState;

        // Apply position and rotation from result
        group.current.position.copy(result.playerPosition);
        group.current.rotation.y = result.playerRotation;

        // Update animation phase for hand-over-hand motion
        if (climbInput.up || climbInput.down) {
          climbAnimationPhaseRef.current = (climbAnimationPhaseRef.current + delta * climbable.climbSpeed * 2) % 1;
        }

        // Check for dismount conditions
        if (result.shouldDismountTop) {
          const roofPos = calculateRoofEntryPosition(climbable);
          group.current.position.set(roofPos.x, roofPos.y, roofPos.z);
          climbingStateRef.current = stopClimbing(climbingStateRef.current);
          activeClimbableRef.current = null;
          setIsClimbing(false);
          isGrounded.current = true;
          onClimbingStateChange?.(false);
        }

        if (result.shouldDismountBottom) {
          const groundPos = calculateGroundExitPosition(climbable, getTerrainHeight);
          group.current.position.set(groundPos.x, groundPos.y, groundPos.z);
          climbingStateRef.current = stopClimbing(climbingStateRef.current);
          activeClimbableRef.current = null;
          setIsClimbing(false);
          isGrounded.current = true;
          onClimbingStateChange?.(false);
        }

        if (result.shouldDismountJump && result.jumpVelocity) {
          climbingStateRef.current = stopClimbing(climbingStateRef.current);
          activeClimbableRef.current = null;
          setIsClimbing(false);
          velV.current = result.jumpVelocity.y;
          velH.current.set(result.jumpVelocity.x, 0, result.jumpVelocity.z); // Apply horizontal velocity
          isGrounded.current = false;
          onClimbingStateChange?.(false);
        }

        // Handle C key or mobile cancel - step off gracefully at current position
        if ((cJustPressed || mobileCancel) && !result.shouldDismountTop && !result.shouldDismountBottom && !result.shouldDismountJump) {
          // Step off in direction away from building (same as ground exit)
          const stepDistance = CLIMBING_CONSTANTS.CANCEL_STEP;
          const currentPos = group.current.position.clone();
          switch (climbable.wallSide) {
            case 0: currentPos.z += stepDistance; break; // Step north (away from building)
            case 1: currentPos.x += stepDistance; break; // Step east (away from building)
            case 2: currentPos.z -= stepDistance; break; // Step south (away from building)
            case 3: currentPos.x -= stepDistance; break; // Step west (away from building)
          }
          group.current.position.copy(currentPos);
          climbingStateRef.current = stopClimbing(climbingStateRef.current);
          activeClimbableRef.current = null;
          setIsClimbing(false);
          velV.current = 0;
          isGrounded.current = false; // Will fall if mid-climb
          onClimbingStateChange?.(false);
        }

        // Update key states for edge detection (must happen before return)
        lastCRef.current = keys.c;
        lastSpace.current = keys.space;

        // Skip normal movement when climbing
        return;
      }
    }
    // === END CLIMBING SYSTEM ===

    // 1. Camera Adjustment Logic
    if (cameraMode === CameraMode.FIRST_PERSON) {
      if (observeMode) {
        const PAN_SPEED = (Math.PI * 2) / 180; // 360 deg over ~180s
        fpYaw.current += delta * PAN_SPEED;
        fpPitch.current = THREE.MathUtils.lerp(fpPitch.current, 0.05, 0.08);
      } else {
        // WASD controls camera look
        fpYaw.current += (keys.a ? CAMERA_SENSITIVITY * delta : 0);
        fpYaw.current -= (keys.d ? CAMERA_SENSITIVITY * delta : 0);
        fpPitch.current += (keys.w ? CAMERA_SENSITIVITY * delta : 0);
        fpPitch.current -= (keys.s ? CAMERA_SENSITIVITY * delta : 0);
        // Mouse drag also controls camera look
        const MOUSE_SENSITIVITY = 0.003;
        fpYaw.current -= mouseDeltaRef.current.x * MOUSE_SENSITIVITY;
        fpPitch.current -= mouseDeltaRef.current.y * MOUSE_SENSITIVITY;
        fpPitch.current = THREE.MathUtils.clamp(fpPitch.current, -1.2, 1.2);
        // Clear mouse delta after applying
        mouseDeltaRef.current.x = 0;
        mouseDeltaRef.current.y = 0;
      }
    } else if (cameraMode === CameraMode.OVERHEAD && orbitRef.current) {
      const angle = OVERHEAD_ROTATE_SPEED * delta;
      if (keys.a) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() + angle);
      if (keys.d) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - angle);

      if (keys.w || keys.s) {
        const target = orbitRef.current.target.clone();
        const offset = camera.position.clone().sub(target);
        const distance = offset.length();
        const zoomFactor = 1 + (keys.s ? OVERHEAD_ZOOM_SPEED : -OVERHEAD_ZOOM_SPEED) * delta;
        const clamped = THREE.MathUtils.clamp(
          distance * zoomFactor,
          orbitRef.current.minDistance,
          orbitRef.current.maxDistance
        );
        offset.normalize().multiplyScalar(clamped);
        camera.position.copy(target.clone().add(offset));
      }
    } else if (orbitRef.current) {
      const angle = CAMERA_SENSITIVITY * delta;
      if (keys.a) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() + angle);
      if (keys.d) orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - angle);
      if (keys.w) orbitRef.current.setPolarAngle(Math.max(0.1, orbitRef.current.getPolarAngle() - angle));
      if (keys.s) orbitRef.current.setPolarAngle(Math.min(Math.PI / 2.1, orbitRef.current.getPolarAngle() + angle));
    }

    // BUGFIX: Use bilinear interpolation for accurate terrain sampling
    let groundHeight = sampleTerrainHeight(heightmap, group.current.position.x, group.current.position.z);

    // PHYSICS: Check for climbable object platforms (crates, benches, boulders, etc.)
    if (pushablesRef?.current) {
      const PLATFORM_RADIUS = 0.6; // Radius for standing on objects

      let currentStandingOn: PushableObject | null = null;
      for (const item of pushablesRef.current) {
        if (!item || !item.position || !isClimbablePushable(item.kind)) continue;

        // Check horizontal distance to object
        const dx = group.current.position.x - item.position.x;
        const dz = group.current.position.z - item.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < PLATFORM_RADIUS * PLATFORM_RADIUS) {
          // Player is above this object - use object top as ground
          const objectTop = getPushableClimbHeight(item);
          if (objectTop > groundHeight) {
            groundHeight = objectTop;
            currentStandingOn = item;
          }
        }
      }
      // Track what we're standing on (for walking off detection)
      standingOnPushableRef.current = currentStandingOn;
    }

    // ROOFTOP COLLISION: Check if player is on a building roof
    if (district) {
      const roofHeight = getRoofHeightAt(
        { x: group.current.position.x, z: group.current.position.z },
        buildings,
        district
      );
      if (roofHeight !== null) {
        // Player is within building bounds - check if they're at roof level
        const currentY = group.current.position.y;
        // Use roof as ground if player is at or above roof level (1.0 unit tolerance for reliable detection)
        if (currentY >= roofHeight - 1.0) {
          groundHeight = Math.max(groundHeight, roofHeight);
        }
      }
    }

    // ROOFTOP EDGE FALLING: If grounded but significantly above calculated ground, player walked off edge
    const EDGE_FALL_THRESHOLD = 0.8; // Must be this much above ground to trigger fall
    if (isGrounded.current && group.current.position.y > groundHeight + EDGE_FALL_THRESHOLD) {
      // Player has walked off an edge (roof, crate, etc) - start falling
      isGrounded.current = false;
      velV.current = 0; // Start with zero vertical velocity (natural fall)
      coyoteTimer.current = 0; // Allow brief coyote time for recovery jump
      jumpBuffer.current = Math.max(jumpBuffer.current, 0.18);
      if (keys.space) {
        // Edge jump assist: allow a jump if space is held at the moment of stepping off
        const edgeCharge = chargingRef.current ? Math.min(1, jumpChargeRef.current + 0.2) : 0.35;
        const roofLaunchBoost = 6.5;
        const roofForwardBoost = 9.5;
        chargingRef.current = false;
        applyJump(edgeCharge, roofLaunchBoost, roofForwardBoost);
      }
      // Track height when edge fall started for fall damage calculation
      fallStartHeight.current = group.current.position.y;
    }

    // Update C key state for climbing edge detection
    lastCRef.current = keys.c;

    // 2. Jumping Physics + buffers
    const spacePressed = keys.space && !lastSpace.current;
    const spaceReleased = !keys.space && lastSpace.current;
    lastSpace.current = keys.space;
    if (spacePressed) {
      // PERFORMANCE: Reduced unstuck timer from 0.6s to 0.3s for more responsive recovery
      if (stuckTimerRef.current > 0.3) {
        const base = group.current.position.clone();
        const offsets = [0.8, 1.4, 2.0, 2.6];
        let moved = false;
        for (const r of offsets) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const candidate = new THREE.Vector3(base.x + Math.cos(angle) * r, 0, base.z + Math.sin(angle) * r);
            if (!isBlockedByBuildings(candidate, buildings, 0.6, buildingHash || undefined) && !isBlockedByObstacles(candidate, obstacles, 0.6, obstacleHash || undefined)) {
              // BUGFIX: Use bilinear interpolation for accurate terrain sampling
              const candidateHeight = sampleTerrainHeight(heightmap, candidate.x, candidate.z);
              candidate.y = candidateHeight;
              group.current.position.copy(candidate);
              lastMovePosRef.current.copy(candidate);
              stuckTimerRef.current = 0;
              onImpactPuff?.(candidate, 0.25);
              moved = true;
              break;
            }
          }
          if (moved) break;
        }
      }
      jumpBuffer.current = 0.12;
      if (isGrounded.current) {
        chargingRef.current = true;
        jumpChargeRef.current = 0;
        jumpAnticipationRef.current = 1;
      }
    }

    if (isGrounded.current) {
      coyoteTimer.current = 0;
    } else {
      coyoteTimer.current += delta;
    }
    if (jumpBuffer.current > 0) {
      jumpBuffer.current -= delta;
    }

    if (chargingRef.current && keys.space && isGrounded.current) {
      jumpChargeRef.current = Math.min(1, jumpChargeRef.current + delta * 0.9);
      jumpAnticipationRef.current = Math.min(1, jumpAnticipationRef.current + delta * 2);
    }
    if (spaceReleased && chargingRef.current && isGrounded.current) {
      applyJump(jumpChargeRef.current);
      jumpAnticipationRef.current = 0;
      if (jumpChargeRef.current > 0.35) {
        onImpactPuff?.(group.current.position, 0.25 + jumpChargeRef.current * 0.25);
      }
      chargingRef.current = false;
    }

    const canJump = !chargingRef.current && (isGrounded.current || coyoteTimer.current < 0.4) && jumpBuffer.current > 0;
    if (canJump) {
      applyJump(sprintCharge.current);
    }

    if (!isGrounded.current) {
      velV.current += GRAVITY * delta;
      group.current.position.y += velV.current * delta;

      // Apply horizontal velocity (from jump dismount) with air friction
      if (velH.current.lengthSq() > 0.001) {
        const nextX = group.current.position.x + velH.current.x * delta;
        const nextZ = group.current.position.z + velH.current.z * delta;
        // Check collision before applying
        const nextPos = new THREE.Vector3(nextX, group.current.position.y, nextZ);
        if (!isBlockedByBuildings(nextPos, buildings, 0.4, buildingHash || undefined)) {
          group.current.position.x = nextX;
          group.current.position.z = nextZ;
        } else {
          velH.current.set(0, 0, 0); // Stop on collision
        }
        // Air friction decay
        velH.current.multiplyScalar(0.95);
      }

      if (group.current.position.y <= groundHeight) {
        group.current.position.y = groundHeight;
        velV.current = 0;
        velH.current.set(0, 0, 0); // Clear horizontal velocity on land
        isGrounded.current = true;
        landingDamp.current = 0.2;
        chargingRef.current = false;
        landingImpulseRef.current = 1;

        // FALL DAMAGE: Calculate damage based on fall height
        if (fallStartHeight.current !== null) {
          const fallHeight = fallStartHeight.current - groundHeight;
          console.log(`[FALL] Start: ${fallStartHeight.current.toFixed(2)}, Ground: ${groundHeight.toFixed(2)}, Fall: ${fallHeight.toFixed(2)}, Callback: ${!!onFallDamage}`);

          // Only apply damage for significant falls (more than ~1 story / 3 units)
          const DAMAGE_THRESHOLD = 3.0; // Minimum fall height to take damage
          const FATAL_THRESHOLD = 6.0;  // 2+ stories = fatal fall

          if (fallHeight > DAMAGE_THRESHOLD && onFallDamage) {
            const isFatal = fallHeight >= FATAL_THRESHOLD;
            console.log(`[FALL DAMAGE] Height: ${fallHeight.toFixed(2)}, Fatal: ${isFatal}`);
            onFallDamage(fallHeight, isFatal);
          }
        }
        fallStartHeight.current = null; // Reset fall tracking
      }
    }
    if (isGrounded.current && !lastGroundedRef.current) {
      playLand();
      onImpactPuff?.(group.current.position, 0.7);
    }
    lastGroundedRef.current = isGrounded.current;
    if (landingDamp.current > 0) {
      landingDamp.current = Math.max(0, landingDamp.current - delta);
    }
    if (jumpAnticipationRef.current > 0 && (!chargingRef.current || !isGrounded.current)) {
      jumpAnticipationRef.current = Math.max(0, jumpAnticipationRef.current - delta * 3);
    }
    if (landingImpulseRef.current > 0) {
      landingImpulseRef.current = Math.max(0, landingImpulseRef.current - delta * 3);
    }
    if (!isGrounded.current) {
      jumpTimer.current += delta;
    }
    isJumpingRef.current = !isGrounded.current;
    jumpPhaseRef.current = Math.min(1, jumpTimer.current / 0.6);

    // 2b. Pushable object drift/friction
    if (pushablesRef?.current) {
      const now = state.clock.elapsedTime;
      const items = pushablesRef.current;
      for (const item of items) {
        if (item.kind === 'droppedItem') {
          const groundHeight = heightmap
            ? sampleTerrainHeight(heightmap, item.position.x, item.position.z)
            : 0;
          if (item.position.y > groundHeight + 0.02 || item.velocity.y > 0) {
            const gravity = -18;
            item.velocity.y += gravity * delta;
          }
        }
        if (item.velocity.lengthSq() < 0.00001) continue;
        const speed = item.velocity.length();
        const next = item.position.clone().add(item.velocity.clone().multiplyScalar(delta));
        const blocked = isBlockedByBuildings(next, buildings, item.radius, buildingHash || undefined)
          || isBlockedByObstacles(next, obstacles, item.radius, obstacleHash || undefined);
        if (!blocked) {
          item.position.copy(next);
        } else {
          item.velocity.multiplyScalar(-0.2);
          const last = objectImpactCooldownRef.current.get(item.id) || 0;
          if (now - last > 0.18 && speed > 0.45) {
            const intensity = Math.min(1, speed / 3);
            playObjectImpact(item.material, intensity);
            if (intensity > 0.4) {
              onImpactPuff?.(item.position, intensity);
            }

            // PHYSICS: Shatter breakable objects on hard wall impact
            if (!item.isShattered && canBreak(item.kind, item.material)) {
              // Shatter threshold: medium speed or higher (0.7+)
              // Power move with full charge can easily exceed this
              const shatterThreshold = 0.65;
              if (intensity > shatterThreshold) {
                item.isShattered = true;
                item.shatterTime = now;
                // Extra impact puff for dramatic shatter
                onImpactPuff?.(item.position, 1.0);
                // Play appropriate shatter sound
                if (item.material === 'wood') {
                  collisionSounds.playWoodShatter(intensity);
                } else {
                  collisionSounds.playShatter(intensity);
                }
                // Generate loot from shattered object
                const loot = generateShatterLoot(item.position, getAllItems);
                if (loot.length > 0 && onShatterLoot) {
                  onShatterLoot(loot, item.kind);
                }
              }
            }

            objectImpactCooldownRef.current.set(item.id, now);
          }
        }
        if (item.kind === 'droppedItem') {
          const groundHeight = heightmap
            ? sampleTerrainHeight(heightmap, item.position.x, item.position.z)
            : 0;
          if (item.position.y <= groundHeight + 0.02) {
            const impactSpeed = Math.abs(item.velocity.y);
            item.position.y = groundHeight + 0.02;
            const materialBounce = item.material === 'metal'
              ? 0.7
              : item.material === 'ceramic'
                ? 0.5
                : item.material === 'wood'
                  ? 0.4
                  : 0.28;
            const weightFactor = Math.max(0.45, 1 - item.mass * 0.08);
            const restitution = Math.max(0.18, materialBounce * weightFactor);
            if (impactSpeed > 0.35) {
              const intensity = Math.min(1, impactSpeed / 6);
              playObjectImpact(item.material, intensity);
              onImpactPuff?.(item.position, intensity * 0.5);
            }
            item.velocity.y = impactSpeed * restitution;
            if (impactSpeed < 0.12) {
              item.velocity.y = 0;
            }
          }
        }
        const friction = item.kind === 'droppedItem'
          ? 0.6 + item.mass * 0.15
          : 3.0 + item.mass * 0.4;
        item.velocity.multiplyScalar(Math.max(0, 1 - friction * delta));
        if (item.velocity.lengthSq() < 0.00002) {
          item.velocity.set(0, 0, 0);
        }
      }

      // Object-object collision resolve (cheap, small counts)
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          const offset = a.position.clone().sub(b.position);
          offset.y = 0;
          const distSq = offset.lengthSq();
          const limit = a.radius + b.radius;
          if (distSq > 0.0001 && distSq < limit * limit) {
            const dist = Math.sqrt(distSq);
            const normal = offset.multiplyScalar(1 / dist);
            const overlap = limit - dist;
            a.position.add(normal.clone().multiplyScalar(overlap * 0.5));
            b.position.add(normal.clone().multiplyScalar(-overlap * 0.5));
            const relVel = a.velocity.clone().sub(b.velocity);
            const relAlong = relVel.dot(normal);
            if (relAlong < 0) {
              const restitution = 0.2;
              const impulse = (-(1 + restitution) * relAlong) / (1 / a.mass + 1 / b.mass);
              const impulseVec = normal.clone().multiplyScalar(impulse);
              a.velocity.add(impulseVec.clone().multiplyScalar(1 / a.mass));
              b.velocity.sub(impulseVec.clone().multiplyScalar(1 / b.mass));
              const intensity = Math.min(1, Math.abs(relAlong) * 0.6);
              if (intensity > 0.35) {
                const lastA = objectImpactCooldownRef.current.get(a.id) || 0;
                const lastB = objectImpactCooldownRef.current.get(b.id) || 0;
                if (now - Math.max(lastA, lastB) > 0.2) {
                  playObjectImpact(a.material, intensity);
                  onImpactPuff?.(a.position, intensity);
                  objectImpactCooldownRef.current.set(a.id, now);
                  objectImpactCooldownRef.current.set(b.id, now);
                }
              }
            }
          }
        }
      }
    }

    // 2c. Dropped item slope drift (lightweight)
    if (pushablesRef?.current && heightmap) {
      const SLOPE_FORCE = 1.8;
      const MIN_SLOPE = 0.05;
      const MAX_SPEED = 2.0;
      for (const item of pushablesRef.current) {
        if (item.kind !== 'droppedItem') continue;
        const terrainY = sampleTerrainHeight(heightmap, item.position.x, item.position.z);
        const grounded = item.position.y <= terrainY + 0.03 && Math.abs(item.velocity.y) < 0.05;
        if (!grounded) continue;
        item.position.y = terrainY + 0.03;
        const gradient = calculateTerrainGradient(heightmap, item.position.x, item.position.z);
        if (gradient.slopeAngle > MIN_SLOPE) {
          const slopeForce = gradient.slope.clone()
            .normalize()
            .multiplyScalar(SLOPE_FORCE * Math.sin(gradient.slopeAngle) * delta);
          item.velocity.add(slopeForce);
        }
        const speed = item.velocity.length();
        if (speed > MAX_SPEED) {
          item.velocity.normalize().multiplyScalar(MAX_SPEED);
        }
      }
    }

    // 2c. Boulder slope gravity
    if (pushablesRef?.current && heightmap) {
      const now = state.clock.elapsedTime;
      const SLOPE_GRAVITY_FORCE = 4.0; // Acceleration down slopes
      const MIN_ROLL_ANGLE = 0.08; // ~4.5 degrees minimum to start rolling
      const TERMINAL_VELOCITY = 12.0; // Max speed on steep slopes
      const ROTATION_DAMPING = 0.95; // Angular velocity decay

      for (const item of pushablesRef.current) {
        if (item.kind !== 'boulder') continue;

        // Position boulder on terrain surface
        const terrainY = sampleTerrainHeight(heightmap, item.position.x, item.position.z);
        item.position.y = terrainY + item.radius * 0.7;

        // Throttle gradient calculations (every 0.1s per boulder)
        const lastCheck = item.lastSlopeCheck || 0;
        if (now - lastCheck < 0.1) continue;
        item.lastSlopeCheck = now;

        const gradient = calculateTerrainGradient(heightmap, item.position.x, item.position.z);

        // Wake boulder if on significant slope
        if (gradient.slopeAngle > MIN_ROLL_ANGLE) {
          item.isSleeping = false;
        }

        // Skip sleeping boulders (stationary on flat ground)
        if (item.isSleeping) continue;

        // Apply downhill gravity force
        if (gradient.slopeAngle > MIN_ROLL_ANGLE) {
          const gravityForce = gradient.slope.clone()
            .normalize()
            .multiplyScalar(SLOPE_GRAVITY_FORCE * Math.sin(gradient.slopeAngle) * delta);

          item.velocity.add(gravityForce);

          // Clamp to terminal velocity
          const speed = item.velocity.length();
          if (speed > TERMINAL_VELOCITY) {
            item.velocity.normalize().multiplyScalar(TERMINAL_VELOCITY);
          }
        }

        // Put boulder to sleep if stopped on flat ground
        if (item.velocity.lengthSq() < 0.0001 && gradient.slopeAngle < MIN_ROLL_ANGLE) {
          item.isSleeping = true;
          item.velocity.set(0, 0, 0);
          if (item.angularVelocity) item.angularVelocity.set(0, 0, 0);
        }

        // Calculate rolling rotation (perpendicular to velocity)
        if (item.velocity.lengthSq() > 0.001) {
          if (!item.angularVelocity) item.angularVelocity = new THREE.Vector3();

          // Angular velocity = linear velocity / radius (v = ωr)
          const angularSpeed = item.velocity.length() / item.radius;
          const axis = new THREE.Vector3(-item.velocity.z, 0, item.velocity.x).normalize();
          item.angularVelocity.copy(axis.multiplyScalar(angularSpeed));
        }

        // Apply angular damping
        if (item.angularVelocity) {
          item.angularVelocity.multiplyScalar(ROTATION_DAMPING);
        }
      }
    }

    // 2d. Boulder-tree collision
    if (pushablesRef?.current && obstacles.length > 0) {
      const temps = boulderTempsRef.current;
      for (const boulder of pushablesRef.current) {
        if (boulder.kind !== 'boulder') continue;
        if (boulder.velocity.lengthSq() < 0.01) continue; // Skip slow boulders

        // Check collision with all obstacles (trees, etc.)
        for (const obstacle of obstacles) {
          const dx = boulder.position.x - obstacle.position[0];
          const dz = boulder.position.z - obstacle.position[2];
          const distSq = dx * dx + dz * dz;
          const limit = boulder.radius + obstacle.radius;

          if (distSq < limit * limit && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const normal = temps.normal.set(dx, 0, dz).normalize();

            // Push boulder out of tree
            const overlap = limit - dist;
            boulder.position.add(temps.displacement.copy(normal).multiplyScalar(overlap + 0.05));

            // Bounce with momentum loss
            const TREE_RESTITUTION = 0.3; // Lose 70% energy on tree impact
            const velocityAlongNormal = boulder.velocity.dot(normal);

            if (velocityAlongNormal < 0) {
              // Reflect velocity and apply energy loss
              boulder.velocity.add(temps.impulse.copy(normal).multiplyScalar(-velocityAlongNormal * (1 + TREE_RESTITUTION)));

              // Impact sound/effect
              const intensity = Math.min(1, Math.abs(velocityAlongNormal) * 0.4);
              if (intensity > 0.3) {
                const last = objectImpactCooldownRef.current.get(boulder.id) || 0;
                const now = state.clock.elapsedTime;
                if (now - last > 0.18) {
                  playObjectImpact('stone', intensity);
                  onImpactPuff?.(boulder.position, intensity);
                  objectImpactCooldownRef.current.set(boulder.id, now);
                }
              }

              // Apply angular impulse from off-center impacts
              if (boulder.angularVelocity) {
                boulder.angularVelocity.add(
                  temps.angularImpulse.set(
                    normal.z * velocityAlongNormal,
                    0,
                    -normal.x * velocityAlongNormal
                  ).multiplyScalar(0.5)
                );
              }
            }
          }
        }
      }
    }

    // 2e. Boulder-NPC collision
    if (pushablesRef?.current && agentHashRef?.current) {
      const NPC_RADIUS = 0.5;
      const BOULDER_NPC_KNOCKBACK_SCALE = 2.5; // Stronger than player shove

      for (const boulder of pushablesRef.current) {
        if (boulder.kind !== 'boulder') continue;
        const speed = boulder.velocity.length();
        if (speed < 0.5) continue; // Only moving boulders affect NPCs

        // Query nearby NPCs using spatial hash
        const nearbyAgents = queryNearbyAgents(boulder.position, agentHashRef.current);

        for (const agent of nearbyAgents) {
          const offset = agent.pos.clone().sub(boulder.position);
          offset.y = 0;
          const distSq = offset.lengthSq();
          const limit = boulder.radius + NPC_RADIUS;

          if (distSq < limit * limit && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const normal = offset.normalize();

            // Calculate knockback force based on boulder momentum
            const momentum = speed * boulder.mass;
            const knockbackForce = momentum * BOULDER_NPC_KNOCKBACK_SCALE;

            // Apply impulse to NPC via impact map
            if (onAgentImpact) {
              const intensity = Math.min(1, knockbackForce * 0.1);
              onAgentImpact(agent.id, intensity);
            }

            // Boulder loses some momentum (conservation of momentum)
            const boulderMassRatio = boulder.mass / (boulder.mass + 5.0); // Assume NPC mass ~5
            boulder.velocity.multiplyScalar(boulderMassRatio * 0.8);

            // Visual/audio feedback
            const intensity = Math.min(1, speed * 0.3);
            const last = objectImpactCooldownRef.current.get(boulder.id) || 0;
            const now = state.clock.elapsedTime;
            if (now - last > 0.2) {
              playObjectImpact('stone', intensity);
              onImpactPuff?.(agent.pos, intensity * 1.2);
              objectImpactCooldownRef.current.set(boulder.id, now);
            }
          }
        }
      }
    }

    // 3. Movement Logic (Arrow Keys)
    let moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3();
    if (cameraMode === CameraMode.FIRST_PERSON) {
      camera.getWorldDirection(forward);
    } else {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    // Arrow keys always control movement
    if (keys.up) moveVec.add(forward);
    if (keys.down) moveVec.sub(forward);
    if (keys.right) moveVec.add(right);
    if (keys.left) moveVec.sub(right);
    // In first-person mode: WASD controls camera look, arrow keys control movement

    const moving = moveVec.lengthSq() > 0.01;
    const now = performance.now() * 0.001;

    // ANIMATION: Track movement start/stop for inertia
    if (walkingRef.current !== moving) {
      if (moving) {
        movementStartTimeRef.current = now;
      } else {
        movementStopTimeRef.current = now;
      }
      wasWalkingRef.current = walkingRef.current;
      walkingRef.current = moving;
      setIsWalking(moving);
    }

    const sprinting = moving && keys.shift;

    // ANIMATION: Track sprint transition for walk-to-run blending
    if (sprintingRef.current !== sprinting) {
      wasSprintingRef.current = sprintingRef.current;
      sprintingRef.current = sprinting;
      setIsSprinting(sprinting);
      if (sprintStateRef) {
        sprintStateRef.current = sprinting;
      }
    }
    // Smoothly transition sprint blend (0 = walk, 1 = sprint)
    const sprintTarget = sprinting ? 1 : 0;
    sprintTransitionRef.current = THREE.MathUtils.lerp(sprintTransitionRef.current, sprintTarget, 0.15);
    if (moving && keys.shift) {
      interactChargingRef.current = false;
      interactChargeRef.current = 0;
      onPushCharge?.(0);
    } else if (keys.shift && !moving) {
      interactChargeRef.current = Math.min(1.2, interactChargeRef.current + delta * 1.6);
      onPushCharge?.(Math.min(1, interactChargeRef.current));
    } else if (!keys.shift && interactChargeRef.current > 0) {
      onPushCharge?.(0);
    }

    // Check for external push trigger (from action button)
    if (pushTriggerRef?.current !== null && pushTriggerRef?.current !== undefined) {
      const strength = pushTriggerRef.current;
      if (strength > 0.12) {
        interactSwingRef.current = strength;
        interactTriggerRef.current = strength;
      }
      pushTriggerRef.current = null; // Reset after triggering
    }

    // Check for mobile/touch pickup trigger
    if (pickupTriggerRef?.current) {
      // Trigger a quick pickup action (equivalent to a brief shift press)
      interactTriggerRef.current = 1.0;
      pickupTriggerRef.current = false; // Reset after triggering
    }

    let currentSpeed = 0;
    if (moving) {
      moveVec.normalize();
      const airControl = isGrounded.current ? 1 : 0.6;
      const damp = landingDamp.current > 0 ? 0.7 : 1.0;
      currentSpeed = (keys.shift ? RUN_SPEED : PLAYER_SPEED) * airControl * damp;
      const moveDelta = moveVec.multiplyScalar(currentSpeed * delta);
      const nextX = group.current.position.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
      const blockedX = isBlockedByBuildings(nextX, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextX, obstacles, 0.6, obstacleHash || undefined);
      if (!blockedX) {
        group.current.position.x = nextX.x;
      } else if (Math.abs(moveDelta.x) > 0.02) {
        // Play wall collision sound when running into a wall
        const intensity = Math.min(1, currentSpeed / RUN_SPEED);
        playObjectImpact('wall', intensity * 0.6);
      }
      const nextZ = group.current.position.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
      const blockedZ = isBlockedByBuildings(nextZ, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextZ, obstacles, 0.6, obstacleHash || undefined);
      if (!blockedZ) {
        group.current.position.z = nextZ.z;
      } else if (Math.abs(moveDelta.z) > 0.02) {
        // Play wall collision sound when running into a wall
        const intensity = Math.min(1, currentSpeed / RUN_SPEED);
        playObjectImpact('wall', intensity * 0.6);
      }

      if (cameraMode !== CameraMode.FIRST_PERSON) {
        const targetRot = Math.atan2(moveVec.x, moveVec.z);
        // OVER_SHOULDER: Fast rotation so character always faces movement direction
        // THIRD_PERSON: Slower rotation for more controllable orbiting
        // Use higher speed when direction change is large (> 90°) for snappy turning
        const currentRot = group.current.rotation.y;
        let angleDiff = Math.abs(targetRot - currentRot);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        const isSharpTurn = angleDiff > Math.PI / 2;
        const baseSpeed = cameraMode === CameraMode.OVER_SHOULDER ? 0.35 : 0.1;
        const rotSpeed = isSharpTurn ? Math.min(0.6, baseSpeed * 2) : baseSpeed;

        // ANIMATION: Track angular velocity for pivot detection
        const prevRot = lastRotationRef.current;
        let rotDelta = group.current.rotation.y - prevRot;
        // Normalize to -π to π
        while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
        while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
        angularVelocityRef.current = rotDelta / Math.max(delta, 0.001);

        // ANIMATION: Update turn phase based on sharp turns
        // turnPhase goes 0->1 during a pivot, then decays
        if (isSharpTurn && angleDiff > Math.PI / 3) {
          // Start or continue pivot - ramp up quickly
          turnPhaseRef.current = Math.min(1, turnPhaseRef.current + delta * 8);
        } else {
          // Decay pivot phase
          turnPhaseRef.current = Math.max(0, turnPhaseRef.current - delta * 4);
        }

        group.current.rotation.y = lerpAngle(group.current.rotation.y, targetRot, rotSpeed);
        lastRotationRef.current = group.current.rotation.y;
      }
    }

    // 3b. Click-to-Move Auto-Movement (when no keyboard input)
    if (!moving && targetPosition && setTargetPosition) {
      const direction = targetPosition.clone().sub(group.current.position);
      direction.y = 0;
      const distanceToTarget = direction.length();

      // Arrival threshold - stop when close enough
      const ARRIVAL_THRESHOLD = 0.5;

      if (distanceToTarget > ARRIVAL_THRESHOLD) {
        // Move toward target
        direction.normalize();
        moveVec = direction;

        // Clear camera view target when player auto-walks
        if (cameraViewTarget && onPlayerStartMove) {
          onPlayerStartMove();
        }

        // Reuse same movement code as keyboard
        const airControl = isGrounded.current ? 1 : 0.6;
        const damp = landingDamp.current > 0 ? 0.7 : 1.0;
        currentSpeed = PLAYER_SPEED * airControl * damp; // Walk speed for auto-movement
        const moveDelta = moveVec.multiplyScalar(currentSpeed * delta);

        // Apply movement with collision detection
        const nextX = group.current.position.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
        const blockedX = isBlockedByBuildings(nextX, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextX, obstacles, 0.6, obstacleHash || undefined);
        if (!blockedX) {
          group.current.position.x = nextX.x;
        } else {
          // Hit obstacle - cancel target
          setTargetPosition(null);
        }

        const nextZ = group.current.position.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
        const blockedZ = isBlockedByBuildings(nextZ, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextZ, obstacles, 0.6, obstacleHash || undefined);
        if (!blockedZ) {
          group.current.position.z = nextZ.z;
        } else {
          // Hit obstacle - cancel target
          setTargetPosition(null);
        }

        // Update walking state
        if (walkingRef.current !== true) {
          walkingRef.current = true;
          setIsWalking(true);
        }

        // Rotate character to face movement direction
        if (cameraMode !== CameraMode.FIRST_PERSON) {
          const targetRot = Math.atan2(moveVec.x, moveVec.z);
          const currentRot = group.current.rotation.y;
          let angleDiff = Math.abs(targetRot - currentRot);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          const isSharpTurn = angleDiff > Math.PI / 2;
          const baseSpeed = cameraMode === CameraMode.OVER_SHOULDER ? 0.35 : 0.1;
          const rotSpeed = isSharpTurn ? Math.min(0.6, baseSpeed * 2) : baseSpeed;
          group.current.rotation.y = lerpAngle(group.current.rotation.y, targetRot, rotSpeed);
        }
      } else {
        // Arrived at target
        setTargetPosition(null);
        if (walkingRef.current !== false) {
          walkingRef.current = false;
          setIsWalking(false);
        }
      }
    }

    // Keyboard input cancels click-to-move target
    if (moving && targetPosition && setTargetPosition) {
      setTargetPosition(null);
    }

    // Clear camera view target when player starts moving
    if (moving && cameraViewTarget && onPlayerStartMove) {
      onPlayerStartMove();
    }

    // BUGFIX: Use bilinear interpolation for accurate terrain sampling
    let groundHeightNow = sampleTerrainHeight(heightmap, group.current.position.x, group.current.position.z);

    // PHYSICS: Check for crate platforms when setting grounded position
    if (pushablesRef?.current) {
      const CRATE_HEIGHT = 0.9;
      const CRATE_PLATFORM_RADIUS = 0.55;

      for (const item of pushablesRef.current) {
        if (!item || item.kind !== 'crate' || !item.position) continue;

        const dx = group.current.position.x - item.position.x;
        const dz = group.current.position.z - item.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < CRATE_PLATFORM_RADIUS * CRATE_PLATFORM_RADIUS) {
          const crateTop = item.position.y + CRATE_HEIGHT / 2;
          groundHeightNow = Math.max(groundHeightNow, crateTop);
        }
      }
    }

    // ROOFTOP COLLISION: Check for rooftop standing
    if (district) {
      const roofHeight = getRoofHeightAt(
        { x: group.current.position.x, z: group.current.position.z },
        buildings,
        district
      );
      // Use 1.0 unit tolerance for reliable roof detection (matches first check)
      if (roofHeight !== null && group.current.position.y >= roofHeight - 1.0) {
        groundHeightNow = Math.max(groundHeightNow, roofHeight);
      }
    }

    if (isGrounded.current) {
      group.current.position.y = groundHeightNow;
    }

    const movedDistSq = group.current.position.distanceToSquared(lastMovePosRef.current);
    if (moving && movedDistSq < 0.0004) {
      stuckTimerRef.current = Math.min(1.2, stuckTimerRef.current + delta);
    } else {
      stuckTimerRef.current = Math.max(0, stuckTimerRef.current - delta * 2);
    }
    lastMovePosRef.current.copy(group.current.position);

    if (moving && keys.shift && isGrounded.current) {
      sprintCharge.current = Math.min(1, sprintCharge.current + delta * 0.6);
    } else {
      sprintCharge.current = Math.max(0, sprintCharge.current - delta * 0.8);
    }

    if (moving && isGrounded.current) {
      footstepTimerRef.current += delta;
      const cadence = keys.shift ? 0.18 : 0.32;
      if (footstepTimerRef.current >= cadence) {
        playFootstep(keys.shift ? 'run' : 'walk');
        footstepTimerRef.current = 0;
      }
    } else {
      footstepTimerRef.current = 0;
    }

    if (interactSwingRef.current > 0) {
      // Slower decay for more visible swing animation (was 3.5, now 1.8)
      interactSwingRef.current = Math.max(0, interactSwingRef.current - delta * 1.8);
    }

    // Update action animation progress (warn, encourage, observe)
    if (actionAnimationRef.current) {
      const elapsed = (performance.now() - actionStartTimeRef.current) / 1000;
      const progress = Math.min(1, elapsed / ACTION_DURATION);
      actionAnimationRef.current.progress = progress;
      if (progress >= 1) {
        // Animation complete, clear after a small delay for smooth return
        setTimeout(() => {
          actionAnimationRef.current = null;
        }, 200);
      }
    }

    if (interactTriggerRef.current !== null && group.current) {
      const strength = interactTriggerRef.current;
      interactTriggerRef.current = null;
      if (nearestPickupRef.current && onPickup) {
        const { id, pickup } = nearestPickupRef.current;
        nearestPickupRef.current = null;
        pickupPromptRef.current = null;
        onPickupPrompt?.(null);
        playPickup();
        onPickup(id, pickup);
      }
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y);
      const hitRange = 1.6 + strength * 0.4;
      let hit: { id: string; pos: THREE.Vector3 } | null = null;
      if (agentHashRef?.current) {
        const neighbors = queryNearbyAgents(group.current.position, agentHashRef.current);
        let best = Infinity;
        for (const neighbor of neighbors) {
          const offset = neighbor.pos.clone().sub(group.current.position);
          offset.y = 0;
          const dist = offset.length();
          if (dist > hitRange || dist < 0.01) continue;
          const dir = offset.clone().normalize();
          const dot = forward.dot(dir);
          if (dot < 0.35) continue;
          if (dist < best) {
            best = dist;
            hit = { id: neighbor.id, pos: neighbor.pos.clone() };
          }
        }
      }
      if (hit) {
        const intensity = 0.7 + strength * 0.3;
        onAgentImpact?.(hit.id, intensity);
        onImpactPuff?.(hit.pos.clone(), 0.6 + strength * 0.5);
        playNpcBump(intensity);
      } else if (pushablesRef?.current) {
        let best = Infinity;
        let hitItem: PushableObject | null = null;
        // Increased range for pushing objects (especially boulders)
        const pushRange = hitRange + 1.5;
        for (const item of pushablesRef.current) {
          const offset = item.position.clone().sub(group.current.position);
          offset.y = 0;
          const dist = offset.length();
          if (dist > pushRange || dist < 0.01) continue;
          const dir = offset.clone().normalize();
          const dot = forward.dot(dir);
          // More forgiving angle check (was 0.35, now 0.1 = ~84 degree cone)
          if (dot < 0.1) continue;
          if (dist < best) {
            best = dist;
            hitItem = item;
          }
        }
        if (hitItem) {
          // Apply push force to the object
          const pushDir = hitItem.position.clone().sub(group.current.position);
          pushDir.y = 0;
          pushDir.normalize();

          // Calculate push force
          const PUSH_FORCE_BASE = 10.0;  // Reduced from 25 - was causing ice-like sliding
          const pushForce = PUSH_FORCE_BASE * (0.5 + strength * 0.5) / Math.max(0.3, hitItem.mass * 0.03);

          // Apply velocity to the object
          hitItem.velocity.add(pushDir.multiplyScalar(pushForce));

          // Wake up sleeping boulders and ensure they always roll
          if (hitItem.kind === 'boulder') {
            hitItem.isSleeping = false;
            // Initialize angular velocity if needed
            if (!hitItem.angularVelocity) {
              hitItem.angularVelocity = new THREE.Vector3();
            }
            // Add initial angular velocity for immediate rolling effect
            const pushDirForRoll = hitItem.position.clone().sub(group.current.position);
            pushDirForRoll.y = 0;
            pushDirForRoll.normalize();
            const rollAxis = new THREE.Vector3(-pushDirForRoll.z, 0, pushDirForRoll.x);
            const initialAngularSpeed = pushForce * 0.3 / hitItem.radius;
            hitItem.angularVelocity.copy(rollAxis.multiplyScalar(initialAngularSpeed));
          }

          // Visual and audio feedback
          onImpactPuff?.(hitItem.position.clone(), 0.5 + strength * 0.4);
          playObjectImpact(hitItem.material, 0.5 + strength * 0.3);

          // Check for shattering on push (only if not already shattered)
          if (!hitItem.isShattered && canBreak(hitItem.kind, hitItem.material)) {
            const breakChance = getBreakChance(hitItem.kind, hitItem.material);
            // Higher strength = slightly higher break chance
            const adjustedChance = breakChance * (0.8 + strength * 0.4);
            if (Math.random() < adjustedChance) {
              hitItem.isShattered = true;
              hitItem.shatterTime = state.clock.elapsedTime;
              // Extra dramatic effect for shattering
              onImpactPuff?.(hitItem.position.clone(), 1.0);
              // Play appropriate shatter sound based on material
              if (hitItem.material === 'wood') {
                collisionSounds.playWoodShatter(0.8 + strength * 0.2);
              } else {
                collisionSounds.playShatter(0.8 + strength * 0.2);
              }
              // Generate loot from shattered object (50% chance, 1-2 items)
              const loot = generateShatterLoot(hitItem.position, getAllItems);
              if (loot.length > 0 && onShatterLoot) {
                onShatterLoot(loot, hitItem.kind);
              }
            }
          }
        } else {
          const testPoint = group.current.position.clone().add(forward.multiplyScalar(0.9));
          const blocked = isBlockedByBuildings(testPoint, buildings, 0.2, buildingHash || undefined)
            || isBlockedByObstacles(testPoint, obstacles, 0.2, obstacleHash || undefined);
          if (blocked) {
            onImpactPuff?.(testPoint, 0.45 + strength * 0.35);
            // Play wall sound for punching/pushing against wall
            playObjectImpact('wall', 0.4 + strength * 0.3);
          }
        }
      }
    }

    // 3c. NPC collision bump + impact pulse
    if (agentHashRef?.current) {
      const neighbors = queryNearbyAgents(group.current.position, agentHashRef.current);
      const playerRadius = 0.6;
      const npcRadius = 0.5;
      const limit = playerRadius + npcRadius;
      const effectiveSpeed = moving ? currentSpeed : 0.6;
      for (const neighbor of neighbors) {
        const offset = group.current.position.clone().sub(neighbor.pos);
        offset.y = 0;
        const distSq = offset.lengthSq();
        if (distSq > 0.0001 && distSq < limit * limit) {
          const dist = Math.sqrt(distSq);
          const normal = offset.multiplyScalar(1 / dist);
          const pushOut = (limit - dist) + 0.02;
          const bounce = 0.05 + effectiveSpeed * 0.02;
          group.current.position.add(normal.clone().multiplyScalar(pushOut + bounce));
          const now = state.clock.elapsedTime;
          const last = npcImpactCooldownRef.current.get(neighbor.id) || 0;
          if (now - last > 0.45) {
            npcImpactCooldownRef.current.set(neighbor.id, now);
            const intensity = Math.min(1, 0.35 + effectiveSpeed / RUN_SPEED);
            onAgentImpact?.(neighbor.id, intensity);
            playNpcBump(intensity);
            if (intensity > 0.6) {
              onImpactPuff?.(neighbor.pos.clone(), Math.min(1, intensity));
            }
          }
        }
      }
    }

    // 3d. Pushable object shove
    if (pushablesRef?.current && moving && currentSpeed > 0.01) {
      const playerPos = group.current.position.clone();
      const playerRadius = 0.6;
      for (const item of pushablesRef.current) {
        const offset = item.position.clone().sub(playerPos);
        offset.y = 0;
        const distSq = offset.lengthSq();
        const limit = playerRadius + item.radius;
        if (distSq > 0.0001 && distSq < limit * limit) {
          const dist = Math.sqrt(distSq);
          const normal = offset.multiplyScalar(1 / dist);
          const overlap = limit - dist;
          const shove = Math.min(1.2, (currentSpeed / RUN_SPEED) * 1.4);
          const impulse = normal.clone().multiplyScalar(shove / Math.max(0.5, item.mass));
          item.velocity.add(impulse);
          const next = item.position.clone().add(impulse.clone().multiplyScalar(0.2));
          const blocked = isBlockedByBuildings(next, buildings, item.radius, buildingHash || undefined)
            || isBlockedByObstacles(next, obstacles, item.radius, obstacleHash || undefined);
          if (!blocked) {
            item.position.copy(next);
          } else {
            item.velocity.multiplyScalar(0.1);
          }
          group.current.position.add(normal.clone().multiplyScalar(-overlap * 0.35));
          const now = state.clock.elapsedTime;
          const intensity = Math.min(1, shove);
          if (now - objectSoundCooldownRef.current > 0.12) {
            playObjectImpact(item.material, intensity);
            objectSoundCooldownRef.current = now;
          }
          if (intensity > 0.5) {
            onImpactPuff?.(item.position, intensity);
          }
        }
      }
    }

    if (pushablesRef?.current && onPickupPrompt) {
      let nearestLabel: string | null = null;
      let nearestPickup: { id: string; pickup: PickupInfo } | null = null;
      let nearestDistSq = Infinity;
      for (const item of pushablesRef.current) {
        if (!item.pickup) continue;
        const dx = item.position.x - group.current.position.x;
        const dz = item.position.z - group.current.position.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 1.4 * 1.4 && distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearestLabel = item.pickup.label;
          nearestPickup = { id: item.id, pickup: item.pickup };
        }
      }
      nearestPickupRef.current = nearestPickup;
      if (pickupPromptRef.current !== nearestLabel) {
        pickupPromptRef.current = nearestLabel;
        onPickupPrompt(nearestLabel ? `Press SHIFT to pick up ${nearestLabel}` : null);
      }
    }

    // 4. Camera Positioning
    if (cameraMode === CameraMode.FIRST_PERSON) {
      camera.position.set(group.current.position.x, 1.7 + group.current.position.y, group.current.position.z);
      camera.up.set(0, 1, 0);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(fpPitch.current, fpYaw.current, 0);
      camera.rotation.z = 0;
      group.current.rotation.y = fpYaw.current;
    } else if (cameraMode === CameraMode.OVERHEAD && orbitRef.current) {
      // Use cameraViewTarget if provided (e.g. when clicking infected household), otherwise follow player
      const targetPos = cameraViewTarget
        ? new THREE.Vector3(cameraViewTarget[0], cameraViewTarget[1], cameraViewTarget[2])
        : group.current.position;

      if (targetPos.distanceToSquared(lastPlayerPos.current) > 0.0001) {
        const offset = camera.position.clone().sub(orbitRef.current.target);
        orbitRef.current.target.copy(targetPos);
        camera.position.copy(targetPos.clone().add(offset));
        lastPlayerPos.current.copy(targetPos);
      }
      if (northLocked) {
        orbitRef.current.setAzimuthalAngle(0);
      }
      orbitRef.current.update();
    } else if (cameraMode === CameraMode.OVER_SHOULDER && orbitRef.current) {
      // Over-shoulder camera: tight follow with auto-rotation and shoulder offset
      const playerPos = group.current.position.clone();

      // Faster lerp during mode transitions for smooth switching
      const isTransitioning = modeTransitionProgressRef.current < 1;
      const baseLerpSpeed = 0.18;
      const transitionLerpSpeed = 0.35;
      const lerpSpeed = isTransitioning ? transitionLerpSpeed : baseLerpSpeed;

      // Sprint camera: smooth transition to show more of the world
      const targetSprintOffset = sprintingRef.current ? 1.0 : 0.0;
      sprintCameraOffsetRef.current = THREE.MathUtils.lerp(sprintCameraOffsetRef.current, targetSprintOffset, 0.08);

      // When sprinting: look higher, camera pulls back and tilts up
      const baseLookHeight = 2.0;
      const sprintLookHeight = 4.0;
      const lookHeight = THREE.MathUtils.lerp(baseLookHeight, sprintLookHeight, sprintCameraOffsetRef.current);

      // Shoulder offset: position camera slightly to the right of player for authentic over-shoulder framing
      const SHOULDER_OFFSET = 0.6; // Units to the right
      const playerRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y);
      const shoulderOffset = playerRight.multiplyScalar(SHOULDER_OFFSET);

      const targetLookAt = playerPos.clone().add(new THREE.Vector3(0, lookHeight, 0)).add(shoulderOffset);
      orbitRef.current.target.lerp(targetLookAt, lerpSpeed);

      // Manual rotation adjustment via A/D keys (subtle, gets smoothly overridden)
      const manualRotateSpeed = 1.2 * delta;
      let manualOffset = 0;
      if (keys.a) manualOffset += manualRotateSpeed;
      if (keys.d) manualOffset -= manualRotateSpeed;

      // Auto-rotate camera to follow player facing direction (horizontal)
      const targetAngle = group.current.rotation.y + Math.PI; // Behind player
      const currentAngle = orbitRef.current.getAzimuthalAngle();

      // Calculate shortest angular difference (accounting for wraparound at 2π)
      const angleDiff = targetAngle - currentAngle;
      const normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

      // Interpolate using the shortest path, with reduced speed when manually adjusting
      const autoRecenterSpeed = (manualOffset !== 0) ? 0.3 : 1.5; // Slower recenter when manually rotating
      const nextAngle = currentAngle + normalizedDiff * (ORBIT_RECENTER_SPEED * delta * autoRecenterSpeed) + manualOffset;
      orbitRef.current.setAzimuthalAngle(nextAngle);

      // Set a lower viewing angle for cinematic upward look (vertical)
      // W/S keys allow slight vertical adjustment
      let verticalAdjust = 0;
      if (keys.w) verticalAdjust -= 0.8 * delta;
      if (keys.s) verticalAdjust += 0.8 * delta;

      const basePolarAngle = Math.PI / 2.2;
      const sprintPolarAngle = Math.PI / 2.5;
      const targetPolarAngle = THREE.MathUtils.lerp(basePolarAngle, sprintPolarAngle, sprintCameraOffsetRef.current);

      const currentPolarAngle = orbitRef.current.getPolarAngle();
      // Blend toward target but allow manual adjustment
      const adjustedTarget = THREE.MathUtils.clamp(targetPolarAngle + verticalAdjust, 0.5, Math.PI / 1.7);
      const nextPolarAngle = THREE.MathUtils.lerp(currentPolarAngle, adjustedTarget, 0.08);
      orbitRef.current.setPolarAngle(nextPolarAngle);

      // Additional distance pullback when sprinting (move camera further back)
      if (sprintCameraOffsetRef.current > 0.01) {
        const cameraToTarget = camera.position.clone().sub(orbitRef.current.target);
        const currentDistance = cameraToTarget.length();
        const sprintExtraDistance = 5.0;
        const targetDistance = currentDistance + sprintExtraDistance * sprintCameraOffsetRef.current;
        const direction = cameraToTarget.normalize();
        camera.position.copy(orbitRef.current.target.clone().add(direction.multiplyScalar(targetDistance)));
      }
    } else if (cameraMode === CameraMode.THIRD_PERSON && orbitRef.current) {
      orbitRef.current.target.lerp(group.current.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);

      // Cinematic dolly zoom - slowly push camera in like a film shot
      const cameraToTarget = camera.position.clone().sub(orbitRef.current.target);
      const currentDistance = cameraToTarget.length();
      const currentPolar = orbitRef.current.getPolarAngle();
      const currentAzimuth = orbitRef.current.getAzimuthalAngle();

      // Capture starting values on first frame
      if (thirdPersonStartDistance.current === null) {
        thirdPersonStartDistance.current = currentDistance;
        thirdPersonSmoothDistance.current = currentDistance;
        thirdPersonSmoothPolar.current = currentPolar;
        thirdPersonStartAzimuth.current = currentAzimuth;
        thirdPersonSmoothAzimuth.current = currentAzimuth;
      }

      // Progress the dolly zoom (only after loading screen fades)
      if (thirdPersonDollyProgress.current < 1 && !gameLoading) {
        thirdPersonDollyProgress.current = Math.min(1, thirdPersonDollyProgress.current + delta / DOLLY_DURATION);

        // Use easeOutCubic for even smoother deceleration
        const t = thirdPersonDollyProgress.current;
        const eased = 1 - Math.pow(1 - t, 3);

        // Calculate target distance and polar angle
        const startDist = thirdPersonStartDistance.current;
        const endDist = startDist * DOLLY_ZOOM_FACTOR;
        const goalDist = THREE.MathUtils.lerp(startDist, endDist, eased);

        const startPolar = 0.8;
        const endPolar = 1.35;
        const goalPolar = THREE.MathUtils.lerp(startPolar, endPolar, eased);

        // Calculate target azimuth - pan camera to center player facing forward
        // Delay the pan until after zoom/tilt are mostly complete
        const startAzimuth = thirdPersonStartAzimuth.current!;
        const endAzimuth = startAzimuth + DOLLY_AZIMUTH_PAN;
        // Remap progress: azimuth only animates during last portion (after DOLLY_PAN_DELAY)
        const azimuthProgress = Math.max(0, (t - DOLLY_PAN_DELAY) / (1 - DOLLY_PAN_DELAY));
        const azimuthEased = 1 - Math.pow(1 - azimuthProgress, 3); // easeOutCubic
        const goalAzimuth = THREE.MathUtils.lerp(startAzimuth, endAzimuth, azimuthEased);

        // Smoothly interpolate our tracking values (this is the key to smooth motion)
        const smoothFactor = 1 - Math.pow(0.02, delta); // Frame-rate independent smoothing
        thirdPersonSmoothDistance.current = THREE.MathUtils.lerp(
          thirdPersonSmoothDistance.current!,
          goalDist,
          smoothFactor
        );
        thirdPersonSmoothPolar.current = THREE.MathUtils.lerp(
          thirdPersonSmoothPolar.current!,
          goalPolar,
          smoothFactor
        );
        thirdPersonSmoothAzimuth.current = THREE.MathUtils.lerp(
          thirdPersonSmoothAzimuth.current!,
          goalAzimuth,
          smoothFactor
        );

        // Apply smooth distance - move camera along the direction to target
        const direction = cameraToTarget.normalize();
        const newPos = orbitRef.current.target.clone().add(
          direction.multiplyScalar(thirdPersonSmoothDistance.current!)
        );
        camera.position.lerp(newPos, smoothFactor);

        // Apply smooth polar and azimuthal angles
        orbitRef.current.setPolarAngle(thirdPersonSmoothPolar.current!);
        orbitRef.current.setAzimuthalAngle(thirdPersonSmoothAzimuth.current!);
      }

      // Subtle auto-recenter when moving: gently drift camera behind player
      const isMoving = walkingRef.current;
      const isUserRotating = keys.a || keys.d; // User is manually rotating camera

      if (recenterRef.current || recenterAmount.current > 0) {
        // R key held: strong recenter
        const targetAngle = group.current.rotation.y;
        const currentAngle = orbitRef.current.getAzimuthalAngle();
        const nextAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, ORBIT_RECENTER_SPEED * delta);
        orbitRef.current.setAzimuthalAngle(nextAngle);
        recenterAmount.current = Math.max(0, recenterAmount.current - delta * 2);
      } else if (isMoving && !isUserRotating) {
        // Subtle auto-recenter while moving (very gentle drift)
        const targetAngle = group.current.rotation.y;
        const currentAngle = orbitRef.current.getAzimuthalAngle();

        // Calculate angular difference
        const angleDiff = targetAngle - currentAngle;
        const normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

        // Only apply if camera is significantly off-center (> 45 degrees)
        // Use very slow drift speed for subtle, non-jarring movement
        if (Math.abs(normalizedDiff) > Math.PI / 4) {
          const SUBTLE_RECENTER_SPEED = 0.15; // Much slower than manual recenter
          const nextAngle = currentAngle + normalizedDiff * SUBTLE_RECENTER_SPEED * delta;
          orbitRef.current.setAzimuthalAngle(nextAngle);
        }
      }
    }

    if ((cameraMode === CameraMode.THIRD_PERSON || cameraMode === CameraMode.OVERHEAD) && orbitRef.current) {
      if (pendingInteriorPanRef.current) {
        const { side, duration } = pendingInteriorPanRef.current;
        const startAngle = orbitRef.current.getAzimuthalAngle();
        const targetAngle = getEntryAzimuth(side);
        const startDistance = camera.position.clone().sub(orbitRef.current.target).length();
        const targetDistance = Math.max(4, startDistance * 0.68);
        interiorPanRef.current = {
          active: true,
          startTime: state.clock.elapsedTime,
          duration,
          startAngle,
          targetAngle,
          startDistance,
          targetDistance
        };
        pendingInteriorPanRef.current = null;
      }
      if (interiorPanRef.current?.active) {
        const { startTime, duration, startAngle, targetAngle, startDistance, targetDistance } = interiorPanRef.current;
        const elapsed = state.clock.elapsedTime - startTime;
        const t = Math.min(1, Math.max(0, elapsed / duration));
        const eased = t * t * (3 - 2 * t);
        const diff = shortestAngleDiff(startAngle, targetAngle);
        orbitRef.current.setAzimuthalAngle(startAngle + diff * eased);
        if (t > 0.6) {
          const zoomT = (t - 0.6) / 0.4;
          const zoomEase = 1 - Math.pow(1 - zoomT, 3);
          const currentDistance = camera.position.clone().sub(orbitRef.current.target).length();
          const desiredDistance = THREE.MathUtils.lerp(startDistance, targetDistance, zoomEase);
          const direction = camera.position.clone().sub(orbitRef.current.target).normalize();
          const nextPos = orbitRef.current.target.clone().add(direction.multiplyScalar(desiredDistance));
          camera.position.lerp(nextPos, 0.08);
        }
        orbitRef.current.update();
        if (t >= 1) {
          interiorPanRef.current.active = false;
        }
      }
    }

    // Orbit occlusion assist (third-person): rotate slightly and fade walls if player is blocked.
    if (cameraMode === CameraMode.THIRD_PERSON && orbitRef.current && group.current) {
      orbitOcclusionFrameRef.current += 1;
      if (orbitOcclusionFrameRef.current >= 4) {
        orbitOcclusionFrameRef.current = 0;

        const playerPos = group.current.position;
        const cameraPos = camera.position;
        const toPlayer = orbitOcclusionTempsRef.current.direction.copy(playerPos).sub(cameraPos);
        const distance = toPlayer.length();
        if (distance > 0.01) {
          raycasterRef.current.set(cameraPos, toPlayer.normalize());
          raycasterRef.current.far = distance;
          const hits = raycasterRef.current.intersectObjects(camera.parent?.children || [], true);
          const blockingHits = hits.filter((hit) => hit.distance < distance && hit.object.userData?.isBuildingWall);
          const isBlocked = blockingHits.length > 0;

          const currentlyOccluded = new Set<THREE.Mesh>();
          const setMaterialFade = (material: THREE.Material, targetOpacity: number, lerpSpeed: number) => {
            if (!('opacity' in material)) return;
            const nextOpacity = THREE.MathUtils.lerp((material as THREE.Material & { opacity: number }).opacity, targetOpacity, lerpSpeed);
            (material as THREE.Material & { opacity: number }).opacity = nextOpacity;
            const shouldBeTransparent = targetOpacity < 1;
            if ('transparent' in material) {
              const matWithTransparency = material as THREE.Material & { transparent?: boolean };
              if (matWithTransparency.transparent !== shouldBeTransparent) {
                matWithTransparency.transparent = shouldBeTransparent;
                material.needsUpdate = true;
              }
            }
            if ('depthWrite' in material) {
              const matWithDepth = material as THREE.Material & { depthWrite?: boolean };
              const nextDepthWrite = !shouldBeTransparent;
              if (matWithDepth.depthWrite !== nextDepthWrite) {
                matWithDepth.depthWrite = nextDepthWrite;
                material.needsUpdate = true;
              }
            }
          };

          if (isBlocked) {
            for (const hit of blockingHits) {
              const mesh = hit.object as THREE.Mesh;
              const buildingId = mesh.userData?.buildingId ?? mesh.parent?.userData?.buildingId;
              let root: THREE.Object3D = mesh.parent ?? mesh;
              if (buildingId) {
                let cursor: THREE.Object3D | null = mesh;
                while (cursor?.parent) {
                  if (cursor.userData?.buildingId === buildingId) {
                    root = cursor;
                  }
                  cursor = cursor.parent;
                }
              }
              root.traverse((child) => {
                if (!(child as THREE.Mesh).isMesh) return;
                const childMesh = child as THREE.Mesh;
                currentlyOccluded.add(childMesh);
                if (!occludedMeshesRef.current.has(childMesh)) {
                  occludedMeshesRef.current.add(childMesh);
                }
                if (Array.isArray(childMesh.material)) {
                  childMesh.material.forEach((material) => setMaterialFade(material, 0.18, 0.18));
                } else if (childMesh.material) {
                  setMaterialFade(childMesh.material, 0.18, 0.18);
                }
              });
            }
          }

          occludedMeshesRef.current.forEach((mesh) => {
            if (!currentlyOccluded.has(mesh)) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((material) => setMaterialFade(material, 1.0, 0.08));
              } else if (mesh.material) {
                setMaterialFade(mesh.material, 1.0, 0.08);
              }
              const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
              const materialOpacity = material && 'opacity' in material ? (material as THREE.Material & { opacity: number }).opacity : 1;
              if (materialOpacity > 0.98) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((mat) => {
                    if (!('opacity' in mat)) return;
                    (mat as THREE.Material & { opacity: number }).opacity = 1.0;
                    if ('transparent' in mat) mat.transparent = false;
                    if ('depthWrite' in mat) mat.depthWrite = true;
                    mat.needsUpdate = true;
                  });
                } else if (mesh.material && 'opacity' in mesh.material) {
                  (mesh.material as THREE.Material & { opacity: number }).opacity = 1.0;
                  if ('transparent' in mesh.material) mesh.material.transparent = false;
                  if ('depthWrite' in mesh.material) mesh.material.depthWrite = true;
                  mesh.material.needsUpdate = true;
                }
                occludedMeshesRef.current.delete(mesh);
              }
            }
          });

          if (isBlocked && !(keys.a || keys.d)) {
            const target = orbitRef.current.target;
            const offset = orbitOcclusionTempsRef.current.offset.copy(cameraPos).sub(target);
            const angleStep = 0.42;
            const attemptAngles = [
              orbitOcclusionTurnRef.current * angleStep,
              -orbitOcclusionTurnRef.current * angleStep,
              orbitOcclusionTurnRef.current * angleStep * 2,
              -orbitOcclusionTurnRef.current * angleStep * 2
            ];
            let chosenStep: number | null = null;

            for (const step of attemptAngles) {
              orbitOcclusionTempsRef.current.candidate.copy(offset).applyAxisAngle(orbitOcclusionAxisRef.current, step);
              orbitOcclusionTempsRef.current.position.copy(target).add(orbitOcclusionTempsRef.current.candidate);
              const candidateDir = orbitOcclusionTempsRef.current.direction.copy(playerPos).sub(orbitOcclusionTempsRef.current.position);
              const candidateDistance = candidateDir.length();
              if (candidateDistance < 0.01) continue;
              raycasterRef.current.set(orbitOcclusionTempsRef.current.position, candidateDir.normalize());
              raycasterRef.current.far = candidateDistance;
              const candidateHits = raycasterRef.current.intersectObjects(camera.parent?.children || [], true);
              const candidateBlocked = candidateHits.some((hit) => hit.distance < candidateDistance && hit.object.userData?.isBuildingWall);
              if (!candidateBlocked) {
                chosenStep = step;
                break;
              }
            }

            const appliedStep = chosenStep ?? orbitOcclusionTurnRef.current * angleStep;
            orbitOcclusionTurnRef.current = Math.sign(appliedStep) || 1;
            const currentAzimuth = orbitRef.current.getAzimuthalAngle();
            orbitRef.current.setAzimuthalAngle(currentAzimuth + appliedStep * 0.7);
            orbitRef.current.update();
          }
        }
      }
    }

    // PHASE 2: Wall Occlusion System - Make walls transparent when blocking camera view
    // Only active in over-shoulder mode for cinematic camera
    if (cameraMode === CameraMode.OVER_SHOULDER && group.current) {
      // Performance: Only check every 3 frames
      occlusionCheckFrameRef.current++;
      if (occlusionCheckFrameRef.current >= 3) {
        occlusionCheckFrameRef.current = 0;

        const playerPos = group.current.position;
        const cameraPos = camera.position;
        const direction = playerPos.clone().sub(cameraPos).normalize();
        const distance = playerPos.distanceTo(cameraPos);

        // Raycast from camera to player to find occluding walls
        raycasterRef.current.set(cameraPos, direction);
        raycasterRef.current.far = distance;

        // Get all intersected objects
        const intersects = raycasterRef.current.intersectObjects(camera.parent?.children || [], true);

        // Track which meshes are currently occluding
        const currentlyOccluded = new Set<THREE.Mesh>();

        for (const hit of intersects) {
          // Only process building walls that are between camera and player
          if (hit.distance < distance && hit.object.userData?.isBuildingWall) {
            const mesh = hit.object as THREE.Mesh;
            currentlyOccluded.add(mesh);

            // Make wall transparent if not already
            if (!occludedMeshesRef.current.has(mesh)) {
              occludedMeshesRef.current.add(mesh);
            }

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((material) => setMaterialFade(material, 0.15, 0.1));
            } else if (mesh.material) {
              setMaterialFade(mesh.material, 0.15, 0.1);
            }
          }
        }

        // Restore meshes that are no longer occluding
        occludedMeshesRef.current.forEach((mesh) => {
          if (!currentlyOccluded.has(mesh)) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((material) => setMaterialFade(material, 1.0, 0.05));
            } else if (mesh.material) {
              setMaterialFade(mesh.material, 1.0, 0.05);
            }
            const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const materialOpacity = material && 'opacity' in material ? (material as THREE.Material & { opacity: number }).opacity : 1;
            if (materialOpacity > 0.98) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => {
                  if (!('opacity' in mat)) return;
                  (mat as THREE.Material & { opacity: number }).opacity = 1.0;
                  if ('transparent' in mat) mat.transparent = false;
                  if ('depthWrite' in mat) mat.depthWrite = true;
                  mat.needsUpdate = true;
                });
              } else if (mesh.material && 'opacity' in mesh.material) {
                (mesh.material as THREE.Material & { opacity: number }).opacity = 1.0;
                if ('transparent' in mesh.material) mesh.material.transparent = false;
                if ('depthWrite' in mesh.material) mesh.material.depthWrite = true;
                mesh.material.needsUpdate = true;
              }
              occludedMeshesRef.current.delete(mesh);
            }
          }
        });
      }
    } else if (cameraMode !== CameraMode.THIRD_PERSON) {
      // Restore all occluded meshes when not using any occlusion mode.
      occludedMeshesRef.current.forEach((mesh) => {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => {
            if (!('opacity' in material)) return;
            (material as THREE.Material & { opacity: number }).opacity = 1.0;
            if ('transparent' in material) material.transparent = false;
            if ('depthWrite' in material) material.depthWrite = true;
            material.needsUpdate = true;
          });
        } else if (mesh.material && 'opacity' in mesh.material) {
          (mesh.material as THREE.Material & { opacity: number }).opacity = 1.0;
          if ('transparent' in mesh.material) mesh.material.transparent = false;
          if ('depthWrite' in mesh.material) mesh.material.depthWrite = true;
          mesh.material.needsUpdate = true;
        }
      });
      occludedMeshesRef.current.clear();
    }

    // === CAMERA EFFECTS SYSTEM ===

    // 4a. Camera collision prevention - pull camera forward when obstructed
    if (cameraMode !== CameraMode.FIRST_PERSON && cameraMode !== CameraMode.OVERHEAD && group.current) {
      const playerPos = group.current.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const cameraPos = camera.position.clone();
      const toCamera = cameraPos.clone().sub(playerPos);
      const distance = toCamera.length();

      if (distance > 0.5) {
        const direction = toCamera.normalize();
        raycasterRef.current.set(playerPos, direction);
        raycasterRef.current.far = distance;

        const intersects = raycasterRef.current.intersectObjects(camera.parent?.children || [], true);

        let closestObstruction = distance;
        for (const hit of intersects) {
          // Check for buildings/terrain (not the player or decorations)
          if (hit.object.userData?.isBuildingWall || hit.object.userData?.isBuilding || hit.object.userData?.isTerrain) {
            if (hit.distance < closestObstruction) {
              closestObstruction = hit.distance;
            }
          }
        }

        // Calculate how much to pull camera forward
        const targetOffset = closestObstruction < distance ? (distance - closestObstruction + 0.5) : 0;
        cameraCollisionOffsetRef.current = THREE.MathUtils.lerp(cameraCollisionOffsetRef.current, targetOffset, 0.15);

        // Apply the offset
        if (cameraCollisionOffsetRef.current > 0.1) {
          const pullDirection = direction.negate();
          camera.position.add(pullDirection.multiplyScalar(cameraCollisionOffsetRef.current));
        }
      }
    }

    // 4b. Sprint FOV widening - increase FOV when sprinting for speed sensation
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = sprintingRef.current ? SPRINT_FOV : BASE_FOV;
      currentFovRef.current = THREE.MathUtils.lerp(currentFovRef.current, targetFov, 0.08);

      // Only update if changed significantly (avoid unnecessary updates)
      if (Math.abs(camera.fov - currentFovRef.current) > 0.1) {
        camera.fov = currentFovRef.current;
        camera.updateProjectionMatrix();
      }
    }

    // 4c. Landing camera bob - subtle dip when landing from jumps
    if (landingImpulseRef.current > 0) {
      // Decay the landing impulse
      cameraBobRef.current = landingImpulseRef.current * 0.15; // Max 0.15 unit dip
    } else {
      // Smoothly return to normal
      cameraBobRef.current = THREE.MathUtils.lerp(cameraBobRef.current, 0, 0.1);
    }

    // Apply camera bob to vertical position (except first-person which handles its own positioning)
    if (cameraMode !== CameraMode.FIRST_PERSON && Math.abs(cameraBobRef.current) > 0.001) {
      camera.position.y -= cameraBobRef.current;
    }

    // 5. Plague exposure check (once per second)
    exposureCheckTimer.current += delta;
    if (exposureCheckTimer.current >= EXPOSURE_CONFIG.CHECK_INTERVAL_SECONDS) {
      exposureCheckTimer.current = 0;

      if (playerStats?.plague.state === AgentState.HEALTHY && onPlagueExposure) {
        const pos = group.current.position;

        // Calculate plague protection from inventory items
        const protectionMultiplier = calculatePlagueProtection(playerStats.inventory);

        // 5a. RAT-FLEA EXPOSURE (Primary vector)
        if (ratsRef?.current) {
          const nearbyRats = ratsRef.current.filter(rat => {
            const dist = Math.hypot(rat.position.x - pos.x, rat.position.z - pos.z);
            return dist < EXPOSURE_CONFIG.RAT_RADIUS;
          });

          if (nearbyRats.length > 0) {
            const ratDensity = Math.min(1, nearbyRats.length / EXPOSURE_CONFIG.MAX_RAT_DENSITY);
            const exposureChance = EXPOSURE_CONFIG.RAT_BASE_CHANCE * ratDensity * protectionMultiplier;

            if (Math.random() < exposureChance) {
              onPlagueExposure('flea', 1.0);
              // Visual feedback - small particle at feet
              onImpactPuff?.(new THREE.Vector3(pos.x, 0.1, pos.z), EXPOSURE_CONFIG.FLEA_BITE_PARTICLE_SIZE);
              return; // One exposure per check max
            }
          }
        }

        // 5b. INFECTED NPC PROXIMITY (Secondary - pneumonic)
        if (agentHashRef?.current) {
          const nearbyAgents = queryNearbyAgents(pos, agentHashRef.current);
          const nearbyInfected = nearbyAgents.filter(agent => {
            if (agent.state !== AgentState.INFECTED) return false;
            const dist = Math.hypot(agent.pos.x - pos.x, agent.pos.z - pos.z);
            return dist < EXPOSURE_CONFIG.INFECTED_RADIUS;
          });

          if (nearbyInfected.length > 0) {
            const infectedDensity = Math.min(1, nearbyInfected.length / EXPOSURE_CONFIG.MAX_INFECTED_DENSITY);
            const pneumonicCount = nearbyInfected.filter(agent => agent.plagueType === PlagueType.PNEUMONIC).length;
            const pneumonicBoost = pneumonicCount > 0 ? 1.4 : 0.35;
            const exposureChance = EXPOSURE_CONFIG.INFECTED_BASE_CHANCE * infectedDensity * pneumonicBoost * protectionMultiplier;

            if (Math.random() < Math.min(0.2, exposureChance)) {
              onPlagueExposure('airborne', 0.8);
              return;
            }
          }
        }

        // 5c. CORPSE CONTACT (Tertiary - materials)
        // Only when player is stationary (not walking/sprinting)
        if (agentHashRef?.current && !walkingRef.current && !sprintingRef.current) {
          const nearbyAgents = queryNearbyAgents(pos, agentHashRef.current);
          const nearbyCorpses = nearbyAgents.filter(agent => {
            if (agent.state !== AgentState.DECEASED) return false;
            const dist = Math.hypot(agent.pos.x - pos.x, agent.pos.z - pos.z);
            return dist < EXPOSURE_CONFIG.CORPSE_RADIUS;
          });

          if (nearbyCorpses.length > 0) {
            const exposureChance = EXPOSURE_CONFIG.CORPSE_BASE_CHANCE * protectionMultiplier;

            if (Math.random() < exposureChance) {
              onPlagueExposure('contact', 0.6);
              return;
            }
          }
        }
      }
    }

    // 6. Marker positioning (shows at click-to-move target)
    if (markerRef.current) {
      if (targetPosition) {
        // Show marker at click target position
        const targetGroundHeight = sampleTerrainHeight(heightmap, targetPosition.x, targetPosition.z);
        markerRef.current.position.set(targetPosition.x, targetGroundHeight + 0.05, targetPosition.z);
        markerRef.current.visible = true;
        if (markerGlowRef.current) {
          markerGlowRef.current.position.set(targetPosition.x, targetGroundHeight + 0.02, targetPosition.z);
          markerGlowRef.current.visible = true;
        }
      } else {
        // Hide marker when no target
        markerRef.current.visible = false;
        if (markerGlowRef.current) {
          markerGlowRef.current.visible = false;
        }
      }
    }
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={cameraMode !== CameraMode.FIRST_PERSON}
        minDistance={
          cameraMode === CameraMode.OVERHEAD ? 12 :
          cameraMode === CameraMode.OVER_SHOULDER ? 4 :
          7
        }
        maxDistance={
          cameraMode === CameraMode.OVERHEAD ? 120 :
          cameraMode === CameraMode.OVER_SHOULDER ? 10 :
          50
        }
        minPolarAngle={
          cameraMode === CameraMode.OVERHEAD ? OVERHEAD_POLAR_ANGLE :
          cameraMode === CameraMode.OVER_SHOULDER ? 0.5 :
          0.1
        }
        maxPolarAngle={
          cameraMode === CameraMode.OVERHEAD ? OVERHEAD_POLAR_ANGLE :
          cameraMode === CameraMode.OVER_SHOULDER ? Math.PI / 1.7 :
          Math.PI / 2.1
        }
        enablePan={cameraMode === CameraMode.OVERHEAD}
        enableRotate={cameraMode === CameraMode.THIRD_PERSON}
        enableDamping
        dampingFactor={ORBIT_DAMPING}
        screenSpacePanning={cameraMode === CameraMode.OVERHEAD}
        mouseButtons={
          cameraMode === CameraMode.OVERHEAD
            ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
            : undefined
        }
      />
      <group ref={group} position={initialPosition}>
        {cameraMode !== CameraMode.FIRST_PERSON && (
          <Humanoid
            color={playerStats?.robeBaseColor || (playerStats?.gender === 'Female' ? playerStats.robeColor : '#2a3b55')}
            headColor={playerStats?.skinTone}
            turbanColor={playerStats?.headwearColor || playerStats?.hairColor || '#ffffff'}
            headscarfColor={playerStats?.headscarfColor}
            gender={playerStats?.gender}
            age={playerStats?.age}
            hairColor={playerStats?.hairColor}
            scale={playerStats ? [playerStats.weight, playerStats.height, playerStats.weight] : undefined}
            enableArmSwing
            interactionSwingRef={interactSwingRef}
            interactionChargeRef={interactChargeRef}
            actionAnimationRef={actionAnimationRef}
            armSwingMode={(timeOfDay >= 19 || timeOfDay < 5) ? 'left' : 'both'}
            robeAccentColor={playerStats?.robeAccentColor}
            robeHasSash={playerStats?.robeHasSash}
            robeSleeves={playerStats?.robeSleeves}
            robeHasTrim={playerStats?.robeHasTrim ?? true}
            robeHemBand={playerStats?.robeHemBand}
            robeSpread={playerStats?.robeSpread}
            robeOverwrap={playerStats?.robeOverwrap}
            robePattern={playerStats?.robePattern}
            hairStyle={playerStats?.hairStyle}
            headwearStyle={playerStats?.headwearStyle}
            sleeveCoverage={playerStats?.sleeveCoverage}
            footwearStyle={playerStats?.footwearStyle}
            footwearColor={playerStats?.footwearColor}
            accessories={playerStats?.accessories}
            visibleItems={visibleItems}
            cosmeticEffects={cosmeticEffects}
            isWalking={isWalking}
            isSprinting={isSprinting}
            isJumpingRef={isJumpingRef}
            jumpPhaseRef={jumpPhaseRef}
            jumpAnticipationRef={jumpAnticipationRef}
            landingImpulseRef={landingImpulseRef}
            jumpChargeRef={lastJumpChargeRef}
            isClimbing={isClimbing}
            climbAnimationPhaseRef={climbAnimationPhaseRef}
            animationBoost={1.35}
            distanceFromCamera={0}
            showGroundShadow={false}
            turnPhaseRef={turnPhaseRef}
            angularVelocityRef={angularVelocityRef}
            movementStartTimeRef={movementStartTimeRef}
            movementStopTimeRef={movementStopTimeRef}
            sprintTransitionRef={sprintTransitionRef}
          />
        )}
        
        {/* Player Torch */}
        {(cameraMode !== CameraMode.FIRST_PERSON) && (timeOfDay >= 19 || timeOfDay < 5) && (
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

      </group>

      {/* Click-to-Move Destination Marker (world space) */}
      <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={markerGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial
          map={markerGlowMap ?? undefined}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
});
