import { seededRandom } from '../procedural';
import { EventDefinition } from '../../types';
import { EVENT_TRIGGERS, EventTrigger, TriggerTargetType, TriggerWhen } from './triggerCatalog';
import { getEventById } from './catalog';

export interface TriggerState {
  counts: Record<string, number>;
  lastTriggeredDay: Record<string, number>;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function shouldTrigger(
  trigger: EventTrigger,
  dayIndex: number,
  count: number,
  state: TriggerState
): boolean {
  if (trigger.nth !== undefined && trigger.nth !== count) return false;

  if (trigger.cooldownDays !== undefined) {
    const lastDay = state.lastTriggeredDay[trigger.id];
    if (lastDay !== undefined && dayIndex - lastDay < trigger.cooldownDays) {
      return false;
    }
  }

  if (trigger.chance !== undefined) {
    const seed = hashString(`${trigger.id}:${dayIndex}:${count}`);
    const roll = seededRandom(seed);
    if (roll > trigger.chance) return false;
  }

  return true;
}

export function evaluateTriggers(params: {
  when: TriggerWhen;
  targetType: TriggerTargetType;
  targetId: string;
  dayIndex: number;
  state: TriggerState;
}): EventDefinition | null {
  const { when, targetType, targetId, dayIndex, state } = params;
  const countKey = `${when}:${targetType}:${targetId}`;
  const nextCount = (state.counts[countKey] ?? 0) + 1;
  state.counts[countKey] = nextCount;

  const candidates = EVENT_TRIGGERS.filter(trigger =>
    trigger.when === when &&
    trigger.targetType === targetType &&
    trigger.targetId === targetId
  );

  for (const trigger of candidates) {
    if (!shouldTrigger(trigger, dayIndex, nextCount, state)) continue;
    state.lastTriggeredDay[trigger.id] = dayIndex;
    const def = getEventById(trigger.eventId);
    if (def) return def;
  }

  return null;
}
