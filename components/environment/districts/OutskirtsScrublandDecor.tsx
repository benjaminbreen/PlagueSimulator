/**
 * Scrubland Outskirts Decorations
 * Realistic 14th century Damascus scrublands just beyond the city walls
 * Features sparse buildings, Mediterranean trees (oak, pistachio, carob),
 * wild herbs, rocky terrain, and occasional wells
 */

import React from 'react';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import { BedouinTent } from '../decorations/BedouinTent';

export const OutskirtsScrublandDecor: React.FC<{ mapX: number; mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'OUTSKIRTS_SCRUBLAND') return null;

  const seed = mapX * 89 + mapY * 151;
  const rand = (offset: number) => seededRandom(seed + offset);

  const areaHalf = 32;
  const trackAngle = rand(900) * Math.PI * 2;
  const trackDir: [number, number] = [Math.cos(trackAngle), Math.sin(trackAngle)];
  const trackPerp: [number, number] = [-trackDir[1], trackDir[0]];
  const trackOrigin = [
    (rand(905) - 0.5) * areaHalf * 0.9,
    0,
    (rand(915) - 0.5) * areaHalf * 0.9
  ] as [number, number, number];
  const trackPoint = (t: number, offset: number): [number, number, number] => [
    trackOrigin[0] + trackDir[0] * t + trackPerp[0] * offset,
    0,
    trackOrigin[2] + trackDir[1] * t + trackPerp[1] * offset
  ];
  const scatterPoint = (offsetSeed: number, minRadius = 8): [number, number, number] => {
    let attempt = 0;
    while (attempt < 8) {
      const x = (rand(offsetSeed + attempt * 3) - 0.5) * areaHalf * 2;
      const z = (rand(offsetSeed + attempt * 3 + 1) - 0.5) * areaHalf * 2;
      const d = Math.hypot(x, z);
      if (d >= minRadius) return [x, 0, z];
      attempt += 1;
    }
    const fallback = minRadius + rand(offsetSeed + 99) * (areaHalf - minRadius);
    return [trackOrigin[0] + trackDir[0] * fallback, 0, trackOrigin[2] + trackDir[1] * fallback];
  };

  // Bedouin tent spawning (0-1 tent)
  const hasTent = rand(600) > 0.5;
  const tent = hasTent ? {
    pos: trackPoint((rand(610) - 0.5) * areaHalf * 1.6, (rand(620) - 0.5) * 8),
    seed: seed + 777
  } : null;

  // 2-3 buildings max: farms, hovels, or shepherd shelters
  const buildingType = rand(5) > 0.5 ? 'farm' : 'hovel';
  const buildingCount = 2 + Math.floor(rand(10) * 2); // 2-3 buildings
  const buildings: Array<{
    pos: [number, number, number];
    size: [number, number];
    rotation: number;
    type: 'farm' | 'hovel' | 'shelter';
  }> = [];

  for (let i = 0; i < buildingCount; i++) {
    const t = (rand(20 + i) - 0.5) * areaHalf * 1.4;
    const offset = (rand(30 + i) - 0.5) * 8 + (i === 0 ? 0 : (rand(35 + i) > 0.6 ? 7 : -7));
    const type = i === 0 ? buildingType : (rand(35 + i) > 0.6 ? 'hovel' : 'shelter');
    buildings.push({
      pos: trackPoint(t, offset),
      size: type === 'shelter' ? [2.0, 1.8] : [3.5 + rand(40 + i) * 1.0, 3.0 + rand(45 + i) * 0.8],
      rotation: trackAngle + (rand(50 + i) - 0.5) * 0.6,
      type
    });
  }

  // Wells - 1-2 stone wells for water access
  const wellCount = 1 + (rand(60) > 0.6 ? 1 : 0);
  const wells: Array<{ pos: [number, number, number] }> = [];
  for (let i = 0; i < wellCount; i++) {
    const anchor = buildings[i % buildings.length];
    const offset = (rand(70 + i) - 0.5) * 6;
    wells.push({
      pos: anchor ? trackPoint((anchor.pos[0] * trackDir[0] + anchor.pos[2] * trackDir[1]) + 3, offset) : scatterPoint(80 + i, 10)
    });
  }

  // Trees - Mediterranean species (oak, pistachio, carob, occasional cypress)
  const treeCount = 8 + Math.floor(rand(90) * 6); // 8-13 trees
  const trees: Array<{
    pos: [number, number, number];
    type: 'oak' | 'pistachio' | 'carob' | 'cypress';
    size: number;
  }> = [];

  const groveCenter = scatterPoint(95, 10);
  for (let i = 0; i < treeCount; i++) {
    const groveBias = rand(100 + i) > 0.55;
    const base = groveBias
      ? [groveCenter[0] + (rand(110 + i) - 0.5) * 10, 0, groveCenter[2] + (rand(120 + i) - 0.5) * 10] as [number, number, number]
      : scatterPoint(130 + i, 6);
    const typeRoll = rand(115 + i);
    const type = typeRoll < 0.35 ? 'oak' : typeRoll < 0.65 ? 'pistachio' : typeRoll < 0.9 ? 'carob' : 'cypress';

    trees.push({
      pos: base,
      type,
      size: 0.7 + rand(120 + i) * 0.5
    });
  }

  // Wild herb bushes (thyme, oregano, lavender, buckthorn)
  const herbCount = 15 + Math.floor(rand(130) * 10); // 15-24 herb bushes
  const herbs: Array<{ pos: [number, number, number]; size: number; color: string }> = [];
  for (let i = 0; i < herbCount; i++) {
    const base = rand(140 + i) > 0.6
      ? trackPoint((rand(150 + i) - 0.5) * areaHalf * 1.6, (rand(160 + i) - 0.5) * 10)
      : scatterPoint(170 + i, 10);
    const herbType = rand(155 + i);
    const color = herbType < 0.3 ? '#4a5a3a' : herbType < 0.6 ? '#5a6a4a' : herbType < 0.85 ? '#3a4a2a' : '#6a5a8a'; // Green herbs or purple lavender

    herbs.push({
      pos: base,
      size: 0.3 + rand(160 + i) * 0.3,
      color
    });
  }

  // Thorn scrub clumps (spiky, low shrubs)
  const scrubCount = 8 + Math.floor(rand(165) * 8); // 8-15 clumps
  const scrubs: Array<{ pos: [number, number, number]; size: number }> = [];
  for (let i = 0; i < scrubCount; i++) {
    const base = scatterPoint(175 + i, 12);
    scrubs.push({
      pos: base,
      size: 0.35 + rand(180 + i) * 0.25
    });
  }

  // Dry grass clumps
  const grassCount = 25 + Math.floor(rand(170) * 15); // 25-40 clumps
  const grasses: Array<{ pos: [number, number, number]; size: number }> = [];
  for (let i = 0; i < grassCount; i++) {
    const base = scatterPoint(190 + i, 6);
    grasses.push({
      pos: base,
      size: 0.15 + rand(195 + i) * 0.15
    });
  }

  // Rocky outcroppings and scattered stones
  const rockCount = 10 + Math.floor(rand(200) * 8); // 10-18 rocks
  const rocks: Array<{ pos: [number, number, number]; size: number }> = [];
  const ridgeOffset = (rand(205) - 0.5) * 14;
  for (let i = 0; i < rockCount; i++) {
    const t = (rand(210 + i) - 0.5) * areaHalf * 1.8;
    const offset = ridgeOffset + (rand(220 + i) - 0.5) * 4;
    rocks.push({
      pos: trackPoint(t, offset),
      size: 0.4 + rand(230 + i) * 0.8
    });
  }

  const hasCairn = rand(560) > 0.7;
  const cairnPos = hasCairn ? scatterPoint(565, 12) : null;

  // Bone scatter (0-2 small piles)
  const boneCount = rand(575) > 0.7 ? 2 : rand(576) > 0.4 ? 1 : 0;
  const bones: Array<{ pos: [number, number, number]; rot: number }> = [];
  for (let i = 0; i < boneCount; i++) {
    bones.push({
      pos: scatterPoint(580 + i, 14),
      rot: rand(590 + i) * Math.PI * 2
    });
  }

  // Stone walls/fencing near buildings
  const fenceCount = buildingCount;
  const fences: Array<{ pos: [number, number, number]; rotation: number; length: number }> = [];
  for (let i = 0; i < fenceCount; i++) {
    if (i >= buildings.length) break;
    const building = buildings[i];
    const offset = rand(240 + i) > 0.5 ? 5 : -5;
    fences.push({
      pos: [building.pos[0] + offset, 0, building.pos[2]],
      rotation: building.rotation + Math.PI / 2,
      length: 4 + rand(250 + i) * 3
    });
  }

  return (
    <group>
      {/* Worn track strip */}
      <mesh
        position={[trackOrigin[0], 0.02, trackOrigin[2]]}
        rotation={[-Math.PI / 2, trackAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[areaHalf * 2.4, 3.2]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.95} transparent opacity={0.28} />
      </mesh>
      {/* Buildings - farms, hovels, shepherd shelters */}
      {buildings.map((building, i) => (
        <group key={`building-${i}`} position={building.pos} rotation={[0, building.rotation, 0]}>
          {/* Main structure */}
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[building.size[0], 2.4, building.size[1]]} />
            <meshStandardMaterial
              color={building.type === 'farm' ? '#b0a090' : building.type === 'hovel' ? '#9a8a7a' : '#8a7a6a'}
              roughness={0.96}
            />
          </mesh>

          {/* Flat roof (common in Levant) */}
          <mesh position={[0, 2.5, 0]} castShadow>
            <boxGeometry args={[building.size[0] + 0.2, 0.3, building.size[1] + 0.2]} />
            <meshStandardMaterial color="#7a6a5a" roughness={0.98} />
          </mesh>

          {/* Doorway */}
          <mesh position={[0, 1.0, building.size[1] / 2 + 0.02]} castShadow>
            <boxGeometry args={[0.8, 1.8, 0.1]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
          </mesh>

          {/* Storage shed for farms */}
          {building.type === 'farm' && (
            <mesh position={[building.size[0] / 2 + 1.2, 0.8, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5, 1.6, 1.5]} />
              <meshStandardMaterial color="#8a7a6a" roughness={0.97} />
            </mesh>
          )}

          {/* Animal pen enclosure for farms */}
          {building.type === 'farm' && (
            <group position={[-building.size[0] / 2 - 2.5, 0, 0]}>
              {[0, 1, 2, 3].map((side) => {
                const angle = (side / 4) * Math.PI * 2;
                const radius = 1.8;
                return (
                  <mesh
                    key={`fence-${side}`}
                    position={[Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius]}
                    rotation={[0, angle + Math.PI / 2, 0]}
                    castShadow
                  >
                    <boxGeometry args={[0.1, 1.2, 3.0]} />
                    <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>
      ))}

      {/* Stone Wells */}
      {wells.map((well, i) => (
        <group key={`well-${i}`} position={well.pos}>
          {/* Well rim - circular stone */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.3, 0.8, 12]} />
            <meshStandardMaterial color="#8a8a7a" roughness={0.95} />
          </mesh>

          {/* Well interior (dark hole) */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 0.9, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>

          {/* Wooden beam across top */}
          <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.2, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
          </mesh>

          {/* Support posts */}
          <mesh position={[-1.0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 1.6, 6]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
          </mesh>
          <mesh position={[1.0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 1.6, 6]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
          </mesh>

          {/* Bucket */}
          <mesh position={[0.3, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
            <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Trees - Mediterranean species */}
      {trees.map((tree, i) => {
        const { pos, type, size } = tree;

        if (type === 'oak') {
          // Broad, spreading oak tree
          return (
            <group key={`tree-${i}`} position={pos}>
              {/* Trunk */}
              <mesh position={[0, 1.2 * size, 0]} castShadow>
                <cylinderGeometry args={[0.2 * size, 0.3 * size, 2.4 * size, 8]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
              </mesh>
              {/* Canopy - broad and irregular */}
              <mesh position={[0, 2.8 * size, 0]} castShadow>
                <sphereGeometry args={[1.2 * size, 7, 6]} />
                <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
              </mesh>
              <mesh position={[0.4 * size, 2.5 * size, 0.3 * size]} castShadow>
                <sphereGeometry args={[0.8 * size, 6, 5]} />
                <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
              </mesh>
              <mesh position={[-0.3 * size, 2.6 * size, -0.4 * size]} castShadow>
                <sphereGeometry args={[0.9 * size, 6, 5]} />
                <meshStandardMaterial color="#4a5a35" roughness={0.9} />
              </mesh>
            </group>
          );
        } else if (type === 'pistachio') {
          // Smaller pistachio tree with irregular canopy
          return (
            <group key={`tree-${i}`} position={pos}>
              {/* Trunk - often multi-stemmed */}
              <mesh position={[0, 0.9 * size, 0]} castShadow>
                <cylinderGeometry args={[0.15 * size, 0.2 * size, 1.8 * size, 6]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
              </mesh>
              <mesh position={[0.15 * size, 1.1 * size, 0.1 * size]} castShadow>
                <cylinderGeometry args={[0.1 * size, 0.15 * size, 1.3 * size, 6]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
              </mesh>
              {/* Canopy - smaller, more sparse */}
              <mesh position={[0, 2.0 * size, 0]} castShadow>
                <sphereGeometry args={[0.9 * size, 6, 5]} />
                <meshStandardMaterial color="#5a6a4a" roughness={0.9} />
              </mesh>
              <mesh position={[0.2 * size, 1.8 * size, 0.2 * size]} castShadow>
                <sphereGeometry args={[0.6 * size, 5, 4]} />
                <meshStandardMaterial color="#5a6a45" roughness={0.9} />
              </mesh>
            </group>
          );
        } else if (type === 'carob') {
          // Carob tree - dense evergreen canopy
          return (
            <group key={`tree-${i}`} position={pos}>
              {/* Trunk */}
              <mesh position={[0, 1.4 * size, 0]} castShadow>
                <cylinderGeometry args={[0.25 * size, 0.35 * size, 2.8 * size, 8]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
              </mesh>
              {/* Dense canopy */}
              <mesh position={[0, 3.2 * size, 0]} castShadow>
                <sphereGeometry args={[1.4 * size, 8, 6]} />
                <meshStandardMaterial color="#3a5a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0, 3.6 * size, 0]} castShadow>
                <sphereGeometry args={[1.0 * size, 7, 5]} />
                <meshStandardMaterial color="#4a6a3a" roughness={0.88} />
              </mesh>
            </group>
          );
        } else {
          // Cypress - tall and narrow
          return (
            <group key={`tree-${i}`} position={pos}>
              {/* Trunk */}
              <mesh position={[0, 2.5 * size, 0]} castShadow>
                <cylinderGeometry args={[0.18 * size, 0.25 * size, 5.0 * size, 8]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
              </mesh>
              {/* Narrow columnar canopy */}
              <mesh position={[0, 4.5 * size, 0]} castShadow>
                <coneGeometry args={[0.8 * size, 4.0 * size, 8]} />
                <meshStandardMaterial color="#2a4a2a" roughness={0.85} />
              </mesh>
            </group>
          );
        }
      })}

      {/* Wild Herb Bushes */}
      {herbs.map((herb, i) => (
        <mesh key={`herb-${i}`} position={herb.pos} castShadow>
          <sphereGeometry args={[herb.size, 6, 4]} />
          <meshStandardMaterial color={herb.color} roughness={0.92} />
        </mesh>
      ))}

      {/* Thorn Scrub Clumps */}
      {scrubs.map((scrub, i) => (
        <group key={`scrub-${i}`} position={scrub.pos}>
          {[0, 1, 2, 3].map((spike) => (
            <mesh
              key={`scrub-spike-${i}-${spike}`}
              position={[
                (rand(610 + i * 10 + spike) - 0.5) * scrub.size,
                scrub.size * 0.2,
                (rand(620 + i * 10 + spike) - 0.5) * scrub.size
              ]}
              rotation={[rand(630 + i * 10 + spike) * 0.6, rand(640 + i * 10 + spike) * Math.PI, 0]}
              castShadow
            >
              <coneGeometry args={[scrub.size * 0.25, scrub.size * 0.7, 5]} />
              <meshStandardMaterial color="#5a5e3a" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Dry Grass Clumps */}
      {grasses.map((grass, i) => (
        <group key={`grass-${i}`} position={grass.pos}>
          {/* Multiple blades */}
          {[0, 1, 2, 3, 4].map((blade) => (
            <mesh
              key={`blade-${blade}`}
              position={[
                (rand(300 + i * 10 + blade) - 0.5) * grass.size,
                grass.size * 0.3,
                (rand(310 + i * 10 + blade) - 0.5) * grass.size
              ]}
              rotation={[rand(320 + i * 10 + blade) * 0.2, 0, 0]}
              castShadow
            >
              <coneGeometry args={[grass.size * 0.15, grass.size * 1.5, 4]} />
              <meshStandardMaterial color="#6a7a4a" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Rocky Outcroppings */}
      {rocks.map((rock, i) => (
        <mesh
          key={`rock-${i}`}
          position={rock.pos}
          rotation={[
            rand(400 + i) * 0.4,
            rand(410 + i) * Math.PI * 2,
            rand(420 + i) * 0.4
          ]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[rock.size, 0]} />
          <meshStandardMaterial color="#7a7a6a" roughness={0.96} />
        </mesh>
      ))}

      {/* Stone Cairn */}
      {hasCairn && cairnPos && (
        <group position={cairnPos}>
          {[0, 1, 2, 3].map((layer) => (
            <mesh
              key={`cairn-${layer}`}
              position={[0, 0.2 + layer * 0.18, 0]}
              rotation={[0, rand(610 + layer) * Math.PI, rand(620 + layer) * 0.1]}
              castShadow
            >
              <dodecahedronGeometry args={[0.45 - layer * 0.08, 0]} />
              <meshStandardMaterial color="#7a7466" roughness={0.97} />
            </mesh>
          ))}
        </group>
      )}

      {/* Bone Scatter */}
      {bones.map((bone, i) => (
        <group key={`bone-${i}`} position={bone.pos} rotation={[0, bone.rot, 0]}>
          <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.05, 0.07, 0.35, 6]} />
            <meshStandardMaterial color="#b6b1a3" roughness={0.92} />
          </mesh>
          <mesh position={[0.18, 0.03, -0.08]} rotation={[0, 0.6, 0.2]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.28, 6]} />
            <meshStandardMaterial color="#b0ab9c" roughness={0.92} />
          </mesh>
          <mesh position={[-0.12, 0.04, 0.1]} castShadow>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#c2bdb0" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Stone Walls/Fencing */}
      {fences.map((fence, i) => (
        <group key={`fence-${i}`} position={fence.pos} rotation={[0, fence.rotation, 0]}>
          {/* Low stone wall made of stacked rocks */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[fence.length, 0.8, 0.4]} />
            <meshStandardMaterial color="#8a8a7a" roughness={0.96} />
          </mesh>
          {/* Individual stones on top for texture */}
          {Array.from({ length: Math.floor(fence.length / 1.2) }).map((_, si) => (
            <mesh
              key={`stone-${si}`}
              position={[
                (si - Math.floor(fence.length / 2.4)) * 1.2,
                0.8 + rand(500 + i * 10 + si) * 0.1,
                rand(510 + i * 10 + si) * 0.2 - 0.1
              ]}
              rotation={[
                rand(520 + i * 10 + si) * 0.3,
                rand(530 + i * 10 + si) * Math.PI,
                rand(540 + i * 10 + si) * 0.3
              ]}
              castShadow
            >
              <boxGeometry args={[0.4, 0.3, 0.35]} />
              <meshStandardMaterial color="#7a7a6a" roughness={0.97} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Bedouin Tent */}
      {tent && <BedouinTent position={tent.pos} seed={tent.seed} timeOfDay={timeOfDay} />}
    </group>
  );
};
