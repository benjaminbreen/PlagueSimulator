import { MedicalTreatment, MedicalEstablishmentType, PlagueType } from '../types';

// Medical treatments available in 14th century Damascus
// Based on Galenic/Unani medical tradition practiced in Islamic world
export const MEDICAL_TREATMENTS: MedicalTreatment[] = [
  {
    id: 'bloodletting',
    nameEn: 'Bloodletting',
    nameAr: 'فَصْد',
    transliteration: 'Faṣd',
    description: 'Release of corrupt blood to restore humoral balance. The physician opens a vein in the arm or leg to draw out the "bad blood" causing illness.',
    cost: 15,
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -8 },
      { type: 'debuff', stat: 'weakness', value: 12 }
    ],
    riskLevel: 'low',
    riskDescription: 'Minor risk of infection at incision site',
    successChance: 85,
    requirements: {
      maxWeakness: 75 // Too dangerous if already very weak
    },
    availableAt: ['barber', 'physician', 'bimaristan']
  },
  {
    id: 'cupping',
    nameEn: 'Cupping',
    nameAr: 'حِجَامَة',
    transliteration: 'Ḥijāma',
    description: 'Heated glass cups placed on the skin create suction, drawing out corrupted humors. A gentler alternative to bloodletting, particularly favored in prophetic medicine.',
    cost: 12,
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -5 },
      { type: 'debuff', stat: 'weakness', value: 8 },
      { type: 'plagueProtection', value: 15, duration: 2 } // 15% protection for 2 hours
    ],
    riskLevel: 'low',
    riskDescription: 'May leave temporary bruising',
    successChance: 90,
    availableAt: ['barber', 'physician', 'bimaristan']
  },
  {
    id: 'lancing',
    nameEn: 'Lancing the Bubo',
    nameAr: 'بَضْع الدُّمَّل',
    transliteration: "Baḍ' al-Dummal",
    description: 'The swollen plague bubo is pierced with a sharp blade to drain the poisonous matter within. Extremely painful but can dramatically improve survival if the bubo has not yet corrupted the blood.',
    cost: 25,
    effects: [
      { type: 'symptomRelief', stat: 'buboes', value: -30 },
      { type: 'symptomRelief', stat: 'survivalChance', value: 25 }
    ],
    riskLevel: 'high',
    riskDescription: 'Intense pain; risk of uncontrolled bleeding; may spread infection if performed incorrectly',
    successChance: 60,
    requirements: {
      minBuboes: 50,  // Bubo must be sufficiently developed
      maxWeakness: 60 // Patient must be strong enough
    },
    availableAt: ['physician', 'bimaristan']
  },
  {
    id: 'cauterization',
    nameEn: 'Cauterization',
    nameAr: 'كَيّ',
    transliteration: 'Kayy',
    description: 'A heated iron is applied to gangrenous tissue to burn away the corruption and seal the wound. The treatment of last resort, invoking the prophetic saying that cauterization is "one of the best remedies."',
    cost: 30,
    effects: [
      { type: 'symptomRelief', stat: 'gangrene', value: -40 },
      { type: 'symptomRelief', stat: 'skinBleeding', value: -20 },
      { type: 'debuff', stat: 'weakness', value: 25 }
    ],
    riskLevel: 'high',
    riskDescription: 'Severe pain; permanent scarring; risk of shock',
    successChance: 55,
    requirements: {
      hasGangrene: true,
      maxWeakness: 50 // Must be strong enough to survive the procedure
    },
    availableAt: ['physician', 'bimaristan']
  },
  {
    id: 'purging',
    nameEn: 'Purging',
    nameAr: 'إِسْهَال',
    transliteration: "Is'hāl",
    description: 'A powerful purgative is administered to expel corrupt humors through the bowels. The patient drinks a bitter concoction of senna and other cathartics.',
    cost: 10,
    effects: [
      { type: 'symptomRelief', stat: 'delirium', value: -15 },
      { type: 'symptomRelief', stat: 'fever', value: -5 },
      { type: 'debuff', stat: 'weakness', value: 20 }
    ],
    riskLevel: 'medium',
    riskDescription: 'Dehydration; may weaken already frail patients',
    successChance: 75,
    requirements: {
      maxWeakness: 65
    },
    availableAt: ['barber', 'physician', 'bimaristan']
  },
  {
    id: 'theriac_admin',
    nameEn: 'Theriac Administration',
    nameAr: 'تِرْيَاق',
    transliteration: 'Tiryāq',
    description: 'The legendary universal antidote, compounded from dozens of rare ingredients according to ancient formulas. The physician administers a carefully measured dose with prayers for the patient\'s recovery.',
    cost: 80,
    effects: [
      { type: 'symptomRelief', stat: 'all', value: -15 },
      { type: 'symptomRelief', stat: 'survivalChance', value: 10 }
    ],
    riskLevel: 'none',
    successChance: 95,
    availableAt: ['physician', 'bimaristan']
  },
  {
    id: 'fumigation',
    nameEn: 'Fumigation',
    nameAr: 'تَبْخِير',
    transliteration: 'Tabkhīr',
    description: 'Aromatic substances are burned to purify the corrupt air believed to carry disease. Frankincense, myrrh, sandalwood, and camphor fill the room with fragrant smoke, driving out the pestilential miasma.',
    cost: 8,
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -3 },
      { type: 'symptomRelief', stat: 'delirium', value: -5 },
      { type: 'plagueProtection', value: 10, duration: 4 } // 10% protection for 4 hours
    ],
    riskLevel: 'none',
    riskDescription: 'No physical risk; smoke may irritate the lungs',
    successChance: 85,
    availableAt: ['barber', 'physician', 'bimaristan']
  },
  {
    id: 'leeches',
    nameEn: 'Leech Therapy',
    nameAr: 'عَلَق',
    transliteration: 'ʿAlaq',
    description: 'Living leeches are applied to draw out corrupted blood more gently than the lancet. The creatures\' natural anesthetic makes the procedure nearly painless, and their anticoagulant saliva ensures thorough drainage.',
    cost: 18,
    effects: [
      { type: 'symptomRelief', stat: 'fever', value: -6 },
      { type: 'symptomRelief', stat: 'buboes', value: -5 },
      { type: 'debuff', stat: 'weakness', value: 8 }
    ],
    riskLevel: 'low',
    riskDescription: 'Minor blood loss; rare infection at bite sites',
    successChance: 88,
    requirements: {
      maxWeakness: 80 // Safer than bloodletting for weak patients
    },
    availableAt: ['barber', 'physician', 'bimaristan']
  },
  {
    id: 'poultice',
    nameEn: 'Poultice Application',
    nameAr: 'ضِمَاد',
    transliteration: 'Ḍimād',
    description: 'A warm poultice of figs, onions, and healing herbs is applied directly to the swollen bubo. The mixture draws out the poisonous matter, softening the tumor and encouraging drainage without the knife.',
    cost: 6,
    effects: [
      { type: 'symptomRelief', stat: 'buboes', value: -8 },
      { type: 'symptomRelief', stat: 'fever', value: -2 }
    ],
    riskLevel: 'none',
    riskDescription: 'No significant risk; may cause minor skin irritation',
    successChance: 75,
    requirements: {
      minBuboes: 20 // Need visible swelling to treat
    },
    availableAt: ['barber', 'physician', 'bimaristan']
  }
];

// Get treatment by ID
export const getTreatmentById = (id: string): MedicalTreatment | undefined => {
  return MEDICAL_TREATMENTS.find(t => t.id === id);
};

// Get treatments available at a specific establishment type
export const getTreatmentsForEstablishment = (type: MedicalEstablishmentType): MedicalTreatment[] => {
  return MEDICAL_TREATMENTS.filter(t => t.availableAt.includes(type));
};

// Establishment info for UI
export interface EstablishmentInfo {
  type: MedicalEstablishmentType;
  nameEn: string;
  nameAr: string;
  transliteration: string;
  description: string;
  priceModifier: number;  // Multiplier on treatment costs
  efficacyBonus: number;  // Added to success chance
}

export const ESTABLISHMENTS: Record<MedicalEstablishmentType, EstablishmentInfo> = {
  barber: {
    type: 'barber',
    nameEn: 'Barber-Surgeon',
    nameAr: 'حَلَّاق',
    transliteration: 'Ḥallāq',
    description: 'A skilled barber who also performs minor surgical procedures. Common folk often seek treatment here.',
    priceModifier: 1.0,
    efficacyBonus: 0
  },
  physician: {
    type: 'physician',
    nameEn: 'Physician',
    nameAr: 'حَكِيم',
    transliteration: 'Ḥakīm',
    description: 'A learned doctor trained in the Galenic tradition. Commands higher fees but offers superior care.',
    priceModifier: 1.3,
    efficacyBonus: 10
  },
  bimaristan: {
    type: 'bimaristan',
    nameEn: 'Hospital',
    nameAr: 'بِيمَارِسْتَان',
    transliteration: 'Bīmāristān',
    description: 'A charitable hospital endowed by wealthy patrons. Offers reduced costs and professional care.',
    priceModifier: 0.8,
    efficacyBonus: 5
  }
};

// Calculate treatment efficacy based on plague stage
// Early treatment is more effective; late-stage treatment has diminishing returns
export const getEfficacyMultiplier = (daysInfected: number, plagueType: PlagueType): number => {
  if (plagueType === PlagueType.SEPTICEMIC) return 0.3; // Almost nothing helps
  if (plagueType === PlagueType.PNEUMONIC) {
    if (daysInfected <= 1) return 1.2;
    if (daysInfected <= 2) return 0.7;
    return 0.3;
  }
  // Bubonic - more time to treat
  if (daysInfected <= 2) return 1.3;  // Early intervention bonus
  if (daysInfected <= 4) return 1.0;  // Normal efficacy
  if (daysInfected <= 6) return 0.6;  // Diminishing returns
  return 0.3;                          // Crisis - palliative only
};

// Check if patient meets treatment requirements
export const canReceiveTreatment = (
  treatment: MedicalTreatment,
  plagueStatus: { buboes: number; weakness: number; gangrene: number }
): { canReceive: boolean; reason?: string } => {
  const req = treatment.requirements;
  if (!req) return { canReceive: true };

  if (req.minBuboes !== undefined && plagueStatus.buboes < req.minBuboes) {
    return { canReceive: false, reason: `Buboes not developed enough (need ${req.minBuboes}%, have ${Math.round(plagueStatus.buboes)}%)` };
  }
  if (req.maxWeakness !== undefined && plagueStatus.weakness > req.maxWeakness) {
    return { canReceive: false, reason: `Patient too weak for this treatment (weakness: ${Math.round(plagueStatus.weakness)}%)` };
  }
  if (req.hasGangrene && plagueStatus.gangrene < 10) {
    return { canReceive: false, reason: 'No gangrenous tissue requiring cauterization' };
  }

  return { canReceive: true };
};

// Apply treatment effects to plague status (with efficacy modifier)
export const applyTreatmentEffects = (
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
  treatment: MedicalTreatment,
  efficacyMultiplier: number,
  establishmentType: MedicalEstablishmentType
): {
  newStatus: typeof plagueStatus;
  success: boolean;
  message: string
} => {
  const establishment = ESTABLISHMENTS[establishmentType];
  const baseSuccessChance = treatment.successChance + establishment.efficacyBonus;
  const roll = Math.random() * 100;
  const success = roll < baseSuccessChance;

  if (!success) {
    // Failed treatment - apply partial negative effects without benefits
    const weaknessEffect = treatment.effects.find(e => e.type === 'debuff' && e.stat === 'weakness');
    if (weaknessEffect) {
      const newStatus = {
        ...plagueStatus,
        weakness: Math.min(100, plagueStatus.weakness + (weaknessEffect.value * 0.5))
      };
      return {
        newStatus,
        success: false,
        message: `The ${treatment.nameEn} failed. The patient weakens from the ordeal.`
      };
    }
    return {
      newStatus: plagueStatus,
      success: false,
      message: `The ${treatment.nameEn} had no effect.`
    };
  }

  // Successful treatment - apply all effects
  const newStatus = { ...plagueStatus };
  const effectDescriptions: string[] = [];

  for (const effect of treatment.effects) {
    if (effect.type === 'symptomRelief' && effect.stat) {
      const adjustedValue = effect.value * efficacyMultiplier;

      if (effect.stat === 'all') {
        // Apply to all symptoms
        newStatus.fever = Math.max(0, newStatus.fever + adjustedValue);
        newStatus.weakness = Math.max(0, newStatus.weakness + adjustedValue);
        newStatus.buboes = Math.max(0, newStatus.buboes + adjustedValue);
        newStatus.coughingBlood = Math.max(0, newStatus.coughingBlood + adjustedValue);
        newStatus.delirium = Math.max(0, newStatus.delirium + adjustedValue);
        effectDescriptions.push('All symptoms relieved');
      } else if (effect.stat === 'survivalChance') {
        newStatus.survivalChance = Math.min(100, newStatus.survivalChance + adjustedValue);
        effectDescriptions.push(`Survival chance improved`);
      } else {
        const statKey = effect.stat as keyof typeof newStatus;
        if (statKey in newStatus) {
          (newStatus as any)[statKey] = Math.max(0, Math.min(100, (newStatus as any)[statKey] + adjustedValue));
          effectDescriptions.push(`${effect.stat} ${adjustedValue < 0 ? 'reduced' : 'increased'}`);
        }
      }
    } else if (effect.type === 'debuff' && effect.stat === 'weakness') {
      newStatus.weakness = Math.min(100, newStatus.weakness + effect.value);
    }
  }

  return {
    newStatus,
    success: true,
    message: `The ${treatment.nameEn} was successful. ${effectDescriptions.join('. ')}.`
  };
};

// ============================================
// DETAILED TREATMENT OUTCOME SYSTEM
// ============================================

export type OutcomeLevel = 'remarkable' | 'success' | 'partial' | 'failure' | 'complication';

export interface ProceduralDetail {
  label: string;
  value: string;
  icon?: 'blood' | 'time' | 'cups' | 'blade' | 'iron' | 'medicine' | 'prayer';
}

export interface TreatmentOutcome {
  treatmentId: string;
  treatmentName: string;
  treatmentNameAr: string;
  transliteration: string;
  outcomeLevel: OutcomeLevel;
  title: string;
  titleAr: string;
  description: string;
  flavorText: string;
  proceduralDetails: ProceduralDetail[];
  effectsSummary: {
    stat: string;
    change: number;
    label: string;
  }[];
  newPlagueStatus: {
    fever: number;
    weakness: number;
    buboes: number;
    coughingBlood: number;
    delirium: number;
    skinBleeding: number;
    gangrene: number;
    survivalChance: number;
  };
  practitionerComment: string;
  cost: number;
}

// Procedural detail generators for each treatment
const generateBloodlettingDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const bloodAmount = outcomeLevel === 'remarkable' ? Math.floor(180 + Math.random() * 60) :
                      outcomeLevel === 'success' ? Math.floor(120 + Math.random() * 60) :
                      outcomeLevel === 'partial' ? Math.floor(80 + Math.random() * 40) :
                      Math.floor(40 + Math.random() * 40);

  const duration = outcomeLevel === 'remarkable' ? Math.floor(12 + Math.random() * 8) :
                   outcomeLevel === 'success' ? Math.floor(8 + Math.random() * 6) :
                   Math.floor(4 + Math.random() * 4);

  const veins = ['median cubital', 'cephalic', 'basilic'];
  const selectedVein = veins[Math.floor(Math.random() * veins.length)];

  const incisionTypes = ['single clean incision', 'two parallel cuts', 'swift puncture'];
  const incision = incisionTypes[Math.floor(Math.random() * incisionTypes.length)];

  return [
    { label: 'Blood drawn', value: `${bloodAmount} drams (~${Math.round(bloodAmount * 3.9)}ml)`, icon: 'blood' },
    { label: 'Duration', value: `${duration} minutes`, icon: 'time' },
    { label: 'Vein accessed', value: `${selectedVein} vein`, icon: 'blade' },
    { label: 'Technique', value: incision, icon: 'blade' },
    { label: 'Bandaging', value: success ? 'Clean linen compress applied' : 'Bleeding difficult to staunch', icon: 'blood' }
  ];
};

const generateCuppingDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const cupCount = outcomeLevel === 'remarkable' ? Math.floor(5 + Math.random() * 3) :
                   outcomeLevel === 'success' ? Math.floor(4 + Math.random() * 2) :
                   Math.floor(2 + Math.random() * 2);

  const duration = Math.floor(15 + Math.random() * 15);

  const placements = ['upper back', 'between shoulder blades', 'lower back', 'along the spine'];
  const placement = placements[Math.floor(Math.random() * placements.length)];

  const suctionStrength = outcomeLevel === 'remarkable' ? 'strong and even' :
                          outcomeLevel === 'success' ? 'adequate' :
                          outcomeLevel === 'partial' ? 'weak in places' : 'poor suction achieved';

  return [
    { label: 'Cups applied', value: `${cupCount} glass cups`, icon: 'cups' },
    { label: 'Duration', value: `${duration} minutes`, icon: 'time' },
    { label: 'Placement', value: placement, icon: 'cups' },
    { label: 'Suction quality', value: suctionStrength, icon: 'cups' },
    { label: 'Skin response', value: success ? 'Healthy reddening observed' : 'Minimal response', icon: 'blood' }
  ];
};

const generateLancingDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const drainageAmount = outcomeLevel === 'remarkable' ? 'copious purulent drainage' :
                         outcomeLevel === 'success' ? 'significant drainage' :
                         outcomeLevel === 'partial' ? 'moderate drainage' :
                         'minimal drainage';

  const buboSize = ['walnut-sized', 'egg-sized', 'fig-sized'][Math.floor(Math.random() * 3)];
  const incisionLength = Math.floor(8 + Math.random() * 12);

  const complications = success ? 'None observed' :
                        outcomeLevel === 'complication' ? 'Excessive bleeding' : 'Bubo not fully drained';

  return [
    { label: 'Bubo size', value: buboSize, icon: 'blade' },
    { label: 'Incision', value: `${incisionLength}mm cruciform cut`, icon: 'blade' },
    { label: 'Drainage', value: drainageAmount, icon: 'blood' },
    { label: 'Poultice', value: 'Honey and myrrh applied', icon: 'medicine' },
    { label: 'Complications', value: complications, icon: 'blade' }
  ];
};

const generateCauterizationDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const ironTemp = ['white-hot', 'cherry-red', 'glowing orange'][Math.floor(Math.random() * 3)];
  const applications = outcomeLevel === 'remarkable' ? Math.floor(2 + Math.random() * 2) :
                       outcomeLevel === 'success' ? Math.floor(3 + Math.random() * 2) :
                       Math.floor(4 + Math.random() * 3);

  const tissueState = success ? 'Necrotic tissue fully sealed' : 'Some necrosis remains';

  return [
    { label: 'Iron temperature', value: ironTemp, icon: 'iron' },
    { label: 'Applications', value: `${applications} careful applications`, icon: 'iron' },
    { label: 'Tissue sealed', value: tissueState, icon: 'blood' },
    { label: 'Dressing', value: 'Olive oil and clean linen', icon: 'medicine' },
    { label: 'Patient response', value: success ? 'Tolerated procedure' : 'Great distress observed', icon: 'time' }
  ];
};

const generatePurgingDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const dosage = outcomeLevel === 'remarkable' ? 'precise therapeutic dose' :
                 outcomeLevel === 'success' ? 'standard dose' :
                 outcomeLevel === 'partial' ? 'mild dose' : 'insufficient dose';

  const purgations = outcomeLevel === 'remarkable' ? Math.floor(4 + Math.random() * 3) :
                     outcomeLevel === 'success' ? Math.floor(3 + Math.random() * 2) :
                     Math.floor(1 + Math.random() * 2);

  const ingredients = ['senna leaves', 'cassia', 'rhubarb root', 'scammony'];
  const mainIngredient = ingredients[Math.floor(Math.random() * ingredients.length)];

  return [
    { label: 'Purgative', value: `Compound with ${mainIngredient}`, icon: 'medicine' },
    { label: 'Dosage', value: dosage, icon: 'medicine' },
    { label: 'Purgations', value: `${purgations} evacuations over 2 hours`, icon: 'time' },
    { label: 'Hydration', value: 'Barley water administered', icon: 'medicine' },
    { label: 'Humoral response', value: success ? 'Yellow bile expelled' : 'Limited effect observed', icon: 'blood' }
  ];
};

const generateTheriakDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const age = Math.floor(5 + Math.random() * 15);
  const dosage = outcomeLevel === 'remarkable' ? 'full drachm' :
                 outcomeLevel === 'success' ? 'half drachm' : 'quarter drachm';

  const preparations = ['dissolved in wine', 'mixed with honey', 'in rose water'];
  const preparation = preparations[Math.floor(Math.random() * preparations.length)];

  const prayerRecited = ['Surah Al-Fatiha', 'healing invocations', 'Bismillah'];
  const prayer = prayerRecited[Math.floor(Math.random() * prayerRecited.length)];

  return [
    { label: 'Theriac age', value: `${age} years matured`, icon: 'medicine' },
    { label: 'Dosage', value: dosage, icon: 'medicine' },
    { label: 'Preparation', value: preparation, icon: 'medicine' },
    { label: 'Prayer recited', value: prayer, icon: 'prayer' },
    { label: 'Patient response', value: success ? 'Warmth spreads through body' : 'No immediate effect', icon: 'time' }
  ];
};

const generateFumigationDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const aromatics = [
    'frankincense and myrrh',
    'sandalwood and camphor',
    'aloe wood and ambergris',
    'benzoin and mastic'
  ];
  const aromatic = aromatics[Math.floor(Math.random() * aromatics.length)];

  const duration = outcomeLevel === 'remarkable' ? Math.floor(25 + Math.random() * 15) :
                   outcomeLevel === 'success' ? Math.floor(15 + Math.random() * 10) :
                   Math.floor(8 + Math.random() * 7);

  const intensity = outcomeLevel === 'remarkable' ? 'thick, fragrant clouds' :
                    outcomeLevel === 'success' ? 'steady aromatic smoke' :
                    outcomeLevel === 'partial' ? 'thin wisps of smoke' : 'barely visible fumes';

  const brazierTypes = ['brass brazier', 'ceramic censer', 'silver incense burner'];
  const brazier = brazierTypes[Math.floor(Math.random() * brazierTypes.length)];

  return [
    { label: 'Aromatics', value: aromatic, icon: 'medicine' },
    { label: 'Duration', value: `${duration} minutes`, icon: 'time' },
    { label: 'Smoke density', value: intensity, icon: 'medicine' },
    { label: 'Vessel', value: brazier, icon: 'cups' },
    { label: 'Air quality', value: success ? 'Sweet fragrance pervades' : 'Smoke dissipates quickly', icon: 'prayer' }
  ];
};

const generateLeechDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const leechCount = outcomeLevel === 'remarkable' ? Math.floor(5 + Math.random() * 3) :
                     outcomeLevel === 'success' ? Math.floor(3 + Math.random() * 2) :
                     Math.floor(2 + Math.random() * 2);

  const duration = Math.floor(20 + Math.random() * 20);

  const placements = ['inner arm', 'behind the ears', 'temples', 'near the swelling'];
  const placement = placements[Math.floor(Math.random() * placements.length)];

  const bloodDrawn = outcomeLevel === 'remarkable' ? Math.floor(40 + Math.random() * 20) :
                     outcomeLevel === 'success' ? Math.floor(25 + Math.random() * 15) :
                     Math.floor(10 + Math.random() * 15);

  const leechBehavior = success ? 'Fed well and detached naturally' :
                        outcomeLevel === 'complication' ? 'Difficult to detach' : 'Poor attachment';

  return [
    { label: 'Leeches applied', value: `${leechCount} medicinal leeches`, icon: 'blood' },
    { label: 'Duration', value: `${duration} minutes`, icon: 'time' },
    { label: 'Placement', value: placement, icon: 'blade' },
    { label: 'Blood drawn', value: `~${bloodDrawn} drams`, icon: 'blood' },
    { label: 'Leech behavior', value: leechBehavior, icon: 'medicine' }
  ];
};

const generatePoulticeDetails = (success: boolean, outcomeLevel: OutcomeLevel): ProceduralDetail[] => {
  const ingredients = [
    'mashed figs and onion',
    'honey, bread, and mustard seed',
    'theriac-infused clay',
    'lily root and lard',
    'roasted onion and butter'
  ];
  const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];

  const duration = Math.floor(2 + Math.random() * 4);
  const temperature = ['warm', 'hot', 'steaming'][Math.floor(Math.random() * 3)];

  const applications = outcomeLevel === 'remarkable' ? Math.floor(3 + Math.random() * 2) :
                       outcomeLevel === 'success' ? Math.floor(2 + Math.random() * 2) :
                       Math.floor(1 + Math.random() * 1);

  const swellingResponse = success ? 'Softening observed' :
                           outcomeLevel === 'partial' ? 'Minimal change' : 'Bubo remains hard';

  return [
    { label: 'Composition', value: ingredient, icon: 'medicine' },
    { label: 'Temperature', value: `${temperature} application`, icon: 'iron' },
    { label: 'Duration', value: `${duration} hours per application`, icon: 'time' },
    { label: 'Applications', value: `${applications} poultices applied`, icon: 'medicine' },
    { label: 'Response', value: swellingResponse, icon: 'blood' }
  ];
};

// Outcome titles and flavor text by treatment and level
const OUTCOME_FLAVOR: Record<string, Record<OutcomeLevel, { title: string; titleAr: string; flavor: string }>> = {
  bloodletting: {
    remarkable: {
      title: 'Exemplary Phlebotomy',
      titleAr: 'فصد مثالي',
      flavor: 'The corrupt blood flows freely, dark and thick at first, then clearing to a healthier hue. The practitioner nods with satisfaction—the humors are rebalancing.'
    },
    success: {
      title: 'Successful Bloodletting',
      titleAr: 'فصد ناجح',
      flavor: 'The vein is opened cleanly and the bad blood released. You feel somewhat weakened but your fever begins to subside.'
    },
    partial: {
      title: 'Partial Success',
      titleAr: 'نجاح جزئي',
      flavor: 'The bloodletting proceeds adequately, though the practitioner struggles to maintain proper flow. Some benefit is achieved, but less than hoped.'
    },
    failure: {
      title: 'Failed Phlebotomy',
      titleAr: 'فصد فاشل',
      flavor: 'The vein collapses before sufficient blood is drawn. The practitioner mutters about the difficulty and binds the wound. You feel only weakness from the attempt.'
    },
    complication: {
      title: 'Bleeding Complication',
      titleAr: 'مضاعفات النزيف',
      flavor: 'The incision bleeds more than intended. The practitioner presses firmly to staunch the flow, leaving you pale and trembling. The treatment has done more harm than good.'
    }
  },
  cupping: {
    remarkable: {
      title: 'Perfect Ḥijāma',
      titleAr: 'حجامة مثالية',
      flavor: 'The heated cups create powerful suction, drawing dark discoloration to the surface. The corrupted humors are visibly pulled from deep within. You feel a profound sense of relief.'
    },
    success: {
      title: 'Successful Cupping',
      titleAr: 'حجامة ناجحة',
      flavor: 'The cups draw out the stagnant humors effectively. Circular marks bloom on your skin—signs of the healing process. Your body feels lighter.'
    },
    partial: {
      title: 'Modest Benefit',
      titleAr: 'فائدة متواضعة',
      flavor: 'Some cups lose suction before the treatment completes. The practitioner reapplies them, but the effect is diminished. Still, some relief is gained.'
    },
    failure: {
      title: 'Ineffective Treatment',
      titleAr: 'علاج غير فعال',
      flavor: 'The cups fail to maintain proper suction. Perhaps the fire was not hot enough, or your skin too moist. Little benefit is achieved.'
    },
    complication: {
      title: 'Burning Incident',
      titleAr: 'حادث حرق',
      flavor: 'One cup is applied too hot, leaving a painful burn. The practitioner apologizes profusely while applying salve. The treatment provides no benefit.'
    }
  },
  lancing: {
    remarkable: {
      title: 'Masterful Incision',
      titleAr: 'شق بارع',
      flavor: 'The blade finds the perfect depth. Foul matter pours forth as the bubo deflates dramatically. The pressure that has been building for days is finally released. You may yet survive this plague.'
    },
    success: {
      title: 'Successful Drainage',
      titleAr: 'تصريف ناجح',
      flavor: 'The bubo is lanced with skill. Thick, malodorous pus drains away, and the swelling visibly decreases. The pain is immense but your chances improve.'
    },
    partial: {
      title: 'Partial Drainage',
      titleAr: 'تصريف جزئي',
      flavor: 'The incision reaches the bubo but only partial drainage is achieved. The swelling remains significant. A second procedure may be needed.'
    },
    failure: {
      title: 'Failed Procedure',
      titleAr: 'إجراء فاشل',
      flavor: 'The blade fails to reach the infected core. The bubo remains swollen and painful, the poison still trapped within. The ordeal has left you weaker.'
    },
    complication: {
      title: 'Severe Hemorrhage',
      titleAr: 'نزيف حاد',
      flavor: 'The blade strikes a blood vessel. Dark blood mixes with pus as the practitioner struggles to control the flow. You grow faint from blood loss.'
    }
  },
  cauterization: {
    remarkable: {
      title: 'Precise Cautery',
      titleAr: 'كي دقيق',
      flavor: 'The red-hot iron is applied with surgical precision. The gangrenous tissue sizzles and seals, the corruption halted in its tracks. The pain is beyond words, but the rot will spread no further.'
    },
    success: {
      title: 'Successful Cautery',
      titleAr: 'كي ناجح',
      flavor: 'The heated iron burns away the dead flesh. Smoke rises as healthy tissue is sealed. You will bear the scars, but the gangrene has been stopped.'
    },
    partial: {
      title: 'Incomplete Sealing',
      titleAr: 'ختم غير مكتمل',
      flavor: 'Some gangrenous tissue is cauterized, but edges remain unsealed. The practitioner hesitates to apply more heat to your already traumatized flesh.'
    },
    failure: {
      title: 'Insufficient Treatment',
      titleAr: 'علاج غير كافٍ',
      flavor: 'The iron cools too quickly, failing to seal the wound properly. The gangrene may continue to spread despite this agonizing attempt.'
    },
    complication: {
      title: 'Shock and Collapse',
      titleAr: 'صدمة وانهيار',
      flavor: 'The pain overwhelms you. Your body trembles uncontrollably and consciousness wavers. The practitioner stops, fearing you cannot survive more.'
    }
  },
  purging: {
    remarkable: {
      title: 'Complete Evacuation',
      titleAr: 'إخلاء كامل',
      flavor: 'The purgative works powerfully. Over the following hours, your body expels vast quantities of corrupted matter. Though exhausting, you feel the delirium clearing from your mind.'
    },
    success: {
      title: 'Effective Purging',
      titleAr: 'تطهير فعال',
      flavor: 'The bitter draught does its work. Multiple evacuations follow, leaving you drained but clearer of mind. The excess humors have been expelled.'
    },
    partial: {
      title: 'Mild Effect',
      titleAr: 'تأثير خفيف',
      flavor: 'The purgative produces only modest effect. Perhaps your constitution resisted, or the dose was insufficient. Some benefit is gained, but less than hoped.'
    },
    failure: {
      title: 'No Effect',
      titleAr: 'بدون تأثير',
      flavor: 'Despite the bitter taste, the purgative fails to produce the desired effect. Your body refuses to cooperate with the treatment.'
    },
    complication: {
      title: 'Severe Dehydration',
      titleAr: 'جفاف شديد',
      flavor: 'The purgative is too strong. Violent evacuations leave you desperately weak and parched. The practitioner hurries to provide fluids, but damage is done.'
    }
  },
  theriac_admin: {
    remarkable: {
      title: 'Miraculous Response',
      titleAr: 'استجابة معجزة',
      flavor: 'The legendary antidote spreads warmth through your veins. Color returns to your cheeks, and the weight of illness seems to lift. The theriac has lived up to its ancient reputation.'
    },
    success: {
      title: 'Beneficial Effect',
      titleAr: 'تأثير مفيد',
      flavor: 'The precious compound settles in your stomach, radiating gentle heat. Your symptoms begin to ease, and hope returns. The investment was worthwhile.'
    },
    partial: {
      title: 'Modest Improvement',
      titleAr: 'تحسن متواضع',
      flavor: 'The theriac provides some relief, though less dramatic than hoped. Perhaps the compound was not aged long enough, or your illness too advanced.'
    },
    failure: {
      title: 'No Discernible Effect',
      titleAr: 'بدون تأثير ملموس',
      flavor: 'The expensive remedy produces no noticeable change. Was it counterfeit? Improperly prepared? Or is your condition simply beyond its power?'
    },
    complication: {
      title: 'Adverse Reaction',
      titleAr: 'رد فعل سلبي',
      flavor: 'Your stomach rebels against the complex compound. Nausea overwhelms you, and you cannot keep the medicine down. The precious theriac is wasted.'
    }
  },
  fumigation: {
    remarkable: {
      title: 'Purifying Vapors',
      titleAr: 'أبخرة مطهرة',
      flavor: 'The fragrant smoke fills every corner of the room, driving out the pestilential miasma. You breathe deeply of frankincense and myrrh, feeling the corrupt air flee before these holy aromatics. Your mind clears remarkably.'
    },
    success: {
      title: 'Sweet Cleansing',
      titleAr: 'تطهير عطري',
      flavor: 'Aromatic smoke swirls through the chamber as ancient resins crackle on the coals. The sickroom air transforms, heavy with sandalwood and camphor. You feel a measure of peace settle over you.'
    },
    partial: {
      title: 'Mild Improvement',
      titleAr: 'تحسن طفيف',
      flavor: 'The incense burns steadily, though the smoke seems thin today. Some relief comes from the pleasant fragrance, but the heavy miasma of illness remains.'
    },
    failure: {
      title: 'Insufficient Fumigation',
      titleAr: 'تبخير غير كافٍ',
      flavor: 'The aromatics fail to catch properly, producing only feeble wisps of smoke. The corrupt air remains, unmoved by this halfhearted attempt at purification.'
    },
    complication: {
      title: 'Choking Smoke',
      titleAr: 'دخان خانق',
      flavor: 'The smoke grows too thick, catching in your throat and stinging your eyes. Coughing fits wrack your weakened frame. The treatment meant to help has only added to your distress.'
    }
  },
  leeches: {
    remarkable: {
      title: 'Perfect Attachment',
      titleAr: 'التصاق مثالي',
      flavor: 'The leeches find the precise points where corrupt blood pools beneath the skin. They feed slowly and thoroughly, their natural physick drawing out the poison. When they detach, engorged and satisfied, you feel remarkably lighter.'
    },
    success: {
      title: 'Successful Leeching',
      titleAr: 'علاج بالعلق ناجح',
      flavor: 'The medicinal creatures attach with their characteristic gentleness. You barely feel their tiny mouths at work as they draw out the corrupted blood. A sense of relief follows as they fall away, their work complete.'
    },
    partial: {
      title: 'Modest Drainage',
      titleAr: 'تصريف متواضع',
      flavor: 'Some of the leeches attach well, but others fall away before properly feeding. The treatment provides partial benefit—the humors are somewhat balanced, though not fully corrected.'
    },
    failure: {
      title: 'Poor Attachment',
      titleAr: 'التصاق ضعيف',
      flavor: 'The leeches refuse to attach properly, perhaps sensing something wrong in your blood. The practitioner tries multiple times, but the creatures will not cooperate. Little is accomplished.'
    },
    complication: {
      title: 'Excessive Bleeding',
      titleAr: 'نزيف مفرط',
      flavor: 'The leech bites continue to bleed long after the creatures are removed. The practitioner presses cloths to the wounds, but you grow pale from the unexpected blood loss.'
    }
  },
  poultice: {
    remarkable: {
      title: 'Drawing Forth the Poison',
      titleAr: 'سحب السم',
      flavor: 'The warm poultice works wonders upon the angry bubo. Beneath your skin, you feel the swelling soften and shift. When the dressing is changed, the corruption has visibly drawn toward the surface. Nature and medicine work together toward healing.'
    },
    success: {
      title: 'Soothing Application',
      titleAr: 'تطبيق مهدئ',
      flavor: 'The heated mixture of figs and herbs spreads comforting warmth over the painful swelling. Hour by hour, the bubo softens slightly. The poultice does its quiet work of drawing out the poison.'
    },
    partial: {
      title: 'Slight Softening',
      titleAr: 'تليين طفيف',
      flavor: 'The poultice provides some comfort, though the bubo remains largely unchanged. Perhaps more applications will be needed, or the swelling is too deep for this remedy alone.'
    },
    failure: {
      title: 'No Effect Observed',
      titleAr: 'لم يلاحظ أي تأثير',
      flavor: 'Despite the warm application, the bubo remains hard and unyielding. The poison within refuses to be drawn out by this gentle method. A more aggressive treatment may be required.'
    },
    complication: {
      title: 'Skin Irritation',
      titleAr: 'تهيج الجلد',
      flavor: 'The poultice ingredients prove too harsh for your feverish skin. Redness and irritation spread around the application site, adding discomfort to your already considerable suffering.'
    }
  }
};

// Practitioner comments based on outcome
const PRACTITIONER_COMMENTS: Record<OutcomeLevel, string[]> = {
  remarkable: [
    'By the grace of Allah, the treatment has exceeded my hopes.',
    'The humors have responded excellently. I am most pleased.',
    'A textbook procedure. May your recovery continue apace.',
    'The ancient texts speak true—this is how healing should proceed.'
  ],
  success: [
    'The treatment has achieved its purpose. Rest now.',
    'Allah willing, you shall recover. Follow my instructions carefully.',
    'A good result. Avoid cold foods and night air.',
    'The corruption recedes. Maintain hope and piety.'
  ],
  partial: [
    'Some improvement, though I had hoped for more. We may need to repeat the treatment.',
    'The body resists, but we have made progress. Rest and pray.',
    'Not the result I expected. Your constitution is... challenging.',
    'We have done what we can for now. Time will tell.'
  ],
  failure: [
    'I am sorry—the treatment has not taken effect. We must consider alternatives.',
    'Sometimes the body refuses our ministrations. Do not lose faith.',
    'This is... unexpected. Perhaps a different approach is needed.',
    'The humors remain imbalanced. I will consult my texts.'
  ],
  complication: [
    'I deeply regret this outcome. We must now address these complications.',
    'By Allah, I did not anticipate this. Forgive me.',
    'This is a setback, but do not despair. We will manage.',
    'The body has responded poorly. Additional care is urgently needed.'
  ]
};

// Generate detailed treatment outcome
export const generateDetailedOutcome = (
  treatment: MedicalTreatment,
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
  efficacyMultiplier: number,
  establishmentType: MedicalEstablishmentType,
  cost: number
): TreatmentOutcome => {
  const establishment = ESTABLISHMENTS[establishmentType];
  const baseSuccessChance = treatment.successChance + establishment.efficacyBonus;
  const roll = Math.random() * 100;

  // Determine outcome level with more granularity
  let outcomeLevel: OutcomeLevel;
  let effectMultiplier: number;

  if (roll < baseSuccessChance * 0.3) {
    // Remarkable success (top 30% of success range)
    outcomeLevel = 'remarkable';
    effectMultiplier = 1.5 * efficacyMultiplier;
  } else if (roll < baseSuccessChance * 0.8) {
    // Standard success
    outcomeLevel = 'success';
    effectMultiplier = 1.0 * efficacyMultiplier;
  } else if (roll < baseSuccessChance) {
    // Partial success
    outcomeLevel = 'partial';
    effectMultiplier = 0.5 * efficacyMultiplier;
  } else if (roll < baseSuccessChance + (100 - baseSuccessChance) * 0.7) {
    // Failure
    outcomeLevel = 'failure';
    effectMultiplier = 0;
  } else {
    // Complication (worst outcomes)
    outcomeLevel = 'complication';
    effectMultiplier = -0.5; // Makes things worse
  }

  // Calculate new plague status
  const newStatus = { ...plagueStatus };
  const effectsSummary: TreatmentOutcome['effectsSummary'] = [];

  for (const effect of treatment.effects) {
    if (effect.type === 'symptomRelief' && effect.stat) {
      let adjustedValue = effect.value * effectMultiplier;

      // Complications reverse beneficial effects
      if (outcomeLevel === 'complication' && adjustedValue < 0) {
        adjustedValue = Math.abs(adjustedValue) * 0.5; // Makes symptoms worse
      }

      if (effect.stat === 'all') {
        const change = adjustedValue;
        ['fever', 'weakness', 'buboes', 'coughingBlood', 'delirium'].forEach(stat => {
          const key = stat as keyof typeof newStatus;
          const oldVal = newStatus[key];
          newStatus[key] = Math.max(0, Math.min(100, oldVal + change));
          if (Math.abs(change) > 0.5) {
            effectsSummary.push({
              stat,
              change: Math.round(newStatus[key] - oldVal),
              label: stat.charAt(0).toUpperCase() + stat.slice(1)
            });
          }
        });
      } else if (effect.stat === 'survivalChance') {
        const oldVal = newStatus.survivalChance;
        newStatus.survivalChance = Math.min(100, Math.max(0, oldVal + adjustedValue));
        if (Math.abs(adjustedValue) > 0.5) {
          effectsSummary.push({
            stat: 'survivalChance',
            change: Math.round(newStatus.survivalChance - oldVal),
            label: 'Survival Chance'
          });
        }
      } else {
        const statKey = effect.stat as keyof typeof newStatus;
        if (statKey in newStatus) {
          const oldVal = newStatus[statKey];
          newStatus[statKey] = Math.max(0, Math.min(100, oldVal + adjustedValue));
          if (Math.abs(adjustedValue) > 0.5) {
            effectsSummary.push({
              stat: effect.stat,
              change: Math.round(newStatus[statKey] - oldVal),
              label: effect.stat.charAt(0).toUpperCase() + effect.stat.slice(1)
            });
          }
        }
      }
    } else if (effect.type === 'debuff' && effect.stat === 'weakness') {
      // Weakness increase is worse on complications
      const weaknessIncrease = outcomeLevel === 'complication' ? effect.value * 1.5 :
                               outcomeLevel === 'failure' ? effect.value * 0.5 :
                               outcomeLevel === 'partial' ? effect.value * 0.8 :
                               effect.value;
      const oldVal = newStatus.weakness;
      newStatus.weakness = Math.min(100, oldVal + weaknessIncrease);
      effectsSummary.push({
        stat: 'weakness',
        change: Math.round(newStatus.weakness - oldVal),
        label: 'Weakness'
      });
    }
  }

  // Generate procedural details based on treatment type
  let proceduralDetails: ProceduralDetail[];
  const isSuccess = outcomeLevel === 'remarkable' || outcomeLevel === 'success';

  switch (treatment.id) {
    case 'bloodletting':
      proceduralDetails = generateBloodlettingDetails(isSuccess, outcomeLevel);
      break;
    case 'cupping':
      proceduralDetails = generateCuppingDetails(isSuccess, outcomeLevel);
      break;
    case 'lancing':
      proceduralDetails = generateLancingDetails(isSuccess, outcomeLevel);
      break;
    case 'cauterization':
      proceduralDetails = generateCauterizationDetails(isSuccess, outcomeLevel);
      break;
    case 'purging':
      proceduralDetails = generatePurgingDetails(isSuccess, outcomeLevel);
      break;
    case 'theriac_admin':
      proceduralDetails = generateTheriakDetails(isSuccess, outcomeLevel);
      break;
    case 'fumigation':
      proceduralDetails = generateFumigationDetails(isSuccess, outcomeLevel);
      break;
    case 'leeches':
      proceduralDetails = generateLeechDetails(isSuccess, outcomeLevel);
      break;
    case 'poultice':
      proceduralDetails = generatePoulticeDetails(isSuccess, outcomeLevel);
      break;
    default:
      proceduralDetails = generateBloodlettingDetails(isSuccess, outcomeLevel);
  }

  // Get flavor text
  const flavor = OUTCOME_FLAVOR[treatment.id]?.[outcomeLevel] ?? OUTCOME_FLAVOR.bloodletting[outcomeLevel];

  // Get practitioner comment
  const comments = PRACTITIONER_COMMENTS[outcomeLevel];
  const practitionerComment = comments[Math.floor(Math.random() * comments.length)];

  return {
    treatmentId: treatment.id,
    treatmentName: treatment.nameEn,
    treatmentNameAr: treatment.nameAr,
    transliteration: treatment.transliteration,
    outcomeLevel,
    title: flavor.title,
    titleAr: flavor.titleAr,
    description: treatment.description,
    flavorText: flavor.flavor,
    proceduralDetails,
    effectsSummary,
    newPlagueStatus: newStatus,
    practitionerComment,
    cost
  };
};
