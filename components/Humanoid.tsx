
import React, { useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const damaskCache = new Map<string, THREE.CanvasTexture>();
const strawCache = new Map<string, THREE.CanvasTexture>();
const motifCache = new Map<string, THREE.CanvasTexture>();
const hairCache = new Map<string, THREE.CanvasTexture>();

// Hair strand texture - creates realistic hair strand pattern
const getHairTexture = (baseHex: string, isGraying: boolean = false) => {
  const key = `${baseHex}_${isGraying}`;
  const cached = hairCache.get(key);
  if (cached) return cached;

  const size = 128; // Higher resolution for better detail
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Parse base color
  const hex = baseHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Fill with darker base for depth
  ctx.fillStyle = `rgb(${Math.floor(r * 0.75)}, ${Math.floor(g * 0.75)}, ${Math.floor(b * 0.75)})`;
  ctx.fillRect(0, 0, size, size);

  // Draw dense vertical hair strands with variation
  for (let x = 0; x < size; x += 1) {
    // Vary strand brightness - wider range for more natural look
    const variation = 0.65 + Math.random() * 0.55;
    const strandR = Math.min(255, Math.floor(r * variation));
    const strandG = Math.min(255, Math.floor(g * variation));
    const strandB = Math.min(255, Math.floor(b * variation));

    ctx.strokeStyle = `rgb(${strandR}, ${strandG}, ${strandB})`;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.lineWidth = 0.8 + Math.random() * 0.8;

    // Wavy strands with bezier curves for natural flow
    ctx.beginPath();
    const startOffset = (Math.random() - 0.5) * 3;
    const midOffset = (Math.random() - 0.5) * 6;
    const endOffset = (Math.random() - 0.5) * 4;
    ctx.moveTo(x + startOffset, 0);
    ctx.quadraticCurveTo(x + midOffset, size / 2, x + endOffset, size);
    ctx.stroke();
  }

  // Add darker shadow strands for depth
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    ctx.strokeStyle = `rgb(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 4, size / 2, x + (Math.random() - 0.5) * 3, size);
    ctx.stroke();
  }

  // Add highlight strands for shine
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 24; i++) {
    const x = Math.random() * size;
    ctx.strokeStyle = `rgb(${Math.min(255, r + 70)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 50)})`;
    ctx.lineWidth = 0.8 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 3, size / 2, x + (Math.random() - 0.5) * 2, size);
    ctx.stroke();
  }

  // If graying, add white/gray strands
  if (isGraying) {
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const grayValue = 170 + Math.floor(Math.random() * 85);
      ctx.strokeStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
      ctx.lineWidth = 0.8 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 2, size / 2, x + (Math.random() - 0.5) * 2, size);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2); // Reduced repeat for less visible tiling
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  hairCache.set(key, texture);
  return texture;
};

const getDamaskTexture = (baseHex: string, accentHex: string, alpha: number) => {
  const key = `${baseHex}_${accentHex}_${alpha}`;
  const cached = damaskCache.get(key);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const motif = accentHex;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = motif;
  const step = 28;
  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(x + step / 2, y + 4);
      ctx.lineTo(x + step - 4, y + step / 2);
      ctx.lineTo(x + step / 2, y + step - 4);
      ctx.lineTo(x + 4, y + step / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = Math.max(0.08, alpha * 0.65);
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  damaskCache.set(key, texture);
  return texture;
};

const getStrawTexture = (baseHex: string, accentHex: string) => {
  const key = `${baseHex}_${accentHex}`;
  const cached = strawCache.get(key);
  if (cached) return cached;
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  for (let y = -size; y < size * 2; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + size);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.2;
  for (let x = -size; x < size * 2; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, size);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  strawCache.set(key, texture);
  return texture;
};

const getMotifTexture = (pattern: 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric', baseHex: string, accentHex: string, repeat = 3) => {
  const key = `${pattern}_${baseHex}_${accentHex}_${repeat}`;
  const cached = motifCache.get(key);
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.55;
  if (pattern === 'stripe') {
    for (let y = 0; y < size; y += 6) {
      ctx.fillRect(0, y, size, 2);
    }
  } else if (pattern === 'chevron') {
    for (let y = 0; y < size; y += 12) {
      for (let x = 0; x < size; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x + 12, y + 6);
        ctx.lineTo(x + 6, y + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (pattern === 'ikat') {
    // Ikat: Tie-dye with blurred, feathered diamond shapes
    // Uses softer edges to simulate the dye bleeding effect
    const step = 16;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const offsetX = (Math.floor(y / step) % 2) * (step / 2);
        // Create fuzzy diamond with gradient-like effect
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(x + offsetX + step / 2, y + 1);
        ctx.lineTo(x + offsetX + step - 2, y + step / 2);
        ctx.lineTo(x + offsetX + step / 2, y + step - 1);
        ctx.lineTo(x + offsetX + 2, y + step / 2);
        ctx.closePath();
        ctx.fill();
        // Inner diamond (sharper)
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(x + offsetX + step / 2, y + 4);
        ctx.lineTo(x + offsetX + step - 5, y + step / 2);
        ctx.lineTo(x + offsetX + step / 2, y + step - 4);
        ctx.lineTo(x + offsetX + 5, y + step / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (pattern === 'tiraz') {
    // Tiraz: Islamic inscription bands - horizontal bands with geometric motifs
    // Simulates the embroidered bands found on medieval Islamic textiles
    ctx.globalAlpha = 0.5;
    // Upper band
    ctx.fillRect(0, 8, size, 4);
    // Lower band
    ctx.fillRect(0, size - 12, size, 4);
    // Small geometric accents in bands
    ctx.globalAlpha = 0.7;
    for (let x = 0; x < size; x += 10) {
      // Diamond accents in upper band
      ctx.beginPath();
      ctx.moveTo(x + 5, 6);
      ctx.lineTo(x + 8, 10);
      ctx.lineTo(x + 5, 14);
      ctx.lineTo(x + 2, 10);
      ctx.closePath();
      ctx.fill();
      // Diamond accents in lower band
      ctx.beginPath();
      ctx.moveTo(x + 5, size - 14);
      ctx.lineTo(x + 8, size - 10);
      ctx.lineTo(x + 5, size - 6);
      ctx.lineTo(x + 2, size - 10);
      ctx.closePath();
      ctx.fill();
    }
    // Central subtle motifs
    ctx.globalAlpha = 0.25;
    for (let x = 0; x < size; x += 16) {
      ctx.beginPath();
      ctx.arc(x + 8, size / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'geometric') {
    // Islamic geometric: interlocking 8-pointed stars
    const step = 22;
    ctx.globalAlpha = 0.5;
    for (let y = -step / 2; y < size + step; y += step) {
      for (let x = -step / 2; x < size + step; x += step) {
        const cx = x + step / 2;
        const cy = y + step / 2;
        const r = step * 0.4;
        // 8-pointed star
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const outerR = i % 2 === 0 ? r : r * 0.5;
          const px = cx + Math.cos(angle) * outerR;
          const py = cy + Math.sin(angle) * outerR;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Central dot
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
      }
    }
  } else {
    // damask (default)
    const step = 20;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        ctx.beginPath();
        ctx.moveTo(x + step / 2, y + 3);
        ctx.lineTo(x + step - 3, y + step / 2);
        ctx.lineTo(x + step / 2, y + step - 3);
        ctx.lineTo(x + 3, y + step / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  motifCache.set(key, texture);
  return texture;
};

interface HumanoidProps {
  color?: string;
  headColor?: string;
  turbanColor?: string;
  headscarfColor?: string;
  gender?: 'Male' | 'Female';
  hairColor?: string;
  scale?: [number, number, number];
  isWalking?: boolean;
  isSprinting?: boolean;
  isDead?: boolean;
  isJumping?: boolean;
  jumpPhase?: number;
  isJumpingRef?: React.MutableRefObject<boolean>;
  jumpPhaseRef?: React.MutableRefObject<number>;
  jumpAnticipationRef?: React.MutableRefObject<number>;
  landingImpulseRef?: React.MutableRefObject<number>;
  jumpChargeRef?: React.MutableRefObject<number>;
  isClimbing?: boolean;
  climbAnimationPhaseRef?: React.MutableRefObject<number>;
  animationBoost?: number;
  walkSpeed?: number;
  enableArmSwing?: boolean;
  armSwingMode?: 'both' | 'left' | 'right' | 'none';
  interactionSwingRef?: React.MutableRefObject<number>;
  interactionChargeRef?: React.MutableRefObject<number>; // Wind-up charge (0-1) while holding
  robeAccentColor?: string;
  robeHasSash?: boolean;
  robeSleeves?: boolean;
  robeHasTrim?: boolean;
  robeHemBand?: boolean;
  robeSpread?: number;
  robeOverwrap?: boolean;
  robePattern?: 'none' | 'damask' | 'stripe' | 'chevron' | 'ikat' | 'tiraz' | 'geometric';
  robePatternScale?: number;
  sashPattern?: 'none' | 'stripe';
  sashPatternScale?: number;
  hairStyle?: 'short' | 'medium' | 'long' | 'covered';
  facialHair?: 'none' | 'stubble' | 'short_beard' | 'full_beard' | 'mustache' | 'goatee';
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
  distanceFromCamera?: number;  // PERFORMANCE: LOD - skip detail when far
  showGroundShadow?: boolean;
  // Gaze tracking - world position to look toward (e.g., player position)
  gazeTarget?: { x: number; y: number; z: number };
  // This humanoid's world position (needed for calculating gaze direction)
  worldPosition?: { x: number; y: number; z: number };
  // Action animation - for warn, encourage, observe gestures
  actionAnimationRef?: React.MutableRefObject<{ action: string; progress: number } | null>;
  // Sickness level (0 = healthy, 1 = fully sick) - affects skin pallor
  sicknessLevel?: number;
  // Plague infection state
  isInfected?: boolean;
  isIncubating?: boolean;
  age?: number;
  // Portrait mode - enables enhanced facial animations (only for encounter modal)
  portraitMode?: boolean;
  isSpeaking?: boolean;
  mood?: string;
  panicLevel?: number;
}

export const Humanoid: React.FC<HumanoidProps> = memo(({
  color = '#2a3b55',
  headColor = '#e0ac69',
  turbanColor = '#f0f0f0',
  headscarfColor = '#b08968',
  gender = 'Male',
  hairColor = '#3b2a1a',
  scale = [1, 1, 1] as [number, number, number],
  isWalking = false,
  isSprinting = false,
  isDead = false,
  isJumping = false,
  jumpPhase = 0,
  isJumpingRef,
  jumpPhaseRef,
  jumpAnticipationRef,
  landingImpulseRef,
  jumpChargeRef,
  isClimbing = false,
  climbAnimationPhaseRef,
  animationBoost = 1,
  walkSpeed = 10,
  enableArmSwing = false,
  armSwingMode = 'both',
  interactionSwingRef,
  interactionChargeRef,
  robeAccentColor = '#d0b992',
  robeHasSash = false,
  robeSleeves = true,
  robeHasTrim = true,
  robeHemBand,
  robeSpread,
  robeOverwrap,
  robePattern = 'none',
  robePatternScale,
  sashPattern = 'none',
  sashPatternScale,
  hairStyle: hairStyleProp,
  facialHair = 'none',
  headwearStyle: headwearStyleProp,
  sleeveCoverage = robeSleeves ? 'full' : 'none',
  footwearStyle = 'sandals',
  footwearColor = '#9b7b4f',
  accessories = [],
  distanceFromCamera = 0,
  showGroundShadow = true,
  gazeTarget,
  worldPosition,
  actionAnimationRef,
  sicknessLevel = 0,
  isInfected = false,
  isIncubating = false,
  age,
  // Portrait mode props (only used in encounter modal)
  portraitMode = false,
  isSpeaking = false,
  mood = 'neutral',
  panicLevel = 0,
}) => {
  // PERFORMANCE: LOD - skip facial details beyond 25 units
  const showFacialDetails = distanceFromCamera < 25;
  // PERFORMANCE: Hair LOD tiers - high detail when close, simplified when far
  const hairLOD: 'high' | 'medium' | 'low' =
    distanceFromCamera < 15 ? 'high' :
    distanceFromCamera < 35 ? 'medium' : 'low';

  // PLAGUE VISUAL: Apply sickly pallor to skin based on sickness level
  const sickHeadColor = useMemo(() => {
    if (sicknessLevel <= 0) return headColor;
    const baseColor = new THREE.Color(headColor);
    // Sickly greenish-gray pallor
    const sickColor = new THREE.Color('#8a9a7a'); // Pale greenish-gray
    baseColor.lerp(sickColor, sicknessLevel * 0.4); // Up to 40% tint
    // Also desaturate
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    baseColor.setHSL(hsl.h, hsl.s * (1 - sicknessLevel * 0.5), hsl.l * (1 - sicknessLevel * 0.15));
    return baseColor.getStyle();
  }, [headColor, sicknessLevel]);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftKnee = useRef<THREE.Group>(null);
  const rightKnee = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
  const sashFrontRef = useRef<THREE.Mesh>(null);
  const trimFrontRef = useRef<THREE.Mesh>(null);
  const robeHemRef = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Group>(null);
  const rightFoot = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);
  const hipGroup = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const rightShoulder = useRef<THREE.Group>(null);

  // PLAGUE VISUALS: Coughing animation for infected NPCs
  const coughTimer = useRef(0);
  const coughPhase = useRef(0);
  const glowIntensity = useRef(0);

  const isFemale = gender === 'Female';
  const faceShadowColor = useMemo(() => new THREE.Color(sickHeadColor).multiplyScalar(0.85).getStyle(), [sickHeadColor]);
  const faceHighlightColor = useMemo(() => new THREE.Color(sickHeadColor).multiplyScalar(1.08).getStyle(), [sickHeadColor]);
  const lipColor = useMemo(() => {
    const color = new THREE.Color(headColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const warmed = new THREE.Color().setHSL(0.01, Math.min(0.55, hsl.s + 0.12), Math.max(0.2, hsl.l - 0.08));
    return warmed.getStyle();
  }, [headColor]);
  const lipUpperColor = useMemo(() => {
    const color = new THREE.Color(headColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const warmed = new THREE.Color().setHSL(0.01, Math.min(0.55, hsl.s + 0.14), Math.max(0.18, hsl.l - 0.12));
    return warmed.getStyle();
  }, [headColor]);
  const hairStyle = useMemo(() => {
    if (hairStyleProp) return hairStyleProp;
    if (isFemale) return 'covered';
    const roll = Math.random();
    return roll > 0.66 ? 'short' : roll > 0.33 ? 'medium' : 'long';
  }, [hairStyleProp, isFemale]);
  const headwearStyle = useMemo(() => {
    if (headwearStyleProp) return headwearStyleProp;
    return isFemale ? 'scarf' : 'none';
  }, [headwearStyleProp, isFemale]);
  const hasShortHair = hairStyle === 'short';
  const faceVariant = useMemo(() => {
    return {
      eyeSpacing: 0.055 + (Math.random() - 0.5) * 0.012,
      eyeYOffset: (Math.random() - 0.5) * 0.008,
      eyeScaleY: 0.9 + Math.random() * 0.2,
      browYOffset: (Math.random() - 0.5) * 0.01,
      browHeightScale: 0.85 + Math.random() * 0.3,
      mouthWidthScale: 0.9 + Math.random() * 0.2,
      mouthYOffset: (Math.random() - 0.5) * 0.01,
    };
  }, []);
  const lipWidthScale = useMemo(() => 0.95 + Math.random() * 0.15, []);
  const lipLowerScale = useMemo(() => 1.08 + Math.random() * 0.18, []);
  const lipGap = useMemo(() => 0.006 + Math.random() * 0.004, []);
  const headwearShadow = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(0.85).getStyle(), [headscarfColor]);
  const headwearHighlight = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(1.08).getStyle(), [headscarfColor]);
  const turbanHighlight = useMemo(() => {
    const hash = turbanColor.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    if (headwearStyle === 'turban' || headwearStyle === 'fez') {
      if (hash % 3 === 0) return '#f4efe6'; // white stripe option
      if (hash % 5 === 0) return new THREE.Color(turbanColor).multiplyScalar(0.65).getStyle();
    }
    return new THREE.Color(turbanColor).multiplyScalar(1.18).getStyle();
  }, [turbanColor, headwearStyle]);
  const femaleRobeSpread = useMemo(() => robeSpread ?? (0.75 + Math.random() * 0.18), [robeSpread]);
  const femaleRobeBand = useMemo(() => robeHemBand ?? (Math.random() > 0.5), [robeHemBand]);
  const eyeScale = useMemo(() => {
    const base = isFemale ? [1.7, 0.85, 0.7] : [1.4, 0.7, 0.7];
    return [base[0], base[1] * faceVariant.eyeScaleY, base[2]] as [number, number, number];
  }, [isFemale, faceVariant.eyeScaleY]);
  const eyeY = (isFemale ? 0.03 : 0.02) + faceVariant.eyeYOffset;
  const browColor = isFemale ? faceShadowColor : '#3a2a1a';
  const browHeight = Math.max(0.02, (isFemale ? 0.03 : 0.04) * faceVariant.browHeightScale);
  const browY = eyeY + 0.045 + faceVariant.browYOffset;
  const browX = faceVariant.eyeSpacing - 0.008;
  const noseLength = isFemale ? 0.09 : 0.1;
  const noseRadius = isFemale ? 0.015 : 0.017;
  const mouthWidth = isFemale ? 0.045 : 0.05;
  const mouthY = (isFemale ? -0.095 : -0.09) + faceVariant.mouthYOffset;
  const upperArmColor = sleeveCoverage === 'full' ? color : sleeveCoverage === 'lower' ? headColor : headColor;
  const lowerArmColor = sleeveCoverage === 'none' ? headColor : color;
  const hasAccessory = (value: string) => accessories.includes(value);
  const clothRoughness = useMemo(() => 0.88 + (Math.random() - 0.5) * 0.08, []);
  const accentRoughness = useMemo(() => 0.9 + (Math.random() - 0.5) * 0.06, []);
  const adjustColor = (hex: string, factor: number) => {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) * factor)));
    const b = Math.min(255, Math.max(0, Math.round((num & 0xff) * factor)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  const strawMap = useMemo(() => {
    if (headwearStyle !== 'straw') return null;
    return getStrawTexture('#d2b889', '#b7925e') ?? null;
  }, [headwearStyle]);
  const motifMap = useMemo(() => {
    if (robePattern === 'none' || distanceFromCamera > 25) return null;
    const hash = (color + robeAccentColor).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const contrast = hash % 3 === 0;
    const motif = contrast ? adjustColor(robeAccentColor, 1.35) : adjustColor(color, 1.2);
    const repeat = Math.max(1.8, robePatternScale ?? 3);
    return getMotifTexture(robePattern, '#000000', motif, repeat) ?? null;
  }, [color, robeAccentColor, robePattern, distanceFromCamera, robePatternScale]);

  const sashMap = useMemo(() => {
    if (!robeHasSash || sashPattern !== 'stripe' || distanceFromCamera > 25) return null;
    const base = adjustColor(robeAccentColor, 0.85);
    const accent = adjustColor(robeAccentColor, 1.2);
    const repeat = Math.max(4, sashPatternScale ?? 7);
    return getMotifTexture('stripe', base, accent, repeat) ?? null;
  }, [robeHasSash, sashPattern, distanceFromCamera, robeAccentColor, sashPatternScale]);

  // Hair texture - only for HIGH LOD (close up) for performance
  const hairTexture = useMemo(() => {
    if (hairLOD !== 'high' || headwearStyle !== 'none' || hairStyle === 'covered') return null;
    // Detect if hair is graying by checking for lighter color values
    const hex = hairColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const avg = (r + g + b) / 3;
    const isGraying = avg > 80; // Graying hair tends to be lighter
    return getHairTexture(hairColor, isGraying) ?? null;
  }, [hairColor, hairLOD, headwearStyle, hairStyle]);

  const eyeColor = useMemo(() => {
    const roll = Math.random();
    if (roll > 0.98) return '#6aa0c8'; // rare blue
    if (roll > 0.92) return '#4a6b3f'; // occasional green
    if (roll > 0.6) return '#3b2a1a'; // deep brown
    return '#2a1a12'; // very dark brown
  }, []);
  const strideVariance = useMemo(() => 0.85 + Math.random() * 0.3, []);
  const armVariance = useMemo(() => 0.85 + Math.random() * 0.3, []);
  const gaitPhaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  const ageScale = useMemo(() => {
    if (age === undefined) return 1;
    if (age < 18) return 1.08;
    if (age < 35) return 1.0;
    if (age < 55) return 0.92;
    return 0.82;
  }, [age]);
  const healthScale = useMemo(() => Math.max(0.6, 1 - sicknessLevel * 0.35), [sicknessLevel]);
  const upperLidLeft = useRef<THREE.Mesh>(null);
  const upperLidRight = useRef<THREE.Mesh>(null);
  const lowerLidLeft = useRef<THREE.Mesh>(null);
  const lowerLidRight = useRef<THREE.Mesh>(null);
  const blinkTimer = useRef(0);
  const blinkCooldown = useRef(2 + Math.random() * 3); // 2-5 seconds initial
  const blinkProgress = useRef(0);
  const isBlinking = useRef(false);

  // Portrait mode refs (only used when portraitMode=true)
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const mouthInteriorRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);

  // Portrait mode animation state
  const speakPhase = useRef(0);
  const mouthOpenAmount = useRef(0);
  const animBrowAngle = useRef(0);
  const animBrowHeight = useRef(0);
  const targetBrowAngle = useRef(0);
  const targetBrowHeight = useRef(0);

  // Idle weight shifting state
  const idleShiftTimer = useRef(0);
  const idleShiftCooldown = useRef(3 + Math.random() * 4);
  const idleShiftProgress = useRef(0);
  const idleShiftDirection = useRef(Math.random() > 0.5 ? 1 : -1);
  const isIdleShifting = useRef(false);
  const idleHeadTurnTimer = useRef(0);
  const idleHeadTurnTarget = useRef(0);

  // Eye gaze refs
  const leftEye = useRef<THREE.Group>(null);
  const rightEye = useRef<THREE.Group>(null);
  // Gaze tracking state
  const currentGazeYaw = useRef(0);
  const currentGazePitch = useRef(0);
  // Eye scanning state (eyes shift while walking)
  const eyeScanTimer = useRef(Math.random() * 3);
  const eyeScanTargetX = useRef(0);
  const eyeScanTargetY = useRef(0);
  const eyeScanCooldown = useRef(0.8 + Math.random() * 1.5);

  useFrame((state) => {
    if (isDead) {
      if (bodyGroup.current) {
        // Corpse falls forward and lies on the ground
        bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, Math.PI / 2, 0.1);
        // Keep corpse at ground level (y = 0.15 to account for body thickness when lying flat)
        bodyGroup.current.position.y = THREE.MathUtils.lerp(bodyGroup.current.position.y, 0.15, 0.1);
        // Offset forward slightly so body lies naturally
        bodyGroup.current.position.z = THREE.MathUtils.lerp(bodyGroup.current.position.z, 0.5, 0.1);
      }
      return;
    }

    // PLAGUE VISUALS: Coughing animation and red glow for infected NPCs
    const dt = state.clock.getDelta();
    if (isInfected || isIncubating) {
      // Coughing animation - periodic chest heave and head forward
      coughTimer.current += dt;
      const coughInterval = 3 + Math.random() * 2; // Cough every 3-5 seconds

      if (coughTimer.current > coughInterval) {
        coughTimer.current = 0;
        coughPhase.current = 1; // Start cough
      }

      // Animate cough phase
      if (coughPhase.current > 0) {
        coughPhase.current = Math.max(0, coughPhase.current - dt * 3); // Decay over ~0.33 seconds

        // Apply cough animation to torso and head
        if (torsoGroup.current) {
          const coughBend = Math.sin(coughPhase.current * Math.PI) * 0.3; // Lean forward
          torsoGroup.current.rotation.x = THREE.MathUtils.lerp(
            torsoGroup.current.rotation.x,
            coughBend,
            0.3
          );
        }
        if (headGroup.current) {
          const headForward = Math.sin(coughPhase.current * Math.PI) * 0.4;
          headGroup.current.rotation.x = THREE.MathUtils.lerp(
            headGroup.current.rotation.x,
            headForward,
            0.3
          );
        }
      }

      // Pulsing red glow intensity
      glowIntensity.current = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    } else {
      glowIntensity.current = 0;
      coughPhase.current = 0;
      coughTimer.current = 0;
    }

    const jumping = isJumpingRef ? isJumpingRef.current : isJumping;
    const jumpT = jumpPhaseRef ? jumpPhaseRef.current : jumpPhase;
    const anticipate = jumpAnticipationRef ? jumpAnticipationRef.current : 0;
    const landing = landingImpulseRef ? landingImpulseRef.current : 0;
    const jumpBoost = jumpChargeRef ? jumpChargeRef.current : 0;
    const baseSpeed = isSprinting ? walkSpeed * 2.2 : walkSpeed;
    const effectiveWalkSpeed = baseSpeed * ageScale * healthScale * (0.9 + strideVariance * 0.15);
    const t = state.clock.elapsedTime * effectiveWalkSpeed + gaitPhaseOffset;
    const strideScale = (isFemale ? 0.88 : 1) * (age < 18 ? 1.05 : age !== undefined && age > 55 ? 0.9 : 1);
    const amp = isWalking ? (isSprinting ? 0.85 : 0.55) * strideScale * strideVariance : 0; // Stronger walk stride

    // Easing function for more organic, weighted movement
    const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);

    // Convert sine wave to 0-1 range, apply easing, convert back
    const rawLeftPhase = Math.sin(t);
    const rawRightPhase = Math.sin(t + Math.PI);
    const leftNorm = (rawLeftPhase + 1) / 2; // 0 to 1
    const rightNorm = (rawRightPhase + 1) / 2;
    const leftPhase = easeInOutQuad(leftNorm) * 2 - 1; // Back to -1 to 1 with easing
    const rightPhase = easeInOutQuad(rightNorm) * 2 - 1;

    // Leg swinging with eased motion for weight transfer feel
    if (leftLeg.current) {
      const targetRotation = isWalking ? leftPhase * amp : 0;
      leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, targetRotation, 0.15);
    }
    if (rightLeg.current) {
      const targetRotation = isWalking ? rightPhase * amp : 0;
      rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, targetRotation, 0.15);
    }

    // Knee bending - flexes during swing phase, extends during stance
    // Knee bends more when sprinting (leg kicks up higher behind)
    const leftKneeFlexion = isWalking ? Math.max(0, -leftPhase) * (isSprinting ? 1.1 : 0.5) : 0;
    const rightKneeFlexion = isWalking ? Math.max(0, -rightPhase) * (isSprinting ? 1.1 : 0.5) : 0;
    if (leftKnee.current) {
      leftKnee.current.rotation.x = THREE.MathUtils.lerp(leftKnee.current.rotation.x, leftKneeFlexion, 0.15);
    }
    if (rightKnee.current) {
      rightKnee.current.rotation.x = THREE.MathUtils.lerp(rightKnee.current.rotation.x, rightKneeFlexion, 0.15);
    }

    // Hip counter-rotation for natural weight shift
    if (hipGroup.current && isWalking) {
      const hipRotation = leftPhase * amp * (isSprinting ? 0.28 : 0.22);
      const hipTilt = Math.abs(leftPhase) * amp * (isSprinting ? 0.1 : 0.08); // More tilt during sprint
      hipGroup.current.rotation.y = hipRotation;
      hipGroup.current.rotation.z = leftPhase * amp * 0.06;
    } else if (hipGroup.current) {
      hipGroup.current.rotation.y = THREE.MathUtils.lerp(hipGroup.current.rotation.y, 0, 0.1);
      hipGroup.current.rotation.z = THREE.MathUtils.lerp(hipGroup.current.rotation.z, 0, 0.1);
    }

    // Torso twist - counter-rotates against hips for natural contra-posto
    if (torsoGroup.current && isWalking) {
      const torsoTwist = -leftPhase * amp * 0.15; // Opposite to hip rotation
      const torsoLean = leftPhase * amp * 0.04; // Subtle side lean
      torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, torsoTwist, 0.15);
      torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, torsoLean, 0.12);
    } else if (torsoGroup.current) {
      torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, 0, 0.1);
      torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, 0, 0.1);
    }

    // Idle weight shifting - periodic subtle movement when standing still
    if (!isWalking && !jumping) {
      idleShiftTimer.current += dt;

      // Trigger new weight shift periodically
      if (!isIdleShifting.current && idleShiftTimer.current > idleShiftCooldown.current) {
        isIdleShifting.current = true;
        idleShiftProgress.current = 0;
        idleShiftDirection.current *= -1; // Alternate sides
        idleShiftCooldown.current = 3 + Math.random() * 5; // 3-8 seconds between shifts
      }

      // Animate the weight shift
      if (isIdleShifting.current) {
        idleShiftProgress.current += dt * 0.8; // Slow, natural movement
        const shiftT = Math.min(1, idleShiftProgress.current);
        const shiftEased = Math.sin(shiftT * Math.PI); // Smooth in and out
        const shiftAmount = shiftEased * idleShiftDirection.current;

        // Hip tilts toward weight-bearing leg
        if (hipGroup.current) {
          hipGroup.current.rotation.z = THREE.MathUtils.lerp(hipGroup.current.rotation.z, shiftAmount * 0.04, 0.08);
        }

        // Torso compensates in opposite direction
        if (torsoGroup.current) {
          torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, -shiftAmount * 0.03, 0.06);
        }

        // Shoulders drop slightly on weight-bearing side
        if (leftShoulder.current) {
          leftShoulder.current.position.y = THREE.MathUtils.lerp(leftShoulder.current.position.y || 0, 1.4 + shiftAmount * 0.02, 0.08);
        }
        if (rightShoulder.current) {
          rightShoulder.current.position.y = THREE.MathUtils.lerp(rightShoulder.current.position.y || 0, 1.4 - shiftAmount * 0.02, 0.08);
        }

        if (shiftT >= 1) {
          isIdleShifting.current = false;
          idleShiftTimer.current = 0;
        }
      }

      // Occasional idle head turn/glance
      idleHeadTurnTimer.current += dt;
      if (idleHeadTurnTimer.current > 5 + Math.random() * 8) {
        idleHeadTurnTarget.current = (Math.random() - 0.5) * 0.4; // Random head turn angle
        idleHeadTurnTimer.current = 0;
      }
      if (headGroup.current) {
        const currentHeadY = headGroup.current.rotation.y || 0;
        headGroup.current.rotation.y = THREE.MathUtils.lerp(currentHeadY, idleHeadTurnTarget.current, 0.02);
      }
    } else {
      // Reset idle animation state when walking
      isIdleShifting.current = false;
      idleShiftTimer.current = 0;
      idleHeadTurnTarget.current = 0;
    }

    // Gaze tracking - look toward target (e.g., player) when nearby
    if (gazeTarget && worldPosition && headGroup.current) {
      // Calculate direction to target
      const dx = gazeTarget.x - worldPosition.x;
      const dz = gazeTarget.z - worldPosition.z;
      const dy = gazeTarget.y - (worldPosition.y + 1.75); // Head height
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      // Only track targets within 8 units
      if (distToTarget < 8 && distToTarget > 0.5) {
        // Calculate yaw (horizontal turn) and pitch (vertical tilt) to target
        const targetYaw = Math.atan2(-dx, -dz); // Negate for correct direction
        const targetPitch = Math.atan2(dy, distToTarget);

        // Clamp to natural head turn limits
        const maxYaw = 0.7; // ~40 degrees
        const maxPitch = 0.35; // ~20 degrees
        const clampedYaw = THREE.MathUtils.clamp(targetYaw, -maxYaw, maxYaw);
        const clampedPitch = THREE.MathUtils.clamp(targetPitch, -maxPitch, maxPitch);

        // Smoothly interpolate toward target gaze
        currentGazeYaw.current = THREE.MathUtils.lerp(currentGazeYaw.current, clampedYaw, 0.04);
        currentGazePitch.current = THREE.MathUtils.lerp(currentGazePitch.current, clampedPitch, 0.04);

        // Apply head rotation (combine with existing head movement)
        const existingY = headGroup.current.rotation.y || 0;
        headGroup.current.rotation.y = THREE.MathUtils.lerp(existingY, currentGazeYaw.current, 0.06);
        headGroup.current.rotation.x = (headGroup.current.rotation.x || 0) + currentGazePitch.current * 0.5;

        // Eye gaze - eyes move faster and track more precisely
        const eyeYaw = THREE.MathUtils.clamp(targetYaw - currentGazeYaw.current, -0.25, 0.25);
        const eyePitch = THREE.MathUtils.clamp(targetPitch - currentGazePitch.current, -0.15, 0.15);

        // Shift eye position to look at target
        const gazeOffsetX = eyeYaw * 0.015;
        const gazeOffsetY = eyePitch * 0.01;
        if (leftEye.current) {
          const baseX = -faceVariant.eyeSpacing;
          leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX + gazeOffsetX, 0.15);
          leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, eyeY + gazeOffsetY, 0.15);
        }
        if (rightEye.current) {
          const baseX = faceVariant.eyeSpacing;
          rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX + gazeOffsetX, 0.15);
          rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, eyeY + gazeOffsetY, 0.15);
        }
      } else {
        // Target out of range - return to forward gaze
        currentGazeYaw.current = THREE.MathUtils.lerp(currentGazeYaw.current, 0, 0.02);
        currentGazePitch.current = THREE.MathUtils.lerp(currentGazePitch.current, 0, 0.02);

        if (leftEye.current) {
          const baseX = -faceVariant.eyeSpacing;
          leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX, 0.08);
          leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, eyeY, 0.08);
        }
        if (rightEye.current) {
          const baseX = faceVariant.eyeSpacing;
          rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX, 0.08);
          rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, eyeY, 0.08);
        }
      }
    }

    // Eye scanning - eyes shift around while walking (when not tracking a target)
    if (!gazeTarget && (leftEye.current || rightEye.current)) {
      const dt = state.clock.getDelta();
      eyeScanTimer.current += dt;

      // Pick new random eye target periodically
      if (eyeScanTimer.current > eyeScanCooldown.current) {
        eyeScanTimer.current = 0;
        eyeScanCooldown.current = isWalking ? (0.6 + Math.random() * 1.2) : (1.5 + Math.random() * 3);

        if (isWalking) {
          // While walking, eyes scan more actively - look ahead and to sides
          eyeScanTargetX.current = (Math.random() - 0.5) * 0.35; // Horizontal scan
          eyeScanTargetY.current = (Math.random() - 0.3) * 0.15; // Slight vertical, biased down
        } else {
          // While standing, occasional glances
          eyeScanTargetX.current = (Math.random() - 0.5) * 0.25;
          eyeScanTargetY.current = (Math.random() - 0.5) * 0.1;
        }
      }

      // Smoothly move eyes toward scan target (shift position, not rotation)
      const scanOffsetX = eyeScanTargetX.current * 0.012; // Scale down for subtle movement
      const scanOffsetY = eyeScanTargetY.current * 0.008;
      if (leftEye.current) {
        const baseX = -faceVariant.eyeSpacing;
        leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX + scanOffsetX, 0.08);
        leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, eyeY + scanOffsetY, 0.08);
      }
      if (rightEye.current) {
        const baseX = faceVariant.eyeSpacing;
        rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX + scanOffsetX, 0.08);
        rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, eyeY + scanOffsetY, 0.08);
      }
    }

    // Robe/clothing secondary motion - follows movement with delay
    if (robeHemRef.current) {
      if (isWalking) {
        // Cloth sways with delayed follow-through
        const clothDelay = Math.sin(t - 0.4) * amp * 0.12;
        const clothSway = Math.sin(t * 0.7) * amp * 0.06;
        robeHemRef.current.rotation.x = THREE.MathUtils.lerp(robeHemRef.current.rotation.x, clothDelay, 0.08);
        robeHemRef.current.rotation.z = THREE.MathUtils.lerp(robeHemRef.current.rotation.z, clothSway, 0.06);
      } else if (jumping) {
        // Cloth billows during jump
        const jumpBillow = Math.sin(jumpT * Math.PI) * 0.15;
        robeHemRef.current.rotation.x = THREE.MathUtils.lerp(robeHemRef.current.rotation.x, jumpBillow, 0.1);
      } else {
        // Gentle settle back to rest
        robeHemRef.current.rotation.x = THREE.MathUtils.lerp(robeHemRef.current.rotation.x, 0, 0.05);
        robeHemRef.current.rotation.z = THREE.MathUtils.lerp(robeHemRef.current.rotation.z, 0, 0.05);
      }
    }

    const footBaseY = isFemale ? 0.05 : -0.45;
    const footBaseZ = 0.1;
    // Foot rotation for heel-to-toe movement - only when walking
    if (leftFoot.current) {
      if (isWalking) {
        leftFoot.current.position.z = footBaseZ + leftPhase * (isSprinting ? 0.12 : 0.08);
        leftFoot.current.position.y = footBaseY + Math.max(0, -leftPhase) * (isSprinting ? 0.06 : 0.04);
        leftFoot.current.rotation.x = leftPhase * 0.3;
      } else {
        // Return to rest position when standing
        leftFoot.current.position.z = THREE.MathUtils.lerp(leftFoot.current.position.z, footBaseZ, 0.15);
        leftFoot.current.position.y = THREE.MathUtils.lerp(leftFoot.current.position.y, footBaseY, 0.15);
        leftFoot.current.rotation.x = THREE.MathUtils.lerp(leftFoot.current.rotation.x, 0, 0.15);
      }
    }
    if (rightFoot.current) {
      if (isWalking) {
        rightFoot.current.position.z = footBaseZ + rightPhase * (isSprinting ? 0.12 : 0.08);
        rightFoot.current.position.y = footBaseY + Math.max(0, -rightPhase) * (isSprinting ? 0.06 : 0.04);
        rightFoot.current.rotation.x = rightPhase * 0.3;
      } else {
        // Return to rest position when standing
        rightFoot.current.position.z = THREE.MathUtils.lerp(rightFoot.current.position.z, footBaseZ, 0.15);
        rightFoot.current.position.y = THREE.MathUtils.lerp(rightFoot.current.position.y, footBaseY, 0.15);
        rightFoot.current.rotation.x = THREE.MathUtils.lerp(rightFoot.current.rotation.x, 0, 0.15);
      }
    }
    // Shoulder movement drives arm swing
    if (leftShoulder.current && isWalking) {
      const shoulderSwing = leftPhase * amp * 0.2;
      leftShoulder.current.rotation.z = shoulderSwing;
      leftShoulder.current.rotation.x = leftPhase * amp * 0.15;
    } else if (leftShoulder.current) {
      leftShoulder.current.rotation.z = THREE.MathUtils.lerp(leftShoulder.current.rotation.z, 0, 0.1);
      leftShoulder.current.rotation.x = THREE.MathUtils.lerp(leftShoulder.current.rotation.x, 0, 0.1);
    }
    if (rightShoulder.current && isWalking) {
      const shoulderSwing = rightPhase * amp * 0.2;
      rightShoulder.current.rotation.z = -shoulderSwing;
      rightShoulder.current.rotation.x = rightPhase * amp * 0.15;
    } else if (rightShoulder.current) {
      rightShoulder.current.rotation.z = THREE.MathUtils.lerp(rightShoulder.current.rotation.z, 0, 0.1);
      rightShoulder.current.rotation.x = THREE.MathUtils.lerp(rightShoulder.current.rotation.x, 0, 0.1);
    }

    if (enableArmSwing) {
      // CLIMBING ANIMATION: Hand-over-hand ladder climb
      if (isClimbing && climbAnimationPhaseRef) {
        const climbPhase = climbAnimationPhaseRef.current;
        const climbCycle = climbPhase * Math.PI * 2;

        // Alternate arms reaching up
        const leftReach = Math.sin(climbCycle);
        const rightReach = Math.sin(climbCycle + Math.PI);

        // Arms reach up alternately
        if (leftArm.current) {
          leftArm.current.rotation.x = -2.5 + leftReach * 0.5; // Reaching up
          leftArm.current.rotation.z = 0.3 - Math.abs(leftReach) * 0.2;
          leftArm.current.rotation.y = 0;
        }
        if (rightArm.current) {
          rightArm.current.rotation.x = -2.5 + rightReach * 0.5;
          rightArm.current.rotation.z = -0.3 + Math.abs(rightReach) * 0.2;
          rightArm.current.rotation.y = 0;
        }

        // Bend elbows as if gripping rungs
        if (leftForearm.current) {
          leftForearm.current.rotation.x = -0.8 - Math.max(0, leftReach) * 0.4;
        }
        if (rightForearm.current) {
          rightForearm.current.rotation.x = -0.8 - Math.max(0, rightReach) * 0.4;
        }

        // Legs step up alternately
        if (leftLeg.current) {
          leftLeg.current.rotation.x = -0.6 + leftReach * 0.3;
        }
        if (rightLeg.current) {
          rightLeg.current.rotation.x = -0.6 + rightReach * 0.3;
        }
        if (leftKnee.current) {
          leftKnee.current.rotation.x = Math.max(0, -leftReach) * 0.5;
        }
        if (rightKnee.current) {
          rightKnee.current.rotation.x = Math.max(0, -rightReach) * 0.5;
        }

        // Torso leans slightly forward
        if (torsoGroup.current) {
          torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, 0.15, 0.15);
        }
      } else if (!jumping) {
        // Check if interaction or action animation should take priority
        const interactionCharge = interactionChargeRef?.current ?? 0;
        const interactionSwing = interactionSwingRef?.current ?? 0;
        const actionAnim = actionAnimationRef?.current;
        const hasActionAnimation = actionAnim && actionAnim.progress > 0 && actionAnim.progress < 1;
        const hasInteraction = interactionCharge > 0 || interactionSwing > 0 || hasActionAnimation;

        // Normal walk arm swing - only when not in interaction
        if (!hasInteraction) {
          if (isWalking) {
            const gait = leftPhase;
            const ageArmScale = age !== undefined && age > 55 ? 0.85 : age !== undefined && age < 18 ? 1.05 : 1;
            const armScale = (isFemale ? 0.82 : 1) * ageArmScale * armVariance;
            const armAmp = (isSprinting ? 0.9 : 0.35) * armScale;
            const lift = (isSprinting ? 0.12 : 0.04) * armScale;
            const elbowBase = isSprinting ? -0.9 : -0.35;
            const elbowSwing = (isSprinting ? 0.28 : 0.14) * armScale;

            if ((armSwingMode === 'both' || armSwingMode === 'left') && leftArm.current) {
              const forward = -gait;
              leftArm.current.rotation.x = forward * armAmp - Math.max(0, forward) * lift;
              leftArm.current.rotation.z = 0.06 + Math.abs(forward) * 0.06;
              leftArm.current.rotation.y = forward * 0.03;
              if (leftForearm.current) {
                leftForearm.current.rotation.x = elbowBase - Math.max(0, forward) * elbowSwing;
                leftForearm.current.rotation.z = -0.05;
              }
              if (leftShoulder.current) {
                leftShoulder.current.rotation.x = forward * 0.06;
                leftShoulder.current.rotation.z = Math.max(0, forward) * 0.06;
              }
            }

            if ((armSwingMode === 'both' || armSwingMode === 'right') && rightArm.current) {
              const forward = gait;
              rightArm.current.rotation.x = forward * armAmp - Math.max(0, forward) * lift;
              rightArm.current.rotation.z = -0.06 - Math.abs(forward) * 0.06;
              rightArm.current.rotation.y = -forward * 0.03;
              if (rightForearm.current) {
                rightForearm.current.rotation.x = elbowBase - Math.max(0, forward) * elbowSwing;
                rightForearm.current.rotation.z = 0.05;
              }
              if (rightShoulder.current) {
                rightShoulder.current.rotation.x = forward * 0.06;
                rightShoulder.current.rotation.z = -Math.max(0, forward) * 0.06;
              }
            }
          } else {
            // IDLE: Arms at rest with subtle movement
            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, 0.08);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, 0, 0.08);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, -0.1, 0.08);
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0, 0.08);
              rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, 0, 0.08);
            }
            if (rightForearm.current) {
              rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.1, 0.08);
            }
          }
        }

        // INTERACTION ANIMATIONS - Swing takes priority over wind-up
        const charge = interactionChargeRef?.current ?? 0;
        const swing = interactionSwingRef?.current ?? 0;

        // SWING/RELEASE PHASE - check first so it takes priority
        if (swing > 0 && rightArm.current && rightForearm.current) {
          const s = Math.min(swing, 1);

          if (s < 0.4) {
            // Standard tap - noticeable forward reach
            rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -1.2, 0.3);
            rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, 0.2, 0.25);
            rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.6, 0.3);
            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0.4, 0.2);
            }
          } else {
            // Power swing - dramatic full extension
            const power = (s - 0.4) / 0.6; // 0 to 1 for power range
            rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -1.8 - power * 0.6, 0.35);
            rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, 0.4 + power * 0.3, 0.3);
            rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.8 - power * 0.5, 0.35);
            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0.6 + power * 0.4, 0.25);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, -0.2 - power * 0.2, 0.2);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, -0.3 - power * 0.2, 0.2);
            }
          }
        }
        // WIND-UP PHASE (while charging/holding shift)
        else if (charge > 0 && rightArm.current && rightForearm.current) {
          const c = Math.min(charge, 1);
          // Arm pulls back
          rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0.3 + c * 0.4, 0.12);
          rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -0.15 - c * 0.2, 0.12);
          rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.6 - c * 0.4, 0.12);
          if (leftArm.current) {
            leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, -0.2 - c * 0.15, 0.1);
          }
        }

        // ============ ACTION ANIMATIONS (warn, encourage, observe) ============
        // (actionAnim already declared above for hasInteraction check)
        if (actionAnim && actionAnim.progress > 0) {
          const p = actionAnim.progress; // 0 to 1
          const action = actionAnim.action;

          if (action === 'warn') {
            // WARN: Dramatic stop gesture - both arms thrust up and out
            // Phase 1 (0-0.3): Arms sweep up dramatically
            // Phase 2 (0.3-0.7): Hold at peak, hands spread wide
            // Phase 3 (0.7-1.0): Arms come down with authority
            const phase1 = Math.min(1, p / 0.3);
            const phase2 = p > 0.3 && p < 0.7 ? 1 : 0;
            const phase3 = p > 0.7 ? (p - 0.7) / 0.3 : 0;

            const armRaise = phase1 * (1 - phase3 * 0.7);
            const armSpread = phase1 * (1 - phase3 * 0.5);

            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, -1.8 * armRaise, 0.25);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, 0.9 * armSpread, 0.25);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, -0.3 - 0.4 * armRaise, 0.25);
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -1.8 * armRaise, 0.25);
              rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -0.9 * armSpread, 0.25);
            }
            if (rightForearm.current) {
              rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.3 - 0.4 * armRaise, 0.25);
            }
            // Body leans forward aggressively
            if (bodyGroup.current) {
              bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, 0.25 * armRaise, 0.2);
            }
            // Head tilts back then forward
            if (headGroup.current) {
              const headTilt = phase1 < 0.5 ? -0.3 * (phase1 * 2) : -0.3 + 0.5 * ((phase1 - 0.5) * 2 + phase3);
              headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, headTilt, 0.2);
            }
          }

          else if (action === 'encourage') {
            // ENCOURAGE: Warm welcoming gesture - arms open wide, then come together
            // Phase 1 (0-0.4): Arms open wide to sides in welcoming embrace
            // Phase 2 (0.4-0.7): Arms come together at chest, reassuring gesture
            // Phase 3 (0.7-1.0): Gentle bow with hands together
            const phase1 = Math.min(1, p / 0.4);
            const phase2 = p > 0.4 ? Math.min(1, (p - 0.4) / 0.3) : 0;
            const phase3 = p > 0.7 ? (p - 0.7) / 0.3 : 0;

            const openArms = phase1 * (1 - phase2 * 0.8);
            const handsToChest = phase2;

            if (leftArm.current) {
              const armX = -0.5 * openArms - 0.8 * handsToChest;
              const armZ = 1.2 * openArms - 0.5 * handsToChest;
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, armX, 0.2);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, armZ, 0.2);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, -0.2 - 0.8 * handsToChest, 0.2);
            }
            if (rightArm.current) {
              const armX = -0.5 * openArms - 0.8 * handsToChest;
              const armZ = -1.2 * openArms + 0.5 * handsToChest;
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, armX, 0.2);
              rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, armZ, 0.2);
            }
            if (rightForearm.current) {
              rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -0.2 - 0.8 * handsToChest, 0.2);
            }
            // Slight bow during phase 3
            if (bodyGroup.current) {
              bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, 0.15 * phase3, 0.15);
            }
            // Head nods warmly
            if (headGroup.current) {
              const nod = phase2 * 0.2 + phase3 * 0.15;
              headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, nod, 0.15);
            }
          }

          else if (action === 'observe') {
            // OBSERVE: Contemplative scanning gesture - hand to brow, head turns
            // Phase 1 (0-0.3): Right hand raises to brow (shading eyes)
            // Phase 2 (0.3-0.7): Head slowly scans left to right
            // Phase 3 (0.7-1.0): Lower hand, contemplative pose
            const phase1 = Math.min(1, p / 0.3);
            const phase2 = p > 0.3 && p < 0.7 ? (p - 0.3) / 0.4 : (p >= 0.7 ? 1 : 0);
            const phase3 = p > 0.7 ? (p - 0.7) / 0.3 : 0;

            const handToBrow = phase1 * (1 - phase3 * 0.8);
            const scanProgress = phase2;

            // Right hand to brow
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -1.4 * handToBrow, 0.2);
              rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -0.3 * handToBrow, 0.2);
            }
            if (rightForearm.current) {
              rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, -1.8 * handToBrow, 0.2);
            }
            // Left arm to hip/crossed
            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0.3 * phase1, 0.15);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, 0.2 * phase1, 0.15);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, -0.8 * phase1, 0.15);
            }
            // Head scans left to right
            if (headGroup.current) {
              const scanAngle = Math.sin((scanProgress - 0.5) * Math.PI) * 0.6;
              headGroup.current.rotation.y = THREE.MathUtils.lerp(headGroup.current.rotation.y || 0, scanAngle, 0.1);
              headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, -0.1 * handToBrow, 0.15);
            }
            // Body straightens, weight shifts
            if (bodyGroup.current) {
              bodyGroup.current.rotation.z = THREE.MathUtils.lerp(bodyGroup.current.rotation.z, 0.05 * Math.sin(scanProgress * Math.PI), 0.1);
            }
          }
        }
      }
    }

    if (bodyGroup.current) {
      // Bobbing and breathing
      const breathingSpeed = isSprinting ? 3.2 : 1.6; // Faster breathing when sprinting
      const breathing = Math.sin(state.clock.elapsedTime * breathingSpeed) * (isSprinting ? 0.01 : 0.02);
      const runBob = Math.abs(Math.sin(t * 2)) * (isSprinting ? 0.08 : 0.025);
      const jumpLiftBase = Math.sin(Math.min(1, jumpT) * Math.PI) * 0.08;
      const jumpLift = jumping ? jumpLiftBase * (1 + animationBoost * 0.35 + jumpBoost * 0.3) : 0;
      const crouch = -anticipate * 0.08;
      const settle = -landing * 0.06 * Math.sin((1 - landing) * Math.PI);
      const sway = isWalking ? Math.sin(t) * (isSprinting ? 0.06 : 0.03) : 0;

      // Sprint torso counter-rotation (opposite to legs for natural running motion)
      const sprintTwist = isSprinting ? Math.sin(t) * 0.22 : 0; // Increased from 0.15 for more dynamic twist

      // INTERACTION BODY MECHANICS
      const charge = interactionChargeRef?.current ?? 0;
      const swing = interactionSwingRef?.current ?? 0;
      let interactionCrouch = 0;
      let interactionTwist = 0;
      let interactionLean = 0;

      // Wind-up body coil
      if (charge > 0) {
        const chargeEased = Math.pow(charge, 0.7);
        interactionCrouch = -chargeEased * 0.06;
        interactionTwist = chargeEased * 0.35;
        interactionLean = -chargeEased * 0.12;
      }
      // Swing body drive
      else if (swing > 0) {
        const isPowerSwing = swing >= 0.7;
        if (isPowerSwing) {
          const power = (swing - 0.7) / 0.3;
          interactionCrouch = power * 0.04;
          interactionTwist = -power * 0.5;
          interactionLean = power * 0.25;
        } else {
          interactionTwist = -swing * 0.25;
          interactionLean = swing * 0.12;
        }
      }

      bodyGroup.current.position.y = (isWalking ? runBob : breathing) + jumpLift + crouch + settle + interactionCrouch;

      // Sprinting lean - more aggressive forward lean
      const targetRotationX = isSprinting ? 0.42 : 0; // Increased from 0.35 for more dynamic sprint posture
      const idleLean = !isWalking ? Math.sin(state.clock.elapsedTime * 0.6) * 0.02 : 0;
      const jumpTilt = jumping ? (-0.15 + jumpT * 0.2) : 0;
      const crouchTilt = anticipate * 0.22;
      const landTilt = -landing * 0.18;

      bodyGroup.current.rotation.x = THREE.MathUtils.lerp(
        bodyGroup.current.rotation.x,
        targetRotationX + idleLean + jumpTilt + crouchTilt + landTilt + interactionLean,
        0.15
      );
      bodyGroup.current.rotation.z = THREE.MathUtils.lerp(bodyGroup.current.rotation.z, sway, 0.1);

      // Hip and torso twist - for sprinting AND interaction
      const hipTwistTarget = isSprinting ? sprintTwist * 0.6 : interactionTwist * 0.6; // Increased from 0.5
      if (hipGroup.current) {
        hipGroup.current.rotation.y = THREE.MathUtils.lerp(hipGroup.current.rotation.y, hipTwistTarget, 0.12);
      }
      const torsoTwistTarget = isSprinting ? -sprintTwist * 0.85 : interactionTwist; // Increased from 0.7 for stronger counter-rotation
      if (torsoGroup.current) {
        torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, torsoTwistTarget, 0.15);
      }

      // Leg positioning for power swing
      if (swing >= 0.7) {
        const power = (swing - 0.7) / 0.3;
        if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, -0.3 - power * 0.25, 0.12);
        if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0.4 + power * 0.3, 0.12);
      } else if (charge > 0) {
        // Weight on back foot during wind-up
        const chargeEased = Math.pow(charge, 0.7);
        if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0.15 + chargeEased * 0.2, 0.1);
        if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -0.1 - chargeEased * 0.15, 0.1);
      }
    }

    // Head lag/bob for natural independent movement
    if (headGroup.current) {
      // Head counteracts body bob to stay more level (especially during sprint)
      const bodyBobCompensation = isSprinting ? -0.04 : 0;
      const headBob = isWalking ? Math.sin(t * 2) * (isSprinting ? 0.008 : 0.015) : 0;
      // Counter body lean more during sprint for stable gaze
      const headLag = bodyGroup.current ? bodyGroup.current.rotation.x * (isSprinting ? -0.35 : -0.2) : 0;
      const headSway = isWalking ? Math.sin(t) * (isSprinting ? 0.01 : 0.02) : 0;

      // Head follows interaction
      const charge = interactionChargeRef?.current ?? 0;
      const swing = interactionSwingRef?.current ?? 0;
      let headInteractionX = 0;
      let headInteractionY = 0;

      if (charge > 0) {
        // Look back during wind-up (focus on where swing will go)
        const chargeEased = Math.pow(charge, 0.7);
        headInteractionY = chargeEased * 0.25; // Turn head slightly back
        headInteractionX = -chargeEased * 0.1; // Tilt down slightly
      } else if (swing > 0) {
        // Head follows through with swing
        const isPowerSwing = swing >= 0.7;
        if (isPowerSwing) {
          const power = (swing - 0.7) / 0.3;
          headInteractionY = -power * 0.35; // Snap head forward
          headInteractionX = power * 0.15; // Look down at target
        } else {
          headInteractionY = -swing * 0.2;
          headInteractionX = swing * 0.08;
        }
      }

      headGroup.current.position.y = 1.75 + headBob;
      headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, headLag + headInteractionX, 0.15);
      headGroup.current.rotation.y = THREE.MathUtils.lerp(headGroup.current.rotation.y || 0, headInteractionY, 0.12);
      headGroup.current.rotation.z = -headSway * 0.5; // Subtle opposite sway
    }

    if (jumping) {
      const lift = Math.min(1, jumpT);
      const arc = Math.sin(lift * Math.PI);
      const armUp = -0.95 - arc * (0.55 + animationBoost * 0.2 + jumpBoost * 0.15);
      if (leftArm.current) {
        leftArm.current.rotation.x = armUp;
        leftArm.current.rotation.z = 0.08 + arc * 0.12;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = armUp;
        rightArm.current.rotation.z = -0.08 - arc * 0.12;
      }
      if (leftForearm.current) leftForearm.current.rotation.x = -0.55 + arc * 0.15;
      if (rightForearm.current) rightForearm.current.rotation.x = -0.55 + arc * 0.15;
      if (leftLeg.current) leftLeg.current.rotation.x = 0.25 + lift * (0.45 + animationBoost * 0.15 + jumpBoost * 0.1);
      if (rightLeg.current) rightLeg.current.rotation.x = 0.25 + lift * (0.45 + animationBoost * 0.15 + jumpBoost * 0.1);
      const flutter = arc * (0.22 + animationBoost * 0.08) + Math.sin(state.clock.elapsedTime * 6) * 0.03;
      if (sashFrontRef.current) sashFrontRef.current.rotation.x = flutter;
      if (trimFrontRef.current) trimFrontRef.current.rotation.x = flutter * 0.7;
    } else {
      if (sashFrontRef.current) sashFrontRef.current.rotation.x = 0;
      if (trimFrontRef.current) trimFrontRef.current.rotation.x = 0;
      // Only apply jump anticipation/landing arm drop if NOT in interaction swing
      const swing = interactionSwingRef?.current ?? 0;
      const charge = interactionChargeRef?.current ?? 0;
      if (swing === 0 && charge === 0) {
        if (anticipate > 0) {
          const armDrop = anticipate * 0.25;
          if (leftArm.current) leftArm.current.rotation.x = armDrop;
          if (rightArm.current) rightArm.current.rotation.x = armDrop;
        } else if (landing > 0.01) {
          const armDrop = landing * 0.35;
          if (leftArm.current) leftArm.current.rotation.x = armDrop;
          if (rightArm.current) rightArm.current.rotation.x = armDrop;
        }
      }
    }

    // PERFORMANCE: Only update blinking for NPCs close to camera (<25 units)
    if (showFacialDetails) {
      const dt = state.clock.getDelta();
      if (!isBlinking.current) {
        blinkTimer.current += dt;
        if (blinkTimer.current > blinkCooldown.current) {
          isBlinking.current = true;
          blinkProgress.current = 0;
        }
      }
      if (isBlinking.current) {
        blinkProgress.current += dt * 8;
        const phase = Math.min(1, blinkProgress.current);
        const blinkAmount = Math.sin(phase * Math.PI);
        const upperScale = 1 - blinkAmount * 0.85;
        const lowerScale = 1 - blinkAmount * 0.6;
        if (upperLidLeft.current) upperLidLeft.current.scale.y = upperScale;
        if (upperLidRight.current) upperLidRight.current.scale.y = upperScale;
        if (lowerLidLeft.current) lowerLidLeft.current.scale.y = lowerScale;
        if (lowerLidRight.current) lowerLidRight.current.scale.y = lowerScale;
        if (phase >= 1) {
          isBlinking.current = false;
          blinkTimer.current = 0;
          blinkCooldown.current = 2.5 + Math.random() * 4; // 2.5-6.5 seconds between blinks
        }
      } else {
        if (upperLidLeft.current) upperLidLeft.current.scale.y = 1;
        if (upperLidRight.current) upperLidRight.current.scale.y = 1;
        if (lowerLidLeft.current) lowerLidLeft.current.scale.y = 1;
        if (lowerLidRight.current) lowerLidRight.current.scale.y = 1;
      }
    }

    // === PORTRAIT MODE ANIMATIONS ===
    // Only runs when portraitMode is true (encounter modal only)
    if (portraitMode) {
      const dt = state.clock.getDelta() || 0.016;

      // Calculate mood-based expression targets
      const moodLower = mood?.toLowerCase() || 'neutral';
      switch (moodLower) {
        case 'anxious':
        case 'worried':
          targetBrowAngle.current = 0.15;
          targetBrowHeight.current = 0.005;
          break;
        case 'fearful':
        case 'terrified':
          targetBrowAngle.current = 0.25;
          targetBrowHeight.current = 0.01;
          break;
        case 'angry':
        case 'hostile':
          targetBrowAngle.current = -0.2;
          targetBrowHeight.current = -0.005;
          break;
        case 'content':
        case 'happy':
          targetBrowAngle.current = 0.05;
          targetBrowHeight.current = 0.003;
          break;
        case 'sad':
        case 'melancholy':
          targetBrowAngle.current = 0.18;
          targetBrowHeight.current = -0.003;
          break;
        case 'suspicious':
          targetBrowAngle.current = -0.1;
          targetBrowHeight.current = 0;
          break;
        default:
          targetBrowAngle.current = 0;
          targetBrowHeight.current = 0;
      }

      // Add panic influence to expression
      const panicFactor = (panicLevel || 0) / 100;
      targetBrowAngle.current += panicFactor * 0.1;
      targetBrowHeight.current += panicFactor * 0.005;

      // Smooth interpolation to target expression
      animBrowAngle.current += (targetBrowAngle.current - animBrowAngle.current) * dt * 3;
      animBrowHeight.current += (targetBrowHeight.current - animBrowHeight.current) * dt * 3;

      // Apply eyebrow animation - use browY as base position
      const baseRotation = isFemale ? 0.1 : 0.08;
      if (leftBrowRef.current) {
        leftBrowRef.current.rotation.z = -baseRotation - animBrowAngle.current;
        leftBrowRef.current.position.y = browY + animBrowHeight.current;
      }
      if (rightBrowRef.current) {
        rightBrowRef.current.rotation.z = baseRotation + animBrowAngle.current;
        rightBrowRef.current.position.y = browY + animBrowHeight.current;
      }

      // Speaking animation - mouth movement
      if (isSpeaking) {
        speakPhase.current += dt * 12;
        // Multiple frequencies for natural speech pattern
        const primary = Math.sin(speakPhase.current) * 0.5 + 0.5;
        const secondary = Math.sin(speakPhase.current * 1.7) * 0.3;
        const tertiary = Math.sin(speakPhase.current * 0.5) * 0.2;
        const targetOpen = Math.max(0, (primary + secondary + tertiary) * 0.5);
        mouthOpenAmount.current += (targetOpen - mouthOpenAmount.current) * dt * 15;
      } else {
        mouthOpenAmount.current += (0 - mouthOpenAmount.current) * dt * 8;
      }

      // Apply mouth animation - use mouthY as base position
      const openAmt = mouthOpenAmount.current;
      if (mouthInteriorRef.current) {
        mouthInteriorRef.current.scale.y = 1 + openAmt * 3;
        mouthInteriorRef.current.position.y = mouthY - lipGap - openAmt * 0.006;
      }
      if (upperLipRef.current) {
        upperLipRef.current.position.y = mouthY + openAmt * 0.003;
      }
      if (lowerLipRef.current) {
        lowerLipRef.current.position.y = mouthY - 0.012 - openAmt * 0.006;
      }

      // More frequent blinking when panicked
      if (panicFactor > 0.5) {
        blinkCooldown.current = Math.min(blinkCooldown.current, 1.5 + Math.random() * 2);
      }
    }
  });

  return (
    <group scale={scale}>
      <group ref={bodyGroup}>
        {!isDead && showGroundShadow && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.5, 16]} />
            <meshBasicMaterial color="black" transparent opacity={0.3} />
          </mesh>
        )}

        {/* PLAGUE VISUAL: Red glow around infected NPCs */}
        {(isInfected || isIncubating) && !isDead && (
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={glowIntensity.current * 0.2}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Torso / Robe */}
        {isFemale ? (
          <group>
            <mesh position={[0, 1.05, 0]} castShadow>
              <coneGeometry args={[0.55 * femaleRobeSpread, 1.2, 10]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            {motifMap && (
              <mesh position={[0, 1.05, 0.01]} castShadow>
                <coneGeometry args={[0.56 * femaleRobeSpread, 1.19, 10]} />
                <meshStandardMaterial
                  color={robeAccentColor}
                  alphaMap={motifMap}
                  transparent
                  opacity={0.55}
                  roughness={accentRoughness}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh position={[0, 1.35, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.28, 0.35, 10]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0, 1.05, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.7, 10]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            {robeOverwrap && (
              <mesh position={[0, 1.05, 0.08]} castShadow>
                <coneGeometry args={[0.62 * femaleRobeSpread, 1.05, 10]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            <mesh position={[0, 0.95, 0.24]} castShadow>
              <boxGeometry args={[0.12, 1.2, 0.02]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0, 1.18, -0.12]} castShadow>
              <boxGeometry args={[0.5, 0.2, 0.16]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <coneGeometry args={[0.75 * femaleRobeSpread, 0.9, 12]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.78 * femaleRobeSpread, 0.78 * femaleRobeSpread, 0.1, 12]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0, 0.25, -0.18]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.04]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            {robeHasSash && (
              <mesh position={[0, 0.95, 0]} castShadow>
                <torusGeometry args={[0.38 * femaleRobeSpread, 0.035, 8, 16]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} map={sashMap ?? undefined} />
              </mesh>
            )}
            {femaleRobeBand && (
              <mesh position={[0, 1.35, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 0.1, 10]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            {robeHasTrim && (
              <mesh ref={trimFrontRef} position={[0, 0.95, 0.3]} castShadow>
                <boxGeometry args={[0.1, 1.4, 0.02]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            <mesh position={[-0.22, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <mesh position={[0.22, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <group ref={leftArm} position={[-0.26, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial color={upperArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
            <group ref={leftForearm} position={[0, -0.18, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.048, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.11, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.042, 0.22, 8]} />
                <meshStandardMaterial color={lowerArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.24, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.035, 0.08, 0.065]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
                <mesh position={[0.01, 0.01, 0.04]} rotation={[0, 0, 0.4]} castShadow>
                  <capsuleGeometry args={[0.018, 0.035, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
              </group>
            </group>
            </group>
            <group ref={rightArm} position={[0.26, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial color={upperArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
            <group ref={rightForearm} position={[0, -0.18, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.048, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.11, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.042, 0.22, 8]} />
                <meshStandardMaterial color={lowerArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.24, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.035, 0.08, 0.065]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
                <mesh position={[-0.01, 0.01, 0.04]} rotation={[0, 0, -0.4]} castShadow>
                  <capsuleGeometry args={[0.018, 0.035, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
              </group>
            </group>
            </group>
            <mesh position={[-0.2, 0.95, 0.02]} castShadow>
              <boxGeometry args={[0.09, 0.1, 0.11]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
            </mesh>
            <mesh position={[0.2, 0.95, 0.02]} castShadow>
              <boxGeometry args={[0.09, 0.1, 0.11]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
            </mesh>
          </group>
        ) : (
          <group ref={torsoGroup}>
            {/* Upper torso */}
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.35, 0.9, 8]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            {motifMap && (
              <mesh position={[0, 1.1, 0.01]} castShadow>
                <cylinderGeometry args={[0.26, 0.36, 0.88, 8]} />
                <meshStandardMaterial
                  color={robeAccentColor}
                  alphaMap={motifMap}
                  transparent
                  opacity={0.5}
                  roughness={accentRoughness}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Lower robe with secondary motion */}
            <group ref={robeHemRef}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <boxGeometry args={[0.5, 0.5, 0.3]} />
                <meshStandardMaterial color={color} roughness={clothRoughness} />
              </mesh>
              <mesh position={[0, 0.55, 0.16]} castShadow>
                <boxGeometry args={[0.32, 0.25, 0.05]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            </group>
            <mesh position={[-0.12, 0.85, 0.17]} castShadow>
              <boxGeometry args={[0.08, 0.5, 0.04]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0.12, 0.85, 0.17]} castShadow>
              <boxGeometry args={[0.08, 0.5, 0.04]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            {robeHasTrim && (
              <mesh ref={trimFrontRef} position={[0, 0.9, 0.24]} castShadow>
                <boxGeometry args={[0.08, 0.9, 0.02]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
          </group>
        )}
        {robeHasSash && (
          <group>
            {/* Main sash belt - thicker and more visible */}
            <mesh position={[0, 0.95, 0]} castShadow>
              <torusGeometry args={[isFemale ? 0.42 : 0.28, 0.06, 10, 18]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.85} map={sashMap ?? undefined} />
            </mesh>
            {/* Sash hanging ends */}
            <mesh ref={sashFrontRef} position={[0, 0.95, 0.22]} castShadow>
              <boxGeometry args={[isFemale ? 0.28 : 0.22, 0.18, 0.03]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.88} map={sashMap ?? undefined} />
            </mesh>
            {/* Sash knot detail */}
            <mesh position={[0.02, 0.95, 0.24]} castShadow>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.82} />
            </mesh>
          </group>
        )}
        {/* Tiraz decorative bands on upper chest/shoulders */}
        {robeHasTrim && (
          <group>
            <mesh position={[0, 1.35, 0.01]} castShadow>
              <cylinderGeometry args={[isFemale ? 0.38 : 0.26, isFemale ? 0.40 : 0.28, 0.08, 16]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 1.25, 0.01]} castShadow>
              <cylinderGeometry args={[isFemale ? 0.36 : 0.24, isFemale ? 0.38 : 0.26, 0.05, 16]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} transparent opacity={0.7} />
            </mesh>
          </group>
        )}
        <mesh position={[0, 1.55, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.12, 10]} />
          <meshStandardMaterial color={headColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.47, 0]} castShadow>
          <torusGeometry args={[0.16, 0.03, 8, 16]} />
          <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
        </mesh>
        
        {/* Head */}
        <group ref={headGroup} position={[0, 1.75, 0]}>
          <mesh castShadow scale={[0.95, 1.1, 0.9]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          <mesh position={[0, 0.0, 0.085]} scale={[1.05, 1.05, 0.45]} castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          {/* Ears - visible unless covered by headwear */}
          {(headwearStyle === 'none' || headwearStyle === 'cap' || headwearStyle === 'fez' || headwearStyle === 'straw' || headwearStyle === 'taqiyah') && (
            <>
              {/* Left ear */}
              <group position={[-0.19, -0.02, 0.02]} rotation={[0, -0.3, 0]}>
                {/* Outer ear structure */}
                <mesh castShadow>
                  <sphereGeometry args={[0.04, 10, 10, 0, Math.PI]} />
                  <meshStandardMaterial color={headColor} roughness={0.92} />
                </mesh>
                {/* Inner concha depression */}
                <mesh position={[0, 0, 0.01]} castShadow>
                  <sphereGeometry args={[0.022, 8, 8]} />
                  <meshStandardMaterial color={faceShadowColor} roughness={0.95} />
                </mesh>
                {/* Ear lobe */}
                <mesh position={[0, -0.03, 0.005]} castShadow>
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <meshStandardMaterial color={faceHighlightColor} roughness={0.9} />
                </mesh>
              </group>
              {/* Right ear */}
              <group position={[0.19, -0.02, 0.02]} rotation={[0, 0.3, 0]}>
                {/* Outer ear structure */}
                <mesh castShadow>
                  <sphereGeometry args={[0.04, 10, 10, Math.PI, Math.PI]} />
                  <meshStandardMaterial color={headColor} roughness={0.92} />
                </mesh>
                {/* Inner concha depression */}
                <mesh position={[0, 0, 0.01]} castShadow>
                  <sphereGeometry args={[0.022, 8, 8]} />
                  <meshStandardMaterial color={faceShadowColor} roughness={0.95} />
                </mesh>
                {/* Ear lobe */}
                <mesh position={[0, -0.03, 0.005]} castShadow>
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <meshStandardMaterial color={faceHighlightColor} roughness={0.9} />
                </mesh>
              </group>
            </>
          )}
          {/* Hair - LOD-based rendering for performance */}
          {headwearStyle === 'none' && hairStyle !== 'covered' && (
            <group>
              {/* === LOW LOD (>35 units) - Silhouette only === */}
              {hairLOD === 'low' && (
                <>
                  <mesh position={[0, 0.08, -0.05]} castShadow>
                    <sphereGeometry args={[0.21, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                    <meshStandardMaterial color={hairColor} roughness={0.9} />
                  </mesh>
                  {hairStyle === 'long' && (
                    <mesh position={[0, -0.12, -0.14]} rotation={[0.15, 0, 0]} castShadow>
                      <capsuleGeometry args={[0.06, 0.22, 3, 6]} />
                      <meshStandardMaterial color={hairColor} roughness={0.9} />
                    </mesh>
                  )}
                </>
              )}

              {/* === MEDIUM LOD (15-35 units) - Basic shape with some detail === */}
              {hairLOD === 'medium' && (
                <>
                  {/* Base cap */}
                  <mesh position={[0, 0.07, -0.05]} castShadow>
                    <sphereGeometry args={[0.20, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                    <meshStandardMaterial color={hairColor} roughness={0.88} />
                  </mesh>
                  {/* Top volume layer */}
                  <mesh position={[0, 0.12, -0.04]} castShadow>
                    <sphereGeometry args={[0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 1.05)} roughness={0.85} />
                  </mesh>
                  {/* Medium/Long: side coverage */}
                  {(hairStyle === 'medium' || hairStyle === 'long') && (
                    <>
                      <mesh position={[-0.15, -0.04, -0.04]} rotation={[0, 0.08, 0.12]} castShadow>
                        <capsuleGeometry args={[0.035, 0.14, 3, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} />
                      </mesh>
                      <mesh position={[0.15, -0.04, -0.04]} rotation={[0, -0.08, -0.12]} castShadow>
                        <capsuleGeometry args={[0.035, 0.14, 3, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} />
                      </mesh>
                    </>
                  )}
                  {/* Long: back drape */}
                  {hairStyle === 'long' && (
                    <mesh position={[0, -0.14, -0.15]} rotation={[0.12, 0, 0]} castShadow>
                      <capsuleGeometry args={[0.055, 0.24, 3, 6]} />
                      <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} />
                    </mesh>
                  )}
                </>
              )}

              {/* === HIGH LOD (<15 units) - Full detail with layered volume === */}
              {hairLOD === 'high' && (
                <>
                  {/* Layer 1: Skull-hugging dark base */}
                  <mesh position={[0, 0.06, -0.045]} castShadow>
                    <sphereGeometry args={[0.198, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.82)} roughness={0.92} />
                  </mesh>
                  {/* Layer 2: Main volume - uses texture for strand detail */}
                  <mesh position={[0, 0.09, -0.05]} castShadow>
                    <sphereGeometry args={[0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.50]} />
                    <meshStandardMaterial color={hairColor} map={hairTexture} roughness={0.88} />
                  </mesh>
                  {/* Layer 3: Top highlight */}
                  <mesh position={[0, 0.13, -0.035]} castShadow>
                    <sphereGeometry args={[0.165, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 1.08)} roughness={0.85} />
                  </mesh>
                  {/* Hairline definition - softens forehead edge */}
                  <mesh position={[0, 0.10, 0.10]} rotation={[0.6, 0, 0]} castShadow>
                    <torusGeometry args={[0.10, 0.018, 6, 12, Math.PI]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} />
                  </mesh>

                  {/* Short hair: temple and side coverage */}
                  {hairStyle === 'short' && (
                    <>
                      {/* Left temple coverage */}
                      <mesh position={[-0.15, 0.02, 0.02]} rotation={[0.1, 0.2, 0.1]} castShadow>
                        <boxGeometry args={[0.06, 0.08, 0.04]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} map={hairTexture} roughness={0.9} />
                      </mesh>
                      {/* Right temple coverage */}
                      <mesh position={[0.15, 0.02, 0.02]} rotation={[0.1, -0.2, -0.1]} castShadow>
                        <boxGeometry args={[0.06, 0.08, 0.04]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} map={hairTexture} roughness={0.9} />
                      </mesh>
                      {/* Left side above ear */}
                      <mesh position={[-0.17, -0.02, -0.02]} rotation={[0, 0.15, 0.08]} castShadow>
                        <capsuleGeometry args={[0.022, 0.06, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} />
                      </mesh>
                      {/* Right side above ear */}
                      <mesh position={[0.17, -0.02, -0.02]} rotation={[0, -0.15, -0.08]} castShadow>
                        <capsuleGeometry args={[0.022, 0.06, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} />
                      </mesh>
                      {/* Back of head coverage */}
                      <mesh position={[0, 0.02, -0.12]} rotation={[-0.2, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.08, 0.06, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.85)} map={hairTexture} roughness={0.9} />
                      </mesh>
                    </>
                  )}

                  {/* Medium/Long: side strand clusters */}
                  {(hairStyle === 'medium' || hairStyle === 'long') && (
                    <>
                      {/* Left side cluster */}
                      <mesh position={[-0.16, -0.02, -0.03]} rotation={[0, 0.1, 0.14]} castShadow>
                        <capsuleGeometry args={[0.028, 0.13, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} map={hairTexture} roughness={0.88} />
                      </mesh>
                      <mesh position={[-0.14, -0.05, -0.05]} rotation={[0.04, 0.06, 0.10]} castShadow>
                        <capsuleGeometry args={[0.024, 0.11, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.98)} map={hairTexture} roughness={0.86} />
                      </mesh>
                      {/* Right side cluster */}
                      <mesh position={[0.16, -0.02, -0.03]} rotation={[0, -0.1, -0.14]} castShadow>
                        <capsuleGeometry args={[0.028, 0.13, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} map={hairTexture} roughness={0.88} />
                      </mesh>
                      <mesh position={[0.14, -0.05, -0.05]} rotation={[0.04, -0.06, -0.10]} castShadow>
                        <capsuleGeometry args={[0.024, 0.11, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.98)} map={hairTexture} roughness={0.86} />
                      </mesh>
                    </>
                  )}

                  {/* Long: flowing back hair */}
                  {hairStyle === 'long' && (
                    <group position={[0, -0.08, -0.12]} rotation={[-0.12, 0, 0]}>
                      {/* Central back flow */}
                      <mesh position={[0, -0.10, 0]} castShadow>
                        <capsuleGeometry args={[0.052, 0.30, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} map={hairTexture} roughness={0.9} />
                      </mesh>
                      {/* Left back strand */}
                      <mesh position={[-0.07, -0.08, 0.03]} rotation={[-0.05, 0.08, 0.06]} castShadow>
                        <capsuleGeometry args={[0.035, 0.26, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} map={hairTexture} roughness={0.88} />
                      </mesh>
                      {/* Right back strand */}
                      <mesh position={[0.07, -0.08, 0.03]} rotation={[-0.05, -0.08, -0.06]} castShadow>
                        <capsuleGeometry args={[0.035, 0.26, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} map={hairTexture} roughness={0.88} />
                      </mesh>
                    </group>
                  )}
                </>
              )}
            </group>
          )}
          {/* PERFORMANCE: Facial details only rendered for NPCs within 25 units */}
          {showFacialDetails && (
            <>
              {/* Eyebrows */}
              <mesh ref={leftBrowRef} position={[-browX, browY, 0.165]} rotation={[0, 0, isFemale ? -0.1 : -0.08]} castShadow>
                <boxGeometry args={[0.05, browHeight, 0.02]} />
                <meshStandardMaterial color={browColor} roughness={1} />
              </mesh>
              <mesh ref={rightBrowRef} position={[browX, browY, 0.165]} rotation={[0, 0, isFemale ? 0.1 : 0.08]} castShadow>
                <boxGeometry args={[0.05, browHeight, 0.02]} />
                <meshStandardMaterial color={browColor} roughness={1} />
              </mesh>
              {/* Eye whites */}
              <mesh position={[-faceVariant.eyeSpacing, eyeY, 0.195]} scale={eyeScale} castShadow>
                <planeGeometry args={[0.05, 0.03]} />
                <meshStandardMaterial color="#f2efe8" roughness={1} />
              </mesh>
              <mesh position={[faceVariant.eyeSpacing, eyeY, 0.195]} scale={eyeScale} castShadow>
                <planeGeometry args={[0.05, 0.03]} />
                <meshStandardMaterial color="#f2efe8" roughness={1} />
              </mesh>
              {/* Left eye - iris and pupil in group for gaze tracking */}
              <group ref={leftEye} position={[-faceVariant.eyeSpacing, eyeY, 0.202]}>
                {/* Iris */}
                <mesh castShadow>
                  <planeGeometry args={[0.018, 0.018]} />
                  <meshStandardMaterial color={eyeColor} roughness={1} />
                </mesh>
                {/* Pupil */}
                <mesh position={[0, 0, 0.004]} castShadow>
                  <planeGeometry args={[0.015, 0.015]} />
                  <meshStandardMaterial color="#2a2a2a" roughness={1} />
                </mesh>
              </group>
              {/* Right eye - iris and pupil in group for gaze tracking */}
              <group ref={rightEye} position={[faceVariant.eyeSpacing, eyeY, 0.202]}>
                {/* Iris */}
                <mesh castShadow>
                  <planeGeometry args={[0.018, 0.018]} />
                  <meshStandardMaterial color={eyeColor} roughness={1} />
                </mesh>
                {/* Pupil */}
                <mesh position={[0, 0, 0.004]} castShadow>
                  <planeGeometry args={[0.015, 0.015]} />
                  <meshStandardMaterial color="#2a2a2a" roughness={1} />
                </mesh>
              </group>
              {/* Eyelids */}
              <mesh ref={upperLidLeft} position={[-faceVariant.eyeSpacing, eyeY + 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.012]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={upperLidRight} position={[faceVariant.eyeSpacing, eyeY + 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.012]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLidLeft} position={[-faceVariant.eyeSpacing, eyeY - 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.01]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLidRight} position={[faceVariant.eyeSpacing, eyeY - 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.01]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              {/* Eyelashes (female only) */}
              {isFemale && (
                <>
                  <mesh position={[-faceVariant.eyeSpacing, eyeY + 0.025, 0.194]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                  <mesh position={[faceVariant.eyeSpacing, eyeY + 0.025, 0.194]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                </>
              )}
              {/* Tear ducts */}
              <mesh position={[-(faceVariant.eyeSpacing + 0.013), eyeY - 0.008, 0.207]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              <mesh position={[faceVariant.eyeSpacing - 0.013, eyeY - 0.008, 0.207]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              {/* Lips */}
              <mesh ref={upperLipRef} position={[0, mouthY, 0.175]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * faceVariant.mouthWidthScale, 0.012, 0.015]} />
                <meshStandardMaterial color={lipUpperColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLipRef} position={[0, mouthY - 0.012, 0.175]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * lipLowerScale * faceVariant.mouthWidthScale, 0.014, 0.015]} />
                <meshStandardMaterial color={lipColor} roughness={1} />
              </mesh>
              <mesh ref={mouthInteriorRef} position={[0, mouthY - lipGap, 0.176]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * 0.9 * faceVariant.mouthWidthScale, 0.004, 0.01]} />
                <meshStandardMaterial color="#2a1a1a" roughness={1} />
              </mesh>
              {/* Nose */}
              <mesh position={[0, -0.01, 0.195]} castShadow>
                <coneGeometry args={[noseRadius, noseLength, 8]} />
                <meshStandardMaterial color={headColor} roughness={1} />
              </mesh>

              {/* Facial Hair - men only */}
              {!isFemale && facialHair !== 'none' && (
                <group>
                  {/* Stubble - subtle shadow on jaw and chin */}
                  {facialHair === 'stubble' && (
                    <>
                      <mesh position={[0, -0.14, 0.12]} castShadow>
                        <sphereGeometry args={[0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.7)} roughness={1} transparent opacity={0.4} />
                      </mesh>
                      <mesh position={[-0.08, -0.11, 0.1]} castShadow>
                        <boxGeometry args={[0.04, 0.06, 0.02]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.65)} roughness={1} transparent opacity={0.35} />
                      </mesh>
                      <mesh position={[0.08, -0.11, 0.1]} castShadow>
                        <boxGeometry args={[0.04, 0.06, 0.02]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.65)} roughness={1} transparent opacity={0.35} />
                      </mesh>
                    </>
                  )}

                  {/* Mustache */}
                  {(facialHair === 'mustache' || facialHair === 'full_beard' || facialHair === 'goatee') && (
                    <>
                      <mesh position={[-0.025, mouthY + 0.018, 0.18]} rotation={[0, 0, 0.15]} castShadow>
                        <capsuleGeometry args={[0.012, 0.03, 4, 6]} />
                        <meshStandardMaterial color={hairColor} roughness={0.95} />
                      </mesh>
                      <mesh position={[0.025, mouthY + 0.018, 0.18]} rotation={[0, 0, -0.15]} castShadow>
                        <capsuleGeometry args={[0.012, 0.03, 4, 6]} />
                        <meshStandardMaterial color={hairColor} roughness={0.95} />
                      </mesh>
                    </>
                  )}

                  {/* Short beard - covers chin and lower jaw */}
                  {facialHair === 'short_beard' && (
                    <>
                      <mesh position={[0, -0.14, 0.13]} castShadow>
                        <sphereGeometry args={[0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <meshStandardMaterial color={hairColor} roughness={0.92} />
                      </mesh>
                      <mesh position={[-0.06, -0.11, 0.11]} castShadow>
                        <boxGeometry args={[0.04, 0.05, 0.03]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.92} />
                      </mesh>
                      <mesh position={[0.06, -0.11, 0.11]} castShadow>
                        <boxGeometry args={[0.04, 0.05, 0.03]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.92} />
                      </mesh>
                      {/* Mustache for short beard */}
                      <mesh position={[-0.022, mouthY + 0.016, 0.178]} rotation={[0, 0, 0.12]} castShadow>
                        <capsuleGeometry args={[0.01, 0.025, 4, 6]} />
                        <meshStandardMaterial color={hairColor} roughness={0.94} />
                      </mesh>
                      <mesh position={[0.022, mouthY + 0.016, 0.178]} rotation={[0, 0, -0.12]} castShadow>
                        <capsuleGeometry args={[0.01, 0.025, 4, 6]} />
                        <meshStandardMaterial color={hairColor} roughness={0.94} />
                      </mesh>
                    </>
                  )}

                  {/* Full beard - thick coverage */}
                  {facialHair === 'full_beard' && (
                    <>
                      {/* Main chin beard */}
                      <mesh position={[0, -0.16, 0.10]} castShadow>
                        <sphereGeometry args={[0.09, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                        <meshStandardMaterial color={hairColor} roughness={0.9} />
                      </mesh>
                      {/* Beard extension downward */}
                      <mesh position={[0, -0.22, 0.06]} rotation={[0.3, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.92} />
                      </mesh>
                      {/* Side jaw coverage */}
                      <mesh position={[-0.08, -0.12, 0.08]} castShadow>
                        <boxGeometry args={[0.05, 0.08, 0.04]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} />
                      </mesh>
                      <mesh position={[0.08, -0.12, 0.08]} castShadow>
                        <boxGeometry args={[0.05, 0.08, 0.04]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} />
                      </mesh>
                      {/* Sideburns connecting to beard */}
                      <mesh position={[-0.12, -0.04, 0.04]} castShadow>
                        <boxGeometry args={[0.03, 0.1, 0.03]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.85)} roughness={0.9} />
                      </mesh>
                      <mesh position={[0.12, -0.04, 0.04]} castShadow>
                        <boxGeometry args={[0.03, 0.1, 0.03]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.85)} roughness={0.9} />
                      </mesh>
                    </>
                  )}

                  {/* Goatee - chin only with mustache */}
                  {facialHair === 'goatee' && (
                    <>
                      <mesh position={[0, -0.15, 0.14]} castShadow>
                        <sphereGeometry args={[0.055, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <meshStandardMaterial color={hairColor} roughness={0.92} />
                      </mesh>
                      <mesh position={[0, -0.20, 0.10]} rotation={[0.25, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.028, 0.05, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.92} />
                      </mesh>
                    </>
                  )}
                </group>
              )}
            </>
          )}

          {/* Hair showing under headwear - for long/medium styles */}
          {headwearStyle !== 'none' && headwearStyle !== 'turban' && hairStyle !== 'covered' && hairStyle !== 'short' && (
            <group>
              {/* Side hair wisps peeking out near temples */}
              {(headwearStyle === 'scarf' || headwearStyle === 'cap' || headwearStyle === 'taqiyah') && (
                <>
                  {/* Left side wisp */}
                  <mesh position={[-0.16, -0.04, 0.04]} rotation={[0.1, 0.2, 0.15]} castShadow>
                    <capsuleGeometry args={[0.018, 0.07, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.9} />
                  </mesh>
                  <mesh position={[-0.14, -0.08, 0.02]} rotation={[0.05, 0.15, 0.12]} castShadow>
                    <capsuleGeometry args={[0.014, 0.05, 4, 6]} />
                    <meshStandardMaterial color={hairColor} roughness={0.88} />
                  </mesh>
                  {/* Right side wisp */}
                  <mesh position={[0.16, -0.04, 0.04]} rotation={[0.1, -0.2, -0.15]} castShadow>
                    <capsuleGeometry args={[0.018, 0.07, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.9} />
                  </mesh>
                  <mesh position={[0.14, -0.08, 0.02]} rotation={[0.05, -0.15, -0.12]} castShadow>
                    <capsuleGeometry args={[0.014, 0.05, 4, 6]} />
                    <meshStandardMaterial color={hairColor} roughness={0.88} />
                  </mesh>
                </>
              )}
              {/* Long hair flowing down back under scarf */}
              {hairStyle === 'long' && headwearStyle === 'scarf' && (
                <group position={[0, -0.22, -0.16]} rotation={[-0.15, 0, 0]}>
                  <mesh position={[0, -0.08, 0]} castShadow>
                    <capsuleGeometry args={[0.045, 0.24, 4, 8]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.85)} roughness={0.9} />
                  </mesh>
                  <mesh position={[-0.05, -0.06, 0.02]} rotation={[0, 0.05, 0.08]} castShadow>
                    <capsuleGeometry args={[0.028, 0.18, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.88} />
                  </mesh>
                  <mesh position={[0.05, -0.06, 0.02]} rotation={[0, -0.05, -0.08]} castShadow>
                    <capsuleGeometry args={[0.028, 0.18, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.88} />
                  </mesh>
                </group>
              )}
              {/* Medium hair - shorter back showing */}
              {hairStyle === 'medium' && headwearStyle === 'scarf' && (
                <group position={[0, -0.18, -0.14]} rotation={[-0.1, 0, 0]}>
                  <mesh position={[0, -0.04, 0]} castShadow>
                    <capsuleGeometry args={[0.035, 0.10, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} />
                  </mesh>
                </group>
              )}
            </group>
          )}

          {headwearStyle === 'scarf' && (
            <group>
              <mesh position={[0, 0.12, -0.06]} castShadow>
                <sphereGeometry args={[0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={headscarfColor} roughness={0.92} />
              </mesh>
              <mesh position={[0, -0.1, -0.12]} castShadow>
                <cylinderGeometry args={[0.24, 0.26, 0.32, 12]} />
                <meshStandardMaterial color={headwearShadow} roughness={0.94} />
              </mesh>
              <mesh position={[0, -0.18, -0.22]} rotation={[0.22, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.02]} />
                <meshStandardMaterial color={headwearShadow} roughness={0.95} />
              </mesh>
            </group>
          )}
          {headwearStyle === 'cap' && (
            <mesh position={[0, 0.14, -0.02]} castShadow>
              <sphereGeometry args={[0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              <meshStandardMaterial color={turbanColor} roughness={0.85} />
            </mesh>
          )}
          {headwearStyle === 'fez' && (
            <group>
              <mesh position={[0, 0.18, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.19, 0.22, 12]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.29, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.15, 0.06, 12]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.08, 0.1]} castShadow>
                <boxGeometry args={[0.16, 0.04, 0.02]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.85} />
              </mesh>
            </group>
          )}
          {headwearStyle === 'straw' && (
            <group>
              <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.38, 0.38, 0.03, 18]} />
                <meshStandardMaterial color="#d2b889" roughness={0.95} map={strawMap ?? undefined} />
              </mesh>
              <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.19, 0.21, 0.16, 14]} />
                <meshStandardMaterial color="#d8c197" roughness={0.92} map={strawMap ?? undefined} />
              </mesh>
              <mesh position={[0, 0.31, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.2, 0.02, 14]} />
                <meshStandardMaterial color="#b7925e" roughness={0.95} map={strawMap ?? undefined} />
              </mesh>
              <mesh position={[0, 0.28, 0.12]} castShadow>
                <boxGeometry args={[0.12, 0.02, 0.02]} />
                <meshStandardMaterial color="#b7925e" roughness={0.95} map={strawMap ?? undefined} />
              </mesh>
            </group>
          )}
          {headwearStyle === 'turban' && (
            <group>
              {/* Inner cap/base - sits on top of head */}
              <mesh position={[0, 0.32, -0.04]} castShadow>
                <capsuleGeometry args={[0.15, 0.06, 12, 16]} />
                <meshStandardMaterial color={turbanColor} roughness={0.88} />
              </mesh>

              {/* Bottom wrap band - sits above forehead, pushed back */}
              <mesh position={[0, 0.22, -0.04]} rotation={[0.18, 0, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.18, 0.09, 20, 1]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>

              {/* Left side wrap */}
              <mesh position={[-0.11, 0.26, -0.04]} rotation={[0.14, 0.2, -Math.PI / 8]} castShadow>
                <cylinderGeometry args={[0.16, 0.17, 0.10, 20, 1]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>

              {/* Right side wrap */}
              <mesh position={[0.11, 0.26, -0.04]} rotation={[0.14, -0.2, Math.PI / 8]} castShadow>
                <cylinderGeometry args={[0.16, 0.17, 0.10, 20, 1]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>

              {/* Front wrap layer - pushed back to avoid forehead */}
              <mesh position={[0, 0.25, 0.01]} rotation={[Math.PI / 4.2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.17, 0.09, 20, 1]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>

              {/* Mid-height wrap band */}
              <mesh position={[0, 0.30, -0.02]} rotation={[0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.16, 0.09, 20, 1]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>

              {/* Top wrap layer */}
              <mesh position={[0, 0.35, -0.03]} rotation={[0.05, 0, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.14, 0.08, 20, 1]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>

              {/* Crown top piece */}
              <mesh position={[0, 0.39, -0.03]} castShadow>
                <sphereGeometry args={[0.11, 16, 12]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>

              {/* Tail/end piece hanging at back - angled more backward and lower */}
              <mesh position={[0, 0.12, -0.22]} rotation={[Math.PI / 2.8, 0, 0]} castShadow>
                <boxGeometry args={[0.18, 0.05, 0.02]} />
                <meshStandardMaterial color={turbanColor} roughness={0.86} />
              </mesh>
            </group>
          )}
          {headwearStyle === 'taqiyah' && (
            <group>
              {/* Simple rounded skullcap */}
              <mesh position={[0, 0.18, -0.02]} castShadow>
                <sphereGeometry args={[0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color={turbanColor} roughness={0.88} />
              </mesh>
              {/* Bottom band */}
              <mesh position={[0, 0.10, -0.01]} rotation={[0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.19, 0.20, 0.04, 20]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.85} />
              </mesh>
            </group>
          )}
        </group>

        {hasAccessory('bronze earrings') && (
          <group>
            <mesh position={[-0.19, 1.73, 0.06]} castShadow>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#a67c52" roughness={0.7} />
            </mesh>
            <mesh position={[0.19, 1.73, 0.06]} castShadow>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#a67c52" roughness={0.7} />
            </mesh>
          </group>
        )}
        {hasAccessory('copper bracelet') && (
          <group>
            <mesh position={[-0.28, 0.95, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.035, 0.01, 8, 16]} />
              <meshStandardMaterial color="#b87333" roughness={0.6} />
            </mesh>
            <mesh position={[0.28, 0.95, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.035, 0.01, 8, 16]} />
              <meshStandardMaterial color="#b87333" roughness={0.6} />
            </mesh>
          </group>
        )}
        {hasAccessory('small nose ring') && (
          <mesh position={[0.02, 1.74, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.012, 0.004, 6, 12]} />
            <meshStandardMaterial color="#c9a36a" roughness={0.6} />
          </mesh>
        )}
        {hasAccessory('leather belt pouch') && (
          <mesh position={[0.22, 0.95, 0.18]} castShadow>
            <boxGeometry args={[0.12, 0.16, 0.06]} />
            <meshStandardMaterial color="#4a3322" roughness={0.9} />
          </mesh>
        )}
        {hasAccessory('bronze ring') && (
          <mesh position={[0.38, 0.85, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.01, 0.003, 6, 10]} />
            <meshStandardMaterial color="#b08a58" roughness={0.6} />
          </mesh>
        )}
        {hasAccessory('etched bracelet') && (
          <group>
            {/* Left wrist */}
            <mesh position={[-0.28, 0.95, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.038, 0.025, 16]} />
              <meshStandardMaterial color="#d4a965" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[-0.28, 0.96, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.037, 0.003, 8, 16]} />
              <meshStandardMaterial color="#8b6f3a" roughness={0.4} />
            </mesh>
            {/* Right wrist */}
            <mesh position={[0.28, 0.95, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.038, 0.025, 16]} />
              <meshStandardMaterial color="#d4a965" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0.28, 0.96, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.037, 0.003, 8, 16]} />
              <meshStandardMaterial color="#8b6f3a" roughness={0.4} />
            </mesh>
          </group>
        )}
        {hasAccessory('woven sash') && (
          <group>
            {/* Decorative woven sash hanging from belt */}
            <mesh position={[-0.15, 0.92, 0.2]} rotation={[0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.12, 0.25, 0.015]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
            </mesh>
            {/* Woven pattern detail */}
            <mesh position={[-0.15, 0.92, 0.21]} castShadow>
              <boxGeometry args={[0.11, 0.24, 0.01]} />
              <meshStandardMaterial color={color} roughness={0.92} transparent opacity={0.3} />
            </mesh>
          </group>
        )}

        {/* Arms (static for performance) */}
        {!isFemale && (
          <>
            {/* Shoulders */}
            <group ref={leftShoulder} position={[-0.3, 1.4, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
            </group>
            <group ref={rightShoulder} position={[0.3, 1.4, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
            </group>
            <group ref={leftArm} position={[-0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial color={upperArmColor} />
              </mesh>
            <group ref={leftForearm} position={[0, -0.2, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.048, 0.24, 8]} />
                <meshStandardMaterial color={lowerArmColor} />
              </mesh>
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.26, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.04, 0.09, 0.075]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
                <mesh position={[0.01, 0.01, 0.045]} rotation={[0, 0, 0.4]} castShadow>
                  <capsuleGeometry args={[0.02, 0.04, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
              </group>
            </group>
            </group>
            <group ref={rightArm} position={[0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial color={upperArmColor} />
              </mesh>
            <group ref={rightForearm} position={[0, -0.2, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.048, 0.24, 8]} />
                <meshStandardMaterial color={lowerArmColor} />
              </mesh>
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.26, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.04, 0.09, 0.075]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
                <mesh position={[-0.01, 0.01, 0.045]} rotation={[0, 0, -0.4]} castShadow>
                  <capsuleGeometry args={[0.02, 0.04, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={0.9} />
                </mesh>
              </group>
            </group>
            </group>
          </>
        )}

        {/* Legs with knee joints */}
        {!isFemale && (
          <group ref={hipGroup}>
            <group ref={leftLeg} position={[-0.15, 0.45, 0]}>
              {/* Upper leg (thigh) */}
              <mesh position={[0, 0.1, 0]} castShadow>
                <boxGeometry args={[0.15, 0.45, 0.15]} />
                <meshStandardMaterial color={color} />
              </mesh>
              {/* Knee joint */}
              <group ref={leftKnee} position={[0, -0.15, 0]}>
                {/* Knee cap */}
                <mesh position={[0, 0, 0.02]} castShadow>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                {/* Lower leg (shin) */}
                <mesh position={[0, -0.22, 0]} castShadow>
                  <boxGeometry args={[0.13, 0.4, 0.13]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                {/* Sirwal (trousers) visible at ankle */}
                <mesh position={[0, -0.38, 0]} castShadow>
                  <cylinderGeometry args={[0.11, 0.10, 0.18, 12]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.88} />
                </mesh>
                {footwearStyle !== 'bare' && (
                  <group ref={leftFoot} position={[0, -0.45, 0.1]}>
                    <mesh castShadow>
                      <boxGeometry args={[0.18, 0.06, 0.28]} />
                      <meshStandardMaterial color={footwearColor} roughness={0.9} />
                    </mesh>
                    {footwearStyle === 'sandals' && (
                      <mesh position={[0, 0.03, -0.02]} castShadow>
                        <boxGeometry args={[0.14, 0.02, 0.08]} />
                        <meshStandardMaterial color="#5c432a" roughness={0.9} />
                      </mesh>
                    )}
                  </group>
                )}
              </group>
            </group>
            <group ref={rightLeg} position={[0.15, 0.45, 0]}>
              {/* Upper leg (thigh) */}
              <mesh position={[0, 0.1, 0]} castShadow>
                <boxGeometry args={[0.15, 0.45, 0.15]} />
                <meshStandardMaterial color={color} />
              </mesh>
              {/* Knee joint */}
              <group ref={rightKnee} position={[0, -0.15, 0]}>
                {/* Knee cap */}
                <mesh position={[0, 0, 0.02]} castShadow>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                {/* Lower leg (shin) */}
                <mesh position={[0, -0.22, 0]} castShadow>
                  <boxGeometry args={[0.13, 0.4, 0.13]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                {/* Sirwal (trousers) visible at ankle */}
                <mesh position={[0, -0.38, 0]} castShadow>
                  <cylinderGeometry args={[0.11, 0.10, 0.18, 12]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.88} />
                </mesh>
                {footwearStyle !== 'bare' && (
                  <group ref={rightFoot} position={[0, -0.45, 0.1]}>
                    <mesh castShadow>
                      <boxGeometry args={[0.18, 0.06, 0.28]} />
                      <meshStandardMaterial color={footwearColor} roughness={0.9} />
                    </mesh>
                    {footwearStyle === 'sandals' && (
                      <mesh position={[0, 0.03, -0.02]} castShadow>
                        <boxGeometry args={[0.14, 0.02, 0.08]} />
                        <meshStandardMaterial color="#5c432a" roughness={0.9} />
                      </mesh>
                    )}
                  </group>
                )}
              </group>
            </group>
          </group>
        )}
        {isFemale && (
          <>
            {footwearStyle !== 'bare' && (
              <>
                <group ref={leftFoot} position={[-0.12, 0.05, 0.1]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.16, 0.05, 0.22]} />
                    <meshStandardMaterial color={footwearColor} roughness={0.9} />
                  </mesh>
                  {footwearStyle === 'sandals' && (
                    <mesh position={[0, 0.03, -0.01]} castShadow>
                      <boxGeometry args={[0.12, 0.02, 0.06]} />
                      <meshStandardMaterial color="#5c432a" roughness={0.9} />
                    </mesh>
                  )}
                </group>
                <group ref={rightFoot} position={[0.12, 0.05, 0.1]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.16, 0.05, 0.22]} />
                    <meshStandardMaterial color={footwearColor} roughness={0.9} />
                  </mesh>
                  {footwearStyle === 'sandals' && (
                    <mesh position={[0, 0.03, -0.01]} castShadow>
                      <boxGeometry args={[0.12, 0.02, 0.06]} />
                      <meshStandardMaterial color="#5c432a" roughness={0.9} />
                    </mesh>
                  )}
                </group>
              </>
            )}
          </>
        )}
      </group>
    </group>
  );
});
