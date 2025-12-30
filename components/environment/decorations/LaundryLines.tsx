/**
 * Laundry Lines Component
 * Renders procedural laundry lines with realistic wind animation
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LaundryLine, ClothItem as ClothItemType, getCatenaryPoint } from '../../../utils/laundry';

// ==================== MAIN COMPONENT ====================

export const LaundryLines: React.FC<{ lines: LaundryLine[]; time: number }> = ({ lines, time }) => {
  return (
    <group>
      {lines.map((line) => (
        <LaundryLineRenderer key={line.id} line={line} time={time} />
      ))}
    </group>
  );
};

// ==================== INDIVIDUAL LINE RENDERER ====================

const LaundryLineRenderer: React.FC<{ line: LaundryLine; time: number }> = ({ line }) => {
  const ropeRef = useRef<THREE.Line>(null);

  // Create rope geometry using catenary curve
  const ropeGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = getCatenaryPoint(line, t);
      points.push(new THREE.Vector3(point[0], point[1], point[2]));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [line]);

  return (
    <group>
      {/* Rope */}
      {/* @ts-expect-error R3F line element conflicts with SVG line type */}
      <line ref={ropeRef} geometry={ropeGeometry}>
        <lineBasicMaterial color="#8b7355" linewidth={2} />
      </line>

      {/* Cloth items */}
      {line.clothItems.map((cloth, i) => {
        const catenaryPos = getCatenaryPoint(line, cloth.position);
        return (
          <ClothItem
            key={`${line.id}-cloth-${i}`}
            cloth={cloth}
            position={catenaryPos}
            windPhase={line.windPhase}
          />
        );
      })}
    </group>
  );
};

// ==================== INDIVIDUAL CLOTH ITEM ====================

const ClothItem: React.FC<{
  cloth: ClothItemType;
  position: [number, number, number];
  windPhase: number;
}> = ({ cloth, position, windPhase }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastUpdateRef = useRef(0);
  const FAR_SQ = 60 * 60;
  const VERY_FAR_SQ = 90 * 90;

  // Animate cloth with wind
  useFrame(({ clock, camera }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const dx = camera.position.x - position[0];
    const dy = camera.position.y - position[1];
    const dz = camera.position.z - position[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    const lastUpdate = lastUpdateRef.current;
    if (distSq > VERY_FAR_SQ && time - lastUpdate < 0.5) return;
    if (distSq > FAR_SQ && time - lastUpdate < 0.18) return;
    lastUpdateRef.current = time;
    const totalPhase = time + cloth.swayPhase + windPhase;

    // Horizontal sway
    const swayX = Math.sin(totalPhase * 1.2) * 0.15;
    const swayZ = Math.cos(totalPhase * 1.5) * 0.08;

    // Vertical bounce
    const bounceY = Math.sin(totalPhase * 0.8) * 0.08;

    // Apply animation
    meshRef.current.position.set(
      position[0] + swayX,
      position[1] + bounceY,
      position[2] + swayZ
    );

    // Slight rotation for more realism
    meshRef.current.rotation.y = cloth.rotation + Math.sin(totalPhase * 1.5) * 0.1;
    meshRef.current.rotation.z = Math.sin(totalPhase * 1.3) * 0.05;
  });

  return (
    <group>
      {/* Clothespin/peg */}
      <mesh position={position}>
        <cylinderGeometry args={[0.02, 0.025, 0.05, 6]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
      </mesh>

      {/* Cloth */}
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[cloth.size[0], cloth.size[1]]} />
        <meshStandardMaterial
          color={cloth.color}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
