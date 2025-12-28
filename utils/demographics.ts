import { DistrictType, Ethnicity, Language, Religion, SocialClass } from '../types';

// Biome types determine demographic distribution
// christian_quarter = Bab Touma - historically the Christian neighborhood of Damascus
// jewish_quarter = Al-Yahud - historically the Jewish neighborhood of Damascus
// umayyad_mosque = The Great Mosque - central religious landmark
type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic' | 'christian_quarter' | 'jewish_quarter' | 'umayyad_mosque';

const DISTRICT_TO_BIOME: Record<DistrictType, BiomeType> = {
  MARKET: 'marketplace',
  CARAVANSERAI: 'marketplace',
  WEALTHY: 'wealthy',
  SALHIYYA: 'wealthy',
  HOVELS: 'hovels',
  ALLEYS: 'hovels',
  JEWISH_QUARTER: 'jewish_quarter',  // Al-Yahud - historical Jewish Quarter
  CHRISTIAN_QUARTER: 'christian_quarter',  // Bab Touma - historical Christian Quarter
  UMAYYAD_MOSQUE: 'umayyad_mosque',  // The Great Mosque of Damascus
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
  // Bab Touma - Historical Christian Quarter of Damascus
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
  // Al-Yahud - Historical Jewish Quarter of Damascus
  // Predominantly Jewish population with some Muslim and Christian residents
  // Mix of Arabophone Jews, Sephardic Jews, and Aramaic-speaking Jews
  jewish_quarter: [
    { value: 'Jewish', weight: 0.85 },           // Dominant Jewish population
    { value: 'Sunni Islam', weight: 0.10 },      // Some Muslim residents and merchants
    { value: 'Eastern Orthodox', weight: 0.03 }, // Small Christian minority
    { value: 'Syriac Orthodox', weight: 0.01 },  // Very small
    { value: 'Shia Islam', weight: 0.01 },
    { value: 'Druze', weight: 0.001 },           // Extremely rare
  ],
  // Umayyad Mosque - The Great Mosque of Damascus
  // Predominantly Muslim worshippers, pilgrims, and scholars
  // Mix of locals and visitors from across the Islamic world
  umayyad_mosque: [
    { value: 'Sunni Islam', weight: 0.88 },      // Dominant Sunni majority
    { value: 'Shia Islam', weight: 0.08 },       // Shia pilgrims and scholars
    { value: 'Eastern Orthodox', weight: 0.02 }, // Christian visitors (mosque built on former church site)
    { value: 'Jewish', weight: 0.01 },           // Jewish scholars and visitors
    { value: 'Syriac Orthodox', weight: 0.005 }, // Very rare
    { value: 'Druze', weight: 0.005 },           // Rare
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
  // Jewish Quarter - predominantly Arabophone and Aramaic-speaking Jews
  jewish_quarter: [
    { value: 'Arab', weight: 0.60 },            // Arabized Mizrahi Jews
    { value: 'Aramaean/Syriac', weight: 0.22 }, // Aramaic-speaking Jews
    { value: 'Greek/Rum', weight: 0.08 },       // Romaniote Jews
    { value: 'Persian', weight: 0.08 },         // Persian/Bukharan Jews
    { value: 'Kurdish', weight: 0.01 },         // Very few Kurdish Muslims
    { value: 'Armenian', weight: 0.01 },        // Very rare
  ],
  // Umayyad Mosque - diverse Muslim population (locals + pilgrims)
  umayyad_mosque: [
    { value: 'Arab', weight: 0.58 },            // Local Syrian Arabs
    { value: 'Turkic', weight: 0.12 },          // Mamluk officials, Turkish pilgrims
    { value: 'Kurdish', weight: 0.08 },         // Kurdish Muslims
    { value: 'Persian', weight: 0.10 },         // Persian pilgrims and scholars
    { value: 'Aramaean/Syriac', weight: 0.05 }, // Local Syriac converts
    { value: 'Greek/Rum', weight: 0.03 },       // Some Greek Muslims
    { value: 'Circassian', weight: 0.03 },      // Mamluk soldiers
    { value: 'Armenian', weight: 0.01 },        // Very rare visitors
  ],
};

// Religion-specific ethnicity weights
// Cleaned up to avoid historically impossible combinations
// Note: Sunni Islam uses biome-based weights (falls through), but the consistency
// check will fix any impossible Armenian/Frankish combinations
const RELIGION_ETHNICITY_WEIGHTS: Partial<Record<Religion, Array<{ value: Ethnicity; weight: number }>>> = {
  'Sunni Islam': [
    // No Armenians (Christian) or Frankish (Latin Christian)
    { value: 'Arab', weight: 0.55 },
    { value: 'Turkic', weight: 0.15 },
    { value: 'Kurdish', weight: 0.10 },
    { value: 'Persian', weight: 0.08 },
    { value: 'Circassian', weight: 0.05 },
    { value: 'Aramaean/Syriac', weight: 0.04 },  // Some Syriac converts
    { value: 'Greek/Rum', weight: 0.03 },        // Some Greek converts
  ],
  'Shia Islam': [
    // No Armenians - they were universally Christian
    { value: 'Arab', weight: 0.55 },
    { value: 'Persian', weight: 0.22 },
    { value: 'Kurdish', weight: 0.12 },
    { value: 'Turkic', weight: 0.06 },
    { value: 'Aramaean/Syriac', weight: 0.04 },  // Some Syriac converts
    { value: 'Circassian', weight: 0.01 },
  ],
  'Eastern Orthodox': [
    // Melkite/Greek Orthodox - Greek-speaking Christians under Constantinople
    { value: 'Greek/Rum', weight: 0.50 },
    { value: 'Aramaean/Syriac', weight: 0.25 },  // Arabic-speaking Melkites
    { value: 'Arab', weight: 0.20 },             // Arabized Melkites
    { value: 'Armenian', weight: 0.05 },         // Rare Armenian Melkites
  ],
  'Armenian Apostolic': [
    // Armenian Apostolic Church is ethnically Armenian by definition
    { value: 'Armenian', weight: 0.98 },
    { value: 'Arab', weight: 0.02 },             // Very rare Arabized Armenians
  ],
  'Syriac Orthodox': [
    // Jacobite/Syrian Orthodox - primarily Syriac-speaking
    { value: 'Aramaean/Syriac', weight: 0.75 },
    { value: 'Arab', weight: 0.20 },             // Arabized Syriacs
    { value: 'Greek/Rum', weight: 0.05 },
  ],
  Jewish: [
    // Jews in Damascus - Arabized and Sephardic
    { value: 'Arab', weight: 0.60 },             // Arabized Mizrahi Jews
    { value: 'Aramaean/Syriac', weight: 0.20 }, // Syriac-speaking Jews
    { value: 'Greek/Rum', weight: 0.10 },        // Romaniote Jews
    { value: 'Persian', weight: 0.10 },          // Persian Jews
  ],
  Druze: [
    // Druze were primarily Arab (originated in Egypt, spread to Syria/Lebanon)
    { value: 'Arab', weight: 0.85 },
    { value: 'Kurdish', weight: 0.15 },          // Some Kurdish Druze in northern areas
  ],
  // Latin Christians - primarily Frankish (Italian city-state merchants and Crusader remnants)
  'Latin Christian': [
    { value: 'Frankish', weight: 0.95 },         // Venetians, Genoese, Pisans, Provençals
    { value: 'Greek/Rum', weight: 0.03 },        // Very rare converted Greeks
    { value: 'Arab', weight: 0.02 },             // Very rare Arab Catholics
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

/**
 * Enforce historically accurate ethnicity-religion pairings.
 * In 14th century Damascus, certain ethnicities had near-100% correlation with specific religions:
 * - Armenians: Almost universally Armenian Apostolic Christian
 * - Frankish: Almost universally Latin Christian (Catholic)
 * - Conversely, Armenian Apostolic → Armenian, Latin Christian → Frankish
 */
const enforceEthnicityReligionConsistency = (
  rand: () => number,
  ethnicity: Ethnicity,
  religion: Religion
): { ethnicity: Ethnicity; religion: Religion } => {
  // If ethnicity is Armenian, religion MUST be Armenian Apostolic (or rarely Eastern Orthodox)
  // Muslim Armenians were virtually non-existent in this period
  if (ethnicity === 'Armenian') {
    if (religion !== 'Armenian Apostolic' && religion !== 'Eastern Orthodox') {
      // 95% Armenian Apostolic, 5% Eastern Orthodox (Melkite converts)
      return {
        ethnicity,
        religion: rand() < 0.95 ? 'Armenian Apostolic' : 'Eastern Orthodox'
      };
    }
  }

  // If ethnicity is Frankish, religion MUST be Latin Christian
  // Frankish/Italian merchants in Damascus were Catholic
  if (ethnicity === 'Frankish') {
    if (religion !== 'Latin Christian') {
      return { ethnicity, religion: 'Latin Christian' };
    }
  }

  // If religion is Armenian Apostolic, ethnicity should be Armenian
  // (the church is ethnically Armenian by definition)
  if (religion === 'Armenian Apostolic') {
    if (ethnicity !== 'Armenian') {
      return { ethnicity: 'Armenian', religion };
    }
  }

  // If religion is Latin Christian, ethnicity should usually be Frankish
  // (occasional Greek/Armenian Catholic converts, but rare)
  if (religion === 'Latin Christian') {
    if (ethnicity !== 'Frankish') {
      // 90% Frankish, 10% allow other ethnicities (rare converts)
      if (rand() < 0.9) {
        return { ethnicity: 'Frankish', religion };
      }
    }
  }

  // Greek/Rum ethnicity strongly correlates with Eastern Orthodox
  // Kurdish/Turkic/Circassian strongly correlate with Islam
  if (ethnicity === 'Greek/Rum') {
    if (religion !== 'Eastern Orthodox' && religion !== 'Sunni Islam') {
      // Greeks were mostly Orthodox, some converted to Islam under Mamluk rule
      return {
        ethnicity,
        religion: rand() < 0.75 ? 'Eastern Orthodox' : 'Sunni Islam'
      };
    }
  }

  // Aramaean/Syriac strongly correlates with Syriac Orthodox or Eastern Orthodox
  if (ethnicity === 'Aramaean/Syriac') {
    if (religion !== 'Syriac Orthodox' && religion !== 'Eastern Orthodox' && religion !== 'Sunni Islam') {
      // Most were Syriac Orthodox, some Eastern Orthodox (Melkite), some had converted to Islam
      const roll = rand();
      if (roll < 0.5) {
        return { ethnicity, religion: 'Syriac Orthodox' };
      } else if (roll < 0.7) {
        return { ethnicity, religion: 'Eastern Orthodox' };
      } else {
        return { ethnicity, religion: 'Sunni Islam' };
      }
    }
  }

  // Druze were primarily Arab (with some Kurdish converts)
  if (religion === 'Druze') {
    if (ethnicity !== 'Arab' && ethnicity !== 'Kurdish') {
      return { ethnicity: 'Arab', religion };
    }
  }

  // No changes needed
  return { ethnicity, religion };
};

export const assignDemographics = (rand: () => number, options: DemographicOptions): Demographics => {
  const biome = getBiomeForDistrict(options.districtType);
  const baseReligion = pickWeighted(rand, RELIGION_WEIGHTS_BY_BIOME[biome]);
  const religion = applyReligionOverrides(baseReligion, options.profession);
  const ethnicityWeights = applyEthnicityOverrides(ETHNICITY_WEIGHTS_BY_BIOME[biome], religion, options.profession);
  const ethnicity = pickWeighted(rand, ethnicityWeights);

  // Enforce historically accurate ethnicity-religion pairings
  const { ethnicity: finalEthnicity, religion: finalReligion } = enforceEthnicityReligionConsistency(
    rand,
    ethnicity,
    religion
  );

  const language = pickLanguage(rand, finalEthnicity, finalReligion);
  return { ethnicity: finalEthnicity, religion: finalReligion, language };
};

