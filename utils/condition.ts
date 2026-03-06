import { ActiveEffect, AgentState, ItemEffect, PlagueStatus } from '../types';
import { getSymptomLabels } from './plague';

export interface ConditionLogEntry {
  id: string;
  title: string;
  detail: string;
  tone: 'warning' | 'relief' | 'risk' | 'note';
  source: 'plague' | 'remedy' | 'treatment' | 'task';
  simTime: number;
}

export interface ConditionInventoryEntry {
  name: string;
  category: string;
  quantity: number;
  effects?: ItemEffect[];
}

export const getConditionHeadline = (plague: PlagueStatus) => {
  if (plague.state === AgentState.HEALTHY) {
    return {
      title: 'Steady',
      tone: 'stable' as const,
      detail: 'Your body holds for now.'
    };
  }

  if (plague.state === AgentState.INCUBATING) {
    return {
      title: 'Uneasy',
      tone: 'warning' as const,
      detail: 'Something is wrong, though it has not yet declared itself.'
    };
  }

  if (plague.state === AgentState.DECEASED) {
    return {
      title: 'Taken',
      tone: 'critical' as const,
      detail: 'No remedy can be sought now.'
    };
  }

  if (plague.overallSeverity < 35) {
    return {
      title: 'Afflicted',
      tone: 'warning' as const,
      detail: 'The illness has become plain, but you can still move with purpose.'
    };
  }

  if (plague.overallSeverity < 70) {
    return {
      title: 'Severe',
      tone: 'danger' as const,
      detail: 'Your strength is failing. Relief matters more than pride.'
    };
  }

  return {
    title: 'Critical',
    tone: 'critical' as const,
    detail: 'The plague is pressing hard against the body.'
  };
};

export const getConditionCourse = (plague: PlagueStatus) => {
  if (plague.state === AgentState.HEALTHY) return 'No clear sign of plague yet.';
  if (plague.state === AgentState.INCUBATING) return 'Early unease. Symptoms may sharpen soon.';
  if (plague.state === AgentState.DECEASED) return 'The course has ended.';

  if (plague.plagueType === 'pneumonic') {
    return `Day ${plague.daysInfected}: fast-moving illness of the chest.`;
  }

  if (plague.plagueType === 'septicemic') {
    return `Day ${plague.daysInfected}: overwhelming corruption in the blood.`;
  }

  return `Day ${plague.daysInfected}: swelling, fever, and weakness deepen by the day.`;
};

export const getConditionSuggestion = (
  plague: PlagueStatus,
  activeEffects: ActiveEffect[],
  currentTaskTitle?: string | null
) => {
  if (plague.state === AgentState.HEALTHY) {
    return 'Keep watch on crowded quarters, rumor, and the health of your household.';
  }

  if (plague.state === AgentState.INCUBATING) {
    return 'Seek an apothecary, barber, or hakim before the illness fully declares itself.';
  }

  if (plague.state === AgentState.DECEASED) {
    return 'The lesson now belongs to those who survive you.';
  }

  if (activeEffects.some((effect) => effect.effectType === 'plagueProtection')) {
    return 'A remedy or precaution is still in effect. Use the borrowed time to seek stronger help.';
  }

  if (plague.coughingBlood > 35) {
    return 'Your chest is turning against you. Find indoor care immediately and do not linger in crowds.';
  }

  if (plague.buboes > 50) {
    return 'A swelling has ripened. A barber or physician may try to drain it, though the ordeal is dangerous.';
  }

  if (plague.overallSeverity >= 70) {
    return currentTaskTitle
      ? `Follow your immediate need: ${currentTaskTitle}. Every delay costs strength.`
      : 'Find a physician or bimaristan at once, or return home before the streets finish you.';
  }

  if (plague.delirium > 35) {
    return 'Your thoughts are slipping. Keep close to known places and ask for guidance often.';
  }

  return currentTaskTitle
    ? `Your immediate need is ${currentTaskTitle.toLowerCase()}.`
    : 'Use your satchel, seek counsel, and do not trust that a single remedy will save you.';
};

export const getProtectionSummaries = (activeEffects: ActiveEffect[], simTime: number) => {
  return activeEffects
    .filter((effect) => effect.effectType === 'plagueProtection' && effect.expiresAt > simTime)
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .map((effect) => {
      const hoursRemaining = Math.max(0, (effect.expiresAt - simTime) / 60);
      return `${effect.source} (${hoursRemaining.toFixed(1)}h left)`;
    });
};

export const getPrimarySymptoms = (plague: PlagueStatus) => {
  const symptoms = getSymptomLabels(plague);
  if (symptoms.length > 0) return symptoms;
  if (plague.state === AgentState.INCUBATING) return ['Fatigue', 'Unease'];
  if (plague.state === AgentState.HEALTHY) return ['No present symptoms'];
  return ['No clear symptom dominates'];
};

export const scoreConditionInventoryEntry = (
  entry: ConditionInventoryEntry,
  plague: PlagueStatus
) => {
  let score = 0;
  const effects = entry.effects ?? [];

  if (/theriac/i.test(entry.name)) score += 14;
  if (/opium/i.test(entry.name)) score += 10;
  if (/fumig|incense|aromatic|camphor/i.test(entry.name)) score += 8;
  if (/honey|mint|rose water|vinegar|myrrh/i.test(entry.name)) score += 4;

  effects.forEach((effect) => {
    if (effect.type === 'plagueProtection') {
      score += 22 + effect.value * 0.4;
    }

    if (effect.type === 'heal') {
      score += 2;
    }

    if (effect.type !== 'symptomRelief' || !effect.stat) return;

    if (effect.stat === 'all') {
      score += 26;
      return;
    }

    if (effect.stat === 'survivalChance') {
      score += 30 + effect.value;
      return;
    }

    if (effect.stat === 'fever') score += plague.fever > 20 ? 18 : 6;
    if (effect.stat === 'weakness') score += plague.weakness > 20 ? 18 : 6;
    if (effect.stat === 'buboes') score += plague.buboes > 10 ? 20 : 4;
    if (effect.stat === 'coughingBlood') score += plague.coughingBlood > 10 ? 20 : 4;
    if (effect.stat === 'delirium') score += plague.delirium > 10 ? 18 : 4;
    if (effect.stat === 'skinBleeding') score += plague.skinBleeding > 10 ? 18 : 4;
    if (effect.stat === 'gangrene') score += plague.gangrene > 10 ? 18 : 4;
  });

  if (entry.category === 'Document') score -= 10;
  if (entry.category === 'Unknown') score -= 4;

  return score;
};
