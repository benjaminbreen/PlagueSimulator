
import React, { useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const damaskCache = new Map<string, THREE.CanvasTexture>();
const strawCache = new Map<string, THREE.CanvasTexture>();

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
  animationBoost?: number;
  walkSpeed?: number;
  enableArmSwing?: boolean;
  armSwingMode?: 'both' | 'left' | 'right' | 'none';
  robeAccentColor?: string;
  robeHasSash?: boolean;
  robeSleeves?: boolean;
  robeHasTrim?: boolean;
  robeHemBand?: boolean;
  robeSpread?: number;
  robeOverwrap?: boolean;
  robePattern?: 'none' | 'damask';
  hairStyle?: 'short' | 'medium' | 'long' | 'covered';
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'none';
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
  distanceFromCamera?: number;  // PERFORMANCE: LOD - skip detail when far
  showGroundShadow?: boolean;
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
  animationBoost = 1,
  walkSpeed = 10,
  enableArmSwing = false,
  armSwingMode = 'both',
  robeAccentColor = '#d0b992',
  robeHasSash = false,
  robeSleeves = true,
  robeHasTrim = true,
  robeHemBand,
  robeSpread,
  robeOverwrap,
  robePattern = 'none',
  hairStyle: hairStyleProp,
  headwearStyle: headwearStyleProp,
  sleeveCoverage = robeSleeves ? 'full' : 'none',
  footwearStyle = 'sandals',
  footwearColor = '#9b7b4f',
  accessories = [],
  distanceFromCamera = 0,
  showGroundShadow = true
}) => {
  // PERFORMANCE: LOD - skip facial details beyond 25 units
  const showFacialDetails = distanceFromCamera < 25;
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
  const sashFrontRef = useRef<THREE.Mesh>(null);
  const trimFrontRef = useRef<THREE.Mesh>(null);
  const leftFoot = useRef<THREE.Group>(null);
  const rightFoot = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const isFemale = gender === 'Female';
  const faceShadowColor = useMemo(() => new THREE.Color(headColor).multiplyScalar(0.85).getStyle(), [headColor]);
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
  const lipWidthScale = useMemo(() => 0.95 + Math.random() * 0.15, []);
  const lipLowerScale = useMemo(() => 1.08 + Math.random() * 0.18, []);
  const lipGap = useMemo(() => 0.006 + Math.random() * 0.004, []);
  const headwearShadow = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(0.85).getStyle(), [headscarfColor]);
  const headwearHighlight = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(1.08).getStyle(), [headscarfColor]);
  const turbanHighlight = useMemo(() => {
    const hash = turbanColor.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    if (headwearStyle === 'turban' || headwearStyle === 'fez') {
      if (hash % 3 === 0) return '#f4efe6'; // white stripe option
      if (hash % 5 === 0) return new THREE.Color(turbanColor).multiplyScalar(0.7).getStyle();
    }
    return new THREE.Color(turbanColor).multiplyScalar(1.08).getStyle();
  }, [turbanColor, headwearStyle]);
  const femaleRobeSpread = useMemo(() => robeSpread ?? (0.75 + Math.random() * 0.18), [robeSpread]);
  const femaleRobeBand = useMemo(() => robeHemBand ?? (Math.random() > 0.5), [robeHemBand]);
  const eyeScale = useMemo(() => (isFemale ? [1.7, 0.85, 0.7] : [1.4, 0.7, 0.7]) as [number, number, number], [isFemale]);
  const eyeY = isFemale ? 0.03 : 0.02;
  const browColor = isFemale ? faceShadowColor : '#3a2a1a';
  const browHeight = isFemale ? 0.03 : 0.04;
  const noseLength = isFemale ? 0.09 : 0.1;
  const noseRadius = isFemale ? 0.015 : 0.017;
  const mouthWidth = isFemale ? 0.045 : 0.05;
  const mouthY = isFemale ? -0.095 : -0.09;
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
  const damaskMap = useMemo(() => {
    if (!isFemale || robePattern !== 'damask') return null;
    const hash = (color + robeAccentColor).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const contrast = hash % 3 === 0;
    const motif = contrast ? adjustColor(robeAccentColor, 1.35) : adjustColor(color, 1.15);
    const alpha = contrast ? 0.55 : 0.28;
    return getDamaskTexture(color, motif, alpha) ?? null;
  }, [color, isFemale, robeAccentColor, robePattern]);
  const eyeColor = useMemo(() => {
    const roll = Math.random();
    if (roll > 0.98) return '#6aa0c8'; // rare blue
    if (roll > 0.92) return '#4a6b3f'; // occasional green
    if (roll > 0.6) return '#3b2a1a'; // deep brown
    return '#2a1a12'; // very dark brown
  }, []);
  const upperLidLeft = useRef<THREE.Mesh>(null);
  const upperLidRight = useRef<THREE.Mesh>(null);
  const lowerLidLeft = useRef<THREE.Mesh>(null);
  const lowerLidRight = useRef<THREE.Mesh>(null);
  const blinkTimer = useRef(0);
  const blinkCooldown = useRef(6 + Math.random() * 10);
  const blinkProgress = useRef(0);
  const isBlinking = useRef(false);

  useFrame((state) => {
    if (isDead) {
      if (bodyGroup.current) {
        bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, Math.PI / 2, 0.1);
        bodyGroup.current.position.y = THREE.MathUtils.lerp(bodyGroup.current.position.y, -0.85, 0.1);
      }
      return;
    }

    const jumping = isJumpingRef ? isJumpingRef.current : isJumping;
    const jumpT = jumpPhaseRef ? jumpPhaseRef.current : jumpPhase;
    const anticipate = jumpAnticipationRef ? jumpAnticipationRef.current : 0;
    const landing = landingImpulseRef ? landingImpulseRef.current : 0;
    const jumpBoost = jumpChargeRef ? jumpChargeRef.current : 0;
    const effectiveWalkSpeed = isSprinting ? walkSpeed * 2.2 : walkSpeed;
    const t = state.clock.elapsedTime * effectiveWalkSpeed;
    const amp = isWalking ? (isSprinting ? 0.7 : 0.4) : 0;
    
    // Leg swinging with foot travel for basic foot planting
    const leftPhase = Math.sin(t);
    const rightPhase = Math.sin(t + Math.PI);
    if (leftLeg.current) leftLeg.current.rotation.x = leftPhase * amp;
    if (rightLeg.current) rightLeg.current.rotation.x = rightPhase * amp;
    const footBaseY = isFemale ? 0.05 : -0.45;
    const footBaseZ = 0.1;
    if (leftFoot.current) {
      leftFoot.current.position.z = footBaseZ + leftPhase * (isSprinting ? 0.12 : 0.08);
      leftFoot.current.position.y = footBaseY + Math.max(0, -leftPhase) * (isSprinting ? 0.06 : 0.04);
    }
    if (rightFoot.current) {
      rightFoot.current.position.z = footBaseZ + rightPhase * (isSprinting ? 0.12 : 0.08);
      rightFoot.current.position.y = footBaseY + Math.max(0, -rightPhase) * (isSprinting ? 0.06 : 0.04);
    }
    if (enableArmSwing) {
      if (!jumping) {
        const armDrive = isSprinting ? 1.1 : 1.0;
        if ((armSwingMode === 'both' || armSwingMode === 'left') && leftArm.current) {
          const swing = Math.sin(t + Math.PI * 0.95) * amp * armDrive;
          leftArm.current.rotation.x = swing;
          leftArm.current.rotation.z = swing * 0.25;
          if (leftForearm.current) {
            leftForearm.current.rotation.x = -Math.max(0, Math.sin(t + Math.PI)) * 0.45;
          }
        } else {
          if (leftArm.current) {
            leftArm.current.rotation.x = 0;
            leftArm.current.rotation.z = 0;
          }
          if (leftForearm.current) leftForearm.current.rotation.x = 0;
        }
        if ((armSwingMode === 'both' || armSwingMode === 'right') && rightArm.current) {
          const swing = Math.sin(t * 1.03) * amp * armDrive;
          rightArm.current.rotation.x = swing;
          rightArm.current.rotation.z = -swing * 0.25;
          if (rightForearm.current) {
            rightForearm.current.rotation.x = -Math.max(0, Math.sin(t)) * 0.45;
          }
        } else {
          if (rightArm.current) {
            rightArm.current.rotation.x = 0;
            rightArm.current.rotation.z = 0;
          }
          if (rightForearm.current) rightForearm.current.rotation.x = 0;
        }
      }
    }
    
    if (bodyGroup.current) {
      // Bobbing
      const breathing = Math.sin(state.clock.elapsedTime * 1.6) * 0.02;
      const runBob = Math.abs(Math.sin(t * 2)) * (isSprinting ? 0.1 : 0.04);
      const jumpLiftBase = Math.sin(Math.min(1, jumpT) * Math.PI) * 0.08;
      const jumpLift = jumping ? jumpLiftBase * (1 + animationBoost * 0.35 + jumpBoost * 0.3) : 0;
      const crouch = -anticipate * 0.08;
      const settle = -landing * 0.06 * Math.sin((1 - landing) * Math.PI);
      const sway = isWalking ? Math.sin(t) * (isSprinting ? 0.05 : 0.03) : 0;
      bodyGroup.current.position.y = (isWalking ? runBob : breathing) + jumpLift + crouch + settle;
      
      // Sprinting lean
      const targetRotationX = isSprinting ? 0.55 : 0;
      const idleLean = !isWalking ? Math.sin(state.clock.elapsedTime * 0.6) * 0.02 : 0;
      const jumpTilt = jumping ? (-0.15 + jumpT * 0.2) : 0;
      const crouchTilt = anticipate * 0.22;
      const landTilt = -landing * 0.18;
      bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, targetRotationX + idleLean + jumpTilt + crouchTilt + landTilt, 0.12);
      bodyGroup.current.rotation.z = THREE.MathUtils.lerp(bodyGroup.current.rotation.z, sway, 0.1);
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
          blinkCooldown.current = 10 + Math.random() * 20;
        }
      } else {
        if (upperLidLeft.current) upperLidLeft.current.scale.y = 1;
        if (upperLidRight.current) upperLidRight.current.scale.y = 1;
        if (lowerLidLeft.current) lowerLidLeft.current.scale.y = 1;
        if (lowerLidRight.current) lowerLidRight.current.scale.y = 1;
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

        {/* Torso / Robe */}
        {isFemale ? (
          <group>
            <mesh position={[0, 1.05, 0]} castShadow>
              <coneGeometry args={[0.55 * femaleRobeSpread, 1.2, 10]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} map={damaskMap ?? undefined} />
            </mesh>
            <mesh position={[0, 1.35, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.28, 0.35, 10]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} map={damaskMap ?? undefined} />
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
              <meshStandardMaterial color={color} roughness={clothRoughness} map={damaskMap ?? undefined} />
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
                <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
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
            <mesh position={[-0.24, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <mesh position={[0.24, 1.34, 0]} castShadow>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <group ref={leftArm} position={[-0.28, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial color={upperArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
            <group ref={leftForearm} position={[0, -0.18, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              <mesh castShadow>
                <cylinderGeometry args={[0.05, 0.05, 0.32, 8]} />
                  <meshStandardMaterial color={lowerArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
              <mesh position={[0, -0.16, 0]} castShadow>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
            </group>
            </group>
            <group ref={rightArm} position={[0.28, 1.14, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.36, 8]} />
              <meshStandardMaterial color={upperArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
            <group ref={rightForearm} position={[0, -0.18, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              <mesh castShadow>
                <cylinderGeometry args={[0.05, 0.05, 0.32, 8]} />
                  <meshStandardMaterial color={lowerArmColor} roughness={sleeveCoverage === 'none' ? 0.9 : clothRoughness} />
              </mesh>
              <mesh position={[0, -0.16, 0]} castShadow>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
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
          <group>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.35, 0.9, 8]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0, 0.7, 0]} castShadow>
              <boxGeometry args={[0.5, 0.5, 0.3]} />
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
            <mesh position={[0, 0.55, 0.16]} castShadow>
              <boxGeometry args={[0.32, 0.25, 0.05]} />
              <meshStandardMaterial color={robeAccentColor} roughness={accentRoughness} />
            </mesh>
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
          <mesh position={[0, 0.95, 0]} castShadow>
            <torusGeometry args={[isFemale ? 0.42 : 0.28, 0.04, 8, 16]} />
            <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
          </mesh>
        )}
        {robeHasSash && (
          <mesh ref={sashFrontRef} position={[0, 0.95, 0.2]} castShadow>
            <boxGeometry args={[isFemale ? 0.25 : 0.2, 0.15, 0.02]} />
            <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
          </mesh>
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
        <group position={[0, 1.75, 0]}>
          <mesh castShadow scale={[1.15, 1.1, 0.9]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          <mesh position={[0, 0.0, 0.085]} scale={[1.05, 1.05, 0.45]} castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          {hasShortHair && (
            <>
              <mesh position={[-0.19, -0.02, 0.02]} castShadow>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
              <mesh position={[0.19, -0.02, 0.02]} castShadow>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
            </>
          )}
          {/* Hair */}
          {headwearStyle === 'none' && hairStyle !== 'covered' && (
            <group>
              <mesh position={[0, 0.16, -0.08]} castShadow>
                <sphereGeometry args={[0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.18, 0.02]} castShadow>
                <boxGeometry args={[0.1, 0.012, 0.03]} />
                <meshStandardMaterial color={hairColor} roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.07, -0.16]} castShadow>
                <sphereGeometry args={[0.18, 10, 10]} />
                <meshStandardMaterial color={hairColor} roughness={0.92} />
              </mesh>
              {(hairStyle === 'medium' || hairStyle === 'long') && (
                <>
                  <mesh position={[-0.16, -0.01, -0.04]} castShadow>
                    <boxGeometry args={[0.05, 0.18, 0.1]} />
                    <meshStandardMaterial color={hairColor} roughness={0.9} />
                  </mesh>
                  <mesh position={[0.16, -0.01, -0.04]} castShadow>
                    <boxGeometry args={[0.05, 0.18, 0.1]} />
                    <meshStandardMaterial color={hairColor} roughness={0.9} />
                  </mesh>
                </>
              )}
              {hairStyle === 'long' && (
                <>
                  <mesh position={[-0.14, -0.18, -0.14]} rotation={[0.05, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.28, 0.1]} />
                    <meshStandardMaterial color={hairColor} roughness={0.92} />
                  </mesh>
                  <mesh position={[0.14, -0.18, -0.14]} rotation={[0.05, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.28, 0.1]} />
                    <meshStandardMaterial color={hairColor} roughness={0.92} />
                  </mesh>
                  <mesh position={[0, -0.16, -0.22]} castShadow>
                    <boxGeometry args={[0.16, 0.26, 0.1]} />
                    <meshStandardMaterial color={hairColor} roughness={0.92} />
                  </mesh>
                </>
              )}
            </group>
          )}
          {/* PERFORMANCE: Facial details only rendered for NPCs within 25 units */}
          {showFacialDetails && (
            <>
              {/* Eyebrows */}
              <mesh position={[-0.055, 0.08, 0.165]} rotation={[0, 0, isFemale ? -0.1 : -0.08]} castShadow>
                <boxGeometry args={[0.05, browHeight, 0.02]} />
                <meshStandardMaterial color={browColor} roughness={1} />
              </mesh>
              <mesh position={[0.055, 0.08, 0.165]} rotation={[0, 0, isFemale ? 0.1 : 0.08]} castShadow>
                <boxGeometry args={[0.05, browHeight, 0.02]} />
                <meshStandardMaterial color={browColor} roughness={1} />
              </mesh>
              {/* Eye whites */}
              <mesh position={[-0.055, eyeY, 0.195]} scale={eyeScale} castShadow>
                <planeGeometry args={[0.05, 0.03]} />
                <meshStandardMaterial color="#f2efe8" roughness={1} />
              </mesh>
              <mesh position={[0.055, eyeY, 0.195]} scale={eyeScale} castShadow>
                <planeGeometry args={[0.05, 0.03]} />
                <meshStandardMaterial color="#f2efe8" roughness={1} />
              </mesh>
              {/* Eye irises */}
              <mesh position={[-0.055, eyeY, 0.202]} castShadow>
                <planeGeometry args={[0.018, 0.018]} />
                <meshStandardMaterial color={eyeColor} roughness={1} />
              </mesh>
              <mesh position={[0.055, eyeY, 0.202]} castShadow>
                <planeGeometry args={[0.018, 0.018]} />
                <meshStandardMaterial color={eyeColor} roughness={1} />
              </mesh>
              {/* Eye pupils */}
              <mesh position={[-0.055, eyeY, 0.206]} castShadow>
                <planeGeometry args={[0.015, 0.015]} />
                <meshStandardMaterial color="#2a2a2a" roughness={1} />
              </mesh>
              <mesh position={[0.055, eyeY, 0.206]} castShadow>
                <planeGeometry args={[0.015, 0.015]} />
                <meshStandardMaterial color="#2a2a2a" roughness={1} />
              </mesh>
              {/* Eyelids */}
              <mesh ref={upperLidLeft} position={[-0.055, eyeY + 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.012]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={upperLidRight} position={[0.055, eyeY + 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.012]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLidLeft} position={[-0.055, eyeY - 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.01]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              <mesh ref={lowerLidRight} position={[0.055, eyeY - 0.018, 0.193]} castShadow>
                <planeGeometry args={[0.05, 0.01]} />
                <meshStandardMaterial color={faceShadowColor} roughness={1} />
              </mesh>
              {/* Eyelashes (female only) */}
              {isFemale && (
                <>
                  <mesh position={[-0.055, eyeY + 0.025, 0.194]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                  <mesh position={[0.055, eyeY + 0.025, 0.194]} castShadow>
                    <boxGeometry args={[0.05, 0.006, 0.01]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={1} />
                  </mesh>
                </>
              )}
              {/* Tear ducts */}
              <mesh position={[-0.068, eyeY - 0.008, 0.207]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              <mesh position={[0.042, eyeY - 0.008, 0.207]} castShadow>
                <planeGeometry args={[0.006, 0.006]} />
                <meshStandardMaterial color="#cfa88c" roughness={1} />
              </mesh>
              {/* Lips */}
              <mesh position={[0, mouthY, 0.175]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale, 0.012, 0.015]} />
                <meshStandardMaterial color={lipUpperColor} roughness={1} />
              </mesh>
              <mesh position={[0, mouthY - 0.012, 0.175]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * lipLowerScale, 0.014, 0.015]} />
                <meshStandardMaterial color={lipColor} roughness={1} />
              </mesh>
              <mesh position={[0, mouthY - lipGap, 0.176]} castShadow>
                <boxGeometry args={[mouthWidth * lipWidthScale * 0.9, 0.004, 0.01]} />
                <meshStandardMaterial color={lipColor} roughness={1} />
              </mesh>
              {/* Nose */}
              <mesh position={[0, -0.01, 0.195]} castShadow>
                <coneGeometry args={[noseRadius, noseLength, 8]} />
                <meshStandardMaterial color={headColor} roughness={1} />
              </mesh>
            </>
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
              <mesh position={[0, 0.22, -0.01]} rotation={[0, 0.05, 0]} castShadow>
                <torusGeometry args={[0.26, 0.11, 12, 20]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.27, -0.01]} rotation={[0, -0.04, 0]} castShadow>
                <torusGeometry args={[0.23, 0.1, 12, 20]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>
              <mesh position={[0, 0.32, -0.01]} rotation={[0, 0.03, 0]} castShadow>
                <torusGeometry args={[0.2, 0.09, 12, 20]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.37, -0.01]} rotation={[0, -0.02, 0]} castShadow>
                <torusGeometry args={[0.17, 0.08, 12, 20]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.82} />
              </mesh>
              <mesh position={[0, 0.15, 0.12]} castShadow>
                <boxGeometry args={[0.26, 0.08, 0.02]} />
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

        {/* Arms (static for performance) */}
        {!isFemale && (
          <>
            {/* Shoulders */}
            <mesh position={[-0.3, 1.34, 0]} castShadow>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <mesh position={[0.3, 1.34, 0]} castShadow>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <group ref={leftArm} position={[-0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial color={upperArmColor} />
              </mesh>
            <group ref={leftForearm} position={[0, -0.2, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              <mesh castShadow>
                <cylinderGeometry args={[0.06, 0.06, 0.38, 8]} />
                <meshStandardMaterial color={lowerArmColor} />
              </mesh>
              <mesh position={[0, -0.19, 0]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
            </group>
            </group>
            <group ref={rightArm} position={[0.38, 1.12, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.44, 8]} />
                <meshStandardMaterial color={upperArmColor} />
              </mesh>
            <group ref={rightForearm} position={[0, -0.2, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={upperArmColor} roughness={0.9} />
              </mesh>
              <mesh castShadow>
                <cylinderGeometry args={[0.06, 0.06, 0.38, 8]} />
                <meshStandardMaterial color={lowerArmColor} />
              </mesh>
              <mesh position={[0, -0.19, 0]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={headColor} roughness={0.9} />
              </mesh>
            </group>
            </group>
          </>
        )}

        {/* Legs */}
        {!isFemale && (
          <>
            <group ref={leftLeg} position={[-0.15, 0.45, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.8, 0.15]} />
                <meshStandardMaterial color={color} />
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
            <group ref={rightLeg} position={[0.15, 0.45, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.8, 0.15]} />
                <meshStandardMaterial color={color} />
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
          </>
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
