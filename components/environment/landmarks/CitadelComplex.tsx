/**
 * Mamluk Citadel Complex - Ultra-Detailed Historical Landmark
 *
 * Damascus Citadel (1348 CE - Bahri Mamluk Sultanate)
 * Combined fortress, palace, administrative center, and military barracks
 *
 * Features:
 * - Ablaq (alternating stone) defensive walls
 * - Corner towers with arrow slits and machicolations
 * - Ornate gateway with muqarnas vaulting
 * - Palace complex with throne room and courtyard
 * - Functional military buildings (barracks, stables, arsenal)
 * - Central parade ground with training facilities
 * - LOD system for performance optimization
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDistrictType, BuildingMetadata, BuildingType } from '../../../types';
import { HoverableGroup, HoverWireframeContext, HoverLabelContext } from '../shared/HoverSystem';
import { HOVER_WIREFRAME_COLORS } from '../constants';

// Texture utilities
import {
  createAblaqTexture,
  createGeometricTileTexture,
  createCourtyardPavingTexture,
  createWoodTexture,
  createBrassTexture
} from '../../../utils/citadelTextures';

// Mamluk architecture components
import {
  PointedArch,
  ArcadeColonnade,
  DefensiveTower,
  AblaqWall,
  Window
} from '../shared/MamlukArchitecture';

// Islamic ornaments
import {
  Muqarnas,
  GeometricTile,
  OrnateFountain,
  LionSculpture,
  Mashrabiya,
  DecorativeUrn
} from '../decorations/IslamicOrnaments';

// ========================================
// MAIN GATEWAY COMPONENT
// ========================================
// Redesigned with proper walkable passage through the gate

const MainGateway: React.FC<{
  position: [number, number, number];
  ablaqTexture: THREE.Texture;
  woodTexture: THREE.Texture;
  brassTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, ablaqTexture, woodTexture, brassTexture, lod }) => {
  if (lod === 'far') return null;

  const gateWidth = 6; // Width of walkable passage
  const gateHeight = 8; // Height of walkable passage (player can walk through)
  const structureWidth = 14;
  const structureHeight = 14;
  const structureDepth = 6;

  return (
    <group position={position}>
      {/* Left pillar of gateway */}
      <mesh position={[-(gateWidth / 2 + 2), structureHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, structureHeight, structureDepth]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Right pillar of gateway */}
      <mesh position={[(gateWidth / 2 + 2), structureHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, structureHeight, structureDepth]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Top lintel above gate (not blocking passage) */}
      <mesh position={[0, gateHeight + (structureHeight - gateHeight) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[gateWidth, structureHeight - gateHeight, structureDepth]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Decorative arch frame (visual only, passage is clear) */}
      <PointedArch
        width={gateWidth}
        height={gateHeight}
        depth={0.5}
        position={[0, gateHeight / 2, structureDepth / 2 - 0.25]}
      />
      <PointedArch
        width={gateWidth}
        height={gateHeight}
        depth={0.5}
        position={[0, gateHeight / 2, -structureDepth / 2 + 0.25]}
      />

      {/* Gate passage floor (darker stone to show depth) */}
      {/* Raised slightly (0.1) to prevent z-fighting with citadel floor */}
      <mesh position={[0, 0.1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gateWidth, structureDepth]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
      </mesh>

      {lod === 'close' && (
        <>
          {/* Muqarnas vaulting above arch */}
          <Muqarnas
            position={[0, 11, 0]}
            width={8}
            depth={2}
            tiers={3}
            color="#d9c9a9"
            accentColor="#1a4a7a"
          />

          {/* Geometric tile panels (flanking) */}
          <GeometricTile
            position={[-5, 10, structureDepth / 2 + 0.1]}
            size={2}
            pattern="star8"
            primaryColor="#1a4a7a"
            accentColor="#c9a23a"
          />
          <GeometricTile
            position={[5, 10, structureDepth / 2 + 0.1]}
            size={2}
            pattern="star8"
            primaryColor="#1a4a7a"
            accentColor="#c9a23a"
          />

          {/* Guardian lions outside gate */}
          <LionSculpture
            position={[-4.5, 0, structureDepth / 2 + 2]}
            rotation={Math.PI / 4}
            material="stone"
          />
          <LionSculpture
            position={[4.5, 0, structureDepth / 2 + 2]}
            rotation={-Math.PI / 4}
            material="stone"
          />

          {/* Murder holes above entrance */}
          {[-2, 0, 2].map((x, i) => (
            <mesh key={`hole-${i}`} position={[x, 13, structureDepth / 2 - 0.5]} castShadow>
              <boxGeometry args={[0.4, 0.6, 1]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

// ========================================
// SECONDARY GATE (for other walls)
// ========================================
// Simpler gate design for side entrances

const SecondaryGate: React.FC<{
  position: [number, number, number];
  rotation: number;
  ablaqTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, rotation, ablaqTexture, lod }) => {
  if (lod === 'far') return null;

  const gateWidth = 4;
  const gateHeight = 6;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left pillar */}
      <mesh position={[-(gateWidth / 2 + 1.5), 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 10, 4]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Right pillar */}
      <mesh position={[(gateWidth / 2 + 1.5), 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 10, 4]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Top lintel */}
      <mesh position={[0, gateHeight + 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[gateWidth, 4, 4]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Arch frame */}
      <PointedArch
        width={gateWidth}
        height={gateHeight}
        depth={0.4}
        position={[0, gateHeight / 2, 2]}
      />

      {/* Gate passage floor */}
      {/* Raised slightly (0.1) to prevent z-fighting with citadel floor */}
      <mesh position={[0, 0.1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gateWidth, 4]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
      </mesh>
    </group>
  );
};

// ========================================
// THRONE ROOM / AUDIENCE HALL
// ========================================
// Simplified - clearly a closed building with ornate door, not enterable

const ThroneRoom: React.FC<{
  position: [number, number, number];
  ablaqTexture: THREE.Texture;
  pavingTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, ablaqTexture, pavingTexture, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Main structure with ablaq */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 10, 8]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Ornate wooden door (clearly closed) */}
      <mesh position={[0, 2.5, 4.05]} castShadow>
        <boxGeometry args={[2.5, 5, 0.3]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
      </mesh>

      {lod === 'close' && (
        <>
          {/* Door frame with geometric decoration */}
          <mesh position={[0, 5.2, 4.1]} castShadow>
            <boxGeometry args={[3.5, 0.4, 0.2]} />
            <meshStandardMaterial color="#1a4a7a" roughness={0.8} />
          </mesh>
          <mesh position={[-1.5, 2.5, 4.1]} castShadow>
            <boxGeometry args={[0.3, 5.2, 0.2]} />
            <meshStandardMaterial color="#1a4a7a" roughness={0.8} />
          </mesh>
          <mesh position={[1.5, 2.5, 4.1]} castShadow>
            <boxGeometry args={[0.3, 5.2, 0.2]} />
            <meshStandardMaterial color="#1a4a7a" roughness={0.8} />
          </mesh>

          {/* Mashrabiya window screens (upper level) */}
          <Mashrabiya
            position={[-4, 7, 4.1]}
            width={2}
            height={2}
            pattern="star"
          />
          <Mashrabiya
            position={[4, 7, 4.1]}
            width={2}
            height={2}
            pattern="star"
          />

          {/* Muqarnas decoration above door */}
          <Muqarnas
            position={[0, 6, 4.2]}
            width={3}
            depth={0.5}
            tiers={2}
            color="#d9c9a9"
            accentColor="#1a4a7a"
          />

          {/* Side windows */}
          <Window
            position={[-6.05, 5, 0]}
            width={1.5}
            height={2}
          />
          <Window
            position={[6.05, 5, 0]}
            width={1.5}
            height={2}
          />
        </>
      )}

      {/* Flat roof with decorative edge */}
      <mesh position={[0, 10.2, 0]} castShadow>
        <boxGeometry args={[12.5, 0.4, 8.5]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
      </mesh>
    </group>
  );
};

// ========================================
// PALACE COURTYARD
// ========================================
// Simplified - removed clutter, kept fountain and minimal decorations

const PalaceCourtyard: React.FC<{
  position: [number, number, number];
  pavingTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, pavingTexture, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Geometric paving - larger for open feel */}
      {/* Raised (0.12) above main citadel floor (0.08) to prevent z-fighting */}
      <mesh position={[0, 0.12, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial map={pavingTexture} />
      </mesh>

      {/* Central fountain - slightly smaller for more open space */}
      <OrnateFountain
        position={[0, 0, 0]}
        variant="tiered"
        scale={2.0}
        hasWaterAnimation={true}
      />

      {lod === 'close' && (
        <>
          {/* Just two citrus trees flanking the fountain */}
          {[
            [-6, 0, 0],
            [6, 0, 0],
          ].map((pos, i) => (
            <group key={`tree-${i}`} position={pos as [number, number, number]}>
              <DecorativeUrn
                variant="amphora"
                scale={0.7}
                position={[0, 0.4, 0]}
              />
              {/* Citrus tree */}
              <mesh position={[0, 2.2, 0]} castShadow>
                <sphereGeometry args={[1.0, 8, 6]} />
                <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
              </mesh>
              {/* Tree trunk */}
              <mesh position={[0, 1.0, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.15, 1.2, 6]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Simple stone benches instead of cluttered arcade */}
          {[
            [-8, 0, -5],
            [8, 0, -5],
          ].map((pos, i) => (
            <mesh key={`bench-${i}`} position={pos as [number, number, number]} castShadow>
              <boxGeometry args={[2, 0.5, 0.8]} />
              <meshStandardMaterial color="#9a8a7a" roughness={0.95} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

// ========================================
// BARRACKS BUILDING
// ========================================
// Simplified design - solid building with proper windows, no misleading arches

const Barracks: React.FC<{
  position: [number, number, number];
  lod: 'close' | 'medium' | 'far';
}> = ({ position, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Main structure */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[25, 6, 8]} />
        <meshStandardMaterial color="#c8b896" roughness={0.92} />
      </mesh>

      {/* Flat roof */}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[25.5, 0.4, 8.5]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
      </mesh>

      {/* Main entrance door */}
      <mesh position={[0, 1.5, 4.05]} castShadow>
        <boxGeometry args={[2, 3, 0.3]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>

      {lod === 'close' && (
        <>
          {/* Ground floor windows (replacing misleading arches) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -10 + i * 4;
            // Skip center position where door is
            if (Math.abs(x) < 2) return null;
            return (
              <Window
                key={`window-lower-${i}`}
                position={[x, 2, 4.05]}
                width={1.2}
                height={1.8}
              />
            );
          })}

          {/* Upper floor windows */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -10 + i * 4;
            return (
              <Window
                key={`window-upper-${i}`}
                position={[x, 4.5, 4.05]}
                width={0.8}
                height={1.2}
              />
            );
          })}

          {/* Back side windows */}
          {Array.from({ length: 4 }).map((_, i) => {
            const x = -9 + i * 6;
            return (
              <Window
                key={`window-back-${i}`}
                position={[x, 3, -4.05]}
                width={0.8}
                height={1.2}
              />
            );
          })}
        </>
      )}
    </group>
  );
};

// ========================================
// STABLES
// ========================================
// Enclosed building with large stable doors - clearly not enterable

const Stables: React.FC<{
  position: [number, number, number];
  lod: 'close' | 'medium' | 'far';
}> = ({ position, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Main structure - enclosed */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 4, 10]} />
        <meshStandardMaterial color="#b8a886" roughness={0.92} />
      </mesh>

      {/* Sloped roof */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[19, 0.3, 11]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.95} />
      </mesh>

      {/* Large stable doors (3 sets) */}
      {[-5, 0, 5].map((x, i) => (
        <mesh key={`door-${i}`} position={[x, 1.8, 5.05]} castShadow>
          <boxGeometry args={[3, 3.5, 0.3]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
      ))}

      {lod === 'close' && (
        <>
          {/* Door frames */}
          {[-5, 0, 5].map((x, i) => (
            <group key={`frame-${i}`}>
              <mesh position={[x - 1.6, 1.8, 5.1]} castShadow>
                <boxGeometry args={[0.2, 3.6, 0.2]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
              </mesh>
              <mesh position={[x + 1.6, 1.8, 5.1]} castShadow>
                <boxGeometry args={[0.2, 3.6, 0.2]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Ventilation windows on sides */}
          {[-6, 0, 6].map((x, i) => (
            <Window
              key={`vent-${i}`}
              position={[x, 3.2, -5.05]}
              width={1}
              height={0.8}
            />
          ))}

          {/* Water trough outside */}
          <mesh position={[8, 0.3, 3]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.6, 4]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
          </mesh>

          {/* Hay bales stacked outside */}
          {[
            [8, 0.5, -2],
            [8, 1.5, -2],
            [7.5, 0.5, -3.5],
          ].map((pos, i) => (
            <mesh key={`hay-${i}`} position={pos as [number, number, number]} castShadow>
              <boxGeometry args={[1.2, 1, 1]} />
              <meshStandardMaterial color="#d8c898" roughness={0.95} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

// ========================================
// ARSENAL / ARMORY
// ========================================

const Arsenal: React.FC<{
  position: [number, number, number];
  lod: 'close' | 'medium' | 'far';
}> = ({ position, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Main structure (2 stories, thick walls) */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 8, 12]} />
        <meshStandardMaterial color="#a89886" roughness={0.92} />
      </mesh>

      {/* Reinforced door */}
      <mesh position={[0, 1.5, 6.1]} castShadow>
        <boxGeometry args={[1.8, 3, 0.4]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
      </mesh>

      {/* Iron banding on door */}
      {[0.5, 1.5, 2.5].map((y, i) => (
        <mesh key={`band-${i}`} position={[0, y, 6.25]} castShadow>
          <boxGeometry args={[2, 0.1, 0.05]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {lod === 'close' && (
        <>
          {/* Small barred windows */}
          {Array.from({ length: 4 }).map((_, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            return (
              <group key={`window-${i}`} position={[-3 + col * 6, 3 + row * 2, 6.05]}>
                <mesh castShadow>
                  <boxGeometry args={[0.6, 0.8, 0.2]} />
                  <meshStandardMaterial color="#2a2a2a" />
                </mesh>
                {/* Bars */}
                {[0, 1, 2].map((j) => (
                  <mesh key={`bar-${j}`} position={[-0.2 + j * 0.2, 0, 0.15]} castShadow>
                    <boxGeometry args={[0.05, 0.7, 0.1]} />
                    <meshStandardMaterial color="#3a3a3a" />
                  </mesh>
                ))}
              </group>
            );
          })}

          {/* Flat roof with crenellations */}
          <mesh position={[0, 8.2, 0]} castShadow>
            <boxGeometry args={[12.5, 0.4, 12.5]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
          </mesh>
        </>
      )}
    </group>
  );
};

// ========================================
// PARADE GROUND
// ========================================

const ParadeGround: React.FC<{
  position: [number, number, number];
  lod: 'close' | 'medium' | 'far';
  timeOfDay?: number;
}> = ({ position, lod, timeOfDay = 0.5 }) => {
  const bannerRef = useRef<THREE.Mesh>(null);

  // Animated banner
  useFrame((state) => {
    if (bannerRef.current && lod === 'close') {
      const t = state.clock.elapsedTime;
      bannerRef.current.rotation.y = Math.sin(t * 0.8) * 0.3;
    }
  });

  const isNight = timeOfDay > 0.75 || timeOfDay < 0.25;

  return (
    <group position={position}>
      {/* Stone paving - raised to 0.1 to be above main citadel floor (0.08) */}
      <mesh position={[0, 0.1, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#b8a896" roughness={0.95} />
      </mesh>

      {lod !== 'far' && (
        <>
          {/* Flagpole */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 7.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 15, 8]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
            </mesh>

            {/* Mamluk banner (yellow/black) */}
            <mesh ref={bannerRef} position={[1, 13, 0]} castShadow>
              <planeGeometry args={[2, 3]} />
              <meshStandardMaterial
                color="#c9a23a"
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>

          {lod === 'close' && (
            <>
              {/* Training posts */}
              {[
                [-8, 0, -8],
                [8, 0, -8],
                [-8, 0, 8],
                [8, 0, 8],
                [0, 0, -10],
                [0, 0, 10]
              ].map((pos, i) => (
                <mesh key={`post-${i}`} position={pos as [number, number, number]} castShadow>
                  <cylinderGeometry args={[0.3, 0.35, 2.5, 8]} />
                  <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
                </mesh>
              ))}

              {/* Well */}
              <group position={[12, 0, 12]}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[1.2, 1.3, 1, 12]} />
                  <meshStandardMaterial color="#8a8a7a" roughness={0.95} />
                </mesh>
                {/* Well roof */}
                <mesh position={[0, 2, 0]} castShadow>
                  <coneGeometry args={[1.5, 1.5, 8]} />
                  <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
                </mesh>
              </group>
            </>
          )}
        </>
      )}
    </group>
  );
};

// ========================================
// LANDMARK DATA FOR MINIMAP
// ========================================

/**
 * Returns key landmark positions for minimap display
 */
export const getCitadelLandmarks = (): Array<{ x: number; z: number; label: string }> => {
  return [
    { x: 0, z: -30, label: 'Citadel Gate' },
    { x: 15, z: 15, label: 'Throne Room' },
    { x: -18, z: -5, label: 'Barracks' },
    { x: -12, z: -18, label: 'Stables' },
    { x: 18, z: -15, label: 'Arsenal' },
    { x: 0, z: 0, label: 'Parade Ground' },
    { x: 15, z: 5, label: 'Palace Courtyard' },
  ];
};

// ========================================
// CITADEL BUILDING METADATA GENERATOR
// ========================================

/**
 * Generates BuildingMetadata for citadel buildings that can be entered.
 * These buildings block movement and can be entered like other buildings.
 *
 * Enterable buildings:
 * - Throne Room: Sultan's audience hall (CIVIC type)
 * - Barracks: Mamluk soldiers' quarters (CIVIC type)
 * - Stables: Cavalry horse stables (COMMERCIAL type)
 * - Arsenal: Weapons and armor storage (CIVIC type)
 */
export const generateCitadelBuildings = (): BuildingMetadata[] => {
  const buildings: BuildingMetadata[] = [];

  // Throne Room - Sultan's audience hall
  buildings.push({
    id: 'citadel-throne-room',
    type: BuildingType.CIVIC,
    ownerName: 'Sultan al-Nasir Hasan',
    ownerAge: 45,
    ownerProfession: 'Sultan',
    ownerGender: 'Male',
    position: [15, 0, 15],
    sizeScale: 1.8, // Large building (matches boxSize 13x9)
    storyCount: 2,
    doorSide: 2, // West facing (toward parade ground)
    hasSymmetricalWindows: true,
    isPointOfInterest: true,
    isOpen: true,
    district: 'CIVIC',
    hasCourtyard: false,
  });

  // Barracks - Mamluk soldiers' quarters
  buildings.push({
    id: 'citadel-barracks',
    type: BuildingType.CIVIC,
    ownerName: 'Amir Sayf al-Din',
    ownerAge: 38,
    ownerProfession: 'Garrison Commander',
    ownerGender: 'Male',
    position: [-18, 0, -5],
    sizeScale: 2.2, // Very large (matches boxSize 26x9)
    storyCount: 2,
    doorSide: 1, // East facing (toward parade ground)
    hasSymmetricalWindows: true,
    isPointOfInterest: true,
    isOpen: true,
    district: 'CIVIC',
    hasCourtyard: false,
  });

  // Stables - Cavalry horse stables
  buildings.push({
    id: 'citadel-stables',
    type: BuildingType.COMMERCIAL,
    ownerName: 'Khalid ibn Rashid',
    ownerAge: 52,
    ownerProfession: 'Master of Horse',
    ownerGender: 'Male',
    position: [-12, 0, -18],
    sizeScale: 1.6, // Large (matches boxSize 19x11)
    storyCount: 1,
    doorSide: 0, // South facing (toward parade ground)
    hasSymmetricalWindows: false,
    isPointOfInterest: true,
    isOpen: true,
    district: 'CIVIC',
    hasCourtyard: false,
  });

  // Arsenal - Weapons and armor storage
  buildings.push({
    id: 'citadel-arsenal',
    type: BuildingType.CIVIC,
    ownerName: 'Baibars al-Mansuri',
    ownerAge: 42,
    ownerProfession: 'Arsenal Master',
    ownerGender: 'Male',
    position: [18, 0, -15],
    sizeScale: 1.5, // Medium-large (matches boxSize 13x13)
    storyCount: 2,
    doorSide: 3, // West facing (toward parade ground)
    hasSymmetricalWindows: true,
    isPointOfInterest: true,
    isOpen: true,
    district: 'CIVIC',
    hasCourtyard: false,
  });

  return buildings;
};

/**
 * Returns collision obstacles for citadel walls.
 * These block player movement at wall boundaries.
 */
export const getCitadelWallCollisions = (): Array<{ position: [number, number, number]; radius: number }> => {
  const collisions: Array<{ position: [number, number, number]; radius: number }> = [];

  // North wall segments (with gate gap in center)
  // Left segment: from x=-30 to x=-10 at z=-30
  for (let x = -30; x <= -10; x += 4) {
    collisions.push({ position: [x, 0, -30], radius: 2.5 });
  }
  // Right segment: from x=10 to x=30 at z=-30
  for (let x = 10; x <= 30; x += 4) {
    collisions.push({ position: [x, 0, -30], radius: 2.5 });
  }

  // South wall segments (with gate gap in center)
  for (let x = -30; x <= -6; x += 4) {
    collisions.push({ position: [x, 0, 30], radius: 2.5 });
  }
  for (let x = 6; x <= 30; x += 4) {
    collisions.push({ position: [x, 0, 30], radius: 2.5 });
  }

  // West wall (full length)
  for (let z = -30; z <= 30; z += 4) {
    collisions.push({ position: [-30, 0, z], radius: 2.5 });
  }

  // East wall (full length)
  for (let z = -30; z <= 30; z += 4) {
    collisions.push({ position: [30, 0, z], radius: 2.5 });
  }

  // Corner towers (larger collision radius)
  collisions.push({ position: [-30, 0, -30], radius: 5 });
  collisions.push({ position: [30, 0, -30], radius: 5 });
  collisions.push({ position: [-30, 0, 30], radius: 5 });
  collisions.push({ position: [30, 0, 30], radius: 5 });

  return collisions;
};

// ========================================
// MAIN CITADEL COMPLEX
// ========================================

export const CitadelComplex: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  playerPosition?: THREE.Vector3;
}> = ({ mapX, mapY, timeOfDay = 0.5, playerPosition }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CIVIC') return null;

  // Calculate LOD based on distance to player
  const distanceToPlayer = useMemo(() => {
    if (!playerPosition) return 200;
    const dx = playerPosition.x;
    const dz = playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [playerPosition]);

  const lod: 'close' | 'medium' | 'far' = useMemo(() => {
    if (distanceToPlayer < 80) return 'close';
    if (distanceToPlayer < 150) return 'medium';
    return 'far';
  }, [distanceToPlayer]);

  // Create procedural textures
  const ablaqTexture = useMemo(() => createAblaqTexture(), []);
  const geometricTexture = useMemo(() => createGeometricTileTexture(), []);
  const pavingTexture = useMemo(() => createCourtyardPavingTexture(), []);
  const woodTexture = useMemo(() => createWoodTexture(true), []);
  const brassTexture = useMemo(() => createBrassTexture(), []);

  // Hover system contexts - enable based on camera mode
  const wireframeEnabled = playerPosition ? playerPosition.y > 50 : false; // Enable in overhead view
  const labelEnabled = playerPosition ? playerPosition.y > 50 : false;

  return (
    <HoverWireframeContext.Provider value={wireframeEnabled}>
      <HoverLabelContext.Provider value={labelEnabled}>
        <group position={[0, 0, 0]}>
          {/* NOTE: Individual areas (parade ground, courtyard, gates) have their own floors */}
          {/* No main citadel floor needed - prevents z-fighting with overlapping planes */}

          {/* ===== OUTER DEFENSIVE WALLS ===== */}
          {/* Walls are split to create gate openings */}

          {/* North wall - LEFT segment (west of main gate) */}
          <AblaqWall
            position={[-20, 0, -30]}
            width={20}
            height={12}
            depth={4}
            orientation="east-west"
            ablaqTexture={ablaqTexture}
          />
          {/* North wall - RIGHT segment (east of main gate) */}
          <AblaqWall
            position={[20, 0, -30]}
            width={20}
            height={12}
            depth={4}
            orientation="east-west"
            ablaqTexture={ablaqTexture}
          />

          {/* South wall - LEFT segment (west of south gate) */}
          <AblaqWall
            position={[-20, 0, 30]}
            width={20}
            height={12}
            depth={4}
            orientation="east-west"
            ablaqTexture={ablaqTexture}
          />
          {/* South wall - RIGHT segment (east of south gate) */}
          <AblaqWall
            position={[20, 0, 30]}
            width={20}
            height={12}
            depth={4}
            orientation="east-west"
            ablaqTexture={ablaqTexture}
          />

          {/* West wall - full length (no gate) */}
          <AblaqWall
            position={[-30, 0, 0]}
            width={60}
            height={12}
            depth={4}
            orientation="north-south"
            ablaqTexture={ablaqTexture}
          />

          {/* East wall - full length (no gate) */}
          <AblaqWall
            position={[30, 0, 0]}
            width={60}
            height={12}
            depth={4}
            orientation="north-south"
            ablaqTexture={ablaqTexture}
          />

          {/* ===== SECONDARY GATE (South wall) ===== */}
          <SecondaryGate
            position={[0, 0, 30]}
            rotation={Math.PI}
            ablaqTexture={ablaqTexture}
            lod={lod}
          />

      {/* ===== CORNER DEFENSIVE TOWERS ===== */}

      <DefensiveTower
        position={[-30, 0, -30]}
        radius={5}
        height={18}
        ablaqTexture={ablaqTexture}
      />
      <DefensiveTower
        position={[30, 0, -30]}
        radius={5}
        height={18}
        ablaqTexture={ablaqTexture}
      />
      <DefensiveTower
        position={[-30, 0, 30]}
        radius={5}
        height={18}
        ablaqTexture={ablaqTexture}
      />
      <DefensiveTower
        position={[30, 0, 30]}
        radius={5}
        height={18}
        ablaqTexture={ablaqTexture}
      />

          {/* ===== MAIN GATEWAY (North wall center) ===== */}

          <HoverableGroup
            position={[0, 0, -30]}
            boxSize={[14, 16, 8]}
            boxOffset={[0, 8, 0]}
            color={HOVER_WIREFRAME_COLORS.poi}
            labelTitle="Citadel Gate"
            labelLines={[
              'Main entrance to the fortress',
              'Decorated with muqarnas vaulting',
              'Guardian lions flank the doorway'
            ]}
            labelOffset={[0, 18, 0]}
          >
            <MainGateway
              position={[0, 0, 0]}
              ablaqTexture={ablaqTexture}
              woodTexture={woodTexture}
              brassTexture={brassTexture}
              lod={lod}
            />
          </HoverableGroup>

          {/* ===== PALACE COMPLEX (Southeast quadrant) ===== */}

          <HoverableGroup
            position={[15, 0, 15]}
            boxSize={[13, 12, 9]}
            boxOffset={[0, 6, 0]}
            color={HOVER_WIREFRAME_COLORS.poi}
            labelTitle="Throne Room"
            labelLines={[
              'Sultan\'s audience hall',
              'Ornate muqarnas dome ceiling',
              'Mashrabiya window screens'
            ]}
            labelOffset={[0, 14, 0]}
          >
            <ThroneRoom
              position={[0, 0, 0]}
              ablaqTexture={ablaqTexture}
              pavingTexture={pavingTexture}
              lod={lod}
            />
          </HoverableGroup>

          <HoverableGroup
            position={[15, 0, 5]}
            boxSize={[22, 8, 16]}
            boxOffset={[0, 4, 0]}
            color={HOVER_WIREFRAME_COLORS.poi}
            labelTitle="Palace Courtyard"
            labelLines={[
              'Private palace gardens',
              'Ornate tiered fountain',
              'Citrus trees and colonnade'
            ]}
            labelOffset={[0, 10, 0]}
          >
            <PalaceCourtyard
              position={[0, 0, 0]}
              pavingTexture={pavingTexture}
              lod={lod}
            />
          </HoverableGroup>

          {/* ===== MILITARY BUILDINGS ===== */}

          {/* Barracks (West side) */}
          <HoverableGroup
            position={[-18, 0, -5]}
            boxSize={[26, 8, 9]}
            boxOffset={[0, 4, 0]}
            color={HOVER_WIREFRAME_COLORS.default}
            labelTitle="Barracks"
            labelLines={[
              'Mamluk soldiers\' quarters',
              'Two-story with arcade bays',
              'Training and housing for garrison'
            ]}
            labelOffset={[0, 10, 0]}
          >
            <Barracks
              position={[0, 0, 0]}
              lod={lod}
            />
          </HoverableGroup>

          {/* Stables (Northwest) */}
          <HoverableGroup
            position={[-12, 0, -18]}
            boxSize={[19, 6, 11]}
            boxOffset={[0, 3, 0]}
            color={HOVER_WIREFRAME_COLORS.default}
            labelTitle="Stables"
            labelLines={[
              'Cavalry horse stables',
              'Open-fronted structure',
              'Housing for Mamluk mounts'
            ]}
            labelOffset={[0, 8, 0]}
          >
            <Stables
              position={[0, 0, 0]}
              lod={lod}
            />
          </HoverableGroup>

          {/* Arsenal (Northeast) */}
          <HoverableGroup
            position={[18, 0, -15]}
            boxSize={[13, 10, 13]}
            boxOffset={[0, 5, 0]}
            color={HOVER_WIREFRAME_COLORS.default}
            labelTitle="Arsenal"
            labelLines={[
              'Weapons and armor storage',
              'Reinforced defensive structure',
              'Barred windows for security'
            ]}
            labelOffset={[0, 10, 0]}
          >
            <Arsenal
              position={[0, 0, 0]}
              lod={lod}
            />
          </HoverableGroup>

          {/* ===== CENTRAL PARADE GROUND ===== */}

          <HoverableGroup
            position={[0, 0, 0]}
            boxSize={[32, 3, 32]}
            boxOffset={[0, 1.5, 0]}
            color={HOVER_WIREFRAME_COLORS.poi}
            labelTitle="Parade Ground"
            labelLines={[
              'Central military training area',
              'Flagpole with Mamluk banner',
              'Training posts and well'
            ]}
            labelOffset={[0, 16, 0]}
          >
            <ParadeGround
              position={[0, 0, 0]}
              lod={lod}
              timeOfDay={timeOfDay}
            />
          </HoverableGroup>
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
