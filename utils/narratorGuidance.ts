import { ActiveEffect, AgentState, ItemEffect, PlagueStatus } from '../types';
import { ConditionLogEntry, getConditionSuggestion, getPrimarySymptoms, getProtectionSummaries } from './condition';
import { NarratorContext } from './narratorPrompt';

interface RemedyEntry {
  name: string;
  quantity: number;
  effects?: ItemEffect[];
}

interface NarratorGuidanceData {
  context: NarratorContext;
  plague: PlagueStatus;
  activeEffects: ActiveEffect[];
  inventoryEntries: RemedyEntry[];
  recentConditionLog: ConditionLogEntry[];
  isOnHomeTile?: boolean;
}

const isMedicalFigure = (label: string, detail?: string) =>
  /physician|hakim|doctor|barber|surgeon|apothecary|hospital|bimaristan|clinic/i.test(`${label} ${detail ?? ''}`);

const listRemedies = (inventoryEntries: RemedyEntry[]) =>
  inventoryEntries
    .filter((entry) => (entry.effects ?? []).some((effect) =>
      effect.type === 'symptomRelief' || effect.type === 'plagueProtection' || effect.type === 'heal'))
    .slice(0, 4);

const describeSymptoms = (plague: PlagueStatus) => {
  if (plague.state === AgentState.HEALTHY) {
    return 'For the moment your body feels ordinary. No symptom has yet forced itself to the front.';
  }

  if (plague.state === AgentState.INCUBATING) {
    return 'The body has begun to warn you in quiet ways: fatigue, unease, and the sense that something is gathering beneath the surface.';
  }

  const symptoms = getPrimarySymptoms(plague).map((symptom) => symptom.replace(/^[^A-Za-z]+/, '').toLowerCase());
  const joined = symptoms.length > 1
    ? `${symptoms.slice(0, -1).join(', ')} and ${symptoms[symptoms.length - 1]}`
    : symptoms[0];

  if (plague.overallSeverity >= 70) {
    return `You are in hard straits: ${joined}. The illness is no longer subtle, and delay will cost you dearly.`;
  }

  return `You feel the plague plainly now: ${joined}. It has not yet emptied you completely, but it is advancing.`;
};

const describeHelp = (context: NarratorContext, plague: PlagueStatus) => {
  const nearbyMedical = [
    ...context.nearbyBuildings.filter((building) => isMedicalFigure(building.label, building.detail)),
    ...context.nearbyNpcs.filter((npc) => isMedicalFigure(npc.label, npc.detail))
  ].sort((a, b) => a.distance - b.distance);

  if (nearbyMedical.length > 0) {
    const target = nearbyMedical[0];
    return `${target.label} lies to the ${target.direction}, close enough to reach quickly. If you want help now, go there before the weakness grows worse.`;
  }

  if (plague.state === AgentState.HEALTHY) {
    return 'No healer stands immediately at hand. If you want to prepare, the market and the learned quarter are the likeliest places to ask after remedies.';
  }

  const districtHints = context.nearbyDistricts?.slice(0, 3).map((entry) => entry.locationLabel) ?? [];
  const districtLine = districtHints.length > 0
    ? `Look toward ${districtHints.join(', ')} if you mean to leave this quarter.`
    : 'Your best chance is the market or the learned quarter, where healers and compounders are more commonly found.';

  return `No physician or apothecary stands within immediate reach. ${districtLine}`;
};

const describeCarriedRemedies = (
  plague: PlagueStatus,
  inventoryEntries: RemedyEntry[],
  activeEffects: ActiveEffect[],
  recentConditionLog: ConditionLogEntry[],
  context: NarratorContext
) => {
  const remedies = listRemedies(inventoryEntries);
  const activeProtectionList = getProtectionSummaries(activeEffects, context.simTime);
  const recent = recentConditionLog
    .filter((entry) => entry.source === 'remedy' || entry.source === 'treatment')
    .slice(0, 1);

  if (remedies.length === 0) {
    return 'Your satchel offers little comfort just now. You will need to buy, barter, or beg for something stronger.';
  }

  const remedyLine = remedies
    .map((entry) => `${entry.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ''}`)
    .join(', ');

  let response = `You still carry remedies worth trying: ${remedyLine}.`;
  if (activeProtectionList.length > 0) {
    response += ` One precaution still holds: ${activeProtectionList[0]}.`;
  }
  if (recent.length > 0) {
    response += ` The last thing you tried was ${recent[0].title.toLowerCase()}.`;
  }
  if (plague.state !== AgentState.HEALTHY) {
    response += ` ${getConditionSuggestion(plague, activeEffects, context.currentTask)}`;
  }
  return response;
};

export const resolveNarratorGuidance = (
  question: string,
  data: NarratorGuidanceData
) => {
  const normalized = question.trim().toLowerCase();
  const { context, plague, activeEffects, inventoryEntries, recentConditionLog, isOnHomeTile } = data;

  if (/where.*home|how.*get home|am i home/.test(normalized)) {
    if (isOnHomeTile) {
      return 'You are already on your own ground. If you need shelter or your household, you need only turn toward your door.';
    }
    return 'Home is not under your feet now. Ask the streets for patience and keep to known quarters until you can make your return.';
  }

  if (/how.*feel|what.*feel|how am i|what is wrong|what.*symptom|symptom|condition|how sick/.test(normalized)) {
    return describeSymptoms(plague);
  }

  if (/nearest|where.*apothec|where.*physician|where.*doctor|where.*hakim|where.*barber|where.*hospital|where.*bimaristan|where.*treatment|who can help|find help/.test(normalized)) {
    return describeHelp(context, plague);
  }

  if (/what.*carry|what.*remed|what.*medicine|what can i take|what should i take|satchel|inventory/.test(normalized)) {
    return describeCarriedRemedies(plague, inventoryEntries, activeEffects, recentConditionLog, context);
  }

  if (/what should i do|what now|what next|what can i do/.test(normalized)) {
    const medicalHelp = describeHelp(context, plague);
    return `${getConditionSuggestion(plague, activeEffects, context.currentTask)} ${medicalHelp}`;
  }

  return null;
};
