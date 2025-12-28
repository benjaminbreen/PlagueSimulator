import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const Spindle: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  const wheelRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!wheelRef.current) return;
    wheelRef.current.rotation.z = state.clock.elapsedTime * 1.6;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.2, 8]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
      </mesh>
      <mesh ref={wheelRef} position={[0, 0.32, 0]} receiveShadow>
        <torusGeometry args={[0.22, 0.04, 8, 16]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#6a4a32" roughness={0.8} />
      </mesh>
    </group>
  );
};

export const DyeVat: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.2, 0]} receiveShadow>
      <cylinderGeometry args={[0.5, 0.55, 0.4, 12]} />
      <meshStandardMaterial color="#5a4534" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.34, 0]} receiveShadow>
      <circleGeometry args={[0.42, 16]} />
      <meshStandardMaterial color="#3d6d8a" emissive="#24465a" emissiveIntensity={0.5} roughness={0.6} />
    </mesh>
  </group>
);

export const Anvil: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  const ironColor = '#3a3a3a';
  const wornIron = '#4a4a4a';
  const woodBase = '#5a4030';

  return (
    <group position={position} rotation={rotation}>
      {/* Wooden stump base */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.3, 8]} />
        <meshStandardMaterial color={woodBase} roughness={0.92} />
      </mesh>

      {/* Iron base/foot */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 0.1, 0.4]} />
        <meshStandardMaterial color={ironColor} roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Main body (waist) */}
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.42, 0.2, 0.35]} />
        <meshStandardMaterial color={ironColor} roughness={0.55} metalness={0.65} />
      </mesh>

      {/* Face (flat working surface) */}
      <mesh position={[0, 0.68, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.38, 0.12, 0.32]} />
        <meshStandardMaterial color={wornIron} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Horn (tapered cone for curves) */}
      <mesh position={[0.3, 0.7, 0]} rotation={[0, 0, -Math.PI / 6]} receiveShadow castShadow>
        <coneGeometry args={[0.12, 0.4, 8]} />
        <meshStandardMaterial color={wornIron} roughness={0.45} metalness={0.68} />
      </mesh>

      {/* Hardy hole (square hole for tools) - represented as dark inset */}
      <mesh position={[-0.08, 0.75, 0]} receiveShadow>
        <boxGeometry args={[0.06, 0.02, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Pritchel hole (round hole for punching) */}
      <mesh position={[0.05, 0.75, 0.1]} receiveShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Wear marks on face (lighter color from hammer strikes) */}
      <mesh position={[0, 0.745, 0]} receiveShadow>
        <boxGeometry args={[0.25, 0.01, 0.22]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.35} metalness={0.75} />
      </mesh>
    </group>
  );
};

export const ToolRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  const woodColor = '#6b4a32';
  const handleColor = '#6a5a45';
  const metalColor = '#5a5a5a';

  return (
    <group position={position} rotation={rotation}>
      {/* Backing board */}
      <mesh position={[0, 0.9, -0.06]} receiveShadow castShadow>
        <boxGeometry args={[1.4, 1.6, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>

      {/* Mounting pegs */}
      {[[-0.5, 1.2], [-0.2, 0.8], [0.2, 1.0], [0.5, 0.7]].map((pos, idx) => (
        <mesh key={`peg-${idx}`} position={[pos[0], pos[1], 0.02]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.15, 6]} />
          <meshStandardMaterial color={handleColor} roughness={0.88} />
        </mesh>
      ))}

      {/* Hammer 1 (claw hammer) */}
      <group position={[-0.5, 1.0, 0.08]}>
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, 0.1]} receiveShadow>
          <cylinderGeometry args={[0.015, 0.018, 0.35, 6]} />
          <meshStandardMaterial color={handleColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[0.08, 0.12, 0.06]} />
          <meshStandardMaterial color={metalColor} roughness={0.45} metalness={0.7} />
        </mesh>
      </group>

      {/* Hammer 2 (ball-peen) */}
      <group position={[-0.2, 0.6, 0.08]}>
        <mesh position={[0, -0.14, 0]} rotation={[0, 0, -0.15]} receiveShadow>
          <cylinderGeometry args={[0.014, 0.017, 0.32, 6]} />
          <meshStandardMaterial color={handleColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[0.06, 0.1, 0.05]} />
          <meshStandardMaterial color={metalColor} roughness={0.45} metalness={0.7} />
        </mesh>
        <mesh position={[0.05, 0.04, 0]} receiveShadow>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={metalColor} roughness={0.45} metalness={0.7} />
        </mesh>
      </group>

      {/* Chisel 1 */}
      <group position={[0.2, 0.85, 0.08]}>
        <mesh position={[0, -0.12, 0]} rotation={[0, 0, 0.05]} receiveShadow>
          <cylinderGeometry args={[0.01, 0.012, 0.28, 6]} />
          <meshStandardMaterial color={handleColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[0.025, 0.08, 0.015]} />
          <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.75} />
        </mesh>
      </group>

      {/* Saw (small hand saw) */}
      <group position={[0.5, 0.5, 0.08]} rotation={[0, 0, 0.2]}>
        {/* Handle */}
        <mesh position={[0.05, -0.06, 0]} receiveShadow>
          <boxGeometry args={[0.06, 0.12, 0.02]} />
          <meshStandardMaterial color={handleColor} roughness={0.88} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[0.015, 0.24, 0.015]} />
          <meshStandardMaterial color={metalColor} roughness={0.35} metalness={0.8} />
        </mesh>
        {/* Teeth (serrated edge) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={`tooth-${i}`} position={[-0.012, -0.04 + i * 0.04, 0]} receiveShadow>
            <boxGeometry args={[0.008, 0.015, 0.01]} />
            <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Pliers */}
      <group position={[0, 1.2, 0.08]} rotation={[0, 0, -0.3]}>
        <mesh position={[0, -0.08, 0]} receiveShadow>
          <boxGeometry args={[0.02, 0.18, 0.02]} />
          <meshStandardMaterial color={metalColor} roughness={0.5} metalness={0.65} />
        </mesh>
        <mesh position={[0.015, -0.08, 0]} rotation={[0, 0, 0.1]} receiveShadow>
          <boxGeometry args={[0.02, 0.18, 0.02]} />
          <meshStandardMaterial color={metalColor} roughness={0.5} metalness={0.65} />
        </mesh>
        <mesh position={[0.008, 0.05, 0]} receiveShadow>
          <boxGeometry args={[0.04, 0.06, 0.025]} />
          <meshStandardMaterial color={metalColor} roughness={0.5} metalness={0.65} />
        </mesh>
      </group>
    </group>
  );
};

export const Mortar: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.12, 0]} receiveShadow>
      <cylinderGeometry args={[0.16, 0.2, 0.18, 10]} />
      <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
    </mesh>
    <mesh position={[0.12, 0.2, 0]} receiveShadow>
      <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
      <meshStandardMaterial color="#6a4a32" roughness={0.85} />
    </mesh>
  </group>
);

export const HerbRack: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Backing board */}
      <mesh position={[0, 1.0, -0.06]} receiveShadow castShadow>
        <boxGeometry args={[1.8, 1.4, 0.12]} />
        <meshStandardMaterial color="#6b4a32" roughness={0.9} />
      </mesh>

      {/* Horizontal drying rod */}
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
        <meshStandardMaterial color="#5a4030" roughness={0.88} />
      </mesh>

      {/* Hanging herb bundles */}
      {[
        { x: -0.6, herb: '#5a7a3a', stem: '#7a6a4a' },
        { x: -0.25, herb: '#6a8a4a', stem: '#8a7a5a' },
        { x: 0.1, herb: '#4a6a2a', stem: '#6a5a3a' },
        { x: 0.45, herb: '#7a9a5a', stem: '#9a8a6a' },
        { x: 0.75, herb: '#5a8a3a', stem: '#7a6a4a' }
      ].map((bundle, idx) => (
        <group key={`bundle-${idx}`} position={[bundle.x, 1.25, 0.08]}>
          {/* String/twine */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 4]} />
            <meshStandardMaterial color="#9a8a6a" roughness={0.9} />
          </mesh>
          {/* Stems */}
          <mesh position={[0, -0.08, 0]} receiveShadow>
            <cylinderGeometry args={[0.015, 0.02, 0.16, 5]} />
            <meshStandardMaterial color={bundle.stem} roughness={0.88} />
          </mesh>
          {/* Leafy top */}
          <mesh position={[0, -0.18, 0]} receiveShadow>
            <sphereGeometry args={[0.055, 6, 5]} />
            <meshStandardMaterial color={bundle.herb} roughness={0.85} />
          </mesh>
          {/* Additional leaf clusters */}
          <mesh position={[0.03, -0.16, 0.02]} receiveShadow>
            <sphereGeometry args={[0.035, 6, 5]} />
            <meshStandardMaterial color={bundle.herb} roughness={0.85} />
          </mesh>
          <mesh position={[-0.025, -0.2, -0.015]} receiveShadow>
            <sphereGeometry args={[0.03, 6, 5]} />
            <meshStandardMaterial color={bundle.herb} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Shelf for jars */}
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.08, 0.25]} />
        <meshStandardMaterial color="#7a5a40" roughness={0.88} />
      </mesh>

      {/* Small herb jars on shelf */}
      {[-0.5, 0, 0.5].map((x, idx) => (
        <group key={`jar-${idx}`} position={[x, 0.6, 0.05]}>
          <mesh receiveShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.14, 8]} />
            <meshStandardMaterial color="#b08a60" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.09, 0]} receiveShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.02, 8]} />
            <meshStandardMaterial color="#8a6a45" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Medicine Shelf - Wide shelf with 14th century albarelli (drug jars) and apothecary vessels
export const MedicineShelf: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  // Generate consistent jar arrangements
  const jars = [
    // Large albarelli (tall cylindrical jars with waisted middle - characteristic of Islamic pharmacy)
    { x: -2.4, type: 'albarello', color: '#d4c8b0', accent: '#4a6a9a', height: 0.28 },
    { x: -1.9, type: 'albarello', color: '#c8bca4', accent: '#6a4a5a', height: 0.32 },
    { x: -1.4, type: 'albarello', color: '#e0d4bc', accent: '#3a5a7a', height: 0.26 },
    // Small round jars with lids
    { x: -0.9, type: 'round', color: '#b8a88c', accent: '#5a7a6a', height: 0.16 },
    { x: -0.55, type: 'round', color: '#c4b498', accent: '#7a5a4a', height: 0.14 },
    // More albarelli
    { x: -0.1, type: 'albarello', color: '#d8ccb4', accent: '#5a4a7a', height: 0.30 },
    { x: 0.4, type: 'albarello', color: '#ccc0a8', accent: '#4a7a6a', height: 0.28 },
    // Amphora-style bottles
    { x: 0.9, type: 'amphora', color: '#b4a890', accent: '#6a5a4a', height: 0.22 },
    { x: 1.3, type: 'amphora', color: '#c0b49c', accent: '#5a6a7a', height: 0.24 },
    // More albarelli
    { x: 1.8, type: 'albarello', color: '#d0c4ac', accent: '#7a4a5a', height: 0.26 },
    { x: 2.3, type: 'albarello', color: '#c8bcb0', accent: '#4a5a8a', height: 0.30 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* Backing board - wide wooden panel */}
      <mesh position={[0, 1.1, -0.08]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 1.8, 0.1]} />
        <meshStandardMaterial color="#5a4030" roughness={0.92} />
      </mesh>

      {/* Decorative frame around backing */}
      {/* Top molding */}
      <mesh position={[0, 2.02, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.08, 0.15]} />
        <meshStandardMaterial color="#4a3525" roughness={0.88} />
      </mesh>
      {/* Bottom molding */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.08, 0.15]} />
        <meshStandardMaterial color="#4a3525" roughness={0.88} />
      </mesh>

      {/* Upper shelf */}
      <mesh position={[0, 1.5, 0.08]} receiveShadow>
        <boxGeometry args={[5.0, 0.06, 0.28]} />
        <meshStandardMaterial color="#6a5040" roughness={0.88} />
      </mesh>

      {/* Lower shelf */}
      <mesh position={[0, 0.8, 0.08]} receiveShadow>
        <boxGeometry args={[5.0, 0.06, 0.28]} />
        <meshStandardMaterial color="#6a5040" roughness={0.88} />
      </mesh>

      {/* Drug jars on upper shelf */}
      {jars.slice(0, 6).map((jar, idx) => (
        <group key={`upper-${idx}`} position={[jar.x, 1.53, 0.05]}>
          {jar.type === 'albarello' && (
            <>
              {/* Albarello - characteristic waisted cylindrical form */}
              <mesh position={[0, jar.height / 2, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.07, 0.08, jar.height * 0.4, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Waisted middle section */}
              <mesh position={[0, jar.height * 0.55, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.055, 0.07, jar.height * 0.35, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Upper section */}
              <mesh position={[0, jar.height * 0.85, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.065, 0.055, jar.height * 0.25, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Decorative band - blue or colored glaze typical of Islamic pottery */}
              <mesh position={[0, jar.height * 0.5, 0]} receiveShadow>
                <cylinderGeometry args={[0.058, 0.058, 0.025, 12]} />
                <meshStandardMaterial color={jar.accent} roughness={0.4} />
              </mesh>
              {/* Lid */}
              <mesh position={[0, jar.height + 0.02, 0]} receiveShadow>
                <cylinderGeometry args={[0.045, 0.06, 0.04, 8]} />
                <meshStandardMaterial color="#8a7a60" roughness={0.85} />
              </mesh>
            </>
          )}
          {jar.type === 'round' && (
            <>
              {/* Round squat jar */}
              <mesh position={[0, jar.height / 2, 0]} receiveShadow castShadow>
                <sphereGeometry args={[jar.height * 0.55, 10, 8]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Neck */}
              <mesh position={[0, jar.height * 0.8, 0]} receiveShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.04, 8]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Cork stopper */}
              <mesh position={[0, jar.height * 0.95, 0]} receiveShadow>
                <cylinderGeometry args={[0.03, 0.035, 0.03, 6]} />
                <meshStandardMaterial color="#9a8060" roughness={0.9} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Drug jars on lower shelf */}
      {jars.slice(6).map((jar, idx) => (
        <group key={`lower-${idx}`} position={[jar.x, 0.83, 0.05]}>
          {jar.type === 'albarello' && (
            <>
              <mesh position={[0, jar.height / 2, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.07, 0.08, jar.height * 0.4, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              <mesh position={[0, jar.height * 0.55, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.055, 0.07, jar.height * 0.35, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              <mesh position={[0, jar.height * 0.85, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.065, 0.055, jar.height * 0.25, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              <mesh position={[0, jar.height * 0.5, 0]} receiveShadow>
                <cylinderGeometry args={[0.058, 0.058, 0.025, 12]} />
                <meshStandardMaterial color={jar.accent} roughness={0.4} />
              </mesh>
              <mesh position={[0, jar.height + 0.02, 0]} receiveShadow>
                <cylinderGeometry args={[0.045, 0.06, 0.04, 8]} />
                <meshStandardMaterial color="#8a7a60" roughness={0.85} />
              </mesh>
            </>
          )}
          {jar.type === 'amphora' && (
            <>
              {/* Amphora-style bottle with handles */}
              <mesh position={[0, jar.height * 0.35, 0]} receiveShadow castShadow>
                <sphereGeometry args={[0.06, 10, 8]} />
                <meshStandardMaterial color={jar.color} roughness={0.65} />
              </mesh>
              {/* Neck */}
              <mesh position={[0, jar.height * 0.7, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.025, 0.04, jar.height * 0.45, 8]} />
                <meshStandardMaterial color={jar.color} roughness={0.65} />
              </mesh>
              {/* Rim */}
              <mesh position={[0, jar.height * 0.92, 0]} receiveShadow>
                <torusGeometry args={[0.03, 0.008, 6, 12]} />
                <meshStandardMaterial color={jar.color} roughness={0.6} />
              </mesh>
              {/* Small handles */}
              <mesh position={[0.045, jar.height * 0.55, 0]} rotation={[0, 0, Math.PI / 6]} receiveShadow>
                <torusGeometry args={[0.018, 0.006, 4, 8, Math.PI]} />
                <meshStandardMaterial color={jar.color} roughness={0.7} />
              </mesh>
              <mesh position={[-0.045, jar.height * 0.55, 0]} rotation={[0, 0, -Math.PI / 6]} receiveShadow>
                <torusGeometry args={[0.018, 0.006, 4, 8, Math.PI]} />
                <meshStandardMaterial color={jar.color} roughness={0.7} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Small labels/tags hanging from shelf edge */}
      {[-2.0, -0.5, 1.0, 2.2].map((x, idx) => (
        <group key={`tag-${idx}`} position={[x, 0.75, 0.2]}>
          <mesh receiveShadow>
            <boxGeometry args={[0.12, 0.08, 0.005]} />
            <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
          </mesh>
          {/* String */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.003, 0.003, 0.06, 4]} />
            <meshStandardMaterial color="#8a7a5a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
