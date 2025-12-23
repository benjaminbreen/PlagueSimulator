import * as THREE from 'three';
import { ActionId, PLAYER_ACTIONS, PlayerActionEvent, PlayerStats } from '../types';
import { AgentSnapshot, SpatialHash, queryNearbyAgents } from './spatial';

export interface ActionResult {
  success: boolean;
  affectedNpcIds: string[];
  message: string;
}

/**
 * Check if an action can be executed
 */
export const canExecuteAction = (
  actionId: ActionId,
  playerStats: PlayerStats,
  cooldowns: Record<ActionId, number>,
  currentSimTime: number
): { canExecute: boolean; reason?: string } => {
  const action = PLAYER_ACTIONS[actionId];

  // Check cooldown
  const cooldownEnd = cooldowns[actionId] || 0;
  if (currentSimTime < cooldownEnd) {
    const remaining = Math.ceil(cooldownEnd - currentSimTime);
    return { canExecute: false, reason: `Cooldown: ${remaining}s` };
  }

  // Check charisma requirement
  if (action.requiresCharisma && playerStats.charisma < action.requiresCharisma) {
    return { canExecute: false, reason: `Requires ${action.requiresCharisma} Charisma` };
  }

  return { canExecute: true };
};

/**
 * Create a player action event to broadcast to NPCs
 */
export const createActionEvent = (
  actionId: ActionId,
  playerPosition: THREE.Vector3,
  currentTime: number
): PlayerActionEvent => {
  const action = PLAYER_ACTIONS[actionId];
  return {
    actionId,
    position: [playerPosition.x, playerPosition.y, playerPosition.z],
    timestamp: currentTime,
    effect: action.effect,
    radius: action.radius
  };
};

/**
 * Calculate which NPCs are affected by an action
 */
export const getAffectedNpcs = (
  playerPosition: THREE.Vector3,
  radius: number,
  agentHash: SpatialHash<AgentSnapshot> | null
): AgentSnapshot[] => {
  if (!agentHash) return [];

  const nearbyAgents = queryNearbyAgents(playerPosition, agentHash);
  const radiusSq = radius * radius;

  return nearbyAgents.filter(agent => {
    const distSq = playerPosition.distanceToSquared(agent.pos);
    return distSq <= radiusSq;
  });
};

/**
 * Execute a warn action - increases panic, causes NPCs to scatter
 */
export const executeWarnAction = (
  playerPosition: THREE.Vector3,
  agentHash: SpatialHash<AgentSnapshot> | null
): ActionResult => {
  const action = PLAYER_ACTIONS.warn;
  const affected = getAffectedNpcs(playerPosition, action.radius, agentHash);

  if (affected.length === 0) {
    return {
      success: true,
      affectedNpcIds: [],
      message: 'No one nearby to warn.'
    };
  }

  return {
    success: true,
    affectedNpcIds: affected.map(a => a.id),
    message: `Warned ${affected.length} people nearby!`
  };
};

/**
 * Execute an encourage action - decreases panic, may attract NPCs
 */
export const executeEncourageAction = (
  playerPosition: THREE.Vector3,
  playerStats: PlayerStats,
  agentHash: SpatialHash<AgentSnapshot> | null
): ActionResult => {
  const action = PLAYER_ACTIONS.encourage;
  const affected = getAffectedNpcs(playerPosition, action.radius, agentHash);

  if (affected.length === 0) {
    return {
      success: true,
      affectedNpcIds: [],
      message: 'No one nearby to encourage.'
    };
  }

  // Charisma affects success rate
  const successChance = 0.5 + (playerStats.charisma * 0.1);
  const succeeded = Math.random() < successChance;

  if (succeeded) {
    return {
      success: true,
      affectedNpcIds: affected.map(a => a.id),
      message: `Calmed ${affected.length} people nearby.`
    };
  } else {
    return {
      success: false,
      affectedNpcIds: affected.map(a => a.id),
      message: 'Your words fall on deaf ears...'
    };
  }
};

/**
 * Execute observe action - placeholder
 */
export const executeObserveAction = (): ActionResult => {
  return {
    success: true,
    affectedNpcIds: [],
    message: 'You observe your surroundings carefully...'
  };
};

/**
 * Main action executor
 */
export const executeAction = (
  actionId: ActionId,
  playerPosition: THREE.Vector3,
  playerStats: PlayerStats,
  agentHash: SpatialHash<AgentSnapshot> | null
): ActionResult => {
  switch (actionId) {
    case 'warn':
      return executeWarnAction(playerPosition, agentHash);
    case 'encourage':
      return executeEncourageAction(playerPosition, playerStats, agentHash);
    case 'observe':
      return executeObserveAction();
    default:
      return {
        success: false,
        affectedNpcIds: [],
        message: 'Action not implemented yet.'
      };
  }
};
