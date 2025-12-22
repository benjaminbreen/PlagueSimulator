
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, SimulationCounts, DevSettings, PlayerStats, CONSTANTS, BuildingMetadata, BuildingType, Obstacle, CameraMode, NPCStats, AgentState, MarketStall as MarketStallData, MarketStallType, MerchantNPC as MerchantNPCType, MiniMapData, getDistrictType } from '../types';
import { Environment as WorldEnvironment } from './Environment';
import { Agents } from './Agents';
import { Rats, Rat } from './Rats';
import { Player } from './Player';
import { MarketStall } from './MarketStall';
import { MerchantNPC } from './MerchantNPC';
import { AgentSnapshot, SpatialHash, buildBuildingHash } from '../utils/spatial';
import { PushableObject, PickupInfo, createPushable } from '../utils/pushables';
import { seededRandom } from '../utils/procedural';
import { isBlockedByBuildings, isBlockedByObstacles } from '../utils/collision';
import { ImpactPuffs, ImpactPuffSlot, MAX_PUFFS } from './ImpactPuffs';
import { generateMerchantNPC, mapStallTypeToMerchantType } from '../utils/merchantGeneration';

interface SimulationProps {
  params: SimulationParams;
  simTime: number;
  devSettings: DevSettings;
  playerStats: PlayerStats;
  onStatsUpdate: (stats: SimulationCounts) => void;
  onMapChange: (dx: number, dy: number) => void;
  onNearBuilding: (building: BuildingMetadata | null) => void;
  onNearMerchant?: (merchant: MerchantNPCType | null) => void;
  onNpcSelect?: (npc: { stats: NPCStats; state: AgentState } | null) => void;
  selectedNpcId?: string | null;
  onMinimapUpdate?: (data: MiniMapData) => void;
  onPickupPrompt?: (label: string | null) => void;
  onPickupItem?: (pickup: PickupInfo) => void;
  onWeatherUpdate?: (weatherType: string) => void;
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
const DustParticles: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
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
    const opacity = 0.15 + peakSunFactor * 0.1; // More visible at peak sun

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

const CloudLayer: React.FC<{ weather: React.MutableRefObject<WeatherState> }> = ({ weather }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const count = 12;

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
    material.color.set(weather.current.weatherType === WeatherType.SANDSTORM ? '#c9a25f' : '#ffffff');
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

  const moonMaterial = useMemo(() => {
    // Use MeshBasicMaterial for self-lit moon (no lighting calculations needed)
    const mat = new THREE.MeshBasicMaterial({
      color: '#fffef5', // Ivory-white moon color
      transparent: false
    });

    // GRAPHICS: Moon phases using shader modification
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.moonPhase = { value: 0.0 };

      // Add varying for normal
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vNormal;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vNormal = normalize(normalMatrix * normal);`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform float moonPhase;
        varying vec3 vNormal;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>

        // Set base moon color (ivory white with slight warmth)
        vec3 moonColor = vec3(1.0, 0.995, 0.94);

        // Moon phase shadow: phase 0 = new moon (full shadow), 0.5 = full moon (no shadow)
        vec3 moonNormal = normalize(vNormal);
        float phase = moonPhase * 2.0 - 1.0; // Convert to -1 to 1
        float terminator = moonNormal.x;

        // Create shadow based on phase with softer transition
        float shadow = smoothstep(phase - 0.18, phase + 0.18, terminator);
        if (phase < 0.0) {
          // Waxing (0 to 0.5) - shadow from right
          shadow = 1.0 - shadow;
        }
        // Waning (0.5 to 1) - shadow from left

        // Apply shadowing: 6% brightness on dark side, 100% on lit side (darker shadows for drama)
        gl_FragColor.rgb = moonColor * mix(0.06, 1.0, shadow);`
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, []);

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

    // Update moon phase in shader
    const shader = moonMaterial.userData.shader;
    if (shader) {
      shader.uniforms.moonPhase.value = moonPhase;
    }

    // GRAPHICS: Moon light intensity varies with phase and elevation
    if (lightRef.current) {
      const phaseIntensity = Math.sin(moonPhase * Math.PI); // 0 at new/full cycle, 1 at full
      const elevationFactor = Math.max(0, moonElevation);
      lightRef.current.intensity = 1.2 * phaseIntensity * elevationFactor;
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
        <sphereGeometry args={[7.5, 32, 32]} />
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
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial
          color="#d5e5ff"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main atmospheric glow - bright silvery corona */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[4.75, 32, 32]} />
        <meshBasicMaterial
          color="#e8f2ff"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Earthshine - subtle glow on dark side */}
      <mesh ref={earthshineRef}>
        <sphereGeometry args={[4.1, 24, 24]} />
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
      <mesh ref={meshRef}>
        <sphereGeometry args={[4, 48, 48]} />
        <primitive object={moonMaterial} />
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

const WindowLightPool: React.FC<{ buildings: BuildingMetadata[]; timeOfDay: number }> = ({ buildings, timeOfDay }) => {
  const lightPool = useRef<THREE.PointLight[]>([]);
  const windowPositions = useMemo(() => getWindowGlowPositions(buildings), [buildings]);
  const nightFactor = timeOfDay >= 19 || timeOfDay < 5 ? 1 : timeOfDay >= 17 ? (timeOfDay - 17) / 2 : timeOfDay < 7 ? (7 - timeOfDay) / 2 : 0;
  // PERFORMANCE FIX: Reduced from 10 to 6 window lights
  const activeCount = Math.min(6, windowPositions.length);
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
      {/* PERFORMANCE FIX: Reduced from 10 to 6 window lights */}
      {Array.from({ length: 6 }).map((_, i) => (
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

const MilkyWay: React.FC<{ visible: boolean }> = ({ visible }) => {
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

  if (!texture) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.6, 0, 0]} visible={visible}>
      <sphereGeometry args={[220, 32, 16]} />
      <meshBasicMaterial map={texture} transparent opacity={0.35} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
};

const SkyGradientDome: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const sunriseBoost = useMemo(() => 0.6 + Math.random() * 0.4, []);
  const sunsetBoost = useMemo(() => 0.6 + Math.random() * 0.4, []);
  // Variable dawn colors for variety - rosy fingers
  const dawnVariant = useMemo(() => Math.random(), []);
  const skyKey = Math.round(timeOfDay * 4) / 4;
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const t = skyKey;
    const sunAngle = (t / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const dayFactor = smoothstep(-0.05, 0.3, elevation);
    const dawnFactor = smoothstep(-0.2, 0.05, elevation) * (1 - dayFactor);
    const duskFactor = smoothstep(0.05, -0.2, -elevation) * (1 - dayFactor);

    // Variable dawn colors - rosy fingers
    const dawnTop = dawnVariant > 0.5 ? new THREE.Color('#3a2f52') : new THREE.Color('#1b2438');
    const dawnMid = dawnVariant > 0.7
      ? new THREE.Color('#9a6a8a') // Lavender-rose
      : dawnVariant > 0.3
        ? new THREE.Color('#8a5a7a') // Deep rose
        : new THREE.Color('#6a3f61'); // Purple-rose
    const dawnBottom = dawnVariant > 0.6
      ? new THREE.Color('#f5b8a8') // Soft peachy-pink
      : new THREE.Color('#f0a06a'); // Amber-peach

    const top = new THREE.Color('#142243')
      .lerp(new THREE.Color('#5aa6e8'), dayFactor)
      .lerp(new THREE.Color('#2a3558'), duskFactor)
      .lerp(dawnTop, dawnFactor);
    const mid = new THREE.Color('#162341')
      .lerp(new THREE.Color('#49a6ef'), dayFactor)
      .lerp(new THREE.Color('#a05044'), duskFactor)
      .lerp(dawnMid, dawnFactor);
    const bottom = new THREE.Color('#1c2a4a')
      .lerp(new THREE.Color('#2f95ee'), dayFactor)
      .lerp(new THREE.Color('#f7b25a'), duskFactor)
      .lerp(dawnBottom, dawnFactor);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${top.getHexString()}`);
    gradient.addColorStop(0.55, `#${mid.getHexString()}`);
    gradient.addColorStop(1, `#${bottom.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (duskFactor > 0.05) {
      const tNorm = Math.min(1, duskFactor * 2);
      const bandStart = canvas.height * (0.5 + tNorm * 0.08);
      const flare = ctx.createLinearGradient(0, bandStart, 0, canvas.height);
      flare.addColorStop(0, `rgba(255,95,60,${0.5 * sunsetBoost * duskFactor})`);
      flare.addColorStop(0.6, `rgba(255,160,85,${0.35 * sunsetBoost * duskFactor})`);
      flare.addColorStop(1, `rgba(255,215,125,${0.25 * sunsetBoost * duskFactor})`);
      ctx.fillStyle = flare;
      ctx.fillRect(0, bandStart, canvas.width, canvas.height - bandStart);
    } else if (dawnFactor > 0.05) {
      const tNorm = Math.min(1, dawnFactor * 2);
      const bandStart = canvas.height * (0.58 - tNorm * 0.08);
      const flare = ctx.createLinearGradient(0, bandStart, 0, canvas.height);

      // Rosy fingers - variable dawn gradients
      if (dawnVariant > 0.7) {
        // Pink-lavender dawn
        flare.addColorStop(0, `rgba(212,168,232,${0.35 * sunriseBoost * dawnFactor})`); // Lavender
        flare.addColorStop(0.4, `rgba(245,166,200,${0.45 * sunriseBoost * dawnFactor})`); // Rose pink
        flare.addColorStop(0.7, `rgba(255,200,180,${0.35 * sunriseBoost * dawnFactor})`); // Soft peach
        flare.addColorStop(1, `rgba(255,225,190,${0.25 * sunriseBoost * dawnFactor})`);
      } else if (dawnVariant > 0.4) {
        // Rose-amber dawn
        flare.addColorStop(0, `rgba(180,120,160,${0.3 * sunriseBoost * dawnFactor})`); // Purple-rose
        flare.addColorStop(0.5, `rgba(255,140,120,${0.4 * sunriseBoost * dawnFactor})`); // Coral
        flare.addColorStop(1, `rgba(255,210,150,${0.3 * sunriseBoost * dawnFactor})`); // Golden
      } else {
        // Peachy-amber dawn (original with enhancement)
        flare.addColorStop(0, `rgba(255,110,75,${0.38 * sunriseBoost * dawnFactor})`);
        flare.addColorStop(0.6, `rgba(255,165,110,${0.35 * sunriseBoost * dawnFactor})`);
        flare.addColorStop(1, `rgba(255,210,150,${0.25 * sunriseBoost * dawnFactor})`);
      }

      ctx.fillStyle = flare;
      ctx.fillRect(0, bandStart, canvas.width, canvas.height - bandStart);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, [skyKey, sunriseBoost, sunsetBoost, dawnVariant]);

  if (!texture) return null;
  return (
    <mesh rotation={[0, 0, 0]}>
      <sphereGeometry args={[210, 32, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
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
  texture.needsUpdate = true;
  return texture;
};

const SunDisc: React.FC<{ timeOfDay: number; weather: React.MutableRefObject<WeatherState> }> = ({ timeOfDay, weather }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Create sun texture once
  const sunTexture = useMemo(() => createSunTexture(512), []);

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
    </group>
  );
};


export const Simulation: React.FC<SimulationProps> = ({ params, simTime, devSettings, playerStats, onStatsUpdate, onMapChange, onNearBuilding, onNearMerchant, onNpcSelect, selectedNpcId, onMinimapUpdate, onPickupPrompt, onPickupItem, onWeatherUpdate }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const shadowFillLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const marketBounceRef = useRef<THREE.PointLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ratsRef = useRef<Rat[]>([]);
  const playerRef = useRef<THREE.Group>(null);
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
  
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [playerSpawn, setPlayerSpawn] = useState<[number, number, number]>(() => {
    return params.mapX === 0 && params.mapY === 0 ? [6, 0, 6] : [0, 0, 0];
  });
  const [buildingsState, setBuildingsState] = useState<BuildingMetadata[]>([]);
  const buildingsRef = useRef<BuildingMetadata[]>([]);
  const [currentNearBuilding, setCurrentNearBuilding] = useState<BuildingMetadata | null>(null);
  const [currentNearMerchant, setCurrentNearMerchant] = useState<MerchantNPCType | null>(null);
  const terrainSeed = useMemo(() => params.mapX * 1000 + params.mapY * 13 + 19, [params.mapX, params.mapY]);
  const sessionSeed = useMemo(() => Math.floor(Math.random() * 1000000), []);
  const district = useMemo(() => getDistrictType(params.mapX, params.mapY), [params.mapX, params.mapY]);
  useEffect(() => {
    setPlayerSpawn(params.mapX === 0 && params.mapY === 0 ? [6, 0, 6] : [0, 0, 0]);
  }, [params.mapX, params.mapY]);
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
      return items;
    }
    if (district === 'WEALTHY') {
      items.push(
        createPushable('olive-east', 'olivePot', [6.2, 0.2, 4.8], 0.8, 1.8, 0, 'ceramic'),
        createPushable('olive-west', 'olivePot', [-6.4, 0.2, -4.6], 0.8, 1.8, 0, 'ceramic'),
        createPushable('lemon-east', 'lemonPot', [8.6, 0.2, 6.2], 0.8, 1.8, 0, 'ceramic'),
        createPushable('geranium-wealthy-1', 'geranium', [-8.6, 0.2, 6.2], 0.9, 1.2, 0.1, 'ceramic'),
        createPushable('geranium-wealthy-2', 'geranium', [8.8, 0.2, -6.4], 0.9, 1.2, -0.1, 'ceramic')
      );
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
    if (district === 'ALLEYS') {
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
        createPushable('bench-civic', 'bench', [6.8, 0.2, -6.2], 1.1, 2.6, -0.3, 'stone'),
        createPushable('olive-civic', 'olivePot', [-5.2, 0.2, 4.8], 0.8, 1.8, 0, 'ceramic'),
        createPushable('lemon-civic', 'lemonPot', [4.8, 0.2, -4.4], 0.8, 1.8, 0, 'ceramic')
      );
      addProduce('olive-civic-1', 'olive', [-4.6, 0.05, 5.4], 'Olives (Handful)', 'ground-olives');
      addProduce('lemon-civic-1', 'lemon', [5.4, 0.05, -5.2], 'Lemon', 'ground-lemons');
      addCoin('coin-civic-1', [0.8, 0.05, 1.4]);
      return items;
    }
    items.push(
      createPushable('jar-res-1', 'clayJar', [-2.2, 0.3, -1.8], 0.6, 0.8, 0, 'ceramic'),
      createPushable('geranium-res', 'geranium', [2.6, 0.2, 2.4], 0.85, 1.2, 0, 'ceramic')
    );
    addPickupItem('shard-res-1', 'potteryShard', [-0.6, 0.05, 1.2], 'Pottery Shard', 'ground-pottery');
    addPickupItem('candle-res-1', 'candleStub', [1.6, 0.05, -1.4], 'Candle Stub', 'ground-candle');
    addCoin('coin-res-1', [0.2, 0.05, -2.2]);
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
  const handlePickupItem = useCallback((itemId: string, pickup: PickupInfo) => {
    setPushables(prev => prev.filter(item => item.id !== itemId));
    onPickupItem?.(pickup);
  }, [onPickupItem]);

  // Procedurally generate 1-3 market stalls in the main marketplace
  const marketStalls = useMemo<MarketStallData[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (district !== 'OUTSKIRTS' && district !== 'CARAVANSERAI') return [];
    }

    const seed = params.mapX * 1000 + params.mapY * 100 + sessionSeed;
    let randCounter = 0;
    const rand = () => seededRandom(seed + randCounter++ * 137);

    const stallCount = district === 'OUTSKIRTS' ? 1 : district === 'CARAVANSERAI' ? 6 : 1 + Math.floor(rand() * 3); // 1-3 stalls
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
      const size = district === 'OUTSKIRTS' ? 'small' : district === 'CARAVANSERAI' ? 'medium' : rand() < 0.2 ? 'small' : rand() < 0.7 ? 'medium' : 'large';
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
      const positionOverride: [number, number, number] | null = district === 'OUTSKIRTS'
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
  }, [params.mapX, params.mapY, sessionSeed]);

  // Generate merchant NPCs for each market stall
  const merchants = useMemo<MerchantNPCType[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (district !== 'OUTSKIRTS' && district !== 'CARAVANSERAI') return [];
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

  // Obstacles including market stalls for NPC collision detection
  const obstacles = useMemo<Obstacle[]>(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    if (params.mapX !== 0 || params.mapY !== 0) {
      if (district !== 'OUTSKIRTS' && district !== 'CARAVANSERAI') return [];
    }

    const baseObstacles: Obstacle[] = district === 'OUTSKIRTS'
      ? []
      : district === 'CARAVANSERAI'
        ? [
          // Central fountain
          { position: [0, 0, 0], radius: 5.5 },
          // Merchant stalls in arcades (north wall)
          { position: [-25, 0, -32], radius: 3.0 },
          { position: [-10, 0, -32], radius: 3.0 },
          { position: [10, 0, -32], radius: 3.0 },
          { position: [25, 0, -32], radius: 3.0 },
          // South wall stalls
          { position: [-25, 0, 32], radius: 3.0 },
          { position: [-10, 0, 32], radius: 3.0 },
          { position: [10, 0, 32], radius: 3.0 },
          { position: [25, 0, 32], radius: 3.0 },
          // East wall stalls
          { position: [32, 0, -25], radius: 3.0 },
          { position: [32, 0, -10], radius: 3.0 },
          { position: [32, 0, 10], radius: 3.0 },
          { position: [32, 0, 25], radius: 3.0 },
          // West wall stalls
          { position: [-32, 0, -25], radius: 3.0 },
          { position: [-32, 0, -10], radius: 3.0 },
          { position: [-32, 0, 10], radius: 3.0 },
          { position: [-32, 0, 25], radius: 3.0 },
          // Camels
          { position: [-15, 0, -12], radius: 2.0 },
          { position: [12, 0, -15], radius: 2.0 },
          { position: [-12, 0, 15], radius: 2.0 },
          { position: [15, 0, 12], radius: 2.0 }
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

    return [...baseObstacles, ...stallObstacles];
  }, [params.mapX, params.mapY, marketStalls]);

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

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const sunAngle = (params.timeOfDay / 24) * Math.PI * 2;
  const sunElevation = Math.sin(sunAngle - Math.PI / 2);
  const dayFactor = smoothstep(-0.1, 0.35, sunElevation);
  const twilightFactor = smoothstep(-0.45, 0.05, sunElevation) * (1 - dayFactor);
  const nightFactor = 1 - Math.max(dayFactor, twilightFactor);
  const enableHoverWireframe = params.cameraMode === CameraMode.OVERHEAD || devSettings.showHoverWireframe;
  const enableHoverLabel = params.cameraMode === CameraMode.OVERHEAD;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
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
        const sunIntensity = Math.pow(Math.max(0, sunElevation), 0.45) * 5.2 * (1 - cloudCover * 0.4);
        // Tier 1: Reduced ambient for darker, more vivid shadows
        let ambientIntensity = 0.04 + dayFactor * 0.35 + cloudCover * 0.08;
        // Tier 1: Boosted hemisphere for warm ground bounce
        let hemiIntensity = 0.22 + dayFactor * 0.6 + cloudCover * 0.16;

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

        sunColor.set("#ffe8c5");
        temp1.set("#ffb46b");
        temp2.set("#3b4a6a");
        sunColor.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);

        hemiSky.set("#bcd7ff");
        temp1.set("#d6b49c");
        temp2.set("#2b3250");
        hemiSky.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);

        // Sun-baked: Warm ground bounce from hot sand/stone
        hemiGround.set("#e8c4a0");
        temp1.set("#5c4b3a");
        temp2.set("#1f1c1b");
        hemiGround.lerp(temp1, twilightFactor).lerp(temp2, nightFactor);

        // Sky colors matching the SkyGradientDome for atmospheric perspective
        const { skyMid, skyHorizon, fogColor } = colorCache.current;

        skyMid.set('#162341');
        temp1.set('#49a6ef');
        temp2.set('#8b6f5a');
        temp3.set('#1b2438');
        skyMid.lerp(temp1, dayFactor).lerp(temp2, twilightFactor * 0.7).lerp(temp3, nightFactor);

        skyHorizon.set('#1c2a4a');
        temp1.set('#2f95ee');
        temp2.set('#e8b878');
        temp3.set('#0f1829');
        skyHorizon.lerp(temp1, dayFactor).lerp(temp2, twilightFactor * 0.8).lerp(temp3, nightFactor);

        // HORIZON ATMOSPHERIC COLOR SYSTEM
        // Base: use sky horizon color for seamless blending
        fogColor.copy(skyHorizon);

        // Dawn: Rosy fingers - pink, lavender, soft orange gradients
        const dawnFactor = smoothstep(-0.2, 0.05, sunElevation) * (1 - dayFactor);
        if (dawnFactor > 0.1) {
          // Variable dawn colors for beautiful variety
          temp1.set('#f5a6c8');
          temp2.set('#e8b4d4');
          temp1.lerp(temp2, seededRandom(params.mapX + params.mapY));
          temp2.set('#d4a8e8');
          temp3.set('#ffc4a3');

          // Blend multiple dawn colors for gradient effect
          fogColor.lerp(temp1, dawnFactor * 0.35);
          fogColor.lerp(temp2, dawnFactor * 0.15);
          fogColor.lerp(temp3, dawnFactor * 0.2);
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

        // Twilight/Dusk: Subtle atmospheric glow at horizon (toned down)
        const duskFactor = smoothstep(0.05, -0.2, -sunElevation) * (1 - dayFactor);
        if (duskFactor > 0.1) {
          temp1.set('#e8c488'); // Softer peachy-gold
          temp2.set('#b8a8c4'); // Less saturated lavender
          fogColor.lerp(temp1, duskFactor * 0.18); // Further reduced
          fogColor.lerp(temp2, duskFactor * 0.08); // Further reduced
        }

        // Night: Cool deep blue atmosphere
        if (nightFactor > 0.5) {
          temp1.set('#1a2845');
          fogColor.lerp(temp1, (nightFactor - 0.5) * 0.5);
        }

        // GRAPHICS: Toned down twilight color - subtle warm glow instead of strong pink-red flash
        const { skyColor } = colorCache.current;
        skyColor.set("#87ceeb");
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
        const nightClamp = 1 - nightFactor * 0.6;
        ambientIntensity *= nightClamp;
        hemiIntensity *= nightClamp;
        if (nightFactor > 0.2) {
          const moonLift = (nightFactor - 0.2) * 0.35;
          hemiIntensity += moonLift;
          temp1.set("#6b7fa8");
          hemiSky.lerp(temp1, nightFactor * 0.6);
        }

        lightRef.current.position.set(
          Math.cos(sunAngle - Math.PI / 2) * 60,
          Math.sin(sunAngle - Math.PI / 2) * 60,
          20
        );

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
        // GRAPHICS: Shadow fill light - adds saturated blue tint to shadows during day (scattered skylight)
        // WEATHER-AWARE: Color and intensity adjust based on atmospheric conditions
        if (shadowFillLightRef.current) {
          // Base intensity from dayFactor
          let shadowFillIntensity = dayFactor * 0.4;

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
            // Clear: saturated blue for Rayleigh scattering from clear sky
            shadowFillColor.set('#5a8fd8');
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
          // Sun-baked: Increased exposure during day for bright, intense heat
          const targetExposure = 1.15 + dayFactor * 0.15 - nightFactor * 0.18 + twilightFactor * 0.05;
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

          // Night atmosphere - very subtle for star visibility
          const nightAtmosphere = nightFactor * 0.002;

          // Realistic physics: add altitude-based density (more fog near ground)
          const altitudeFactor = 0.0008; // Ground-level fog accumulation

          fogRef.current.density = THREE.MathUtils.lerp(
            fogRef.current.density,
            (baseFog + horizonHaze + altitudeFactor + humidity * 0.004 + cloudCover * 0.003 + nightAtmosphere) * devSettings.fogDensityScale,
            0.02
          );
          fogRef.current.color.lerp(fogColor, 0.05);
        }

        scene.background = skyColor;
      }
    }

    // 2. Boundary Check for Map Transitions & Proximity Check
    if (playerRef.current) {
      const pos = playerRef.current.position;
      const boundary = CONSTANTS.BOUNDARY;

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

      if (onMinimapUpdate) {
        const now = state.clock.elapsedTime;
        if (now - minimapTickRef.current > 0.25) {
          minimapTickRef.current = now;
          const district = getDistrictType(params.mapX, params.mapY);
          const radius = district === 'ALLEYS' ? 20 : district === 'HOVELS' ? 26 : 34;
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

          // Calculate proper camera yaw from camera position (not euler angles)
          // This prevents pitch changes from affecting the minimap rotation
          const cameraOffset = new THREE.Vector3(
            pos.x - state.camera.position.x,
            0, // Ignore vertical component - only horizontal rotation matters
            pos.z - state.camera.position.z
          );
          const cameraYaw = Math.atan2(cameraOffset.x, cameraOffset.z);

          onMinimapUpdate({
            player: { x: pos.x, z: pos.z, yaw: playerRef.current.rotation.y, cameraYaw },
            buildings,
            npcs,
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
      <directionalLight
        ref={lightRef}
        position={[50, 50, 20]}
        castShadow={devSettings.showShadows}
        shadow-mapSize={[768, 768]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
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
        environmentIntensity={(0.35 + dayFactor * 0.75) * (1 - nightFactor * 0.7)}
      />
      <Stars
        radius={180}
        depth={80}
        count={dayFactor > 0.25 ? 0 : 9000}
        factor={5}
        saturation={0.1}
        fade
        speed={0.6}
      />
      <Moon timeOfDay={params.timeOfDay} simTime={simTime} />
      <MilkyWay visible={dayFactor <= 0.2} />

      {devSettings.showFog && <fogExp2 ref={fogRef} attach="fog" args={['#c5ddf5', 0.004]} />}
      {devSettings.showClouds && <CloudLayer weather={weather} />}

      <WorldEnvironment
        mapX={params.mapX}
        mapY={params.mapY}
        onGroundClick={setPlayerTarget}
        onBuildingsGenerated={(b) => {
          buildingsRef.current = b;
          buildingHashRef.current = buildBuildingHash(b);
          setBuildingsState(b);
          const district = getDistrictType(params.mapX, params.mapY);
          if (district === 'HOVELS' || district === 'ALLEYS') {
            const spawnSeed = params.mapX * 1000 + params.mapY * 13 + 77;
            const tryPoints: THREE.Vector3[] = [];
            const base = new THREE.Vector3(0, 0, 0);
            const ring = [0, 3, 6, 9, 12];
            ring.forEach((r) => {
              for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + seededRandom(spawnSeed + r * 13 + i) * 0.6;
                tryPoints.push(new THREE.Vector3(base.x + Math.cos(angle) * r, 0, base.z + Math.sin(angle) * r));
              }
            });
            const hash = buildingHashRef.current || undefined;
            const found = tryPoints.find((p) => !isBlockedByBuildings(p, b, 0.6, hash) && !isBlockedByObstacles(p, obstacles, 0.6));
            if (found) {
              setPlayerSpawn([found.x, 0, found.z]);
            }
          }
        }}
        nearBuildingId={currentNearBuilding?.id}
        timeOfDay={params.timeOfDay}
        enableHoverWireframe={enableHoverWireframe}
        enableHoverLabel={enableHoverLabel}
        pushables={pushables}
        fogColor={colorCache.current.fogColor}
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

      {/* Tier 3: Contact Shadows - adds depth and grounding to buildings */}
      {devSettings.showShadows && (
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
      <DustParticles timeOfDay={params.timeOfDay} />

      <ImpactPuffs puffsRef={impactPuffsRef} />
      
      {devSettings.showNPCs && (
        <Agents 
          params={params} 
          simTime={simTime} 
          onStatsUpdate={onStatsUpdate} 
          rats={ratsRef.current} 
          buildings={buildingsRef.current} 
          buildingHash={buildingHashRef.current}
          obstacles={obstacles}
          maxAgents={20}
          agentHashRef={agentHashRef}
          impactMapRef={impactMapRef}
          playerRef={playerRef}
          onNpcSelect={onNpcSelect}
          selectedNpcId={selectedNpcId}
          district={district}
          terrainSeed={terrainSeed}
        />
      )}
      {devSettings.showTorches && <TorchLightPool buildings={buildingsState} playerRef={playerRef} timeOfDay={params.timeOfDay} />}
      {devSettings.showTorches && <WindowLightPool buildings={buildingsState} timeOfDay={params.timeOfDay} />}
      {devSettings.showRats && <Rats ref={ratsRef} params={params} />}
      
      <Player 
        ref={playerRef}
        initialPosition={playerSpawn}
        targetPosition={playerTarget} 
        setTargetPosition={setPlayerTarget} 
        cameraMode={params.cameraMode}
        buildings={buildingsRef.current}
        buildingHash={buildingHashRef.current}
        obstacles={obstacles}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
        agentHashRef={agentHashRef}
        onAgentImpact={handleAgentImpact}
        pushablesRef={pushablesRef}
        onImpactPuff={handleImpactPuff}
        district={district}
        terrainSeed={terrainSeed}
        onPickupPrompt={onPickupPrompt}
        onPickup={handlePickupItem}
      />
    </>
  );
};
