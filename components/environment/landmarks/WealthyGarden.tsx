/**
 * Wealthy Garden Component
 * Ornamental garden with central plaza, flower beds, statuary, and stone paths
 * Features historically accurate Mamluk-era Damascus garden design
 */

import React, { useMemo } from 'react';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

// ========================================
// MODULAR GARDEN COMPONENTS
// ========================================

/**
 * FlowerBed - A formal flower bed with geometric stone border and colorful flowers
 */
interface FlowerBedProps {
  position?: [number, number, number];
  size?: number;
  variant?: 'circular' | 'square';
  flowerColor?: string;
  secondaryFlowerColor?: string;
  seed?: number;
}

const FlowerBed: React.FC<FlowerBedProps> = ({
  position = [0, 0, 0],
  size = 2,
  variant = 'circular',
  flowerColor = '#c26b6b',
  secondaryFlowerColor = '#d4a24a',
  seed = 0
}) => {
  const flowerPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const count = Math.floor(6 + seededRandom(seed) * 6);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seededRandom(seed + i) * 0.5;
      const r = size * 0.3 + seededRandom(seed + i + 10) * size * 0.35;
      positions.push([Math.cos(angle) * r, 0.15 + seededRandom(seed + i + 20) * 0.1, Math.sin(angle) * r]);
    }
    return positions;
  }, [size, seed]);

  return (
    <group position={position}>
      {/* Stone border */}
      {variant === 'circular' ? (
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <torusGeometry args={[size, 0.15, 8, 24]} />
          <meshStandardMaterial color="#a89880" roughness={0.9} />
        </mesh>
      ) : (
        <group>
          {[0, 1, 2, 3].map((side) => (
            <mesh
              key={`border-${side}`}
              position={[
                side === 1 ? size : side === 3 ? -size : 0,
                0.1,
                side === 0 ? size : side === 2 ? -size : 0
              ]}
              rotation={[0, side % 2 === 0 ? 0 : Math.PI / 2, 0]}
              castShadow
            >
              <boxGeometry args={[size * 2.1, 0.2, 0.2]} />
              <meshStandardMaterial color="#a89880" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
      {/* Soil base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {variant === 'circular' ? (
          <circleGeometry args={[size * 0.95, 18]} />
        ) : (
          <planeGeometry args={[size * 1.9, size * 1.9]} />
        )}
        <meshStandardMaterial color="#4a5a40" roughness={1} />
      </mesh>
      {/* Flowers */}
      {flowerPositions.map((pos, i) => (
        <group key={`flower-${i}`} position={pos}>
          <mesh position={[0, -0.05, 0]} castShadow>
            <sphereGeometry args={[0.12, 6, 4]} />
            <meshStandardMaterial color="#3a5a38" roughness={0.9} />
          </mesh>
          <mesh castShadow>
            <sphereGeometry args={[0.08 + seededRandom(seed + i * 3) * 0.06, 6, 5]} />
            <meshStandardMaterial
              color={seededRandom(seed + i * 7) > 0.5 ? flowerColor : secondaryFlowerColor}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * GardenStatue - Decorative stone statue on a plinth
 */
interface GardenStatueProps {
  position?: [number, number, number];
  scale?: number;
  variant?: 'obelisk' | 'urn' | 'column' | 'fountain';
  rotation?: number;
}

const GardenStatue: React.FC<GardenStatueProps> = ({
  position = [0, 0, 0],
  scale = 1,
  variant = 'obelisk',
  rotation = 0
}) => {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base plinth */}
      <mesh position={[0, 0.15 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4 * s, 0.3 * s, 1.4 * s]} />
        <meshStandardMaterial color="#9a8a7a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.4 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1 * s, 0.2 * s, 1.1 * s]} />
        <meshStandardMaterial color="#a89a8a" roughness={0.85} />
      </mesh>

      {variant === 'obelisk' && (
        <>
          <mesh position={[0, 1.4 * s, 0]} castShadow>
            <boxGeometry args={[0.5 * s, 2.0 * s, 0.5 * s]} />
            <meshStandardMaterial color="#c4b4a4" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.55 * s, 0]} castShadow>
            <coneGeometry args={[0.35 * s, 0.5 * s, 4]} />
            <meshStandardMaterial color="#d4c4b4" roughness={0.75} />
          </mesh>
        </>
      )}

      {variant === 'urn' && (
        <>
          <mesh position={[0, 0.9 * s, 0]} castShadow>
            <sphereGeometry args={[0.5 * s, 12, 10]} />
            <meshStandardMaterial color="#b8a898" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.4 * s, 0]} castShadow>
            <cylinderGeometry args={[0.2 * s, 0.35 * s, 0.4 * s, 12]} />
            <meshStandardMaterial color="#c8b8a8" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.65 * s, 0]} castShadow>
            <torusGeometry args={[0.25 * s, 0.06 * s, 8, 16]} />
            <meshStandardMaterial color="#d8c8b8" roughness={0.75} />
          </mesh>
        </>
      )}

      {variant === 'column' && (
        <>
          <mesh position={[0, 1.3 * s, 0]} castShadow>
            <cylinderGeometry args={[0.3 * s, 0.35 * s, 1.8 * s, 12]} />
            <meshStandardMaterial color="#c4b8ac" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.3 * s, 0]} castShadow>
            <boxGeometry args={[0.7 * s, 0.2 * s, 0.7 * s]} />
            <meshStandardMaterial color="#d4c8bc" roughness={0.75} />
          </mesh>
          <mesh position={[0, 2.6 * s, 0]} castShadow>
            <sphereGeometry args={[0.25 * s, 10, 8]} />
            <meshStandardMaterial color="#c8bcb0" roughness={0.8} />
          </mesh>
        </>
      )}

      {variant === 'fountain' && (
        <>
          <mesh position={[0, 0.7 * s, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.8 * s, 0.9 * s, 0.4 * s, 16]} />
            <meshStandardMaterial color="#b8a898" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.85 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.7 * s, 16]} />
            <meshStandardMaterial color="#3a7090" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.2 * s, 0]} castShadow>
            <cylinderGeometry args={[0.1 * s, 0.12 * s, 0.7 * s, 8]} />
            <meshStandardMaterial color="#c8b8a8" roughness={0.8} />
          </mesh>
        </>
      )}
    </group>
  );
};

/**
 * StonePath - A paved stone path segment
 */
interface StonePathProps {
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
  color?: string;
  borderColor?: string;
}

const StonePath: React.FC<StonePathProps> = ({
  start,
  end,
  width = 1.5,
  color = '#c8b8a0',
  borderColor = '#a89880'
}) => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    0.02,
    (start[2] + end[2]) / 2
  ];

  return (
    <group position={midpoint} rotation={[-Math.PI / 2, 0, angle]}>
      <mesh receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, width / 2 + 0.08, 0.01]}>
        <planeGeometry args={[length, 0.15]} />
        <meshStandardMaterial color={borderColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, -width / 2 - 0.08, 0.01]}>
        <planeGeometry args={[length, 0.15]} />
        <meshStandardMaterial color={borderColor} roughness={0.85} />
      </mesh>
    </group>
  );
};

/**
 * FormalPlaza - Central plaza with paving, flower beds, and statuary
 */
interface FormalPlazaProps {
  position?: [number, number, number];
  size?: number;
  seed?: number;
}

const FormalPlaza: React.FC<FormalPlazaProps> = ({
  position = [0, 0, 0],
  size = 12,
  seed = 0
}) => {
  const statueVariant = useMemo(() => {
    const variants: Array<'obelisk' | 'urn' | 'column' | 'fountain'> = ['obelisk', 'urn', 'column', 'fountain'];
    return variants[Math.floor(seededRandom(seed) * variants.length)];
  }, [seed]);

  const flowerColors = useMemo(() => {
    const colorPairs = [
      { primary: '#c26b6b', secondary: '#d4a24a' },
      { primary: '#8a5a9a', secondary: '#d4d4a4' },
      { primary: '#d47a4a', secondary: '#c4a44a' },
      { primary: '#a45a6a', secondary: '#6a8a5a' },
    ];
    return colorPairs[Math.floor(seededRandom(seed + 10) * colorPairs.length)];
  }, [seed]);

  return (
    <group position={position}>
      {/* Paved floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[size, 24]} />
        <meshStandardMaterial color="#c8b8a0" roughness={0.9} />
      </mesh>
      {/* Decorative rings */}
      {[0.4, 0.7].map((frac, i) => (
        <mesh key={`ring-${i}`} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * frac - 0.1, size * frac + 0.1, 32]} />
          <meshStandardMaterial color="#a89880" roughness={0.85} />
        </mesh>
      ))}

      {/* Central feature */}
      <GardenStatue position={[0, 0, 0]} scale={1.2} variant={statueVariant} />

      {/* Corner flower beds */}
      {[
        [size * 0.55, 0, size * 0.55],
        [-size * 0.55, 0, size * 0.55],
        [size * 0.55, 0, -size * 0.55],
        [-size * 0.55, 0, -size * 0.55],
      ].map((pos, i) => (
        <FlowerBed
          key={`plaza-flowers-${i}`}
          position={pos as [number, number, number]}
          size={size * 0.18}
          variant="circular"
          flowerColor={flowerColors.primary}
          secondaryFlowerColor={flowerColors.secondary}
          seed={seed + i * 100}
        />
      ))}

      {/* Cardinal urns */}
      {[
        [size * 0.75, 0, 0],
        [-size * 0.75, 0, 0],
        [0, 0, size * 0.75],
        [0, 0, -size * 0.75],
      ].map((pos, i) => (
        <GardenStatue
          key={`plaza-urn-${i}`}
          position={pos as [number, number, number]}
          scale={0.7}
          variant="urn"
          rotation={i * Math.PI / 2}
        />
      ))}

      {/* Low hedges */}
      {[0, 1, 2, 3].map((side) => {
        const angle = side * Math.PI / 2;
        return (
          <mesh
            key={`hedge-${side}`}
            position={[Math.sin(angle) * size * 0.92, 0.25, Math.cos(angle) * size * 0.92]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <boxGeometry args={[size * 0.6, 0.5, 0.4]} />
            <meshStandardMaterial color="#3a5a38" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Benches */}
      {[
        [size * 0.5, 0, size * 0.85, 0],
        [-size * 0.5, 0, -size * 0.85, Math.PI],
      ].map(([x, y, z, rot], i) => (
        <group key={`bench-${i}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.12, 0.5]} />
            <meshStandardMaterial color="#a89078" roughness={0.85} />
          </mesh>
          <mesh position={[-0.7, 0.2, 0]} castShadow>
            <boxGeometry args={[0.15, 0.4, 0.45]} />
            <meshStandardMaterial color="#9a8068" roughness={0.9} />
          </mesh>
          <mesh position={[0.7, 0.2, 0]} castShadow>
            <boxGeometry args={[0.15, 0.4, 0.45]} />
            <meshStandardMaterial color="#9a8068" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ========================================
// MAIN COMPONENT
// ========================================

export const WealthyGarden: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  buildingPositions?: [number, number, number][];
}> = ({ mapX, mapY, buildingPositions = [] }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'WEALTHY') return null;
  const seed = mapX * 1000 + mapY * 31 + 17;

  // Generate paths between buildings
  const pathSegments = useMemo(() => {
    if (buildingPositions.length < 2) return [];

    const segments: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const usedPairs = new Set<string>();

    buildingPositions.forEach((building, i) => {
      const distances = buildingPositions
        .map((other, j) => ({
          index: j,
          dist: Math.sqrt(
            Math.pow(other[0] - building[0], 2) +
            Math.pow(other[2] - building[2], 2)
          )
        }))
        .filter(d => d.index !== i && d.dist > 3 && d.dist < 20)
        .sort((a, b) => a.dist - b.dist);

      const connectCount = Math.min(1 + Math.floor(seededRandom(seed + i) * 2), distances.length);
      for (let c = 0; c < connectCount; c++) {
        if (!distances[c]) continue;
        const neighborIndex = distances[c].index;
        const pairId = i < neighborIndex ? `${i}-${neighborIndex}` : `${neighborIndex}-${i}`;
        if (usedPairs.has(pairId)) continue;
        usedPairs.add(pairId);

        segments.push({
          start: building,
          end: buildingPositions[neighborIndex]
        });
      }
    });

    return segments;
  }, [buildingPositions, seed]);

  // Paths radiating from plaza
  const plazaPaths = useMemo(() => {
    const paths: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const plazaRadius = 10;
    const pathLength = 20;
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle, i) => {
      if (seededRandom(seed + 500 + i) < 0.2) return;
      paths.push({
        start: [Math.cos(angle) * plazaRadius, 0, Math.sin(angle) * plazaRadius],
        end: [Math.cos(angle) * pathLength, 0, Math.sin(angle) * pathLength]
      });
    });
    return paths;
  }, [seed]);

  return (
    <group>
      {/* Paths between buildings */}
      {pathSegments.map((seg, i) => (
        <StonePath
          key={`building-path-${i}`}
          start={seg.start}
          end={seg.end}
          width={1.2}
        />
      ))}

      {/* Paths from plaza */}
      {plazaPaths.map((seg, i) => (
        <StonePath
          key={`plaza-path-${i}`}
          start={seg.start}
          end={seg.end}
          width={1.8}
          color="#d4c4ac"
          borderColor="#b8a890"
        />
      ))}

      {/* Central plaza */}
      <FormalPlaza position={[0, 0, 0]} size={10} seed={seed} />

      {/* Secondary flower beds */}
      {[
        [-18, 0, 10],
        [18, 0, -10],
        [-15, 0, -15],
        [15, 0, 15],
      ].map((pos, i) => (
        <FlowerBed
          key={`garden-bed-${i}`}
          position={pos as [number, number, number]}
          size={1.8}
          variant={i % 2 === 0 ? 'circular' : 'square'}
          flowerColor={i % 2 === 0 ? '#c26b6b' : '#8a5a9a'}
          secondaryFlowerColor="#d4a24a"
          seed={seed + i * 50}
        />
      ))}

      {/* Corner statues */}
      {[
        [-20, 0, -18],
        [20, 0, 18],
      ].map((pos, i) => (
        <GardenStatue
          key={`corner-statue-${i}`}
          position={pos as [number, number, number]}
          scale={0.9}
          variant={i === 0 ? 'column' : 'obelisk'}
        />
      ))}

      {/* Ornamental trees */}
      {[
        [-12, 0, 18],
        [12, 0, -18],
        [-22, 0, 5],
        [22, 0, -5],
      ].map((pos, i) => (
        <group key={`ornamental-tree-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1.6, 6]} />
            <meshStandardMaterial color="#6b4a3c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <sphereGeometry args={[1.1, 10, 8]} />
            <meshStandardMaterial color="#3a6a38" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
