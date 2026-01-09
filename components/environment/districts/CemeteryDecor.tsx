/**
 * Cemetery (Qabristan) District Decorations
 * Islamic cemetery outside Damascus city walls (1348 CE)
 * Features: Qibla-oriented graves with authentic 14th century shapes, cypress trees, tomb structures, keeper shacks
 * Reflects escalating plague impact through visual progression
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';
import { CACHED_WOOD_TEXTURES, DARK_FOLIAGE_MATERIAL } from '../../../utils/environment/wood';

// Shared trunk material for cypress trees
const CYPRESS_TRUNK_MATERIAL = new THREE.MeshStandardMaterial({
  map: CACHED_WOOD_TEXTURES.walnut,
  roughness: 0.95,
  color: new THREE.Color('#5a4a3a'),
});

// Qibla direction from Damascus to Mecca: approximately 190 degrees (SSW)
const QIBLA_ANGLE = (190 * Math.PI) / 180;

// Historically accurate 14th century Islamic grave marker shapes
type GraveShape = 'rectangular' | 'arch' | 'peaked' | 'platform';

interface GraveData {
  position: [number, number, number];
  rotation: number; // Perpendicular to qibla
  type: 'flat' | 'raised' | 'double_marker' | 'ornate';
  shape: GraveShape; // 14th century Islamic marker design
  scale: number;
}

interface TombData {
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
  hasDome: boolean;
}

interface ShackData {
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
}

// Custom geometry creators for authentic Islamic grave markers
const createArchTopGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const width = 0.35;
  const height = 0.8;
  const archRadius = width / 2;

  // Start at bottom left
  shape.moveTo(-width / 2, -height / 2);
  // Right side up
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2 - archRadius);
  // Arch top
  shape.absarc(0, height / 2 - archRadius, archRadius, 0, Math.PI, false);
  // Back down left side
  shape.lineTo(-width / 2, -height / 2);

  const extrudeSettings = {
    depth: 0.08,
    bevelEnabled: false
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

const createPeakedTopGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const width = 0.38;
  const height = 0.85;
  const peakHeight = 0.15;

  // Start at bottom left
  shape.moveTo(-width / 2, -height / 2);
  // Right side
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2 - peakHeight);
  // Peak
  shape.lineTo(0, height / 2);
  shape.lineTo(-width / 2, height / 2 - peakHeight);
  // Back to start
  shape.lineTo(-width / 2, -height / 2);

  const extrudeSettings = {
    depth: 0.09,
    bevelEnabled: false
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

export const CemeteryDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  onTreePositionsGenerated?: (trees: Array<[number, number, number]>) => void;
  buildingPositions?: Array<[number, number, number]>;
  heightmap?: TerrainHeightmap | null;
  plagueProgress?: number; // 0-1, how far into the plague (for visual progression)
}> = ({
  mapX,
  mapY,
  timeOfDay,
  terrainSeed,
  onTreePositionsGenerated,
  buildingPositions = [],
  heightmap,
  plagueProgress = 0.5
}) => {
  const district = getDistrictType(mapX, mapY);
  // QUBAYBAT ("Little Domes") now has its own dedicated decor component
  if (district !== 'CEMETERY') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Torch positions: central corners only (4 torches for performance)
  const torchPositions = useMemo(() => {
    const positions: Array<[number, number]> = [];

    // Four corners of central area
    positions.push([-18, -18], [18, -18], [-18, 18], [18, 18]);

    return positions;
  }, []);

  const seed = mapX * 1000 + mapY + terrainSeed;

  const getHeight = (x: number, z: number): number => {
    return heightmap ? sampleTerrainHeight(heightmap, x, z) : 0;
  };

  // Memoized custom geometries
  const archTopGeometry = useMemo(() => createArchTopGeometry(), []);
  const peakedTopGeometry = useMemo(() => createPeakedTopGeometry(), []);

  // ==================== CYPRESS TREES ====================
  const cypressTrees = useMemo(() => {
    const trees: Array<[number, number, number]> = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    // Main entrance avenue (south) - ceremonial cypress
    for (let i = 0; i < 6; i++) {
      const x = -20 + i * 8;
      const z = -45;
      trees.push([x, getHeight(x, z), z]);
    }

    // Scattered throughout cemetery perimeter
    const positions = [
      [-42, -25], [-42, 0], [-42, 25],
      [42, -25], [42, 0], [42, 25],
      [-25, 42], [0, 42], [25, 42],
      [-25, -38], [0, -38], [25, -38],
    ];

    positions.forEach(([x, z], i) => {
      const jitterX = (rand(i * 2 + 300) - 0.5) * 4;
      const jitterZ = (rand(i * 2 + 301) - 0.5) * 4;
      const finalX = x + jitterX;
      const finalZ = z + jitterZ;
      trees.push([finalX, getHeight(finalX, finalZ), finalZ]);
    });

    return trees;
  }, [seed, heightmap]);

  useEffect(() => {
    if (onTreePositionsGenerated) {
      onTreePositionsGenerated(cypressTrees);
    }
  }, [onTreePositionsGenerated, cypressTrees]);

  // ==================== GRAVES ====================
  // 48 main graves + up to 12 plague graves = 48-60 total
  const graves = useMemo(() => {
    const graveData: GraveData[] = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    // Main cemetery section - organic clusters around pathways
    const gravePositions = [
      // Northwest cluster
      [-30, -25], [-28, -22], [-32, -20], [-26, -18],
      [-30, -15], [-34, -14], [-28, -12], [-32, -10],

      // Northeast cluster
      [28, -24], [32, -22], [26, -19], [30, -17],
      [34, -15], [28, -13], [32, -11], [26, -9],

      // West cluster
      [-35, -5], [-32, -2], [-38, 0], [-34, 3],
      [-30, 5], [-36, 8], [-32, 10], [-34, 12],

      // East cluster
      [32, -4], [36, -1], [30, 2], [34, 5],
      [38, 7], [32, 10], [36, 12], [30, 14],

      // South cluster (older, well-maintained)
      [-20, 18], [-16, 20], [-22, 23], [-18, 25],
      [-14, 28], [-20, 30], [-16, 32], [-18, 34],

      [18, 18], [22, 20], [16, 23], [20, 25],
      [24, 28], [18, 30], [22, 32], [20, 34],
    ];

    gravePositions.forEach(([x, z], i) => {
      const h = getHeight(x, z);
      const jitterX = (rand(i * 5 + 600) - 0.5) * 0.8;
      const jitterZ = (rand(i * 5 + 601) - 0.5) * 0.8;
      const rotJitter = (rand(i * 5 + 602) - 0.5) * 0.15;

      // Determine grave type
      let type: 'flat' | 'raised' | 'double_marker' | 'ornate';
      const typeRoll = rand(i * 5 + 603);
      if (typeRoll < 0.40) type = 'flat';
      else if (typeRoll < 0.70) type = 'raised';
      else if (typeRoll < 0.90) type = 'double_marker';
      else type = 'ornate';

      // Determine shape (14th century Islamic designs)
      // Rarity: rectangular (50%) > arch (30%) > peaked (15%) > platform (5%)
      let shape: GraveShape;
      const shapeRoll = rand(i * 5 + 604);
      if (shapeRoll < 0.50) shape = 'rectangular'; // Simple stele (most common)
      else if (shapeRoll < 0.80) shape = 'arch'; // Mihrab-inspired arch top
      else if (shapeRoll < 0.95) shape = 'peaked'; // Pointed/peaked top
      else shape = 'platform'; // Flat elevated platform (elite)

      graveData.push({
        position: [x + jitterX, h, z + jitterZ],
        rotation: QIBLA_ANGLE + rotJitter,
        type,
        shape,
        scale: 1.2 + rand(i * 5 + 605) * 0.6 // Larger graves: 1.2-1.8
      });
    });

    // Plague victims section (new, more chaotic)
    if (plagueProgress > 0.3) {
      const plagueGraves = Math.floor(plagueProgress * 12);
      for (let i = 0; i < plagueGraves; i++) {
        const x = -15 + rand(i + 800) * 30;
        const z = -35 + rand(i + 801) * 15;
        const h = getHeight(x, z);

        graveData.push({
          position: [x, h, z],
          rotation: QIBLA_ANGLE + (rand(i + 802) - 0.5) * 0.4,
          type: 'flat',
          shape: 'rectangular', // Mass burials get simple markers only
          scale: 0.7 + rand(i + 803) * 0.2
        });
      }
    }

    return graveData;
  }, [seed, plagueProgress, heightmap]);

  // ==================== TOMB STRUCTURES ====================
  const tombs = useMemo(() => {
    const tombData: TombData[] = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    const tombPositions = [
      [-40, -35], // Northwest corner
      [40, -32],  // Northeast corner
      [-38, 35],  // Southwest corner
      [38, 38],   // Southeast corner
    ];

    tombPositions.forEach(([x, z], i) => {
      const h = getHeight(x, z);
      const width = 3.0 + rand(i + 1000) * 0.8;
      const depth = 3.0 + rand(i + 1001) * 0.8;
      const height = 2.5 + rand(i + 1002) * 1.0;
      const hasDome = rand(i + 1003) > 0.4;

      tombData.push({
        position: [x, h, z],
        rotation: rand(i + 1004) * Math.PI * 2,
        size: [width, height, depth],
        hasDome
      });
    });

    return tombData;
  }, [seed, heightmap]);

  // ==================== GRAVE KEEPER SHACKS ====================
  const shacks = useMemo(() => {
    const shackData: ShackData[] = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    const shackPositions = [
      { x: -45, z: -40, name: 'grave_digger' },
      { x: 45, z: -38, name: 'tool_shed' },
      { x: -43, z: 40, name: 'keeper' },
      { x: 0, z: -48, name: 'gate_house' },
    ];

    shackPositions.slice(0, 3 + (plagueProgress > 0.7 ? 1 : 0)).forEach(({ x, z }, i) => {
      const h = getHeight(x, z);
      const width = 2.5 + rand(i + 1100) * 0.5;
      const height = 2.0 + rand(i + 1101) * 0.5;
      const depth = 2.5 + rand(i + 1102) * 0.5;

      shackData.push({
        position: [x, h, z],
        rotation: rand(i + 1103) * Math.PI * 2,
        size: [width, height, depth]
      });
    });

    return shackData;
  }, [seed, plagueProgress, heightmap]);

  // ==================== CEMETERY WALLS ====================
  const wallSegments = useMemo(() => {
    interface WallSegment {
      start: [number, number, number];
      end: [number, number, number];
      height: number;
    }

    const walls: WallSegment[] = [];

    const segments = [
      // North wall
      { x1: -48, z1: 48, x2: -20, z2: 48, height: 1.6 },
      { x1: 20, z1: 48, x2: 48, z2: 48, height: 1.6 },
      // East wall
      { x1: 48, z1: 48, x2: 48, z2: 20, height: 1.6 },
      { x1: 48, z1: -20, x2: 48, z2: -48, height: 1.6 },
      // South wall (main gate)
      { x1: -48, z1: -48, x2: -25, z2: -48, height: 1.6 },
      { x1: 25, z1: -48, x2: 48, z2: -48, height: 1.6 },
      // West wall
      { x1: -48, z1: -48, x2: -48, z2: -20, height: 1.6 },
      { x1: -48, z1: 20, x2: -48, z2: 48, height: 1.6 },
    ];

    segments.forEach(({ x1, z1, x2, z2, height }) => {
      const h1 = getHeight(x1, z1);
      const h2 = getHeight(x2, z2);
      walls.push({
        start: [x1, h1, z1],
        end: [x2, h2, z2],
        height
      });
    });

    return walls;
  }, [seed, heightmap]);

  // ==================== OPEN GRAVES ====================
  const openGraves = useMemo(() => {
    const graves: Array<[number, number, number]> = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    const graveCount = Math.floor(plagueProgress * 8);

    for (let i = 0; i < graveCount; i++) {
      const x = -20 + rand(i + 1200) * 40;
      const z = -30 + rand(i + 1201) * 20;
      graves.push([x, getHeight(x, z), z]);
    }

    return graves;
  }, [seed, plagueProgress, heightmap]);

  // ==================== FUNERAL TENTS ====================
  const funeralTents = useMemo(() => {
    const tents: Array<{ position: [number, number, number]; rotation: number }> = [];
    const rand = (offset: number) => seededRandom(seed + offset);

    const tentCount = Math.min(2, Math.floor(plagueProgress * 3) + 1);

    for (let i = 0; i < tentCount; i++) {
      const x = -30 + i * 30;
      const z = -5 + rand(i + 1300) * 10;
      tents.push({
        position: [x, getHeight(x, z), z],
        rotation: rand(i + 1301) * Math.PI * 2
      });
    }

    return tents;
  }, [seed, plagueProgress, heightmap]);

  // ==================== RENDERING ====================

  // Refs for grave shapes
  const graveRectangularRef = useRef<THREE.InstancedMesh>(null);
  const graveArchRef = useRef<THREE.InstancedMesh>(null);
  const gravePeakedRef = useRef<THREE.InstancedMesh>(null);
  const gravePlatformRef = useRef<THREE.InstancedMesh>(null);

  const cypressTrunkRef = useRef<THREE.InstancedMesh>(null);
  const cypressCanopyRef = useRef<THREE.InstancedMesh>(null);
  const tombRef = useRef<THREE.InstancedMesh>(null);
  const tombDomeRef = useRef<THREE.InstancedMesh>(null);

  const tempObj = useMemo(() => new THREE.Object3D(), []);

  // Setup graves by shape
  useEffect(() => {
    const rectangularGraves = graves.filter(g => g.shape === 'rectangular');
    const archGraves = graves.filter(g => g.shape === 'arch');
    const peakedGraves = graves.filter(g => g.shape === 'peaked');
    const platformGraves = graves.filter(g => g.shape === 'platform');

    // Rectangular (simple stele) - most common
    if (graveRectangularRef.current && rectangularGraves.length > 0) {
      rectangularGraves.forEach((grave, i) => {
        tempObj.position.set(grave.position[0], grave.position[1] + 0.5, grave.position[2]);
        tempObj.rotation.set(0, grave.rotation, 0);
        tempObj.scale.set(grave.scale, grave.scale, grave.scale);
        tempObj.updateMatrix();
        graveRectangularRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      graveRectangularRef.current.instanceMatrix.needsUpdate = true;
    }

    // Arch top (mihrab-inspired)
    if (graveArchRef.current && archGraves.length > 0) {
      archGraves.forEach((grave, i) => {
        tempObj.position.set(grave.position[0], grave.position[1] + 0.5, grave.position[2]);
        tempObj.rotation.set(0, grave.rotation, 0); // Same as rectangular
        tempObj.scale.set(grave.scale, grave.scale, grave.scale);
        tempObj.updateMatrix();
        graveArchRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      graveArchRef.current.instanceMatrix.needsUpdate = true;
    }

    // Peaked top
    if (gravePeakedRef.current && peakedGraves.length > 0) {
      peakedGraves.forEach((grave, i) => {
        tempObj.position.set(grave.position[0], grave.position[1] + 0.5, grave.position[2]);
        tempObj.rotation.set(0, grave.rotation, 0); // Same as rectangular
        tempObj.scale.set(grave.scale, grave.scale, grave.scale);
        tempObj.updateMatrix();
        gravePeakedRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      gravePeakedRef.current.instanceMatrix.needsUpdate = true;
    }

    // Platform (flat elevated style for elite)
    if (gravePlatformRef.current && platformGraves.length > 0) {
      platformGraves.forEach((grave, i) => {
        tempObj.position.set(grave.position[0], grave.position[1] + 0.35, grave.position[2]);
        tempObj.rotation.set(0, grave.rotation, 0);
        tempObj.scale.set(grave.scale, grave.scale, grave.scale);
        tempObj.updateMatrix();
        gravePlatformRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      gravePlatformRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [graves, tempObj]);

  // Setup cypress trees
  useEffect(() => {
    if (cypressTrunkRef.current && cypressCanopyRef.current) {
      cypressTrees.forEach((pos, i) => {
        tempObj.position.set(pos[0], pos[1] + 2.5, pos[2]);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        cypressTrunkRef.current!.setMatrixAt(i, tempObj.matrix);

        tempObj.position.set(pos[0], pos[1] + 4.5, pos[2]);
        tempObj.updateMatrix();
        cypressCanopyRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      cypressTrunkRef.current.instanceMatrix.needsUpdate = true;
      cypressCanopyRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [cypressTrees, tempObj]);

  // Setup tomb structures
  useEffect(() => {
    if (tombRef.current && tombs.length > 0) {
      tombs.forEach((tomb, i) => {
        tempObj.position.set(tomb.position[0], tomb.position[1] + tomb.size[1] / 2, tomb.position[2]);
        tempObj.rotation.set(0, tomb.rotation, 0);
        tempObj.scale.set(tomb.size[0], tomb.size[1], tomb.size[2]);
        tempObj.updateMatrix();
        tombRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      tombRef.current.instanceMatrix.needsUpdate = true;
    }

    if (tombDomeRef.current && tombs.length > 0) {
      tombs.filter(t => t.hasDome).forEach((tomb, i) => {
        tempObj.position.set(tomb.position[0], tomb.position[1] + tomb.size[1] + 0.8, tomb.position[2]);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(tomb.size[0] * 1.7, tomb.size[0] * 0.8, tomb.size[2] * 0.7);
        tempObj.updateMatrix();
        tombDomeRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      tombDomeRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [tombs, tempObj]);

  const rectangularCount = graves.filter(g => g.shape === 'rectangular').length;
  const archCount = graves.filter(g => g.shape === 'arch').length;
  const peakedCount = graves.filter(g => g.shape === 'peaked').length;
  const platformCount = graves.filter(g => g.shape === 'platform').length;
  const domeCount = tombs.filter(t => t.hasDome).length;

  return (
    <group>
      {/* ===== GRAVESTONES - 14TH CENTURY ISLAMIC SHAPES ===== */}

      {/* Rectangular stele (50% - most common, default) */}
      {rectangularCount > 0 && (
        <instancedMesh ref={graveRectangularRef} args={[undefined, undefined, rectangularCount]} castShadow>
          <boxGeometry args={[0.95, 0.8, 0.08]} />
          <meshStandardMaterial color="#7a7a6a" roughness={0.95} />
        </instancedMesh>
      )}

      {/* Arch top stele (30% - mihrab-inspired, middle class) */}
      {archCount > 0 && (
        <instancedMesh ref={graveArchRef} args={[archTopGeometry, undefined, archCount]} castShadow>
          <meshStandardMaterial color="#8a8a78" roughness={0.92} />
        </instancedMesh>
      )}

      {/* Peaked top stele (15% - pointed top, wealthier) */}
      {peakedCount > 0 && (
        <instancedMesh ref={gravePeakedRef} args={[peakedTopGeometry, undefined, peakedCount]} castShadow>
          <meshStandardMaterial color="#9a9a88" roughness={0.90} />
        </instancedMesh>
      )}

      {/* Platform graves (5% - flat elevated platform, elite/scholars) */}
      {platformCount > 0 && (
        <instancedMesh ref={gravePlatformRef} args={[undefined, undefined, platformCount]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.5, 1.2]} />
          <meshStandardMaterial color="#a89888" roughness={0.98} />
        </instancedMesh>
      )}

      {/* Platform borders (raised edges for elite graves) */}
      {graves.filter(g => g.shape === 'platform').map((grave, i) => (
        <group key={`platform-${i}`} position={grave.position} rotation={[0, grave.rotation, 0]}>
          {/* Border stones */}
          <mesh position={[0, 0.3, 0.6 * grave.scale]} castShadow>
            <boxGeometry args={[1.8 * grave.scale, 0.15, 0.08]} />
            <meshStandardMaterial color="#9a8a78" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.3, -0.6 * grave.scale]} castShadow>
            <boxGeometry args={[1.8 * grave.scale, 0.15, 0.08]} />
            <meshStandardMaterial color="#9a8a78" roughness={0.92} />
          </mesh>
          <mesh position={[0.9 * grave.scale, 0.3, 0]} castShadow>
            <boxGeometry args={[0.08, 0.15, 1.2 * grave.scale]} />
            <meshStandardMaterial color="#9a8a78" roughness={0.92} />
          </mesh>
          <mesh position={[-0.9 * grave.scale, 0.3, 0]} castShadow>
            <boxGeometry args={[0.08, 0.15, 1.2 * grave.scale]} />
            <meshStandardMaterial color="#9a8a78" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Mounds for raised graves (turba) - horizontal pedestals */}
      {graves.filter(g => g.type === 'raised').map((grave, i) => (
        <mesh
          key={`mound-${i}`}
          position={[grave.position[0], grave.position[1] + 0.15, grave.position[2]]}
          rotation={[-Math.PI / 0.1, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.8 * grave.scale, 0.9 * grave.scale, 0.3, 16]} />
          <meshStandardMaterial color="#6a6a58" roughness={1.0} />
        </mesh>
      ))}

      {/* Foot stones for double marker graves */}
      {graves.filter(g => g.type === 'double_marker').map((grave, i) => {
        const footX = grave.position[0] + Math.sin(grave.rotation) * 0.5;
        const footZ = grave.position[2] + Math.cos(grave.rotation) * 1.5;

        return (
          <mesh
            key={`foot-${i}`}
            position={[footX, grave.position[1] + 0.3, footZ]}
            rotation={[0.3, grave.rotation, 0]}
            castShadow
          >
            {grave.shape === 'rectangular' && (
              <boxGeometry args={[0.35 * grave.scale, 0.8 * grave.scale, 0.08 * grave.scale]} />
            )}
            {grave.shape === 'arch' && (
              <primitive object={archTopGeometry.clone().scale(grave.scale * 0.9, grave.scale * 0.6, grave.scale * 0.6)} />
            )}
            {grave.shape === 'peaked' && (
              <primitive object={peakedTopGeometry.clone().scale(grave.scale * 0.9, grave.scale * 0.6, grave.scale * 0.6)} />
            )}
            <meshStandardMaterial color="#7a7a68" roughness={0.94} />
          </mesh>
        );
      })}

      {/* ===== CYPRESS TREES ===== */}
      {cypressTrees.length > 0 && (
        <>
          <instancedMesh ref={cypressTrunkRef} args={[undefined, undefined, cypressTrees.length]} castShadow material={CYPRESS_TRUNK_MATERIAL}>
            <cylinderGeometry args={[0., 0.22, 8.0, 8]} />
          </instancedMesh>
          <instancedMesh ref={cypressCanopyRef} args={[undefined, undefined, cypressTrees.length]} castShadow material={DARK_FOLIAGE_MATERIAL}>
            <coneGeometry args={[1.0, 4.5, 8]} />
          </instancedMesh>
        </>
      )}

      {/* ===== GRAVE KEEPER SHACKS ===== */}
      {shacks.map((shack, i) => (
        <group key={`shack-${i}`} position={shack.position} rotation={[0, shack.rotation, 0]}>
          <mesh position={[0, shack.size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={shack.size} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
          <mesh position={[0, shack.size[1] + 0.1, 0]} castShadow>
            <boxGeometry args={[shack.size[0] + 0.2, 0.15, shack.size[2] + 0.2]} />
            <meshStandardMaterial color="#7a6a5a" roughness={0.95} />
          </mesh>
          <mesh position={[0, shack.size[1] * 0.4, shack.size[2] / 2 + 0.05]} castShadow>
            <boxGeometry args={[0.6, shack.size[1] * 0.7, 0.05]} />
            <meshStandardMaterial color="#5a4a3a" roughness={1.0} />
          </mesh>
        </group>
      ))}

      {/* ===== CEMETERY WALLS ===== */}
      {wallSegments.map((wall, i) => {
        const dx = wall.end[0] - wall.start[0];
        const dz = wall.end[2] - wall.start[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const midX = (wall.start[0] + wall.end[0]) / 2;
        const midZ = (wall.start[2] + wall.end[2]) / 2;
        const midY = (wall.start[1] + wall.end[1]) / 2;

        return (
          <mesh
            key={`wall-${i}`}
            position={[midX, midY + wall.height / 2, midZ]}
            rotation={[0, angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, wall.height, 0.3]} />
            <meshStandardMaterial color="#9a8a7a" roughness={0.95} />
          </mesh>
        );
      })}

      {/* ===== OPEN GRAVES ===== */}
      {openGraves.map((pos, i) => (
        <group key={`open-grave-${i}`} position={pos} rotation={[0, QIBLA_ANGLE, 0]}>
          <mesh position={[1.2, 0.25, 0]} castShadow>
            <boxGeometry args={[1.0, 0.5, 1.5]} />
            <meshStandardMaterial color="#5a4a3a" roughness={1.0} />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1.2, 2.0]} />
            <meshStandardMaterial color="#2a2a2a" roughness={1.0} />
          </mesh>
          {plagueProgress > 0.5 && i % 2 === 0 && (
            <mesh position={[0.5, 0.3, 0.8]} rotation={[0, 0, Math.PI / 6]} castShadow>
              <boxGeometry args={[0.05, 1.2, 0.05]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}

      {/* ===== FUNERAL TENTS ===== */}
      {funeralTents.map((tent, i) => (
        <group key={`tent-${i}`} position={tent.position} rotation={[0, tent.rotation, 0]}>
          {[[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].map(([x, z], j) => (
            <mesh key={j} position={[x, 1.3, z]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 2.6, 0]} castShadow>
            <boxGeometry args={[4.0, 0.05, 4.0]} />
            <meshStandardMaterial color="#c8b8a8" roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.7, -2.0]} castShadow>
            <boxGeometry args={[4.0, 1.8, 0.05]} />
            <meshStandardMaterial
              color="#d8c8b8"
              roughness={0.95}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* ===== DRY GRASS PATCHES ===== */}
      {[
        [-28, -20], [-18, -25], [22, -22], [28, -18],
        [-32, 8], [-25, 15], [26, 10], [32, 18],
        [-15, 28], [0, 30], [18, 32],
      ].map(([x, z], i) => {
        const h = getHeight(x, z);
        return (
          <mesh key={`grass-${i}`} position={[x, h + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[1.8 + (i % 3) * 0.4, 8]} />
            <meshStandardMaterial color="#7a7a5a" roughness={1.0} />
          </mesh>
        );
      })}

      {/* ===== PRAYER RUGS ===== */}
      {funeralTents.map((tent, i) => (
        <mesh
          key={`rug-${i}`}
          position={[tent.position[0] + 0.8, tent.position[1] + 0.01, tent.position[2]]}
          rotation={[-Math.PI / 2, 0, QIBLA_ANGLE]}
          receiveShadow
        >
          <planeGeometry args={[1.1, 0.7]} />
          <meshStandardMaterial color="#8a4a4a" roughness={0.95} />
        </mesh>
      ))}

      {/* ===== WATER BASINS ===== */}
      {[-30, 0, 30].map((x, i) => {
        const z = -46;
        const h = getHeight(x, z);
        return (
          <group key={`basin-${i}`} position={[x, h, z]}>
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.45, 0.55, 0.7, 12]} />
              <meshStandardMaterial color="#a89888" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.43, 0.43, 0.25, 12]} />
              <meshStandardMaterial color="#4a6a7a" roughness={0.6} metalness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* ===== PATHWAYS ===== */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.0, 80]} />
        <meshStandardMaterial color="#9a8a78" roughness={1.0} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[3.0, 70]} />
        <meshStandardMaterial color="#9a8a78" roughness={1.0} />
      </mesh>

      {/* ===== TORCHES ===== */}
      {torchPositions.map(([x, z], i) => {
        const h = getHeight(x, z);

        return (
          <group key={`torch-${i}`} position={[x, h, z]}>
            {/* Torch post */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
            </mesh>
            {/* Torch top */}
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[0.2, 0.4, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            {/* Flame (only visible at night/dusk/dawn) */}
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
                  intensity={12 * nightFactor}
                  distance={40}
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
