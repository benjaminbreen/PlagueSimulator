
import { BuildingType, BuildingMetadata, SocialClass, NPCStats, PlayerStats, DistrictType, getDistrictType } from '../types';

const FIRST_NAMES_MALE = ['Ahmad', 'Yusuf', 'Ibrahim', 'Umar', 'Hassan', 'Mahmud', 'Zayd', 'Malik', 'Nasir', 'Suleiman'];
const FIRST_NAMES_FEMALE = ['Fatima', 'Zaynab', 'Maryam', 'Aisha', 'Khadija', 'Layla', 'Salma', 'Hafsa', 'Raya', 'Nura'];
const LAST_NAMES = ['Al-Dimashqi', 'Al-Halabi', 'Al-Baghdadi', 'Al-Suri', 'Al-Farsi', 'Al-Andalusi', 'Al-Misri', 'Ibn Khaldun', 'Al-Bakri'];

const COMMERCIAL_PROFESSIONS = [
  'Spice Merchant',
  'Draper',
  'Baker',
  'Blacksmith',
  'Coppersmith',
  'Weaver',
  'Carpenter',
  'Potter',
  'Innkeeper',
  'Khan Warden',
  'Sherbet Seller',
  'Sherbet House Keeper',
  'Caravanserai Keeper',
  // Damascus-specific trades (historically accurate)
  'Apothecary',           // Medicine, herbs, remedies
  'Perfumer',             // Oils, incense, fragrances (Suq al-Attarin)
  'Silk Merchant',        // Damascus silk was famous
  'Glassblower',          // Damascus glasswork renowned
  'Soap Maker',           // Damascus soap (sabun) exported throughout region
  'Rug Merchant',         // Carpets, prayer rugs
  'Jeweler',              // Precious metals, gems
  'Leather Worker',       // Saddles, bags, shoes
  'Barber-Surgeon',       // Medical care and grooming
  'Locksmith',            // Intricate metalwork, keys
  'Oil Presser',          // Olive oil, sesame oil
];
const RESIDENTIAL_PROFESSIONS = ['Day-Laborer', 'Water-Carrier', 'Copyist', 'Tanner', 'Unemployed', 'City Guard', 'Mamluk Soldier', 'Retired Guard'];
const CLERGY_PROFESSIONS = ['Imam', 'Qadi', 'Mufti', 'Muezzin', 'Qur\'an Reciter', 'Madrasa Teacher'];

// Religious building professions (architecture-specific)
const RELIGIOUS_PROFESSIONS = [
  'Imam',                    // Neighborhood mosque (masjid)
  'Friday Mosque Imam',      // Large Friday mosque (jami)
  'Madrasa Director',        // Islamic school/college
  'Shaykh',                  // Sufi lodge (zawiya)
  'Shrine Keeper',           // Mausoleum/tomb (maqam)
];

// Civic building professions (public services and government)
const CIVIC_PROFESSIONS = [
  'Mamluk Governor',         // Military/political headquarters
  'Court Qadi',              // Court/tribunal
  'Notary',                  // Legal documents, contracts
  'Court Physician',         // Medical clinic
  'Market Inspector',        // Muhtasib - enforces fair trade
  'Hammam Keeper',           // Public bath
  'Fountain Keeper',         // Public fountain (sabil)
];
const MOODS = ['Fearful', 'Anxious', 'Determined', 'Exhausted', 'Pious', 'Sullen', 'Grateful', 'Stoic'];
const FAMILY_STRUCTURES = [
  'No immediate family noted',
  'Widowed, one child',
  'Married, two children',
  'Married, three children',
  'Extended family in household',
  'Single, elder parent',
];
const HEALTH_STATUSES = ['Sound', 'Wary', 'Recovering', 'Stressed', 'Healthy'];

export const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PROFESSION_TAGS: Record<string, Array<'military' | 'cleric' | 'artisan' | 'service' | 'noble' | 'youth' | 'retired'>> = {
  'Day-Laborer': ['service'],
  'Water-Carrier': ['service'],
  'Copyist': ['service'],
  'Tanner': ['artisan'],
  'Unemployed': ['service'],
  'City Guard': ['military'],
  'Mamluk Soldier': ['military'],
  'Retired Guard': ['military', 'retired'],
  'Spice Merchant': ['service'],
  'Draper': ['artisan'],
  'Baker': ['artisan'],
  'Blacksmith': ['artisan'],
  'Coppersmith': ['artisan'],
  'Weaver': ['artisan'],
  'Carpenter': ['artisan'],
  'Potter': ['artisan'],
  'Innkeeper': ['service'],
  'Khan Warden': ['service'],
  'Sherbet Seller': ['service'],
  'Sherbet House Keeper': ['service'],
  'Caravanserai Keeper': ['service'],
  'Imam': ['cleric'],
  'Qadi': ['cleric'],
  'Mufti': ['cleric'],
  'Muezzin': ['cleric'],
  'Qur\'an Reciter': ['cleric'],
  'Madrasa Teacher': ['cleric'],
  'Estate Steward': ['noble', 'service'],
  'Court Clerk': ['noble', 'service'],
  'Mamluk Officer': ['noble', 'military'],
  'Spinner': ['artisan'],
  'Bread Seller': ['service'],
  'Servant': ['service'],
  'Water-Bearer': ['service'],
  'Laundry Worker': ['service'],
  'Textile Trader': ['service'],
  'Herbalist': ['artisan'],
  'Midwife': ['service'],
  'Dyer\'s Assistant': ['artisan'],
  'Charity Worker': ['service'],
  'Qur\'an Teacher': ['cleric'],
  'Household Manager': ['noble', 'service'],
  'Tutor': ['noble', 'service'],
  'Porter': ['service'],
  'Shepherd': ['service'],
  'Apprentice Tanner': ['youth', 'artisan'],
  'Apprentice Potter': ['youth', 'artisan'],
  'Apprentice Carpenter': ['youth', 'artisan'],
  'Apprentice Shepherd': ['youth', 'service'],
  'Apprentice Draper': ['youth', 'artisan'],
  'Apprentice Coppersmith': ['youth', 'artisan'],
  'Apprentice Dyer': ['youth', 'artisan'],
  'Apprentice Weaver': ['youth', 'artisan'],
  'Apprentice Spinner': ['youth', 'artisan'],
  'Errand Runner': ['youth', 'service'],
  'Household Helper': ['youth', 'service'],
  'Laundry Helper': ['youth', 'service'],
  'Novice Student': ['youth', 'cleric'],
  'Page': ['youth', 'noble'],
  'Household Apprentice': ['youth', 'noble'],
  'Tutor\'s Assistant': ['youth', 'noble'],
};

const PROFESSION_RULES: Record<string, { minAge?: number; maxAge?: number; gender?: 'Male' | 'Female'; classes?: SocialClass[] }> = {
  'Retired Guard': { minAge: 45, gender: 'Male' },
  'City Guard': { minAge: 18, maxAge: 45, gender: 'Male' },
  'Mamluk Soldier': { minAge: 18, maxAge: 45, gender: 'Male' },
  'Mamluk Officer': { minAge: 25, gender: 'Male', classes: [SocialClass.NOBILITY] },
  'Imam': { minAge: 25, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Qadi': { minAge: 30, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Mufti': { minAge: 35, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Muezzin': { minAge: 18, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Qur\'an Reciter': { minAge: 18, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Madrasa Teacher': { minAge: 25, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Court Clerk': { minAge: 22, classes: [SocialClass.NOBILITY] },
  'Estate Steward': { minAge: 25, classes: [SocialClass.NOBILITY] },
  'Household Manager': { minAge: 25, gender: 'Female', classes: [SocialClass.NOBILITY] },
  'Tutor': { minAge: 20, classes: [SocialClass.NOBILITY] },
  'Midwife': { minAge: 18, gender: 'Female' },
  'Charity Worker': { minAge: 18, gender: 'Female', classes: [SocialClass.CLERGY] },
};

const YOUTH_PROFESSIONS: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
  [SocialClass.PEASANT]: {
    Male: ['Errand Runner', 'Apprentice Tanner', 'Apprentice Potter', 'Apprentice Carpenter', 'Apprentice Shepherd'],
    Female: ['Household Helper', 'Apprentice Weaver', 'Apprentice Spinner', 'Laundry Helper'],
  },
  [SocialClass.MERCHANT]: {
    Male: ['Errand Runner', 'Apprentice Draper', 'Apprentice Coppersmith', 'Apprentice Weaver'],
    Female: ['Household Helper', 'Apprentice Weaver', 'Apprentice Dyer'],
  },
  [SocialClass.CLERGY]: {
    Male: ['Novice Student', 'Errand Runner'],
    Female: ['Household Helper'],
  },
  [SocialClass.NOBILITY]: {
    Male: ['Page', 'Household Apprentice'],
    Female: ['Household Apprentice', 'Tutor\'s Assistant'],
  },
};

const isEligible = (profession: string, age: number, gender: 'Male' | 'Female', socialClass: SocialClass) => {
  const rules = PROFESSION_RULES[profession];
  if (!rules) return true;
  if (rules.gender && rules.gender !== gender) return false;
  if (rules.minAge !== undefined && age < rules.minAge) return false;
  if (rules.maxAge !== undefined && age > rules.maxAge) return false;
  if (rules.classes && !rules.classes.includes(socialClass)) return false;
  return true;
};

const chooseProfession = (
  pool: string[],
  age: number,
  gender: 'Male' | 'Female',
  socialClass: SocialClass,
  rand: () => number
) => {
  if (age < 16) {
    const youthPool = YOUTH_PROFESSIONS[socialClass][gender];
    return youthPool[Math.floor(rand() * youthPool.length)];
  }
  const filtered = pool.filter((p) => isEligible(p, age, gender, socialClass));
  const pickPool = filtered.length > 0 ? filtered : pool;
  if (age >= 50) {
    const elderPool = pickPool.filter((p) => PROFESSION_TAGS[p]?.includes('retired'));
    if (elderPool.length > 0) {
      return elderPool[Math.floor(rand() * elderPool.length)];
    }
  }
  return pickPool[Math.floor(rand() * pickPool.length)];
};

export const generateNPCStats = (seed: number, context?: { districtType?: DistrictType }): NPCStats => {
  let s = seed;
  const rand = () => seededRandom(s++);

  const gender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';
  const name = gender === 'Male' 
    ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
    : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;

  const age = Math.floor(rand() * 50) + 12;
  const classRand = rand();
  let socialClass = SocialClass.PEASANT;
  const districtType = context?.districtType;
  if (districtType === 'WEALTHY') {
    if (classRand > 0.7) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.35) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.2) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'HOVELS') {
    if (classRand > 0.995) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.95) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.9) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'CIVIC') {
    if (classRand > 0.82) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.6) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.4) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'MARKET') {
    if (classRand > 0.96) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.45) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.3) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'ALLEYS') {
    if (classRand > 0.985) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.8) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.65) socialClass = SocialClass.CLERGY;
  } else {
    if (classRand > 0.95) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.7) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.6) socialClass = SocialClass.CLERGY;
  }

  const professionPoolsByClass: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
    [SocialClass.PEASANT]: {
      Male: ['Day-Laborer', 'Water-Carrier', 'Tanner', 'Copyist', 'Porter', 'Shepherd'],
      Female: ['Spinner', 'Bread Seller', 'Servant', 'Water-Bearer', 'Laundry Worker'],
    },
    [SocialClass.MERCHANT]: {
      Male: COMMERCIAL_PROFESSIONS,
      Female: ['Textile Trader', 'Herbalist', 'Midwife', 'Dyer\'s Assistant', 'Bread Seller'],
    },
    [SocialClass.CLERGY]: {
      Male: CLERGY_PROFESSIONS,
      Female: ['Charity Worker'],
    },
    [SocialClass.NOBILITY]: {
      Male: ['Estate Steward', 'Court Clerk', 'Mamluk Officer'],
      Female: ['Household Manager', 'Tutor'],
    },
  };
  const professionPool = professionPoolsByClass[socialClass][gender];
  const profession = chooseProfession(professionPool, age, gender, socialClass, rand);
  const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(profession);
  const isSoldier = /Guard|Soldier|Mamluk/i.test(profession);
  const isOfficer = /Officer/i.test(profession);
  const isMerchant = /(Merchant|Draper|Trader|Khan|Caravanserai|Innkeeper|Sherbet)/i.test(profession);
  const isLaborer = /(Day-Laborer|Water-Carrier|Tanner|Porter|Unemployed|Bread Seller|Laundry|Servant|Water-Bearer)/i.test(profession);
  const isArtisan = /(Blacksmith|Coppersmith|Weaver|Carpenter|Potter|Dyer|Tanner)/i.test(profession);
  const isBlacksmith = /Blacksmith/i.test(profession);
  const isBaker = /Baker/i.test(profession);
  const isCarpenter = /Carpenter/i.test(profession);
  const isShepherd = /Shepherd/i.test(profession);

  // Height and weight scales
  const heightBase = age < 18 ? 0.6 + (age / 18) * 0.3 : 0.9 + rand() * 0.2;
  const weightBase = rand() * 0.4 + 0.8;
  const robeSpreadBase = socialClass === SocialClass.NOBILITY ? 1.08
    : socialClass === SocialClass.MERCHANT ? 1.0
    : socialClass === SocialClass.CLERGY ? 0.95
    : 0.9;
  const robeSpread = gender === 'Female'
    ? (() => {
        const roll = rand();
        const narrowBias = socialClass === SocialClass.PEASANT ? 0.7 : socialClass === SocialClass.MERCHANT ? 0.6 : socialClass === SocialClass.NOBILITY ? 0.45 : 0.55;
        const wideBias = socialClass === SocialClass.NOBILITY ? 0.18 : 0.08;
        if (roll < narrowBias) {
          const extraNarrow = rand() < 0.6;
          return extraNarrow
            ? clamp(0.52 + rand() * 0.12 + (weightBase - 0.8) * 0.12, 0.5, 0.7)
            : clamp(0.62 + rand() * 0.16 + (weightBase - 0.8) * 0.18, 0.58, 0.85);
        }
        if (roll > 1 - wideBias) {
          return clamp(1.02 + rand() * 0.2 + (weightBase - 0.8) * 0.35, 0.95, 1.25);
        }
        return clamp(0.78 + rand() * 0.16 + (weightBase - 0.8) * 0.2, 0.72, 1.0);
      })()
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.4 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.75 : 0.4);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' = (() => {
    if (rand() > 0.75) {
      const patternPool: Array<'stripe' | 'chevron' | 'damask'> = gender === 'Female'
        ? ['stripe', 'chevron', 'damask']
        : ['stripe', 'chevron'];
      const pick = patternPool[Math.floor(rand() * patternPool.length)];
      return pick;
    }
    return 'none';
  })();
  let sleeveCoverage: 'full' | 'lower' | 'none' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.35 ? 'full' : 'lower')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.45 ? 'full' : 'lower')
    : socialClass === SocialClass.CLERGY ? (rand() > 0.5 ? 'full' : 'lower')
    : rand() > 0.7 ? 'none' : 'lower';

  const hairStyle: 'short' | 'medium' | 'long' | 'covered' = gender === 'Female'
    ? 'covered'
    : (age > 45 ? (rand() > 0.6 ? 'short' : 'medium')
      : profession.includes('Laborer') || profession.includes('Porter') || profession.includes('Guard')
        ? (rand() > 0.7 ? 'medium' : 'short')
        : socialClass === SocialClass.NOBILITY ? (rand() > 0.4 ? 'medium' : 'long')
        : socialClass === SocialClass.CLERGY ? (rand() > 0.6 ? 'short' : 'medium')
        : rand() > 0.5 ? 'medium' : 'short');
  let headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none' = gender === 'Female'
    ? 'scarf'
    : (() => {
        const roll = rand();
        if (roll < 0.15) return 'fez';
        if (roll < 0.25 && socialClass === SocialClass.PEASANT) return 'straw';
        if (roll < 0.45) return 'taqiyah'; // Common simple skullcap
        if (socialClass === SocialClass.NOBILITY) return rand() > 0.3 ? 'turban' : 'cap';
        if (socialClass === SocialClass.CLERGY) return rand() > 0.5 ? 'turban' : 'taqiyah';
        return rand() > 0.5 ? 'cap' : rand() > 0.7 ? 'turban' : 'none';
      })();
  let footwearStyle: 'sandals' | 'shoes' | 'bare' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.2 ? 'shoes' : 'sandals')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.3 ? 'shoes' : 'sandals')
    : rand() > 0.8 ? 'bare' : 'sandals';
  let footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  const applyFootwear = (style: 'sandals' | 'shoes' | 'bare') => {
    footwearStyle = style;
    footwearColor = style === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  };

  if (districtType === 'HOVELS') {
    robePattern = 'none';
  } else if (districtType === 'WEALTHY' && robePattern === 'none') {
    robePattern = gender === 'Female' ? (rand() > 0.5 ? 'damask' : 'stripe') : 'stripe';
  } else if (districtType === 'MARKET' && robePattern === 'none' && rand() > 0.6) {
    robePattern = 'stripe';
  }

  if (isReligiousLeader) {
    headwearStyle = 'turban';
    robePattern = 'none';
    sleeveCoverage = 'full';
    applyFootwear('shoes');
  } else if (isSoldier) {
    headwearStyle = isOfficer ? 'turban' : 'cap';
    robePattern = isOfficer ? 'stripe' : robePattern;
    sleeveCoverage = 'full';
    applyFootwear('shoes');
  } else if (isMerchant) {
    headwearStyle = 'fez';
    if (rand() > 0.6 && robePattern === 'none') robePattern = 'stripe';
  } else if (isLaborer) {
    headwearStyle = rand() > 0.6 ? 'cap' : 'none';
    sleeveCoverage = rand() > 0.4 ? 'lower' : 'none';
  } else if (isArtisan) {
    headwearStyle = rand() > 0.7 ? 'cap' : 'none';
  }


  const accessoryPool = gender === 'Female'
    ? (socialClass === SocialClass.NOBILITY
      ? ['bronze earrings', 'copper bracelet', 'small nose ring', 'etched bracelet']
      : ['bronze earrings', 'copper bracelet'])
    : (socialClass === SocialClass.NOBILITY
      ? ['leather belt pouch', 'woven sash', 'bronze ring']
      : ['leather belt pouch', 'woven sash']);
  const accessories = [
    rand() > 0.6 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none',
    rand() > 0.7 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none'
  ].filter(a => a !== 'none');

  const heldItem: NPCStats['heldItem'] = (() => {
    if (isShepherd) return 'staff';
    if (isBlacksmith) return 'hammer';
    if (/Water-Carrier|Water-Bearer/i.test(profession)) return 'waterskin';
    if (isMerchant) return 'ledger';
    if (isSoldier) return 'spear';
    if (isBaker) return 'tray';
    if (isCarpenter) return 'plank';
    if (/Porter/i.test(profession)) return 'sack';
    return 'none';
  })();

  const goalOfDay = (() => {
    if (isReligiousLeader) return 'Lead prayers and receive petitions.';
    if (isSoldier) return isOfficer ? 'Inspect the patrol routes.' : 'Keep watch on the streets.';
    if (isMerchant) return 'Secure new stock for the market stalls.';
    if (isArtisan) return 'Complete commissions before dusk.';
    if (/Water-Carrier|Water-Bearer/i.test(profession)) return 'Deliver fresh water to households.';
    if (/Baker/i.test(profession)) return 'Prepare bread for the morning rush.';
    if (/Porter/i.test(profession)) return 'Carry goods between the souq and homes.';
    if (/Shepherd/i.test(profession)) return 'Tend the flock beyond the walls.';
    return 'Attend to daily duties in the neighborhood.';
  })();

  // Initial morale values - slightly randomized with profession/class modifiers
  // Merchants hear rumors first (trade networks), clergy are calmer
  const baseAwareness = Math.floor(rand() * 12);
  const awarenessModifier = isMerchant ? 8 : isReligiousLeader ? -3 : 0;
  const awarenessLevel = Math.max(0, Math.min(100, baseAwareness + awarenessModifier));

  // Initial panic is low, builds from awareness and witnessed events
  const basePanic = Math.floor(rand() * 6);
  const panicLevel = Math.max(0, Math.min(100, basePanic));

  return {
    id: `npc-${seed}`,
    name,
    age,
    gender,
    profession,
    socialClass,
    height: heightBase,
    weight: weightBase,
    mood: MOODS[Math.floor(rand() * MOODS.length)],
    awarenessLevel,
    panicLevel,
    robeSpread,
    robeHasTrim,
    robeHemBand,
    robeOverwrap,
    robePattern,
    hairStyle,
    headwearStyle,
    sleeveCoverage,
    footwearStyle,
    footwearColor,
    heldItem,
    accessories,
    goalOfDay,
  };
};

export const generatePlayerStats = (seed: number): PlayerStats => {
  let s = seed * 7 + 13;
  const rand = () => seededRandom(s++);

  const gender: 'Male' | 'Female' = rand() > 0.52 ? 'Male' : 'Female';
  const classRoll = rand();
  let socialClass = SocialClass.PEASANT;
  if (classRoll > 0.96) socialClass = SocialClass.NOBILITY;
  else if (classRoll > 0.75) socialClass = SocialClass.MERCHANT;
  else if (classRoll > 0.62) socialClass = SocialClass.CLERGY;

  const age = Math.floor(rand() * 35) + 16;
  const skinTone = `hsl(${26 + Math.round(rand() * 8)}, ${28 + Math.round(rand() * 18)}%, ${30 + Math.round(rand() * 18)}%)`;
  const skinDescriptions = ['olive-toned complexion', 'sun-browned skin', 'warm sand-brown skin', 'weathered bronze complexion'];
  const hairDescriptions = ['black hair', 'deep brown hair', 'dark chestnut hair'];
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
  const hairColor = hairPalette[Math.floor(rand() * hairPalette.length)];

  const professionPoolsByClass: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
    [SocialClass.PEASANT]: {
      Male: ['Water-Carrier', 'Day-Laborer', 'Tanner', 'Porter', 'Potter', 'City Guard'],
      Female: ['Spinner', 'Bread Seller', 'Servant', 'Water-Bearer', 'Laundry Worker'],
    },
    [SocialClass.MERCHANT]: {
      Male: ['Spice Merchant', 'Draper', 'Coppersmith', 'Weaver', 'Carpenter'],
      Female: ['Textile Trader', 'Herbalist', 'Midwife', 'Dyer\'s Assistant', 'Bread Seller'],
    },
    [SocialClass.CLERGY]: {
      Male: ['Imam', 'Qadi', 'Mufti', 'Muezzin', 'Qur\'an Reciter', 'Madrasa Teacher'],
      Female: ['Charity Worker'],
    },
    [SocialClass.NOBILITY]: {
      Male: ['Estate Steward', 'Court Clerk', 'Mamluk Officer'],
      Female: ['Household Manager', 'Tutor'],
    },
  };
  const professionPool = professionPoolsByClass[socialClass][gender];
  const profession = chooseProfession(professionPool, age, gender, socialClass, rand);
  const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(profession);
  const isSoldier = /Guard|Soldier|Mamluk/i.test(profession);
  const isOfficer = /Officer/i.test(profession);
  const isMerchant = /(Merchant|Draper|Trader|Coppersmith|Weaver|Carpenter|Herbalist|Midwife|Dyer)/i.test(profession);
  const isLaborer = /(Day-Laborer|Water-Carrier|Tanner|Porter|Bread Seller|Laundry|Servant|Water-Bearer)/i.test(profession);

  const robeOptionsByClass: Record<SocialClass, Array<{ desc: string; base: string; accent: string; sash: boolean; sleeves: boolean }>> = {
    [SocialClass.PEASANT]: [
      { desc: 'threadbare linen qamis in beige', base: '#c8b892', accent: '#e6d8b7', sash: false, sleeves: false },
      { desc: 'patched wool qaba in earth tones', base: '#8a6b4f', accent: '#c8b892', sash: true, sleeves: true },
      { desc: 'undyed flax thawb with a simple izar belt', base: '#d6c8a8', accent: '#cdbb9a', sash: false, sleeves: false },
      { desc: 'washed linen thawb in pale sand', base: '#d9cdb2', accent: '#c8b892', sash: false, sleeves: false },
      { desc: 'rough wool qabāʾ in walnut brown', base: '#7a5a3f', accent: '#bfae8a', sash: true, sleeves: true },
      { desc: 'faded indigo thawb', base: '#5a6e7a', accent: '#c8b892', sash: false, sleeves: false },
      { desc: 'madder-dyed qamis in brick red', base: '#8b5a4a', accent: '#d6c8a8', sash: true, sleeves: false },
    ],
    [SocialClass.MERCHANT]: [
      { desc: 'dyed wool qaba in muted olive with a beige izar', base: '#6f6a3f', accent: '#e1d3b3', sash: true, sleeves: true },
      { desc: 'well-kept linen thawb in warm tan', base: '#b89b6a', accent: '#d9c9a8', sash: true, sleeves: true },
      { desc: 'trimmed qaba with a woven izar', base: '#7b5a4a', accent: '#e3d2ad', sash: true, sleeves: true },
      { desc: 'dyed linen thawb in soft ochre', base: '#c2a46a', accent: '#ead8b8', sash: true, sleeves: true },
      { desc: 'indigo-dyed qabāʾ with cream trim', base: '#3d5266', accent: '#e8ddc4', sash: true, sleeves: true },
      { desc: 'saffron-yellow thawb with dark trim', base: '#d9a645', accent: '#5a4a3a', sash: true, sleeves: true },
      { desc: 'henna-orange qaba with beige izar', base: '#c87a4a', accent: '#e6d8b7', sash: true, sleeves: true },
      { desc: 'deep madder-red thawb', base: '#a54e3a', accent: '#e1d3b3', sash: true, sleeves: true },
    ],
    [SocialClass.CLERGY]: [
      { desc: 'dark wool qaba with plain trim', base: '#3d3a34', accent: '#8b7f70', sash: false, sleeves: true },
      { desc: 'plain thawb with a faded izar', base: '#51473c', accent: '#9a8a75', sash: true, sleeves: true },
      { desc: 'modest wool qaba in slate tones', base: '#4a4f59', accent: '#7a6f63', sash: false, sleeves: true },
      { desc: 'faded wool thawb in ash brown', base: '#5b5247', accent: '#9b8e7a', sash: false, sleeves: true },
      { desc: 'deep indigo qaba', base: '#2d3d4f', accent: '#9b8e7a', sash: false, sleeves: true },
    ],
    [SocialClass.NOBILITY]: [
      { desc: 'fine woven qaba with subtle embroidery', base: '#6a5b4a', accent: '#bfa57e', sash: true, sleeves: true },
      { desc: 'well-tailored thawb in rich cloth', base: '#70523f', accent: '#cbb58c', sash: true, sleeves: true },
      { desc: 'layered qaba with ornate trim', base: '#5c4a3f', accent: '#d0b992', sash: true, sleeves: true },
      { desc: 'kermes-crimson qabāʾ with gold trim', base: '#9a3428', accent: '#d4a965', sash: true, sleeves: true },
      { desc: 'rich indigo thawb with woven trim', base: '#2d415a', accent: '#cdbb9a', sash: true, sleeves: true },
      { desc: 'saffron-dyed qaba with tiraz bands', base: '#e0a83a', accent: '#3d3a34', sash: true, sleeves: true },
      { desc: 'true black wool qabāʾ', base: '#1f1f1f', accent: '#a89878', sash: true, sleeves: true },
    ],
  };
  const robePickBase = robeOptionsByClass[socialClass][Math.floor(rand() * robeOptionsByClass[socialClass].length)];
  const adjustHex = (hex: string, factor: number) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) * factor)));
    const b = Math.min(255, Math.max(0, Math.round((num & 0xff) * factor)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  let robePick = {
    ...robePickBase,
    base: adjustHex(robePickBase.base, 0.94 + rand() * 0.12),
    accent: adjustHex(robePickBase.accent, 0.9 + rand() * 0.18)
  };

  let headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none' = gender === 'Female'
    ? 'scarf'
    : (() => {
        const roll = rand();
        if (roll < 0.15) return 'fez';
        if (roll < 0.25 && socialClass === SocialClass.PEASANT) return 'straw';
        if (roll < 0.45) return 'taqiyah'; // Common simple skullcap
        if (socialClass === SocialClass.NOBILITY) return rand() > 0.3 ? 'turban' : 'cap';
        if (socialClass === SocialClass.CLERGY) return rand() > 0.5 ? 'turban' : 'taqiyah';
        return rand() > 0.5 ? 'cap' : rand() > 0.7 ? 'turban' : 'none';
      })();
  if (isReligiousLeader) {
    headwearStyle = 'turban';
  } else if (isSoldier) {
    headwearStyle = isOfficer ? 'turban' : 'cap';
  }

  const headwearByGender = gender === 'Female'
    ? [
        { desc: 'linen khimar in faded cloth', color: '#c2a878' },
        { desc: 'cotton milhafa with a soft wrap', color: '#d6c2a4' },
        { desc: 'light khimar with a simple band', color: '#c7b08c' }
      ]
    : [
        { desc: 'deep red imamah (turban) with white striping', color: '#8b2e2e' },
        { desc: 'dark indigo imamah with pale striping', color: '#3f5d7a' },
        { desc: 'black wool headwrap with white banding', color: '#1f1f1f' },
        { desc: 'brown wool imamah with lighter wrap', color: '#7b5a4a' },
        { desc: 'tan cotton headwrap in plain weave', color: '#cbb48a' },
        { desc: 'brown wool imamah with pale striping', color: '#7b5a4a' }
      ];
  let headwearPick = headwearByGender[Math.floor(rand() * headwearByGender.length)];
  if (gender === 'Male') {
    if (headwearStyle === 'fez') {
      headwearPick = rand() > 0.5
        ? { desc: 'felt fez cap in deep red', color: '#8b2e2e' }
        : { desc: 'felt fez cap in pale tan', color: '#cbb48a' };
    } else if (headwearStyle === 'straw') {
      headwearPick = { desc: 'woven straw brimmed cap', color: '#cbb48a' };
    }
  }
  if (isReligiousLeader) {
    headwearPick = { desc: 'white imamah (turban) in fine cotton', color: '#e8dfcf' };
  } else if (isSoldier) {
    headwearPick = isOfficer
      ? { desc: 'deep red imamah with pale striping', color: '#8b2e2e' }
      : { desc: 'dark wool cap with a narrow band', color: '#3a3a3a' };
  }

  const healthHistoryOptions = [
    'survived a childhood fever',
    'recovering from a winter cough',
    'no notable illnesses recorded',
    'scarred from a market accident',
    'often troubled by sleeplessness'
  ];
  const clothing = [
    robePick.desc,
    headwearPick.desc,
    rand() > 0.7 ? 'a thin leather belt' : 'a simple cord belt'
  ];

  const strength = 6 + Math.floor(rand() * 10) + (profession.includes('Laborer') || profession.includes('Porter') ? 2 : 0);
  const piety = 6 + Math.floor(rand() * 10) + (socialClass === SocialClass.CLERGY ? 4 : 0);
  const perceptiveness = 6 + Math.floor(rand() * 10) + (profession.includes('Merchant') || profession.includes('Scribe') ? 2 : 0);
  const neuroticism = 6 + Math.floor(rand() * 10);
  const charisma = 6 + Math.floor(rand() * 10) + (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.NOBILITY ? 2 : 0);

  const humors = {
    blood: 20 + Math.floor(rand() * 30),
    phlegm: 20 + Math.floor(rand() * 30),
    yellowBile: 20 + Math.floor(rand() * 30),
    blackBile: 20 + Math.floor(rand() * 30),
  };
  const humorValues = [humors.blood, humors.phlegm, humors.yellowBile, humors.blackBile];
  const avg = humorValues.reduce((a, b) => a + b, 0) / humorValues.length;
  const variance = humorValues.reduce((a, b) => a + (b - avg) * (b - avg), 0) / humorValues.length;
  const humoralBalance = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  const height = age < 18 ? 0.6 + (age / 18) * 0.3 : 0.9 + rand() * 0.2;
  const weight = rand() * 0.4 + 0.8;
  const robeSpreadBase = socialClass === SocialClass.NOBILITY ? 1.1
    : socialClass === SocialClass.MERCHANT ? 1.0
    : socialClass === SocialClass.CLERGY ? 0.95
    : 0.9;
  const robeSpread = gender === 'Female'
    ? (() => {
        const roll = rand();
        const narrowBias = socialClass === SocialClass.PEASANT ? 0.7 : socialClass === SocialClass.MERCHANT ? 0.6 : socialClass === SocialClass.NOBILITY ? 0.45 : 0.55;
        const wideBias = socialClass === SocialClass.NOBILITY ? 0.18 : 0.08;
        if (roll < narrowBias) {
          const extraNarrow = rand() < 0.6;
          return extraNarrow
            ? clamp(0.52 + rand() * 0.12 + (weight - 0.8) * 0.12, 0.5, 0.7)
            : clamp(0.62 + rand() * 0.16 + (weight - 0.8) * 0.18, 0.58, 0.85);
        }
        if (roll > 1 - wideBias) {
          return clamp(1.02 + rand() * 0.2 + (weight - 0.8) * 0.35, 0.95, 1.25);
        }
        return clamp(0.78 + rand() * 0.16 + (weight - 0.8) * 0.2, 0.72, 1.0);
      })()
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.65 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.35 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.35);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' = (() => {
    if (rand() > 0.75) {
      const patternPool: Array<'stripe' | 'chevron' | 'damask'> = gender === 'Female'
        ? ['stripe', 'chevron', 'damask']
        : ['stripe', 'chevron'];
      const pick = patternPool[Math.floor(rand() * patternPool.length)];
      return pick;
    }
    return 'none';
  })();
  let sleeveCoverage: 'full' | 'lower' | 'none' = robePick.sleeves
    ? (rand() > 0.6 ? 'full' : 'lower')
    : 'none';
  const hairStyle: 'short' | 'medium' | 'long' | 'covered' = gender === 'Female'
    ? 'covered'
    : (age > 45 ? (rand() > 0.6 ? 'short' : 'medium')
      : profession.includes('Laborer') || profession.includes('Porter') || profession.includes('Guard')
        ? (rand() > 0.7 ? 'medium' : 'short')
        : socialClass === SocialClass.NOBILITY ? (rand() > 0.4 ? 'medium' : 'long')
        : socialClass === SocialClass.CLERGY ? (rand() > 0.6 ? 'short' : 'medium')
        : rand() > 0.5 ? 'medium' : 'short');
  let footwearStyle: 'sandals' | 'shoes' | 'bare' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.2 ? 'shoes' : 'sandals')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.3 ? 'shoes' : 'sandals')
    : rand() > 0.8 ? 'bare' : 'sandals';
  let footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  let footwearDescription = footwearStyle === 'bare' ? 'bare feet' : footwearStyle === 'shoes' ? 'simple leather shoes' : 'woven leather sandals';
  if (isReligiousLeader) {
    robePick = {
      desc: 'dark wool jubba with pale sash',
      base: '#2f2b26',
      accent: '#c8b892',
      sash: true,
      sleeves: true
    };
    headwearStyle = 'turban';
    headwearPick = { desc: 'white imamah (turban) in fine cotton', color: '#e8dfcf' };
    robePattern = 'none';
    sleeveCoverage = 'full';
    footwearStyle = 'shoes';
  } else if (isSoldier) {
    robePick = {
      desc: isOfficer ? 'tailored military qaba with brass sash' : 'dark wool qaba with leather belt',
      base: isOfficer ? '#3b2f2b' : '#2f3438',
      accent: isOfficer ? '#b59b6a' : '#8b5e3c',
      sash: true,
      sleeves: true
    };
    headwearStyle = isOfficer ? 'turban' : 'cap';
    headwearPick = isOfficer
      ? { desc: 'deep red imamah with pale striping', color: '#8b2e2e' }
      : { desc: 'dark wool cap with a narrow band', color: '#3a3a3a' };
    robePattern = isOfficer ? 'stripe' : robePattern;
    sleeveCoverage = 'full';
    footwearStyle = 'shoes';
  } else if (isMerchant) {
    if (rand() > 0.55 && robePattern === 'none') robePattern = 'stripe';
  } else if (isLaborer) {
    sleeveCoverage = rand() > 0.4 ? 'lower' : 'none';
  }
  footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  footwearDescription = footwearStyle === 'bare' ? 'bare feet' : footwearStyle === 'shoes' ? 'simple leather shoes' : 'woven leather sandals';
  const accessoryPool = gender === 'Female'
    ? (socialClass === SocialClass.NOBILITY
      ? ['bronze earrings', 'copper bracelet', 'small nose ring', 'etched bracelet']
      : ['bronze earrings', 'copper bracelet'])
    : (socialClass === SocialClass.NOBILITY
      ? ['leather belt pouch', 'woven sash', 'bronze ring']
      : ['leather belt pouch', 'woven sash']);
  const accessories = [
    rand() > 0.6 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none',
    rand() > 0.7 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none'
  ].filter(a => a !== 'none');

  return {
    name: generateNPCStats(seed).name,
    age,
    gender,
    profession,
    socialClass,
    height,
    weight,
    family: FAMILY_STRUCTURES[Math.floor(rand() * FAMILY_STRUCTURES.length)],
    healthStatus: HEALTH_STATUSES[Math.floor(rand() * HEALTH_STATUSES.length)],
    skinTone,
    hairColor,
    robeColor: robePick.base,
    headscarfColor: headwearPick.color,
    skinDescription: skinDescriptions[Math.floor(rand() * skinDescriptions.length)],
    hairDescription: hairDescriptions[Math.floor(rand() * hairDescriptions.length)],
    robeDescription: robePick.desc,
    headwearDescription: headwearPick.desc,
    robeBaseColor: robePick.base,
    robeAccentColor: robePick.accent,
    robeHasSash: robePick.sash,
    robeSleeves: robePick.sleeves,
    robeHasTrim,
    robeHemBand,
    robeSpread,
    robeOverwrap,
    robePattern,
    hairStyle,
    headwearStyle,
    sleeveCoverage,
    footwearStyle,
    footwearColor,
    footwearDescription,
    accessories,
    headwearColor: headwearPick.color,
    healthHistory: healthHistoryOptions[Math.floor(rand() * healthHistoryOptions.length)],
    clothing,
    strength,
    piety,
    perceptiveness,
    neuroticism,
    charisma,
    humors,
    humoralBalance
  };
};

export const generateBuildingMetadata = (seed: number, x: number, z: number): BuildingMetadata => {
  let s = seed + Math.abs(x) * 13 + Math.abs(z) * 7;
  const rand = () => seededRandom(s++);
  const sizeScale = 0.88 + rand() * 0.24;

  const typeRand = rand();
  let type = BuildingType.RESIDENTIAL;
  if (typeRand < 0.1) type = BuildingType.RELIGIOUS;
  else if (typeRand < 0.2) type = BuildingType.CIVIC;
  else if (typeRand < 0.6) type = BuildingType.COMMERCIAL;

  let ownerName = '';
  let ownerAge = Math.floor(rand() * 45) + 18;
  let ownerProfession = '';
  let ownerGender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';

  if (type === BuildingType.RELIGIOUS) {
    ownerProfession = RELIGIOUS_PROFESSIONS[Math.floor(rand() * RELIGIOUS_PROFESSIONS.length)];

    // Sultan appoints major institutions (Friday Mosque, Madrasa)
    if (ownerProfession === 'Friday Mosque Imam' || ownerProfession === 'Madrasa Director') {
      ownerName = 'Sultan Al-Nasir Muhammad';
      ownerAge = 54;
    } else {
      // Local religious leader
      ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
      ownerAge = Math.floor(rand() * 30) + 35; // 35-65 years old
    }
    ownerGender = 'Male';
  } else if (type === BuildingType.CIVIC) {
    ownerProfession = CIVIC_PROFESSIONS[Math.floor(rand() * CIVIC_PROFESSIONS.length)];

    // Sultan appoints high government positions
    if (ownerProfession === 'Mamluk Governor' || ownerProfession === 'Court Qadi') {
      ownerName = 'Sultan Al-Nasir Muhammad';
      ownerAge = 54;
    } else {
      // Local civic servant
      ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
      ownerAge = Math.floor(rand() * 35) + 30; // 30-65 years old
    }
    ownerGender = 'Male';
  } else {
    ownerName = ownerGender === 'Male'
      ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
      : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;

    ownerProfession = type === BuildingType.COMMERCIAL
      ? COMMERCIAL_PROFESSIONS[Math.floor(rand() * COMMERCIAL_PROFESSIONS.length)]
      : RESIDENTIAL_PROFESSIONS[Math.floor(rand() * RESIDENTIAL_PROFESSIONS.length)];
  }

  // Calculate building height using the same formula as Environment.tsx
  const district = getDistrictType(x, z);
  const localSeed = x * 1000 + z;
  const baseHeight = district === 'HOVELS' && type !== BuildingType.RELIGIOUS && type !== BuildingType.CIVIC
    ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
    : type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;
  const height = baseHeight * districtScale;

  // Determine story count based on building height
  // 1 story: < 6, 2 stories: 6-10, 3 stories: >= 10
  const storyCount: 1 | 2 | 3 = height < 6 ? 1 : height < 10 ? 2 : 3;

  // Adjust footprint based on story count: 3-story buildings are ~10% wider
  const footprintScale = storyCount === 3 ? sizeScale * 1.1 : storyCount === 2 ? sizeScale * 1.05 : sizeScale;

  return {
    id: `bld-${x}-${z}`,
    type,
    ownerName,
    ownerAge,
    ownerProfession,
    ownerGender,
    position: [x, 0, z],
    sizeScale: footprintScale,
    storyCount,
    doorSide: Math.floor(rand() * 4),
    hasSymmetricalWindows: rand() > 0.5,
    isPointOfInterest: type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC || rand() > 0.985,
    isQuarantined: type === BuildingType.RESIDENTIAL && rand() > 0.965,
    isOpen: type !== BuildingType.RESIDENTIAL ? true : rand() > 0.25
  };
};
