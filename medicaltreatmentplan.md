# Medical Treatment System - Implementation Plan

## Overview

Implement a historically accurate medical treatment system for 14th century Damascus, featuring two distinct pathways:

1. **Medical Establishments** - Professional treatments performed by barber-surgeons and physicians
2. **Apothecary Compounding** - Ingredient-based medicine preparation

---

## Phase 1: Data Structures & Types

### 1.1 New Types (types.ts)

```typescript
// Medical treatment performed by professionals
export interface MedicalTreatment {
  id: string;
  nameEn: string;
  nameAr: string;  // Arabic name
  description: string;
  cost: number;
  effects: ItemEffect[];
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskDescription?: string;
  requirements?: {
    minBuboes?: number;      // For lancing
    hasGangrene?: boolean;   // For cauterization
    minDaysInfected?: number;
    requiresItem?: string;   // e.g., sharp instrument
  };
  availableAt: ('barber' | 'physician' | 'bimaristan')[];
}

// Apothecary compound recipe
export interface CompoundRecipe {
  id: string;
  nameEn: string;
  nameAr: string;
  category: 'electuary' | 'syrup' | 'ointment' | 'fumigant' | 'powder' | 'distillation' | 'pill';
  categoryAr: string;
  description: string;
  ingredients: string[];  // Item names
  effects: ItemEffect[];
  fee: number;  // Apothecary's compounding fee
}
```

### 1.2 New Files

- `utils/medicalTreatments.ts` - Treatment definitions
- `utils/apothecaryRecipes.ts` - Compound recipe definitions
- `components/MedicalTreatmentModal.tsx` - Treatment selection UI
- `components/ApothecaryCompoundingPanel.tsx` - Compounding UI (tab in merchant modal)

---

## Phase 2: Medical Treatments Data

### 2.1 Treatment Definitions (utils/medicalTreatments.ts)

| ID | English | Arabic | Effect | Cost | Risk |
|----|---------|--------|--------|------|------|
| bloodletting | Bloodletting | فَصْد (Faṣd) | Fever -8, Weakness +12 | 15 | Low |
| cupping | Cupping | حِجَامَة (Ḥijāma) | Fever -5, Weakness +8, Protection 15% 2h | 12 | Low |
| lancing | Lancing the Bubo | بَضْع الدُّمَّل (Baḍ' al-Dummal) | Buboes -30, Survival +25% | 25 | High |
| cauterization | Cauterization | كَيّ (Kayy) | Gangrene -40, Weakness +25 | 30 | High |
| purging | Purging | إِسْهَال (Is'hāl) | Delirium -15, Weakness +20 | 10 | Medium |
| theriac_admin | Theriac Administration | تِرْيَاق (Tiryāq) | All -15, Survival +10% | 80 | None |

### 2.2 Establishment Types

- **Barber-Surgeon (حَلَّاق - Ḥallāq)**: Bloodletting, Cupping, Lancing
- **Physician (حَكِيم - Ḥakīm)**: All treatments, +10% efficacy
- **Hospital (بِيمَارِسْتَان - Bīmāristān)**: All treatments, -20% cost, can rest

---

## Phase 3: Apothecary Recipes Data

### 3.1 Recipe Categories

| Category | Arabic | Description |
|----------|--------|-------------|
| Electuary | مَعْجُون (Ma'jūn) | Medicinal pastes mixed with honey |
| Syrup | شَرَاب (Sharāb) | Sweet liquid medicines |
| Ointment | مَرْهَم (Marham) | Topical salves and poultices |
| Fumigant | بَخُور (Bukhūr) | Burned for protective smoke |
| Powder | سَفُوف (Safūf) | Dried ground medicines |
| Distillation | مَاء (Mā') | Concentrated medicinal waters |
| Pill | حَبّ (Ḥabb) | Rolled medicine balls |

### 3.2 Full Recipe List (~20 recipes)

**Electuaries (مَعْجُون)**
1. Cooling Electuary (مَعْجُون مُبَرِّد) - Rose Water + Honey + Mint → Fever -20
2. Strengthening Electuary (مَعْجُون مُقَوِّي) - Honey + Dates + Pomegranate → Weakness -18
3. Theriac Electuary (مَعْجُون التِّرْيَاق) - Theriac + Honey + Rose Water → All -12, Survival +8%
4. Sedative Electuary (مَعْجُون مُنَوِّم) - Opium + Honey + Saffron → All -25, Weakness +15

**Syrups (شَرَاب)**
5. Violet Syrup (شَرَاب البَنَفْسَج) - Honey + Rose Water → Fever -12, Delirium -8
6. Oxymel (سَكَنْجَبِين) - Honey + Vinegar → Coughing -15
7. Julep (جُلَاب) - Rose Water + Honey + Mint → Fever -15, Heal +10

**Ointments (مَرْهَم)**
8. Drawing Poultice (ضِمَاد جَاذِب) - Myrrh + Aloe + Honey → Buboes -18
9. Camphor Balm (مَرْهَم الكَافُور) - Camphor + Aloe → Fever -15, Bleeding -10
10. Frankincense Salve (مَرْهَم اللُّبَان) - Frankincense + Aloe + Honey → Buboes -12, Bleeding -8
11. Wound Salve (مَرْهَم الجُرُوح) - Myrrh + Honey → Bleeding -15

**Fumigants (بَخُور)**
12. Plague Smoke (بَخُور الوَبَاء) - Frankincense + Myrrh → Protection 35% 4h
13. Protective Incense (بَخُور وَاقٍ) - Frankincense + Camphor + Rose Water → Protection 45% 6h
14. Simple Fumigant (بَخُور بَسِيط) - Frankincense → Protection 20% 2h

**Powders (سَفُوف)**
15. Fever Powder (سَفُوف الحُمَّى) - Mint + Coriander → Fever -10
16. Digestive Powder (سَفُوف هَاضِم) - Cumin + Coriander + Pepper → Heal +8, Weakness -5

**Distillations (مَاء)**
17. Camphor Water (مَاء الكَافُور) - Camphor + Rose Water → Fever -18, Coughing -12
18. Mint Water (مَاء النَّعْنَاع) - Mint + Rose Water → Fever -14

**Pills (حَبّ)**
19. Traveler's Pills (حَبّ المُسَافِر) - Theriac → Protection 25% 8h

---

## Phase 4: Medical Treatment UI

### 4.1 MedicalTreatmentModal.tsx

**Design Language:**
- Parchment/paper texture background
- Deep amber/sepia color palette
- Arabic calligraphy headers
- Medieval medical illustrations as subtle decorations
- Ornate border patterns

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     ═══ الطِّبّ ═══                              │
│                    MEDICAL TREATMENTS                           │
│                                                                 │
│  The physician [Name] offers the following treatments:          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ══ فَصْد ══                                             │   │
│  │  BLOODLETTING                                            │   │
│  │                                                          │   │
│  │  "Release of corrupt blood to restore humoral balance"   │   │
│  │                                                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │   │
│  │  │ ⚕ Effect│  │ ⚠ Risk  │  │ 💰 Cost │                  │   │
│  │  │ Fever -8│  │  Low    │  │ 15 dir. │                  │   │
│  │  │ Weak +12│  │         │  │         │                  │   │
│  │  └─────────┘  └─────────┘  └─────────┘                  │   │
│  │                                                          │   │
│  │                              [Undergo Treatment]         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ══ بَضْع الدُّمَّل ══                                    │   │
│  │  LANCING THE BUBO                                        │   │
│  │  ⚠ Requires: Buboes > 50%, Sharp instrument              │   │
│  │  ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           [Close]                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Integration Points

- Trigger from interior NPC interaction in MEDICAL buildings
- Or add "Seek Treatment" button when in medical building
- Pass establishment type to determine available treatments
- Check player currency before allowing treatment

---

## Phase 5: Apothecary Compounding UI

### 5.1 ApothecaryCompoundingPanel.tsx

**Design Language:**
- Warm amber tones with deep burgundy accents
- Alchemical/apothecary aesthetic
- Ingredient jars and mortar/pestle visual motifs
- Flowing Arabic category headers

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ══ صَيْدَلَة ══  COMPOUNDING                                    │
│                                                                 │
│  Category: [All ▼] [معجون] [شراب] [مرهم] [بخور] [سفوف] [ماء]    │
│                                                                 │
│  Your Ingredients: Honey ×3, Mint ×2, Rose Water ×1, Myrrh ×1   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ COOLING ELECTUARY                                      │   │
│  │   مَعْجُون مُبَرِّد                                        │   │
│  │                                                          │   │
│  │   "A sweet cooling paste that reduces fever"             │   │
│  │                                                          │   │
│  │   Requires:                                              │   │
│  │   ├─ Rose Water ........... ✓ (you have 1)              │   │
│  │   ├─ Honey ................ ✓ (you have 3)              │   │
│  │   └─ Mint Leaves .......... ✓ (you have 2)              │   │
│  │                                                          │   │
│  │   Effect: Fever -20                                      │   │
│  │   Compounding Fee: 8 dirhams                             │   │
│  │                                                          │   │
│  │                                    [Compound]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✗ DRAWING POULTICE                                       │   │
│  │   ضِمَاد جَاذِب                                           │   │
│  │                                                          │   │
│  │   Requires:                                              │   │
│  │   ├─ Myrrh Resin .......... ✓ (you have 1)              │   │
│  │   ├─ Aloe Vera ............ ✗ missing                   │   │
│  │   │    └─ Buy from apothecary: 4 dir.                   │   │
│  │   └─ Honey ................ ✓ (you have 3)              │   │
│  │                                                          │   │
│  │   Effect: Buboes -18                                     │   │
│  │   Total Cost: 4 + 12 = 16 dirhams                        │   │
│  │                                                          │   │
│  │                                    [Buy & Compound]      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Integration Points

- New tab in MerchantModal when merchant type is APOTHECARY
- Check both player inventory and merchant stock
- Allow buying missing ingredients as part of compounding
- Consume ingredients, pay fee, add compound to inventory

---

## Phase 6: Treatment Efficacy by Stage

### 6.1 Modify applyItemEffects

```typescript
const getEfficacyMultiplier = (daysInfected: number, plagueType: PlagueType): number => {
  if (plagueType === PlagueType.SEPTICEMIC) return 0.3; // Almost nothing helps
  if (plagueType === PlagueType.PNEUMONIC) {
    if (daysInfected <= 1) return 1.2;
    if (daysInfected <= 2) return 0.7;
    return 0.3;
  }
  // Bubonic - more time to treat
  if (daysInfected <= 2) return 1.3;  // Early intervention
  if (daysInfected <= 4) return 1.0;  // Normal efficacy
  if (daysInfected <= 6) return 0.6;  // Diminishing returns
  return 0.3;                          // Crisis - palliative only
};
```

---

## Implementation Order

### Step 1: Types & Data (1 hour)
- [ ] Add MedicalTreatment and CompoundRecipe interfaces to types.ts
- [ ] Create utils/medicalTreatments.ts with treatment definitions
- [ ] Create utils/apothecaryRecipes.ts with recipe definitions
- [ ] Add Vinegar to trader items if not present

### Step 2: Medical Treatment Modal (2 hours)
- [ ] Create components/MedicalTreatmentModal.tsx
- [ ] Design with parchment aesthetic, Arabic headers
- [ ] Implement treatment cards with effect/risk/cost display
- [ ] Add treatment availability logic (barber vs physician vs bimaristan)
- [ ] Implement handleMedicalTreatment in App.tsx
- [ ] Add trigger point in interior interactions

### Step 3: Apothecary Compounding Panel (2.5 hours)
- [ ] Create components/ApothecaryCompoundingPanel.tsx
- [ ] Add category filter tabs with Arabic names
- [ ] Implement ingredient availability checking
- [ ] Show buy-from-merchant option for missing ingredients
- [ ] Implement handleCompoundRecipe in App.tsx
- [ ] Integrate as tab in MerchantModal for apothecary type

### Step 4: Treatment Timing (30 min)
- [ ] Add efficacy multiplier to applyItemEffects
- [ ] Pass plague state through effect chain
- [ ] Show efficacy hint in UI ("Treatment less effective in late stage")

### Step 5: Polish & Testing (1 hour)
- [ ] Test all treatments and compounds
- [ ] Verify ingredient consumption
- [ ] Check currency handling
- [ ] Visual polish and animations

---

## UI Design Notes

### Color Palette
- **Background**: Deep parchment (#f2e7d5 to #e8dcc8)
- **Primary text**: Sepia brown (#5c4033)
- **Headers**: Dark amber (#92400e)
- **Arabic text**: Deep burgundy (#7f1d1d)
- **Positive effects**: Muted emerald (#065f46)
- **Negative effects**: Muted rose (#9f1239)
- **Risk indicators**: Amber (#d97706) to Red (#dc2626)

### Typography
- English headers: Cinzel or similar medieval serif
- Arabic text: Amiri or Scheherazade (if available) or system Arabic
- Body text: Current game font (Lato)

### Decorative Elements
- Geometric Islamic patterns for borders
- Subtle mortar & pestle / apothecary jar icons
- Ornate dividers between sections
- Medical/alchemical symbol accents

---

## Arabic Transliteration Guide

For accessibility, show both Arabic script and transliteration:

| Arabic | Transliteration | English |
|--------|-----------------|---------|
| فَصْد | Faṣd | Bloodletting |
| حِجَامَة | Ḥijāma | Cupping |
| كَيّ | Kayy | Cauterization |
| مَعْجُون | Ma'jūn | Electuary |
| شَرَاب | Sharāb | Syrup |
| مَرْهَم | Marham | Ointment |
| بَخُور | Bukhūr | Fumigant |
| صَيْدَلِي | Ṣaydalī | Apothecary |
| حَكِيم | Ḥakīm | Physician |
| بِيمَارِسْتَان | Bīmāristān | Hospital |
