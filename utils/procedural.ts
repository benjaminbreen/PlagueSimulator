
import { BuildingType, BuildingMetadata, SocialClass, NPCStats, PlayerStats } from '../types';

const FIRST_NAMES_MALE = ['Ahmad', 'Yusuf', 'Ibrahim', 'Umar', 'Hassan', 'Mahmud', 'Zayd', 'Malik', 'Nasir', 'Suleiman'];
const FIRST_NAMES_FEMALE = ['Fatima', 'Zaynab', 'Maryam', 'Aisha', 'Khadija', 'Layla', 'Salma', 'Hafsa', 'Raya', 'Nura'];
const LAST_NAMES = ['Al-Dimashqi', 'Al-Halabi', 'Al-Baghdadi', 'Al-Suri', 'Al-Farsi', 'Al-Andalusi', 'Al-Misri', 'Ibn Khaldun', 'Al-Bakri'];

const COMMERCIAL_PROFESSIONS = ['Spice Merchant', 'Draper', 'Baker', 'Blacksmith', 'Coppersmith', 'Weaver', 'Carpenter', 'Potter'];
const RESIDENTIAL_PROFESSIONS = ['Day-Laborer', 'Water-Carrier', 'Copyist', 'Tanner', 'Unemployed', 'Retired Guard'];
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

export const generateNPCStats = (seed: number): NPCStats => {
  let s = seed;
  const rand = () => seededRandom(s++);

  const gender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';
  const name = gender === 'Male' 
    ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
    : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;

  const age = Math.floor(rand() * 50) + 12;
  const classRand = rand();
  let socialClass = SocialClass.PEASANT;
  if (classRand > 0.95) socialClass = SocialClass.NOBILITY;
  else if (classRand > 0.7) socialClass = SocialClass.MERCHANT;
  else if (classRand > 0.6) socialClass = SocialClass.CLERGY;

  const profession = socialClass === SocialClass.MERCHANT 
    ? COMMERCIAL_PROFESSIONS[Math.floor(rand() * COMMERCIAL_PROFESSIONS.length)]
    : RESIDENTIAL_PROFESSIONS[Math.floor(rand() * RESIDENTIAL_PROFESSIONS.length)];

  // Height and weight scales
  const heightBase = age < 18 ? 0.6 + (age / 18) * 0.3 : 0.9 + rand() * 0.2;
  const weightBase = rand() * 0.4 + 0.8;
  const robeSpreadBase = socialClass === SocialClass.NOBILITY ? 1.08
    : socialClass === SocialClass.MERCHANT ? 1.0
    : socialClass === SocialClass.CLERGY ? 0.95
    : 0.9;
  const robeSpread = gender === 'Female'
    ? clamp(robeSpreadBase + (weightBase - 0.8) * 0.5 + (rand() - 0.5) * 0.08, 0.75, 1.2)
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.4 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.75 : 0.4);

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
    robeSpread,
    robeHasTrim,
    robeHemBand,
    robeOverwrap,
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
  const skinTone = `hsl(28, ${30 + Math.round(rand() * 20)}%, ${30 + Math.round(rand() * 28)}%)`;
  const skinDescriptions = ['olive-toned complexion', 'sun-browned skin', 'warm sand-brown skin', 'weathered bronze complexion'];
  const hairDescriptions = ['dark chestnut hair', 'black hair', 'deep brown hair', 'soot-black hair'];
  const hairColor = rand() > 0.6 ? '#2a1a12' : rand() > 0.3 ? '#3b2a1a' : '#4a3a2a';

  const maleProfessions: Record<SocialClass, string[]> = {
    [SocialClass.PEASANT]: ['Water-Carrier', 'Day-Laborer', 'Tanner', 'Porter', 'Potter'],
    [SocialClass.MERCHANT]: ['Spice Merchant', 'Draper', 'Coppersmith', 'Weaver', 'Carpenter'],
    [SocialClass.CLERGY]: ['Qur\'an Reciter', 'Scribe', 'Teacher', 'Caretaker of Waqf'],
    [SocialClass.NOBILITY]: ['Estate Steward', 'Court Clerk', 'Officer\'s Aide'],
  };
  const femaleProfessions: Record<SocialClass, string[]> = {
    [SocialClass.PEASANT]: ['Spinner', 'Bread Seller', 'Servant', 'Water-Bearer', 'Laundry Worker'],
    [SocialClass.MERCHANT]: ['Textile Trader', 'Herbalist', 'Midwife', 'Dyer\'s Assistant'],
    [SocialClass.CLERGY]: ['Qur\'an Teacher', 'Charity Worker'],
    [SocialClass.NOBILITY]: ['Household Manager', 'Tutor'],
  };
  const professionPool = gender === 'Male' ? maleProfessions[socialClass] : femaleProfessions[socialClass];
  const profession = professionPool[Math.floor(rand() * professionPool.length)];

  const robeOptionsByClass: Record<SocialClass, Array<{ desc: string; base: string; accent: string; sash: boolean; sleeves: boolean }>> = {
    [SocialClass.PEASANT]: [
      { desc: 'threadbare linen qamis in beige', base: '#c8b892', accent: '#e6d8b7', sash: false, sleeves: false },
      { desc: 'patched wool qaba in earth tones', base: '#8a6b4f', accent: '#c8b892', sash: true, sleeves: true },
      { desc: 'undyed flax thawb with a simple izar belt', base: '#d6c8a8', accent: '#cdbb9a', sash: false, sleeves: false },
    ],
    [SocialClass.MERCHANT]: [
      { desc: 'dyed wool qaba in muted olive with a beige izar', base: '#6f6a3f', accent: '#e1d3b3', sash: true, sleeves: true },
      { desc: 'well-kept linen thawb in warm tan', base: '#b89b6a', accent: '#d9c9a8', sash: true, sleeves: true },
      { desc: 'trimmed qaba with a woven izar', base: '#7b5a4a', accent: '#e3d2ad', sash: true, sleeves: true },
    ],
    [SocialClass.CLERGY]: [
      { desc: 'dark wool qaba with plain trim', base: '#3d3a34', accent: '#8b7f70', sash: false, sleeves: true },
      { desc: 'plain thawb with a faded izar', base: '#51473c', accent: '#9a8a75', sash: true, sleeves: true },
      { desc: 'modest wool qaba in slate tones', base: '#4a4f59', accent: '#7a6f63', sash: false, sleeves: true },
    ],
    [SocialClass.NOBILITY]: [
      { desc: 'fine woven qaba with subtle embroidery', base: '#6a5b4a', accent: '#bfa57e', sash: true, sleeves: true },
      { desc: 'well-tailored thawb in rich cloth', base: '#70523f', accent: '#cbb58c', sash: true, sleeves: true },
      { desc: 'layered qaba with ornate trim', base: '#5c4a3f', accent: '#d0b992', sash: true, sleeves: true },
    ],
  };
  const robePick = robeOptionsByClass[socialClass][Math.floor(rand() * robeOptionsByClass[socialClass].length)];

  const headwearByGender = gender === 'Female'
    ? [
        { desc: 'linen khimar in faded cloth', color: '#c2a878' },
        { desc: 'cotton milhafa with a soft wrap', color: '#d9c9a8' },
        { desc: 'light khimar with a simple band', color: '#cdbb9a' }
      ]
    : [
        { desc: 'plain imamah (turban) of undyed cloth', color: '#d9c9a8' },
        { desc: 'wrapped imamah in light cotton', color: '#cdbb9a' },
        { desc: 'headwrap with a narrow band', color: '#bfa57e' }
      ];
  const headwearPick = headwearByGender[Math.floor(rand() * headwearByGender.length)];

  const clothing = [
    robePick.desc,
    headwearPick.desc,
    rand() > 0.6 ? 'leather sandals' : 'woven sandals',
    rand() > 0.7 ? 'a thin leather belt' : 'a simple cord belt'
  ];

  const healthHistoryOptions = [
    'survived a childhood fever',
    'recovering from a winter cough',
    'no notable illnesses recorded',
    'scarred from a market accident',
    'often troubled by sleeplessness'
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
    ? clamp(robeSpreadBase + (weight - 0.8) * 0.5 + (rand() - 0.5) * 0.08, 0.75, 1.2)
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.65 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.35 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.35);

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

  const typeRand = rand();
  let type = BuildingType.RESIDENTIAL;
  if (typeRand < 0.1) type = BuildingType.RELIGIOUS;
  else if (typeRand < 0.2) type = BuildingType.CIVIC;
  else if (typeRand < 0.6) type = BuildingType.COMMERCIAL;

  let ownerName = '';
  let ownerAge = Math.floor(rand() * 45) + 18;
  let ownerProfession = '';
  let ownerGender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';

  if (type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC) {
    ownerName = 'Sultan Al-Nasir Muhammad';
    ownerProfession = type === BuildingType.RELIGIOUS ? 'Representative' : 'Mamluk Governor';
    ownerAge = 54;
    ownerGender = 'Male';
  } else {
    ownerName = ownerGender === 'Male' 
      ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
      : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;

    ownerProfession = type === BuildingType.COMMERCIAL 
      ? COMMERCIAL_PROFESSIONS[Math.floor(rand() * COMMERCIAL_PROFESSIONS.length)]
      : RESIDENTIAL_PROFESSIONS[Math.floor(rand() * RESIDENTIAL_PROFESSIONS.length)];
  }

  return { 
    id: `bld-${x}-${z}`, 
    type, 
    ownerName, 
    ownerAge, 
    ownerProfession, 
    ownerGender, 
    position: [x, 0, z],
    doorSide: Math.floor(rand() * 4),
    hasSymmetricalWindows: rand() > 0.5
  };
};
