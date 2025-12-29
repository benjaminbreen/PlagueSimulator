
import { BuildingType, BuildingMetadata, SocialClass, NPCStats, PlayerStats, DistrictType, getDistrictType, Ethnicity, Religion } from '../types';
import { assignDemographics } from './demographics';

// ============================================
// ETHNICITY-SPECIFIC NAME POOLS
// ============================================

// Arab names (Sunni/Shia Muslim Arabs)
const ARAB_NAMES_MALE = ['Ahmad', 'Yusuf', 'Ibrahim', 'Umar', 'Hassan', 'Mahmud', 'Zayd', 'Malik', 'Nasir', 'Suleiman', 'Ali', 'Muhammad', 'Khalil', 'Rashid', 'Tariq', 'Salah', 'Jamal', 'Faris', 'Khalid', 'Said'];
const ARAB_NAMES_FEMALE = ['Fatima', 'Zaynab', 'Maryam', 'Aisha', 'Khadija', 'Layla', 'Salma', 'Hafsa', 'Raya', 'Nura', 'Amina', 'Safiya', 'Suhayla', 'Lamia', 'Hana', 'Yasmin'];
const ARAB_NISBAS = ['Al-Dimashqi', 'Al-Halabi', 'Al-Baghdadi', 'Al-Suri', 'Al-Misri', 'Al-Andalusi', 'Ibn Khaldun', 'Al-Bakri', 'Al-Hashimi', 'Al-Qurashi'];

// Turkic names (Mamluk elite - often took Arabic names after conversion, but retained Turkic given names)
const TURKIC_NAMES_MALE = ['Baybars', 'Qalawun', 'Kitbugha', 'Barquq', 'Tankiz', 'Aydakin', 'Sanjar', 'Tughril', 'Arslan', 'Ilgazi', 'Tengiz', 'Qutuz', 'Aybak', 'Aqtay'];
const TURKIC_NAMES_FEMALE = ['Shagarat', 'Turkan', 'Khatun', 'Terken', 'Altun'];
const TURKIC_NISBAS = ['Al-Mansuri', 'Al-Nasiri', 'Al-Ashrafiyya', 'Al-Turki', 'Al-Zahiri'];

// Kurdish names
const KURDISH_NAMES_MALE = ['Salahuddin', 'Shirkuh', 'Bahram', 'Rostam', 'Kurdi', 'Diyar', 'Barzani', 'Shams', 'Ayyub'];
const KURDISH_NAMES_FEMALE = ['Zarin', 'Gulbahar', 'Shirin', 'Rojin', 'Helin', 'Narin'];
const KURDISH_NISBAS = ['Al-Kurdi', 'Al-Akradi', 'Al-Ayyubi', 'Ibn Ayyub'];

// Persian names
const PERSIAN_NAMES_MALE = ['Dariush', 'Khosrow', 'Farhad', 'Jamshid', 'Behram', 'Firuz', 'Rostam', 'Shiraz', 'Isfahan'];
const PERSIAN_NAMES_FEMALE = ['Parvin', 'Soraya', 'Roxana', 'Shireen', 'Mahvash', 'Golnar', 'Maryam'];
const PERSIAN_NISBAS = ['Al-Farsi', 'Al-Shirazi', 'Al-Isfahani', 'Al-Khorasani', 'Al-Tabari'];

// Armenian names
const ARMENIAN_NAMES_MALE = ['Hovhannes', 'Vartan', 'Grigor', 'Tigran', 'Aram', 'Levon', 'Hayk', 'Dikran', 'Sahak', 'Nerses'];
const ARMENIAN_NAMES_FEMALE = ['Anahit', 'Nvard', 'Sona', 'Arpi', 'Siranush', 'Gayane', 'Satenik', 'Mariam'];
const ARMENIAN_SURNAMES = ['Melikyan', 'Sargsyan', 'Hovhannisyan', 'Grigoryan', 'Petrosyan', 'Hakobyan'];

// Greek/Rum names (Byzantine Christians in Syria)
const GREEK_NAMES_MALE = ['Konstantinos', 'Nikolaos', 'Georgios', 'Dimitrios', 'Theodoros', 'Mikhail', 'Pavlos', 'Ioannis'];
const GREEK_NAMES_FEMALE = ['Maria', 'Sophia', 'Anastasia', 'Eleni', 'Theodora', 'Irini', 'Katerina'];
const GREEK_NISBAS = ['Al-Rumi', 'Al-Yunani', 'Palaiologos', 'Komnenos'];

// Aramaean/Syriac names (Syriac Christians)
const SYRIAC_NAMES_MALE = ['Yuhanna', 'Shimun', 'Matta', 'Yaqub', 'Ephrem', 'Barsoum', 'Gewargis', 'Isa'];
const SYRIAC_NAMES_FEMALE = ['Maryam', 'Shushanik', 'Sarah', 'Hanna', 'Marya', 'Shamiran'];
const SYRIAC_NISBAS = ['Bar Shimun', 'Bar Yaqub', 'Al-Suryani', 'Bar Ephrem'];

// Circassian names (later Mamluk period - less common in 1348 Bahri period)
const CIRCASSIAN_NAMES_MALE = ['Barquq', 'Jaqmaq', 'Inal', 'Qaytbay', 'Barsbay', 'Tatar', 'Khushqadam'];
const CIRCASSIAN_NAMES_FEMALE = ['Khawand', 'Shirin'];
const CIRCASSIAN_NISBAS = ['Al-Zahiri', 'Al-Ashrafiyya', 'Al-Jarkasi'];

// Jewish names (Sephardic/Mizrahi Jews of Damascus)
const JEWISH_NAMES_MALE = ['Yosef', 'Shlomo', 'Moshe', 'Avraham', 'Yitzhak', 'David', 'Yaakov', 'Eliyahu', 'Shmuel', 'Yehuda'];
const JEWISH_NAMES_FEMALE = ['Esther', 'Miriam', 'Rachel', 'Sarah', 'Leah', 'Rebecca', 'Rivka', 'Hannah', 'Dinah'];
const JEWISH_SURNAMES = ['Ibn Ezra', 'Ben Gabirol', 'Ibn Shaprut', 'Al-Yahudi', 'Ben David', 'Ibn Tibbon', 'Al-Harizi'];

// ============================================
// ITALIAN CITY-STATE MERCHANT NAMES
// ============================================
// Each city-state had distinct naming patterns and prominent families

// Venetian names (La Serenissima - dominant Mediterranean traders)
const VENETIAN_NAMES_MALE = ['Marco', 'Giovanni', 'Pietro', 'Andrea', 'Niccolò', 'Lorenzo', 'Alvise', 'Jacopo', 'Bartolomeo', 'Sebastiano'];
const VENETIAN_NAMES_FEMALE = ['Maria', 'Caterina', 'Francesca', 'Elena', 'Lucia', 'Chiara', 'Bianca', 'Isabella'];
const VENETIAN_SURNAMES = ['Polo', 'Contarini', 'Mocenigo', 'Dandolo', 'Morosini', 'Grimani', 'Venier', 'Barbarigo', 'Corner'];

// Genoese names (Rivals of Venice, banking and trade)
const GENOESE_NAMES_MALE = ['Giovanni', 'Francesco', 'Antonio', 'Luca', 'Oberto', 'Simone', 'Giacomo', 'Lanfranco', 'Percivalle'];
const GENOESE_NAMES_FEMALE = ['Maria', 'Caterina', 'Giovanna', 'Bianca', 'Leonora', 'Margherita'];
const GENOESE_SURNAMES = ['Doria', 'Spinola', 'Grimaldi', 'Fieschi', 'Centurione', 'Giustiniani', 'Cattaneo', 'di Negro'];

// Pisan names (Tuscan traders, declining by 1348)
const PISAN_NAMES_MALE = ['Francesco', 'Ugolino', 'Ranieri', 'Bonaventura', 'Gherardo', 'Bartolomeo', 'Iacopo'];
const PISAN_NAMES_FEMALE = ['Maria', 'Chiara', 'Lucia', 'Agnese', 'Berta'];
const PISAN_SURNAMES = ['della Gherardesca', 'Visconti', 'Alliata', 'Gambacorti', 'Lanfranchi', 'Sismondi'];

// Catalan names (Crown of Aragon - growing presence)
const CATALAN_NAMES_MALE = ['Ramon', 'Berenguer', 'Guillem', 'Pere', 'Jaume', 'Arnau', 'Bernat', 'Joan', 'Francesc'];
const CATALAN_NAMES_FEMALE = ['Maria', 'Elisenda', 'Blanca', 'Sibil·la', 'Constança', 'Violant'];
const CATALAN_SURNAMES = ['de Barcelona', 'de Montcada', 'de Cervera', 'de Cardona', 'Marquet', 'de Rocafort', 'de Fluvià'];

// ============================================
// ADDITIONAL ETHNIC GROUP NAMES
// ============================================

// Maghrebi names (North African - Morocco, Tunisia, al-Andalus refugees)
const MAGHREBI_NAMES_MALE = ['Muhammad', 'Ahmad', 'Abdullah', 'Idris', 'Yusuf', 'Musa', 'Ismail', 'Harun', 'Yahya', 'Tarik'];
const MAGHREBI_NAMES_FEMALE = ['Fatima', 'Khadija', 'Zahra', 'Aisha', 'Maryam', 'Hafsa', 'Amina', 'Layla'];
const MAGHREBI_NISBAS = ['Al-Maghribi', 'Al-Fasi', 'Al-Tunisi', 'Al-Andalusi', 'Al-Qurtubi', 'Al-Tilimsani', 'Ibn Rushd', 'Al-Marrakushi'];

// Coptic names (Egyptian Christians)
const COPTIC_NAMES_MALE = ['Boutros', 'Girgis', 'Morcos', 'Hanna', 'Tadros', 'Mikhail', 'Fanus', 'Shnouda', 'Kyrillos'];
const COPTIC_NAMES_FEMALE = ['Maryam', 'Irini', 'Tamav', 'Demiana', 'Marina', 'Tasoni', 'Sofi'];
const COPTIC_SURNAMES = ['Al-Qibti', 'Al-Misri', 'Ibn Butrus', 'Ibn Girgis', 'Abu Seif', 'Al-Sakakini'];

// Indian names (Sindhi/Gujarati merchants on spice routes)
const INDIAN_NAMES_MALE = ['Ramji', 'Vishnu', 'Gopal', 'Lakshmi', 'Kashi', 'Bhanji', 'Haridas', 'Mulchand', 'Thakur'];
const INDIAN_NAMES_FEMALE = ['Devi', 'Rukmini', 'Lakshmi', 'Kamla', 'Pushpa', 'Radha'];
const INDIAN_SURNAMES = ['Al-Hindi', 'Al-Sindi', 'Shetty', 'Thakkar', 'Vaniya', 'Mehta', 'Chheda'];

// Lookup tables for name generation
const NAMES_BY_ETHNICITY: Record<Ethnicity, { male: string[]; female: string[]; surnames: string[] }> = {
  'Arab': { male: ARAB_NAMES_MALE, female: ARAB_NAMES_FEMALE, surnames: ARAB_NISBAS },
  'Turkic': { male: TURKIC_NAMES_MALE, female: TURKIC_NAMES_FEMALE, surnames: TURKIC_NISBAS },
  'Kurdish': { male: KURDISH_NAMES_MALE, female: KURDISH_NAMES_FEMALE, surnames: KURDISH_NISBAS },
  'Persian': { male: PERSIAN_NAMES_MALE, female: PERSIAN_NAMES_FEMALE, surnames: PERSIAN_NISBAS },
  'Armenian': { male: ARMENIAN_NAMES_MALE, female: ARMENIAN_NAMES_FEMALE, surnames: ARMENIAN_SURNAMES },
  'Greek/Rum': { male: GREEK_NAMES_MALE, female: GREEK_NAMES_FEMALE, surnames: GREEK_NISBAS },
  'Aramaean/Syriac': { male: SYRIAC_NAMES_MALE, female: SYRIAC_NAMES_FEMALE, surnames: SYRIAC_NISBAS },
  'Circassian': { male: CIRCASSIAN_NAMES_MALE, female: CIRCASSIAN_NAMES_FEMALE, surnames: CIRCASSIAN_NISBAS },
  // Italian city-states
  'Venetian': { male: VENETIAN_NAMES_MALE, female: VENETIAN_NAMES_FEMALE, surnames: VENETIAN_SURNAMES },
  'Genoese': { male: GENOESE_NAMES_MALE, female: GENOESE_NAMES_FEMALE, surnames: GENOESE_SURNAMES },
  'Pisan': { male: PISAN_NAMES_MALE, female: PISAN_NAMES_FEMALE, surnames: PISAN_SURNAMES },
  'Catalan': { male: CATALAN_NAMES_MALE, female: CATALAN_NAMES_FEMALE, surnames: CATALAN_SURNAMES },
  // Additional groups
  'Maghrebi': { male: MAGHREBI_NAMES_MALE, female: MAGHREBI_NAMES_FEMALE, surnames: MAGHREBI_NISBAS },
  'Coptic': { male: COPTIC_NAMES_MALE, female: COPTIC_NAMES_FEMALE, surnames: COPTIC_SURNAMES },
  'Indian': { male: INDIAN_NAMES_MALE, female: INDIAN_NAMES_FEMALE, surnames: INDIAN_SURNAMES },
};

// Special case: Jewish names override ethnicity-based names
const JEWISH_NAMES = { male: JEWISH_NAMES_MALE, female: JEWISH_NAMES_FEMALE, surnames: JEWISH_SURNAMES };

// Generate name based on ethnicity and religion
// Exported for use by merchant generation
export const generateNameForMerchant = (
  rand: () => number,
  gender: 'Male' | 'Female',
  ethnicity: Ethnicity,
  religion: Religion
): string => {
  // Jewish religion uses Jewish names regardless of ethnicity
  if (religion === 'Jewish') {
    const firstName = gender === 'Male'
      ? JEWISH_NAMES.male[Math.floor(rand() * JEWISH_NAMES.male.length)]
      : JEWISH_NAMES.female[Math.floor(rand() * JEWISH_NAMES.female.length)];
    const surname = JEWISH_NAMES.surnames[Math.floor(rand() * JEWISH_NAMES.surnames.length)];
    return `${firstName} ${surname}`;
  }

  // Latin Christian uses ethnicity-specific Italian city-state names
  // (Venetian, Genoese, Pisan, Catalan are all distinct)
  if (religion === 'Latin Christian') {
    // If ethnicity is already an Italian city-state, use that
    if (ethnicity === 'Venetian' || ethnicity === 'Genoese' || ethnicity === 'Pisan' || ethnicity === 'Catalan') {
      const namePool = NAMES_BY_ETHNICITY[ethnicity];
      const firstName = gender === 'Male'
        ? namePool.male[Math.floor(rand() * namePool.male.length)]
        : namePool.female[Math.floor(rand() * namePool.female.length)];
      const surname = namePool.surnames[Math.floor(rand() * namePool.surnames.length)];
      return `${firstName} ${surname}`;
    }
    // Default to Venetian for unspecified Latin Christians
    const firstName = gender === 'Male'
      ? VENETIAN_NAMES_MALE[Math.floor(rand() * VENETIAN_NAMES_MALE.length)]
      : VENETIAN_NAMES_FEMALE[Math.floor(rand() * VENETIAN_NAMES_FEMALE.length)];
    const surname = VENETIAN_SURNAMES[Math.floor(rand() * VENETIAN_SURNAMES.length)];
    return `${firstName} ${surname}`;
  }

  // Samaritan uses Jewish-style names with Samaritan flavor
  if (religion === 'Samaritan') {
    const firstName = gender === 'Male'
      ? JEWISH_NAMES.male[Math.floor(rand() * JEWISH_NAMES.male.length)]
      : JEWISH_NAMES.female[Math.floor(rand() * JEWISH_NAMES.female.length)];
    return `${firstName} Al-Samiri`;
  }

  // Get ethnicity-specific names
  const namePool = NAMES_BY_ETHNICITY[ethnicity] || NAMES_BY_ETHNICITY['Arab'];
  const firstName = gender === 'Male'
    ? namePool.male[Math.floor(rand() * namePool.male.length)]
    : namePool.female[Math.floor(rand() * namePool.female.length)];
  const surname = namePool.surnames[Math.floor(rand() * namePool.surnames.length)];

  return `${firstName} ${surname}`;
};

// Internal alias for name generation
const generateName = generateNameForMerchant;

// Legacy name arrays for backward compatibility with building generation
const FIRST_NAMES_MALE = ARAB_NAMES_MALE;
const FIRST_NAMES_FEMALE = ARAB_NAMES_FEMALE;
const LAST_NAMES = ARAB_NISBAS;

const COMMERCIAL_PROFESSIONS = [
  'Spice Merchant',
  'Draper',
  'Baker',
  'Blacksmith',
  'Coppersmith',
  'Weaver',
  'Carpenter',
  'Potter',
  'Innkeeper',
  'Khan Warden',
  'Sherbet Seller',
  'Sherbet House Keeper',
  'Caravanserai Keeper',
  // Damascus-specific trades (historically accurate)
  'Apothecary',           // Medicine, herbs, remedies
  'Perfumer',             // Oils, incense, fragrances (Suq al-Attarin)
  'Silk Merchant',        // Damascus silk was famous
  'Glassblower',          // Damascus glasswork renowned
  'Soap Maker',           // Damascus soap (sabun) exported throughout region
  'Rug Merchant',         // Carpets, prayer rugs
  'Jeweler',              // Precious metals, gems (often Jewish)
  'Leather Worker',       // Saddles, bags, shoes
  'Barber-Surgeon',       // Medical care and grooming
  'Locksmith',            // Intricate metalwork, keys
  'Oil Presser',          // Olive oil, sesame oil
  // NEW: Previously missing critical professions
  'Hakim',                // Physician - Islamic medical tradition
  'Money Changer',        // Sarraf - essential for trade
  'Goldsmith',            // Distinct from jeweler - metalwork (often Jewish)
  'Brass Worker',         // Nahhas - Damascus metalwork famous
  'Wine Merchant',        // Christian-only profession
  'Funduq Keeper',        // Merchant hostel keeper
  'Commercial Agent',     // Wakil - commission merchants
  'Pharmacist',           // Saydalani - compound medicines
  'Barber',               // Hallaq - social hub, distinct from surgeon
  'Butcher',              // Qassab - meat trade
  'Fishmonger',           // Sammak - Barada River trade
  'Glazier',              // Zajjaj - window glass specialist
];
const RESIDENTIAL_PROFESSIONS = [
  // Unskilled Labor
  'Day-Laborer',
  'Water-Carrier',
  'Porter',
  'Street Sweeper',
  'Grave Digger',
  'Rag Picker',
  'Night Watchman',
  'Stable Hand',
  'Builder\'s Laborer',
  // Transport
  'Donkey Driver',
  'Camel Driver',
  'Muleteer',
  // Textile Workers (Damascus famous for textiles)
  'Spinner',
  'Dyer',
  'Embroiderer',
  'Tailor',
  'Silk Winder',
  'Felt Maker',
  // Food & Agriculture (Damascus had famous gardens/orchards)
  'Gardener',
  'Orchard Keeper',
  'Miller',
  'Cheese Maker',
  'Butcher\'s Assistant',
  'Vegetable Seller',
  'Fruit Seller',
  'Charcoal Seller',
  'Firewood Seller',
  // Construction
  'Mason',
  'Plasterer',
  'Whitewasher',
  'Brick Maker',
  'Tile Maker',
  // Service Workers
  'Bath Attendant',
  'Cook',
  'Servant',
  'Launderer',
  'Messenger',
  // Skilled Artisans (living residential, working in souks)
  'Cobbler',
  'Rope Maker',
  'Mat Weaver',
  'Basket Maker',
  'Woodcarver',
  // Scribal/Educated
  'Copyist',
  'Madrasa Student',
  'Scribe',                 // Katib - administrative scribe
  'Qur\'an Teacher',        // Muqri - elementary instruction
  // Military
  'City Guard',
  'Mamluk Soldier',
  'Retired Guard',
  // Religious/Spiritual
  'Sufi Dervish',           // Wandering mystic
  'Zawiya Attendant',       // Sufi lodge caretaker
  // Urban Poor/Other
  'Tanner',
  'Unemployed',
  'Beggar',
  'Widow',
  'Pilgrim',
];

// Female-specific professions (historically documented)
const FEMALE_PROFESSIONS = [
  'Midwife',                // Daya - critical profession, well-documented
  'Birth Attendant',        // Qabila - assists midwife
  'Washer of the Dead',     // Ghasila - prepares women's bodies for burial
  'Bathhouse Attendant',    // Hammamiyya - women's section of hammam
  'Professional Mourner',   // Naddaba - paid mourners at funerals
  'Matchmaker',             // Dallala - marriage broker, sales agent
  'Wet Nurse',              // Murdi'a - nursing for wealthy families
  'Henna Artist',           // Applies henna for weddings/celebrations
  'Spinner',                // Common female textile work
  'Embroiderer',            // Common female textile work
  'Silk Winder',            // Factory-style silk work
  'Servant',
  'Cook',
  'Launderer',
  'Widow',                  // Often listed as status/profession
];

const CLERGY_PROFESSIONS = ['Imam', 'Qadi', 'Mufti', 'Muezzin', 'Qur\'an Reciter', 'Madrasa Teacher', 'Sufi Shaykh'];

// Religious building professions (architecture-specific)
// Islamic professions (for Muslim-majority districts)
const RELIGIOUS_PROFESSIONS = [
  'Imam',                    // Neighborhood mosque (masjid)
  'Friday Mosque Imam',      // Large Friday mosque (jami)
  'Madrasa Director',        // Islamic school/college
  'Shaykh',                  // Sufi lodge (zawiya)
  'Shrine Keeper',           // Mausoleum/tomb (maqam)
];

// Christian professions (for Christian Quarter)
const CHRISTIAN_RELIGIOUS_PROFESSIONS = [
  'Orthodox Priest',         // Melkite/Eastern Orthodox church
  'Armenian Priest',         // Armenian Apostolic church
  'Syriac Priest',          // Syriac Orthodox church
  'Monk',                    // Monastery/hermitage
  'Deacon',                  // Assistant to priest
];

// Jewish professions (for Jewish Quarter)
const JEWISH_RELIGIOUS_PROFESSIONS = [
  'Rabbi',                   // Synagogue leader
  'Cantor',                  // Synagogue cantor (hazzan)
  'Torah Scribe',            // Sofer - writes Torah scrolls
  'Ritual Slaughterer',      // Shochet - kosher butcher
  'Scholar',                 // Talmudic scholar
];

// Civic building professions (public services and government)
// Weighted to make high-ranking positions (Governor, Qadi) much rarer
const CIVIC_PROFESSIONS_WEIGHTED = [
  { profession: 'Mamluk Governor', weight: 1 },      // VERY RARE - only 1-2 per city (1/50 = 2%)
  { profession: 'Court Qadi', weight: 2 },           // RARE - major judge (2/50 = 4%)
  { profession: 'Court Physician', weight: 5 },      // Uncommon - medical clinic (5/50 = 10%)
  { profession: 'Market Inspector', weight: 8 },     // Common - muhtasib (8/50 = 16%)
  { profession: 'Notary', weight: 10 },              // Common - document office (10/50 = 20%)
  { profession: 'Hammam Keeper', weight: 12 },       // Very common - public baths (12/50 = 24%)
  { profession: 'Fountain Keeper', weight: 12 },     // Very common - public fountains (12/50 = 24%)
];

const CIVIC_PROFESSIONS = CIVIC_PROFESSIONS_WEIGHTED.map(p => p.profession);
// Moods organized by disposition range (0-100)
// High disposition (80-100): Friendly moods
// Medium-high (60-80): Pleasant moods
// Medium (40-60): Neutral moods
// Medium-low (20-40): Negative moods
// Low (0-20): Unfriendly moods
const MOODS_BY_DISPOSITION: Record<string, string[]> = {
  friendly: ['Cheerful', 'Warm', 'Gracious', 'Welcoming', 'Jovial'],
  pleasant: ['Content', 'Calm', 'Patient', 'Thoughtful', 'Cordial'],
  neutral: ['Reserved', 'Busy', 'Preoccupied', 'Stoic', 'Matter-of-fact'],
  negative: ['Tired', 'Irritable', 'Impatient', 'Wary', 'Sullen'],
  unfriendly: ['Suspicious', 'Bitter', 'Cold', 'Hostile', 'Despairing']
};

// Get mood based on disposition value
const getMoodFromDisposition = (disposition: number, rand: () => number): string => {
  let category: string;
  if (disposition >= 80) category = 'friendly';
  else if (disposition >= 60) category = 'pleasant';
  else if (disposition >= 40) category = 'neutral';
  else if (disposition >= 20) category = 'negative';
  else category = 'unfriendly';

  const moods = MOODS_BY_DISPOSITION[category];
  return moods[Math.floor(rand() * moods.length)];
};

// Generate disposition with normal-ish distribution (most people are neutral-ish)
const generateDisposition = (rand: () => number): number => {
  // Use multiple random samples to create a bell curve centered around 50
  const r1 = rand();
  const r2 = rand();
  const r3 = rand();
  // Average of 3 samples, scaled to 0-100
  const base = ((r1 + r2 + r3) / 3) * 100;
  // Clamp to valid range
  return Math.floor(Math.max(0, Math.min(100, base)));
};
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

const adjustHex = (hex: string, factor: number) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((num & 0xff) * factor)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// Convert hex to HSL
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

// Convert HSL to hex
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Apply age-based graying to hair color
 * Hair begins graying around 35, with full gray by ~70
 */
export const getAgedHairColor = (baseHairColor: string, age: number, rand: () => number): string => {
  if (age < 30) return baseHairColor;

  const hsl = hexToHSL(baseHairColor);

  // Early graying starts at 30, accelerates after 45
  let grayProgress = 0;
  if (age >= 30 && age < 45) {
    // Slow graying: 0-20% gray by 45
    grayProgress = ((age - 30) / 15) * 0.2;
  } else if (age >= 45 && age < 60) {
    // Medium graying: 20-60% by 60
    grayProgress = 0.2 + ((age - 45) / 15) * 0.4;
  } else if (age >= 60) {
    // Full graying: 60-100% by 75+
    grayProgress = 0.6 + Math.min(0.4, ((age - 60) / 15) * 0.4);
  }

  // Add some individual variation (some people gray faster/slower)
  const variation = (rand() - 0.5) * 0.15;
  grayProgress = Math.max(0, Math.min(1, grayProgress + variation));

  // Desaturate and lighten
  const newS = hsl.s * (1 - grayProgress * 0.9); // Almost fully desaturate
  const newL = hsl.l + grayProgress * (65 - hsl.l); // Lighten toward ~65%

  return hslToHex(hsl.h, newS, newL);
};

/**
 * Historical dye color ranges for 14th century Damascus
 * Based on available dye sources and trade routes
 */
const HISTORICAL_DYES: Record<string, { h: [number, number]; s: [number, number]; l: [number, number] }> = {
  // Expensive imported dyes
  indigo: { h: [215, 235], s: [30, 50], l: [25, 42] },      // From India/Persia - deep blue
  kermes: { h: [350, 10], s: [45, 65], l: [28, 42] },       // Insect red, luxury crimson
  saffron: { h: [42, 52], s: [55, 75], l: [48, 62] },       // Yellow-gold, expensive

  // Local plant dyes
  madder: { h: [5, 22], s: [38, 58], l: [32, 48] },         // Root-based red/rust
  pomegranate: { h: [18, 35], s: [28, 48], l: [28, 42] },   // Brown-tan rinds
  walnut: { h: [25, 40], s: [18, 32], l: [18, 32] },        // Dark brown/near-black
  henna: { h: [22, 38], s: [42, 62], l: [38, 52] },         // Orange-brown
  weld: { h: [48, 62], s: [35, 55], l: [52, 68] },          // Yellow-green plant

  // Undyed natural fibers
  rawLinen: { h: [42, 52], s: [12, 28], l: [62, 78] },      // Cream/ecru
  rawWool: { h: [35, 48], s: [8, 22], l: [55, 72] },        // Off-white to tan
};

// Social class determines dye availability (weights sum to ~1.0)
const DYE_ACCESS_BY_CLASS: Record<SocialClass, Record<string, number>> = {
  [SocialClass.NOBILITY]: {
    indigo: 0.20, kermes: 0.12, saffron: 0.10, madder: 0.18,
    pomegranate: 0.12, walnut: 0.10, henna: 0.08, rawLinen: 0.10
  },
  [SocialClass.MERCHANT]: {
    indigo: 0.08, madder: 0.22, pomegranate: 0.20,
    walnut: 0.12, henna: 0.12, weld: 0.08, rawLinen: 0.18
  },
  [SocialClass.CLERGY]: {
    walnut: 0.35, rawWool: 0.25, pomegranate: 0.18, indigo: 0.12, rawLinen: 0.10
  },
  [SocialClass.PEASANT]: {
    rawLinen: 0.30, rawWool: 0.28, pomegranate: 0.18, madder: 0.12, walnut: 0.08, weld: 0.04
  },
};

/**
 * Generate a historically-accurate robe color based on social class
 */
const generateDyeBasedColor = (rand: () => number, socialClass: SocialClass): string => {
  const weights = DYE_ACCESS_BY_CLASS[socialClass];
  const entries = Object.entries(weights);

  // Weighted random selection
  let roll = rand();
  let selectedDye = entries[0][0];
  for (const [dye, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      selectedDye = dye;
      break;
    }
  }

  const range = HISTORICAL_DYES[selectedDye];
  const h = range.h[0] + rand() * (range.h[1] - range.h[0]);
  const s = range.s[0] + rand() * (range.s[1] - range.s[0]);
  const l = range.l[0] + rand() * (range.l[1] - range.l[0]);

  return hslToHex(h, s, l);
};

const ROBE_OPTIONS_BY_CLASS: Record<SocialClass, Array<{ desc: string; base: string; accent: string; sash: boolean; sleeves: boolean }>> = {
  [SocialClass.PEASANT]: [
    // Undyed natural fibers (most common - weighted heavily)
    { desc: 'threadbare linen qamis in beige', base: '#c8b892', accent: '#e6d8b7', sash: false, sleeves: false },
    { desc: 'undyed flax thawb with a simple izar belt', base: '#d6c8a8', accent: '#cdbb9a', sash: false, sleeves: false },
    { desc: 'washed linen thawb in pale sand', base: '#d9cdb2', accent: '#c8b892', sash: false, sleeves: false },
    { desc: 'raw wool qamis in natural cream', base: '#d4c9b0', accent: '#bfb294', sash: false, sleeves: false },
    { desc: 'sun-bleached linen in off-white', base: '#e2d8c4', accent: '#d4c9a8', sash: false, sleeves: false },
    { desc: 'simple flax qamis in pale oat', base: '#d0c4a4', accent: '#c4b898', sash: false, sleeves: false },
    { desc: 'worn linen thawb in dusty cream', base: '#cfc5a8', accent: '#c0b090', sash: false, sleeves: false },
    // Earth tones from cheap local dyes
    { desc: 'patched wool qaba in earth tones', base: '#8a6b4f', accent: '#c8b892', sash: true, sleeves: true },
    { desc: 'rough wool qabāʾ in walnut brown', base: '#7a5a3f', accent: '#bfae8a', sash: true, sleeves: true },
    { desc: 'pomegranate-dyed thawb in dull tan', base: '#8f7656', accent: '#c8b892', sash: false, sleeves: false },
    { desc: 'mud-brown wool qaba', base: '#6b5343', accent: '#b8a880', sash: true, sleeves: true },
    // Rare colored pieces (hand-me-downs or lucky finds)
    { desc: 'faded indigo thawb', base: '#5a6e7a', accent: '#c8b892', sash: false, sleeves: false },
    { desc: 'madder-dyed qamis in brick red', base: '#8b5a4a', accent: '#d6c8a8', sash: true, sleeves: false },
    { desc: 'weld-dyed thawb in faded yellow-green', base: '#9a9858', accent: '#c8c0a0', sash: false, sleeves: false },
    { desc: 'faded turquoise thawb from a wealthy household', base: '#5a8a8a', accent: '#c8c0a0', sash: false, sleeves: false },
    { desc: 'sun-bleached green qamis of salvaged cloth', base: '#6a7a5a', accent: '#c8b892', sash: false, sleeves: false },
  ],
  [SocialClass.MERCHANT]: [
    // Quality local dyes
    { desc: 'dyed wool qaba in muted olive with a beige izar', base: '#6f6a3f', accent: '#e1d3b3', sash: true, sleeves: true },
    { desc: 'soft wool thawb in deep olive', base: '#5d5b2f', accent: '#cbb58c', sash: true, sleeves: true },
    { desc: 'pomegranate-brown qaba with woven trim', base: '#7a5a42', accent: '#d6c8a8', sash: true, sleeves: true },
    { desc: 'henna-dyed thawb in warm orange-brown', base: '#8b6844', accent: '#e3d2ad', sash: true, sleeves: true },
    { desc: 'madder-dyed thawb in russet red', base: '#8b4a3a', accent: '#e1d3b3', sash: true, sleeves: true },
    { desc: 'madder-dyed qaba in terracotta', base: '#a65a42', accent: '#d9c9a8', sash: true, sleeves: true },
    // Good quality basics
    { desc: 'well-kept linen thawb in warm tan', base: '#b89b6a', accent: '#d9c9a8', sash: true, sleeves: true },
    { desc: 'trimmed qaba with a woven izar', base: '#7b5a4a', accent: '#e3d2ad', sash: true, sleeves: true },
    { desc: 'fine linen thawb with patterned izar', base: '#a68c6a', accent: '#e3d2ad', sash: true, sleeves: true },
    // Imported dyes (sign of trade success)
    { desc: 'dyed wool qaba in slate blue', base: '#4a5a6b', accent: '#d9c9a8', sash: true, sleeves: true },
    { desc: 'indigo-dyed thawb in deep blue', base: '#3d4f5f', accent: '#c8b892', sash: true, sleeves: true },
    { desc: 'weld-and-indigo green qaba', base: '#4a5f4a', accent: '#d4c9a8', sash: true, sleeves: true },
    // Vibrant trade goods colors (showing wealth from trade)
    { desc: 'rich madder qaba in vivid red', base: '#a04040', accent: '#e3d2ad', sash: true, sleeves: true },
    { desc: 'lapis-blue thawb from Persian trade', base: '#3a5a8a', accent: '#d4c9a8', sash: true, sleeves: true },
    { desc: 'copper-henna qaba in warm orange', base: '#a06040', accent: '#e1d3b3', sash: true, sleeves: true },
    { desc: 'olive qaba with saffron-gold trim', base: '#5d5b2f', accent: '#d4a030', sash: true, sleeves: true },
    { desc: 'fine brown thawb with saffron sash', base: '#7a5a42', accent: '#d4a030', sash: true, sleeves: true },
  ],
  [SocialClass.CLERGY]: [
    // Austere, dark colors befitting religious scholars
    { desc: 'modest wool qaba in slate tones', base: '#4a4f59', accent: '#7a6f63', sash: false, sleeves: true },
    { desc: 'faded wool thawb in ash brown', base: '#5b5247', accent: '#9b8e7a', sash: false, sleeves: true },
    { desc: 'deep indigo qaba', base: '#2d3d4f', accent: '#9b8e7a', sash: false, sleeves: true },
    { desc: 'walnut-dyed qaba in near-black', base: '#2f2a25', accent: '#8a7f6f', sash: false, sleeves: true },
    { desc: 'dark charcoal wool thawb', base: '#3a3835', accent: '#9b8e7a', sash: false, sleeves: true },
    { desc: 'dark brown qaba with simple trim', base: '#4a3f35', accent: '#a08f78', sash: false, sleeves: true },
    // Clean, simple undyed for some orders
    { desc: 'undyed cream wool thawb', base: '#d4c9b8', accent: '#bfb39a', sash: false, sleeves: true },
    { desc: 'natural linen qaba in pale tan', base: '#c8bca0', accent: '#b8a888', sash: false, sleeves: true },
    // Occasional color for high-ranking ulama
    { desc: 'deep green qaba of a learned scholar', base: '#3a4f3a', accent: '#8a8068', sash: false, sleeves: true },
    { desc: 'rich brown qaba with indigo accents', base: '#4a3828', accent: '#4a5a6a', sash: false, sleeves: true },
    { desc: 'muted purple-brown thawb', base: '#4a3f4a', accent: '#9a8a7a', sash: false, sleeves: true },
    { desc: 'dignified black qaba', base: '#222220', accent: '#9a9080', sash: false, sleeves: true },
    // Distinguished scholars (rare)
    { desc: 'rich forest green qaba of a respected alim', base: '#2a5040', accent: '#9a8a7a', sash: false, sleeves: true },
    { desc: 'deep scholarly blue thawb with modest trim', base: '#2a3a5a', accent: '#a08f78', sash: false, sleeves: true },
  ],
  [SocialClass.NOBILITY]: [
    // Expensive imported dyes showing wealth
    { desc: 'kermes-crimson qabāʾ with gold trim', base: '#9a3428', accent: '#d4a965', sash: true, sleeves: true },
    { desc: 'deep kermes red thawb with tiraz', base: '#8a2820', accent: '#c8a858', sash: true, sleeves: true },
    { desc: 'rich indigo thawb with woven trim', base: '#2d415a', accent: '#cdbb9a', sash: true, sleeves: true },
    { desc: 'imperial purple qaba', base: '#4a2848', accent: '#c8b088', sash: true, sleeves: true },
    { desc: 'saffron-dyed qaba with tiraz bands', base: '#e0a83a', accent: '#3d3a34', sash: true, sleeves: true },
    { desc: 'bright saffron-gold thawb', base: '#d4a030', accent: '#4a4035', sash: true, sleeves: true },
    // Fine quality earth tones
    { desc: 'fine woven qaba with subtle embroidery', base: '#6a5b4a', accent: '#bfa57e', sash: true, sleeves: true },
    { desc: 'well-tailored thawb in rich cloth', base: '#70523f', accent: '#cbb58c', sash: true, sleeves: true },
    { desc: 'layered qaba with ornate trim', base: '#5c4a3f', accent: '#d0b992', sash: true, sleeves: true },
    // Status colors
    { desc: 'true black wool qabāʾ', base: '#1f1f1f', accent: '#a89878', sash: true, sleeves: true },
    { desc: 'midnight blue qaba with gold', base: '#1f2f3f', accent: '#c8a848', sash: true, sleeves: true },
    { desc: 'deep forest green qabāʾ', base: '#2a3f2a', accent: '#b8a878', sash: true, sleeves: true },
    { desc: 'rich burgundy thawb', base: '#5a2830', accent: '#c8b088', sash: true, sleeves: true },
    { desc: 'teal silk qaba with silver trim', base: '#2a4a4a', accent: '#c8c8c0', sash: true, sleeves: true },
    // Rare luxury dyes
    { desc: 'Tyrian violet qabāʾ of Phoenician dye', base: '#6a3a5a', accent: '#c8b088', sash: true, sleeves: true },
    { desc: 'Damascus rose thawb in soft pink-red', base: '#b05060', accent: '#d4c9a8', sash: true, sleeves: true },
    { desc: 'vivid madder-crimson qaba with gold', base: '#a83030', accent: '#d4a965', sash: true, sleeves: true },
  ],
};

/**
 * Ethnicity and Religion Color Preferences
 *
 * Historical clothing color preferences by ethnic and religious group in 1348 Damascus.
 * Returns weighted color preferences that filter the base social class options.
 */
interface ColorPreference {
  preferredHues: string[];  // Hex colors that should be weighted higher
  avoidedHues: string[];    // Hex colors that should be weighted lower
  weight: number;           // Multiplier for matching colors (1.0 = neutral)
}

const ETHNICITY_COLOR_PREFERENCES: Partial<Record<Ethnicity, ColorPreference>> = {
  'Persian': {
    preferredHues: ['#4a2848', '#6a3a5a', '#a83030', '#d4a030', '#2a5040'], // Purple, red, gold, deep green
    avoidedHues: [],
    weight: 2.5,
  },
  'Armenian': {
    preferredHues: ['#2d415a', '#3a5a8a', '#9a3428', '#d4a965'], // Deep blue, crimson, gold accents
    avoidedHues: ['#6a7a5a', '#5a8a8a'], // Avoid greens
    weight: 2.0,
  },
  'Venetian': {
    preferredHues: ['#9a3428', '#a83030', '#1f1f1f', '#4a2848'], // Venetian red, black, purple (status)
    avoidedHues: ['#d4a030', '#e0a83a'], // Avoid saffron/gold (Muslim merchant colors)
    weight: 2.5,
  },
  'Genoese': {
    preferredHues: ['#1f1f1f', '#2d3d4f', '#9a3428', '#4a5a6b'], // Black, navy, dark red
    avoidedHues: [],
    weight: 2.0,
  },
  'Maghrebi': {
    preferredHues: ['#d4a030', '#e0a83a', '#2d415a', '#3a5a8a'], // Saffron, gold, indigo blue
    avoidedHues: [],
    weight: 2.0,
  },
  'Kurdish': {
    preferredHues: ['#7a5a3f', '#8a6b4f', '#9a3428', '#2a5040'], // Earth tones, red accents, forest green
    avoidedHues: ['#4a2848', '#6a3a5a'], // Avoid purples (Persian association)
    weight: 1.5,
  },
  'Greek/Rum': {
    preferredHues: ['#2d415a', '#3a5a8a', '#1f2f3f', '#5a2830'], // Byzantine blues, burgundy
    avoidedHues: [],
    weight: 1.8,
  },
  'Coptic': {
    preferredHues: ['#2d3d4f', '#4a3f35', '#5b5247'], // Dark, austere colors (Christian minority)
    avoidedHues: ['#d4a030', '#e0a83a', '#9a3428'], // Avoid bright colors (modest)
    weight: 2.0,
  },
  'Indian': {
    preferredHues: ['#d4a030', '#a83030', '#3a5a8a', '#a06040'], // Saffron, red, blue, orange
    avoidedHues: [],
    weight: 2.0,
  },
};

const RELIGION_COLOR_PREFERENCES: Partial<Record<Religion, ColorPreference>> = {
  'Jewish': {
    preferredHues: ['#2d3d4f', '#4a3f35', '#2d415a', '#7a5a3f'], // Dark blues, browns (sumptuary laws)
    avoidedHues: ['#9a3428', '#a83030', '#d4a030', '#e0a83a'], // Avoid bright reds/gold (restricted)
    weight: 2.5,
  },
  'Eastern Orthodox': {
    preferredHues: ['#2d415a', '#3a5a8a', '#5a2830', '#4a3f35'], // Byzantine blues, burgundy, dark browns
    avoidedHues: ['#d4a030', '#e0a83a'], // Avoid saffron (Muslim association)
    weight: 2.0,
  },
  'Armenian Apostolic': {
    preferredHues: ['#2d415a', '#9a3428', '#4a3f35'], // Deep blue, Armenian red, dark brown
    avoidedHues: [],
    weight: 2.0,
  },
  'Syriac Orthodox': {
    preferredHues: ['#4a3f35', '#2d3d4f', '#7a5a3f'], // Dark browns, navy, earth tones (austere)
    avoidedHues: ['#9a3428', '#d4a030'], // Avoid bright colors
    weight: 2.0,
  },
  'Coptic Orthodox': {
    preferredHues: ['#2d3d4f', '#4a3f35', '#2d415a'], // Dark, conservative colors
    avoidedHues: ['#d4a030', '#e0a83a', '#9a3428'], // Avoid luxury colors
    weight: 2.5,
  },
  'Latin Christian': {
    preferredHues: ['#9a3428', '#1f1f1f', '#4a2848', '#4a5a6b'], // Merchant blacks, reds, purples
    avoidedHues: ['#d4a030', '#e0a83a'], // Avoid saffron (distinctly Islamic)
    weight: 2.0,
  },
  'Druze': {
    preferredHues: ['#1f1f1f', '#2f2a25', '#4a3f35', '#2d3d4f'], // Black, dark browns (religious requirement)
    avoidedHues: ['#9a3428', '#d4a030', '#e0a83a', '#4a2848'], // Avoid all bright/luxury colors
    weight: 3.0,
  },
};

/**
 * Filter and weight robe options based on ethnicity and religion
 * Returns same array but with culturally appropriate colors weighted higher in selection
 */
const getEthnicityWeightedRobes = (
  baseOptions: Array<{ desc: string; base: string; accent: string; sash: boolean; sleeves: boolean }>,
  ethnicity: Ethnicity,
  religion: Religion,
  rand: () => number
): { desc: string; base: string; accent: string; sash: boolean; sleeves: boolean } => {
  const ethnicPref = ETHNICITY_COLOR_PREFERENCES[ethnicity];
  const religionPref = RELIGION_COLOR_PREFERENCES[religion];

  // Calculate weighted scores for each option
  const weighted = baseOptions.map(option => {
    let score = 1.0;

    // Check ethnicity preferences
    if (ethnicPref) {
      const matchesPreferred = ethnicPref.preferredHues.some(hue =>
        colorDistance(option.base, hue) < 40 || colorDistance(option.accent, hue) < 40
      );
      const matchesAvoided = ethnicPref.avoidedHues.some(hue =>
        colorDistance(option.base, hue) < 40 || colorDistance(option.accent, hue) < 40
      );

      if (matchesPreferred) score *= ethnicPref.weight;
      if (matchesAvoided) score *= 0.3;
    }

    // Check religion preferences (stronger than ethnicity)
    if (religionPref) {
      const matchesPreferred = religionPref.preferredHues.some(hue =>
        colorDistance(option.base, hue) < 40 || colorDistance(option.accent, hue) < 40
      );
      const matchesAvoided = religionPref.avoidedHues.some(hue =>
        colorDistance(option.base, hue) < 40 || colorDistance(option.accent, hue) < 40
      );

      if (matchesPreferred) score *= religionPref.weight;
      if (matchesAvoided) score *= 0.2;
    }

    return { option, score };
  });

  // Calculate total weight
  const totalWeight = weighted.reduce((sum, w) => sum + w.score, 0);

  // Weighted random selection
  let randomValue = rand() * totalWeight;
  for (const { option, score } of weighted) {
    randomValue -= score;
    if (randomValue <= 0) return option;
  }

  // Fallback to last option
  return baseOptions[baseOptions.length - 1];
};

/**
 * Calculate perceptual distance between two hex colors
 * Using simplified RGB distance (good enough for color matching)
 */
const colorDistance = (hex1: string, hex2: string): number => {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);

  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

/**
 * Plague-Aware Clothing Modifications
 *
 * Modifies NPC clothing colors and accessories based on plague context.
 * - Mourning: Darkens colors to black/dark grey for NPCs from infected buildings
 * - Protective: Adds prayer beads, perfumed cloths for aware NPCs
 * - Performance: Color modifications only, no geometry changes
 */

export interface PlagueClothingContext {
  buildingHasDeceased?: boolean;      // NPC's building has deceased residents
  buildingHasInfected?: boolean;      // NPC's building has infected residents
  awarenessLevel?: number;            // 0-100, how aware NPC is of plague
  socialClass: SocialClass;
}

/**
 * Apply mourning colors to existing robe colors
 * Mourning protocol in 1348 Damascus: dark/black clothes for 3-40 days depending on relation
 */
export const applyMourningColors = (
  baseColor: string,
  accentColor: string,
  intensity: number = 1.0 // 0-1, how much to darken (1.0 = full mourning black)
): { base: string; accent: string } => {
  // Mourning colors: deep black to dark charcoal
  const mourningBase = '#1a1a1a';  // Near-black
  const mourningAccent = '#3a3a3a'; // Dark charcoal

  if (intensity >= 0.9) {
    // Full mourning (immediate family, < 1 week)
    return { base: mourningBase, accent: mourningAccent };
  } else if (intensity >= 0.5) {
    // Partial mourning (extended family, 1-2 weeks)
    return {
      base: lerpColor(baseColor, mourningBase, intensity),
      accent: lerpColor(accentColor, mourningAccent, intensity),
    };
  } else {
    // Light mourning or returning to normal
    return {
      base: darkenColor(baseColor, 0.6 + intensity * 0.2),
      accent: darkenColor(accentColor, 0.7 + intensity * 0.2),
    };
  }
};

/**
 * Determine if NPC should have protective accessories
 * Returns accessories that should be added based on plague awareness
 */
export const getPlagueProtectiveAccessories = (
  context: PlagueClothingContext,
  existingAccessories: string[]
): string[] => {
  const newAccessories = [...existingAccessories];

  // Prayer beads (tasbih) - more common during plague for religious comfort
  // Worn by Muslims when fearful or seeking protection
  if (context.awarenessLevel && context.awarenessLevel > 40) {
    if (!newAccessories.includes('prayer beads') && Math.random() > 0.6) {
      newAccessories.push('prayer beads');
    }
  }

  // Perfumed cloth - wealthy NPCs use to ward off "bad air" (miasma theory)
  if (
    context.socialClass === SocialClass.NOBILITY ||
    context.socialClass === SocialClass.MERCHANT
  ) {
    if (context.buildingHasInfected && !newAccessories.includes('perfumed cloth')) {
      if (Math.random() > 0.5) {
        newAccessories.push('perfumed cloth');
      }
    }
  }

  // Protective amulet - common across all classes during plague
  if (context.awarenessLevel && context.awarenessLevel > 60) {
    if (!newAccessories.includes('protective amulet') && Math.random() > 0.7) {
      newAccessories.push('protective amulet');
    }
  }

  return newAccessories;
};

/**
 * Linear interpolation between two hex colors
 */
const lerpColor = (color1: string, color2: string, t: number): string => {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Darken a hex color by a factor
 */
const darkenColor = (color: string, factor: number): string => {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PROFESSION_TAGS: Record<string, Array<'military' | 'cleric' | 'artisan' | 'service' | 'noble' | 'youth' | 'retired'>> = {
  // Unskilled Labor
  'Day-Laborer': ['service'],
  'Water-Carrier': ['service'],
  'Copyist': ['service'],
  'Tanner': ['artisan'],
  'Unemployed': ['service'],
  'Porter': ['service'],
  'Shepherd': ['service'],
  'Street Sweeper': ['service'],
  'Grave Digger': ['service'],
  'Rag Picker': ['service'],
  'Night Watchman': ['service'],
  'Stable Hand': ['service'],
  'Builder\'s Laborer': ['service'],
  // Military
  'City Guard': ['military'],
  'Mamluk Soldier': ['military'],
  'Mamluk Officer': ['noble', 'military'],
  'Retired Guard': ['military', 'retired'],
  // Commercial/Merchants
  'Spice Merchant': ['service'],
  'Silk Merchant': ['service'],
  'Rug Merchant': ['service'],
  'Draper': ['artisan'],
  'Baker': ['artisan'],
  'Blacksmith': ['artisan'],
  'Coppersmith': ['artisan'],
  'Weaver': ['artisan'],
  'Carpenter': ['artisan'],
  'Potter': ['artisan'],
  'Innkeeper': ['service'],
  'Khan Warden': ['service'],
  'Sherbet Seller': ['service'],
  'Sherbet House Keeper': ['service'],
  'Caravanserai Keeper': ['service'],
  // NEW: Added professions
  'Hakim': ['service'],            // Physician
  'Money Changer': ['service'],    // Sarraf
  'Goldsmith': ['artisan'],
  'Jeweler': ['artisan'],
  'Brass Worker': ['artisan'],
  'Wine Merchant': ['service'],    // Christian-only
  'Funduq Keeper': ['service'],
  'Commercial Agent': ['service'],
  'Pharmacist': ['service'],
  'Barber': ['service'],
  'Barber-Surgeon': ['service'],
  'Butcher': ['artisan'],
  'Fishmonger': ['service'],
  'Glazier': ['artisan'],
  'Glassblower': ['artisan'],
  'Soap Maker': ['artisan'],
  'Perfumer': ['artisan'],
  'Apothecary': ['service'],
  'Leather Worker': ['artisan'],
  'Locksmith': ['artisan'],
  'Oil Presser': ['artisan'],
  'Scribe': ['service'],
  // Islamic Clergy
  'Imam': ['cleric'],
  'Qadi': ['cleric'],
  'Mufti': ['cleric'],
  'Muezzin': ['cleric'],
  'Qur\'an Reciter': ['cleric'],
  'Madrasa Teacher': ['cleric'],
  'Qur\'an Teacher': ['cleric'],
  'Sufi Shaykh': ['cleric'],
  'Sufi Dervish': ['cleric'],
  'Zawiya Attendant': ['cleric', 'service'],
  // Nobility/Administration
  'Estate Steward': ['noble', 'service'],
  'Court Clerk': ['noble', 'service'],
  'Household Manager': ['noble', 'service'],
  'Tutor': ['noble', 'service'],
  // Textile Workers
  'Spinner': ['artisan'],
  'Dyer': ['artisan'],
  'Embroiderer': ['artisan'],
  'Tailor': ['artisan'],
  'Silk Winder': ['artisan'],
  'Felt Maker': ['artisan'],
  // Service Workers
  'Bread Seller': ['service'],
  'Servant': ['service'],
  'Water-Bearer': ['service'],
  'Laundry Worker': ['service'],
  'Launderer': ['service'],
  'Bath Attendant': ['service'],
  'Cook': ['service'],
  'Messenger': ['service'],
  'Textile Trader': ['service'],
  'Herbalist': ['artisan'],
  // Female-specific professions
  'Midwife': ['service'],
  'Birth Attendant': ['service'],
  'Washer of the Dead': ['service'],
  'Bathhouse Attendant': ['service'],
  'Professional Mourner': ['service'],
  'Matchmaker': ['service'],
  'Wet Nurse': ['service'],
  'Henna Artist': ['artisan'],
  'Dyer\'s Assistant': ['artisan'],
  'Charity Worker': ['service'],
  // Transport
  'Donkey Driver': ['service'],
  'Camel Driver': ['service'],
  'Muleteer': ['service'],
  // Construction
  'Mason': ['artisan'],
  'Plasterer': ['artisan'],
  'Whitewasher': ['artisan'],
  'Brick Maker': ['artisan'],
  'Tile Maker': ['artisan'],
  // Other Artisans
  'Cobbler': ['artisan'],
  'Rope Maker': ['artisan'],
  'Mat Weaver': ['artisan'],
  'Basket Maker': ['artisan'],
  'Woodcarver': ['artisan'],
  // Youth/Apprentices
  'Apprentice Tanner': ['youth', 'artisan'],
  'Apprentice Potter': ['youth', 'artisan'],
  'Apprentice Carpenter': ['youth', 'artisan'],
  'Apprentice Shepherd': ['youth', 'service'],
  'Apprentice Draper': ['youth', 'artisan'],
  'Apprentice Coppersmith': ['youth', 'artisan'],
  'Apprentice Dyer': ['youth', 'artisan'],
  'Apprentice Weaver': ['youth', 'artisan'],
  'Apprentice Spinner': ['youth', 'artisan'],
  'Errand Runner': ['youth', 'service'],
  'Household Helper': ['youth', 'service'],
  'Laundry Helper': ['youth', 'service'],
  'Novice Student': ['youth', 'cleric'],
  'Madrasa Student': ['youth', 'cleric'],
  'Page': ['youth', 'noble'],
  'Household Apprentice': ['youth', 'noble'],
  'Tutor\'s Assistant': ['youth', 'noble'],
};

const PROFESSION_RULES: Record<string, { minAge?: number; maxAge?: number; gender?: 'Male' | 'Female'; classes?: SocialClass[] }> = {
  'Retired Guard': { minAge: 45, gender: 'Male' },
  'City Guard': { minAge: 18, maxAge: 45, gender: 'Male' },
  'Mamluk Soldier': { minAge: 18, maxAge: 45, gender: 'Male' },
  'Mamluk Officer': { minAge: 25, gender: 'Male', classes: [SocialClass.NOBILITY] },
  'Imam': { minAge: 25, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Qadi': { minAge: 30, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Mufti': { minAge: 35, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Muezzin': { minAge: 18, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Qur\'an Reciter': { minAge: 18, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Madrasa Teacher': { minAge: 25, gender: 'Male', classes: [SocialClass.CLERGY] },
  'Court Clerk': { minAge: 22, classes: [SocialClass.NOBILITY] },
  'Estate Steward': { minAge: 25, classes: [SocialClass.NOBILITY] },
  'Household Manager': { minAge: 25, gender: 'Female', classes: [SocialClass.NOBILITY] },
  'Tutor': { minAge: 20, classes: [SocialClass.NOBILITY] },
  'Midwife': { minAge: 18, gender: 'Female' },
  'Charity Worker': { minAge: 18, gender: 'Female', classes: [SocialClass.CLERGY] },
};

const YOUTH_PROFESSIONS: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
  [SocialClass.PEASANT]: {
    Male: ['Errand Runner', 'Apprentice Tanner', 'Apprentice Potter', 'Apprentice Carpenter', 'Apprentice Shepherd'],
    Female: ['Household Helper', 'Apprentice Weaver', 'Apprentice Spinner', 'Laundry Helper'],
  },
  [SocialClass.MERCHANT]: {
    Male: ['Errand Runner', 'Apprentice Draper', 'Apprentice Coppersmith', 'Apprentice Weaver'],
    Female: ['Household Helper', 'Apprentice Weaver', 'Apprentice Dyer'],
  },
  [SocialClass.CLERGY]: {
    Male: ['Novice Student', 'Errand Runner'],
    Female: ['Household Helper'],
  },
  [SocialClass.NOBILITY]: {
    Male: ['Page', 'Household Apprentice'],
    Female: ['Household Apprentice', 'Tutor\'s Assistant'],
  },
};

const isEligible = (profession: string, age: number, gender: 'Male' | 'Female', socialClass: SocialClass) => {
  const rules = PROFESSION_RULES[profession];
  if (!rules) return true;
  if (rules.gender && rules.gender !== gender) return false;
  if (rules.minAge !== undefined && age < rules.minAge) return false;
  if (rules.maxAge !== undefined && age > rules.maxAge) return false;
  if (rules.classes && !rules.classes.includes(socialClass)) return false;
  return true;
};

const chooseProfession = (
  pool: string[],
  age: number,
  gender: 'Male' | 'Female',
  socialClass: SocialClass,
  rand: () => number
) => {
  if (age < 16) {
    const youthPool = YOUTH_PROFESSIONS[socialClass][gender];
    return youthPool[Math.floor(rand() * youthPool.length)];
  }
  const filtered = pool.filter((p) => isEligible(p, age, gender, socialClass));
  const pickPool = filtered.length > 0 ? filtered : pool;
  if (age >= 50) {
    const elderPool = pickPool.filter((p) => PROFESSION_TAGS[p]?.includes('retired'));
    if (elderPool.length > 0) {
      return elderPool[Math.floor(rand() * elderPool.length)];
    }
  }
  return pickPool[Math.floor(rand() * pickPool.length)];
};

// Helper to check if a religion can hold a profession
const isMuslim = (religion: Religion): boolean =>
  religion === 'Sunni Islam' || religion === 'Shia Islam' || religion === 'Ismaili';

// Professions that require being Muslim (historical dhimmi restrictions)
const MUSLIM_ONLY_PROFESSIONS = [
  'Imam', 'Qadi', 'Mufti', 'Muezzin', 'Qur\'an Reciter', 'Madrasa Teacher',
  'City Guard', 'Mamluk Soldier', 'Mamluk Officer', 'Mamluk Governor',
  'Court Qadi', 'Market Inspector', 'Friday Mosque Imam', 'Madrasa Director', 'Shaykh', 'Shrine Keeper',
  'Sufi Shaykh', 'Sufi Dervish', 'Zawiya Attendant', 'Qur\'an Teacher'
];

// Professions with strong Jewish occupational clustering (historically documented)
// Jews in medieval Damascus were concentrated in specific trades
const JEWISH_WEIGHTED_PROFESSIONS = [
  'Dyer',             // Indigo/purple dyeing was heavily Jewish
  'Hakim',            // Jewish physicians served Muslim courts
  'Goldsmith',        // Jewish specialty
  'Money Changer',    // Sarraf - Jewish specialty
  'Jeweler',          // Precious metals
  'Silk Merchant',    // Significant Jewish presence
  'Pharmacist',       // Medicine-adjacent
  'Glassblower',      // Artisan trade
];

// Professions only Christians can do (forbidden to Muslims)
const CHRISTIAN_ONLY_PROFESSIONS = [
  'Wine Merchant',    // Wine trade forbidden to Muslims
];

// Apply Jewish occupational weighting
const applyJewishOccupationalWeighting = (
  pool: string[],
  religion: Religion,
  rand: () => number
): string[] => {
  if (religion !== 'Jewish' && religion !== 'Samaritan') return pool;

  // 40% chance to select from Jewish-weighted professions if available
  if (rand() < 0.4) {
    const jewishProfessions = pool.filter(p => JEWISH_WEIGHTED_PROFESSIONS.includes(p));
    if (jewishProfessions.length > 0) {
      return jewishProfessions;
    }
  }
  return pool;
};

export const generateNPCStats = (seed: number, context?: { districtType?: DistrictType }): NPCStats => {
  let s = seed;
  const rand = () => seededRandom(s++);

  const gender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';
  const age = Math.floor(rand() * 50) + 12;
  const districtType = context?.districtType;

  // Step 1: Determine social class based on district
  const classRand = rand();
  let socialClass = SocialClass.PEASANT;
  if (districtType === 'WEALTHY') {
    if (classRand > 0.7) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.35) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.2) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'HOVELS') {
    if (classRand > 0.995) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.95) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.9) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'CIVIC') {
    if (classRand > 0.82) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.6) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.4) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'MARKET') {
    if (classRand > 0.96) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.45) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.3) socialClass = SocialClass.CLERGY;
  } else if (districtType === 'ALLEYS' || districtType === 'JEWISH_QUARTER') {
    if (classRand > 0.985) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.8) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.65) socialClass = SocialClass.CLERGY;
  } else {
    if (classRand > 0.95) socialClass = SocialClass.NOBILITY;
    else if (classRand > 0.7) socialClass = SocialClass.MERCHANT;
    else if (classRand > 0.6) socialClass = SocialClass.CLERGY;
  }

  // Step 2: Assign demographics BEFORE profession (fixes religion/profession mismatch)
  // For clergy class, we force Muslim religion since non-Muslims can't hold religious positions
  const preliminaryDemographics = assignDemographics(rand, { districtType, socialClass, gender });
  let { ethnicity, religion, language } = preliminaryDemographics;

  // If assigned to CLERGY class but rolled non-Muslim religion, reassign to MERCHANT class
  // (Non-Muslims couldn't hold Islamic religious positions)
  if (socialClass === SocialClass.CLERGY && !isMuslim(religion)) {
    socialClass = SocialClass.MERCHANT;
  }

  // If assigned to NOBILITY class (which includes military) but non-Muslim, reassign
  // (Mamluks and government positions required being Muslim)
  if (socialClass === SocialClass.NOBILITY && !isMuslim(religion)) {
    socialClass = SocialClass.MERCHANT;
  }

  // Step 3: Build profession pools with religion-appropriate options
  const professionPoolsByClass: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
    [SocialClass.PEASANT]: {
      Male: ['Day-Laborer', 'Water-Carrier', 'Tanner', 'Copyist', 'Porter', 'Shepherd', 'Scribe'],
      Female: FEMALE_PROFESSIONS.filter(p => !['Matchmaker', 'Midwife'].includes(p)), // Basic female professions
    },
    [SocialClass.MERCHANT]: {
      Male: COMMERCIAL_PROFESSIONS,
      Female: ['Midwife', 'Matchmaker', 'Henna Artist', 'Silk Winder', 'Embroiderer', 'Dyer', 'Spinner'],
    },
    [SocialClass.CLERGY]: {
      Male: CLERGY_PROFESSIONS,
      Female: ['Washer of the Dead', 'Charity Worker'], // Limited religious roles for women
    },
    [SocialClass.NOBILITY]: {
      Male: ['Estate Steward', 'Court Clerk', 'Mamluk Officer'],
      Female: ['Household Manager', 'Tutor', 'Wet Nurse'],
    },
  };

  // Step 4: Choose profession (now religion-validated)
  // Filter out Muslim-only professions for non-Muslims
  let professionPool = professionPoolsByClass[socialClass][gender];
  if (!isMuslim(religion)) {
    professionPool = professionPool.filter(p => !MUSLIM_ONLY_PROFESSIONS.includes(p));
  }

  // Filter out Christian-only professions for Muslims
  if (isMuslim(religion)) {
    professionPool = professionPool.filter(p => !CHRISTIAN_ONLY_PROFESSIONS.includes(p));
  }

  // Apply Jewish occupational clustering
  professionPool = applyJewishOccupationalWeighting(professionPool, religion, rand);

  const profession = chooseProfession(professionPool, age, gender, socialClass, rand);

  // Step 5: Generate ethnicity-appropriate name AFTER demographics are finalized
  const name = generateName(rand, gender, ethnicity, religion);

  const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(profession);
  const isSoldier = /Guard|Soldier|Mamluk/i.test(profession);
  const isOfficer = /Officer/i.test(profession);
  const isMerchant = /(Merchant|Draper|Trader|Khan|Caravanserai|Innkeeper|Sherbet)/i.test(profession);
  const isLaborer = /(Day-Laborer|Water-Carrier|Tanner|Porter|Unemployed|Bread Seller|Laundry|Servant|Water-Bearer)/i.test(profession);
  const isArtisan = /(Blacksmith|Coppersmith|Weaver|Carpenter|Potter|Dyer|Tanner)/i.test(profession);
  const isBlacksmith = /Blacksmith/i.test(profession);
  const isBaker = /Baker/i.test(profession);
  const isCarpenter = /Carpenter/i.test(profession);
  const isShepherd = /Shepherd/i.test(profession);

  // Height and weight scales
  const heightBase = age < 18 ? 0.6 + (age / 18) * 0.3 : 0.9 + rand() * 0.2;
  const weightBase = rand() * 0.4 + 0.8;
  const robeSpreadBase = socialClass === SocialClass.NOBILITY ? 1.08
    : socialClass === SocialClass.MERCHANT ? 1.0
    : socialClass === SocialClass.CLERGY ? 0.95
    : 0.9;
  const robeSpread = gender === 'Female'
    ? (() => {
        const roll = rand();
        const narrowBias = socialClass === SocialClass.PEASANT ? 0.7 : socialClass === SocialClass.MERCHANT ? 0.6 : socialClass === SocialClass.NOBILITY ? 0.45 : 0.55;
        const wideBias = socialClass === SocialClass.NOBILITY ? 0.18 : 0.08;
        if (roll < narrowBias) {
          const extraNarrow = rand() < 0.6;
          return extraNarrow
            ? clamp(0.52 + rand() * 0.12 + (weightBase - 0.8) * 0.12, 0.5, 0.7)
            : clamp(0.62 + rand() * 0.16 + (weightBase - 0.8) * 0.18, 0.58, 0.85);
        }
        if (roll > 1 - wideBias) {
          return clamp(1.02 + rand() * 0.2 + (weightBase - 0.8) * 0.35, 0.95, 1.25);
        }
        return clamp(0.78 + rand() * 0.16 + (weightBase - 0.8) * 0.2, 0.72, 1.0);
      })()
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.4 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.75 : 0.4);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric' = (() => {
    if (rand() > 0.75) {
      // Pattern pools vary by social class - expensive patterns for wealthy
      const patternPool: Array<'stripe' | 'chevron' | 'damask' | 'ikat' | 'tiraz' | 'geometric'> =
        socialClass === SocialClass.NOBILITY
          ? ['damask', 'tiraz', 'geometric', 'ikat', 'stripe'] // Wealthy: fine patterns
          : socialClass === SocialClass.MERCHANT
            ? ['stripe', 'ikat', 'damask', 'chevron'] // Merchants: some fine patterns
            : socialClass === SocialClass.CLERGY
              ? ['geometric', 'tiraz', 'stripe'] // Clergy: restrained geometric
              : ['stripe', 'chevron']; // Peasants: simple patterns only
      const pick = patternPool[Math.floor(rand() * patternPool.length)];
      return pick;
    }
    return 'none';
  })();
  let sleeveCoverage: 'full' | 'lower' | 'none' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.35 ? 'full' : 'lower')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.45 ? 'full' : 'lower')
    : socialClass === SocialClass.CLERGY ? (rand() > 0.5 ? 'full' : 'lower')
    : rand() > 0.7 ? 'none' : 'lower';

  // Use ethnicity/religion-weighted color selection
  const robePickBase = getEthnicityWeightedRobes(
    ROBE_OPTIONS_BY_CLASS[socialClass],
    ethnicity,
    religion,
    rand
  );
  const robePick = {
    ...robePickBase,
    base: adjustHex(robePickBase.base, 0.94 + rand() * 0.12),
    accent: adjustHex(robePickBase.accent, 0.9 + rand() * 0.18)
  };
  const robeHasSash = robePick.sash || (isMerchant && rand() > 0.45) || (socialClass === SocialClass.NOBILITY && rand() > 0.3);
  const robePatternScale = 2.4 + rand() * 2.8;
  const sashPattern: 'none' | 'stripe' = robeHasSash && rand() > (socialClass === SocialClass.NOBILITY ? 0.4 : 0.55) ? 'stripe' : 'none';

  const hairStyle: 'short' | 'medium' | 'long' | 'covered' = gender === 'Female'
    ? 'covered'
    : (age > 45 ? (rand() > 0.6 ? 'short' : 'medium')
      : profession.includes('Laborer') || profession.includes('Porter') || profession.includes('Guard')
        ? (rand() > 0.7 ? 'medium' : 'short')
        : socialClass === SocialClass.NOBILITY ? (rand() > 0.4 ? 'medium' : 'long')
        : socialClass === SocialClass.CLERGY ? (rand() > 0.6 ? 'short' : 'medium')
        : rand() > 0.5 ? 'medium' : 'short');
  let headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none' = gender === 'Female'
    ? 'scarf'
    : (() => {
        const roll = rand();
        if (roll < 0.15) return 'fez';
        if (roll < 0.25 && socialClass === SocialClass.PEASANT) return 'straw';
        if (roll < 0.45) return 'taqiyah'; // Common simple skullcap
        if (socialClass === SocialClass.NOBILITY) return rand() > 0.3 ? 'turban' : 'cap';
        if (socialClass === SocialClass.CLERGY) return rand() > 0.5 ? 'turban' : 'taqiyah';
        return rand() > 0.5 ? 'cap' : rand() > 0.7 ? 'turban' : 'none';
      })();
  let footwearStyle: 'sandals' | 'shoes' | 'bare' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.2 ? 'shoes' : 'sandals')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.3 ? 'shoes' : 'sandals')
    : rand() > 0.8 ? 'bare' : 'sandals';
  let footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  const applyFootwear = (style: 'sandals' | 'shoes' | 'bare') => {
    footwearStyle = style;
    footwearColor = style === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  };

  if (districtType === 'HOVELS') {
    robePattern = 'none';
  } else if (districtType === 'WEALTHY' && robePattern === 'none') {
    robePattern = gender === 'Female' ? (rand() > 0.5 ? 'damask' : 'stripe') : 'stripe';
  } else if (districtType === 'MARKET' && robePattern === 'none' && rand() > 0.6) {
    robePattern = 'stripe';
  }

  if (isReligiousLeader) {
    headwearStyle = 'turban';
    robePattern = 'none';
    sleeveCoverage = 'full';
    applyFootwear('shoes');
  } else if (isSoldier) {
    headwearStyle = isOfficer ? 'turban' : 'cap';
    robePattern = isOfficer ? 'stripe' : robePattern;
    sleeveCoverage = 'full';
    applyFootwear('shoes');
  } else if (isMerchant) {
    // Only change headwear for men - women keep their scarf/head covering
    if (gender === 'Male') headwearStyle = 'fez';
    if (rand() > 0.6 && robePattern === 'none') robePattern = 'stripe';
  } else if (isLaborer) {
    // Only change headwear for men - women keep their scarf/head covering
    if (gender === 'Male') headwearStyle = rand() > 0.6 ? 'cap' : 'none';
    sleeveCoverage = rand() > 0.4 ? 'lower' : 'none';
  } else if (isArtisan) {
    // Only change headwear for men - women keep their scarf/head covering
    if (gender === 'Male') headwearStyle = rand() > 0.7 ? 'cap' : 'none';
  }

  if (!isReligiousLeader && !isSoldier && gender === 'Male') {
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

  const headwearPalette = headwearStyle === 'turban'
    ? ['#e8dfcf', '#cbb48a', '#8b2e2e', '#3f5d7a', '#1f1f1f']
    : headwearStyle === 'fez'
      ? ['#8b2e2e', '#7b5a4a', '#1f1f1f']
      : headwearStyle === 'taqiyah'
        ? ['#3a3a3a', '#1f1f1f', '#5a4a3a']
        : headwearStyle === 'straw'
          ? ['#cbb48a', '#d6c2a4']
          : ['#cbb48a', '#7b5a4a', '#1f1f1f'];
  const headwearColor = headwearPalette[Math.floor(rand() * headwearPalette.length)];

  // Hair color with age-based graying
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626', '#3a2c22'];
  const baseHairColor = hairPalette[Math.floor(rand() * hairPalette.length)];
  const hairColor = getAgedHairColor(baseHairColor, age, rand);

  // Facial hair for men (historically, beards were common in medieval Damascus)
  const facialHair: NPCStats['facialHair'] = gender === 'Male' ? (() => {
    // Young men (under 20) typically clean-shaven or stubble
    if (age < 20) return rand() > 0.7 ? 'stubble' : 'none';
    // Religious leaders almost always have beards
    if (isReligiousLeader) return rand() > 0.2 ? 'full_beard' : 'short_beard';
    // Soldiers often have mustaches or short beards
    if (isSoldier) return rand() > 0.5 ? 'mustache' : (rand() > 0.5 ? 'short_beard' : 'stubble');
    // Older men more likely to have beards
    if (age > 40) {
      const roll = rand();
      if (roll < 0.35) return 'full_beard';
      if (roll < 0.6) return 'short_beard';
      if (roll < 0.8) return 'goatee';
      return 'stubble';
    }
    // General adult men
    const roll = rand();
    if (roll < 0.15) return 'full_beard';
    if (roll < 0.35) return 'short_beard';
    if (roll < 0.5) return 'goatee';
    if (roll < 0.7) return 'mustache';
    if (roll < 0.85) return 'stubble';
    return 'none';
  })() : 'none';

  const accessoryPool = gender === 'Female'
    ? (socialClass === SocialClass.NOBILITY
      ? ['bronze earrings', 'copper bracelet', 'small nose ring', 'etched bracelet']
      : ['bronze earrings', 'copper bracelet'])
    : (socialClass === SocialClass.NOBILITY
      ? ['leather belt pouch', 'woven sash', 'bronze ring']
      : ['leather belt pouch', 'woven sash']);
  const accessories = [
    rand() > 0.6 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none',
    rand() > 0.7 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none'
  ].filter(a => a !== 'none');

  const heldItem: NPCStats['heldItem'] = (() => {
    if (isShepherd) return 'staff';
    if (isBlacksmith) return 'hammer';
    if (/Water-Carrier|Water-Bearer/i.test(profession)) return 'waterskin';
    if (isMerchant) return 'ledger';
    if (isSoldier) return 'spear';
    if (isBaker) return 'tray';
    if (isCarpenter) return 'plank';
    if (/Porter/i.test(profession)) return 'sack';
    return 'none';
  })();

  const goalOfDay = (() => {
    if (isReligiousLeader) return 'Lead prayers and receive petitions.';
    if (isSoldier) return isOfficer ? 'Inspect the patrol routes.' : 'Keep watch on the streets.';
    if (isMerchant) return 'Secure new stock for the market stalls.';
    if (isArtisan) return 'Complete commissions before dusk.';
    if (/Water-Carrier|Water-Bearer/i.test(profession)) return 'Deliver fresh water to households.';
    if (/Baker/i.test(profession)) return 'Prepare bread for the morning rush.';
    if (/Porter/i.test(profession)) return 'Carry goods between the souq and homes.';
    if (/Shepherd/i.test(profession)) return 'Tend the flock beyond the walls.';
    return 'Attend to daily duties in the neighborhood.';
  })();

  // Generate disposition (baseline personality/friendliness)
  // Profession can slightly modify disposition
  let disposition = generateDisposition(rand);
  // Service workers dealing with public tend to be slightly more personable
  if (/Innkeeper|Sherbet|Baker|Bread Seller/i.test(profession)) disposition = Math.min(100, disposition + 10);
  // Military tends to be more reserved/stern
  if (isSoldier) disposition = Math.max(0, disposition - 15);
  // Clergy can vary but often formal
  if (isReligiousLeader) disposition = Math.min(100, Math.max(20, disposition)); // Not too unfriendly

  // Mood derived from disposition
  const mood = getMoodFromDisposition(disposition, rand);

  // Initial morale values - slightly randomized with profession/class modifiers
  // Merchants hear rumors first (trade networks), clergy are calmer
  const baseAwareness = Math.floor(rand() * 12);
  const awarenessModifier = isMerchant ? 8 : isReligiousLeader ? -3 : 0;
  const awarenessLevel = Math.max(0, Math.min(100, baseAwareness + awarenessModifier));

  // Initial panic is 0-10, modified by disposition (higher disposition = calmer)
  const basePanic = Math.floor(rand() * 10);
  const dispositionPanicReduction = Math.floor(disposition / 20); // 0-5 reduction based on disposition
  const panicLevel = Math.max(0, Math.min(100, basePanic - dispositionPanicReduction));

  return {
    id: `npc-${seed}`,
    name,
    age,
    gender,
    profession,
    socialClass,
    ethnicity,
    religion,
    language,
    height: heightBase,
    weight: weightBase,
    disposition,
    mood,
    awarenessLevel,
    panicLevel,
    robeSpread,
    robeHasTrim,
    robeHemBand,
    robeOverwrap,
    robePattern,
    robeBaseColor: robePick.base,
    robeAccentColor: robePick.accent,
    robeHasSash,
    robePatternScale,
    sashPattern,
    hairStyle,
    hairColor,
    facialHair,
    headwearStyle,
    headwearColor,
    sleeveCoverage,
    footwearStyle,
    footwearColor,
    heldItem,
    accessories,
    goalOfDay,
  };
};

export const generatePlayerStats = (
  seed: number,
  context?: { districtType?: DistrictType }
): Omit<PlayerStats, 'currency' | 'inventory' | 'maxInventorySlots' | 'plague'> => {
  let s = seed * 7 + 13;
  const rand = () => seededRandom(s++);

  const gender: 'Male' | 'Female' = rand() > 0.52 ? 'Male' : 'Female';
  const classRoll = rand();
  let socialClass = SocialClass.PEASANT;
  if (classRoll > 0.96) socialClass = SocialClass.NOBILITY;
  else if (classRoll > 0.75) socialClass = SocialClass.MERCHANT;
  else if (classRoll > 0.62) socialClass = SocialClass.CLERGY;

  const age = Math.floor(rand() * 35) + 16;

  // Step 1: Assign demographics BEFORE profession (same pattern as NPC generation)
  const preliminaryDemographics = assignDemographics(rand, { districtType: context?.districtType, socialClass, gender });
  let { ethnicity, religion, language } = preliminaryDemographics;

  // If assigned to CLERGY class but rolled non-Muslim religion, reassign to MERCHANT class
  if (socialClass === SocialClass.CLERGY && !isMuslim(religion)) {
    socialClass = SocialClass.MERCHANT;
  }

  // If assigned to NOBILITY class but non-Muslim, reassign to MERCHANT
  if (socialClass === SocialClass.NOBILITY && !isMuslim(religion)) {
    socialClass = SocialClass.MERCHANT;
  }

  // Step 2: Generate ethnicity-appropriate name
  const name = generateName(rand, gender, ethnicity, religion);

  // Levantine/Mediterranean skin tones - olive to light brown
  // Hue 24-34 (warm beige-orange), Saturation 25-42%, Lightness 48-66%
  const skinLightness = 48 + Math.round(rand() * 18); // 48-66% - mostly olive to light brown
  const skinSaturation = 25 + Math.round(rand() * 17); // 25-42%
  const skinHue = 24 + Math.round(rand() * 10); // 24-34 warm undertone
  const skinTone = `hsl(${skinHue}, ${skinSaturation}%, ${skinLightness}%)`;
  const skinDescriptions = ['olive-toned complexion', 'fair olive skin', 'warm wheat-brown skin', 'light bronze complexion', 'sun-kissed olive skin'];
  const hairDescriptions = ['black hair', 'deep brown hair', 'dark chestnut hair'];
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
  const baseHairColor = hairPalette[Math.floor(rand() * hairPalette.length)];
  // Apply age-based graying (gray/white hair increases with age)
  const hairColor = getAgedHairColor(baseHairColor, age, rand);

  // Step 3: Build profession pools (religion-validated)
  const professionPoolsByClass: Record<SocialClass, Record<'Male' | 'Female', string[]>> = {
    [SocialClass.PEASANT]: {
      Male: ['Water-Carrier', 'Day-Laborer', 'Tanner', 'Porter', 'Potter', 'City Guard'],
      Female: ['Spinner', 'Bread Seller', 'Servant', 'Water-Bearer', 'Laundry Worker'],
    },
    [SocialClass.MERCHANT]: {
      Male: ['Spice Merchant', 'Draper', 'Coppersmith', 'Weaver', 'Carpenter'],
      Female: ['Textile Trader', 'Herbalist', 'Midwife', 'Dyer\'s Assistant', 'Bread Seller'],
    },
    [SocialClass.CLERGY]: {
      Male: ['Imam', 'Qadi', 'Mufti', 'Muezzin', 'Qur\'an Reciter', 'Madrasa Teacher'],
      Female: ['Charity Worker'],
    },
    [SocialClass.NOBILITY]: {
      Male: ['Estate Steward', 'Court Clerk', 'Mamluk Officer'],
      Female: ['Household Manager', 'Tutor'],
    },
  };

  // Filter out Muslim-only professions for non-Muslims
  let professionPool = professionPoolsByClass[socialClass][gender];
  if (!isMuslim(religion)) {
    professionPool = professionPool.filter(p => !MUSLIM_ONLY_PROFESSIONS.includes(p));
  }
  const profession = chooseProfession(professionPool, age, gender, socialClass, rand);
  const isReligiousLeader = /Imam|Qadi|Mufti|Muezzin|Qur'an|Madrasa/i.test(profession);
  const isSoldier = /Guard|Soldier|Mamluk/i.test(profession);
  const isOfficer = /Officer/i.test(profession);
  const isMerchant = /(Merchant|Draper|Trader|Coppersmith|Weaver|Carpenter|Herbalist|Midwife|Dyer)/i.test(profession);
  const isLaborer = /(Day-Laborer|Water-Carrier|Tanner|Porter|Bread Seller|Laundry|Servant|Water-Bearer)/i.test(profession);

  // Use ethnicity/religion-weighted color selection
  const robePickBase = getEthnicityWeightedRobes(
    ROBE_OPTIONS_BY_CLASS[socialClass],
    ethnicity,
    religion,
    rand
  );
  let robePick = {
    ...robePickBase,
    base: adjustHex(robePickBase.base, 0.94 + rand() * 0.12),
    accent: adjustHex(robePickBase.accent, 0.9 + rand() * 0.18)
  };

  let headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none' = gender === 'Female'
    ? 'scarf'
    : (() => {
        const roll = rand();
        if (roll < 0.15) return 'fez';
        if (roll < 0.25 && socialClass === SocialClass.PEASANT) return 'straw';
        if (roll < 0.45) return 'taqiyah'; // Common simple skullcap
        if (socialClass === SocialClass.NOBILITY) return rand() > 0.3 ? 'turban' : 'cap';
        if (socialClass === SocialClass.CLERGY) return rand() > 0.5 ? 'turban' : 'taqiyah';
        return rand() > 0.5 ? 'cap' : rand() > 0.7 ? 'turban' : 'none';
      })();
  // Only override headwear for men - women keep their scarf/head covering
  if (isReligiousLeader && gender === 'Male') {
    headwearStyle = 'turban';
  } else if (isSoldier && gender === 'Male') {
    headwearStyle = isOfficer ? 'turban' : 'cap';
  }

  const headwearByGender = gender === 'Female'
    ? [
        { desc: 'linen khimar in faded cloth', color: '#c2a878' },
        { desc: 'cotton milhafa with a soft wrap', color: '#d6c2a4' },
        { desc: 'light khimar with a simple band', color: '#c7b08c' }
      ]
    : [
        { desc: 'deep red imamah (turban) with white striping', color: '#8b2e2e' },
        { desc: 'dark indigo imamah with pale striping', color: '#3f5d7a' },
        { desc: 'black wool headwrap with white banding', color: '#1f1f1f' },
        { desc: 'brown wool imamah with lighter wrap', color: '#7b5a4a' },
        { desc: 'tan cotton headwrap in plain weave', color: '#cbb48a' },
        { desc: 'brown wool imamah with pale striping', color: '#7b5a4a' }
      ];
  let headwearPick = headwearByGender[Math.floor(rand() * headwearByGender.length)];
  if (gender === 'Male') {
    if (headwearStyle === 'fez') {
      headwearPick = rand() > 0.5
        ? { desc: 'felt fez cap in deep red', color: '#8b2e2e' }
        : { desc: 'felt fez cap in pale tan', color: '#cbb48a' };
    } else if (headwearStyle === 'straw') {
      headwearPick = { desc: 'woven straw brimmed cap', color: '#cbb48a' };
    }
  }
  if (isReligiousLeader) {
    headwearPick = { desc: 'white imamah (turban) in fine cotton', color: '#e8dfcf' };
  } else if (isSoldier) {
    headwearPick = isOfficer
      ? { desc: 'deep red imamah with pale striping', color: '#8b2e2e' }
      : { desc: 'dark wool cap with a narrow band', color: '#3a3a3a' };
  }
  if (!isReligiousLeader && !isSoldier && gender === 'Male') {
    if (religion === 'Eastern Orthodox' || religion === 'Syriac Orthodox' || religion === 'Armenian Apostolic') {
      headwearStyle = rand() > 0.6 ? 'none' : 'cap';
      headwearPick = { desc: 'plain linen cap', color: '#5a4a3a' };
    } else if (religion === 'Jewish') {
      headwearStyle = rand() > 0.5 ? 'cap' : 'taqiyah';
      headwearPick = { desc: 'simple skullcap in dark cloth', color: '#3a3a3a' };
    } else if (religion === 'Druze') {
      headwearStyle = rand() > 0.5 ? 'turban' : 'cap';
      headwearPick = { desc: 'dark indigo imamah', color: '#3f5d7a' };
    } else if (religion === 'Shia Islam' && headwearStyle === 'cap' && rand() > 0.6) {
      headwearStyle = 'turban';
      headwearPick = { desc: 'white-wrapped turban', color: '#e8dfcf' };
    }
  }

  const healthHistoryOptions = [
    'survived a childhood fever',
    'recovering from a winter cough',
    'no notable illnesses recorded',
    'scarred from a market accident',
    'often troubled by sleeplessness'
  ];
  const clothing = [
    robePick.desc,
    headwearPick.desc,
    rand() > 0.7 ? 'a thin leather belt' : 'a simple cord belt'
  ];

  const strength = 6 + Math.floor(rand() * 10) + (profession.includes('Laborer') || profession.includes('Porter') ? 2 : 0);
  const piety = 6 + Math.floor(rand() * 10) + (socialClass === SocialClass.CLERGY ? 4 : 0);
  const perceptiveness = 6 + Math.floor(rand() * 10) + (profession.includes('Merchant') || profession.includes('Scribe') ? 2 : 0);
  const neuroticism = 6 + Math.floor(rand() * 10);
  const charisma = 6 + Math.floor(rand() * 10) + (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.NOBILITY ? 2 : 0);
  const health = Math.round(80 + rand() * 20);
  const reputation = Math.round(
    socialClass === SocialClass.NOBILITY ? 75 + rand() * 15 :
    socialClass === SocialClass.CLERGY ? 65 + rand() * 15 :
    socialClass === SocialClass.MERCHANT ? 55 + rand() * 15 :
    40 + rand() * 15
  );
  const wealth = Math.round(
    socialClass === SocialClass.NOBILITY ? 80 + rand() * 15 :
    socialClass === SocialClass.CLERGY ? 60 + rand() * 15 :
    socialClass === SocialClass.MERCHANT ? 55 + rand() * 15 :
    30 + rand() * 15
  );

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
    ? (() => {
        const roll = rand();
        const narrowBias = socialClass === SocialClass.PEASANT ? 0.7 : socialClass === SocialClass.MERCHANT ? 0.6 : socialClass === SocialClass.NOBILITY ? 0.45 : 0.55;
        const wideBias = socialClass === SocialClass.NOBILITY ? 0.18 : 0.08;
        if (roll < narrowBias) {
          const extraNarrow = rand() < 0.6;
          return extraNarrow
            ? clamp(0.52 + rand() * 0.12 + (weight - 0.8) * 0.12, 0.5, 0.7)
            : clamp(0.62 + rand() * 0.16 + (weight - 0.8) * 0.18, 0.58, 0.85);
        }
        if (roll > 1 - wideBias) {
          return clamp(1.02 + rand() * 0.2 + (weight - 0.8) * 0.35, 0.95, 1.25);
        }
        return clamp(0.78 + rand() * 0.16 + (weight - 0.8) * 0.2, 0.72, 1.0);
      })()
    : 1.0;
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.65 : 0.4);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.35 : 0.6);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.35);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric' = (() => {
    if (rand() > 0.75) {
      // Pattern pools vary by social class - expensive patterns for wealthy
      const patternPool: Array<'stripe' | 'chevron' | 'damask' | 'ikat' | 'tiraz' | 'geometric'> =
        socialClass === SocialClass.NOBILITY
          ? ['damask', 'tiraz', 'geometric', 'ikat', 'stripe'] // Wealthy: fine patterns
          : socialClass === SocialClass.MERCHANT
            ? ['stripe', 'ikat', 'damask', 'chevron'] // Merchants: some fine patterns
            : socialClass === SocialClass.CLERGY
              ? ['geometric', 'tiraz', 'stripe'] // Clergy: restrained geometric
              : ['stripe', 'chevron']; // Peasants: simple patterns only
      const pick = patternPool[Math.floor(rand() * patternPool.length)];
      return pick;
    }
    return 'none';
  })();
  let sleeveCoverage: 'full' | 'lower' | 'none' = robePick.sleeves
    ? (rand() > 0.6 ? 'full' : 'lower')
    : 'none';
  const hairStyle: 'short' | 'medium' | 'long' | 'covered' = gender === 'Female'
    ? 'covered'
    : (age > 45 ? (rand() > 0.6 ? 'short' : 'medium')
      : profession.includes('Laborer') || profession.includes('Porter') || profession.includes('Guard')
        ? (rand() > 0.7 ? 'medium' : 'short')
        : socialClass === SocialClass.NOBILITY ? (rand() > 0.4 ? 'medium' : 'long')
        : socialClass === SocialClass.CLERGY ? (rand() > 0.6 ? 'short' : 'medium')
        : rand() > 0.5 ? 'medium' : 'short');
  let footwearStyle: 'sandals' | 'shoes' | 'bare' =
    socialClass === SocialClass.NOBILITY ? (rand() > 0.2 ? 'shoes' : 'sandals')
    : socialClass === SocialClass.MERCHANT ? (rand() > 0.3 ? 'shoes' : 'sandals')
    : rand() > 0.8 ? 'bare' : 'sandals';
  let footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  let footwearDescription = footwearStyle === 'bare' ? 'bare feet' : footwearStyle === 'shoes' ? 'simple leather shoes' : 'woven leather sandals';
  if (isReligiousLeader) {
    robePick = {
      desc: 'dark wool jubba with pale sash',
      base: '#2f2b26',
      accent: '#c8b892',
      sash: true,
      sleeves: true
    };
    headwearStyle = 'turban';
    headwearPick = { desc: 'white imamah (turban) in fine cotton', color: '#e8dfcf' };
    robePattern = 'none';
    sleeveCoverage = 'full';
    footwearStyle = 'shoes';
  } else if (isSoldier) {
    robePick = {
      desc: isOfficer ? 'tailored military qaba with brass sash' : 'dark wool qaba with leather belt',
      base: isOfficer ? '#3b2f2b' : '#2f3438',
      accent: isOfficer ? '#b59b6a' : '#8b5e3c',
      sash: true,
      sleeves: true
    };
    headwearStyle = isOfficer ? 'turban' : 'cap';
    headwearPick = isOfficer
      ? { desc: 'deep red imamah with pale striping', color: '#8b2e2e' }
      : { desc: 'dark wool cap with a narrow band', color: '#3a3a3a' };
    robePattern = isOfficer ? 'stripe' : robePattern;
    sleeveCoverage = 'full';
    footwearStyle = 'shoes';
  } else if (isMerchant) {
    if (rand() > 0.55 && robePattern === 'none') robePattern = 'stripe';
  } else if (isLaborer) {
    sleeveCoverage = rand() > 0.4 ? 'lower' : 'none';
  }
  footwearColor = footwearStyle === 'shoes' ? '#3b2a1a' : '#9b7b4f';
  footwearDescription = footwearStyle === 'bare' ? 'bare feet' : footwearStyle === 'shoes' ? 'simple leather shoes' : 'woven leather sandals';
  const accessoryPool = gender === 'Female'
    ? (socialClass === SocialClass.NOBILITY
      ? ['bronze earrings', 'copper bracelet', 'small nose ring', 'etched bracelet']
      : ['bronze earrings', 'copper bracelet'])
    : (socialClass === SocialClass.NOBILITY
      ? ['leather belt pouch', 'woven sash', 'bronze ring']
      : ['leather belt pouch', 'woven sash']);
  const accessories = [
    rand() > 0.6 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none',
    rand() > 0.7 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none'
  ].filter(a => a !== 'none');

  const ailmentPool = [
    { id: 'blurred_vision', label: 'Blurred vision', zone: 'eyes' },
    { id: 'hard_of_hearing', label: 'Hard of hearing', zone: 'ears' },
    { id: 'chronic_headache', label: 'Chronic headaches', zone: 'head', systemic: true },
    { id: 'low_fever', label: 'Low fever', zone: 'systemic', systemic: true },
    { id: 'limping', label: 'Limping gait', zone: 'lower legs' },
    { id: 'anemia', label: 'Anemia', zone: 'systemic', systemic: true },
    { id: 'asthma', label: 'Asthmatic cough', zone: 'lungs', systemic: false },
    { id: 'stomach_pain', label: 'Stomach pains', zone: 'abdomen' },
    { id: 'arthritic_hands', label: 'Arthritic hands', zone: 'hands' }
  ];
  const baselineAilments: Array<{ id: string; label: string; zone: string; systemic?: boolean }> = [];
  const ailmentCountTarget = rand() > 0.85 ? 2 : rand() > 0.65 ? 1 : 0;
  const ailmentIndices = [...Array(ailmentPool.length).keys()];
  for (let i = 0; i < ailmentCountTarget; i++) {
    const index = Math.floor(rand() * ailmentIndices.length);
    const poolIndex = ailmentIndices.splice(index, 1)[0];
    baselineAilments.push(ailmentPool[poolIndex]);
  }

  return {
    name,
    age,
    gender,
    profession,
    socialClass,
    ethnicity,
    religion,
    language,
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
    robePattern,
    hairStyle,
    headwearStyle,
    sleeveCoverage,
    footwearStyle,
    footwearColor,
    footwearDescription,
    accessories,
    headwearColor: headwearPick.color,
    healthHistory: healthHistoryOptions[Math.floor(rand() * healthHistoryOptions.length)],
    clothing,
    strength,
    piety,
    perceptiveness,
    neuroticism,
    charisma,
    health,
    reputation,
    wealth,
    humors,
    humoralBalance,
    baselineAilments
  };
};

/**
 * Get appropriate religious professions based on district demographics
 */
const getDistrictReligiousProfessions = (district: DistrictType): string[] => {
  switch (district) {
    case 'CHRISTIAN_QUARTER':
      return CHRISTIAN_RELIGIOUS_PROFESSIONS;
    case 'JEWISH_QUARTER':
      return JEWISH_RELIGIOUS_PROFESSIONS;
    case 'UMAYYAD_MOSQUE':
      // Umayyad Mosque district should have Islamic professions
      return RELIGIOUS_PROFESSIONS;
    default:
      // All other districts use standard Islamic professions (14th century Damascus was Muslim-majority)
      return RELIGIOUS_PROFESSIONS;
  }
};

export const generateBuildingMetadata = (seed: number, x: number, z: number): BuildingMetadata => {
  let s = seed + Math.abs(x) * 13 + Math.abs(z) * 7;
  const rand = () => seededRandom(s++);
  const sizeScale = 0.88 + rand() * 0.24;

  // Determine district first (needed for religious profession filtering and styling)
  const district = getDistrictType(x, z);

  const typeRand = rand();
  let type = BuildingType.RESIDENTIAL;
  if (typeRand < 0.1) type = BuildingType.RELIGIOUS;
  else if (typeRand < 0.2) type = BuildingType.CIVIC;
  else if (typeRand < 0.6) type = BuildingType.COMMERCIAL;

  let ownerName = '';
  let ownerAge = Math.floor(rand() * 45) + 18;
  let ownerProfession = '';
  let ownerGender: 'Male' | 'Female' = rand() > 0.5 ? 'Male' : 'Female';

  if (type === BuildingType.RELIGIOUS) {
    // Get district-appropriate religious professions
    const districtProfessions = getDistrictReligiousProfessions(district);
    ownerProfession = districtProfessions[Math.floor(rand() * districtProfessions.length)];

    // Sultan appoints major institutions (Friday Mosque, Madrasa)
    if (ownerProfession === 'Friday Mosque Imam' || ownerProfession === 'Madrasa Director') {
      ownerName = 'Sultan Al-Nasir Muhammad';
      ownerAge = 54;
    } else {
      // Local religious leader
      ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
      ownerAge = Math.floor(rand() * 30) + 35; // 35-65 years old
    }
    ownerGender = 'Male';
  } else if (type === BuildingType.CIVIC) {
    // Use weighted selection for civic professions (makes governors/qadis much rarer)
    const totalWeight = CIVIC_PROFESSIONS_WEIGHTED.reduce((sum, p) => sum + p.weight, 0);
    const randomWeight = rand() * totalWeight;
    let accumulatedWeight = 0;
    ownerProfession = 'Notary'; // Fallback
    for (const prof of CIVIC_PROFESSIONS_WEIGHTED) {
      accumulatedWeight += prof.weight;
      if (randomWeight <= accumulatedWeight) {
        ownerProfession = prof.profession;
        break;
      }
    }

    // Sultan appoints high government positions
    if (ownerProfession === 'Mamluk Governor' || ownerProfession === 'Court Qadi') {
      ownerName = 'Sultan Al-Nasir Muhammad';
      ownerAge = 54;
    } else {
      // Local civic servant
      ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
      ownerAge = Math.floor(rand() * 35) + 30; // 30-65 years old
    }
    ownerGender = 'Male';
  } else {
    ownerName = ownerGender === 'Male'
      ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
      : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;

    ownerProfession = type === BuildingType.COMMERCIAL
      ? COMMERCIAL_PROFESSIONS[Math.floor(rand() * COMMERCIAL_PROFESSIONS.length)]
      : RESIDENTIAL_PROFESSIONS[Math.floor(rand() * RESIDENTIAL_PROFESSIONS.length)];
  }

  // Calculate building height using the same formula as Environment.tsx
  const localSeed = x * 1000 + z;
  const baseHeight = district === 'HOVELS' && type !== BuildingType.RELIGIOUS && type !== BuildingType.CIVIC
    ? (3 + seededRandom(localSeed + 1) * 1.6) * 1.2
    : type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;
  const height = baseHeight * districtScale;

  // Determine story count based on building height
  // 1 story: < 6, 2 stories: 6-10, 3 stories: >= 10
  const storyCount: 1 | 2 | 3 = height < 6 ? 1 : height < 10 ? 2 : 3;

  // Adjust footprint based on story count: 3-story buildings are ~10% wider
  let footprintScale = storyCount === 3 ? sizeScale * 1.1 : storyCount === 2 ? sizeScale * 1.05 : sizeScale;

  // Override footprint scale for civic buildings based on profession (matches Environment.tsx rendering)
  if (type === BuildingType.CIVIC && ownerProfession) {
    if (ownerProfession === 'Mamluk Governor') {
      footprintScale = sizeScale * 1.4; // Large governor's palace
    } else if (ownerProfession === 'Court Qadi') {
      footprintScale = sizeScale * 1.2; // Large court hall
    } else if (ownerProfession === 'Hammam Keeper') {
      footprintScale = sizeScale * 1.2; // Public bath
    } else if (ownerProfession === 'Court Physician') {
      footprintScale = sizeScale * 1.1; // Medical clinic
    } else if (ownerProfession === 'Market Inspector') {
      footprintScale = sizeScale * 1.0; // Muhtasib office
    } else if (ownerProfession === 'Notary') {
      footprintScale = sizeScale * 0.9; // Document office
    } else if (ownerProfession === 'Fountain Keeper') {
      footprintScale = sizeScale * 0.6; // Small sabil
    }
  }

  return {
    id: `bld-${x}-${z}`,
    type,
    ownerName,
    ownerAge,
    ownerProfession,
    ownerGender,
    position: [x, 0, z],
    sizeScale: footprintScale,
    storyCount,
    doorSide: Math.floor(rand() * 4),
    hasSymmetricalWindows: rand() > 0.5,
    isPointOfInterest: type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC || rand() > 0.985,
    isQuarantined: type === BuildingType.RESIDENTIAL && rand() > 0.965,
    isOpen: type !== BuildingType.RESIDENTIAL ? true : rand() > 0.25,
    district // Include district for styling
  };
};
