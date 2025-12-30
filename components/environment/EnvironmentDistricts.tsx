import React from 'react';
import * as THREE from 'three';
import { TerrainHeightmap } from '../../utils/terrain';
import { CentralWell } from './landmarks/CentralWell';
import { BirdFlock } from './landmarks/BirdFlock';
import { WealthyGarden } from './landmarks/WealthyGarden';
import { CitadelComplex } from './landmarks/CitadelComplex';
import { MountainShrineDecor } from './districts/MountainShrineDecor';
import { SalhiyyaDecor } from './districts/SalhiyyaDecor';
import { MarketplaceDecor } from './districts/MarketplaceDecor';
import { CaravanseraiComplex } from './districts/CaravanseraiComplex';
import { OutskirtsFarmlandDecor } from './districts/OutskirtsFarmlandDecor';
import { OutskirtsDesertDecor } from './districts/OutskirtsDesertDecor';
import { OutskirtsScrublandDecor } from './districts/OutskirtsScrublandDecor';
import { RoadsideDecor } from './districts/RoadsideDecor';
import { SouthernRoadDecor } from './districts/SouthernRoadDecor';
import { ChristianQuarterDecor } from './districts/ChristianQuarterDecor';
import JewishQuarterDecor from './districts/JewishQuarterDecor';
import { BabSharqiGate } from './districts/BabSharqiGate';
import UmayyadMosqueDistrict from './districts/UmayyadMosqueDistrict';

type EnvironmentDistrictsProps = {
  mapX: number;
  mapY: number;
  timeOfDay?: number;
  terrainSeed: number;
  heightmap?: TerrainHeightmap | null;
  buildingPositions: Array<[number, number, number]>;
  playerPosition?: THREE.Vector3;
  catPositionRef?: React.MutableRefObject<THREE.Vector3>;
  ratPositions?: THREE.Vector3[];
  npcPositions?: THREE.Vector3[];
  isSprinting?: boolean;
  onTreePositionsGenerated?: (positions: Array<[number, number, number]>) => void;
};

export const EnvironmentDistricts: React.FC<EnvironmentDistrictsProps> = ({
  mapX,
  mapY,
  timeOfDay,
  terrainSeed,
  heightmap,
  buildingPositions,
  playerPosition,
  catPositionRef,
  ratPositions,
  npcPositions,
  isSprinting,
  onTreePositionsGenerated
}) => (
  <>
    <CentralWell
      mapX={mapX}
      mapY={mapY}
      timeOfDay={timeOfDay}
      catPositionRef={catPositionRef}
      ratPositions={ratPositions}
      npcPositions={npcPositions}
      playerPosition={playerPosition}
      isSprinting={isSprinting}
    />
    <MarketplaceDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
    <BirdFlock mapX={mapX} mapY={mapY} center={[0, 7, 0]} count={5} bounds={22} />
    <WealthyGarden mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} buildingPositions={buildingPositions} />
    <CitadelComplex mapX={mapX} mapY={mapY} />
    <OutskirtsFarmlandDecor mapX={mapX} mapY={mapY} />
    <OutskirtsDesertDecor mapX={mapX} mapY={mapY} />
    <OutskirtsScrublandDecor mapX={mapX} mapY={mapY} />
    <RoadsideDecor mapX={mapX} mapY={mapY} />
    <SouthernRoadDecor mapX={mapX} mapY={mapY} />
    <BabSharqiGate mapX={mapX} mapY={mapY} />
    <SalhiyyaDecor
      mapX={mapX}
      mapY={mapY}
      timeOfDay={timeOfDay}
      terrainSeed={terrainSeed}
      onTreePositionsGenerated={onTreePositionsGenerated}
      buildingPositions={buildingPositions}
      heightmap={heightmap}
    />
    <ChristianQuarterDecor mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} terrainSeed={terrainSeed} heightmap={heightmap} />
    <JewishQuarterDecor mapX={mapX} mapY={mapY} terrainHeightmap={heightmap} sessionSeed={terrainSeed} />
    <UmayyadMosqueDistrict mapX={mapX} mapY={mapY} terrainHeightmap={heightmap} sessionSeed={terrainSeed} playerPosition={playerPosition} />
    <MountainShrineDecor
      mapX={mapX}
      mapY={mapY}
      timeOfDay={timeOfDay}
      terrainSeed={terrainSeed}
      onTreePositionsGenerated={onTreePositionsGenerated}
    />
    <CaravanseraiComplex mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
  </>
);
