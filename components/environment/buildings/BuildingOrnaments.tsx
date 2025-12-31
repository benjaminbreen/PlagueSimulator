import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingMetadata, BuildingType, DistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import {
  GeometricTile,
  Muqarnas,
  DecorativeUrn,
  LionSculpture,
  ISLAMIC_COLORS
} from '../decorations/IslamicOrnaments';
import { HoverableGroup } from '../shared/HoverSystem';
import { useNightTintedMaterial } from '../shared/nightMaterials';

const Awning: React.FC<{ material: THREE.Material; position: [number, number, number]; rotation: [number, number, number]; width: number; seed: number; nightFactor: number }> = ({ material, position, rotation, width, seed, nightFactor }) => {
  const ref = useRef<THREE.Mesh>(null);
  const tintedMaterial = useNightTintedMaterial(material, nightFactor, '#657183', 0.7);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = rotation[0] + Math.sin(state.clock.elapsedTime + seed) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[width, 3]} />
      <primitive object={tintedMaterial} />
    </mesh>
  );
};

const Torch: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; intensity: number }> = ({ position, rotation, intensity }) => (
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

const PotTree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.1, 1.0, 1.1]}
    labelTitle="Potted Olive Tree"
    labelLines={['Fragrant foliage', 'Terracotta pot', 'Shaded fruit']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const StoneSculpture: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.0, 1.1, 1.0]}
    labelTitle="Stone Plinth"
    labelLines={['Decorative carving', 'Local limestone', 'Weathered edges']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <boxGeometry args={[0.8, 0.3, 0.8]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.25, 0.3, 0.7, 10]} />
      <meshStandardMaterial color="#a98963" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const CornerTurret: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.6, 2.8, 1.6]}
    labelTitle="Roof Turret"
    labelLines={['Defensive lookout', 'Baked brick', 'City skyline mark']}
    labelOffset={[0, 2.3, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.6, 0.7, 2.2, 12]} />
      <meshStandardMaterial color="#c9b79d" roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.2, 0]} castShadow>
      <coneGeometry args={[0.7, 0.6, 10]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

interface BuildingOrnamentsProps {
  data: BuildingMetadata;
  district: DistrictType;
  finalBuildingSize: number;
  finalHeight: number;
  localSeed: number;
  isOrnateBuilding: boolean;
  showOrnateDetails: boolean;
  doorPos: [number, number, number];
  doorOutwardOffset: [number, number, number];
  doorSideOffset: [number, number, number];
  hasResidentialClutter: boolean;
  clutterType: number;
  hasWealthyDoorOrnaments: boolean;
  hasTurret: boolean;
  torchOffsets: [number, number, number][];
  torchIntensity: number;
  otherMaterials: any;
  nightFactor: number;
}

export const BuildingOrnaments: React.FC<BuildingOrnamentsProps> = ({
  data,
  district,
  finalBuildingSize,
  finalHeight,
  localSeed,
  isOrnateBuilding,
  showOrnateDetails,
  doorPos,
  doorOutwardOffset,
  doorSideOffset,
  hasResidentialClutter,
  clutterType,
  hasWealthyDoorOrnaments,
  hasTurret,
  torchOffsets,
  torchIntensity,
  otherMaterials,
  nightFactor
}) => {
  const doorRotation = data.doorSide * (Math.PI / 2);
  const groundY = doorPos[1] - 1.25;

  return (
    <>
      {/* ORNATE ABLAQ BANDS - Alternating light/dark stone horizontal stripes (Mamluk Damascus style) */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 201) > 0.75 && (
        <group>
          {[0.2, 0.4, 0.6, 0.8].map((hFrac, i) => (
            <mesh key={`ablaq-${i}`} position={[0, -finalHeight / 2 + finalHeight * hFrac, 0]} receiveShadow>
              <boxGeometry args={[finalBuildingSize * 1.01, finalHeight * 0.06, finalBuildingSize * 1.01]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#2a2420' : '#e8dcc8'}
                roughness={0.85}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ORNATE MUQARNAS CORBELS - Decorative brackets under roofline */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 211) > 0.78 && (
        <group position={[0, finalHeight / 2 - 0.3, 0]}>
          {[0, 1, 2, 3].map((side) => {
            const offset = finalBuildingSize / 2 + 0.08;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 || side === 2 ? 0 : Math.PI / 2;
            const numCorbels = Math.floor(finalBuildingSize / 1.2);
            return (
              <group key={`corbel-side-${side}`} position={[x, 0, z]} rotation={[0, rot, 0]}>
                {Array.from({ length: numCorbels }).map((_, ci) => {
                  const spacing = finalBuildingSize / numCorbels;
                  const xPos = (ci - (numCorbels - 1) / 2) * spacing;
                  return (
                    <group key={`corbel-${ci}`} position={[xPos, 0, 0]}>
                      <mesh castShadow>
                        <boxGeometry args={[0.25, 0.15, 0.2]} />
                        <meshStandardMaterial color="#c4b196" roughness={0.9} />
                      </mesh>
                      <mesh position={[0, -0.12, 0.08]} castShadow>
                        <boxGeometry args={[0.2, 0.12, 0.15]} />
                        <meshStandardMaterial color="#b9a588" roughness={0.9} />
                      </mesh>
                      <mesh position={[0, -0.22, 0.14]} castShadow>
                        <boxGeometry args={[0.15, 0.1, 0.1]} />
                        <meshStandardMaterial color="#ae9a7a" roughness={0.9} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* ORNATE WALL NICHES - Decorative mihrab-style alcoves */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 221) > 0.8 && (
        <group>
          {[0, 1, 2, 3].filter(() => seededRandom(localSeed + 225 + Math.random() * 100) > 0.5).slice(0, 2).map((side) => {
            const offset = finalBuildingSize / 2 + 0.02;
            const x = side === 1 ? offset : side === 3 ? -offset : (seededRandom(localSeed + 230 + side) - 0.5) * finalBuildingSize * 0.5;
            const z = side === 0 ? offset : side === 2 ? -offset : (seededRandom(localSeed + 235 + side) - 0.5) * finalBuildingSize * 0.5;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const nicheY = -finalHeight * 0.1 + seededRandom(localSeed + 240 + side) * finalHeight * 0.2;
            return (
              <group key={`niche-${side}`} position={[x, nicheY, z]} rotation={[0, rot, 0]}>
                <mesh position={[0, 0, -0.08]} castShadow>
                  <boxGeometry args={[0.9, 1.4, 0.2]} />
                  <meshStandardMaterial color="#3d3428" roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.45, 0.45, 0.12, 8, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.85} />
                </mesh>
                <mesh position={[0, -0.1, 0.02]}>
                  <boxGeometry args={[0.6, 0.9, 0.05]} />
                  <meshStandardMaterial color="#4a3d30" roughness={0.9} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* ORNATE CARVED MEDALLIONS - Geometric stone rosettes */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 251) > 0.77 && (
        <group>
          {[0, 1, 2, 3].map((side) => {
            if (seededRandom(localSeed + 255 + side * 7) < 0.6) return null;
            const offset = finalBuildingSize / 2 + 0.03;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const medallionY = finalHeight * 0.15 + seededRandom(localSeed + 260 + side) * finalHeight * 0.15;
            return (
              <group key={`medallion-${side}`} position={[x, medallionY, z]} rotation={[0, rot, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.35, 0.06, 8, 16]} />
                  <meshStandardMaterial color="#d4c4a8" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0, 0.02]}>
                  <circleGeometry args={[0.28, 8]} />
                  <meshStandardMaterial color="#8b7355" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0, 0.05]}>
                  <sphereGeometry args={[0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.8} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* ORNATE WINDOW SURROUNDS - Mashrabiya-style carved frames for wealthy buildings */}
      {isOrnateBuilding && showOrnateDetails && seededRandom(localSeed + 271) > 0.7 && (
        <group>
          {[0, 1, 2, 3].filter(s => s !== data.doorSide).slice(0, 2).map((side) => {
            const offset = finalBuildingSize / 2 + 0.04;
            const x = side === 1 ? offset : side === 3 ? -offset : 0;
            const z = side === 0 ? offset : side === 2 ? -offset : 0;
            const rot = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
            const windowY = finalHeight / 2 - 2;
            return (
              <group key={`window-surround-${side}`} position={[x, windowY, z]} rotation={[0, rot, 0]}>
                <mesh position={[0, 0, 0]} castShadow>
                  <boxGeometry args={[2.0, 2.8, 0.1]} />
                  <meshStandardMaterial color="#c9b99a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0, 0.03]}>
                  <boxGeometry args={[1.6, 2.4, 0.06]} />
                  <meshStandardMaterial color="#2a2420" roughness={0.95} />
                </mesh>
                <mesh position={[0, 1.5, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.8, 0.8, 0.1, 8, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#c4b196" roughness={0.88} />
                </mesh>
                {[-0.6, 0, 0.6].map((yOff, i) => (
                  <mesh key={`div-${i}`} position={[0, yOff, 0.06]}>
                    <boxGeometry args={[1.5, 0.08, 0.04]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.9} />
                  </mesh>
                ))}
                {[-0.4, 0.4].map((xOff, i) => (
                  <mesh key={`vdiv-${i}`} position={[xOff, -0.1, 0.06]}>
                    <boxGeometry args={[0.06, 2.0, 0.04]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.9} />
                  </mesh>
                ))}
              </group>
            );
          })}
        </group>
      )}

      {/* Animated Awnings */}
      {(data.type === BuildingType.COMMERCIAL || data.type === BuildingType.HOSPITALITY || data.type === BuildingType.CIVIC || seededRandom(localSeed + 3) > 0.6) && (
        <Awning
          material={(() => {
            const civicProfessions = ['Hammam Keeper', 'Court Qadi', 'Mamluk Governor', 'Court Physician', 'Market Inspector', 'Notary'];
            if (data.type === BuildingType.CIVIC && civicProfessions.includes(data.ownerProfession)) {
              return otherMaterials.civicStripes[Math.floor(seededRandom(localSeed + 6) * otherMaterials.civicStripes.length)];
            }
            return seededRandom(localSeed + 5) > 0.5
              ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 6) * otherMaterials.awningStriped.length)]
              : otherMaterials.awning[
                  Math.floor(
                    seededRandom(localSeed + 4) *
                      (district === 'WEALTHY' ? otherMaterials.awning.length : 9)
                  )
                ];
          })()}
          position={[0, -finalHeight / 2 + finalHeight * 0.42, finalBuildingSize / 2 + 0.2]}
          rotation={[0.35 + seededRandom(localSeed + 15) * 1.15, 0, 0]}
          width={finalBuildingSize * (0.72 + seededRandom(localSeed + 16) * 0.12)}
          seed={localSeed}
          nightFactor={nightFactor}
        />
      )}

      {/* Secondary Awning / Beam Protrusions */}
      {seededRandom(localSeed + 61) > 0.75 && (
        <Awning
          material={(() => {
            const civicProfessions = ['Hammam Keeper', 'Court Qadi', 'Mamluk Governor', 'Court Physician', 'Market Inspector', 'Notary'];
            if (data.type === BuildingType.CIVIC && civicProfessions.includes(data.ownerProfession)) {
              return otherMaterials.civicStripes[Math.floor(seededRandom(localSeed + 64) * otherMaterials.civicStripes.length)];
            }
            return seededRandom(localSeed + 63) > 0.5
              ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 64) * otherMaterials.awningStriped.length)]
              : otherMaterials.awning[
                  Math.floor(
                    seededRandom(localSeed + 62) *
                      (district === 'WEALTHY' ? otherMaterials.awning.length : 9)
                  )
                ];
          })()}
          position={[0, -finalHeight / 2 + finalHeight * 0.58, -finalBuildingSize / 2 - 0.2]}
          rotation={[0.3 + seededRandom(localSeed + 66) * 1.0, Math.PI, 0]}
          width={finalBuildingSize * (0.55 + seededRandom(localSeed + 67) * 0.1)}
          seed={localSeed + 2}
          nightFactor={nightFactor}
        />
      )}
      {seededRandom(localSeed + 71) > 0.6 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={`beam-${i}`} position={[finalBuildingSize / 2 + 0.4, -finalHeight / 2 + 1 + i * 1.4, (i - 1) * 1.2]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.15]} />
              <meshStandardMaterial color="#3d2817" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Market ornaments - now rendered with instanced meshes */}
      {hasResidentialClutter && (
        <group position={[0, -finalHeight / 2, 0]}>
          {clutterType === 1 && <PotTree position={[-finalBuildingSize / 2 - 0.9, 0.2, 1.1]} />}
          {clutterType === 2 && <StoneSculpture position={[finalBuildingSize / 2 + 0.7, 0.2, 1.3]} />}
        </group>
      )}
      {hasWealthyDoorOrnaments && (
        <group position={[0, -finalHeight / 2, 0]}>
          <DecorativeUrn
            position={[
              doorPos[0] + doorOutwardOffset[0] + doorSideOffset[0],
              0,
              doorPos[2] + doorOutwardOffset[2] + doorSideOffset[2]
            ]}
            scale={0.5}
            variant={seededRandom(localSeed + 125) > 0.5 ? 'amphora' : 'vase'}
            color={ISLAMIC_COLORS.terracotta}
          />
          <DecorativeUrn
            position={[
              doorPos[0] + doorOutwardOffset[0] - doorSideOffset[0],
              0,
              doorPos[2] + doorOutwardOffset[2] - doorSideOffset[2]
            ]}
            scale={0.5}
            variant={seededRandom(localSeed + 126) > 0.5 ? 'amphora' : 'vase'}
            color={ISLAMIC_COLORS.terracotta}
          />

          {seededRandom(localSeed + 127) > 0.45 && (
            <Muqarnas
              position={[
                doorPos[0],
                2.6,
                doorPos[2] + (data.doorSide === 0 ? 0.2 : data.doorSide === 2 ? -0.2 : 0)
              ]}
              width={1.8}
              depth={0.4}
              tiers={2}
              color={ISLAMIC_COLORS.limestone}
              accentColor={seededRandom(localSeed + 128) > 0.5 ? ISLAMIC_COLORS.cobaltBlue : ISLAMIC_COLORS.turquoise}
            />
          )}

          {seededRandom(localSeed + 129) > 0.5 && (
            <GeometricTile
              position={[
                doorPos[0] + (data.doorSide === 1 ? 0.15 : data.doorSide === 3 ? -0.15 : 0),
                3.2,
                doorPos[2] + (data.doorSide === 0 ? 0.15 : data.doorSide === 2 ? -0.15 : 0)
              ]}
              rotation={[
                0,
                data.doorSide === 0 ? 0 : data.doorSide === 2 ? Math.PI : data.doorSide === 1 ? -Math.PI / 2 : Math.PI / 2,
                0
              ]}
              size={1.2}
              pattern={['star8', 'star6', 'hexagonal'][Math.floor(seededRandom(localSeed + 130) * 3)] as 'star8' | 'star6' | 'hexagonal'}
              primaryColor={ISLAMIC_COLORS.cobaltBlue}
              secondaryColor={ISLAMIC_COLORS.cream}
              accentColor={ISLAMIC_COLORS.gold}
            />
          )}

          {seededRandom(localSeed + 131) > 0.75 && (
            <>
              <LionSculpture
                position={[
                  doorPos[0] + doorOutwardOffset[0] * 1.5 + doorSideOffset[0] * 1.3,
                  0,
                  doorPos[2] + doorOutwardOffset[2] * 1.5 + doorSideOffset[2] * 1.3
                ]}
                rotation={data.doorSide === 0 ? Math.PI : data.doorSide === 2 ? 0 : data.doorSide === 1 ? Math.PI / 2 : -Math.PI / 2}
                scale={0.45}
                material={seededRandom(localSeed + 132) > 0.6 ? 'bronze' : 'stone'}
              />
              <LionSculpture
                position={[
                  doorPos[0] + doorOutwardOffset[0] * 1.5 - doorSideOffset[0] * 1.3,
                  0,
                  doorPos[2] + doorOutwardOffset[2] * 1.5 - doorSideOffset[2] * 1.3
                ]}
                rotation={data.doorSide === 0 ? Math.PI : data.doorSide === 2 ? 0 : data.doorSide === 1 ? Math.PI / 2 : -Math.PI / 2}
                scale={0.45}
                material={seededRandom(localSeed + 132) > 0.6 ? 'bronze' : 'stone'}
              />
            </>
          )}
        </group>
      )}

      {hasTurret && (
        <CornerTurret position={[finalBuildingSize / 2 - 0.6, finalHeight / 2 - 1.1, finalBuildingSize / 2 - 0.6]} />
      )}

      {/* SCHOOL PORTAL + INSCRIPTION BAND + SABIL */}
      {data.type === BuildingType.SCHOOL && (
        <group position={[doorPos[0], groundY, doorPos[2]]} rotation={[0, doorRotation, 0]}>
          {/* Monumental portal frame */}
          <group position={[0, 0, 0.1]}>
            <mesh position={[0, 1.3, 0]} castShadow>
              <boxGeometry args={[3.0, 2.4, 0.12]} />
              <meshStandardMaterial color="#d7c7b1" roughness={0.88} />
            </mesh>
            <mesh position={[0, 2.2, 0.02]} castShadow>
              <circleGeometry args={[1.5, 20, 0, Math.PI]} />
              <meshStandardMaterial color="#c9b89f" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          </group>
          {/* Inscription band */}
          <mesh position={[0, 2.55, 0.18]} castShadow>
            <boxGeometry args={[finalBuildingSize * 0.7, 0.18, 0.06]} />
            <meshStandardMaterial color="#bcae97" roughness={0.85} />
          </mesh>
          {/* Thuluth-style relief (subtle engraved blocks) */}
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh
              key={`inscribe-${i}`}
              position={[
                (i - 3) * (finalBuildingSize * 0.08),
                2.55,
                0.205
              ]}
              castShadow
            >
              <boxGeometry args={[finalBuildingSize * 0.07, 0.09, 0.012]} />
              <meshStandardMaterial color="#a99985" roughness={0.9} />
            </mesh>
          ))}
          {/* Sabil basin near entry */}
          <group position={[1.25, 0.2, 0.9]}>
            <mesh castShadow>
              <boxGeometry args={[0.6, 0.3, 0.35]} />
              <meshStandardMaterial color="#bfb2a0" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.25, 0.15]} castShadow>
              <boxGeometry args={[0.35, 0.1, 0.08]} />
              <meshStandardMaterial color="#a8967f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.05, 0.2]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.12, 8]} />
              <meshStandardMaterial color="#8c7b65" roughness={0.9} />
            </mesh>
          </group>
        </group>
      )}

      {/* HOSPITALITY PORCH - table and two chairs */}
      {data.type === BuildingType.HOSPITALITY && (
        <group position={[doorPos[0], groundY, doorPos[2]]} rotation={[0, doorRotation, 0]}>
          <group position={[0.0, 0, 1.0]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.9, 0.08, 0.6]} />
              <meshStandardMaterial color="#7a5b3a" roughness={0.85} />
            </mesh>
            {[-0.35, 0.35].map((x) => (
              <mesh key={`inn-chair-${x}`} position={[x, 0.25, -0.55]} castShadow>
                <boxGeometry args={[0.35, 0.5, 0.35]} />
                <meshStandardMaterial color="#8b6a45" roughness={0.9} />
              </mesh>
            ))}
            {[-0.35, 0.35].map((x) => (
              <mesh key={`inn-chair-back-${x}`} position={[x, 0.6, -0.68]} castShadow>
                <boxGeometry args={[0.35, 0.45, 0.08]} />
                <meshStandardMaterial color="#7a5b3a" roughness={0.9} />
              </mesh>
            ))}
          </group>
        </group>
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
    </>
  );
};
