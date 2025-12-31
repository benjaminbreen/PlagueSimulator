import React from 'react';
import * as THREE from 'three';

type BuildingDoorProps = {
  doorPos: [number, number, number];
  doorRotation: number;
  doorScale: number;
  doorStyle: string;
  woodTexture?: THREE.Texture | null;
  activeGlow: boolean;
};

export const BuildingDoor: React.FC<BuildingDoorProps> = ({
  doorPos,
  doorRotation,
  doorScale,
  doorStyle,
  woodTexture,
  activeGlow
}) => (
  <group position={doorPos} rotation={[0, doorRotation, 0]} scale={[doorScale, doorScale, 1]}>
    {/* Door threshold/step */}
    <mesh position={[0, -1.35, 0.25]} receiveShadow>
      <boxGeometry args={[2.8, 0.2, 0.6]} />
      <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
    </mesh>

    {/* PLANK DOOR - Simple rough planks for poor areas */}
    {doorStyle === 'plank' && (
      <group>
        {/* Rough plank door with visible gaps */}
        <mesh castShadow>
          <boxGeometry args={[2.2, 2.4, 0.15]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#5a4535"
            roughness={0.95}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.2 : 0}
          />
        </mesh>
        {/* Vertical plank lines */}
        {[-0.7, 0, 0.7].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.08]}>
            <boxGeometry args={[0.04, 2.3, 0.02]} />
            <meshStandardMaterial color="#2a1a10" roughness={1} />
          </mesh>
        ))}
        {/* Iron strap hinges */}
        <mesh position={[-0.95, 0.7, 0.1]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.03]} />
          <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[-0.95, -0.5, 0.1]} castShadow>
          <boxGeometry args={[0.35, 0.08, 0.03]} />
          <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.3} />
        </mesh>
      </group>
    )}

    {/* PANELED DOOR - Standard residential with recessed panels */}
    {doorStyle === 'paneled' && (
      <group>
        {/* Door frame */}
        <mesh castShadow>
          <boxGeometry args={[2.4, 2.5, 0.18]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#4a3828"
            roughness={0.85}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.25 : 0}
          />
        </mesh>
        {/* Recessed panels (2x2 grid) */}
        {[[-0.45, 0.5], [0.45, 0.5], [-0.45, -0.5], [0.45, -0.5]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.1]} castShadow>
            <boxGeometry args={[0.7, 0.8, 0.06]} />
            <meshStandardMaterial map={woodTexture ?? undefined} color="#3d2817" roughness={0.9} />
          </mesh>
        ))}
        {/* Simple ring pull */}
        <mesh position={[0.7, 0, 0.12]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.12, 0.025, 8, 16]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>
    )}

    {/* STUDDED DOOR - Heavy door with iron studs for civic/wealthy */}
    {doorStyle === 'studded' && (
      <group>
        {/* Heavy door base */}
        <mesh castShadow>
          <boxGeometry args={[2.6, 2.7, 0.22]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#3d2817"
            roughness={0.8}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.3 : 0}
          />
        </mesh>
        {/* Grid of iron studs */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x) =>
          [-0.9, -0.45, 0, 0.45, 0.9].map((y) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.13]} castShadow>
              <sphereGeometry args={[0.06, 6, 4]} />
              <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.5} />
            </mesh>
          ))
        )}
        {/* Large iron ring pull */}
        <mesh position={[0.85, 0, 0.15]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.18, 0.035, 8, 16]} />
          <meshStandardMaterial color="#5a5045" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Iron plate behind ring */}
        <mesh position={[0.85, 0, 0.12]}>
          <circleGeometry args={[0.12, 8]} />
          <meshStandardMaterial color="#4a4035" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>
    )}

    {/* CARVED DOOR - Ornate geometric patterns for wealthy areas */}
    {doorStyle === 'carved' && (
      <group>
        {/* Door base with carved appearance */}
        <mesh castShadow>
          <boxGeometry args={[2.5, 2.6, 0.2]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#5a4030"
            roughness={0.75}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.35 : 0}
          />
        </mesh>
        {/* Central geometric star pattern (8-pointed) */}
        <mesh position={[0, 0.2, 0.12]} rotation={[0, 0, Math.PI/8]}>
          <circleGeometry args={[0.5, 8]} />
          <meshStandardMaterial color="#4a3525" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.2, 0.14]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.35, 8]} />
          <meshStandardMaterial color="#3d2817" roughness={0.85} />
        </mesh>
        {/* Decorative border frame */}
        <mesh position={[0, 0, 0.11]}>
          <boxGeometry args={[2.2, 2.3, 0.04]} />
          <meshStandardMaterial color="#4a3525" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.115]}>
          <boxGeometry args={[2.0, 2.1, 0.04]} />
          <meshStandardMaterial map={woodTexture ?? undefined} color="#3d2817" roughness={0.8} />
        </mesh>
        {/* Brass door knocker (hand shape) */}
        <mesh position={[0, 0.8, 0.15]}>
          <boxGeometry args={[0.15, 0.25, 0.04]} />
          <meshStandardMaterial color="#b8954a" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    )}

    {/* ARCHED DOOR - Pointed Islamic arch for religious buildings */}
    {doorStyle === 'arched' && (
      <group>
        {/* Main door body */}
        <mesh castShadow>
          <boxGeometry args={[2.4, 2.2, 0.2]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#3d2817"
            roughness={0.8}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.3 : 0}
          />
        </mesh>
        {/* Pointed arch top */}
        <mesh position={[0, 1.15, 0.1]}>
          <circleGeometry args={[1.2, 16, 0, Math.PI]} />
          <meshStandardMaterial map={woodTexture ?? undefined} color="#3d2817" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
        {/* Stone arch frame */}
        <mesh position={[0, 1.25, -0.02]} castShadow>
          <circleGeometry args={[1.4, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#c4b196" roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
        {/* Decorative radiating pattern on arch */}
        {[0.2, 0.5, 0.8].map((t, i) => {
          const angle = Math.PI * t;
          const x = Math.cos(angle) * 0.9;
          const y = 1.15 + Math.sin(angle) * 0.9;
          return (
            <mesh key={i} position={[x, y, 0.12]} rotation={[0, 0, angle - Math.PI/2]}>
              <boxGeometry args={[0.08, 0.4, 0.03]} />
              <meshStandardMaterial color="#5a4535" roughness={0.9} />
            </mesh>
          );
        })}
      </group>
    )}

    {/* DOUBLE DOOR - Grand entrance for mosques and large civic buildings */}
    {doorStyle === 'double' && (
      <group>
        {/* Left door */}
        <mesh position={[-0.75, 0, 0]} castShadow>
          <boxGeometry args={[1.3, 2.5, 0.2]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#3d2817"
            roughness={0.8}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.25 : 0}
          />
        </mesh>
        {/* Right door */}
        <mesh position={[0.75, 0, 0]} castShadow>
          <boxGeometry args={[1.3, 2.5, 0.2]} />
          <meshStandardMaterial
            map={woodTexture ?? undefined}
            color="#3d2817"
            roughness={0.8}
            emissive={activeGlow ? "#fbbf24" : "black"}
            emissiveIntensity={activeGlow ? 0.25 : 0}
          />
        </mesh>
        {/* Central seam/meeting rail */}
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[0.08, 2.4, 0.04]} />
          <meshStandardMaterial color="#2a1a10" roughness={0.9} />
        </mesh>
        {/* Decorative panels on each door */}
        {[-0.75, 0.75].map((dx) => (
          <group key={dx}>
            <mesh position={[dx, 0.5, 0.12]} castShadow>
              <boxGeometry args={[0.9, 0.8, 0.05]} />
              <meshStandardMaterial map={woodTexture ?? undefined} color="#4a3525" roughness={0.85} />
            </mesh>
            <mesh position={[dx, -0.5, 0.12]} castShadow>
              <boxGeometry args={[0.9, 0.8, 0.05]} />
              <meshStandardMaterial map={woodTexture ?? undefined} color="#4a3525" roughness={0.85} />
            </mesh>
          </group>
        ))}
        {/* Matching ring pulls on each door */}
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 0, 0.15]} rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[0.12, 0.025, 8, 16]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>
    )}
  </group>
);
