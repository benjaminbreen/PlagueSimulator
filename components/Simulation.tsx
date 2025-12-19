
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, SimulationCounts, DevSettings, PlayerStats, CONSTANTS, BuildingMetadata, BuildingType } from '../types';
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
  const maxLights = 12;
  const lightRefs = useRef<Array<THREE.PointLight | null>>([]);
  const torchPositions = useMemo(() => getTorchPositions(buildings), [buildings]);
  const tickRef = useRef(0);

  useFrame((state) => {
    if (!playerRef.current || torchPositions.length === 0) return;
    const t = state.clock.elapsedTime;
    if (t - tickRef.current < 0.25) return;
    tickRef.current = t;

    const playerPos = playerRef.current.position;
    const torchIntensity = timeOfDay >= 19 || timeOfDay < 5 ? 1.0 : timeOfDay >= 17 ? (timeOfDay - 17) / 2 : timeOfDay < 7 ? (7 - timeOfDay) / 2 : 0.15;
    const activeCount =
      timeOfDay >= 19 || timeOfDay < 5 ? 12 : timeOfDay >= 17 ? 10 : timeOfDay < 7 ? 6 : 4;
    const sorted = torchPositions
      .map(p => ({ p, d: p.distanceToSquared(playerPos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, activeCount);

    for (let i = 0; i < maxLights; i++) {
      const light = lightRefs.current[i];
      const entry = sorted[i];
      if (!light) continue;
      if (entry) {
        light.visible = torchIntensity > 0.05;
        light.position.copy(entry.p);
        light.intensity = torchIntensity * 1.1;
        light.distance = timeOfDay >= 19 || timeOfDay < 5 ? 14 : 10;
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
          distance={10}
          decay={2}
          intensity={0}
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

export const Simulation: React.FC<SimulationProps> = ({ params, simTime, devSettings, playerStats, onStatsUpdate, onMapChange, onNearBuilding }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ratsRef = useRef<Rat[]>([]);
  const playerRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const buildingHashRef = useRef<SpatialHash<BuildingMetadata> | null>(null);
  const atmosphereTickRef = useRef(0);
  
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [buildingsState, setBuildingsState] = useState<BuildingMetadata[]>([]);
  const buildingsRef = useRef<BuildingMetadata[]>([]);
  const [currentNearBuilding, setCurrentNearBuilding] = useState<BuildingMetadata | null>(null);
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

  const sunAngle = (params.timeOfDay / 24) * Math.PI * 2;
  const sunElevation = Math.sin(sunAngle - Math.PI / 2);
  const dayFactor = smoothstep(-0.1, 0.35, sunElevation);
  const twilightFactor = smoothstep(-0.45, 0.05, sunElevation) * (1 - dayFactor);
  const nightFactor = 1 - Math.max(dayFactor, twilightFactor);

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

        const sunIntensity = Math.pow(Math.max(0, sunElevation), 0.55) * 4.4 * (1 - cloudCover * 0.4);
        let ambientIntensity = 0.06 + dayFactor * 0.42 + cloudCover * 0.08;
        let hemiIntensity = 0.18 + dayFactor * 0.5 + cloudCover * 0.16;

        const sunColor = new THREE.Color("#fff6e6")
          .lerp(new THREE.Color("#ffb46b"), twilightFactor)
          .lerp(new THREE.Color("#3b4a6a"), nightFactor);
        const hemiSky = new THREE.Color("#bcd7ff")
          .lerp(new THREE.Color("#d6b49c"), twilightFactor)
          .lerp(new THREE.Color("#2b3250"), nightFactor);
        const hemiGround = new THREE.Color("#b7a084")
          .lerp(new THREE.Color("#5c4b3a"), twilightFactor)
          .lerp(new THREE.Color("#1f1c1b"), nightFactor);

        let fogColor = new THREE.Color("#c9b89c")
          .lerp(new THREE.Color("#8c6a5a"), twilightFactor)
          .lerp(new THREE.Color("#1a1f2c"), nightFactor);
        let skyColor = new THREE.Color("#87ceeb")
          .lerp(new THREE.Color("#ff7e5f"), twilightFactor)
          .lerp(new THREE.Color("#02040a"), nightFactor);

        if (weatherType === WeatherType.OVERCAST) {
          ambientIntensity += 0.18;
          hemiIntensity += 0.2;
          fogColor.lerp(new THREE.Color("#708090"), 0.4);
          skyColor.lerp(new THREE.Color("#4a5560"), 0.5);
        } else if (weatherType === WeatherType.SANDSTORM) {
          ambientIntensity += 0.05;
          hemiIntensity += 0.1;
          const stormFog = new THREE.Color("#8b6b3c").lerp(new THREE.Color("#2a3244"), nightFactor * 0.7);
          fogColor.copy(stormFog);
          skyColor.set("#6b4a2f").lerp(new THREE.Color("#1c2333"), nightFactor * 0.7);
        }

        // Night clamp to avoid bright whites
        const nightClamp = 1 - nightFactor * 0.6;
        ambientIntensity *= nightClamp;
        hemiIntensity *= nightClamp;

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

        if (fogRef.current && devSettings.showFog) {
          const baseFog = weatherType === WeatherType.SANDSTORM ? 0.015 : weatherType === WeatherType.OVERCAST ? 0.012 : 0.008;
          fogRef.current.density = THREE.MathUtils.lerp(
            fogRef.current.density,
            (baseFog + humidity * 0.008 + cloudCover * 0.004 + nightFactor * 0.006) * devSettings.fogDensityScale,
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
      <ambientLight ref={ambientRef} intensity={0.2} color="#ccccff" />
      <hemisphereLight ref={hemiRef} intensity={0.3} color="#cbd5ff" groundColor="#8b7d6b" />
      <directionalLight
        ref={lightRef}
        position={[50, 50, 20]}
        castShadow={devSettings.showShadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      
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

      {devSettings.showFog && <fogExp2 ref={fogRef} attach="fog" args={['#a89a80', 0.015]} />}
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
          maxAgents={30}
        />
      )}
      {devSettings.showTorches && <TorchLightPool buildings={buildingsState} playerRef={playerRef} timeOfDay={params.timeOfDay} />}
      {devSettings.showRats && <Rats ref={ratsRef} params={params} />}
      
      <Player 
        ref={playerRef}
        targetPosition={playerTarget} 
        setTargetPosition={setPlayerTarget} 
        cameraMode={params.cameraMode}
        buildings={buildingsRef.current}
        buildingHash={buildingHashRef.current}
        timeOfDay={params.timeOfDay}
        playerStats={playerStats}
      />
    </>
  );
};
