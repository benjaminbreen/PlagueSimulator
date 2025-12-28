/**
 * Christian Quarter (Bab Touma / Bab Sharqi) Decorations
 *
 * Historical context: In 14th century Damascus under Mamluk rule, the Christian Quarter
 * was located in the northeast of the old city, centered around the ancient Bab Touma
 * (Gate of Thomas) and Bab Sharqi (Eastern Gate) areas. This neighborhood housed:
 *
 * - Melkite (Eastern Orthodox) Christians - the largest Christian community
 * - Armenian Apostolic Christians - significant merchant community
 * - Syriac Orthodox (Jacobite) Christians - indigenous Aramaic speakers
 * - Small Jewish community
 * - Visiting Frankish (Italian) merchants from Venice, Genoa, Pisa
 *
 * The quarter featured distinctive Byzantine-influenced architecture, churches with
 * crosses (though bells were typically not rung under Islamic rule), wine shops
 * (Christians were permitted to make and sell wine), and narrow winding streets.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { getTerrainHeight, TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';

// Byzantine church cross component
const ByzantineCross: React.FC<{ height?: number; color?: string }> = ({
  height = 1.5,
  color = '#4a4a4a'
}) => {
  return (
    <group>
      {/* Vertical beam */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.08, height, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Horizontal beam (slightly below top) */}
      <mesh position={[0, height * 0.7, 0]} castShadow>
        <boxGeometry args={[height * 0.5, 0.08, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Small angled bottom beam (Orthodox style) */}
      <mesh position={[0, height * 0.25, 0]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[height * 0.3, 0.06, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
};

// Church dome (Byzantine style)
const ChurchDome: React.FC<{
  radius?: number;
  color?: string;
  drumHeight?: number;
}> = ({ radius = 2.5, color = '#5a6a7a', drumHeight = 1.5 }) => {
  return (
    <group>
      {/* Drum (cylindrical base of dome) */}
      <mesh position={[0, drumHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, drumHeight, 16]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>
      {/* Windows in drum */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={`window-${i}`}
            position={[
              Math.cos(angle) * (radius - 0.05),
              drumHeight / 2,
              Math.sin(angle) * (radius - 0.05)
            ]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.1, 0.8, 0.4]} />
            <meshStandardMaterial color="#2a2a3a" roughness={0.5} />
          </mesh>
        );
      })}
      {/* Main dome */}
      <mesh position={[0, drumHeight + radius * 0.4, 0]} castShadow receiveShadow>
        <sphereGeometry args={[radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Cross on top */}
      <group position={[0, drumHeight + radius * 0.8 + 0.5, 0]}>
        <ByzantineCross height={1.2} color="#3a3a3a" />
      </group>
    </group>
  );
};

// Wine shop/cellar entrance
const WineShopEntrance: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const hasBarrels = rand() > 0.3;
  const hasCross = rand() > 0.5;

  return (
    <group>
      {/* Arched entrance with recessed door */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2.4, 0.4]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>
      {/* Door recess */}
      <mesh position={[0, 1, 0.15]} castShadow>
        <boxGeometry args={[1.2, 2, 0.3]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
      </mesh>
      {/* Arch top */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>
      {/* Wine barrels outside */}
      {hasBarrels && (
        <>
          <mesh position={[-1.2, 0.4, 0.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.7, 12]} />
            <meshStandardMaterial color="#5a4030" roughness={0.85} />
          </mesh>
          <mesh position={[-1.2, 0.4, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.7, 12]} />
            <meshStandardMaterial color="#4a3525" roughness={0.85} />
          </mesh>
        </>
      )}
      {/* Small cross above door */}
      {hasCross && (
        <group position={[0, 2.6, 0.25]}>
          <ByzantineCross height={0.5} color="#6a5a4a" />
        </group>
      )}
    </group>
  );
};

// Stone fountain/well (common in churchyards)
const ChurchyardFountain: React.FC<{ seed: number }> = ({ seed }) => {
  return (
    <group>
      {/* Basin */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.3, 1, 12]} />
        <meshStandardMaterial color="#8a8a7a" roughness={0.8} />
      </mesh>
      {/* Inner basin (dark water) */}
      <mesh position={[0, 0.95, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.1, 12]} />
        <meshStandardMaterial color="#2a3a4a" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Central column */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 2, 8]} />
        <meshStandardMaterial color="#9a9a8a" roughness={0.75} />
      </mesh>
      {/* Cross on top */}
      <group position={[0, 2.7, 0]}>
        <ByzantineCross height={0.8} color="#5a5a5a" />
      </group>
    </group>
  );
};

// Small Armenian chapel
const ArmenianChapel: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const wallColor = '#d4c8b8';
  const roofColor = '#6a5a4a';

  return (
    <group>
      {/* Main building */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 5, 8]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Peaked roof */}
      <mesh position={[0, 5.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[4.5, 2.5, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      {/* Entrance arch */}
      <mesh position={[0, 1.5, 4.05]} castShadow>
        <boxGeometry args={[1.5, 3, 0.2]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
      </mesh>
      {/* Small dome on top */}
      <group position={[0, 6, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.8, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5a6a7a" roughness={0.6} />
        </mesh>
        <group position={[0, 1, 0]}>
          <ByzantineCross height={1} color="#3a3a3a" />
        </group>
      </group>
      {/* Stone cross near entrance */}
      <group position={[2.5, 0, 5]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 1, 0.8]} />
          <meshStandardMaterial color="#8a8a7a" roughness={0.8} />
        </mesh>
        <group position={[0, 1.2, 0]}>
          <ByzantineCross height={1.2} color="#6a6a5a" />
        </group>
      </group>
    </group>
  );
};

// Orthodox Church with Byzantine dome
const OrthodoxChurch: React.FC<{ seed: number; scale?: number }> = ({ seed, scale = 1 }) => {
  const wallColor = '#e4d4c4';
  const domeColor = '#5a7a8a';

  return (
    <group scale={[scale, scale, scale]}>
      {/* Main nave */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 7, 14]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Narthex (entrance vestibule) */}
      <mesh position={[0, 2, 8]} castShadow receiveShadow>
        <boxGeometry args={[8, 4, 3]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Apse (semicircular rear) */}
      <mesh position={[0, 3, -7.5]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4, 4, 6, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Main dome */}
      <group position={[0, 7, -1]}>
        <ChurchDome radius={3} color={domeColor} drumHeight={2} />
      </group>
      {/* Secondary smaller domes */}
      <group position={[-4, 6, 2]}>
        <ChurchDome radius={1.5} color={domeColor} drumHeight={1} />
      </group>
      <group position={[4, 6, 2]}>
        <ChurchDome radius={1.5} color={domeColor} drumHeight={1} />
      </group>
      {/* Main entrance door */}
      <mesh position={[0, 1.5, 9.55]} castShadow>
        <boxGeometry args={[2.5, 3, 0.2]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
      </mesh>
      {/* Windows (narrow arched) */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={`window-${i}`} position={[x, 4.5, 7.05]} castShadow>
          <boxGeometry args={[0.8, 2, 0.2]} />
          <meshStandardMaterial color="#2a3a4a" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// Frankish merchant warehouse/fondaco
const FrankishWarehouse: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const wallColor = '#d8c8b8';

  return (
    <group>
      {/* Main building - Italian style with more regular proportions */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 6, 10]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Flat roof with parapet */}
      <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.5, 0.4, 10.5]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Arcade on ground floor (Venetian style) */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <group key={`arcade-${i}`} position={[x, 1.5, 5.1]}>
          <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.5, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={wallColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.8, 0]} castShadow>
            <boxGeometry args={[1.5, 1.6, 0.5]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Upper floor windows (more regular, Italian style) */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={`upper-window-${i}`} position={[x, 4, 5.05]} castShadow>
          <boxGeometry args={[1.2, 1.5, 0.2]} />
          <meshStandardMaterial color="#2a3a4a" roughness={0.5} />
        </mesh>
      ))}
      {/* Goods/crates outside */}
      <mesh position={[-3, 0.4, 6]} castShadow>
        <boxGeometry args={[1, 0.8, 1.2]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
      </mesh>
      <mesh position={[-3.8, 0.3, 5.5]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Bell Tower (campanile style, though bells were rarely rung under Mamluk rule)
const BellTower: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const stoneColor = '#b8a898';

  return (
    <group>
      {/* Base foundation */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 1, 3.5]} />
        <meshStandardMaterial color="#a89888" roughness={0.9} />
      </mesh>
      {/* Main tower shaft */}
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 10, 3]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} />
      </mesh>
      {/* Bell chamber (open arches) */}
      <mesh position={[0, 12, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 3, 3.2]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} />
      </mesh>
      {/* Arched openings in bell chamber */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => (
        <mesh
          key={`arch-${i}`}
          position={[Math.sin(angle) * 1.65, 12, Math.cos(angle) * 1.65]}
          rotation={[0, angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, 2, 1.5]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.6} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* Pyramidal roof */}
      <mesh position={[0, 14.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[2.5, 3, 4]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.85} />
      </mesh>
      {/* Cross on top */}
      <group position={[0, 16.5, 0]}>
        <ByzantineCross height={1.5} color="#4a4a4a" />
      </group>
    </group>
  );
};

// Syriac Orthodox Monastery with scriptorium
const SyriacMonastery: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const wallColor = '#c8b8a8';
  const woodColor = '#5a4a3a';

  return (
    <group>
      {/* Main monastery building */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 6, 12]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Scriptorium wing (where manuscripts are copied) */}
      <mesh position={[6, 2, 3]} castShadow receiveShadow>
        <boxGeometry args={[4, 4, 6]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Small chapel attached */}
      <mesh position={[-5, 2.5, -3]} castShadow receiveShadow>
        <boxGeometry args={[4, 5, 6]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Chapel dome */}
      <group position={[-5, 5.5, -3]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.5, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5a6a7a" roughness={0.6} />
        </mesh>
        <group position={[0, 1.8, 0]}>
          <ByzantineCross height={1} color="#4a4a4a" />
        </group>
      </group>
      {/* Courtyard colonnade */}
      {[-3, -1, 1, 3].map((z, i) => (
        <group key={`column-${i}`} position={[4, 2, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.25, 0.25, 4, 8]} />
            <meshStandardMaterial color="#a89888" roughness={0.85} />
          </mesh>
          {/* Column capital */}
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.25, 0.4, 8]} />
            <meshStandardMaterial color="#a89888" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Wooden door */}
      <mesh position={[0, 1.5, 6.05]} castShadow>
        <boxGeometry args={[1.8, 3, 0.2]} />
        <meshStandardMaterial color={woodColor} roughness={0.95} />
      </mesh>
      {/* Small windows (scriptorium needs light) */}
      {[0, 2, 4].map((z, i) => (
        <mesh key={`window-${i}`} position={[8.05, 2.5, z]} castShadow>
          <boxGeometry args={[0.2, 1.2, 0.8]} />
          <meshStandardMaterial color="#3a4a5a" roughness={0.5} />
        </mesh>
      ))}
      {/* Stone cross marker outside */}
      <group position={[-3, 0, 6.5]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.6]} />
          <meshStandardMaterial color="#9a9a8a" roughness={0.8} />
        </mesh>
        <group position={[0, 1.2, 0]}>
          <ByzantineCross height={1} color="#6a6a5a" />
        </group>
      </group>
    </group>
  );
};

export const ChristianQuarterDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  heightmap?: TerrainHeightmap | null;
}> = ({ mapX, mapY, timeOfDay, terrainSeed, heightmap }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CHRISTIAN_QUARTER') return null;

  const time = timeOfDay ?? 12;
  const baseSeed = mapX * 1000 + mapY * 13 + 777;

  // Positions for main landmarks
  const landmarks = useMemo(() => {
    const rand = (offset: number) => seededRandom(baseSeed + offset);

    return {
      // Main Orthodox church (Melkite) - prominent position
      orthodoxChurch: [-15, -12] as [number, number],
      // Bell tower - near main church
      bellTower: [-10, -12] as [number, number],
      // Armenian chapel - smaller, near market area
      armenianChapel: [18, 8] as [number, number],
      // Syriac Orthodox monastery with scriptorium
      syriacMonastery: [-22, 10] as [number, number],
      // Churchyard fountain
      fountain: [-8, -8] as [number, number],
      // Wine shops scattered in the quarter
      wineShops: [
        [12, -15],
        [-20, 5],
        [8, 18],
      ] as [number, number][],
      // Frankish merchant warehouse
      frankishWarehouse: [22, -5] as [number, number],
    };
  }, [baseSeed]);

  // Additional decorative crosses on buildings
  const wallCrosses = useMemo(() => {
    const crosses: Array<{ pos: [number, number, number]; rotation: number }> = [];
    const rand = (offset: number) => seededRandom(baseSeed + offset);

    // Add several crosses at various positions
    for (let i = 0; i < 8; i++) {
      const angle = rand(i * 100) * Math.PI * 2;
      const dist = 15 + rand(i * 101) * 15;
      crosses.push({
        pos: [
          Math.cos(angle) * dist,
          2 + rand(i * 102) * 2,
          Math.sin(angle) * dist
        ],
        rotation: rand(i * 103) * Math.PI * 2
      });
    }
    return crosses;
  }, [baseSeed]);

  const getHeight = (x: number, z: number) => {
    if (heightmap) {
      return sampleTerrainHeight(heightmap, x, z);
    }
    return getTerrainHeight(district, x, z, terrainSeed);
  };

  return (
    <group>
      {/* Main Orthodox Church (Melkite/Eastern Orthodox) */}
      <group position={[
        landmarks.orthodoxChurch[0],
        getHeight(landmarks.orthodoxChurch[0], landmarks.orthodoxChurch[1]),
        landmarks.orthodoxChurch[1]
      ]}>
        <OrthodoxChurch seed={baseSeed + 1} scale={1} />
      </group>

      {/* Bell Tower - Near main church */}
      <group position={[
        landmarks.bellTower[0],
        getHeight(landmarks.bellTower[0], landmarks.bellTower[1]),
        landmarks.bellTower[1]
      ]}>
        <BellTower seed={baseSeed + 5} />
      </group>

      {/* Armenian Chapel */}
      <group position={[
        landmarks.armenianChapel[0],
        getHeight(landmarks.armenianChapel[0], landmarks.armenianChapel[1]),
        landmarks.armenianChapel[1]
      ]} rotation={[0, Math.PI / 4, 0]}>
        <ArmenianChapel seed={baseSeed + 2} />
      </group>

      {/* Syriac Orthodox Monastery */}
      <group position={[
        landmarks.syriacMonastery[0],
        getHeight(landmarks.syriacMonastery[0], landmarks.syriacMonastery[1]),
        landmarks.syriacMonastery[1]
      ]} rotation={[0, -Math.PI / 6, 0]}>
        <SyriacMonastery seed={baseSeed + 6} />
      </group>

      {/* Churchyard Fountain */}
      <group position={[
        landmarks.fountain[0],
        getHeight(landmarks.fountain[0], landmarks.fountain[1]),
        landmarks.fountain[1]
      ]}>
        <ChurchyardFountain seed={baseSeed + 3} />
      </group>

      {/* Wine Shops */}
      {landmarks.wineShops.map((pos, i) => (
        <group
          key={`wine-shop-${i}`}
          position={[pos[0], getHeight(pos[0], pos[1]), pos[1]]}
          rotation={[0, seededRandom(baseSeed + 50 + i) * Math.PI * 2, 0]}
        >
          <WineShopEntrance seed={baseSeed + 100 + i} />
        </group>
      ))}

      {/* Frankish Merchant Warehouse */}
      <group position={[
        landmarks.frankishWarehouse[0],
        getHeight(landmarks.frankishWarehouse[0], landmarks.frankishWarehouse[1]),
        landmarks.frankishWarehouse[1]
      ]} rotation={[0, -Math.PI / 6, 0]}>
        <FrankishWarehouse seed={baseSeed + 4} />
      </group>

      {/* Decorative wall crosses */}
      {wallCrosses.map((cross, i) => (
        <group
          key={`wall-cross-${i}`}
          position={[cross.pos[0], getHeight(cross.pos[0], cross.pos[2]) + cross.pos[1], cross.pos[2]]}
          rotation={[0, cross.rotation, 0]}
        >
          <ByzantineCross height={0.6} color="#7a6a5a" />
        </group>
      ))}

      {/* Stone benches near church (for rest) */}
      {[[-12, -6], [-18, -10]].map((pos, i) => (
        <mesh
          key={`bench-${i}`}
          position={[pos[0], getHeight(pos[0], pos[1]) + 0.25, pos[1]]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2, 0.5, 0.6]} />
          <meshStandardMaterial color="#9a9a8a" roughness={0.85} />
        </mesh>
      ))}

      {/* Olive oil lamps (Christians used these in worship) */}
      {time >= 18 || time < 6 ? (
        <>
          {[[-15, -5], [-8, -10], [18, 10]].map((pos, i) => (
            <group key={`lamp-${i}`} position={[pos[0], getHeight(pos[0], pos[1]) + 1.8, pos[1]]}>
              {/* Lamp base */}
              <mesh castShadow>
                <cylinderGeometry args={[0.15, 0.12, 0.2, 8]} />
                <meshStandardMaterial color="#8a6a4a" roughness={0.7} />
              </mesh>
              {/* Warm light glow at night */}
              <pointLight
                color="#ffaa55"
                intensity={0.5}
                distance={8}
                decay={2}
              />
            </group>
          ))}
        </>
      ) : null}
    </group>
  );
};
