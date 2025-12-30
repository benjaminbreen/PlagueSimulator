/**
 * Umayyad Mosque District
 *
 * The Great Mosque of Damascus in an open plaza.
 * Features only the magnificent mosque complex at center with ample open space around it.
 */

import React from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import UmayyadMosque from '../landmarks/UmayyadMosque';

interface UmayyadMosqueDistrictProps {
  mapX: number;
  mapY: number;
  playerPosition?: THREE.Vector3;
}

const UmayyadMosqueDistrict: React.FC<UmayyadMosqueDistrictProps> = ({
  mapX,
  mapY,
  playerPosition
}) => {
  const district = getDistrictType(mapX, mapY);

  if (district !== 'UMAYYAD_MOSQUE') return null;

  return (
    <group>
      {/* The mosque itself at center - no other buildings */}
      <UmayyadMosque mapX={mapX} mapY={mapY} playerPosition={playerPosition} />
    </group>
  );
};

export default UmayyadMosqueDistrict;
