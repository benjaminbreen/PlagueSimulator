import {
  MerchantNPC,
  MerchantType,
  MarketStallType,
  NPCStats,
  SocialClass,
  MerchantInventory
} from '../types';
import { seededRandom } from './procedural';
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

    default:
      return 'Merchant';
  }
};

// Generate merchant-specific greeting
const generateMerchantGreeting = (
  type: MerchantType,
  name: string,
  haggleModifier: number,
  rand: () => number
): string => {
  // Personality based on haggle modifier
  const isGenerous = haggleModifier < 0.95;
  const isGreedy = haggleModifier > 1.1;

  const greetings: { [key in MerchantType]: string[] } = {
    [MerchantType.TEXTILE]: [
      `As-salamu alaykum! I am ${name}. These fabrics come from the finest looms in Damascus.`,
      `Welcome, traveler! ${name} at your service. See how the silk catches the light?`,
      `Greetings! I am ${name}, weaver of fine cloth. Touch this damask - you'll find none softer.`,
      `Peace be upon you. ${name} here. These textiles will make you the envy of the souk.`
    ],

    [MerchantType.APOTHECARY]: [
      `As-salamu alaykum. ${name}, purveyor of healing herbs and rare spices.`,
      `Welcome, friend. I am ${name}. My remedies have cured many ailments.`,
      `Greetings! ${name} the apothecary. These spices traveled the Silk Road to reach you.`,
      `Peace. ${name} at your service. My saffron is the finest in all Damascus.`
    ],

    [MerchantType.METALSMITH]: [
      `As-salamu alaykum. ${name}, master of metal and forge.`,
      `Welcome! I am ${name}. This Damascus steel bears the mark of true craftsmanship.`,
      `Greetings, traveler. ${name} here. My blades and brass are known throughout Syria.`,
      `Peace be with you. ${name} the metalsmith. Feel the weight - quality work, no?`
    ],

    [MerchantType.TRADER]: [
      `As-salamu alaykum! ${name} welcomes you. I have goods from near and far.`,
      `Welcome, friend! I am ${name}. Looking for something? I likely have it.`,
      `Greetings! ${name} at your service. Fair prices and honest trade.`,
      `Peace upon you. ${name} here. Browse my wares - something for everyone!`
    ]
  };

  let greeting = greetings[type][Math.floor(rand() * greetings[type].length)];

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

  // Generate Arabic names
  const maleNames = [
    'Ahmad', 'Hassan', 'Ali', 'Omar', 'Yusuf', 'Ibrahim', 'Khalid', 'Rashid',
    'Mahmud', 'Said', 'Tariq', 'Walid', 'Zayd', 'Malik', 'Karim', 'Jamil'
  ];
  const femaleNames = [
    'Fatima', 'Aisha', 'Zainab', 'Maryam', 'Layla', 'Safiya', 'Amina', 'Khadija',
    'Zahra', 'Salma', 'Nadia', 'Rania', 'Yasmin', 'Hana', 'Samira', 'Lubna'
  ];

  const gender: 'Male' | 'Female' = rand() < 0.7 ? 'Male' : 'Female'; // 70% male merchants (historical)
  const namePool = gender === 'Male' ? maleNames : femaleNames;
  const name = namePool[Math.floor(rand() * namePool.length)];

  // Merchants are typically middle-aged and merchant class
  const age = 30 + Math.floor(rand() * 25); // 30-54 years
  const profession = getMerchantProfession(merchantType, rand);

  // Physical traits
  const height = 1.5 + rand() * 0.4; // 1.5-1.9m
  const weight = 55 + rand() * 40; // 55-95kg

  // Appearance - merchants dress well
  const robeColors = ['#4a3c2a', '#6b4423', '#3d2817', '#5c4033', '#8b7355'];
  const robePattern: 'none' | 'damask' | 'stripe' | 'chevron' =
    rand() < 0.3 ? 'damask' : rand() < 0.5 ? 'stripe' : 'none';

  const headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'none' =
    gender === 'Female' ? 'scarf' :
    rand() < 0.4 ? 'turban' : rand() < 0.7 ? 'cap' : 'fez';

  const footwearStyle: 'sandals' | 'shoes' | 'bare' =
    rand() < 0.7 ? 'shoes' : 'sandals';

  const accessories: string[] = [];
  if (rand() < 0.4) accessories.push('Belt pouch');
  if (rand() < 0.3) accessories.push('Merchant\'s ring');
  if (rand() < 0.2) accessories.push('Silver brooch');

  return {
    id: merchantId,
    name,
    age,
    profession,
    gender,
    socialClass: SocialClass.MERCHANT,
    height,
    weight,
    mood: 'Mercantile',
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
    accessories
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
  const greeting = generateMerchantGreeting(merchantType, stats.name, haggleModifier, rand);

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
