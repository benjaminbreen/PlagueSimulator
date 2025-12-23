/**
 * Hover System Components
 * Interactive hover effects with wireframes, labels, and fade animations
 */

import React, { useMemo, useRef, useEffect, useState, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { HOVER_WIREFRAME_COLORS } from '../constants';

// ==================== CONTEXTS ====================

export const HoverWireframeContext = React.createContext(false);
export const HoverLabelContext = React.createContext(false);

// ==================== HOOKS ====================

/**
 * Hook to fade object opacity when hovered
 * Stores original material properties and restores them when inactive
 */
export const useHoverFade = (ref: React.RefObject<THREE.Object3D>, active: boolean, opacity = 0.35) => {
  const originals = useRef(new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!originals.current.has(mat)) {
          originals.current.set(mat, {
            opacity: mat.opacity ?? 1,
            transparent: mat.transparent ?? false,
            depthWrite: mat.depthWrite ?? true
          });
        }
        if (active) {
          mat.transparent = true;
          mat.opacity = Math.min(mat.opacity ?? 1, opacity);
          mat.depthWrite = false;
          mat.needsUpdate = true;
        } else {
          const original = originals.current.get(mat);
          if (original) {
            mat.opacity = original.opacity;
            mat.transparent = original.transparent;
            mat.depthWrite = original.depthWrite;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [active, opacity, ref]);
};

// ==================== COMPONENTS ====================

/**
 * Renders a wireframe box outline
 */
export const HoverOutlineBox: React.FC<{
  size: [number, number, number];
  color: string;
  opacity?: number;
  position?: [number, number, number]
}> = ({ size, color, opacity = 0.85, position }) => {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), [size[0], size[1], size[2]]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  return <lineSegments geometry={geometry} material={material} position={position} />;
};

/**
 * Renders an HTML label with title and description lines
 */
export const HoverLabel: React.FC<{
  title: string;
  lines?: string[];
  offset?: [number, number, number]
}> = ({ title, lines = [], offset = [0, 1.4, 0] }) => (
  <Html position={offset} center>
    <div className="pointer-events-none rounded-lg border border-amber-700/40 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="text-[11px] text-amber-400">{title}</div>
      {lines.length > 0 && (
        <div className="mt-1 space-y-0.5 text-[9px] text-amber-200/70">
          {lines.slice(0, 4).map((line, index) => (
            <div key={`${title}-line-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  </Html>
);

/**
 * Main hoverable group component
 * Wraps children with hover detection, wireframe overlay, and label display
 */
export const HoverableGroup: React.FC<{
  position?: [number, number, number];
  positionVector?: THREE.Vector3;
  boxSize: [number, number, number];
  boxOffset?: [number, number, number];
  color?: string;
  labelTitle?: string;
  labelLines?: string[];
  labelOffset?: [number, number, number];
  children: React.ReactNode;
}> = ({ position, positionVector, boxSize, boxOffset, color = HOVER_WIREFRAME_COLORS.default, labelTitle, labelLines, labelOffset, children }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  useHoverFade(groupRef, wireframeEnabled && hovered);

  useFrame(() => {
    if (positionVector && groupRef.current) {
      groupRef.current.position.copy(positionVector);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {children}
      {labelEnabled && hovered && labelTitle && <HoverLabel title={labelTitle} lines={labelLines} offset={labelOffset} />}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={boxSize} color={color} position={boxOffset} />
          <HoverOutlineBox size={[boxSize[0] * 1.04, boxSize[1] * 1.04, boxSize[2] * 1.04]} color={color} opacity={0.35} position={boxOffset} />
        </>
      )}
    </group>
  );
};
