import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingMetadata, CONSTANTS } from '../../types';
import { getBuildingHeight } from '../../utils/buildingHeights';

interface PlayerHomeMarkerProps {
  homeBuilding: BuildingMetadata | null;
  isOnHomeTile: boolean;
}

/**
 * Renders a floating golden diamond marker above the player's home building.
 * Only visible when the player is on their home tile.
 * Shows "Player's Home" label and enhanced glow on hover.
 */
export const PlayerHomeMarker: React.FC<PlayerHomeMarkerProps> = ({
  homeBuilding,
  isOnHomeTile
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const diamondRef = useRef<THREE.Mesh>(null);
  const diamondMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const outerGlowRef = useRef<THREE.PointLight>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const hoverTransition = useRef(0);

  // Calculate marker position above the home building
  const markerPosition = useMemo(() => {
    if (!homeBuilding) return null;
    const buildingHeight = getBuildingHeight(homeBuilding, homeBuilding.district);
    return new THREE.Vector3(
      homeBuilding.position[0],
      buildingHeight + 4, // Float above the roof
      homeBuilding.position[2]
    );
  }, [homeBuilding]);

  // Building footprint size for hover detection
  const buildingSize = useMemo(() => {
    if (!homeBuilding) return 4;
    return CONSTANTS.BUILDING_SIZE * (homeBuilding.sizeScale ?? 1);
  }, [homeBuilding]);

  // Animate the diamond bob, rotation, and hover effects
  useFrame((_, delta) => {
    if (!diamondRef.current || !markerPosition) return;

    timeRef.current += delta;

    // Smooth hover transition
    const targetHover = isHovered ? 1 : 0;
    hoverTransition.current += (targetHover - hoverTransition.current) * delta * 8;

    // Enhanced bob when hovered
    const bobAmplitude = 0.3 + hoverTransition.current * 0.2;
    const bobSpeed = 1.5 + hoverTransition.current * 0.5;
    const bob = Math.sin(timeRef.current * bobSpeed) * bobAmplitude;
    diamondRef.current.position.y = markerPosition.y + bob;

    // Faster rotation when hovered
    const rotSpeed = 0.5 + hoverTransition.current * 1.5;
    diamondRef.current.rotation.y += delta * rotSpeed;

    // Scale up slightly when hovered
    const scale = 1 + hoverTransition.current * 0.3;
    diamondRef.current.scale.setScalar(scale);

    // Enhanced emissive when hovered
    if (diamondMaterialRef.current) {
      const baseEmissive = 0.6;
      const hoverEmissive = 1.8;
      const pulseEmissive = Math.sin(timeRef.current * 3) * 0.3 * hoverTransition.current;
      diamondMaterialRef.current.emissiveIntensity =
        baseEmissive + (hoverEmissive - baseEmissive) * hoverTransition.current + pulseEmissive;
    }

    // Pulse the glow - more intense when hovered
    if (glowRef.current) {
      const baseIntensity = 1.5 + hoverTransition.current * 3;
      const pulse = Math.sin(timeRef.current * 2) * (0.5 + hoverTransition.current * 1);
      glowRef.current.intensity = baseIntensity + pulse;
      glowRef.current.distance = 8 + hoverTransition.current * 8;
    }

    // Outer glow only visible when hovered
    if (outerGlowRef.current) {
      outerGlowRef.current.intensity = hoverTransition.current * 4;
    }

    // Ground ring pulses when hovered
    if (groundRingRef.current) {
      const ringScale = 1 + Math.sin(timeRef.current * 2) * 0.1 * hoverTransition.current;
      groundRingRef.current.scale.setScalar(ringScale);
    }
  });

  // Don't render if not on home tile or no home building
  if (!isOnHomeTile || !homeBuilding || !markerPosition) return null;

  return (
    <group position={[markerPosition.x, 0, markerPosition.z]}>
      {/* Invisible hover detection mesh over building footprint */}
      <mesh
        position={[0, getBuildingHeight(homeBuilding, homeBuilding.district) / 2, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[buildingSize + 1, getBuildingHeight(homeBuilding, homeBuilding.district) + 2, buildingSize + 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Floating diamond marker */}
      <mesh
        ref={diamondRef}
        position={[0, markerPosition.y, 0]}
        castShadow
        onPointerEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          ref={diamondMaterialRef}
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Label - only visible on hover */}
      {isHovered && (
        <Html
          position={[0, markerPosition.y - 1.5, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(30, 20, 10, 0.95) 0%, rgba(20, 15, 8, 0.95) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.6)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#fbbf24',
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.1)',
              textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
            }}
          >
            Player's Home
          </div>
        </Html>
      )}

      {/* Primary amber point light */}
      <pointLight
        ref={glowRef}
        position={[0, markerPosition.y, 0]}
        color="#fbbf24"
        intensity={1.5}
        distance={8}
        decay={2}
      />

      {/* Secondary outer glow - only when hovered */}
      <pointLight
        ref={outerGlowRef}
        position={[0, markerPosition.y, 0]}
        color="#ff9500"
        intensity={0}
        distance={16}
        decay={2}
      />

      {/* Ground circle indicator */}
      <mesh
        ref={groundRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <ringGeometry args={[1.8, 2.2, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={isHovered ? 0.7 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner ground glow */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
      >
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={isHovered ? 0.35 : 0.15}
        />
      </mesh>

      {/* Extra hover glow ring */}
      {isHovered && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, 0]}
        >
          <ringGeometry args={[2.5, 3.2, 32]} />
          <meshBasicMaterial
            color="#ff9500"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
