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

  // ATMOSPHERIC SCATTERING: More haze at twilight/midday heat, clearer at night
  const atmosphericHaze = nightFactor > 0.8 ? 0.5 : twilightFactor > 0 ? 1.2 : dayFactor * 0.9;

  // Distant silhouette colors - warm sun-bleached tones
  const silhouetteColor = isDesert
    ? (nightFactor > 0.8 ? '#120c08' : twilightFactor > 0 ? '#4a3424' : '#8a7a6a')  // Day: warm sun-bleached tan
    : (nightFactor > 0.8 ? '#0a0a0a' : twilightFactor > 0 ? '#2a2a3a' : '#6a5a4a'); // Day: warm dusty brown

  // Reduced opacity for softer, more indistinct silhouettes
  const silhouetteOpacity = (isDesert
    ? (nightFactor > 0.8 ? 0.25 : twilightFactor > 0 ? 0.35 : 0.28)
    : (nightFactor > 0.8 ? 0.3 : twilightFactor > 0 ? 0.4 : 0.32)) * (1.0 - atmosphericHaze * 0.15);

  // Wall color - weathered stone (kept close for boundary)
  const wallColor = isDesert
    ? (nightFactor > 0.8 ? '#2a241b' : twilightFactor > 0 ? '#7a5f3f' : '#b58a5a')
    : (nightFactor > 0.8 ? '#2a2a2a' : twilightFactor > 0 ? '#5a5a5a' : '#6a6a5a');
  const wallOpacity = showCityWalls ? 1 : 0.45;
  const wallRadiusUsed = showCityWalls ? wallRadius : wallRadius + 60;

  // Mountain ring - very faint, warm distant haze
  const mountainColor = isDesert
    ? (nightFactor > 0.8 ? '#070503' : twilightFactor > 0 ? '#2c1f18' : '#a89878')  // Day: warm dusty tan
    : (nightFactor > 0.8 ? '#000000' : twilightFactor > 0 ? '#1a1a24' : '#9a8a7a'); // Day: warm sandy brown

  // Much fainter mountains for distance realism
  const mountainOpacity = (nightFactor > 0.8 ? 0.2 : twilightFactor > 0 ? 0.3 : 0.35) * (1.0 - atmosphericHaze * 0.2);

  // Atmospheric haze - warm dusty heat shimmer
  const hazeColor = isDesert
    ? (nightFactor > 0.8 ? '#2a2016' : twilightFactor > 0 ? '#c89a6a' : '#e8d4b8')  // Day: warm sandy haze
    : (nightFactor > 0.8 ? '#1a1a1a' : twilightFactor > 0 ? '#8a8a9a' : '#d8c4a8'); // Day: warm dusty haze
  const hazeOpacity = (isDesert
    ? (nightFactor > 0.8 ? 0.08 : twilightFactor > 0 ? 0.16 : 0.12)
    : (nightFactor > 0.8 ? 0.1 : twilightFactor > 0 ? 0.18 : 0.14)) * (0.8 + atmosphericHaze * 0.4);

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

      // Realistic distant building proportions - low and wide
      const height = (isDesert ? 1.0 : 1.2) + ((i * 11) % (isDesert ? 8 : 12)) * 0.15; // 1.0-2.2 units (desert) or 1.2-3.0 units (city)
      // Wider buildings for realistic squat appearance
      const width = (isDesert ? 4 : 3) + ((i * 13) % (isDesert ? 4 : 5)); // 4-8 units (desert) or 3-8 units (city)
      const depth = (isDesert ? 4 : 3) + ((i * 17) % (isDesert ? 4 : 5)); // 4-8 units (desert) or 3-8 units (city)

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
      {/* INSTANCED DISTANT CITY - Single draw call for buildings at horizon */}
      <instancedMesh ref={buildingInstancesRef} args={[undefined, undefined, buildingCount]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={silhouetteColor}
          roughness={1}
          transparent
          opacity={silhouetteOpacity}
          depthWrite={false}
          emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
          emissiveIntensity={twilightFactor * 0.15}
        />
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
          { angle: 0, radius: 145, height: 5.5 },      // North
          { angle: Math.PI / 4, radius: 150, height: 4.5 },   // NE
          { angle: Math.PI / 2, radius: 155, height: 6.0 },   // East
          { angle: 3 * Math.PI / 4, radius: 148, height: 4.0 }, // SE
          { angle: Math.PI, radius: 152, height: 5.0 },      // South
          { angle: 5 * Math.PI / 4, radius: 147, height: 5.8 }, // SW
          { angle: 3 * Math.PI / 2, radius: 160, height: 5.2 }, // West
          { angle: 7 * Math.PI / 4, radius: 143, height: 4.8 }, // NW
        ];

        React.useEffect(() => {
          if (!minaretInstancesRef.current) return;
          const tempObj = new THREE.Object3D();
          minaretData.forEach((minaret, i) => {
            const x = Math.cos(minaret.angle) * minaret.radius;
            const z = Math.sin(minaret.angle) * minaret.radius;
            tempObj.position.set(x, minaret.height / 2, z);
            // Scale to vary height per minaret
            tempObj.scale.set(0.6, minaret.height / 5, 0.6); // Slender, realistic proportions
            tempObj.updateMatrix();
            minaretInstancesRef.current.setMatrixAt(i, tempObj.matrix);
          });
          minaretInstancesRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={minaretInstancesRef} args={[undefined, undefined, 8]} castShadow={false}>
            <cylinderGeometry args={[0.5, 0.6, 5, 6]} />
            <meshStandardMaterial
              color={silhouetteColor}
              roughness={1}
              transparent
              opacity={silhouetteOpacity * 0.95}
              depthWrite={false}
              emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
              emissiveIntensity={twilightFactor * 0.12}
            />
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
            tempObj.position.set(x, 2, z);
            tempObj.scale.set(1, 0.5, 1); // Shorter base
            tempObj.updateMatrix();
            domeBasesRef.current.setMatrixAt(i, tempObj.matrix);

            // Dome cap
            tempObj.position.set(x, 4.5, z); // Lower position
            tempObj.updateMatrix();
            domeCapsRef.current.setMatrixAt(i, tempObj.matrix);
          });
          domeBasesRef.current.instanceMatrix.needsUpdate = true;
          domeCapsRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <>
            <instancedMesh ref={domeBasesRef} args={[undefined, undefined, 5]} castShadow={false}>
              <cylinderGeometry args={[2.5, 2.5, 4, 8]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.92}
                depthWrite={false}
                emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
                emissiveIntensity={twilightFactor * 0.18}
              />
            </instancedMesh>
            <instancedMesh ref={domeCapsRef} args={[undefined, undefined, 5]} castShadow={false}>
              <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.92}
                depthWrite={false}
                emissive={twilightFactor > 0 ? silhouetteColor : '#000000'}
                emissiveIntensity={twilightFactor * 0.18}
              />
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
            // Realistic distant tree heights - much shorter
            const height = (isDesert ? 1.5 : 2.0) + ((i * 5) % (isDesert ? 4 : 5)) * 0.2; // 1.5-2.3 (desert) or 2.0-3.0 (city)

            // Trunk - proportionally scaled
            const trunkScale = height / (isDesert ? 2.0 : 2.5);
            tempObj.position.set(x, height / 2, z);
            tempObj.scale.set(trunkScale * 0.8, trunkScale, trunkScale * 0.8);
            tempObj.updateMatrix();
            trunksRef.current.setMatrixAt(i, tempObj.matrix);

            // Canopy - wider and flatter for distant perspective
            const canopyScale = 0.7 + ((i * 3) % 5) * 0.15; // Variation: 0.7-1.3
            tempObj.position.set(x, height + (isDesert ? 0.4 : 0.6), z);
            tempObj.scale.set(canopyScale * 1.2, canopyScale * 0.8, canopyScale * 1.2); // Wider, flatter
            tempObj.updateMatrix();
            canopiesRef.current.setMatrixAt(i, tempObj.matrix);
          }

          trunksRef.current.instanceMatrix.needsUpdate = true;
          canopiesRef.current.instanceMatrix.needsUpdate = true;
        }, [count, isDesert]);

        return (
          <>
            <instancedMesh ref={trunksRef} args={[undefined, undefined, count]} castShadow={false}>
              <cylinderGeometry args={[isDesert ? 0.15 : 0.18, isDesert ? 0.22 : 0.25, isDesert ? 2.0 : 2.5, 4]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.75}
                depthWrite={false}
              />
            </instancedMesh>
            <instancedMesh ref={canopiesRef} args={[undefined, undefined, count]} castShadow={false}>
              <sphereGeometry args={[isDesert ? 0.8 : 1.0, 6, 4]} />
              <meshStandardMaterial
                color={silhouetteColor}
                roughness={1}
                transparent
                opacity={silhouetteOpacity * 0.65}
                depthWrite={false}
              />
            </instancedMesh>
          </>
        );
      })()}

      {/* Atmospheric haze layers - multiple distances for depth */}
      {(() => {
        const hazeLayersRef = useRef<THREE.InstancedMesh>(null);
        const hazeData = [
          { x: 100, z: 100, height: 8, size: 1.5 },
          { x: -110, z: 95, height: 10, size: 1.8 },
          { x: 105, z: -100, height: 7, size: 1.4 },
          { x: -95, z: -105, height: 9, size: 1.6 },
          { x: 120, z: -80, height: 11, size: 2.0 },
          { x: -130, z: 110, height: 8, size: 1.7 },
        ];

        React.useEffect(() => {
          if (!hazeLayersRef.current) return;
          const tempObj = new THREE.Object3D();
          hazeData.forEach((haze, i) => {
            tempObj.position.set(haze.x, haze.height, haze.z);
            tempObj.scale.set(haze.size, 1, haze.size);
            tempObj.updateMatrix();
            hazeLayersRef.current.setMatrixAt(i, tempObj.matrix);
          });
          hazeLayersRef.current.instanceMatrix.needsUpdate = true;
        }, []);

        return (
          <instancedMesh ref={hazeLayersRef} args={[undefined, undefined, 6]} castShadow={false}>
            <cylinderGeometry args={[1.5, 0.5, 6, 6]} />
            <meshStandardMaterial color={hazeColor} roughness={1} transparent opacity={hazeOpacity} depthWrite={false} />
          </instancedMesh>
        );
      })()}

      {/* Mount Qasioun - very distant mountain ring with atmospheric fade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <ringGeometry args={[165, 180, 64]} />
        <meshStandardMaterial
          color={mountainColor}
          transparent
          opacity={mountainOpacity}
          roughness={1}
          depthWrite={false}
          emissive={twilightFactor > 0 ? mountainColor : '#000000'}
          emissiveIntensity={twilightFactor * 0.1}
        />
      </mesh>

      {/* HORIZON LINE GRADIENT - Ultra-smooth atmospheric blending */}
      {/* Enhanced multi-layer gradient for seamless ground-to-sky transition */}
      {(() => {
        const horizonSkyColor = isDesert
          ? (nightFactor > 0.8 ? '#111825' : twilightFactor > 0 ? '#f2a24f' : '#f4d4a8')  // Day: warm sandy-golden
          : (nightFactor > 0.8 ? '#0f1829' : twilightFactor > 0 ? '#f7b25a' : '#e8c8a0'); // Day: warm cream-golden

        // ENHANCED: 12 gradient layers for ultra-smooth blending
        const gradientLayers = [
          { height: 0.05, radius: [100, 180], opacity: 0.45, colorMix: 0 },      // Near ground
          { height: 0.2, radius: [100, 180], opacity: 0.42, colorMix: 0.08 },
          { height: 0.5, radius: [100, 180], opacity: 0.38, colorMix: 0.16 },
          { height: 0.9, radius: [100, 180], opacity: 0.35, colorMix: 0.24 },
          { height: 1.4, radius: [100, 180], opacity: 0.32, colorMix: 0.34 },
          { height: 2.0, radius: [100, 180], opacity: 0.28, colorMix: 0.44 },
          { height: 2.8, radius: [100, 180], opacity: 0.25, colorMix: 0.54 },
          { height: 3.8, radius: [100, 180], opacity: 0.22, colorMix: 0.64 },
          { height: 5.0, radius: [100, 180], opacity: 0.18, colorMix: 0.74 },
          { height: 6.5, radius: [100, 180], opacity: 0.14, colorMix: 0.84 },
          { height: 8.5, radius: [100, 180], opacity: 0.10, colorMix: 0.92 },
          { height: 11.0, radius: [100, 180], opacity: 0.06, colorMix: 0.98 },   // Blend to sky
        ];

        return (
          <>
            {gradientLayers.map((layer, i) => {
              // Blend from warm ground to warm atmospheric horizon
              const groundColor = new THREE.Color(isDesert ? '#d4a870' : '#d8b898');  // Warmer ground
              const skyColor = new THREE.Color(horizonSkyColor);
              const blendedColor = groundColor.clone().lerp(skyColor, layer.colorMix);

              // Atmospheric haze increases during peak sun
              const adjustedOpacity = layer.opacity
                * (nightFactor > 0.8 ? 0.4 : twilightFactor > 0 ? 0.85 : 0.65)
                * (1.0 + atmosphericHaze * 0.25);

              return (
                <mesh key={`horizon-gradient-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, layer.height, 0]}>
                  <ringGeometry args={[layer.radius[0], layer.radius[1], 64]} />
                  <meshStandardMaterial
                    color={blendedColor}
                    transparent
                    opacity={adjustedOpacity}
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
