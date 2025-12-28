import { NPCRecord, SocialClass } from '../types';
import { seededRandom } from './procedural';

const isNightWorker = (profession: string) => /guard|watch|night|mamluk/i.test(profession);
const isClergy = (socialClass: SocialClass, profession: string) => socialClass === SocialClass.CLERGY || /imam|qadi|mufti|madrasa|muezzin/i.test(profession);
const isMerchant = (socialClass: SocialClass) => socialClass === SocialClass.MERCHANT;

const inTimeWindow = (timeOfDay: number, start: number, end: number) => {
  if (start <= end) return timeOfDay >= start && timeOfDay < end;
  return timeOfDay >= start || timeOfDay < end;
};

export const shouldNpcBeHome = (record: NPCRecord, timeOfDay: number) => {
  if (!record.homeBuildingId) return false;
  if (record.role === 'worshipper') return false;

  const rand = seededRandom(record.scheduleSeed);
  const variance = (rand - 0.5) * 1.5;

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
