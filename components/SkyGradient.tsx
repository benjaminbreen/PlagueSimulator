import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

// HSL interpolation for smoother, more natural color transitions
const lerpColorHSL = (color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color => {
  const hsl1 = { h: 0, s: 0, l: 0 };
  const hsl2 = { h: 0, s: 0, l: 0 };
  color1.getHSL(hsl1);
  color2.getHSL(hsl2);

  // Handle hue wrapping (e.g., red to purple across 0)
  let hDiff = hsl2.h - hsl1.h;
  if (hDiff > 0.5) hDiff -= 1;
  if (hDiff < -0.5) hDiff += 1;

  const result = new THREE.Color();
  result.setHSL(
    (hsl1.h + hDiff * t + 1) % 1,
    hsl1.s + (hsl2.s - hsl1.s) * t,
    hsl1.l + (hsl2.l - hsl1.l) * t
  );
  return result;
};

// DAWN color palettes - softer, pinker, more hopeful
const DAWN_PALETTES = [
  { // Classic pink-gold dawn
    zenith: new THREE.Color(0x5a4a7a),   // Soft purple
    mid: new THREE.Color(0xd4789a),      // Rose pink
    horizon: new THREE.Color(0xffc87a),  // Warm gold
  },
  { // Lavender morning
    zenith: new THREE.Color(0x6a5a8a),   // Lavender purple
    mid: new THREE.Color(0xc898b8),      // Dusty rose
    horizon: new THREE.Color(0xffd4a8),  // Peach
  },
  { // Coral sunrise
    zenith: new THREE.Color(0x4a5a7a),   // Steel blue-purple
    mid: new THREE.Color(0xe8a090),      // Coral
    horizon: new THREE.Color(0xffe0b0),  // Pale gold
  },
  { // Magenta dawn
    zenith: new THREE.Color(0x6a4878),   // Deep magenta-purple
    mid: new THREE.Color(0xd86a98),      // Hot pink
    horizon: new THREE.Color(0xffb878),  // Orange-gold
  },
];

// DUSK color palettes - deeper, more dramatic, richer reds/oranges
const DUSK_PALETTES = [
  { // Classic orange-red sunset
    zenith: new THREE.Color(0x3a2a5a),   // Deep purple
    mid: new THREE.Color(0xc85a40),      // Burnt orange
    horizon: new THREE.Color(0xff8a3a),  // Vivid orange
  },
  { // Purple-pink dusk
    zenith: new THREE.Color(0x2a2848),   // Navy purple
    mid: new THREE.Color(0x9a4a78),      // Mauve
    horizon: new THREE.Color(0xf07858),  // Salmon-orange
  },
  { // Fiery sunset
    zenith: new THREE.Color(0x4a2a4a),   // Dark plum
    mid: new THREE.Color(0xd84830),      // Fire red
    horizon: new THREE.Color(0xffa030),  // Deep gold
  },
  { // Dusty rose dusk
    zenith: new THREE.Color(0x3a3858),   // Slate purple
    mid: new THREE.Color(0xb86878),      // Dusty rose
    horizon: new THREE.Color(0xe8a868),  // Amber
  },
  { // Dramatic crimson
    zenith: new THREE.Color(0x2a1a3a),   // Near black purple
    mid: new THREE.Color(0xa83050),      // Crimson
    horizon: new THREE.Color(0xf87840),  // Red-orange
  },
];

// Seeded random for consistent daily palette selection
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

interface SkyGradientProps {
  timeOfDay: number;
  weatherType: 'CLEAR' | 'OVERCAST' | 'SANDSTORM';
  cloudCover?: number;
  daySeed?: number; // Optional seed for palette variation
}

export const SkyGradient: React.FC<SkyGradientProps> = ({
  timeOfDay,
  weatherType,
  cloudCover = 0,
  daySeed = 0
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Select palettes based on seed (consistent for the day)
  const { dawnPalette, duskPalette } = useMemo(() => {
    const dawnIndex = Math.floor(seededRandom(daySeed * 17) * DAWN_PALETTES.length);
    const duskIndex = Math.floor(seededRandom(daySeed * 31 + 7) * DUSK_PALETTES.length);
    return {
      dawnPalette: DAWN_PALETTES[dawnIndex],
      duskPalette: DUSK_PALETTES[duskIndex],
    };
  }, [daySeed]);

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

    // Determine if we're in dawn (morning) or dusk (evening)
    const isDawn = time >= 4 && time < 12;
    const isDusk = time >= 12 && time < 22;

    // Calculate transition factors with smoother curves
    const dayFactor = smoothstep(-0.1, 0.35, elevation);
    const nightFactor = 1 - smoothstep(-0.45, 0.1, elevation);

    // Dawn factor: peaks around 6 AM (time = 6)
    const dawnFactor = isDawn
      ? Math.pow(Math.max(0, 1 - Math.abs(time - 6) / 3), 1.5) * (1 - dayFactor)
      : 0;

    // Dusk factor: peaks around 18:30 (time = 18.5)
    const duskFactor = isDusk
      ? Math.pow(Math.max(0, 1 - Math.abs(time - 18.5) / 3), 1.5) * (1 - dayFactor)
      : 0;

    // Combined twilight factor for general twilight effects
    const twilightFactor = Math.max(dawnFactor, duskFactor);

    // TIME-OF-DAY SKY COLORS
    let zenith: THREE.Color, horizon: THREE.Color;

    if (weatherType === 'SANDSTORM') {
      // Dusty ochre sky
      zenith = new THREE.Color(0x8b6b3c);
      horizon = new THREE.Color(0xc9a876);
    } else if (weatherType === 'OVERCAST') {
      // Gray overcast - but still tinted by twilight
      zenith = new THREE.Color(0x8a98a8);
      horizon = new THREE.Color(0xa8b8c8);
      // Add subtle twilight tint even on overcast days
      if (twilightFactor > 0.2) {
        const palette = isDawn ? dawnPalette : duskPalette;
        zenith = lerpColorHSL(zenith, palette.zenith, twilightFactor * 0.3);
        horizon = lerpColorHSL(horizon, palette.horizon, twilightFactor * 0.4);
      }
    } else {
      // CLEAR SKY - dynamic gradients with dawn/dusk distinction

      // Base colors for different times
      const nightZenith = new THREE.Color(0x02040a);
      const nightHorizon = new THREE.Color(0x1a2845);
      const dayZenith = new THREE.Color(0x2f95ee);
      const dayHorizon = new THREE.Color(0xe8c8a0);

      // Start with day colors
      zenith = dayZenith.clone();
      horizon = dayHorizon.clone();

      // Blend with twilight colors using HSL for smoother transitions
      if (dawnFactor > 0.05) {
        // DAWN: Use dawn palette with pink/coral/lavender tones
        const blendStrength = Math.pow(dawnFactor, 0.7); // Ease-out for longer glow
        zenith = lerpColorHSL(zenith, dawnPalette.zenith, blendStrength);
        // Blend horizon through mid color for richer gradient
        const midBlend = lerpColorHSL(dawnPalette.mid, dawnPalette.horizon, 0.5);
        horizon = lerpColorHSL(horizon, midBlend, blendStrength);
        // Extra warmth at peak dawn
        if (dawnFactor > 0.5) {
          horizon = lerpColorHSL(horizon, dawnPalette.horizon, (dawnFactor - 0.5) * 1.5);
        }
      }

      if (duskFactor > 0.05) {
        // DUSK: Use dusk palette with deeper reds/oranges/purples
        const blendStrength = Math.pow(duskFactor, 0.7);
        zenith = lerpColorHSL(zenith, duskPalette.zenith, blendStrength);
        // Blend horizon through mid color for dramatic sunset bands
        const midBlend = lerpColorHSL(duskPalette.mid, duskPalette.horizon, 0.4);
        horizon = lerpColorHSL(horizon, midBlend, blendStrength);
        // Extra intensity at peak dusk
        if (duskFactor > 0.5) {
          horizon = lerpColorHSL(horizon, duskPalette.horizon, (duskFactor - 0.5) * 1.8);
        }
      }

      // Blend with night colors using HSL
      if (nightFactor > 0.1) {
        zenith = lerpColorHSL(zenith, nightZenith, nightFactor);
        horizon = lerpColorHSL(horizon, nightHorizon, nightFactor * 0.9);
      }
    }

    // Update shader uniforms
    material.uniforms.zenithColor.value.copy(zenith);
    material.uniforms.horizonColor.value.copy(horizon);
    material.uniforms.sunIntensity.value = dayFactor * 0.6;
    material.uniforms.atmosphericDensity.value = 0.3 + cloudCover * 0.4 + (weatherType === 'SANDSTORM' ? 0.5 : 0) + twilightFactor * 0.2;

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
