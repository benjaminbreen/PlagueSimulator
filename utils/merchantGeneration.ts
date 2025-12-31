import {
  MerchantNPC,
  MerchantType,
  MarketStallType,
  NPCStats,
  SocialClass,
  MerchantInventory,
  Ethnicity,
  Religion
} from '../types';
import { seededRandom, generateNameForMerchant } from './procedural';
import { assignDemographics } from './demographics';
import { generateMerchantInventory } from './merchantItems';

// Map stall types to merchant types
export const mapStallTypeToMerchantType = (stallType: MarketStallType): MerchantType => {
  switch (stallType) {
    case MarketStallType.SPICES:
    case MarketStallType.PERFUMES:
      return MerchantType.APOTHECARY;

    case MarketStallType.TEXTILES:
    case MarketStallType.RUGS:
      return MerchantType.TEXTILE;

    case MarketStallType.METALWORK:
      return MerchantType.METALSMITH;

    case MarketStallType.POTTERY:
    case MarketStallType.GLASSWARE:
    case MarketStallType.FOOD:
      return MerchantType.TRADER;

    default:
      return MerchantType.TRADER;
  }
};

// Generate merchant-specific profession name
const getMerchantProfession = (type: MerchantType, rand: () => number): string => {
  switch (type) {
    case MerchantType.TEXTILE:
      return rand() < 0.5 ? 'Textile Merchant' : 'Cloth Seller';

    case MerchantType.APOTHECARY:
      return rand() < 0.5 ? 'Apothecary' : 'Spice Merchant';

    case MerchantType.METALSMITH:
      return rand() < 0.5 ? 'Metalsmith' : 'Brass Worker';

    case MerchantType.TRADER:
      const titles = ['Trader', 'General Merchant', 'Market Seller', 'Goods Dealer'];
      return titles[Math.floor(rand() * titles.length)];

    case MerchantType.BEDOUIN:
      const bedouinTitles = ['Bedouin Trader', 'Desert Merchant', 'Nomad Trader'];
      return bedouinTitles[Math.floor(rand() * bedouinTitles.length)];

    default:
      return 'Merchant';
  }
};

// Get religion-appropriate merchant greeting prefix
const getMerchantGreetingPrefix = (religion: Religion, name: string, rand: () => number): string => {
  if (religion === 'Sunni Islam' || religion === 'Shia Islam') {
    const prefixes = [
      `As-salamu alaykum! I am ${name}.`,
      `Peace be upon you. ${name} at your service.`,
      `Salaam, friend! ${name} welcomes you.`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  if (religion === 'Eastern Orthodox') {
    const prefixes = [
      `God be with you! I am ${name}.`,
      `Christ's blessings, friend. ${name} at your service.`,
      `Welcome, traveler! ${name} here.`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  if (religion === 'Armenian Apostolic') {
    const prefixes = [
      `Barev! I am ${name} the Armenian.`,
      `God's peace upon you. ${name} welcomes you.`,
      `Welcome, friend! ${name} at your service.`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  if (religion === 'Syriac Orthodox') {
    const prefixes = [
      `Shlama! I am ${name}.`,
      `God bless you, friend. ${name} at your service.`,
      `Welcome! ${name} the Syriac welcomes you.`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  if (religion === 'Jewish') {
    const prefixes = [
      `Shalom! I am ${name}.`,
      `Peace upon you, friend. ${name} at your service.`,
      `Welcome! ${name} welcomes you to my stall.`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  if (religion === 'Latin Christian') {
    const prefixes = [
      `Buongiorno! I am ${name}, merchant from Italia.`,
      `Ah, welcome! ${name} of Venezia at your service.`,
      `Benvenuto! ${name} here. The finest goods from the West!`,
      `Dio vi benedica! I am ${name}. You seek quality, yes?`,
    ];
    return prefixes[Math.floor(rand() * prefixes.length)];
  }

  // Default/Druze
  return `Peace upon you. I am ${name}.`;
};

// Generate merchant-specific greeting
const generateMerchantGreeting = (
  type: MerchantType,
  name: string,
  religion: Religion,
  haggleModifier: number,
  rand: () => number
): string => {
  // Personality based on haggle modifier
  const isGenerous = haggleModifier < 0.95;
  const isGreedy = haggleModifier > 1.1;

  // Get religion-appropriate prefix
  const prefix = getMerchantGreetingPrefix(religion, name, rand);

  // Type-specific product pitch
  const pitches: { [key in MerchantType]: string[] } = {
    [MerchantType.TEXTILE]: [
      'These fabrics come from the finest looms in Damascus.',
      'See how the silk catches the light?',
      'Touch this damask - you will find none softer.',
      'These textiles will make you the envy of the souk.'
    ],
    [MerchantType.APOTHECARY]: [
      'Purveyor of healing herbs and rare spices.',
      'My remedies have cured many ailments.',
      'These spices traveled the Silk Road to reach you.',
      'My saffron is the finest in all Damascus.'
    ],
    [MerchantType.METALSMITH]: [
      'Master of metal and forge.',
      'This Damascus steel bears the mark of true craftsmanship.',
      'My blades and brass are known throughout Syria.',
      'Feel the weight - quality work, no?'
    ],
    [MerchantType.TRADER]: [
      'I have goods from near and far.',
      'Looking for something? I likely have it.',
      'Fair prices and honest trade.',
      'Browse my wares - something for everyone!'
    ],
    [MerchantType.BEDOUIN]: [
      'I have traveled far from the deep desert with these treasures.',
      'My wares are not found in the common markets.',
      'These goods crossed many sands to reach Damascus.',
      'The desert reveals its secrets only to those who seek them.',
      'From the ancient trade routes of my ancestors, I bring you these rarities.'
    ]
  };

  const pitch = pitches[type][Math.floor(rand() * pitches[type].length)];
  let greeting = `${prefix} ${pitch}`;

  // Add personality flavor
  if (isGenerous) {
    const generousSuffixes = [
      ' Today I am feeling generous.',
      ' For you, my friend, a special price.',
      ' Your timing is good - I am in a charitable mood.'
    ];
    greeting += generousSuffixes[Math.floor(rand() * generousSuffixes.length)];
  } else if (isGreedy) {
    const greedySuffixes = [
      ' Quality has its price, you understand.',
      ' These are rare items - hard to come by.',
      ' Such goods do not come cheap, I assure you.'
    ];
    greeting += greedySuffixes[Math.floor(rand() * greedySuffixes.length)];
  }

  return greeting;
};

// Generate merchant NPC stats
const generateMerchantStats = (
  merchantId: string,
  merchantType: MerchantType,
  seed: number
): NPCStats => {
  let randOffset = 0;
  const rand = () => seededRandom(seed + randOffset++);

  const gender: 'Male' | 'Female' = rand() < 0.7 ? 'Male' : 'Female'; // 70% male merchants (historical)

  // Merchants are typically middle-aged and merchant class
  const age = 30 + Math.floor(rand() * 25); // 30-54 years
  const profession = getMerchantProfession(merchantType, rand);

  // Assign demographics BEFORE name generation (fixes ethnicity/name mismatch)
  const { ethnicity, religion, language } = assignDemographics(rand, {
    districtType: 'MARKET',
    profession,
    socialClass: SocialClass.MERCHANT,
    gender
  });

  // Generate ethnicity-appropriate name
  const name = generateNameForMerchant(rand, gender, ethnicity, religion);

  // Physical traits
  const height = 1.5 + rand() * 0.4; // 1.5-1.9m
  const weight = 55 + rand() * 40; // 55-95kg

  // Appearance - merchants dress well
  const robeColors = ['#4a3c2a', '#6b4423', '#3d2817', '#5c4033', '#8b7355'];
  const robePattern: 'none' | 'damask' | 'stripe' | 'chevron' =
    rand() < 0.3 ? 'damask' : rand() < 0.5 ? 'stripe' : 'none';

  let headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none' =
    gender === 'Female' ? 'scarf' :
    rand() < 0.4 ? 'turban' : rand() < 0.7 ? 'cap' : 'fez';

  const footwearStyle: 'sandals' | 'shoes' | 'bare' =
    rand() < 0.7 ? 'shoes' : 'sandals';

  const accessories: string[] = [];
  if (rand() < 0.4) accessories.push('Belt pouch');
  if (rand() < 0.3) accessories.push('Merchant\'s ring');
  if (rand() < 0.2) accessories.push('Silver brooch');

  // Religion-based headwear adjustments (demographics already assigned above)
  if (gender === 'Male') {
    if (religion === 'Eastern Orthodox' || religion === 'Syriac Orthodox' || religion === 'Armenian Apostolic') {
      headwearStyle = rand() > 0.6 ? 'none' : 'cap';
    } else if (religion === 'Jewish') {
      headwearStyle = rand() > 0.5 ? 'cap' : 'taqiyah';
    } else if (religion === 'Druze') {
      headwearStyle = rand() > 0.5 ? 'turban' : 'cap';
    } else if (religion === 'Shia Islam' && headwearStyle === 'cap' && rand() > 0.6) {
      headwearStyle = 'turban';
    }
  }

  // Generate disposition for merchant (merchants tend to be more personable for business)
  const baseDisposition = 30 + Math.floor(rand() * 50); // 30-80 range, skewing friendly
  const disposition = Math.min(100, baseDisposition);

  // Merchant-specific moods based on disposition
  const getMerchantMood = (disp: number): string => {
    if (disp >= 70) {
      const moods = ['Eager', 'Welcoming', 'Cheerful', 'Gracious', 'Jovial'];
      return moods[Math.floor(rand() * moods.length)];
    } else if (disp >= 50) {
      const moods = ['Businesslike', 'Attentive', 'Patient', 'Cordial', 'Calculating'];
      return moods[Math.floor(rand() * moods.length)];
    } else if (disp >= 30) {
      const moods = ['Busy', 'Preoccupied', 'Reserved', 'Distracted', 'Matter-of-fact'];
      return moods[Math.floor(rand() * moods.length)];
    } else {
      const moods = ['Impatient', 'Irritable', 'Wary', 'Suspicious', 'Cold'];
      return moods[Math.floor(rand() * moods.length)];
    }
  };
  const mood = getMerchantMood(disposition);

  const awarenessLevel = Math.max(0, Math.min(100, 8 + Math.floor(rand() * 14)));
  // Panic 0-10, reduced by disposition
  const basePanic = Math.floor(rand() * 10);
  const dispositionPanicReduction = Math.floor(disposition / 20);
  const panicLevel = Math.max(0, Math.min(100, basePanic - dispositionPanicReduction));

  return {
    id: merchantId,
    name,
    age,
    profession,
    gender,
    socialClass: SocialClass.MERCHANT,
    ethnicity,
    religion,
    language,
    height,
    weight,
    disposition,
    mood,
    awarenessLevel,
    panicLevel,
    goalOfDay: 'Make a profitable sale before sundown.',
    robeSpread: 0.8 + rand() * 0.4,
    robeHasTrim: rand() < 0.6,
    robeHemBand: rand() < 0.5,
    robeOverwrap: rand() < 0.4,
    robePattern,
    hairStyle: gender === 'Female' ? 'covered' : rand() < 0.5 ? 'short' : 'medium',
    headwearStyle,
    sleeveCoverage: 'full',
    footwearStyle,
    footwearColor: footwearStyle === 'shoes' ? '#3d2817' : '#8b7355',
    accessories,
    heldItem: 'ledger'
  };
};

// Main function to generate merchant NPC
export const generateMerchantNPC = (
  locationId: string,
  locationType: 'STALL' | 'INTERIOR',
  merchantType: MerchantType,
  position: [number, number, number],
  seed: number,
  simTime: number
): MerchantNPC => {
  const merchantId = `merchant-${locationId}`;
  let randOffset = 0;
  const rand = () => seededRandom(seed + randOffset++);

  // Generate merchant stats
  const stats = generateMerchantStats(merchantId, merchantType, seed);

  // Generate haggle modifier (0.8-1.2)
  // Lower = merchant offers better deals, higher = merchant is greedy
  const haggleModifier = 0.8 + rand() * 0.4;

  // Generate inventory
  const items = generateMerchantInventory(merchantType, merchantId, seed, simTime);
  const restockInterval = 24 + Math.floor(rand() * 24); // 24-48 hours

  const inventory: MerchantInventory = {
    merchantId,
    items,
    lastRestockTime: simTime,
    restockInterval
  };

  // Generate greeting
  const greeting = generateMerchantGreeting(merchantType, stats.name, stats.religion, haggleModifier, rand);

  return {
    id: merchantId,
    type: merchantType,
    stats,
    locationId,
    locationType,
    position,
    inventory,
    haggleModifier,
    greeting
  };
};

// Helper to restock merchant inventory
export const restockMerchantInventory = (
  merchant: MerchantNPC,
  simTime: number,
  seed: number
): MerchantNPC => {
  const hoursSinceRestock = simTime - merchant.inventory.lastRestockTime;

  if (hoursSinceRestock >= merchant.inventory.restockInterval) {
    // Generate new inventory
    const newItems = generateMerchantInventory(
      merchant.type,
      merchant.id,
      seed + Math.floor(simTime / 24), // Different seed each day
      simTime
    );

    return {
      ...merchant,
      inventory: {
        ...merchant.inventory,
        items: newItems,
        lastRestockTime: simTime
      }
    };
  }

  return merchant;
};
