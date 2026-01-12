/**
 * AtmosphericDust.tsx
 *
 * Floating dust/pollen particles that catch sunlight.
 * Creates atmosphere for a medieval desert city.
 *
 * EASY TO DISABLE: Just remove or comment out the <AtmosphericDust /> component
 * in Environment.tsx, or set enabled={false}
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AtmosphericDustProps {
  /** Center position for dust cloud (usually player position) */
  centerPosition?: THREE.Vector3;
  /** Time of day (0-24) for sun angle and lighting */
  timeOfDay?: number;
  /** Number of particles (default 200) */
  particleCount?: number;
  /** Radius of dust cloud around center (default 25) */
  radius?: number;
  /** Enable/disable the effect */
  enabled?: boolean;
}

// Seeded random for consistent particle distribution
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const AtmosphericDust: React.FC<AtmosphericDustProps> = ({
  centerPosition,
  timeOfDay = 12,
  particleCount = 250,
  radius = 30,
  enabled = true,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  // Pre-calculate particle properties (position offsets, speeds, phases)
  const particleData = useMemo(() => {
    const data: Array<{
      offset: THREE.Vector3;
      speed: number;
      phase: number;
      size: number;
      driftSpeed: THREE.Vector3;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1.618033988749; // Golden ratio for good distribution

      // Distribute particles in a cylinder around center
      const angle = seededRandom(seed) * Math.PI * 2;
      const dist = Math.sqrt(seededRandom(seed + 100)) * radius; // sqrt for even distribution
      const height = seededRandom(seed + 200) * 8 + 0.5; // 0.5 to 8.5 units high

      data.push({
        offset: new THREE.Vector3(
          Math.cos(angle) * dist,
          height,
          Math.sin(angle) * dist
        ),
        speed: 0.3 + seededRandom(seed + 300) * 0.4, // Floating speed
        phase: seededRandom(seed + 400) * Math.PI * 2, // Animation phase offset
        size: 0.008 + seededRandom(seed + 500) * 0.012, // Subtle: 0.008 to 0.02 units
        driftSpeed: new THREE.Vector3(
          (seededRandom(seed + 600) - 0.5) * 0.02,
          (seededRandom(seed + 700) - 0.5) * 0.01,
          (seededRandom(seed + 800) - 0.5) * 0.02
        ),
      });
    }
    return data;
  }, [particleCount, radius]);

  // Calculate sun direction and dust visibility based on time
  const { sunDirection, dustBrightness, dustColor } = useMemo(() => {
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI; // 6am = 0, 6pm = PI
    const sunElevation = Math.sin(sunAngle);
    const sunAzimuth = Math.cos(sunAngle);

    // Sun direction (east to west arc)
    const sunDir = new THREE.Vector3(
      sunAzimuth,
      Math.max(0.1, sunElevation),
      0.3
    ).normalize();

    // Dust is most visible in golden hour (low sun = longer path through dust)
    // Peak visibility at sunrise/sunset, lower at noon
    const goldenHourFactor = 1 - Math.abs(sunElevation - 0.3) * 1.2;
    const brightness = Math.max(0.2, Math.min(1, goldenHourFactor)) *
      (sunElevation > 0 ? 1 : 0.1); // Very dim at night

    // Color shifts from warm gold at sunrise/sunset to pale at noon
    const warmth = 1 - Math.min(1, sunElevation * 1.5);
    const color = new THREE.Color().setHSL(
      0.1 + warmth * 0.05, // Hue: more orange when sun is low
      0.3 + warmth * 0.4,  // Saturation: more saturated at golden hour
      0.7 + sunElevation * 0.2 // Lightness: brighter when sun is higher
    );

    return { sunDirection: sunDir, dustBrightness: brightness, dustColor: color };
  }, [timeOfDay]);

  // Create material that glows when catching light
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: dustColor,
      transparent: true,
      opacity: 0.65,
      depthWrite: false, // Prevents z-fighting
      side: THREE.DoubleSide,
    });
  }, [dustColor]);

  // Update material color when lighting changes
  useMemo(() => {
    if (material) {
      material.color = dustColor;
      material.opacity = 0.4 + dustBrightness * 0.4;
    }
  }, [material, dustColor, dustBrightness]);

  // Animate particles
  useFrame((state, delta) => {
    if (!meshRef.current || !enabled) return;

    timeRef.current += delta;
    const time = timeRef.current;
    const center = centerPosition || new THREE.Vector3(0, 0, 0);
    const cameraPos = state.camera.position;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempScale = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();

    // Make particles face camera (billboard)
    tempQuaternion.copy(state.camera.quaternion);

    for (let i = 0; i < particleCount; i++) {
      const particle = particleData[i];

      // Base position relative to center
      tempPosition.copy(particle.offset).add(center);

      // Gentle floating motion
      const floatY = Math.sin(time * particle.speed + particle.phase) * 0.3;
      const floatX = Math.sin(time * particle.speed * 0.7 + particle.phase) * 0.15;
      const floatZ = Math.cos(time * particle.speed * 0.5 + particle.phase) * 0.15;

      tempPosition.x += floatX + particle.driftSpeed.x * time;
      tempPosition.y += floatY;
      tempPosition.z += floatZ + particle.driftSpeed.z * time;

      // Wrap particles that drift too far (seamless recycling)
      const dx = tempPosition.x - center.x;
      const dz = tempPosition.z - center.z;
      const distFromCenter = Math.sqrt(dx * dx + dz * dz);
      if (distFromCenter > radius * 1.2) {
        // Reset to opposite side
        const angle = Math.atan2(dz, dx) + Math.PI;
        tempPosition.x = center.x + Math.cos(angle) * radius * 0.8;
        tempPosition.z = center.z + Math.sin(angle) * radius * 0.8;
        particle.offset.x = tempPosition.x - center.x;
        particle.offset.z = tempPosition.z - center.z;
      }

      // Distance from camera - particles closer than 8 units get scaled down
      const distToCamera = tempPosition.distanceTo(cameraPos);
      const distanceScale = distToCamera < 8
        ? 0.3 + (distToCamera / 8) * 0.7  // Scale from 30% to 100% within 8 units
        : 1.0;

      // Size pulsing (subtle shimmer as particles rotate/catch light)
      const shimmer = 0.8 + Math.sin(time * 3 + particle.phase * 2) * 0.2;
      const size = particle.size * shimmer * distanceScale * (0.8 + dustBrightness * 0.4);
      tempScale.set(size, size * 0.6, size); // Slightly flattened for mote-like appearance

      // Build transform matrix with billboard rotation
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

      meshRef.current.setMatrixAt(i, tempMatrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, particleCount]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 4, 4]} />
      <primitive object={material} />
    </instancedMesh>
  );
};

export default AtmosphericDust;
