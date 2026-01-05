/**
 * Horizon Backdrop Component
 * Distant city silhouettes, walls, minarets, domes, trees, and mountain ring
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CONSTANTS, DistrictType } from '../../../types';
import { SANDSTONE_PALETTE } from '../constants';

// Horizon profile types based on urban density
type HorizonProfile = 'DENSE_URBAN' | 'RESIDENTIAL' | 'SUBURBAN' | 'RURAL' | 'DESERT';

interface HorizonConfig {
  buildingCount: number;
  minaretCount: number;
  domeCount: number;
  treeCount: number;
  heightRange: [number, number];
  buildingWidthRange: [number, number];
}

// Profile configurations for different district types
const HORIZON_CONFIGS: Record<HorizonProfile, HorizonConfig> = {
  DENSE_URBAN: {
    buildingCount: 80,
    minaretCount: 10,
    domeCount: 7,
    treeCount: 8,
    heightRange: [1.5, 4.0],
    buildingWidthRange: [3, 9]
  },
  RESIDENTIAL: {
    buildingCount: 60,
    minaretCount: 7,
    domeCount: 5,
    treeCount: 12,
    heightRange: [1.2, 2.5],
    buildingWidthRange: [3, 7]
  },
  SUBURBAN: {
    buildingCount: 40,
    minaretCount: 4,
    domeCount: 3,
    treeCount: 20,
    heightRange: [1.0, 2.0],
    buildingWidthRange: [3, 6]
  },
  RURAL: {
    buildingCount: 20,
    minaretCount: 2,
    domeCount: 0,
    treeCount: 30,
    heightRange: [0.8, 1.5],
    buildingWidthRange: [2, 5]
  },
  DESERT: {
    buildingCount: 32,
    minaretCount: 0,
    domeCount: 0,
    treeCount: 16,
    heightRange: [1.0, 2.2],
    buildingWidthRange: [4, 8]
  }
};

// Determine horizon profile based on district type
const getHorizonProfile = (district?: DistrictType): HorizonProfile => {
  if (!district) return 'RESIDENTIAL';

  switch (district) {
    case 'MARKET':
    case 'CIVIC':
    case 'WEALTHY':
    case 'STRAIGHT_STREET':
    case 'SOUQ_AXIS':
    case 'BAB_SHARQI':
      return 'DENSE_URBAN';

    case 'RESIDENTIAL':
    case 'ALLEYS':
    case 'JEWISH_QUARTER':
    case 'HOVELS':
    case 'CHRISTIAN_QUARTER':
    case 'MIDAN':
      return 'RESIDENTIAL';

    case 'CARAVANSERAI':
    case 'SOUTHERN_ROAD':
    case 'SALHIYYA':
      return 'SUBURBAN';

    case 'OUTSKIRTS_FARMLAND':
    case 'MOUNTAIN_SHRINE':
      return 'RURAL';

    case 'OUTSKIRTS_DESERT':
      return 'DESERT';

    default:
      return 'RESIDENTIAL';
  }
};

export const HorizonBackdrop: React.FC<{
  timeOfDay?: number;
  showCityWalls?: boolean;
  wallRadius?: number;
  district?: DistrictType;
  mapX?: number;
  mapY?: number;
}> = ({ timeOfDay, showCityWalls = true, wallRadius = 82, district, mapX = 0, mapY = 0 }) => {
  const time = timeOfDay ?? 12;
  const radiusScale = (CONSTANTS.MAP_RADIUS / 55) * 0.9;
  const scaleRadius = (radius: number) => radius * radiusScale;

  // Get horizon profile and configuration based on district
  const profile = useMemo(() => getHorizonProfile(district), [district]);
  const config = HORIZON_CONFIGS[profile];
  const isDesert = profile === 'DESERT';

  // Rotate horizon based on district coordinates for variety
  const horizonRotation = useMemo(() => {
    const seed = (mapX * 37 + mapY * 73) % 360;
    return (seed / 360) * Math.PI * 2;
  }, [mapX, mapY]);

  // Procedural variation seed for building placement
  const buildingSeed = useMemo(() => Math.abs(mapX * 127 + mapY * 251), [mapX, mapY]);

  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const twilightFactor = time >= 17 && time < 19 ? (time - 17) / 2 : time >= 5 && time < 7 ? (7 - time) / 2 : 0;
  const dayFactor = time >= 7 && time < 17 ? 1 : time >= 5 && time < 7 ? (time - 5) / 2 : time >= 17 && time < 19 ? (19 - time) / 2 : 0;

  // ATMOSPHERIC SCATTERING: Intense heat haze during day, dust at twilight, warm air at night
  const atmosphericHaze = nightFactor > 0.8 ? 0.6 : twilightFactor > 0 ? 1.5 : dayFactor * 1.2;

  // Distant silhouette colors - warm sun-bleached tones (NO BLUE TONES - this is hot Syria!)
  const silhouetteColor = isDesert
    ? (nightFactor > 0.8 ? '#1a1410' : twilightFactor > 0 ? '#5a3820' : '#9a8268')  // Night: warm charcoal, Twilight: dusty terracotta, Day: sun-bleached tan
    : (nightFactor > 0.8 ? '#1a1410' : twilightFactor > 0 ? '#3a2a1a' : '#7a5a3a'); // Night: warm charcoal, Twilight: warm umber, Day: dusty brown

  // Reduced opacity for softer, more indistinct silhouettes
  const silhouetteOpacity = (isDesert
    ? (nightFactor > 0.8 ? 0.25 : twilightFactor > 0 ? 0.35 : 0.28)
    : (nightFactor > 0.8 ? 0.3 : twilightFactor > 0 ? 0.4 : 0.32)) * (1.0 - atmosphericHaze * 0.15);

  // Wall color - sun-baked weathered sandstone
  const wallColor = isDesert
    ? (nightFactor > 0.8 ? '#2a241b' : twilightFactor > 0 ? '#8a6a3f' : '#c49a5a')
    : (nightFactor > 0.8 ? '#2a241a' : twilightFactor > 0 ? '#6a5a3a' : '#8a7a5a'); // Warmer stone tones
  const wallOpacity = showCityWalls ? 1 : 0.45;
  const wallRadiusUsed = showCityWalls ? wallRadius : wallRadius + 60;

  // Mountain ring - distant warm haze, sun-bleached peaks
  const mountainColor = isDesert
    ? (nightFactor > 0.8 ? '#1a1208' : twilightFactor > 0 ? '#4a3220' : '#b8a888')  // Night: warm dark, Twilight: dusty brown, Day: pale sandy
    : (nightFactor > 0.8 ? '#1a1208' : twilightFactor > 0 ? '#3a2818' : '#a89878'); // Night: warm dark, Twilight: warm umber, Day: dusty tan

  // Much fainter mountains for distance realism
  const mountainOpacity = (nightFactor > 0.8 ? 0.2 : twilightFactor > 0 ? 0.3 : 0.35) * (1.0 - atmosphericHaze * 0.2);

  // Atmospheric haze - intense heat shimmer and dust (MORE VISIBLE for summer)
  const hazeColor = isDesert
    ? (nightFactor > 0.8 ? '#2a2016' : twilightFactor > 0 ? '#d8aa6a' : '#f4e4c8')  // Night: warm dust, Twilight: golden dust, Day: intense sandy shimmer
    : (nightFactor > 0.8 ? '#2a2016' : twilightFactor > 0 ? '#a88a6a' : '#e8d4b8'); // Night: warm dust, Twilight: dusty amber, Day: creamy haze
  const hazeOpacity = (isDesert
    ? (nightFactor > 0.8 ? 0.12 : twilightFactor > 0 ? 0.24 : 0.20)  // Increased opacity for more heat haze
    : (nightFactor > 0.8 ? 0.14 : twilightFactor > 0 ? 0.26 : 0.22)) * (0.9 + atmosphericHaze * 0.5);

  // Instanced city buildings - SINGLE DRAW CALL (count from profile config)
  const buildingInstancesRef = useRef<THREE.InstancedMesh>(null);
  const buildingCount = config.buildingCount;

  const wallTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const baseColor = SANDSTONE_PALETTE[2] ?? '#c7b08a';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockWidth = 64;
    const blockHeight = 32;
    ctx.strokeStyle = 'rgba(120, 95, 65, 0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y < canvas.height; y += blockHeight) {
      const offset = (y / blockHeight) % 2 === 0 ? 0 : blockWidth / 2;
      for (let x = -blockWidth / 2 + offset; x < canvas.width; x += blockWidth) {
        ctx.strokeRect(x, y, blockWidth, blockHeight);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }, [buildingCount, isDesert]);

  React.useEffect(() => {
    if (!buildingInstancesRef.current) return;

    const tempObj = new THREE.Object3D();
    const baseRadius = scaleRadius(isDesert ? 120 : 105); // Pushed farther out

    for (let i = 0; i < buildingCount; i++) {
      // Add procedural variation to angle based on district seed
      const angleOffset = ((buildingSeed + i * 7) % 100) / 100 * 0.1; // Small random offset
      const angle = (i / buildingCount) * Math.PI * 2 + angleOffset;
      const radiusVariation = scaleRadius(((i * 7 + buildingSeed) % 5) * 3);
      const radius = baseRadius + radiusVariation;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Use profile config for height range
      const [minHeight, maxHeight] = config.heightRange;
      const heightVariation = maxHeight - minHeight;
      const height = minHeight + ((i * 11 + buildingSeed) % (heightVariation * 10)) / 10;

      // Use profile config for width range
      const [minWidth, maxWidth] = config.buildingWidthRange;
      const widthRange = maxWidth - minWidth;
      const width = minWidth + ((i * 13 + buildingSeed) % widthRange);
      const depth = minWidth + ((i * 17 + buildingSeed) % widthRange);

      tempObj.position.set(x, height / 2, z);
      tempObj.scale.set(width, height, depth);
      tempObj.rotation.y = angle + Math.PI / 2;
      tempObj.updateMatrix();
      buildingInstancesRef.current.setMatrixAt(i, tempObj.matrix);
    }

    buildingInstancesRef.current.instanceMatrix.needsUpdate = true;
  }, [buildingCount, buildingSeed, config, isDesert]);

  // Determine which wall segments to show based on map position
  const wallSegments = useMemo(() => {
    const seed = mapX * 31 + mapY * 67;
    // Randomly select 1-2 straight wall segments
    const segments: Array<'north' | 'south' | 'east' | 'west'> = [];
    const roll1 = (seed % 4);
    const roll2 = ((seed * 7) % 4);

    if (roll1 === 0) segments.push('north');
    else if (roll1 === 1) segments.push('south');
    else if (roll1 === 2) segments.push('east');
    else segments.push('west');

    // 40% chance of second wall segment
    if ((seed % 10) > 5 && roll2 !== roll1) {
      if (roll2 === 0) segments.push('north');
      else if (roll2 === 1) segments.push('south');
      else if (roll2 === 2) segments.push('east');
      else segments.push('west');
    }
    return segments;
  }, [mapX, mapY]);

  return (
    <>
      {/* ============================================ */}
      {/* NEAR LAYER: City Walls with Gate Towers */}
      {/* ============================================ */}
      {showCityWalls && (
        <group>
          {wallSegments.map((dir) => {
            const radius = wallRadiusUsed;
            const wallLength = radius * 1.6;
            const wallHeight = 8;
            const towerHeight = 12;
            const towerWidth = 6;

            let position: [number, number, number];
            let rotation: number;
            let gatePosition: [number, number, number];

            switch (dir) {
              case 'north':
                position = [0, wallHeight / 2, -radius];
                gatePosition = [0, 0, -radius];
                rotation = 0;
                break;
              case 'south':
                position = [0, wallHeight / 2, radius];
                gatePosition = [0, 0, radius];
                rotation = 0;
                break;
              case 'east':
                position = [radius, wallHeight / 2, 0];
                gatePosition = [radius, 0, 0];
                rotation = Math.PI / 2;
                break;
              case 'west':
                position = [-radius, wallHeight / 2, 0];
                gatePosition = [-radius, 0, 0];
                rotation = Math.PI / 2;
                break;
            }

            // Gate names based on historical Damascus gates
            const gateNames: Record<string, string> = {
              north: 'Bab al-Faradis', // Gate of Paradise
              south: 'Bab al-Saghir', // Small Gate
              east: 'Bab Sharqi', // Eastern Gate
              west: 'Bab al-Jabiya' // Gate of the Water Trough
            };

            return (
              <group key={`wall-segment-${dir}`}>
                {/* Main wall segment */}
                <mesh position={position} rotation={[0, rotation, 0]} castShadow={false}>
                  <boxGeometry args={[wallLength, wallHeight, 2.5]} />
                  <meshStandardMaterial map={wallTexture ?? undefined} color={wallColor} roughness={0.92} />
                </mesh>

                {/* Gate Tower - Central */}
                <group position={gatePosition} rotation={[0, rotation, 0]}>
                  {/* Main tower body */}
                  <mesh position={[0, towerHeight / 2, 0]} castShadow={false}>
                    <boxGeometry args={[towerWidth, towerHeight, 4]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                  </mesh>
                  {/* Tower crenellations */}
                  {[-2, -1, 0, 1, 2].map((i) => (
                    <mesh key={`crenel-${i}`} position={[i * 1.1, towerHeight + 0.6, 0]} castShadow={false}>
                      <boxGeometry args={[0.8, 1.2, 4.2]} />
                      <meshStandardMaterial color={wallColor} roughness={0.9} />
                    </mesh>
                  ))}
                  {/* Arched gate opening (dark void) */}
                  <mesh position={[0, 3.5, 2.1]} castShadow={false}>
                    <boxGeometry args={[3, 7, 0.5]} />
                    <meshStandardMaterial color="#1a1510" roughness={1} />
                  </mesh>
                  {/* Arch top */}
                  <mesh position={[0, 7.2, 2.1]} rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
                    <cylinderGeometry args={[1.5, 1.5, 0.5, 12, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color="#1a1510" roughness={1} />
                  </mesh>
                </group>

                {/* Flanking towers - Left */}
                <group position={gatePosition} rotation={[0, rotation, 0]}>
                  <mesh position={[-wallLength * 0.35, (towerHeight - 2) / 2, 0]} castShadow={false}>
                    <boxGeometry args={[4, towerHeight - 2, 3.5]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                  </mesh>
                  {/* Left tower crenellations */}
                  {[-1, 0, 1].map((i) => (
                    <mesh key={`crenel-l-${i}`} position={[-wallLength * 0.35 + i * 1.2, towerHeight - 2 + 0.5, 0]} castShadow={false}>
                      <boxGeometry args={[0.7, 1, 3.7]} />
                      <meshStandardMaterial color={wallColor} roughness={0.9} />
                    </mesh>
                  ))}
                </group>

                {/* Flanking towers - Right */}
                <group position={gatePosition} rotation={[0, rotation, 0]}>
                  <mesh position={[wallLength * 0.35, (towerHeight - 2) / 2, 0]} castShadow={false}>
                    <boxGeometry args={[4, towerHeight - 2, 3.5]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                  </mesh>
                  {/* Right tower crenellations */}
                  {[-1, 0, 1].map((i) => (
                    <mesh key={`crenel-r-${i}`} position={[wallLength * 0.35 + i * 1.2, towerHeight - 2 + 0.5, 0]} castShadow={false}>
                      <boxGeometry args={[0.7, 1, 3.7]} />
                      <meshStandardMaterial color={wallColor} roughness={0.9} />
                    </mesh>
                  ))}
                </group>
              </group>
            );
          })}
        </group>
      )}

      {/* ============================================ */}
      {/* NEAR LAYER: Date Palms & Cypress Trees */}
      {/* Closer vegetation with more detail */}
      {/* ============================================ */}
      {!isDesert && (() => {
        const nearPalmCount = 12;
        const nearCypressCount = 8;
        const nearRadius = scaleRadius(85);

        return (
          <group>
            {/* Date Palms - iconic to Damascus, near layer */}
            {Array.from({ length: nearPalmCount }).map((_, i) => {
              const angle = (i / nearPalmCount) * Math.PI * 2 + ((buildingSeed + i * 23) % 100) / 100 * 0.3;
              const radius = nearRadius + ((i * 11 + buildingSeed) % 8);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const trunkHeight = 5 + ((i * 7 + buildingSeed) % 15) / 5;
              const palmOpacity = silhouetteOpacity * 0.85;

              return (
                <group key={`near-palm-${i}`} position={[x, 0, z]}>
                  {/* Trunk - segmented appearance */}
                  <mesh position={[0, trunkHeight / 2, 0]} castShadow={false}>
                    <cylinderGeometry args={[0.25, 0.35, trunkHeight, 6]} />
                    <meshStandardMaterial color={silhouetteColor} transparent opacity={palmOpacity} roughness={1} depthWrite={false} />
                  </mesh>
                  {/* Frond crown - radiating fronds */}
                  {Array.from({ length: 8 }).map((_, fi) => {
                    const frondAngle = (fi / 8) * Math.PI * 2;
                    const droop = 0.4 + (fi % 2) * 0.2;
                    return (
                      <mesh
                        key={`frond-${fi}`}
                        position={[
                          Math.cos(frondAngle) * 0.8,
                          trunkHeight - droop,
                          Math.sin(frondAngle) * 0.8
                        ]}
                        rotation={[droop, frondAngle, 0]}
                        castShadow={false}
                      >
                        <boxGeometry args={[0.15, 0.05, 2.5]} />
                        <meshStandardMaterial color={silhouetteColor} transparent opacity={palmOpacity * 0.9} roughness={1} depthWrite={false} />
                      </mesh>
                    );
                  })}
                </group>
              );
            })}

            {/* Cypress Trees - tall, narrow, common in Islamic gardens */}
            {Array.from({ length: nearCypressCount }).map((_, i) => {
              const angle = (i / nearCypressCount) * Math.PI * 2 + 0.2 + ((buildingSeed + i * 29) % 100) / 100 * 0.25;
              const radius = nearRadius + 5 + ((i * 13 + buildingSeed) % 6);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const height = 6 + ((i * 5 + buildingSeed) % 12) / 4;
              const cypressOpacity = silhouetteOpacity * 0.8;

              return (
                <group key={`near-cypress-${i}`} position={[x, 0, z]}>
                  {/* Cypress - tall conical shape */}
                  <mesh position={[0, height / 2, 0]} castShadow={false}>
                    <coneGeometry args={[0.8, height, 6]} />
                    <meshStandardMaterial color={silhouetteColor} transparent opacity={cypressOpacity} roughness={1} depthWrite={false} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })()}

      {/* ============================================ */}
      {/* ICONIC DAMASCUS LANDMARKS */}
      {/* Fixed positions, hidden when player is in that district */}
      {/* ============================================ */}

      {/* UMAYYAD MOSQUE - The most iconic landmark of Damascus */}
      {/* Visible from all districts EXCEPT CIVIC and MARKET (where it's located) */}
      {district !== 'CIVIC' && district !== 'MARKET' && !isDesert && (
        <group position={[scaleRadius(-60), 0, scaleRadius(-95)]}>
          {/* Main prayer hall - long rectangular building */}
          <mesh position={[0, 4, 0]} castShadow={false}>
            <boxGeometry args={[18, 8, 10]} />
            <meshStandardMaterial
              color={silhouetteColor}
              transparent
              opacity={silhouetteOpacity * 1.1}
              roughness={1}
              depthWrite={false}
            />
          </mesh>
          {/* The great dome (Dome of the Eagle) */}
          <mesh position={[0, 10, 0]} castShadow={false}>
            <sphereGeometry args={[5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={silhouetteColor}
              transparent
              opacity={silhouetteOpacity * 1.15}
              roughness={1}
              depthWrite={false}
              emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
              emissiveIntensity={twilightFactor * 0.2}
            />
          </mesh>
          {/* Dome drum (cylindrical base) */}
          <mesh position={[0, 8.5, 0]} castShadow={false}>
            <cylinderGeometry args={[5, 5, 3, 12]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity} roughness={1} depthWrite={false} />
          </mesh>
          {/* Minaret of the Bride (tallest, northeast) */}
          <group position={[12, 0, -6]}>
            <mesh position={[0, 10, 0]} castShadow={false}>
              <cylinderGeometry args={[1.2, 1.5, 20, 8]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 1.1} roughness={1} depthWrite={false} />
            </mesh>
            {/* Balcony */}
            <mesh position={[0, 16, 0]} castShadow={false}>
              <cylinderGeometry args={[1.8, 1.8, 1, 8]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity} roughness={1} depthWrite={false} />
            </mesh>
            {/* Spire top */}
            <mesh position={[0, 21, 0]} castShadow={false}>
              <coneGeometry args={[0.8, 3, 6]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 1.1} roughness={1} depthWrite={false} />
            </mesh>
          </group>
          {/* Minaret of Jesus (southwest) */}
          <group position={[-10, 0, 6]}>
            <mesh position={[0, 8, 0]} castShadow={false}>
              <cylinderGeometry args={[1, 1.3, 16, 8]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity} roughness={1} depthWrite={false} />
            </mesh>
            <mesh position={[0, 17, 0]} castShadow={false}>
              <coneGeometry args={[0.7, 2.5, 6]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity} roughness={1} depthWrite={false} />
            </mesh>
          </group>
          {/* Courtyard colonnade suggestion */}
          <mesh position={[0, 2, 8]} castShadow={false}>
            <boxGeometry args={[16, 4, 2]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.8} roughness={1} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* THE CITADEL OF DAMASCUS - Massive fortress northwest of old city */}
      {/* Visible from all districts EXCEPT CIVIC (where it's adjacent) */}
      {district !== 'CIVIC' && !isDesert && (
        <group position={[scaleRadius(-85), 0, scaleRadius(-70)]}>
          {/* Main fortress walls - massive rectangular */}
          <mesh position={[0, 6, 0]} castShadow={false}>
            <boxGeometry args={[22, 12, 18]} />
            <meshStandardMaterial
              color={silhouetteColor}
              transparent
              opacity={silhouetteOpacity * 1.05}
              roughness={1}
              depthWrite={false}
            />
          </mesh>
          {/* Corner towers */}
          {[[-10, -8], [10, -8], [-10, 8], [10, 8]].map(([x, z], i) => (
            <mesh key={`citadel-tower-${i}`} position={[x, 8, z]} castShadow={false}>
              <cylinderGeometry args={[3, 3.5, 16, 8]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 1.1} roughness={1} depthWrite={false} />
            </mesh>
          ))}
          {/* Main keep/donjon - taller central structure */}
          <mesh position={[0, 10, 0]} castShadow={false}>
            <boxGeometry args={[10, 8, 8]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 1.1} roughness={1} depthWrite={false} />
          </mesh>
          {/* Crenellations along top */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={`citadel-crenel-${i}`} position={[-9 + i * 2.5, 12.5, -9]} castShadow={false}>
              <boxGeometry args={[1.5, 1.5, 1]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.9} roughness={1} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* BIMARISTAN NURI - Nur ad-Din's Hospital, famous medieval institution */}
      {/* Visible from all districts EXCEPT RESIDENTIAL (where it's located) */}
      {district !== 'RESIDENTIAL' && district !== 'ALLEYS' && !isDesert && (
        <group position={[scaleRadius(70), 0, scaleRadius(-80)]}>
          {/* Main building complex */}
          <mesh position={[0, 3.5, 0]} castShadow={false}>
            <boxGeometry args={[12, 7, 10]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
          </mesh>
          {/* Central dome */}
          <mesh position={[0, 8.5, 0]} castShadow={false}>
            <sphereGeometry args={[3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity} roughness={1} depthWrite={false} />
          </mesh>
          {/* Entrance portal - muqarnas suggestion */}
          <mesh position={[0, 4, 5.5]} castShadow={false}>
            <boxGeometry args={[4, 8, 1.5]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 1.05} roughness={1} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* MADRASA AL-ADILIYYA - Major religious school */}
      {/* Visible except from STRAIGHT_STREET area */}
      {district !== 'STRAIGHT_STREET' && district !== 'SOUQ_AXIS' && !isDesert && (
        <group position={[scaleRadius(40), 0, scaleRadius(-100)]}>
          {/* Main building */}
          <mesh position={[0, 3, 0]} castShadow={false}>
            <boxGeometry args={[9, 6, 8]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.9} roughness={1} depthWrite={false} />
          </mesh>
          {/* Dome */}
          <mesh position={[0, 7, 0]} castShadow={false}>
            <sphereGeometry args={[2.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
          </mesh>
          {/* Small minaret */}
          <group position={[5, 0, -4]}>
            <mesh position={[0, 5, 0]} castShadow={false}>
              <cylinderGeometry args={[0.6, 0.8, 10, 6]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
            </mesh>
            <mesh position={[0, 10.5, 0]} castShadow={false}>
              <coneGeometry args={[0.5, 2, 6]} />
              <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
            </mesh>
          </group>
        </group>
      )}

      {/* BAB TOUMA CHURCH TOWER - In the Christian Quarter */}
      {/* Visible except from CHRISTIAN_QUARTER */}
      {district !== 'CHRISTIAN_QUARTER' && !isDesert && (
        <group position={[scaleRadius(90), 0, scaleRadius(-50)]}>
          {/* Church building */}
          <mesh position={[0, 3.5, 0]} castShadow={false}>
            <boxGeometry args={[8, 7, 12]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.9} roughness={1} depthWrite={false} />
          </mesh>
          {/* Bell tower */}
          <mesh position={[0, 9, -5]} castShadow={false}>
            <boxGeometry args={[3, 12, 3]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
          </mesh>
          {/* Tower cap */}
          <mesh position={[0, 15.5, -5]} castShadow={false}>
            <coneGeometry args={[2, 3, 4]} />
            <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.95} roughness={1} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* HAMMAM (Public Bath) domes cluster - Southern area */}
      {/* Visible except from MIDAN */}
      {district !== 'MIDAN' && district !== 'SOUTHERN_ROAD' && !isDesert && (
        <group position={[scaleRadius(-30), 0, scaleRadius(90)]}>
          {/* Multiple small domes characteristic of hammams */}
          {[[-3, 0], [3, 0], [0, 4], [-3, 8], [3, 8]].map(([x, z], i) => (
            <group key={`hammam-dome-${i}`} position={[x, 0, z]}>
              <mesh position={[0, 2, 0]} castShadow={false}>
                <cylinderGeometry args={[2, 2.2, 4, 8]} />
                <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.85} roughness={1} depthWrite={false} />
              </mesh>
              <mesh position={[0, 4.5, 0]} castShadow={false}>
                <sphereGeometry args={[2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={silhouetteColor} transparent opacity={silhouetteOpacity * 0.9} roughness={1} depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ROTATED HORIZON ELEMENTS - distant city, minarets, etc. */}
      <group rotation={[0, horizonRotation, 0]}>
        {/* INSTANCED DISTANT CITY - Single draw call for buildings at horizon */}
        <instancedMesh ref={buildingInstancesRef} args={[undefined, undefined, buildingCount]} castShadow={false} receiveShadow={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={silhouetteColor}
            roughness={1}
            transparent
            opacity={silhouetteOpacity}
            depthWrite={false}
            emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
            emissiveIntensity={twilightFactor * 0.15}
          />
        </instancedMesh>

      {/* DISTANT HORIZON SILHOUETTES - Far away, unreachable */}
      {/* PERFORMANCE OPTIMIZED: Using instanced meshes instead of individual meshes (46 → 6 draw calls) */}

      {/* Distant minarets scattered on horizon - INSTANCED */}
      {config.minaretCount > 0 && (() => {
        const minaretInstancesRef = useRef<THREE.InstancedMesh>(null);

        React.useEffect(() => {
          if (!minaretInstancesRef.current) return;
          const tempObj = new THREE.Object3D();

          for (let i = 0; i < config.minaretCount; i++) {
            // Distribute minarets around horizon with procedural variation
            const angleOffset = ((buildingSeed + i * 31) % 100) / 100 * 0.3;
            const angle = (i / config.minaretCount) * Math.PI * 2 + angleOffset;
            const radius = scaleRadius(145 + ((i * 13 + buildingSeed) % 15));
            const height = 4.0 + ((i * 7 + buildingSeed) % 20) / 10; // 4.0-6.0 units

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            tempObj.position.set(x, height / 2, z);
            tempObj.scale.set(0.6, height / 5, 0.6); // Slender, realistic proportions
            tempObj.updateMatrix();
            minaretInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          }
          minaretInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={minaretInstancesRef} args={[undefined, undefined, config.minaretCount]} castShadow={false}>
            <cylinderGeometry args={[0.5, 0.6, 5, 6]} />
            <meshStandardMaterial
              color={silhouetteColor}
              roughness={1}
              transparent
              opacity={silhouetteOpacity * 0.95}
              depthWrite={false}
              emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
              emissiveIntensity={twilightFactor * 0.12}
            />
          </instancedMesh>
        );
      })()}

      {/* Distant dome clusters - INSTANCED (bases and caps separate) */}
      {config.domeCount > 0 && (() => {
        const domeBasesRef = useRef<THREE.InstancedMesh>(null);
        const domeCapsRef = useRef<THREE.InstancedMesh>(null);

        React.useEffect(() => {
          if (!domeBasesRef.current || !domeCapsRef.current) return;
          const tempObj = new THREE.Object3D();

          for (let i = 0; i < config.domeCount; i++) {
            // Distribute domes around horizon with procedural variation
            const angleOffset = ((buildingSeed + i * 43) % 100) / 100 * 0.4;
            const angle = (i / config.domeCount) * Math.PI * 2 + angleOffset;
            const radius = scaleRadius(142 + ((i * 17 + buildingSeed) % 16));

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Base cylinder
            tempObj.position.set(x, 2, z);
            tempObj.scale.set(1, 0.5, 1); // Shorter base
            tempObj.updateMatrix();
            domeBasesRef.current.setMatrixAt(i, tempObj.matrix);

            // Dome cap
            tempObj.position.set(x, 4.5, z); // Lower position
            tempObj.updateMatrix();
            domeCapsRef.current.setMatrixAt(i, tempObj.matrix);
          }
          domeBasesRef.current.instanceMatrix.needsUpdate = true;
          domeCapsRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <>
            <instancedMesh ref={domeBasesRef} args={[undefined, undefined, config.domeCount]} castShadow={false}>
              <cylinderGeometry args={[2.5, 2.5, 4, 8]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.92}
                depthWrite={false}
                emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
                emissiveIntensity={twilightFactor * 0.18}
              />
            </instancedMesh>
            <instancedMesh ref={domeCapsRef} args={[undefined, undefined, config.domeCount]} castShadow={false}>
              <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.92}
                depthWrite={false}
                emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
                emissiveIntensity={twilightFactor * 0.18}
              />
            </instancedMesh>
          </>
        );
      })()}

      {/* ============================================ */}
      {/* MID LAYER: Ghouta Orchard Groves */}
      {/* The famous gardens surrounding Damascus */}
      {/* ============================================ */}
      {!isDesert && (() => {
        // Orchard clusters at mid-distance - representing the Ghouta
        const orchardClusters = 6;
        const treesPerCluster = 8;
        const midRadius = scaleRadius(115);
        const orchardOpacity = silhouetteOpacity * 0.6; // More faded at distance

        return (
          <group>
            {Array.from({ length: orchardClusters }).map((_, ci) => {
              const clusterAngle = (ci / orchardClusters) * Math.PI * 2 + ((buildingSeed + ci * 41) % 100) / 100 * 0.4;
              const clusterRadius = midRadius + ((ci * 17 + buildingSeed) % 12);
              const clusterX = Math.cos(clusterAngle) * clusterRadius;
              const clusterZ = Math.sin(clusterAngle) * clusterRadius;

              return (
                <group key={`orchard-${ci}`} position={[clusterX, 0, clusterZ]}>
                  {/* Orchard ground mass - suggests dense grove */}
                  <mesh position={[0, 1.2, 0]} castShadow={false}>
                    <sphereGeometry args={[4, 8, 6]} />
                    <meshStandardMaterial
                      color={silhouetteColor}
                      transparent
                      opacity={orchardOpacity * 0.5}
                      roughness={1}
                      depthWrite={false}
                    />
                  </mesh>
                  {/* Individual trees poking above the mass */}
                  {Array.from({ length: treesPerCluster }).map((_, ti) => {
                    const treeAngle = (ti / treesPerCluster) * Math.PI * 2;
                    const treeRadius = 2 + ((ti * 7 + buildingSeed) % 3);
                    const tx = Math.cos(treeAngle) * treeRadius;
                    const tz = Math.sin(treeAngle) * treeRadius;
                    const treeHeight = 2.5 + ((ti * 5 + buildingSeed) % 8) / 4;

                    return (
                      <mesh
                        key={`orchard-tree-${ti}`}
                        position={[tx, treeHeight / 2 + 1, tz]}
                        castShadow={false}
                      >
                        <sphereGeometry args={[0.8, 5, 4]} />
                        <meshStandardMaterial
                          color={silhouetteColor}
                          transparent
                          opacity={orchardOpacity * 0.7}
                          roughness={1}
                          depthWrite={false}
                        />
                      </mesh>
                    );
                  })}
                </group>
              );
            })}

            {/* Additional mid-layer palms scattered between orchards */}
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2 + 0.15 + ((buildingSeed + i * 37) % 100) / 100 * 0.3;
              const radius = midRadius - 5 + ((i * 11 + buildingSeed) % 15);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const height = 4 + ((i * 7 + buildingSeed) % 10) / 5;

              return (
                <group key={`mid-palm-${i}`} position={[x, 0, z]}>
                  {/* Simplified palm silhouette for mid-distance */}
                  <mesh position={[0, height / 2, 0]} castShadow={false}>
                    <cylinderGeometry args={[0.15, 0.2, height, 4]} />
                    <meshStandardMaterial color={silhouetteColor} transparent opacity={orchardOpacity} roughness={1} depthWrite={false} />
                  </mesh>
                  <mesh position={[0, height, 0]} castShadow={false}>
                    <sphereGeometry args={[1.2, 6, 4]} />
                    <meshStandardMaterial color={silhouetteColor} transparent opacity={orchardOpacity * 0.8} roughness={1} depthWrite={false} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })()}

      {/* ============================================ */}
      {/* FAR LAYER: Distant tree silhouettes */}
      {/* Very faded, atmospheric perspective */}
      {/* ============================================ */}
      {(() => {
        const count = config.treeCount;
        const trunksRef = useRef<THREE.InstancedMesh>(null);
        const canopiesRef = useRef<THREE.InstancedMesh>(null);
        const farOpacity = silhouetteOpacity * 0.5; // Much more faded

        React.useEffect(() => {
          if (!trunksRef.current || !canopiesRef.current) return;
          const tempObj = new THREE.Object3D();

          for (let i = 0; i < count; i++) {
            // Add procedural variation to angle
            const angleOffset = ((buildingSeed + i * 19) % 100) / 100 * 0.2;
            const angle = (i / count) * Math.PI * 2 + angleOffset;
            const radius = scaleRadius((isDesert ? 155 : 145) + ((i * 7 + buildingSeed) % 4) * 4);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            // Realistic distant tree heights - much shorter
            const height = (isDesert ? 1.5 : 2.0) + ((i * 5 + buildingSeed) % (isDesert ? 4 : 5)) * 0.2;

            // Trunk - proportionally scaled
            const trunkScale = height / (isDesert ? 2.0 : 2.5);
            tempObj.position.set(x, height / 2, z);
            tempObj.scale.set(trunkScale * 0.8, trunkScale, trunkScale * 0.8);
            tempObj.updateMatrix();
            trunksRef.current.setMatrixAt(i, tempObj.matrix);

            // Canopy - wider and flatter for distant perspective
            const canopyScale = 0.7 + ((i * 3 + buildingSeed) % 5) * 0.15;
            tempObj.position.set(x, height + (isDesert ? 0.4 : 0.6), z);
            tempObj.scale.set(canopyScale * 1.2, canopyScale * 0.8, canopyScale * 1.2);
            tempObj.updateMatrix();
            canopiesRef.current.setMatrixAt(i, tempObj.matrix);
          }

          trunksRef.current.instanceMatrix.needsUpdate = true;
          canopiesRef.current.instanceMatrix.needsUpdate = true;
        }, [count, isDesert]);

        return (
          <>
            <instancedMesh ref={trunksRef} args={[undefined, undefined, count]} castShadow={false}>
              <cylinderGeometry args={[isDesert ? 0.15 : 0.18, isDesert ? 0.22 : 0.25, isDesert ? 2.0 : 2.5, 4]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={farOpacity * 0.75}
                depthWrite={false}
              />
            </instancedMesh>
            <instancedMesh ref={canopiesRef} args={[undefined, undefined, count]} castShadow={false}>
              <sphereGeometry args={[isDesert ? 0.8 : 1.0, 6, 4]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={farOpacity * 0.65}
                depthWrite={false}
              />
            </instancedMesh>
          </>
        );
      })()}

      {/* ============================================ */}
      {/* FAR LAYER: Atmospheric haze & Mountains */}
      {/* Most distant, heavily faded by atmosphere */}
      {/* ============================================ */}
      {(() => {
        const hazeLayersRef = useRef<THREE.InstancedMesh>(null);
        const hazeData = [
          { x: scaleRadius(100), z: scaleRadius(100), height: 8, size: 1.5 },
          { x: scaleRadius(-110), z: scaleRadius(95), height: 10, size: 1.8 },
          { x: scaleRadius(105), z: scaleRadius(-100), height: 7, size: 1.4 },
          { x: scaleRadius(-95), z: scaleRadius(-105), height: 9, size: 1.6 },
          { x: scaleRadius(120), z: scaleRadius(-80), height: 11, size: 2.0 },
          { x: scaleRadius(-130), z: scaleRadius(110), height: 8, size: 1.7 },
        ];

        React.useEffect(() => {
          if (!hazeLayersRef.current) return;
          const tempObj = new THREE.Object3D();
          hazeData.forEach((haze, i) => {
            tempObj.position.set(haze.x, haze.height, haze.z);
            tempObj.scale.set(haze.size, 1, haze.size);
            tempObj.updateMatrix();
            hazeLayersRef.current.setMatrixAt(i, tempObj.matrix);
          });
          hazeLayersRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={hazeLayersRef} args={[undefined, undefined, 6]} castShadow={false}>
            <cylinderGeometry args={[1.5, 0.5, 6, 6]} />
            <meshStandardMaterial color={hazeColor} roughness={1} transparent opacity={hazeOpacity} depthWrite={false} />
          </instancedMesh>
        );
      })()}

      {/* Mount Qasioun - very distant mountain ring with atmospheric fade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <ringGeometry args={[scaleRadius(165), scaleRadius(180), 64]} />
        <meshStandardMaterial
          color={mountainColor}
          transparent
          opacity={mountainOpacity}
          roughness={1}
          depthWrite={false}
          emissive={twilightFactor > 0 ? mountainColor : '#000000'}
          emissiveIntensity={twilightFactor * 0.1}
        />
      </mesh>

      {/* HORIZON LINE GRADIENT - Ultra-smooth atmospheric blending */}
      {/* Enhanced multi-layer gradient for seamless ground-to-sky transition */}
      {(() => {
        // WARM TONES ONLY - no blue! This is hot, dusty Syria in June
        const horizonSkyColor = isDesert
          ? (nightFactor > 0.8 ? '#2a1e14' : twilightFactor > 0 ? '#f2a24f' : '#fae4b8')  // Night: warm charcoal-brown, Twilight: golden, Day: pale sandy-cream
          : (nightFactor > 0.8 ? '#2a1e14' : twilightFactor > 0 ? '#f7b25a' : '#f0d8b0'); // Night: warm charcoal-brown, Twilight: amber-gold, Day: dusty cream

        // ENHANCED: 12 gradient layers for ultra-smooth blending
        const gradientLayers = [
          { height: 0.05, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.45, colorMix: 0 },      // Near ground
          { height: 0.2, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.42, colorMix: 0.08 },
          { height: 0.5, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.38, colorMix: 0.16 },
          { height: 0.9, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.35, colorMix: 0.24 },
          { height: 1.4, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.32, colorMix: 0.34 },
          { height: 2.0, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.28, colorMix: 0.44 },
          { height: 2.8, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.25, colorMix: 0.54 },
          { height: 3.8, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.22, colorMix: 0.64 },
          { height: 5.0, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.18, colorMix: 0.74 },
          { height: 6.5, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.14, colorMix: 0.84 },
          { height: 8.5, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.10, colorMix: 0.92 },
          { height: 11.0, radius: [scaleRadius(100), scaleRadius(180)], opacity: 0.06, colorMix: 0.98 },   // Blend to sky
        ];

        return (
          <>
            {gradientLayers.map((layer, i) => {
              // Blend from sun-bleached ground to warm atmospheric horizon
              const groundColor = new THREE.Color(isDesert ? '#e4b878' : '#e8c8a0');  // More sun-bleached, warm
              const skyColor = new THREE.Color(horizonSkyColor);
              const blendedColor = groundColor.clone().lerp(skyColor, layer.colorMix);

              // Intense atmospheric haze during hot summer days
              const adjustedOpacity = layer.opacity
                * (nightFactor > 0.8 ? 0.45 : twilightFactor > 0 ? 0.95 : 0.80)  // Higher daytime opacity for heat shimmer
                * (1.0 + atmosphericHaze * 0.35);

              return (
                <mesh key={`horizon-gradient-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, layer.height, 0]}>
                  <ringGeometry args={[layer.radius[0], layer.radius[1], 64]} />
                  <meshStandardMaterial
                    color={blendedColor}
                    transparent
                    opacity={adjustedOpacity}
                    roughness={1}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </>
        );
      })()}
      </group>
    </>
  );
};
