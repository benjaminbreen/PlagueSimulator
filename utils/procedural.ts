
import { BuildingType, BuildingMetadata, SocialClass, NPCStats, PlayerStats, DistrictType, getDistrictType, Ethnicity, Religion } from '../types';
import { assignDemographics } from './demographics';
import { getBuildingHeight } from './buildingHeights';

// ============================================
// ETHNICITY-SPECIFIC NAME POOLS
// ============================================

const generateEyeColorFromHair = (hairColor: string): string => {
  const seed = hairColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const roll = (seed % 100) / 100;
  if (roll > 0.97) return '#6b8e9f'; // blue-grey (3%)
  if (roll > 0.90) return '#5a7a50'; // green (7%)
  if (roll > 0.80) return '#7a6a45'; // hazel (10%)
  if (roll > 0.65) return '#8b6b3a'; // light brown/amber (15%)
  if (roll > 0.40) return '#5a4030'; // medium warm brown (25%)
  return '#3a2a1a'; // dark brown (40%)
};

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
const HOSPITALITY_PROFESSIONS = [
  'Innkeeper',
  'Funduq Keeper',
  'Khan Warden',
  'Caravanserai Keeper',
  'Wakala Keeper'  // Merchant lodging house
];
const MEDICAL_PROFESSIONS = [
  'Hakim',
  'Physician',
  'Apothecary',
  'Barber-Surgeon',
  'Pharmacist'
];
const SCHOOL_PROFESSIONS = [
  'Madrasa Teacher',
  'Qur\'an Teacher',
  'Copyist Teacher',
  'Madrasa Administrator'
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
// Age-appropriate family structure generation
// MINIMUM MARRIAGE AGE: 18 (for modern sensibilities while maintaining historical setting)
function getAgeAppropriateFamilyStructure(age: number, rand: () => number): string {
  // Under 18: Cannot be married, may live with parents
  if (age < 18) {
    const youngOptions = [
      'Single, elder parent',      // Living with parents (most common)
      'Single, elder parent',
      'Single, elder parent',
      'No immediate family noted', // Orphan/alone (rare)
    ];
    return youngOptions[Math.floor(rand() * youngOptions.length)];
  }

  // 18-22: Just starting out - most likely single or newly married, few/no children
  if (age <= 22) {
    const youngAdultOptions = [
      'No immediate family noted',       // Single
      'No immediate family noted',
      'Single, elder parent',            // Still living with parents
      'Married, one child',              // Just married, maybe one baby
      'Married, one child',
    ];
    return youngAdultOptions[Math.floor(rand() * youngAdultOptions.length)];
  }

  // 23-28: Establishing family - small families most common
  if (age <= 28) {
    const establishingOptions = [
      'No immediate family noted',
      'Married, one child',
      'Married, one child',
      'Married, two children',
      'Married, two children',
      'Married, three children',
      'Single, elder parent',
      'Widowed, one child',              // Rare but possible
    ];
    return establishingOptions[Math.floor(rand() * establishingOptions.length)];
  }

  // 29-38: Peak family years - medium to large families
  if (age <= 38) {
    const peakFamilyOptions = [
      'Married, two children',
      'Married, three children',
      'Married, three children',
      'Married, three children',
      'Married, four children',
      'Married, four children',
      'Extended family in household',
      'Extended family in household',
      'Widowed, two children',
      'Widowed, one child',
    ];
    return peakFamilyOptions[Math.floor(rand() * peakFamilyOptions.length)];
  }

  // 39+: Mature families - larger families, more extended family, higher widow rates
  const matureFamilyOptions = [
    'Married, three children',
    'Married, four children',
    'Married, four children',
    'Married, five children',
    'Extended family in household',
    'Extended family in household',
    'Large extended family',
    'Large extended family',
    'Widowed, three children',
    'Widowed, two children',
    'Widowed, one child',
  ];
  return matureFamilyOptions[Math.floor(rand() * matureFamilyOptions.length)];
}
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
 * Hair begins graying around 35, with noticeable gray by 50s
 */
export const getAgedHairColor = (baseHairColor: string, age: number, rand: () => number): string => {
  if (age < 35) return baseHairColor;

  const hsl = hexToHSL(baseHairColor);

  // Graying starts at 35, becomes noticeable in 40s, significant in 50s+
  let grayProgress = 0;
  if (age >= 35 && age < 45) {
    // Early salt-and-pepper: 0-25% gray by 45
    grayProgress = ((age - 35) / 10) * 0.25;
  } else if (age >= 45 && age < 55) {
    // Noticeable graying: 25-55% by 55
    grayProgress = 0.25 + ((age - 45) / 10) * 0.30;
  } else if (age >= 55 && age < 65) {
    // Significant gray: 55-80% by 65
    grayProgress = 0.55 + ((age - 55) / 10) * 0.25;
  } else if (age >= 65) {
    // Mostly gray to white: 80-100% by 75+
    grayProgress = 0.80 + Math.min(0.20, ((age - 65) / 10) * 0.20);
  }

  // Add some individual variation (some people gray faster/slower)
  const variation = (rand() - 0.5) * 0.12;
  grayProgress = Math.max(0, Math.min(1, grayProgress + variation));

  // Desaturate fully and lighten to silver/white
  const newS = hsl.s * (1 - grayProgress * 0.95); // Almost fully desaturate
  const newL = hsl.l + grayProgress * (72 - hsl.l); // Lighten toward silver ~72%

  return hslToHex(hsl.h, newS, newL);
};

/**
 * Apply age-based graying to facial hair color
 * Beards typically gray earlier and more noticeably than head hair
 */
export const getAgedFacialHairColor = (baseHairColor: string, age: number, rand: () => number): string => {
  if (age < 30) return baseHairColor;

  const hsl = hexToHSL(baseHairColor);

  // Facial hair grays earlier and faster than head hair
  let grayProgress = 0;
  if (age >= 30 && age < 40) {
    // Early salt-and-pepper at temples/beard: 0-20% by 40
    grayProgress = ((age - 30) / 10) * 0.20;
  } else if (age >= 40 && age < 50) {
    // Noticeable salt-and-pepper: 20-45% by 50
    grayProgress = 0.20 + ((age - 40) / 10) * 0.25;
  } else if (age >= 50 && age < 60) {
    // Significant gray: 45-70% by 60
    grayProgress = 0.45 + ((age - 50) / 10) * 0.25;
  } else if (age >= 60 && age < 70) {
    // Mostly gray: 70-90% by 70
    grayProgress = 0.70 + ((age - 60) / 10) * 0.20;
  } else if (age >= 70) {
    // Full white: 90-100%
    grayProgress = 0.90 + Math.min(0.10, ((age - 70) / 10) * 0.10);
  }

  // Individual variation - facial hair graying is more variable
  const variation = (rand() - 0.5) * 0.15;
  grayProgress = Math.max(0, Math.min(1, grayProgress + variation));

  // Desaturate to gray/white - facial hair tends toward silver-white
  const newS = hsl.s * (1 - grayProgress * 0.98);
  const newL = hsl.l + grayProgress * (78 - hsl.l); // Lighter target for white beard

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
    // Undyed natural fibers (common but not overwhelming)
    { desc: 'threadbare linen qamis in beige', base: '#c8b892', accent: '#a08060', sash: false, sleeves: false },
    { desc: 'undyed flax thawb with rope belt', base: '#d6c8a8', accent: '#8a7a5a', sash: false, sleeves: false },
    { desc: 'raw wool qamis in natural cream', base: '#d4c9b0', accent: '#9a8a6a', sash: false, sleeves: false },
    { desc: 'worn linen thawb in dusty cream', base: '#cfc5a8', accent: '#7a6a4a', sash: false, sleeves: false },
    // Cheap local dyes - madder (very common, affordable)
    { desc: 'madder-dyed qamis in brick red', base: '#9b5a4a', accent: '#d6c8a8', sash: false, sleeves: false },
    { desc: 'faded madder thawb in dusty rose', base: '#a07068', accent: '#c8b8a0', sash: false, sleeves: false },
    { desc: 'patched madder qamis in rust', base: '#8a5040', accent: '#c0a888', sash: false, sleeves: false },
    // Weld dye (common yellow plant dye)
    { desc: 'weld-dyed thawb in straw yellow', base: '#c8a858', accent: '#8a7a5a', sash: false, sleeves: false },
    { desc: 'onion-skin dyed qamis in pale gold', base: '#c4a060', accent: '#7a6848', sash: false, sleeves: false },
    // Earth tones from walnut, pomegranate
    { desc: 'walnut-brown wool qaba', base: '#6a4a38', accent: '#c8b892', sash: true, sleeves: true },
    { desc: 'pomegranate-dyed thawb in rust-brown', base: '#8a5a48', accent: '#d0c0a0', sash: false, sleeves: false },
    { desc: 'rough wool qabāʾ in deep brown', base: '#5a4030', accent: '#b8a880', sash: true, sleeves: true },
    // Woad blue (cheaper than indigo, available locally)
    { desc: 'woad-dyed thawb in soft blue', base: '#6080a0', accent: '#c8c0b0', sash: false, sleeves: false },
    { desc: 'faded woad qamis in grey-blue', base: '#7088a0', accent: '#b8a888', sash: false, sleeves: false },
    // Overdyed greens (weld + woad)
    { desc: 'olive wool qaba from mixed dyes', base: '#6a7050', accent: '#c8b892', sash: true, sleeves: true },
    { desc: 'dull green thawb of salvaged cloth', base: '#607858', accent: '#b8a880', sash: false, sleeves: false },
    // Iron-tannin blacks and greys (cheap, common for laborers)
    { desc: 'iron-black wool qaba', base: '#3a3835', accent: '#8a8070', sash: true, sleeves: true },
    { desc: 'charcoal grey thawb', base: '#4a4845', accent: '#a09888', sash: false, sleeves: false },
  ],
  [SocialClass.MERCHANT]: [
    // Quality local dyes - olives and earth tones
    { desc: 'dyed wool qaba in muted olive', base: '#6f6a3f', accent: '#c8a050', sash: true, sleeves: true },
    { desc: 'soft wool thawb in deep olive', base: '#5d5b2f', accent: '#b89858', sash: true, sleeves: true },
    { desc: 'henna-dyed thawb in warm orange-brown', base: '#9b6844', accent: '#d8c098', sash: true, sleeves: true },
    // Rich madder reds (sign of good trade)
    { desc: 'madder-dyed thawb in russet red', base: '#9b4a3a', accent: '#d4c4a0', sash: true, sleeves: true },
    { desc: 'madder-dyed qaba in terracotta', base: '#a65a42', accent: '#c8b888', sash: true, sleeves: true },
    { desc: 'rich madder qaba in vivid red', base: '#a84040', accent: '#e0d0b0', sash: true, sleeves: true },
    // Good quality basics with contrasting accents
    { desc: 'well-kept linen thawb in warm tan', base: '#b89b6a', accent: '#6a5040', sash: true, sleeves: true },
    { desc: 'trimmed qaba with striped izar', base: '#7b5a4a', accent: '#c8a050', sash: true, sleeves: true },
    { desc: 'fine linen thawb in honey', base: '#c8a060', accent: '#5a4a38', sash: true, sleeves: true },
    // Imported dyes - blues and greens
    { desc: 'dyed wool qaba in slate blue', base: '#4a5a6b', accent: '#c8b080', sash: true, sleeves: true },
    { desc: 'indigo-dyed thawb in deep blue', base: '#3d4f5f', accent: '#c8a858', sash: true, sleeves: true },
    { desc: 'weld-and-indigo green qaba', base: '#4a6048', accent: '#c8b070', sash: true, sleeves: true },
    { desc: 'teal qaba from Syrian trade', base: '#4a7878', accent: '#c8b888', sash: true, sleeves: true },
    // Vibrant trade goods colors
    { desc: 'lapis-blue thawb from Persian trade', base: '#3a5a8a', accent: '#d0b870', sash: true, sleeves: true },
    { desc: 'copper-henna qaba in warm orange', base: '#a86040', accent: '#d8c8a0', sash: true, sleeves: true },
    { desc: 'olive qaba with saffron-gold trim', base: '#5d5b2f', accent: '#d4a030', sash: true, sleeves: true },
    { desc: 'plum-dyed thawb in muted purple', base: '#6a4858', accent: '#c8b888', sash: true, sleeves: true },
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

type HeadwearPick = {
  desc: string;
  color: string;
  garmentType?: 'khimar' | 'milhafa' | 'hijab';
  pattern?: 'none' | 'band' | 'stripe' | 'geometric' | 'simple';
  accent?: string;
};

const buildHeadwearPick = (
  rand: () => number,
  gender: 'Male' | 'Female',
  headwearStyle: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none',
  flags: { isReligiousLeader: boolean; isSoldier: boolean; isOfficer: boolean },
  socialClass?: SocialClass,
  religion?: Religion
): HeadwearPick => {
  if (gender === 'Female') {
    // Historical Mamluk color restrictions for dhimmi (non-Muslim) women
    // Muslims wore white, Christians blue, Jews yellow, Samaritans red
    const isChristian = religion === 'Eastern Orthodox' || religion === 'Syriac Orthodox' || religion === 'Armenian Apostolic';
    const isJewish = religion === 'Jewish';
    const isSamaritan = religion === 'Samaritan';
    const isMuslim = !isChristian && !isJewish && !isSamaritan;

    // Expanded female headwear with variety by social class and garment type
    const isWealthy = socialClass === SocialClass.NOBILITY || socialClass === SocialClass.ELITE;
    const isMerchant = socialClass === SocialClass.MERCHANT || socialClass === SocialClass.ARTISAN;

    // Period-accurate color palettes based on Mamluk dyes and religious restrictions
    let muslimColors = {
      white: '#f4efe6',      // undyed white (most common)
      cream: '#e8dfcf',      // natural linen
      paleBeige: '#d6c2a4',  // natural cotton
      beige: '#c7b08c',      // light tan
      tan: '#b89968',        // medium tan
      brown: '#8b7355',      // natural brown
      darkBrown: '#7b5a4a',  // dark linen
      indigo: '#3f5d7a',     // expensive indigo (wealthy only)
      deepBlue: '#5a6b7a',   // medium indigo
      crimson: '#a03342',    // very expensive (nobility only)
      madderRed: '#8b2e2e'   // madder red (wealthy)
    };

    let christianColors = {
      lightBlue: '#7a8fa8',  // mandated Christian blue
      mediumBlue: '#5a6b7a', // deeper blue
      deepBlue: '#4a5d7a',   // rich blue
      indigo: '#3f5d7a'      // indigo
    };

    let jewishColors = {
      paleYellow: '#e3d2ad', // light saffron
      saffron: '#d4b85c',    // mandated Jewish yellow
      golden: '#c8a040',     // rich golden yellow
      amber: '#c2a878'       // amber yellow
    };

    let samaritanColors = {
      lightRed: '#a8635c',   // light red
      red: '#8b4a42',        // mandated Samaritan red
      deepRed: '#7a3a32',    // deep red
      crimson: '#a03342'     // crimson
    };

    const options: HeadwearPick[] = [];

    // Build options based on religion
    if (isMuslim) {
      // Muslim women - white/natural colors predominate, with expensive dyes for wealthy
      options.push(
        // Khimar options (structured, tight wrapping)
        { desc: 'white linen khimar', color: muslimColors.white, garmentType: 'khimar', pattern: 'none' },
        { desc: 'cream khimar with decorative band', color: muslimColors.cream, garmentType: 'khimar', pattern: 'band', accent: muslimColors.brown },
        { desc: 'pale khimar with woven diamond pattern', color: muslimColors.paleBeige, garmentType: 'khimar', pattern: 'simple', accent: muslimColors.darkBrown },
        { desc: 'beige khimar with subtle damask', color: muslimColors.beige, garmentType: 'khimar', pattern: 'simple', accent: muslimColors.brown },

        // Milhafa options (flowing, North African style)
        { desc: 'white cotton milhafa', color: muslimColors.white, garmentType: 'milhafa', pattern: 'none' },
        { desc: 'flowing milhafa with diamond weave', color: muslimColors.cream, garmentType: 'milhafa', pattern: 'simple', accent: muslimColors.tan },
        { desc: 'natural linen milhafa with pattern', color: muslimColors.paleBeige, garmentType: 'milhafa', pattern: 'simple', accent: muslimColors.brown },

        // Hijab options (simple, contemporary style)
        { desc: 'white headscarf', color: muslimColors.white, garmentType: 'hijab', pattern: 'none' },
        { desc: 'cream headscarf with damask', color: muslimColors.cream, garmentType: 'hijab', pattern: 'simple', accent: muslimColors.tan },
        { desc: 'modest headscarf with band', color: muslimColors.paleBeige, garmentType: 'hijab', pattern: 'band', accent: muslimColors.brown }
      );
    } else if (isChristian) {
      // Christian women - must wear BLUE by Mamluk law
      options.push(
        { desc: 'blue linen khimar', color: christianColors.lightBlue, garmentType: 'khimar', pattern: 'none' },
        { desc: 'deep blue khimar with damask', color: christianColors.deepBlue, garmentType: 'khimar', pattern: 'simple', accent: '#a8b8c8' },
        { desc: 'blue khimar with pale band', color: christianColors.mediumBlue, garmentType: 'khimar', pattern: 'band', accent: '#c8d8e8' },
        { desc: 'indigo khimar with diamond pattern', color: christianColors.indigo, garmentType: 'khimar', pattern: 'simple', accent: '#8aa0b8' },
        { desc: 'blue milhafa with woven pattern', color: christianColors.lightBlue, garmentType: 'milhafa', pattern: 'simple', accent: '#4a6a8a' },
        { desc: 'deep blue milhafa', color: christianColors.deepBlue, garmentType: 'milhafa', pattern: 'none' },
        { desc: 'blue headscarf with damask', color: christianColors.mediumBlue, garmentType: 'hijab', pattern: 'simple', accent: '#a8c0d0' },
        { desc: 'light blue headscarf', color: christianColors.lightBlue, garmentType: 'hijab', pattern: 'none' }
      );
    } else if (isJewish) {
      // Jewish women - must wear YELLOW by Mamluk law
      options.push(
        { desc: 'saffron yellow khimar', color: jewishColors.saffron, garmentType: 'khimar', pattern: 'none' },
        { desc: 'golden khimar with damask', color: jewishColors.golden, garmentType: 'khimar', pattern: 'simple', accent: '#8a6a30' },
        { desc: 'pale yellow khimar with band', color: jewishColors.paleYellow, garmentType: 'khimar', pattern: 'band', accent: '#a08040' },
        { desc: 'amber khimar with diamond pattern', color: jewishColors.amber, garmentType: 'khimar', pattern: 'simple', accent: '#7a5a28' },
        { desc: 'yellow milhafa with woven pattern', color: jewishColors.saffron, garmentType: 'milhafa', pattern: 'simple', accent: '#8a6830' },
        { desc: 'golden milhafa', color: jewishColors.golden, garmentType: 'milhafa', pattern: 'none' },
        { desc: 'yellow headscarf with damask', color: jewishColors.saffron, garmentType: 'hijab', pattern: 'simple', accent: '#a08040' },
        { desc: 'pale yellow headscarf', color: jewishColors.paleYellow, garmentType: 'hijab', pattern: 'none' }
      );
    } else if (isSamaritan) {
      // Samaritan women - must wear RED by Mamluk law
      options.push(
        { desc: 'red linen khimar', color: samaritanColors.red, garmentType: 'khimar', pattern: 'none' },
        { desc: 'crimson khimar with damask', color: samaritanColors.crimson, garmentType: 'khimar', pattern: 'simple', accent: '#d8a8a0' },
        { desc: 'light red khimar with pattern', color: samaritanColors.lightRed, garmentType: 'khimar', pattern: 'simple', accent: '#5a2a22' },
        { desc: 'deep red khimar with diamond weave', color: samaritanColors.deepRed, garmentType: 'khimar', pattern: 'simple', accent: '#c89080' },
        { desc: 'red milhafa with woven pattern', color: samaritanColors.red, garmentType: 'milhafa', pattern: 'simple', accent: '#5a3030' },
        { desc: 'crimson milhafa', color: samaritanColors.crimson, garmentType: 'milhafa', pattern: 'none' },
        { desc: 'red headscarf with damask', color: samaritanColors.red, garmentType: 'hijab', pattern: 'simple', accent: '#c8a090' }
      );
    }

    // Add wealthy-exclusive options (expensive dyes and silk)
    if (isWealthy && isMuslim) {
      // Wealthy Muslims can afford expensive indigo and crimson dyes
      options.push(
        { desc: 'silk khimar with geometric patterns', color: muslimColors.white, garmentType: 'khimar', pattern: 'geometric', accent: '#b59b6a' },
        { desc: 'fine linen khimar with gold threading', color: muslimColors.cream, garmentType: 'khimar', pattern: 'geometric', accent: '#b59b6a' },
        { desc: 'indigo silk khimar', color: muslimColors.indigo, garmentType: 'khimar', pattern: 'none' },
        { desc: 'indigo milhafa with pale striping', color: muslimColors.deepBlue, garmentType: 'milhafa', pattern: 'stripe', accent: '#a8b5c4' },
        { desc: 'crimson silk milhafa', color: muslimColors.crimson, garmentType: 'milhafa', pattern: 'simple', accent: muslimColors.white },
        { desc: 'embroidered ivory milhafa', color: muslimColors.white, garmentType: 'milhafa', pattern: 'geometric', accent: '#b59b6a' }
      );
    } else if (isWealthy && isChristian) {
      // Wealthy Christians - rich blue silks
      options.push(
        { desc: 'silk blue khimar with geometric patterns', color: christianColors.deepBlue, garmentType: 'khimar', pattern: 'geometric', accent: christianColors.lightBlue },
        { desc: 'indigo silk khimar', color: christianColors.indigo, garmentType: 'khimar', pattern: 'none' }
      );
    } else if (isWealthy && isJewish) {
      // Wealthy Jews - rich golden silks
      options.push(
        { desc: 'silk golden khimar with patterns', color: jewishColors.golden, garmentType: 'khimar', pattern: 'geometric', accent: jewishColors.paleYellow },
        { desc: 'saffron silk milhafa', color: jewishColors.saffron, garmentType: 'milhafa', pattern: 'simple', accent: jewishColors.golden }
      );
    } else if (isWealthy && isSamaritan) {
      // Wealthy Samaritans - rich red silks
      options.push(
        { desc: 'crimson silk khimar', color: samaritanColors.crimson, garmentType: 'khimar', pattern: 'simple', accent: samaritanColors.lightRed }
      );
    }

    // Add merchant-class options (striped fabrics more affordable than geometric)
    if (isMerchant && isMuslim) {
      options.push(
        { desc: 'striped khimar in natural cotton', color: muslimColors.tan, garmentType: 'khimar', pattern: 'stripe', accent: muslimColors.brown },
        { desc: 'milhafa with decorative band', color: muslimColors.beige, garmentType: 'milhafa', pattern: 'band', accent: muslimColors.white }
      );
    } else if (isMerchant && isChristian) {
      options.push(
        { desc: 'striped blue khimar', color: christianColors.mediumBlue, garmentType: 'khimar', pattern: 'stripe', accent: christianColors.lightBlue }
      );
    } else if (isMerchant && isJewish) {
      options.push(
        { desc: 'striped yellow khimar', color: jewishColors.amber, garmentType: 'khimar', pattern: 'stripe', accent: jewishColors.paleYellow }
      );
    }

    return options[Math.floor(rand() * options.length)];
  }

  if (flags.isReligiousLeader) {
    return { desc: 'white imamah (turban) in fine cotton', color: '#e8dfcf', pattern: 'none' };
  }
  if (flags.isSoldier) {
    return flags.isOfficer
      ? { desc: 'deep red imamah with pale striping', color: '#8b2e2e', pattern: 'stripe', accent: '#e8dfcf' }
      : { desc: 'dark wool cap with a narrow band', color: '#3a3a3a', pattern: 'band', accent: '#5a5a5a' };
  }

  if (headwearStyle === 'fez') {
    return rand() > 0.5
      ? { desc: 'felt fez cap in deep red', color: '#8b2e2e', pattern: 'none' }
      : { desc: 'felt fez cap in pale tan', color: '#cbb48a', pattern: 'none' };
  }
  if (headwearStyle === 'straw') {
    return { desc: 'woven straw brimmed cap', color: '#cbb48a', pattern: 'none' };
  }
  if (headwearStyle === 'taqiyah') {
    const palette = ['#3a3a3a', '#1f1f1f', '#5a4a3a', '#2f2b26', '#6b5a4b'];
    return { desc: 'simple skullcap in dark cloth', color: palette[Math.floor(rand() * palette.length)], pattern: 'none' };
  }
  if (headwearStyle === 'cap') {
    const palette = ['#5a4a3a', '#6f5a43', '#cbb48a', '#9b7b4f'];
    return { desc: 'plain linen cap', color: palette[Math.floor(rand() * palette.length)], pattern: 'none' };
  }
  if (headwearStyle === 'none') {
    return { desc: 'uncovered head', color: '#cbb48a', pattern: 'none' };
  }

  const options: HeadwearPick[] = [
    { desc: 'deep red imamah (turban) with white striping', color: '#8b2e2e', pattern: 'stripe', accent: '#e8dfcf' },
    { desc: 'dark indigo imamah with pale striping', color: '#3f5d7a', pattern: 'stripe', accent: '#a8b5c4' },
    { desc: 'black wool headwrap with white banding', color: '#1f1f1f', pattern: 'band', accent: '#e8dfcf' },
    { desc: 'brown wool imamah with lighter wrap', color: '#7b5a4a', pattern: 'none' },
    { desc: 'tan cotton headwrap in plain weave', color: '#cbb48a', pattern: 'none' },
    { desc: 'brown wool imamah with pale striping', color: '#7b5a4a', pattern: 'stripe', accent: '#c7b08c' }
  ];
  return options[Math.floor(rand() * options.length)];
};

export const generateNPCStats = (seed: number, context?: { districtType?: DistrictType; gender?: 'Male' | 'Female' }): NPCStats => {
  let s = seed;
  const rand = () => seededRandom(s++);

  // Use provided gender or generate randomly
  const gender: 'Male' | 'Female' = context?.gender ?? (rand() > 0.5 ? 'Male' : 'Female');
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

  // Height and weight scales - more dramatic scaling for children
  // A 5-year-old should be ~0.45, 10-year-old ~0.6, 15-year-old ~0.8
  const heightBase = age < 6 ? 0.35 + (age / 6) * 0.15  // Toddlers/young children: 0.35-0.5
    : age < 12 ? 0.5 + ((age - 6) / 6) * 0.2             // Children: 0.5-0.7
    : age < 18 ? 0.7 + ((age - 12) / 6) * 0.2            // Youth: 0.7-0.9
    : 0.9 + rand() * 0.2;                                // Adults: 0.9-1.1
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
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.5 : 0.35);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.35 : 0.45);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.75 : 0.4);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric' = (() => {
    // Stripes are common even for poor - simple weaving technique
    if (rand() > 0.6) {
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
    // Even poor areas have some simple stripes - basic weaving technique
    robePattern = (robePattern === 'stripe' && rand() > 0.6) ? 'stripe' : 'none';
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

  // CHILDREN: Override headwear and appearance for young ages
  // Children don't wear formal turbans or fez - they wear simple caps or go bareheaded
  if (age < 14 && gender === 'Male') {
    if (headwearStyle === 'turban' || headwearStyle === 'fez') {
      headwearStyle = rand() > 0.5 ? 'cap' : 'none';
    }
    // Very young children often bareheaded
    if (age < 8 && rand() > 0.6) {
      headwearStyle = 'none';
    }
  }
  // Young girls wear simpler head coverings or none
  if (age < 10 && gender === 'Female') {
    if (rand() > 0.5) {
      headwearStyle = 'none';
    }
  }

  let headwearPick = buildHeadwearPick(rand, gender, headwearStyle, { isReligiousLeader, isSoldier, isOfficer }, socialClass, religion);
  const headwearColor = headwearPick.color;
  const headwearGarmentType = gender === 'Female' ? (headwearPick.garmentType ?? 'hijab') : undefined;
  const headscarfPattern = gender === 'Female' ? (headwearPick.pattern ?? 'none') : undefined;
  const headscarfAccentColor = gender === 'Female' ? headwearPick.accent : undefined;
  const turbanPattern = gender === 'Male' ? (headwearPick.pattern ?? 'none') : undefined;
  const turbanAccentColor = gender === 'Male' ? headwearPick.accent : undefined;

  // Hair color with age-based graying
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626', '#3a2c22'];
  const baseHairColor = hairPalette[Math.floor(rand() * hairPalette.length)];
  const hairColor = getAgedHairColor(baseHairColor, age, rand);
  const eyeColor = generateEyeColorFromHair(hairColor);

  // Facial hair for men (historically, beards were common in medieval Damascus)
  const facialHair: NPCStats['facialHair'] = gender === 'Male' ? (() => {
    // Children and early adolescents never have facial hair
    if (age < 15) return 'none';
    // Mid-teens (15-17) very rarely have light stubble
    if (age < 18) return rand() > 0.95 ? 'stubble' : 'none';
    // Young men (18-20) sometimes have stubble
    if (age < 21) return rand() > 0.5 ? 'stubble' : 'none';
    // Religious leaders almost always have beards (only if 21+)
    if (isReligiousLeader) return rand() > 0.2 ? 'full_beard' : 'short_beard';
    // Soldiers often have mustaches or short beards (only if 21+)
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

  // Facial hair color (grays faster than head hair)
  const facialHairColor = gender === 'Male' && facialHair !== 'none'
    ? getAgedFacialHairColor(baseHairColor, age, rand)
    : hairColor;

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

  // Headscarf style variety for women (when headwearStyle is 'scarf')
  // Distribution: 10% veiled (most conservative), 60% full (standard), 30% modest (traditional variant)
  const headscarfStyle: 'veiled' | 'full' | 'modest' = gender === 'Female' ? (() => {
    // Very elderly women (70+) and extremely religious households favor veiled
    if (age >= 70) {
      const roll = rand();
      if (roll < 0.2) return 'veiled';   // 20% veiled
      if (roll < 0.75) return 'full';    // 55% full
      return 'modest';                   // 25% modest
    }

    // Elderly women (60-69) favor full coverage
    if (age >= 60) {
      const roll = rand();
      if (roll < 0.12) return 'veiled';  // 12% veiled
      if (roll < 0.7) return 'full';     // 58% full
      return 'modest';                   // 30% modest
    }

    // Older women (40-59) - standard distribution
    if (age >= 40) {
      const roll = rand();
      if (roll < 0.1) return 'veiled';   // 10% veiled
      if (roll < 0.65) return 'full';    // 55% full
      return 'modest';                   // 35% modest
    }

    // Religious leaders' households favor conservative styles
    if (isReligiousLeader) {
      const roll = rand();
      if (roll < 0.15) return 'veiled';  // 15% veiled
      if (roll < 0.75) return 'full';    // 60% full
      return 'modest';                   // 25% modest
    }

    // Wealthy/elite women - slightly less veiled, more variety
    if (socialClass === SocialClass.NOBILITY) {
      const roll = rand();
      if (roll < 0.05) return 'veiled';  // 5% veiled
      if (roll < 0.6) return 'full';     // 55% full
      return 'modest';                   // 40% modest
    }

    // Merchant/artisan class - standard distribution
    if (socialClass === SocialClass.MERCHANT || isArtisan) {
      const roll = rand();
      if (roll < 0.08) return 'veiled';  // 8% veiled
      if (roll < 0.65) return 'full';    // 57% full
      return 'modest';                   // 35% modest
    }

    // Peasants/laborers - standard distribution, practical
    const roll = rand();
    if (roll < 0.12) return 'veiled';    // 12% veiled
    if (roll < 0.65) return 'full';      // 53% full
    return 'modest';                     // 35% modest
  })() : 'full'; // Default for males (unused)

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

  const strength = 6 + Math.floor(rand() * 10) + (profession.includes('Laborer') || profession.includes('Porter') ? 2 : 0);
  const charisma = 6 + Math.floor(rand() * 10) + (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.NOBILITY ? 2 : 0);

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
    strength,
    charisma,
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
    eyeColor,
    facialHair,
    facialHairColor,
    headwearStyle,
    headscarfStyle,
    headscarfPattern,
    headscarfAccentColor,
    headwearGarmentType,
    turbanPattern,
    turbanAccentColor,
    headwearColor,
    sleeveCoverage,
    footwearStyle,
    footwearColor,
    heldItem,
    accessories,
    goalOfDay,
    hasEmbroidery: socialClass === SocialClass.NOBILITY ||
                   socialClass === SocialClass.ELITE ||
                   (socialClass === SocialClass.MERCHANT && rand() > 0.6) ||
                   (socialClass === SocialClass.CLERGY && rand() > 0.5),
  };
};

export const generatePlayerStats = (
  seed: number,
  context?: { districtType?: DistrictType }
): Omit<PlayerStats, 'currency' | 'inventory' | 'maxInventorySlots' | 'plague' | 'activeEffects'> => {
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
  const eyeColor = generateEyeColorFromHair(hairColor);

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
  const isArtisan = /(Blacksmith|Coppersmith|Weaver|Carpenter|Potter|Dyer|Tanner)/i.test(profession);
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

  const headwearPick = buildHeadwearPick(rand, gender, headwearStyle, { isReligiousLeader, isSoldier, isOfficer }, socialClass, religion);
  const headwearGarmentType = gender === 'Female' ? (headwearPick.garmentType ?? 'hijab') : undefined;
  const headscarfPattern = gender === 'Female' ? (headwearPick.pattern ?? 'none') : undefined;
  const headscarfAccentColor = gender === 'Female' ? headwearPick.accent : undefined;
  const turbanPattern = gender === 'Male' ? (headwearPick.pattern ?? 'none') : undefined;
  const turbanAccentColor = gender === 'Male' ? headwearPick.accent : undefined;

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
  const robeHasTrim = rand() > (socialClass === SocialClass.PEASANT ? 0.45 : 0.35);
  const robeHemBand = rand() > (socialClass === SocialClass.NOBILITY ? 0.3 : 0.4);
  const robeOverwrap = gender === 'Female' && rand() > (socialClass === SocialClass.PEASANT ? 0.7 : 0.35);
  let robePattern: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric' = (() => {
    // Stripes are common even for poor - simple weaving technique
    if (rand() > 0.55) {
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
  const facialHair: PlayerStats['facialHair'] = gender === 'Male' ? (() => {
    if (age < 15) return 'none';
    if (age < 18) return rand() > 0.95 ? 'stubble' : 'none';
    if (age < 21) return rand() > 0.5 ? 'stubble' : 'none';
    if (isReligiousLeader) return rand() > 0.2 ? 'full_beard' : 'short_beard';
    if (isSoldier) return rand() > 0.5 ? 'mustache' : (rand() > 0.5 ? 'short_beard' : 'stubble');
    if (age > 40) {
      const roll = rand();
      if (roll < 0.35) return 'full_beard';
      if (roll < 0.6) return 'short_beard';
      if (roll < 0.8) return 'goatee';
      return 'stubble';
    }
    const roll = rand();
    if (roll < 0.15) return 'full_beard';
    if (roll < 0.35) return 'short_beard';
    if (roll < 0.5) return 'goatee';
    if (roll < 0.7) return 'mustache';
    if (roll < 0.85) return 'stubble';
    return 'none';
  })() : 'none';

  // Facial hair color (grays faster than head hair)
  const facialHairColor = gender === 'Male' && facialHair !== 'none'
    ? getAgedFacialHairColor(baseHairColor, age, rand)
    : hairColor;

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

  // Headscarf style for female player (same logic as NPCs)
  // Distribution: 10% veiled, 60% full, 30% modest
  const headscarfStyle: 'veiled' | 'full' | 'modest' = gender === 'Female' ? (() => {
    if (age >= 70) {
      const roll = rand();
      if (roll < 0.2) return 'veiled';
      if (roll < 0.75) return 'full';
      return 'modest';
    }
    if (age >= 60) {
      const roll = rand();
      if (roll < 0.12) return 'veiled';
      if (roll < 0.7) return 'full';
      return 'modest';
    }
    if (age >= 40) {
      const roll = rand();
      if (roll < 0.1) return 'veiled';
      if (roll < 0.65) return 'full';
      return 'modest';
    }
    if (isReligiousLeader) {
      const roll = rand();
      if (roll < 0.15) return 'veiled';
      if (roll < 0.75) return 'full';
      return 'modest';
    }
    if (socialClass === SocialClass.NOBILITY) {
      const roll = rand();
      if (roll < 0.05) return 'veiled';
      if (roll < 0.6) return 'full';
      return 'modest';
    }
    if (socialClass === SocialClass.MERCHANT || isArtisan) {
      const roll = rand();
      if (roll < 0.08) return 'veiled';
      if (roll < 0.65) return 'full';
      return 'modest';
    }
    const roll = rand();
    if (roll < 0.12) return 'veiled';
    if (roll < 0.65) return 'full';
    return 'modest';
  })() : 'full';

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
    family: getAgeAppropriateFamilyStructure(age, rand),
    familyMembers: [],  // Populated later by generatePlayerFamily
    homeBuildingId: null,  // Assigned when game initializes
    homeMapPosition: null,  // Assigned when game initializes
    healthStatus: HEALTH_STATUSES[Math.floor(rand() * HEALTH_STATUSES.length)],
    skinTone,
    hairColor,
    eyeColor,
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
    facialHair,
    facialHairColor,
    headwearStyle,
    headscarfStyle,
    headscarfPattern,
    headscarfAccentColor,
    headwearGarmentType,
    turbanPattern,
    turbanAccentColor,
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
    baselineAilments,
    hasEmbroidery: socialClass === SocialClass.NOBILITY ||
                   (socialClass === SocialClass.MERCHANT && rand() > 0.5) ||
                   (socialClass === SocialClass.CLERGY && rand() > 0.4),
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

export const generateBuildingMetadata = (seed: number, x: number, z: number, districtOverride?: DistrictType): BuildingMetadata => {
  let s = seed + Math.abs(x) * 13 + Math.abs(z) * 7;
  const rand = () => seededRandom(s++);
  const sizeScale = 0.88 + rand() * 0.24;

  // Determine district first (needed for religious profession filtering and styling)
  const district = districtOverride ?? getDistrictType(x, z);

  const typeRand = rand();
  let type = BuildingType.RESIDENTIAL;

  // Farmland: only private dwellings and farmhouses
  if (district === 'OUTSKIRTS_FARMLAND') {
    type = BuildingType.RESIDENTIAL;
  } else if (district === 'HOVELS') {
    // Poor quarter (Al-Shaghour): Only small one-story residences and merchant stalls
    // 60% residential (cramped private dwellings), 40% commercial (small merchant stalls, workshops)
    if (typeRand < 0.40) type = BuildingType.COMMERCIAL;
    // else remains RESIDENTIAL (60%)
  } else if (district === 'JEWISH_QUARTER') {
    // Jewish Quarter (Al-Yahud): Only residential homes and Jewish merchant shops
    // Synagogue, mikveh, yeshiva, etc. are spawned by JewishQuarterDecor component
    // 65% residential (Jewish homes with mezuzahs), 35% commercial (kosher shops, merchants)
    if (typeRand < 0.35) type = BuildingType.COMMERCIAL;
    // else remains RESIDENTIAL (65%)
  } else if (district === 'WEALTHY') {
    // 66% residential, 14% commercial, 4% civic, 2% religious, 6% school, 4% medical, 4% hospitality
    if (typeRand < 0.02) type = BuildingType.RELIGIOUS;
    else if (typeRand < 0.06) type = BuildingType.CIVIC;
    else if (typeRand < 0.12) type = BuildingType.SCHOOL;
    else if (typeRand < 0.16) type = BuildingType.MEDICAL;
    else if (typeRand < 0.20) type = BuildingType.HOSPITALITY;
    else if (typeRand < 0.34) type = BuildingType.COMMERCIAL;
    // else remains RESIDENTIAL (66%)
  } else {
    // Default distribution for other districts
    // 40% residential, 30% commercial, 6% civic, 6% religious, 6% school, 6% medical, 6% hospitality
    if (typeRand < 0.06) type = BuildingType.RELIGIOUS;
    else if (typeRand < 0.12) type = BuildingType.CIVIC;
    else if (typeRand < 0.18) type = BuildingType.SCHOOL;
    else if (typeRand < 0.24) type = BuildingType.MEDICAL;
    else if (typeRand < 0.30) type = BuildingType.HOSPITALITY;
    else if (typeRand < 0.60) type = BuildingType.COMMERCIAL;
  }

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
  } else if (type === BuildingType.SCHOOL) {
    ownerProfession = SCHOOL_PROFESSIONS[Math.floor(rand() * SCHOOL_PROFESSIONS.length)];
    ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
    ownerAge = Math.floor(rand() * 35) + 30;
    ownerGender = 'Male';
  } else if (type === BuildingType.MEDICAL) {
    ownerProfession = MEDICAL_PROFESSIONS[Math.floor(rand() * MEDICAL_PROFESSIONS.length)];
    ownerName = `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
    ownerAge = Math.floor(rand() * 35) + 30;
    ownerGender = 'Male';
  } else if (type === BuildingType.HOSPITALITY) {
    ownerProfession = HOSPITALITY_PROFESSIONS[Math.floor(rand() * HOSPITALITY_PROFESSIONS.length)];
    ownerName = ownerGender === 'Male'
      ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
      : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
  } else {
    // Jewish Quarter residents use Jewish names
    if (district === 'JEWISH_QUARTER') {
      const firstName = ownerGender === 'Male'
        ? JEWISH_NAMES.male[Math.floor(rand() * JEWISH_NAMES.male.length)]
        : JEWISH_NAMES.female[Math.floor(rand() * JEWISH_NAMES.female.length)];
      const surname = JEWISH_NAMES.surnames[Math.floor(rand() * JEWISH_NAMES.surnames.length)];
      ownerName = `${firstName} ${surname}`;
    } else {
      ownerName = ownerGender === 'Male'
        ? `${FIRST_NAMES_MALE[Math.floor(rand() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`
        : `${FIRST_NAMES_FEMALE[Math.floor(rand() * FIRST_NAMES_FEMALE.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
    }

    ownerProfession = type === BuildingType.COMMERCIAL
      ? COMMERCIAL_PROFESSIONS[Math.floor(rand() * COMMERCIAL_PROFESSIONS.length)]
      : RESIDENTIAL_PROFESSIONS[Math.floor(rand() * RESIDENTIAL_PROFESSIONS.length)];

    // Jewish Quarter specific professions
    if (district === 'JEWISH_QUARTER') {
      const jewishProfessions = ['Jeweler', 'Goldsmith', 'Textile Merchant', 'Silk Trader', 'Money Changer', 'Wine Merchant', 'Scribe', 'Scholar', 'Merchant', 'Tradesman'];
      if (type === BuildingType.COMMERCIAL) {
        ownerProfession = jewishProfessions[Math.floor(rand() * jewishProfessions.length)];
      }
    }
  }

  if (district === 'OUTSKIRTS_FARMLAND') {
    const farmlandProfessions = ['Farmer', 'Field Worker', 'Orchard Keeper', 'Irrigation Keeper', 'Farmhand'];
    ownerProfession = farmlandProfessions[Math.floor(rand() * farmlandProfessions.length)];
  }

  // Calculate building height using the same formula as Environment.tsx
  const height = getBuildingHeight(
    {
      id: `bld-${x}-${z}`,
      type,
      ownerName,
      ownerAge,
      ownerProfession,
      ownerGender,
      position: [x, 0, z],
      sizeScale,
      storyCount: 1,
      doorSide: 0,
      hasSymmetricalWindows: false,
      district
    },
    district
  );

  // Determine story count based on building height
  // 1 story: < 6, 2 stories: 6-10, 3 stories: >= 10
  let storyCount: 1 | 2 | 3 = height < 6 ? 1 : height < 10 ? 2 : 3;
  if (district === 'HOVELS') {
    // Poor quarter: Always single-story cramped dwellings and small shops
    storyCount = 1;
  } else if (district === 'WEALTHY' && (type === BuildingType.RESIDENTIAL || type === BuildingType.COMMERCIAL)) {
    // Wealthy mansions are 2-3 stories
    storyCount = height > 12 ? 3 : 2;
  }

  // HOSPITALITY buildings (inns, funduqs, khans, wakalas) need 2-3 stories for guest rooms upstairs
  if (type === BuildingType.HOSPITALITY) {
    storyCount = height > 10 ? 3 : 2; // Force minimum 2 stories, 3 for taller buildings
  }

  // Adjust footprint based on story count: 3-story buildings are ~10% wider
  let footprintScale = storyCount === 3 ? sizeScale * 1.1 : storyCount === 2 ? sizeScale * 1.05 : sizeScale;
  if (district === 'WEALTHY' && (type === BuildingType.RESIDENTIAL || type === BuildingType.COMMERCIAL)) {
    footprintScale *= 2.0;  // 50% larger than before (was 1.35)
  }

  const wealthyCourtyardEligible = district === 'WEALTHY' && (type === BuildingType.RESIDENTIAL || type === BuildingType.COMMERCIAL);
  const hasCourtyard = wealthyCourtyardEligible && rand() > 0.35;
  const courtyardScale = hasCourtyard ? 0.52 + rand() * 0.08 : undefined;
  if (hasCourtyard) {
    footprintScale *= 1.2;
  }

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
  } else if (type === BuildingType.SCHOOL) {
    footprintScale = sizeScale * 1.2;
  } else if (type === BuildingType.MEDICAL) {
    footprintScale = sizeScale * 1.05;
  } else if (type === BuildingType.HOSPITALITY) {
    footprintScale = sizeScale * 1.1;
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
    isPointOfInterest: type === BuildingType.RELIGIOUS || type === BuildingType.CIVIC || type === BuildingType.SCHOOL || type === BuildingType.MEDICAL || rand() > 0.985,
    isQuarantined: type === BuildingType.RESIDENTIAL && rand() > 0.965,
    isOpen: type !== BuildingType.RESIDENTIAL ? true : rand() > 0.25,
    district, // Include district for styling
    hasCourtyard,
    courtyardScale
  };
};
