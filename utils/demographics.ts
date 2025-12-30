import { DistrictType, Ethnicity, Language, Religion, SocialClass } from '../types';

// =============================================================================
// DEMOGRAPHIC DISTRIBUTION FOR DAMASCUS, 1348 CE (749 AH)
// =============================================================================
// Historical Context: Damascus under the Bahri Mamluk Sultanate
// - Turkic Mamluks dominant (Circassian Burji dynasty begins 1382, AFTER this period)
// - Major trade hub on spice routes connecting Mediterranean to Asia
// - Diverse religious minorities under dhimmi system
// - Recent recovery from Mongol invasions (1260, 1299-1303)
// =============================================================================

type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic' | 'christian_quarter' | 'jewish_quarter' | 'umayyad_mosque';

const DISTRICT_TO_BIOME: Record<DistrictType, BiomeType> = {
  MARKET: 'marketplace',
  CARAVANSERAI: 'marketplace',
  STRAIGHT_STREET: 'marketplace',
  SOUQ_AXIS: 'marketplace',
  MIDAN: 'marketplace',
  BAB_SHARQI: 'christian_quarter',
  WEALTHY: 'wealthy',
  SALHIYYA: 'wealthy',        // Kurdish/Hanbali scholarly quarter on Mt. Qasiyun slopes
  HOVELS: 'hovels',
  ALLEYS: 'hovels',
  JEWISH_QUARTER: 'jewish_quarter',      // Al-Yahud / Harat al-Yahud
  CHRISTIAN_QUARTER: 'christian_quarter', // Bab Touma and Bab Sharqi areas
  UMAYYAD_MOSQUE: 'umayyad_mosque',      // The Great Mosque of Damascus
  RESIDENTIAL: 'hovels',
  OUTSKIRTS_DESERT: 'desert',
  OUTSKIRTS_FARMLAND: 'desert',
  SOUTHERN_ROAD: 'desert',
  MOUNTAIN_SHRINE: 'desert',
  CIVIC: 'civic',
};

// =============================================================================
// RELIGION DISTRIBUTIONS BY DISTRICT
// =============================================================================
// Sources: Ibn Battuta's Rihla (1326), al-Maqrizi, waqf documents
// Note: Druze primarily in Lebanese mountains (Chouf, Hauran), rare in urban Damascus
// Note: Ismailis (post-Assassin) small remnant communities after Mongol destruction
// =============================================================================

const RELIGION_WEIGHTS_BY_BIOME: Record<BiomeType, Array<{ value: Religion; weight: number }>> = {
  marketplace: [
    // Diverse trading district - all groups represented
    { value: 'Sunni Islam', weight: 0.62 },
    { value: 'Shia Islam', weight: 0.04 },       // Twelver Shia merchants
    { value: 'Ismaili', weight: 0.005 },         // Rare - remnant communities
    { value: 'Eastern Orthodox', weight: 0.12 }, // Melkite/Rum Orthodox
    { value: 'Armenian Apostolic', weight: 0.06 },
    { value: 'Syriac Orthodox', weight: 0.03 },  // Jacobite
    { value: 'Coptic Orthodox', weight: 0.01 },  // Egyptian Christian merchants
    { value: 'Jewish', weight: 0.10 },
    { value: 'Samaritan', weight: 0.005 },       // Small distinct community
    { value: 'Druze', weight: 0.005 },           // Rare in urban Damascus
    { value: 'Latin Christian', weight: 0.015 }, // Italian merchants
  ],
  wealthy: [
    // Elite residential - Mamluk officials, wealthy merchants, ulama
    { value: 'Sunni Islam', weight: 0.72 },
    { value: 'Shia Islam', weight: 0.03 },
    { value: 'Ismaili', weight: 0.003 },
    { value: 'Eastern Orthodox', weight: 0.10 },
    { value: 'Armenian Apostolic', weight: 0.05 },
    { value: 'Syriac Orthodox', weight: 0.02 },
    { value: 'Coptic Orthodox', weight: 0.007 },
    { value: 'Jewish', weight: 0.06 },
    { value: 'Samaritan', weight: 0.002 },
    { value: 'Druze', weight: 0.003 },
    { value: 'Latin Christian', weight: 0.005 },
  ],
  hovels: [
    // Poor residential - laborers, recent migrants, refugees
    // Higher Shia presence (5-8%) - often marginalized communities
    { value: 'Sunni Islam', weight: 0.78 },
    { value: 'Shia Islam', weight: 0.07 },       // Higher among poor/marginalized
    { value: 'Ismaili', weight: 0.008 },         // Hidden communities
    { value: 'Eastern Orthodox', weight: 0.05 },
    { value: 'Armenian Apostolic', weight: 0.02 },
    { value: 'Syriac Orthodox', weight: 0.025 },
    { value: 'Coptic Orthodox', weight: 0.005 },
    { value: 'Jewish', weight: 0.03 },
    { value: 'Samaritan', weight: 0.002 },
    { value: 'Druze', weight: 0.005 },
  ],
  desert: [
    // Outskirts/rural - Bedouin, farmers, travelers
    // Druze more common (Hauran nearby), some Ismaili villages
    { value: 'Sunni Islam', weight: 0.80 },
    { value: 'Shia Islam', weight: 0.04 },
    { value: 'Ismaili', weight: 0.01 },          // Mountain villages
    { value: 'Eastern Orthodox', weight: 0.04 },
    { value: 'Armenian Apostolic', weight: 0.02 },
    { value: 'Syriac Orthodox', weight: 0.01 },
    { value: 'Jewish', weight: 0.02 },
    { value: 'Druze', weight: 0.06 },            // Higher near Hauran
  ],
  civic: [
    // Government/administrative - Mamluk dominance, dhimmi officials limited
    { value: 'Sunni Islam', weight: 0.82 },
    { value: 'Shia Islam', weight: 0.02 },
    { value: 'Ismaili', weight: 0.002 },
    { value: 'Eastern Orthodox', weight: 0.07 },
    { value: 'Armenian Apostolic', weight: 0.03 },
    { value: 'Syriac Orthodox', weight: 0.02 },
    { value: 'Coptic Orthodox', weight: 0.008 },
    { value: 'Jewish', weight: 0.03 },
    { value: 'Samaritan', weight: 0.002 },
    { value: 'Druze', weight: 0.003 },
    { value: 'Latin Christian', weight: 0.005 },
  ],
  // Bab Touma / Bab Sharqi - Historical Christian Quarter
  // Melkite (Eastern Orthodox), Syriac, Armenian churches and residences
  // Also Frankish/Italian merchant fondacos
  christian_quarter: [
    { value: 'Sunni Islam', weight: 0.32 },      // Some Muslim residents
    { value: 'Shia Islam', weight: 0.02 },
    { value: 'Eastern Orthodox', weight: 0.28 }, // Melkite - largest Christian group
    { value: 'Armenian Apostolic', weight: 0.14 },
    { value: 'Syriac Orthodox', weight: 0.10 },  // Jacobite
    { value: 'Coptic Orthodox', weight: 0.02 },  // Egyptian Christians
    { value: 'Jewish', weight: 0.04 },
    { value: 'Samaritan', weight: 0.005 },
    { value: 'Druze', weight: 0.002 },
    { value: 'Latin Christian', weight: 0.073 }, // Italian merchants - higher here
  ],
  // Al-Yahud / Harat al-Yahud - Historical Jewish Quarter
  // Mizrahi Jews (Arabized), Syriac-speaking Jews, some Romaniote
  jewish_quarter: [
    { value: 'Jewish', weight: 0.82 },           // Dominant
    { value: 'Samaritan', weight: 0.03 },        // Related but distinct
    { value: 'Sunni Islam', weight: 0.10 },      // Some Muslim residents
    { value: 'Eastern Orthodox', weight: 0.03 },
    { value: 'Syriac Orthodox', weight: 0.01 },
    { value: 'Shia Islam', weight: 0.01 },
  ],
  // Umayyad Mosque - The Great Mosque of Damascus
  // Pilgrims from across the Islamic world, scholars, worshippers
  umayyad_mosque: [
    { value: 'Sunni Islam', weight: 0.85 },
    { value: 'Shia Islam', weight: 0.10 },       // Shia pilgrims (tomb of Husayn's head)
    { value: 'Ismaili', weight: 0.01 },          // Rare visitors
    { value: 'Eastern Orthodox', weight: 0.02 }, // Tomb of John the Baptist draws some
    { value: 'Jewish', weight: 0.01 },
    { value: 'Druze', weight: 0.01 },
  ],
};

// =============================================================================
// ETHNICITY DISTRIBUTIONS BY DISTRICT
// =============================================================================
// Note: Italian city-states had distinct merchant colonies (fondacos)
// - Venetians: Dominant Mediterranean traders, most numerous
// - Genoese: Major rivals of Venice, strong Levant presence
// - Pisans: Declining by 1348, smaller presence
// - Catalans: Crown of Aragon, growing presence
// =============================================================================

const ETHNICITY_WEIGHTS_BY_BIOME: Record<BiomeType, Array<{ value: Ethnicity; weight: number }>> = {
  marketplace: [
    // International trading hub - highly diverse
    { value: 'Arab', weight: 0.48 },
    { value: 'Turkic', weight: 0.10 },           // Mamluk officials, Turkish merchants
    { value: 'Persian', weight: 0.10 },          // Major trade partner
    { value: 'Armenian', weight: 0.07 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Kurdish', weight: 0.04 },
    { value: 'Circassian', weight: 0.02 },       // Lower in Bahri period (pre-1382)
    // Italian city-states
    { value: 'Venetian', weight: 0.025 },        // Dominant Italian traders
    { value: 'Genoese', weight: 0.015 },         // Second most common
    { value: 'Catalan', weight: 0.008 },         // Growing presence
    { value: 'Pisan', weight: 0.004 },           // Declining
    // Other groups
    { value: 'Maghrebi', weight: 0.025 },        // North African merchants/scholars
    { value: 'Indian', weight: 0.012 },          // Spice route traders
    { value: 'Coptic', weight: 0.005 },          // Egyptian Christians
  ],
  wealthy: [
    // Elite residential
    { value: 'Arab', weight: 0.55 },
    { value: 'Turkic', weight: 0.12 },           // Mamluk elite
    { value: 'Persian', weight: 0.06 },
    { value: 'Armenian', weight: 0.05 },
    { value: 'Greek/Rum', weight: 0.05 },
    { value: 'Aramaean/Syriac', weight: 0.05 },
    { value: 'Kurdish', weight: 0.04 },
    { value: 'Circassian', weight: 0.03 },
    { value: 'Venetian', weight: 0.015 },
    { value: 'Genoese', weight: 0.01 },
    { value: 'Maghrebi', weight: 0.015 },
    { value: 'Coptic', weight: 0.005 },
  ],
  hovels: [
    // Poor residential - more homogeneous
    { value: 'Arab', weight: 0.70 },
    { value: 'Aramaean/Syriac', weight: 0.08 },
    { value: 'Kurdish', weight: 0.07 },
    { value: 'Turkic', weight: 0.04 },
    { value: 'Armenian', weight: 0.03 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Persian', weight: 0.02 },
    { value: 'Circassian', weight: 0.015 },
    { value: 'Maghrebi', weight: 0.02 },
    { value: 'Coptic', weight: 0.005 },
  ],
  desert: [
    // Outskirts/rural
    { value: 'Arab', weight: 0.72 },             // Bedouin, farmers
    { value: 'Kurdish', weight: 0.08 },
    { value: 'Turkic', weight: 0.06 },
    { value: 'Aramaean/Syriac', weight: 0.04 },
    { value: 'Armenian', weight: 0.03 },
    { value: 'Circassian', weight: 0.02 },
    { value: 'Persian', weight: 0.02 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Maghrebi', weight: 0.01 },
  ],
  civic: [
    // Government district - Mamluk administration
    { value: 'Arab', weight: 0.55 },
    { value: 'Turkic', weight: 0.15 },           // Mamluk officials
    { value: 'Kurdish', weight: 0.05 },
    { value: 'Circassian', weight: 0.04 },
    { value: 'Persian', weight: 0.05 },
    { value: 'Armenian', weight: 0.05 },
    { value: 'Greek/Rum', weight: 0.04 },
    { value: 'Aramaean/Syriac', weight: 0.04 },
    { value: 'Maghrebi', weight: 0.02 },
    { value: 'Coptic', weight: 0.01 },
  ],
  // Christian Quarter - diverse Christian ethnicities
  christian_quarter: [
    { value: 'Arab', weight: 0.30 },             // Arab Christians + Muslims
    { value: 'Greek/Rum', weight: 0.18 },        // Melkite/Byzantine
    { value: 'Aramaean/Syriac', weight: 0.16 },  // Native Syriac speakers
    { value: 'Armenian', weight: 0.14 },         // Significant community
    { value: 'Coptic', weight: 0.03 },           // Egyptian Christians
    { value: 'Kurdish', weight: 0.02 },
    { value: 'Turkic', weight: 0.02 },
    { value: 'Persian', weight: 0.02 },
    // Italian merchants with fondacos in this quarter
    { value: 'Venetian', weight: 0.06 },         // Largest Italian presence
    { value: 'Genoese', weight: 0.04 },
    { value: 'Catalan', weight: 0.02 },
    { value: 'Pisan', weight: 0.01 },
  ],
  // Jewish Quarter
  jewish_quarter: [
    { value: 'Arab', weight: 0.55 },             // Arabized Mizrahi Jews
    { value: 'Aramaean/Syriac', weight: 0.25 },  // Syriac-speaking Jews
    { value: 'Greek/Rum', weight: 0.08 },        // Romaniote Jews
    { value: 'Persian', weight: 0.08 },          // Persian Jews
    { value: 'Indian', weight: 0.02 },           // Jewish traders from India
    { value: 'Kurdish', weight: 0.01 },
    { value: 'Armenian', weight: 0.01 },
  ],
  // Umayyad Mosque - pilgrims from across Islamic world
  umayyad_mosque: [
    { value: 'Arab', weight: 0.50 },
    { value: 'Turkic', weight: 0.14 },           // Mamluk officials, pilgrims
    { value: 'Persian', weight: 0.12 },          // Persian pilgrims/scholars
    { value: 'Kurdish', weight: 0.08 },
    { value: 'Maghrebi', weight: 0.06 },         // North African pilgrims
    { value: 'Aramaean/Syriac', weight: 0.04 },
    { value: 'Circassian', weight: 0.03 },
    { value: 'Greek/Rum', weight: 0.02 },
    { value: 'Indian', weight: 0.01 },           // Indian Muslim pilgrims
  ],
};

// =============================================================================
// RELIGION-SPECIFIC ETHNICITY CORRELATIONS
// =============================================================================
// These override biome-based ethnicity when religion is determined first
// Enforces historical ethnicity-religion correlations
// =============================================================================

const RELIGION_ETHNICITY_WEIGHTS: Partial<Record<Religion, Array<{ value: Ethnicity; weight: number }>>> = {
  'Sunni Islam': [
    { value: 'Arab', weight: 0.52 },
    { value: 'Turkic', weight: 0.15 },
    { value: 'Kurdish', weight: 0.10 },
    { value: 'Persian', weight: 0.08 },
    { value: 'Circassian', weight: 0.04 },
    { value: 'Maghrebi', weight: 0.05 },         // North African Muslims
    { value: 'Aramaean/Syriac', weight: 0.03 },  // Syriac converts
    { value: 'Greek/Rum', weight: 0.02 },        // Greek converts
    { value: 'Indian', weight: 0.01 },           // Indian Muslims
  ],
  'Shia Islam': [
    { value: 'Arab', weight: 0.50 },
    { value: 'Persian', weight: 0.25 },          // Strong Persian-Shia correlation
    { value: 'Kurdish', weight: 0.12 },
    { value: 'Turkic', weight: 0.06 },
    { value: 'Aramaean/Syriac', weight: 0.04 },
    { value: 'Indian', weight: 0.02 },           // Indian Shia merchants
    { value: 'Circassian', weight: 0.01 },
  ],
  'Ismaili': [
    // Post-Mongol remnant communities
    { value: 'Arab', weight: 0.45 },
    { value: 'Persian', weight: 0.40 },          // Strong Persian connection
    { value: 'Kurdish', weight: 0.10 },
    { value: 'Indian', weight: 0.05 },           // Indian Ismailis (Bohras etc.)
  ],
  'Eastern Orthodox': [
    // Melkite/Rum Orthodox - Greek liturgy, Chalcedonian
    { value: 'Greek/Rum', weight: 0.45 },
    { value: 'Aramaean/Syriac', weight: 0.25 },  // Arabic-speaking Melkites
    { value: 'Arab', weight: 0.25 },             // Arabized Melkites
    { value: 'Armenian', weight: 0.05 },         // Rare Armenian Melkites
  ],
  'Armenian Apostolic': [
    // Ethnically Armenian by definition
    { value: 'Armenian', weight: 0.98 },
    { value: 'Arab', weight: 0.02 },
  ],
  'Syriac Orthodox': [
    // Jacobite - Syriac liturgy, Miaphysite
    { value: 'Aramaean/Syriac', weight: 0.70 },
    { value: 'Arab', weight: 0.25 },             // Arabized Syriacs
    { value: 'Kurdish', weight: 0.05 },          // Some Kurdish Christians
  ],
  'Coptic Orthodox': [
    // Egyptian Church
    { value: 'Coptic', weight: 0.85 },
    { value: 'Arab', weight: 0.10 },             // Arabized Copts
    { value: 'Greek/Rum', weight: 0.05 },
  ],
  'Jewish': [
    { value: 'Arab', weight: 0.55 },             // Arabized Mizrahi Jews
    { value: 'Aramaean/Syriac', weight: 0.20 },  // Syriac-speaking Jews
    { value: 'Greek/Rum', weight: 0.10 },        // Romaniote Jews
    { value: 'Persian', weight: 0.10 },          // Persian Jews
    { value: 'Indian', weight: 0.03 },           // Cochin/Bene Israel Jews
    { value: 'Maghrebi', weight: 0.02 },         // North African Jews
  ],
  'Samaritan': [
    // Distinct ethnic-religious group
    { value: 'Arab', weight: 0.60 },             // Arabized Samaritans
    { value: 'Aramaean/Syriac', weight: 0.40 },  // Aramaic heritage
  ],
  'Druze': [
    // Originated among Arabs in Fatimid Egypt
    { value: 'Arab', weight: 0.85 },
    { value: 'Kurdish', weight: 0.15 },          // Some Kurdish Druze
  ],
  'Latin Christian': [
    // Roman Catholic - Italian merchants primarily
    { value: 'Venetian', weight: 0.45 },         // Dominant
    { value: 'Genoese', weight: 0.30 },          // Second
    { value: 'Catalan', weight: 0.15 },          // Growing
    { value: 'Pisan', weight: 0.05 },            // Declining
    { value: 'Greek/Rum', weight: 0.03 },        // Rare converts
    { value: 'Arab', weight: 0.02 },             // Very rare
  ],
};

// =============================================================================
// MAMLUK MILITARY ETHNICITY (Bahri Period, 1250-1382)
// =============================================================================
// CORRECTED: Circassian dominance was AFTER 1382 (Burji dynasty)
// In 1348, Turkic (Kipchak, Cuman) Mamluks dominated
// =============================================================================

const MAMLUK_ETHNICITY_WEIGHTS: Array<{ value: Ethnicity; weight: number }> = [
  { value: 'Turkic', weight: 0.68 },             // Kipchak, Cuman - dominant in Bahri period
  { value: 'Circassian', weight: 0.15 },         // Present but not dominant yet
  { value: 'Kurdish', weight: 0.08 },            // Some Kurdish mamluks
  { value: 'Greek/Rum', weight: 0.05 },          // Greek converts/captives
  { value: 'Arab', weight: 0.04 },               // Rare Arab mamluks
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
  // Islamic religious professions must be Sunni (or Shia for certain shrines)
  if (/Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa|Sufi|Dervish/i.test(profession)) return 'Sunni Islam';
  // Jewish religious professions
  if (/Rabbi|Cantor|Torah|Shochet/i.test(profession)) return 'Jewish';
  // Christian priests - default to Eastern Orthodox (most common in Damascus)
  if (/Orthodox Priest|Melkite|Deacon|Monk/i.test(profession)) return 'Eastern Orthodox';
  if (/Armenian Priest/i.test(profession)) return 'Armenian Apostolic';
  if (/Syriac Priest|Jacobite/i.test(profession)) return 'Syriac Orthodox';
  if (/Coptic Priest/i.test(profession)) return 'Coptic Orthodox';
  // Mamluk military must be Sunni Muslim
  if (/Mamluk|Guard|Soldier/i.test(profession)) return 'Sunni Islam';
  // Wine merchant must be non-Muslim (usually Christian)
  if (/Wine Merchant/i.test(profession)) {
    if (baseReligion === 'Sunni Islam' || baseReligion === 'Shia Islam') {
      return 'Eastern Orthodox';
    }
  }
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
  // Italian city-state merchants
  if (ethnicity === 'Venetian' || ethnicity === 'Genoese' || ethnicity === 'Pisan') {
    return rand() > 0.3 ? 'Italian' : (rand() > 0.5 ? 'Latin' : 'Arabic');
  }
  if (ethnicity === 'Catalan') {
    return rand() > 0.3 ? 'Catalan' : (rand() > 0.5 ? 'Latin' : 'Arabic');
  }
  // Latin Christians often know Latin regardless of ethnicity
  if (religion === 'Latin Christian' && rand() > 0.4) return 'Latin';

  // Mamluk soldiers and Circassians used Turkic
  if (ethnicity === 'Turkic') return rand() > 0.5 ? 'Turkic' : 'Arabic';
  if (ethnicity === 'Circassian') return rand() > 0.6 ? 'Turkic' : 'Arabic';

  // Other ethnicities with native languages
  if (ethnicity === 'Aramaean/Syriac') return rand() > 0.4 ? 'Syriac' : 'Arabic';
  if (ethnicity === 'Armenian') return rand() > 0.3 ? 'Armenian' : 'Arabic';
  if (ethnicity === 'Greek/Rum') return rand() > 0.4 ? 'Greek' : 'Arabic';
  if (ethnicity === 'Persian') return rand() > 0.4 ? 'Persian' : 'Arabic';
  if (ethnicity === 'Coptic') return rand() > 0.3 ? 'Coptic' : 'Arabic';
  if (ethnicity === 'Indian') return rand() > 0.4 ? 'Sindhi' : 'Arabic';

  // Maghrebis spoke Arabic (dialectal, but same script)
  if (ethnicity === 'Maghrebi') return 'Arabic';

  // Jews often knew Hebrew for religious purposes
  if (religion === 'Jewish' && rand() > 0.7) return 'Hebrew';
  if (religion === 'Samaritan' && rand() > 0.6) return 'Hebrew';  // Samaritan Hebrew

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
 * Certain ethnicities had near-100% correlation with specific religions in 1348 Damascus.
 */
const enforceEthnicityReligionConsistency = (
  rand: () => number,
  ethnicity: Ethnicity,
  religion: Religion
): { ethnicity: Ethnicity; religion: Religion } => {

  // === ETHNICITY → RELIGION CONSTRAINTS ===

  // Armenians: Almost universally Armenian Apostolic (or rarely Melkite)
  if (ethnicity === 'Armenian') {
    if (religion !== 'Armenian Apostolic' && religion !== 'Eastern Orthodox') {
      return {
        ethnicity,
        religion: rand() < 0.95 ? 'Armenian Apostolic' : 'Eastern Orthodox'
      };
    }
  }

  // Italian city-states: Must be Latin Christian
  if (ethnicity === 'Venetian' || ethnicity === 'Genoese' || ethnicity === 'Pisan' || ethnicity === 'Catalan') {
    if (religion !== 'Latin Christian') {
      return { ethnicity, religion: 'Latin Christian' };
    }
  }

  // Copts: Must be Coptic Orthodox
  if (ethnicity === 'Coptic') {
    if (religion !== 'Coptic Orthodox') {
      return { ethnicity, religion: 'Coptic Orthodox' };
    }
  }

  // Greek/Rum: Usually Orthodox, some converted to Islam
  if (ethnicity === 'Greek/Rum') {
    if (religion !== 'Eastern Orthodox' && religion !== 'Sunni Islam') {
      return {
        ethnicity,
        religion: rand() < 0.75 ? 'Eastern Orthodox' : 'Sunni Islam'
      };
    }
  }

  // Aramaean/Syriac: Usually Syriac Orthodox, some Melkite, some Muslim converts
  if (ethnicity === 'Aramaean/Syriac') {
    if (religion !== 'Syriac Orthodox' && religion !== 'Eastern Orthodox' &&
        religion !== 'Sunni Islam' && religion !== 'Jewish') {
      const roll = rand();
      if (roll < 0.45) return { ethnicity, religion: 'Syriac Orthodox' };
      if (roll < 0.65) return { ethnicity, religion: 'Eastern Orthodox' };
      if (roll < 0.90) return { ethnicity, religion: 'Sunni Islam' };
      return { ethnicity, religion: 'Jewish' };  // Some Syriac-speaking Jews
    }
  }

  // === RELIGION → ETHNICITY CONSTRAINTS ===

  // Armenian Apostolic → Armenian
  if (religion === 'Armenian Apostolic' && ethnicity !== 'Armenian') {
    return { ethnicity: 'Armenian', religion };
  }

  // Coptic Orthodox → Coptic
  if (religion === 'Coptic Orthodox' && ethnicity !== 'Coptic') {
    // Allow some Arabized Copts
    if (rand() < 0.85) return { ethnicity: 'Coptic', religion };
  }

  // Latin Christian → Italian city-states (or rare converts)
  if (religion === 'Latin Christian') {
    if (ethnicity !== 'Venetian' && ethnicity !== 'Genoese' &&
        ethnicity !== 'Pisan' && ethnicity !== 'Catalan') {
      if (rand() < 0.90) {
        // Pick an Italian city-state
        const roll = rand();
        if (roll < 0.45) return { ethnicity: 'Venetian', religion };
        if (roll < 0.75) return { ethnicity: 'Genoese', religion };
        if (roll < 0.90) return { ethnicity: 'Catalan', religion };
        return { ethnicity: 'Pisan', religion };
      }
    }
  }

  // Druze → Arab (or Kurdish)
  if (religion === 'Druze') {
    if (ethnicity !== 'Arab' && ethnicity !== 'Kurdish') {
      return { ethnicity: 'Arab', religion };
    }
  }

  // Samaritan → Arab or Aramaean
  if (religion === 'Samaritan') {
    if (ethnicity !== 'Arab' && ethnicity !== 'Aramaean/Syriac') {
      return { ethnicity: rand() < 0.6 ? 'Arab' : 'Aramaean/Syriac', religion };
    }
  }

  // Ismaili → Arab, Persian, or Kurdish
  if (religion === 'Ismaili') {
    if (ethnicity !== 'Arab' && ethnicity !== 'Persian' && ethnicity !== 'Kurdish' && ethnicity !== 'Indian') {
      const roll = rand();
      if (roll < 0.45) return { ethnicity: 'Arab', religion };
      if (roll < 0.85) return { ethnicity: 'Persian', religion };
      return { ethnicity: 'Kurdish', religion };
    }
  }

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
