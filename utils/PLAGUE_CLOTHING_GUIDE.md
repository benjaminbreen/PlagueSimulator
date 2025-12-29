# Plague-Aware Clothing System

## Overview

The clothing system now includes **ethnicity/religion-specific color preferences** and **plague-aware modifications** that are historically accurate for 1348 Damascus.

## Performance Characteristics

✅ **ZERO GEOMETRY OVERHEAD** - All modifications are color-only
✅ **Computed at generation time** - No runtime performance cost
✅ **Weighted random selection** - Natural variation without branching

## Ethnicity & Religion Color System

### How It Works

NPCs now wear colors appropriate to their ethnic and religious background:

- **Persian NPCs**: Rich purples, deep reds, gold accents (Sasanian tradition)
- **Armenian Christians**: Deep blues, crimson reds, gold embroidery
- **Venetian/Genoese merchants**: Venetian red, merchant blacks, status purples
- **Jewish NPCs**: Darker blues/blacks (sumptuary laws), modest earth tones
- **Druze NPCs**: Black, dark browns (religious requirement - very strong preference)
- **Coptic Christians**: Dark, austere colors (minority conservatism)
- **Kurdish NPCs**: Earth tones with red/green accents (avoid Persian purples)
- **Greek/Rum NPCs**: Byzantine blues, burgundy
- **Maghrebi NPCs**: Saffron yellows, deep blues (indigo tradition)
- **Indian merchants**: Saffron, red, blue, orange (spice trade colors)

### Religion Preferences (Override Ethnicity)

- **Jewish**: Avoid bright reds/gold (restricted colors), prefer dark blues/browns
- **Christian groups**: Avoid saffron/gold (Islamic association), prefer blues/burgundy
- **Druze**: Strict black/dark requirements (3.0x weight)
- **Muslim**: No restrictions, full color range available

### Implementation

Colors are selected using weighted random sampling:
```typescript
// In procedural.ts - line ~1246
const robePickBase = getEthnicityWeightedRobes(
  ROBE_OPTIONS_BY_CLASS[socialClass],
  ethnicity,
  religion,
  rand
);
```

**Color matching** uses RGB distance with 40-unit threshold for "similar" colors.
**Weighting** multiplies selection probability by 1.5x-3.0x for preferred colors.

## Plague Clothing Modifications

### Mourning Clothes

NPCs from buildings with deceased residents wear dark/black mourning clothes:

```typescript
import { applyMourningColors } from './procedural';

// Full mourning (intensity = 1.0) → near-black (#1a1a1a)
// Partial mourning (intensity = 0.5-0.9) → lerp to dark grey
// Light mourning (intensity < 0.5) → darkened original colors

const { base, accent } = applyMourningColors(
  npc.robeBaseColor,
  npc.robeAccentColor,
  0.9 // intensity based on days since death
);
```

**Historical Basis**: 1348 Damascus mourning was 3-40 days depending on relation

### Protective Accessories

NPCs with high plague awareness gain protective items:

```typescript
import { getPlagueProtectiveAccessories, PlagueClothingContext } from './procedural';

const context: PlagueClothingContext = {
  buildingHasDeceased: true,
  buildingHasInfected: false,
  awarenessLevel: 75,
  socialClass: SocialClass.MERCHANT
};

const accessories = getPlagueProtectiveAccessories(context, npc.accessories);
// May add: 'prayer beads', 'perfumed cloth', 'protective amulet'
```

**Triggers**:
- **Prayer beads (tasbih)**: awarenessLevel > 40 (60% chance)
- **Perfumed cloth**: wealthy NPCs in infected buildings (50% chance)
- **Protective amulet**: awarenessLevel > 60 (30% chance)

**Historical Basis**: Miasma theory → perfumed cloths, Islamic tradition → prayer beads

## Integration Example (NPC Component)

```typescript
// In NPC.tsx or Humanoid.tsx
import { applyMourningColors, getPlagueProtectiveAccessories } from '../utils/procedural';

// Check if NPC's building has deceased residents
const buildingState = buildingInfectionMap.get(npc.homeBuildingId);
const isMourning = buildingState?.status === 'deceased';

// Apply mourning colors dynamically
let robeBase = npc.robeBaseColor;
let robeAccent = npc.robeAccentColor;

if (isMourning) {
  const daysSinceDeath = (currentSimTime - buildingState.lastSeenSimTime) / 24;
  const mourningIntensity = Math.max(0, 1.0 - daysSinceDeath / 14); // Fade over 2 weeks

  const mourningColors = applyMourningColors(robeBase, robeAccent, mourningIntensity);
  robeBase = mourningColors.base;
  robeAccent = mourningColors.accent;
}

// Use robeBase and robeAccent in material colors
```

## Visual Impact

### Before
- All Arab NPCs: Similar beige/brown palette
- No visual distinction between Venetian and Persian merchants
- Jewish NPCs could wear bright golds (historically inaccurate)
- No plague response visible in clothing

### After
- **Persians**: Stand out with purple qaba and gold trim
- **Armenians**: Deep blue thawb with crimson accents
- **Venetians**: Venetian red and merchant black
- **Jewish Quarter**: Noticeably darker, modest palette
- **Mourning NPCs**: Visual grief indicator (black clothes)
- **Aware NPCs**: Prayer beads, perfumed cloths (plague paranoia visible)

## Performance Notes

1. **Color selection** happens once at NPC generation (cached in NPCStats)
2. **Mourning modification** can be applied dynamically in render component (just color lerp)
3. **No new geometry** - accessories are stored in `accessories: string[]` array
4. **Weighted sampling** is O(n) where n = ~15 color options per class (negligible)

## Future Enhancements (Optional)

- [ ] Render prayer beads as small geometry on belt
- [ ] Add perfumed cloth held-item animation
- [ ] Dynamic mourning duration based on NPC relationship to deceased
- [ ] Profession-specific color staining (dyers, bakers, blacksmiths)
- [ ] Time-of-day color modulation via shader
