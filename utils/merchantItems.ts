import { MerchantItem, MerchantType, ItemEffect } from '../types';
import { seededRandom } from './procedural';

// Base item templates (without id and quantity which are generated)
type ItemTemplate = Omit<MerchantItem, 'id' | 'quantity'>;

// TEXTILE MERCHANT - Fabrics, robes, clothing
export const TEXTILE_ITEMS: ItemTemplate[] = [
  // Common (60% chance)
  { name: 'Linen Cloth', description: 'Simple undyed linen, cool in the heat', category: MerchantType.TEXTILE, basePrice: 5, rarity: 'common' },
  { name: 'Cotton Headscarf', description: 'Plain cotton head covering', category: MerchantType.TEXTILE, basePrice: 8, rarity: 'common' },
  { name: 'Wool Cloak', description: 'Warm woolen outer garment for cold nights', category: MerchantType.TEXTILE, basePrice: 15, rarity: 'common' },
  { name: 'Hemp Tunic', description: 'Durable everyday wear', category: MerchantType.TEXTILE, basePrice: 12, rarity: 'common' },
  { name: 'Cotton Belt Sash', description: 'Simple waist sash', category: MerchantType.TEXTILE, basePrice: 6, rarity: 'common' },
  { name: 'Linen Scrap', description: 'Frayed linen remnant, still useful', category: MerchantType.TEXTILE, basePrice: 2, rarity: 'common' },
  { name: 'Leather Sandals', description: 'Simple open footwear for the heat', category: MerchantType.TEXTILE, basePrice: 10, rarity: 'common' },
  { name: 'Linen Burial Shroud', description: 'Simple white cloth for the deceased', category: MerchantType.TEXTILE, basePrice: 8, rarity: 'common' },

  // Uncommon (30% chance)
  { name: 'Damask Robe', description: 'Fine patterned silk from Damascus looms', category: MerchantType.TEXTILE, basePrice: 45, rarity: 'uncommon' },
  { name: 'Embroidered Kaftan', description: 'Decorated with gold thread patterns', category: MerchantType.TEXTILE, basePrice: 60, rarity: 'uncommon' },
  { name: 'Silk Headwrap', description: 'Luxurious head covering', category: MerchantType.TEXTILE, basePrice: 35, rarity: 'uncommon' },
  { name: 'Brocade Vest', description: 'Woven with metallic threads', category: MerchantType.TEXTILE, basePrice: 50, rarity: 'uncommon' },
  { name: 'Indigo Dye Cake', description: 'Precious blue dye from distant India', category: MerchantType.TEXTILE, basePrice: 28, rarity: 'uncommon' },

  // Rare (10% chance)
  { name: 'Silk Prayer Rug', description: 'Exquisite woven carpet for devotion', category: MerchantType.TEXTILE, basePrice: 120, rarity: 'rare' },
  { name: 'Royal Purple Damask', description: 'Reserved for nobility, dyed with precious murex', category: MerchantType.TEXTILE, basePrice: 200, rarity: 'rare' },
  { name: 'Persian Carpet', description: 'Intricate knotted masterwork from the East', category: MerchantType.TEXTILE, basePrice: 250, rarity: 'rare' }
];

// APOTHECARY - Medicines, spices, herbs
export const APOTHECARY_ITEMS: ItemTemplate[] = [
  // Common
  { name: 'Dates', description: 'Sweet dried fruit, restores energy', category: MerchantType.APOTHECARY, basePrice: 3, rarity: 'common', effects: [{ type: 'heal', value: 10 }] },
  { name: 'Cumin', description: 'Common spice for cooking and digestion', category: MerchantType.APOTHECARY, basePrice: 2, rarity: 'common' },
  { name: 'Black Pepper', description: 'Sharp spice from India', category: MerchantType.APOTHECARY, basePrice: 5, rarity: 'common' },
  { name: 'Mint Leaves', description: 'Refreshing herb for tea and stomach ailments', category: MerchantType.APOTHECARY, basePrice: 2, rarity: 'common', effects: [{ type: 'heal', value: 5 }] },
  { name: 'Honey', description: 'Sweet preservative with healing properties', category: MerchantType.APOTHECARY, basePrice: 8, rarity: 'common', effects: [{ type: 'heal', value: 15 }] },
  { name: 'Coriander Seeds', description: 'Aromatic spice and digestive aid', category: MerchantType.APOTHECARY, basePrice: 3, rarity: 'common' },
  { name: 'Aloe Vera', description: 'Fresh succulent for burns and skin ailments', category: MerchantType.APOTHECARY, basePrice: 4, rarity: 'common', effects: [{ type: 'heal', value: 8 }] },
  { name: 'Pomegranate Seeds', description: 'Dried seeds, valued as a digestive tonic', category: MerchantType.APOTHECARY, basePrice: 4, rarity: 'common', effects: [{ type: 'heal', value: 6 }] },
  { name: 'Henna Powder', description: 'Red-orange dye for hands, hair, and nails', category: MerchantType.APOTHECARY, basePrice: 5, rarity: 'common' },
  { name: 'Kohl Powder', description: 'Black antimony powder for eye cosmetics', category: MerchantType.APOTHECARY, basePrice: 4, rarity: 'common' },

  // Uncommon
  { name: 'Rose Water', description: 'Fragrant distillation for health and beauty', category: MerchantType.APOTHECARY, basePrice: 25, rarity: 'uncommon', effects: [{ type: 'heal', value: 30 }] },
  { name: 'Saffron Threads', description: 'Precious spice and medicine from Persia', category: MerchantType.APOTHECARY, basePrice: 40, rarity: 'uncommon' },
  { name: 'Camphor Oil', description: 'Aromatic remedy for respiratory ailments', category: MerchantType.APOTHECARY, basePrice: 35, rarity: 'uncommon', effects: [{ type: 'heal', value: 40 }] },
  { name: 'Myrrh Resin', description: 'Medicinal gum from Arabia', category: MerchantType.APOTHECARY, basePrice: 30, rarity: 'uncommon', effects: [{ type: 'heal', value: 35 }] },
  { name: 'Cardamom', description: 'Rare spice from distant lands', category: MerchantType.APOTHECARY, basePrice: 28, rarity: 'uncommon' },

  // Rare
  { name: 'Theriac Compound', description: 'Ancient cure-all tonic of many ingredients', category: MerchantType.APOTHECARY, basePrice: 150, rarity: 'rare', effects: [{ type: 'heal', value: 100 }] },
  { name: 'Musk Perfume', description: 'Rare fragrance from the East', category: MerchantType.APOTHECARY, basePrice: 180, rarity: 'rare' },
  { name: 'Ambergris', description: 'Mysterious oceanic substance, invaluable', category: MerchantType.APOTHECARY, basePrice: 300, rarity: 'rare' },
  { name: 'Opium Paste', description: 'Powerful sedative from poppy, used sparingly by hakims', category: MerchantType.APOTHECARY, basePrice: 120, rarity: 'rare', effects: [{ type: 'heal', value: 80 }] },
  { name: 'Bezoar Stone', description: 'Stone from goat stomach, believed to cure poison', category: MerchantType.APOTHECARY, basePrice: 200, rarity: 'rare' }
];

// METALSMITH - Weapons, tools, brass goods
export const METALSMITH_ITEMS: ItemTemplate[] = [
  // Common
  { name: 'Iron Horseshoe', description: 'Practical farrier work', category: MerchantType.METALSMITH, basePrice: 4, rarity: 'common' },
  { name: 'Brass Bowl', description: 'Simple cooking vessel', category: MerchantType.METALSMITH, basePrice: 6, rarity: 'common' },
  { name: 'Copper Coin Purse', description: 'Small metal clasp purse', category: MerchantType.METALSMITH, basePrice: 8, rarity: 'common' },
  { name: 'Iron Nail Set', description: 'Assorted nails for construction', category: MerchantType.METALSMITH, basePrice: 3, rarity: 'common' },
  { name: 'Bronze Bell', description: 'Small hand bell', category: MerchantType.METALSMITH, basePrice: 7, rarity: 'common' },
  { name: 'Tin Cup', description: 'Serviceable drinking vessel', category: MerchantType.METALSMITH, basePrice: 4, rarity: 'common' },
  { name: 'Copper Amulet', description: 'Engraved with Quranic verses for protection', category: MerchantType.METALSMITH, basePrice: 6, rarity: 'common' },
  { name: 'Iron Key', description: 'Heavy iron key for a strongbox or door', category: MerchantType.METALSMITH, basePrice: 5, rarity: 'common' },

  // Uncommon
  { name: 'Damascus Steel Dagger', description: 'Famed wavy-pattern blade', category: MerchantType.METALSMITH, basePrice: 55, rarity: 'uncommon' },
  { name: 'Brass Oil Lamp', description: 'Ornate with geometric design', category: MerchantType.METALSMITH, basePrice: 30, rarity: 'uncommon' },
  { name: 'Steel Mirror', description: 'Polished to perfection', category: MerchantType.METALSMITH, basePrice: 40, rarity: 'uncommon' },
  { name: 'Copper Ewer', description: 'Decorative water pitcher', category: MerchantType.METALSMITH, basePrice: 35, rarity: 'uncommon' },
  { name: 'Bronze Incense Burner', description: 'Pierced design releases fragrance', category: MerchantType.METALSMITH, basePrice: 38, rarity: 'uncommon' },
  { name: 'Silver Kohl Container', description: 'Small decorated vessel for eye cosmetic', category: MerchantType.METALSMITH, basePrice: 32, rarity: 'uncommon' },

  // Rare
  { name: 'Damascus Scimitar', description: 'Masterwork curved sword of legendary quality', category: MerchantType.METALSMITH, basePrice: 250, rarity: 'rare' },
  { name: 'Gold-Inlaid Astrolabe', description: 'Precision navigation instrument', category: MerchantType.METALSMITH, basePrice: 300, rarity: 'rare' },
  { name: 'Silver Filigree Pendant', description: 'Delicate wirework jewelry', category: MerchantType.METALSMITH, basePrice: 180, rarity: 'rare' },
  { name: 'Geometric Compass', description: 'Brass instrument for mathematics and design', category: MerchantType.METALSMITH, basePrice: 150, rarity: 'rare' }
];

// BEDOUIN - Desert nomad, rare exotic goods from far-flung trade routes
export const BEDOUIN_ITEMS: ItemTemplate[] = [
  // Rare items only (Bedouin merchants specialize in exotic goods)
  { name: 'Desert Rose Crystal', description: 'Rare sand-formed mineral from the deep desert', category: MerchantType.BEDOUIN, basePrice: 140, rarity: 'rare' },
  { name: 'Frankincense Tears', description: 'Premium resin from South Arabian trees', category: MerchantType.BEDOUIN, basePrice: 160, rarity: 'rare' },
  { name: 'Bedouin Silver Bracelet', description: 'Traditional nomadic jewelry with tribal motifs', category: MerchantType.BEDOUIN, basePrice: 190, rarity: 'rare' },
  { name: 'Arabian Coffee Beans', description: 'Rare beans from Yemeni highlands', category: MerchantType.BEDOUIN, basePrice: 110, rarity: 'rare' },
  { name: 'Desert Truffles', description: 'Prized fungi from the arid plains', category: MerchantType.BEDOUIN, basePrice: 130, rarity: 'rare', effects: [{ type: 'heal', value: 50 }] },
  { name: 'Meteorite Fragment', description: 'Star-metal fallen from the heavens', category: MerchantType.BEDOUIN, basePrice: 250, rarity: 'rare' },
  { name: 'Black Camel Hair Cloak', description: 'Fine woven cloak for desert travel', category: MerchantType.BEDOUIN, basePrice: 170, rarity: 'rare' },
  { name: 'Ancient Nabataean Coin', description: 'Pre-Islamic silver coin from Petra', category: MerchantType.BEDOUIN, basePrice: 220, rarity: 'rare' },
  { name: 'Oud Wood', description: 'Precious agarwood for incense and perfume', category: MerchantType.BEDOUIN, basePrice: 280, rarity: 'rare' },
  { name: 'Bedouin Curved Dagger', description: 'Jambiya with rhino horn handle', category: MerchantType.BEDOUIN, basePrice: 240, rarity: 'rare' },
  { name: 'Striped Agates', description: 'Polished stones from desert wadis', category: MerchantType.BEDOUIN, basePrice: 120, rarity: 'rare' },
  { name: 'Nomad Medicine Pouch', description: 'Leather pouch with rare desert herbs', category: MerchantType.BEDOUIN, basePrice: 150, rarity: 'rare', effects: [{ type: 'heal', value: 70 }] },
  { name: 'Woven Camel Saddle Bag', description: 'Expertly crafted travel satchel', category: MerchantType.BEDOUIN, basePrice: 135, rarity: 'rare' },
  { name: 'Falcon Feather Charm', description: 'Talisman of the desert hunters', category: MerchantType.BEDOUIN, basePrice: 105, rarity: 'rare' },
  { name: 'Bedouin Star Chart', description: 'Nomadic navigation knowledge on leather', category: MerchantType.BEDOUIN, basePrice: 195, rarity: 'rare' },
];

// TRADER - General goods, food, miscellaneous
export const TRADER_ITEMS: ItemTemplate[] = [
  // Common
  { name: 'Dried Figs', description: 'Preserved fruit for travel', category: MerchantType.TRADER, basePrice: 2, rarity: 'common', effects: [{ type: 'heal', value: 5 }] },
  { name: 'Olives', description: 'Brined olives from the grove', category: MerchantType.TRADER, basePrice: 3, rarity: 'common', effects: [{ type: 'heal', value: 8 }] },
  { name: 'Lemons', description: 'Tart citrus, good for the heat', category: MerchantType.TRADER, basePrice: 3, rarity: 'common', effects: [{ type: 'heal', value: 6 }] },
  { name: 'Leather Waterskin', description: 'Holds water for travel', category: MerchantType.TRADER, basePrice: 7, rarity: 'common' },
  { name: 'Hemp Rope', description: 'Useful cordage, 10 cubits', category: MerchantType.TRADER, basePrice: 5, rarity: 'common' },
  { name: 'Candles (Set of 6)', description: 'Beeswax candles for light', category: MerchantType.TRADER, basePrice: 6, rarity: 'common' },
  { name: 'Candle Stub', description: 'Leftover beeswax, can be remelted', category: MerchantType.TRADER, basePrice: 1, rarity: 'common' },
  { name: 'Dried Apricots', description: 'Sweet preserved fruit', category: MerchantType.TRADER, basePrice: 4, rarity: 'common', effects: [{ type: 'heal', value: 12 }] },
  { name: 'Clay Oil Lamp', description: 'Simple earthenware lamp', category: MerchantType.TRADER, basePrice: 3, rarity: 'common' },
  { name: 'Wicker Basket', description: 'Woven carrying basket', category: MerchantType.TRADER, basePrice: 5, rarity: 'common' },
  { name: 'Pottery Shard', description: 'Broken piece of fired clay', category: MerchantType.TRADER, basePrice: 1, rarity: 'common' },
  { name: 'Palm Twine', description: 'Simple fiber cord, hand‑twisted', category: MerchantType.TRADER, basePrice: 1, rarity: 'common' },
  { name: 'Sesame Oil', description: 'Pressed oil for cooking and lamps', category: MerchantType.TRADER, basePrice: 5, rarity: 'common' },
  { name: 'Chickpeas', description: 'Dried legumes, a dietary staple', category: MerchantType.TRADER, basePrice: 2, rarity: 'common', effects: [{ type: 'heal', value: 4 }] },
  { name: 'Aleppo Soap', description: 'Olive oil soap with laurel', category: MerchantType.TRADER, basePrice: 4, rarity: 'common' },
  { name: 'Prayer Beads', description: 'Wooden beads for counting dhikr', category: MerchantType.TRADER, basePrice: 5, rarity: 'common' },
  { name: 'Writing Reed', description: 'Calamus pen for Arabic script', category: MerchantType.TRADER, basePrice: 2, rarity: 'common' },

  // Uncommon
  { name: 'Glass Drinking Vessel', description: 'Fine Damascus glasswork', category: MerchantType.TRADER, basePrice: 20, rarity: 'uncommon' },
  { name: 'Incense Sticks', description: 'Frankincense and myrrh blend', category: MerchantType.TRADER, basePrice: 15, rarity: 'uncommon' },
  { name: 'Painted Ceramic Plate', description: 'Decorated with geometric patterns', category: MerchantType.TRADER, basePrice: 18, rarity: 'uncommon' },
  { name: 'Leather Satchel', description: 'Sturdy travel bag', category: MerchantType.TRADER, basePrice: 22, rarity: 'uncommon' },
  { name: 'Olive Oil (Amphora)', description: 'Fine pressed oil for cooking and lamps', category: MerchantType.TRADER, basePrice: 25, rarity: 'uncommon' },
  { name: 'Pistachio Nuts', description: 'Prized nuts from Aleppo groves', category: MerchantType.TRADER, basePrice: 18, rarity: 'uncommon', effects: [{ type: 'heal', value: 10 }] },
  { name: 'Sugar Loaf', description: 'Conical refined sugar from Egypt', category: MerchantType.TRADER, basePrice: 28, rarity: 'uncommon' },

  // Rare
  { name: 'Illuminated Manuscript Page', description: 'Decorated Quranic verse with gold leaf', category: MerchantType.TRADER, basePrice: 100, rarity: 'rare' },
  { name: 'Chinese Porcelain Bowl', description: 'Silk Road treasure from distant Cathay', category: MerchantType.TRADER, basePrice: 180, rarity: 'rare' },
  { name: 'Byzantine Icon', description: 'Religious artwork from Constantinople', category: MerchantType.TRADER, basePrice: 220, rarity: 'rare' }
];

// Get item pool for a merchant type
export const getItemPool = (merchantType: MerchantType): ItemTemplate[] => {
  switch (merchantType) {
    case MerchantType.TEXTILE:
      return TEXTILE_ITEMS;
    case MerchantType.APOTHECARY:
      return APOTHECARY_ITEMS;
    case MerchantType.METALSMITH:
      return METALSMITH_ITEMS;
    case MerchantType.TRADER:
      return TRADER_ITEMS;
    case MerchantType.BEDOUIN:
      return BEDOUIN_ITEMS;
    default:
      return TRADER_ITEMS;
  }
};

// Generate merchant inventory based on type and seed
export const generateMerchantInventory = (
  merchantType: MerchantType,
  merchantId: string,
  seed: number,
  simTime: number
): MerchantItem[] => {
  const rand = (offset: number) => seededRandom(seed + offset);

  const itemPool = getItemPool(merchantType);

  // Special handling for Bedouin merchants - they only carry 2-3 rare items
  if (merchantType === MerchantType.BEDOUIN) {
    const inventory: MerchantItem[] = [];
    const itemCount = 2 + Math.floor(rand(0) * 2); // 2-3 items

    // Shuffle item pool and select first N items
    const shuffled = [...itemPool].sort(() => rand(Math.random() * 1000) - 0.5);

    for (let i = 0; i < itemCount; i++) {
      const selectedItem = shuffled[i];
      inventory.push({
        ...selectedItem,
        id: `item-${merchantId}-${i}`,
        quantity: 1 + Math.floor(rand(i * 10 + 7) * 2) // 1-2 quantity
      });
    }

    return inventory;
  }

  // Standard merchant inventory generation
  // Rarity-based selection weights
  const commonWeight = 0.6;    // 60% chance
  const uncommonWeight = 0.3;  // 30% chance
  const rareWeight = 0.1;      // 10% chance

  const inventory: MerchantItem[] = [];
  const itemCount = 8 + Math.floor(rand(0) * 5); // 8-12 items

  for (let i = 0; i < itemCount; i++) {
    const rarityRoll = rand(i * 10);
    const targetRarity: 'common' | 'uncommon' | 'rare' =
      rarityRoll < commonWeight ? 'common' :
      rarityRoll < commonWeight + uncommonWeight ? 'uncommon' : 'rare';

    const eligibleItems = itemPool.filter(item => item.rarity === targetRarity);
    if (eligibleItems.length === 0) continue;

    const selectedItem = eligibleItems[Math.floor(rand(i * 10 + 5) * eligibleItems.length)];

    // Quantity varies by rarity
    const quantity =
      targetRarity === 'common' ? 5 + Math.floor(rand(i * 10 + 7) * 10) :      // 5-14
      targetRarity === 'uncommon' ? 2 + Math.floor(rand(i * 10 + 7) * 5) :     // 2-6
      1 + Math.floor(rand(i * 10 + 7) * 2);                                     // 1-2

    inventory.push({
      ...selectedItem,
      id: `item-${merchantId}-${i}`,
      quantity
    });
  }

  return inventory;
};

// Get merchant type color for visual identification
export const getMerchantTypeColor = (type: MerchantType): string => {
  switch (type) {
    case MerchantType.TEXTILE:
      return '#4169e1'; // Royal blue
    case MerchantType.APOTHECARY:
      return '#9370db'; // Medium purple
    case MerchantType.METALSMITH:
      return '#cd7f32'; // Bronze
    case MerchantType.TRADER:
      return '#daa520'; // Goldenrod
    case MerchantType.BEDOUIN:
      return '#8B4513'; // Saddle brown
    default:
      return '#daa520';
  }
};

// Get all items as a flat array (for lookups)
export const getAllItems = (): ItemTemplate[] => {
  return [
    ...TEXTILE_ITEMS,
    ...APOTHECARY_ITEMS,
    ...METALSMITH_ITEMS,
    ...TRADER_ITEMS,
    ...BEDOUIN_ITEMS
  ];
};

// Find item by name
export const findItemByName = (name: string): ItemTemplate | undefined => {
  return getAllItems().find(item => item.name === name);
};

// Starting inventory item ID to name mapping
const STARTING_ITEM_MAP: Record<string, string> = {
  'item-merchant-bread-seller-0': 'Dried Figs',
  'item-merchant-bread-seller-1': 'Olives',
  'item-merchant-bread-seller-2': 'Dried Apricots',
  'item-merchant-coppersmith-0': 'Leather Waterskin',
  'item-merchant-bread-seller-6': 'Candles (Set of 6)',
  'item-merchant-merchant-3': 'Leather Satchel',
  'item-merchant-apothecary-0': 'Dates',
  'item-merchant-metalsmith-0': 'Damascus Steel Dagger',
  'start-dried-figs': 'Dried Figs',
  'start-olives': 'Olives',
  'start-apricots': 'Dried Apricots',
  'start-waterskin': 'Leather Waterskin',
  'start-candles': 'Candles (Set of 6)',
  'start-dates': 'Dates',
  'start-mint': 'Mint Leaves',
  'start-cumin': 'Cumin',
  'start-pepper': 'Black Pepper',
  'start-honey': 'Honey',
  'start-satchel': 'Leather Satchel',
  'start-linen-cloth': 'Linen Cloth',
  'start-headscarf': 'Cotton Headscarf',
  'start-wool-cloak': 'Wool Cloak',
  'start-hemp-tunic': 'Hemp Tunic',
  'start-belt-sash': 'Cotton Belt Sash',
  'start-prayer-rug': 'Silk Prayer Rug',
  'start-incense': 'Incense Sticks',
  'start-manuscript': 'Illuminated Manuscript Page',
  'start-rope': 'Hemp Rope',
  'start-twine': 'Palm Twine',
  'start-linen-scrap': 'Linen Scrap',
  'start-pottery-shard': 'Pottery Shard',
  'start-candle-stub': 'Candle Stub',
  'start-basket': 'Wicker Basket',
  'start-perfume': 'Musk Perfume',
  'start-rose-water': 'Rose Water',
  'start-bronze-bell': 'Bronze Bell',
  'start-iron-nails': 'Iron Nail Set',
  'start-brass-bowl': 'Brass Bowl',
  'start-coin-purse': 'Copper Coin Purse',
  // New items
  'start-sandals': 'Leather Sandals',
  'start-burial-shroud': 'Linen Burial Shroud',
  'start-indigo': 'Indigo Dye Cake',
  'start-aloe': 'Aloe Vera',
  'start-pomegranate': 'Pomegranate Seeds',
  'start-henna': 'Henna Powder',
  'start-kohl': 'Kohl Powder',
  'start-copper-amulet': 'Copper Amulet',
  'start-iron-key': 'Iron Key',
  'start-kohl-container': 'Silver Kohl Container',
  'start-sesame-oil': 'Sesame Oil',
  'start-chickpeas': 'Chickpeas',
  'start-soap': 'Aleppo Soap',
  'start-prayer-beads': 'Prayer Beads',
  'start-writing-reed': 'Writing Reed',
  'start-pistachios': 'Pistachio Nuts',
  'start-sugar': 'Sugar Loaf',
  'start-compass': 'Geometric Compass',
  'start-myrrh': 'Myrrh Resin',
  'start-camphor': 'Camphor Oil',
  'start-dagger': 'Damascus Steel Dagger'
};

const GROUND_ITEM_MAP: Record<string, string> = {
  'ground-olives': 'Olives',
  'ground-lemons': 'Lemons',
  'ground-pottery': 'Pottery Shard',
  'ground-linen': 'Linen Scrap',
  'ground-candle': 'Candle Stub',
  'ground-twine': 'Palm Twine'
};

const INTERIOR_ITEM_DETAILS: Record<string, ItemTemplate> = {
  'interior-candle': { name: 'Tallow Candle', description: 'A small hand-made candle for light', category: MerchantType.TRADER, basePrice: 3, rarity: 'common' },
  'interior-lamp': { name: 'Oil Lamp', description: 'Clay lamp with a soot-darkened wick', category: MerchantType.TRADER, basePrice: 8, rarity: 'common' },
  'interior-ewer': { name: 'Water Ewer', description: 'Ceramic jug for washing and ritual use', category: MerchantType.TRADER, basePrice: 10, rarity: 'common' },
  'interior-basin': { name: 'Water Basin', description: 'Shallow basin, worn smooth by use', category: MerchantType.TRADER, basePrice: 12, rarity: 'common' },
  'interior-ledger': { name: 'Ledger', description: 'Merchant records and tallies', category: MerchantType.TRADER, basePrice: 14, rarity: 'uncommon' },
  'interior-books': { name: 'Manuscripts', description: 'Hand-copied pages bound in leather', category: MerchantType.TRADER, basePrice: 18, rarity: 'uncommon' },
  'interior-ink-set': { name: 'Ink Set', description: 'Ink, quills, and a small knife', category: MerchantType.TRADER, basePrice: 9, rarity: 'common' },
  'interior-hookah': { name: 'Hookah Parts', description: 'A small brass base with fittings', category: MerchantType.TRADER, basePrice: 16, rarity: 'uncommon' },
  'interior-tray': { name: 'Serving Tray', description: 'Wooden tray worn by years of use', category: MerchantType.TRADER, basePrice: 6, rarity: 'common' },
  'interior-tea-set': { name: 'Tea Service', description: 'Cup and small pot for sherbet or tea', category: MerchantType.TRADER, basePrice: 12, rarity: 'uncommon' },
  'interior-cloth': { name: 'Bolt of Cloth', description: 'Rolled cloth ready for dye or trade', category: MerchantType.TEXTILE, basePrice: 20, rarity: 'common' },
  'interior-spindle': { name: 'Spindle', description: 'Simple spindle for thread-spinning', category: MerchantType.TEXTILE, basePrice: 7, rarity: 'common' },
  'interior-mortar': { name: 'Mortar & Pestle', description: 'Stone set for grinding spices', category: MerchantType.APOTHECARY, basePrice: 11, rarity: 'common' },
  'interior-herbs': { name: 'Herb Bundle', description: 'Aromatic dried herbs', category: MerchantType.APOTHECARY, basePrice: 5, rarity: 'common' },
  'interior-tools': { name: 'Tool Set', description: 'Small hand tools bound in twine', category: MerchantType.METALSMITH, basePrice: 15, rarity: 'uncommon' },
  'interior-basket': { name: 'Market Basket', description: 'Woven basket for goods', category: MerchantType.TRADER, basePrice: 4, rarity: 'common' }
};

// Get item details by itemId (handles starting inventory items)
export const getItemDetailsByItemId = (itemId: string): { name: string; description: string; rarity: 'common' | 'uncommon' | 'rare'; basePrice: number; category: MerchantType; effects?: ItemEffect[] } | null => {
  const interiorItem = INTERIOR_ITEM_DETAILS[itemId];
  if (interiorItem) return interiorItem;
  // Try to find in starting item map first
  const itemName = STARTING_ITEM_MAP[itemId];
  if (itemName) {
    const item = findItemByName(itemName);
    if (item) return item;
  }
  const groundName = GROUND_ITEM_MAP[itemId];
  if (groundName) {
    const item = findItemByName(groundName);
    if (item) return item;
  }

  // For future: handle dynamic merchant item IDs             
  // Could parse the ID pattern here if needed                

  return null;
};

// Get item details by itemId pattern (best effort lookup)
export const getItemDetailsByName = (itemName: string): { name: string; description: string; rarity: 'common' | 'uncommon' | 'rare'; basePrice: number; category: MerchantType; effects?: ItemEffect[] } | null => {
  const item = findItemByName(itemName);
  if (!item) return null;
  return item;
};

// Get merchant type display name
export const getMerchantTypeName = (type: MerchantType): string => {
  switch (type) {
    case MerchantType.TEXTILE:
      return 'Textile Merchant';
    case MerchantType.APOTHECARY:
      return 'Apothecary';
    case MerchantType.METALSMITH:
      return 'Metalsmith';
    case MerchantType.TRADER:
      return 'Trader';
    case MerchantType.BEDOUIN:
      return 'Bedouin Merchant';
    default:
      return 'Merchant';
  }
};
