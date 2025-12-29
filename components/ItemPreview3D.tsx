import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { InventoryItemMesh } from './items/ItemMeshes';

import type { ItemAppearance } from '../types';

interface ItemPreview3DProps {
  itemId: string;
  name: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare';
  appearance?: ItemAppearance;
}

export const ItemPreview3D: React.FC<ItemPreview3DProps> = (props) => {
  return (
    <div className="h-full w-full rounded-2xl border border-white/10 bg-gradient-to-br from-black/60 via-slate-900/40 to-black/80">
      <Canvas camera={{ position: [1.8, 1.4, 2.2], fov: 35 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <pointLight position={[-2, 1, -1]} intensity={0.6} color="#f8d8a3" />
        <group position={[0, -0.2, 0]}>
          <InventoryItemMesh {...props} />
        </group>
        <OrbitControls enablePan={false} minDistance={1.6} maxDistance={4} />
      </Canvas>
    </div>
  );
};
