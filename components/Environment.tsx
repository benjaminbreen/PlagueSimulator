
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';

// Utility to generate a procedural noise texture to avoid external loading errors
const createNoiseTexture = (size = 256, opacity = 0.2) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const val = Math.random() * 255;
    imageData.data[i] = val;
    imageData.data[i + 1] = val;
    imageData.data[i + 2] = val;
    imageData.data[i + 3] = 255 * opacity;
  }
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createBlotchTexture = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 120;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createStripeTexture = (colorA: string, colorB: string, stripeCount = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stripeWidth = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};
// Color palettes for different districts and building functions
const BUILDING_PALETTES = {
  [BuildingType.RESIDENTIAL]: { color: '#d6ccb7', metalness: 0, roughness: 0.85 },
  [BuildingType.COMMERCIAL]: { color: '#a68a64', metalness: 0, roughness: 1.0 },
  [BuildingType.RELIGIOUS]: { color: '#e8dcc4', metalness: 0.05, roughness: 0.7 },
  [BuildingType.CIVIC]: { color: '#d4a373', metalness: 0.1, roughness: 0.65 },
};

interface EnvironmentProps {
  mapX: number;
  mapY: number;
  onGroundClick?: (point: THREE.Vector3) => void;
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void;
  nearBuildingId?: string | null;
  timeOfDay?: number;
}

const Awning: React.FC<{ material: THREE.Material; position: [number, number, number]; rotation: [number, number, number]; width: number; seed: number }> = ({ material, position, rotation, width, seed }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = rotation[0] + Math.sin(state.clock.elapsedTime + seed) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
       <planeGeometry args={[width, 3]} />
       <primitive object={material} />
    </mesh>
  );
};

const Torch: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; intensity: number }> = ({ position, rotation, intensity }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 8]} />
        <meshStandardMaterial color="#5a3b25" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={intensity * 1.2} />
      </mesh>
    </group>
  );
};

const PotTree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
  </group>
);

const ClayJar: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <mesh position={position} castShadow>
    <cylinderGeometry args={[0.25, 0.35, 0.6, 10]} />
    <meshStandardMaterial color="#a9703a" roughness={0.95} />
  </mesh>
);

const CornerTurret: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.6, 0.7, 2.2, 12]} />
      <meshStandardMaterial color="#c9b79d" roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.2, 0]} castShadow>
      <coneGeometry args={[0.7, 0.6, 10]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
  </group>
);

const Building: React.FC<{ 
  data: BuildingMetadata; 
  mainMaterial: THREE.Material; 
  otherMaterials: any;
  isNear: boolean;
  torchIntensity: number;
  district: DistrictType;
  nightFactor: number;
}> = ({ data, mainMaterial, otherMaterials, isNear, torchIntensity, district, nightFactor }) => {
  const [hovered, setHovered] = useState(false);
  const localSeed = data.position[0] * 1000 + data.position[2];
  const baseHeight = data.type === BuildingType.RELIGIOUS || data.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.7 : district === 'CIVIC' ? 1.2 : 1.0;
  const height = baseHeight * districtScale;
  const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale;
  const buildingMaterial = useMemo(() => {
    if (!(mainMaterial instanceof THREE.MeshStandardMaterial)) return mainMaterial;
    if (data.type !== BuildingType.RESIDENTIAL) return mainMaterial;

    const mat = mainMaterial.clone();
    const color = mat.color.clone();
    const hueShift = (seededRandom(localSeed + 7) - 0.5) * 0.03;
    const lightShift = (seededRandom(localSeed + 33) - 0.5) * 0.08;
    color.offsetHSL(hueShift, -0.02, lightShift);
    mat.color.copy(color);
    mat.roughness = 0.8;
    mat.metalness = 0.03;
    mat.envMapIntensity = 1.35;
    mat.needsUpdate = true;
    return mat;
  }, [data.type, localSeed, mainMaterial]);
  const baseResidentialColor = useMemo(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return null;
    return buildingMaterial.color.clone();
  }, [buildingMaterial]);

  useEffect(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return;
    if (!baseResidentialColor || data.type !== BuildingType.RESIDENTIAL) return;
    const nightTint = new THREE.Color('#6f7f96');
    const nightDarken = 1 - nightFactor * 0.55;
    const tinted = baseResidentialColor.clone().lerp(nightTint, nightFactor);
    tinted.multiplyScalar(nightDarken);
    buildingMaterial.color.copy(tinted);
    buildingMaterial.envMapIntensity = 1.35 - nightFactor * 0.9;
    buildingMaterial.needsUpdate = true;
  }, [buildingMaterial, baseResidentialColor, nightFactor, data.type]);

  // Door positioning based on metadata
  const doorRotation = data.doorSide * (Math.PI / 2);
  const doorOffset = buildingSize / 2 + 0.1;
  const doorPos: [number, number, number] = [0, -height / 2 + 1.25, 0];
  const doorVariant = Math.floor(seededRandom(localSeed + 21) * 3);
  
  if (data.doorSide === 0) doorPos[2] = doorOffset; // N
  else if (data.doorSide === 1) doorPos[0] = doorOffset; // E
  else if (data.doorSide === 2) doorPos[2] = -doorOffset; // S
  else if (data.doorSide === 3) doorPos[0] = -doorOffset; // W

  const activeGlow = isNear || hovered;
  const torchChance = seededRandom(localSeed + 17);
  const torchCount = torchChance > 0.97 ? 2 : torchChance > 0.9 ? 1 : 0;
  const torchOffsets: [number, number, number][] = [];
  if (torchCount >= 1) torchOffsets.push([buildingSize / 2 + 0.2, -height * 0.15, 0]);
  if (torchCount >= 2) torchOffsets.push([-buildingSize / 2 - 0.2, -height * 0.15, 0]);
  const hasMarketOrnaments = district === 'MARKET' && seededRandom(localSeed + 81) > 0.6;
  const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);
  const hasTurret = district === 'MARKET' && seededRandom(localSeed + 91) > 0.85;
  const hasWealthyDoorOrnaments = district === 'WEALTHY' && seededRandom(localSeed + 121) > 0.35;
  const hasWealthyWindowTrim = district === 'WEALTHY' && seededRandom(localSeed + 123) > 0.4;
  const doorOutwardOffset: [number, number, number] =
    data.doorSide === 0 ? [0, 0, 0.6]
    : data.doorSide === 1 ? [0.6, 0, 0]
    : data.doorSide === 2 ? [0, 0, -0.6]
    : [-0.6, 0, 0];
  const doorSideOffset: [number, number, number] =
    data.doorSide === 0 || data.doorSide === 2 ? [1.4, 0, 0] : [0, 0, 1.4];

  return (
    <group 
      position={[data.position[0], height / 2, data.position[2]]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Main weathered sandstone structure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[buildingSize, height, buildingSize]} />
        <primitive object={buildingMaterial} />
      </mesh>
      
      {/* Dome for Religious/Civic */}
      {(data.type === BuildingType.RELIGIOUS || seededRandom(localSeed + 2) > 0.85) && (
        <mesh position={[0, height / 2, 0]} castShadow>
          <sphereGeometry args={[buildingSize / 2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={otherMaterials.dome[Math.floor(seededRandom(localSeed + 73) * otherMaterials.dome.length)]} />
        </mesh>
      )}

      {/* DETAILED DOORWAY */}
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
        {district === 'WEALTHY' && (
          <>
            <mesh position={[0, 0.1, -0.05]} castShadow>
              <boxGeometry args={[3.1, 3.2, 0.12]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.7, 0.12]} castShadow>
              <boxGeometry args={[2.8, 0.25, 0.18]} />
              <meshStandardMaterial color="#7a5b42" roughness={0.9} />
            </mesh>
          </>
        )}
        {doorVariant === 0 && (
          <mesh castShadow>
            <boxGeometry args={[2.5, 2.5, 0.2]} />
            <meshStandardMaterial color="#4a3b2b" />
          </mesh>
        )}
        {doorVariant === 1 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.4, 2.2, 0.2]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
            <mesh position={[0, 1.05, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.0, 1.0, 0.2, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
          </>
        )}
        {doorVariant === 2 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.8, 2.8, 0.2]} />
              <meshStandardMaterial color="#5b4634" />
            </mesh>
            <mesh position={[0, 0, 0.12]} castShadow>
              <boxGeometry args={[2.3, 2.3, 0.15]} />
              <meshStandardMaterial color="#3d2e21" />
            </mesh>
          </>
        )}
        {/* Door Panels */}
        <mesh position={[0, 0, 0.1]} castShadow>
           <boxGeometry args={[1.8, 2.3, 0.1]} />
           <meshStandardMaterial 
             color={activeGlow ? "#8b4513" : "#3d2817"} 
             emissive={activeGlow ? "#fbbf24" : "black"}
             emissiveIntensity={activeGlow ? 0.3 : 0}
             roughness={0.8}
           />
        </mesh>
        {doorVariant === 1 && (
          <mesh position={[0, 1.15, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.9, 0.9, 0.1, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={activeGlow ? "#fbbf24" : "#3d2817"} emissive={activeGlow ? "#fbbf24" : "black"} emissiveIntensity={activeGlow ? 0.2 : 0} />
          </mesh>
        )}
      </group>

      {/* Roof Parapet / Cap for Wealthy */}
      {district === 'WEALTHY' && seededRandom(localSeed + 31) > 0.6 && (
        <>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[buildingSize + 0.6, 0.3, buildingSize + 0.6]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          {seededRandom(localSeed + 37) > 0.7 && (
            <mesh position={[0, height / 2 + 0.6, 0]} castShadow>
              <sphereGeometry args={[buildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#bda88b" roughness={0.8} />
            </mesh>
          )}
        </>
      )}

      {/* WINDOWS (Mashrabiya-style visual) */}
      {[0, 1, 2, 3].map((side) => {
        if (side === data.doorSide && seededRandom(localSeed + side) < 0.8) return null;
        
        const sideRand = seededRandom(localSeed + side + 10);
        if (sideRand < 0.3) return null;

        const rot = side * (Math.PI / 2);
        const off = buildingSize / 2 + 0.05;
        const wPos: [number, number, number] = [0, height / 2 - 2, 0];
        if (side === 0) wPos[2] = off;
        else if (side === 1) wPos[0] = off;
        else if (side === 2) wPos[2] = -off;
        else if (side === 3) wPos[0] = -off;

        return (
          <group key={side} position={wPos} rotation={[0, rot, 0]}>
            <mesh position={data.hasSymmetricalWindows ? [-1, 0, 0] : [0, 0, 0]}>
               <boxGeometry args={[1.2, 1.8, 0.1]} />
               <meshStandardMaterial color="#2a1a0a" roughness={1} />
            </mesh>
            {data.hasSymmetricalWindows && (
              <mesh position={[1, 0, 0]}>
                <boxGeometry args={[1.2, 1.8, 0.1]} />
                <meshStandardMaterial color="#2a1a0a" roughness={1} />
              </mesh>
            )}
            {hasWealthyWindowTrim && (
              <mesh position={[0, 0, 0.08]} castShadow>
                <boxGeometry args={[1.6, 2.2, 0.08]} />
                <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
              </mesh>
            )}
            {district === 'MARKET' && seededRandom(localSeed + side + 22) > 0.7 && (
              <mesh position={[0, 0, 0.08]} castShadow>
                <boxGeometry args={[1.4, 2.0, 0.08]} />
                <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Animated Awnings */}
      {(data.type === BuildingType.COMMERCIAL || seededRandom(localSeed + 3) > 0.6) && (
        <Awning 
          material={seededRandom(localSeed + 5) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 6) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 4) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.4, buildingSize / 2 + 1.5]}
          rotation={[0.3, 0, 0]}
          width={buildingSize * 0.8}
          seed={localSeed}
        />
      )}

      {/* Secondary Awning / Beam Protrusions */}
      {seededRandom(localSeed + 61) > 0.75 && (
        <Awning 
          material={seededRandom(localSeed + 63) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 64) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 62) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.55, -buildingSize / 2 - 1.2]}
          rotation={[0.25, Math.PI, 0]}
          width={buildingSize * 0.6}
          seed={localSeed + 2}
        />
      )}
      {seededRandom(localSeed + 71) > 0.6 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={`beam-${i}`} position={[buildingSize / 2 + 0.4, -height / 2 + 1 + i * 1.4, (i - 1) * 1.2]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.15]} />
              <meshStandardMaterial color="#3d2817" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {hasMarketOrnaments && (
        <group position={[0, -height / 2, 0]}>
          {ornamentType === 0 && <PotTree position={[buildingSize / 2 + 0.8, 0.2, 1.2]} />}
          {ornamentType === 1 && (
            <>
              <ClayJar position={[buildingSize / 2 + 0.7, 0.3, 1]} />
              <ClayJar position={[buildingSize / 2 + 1.1, 0.3, 1.3]} />
            </>
          )}
          {ornamentType === 2 && <PotTree position={[-buildingSize / 2 - 0.8, 0.2, -1.2]} />}
        </group>
      )}
      {hasWealthyDoorOrnaments && (
        <group position={[0, -height / 2, 0]}>
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] + doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] + doorSideOffset[2]
          ]} />
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] - doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] - doorSideOffset[2]
          ]} />
        </group>
      )}

      {hasTurret && (
        <CornerTurret position={[buildingSize / 2 - 0.6, height / 2 - 1.1, buildingSize / 2 - 0.6]} />
      )}

      {/* Wall Torches */}
      {torchOffsets.map((offset, index) => (
        <Torch
          key={`torch-${data.id}-${index}`}
          position={[offset[0], offset[1], offset[2]]}
          rotation={[0, offset[0] > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          intensity={torchIntensity}
        />
      ))}
    </group>
  );
};

export const Buildings: React.FC<{ 
  mapX: number, 
  mapY: number, 
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void,
  nearBuildingId?: string | null,
  torchIntensity: number;
  nightFactor: number;
}> = ({ mapX, mapY, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor }) => {
  const noiseTexture = useMemo(() => createNoiseTexture(256, 0.35), []);

  const materials = useMemo(() => {
    const matMap = new Map<BuildingType, THREE.MeshStandardMaterial>();
    Object.entries(BUILDING_PALETTES).forEach(([type, props]) => {
      const applyTexture = type === BuildingType.COMMERCIAL || type === BuildingType.CIVIC;
      matMap.set(type as BuildingType, new THREE.MeshStandardMaterial({
        ...props,
        map: applyTexture ? noiseTexture : null,
        bumpMap: applyTexture ? noiseTexture : null,
        bumpScale: applyTexture ? 0.02 : 0,
      }));
    });
    return matMap;
  }, [noiseTexture]);

  const otherMaterials = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 1.0 }),
    dome: [
      new THREE.MeshStandardMaterial({ color: '#b8a98e', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#a6947a', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#c7b89c', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#b8c3c9', roughness: 0.7 }) // pale blue
    ],
    awning: [
      new THREE.MeshStandardMaterial({ color: '#d9c9a8', side: THREE.DoubleSide }), // cream
      new THREE.MeshStandardMaterial({ color: '#cdbb9a', side: THREE.DoubleSide }), // light tan
      new THREE.MeshStandardMaterial({ color: '#c3ab85', side: THREE.DoubleSide }), // earth
      new THREE.MeshStandardMaterial({ color: '#e4d6b5', side: THREE.DoubleSide }), // light linen
      new THREE.MeshStandardMaterial({ color: '#3b4f6b', side: THREE.DoubleSide }), // indigo (wealthy)
      new THREE.MeshStandardMaterial({ color: '#4a356a', side: THREE.DoubleSide }), // purple (wealthy)
      new THREE.MeshStandardMaterial({ color: '#2f4f7a', side: THREE.DoubleSide }), // blue (wealthy)
      new THREE.MeshStandardMaterial({ color: '#b0813a', side: THREE.DoubleSide }), // ochre (wealthy)
    ],
    awningStriped: [
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#f3ead6', '#d9c9a8'), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e6d6b8', '#bfae8d'), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e6d6b8', '#c6cdb2'), side: THREE.DoubleSide })
    ]
  }), []);

  const metadata = useMemo(() => {
    const bldMetadata: BuildingMetadata[] = [];
    const district = getDistrictType(mapX, mapY);
    const size = CONSTANTS.MARKET_SIZE * (district === 'WEALTHY' ? 1.1 : district === 'HOVELS' ? 0.9 : 1.0);
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (district === 'WEALTHY' ? 1.2 : district === 'HOVELS' ? 0.75 : 1.0);
    const street = CONSTANTS.STREET_WIDTH * (district === 'WEALTHY' ? 1.6 : district === 'HOVELS' ? 0.7 : 1.0);
    const gap = baseBuilding + street;
    let seed = (mapX * 100) + mapY;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        if (chance < 0.3) continue; 
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        bldMetadata.push(data);
      }
    }
    return bldMetadata;
  }, [mapX, mapY]);

  React.useEffect(() => {
    onBuildingsGenerated?.(metadata);
  }, [metadata, onBuildingsGenerated]);

  return (
    <group>
      {metadata.map((data) => (
        <Building 
          key={data.id} 
          data={data} 
          mainMaterial={materials.get(data.type) || materials.get(BuildingType.RESIDENTIAL)!}
          otherMaterials={otherMaterials}
          isNear={nearBuildingId === data.id}
          torchIntensity={torchIntensity}
          district={getDistrictType(mapX, mapY)}
          nightFactor={nightFactor}
        />
      ))}
    </group>
  );
};

export const Ground: React.FC<{ onClick?: (point: THREE.Vector3) => void }> = ({ onClick }) => {
  const roughnessTexture = useMemo(() => createNoiseTexture(128, 0.05), []);
  const blotchTexture = useMemo(() => createBlotchTexture(512), []);

  const groundMaterial = useMemo(() => {
    if (roughnessTexture) {
      roughnessTexture.repeat.set(6, 6);
    }
    return new THREE.MeshStandardMaterial({ 
      color: '#e7cfa5', 
      roughness: 0.95, 
      metalness: 0,
      roughnessMap: roughnessTexture || null,
      bumpMap: roughnessTexture || null,
      bumpScale: 0.0035
    });
  }, [roughnessTexture]);

  const groundOverlayMaterial = useMemo(() => {
    if (blotchTexture) {
      blotchTexture.repeat.set(2, 2);
    }
    return new THREE.MeshStandardMaterial({
      color: '#d2b483',
      transparent: true,
      opacity: 0.35,
      map: blotchTexture || null,
      depthWrite: false,
      roughness: 1,
      metalness: 0
    });
  }, [blotchTexture]);

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        position={[0, -0.1, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick?.(e.point);
        }}
      >
        <planeGeometry args={[250, 250]} />
        <primitive object={groundMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.095, 0]}>
        <planeGeometry args={[250, 250]} />
        <primitive object={groundOverlayMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#edd2a2" roughness={1} opacity={0.2} transparent />
      </mesh>
    </group>
  );
};

export const MosqueBackground: React.FC<{ mapX: number, mapY: number }> = ({ mapX, mapY }) => {
  if (Math.abs(mapX) > 2 || Math.abs(mapY) > 2) return null;
  return (
    <group position={[-90 - mapX * 10, 0, -90 - mapY * 10]}>
      <mesh position={[0, 15, 0]} castShadow>
          <sphereGeometry args={[20, 32, 32, 0, Math.PI * 2, 0, Math.PI/2]} />
          <meshStandardMaterial color="#a89f91" roughness={0.7} />
      </mesh>
      <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[20, 20, 15, 32]} />
          <meshStandardMaterial color="#c2b280" roughness={0.8} />
      </mesh>
      <mesh position={[25, 20, 10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
      <mesh position={[-25, 20, -10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
    </group>
  );
};

export const CentralWell: React.FC<{ mapX: number, mapY: number }> = ({ mapX, mapY }) => {
  if (mapX !== 0 || mapY !== 0) return null;
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3, 3.5, 1, 16]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[2.8, 16]} />
        <meshStandardMaterial color="#224466" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[4.2, 0.2, 4.2]} />
          <meshStandardMaterial color="#3d2817" roughness={1.0} />
      </mesh>
    </group>
  );
};

export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, onGroundClick, onBuildingsGenerated, nearBuildingId, timeOfDay }) => {
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  return (
    <group>
      <Ground onClick={onGroundClick} />
      <Buildings mapX={mapX} mapY={mapY} onBuildingsGenerated={onBuildingsGenerated} nearBuildingId={nearBuildingId} torchIntensity={torchIntensity} nightFactor={nightFactor} />
      <MosqueBackground mapX={mapX} mapY={mapY} />
      <CentralWell mapX={mapX} mapY={mapY} />
      
      <group>
          <mesh position={[0, 5, 80]}><boxGeometry args={[160, 10, 0.5]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
          <mesh position={[0, 5, -80]}><boxGeometry args={[160, 10, 0.5]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
          <mesh position={[80, 5, 0]}><boxGeometry args={[0.5, 10, 160]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
          <mesh position={[-80, 5, 0]}><boxGeometry args={[0.5, 10, 160]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
      </group>
    </group>
  );
};
