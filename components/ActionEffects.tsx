import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerActionEvent, ActionEffect, ActionId, PLAYER_ACTIONS } from '../types';

interface ActionEffectsProps {
  actionEvent: PlayerActionEvent | null;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  rotation: number;
  rotationSpeed: number;
}

// ============== SOUND EFFECTS SYSTEM ==============

class ActionSoundEngine {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  private ensureContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.initialized = true;
      } catch (e) {
        console.warn('Web Audio API not supported');
        return null;
      }
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playWarnSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dramatic warning horn - low brass-like tone with overtones
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.15, now + 0.3);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    // Fundamental tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, now); // A2
    osc1.frequency.exponentialRampToValueAtTime(95, now + 0.4);

    // Overtone for richness
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(190, now + 0.4);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.4;
    osc2.connect(osc2Gain);

    // Add slight distortion/grit
    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;

    osc1.connect(distortion);
    osc2Gain.connect(distortion);
    distortion.connect(masterGain);

    // Add reverb-like tail with delay
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.1;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.2;
    distortion.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  }

  playEncourageSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.1, now + 0.5);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    // Warm, rising chord - like a gentle chime
    const frequencies = [262, 330, 392, 523]; // C major chord with octave
    const delays = [0, 0.05, 0.1, 0.15];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.98, now + delays[i]);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + delays[i] + 0.3);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, now + delays[i]);
      oscGain.gain.linearRampToValueAtTime(0.15 - i * 0.02, now + delays[i] + 0.08);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + delays[i] + 1.0);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now + delays[i]);
      osc.stop(now + delays[i] + 1.1);
    });

    // Add shimmer with high frequency
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1047, now + 0.2); // High C
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0, now + 0.2);
    shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.3);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(masterGain);
    shimmer.start(now + 0.2);
    shimmer.stop(now + 0.9);
  }

  playObserveSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.15, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    // Subtle scanning/sonar-like ping
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);

    // Add filter sweep for "scanning" feel
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(masterGain);

    // Secondary ping
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.08, now + 0.15);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(osc2Gain);
    osc2Gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  }

  play(actionId: ActionId) {
    switch (actionId) {
      case 'warn':
        this.playWarnSound();
        break;
      case 'encourage':
        this.playEncourageSound();
        break;
      case 'observe':
        this.playObserveSound();
        break;
    }
  }
}

const soundEngine = new ActionSoundEngine();

// ============== FLOATING TEXT COMPONENT ==============

interface FloatingTextProps {
  text: string;
  position: THREE.Vector3;
  color: string;
  glowColor: string;
  startTime: number;
  duration?: number;
}

const FloatingText: React.FC<FloatingTextProps> = ({
  text,
  position,
  color,
  glowColor,
  startTime,
  duration = 1.5
}) => {
  const [visible, setVisible] = useState(true);
  const [style, setStyle] = useState({
    opacity: 0,
    transform: 'translateY(0px) scale(0.5)',
  });

  useEffect(() => {
    // Initial pop-in animation
    requestAnimationFrame(() => {
      setStyle({
        opacity: 1,
        transform: 'translateY(-20px) scale(1.1)',
      });
    });

    // Float up and fade
    const floatTimer = setTimeout(() => {
      setStyle({
        opacity: 0.8,
        transform: 'translateY(-60px) scale(1)',
      });
    }, 150);

    // Fade out
    const fadeTimer = setTimeout(() => {
      setStyle({
        opacity: 0,
        transform: 'translateY(-100px) scale(0.9)',
      });
    }, duration * 700);

    // Remove
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, duration * 1000);

    return () => {
      clearTimeout(floatTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <Html
      position={[position.x, position.y + 3, position.z]}
      center
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontSize: '28px',
          fontWeight: 700,
          color: color,
          textShadow: `
            0 0 10px ${glowColor},
            0 0 20px ${glowColor},
            0 0 30px ${glowColor},
            0 0 40px ${glowColor},
            2px 2px 4px rgba(0,0,0,0.8)
          `,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          opacity: style.opacity,
          transform: style.transform,
          transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </Html>
  );
};

// ============== SHADERS ==============

const particleVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float alpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = customColor;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Soft glow falloff
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

const ringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  uniform float uProgress;
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center) * 2.0;

    // Ring effect
    float ringWidth = 0.15;
    float ringPos = uProgress;
    float ring = smoothstep(ringPos - ringWidth, ringPos, dist) *
                 (1.0 - smoothstep(ringPos, ringPos + ringWidth * 0.5, dist));

    // Inner glow
    float innerGlow = (1.0 - smoothstep(0.0, ringPos, dist)) * 0.3 * (1.0 - uProgress);

    float alpha = (ring + innerGlow) * uOpacity * (1.0 - uProgress * 0.5);

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ============== WARN EFFECT ==============

const WarnEffect: React.FC<{ position: THREE.Vector3; startTime: number }> = ({ position, startTime }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(true);

  const particleCount = 80;
  const duration = 1.5;

  const { geometry, material, particles } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    const particleData: ParticleData[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const elevation = (Math.random() - 0.3) * Math.PI * 0.5;
      const speed = 3 + Math.random() * 5;

      const vx = Math.cos(angle) * Math.cos(elevation) * speed;
      const vy = Math.sin(elevation) * speed * 0.5 + Math.random() * 2;
      const vz = Math.sin(angle) * Math.cos(elevation) * speed;

      particleData.push({
        position: new THREE.Vector3(0, 0.5, 0),
        velocity: new THREE.Vector3(vx, vy, vz),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.7,
        size: 0.15 + Math.random() * 0.25,
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 0.9, 0.5 + Math.random() * 0.2),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5
      });

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0.5;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = particleData[i].color.r;
      colors[i * 3 + 1] = particleData[i].color.g;
      colors[i * 3 + 2] = particleData[i].color.b;

      sizes[i] = particleData[i].size;
      alphas[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });

    return { geometry: geo, material: mat, particles: particleData };
  }, []);

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0xff6b35) },
        uOpacity: { value: 0.8 }
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed > duration) {
      setVisible(false);
      return;
    }

    const progress = elapsed / duration;

    if (ringRef.current) {
      ringMaterial.uniforms.uProgress.value = progress;
      ringMaterial.uniforms.uOpacity.value = 1 - progress * 0.8;
      const scale = 1 + progress * 12;
      ringRef.current.scale.set(scale, scale, scale);
    }

    if (particlesRef.current) {
      const positions = geometry.attributes.position.array as Float32Array;
      const alphas = geometry.attributes.alpha.array as Float32Array;
      const sizes = geometry.attributes.size.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.life += 0.016;

        if (p.life < p.maxLife) {
          p.position.x += p.velocity.x * 0.016;
          p.position.y += p.velocity.y * 0.016;
          p.position.z += p.velocity.z * 0.016;

          p.velocity.multiplyScalar(0.96);
          p.velocity.y -= 3 * 0.016;

          positions[i * 3] = p.position.x;
          positions[i * 3 + 1] = Math.max(0.1, p.position.y);
          positions[i * 3 + 2] = p.position.z;

          const lifeRatio = p.life / p.maxLife;
          alphas[i] = Math.pow(1 - lifeRatio, 0.5);
          sizes[i] = p.size * (1 + lifeRatio * 0.5);
        } else {
          alphas[i] = 0;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[2, 2, 32, 32]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      <points ref={particlesRef}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </points>

      <pointLight color="#ff6b35" intensity={3} distance={8} decay={2} />
    </group>
  );
};

// ============== ENCOURAGE EFFECT ==============

const EncourageEffect: React.FC<{ position: THREE.Vector3; startTime: number }> = ({ position, startTime }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(true);

  const particleCount = 100;
  const duration = 2.0;

  const { geometry, material, particles } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    const particleData: ParticleData[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 6 + Math.random() * 0.5;
      const radius = 0.5 + (i / particleCount) * 2 + Math.random() * 0.5;

      const x = Math.cos(angle) * radius * 0.3;
      const z = Math.sin(angle) * radius * 0.3;

      particleData.push({
        position: new THREE.Vector3(x, 0.2, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          1.5 + Math.random() * 2,
          (Math.random() - 0.5) * 0.5
        ),
        life: Math.random() * 0.3,
        maxLife: 1.2 + Math.random() * 0.8,
        size: 0.12 + Math.random() * 0.18,
        color: new THREE.Color().setHSL(0.12 + Math.random() * 0.08, 0.7, 0.55 + Math.random() * 0.15),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2
      });

      positions[i * 3] = x;
      positions[i * 3 + 1] = 0.2;
      positions[i * 3 + 2] = z;

      colors[i * 3] = particleData[i].color.r;
      colors[i * 3 + 1] = particleData[i].color.g;
      colors[i * 3 + 2] = particleData[i].color.b;

      sizes[i] = particleData[i].size;
      alphas[i] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });

    return { geometry: geo, material: mat, particles: particleData };
  }, []);

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0xffd700) },
        uOpacity: { value: 0.6 }
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed > duration) {
      setVisible(false);
      return;
    }

    const progress = elapsed / duration;

    if (ringRef.current) {
      ringMaterial.uniforms.uProgress.value = progress * 0.8;
      ringMaterial.uniforms.uOpacity.value = (1 - progress) * 0.5;
      const scale = 1 + progress * 8;
      ringRef.current.scale.set(scale, scale, scale);
    }

    if (particlesRef.current) {
      const positions = geometry.attributes.position.array as Float32Array;
      const alphas = geometry.attributes.alpha.array as Float32Array;
      const sizes = geometry.attributes.size.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.life += 0.016;

        const delay = (i / particleCount) * 0.5;
        const adjustedLife = Math.max(0, p.life - delay);

        if (adjustedLife > 0 && adjustedLife < p.maxLife) {
          const spiralAngle = adjustedLife * 2;
          p.position.x += (Math.cos(spiralAngle) * 0.02 + p.velocity.x * 0.01);
          p.position.y += p.velocity.y * 0.016;
          p.position.z += (Math.sin(spiralAngle) * 0.02 + p.velocity.z * 0.01);

          p.velocity.y *= 0.99;

          positions[i * 3] = p.position.x;
          positions[i * 3 + 1] = p.position.y;
          positions[i * 3 + 2] = p.position.z;

          const lifeRatio = adjustedLife / p.maxLife;
          const fadeIn = Math.min(1, adjustedLife * 4);
          const fadeOut = 1 - Math.pow(lifeRatio, 2);
          alphas[i] = fadeIn * fadeOut * 0.8;
          sizes[i] = p.size * (0.8 + lifeRatio * 0.4);
        } else if (adjustedLife >= p.maxLife) {
          alphas[i] = 0;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[2, 2, 32, 32]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      <points ref={particlesRef}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </points>

      <pointLight color="#ffd700" intensity={2} distance={6} decay={2} />
    </group>
  );
};

// ============== OBSERVE EFFECT ==============

const ObserveEffect: React.FC<{ position: THREE.Vector3; startTime: number }> = ({ position, startTime }) => {
  const ringsRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(true);

  const duration = 1.0;

  const ringMaterials = useMemo(() => {
    return [0, 1, 2].map(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(0x4a9eff) },
          uOpacity: { value: 0.5 }
        },
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    });
  }, []);

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed > duration) {
      setVisible(false);
      return;
    }

    const progress = elapsed / duration;

    ringMaterials.forEach((mat, i) => {
      const delay = i * 0.15;
      const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
      mat.uniforms.uProgress.value = adjustedProgress;
      mat.uniforms.uOpacity.value = (1 - adjustedProgress) * 0.4;
    });

    if (ringsRef.current) {
      ringsRef.current.children.forEach((child, i) => {
        const delay = i * 0.15;
        const adjustedProgress = Math.max(0, (progress - delay) / (1 - delay));
        const scale = 0.5 + adjustedProgress * 4;
        child.scale.set(scale, scale, scale);
      });
    }
  });

  if (!visible) return null;

  return (
    <group position={[position.x, 0.5, position.z]}>
      <group ref={ringsRef}>
        {ringMaterials.map((mat, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, i * 0.3, 0]}>
            <ringGeometry args={[0.8, 1, 32]} />
            <primitive object={mat} attach="material" />
          </mesh>
        ))}
      </group>

      <pointLight color="#4a9eff" intensity={1.5} distance={4} decay={2} />
    </group>
  );
};

// ============== ACTION TEXT CONFIG ==============

const ACTION_TEXT_CONFIG: Record<ActionId, { text: string; color: string; glowColor: string }> = {
  warn: { text: 'WARN', color: '#ff6b35', glowColor: '#ff4500' },
  encourage: { text: 'ENCOURAGE', color: '#ffd700', glowColor: '#ffaa00' },
  observe: { text: 'OBSERVE', color: '#4a9eff', glowColor: '#0066ff' },
  pray: { text: 'PRAY', color: '#e0b0ff', glowColor: '#9932cc' },
  trade: { text: 'TRADE', color: '#90ee90', glowColor: '#228b22' },
  heal: { text: 'HEAL', color: '#ff69b4', glowColor: '#ff1493' },
};

// ============== MAIN COMPONENT ==============

export const ActionEffects: React.FC<ActionEffectsProps> = ({ actionEvent }) => {
  const [activeEffects, setActiveEffects] = useState<Array<{
    id: number;
    type: ActionEffect;
    actionId: ActionId;
    position: THREE.Vector3;
    startTime: number;
  }>>([]);

  const effectIdRef = useRef(0);
  const lastEventRef = useRef<number>(0);

  useEffect(() => {
    if (actionEvent && actionEvent.timestamp > lastEventRef.current) {
      lastEventRef.current = actionEvent.timestamp;

      // Play sound effect
      soundEngine.play(actionEvent.actionId);

      const newEffect = {
        id: effectIdRef.current++,
        type: actionEvent.effect,
        actionId: actionEvent.actionId,
        position: new THREE.Vector3(
          actionEvent.position[0],
          actionEvent.position[1],
          actionEvent.position[2]
        ),
        startTime: Date.now()
      };

      setActiveEffects(prev => [...prev, newEffect]);

      // Clean up after effect duration
      setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== newEffect.id));
      }, 2500);
    }
  }, [actionEvent]);

  return (
    <group>
      {activeEffects.map(effect => {
        const textConfig = ACTION_TEXT_CONFIG[effect.actionId];

        return (
          <group key={effect.id}>
            {/* Floating text */}
            <FloatingText
              text={textConfig.text}
              position={effect.position}
              color={textConfig.color}
              glowColor={textConfig.glowColor}
              startTime={effect.startTime}
            />

            {/* Particle effect */}
            {effect.type === 'aoe_panic' && (
              <WarnEffect position={effect.position} startTime={effect.startTime} />
            )}
            {effect.type === 'aoe_calm' && (
              <EncourageEffect position={effect.position} startTime={effect.startTime} />
            )}
            {effect.type === 'none' && (
              <ObserveEffect position={effect.position} startTime={effect.startTime} />
            )}
          </group>
        );
      })}
    </group>
  );
};
