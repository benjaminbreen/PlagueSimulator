
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, SimulationCounts, CONSTANTS, BuildingMetadata } from '../types';
import { Environment as WorldEnvironment } from './Environment';
import { Agents } from './Agents';
import { Rats, Rat } from './Rats';
import { Player } from './Player';

interface SimulationProps {
  params: SimulationParams;
  simTime: number;
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
  const count = 20;

  const clouds = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 200, 30 + Math.random() * 10, (Math.random() - 0.5) * 200),
      scale: 10 + Math.random() * 25,
      speed: 0.2 + Math.random() * 0.6,
    }));
  }, []);

  useFrame((_, delta) => {
    const cloudCover = weather.current.cloudCover;
    if (!meshRef.current) return;

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
    meshRef.current.visible = cloudCover > 0.05;
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
      <sphereGeometry args={[4, 32, 32]} />
      <meshBasicMaterial color="#fffbe6" />
      <pointLight intensity={0.6} distance={200} color="#ccddee" />
    </mesh>
  );
};

export const Simulation: React.FC<SimulationProps> = ({ params, simTime, onStatsUpdate, onMapChange, onNearBuilding }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ratsRef = useRef<Rat[]>([]);
  const playerRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
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
    if (t > weather.current.nextShift) {
      weather.current.targetCloudCover = 0.15 + Math.random() * 0.7;
      weather.current.targetHumidity = 0.1 + Math.random() * 0.5;
      weather.current.wind.set(0.2 + Math.random() * 0.6, 0.1 + Math.random() * 0.4);
      weather.current.nextShift = t + 45 + Math.random() * 60;
      const roll = Math.random();
      weather.current.targetWeatherType = roll > 0.85 ? WeatherType.SANDSTORM : roll > 0.55 ? WeatherType.OVERCAST : WeatherType.CLEAR;
    }
    weather.current.cloudCover = THREE.MathUtils.lerp(
      weather.current.cloudCover,
      weather.current.targetCloudCover,
      0.01
    );
    weather.current.humidity = THREE.MathUtils.lerp(
      weather.current.humidity,
      weather.current.targetHumidity,
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
      const weatherType = weather.current.weatherType;

      const sunIntensity = Math.pow(Math.max(0, sunElevation), 0.55) * 4.4 * (1 - cloudCover * 0.4);
      let ambientIntensity = 0.09 + dayFactor * 0.45 + cloudCover * 0.1;
      let hemiIntensity = 0.24 + dayFactor * 0.55 + cloudCover * 0.18;

      const sunColor = new THREE.Color("#fff6e6")
        .lerp(new THREE.Color("#ffb46b"), twilightFactor)
        .lerp(new THREE.Color("#5c77c0"), nightFactor);
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
        fogColor.set("#8b4513");
        skyColor.set("#5d4037");
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

      if (fogRef.current) {
        const baseFog = weatherType === WeatherType.SANDSTORM ? 0.03 : weatherType === WeatherType.OVERCAST ? 0.015 : 0.008;
        fogRef.current.density = THREE.MathUtils.lerp(
          fogRef.current.density,
          baseFog + humidity * 0.008 + cloudCover * 0.004 + nightFactor * 0.006,
          0.02
        );
        fogRef.current.color.lerp(fogColor, 0.05);
      }

      scene.background = skyColor;
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
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      
      <DreiEnvironment
        preset={envPreset}
        background={false}
        blur={0.6}
        environmentIntensity={0.25 + dayFactor * 0.65}
      />
      <Stars
        radius={140}
        depth={60}
        count={dayFactor > 0.25 ? 0 : 4000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <Moon timeOfDay={params.timeOfDay} />

      <fogExp2 ref={fogRef} attach="fog" args={['#a89a80', 0.015]} /> 
      <CloudLayer weather={weather} />

      <WorldEnvironment 
        mapX={params.mapX} 
        mapY={params.mapY} 
        onGroundClick={setPlayerTarget} 
        onBuildingsGenerated={(b) => { buildingsRef.current = b; }}
        nearBuildingId={currentNearBuilding?.id}
        timeOfDay={params.timeOfDay}
      />
      
      {/* Updated MiasmaFog to use infectionRate prop */}
      <MiasmaFog infectionRate={params.infectionRate} />
      
      <Agents params={params} simTime={simTime} onStatsUpdate={onStatsUpdate} rats={ratsRef.current} />
      <Rats ref={ratsRef} params={params} />
      
      <Player 
        ref={playerRef}
        targetPosition={playerTarget} 
        setTargetPosition={setPlayerTarget} 
        cameraMode={params.cameraMode}
      />
    </>
  );
};
