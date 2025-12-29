/**
 * Plague Progression System
 * Historically and biologically accurate simulation of Yersinia pestis (Black Death)
 * Based on 14th century Damascus outbreak patterns
 */

import { AgentState, PlagueType, BuboLocation, PlagueStatus } from '../types';
import { seededRandom } from './procedural';

// Game time constants (assumed - adjust based on your game's time system)
export const GAME_DAY_LENGTH = 60; // seconds per game day (adjust to match your simulation)

// Historical plague progression data
export const PLAGUE_CONFIG = {
  BUBONIC: {
    incubationDays: { min: 2, max: 6 },
    symptomsOnsetDay: 4,
    buboCriticalDay: 7,
    deathDay: { min: 8, max: 12 },
    baseMortality: 0.7, // 70% without treatment
    lancedMortality: 0.4, // 40% if bubo lanced
  },
  PNEUMONIC: {
    incubationDays: { min: 1, max: 3 },
    symptomsOnsetDay: 2,
    deathDay: { min: 3, max: 5 },
    baseMortality: 0.95, // 95% mortality
  },
  SEPTICEMIC: {
    incubationDays: { min: 1, max: 2 },
    deathDay: { min: 2, max: 3 },
    baseMortality: 0.98, // 98% mortality
  }
};

/**
 * Initialize a healthy plague status
 */
export function initializePlague(): PlagueStatus {
  return {
    plagueType: PlagueType.NONE,
    state: AgentState.HEALTHY,
    exposureTime: null,
    onsetTime: null,
    daysInfected: 0,
    buboLocation: BuboLocation.NONE,
    buboBurst: false,
    fever: 0,
    weakness: 0,
    buboes: 0,
    coughingBlood: 0,
    skinBleeding: 0,
    delirium: 0,
    gangrene: 0,
    overallSeverity: 0,
    survivalChance: 100,
  };
}

/**
 * Expose player to plague
 * @param currentPlague Current plague status
 * @param exposureType Type of exposure
 * @param intensity Exposure intensity (0-1)
 * @param currentTime Current game time
 * @param seed Optional seed for deterministic RNG (for reproducibility)
 * @returns Updated plague status
 */
export function exposePlayerToPlague(
  currentPlague: PlagueStatus,
  exposureType: 'flea' | 'airborne' | 'contact',
  intensity: number,
  currentTime: number,
  seed?: number
): PlagueStatus {
  // Already infected
  if (currentPlague.state !== AgentState.HEALTHY) return currentPlague;

  // Use seeded RNG for deterministic results when seed provided
  let rngSeed = seed ?? Math.floor(Math.random() * 1000000);
  const rand = () => seededRandom(rngSeed++);

  // Exposure chance based on type and intensity
  const exposureChances = {
    flea: 0.3 * intensity,      // 30% base for flea bite
    airborne: 0.6 * intensity,  // 60% for pneumonic exposure
    contact: 0.1 * intensity    // 10% for corpse/item contact
  };

  if (rand() > exposureChances[exposureType]) {
    return currentPlague; // Exposure failed
  }

  // Determine plague type based on exposure
  let plagueType: PlagueType;
  if (exposureType === 'airborne') {
    plagueType = PlagueType.PNEUMONIC; // Always pneumonic from airborne
  } else {
    const roll = rand();
    if (roll < 0.80) plagueType = PlagueType.BUBONIC;
    else if (roll < 0.95) plagueType = PlagueType.PNEUMONIC;
    else plagueType = PlagueType.SEPTICEMIC;
  }

  // Determine bubo location if bubonic
  let buboLocation = BuboLocation.NONE;
  if (plagueType === PlagueType.BUBONIC) {
    const locationRoll = rand();
    if (locationRoll < 0.6) buboLocation = BuboLocation.GROIN;
    else if (locationRoll < 0.9) buboLocation = BuboLocation.ARMPIT;
    else buboLocation = BuboLocation.NECK;
  }

  return {
    plagueType,
    state: AgentState.INCUBATING,
    exposureTime: currentTime,
    onsetTime: null,
    daysInfected: 0,
    buboLocation,
    buboBurst: false,
    fever: 0,
    weakness: 0,
    buboes: 0,
    coughingBlood: 0,
    skinBleeding: 0,
    delirium: 0,
    gangrene: 0,
    overallSeverity: 0,
    survivalChance: plagueType === PlagueType.BUBONIC ? 40 : plagueType === PlagueType.PNEUMONIC ? 5 : 2,
  };
}

/**
 * Progress plague over time
 * Called each game loop/day
 */
export function progressPlague(
  currentPlague: PlagueStatus,
  simTime: number
): PlagueStatus {
  if (currentPlague.state === AgentState.HEALTHY || currentPlague.state === AgentState.DECEASED) {
    return currentPlague;
  }

  const newPlague = { ...currentPlague };

  // === INCUBATION PHASE ===
  if (currentPlague.state === AgentState.INCUBATING) {
    const daysSinceExposure = (simTime - currentPlague.exposureTime!) / GAME_DAY_LENGTH;

    // Determine onset day based on plague type
    let symptomsOnsetDay: number;
    if (currentPlague.plagueType === PlagueType.BUBONIC) {
      symptomsOnsetDay = PLAGUE_CONFIG.BUBONIC.symptomsOnsetDay;
    } else if (currentPlague.plagueType === PlagueType.PNEUMONIC) {
      symptomsOnsetDay = PLAGUE_CONFIG.PNEUMONIC.symptomsOnsetDay;
    } else { // SEPTICEMIC
      symptomsOnsetDay = 1.5; // Very rapid onset
    }

    if (daysSinceExposure >= symptomsOnsetDay) {
      newPlague.state = AgentState.INFECTED;
      newPlague.onsetTime = simTime;
      newPlague.daysInfected = 0;

      // Initial symptoms based on type
      if (currentPlague.plagueType === PlagueType.BUBONIC) {
        newPlague.fever = 60;
        newPlague.weakness = 50;
        newPlague.buboes = 30; // Small swelling appears
      } else if (currentPlague.plagueType === PlagueType.PNEUMONIC) {
        newPlague.fever = 70;
        newPlague.weakness = 60;
        newPlague.coughingBlood = 40;
      } else { // SEPTICEMIC
        newPlague.fever = 80;
        newPlague.skinBleeding = 60;
        newPlague.weakness = 70;
      }
    }
    return newPlague;
  }

  // === INFECTED PHASE ===
  if (currentPlague.state === AgentState.INFECTED) {
    const daysInfected = (simTime - currentPlague.onsetTime!) / GAME_DAY_LENGTH;
    newPlague.daysInfected = Math.floor(daysInfected);

    if (currentPlague.plagueType === PlagueType.BUBONIC) {
      // Day 0-2: Onset
      if (daysInfected < 2) {
        newPlague.fever = 60 + daysInfected * 10;
        newPlague.weakness = 50 + daysInfected * 15;
        newPlague.buboes = 30 + daysInfected * 20; // Swelling grows
      }
      // Day 2-4: Bubo formation (critical period)
      else if (daysInfected < 4) {
        newPlague.fever = 80 + (daysInfected - 2) * 5;
        newPlague.weakness = 70 + (daysInfected - 2) * 10;
        newPlague.buboes = 70 + (daysInfected - 2) * 15; // Peak swelling

        // Buboes may burst naturally (20% chance per day after day 3)
        if (daysInfected >= 3 && !newPlague.buboBurst && Math.random() < 0.2) {
          newPlague.buboBurst = true;
        }
      }
      // Day 4-7: Critical - secondary symptoms
      else if (daysInfected < 7) {
        newPlague.fever = 85;
        newPlague.weakness = 90;
        newPlague.buboes = newPlague.buboBurst ? 60 : 95; // Smaller if burst
        newPlague.skinBleeding = 30 + (daysInfected - 4) * 15;
        newPlague.delirium = 40 + (daysInfected - 4) * 20;

        // Gangrene appears late
        if (daysInfected >= 6) {
          newPlague.gangrene = (daysInfected - 6) * 30;
        }
      }
      // Day 7+: Death or recovery
      else {
        const mortality = newPlague.buboBurst
          ? PLAGUE_CONFIG.BUBONIC.lancedMortality
          : PLAGUE_CONFIG.BUBONIC.baseMortality;

        if (Math.random() < mortality * 0.1) { // 10% of mortality rate per day check
          newPlague.state = AgentState.DECEASED;
        } else if (daysInfected > 10) {
          // Recovery begins - symptoms decrease
          newPlague.fever = Math.max(0, newPlague.fever - 10);
          newPlague.weakness = Math.max(0, newPlague.weakness - 8);
          newPlague.buboes = Math.max(0, newPlague.buboes - 15);
        }
      }

      // Calculate survival chance
      newPlague.survivalChance = newPlague.buboBurst ? 60 : 30;
      if (daysInfected > 10) newPlague.survivalChance = newPlague.buboBurst ? 80 : 20;
    }

    else if (currentPlague.plagueType === PlagueType.PNEUMONIC) {
      // Rapid progression
      newPlague.fever = Math.min(95, 70 + daysInfected * 12);
      newPlague.weakness = Math.min(95, 60 + daysInfected * 15);
      newPlague.coughingBlood = Math.min(95, 40 + daysInfected * 20);
      newPlague.delirium = Math.min(90, daysInfected * 25);

      // Death usually by day 3-5
      if (daysInfected >= 3 && Math.random() < 0.5) { // 50% chance per day after day 3
        newPlague.state = AgentState.DECEASED;
      }

      newPlague.survivalChance = Math.max(5, 40 - daysInfected * 10);
    }

    else if (currentPlague.plagueType === PlagueType.SEPTICEMIC) {
      // Very rapid progression
      newPlague.fever = Math.min(95, 80 + daysInfected * 8);
      newPlague.skinBleeding = Math.min(95, 60 + daysInfected * 18);
      newPlague.gangrene = Math.min(95, daysInfected * 35);
      newPlague.weakness = Math.min(95, 70 + daysInfected * 13);
      newPlague.delirium = Math.min(95, daysInfected * 30);

      // Death usually by day 2-3
      if (daysInfected >= 2) {
        newPlague.state = AgentState.DECEASED;
      }

      newPlague.survivalChance = Math.max(2, 15 - daysInfected * 7);
    }

    // Calculate overall severity for UI
    newPlague.overallSeverity = Math.max(
      newPlague.fever,
      newPlague.weakness,
      newPlague.buboes,
      newPlague.coughingBlood,
      newPlague.skinBleeding,
      newPlague.delirium,
      newPlague.gangrene
    );
  }

  return newPlague;
}

/**
 * Attempt to treat plague with medieval remedies
 */
export function attemptTreatment(
  currentPlague: PlagueStatus,
  treatmentType: 'lanceBubo' | 'rest' | 'herbs' | 'bloodletting' | 'prayer'
): PlagueStatus {
  if (currentPlague.state !== AgentState.INFECTED) return currentPlague;

  const newPlague = { ...currentPlague };

  switch (treatmentType) {
    case 'lanceBubo':
      if (currentPlague.plagueType === PlagueType.BUBONIC && !currentPlague.buboBurst && currentPlague.buboes > 60) {
        newPlague.buboBurst = true;
        newPlague.buboes -= 20;
        newPlague.survivalChance += 30; // Improves from 30% to 60%
      }
      break;

    case 'rest':
      newPlague.weakness = Math.max(0, newPlague.weakness - 5);
      break;

    case 'herbs':
      newPlague.fever = Math.max(0, newPlague.fever - 5);
      break;

    case 'bloodletting':
      // Actually harmful!
      newPlague.weakness = Math.min(100, newPlague.weakness + 10);
      newPlague.fever = Math.max(0, newPlague.fever - 3);
      break;

    case 'prayer':
      // Psychological comfort only
      newPlague.delirium = Math.max(0, newPlague.delirium - 3);
      break;
  }

  return newPlague;
}

/**
 * Get display labels for symptoms
 */
export function getSymptomLabels(plague: PlagueStatus): string[] {
  const symptoms: string[] = [];

  if (plague.fever > 40) symptoms.push('🔥 Fever');
  if (plague.buboes > 30) {
    const location = plague.buboLocation === BuboLocation.GROIN ? 'Groin' :
                     plague.buboLocation === BuboLocation.ARMPIT ? 'Armpit' : 'Neck';
    symptoms.push(`💉 ${location} Bubo${plague.buboBurst ? ' (burst)' : ''}`);
  }
  if (plague.weakness > 40) symptoms.push('😓 Weakness');
  if (plague.coughingBlood > 30) symptoms.push('🫁 Bloody Cough');
  if (plague.skinBleeding > 35) symptoms.push('🩸 Bleeding');
  if (plague.delirium > 40) symptoms.push('😵‍💫 Delirium');
  if (plague.gangrene > 40) symptoms.push('☠️ Gangrene');

  return symptoms.slice(0, 3); // Top 3
}

/**
 * Get health status label
 */
export function getHealthStatusLabel(plague: PlagueStatus): string {
  if (plague.state === AgentState.HEALTHY) return 'SOUND';
  if (plague.state === AgentState.INCUBATING) return 'FAIR';
  if (plague.state === AgentState.DECEASED) return 'DECEASED';

  // INFECTED states
  if (plague.overallSeverity < 40) return 'INFECTED';
  if (plague.overallSeverity < 70) return 'SEVERE';
  return 'CRITICAL';
}

/**
 * Get plague type display name
 */
export function getPlagueTypeLabel(plagueType: PlagueType): string {
  switch (plagueType) {
    case PlagueType.BUBONIC: return 'BUBONIC';
    case PlagueType.PNEUMONIC: return 'PNEUMONIC';
    case PlagueType.SEPTICEMIC: return 'SEPTICEMIC';
    default: return 'NONE';
  }
}
