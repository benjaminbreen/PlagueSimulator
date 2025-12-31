import React from 'react';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, DistrictType } from '../../types';
import { TerrainHeightmap } from '../../utils/terrain';
import { ClimbableAccessory } from './climbables';
import { MosqueBackground } from './landmarks/MosqueBackground';
import { HorizonBackdrop } from './landmarks/HorizonBackdrop';
import { ComponentType } from 'react';

type EnvironmentBaseProps = {
  mapX: number;
  mapY: number;
  district: DistrictType;
  groundSeed: number;
  terrainSeed: number;
  timeOfDay?: number;
  fogColor?: THREE.ColorRepresentation;
  heightmap?: TerrainHeightmap | null;
  nearBuildingId?: string | null;
  torchIntensity: number;
  nightFactor: number;
  showCityWalls: boolean;
  onGroundClick?: (point: THREE.Vector3) => void;
  onHeightmapBuilt?: (heightmap: TerrainHeightmap) => void;
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void;
  sessionSeed: number;
  climbables: import('../../types').ClimbableAccessory[];
  isSprinting?: boolean;
  GroundComponent: ComponentType<any>;
  BuildingsComponent: ComponentType<any>;
};

export const EnvironmentBase: React.FC<EnvironmentBaseProps> = ({
  mapX,
  mapY,
  district,
  groundSeed,
  terrainSeed,
  timeOfDay,
  fogColor,
  heightmap,
  nearBuildingId,
  torchIntensity,
  nightFactor,
  showCityWalls,
  onGroundClick,
  onHeightmapBuilt,
  onBuildingsGenerated,
  sessionSeed,
  climbables,
  isSprinting,
  GroundComponent,
  BuildingsComponent
}) => (
  <>
    <GroundComponent
      mapX={mapX}
      mapY={mapY}
      onClick={onGroundClick}
      district={district}
      seed={groundSeed}
      terrainSeed={terrainSeed}
      timeOfDay={timeOfDay}
      fogColor={fogColor}
      onHeightmapBuilt={onHeightmapBuilt}
    />
    <BuildingsComponent
      mapX={mapX}
      mapY={mapY}
      sessionSeed={sessionSeed}
      onBuildingsGenerated={onBuildingsGenerated}
      nearBuildingId={nearBuildingId}
      torchIntensity={torchIntensity}
      nightFactor={nightFactor}
      heightmap={heightmap}
      isSprinting={isSprinting}
    />
    {climbables.map((accessory) => (
      <ClimbableAccessory key={accessory.id} accessory={accessory} nightFactor={nightFactor} />
    ))}
    <MosqueBackground mapX={mapX} mapY={mapY} />
    <HorizonBackdrop
      timeOfDay={timeOfDay}
      showCityWalls={showCityWalls}
      wallRadius={CONSTANTS.BOUNDARY + 8}
      district={district}
      mapX={mapX}
      mapY={mapY}
    />
  </>
);
