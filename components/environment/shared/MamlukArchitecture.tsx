/**
 * Reusable Mamluk Architecture Components
 * Helper components for building the Citadel Complex
 */

import React from 'react';
import * as THREE from 'three';

/**
 * Pointed Islamic arch component
 * Used for doorways, windows, and arcade openings
 */
export const PointedArch: React.FC<{
  width: number;
  height: number;
  depth: number;
  position?: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}> = ({ width, height, depth, position = [0, 0, 0], color = '#c9b999', rotation = [0, 0, 0] }) => {
  const segments = 12;
  const radius = width * 0.6;

  return (
    <group position={position} rotation={rotation}>
      {/* Left half of pointed arch */}
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * Math.PI;
        const x = -width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        const segmentAngle = angle - Math.PI / 2;

        return (
          <mesh
            key={`left-${i}`}
            position={[x, y, 0]}
            rotation={[0, 0, segmentAngle]}
            castShadow
          >
            <boxGeometry args={[0.4, radius * 0.3, depth]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
        );
      })}

      {/* Right half */}
      {Array.from({ length: segments }).map((_, i) => {
        const angle = Math.PI - (i / segments) * Math.PI;
        const x = width / 2 - Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        const segmentAngle = -angle + Math.PI / 2;

        return (
          <mesh
            key={`right-${i}`}
            position={[x, y, 0]}
            rotation={[0, 0, segmentAngle]}
            castShadow
          >
            <boxGeometry args={[0.4, radius * 0.3, depth]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
        );
      })}

      {/* Base pillars on each side */}
      <mesh position={[-width / 2, height / 4, 0]} castShadow>
        <boxGeometry args={[0.5, height / 2, depth]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh position={[width / 2, height / 4, 0]} castShadow>
        <boxGeometry args={[0.5, height / 2, depth]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
    </group>
  );
};

/**
 * Ornate column with capital
 * Used in arcades and palace colonnades
 */
export const OrnateColumn: React.FC<{
  position: [number, number, number];
  height: number;
  style: 'simple' | 'ornate';
  color?: string;
}> = ({ position, height, style, color = '#c9b896' }) => {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>

      {/* Column shaft */}
      <mesh position={[0, height / 2 + 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, height, 12]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>

      {/* Capital */}
      {style === 'ornate' ? (
        <>
          {/* Multi-tiered capital */}
          <mesh position={[0, height + 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.25, 0.3, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh position={[0, height + 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.35, 0.2, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, height + 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.25, 0.4, 8]} />
          <meshStandardMaterial color={color} roughness={0.88} />
        </mesh>
      )}
    </group>
  );
};

/**
 * Arcade colonnade - row of columns with arches
 * Used for barracks and palace porticos
 */
export const ArcadeColonnade: React.FC<{
  position: [number, number, number];
  length: number;
  columns: number;
  style: 'simple' | 'ornate';
  height: number;
  orientation?: 'north-south' | 'east-west';
}> = ({ position, length, columns, style, height, orientation = 'north-south' }) => {
  const spacing = length / (columns - 1);
  const isNorthSouth = orientation === 'north-south';

  return (
    <group position={position}>
      {/* Columns */}
      {Array.from({ length: columns }).map((_, i) => {
        const offset = -length / 2 + i * spacing;
        const colPos: [number, number, number] = isNorthSouth ? [0, 0, offset] : [offset, 0, 0];

        return (
          <OrnateColumn
            key={`col-${i}`}
            position={colPos}
            height={height - 1}
            style={style}
          />
        );
      })}

      {/* Horizontal beam connecting columns */}
      <mesh
        position={[0, height, 0]}
        rotation={isNorthSouth ? [0, 0, 0] : [0, Math.PI / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.5, 0.6, length]} />
        <meshStandardMaterial color="#c9b896" roughness={0.88} />
      </mesh>

      {/* Arches between columns */}
      {Array.from({ length: columns - 1 }).map((_, i) => {
        const offset = -length / 2 + i * spacing + spacing / 2;
        const archPos: [number, number, number] = isNorthSouth ? [0, height - 2, offset] : [offset, height - 2, 0];
        const archRot: [number, number, number] = isNorthSouth ? [0, 0, 0] : [0, Math.PI / 2, 0];

        return (
          <PointedArch
            key={`arch-${i}`}
            position={archPos}
            rotation={archRot}
            width={spacing * 0.8}
            height={2}
            depth={0.4}
          />
        );
      })}
    </group>
  );
};

/**
 * Crenellations (battlements) for defensive walls
 * Merlons and crenels pattern
 */
export const Crenellations: React.FC<{
  position: [number, number, number];
  length: number;
  orientation: 'north-south' | 'east-west';
  color?: string;
}> = ({ position, length, orientation, color = '#c9b896' }) => {
  const merlonCount = Math.floor(length / 2);
  const spacing = length / merlonCount;
  const isNorthSouth = orientation === 'north-south';

  return (
    <group position={position}>
      {Array.from({ length: merlonCount }).map((_, i) => {
        const offset = -length / 2 + i * spacing + spacing / 2;
        const merlonPos: [number, number, number] = isNorthSouth
          ? [0, 0, offset]
          : [offset, 0, 0];
        const merlonArgs: [number, number, number] = isNorthSouth
          ? [1.2, 1, spacing * 0.6]
          : [spacing * 0.6, 1, 1.2];

        return (
          <mesh key={`merlon-${i}`} position={merlonPos} castShadow>
            <boxGeometry args={merlonArgs} />
            <meshStandardMaterial color={color} roughness={0.92} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Arrow slit (vertical defensive opening)
 * Used in towers and walls
 */
export const ArrowSlit: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Outer opening */}
      <mesh castShadow>
        <boxGeometry args={[0.3, 1.5, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Inner widening (for archer visibility) */}
      <mesh position={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
    </group>
  );
};

/**
 * Machicolation (defensive overhang with holes)
 * Projects from tower tops for dropping objects on attackers
 */
export const Machicolation: React.FC<{
  position: [number, number, number];
  radius: number;
  segments?: number;
}> = ({ position, radius, segments = 16 }) => {
  return (
    <group position={position}>
      {/* Overhanging platform */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius + 0.5, radius, 1.5, segments]} />
        <meshStandardMaterial color="#c9b999" roughness={0.88} />
      </mesh>

      {/* Murder holes (evenly spaced around perimeter) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * (radius + 0.2);
        const z = Math.sin(angle) * (radius + 0.2);

        return (
          <mesh key={`hole-${i}`} position={[x, -0.5, z]} castShadow>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Simple window with mashrabiya (lattice screen) option
 * Used in palace and residential buildings
 */
export const Window: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  hasScreen?: boolean;
  rotation?: [number, number, number];
}> = ({ position, width, height, hasScreen = false, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Window frame */}
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial color={hasScreen ? '#4a3a2a' : '#2a2a2a'} />
      </mesh>

      {/* Mashrabiya lattice pattern (if enabled) */}
      {hasScreen && (
        <>
          {/* Vertical slats */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -width / 2 + (i / 5) * width;
            return (
              <mesh key={`v-${i}`} position={[x, 0, 0.15]} castShadow>
                <boxGeometry args={[0.05, height * 0.9, 0.05]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
              </mesh>
            );
          })}

          {/* Horizontal slats */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = -height / 2 + (i / 3) * height;
            return (
              <mesh key={`h-${i}`} position={[0, y, 0.15]} castShadow>
                <boxGeometry args={[width * 0.9, 0.05, 0.05]} />
                <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

/**
 * Defensive tower with arrow slits
 * Cylindrical tower for citadel corners
 */
export const DefensiveTower: React.FC<{
  position: [number, number, number];
  radius: number;
  height: number;
  ablaqTexture?: THREE.Texture;
}> = ({ position, radius, height, ablaqTexture }) => {
  return (
    <group position={position}>
      {/* Main tower body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.5, height, 16]} />
        <meshStandardMaterial
          map={ablaqTexture}
          color={ablaqTexture ? '#ffffff' : '#c9b896'}
          roughness={0.92}
        />
      </mesh>

      {/* Arrow slits (8 directional, at different heights) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const slitHeight = height * 0.3 + (i % 3) * (height * 0.2);

        return (
          <ArrowSlit
            key={`slit-${i}`}
            position={[
              Math.cos(angle) * (radius + 0.2),
              slitHeight,
              Math.sin(angle) * (radius + 0.2)
            ]}
            rotation={[0, angle, 0]}
          />
        );
      })}

      {/* Machicolations at top */}
      <Machicolation
        position={[0, height - 0.75, 0]}
        radius={radius}
      />

      {/* Conical roof with tiles */}
      <mesh position={[0, height + 1.5, 0]} castShadow>
        <coneGeometry args={[radius + 0.5, 3, 16]} />
        <meshStandardMaterial color="#2a5a4a" roughness={0.75} />
      </mesh>
    </group>
  );
};

/**
 * Ablaq wall section (alternating stone courses)
 * Core defensive wall component
 */
export const AblaqWall: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  orientation: 'north-south' | 'east-west';
  ablaqTexture?: THREE.Texture;
}> = ({ position, width, height, depth, orientation, ablaqTexture }) => {
  const wallArgs: [number, number, number] = orientation === 'north-south'
    ? [depth, height, width]
    : [width, height, depth];

  return (
    <group position={position}>
      {/* Main wall */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={wallArgs} />
        <meshStandardMaterial
          map={ablaqTexture}
          color={ablaqTexture ? '#ffffff' : '#c9b896'}
          roughness={0.92}
        />
      </mesh>

      {/* Crenellations on top */}
      <Crenellations
        position={[0, height + 0.5, 0]}
        length={orientation === 'north-south' ? width : width}
        orientation={orientation}
      />

      {/* Walkway on top of wall */}
      <mesh position={[0, height, 0]} receiveShadow>
        {orientation === 'north-south' ? (
          <boxGeometry args={[depth * 0.7, 0.3, width]} />
        ) : (
          <boxGeometry args={[width, 0.3, depth * 0.7]} />
        )}
        <meshStandardMaterial color="#a89886" roughness={0.95} />
      </mesh>
    </group>
  );
};
