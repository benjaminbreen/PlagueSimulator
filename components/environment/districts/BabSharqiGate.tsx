/**
 * Bab Sharqi (Eastern Gate) District Decor
 * Simple gatehouse with twin towers to mark the eastern entry.
 */

import React, { useMemo } from 'react';
import { CONSTANTS, getDistrictType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';

export const BabSharqiGate: React.FC<{ mapX: number; mapY: number }> = ({ mapX, mapY }) => {
  const district = getDistrictType(mapX, mapY);
  if (district !== 'BAB_SHARQI') return null;

  const seed = mapX * 1307 + mapY * 971 + 19;
  const gateX = 0;
  const gateZ = CONSTANTS.BOUNDARY;
  const towerOffsetX = 11.2;
  const towerHeight = 13 + seededRandom(seed + 1) * 3.2;
  const wallHeight = 6.8;
  const wallThickness = 1.75;
  const wallSpan = 22;
  const roadLength = CONSTANTS.MARKET_SIZE * 2;
  const roadWidth = 8;
  const stone = '#b6a38f';
  const trim = '#9c8772';
  const shadow = '#6b5a4a';
  const roadStone = '#9c8b74';
  const roadTrim = '#8b7b68';

  const bannerColor = useMemo(() => (
    seededRandom(seed + 7) > 0.5 ? '#7a3b3b' : '#3b4a6a'
  ), [seed]);

  return (
    <group>
      {/* Paved road leading to gate */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[roadWidth, 0.12, roadLength]} />
        <meshStandardMaterial color={roadStone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[roadWidth * 0.55, 0.04, roadLength]} />
        <meshStandardMaterial color={roadTrim} roughness={0.95} />
      </mesh>

      {/* Gatehouse frame */}
      <group position={[gateX, 0, gateZ]}>
        {/* Main arch pillars */}
        <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[10.8, wallHeight, wallThickness]} />
          <meshStandardMaterial color={stone} roughness={0.9} />
        </mesh>
        {/* Arch cutout (dark insert) */}
        <mesh position={[0, 2.3, wallThickness * 0.55]} castShadow>
          <boxGeometry args={[8.5, 4.2, 0.25]} />
          <meshStandardMaterial color={shadow} roughness={0.8} />
        </mesh>
        {/* Arch top */}
        <mesh position={[0, 4.9, wallThickness * 0.55]} castShadow>
          <cylinderGeometry args={[4.2, 4.2, 0.25, 18, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={shadow} roughness={0.8} />
        </mesh>
        {/* Lintel trim */}
        <mesh position={[0, wallHeight + 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[12.0, 0.55, wallThickness * 1.05]} />
          <meshStandardMaterial color={trim} roughness={0.85} />
        </mesh>
        {/* Small banner */}
        <mesh position={[0, wallHeight - 0.9, wallThickness * 0.75]} castShadow>
          <boxGeometry args={[2.0, 2.4, 0.08]} />
          <meshStandardMaterial color={bannerColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Wall segments */}
      <mesh position={[gateX - wallSpan / 2 - 3.2, wallHeight / 2, gateZ]} castShadow receiveShadow>
        <boxGeometry args={[wallSpan, wallHeight, wallThickness]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
      <mesh position={[gateX + wallSpan / 2 + 3.2, wallHeight / 2, gateZ]} castShadow receiveShadow>
        <boxGeometry args={[wallSpan, wallHeight, wallThickness]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>

      {/* Twin towers */}
      {[-1, 1].map((dir) => (
        <group key={`bab-sharqi-tower-${dir}`} position={[gateX + towerOffsetX * dir, 0, gateZ + 2.0]}>
          <mesh position={[0, towerHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.4, towerHeight, 4.4]} />
            <meshStandardMaterial color={stone} roughness={0.9} />
          </mesh>
          <mesh position={[0, towerHeight + 1.6, 0]} castShadow receiveShadow>
            <coneGeometry args={[3.0, 3.2, 4]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
          {/* Small arched slit */}
          <mesh position={[2.1, towerHeight * 0.6, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.12, 2.1, 0.7]} />
            <meshStandardMaterial color={shadow} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
