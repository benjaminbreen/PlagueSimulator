/**
 * Climbing State Machine - Physics and state management for climbing
 */

import * as THREE from 'three';
import { ClimbableAccessory, ClimbingState } from '../types';

// ==================== CLIMBING CONSTANTS ====================

export const CLIMBING_CONSTANTS = {
  // Detection
  CLIMB_DETECTION_RADIUS: 4.5,    // How close to start climbing prompt (increased for easier access)
  CLIMB_ANGLE_THRESHOLD: 0.25,    // cos(75deg) - wider facing requirement

  // Movement
  CLIMB_SPEED_MULTIPLIER: 1.0,    // Applied to climbable's climbSpeed
  DISMOUNT_JUMP_FORCE: 5.0,       // Force when jumping off mid-climb
  TOP_TRANSITION_THRESHOLD: 0.95, // Progress to transition to roof
  BOTTOM_TRANSITION_THRESHOLD: 0.05, // Progress to step off

  // Step distances for dismounting
  GROUND_EXIT_STEP: 0.8,          // Step distance when exiting at bottom
  CANCEL_STEP: 0.8,               // Step distance when canceling mid-climb
  ROOF_ENTRY_STEP: 1.5,           // Step distance when stepping onto roof

  // Animation
  CLIMB_CYCLE_SPEED: 3.0,         // Speed of hand-over-hand animation
  BODY_OFFSET_FROM_LADDER: 1.0,   // How far player body is from climbable surface (increased to stay outside building)
};

// ==================== STATE MANAGEMENT ====================

/**
 * Create initial climbing state
 */
export function createClimbingState(): ClimbingState {
  return {
    isClimbing: false,
    climbableId: null,
    climbProgress: 0,
    climbDirection: 'none',
  };
}

/**
 * Start climbing a climbable
 */
export function initiateClimbing(
  state: ClimbingState,
  climbable: ClimbableAccessory,
  startFromTop: boolean = false
): ClimbingState {
  return {
    isClimbing: true,
    climbableId: climbable.id,
    climbProgress: startFromTop ? 1.0 : 0.0,
    climbDirection: 'none',
  };
}

/**
 * Stop climbing (dismount)
 */
export function stopClimbing(state: ClimbingState): ClimbingState {
  return {
    isClimbing: false,
    climbableId: null,
    climbProgress: 0,
    climbDirection: 'none',
  };
}

// ==================== CLIMBING PHYSICS ====================

export interface ClimbingInput {
  up: boolean;      // W or Up arrow
  down: boolean;    // S or Down arrow
  jump: boolean;    // Space (single press)
}

export interface ClimbingResult {
  newState: ClimbingState;
  playerPosition: THREE.Vector3;
  playerRotation: number;
  shouldDismountTop: boolean;
  shouldDismountBottom: boolean;
  shouldDismountJump: boolean;
  jumpVelocity: THREE.Vector3 | null;
}

/**
 * Update climbing state each frame
 */
export function updateClimbing(
  state: ClimbingState,
  climbable: ClimbableAccessory,
  input: ClimbingInput,
  delta: number
): ClimbingResult {
  let newProgress = state.climbProgress;
  let direction: 'up' | 'down' | 'none' = 'none';

  // Handle movement input
  if (climbable.requiresHold) {
    // Ladder-style: must hold key to move
    if (input.up && !input.down) {
      direction = 'up';
      newProgress += (climbable.climbSpeed * delta) / climbable.height;
    } else if (input.down && !input.up) {
      direction = 'down';
      newProgress -= (climbable.climbSpeed * delta) / climbable.height;
    }
  } else {
    // Staircase-style: auto-climb based on movement direction
    if (input.up) {
      direction = 'up';
      newProgress += (climbable.climbSpeed * delta) / climbable.height;
    } else if (input.down) {
      direction = 'down';
      newProgress -= (climbable.climbSpeed * delta) / climbable.height;
    }
  }

  // Clamp progress
  newProgress = Math.max(0, Math.min(1, newProgress));

  // Check for dismount conditions
  const shouldDismountTop = newProgress >= CLIMBING_CONSTANTS.TOP_TRANSITION_THRESHOLD && direction === 'up';
  const shouldDismountBottom = newProgress <= CLIMBING_CONSTANTS.BOTTOM_TRANSITION_THRESHOLD && direction === 'down';
  const shouldDismountJump = input.jump && !shouldDismountTop && !shouldDismountBottom;

  // Calculate player position on climbable
  const playerPosition = calculateClimbingPosition(climbable, newProgress);
  const playerRotation = calculateClimbingRotation(climbable);

  // Calculate jump velocity if jumping off
  let jumpVelocity: THREE.Vector3 | null = null;
  if (shouldDismountJump) {
    jumpVelocity = calculateDismountJumpVelocity(climbable, newProgress);
  }

  const newState: ClimbingState = {
    isClimbing: !shouldDismountTop && !shouldDismountBottom && !shouldDismountJump,
    climbableId: shouldDismountTop || shouldDismountBottom || shouldDismountJump ? null : climbable.id,
    climbProgress: newProgress,
    climbDirection: direction,
  };

  return {
    newState,
    playerPosition,
    playerRotation,
    shouldDismountTop,
    shouldDismountBottom,
    shouldDismountJump,
    jumpVelocity,
  };
}

/**
 * Calculate player position while climbing
 */
export function calculateClimbingPosition(
  climbable: ClimbableAccessory,
  progress: number
): THREE.Vector3 {
  const [baseX, baseY, baseZ] = climbable.basePosition;
  const [, topY] = climbable.topPosition;

  // Interpolate Y position
  const y = baseY + progress * (topY - baseY);

  // Offset from climbable surface based on wall side
  const offset = CLIMBING_CONSTANTS.BODY_OFFSET_FROM_LADDER;
  let x = baseX;
  let z = baseZ;

  // For staircases, player moves along the stair path (away from wall) as they climb
  const isStaircase = climbable.type === 'STONE_STAIRCASE' || climbable.type === 'LEAN_TO';
  const stairDepthOffset = isStaircase ? progress * climbable.depth : 0;

  // Player stands OUTSIDE the building, offset away from the wall
  // Wall 0 (North): ladder on north edge, player further north (+Z)
  // Wall 1 (East): ladder on east edge, player further east (+X)
  // Wall 2 (South): ladder on south edge, player further south (-Z)
  // Wall 3 (West): ladder on west edge, player further west (-X)
  switch (climbable.wallSide) {
    case 0: // North wall - player stands north of ladder (outside building)
      z += offset + stairDepthOffset;
      break;
    case 1: // East wall - player stands east of ladder (outside building)
      x += offset + stairDepthOffset;
      break;
    case 2: // South wall - player stands south of ladder (outside building)
      z -= offset + stairDepthOffset;
      break;
    case 3: // West wall - player stands west of ladder (outside building)
      x -= offset + stairDepthOffset;
      break;
  }

  return new THREE.Vector3(x, y, z);
}

/**
 * Calculate player rotation while climbing (facing the climbable)
 */
export function calculateClimbingRotation(climbable: ClimbableAccessory): number {
  // Player faces the climbable (opposite direction of wall normal)
  switch (climbable.wallSide) {
    case 0: return Math.PI;       // North wall -> face south
    case 1: return -Math.PI / 2;  // East wall -> face west
    case 2: return 0;             // South wall -> face north
    case 3: return Math.PI / 2;   // West wall -> face east
    default: return 0;
  }
}

/**
 * Calculate velocity when jumping off mid-climb
 */
function calculateDismountJumpVelocity(
  climbable: ClimbableAccessory,
  progress: number
): THREE.Vector3 {
  const force = CLIMBING_CONSTANTS.DISMOUNT_JUMP_FORCE;

  // Jump away from the building (outward from wall)
  // Wall 0 (North): jump north (+Z) away from building
  // Wall 1 (East): jump east (+X) away from building
  // Wall 2 (South): jump south (-Z) away from building
  // Wall 3 (West): jump west (-X) away from building
  let dx = 0;
  let dz = 0;

  switch (climbable.wallSide) {
    case 0: dz = 1; break;  // Jump north (away from building)
    case 1: dx = 1; break;  // Jump east (away from building)
    case 2: dz = -1; break; // Jump south (away from building)
    case 3: dx = -1; break; // Jump west (away from building)
  }

  return new THREE.Vector3(
    dx * force * 0.5,
    force,
    dz * force * 0.5
  );
}

// ==================== ROOF TRANSITION ====================

/**
 * Calculate position when stepping onto roof from top of climbable
 * Now uses dynamic step distance based on building size for reliable roof landing
 */
export function calculateRoofEntryPosition(
  climbable: ClimbableAccessory
): THREE.Vector3 {
  const [topX, topY, topZ] = climbable.topPosition;

  // Dynamic step distance based on building size
  // Ladder is at buildingEdge + depth/2, we want to land ~30% inside the building
  // stepDistance = depth/2 (to reach edge) + halfSize * 0.35 (to get well inside)
  const halfSize = climbable.buildingHalfSize;
  const stepDistance = (climbable.depth / 2) + (halfSize * 0.35);

  let x = topX;
  let z = topZ;

  // Step TOWARD building center (opposite of wall normal)
  // Wall 0 (North): step south (-Z) onto roof
  // Wall 1 (East): step west (-X) onto roof
  // Wall 2 (South): step north (+Z) onto roof
  // Wall 3 (West): step east (+X) onto roof
  switch (climbable.wallSide) {
    case 0: z -= stepDistance; break; // North wall - step south onto roof
    case 1: x -= stepDistance; break; // East wall - step west onto roof
    case 2: z += stepDistance; break; // South wall - step north onto roof
    case 3: x += stepDistance; break; // West wall - step east onto roof
  }

  return new THREE.Vector3(x, topY + 0.1, z);
}

/**
 * Calculate position when stepping off bottom of climbable
 * @param climbable - The climbable being exited
 * @param terrainHeightAt - Optional function to sample terrain height (if not provided, uses baseY)
 */
export function calculateGroundExitPosition(
  climbable: ClimbableAccessory,
  terrainHeightAt?: (x: number, z: number) => number
): THREE.Vector3 {
  const [baseX, baseY, baseZ] = climbable.basePosition;

  // Step away from climbable
  const stepDistance = CLIMBING_CONSTANTS.GROUND_EXIT_STEP;
  let x = baseX;
  let z = baseZ;

  switch (climbable.wallSide) {
    case 0: z += stepDistance; break; // Step north (away from building)
    case 1: x += stepDistance; break; // Step east
    case 2: z -= stepDistance; break; // Step south
    case 3: x -= stepDistance; break; // Step west
  }

  // Use terrain height if available, otherwise use base Y position
  const y = terrainHeightAt ? terrainHeightAt(x, z) : baseY;

  return new THREE.Vector3(x, y, z);
}

// ==================== ANIMATION HELPERS ====================

/**
 * Calculate animation phase for hand-over-hand climbing
 */
export function calculateClimbAnimationPhase(
  progress: number,
  direction: 'up' | 'down' | 'none',
  time: number
): {
  leftArmPhase: number;  // 0-1 for left arm animation
  rightArmPhase: number; // 0-1 for right arm animation
  leftLegPhase: number;  // 0-1 for left leg animation
  rightLegPhase: number; // 0-1 for right leg animation
} {
  if (direction === 'none') {
    // Resting pose - arms/legs at neutral
    return {
      leftArmPhase: 0.5,
      rightArmPhase: 0.5,
      leftLegPhase: 0.5,
      rightLegPhase: 0.5,
    };
  }

  // Animate based on time, reversed for going down
  const speed = CLIMBING_CONSTANTS.CLIMB_CYCLE_SPEED;
  const cycle = direction === 'up' ? time * speed : -time * speed;

  // Opposite limb pairs move together
  const phase1 = (Math.sin(cycle) + 1) / 2;
  const phase2 = (Math.sin(cycle + Math.PI) + 1) / 2;

  return {
    leftArmPhase: phase1,
    rightArmPhase: phase2,
    leftLegPhase: phase2,
    rightLegPhase: phase1,
  };
}
