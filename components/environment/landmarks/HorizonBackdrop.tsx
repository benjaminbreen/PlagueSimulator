/**
 * Horizon Backdrop Component
 * Distant city silhouettes, walls, minarets, domes, trees, and mountain ring
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DistrictType } from '../../../types';
import { SANDSTONE_PALETTE } from '../constants';

export const HorizonBackdrop: React.FC<{ timeOfDay?: number; showCityWalls?: boolean; wallRadius?: number; district?: DistrictType }> = ({ timeOfDay, showCityWalls = true, wallRadius = 82, district }) => {
  const time = timeOfDay ?? 12;
  const isDesert = district === 'OUTSKIRTS_DESERT';
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const twilightFactor = time >= 17 && time < 19 ? (time - 17) / 2 : time >= 5 && time < 7 ? (7 - time) / 2 : 0;
  const dayFactor = time >= 7 && time < 17 ? 1 : time >= 5 && time < 7 ? (time - 5) / 2 : time >= 17 && time < 19 ? (19 - time) / 2 : 0;

  // Distant silhouette colors - very dark, low opacity
  const silhouetteColor = isDesert
    ? (nightFactor > 0.8 ? '#120c08' : twilightFactor > 0 ? '#2e1f14' : '#3b2a1b')
    : (nightFactor > 0.8 ? '#0a0a0a' : twilightFactor > 0 ? '#1a1a1a' : '#2a2a2a');
  const silhouetteOpacity = isDesert
    ? (nightFactor > 0.8 ? 0.35 : twilightFactor > 0 ? 0.45 : 0.4)
    : (nightFactor > 0.8 ? 0.4 : twilightFactor > 0 ? 0.5 : 0.45);

  // Wall color - weathered stone (kept close for boundary)
  const wallColor = isDesert
    ? (nightFactor > 0.8 ? '#2a241b' : twilightFactor > 0 ? '#7a5f3f' : '#b58a5a')
    : (nightFactor > 0.8 ? '#2a2a2a' : twilightFactor > 0 ? '#5a5a5a' : '#6a6a5a');
  const wallOpacity = showCityWalls ? 1 : 0.45;
  const wallRadiusUsed = showCityWalls ? wallRadius : wallRadius + 60;

  // Mountain ring - very dark, far distance
  const mountainColor = isDesert
    ? (nightFactor > 0.8 ? '#070503' : twilightFactor > 0 ? '#1c1510' : '#2b2016')
    : (nightFactor > 0.8 ? '#000000' : twilightFactor > 0 ? '#0a0a14' : '#1a1a2a');
  const mountainOpacity = nightFactor > 0.8 ? 0.35 : twilightFactor > 0 ? 0.45 : 0.5;

  // Smoke color - atmospheric
  const smokeColor = isDesert
    ? (nightFactor > 0.8 ? '#2a2016' : twilightFactor > 0 ? '#7a5b3b' : '#8a6b45')
    : (nightFactor > 0.8 ? '#1a1a1a' : twilightFactor > 0 ? '#4a4a4a' : '#6a6a6a');
  const smokeOpacity = isDesert
    ? (nightFactor > 0.8 ? 0.12 : twilightFactor > 0 ? 0.2 : 0.24)
    : (nightFactor > 0.8 ? 0.15 : twilightFactor > 0 ? 0.25 : 0.3);

  // Instanced city buildings - SINGLE DRAW CALL
  const buildingInstancesRef = useRef<THREE.InstancedMesh>(null);
  const buildingCount = isDesert ? 32 : 70;

  const wallTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const baseColor = SANDSTONE_PALETTE[2] ?? '#c7b08a';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockWidth = 64;
    const blockHeight = 32;
    ctx.strokeStyle = 'rgba(120, 95, 65, 0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y < canvas.height; y += blockHeight) {
      const offset = (y / blockHeight) % 2 === 0 ? 0 : blockWidth / 2;
      for (let x = -blockWidth / 2 + offset; x < canvas.width; x += blockWidth) {
        ctx.strokeRect(x, y, blockWidth, blockHeight);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }, [buildingCount, isDesert]);

  React.useEffect(() => {
    if (!buildingInstancesRef.current) return;

    const tempObj = new THREE.Object3D();
    const baseRadius = isDesert ? 120 : 105; // Pushed farther out

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const radiusVariation = ((i * 7) % 5) * 3;
      const radius = baseRadius + radiusVariation;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Procedural height variation (3-8 units) - shorter for distance
      const height = (isDesert ? 2 : 3) + ((i * 11) % (isDesert ? 4 : 6));
      // Procedural width variation (2-5 units) - narrower
      const width = (isDesert ? 3 : 2) + ((i * 13) % (isDesert ? 3 : 4));
      const depth = (isDesert ? 3 : 2) + ((i * 17) % (isDesert ? 3 : 4));

      tempObj.position.set(x, height / 2, z);
      tempObj.scale.set(width, height, depth);
      tempObj.rotation.y = angle + Math.PI / 2;
      tempObj.updateMatrix();
      buildingInstancesRef.current.setMatrixAt(i, tempObj.matrix);
    }

    buildingInstancesRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* INSTANCED DISTANT CITY - Single draw call for 70 buildings at horizon */}
      <instancedMesh ref={buildingInstancesRef} args={[undefined, undefined, buildingCount]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
      </instancedMesh>

      {/* DAMASCUS CITY WALLS - Octagonal ring with gate breaks */}
      <group>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const nextAngle = ((i + 1) / 8) * Math.PI * 2;
          const radius = wallRadiusUsed;

          const x1 = Math.cos(angle) * radius;
          const z1 = Math.sin(angle) * radius;
          const x2 = Math.cos(nextAngle) * radius;
          const z2 = Math.sin(nextAngle) * radius;

          const midX = (x1 + x2) / 2;
          const midZ = (z1 + z2) / 2;
          const wallAngle = Math.atan2(z2 - z1, x2 - x1);
          const wallLength = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);

          // Skip walls at cardinal directions (gates: North, South, East, West)
          const isGate = i === 0 || i === 2 || i === 4 || i === 6;

          if (!isGate) {
            return (
              <mesh key={`wall-${i}`} position={[midX, 4, midZ]} rotation={[0, wallAngle, 0]} castShadow={false}>
                <boxGeometry args={[wallLength * 0.8, 8, 2]} />
                <meshStandardMaterial map={wallTexture ?? undefined} color={wallColor} roughness={0.92} transparent={wallOpacity < 1} opacity={wallOpacity} />
              </mesh>
            );
          }
          return null;
        })}
      </group>

      {/* DISTANT HORIZON SILHOUETTES - Far away, unreachable */}
      {/* PERFORMANCE OPTIMIZED: Using instanced meshes instead of individual meshes (46 → 6 draw calls) */}

      {/* Distant minarets scattered on horizon - INSTANCED */}
      {!isDesert && (() => {
        const minaretInstancesRef = useRef<THREE.InstancedMesh>(null);
        const minaretData = [
          { angle: 0, radius: 145, height: 12 },      // North
          { angle: Math.PI / 4, radius: 150, height: 10 },   // NE
          { angle: Math.PI / 2, radius: 155, height: 14 },   // East
          { angle: 3 * Math.PI / 4, radius: 148, height: 9 }, // SE
          { angle: Math.PI, radius: 152, height: 11 },      // South
          { angle: 5 * Math.PI / 4, radius: 147, height: 13 }, // SW
          { angle: 3 * Math.PI / 2, radius: 160, height: 11 }, // West
          { angle: 7 * Math.PI / 4, radius: 143, height: 10 }, // NW
        ];

        React.useEffect(() => {
          if (!minaretInstancesRef.current) return;
          const tempObj = new THREE.Object3D();
          minaretData.forEach((minaret, i) => {
            const x = Math.cos(minaret.angle) * minaret.radius;
            const z = Math.sin(minaret.angle) * minaret.radius;
            tempObj.position.set(x, minaret.height / 2, z);
            // Scale to vary height per minaret
            tempObj.scale.set(1, minaret.height / 11, 1); // normalize to avg height
            tempObj.updateMatrix();
            minaretInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          });
          minaretInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={minaretInstancesRef} args={[undefined, undefined, 8]} castShadow={false}>
            <cylinderGeometry args={[0.8, 1.0, 11, 6]} />
            <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
          </instancedMesh>
        );
      })()}

      {/* Distant dome clusters - INSTANCED (bases and caps separate) */}
      {!isDesert && (() => {
        const domeBasesRef = useRef<THREE.InstancedMesh>(null);
        const domeCapsRef = useRef<THREE.InstancedMesh>(null);
        const domeData = [
          { angle: Math.PI / 6, radius: 142 },       // North
          { angle: Math.PI / 3, radius: 158 },       // NE
          { angle: 5 * Math.PI / 6, radius: 149 },   // SE
          { angle: 4 * Math.PI / 3, radius: 146 },   // SW
          { angle: 5 * Math.PI / 3, radius: 154 },   // NW
        ];

        React.useEffect(() => {
          if (!domeBasesRef.current || !domeCapsRef.current) return;
          const tempObj = new THREE.Object3D();
          domeData.forEach((dome, i) => {
            const x = Math.cos(dome.angle) * dome.radius;
            const z = Math.sin(dome.angle) * dome.radius;

            // Base cylinder
            tempObj.position.set(x, 4, z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            domeBasesRef.current.setMatrixAt(i, tempObj.matrix);

            // Dome cap
            tempObj.position.set(x, 9, z);
            tempObj.updateMatrix();
            domeCapsRef.current.setMatrixAt(i, tempObj.matrix);
          });
          domeBasesRef.current.instanceMatrix.needsUpdate = true;
          domeCapsRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <>
            <instancedMesh ref={domeBasesRef} args={[undefined, undefined, 5]} castShadow={false}>
              <cylinderGeometry args={[3, 3, 8, 8]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
            </instancedMesh>
            <instancedMesh ref={domeCapsRef} args={[undefined, undefined, 5]} castShadow={false}>
              <sphereGeometry args={[3.5, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity} />
            </instancedMesh>
          </>
        );
      })()}

      {/* Distant tree silhouettes - INSTANCED (trunks and canopies separate) */}
      {(() => {
        const count = isDesert ? 16 : 12;
        const trunksRef = useRef<THREE.InstancedMesh>(null);
        const canopiesRef = useRef<THREE.InstancedMesh>(null);

        React.useEffect(() => {
          if (!trunksRef.current || !canopiesRef.current) return;
          const tempObj = new THREE.Object3D();

          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + 0.2;
            const radius = (isDesert ? 150 : 140) + ((i * 7) % 4) * 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = (isDesert ? 3 : 6) + ((i * 5) % (isDesert ? 3 : 4));

            // Trunk
            tempObj.position.set(x, height / 2, z);
            tempObj.scale.set(1, height / (isDesert ? 4.5 : 7.5), 1);
            tempObj.updateMatrix();
            trunksRef.current.setMatrixAt(i, tempObj.matrix);

            // Canopy
            tempObj.position.set(x, height + (isDesert ? 0.9 : 1.5), z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            canopiesRef.current.setMatrixAt(i, tempObj.matrix);
          }

          trunksRef.current.instanceMatrix.needsUpdate = true;
          canopiesRef.current.instanceMatrix.needsUpdate = true;
        }, [count, isDesert]);

        return (
          <>
            <instancedMesh ref={trunksRef} args={[undefined, undefined, count]} castShadow={false}>
              <cylinderGeometry args={[isDesert ? 0.25 : 0.3, isDesert ? 0.35 : 0.4, isDesert ? 4.5 : 7.5, 4]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity * 0.8} />
            </instancedMesh>
            <instancedMesh ref={canopiesRef} args={[undefined, undefined, count]} castShadow={false}>
              <sphereGeometry args={[isDesert ? 1.2 : 1.8, 6, 4]} />
              <meshStandardMaterial color={silhouetteColor} roughness={1} transparent opacity={silhouetteOpacity * 0.7} />
            </instancedMesh>
          </>
        );
      })()}

      {/* Chimney smoke - atmospheric detail - INSTANCED */}
      {(() => {
        const smokeInstancesRef = useRef<THREE.InstancedMesh>(null);
        const smokeData = [
          { x: 100, z: 100 },
          { x: -110, z: 95 },
          { x: 105, z: -100 },
          { x: -95, z: -105 },
        ];

        React.useEffect(() => {
          if (!smokeInstancesRef.current) return;
          const tempObj = new THREE.Object3D();
          smokeData.forEach((smoke, i) => {
            tempObj.position.set(smoke.x, 8, smoke.z);
            tempObj.scale.set(1, 1, 1);
            tempObj.updateMatrix();
            smokeInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          });
          smokeInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={smokeInstancesRef} args={[undefined, undefined, 4]} castShadow={false}>
            <cylinderGeometry args={[1.5, 0.5, 6, 6]} />
            <meshStandardMaterial color={smokeColor} roughness={1} transparent opacity={smokeOpacity} />
          </instancedMesh>
        );
      })()}

      {/* Mount Qasioun - very distant mountain ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <ringGeometry args={[165, 180, 64]} />
        <meshStandardMaterial color={mountainColor} transparent opacity={mountainOpacity} roughness={1} />
      </mesh>

      {/* HORIZON LINE GRADIENT - Smooth transition where ground meets sky */}
      {/* Sky color for blending */}
      {(() => {
        const horizonSkyColor = isDesert
          ? (nightFactor > 0.8 ? '#111825' : twilightFactor > 0 ? '#f2a24f' : '#7fb2dd')
          : (nightFactor > 0.8 ? '#0f1829' : twilightFactor > 0 ? '#f7b25a' : '#2f95ee');

        return (
          <>
            {/* Multiple thin rings creating gradient from ground to sky */}
            {[
              { height: 0.1, radius: [100, 180], opacity: 0.5, colorMix: 0 },    // Ground color
              { height: 0.5, radius: [100, 180], opacity: 0.45, colorMix: 0.15 },
              { height: 1.0, radius: [100, 180], opacity: 0.4, colorMix: 0.3 },
              { height: 1.8, radius: [100, 180], opacity: 0.35, colorMix: 0.45 },
              { height: 2.8, radius: [100, 180], opacity: 0.3, colorMix: 0.6 },
              { height: 4.0, radius: [100, 180], opacity: 0.25, colorMix: 0.75 },
              { height: 5.5, radius: [100, 180], opacity: 0.2, colorMix: 0.85 },
              { height: 7.5, radius: [100, 180], opacity: 0.15, colorMix: 0.95 },  // Sky color
            ].map((layer, i) => {
              // Blend from ground color to sky color
              const groundColor = new THREE.Color(isDesert ? '#cfa46a' : '#d4b894'); // Warm ground
              const skyColor = new THREE.Color(horizonSkyColor);
              const blendedColor = groundColor.clone().lerp(skyColor, layer.colorMix);

              return (
                <mesh key={`horizon-gradient-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, layer.height, 0]}>
                  <ringGeometry args={[layer.radius[0], layer.radius[1], 64]} />
                  <meshStandardMaterial
                    color={blendedColor}
                    transparent
                    opacity={layer.opacity * (nightFactor > 0.8 ? 0.6 : twilightFactor > 0 ? 0.8 : 1.0)}
                    roughness={1}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </>
        );
      })()}
    </group>
  );
};
