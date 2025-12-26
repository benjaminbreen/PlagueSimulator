/**
 * Marketplace District Edge Decorations
 * Date palms, cypress trees, and other elements to create depth around map edges
 */

import React from 'react';
import { getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

export const MarketplaceDecor: React.FC<{
  mapX: number;
  mapY: number;
  timeOfDay?: number;
}> = ({ mapX, mapY, timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'MARKET') return null;

  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  // Edge trees - positioned around perimeter for depth
  // Date palms and potted fan palms typical of 14th century Damascus
  const edgeTrees = [
    { pos: [-32, 0, -28] as [number, number, number], type: 'date-palm' },
    { pos: [30, 0, -30] as [number, number, number], type: 'potted-palm' },
    { pos: [-28, 0, 32] as [number, number, number], type: 'date-palm' },
    { pos: [34, 0, 28] as [number, number, number], type: 'potted-palm' },
  ];

  // NOTE: Crates and amphorae are now pushable physics objects
  // See Simulation.tsx buildPushables() for MARKET district

  return (
    <group>
      {/* Edge trees for depth */}
      {edgeTrees.map((tree, i) => {
        const seed = i * 7.3;

        if (tree.type === 'date-palm') {
          // Date palm - tall trunk with fronds at top
          const trunkHeight = 6 + Math.sin(seed) * 1.2;
          const frondCount = 8;
          const segmentCount = 5;

          return (
            <group key={`edge-tree-${i}`} position={tree.pos}>
              {/* Segmented trunk with characteristic date palm rings */}
              {Array.from({ length: segmentCount }).map((_, si) => {
                const segHeight = trunkHeight / segmentCount;
                const yPos = si * segHeight + segHeight / 2;
                const radiusTop = 0.25 + (si / segmentCount) * 0.03;
                const radiusBot = 0.27 + (si / segmentCount) * 0.03;
                const color = si % 2 === 0 ? "#8b7355" : "#7a6448";

                return (
                  <mesh key={`trunk-seg-${si}`} position={[0, yPos, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[radiusTop, radiusBot, segHeight * 0.95, 8]} />
                    <meshStandardMaterial color={color} roughness={0.95} />
                  </mesh>
                );
              })}

              {/* Crown of fronds */}
              <group position={[0, trunkHeight, 0]}>
                {/* Central cluster - dates and base */}
                <mesh castShadow>
                  <sphereGeometry args={[0.65, 6, 6]} />
                  <meshStandardMaterial color="#5a6a3a" roughness={0.85} />
                </mesh>

                {/* Smaller date clusters */}
                {Array.from({ length: 3 }).map((_, di) => {
                  const dateAngle = (di / 3) * Math.PI * 2;
                  return (
                    <mesh
                      key={`dates-${di}`}
                      position={[
                        Math.cos(dateAngle) * 0.4,
                        -0.3,
                        Math.sin(dateAngle) * 0.4
                      ]}
                      castShadow
                    >
                      <sphereGeometry args={[0.25, 4, 4]} />
                      <meshStandardMaterial color="#8b6a3a" roughness={0.7} />
                    </mesh>
                  );
                })}

                {/* Fronds radiating outward with realistic curve */}
                {Array.from({ length: frondCount }).map((_, fi) => {
                  const angle = (fi / frondCount) * Math.PI * 2;
                  const frondLength = 2.2 + Math.sin(fi) * 0.4;
                  const frondDrop = -0.8 - Math.sin(fi * 1.3) * 0.3;
                  const leafletCount = 5; // Segments along frond for natural curve

                  return (
                    <group
                      key={`frond-${fi}`}
                      rotation={[0, angle, 0]}
                    >
                      {/* Main frond spine - curved segments */}
                      {Array.from({ length: leafletCount }).map((_, li) => {
                        const segmentLength = frondLength / leafletCount;
                        const t = li / (leafletCount - 1);
                        const xOffset = t * frondLength * 0.4;
                        const yOffset = frondDrop - Math.pow(t, 1.5) * 0.6; // Natural droop
                        const width = 0.15 * (1 - t * 0.5); // Taper toward tip
                        const greenness = 0.3 + t * 0.15; // Lighter green at tips

                        return (
                          <mesh
                            key={`leaflet-${li}`}
                            position={[xOffset, yOffset, 0]}
                            rotation={[Math.PI * 0.25 + t * 0.15, 0, 0]}
                            castShadow
                          >
                            <boxGeometry args={[width, 0.04, segmentLength]} />
                            <meshStandardMaterial
                              color={`hsl(90, 35%, ${20 + greenness * 100}%)`}
                              roughness={0.9}
                            />
                          </mesh>
                        );
                      })}
                    </group>
                  );
                })}
              </group>
            </group>
          );
        } else {
          // Potted fan palm - shorter, bushier, in decorative pot
          const potHeight = 1.2;
          const potRadius = 0.8;
          const trunkHeight = 2.5;
          const frondCount = 10;

          return (
            <group key={`edge-tree-${i}`} position={tree.pos}>
              {/* Large decorative pot - terracotta */}
              <mesh position={[0, potHeight * 0.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[potRadius * 0.75, potRadius, potHeight, 10]} />
                <meshStandardMaterial color="#a0624a" roughness={0.85} />
              </mesh>

              {/* Pot rim - decorative band */}
              <mesh position={[0, potHeight, 0]} castShadow>
                <cylinderGeometry args={[potRadius * 0.85, potRadius * 0.8, 0.15, 10]} />
                <meshStandardMaterial color="#8b5540" roughness={0.8} />
              </mesh>

              {/* Short trunk cluster - multiple stems */}
              {Array.from({ length: 3 }).map((_, ti) => {
                const trunkAngle = (ti / 3) * Math.PI * 2 + seed;
                const trunkX = Math.cos(trunkAngle) * 0.3;
                const trunkZ = Math.sin(trunkAngle) * 0.3;

                return (
                  <mesh
                    key={`trunk-${ti}`}
                    position={[trunkX, potHeight + trunkHeight / 2, trunkZ]}
                    castShadow
                    receiveShadow
                  >
                    <cylinderGeometry args={[0.12, 0.15, trunkHeight, 6]} />
                    <meshStandardMaterial color="#7a6348" roughness={0.95} />
                  </mesh>
                );
              })}

              {/* Fan-shaped fronds spreading outward */}
              <group position={[0, potHeight + trunkHeight, 0]}>
                {Array.from({ length: frondCount }).map((_, fi) => {
                  const angle = (fi / frondCount) * Math.PI * 2;
                  const frondLength = 1.8 + Math.sin(fi * 1.5) * 0.3;
                  const frondWidth = 0.6;
                  const frondDrop = -0.4 - Math.sin(fi * 1.2) * 0.2;

                  return (
                    <mesh
                      key={`fan-frond-${fi}`}
                      position={[
                        Math.cos(angle) * frondLength * 0.35,
                        frondDrop,
                        Math.sin(angle) * frondLength * 0.35
                      ]}
                      rotation={[
                        Math.PI * 0.35, // More horizontal spread
                        angle,
                        0
                      ]}
                      castShadow
                    >
                      {/* Fan-shaped frond (flattened cone) */}
                      <boxGeometry args={[frondWidth, 0.05, frondLength]} />
                      <meshStandardMaterial color="#4a6a35" roughness={0.85} />
                    </mesh>
                  );
                })}

                {/* Central cluster for fullness */}
                <mesh castShadow>
                  <sphereGeometry args={[0.4, 6, 6]} />
                  <meshStandardMaterial color="#5a7a40" roughness={0.85} />
                </mesh>
              </group>
            </group>
          );
        }
      })}

      {/* Crates and amphorae now rendered as pushable physics objects */}
    </group>
  );
};
