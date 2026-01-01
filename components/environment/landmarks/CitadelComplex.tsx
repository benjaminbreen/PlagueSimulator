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
import { getDistrictType } from '../../../types';
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

const MainGateway: React.FC<{
  position: [number, number, number];
  ablaqTexture: THREE.Texture;
  woodTexture: THREE.Texture;
  brassTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, ablaqTexture, woodTexture, brassTexture, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Gateway structure */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 14, 6]} />
        <meshStandardMaterial map={ablaqTexture} roughness={0.88} />
      </mesh>

      {/* Pointed arch opening */}
      <PointedArch
        width={6}
        height={10}
        depth={6.5}
        position={[0, 5, 0]}
      />

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
            position={[-4.5, 8, 0.1]}
            size={2}
            pattern="star8"
            primaryColor="#1a4a7a"
            accentColor="#c9a23a"
          />
          <GeometricTile
            position={[4.5, 8, 0.1]}
            size={2}
            pattern="star8"
            primaryColor="#1a4a7a"
            accentColor="#c9a23a"
          />

          {/* Guardian lions */}
          <LionSculpture
            position={[-3.5, 0, 2]}
            rotation={Math.PI / 4}
            material="stone"
          />
          <LionSculpture
            position={[3.5, 0, 2]}
            rotation={-Math.PI / 4}
            material="stone"
          />

          {/* Wooden doors */}
          <mesh position={[0, 5, 3]} castShadow>
            <boxGeometry args={[5.8, 9.5, 0.4]} />
            <meshStandardMaterial map={woodTexture} roughness={0.85} />
          </mesh>

          {/* Brass door studs (decorative) */}
          {Array.from({ length: 40 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            return (
              <mesh
                key={`stud-${i}`}
                position={[
                  -2.5 + col * 0.7,
                  1 + row * 1.5,
                  3.25
                ]}
                castShadow
              >
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                  map={brassTexture}
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>
            );
          })}

          {/* Murder holes above entrance */}
          {[-2, 0, 2].map((x, i) => (
            <mesh key={`hole-${i}`} position={[x, 13, 2]} castShadow>
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
// THRONE ROOM / AUDIENCE HALL
// ========================================

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

      {lod === 'close' && (
        <>
          {/* Mashrabiya window screens (upper level) */}
          <Mashrabiya
            position={[-5.5, 7, 4.1]}
            width={2}
            height={2}
            pattern="star"
          />
          <Mashrabiya
            position={[5.5, 7, 4.1]}
            width={2}
            height={2}
            pattern="star"
          />

          {/* Entrance with muqarnas */}
          <PointedArch
            width={3}
            height={6}
            depth={1}
            position={[0, 3, 4.5]}
          />
          <Muqarnas
            position={[0, 6.5, 4.5]}
            width={4}
            depth={1}
            tiers={3}
            color="#d9c9a9"
            accentColor="#1a4a7a"
          />

          {/* Interior muqarnas dome (visible through door) */}
          <Muqarnas
            position={[0, 8.5, 0]}
            width={8}
            depth={8}
            tiers={5}
            color="#1a4a7a"
            accentColor="#c9a23a"
          />

          {/* Central fountain */}
          <OrnateFountain
            position={[0, 0, 0]}
            variant="octagonal"
            scale={1.5}
            hasWaterAnimation={true}
          />

          {/* Floor paving */}
          <mesh position={[0, 0.05, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[11, 7]} />
            <meshStandardMaterial map={pavingTexture} />
          </mesh>
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

const PalaceCourtyard: React.FC<{
  position: [number, number, number];
  pavingTexture: THREE.Texture;
  lod: 'close' | 'medium' | 'far';
}> = ({ position, pavingTexture, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Geometric paving */}
      <mesh position={[0, 0.05, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial map={pavingTexture} />
      </mesh>

      {/* Central fountain */}
      <OrnateFountain
        position={[0, 0, 0]}
        variant="tiered"
        scale={2.5}
        hasWaterAnimation={true}
      />

      {lod === 'close' && (
        <>
          {/* Trees in terracotta pots */}
          {[
            [-7, 0, -5],
            [7, 0, -5],
            [-7, 0, 5],
            [7, 0, 5]
          ].map((pos, i) => (
            <group key={`tree-${i}`} position={pos as [number, number, number]}>
              <DecorativeUrn
                variant="amphora"
                scale={0.8}
                position={[0, 0.4, 0]}
              />
              {/* Citrus tree */}
              <mesh position={[0, 2.5, 0]} castShadow>
                <sphereGeometry args={[1.2, 8, 6]} />
                <meshStandardMaterial color="#4a6a3a" roughness={0.85} />
              </mesh>
              {/* Tree trunk */}
              <mesh position={[0, 1.2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.2, 1.5, 6]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Decorative urns at corners */}
          {[
            [-9, 0, -7],
            [9, 0, -7],
            [-9, 0, 7],
            [9, 0, 7]
          ].map((pos, i) => (
            <DecorativeUrn
              key={`urn-${i}`}
              variant="vase"
              scale={0.6}
              position={pos as [number, number, number]}
            />
          ))}

          {/* Arcade colonnade (west side) */}
          <ArcadeColonnade
            position={[-10, 0, 0]}
            length={14}
            columns={5}
            style="ornate"
            height={6}
            orientation="north-south"
          />
        </>
      )}
    </group>
  );
};

// ========================================
// BARRACKS BUILDING
// ========================================

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

      {lod === 'close' && (
        <>
          {/* Arcade bays (8 arches) */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = -12.5 + i * 3.2 + 1.6;
            return (
              <PointedArch
                key={`bay-${i}`}
                position={[x, 1.8, 4.2]}
                width={2.4}
                height={3}
                depth={0.5}
              />
            );
          })}

          {/* Upper floor windows */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -10 + i * 4;
            return (
              <Window
                key={`window-${i}`}
                position={[x, 4.5, 4.05]}
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

const Stables: React.FC<{
  position: [number, number, number];
  lod: 'close' | 'medium' | 'far';
}> = ({ position, lod }) => {
  if (lod === 'far') return null;

  return (
    <group position={position}>
      {/* Main structure */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 4, 10]} />
        <meshStandardMaterial color="#b8a886" roughness={0.92} />
      </mesh>

      {/* Sloped roof */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[19, 0.3, 11]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.95} />
      </mesh>

      {lod === 'close' && (
        <>
          {/* Open front with wooden pillars */}
          {Array.from({ length: 5 }).map((_, i) => {
            const x = -7 + i * 3.5;
            return (
              <mesh key={`pillar-${i}`} position={[x, 1.5, 5.2]} castShadow>
                <cylinderGeometry args={[0.2, 0.25, 3, 8]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
              </mesh>
            );
          })}

          {/* Hay bales visible inside */}
          {[
            [-4, 0.5, -2],
            [-1, 0.5, -3],
            [2, 0.5, -2],
            [5, 0.5, -3]
          ].map((pos, i) => (
            <mesh key={`hay-${i}`} position={pos as [number, number, number]} castShadow>
              <boxGeometry args={[1.2, 1, 1]} />
              <meshStandardMaterial color="#d8c898" roughness={0.95} />
            </mesh>
          ))}

          {/* Water trough */}
          <mesh position={[-6, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.6, 4]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
          </mesh>
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
      {/* Stone paving */}
      <mesh position={[0, 0.05, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
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
          {/* ===== OUTER DEFENSIVE WALLS ===== */}

          {/* North wall */}
      <AblaqWall
        position={[0, 0, -30]}
        width={60}
        height={12}
        depth={4}
        orientation="east-west"
        ablaqTexture={ablaqTexture}
      />

      {/* South wall */}
      <AblaqWall
        position={[0, 0, 30]}
        width={60}
        height={12}
        depth={4}
        orientation="east-west"
        ablaqTexture={ablaqTexture}
      />

      {/* West wall */}
      <AblaqWall
        position={[-30, 0, 0]}
        width={60}
        height={12}
        depth={4}
        orientation="north-south"
        ablaqTexture={ablaqTexture}
      />

      {/* East wall */}
      <AblaqWall
        position={[30, 0, 0]}
        width={60}
        height={12}
        depth={4}
        orientation="north-south"
        ablaqTexture={ablaqTexture}
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
