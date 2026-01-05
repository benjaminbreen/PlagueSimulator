/**
 * Family Generation System
 * Generates procedural family members for the player that exist as actual NPCs
 */

import { FamilyMember, FamilyRelationship, PlayerStats, NPCStats, NPCRecord, AgentState, SocialClass, PlagueType } from '../types';
import { generateNPCStats, seededRandom } from './procedural';

// Child name pools by gender (period-appropriate diminutives and children's names)
const CHILD_NAMES_MALE = [
  'Ahmad', 'Yusuf', 'Ibrahim', 'Umar', 'Hassan', 'Ali', 'Muhammad', 'Khalil',
  'Zayd', 'Malik', 'Said', 'Faris', 'Rashid', 'Nasir', 'Jamal'
];
const CHILD_NAMES_FEMALE = [
  'Fatima', 'Zaynab', 'Maryam', 'Aisha', 'Khadija', 'Layla', 'Salma',
  'Hafsa', 'Raya', 'Nura', 'Amina', 'Hana', 'Yasmin', 'Safiya'
];

// Elder names (more traditional/formal)
const ELDER_NAMES_MALE = [
  'Abd al-Rahman', 'Abu Bakr', 'Mustafa', 'Sulayman', 'Ismail', 'Yahya',
  'Dawud', 'Harun', 'Musa', 'Yaqub'
];
const ELDER_NAMES_FEMALE = [
  'Umm Salama', 'Ruqayya', 'Sawda', 'Juwayriya', 'Maymuna', 'Baraka',
  'Halima', 'Amina', 'Asiya', 'Hawwa'
];

interface FamilyComposition {
  hasSpouse: boolean;
  isWidowed: boolean;
  childCount: number;
  hasElderParent: boolean;
}

/**
 * Parse the family string to determine family composition
 */
export function parseFamilyString(familyString: string): FamilyComposition {
  const lower = familyString.toLowerCase();

  if (lower.includes('no immediate family')) {
    return { hasSpouse: false, isWidowed: false, childCount: 0, hasElderParent: false };
  }

  if (lower.includes('widowed')) {
    // "Widowed, one child"
    const childMatch = lower.match(/(\w+)\s*child/);
    const childCount = childMatch ? parseWordNumber(childMatch[1]) : 1;
    return { hasSpouse: false, isWidowed: true, childCount, hasElderParent: false };
  }

  if (lower.includes('single, elder parent')) {
    return { hasSpouse: false, isWidowed: false, childCount: 0, hasElderParent: true };
  }

  if (lower.includes('large extended family')) {
    // "Large extended family" - spouse + 4 children + 1 elder
    return { hasSpouse: true, isWidowed: false, childCount: 4, hasElderParent: true };
  }

  if (lower.includes('extended family')) {
    // "Extended family in household" - spouse + 2 children + 1 elder
    return { hasSpouse: true, isWidowed: false, childCount: 2, hasElderParent: true };
  }

  if (lower.includes('married')) {
    // "Married, two children" or "Married, three children"
    const childMatch = lower.match(/(\w+)\s*child/);
    const childCount = childMatch ? parseWordNumber(childMatch[1]) : 2;
    return { hasSpouse: true, isWidowed: false, childCount, hasElderParent: false };
  }

  // Default fallback
  return { hasSpouse: false, isWidowed: false, childCount: 0, hasElderParent: false };
}

function parseWordNumber(word: string): number {
  const numbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
  };
  return numbers[word.toLowerCase()] ?? 1;
}

/**
 * Generate a family member's NPCStats based on player stats
 */
function generateFamilyMemberStats(
  player: Pick<PlayerStats, 'name' | 'age' | 'gender' | 'ethnicity' | 'religion' | 'socialClass' | 'skinTone' | 'hairColor'>,
  relationship: FamilyRelationship,
  memberAge: number,
  memberGender: 'Male' | 'Female',
  seed: number,
  usedNames?: Set<string>
): NPCStats {
  let s = seed;
  const rand = () => seededRandom(s++);

  // Helper to pick a unique name from a pool
  const pickUniqueName = (pool: string[]): string => {
    // Filter out already used names
    const available = usedNames ? pool.filter(n => !usedNames.has(n)) : pool;
    // If all names used, fall back to original pool (rare edge case)
    const finalPool = available.length > 0 ? available : pool;
    return finalPool[Math.floor(rand() * finalPool.length)];
  };

  // Generate name based on relationship
  let name: string;
  if (relationship === 'spouse') {
    // Spouse gets a full adult name
    const namePool = memberGender === 'Male' ? ELDER_NAMES_MALE : ELDER_NAMES_FEMALE;
    name = pickUniqueName(namePool);
  } else if (relationship === 'child') {
    // Children get younger names - ensure uniqueness
    const namePool = memberGender === 'Male' ? CHILD_NAMES_MALE : CHILD_NAMES_FEMALE;
    name = pickUniqueName(namePool);
  } else if (relationship === 'parent') {
    // Parents get elder names
    const namePool = memberGender === 'Male' ? ELDER_NAMES_MALE : ELDER_NAMES_FEMALE;
    name = pickUniqueName(namePool);
  } else {
    // Siblings
    const namePool = memberGender === 'Male' ? CHILD_NAMES_MALE : CHILD_NAMES_FEMALE;
    name = pickUniqueName(namePool);
  }

  // Generate base NPC stats, then override with family-consistent values
  const baseStats = generateNPCStats(seed, player.socialClass, {
    districtType: undefined,
    gender: memberGender,
  });

  // Override with family-consistent demographics
  const stats: NPCStats = {
    ...baseStats,
    id: `family-${relationship}-${seed}`,
    name,
    age: memberAge,
    gender: memberGender,
    ethnicity: player.ethnicity,  // Family shares ethnicity
    religion: player.religion,    // Family shares religion
    socialClass: player.socialClass,  // Family shares social class
    // Slightly vary appearance but keep it family-consistent
    disposition: 70 + Math.floor(rand() * 25),  // Family members are friendly
  };

  // Profession based on relationship and gender
  if (relationship === 'spouse') {
    if (memberGender === 'Female') {
      stats.profession = player.socialClass === SocialClass.NOBILITY
        ? 'Household Manager'
        : player.socialClass === SocialClass.MERCHANT
          ? 'Textile Trader'
          : 'Homemaker';
    } else {
      stats.profession = player.socialClass === SocialClass.NOBILITY
        ? 'Estate Manager'
        : player.socialClass === SocialClass.MERCHANT
          ? 'Merchant'
          : 'Laborer';
    }
  } else if (relationship === 'child') {
    stats.profession = memberAge < 7 ? 'Child' : memberAge < 14 ? 'Youth' : 'Apprentice';
  } else if (relationship === 'parent') {
    stats.profession = 'Elder';
  }

  return stats;
}

/**
 * Main function to generate the player's family
 */
export function generatePlayerFamily(
  player: PlayerStats,
  seed: number
): { familyMembers: FamilyMember[]; npcRecords: NPCRecord[] } {
  const composition = parseFamilyString(player.family);
  const familyMembers: FamilyMember[] = [];
  const npcRecords: NPCRecord[] = [];

  let memberSeed = seed * 7 + 31;
  const rand = () => seededRandom(memberSeed++);

  // Generate spouse if applicable
  if (composition.hasSpouse) {
    const spouseGender = player.gender === 'Male' ? 'Female' : 'Male';
    const spouseAge = Math.max(18, player.age + Math.floor((rand() - 0.5) * 10));

    const spouseStats = generateFamilyMemberStats(
      player, 'spouse', spouseAge, spouseGender, memberSeed++
    );

    const spouseMember: FamilyMember = {
      id: `family-spouse-${seed}`,
      relationship: 'spouse',
      npcId: spouseStats.id,
      name: spouseStats.name,
      age: spouseAge,
      gender: spouseGender,
      alive: true,
      appearance: {
        skinTone: player.skinTone,  // Family shares player's skin tone
        hairColor: spouseStats.hairColor ?? player.hairColor,
        hairStyle: spouseStats.hairStyle,
        headwearStyle: spouseStats.headwearStyle,
        headwearColor: spouseStats.headwearColor,
        facialHair: spouseStats.facialHair,
      },
    };
    familyMembers.push(spouseMember);

    npcRecords.push({
      id: spouseStats.id,
      stats: spouseStats,
      state: AgentState.HEALTHY,
      stateStartTime: 0,
      plagueMeta: {
        plagueType: PlagueType.NONE,
        exposureTime: null,
        incubationDuration: null,
        symptomSeverity: 0,
        recoveryChance: 0,
      },
      location: 'interior',
      homeBuildingId: player.homeBuildingId,
      lastOutdoorPos: [0, 0, 0],
      scheduleSeed: memberSeed++,
      lastUpdateSimTime: 0,
      isEphemeral: false,
      role: 'family',
    });
  }

  // Cap children based on player age for realism
  // A 22-year-old can't realistically have 5 children
  const maxChildrenByAge = Math.max(0, Math.floor((player.age - 18) / 2)); // ~1 child per 2 years after 18
  const actualChildCount = Math.min(composition.childCount, maxChildrenByAge);

  // Generate children with realistic age spacing
  const maxPossibleChildAge = Math.max(1, Math.min(18, player.age - 18)); // Player had first child at 18+
  const minChildAge = 1;

  // Track used names to ensure uniqueness
  const usedChildNames = new Set<string>();

  // Calculate ages for all children first, then create them
  const childAges: number[] = [];
  if (actualChildCount > 0) {
    // Oldest child: between player.age - 18 and player.age - 20 (roughly)
    const oldestAge = Math.max(1, Math.min(maxPossibleChildAge,
      Math.floor(maxPossibleChildAge * 0.7 + rand() * maxPossibleChildAge * 0.3)));
    childAges.push(oldestAge);

    // Each subsequent child is 1-3 years younger
    for (let i = 1; i < actualChildCount; i++) {
      const spacing = 1 + Math.floor(rand() * 3); // 1-3 years apart
      const prevAge = childAges[i - 1];
      const newAge = Math.max(minChildAge, prevAge - spacing);
      childAges.push(newAge);
    }
  }

  for (let i = 0; i < actualChildCount; i++) {
    const childGender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';
    const childAge = childAges[i] ?? Math.max(1, Math.floor(rand() * 10) + 1);

    const childStats = generateFamilyMemberStats(
      player, 'child', childAge, childGender, memberSeed++, usedChildNames
    );
    usedChildNames.add(childStats.name);

    const childMember: FamilyMember = {
      id: `family-child-${i}-${seed}`,
      relationship: 'child',
      npcId: childStats.id,
      name: childStats.name,
      age: childAge,
      gender: childGender,
      alive: true,
      appearance: {
        skinTone: player.skinTone,  // Family shares player's skin tone
        hairColor: childStats.hairColor ?? player.hairColor,
        hairStyle: childStats.hairStyle,
        headwearStyle: childStats.headwearStyle,
        headwearColor: childStats.headwearColor,
        facialHair: childStats.facialHair,  // Usually 'none' for children
      },
    };
    familyMembers.push(childMember);

    npcRecords.push({
      id: childStats.id,
      stats: childStats,
      state: AgentState.HEALTHY,
      stateStartTime: 0,
      plagueMeta: {
        plagueType: PlagueType.NONE,
        exposureTime: null,
        incubationDuration: null,
        symptomSeverity: 0,
        recoveryChance: 0,
      },
      location: 'interior',
      homeBuildingId: player.homeBuildingId,
      lastOutdoorPos: [0, 0, 0],
      scheduleSeed: memberSeed++,
      lastUpdateSimTime: 0,
      isEphemeral: false,
      role: 'family',
    });
  }

  // Generate elder parent if applicable
  if (composition.hasElderParent) {
    const parentGender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';
    const parentAge = player.age + 20 + Math.floor(rand() * 15);

    const parentStats = generateFamilyMemberStats(
      player, 'parent', parentAge, parentGender, memberSeed++
    );

    const parentMember: FamilyMember = {
      id: `family-parent-${seed}`,
      relationship: 'parent',
      npcId: parentStats.id,
      name: parentStats.name,
      age: parentAge,
      gender: parentGender,
      alive: true,
      appearance: {
        skinTone: player.skinTone,  // Family shares player's skin tone
        hairColor: parentStats.hairColor ?? player.hairColor,
        hairStyle: parentStats.hairStyle,
        headwearStyle: parentStats.headwearStyle,
        headwearColor: parentStats.headwearColor,
        facialHair: parentStats.facialHair,
      },
    };
    familyMembers.push(parentMember);

    npcRecords.push({
      id: parentStats.id,
      stats: parentStats,
      state: AgentState.HEALTHY,
      stateStartTime: 0,
      plagueMeta: {
        plagueType: PlagueType.NONE,
        exposureTime: null,
        incubationDuration: null,
        symptomSeverity: 0,
        recoveryChance: 0,
      },
      location: 'interior',
      homeBuildingId: player.homeBuildingId,
      lastOutdoorPos: [0, 0, 0],
      scheduleSeed: memberSeed++,
      lastUpdateSimTime: 0,
      isEphemeral: false,
      role: 'family',
    });
  }

  return { familyMembers, npcRecords };
}

/**
 * Get a description of the family for display
 */
export function getFamilyDescription(familyMembers: FamilyMember[]): string {
  if (familyMembers.length === 0) {
    return 'You have no immediate family in Damascus.';
  }

  const alive = familyMembers.filter(m => m.alive);
  const deceased = familyMembers.filter(m => !m.alive);

  const parts: string[] = [];

  const spouse = alive.find(m => m.relationship === 'spouse');
  if (spouse) {
    parts.push(`${spouse.gender === 'Male' ? 'husband' : 'wife'} ${spouse.name} (age ${spouse.age})`);
  }

  const children = alive.filter(m => m.relationship === 'child');
  if (children.length > 0) {
    const childDesc = children.map(c => `${c.name} (${c.age})`).join(', ');
    parts.push(`${children.length} ${children.length === 1 ? 'child' : 'children'}: ${childDesc}`);
  }

  const parents = alive.filter(m => m.relationship === 'parent');
  if (parents.length > 0) {
    parents.forEach(p => {
      parts.push(`${p.gender === 'Male' ? 'father' : 'mother'} ${p.name} (age ${p.age})`);
    });
  }

  let description = 'Your household includes: ' + parts.join('; ') + '.';

  if (deceased.length > 0) {
    description += ` ${deceased.length} family ${deceased.length === 1 ? 'member has' : 'members have'} passed away.`;
  }

  return description;
}

/**
 * Get relationship label for display
 */
export function getRelationshipLabel(relationship: FamilyRelationship, gender: 'Male' | 'Female'): string {
  switch (relationship) {
    case 'spouse':
      return gender === 'Male' ? 'Husband' : 'Wife';
    case 'child':
      return gender === 'Male' ? 'Son' : 'Daughter';
    case 'parent':
      return gender === 'Male' ? 'Father' : 'Mother';
    case 'sibling':
      return gender === 'Male' ? 'Brother' : 'Sister';
    default:
      return 'Family';
  }
}

// ============================================================================
// PROCEDURAL PERSONALITY & BACKSTORY GENERATION
// ============================================================================

// Personality trait pools - historically appropriate for 14th century Damascus
const PERSONALITY_TRAITS = {
  positive: [
    'kind-hearted', 'devout', 'patient', 'generous', 'wise', 'cheerful',
    'hardworking', 'loyal', 'gentle', 'resourceful', 'hospitable', 'humble',
    'courageous', 'compassionate', 'steadfast', 'peaceful', 'nurturing'
  ],
  neutral: [
    'quiet', 'reserved', 'traditional', 'practical', 'cautious', 'observant',
    'serious', 'private', 'methodical', 'stoic', 'contemplative', 'formal'
  ],
  challenging: [
    'stubborn', 'anxious', 'proud', 'stern', 'melancholic', 'quick-tempered',
    'overprotective', 'worrying', 'demanding', 'restless'
  ]
};

const DAILY_HABITS = {
  spouse_female: [
    'rises before dawn to prepare the household',
    'spends mornings tending to domestic affairs',
    'visits the hammam weekly with neighborhood women',
    'is known for excellent cooking',
    'manages the household accounts carefully',
    'weaves textiles in the afternoon light',
    'maintains a small herb garden on the roof',
    'keeps the home immaculately clean'
  ],
  spouse_male: [
    'leaves early each morning for work',
    'leads the family in evening prayers',
    'spends evenings reading or in discussion',
    'visits the coffeehouse to hear news',
    'maintains close ties with guild members',
    'takes pride in providing for the family',
    'is respected by the neighbors',
    'often brings small gifts home from the suq'
  ],
  child: [
    'loves to play in the courtyard',
    'is learning to read the Quran',
    'follows you everywhere with curious eyes',
    'has a favorite hiding spot in the house',
    'makes friends easily with neighborhood children',
    'asks endless questions about everything',
    'helps with small household tasks',
    'sleeps soundly through the night'
  ],
  youth: [
    'is beginning to learn a trade',
    'spends time with friends in the neighborhood',
    'shows growing independence',
    'is learning adult responsibilities',
    'takes pride in new skills',
    'dreams of future adventures'
  ],
  parent: [
    'spends much time in prayer and reflection',
    'shares wisdom from years of experience',
    'enjoys sitting in the courtyard sun',
    'tells stories of Damascus in former times',
    'maintains old friendships across the city',
    'offers counsel when asked',
    'remembers those who have passed on',
    'keeps the old traditions alive'
  ]
};

const CONCERNS_BY_CONTEXT = {
  plague_time: [
    'worries about the spreading sickness',
    'prays daily for the family\'s protection',
    'has noticed fewer people in the streets',
    'speaks of relatives in other quarters',
    'wonders if the plague will reach us',
    'keeps the children close to home'
  ],
  general: [
    'hopes for continued good fortune',
    'thinks often of distant relatives',
    'worries about rising prices in the suq',
    'prays for rain for the crops',
    'looks forward to the next festival',
    'wishes to make pilgrimage someday'
  ]
};

export interface FamilyMemberProfile {
  traits: string[];
  primaryTrait: string;
  backstory: string;
  dailyHabit: string;
  currentConcern: string;
  relationshipQuality: 'devoted' | 'close' | 'respectful' | 'strained';
  relationshipDescription: string;
  physicalDescription: string;
  voice: string; // How they typically speak
}

/**
 * Generate a deterministic seed number from a string ID
 */
function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a complete personality profile for a family member
 * Uses the npcId as seed for deterministic generation
 */
export function generateFamilyMemberProfile(
  member: FamilyMember,
  playerGender: 'Male' | 'Female',
  playerProfession: string,
  socialClass: SocialClass
): FamilyMemberProfile {
  const baseSeed = hashStringToSeed(member.npcId);
  let s = baseSeed;
  const rand = () => seededRandom(s++);

  // Generate 2-3 personality traits
  const traitCount = 2 + Math.floor(rand() * 2);
  const traits: string[] = [];

  // Always include at least one positive trait for family
  traits.push(PERSONALITY_TRAITS.positive[Math.floor(rand() * PERSONALITY_TRAITS.positive.length)]);

  // Add neutral or challenging traits
  if (rand() > 0.3) {
    traits.push(PERSONALITY_TRAITS.neutral[Math.floor(rand() * PERSONALITY_TRAITS.neutral.length)]);
  }
  if (traitCount > 2 && rand() > 0.5) {
    traits.push(PERSONALITY_TRAITS.challenging[Math.floor(rand() * PERSONALITY_TRAITS.challenging.length)]);
  }

  const primaryTrait = traits[0];

  // Generate daily habit based on relationship and age
  let habitPool: string[];
  if (member.relationship === 'spouse') {
    habitPool = member.gender === 'Female' ? DAILY_HABITS.spouse_female : DAILY_HABITS.spouse_male;
  } else if (member.relationship === 'parent') {
    habitPool = DAILY_HABITS.parent;
  } else if (member.relationship === 'child') {
    habitPool = member.age >= 12 ? DAILY_HABITS.youth : DAILY_HABITS.child;
  } else {
    habitPool = DAILY_HABITS.child;
  }
  const dailyHabit = habitPool[Math.floor(rand() * habitPool.length)];

  // Generate current concern (weighted toward plague concerns given the setting)
  const concernPool = rand() > 0.4 ? CONCERNS_BY_CONTEXT.plague_time : CONCERNS_BY_CONTEXT.general;
  const currentConcern = concernPool[Math.floor(rand() * concernPool.length)];

  // Generate relationship quality
  const qualityRoll = rand();
  let relationshipQuality: 'devoted' | 'close' | 'respectful' | 'strained';
  if (qualityRoll > 0.7) relationshipQuality = 'devoted';
  else if (qualityRoll > 0.3) relationshipQuality = 'close';
  else if (qualityRoll > 0.1) relationshipQuality = 'respectful';
  else relationshipQuality = 'strained';

  // Generate backstory based on relationship
  const backstory = generateBackstory(member, playerGender, playerProfession, socialClass, rand);

  // Generate relationship description
  const relationshipDescription = generateRelationshipDescription(
    member, playerGender, relationshipQuality, rand
  );

  // Generate physical description
  const physicalDescription = generatePhysicalDescription(member, rand);

  // Generate voice/speaking style
  const voice = generateVoice(member, primaryTrait, rand);

  return {
    traits,
    primaryTrait,
    backstory,
    dailyHabit,
    currentConcern,
    relationshipQuality,
    relationshipDescription,
    physicalDescription,
    voice
  };
}

function generateBackstory(
  member: FamilyMember,
  playerGender: 'Male' | 'Female',
  playerProfession: string,
  socialClass: SocialClass,
  rand: () => number
): string {
  const playerTitle = playerGender === 'Male' ? 'you' : 'you';

  if (member.relationship === 'spouse') {
    const marriageStories = [
      `Your families arranged this marriage ${5 + Math.floor(rand() * 15)} years ago. What began as duty has grown into genuine affection.`,
      `You met through the matchmaker in the old quarter. From the first meeting, there was an understanding between you.`,
      `Your marriage was blessed by a respected imam, joining two families of the ${socialClass.toLowerCase()} class.`,
      `The wedding celebration lasted three days. The neighborhood still speaks of it fondly.`,
      `You were introduced by mutual friends at a festival gathering. The connection was immediate.`,
    ];
    return marriageStories[Math.floor(rand() * marriageStories.length)];
  }

  if (member.relationship === 'child') {
    if (member.age < 3) {
      return `Born just ${member.age === 1 ? 'a year' : 'two years'} ago, bringing joy to the household despite these troubled times.`;
    } else if (member.age < 7) {
      const childStories = [
        `Born during a year of good harvests, seen as a blessing from God.`,
        `Named after a beloved grandparent who passed before the birth.`,
        `The midwife said this one would bring good fortune to the family.`,
      ];
      return childStories[Math.floor(rand() * childStories.length)];
    } else {
      const youthStories = [
        `Growing quickly now, ${member.gender === 'Male' ? 'he' : 'she'} shows signs of becoming a capable adult.`,
        `${member.name} has your ${rand() > 0.5 ? 'eyes' : 'temperament'}, the neighbors say.`,
        `Already ${member.gender === 'Male' ? 'he' : 'she'} speaks of what ${member.gender === 'Male' ? 'he' : 'she'} will become.`,
      ];
      return youthStories[Math.floor(rand() * youthStories.length)];
    }
  }

  if (member.relationship === 'parent') {
    const parentStories = [
      `Has lived in Damascus for ${40 + Math.floor(rand() * 20)} years, witnessing much change.`,
      `Once worked as a ${rand() > 0.5 ? 'craftsman' : 'trader'} before age slowed those pursuits.`,
      `Remembers when the great mosque was restored, and tells the story often.`,
      `Survived earlier plagues and famines, carrying wisdom from those dark times.`,
      `Still visits old friends in the ${rand() > 0.5 ? 'suq' : 'old quarter'} when health permits.`,
    ];
    return parentStories[Math.floor(rand() * parentStories.length)];
  }

  return 'A member of your household in Damascus.';
}

function generateRelationshipDescription(
  member: FamilyMember,
  playerGender: 'Male' | 'Female',
  quality: 'devoted' | 'close' | 'respectful' | 'strained',
  rand: () => number
): string {
  const pronoun = member.gender === 'Male' ? 'He' : 'She';
  const possessive = member.gender === 'Male' ? 'his' : 'her';

  if (quality === 'devoted') {
    const devoted = [
      `${pronoun} would do anything for you without hesitation.`,
      `The bond between you is the talk of neighbors—such devotion is rare.`,
      `${pronoun} lights up when you enter the room.`,
      `Your wellbeing is ${possessive} constant concern.`
    ];
    return devoted[Math.floor(rand() * devoted.length)];
  }

  if (quality === 'close') {
    const close = [
      `You share an easy companionship built over years.`,
      `${pronoun} knows your moods and respects your silences.`,
      `There is trust and warmth between you.`,
      `You understand each other without many words.`
    ];
    return close[Math.floor(rand() * close.length)];
  }

  if (quality === 'respectful') {
    const respectful = [
      `${pronoun} fulfills ${possessive} duties faithfully.`,
      `There is mutual respect, if not always warmth.`,
      `You live together in peace, each knowing ${possessive} role.`,
      `${pronoun} honors the family obligations.`
    ];
    return respectful[Math.floor(rand() * respectful.length)];
  }

  // strained
  const strained = [
    `There is tension between you that others notice.`,
    `Old disagreements cast shadows, though daily life continues.`,
    `${pronoun} keeps ${possessive} distance when possible.`,
    `Words must be chosen carefully to avoid conflict.`
  ];
  return strained[Math.floor(rand() * strained.length)];
}

function generatePhysicalDescription(member: FamilyMember, rand: () => number): string {
  const builds = ['slight', 'average', 'sturdy', 'tall', 'short'];
  const features = ['kind eyes', 'weathered hands', 'a gentle smile', 'an expressive face', 'a calm demeanor'];
  const distinctives = [
    'a small scar above the eyebrow',
    'hair going grey at the temples',
    'callused hands from work',
    'laugh lines around the eyes',
    'a distinctive way of tilting the head when listening'
  ];

  const build = builds[Math.floor(rand() * builds.length)];
  const feature = features[Math.floor(rand() * features.length)];

  if (member.age < 12) {
    const childFeatures = ['bright curious eyes', 'a ready smile', 'restless energy', 'a sweet face'];
    return `A ${build} child with ${childFeatures[Math.floor(rand() * childFeatures.length)]}.`;
  }

  if (rand() > 0.6) {
    const distinctive = distinctives[Math.floor(rand() * distinctives.length)];
    return `Of ${build} build, with ${feature} and ${distinctive}.`;
  }

  return `Of ${build} build, with ${feature}.`;
}

function generateVoice(member: FamilyMember, primaryTrait: string, rand: () => number): string {
  if (member.age < 7) {
    const childVoices = [
      'Speaks in excited bursts, often interrupting',
      'Has a sweet, high voice that carries',
      'Whispers secrets and shouts with equal enthusiasm',
      'Still learning proper forms of address'
    ];
    return childVoices[Math.floor(rand() * childVoices.length)];
  }

  if (member.relationship === 'parent') {
    const elderVoices = [
      'Speaks slowly and deliberately, choosing words with care',
      'Has a voice roughened by age but warm with affection',
      'Often quotes proverbs and the words of the Prophet',
      'Speaks softly now, conserving strength'
    ];
    return elderVoices[Math.floor(rand() * elderVoices.length)];
  }

  const generalVoices = [
    'Speaks warmly but directly',
    'Has a melodic voice that neighbors recognize',
    'Chooses words carefully before speaking',
    'Often hums while working',
    'Has a quiet, measured way of speaking',
    'Laughs easily and speaks with animation'
  ];
  return generalVoices[Math.floor(rand() * generalVoices.length)];
}
