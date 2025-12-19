
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
  robeOverwrap
}) => {
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
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
  const hasShortHair = useMemo(() => !isFemale && Math.random() > 0.5, [isFemale]);
  const lipWidthScale = useMemo(() => 0.95 + Math.random() * 0.15, []);
  const lipLowerScale = useMemo(() => 1.08 + Math.random() * 0.18, []);
  const lipGap = useMemo(() => 0.006 + Math.random() * 0.004, []);
  const headwearShadow = useMemo(() => new THREE.Color(headscarfColor).multiplyScalar(0.85).getStyle(), [headscarfColor]);
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
    const amp = isWalking ? (isSprinting ? 0.6 : 0.4) : 0.02;
    
    // Leg swinging only for simpler animation
    if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t) * amp;
    if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t + Math.PI) * amp;
    if (enableArmSwing) {
      if ((armSwingMode === 'both' || armSwingMode === 'left') && leftArm.current) {
        leftArm.current.rotation.x = Math.sin(t + Math.PI) * amp;
      }
      if ((armSwingMode === 'both' || armSwingMode === 'right') && rightArm.current) {
        rightArm.current.rotation.x = Math.sin(t) * amp;
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
              <meshStandardMaterial color={color} roughness={0.92} />
            </mesh>
            <mesh position={[0, 1.35, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.28, 0.35, 10]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.05, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.7, 10]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.95} />
            </mesh>
            {robeOverwrap && (
              <mesh position={[0, 1.05, 0.08]} castShadow>
                <coneGeometry args={[0.62 * femaleRobeSpread, 1.05, 10]} />
                <meshStandardMaterial color={robeAccentColor} roughness={0.95} />
              </mesh>
            )}
            <mesh position={[0, 0.6, 0]} castShadow>
              <coneGeometry args={[0.75 * femaleRobeSpread, 0.9, 12]} />
              <meshStandardMaterial color={color} roughness={0.94} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.78 * femaleRobeSpread, 0.78 * femaleRobeSpread, 0.1, 12]} />
              <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
            </mesh>
            {robeHasSash && (
              <mesh position={[0, 0.95, 0]} castShadow>
                <torusGeometry args={[0.38 * femaleRobeSpread, 0.035, 8, 16]} />
                <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
              </mesh>
            )}
            {femaleRobeBand && (
              <mesh position={[0, 1.35, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 0.1, 10]} />
                <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
              </mesh>
            )}
            {robeHasTrim && (
              <mesh position={[0, 0.95, 0.3]} castShadow>
                <boxGeometry args={[0.1, 1.4, 0.02]} />
                <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
              </mesh>
            )}
            <mesh ref={leftArm} position={[-0.26, 1.22, 0.02]} castShadow>
              <boxGeometry args={[0.12, 0.6, 0.14]} />
              <meshStandardMaterial color={robeSleeves ? color : headColor} roughness={0.9} />
            </mesh>
            <mesh ref={rightArm} position={[0.26, 1.22, 0.02]} castShadow>
              <boxGeometry args={[0.12, 0.6, 0.14]} />
              <meshStandardMaterial color={robeSleeves ? color : headColor} roughness={0.9} />
            </mesh>
            <mesh position={[-0.22, 1.32, 0]} castShadow>
              <boxGeometry args={[0.14, 0.16, 0.16]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <mesh position={[0.22, 1.32, 0]} castShadow>
              <boxGeometry args={[0.14, 0.16, 0.16]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
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
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.7, 0]} castShadow>
              <boxGeometry args={[0.5, 0.5, 0.3]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            {robeHasTrim && (
              <mesh position={[0, 0.9, 0.24]} castShadow>
                <boxGeometry args={[0.08, 0.9, 0.02]} />
                <meshStandardMaterial color={robeAccentColor} roughness={0.9} />
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
        
        {/* Head */}
        <group position={[0, 1.75, 0]}>
          <mesh castShadow scale={[1, 1.1, 0.95]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
          <mesh position={[0, 0.0, 0.085]} scale={[0.95, 1.05, 0.5]} castShadow>
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
          {!isFemale && (
            <group>
              <mesh position={[0, 0.11, -0.02]} castShadow>
                <sphereGeometry args={[0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.06, -0.1]} castShadow>
                <sphereGeometry args={[0.19, 10, 10]} />
                <meshStandardMaterial color={hairColor} roughness={0.92} />
              </mesh>
              <mesh position={[0, 0.14, 0.05]} castShadow>
                <boxGeometry args={[0.12, 0.02, 0.04]} />
                <meshStandardMaterial color={hairColor} roughness={0.95} />
              </mesh>
              <mesh position={[-0.13, 0.02, -0.02]} castShadow>
                <boxGeometry args={[0.05, 0.1, 0.16]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
              <mesh position={[0.13, 0.02, -0.02]} castShadow>
                <boxGeometry args={[0.05, 0.1, 0.16]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
              <mesh position={[0, -0.06, 0.12]} castShadow>
                <boxGeometry args={[0.1, 0.04, 0.02]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
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
          <mesh position={[-0.055, eyeY, 0.206]} castShadow>
            <planeGeometry args={[0.015, 0.015]} />
            <meshStandardMaterial color="#2a2a2a" roughness={1} />
          </mesh>
          <mesh position={[0.055, eyeY, 0.206]} castShadow>
            <planeGeometry args={[0.015, 0.015]} />
            <meshStandardMaterial color="#2a2a2a" roughness={1} />
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
          {isFemale ? (
            <group>
              <mesh position={[0, 0.08, -0.02]} castShadow>
                <sphereGeometry args={[0.22, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={headscarfColor} roughness={0.92} />
              </mesh>
              <mesh position={[0, -0.14, -0.22]} rotation={[0.2, 0, 0]} castShadow>
                <boxGeometry args={[0.28, 0.26, 0.02]} />
                <meshStandardMaterial color={headwearShadow} roughness={0.95} />
              </mesh>
            </group>
          ) : (
            <mesh position={[0, 0.1, 0]} castShadow>
              <torusGeometry args={[0.12, 0.08, 8, 12]} />
              <meshStandardMaterial color={turbanColor} />
            </mesh>
          )}
        </group>

        {/* Arms (static for performance) */}
        {!isFemale && (
          <>
            {/* Shoulders */}
            <mesh position={[-0.3, 1.28, 0]} castShadow>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <mesh position={[0.3, 1.28, 0]} castShadow>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <mesh ref={leftArm} position={[-0.38, 1.1, 0]} castShadow>
              <boxGeometry args={[0.14, 0.75, 0.14]} />
              <meshStandardMaterial color={robeSleeves ? color : headColor} />
            </mesh>
            <mesh ref={rightArm} position={[0.38, 1.1, 0]} castShadow>
              <boxGeometry args={[0.14, 0.75, 0.14]} />
              <meshStandardMaterial color={robeSleeves ? color : headColor} />
            </mesh>
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
          </>
        )}
      </group>
    </group>
  );
});
