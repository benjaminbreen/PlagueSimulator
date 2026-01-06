import React, { useMemo } from 'react';
import { AgentState } from '../types';
import { seededRandom } from '../utils/procedural';

type HeadwearStyle = 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
type FacialHairStyle = 'none' | 'stubble' | 'short_beard' | 'full_beard' | 'mustache' | 'goatee';
type HairStyle = 'short' | 'medium' | 'long' | 'covered';

// Jawline shapes for face variation
type JawlineShape = 'angular' | 'rounded' | 'narrow' | 'square';
type CheekboneStyle = 'high' | 'soft' | 'prominent';
type ChinShape = 'pointed' | 'square' | 'rounded' | 'recessed';

interface FamilyPortraitProps {
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  skinTone?: string;
  hairColor?: string;
  hairStyle?: HairStyle;
  headwearStyle?: HeadwearStyle;
  headwearColor?: string;
  facialHair?: FacialHairStyle;
  healthState?: AgentState;
  isDeceased?: boolean;
  size?: number; // width/height in pixels
  className?: string;
}

// Hash string to seed for deterministic features
function hashToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Convert HSL to hex (handles "hsl(h, s%, l%)" format)
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#c4a574'; // fallback

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Normalize any color to hex format
function normalizeToHex(color: string): string {
  if (!color) return '#c4a574'; // default skin tone
  if (color.startsWith('hsl')) return hslToHex(color);
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    // Expand shorthand hex (#abc -> #aabbcc)
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color;
  }
  return '#c4a574'; // fallback for invalid formats
}

// Darken a hex color
function darkenColor(hex: string, factor: number): string {
  const normalized = normalizeToHex(hex);
  const num = parseInt(normalized.replace('#', ''), 16);
  if (isNaN(num)) return '#5a4a3a'; // fallback dark
  const r = Math.max(0, Math.floor((num >> 16) * factor));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * factor));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * factor));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Lighten a hex color
function lightenColor(hex: string, factor: number): string {
  const normalized = normalizeToHex(hex);
  const num = parseInt(normalized.replace('#', ''), 16);
  if (isNaN(num)) return '#d4c4a4'; // fallback light
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * factor));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * factor));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * factor));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Mix two colors
function mixColors(color1: string, color2: string, ratio: number): string {
  const n1 = normalizeToHex(color1);
  const n2 = normalizeToHex(color2);
  const c1 = parseInt(n1.replace('#', ''), 16);
  const c2 = parseInt(n2.replace('#', ''), 16);
  if (isNaN(c1) || isNaN(c2)) return n1; // fallback to first color
  const r = Math.floor((c1 >> 16) * (1 - ratio) + (c2 >> 16) * ratio);
  const g = Math.floor(((c1 >> 8) & 0xFF) * (1 - ratio) + ((c2 >> 8) & 0xFF) * ratio);
  const b = Math.floor((c1 & 0xFF) * (1 - ratio) + (c2 & 0xFF) * ratio);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Generate eye color from hair color seed - matches Humanoid.tsx algorithm
// Levantine population distribution: 40% dark brown, 25% medium brown, 15% amber, 10% hazel, 7% green, 3% blue-grey
function generateEyeColorFromHair(hairColor: string): string {
  const seed = hairColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const roll = (seed % 100) / 100;

  if (roll > 0.97) return '#6b8e9f'; // blue-grey (3%)
  if (roll > 0.90) return '#5a7a50'; // green (7%)
  if (roll > 0.80) return '#7a6a45'; // hazel (10%)
  if (roll > 0.65) return '#8b6b3a'; // light brown/amber (15%)
  if (roll > 0.40) return '#5a4030'; // medium warm brown (25%)
  return '#3a2a1a'; // dark brown (40%)
}

// Default fallback colors
const DEFAULT_SKIN_TONE = '#c4a574';
const DEFAULT_HAIR_COLOR = '#2c1810';

export const FamilyPortrait: React.FC<FamilyPortraitProps> = ({
  name,
  gender,
  age,
  skinTone: rawSkinTone = DEFAULT_SKIN_TONE,
  hairColor: rawHairColor = DEFAULT_HAIR_COLOR,
  hairStyle: hairStyleProp,
  headwearStyle,
  headwearColor: propHeadwearColor,
  facialHair,
  healthState = AgentState.HEALTHY,
  isDeceased = false,
  size = 48,
  className = ''
}) => {
  // Validate and normalize colors early to prevent rendering issues
  const skinTone = useMemo(() => {
    const normalized = normalizeToHex(rawSkinTone);
    // Verify it's a valid hex color
    if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return DEFAULT_SKIN_TONE;
    }
    return normalized;
  }, [rawSkinTone]);

  const hairColor = useMemo(() => {
    const normalized = normalizeToHex(rawHairColor);
    if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return DEFAULT_HAIR_COLOR;
    }
    return normalized;
  }, [rawHairColor]);

  const seed = hashToSeed(name || 'Unknown');
  // Create truly unique ID combining seed with name length and gender to prevent collisions
  const uniqueId = `${seed}-${(name || 'Unknown').length}-${gender[0]}`;

  const features = useMemo(() => {
    let s = seed;
    const rand = () => seededRandom(s++);

    // Determine age category
    const isChild = age < 15;
    const isYouth = age >= 15 && age < 18;
    const isElder = age >= 55;

    // Eye shape variation
    const eyeShape = Math.floor(rand() * 3); // 0: round, 1: almond, 2: narrow

    // Eye color - use same algorithm as Humanoid for consistency
    const eyeColor = generateEyeColorFromHair(hairColor);

    // Nose variation
    const noseType = Math.floor(rand() * 3);

    // Mouth expression (slight variations)
    const mouthCurve = (rand() - 0.5) * 2; // -1 to 1
    const mouthWidth = 0.85 + rand() * 0.3; // lips vary in fullness

    // === ENHANCED FACE SHAPE VARIATION ===
    // Base face dimensions
    const faceWidth = 0.85 + rand() * 0.3;
    const faceHeight = 0.9 + rand() * 0.2;

    // Jawline shape - affects lower face contour
    const jawlineShapes: JawlineShape[] = ['angular', 'rounded', 'narrow', 'square'];
    const jawline = jawlineShapes[Math.floor(rand() * jawlineShapes.length)];

    // Cheekbone style - affects mid-face
    const cheekboneStyles: CheekboneStyle[] = ['high', 'soft', 'prominent'];
    const cheekbones = cheekboneStyles[Math.floor(rand() * cheekboneStyles.length)];

    // Chin shape
    const chinShapes: ChinShape[] = ['pointed', 'square', 'rounded', 'recessed'];
    const chin = chinShapes[Math.floor(rand() * chinShapes.length)];

    // Forehead height - affects eye placement
    const foreheadHeight = 0.9 + rand() * 0.2; // 0.9 to 1.1

    // Hair style - use prop if provided, otherwise generate based on gender/age
    const resolvedHairStyle: HairStyle = hairStyleProp ?? (
      isChild
        ? 'short'
        : gender === 'Female'
          ? (rand() > 0.3 ? 'long' : 'medium')
          : (rand() > 0.6 ? 'short' : rand() > 0.3 ? 'medium' : 'short')
    );

    // Facial hair - age-appropriate validation
    // Children (< 15): never have facial hair
    // Youth (15-17): stubble only possible (rare)
    // Adults (18+): any type allowed
    const resolvedFacialHair: FacialHairStyle = (() => {
      if (isChild) return 'none';  // Children and early adolescents never have facial hair
      if (gender !== 'Male') return 'none';  // Only males have facial hair

      const propValue = facialHair ?? 'none';

      if (isYouth) {
        // Youth (15-17) can only have stubble or none
        return propValue === 'stubble' ? 'stubble' : 'none';
      }

      // Adults - use prop if provided, otherwise generate
      if (facialHair) return facialHair;

      // Fallback generation for adults
      return rand() > 0.3
        ? (['stubble', 'short_beard', 'full_beard', 'mustache', 'goatee'] as FacialHairStyle[])[Math.floor(rand() * 5)]
        : 'none';
    })();

    // Headwear - use prop if provided, otherwise generate based on age/gender
    const resolvedHeadwear: HeadwearStyle = headwearStyle ?? (
      isChild
        ? 'none'
        : gender === 'Female'
          ? (rand() > 0.2 ? 'scarf' : 'none')
          : (rand() > 0.4 ? (['turban', 'cap', 'taqiyah'] as HeadwearStyle[])[Math.floor(rand() * 3)] : 'none')
    );

    // Wrinkles for elders
    const hasWrinkles = isElder;

    // Hair visibility - hidden when wearing full head covering
    const showHair = resolvedHeadwear === 'none' ||
      (gender === 'Male' && !['turban', 'scarf'].includes(resolvedHeadwear)) ||
      (gender === 'Female' && resolvedHeadwear !== 'scarf');

    // Hair volume variation for distinctive silhouettes
    const hairVolumeRoll = rand();
    const hairVolume: 'voluminous' | 'sleek' | 'normal' =
      hairVolumeRoll < 0.15 ? 'voluminous' :
      hairVolumeRoll < 0.30 ? 'sleek' : 'normal';

    // Hair asymmetry - creates unique left/right variation
    const hairAsymmetry = (rand() - 0.5) * 0.6; // -0.3 to 0.3

    return {
      isChild,
      isYouth,
      isElder,
      eyeShape,
      eyeColor,
      noseType,
      mouthCurve,
      mouthWidth,
      faceWidth,
      faceHeight,
      jawline,
      cheekbones,
      chin,
      foreheadHeight,
      hairStyle: resolvedHairStyle,
      facialHairStyle: resolvedFacialHair,
      headwearStyle: resolvedHeadwear,
      hasWrinkles,
      showHair,
      hairVolume,
      hairAsymmetry
    };
  }, [seed, gender, age, hairColor, hairStyleProp, facialHair, headwearStyle]);

  // Apply health/deceased effects to colors
  const effectiveSkinTone = useMemo(() => {
    if (isDeceased) {
      return mixColors(skinTone, '#808080', 0.5); // Greyed out
    }
    if (healthState === AgentState.SYMPTOMATIC) {
      return mixColors(skinTone, '#90a060', 0.25); // Sickly pallor
    }
    if (healthState === AgentState.INFECTED) {
      return mixColors(skinTone, '#c0b080', 0.15); // Slightly off
    }
    return skinTone;
  }, [skinTone, healthState, isDeceased]);

  const effectiveHairColor = useMemo(() => {
    if (isDeceased) {
      return mixColors(hairColor, '#606060', 0.5);
    }
    if (features.isElder) {
      return mixColors(hairColor, '#a0a0a0', 0.4); // Grey hair for elders
    }

    // Boost saturation for better visibility at small sizes
    try {
      const hex = normalizeToHex(hairColor);
      const num = parseInt(hex.replace('#', ''), 16);

      // Safety check for invalid parse
      if (isNaN(num)) return hairColor;

      const r = (num >> 16) / 255;
      const g = ((num >> 8) & 0xFF) / 255;
      const b = (num & 0xFF) / 255;

      // Convert to HSL
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

      // Boost saturation by 25% and adjust lightness for contrast
      const newS = Math.min(1, s * 1.25);
      const newL = l < 0.3 ? l * 1.1 : l > 0.7 ? l * 0.9 : l; // Brighten darks, darken lights

      // Convert back to RGB
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      let newR, newG, newB;
      if (newS === 0) {
        newR = newG = newB = newL;
      } else {
        const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
        const p = 2 * newL - q;
        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
      }

      // Safety check for NaN values
      if (isNaN(newR) || isNaN(newG) || isNaN(newB)) return hairColor;

      const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    } catch (error) {
      // Fallback to original color if any error occurs
      return hairColor;
    }
  }, [hairColor, isDeceased, features.isElder]);

  // Headwear color - use prop if provided, otherwise generate
  const headwearColor = useMemo(() => {
    if (propHeadwearColor) return propHeadwearColor;
    const s = seed + 100;
    const rand = seededRandom(s);
    const colors = ['#8b4513', '#2f4f4f', '#191970', '#4a4a4a', '#6b4423', '#3d3d3d'];
    return colors[Math.floor(rand * colors.length)];
  }, [seed, propHeadwearColor]);

  const skinDark = darkenColor(effectiveSkinTone, 0.85);
  const skinLight = lightenColor(effectiveSkinTone, 0.15);
  const hairDark = darkenColor(effectiveHairColor, 0.7);

  // Scale factor for viewBox
  const viewBox = "0 0 100 100";

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={`${className} ${isDeceased ? 'opacity-70' : ''}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gradient for face shading */}
        <radialGradient id={`face-grad-${uniqueId}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={skinLight} />
          <stop offset="100%" stopColor={effectiveSkinTone} />
        </radialGradient>

        {/* Shadow gradient */}
        <linearGradient id={`shadow-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={skinDark} stopOpacity="0" />
          <stop offset="100%" stopColor={skinDark} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Background circle - color-coded by status */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill={
          isDeceased ? '#1a1a2e' :
          healthState === AgentState.SYMPTOMATIC ? '#2e2a2e' :
          healthState === AgentState.INFECTED ? '#2a2a3a' :
          '#2a3a2e'
        }
        stroke={
          isDeceased ? '#8b3a3a' :
          healthState === AgentState.SYMPTOMATIC ? '#d4a574' :
          healthState === AgentState.INFECTED ? '#9a7aa4' :
          '#5a7a5e'
        }
        strokeWidth="3"
      />

      {/* Headwear - renders FIRST so it appears behind the face */}
      {features.headwearStyle !== 'none' && (
        <>
          {/* Scarf/Hijab - renders for any gender */}
          {features.headwearStyle === 'scarf' && (
            <>
              <ellipse cx="50" cy="32" rx="34" ry="28" fill={headwearColor} />
              <path d={`M16 38 Q16 80 50 88 Q84 80 84 38`} fill={headwearColor} />
              <path d="M24 52 Q30 58 26 70" stroke={darkenColor(headwearColor, 0.8)} strokeWidth="0.7" fill="none" opacity="0.5" />
              <path d="M76 52 Q70 58 74 70" stroke={darkenColor(headwearColor, 0.8)} strokeWidth="0.7" fill="none" opacity="0.5" />
            </>
          )}

          {/* Turban - wrapped cloth headwear */}
          {features.headwearStyle === 'turban' && (
            <>
              <ellipse cx="50" cy="26" rx="29" ry="18" fill={headwearColor} />
              <ellipse cx="50" cy="24" rx="26" ry="13" fill={lightenColor(headwearColor, 0.1)} />
              <path d="M24 24 Q36 30 48 24" stroke={darkenColor(headwearColor, 0.7)} strokeWidth="1.2" fill="none" opacity="0.5" />
              <path d="M52 24 Q64 30 76 24" stroke={darkenColor(headwearColor, 0.7)} strokeWidth="1.2" fill="none" opacity="0.5" />
            </>
          )}

          {/* Taqiyah - small rounded cap */}
          {features.headwearStyle === 'taqiyah' && (
            <>
              <ellipse cx="50" cy="28" rx="21" ry="13" fill={headwearColor} />
              <path d="M29 28 Q50 18 71 28" fill={lightenColor(headwearColor, 0.15)} />
            </>
          )}

          {/* Cap - simple cloth cap */}
          {features.headwearStyle === 'cap' && (
            <>
              <ellipse cx="50" cy="28" rx="24" ry="16" fill={headwearColor} />
              <path d="M26 30 Q50 20 74 30" fill={lightenColor(headwearColor, 0.1)} />
            </>
          )}

          {/* Fez - tall cylindrical hat */}
          {features.headwearStyle === 'fez' && (
            <>
              <ellipse cx="50" cy="18" rx="18" ry="10" fill={headwearColor} />
              <rect x="32" y="18" width="36" height="16" fill={headwearColor} />
              <ellipse cx="50" cy="34" rx="18" ry="5" fill={darkenColor(headwearColor, 0.85)} />
              {/* Tassel */}
              <circle cx="50" cy="16" r="2.5" fill={darkenColor(headwearColor, 0.6)} />
              <path d="M50 16 Q56 24 52 32" stroke={darkenColor(headwearColor, 0.6)} strokeWidth="1.2" fill="none" />
            </>
          )}

          {/* Straw hat */}
          {features.headwearStyle === 'straw' && (
            <>
              <ellipse cx="50" cy="28" rx="32" ry="10" fill="#d4b896" />
              <ellipse cx="50" cy="24" rx="21" ry="13" fill="#c4a878" />
              <ellipse cx="50" cy="28" rx="32" ry="5" fill="#b89860" />
            </>
          )}
        </>
      )}

      {/* Hair/Head base (behind face for those with visible hair) - varies by hairStyle */}
      {/* Skip if hairStyle is 'covered' or if showHair is false */}
      {features.showHair && !features.isChild && features.hairStyle !== 'covered' && (
        <g>
          {/* Base hair shape - with volume variation and asymmetry */}
          {(() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            const baseRx = 29 * features.faceWidth * volumeMultiplier;
            const baseRy = (features.hairStyle === 'long' ? 29 : features.hairStyle === 'medium' ? 26 : 24) * volumeMultiplier;

            return (
              <ellipse
                cx="50"
                cy={35 - (features.foreheadHeight - 1) * 10}
                rx={baseRx}
                ry={baseRy}
                fill={effectiveHairColor}
              />
            );
          })()}
          {/* Side hair for medium/long styles - with asymmetry */}
          {(features.hairStyle === 'medium' || features.hairStyle === 'long') && (() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            const baseRy = (features.hairStyle === 'long' ? 16 : 11) * volumeMultiplier;
            const leftRy = baseRy * (1 + features.hairAsymmetry);
            const rightRy = baseRy * (1 - features.hairAsymmetry);

            return (
              <>
                <ellipse cx={26} cy={50} rx={5 * volumeMultiplier} ry={leftRy} fill={effectiveHairColor} />
                <ellipse cx={74} cy={50} rx={5 * volumeMultiplier} ry={rightRy} fill={effectiveHairColor} />
              </>
            );
          })()}
          {/* Back hair for long style */}
          {features.hairStyle === 'long' && gender === 'Female' && (() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            return (
              <ellipse cx="50" cy="80" rx={18 * features.faceWidth * volumeMultiplier} ry={13 * volumeMultiplier} fill={hairDark} />
            );
          })()}
        </g>
      )}

      {/* Face shape - enhanced with jawline, cheekbones, chin variation */}
      {(() => {
        const baseY = features.isChild ? 52 : 50;
        // Clamp face dimensions to safe ranges
        const clampedFaceWidth = Math.max(0.85, Math.min(1.15, features.faceWidth));
        const clampedFaceHeight = Math.max(0.9, Math.min(1.1, features.faceHeight));
        const clampedForeheadHeight = Math.max(0.9, Math.min(1.1, features.foreheadHeight));

        const faceRx = 24 * clampedFaceWidth;
        const faceRy = 30 * clampedFaceHeight * (features.isChild ? 0.85 : 1);

        // Adjust face shape based on jawline (clamped modifiers)
        const jawWidth = features.jawline === 'narrow' ? 0.85 :
                         features.jawline === 'angular' ? 1.0 :
                         features.jawline === 'square' ? 1.05 : 0.95;

        // Adjust chin protrusion (reduced range for stability)
        const chinOffset = features.chin === 'pointed' ? 2 :
                          features.chin === 'recessed' ? -1 :
                          features.chin === 'square' ? 1 : 0;

        // Cheekbone prominence (reduced range)
        const cheekOffset = features.cheekbones === 'high' ? 1.5 :
                           features.cheekbones === 'prominent' ? 2 : 0;

        // Pre-calculate path points for cleaner SVG
        const topY = baseY - faceRy * clampedForeheadHeight;
        const midY = baseY + faceRy * 0.5;
        const lowY = baseY + faceRy * 0.85;
        const chinY = baseY + faceRy + chinOffset;
        const jawX = faceRx * jawWidth * 0.6;

        return (
          <path
            d={`M ${50 - faceRx} ${baseY} Q ${50 - faceRx - cheekOffset} ${baseY - faceRy * 0.4} ${50} ${topY} Q ${50 + faceRx + cheekOffset} ${baseY - faceRy * 0.4} ${50 + faceRx} ${baseY} Q ${50 + faceRx * jawWidth + cheekOffset} ${midY} ${50 + jawX} ${lowY} Q ${50} ${chinY} ${50 - jawX} ${lowY} Q ${50 - faceRx * jawWidth - cheekOffset} ${midY} ${50 - faceRx} ${baseY} Z`}
            fill={`url(#face-grad-${uniqueId})`}
          />
        );
      })()}

      {/* Cheekbone highlights for prominent/high cheekbones */}
      {(features.cheekbones === 'high' || features.cheekbones === 'prominent') && !features.isChild && (
        <>
          <ellipse cx={38} cy={52} rx={4} ry={2} fill={skinLight} opacity={0.3} />
          <ellipse cx={62} cy={52} rx={4} ry={2} fill={skinLight} opacity={0.3} />
        </>
      )}

      {/* Chin shadow - adjusted for chin shape */}
      {(() => {
        const chinY = features.isChild ? 68 : (features.chin === 'pointed' ? 72 : features.chin === 'recessed' ? 68 : 70);
        const chinRx = features.chin === 'square' ? 14 : features.chin === 'pointed' ? 8 : 12;

        return (
          <ellipse
            cx="50"
            cy={chinY}
            rx={chinRx * features.faceWidth}
            ry={features.chin === 'pointed' ? 4 : 6}
            fill={`url(#shadow-${uniqueId})`}
          />
        );
      })()}

      {/* Eyes - position adjusted for forehead height */}
      {(() => {
        // Higher forehead = eyes slightly lower, lower forehead = eyes slightly higher
        const foreheadAdjust = (features.foreheadHeight - 1) * 4;
        const eyeY = (features.isChild ? 48 : 46) + foreheadAdjust;
        const eyeSpacing = features.isChild ? 8 : 10;
        const eyeWidth = features.eyeShape === 0 ? 5 : features.eyeShape === 1 ? 6 : 5;
        const eyeHeight = features.eyeShape === 0 ? 4 : features.eyeShape === 1 ? 3 : 2.5;

        return (
          <>
            {/* Left eye white */}
            <ellipse cx={50 - eyeSpacing} cy={eyeY} rx={eyeWidth} ry={eyeHeight} fill="#f5f5f0" />
            {/* Right eye white */}
            <ellipse cx={50 + eyeSpacing} cy={eyeY} rx={eyeWidth} ry={eyeHeight} fill="#f5f5f0" />

            {/* Irises */}
            <circle cx={50 - eyeSpacing} cy={eyeY} r={eyeHeight * 0.7} fill={features.eyeColor} />
            <circle cx={50 + eyeSpacing} cy={eyeY} r={eyeHeight * 0.7} fill={features.eyeColor} />

            {/* Pupils */}
            <circle cx={50 - eyeSpacing} cy={eyeY} r={eyeHeight * 0.35} fill="#1a1a1a" />
            <circle cx={50 + eyeSpacing} cy={eyeY} r={eyeHeight * 0.35} fill="#1a1a1a" />

            {/* Eye highlights */}
            <circle cx={50 - eyeSpacing + 1} cy={eyeY - 1} r="1" fill="#ffffff" opacity="0.7" />
            <circle cx={50 + eyeSpacing + 1} cy={eyeY - 1} r="1" fill="#ffffff" opacity="0.7" />

            {/* Eyebrows - width scales with face width to prevent overlap */}
            {(() => {
              const browHalfWidth = 5 * features.faceWidth; // ~4.25 to 5.75 based on faceWidth
              const leftEyeX = 50 - eyeSpacing;
              const rightEyeX = 50 + eyeSpacing;
              return (
                <>
                  <path
                    d={`M${leftEyeX - browHalfWidth} ${eyeY - 6} Q${leftEyeX} ${eyeY - 8} ${leftEyeX + browHalfWidth} ${eyeY - 6}`}
                    stroke={hairDark}
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d={`M${rightEyeX - browHalfWidth} ${eyeY - 6} Q${rightEyeX} ${eyeY - 8} ${rightEyeX + browHalfWidth} ${eyeY - 6}`}
                    stroke={hairDark}
                    strokeWidth="1.5"
                    fill="none"
                  />
                </>
              );
            })()}

            {/* Wrinkles for elders */}
            {features.hasWrinkles && (
              <>
                <path d={`M${35} ${eyeY + 2} Q${38} ${eyeY + 4} ${35} ${eyeY + 6}`} stroke={skinDark} strokeWidth="0.5" fill="none" opacity="0.4" />
                <path d={`M${65} ${eyeY + 2} Q${62} ${eyeY + 4} ${65} ${eyeY + 6}`} stroke={skinDark} strokeWidth="0.5" fill="none" opacity="0.4" />
              </>
            )}
          </>
        );
      })()}

      {/* Nose - made more visible for small portraits */}
      {(() => {
        const noseY = features.isChild ? 55 : 54;
        const noseSize = features.isChild ? 0.7 : 1;

        if (features.noseType === 0) {
          // Simple line nose - thicker stroke
          return (
            <>
              <path
                d={`M50 ${noseY - 4 * noseSize} L50 ${noseY + 2 * noseSize}`}
                stroke={skinDark}
                strokeWidth="1.5"
                fill="none"
              />
              {/* Nostril shadows */}
              <circle cx="48" cy={noseY + 2} r="1" fill={skinDark} opacity="0.4" />
              <circle cx="52" cy={noseY + 2} r="1" fill={skinDark} opacity="0.4" />
            </>
          );
        } else if (features.noseType === 1) {
          // Rounded nose - more visible
          return (
            <>
              <ellipse cx="50" cy={noseY + 1} rx={4 * noseSize} ry={3 * noseSize} fill={skinDark} opacity="0.35" />
              {/* Nostril shadows */}
              <circle cx="48" cy={noseY + 2} r="1" fill={skinDark} opacity="0.5" />
              <circle cx="52" cy={noseY + 2} r="1" fill={skinDark} opacity="0.5" />
            </>
          );
        } else {
          // Angular nose - more visible
          return (
            <>
              <path
                d={`M50 ${noseY - 5 * noseSize} L52 ${noseY + 2 * noseSize} L50 ${noseY + 4 * noseSize} L48 ${noseY + 2 * noseSize} Z`}
                fill={skinDark}
                opacity="0.4"
              />
              {/* Nostril shadows */}
              <circle cx="48.5" cy={noseY + 2.5} r="1" fill={skinDark} opacity="0.5" />
              <circle cx="51.5" cy={noseY + 2.5} r="1" fill={skinDark} opacity="0.5" />
            </>
          );
        }
      })()}

      {/* Mouth - width varies by mouthWidth feature */}
      {(() => {
        const mouthY = features.isChild ? 64 : 62;
        const baseMouthWidth = features.isChild ? 6 : 8;
        const mouthW = baseMouthWidth * features.mouthWidth;
        const curve = features.mouthCurve * 2;

        return (
          <path
            d={`M${50 - mouthW} ${mouthY} Q50 ${mouthY + curve} ${50 + mouthW} ${mouthY}`}
            stroke={darkenColor(effectiveSkinTone, 0.6)}
            strokeWidth={features.mouthWidth > 1 ? "2" : "1.5"}
            fill="none"
          />
        );
      })()}

      {/* Facial hair for adult men only - enhanced visibility */}
      {features.facialHairStyle !== 'none' && gender === 'Male' && !features.isChild && (
        <>
          {/* Stubble - light shadow */}
          {features.facialHairStyle === 'stubble' && (
            <ellipse
              cx="50"
              cy="66"
              rx={12 * features.faceWidth}
              ry="8"
              fill={hairDark}
              opacity={0.4}
            />
          )}

          {/* Short beard - with shadow layer for depth */}
          {features.facialHairStyle === 'short_beard' && (
            <>
              <ellipse cx="50" cy="66" rx={13 * features.faceWidth} ry="9" fill={hairDark} opacity={0.5} />
              <ellipse cx="50" cy="70" rx={11 * features.faceWidth} ry="7" fill={effectiveHairColor} />
            </>
          )}

          {/* Full beard - larger and more prominent */}
          {features.facialHairStyle === 'full_beard' && (
            <>
              <ellipse cx="50" cy="66" rx={15 * features.faceWidth} ry="11" fill={hairDark} opacity={0.5} />
              <ellipse cx="50" cy="72" rx={13 * features.faceWidth} ry="11" fill={effectiveHairColor} />
              <ellipse cx="50" cy="78" rx={11 * features.faceWidth} ry="7" fill={effectiveHairColor} />
            </>
          )}

          {/* Mustache only - thicker with outline for visibility */}
          {features.facialHairStyle === 'mustache' && (
            <>
              {/* Dark outline */}
              <path
                d={`M${38} 60 Q50 66 ${62} 60`}
                stroke={hairDark}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Lighter inner stroke */}
              <path
                d={`M${38} 60 Q50 66 ${62} 60`}
                stroke={effectiveHairColor}
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}

          {/* Goatee - thicker mustache + chin beard */}
          {features.facialHairStyle === 'goatee' && (
            <>
              {/* Mustache with outline */}
              <path d={`M${40} 60 Q50 65 ${60} 60`} stroke={hairDark} strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d={`M${40} 60 Q50 65 ${60} 60`} stroke={effectiveHairColor} strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Chin beard with shadow */}
              <ellipse cx="50" cy="70" rx={7 * features.faceWidth} ry="7" fill={hairDark} opacity={0.4} />
              <ellipse cx="50" cy="70" rx={6 * features.faceWidth} ry="6" fill={effectiveHairColor} />
            </>
          )}
        </>
      )}

      {/* Children's hair - uses showHair logic like adults, and respects 'covered' hairStyle */}
      {features.isChild && features.showHair && features.hairStyle !== 'covered' && (
        <g>
          {/* Base hair cap - with volume variation */}
          {(() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            const baseRx = (features.hairStyle === 'long' ? 24 : features.hairStyle === 'medium' ? 23 : 21) * volumeMultiplier;
            const baseRy = (features.hairStyle === 'long' ? 18 : 16) * volumeMultiplier;

            return (
              <ellipse
                cx="50"
                cy="33"
                rx={baseRx}
                ry={baseRy}
                fill={effectiveHairColor}
              />
            );
          })()}
          {/* Side hair for medium/long - girls typically have longer hair - with asymmetry */}
          {(features.hairStyle === 'medium' || features.hairStyle === 'long' || gender === 'Female') && (() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            const baseRy = (features.hairStyle === 'long' ? 16 : features.hairStyle === 'medium' ? 13 : 11) * volumeMultiplier;
            const leftRy = baseRy * (1 + features.hairAsymmetry);
            const rightRy = baseRy * (1 - features.hairAsymmetry);

            return (
              <>
                <ellipse
                  cx="30"
                  cy="48"
                  rx={4 * volumeMultiplier}
                  ry={leftRy}
                  fill={effectiveHairColor}
                />
                <ellipse
                  cx="70"
                  cy="48"
                  rx={4 * volumeMultiplier}
                  ry={rightRy}
                  fill={effectiveHairColor}
                />
              </>
            );
          })()}
          {/* Long hair back flow for children */}
          {features.hairStyle === 'long' && (() => {
            const volumeMultiplier = features.hairVolume === 'voluminous' ? 1.3 : features.hairVolume === 'sleek' ? 0.7 : 1.0;
            return (
              <ellipse cx="50" cy="75" rx={16 * volumeMultiplier} ry={11 * volumeMultiplier} fill={hairDark} />
            );
          })()}
        </g>
      )}

      {/* Ears (visible when no full head covering) */}
      {(features.headwearStyle === 'none' || (gender === 'Male' && features.headwearStyle !== 'turban' && features.headwearStyle !== 'scarf')) && (
        <>
          <ellipse cx={28 + (1 - features.faceWidth) * 10} cy="50" rx="4" ry="6" fill={effectiveSkinTone} />
          <ellipse cx={72 - (1 - features.faceWidth) * 10} cy="50" rx="4" ry="6" fill={effectiveSkinTone} />
        </>
      )}

      {/* Deceased overlay */}
      {isDeceased && (
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="#666"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.5"
        />
      )}
    </svg>
  );
};
