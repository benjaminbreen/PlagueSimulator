import React from 'react';
import * as THREE from 'three';
import { BuildingMetadata, BuildingType } from '../../../types';
import { ProfessionSign, getProfessionSign } from '../../../utils/professionSignData';

type BuildingFrontDetailsProps = {
  data: BuildingMetadata;
  doorPos: [number, number, number];
  doorRotation: number;
  nightFactor: number;
};

export const BuildingFrontDetails: React.FC<BuildingFrontDetailsProps> = ({ data, doorPos, doorRotation, nightFactor }) => (
  <>
    {/* MEZUZAH - Jewish doorframe scripture cases (Jewish Quarter only) */}
    {data.district === 'JEWISH_QUARTER' && (
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
        <mesh
          position={[1.2, 1.3, 0.05]}
          rotation={[0, 0, Math.PI / 12]}
          castShadow
        >
          <boxGeometry args={[0.08, 0.25, 0.06]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
        </mesh>
        {/* Small decorative Hebrew letter shin (ש) on mezuzah */}
        <mesh
          position={[1.2, 1.3, 0.09]}
          rotation={[0, 0, Math.PI / 12]}
        >
          <boxGeometry args={[0.03, 0.06, 0.01]} />
          <meshStandardMaterial color="#d4c4b4" roughness={0.6} />
        </mesh>
      </group>
    )}

    {/* PROFESSION SIGNAGE - Historically accurate merchant signs */}
    {data.ownerProfession && (() => {
      const buildFallbackSign = (profession: string, buildingType: BuildingType): ProfessionSign => {
        let hash = 0;
        for (let i = 0; i < profession.length; i += 1) {
          hash = (hash * 31 + profession.charCodeAt(i)) >>> 0;
        }
        const roll = (hash % 1000) / 1000;
        const geometries: ProfessionSign['geometry'][] = ['medallion', 'fabric', 'tools', 'bag', 'bowl', 'lamp'];
        const geometry = geometries[Math.floor(roll * geometries.length)] ?? 'medallion';
        const type = buildingType === BuildingType.COMMERCIAL ? (roll > 0.5 ? 'hanging' : 'banner')
          : buildingType === BuildingType.CIVIC || buildingType === BuildingType.RELIGIOUS ? 'mounted'
            : 'mounted';
        const baseColor = roll > 0.66 ? '#8b6f47' : roll > 0.33 ? '#6b4a2a' : '#5a4331';
        return {
          type,
          geometry,
          color: baseColor,
          metalness: 0.1,
          roughness: 0.85,
          bracketOffset: type === 'hanging' ? 0.35 : 0,
          heightOffset: 0.85,
          scale: 1.0
        };
      };

      const professionSign = getProfessionSign(data.ownerProfession) ?? buildFallbackSign(data.ownerProfession, data.type);
      if (!professionSign) return null;

      const signScale = professionSign.scale * 1.55;
      const signHeight = professionSign.heightOffset + 0.45;
      const bracketLen = professionSign.bracketOffset * 1.6;

      // Helper function to render different sign geometries
      const renderSignGeometry = () => {
        const mat = (
          <meshStandardMaterial
            color={professionSign.color}
            metalness={professionSign.metalness ?? 0}
            roughness={professionSign.roughness ?? 0.9}
            emissive={professionSign.emissive ?? 'black'}
            emissiveIntensity={professionSign.emissive ? (nightFactor * 0.4) : 0}
            side={THREE.DoubleSide}
          />
        );

        switch (professionSign.geometry) {
          case 'bowl':
            return (
              <mesh castShadow>
                <sphereGeometry args={[0.18 * signScale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                {mat}
              </mesh>
            );

          case 'vessel':
          case 'pitcher':
            return (
              <group>
                {/* Main vessel body */}
                <mesh position={[0, -0.05, 0]} castShadow>
                  <cylinderGeometry args={[0.12 * signScale, 0.15 * signScale, 0.3 * signScale, 12]} />
                  {mat}
                </mesh>
                {/* Neck */}
                <mesh position={[0, 0.12, 0]} castShadow>
                  <cylinderGeometry args={[0.06 * signScale, 0.08 * signScale, 0.15 * signScale, 10]} />
                  {mat}
                </mesh>
                {/* Lip */}
                <mesh position={[0, 0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.08 * signScale, 0.06 * signScale, 0.04 * signScale, 10]} />
                  {mat}
                </mesh>
              </group>
            );

          case 'horseshoe':
            return (
              <mesh rotation={[0, 0, 0]} castShadow>
                <torusGeometry args={[0.15 * signScale, 0.04 * signScale, 8, 16, Math.PI]} />
                {mat}
              </mesh>
            );

          case 'key':
            return (
              <group>
                {/* Key shaft */}
                <mesh position={[0, 0.15, 0]} castShadow>
                  <cylinderGeometry args={[0.025 * signScale, 0.025 * signScale, 0.4 * signScale, 8]} />
                  {mat}
                </mesh>
                {/* Key head (ring) */}
                <mesh position={[0, -0.08, 0]} castShadow>
                  <torusGeometry args={[0.08 * signScale, 0.03 * signScale, 8, 12]} />
                  {mat}
                </mesh>
                {/* Key teeth */}
                <mesh position={[0.03 * signScale, 0.33, 0]} castShadow>
                  <boxGeometry args={[0.06 * signScale, 0.08 * signScale, 0.03 * signScale]} />
                  {mat}
                </mesh>
              </group>
            );

          case 'fabric':
            return (
              <group>
                {/* Fabric banner */}
                <mesh castShadow>
                  <boxGeometry args={[0.6 * signScale, 0.5 * signScale, 0.02]} />
                  {mat}
                </mesh>
                {/* Decorative fringe */}
                {professionSign.secondaryColor && (
                  <mesh position={[0, -0.27 * signScale, 0.01]}>
                    <boxGeometry args={[0.6 * signScale, 0.04 * signScale, 0.01]} />
                    <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} side={THREE.DoubleSide} />
                  </mesh>
                )}
              </group>
            );

          case 'mortar':
            return (
              <group>
                {/* Mortar bowl */}
                <mesh position={[0, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.12 * signScale, 0.08 * signScale, 0.15 * signScale, 12]} />
                  {mat}
                </mesh>
                {/* Pestle */}
                <mesh position={[0.05 * signScale, 0.05, 0.05 * signScale]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                  <cylinderGeometry args={[0.025 * signScale, 0.035 * signScale, 0.25 * signScale, 8]} />
                  {mat}
                </mesh>
                {/* Green healing symbol for apothecary */}
                {professionSign.secondaryColor && (
                  <mesh position={[0, 0, 0.13 * signScale]}>
                    <boxGeometry args={[0.08 * signScale, 0.15 * signScale, 0.02]} />
                    <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                  </mesh>
                )}
              </group>
            );

          case 'bread':
            return (
              <group>
                {/* Pretzel/bread shape */}
                <mesh rotation={[0, 0, 0]} castShadow>
                  <torusGeometry args={[0.15 * signScale, 0.05 * signScale, 10, 16]} />
                  {mat}
                </mesh>
                {/* Cross piece for pretzel */}
                <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                  <torusGeometry args={[0.12 * signScale, 0.045 * signScale, 10, 16, Math.PI / 2]} />
                  {mat}
                </mesh>
              </group>
            );

          case 'rug':
            return (
              <group>
                {/* Rug surface */}
                <mesh castShadow>
                  <boxGeometry args={[0.5 * signScale, 0.6 * signScale, 0.03 * signScale]} />
                  {mat}
                </mesh>
                {/* Pattern stripes */}
                {professionSign.secondaryColor && (
                  <>
                    <mesh position={[0, 0.15 * signScale, 0.02 * signScale]}>
                      <boxGeometry args={[0.45 * signScale, 0.08 * signScale, 0.01]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} />
                    </mesh>
                    <mesh position={[0, -0.15 * signScale, 0.02 * signScale]}>
                      <boxGeometry args={[0.45 * signScale, 0.08 * signScale, 0.01]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.8} />
                    </mesh>
                  </>
                )}
              </group>
            );

          case 'lamp':
            return (
              <group>
                {/* Lantern frame */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.08 * signScale, 0.1 * signScale, 0.25 * signScale, 6]} />
                  {mat}
                </mesh>
                {/* Top cap */}
                <mesh position={[0, 0.15 * signScale, 0]} castShadow>
                  <coneGeometry args={[0.09 * signScale, 0.1 * signScale, 6]} />
                  {mat}
                </mesh>
                {/* Glass panels (emissive) */}
                <mesh>
                  <cylinderGeometry args={[0.075 * signScale, 0.095 * signScale, 0.22 * signScale, 6]} />
                  <meshStandardMaterial
                    color="#ffeed0"
                    transparent
                    opacity={0.3}
                    emissive={professionSign.emissive ?? '#ff9944'}
                    emissiveIntensity={nightFactor * 0.6}
                  />
                </mesh>
              </group>
            );

          case 'censer':
            return (
              <group>
                {/* Incense burner body */}
                <mesh castShadow>
                  <sphereGeometry args={[0.1 * signScale, 10, 8]} />
                  {mat}
                </mesh>
                {/* Top with holes */}
                <mesh position={[0, 0.08 * signScale, 0]} castShadow>
                  <cylinderGeometry args={[0.05 * signScale, 0.08 * signScale, 0.06 * signScale, 8]} />
                  {mat}
                </mesh>
                {/* Hanging chain segments */}
                <mesh position={[0, 0.2 * signScale, 0]}>
                  <cylinderGeometry args={[0.01 * signScale, 0.01 * signScale, 0.2 * signScale, 6]} />
                  <meshStandardMaterial color="#5a5a5a" metalness={0.6} roughness={0.5} />
                </mesh>
              </group>
            );

          case 'medallion':
            return (
              <group>
                {/* Circular medallion base */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.2 * signScale, 0.2 * signScale, 0.05 * signScale, 16]} />
                  {mat}
                </mesh>
                {/* Carved detail ring */}
                <mesh position={[0, 0, 0.03 * signScale]}>
                  <torusGeometry args={[0.15 * signScale, 0.02 * signScale, 8, 16]} />
                  <meshStandardMaterial
                    color={professionSign.secondaryColor ?? '#6a5a4a'}
                    metalness={professionSign.metalness ?? 0}
                    roughness={(professionSign.roughness ?? 0.9) + 0.1}
                  />
                </mesh>
              </group>
            );

          case 'tools':
            return (
              <group>
                {/* Crossed tools (saw and plane) */}
                {/* Tool 1 - Saw */}
                <mesh position={[-0.05 * signScale, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <boxGeometry args={[0.35 * signScale, 0.05 * signScale, 0.03 * signScale]} />
                  {mat}
                </mesh>
                {/* Tool 2 - Plane/Chisel */}
                <mesh position={[0.05 * signScale, 0, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                  <boxGeometry args={[0.35 * signScale, 0.04 * signScale, 0.03 * signScale]} />
                  {mat}
                </mesh>
                {/* Metal blades */}
                {professionSign.secondaryColor && (
                  <>
                    <mesh position={[-0.05 * signScale, 0.12 * signScale, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                      <boxGeometry args={[0.15 * signScale, 0.04 * signScale, 0.02 * signScale]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} metalness={0.7} roughness={0.4} />
                    </mesh>
                    <mesh position={[0.05 * signScale, 0.12 * signScale, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                      <boxGeometry args={[0.15 * signScale, 0.03 * signScale, 0.02 * signScale]} />
                      <meshStandardMaterial color={professionSign.secondaryColor} metalness={0.7} roughness={0.4} />
                    </mesh>
                  </>
                )}
              </group>
            );

          case 'amphora':
            return (
              <group>
                {/* Main body */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.12 * signScale, 0.08 * signScale, 0.35 * signScale, 12]} />
                  {mat}
                </mesh>
                {/* Neck */}
                <mesh position={[0, 0.22 * signScale, 0]} castShadow>
                  <cylinderGeometry args={[0.05 * signScale, 0.08 * signScale, 0.15 * signScale, 10]} />
                  {mat}
                </mesh>
                {/* Handles */}
                <mesh position={[0.1 * signScale, 0.05 * signScale, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.06 * signScale, 0.02 * signScale, 6, 8, Math.PI]} />
                  {mat}
                </mesh>
                <mesh position={[-0.1 * signScale, 0.05 * signScale, 0]} rotation={[Math.PI / 2, 0, Math.PI]} castShadow>
                  <torusGeometry args={[0.06 * signScale, 0.02 * signScale, 6, 8, Math.PI]} />
                  {mat}
                </mesh>
              </group>
            );

          case 'shuttle':
            return (
              <group>
                {/* Weaving shuttle body */}
                <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
                  <boxGeometry args={[0.4 * signScale, 0.06 * signScale, 0.05 * signScale]} />
                  {mat}
                </mesh>
                {/* Pointed ends */}
                <mesh position={[0.18 * signScale, 0, 0]} rotation={[0, 0, Math.PI / 6 - Math.PI / 4]} castShadow>
                  <coneGeometry args={[0.03 * signScale, 0.08 * signScale, 6]} />
                  {mat}
                </mesh>
                {/* Colored thread */}
                {professionSign.secondaryColor && (
                  <mesh rotation={[0, 0, Math.PI / 6]}>
                    <cylinderGeometry args={[0.025 * signScale, 0.025 * signScale, 0.2 * signScale, 8]} />
                    <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                  </mesh>
                )}
              </group>
            );

          case 'bag':
            return (
              <group>
                {/* Leather bag body */}
                <mesh castShadow>
                  <boxGeometry args={[0.25 * signScale, 0.3 * signScale, 0.15 * signScale]} />
                  {mat}
                </mesh>
                {/* Strap */}
                <mesh position={[0, 0.2 * signScale, 0]} castShadow>
                  <cylinderGeometry args={[0.015 * signScale, 0.015 * signScale, 0.15 * signScale, 8]} />
                  {mat}
                </mesh>
              </group>
            );

          case 'soap':
            return (
              <group>
                {/* Stacked soap bars */}
                <mesh position={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.15 * signScale, 0.08 * signScale, 0.12 * signScale]} />
                  {mat}
                </mesh>
                <mesh position={[0.05 * signScale, 0.08 * signScale, 0]} castShadow>
                  <boxGeometry args={[0.14 * signScale, 0.08 * signScale, 0.11 * signScale]} />
                  {mat}
                </mesh>
                {/* Olive accent */}
                {professionSign.secondaryColor && (
                  <mesh position={[0, 0.14 * signScale, 0.07 * signScale]}>
                    <sphereGeometry args={[0.02 * signScale, 8, 6]} />
                    <meshStandardMaterial color={professionSign.secondaryColor} roughness={0.7} />
                  </mesh>
                )}
              </group>
            );

          default:
            return null;
        }
      };

      // Position sign relative to door
      return (
        <group position={doorPos} rotation={[0, doorRotation, 0]}>
          {/* Bracket for hanging signs */}
          {professionSign.type === 'hanging' && bracketLen > 0 && (
            <>
              {/* Horizontal bracket arm extending from wall */}
              <mesh position={[bracketLen / 2, signHeight, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, bracketLen, 6]} />
                <meshStandardMaterial color="#3a3430" roughness={0.9} />
              </mesh>
              {/* Vertical support */}
              <mesh position={[0, signHeight - 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
                <meshStandardMaterial color="#3a3430" roughness={0.9} />
              </mesh>
              {/* Diagonal brace */}
              <mesh position={[bracketLen / 4, signHeight - 0.05, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, bracketLen * 0.6, 6]} />
                <meshStandardMaterial color="#3a3430" roughness={0.9} />
              </mesh>
              {/* Sign hanging from bracket */}
              <group position={[bracketLen, signHeight - 0.1, 0]}>
                {renderSignGeometry()}
              </group>
            </>
          )}

          {/* Mounted signs (above door) */}
          {professionSign.type === 'mounted' && (
            <>
              {/* Wooden shelf/mounting plate */}
              <mesh position={[0, signHeight - 0.05, 0.28]} castShadow>
                <boxGeometry args={[0.5 * signScale, 0.05, 0.18]} />
                <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
              </mesh>
              {/* Backplate to push sign forward */}
              <mesh position={[0, signHeight + 0.04, 0.3]} castShadow>
                <boxGeometry args={[0.58 * signScale, 0.06, 0.06]} />
                <meshStandardMaterial color="#4f3824" roughness={0.95} />
              </mesh>
              {/* Sign on shelf */}
              <group position={[0, signHeight + 0.14, 0.34]}>
                {renderSignGeometry()}
              </group>
            </>
          )}

          {/* Banner signs (hanging from rod above door) */}
          {professionSign.type === 'banner' && (
            <>
              {/* Horizontal hanging rod */}
              <mesh position={[0, signHeight + 0.18, 0.15]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.8 * signScale, 8]} />
                <meshStandardMaterial color="#3a3430" roughness={0.9} />
              </mesh>
              {/* Fabric/rug hanging from rod */}
              <group position={[0, signHeight - 0.05, 0.18]}>
                {renderSignGeometry()}
              </group>
            </>
          )}
        </group>
      );
    })()}
  </>
);
