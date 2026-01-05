import { NPCRecord, SocialClass } from '../types';
import { seededRandom } from './procedural';

const isNightWorker = (profession: string) => /guard|watch|night|mamluk/i.test(profession);
const isClergy = (socialClass: SocialClass, profession: string) => socialClass === SocialClass.CLERGY || /imam|qadi|mufti|madrasa|muezzin/i.test(profession);
const isMerchant = (socialClass: SocialClass) => socialClass === SocialClass.MERCHANT;

const inTimeWindow = (timeOfDay: number, start: number, end: number) => {
  if (start <= end) return timeOfDay >= start && timeOfDay < end;
  return timeOfDay >= start || timeOfDay < end;
};

// Check if NPC is a child based on profession
const isChild = (profession: string) => /child|youth|apprentice/i.test(profession);
// Check if NPC is an elder
const isElder = (profession: string, age: number) => /elder/i.test(profession) || age >= 60;

export const shouldNpcBeHome = (record: NPCRecord, timeOfDay: number) => {
  if (!record.homeBuildingId) return false;
  if (record.role === 'worshipper') return false;

  const rand = seededRandom(record.scheduleSeed);
  const variance = (rand - 0.5) * 1.5;

  // Family members have special schedules
  if (record.role === 'family') {
    const hourRand = seededRandom(record.scheduleSeed + Math.floor(timeOfDay));

    // Children stay home most of the time (90%)
    if (isChild(record.stats.profession)) {
      return hourRand > 0.1;
    }

    // Elders stay home most of the time (85%), occasional mosque visits
    if (isElder(record.stats.profession, record.stats.age)) {
      return hourRand > 0.15;
    }

    // Spouse: home-focused but may go to market during day
    // Home at night (20:00-6:00), 60% chance home during day
    if (timeOfDay < 6 || timeOfDay >= 20) {
      return true; // Always home at night
    }
    return hourRand > 0.4; // 60% chance home during day
  }

  let homeStart = 20 + variance;
  let homeEnd = 6 + variance;

  if (isNightWorker(record.stats.profession)) {
    homeStart = 7 + variance;
    homeEnd = 15 + variance;
  } else if (isClergy(record.stats.socialClass, record.stats.profession)) {
    homeStart = 21 + variance;
    homeEnd = 7 + variance;
  } else if (isMerchant(record.stats.socialClass)) {
    homeStart = 19 + variance;
    homeEnd = 6.5 + variance;
  } else if (record.stats.socialClass === SocialClass.PEASANT) {
    homeStart = 18.5 + variance;
    homeEnd = 5.5 + variance;
  }

  const normalizedStart = (homeStart + 24) % 24;
  const normalizedEnd = (homeEnd + 24) % 24;
  return inTimeWindow(timeOfDay, normalizedStart, normalizedEnd);
};
