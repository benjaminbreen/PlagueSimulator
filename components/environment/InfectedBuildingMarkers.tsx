import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingMetadata, BuildingInfectionState, CONSTANTS } from '../../types';

interface InfectedBuildingMarkersProps {
  buildings: BuildingMetadata[];
  buildingInfection?: Record<string, BuildingInfectionState>;
  playerPosition?: [number, number, number]; // Optional, not currently used but kept for API compatibility
}

/**
 * Renders big red diamond markers and wireframes above infected/deceased buildings
 * Visible from far away in all camera modes
 * Label appears on hover of diamond or ground marker
 */
export const InfectedBuildingMarkers: React.FC<InfectedBuildingMarkersProps> = ({
  buildings,
  buildingInfection,
  playerPosition
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
        playerPosition
      }));
  }, [buildings, buildingInfection, playerPosition]);

  if (infectedBuildings.length === 0) return null;

  return (
    <group ref={groupRef}>
      {infectedBuildings.map(({ building, state, playerPosition: localPlayerPosition }) => (
        <InfectedBuildingMarker
          key={building.id}
          building={building}
          status={state.status as 'infected' | 'deceased'}
          playerPosition={localPlayerPosition}
        />
      ))}
    </group>
  );
};

// Combined marker component with hover detection
interface InfectedBuildingMarkerProps {
  building: BuildingMetadata;
  status: 'infected' | 'deceased';
  playerPosition?: [number, number, number];
}

const InfectedBuildingMarker: React.FC<InfectedBuildingMarkerProps> = ({ building, status, playerPosition }) => {
  const [isHovered, setIsHovered] = useState(false);
  const distanceSq = useMemo(() => {
    if (!playerPosition) return 0;
    const dx = building.position[0] - playerPosition[0];
    const dz = building.position[2] - playerPosition[2];
    return dx * dx + dz * dz;
  }, [building.position, playerPosition]);
  const skipAnimation = distanceSq > 140 * 140;
  const disableLight = distanceSq > 90 * 90;
  const disableLabel = distanceSq > 120 * 120;

  return (
    <group>
      {/* Big floating diamond marker - with hover detection */}
      <InfectedDiamond
        position={building.position}
        status={status}
        skipAnimation={skipAnimation}
        onHoverChange={setIsHovered}
      />
      {/* Red light to illuminate building walls */}
      {!disableLight && (
        <BuildingLight
          position={building.position}
          storyCount={building.storyCount ?? 1}
          status={status}
        />
      )}
      {/* Glowing ground circle marker - also detects hover */}
      <GroundMarker
        position={building.position}
        sizeScale={building.sizeScale ?? 1}
        status={status}
        skipAnimation={skipAnimation}
        onHoverChange={setIsHovered}
      />
      {/* Floating text label - shows on hover */}
      {isHovered && !disableLabel && (
        <PlagueHouseLabel
          position={building.position}
          status={status}
        />
      )}
    </group>
  );
};

interface InfectedDiamondProps {
  position: [number, number, number];
  status: 'infected' | 'deceased';
  skipAnimation?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

// Big red diamond floating above infected building
const InfectedDiamond: React.FC<InfectedDiamondProps> = ({ position, status, skipAnimation, onHoverChange }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!skipAnimation || !meshRef.current) return;
    meshRef.current.position.y = 12;
    meshRef.current.rotation.y = 0;
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 1.2;
  }, [skipAnimation]);

  // Pulsing glow and bobbing animation
  useFrame((state) => {
    if (!meshRef.current) return;
    if (skipAnimation) return;

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
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverChange?.(false);
        document.body.style.cursor = 'auto';
      }}
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
  skipAnimation?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

// Glowing circular marker on the ground around the building with radial gradient
const GroundMarker: React.FC<GroundMarkerProps> = ({ position, sizeScale, status, skipAnimation, onHoverChange }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const buildingSize = CONSTANTS.BUILDING_SIZE * sizeScale;
  const circleRadius = (buildingSize * 0.8); // Slightly larger than building footprint

  const markerColor = status === 'deceased' ? '#aa0000' : '#ff0000';

  // Create radial gradient texture for smooth fade-out effect
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create radial gradient from center to edge
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

    // Bright glow in center fading to transparent at edges
    gradient.addColorStop(0, markerColor + 'ff'); // Fully opaque center
    gradient.addColorStop(0.3, markerColor + 'ee'); // Very bright inner glow
    gradient.addColorStop(0.6, markerColor + '88'); // Medium glow
    gradient.addColorStop(0.85, markerColor + '33'); // Faint outer glow
    gradient.addColorStop(1, markerColor + '00'); // Transparent edge

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [markerColor]);

  useEffect(() => {
    if (!skipAnimation || !meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.65;
  }, [skipAnimation]);

  // Pulsing glow animation
  useFrame((state) => {
    if (!meshRef.current) return;
    if (skipAnimation) return;

    const time = state.clock.elapsedTime;
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // 0-1

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.6 + pulse * 0.4; // 0.6-1.0 for brighter pulse
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 0.05, position[2]]} // Just above ground
      rotation={[-Math.PI / 2, 0, 0]} // Horizontal
      receiveShadow={false}
      castShadow={false}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverChange?.(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <circleGeometry args={[circleRadius, 64]} />
      <meshBasicMaterial
        map={gradientTexture}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending} // Makes it glow brighter
      />
    </mesh>
  );
};

interface PlagueHouseLabelProps {
  position: [number, number, number];
  status: 'infected' | 'deceased';
}

/**
 * Floating "PLAGUE HOUSE" label using a sprite with canvas-rendered text
 * Billboard behavior (always faces camera), performant single draw call
 * Shows on hover of diamond or ground marker
 */
const PlagueHouseLabel: React.FC<PlagueHouseLabelProps> = ({ position, status }) => {
  const spriteRef = useRef<THREE.Sprite>(null);

  // Create text texture on canvas - memoized for performance
  const textTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // High resolution for crisp text
    canvas.width = 512;
    canvas.height = 128;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Text styling - dramatic red
    const labelText = status === 'deceased' ? '☠ DEATH HOUSE ☠' : '⚠ PLAGUE HOUSE ⚠';
    const bgColor = status === 'deceased' ? 'rgba(60, 0, 0, 0.95)' : 'rgba(100, 0, 0, 0.95)';
    const textColor = '#ff4444';
    const borderColor = status === 'deceased' ? '#cc0000' : '#ff0000';

    // Draw rounded rectangle background
    const padding = 12;
    const radius = 8;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(padding, padding, canvas.width - padding * 2, canvas.height - padding * 2, radius);
    ctx.fill();

    // Draw border - thicker
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw text
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Red glow effect
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = textColor;
    ctx.fillText(labelText, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [status]);

  // Animation - bob synced with diamond, pulse effect
  useFrame((state) => {
    if (!spriteRef.current) return;

    const time = state.clock.elapsedTime;

    // Match diamond bob animation
    const bobHeight = Math.sin(time * 2) * 0.3;
    spriteRef.current.position.y = 15 + bobHeight; // Above the diamond (which is at 12)

    // Pulse effect
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2;

    const material = spriteRef.current.material as THREE.SpriteMaterial;
    material.opacity = 0.9 + pulse * 0.1;
  });

  if (!textTexture) return null;

  return (
    <sprite
      ref={spriteRef}
      position={[position[0], 15, position[2]]}
      scale={[5, 1.25, 1]} // Wide aspect ratio for text
    >
      <spriteMaterial
        map={textTexture}
        transparent
        opacity={1}
        depthTest={true}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </sprite>
  );
};
