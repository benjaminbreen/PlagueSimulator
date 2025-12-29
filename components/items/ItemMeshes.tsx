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

        if (normalizedName.includes('perfume') || normalizedName.includes('rose water') || normalizedName.includes('ambergris')) {
          return (
            <group>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.22, 0.28, 0.55, 14]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.35, 0]}>
                <sphereGeometry args={[0.14, 14, 10]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('incense') || normalizedName.includes('resin') || normalizedName.includes('myrrh')) {
          return (
            <group>
              <mesh material={mats.accent}>
                <cylinderGeometry args={[0.26, 0.3, 0.12, 14]} />
              </mesh>
              <mesh material={mats.base} position={[0, 0.14, 0]}>
                <boxGeometry args={[0.4, 0.12, 0.2]} />
              </mesh>
            </group>
          );
        }

        if (normalizedName.includes('saffron') || normalizedName.includes('cumin') || normalizedName.includes('pepper') || normalizedName.includes('cardamom') || normalizedName.includes('coriander') || normalizedName.includes('mint')) {
          return (
            <group>
              <mesh material={mats.base}>
                <cylinderGeometry args={[0.25, 0.3, 0.45, 14]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0.25, 0]}>
                <torusGeometry args={[0.2, 0.04, 10, 16]} />
              </mesh>
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
