/**
 * Farmland Outskirts Decorations (Ghouta)
 * Fields, irrigation ditches, rural houses, trees, boulders
 */

import React from 'react';
import { getDistrictType } from '../../../types';

export const OutskirtsFarmlandDecor: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'OUTSKIRTS_FARMLAND') return null;

  const fields: Array<{ pos: [number, number, number]; size: [number, number] }> = [
    { pos: [-18, 0.01, -8], size: [18, 10] },
    { pos: [12, 0.01, -12], size: [16, 8] },
    { pos: [-4, 0.01, 16], size: [14, 10] },
  ];
  const ditches: Array<{ pos: [number, number, number]; size: [number, number] }> = [
    { pos: [-9, 0.02, -8], size: [18, 1.2] },
    { pos: [12, 0.02, -12], size: [16, 1.2] },
    { pos: [-4, 0.02, 16], size: [14, 1.2] },
  ];
  const houses: Array<[number, number, number]> = [
    [-14, 0, 10],
    [16, 0, 12],
  ];
  const trees: Array<[number, number, number]> = [
    [-10, 0, -18],
    [8, 0, -20],
    [20, 0, 0],
    [-22, 0, 4],
  ];
  const boulders: Array<[number, number, number]> = [
    [-6, 0, -6],
    [4, 0, 6],
    [10, 0, 2],
  ];

  return (
    <group>
      {fields.map((field, i) => (
        <mesh key={`field-${i}`} position={field.pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={field.size} />
          <meshStandardMaterial color={i % 2 === 0 ? '#6d8d45' : '#5f7f3f'} roughness={0.95} />
        </mesh>
      ))}
      {ditches.map((ditch, i) => (
        <mesh key={`ditch-${i}`} position={ditch.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={ditch.size} />
          <meshStandardMaterial color="#4a5f3a" roughness={1} />
        </mesh>
      ))}
      {houses.map((pos, i) => (
        <group key={`farmhouse-${i}`} position={pos}>
          <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[4, 2.2, 3]} />
            <meshStandardMaterial color="#e6ddcf" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.4, 0]} castShadow>
            <boxGeometry args={[4.4, 0.35, 3.4]} />
            <meshStandardMaterial color="#7a644a" roughness={0.95} />
          </mesh>
          <mesh position={[0.8, 0.4, 1.52]} castShadow>
            <boxGeometry args={[0.8, 1.2, 0.2]} />
            <meshStandardMaterial color="#5a4635" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {trees.map((pos, i) => (
        <group key={`farm-tree-${i}`} position={pos}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 3.6, 6]} />
            <meshStandardMaterial color="#7a5b3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.6, 0]} castShadow>
            <sphereGeometry args={[1.3, 8, 6]} />
            <meshStandardMaterial color="#4f7a3e" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {boulders.map((pos, i) => (
        <mesh key={`farm-boulder-${i}`} position={pos} castShadow>
          <sphereGeometry args={[0.8, 8, 6]} />
          <meshStandardMaterial color="#6b6b5a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};
