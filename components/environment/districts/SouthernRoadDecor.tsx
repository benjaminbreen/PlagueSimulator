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
      {treeSpots.map((pos, i) => (
        <group key={`road-tree-${i}`} position={pos}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 3.6, 6]} />
            <meshStandardMaterial color="#7f5c3b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <sphereGeometry args={[1.2, 8, 6]} />
            <meshStandardMaterial color="#3f6a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.8, 3.6, 0]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[2.2, 0.14, 0.5]} />
            <meshStandardMaterial color="#3b6538" roughness={0.85} />
          </mesh>
          <mesh position={[-0.8, 3.6, 0]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[2.2, 0.14, 0.5]} />
            <meshStandardMaterial color="#3b6538" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
