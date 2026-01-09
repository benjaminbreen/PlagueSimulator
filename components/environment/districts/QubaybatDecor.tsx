/**
 * Qubaybat (Little Domes) District Decorations
 * Historic Mamluk-era mausoleum complex south of Damascus (1348 CE)
 * Features: Elaborate domed tombs of emirs and scholars, scattered graves, cypress avenues
 * The name "Qubaybat" means "little domes" - referring to the many mausoleum cupolas
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';
import { CACHED_WOOD_TEXTURES, DARK_FOLIAGE_MATERIAL } from '../../../utils/environment/wood';
import { HoverableGroup } from '../shared/HoverSystem';

// Shared materials
const CYPRESS_TRUNK_MATERIAL = new THREE.MeshStandardMaterial({
  map: CACHED_WOOD_TEXTURES.walnut,
  roughness: 0.95,
  color: new THREE.Color('#5a4a3a'),
});

const STONE_LIGHT = new THREE.Color('#c8b8a0');
const STONE_MEDIUM = new THREE.Color('#a89878');
const STONE_DARK = new THREE.Color('#8a7a68');
const DOME_CREAM = new THREE.Color('#d8c8b0');

// Qibla direction from Damascus to Mecca
const QIBLA_ANGLE = (190 * Math.PI) / 180;

// Major mausoleum types based on 14th century Mamluk architecture
type MausoleumStyle = 'square_dome' | 'octagonal' | 'twin_dome' | 'complex';

interface MausoleumData {
  position: [number, number, number];
  rotation: number;
  style: MausoleumStyle;
  scale: number;
  name: string;
  hasMihrab: boolean;
  hasMinaret: boolean;
}

interface GraveData {
  position: [number, number, number];
  rotation: number;
  scale: number;
  isOrnate: boolean;
}

export const QubaybatDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
  heightmap?: TerrainHeightmap | null;
}> = ({
  mapX,
  mapY,
  timeOfDay,
  terrainSeed,
  onTreePositionsGenerated,
  heightmap,
}) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'QUBAYBAT') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  const seed = mapX * 1000 + mapY + terrainSeed;
  const rand = (offset: number) => seededRandom(seed + offset);

  const getHeight = (x: number, z: number): number => {
    return heightmap ? sampleTerrainHeight(heightmap, x, z) : 0;
  };

  // ==================== MAJOR MAUSOLEUMS ====================
  // The centerpiece of Qubaybat - elaborate domed tombs of Mamluk emirs and scholars
  const mausoleums = useMemo(() => {
    const data: MausoleumData[] = [];

    // Historical names for immersion
    const names = [
      'Tomb of Emir Tankiz',
      'Mausoleum of Shaykh Ahmad',
      'Turbah al-Zahiriyya',
      'Tomb of Qadi Ibrahim',
      'Turbah al-Afriduniyya',
      'Shrine of Sayyida Ruqayya',
    ];

    // Central grand mausoleum
    data.push({
      position: [0, getHeight(0, 0), 0],
      rotation: QIBLA_ANGLE,
      style: 'complex',
      scale: 1.4,
      name: names[0],
      hasMihrab: true,
      hasMinaret: true,
    });

    // Four corner mausoleums
    const cornerPositions: [number, number][] = [
      [-22, -18], [22, -18], [-22, 22], [22, 22]
    ];
    cornerPositions.forEach(([x, z], i) => {
      const jitterX = (rand(i * 10 + 100) - 0.5) * 4;
      const jitterZ = (rand(i * 10 + 101) - 0.5) * 4;
      const finalX = x + jitterX;
      const finalZ = z + jitterZ;

      const styles: MausoleumStyle[] = ['square_dome', 'octagonal', 'twin_dome', 'square_dome'];
      data.push({
        position: [finalX, getHeight(finalX, finalZ), finalZ],
        rotation: QIBLA_ANGLE + (rand(i * 10 + 102) - 0.5) * 0.1,
        style: styles[i],
        scale: 0.9 + rand(i * 10 + 103) * 0.3,
        name: names[i + 1] || `Tomb ${i + 1}`,
        hasMihrab: rand(i * 10 + 104) > 0.3,
        hasMinaret: rand(i * 10 + 105) > 0.7,
      });
    });

    // Additional smaller mausoleums scattered around
    const scatterPositions: [number, number][] = [
      [-10, -28], [12, -25], [-28, 5], [30, 8], [-8, 32], [15, 28]
    ];
    scatterPositions.forEach(([x, z], i) => {
      if (rand(i + 200) > 0.4) {
        const jitterX = (rand(i * 10 + 210) - 0.5) * 3;
        const jitterZ = (rand(i * 10 + 211) - 0.5) * 3;
        const finalX = x + jitterX;
        const finalZ = z + jitterZ;

        data.push({
          position: [finalX, getHeight(finalX, finalZ), finalZ],
          rotation: QIBLA_ANGLE + (rand(i * 10 + 212) - 0.5) * 0.15,
          style: rand(i + 213) > 0.5 ? 'square_dome' : 'octagonal',
          scale: 0.7 + rand(i * 10 + 214) * 0.2,
          name: `Minor Tomb ${i + 1}`,
          hasMihrab: rand(i * 10 + 215) > 0.5,
          hasMinaret: false,
        });
      }
    });

    return data;
  }, [seed, heightmap]);

  // ==================== SCATTERED GRAVES ====================
  // Fewer than the main cemetery, clustered between mausoleums
  const graves = useMemo(() => {
    const data: GraveData[] = [];

    // Grave clusters in spaces between mausoleums
    const clusterCenters: [number, number][] = [
      [-15, -5], [15, -5], [-15, 12], [15, 12],
      [0, -20], [0, 25], [-30, -15], [30, -15]
    ];

    clusterCenters.forEach(([cx, cz], clusterIdx) => {
      const graveCount = 4 + Math.floor(rand(clusterIdx * 100 + 300) * 4);

      for (let i = 0; i < graveCount; i++) {
        const angle = rand(clusterIdx * 100 + i * 10 + 310) * Math.PI * 2;
        const dist = 2 + rand(clusterIdx * 100 + i * 10 + 311) * 5;
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;

        data.push({
          position: [x, getHeight(x, z), z],
          rotation: QIBLA_ANGLE + (rand(clusterIdx * 100 + i * 10 + 312) - 0.5) * 0.2,
          scale: 0.8 + rand(clusterIdx * 100 + i * 10 + 313) * 0.5,
          isOrnate: rand(clusterIdx * 100 + i * 10 + 314) > 0.7,
        });
      }
    });

    return data;
  }, [seed, heightmap]);

  // ==================== CYPRESS TREES ====================
  const cypressTrees = useMemo(() => {
    const trees: Array<[number, number, number]> = [];

    // Formal avenues leading to major tombs
    // North-south avenue
    for (let z = -40; z <= 40; z += 12) {
      if (Math.abs(z) > 8) { // Gap in center for main mausoleum
        const xLeft = -6;
        const xRight = 6;
        trees.push([xLeft, getHeight(xLeft, z), z]);
        trees.push([xRight, getHeight(xRight, z), z]);
      }
    }

    // East-west avenue
    for (let x = -35; x <= 35; x += 12) {
      if (Math.abs(x) > 8) {
        const z = 0;
        trees.push([x, getHeight(x, z), z]);
      }
    }

    // Scattered around perimeter
    const perimeterPositions: [number, number][] = [
      [-40, -35], [-40, 0], [-40, 35],
      [40, -35], [40, 0], [40, 35],
    ];
    perimeterPositions.forEach(([x, z], i) => {
      const jitterX = (rand(i + 500) - 0.5) * 3;
      const jitterZ = (rand(i + 501) - 0.5) * 3;
      trees.push([x + jitterX, getHeight(x + jitterX, z + jitterZ), z + jitterZ]);
    });

    return trees;
  }, [seed, heightmap]);

  useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(cypressTrees);
    }
  }, [onTreePositionsGenerated, cypressTrees]);

  // ==================== STONE PATHWAYS ====================
  const pathways = useMemo(() => {
    return [
      // Main north-south path
      { start: [0, -45] as [number, number], end: [0, 45] as [number, number], width: 3.5 },
      // Main east-west path
      { start: [-45, 0] as [number, number], end: [45, 0] as [number, number], width: 3.5 },
      // Diagonal paths to corner mausoleums
      { start: [0, 0] as [number, number], end: [-25, -20] as [number, number], width: 2.0 },
      { start: [0, 0] as [number, number], end: [25, -20] as [number, number], width: 2.0 },
      { start: [0, 0] as [number, number], end: [-25, 25] as [number, number], width: 2.0 },
      { start: [0, 0] as [number, number], end: [25, 25] as [number, number], width: 2.0 },
    ];
  }, []);

  // Refs for instanced meshes
  const cypressTrunkRef = useRef<THREE.InstancedMesh>(null);
  const cypressCanopyRef = useRef<THREE.InstancedMesh>(null);
  const graveMarkerRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  // Setup cypress trees
  useEffect(() => {
    if (cypressTrunkRef.current && cypressCanopyRef.current) {
      cypressTrees.forEach((pos, i) => {
        tempObj.position.set(pos[0], pos[1] + 3, pos[2]);
        tempObj.rotation.set(0, rand(i + 600) * 0.2, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        cypressTrunkRef.current!.setMatrixAt(i, tempObj.matrix);

        tempObj.position.set(pos[0], pos[1] + 6, pos[2]);
        tempObj.updateMatrix();
        cypressCanopyRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      cypressTrunkRef.current.instanceMatrix.needsUpdate = true;
      cypressCanopyRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [cypressTrees, tempObj]);

  // Setup grave markers
  useEffect(() => {
    if (graveMarkerRef.current) {
      graves.forEach((grave, i) => {
        tempObj.position.set(grave.position[0], grave.position[1] + 0.4 * grave.scale, grave.position[2]);
        tempObj.rotation.set(0, grave.rotation, 0);
        tempObj.scale.set(grave.scale, grave.scale, grave.scale);
        tempObj.updateMatrix();
        graveMarkerRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      graveMarkerRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [graves, tempObj]);

  // ==================== MAUSOLEUM RENDERING ====================
  const renderMausoleum = (mausoleum: MausoleumData, index: number) => {
    const { position, rotation, style, scale, name, hasMihrab, hasMinaret } = mausoleum;
    const baseSize = 6 * scale;
    const wallHeight = 5 * scale;
    const domeRadius = 3.5 * scale;

    return (
      <HoverableGroup
        key={`mausoleum-${index}`}
        position={position}
        rotation={[0, rotation, 0]}
        hoverLabel={name}
      >
        {/* Base platform */}
        <mesh position={[0, 0.2 * scale, 0]} receiveShadow castShadow>
          <boxGeometry args={[baseSize + 2, 0.4 * scale, baseSize + 2]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.95} />
        </mesh>

        {style === 'complex' && (
          <>
            {/* Main chamber - larger for complex style */}
            <mesh position={[0, wallHeight / 2 + 0.4 * scale, 0]} castShadow receiveShadow>
              <boxGeometry args={[baseSize * 1.2, wallHeight, baseSize * 1.2]} />
              <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
            </mesh>

            {/* Main dome */}
            <mesh position={[0, wallHeight + 0.4 * scale, 0]} castShadow>
              <sphereGeometry args={[domeRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={DOME_CREAM} roughness={0.7} />
            </mesh>

            {/* Dome finial */}
            <mesh position={[0, wallHeight + domeRadius + 0.4 * scale, 0]} castShadow>
              <cylinderGeometry args={[0.15 * scale, 0.25 * scale, 0.8 * scale, 8]} />
              <meshStandardMaterial color="#8a7a5a" roughness={0.6} metalness={0.3} />
            </mesh>

            {/* Side chambers */}
            {[-1, 1].map((side) => (
              <group key={`side-${side}`} position={[side * baseSize * 0.8, 0, 0]}>
                <mesh position={[0, wallHeight * 0.35 + 0.4 * scale, 0]} castShadow>
                  <boxGeometry args={[baseSize * 0.5, wallHeight * 0.7, baseSize * 0.5]} />
                  <meshStandardMaterial color={STONE_MEDIUM} roughness={0.88} />
                </mesh>
                <mesh position={[0, wallHeight * 0.7 + 0.4 * scale, 0]} castShadow>
                  <sphereGeometry args={[domeRadius * 0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={DOME_CREAM} roughness={0.75} />
                </mesh>
              </group>
            ))}

            {/* Entrance portal (iwan) */}
            <mesh position={[0, wallHeight * 0.4 + 0.4 * scale, baseSize * 0.6 + 0.1]} castShadow>
              <boxGeometry args={[baseSize * 0.5, wallHeight * 0.8, 0.3 * scale]} />
              <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
            </mesh>

            {/* Doorway */}
            <mesh position={[0, wallHeight * 0.25 + 0.4 * scale, baseSize * 0.6 + 0.2]} castShadow>
              <boxGeometry args={[baseSize * 0.25, wallHeight * 0.5, 0.1 * scale]} />
              <meshStandardMaterial color="#2a2a2a" roughness={1} />
            </mesh>
          </>
        )}

        {style === 'square_dome' && (
          <>
            {/* Main chamber */}
            <mesh position={[0, wallHeight / 2 + 0.4 * scale, 0]} castShadow receiveShadow>
              <boxGeometry args={[baseSize, wallHeight, baseSize]} />
              <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
            </mesh>

            {/* Dome */}
            <mesh position={[0, wallHeight + 0.4 * scale, 0]} castShadow>
              <sphereGeometry args={[domeRadius * 0.85, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={DOME_CREAM} roughness={0.72} />
            </mesh>

            {/* Finial */}
            <mesh position={[0, wallHeight + domeRadius * 0.85 + 0.3 * scale, 0]} castShadow>
              <cylinderGeometry args={[0.1 * scale, 0.2 * scale, 0.6 * scale, 6]} />
              <meshStandardMaterial color="#7a6a4a" roughness={0.65} metalness={0.2} />
            </mesh>

            {/* Decorative cornice */}
            <mesh position={[0, wallHeight + 0.3 * scale, 0]} castShadow>
              <boxGeometry args={[baseSize + 0.3, 0.2 * scale, baseSize + 0.3]} />
              <meshStandardMaterial color={STONE_MEDIUM} roughness={0.8} />
            </mesh>
          </>
        )}

        {style === 'octagonal' && (
          <>
            {/* Octagonal chamber */}
            <mesh position={[0, wallHeight / 2 + 0.4 * scale, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[baseSize * 0.55, baseSize * 0.55, wallHeight, 8]} />
              <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
            </mesh>

            {/* Conical dome (common in Mamluk tombs) */}
            <mesh position={[0, wallHeight + 0.4 * scale, 0]} castShadow>
              <coneGeometry args={[domeRadius * 0.7, domeRadius * 1.2, 8]} />
              <meshStandardMaterial color={DOME_CREAM} roughness={0.7} />
            </mesh>

            {/* Finial */}
            <mesh position={[0, wallHeight + domeRadius * 1.2 + 0.3 * scale, 0]} castShadow>
              <sphereGeometry args={[0.15 * scale, 8, 6]} />
              <meshStandardMaterial color="#8a7a5a" roughness={0.6} metalness={0.25} />
            </mesh>
          </>
        )}

        {style === 'twin_dome' && (
          <>
            {/* Twin chambers */}
            {[-0.55, 0.55].map((offset, i) => (
              <group key={`twin-${i}`} position={[offset * baseSize, 0, 0]}>
                <mesh position={[0, wallHeight * 0.4 + 0.4 * scale, 0]} castShadow receiveShadow>
                  <boxGeometry args={[baseSize * 0.7, wallHeight * 0.8, baseSize * 0.8]} />
                  <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
                </mesh>
                <mesh position={[0, wallHeight * 0.8 + 0.4 * scale, 0]} castShadow>
                  <sphereGeometry args={[domeRadius * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={DOME_CREAM} roughness={0.72} />
                </mesh>
              </group>
            ))}

            {/* Connecting structure */}
            <mesh position={[0, wallHeight * 0.25 + 0.4 * scale, 0]} castShadow>
              <boxGeometry args={[baseSize * 0.4, wallHeight * 0.5, baseSize * 0.6]} />
              <meshStandardMaterial color={STONE_MEDIUM} roughness={0.88} />
            </mesh>
          </>
        )}

        {/* Mihrab (prayer niche) on qibla wall */}
        {hasMihrab && (
          <group position={[0, wallHeight * 0.4, -baseSize * 0.5 - 0.1]}>
            <mesh castShadow>
              <boxGeometry args={[1.2 * scale, 2.5 * scale, 0.3 * scale]} />
              <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
            </mesh>
            {/* Mihrab arch */}
            <mesh position={[0, 0.8 * scale, 0.05]}>
              <cylinderGeometry args={[0.5 * scale, 0.5 * scale, 0.2, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#3a3a3a" roughness={1} />
            </mesh>
          </group>
        )}

        {/* Minaret */}
        {hasMinaret && (
          <group position={[baseSize * 0.7, 0, baseSize * 0.7]}>
            {/* Base */}
            <mesh position={[0, 1.5 * scale, 0]} castShadow>
              <boxGeometry args={[1.8 * scale, 3 * scale, 1.8 * scale]} />
              <meshStandardMaterial color={STONE_MEDIUM} roughness={0.85} />
            </mesh>
            {/* Shaft */}
            <mesh position={[0, 6 * scale, 0]} castShadow>
              <cylinderGeometry args={[0.6 * scale, 0.8 * scale, 9 * scale, 8]} />
              <meshStandardMaterial color={STONE_LIGHT} roughness={0.8} />
            </mesh>
            {/* Balcony */}
            <mesh position={[0, 8 * scale, 0]} castShadow>
              <cylinderGeometry args={[1 * scale, 0.9 * scale, 0.4 * scale, 12]} />
              <meshStandardMaterial color={STONE_DARK} roughness={0.85} />
            </mesh>
            {/* Upper shaft */}
            <mesh position={[0, 10.5 * scale, 0]} castShadow>
              <cylinderGeometry args={[0.4 * scale, 0.55 * scale, 4.5 * scale, 8]} />
              <meshStandardMaterial color={STONE_LIGHT} roughness={0.8} />
            </mesh>
            {/* Cap */}
            <mesh position={[0, 13 * scale, 0]} castShadow>
              <coneGeometry args={[0.5 * scale, 1.5 * scale, 8]} />
              <meshStandardMaterial color={DOME_CREAM} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Window openings */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
          <mesh
            key={`window-${i}`}
            position={[
              Math.sin(angle) * (baseSize * 0.51),
              wallHeight * 0.6 + 0.4 * scale,
              Math.cos(angle) * (baseSize * 0.51)
            ]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.8 * scale, 1.2 * scale, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} />
          </mesh>
        ))}
      </HoverableGroup>
    );
  };

  return (
    <group>
      {/* ===== MAUSOLEUMS ===== */}
      {mausoleums.map((m, i) => renderMausoleum(m, i))}

      {/* ===== GRAVE MARKERS ===== */}
      {graves.length > 0 && (
        <instancedMesh ref={graveMarkerRef} args={[undefined, undefined, graves.length]} castShadow>
          <boxGeometry args={[0.35, 0.8, 0.08]} />
          <meshStandardMaterial color="#8a8a78" roughness={0.92} />
        </instancedMesh>
      )}

      {/* Ornate grave borders */}
      {graves.filter(g => g.isOrnate).map((grave, i) => (
        <group key={`ornate-${i}`} position={grave.position} rotation={[0, grave.rotation, 0]}>
          <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
            <boxGeometry args={[1.4 * grave.scale, 0.3, 0.9 * grave.scale]} />
            <meshStandardMaterial color="#9a9a88" roughness={0.95} />
          </mesh>
          {/* Border stones */}
          <mesh position={[0, 0.2, 0.45 * grave.scale]} castShadow>
            <boxGeometry args={[1.5 * grave.scale, 0.12, 0.06]} />
            <meshStandardMaterial color="#7a7a68" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, -0.45 * grave.scale]} castShadow>
            <boxGeometry args={[1.5 * grave.scale, 0.12, 0.06]} />
            <meshStandardMaterial color="#7a7a68" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ===== CYPRESS TREES ===== */}
      {cypressTrees.length > 0 && (
        <>
          <instancedMesh ref={cypressTrunkRef} args={[undefined, undefined, cypressTrees.length]} castShadow material={CYPRESS_TRUNK_MATERIAL}>
            <cylinderGeometry args={[0.12, 0.25, 10, 8]} />
          </instancedMesh>
          <instancedMesh ref={cypressCanopyRef} args={[undefined, undefined, cypressTrees.length]} castShadow material={DARK_FOLIAGE_MATERIAL}>
            <coneGeometry args={[1.2, 6, 8]} />
          </instancedMesh>
        </>
      )}

      {/* ===== STONE PATHWAYS ===== */}
      {pathways.map((path, i) => {
        const dx = path.end[0] - path.start[0];
        const dz = path.end[1] - path.start[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const midX = (path.start[0] + path.end[0]) / 2;
        const midZ = (path.start[1] + path.end[1]) / 2;
        const midH = getHeight(midX, midZ);

        return (
          <mesh
            key={`path-${i}`}
            position={[midX, midH + 0.02, midZ]}
            rotation={[-Math.PI / 2, 0, -angle]}
            receiveShadow
          >
            <planeGeometry args={[length, path.width]} />
            <meshStandardMaterial color="#a89878" roughness={0.95} />
          </mesh>
        );
      })}

      {/* ===== PERIMETER WALL ===== */}
      {[
        { x1: -48, z1: -48, x2: 48, z2: -48 }, // South
        { x1: -48, z1: 48, x2: 48, z2: 48 },   // North
        { x1: -48, z1: -48, x2: -48, z2: 48 }, // West
        { x1: 48, z1: -48, x2: 48, z2: 48 },   // East
      ].map((wall, i) => {
        const length = Math.sqrt((wall.x2 - wall.x1) ** 2 + (wall.z2 - wall.z1) ** 2);
        const angle = Math.atan2(wall.z2 - wall.z1, wall.x2 - wall.x1);
        const midX = (wall.x1 + wall.x2) / 2;
        const midZ = (wall.z1 + wall.z2) / 2;
        const midH = getHeight(midX, midZ);

        return (
          <mesh
            key={`wall-${i}`}
            position={[midX, midH + 1, midZ]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, 2, 0.4]} />
            <meshStandardMaterial color="#9a8a78" roughness={0.92} />
          </mesh>
        );
      })}

      {/* Wall gates */}
      {[
        { x: 0, z: -48, rot: 0 },   // South gate
        { x: 0, z: 48, rot: Math.PI }, // North gate
      ].map((gate, i) => (
        <group key={`gate-${i}`} position={[gate.x, getHeight(gate.x, gate.z), gate.z]} rotation={[0, gate.rot, 0]}>
          {/* Gate pillars */}
          <mesh position={[-2.5, 2.5, 0]} castShadow>
            <boxGeometry args={[1, 5, 1]} />
            <meshStandardMaterial color={STONE_MEDIUM} roughness={0.88} />
          </mesh>
          <mesh position={[2.5, 2.5, 0]} castShadow>
            <boxGeometry args={[1, 5, 1]} />
            <meshStandardMaterial color={STONE_MEDIUM} roughness={0.88} />
          </mesh>
          {/* Gate arch */}
          <mesh position={[0, 4.5, 0]} castShadow>
            <boxGeometry args={[6, 1.5, 0.8]} />
            <meshStandardMaterial color={STONE_DARK} roughness={0.85} />
          </mesh>
          {/* Gate opening */}
          <mesh position={[0, 2, 0.1]}>
            <boxGeometry args={[4, 4, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* ===== ABLUTION FOUNTAIN ===== */}
      <group position={[0, getHeight(0, -35), -35]}>
        {/* Basin */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2, 2.2, 0.8, 12]} />
          <meshStandardMaterial color={STONE_MEDIUM} roughness={0.85} />
        </mesh>
        {/* Water */}
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 0.1, 12]} />
          <meshStandardMaterial color="#4a7a8a" roughness={0.3} metalness={0.1} transparent opacity={0.8} />
        </mesh>
        {/* Central pillar */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.4, 1.6, 8]} />
          <meshStandardMaterial color={STONE_LIGHT} roughness={0.8} />
        </mesh>
      </group>

      {/* ===== TORCHES ===== */}
      {[[-20, -20], [20, -20], [-20, 20], [20, 20], [0, -35], [0, 35]].map(([x, z], i) => {
        const h = getHeight(x, z);
        return (
          <group key={`torch-${i}`} position={[x, h, z]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {nightFactor > 0.05 && (
              <>
                <mesh position={[0, 3.4, 0]}>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial
                    color="#ff8a3c"
                    emissive="#ff6a1c"
                    emissiveIntensity={1.2 + Math.sin(Date.now() * 0.005 + i) * 0.3}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight
                  position={[0, 3.5, 0]}
                  intensity={10 * nightFactor}
                  distance={35}
                  decay={1.8}
                  color="#ff9a4c"
                />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default QubaybatDecor;
