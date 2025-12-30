/**
 * Umayyad Mosque (Great Mosque of Damascus)
 *
 * Historical context: Built 705-715 CE by Caliph al-Walid I on the site of a Christian
 * basilica (which itself was built on a Roman temple to Jupiter). By 1348, it was over
 * 600 years old and the central religious, social, and architectural landmark of Damascus.
 *
 * Features:
 * - Large rectangular courtyard (al-sahn)
 * - Three minarets (we'll show the main southern minaret - "Minaret of Jesus")
 * - Prayer hall with transept and mihrab
 * - Famous mosaics (simplified for performance)
 * - LOD system: detailed when close, simplified from medium distance, minaret-only from far
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

interface UmayyadMosqueProps {
  mapX: number;
  mapY: number;
  playerPosition?: THREE.Vector3;
}

const UmayyadMosque: React.FC<UmayyadMosqueProps> = ({ mapX, mapY, playerPosition }) => {
  const { camera } = useThree();

  // Only show in the UMAYYAD_MOSQUE district (0, 2)
  if (mapX !== 0 || mapY !== 2) return null;

  // Calculate distance for LOD
  const distanceToPlayer = useMemo(() => {
    if (!playerPosition) return 100;
    return playerPosition.distanceTo(new THREE.Vector3(0, 0, 0));
  }, [playerPosition]);

  const lodLevel = useMemo(() => {
    if (distanceToPlayer < 30) return 'close';
    if (distanceToPlayer < 80) return 'medium';
    return 'far';
  }, [distanceToPlayer]);

  return (
    <group position={[0, 0, 0]}>
      {/* LOD: Close detail (< 30 units) */}
      {lodLevel === 'close' && <MosqueDetailed />}

      {/* LOD: Medium detail (30-80 units) */}
      {lodLevel === 'medium' && <MosqueSimplified />}

      {/* LOD: Far detail (> 80 units) - just minaret silhouette */}
      {lodLevel === 'far' && <MosqueFarSilhouette />}
    </group>
  );
};

// Close-range detailed mosque
const MosqueDetailed: React.FC = () => {
  return (
    <group>
      {/* Courtyard floor */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[40, 0.1, 35]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Courtyard colonnade (simplified - just a few pillars) */}
      {[-15, -5, 5, 15].map((x) => (
        <group key={`col-north-${x}`}>
          <mesh position={[x, 3, -16]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 6, 8]} />
            <meshStandardMaterial color="#c8b898" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Ablution fountain (central courtyard feature) */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 2, 16]} />
        <meshStandardMaterial color="#9a8a7a" roughness={0.95} />
      </mesh>
      {/* Water in fountain */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[2.8, 2.8, 0.2, 16]} />
        <meshStandardMaterial color="#4a6a7a" roughness={0.3} transparent opacity={0.7} />
      </mesh>

      {/* Prayer hall (large rectangular building on south side) */}
      <mesh position={[0, 6, 20]} castShadow receiveShadow>
        <boxGeometry args={[45, 12, 15]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>

      {/* Prayer hall entrance arches (simplified) */}
      {[-12, 0, 12].map((x) => (
        <mesh key={`arch-${x}`} position={[x, 5, 13]}>
          <boxGeometry args={[3, 8, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
        </mesh>
      ))}

      {/* Main minaret (Minaret of Jesus - southern) */}
      <Minaret height={25} position={[18, 0, 20]} />
    </group>
  );
};

// Medium-range simplified mosque
const MosqueSimplified: React.FC = () => {
  return (
    <group>
      {/* Courtyard as single plane */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[40, 0.1, 35]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Prayer hall (simplified box) */}
      <mesh position={[0, 6, 20]} castShadow>
        <boxGeometry args={[45, 12, 15]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>

      {/* Minaret (visible landmark) */}
      <Minaret height={25} position={[18, 0, 20]} />
    </group>
  );
};

// Far-range silhouette - just minaret
const MosqueFarSilhouette: React.FC = () => {
  return (
    <group>
      {/* Simplified prayer hall (low poly) */}
      <mesh position={[0, 4, 20]}>
        <boxGeometry args={[30, 8, 10]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.95} />
      </mesh>

      {/* Minaret (main landmark) */}
      <Minaret height={25} position={[18, 0, 20]} simplified />
    </group>
  );
};

// Minaret component (reusable)
const Minaret: React.FC<{
  height: number;
  position: [number, number, number];
  simplified?: boolean;
}> = ({ height, position, simplified = false }) => {
  return (
    <group position={position}>
      {/* Square base */}
      <mesh position={[0, height * 0.15, 0]} castShadow>
        <boxGeometry args={[3, height * 0.3, 3]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Octagonal shaft */}
      <mesh position={[0, height * 0.5, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.5, height * 0.6, 8]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>

      {!simplified && (
        <>
          {/* Balcony (muezzin platform) */}
          <mesh position={[0, height * 0.8, 0]} castShadow>
            <cylinderGeometry args={[2, 1.8, 1, 8]} />
            <meshStandardMaterial color="#c8b898" roughness={0.9} />
          </mesh>

          {/* Upper section */}
          <mesh position={[0, height * 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.8, 1.2, height * 0.2, 8]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* Dome cap */}
      <mesh position={[0, height, 0]} castShadow>
        <sphereGeometry args={[1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a7a6a" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Crescent finial on top */}
      <mesh position={[0, height + 1, 0]} castShadow>
        <torusGeometry args={[0.3, 0.08, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
};

export default UmayyadMosque;
