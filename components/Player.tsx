
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { CameraMode, BuildingMetadata, PlayerStats, Obstacle, DistrictType, PlayerActionEvent, AgentState, ClimbableAccessory, ClimbingState, PlagueType } from '../types';
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
import { PushableObject, PickupInfo, PushableMaterial } from '../utils/pushables';
import { sampleTerrainHeight, TerrainHeightmap } from '../utils/terrain';
import { calculateTerrainGradient } from '../utils/terrain-gradient';
import { collisionSounds, CollisionMaterial } from './audio/CollisionSounds';
import { EXPOSURE_CONFIG, calculatePlagueProtection } from '../utils/plagueExposure';
import { Rat } from './Rats';

// Map pushable materials to collision sound materials
const materialToSound = (mat: PushableMaterial): CollisionMaterial => {
  switch (mat) {
    case 'ceramic': return 'ceramic';
    case 'wood': return 'wood';
    case 'stone': return 'stone';
    case 'cloth': return 'cloth';
    default: return 'stone';
  }
};

const PLAYER_SPEED = 6;
const RUN_SPEED = 11;
const CAMERA_SENSITIVITY = 4.2;
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
}

export const Player = forwardRef<THREE.Group, PlayerProps>(({
  initialPosition = [0, 0, 0],
  targetPosition,
  setTargetPosition,
  cameraMode,
  buildings = [],
  buildingHash = null,
  obstacles = [],
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
  dossierMode = false,
  actionEvent,
  sprintStateRef,
  ratsRef,
  onPlagueExposure,
  simTime,
  climbables = [],
  onClimbingStateChange,
  onClimbablePrompt,
  climbInputRef
}, ref) => {
  const group = useRef<THREE.Group>(null);
  const orbitRef = useRef<any>(null);
  const pointerRef = useRef<any>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const markerGlowRef = useRef<THREE.Mesh>(null);

  // Spatial hash for fast climbable lookup (O(1) instead of O(n))
  const climbableSpatialHash = useMemo(() => {
    const hash = new ClimbableSpatialHash(5.0);
    hash.build(climbables);
    return hash;
  }, [climbables]);

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
  const [isClimbing, setIsClimbing] = useState(false);
  const climbAnimationPhaseRef = useRef(0);

  // Action animation state (warn, encourage, observe)
  const actionAnimationRef = useRef<{ action: string; progress: number } | null>(null);
  const actionStartTimeRef = useRef<number>(0);

  // Wall occlusion system for over-shoulder camera
  const occludedMeshesRef = useRef<Set<THREE.Mesh>>(new Set());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const occlusionCheckFrameRef = useRef(0);
  const ACTION_DURATION = 1.5; // seconds for full animation

  // Sprint camera pullback (over-shoulder mode)
  const sprintCameraOffsetRef = useRef(0); // 0 = normal, 1 = full sprint zoom

  // Dossier mode camera state
  const savedCameraPos = useRef<THREE.Vector3 | null>(null);
  const savedCameraTarget = useRef<THREE.Vector3 | null>(null);

  useImperativeHandle(ref, () => group.current!, []);

  // Track if we've initialized position for this initialPosition
  const lastInitialPosRef = useRef<string>('');

  useEffect(() => {
    if (!group.current) return;

    // Create a key from initialPosition to detect actual changes
    const posKey = `${initialPosition[0]},${initialPosition[1]},${initialPosition[2]}`;

    // Skip if we've already initialized for this position
    if (lastInitialPosRef.current === posKey) return;
    lastInitialPosRef.current = posKey;

    // BUGFIX: Use bilinear interpolation for accurate terrain sampling
    const ground = sampleTerrainHeight(heightmap, initialPosition[0], initialPosition[2]);
    const spawnPos = new THREE.Vector3(initialPosition[0], ground + initialPosition[1], initialPosition[2]);

    // Validate spawn isn't inside a building - if so, find safe position
    if (isBlockedByBuildings(spawnPos, buildings, 0.6, buildingHash || undefined)) {
      // Try to find a nearby safe position
      const offsets = [2, 4, 6, 8];
      let safePos: THREE.Vector3 | null = null;
      for (const r of offsets) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const candidate = new THREE.Vector3(
            spawnPos.x + Math.cos(angle) * r,
            ground,
            spawnPos.z + Math.sin(angle) * r
          );
          if (!isBlockedByBuildings(candidate, buildings, 0.6, buildingHash || undefined) &&
              !isBlockedByObstacles(candidate, obstacles, 0.6)) {
            safePos = candidate;
            break;
          }
        }
        if (safePos) break;
      }
      // Use safe position if found, otherwise use edge of map
      const finalPos = safePos || new THREE.Vector3(30, ground, 30);
      group.current.position.copy(finalPos);
      lastPlayerPos.current.copy(finalPos);
      lastMovePosRef.current.copy(finalPos);
    } else {
      group.current.position.copy(spawnPos);
      lastPlayerPos.current.copy(spawnPos);
      lastMovePosRef.current.copy(spawnPos);
    }
  }, [initialPosition, heightmap, buildings, buildingHash, obstacles]);

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
  }, []);

  // Trigger action animation when actionEvent changes
  useEffect(() => {
    if (actionEvent && actionEvent.actionId) {
      actionAnimationRef.current = { action: actionEvent.actionId, progress: 0 };
      actionStartTimeRef.current = performance.now();
    }
  }, [actionEvent]);

  // Reset climbing state when climbables change (map transition)
  useEffect(() => {
    if (climbingStateRef.current.isClimbing) {
      climbingStateRef.current = stopClimbing(climbingStateRef.current);
      activeClimbableRef.current = null;
      setIsClimbing(false);
      onClimbingStateChange?.(false);
    }
    // Clear prompt on climbables change
    onClimbablePrompt?.(null);
  }, [climbables, onClimbingStateChange, onClimbablePrompt]);

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

  const applyJump = (charge = 0) => {
    const boost = charge * 4;
    velV.current = JUMP_FORCE + boost;
    isGrounded.current = false;
    jumpTimer.current = 0;
    jumpBuffer.current = 0;
    lastJumpChargeRef.current = charge;
    playJump();
  };

  useEffect(() => {
    if (!orbitRef.current || !group.current) return;
    if (cameraMode === CameraMode.OVERHEAD) {
      lastPlayerPos.current.copy(group.current.position);
      orbitRef.current.target.copy(group.current.position);
      orbitRef.current.update();
    }
  }, [cameraMode]);

  useFrame((state, delta) => {
    if (!group.current) return;

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

        // Update climbable prompt
        if (nearby && onClimbablePrompt) {
          if (nearbyFromRoof) {
            onClimbablePrompt('Press C to descend');
          } else {
            onClimbablePrompt('Press C to climb');
          }
        } else if (!nearby && onClimbablePrompt) {
          onClimbablePrompt(null);
        }

        // Check for climb initiation (press C near a climbable)
        const cJustPressed = keys.c && !lastCRef.current;
        const wantsClimbUp = cJustPressed && nearbyFromGround && isGrounded.current;
        const wantsClimbDown = cJustPressed && nearbyFromRoof && isOnRoof;

        if (wantsClimbUp && nearbyFromGround) {
          // Start climbing from bottom
          climbingStateRef.current = initiateClimbing(climbingStateRef.current, nearbyFromGround);
          activeClimbableRef.current = nearbyFromGround;
          setIsClimbing(true);
          climbAnimationPhaseRef.current = 0; // Reset animation phase
          onClimbingStateChange?.(true); // Notify UI of climbing state
          velV.current = 0;
        } else if (wantsClimbDown && nearbyFromRoof) {
          // Start climbing from top (descending)
          climbingStateRef.current = initiateClimbing(climbingStateRef.current, nearbyFromRoof, true);
          activeClimbableRef.current = nearbyFromRoof;
          setIsClimbing(true);
          climbAnimationPhaseRef.current = 0;
          onClimbingStateChange?.(true); // Notify UI of climbing state
          velV.current = 0;
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

    // 1. Camera Adjustment Logic (WASD)
    if (cameraMode === CameraMode.FIRST_PERSON) {
      fpYaw.current += (keys.a ? CAMERA_SENSITIVITY * delta : 0);
      fpYaw.current -= (keys.d ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current += (keys.w ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current -= (keys.s ? CAMERA_SENSITIVITY * delta : 0);
      fpPitch.current = THREE.MathUtils.clamp(fpPitch.current, -1.2, 1.2);
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

    // PHYSICS: Check for crate platforms (player can stand on crates)
    if (pushablesRef?.current) {
      const CRATE_HEIGHT = 0.9; // Visual height of crate box
      const CRATE_PLATFORM_RADIUS = 0.55; // Slightly larger than crate for easier landing

      for (const item of pushablesRef.current) {
        if (!item || item.kind !== 'crate' || !item.position) continue;

        // Check horizontal distance to crate
        const dx = group.current.position.x - item.position.x;
        const dz = group.current.position.z - item.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < CRATE_PLATFORM_RADIUS * CRATE_PLATFORM_RADIUS) {
          // Player is above this crate - use crate top as ground
          const crateTop = item.position.y + CRATE_HEIGHT / 2;
          groundHeight = Math.max(groundHeight, crateTop);
        }
      }
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
        // Only use roof as ground if player is coming from above or already on roof
        if (currentY >= roofHeight - 0.5) {
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
            if (!isBlockedByBuildings(candidate, buildings, 0.6, buildingHash || undefined) && !isBlockedByObstacles(candidate, obstacles, 0.6)) {
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

    const canJump = !chargingRef.current && (isGrounded.current || coyoteTimer.current < 0.12) && jumpBuffer.current > 0;
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
        if (item.velocity.lengthSq() < 0.00001) continue;
        const speed = item.velocity.length();
        const next = item.position.clone().add(item.velocity.clone().multiplyScalar(delta));
        const blocked = isBlockedByBuildings(next, buildings, item.radius, buildingHash || undefined)
          || isBlockedByObstacles(next, obstacles, item.radius);
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

            // PHYSICS: Shatter ceramic objects (amphorae) on hard impact
            if (item.material === 'ceramic' && !item.isShattered) {
              // Shatter threshold: medium speed or higher (0.7+)
              // Power move with full charge can easily exceed this
              const shatterThreshold = 0.65;
              if (intensity > shatterThreshold) {
                item.isShattered = true;
                item.shatterTime = now;
                // Extra impact puff for dramatic shatter
                onImpactPuff?.(item.position, 1.0);
                // Play shatter sound
                collisionSounds.playShatter(intensity);
              }
            }

            objectImpactCooldownRef.current.set(item.id, now);
          }
        }
        const friction = 3.0 + item.mass * 0.4;
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
            const normal = new THREE.Vector3(dx, 0, dz).normalize();

            // Push boulder out of tree
            const overlap = limit - dist;
            boulder.position.add(normal.clone().multiplyScalar(overlap + 0.05));

            // Bounce with momentum loss
            const TREE_RESTITUTION = 0.3; // Lose 70% energy on tree impact
            const velocityAlongNormal = boulder.velocity.dot(normal);

            if (velocityAlongNormal < 0) {
              // Reflect velocity and apply energy loss
              boulder.velocity.add(normal.clone().multiplyScalar(-velocityAlongNormal * (1 + TREE_RESTITUTION)));

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
                const angularImpulse = new THREE.Vector3(
                  normal.z * velocityAlongNormal,
                  0,
                  -normal.x * velocityAlongNormal
                ).multiplyScalar(0.5);
                boulder.angularVelocity.add(angularImpulse);
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

    if (keys.up) moveVec.add(forward);
    if (keys.down) moveVec.sub(forward);
    if (keys.right) moveVec.add(right);
    if (keys.left) moveVec.sub(right);
    if (cameraMode === CameraMode.FIRST_PERSON) {
      // WASD controls look in first person; movement uses arrow keys.
    }

    const moving = moveVec.lengthSq() > 0.01;
    if (walkingRef.current !== moving) {
      walkingRef.current = moving;
      setIsWalking(moving);
    }
    const sprinting = moving && keys.shift;
    if (sprintingRef.current !== sprinting) {
      sprintingRef.current = sprinting;
      setIsSprinting(sprinting);
      if (sprintStateRef) {
        sprintStateRef.current = sprinting;
      }
    }
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

    let currentSpeed = 0;
    if (moving) {
      moveVec.normalize();
      const airControl = isGrounded.current ? 1 : 0.6;
      const damp = landingDamp.current > 0 ? 0.7 : 1.0;
      currentSpeed = (keys.shift ? RUN_SPEED : PLAYER_SPEED) * airControl * damp;
      const moveDelta = moveVec.multiplyScalar(currentSpeed * delta);
      const nextX = group.current.position.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
      const blockedX = isBlockedByBuildings(nextX, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextX, obstacles, 0.6);
      if (!blockedX) {
        group.current.position.x = nextX.x;
      } else if (Math.abs(moveDelta.x) > 0.02) {
        // Play wall collision sound when running into a wall
        const intensity = Math.min(1, currentSpeed / RUN_SPEED);
        playObjectImpact('wall', intensity * 0.6);
      }
      const nextZ = group.current.position.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
      const blockedZ = isBlockedByBuildings(nextZ, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextZ, obstacles, 0.6);
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
        const rotSpeed = cameraMode === CameraMode.OVER_SHOULDER ? 0.35 : 0.1;
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot, rotSpeed);
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

        // Reuse same movement code as keyboard
        const airControl = isGrounded.current ? 1 : 0.6;
        const damp = landingDamp.current > 0 ? 0.7 : 1.0;
        currentSpeed = PLAYER_SPEED * airControl * damp; // Walk speed for auto-movement
        const moveDelta = moveVec.multiplyScalar(currentSpeed * delta);

        // Apply movement with collision detection
        const nextX = group.current.position.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
        const blockedX = isBlockedByBuildings(nextX, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextX, obstacles, 0.6);
        if (!blockedX) {
          group.current.position.x = nextX.x;
        } else {
          // Hit obstacle - cancel target
          setTargetPosition(null);
        }

        const nextZ = group.current.position.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
        const blockedZ = isBlockedByBuildings(nextZ, buildings, 0.6, buildingHash || undefined) || isBlockedByObstacles(nextZ, obstacles, 0.6);
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
          const rotSpeed = cameraMode === CameraMode.OVER_SHOULDER ? 0.35 : 0.1;
          group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot, rotSpeed);
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
      if (roofHeight !== null && group.current.position.y >= roofHeight - 0.5) {
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
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y);
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

          // Calculate push force - stronger for testing
          const PUSH_FORCE_BASE = 25.0;  // Increased for testing
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
        } else {
          const testPoint = group.current.position.clone().add(forward.multiplyScalar(0.9));
          const blocked = isBlockedByBuildings(testPoint, buildings, 0.2, buildingHash || undefined)
            || isBlockedByObstacles(testPoint, obstacles, 0.2);
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
            || isBlockedByObstacles(next, obstacles, item.radius);
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
      const playerPos = group.current.position;
      if (playerPos.distanceToSquared(lastPlayerPos.current) > 0.0001) {
        const offset = camera.position.clone().sub(orbitRef.current.target);
        orbitRef.current.target.copy(playerPos);
        camera.position.copy(playerPos.clone().add(offset));
        lastPlayerPos.current.copy(playerPos);
      }
      if (northLocked) {
        orbitRef.current.setAzimuthalAngle(0);
      }
      orbitRef.current.update();
    } else if (cameraMode === CameraMode.OVER_SHOULDER && orbitRef.current) {
      // Over-shoulder camera: tight follow with auto-rotation
      const playerPos = group.current.position.clone();

      // Sprint camera: smooth transition to show more of the world
      const targetSprintOffset = sprintingRef.current ? 1.0 : 0.0;
      sprintCameraOffsetRef.current = THREE.MathUtils.lerp(sprintCameraOffsetRef.current, targetSprintOffset, 0.08);

      // When sprinting: look higher, camera pulls back and tilts up
      const baseLookHeight = 2.0; // Raised from 1.2 for wider world view
      const sprintLookHeight = 4.0; // Raised from 2.5 for dramatic sprint view
      const lookHeight = THREE.MathUtils.lerp(baseLookHeight, sprintLookHeight, sprintCameraOffsetRef.current);

      const targetLookAt = playerPos.clone().add(new THREE.Vector3(0, lookHeight, 0));
      orbitRef.current.target.lerp(targetLookAt, 0.15);

      // Auto-rotate camera to follow player facing direction (horizontal)
      const targetAngle = group.current.rotation.y + Math.PI; // Behind player
      const currentAngle = orbitRef.current.getAzimuthalAngle();

      // Calculate shortest angular difference (accounting for wraparound at 2π)
      const angleDiff = targetAngle - currentAngle;
      const normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

      // Interpolate using the shortest path
      const nextAngle = currentAngle + normalizedDiff * (ORBIT_RECENTER_SPEED * delta * 1.5);
      orbitRef.current.setAzimuthalAngle(nextAngle);

      // Set a lower viewing angle for cinematic upward look (vertical)
      // When sprinting: tilt camera up to show more world ahead
      const basePolarAngle = Math.PI / 2.2; // Higher angle (was π/2.0) for better world view
      const sprintPolarAngle = Math.PI / 2.5; // Much higher when sprinting (was π/2.15)
      const targetPolarAngle = THREE.MathUtils.lerp(basePolarAngle, sprintPolarAngle, sprintCameraOffsetRef.current);

      const currentPolarAngle = orbitRef.current.getPolarAngle();
      const nextPolarAngle = THREE.MathUtils.lerp(currentPolarAngle, targetPolarAngle, 0.05);
      orbitRef.current.setPolarAngle(nextPolarAngle);

      // Additional distance pullback when sprinting (move camera further back)
      if (sprintCameraOffsetRef.current > 0.01) {
        const cameraToTarget = camera.position.clone().sub(orbitRef.current.target);
        const currentDistance = cameraToTarget.length();
        const sprintExtraDistance = 5.0; // Pull back 5 units when sprinting (was 3.0)
        const targetDistance = currentDistance + sprintExtraDistance * sprintCameraOffsetRef.current;
        const direction = cameraToTarget.normalize();
        camera.position.copy(orbitRef.current.target.clone().add(direction.multiplyScalar(targetDistance)));
      }
    } else if (cameraMode === CameraMode.THIRD_PERSON && orbitRef.current) {
      orbitRef.current.target.lerp(group.current.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);
      if (recenterRef.current || recenterAmount.current > 0) {
        const targetAngle = group.current.rotation.y;
        const currentAngle = orbitRef.current.getAzimuthalAngle();
        const nextAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, ORBIT_RECENTER_SPEED * delta);
        orbitRef.current.setAzimuthalAngle(nextAngle);
        recenterAmount.current = Math.max(0, recenterAmount.current - delta * 2);
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
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.transparent = true;
                mat.depthWrite = false;
              }
            }

            // Fade to ghosted opacity
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.15, 0.1);
            }
          }
        }

        // Restore meshes that are no longer occluding
        occludedMeshesRef.current.forEach((mesh) => {
          if (!currentlyOccluded.has(mesh) && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1.0, 0.05);

            // Fully restore when opacity is high enough
            if (mat.opacity > 0.98) {
              mat.opacity = 1.0;
              mat.transparent = false;
              mat.depthWrite = true;
              occludedMeshesRef.current.delete(mesh);
            }
          }
        });
      }
    } else {
      // Restore all occluded meshes when not in over-shoulder mode
      occludedMeshesRef.current.forEach((mesh) => {
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = 1.0;
          mat.transparent = false;
          mat.depthWrite = true;
        }
      });
      occludedMeshesRef.current.clear();
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
      {cameraMode !== CameraMode.FIRST_PERSON ? (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          minDistance={
            cameraMode === CameraMode.OVERHEAD ? 12 :
            cameraMode === CameraMode.OVER_SHOULDER ? 7 :
            7
          }
          maxDistance={
            cameraMode === CameraMode.OVERHEAD ? 120 :
            cameraMode === CameraMode.OVER_SHOULDER ? 18 :
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
          mouseButtons={cameraMode === CameraMode.OVERHEAD ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : undefined}
        />
      ) : (
        <PointerLockControls ref={pointerRef} makeDefault />
      )}
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
