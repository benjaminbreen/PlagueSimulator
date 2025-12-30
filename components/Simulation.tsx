
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, SimulationCounts, DevSettings, PlayerStats, CONSTANTS, BuildingMetadata, BuildingType, Obstacle, CameraMode, NPCStats, AgentState, MarketStall as MarketStallData, MarketStallType, MerchantNPC as MerchantNPCType, MiniMapData, getDistrictType, PlayerActionEvent, PlagueStatus, NpcStateOverride, NPCRecord, BuildingInfectionState, DroppedItemRequest } from '../types';
import { Environment as WorldEnvironment } from './Environment';
import { Agents, MoraleStats } from './Agents';
import { Rats, Rat } from './Rats';
import { Player } from './Player';
import { MarketStall } from './MarketStall';
import { MerchantNPC } from './MerchantNPC';
import { AgentSnapshot, SpatialHash, buildBuildingHash, buildObstacleHash, queryNearbyAgents } from '../utils/spatial';
import { PushableObject, PickupInfo, createPushable } from '../utils/pushables';
import { seededRandom } from '../utils/procedural';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { ImpactPuffs, ImpactPuffSlot, MAX_PUFFS } from './ImpactPuffs';
import { generateMerchantNPC, mapStallTypeToMerchantType } from '../utils/merchantGeneration';
import { LaundryLine, generateLaundryLine, shouldGenerateLaundryLine } from '../utils/laundry';
import { HangingCarpet, generateMarketCarpets } from '../utils/hangingCarpets';
import { ActionEffects } from './ActionEffects';
import { Footprints } from './Footprints';
import { SkyGradient } from './SkyGradient';
import { AmbientAudio, SpatialSource } from './AmbientAudio';
import { SnakeCharmer } from './npcs/SnakeCharmer';
import { FluteMusic } from './audio/FluteMusic';
import { Astrologer } from './npcs/Astrologer';
import { Scribe } from './npcs/Scribe';
import { exposePlayerToPlague } from '../utils/plague';
import { InfectedBuildingMarkers } from './environment/InfectedBuildingMarkers';

interface SimulationProps {
  params: SimulationParams;
  simTime: number;
  devSettings: DevSettings;
  playerStats: PlayerStats;
  onStatsUpdate: (stats: SimulationCounts) => void;
  onMapChange: (dx: number, dy: number) => void;
  onNearBuilding: (building: BuildingMetadata | null) => void;
  onBuildingsUpdate?: (buildings: BuildingMetadata[]) => void;
  onNearMerchant?: (merchant: MerchantNPCType | null) => void;
  /** Callback when player is near an NPC they can speak to (for "E to speak" prompt) */
  onNearSpeakableNpc?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  onNpcSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  onNpcUpdate?: (id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, location: 'outdoor' | 'interior', plagueMeta?: import('../types').NPCPlagueMeta) => void;
  selectedNpcId?: string | null;
  onMinimapUpdate?: (data: MiniMapData) => void;
  onPickupPrompt?: (label: string | null) => void;
  onClimbablePrompt?: (label: string | null) => void;
  onClimbingStateChange?: (climbing: boolean) => void;
  climbInputRef?: React.RefObject<'up' | 'down' | 'cancel' | null>;
  onPickupItem?: (pickup: PickupInfo) => void;
  onWeatherUpdate?: (weatherType: string) => void;
  onPushCharge?: (charge: number) => void;
  onMoraleUpdate?: (morale: MoraleStats) => void;
  actionEvent?: PlayerActionEvent | null;
  showDemographicsOverlay?: boolean;
  npcStateOverride?: NpcStateOverride | null;
  npcPool?: NPCRecord[];
  buildingInfection?: Record<string, BuildingInfectionState>;
  onPlayerPositionUpdate?: (pos: THREE.Vector3) => void;
  dossierMode?: boolean;
  onPlagueExposure?: (plague: PlagueStatus) => void;
  /** Callback when a friendly NPC approaches and initiates an encounter */
  onNPCInitiatedEncounter?: (npc: { stats: NPCStats; state: AgentState }) => void;
  /** Callback when player takes fall damage */
  onFallDamage?: (fallHeight: number, fatal: boolean) => void;
  /** Target position to move camera view to (for UI navigation like clicking infected households) - does NOT move player */
  cameraViewTarget?: [number, number, number] | null;
  /** Callback when player starts moving (to clear camera view target) */
  onPlayerStartMove?: () => void;
  /** Requests to spawn dropped items near the player */
  dropRequests?: DroppedItemRequest[];
  /** Observe action mode */
  observeMode?: boolean;
  /** Initial game loading state - delays camera animations */
  gameLoading?: boolean;
}

const MiasmaFog: React.FC<{ infectionRate: number }> = ({ infectionRate }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 30;
  const tempObj = new THREE.Object3D();

  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 80, 0.5, (Math.random() - 0.5) * 80),
      scale: 5 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Miasma only appears if infection rate (virulence) is above 60%
    const isVisible = infectionRate > 0.6;
    const intensity = isVisible ? Math.min(1, (infectionRate - 0.6) * 5) : 0;
    
    particles.forEach((p, i) => {
      const y = 0.5 + Math.sin(state.clock.elapsedTime + p.phase) * 0.5;
      tempObj.position.set(p.pos.x, y, p.pos.z);
      tempObj.scale.set(p.scale * intensity, p.scale * intensity, p.scale * intensity);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Hide geometry completely if not visible to improve performance/cleanliness
    if (meshRef.current) {
      meshRef.current.visible = intensity > 0.01;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#4d5d1a" transparent opacity={0.15} />
    </instancedMesh>
  );
};


// GRAPHICS: Dust particles for sunny hot days - warm sun-baked atmosphere
const DustParticles: React.FC<{ timeOfDay: number; weather: React.MutableRefObject<WeatherState> }> = ({ timeOfDay, weather }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 150;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spread particles across the scene
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = Math.random() * 15 + 2; // Between 2-17 units high
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      // Random drift velocities
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        0.008 + Math.random() * 0.012, // Upward drift
        (Math.random() - 0.5) * 0.015
      ));
    }

    return { positions, velocities };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // Calculate day factor - same as in Simulation
    const sunAngle = (timeOfDay / 24) * Math.PI * 2;
    const sunElevation = Math.sin(sunAngle - Math.PI / 2);
    const dayFactor = smoothstep(-0.1, 0.35, sunElevation);

    // Only show during daytime
    const isVisible = dayFactor > 0.5;
    pointsRef.current.visible = isVisible;

    if (!isVisible) return;

    // Peak sun visibility (10am-2pm when dayFactor > 0.7)
    const peakSunFactor = dayFactor > 0.7 ? (dayFactor - 0.7) / 0.3 : 0;
    const humidity = weather.current.humidity;
    const windStrength = weather.current.wind.length();
    const humidityBoost = THREE.MathUtils.clamp(humidity * 0.6, 0, 0.4);
    const windDamp = THREE.MathUtils.clamp(1 - windStrength * 0.8, 0.4, 1);
    const opacity = (0.15 + peakSunFactor * 0.1) * windDamp + humidityBoost * 0.2;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    // Animate particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const vel = particles.velocities[i];

      // Apply drift
      positions[i3] += vel.x * delta * 60;
      positions[i3 + 1] += vel.y * delta * 60;
      positions[i3 + 2] += vel.z * delta * 60;

      // Wrap particles that drift too far
      if (positions[i3] > 50) positions[i3] = -50;
      if (positions[i3] < -50) positions[i3] = 50;
      if (positions[i3 + 1] > 20) positions[i3 + 1] = 2;
      if (positions[i3 + 2] > 50) positions[i3 + 2] = -50;
      if (positions[i3 + 2] < -50) positions[i3 + 2] = 50;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Update material opacity
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = opacity;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#d4b894"
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

enum WeatherType {
  CLEAR = 'CLEAR',
  OVERCAST = 'OVERCAST',
  SANDSTORM = 'SANDSTORM',
}

interface WeatherState {
  cloudCover: number;
  humidity: number;
  wind: THREE.Vector2;
  targetCloudCover: number;
  targetHumidity: number;
  nextShift: number;
  weatherType: WeatherType;
  targetWeatherType: WeatherType;
  weatherBlend: number;
}

const CloudLayer: React.FC<{ weather: React.MutableRefObject<WeatherState>; timeOfDay: number }> = ({ weather, timeOfDay }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const count = 12;
  const cloudColors = useMemo(() => ({
    tint: new THREE.Color('#ffffff'),
    warm: new THREE.Color('#ffd5a8'),
    cool: new THREE.Color('#c8e6ff'),
    sandstorm: new THREE.Color('#c9a25f')
  }), []);

  const clouds = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 200, 30 + Math.random() * 10, (Math.random() - 0.5) * 200),
      scale: 10 + Math.random() * 25,
      speed: 0.2 + Math.random() * 0.6,
    }));
  }, []);

  useFrame((_, delta) => {
    const cloudCover = weather.current.cloudCover;
    if (!meshRef.current || cloudCover <= 0.05) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }

    const wind = weather.current.wind;
    clouds.forEach((cloud, i) => {
      cloud.pos.x += wind.x * cloud.speed * delta;
      cloud.pos.z += wind.y * cloud.speed * delta;

      if (cloud.pos.x > 120) cloud.pos.x = -120;
      if (cloud.pos.x < -120) cloud.pos.x = 120;
      if (cloud.pos.z > 120) cloud.pos.z = -120;
      if (cloud.pos.z < -120) cloud.pos.z = 120;

      tempObj.position.copy(cloud.pos);
      tempObj.rotation.set(-Math.PI / 2, 0, 0);
      const scale = cloud.scale * (0.4 + cloudCover);
      tempObj.scale.set(scale, scale, scale);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.visible = true;
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.opacity = 0.12 + cloudCover * 0.3;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const dayFactor = smoothstep(-0.1, 0.35, elevation);
    const duskFactor = smoothstep(0.05, -0.2, -elevation) * (1 - dayFactor);
    const dawnFactor = smoothstep(-0.2, 0.05, elevation) * (1 - dayFactor);
    const { tint, warm, cool, sandstorm } = cloudColors;
    tint.set('#ffffff');
    if (weather.current.weatherType === WeatherType.SANDSTORM) {
      tint.copy(sandstorm);
    } else {
      tint.lerp(warm, Math.max(duskFactor, dawnFactor) * 0.6);
      tint.lerp(cool, (1 - Math.max(duskFactor, dawnFactor)) * (1 - dayFactor) * 0.2);
    }
    material.color.lerp(tint, 0.2);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial transparent opacity={0.4} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const createHorizonHazeTexture = (size = 256) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, 'rgba(180,210,240,0.0)');
  gradient.addColorStop(0.35, 'rgba(180,210,240,0.08)');
  gradient.addColorStop(0.65, 'rgba(190,200,190,0.18)');
  gradient.addColorStop(1, 'rgba(210,185,150,0.35)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

const HorizonHaze: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const texture = useMemo(() => createHorizonHazeTexture(256), []);
  if (!texture) return null;
  const sunAngle = (timeOfDay / 24) * Math.PI * 2;
  const elevation = Math.sin(sunAngle - Math.PI / 2);
  const dayFactor = smoothstep(-0.1, 0.35, elevation);
  const duskFactor = smoothstep(0.05, -0.2, -elevation) * (1 - dayFactor);
  const dawnFactor = smoothstep(-0.2, 0.05, elevation) * (1 - dayFactor);
  const nightFactor = 1 - smoothstep(-0.45, 0.1, elevation);
  const tint = new THREE.Color('#cdd9e6')
    .lerp(new THREE.Color('#f1c6a2'), Math.max(duskFactor, dawnFactor) * 0.7)
    .lerp(new THREE.Color('#93a6bf'), (1 - dayFactor) * 0.25)
    .lerp(new THREE.Color('#0f1829'), nightFactor * 0.55);
  const opacity = 0.75 * (dayFactor * 0.9 + Math.max(duskFactor, dawnFactor) * 0.7) * (1 - nightFactor);
  return (
    <mesh position={[0, 10, 0]} renderOrder={-900}>
      <cylinderGeometry args={[220, 220, 70, 48, 1, true]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.BackSide}
        color={tint}
      />
    </mesh>
  );
};

const Moon: React.FC<{ timeOfDay: number; simTime: number }> = ({ timeOfDay, simTime }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const earthshineRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Moon phase cycles every 29.5 days
  const moonPhase = (simTime / 29.5) % 1; // 0-1, where 0=new, 0.5=full

  const phaseKey = Math.round(moonPhase * 32) / 32;
  const moonTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const center = size / 2;
    const radius = size * 0.48;
    const gradient = ctx.createRadialGradient(center, center, size * 0.05, center, center, size * 0.52);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#f2efe3');
    gradient.addColorStop(1, '#c9c1ad');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(140,135,120,0.55)';
    for (let i = 0; i < 55; i += 1) {
      const r = 1 + Math.random() * 7;
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Phase shadow: darken based on lunar phase
    const illumination = 1 - Math.abs(phaseKey - 0.5) * 2; // 0=new, 1=full
    const shadowAlpha = 0.9 * (1 - illumination);
    const shadowOffset = (phaseKey - 0.5) * radius * 1.6;
    if (shadowAlpha > 0.01) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(20,20,28,${shadowAlpha})`;
      ctx.beginPath();
      ctx.arc(center + shadowOffset, center, radius * 1.02, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle limb darkening
    const limb = ctx.createRadialGradient(center, center, radius * 0.6, center, center, radius * 1.05);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = limb;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [phaseKey]);

  const moonMaterial = useMemo(() => {
    // Simple bright moon - no shader modification needed
    // Using emissive for self-illumination effect
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      map: moonTexture ?? undefined,
      transparent: false
    });
    mat.toneMapped = false;
    mat.fog = false;

    return mat;
  }, [moonTexture]);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    // Moon orbit - opposite side of sky from sun, adjusted for better visibility
    const moonAngle = ((timeOfDay + 12) % 24 / 24) * Math.PI * 2 - Math.PI / 2;
    const moonElevation = Math.sin(moonAngle);
    const visible = moonElevation > -0.15; // Hide when below horizon

    groupRef.current.visible = visible;
    if (!visible) return;

    // Position moon in sky - adjusted z position for better visibility
    const radius = 100;
    groupRef.current.position.set(
      Math.cos(moonAngle) * radius,
      Math.max(-15, moonElevation * 85),
      -20 // Brought forward for better visibility
    );

    // GRAPHICS: Large dramatic moon with beautiful glow effects
    // Horizon size scaling - moon appears larger near horizon
    const horizonFactor = smoothstep(0.4, -0.1, moonElevation);
    const baseScale = 1.4; // Larger than realistic but not overwhelming
    const sizeScale = baseScale + horizonFactor * 0.6; // Up to 2x larger at horizon

    meshRef.current.scale.setScalar(sizeScale);
    if (earthshineRef.current) earthshineRef.current.scale.setScalar(sizeScale);
    if (glowRef.current) glowRef.current.scale.setScalar(sizeScale);
    if (outerGlowRef.current) outerGlowRef.current.scale.setScalar(sizeScale);
    if (auraRef.current) auraRef.current.scale.setScalar(sizeScale);

    // GRAPHICS: Moon light intensity varies with phase and elevation
    if (lightRef.current) {
      const phaseIntensity = Math.sin(moonPhase * Math.PI); // 0 at new/full cycle, 1 at full
      const elevationFactor = Math.max(0, moonElevation);
      lightRef.current.intensity = 2.2 * phaseIntensity * elevationFactor;
    }

    // GRAPHICS: Beautiful multi-layer glow system
    const fullMoonFactor = Math.sin(moonPhase * Math.PI); // 1 at full moon, 0 at new

    // Earthshine - subtle blue glow on dark side during crescent
    if (earthshineRef.current) {
      const crescentFactor = moonPhase < 0.3 || moonPhase > 0.7 ? 1 : 0;
      const intensity = crescentFactor * (1 - Math.abs(moonPhase - 0.5) * 2) * 0.5;
      (earthshineRef.current.material as THREE.MeshBasicMaterial).opacity = intensity;
    }

    // Main atmospheric glow - silvery blue
    if (glowRef.current) {
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.4 + fullMoonFactor * 0.3 + horizonFactor * 0.15;
    }

    // Outer atmospheric halo - very soft, expansive
    if (outerGlowRef.current) {
      const outerMaterial = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      outerMaterial.opacity = 0.18 + fullMoonFactor * 0.15 + horizonFactor * 0.12;
    }

    // Mystical aura - subtle color shift for beauty
    if (auraRef.current) {
      const auraMaterial = auraRef.current.material as THREE.MeshBasicMaterial;
      auraMaterial.opacity = 0.08 + fullMoonFactor * 0.08;
      // Slight color variation based on elevation for atmospheric effect
      const hue = 210 + horizonFactor * 20; // Shifts from blue to cyan at horizon
      auraMaterial.color.setHSL(hue / 360, 0.4, 0.7);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Mystical outer aura - largest, most subtle, color-tinted */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[7.5, 24, 16]} />
        <meshBasicMaterial
          color="#a8c8ff"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer atmospheric glow - expansive halo */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[5.4, 20, 12]} />
        <meshBasicMaterial
          color="#d5e5ff"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main atmospheric glow - bright silvery corona */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[4.4, 20, 12]} />
        <meshBasicMaterial
          color="#e8f2ff"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Earthshine - subtle glow on dark side */}
      <mesh ref={earthshineRef}>
        <sphereGeometry args={[4.05, 16, 10]} />
        <meshBasicMaterial
          color="#7a9fcc"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main moon body - the actual lunar surface */}
      <mesh ref={meshRef} material={moonMaterial}>
        <sphereGeometry args={[4, 28, 20]} />
        <pointLight ref={lightRef} intensity={1.2} distance={280} color="#d5e2ff" />
      </mesh>
    </group>
  );
};

const getTorchPositions = (buildings: BuildingMetadata[]) => {
  const positions: THREE.Vector3[] = [];
  const buildingSize = CONSTANTS.BUILDING_SIZE;
  for (const data of buildings) {
    const localSeed = data.position[0] * 1000 + data.position[2];
    const height = data.type === BuildingType.RELIGIOUS || data.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
    const torchChance = seededRandom(localSeed + 17);
    const torchCount = torchChance > 0.97 ? 2 : torchChance > 0.9 ? 1 : 0;
    if (torchCount === 0) continue;
    if (torchCount >= 1) {
      positions.push(new THREE.Vector3(
        data.position[0] + buildingSize / 2 + 0.2,
        height / 2 - height * 0.15,
        data.position[2]
      ));
    }
    if (torchCount >= 2) {
      positions.push(new THREE.Vector3(
        data.position[0] - buildingSize / 2 - 0.2,
        height / 2 - height * 0.15,
        data.position[2]
      ));
    }
  }
  return positions;
};

const TorchLightPool: React.FC<{
  buildings: BuildingMetadata[];
  playerRef: React.RefObject<THREE.Group>;
  timeOfDay: number;
}> = ({ buildings, playerRef, timeOfDay }) => {
  // PERFORMANCE: Only use 2 lights max, updated infrequently
  const maxLights = 2;
  const lightRefs = useRef<Array<THREE.PointLight | null>>([]);
  const torchPositions = useMemo(() => getTorchPositions(buildings), [buildings]);
  const tickRef = useRef(0);

  useFrame((state) => {
    if (!playerRef.current || torchPositions.length === 0) return;
    const t = state.clock.elapsedTime;
    // Update every 2 seconds to reduce overhead
    if (t - tickRef.current < 2.0) return;
    tickRef.current = t;

    // Only enable during deep night (8pm-5am)
    if (timeOfDay < 20 && timeOfDay > 5) {
      // Not deep night - disable all torches
      for (let i = 0; i < maxLights; i++) {
        const light = lightRefs.current[i];
        if (light) light.visible = false;
      }
      return;
    }

    const playerPos = playerRef.current.position;
    const torchIntensity = timeOfDay >= 20 || timeOfDay < 5 ? 1.0 : 0.5;

    // PERFORMANCE FIX: Use linear scan instead of sort - O(n) instead of O(n log n)
    // Find closest 2 torches without expensive sorting/mapping
    const closest: Array<{ p: THREE.Vector3; d: number }> = [];

    for (let i = 0; i < torchPositions.length; i++) {
      const d = torchPositions[i].distanceToSquared(playerPos);

      if (closest.length < maxLights) {
        closest.push({ p: torchPositions[i], d });
      } else {
        // Find the farthest in our current closest set
        let maxIdx = 0;
        for (let j = 1; j < closest.length; j++) {
          if (closest[j].d > closest[maxIdx].d) maxIdx = j;
        }
        // Replace if this one is closer
        if (d < closest[maxIdx].d) {
          closest[maxIdx] = { p: torchPositions[i], d };
        }
      }
    }

    for (let i = 0; i < maxLights; i++) {
      const light = lightRefs.current[i];
      const entry = closest[i];
      if (!light) continue;
      if (entry) {
        light.visible = true;
        light.position.copy(entry.p);
        light.intensity = torchIntensity * 1.0;
        light.distance = 12;
      } else {
        light.visible = false;
      }
    }
  });

  return (
    <>
      {Array.from({ length: maxLights }).map((_, i) => (
        <pointLight
          key={`torch-light-${i}`}
          ref={(el) => { lightRefs.current[i] = el; }}
          color="#ffb347"
          distance={12}
          decay={2}
          intensity={0}
        />
      ))}
    </>
  );
};

const getWindowGlowPositions = (buildings: BuildingMetadata[]) => {
  const positions: THREE.Vector3[] = [];
  const buildingSize = CONSTANTS.BUILDING_SIZE;
  for (const data of buildings) {
    const localSeed = data.position[0] * 1000 + data.position[2];
    const roll = seededRandom(localSeed + 120);
    if (roll < 0.9) continue;
    const side = Math.floor(seededRandom(localSeed + 121) * 4);
    const offset = buildingSize / 2 + 0.2;
    const height = 1.6 + seededRandom(localSeed + 122) * 2.2;
    const pos = new THREE.Vector3(data.position[0], height, data.position[2]);
    if (side === 0) pos.z += offset;
    if (side === 1) pos.x += offset;
    if (side === 2) pos.z -= offset;
    if (side === 3) pos.x -= offset;
    positions.push(pos);
  }
  return positions;
};

const getInfectionMarkers = (buildings: BuildingMetadata[], infection: Record<string, BuildingInfectionState> | undefined) => {
  if (!infection) return [];
  const buildingSize = CONSTANTS.BUILDING_SIZE;
  return buildings.flatMap((building) => {
    const state = infection[building.id];
    if (!state || state.status === 'clear') return [];
    const scale = building.sizeScale ?? 1;
    const half = (buildingSize * scale) / 2;
    const doorOffset = 0.3;
    const y = 1.6 + (building.storyCount ?? 1) * 0.15;
    let pos: THREE.Vector3;
    let rotY = 0;
    switch (building.doorSide) {
      case 0:
        pos = new THREE.Vector3(building.position[0], y, building.position[2] - half - doorOffset);
        rotY = 0;
        break;
      case 1:
        pos = new THREE.Vector3(building.position[0], y, building.position[2] + half + doorOffset);
        rotY = Math.PI;
        break;
      case 2:
        pos = new THREE.Vector3(building.position[0] + half + doorOffset, y, building.position[2]);
        rotY = -Math.PI / 2;
        break;
      default:
        pos = new THREE.Vector3(building.position[0] - half - doorOffset, y, building.position[2]);
        rotY = Math.PI / 2;
        break;
    }
    return [{
      id: building.id,
      position: pos,
      rotation: rotY,
      status: state.status
    }];
  });
};

const InfectionMarkerPool: React.FC<{
  buildings: BuildingMetadata[];
  infection: Record<string, BuildingInfectionState> | undefined;
}> = ({ buildings, infection }) => {
  const markers = useMemo(() => getInfectionMarkers(buildings, infection), [buildings, infection]);
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const pulse = 0.75 + Math.sin(t * 1.5 + index) * 0.15;
      mesh.scale.setScalar(pulse);
    });
  });

  if (markers.length === 0) return null;

  const statusColor = (status: BuildingInfectionState['status']) => {
    if (status === 'deceased') return '#dc2626';
    if (status === 'infected') return '#f97316';
    return '#facc15';
  };

  return (
    <group>
      {markers.map((marker, index) => (
        <mesh
          key={`infection-${marker.id}`}
          ref={(el) => { meshRefs.current[index] = el; }}
          position={marker.position}
          rotation={[0, marker.rotation, 0]}
        >
          <planeGeometry args={[1.1, 0.5]} />
          <meshBasicMaterial
            color={statusColor(marker.status)}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const WindowLightPool: React.FC<{ buildings: BuildingMetadata[]; timeOfDay: number }> = ({ buildings, timeOfDay }) => {
  const lightPool = useRef<THREE.PointLight[]>([]);
  const windowPositions = useMemo(() => getWindowGlowPositions(buildings), [buildings]);
  const nightFactor = timeOfDay >= 19 || timeOfDay < 5 ? 1 : timeOfDay >= 17 ? (timeOfDay - 17) / 2 : timeOfDay < 7 ? (7 - timeOfDay) / 2 : 0;
  // PERFORMANCE FIX: Reduced from 10 to 6, then to 3 for nighttime performance
  const activeCount = Math.min(3, windowPositions.length);
  const tickRef = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // PERFORMANCE FIX: Update every 0.5s instead of every frame
    if (t - tickRef.current < 0.5) return;
    tickRef.current = t;

    lightPool.current.forEach((light, i) => {
      if (i >= activeCount) {
        light.intensity = 0;
        return;
      }
      light.position.copy(windowPositions[i]);
      light.intensity = 0.6 * nightFactor;
    });
  });

  return (
    <>
      {/* PERFORMANCE FIX: Reduced from 10 to 6, then to 3 for nighttime performance */}
      {Array.from({ length: 3 }).map((_, i) => (
        <pointLight
          key={`window-light-${i}`}
          ref={(el) => { if (el) lightPool.current[i] = el; }}
          color="#f3c57a"
          intensity={0}
          distance={8}
          decay={2}
        />
      ))}
    </>
  );
};

const MilkyWay: React.FC<{ visible: boolean; simTime: number }> = ({ visible, simTime }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 1.5;
      const alpha = 0.2 + Math.random() * 0.8;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, size, size);
    }
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height * 0.7);
    gradient.addColorStop(0, 'rgba(120,140,170,0)');
    gradient.addColorStop(0.5, 'rgba(180,200,230,0.35)');
    gradient.addColorStop(1, 'rgba(120,140,170,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.2, canvas.width, canvas.height * 0.6);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }, []);

  // GRAPHICS: Moon phase affects Milky Way visibility (full moon washes it out)
  const moonPhase = (simTime / 29.5) % 1; // 0=new moon, 0.5=full moon
  const moonBrightness = 1 - Math.abs(moonPhase - 0.5) * 2; // 0 at new moon, 1 at full moon
  const baseOpacity = 0.35;
  const opacity = baseOpacity * (1 - moonBrightness * 0.5); // Reduce by 50% during full moon

  if (!texture) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.6, 0, 0]} visible={visible}>
      <sphereGeometry args={[220, 32, 16]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
};

const SkyGradientDome: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const sunriseBoost = useMemo(() => 0.6 + Math.random() * 0.4, []);
  const sunsetBoost = useMemo(() => 0.6 + Math.random() * 0.4, []);
  const dawnVariant = useMemo(() => Math.random(), []);
  const prevTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const skyKey = Math.round(timeOfDay * 12) / 12; // Update every 5 min of sim time

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const t = skyKey;
    const sunAngle = (t / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const dayFactor = smoothstep(-0.1, 0.35, elevation);
    const twilightFactor = smoothstep(-0.35, 0.05, elevation) * (1 - dayFactor);
    const nightFactor = 1 - smoothstep(-0.45, 0.1, elevation);

    const dawnTop = dawnVariant > 0.5 ? new THREE.Color('#3a2f52') : new THREE.Color('#1b2438');
    const dawnMid = dawnVariant > 0.7
      ? new THREE.Color('#9a6a8a')
      : dawnVariant > 0.3
        ? new THREE.Color('#8a5a7a')
        : new THREE.Color('#6a3f61');
    const dawnBottom = dawnVariant > 0.6
      ? new THREE.Color('#f5b8a8')
      : new THREE.Color('#f0a06a');

    const dayTop = new THREE.Color('#5aa6e8');
    const dayMid = new THREE.Color('#49a6ef');
    const dayBottom = new THREE.Color('#2f95ee');
    const duskTop = new THREE.Color('#2a3558');
    const duskMid = new THREE.Color('#a05044');
    const duskBottom = new THREE.Color('#f7b25a');
    const nightTop = new THREE.Color('#05080f');
    const nightMid = new THREE.Color('#0a1220');
    const nightBottom = new THREE.Color('#0c1426');

    const soften = (v: number) => Math.pow(v, 0.7);
    const dayMix = soften(dayFactor);
    const duskMix = soften(twilightFactor);
    const nightMix = soften(nightFactor);

    const duskBlend = duskMix * (1 - nightMix * 0.8);
    const top = nightTop.clone()
      .lerp(dayTop, dayMix)
      .lerp(duskTop, duskBlend)
      .lerp(dawnTop, duskBlend * 0.9);
    const mid = nightMid.clone()
      .lerp(dayMid, dayMix)
      .lerp(duskMid, duskBlend)
      .lerp(dawnMid, duskBlend * 0.9);
    const bottom = nightBottom.clone()
      .lerp(dayBottom, dayMix)
      .lerp(duskBottom, duskBlend)
      .lerp(dawnBottom, duskBlend * 0.9);

    // Midday desaturation for washed Damascus light
    const desat = THREE.MathUtils.lerp(0.2, 0, Math.abs(elevation));
    top.lerp(new THREE.Color(top).lerp(new THREE.Color('#cfd8e6'), desat), 0.25);
    mid.lerp(new THREE.Color(mid).lerp(new THREE.Color('#d6dde8'), desat), 0.25);
    bottom.lerp(new THREE.Color(bottom).lerp(new THREE.Color('#e6d6b8'), desat), 0.25);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${top.getHexString()}`);
    gradient.addColorStop(0.55, `#${mid.getHexString()}`);
    gradient.addColorStop(1, `#${bottom.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Secondary warm band near horizon
    const bandStrength = Math.max(0, twilightFactor - 0.1);
    if (bandStrength > 0.01) {
      const bandStart = canvas.height * 0.65;
      const flare = ctx.createLinearGradient(0, bandStart, 0, canvas.height);
      flare.addColorStop(0, `rgba(255,140,90,${0.35 * sunsetBoost * bandStrength})`);
      flare.addColorStop(1, `rgba(255,210,150,${0.45 * sunsetBoost * bandStrength})`);
      ctx.fillStyle = flare;
      ctx.fillRect(0, bandStart, canvas.width, canvas.height - bandStart);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [skyKey, sunriseBoost, sunsetBoost, dawnVariant]);

  const easedTexture = useMemo(() => {
    if (!texture) return null;
    const prev = prevTextureRef.current;
    if (!prev) {
      prevTextureRef.current = texture;
      return texture;
    }
    prevTextureRef.current = texture;
    return texture;
  }, [texture]);

  if (!easedTexture) return null;
  return (
    <mesh rotation={[0, 0, 0]}>
      <sphereGeometry args={[210, 32, 16]} />
      <meshBasicMaterial map={easedTexture} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
};

// Create sun radial gradient texture for realistic appearance without z-fighting
const createSunTexture = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;
  const maxRadius = size / 2;

  // Multi-stop radial gradient for warm, golden sun - must fade to full transparency at edges!
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
  gradient.addColorStop(0, 'rgba(255, 252, 235, 1.0)');    // Warm white core
  gradient.addColorStop(0.15, 'rgba(255, 248, 220, 1.0)'); // Soft yellow-white
  gradient.addColorStop(0.35, 'rgba(255, 240, 195, 0.95)'); // Golden yellow
  gradient.addColorStop(0.55, 'rgba(255, 225, 160, 0.82)'); // Warm golden glow
  gradient.addColorStop(0.70, 'rgba(255, 200, 120, 0.65)'); // Orange-gold
  gradient.addColorStop(0.85, 'rgba(255, 170, 85, 0.3)');   // Warm orange fade
  gradient.addColorStop(0.95, 'rgba(255, 145, 65, 0.08)');  // Near edge warm
  gradient.addColorStop(1.0, 'rgba(255, 140, 60, 0.0)');    // FULL transparency at edge (no squares!)

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

const SunDisc: React.FC<{ timeOfDay: number; weather: React.MutableRefObject<WeatherState> }> = ({ timeOfDay, weather }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Create sun texture once
  const sunTexture = useMemo(() => createSunTexture(256), []);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current || !glowRef.current || !outerGlowRef.current) return;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const radius = 120;
    const visible = elevation > -0.1;

    groupRef.current.visible = visible;
    if (!visible) return;

    const sunPos = new THREE.Vector3(
      Math.cos(sunAngle - Math.PI / 2) * radius,
      Math.max(-10, elevation * 90),
      60
    );
    groupRef.current.position.copy(sunPos);
    groupRef.current.lookAt(0, 0, 0);

    // GRAPHICS: Horizon size scaling - sun appears MUCH larger near horizon, smaller at zenith
    const horizonFactor = smoothstep(0.35, -0.08, elevation); // 0 at zenith, 1 at horizon
    const zenithShrink = 1 - (1 - horizonFactor) * 0.35; // Shrink to 0.65x at zenith
    const horizonGrowth = 1 + horizonFactor * 0.8; // Grow to 1.8x at horizon
    const sizeScale = zenithShrink * horizonGrowth;

    meshRef.current.scale.setScalar(sizeScale);
    glowRef.current.scale.setScalar(sizeScale);
    outerGlowRef.current.scale.setScalar(sizeScale);

    // GRAPHICS: Atmospheric corona intensification near horizon (sunset/sunrise)
    const coronaIntensity = smoothstep(0.2, -0.05, elevation);

    // WEATHER-AWARE COLORING: More particles in air = more scattering = more dramatic colors
    const cloudCover = weather.current.cloudCover;
    const humidity = weather.current.humidity;
    const atmosphericDensity = (cloudCover * 0.6 + humidity * 0.4); // 0-1, more particles = more scattering

    // Determine if sunrise (morning) or sunset (evening)
    const hour = timeOfDay % 24;
    const isSunrise = hour >= 4 && hour <= 7;
    const isSunset = hour >= 17 && hour <= 20;
    const twilightFactor = isSunrise || isSunset ? Math.min(1, coronaIntensity * 1.5) : 0;

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
    const outerGlowMaterial = outerGlowRef.current.material as THREE.MeshBasicMaterial;

    // Base warm golden tint
    let sunR = 1.0;
    let sunG = 0.92 - coronaIntensity * 0.28;
    let sunB = 0.75 - coronaIntensity * 0.40;

    // DRAMATIC SUNRISE/SUNSET COLORS: Purple-pink-red based on atmospheric conditions
    if (twilightFactor > 0.1) {
      const scatteringBoost = 1 + atmosphericDensity * 1.2; // More particles = more vivid colors
      const twilightIntensity = twilightFactor * scatteringBoost;

      if (isSunrise) {
        // Sunrise: Pink-purple-gold progression
        const pinkR = 1.0;
        const pinkG = 0.55 + atmosphericDensity * 0.15; // More atmospheric = more pink
        const pinkB = 0.75 + atmosphericDensity * 0.15; // Purple tint with particles

        sunR = THREE.MathUtils.lerp(sunR, pinkR, twilightIntensity * 0.4);
        sunG = THREE.MathUtils.lerp(sunG, pinkG, twilightIntensity * 0.45);
        sunB = THREE.MathUtils.lerp(sunB, pinkB, twilightIntensity * 0.35);
      } else {
        // Sunset: Deep orange-red-purple progression
        const redR = 1.0;
        const redG = 0.35 + atmosphericDensity * 0.2; // More atmospheric = deeper red
        const redB = 0.45 + atmosphericDensity * 0.25; // Purple undertones with particles

        sunR = THREE.MathUtils.lerp(sunR, redR, twilightIntensity * 0.5);
        sunG = THREE.MathUtils.lerp(sunG, redG, twilightIntensity * 0.55);
        sunB = THREE.MathUtils.lerp(sunB, redB, twilightIntensity * 0.4);
      }
    }

    material.color.setRGB(sunR, sunG, sunB);

    // Glow layers get even more saturated twilight colors
    const glowBoost = 1 + twilightFactor * 0.3;
    glowMaterial.color.setRGB(sunR, sunG * 0.88 * glowBoost, sunB * 0.70);
    outerGlowMaterial.color.setRGB(sunR, sunG * 0.82 * glowBoost, sunB * 0.60);

    // Increase glow intensity at horizon for more dramatic sunrises/sunsets
    const twilightGlow = twilightFactor * atmosphericDensity * 0.4; // More atmospheric = more glow
    glowMaterial.opacity = 0.65 + coronaIntensity * 0.25 + twilightGlow;
    outerGlowMaterial.opacity = 0.3 + coronaIntensity * 0.2 + twilightGlow * 0.8;
  });

  return (
    <group ref={groupRef}>
      {/* Outer atmospheric glow - largest, most subtle */}
      <mesh ref={outerGlowRef}>
        <planeGeometry args={[35, 35]} />
        <meshBasicMaterial
          map={sunTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.3}
        />
      </mesh>

      {/* Soft corona ring - smooths edge into the sky */}
      <mesh>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial
          map={sunTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.22}
        />
      </mesh>

      {/* Middle glow layer - bright halo */}
      <mesh ref={glowRef}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial
          map={sunTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.65}
        />
      </mesh>

      {/* Core sun disc - brightest, most defined */}
      <mesh ref={meshRef}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial
          map={sunTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Hot core - crisp center highlight */}
      <mesh>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial
          color="#fff7e5"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.55}
        />
      </mesh>
    </group>
  );
};


export const Simulation: React.FC<SimulationProps> = ({ params, simTime, devSettings, playerStats, onStatsUpdate, onMapChange, onNearBuilding, onBuildingsUpdate, onNearMerchant, onNearSpeakableNpc, onNpcSelect, onNpcUpdate, selectedNpcId, onMinimapUpdate, onPickupPrompt, onClimbablePrompt, onClimbingStateChange, climbInputRef, onPickupItem, onWeatherUpdate, onPushCharge, onMoraleUpdate, actionEvent, showDemographicsOverlay, npcStateOverride, npcPool = [], buildingInfection, onPlayerPositionUpdate, dossierMode, onPlagueExposure, onNPCInitiatedEncounter, onFallDamage, cameraViewTarget, onPlayerStartMove, dropRequests, observeMode, gameLoading }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const shadowFillLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const marketBounceRef = useRef<THREE.PointLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ratsRef = useRef<Rat[] | null>(null);
  const catPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const ratPositionsRef = useRef<THREE.Vector3[]>([]);
  const npcPositionsRef = useRef<THREE.Vector3[]>([]);
  const playerRef = useRef<THREE.Group>(null);
  const sprintStateRef = useRef(false);
  const { scene, gl } = useThree();

  // PERFORMANCE: Reusable color objects to avoid garbage collection
  const colorCache = useRef({
    sunColor: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    skyMid: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    fogColor: new THREE.Color(),
    skyColor: new THREE.Color(),
    ambientColor: new THREE.Color(),
    rimColor: new THREE.Color(),
    shadowFillColor: new THREE.Color(),
    temp1: new THREE.Color(),
    temp2: new THREE.Color(),
    temp3: new THREE.Color(),
  });
  const buildingHashRef = useRef<SpatialHash<BuildingMetadata> | null>(null);
  const agentHashRef = useRef<SpatialHash<AgentSnapshot> | null>(null);
  const impactMapRef = useRef<Map<string, { time: number; intensity: number }>>(new Map());
  const impactPuffsRef = useRef<ImpactPuffSlot[]>(Array.from({ length: MAX_PUFFS }, () => null));
  const impactPuffIndexRef = useRef(0);
  const atmosphereTickRef = useRef(0);
  const minimapTickRef = useRef(0);
  const lastMinimapPosRef = useRef<THREE.Vector3 | null>(null);
  const lastMinimapYawRef = useRef(0);
  const heightmapRef = useRef<import('../utils/terrain').TerrainHeightmap | null>(null);
  
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [playerSpawn, setPlayerSpawn] = useState<[number, number, number]>(() => {
    // Start at edge to avoid spawning inside buildings in dense districts
    return params.mapX === 0 && params.mapY === 0 ? [6, 0, 6] : [28, 0, 28];
  });
  const [buildingsState, setBuildingsState] = useState<BuildingMetadata[]>([]);
  const buildingsRef = useRef<BuildingMetadata[]>([]);
  const [climbablesState, setClimbablesState] = useState<import('../types').ClimbableAccessory[]>([]);
  const [currentNearBuilding, setCurrentNearBuilding] = useState<BuildingMetadata | null>(null);
  const [currentNearMerchant, setCurrentNearMerchant] = useState<MerchantNPCType | null>(null);
  const [currentNearSpeakableNpc, setCurrentNearSpeakableNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
  const nearSpeakableNpcTickRef = useRef(0);

  // Ambient audio state
  const moraleStatsRef = useRef<MoraleStats>({ avgAwareness: 0, avgPanic: 0, agentCount: 0 });
  const nearbyInfectedRef = useRef(0);
  const nearbyDeceasedRef = useRef(0);
  const playerPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const terrainSeed = useMemo(() => params.mapX * 1000 + params.mapY * 13 + 19, [params.mapX, params.mapY]);
  const sessionSeed = useMemo(() => Math.floor(Math.random() * 1000000), []);
  const district = useMemo(() => getDistrictType(params.mapX, params.mapY), [params.mapX, params.mapY]);

  // cameraViewTarget is passed directly to Player component - only moves camera, not player
  const isOutskirts = district === 'OUTSKIRTS_FARMLAND' || district === 'OUTSKIRTS_DESERT';
  useEffect(() => {
    // Start at edge to avoid spawning inside buildings in dense districts
    setPlayerSpawn(params.mapX === 0 && params.mapY === 0 ? [6, 0, 6] : [28, 0, 28]);
  }, [params.mapX, params.mapY]);
  const pushableSeed = useMemo(
    () => params.mapX * 1000 + params.mapY * 100 + sessionSeed,
    [params.mapX, params.mapY, sessionSeed]
  );
  const buildPushables = useCallback((): PushableObject[] => {
    const district = getDistrictType(params.mapX, params.mapY);
    const roll = seededRandom(params.mapX * 1000 + params.mapY * 13 + 101);
    const items: PushableObject[] = [];
    const addCoin = (id: string, position: [number, number, number]) => {
      const coinRoll = seededRandom(params.mapX * 1000 + params.mapY * 13 + id.length);
      const coins = [
        { label: 'Copper Fals', value: 1 },
        { label: 'Silver Dirham', value: 4 },
        { label: 'Gold Dinar', value: 12 }
      ];
      const coin = coins[Math.floor(coinRoll * coins.length)];
      const item = createPushable(id, 'coin', position, 0.18, 0.3, 0, 'stone');
      item.pickup = { type: 'coin', label: `${coin.label} (+${coin.value})`, value: coin.value };
      items.push(item);
    };
    const addPickupItem = (id: string, kind: PushableObject['kind'], position: [number, number, number], label: string, itemId: string) => {
      const item = createPushable(id, kind, position, 0.2, 0.4, 0.2, 'cloth');
      item.pickup = { type: 'item', label, itemId };
      items.push(item);
    };
    const addProduce = (id: string, kind: PushableObject['kind'], position: [number, number, number], label: string, itemId: string) => {
      const item = createPushable(id, kind, position, 0.18, 0.3, 0.1, 'wood');
      item.pickup = { type: 'produce', label, itemId };
      items.push(item);
    };
    const addVariedPot = (id: string, position: [number, number, number], seed: number) => {
      const potTypes: PushableObject['kind'][] = ['olivePot', 'lemonPot', 'palmPot', 'bougainvilleaPot', 'geranium'];
      const kind = potTypes[Math.floor(seededRandom(seed + 1) * potTypes.length)];
      const potSize = 0.7 + seededRandom(seed + 2) * 0.6; // 0.7 to 1.3
      const potStyle = Math.floor(seededRandom(seed + 3) * 3); // 0, 1, or 2
      const item = createPushable(id, kind, position, 0.8, 1.8, seededRandom(seed + 4) * Math.PI * 2, 'ceramic');
      item.potSize = potSize;
      item.potStyle = potStyle;
      items.push(item);
    };
    if (district === 'MARKET') {
      items.push(
        createPushable('bench-north', 'bench', [-12, 0.2, 9], 1.1, 2.6, Math.PI / 6, 'stone'),
        createPushable('bench-south', 'bench', [12, 0.2, -9], 1.1, 2.6, -Math.PI / 8, 'stone'),
        createPushable('jar-west', 'clayJar', [-3.2, 0.3, -3.2], 0.65, 0.9, 0, 'ceramic'),
        createPushable('jar-east', 'clayJar', [3.4, 0.3, 3.3], 0.65, 0.9, 0, 'ceramic')
      );
      if (roll > 0.4) {
        items.push(
          createPushable('geranium-east', 'geranium', [6.2, 0.2, -5.0], 0.85, 1.2, 0, 'ceramic'),
          createPushable('geranium-west', 'geranium', [-5.6, 0.2, 6.0], 0.85, 1.2, 0, 'ceramic')
        );
      }
      if (roll > 0.6) {
        items.push(
          createPushable('basket-north', 'basket', [-7.8, 0.2, 4.2], 0.6, 0.6, 0.2, 'wood'),
          createPushable('basket-south', 'basket', [7.4, 0.2, -4.6], 0.6, 0.6, -0.1, 'wood')
        );
      }
      addCoin('coin-market-1', [-2.6, 0.05, 1.6]);
      addPickupItem('shard-market-1', 'potteryShard', [2.8, 0.05, -1.4], 'Pottery Shard', 'ground-pottery');
      addPickupItem('linen-market-1', 'linenScrap', [-6.2, 0.05, -0.6], 'Linen Scrap', 'ground-linen');
      addPickupItem('candle-market-1', 'candleStub', [5.6, 0.05, 2.8], 'Candle Stub', 'ground-candle');

      // PHYSICS: Add pushable crates around edges (heavy wood boxes)
      items.push(
        createPushable('crate-1', 'crate', [-25, 0.4, 32], 0.5, 8.0, 0.1, 'wood'),
        createPushable('crate-2', 'crate', [-22, 0.4, 34], 0.5, 8.0, -0.2, 'wood'),
        createPushable('crate-3', 'crate', [28, 0.4, 30], 0.5, 8.0, 0.3, 'wood'),
        createPushable('crate-4', 'crate', [30, 0.4, 32], 0.5, 8.0, -0.1, 'wood'),
        createPushable('crate-5', 'crate', [32, 0.4, 31], 0.5, 8.0, 0.2, 'wood'),
        createPushable('crate-6', 'crate', [-30, 0.4, -30], 0.5, 8.0, 0.0, 'wood'),
        createPushable('crate-7', 'crate', [-28, 0.4, -32], 0.5, 8.0, 0.15, 'wood'),
        createPushable('crate-8', 'crate', [26, 0.4, -28], 0.5, 8.0, -0.25, 'wood'),
        createPushable('crate-9', 'crate', [24, 0.4, -30], 0.5, 8.0, 0.1, 'wood')
      );

      // PHYSICS: Add pushable amphorae in clusters (heavy ceramic jars - can shatter!)
      items.push(
        // Cluster near north (grounded: y=0.15 instead of 0.6)
        createPushable('amphora-1', 'amphora', [2, 0.15, 36], 0.4, 6.5, 0, 'ceramic'),
        createPushable('amphora-2', 'amphora', [4, 0.15, 36.5], 0.4, 6.5, 0.2, 'ceramic'),
        createPushable('amphora-3', 'amphora', [3, 0.15, 37.5], 0.4, 6.5, -0.1, 'ceramic'),
        // Cluster near west
        createPushable('amphora-4', 'amphora', [-18, 0.15, 34], 0.4, 6.5, 0.3, 'ceramic'),
        createPushable('amphora-5', 'amphora', [-17, 0.15, 35], 0.4, 6.5, -0.15, 'ceramic'),
        createPushable('amphora-6', 'amphora', [-19, 0.15, 35.5], 0.4, 6.5, 0.1, 'ceramic'),
        // Cluster near east
        createPushable('amphora-7', 'amphora', [17, 0.15, 34], 0.4, 6.5, -0.2, 'ceramic'),
        createPushable('amphora-8', 'amphora', [18, 0.15, 35], 0.4, 6.5, 0, 'ceramic'),
        createPushable('amphora-9', 'amphora', [16, 0.15, 35.5], 0.4, 6.5, 0.25, 'ceramic'),
        // Small cluster in corner
        createPushable('amphora-10', 'amphora', [-32, 0.15, 22], 0.4, 6.5, 0.1, 'ceramic'),
        createPushable('amphora-11', 'amphora', [-31, 0.15, 23], 0.4, 6.5, -0.1, 'ceramic')
      );

      return items;
    }
    if (district === 'WEALTHY') {
      addVariedPot('pot-wealthy-1', [6.2, 0.2, 4.8], pushableSeed + 101);
      addVariedPot('pot-wealthy-2', [-6.4, 0.2, -4.6], pushableSeed + 102);
      addVariedPot('pot-wealthy-3', [8.6, 0.2, 6.2], pushableSeed + 103);
      addVariedPot('pot-wealthy-4', [-8.6, 0.2, 6.2], pushableSeed + 104);
      addVariedPot('pot-wealthy-5', [8.8, 0.2, -6.4], pushableSeed + 105);
      if (roll > 0.5) {
        items.push(createPushable('bench-wealthy', 'bench', [10.5, 0.2, 8.5], 1.1, 2.6, 0.4, 'stone'));
      }
      addProduce('olive-wealthy-1', 'olive', [5.6, 0.05, 5.4], 'Olives (Handful)', 'ground-olives');
      addProduce('lemon-wealthy-1', 'lemon', [9.2, 0.05, 5.7], 'Lemon', 'ground-lemons');
      addCoin('coin-wealthy-1', [-1.2, 0.05, 2.6]);
      return items;
    }
    if (district === 'HOVELS') {
      items.push(
        createPushable('jar-hovel-1', 'clayJar', [-2.6, 0.3, 2.2], 0.6, 0.8, 0, 'ceramic'),
        createPushable('jar-hovel-2', 'clayJar', [2.4, 0.3, -2.0], 0.6, 0.8, 0, 'ceramic'),
        createPushable('basket-hovel', 'basket', [1.4, 0.2, 3.6], 0.6, 0.6, -0.2, 'wood'),
        createPushable('basket-hovel-2', 'basket', [-3.1, 0.2, -2.8], 0.6, 0.6, 0.15, 'wood'),
        createPushable('jar-hovel-3', 'clayJar', [3.3, 0.3, 3.4], 0.6, 0.8, 0, 'ceramic')
      );
      addPickupItem('twine-hovel-1', 'twine', [-1.6, 0.05, 3.2], 'Palm Twine', 'ground-twine');
      addPickupItem('shard-hovel-1', 'potteryShard', [2.4, 0.05, -3.2], 'Pottery Shard', 'ground-pottery');
      addCoin('coin-hovel-1', [0.6, 0.05, -1.2]);
      return items;
    }
    if (district === 'ALLEYS' || district === 'JEWISH_QUARTER') {
      items.push(
        createPushable('jar-alley', 'clayJar', [-1.8, 0.3, 1.6], 0.6, 0.8, 0, 'ceramic'),
        createPushable('basket-alley', 'basket', [2.2, 0.2, -1.2], 0.6, 0.6, 0.1, 'wood')
      );
      addPickupItem('linen-alley-1', 'linenScrap', [-0.8, 0.05, 0.4], 'Linen Scrap', 'ground-linen');
      addPickupItem('candle-alley-1', 'candleStub', [1.4, 0.05, -2.0], 'Candle Stub', 'ground-candle');
      addCoin('coin-alley-1', [-2.4, 0.05, -0.4]);
      return items;
    }
    if (district === 'CIVIC') {
      items.push(
        createPushable('bench-civic', 'bench', [6.8, 0.2, -6.2], 1.1, 2.6, -0.3, 'stone')
      );
      addVariedPot('pot-civic-1', [-5.2, 0.2, 4.8], pushableSeed + 201);
      addVariedPot('pot-civic-2', [4.8, 0.2, -4.4], pushableSeed + 202);
      addProduce('olive-civic-1', 'olive', [-4.6, 0.05, 5.4], 'Olives (Handful)', 'ground-olives');
      addProduce('lemon-civic-1', 'lemon', [5.4, 0.05, -5.2], 'Lemon', 'ground-lemons');
      addCoin('coin-civic-1', [0.8, 0.05, 1.4]);
      return items;
    }
    items.push(
      createPushable('jar-res-1', 'clayJar', [-2.2, 0.3, -1.8], 0.6, 0.8, 0, 'ceramic')
    );
    addVariedPot('pot-res-1', [2.6, 0.2, 2.4], pushableSeed + 301);
    addPickupItem('shard-res-1', 'potteryShard', [-0.6, 0.05, 1.2], 'Pottery Shard', 'ground-pottery');
    addPickupItem('candle-res-1', 'candleStub', [1.6, 0.05, -1.4], 'Candle Stub', 'ground-candle');
    addCoin('coin-res-1', [0.2, 0.05, -2.2]);

    // Generate boulders for hilly districts
    if (district === 'MOUNTAIN_SHRINE' || district === 'SALHIYYA' || isOutskirts) {
      const getBoulderPositions = (): Array<[number, number, number]> => {
        if (district === 'MOUNTAIN_SHRINE') {
          // Reuse existing rock positions from Environment.tsx
          return [
            [-30, 0, -20], [-22, 0, -8], [-15, 0, -25], [-8, 0, -15],
            [25, 0, -15], [18, 0, -5], [12, 0, -20], [20, 0, -25],
            [-25, 0, 15], [-18, 0, 22], [-12, 0, 8], [-20, 0, 25],
            [15, 0, 18], [22, 0, 25], [8, 0, 12], [18, 0, 8],
            [-12, 0, 5], [10, 0, -8], [-18, 0, -12], [15, 0, -18],
          ];
        }
        if (district === 'SALHIYYA') {
          // Generate 28 boulders on hillsides
          return [
            [-35, 0, -25], [-28, 0, -18], [-22, 0, -30], [-18, 0, -12], [-32, 0, -10],
            [30, 0, -20], [25, 0, -28], [20, 0, -15], [35, 0, -22], [28, 0, -12],
            [-30, 0, 22], [-25, 0, 28], [-20, 0, 18], [-35, 0, 20], [-22, 0, 25],
            [28, 0, 25], [22, 0, 30], [32, 0, 22], [25, 0, 18],
            [-15, 0, -35], [-10, 0, -28], [12, 0, -32], [15, 0, -25],
            [-12, 0, 32], [-8, 0, 28], [10, 0, 35], [8, 0, 30], [15, 0, 28],
          ];
        }
        if (isOutskirts) {
          // Generate 8 boulders on rolling hills
          return [
            [-32, 0, -22], [-25, 0, -15],
            [28, 0, -18], [22, 0, -25],
            [-28, 0, 20], [-22, 0, 28],
            [25, 0, 22], [30, 0, 28],
          ];
        }
        return [];
      };

      const calculateBoulderMass = (size: number): number => {
        const volume = (4 / 3) * Math.PI * Math.pow(size, 3);
        const stoneDensity = 2.5; // Heavier than wood baseline
        return volume * stoneDensity * 10; // Scale up for gameplay feel
      };

      const boulderPositions = getBoulderPositions();
      boulderPositions.forEach((pos, i) => {
        const size = 0.4 + seededRandom(sessionSeed + i * 1000) * 0.8; // 0.4-1.2 range
        const mass = calculateBoulderMass(size);
        const boulder = createPushable(
          `boulder-${district}-${i}`,
          'boulder',
          [pos[0], 0, pos[2]], // Y=0, will be positioned by physics/rendering
          size * 0.7, // Collision radius slightly smaller than visual
          mass,
          Math.random() * Math.PI * 2, // Random initial rotation
          'stone'
        );
        boulder.isSleeping = true; // Start sleeping for performance
        items.push(boulder);
      });
    }

    return items;
  }, [params.mapX, params.mapY]);
  const [pushables, setPushables] = useState<PushableObject[]>(() => buildPushables());
  useEffect(() => {
    setPushables(buildPushables());
  }, [buildPushables]);
  const pushablesRef = useRef<PushableObject[]>(pushables);
  useEffect(() => {
    pushablesRef.current = pushables;
  }, [pushables]);
  const processedDropsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!dropRequests || dropRequests.length === 0) return;
    setPushables(prev => {
      const next = [...prev];
      dropRequests.forEach((drop) => {
        if (processedDropsRef.current.has(drop.id)) return;
        if (drop.location !== 'outdoor') return;
        const item = createPushable(
          drop.id,
          'droppedItem',
          [drop.position[0], drop.position[1] + 1.6, drop.position[2]],
          0.25,
          0.4,
          Math.random() * Math.PI * 2,
          drop.material ?? 'cloth',
          drop.appearance
        );
        item.velocity.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
        item.pickup = { type: 'item', label: drop.label, itemId: drop.itemId };
        next.push(item);
        processedDropsRef.current.add(drop.id);
      });
      return next;
    });
  }, [dropRequests]);
  const handlePickupItem = useCallback((itemId: string, pickup: PickupInfo) => {
    setPushables(prev => prev.filter(item => item.id !== itemId));
    onPickupItem?.(pickup);
  }, [onPickupItem]);

  // Plague exposure handler - called when player is exposed to plague
  const handlePlagueExposure = useCallback((
    exposureType: 'flea' | 'airborne' | 'contact',
    intensity: number
  ) => {
    if (playerStats.plague.state !== AgentState.HEALTHY) return;

    const updatedPlague = exposePlayerToPlague(
      playerStats.plague,
      exposureType,
      intensity,
      simTime
    );

    if (updatedPlague.state !== AgentState.HEALTHY) {
      onPlagueExposure?.(updatedPlague);

      // Subtle notification
      onPickupPrompt?.("You feel a sudden chill...");
      setTimeout(() => onPickupPrompt?.(null), 2000);
    }
  }, [playerStats.plague, simTime, onPlagueExposure, onPickupPrompt]);

  // Generate laundry lines between buildings
  const buildLaundryLines = useCallback((): LaundryLine[] => {
    const lines: LaundryLine[] = [];
    const buildings = buildingsRef.current;

    if (buildings.length < 2) return lines;

    const district = getDistrictType(params.mapX, params.mapY);
    const baseSeed = params.mapX * 1000 + params.mapY * 13 + 500;

    // Find building pairs for laundry lines
    const checked = new Set<string>();
    buildings.forEach((b1, i) => {
      buildings.forEach((b2, j) => {
        if (i >= j) return;

        const pairId = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (checked.has(pairId)) return;
        checked.add(pairId);

        const dx = b2.position[0] - b1.position[0];
        const dz = b2.position[2] - b1.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Only connect buildings 4-12 units apart
        if (distance < 4 || distance > 12) return;

        // Check district density
        const lineSeed = baseSeed + i * 1000 + j;
        if (!shouldGenerateLaundryLine(district, lineSeed)) return;

        // Create line with attachment points high on buildings
        const height1 = b1.position[1] + 3.5 + seededRandom(lineSeed + 1) * 1.0;
        const height2 = b2.position[1] + 3.5 + seededRandom(lineSeed + 2) * 1.0;

        const start: [number, number, number] = [b1.position[0], height1, b1.position[2]];
        const end: [number, number, number] = [b2.position[0], height2, b2.position[2]];

        lines.push(generateLaundryLine(`laundry-${i}-${j}`, start, end, district, lineSeed));
      });
    });

    return lines;
  }, [params.mapX, params.mapY]);

  const [laundryLines, setLaundryLines] = useState<LaundryLine[]>([]);

  // Update laundry lines when buildings change
  useEffect(() => {
    if (buildingsRef.current.length > 0) {
      setLaundryLines(buildLaundryLines());
    }
  }, [buildingsState, buildLaundryLines]);

  // Generate hanging carpets for market districts (4-5 max)
  const [hangingCarpets, setHangingCarpets] = useState<HangingCarpet[]>([]);

  useEffect(() => {
    const district = getDistrictType(params.mapX, params.mapY);

    // Only generate carpets in MARKET districts
    if (district !== 'MARKET' || buildingsRef.current.length < 2) {
      setHangingCarpets([]);
      return;
    }

    const carpets = generateMarketCarpets(buildingsRef.current, params.mapX, params.mapY, sessionSeed);
    setHangingCarpets(carpets);
  }, [buildingsState, params.mapX, params.mapY, sessionSeed]);

  // Generate spatial audio sources from buildings
  const spatialAudioSources = useMemo<SpatialSource[]>(() => {
    const sources: SpatialSource[] = [];

    // Central fountain/well (always at origin in main square)
    if (params.mapX === 0 && params.mapY === 0) {
      sources.push({
        id: 'central-fountain',
        type: 'water',
        position: [0, 0, 0],
      });
    }

    // Generate sources from buildings based on profession
    for (const building of buildingsState) {
      const profession = building.ownerProfession?.toLowerCase() || '';

      // Mosques
      if (profession.includes('imam') || profession.includes('mosque')) {
        sources.push({
          id: `mosque-${building.id}`,
          type: 'mosque',
          position: building.position,
        });
      }

      // Blacksmiths - forge fire
      if (profession.includes('blacksmith') || profession.includes('smith')) {
        sources.push({
          id: `forge-${building.id}`,
          type: 'fire',
          position: building.position,
        });
      }

      // Market-related professions
      if (
        profession.includes('merchant') ||
        profession.includes('vendor') ||
        profession.includes('seller')
      ) {
        sources.push({
          id: `market-${building.id}`,
          type: 'market',
          position: building.position,
        });
      }
    }

    return sources;
  }, [buildingsState, params.mapX, params.mapY]);

  // Procedurally generate 1-3 market stalls in the main marketplace
  const marketStalls = useMemo<MarketStallData[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (!isOutskirts && district !== 'CARAVANSERAI') return [];
    }

    const seed = params.mapX * 1000 + params.mapY * 100 + sessionSeed;
    let randCounter = 0;
    const rand = () => seededRandom(seed + randCounter++ * 137);

    const stallCount = isOutskirts ? 1 : district === 'CARAVANSERAI' ? 6 : 1 + Math.floor(rand() * 3); // 1-3 stalls
    const stalls: MarketStallData[] = [];

    // Available stall types
    const stallTypes = Object.values(MarketStallType);

    // Awning color palettes (period-appropriate)
    const awningColors = [
      '#8b0000', '#dc143c', '#b8860b', '#daa520', // Reds and golds (wealthy merchants)
      '#4169e1', '#1e90ff', '#2e8b57', '#228b22', // Blues and greens
      '#d2691e', '#cd853f', '#deb887', '#f5deb3'  // Earth tones (common)
    ];

    const woodColors = ['#8b4513', '#a0522d', '#6b4423', '#3e2723'];

    // Keep track of occupied positions to avoid overlaps
    const occupiedZones: { x: number; z: number; radius: number }[] = [
      { x: 0, z: 0, radius: 6 },    // Fountain
      { x: -9, z: 0, radius: 2 },   // Left column
      { x: 9, z: 0, radius: 2 }     // Right column
    ];

    for (let i = 0; i < stallCount; i++) {
      let position: [number, number, number] | null = null;
      let attempts = 0;
      const maxAttempts = 20;

      // Try to find a valid position
      while (!position && attempts < maxAttempts) {
        const x = (rand() - 0.5) * 30; // Random position in ~30 unit radius
        const z = (rand() - 0.5) * 30;

        // Check if position is far enough from occupied zones
        const tooClose = occupiedZones.some(zone => {
          const dist = Math.sqrt((x - zone.x) ** 2 + (z - zone.z) ** 2);
          return dist < zone.radius + 4; // 4 unit clearance
        });

        if (!tooClose) {
          position = [x, 0, z];
          occupiedZones.push({ x, z, radius: 4 }); // Mark as occupied
        }

        attempts++;
      }

      if (!position) continue; // Skip if couldn't find valid position

      const type = stallTypes[Math.floor(rand() * stallTypes.length)];
      const size = isOutskirts ? 'small' : district === 'CARAVANSERAI' ? 'medium' : rand() < 0.2 ? 'small' : rand() < 0.7 ? 'medium' : 'large';
      const rotation = [0, 90, 180, 270][Math.floor(rand() * 4)];
      const awningColor = awningColors[Math.floor(rand() * awningColors.length)];
      const woodColor = woodColors[Math.floor(rand() * woodColors.length)];

      // Goods color based on type
      const goodsColorMap: Record<MarketStallType, string> = {
        [MarketStallType.SPICES]: '#ff8c00',
        [MarketStallType.TEXTILES]: '#4169e1',
        [MarketStallType.POTTERY]: '#d2691e',
        [MarketStallType.METALWORK]: '#cd7f32',
        [MarketStallType.RUGS]: '#8b0000',
        [MarketStallType.FOOD]: '#daa520',
        [MarketStallType.PERFUMES]: '#9370db',
        [MarketStallType.GLASSWARE]: '#20b2aa'
      };

      const caravanPositions: Array<[number, number, number]> = [
        [-14, 0, -6],
        [14, 0, -6],
        [-14, 0, 6],
        [14, 0, 6],
        [0, 0, -12],
        [0, 0, 12]
      ];
      const positionOverride: [number, number, number] | null = isOutskirts
        ? [0, 0, 8]
        : district === 'CARAVANSERAI'
          ? caravanPositions[i % caravanPositions.length]
          : null;
      stalls.push({
        id: `stall-${i}`,
        type,
        position: positionOverride ?? position,
        rotation,
        size,
        awningColor,
        woodColor,
        goodsColor: goodsColorMap[type]
      });
    }

    return stalls;
  }, [params.mapX, params.mapY, sessionSeed, pushableSeed]);

  // Generate merchant NPCs for each market stall
  const merchants = useMemo<MerchantNPCType[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (!isOutskirts && district !== 'CARAVANSERAI') return [];
    }

    return marketStalls.map((stall, index) => {
      const merchantType = mapStallTypeToMerchantType(stall.type);
      const seed = params.mapX * 10000 + params.mapY * 1000 + index + sessionSeed * 13;

      // Position merchant behind counter based on stall rotation
      // Merchants stand ~1.2 units behind the stall center (behind the counter)
      const standDistance = 1.2;
      let xOffset = 0;
      let zOffset = 0;

      // Calculate position based on rotation (merchant faces forward, stall rotates)
      if (stall.rotation === 0) {
        // Facing north (0°) - merchant behind (south side)
        zOffset = -standDistance;
      } else if (stall.rotation === 90) {
        // Facing east (90°) - merchant behind (west side)
        xOffset = -standDistance;
      } else if (stall.rotation === 180) {
        // Facing south (180°) - merchant behind (north side)
        zOffset = standDistance;
      } else if (stall.rotation === 270) {
        // Facing west (270°) - merchant behind (east side)
        xOffset = standDistance;
      }

      const position: [number, number, number] = [
        stall.position[0] + xOffset,
        0,
        stall.position[2] + zOffset
      ];

      return generateMerchantNPC(
        stall.id,
        'STALL',
        merchantType,
        position,
        seed,
        simTime
      );
    });
  }, [params.mapX, params.mapY, marketStalls, simTime, sessionSeed]);

  // Snake Charmer Sufi - Saʿdiyya tariqa member
  // Always spawns in marketplace corners, 20% chance in other districts
  const snakeCharmerPosition = useMemo<[number, number, number] | null>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const spawnSeed = params.mapX * 1337 + params.mapY * 7331 + sessionSeed;
    const roll = seededRandom(spawnSeed + 999);

    if (district === 'MARKET') {
      // Always spawn in marketplace - choose a corner
      const corners: Array<[number, number, number]> = [
        [-28, 0, -28],  // Northwest
        [28, 0, -28],   // Northeast
        [28, 0, 28],    // Southeast
        [-28, 0, 28]    // Southwest
      ];
      const cornerIndex = Math.floor(seededRandom(spawnSeed + 1000) * corners.length);
      return corners[cornerIndex];
    } else if (roll < 0.2) {
      // 20% chance in other districts - spawn near edge
      const angle = seededRandom(spawnSeed + 1001) * Math.PI * 2;
      const radius = 25 + seededRandom(spawnSeed + 1002) * 8;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ];
    }

    return null; // No snake charmer in this district
  }, [params.mapX, params.mapY, sessionSeed]);

  const [snakeCharmerDistance, setSnakeCharmerDistance] = useState(100);

  // Astrologer - 50% chance in marketplace and standard street biomes
  const astrologerPosition = useMemo<[number, number, number] | null>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const validDistricts = ['MARKET', 'HOVELS', 'ALLEYS', 'JEWISH_QUARTER', 'RESIDENTIAL', 'WEALTHY'];

    if (!validDistricts.includes(district)) return null;

    const spawnSeed = params.mapX * 1987 + params.mapY * 8971 + sessionSeed;
    const roll = seededRandom(spawnSeed + 2000);

    if (roll < 0.5) {
      // 50% chance - spawn in a suitable location
      const angle = seededRandom(spawnSeed + 2001) * Math.PI * 2;
      const radius = 15 + seededRandom(spawnSeed + 2002) * 15;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ];
    }

    return null;
  }, [params.mapX, params.mapY, sessionSeed]);

  // Scribe - 50% chance in marketplace and standard street biomes
  const scribePosition = useMemo<[number, number, number] | null>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const validDistricts = ['MARKET', 'HOVELS', 'ALLEYS', 'JEWISH_QUARTER', 'RESIDENTIAL', 'WEALTHY'];

    if (!validDistricts.includes(district)) return null;

    const spawnSeed = params.mapX * 2341 + params.mapY * 4321 + sessionSeed;
    const roll = seededRandom(spawnSeed + 3000);

    if (roll < 0.5) {
      // 50% chance - spawn in a suitable location
      const angle = seededRandom(spawnSeed + 3001) * Math.PI * 2;
      const radius = 15 + seededRandom(spawnSeed + 3002) * 15;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ];
    }

    return null;
  }, [params.mapX, params.mapY, sessionSeed]);

  // Tree obstacles for boulder collision
  const [treeObstacles, setTreeObstacles] = useState<Obstacle[]>([]);
  const handleTreePositions = useCallback((positions: Array<[number, number, number]>) => {
    const obstacles: Obstacle[] = positions.map(pos => ({
      position: pos,
      radius: 0.35 // Tree trunk radius
    }));
    setTreeObstacles(obstacles);
  }, []);

  // Obstacles including market stalls for NPC collision detection
  const obstacles = useMemo<Obstacle[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (!isOutskirts && district !== 'CARAVANSERAI') return [];
    }

    const baseObstacles: Obstacle[] = isOutskirts
      ? []
      : district === 'CARAVANSERAI'
        ? [
          // Central fountain (actual size from Environment.tsx)
          { position: [0, 0, 0], radius: 4.5 },
          // Camels (positions match Environment.tsx)
          { position: [-15, 0, -12], radius: 1.5 },
          { position: [12, 0, -15], radius: 1.5 },
          { position: [-12, 0, 15], radius: 1.5 },
          { position: [15, 0, 12], radius: 1.5 }
        ]
        : [
          { position: [0, 0, 0], radius: 4.2 },      // Fountain
          { position: [-9, 0, 0], radius: 0.9 },     // Left column
          { position: [9, 0, 0], radius: 0.9 }       // Right column
        ];

    // Add market stall obstacles
    const stallObstacles: Obstacle[] = marketStalls.map(stall => {
      // Size-based collision radius
      const radiusMap = { small: 2.0, medium: 2.8, large: 3.5 };
      return {
        position: stall.position,
        radius: radiusMap[stall.size]
      };
    });

    // Add tree obstacles for hilly districts
    if (district === 'MOUNTAIN_SHRINE' || district === 'SALHIYYA' || isOutskirts) {
      return [...baseObstacles, ...stallObstacles, ...treeObstacles];
    }

    return [...baseObstacles, ...stallObstacles];
  }, [params.mapX, params.mapY, marketStalls, treeObstacles]);
  const OBSTACLE_HASH_MIN = 32;
  const obstacleHash = useMemo(() => (
    obstacles.length >= OBSTACLE_HASH_MIN ? buildObstacleHash(obstacles) : null
  ), [obstacles]);

  const weather = useRef<WeatherState>({
    cloudCover: 0.25,
    humidity: 0.2,
    wind: new THREE.Vector2(0.4, 0.2),
    targetCloudCover: 0.25,
    targetHumidity: 0.2,
    nextShift: 0,
    weatherType: WeatherType.CLEAR,
    targetWeatherType: WeatherType.CLEAR,
    weatherBlend: 0,
  });
  const envPreset = params.timeOfDay < 6 || params.timeOfDay > 18 ? 'night' : 'sunset';
  const handleAgentImpact = useCallback((id: string, intensity: number) => {
    impactMapRef.current.set(id, { time: performance.now(), intensity });
  }, []);
  const handleImpactPuff = useCallback((position: THREE.Vector3, intensity: number) => {
    const idx = impactPuffIndexRef.current++ % MAX_PUFFS;
    impactPuffsRef.current[idx] = {
      position: position.clone(),
      start: performance.now(),
      intensity,
      jitter: [(Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2],
      duration: 0.5 + intensity * 0.4
    };
  }, []);

  // Wrapper for morale updates that also stores locally for ambient audio
  const handleMoraleUpdate = useCallback((morale: MoraleStats) => {
    moraleStatsRef.current = morale;
    onMoraleUpdate?.(morale);
  }, [onMoraleUpdate]);

  // Wrap onBuildingsGenerated to prevent infinite re-render loop
  const handleBuildingsGenerated = useCallback((b: BuildingMetadata[]) => {
    buildingsRef.current = b;
    buildingHashRef.current = buildBuildingHash(b);
    setBuildingsState(b);
    onBuildingsUpdate?.(b);
    const district = getDistrictType(params.mapX, params.mapY);
    if (district === 'HOVELS' || district === 'ALLEYS' || district === 'JEWISH_QUARTER') {
      const spawnSeed = params.mapX * 1000 + params.mapY * 13 + 77;
      const tryPoints: THREE.Vector3[] = [];
      const base = new THREE.Vector3(0, 0, 0);
      // Expand search to larger radii for dense districts, use larger collision radius for safety
      const ring = [0, 3, 6, 9, 12, 16, 20, 24, 28];
      ring.forEach((r) => {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + seededRandom(spawnSeed + r * 13 + i) * 0.6;
          tryPoints.push(new THREE.Vector3(base.x + Math.cos(angle) * r, 0, base.z + Math.sin(angle) * r));
        }
      });
      const hash = buildingHashRef.current || undefined;
      // Use larger collision radius (1.2 instead of 0.6) to ensure safe spawn away from buildings
      const found = tryPoints.find((p) => !isBlockedByBuildings(p, b, 1.2, hash) && !isBlockedByObstacles(p, obstacles, 1.2, obstacleHash || undefined));
      if (found) {
        setPlayerSpawn([found.x, 0, found.z]);
      } else {
        // Last resort: try edge positions with larger radius
        const edgePoints = [
          new THREE.Vector3(30, 0, 30),
          new THREE.Vector3(-30, 0, 30),
          new THREE.Vector3(30, 0, -30),
          new THREE.Vector3(-30, 0, -30)
        ];
        const edgeFound = edgePoints.find((p) => !isBlockedByBuildings(p, b, 1.2, hash) && !isBlockedByObstacles(p, obstacles, 1.2, obstacleHash || undefined));
        setPlayerSpawn(edgeFound ? [edgeFound.x, 0, edgeFound.z] : [32, 0, 32]);
      }
    } else if (district === 'CARAVANSERAI') {
      // Spawn near north gate/entrance (top center)
      setPlayerSpawn([0, 0, -38]);
    }
  }, [params.mapX, params.mapY, obstacles, obstacleHash]);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const sunAngle = (params.timeOfDay / 24) * Math.PI * 2;
  const sunElevation = Math.sin(sunAngle - Math.PI / 2);
  const dayFactor = smoothstep(-0.1, 0.35, sunElevation);
  const twilightFactor = smoothstep(-0.45, 0.05, sunElevation) * (1 - dayFactor);
  const dawnFactor = smoothstep(-0.2, 0.05, sunElevation) * (1 - dayFactor);
  const duskFactor = smoothstep(0.05, -0.2, -sunElevation) * (1 - dayFactor);
  const nightFactor = 1 - Math.max(dayFactor, twilightFactor);
  const enableHoverWireframe = params.cameraMode === CameraMode.OVERHEAD || devSettings.showHoverWireframe;
  const enableHoverLabel = params.cameraMode === CameraMode.OVERHEAD;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Update rat positions for cat to hunt
    const rats = ratsRef.current;
    if (rats && rats.length > 0) {
      ratPositionsRef.current = rats
        .filter(r => r.active)
        .map(r => r.position);
    }

    // Update NPC positions for rats to avoid
    if (agentHashRef.current) {
      const positions: THREE.Vector3[] = [];
      agentHashRef.current.buckets.forEach(bucket => {
        for (const agent of bucket) {
          positions.push(agent.pos);
        }
      });
      npcPositionsRef.current = positions;

      // Update nearby infected/deceased counts for ambient audio
      if (playerRef.current) {
        const playerPos = playerRef.current.position;
        playerPositionRef.current = [playerPos.x, playerPos.y, playerPos.z];
        let nearbyInfected = 0;
        let nearbyDeceased = 0;
        const proximityRadius = 15;

        agentHashRef.current.buckets.forEach(bucket => {
          for (const agent of bucket) {
            const dist = agent.pos.distanceTo(playerPos);
            if (dist < proximityRadius) {
              if (agent.state === AgentState.INFECTED) nearbyInfected++;
              if (agent.state === AgentState.DECEASED) nearbyDeceased++;
            }
          }
        });

        nearbyInfectedRef.current = nearbyInfected;
        nearbyDeceasedRef.current = nearbyDeceased;
      }
    }

    const doAtmosphere = t - atmosphereTickRef.current >= 0.12;
    if (doAtmosphere) {
      atmosphereTickRef.current = t;

      if (t > weather.current.nextShift) {
        weather.current.targetCloudCover = 0.15 + Math.random() * 0.7;
        weather.current.targetHumidity = 0.1 + Math.random() * 0.5;
        weather.current.wind.set(0.2 + Math.random() * 0.6, 0.1 + Math.random() * 0.4);
        weather.current.nextShift = t + 45 + Math.random() * 60;
        const roll = Math.random();
        weather.current.targetWeatherType = roll > 0.85 ? WeatherType.SANDSTORM : roll > 0.55 ? WeatherType.OVERCAST : WeatherType.CLEAR;
      }
      const cloudTarget = devSettings.enabled && devSettings.cloudCoverOverride !== null
        ? devSettings.cloudCoverOverride
        : weather.current.targetCloudCover;
      const humidityTarget = devSettings.enabled && devSettings.humidityOverride !== null
        ? devSettings.humidityOverride
        : weather.current.targetHumidity;
      weather.current.cloudCover = THREE.MathUtils.lerp(
        weather.current.cloudCover,
        cloudTarget,
        0.01
      );
      weather.current.humidity = THREE.MathUtils.lerp(
        weather.current.humidity,
        humidityTarget,
        0.01
      );
      if (weather.current.weatherType !== weather.current.targetWeatherType) {
        weather.current.weatherBlend = THREE.MathUtils.clamp(weather.current.weatherBlend + 0.01, 0, 1);
        if (weather.current.weatherBlend >= 1) {
          weather.current.weatherType = weather.current.targetWeatherType;
          weather.current.weatherBlend = 0;
        }
      }
      // 1. Lighting Update based on time
      if (lightRef.current && ambientRef.current && hemiRef.current) {
        const cloudCover = weather.current.cloudCover;
        const humidity = weather.current.humidity;
        const weatherType = devSettings.enabled && devSettings.weatherOverride !== 'auto'
          ? devSettings.weatherOverride as WeatherType
          : weather.current.weatherType;

        // Notify UI of weather changes
        if (onWeatherUpdate) {
          onWeatherUpdate(weatherType);
        }

        // Tier 2: Harsher sun for intense midday heat
        const sunIntensity = Math.pow(Math.max(0, sunElevation), 0.45) * 6.8 * (1 - cloudCover * 0.4);
        // Tier 1: Reduced ambient for darker, more vivid shadows
        let ambientIntensity = 0.08 + dayFactor * 0.3 + cloudCover * 0.08;
        // Tier 1: Boosted hemisphere for warm ground bounce
        let hemiIntensity = 0.38 + dayFactor * 0.62 + cloudCover * 0.16;

        // GRAPHICS: Peak sun shadow enrichment - darker, more saturated shadows at noon
        // Reduce ambient during peak day for higher contrast shadows
        if (dayFactor > 0.7) {
          const noonIntensity = (dayFactor - 0.7) / 0.3; // 0-1 from 10am-2pm
          ambientIntensity += noonIntensity * 0.05; // Reduced from 0.15 for darker shadows
          // Tier 2: Increased ground hemisphere for warm fill during peak sun
          hemiIntensity += noonIntensity * 0.35;
        }

        // Sun-baked: Warmer, golden sun color for Mediterranean heat
        // PERFORMANCE: Reuse color objects instead of creating new ones
        const { sunColor, hemiSky, hemiGround, temp1, temp2, temp3 } = colorCache.current;

        sunColor.set("#ffd9aa");
        temp1.set("#ffb46b");
        temp2.set("#3b4a6a");
        sunColor.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);

        hemiSky.set("#bcd7ff");
        temp1.set("#d6b49c");
        temp2.set("#2b3250");
        const warmShift = Math.max(dawnFactor, duskFactor);
        hemiSky.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);
        temp3.set("#f2caa2");
        hemiSky.lerp(temp3, warmShift * 0.4);

        // Sun-baked: Warm ground bounce from hot sand/stone
        hemiGround.set("#e8c4a0");
        temp1.set("#5c4b3a");
        temp2.set("#1f1c1b");
        hemiGround.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);

        // Sky colors matching the SkyGradientDome for atmospheric perspective
        const { skyMid, skyHorizon, fogColor, skyColor } = colorCache.current;

        skyMid.set('#0b1220');
        temp1.set('#49a6ef');
        temp2.set('#8b6f5a');
        temp3.set('#1b2438');
        skyMid.lerp(temp1, dayFactor).lerp(temp2, twilightFactor * 0.7).lerp(temp3, nightFactor);

        skyHorizon.set('#0a0f1a');
        temp1.set('#2f95ee');
        temp2.set('#e8b878');
        temp3.set('#0f1829');
        skyHorizon.lerp(temp1, dayFactor).lerp(temp2, twilightFactor * 0.8).lerp(temp3, nightFactor);

        // HORIZON ATMOSPHERIC COLOR SYSTEM
        // Base: use sky horizon color for seamless blending
        fogColor.copy(skyHorizon);

        // GRAPHICS: Dawn rosy fingers - enhanced pink, lavender, soft orange gradients
        if (dawnFactor > 0.1) {
          // Variable dawn colors for beautiful variety
          temp1.set('#f5a6c8');
          temp2.set('#e8b4d4');
          temp1.lerp(temp2, seededRandom(params.mapX + params.mapY));
          temp2.set('#d4a8e8');
          temp3.set('#ffc4a3');

          // Blend multiple dawn colors for gradient effect (enhanced intensity)
          fogColor.lerp(temp1, dawnFactor * 0.5); // Was 0.35
          fogColor.lerp(temp2, dawnFactor * 0.25); // Was 0.15
          fogColor.lerp(temp3, dawnFactor * 0.35); // Was 0.2
        }

        // Daytime: VERY SUBTLE atmospheric perspective (realistic haze)
        if (dayFactor > 0.6) {
          temp1.set('#e8eef3'); // Lighter, barely-there blue
          fogColor.lerp(temp1, (dayFactor - 0.6) * 0.08); // More subtle blend

          // Peak sun heat haze (10am-2pm) - warm golden shimmer
          if (dayFactor > 0.7) {
            temp1.set('#f5e6d3');
            fogColor.lerp(temp1, (dayFactor - 0.7) * 0.2); // Reduced from 0.25
          }
        }

        // GRAPHICS: Twilight/Dusk enhanced atmospheric glow at horizon
        if (duskFactor > 0.1) {
          temp1.set('#e8c488'); // Peachy-gold
          temp2.set('#b8a8c4'); // Lavender
          fogColor.lerp(temp1, duskFactor * 0.35); // Was 0.18 (enhanced)
          fogColor.lerp(temp2, duskFactor * 0.18); // Was 0.08 (enhanced)
        }

        // Night: Cool deep blue atmosphere
        if (nightFactor > 0.5) {
          temp1.set('#1a2845');
          fogColor.lerp(temp1, (nightFactor - 0.5) * 0.5);
        }

        // GRAPHICS: Toned down twilight color - subtle warm glow instead of strong pink-red flash
        skyColor.set("#5f7fb4");
        temp1.set("#d8a475");
        temp2.set("#02040a");
        skyColor.lerp(temp1, twilightFactor * 0.6).lerp(temp2, nightFactor);

        if (weatherType === WeatherType.OVERCAST) {
          ambientIntensity += 0.18;
          hemiIntensity += 0.2;
          // Overcast: cool, desaturated horizon blending
          temp1.set("#8a98a8");
          temp2.set("#5a6570");
          temp1.lerp(temp2, nightFactor * 0.5);
          fogColor.lerp(temp1, 0.45);
          temp2.set("#4a5560");
          skyColor.lerp(temp2, 0.4);
        } else if (weatherType === WeatherType.SANDSTORM) {
          ambientIntensity += 0.05;
          hemiIntensity += 0.1;
          // Sandstorm: thick ochre/tan dust at horizon
          temp1.set("#c9a876");
          temp2.set("#8b6b3c");
          temp3.set("#3a3844");
          temp1.lerp(temp2, 0.3).lerp(temp3, nightFactor * 0.7);
          fogColor.lerp(temp1, 0.7); // Heavy dust color
          temp2.set("#6b4a2f");
          temp3.set("#1c2333");
          skyColor.lerp(temp2, 0.5).lerp(temp3, nightFactor * 0.5);
        }

        // Night clamp to avoid bright whites + cool moonlight lift
        const nightClamp = 1 - nightFactor * 0.36;
        ambientIntensity *= nightClamp;
        hemiIntensity *= nightClamp;
        if (nightFactor > 0.2) {
          const moonLift = (nightFactor - 0.2) * 0.6;
          hemiIntensity += moonLift;
          temp1.set("#6b7fa8");
          hemiSky.lerp(temp1, nightFactor * 0.6);
        }
        if (nightFactor > 0.6) {
          ambientIntensity += (nightFactor - 0.6) * 0.08;
        }

        const centerX = playerRef.current?.position.x ?? 0;
        const centerZ = playerRef.current?.position.z ?? 0;
        const sunDirX = Math.cos(sunAngle - Math.PI / 2);
        const sunDirY = Math.sin(sunAngle - Math.PI / 2);
        const sunDirZ = 0.35;
        const sunLen = Math.hypot(sunDirX, sunDirY, sunDirZ) || 1;
        const shadowDistance = 60;
        lightRef.current.position.set(
          centerX + (sunDirX / sunLen) * shadowDistance,
          (sunDirY / sunLen) * shadowDistance,
          centerZ + (sunDirZ / sunLen) * shadowDistance
        );
        lightRef.current.target.position.set(centerX, 0, centerZ);
        lightRef.current.target.updateMatrixWorld();

        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, sunIntensity, 0.08);
        lightRef.current.color.lerp(sunColor, 0.05);

        // GRAPHICS: Dynamic shadow softness based on sun elevation AND weather
        // Dawn/dusk = softer shadows (scattered light), noon = sharper shadows (direct light)
        // Weather modulates: CLEAR = sharp, OVERCAST = diffuse, SANDSTORM = very soft
        let baseShadowSoftness = THREE.MathUtils.lerp(
          -0.002,  // Soft shadows at dawn/dusk
          -0.0002, // Sharp shadows at noon
          dayFactor // 0 at dawn/dusk, 1 at noon
        );

        // Weather-based shadow adjustment
        if (weatherType === WeatherType.OVERCAST) {
          // Overcast: diffuse light from clouds, softer shadows
          baseShadowSoftness = THREE.MathUtils.lerp(baseShadowSoftness, -0.004, 0.7);
        } else if (weatherType === WeatherType.SANDSTORM) {
          // Sandstorm: heavy dust scatter, very soft/barely visible shadows
          baseShadowSoftness = THREE.MathUtils.lerp(baseShadowSoftness, -0.008, 0.85);
        }

        if (lightRef.current.shadow) {
          lightRef.current.shadow.bias = baseShadowSoftness;
        }

        const shadowContrast = smoothstep(0.25, 0.7, sunElevation);
        ambientIntensity *= 1 - shadowContrast * 0.12;
        hemiIntensity *= 1 - shadowContrast * 0.08;
        ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, ambientIntensity, 0.08);
        // GRAPHICS: Desaturated ambient color during day for richer shadow saturation
        // Less saturated ambient = more saturated shadows by contrast
        const { ambientColor, rimColor, shadowFillColor } = colorCache.current;
        ambientColor.set("#b9c4e6");
        temp1.set("#e8e4dc");
        ambientColor.lerp(temp1, dayFactor * 0.35);
        ambientRef.current.color.lerp(ambientColor, 0.05);
        hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, hemiIntensity, 0.08);
        hemiRef.current.color.lerp(hemiSky, 0.05);
        hemiRef.current.groundColor.lerp(hemiGround, 0.05);
        if (rimLightRef.current) {
          // Tier 2: Warm rim lighting during day + twilight
          const rimTarget = twilightFactor * 0.6 + dayFactor * 0.4;
          rimLightRef.current.intensity = THREE.MathUtils.lerp(rimLightRef.current.intensity, rimTarget, 0.05);
          // Warm golden rim during day, peachy during twilight
          rimColor.set(dayFactor > 0.5 ? '#fff0d8' : '#f2b27a');
          rimLightRef.current.color.lerp(rimColor, 0.05);
        }
        // GRAPHICS: Shadow fill light - adds rich colored tint to shadows (scattered skylight)
        // ENHANCED: Time-of-day shadow colors for cinematic richness
        // WEATHER-AWARE: Color and intensity adjust based on atmospheric conditions
        if (shadowFillLightRef.current) {
          // Base intensity from dayFactor
          let shadowFillIntensity = dayFactor * 0.4 * (1 - shadowContrast * 0.2);

          // Weather-based adjustments
          if (weatherType === WeatherType.OVERCAST) {
            // Overcast: reduced intensity (clouds block direct skylight)
            shadowFillIntensity *= 0.5;
            // Desaturated gray-blue for overcast shadow fill
            shadowFillColor.set('#8a9aaa');
          } else if (weatherType === WeatherType.SANDSTORM) {
            // Sandstorm: minimal intensity, warm dust-scattered light
            shadowFillIntensity *= 0.25;
            // Warm ochre for dust-scattered light
            shadowFillColor.set('#b8a080');
          } else {
            // ENHANCED: Rich time-of-day shadow tinting
            // Morning/evening: warm purple-blue shadows
            // Midday: cooler saturated blue shadows (complementary to golden sun)
            const midDayFactor = Math.max(0, 1 - Math.abs(12 - params.timeOfDay) / 5); // Peak at noon

            if (twilightFactor > 0.3) {
              // Twilight: rich purple-blue shadows
              shadowFillColor.set('#6a5a9a');
            } else if (midDayFactor > 0.6) {
              // Midday: saturated cool blue (complementary to warm sun)
              shadowFillColor.set('#3f6fca');
            } else {
              // Morning/afternoon: medium blue-purple
              shadowFillColor.set('#5a78b8');
            }
          }

          shadowFillLightRef.current.intensity = THREE.MathUtils.lerp(
            shadowFillLightRef.current.intensity,
            shadowFillIntensity,
            0.08
          );
          shadowFillLightRef.current.color.lerp(shadowFillColor, 0.05);
        }
        if (marketBounceRef.current) {
          const isMarket = params.mapX === 0 && params.mapY === 0;
          // Tier 2: Boosted market bounce for warmer fill light
          const bounceTarget = isMarket ? dayFactor * 0.75 : 0;
          marketBounceRef.current.intensity = THREE.MathUtils.lerp(marketBounceRef.current.intensity, bounceTarget, 0.05);
        }

        if (gl) {
          // Sun-baked: Increased exposure during day, much lower exposure at night
          const targetExposure = 1.02 + dayFactor * 0.14 + nightFactor * 0.12 + twilightFactor * 0.05;
          gl.toneMappingExposure = THREE.MathUtils.lerp(gl.toneMappingExposure, targetExposure, 0.05);
        }

        if (fogRef.current && devSettings.showFog) {
          // HORIZON HAZE SYSTEM - Dynamic atmospheric perspective
          let baseFog = 0;
          let horizonHaze = 0;

          if (weatherType === WeatherType.SANDSTORM) {
            baseFog = 0.012; // Visible dust throughout
            horizonHaze = 0.008; // Heavy horizon obscuring
          } else if (weatherType === WeatherType.OVERCAST) {
            baseFog = 0.006; // Misty atmosphere
            horizonHaze = 0.005; // Soft horizon blending
          } else {
            // CLEAR WEATHER - atmospheric perspective for distance
            if (dayFactor > 0.5) {
              // Hot day: Rayleigh scattering + heat shimmer
              baseFog = 0.00011; // Increased from 0.001 for better distance fade
              horizonHaze = 0.0001; // Increased from 0.004 for atmospheric depth
            } else if (twilightFactor > 0.3) {
              // Twilight: atmospheric glow at horizon
              baseFog = 0.001; 
              horizonHaze = 0.006; // Increased from 0.006 for beautiful blending
            } else if (dawnFactor > 0.1) {
              // Dawn: rosy atmospheric glow
              baseFog = 0.0003; // Increased from 0.002
              horizonHaze = 0.009; // Increased from 0.005 for soft rosy haze
            } else {
              // Night: clearest atmosphere for starry sky
              baseFog = 0.0001; // Slight increase from 0.001
              horizonHaze = 0.003; // Increased from 0.002 for depth
            }
          }

          // Night atmosphere - minimal to keep sky dark
          const nightAtmosphere = nightFactor * 0.00;

          // Realistic physics: add altitude-based density (more fog near ground)
          const altitudeFactor = 0.0008; // Ground-level fog accumulation

          const overheadFactor = params.cameraMode === CameraMode.OVERHEAD ? 0.25 : 1;
          const fogTarget = (baseFog + horizonHaze + altitudeFactor + humidity * 0.003 + cloudCover * 0.003 + nightAtmosphere)
            * devSettings.fogDensityScale
            * overheadFactor;
          fogRef.current.density = THREE.MathUtils.lerp(
            fogRef.current.density,
            fogTarget * (1 - nightFactor * 0.7),
            0.01
          );
          const nightFogColor = new THREE.Color('#0a0f1a');
          fogRef.current.color.lerp(fogColor.clone().lerp(nightFogColor, nightFactor), 0.07);
        }

        // scene.background = skyColor; // DISABLED: Now using SkyGradient component for realistic gradient
      }
    }

    // 2. Boundary Check for Map Transitions & Proximity Check
    if (playerRef.current) {
      const pos = playerRef.current.position;

      // Report player position for action system
      onPlayerPositionUpdate?.(pos);

      const district = getDistrictType(params.mapX, params.mapY);
      const boundary = district === 'SOUTHERN_ROAD' ? 40 : CONSTANTS.BOUNDARY;

      if (pos.z > boundary) { onMapChange(0, 1); pos.z = -boundary + 2; } 
      else if (pos.z < -boundary) { onMapChange(0, -1); pos.z = boundary - 2; } 
      else if (pos.x > boundary) { onMapChange(1, 0); pos.x = -boundary + 2; } 
      else if (pos.x < -boundary) { onMapChange(-1, 0); pos.x = boundary - 2; }

      let closest: BuildingMetadata | null = null;
      let minDist = CONSTANTS.PROXIMITY_THRESHOLD;

      buildingsRef.current.forEach(b => {
        const dx = b.position[0] - pos.x;
        const dz = b.position[2] - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          closest = b;
        }
      });
      if (closest?.id !== currentNearBuilding?.id) {
        setCurrentNearBuilding(closest);
        onNearBuilding(closest);
      }

      // Check proximity to merchants
      let closestMerchant: MerchantNPCType | null = null;
      let minMerchantDist = 5; // 5 unit interaction range for merchants

      merchants.forEach(m => {
        const dx = m.position[0] - pos.x;
        const dz = m.position[2] - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minMerchantDist) {
          minMerchantDist = dist;
          closestMerchant = m;
        }
      });

      if (closestMerchant?.id !== currentNearMerchant?.id) {
        setCurrentNearMerchant(closestMerchant);
        if (onNearMerchant) {
          onNearMerchant(closestMerchant);
        }
      }

      // Check for nearby speakable NPCs (throttled for performance - every ~150ms)
      const npcCheckTime = state.clock.elapsedTime;
      if (npcCheckTime - nearSpeakableNpcTickRef.current > 0.15 && agentHashRef.current && npcPool.length > 0) {
        nearSpeakableNpcTickRef.current = npcCheckTime;

        const nearbyAgents = queryNearbyAgents(pos, agentHashRef.current);
        let closestNpc: { stats: NPCStats; state: AgentState } | null = null;
        let minNpcDist = 4; // 4 unit interaction range for speaking

        for (const agent of nearbyAgents) {
          // Skip dead NPCs
          if (agent.state === 3) continue; // 3 = dead state

          const dx = agent.pos.x - pos.x;
          const dz = agent.pos.z - pos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < minNpcDist) {
            // Look up full NPC stats from pool
            const npcRecord = npcPool.find(r => r.stats.id === agent.id);
            if (npcRecord) {
              minNpcDist = dist;
              closestNpc = { stats: npcRecord.stats, state: npcRecord.state };
            }
          }
        }

        if (closestNpc?.stats.id !== currentNearSpeakableNpc?.stats.id) {
          setCurrentNearSpeakableNpc(closestNpc);
          if (onNearSpeakableNpc) {
            onNearSpeakableNpc(closestNpc);
          }
        }
      }

      if (onMinimapUpdate) {
        const now = state.clock.elapsedTime;
        if (now - minimapTickRef.current > 0.5) {
          minimapTickRef.current = now;
          const lastPos = lastMinimapPosRef.current;
          const posX = pos.x;
          const posZ = pos.z;
          const movedSq = lastPos
            ? ((posX - lastPos.x) * (posX - lastPos.x) + (posZ - lastPos.z) * (posZ - lastPos.z))
            : Number.POSITIVE_INFINITY;
          const cameraYaw = Math.atan2(pos.x - state.camera.position.x, pos.z - state.camera.position.z);
          const yawDelta = Math.abs(cameraYaw - lastMinimapYawRef.current);
          if (movedSq < 1 && yawDelta < 0.1) {
            lastMinimapYawRef.current = cameraYaw;
            return;
          }
          if (!lastMinimapPosRef.current) {
            lastMinimapPosRef.current = new THREE.Vector3(posX, 0, posZ);
          } else {
            lastMinimapPosRef.current.set(posX, 0, posZ);
          }
          lastMinimapYawRef.current = cameraYaw;
          const district = getDistrictType(params.mapX, params.mapY);
          const radius = district === 'ALLEYS' || district === 'JEWISH_QUARTER' ? 20 : district === 'HOVELS' ? 26 : 34;
          const maxDistSq = (radius * 1.25) * (radius * 1.25);
          const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.65 : district === 'CIVIC' ? 1.2 : 1.0;
          const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale;
          const buildings = buildingsRef.current
            .filter((b) => {
              const dx = b.position[0] - pos.x;
              const dz = b.position[2] - pos.z;
              return (dx * dx + dz * dz) <= maxDistSq;
            })
            .map((b) => ({ x: b.position[0], z: b.position[2], type: b.type, size: buildingSize * (b.sizeScale ?? 1), doorSide: b.doorSide }));

          const npcs: MiniMapData['npcs'] = [];
          const hash = agentHashRef.current;
          if (hash) {
            hash.buckets.forEach((bucket) => {
              bucket.forEach((agent) => {
                const dx = agent.pos.x - pos.x;
                const dz = agent.pos.z - pos.z;
                if ((dx * dx + dz * dz) <= maxDistSq) {
                  npcs.push({ x: agent.pos.x, z: agent.pos.z, state: agent.state as AgentState });
                }
              });
            });
          }

          // Add special NPCs to minimap
          const specialNPCs: MiniMapData['specialNPCs'] = [];
          if (snakeCharmerPosition) {
            const dx = snakeCharmerPosition[0] - pos.x;
            const dz = snakeCharmerPosition[2] - pos.z;
            if ((dx * dx + dz * dz) <= maxDistSq) {
              specialNPCs.push({ x: snakeCharmerPosition[0], z: snakeCharmerPosition[2], type: 'SUFI_MYSTIC' });
            }
          }
          if (astrologerPosition) {
            const dx = astrologerPosition[0] - pos.x;
            const dz = astrologerPosition[2] - pos.z;
            if ((dx * dx + dz * dz) <= maxDistSq) {
              specialNPCs.push({ x: astrologerPosition[0], z: astrologerPosition[2], type: 'ASTROLOGER' });
            }
          }
          if (scribePosition) {
            const dx = scribePosition[0] - pos.x;
            const dz = scribePosition[2] - pos.z;
            if ((dx * dx + dz * dz) <= maxDistSq) {
              specialNPCs.push({ x: scribePosition[0], z: scribePosition[2], type: 'SCRIBE' });
            }
          }

          onMinimapUpdate({
            player: { x: pos.x, z: pos.z, yaw: playerRef.current.rotation.y, cameraYaw },
            buildings,
            npcs,
            specialNPCs,
            district,
            radius,
          });
        }
      }
    }
  });

  return (
    <>
      {/* Tier 1: Reduced ambient for darker, more vivid shadows */}
      <ambientLight ref={ambientRef} intensity={0.12} color="#b9c4e6" />
      <pointLight ref={marketBounceRef} position={[0, 6, 0]} intensity={0} color="#f3cfa0" distance={36} decay={2} />
      {/* Tier 1: Warmer ground color for sun-baked ambient bounce */}
      <hemisphereLight ref={hemiRef} intensity={0.28} color="#c7d2f0" groundColor="#a6917a" />
      {/* PERFORMANCE: Tighter shadow frustum for higher local fidelity and lower cost */}
      <directionalLight
        ref={lightRef}
        position={[50, 50, 20]}
        castShadow={devSettings.showShadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={6}
        shadow-camera-far={90}
        shadow-bias={-0.00015}
        shadow-normalBias={0.015}
        shadow-radius={1.2}
      />
      <directionalLight
        ref={rimLightRef}
        position={[-40, 10, -40]}
        intensity={0}
        color="#f2b27a"
      />
      {/* GRAPHICS: Shadow fill light - adds saturated blue tint to shadows during day (scattered skylight) */}
      <directionalLight
        ref={shadowFillLightRef}
        position={[-30, 30, -30]}
        intensity={0}
        color="#5a8fd8"
      />

      <SkyGradientDome timeOfDay={params.timeOfDay} />
      <SunDisc timeOfDay={params.timeOfDay} weather={weather} />
      {/* Tier 1: Boosted environment intensity for richer reflections and ambient color */}
      <DreiEnvironment
        preset={envPreset}
        background={false}
        blur={0.6}
        environmentIntensity={(0.35 + dayFactor * 0.75) * Math.max(0, 1 - nightFactor * 0.6)}
      />
      {/* SkyGradient disabled to avoid shader fallback to black; SkyGradientDome handles sky */}
      <HorizonHaze timeOfDay={params.timeOfDay} />

      {/* GRAPHICS: Smooth star fade and increased saturation for dramatic night sky */}
      {/* PERFORMANCE: Reduced from 9000 to 3000 stars for better nighttime FPS */}
      {dayFactor < 0.3 && (
        <Stars
          radius={180}
          depth={80}
          count={2000}
          factor={5}
          saturation={0.95}
          fade
          speed={0.6}
        />
      )}
      <Moon timeOfDay={params.timeOfDay} simTime={simTime} />
      <MilkyWay visible={dayFactor <= 0.4} simTime={simTime} />

      {devSettings.showFog && <fogExp2 ref={fogRef} attach="fog" args={['#c5ddf5', 0.004]} />}
      {devSettings.showClouds && <CloudLayer weather={weather} timeOfDay={params.timeOfDay} />}

      <WorldEnvironment
        mapX={params.mapX}
        mapY={params.mapY}
        sessionSeed={sessionSeed}
        onGroundClick={setPlayerTarget}
        onBuildingsGenerated={handleBuildingsGenerated}
        onClimbablesGenerated={setClimbablesState}
        onHeightmapBuilt={(heightmap) => {
          heightmapRef.current = heightmap;
        }}
        onTreePositionsGenerated={handleTreePositions}
        nearBuildingId={currentNearBuilding?.id}
        timeOfDay={params.timeOfDay}
        enableHoverWireframe={enableHoverWireframe}
        enableHoverLabel={enableHoverLabel}
        showCityWalls={devSettings.showCityWalls}
        pushables={pushables}
        fogColor={colorCache.current.fogColor}
        heightmap={heightmapRef.current}
        laundryLines={laundryLines}
        hangingCarpets={hangingCarpets}
        catPositionRef={catPositionRef}
        ratPositions={ratPositionsRef.current}
        npcPositions={npcPositionsRef.current}
        playerPosition={playerRef.current?.position}
        isSprinting={sprintStateRef.current}
      />

      {/* Market Stalls - procedurally generated with variety */}
      {marketStalls.map((stall) => (
        <MarketStall key={stall.id} stall={stall} nightFactor={nightFactor} />
      ))}

      {/* Merchant NPCs - standing at their stalls */}
      {merchants.map((merchant) => {
        const stall = marketStalls.find(s => s.id === merchant.locationId);
        return (
          <MerchantNPC
            key={merchant.id}
            merchant={merchant}
            stall={stall}
            nightFactor={nightFactor}
          />
        );
      })}

      {/* Snake Charmer Sufi - Saʿdiyya tariqa member */}
      {snakeCharmerPosition && (
        <SnakeCharmer
          position={snakeCharmerPosition}
          timeOfDay={params.timeOfDay}
          onApproach={setSnakeCharmerDistance}
          onSelect={onNpcSelect}
          isSelected={selectedNpcId === `sufi-mystic-${snakeCharmerPosition[0]}-${snakeCharmerPosition[2]}`}
        />
      )}

      {/* Al-Nāy flute music - distance-based ambient audio */}
      <FluteMusic
        distance={snakeCharmerDistance}
        enabled={snakeCharmerPosition !== null}
      />

      {/* Astrologer - celestial scholar with brass astrolabe */}
      {astrologerPosition && (
        <Astrologer
          position={astrologerPosition}
          timeOfDay={params.timeOfDay}
          onSelect={onNpcSelect}
          isSelected={selectedNpcId === `astrologer-${astrologerPosition[0]}-${astrologerPosition[2]}`}
        />
      )}

      {/* Scribe - calligrapher and letter writer */}
      {scribePosition && (
        <Scribe
          position={scribePosition}
          timeOfDay={params.timeOfDay}
          onSelect={onNpcSelect}
          isSelected={selectedNpcId === `scribe-${scribePosition[0]}-${scribePosition[2]}`}
        />
      )}

      {/* Tier 3: Contact Shadows - adds depth and grounding to buildings */}
      {/* PERFORMANCE: Disabled at night (dayFactor < 0.1) to improve nighttime FPS */}
      {devSettings.showShadows && dayFactor > 0.1 && (
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={dayFactor * 0.5}
          scale={150}
          blur={2.5}
          far={20}
          resolution={512}
          color="#000000"
        />
      )}

      {/* Updated MiasmaFog to use infectionRate prop */}
      {devSettings.showMiasma && <MiasmaFog infectionRate={params.infectionRate} />}

      {/* GRAPHICS: Dust particles for warm sun-baked atmosphere during sunny days */}
      <DustParticles timeOfDay={params.timeOfDay} weather={weather} />

      <ImpactPuffs puffsRef={impactPuffsRef} />
      
      {devSettings.showNPCs && (
        <Agents
          params={params}
          simTime={simTime}
          onStatsUpdate={onStatsUpdate}
          onMoraleUpdate={handleMoraleUpdate}
          actionEvent={actionEvent}
          rats={ratsRef.current}
          buildings={buildingsRef.current}
          buildingHash={buildingHashRef.current}
          buildingInfection={buildingInfection}
          obstacles={obstacles}
          obstacleHash={obstacleHash}
          maxAgents={20}
          agentHashRef={agentHashRef}
          impactMapRef={impactMapRef}
          playerRef={playerRef}
          onNpcSelect={onNpcSelect}
          onNpcUpdate={onNpcUpdate}
          selectedNpcId={selectedNpcId}
          district={district}
          terrainSeed={terrainSeed}
          heightmap={heightmapRef.current}
          npcStateOverride={npcStateOverride}
          showDemographicsOverlay={showDemographicsOverlay}
          npcPool={npcPool}
          playerStats={playerStats}
          onNPCInitiatedEncounter={onNPCInitiatedEncounter}
        />
      )}
      {devSettings.showTorches && <TorchLightPool buildings={buildingsState} playerRef={playerRef} timeOfDay={params.timeOfDay} />}
      {devSettings.showTorches && <WindowLightPool buildings={buildingsState} timeOfDay={params.timeOfDay} />}
      <InfectedBuildingMarkers
        buildings={buildingsState}
        buildingInfection={buildingInfection}
        playerPosition={[
          playerRef.current?.position.x ?? 0,
          playerRef.current?.position.y ?? 0,
          playerRef.current?.position.z ?? 0
        ]}
      />
      {devSettings.showRats && <Rats ref={ratsRef} ratsRef={ratsRef} params={params} playerPos={playerRef.current?.position} catPos={catPositionRef.current} npcPositions={npcPositionsRef.current} agentHashRef={agentHashRef} />}

      <Player
        ref={playerRef}
        initialPosition={playerSpawn}
        targetPosition={playerTarget}
        setTargetPosition={setPlayerTarget}
        cameraMode={params.cameraMode}
        buildings={buildingsRef.current}
        buildingHash={buildingHashRef.current}
        obstacles={obstacles}
        obstacleHash={obstacleHash}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
        agentHashRef={agentHashRef}
        onAgentImpact={handleAgentImpact}
        pushablesRef={pushablesRef}
        onImpactPuff={handleImpactPuff}
        district={district}
        terrainSeed={terrainSeed}
        heightmap={heightmapRef.current}
        onPickupPrompt={onPickupPrompt}
        onPickup={handlePickupItem}
        onPushCharge={onPushCharge}
        dossierMode={dossierMode}
        sprintStateRef={sprintStateRef}
        ratsRef={ratsRef}
        onPlagueExposure={handlePlagueExposure}
        simTime={simTime}
        climbables={climbablesState}
        onClimbablePrompt={onClimbablePrompt}
        onClimbingStateChange={onClimbingStateChange}
        climbInputRef={climbInputRef}
        onFallDamage={onFallDamage}
        cameraViewTarget={cameraViewTarget}
        onPlayerStartMove={onPlayerStartMove}
        observeMode={observeMode}
        gameLoading={gameLoading}
      />

      {/* Footprints in sand (OUTSKIRTS_DESERT only) */}
      {playerRef.current && district === 'OUTSKIRTS_DESERT' && (
        <Footprints
          playerPosition={playerRef.current.position}
          playerRotation={playerRef.current.rotation.y}
          isWalking={true} // Will detect movement automatically based on position changes
          enabled={true}
        />
      )}

      {/* Action visual effects */}
      <ActionEffects actionEvent={actionEvent} />

      {/* Ambient sound system */}
      <AmbientAudio
        timeOfDay={params.timeOfDay}
        mapX={params.mapX}
        mapY={params.mapY}
        weatherType={weather.current.weatherType as 'CLEAR' | 'OVERCAST' | 'SANDSTORM'}
        windDirection={Math.atan2(weather.current.wind.y, weather.current.wind.x)}
        windStrength={weather.current.wind.length()}
        humidity={weather.current.humidity}
        activeNpcCount={moraleStatsRef.current.agentCount}
        avgPanic={moraleStatsRef.current.avgPanic}
        avgAwareness={moraleStatsRef.current.avgAwareness}
        sceneMode="outdoor"
        playerPosition={playerPositionRef.current}
        nearbyInfected={nearbyInfectedRef.current}
        nearbyDeceased={nearbyDeceasedRef.current}
        spatialSources={spatialAudioSources}
        enabled={true}
        masterVolume={0.4}
      />
    </>
  );
};
