/**
 * Citadel Complex Component
 * Fortified citadel in designated district
 */

import React from 'react';
import { getDistrictType } from '../../../types';

export const CitadelComplex: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'CIVIC') return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Outer walls */}
      <mesh position={[0, 3.5, -18]} castShadow receiveShadow>
        <boxGeometry args={[50, 7, 3]} />
        <meshStandardMaterial color="#8d8273" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 18]} castShadow receiveShadow>
        <boxGeometry args={[50, 7, 3]} />
        <meshStandardMaterial color="#8d8273" roughness={0.9} />
      </mesh>
      <mesh position={[-24, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 7, 36]} />
        <meshStandardMaterial color="#85796a" roughness={0.92} />
      </mesh>
      <mesh position={[24, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 7, 36]} />
        <meshStandardMaterial color="#85796a" roughness={0.92} />
      </mesh>

      {/* Corner towers */}
      {[
        [-24, 5.2, -18],
        [24, 5.2, -18],
        [-24, 5.2, 18],
        [24, 5.2, 18],
      ].map((pos, i) => (
        <mesh key={`tower-${i}`} position={pos as [number, number, number]} castShadow receiveShadow>
          <cylinderGeometry args={[3.2, 3.6, 10.5, 10]} />
          <meshStandardMaterial color="#7e7265" roughness={0.9} />
        </mesh>
      ))}

      {/* Gatehouse */}
      <group position={[0, 0, -18]}>
        <mesh position={[0, 3.8, -2.2]} castShadow receiveShadow>
          <boxGeometry args={[12, 7.6, 6]} />
          <meshStandardMaterial color="#7a6e5f" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.2, -5]} castShadow>
          <boxGeometry args={[5, 2.4, 0.6]} />
          <meshStandardMaterial color="#5a3f2a" roughness={0.9} />
        </mesh>
      </group>

      {/* Inner keep */}
      <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 15, 16]} />
        <meshStandardMaterial color="#8b8073" roughness={0.88} />
      </mesh>
      <mesh position={[0, 15.5, 0]} castShadow>
        <boxGeometry args={[18, 1.4, 18]} />
        <meshStandardMaterial color="#9a8e7f" roughness={0.9} />
      </mesh>

      {/* Courtyard outbuildings */}
      <mesh position={[-10, 1.6, 8]} castShadow receiveShadow>
        <boxGeometry args={[8, 3.2, 6]} />
        <meshStandardMaterial color="#7c6f60" roughness={0.92} />
      </mesh>
      <mesh position={[12, 1.4, 6]} castShadow receiveShadow>
        <boxGeometry args={[6, 2.8, 5]} />
        <meshStandardMaterial color="#706457" roughness={0.92} />
      </mesh>
      <mesh position={[8, 1.2, -6]} castShadow receiveShadow>
        <boxGeometry args={[5, 2.4, 4]} />
        <meshStandardMaterial color="#6a5e52" roughness={0.93} />
      </mesh>
    </group>
  );
};

