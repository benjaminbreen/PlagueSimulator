/**
 * Umayyad Mosque (Great Mosque of Damascus)
 *
 * Historical context: Built 705-715 CE by Caliph al-Walid I on the site of a Christian
 * basilica (which itself was built on a Roman temple to Jupiter). By 1348, it was over
 * 600 years old and the central religious, social, and architectural landmark of Damascus.
 *
 * Architectural features (historically accurate):
 * - MASSIVE rectangular courtyard (al-sahn) - 100 x 60 units (2x scale)
 * - Three famous minarets: Minaret of Jesus (SW), Bride Minaret (N), Qaitbay Minaret (N)
 * - Prayer hall (haram) with central transept and dome
 * - Dome of the Treasury (octagonal pavilion with green dome)
 * - Open arcaded porticos on three sides (riwaqs) - walkable
 * - Corner towers and gates (no solid walls - player can walk through)
 * - Famous golden mosaics (simplified for performance)
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface UmayyadMosqueProps {
  mapX: number;
  mapY: number;
  playerPosition?: THREE.Vector3;
}

// Helper: Create Islamic geometric pattern texture
const createIslamicPatternTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Green background
  ctx.fillStyle = '#1a4a2a';
  ctx.fillRect(0, 0, 512, 128);

  // Draw Islamic star pattern
  ctx.strokeStyle = '#d4a830';
  ctx.fillStyle = '#d4a830';
  ctx.lineWidth = 2;

  // Repeating 8-pointed star pattern
  for (let x = 0; x < 512; x += 64) {
    for (let y = 0; y < 128; y += 64) {
      // 8-pointed star
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const radius = i % 2 === 0 ? 20 : 10;
        const px = x + 32 + Math.cos(angle) * radius;
        const py = y + 32 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Interlacing geometric lines
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 12);
      ctx.lineTo(x + 52, y + 52);
      ctx.moveTo(x + 52, y + 12);
      ctx.lineTo(x + 12, y + 52);
      ctx.strokeStyle = '#3a6a4a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#d4a830';
      ctx.lineWidth = 2;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
};

// Helper: Create marble floor texture with veining
const createMarbleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base white/cream marble
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, 512, 512);

  // Add subtle color variation
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 20 + Math.random() * 40;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, `rgba(230, 220, 200, ${0.1 + Math.random() * 0.1})`);
    gradient.addColorStop(1, 'rgba(230, 220, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }

  // Add marble veining
  ctx.strokeStyle = 'rgba(180, 170, 160, 0.3)';
  ctx.lineWidth = 1 + Math.random();
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    for (let j = 0; j < 5; j++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const cpx = Math.random() * 512;
      const cpy = Math.random() * 512;
      ctx.quadraticCurveTo(cpx, cpy, x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 12);
  return texture;
};

// Helper: Create geometric paving pattern
const createGeometricPavingTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Light marble background
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(0, 0, 256, 256);

  // Draw octagonal pattern
  const centerX = 128;
  const centerY = 128;

  // Central octagon
  ctx.fillStyle = '#c8b898';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const x = centerX + Math.cos(angle) * 80;
    const y = centerY + Math.sin(angle) * 80;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a89878';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner star
  ctx.fillStyle = '#d8c8a8';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const radius = i % 2 === 0 ? 50 : 25;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8a888';
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 5);
  return texture;
};

const UmayyadMosque: React.FC<UmayyadMosqueProps> = ({ mapX, mapY, playerPosition }) => {
  // Only show in the UMAYYAD_MOSQUE district (0, 2)
  if (mapX !== 0 || mapY !== 2) return null;

  // Calculate distance for LOD
  const distanceToPlayer = useMemo(() => {
    if (!playerPosition) return 100;
    return playerPosition.distanceTo(new THREE.Vector3(0, 0, 0));
  }, [playerPosition]);

  const lodLevel = useMemo(() => {
    if (distanceToPlayer < 80) return 'close';
    if (distanceToPlayer < 150) return 'medium';
    return 'far';
  }, [distanceToPlayer]);

  return (
    <group position={[0, 0, 0]}>
      {/* LOD: Close detail (< 80 units) */}
      {lodLevel === 'close' && <MosqueDetailed />}

      {/* LOD: Medium detail (80-150 units) */}
      {lodLevel === 'medium' && <MosqueSimplified />}

      {/* LOD: Far detail (> 150 units) - just minaret silhouettes */}
      {lodLevel === 'far' && <MosqueFarSilhouette />}
    </group>
  );
};

// ============================================
// DETAILED CLOSE-RANGE MOSQUE
// ============================================
const MosqueDetailed: React.FC = () => {
  // Create textures (memoized to avoid recreation)
  const marbleTexture = useMemo(() => createMarbleTexture(), []);
  const geometricTexture = useMemo(() => createGeometricPavingTexture(), []);

  return (
    <group>
      {/* ===== CORNER TOWERS (instead of solid walls) ===== */}
      <CornerTowers />

      {/* ===== COURTYARD (AL-SAHN) - DOUBLED SIZE ===== */}
      {/* Main marble courtyard floor with veining */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[100, 0.1, 60]} />
        <meshStandardMaterial
          map={marbleTexture}
          roughness={0.75}
          metalness={0.1}
        />
      </mesh>

      {/* Geometric paving around Dome of Treasury (fountain area) */}
      <mesh position={[-30, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[18, 18, 0.02, 32]} />
        <meshStandardMaterial
          map={geometricTexture}
          roughness={0.7}
        />
      </mesh>

      {/* Geometric paving path to prayer hall */}
      <mesh position={[0, 0.06, 10]} receiveShadow>
        <boxGeometry args={[60, 0.02, 12]} />
        <meshStandardMaterial
          map={geometricTexture}
          roughness={0.7}
        />
      </mesh>

      {/* Geometric paving border strips along edges */}
      {/* North border */}
      <mesh position={[0, 0.06, -28]} receiveShadow>
        <boxGeometry args={[96, 0.02, 4]} />
        <meshStandardMaterial
          map={geometricTexture}
          roughness={0.7}
        />
      </mesh>

      {/* East border */}
      <mesh position={[48, 0.06, 0]} receiveShadow>
        <boxGeometry args={[4, 0.02, 56]} />
        <meshStandardMaterial
          map={geometricTexture}
          roughness={0.7}
        />
      </mesh>

      {/* West border */}
      <mesh position={[-48, 0.06, 0]} receiveShadow>
        <boxGeometry args={[4, 0.02, 56]} />
        <meshStandardMaterial
          map={geometricTexture}
          roughness={0.7}
        />
      </mesh>

      {/* ===== DOME OF THE TREASURY (Western courtyard) - SCALED 2X ===== */}
      <DomeOfTreasury position={[-30, 0, 0]} />

      {/* ===== ABLUTION FOUNTAIN (Central courtyard) ===== */}
      <AblutionFountain position={[15, 0, -5]} />

      {/* ===== COURTYARD FURNISHINGS ===== */}
      {/* Stone benches along porticos */}
      {[-20, -10, 0, 10, 20].map((x) => (
        <mesh key={`bench-n-${x}`} position={[x, 0.3, -24]} receiveShadow castShadow>
          <boxGeometry args={[4, 0.6, 1]} />
          <meshStandardMaterial color="#b8a888" roughness={0.95} />
        </mesh>
      ))}

      {/* Olive trees in large ceramic pots - REALISTIC foliage */}
      {[[-35, 0, -15], [35, 0, -15], [-35, 0, 15], [35, 0, 15]].map(([x, y, z], i) => {
        // Each tree gets unique variation
        const seed = i * 123.456;
        const foliageClusters = [
          // Central clusters
          { pos: [0, 5.5, 0], scale: [1.4, 1.2, 1.3] },
          { pos: [-0.4, 5.8, 0.3], scale: [1.0, 0.9, 1.1] },
          { pos: [0.5, 5.3, -0.4], scale: [1.2, 1.0, 1.0] },
          { pos: [-0.3, 5.1, -0.5], scale: [0.9, 0.8, 0.9] },
          { pos: [0.4, 5.9, 0.5], scale: [1.1, 1.0, 1.2] },
          // Outer clusters for irregular shape
          { pos: [-0.9, 5.6, 0.1], scale: [0.8, 0.7, 0.8] },
          { pos: [0.8, 5.4, 0.2], scale: [0.85, 0.75, 0.8] },
          { pos: [0.2, 5.7, -0.9], scale: [0.7, 0.65, 0.75] },
          { pos: [-0.2, 5.2, 0.9], scale: [0.75, 0.7, 0.8] },
        ];

        return (
          <group key={`tree-${i}`} position={[x, y, z]}>
            {/* Stone platform base */}
            <mesh position={[0, 0.1, 0]} receiveShadow>
              <cylinderGeometry args={[1.8, 2.0, 0.2, 16]} />
              <meshStandardMaterial color="#a89878" roughness={0.95} />
            </mesh>

            {/* REALISTIC CERAMIC POT - Traditional Syrian/Damascus style */}

            {/* Pot base (wider bottom) */}
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.4, 1.6, 0.8, 24]} />
              <meshStandardMaterial color="#b87a4a" roughness={0.7} />
            </mesh>

            {/* Pot lower body (tapered) */}
            <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.3, 1.4, 0.8, 24]} />
              <meshStandardMaterial color="#c88a5a" roughness={0.65} />
            </mesh>

            {/* Pot middle body (widest point) */}
            <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.45, 1.3, 0.6, 24]} />
              <meshStandardMaterial color="#c88a5a" roughness={0.65} />
            </mesh>

            {/* Pot upper body (narrows toward neck) */}
            <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.3, 1.45, 0.4, 24]} />
              <meshStandardMaterial color="#b87a4a" roughness={0.7} />
            </mesh>

            {/* Pot neck (narrow) */}
            <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.25, 1.3, 0.3, 24]} />
              <meshStandardMaterial color="#a86a3a" roughness={0.75} />
            </mesh>

            {/* Pot rim/lip (flared outward) */}
            <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.4, 1.25, 0.2, 24]} />
              <meshStandardMaterial color="#987050" roughness={0.6} />
            </mesh>

            {/* ORNATE DECORATIVE PATTERNS */}

            {/* Upper decorative band - Islamic geometric pattern */}
            <mesh position={[0, 1.9, 0]} castShadow>
              <cylinderGeometry args={[1.46, 1.46, 0.15, 24]} />
              <meshStandardMaterial color="#6a4a2a" roughness={0.85} />
            </mesh>

            {/* Geometric tile inlays on upper band */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => {
              const angle = (j / 8) * Math.PI * 2;
              const px = Math.cos(angle) * 1.48;
              const pz = Math.sin(angle) * 1.48;
              return (
                <group key={`tile-${j}`} position={[px, 1.9, pz]} rotation={[0, -angle, 0]}>
                  {/* Turquoise tile inlay */}
                  <mesh>
                    <boxGeometry args={[0.22, 0.12, 0.03]} />
                    <meshStandardMaterial color="#3a7a8a" roughness={0.4} metalness={0.1} />
                  </mesh>
                  {/* Gold accent border */}
                  <mesh position={[0, 0, -0.02]}>
                    <boxGeometry args={[0.24, 0.14, 0.01]} />
                    <meshStandardMaterial color="#d4a830" roughness={0.3} metalness={0.5} />
                  </mesh>
                </group>
              );
            })}

            {/* Lower decorative band */}
            <mesh position={[0, 0.9, 0]} castShadow>
              <cylinderGeometry args={[1.41, 1.41, 0.12, 24]} />
              <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
            </mesh>

            {/* Carved medallions on lower band */}
            {[0, 1, 2, 3, 4, 5].map((j) => {
              const angle = (j / 6) * Math.PI * 2 + (i * Math.PI / 12); // Offset each pot
              const px = Math.cos(angle) * 1.42;
              const pz = Math.sin(angle) * 1.42;
              return (
                <mesh key={`medallion-${j}`} position={[px, 0.9, pz]} rotation={[0, -angle, 0]} castShadow>
                  <cylinderGeometry args={[0.12, 0.12, 0.02, 8]} />
                  <meshStandardMaterial color="#8a6a4a" roughness={0.75} />
                </mesh>
              );
            })}

            {/* Vertical relief ribs for texture */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((j) => {
              const angle = (j / 12) * Math.PI * 2;
              const px = Math.cos(angle) * 1.31;
              const pz = Math.sin(angle) * 1.31;
              return (
                <mesh key={`rib-${j}`} position={[px, 1.6, pz]} rotation={[0, -angle, 0]} castShadow>
                  <boxGeometry args={[0.04, 0.5, 0.02]} />
                  <meshStandardMaterial color="#a87a5a" roughness={0.8} />
                </mesh>
              );
            })}

            {/* Terracotta weathering/aging (darker patches) */}
            <mesh position={[0, 0.6, 0]} receiveShadow>
              <cylinderGeometry args={[1.5, 1.55, 0.2, 16]} />
              <meshStandardMaterial color="#8a5a3a" roughness={0.95} transparent opacity={0.6} />
            </mesh>

            {/* Soil at top of pot */}
            <mesh position={[0, 2.55, 0]} receiveShadow>
              <cylinderGeometry args={[1.35, 1.35, 0.1, 16]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.98} />
            </mesh>

            {/* Olive tree trunk - gnarled and twisted */}
            <mesh position={[0, 3.5, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, 3, 8]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
            </mesh>
            {/* Trunk texture (bark ridges) */}
            <mesh position={[0, 3.2, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 0.4, 8]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.98} />
            </mesh>
            <mesh position={[0, 4.5, 0]} castShadow>
              <cylinderGeometry args={[0.23, 0.23, 0.4, 8]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.98} />
            </mesh>

            {/* Main branches */}
            <mesh position={[-0.4, 5.0, 0.2]} rotation={[0, 0, Math.PI / 6]} castShadow>
              <cylinderGeometry args={[0.12, 0.15, 1.2, 6]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
            </mesh>
            <mesh position={[0.5, 5.1, -0.3]} rotation={[0, 0, -Math.PI / 5]} castShadow>
              <cylinderGeometry args={[0.12, 0.15, 1.0, 6]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
            </mesh>
            <mesh position={[0.1, 5.2, 0.5]} rotation={[Math.PI / 5, 0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.13, 0.9, 6]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
            </mesh>

            {/* REALISTIC FOLIAGE - Multiple irregular clusters */}
            {/* Silvery-green olive foliage with natural variation */}
            {foliageClusters.map((cluster, j) => (
              <mesh
                key={`foliage-${j}`}
                position={cluster.pos as [number, number, number]}
                scale={cluster.scale as [number, number, number]}
                castShadow
              >
                <sphereGeometry args={[1.0, 8, 7]} />
                <meshStandardMaterial
                  color={j % 3 === 0 ? '#6a8a5a' : j % 3 === 1 ? '#5a7a4a' : '#6a7a5a'}
                  roughness={0.92}
                />
              </mesh>
            ))}

            {/* Add some smaller leaf clusters for detail */}
            {[
              [-1.2, 5.5, 0.3],
              [1.1, 5.6, -0.2],
              [0.3, 6.2, 0.6],
              [-0.4, 6.0, -0.7],
            ].map(([px, py, pz], j) => (
              <mesh key={`leaf-${j}`} position={[px, py, pz]} castShadow>
                <sphereGeometry args={[0.4, 6, 5]} />
                <meshStandardMaterial color="#7a8a6a" roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Water channels (shallow decorative channels) */}
      <mesh position={[-30, 0.02, 12]} receiveShadow>
        <boxGeometry args={[2, 0.05, 24]} />
        <meshStandardMaterial color="#4a6a7a" roughness={0.3} transparent opacity={0.7} />
      </mesh>
      <mesh position={[-30, 0.02, -12]} receiveShadow>
        <boxGeometry args={[2, 0.05, 24]} />
        <meshStandardMaterial color="#4a6a7a" roughness={0.3} transparent opacity={0.7} />
      </mesh>

      {/* ===== ARCADED PORTICOS (RIWAQS) - OPEN COLONNADES ===== */}
      {/* North portico */}
      <ArcadedPortico
        position={[0, 0, -26]}
        columnCount={16}
        length={96}
        orientation="horizontal"
      />

      {/* East portico */}
      <ArcadedPortico
        position={[46, 0, 0]}
        columnCount={10}
        length={56}
        orientation="vertical"
      />

      {/* West portico */}
      <ArcadedPortico
        position={[-46, 0, 0]}
        columnCount={10}
        length={56}
        orientation="vertical"
      />

      {/* ===== PRAYER HALL (HARAM) - South side - SCALED 2X ===== */}
      <PrayerHall />

      {/* ===== THREE MINARETS - SCALED 2X ===== */}
      {/* Minaret of Jesus (southwest corner) - tallest, square base */}
      <MinaretOfJesus position={[-40, 0, 34]} height={70} />

      {/* Bride Minaret (north, center-west) - octagonal, white */}
      <BrideMinaret position={[-16, 0, -28]} height={64} />

      {/* Qaitbay Minaret (north, center-east) */}
      <QaitbayMinaret position={[16, 0, -28]} height={60} />

      {/* ===== ENTRANCE GATES ===== */}
      {/* Main northern gate (Bab al-Nasr) */}
      <OrnateGate position={[0, 0, -30]} rotation={[0, 0, 0]} />

      {/* Eastern gate (Bab Jayrun) */}
      <OrnateGate position={[50, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* Western gate */}
      <OrnateGate position={[-50, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
};

// ============================================
// CORNER TOWERS (Open boundaries, no solid walls)
// ============================================
const CornerTowers: React.FC = () => {
  const towerHeight = 12;

  return (
    <group>
      {/* Northwest corner tower */}
      <mesh position={[-50, towerHeight / 2, -30]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3, towerHeight, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[-50, towerHeight + 1, -30]} castShadow>
        <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>

      {/* Northeast corner tower */}
      <mesh position={[50, towerHeight / 2, -30]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3, towerHeight, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[50, towerHeight + 1, -30]} castShadow>
        <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>

      {/* Southwest corner tower */}
      <mesh position={[-50, towerHeight / 2, 30]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3, towerHeight, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[-50, towerHeight + 1, 30]} castShadow>
        <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>

      {/* Southeast corner tower */}
      <mesh position={[50, towerHeight / 2, 30]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3, towerHeight, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[50, towerHeight + 1, 30]} castShadow>
        <sphereGeometry args={[2.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#a89878" roughness={0.9} />
      </mesh>

      {/* Low decorative wall segments between gates (not blocking) */}
      {/* North wall segments */}
      <mesh position={[-25, 1.5, -30.5]} receiveShadow>
        <boxGeometry args={[40, 3, 1]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[25, 1.5, -30.5]} receiveShadow>
        <boxGeometry args={[40, 3, 1]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>

      {/* South wall segments */}
      <mesh position={[-25, 1.5, 36]} receiveShadow>
        <boxGeometry args={[40, 3, 1]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[25, 1.5, 36]} receiveShadow>
        <boxGeometry args={[40, 3, 1]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
    </group>
  );
};

// ============================================
// ABLUTION FOUNTAIN (for ritual washing)
// Historically accurate with animated water and lion spouts
// ============================================
const AblutionFountain: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const rippleRef2 = useRef<THREE.Mesh>(null);
  const rippleRef3 = useRef<THREE.Mesh>(null);

  // Water spout particle systems (8 spouts)
  const spoutRefs = useRef<(THREE.Points | null)[]>([]);
  const splashRefs = useRef<(THREE.Points | null)[]>([]);

  // Create water texture
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Water gradient - turquoise/blue
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#4a9aaa');
    gradient.addColorStop(0.5, '#3a8a9a');
    gradient.addColorStop(1, '#2a7a8a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Ripple patterns
    for (let r = 0; r < 5; r++) {
      const radius = 25 + r * 40;
      ctx.beginPath();
      ctx.arc(128, 128, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 220, 240, ${0.25 - r * 0.04})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Create particle geometries for each spout
  const spoutGeometries = useMemo(() => {
    return Array.from({ length: 8 }).map(() => {
      const count = 20;
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geometry;
    });
  }, []);

  const splashGeometries = useMemo(() => {
    return Array.from({ length: 8 }).map(() => {
      const count = 12;
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geometry;
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Animate water surface
    if (waterRef.current && waterTexture) {
      waterTexture.rotation = t * 0.03;
      waterTexture.offset.set(Math.sin(t * 0.2) * 0.03, Math.cos(t * 0.18) * 0.03);
      waterRef.current.position.y = 0.62 + Math.sin(t * 1.8) * 0.008;
    }

    // Animate ripples
    if (rippleRef.current) {
      const scale = 1 + (Math.sin(t * 1.5) + 1) * 0.02;
      rippleRef.current.scale.set(scale, scale, 1);
      (rippleRef.current.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(t * 1.5 + 0.3) * 0.1;
    }
    if (rippleRef2.current) {
      const scale = 1 + (Math.sin(t * 1.2 + 1.0) + 1) * 0.025;
      rippleRef2.current.scale.set(scale, scale, 1);
      (rippleRef2.current.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 1.2 + 1.3) * 0.08;
    }
    if (rippleRef3.current) {
      const scale = 1 + (Math.sin(t * 1.0 + 2.0) + 1) * 0.03;
      rippleRef3.current.scale.set(scale, scale, 1);
      (rippleRef3.current.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(t * 1.0 + 2.2) * 0.06;
    }

    // Animate spout particles (in LOCAL space - lions face inward)
    spoutRefs.current.forEach((spoutRef, spoutIndex) => {
      if (!spoutRef) return;
      const geometry = spoutGeometries[spoutIndex];
      const positions = geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const phase = (t * 1.2 + i * 0.15 + spoutIndex * 0.3) % 1.0;

        // Arc from lion mouth (local coords) INWARD toward basin center
        const startY = -0.1; // Mouth height (local)
        const endY = 0.14; // Water surface (local, relative to lion at y=0.5)
        const peakY = 0.2; // Arc peak
        const y = phase < 0.4
          ? startY + (peakY - startY) * (phase / 0.4)
          : peakY - (peakY - endY) * ((phase - 0.4) / 0.6);
        positions.array[ix + 1] = y;

        // Particles flow FORWARD (+Z) in local space since lion now faces inward
        const startZ = 0.35; // Mouth position (local, forward from head)
        const endZ = 3.5; // Flow forward (+Z) = toward basin center
        const progress = phase * 0.8;
        const spread = Math.sin(i * 0.5) * 0.15; // Slight lateral spread

        positions.array[ix] = spread; // X spread
        positions.array[ix + 2] = startZ + (endZ - startZ) * progress; // Z flows forward
      }
      positions.needsUpdate = true;
    });

    // Animate splash particles (in LOCAL space)
    splashRefs.current.forEach((splashRef, spoutIndex) => {
      if (!splashRef) return;
      const geometry = splashGeometries[spoutIndex];
      const positions = geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const phase = (t * 1.8 + i * 0.25 + spoutIndex * 0.4) % 1.0;

        // Splashes radiate outward from impact point in local space
        const impactZ = 3.2; // Where water hits basin (forward in local space)
        const radius = 0.2 + phase * 0.6;
        const particleAngle = (i / positions.count) * Math.PI * 2 + i * 0.5;

        positions.array[ix] = Math.cos(particleAngle) * radius;
        positions.array[ix + 1] = 0.14 + Math.sin(phase * Math.PI) * 0.12;
        positions.array[ix + 2] = impactZ + Math.sin(particleAngle) * radius * 0.3;
      }
      positions.needsUpdate = true;
    });
  });

  return (
    <group position={position}>
      {/* Octagonal basin base */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[4, 4.5, 0.6, 8]} />
        <meshStandardMaterial color="#a89878" roughness={0.95} />
      </mesh>

      {/* ANIMATED WATER in basin */}
      <mesh ref={waterRef} position={[0, 0.62, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow renderOrder={1}>
        <circleGeometry args={[3.8, 32]} />
        <meshStandardMaterial
          map={waterTexture || undefined}
          color="#3a90b0"
          roughness={0.08}
          metalness={0.7}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* Animated ripple rings */}
      <mesh ref={rippleRef} position={[0, 0.64, 0]} rotation={[-Math.PI/2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[0.5, 1.2, 32]} />
        <meshStandardMaterial color="#6ac5e5" transparent opacity={0.4} roughness={0.03} metalness={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={rippleRef2} position={[0, 0.645, 0]} rotation={[-Math.PI/2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[1.5, 2.3, 32]} />
        <meshStandardMaterial color="#5aabcc" transparent opacity={0.35} roughness={0.03} metalness={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={rippleRef3} position={[0, 0.65, 0]} rotation={[-Math.PI/2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[2.5, 3.5, 32]} />
        <meshStandardMaterial color="#4a95b5" transparent opacity={0.3} roughness={0.03} metalness={0.6} depthWrite={false} />
      </mesh>

      {/* Central column pedestal */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1, 2, 12]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Decorative carved band with geometric patterns */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.4, 12]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Upper fountain bowl */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[1.2, 0.8, 1, 12]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Water in upper bowl */}
      <mesh position={[0, 3.3, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshStandardMaterial
          color="#3a90b0"
          roughness={0.1}
          metalness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Small dome top */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <sphereGeometry args={[0.4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6a8a7a" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Eight ornate LION sculptures as water spouts */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 4;
        const z = Math.sin(angle) * 4;
        return (
          <group key={`lion-${i}`} position={[x, 0.5, z]} rotation={[0, angle + Math.PI, 0]}>
            {/* Lion head body */}
            <mesh castShadow>
              <boxGeometry args={[0.45, 0.4, 0.35]} />
              <meshStandardMaterial color="#c8b090" roughness={0.8} />
            </mesh>
            {/* Lion snout/muzzle */}
            <mesh position={[0, -0.05, 0.25]} castShadow>
              <boxGeometry args={[0.3, 0.25, 0.2]} />
              <meshStandardMaterial color="#c8b090" roughness={0.8} />
            </mesh>
            {/* Lion mouth opening (water spout) */}
            <mesh position={[0, -0.1, 0.35]}>
              <cylinderGeometry args={[0.08, 0.06, 0.1, 8]} />
              <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
            </mesh>
            {/* Lion ears (pointed) */}
            <mesh position={[-0.15, 0.22, 0]} castShadow>
              <coneGeometry args={[0.08, 0.15, 4]} />
              <meshStandardMaterial color="#b8a080" roughness={0.85} />
            </mesh>
            <mesh position={[0.15, 0.22, 0]} castShadow>
              <coneGeometry args={[0.08, 0.15, 4]} />
              <meshStandardMaterial color="#b8a080" roughness={0.85} />
            </mesh>
            {/* Lion mane carved decoration */}
            <mesh position={[0, 0, -0.12]} castShadow>
              <sphereGeometry args={[0.28, 8, 8, 0, Math.PI * 2, 0, Math.PI]} />
              <meshStandardMaterial color="#a89070" roughness={0.9} />
            </mesh>
            {/* Decorative carved details (whiskers/patterns) */}
            <mesh position={[-0.12, -0.05, 0.3]}>
              <boxGeometry args={[0.02, 0.02, 0.08]} />
              <meshStandardMaterial color="#8a7060" roughness={0.95} />
            </mesh>
            <mesh position={[0.12, -0.05, 0.3]}>
              <boxGeometry args={[0.02, 0.02, 0.08]} />
              <meshStandardMaterial color="#8a7060" roughness={0.95} />
            </mesh>

            {/* Water spout particles */}
            <points
              ref={(el) => { spoutRefs.current[i] = el; }}
              geometry={spoutGeometries[i]}
            >
              <pointsMaterial color="#b8ddf5" size={0.06} sizeAttenuation transparent opacity={0.85} />
            </points>

            {/* Splash particles */}
            <points
              ref={(el) => { splashRefs.current[i] = el; }}
              geometry={splashGeometries[i]}
            >
              <pointsMaterial color="#d8eeff" size={0.04} sizeAttenuation transparent opacity={0.65} />
            </points>
          </group>
        );
      })}
    </group>
  );
};

// ============================================
// DOME OF THE TREASURY (SCALED 2X)
// ============================================
const DomeOfTreasury: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Octagonal base */}
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[7, 8, 12, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Arched openings (8 sides) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 6.6;
        const z = Math.sin(angle) * 6.6;
        return (
          <mesh key={`arch-${i}`} position={[x, 6, z]} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[3.6, 8, 0.4]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
          </mesh>
        );
      })}

      {/* Octagonal drum - extended higher to properly support dome */}
      <mesh position={[0, 14.5, 0]} castShadow>
        <cylinderGeometry args={[6.5, 7, 5, 8]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Decorative band on drum */}
      <mesh position={[0, 16.5, 0]} castShadow>
        <cylinderGeometry args={[6.7, 6.7, 0.6, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Golden-green dome - sits on top of drum */}
      <mesh position={[0, 18, 0]} castShadow>
        <sphereGeometry args={[7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#6a8a5a"
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Dome finial */}
      <mesh position={[0, 25, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.6, 2, 8]} />
        <meshStandardMaterial color="#8a7a5a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Crescent on top */}
      <mesh position={[0, 26.4, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <torusGeometry args={[0.8, 0.2, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#b8a858" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
};

// ============================================
// ARCADED PORTICO (OPEN - WALKABLE)
// ============================================
const ArcadedPortico: React.FC<{
  position: [number, number, number];
  columnCount: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
}> = ({ position, columnCount, length, orientation }) => {
  const columns: JSX.Element[] = [];
  const spacing = length / (columnCount - 1);

  for (let i = 0; i < columnCount; i++) {
    const offset = -length / 2 + i * spacing;
    const [x, y, z] = position;
    const columnPos: [number, number, number] = orientation === 'horizontal'
      ? [x + offset, y, z]
      : [x, y, z + offset];

    columns.push(
      <group key={`column-${i}`} position={columnPos}>
        {/* Column shaft - taller and thicker */}
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.8, 12, 12]} />
          <meshStandardMaterial color="#c8b898" roughness={0.9} />
        </mesh>

        {/* Capital (decorative top) */}
        <mesh position={[0, 12.4, 0]} castShadow>
          <cylinderGeometry args={[1.2, 0.8, 1, 8]} />
          <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
        </mesh>

        {/* Base */}
        <mesh position={[0, 0.6, 0]} receiveShadow>
          <cylinderGeometry args={[1, 1, 1.2, 12]} />
          <meshStandardMaterial color="#a89878" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {columns}

      {/* Roof structure above columns - just the roof beams, no walls */}
      <mesh
        position={orientation === 'horizontal' ? [position[0], position[1] + 14, position[2]] : [position[0], position[1] + 14, position[2]]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={orientation === 'horizontal' ? [length, 1.2, 8] : [8, 1.2, length]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>

      {/* Arched roof structure */}
      <mesh
        position={orientation === 'horizontal' ? [position[0], position[1] + 15.6, position[2]] : [position[0], position[1] + 15.6, position[2]]}
        castShadow
      >
        <boxGeometry args={orientation === 'horizontal' ? [length, 2.4, 7] : [7, 2.4, length]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ============================================
// PRAYER HALL (HARAM) - SCALED 2X
// ============================================
const PrayerHall: React.FC = () => {
  // Create Islamic pattern texture (memoized to avoid recreation)
  const islamicTexture = useMemo(() => createIslamicPatternTexture(), []);

  return (
    <group>
      {/* Main prayer hall structure */}
      <mesh position={[0, 16, 30]} castShadow receiveShadow>
        <boxGeometry args={[100, 32, 20]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
      </mesh>

      {/* Central transept (raised section) - moved BACK to avoid z-fighting */}
      <mesh position={[0, 22, 33]} castShadow>
        <boxGeometry args={[24, 12, 14]} />
        <meshStandardMaterial color="#e0d8c8" roughness={0.9} />
      </mesh>

      {/* Octagonal drum supporting the mihrab dome */}
      <mesh position={[0, 30, 33]} castShadow>
        <cylinderGeometry args={[11, 12, 4, 8]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Decorative band around drum */}
      <mesh position={[0, 31.5, 33]} castShadow>
        <cylinderGeometry args={[11.2, 11.2, 0.5, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Dome over mihrab */}
      <mesh position={[0, 34, 33]} castShadow>
        <sphereGeometry args={[12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8b898" roughness={0.85} />
      </mesh>

      {/* Mihrab dome finial */}
      <mesh position={[0, 46, 33]} castShadow>
        <sphereGeometry args={[1.6, 8, 8]} />
        <meshStandardMaterial color="#8a7a5a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Decorative mosaic band - with Islamic geometric pattern */}
      <mesh position={[0, 28, 19.0]} castShadow>
        <boxGeometry args={[100, 1.6, 0.3]} />
        <meshStandardMaterial
          map={islamicTexture}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Highly reflective golden mosaic accents - polished gold leaf */}
      {[-40, -20, 0, 20, 40].map((x) => (
        <mesh key={`mosaic-${x}`} position={[x, 28, 18.9]} castShadow>
          <boxGeometry args={[3.5, 1.5, 0.3]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={1.0}
            roughness={0.1}
            emissive="#ffaa00"
            emissiveIntensity={0.3}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}

      {/* Grand entrance arches facing courtyard */}
      {[-36, -24, -12, 0, 12, 24, 36].map((x, idx) => (
        <group key={`entrance-arch-${x}`}>
          {/* Arch opening - recessed into wall */}
          <mesh position={[x, 12, 19.7]} castShadow>
            <boxGeometry args={[7, 20, 0.6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>

          {/* Decorative panel with Islamic pattern */}
          <mesh position={[x, 12, 19.3]} castShadow>
            <boxGeometry args={[7.5, 21, 0.4]} />
            <meshStandardMaterial
              map={islamicTexture}
              roughness={0.6}
              metalness={0.3}
            />
          </mesh>

          {/* Shiny gold arch border - left side */}
          <mesh position={[x - 3.5, 12, 19.25]} castShadow>
            <boxGeometry args={[0.3, 20, 0.5]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1.0}
              roughness={0.15}
              emissive="#ffaa00"
              emissiveIntensity={0.2}
            />
          </mesh>

          {/* Shiny gold arch border - right side */}
          <mesh position={[x + 3.5, 12, 19.25]} castShadow>
            <boxGeometry args={[0.3, 20, 0.5]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1.0}
              roughness={0.15}
              emissive="#ffaa00"
              emissiveIntensity={0.2}
            />
          </mesh>

          {/* Pointed arch top with gold outline */}
          <mesh position={[x, 23, 19.3]} castShadow>
            <cylinderGeometry args={[0, 4.2, 4, 4]} />
            <meshStandardMaterial
              map={islamicTexture}
              roughness={0.6}
              metalness={0.3}
            />
          </mesh>

          {/* Shiny gold arch top border */}
          <mesh position={[x, 23, 19.25]} castShadow>
            <torusGeometry args={[4.0, 0.15, 8, 16, Math.PI]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1.0}
              roughness={0.15}
              emissive="#ffaa00"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Interior columns (visible through arches) */}
      {[-30, -16, 0, 16, 30].map((x) => (
        <mesh key={`interior-col-${x}`} position={[x, 10, 30]} castShadow>
          <cylinderGeometry args={[1, 1.1, 20, 12]} />
          <meshStandardMaterial color="#c8b898" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================
// ORNATE GATES (SCALED 2X) - OPEN ARCHWAYS
// ============================================
const OrnateGate: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Left pillar */}
      <mesh position={[-6, 8, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 16, 1.5]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.9} />
      </mesh>

      {/* Right pillar */}
      <mesh position={[6, 8, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 16, 1.5]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.9} />
      </mesh>

      {/* Arch top spanning the pillars */}
      <mesh position={[0, 17, 0]} castShadow>
        <cylinderGeometry args={[0, 6.4, 4, 4]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.9} />
      </mesh>

      {/* Decorative arch frame - left */}
      <mesh position={[-6, 8, 0.8]} castShadow>
        <boxGeometry args={[1.8, 14, 0.3]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.85} />
      </mesh>

      {/* Decorative arch frame - right */}
      <mesh position={[6, 8, 0.8]} castShadow>
        <boxGeometry args={[1.8, 14, 0.3]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.85} />
      </mesh>

      {/* Top lintel with carved decorations */}
      <mesh position={[0, 16, 0]} castShadow>
        <boxGeometry args={[14, 1.5, 1.2]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ============================================
// MINARET OF JESUS (Southwest) - SCALED 2X
// ============================================
const MinaretOfJesus: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => {
  return (
    <group position={position}>
      {/* Square stone base (Roman-era) */}
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 12, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>

      {/* First tier - square */}
      <mesh position={[0, 18, 0]} castShadow>
        <boxGeometry args={[7, 20, 7]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Decorative band */}
      <mesh position={[0, 29, 0]} castShadow>
        <boxGeometry args={[8, 1.6, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Second tier - octagonal */}
      <mesh position={[0, 40, 0]} castShadow>
        <cylinderGeometry args={[3.6, 4.4, 20, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Muezzin balcony */}
      <mesh position={[0, 51, 0]} castShadow>
        <cylinderGeometry args={[5.6, 5, 3, 8]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Upper tier */}
      <mesh position={[0, 58, 0]} castShadow>
        <cylinderGeometry args={[2.4, 3.2, 10, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Dome cap */}
      <mesh position={[0, height - 4, 0]} castShadow>
        <sphereGeometry args={[3.6, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a7a6a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Finial */}
      <mesh position={[0, height, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
        <meshStandardMaterial color="#8a7a5a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Crescent */}
      <mesh position={[0, height + 2.4, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <torusGeometry args={[0.8, 0.24, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#b8a858" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

// ============================================
// BRIDE MINARET (North) - SCALED 2X
// ============================================
const BrideMinaret: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => {
  return (
    <group position={position}>
      {/* Square base */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 10, 7]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
      </mesh>

      {/* Octagonal shaft (white stone - "Bride" name) */}
      <mesh position={[0, 24, 0]} castShadow>
        <cylinderGeometry args={[3, 4, 32, 8]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.9} />
      </mesh>

      {/* Decorative stone inlay bands */}
      <mesh position={[0, 20, 0]} castShadow>
        <cylinderGeometry args={[4.2, 4.2, 1, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 30, 0]} castShadow>
        <cylinderGeometry args={[3.2, 3.2, 1, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Balcony */}
      <mesh position={[0, 42, 0]} castShadow>
        <cylinderGeometry args={[5, 4, 2.4, 8]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
      </mesh>

      {/* Upper section */}
      <mesh position={[0, 50, 0]} castShadow>
        <cylinderGeometry args={[2, 2.8, 12, 8]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.9} />
      </mesh>

      {/* Dome */}
      <mesh position={[0, height - 4, 0]} castShadow>
        <sphereGeometry args={[3, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6a8a7a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Finial and crescent */}
      <mesh position={[0, height, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.36, 3, 8]} />
        <meshStandardMaterial color="#8a7a5a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, height + 1.8, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <torusGeometry args={[0.7, 0.2, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#b8a858" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

// ============================================
// QAITBAY MINARET (North) - SCALED 2X
// ============================================
const QaitbayMinaret: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => {
  return (
    <group position={position}>
      {/* Square base */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 10, 6]} />
        <meshStandardMaterial color="#c8b898" roughness={0.95} />
      </mesh>

      {/* Octagonal shaft */}
      <mesh position={[0, 22, 0]} castShadow>
        <cylinderGeometry args={[2.8, 3.6, 28, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Decorative molding */}
      <mesh position={[0, 18, 0]} castShadow>
        <cylinderGeometry args={[3.8, 3.8, 1.2, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.85} />
      </mesh>

      {/* Balcony */}
      <mesh position={[0, 38, 0]} castShadow>
        <cylinderGeometry args={[4.4, 3.8, 2, 8]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} />
      </mesh>

      {/* Upper section */}
      <mesh position={[0, 46, 0]} castShadow>
        <cylinderGeometry args={[1.8, 2.6, 12, 8]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
      </mesh>

      {/* Dome */}
      <mesh position={[0, height - 4, 0]} castShadow>
        <sphereGeometry args={[2.8, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a7a6a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Finial and crescent */}
      <mesh position={[0, height - 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2.4, 8]} />
        <meshStandardMaterial color="#8a7a5a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, height + 0.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <torusGeometry args={[0.6, 0.16, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#b8a858" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

// ============================================
// SIMPLIFIED MEDIUM-RANGE VERSION
// ============================================
const MosqueSimplified: React.FC = () => {
  return (
    <group>
      {/* Corner towers simplified */}
      <mesh position={[-50, 6, -30]} castShadow>
        <cylinderGeometry args={[2.5, 3, 12, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[50, 6, -30]} castShadow>
        <cylinderGeometry args={[2.5, 3, 12, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[-50, 6, 30]} castShadow>
        <cylinderGeometry args={[2.5, 3, 12, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      <mesh position={[50, 6, 30]} castShadow>
        <cylinderGeometry args={[2.5, 3, 12, 8]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>

      {/* Courtyard floor */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[100, 0.1, 60]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.85} />
      </mesh>

      {/* Prayer hall */}
      <mesh position={[0, 20, 30]} castShadow>
        <boxGeometry args={[100, 40, 20]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
      </mesh>

      {/* Dome over mihrab */}
      <mesh position={[0, 40, 30]} castShadow>
        <sphereGeometry args={[12, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8b898" roughness={0.85} />
      </mesh>

      {/* Dome of Treasury */}
      <mesh position={[-30, 18, 0]} castShadow>
        <sphereGeometry args={[7, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6a8a5a" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Three minarets */}
      <MinaretOfJesus position={[-40, 0, 34]} height={70} />
      <BrideMinaret position={[-16, 0, -28]} height={64} />
      <QaitbayMinaret position={[16, 0, -28]} height={60} />
    </group>
  );
};

// ============================================
// FAR SILHOUETTE
// ============================================
const MosqueFarSilhouette: React.FC = () => {
  return (
    <group>
      {/* Simple prayer hall block */}
      <mesh position={[0, 16, 30]} castShadow>
        <boxGeometry args={[80, 32, 20]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.95} />
      </mesh>

      {/* Three minaret silhouettes (just shafts and domes) */}
      <group position={[-40, 0, 34]}>
        <mesh position={[0, 30, 0]} castShadow>
          <cylinderGeometry args={[3, 4, 60, 8]} />
          <meshStandardMaterial color="#c8b898" roughness={0.9} />
        </mesh>
        <mesh position={[0, 64, 0]} castShadow>
          <sphereGeometry args={[3.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5a7a6a" roughness={0.6} />
        </mesh>
      </group>

      <group position={[-16, 0, -28]}>
        <mesh position={[0, 28, 0]} castShadow>
          <cylinderGeometry args={[2.6, 3.6, 56, 8]} />
          <meshStandardMaterial color="#f0e8d8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 58, 0]} castShadow>
          <sphereGeometry args={[3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#6a8a7a" roughness={0.6} />
        </mesh>
      </group>

      <group position={[16, 0, -28]}>
        <mesh position={[0, 26, 0]} castShadow>
          <cylinderGeometry args={[2.4, 3.2, 52, 8]} />
          <meshStandardMaterial color="#d8c8a8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 54, 0]} castShadow>
          <sphereGeometry args={[2.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5a7a6a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

export default UmayyadMosque;
