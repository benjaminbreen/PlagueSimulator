import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ItemAppearance } from '../../types';

export interface InventoryItemMeshProps {
  itemId: string;
  name: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare';
  appearance?: ItemAppearance;
}

const getPalette = (rarity: InventoryItemMeshProps['rarity']) => {
  if (rarity === 'rare') {
    return {
      base: '#d8c08b',
      accent: '#8a6a3f',
      metal: '#d7c09a'
    };
  }
  if (rarity === 'uncommon') {
    return {
      base: '#c6c9d4',
      accent: '#8a8e9e',
      metal: '#b8b8b8'
    };
  }
  return {
    base: '#c9b08a',
    accent: '#8a6b4f',
    metal: '#b69c5a'
  };
};

const ItemMaterialSet: React.FC<{ base: string; accent: string; metal: string; children: (mats: { base: THREE.MeshStandardMaterial; accent: THREE.MeshStandardMaterial; metal: THREE.MeshStandardMaterial }) => React.ReactNode }> = ({ base, accent, metal, children }) => {
  const mats = useMemo(() => ({
    base: new THREE.MeshStandardMaterial({ color: base, roughness: 0.7, metalness: 0.1 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, metalness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: metal, roughness: 0.3, metalness: 0.6 })
  }), [base, accent, metal]);

  return <>{children(mats)}</>;
};

export const InventoryItemMesh: React.FC<InventoryItemMeshProps> = ({ itemId, name, category, rarity, appearance }) => {
  const palette = getPalette(rarity);
  const normalizedName = name.toLowerCase();
  const normalizedId = itemId.toLowerCase();
  const categoryName = category.toLowerCase();
  const apparelMats = useMemo(() => {
    if (!appearance) return null;
    const base = appearance.baseColor || palette.base;
    const accent = appearance.accentColor || palette.accent;
    return {
      base: new THREE.MeshStandardMaterial({ color: base, roughness: 0.75, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, metalness: 0.1 })
    };
  }, [appearance, palette.base, palette.accent]);

  return (
    <ItemMaterialSet base={palette.base} accent={palette.accent} metal={palette.metal}>
      {(mats) => {
        if (appearance?.type === 'robe' && apparelMats) {
          const spread = appearance.robeSpread ?? 1;
          return (
            <group>
              <mesh material={apparelMats.base}>
                <cylinderGeometry args={[0.45 * spread, 0.6 * spread, 1.1, 20]} />
              </mesh>
              {appearance.robeOverwrap && (
                <mesh material={apparelMats.accent} position={[0.05, 0.1, 0]} rotation={[0, 0.25, 0]}>
                  <cylinderGeometry args={[0.42 * spread, 0.52 * spread, 1.0, 16]} />
                </mesh>
              )}
              {appearance.robeHasSash && (
                <mesh material={apparelMats.accent} position={[0, -0.15, 0]}>
                  <torusGeometry args={[0.45 * spread, 0.06, 10, 18]} />
                </mesh>
              )}
              {appearance.robeHemBand && (
                <mesh material={apparelMats.accent} position={[0, -0.5, 0]}>
                  <torusGeometry args={[0.56 * spread, 0.04, 10, 18]} />
                </mesh>
              )}
            </group>
          );
        }

        if (appearance?.type === 'headwear' && apparelMats) {
          const style = appearance.headwearStyle ?? 'cap';
          if (style === 'turban') {
            return (
              <group>
                <mesh material={apparelMats.base} position={[0, 0.1, 0]}>
                  <cylinderGeometry args={[0.35, 0.4, 0.25, 16]} />
                </mesh>
                <mesh material={apparelMats.accent} position={[0, 0.2, 0]}>
                  <torusGeometry args={[0.35, 0.07, 10, 16]} />
                </mesh>
                <mesh material={apparelMats.accent} position={[0, 0.3, 0]}>
                  <torusGeometry args={[0.28, 0.06, 10, 16]} />
                </mesh>
              </group>
            );
          }
          if (style === 'fez') {
            return (
              <group>
                <mesh material={apparelMats.base}>
                  <cylinderGeometry args={[0.28, 0.32, 0.45, 14]} />
                </mesh>
                <mesh material={apparelMats.accent} position={[0, 0.28, 0]}>
                  <cylinderGeometry args={[0.2, 0.24, 0.08, 12]} />
                </mesh>
              </group>
            );
          }
          if (style === 'straw') {
            return (
              <group>
                <mesh material={apparelMats.base}>
                  <cylinderGeometry args={[0.3, 0.36, 0.25, 14]} />
                </mesh>
                <mesh material={apparelMats.accent} position={[0, -0.05, 0]}>
                  <cylinderGeometry args={[0.55, 0.55, 0.05, 18]} />
                </mesh>
              </group>
            );
          }
          if (style === 'scarf') {
            return (
              <group>
                <mesh material={apparelMats.base} position={[0, 0.05, 0]}>
                  <sphereGeometry args={[0.42, 18, 14]} />
                </mesh>
                <mesh material={apparelMats.accent} position={[0, -0.15, 0]}>
                  <torusGeometry args={[0.42, 0.06, 10, 18]} />
                </mesh>
              </group>
            );
          }
          return (
            <group>
              <mesh material={apparelMats.base}>
                <sphereGeometry args={[0.38, 16, 12]} />
              </mesh>
              <mesh material={apparelMats.accent} position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.18, 0.22, 0.1, 10]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('rug') || normalizedName.includes('carpet')) {
          return (
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.32, 0.32, 0.12, 16]} />
              </mesh>
            </group>
          );
        }

        // Leather Sandals - pair of open sandals
        if (normalizedName.includes('sandal')) {
          return (
            <group>
              {/* Left sandal */}
              <group position={[-0.18, 0, 0]} rotation={[0, 0.1, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.18, 0.04, 0.45]} />
                  <meshStandardMaterial color="#8B5A2B" roughness={0.85} />
                </mesh>
                {/* Toe strap */}
                <mesh position={[0, 0.04, 0.12]} castShadow>
                  <boxGeometry args={[0.2, 0.03, 0.04]} />
                  <meshStandardMaterial color="#5C3A1E" roughness={0.8} />
                </mesh>
                {/* Ankle strap */}
                <mesh position={[0, 0.04, -0.1]} castShadow>
                  <boxGeometry args={[0.22, 0.025, 0.035]} />
                  <meshStandardMaterial color="#5C3A1E" roughness={0.8} />
                </mesh>
              </group>
              {/* Right sandal */}
              <group position={[0.18, 0, 0.05]} rotation={[0, -0.15, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.18, 0.04, 0.45]} />
                  <meshStandardMaterial color="#8B5A2B" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.04, 0.12]} castShadow>
                  <boxGeometry args={[0.2, 0.03, 0.04]} />
                  <meshStandardMaterial color="#5C3A1E" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.04, -0.1]} castShadow>
                  <boxGeometry args={[0.22, 0.025, 0.035]} />
                  <meshStandardMaterial color="#5C3A1E" roughness={0.8} />
                </mesh>
              </group>
            </group>
          );
        }

        // Iron Key - ornate medieval key
        if (normalizedName.includes('key')) {
          return (
            <group rotation={[0, 0, Math.PI / 12]}>
              {/* Key bow (handle ring) */}
              <mesh position={[0, 0.35, 0]} material={mats.metal}>
                <torusGeometry args={[0.15, 0.04, 10, 16]} />
              </mesh>
              {/* Key shank */}
              <mesh position={[0, 0, 0]} material={mats.metal}>
                <boxGeometry args={[0.06, 0.5, 0.03]} />
              </mesh>
              {/* Key bit (teeth) */}
              <mesh position={[0.06, -0.22, 0]} material={mats.metal}>
                <boxGeometry args={[0.08, 0.12, 0.03]} />
              </mesh>
              <mesh position={[0.08, -0.16, 0]} material={mats.metal}>
                <boxGeometry args={[0.04, 0.06, 0.03]} />
              </mesh>
              <mesh position={[-0.04, -0.2, 0]} material={mats.metal}>
                <boxGeometry args={[0.04, 0.08, 0.03]} />
              </mesh>
            </group>
          );
        }

        // Copper Amulet - disc pendant with engraved design
        if (normalizedName.includes('amulet')) {
          return (
            <group>
              {/* Main disc */}
              <mesh material={mats.metal}>
                <cylinderGeometry args={[0.25, 0.25, 0.04, 24]} />
              </mesh>
              {/* Engraved inner circle */}
              <mesh position={[0, 0.025, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
                <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.7} />
              </mesh>
              {/* Central motif */}
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 8]} />
                <meshStandardMaterial color="#cd9b4a" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Hanging loop */}
              <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.06, 0.02, 8, 12]} />
                <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
              </mesh>
            </group>
          );
        }

        // Prayer Beads - string of beads in a loop
        if (normalizedName.includes('prayer bead') || normalizedName.includes('beads')) {
          const beadCount = 12;
          const radius = 0.28;
          return (
            <group rotation={[Math.PI / 2, 0, 0]}>
              {/* String of beads in circle */}
              {Array.from({ length: beadCount }).map((_, i) => {
                const angle = (i / beadCount) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <mesh key={i} position={[x, y, 0]}>
                    <sphereGeometry args={[0.05, 10, 8]} />
                    <meshStandardMaterial color="#5c3a1e" roughness={0.7} />
                  </mesh>
                );
              })}
              {/* Central connector bead (larger) */}
              <mesh position={[0, radius + 0.08, 0]}>
                <sphereGeometry args={[0.07, 12, 10]} />
                <meshStandardMaterial color="#3d2512" roughness={0.6} />
              </mesh>
              {/* Tassel */}
              <mesh position={[0, radius + 0.2, 0]}>
                <cylinderGeometry args={[0.02, 0.04, 0.12, 8]} />
                <meshStandardMaterial color="#8b4513" roughness={0.8} />
              </mesh>
            </group>
          );
        }

        // Writing Reed / Calamus pen
        if (normalizedName.includes('writing reed') || normalizedName.includes('reed') || normalizedName.includes('calamus')) {
          return (
            <group rotation={[0, 0, Math.PI / 8]}>
              {/* Main reed shaft */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.035, 0.9, 8]} />
                <meshStandardMaterial color="#c4a574" roughness={0.75} />
              </mesh>
              {/* Carved nib end */}
              <mesh position={[0, -0.48, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.025, 0.12, 6]} />
                <meshStandardMaterial color="#8b7355" roughness={0.6} />
              </mesh>
              {/* Node rings on reed */}
              <mesh position={[0, 0.15, 0]}>
                <torusGeometry args={[0.032, 0.008, 6, 12]} />
                <meshStandardMaterial color="#a08060" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.15, 0]}>
                <torusGeometry args={[0.03, 0.006, 6, 12]} />
                <meshStandardMaterial color="#a08060" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        // Geometric Compass - brass drafting instrument
        if (normalizedName.includes('compass') || normalizedName.includes('geometric')) {
          return (
            <group>
              {/* Pivot joint at top */}
              <mesh position={[0, 0.35, 0]} material={mats.metal}>
                <sphereGeometry args={[0.06, 12, 10]} />
              </mesh>
              {/* Left arm */}
              <mesh position={[-0.12, 0.05, 0]} rotation={[0, 0, Math.PI / 8]} material={mats.metal}>
                <boxGeometry args={[0.03, 0.55, 0.015]} />
              </mesh>
              {/* Right arm */}
              <mesh position={[0.12, 0.05, 0]} rotation={[0, 0, -Math.PI / 8]} material={mats.metal}>
                <boxGeometry args={[0.03, 0.55, 0.015]} />
              </mesh>
              {/* Left point (sharp) */}
              <mesh position={[-0.18, -0.22, 0]} rotation={[0, 0, Math.PI / 8]}>
                <coneGeometry args={[0.02, 0.1, 8]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Right holder (for ink/lead) */}
              <mesh position={[0.18, -0.2, 0]} rotation={[0, 0, -Math.PI / 8]} material={mats.accent}>
                <cylinderGeometry args={[0.025, 0.02, 0.14, 8]} />
              </mesh>
              {/* Decorative engraving on joint */}
              <mesh position={[0, 0.35, 0.035]}>
                <circleGeometry args={[0.04, 12]} />
                <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.9} />
              </mesh>
            </group>
          );
        }

        // Aleppo Soap - rectangular olive oil soap bar
        if (normalizedName.includes('soap')) {
          return (
            <group>
              {/* Main soap block */}
              <mesh castShadow>
                <boxGeometry args={[0.4, 0.2, 0.28]} />
                <meshStandardMaterial color="#a8926e" roughness={0.85} />
              </mesh>
              {/* Stamp impression on top */}
              <mesh position={[0, 0.105, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
                <meshStandardMaterial color="#8a7a5a" roughness={0.9} />
              </mesh>
              {/* Laurel-tinted layer visible on side */}
              <mesh position={[0, -0.06, 0.145]}>
                <boxGeometry args={[0.38, 0.08, 0.02]} />
                <meshStandardMaterial color="#6b8e5a" roughness={0.8} />
              </mesh>
            </group>
          );
        }

        // Bezoar Stone - rough, layered stone sphere
        if (normalizedName.includes('bezoar')) {
          return (
            <group>
              {/* Main rough stone */}
              <mesh>
                <icosahedronGeometry args={[0.28, 1]} />
                <meshStandardMaterial color="#5a5045" roughness={0.95} />
              </mesh>
              {/* Layered rings showing internal structure */}
              <mesh position={[0, 0.05, 0.2]} rotation={[0.3, 0, 0]}>
                <torusGeometry args={[0.12, 0.03, 8, 12]} />
                <meshStandardMaterial color="#7a6a55" roughness={0.85} />
              </mesh>
              <mesh position={[0.15, -0.1, 0.12]} rotation={[0.5, 0.4, 0]}>
                <torusGeometry args={[0.08, 0.025, 6, 10]} />
                <meshStandardMaterial color="#6a5a45" roughness={0.9} />
              </mesh>
            </group>
          );
        }

        // Indigo Dye Cake - dense block of blue dye
        if (normalizedName.includes('indigo') || normalizedName.includes('dye cake')) {
          return (
            <group>
              {/* Main dye block */}
              <mesh castShadow>
                <boxGeometry args={[0.35, 0.18, 0.25]} />
                <meshStandardMaterial color="#1a237e" roughness={0.7} />
              </mesh>
              {/* Cracked/textured top surface */}
              <mesh position={[0.05, 0.095, 0.02]}>
                <boxGeometry args={[0.12, 0.02, 0.1]} />
                <meshStandardMaterial color="#283593" roughness={0.6} />
              </mesh>
              <mesh position={[-0.08, 0.095, -0.05]}>
                <boxGeometry args={[0.08, 0.02, 0.08]} />
                <meshStandardMaterial color="#303f9f" roughness={0.65} />
              </mesh>
              {/* Powder residue at base */}
              <mesh position={[0, -0.1, 0]}>
                <cylinderGeometry args={[0.22, 0.25, 0.02, 12]} />
                <meshStandardMaterial color="#3949ab" roughness={0.9} />
              </mesh>
            </group>
          );
        }

        // Aloe Vera - succulent leaves
        if (normalizedName.includes('aloe')) {
          return (
            <group>
              {/* Central leaf */}
              <mesh position={[0, 0.15, 0]} rotation={[0.15, 0, 0]}>
                <coneGeometry args={[0.08, 0.5, 6]} />
                <meshStandardMaterial color="#5d8a4a" roughness={0.7} />
              </mesh>
              {/* Left leaf */}
              <mesh position={[-0.1, 0.1, 0.02]} rotation={[0.1, 0, -0.3]}>
                <coneGeometry args={[0.07, 0.42, 6]} />
                <meshStandardMaterial color="#4a7a3a" roughness={0.7} />
              </mesh>
              {/* Right leaf */}
              <mesh position={[0.1, 0.1, 0.02]} rotation={[0.1, 0, 0.3]}>
                <coneGeometry args={[0.07, 0.42, 6]} />
                <meshStandardMaterial color="#4a7a3a" roughness={0.7} />
              </mesh>
              {/* Back leaves */}
              <mesh position={[-0.05, 0.08, -0.06]} rotation={[-0.2, 0, -0.15]}>
                <coneGeometry args={[0.06, 0.35, 6]} />
                <meshStandardMaterial color="#6a9a5a" roughness={0.7} />
              </mesh>
              <mesh position={[0.05, 0.08, -0.06]} rotation={[-0.2, 0, 0.15]}>
                <coneGeometry args={[0.06, 0.35, 6]} />
                <meshStandardMaterial color="#6a9a5a" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        // Pomegranate Seeds - small bowl with ruby seeds
        if (normalizedName.includes('pomegranate')) {
          return (
            <group>
              {/* Small bowl */}
              <mesh position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.22, 0.18, 0.12, 16]} />
                <meshStandardMaterial color="#8b6914" roughness={0.75} />
              </mesh>
              {/* Seeds piled in bowl */}
              {[
                [0, 0.06, 0], [-0.08, 0.05, 0.06], [0.08, 0.05, -0.04],
                [-0.04, 0.08, -0.06], [0.06, 0.07, 0.05], [0, 0.1, 0.02],
                [-0.06, 0.04, -0.02], [0.04, 0.06, -0.07]
              ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <sphereGeometry args={[0.04, 8, 6]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? '#8b1a1a' : '#a02828'}
                    roughness={0.4}
                    metalness={0.1}
                  />
                </mesh>
              ))}
            </group>
          );
        }

        // Silver Kohl Container - ornate small pot
        if (normalizedName.includes('kohl container')) {
          return (
            <group>
              {/* Main container body */}
              <mesh material={mats.metal}>
                <cylinderGeometry args={[0.14, 0.16, 0.25, 16]} />
              </mesh>
              {/* Decorative band */}
              <mesh position={[0, 0.05, 0]}>
                <torusGeometry args={[0.15, 0.02, 10, 16]} />
                <meshStandardMaterial color="#c0c0c0" roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Lid */}
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.12, 0.14, 0.08, 14]} />
                <meshStandardMaterial color="#a8a8a8" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Lid knob */}
              <mesh position={[0, 0.22, 0]}>
                <sphereGeometry args={[0.04, 10, 8]} />
                <meshStandardMaterial color="#d4d4d4" roughness={0.2} metalness={0.9} />
              </mesh>
              {/* Engraved pattern lines */}
              <mesh position={[0, -0.02, 0.155]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.03, 0.008, 6, 8]} />
                <meshStandardMaterial color="#909090" roughness={0.4} metalness={0.7} />
              </mesh>
            </group>
          );
        }

        // Sugar Loaf - conical refined sugar
        if (normalizedName.includes('sugar')) {
          return (
            <group>
              {/* Main cone */}
              <mesh>
                <coneGeometry args={[0.22, 0.55, 16]} />
                <meshStandardMaterial color="#faf8f0" roughness={0.6} />
              </mesh>
              {/* Paper wrapper at base */}
              <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.24, 0.26, 0.15, 14]} />
                <meshStandardMaterial color="#d4c8a8" roughness={0.85} />
              </mesh>
              {/* Crystalline texture hints */}
              <mesh position={[0.1, 0.1, 0.12]} rotation={[0.2, 0.3, 0]}>
                <boxGeometry args={[0.04, 0.04, 0.02]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
              </mesh>
            </group>
          );
        }

        // Pistachio Nuts - scattered green nuts
        if (normalizedName.includes('pistachio')) {
          const nutPositions = [
            [0, 0, 0], [-0.12, 0.02, 0.08], [0.1, 0.01, -0.06],
            [-0.06, 0.03, -0.1], [0.14, 0, 0.05], [-0.02, 0.02, 0.12],
            [0.08, 0.02, 0.1], [-0.1, 0.01, 0.02]
          ];
          return (
            <group>
              {nutPositions.map((pos, i) => (
                <group key={i} position={pos as [number, number, number]} rotation={[0, i * 0.8, Math.random() * 0.3]}>
                  {/* Nut shell */}
                  <mesh>
                    <sphereGeometry args={[0.055, 8, 6]} />
                    <meshStandardMaterial color="#c4a574" roughness={0.8} />
                  </mesh>
                  {/* Shell opening showing green nut */}
                  <mesh position={[0.03, 0.02, 0]} rotation={[0, 0.5, 0]}>
                    <sphereGeometry args={[0.035, 6, 5]} />
                    <meshStandardMaterial color="#7cb342" roughness={0.6} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        }

        // Chickpeas - small pile of legumes
        if (normalizedName.includes('chickpea')) {
          const peaPositions = [
            [0, 0, 0], [-0.08, 0.01, 0.06], [0.07, 0.01, -0.05],
            [-0.04, 0.02, -0.08], [0.1, 0, 0.04], [-0.02, 0.015, 0.09],
            [0.05, 0.02, 0.07], [-0.09, 0, -0.02], [0.02, 0.03, 0],
            [-0.05, 0.01, 0.03], [0.08, 0.015, -0.08]
          ];
          return (
            <group>
              {peaPositions.map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <sphereGeometry args={[0.045, 8, 6]} />
                  <meshStandardMaterial
                    color={i % 3 === 0 ? '#d4b896' : i % 3 === 1 ? '#c9a882' : '#dcc4a4'}
                    roughness={0.75}
                  />
                </mesh>
              ))}
            </group>
          );
        }

        // Sesame Oil - ceramic oil bottle
        if (normalizedName.includes('sesame oil') || normalizedName.includes('sesame')) {
          return (
            <group>
              {/* Bottle body */}
              <mesh>
                <cylinderGeometry args={[0.16, 0.2, 0.4, 14]} />
                <meshStandardMaterial color="#b08050" roughness={0.8} />
              </mesh>
              {/* Narrow neck */}
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 0.18, 12]} />
                <meshStandardMaterial color="#a07040" roughness={0.75} />
              </mesh>
              {/* Rim */}
              <mesh position={[0, 0.38, 0]}>
                <torusGeometry args={[0.08, 0.025, 10, 14]} />
                <meshStandardMaterial color="#8a6030" roughness={0.7} />
              </mesh>
              {/* Cork stopper */}
              <mesh position={[0, 0.42, 0]}>
                <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
                <meshStandardMaterial color="#8b7355" roughness={0.9} />
              </mesh>
              {/* Decorative band */}
              <mesh position={[0, 0.1, 0]}>
                <torusGeometry args={[0.17, 0.015, 8, 14]} />
                <meshStandardMaterial color="#6a5030" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('bell')) {
          return (
            <group>
              <mesh material={mats.base}>
                <sphereGeometry args={[0.28, 16, 12]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.22, 0]}>
                <cylinderGeometry args={[0.18, 0.24, 0.16, 12]} />
              </mesh>
              <mesh material={mats.metal} position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.08, 12, 10]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('nail')) {
          return (
            <group>
              <mesh material={mats.base}>
                <boxGeometry args={[0.5, 0.2, 0.35]} />
              </mesh>
              <mesh material={mats.metal} position={[0, 0.16, 0]}>
                <boxGeometry args={[0.4, 0.06, 0.25]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('bowl') || normalizedName.includes('plate') || normalizedName.includes('cup')) {
          return (
            <group>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.4, 0.45, 0.15, 18]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.32, 0.38, 0.05, 18]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('coin purse')) {
          return (
            <group>
              <mesh material={mats.base}>
                <sphereGeometry args={[0.3, 16, 12]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 0.2, 10]} />
              </mesh>
            </group>
          );
        }

        // Camphor Oil - glass bottle with translucent aromatic oil
        if (normalizedName.includes('camphor')) {
          return (
            <group>
              {/* Glass bottle body */}
              <mesh>
                <cylinderGeometry args={[0.14, 0.18, 0.45, 16]} />
                <meshPhysicalMaterial
                  color="#e8f4f8"
                  transparent
                  opacity={0.4}
                  roughness={0.05}
                  metalness={0.1}
                  clearcoat={1}
                  clearcoatRoughness={0.1}
                />
              </mesh>
              {/* Liquid inside - pale translucent */}
              <mesh position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.32, 14]} />
                <meshPhysicalMaterial
                  color="#c5dde6"
                  transparent
                  opacity={0.7}
                  roughness={0.1}
                  metalness={0.05}
                  transmission={0.3}
                />
              </mesh>
              {/* Narrow neck */}
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.06, 0.1, 0.15, 12]} />
                <meshPhysicalMaterial
                  color="#e8f4f8"
                  transparent
                  opacity={0.35}
                  roughness={0.05}
                  clearcoat={1}
                />
              </mesh>
              {/* Cork stopper */}
              <mesh position={[0, 0.42, 0]}>
                <cylinderGeometry args={[0.055, 0.065, 0.1, 10]} />
                <meshStandardMaterial color="#8b7355" roughness={0.85} />
              </mesh>
              {/* Glass rim highlight */}
              <mesh position={[0, 0.36, 0]}>
                <torusGeometry args={[0.065, 0.015, 8, 14]} />
                <meshPhysicalMaterial color="#ffffff" transparent opacity={0.6} roughness={0.02} clearcoat={1} />
              </mesh>
            </group>
          );
        }

        // Henna Powder - open ceramic bowl with red-orange powder
        if (normalizedName.includes('henna')) {
          return (
            <group>
              {/* Ceramic bowl */}
              <mesh position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.28, 0.22, 0.16, 18]} />
                <meshStandardMaterial color="#c4956a" roughness={0.85} />
              </mesh>
              {/* Bowl interior darker */}
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.24, 0.24, 0.06, 16]} />
                <meshStandardMaterial color="#a87850" roughness={0.9} />
              </mesh>
              {/* Henna powder pile - red-orange mound */}
              <mesh position={[0, 0.08, 0]}>
                <sphereGeometry args={[0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#c45c26" roughness={0.95} />
              </mesh>
              {/* Powder texture variation */}
              <mesh position={[0.06, 0.1, 0.04]}>
                <sphereGeometry args={[0.06, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#d4673a" roughness={0.98} />
              </mesh>
              <mesh position={[-0.05, 0.09, -0.03]}>
                <sphereGeometry args={[0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#b84f1e" roughness={0.97} />
              </mesh>
            </group>
          );
        }

        // Kohl Powder - small decorated pot with black powder
        if (normalizedName.includes('kohl powder') || (normalizedName.includes('kohl') && !normalizedName.includes('container'))) {
          return (
            <group>
              {/* Small ceramic pot */}
              <mesh>
                <cylinderGeometry args={[0.12, 0.14, 0.18, 14]} />
                <meshStandardMaterial color="#2a2520" roughness={0.75} />
              </mesh>
              {/* Decorative band */}
              <mesh position={[0, 0.04, 0]}>
                <torusGeometry args={[0.125, 0.015, 8, 14]} />
                <meshStandardMaterial color="#4a4035" roughness={0.6} />
              </mesh>
              {/* Black kohl powder visible at top */}
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.98} metalness={0.05} />
              </mesh>
              {/* Tiny applicator stick */}
              <mesh position={[0.08, 0.18, 0]} rotation={[0, 0, Math.PI / 6]}>
                <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
                <meshStandardMaterial color="#3a3530" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        // Honey - glass jar with golden translucent liquid
        if (normalizedName.includes('honey')) {
          return (
            <group>
              {/* Glass jar body */}
              <mesh>
                <cylinderGeometry args={[0.2, 0.22, 0.35, 18]} />
                <meshPhysicalMaterial
                  color="#ffeedd"
                  transparent
                  opacity={0.3}
                  roughness={0.02}
                  metalness={0.05}
                  clearcoat={1}
                  clearcoatRoughness={0.05}
                />
              </mesh>
              {/* Golden honey inside */}
              <mesh position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.17, 0.19, 0.28, 16]} />
                <meshPhysicalMaterial
                  color="#d4a012"
                  transparent
                  opacity={0.85}
                  roughness={0.15}
                  metalness={0.1}
                  transmission={0.2}
                  thickness={0.5}
                />
              </mesh>
              {/* Cloth cover tied at top */}
              <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.24, 0.22, 0.08, 16]} />
                <meshStandardMaterial color="#f5e6c8" roughness={0.9} />
              </mesh>
              {/* Twine tie */}
              <mesh position={[0, 0.16, 0]}>
                <torusGeometry args={[0.21, 0.02, 8, 16]} />
                <meshStandardMaterial color="#8b7355" roughness={0.85} />
              </mesh>
              {/* Honey drip on side */}
              <mesh position={[0.19, 0.05, 0]} rotation={[0, 0, -0.15]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshPhysicalMaterial color="#d4a012" transparent opacity={0.9} roughness={0.1} />
              </mesh>
            </group>
          );
        }

        // Rose Water - elegant glass bottle with pink-tinted liquid
        if (normalizedName.includes('rose water')) {
          return (
            <group>
              {/* Elegant bottle body - slightly bulbous */}
              <mesh>
                <sphereGeometry args={[0.2, 18, 14]} />
                <meshPhysicalMaterial
                  color="#fff5f5"
                  transparent
                  opacity={0.35}
                  roughness={0.02}
                  metalness={0.05}
                  clearcoat={1}
                  clearcoatRoughness={0.03}
                />
              </mesh>
              {/* Rose-tinted liquid */}
              <mesh>
                <sphereGeometry args={[0.17, 16, 12]} />
                <meshPhysicalMaterial
                  color="#f8c8d4"
                  transparent
                  opacity={0.6}
                  roughness={0.08}
                  transmission={0.4}
                  thickness={0.8}
                />
              </mesh>
              {/* Long elegant neck */}
              <mesh position={[0, 0.32, 0]}>
                <cylinderGeometry args={[0.05, 0.1, 0.28, 12]} />
                <meshPhysicalMaterial
                  color="#fff5f5"
                  transparent
                  opacity={0.35}
                  roughness={0.02}
                  clearcoat={1}
                />
              </mesh>
              {/* Glass stopper */}
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.06, 12, 10]} />
                <meshPhysicalMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.5}
                  roughness={0.02}
                  clearcoat={1}
                />
              </mesh>
              {/* Stopper neck */}
              <mesh position={[0, 0.44, 0]}>
                <cylinderGeometry args={[0.035, 0.04, 0.06, 10]} />
                <meshPhysicalMaterial color="#fff0f0" transparent opacity={0.4} roughness={0.03} />
              </mesh>
            </group>
          );
        }

        // Musk Perfume - ornate glass perfume bottle
        if (normalizedName.includes('perfume') || normalizedName.includes('musk')) {
          return (
            <group>
              {/* Ornate bottle body - faceted */}
              <mesh>
                <cylinderGeometry args={[0.15, 0.18, 0.4, 8]} />
                <meshPhysicalMaterial
                  color="#f0e8d8"
                  transparent
                  opacity={0.4}
                  roughness={0.03}
                  metalness={0.1}
                  clearcoat={1}
                  clearcoatRoughness={0.02}
                />
              </mesh>
              {/* Amber perfume liquid */}
              <mesh position={[0, -0.03, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
                <meshPhysicalMaterial
                  color="#b8860b"
                  transparent
                  opacity={0.75}
                  roughness={0.1}
                  metalness={0.15}
                  transmission={0.25}
                />
              </mesh>
              {/* Decorative gold collar */}
              <mesh position={[0, 0.22, 0]}>
                <torusGeometry args={[0.12, 0.025, 10, 8]} />
                <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Neck */}
              <mesh position={[0, 0.32, 0]}>
                <cylinderGeometry args={[0.05, 0.08, 0.15, 10]} />
                <meshPhysicalMaterial color="#f8f0e0" transparent opacity={0.35} roughness={0.03} clearcoat={1} />
              </mesh>
              {/* Ornate stopper */}
              <mesh position={[0, 0.45, 0]}>
                <dodecahedronGeometry args={[0.07, 0]} />
                <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} />
              </mesh>
            </group>
          );
        }

        // Ambergris - rare waxy substance
        if (normalizedName.includes('ambergris')) {
          return (
            <group>
              {/* Irregular waxy lump */}
              <mesh>
                <dodecahedronGeometry args={[0.25, 1]} />
                <meshPhysicalMaterial
                  color="#4a4540"
                  roughness={0.6}
                  metalness={0.05}
                  clearcoat={0.3}
                  clearcoatRoughness={0.4}
                />
              </mesh>
              {/* Lighter streaks */}
              <mesh position={[0.1, 0.08, 0.12]} rotation={[0.3, 0.5, 0]}>
                <boxGeometry args={[0.15, 0.04, 0.06]} />
                <meshStandardMaterial color="#7a7265" roughness={0.7} />
              </mesh>
              <mesh position={[-0.08, -0.05, 0.1]} rotation={[-0.2, -0.3, 0.1]}>
                <boxGeometry args={[0.1, 0.03, 0.05]} />
                <meshStandardMaterial color="#8a8275" roughness={0.65} />
              </mesh>
              {/* Waxy sheen spots */}
              <mesh position={[0.15, 0.12, 0.05]}>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshPhysicalMaterial color="#5a5550" roughness={0.4} clearcoat={0.5} />
              </mesh>
            </group>
          );
        }

        // Opium Paste - small ceramic pot with dark paste
        if (normalizedName.includes('opium')) {
          return (
            <group>
              {/* Small round ceramic pot */}
              <mesh>
                <sphereGeometry args={[0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
                <meshStandardMaterial color="#8b6914" roughness={0.8} />
              </mesh>
              {/* Pot base */}
              <mesh position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.12, 0.14, 0.06, 14]} />
                <meshStandardMaterial color="#7a5a10" roughness={0.85} />
              </mesh>
              {/* Dark paste visible inside */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.14, 0.14, 0.06, 14]} />
                <meshStandardMaterial color="#2a1810" roughness={0.95} metalness={0.05} />
              </mesh>
              {/* Paste surface - slightly glossy */}
              <mesh position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.02, 12]} />
                <meshPhysicalMaterial color="#3a2518" roughness={0.5} clearcoat={0.4} />
              </mesh>
              {/* Small lid beside pot */}
              <mesh position={[0.22, -0.08, 0]} rotation={[0.2, 0, 0.4]}>
                <sphereGeometry args={[0.1, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial color="#8b6914" roughness={0.8} />
              </mesh>
            </group>
          );
        }

        // Theriac Compound - fancy medicine bottle with many-layered appearance
        if (normalizedName.includes('theriac')) {
          return (
            <group>
              {/* Ornate ceramic jar */}
              <mesh>
                <cylinderGeometry args={[0.18, 0.22, 0.45, 16]} />
                <meshStandardMaterial color="#1a4a6e" roughness={0.7} />
              </mesh>
              {/* Gold decorative bands */}
              <mesh position={[0, 0.15, 0]}>
                <torusGeometry args={[0.185, 0.02, 10, 16]} />
                <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.85} />
              </mesh>
              <mesh position={[0, -0.1, 0]}>
                <torusGeometry args={[0.21, 0.018, 10, 16]} />
                <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Glazed pattern area */}
              <mesh position={[0, 0.02, 0.19]}>
                <circleGeometry args={[0.08, 16]} />
                <meshStandardMaterial color="#c9a227" roughness={0.4} metalness={0.6} />
              </mesh>
              {/* Neck with flared rim */}
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.1, 0.14, 0.12, 14]} />
                <meshStandardMaterial color="#1a4a6e" roughness={0.7} />
              </mesh>
              {/* Wax seal on top */}
              <mesh position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.11, 0.1, 0.04, 12]} />
                <meshStandardMaterial color="#8b0000" roughness={0.6} />
              </mesh>
              {/* Seal stamp impression */}
              <mesh position={[0, 0.385, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.01, 10]} />
                <meshStandardMaterial color="#6a0000" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        // Saffron Threads - glass jar with precious red threads
        if (normalizedName.includes('saffron')) {
          return (
            <group>
              {/* Small glass jar */}
              <mesh>
                <cylinderGeometry args={[0.12, 0.14, 0.25, 14]} />
                <meshPhysicalMaterial
                  color="#f8f5f0"
                  transparent
                  opacity={0.35}
                  roughness={0.03}
                  clearcoat={1}
                />
              </mesh>
              {/* Saffron threads inside - precious red-orange */}
              <mesh position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.09, 0.11, 0.16, 12]} />
                <meshStandardMaterial color="#d4380d" roughness={0.85} />
              </mesh>
              {/* Individual thread hints on top */}
              {[[-0.03, 0.08, 0.02], [0.02, 0.09, -0.01], [0, 0.085, 0.03]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} rotation={[0.2 * i, 0.5 * i, 0]}>
                  <boxGeometry args={[0.008, 0.06, 0.003]} />
                  <meshStandardMaterial color="#c43e1c" roughness={0.8} />
                </mesh>
              ))}
              {/* Cork stopper */}
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.08, 0.09, 0.08, 10]} />
                <meshStandardMaterial color="#a08060" roughness={0.85} />
              </mesh>
            </group>
          );
        }

        // Generic spices - improved with distinct colors
        if (normalizedName.includes('cumin') || normalizedName.includes('pepper') || normalizedName.includes('cardamom') || normalizedName.includes('coriander')) {
          const spiceColor = normalizedName.includes('pepper') ? '#2a2a25' :
                           normalizedName.includes('cumin') ? '#8b6914' :
                           normalizedName.includes('cardamom') ? '#6b8e5a' : '#b8956a';
          return (
            <group>
              {/* Cloth pouch */}
              <mesh>
                <sphereGeometry args={[0.22, 14, 12]} />
                <meshStandardMaterial color="#c4a882" roughness={0.9} />
              </mesh>
              {/* Tied top */}
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.06, 0.12, 0.12, 10]} />
                <meshStandardMaterial color="#b8986a" roughness={0.88} />
              </mesh>
              {/* Twine tie */}
              <mesh position={[0, 0.18, 0]}>
                <torusGeometry args={[0.08, 0.015, 8, 12]} />
                <meshStandardMaterial color="#6a5a40" roughness={0.85} />
              </mesh>
              {/* Spice visible at opening */}
              <mesh position={[0, 0.26, 0]}>
                <sphereGeometry args={[0.05, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={spiceColor} roughness={0.95} />
              </mesh>
            </group>
          );
        }

        // Mint Leaves - fresh herb bundle
        if (normalizedName.includes('mint')) {
          return (
            <group>
              {/* Bundled stems */}
              <mesh position={[0, -0.15, 0]}>
                <cylinderGeometry args={[0.06, 0.05, 0.2, 8]} />
                <meshStandardMaterial color="#4a7a3a" roughness={0.75} />
              </mesh>
              {/* Twine tie around stems */}
              <mesh position={[0, -0.1, 0]}>
                <torusGeometry args={[0.065, 0.015, 8, 12]} />
                <meshStandardMaterial color="#8b7355" roughness={0.85} />
              </mesh>
              {/* Mint leaves - fresh green */}
              {[
                [0, 0.1, 0, 0], [-0.08, 0.05, 0.04, -0.3], [0.08, 0.07, -0.02, 0.25],
                [-0.04, 0.12, -0.05, 0.15], [0.06, 0.02, 0.06, -0.2], [0, 0.15, 0.04, 0.1]
              ].map((data, i) => (
                <mesh key={i} position={[data[0], data[1], data[2]]} rotation={[0.2, data[3], 0.1 * i]}>
                  <sphereGeometry args={[0.06, 8, 6]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? '#3d8b3d' : '#4a9a4a'}
                    roughness={0.7}
                  />
                </mesh>
              ))}
            </group>
          );
        }

        if (normalizedName.includes('incense') || normalizedName.includes('resin') || normalizedName.includes('myrrh')) {
          return (
            <group>
              {/* Wooden box base */}
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.4, 0.1, 0.28]} />
                <meshStandardMaterial color="#5c3a1e" roughness={0.85} />
              </mesh>
              {/* Resin chunks piled on top */}
              {[
                [0, 0.08, 0], [-0.1, 0.06, 0.06], [0.08, 0.07, -0.04],
                [-0.05, 0.1, -0.05], [0.1, 0.05, 0.05]
              ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <dodecahedronGeometry args={[0.06 + i * 0.01, 0]} />
                  <meshPhysicalMaterial
                    color={i % 2 === 0 ? '#8b4513' : '#a0522d'}
                    roughness={0.5}
                    clearcoat={0.3}
                    clearcoatRoughness={0.5}
                  />
                </mesh>
              ))}
            </group>
          );
        }

        if (normalizedName.includes('manuscript') || normalizedName.includes('book') || normalizedName.includes('ledger')) {
          return (
            <group>
              <mesh material={mats.base}>
                <boxGeometry args={[0.6, 0.08, 0.45]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.08, 0]}>
                <boxGeometry args={[0.6, 0.05, 0.45]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('dagger') || normalizedId.includes('dagger')) {
          return (
            <group rotation={[0, 0.2, 0]}>
              <mesh material={mats.metal} position={[0, 0.05, 0]}>
                <boxGeometry args={[0.08, 1.0, 0.08]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.55, 0]}>
                <boxGeometry args={[0.2, 0.08, 0.12]} />
              </mesh>
              <mesh material={mats.base} position={[0, -0.85, 0]}>
                <boxGeometry args={[0.12, 0.45, 0.12]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('scimitar')) {
          return (
            <group rotation={[0, -0.2, 0]}>
              <mesh material={mats.metal} position={[0.1, 0.1, 0]} rotation={[0, 0, Math.PI / 12]}>
                <boxGeometry args={[0.08, 1.1, 0.04]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.55, 0]}>
                <boxGeometry args={[0.22, 0.08, 0.12]} />
              </mesh>
              <mesh material={mats.base} position={[0, -0.85, 0]}>
                <boxGeometry args={[0.12, 0.45, 0.12]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('waterskin') || normalizedId.includes('waterskin')) {
          return (
            <group>
              <mesh material={mats.base}>
                <sphereGeometry args={[0.4, 22, 18]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.25, 12]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.1, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.28, 0.04, 8, 18]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('satchel') || normalizedName.includes('bag')) {
          return (
            <group>
              <mesh material={mats.base} position={[0, 0, 0]}>
                <boxGeometry args={[0.7, 0.45, 0.3]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.12, 0.2]}>
                <boxGeometry args={[0.7, 0.2, 0.1]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.35, 0.03, 8, 18]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('candle')) {
          return (
            <group>
              {[[-0.18, 0, -0.1], [0, 0, 0.05], [0.18, 0, -0.08]].map((pos, idx) => (
                <mesh key={`candle-${idx}`} material={mats.base} position={pos as [number, number, number]}>
                  <cylinderGeometry args={[0.07, 0.08, 0.35, 12]} />
                </mesh>
              ))}
            </group>
          );
        }

        if (normalizedName.includes('lamp')) {
          return (
            <group>
              <mesh material={mats.base}>
                <sphereGeometry args={[0.3, 20, 16]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.15, 0.28]}>
                <cylinderGeometry args={[0.08, 0.1, 0.2, 10]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.12, 0.16, 0.12, 10]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('basket')) {
          return (
            <group>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.45, 0.5, 0.4, 18]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.25, 0]}>
                <torusGeometry args={[0.38, 0.05, 10, 18]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('olive')) {
          return (
            <group>
              <mesh position={[-0.12, 0, 0]}>
                <sphereGeometry args={[0.12, 12, 10]} />
                <meshStandardMaterial color="#475b3a" roughness={0.7} />
              </mesh>
              <mesh position={[0.1, 0.02, 0.05]}>
                <sphereGeometry args={[0.11, 12, 10]} />
                <meshStandardMaterial color="#3e5234" roughness={0.7} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('lemon')) {
          return (
            <group>
              <mesh>
                <sphereGeometry args={[0.18, 16, 12]} />
                <meshStandardMaterial color="#d8b247" roughness={0.65} />
              </mesh>
              <mesh position={[0.18, 0.02, -0.06]}>
                <sphereGeometry args={[0.14, 16, 12]} />
                <meshStandardMaterial color="#c4a13d" roughness={0.65} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('fig') || normalizedName.includes('dates') || normalizedName.includes('apricot')) {
          const fruitColor = normalizedName.includes('apricot') ? '#cc8a5b' : '#7a4c2f';
          return (
            <group>
              <mesh position={[-0.12, 0, 0]}>
                <sphereGeometry args={[0.14, 12, 10]} />
                <meshStandardMaterial color={fruitColor} roughness={0.8} />
              </mesh>
              <mesh position={[0.1, 0.03, 0.1]}>
                <sphereGeometry args={[0.12, 12, 10]} />
                <meshStandardMaterial color={fruitColor} roughness={0.8} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('linen') || normalizedName.includes('cloth') || normalizedName.includes('headscarf') || normalizedName.includes('cloak') || normalizedName.includes('tunic') || normalizedName.includes('robe')) {
          return (
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh material={mats.base}>
                <planeGeometry args={[0.9, 0.7]} />
              </mesh>
              <mesh material={mats.accent} position={[0.15, 0.1, 0.01]}>
                <planeGeometry args={[0.45, 0.3]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('twine') || normalizedName.includes('rope')) {
          return (
            <mesh material={mats.accent} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.25, 0.06, 12, 20]} />
            </mesh>
          );
        }

        if (normalizedName.includes('pottery') || normalizedName.includes('ceramic')) {
          return (
            <group>
              <mesh material={mats.base} rotation={[0.1, 0.4, 0]}>
                <boxGeometry args={[0.45, 0.2, 0.32]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.15, 0.08]}>
                <boxGeometry args={[0.22, 0.08, 0.18]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('mirror')) {
          return (
            <group>
              <mesh material={mats.metal}>
                <cylinderGeometry args={[0.35, 0.35, 0.05, 18]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.3, 10]} />
              </mesh>
            </group>
          );
        }

        if (categoryName.includes('apothecary')) {
          return (
            <group>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.32, 0.38, 0.9, 20]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.2, 18, 14]} />
              </mesh>
            </group>
          );
        }

        if (categoryName.includes('metalsmith')) {
          return (
            <group>
              <mesh material={mats.metal}>
                <boxGeometry args={[0.25, 0.9, 0.12]} />
              </mesh>
              <mesh material={mats.accent} position={[0, -0.5, 0]}>
                <boxGeometry args={[0.3, 0.28, 0.18]} />
              </mesh>
            </group>
          );
        }

        if (categoryName.includes('textile')) {
          return (
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh material={mats.base}>
                <planeGeometry args={[0.9, 0.7]} />
              </mesh>
              <mesh material={mats.accent} position={[0.1, 0.12, 0.01]}>
                <planeGeometry args={[0.5, 0.3]} />
              </mesh>
            </group>
          );
        }

        return (
          <group>
            <mesh material={mats.base}>
              <boxGeometry args={[0.7, 0.4, 0.4]} />
            </mesh>
            <mesh material={mats.accent} position={[0, 0.3, 0]}>
              <torusGeometry args={[0.2, 0.05, 12, 18]} />
            </mesh>
          </group>
        );
      }}
    </ItemMaterialSet>
  );
};
