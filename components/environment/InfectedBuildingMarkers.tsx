import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingMetadata, BuildingInfectionState, CONSTANTS } from '../../types';

interface InfectedBuildingMarkersProps {
  buildings: BuildingMetadata[];
  buildingInfection?: Record<string, BuildingInfectionState>;
  playerPosition: [number, number, number];
}

/**
 * Renders big red diamond markers and wireframes above infected/deceased buildings
 * Visible from far away in all camera modes
 */
export const InfectedBuildingMarkers: React.FC<InfectedBuildingMarkersProps> = ({
  buildings,
  buildingInfection,
  playerPosition,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Filter to infected/deceased buildings - NO distance culling, visible from anywhere
  const infectedBuildings = useMemo(() => {
    if (!buildingInfection) return [];

    return buildings
      .filter((building) => {
        const state = buildingInfection[building.id];
        if (!state) return false;
        if (state.status !== 'infected' && state.status !== 'deceased') return false;
        return true;
      })
      .map((building) => ({
        building,
        state: buildingInfection[building.id]!,
      }));
  }, [buildings, buildingInfection]);

  if (infectedBuildings.length === 0) return null;

  return (
    <group ref={groupRef}>
      {infectedBuildings.map(({ building, state }) => (
        <React.Fragment key={building.id}>
          {/* Big floating diamond marker */}
          <InfectedDiamond
            position={building.position}
            status={state.status as 'infected' | 'deceased'}
          />
          {/* Red light to illuminate building walls */}
          <BuildingLight
            position={building.position}
            storyCount={building.storyCount ?? 1}
            status={state.status as 'infected' | 'deceased'}
          />
          {/* Glowing ground circle marker */}
          <GroundMarker
            position={building.position}
            sizeScale={building.sizeScale ?? 1}
            status={state.status as 'infected' | 'deceased'}
          />
        </React.Fragment>
      ))}
    </group>
  );
};

interface InfectedDiamondProps {
  position: [number, number, number];
  status: 'infected' | 'deceased';
}

// Big red diamond floating above infected building
const InfectedDiamond: React.FC<InfectedDiamondProps> = ({ position, status }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pulsing glow and bobbing animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;

    // Bob up and down
    const bobHeight = Math.sin(time * 2) * 0.5;
    meshRef.current.position.y = 12 + bobHeight; // Float high at 12 units + bob

    // Rotate slowly
    meshRef.current.rotation.y = time * 0.5;

    // Pulsing glow
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // 0-1
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 1.0 + pulse * 1.5; // 1.0-2.5 very bright
  });

  const baseColor = status === 'deceased' ? '#8a0000' : '#ff0000';
  const emissiveColor = status === 'deceased' ? '#cc0000' : '#ff3333';

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 12, position[2]]}
      castShadow={false}
      receiveShadow={false}
    >
      {/* Octahedron = diamond shape */}
      <octahedronGeometry args={[2, 0]} />
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={1.5}
        roughness={0.1}
        metalness={0.8}
        toneMapped={false}
      />
    </mesh>
  );
};

interface BuildingLightProps {
  position: [number, number, number];
  storyCount: number;
  status: 'infected' | 'deceased';
}

// Bright red point light to make building walls glow
const BuildingLight: React.FC<BuildingLightProps> = ({ position, storyCount, status }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  const buildingHeight = 2.6 + (storyCount - 1) * 2.4;
  const lightHeight = buildingHeight + 2; // Just above the building

  // Pulsing light intensity
  useFrame((state) => {
    if (!lightRef.current) return;

    const time = state.clock.elapsedTime;
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // 0-1

    // Pulse between bright and very bright
    lightRef.current.intensity = 8 + pulse * 4; // 8-12 intensity
  });

  const lightColor = status === 'deceased' ? '#cc0000' : '#ff0000';

  return (
    <pointLight
      ref={lightRef}
      position={[position[0], lightHeight, position[2]]}
      color={lightColor}
      intensity={10}
      distance={25} // Light reaches 25 units
      decay={2}
      castShadow={false}
    />
  );
};

interface GroundMarkerProps {
  position: [number, number, number];
  sizeScale: number;
  status: 'infected' | 'deceased';
}

// Glowing circular marker on the ground around the building
const GroundMarker: React.FC<GroundMarkerProps> = ({ position, sizeScale, status }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const buildingSize = CONSTANTS.BUILDING_SIZE * sizeScale;
  const circleRadius = (buildingSize * 0.8); // Slightly larger than building footprint

  // Pulsing glow animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // 0-1

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.4 + pulse * 0.3; // 0.4-0.7
  });

  const markerColor = status === 'deceased' ? '#aa0000' : '#ff0000';

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 0.05, position[2]]} // Just above ground
      rotation={[-Math.PI / 2, 0, 0]} // Horizontal
      receiveShadow={false}
      castShadow={false}
    >
      <circleGeometry args={[circleRadius, 32]} />
      <meshBasicMaterial
        color={markerColor}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
