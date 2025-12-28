import { AgentState, CONSTANTS, NPCRecord, NPCPlagueMeta, PlagueType } from '../types';
import { PLAGUE_CONFIG } from './plague';

const DEFAULT_PLAGUE_META: NPCPlagueMeta = {
  plagueType: PlagueType.NONE,
  exposureTime: null,
  incubationHours: null,
  deathHours: null,
  onsetTime: null
};

const HOURS_PER_DAY = 24;
const HOUSEHOLD_EXPOSURE_PER_HOUR = 0.04;
const NPC_PLAGUE_TIME_SCALE = 0.12;
const NPC_MIN_INCUBATION_HOURS = 1;
const NPC_MAX_INCUBATION_HOURS = 8;
const NPC_MIN_DEATH_HOURS = 4;
const NPC_MAX_DEATH_HOURS = 22;

const hashStringToSeed = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
};

const seededRand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const pickPlagueType = (seed: number) => {
  const roll = seededRand(seed);
  if (roll < 0.8) return PlagueType.BUBONIC;
  if (roll < 0.95) return PlagueType.PNEUMONIC;
  return PlagueType.SEPTICEMIC;
};

const sampleHours = (minDays: number, maxDays: number, seed: number) => {
  const t = seededRand(seed);
  return (minDays + (maxDays - minDays) * t) * HOURS_PER_DAY;
};

export const createNpcPlagueMeta = (seed: number, simTime: number): NPCPlagueMeta => {
  const type = pickPlagueType(seed + 11);
  const config = type === PlagueType.BUBONIC
    ? PLAGUE_CONFIG.BUBONIC
    : type === PlagueType.PNEUMONIC
      ? PLAGUE_CONFIG.PNEUMONIC
      : PLAGUE_CONFIG.SEPTICEMIC;
  const incubationHoursRaw = sampleHours(config.incubationDays.min, config.incubationDays.max, seed + 29);
  const deathHoursFromExposureRaw = sampleHours(config.deathDay.min, config.deathDay.max, seed + 47);
  const incubationHours = Math.min(
    NPC_MAX_INCUBATION_HOURS,
    Math.max(NPC_MIN_INCUBATION_HOURS, incubationHoursRaw * NPC_PLAGUE_TIME_SCALE)
  );
  const scaledDeathFromExposure = Math.min(
    NPC_MAX_DEATH_HOURS,
    Math.max(incubationHours + NPC_MIN_DEATH_HOURS, deathHoursFromExposureRaw * NPC_PLAGUE_TIME_SCALE)
  );
  const deathHours = Math.max(NPC_MIN_DEATH_HOURS, scaledDeathFromExposure - incubationHours);
  return {
    plagueType: type,
    exposureTime: simTime,
    incubationHours,
    deathHours,
    onsetTime: null
  };
};

export const resetNpcPlagueMeta = (record: NPCRecord) => {
  record.plagueMeta = { ...DEFAULT_PLAGUE_META };
};

export const ensureNpcPlagueMeta = (record: NPCRecord, simTime: number) => {
  if (record.plagueMeta && record.plagueMeta.plagueType !== PlagueType.NONE) return;
  const seed = hashStringToSeed(record.id) + Math.floor(simTime * 10);
  record.plagueMeta = createNpcPlagueMeta(seed, simTime);
};

export const seedNpcInfection = (record: NPCRecord, simTime: number, seedOverride?: number) => {
  const seed = seedOverride ?? (hashStringToSeed(record.id) + Math.floor(simTime * 10));
  record.state = AgentState.INCUBATING;
  record.stateStartTime = simTime;
  record.plagueMeta = createNpcPlagueMeta(seed, simTime);
};

export const seedNpcInfectedNearDeath = (record: NPCRecord, simTime: number, seedOverride?: number) => {
  const seed = seedOverride ?? (hashStringToSeed(record.id) + Math.floor(simTime * 10));
  const meta = createNpcPlagueMeta(seed, simTime);
  const elapsed = Math.max(0.5, meta.deathHours * 0.8);
  record.state = AgentState.INFECTED;
  record.stateStartTime = simTime;
  record.plagueMeta = {
    ...meta,
    onsetTime: simTime - elapsed,
    exposureTime: simTime - elapsed - (meta.incubationHours ?? 0)
  };
};

export const applyHouseholdExposure = (
  record: NPCRecord,
  simTime: number,
  exposureHours: number,
  seedOffset = 0
) => {
  if (record.state !== AgentState.HEALTHY) return false;
  const seed = hashStringToSeed(record.id) + seedOffset + Math.floor(simTime * 10);
  const chance = Math.min(0.95, HOUSEHOLD_EXPOSURE_PER_HOUR * exposureHours);
  if (seededRand(seed) < chance) {
    seedNpcInfection(record, simTime, seed);
    return true;
  }
  return false;
};

export const advanceNpcHealth = (record: NPCRecord, simTime: number) => {
  let plagueMeta = record.plagueMeta;

  if (record.state === AgentState.INCUBATING) {
    if (!record.plagueMeta || record.plagueMeta.plagueType === PlagueType.NONE) {
      ensureNpcPlagueMeta(record, simTime);
    }
    plagueMeta = record.plagueMeta;
    const exposureTime = plagueMeta?.exposureTime ?? record.stateStartTime;
    const incubationHours = plagueMeta?.incubationHours ?? CONSTANTS.HOURS_TO_INFECTED;
    if (simTime - exposureTime >= incubationHours) {
      record.state = AgentState.INFECTED;
      record.stateStartTime = simTime;
      record.plagueMeta = {
        ...(plagueMeta ?? DEFAULT_PLAGUE_META),
        plagueType: plagueMeta?.plagueType ?? PlagueType.BUBONIC,
        exposureTime,
        incubationHours,
        onsetTime: simTime,
        deathHours: plagueMeta?.deathHours ?? (CONSTANTS.HOURS_TO_DEATH - CONSTANTS.HOURS_TO_INFECTED)
      };
      return true;
    }
  }

  if (record.state === AgentState.INFECTED) {
    const onsetTime = plagueMeta?.onsetTime ?? record.stateStartTime;
    const deathHours = plagueMeta?.deathHours ?? (CONSTANTS.HOURS_TO_DEATH - CONSTANTS.HOURS_TO_INFECTED);
    if (simTime - onsetTime >= deathHours) {
      record.state = AgentState.DECEASED;
      record.stateStartTime = simTime;
      return true;
    }
  }

  return false;
};
