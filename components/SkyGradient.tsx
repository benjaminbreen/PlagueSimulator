import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

interface SkyGradientProps {
  timeOfDay: number;
  weatherType: 'CLEAR' | 'OVERCAST' | 'SANDSTORM';
  cloudCover?: number;
}

export const SkyGradient: React.FC<SkyGradientProps> = ({
  timeOfDay,
  weatherType,
  cloudCover = 0
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Sky dome geometry - inverted sphere (render inside)
  const geometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(500, 32, 15);
    geom.scale(-1, 1, 1); // Flip inside-out
    return geom;
  }, []);

  // Custom shader material for gradient
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        zenithColor: { value: new THREE.Color(0x87ceeb) },      // Top of sky
        horizonColor: { value: new THREE.Color(0xe8d4b8) },     // At horizon
        sunDirection: { value: new THREE.Vector3(0, 1, 0) },
        sunIntensity: { value: 0.0 },
        atmosphericDensity: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 zenithColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDirection;
        uniform float atmosphericDensity;
        uniform float sunIntensity;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          // Vertical gradient: 0 at horizon, 1 at zenith
          vec3 viewDir = normalize(vWorldPosition - cameraPosition);
          float elevation = viewDir.y; // -1 (down) to +1 (up)

          // Smooth gradient from horizon to zenith
          float gradientFactor = smoothstep(-0.1, 0.8, elevation);

          // Base sky color
          vec3 skyColor = mix(horizonColor, zenithColor, gradientFactor);

          // Atmospheric scattering near horizon (more haze)
          float horizonGlow = pow(1.0 - abs(elevation), 2.5);
          skyColor = mix(skyColor, horizonColor, horizonGlow * atmosphericDensity * 0.4);

          // Sun glow effect
          float sunDot = max(0.0, dot(viewDir, sunDirection));
          float sunGlow = pow(sunDot, 32.0) * sunIntensity;
          vec3 sunColor = vec3(1.0, 0.95, 0.85);
          skyColor += sunGlow * sunColor;

          // Subtle horizon warmth near sunrise/sunset
          float horizonBand = smoothstep(-0.05, 0.1, elevation) * (1.0 - smoothstep(0.2, 0.45, sunIntensity));
          vec3 warmBand = vec3(1.0, 0.78, 0.55);
          skyColor = mix(skyColor, warmBand, horizonBand * 0.2);

          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
  }, []);

  // Update colors based on time of day
  useFrame(() => {
    if (!meshRef.current) return;
    const time = timeOfDay;
    const sunAngle = (time / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const dayFactor = smoothstep(-0.1, 0.35, elevation);
    const twilightFactor = smoothstep(-0.35, 0.05, elevation) * (1 - dayFactor);
    const nightFactor = 1 - smoothstep(-0.45, 0.1, elevation);

    // TIME-OF-DAY SKY COLORS
    let zenith, horizon;

    if (weatherType === 'SANDSTORM') {
      // Dusty ochre sky
      zenith = new THREE.Color(0x8b6b3c);
      horizon = new THREE.Color(0xc9a876);
    } else if (weatherType === 'OVERCAST') {
      // Gray overcast
      zenith = new THREE.Color(0x8a98a8);
      horizon = new THREE.Color(0xa8b8c8);
    } else {
      // CLEAR SKY - dynamic gradients
      if (nightFactor > 0.7) {
        // Night: deep blue-black
        zenith = new THREE.Color(0x02040a);
        horizon = new THREE.Color(0x1a2845);
      } else if (twilightFactor > 0.5) {
        // Twilight: dramatic orange/purple
        zenith = new THREE.Color(0x4a3a6a);
        horizon = new THREE.Color(0xf7b25a);
      } else {
        // Day: classic sky blue gradient
        zenith = new THREE.Color(0x2f95ee);  // Deep blue zenith
        horizon = new THREE.Color(0xe8c8a0); // Warm golden horizon

        // Interpolate with twilight colors
        const twilightZenith = new THREE.Color(0xd8a475);
        const twilightHorizon = new THREE.Color(0xf2a24f);
        zenith.lerp(twilightZenith, twilightFactor);
        horizon.lerp(twilightHorizon, twilightFactor);

        // Interpolate with night colors
        const nightZenith = new THREE.Color(0x02040a);
        const nightHorizon = new THREE.Color(0x1a2845);
        zenith.lerp(nightZenith, nightFactor);
        horizon.lerp(nightHorizon, nightFactor);
      }
    }

    // Update shader uniforms
    material.uniforms.zenithColor.value.copy(zenith);
    material.uniforms.horizonColor.value.copy(horizon);
    material.uniforms.sunIntensity.value = dayFactor * 0.6;
    material.uniforms.atmosphericDensity.value = 0.3 + cloudCover * 0.4 + (weatherType === 'SANDSTORM' ? 0.5 : 0);

    // Update sun direction
    material.uniforms.sunDirection.value.set(
      Math.cos(sunAngle - Math.PI / 2),
      Math.sin(sunAngle - Math.PI / 2),
      0.2
    ).normalize();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={-1000} />
  );
};
