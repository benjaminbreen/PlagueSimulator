
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
  };
};

export const generatePlayerStats = (seed: number): PlayerStats => {
  const npc = generateNPCStats(seed);
  let s = seed * 3 + 11;
  const rand = () => seededRandom(s++);

  return {
    name: npc.name,
    age: npc.age,
    gender: npc.gender,
    profession: npc.profession,
    socialClass: npc.socialClass,
    height: npc.height,
    weight: npc.weight,
    family: FAMILY_STRUCTURES[Math.floor(rand() * FAMILY_STRUCTURES.length)],
    healthStatus: HEALTH_STATUSES[Math.floor(rand() * HEALTH_STATUSES.length)],
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
