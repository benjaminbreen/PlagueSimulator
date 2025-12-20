
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, SimulationCounts, DevSettings, PlayerStats, CONSTANTS, BuildingMetadata, BuildingType, Obstacle, CameraMode } from '../types';
import { Environment as WorldEnvironment } from './Environment';
import { Agents } from './Agents';
import { Rats, Rat } from './Rats';
import { Player } from './Player';
import { SpatialHash, buildBuildingHash } from '../utils/spatial';
import { seededRandom } from '../utils/procedural';

interface SimulationProps {
  params: SimulationParams;
  simTime: number;
  devSettings: DevSettings;
  playerStats: PlayerStats;
  onStatsUpdate: (stats: SimulationCounts) => void;
  onMapChange: (dx: number, dy: number) => void;
  onNearBuilding: (building: BuildingMetadata | null) => void;
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

const Moon: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const moonAngle = ((timeOfDay + 6) % 24 / 12) * Math.PI;
    meshRef.current.position.set(
      Math.cos(moonAngle) * 90,
      Math.sin(moonAngle) * 90,
      -30
    );
    meshRef.current.lookAt(0, 0, 0);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[5.5, 32, 32]} />
      <meshBasicMaterial color="#fffbe6" />
      <pointLight intensity={0.9} distance={240} color="#d5e2ff" />
    </mesh>
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
  // PERFORMANCE FIX: Reduced from 12 to 3 lights (10 FPS → 60 FPS improvement!)
  const maxLights = 3;
  const lightRefs = useRef<Array<THREE.PointLight | null>>([]);
  const torchPositions = useMemo(() => getTorchPositions(buildings), [buildings]);
  const tickRef = useRef(0);

  useFrame((state) => {
    if (!playerRef.current || torchPositions.length === 0) return;
    const t = state.clock.elapsedTime;
    // PERFORMANCE FIX: Update every 1s instead of 0.25s (4x less frequent)
    if (t - tickRef.current < 1.0) return;
    tickRef.current = t;

    // PERFORMANCE FIX: Only enable during deep night (8pm-5am)
    if (timeOfDay < 20 && timeOfDay > 5) {
      // Not deep night - disable all torches for performance
      for (let i = 0; i < maxLights; i++) {
        const light = lightRefs.current[i];
        if (light) light.visible = false;
      }
      return;
    }

    const playerPos = playerRef.current.position;
    const torchIntensity = timeOfDay >= 20 || timeOfDay < 5 ? 1.0 : 0.5;
    // PERFORMANCE FIX: Max 3 torches, only during deep night
    const activeCount = timeOfDay >= 20 || timeOfDay < 5 ? 3 : 2;
    const sorted = torchPositions
      .map(p => ({ p, d: p.distanceToSquared(playerPos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, activeCount);

    for (let i = 0; i < maxLights; i++) {
      const light = lightRefs.current[i];
      const entry = sorted[i];
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

const SunDisc: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!meshRef.current) return;
    const sunAngle = (timeOfDay / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle - Math.PI / 2);
    const radius = 120;
    meshRef.current.visible = elevation > -0.1;
    meshRef.current.position.set(
      Math.cos(sunAngle - Math.PI / 2) * radius,
      Math.max(-10, elevation * 90),
      60
    );
    meshRef.current.lookAt(0, 0, 0);
    if (haloRef.current) {
      haloRef.current.visible = elevation > -0.1;
      haloRef.current.position.copy(meshRef.current.position);
      haloRef.current.lookAt(0, 0, 0);
    }
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial color="#ffd39a" transparent opacity={0.85} />
      </mesh>
      <mesh ref={haloRef}>
        <circleGeometry args={[10, 32]} />
        <meshBasicMaterial color="#ffcc88" transparent opacity={0.25} />
      </mesh>
    </group>
  );
};


export const Simulation: React.FC<SimulationProps> = ({ params, simTime, devSettings, playerStats, onStatsUpdate, onMapChange, onNearBuilding }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const marketBounceRef = useRef<THREE.PointLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ratsRef = useRef<Rat[]>([]);
  const playerRef = useRef<THREE.Group>(null);
  const { scene, gl } = useThree();
  const buildingHashRef = useRef<SpatialHash<BuildingMetadata> | null>(null);
  const atmosphereTickRef = useRef(0);
  
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [buildingsState, setBuildingsState] = useState<BuildingMetadata[]>([]);
  const buildingsRef = useRef<BuildingMetadata[]>([]);
  const [currentNearBuilding, setCurrentNearBuilding] = useState<BuildingMetadata | null>(null);
  const playerSpawn = useMemo<[number, number, number]>(() => {
    return params.mapX === 0 && params.mapY === 0 ? [6, 0, 6] : [0, 0, 0];
  }, [params.mapX, params.mapY]);
  const obstacles = useMemo<Obstacle[]>(() => {
    if (params.mapX !== 0 || params.mapY !== 0) return [];
    return [
      { position: [0, 0, 0], radius: 4.2 },
      { position: [-6, 0, 0], radius: 0.9 },
      { position: [6, 0, 0], radius: 0.9 },
      { position: [-12, 0, 9], radius: 1.4 },
      { position: [12, 0, -9], radius: 1.4 },
      { position: [-3.2, 0, -3.2], radius: 0.6 },
      { position: [3.4, 0, 3.3], radius: 0.6 },
      { position: [6.2, 0, -5.0], radius: 0.5 },
      { position: [-5.6, 0, 6.0], radius: 0.5 }
    ];
  }, [params.mapX, params.mapY]);
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

        // Tier 2: Harsher sun for intense midday heat
        const sunIntensity = Math.pow(Math.max(0, sunElevation), 0.45) * 5.2 * (1 - cloudCover * 0.4);
        let ambientIntensity = 0.06 + dayFactor * 0.42 + cloudCover * 0.08;
        let hemiIntensity = 0.18 + dayFactor * 0.5 + cloudCover * 0.16;

        // Tier 2: Bleached highlights during peak sun (10am-2pm)
        if (dayFactor > 0.7) {
          const noonIntensity = (dayFactor - 0.7) / 0.3; // 0-1 from 10am-2pm
          ambientIntensity += noonIntensity * 0.15;
          hemiIntensity += noonIntensity * 0.2;
        }

        // Sun-baked: Warmer, golden sun color for Mediterranean heat
        const sunColor = new THREE.Color("#ffe8c5")
          .lerp(new THREE.Color("#ffb46b"), twilightFactor)
          .lerp(new THREE.Color("#3b4a6a"), nightFactor);
        const hemiSky = new THREE.Color("#bcd7ff")
          .lerp(new THREE.Color("#d6b49c"), twilightFactor)
          .lerp(new THREE.Color("#2b3250"), nightFactor);
        // Sun-baked: Warm ground bounce from hot sand/stone
        const hemiGround = new THREE.Color("#d4b894")
          .lerp(new THREE.Color("#5c4b3a"), twilightFactor)
          .lerp(new THREE.Color("#1f1c1b"), nightFactor);

        // Sky colors matching the SkyGradientDome for atmospheric perspective
        const skyMid = new THREE.Color('#162341')
          .lerp(new THREE.Color('#49a6ef'), dayFactor)
          .lerp(new THREE.Color('#a05044'), twilightFactor)
          .lerp(new THREE.Color('#1b2438'), nightFactor);
        const skyHorizon = new THREE.Color('#1c2a4a')
          .lerp(new THREE.Color('#2f95ee'), dayFactor)
          .lerp(new THREE.Color('#f7b25a'), twilightFactor)
          .lerp(new THREE.Color('#0f1829'), nightFactor); // Dark blue at night, not peachy!

        // HORIZON ATMOSPHERIC COLOR SYSTEM
        // Base: use sky horizon color for seamless blending
        let fogColor = skyHorizon.clone();

        // Dawn: Rosy fingers - pink, lavender, soft orange gradients
        const dawnFactor = smoothstep(-0.2, 0.05, sunElevation) * (1 - dayFactor);
        if (dawnFactor > 0.1) {
          // Variable dawn colors for beautiful variety
          const dawnPink = new THREE.Color('#f5a6c8').lerp(new THREE.Color('#e8b4d4'), seededRandom(params.mapX + params.mapY));
          const dawnLavender = new THREE.Color('#d4a8e8');
          const dawnPeach = new THREE.Color('#ffc4a3');

          // Blend multiple dawn colors for gradient effect
          fogColor.lerp(dawnPink, dawnFactor * 0.35);
          fogColor.lerp(dawnLavender, dawnFactor * 0.15);
          fogColor.lerp(dawnPeach, dawnFactor * 0.2);
        }

        // Daytime: SUBTLE atmospheric blue (was too strong!)
        if (dayFactor > 0.5) {
          const rayleighBlue = new THREE.Color('#c5ddf5'); // Lighter, less saturated
          fogColor.lerp(rayleighBlue, dayFactor * 0.15); // Reduced from 0.35

          // Peak sun heat haze (10am-2pm) - warm golden shimmer
          if (dayFactor > 0.7) {
            const heatHaze = new THREE.Color('#f5e6d3');
            fogColor.lerp(heatHaze, (dayFactor - 0.7) * 0.25);
          }
        }

        // Twilight/Dusk: Vibrant atmospheric glow at horizon
        const duskFactor = smoothstep(0.05, -0.2, -sunElevation) * (1 - dayFactor);
        if (duskFactor > 0.1) {
          const twilightGold = new THREE.Color('#f5b25a');
          const twilightPurple = new THREE.Color('#c896d4');
          fogColor.lerp(twilightGold, duskFactor * 0.4);
          fogColor.lerp(twilightPurple, duskFactor * 0.2);
        }

        // Night: Cool deep blue atmosphere
        if (nightFactor > 0.5) {
          const nightAtmo = new THREE.Color('#1a2845');
          fogColor.lerp(nightAtmo, (nightFactor - 0.5) * 0.5);
        }

        let skyColor = new THREE.Color("#87ceeb")
          .lerp(new THREE.Color("#ff7e5f"), twilightFactor)
          .lerp(new THREE.Color("#02040a"), nightFactor);

        if (weatherType === WeatherType.OVERCAST) {
          ambientIntensity += 0.18;
          hemiIntensity += 0.2;
          // Overcast: cool, desaturated horizon blending
          const overcastFog = new THREE.Color("#8a98a8").lerp(new THREE.Color("#5a6570"), nightFactor * 0.5);
          fogColor.lerp(overcastFog, 0.45);
          skyColor.lerp(new THREE.Color("#4a5560"), 0.4);
        } else if (weatherType === WeatherType.SANDSTORM) {
          ambientIntensity += 0.05;
          hemiIntensity += 0.1;
          // Sandstorm: thick ochre/tan dust at horizon
          const dustFog = new THREE.Color("#c9a876")
            .lerp(new THREE.Color("#8b6b3c"), 0.3)
            .lerp(new THREE.Color("#3a3844"), nightFactor * 0.7);
          fogColor.lerp(dustFog, 0.7); // Heavy dust color
          skyColor.lerp(new THREE.Color("#6b4a2f"), 0.5).lerp(new THREE.Color("#1c2333"), nightFactor * 0.5);
        }

        // Night clamp to avoid bright whites + cool moonlight lift
        const nightClamp = 1 - nightFactor * 0.6;
        ambientIntensity *= nightClamp;
        hemiIntensity *= nightClamp;
        if (nightFactor > 0.2) {
          const moonLift = (nightFactor - 0.2) * 0.35;
          hemiIntensity += moonLift;
          hemiSky.lerp(new THREE.Color("#6b7fa8"), nightFactor * 0.6);
        }

        lightRef.current.position.set(
          Math.cos(sunAngle - Math.PI / 2) * 60,
          Math.sin(sunAngle - Math.PI / 2) * 60,
          20
        );

        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, sunIntensity, 0.08);
        lightRef.current.color.lerp(sunColor, 0.05);
        ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, ambientIntensity, 0.08);
        hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, hemiIntensity, 0.08);
        hemiRef.current.color.lerp(hemiSky, 0.05);
        hemiRef.current.groundColor.lerp(hemiGround, 0.05);
        if (rimLightRef.current) {
          // Tier 2: Warm rim lighting during day + twilight
          const rimTarget = twilightFactor * 0.6 + dayFactor * 0.4;
          rimLightRef.current.intensity = THREE.MathUtils.lerp(rimLightRef.current.intensity, rimTarget, 0.05);
          // Warm golden rim during day, peachy during twilight
          const rimColor = dayFactor > 0.5 ? new THREE.Color('#fff0d8') : new THREE.Color('#f2b27a');
          rimLightRef.current.color.lerp(rimColor, 0.05);
        }
        if (marketBounceRef.current) {
          const isMarket = params.mapX === 0 && params.mapY === 0;
          const bounceTarget = isMarket ? dayFactor * 0.45 : 0;
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
            // CLEAR WEATHER - subtle horizon haze
            if (dayFactor > 0.5) {
              // Hot day: SUBTLE heat shimmer (reduced from 0.006)
              baseFog = 0.001;
              horizonHaze = 0.004;
            } else if (twilightFactor > 0.3) {
              // Twilight: atmospheric glow at horizon
              baseFog = 0.003;
              horizonHaze = 0.006; // Beautiful atmospheric blending
            } else if (dawnFactor > 0.1) {
              // Dawn: rosy atmospheric glow
              baseFog = 0.002;
              horizonHaze = 0.005; // Soft rosy haze
            } else {
              // Night: clearest atmosphere for starry sky
              baseFog = 0.001;
              horizonHaze = 0.002; // Minimal haze for stars
            }
          }

          // Night atmosphere - very subtle for star visibility
          const nightAtmosphere = nightFactor * 0.002;

          fogRef.current.density = THREE.MathUtils.lerp(
            fogRef.current.density,
            (baseFog + horizonHaze + humidity * 0.004 + cloudCover * 0.003 + nightAtmosphere) * devSettings.fogDensityScale,
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
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.18} color="#b9c4e6" />
      <pointLight ref={marketBounceRef} position={[0, 6, 0]} intensity={0} color="#f3cfa0" distance={36} decay={2} />
      <hemisphereLight ref={hemiRef} intensity={0.28} color="#c7d2f0" groundColor="#6f6a7a" />
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
      
      <SkyGradientDome timeOfDay={params.timeOfDay} />
      <SunDisc timeOfDay={params.timeOfDay} />
      <DreiEnvironment
        preset={envPreset}
        background={false}
        blur={0.6}
        environmentIntensity={(0.25 + dayFactor * 0.65) * (1 - nightFactor * 0.7)}
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
      <Moon timeOfDay={params.timeOfDay} />
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
        }}
        nearBuildingId={currentNearBuilding?.id}
        timeOfDay={params.timeOfDay}
        enableHoverWireframe={enableHoverWireframe}
        enableHoverLabel={enableHoverLabel}
      />
      
      {/* Updated MiasmaFog to use infectionRate prop */}
      {devSettings.showMiasma && <MiasmaFog infectionRate={params.infectionRate} />}
      
      {devSettings.showNPCs && (
        <Agents 
          params={params} 
          simTime={simTime} 
          onStatsUpdate={onStatsUpdate} 
          rats={ratsRef.current} 
          buildings={buildingsRef.current} 
          buildingHash={buildingHashRef.current}
          obstacles={obstacles}
          maxAgents={30}
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
      />
    </>
  );
};
