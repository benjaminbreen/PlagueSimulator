import React from 'react';
import * as THREE from 'three';
import { DistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

type BuildingRoofDetailsProps = {
  district: DistrictType;
  finalBuildingSize: number;
  finalHeight: number;
  localSeed: number;
};

export const BuildingRoofDetails: React.FC<BuildingRoofDetailsProps> = ({
  district,
  finalBuildingSize,
  finalHeight,
  localSeed
}) => {
  if (district !== 'WEALTHY') return null;

  return (
    <>
      {/* Base parapet band */}
      <mesh position={[0, finalHeight / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[finalBuildingSize + 0.6, 0.3, finalBuildingSize + 0.6]} />
        <meshStandardMaterial color="#c9b79d" roughness={0.9} />
      </mesh>
      <mesh position={[0, finalHeight / 2 + 0.35, 0]} castShadow>
        <boxGeometry args={[finalBuildingSize + 0.4, 0.08, finalBuildingSize + 0.4]} />
        <meshStandardMaterial color="#bfae96" roughness={0.85} />
      </mesh>

      {/* Decorative crenellations/merlons along roofline */}
      {seededRandom(localSeed + 32) > 0.3 && (
        <group position={[0, finalHeight / 2 + 0.5, 0]}>
          {[0, 1, 2, 3].map((side) => {
            const halfSize = (finalBuildingSize + 0.5) / 2;
            const numMerlons = Math.floor(finalBuildingSize / 0.9);
            return Array.from({ length: numMerlons }).map((_, mi) => {
              const offset = (mi - (numMerlons - 1) / 2) * 0.9;
              const x = side === 1 ? halfSize : side === 3 ? -halfSize : offset;
              const z = side === 0 ? halfSize : side === 2 ? -halfSize : offset;
              if (side === 1 || side === 3) {
                return (
                  <mesh key={`merlon-${side}-${mi}`} position={[x, 0.15, offset]} castShadow>
                    <boxGeometry args={[0.25, 0.35, 0.4]} />
                    <meshStandardMaterial color="#c4b08a" roughness={0.88} />
                  </mesh>
                );
              }
              return (
                <mesh key={`merlon-${side}-${mi}`} position={[offset, 0.15, z]} castShadow>
                  <boxGeometry args={[0.4, 0.35, 0.25]} />
                  <meshStandardMaterial color="#c4b08a" roughness={0.88} />
                </mesh>
              );
            });
          })}
        </group>
      )}

      {/* Corner turrets - small decorative towers at corners */}
      {seededRandom(localSeed + 35) > 0.55 && (
        <group>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([cx, cz], ti) => {
            if (seededRandom(localSeed + 36 + ti) > 0.6) return null;
            const halfSize = (finalBuildingSize + 0.3) / 2;
            return (
              <group key={`turret-${ti}`} position={[cx * halfSize, finalHeight / 2 + 0.6, cz * halfSize]}>
                {/* Turret base */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.5, 0.55, 0.8, 8]} />
                  <meshStandardMaterial color="#c9b79d" roughness={0.85} />
                </mesh>
                {/* Turret cap - conical or domed */}
                {seededRandom(localSeed + 38 + ti) > 0.5 ? (
                  <mesh position={[0, 0.55, 0]} castShadow>
                    <coneGeometry args={[0.45, 0.6, 8]} />
                    <meshStandardMaterial color="#9a8570" roughness={0.8} />
                  </mesh>
                ) : (
                  <mesh position={[0, 0.45, 0]} castShadow>
                    <sphereGeometry args={[0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#b5a58a" roughness={0.8} />
                  </mesh>
                )}
                {/* Finial on top */}
                <mesh position={[0, 0.95, 0]} castShadow>
                  <sphereGeometry args={[0.12, 6, 5]} />
                  <meshStandardMaterial color="#d4c4a0" roughness={0.7} metalness={0.15} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Central dome or lantern - for larger mansions */}
      {seededRandom(localSeed + 37) > 0.6 && (
        <group position={[0, finalHeight / 2 + 0.4, 0]}>
          {seededRandom(localSeed + 39) > 0.5 ? (
            // Small dome
            <>
              <mesh position={[0, 0.15, 0]} castShadow>
                <cylinderGeometry args={[finalBuildingSize / 3.5, finalBuildingSize / 3, 0.35, 12]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.5, 0]} castShadow>
                <sphereGeometry args={[finalBuildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#bda88b" roughness={0.8} />
              </mesh>
              {/* Finial */}
              <mesh position={[0, 0.5 + finalBuildingSize / 4.5, 0]} castShadow>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial color="#d8c8a0" roughness={0.6} metalness={0.2} />
              </mesh>
            </>
          ) : (
            // Decorative lantern/pavilion
            <>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[finalBuildingSize / 3, 0.6, finalBuildingSize / 3]} />
                <meshStandardMaterial color="#c4b496" roughness={0.85} />
              </mesh>
              {/* Small arched openings on lantern */}
              {[0, 1, 2, 3].map((side) => {
                const lOff = finalBuildingSize / 6 + 0.02;
                const lx = side === 1 ? lOff : side === 3 ? -lOff : 0;
                const lz = side === 0 ? lOff : side === 2 ? -lOff : 0;
                return (
                  <mesh key={`lantern-arch-${side}`} position={[lx, 0.3, lz]} castShadow>
                    <boxGeometry args={[side % 2 === 0 ? 0.35 : 0.08, 0.4, side % 2 === 0 ? 0.08 : 0.35]} />
                    <meshStandardMaterial color="#2a2420" roughness={0.95} />
                  </mesh>
                );
              })}
              {/* Pyramid roof on lantern */}
              <mesh position={[0, 0.75, 0]} castShadow>
                <coneGeometry args={[finalBuildingSize / 4, 0.5, 4]} />
                <meshStandardMaterial color="#9a8a70" roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.05, 0]} castShadow>
                <sphereGeometry args={[0.1, 6, 5]} />
                <meshStandardMaterial color="#d4c4a0" roughness={0.6} metalness={0.2} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Decorative roof finials/pinnacles at roof edges */}
      {seededRandom(localSeed + 40) > 0.5 && (
        <group position={[0, finalHeight / 2 + 0.45, 0]}>
          {[
            [0, (finalBuildingSize + 0.5) / 2],
            [0, -(finalBuildingSize + 0.5) / 2],
            [(finalBuildingSize + 0.5) / 2, 0],
            [-(finalBuildingSize + 0.5) / 2, 0]
          ].map(([fx, fz], fi) => {
            if (seededRandom(localSeed + 41 + fi) > 0.65) return null;
            return (
              <group key={`finial-${fi}`} position={[fx, 0, fz]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.08, 0.12, 0.25, 6]} />
                  <meshStandardMaterial color="#c4b496" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.2, 0]} castShadow>
                  <sphereGeometry args={[0.1, 6, 5]} />
                  <meshStandardMaterial color="#d8c8a8" roughness={0.7} metalness={0.1} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </>
  );
};
