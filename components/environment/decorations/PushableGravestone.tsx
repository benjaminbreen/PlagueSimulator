/**
 * Pushable Gravestone Component
 * 14th century Islamic gravestones that can be knocked over with physics
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PushableObject } from '../../../utils/pushables';
import { HoverableGroup } from '../shared/HoverSystem';

// Create arch top geometry (mihrab-inspired)
const createArchTopGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const width = 0.35;
  const height = 0.8;
  const archRadius = width / 2;

  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2 - archRadius);
  shape.absarc(0, height / 2 - archRadius, archRadius, 0, Math.PI, false);
  shape.lineTo(-width / 2, -height / 2);

  const extrudeSettings = {
    depth: 0.08,
    bevelEnabled: false
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

// Create peaked top geometry (triangular point)
const createPeakedTopGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const width = 0.38;
  const height = 0.85;
  const peakHeight = 0.15;

  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2 - peakHeight);
  shape.lineTo(0, height / 2);
  shape.lineTo(-width / 2, height / 2 - peakHeight);
  shape.lineTo(-width / 2, -height / 2);

  const extrudeSettings = {
    depth: 0.09,
    bevelEnabled: false
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

export const PushableGravestone: React.FC<{ item: PushableObject }> = ({ item }) => {
  const scale = item.graveScale ?? 1.0;
  const shape = item.graveShape ?? 'rectangular';
  const graveType = item.graveType ?? 'flat';

  // Tipping physics - gravestones tip over on X axis when knocked
  const tippedRotation = item.tippedRotation ?? 0;
  const isTipped = item.isTipped ?? false;

  // Wobble physics - gravestones wobble when bumped (if not tipped)
  const wobbleAngle = item.wobbleAngle ?? 0;

  // Epitaph for hover display
  const epitaph = item.graveEpitaph;

  // Memoized custom geometries
  const archTopGeometry = useMemo(() => createArchTopGeometry(), []);
  const peakedTopGeometry = useMemo(() => createPeakedTopGeometry(), []);

  // Colors by shape (slightly different for each type)
  const stoneColor = shape === 'rectangular' ? '#7a7a6a'
    : shape === 'arch' ? '#8a8a78'
    : shape === 'peaked' ? '#9a9a88'
    : '#a89888'; // platform

  const roughness = shape === 'rectangular' ? 0.95
    : shape === 'arch' ? 0.92
    : shape === 'peaked' ? 0.90
    : 0.88; // platform

  // Build epitaph display
  const labelTitle = epitaph
    ? `Gravestone of ${epitaph.name}, Aged ${epitaph.age}`
    : 'Gravestone';

  const labelLines: string[] = [];
  if (epitaph?.title) {
    labelLines.push(epitaph.title);
  }
  if (epitaph?.inscription) {
    labelLines.push(`"${epitaph.inscription}"`);
  }
  if (isTipped) {
    labelLines.push('Knocked over');
  } else if (!epitaph) {
    labelLines.push('Stone marker', 'Standing');
  }

  return (
    <HoverableGroup
      position={[item.position.x, item.position.y, item.position.z]}
      positionVector={item.position}
      boxSize={[0.8 * scale, 1.0 * scale, 0.8 * scale]}
      labelTitle={labelTitle}
      labelLines={labelLines}
      labelOffset={[0, 0.5 * scale, 0]}
    >
      <group
        rotation={[isTipped ? tippedRotation : wobbleAngle, item.rotation ?? 0, 0]}
        scale={[scale, scale, scale]}
      >
        {/* Rectangular stele */}
        {shape === 'rectangular' && (
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.95, 0.8, 0.08]} />
            <meshStandardMaterial color={stoneColor} roughness={roughness} />
          </mesh>
        )}

        {/* Arch top stele */}
        {shape === 'arch' && (
          <mesh position={[0, 0.4, 0]} castShadow>
            <primitive object={archTopGeometry.clone()} />
            <meshStandardMaterial color={stoneColor} roughness={roughness} />
          </mesh>
        )}

        {/* Peaked top stele */}
        {shape === 'peaked' && (
          <mesh position={[0, 0.4, 0]} castShadow>
            <primitive object={peakedTopGeometry.clone()} />
            <meshStandardMaterial color={stoneColor} roughness={roughness} />
          </mesh>
        )}

        {/* Platform graves */}
        {shape === 'platform' && (
          <>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.5, 1.2]} />
              <meshStandardMaterial color={stoneColor} roughness={roughness} />
            </mesh>
            {/* Border stones */}
            <mesh position={[0, 0.3, 0.6]} castShadow>
              <boxGeometry args={[1.8, 0.15, 0.08]} />
              <meshStandardMaterial color="#9a8a78" roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.3, -0.6]} castShadow>
              <boxGeometry args={[1.8, 0.15, 0.08]} />
              <meshStandardMaterial color="#9a8a78" roughness={0.92} />
            </mesh>
            <mesh position={[0.9, 0.3, 0]} castShadow>
              <boxGeometry args={[0.08, 0.15, 1.2]} />
              <meshStandardMaterial color="#9a8a78" roughness={0.92} />
            </mesh>
            <mesh position={[-0.9, 0.3, 0]} castShadow>
              <boxGeometry args={[0.08, 0.15, 1.2]} />
              <meshStandardMaterial color="#9a8a78" roughness={0.92} />
            </mesh>
          </>
        )}

        {/* Mound for raised graves */}
        {graveType === 'raised' && !isTipped && (
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.8, 0.9, 0.3, 16]} />
            <meshStandardMaterial color="#6a6a58" roughness={1.0} />
          </mesh>
        )}

        {/* Foot stone for double marker graves */}
        {graveType === 'double_marker' && !isTipped && (
          <mesh position={[0, 0.2, -1.5]} castShadow>
            {shape === 'rectangular' && <boxGeometry args={[0.25, 0.8, 0.08]} />}
            {shape === 'arch' && <primitive object={archTopGeometry.clone().scale(0.9, 0.6, 0.6)} />}
            {shape === 'peaked' && <primitive object={peakedTopGeometry.clone().scale(0.9, 0.6, 0.6)} />}
            <meshStandardMaterial color="#7a7a68" roughness={0.94} />
          </mesh>
        )}
      </group>
    </HoverableGroup>
  );
};
