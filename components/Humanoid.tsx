
import React, { useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WornItemMesh, getWornItemConfig, WornItemConfig } from './items/WornItemMeshes';

// ============================================================================
// FEATURE FLAG: 3D Eye Rendering (Phase 1 Implementation)
// ============================================================================
// Toggle between old flat eyes (false) and new 3D eyeballs (true)
//
// NEW (USE_3D_EYES = true):
//   - Spherical eyeball geometry with depth
//   - Corneal bulge with clearcoat for wet/glassy appearance
//   - Specular highlights for realism
//   - Lower roughness materials (~60 extra vertices per NPC)
//
// OLD (USE_3D_EYES = false):
//   - Original flat plane eyes (fallback)
//   - Zero performance cost
//   - Tested and stable
//
// ROLLBACK: If new eyes look bad, change this to false:
const USE_3D_EYES = false;  // REVERTED - needs proper implementation
// ============================================================================

const damaskCache = new Map<string, THREE.CanvasTexture>();
const strawCache = new Map<string, THREE.CanvasTexture>();
const motifCache = new Map<string, THREE.CanvasTexture>();
const hairCache = new Map<string, THREE.CanvasTexture>();

// Hair strand texture - creates realistic hair strand pattern
const getHairTexture = (baseHex: string, isGraying: boolean = false) => {
  const hashSeed = baseHex.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const key = `${baseHex}_${isGraying}_${hashSeed % 17}`;
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

  // Add a subtle part line and irregular break to avoid helmet look
  const partX = (hashSeed % 37) + 30;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = `rgb(${Math.min(255, r + 55)}, ${Math.min(255, g + 45)}, ${Math.min(255, b + 40)})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(partX, 0);
  ctx.quadraticCurveTo(partX + 6, size / 2, partX - 4, size);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = `rgb(${Math.floor(r * 0.55)}, ${Math.floor(g * 0.55)}, ${Math.floor(b * 0.55)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(partX + 3, 0);
  ctx.quadraticCurveTo(partX + 8, size / 2, partX + 2, size);
  ctx.stroke();

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
  texture.repeat.set(1.6, 1.6); // Reduced repeat for less visible tiling
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
  headscarfRoughness?: number;
  headscarfStyle?: 'veiled' | 'full' | 'modest';
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
  facialHairColor?: string;
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
  headscarfPattern?: 'none' | 'stripe' | 'band' | 'geometric' | 'simple';
  headscarfAccentColor?: string;
  headwearGarmentType?: 'khimar' | 'milhafa' | 'hijab';
  hasEmbroidery?: boolean;
  turbanPattern?: 'none' | 'stripe' | 'band' | 'geometric' | 'simple';
  turbanAccentColor?: string;
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
  distanceFromCamera?: number;  // PERFORMANCE: LOD - skip detail when far
  enableSimpleLod?: boolean;
  simpleLodDistance?: number;
  animationLodDistance?: number;
  shadowLodDistance?: number;
  showGroundShadow?: boolean;
  shadowMode?: 'full' | 'proxy';
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
  // Eye color - if not provided, generated based on hairColor seed
  eyeColor?: string;
  // Facial expression: -1 frown to +1 smile
  mouthExpression?: number;
  // Portrait mode - enables enhanced facial animations (only for encounter modal)
  portraitMode?: boolean;
  isSpeaking?: boolean;
  mood?: string;
  panicLevel?: number;
  // Visible inventory items to render on character
  visibleItems?: string[];
  // Cosmetic effects based on inventory (kohl, henna)
  cosmeticEffects?: {
    hasKohl?: boolean;
    hasHenna?: boolean;
  };
  // ANIMATION: Enhanced movement animations
  turnPhaseRef?: React.MutableRefObject<number>; // 0-1 pivot animation progress
  angularVelocityRef?: React.MutableRefObject<number>; // Current turn rate for pivot direction
  // Player flag - enables player-specific behaviors (slower blink rate)
  isPlayer?: boolean;
  movementStartTimeRef?: React.MutableRefObject<number>; // For start inertia
  movementStopTimeRef?: React.MutableRefObject<number>; // For stop inertia
  sprintTransitionRef?: React.MutableRefObject<number>; // 0-1 walk to run blend
}

export const Humanoid: React.FC<HumanoidProps> = memo(({
  color = '#2a3b55',
  headColor = '#e0ac69',
  turbanColor = '#f0f0f0',
  headscarfColor = '#b08968',
  headscarfRoughness = 0.92,
  headscarfStyle = 'full',
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
  facialHairColor: facialHairColorProp,
  headwearStyle: headwearStyleProp,
  headscarfPattern = 'none',
  headscarfAccentColor,
  headwearGarmentType = 'hijab',
  hasEmbroidery = false,
  turbanPattern = 'none',
  turbanAccentColor,
  sleeveCoverage = robeSleeves ? 'full' : 'none',
  footwearStyle = 'sandals',
  footwearColor = '#9b7b4f',
  accessories = [],
  distanceFromCamera = 0,
  enableSimpleLod = false,
  simpleLodDistance = 45,
  animationLodDistance = 22,
  shadowLodDistance = 20,
  showGroundShadow = true,
  shadowMode = 'full',
  gazeTarget,
  worldPosition,
  actionAnimationRef,
  sicknessLevel = 0,
  isInfected = false,
  isIncubating = false,
  age,
  eyeColor: eyeColorProp,
  mouthExpression: mouthExpressionProp = 0,
  // Portrait mode props (only used in encounter modal)
  portraitMode = false,
  isSpeaking = false,
  mood = 'neutral',
  panicLevel = 0,
  visibleItems = [],
  cosmeticEffects,
  // Enhanced movement animation props
  turnPhaseRef,
  angularVelocityRef,
  movementStartTimeRef,
  movementStopTimeRef,
  sprintTransitionRef,
  isPlayer = false,
}) => {
  const simpleLodActive = enableSimpleLod && distanceFromCamera > simpleLodDistance;
  const animationLodActive = distanceFromCamera > animationLodDistance;
  const castShadowEnabled = distanceFromCamera <= shadowLodDistance;
  const castsFullShadow = shadowMode === 'full';
  // PERFORMANCE: LOD - skip facial details beyond 25 units
  const showFacialDetails = distanceFromCamera < 25;
  // PERFORMANCE: Hair LOD tiers - high detail when close, simplified when far
  const hairLOD: 'high' | 'medium' | 'low' =
    distanceFromCamera < 15 ? 'high' :
    distanceFromCamera < 35 ? 'medium' : 'low';

  // Apply age and sickness modifications to skin
  const sickHeadColor = useMemo(() => {
    const baseColor = new THREE.Color(headColor);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    // Age-based skin changes (weathered, less saturated, subtle tone shift)
    if (age !== undefined && age >= 50) {
      const ageFactor = Math.min(1, (age - 50) / 40); // 0 at 50, 1 at 90+
      // Reduce saturation (weathered look)
      hsl.s *= (1 - ageFactor * 0.25);
      // Slightly shift hue toward more neutral (less warm orange)
      hsl.h = hsl.h - ageFactor * 0.01;
      // Add slight sun damage (tiny bit darker in spots implied by overall tone)
      hsl.l *= (1 - ageFactor * 0.05);
      baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    }

    // Sickness overlay (greenish-gray pallor)
    if (sicknessLevel > 0) {
      const sickColor = new THREE.Color('#8a9a7a'); // Pale greenish-gray
      baseColor.lerp(sickColor, sicknessLevel * 0.4); // Up to 40% tint
      baseColor.getHSL(hsl);
      baseColor.setHSL(hsl.h, hsl.s * (1 - sicknessLevel * 0.5), hsl.l * (1 - sicknessLevel * 0.15));
    }

    return baseColor.getStyle();
  }, [headColor, sicknessLevel, age]);
  const rootRef = useRef<THREE.Group>(null);
  const lastShadowEnabledRef = useRef<boolean | null>(null);
  const lastShadowModeRef = useRef<'full' | 'proxy' | null>(null);
  const shadowProxyRef = useRef<THREE.Mesh>(null);
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
  // Facial hair color - uses separate color if provided (for age-based graying), otherwise hairColor
  const beardColor = facialHairColorProp || hairColor;
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
      // Head shape variety - range from narrow (0.8) to wide (1.05)
      craniumWidth: 0.85 + Math.random() * 0.25,
      craniumHeight: 1.0 + Math.random() * 0.25,
      craniumDepth: 0.85 + Math.random() * 0.15,
      faceWidthRatio: 0.95 + Math.random() * 0.20,
      hairlineVariant: (() => {
        const roll = Math.random();
        if (roll < 0.33) return 'full';
        if (roll < 0.66) return 'receded';
        return 'widow';
      })(),
      // Lip fullness - affects Z-depth/protrusion (0.7 = thin, 1.3 = full)
      lipFullness: 1 + Math.random() * 0.6,
      // Mouth corner curve - positive = slight smile, negative = serious/frown
      mouthCornerCurve: (Math.random() - 0.5) * 0.006,
    };
  }, []);
  const lipWidthScale = useMemo(() => 1.25 + Math.random() * 0.15, []);
  const lipLowerScale = useMemo(() => {
    const roll = Math.random();
    if (roll < 0.67) {
      // 2/3 have wider lower lip (current behavior)
      return 1.08 + Math.random() * 0.18;
    } else if (roll < 0.83) {
      // 1/6 have equal width lips
      return 1.0;
    } else {
      // 1/6 have wider upper lip
      return 0.8 + Math.random() * 0.12;
    }
  }, []);
  const lipGap = useMemo(() => 0.006 + Math.random() * 0.004, []);
  const headwearShadow = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(0.85).getStyle(), [headscarfColor]);
  const headwearHighlight = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(1.08).getStyle(), [headscarfColor]);
  const turbanHighlight = useMemo(() => {
    const hash = turbanColor.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    if (headwearStyle === 'turban' || headwearStyle === 'fez') {
      if (hash % 30 === 0) return '#f4efe6'; // white stripe option
      if (hash % 50 === 0) return new THREE.Color(turbanColor).multiplyScalar(0.65).getStyle();
    }
    return new THREE.Color(turbanColor).multiplyScalar(1.18).getStyle();
  }, [turbanColor, headwearStyle]);
  const scarfPatternColor = useMemo(
    () => headscarfAccentColor ?? headwearHighlight,
    [headscarfAccentColor, headwearHighlight]
  );
  const turbanPatternColor = useMemo(
    () => turbanAccentColor ?? turbanHighlight,
    [turbanAccentColor, turbanHighlight]
  );

  // Generate texture-based patterns for geometric and simple headscarf patterns
  const headscarfTexture = useMemo(() => {
    if (headscarfPattern === 'geometric') {
      return getMotifTexture('geometric', headscarfColor, scarfPatternColor, 4);
    } else if (headscarfPattern === 'simple') {
      return getMotifTexture('damask', headscarfColor, scarfPatternColor, 6);
    } else if (headscarfPattern === 'stripe') {
      return getMotifTexture('stripe', headscarfColor, scarfPatternColor, 3);
    }
    return null;
  }, [headscarfPattern, headscarfColor, scarfPatternColor]);

  // Generate texture-based patterns for turban patterns
  const turbanTexture = useMemo(() => {
    if (turbanPattern === 'geometric') {
      return getMotifTexture('geometric', turbanColor, turbanPatternColor, 4);
    } else if (turbanPattern === 'simple') {
      return getMotifTexture('tiraz', turbanColor, turbanPatternColor, 2);
    } else if (turbanPattern === 'stripe') {
      return getMotifTexture('stripe', turbanColor, turbanPatternColor, 3);
    }
    return null;
  }, [turbanPattern, turbanColor, turbanPatternColor]);

  const femaleRobeSpread = useMemo(() => robeSpread ?? (0.75 + Math.random() * 0.18), [robeSpread]);
  const femaleRobeBand = useMemo(() => robeHemBand ?? (Math.random() > 0.5), [robeHemBand]);
  const eyeScale = useMemo(() => {
    const base = isFemale ? [1.7, 0.85, 0.7] : [1.4, 0.7, 0.7];
    return [base[0], base[1] * faceVariant.eyeScaleY, base[2]] as [number, number, number];
  }, [isFemale, faceVariant.eyeScaleY]);
  const eyeY = (isFemale ? 0.03 : 0.02) + faceVariant.eyeYOffset;
  const browColor = useMemo(
    () => new THREE.Color(hairColor).multiplyScalar(0.92).getStyle(),
    [hairColor]
  );
  const browHeight = Math.max(0.02, (isFemale ? 0.035 : 0.045) * faceVariant.browHeightScale);
  const browY = eyeY + 0.058 + faceVariant.browYOffset;
  const browX = faceVariant.eyeSpacing - 0.008;
  const noseLength = isFemale ? 0.09 : 0.1;
  const noseRadius = isFemale ? 0.025 : 0.017;
  const mouthWidth = isFemale ? 0.045 : 0.05;
  const mouthY = (isFemale ? -0.095 : -0.09) + faceVariant.mouthYOffset;
  const mouthExpression = useMemo(
    () => THREE.MathUtils.clamp(mouthExpressionProp, -1, 1),
    [mouthExpressionProp]
  );
  const mouthCornerLift = mouthExpression * 0.012;
  const mouthCornerTilt = mouthExpression * 0.45;

  // Jaw prominence - gender and age based
  const jawProminence = useMemo(() => {
    if (isFemale) {
      // 30% of women have subtle jaw definition
      return Math.random() < 0.3 ? 0.3 + Math.random() * 0.4 : 0;
    } else {
      // 80% of men have jaw definition (subtle to prominent)
      return Math.random() < 0.8 ? 0.4 + Math.random() * 0.6 : 0;
    }
  }, [isFemale]);
  const ageJawModifier = age && age > 50 ? 1.15 : age && age < 25 ? 0.85 : 1.0;
  const finalJawSize = jawProminence * ageJawModifier;

  const adjustColor = (hex: string, factor: number) => {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) * factor)));
    const b = Math.min(255, Math.max(0, Math.round((num & 0xff) * factor)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  const clothRoughness = useMemo(() => 0.92 + (Math.random() - 0.5) * 0.06, []);
  const accentRoughness = useMemo(() => 0.9 + (Math.random() - 0.5) * 0.06, []);
  const clothUpperColor = useMemo(() => adjustColor(color, 1.04), [color]);
  const clothLowerColor = useMemo(() => adjustColor(color, 0.92), [color]);
  const clothFoldColor = useMemo(() => adjustColor(color, 0.82), [color]);
  const skinRoughness = useMemo(() => 0.62 + (Math.random() - 0.5) * 0.05, []);
  const skinMetalness = 0.02;
  const upperArmColor = sleeveCoverage === 'full' ? clothUpperColor : headColor;
  const lowerArmColor = sleeveCoverage === 'none' ? headColor : clothLowerColor;
  const hasAccessory = (value: string) => accessories.includes(value);
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

  // Levantine eye colors - seeded from hairColor for consistency
  const eyeColor = useMemo(() => {
    if (eyeColorProp) return eyeColorProp;
    // Create seed from hairColor string
    const seed = hairColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const roll = (seed % 100) / 100;
    // Levantine population eye color distribution:
    // ~40% dark brown, ~25% medium brown, ~15% light brown/amber,
    // ~10% hazel, ~6% green, ~3% honey/light hazel, ~1% blue-gray
    if (roll > 0.99) return '#7a9bb8'; // rare blue-gray (1%)
    if (roll > 0.96) return '#9a8b6f'; // honey/light hazel (3%)
    if (roll > 0.90) return '#5a7a4a'; // green (6%)
    if (roll > 0.80) return '#6b7a52'; // hazel/brown-green (10%)
    if (roll > 0.65) return '#8b6b3a'; // light brown/amber (15%)
    if (roll > 0.40) return '#5a4030'; // medium warm brown (25%)
    return '#3a2a1a'; // dark brown (40%)
  }, [eyeColorProp, hairColor]);
  const strideVariance = useMemo(() => 0.85 + Math.random() * 0.3, []);
  const armVariance = useMemo(() => 0.85 + Math.random() * 0.3, []);
  const gaitPhaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  // Age affects multiple aspects of appearance and movement
  const ageScale = useMemo(() => {
    if (age === undefined) return 1;
    if (age < 18) return 1.08; // Youth - slightly faster/bouncier
    if (age < 35) return 1.0;  // Prime
    if (age < 55) return 0.92; // Middle-aged - slightly slower
    return 0.78; // Elderly - noticeably slower
  }, [age]);

  // Posture changes with age - elderly have slight forward hunch
  const agePosture = useMemo(() => {
    if (age === undefined) return { torsoLean: 0, shoulderDrop: 0, headForward: 0 };
    if (age < 45) return { torsoLean: 0, shoulderDrop: 0, headForward: 0 };
    if (age < 60) return { torsoLean: 0.04, shoulderDrop: 0.02, headForward: 0.03 }; // Slight stoop
    if (age < 75) return { torsoLean: 0.08, shoulderDrop: 0.04, headForward: 0.06 }; // Noticeable stoop
    return { torsoLean: 0.12, shoulderDrop: 0.06, headForward: 0.08 }; // Pronounced stoop
  }, [age]);

  // Stride length decreases with age
  const ageStrideModifier = useMemo(() => {
    if (age === undefined) return 1;
    if (age < 45) return 1;
    if (age < 60) return 0.92;
    if (age < 75) return 0.82;
    return 0.7;
  }, [age]);

  // CHILD BODY SCALING - makes children physically smaller
  // Based on real growth charts: toddlers ~50% adult height, pre-teens ~70%, teens ~85%
  const childBodyScale = useMemo(() => {
    if (age === undefined || age >= 18) return 1;
    if (age <= 2) return 0.35;  // Toddlers - very small
    if (age <= 5) return 0.45;  // Young children
    if (age <= 8) return 0.55;  // Children
    if (age <= 12) return 0.70; // Pre-teens
    if (age <= 15) return 0.82; // Early teens
    return 0.92; // Late teens (16-17)
  }, [age]);

  // Children have proportionally larger heads - apply inverse scale to head
  const childHeadProportion = useMemo(() => {
    if (age === undefined || age >= 18) return 1;
    if (age <= 2) return 1.6;   // Toddlers have much bigger heads proportionally
    if (age <= 5) return 1.4;   // Young children
    if (age <= 8) return 1.25;  // Children
    if (age <= 12) return 1.12; // Pre-teens
    return 1.05; // Teens approaching adult proportions
  }, [age]);

  // Compute final scale including child body scaling
  const effectiveScale = useMemo((): [number, number, number] => {
    return [
      scale[0] * childBodyScale,
      scale[1] * childBodyScale,
      scale[2] * childBodyScale
    ];
  }, [scale, childBodyScale]);

  const healthScale = useMemo(() => Math.max(0.6, 1 - sicknessLevel * 0.35), [sicknessLevel]);

  // Under-eye bags/dark circles for aged (50+) or sick/infected characters
  const underEyeBagIntensity = useMemo(() => {
    let intensity = 0;
    // Age-based bags (gradual increase from 50+)
    if (age !== undefined) {
      if (age >= 70) intensity += 0.8;
      else if (age >= 60) intensity += 0.5;
      else if (age >= 50) intensity += 0.25;
    }
    // Sickness adds to bags
    intensity += sicknessLevel * 0.6;
    // Infection gives noticeable bags even if not visibly sick yet
    if (isInfected || isIncubating) {
      intensity += 0.4;
    }
    return Math.min(1, intensity); // Cap at 1
  }, [age, sicknessLevel, isInfected, isIncubating]);

  // Color for under-eye bags (darker, slightly purplish shadow)
  const underEyeColor = useMemo(() => {
    const baseColor = new THREE.Color(sickHeadColor).multiplyScalar(0.6);
    // Add slight purple/blue tint for realistic dark circles
    const purpleTint = new THREE.Color('#4a3a4a');
    baseColor.lerp(purpleTint, 0.3 + underEyeBagIntensity * 0.2);
    return baseColor.getStyle();
  }, [sickHeadColor, underEyeBagIntensity]);

  // Forehead wrinkles - age-based (40+)
  const foreheadWrinkleCount = useMemo(() => {
    if (age === undefined || age < 40) return 0;
    if (age < 50) return 1;
    if (age < 60) return 2;
    if (age < 70) return 3;
    return 4; // 70+
  }, [age]);

  // Wrinkle color - darker than skin
  const wrinkleColor = useMemo(() => {
    return new THREE.Color(sickHeadColor).multiplyScalar(0.7).getStyle();
  }, [sickHeadColor]);

  // Moles/beauty marks - seeded random for consistency per character
  const moleData = useMemo(() => {
    // Create seed from hairColor for consistent moles per character
    const seed = hairColor.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // ~35% of characters have moles
    if (seededRandom(0) > 0.35) return [];

    const moles: Array<{ x: number; y: number; z: number; size: number }> = [];
    const moleCount = seededRandom(1) > 0.6 ? 2 : 1; // 40% chance of 2 moles

    // Possible mole positions (relative to face center)
    const positions = [
      { x: -0.04, y: -0.02, z: 0.165, name: 'left cheek' },
      { x: 0.045, y: -0.03, z: 0.163, name: 'right cheek' },
      { x: -0.025, y: -0.07, z: 0.16, name: 'near left mouth' },
      { x: 0.03, y: -0.065, z: 0.158, name: 'near right mouth' },
      { x: -0.02, y: 0.08, z: 0.16, name: 'left forehead' },
      { x: 0.025, y: 0.075, z: 0.158, name: 'right forehead' },
      { x: 0, y: -0.12, z: 0.155, name: 'chin' },
    ];

    for (let i = 0; i < moleCount; i++) {
      const posIndex = Math.floor(seededRandom(10 + i) * positions.length);
      const pos = positions[posIndex];
      // Slight position variation
      const xVar = (seededRandom(20 + i) - 0.5) * 0.01;
      const yVar = (seededRandom(30 + i) - 0.5) * 0.01;
      // Size variation (0.003 to 0.006)
      const size = 0.003 + seededRandom(40 + i) * 0.003;
      moles.push({
        x: pos.x + xVar,
        y: pos.y + yVar,
        z: pos.z,
        size
      });
    }
    return moles;
  }, [hairColor]);

  // Mole color - dark brown, slightly varied
  const moleColor = useMemo(() => {
    const base = new THREE.Color('#3a2a1a');
    // Slight variation based on skin tone
    const skinBase = new THREE.Color(sickHeadColor);
    base.lerp(skinBase, 0.15);
    return base.multiplyScalar(0.6).getStyle();
  }, [sickHeadColor]);

  // Cheek flush/rosy cheeks - based on age, gender, health
  const cheekFlushIntensity = useMemo(() => {
    // Create seed for consistent flush per character
    const seed = hairColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    let baseChance = 0.25; // Default 25% base chance
    let intensity = 0;

    // Children have higher chance and stronger flush
    if (age !== undefined && age < 12) {
      baseChance = 0.6;
      intensity = 0.7;
    } else if (age !== undefined && age < 25) {
      baseChance = 0.4;
      intensity = 0.5;
    } else if (age !== undefined && age > 60) {
      baseChance = 0.15; // Elderly less likely
      intensity = 0.3;
    } else {
      intensity = 0.4;
    }

    // Women slightly more likely
    if (isFemale) {
      baseChance += 0.1;
      intensity += 0.1;
    }

    // Sick or infected = reduced flush (pallor dominates)
    if (sicknessLevel > 0.3 || isInfected) {
      return 0;
    }

    // Random chance based on seed
    if (seededRandom(100) > baseChance) return 0;

    return Math.min(1, intensity);
  }, [age, isFemale, sicknessLevel, isInfected, hairColor]);

  // Cheek flush color - warm rosy pink/red
  const cheekFlushColor = useMemo(() => {
    // Mix between skin tone and rosy pink
    const skinBase = new THREE.Color(sickHeadColor);
    const rosyPink = new THREE.Color('#c47070');
    skinBase.lerp(rosyPink, 0.4 + cheekFlushIntensity * 0.2);
    return skinBase.getStyle();
  }, [sickHeadColor, cheekFlushIntensity]);

  const upperLidLeft = useRef<THREE.Mesh>(null);
  const upperLidRight = useRef<THREE.Mesh>(null);
  const lowerLidLeft = useRef<THREE.Mesh>(null);
  const lowerLidRight = useRef<THREE.Mesh>(null);
  const blinkTimer = useRef(0);
  // Player blinks less frequently (5-10s) than NPCs (2-5s) for more natural idle look
  const blinkCooldown = useRef(isPlayer ? 5 + Math.random() * 5 : 2 + Math.random() * 3);
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
  // Gaze tracking state (horizontal only - no vertical pitch)
  const currentGazeYaw = useRef(0);
  // Eye scanning state (eyes shift while walking)
  const eyeScanTimer = useRef(Math.random() * 3);
  const eyeScanTargetX = useRef(0);
  const eyeScanTargetY = useRef(0);
  const eyeScanCooldown = useRef(0.8 + Math.random() * 1.5);

  useFrame((state) => {
    if (
      rootRef.current &&
      (lastShadowEnabledRef.current !== castShadowEnabled || lastShadowModeRef.current !== shadowMode)
    ) {
      lastShadowEnabledRef.current = castShadowEnabled;
      lastShadowModeRef.current = shadowMode;
      rootRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).castShadow = false;
        }
      });
      if (castShadowEnabled) {
        if (shadowMode === 'full') {
          rootRef.current.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).castShadow = true;
            }
          });
        } else if (shadowProxyRef.current) {
          shadowProxyRef.current.castShadow = true;
        }
      }
    }
    if (simpleLodActive || animationLodActive) return;
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

    // ANIMATION: Get enhanced movement values
    const turnPhase = turnPhaseRef?.current ?? 0;
    const angularVel = angularVelocityRef?.current ?? 0;
    const sprintBlend = sprintTransitionRef?.current ?? (isSprinting ? 1 : 0);
    // Use performance.now() to match the time source used in Player.tsx
    const perfNow = performance.now() * 0.001;

    // ANIMATION: Calculate movement inertia (start/stop ramp)
    // Default to isWalking state if refs not provided (for NPCs without tracking)
    let movementInertia = isWalking ? 1 : 0;
    if (movementStartTimeRef && movementStopTimeRef) {
      if (isWalking) {
        // Ramp up over 0.25 seconds when starting to walk
        const startTime = movementStartTimeRef.current > 0 ? movementStartTimeRef.current : perfNow;
        const timeSinceStart = Math.max(0, perfNow - startTime);
        movementInertia = Math.min(1, timeSinceStart / 0.25);
        // Ease the ramp for smoother start
        movementInertia = movementInertia * movementInertia * (3 - 2 * movementInertia); // smoothstep
      } else {
        // Decay over 0.2 seconds when stopping
        // If stopTime ref is 0 (never walked), stay at 0 inertia (idle)
        if (movementStopTimeRef.current > 0) {
          const timeSinceStop = Math.max(0, perfNow - movementStopTimeRef.current);
          movementInertia = Math.max(0, 1 - timeSinceStop / 0.2);
          movementInertia = movementInertia * movementInertia; // ease out
        }
        // else: keep default of 0 (never moved, so no decay animation needed)
      }
    }

    // ANIMATION: Blend between walk and run gaits using sprintBlend
    const walkAmp = 0.55;
    const runAmp = 0.85;
    const walkSpeed_gait = walkSpeed;
    const runSpeed_gait = walkSpeed * 2.2;
    // Interpolate amplitude and speed based on sprint transition
    const blendedAmp = walkAmp + (runAmp - walkAmp) * sprintBlend;
    const blendedSpeed = walkSpeed_gait + (runSpeed_gait - walkSpeed_gait) * sprintBlend;

    const baseSpeed = blendedSpeed;
    // Age affects both speed (ageScale) and stride length (ageStrideModifier)
    const effectiveWalkSpeed = baseSpeed * ageScale * ageStrideModifier * healthScale * (0.9 + strideVariance * 0.15);
    const t = state.clock.elapsedTime * effectiveWalkSpeed + gaitPhaseOffset;
    const strideScale = (isFemale ? 0.88 : 1) * ageStrideModifier;

    // Apply inertia and turn damping to amplitude
    const turnDamping = 1 - turnPhase * 0.6; // Reduce stride during sharp turns
    const amp = (isWalking || movementInertia > 0.01)
      ? blendedAmp * strideScale * strideVariance * movementInertia * turnDamping
      : 0;

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

    // ANIMATION: Calculate pivot/turn adjustments
    // During sharp turns, add cross-step motion
    const turnDirection = angularVel > 0 ? 1 : -1; // Positive = turning right
    const turnScale = THREE.MathUtils.clamp(strideScale, 0.75, 1);
    const pivotScale = (1 - turnPhase * 0.35) * turnScale;
    const pivotCrossStep = turnPhase * 0.4 * turnDirection * pivotScale; // Cross-step offset

    // Leg swinging with eased motion for weight transfer feel
    if (leftLeg.current) {
      // During pivot, inside leg steps across
      const pivotOffset = turnDirection > 0 ? pivotCrossStep * 0.5 : -pivotCrossStep;
      const targetRotation = (isWalking || movementInertia > 0.01) ? leftPhase * amp + pivotOffset : 0;
      leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, targetRotation, 0.18);
      // Add lateral rotation during turn (leg swings outward)
      const lateralTurn = turnPhase * 0.15 * (turnDirection > 0 ? 1 : -0.3);
      leftLeg.current.rotation.z = THREE.MathUtils.lerp(leftLeg.current.rotation.z || 0, lateralTurn, 0.12);
    }
    if (rightLeg.current) {
      // During pivot, outside leg plants
      const pivotOffset = turnDirection < 0 ? pivotCrossStep * 0.5 : -pivotCrossStep;
      const targetRotation = (isWalking || movementInertia > 0.01) ? rightPhase * amp + pivotOffset : 0;
      rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, targetRotation, 0.18);
      // Add lateral rotation during turn
      const lateralTurn = turnPhase * 0.15 * (turnDirection < 0 ? 1 : -0.3);
      rightLeg.current.rotation.z = THREE.MathUtils.lerp(rightLeg.current.rotation.z || 0, lateralTurn, 0.12);
    }

    // Knee bending - flexes during swing phase, extends during stance
    // ANIMATION: More knee bend when running, smooth blend
    const walkKnee = 0.5;
    const runKnee = 1.1;
    const kneeBlend = walkKnee + (runKnee - walkKnee) * sprintBlend;
    const kneeFlexAmount = Math.min(1.0, kneeBlend * (0.9 + strideScale * 0.1));
    const leftKneeFlexion = (isWalking || movementInertia > 0.01) ? Math.max(0, -leftPhase) * kneeFlexAmount * movementInertia : 0;
    const rightKneeFlexion = (isWalking || movementInertia > 0.01) ? Math.max(0, -rightPhase) * kneeFlexAmount * movementInertia : 0;
    if (leftKnee.current) {
      leftKnee.current.rotation.x = THREE.MathUtils.lerp(leftKnee.current.rotation.x, leftKneeFlexion, 0.18);
    }
    if (rightKnee.current) {
      rightKnee.current.rotation.x = THREE.MathUtils.lerp(rightKnee.current.rotation.x, rightKneeFlexion, 0.18);
    }

    // Hip counter-rotation for natural weight shift
    // ANIMATION: Add pivot rotation to hips during sharp turns
    const hipWalkRot = 0.22;
    const hipRunRot = 0.28;
    const hipRotAmount = (hipWalkRot + (hipRunRot - hipWalkRot) * sprintBlend) * turnScale;
    if (hipGroup.current && (isWalking || movementInertia > 0.01)) {
      const baseHipRotation = leftPhase * amp * hipRotAmount;
      // During pivot, hips lead the turn
      const pivotHipTurn = turnPhase * 0.3 * turnDirection * pivotScale;
      hipGroup.current.rotation.y = baseHipRotation + pivotHipTurn;
      hipGroup.current.rotation.z = leftPhase * amp * 0.06 * movementInertia;
    } else if (hipGroup.current) {
      hipGroup.current.rotation.y = THREE.MathUtils.lerp(hipGroup.current.rotation.y, 0, 0.1);
      hipGroup.current.rotation.z = THREE.MathUtils.lerp(hipGroup.current.rotation.z, 0, 0.1);
    }

    // Torso twist - counter-rotates against hips for natural contra-posto
    // Age posture adds forward lean for elderly NPCs
    if (torsoGroup.current && (isWalking || movementInertia > 0.01)) {
      const torsoTwist = -leftPhase * amp * 0.15; // Opposite to hip rotation
      const torsoLean = leftPhase * amp * 0.04 * movementInertia; // Subtle side lean
      // During pivot, torso follows hips with delay (twist into turn)
      const pivotTorsoTurn = turnPhase * 0.2 * turnDirection * pivotScale;
      torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, torsoTwist + pivotTorsoTurn, 0.15);
      torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, torsoLean, 0.12);
      // Age-based forward lean while walking
      torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, agePosture.torsoLean, 0.1);
    } else if (torsoGroup.current) {
      torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, 0, 0.1);
      torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, 0, 0.1);
      // Age-based forward lean at rest
      torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, agePosture.torsoLean, 0.08);
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
    // HORIZONTAL ONLY - NPCs turn head left/right, no up/down tilt (looks natural for walking)
    if (gazeTarget && worldPosition && headGroup.current) {
      // Calculate direction to target
      const dx = gazeTarget.x - worldPosition.x;
      const dz = gazeTarget.z - worldPosition.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      // Only track targets within 8 units
      if (distToTarget < 8 && distToTarget > 0.5) {
        // Calculate yaw (horizontal turn) to target
        const targetYaw = Math.atan2(-dx, -dz); // Negate for correct direction

        // Clamp to natural head turn limits
        const maxYaw = 0.7; // ~40 degrees

        const clampedYaw = THREE.MathUtils.clamp(targetYaw, -maxYaw, maxYaw);

        // Smoothly interpolate toward target gaze (horizontal only)
        currentGazeYaw.current = THREE.MathUtils.lerp(currentGazeYaw.current, clampedYaw, 0.04);

        // Note: Head rotation is applied in the animation section below (combined with walking animation)

        // Eye gaze - eyes move horizontally to track target
        const eyeYaw = THREE.MathUtils.clamp(targetYaw - currentGazeYaw.current, -0.25, 0.25);

        // Shift eye position horizontally to look at target
        const gazeOffsetX = eyeYaw * 0.015;
        if (leftEye.current) {
          const baseX = -faceVariant.eyeSpacing;
          const baseY = eyeY + 0.010; // Iris positioned higher so eyelid covers top
          leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX + gazeOffsetX, 0.15);
          leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, baseY, 0.15);
        }
        if (rightEye.current) {
          const baseX = faceVariant.eyeSpacing;
          const baseY = eyeY + 0.010; // Iris positioned higher so eyelid covers top
          rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX + gazeOffsetX, 0.15);
          rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, baseY, 0.15);
        }
      } else {
        // Target out of range - return to forward gaze
        currentGazeYaw.current = THREE.MathUtils.lerp(currentGazeYaw.current, 0, 0.02);

        if (leftEye.current) {
          const baseX = -faceVariant.eyeSpacing;
          const baseY = eyeY + 0.010; // Iris positioned higher so eyelid covers top
          leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX, 0.08);
          leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, baseY, 0.08);
        }
        if (rightEye.current) {
          const baseX = faceVariant.eyeSpacing;
          const baseY = eyeY + 0.010; // Iris positioned higher so eyelid covers top
          rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX, 0.08);
          rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, baseY, 0.08);
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
      const baseY = eyeY + 0.010; // Iris positioned higher so eyelid covers top
      if (leftEye.current) {
        const baseX = -faceVariant.eyeSpacing;
        leftEye.current.position.x = THREE.MathUtils.lerp(leftEye.current.position.x, baseX + scanOffsetX, 0.08);
        leftEye.current.position.y = THREE.MathUtils.lerp(leftEye.current.position.y, baseY + scanOffsetY, 0.08);
      }
      if (rightEye.current) {
        const baseX = faceVariant.eyeSpacing;
        rightEye.current.position.x = THREE.MathUtils.lerp(rightEye.current.position.x, baseX + scanOffsetX, 0.08);
        rightEye.current.position.y = THREE.MathUtils.lerp(rightEye.current.position.y, baseY + scanOffsetY, 0.08);
      }
    }

    // Robe/clothing secondary motion - follows movement with delay
    if (robeHemRef.current) {
      if (isWalking || movementInertia > 0.01) {
        // Cloth sways with delayed follow-through
        const clothDelay = Math.sin(t - 0.4) * amp * 0.12;
        const clothSway = Math.sin(t * 0.7) * amp * 0.06;
        const gaitHemSway = isFemale ? Math.sin(t * 0.5) * amp * 0.04 : 0;
        robeHemRef.current.rotation.x = THREE.MathUtils.lerp(robeHemRef.current.rotation.x, clothDelay, 0.08);
        robeHemRef.current.rotation.z = THREE.MathUtils.lerp(robeHemRef.current.rotation.z, clothSway + gaitHemSway, 0.06);
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
    const effectiveWalking = isWalking || movementInertia > 0.01;
    // Foot rotation for heel-to-toe movement - only when walking
    if (leftFoot.current) {
      if (effectiveWalking) {
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
      if (effectiveWalking) {
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

        // Normal walk arm swing - immediate response when walking
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
            // IDLE: Arms at natural rest pose - slightly forward, elbows bent
            const idleArmX = 0.12;
            const idleArmZ = 0.08;
            const idleElbow = -0.25;

            if (leftArm.current) {
              leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, idleArmX, 0.1);
              leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, idleArmZ, 0.1);
              leftArm.current.rotation.y = THREE.MathUtils.lerp(leftArm.current.rotation.y, 0, 0.1);
            }
            if (leftForearm.current) {
              leftForearm.current.rotation.x = THREE.MathUtils.lerp(leftForearm.current.rotation.x, idleElbow, 0.1);
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, idleArmX, 0.1);
              rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -idleArmZ, 0.1);
              rightArm.current.rotation.y = THREE.MathUtils.lerp(rightArm.current.rotation.y, 0, 0.1);
            }
            if (rightForearm.current) {
              rightForearm.current.rotation.x = THREE.MathUtils.lerp(rightForearm.current.rotation.x, idleElbow, 0.1);
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
      // ANIMATION: Bobbing and breathing with smooth blend
      const effectiveWalking = isWalking || movementInertia > 0.01;

      // Idle breathing is slow and subtle (about 14 breaths/min = 0.23 Hz)
      const idleBreathSpeed = 0.5;
      const idleBreathAmp = 0.008; // Very subtle vertical movement
      const idleBreathing = Math.sin(state.clock.elapsedTime * idleBreathSpeed) * idleBreathAmp;

      // Walking/running breath is faster and more pronounced
      const walkBreathSpeed = 1.6;
      const runBreathSpeed = 3.2;
      const activeBreathSpeed = walkBreathSpeed + (runBreathSpeed - walkBreathSpeed) * sprintBlend;
      const walkBreathAmp = 0.02;
      const runBreathAmp = 0.01;
      const activeBreathAmp = walkBreathAmp + (runBreathAmp - walkBreathAmp) * sprintBlend;
      const activeBreathing = Math.sin(state.clock.elapsedTime * activeBreathSpeed) * activeBreathAmp;

      // Smoothly blend between idle and active breathing based on movement inertia
      const breathing = idleBreathing + (activeBreathing - idleBreathing) * movementInertia;

      // ANIMATION: Body bob blends between walk and run
      const walkBob = 0.025;
      const runBob = 0.08;
      const bobAmount = walkBob + (runBob - walkBob) * sprintBlend;
      const bodyBob = Math.abs(Math.sin(t * 2)) * bobAmount * movementInertia;

      const jumpLiftBase = Math.sin(Math.min(1, jumpT) * Math.PI) * 0.08;
      const jumpLift = jumping ? jumpLiftBase * (1 + animationBoost * 0.35 + jumpBoost * 0.3) : 0;
      const crouch = -anticipate * 0.08;
      const settle = -landing * 0.06 * Math.sin((1 - landing) * Math.PI);

      // ANIMATION: Sway blends between walk and run
      const walkSway = 0.03;
      const runSway = 0.06;
      const swayAmount = walkSway + (runSway - walkSway) * sprintBlend;
      const sway = (isWalking || movementInertia > 0.01) ? Math.sin(t) * swayAmount * movementInertia : 0;

      // Sprint torso counter-rotation (opposite to legs for natural running motion)
      // ANIMATION: Smooth blend of twist
      const sprintTwist = Math.sin(t) * 0.22 * sprintBlend;

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

      // ANIMATION: Apply inertia to body position - blend between breathing and bobbing
      // bodyBob already includes movementInertia, so we blend breathing with bob
      const bodyVertical = breathing + bodyBob; // bodyBob fades to 0 as movementInertia decays
      bodyGroup.current.position.y = bodyVertical + jumpLift + crouch + settle + interactionCrouch;

      // ANIMATION: Forward lean blends smoothly between walk and run
      const walkLean = 0;
      const runLean = 0.42;
      const targetRotationX = walkLean + (runLean - walkLean) * sprintBlend;
      // Idle lean blends in as movement inertia fades out
      const idleLeanBase = Math.sin(state.clock.elapsedTime * 0.6) * 0.02;
      const idleLean = idleLeanBase * (1 - movementInertia);
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
      // ANIMATION: Head bob synced to footsteps - one bob per foot strike
      // abs(sin(t)) gives 2 peaks per full stride cycle (left foot + right foot)
      const walkHeadBob = 0.015;
      const runHeadBob = 0.01;
      const headBobAmount = walkHeadBob + (runHeadBob - walkHeadBob) * sprintBlend;
      const headBob = Math.abs(Math.sin(t)) * headBobAmount * movementInertia;

      // Counter body lean more during sprint for stable gaze
      const walkLagFactor = -0.2;
      const runLagFactor = -0.35;
      const lagFactor = walkLagFactor + (runLagFactor - walkLagFactor) * sprintBlend;
      const headLag = bodyGroup.current ? bodyGroup.current.rotation.x * lagFactor : 0;

      // ANIMATION: Head sway blends - subtle side-to-side matching stride
      const walkHeadSway = 0.025;
      const runHeadSway = 0.015;
      const headSwayAmount = walkHeadSway + (runHeadSway - walkHeadSway) * sprintBlend;
      const headSway = Math.sin(t) * headSwayAmount * movementInertia;

      // ANIMATION: Head anticipates turn direction (look-ahead)
      const headTurnAnticipation = turnPhase * 0.25 * turnDirection;

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
      // Include age-based head forward lean (elderly have head jutting forward)
      const ageHeadLean = agePosture.headForward;
      headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, headLag + headInteractionX + ageHeadLean, 0.15);
      // ANIMATION: Head turns toward new direction during pivots + gaze tracking
      // Combine gaze yaw with walking head turn (don't override!)
      headGroup.current.rotation.y = THREE.MathUtils.lerp(
        headGroup.current.rotation.y || 0,
        currentGazeYaw.current + headInteractionY + headTurnAnticipation,
        0.15
      );
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

    // PERFORMANCE: Only update blinking for NPCs close to camera (<25 units), always for player
    if (showFacialDetails || isPlayer) {
      const dt = state.clock.getDelta();
      if (!isBlinking.current) {
        blinkTimer.current += dt;
        if (blinkTimer.current > blinkCooldown.current) {
          isBlinking.current = true;
          blinkProgress.current = 0;
        }
      }
      if (isBlinking.current) {
        blinkProgress.current += dt * 12; // Faster blink (was 8)
        const phase = Math.min(1, blinkProgress.current);
        const blinkAmount = Math.sin(phase * Math.PI);

        // Move eyelids to close over the eye
        const upperMove = blinkAmount * 0.024; // Move down from top to center
        const lowerMove = blinkAmount * 0.024; // Move up from bottom to center
        const lidScale = 1 + blinkAmount * 4; // Expand to cover entire eye

        if (upperLidLeft.current) {
          upperLidLeft.current.position.y = eyeY + 0.024 - upperMove;
          upperLidLeft.current.scale.y = lidScale;
        }
        if (upperLidRight.current) {
          upperLidRight.current.position.y = eyeY + 0.024 - upperMove;
          upperLidRight.current.scale.y = lidScale;
        }
        if (lowerLidLeft.current) {
          lowerLidLeft.current.position.y = eyeY - 0.024 + lowerMove;
          lowerLidLeft.current.scale.y = lidScale;
        }
        if (lowerLidRight.current) {
          lowerLidRight.current.position.y = eyeY - 0.024 + lowerMove;
          lowerLidRight.current.scale.y = lidScale;
        }
        if (phase >= 1) {
          isBlinking.current = false;
          blinkTimer.current = 0;
          // Player: 5-10s between blinks, NPCs: 2.5-6.5s
          blinkCooldown.current = isPlayer ? 5 + Math.random() * 5 : 2.5 + Math.random() * 4;
        }
      } else {
        // Reset to resting position (eyes open)
        if (upperLidLeft.current) {
          upperLidLeft.current.position.y = eyeY + 0.024;
          upperLidLeft.current.scale.y = 1;
        }
        if (upperLidRight.current) {
          upperLidRight.current.position.y = eyeY + 0.024;
          upperLidRight.current.scale.y = 1;
        }
        if (lowerLidLeft.current) {
          lowerLidLeft.current.position.y = eyeY - 0.024;
          lowerLidLeft.current.scale.y = 1;
        }
        if (lowerLidRight.current) {
          lowerLidRight.current.position.y = eyeY - 0.024;
          lowerLidRight.current.scale.y = 1;
        }
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

  if (simpleLodActive) {
    return (
      <group ref={rootRef} scale={effectiveScale}>
        <mesh position={[0, 1.0, 0]} castShadow={castsFullShadow}>
          <cylinderGeometry args={[0.35, 0.45, 1.2, 8]} />
          <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
        </mesh>
        <mesh position={[0, 1.65, 0]} castShadow={castsFullShadow}>
          <sphereGeometry args={[0.26, 10, 8]} />
          <meshStandardMaterial color={sickHeadColor} roughness={skinRoughness} metalness={skinMetalness} />
        </mesh>
        {!castsFullShadow && (
          <mesh ref={shadowProxyRef} position={[0, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 1.7, 6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group ref={rootRef} scale={effectiveScale}>
      <group ref={bodyGroup}>
        {!castsFullShadow && (
          <mesh ref={shadowProxyRef} position={[0, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 1.7, 6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )}
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
              <coneGeometry args={[0.55 * femaleRobeSpread, 1.2, 8]} />
              <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
            </mesh>
            {motifMap && (
              <mesh position={[0, 1.05, 0.01]} castShadow>
                <coneGeometry args={[0.56 * femaleRobeSpread, 1.19, 8]} />
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
              <cylinderGeometry args={[0.22, 0.28, 0.35, 8]} />
              <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
            </mesh>
            {/* Collar neckline - round neck opening with decorative band */}
            <mesh position={[0, 1.50, 0.08]} castShadow>
              <torusGeometry args={[0.14, 0.025, 8, 16]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.82} />
            </mesh>
            {/* Inner collar band - suggests modest layering */}
            <mesh position={[0, 1.48, 0.04]} castShadow>
              <cylinderGeometry args={[0.13, 0.14, 0.06, 8]} />
              <meshStandardMaterial color={clothFoldColor} roughness={clothRoughness} />
            </mesh>
            {/* Embroidered collar detail - for wealthier characters */}
            {hasEmbroidery && (
              <>
                <mesh position={[0.08, 1.48, 0.08]} castShadow>
                  <sphereGeometry args={[0.012, 6, 6]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.7} />
                </mesh>
                <mesh position={[-0.08, 1.48, 0.08]} castShadow>
                  <sphereGeometry args={[0.012, 6, 6]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.7} />
                </mesh>
              </>
            )}
            <mesh position={[0, 1.05, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.7, 8]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            {robeOverwrap && (
              <mesh position={[0, 1.05, 0.08]} castShadow>
                <coneGeometry args={[0.62 * femaleRobeSpread, 1.05, 8]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            <mesh position={[0, 1.18, -0.12]} castShadow>
              <boxGeometry args={[0.5, 0.2, 0.16]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <coneGeometry args={[0.75 * femaleRobeSpread, 0.9, 8]} />
              <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.78 * femaleRobeSpread, 0.78 * femaleRobeSpread, 0.1, 8]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            <mesh position={[0, 0.25, -0.18]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.04]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
            {robeHasSash && (
              <mesh position={[0, 0.95, 0]} castShadow>
                <torusGeometry args={[0.38 * femaleRobeSpread, 0.035, 6, 12]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} map={sashMap ?? undefined} />
              </mesh>
            )}
            {femaleRobeBand && (
              <mesh position={[0, 1.35, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 0.1, 8]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            {robeHasTrim && (
              <mesh ref={trimFrontRef} position={[0, 0.7, 0.2]} castShadow>
                <boxGeometry args={[0.08, 0.7, 0.02]} />
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
              </mesh>
            )}
            <mesh position={[-0.22, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0.22, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
            </mesh>
            <group ref={leftArm} position={[-0.26, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial
                color={upperArmColor}
                roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
              />
              </mesh>
              {/* Upper arm band - decorative stripe */}
              {sleeveCoverage === 'full' && robeHasTrim && (
                <mesh position={[0, 0.08, 0]} castShadow>
                  <cylinderGeometry args={[0.058, 0.058, 0.025, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
            <group ref={leftForearm} position={[0, -0.18, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.048, 8, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.11, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.042, 0.22, 8]} />
                <meshStandardMaterial
                  color={lowerArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Sleeve cuff - decorative band at wrist */}
              {sleeveCoverage !== 'none' && (
                <mesh position={[0, -0.19, 0]} castShadow>
                  <cylinderGeometry args={[0.052, 0.055, 0.04, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.24, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.035, 0.08, 0.065]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                <mesh position={[0.01, 0.01, 0.04]} rotation={[0, 0, 0.4]} castShadow>
                  <capsuleGeometry args={[0.018, 0.035, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                {/* Henna pattern on left hand */}
                {cosmeticEffects?.hasHenna && (
                  <>
                    {/* Back of hand central medallion */}
                    <mesh position={[0, 0, -0.034]} rotation={[0.1, 0, 0]}>
                      <circleGeometry args={[0.018, 8]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    {/* Radiating lines from medallion */}
                    <mesh position={[0, 0.025, -0.034]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.006, 0.03]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, -0.025, -0.034]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.006, 0.03]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0.015, 0, -0.034]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.006, 0.02]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[-0.015, 0, -0.034]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.006, 0.02]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    {/* Finger tip dots */}
                    <mesh position={[0, 0.042, -0.034]}>
                      <circleGeometry args={[0.005, 6]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                  </>
                )}
              </group>
            </group>
            </group>
            <group ref={rightArm} position={[0.26, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial
                color={upperArmColor}
                roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
              />
              </mesh>
              {/* Upper arm band - decorative stripe */}
              {sleeveCoverage === 'full' && robeHasTrim && (
                <mesh position={[0, 0.08, 0]} castShadow>
                  <cylinderGeometry args={[0.058, 0.058, 0.025, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
            <group ref={rightForearm} position={[0, -0.18, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.048, 8, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.11, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.042, 0.22, 8]} />
                <meshStandardMaterial
                  color={lowerArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Sleeve cuff - decorative band at wrist */}
              {sleeveCoverage !== 'none' && (
                <mesh position={[0, -0.19, 0]} castShadow>
                  <cylinderGeometry args={[0.052, 0.055, 0.04, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.24, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.035, 0.08, 0.065]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                <mesh position={[-0.01, 0.01, 0.04]} rotation={[0, 0, -0.4]} castShadow>
                  <capsuleGeometry args={[0.018, 0.035, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                {/* Henna pattern on right hand */}
                {cosmeticEffects?.hasHenna && (
                  <>
                    {/* Back of hand central medallion */}
                    <mesh position={[0, 0, -0.034]} rotation={[0.1, 0, 0]}>
                      <circleGeometry args={[0.018, 8]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    {/* Radiating lines from medallion */}
                    <mesh position={[0, 0.025, -0.034]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.006, 0.03]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, -0.025, -0.034]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.006, 0.03]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0.015, 0, -0.034]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.006, 0.02]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[-0.015, 0, -0.034]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.006, 0.02]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    {/* Finger tip dots */}
                    <mesh position={[0, 0.042, -0.034]}>
                      <circleGeometry args={[0.005, 6]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                  </>
                )}
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
              <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
            </mesh>
            {/* Collar neckline - v-neck opening typical of thawb/qamis */}
            <mesh position={[-0.05, 1.46, 0.18]} rotation={[0.35, 0.2, 0.12]} castShadow>
              <boxGeometry args={[0.08, 0.18, 0.02]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
            </mesh>
            <mesh position={[0.05, 1.46, 0.18]} rotation={[0.35, -0.2, -0.12]} castShadow>
              <boxGeometry args={[0.08, 0.18, 0.02]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
            </mesh>
            {/* Collar band - simple band at base of neck */}
            <mesh position={[0, 1.52, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.17, 0.045, 8]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.88} />
            </mesh>
            {/* Tiraz-style embroidered band for wealthier characters */}
            {hasEmbroidery && (
              <mesh position={[0, 1.50, 0.01]} castShadow>
                <cylinderGeometry args={[0.155, 0.16, 0.02, 8]} />
                <meshStandardMaterial color={headwearHighlight} roughness={0.75} />
              </mesh>
            )}
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
                <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
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

        {/* Worn inventory items - rendered at attachment points */}
        {visibleItems && visibleItems.length > 0 && !simpleLodActive && (
          <group>
            {visibleItems.map((itemName, idx) => {
              const config = getWornItemConfig(itemName);
              if (!config) return null;

              // Determine attachment position based on type
              let attachPosition: [number, number, number];
              switch (config.attachment) {
                case 'belt_left':
                  attachPosition = [-0.25 + config.offset[0], 0.85 + config.offset[1], 0.15 + config.offset[2]];
                  break;
                case 'belt_right':
                  attachPosition = [0.25 + config.offset[0], 0.85 + config.offset[1], 0.15 + config.offset[2]];
                  break;
                case 'belt_back':
                  attachPosition = [config.offset[0], 0.9 + config.offset[1], -0.2 + config.offset[2]];
                  break;
                case 'shoulder':
                  attachPosition = [0.3 + config.offset[0], 1.3 + config.offset[1], config.offset[2]];
                  break;
                case 'neck':
                  attachPosition = [config.offset[0], 1.45 + config.offset[1], config.offset[2]];
                  break;
                case 'hand_left':
                  attachPosition = [-0.4 + config.offset[0], 1.0 + config.offset[1], 0.2 + config.offset[2]];
                  break;
                default:
                  attachPosition = [0, 0.9, 0.1];
              }

              return (
                <group
                  key={`worn-${idx}-${itemName}`}
                  position={attachPosition}
                  rotation={config.rotation}
                >
                  <WornItemMesh type={config.type} scale={config.scale} />
                </group>
              );
            })}
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
        {/* Neck - properly connects head to shoulders */}
        <mesh position={[0, 1.58, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 0.24, 10]} />
          <meshStandardMaterial color={sickHeadColor} roughness={skinRoughness} metalness={skinMetalness} />
        </mesh>
        {/* Collar/neckline */}
        <mesh position={[0, 1.47, 0]} castShadow>
          <torusGeometry args={[0.14, 0.035, 8, 16]} />
          <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
        </mesh>
        
        {/* Head */}
        <group ref={headGroup} position={[0, 1.75, 0]}>
          {/* Cranium - randomized shape for variety */}
          <mesh castShadow scale={[
            0.95 * faceVariant.craniumWidth,
            1.1 * faceVariant.craniumHeight,
            0.9 * faceVariant.craniumDepth
          ]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
          </mesh>
          {/* Face - follows cranium width with individual variation */}
          <mesh position={[0, 0.0, 0.085]} scale={[
            1.05 * faceVariant.craniumWidth * faceVariant.faceWidthRatio,
            1.05,
            0.45
          ]} castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
          </mesh>
          {/* Ears - visible unless covered by headwear */}
          {(headwearStyle === 'none' || headwearStyle === 'cap' || headwearStyle === 'fez' || headwearStyle === 'straw' || headwearStyle === 'taqiyah') && (
            <>
              {/* Left ear */}
              <group position={[-0.19, -0.02, 0.02]} rotation={[0, -0.3, 0]}>
                {/* Outer ear structure */}
                <mesh castShadow>
                  <sphereGeometry args={[0.04, 10, 10, 0, Math.PI]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
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
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
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
          {/* Hair - Redesigned with complete coverage */}
          {headwearStyle === 'none' && hairStyle !== 'covered' && (
            <group
              scale={[
                0.95 * faceVariant.craniumWidth,
                1.1 * faceVariant.craniumHeight,
                0.9 * faceVariant.craniumDepth
              ]}
            >
              {/* === LOW LOD (>35 units) - Simple solid shapes === */}
              {hairLOD === 'low' && (
                <>
                  {/* Main hair cap - covers top and back of head completely */}
                  <mesh position={[0, 0.04, -0.06]} rotation={[-0.2, 0, 0]} castShadow>
                    <sphereGeometry args={[0.19, 8, 6]} />
                    <meshStandardMaterial color={hairColor} roughness={0.9} />
                  </mesh>
                  {/* Back of head coverage - ensures no bald spots */}
                  <mesh position={[0, -0.02, -0.12]} castShadow>
                    <sphereGeometry args={[0.14, 6, 5]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.9} />
                  </mesh>
                  {hairStyle === 'short' && (
                    <>
                      {/* Short hair - extra scalp coverage at distance */}
                      <mesh position={[0, 0.05, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.165, 6, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} roughness={0.92} />
                      </mesh>
                      {/* Nape hint */}
                      <mesh position={[0, -0.03, -0.11]} castShadow>
                        <capsuleGeometry args={[0.05, 0.06, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} />
                      </mesh>
                    </>
                  )}
                  {hairStyle === 'medium' && (
                    <>
                      {/* Medium hair - crown hint */}
                      <mesh position={[0, 0.05, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.165, 6, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} roughness={0.9} />
                      </mesh>
                      {/* Back hair */}
                      <mesh position={[0, -0.09, -0.11]} rotation={[0.12, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.055, 0.12, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} />
                      </mesh>
                      {/* Side hints */}
                      <mesh position={[-0.09, -0.06, 0.0]} rotation={[0.08, 0.12, 0.08]} castShadow>
                        <capsuleGeometry args={[0.03, 0.10, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} />
                      </mesh>
                      <mesh position={[0.09, -0.06, 0.0]} rotation={[0.08, -0.12, -0.08]} castShadow>
                        <capsuleGeometry args={[0.03, 0.10, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} />
                      </mesh>
                    </>
                  )}
                  {hairStyle === 'long' && (
                    <>
                      {/* Extra crown volume at distance */}
                      <mesh position={[0, 0.07, -0.04]} rotation={[-0.1, 0, 0]} castShadow>
                        <sphereGeometry args={[0.16, 6, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.95)} roughness={0.9} />
                      </mesh>
                      {/* Long hair flowing down back - larger */}
                      <mesh position={[0, -0.18, -0.09]} rotation={[0.15, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.10, 0.34, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} />
                      </mesh>
                      {/* Side strands visible even at distance */}
                      <mesh position={[-0.10, -0.10, 0.01]} rotation={[0.1, 0.15, 0.08]} castShadow>
                        <capsuleGeometry args={[0.04, 0.22, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.9} />
                      </mesh>
                      <mesh position={[0.10, -0.10, 0.01]} rotation={[0.1, -0.15, -0.08]} castShadow>
                        <capsuleGeometry args={[0.04, 0.22, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.9} />
                      </mesh>
                    </>
                  )}
                </>
              )}

              {/* === MEDIUM LOD (15-35 units) === */}
              {hairLOD === 'medium' && (
                <>
                  {/* Main hair cap - full coverage */}
                  <mesh position={[0, 0.05, -0.05]} rotation={[-0.15, 0, 0]} castShadow>
                    <sphereGeometry args={[0.185, 10, 8]} />
                    <meshStandardMaterial color={hairColor} roughness={0.88} map={hairTexture} />
                  </mesh>
                  {/* Back coverage layer */}
                  <mesh position={[0, -0.01, -0.11]} castShadow>
                    <sphereGeometry args={[0.145, 8, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.9} map={hairTexture} />
                  </mesh>
                  {/* Side coverage - left */}
                  <mesh position={[-0.14, 0.0, -0.02]} rotation={[0, 0.2, 0.1]} castShadow>
                    <capsuleGeometry args={[0.04, 0.10, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} map={hairTexture} />
                  </mesh>
                  {/* Side coverage - right */}
                  <mesh position={[0.14, 0.0, -0.02]} rotation={[0, -0.2, -0.1]} castShadow>
                    <capsuleGeometry args={[0.04, 0.10, 4, 6]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} map={hairTexture} />
                  </mesh>
                  {/* Hairline framing face */}
                  <mesh position={[0, 0.12, 0.08]} rotation={[0.7, 0, 0]} castShadow>
                    <torusGeometry args={[0.10, 0.025, 6, 12, Math.PI]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} map={hairTexture} />
                  </mesh>
                  {hairStyle === 'short' && (
                    <>
                      {/* Short hair - tighter scalp coverage */}
                      <mesh position={[0, 0.05, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.17, 8, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} roughness={0.92} map={hairTexture} />
                      </mesh>
                      {/* Temple/sideburn - left */}
                      <mesh position={[-0.14, -0.02, 0.02]} rotation={[0.05, 0.12, 0.06]} castShadow>
                        <capsuleGeometry args={[0.032, 0.08, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Temple/sideburn - right */}
                      <mesh position={[0.14, -0.02, 0.02]} rotation={[0.05, -0.12, -0.06]} castShadow>
                        <capsuleGeometry args={[0.032, 0.08, 3, 5]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Nape coverage */}
                      <mesh position={[0, -0.04, -0.11]} castShadow>
                        <capsuleGeometry args={[0.055, 0.08, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} map={hairTexture} />
                      </mesh>
                    </>
                  )}
                  {hairStyle === 'medium' && (
                    <>
                      {/* Medium hair - crown volume */}
                      <mesh position={[0, 0.06, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.175, 8, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.93)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Side strands - left */}
                      <mesh position={[-0.11, -0.08, 0.0]} rotation={[0.1, 0.15, 0.10]} castShadow>
                        <capsuleGeometry args={[0.038, 0.16, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Side strands - right */}
                      <mesh position={[0.11, -0.08, 0.0]} rotation={[0.1, -0.15, -0.10]} castShadow>
                        <capsuleGeometry args={[0.038, 0.16, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Back hair mass */}
                      <mesh position={[0, -0.10, -0.11]} rotation={[0.12, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.065, 0.14, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} roughness={0.9} map={hairTexture} />
                      </mesh>
                    </>
                  )}
                  {hairStyle === 'long' && (
                    <>
                      {/* Extra crown volume for long hair */}
                      <mesh position={[0, 0.08, -0.04]} rotation={[-0.1, 0, 0]} castShadow>
                        <sphereGeometry args={[0.17, 8, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} roughness={0.86} map={hairTexture} />
                      </mesh>
                      {/* Face-framing strands - left */}
                      <mesh position={[-0.13, -0.04, 0.03]} rotation={[0.12, 0.25, 0.10]} castShadow>
                        <capsuleGeometry args={[0.05, 0.28, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Face-framing strands - right */}
                      <mesh position={[0.13, -0.04, 0.03]} rotation={[0.12, -0.25, -0.10]} castShadow>
                        <capsuleGeometry args={[0.05, 0.28, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Long flowing hair - main back mass */}
                      <mesh position={[0, -0.18, -0.09]} rotation={[0.14, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.10, 0.36, 5, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Side strands - shoulder length */}
                      <mesh position={[-0.10, -0.15, -0.02]} rotation={[0.08, 0.12, 0.08]} castShadow>
                        <capsuleGeometry args={[0.045, 0.30, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      <mesh position={[0.10, -0.15, -0.02]} rotation={[0.08, -0.12, -0.08]} castShadow>
                        <capsuleGeometry args={[0.045, 0.30, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>
                    </>
                  )}
                </>
              )}

              {/* === HIGH LOD (<15 units) - Full detail === */}
              {hairLOD === 'high' && (
                <>
                  {/* Base layer - dark undercoat covering entire scalp */}
                  <mesh position={[0, 0.04, -0.05]} rotation={[-0.1, 0, 0]} castShadow>
                    <sphereGeometry args={[0.18, 12, 10]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.8)} roughness={0.92} />
                  </mesh>
                  {/* Main hair volume - slightly offset for depth */}
                  <mesh position={[0, 0.055, -0.04]} rotation={[-0.12, 0, 0]} castShadow>
                    <sphereGeometry args={[0.185, 12, 10]} />
                    <meshStandardMaterial color={hairColor} map={hairTexture} roughness={0.88} />
                  </mesh>
                  {/* Back of skull coverage */}
                  <mesh position={[0, 0.0, -0.10]} castShadow>
                    <sphereGeometry args={[0.15, 10, 8]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} map={hairTexture} />
                  </mesh>
                  {/* Side temple coverage - left */}
                  <mesh position={[-0.145, 0.02, 0.0]} rotation={[0, 0.25, 0.08]} castShadow>
                    <capsuleGeometry args={[0.042, 0.10, 5, 8]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.88} map={hairTexture} />
                  </mesh>
                  {/* Side temple coverage - right */}
                  <mesh position={[0.145, 0.02, 0.0]} rotation={[0, -0.25, -0.08]} castShadow>
                    <capsuleGeometry args={[0.042, 0.10, 5, 8]} />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.9)} roughness={0.88} map={hairTexture} />
                  </mesh>
                  {/* Hairline definition - frames the face */}
                  <mesh
                    position={[
                      0,
                      faceVariant.hairlineVariant === 'receded' ? 0.125 : 0.115,
                      faceVariant.hairlineVariant === 'receded' ? 0.06 : 0.075
                    ]}
                    rotation={[0.65, 0, 0]}
                    castShadow
                  >
                    <torusGeometry
                      args={[
                        faceVariant.hairlineVariant === 'receded' ? 0.085 : 0.098,
                        0.028,
                        6,
                        14,
                        Math.PI
                      ]}
                    />
                    <meshStandardMaterial color={adjustColor(hairColor, 0.85)} roughness={0.9} map={hairTexture} />
                  </mesh>
                  {faceVariant.hairlineVariant === 'widow' && (
                    <mesh position={[0, 0.105, 0.085]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                      <coneGeometry args={[0.02, 0.04, 8]} />
                      <meshStandardMaterial color={adjustColor(hairColor, 0.85)} roughness={0.9} />
                    </mesh>
                  )}

                  {/* Short hair style - close cropped masculine */}
                  {hairStyle === 'short' && (
                    <>
                      {/* Tighter scalp coverage - hugs head more */}
                      <mesh position={[0, 0.06, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.175, 10, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.94)} roughness={0.92} map={hairTexture} />
                      </mesh>
                      {/* Temple/sideburn coverage - LEFT */}
                      <mesh position={[-0.15, -0.02, 0.02]} rotation={[0.05, 0.15, 0.08]} castShadow>
                        <capsuleGeometry args={[0.035, 0.10, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Temple/sideburn coverage - RIGHT */}
                      <mesh position={[0.15, -0.02, 0.02]} rotation={[0.05, -0.15, -0.08]} castShadow>
                        <capsuleGeometry args={[0.035, 0.10, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Nape coverage - larger */}
                      <mesh position={[0, -0.05, -0.12]} castShadow>
                        <capsuleGeometry args={[0.065, 0.10, 5, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.92} map={hairTexture} />
                      </mesh>
                      {/* Back of head fill */}
                      <mesh position={[0, -0.01, -0.11]} castShadow>
                        <sphereGeometry args={[0.12, 8, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.9} map={hairTexture} />
                      </mesh>
                    </>
                  )}

                  {/* Medium hair - fuller masculine style */}
                  {hairStyle === 'medium' && (
                    <>
                      {/* Extra crown volume - not as much as long hair */}
                      <mesh position={[0, 0.07, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.18, 10, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.93)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Back hair mass - fuller */}
                      <mesh position={[0, -0.10, -0.10]} rotation={[0.12, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.075, 0.18, 5, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Side strands - LEFT - slightly forward */}
                      <mesh position={[-0.12, -0.06, 0.01]} rotation={[0.08, 0.18, 0.10]} castShadow>
                        <capsuleGeometry args={[0.042, 0.20, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Side strands - RIGHT - slightly forward */}
                      <mesh position={[0.12, -0.06, 0.01]} rotation={[0.08, -0.18, -0.10]} castShadow>
                        <capsuleGeometry args={[0.042, 0.20, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Nape/back fill */}
                      <mesh position={[0, -0.04, -0.12]} rotation={[0.1, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.06, 0.12, 4, 6]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.9} map={hairTexture} />
                      </mesh>
                    </>
                  )}

                  {/* Long hair - full feminine flowing style */}
                  {hairStyle === 'long' && (
                    <>
                      {/* Extra crown volume - fuller on top */}
                      <mesh position={[0, 0.08, -0.04]} rotation={[-0.08, 0, 0]} castShadow>
                        <sphereGeometry args={[0.19, 12, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.86} map={hairTexture} />
                      </mesh>
                      {/* Crown highlight layer - adds height */}
                      <mesh position={[0, 0.10, -0.05]} rotation={[-0.1, 0, 0]} castShadow>
                        <sphereGeometry args={[0.16, 10, 8]} />
                        <meshStandardMaterial color={hairColor} roughness={0.85} map={hairTexture} />
                      </mesh>

                      {/* Face-framing strands - LEFT - comes forward around cheek */}
                      <mesh position={[-0.14, -0.02, 0.04]} rotation={[0.15, 0.3, 0.12]} castShadow>
                        <capsuleGeometry args={[0.055, 0.32, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.86} map={hairTexture} />
                      </mesh>
                      {/* Face-framing inner strand - LEFT */}
                      <mesh position={[-0.10, 0.0, 0.06]} rotation={[0.12, 0.25, 0.08]} castShadow>
                        <capsuleGeometry args={[0.04, 0.28, 4, 8]} />
                        <meshStandardMaterial color={hairColor} roughness={0.88} map={hairTexture} />
                      </mesh>

                      {/* Face-framing strands - RIGHT - comes forward around cheek */}
                      <mesh position={[0.14, -0.02, 0.04]} rotation={[0.15, -0.3, -0.12]} castShadow>
                        <capsuleGeometry args={[0.055, 0.32, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.92)} roughness={0.86} map={hairTexture} />
                      </mesh>
                      {/* Face-framing inner strand - RIGHT */}
                      <mesh position={[0.10, 0.0, 0.06]} rotation={[0.12, -0.25, -0.08]} castShadow>
                        <capsuleGeometry args={[0.04, 0.28, 4, 8]} />
                        <meshStandardMaterial color={hairColor} roughness={0.88} map={hairTexture} />
                      </mesh>

                      {/* Main back mass - wide and flowing to shoulders */}
                      <mesh position={[0, -0.18, -0.08]} rotation={[0.14, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.11, 0.40, 6, 12]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.84)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Back hair layer 2 - adds depth */}
                      <mesh position={[0, -0.14, -0.10]} rotation={[0.10, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.09, 0.36, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.88)} roughness={0.88} map={hairTexture} />
                      </mesh>

                      {/* Side flowing strands - LEFT (shoulder length) */}
                      <mesh position={[-0.12, -0.16, -0.02]} rotation={[0.08, 0.15, 0.10]} castShadow>
                        <capsuleGeometry args={[0.05, 0.36, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>
                      {/* Side flowing strands - RIGHT (shoulder length) */}
                      <mesh position={[0.12, -0.16, -0.02]} rotation={[0.08, -0.15, -0.10]} castShadow>
                        <capsuleGeometry args={[0.05, 0.36, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.90)} roughness={0.88} map={hairTexture} />
                      </mesh>

                      {/* Additional fullness strands - back left */}
                      <mesh position={[-0.07, -0.15, -0.10]} rotation={[0.12, 0.08, 0.05]} castShadow>
                        <capsuleGeometry args={[0.045, 0.34, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} roughness={0.9} map={hairTexture} />
                      </mesh>
                      {/* Additional fullness strands - back right */}
                      <mesh position={[0.07, -0.15, -0.10]} rotation={[0.12, -0.08, -0.05]} castShadow>
                        <capsuleGeometry args={[0.045, 0.34, 4, 8]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.86)} roughness={0.9} map={hairTexture} />
                      </mesh>

                      {/* Upper back coverage - fills gap between scalp and flowing hair */}
                      <mesh position={[0, -0.04, -0.12]} rotation={[0.1, 0, 0]} castShadow>
                        <capsuleGeometry args={[0.08, 0.18, 5, 10]} />
                        <meshStandardMaterial color={adjustColor(hairColor, 0.87)} roughness={0.9} map={hairTexture} />
                      </mesh>
                    </>
                  )}
                </>
              )}
            </group>
          )}
          {/* PERFORMANCE: Facial details only rendered for NPCs within 25 units, always for player */}
          {(showFacialDetails || isPlayer) && (
            <>
              {/* Eyebrows - Natural curved with taper */}
              {(() => {
                // Gender-specific base thickness - increased for strong prominence
                const baseBrowThickness = isFemale ? 0.0052 : 0.0062;
                const innerThickness = baseBrowThickness * 1.3; // Thicker near nose
                const middleThickness = baseBrowThickness;
                const outerThickness = baseBrowThickness * 0.8; // Thinner at tail
                const archHeight = isFemale ? 0.003 : 0.002; // More arch for female

                return (
                  <>
                    {/* Left eyebrow - 3-part curved with natural taper */}
                    <group ref={leftBrowRef} position={[-browX, browY, 0.165]} rotation={[0, 0, isFemale ? -0.1 : -0.08]}>
                      {/* Inner segment (near nose) - thickest and longer */}
                      <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[innerThickness, 0.034, 4, 8]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>

                      {/* Middle segment (arch peak) - medium thickness, raised, longer */}
                      <mesh position={[0, archHeight, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[middleThickness, 0.036, 4, 8]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>

                      {/* Outer segment (tail) - thinnest, tapered, longer */}
                      <mesh position={[-0.014, archHeight * 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[outerThickness, 0.032, 4, 6]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>
                    </group>

                    {/* Right eyebrow - 3-part curved with natural taper */}
                    <group ref={rightBrowRef} position={[browX, browY, 0.165]} rotation={[0, 0, isFemale ? 0.1 : 0.08]}>
                      {/* Inner segment (near nose) - thickest and longer */}
                      <mesh position={[-0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[innerThickness, 0.034, 4, 8]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>

                      {/* Middle segment (arch peak) - medium thickness, raised, longer */}
                      <mesh position={[0, archHeight, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[middleThickness, 0.036, 4, 8]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>

                      {/* Outer segment (tail) - thinnest, tapered, longer */}
                      <mesh position={[0.014, archHeight * 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <capsuleGeometry args={[outerThickness, 0.032, 4, 6]} />
                        <meshStandardMaterial color={browColor} roughness={1} />
                      </mesh>
                    </group>
                  </>
                );
              })()}
              {/* === EYES - Toggle between old flat (USE_3D_EYES=false) and new 3D (USE_3D_EYES=true) === */}
              {!USE_3D_EYES ? (
                // IMPROVED REALISTIC EYES (flat, no curvature)
                <>
                  {/* === LEFT EYE WHITE - Almond-shaped flat circle === */}
                  <mesh position={[-faceVariant.eyeSpacing, eyeY, 0.16]} scale={[1, 0.95, 1]} castShadow>
                    <circleGeometry args={[0.024, 20]} />
                    <meshStandardMaterial
                      color="#f8f5f0"
                      roughness={0.35}
                      metalness={0.02}
                    />
                  </mesh>

                  {/* === RIGHT EYE WHITE - Almond-shaped flat circle === */}
                  <mesh position={[faceVariant.eyeSpacing, eyeY, 0.16]} scale={[1, 0.95, 1]} castShadow>
                    <circleGeometry args={[0.024, 20]} />
                    <meshStandardMaterial
                      color="#f8f5f0"
                      roughness={0.35}
                      metalness={0.02}
                    />
                  </mesh>

                  {/* === LEFT IRIS & PUPIL (gaze tracking) === */}
                  <group ref={leftEye} position={[-faceVariant.eyeSpacing, eyeY + 0.010, 0.162]}>
                    {/* Iris outer ring - darker limbus for depth (BIGGER) */}
                    <mesh position={[0, 0, 0.001]}>
                      <ringGeometry args={[0.0135, 0.0145, 24]} />
                      <meshStandardMaterial
                        color={new THREE.Color(eyeColor).multiplyScalar(0.65).getStyle()}
                        roughness={0.6}
                      />
                    </mesh>
                    {/* Iris main color - circular (BIGGER - 56% of eye width) */}
                    <mesh position={[0, 0, 0.002]} castShadow>
                      <circleGeometry args={[0.014, 24]} />
                      <meshStandardMaterial color={eyeColor} roughness={0.5} />
                    </mesh>
                    {/* Iris inner variation - lighter center ring for depth */}
                    <mesh position={[0, 0, 0.003]}>
                      <ringGeometry args={[0.006, 0.009, 20]} />
                      <meshStandardMaterial
                        color={new THREE.Color(eyeColor).multiplyScalar(1.15).getStyle()}
                        roughness={0.45}
                        transparent
                        opacity={0.6}
                      />
                    </mesh>
                    {/* Pupil - circular, properly sized (47% of iris) */}
                    <mesh position={[0, 0, 0.004]} castShadow>
                      <circleGeometry args={[0.0065, 20]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={0.2} />
                    </mesh>
                    {/* Highlight for wetness - circular bright spot */}
                    <mesh position={[0.004, 0.005, 0.006]}>
                      <circleGeometry args={[0.002, 8]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.85} transparent />
                    </mesh>
                    {/* Secondary highlight - smaller, dimmer */}
                    <mesh position={[-0.003, -0.004, 0.0055]}>
                      <circleGeometry args={[0.0012, 6]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.4} transparent />
                    </mesh>
                  </group>

                  {/* === RIGHT IRIS & PUPIL (gaze tracking) === */}
                  <group ref={rightEye} position={[faceVariant.eyeSpacing, eyeY + 0.010, 0.162]}>
                    {/* Iris outer ring - darker limbus for depth (BIGGER) */}
                    <mesh position={[0, 0, 0.001]}>
                      <ringGeometry args={[0.0135, 0.0145, 24]} />
                      <meshStandardMaterial
                        color={new THREE.Color(eyeColor).multiplyScalar(0.65).getStyle()}
                        roughness={0.6}
                      />
                    </mesh>
                    {/* Iris main color - circular (BIGGER - 56% of eye width) */}
                    <mesh position={[0, 0, 0.002]} castShadow>
                      <circleGeometry args={[0.014, 24]} />
                      <meshStandardMaterial color={eyeColor} roughness={0.5} />
                    </mesh>
                    {/* Iris inner variation - lighter center ring for depth */}
                    <mesh position={[0, 0, 0.003]}>
                      <ringGeometry args={[0.006, 0.009, 20]} />
                      <meshStandardMaterial
                        color={new THREE.Color(eyeColor).multiplyScalar(1.15).getStyle()}
                        roughness={0.45}
                        transparent
                        opacity={0.6}
                      />
                    </mesh>
                    {/* Pupil - circular, properly sized (47% of iris) */}
                    <mesh position={[0, 0, 0.004]} castShadow>
                      <circleGeometry args={[0.0065, 20]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={0.2} />
                    </mesh>
                    {/* Highlight for wetness - circular bright spot */}
                    <mesh position={[0.004, 0.005, 0.006]}>
                      <circleGeometry args={[0.002, 8]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.85} transparent />
                    </mesh>
                    {/* Secondary highlight - smaller, dimmer */}
                    <mesh position={[-0.003, -0.004, 0.0055]}>
                      <circleGeometry args={[0.0012, 6]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.4} transparent />
                    </mesh>
                  </group>
                </>
              ) : (
                // NEW 3D EYEBALLS (realistic - recessed into eye sockets, wrapped by lids)
                <>
                  {/* Left eye socket - recessed cavity with shadow */}
                  <mesh position={[-faceVariant.eyeSpacing, eyeY, 0.165]} castShadow>
                    <sphereGeometry args={[0.028, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                    <meshStandardMaterial
                      color={faceShadowColor}
                      roughness={0.95}
                    />
                  </mesh>

                  {/* Right eye socket - recessed cavity with shadow */}
                  <mesh position={[faceVariant.eyeSpacing, eyeY, 0.165]} castShadow>
                    <sphereGeometry args={[0.028, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                    <meshStandardMaterial
                      color={faceShadowColor}
                      roughness={0.95}
                    />
                  </mesh>

                  {/* Left eye - 3D eyeball RECESSED into socket with gaze tracking */}
                  <group ref={leftEye} position={[-faceVariant.eyeSpacing, eyeY, 0.17]}>
                    {/* Eyeball hemisphere - sclera (white), only front half visible */}
                    <mesh castShadow>
                      <sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                      <meshStandardMaterial
                        color="#f8f5f0"
                        roughness={0.3}
                        metalness={0.05}
                      />
                    </mesh>

                    {/* Iris - colored circle on eyeball surface */}
                    <mesh position={[0, 0, 0.020]}>
                      <circleGeometry args={[0.009, 20]} />
                      <meshStandardMaterial
                        color={eyeColor}
                        roughness={0.4}
                      />
                    </mesh>

                    {/* Pupil - black center */}
                    <mesh position={[0, 0, 0.021]}>
                      <circleGeometry args={[0.0038, 16]} />
                      <meshStandardMaterial
                        color="#0a0a0a"
                        roughness={0.2}
                      />
                    </mesh>

                    {/* Corneal bulge - transparent dome for wet/glassy look */}
                    <mesh position={[0, 0, 0.012]}>
                      <sphereGeometry args={[0.0128, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
                      <meshPhysicalMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.12}
                        roughness={0.05}
                        metalness={0.0}
                        clearcoat={0.9}
                        clearcoatRoughness={0.05}
                        transmission={0.1}
                      />
                    </mesh>

                    {/* Specular highlight - tiny bright spot for wetness */}
                    <mesh position={[0.005, 0.007, 0.023]}>
                      <circleGeometry args={[0.0022, 8]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.85} transparent />
                    </mesh>
                  </group>

                  {/* Right eye - 3D eyeball RECESSED into socket with gaze tracking */}
                  <group ref={rightEye} position={[faceVariant.eyeSpacing, eyeY, 0.17]}>
                    {/* Eyeball hemisphere - sclera (white), only front half visible */}
                    <mesh castShadow>
                      <sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                      <meshStandardMaterial
                        color="#f8f5f0"
                        roughness={0.3}
                        metalness={0.05}
                      />
                    </mesh>

                    {/* Iris - colored circle on eyeball surface */}
                    <mesh position={[0, 0, 0.020]}>
                      <circleGeometry args={[0.009, 20]} />
                      <meshStandardMaterial
                        color={eyeColor}
                        roughness={0.4}
                      />
                    </mesh>

                    {/* Pupil - black center */}
                    <mesh position={[0, 0, 0.021]}>
                      <circleGeometry args={[0.0038, 16]} />
                      <meshStandardMaterial
                        color="#0a0a0a"
                        roughness={0.2}
                      />
                    </mesh>

                    {/* Corneal bulge - transparent dome for wet/glassy look */}
                    <mesh position={[0, 0, 0.012]}>
                      <sphereGeometry args={[0.0128, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
                      <meshPhysicalMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.12}
                        roughness={0.05}
                        metalness={0.0}
                        clearcoat={0.9}
                        clearcoatRoughness={0.05}
                        transmission={0.1}
                      />
                    </mesh>

                    {/* Specular highlight - tiny bright spot for wetness */}
                    <mesh position={[0.005, 0.007, 0.023]}>
                      <circleGeometry args={[0.0022, 8]} />
                      <meshBasicMaterial color="#ffffff" opacity={0.85} transparent />
                    </mesh>
                  </group>
                </>
              )}
              {/* Eyelids - flat, positioned around flat eyes */}
              {!USE_3D_EYES ? (
                // Flat eyelids for flat eyes
                <>
                  {/* Upper left eyelid - positioned at top of eye */}
                  <mesh
                    ref={upperLidLeft}
                    position={[-faceVariant.eyeSpacing, eyeY + 0.024, 0.164]}
                    castShadow
                  >
                    <planeGeometry args={[0.054, 0.012]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Upper right eyelid - positioned at top of eye */}
                  <mesh
                    ref={upperLidRight}
                    position={[faceVariant.eyeSpacing, eyeY + 0.024, 0.164]}
                    castShadow
                  >
                    <planeGeometry args={[0.054, 0.012]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Lower left eyelid - positioned at bottom of eye */}
                  <mesh
                    ref={lowerLidLeft}
                    position={[-faceVariant.eyeSpacing, eyeY - 0.024, 0.164]}
                    castShadow
                  >
                    <planeGeometry args={[0.054, 0.012]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Lower right eyelid - positioned at bottom of eye */}
                  <mesh
                    ref={lowerLidRight}
                    position={[faceVariant.eyeSpacing, eyeY - 0.024, 0.164]}
                    castShadow
                  >
                    <planeGeometry args={[0.054, 0.012]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>
                </>
              ) : (
                // Curved eyelids that wrap around 3D eyeballs
                <>
                  {/* Upper left eyelid - lowered for natural resting position */}
                  <mesh
                    ref={upperLidLeft}
                    position={[-faceVariant.eyeSpacing, eyeY + 0.003, 0.183]}
                    rotation={[Math.PI * 0.48, 0, 0]}
                    castShadow
                  >
                    <torusGeometry args={[0.026, 0.008, 8, 16, Math.PI]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Upper right eyelid - lowered for natural resting position */}
                  <mesh
                    ref={upperLidRight}
                    position={[faceVariant.eyeSpacing, eyeY + 0.003, 0.183]}
                    rotation={[Math.PI * 0.48, 0, 0]}
                    castShadow
                  >
                    <torusGeometry args={[0.026, 0.008, 8, 16, Math.PI]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Lower left eyelid - curved torus arc wrapping eyeball */}
                  <mesh
                    ref={lowerLidLeft}
                    position={[-faceVariant.eyeSpacing, eyeY - 0.015, 0.183]}
                    rotation={[Math.PI * 0.52, 0, 0]}
                    castShadow
                  >
                    <torusGeometry args={[0.026, 0.006, 8, 16, Math.PI]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>

                  {/* Lower right eyelid - curved torus arc wrapping eyeball */}
                  <mesh
                    ref={lowerLidRight}
                    position={[faceVariant.eyeSpacing, eyeY - 0.015, 0.183]}
                    rotation={[Math.PI * 0.52, 0, 0]}
                    castShadow
                  >
                    <torusGeometry args={[0.026, 0.006, 8, 16, Math.PI]} />
                    <meshStandardMaterial color={faceShadowColor} roughness={1} />
                  </mesh>
                </>
              )}
              {/* Eyelashes (female only) */}
              {isFemale && (
                <>
                  <mesh position={[-faceVariant.eyeSpacing, eyeY + 0.028, 0.165]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                  <mesh position={[faceVariant.eyeSpacing, eyeY + 0.028, 0.165]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                </>
              )}
              {/* Kohl eye makeup - historically accurate for Damascus, both genders */}
              {cosmeticEffects?.hasKohl && (
                <>
                  {/* Upper kohl lines - thick dark lines above eyes */}
                  <mesh position={[-faceVariant.eyeSpacing, eyeY + 0.022, 0.163]}>
                    <planeGeometry args={[0.055, 0.01]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                  <mesh position={[faceVariant.eyeSpacing, eyeY + 0.022, 0.163]}>
                    <planeGeometry args={[0.055, 0.01]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                  {/* Lower kohl lines - slightly thinner under eyes */}
                  <mesh position={[-faceVariant.eyeSpacing, eyeY - 0.022, 0.163]}>
                    <planeGeometry args={[0.05, 0.008]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                  <mesh position={[faceVariant.eyeSpacing, eyeY - 0.022, 0.163]}>
                    <planeGeometry args={[0.05, 0.008]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                  {/* Outer corner extensions - classic kohl wing/extension */}
                  <mesh position={[-(faceVariant.eyeSpacing + 0.032), eyeY + 0.005, 0.163]} rotation={[0, 0, 0.4]}>
                    <planeGeometry args={[0.018, 0.006]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                  <mesh position={[faceVariant.eyeSpacing + 0.032, eyeY + 0.005, 0.163]} rotation={[0, 0, -0.4]}>
                    <planeGeometry args={[0.018, 0.006]} />
                    <meshStandardMaterial color="#0a0a0a" roughness={1} />
                  </mesh>
                </>
              )}
              {/* Tear ducts */}
              <mesh position={[-(faceVariant.eyeSpacing - 0.013), eyeY - 0.008, 0.166]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              <mesh position={[faceVariant.eyeSpacing - 0.013, eyeY - 0.008, 0.166]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              {/* Under-eye bags/dark circles - visible for aged (50+), sick, or infected characters */}
              {underEyeBagIntensity > 0 && (
                <>
                  {/* Left under-eye bag - crescent shape below eye */}
                  <mesh
                    position={[-faceVariant.eyeSpacing, eyeY - 0.025, 0.162]}
                    rotation={[0.15, 0, 0]}
                  >
                    <capsuleGeometry args={[0.008 + underEyeBagIntensity * 0.004, 0.022, 4, 8]} />
                    <meshStandardMaterial
                      color={underEyeColor}
                      roughness={0.95}
                      transparent
                      opacity={0.4 + underEyeBagIntensity * 0.4}
                    />
                  </mesh>
                  {/* Left under-eye shadow - deeper shadow in inner corner */}
                  <mesh
                    position={[-(faceVariant.eyeSpacing - 0.012), eyeY - 0.022, 0.164]}
                  >
                    <sphereGeometry args={[0.008 + underEyeBagIntensity * 0.003, 6, 6]} />
                    <meshStandardMaterial
                      color={underEyeColor}
                      roughness={0.98}
                      transparent
                      opacity={0.3 + underEyeBagIntensity * 0.35}
                    />
                  </mesh>
                  {/* Right under-eye bag - crescent shape below eye */}
                  <mesh
                    position={[faceVariant.eyeSpacing, eyeY - 0.025, 0.162]}
                    rotation={[0.15, 0, 0]}
                  >
                    <capsuleGeometry args={[0.008 + underEyeBagIntensity * 0.004, 0.022, 4, 8]} />
                    <meshStandardMaterial
                      color={underEyeColor}
                      roughness={0.95}
                      transparent
                      opacity={0.4 + underEyeBagIntensity * 0.4}
                    />
                  </mesh>
                  {/* Right under-eye shadow - deeper shadow in inner corner */}
                  <mesh
                    position={[faceVariant.eyeSpacing - 0.012, eyeY - 0.022, 0.164]}
                  >
                    <sphereGeometry args={[0.008 + underEyeBagIntensity * 0.003, 6, 6]} />
                    <meshStandardMaterial
                      color={underEyeColor}
                      roughness={0.98}
                      transparent
                      opacity={0.3 + underEyeBagIntensity * 0.35}
                    />
                  </mesh>
                  {/* Additional hollow look for severe cases (very old or very sick) */}
                  {underEyeBagIntensity > 0.6 && (
                    <>
                      {/* Left cheek hollow */}
                      <mesh position={[-faceVariant.eyeSpacing - 0.015, eyeY - 0.045, 0.145]}>
                        <sphereGeometry args={[0.018, 6, 6]} />
                        <meshStandardMaterial
                          color={underEyeColor}
                          roughness={0.98}
                          transparent
                          opacity={0.25 * (underEyeBagIntensity - 0.5)}
                        />
                      </mesh>
                      {/* Right cheek hollow */}
                      <mesh position={[faceVariant.eyeSpacing + 0.015, eyeY - 0.045, 0.145]}>
                        <sphereGeometry args={[0.018, 6, 6]} />
                        <meshStandardMaterial
                          color={underEyeColor}
                          roughness={0.98}
                          transparent
                          opacity={0.25 * (underEyeBagIntensity - 0.5)}
                        />
                      </mesh>
                    </>
                  )}
                </>
              )}
              {/* Forehead wrinkles - horizontal lines for aged characters (40+) */}
              {foreheadWrinkleCount > 0 && (
                <>
                  {/* Wrinkle lines - positioned on forehead, spacing based on count */}
                  {Array.from({ length: foreheadWrinkleCount }).map((_, i) => {
                    const baseY = 0.07; // Base forehead position
                    const spacing = 0.018; // Space between wrinkles
                    const yPos = baseY + (i - (foreheadWrinkleCount - 1) / 2) * spacing;
                    const width = 0.06 - i * 0.008; // Slightly narrower for higher wrinkles
                    const opacity = 0.35 + (foreheadWrinkleCount - 1) * 0.1; // Deeper with more wrinkles
                    return (
                      <mesh
                        key={`wrinkle-${i}`}
                        position={[0, yPos, 0.168]}
                        rotation={[0, 0, (i % 2 === 0 ? 0.02 : -0.02)]} // Slight alternating tilt
                      >
                        <planeGeometry args={[width, 0.004]} />
                        <meshStandardMaterial
                          color={wrinkleColor}
                          roughness={1}
                          transparent
                          opacity={opacity}
                        />
                      </mesh>
                    );
                  })}
                </>
              )}
              {/* Moles/beauty marks - small dark spots for ~35% of characters */}
              {moleData.length > 0 && moleData.map((mole, i) => (
                <mesh
                  key={`mole-${i}`}
                  position={[mole.x, mole.y, mole.z]}
                >
                  <sphereGeometry args={[mole.size, 6, 6]} />
                  <meshStandardMaterial color={moleColor} roughness={0.9} />
                </mesh>
              ))}
              {/* Cheek flush/rosy cheeks - subtle color on cheekbones */}
              {cheekFlushIntensity > 0 && (
                <>
                  {/* Left cheek flush */}
                  <mesh position={[-0.055, eyeY - 0.04, 0.14]}>
                    <sphereGeometry args={[0.028, 8, 8]} />
                    <meshStandardMaterial
                      color={cheekFlushColor}
                      roughness={0.95}
                      transparent
                      opacity={0.25 + cheekFlushIntensity * 0.25}
                    />
                  </mesh>
                  {/* Right cheek flush */}
                  <mesh position={[0.055, eyeY - 0.04, 0.14]}>
                    <sphereGeometry args={[0.028, 8, 8]} />
                    <meshStandardMaterial
                      color={cheekFlushColor}
                      roughness={0.95}
                      transparent
                      opacity={0.25 + cheekFlushIntensity * 0.25}
                    />
                  </mesh>
                  {/* Upper cheek highlights - adds to rosy glow */}
                  <mesh position={[-0.045, eyeY - 0.025, 0.155]}>
                    <sphereGeometry args={[0.018, 6, 6]} />
                    <meshStandardMaterial
                      color={cheekFlushColor}
                      roughness={0.98}
                      transparent
                      opacity={0.15 + cheekFlushIntensity * 0.15}
                    />
                  </mesh>
                  <mesh position={[0.045, eyeY - 0.025, 0.155]}>
                    <sphereGeometry args={[0.018, 6, 6]} />
                    <meshStandardMaterial
                      color={cheekFlushColor}
                      roughness={0.98}
                      transparent
                      opacity={0.15 + cheekFlushIntensity * 0.15}
                    />
                  </mesh>
                </>
              )}
              {/* Lips */}
              <mesh ref={upperLipRef} position={[0, mouthY, 0.158]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * faceVariant.mouthWidthScale, 0.012, 0.015 * faceVariant.lipFullness]} />
                <meshStandardMaterial color={lipUpperColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLipRef} position={[0, mouthY - 0.012, 0.155]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * lipLowerScale * faceVariant.mouthWidthScale, 0.014, 0.015 * faceVariant.lipFullness]} />
                <meshStandardMaterial color={lipColor} roughness={1} />
              </mesh>

              {/* Mouth corners - expression tilt for smile/frown */}
              <mesh position={[-mouthWidth * 0.55, mouthY + mouthCornerLift, 0.159]} rotation={[0, 0, mouthCornerTilt]} castShadow>
                <boxGeometry args={[mouthWidth * 0.35, 0.008, 0.012]} />
                <meshStandardMaterial color={lipUpperColor} roughness={1} />
              </mesh>
              <mesh position={[mouthWidth * 0.55, mouthY + mouthCornerLift, 0.159]} rotation={[0, 0, -mouthCornerTilt]} castShadow>
                <boxGeometry args={[mouthWidth * 0.35, 0.008, 0.012]} />
                <meshStandardMaterial color={lipUpperColor} roughness={1} />
              </mesh>
            
             
            
              {/* Nose */}
              <mesh position={[0, -0.0, 0.17]} castShadow>
                <coneGeometry args={[noseRadius, noseLength, 8]} />
                <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
              </mesh>

              {/* Jaw - subtle definition for some characters */}
              {finalJawSize > 0 && (
                <group>
                  {/* Jawline - horizontal capsule positioned to blend with face */}
                  <mesh
                    position={[0, -0.16, 0.06]}
                    rotation={[0, 0, Math.PI / 2]}
                    castShadow
                  >
                    <capsuleGeometry
                      args={[
                        0.03 * finalJawSize,
                        0.10 * faceVariant.craniumWidth * faceVariant.faceWidthRatio,
                        4,
                        8
                      ]}
                    />
                    <meshStandardMaterial
                      color={faceShadowColor}
                      roughness={0.92}
                    />
                  </mesh>
                  {/* Chin - only for prominent jaws */}
                  {finalJawSize > 0.6 && (
                    <mesh position={[0, -0.21, 0.09]} castShadow>
                      <sphereGeometry args={[0.035 * finalJawSize, 8, 8]} />
                      <meshStandardMaterial
                        color={headColor}
                        roughness={0.9}
                      />
                    </mesh>
                  )}
                </group>
              )}

              {/* Facial Hair - men only */}
              {!isFemale && facialHair !== 'none' && (
                <group>
                  {/* Jaw-adjusted positions - beards follow jaw structure */}
                  {(() => {
                    const jawOffset = finalJawSize * 0.04; // Move down/forward with jaw
                    const jawForward = finalJawSize * 0.025; // Move forward with jaw
                    return (
                      <>
                        {/* Stubble - subtle shadow on jaw and chin */}
                        {facialHair === 'stubble' && (
                          <>
                            <mesh position={[0, -0.14 - jawOffset, 0.12 + jawForward]} castShadow>
                              <sphereGeometry args={[0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.7)} roughness={1} transparent opacity={0.7} />
                            </mesh>
                            <mesh position={[-0.08, -0.11 - jawOffset * 0.5, 0.1 + jawForward * 0.8]} castShadow>
                              <boxGeometry args={[0.04, 0.06, 0.02]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.65)} roughness={1} transparent opacity={0.65} />
                            </mesh>
                            <mesh position={[0.08, -0.11 - jawOffset * 0.5, 0.1 + jawForward * 0.8]} castShadow>
                              <boxGeometry args={[0.04, 0.06, 0.02]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.65)} roughness={1} transparent opacity={0.65} />
                            </mesh>
                          </>
                        )}

                  {/* Mustache - made more prominent */}
                  {(facialHair === 'mustache' || facialHair === 'full_beard' || facialHair === 'goatee') && (
                    <>
                      <mesh position={[-0.028, mouthY + 0.020, 0.18]} rotation={[0, 0, Math.PI / 2 + 0.15]} castShadow>
                        <capsuleGeometry args={[0.015, 0.035, 4, 6]} />
                        <meshStandardMaterial color={beardColor} roughness={0.95} />
                      </mesh>
                      <mesh position={[0.028, mouthY + 0.020, 0.18]} rotation={[0, 0, -Math.PI / 2 - 0.15]} castShadow>
                        <capsuleGeometry args={[0.015, 0.035, 4, 6]} />
                        <meshStandardMaterial color={beardColor} roughness={0.95} />
                      </mesh>
                    </>
                  )}

                        {/* Short beard - covers chin and lower jaw */}
                        {facialHair === 'short_beard' && (
                          <>
                            <mesh position={[0, -0.14 - jawOffset, 0.13 + jawForward]} castShadow>
                              <sphereGeometry args={[0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                              <meshStandardMaterial color={beardColor} roughness={0.92} />
                            </mesh>
                            <mesh position={[-0.06, -0.11 - jawOffset * 0.5, 0.11 + jawForward * 0.8]} castShadow>
                              <boxGeometry args={[0.04, 0.05, 0.03]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.9)} roughness={0.92} />
                            </mesh>
                            <mesh position={[0.06, -0.11 - jawOffset * 0.5, 0.11 + jawForward * 0.8]} castShadow>
                              <boxGeometry args={[0.04, 0.05, 0.03]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.9)} roughness={0.92} />
                            </mesh>
                      {/* Mustache for short beard */}
                      <mesh position={[-0.022, mouthY + 0.016, 0.178]} rotation={[0, 0, Math.PI / 2 + 0.12]} castShadow>
                        <capsuleGeometry args={[0.01, 0.025, 4, 6]} />
                        <meshStandardMaterial color={beardColor} roughness={0.94} />
                      </mesh>
                      <mesh position={[0.022, mouthY + 0.016, 0.178]} rotation={[0, 0, -Math.PI / 2 - 0.12]} castShadow>
                        <capsuleGeometry args={[0.01, 0.025, 4, 6]} />
                        <meshStandardMaterial color={beardColor} roughness={0.94} />
                      </mesh>
                    </>
                  )}

                        {/* Full beard - thick coverage */}
                        {facialHair === 'full_beard' && (
                          <>
                            {/* Main chin beard */}
                            <mesh position={[0, -0.16 - jawOffset, 0.10 + jawForward]} castShadow>
                              <sphereGeometry args={[0.09, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                              <meshStandardMaterial color={beardColor} roughness={0.9} />
                            </mesh>
                            {/* Beard extension downward */}
                            <mesh position={[0, -0.22 - jawOffset * 1.2, 0.06 + jawForward * 0.6]} rotation={[0.3, 0, 0]} castShadow>
                              <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.92)} roughness={0.92} />
                            </mesh>
                            {/* Side jaw coverage */}
                            <mesh position={[-0.08, -0.12 - jawOffset * 0.5, 0.08 + jawForward * 0.7]} castShadow>
                              <boxGeometry args={[0.05, 0.08, 0.04]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.88)} roughness={0.92} />
                            </mesh>
                            <mesh position={[0.08, -0.12 - jawOffset * 0.5, 0.08 + jawForward * 0.7]} castShadow>
                              <boxGeometry args={[0.05, 0.08, 0.04]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.88)} roughness={0.92} />
                            </mesh>
                      {/* Sideburns connecting to beard */}
                      <mesh position={[-0.12, 0.0, 0.04]} castShadow>
                        <boxGeometry args={[0.03, 0.16, 0.03]} />
                        <meshStandardMaterial color={adjustColor(beardColor, 0.85)} roughness={0.9} />
                      </mesh>
                      <mesh position={[0.12, 0.0, 0.04]} castShadow>
                        <boxGeometry args={[0.03, 0.16, 0.03]} />
                        <meshStandardMaterial color={adjustColor(beardColor, 0.85)} roughness={0.9} />
                      </mesh>
                    </>
                  )}

                        {/* Goatee - chin only with mustache */}
                        {facialHair === 'goatee' && (
                          <>
                            <mesh position={[0, -0.15 - jawOffset, 0.14 + jawForward]} castShadow>
                              <sphereGeometry args={[0.055, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                              <meshStandardMaterial color={beardColor} roughness={0.92} />
                            </mesh>
                            <mesh position={[0, -0.20 - jawOffset * 1.2, 0.10 + jawForward * 0.6]} rotation={[0.25, 0, 0]} castShadow>
                              <capsuleGeometry args={[0.028, 0.05, 4, 6]} />
                              <meshStandardMaterial color={adjustColor(beardColor, 0.9)} roughness={0.92} />
                            </mesh>
                          </>
                        )}
                      </>
                    );
                  })()}
                </group>
              )}
            </>
          )}

          {/* Hair showing under headwear - temple/side tufts */}
          {headwearStyle !== 'none' && hairStyle !== 'covered' && (
            <group>
              {/* Side hair wisps peeking out near temples */}
              {(headwearStyle === 'scarf' || headwearStyle === 'cap' || headwearStyle === 'taqiyah' || headwearStyle === 'fez' || headwearStyle === 'straw' || headwearStyle === 'turban') && (
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
              {/* FULL SCARF - Most modest, full coverage with long drape */}
              {headscarfStyle === 'full' && (
                <>
                  {/* KHIMAR - Structured, tight wrapping */}
                  {headwearGarmentType === 'khimar' && (
                    <>
                      {/* Tighter head covering - structured fit */}
                      <mesh position={[0, 0.145, -0.06]} castShadow>
                        <sphereGeometry args={[0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness - 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Structured shoulder drape - more cylindrical, neat folds */}
                      <mesh position={[0, -0.04, -0.10]} castShadow>
                        <cylinderGeometry args={[0.18, 0.24, 0.28, 14]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Chest panel - straight, rectangular drape */}
                      <mesh position={[0, -0.14, -0.18]} rotation={[0.18, 0, 0]} castShadow>
                        <boxGeometry args={[0.28, 0.24, 0.015]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.01}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* MILHAFA - Loose, flowing, North African style */}
                  {headwearGarmentType === 'milhafa' && (
                    <>
                      {/* Loose head wrap - larger radius, more coverage */}
                      <mesh position={[0, 0.135, -0.08]} castShadow>
                        <sphereGeometry args={[0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.04}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Asymmetric drape - slightly offset for flowing look */}
                      <mesh position={[0.03, -0.08, -0.14]} rotation={[0.24, 0.08, 0.04]} castShadow>
                        <cylinderGeometry args={[0.20, 0.28, 0.36, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.05}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Flowing back drape - larger, softer folds */}
                      <mesh position={[0, -0.20, -0.25]} rotation={[0.26, 0, 0]} castShadow>
                        <boxGeometry args={[0.34, 0.34, 0.025]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.06}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* HIJAB - Default, contemporary style (current geometry) */}
                  {headwearGarmentType === 'hijab' && (
                    <>
                      <mesh position={[0, 0.142, -0.07]} castShadow>
                        <sphereGeometry args={[0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.06, -0.12]} castShadow>
                        <cylinderGeometry args={[0.19, 0.26, 0.32, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.18, -0.22]} rotation={[0.22, 0, 0]} castShadow>
                        <boxGeometry args={[0.3, 0.3, 0.02]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.03}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}
                </>
              )}

              {/* MODEST SCARF - Traditional variant, similar to full but slightly shorter drape */}
              {headscarfStyle === 'modest' && (
                <>
                  {/* KHIMAR - Structured modest variant */}
                  {headwearGarmentType === 'khimar' && (
                    <>
                      <mesh position={[0, 0.143, -0.05]} castShadow>
                        <sphereGeometry args={[0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.50]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness - 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.03, -0.11]} castShadow>
                        <cylinderGeometry args={[0.19, 0.23, 0.26, 14]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.13, -0.17]} rotation={[0.16, 0, 0]} castShadow>
                        <boxGeometry args={[0.26, 0.22, 0.015]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.01}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* MILHAFA - Loose modest variant */}
                  {headwearGarmentType === 'milhafa' && (
                    <>
                      <mesh position={[0, 0.133, -0.07]} castShadow>
                        <sphereGeometry args={[0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.04}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0.03, -0.07, -0.13]} rotation={[0.22, 0.08, 0.04]} castShadow>
                        <cylinderGeometry args={[0.21, 0.27, 0.32, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.05}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.17, -0.22]} rotation={[0.24, 0, 0]} castShadow>
                        <boxGeometry args={[0.32, 0.30, 0.025]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.06}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* HIJAB - Default modest variant */}
                  {headwearGarmentType === 'hijab' && (
                    <>
                      <mesh position={[0, 0.14, -0.06]} castShadow>
                        <sphereGeometry args={[0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.53]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.05, -0.12]} castShadow>
                        <cylinderGeometry args={[0.20, 0.25, 0.28, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      <mesh position={[0, -0.15, -0.20]} rotation={[0.20, 0, 0]} castShadow>
                        <boxGeometry args={[0.28, 0.26, 0.02]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.03}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}
                </>
              )}

              {/* VEILED SCARF - Most conservative, covers lower face and shows just eyes */}
              {headscarfStyle === 'veiled' && (
                <>
                  {/* KHIMAR - Structured veiled variant */}
                  {headwearGarmentType === 'khimar' && (
                    <>
                      {/* Head covering - structured, tight */}
                      <mesh position={[0, 0.142, -0.09]} castShadow>
                        <sphereGeometry args={[0.23, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness - 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Face veil - two-piece burqu' construction */}
                      {/* Upper piece - covers forehead to nose bridge */}
                      <mesh position={[0, -0.05, 0.20]} castShadow>
                        <boxGeometry args={[0.32, 0.14, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Lower piece - covers mouth and chin (small gap for breathing) */}
                      <mesh position={[0, -0.22, 0.19]} castShadow>
                        <boxGeometry args={[0.30, 0.12, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Shoulder drape - neat, cylindrical */}
                      <mesh position={[0, -0.06, -0.09]} castShadow>
                        <cylinderGeometry args={[0.19, 0.26, 0.32, 14]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Back panel - straight */}
                      <mesh position={[0, -0.18, -0.22]} rotation={[0.22, 0, 0]} castShadow>
                        <boxGeometry args={[0.30, 0.30, 0.015]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.01}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* MILHAFA - Loose veiled variant */}
                  {headwearGarmentType === 'milhafa' && (
                    <>
                      {/* Head covering - full, loose */}
                      <mesh position={[0, 0.136, -0.11]} castShadow>
                        <sphereGeometry args={[0.27, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.60]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.04}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Face veil - two-piece burqu' construction (flowing style) */}
                      {/* Upper piece - covers forehead to nose bridge */}
                      <mesh position={[0, -0.05, 0.20]} castShadow>
                        <boxGeometry args={[0.36, 0.15, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Lower piece - covers mouth and chin (small gap for breathing) */}
                      <mesh position={[0, -0.22, 0.19]} castShadow>
                        <boxGeometry args={[0.34, 0.13, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.04}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Shoulder drape - asymmetric, flowing */}
                      <mesh position={[0.03, -0.10, -0.11]} rotation={[0.26, 0.08, 0.04]} castShadow>
                        <cylinderGeometry args={[0.21, 0.28, 0.38, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.05}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Back drape - large, flowing */}
                      <mesh position={[0, -0.22, -0.26]} rotation={[0.26, 0, 0]} castShadow>
                        <boxGeometry args={[0.36, 0.36, 0.025]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.06}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}

                  {/* HIJAB - Default veiled variant */}
                  {headwearGarmentType === 'hijab' && (
                    <>
                      {/* Head covering - full */}
                      <mesh position={[0, 0.14, -0.1]} castShadow>
                        <sphereGeometry args={[0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Face veil - two-piece burqu' construction */}
                      {/* Upper piece - covers forehead to nose bridge */}
                      <mesh position={[0, -0.05, 0.20]} castShadow>
                        <boxGeometry args={[0.34, 0.14, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.01}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Lower piece - covers mouth and chin (small gap for breathing) */}
                      <mesh position={[0, -0.22, 0.19]} castShadow>
                        <boxGeometry args={[0.32, 0.12, 0.01]} />
                        <meshStandardMaterial
                          color={headscarfColor}
                          roughness={headscarfRoughness + 0.03}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Neck/shoulder drape */}
                      <mesh position={[0, -0.08, -0.10]} castShadow>
                        <cylinderGeometry args={[0.20, 0.27, 0.34, 12]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.02}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                      {/* Long back drape */}
                      <mesh position={[0, -0.20, -0.24]} rotation={[0.24, 0, 0]} castShadow>
                        <boxGeometry args={[0.32, 0.32, 0.02]} />
                        <meshStandardMaterial
                          color={headwearShadow}
                          roughness={headscarfRoughness + 0.03}
                          map={headscarfTexture || undefined}
                        />
                      </mesh>
                    </>
                  )}
                </>
              )}
              {/* Band and stripe patterns - position varies by garment type */}
              {(headscarfPattern === 'band' || headscarfPattern === 'stripe') && (
                <group>
                  {/* Khimar: band at forehead (higher position) */}
                  {headwearGarmentType === 'khimar' && (
                    <>
                      <mesh position={[0, 0.14, 0.01]} rotation={[Math.PI / 2.2, 0, 0]} castShadow>
                        <torusGeometry args={[0.21, 0.013, 8, 18]} />
                        <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.04} />
                      </mesh>
                      {headscarfPattern === 'stripe' && (
                        <mesh position={[0, 0.17, 0.00]} rotation={[Math.PI / 2.3, 0, 0]} castShadow>
                          <torusGeometry args={[0.19, 0.010, 8, 18]} />
                          <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.05} />
                        </mesh>
                      )}
                    </>
                  )}
                  {/* Milhafa: band lower (traditional North African style) */}
                  {headwearGarmentType === 'milhafa' && (
                    <>
                      <mesh position={[0, 0.10, -0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <torusGeometry args={[0.22, 0.012, 8, 18]} />
                        <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.06} />
                      </mesh>
                      {headscarfPattern === 'stripe' && (
                        <mesh position={[0, 0.13, -0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                          <torusGeometry args={[0.20, 0.010, 8, 18]} />
                          <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.06} />
                        </mesh>
                      )}
                    </>
                  )}
                  {/* Hijab: middle position (default) */}
                  {headwearGarmentType === 'hijab' && (
                    <>
                      <mesh position={[0, 0.12, -0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <torusGeometry args={[0.21, 0.012, 8, 18]} />
                        <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.05} />
                      </mesh>
                      {headscarfPattern === 'stripe' && (
                        <mesh position={[0, 0.15, -0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                          <torusGeometry args={[0.19, 0.010, 8, 18]} />
                          <meshStandardMaterial color={scarfPatternColor} roughness={headscarfRoughness + 0.05} />
                        </mesh>
                      )}
                    </>
                  )}
                </group>
              )}

              {/* Embroidery panels (tiraz) for wealthy women - decorative gold/silver bands */}
              {hasEmbroidery && (
                <group>
                  {/* Forehead embroidery band - gold/silver metallic accent */}
                  <mesh position={[0, 0.10, 0.08]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
                    <torusGeometry args={[0.22, 0.008, 6, 20]} />
                    <meshStandardMaterial
                      color="#d4af37"
                      roughness={0.25}
                      metalness={0.6}
                    />
                  </mesh>
                  {/* Side edge embroidery - decorative accents */}
                  <mesh position={[0.18, -0.05, 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.004, 0.004, 0.16, 8]} />
                    <meshStandardMaterial
                      color="#c9b28c"
                      roughness={0.30}
                      metalness={0.5}
                    />
                  </mesh>
                  <mesh position={[-0.18, -0.05, 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.004, 0.004, 0.16, 8]} />
                    <meshStandardMaterial
                      color="#c9b28c"
                      roughness={0.30}
                      metalness={0.5}
                    />
                  </mesh>
                </group>
              )}
            </group>
          )}
          {headwearStyle === 'cap' && (
            <group>
              <mesh position={[0, 0.19, -0.00]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.12, 12]} />
                <meshStandardMaterial color={turbanColor} roughness={0.99} />
              </mesh>
              <mesh position={[0, 0.155, -0.00]} castShadow>
                <cylinderGeometry args={[0.162, 0.152, 0.01, 12]} />
                <meshStandardMaterial color={adjustColor(turbanColor, 0.8)} roughness={0.99} />
              </mesh>
              <mesh position={[0, 0.195, -0.03]} castShadow>
                <sphereGeometry args={[0.105, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.85]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.8} />
              </mesh>
            </group>
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
              {/* Taqiyah (skull cap) base - visible underneath */}
              <mesh position={[0, 0.16, -0.02]} castShadow>
                <sphereGeometry args={[0.19, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.50]} />
                <meshStandardMaterial
                  color={new THREE.Color(turbanColor).multiplyScalar(0.75).getStyle()}
                  roughness={0.92}
                />
              </mesh>

              {/* Wrapped turban layers - stacked horizontal bands creating realistic wrapped appearance */}
              {/* Layer 1: Foundation wrap - lowest layer above forehead */}
              <mesh position={[0, 0.18, -0.03]} rotation={[0.12, 0, 0]} castShadow>
                <torusGeometry args={[0.19, 0.035, 12, 24]} />
                <meshStandardMaterial
                  color={turbanColor}
                  roughness={0.86}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Layer 2: Second wrap layer */}
              <mesh position={[0, 0.22, -0.025]} rotation={[0.10, 0, 0]} castShadow>
                <torusGeometry args={[0.18, 0.038, 12, 24]} />
                <meshStandardMaterial
                  color={turbanHighlight}
                  roughness={0.84}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Layer 3: Third wrap layer */}
              <mesh position={[0, 0.26, -0.02]} rotation={[0.08, 0, 0]} castShadow>
                <torusGeometry args={[0.17, 0.040, 12, 24]} />
                <meshStandardMaterial
                  color={turbanColor}
                  roughness={0.85}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Layer 4: Fourth wrap layer */}
              <mesh position={[0, 0.30, -0.015]} rotation={[0.06, 0, 0]} castShadow>
                <torusGeometry args={[0.16, 0.038, 12, 24]} />
                <meshStandardMaterial
                  color={turbanHighlight}
                  roughness={0.83}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Layer 5: Fifth wrap layer */}
              <mesh position={[0, 0.34, -0.01]} rotation={[0.04, 0, 0]} castShadow>
                <torusGeometry args={[0.15, 0.036, 12, 24]} />
                <meshStandardMaterial
                  color={turbanColor}
                  roughness={0.86}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Crown cap - covers top */}
              <mesh position={[0, 0.37, -0.01]} castShadow>
                <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                <meshStandardMaterial
                  color={turbanHighlight}
                  roughness={0.82}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Front drape piece - asymmetric fold over forehead (typical style) */}
              <mesh position={[0.06, 0.16, 0.12]} rotation={[0.35, 0.15, 0.08]} castShadow>
                <boxGeometry args={[0.14, 0.10, 0.015]} />
                <meshStandardMaterial
                  color={turbanHighlight}
                  roughness={0.88}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Tail/end piece hanging at back - traditional style */}
              <mesh position={[0, 0.12, -0.22]} rotation={[Math.PI / 3.0, 0, 0]} castShadow>
                <boxGeometry args={[0.16, 0.24, 0.018]} />
                <meshStandardMaterial
                  color={turbanColor}
                  roughness={0.90}
                  map={turbanTexture || undefined}
                />
              </mesh>

              {/* Stripe/band patterns - integrated into wrapping */}
              {turbanPattern === 'stripe' && (
                <group>
                  {/* Contrasting stripe on layer 2 */}
                  <mesh position={[0, 0.22, -0.025]} rotation={[0.10, 0, 0]} castShadow>
                    <torusGeometry args={[0.18, 0.020, 12, 24]} />
                    <meshStandardMaterial color={turbanPatternColor} roughness={0.75} />
                  </mesh>
                  {/* Contrasting stripe on layer 4 */}
                  <mesh position={[0, 0.30, -0.015]} rotation={[0.06, 0, 0]} castShadow>
                    <torusGeometry args={[0.16, 0.020, 12, 24]} />
                    <meshStandardMaterial color={turbanPatternColor} roughness={0.75} />
                  </mesh>
                </group>
              )}

              {turbanPattern === 'band' && (
                <group>
                  {/* Single decorative band around middle */}
                  <mesh position={[0, 0.26, -0.02]} rotation={[0.08, 0, 0]} castShadow>
                    <torusGeometry args={[0.17, 0.025, 12, 24]} />
                    <meshStandardMaterial
                      color={turbanPatternColor}
                      roughness={0.65}
                      metalness={0.15}
                    />
                  </mesh>
                </group>
              )}

              {turbanPattern === 'geometric' && (
                <group>
                  {/* Geometric pattern on front drape */}
                  <mesh position={[0.06, 0.16, 0.13]} rotation={[0.35, 0.15, 0.08]} castShadow>
                    <boxGeometry args={[0.12, 0.08, 0.001]} />
                    <meshStandardMaterial
                      color={turbanPatternColor}
                      roughness={0.70}
                      transparent
                      opacity={0.85}
                    />
                  </mesh>
                </group>
              )}
            </group>
          )}
          {headwearStyle === 'taqiyah' && (
            <group>
              {/* Simple rounded skullcap */}
              <mesh position={[0, 0.1, -0.03]} castShadow>
                <sphereGeometry args={[0.18, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color={turbanColor} roughness={0.88} />
              </mesh>
              {/* Bottom band */}
              <mesh position={[0, 0.10, -0.04]} rotation={[0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.19, 0.20, 0.04, 20]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.85} />
              </mesh>
              {turbanPattern !== 'none' && (
                <group>
                  <mesh position={[0, 0.13, -0.03]} rotation={[0.08, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.19, 0.20, 0.02, 20]} />
                    <meshStandardMaterial color={turbanPatternColor} roughness={0.7} />
                  </mesh>
                  {turbanPattern !== 'band' && (
                    <mesh position={[0, 0.16, -0.02]} rotation={[0.08, 0, 0]} castShadow>
                      <cylinderGeometry args={[0.18, 0.19, 0.02, 20]} />
                      <meshStandardMaterial color={turbanPatternColor} roughness={0.7} />
                    </mesh>
                  )}
                </group>
              )}
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
              {/* Capsule shoulder - horizontal for natural slope */}
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.07, 0.12, 4, 8]} />
                <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
              </mesh>
            </group>
            <group ref={rightShoulder} position={[0.3, 1.4, 0]}>
              {/* Capsule shoulder - horizontal for natural slope */}
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.07, 0.12, 4, 8]} />
                <meshStandardMaterial color={clothUpperColor} roughness={clothRoughness} />
              </mesh>
            </group>
            <group ref={leftArm} position={[-0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Upper arm band - decorative stripe */}
              {sleeveCoverage === 'full' && robeHasTrim && (
                <mesh position={[0, 0.1, 0]} castShadow>
                  <cylinderGeometry args={[0.068, 0.068, 0.03, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
            <group ref={leftForearm} position={[0, -0.2, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.048, 0.24, 8]} />
                <meshStandardMaterial
                  color={lowerArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Sleeve cuff - decorative band at wrist */}
              {sleeveCoverage !== 'none' && (
                <mesh position={[0, -0.21, 0]} castShadow>
                  <cylinderGeometry args={[0.058, 0.062, 0.045, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.26, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.04, 0.09, 0.075]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                <mesh position={[0.01, 0.01, 0.045]} rotation={[0, 0, 0.4]} castShadow>
                  <capsuleGeometry args={[0.02, 0.04, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                {/* Henna pattern on left hand (male) */}
                {cosmeticEffects?.hasHenna && (
                  <>
                    <mesh position={[0, 0, -0.039]} rotation={[0.1, 0, 0]}>
                      <circleGeometry args={[0.02, 8]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.028, -0.039]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.007, 0.035]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, -0.028, -0.039]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.007, 0.035]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0.017, 0, -0.039]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.007, 0.024]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[-0.017, 0, -0.039]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.007, 0.024]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.048, -0.039]}>
                      <circleGeometry args={[0.006, 6]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                  </>
                )}
              </group>
            </group>
            </group>
            <group ref={rightArm} position={[0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Upper arm band - decorative stripe */}
              {sleeveCoverage === 'full' && robeHasTrim && (
                <mesh position={[0, 0.1, 0]} castShadow>
                  <cylinderGeometry args={[0.068, 0.068, 0.03, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
            <group ref={rightForearm} position={[0, -0.2, 0]}>
              {/* Elbow joint sphere */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshStandardMaterial
                  color={upperArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Forearm cylinder - offset down so it pivots from elbow */}
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.048, 0.24, 8]} />
                <meshStandardMaterial
                  color={lowerArmColor}
                  roughness={sleeveCoverage === 'none' ? skinRoughness : clothRoughness}
                  metalness={sleeveCoverage === 'none' ? skinMetalness : 0}
                />
              </mesh>
              {/* Sleeve cuff - decorative band at wrist */}
              {sleeveCoverage !== 'none' && (
                <mesh position={[0, -0.21, 0]} castShadow>
                  <cylinderGeometry args={[0.058, 0.062, 0.045, 8]} />
                  <meshStandardMaterial color={robeAccentColor} roughness={0.85} />
                </mesh>
              )}
              {/* Hand - palm pad with thumb, rotated so palm faces inward */}
              <group position={[0, -0.26, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh castShadow rotation={[0.1, 0, 0]}>
                  <boxGeometry args={[0.04, 0.09, 0.075]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                <mesh position={[-0.01, 0.01, 0.045]} rotation={[0, 0, -0.4]} castShadow>
                  <capsuleGeometry args={[0.02, 0.04, 4, 6]} />
                  <meshStandardMaterial color={headColor} roughness={skinRoughness} metalness={skinMetalness} />
                </mesh>
                {/* Henna pattern on right hand (male) */}
                {cosmeticEffects?.hasHenna && (
                  <>
                    <mesh position={[0, 0, -0.039]} rotation={[0.1, 0, 0]}>
                      <circleGeometry args={[0.02, 8]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.028, -0.039]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.007, 0.035]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, -0.028, -0.039]} rotation={[0.1, 0, 0]}>
                      <planeGeometry args={[0.007, 0.035]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0.017, 0, -0.039]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.007, 0.024]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[-0.017, 0, -0.039]} rotation={[0.1, 0, Math.PI / 2]}>
                      <planeGeometry args={[0.007, 0.024]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.048, -0.039]}>
                      <circleGeometry args={[0.006, 6]} />
                      <meshStandardMaterial color="#6B3410" roughness={1} />
                    </mesh>
                  </>
                )}
              </group>
            </group>
            </group>
          </>
        )}

        {/* Legs with knee joints */}
        {!isFemale && (
          <group ref={hipGroup}>
            <group ref={leftLeg} position={[-0.15, 0.45, 0]}>
              {/* Upper leg (thigh) - tapered cylinder for fabric draping */}
              <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.065, 0.085, 0.45, 10]} />
                <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
              </mesh>
              {/* Knee joint */}
              <group ref={leftKnee} position={[0, -0.15, 0]}>
                {/* Fabric over knee - hemisphere instead of full sphere */}
                <mesh position={[0, 0, 0]} castShadow>
                  <sphereGeometry args={[0.09, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                  <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
                </mesh>
                {/* Lower leg (shin) - tapered cylinder for fabric flow */}
                <mesh position={[0, -0.22, 0]} castShadow>
                  <cylinderGeometry args={[0.055, 0.065, 0.4, 10]} />
                  <meshStandardMaterial color={clothFoldColor} roughness={clothRoughness} />
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
              {/* Upper leg (thigh) - tapered cylinder for fabric draping */}
              <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.065, 0.085, 0.45, 10]} />
                <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
              </mesh>
              {/* Knee joint */}
              <group ref={rightKnee} position={[0, -0.15, 0]}>
                {/* Fabric over knee - hemisphere instead of full sphere */}
                <mesh position={[0, 0, 0]} castShadow>
                  <sphereGeometry args={[0.09, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                  <meshStandardMaterial color={clothLowerColor} roughness={clothRoughness} />
                </mesh>
                {/* Lower leg (shin) - tapered cylinder for fabric flow */}
                <mesh position={[0, -0.22, 0]} castShadow>
                  <cylinderGeometry args={[0.055, 0.065, 0.4, 10]} />
                  <meshStandardMaterial color={clothFoldColor} roughness={clothRoughness} />
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
