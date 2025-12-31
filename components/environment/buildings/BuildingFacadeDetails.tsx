import React from 'react';
import * as THREE from 'three';
import { BuildingMetadata, BuildingType, DistrictType } from '../../../types';

type BuildingFacadeDetailsProps = {
  data: BuildingMetadata;
  district: DistrictType;
  finalBuildingSize: number;
  finalHeight: number;
  hasRoofCap: boolean;
  hasParapetRing: boolean;
  hasCrenelation: boolean;
  crenelPositions: THREE.Vector3[];
  crenelRef: React.RefObject<THREE.InstancedMesh>;
};

export const BuildingFacadeDetails: React.FC<BuildingFacadeDetailsProps> = ({
  data,
  district,
  finalBuildingSize,
  finalHeight,
  hasRoofCap,
  hasParapetRing,
  hasCrenelation,
  crenelPositions,
  crenelRef
}) => (
  <>
    {/* Poor hovel roof detailing */}
    {district === 'HOVELS' && data.type === BuildingType.RESIDENTIAL && (
      <group position={[0, finalHeight / 2 + 0.08, 0]}>
        <mesh castShadow>
          <boxGeometry args={[finalBuildingSize * 0.95, 0.12, finalBuildingSize * 0.95]} />
          <meshStandardMaterial color="#6b5a42" roughness={0.98} />
        </mesh>
        <mesh position={[-0.3, 0.1, 0.1]} rotation={[0, 0.2, 0.05]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, finalBuildingSize * 0.8, 6]} />
          <meshStandardMaterial color="#4b3b2a" roughness={0.95} />
        </mesh>
        <mesh position={[0.2, 0.1, -0.15]} rotation={[0, -0.15, -0.04]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, finalBuildingSize * 0.7, 6]} />
          <meshStandardMaterial color="#4f3d2a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.14, 0.2]} rotation={[0.1, 0, 0.08]} castShadow>
          <boxGeometry args={[finalBuildingSize * 0.5, 0.06, 0.25]} />
          <meshStandardMaterial color="#5a4936" roughness={0.96} />
        </mesh>
      </group>
    )}
    {/* Subtle roof caps / parapet ring */}
    {hasRoofCap && (
      <mesh position={[0, finalHeight / 2 + 0.08, 0]} receiveShadow>
        <boxGeometry args={[finalBuildingSize * 0.6, 0.16, finalBuildingSize * 0.6]} />
        <meshStandardMaterial color="#9b7b4f" roughness={0.85} />
      </mesh>
    )}
    {hasParapetRing && (
      <mesh position={[0, finalHeight / 2 + 0.12, 0]} receiveShadow>
        <boxGeometry args={[finalBuildingSize * 0.92, 0.18, finalBuildingSize * 0.92]} />
        <meshStandardMaterial color="#b79e7f" roughness={0.9} />
      </mesh>
    )}
    {hasCrenelation && (
      <instancedMesh ref={crenelRef} args={[undefined, undefined, crenelPositions.length]} position={[0, finalHeight / 2 + 0.2, 0]} receiveShadow>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshStandardMaterial color="#a98963" roughness={0.95} />
      </instancedMesh>
    )}
  </>
);
