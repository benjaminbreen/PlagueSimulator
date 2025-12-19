
import React, { useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
  hairStyle?: 'short' | 'medium' | 'long' | 'covered';
  headwearStyle?: 'scarf' | 'cap' | 'turban' | 'none';
  sleeveCoverage?: 'full' | 'lower' | 'none';
  footwearStyle?: 'sandals' | 'shoes' | 'bare';
  footwearColor?: string;
  accessories?: string[];
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
  hairStyle: hairStyleProp,
  headwearStyle: headwearStyleProp,
  sleeveCoverage = robeSleeves ? 'full' : 'none',
  footwearStyle = 'sandals',
  footwearColor = '#9b7b4f',
  accessories = []
}) => {
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
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
  const turbanHighlight = useMemo(() => new THREE.Color(turbanColor).multiplyScalar(1.08).getStyle(), [turbanColor]);
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

    const effectiveWalkSpeed = isSprinting ? walkSpeed * 1.8 : walkSpeed;
    const t = state.clock.elapsedTime * effectiveWalkSpeed;
    const amp = isWalking ? (isSprinting ? 0.6 : 0.4) : 0;
    
    // Leg swinging only for simpler animation
    if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t) * amp;
    if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t + Math.PI) * amp;
    if (enableArmSwing) {
      if ((armSwingMode === 'both' || armSwingMode === 'left') && leftArm.current) {
        const swing = Math.sin(t + Math.PI) * amp;
        leftArm.current.rotation.x = swing;
        leftArm.current.rotation.z = swing * 0.2;
        if (leftForearm.current) {
          leftForearm.current.rotation.x = -Math.max(0, Math.sin(t + Math.PI)) * 0.4;
        }
      } else {
        if (leftArm.current) {
          leftArm.current.rotation.x = 0;
          leftArm.current.rotation.z = 0;
        }
        if (leftForearm.current) leftForearm.current.rotation.x = 0;
      }
      if ((armSwingMode === 'both' || armSwingMode === 'right') && rightArm.current) {
        const swing = Math.sin(t) * amp;
        rightArm.current.rotation.x = swing;
        rightArm.current.rotation.z = -swing * 0.2;
        if (rightForearm.current) {
          rightForearm.current.rotation.x = -Math.max(0, Math.sin(t)) * 0.4;
        }
      } else {
        if (rightArm.current) {
          rightArm.current.rotation.x = 0;
          rightArm.current.rotation.z = 0;
        }
        if (rightForearm.current) rightForearm.current.rotation.x = 0;
      }
    }
    
    if (bodyGroup.current) {
      // Bobbing
      const breathing = Math.sin(state.clock.elapsedTime * 1.6) * 0.02;
      bodyGroup.current.position.y = isWalking ? Math.abs(Math.sin(t * 2)) * (isSprinting ? 0.1 : 0.05) : breathing;
      
      // Sprinting lean
      const targetRotationX = isSprinting ? 0.3 : 0;
      const idleLean = !isWalking ? Math.sin(state.clock.elapsedTime * 0.6) * 0.02 : 0;
      bodyGroup.current.rotation.x = THREE.MathUtils.lerp(bodyGroup.current.rotation.x, targetRotationX + idleLean, 0.1);
      const sway = isWalking ? Math.sin(t) * 0.03 : 0;
      bodyGroup.current.rotation.z = THREE.MathUtils.lerp(bodyGroup.current.rotation.z, sway, 0.1);
    }

    // Blinking
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
  });

  return (
    <group scale={scale}>
      <group ref={bodyGroup}>
        {!isDead && (
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
              <meshStandardMaterial color={color} roughness={clothRoughness} />
            </mesh>
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
              <mesh position={[0, 0.95, 0.3]} castShadow>
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
              <mesh position={[0, 0.9, 0.24]} castShadow>
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
          <mesh position={[0, 0.95, 0.2]} castShadow>
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
          {/* Face details */}
          <mesh position={[-0.055, 0.08, 0.165]} rotation={[0, 0, isFemale ? -0.1 : -0.08]} castShadow>
            <boxGeometry args={[0.05, browHeight, 0.02]} />
            <meshStandardMaterial color={browColor} roughness={1} />
          </mesh>
          <mesh position={[0.055, 0.08, 0.165]} rotation={[0, 0, isFemale ? 0.1 : 0.08]} castShadow>
            <boxGeometry args={[0.05, browHeight, 0.02]} />
            <meshStandardMaterial color={browColor} roughness={1} />
          </mesh>
          <mesh position={[-0.055, eyeY, 0.195]} scale={eyeScale} castShadow>
            <planeGeometry args={[0.05, 0.03]} />
            <meshStandardMaterial color="#f2efe8" roughness={1} />
          </mesh>
          <mesh position={[0.055, eyeY, 0.195]} scale={eyeScale} castShadow>
            <planeGeometry args={[0.05, 0.03]} />
            <meshStandardMaterial color="#f2efe8" roughness={1} />
          </mesh>
          <mesh position={[-0.055, eyeY, 0.202]} castShadow>
            <planeGeometry args={[0.018, 0.018]} />
            <meshStandardMaterial color={eyeColor} roughness={1} />
          </mesh>
          <mesh position={[0.055, eyeY, 0.202]} castShadow>
            <planeGeometry args={[0.018, 0.018]} />
            <meshStandardMaterial color={eyeColor} roughness={1} />
          </mesh>
          <mesh position={[-0.055, eyeY, 0.206]} castShadow>
            <planeGeometry args={[0.015, 0.015]} />
            <meshStandardMaterial color="#2a2a2a" roughness={1} />
          </mesh>
          <mesh position={[0.055, eyeY, 0.206]} castShadow>
            <planeGeometry args={[0.015, 0.015]} />
            <meshStandardMaterial color="#2a2a2a" roughness={1} />
          </mesh>
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
          <mesh position={[-0.068, eyeY - 0.008, 0.207]} castShadow>
            <planeGeometry args={[0.006, 0.006]} />
            <meshStandardMaterial color="#cfa88c" roughness={1} />
          </mesh>
          <mesh position={[0.042, eyeY - 0.008, 0.207]} castShadow>
            <planeGeometry args={[0.006, 0.006]} />
            <meshStandardMaterial color="#cfa88c" roughness={1} />
          </mesh>
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
          <mesh position={[0, -0.01, 0.195]} castShadow>
            <coneGeometry args={[noseRadius, noseLength, 8]} />
            <meshStandardMaterial color={headColor} roughness={1} />
          </mesh>
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
            <mesh position={[0, 0.1, -0.02]} castShadow>
              <sphereGeometry args={[0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={turbanColor} roughness={0.85} />
            </mesh>
          )}
          {headwearStyle === 'turban' && (
            <group>
              <mesh position={[0, 0.12, -0.01]} castShadow>
                <torusGeometry args={[0.14, 0.07, 10, 16]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.14, -0.01]} castShadow>
                <torusGeometry args={[0.12, 0.06, 10, 16]} />
                <meshStandardMaterial color={turbanHighlight} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.18, -0.01]} castShadow>
                <torusGeometry args={[0.1, 0.05, 10, 16]} />
                <meshStandardMaterial color={turbanColor} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.05, 0.11]} castShadow>
                <boxGeometry args={[0.16, 0.05, 0.02]} />
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
            <mesh ref={leftLeg} position={[-0.15, 0.45, 0]} castShadow>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh ref={rightLeg} position={[0.15, 0.45, 0]} castShadow>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {footwearStyle !== 'bare' && (
              <>
                <mesh position={[-0.15, 0.05, 0.1]} castShadow>
                  <boxGeometry args={[0.18, 0.06, 0.28]} />
                  <meshStandardMaterial color={footwearColor} roughness={0.9} />
                </mesh>
                <mesh position={[0.15, 0.05, 0.1]} castShadow>
                  <boxGeometry args={[0.18, 0.06, 0.28]} />
                  <meshStandardMaterial color={footwearColor} roughness={0.9} />
                </mesh>
              </>
            )}
            {footwearStyle === 'sandals' && (
              <>
                <mesh position={[-0.15, 0.08, 0.08]} castShadow>
                  <boxGeometry args={[0.14, 0.02, 0.08]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
                <mesh position={[0.15, 0.08, 0.08]} castShadow>
                  <boxGeometry args={[0.14, 0.02, 0.08]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
              </>
            )}
          </>
        )}
        {isFemale && (
          <>
            {footwearStyle !== 'bare' && (
              <>
                <mesh position={[-0.12, 0.05, 0.1]} castShadow>
                  <boxGeometry args={[0.16, 0.05, 0.22]} />
                  <meshStandardMaterial color={footwearColor} roughness={0.9} />
                </mesh>
                <mesh position={[0.12, 0.05, 0.1]} castShadow>
                  <boxGeometry args={[0.16, 0.05, 0.22]} />
                  <meshStandardMaterial color={footwearColor} roughness={0.9} />
                </mesh>
              </>
            )}
            {footwearStyle === 'sandals' && (
              <>
                <mesh position={[-0.12, 0.08, 0.08]} castShadow>
                  <boxGeometry args={[0.12, 0.02, 0.06]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
                <mesh position={[0.12, 0.08, 0.08]} castShadow>
                  <boxGeometry args={[0.12, 0.02, 0.06]} />
                  <meshStandardMaterial color="#5c432a" roughness={0.9} />
                </mesh>
              </>
            )}
          </>
        )}
      </group>
    </group>
  );
});
