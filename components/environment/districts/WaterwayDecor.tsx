/**
 * Waterway District Decorations (Al-Qanawat)
 * Canal district with irrigation channels, water wheels (norias),
 * lush vegetation, stone-lined banks, and washing areas.
 * The qanawat (canals) were crucial to Damascus's famous gardens.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import { HoverableGroup } from '../shared/HoverSystem';

// Water material with subtle animation
const WATER_COLOR = new THREE.Color('#3a6a7a');
const WATER_SHALLOW = new THREE.Color('#4a8090');

// Stone colors for canal walls
const STONE_COLORS = ['#8a8070', '#7a7060', '#9a9080', '#706858'];

// Vegetation colors
const REED_COLOR = '#5a7a4a';
const WILLOW_TRUNK = '#5a4a3a';
const WILLOW_LEAVES = '#4a7a3a';
const LILY_PAD = '#3a6a3a';

type WaterwayLayout = {
  mainCanal: { start: [number, number]; end: [number, number]; width: number };
  branchCanals: Array<{ start: [number, number]; end: [number, number]; width: number }>;
  bridges: Array<{ pos: [number, number, number]; rotation: number; width: number }>;
  norias: Array<{ pos: [number, number, number]; scale: number; speed: number }>;
  washingStones: Array<[number, number, number]>;
  willowTrees: Array<{ pos: [number, number, number]; scale: number; lean: number }>;
  reedClusters: Array<{ pos: [number, number, number]; count: number }>;
  lilyPads: Array<{ pos: [number, number, number]; scale: number }>;
  qanatOpenings: Array<[number, number, number]>;
  stoneBenches: Array<{ pos: [number, number, number]; rotation: number }>;
};

export const buildWaterwayLayout = (mapX: number, mapY: number): WaterwayLayout => {
  const seed = mapX * 1000 + mapY * 100 + 777;
  let i = 0;
  const rand = () => seededRandom(seed + i++ * 41);
  const jitter = (amount: number) => (rand() - 0.5) * amount;

  // Main canal runs diagonally or along an axis
  const canalAngle = rand() > 0.5 ? 0 : Math.PI / 4;
  const mainCanal = {
    start: [-45 + jitter(5), -45 + jitter(5)] as [number, number],
    end: [45 + jitter(5), 45 + jitter(5)] as [number, number],
    width: 4 + rand() * 2
  };

  // Branch canals
  const branchCanals: Array<{ start: [number, number]; end: [number, number]; width: number }> = [];
  const branchCount = 2 + Math.floor(rand() * 2);
  for (let b = 0; b < branchCount; b++) {
    const t = 0.2 + rand() * 0.6;
    const mainX = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const mainZ = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const perpAngle = canalAngle + Math.PI / 2 + jitter(0.3);
    const length = 15 + rand() * 20;
    const dir = rand() > 0.5 ? 1 : -1;
    branchCanals.push({
      start: [mainX, mainZ],
      end: [mainX + Math.cos(perpAngle) * length * dir, mainZ + Math.sin(perpAngle) * length * dir],
      width: 2 + rand() * 1.5
    });
  }

  // Bridges crossing the main canal
  const bridges: Array<{ pos: [number, number, number]; rotation: number; width: number }> = [];
  const bridgeCount = 2 + Math.floor(rand() * 2);
  for (let b = 0; b < bridgeCount; b++) {
    const t = 0.15 + (b / bridgeCount) * 0.7 + jitter(0.1);
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    bridges.push({
      pos: [x, 0.3, z],
      rotation: canalAngle + Math.PI / 2,
      width: mainCanal.width + 1.5
    });
  }

  // Water wheels (norias) - Damascus was famous for these
  const norias: Array<{ pos: [number, number, number]; scale: number; speed: number }> = [];
  const noriaCount = 1 + Math.floor(rand() * 2);
  for (let n = 0; n < noriaCount; n++) {
    const t = 0.3 + rand() * 0.4;
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (mainCanal.width / 2 + 1) * (rand() > 0.5 ? 1 : -1);
    norias.push({
      pos: [x + Math.cos(canalAngle + Math.PI / 2) * offset, 0, z + Math.sin(canalAngle + Math.PI / 2) * offset],
      scale: 0.8 + rand() * 0.4,
      speed: 0.3 + rand() * 0.2
    });
  }

  // Washing stones along canal banks
  const washingStones: Array<[number, number, number]> = [];
  for (let w = 0; w < 6; w++) {
    const t = rand();
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (mainCanal.width / 2 + 0.3) * (rand() > 0.5 ? 1 : -1);
    washingStones.push([
      x + Math.cos(canalAngle + Math.PI / 2) * offset + jitter(0.5),
      0.05,
      z + Math.sin(canalAngle + Math.PI / 2) * offset + jitter(0.5)
    ]);
  }

  // Willow trees along the water
  const willowTrees: Array<{ pos: [number, number, number]; scale: number; lean: number }> = [];
  for (let w = 0; w < 8; w++) {
    const t = rand();
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (mainCanal.width / 2 + 3 + rand() * 4) * (rand() > 0.5 ? 1 : -1);
    willowTrees.push({
      pos: [x + Math.cos(canalAngle + Math.PI / 2) * offset, 0, z + Math.sin(canalAngle + Math.PI / 2) * offset],
      scale: 0.7 + rand() * 0.5,
      lean: (rand() - 0.5) * 0.15 // Lean toward water
    });
  }

  // Reed clusters in shallow water
  const reedClusters: Array<{ pos: [number, number, number]; count: number }> = [];
  for (let r = 0; r < 12; r++) {
    const t = rand();
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (mainCanal.width / 2 - 0.5) * (rand() > 0.5 ? 1 : -1);
    reedClusters.push({
      pos: [x + Math.cos(canalAngle + Math.PI / 2) * offset + jitter(1), 0.05, z + Math.sin(canalAngle + Math.PI / 2) * offset + jitter(1)],
      count: 5 + Math.floor(rand() * 8)
    });
  }

  // Lily pads floating on water
  const lilyPads: Array<{ pos: [number, number, number]; scale: number }> = [];
  for (let l = 0; l < 20; l++) {
    const t = rand();
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (rand() - 0.5) * (mainCanal.width - 1);
    lilyPads.push({
      pos: [x + Math.cos(canalAngle + Math.PI / 2) * offset + jitter(0.5), 0.17, z + Math.sin(canalAngle + Math.PI / 2) * offset + jitter(0.5)],
      scale: 0.15 + rand() * 0.2
    });
  }

  // Qanat openings (underground water system access)
  const qanatOpenings: Array<[number, number, number]> = [];
  for (let q = 0; q < 3; q++) {
    qanatOpenings.push([
      -30 + rand() * 60,
      0,
      -30 + rand() * 60
    ]);
  }

  // Stone benches for resting
  const stoneBenches: Array<{ pos: [number, number, number]; rotation: number }> = [];
  for (let s = 0; s < 4; s++) {
    const t = 0.2 + rand() * 0.6;
    const x = mainCanal.start[0] + t * (mainCanal.end[0] - mainCanal.start[0]);
    const z = mainCanal.start[1] + t * (mainCanal.end[1] - mainCanal.start[1]);
    const offset = (mainCanal.width / 2 + 2 + rand() * 3) * (rand() > 0.5 ? 1 : -1);
    stoneBenches.push({
      pos: [x + Math.cos(canalAngle + Math.PI / 2) * offset, 0, z + Math.sin(canalAngle + Math.PI / 2) * offset],
      rotation: canalAngle + jitter(0.3)
    });
  }

  return {
    mainCanal,
    branchCanals,
    bridges,
    norias,
    washingStones,
    willowTrees,
    reedClusters,
    lilyPads,
    qanatOpenings,
    stoneBenches
  };
};

// Stone-lined canal component
const Canal: React.FC<{
  start: [number, number];
  end: [number, number];
  width: number;
  seed: number;
}> = ({ start, end, width, seed }) => {
  const length = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[1] + end[1]) / 2;

  const rand = (offset: number) => seededRandom(seed + offset);
  const stoneColor = STONE_COLORS[Math.floor(rand(1) * STONE_COLORS.length)];

  // Canal dimensions - water sits in a raised stone channel
  const wallHeight = 0.6;
  const waterLevel = 0.15; // Water surface height above ground

  return (
    <group position={[midX, 0, midZ]} rotation={[0, -angle, 0]}>
      {/* Water surface - raised and visible */}
      <mesh position={[0, waterLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, width - 0.8]} />
        <meshStandardMaterial
          color={WATER_COLOR}
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0.3}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Water depth layer (darker underneath) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, width - 0.8]} />
        <meshStandardMaterial color="#1a3a4a" roughness={0.9} transparent opacity={0.7} />
      </mesh>

      {/* Left stone wall */}
      <mesh position={[0, wallHeight / 2, -width / 2 + 0.2]}>
        <boxGeometry args={[length, wallHeight, 0.5]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Right stone wall */}
      <mesh position={[0, wallHeight / 2, width / 2 - 0.2]}>
        <boxGeometry args={[length, wallHeight, 0.5]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Stone cap on left wall */}
      <mesh position={[0, wallHeight + 0.04, -width / 2 + 0.2]}>
        <boxGeometry args={[length, 0.1, 0.6]} />
        <meshStandardMaterial color="#9a9585" roughness={0.7} />
      </mesh>

      {/* Stone cap on right wall */}
      <mesh position={[0, wallHeight + 0.04, width / 2 - 0.2]}>
        <boxGeometry args={[length, 0.1, 0.6]} />
        <meshStandardMaterial color="#9a9585" roughness={0.7} />
      </mesh>
    </group>
  );
};

// Water wheel (noria) component - traditional Damascus water wheel
const Noria: React.FC<{
  position: [number, number, number];
  scale: number;
  speed: number;
  seed: number;
}> = ({ position, scale, speed, seed }) => {
  const wheelRef = useRef<THREE.Group>(null);

  // Rotate the wheel around its axle (Z axis in local space after orientation)
  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.y -= delta * speed;
    }
  });

  const wheelRadius = 2.5 * scale;
  const spokeCount = 8;

  return (
    <HoverableGroup position={position} hoverLabel="Noria (Water Wheel)">
      {/* Support posts */}
      <mesh position={[0, wheelRadius * 0.5, -0.4]}>
        <boxGeometry args={[0.3, wheelRadius * 1.2, 0.3]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, wheelRadius * 0.5, 0.4]}>
        <boxGeometry args={[0.3, wheelRadius * 1.2, 0.3]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      {/* Cross beam */}
      <mesh position={[0, wheelRadius * 1.1, 0]}>
        <boxGeometry args={[0.35, 0.2, 1.0]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.85} />
      </mesh>

      {/* Wheel assembly - all rotating parts go inside this group */}
      {/* Position at wheel center, NO initial rotation on the ref group */}
      <group position={[0, wheelRadius * 0.85, 0]}>
        {/* This group rotates - contains all wheel elements */}
        <group ref={wheelRef}>
          {/* Main wheel rim - a torus (ring shape) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[wheelRadius, 0.15, 8, 24]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.85} />
          </mesh>

          {/* Inner rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[wheelRadius * 0.3, 0.1, 6, 16]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
          </mesh>

          {/* Spokes connecting inner to outer rim */}
          {Array.from({ length: spokeCount }).map((_, i) => {
            const angle = (i / spokeCount) * Math.PI * 2;
            const spokeLength = wheelRadius * 0.65;
            return (
              <mesh
                key={`spoke-${i}`}
                position={[
                  Math.cos(angle) * (wheelRadius * 0.3 + spokeLength / 2),
                  0,
                  Math.sin(angle) * (wheelRadius * 0.3 + spokeLength / 2)
                ]}
                rotation={[Math.PI / 2, 0, angle + Math.PI / 2]}
              >
                <boxGeometry args={[spokeLength, 0.1, 0.08]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </mesh>
            );
          })}

          {/* Bucket attachments around the rim */}
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            return (
              <mesh
                key={`bucket-${i}`}
                position={[
                  Math.cos(angle) * (wheelRadius - 0.1),
                  0.15,
                  Math.sin(angle) * (wheelRadius - 0.1)
                ]}
              >
                <boxGeometry args={[0.25, 0.2, 0.25]} />
                <meshStandardMaterial color="#7a6a5a" roughness={0.8} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* Water trough (static) */}
      <mesh position={[1.8 * scale, wheelRadius * 0.6, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[2.5 * scale, 0.12, 0.4]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.85} />
      </mesh>
    </HoverableGroup>
  );
};

// Willow tree component
const WillowTree: React.FC<{
  position: [number, number, number];
  scale: number;
  lean: number;
  seed: number;
}> = ({ position, scale, lean, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const trunkHeight = 3 * scale;
  const canopyRadius = 2.5 * scale;

  // Drooping branches
  const branchCount = 12;
  const branches = useMemo(() => {
    return Array.from({ length: branchCount }).map((_, i) => {
      const angle = (i / branchCount) * Math.PI * 2 + rand(i) * 0.3;
      const length = 2 + rand(i + 10) * 1.5;
      const droop = 0.4 + rand(i + 20) * 0.3;
      return { angle, length: length * scale, droop };
    });
  }, [seed, scale]);

  return (
    <group position={position} rotation={[lean, rand(100) * Math.PI * 2, 0]}>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.15 * scale, 0.25 * scale, trunkHeight, 8]} />
        <meshStandardMaterial color={WILLOW_TRUNK} roughness={0.9} />
      </mesh>

      {/* Main canopy */}
      <mesh position={[0, trunkHeight + canopyRadius * 0.3, 0]}>
        <sphereGeometry args={[canopyRadius * 0.6, 8, 6]} />
        <meshStandardMaterial color={WILLOW_LEAVES} roughness={0.85} />
      </mesh>

      {/* Drooping branches */}
      {branches.map((branch, i) => (
        <group key={i} position={[0, trunkHeight, 0]} rotation={[0, branch.angle, 0]}>
          <mesh position={[branch.length / 2, -branch.length * branch.droop / 2, 0]} rotation={[0, 0, -branch.droop]}>
            <cylinderGeometry args={[0.02 * scale, 0.05 * scale, branch.length, 4]} />
            <meshStandardMaterial color="#3a5a2a" roughness={0.85} />
          </mesh>
          {/* Leaf cluster at end */}
          <mesh position={[branch.length * 0.9, -branch.length * branch.droop * 0.8, 0]}>
            <sphereGeometry args={[0.3 * scale, 5, 4]} />
            <meshStandardMaterial color={WILLOW_LEAVES} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Stone bridge component
const Bridge: React.FC<{
  position: [number, number, number];
  rotation: number;
  width: number;
  seed: number;
}> = ({ position, rotation, width, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const stoneColor = STONE_COLORS[Math.floor(rand(1) * STONE_COLORS.length)];

  return (
    <HoverableGroup position={position} rotation={[0, rotation, 0]} hoverLabel="Stone Bridge">
      {/* Bridge deck */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[3, 0.25, width + 1]} />
        <meshStandardMaterial color={stoneColor} roughness={0.8} />
      </mesh>

      {/* Arch underneath */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[width / 2 - 0.3, 0.3, 6, 12, Math.PI]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Side walls */}
      <mesh position={[1.3, 0.6, 0]}>
        <boxGeometry args={[0.2, 0.4, width + 1]} />
        <meshStandardMaterial color="#9a9080" roughness={0.75} />
      </mesh>
      <mesh position={[-1.3, 0.6, 0]}>
        <boxGeometry args={[0.2, 0.4, width + 1]} />
        <meshStandardMaterial color="#9a9080" roughness={0.75} />
      </mesh>
    </HoverableGroup>
  );
};

// Reed cluster component
const ReedCluster: React.FC<{
  position: [number, number, number];
  count: number;
  seed: number;
}> = ({ position, count, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);

  const reeds = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      x: (rand(i) - 0.5) * 0.8,
      z: (rand(i + 50) - 0.5) * 0.8,
      height: 0.8 + rand(i + 100) * 0.6,
      lean: (rand(i + 150) - 0.5) * 0.2
    }));
  }, [count, seed]);

  return (
    <group position={position}>
      {reeds.map((reed, i) => (
        <mesh
          key={i}
          position={[reed.x, reed.height / 2, reed.z]}
          rotation={[reed.lean, rand(i + 200) * Math.PI, 0]}
        >
          <cylinderGeometry args={[0.015, 0.025, reed.height, 4]} />
          <meshStandardMaterial color={REED_COLOR} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// Qanat opening (underground water access)
const QanatOpening: React.FC<{ position: [number, number, number]; seed: number }> = ({ position, seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const stoneColor = STONE_COLORS[Math.floor(rand(1) * STONE_COLORS.length)];

  return (
    <HoverableGroup position={position} hoverLabel="Qanat Opening">
      {/* Stone ring */}
      <mesh position={[0, 0.2, 0]} rotation={[0, rand(10) * Math.PI, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.4, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>
      {/* Dark opening */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.3, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>
      {/* Cap stone edge */}
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.75, 0.08, 6, 8]} />
        <meshStandardMaterial color="#9a9585" roughness={0.75} />
      </mesh>
    </HoverableGroup>
  );
};

// Main component
export const WaterwayDecor: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  // QANAWAT is the canal district, RABWE could also use this for its river features
  if (district !== 'QANAWAT') return null;

  const seed = mapX * 1000 + mapY * 100 + 777;
  const layout = useMemo(() => buildWaterwayLayout(mapX, mapY), [mapX, mapY]);

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  return (
    <group>
      {/* Main canal */}
      <Canal
        start={layout.mainCanal.start}
        end={layout.mainCanal.end}
        width={layout.mainCanal.width}
        seed={seed}
      />

      {/* Branch canals */}
      {layout.branchCanals.map((canal, i) => (
        <Canal
          key={`branch-${i}`}
          start={canal.start}
          end={canal.end}
          width={canal.width}
          seed={seed + i * 100}
        />
      ))}

      {/* Bridges */}
      {layout.bridges.map((bridge, i) => (
        <Bridge
          key={`bridge-${i}`}
          position={bridge.pos}
          rotation={bridge.rotation}
          width={bridge.width}
          seed={seed + i * 200}
        />
      ))}

      {/* Water wheels (norias) */}
      {layout.norias.map((noria, i) => (
        <Noria
          key={`noria-${i}`}
          position={noria.pos}
          scale={noria.scale}
          speed={noria.speed}
          seed={seed + i * 300}
        />
      ))}

      {/* Willow trees */}
      {layout.willowTrees.map((tree, i) => (
        <WillowTree
          key={`willow-${i}`}
          position={tree.pos}
          scale={tree.scale}
          lean={tree.lean}
          seed={seed + i * 400}
        />
      ))}

      {/* Reed clusters */}
      {layout.reedClusters.map((cluster, i) => (
        <ReedCluster
          key={`reeds-${i}`}
          position={cluster.pos}
          count={cluster.count}
          seed={seed + i * 500}
        />
      ))}

      {/* Lily pads */}
      {layout.lilyPads.map((pad, i) => (
        <mesh
          key={`lily-${i}`}
          position={pad.pos}
          rotation={[-Math.PI / 2, 0, seededRandom(seed + i * 600) * Math.PI * 2]}
        >
          <circleGeometry args={[pad.scale, 8]} />
          <meshStandardMaterial color={LILY_PAD} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Qanat openings */}
      {layout.qanatOpenings.map((pos, i) => (
        <QanatOpening key={`qanat-${i}`} position={pos} seed={seed + i * 700} />
      ))}

      {/* Washing stones */}
      {layout.washingStones.map((pos, i) => (
        <mesh key={`wash-${i}`} position={pos}>
          <boxGeometry args={[0.8, 0.15, 0.6]} />
          <meshStandardMaterial
            color={STONE_COLORS[Math.floor(seededRandom(seed + i * 800) * STONE_COLORS.length)]}
            roughness={0.75}
          />
        </mesh>
      ))}

      {/* Stone benches */}
      {layout.stoneBenches.map((bench, i) => (
        <HoverableGroup
          key={`bench-${i}`}
          position={bench.pos}
          rotation={[0, bench.rotation, 0]}
          hoverLabel="Stone Bench"
        >
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[1.5, 0.12, 0.5]} />
            <meshStandardMaterial color="#9a9080" roughness={0.75} />
          </mesh>
          <mesh position={[-0.6, 0.1, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.4]} />
            <meshStandardMaterial color="#8a8070" roughness={0.85} />
          </mesh>
          <mesh position={[0.6, 0.1, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.4]} />
            <meshStandardMaterial color="#8a8070" roughness={0.85} />
          </mesh>
        </HoverableGroup>
      ))}
    </group>
  );
};

export default WaterwayDecor;
