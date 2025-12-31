/**
 * Southern Road District Decorations
 * Road surface, ditches, and roadside trees
 */

import React from 'react';
import { getDistrictType } from '../../../types';

export const SouthernRoadDecor: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'SOUTHERN_ROAD') return null;
  const roadWidth = 8;
  const ditchOffset = 7.5;
  const ditchWidth = 1.6;
  const length = 110;
  const treeSpots: Array<[number, number, number]> = [
    [-18, 0, -32],
    [18, 0, -26],
    [-16, 0, -8],
    [16, 0, 6],
    [-18, 0, 24],
    [18, 0, 34]
  ];
  return (
    <group>
      {/* Main road surface - raised above ground to avoid z-fighting */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[roadWidth, 0.1, length]} />
        <meshStandardMaterial color="#b08a5a" roughness={0.95} />
      </mesh>
      {/* Center worn path - clearly above main road surface */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[roadWidth * 0.55, 0.02, length]} />
        <meshStandardMaterial color="#a0794d" roughness={0.95} />
      </mesh>
      {/* Road edge detail - slight bevel */}
      <mesh position={[-roadWidth / 2 + 0.15, 0.06, 0]} receiveShadow>
        <boxGeometry args={[0.3, 0.06, length]} />
        <meshStandardMaterial color="#9a7a4d" roughness={0.95} />
      </mesh>
      <mesh position={[roadWidth / 2 - 0.15, 0.06, 0]} receiveShadow>
        <boxGeometry args={[0.3, 0.06, length]} />
        <meshStandardMaterial color="#9a7a4d" roughness={0.95} />
      </mesh>
      {/* Ditches */}
      <mesh position={[-ditchOffset, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ditchWidth, 0.3, length]} />
        <meshStandardMaterial color="#8a6a43" roughness={0.98} />
      </mesh>
      <mesh position={[ditchOffset, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ditchWidth, 0.3, length]} />
        <meshStandardMaterial color="#8a6a43" roughness={0.98} />
      </mesh>
      {treeSpots.map((pos, i) => {
        // Randomize each tree based on position
        const treeVariation = (pos[0] * 7 + pos[2] * 13 + i * 23) % 100;
        const heightMult = 0.85 + (treeVariation % 30) / 100; // 0.85-1.15x height
        const trunkThickness = 0.25 + ((treeVariation % 15) / 100); // Vary trunk
        const crownSize = 1.1 + ((treeVariation % 25) / 100); // Vary crown
        const tilt = ((treeVariation % 7) - 3.5) / 100; // Slight tilt

        // Foliage clusters for organic shape
        const clusters = [
          { pos: [0, 3.8 * heightMult, 0], scale: [1.3, 1.1, 1.2] },
          { pos: [-0.3, 3.9 * heightMult, 0.2], scale: [0.9, 0.8, 0.9] },
          { pos: [0.4, 3.7 * heightMult, -0.3], scale: [1.0, 0.9, 1.0] },
          { pos: [-0.2, 3.6 * heightMult, -0.4], scale: [0.8, 0.7, 0.8] },
          { pos: [0.3, 4.0 * heightMult, 0.4], scale: [0.9, 0.8, 1.0] },
        ];

        return (
          <group key={`road-tree-${i}`} position={pos} rotation={[tilt, (treeVariation % 360) * Math.PI / 180, 0]}>
            {/* REALISTIC TRUNK with texture segments */}
            <mesh position={[0, 1.0 * heightMult, 0]} castShadow>
              <cylinderGeometry args={[trunkThickness, trunkThickness + 0.08, 2.0 * heightMult, 8]} />
              <meshStandardMaterial color="#7f5c3b" roughness={0.92} />
            </mesh>
            {/* Bark ring texture */}
            <mesh position={[0, 1.4 * heightMult, 0]} castShadow>
              <cylinderGeometry args={[trunkThickness + 0.02, trunkThickness + 0.02, 0.15, 8]} />
              <meshStandardMaterial color="#6a4a2a" roughness={0.96} />
            </mesh>
            <mesh position={[0, 2.2 * heightMult, 0]} castShadow>
              <cylinderGeometry args={[trunkThickness - 0.03, trunkThickness, 1.6 * heightMult, 8]} />
              <meshStandardMaterial color="#8a6a4a" roughness={0.92} />
            </mesh>
            {/* Bark ring texture */}
            <mesh position={[0, 2.7 * heightMult, 0]} castShadow>
              <cylinderGeometry args={[trunkThickness - 0.01, trunkThickness - 0.01, 0.15, 8]} />
              <meshStandardMaterial color="#6a4a2a" roughness={0.96} />
            </mesh>

            {/* MAIN BRANCHES - realistic structure */}
            <mesh position={[0.5, 3.2 * heightMult, 0.2]} rotation={[0.3, 0.5, 0.4]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1.2, 6]} />
              <meshStandardMaterial color="#6a5a3a" roughness={0.94} />
            </mesh>
            <mesh position={[-0.4, 3.3 * heightMult, -0.3]} rotation={[-0.2, -0.6, -0.3]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1.0, 6]} />
              <meshStandardMaterial color="#6a5a3a" roughness={0.94} />
            </mesh>
            <mesh position={[0.2, 3.4 * heightMult, 0.5]} rotation={[0.4, 0.2, 0.2]} castShadow>
              <cylinderGeometry args={[0.07, 0.10, 0.9, 6]} />
              <meshStandardMaterial color="#6a5a3a" roughness={0.94} />
            </mesh>
            <mesh position={[-0.3, 3.2 * heightMult, 0.4]} rotation={[0.2, -0.3, -0.2]} castShadow>
              <cylinderGeometry args={[0.07, 0.10, 0.8, 6]} />
              <meshStandardMaterial color="#6a5a3a" roughness={0.94} />
            </mesh>

            {/* FOLIAGE - Multiple irregular clusters for organic shape */}
            {clusters.map((cluster, j) => (
              <mesh
                key={`foliage-${j}`}
                position={cluster.pos as [number, number, number]}
                scale={cluster.scale.map(s => s * crownSize) as [number, number, number]}
                castShadow
              >
                <sphereGeometry args={[1.0, 8, 7]} />
                <meshStandardMaterial
                  color={j % 3 === 0 ? '#3f6a3a' : j % 3 === 1 ? '#4a7540' : '#356030'}
                  roughness={0.88}
                />
              </mesh>
            ))}

            {/* Smaller outer leaf clusters for detail */}
            {[
              [-0.9, 3.7 * heightMult, 0.3],
              [0.8, 3.8 * heightMult, -0.2],
              [0.2, 4.2 * heightMult, 0.6],
              [-0.3, 4.1 * heightMult, -0.7],
            ].map(([x, y, z], j) => (
              <mesh key={`leaf-${j}`} position={[x, y, z]} castShadow>
                <sphereGeometry args={[0.5 * crownSize, 6, 5]} />
                <meshStandardMaterial color="#4a7a45" roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};
