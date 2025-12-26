import { DistrictType, Ethnicity, Language, Religion, SocialClass } from '../types';

// Biome types determine demographic distribution
// christian_quarter = Bab Touma / Bab Sharqi area - historically the Christian neighborhood of Damascus
type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic' | 'christian_quarter';

const DISTRICT_TO_BIOME: Record<DistrictType, BiomeType> = {
  MARKET: 'marketplace',
  CARAVANSERAI: 'marketplace',
  WEALTHY: 'wealthy',
  SALHIYYA: 'wealthy',
  HOVELS: 'hovels',
  ALLEYS: 'christian_quarter',  // Bab Touma/Bab Sharqi - historical Christian Quarter
  RESIDENTIAL: 'hovels',
  OUTSKIRTS_DESERT: 'desert',
  OUTSKIRTS_FARMLAND: 'desert',
  SOUTHERN_ROAD: 'desert',
  MOUNTAIN_SHRINE: 'desert',
  CIVIC: 'civic',
};

// Religion weights by biome
// Historical note: Druze were primarily in Lebanese mountains (Chouf, Mount Lebanon) and Hauran,
// not urban Damascus. Reduced to 0.5% in city districts, higher in outskirts/mountain areas.
const RELIGION_WEIGHTS_BY_BIOME: Record<BiomeType, Array<{ value: Religion; weight: number }>> = {
  marketplace: [
    { value: 'Sunni Islam', weight: 0.655 },  // Adjusted to compensate for Druze reduction
    { value: 'Shia Islam', weight: 0.03 },
    { value: 'Eastern Orthodox', weight: 0.12 },
    { value: 'Armenian Apostolic', weight: 0.06 },
    { value: 'Syriac Orthodox', weight: 0.03 },
    { value: 'Jewish', weight: 0.1 },
    { value: 'Druze', weight: 0.005 },  // Rare in urban Damascus
  ],
  wealthy: [
    { value: 'Sunni Islam', weight: 0.725 },  // Adjusted
    { value: 'Shia Islam', weight: 0.03 },
    { value: 'Eastern Orthodox', weight: 0.1 },
    { value: 'Armenian Apostolic', weight: 0.05 },
    { value: 'Syriac Orthodox', weight: 0.02 },
    { value: 'Jewish', weight: 0.07 },
    { value: 'Druze', weight: 0.005 },  // Rare in urban Damascus
  ],
  hovels: [
    { value: 'Sunni Islam', weight: 0.835 },  // Adjusted
    { value: 'Shia Islam', weight: 0.04 },
    { value: 'Eastern Orthodox', weight: 0.05 },
    { value: 'Armenian Apostolic', weight: 0.02 },
    { value: 'Syriac Orthodox', weight: 0.02 },
    { value: 'Jewish', weight: 0.03 },
    { value: 'Druze', weight: 0.005 },  // Rare in urban Damascus
  ],
  desert: [
    // Outskirts/rural areas - Druze more likely (Hauran region nearby)
    { value: 'Sunni Islam', weight: 0.82 },
    { value: 'Shia Islam', weight: 0.04 },
    { value: 'Eastern Orthodox', weight: 0.04 },
    { value: 'Armenian Apostolic', weight: 0.02 },
    { value: 'Syriac Orthodox', weight: 0.01 },
    { value: 'Jewish', weight: 0.02 },
    { value: 'Druze', weight: 0.05 },  // More common in rural/mountain areas
  ],
  civic: [
    { value: 'Sunni Islam', weight: 0.815 },  // Adjusted
    { value: 'Shia Islam', weight: 0.03 },
    { value: 'Eastern Orthodox', weight: 0.07 },
    { value: 'Armenian Apostolic', weight: 0.03 },
    { value: 'Syriac Orthodox', weight: 0.02 },
    { value: 'Jewish', weight: 0.03 },
    { value: 'Druze', weight: 0.005 },  // Rare in civic areas
  ],
  // Bab Touma / Bab Sharqi - Historical Christian Quarter of Damascus
  // Home to Melkite (Eastern Orthodox), Syriac Orthodox, and Armenian churches
  // Also contains a small Jewish community and some Frankish/Latin merchants
  christian_quarter: [
    { value: 'Sunni Islam', weight: 0.35 },     // Still some Muslim residents
    { value: 'Shia Islam', weight: 0.02 },
    { value: 'Eastern Orthodox', weight: 0.28 }, // Melkite Orthodox - largest Christian group
    { value: 'Armenian Apostolic', weight: 0.12 }, // Significant Armenian presence
    { value: 'Syriac Orthodox', weight: 0.10 },  // Jacobite/Syrian Orthodox
    { value: 'Jewish', weight: 0.05 },           // Small Jewish community
    { value: 'Druze', weight: 0.003 },           // Very rare
    { value: 'Latin Christian', weight: 0.057 }, // Frankish/Italian merchants, visitors
  ],
};

const ETHNICITY_WEIGHTS_BY_BIOME: Record<BiomeType, Array<{ value: Ethnicity; weight: number }>> = {
  marketplace: [
    { value: 'Arab', weight: 0.5 },
    { value: 'Aramaean/Syriac', weight: 0.08 },
    { value: 'Kurdish', weight: 0.05 },
    { value: 'Turkic', weight: 0.08 },
    { value: 'Circassian', weight: 0.04 },
    { value: 'Armenian', weight: 0.08 },
    { value: 'Greek/Rum', weight: 0.07 },
    { value: 'Persian', weight: 0.1 },
  ],
  wealthy: [
    { value: 'Arab', weight: 0.6 },
    { value: 'Aramaean/Syriac', weight: 0.07 },
    { value: 'Kurdish', weight: 0.05 },
    { value: 'Turkic', weight: 0.08 },
    { value: 'Circassian', weight: 0.05 },
    { value: 'Armenian', weight: 0.05 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Persian', weight: 0.05 },
  ],
  hovels: [
    { value: 'Arab', weight: 0.72 },
    { value: 'Aramaean/Syriac', weight: 0.08 },
    { value: 'Kurdish', weight: 0.07 },
    { value: 'Turkic', weight: 0.04 },
    { value: 'Circassian', weight: 0.02 },
    { value: 'Armenian', weight: 0.03 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Persian', weight: 0.02 },
  ],
  desert: [
    { value: 'Arab', weight: 0.7 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Kurdish', weight: 0.08 },
    { value: 'Turkic', weight: 0.06 },
    { value: 'Circassian', weight: 0.03 },
    { value: 'Armenian', weight: 0.03 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Persian', weight: 0.03 },
  ],
  civic: [
    { value: 'Arab', weight: 0.62 },
    { value: 'Aramaean/Syriac', weight: 0.06 },
    { value: 'Kurdish', weight: 0.05 },
    { value: 'Turkic', weight: 0.08 },
    { value: 'Circassian', weight: 0.05 },
    { value: 'Armenian', weight: 0.05 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Persian', weight: 0.04 },
  ],
  // Christian Quarter - diverse Christian ethnicities plus Frankish merchants
  christian_quarter: [
    { value: 'Arab', weight: 0.35 },           // Arab Christians and Muslims
    { value: 'Aramaean/Syriac', weight: 0.18 }, // Native Syriac-speaking Christians
    { value: 'Kurdish', weight: 0.03 },
    { value: 'Turkic', weight: 0.02 },
    { value: 'Circassian', weight: 0.01 },
    { value: 'Armenian', weight: 0.15 },        // Significant Armenian community
    { value: 'Greek/Rum', weight: 0.18 },       // Byzantine/Melkite Christians
    { value: 'Persian', weight: 0.02 },
    { value: 'Frankish', weight: 0.06 },        // Italian/Venetian/Genoese merchants
  ],
};

const RELIGION_ETHNICITY_WEIGHTS: Partial<Record<Religion, Array<{ value: Ethnicity; weight: number }>>> = {
  'Shia Islam': [
    { value: 'Arab', weight: 0.55 },
    { value: 'Persian', weight: 0.2 },
    { value: 'Kurdish', weight: 0.1 },
    { value: 'Turkic', weight: 0.05 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Armenian', weight: 0.02 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Circassian', weight: 0.01 },
  ],
  'Eastern Orthodox': [
    { value: 'Greek/Rum', weight: 0.45 },
    { value: 'Aramaean/Syriac', weight: 0.2 },
    { value: 'Arab', weight: 0.2 },
    { value: 'Armenian', weight: 0.1 },
    { value: 'Kurdish', weight: 0.03 },
    { value: 'Persian', weight: 0.02 },
  ],
  'Armenian Apostolic': [
    { value: 'Armenian', weight: 0.75 },
    { value: 'Arab', weight: 0.1 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Persian', weight: 0.03 },
    { value: 'Kurdish', weight: 0.02 },
  ],
  'Syriac Orthodox': [
    { value: 'Aramaean/Syriac', weight: 0.7 },
    { value: 'Arab', weight: 0.15 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Armenian', weight: 0.05 },
    { value: 'Kurdish', weight: 0.03 },
    { value: 'Persian', weight: 0.02 },
  ],
  Jewish: [
    { value: 'Arab', weight: 0.55 },
    { value: 'Aramaean/Syriac', weight: 0.2 },
    { value: 'Greek/Rum', weight: 0.1 },
    { value: 'Persian', weight: 0.08 },
    { value: 'Armenian', weight: 0.04 },
    { value: 'Kurdish', weight: 0.03 },
  ],
  Druze: [
    { value: 'Arab', weight: 0.7 },
    { value: 'Kurdish', weight: 0.12 },
    { value: 'Persian', weight: 0.08 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Turkic', weight: 0.03 },
    { value: 'Greek/Rum', weight: 0.02 },
  ],
  // Latin Christians - primarily Frankish (Italian city-state merchants and Crusader remnants)
  'Latin Christian': [
    { value: 'Frankish', weight: 0.85 },        // Venetians, Genoese, Pisans, Provençals
    { value: 'Greek/Rum', weight: 0.05 },       // Some converted Greeks
    { value: 'Armenian', weight: 0.05 },        // Some Armenian Catholics
    { value: 'Arab', weight: 0.05 },            // Rare Arab Catholics
  ],
};

const MAMLUK_ETHNICITY_WEIGHTS: Array<{ value: Ethnicity; weight: number }> = [
  { value: 'Turkic', weight: 0.55 },
  { value: 'Circassian', weight: 0.35 },
  { value: 'Kurdish', weight: 0.05 },
  { value: 'Arab', weight: 0.05 },
];

const pickWeighted = <T,>(rand: () => number, weights: Array<{ value: T; weight: number }>): T => {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const target = rand() * total;
  let acc = 0;
  for (const entry of weights) {
    acc += entry.weight;
    if (target <= acc) return entry.value;
  }
  return weights[weights.length - 1].value;
};

const getBiomeForDistrict = (district?: DistrictType): BiomeType => {
  if (!district) return 'marketplace';
  return DISTRICT_TO_BIOME[district] ?? 'marketplace';
};

const applyReligionOverrides = (baseReligion: Religion, profession?: string): Religion => {
  if (!profession) return baseReligion;
  if (/Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa|Sufi/i.test(profession)) return 'Sunni Islam';
  if (/Rabbi/i.test(profession)) return 'Jewish';
  if (/Priest|Deacon|Monk|Bishop|Patriarch/i.test(profession)) return 'Eastern Orthodox';
  if (/Mamluk|Guard|Soldier/i.test(profession)) return 'Sunni Islam';
  return baseReligion;
};

const applyEthnicityOverrides = (
  baseWeights: Array<{ value: Ethnicity; weight: number }>,
  religion: Religion,
  profession?: string
): Array<{ value: Ethnicity; weight: number }> => {
  if (profession && /Mamluk/i.test(profession)) return MAMLUK_ETHNICITY_WEIGHTS;
  const byReligion = RELIGION_ETHNICITY_WEIGHTS[religion];
  return byReligion ?? baseWeights;
};

const pickLanguage = (rand: () => number, ethnicity: Ethnicity, religion?: Religion): Language => {
  // Frankish merchants speak Latin (lingua franca of Mediterranean trade)
  if (ethnicity === 'Frankish') return rand() > 0.2 ? 'Latin' : 'Arabic';
  // Latin Christians often know Latin regardless of ethnicity
  if (religion === 'Latin Christian' && rand() > 0.5) return 'Latin';

  // Mamluk soldiers and Circassians often used Turkic
  if (ethnicity === 'Turkic') return rand() > 0.5 ? 'Turkic' : 'Arabic';
  if (ethnicity === 'Circassian') return rand() > 0.6 ? 'Turkic' : 'Arabic';

  // Other ethnicities with their native languages
  if (ethnicity === 'Aramaean/Syriac') return rand() > 0.4 ? 'Syriac' : 'Arabic';
  if (ethnicity === 'Armenian') return rand() > 0.3 ? 'Armenian' : 'Arabic';
  if (ethnicity === 'Greek/Rum') return rand() > 0.4 ? 'Greek' : 'Arabic';
  if (ethnicity === 'Persian') return rand() > 0.4 ? 'Persian' : 'Arabic';

  return 'Arabic';
};

export interface DemographicOptions {
  districtType?: DistrictType;
  profession?: string;
  socialClass?: SocialClass;
  gender?: 'Male' | 'Female';
}

export interface Demographics {
  ethnicity: Ethnicity;
  religion: Religion;
  language: Language;
}

export const assignDemographics = (rand: () => number, options: DemographicOptions): Demographics => {
  const biome = getBiomeForDistrict(options.districtType);
  const baseReligion = pickWeighted(rand, RELIGION_WEIGHTS_BY_BIOME[biome]);
  const religion = applyReligionOverrides(baseReligion, options.profession);
  const ethnicityWeights = applyEthnicityOverrides(ETHNICITY_WEIGHTS_BY_BIOME[biome], religion, options.profession);
  const ethnicity = pickWeighted(rand, ethnicityWeights);
  const language = pickLanguage(rand, ethnicity, religion);
  return { ethnicity, religion, language };
};

