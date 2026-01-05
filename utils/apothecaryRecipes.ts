import { CompoundRecipe, CompoundCategory } from '../types';

// Category information for UI display
export interface CategoryInfo {
  category: CompoundCategory;
  nameEn: string;
  nameAr: string;
  transliteration: string;
  description: string;
}

export const COMPOUND_CATEGORIES: CategoryInfo[] = [
  {
    category: 'electuary',
    nameEn: 'Electuary',
    nameAr: 'مَعْجُون',
    transliteration: "Ma'jūn",
    description: 'Medicinal pastes mixed with honey or thick syrup'
  },
  {
    category: 'syrup',
    nameEn: 'Syrup',
    nameAr: 'شَرَاب',
    transliteration: 'Sharāb',
    description: 'Sweet liquid medicines, often rose or violet based'
  },
  {
    category: 'ointment',
    nameEn: 'Ointment',
    nameAr: 'مَرْهَم',
    transliteration: 'Marham',
    description: 'Topical salves and poultices for external application'
  },
  {
    category: 'fumigant',
    nameEn: 'Fumigant',
    nameAr: 'بَخُور',
    transliteration: 'Bukhūr',
    description: 'Aromatic substances burned to purify the air'
  },
  {
    category: 'powder',
    nameEn: 'Powder',
    nameAr: 'سَفُوف',
    transliteration: 'Safūf',
    description: 'Dried ground medicines taken with water or food'
  },
  {
    category: 'distillation',
    nameEn: 'Distillation',
    nameAr: 'مَاء',
    transliteration: "Mā'",
    description: 'Concentrated medicinal waters extracted through distillation'
  },
  {
    category: 'pill',
    nameEn: 'Pill',
    nameAr: 'حَبّ',
    transliteration: 'Ḥabb',
    description: 'Rolled medicine balls for easy consumption'
  }
];

// All compound recipes available at apothecaries
export const COMPOUND_RECIPES: CompoundRecipe[] = [
  // ============ ELECTUARIES (مَعْجُون) ============
  {
    id: 'cooling_electuary',
    nameEn: 'Cooling Electuary',
    nameAr: 'مَعْجُون مُبَرِّد',
    transliteration: "Ma'jūn Mubarrid",
    category: 'electuary',
    categoryAr: 'مَعْجُون',
    description: 'A sweet cooling paste that reduces fever and calms the body. Made by grinding mint leaves with rose water and binding with honey.',
    ingredients: ['Rose Water', 'Honey', 'Mint Leaves'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -20 }
    ],
    fee: 8
  },
  {
    id: 'strengthening_electuary',
    nameEn: 'Strengthening Electuary',
    nameAr: 'مَعْجُون مُقَوِّي',
    transliteration: "Ma'jūn Muqawwī",
    category: 'electuary',
    categoryAr: 'مَعْجُون',
    description: 'A restorative paste to rebuild strength after illness. The dates provide vital nourishment while pomegranate balances the humors.',
    ingredients: ['Honey', 'Dates', 'Pomegranate Seeds'],
    effects: [
      { type: 'symptomRelief', stat: 'weakness', value: -18 },
      { type: 'heal', value: 10 }
    ],
    fee: 10
  },
  {
    id: 'theriac_electuary',
    nameEn: 'Theriac Electuary',
    nameAr: 'مَعْجُون التِّرْيَاق',
    transliteration: "Ma'jūn al-Tiryāq",
    category: 'electuary',
    categoryAr: 'مَعْجُون',
    description: 'The legendary antidote compound, here prepared as a sweetened paste. The theriac\'s power is enhanced by rose water and preserved in honey.',
    ingredients: ['Theriac Compound', 'Honey', 'Rose Water'],
    effects: [
      { type: 'symptomRelief', stat: 'all', value: -12 },
      { type: 'symptomRelief', stat: 'survivalChance', value: 8 }
    ],
    fee: 25
  },
  {
    id: 'sedative_electuary',
    nameEn: 'Sedative Electuary',
    nameAr: 'مَعْجُون مُنَوِّم',
    transliteration: "Ma'jūn Munawwim",
    category: 'electuary',
    categoryAr: 'مَعْجُون',
    description: 'A powerful soporific paste that brings deep sleep and relief from all pain. The opium numbs the senses while saffron steadies the heart.',
    ingredients: ['Opium Paste', 'Honey', 'Saffron Threads'],
    effects: [
      { type: 'symptomRelief', stat: 'all', value: -25 },
      { type: 'symptomRelief', stat: 'delirium', value: -15 },
      { type: 'debuff', stat: 'weakness', value: 15 }
    ],
    fee: 30
  },

  // ============ SYRUPS (شَرَاب) ============
  {
    id: 'violet_syrup',
    nameEn: 'Violet Syrup',
    nameAr: 'شَرَاب البَنَفْسَج',
    transliteration: 'Sharāb al-Banafsaj',
    category: 'syrup',
    categoryAr: 'شَرَاب',
    description: 'A delicate syrup infused with the essence of violets. Soothes fever and calms troubled minds, favored by physicians for treating melancholy.',
    ingredients: ['Honey', 'Rose Water'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -12 },
      { type: 'symptomRelief', stat: 'delirium', value: -8 }
    ],
    fee: 6
  },
  {
    id: 'oxymel',
    nameEn: 'Oxymel',
    nameAr: 'سَكَنْجَبِين',
    transliteration: 'Sakanjabīn',
    category: 'syrup',
    categoryAr: 'شَرَاب',
    description: 'A classic preparation of honey and vinegar, used since ancient times. Clears phlegm from the chest and eases breathing.',
    ingredients: ['Honey', 'Vinegar'],
    effects: [
      { type: 'symptomRelief', stat: 'coughingBlood', value: -15 }
    ],
    fee: 5
  },
  {
    id: 'julep',
    nameEn: 'Julep',
    nameAr: 'جُلَاب',
    transliteration: 'Julāb',
    category: 'syrup',
    categoryAr: 'شَرَاب',
    description: 'A refreshing rose-water cordial with cooling mint. Reduces fever and promotes general healing. A favorite remedy of Persian physicians.',
    ingredients: ['Rose Water', 'Honey', 'Mint Leaves'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -15 },
      { type: 'heal', value: 10 }
    ],
    fee: 7
  },

  // ============ OINTMENTS (مَرْهَم) ============
  {
    id: 'drawing_poultice',
    nameEn: 'Drawing Poultice',
    nameAr: 'ضِمَاد جَاذِب',
    transliteration: 'Ḍimād Jādhib',
    category: 'ointment',
    categoryAr: 'مَرْهَم',
    description: 'A thick poultice designed to draw poison from plague buboes. The myrrh purifies while aloe soothes the inflammation.',
    ingredients: ['Myrrh Resin', 'Aloe Vera', 'Honey'],
    effects: [
      { type: 'symptomRelief', stat: 'buboes', value: -18 }
    ],
    fee: 12
  },
  {
    id: 'camphor_balm',
    nameEn: 'Camphor Balm',
    nameAr: 'مَرْهَم الكَافُور',
    transliteration: 'Marham al-Kāfūr',
    category: 'ointment',
    categoryAr: 'مَرْهَم',
    description: 'A cooling balm that reduces fever when applied to the temples and wrists. The camphor also stanches bleeding.',
    ingredients: ['Camphor Oil', 'Aloe Vera'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -15 },
      { type: 'symptomRelief', stat: 'skinBleeding', value: -10 }
    ],
    fee: 10
  },
  {
    id: 'frankincense_salve',
    nameEn: 'Frankincense Salve',
    nameAr: 'مَرْهَم اللُّبَان',
    transliteration: 'Marham al-Lubān',
    category: 'ointment',
    categoryAr: 'مَرْهَم',
    description: 'A fragrant healing salve blessed by the sacred resin. Applied to buboes and wounds to promote healing and prevent corruption.',
    ingredients: ['Frankincense Tears', 'Aloe Vera', 'Honey'],
    effects: [
      { type: 'symptomRelief', stat: 'buboes', value: -12 },
      { type: 'symptomRelief', stat: 'skinBleeding', value: -8 }
    ],
    fee: 11
  },
  {
    id: 'wound_salve',
    nameEn: 'Wound Salve',
    nameAr: 'مَرْهَم الجُرُوح',
    transliteration: 'Marham al-Jurūḥ',
    category: 'ointment',
    categoryAr: 'مَرْهَم',
    description: 'A simple but effective salve for treating wounds and stopping bleeding. The myrrh prevents infection while honey seals the wound.',
    ingredients: ['Myrrh Resin', 'Honey'],
    effects: [
      { type: 'symptomRelief', stat: 'skinBleeding', value: -15 },
      { type: 'heal', value: 5 }
    ],
    fee: 8
  },

  // ============ FUMIGANTS (بَخُور) ============
  {
    id: 'plague_smoke',
    nameEn: 'Plague Smoke',
    nameAr: 'بَخُور الوَبَاء',
    transliteration: "Bukhūr al-Wabā'",
    category: 'fumigant',
    categoryAr: 'بَخُور',
    description: 'A powerful fumigant combining two sacred resins. When burned, the smoke is believed to purify the air of plague miasma.',
    ingredients: ['Frankincense Tears', 'Myrrh Resin'],
    effects: [
      { type: 'plagueProtection', value: 35, duration: 4 }
    ],
    fee: 14
  },
  {
    id: 'protective_incense',
    nameEn: 'Protective Incense',
    nameAr: 'بَخُور وَاقٍ',
    transliteration: 'Bukhūr Wāqin',
    category: 'fumigant',
    categoryAr: 'بَخُور',
    description: 'The most potent protective fumigant, combining frankincense, camphor, and rose water. Creates a fragrant shield against the pestilence.',
    ingredients: ['Frankincense Tears', 'Camphor Oil', 'Rose Water'],
    effects: [
      { type: 'plagueProtection', value: 45, duration: 6 }
    ],
    fee: 20
  },
  {
    id: 'simple_fumigant',
    nameEn: 'Simple Fumigant',
    nameAr: 'بَخُور بَسِيط',
    transliteration: 'Bukhūr Basīṭ',
    category: 'fumigant',
    categoryAr: 'بَخُور',
    description: 'Pure frankincense burned for its cleansing smoke. The most basic form of protection against corrupt air.',
    ingredients: ['Frankincense Tears'],
    effects: [
      { type: 'plagueProtection', value: 20, duration: 2 }
    ],
    fee: 4
  },

  // ============ POWDERS (سَفُوف) ============
  {
    id: 'fever_powder',
    nameEn: 'Fever Powder',
    nameAr: 'سَفُوف الحُمَّى',
    transliteration: 'Safūf al-Ḥummā',
    category: 'powder',
    categoryAr: 'سَفُوف',
    description: 'A cooling powder of dried mint and coriander. Taken with water to reduce fever and settle the stomach.',
    ingredients: ['Mint Leaves', 'Coriander Seeds'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -10 }
    ],
    fee: 4
  },
  {
    id: 'digestive_powder',
    nameEn: 'Digestive Powder',
    nameAr: 'سَفُوف هَاضِم',
    transliteration: 'Safūf Hāḍim',
    category: 'powder',
    categoryAr: 'سَفُوف',
    description: 'A warming spice blend that aids digestion and strengthens the body. The pepper stimulates while cumin and coriander balance.',
    ingredients: ['Cumin', 'Coriander Seeds', 'Black Pepper'],
    effects: [
      { type: 'heal', value: 8 },
      { type: 'symptomRelief', stat: 'weakness', value: -5 }
    ],
    fee: 5
  },

  // ============ DISTILLATIONS (مَاء) ============
  {
    id: 'camphor_water',
    nameEn: 'Camphor Water',
    nameAr: 'مَاء الكَافُور',
    transliteration: "Mā' al-Kāfūr",
    category: 'distillation',
    categoryAr: 'مَاء',
    description: 'A concentrated camphor distillation with rose water. Powerfully cooling, it reduces fever and clears the lungs.',
    ingredients: ['Camphor Oil', 'Rose Water'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -18 },
      { type: 'symptomRelief', stat: 'coughingBlood', value: -12 }
    ],
    fee: 12
  },
  {
    id: 'mint_water',
    nameEn: 'Mint Water',
    nameAr: 'مَاء النَّعْنَاع',
    transliteration: "Mā' al-Na'nā'",
    category: 'distillation',
    categoryAr: 'مَاء',
    description: 'Fresh mint distilled with rose water creates a cooling, refreshing medicine. Excellent for reducing fever and clearing the head.',
    ingredients: ['Mint Leaves', 'Rose Water'],
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -14 }
    ],
    fee: 7
  },

  // ============ PILLS (حَبّ) ============
  {
    id: 'travelers_pills',
    nameEn: "Traveler's Pills",
    nameAr: 'حَبّ المُسَافِر',
    transliteration: 'Ḥabb al-Musāfir',
    category: 'pill',
    categoryAr: 'حَبّ',
    description: 'Portable theriac pills for travelers and merchants. Provides long-lasting protection against plague exposure on the road.',
    ingredients: ['Theriac Compound'],
    effects: [
      { type: 'plagueProtection', value: 25, duration: 8 }
    ],
    fee: 15
  }
];

// Get recipe by ID
export const getRecipeById = (id: string): CompoundRecipe | undefined => {
  return COMPOUND_RECIPES.find(r => r.id === id);
};

// Get recipes by category
export const getRecipesByCategory = (category: CompoundCategory): CompoundRecipe[] => {
  return COMPOUND_RECIPES.filter(r => r.category === category);
};

// Get category info
export const getCategoryInfo = (category: CompoundCategory): CategoryInfo | undefined => {
  return COMPOUND_CATEGORIES.find(c => c.category === category);
};

// Check if player has all ingredients for a recipe
export const checkIngredients = (
  recipe: CompoundRecipe,
  playerInventory: { name: string; quantity: number }[]
): { hasAll: boolean; missing: string[]; available: { name: string; have: number; need: number }[] } => {
  const missing: string[] = [];
  const available: { name: string; have: number; need: number }[] = [];

  // Count how many of each ingredient we need
  const ingredientCounts: Record<string, number> = {};
  for (const ing of recipe.ingredients) {
    ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
  }

  for (const [ingredientName, needed] of Object.entries(ingredientCounts)) {
    const playerItem = playerInventory.find(i => i.name === ingredientName);
    const have = playerItem?.quantity || 0;
    available.push({ name: ingredientName, have, need: needed });
    if (have < needed) {
      missing.push(ingredientName);
    }
  }

  return { hasAll: missing.length === 0, missing, available };
};

// Apply compound effects
export const applyCompoundEffects = (
  plagueStatus: {
    fever: number;
    weakness: number;
    buboes: number;
    coughingBlood: number;
    delirium: number;
    skinBleeding: number;
    gangrene: number;
    survivalChance: number;
  },
  recipe: CompoundRecipe
): {
  newStatus: typeof plagueStatus;
  protectionEffects: { value: number; duration: number }[];
  message: string;
} => {
  const newStatus = { ...plagueStatus };
  const protectionEffects: { value: number; duration: number }[] = [];
  const effectDescriptions: string[] = [];

  for (const effect of recipe.effects) {
    if (effect.type === 'symptomRelief' && effect.stat) {
      if (effect.stat === 'all') {
        newStatus.fever = Math.max(0, newStatus.fever + effect.value);
        newStatus.weakness = Math.max(0, newStatus.weakness + effect.value);
        newStatus.buboes = Math.max(0, newStatus.buboes + effect.value);
        newStatus.coughingBlood = Math.max(0, newStatus.coughingBlood + effect.value);
        newStatus.delirium = Math.max(0, newStatus.delirium + effect.value);
        effectDescriptions.push('All symptoms eased');
      } else if (effect.stat === 'survivalChance') {
        newStatus.survivalChance = Math.min(100, newStatus.survivalChance + effect.value);
        effectDescriptions.push('Survival chance improved');
      } else {
        const statKey = effect.stat as keyof typeof newStatus;
        if (statKey in newStatus) {
          (newStatus as any)[statKey] = Math.max(0, Math.min(100, (newStatus as any)[statKey] + effect.value));
          effectDescriptions.push(`${effect.stat} ${effect.value < 0 ? 'reduced' : 'increased'}`);
        }
      }
    } else if (effect.type === 'heal') {
      effectDescriptions.push(`Restored ${effect.value} health`);
    } else if (effect.type === 'plagueProtection' && effect.duration) {
      protectionEffects.push({ value: effect.value, duration: effect.duration });
      effectDescriptions.push(`${effect.value}% protection for ${effect.duration} hours`);
    } else if (effect.type === 'debuff' && effect.stat === 'weakness') {
      newStatus.weakness = Math.min(100, newStatus.weakness + effect.value);
      effectDescriptions.push('Weakness increased');
    }
  }

  return {
    newStatus,
    protectionEffects,
    message: `You use the ${recipe.nameEn}. ${effectDescriptions.join('. ')}.`
  };
};
