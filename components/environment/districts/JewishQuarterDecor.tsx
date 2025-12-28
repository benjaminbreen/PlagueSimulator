/**
 * Jewish Quarter (Al-Yahud) Decorations
 *
 * Historical context: In 14th century Damascus under Mamluk rule, the Jewish Quarter
 * (Al-Yahud) was a distinct neighborhood housing the city's Jewish population, which
 * consisted of:
 *
 * - Arabized Mizrahi Jews - Arabic-speaking Jews long established in Syria
 * - Aramaic-speaking Jews - descendants of ancient Jewish communities, speaking Syriac/Aramaic
 * - Romaniote Jews - Greek-speaking Jews from Byzantine territories
 * - Persian/Bukharan Jews - merchants and scholars from Persia and Central Asia
 *
 * The quarter featured synagogues, kosher butcher shops, Hebrew script signage,
 * study houses (yeshiv ot), and distinctive darker stone buildings. The community
 * maintained their religious practices under dhimmi status, with restrictions on
 * building height and visible religious symbols, but were generally protected under
 * Islamic law.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { getTerrainHeight, TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';

// Star of David component (Magen David) - simplified for performance
const StarOfDavid: React.FC<{ size?: number; color?: string }> = ({
  size = 0.4,
  color = '#3a3a3a'
}) => {
  // Simplified version using flat boxes instead of extruded geometry
  return (
    <group>
      {/* Triangle 1 (pointing up) - three thin boxes forming triangle */}
      <mesh position={[0, size * 0.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-size * 0.3, -size * 0.2, 0]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[size * 0.3, -size * 0.2, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Triangle 2 (pointing down) */}
      <mesh position={[0, -size * 0.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-size * 0.3, size * 0.2, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[size * 0.3, size * 0.2, 0]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[size * 1.2, 0.08, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
};

// Enhanced synagogue structure with bimah and aron kodesh
const Synagogue: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const width = 4 + rand() * 1.5;
  const depth = 5 + rand() * 2;
  const height = 4.5 + rand() * 1.5;
  const hasCourtyard = rand() > 0.5;
  const hasMagenDavid = rand() > 0.4;
  const communityType = Math.floor(rand() * 3); // 0=Mizrahi, 1=Romaniote, 2=Persian

  // Color variations by community
  const stoneColors = ['#6a5a48', '#7a6a58', '#5a4a38'];
  const stoneColor = stoneColors[communityType];

  return (
    <group>
      {/* Main prayer hall - darker stone */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>

      {/* Flat roof with low parapet (dhimmi building restrictions) */}
      <mesh position={[0, height, 0]} receiveShadow>
        <boxGeometry args={[width + 0.2, 0.15, depth + 0.2]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.98} />
      </mesh>

      {/* Low parapet walls */}
      <mesh position={[0, height + 0.3, 0]} receiveShadow>
        <boxGeometry args={[width + 0.3, 0.4, 0.15]} />
        <meshStandardMaterial color="#6a5a48" roughness={0.95} />
      </mesh>

      {/* Arched doorway with decorative keystone */}
      <mesh position={[width / 2 + 0.01, height * 0.35, 0]}>
        <boxGeometry args={[0.12, height * 0.65, 1.4]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah on doorframe */}
      <mesh position={[width / 2 + 0.05, height * 0.55, 0.6]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.08, 0.25, 0.06]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
      </mesh>

      {/* Small windows (narrow slits - dhimmi restrictions) */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`window-${i}`}
          position={[width / 2 + 0.02, height * 0.7, (i - 1) * 1.4]}
        >
          <boxGeometry args={[0.1, 0.5, 0.2]} />
          <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
        </mesh>
      ))}

      {/* Magen David above entrance (if present) */}
      {hasMagenDavid && (
        <group position={[width / 2 + 0.15, height * 0.82, 0]} rotation={[0, Math.PI / 2, 0]}>
          <StarOfDavid size={0.3} color="#4a4a3a" />
        </group>
      )}

      {/* Interior: Aron Kodesh (Torah ark) - visible through door */}
      <group position={[-width * 0.35, height * 0.4, 0]}>
        {/* Ark cabinet */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 1.8, 0.6]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
        </mesh>
        {/* Decorative crown on top (Keter Torah) */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.15, 0.25, 0.3, 8]} />
          <meshStandardMaterial color="#6a5a3a" roughness={0.6} />
        </mesh>
        {/* Parochet (curtain) - simplified as colored panel */}
        <mesh position={[0.35, 0, 0]}>
          <boxGeometry args={[0.05, 1.6, 0.5]} />
          <meshStandardMaterial color="#3a1a2a" roughness={0.8} />
        </mesh>
      </group>

      {/* Bimah (raised platform for Torah reading) - center of room */}
      <group position={[0, 0.3, 0]}>
        {/* Platform base */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[1.4, 0.6, 1.4]} />
          <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
        </mesh>
        {/* Reading desk */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.1, 0.6]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
        </mesh>
        {/* Low railing around bimah */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={`rail-${i}`}
              position={[Math.cos(angle) * 0.7, 0.4, Math.sin(angle) * 0.7]}
              rotation={[0, angle, 0]}
            >
              <boxGeometry args={[0.05, 0.6, 0.05]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
            </mesh>
          );
        })}
      </group>

      {/* Courtyard with ritual washing area */}
      {hasCourtyard && (
        <>
          {/* Courtyard walls */}
          <mesh position={[-width * 0.85, 0.6, 0]} receiveShadow>
            <boxGeometry args={[0.25, 1.2, depth + 1.5]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.6, -depth / 2 - 0.75]} receiveShadow>
            <boxGeometry args={[width + 1.5, 1.2, 0.25]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.6, depth / 2 + 0.75]} receiveShadow>
            <boxGeometry args={[width + 1.5, 1.2, 0.25]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>

          {/* Small washing fountain for ritual hand washing */}
          <group position={[-width * 0.5, 0.1, depth / 2 + 0.3]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.3, 0.35, 0.8, 8]} />
              <meshStandardMaterial color="#9a8a7a" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.2, 6]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.7} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
};

// Kosher butcher shop entrance
const KosherButcherShop: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const hasMeatHooks = rand() > 0.4;

  return (
    <group>
      {/* Shop front signage */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[1.5, 0.4, 0.05]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.8} />
      </mesh>

      {/* Hanging meat (if present) */}
      {hasMeatHooks && (
        <>
          <mesh position={[-0.3, 1.8, 0.3]}>
            <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
            <meshStandardMaterial color="#7a4a3a" roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 1.7, 0.3]}>
            <cylinderGeometry args={[0.09, 0.11, 0.5, 8]} />
            <meshStandardMaterial color="#8a5a4a" roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Stone counter/workspace */}
      <mesh position={[0, 0.5, 0.5]} receiveShadow>
        <boxGeometry args={[1.8, 1, 0.8]} />
        <meshStandardMaterial color="#9a8a7a" roughness={0.95} />
      </mesh>
    </group>
  );
};

// Hebrew script sign (simplified representation)
const HebrewSign: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const width = 1 + rand() * 0.8;
  const height = 0.4 + rand() * 0.2;

  return (
    <group>
      {/* Sign board */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      {/* Simplified "writing" - just decorative lines */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`letter-${i}`}
          position={[(i - 1) * 0.25, 2.5, 0.05]}
        >
          <boxGeometry args={[0.15, 0.25, 0.02]} />
          <meshStandardMaterial color="#2a2a1a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// Mikveh (ritual bath) - partially underground stepped pool
const Mikveh: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const buildingWidth = 2.5 + rand() * 0.5;
  const buildingHeight = 2 + rand() * 0.5;

  return (
    <group>
      {/* Small entrance building */}
      <mesh position={[0, buildingHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[buildingWidth, buildingHeight, buildingWidth]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.95} />
      </mesh>

      {/* Doorway */}
      <mesh position={[buildingWidth / 2 + 0.01, buildingHeight * 0.3, 0]}>
        <boxGeometry args={[0.1, buildingHeight * 0.55, 0.9]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah on doorframe */}
      <mesh position={[buildingWidth / 2 + 0.05, buildingHeight * 0.5, 0.4]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.06, 0.2, 0.05]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
      </mesh>

      {/* Small window */}
      <mesh position={[buildingWidth / 2 + 0.02, buildingHeight * 0.7, 0]}>
        <boxGeometry args={[0.1, 0.3, 0.25]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
      </mesh>

      {/* Underground pool structure - partially visible */}
      <group position={[0, -0.8, buildingWidth * 0.6]}>
        {/* Pool basin - stone lined */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[2, 1.6, 2]} />
          <meshStandardMaterial color="#6a6a5a" roughness={0.95} />
        </mesh>

        {/* Water surface */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.8, 0.05, 1.8]} />
          <meshStandardMaterial
            color="#2a3a4a"
            roughness={0.2}
            metalness={0.3}
            opacity={0.85}
            transparent={true}
          />
        </mesh>

        {/* Stone steps descending into pool - 7 steps (traditional number) */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <mesh
            key={`step-${i}`}
            position={[-0.7, 0.5 - i * 0.18, 0.8 - i * 0.25]}
          >
            <boxGeometry args={[0.6, 0.15, 0.4]} />
            <meshStandardMaterial color="#8a8a7a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Rainwater collection channel - some mikvehs used rainwater */}
      <mesh position={[-buildingWidth * 0.6, 0.15, buildingWidth * 0.4]} rotation={[0, 0, -Math.PI / 12]}>
        <boxGeometry args={[0.15, 0.3, 1.5]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.95} />
      </mesh>
    </group>
  );
};

// Enhanced Study house (Yeshiva) with study areas and books
const StudyHouse: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const width = 3 + rand() * 1;
  const depth = 3.5 + rand() * 1;
  const height = 3 + rand() * 0.5;

  return (
    <group>
      {/* Main study hall */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.95} />
      </mesh>

      {/* Doorway */}
      <mesh position={[width / 2 + 0.01, height * 0.3, 0]}>
        <boxGeometry args={[0.1, height * 0.55, 1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah on doorframe */}
      <mesh position={[width / 2 + 0.05, height * 0.5, 0.45]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.06, 0.2, 0.05]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
      </mesh>

      {/* Multiple windows for natural light (studying requires good light) */}
      {[0, 1].map((i) => (
        <mesh
          key={`window-${i}`}
          position={[width / 2 + 0.02, height * 0.65, (i - 0.5) * 1.8]}
        >
          <boxGeometry args={[0.1, 0.5, 0.35]} />
          <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
        </mesh>
      ))}

      {/* Interior: Bookshelves along walls - visible through windows */}
      <group position={[-width * 0.35, height * 0.35, 0]}>
        {/* Shelf structure */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 1.6, 2]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
        {/* Books on shelves - stacked appearance */}
        {[0, 1, 2].map((i) => (
          <mesh key={`book-${i}`} position={[0.15, -0.4 + i * 0.5, 0]}>
            <boxGeometry args={[0.3, 0.4, 1.8]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Study benches - simple wooden benches */}
      {[0, 1].map((i) => (
        <group key={`bench-${i}`} position={[(i - 0.5) * 1, 0.25, depth * 0.2]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.8, 0.1, 0.4]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
          {/* Bench legs */}
          <mesh position={[-0.3, -0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
          <mesh position={[0.3, -0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Study table in center */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.1, 1]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Open Torah scroll or book on table */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.5, 0.05, 0.4]} />
          <meshStandardMaterial color="#8a7a6a" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};

// Torah Scribe Workshop (Sofer) - specialized workshop for writing Torah scrolls
const TorahScribeWorkshop: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = () => seededRandom(seed);
  const width = 2.5 + rand() * 0.8;
  const depth = 3 + rand() * 1;
  const height = 2.8 + rand() * 0.5;

  return (
    <group>
      {/* Main workshop building */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.95} />
      </mesh>

      {/* Doorway */}
      <mesh position={[width / 2 + 0.01, height * 0.3, 0]}>
        <boxGeometry args={[0.1, height * 0.55, 0.9]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah */}
      <mesh position={[width / 2 + 0.05, height * 0.5, 0.4]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.06, 0.2, 0.05]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
      </mesh>

      {/* Large window for natural light (scribes need good light) */}
      <mesh position={[width / 2 + 0.02, height * 0.65, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.8]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
      </mesh>

      {/* Scribal desk - visible through window */}
      <group position={[-width * 0.25, height * 0.35, 0]}>
        {/* Writing desk */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 0.1, 0.7]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Partially completed Torah scroll on desk */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
          <meshStandardMaterial color="#8a7a6a" roughness={0.7} />
        </mesh>
        {/* Parchment */}
        <mesh position={[0.15, 0.08, 0]}>
          <boxGeometry args={[0.35, 0.02, 0.5]} />
          <meshStandardMaterial color="#d4c4b4" roughness={0.85} />
        </mesh>
      </group>

      {/* Ink wells and quills on shelf */}
      <group position={[-width * 0.3, height * 0.6, depth * 0.3]}>
        {/* Small shelf */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.05, 0.25]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Ink well */}
        <mesh position={[-0.15, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
        </mesh>
        {/* Quill (simplified) */}
        <mesh position={[0.1, 0.05, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <cylinderGeometry args={[0.01, 0.02, 0.2, 6]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
        </mesh>
      </group>

      {/* Storage for completed scrolls */}
      <group position={[-width * 0.35, height * 0.25, -depth * 0.3]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
        {/* Scroll tubes visible */}
        {[0, 1].map((i) => (
          <mesh key={`scroll-${i}`} position={[0, (i - 0.5) * 0.25, 0.15]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Sign with Hebrew letters (simplified representation of "Sofer") */}
      <group position={[width / 2 + 0.08, height * 0.85, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.35, 0.5]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
        </mesh>
        {/* Stylized Hebrew characters */}
        {[0, 1, 2].map((i) => (
          <mesh key={`char-${i}`} position={[0.05, 0, (i - 1) * 0.15]}>
            <boxGeometry args={[0.02, 0.25, 0.08]} />
            <meshStandardMaterial color="#2a2a1a" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Main Jewish Quarter decoration component
const JewishQuarterDecor: React.FC<{
  mapX: number;
  mapY: number;
  terrainHeightmap: TerrainHeightmap;
  sessionSeed: number;
}> = ({ mapX, mapY, terrainHeightmap, sessionSeed }) => {
  const district = getDistrictType(mapX, mapY);

  const decorations = useMemo(() => {
    if (district !== 'JEWISH_QUARTER') return [];

    const seed = mapX * 1000 + mapY * 13 + sessionSeed;
    const items: JSX.Element[] = [];
    let idCounter = 0;

    const rand = (offset = 0) => seededRandom(seed + offset);

    // Track occupied positions to prevent overlap
    const occupiedPositions: Array<{ x: number; z: number; radius: number }> = [];

    const isPositionValid = (x: number, z: number, radius: number): boolean => {
      // Check distance from center (don't place too close to center)
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 10) return false;

      // Check against all occupied positions with much larger separation
      for (const occupied of occupiedPositions) {
        const dx = x - occupied.x;
        const dz = z - occupied.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = radius + occupied.radius + 8; // Minimum 8 units separation (increased from 3)
        if (dist < minDist) return false;
      }
      return true;
    };

    // Generate 1 synagogue (reduced from 1-2)
    const synagogueCount = 1;
    for (let i = 0; i < synagogueCount; i++) {
      let x = 0, z = 0, attempts = 0;
      const buildingRadius = 5; // Increased to account for courtyard

      // Try to find valid position
      while (attempts < 50) {
        const angle = rand(200 + i * 50 + attempts * 7) * Math.PI * 2;
        const distance = 12 + rand(300 + i * 50 + attempts * 11) * 8;
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;

        if (isPositionValid(x, z, buildingRadius)) {
          occupiedPositions.push({ x, z, radius: buildingRadius });
          break;
        }
        attempts++;
      }

      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);
      const rotation = rand(400 + i * 50) * Math.PI * 2;

      items.push(
        <group key={`synagogue-${idCounter++}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <Synagogue seed={seed + 1000 + i} />
        </group>
      );
    }

    // Generate 1 mikveh (ritual bath)
    const mikvehCount = 1;
    for (let i = 0; i < mikvehCount; i++) {
      let x = 0, z = 0, attempts = 0;
      const buildingRadius = 3.5;

      while (attempts < 50) {
        const angle = rand(500 + i * 50 + attempts * 7) * Math.PI * 2;
        const distance = 13 + rand(550 + i * 50 + attempts * 11) * 7;
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;

        if (isPositionValid(x, z, buildingRadius)) {
          occupiedPositions.push({ x, z, radius: buildingRadius });
          break;
        }
        attempts++;
      }

      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);
      const rotation = rand(580 + i * 50) * Math.PI * 2;

      items.push(
        <group key={`mikveh-${idCounter++}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <Mikveh seed={seed + 1500 + i} />
        </group>
      );
    }

    // Generate 1 kosher butcher shop (reduced from 2)
    const butcherCount = 1;
    for (let i = 0; i < butcherCount; i++) {
      let x = 0, z = 0, attempts = 0;
      const buildingRadius = 2;

      while (attempts < 50) {
        const angle = rand(600 + i * 50 + attempts * 7) * Math.PI * 2;
        const distance = 11 + rand(700 + i * 50 + attempts * 11) * 9;
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;

        if (isPositionValid(x, z, buildingRadius)) {
          occupiedPositions.push({ x, z, radius: buildingRadius });
          break;
        }
        attempts++;
      }

      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);

      items.push(
        <group key={`butcher-${idCounter++}`} position={[x, y, z]}>
          <KosherButcherShop seed={seed + 2000 + i} />
        </group>
      );
    }

    // Generate 1 study house
    const studyHouseCount = 1;
    for (let i = 0; i < studyHouseCount; i++) {
      let x = 0, z = 0, attempts = 0;
      const buildingRadius = 3.5;

      while (attempts < 50) {
        const angle = rand(900 + i * 50 + attempts * 7) * Math.PI * 2;
        const distance = 14 + rand(1000 + i * 50 + attempts * 11) * 6;
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;

        if (isPositionValid(x, z, buildingRadius)) {
          occupiedPositions.push({ x, z, radius: buildingRadius });
          break;
        }
        attempts++;
      }

      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);
      const rotation = rand(1100 + i * 50) * Math.PI * 2;

      items.push(
        <group key={`study-${idCounter++}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <StudyHouse seed={seed + 3000 + i} />
        </group>
      );
    }

    // Generate 1 Torah scribe workshop
    const scribeCount = 1;
    for (let i = 0; i < scribeCount; i++) {
      let x = 0, z = 0, attempts = 0;
      const buildingRadius = 3;

      while (attempts < 50) {
        const angle = rand(800 + i * 50 + attempts * 7) * Math.PI * 2;
        const distance = 15 + rand(850 + i * 50 + attempts * 11) * 5;
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;

        if (isPositionValid(x, z, buildingRadius)) {
          occupiedPositions.push({ x, z, radius: buildingRadius });
          break;
        }
        attempts++;
      }

      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);
      const rotation = rand(880 + i * 50) * Math.PI * 2;

      items.push(
        <group key={`scribe-${idCounter++}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <TorahScribeWorkshop seed={seed + 2500 + i} />
        </group>
      );
    }

    // Generate 3-4 Hebrew signs scattered around
    const signCount = Math.floor(3 + rand(1200) * 2);
    for (let i = 0; i < signCount; i++) {
      const angle = rand(1300 + i * 30) * Math.PI * 2;
      const distance = 5 + rand(1400 + i * 30) * 15;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z);

      items.push(
        <group key={`sign-${idCounter++}`} position={[x, y, z]}>
          <HebrewSign seed={seed + 4000 + i} />
        </group>
      );
    }

    // Scatter 2-3 Magen David symbols (on walls, as decorative elements)
    const symbolCount = Math.floor(2 + rand(1500) * 2);
    for (let i = 0; i < symbolCount; i++) {
      const angle = rand(1600 + i * 40) * Math.PI * 2;
      const distance = 7 + rand(1700 + i * 40) * 12;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = sampleTerrainHeight(terrainHeightmap, mapX, mapY, x, z) + 2;

      items.push(
        <group key={`symbol-${idCounter++}`} position={[x, y, z]}>
          <StarOfDavid size={0.3} color="#4a4a3a" />
        </group>
      );
    }

    return items;
  }, [mapX, mapY, district, terrainHeightmap, sessionSeed]);

  if (district !== 'JEWISH_QUARTER') return null;

  return <group>{decorations}</group>;
};

export default JewishQuarterDecor;
