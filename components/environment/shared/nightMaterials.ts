import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const useNightTintedMaterial = (
  baseMaterial: THREE.Material,
  nightFactor: number,
  tintColor: string,
  darkenScale = 0.6
) => {
  const material = useMemo(() => {
    if (baseMaterial instanceof THREE.MeshStandardMaterial) {
      return baseMaterial.clone();
    }
    return baseMaterial;
  }, [baseMaterial]);

  const nightTintRef = useRef(new THREE.Color());
  const tintedColorRef = useRef(new THREE.Color());

  useEffect(() => {
    if (!(material instanceof THREE.MeshStandardMaterial) || !(baseMaterial instanceof THREE.MeshStandardMaterial)) return;
    nightTintRef.current.set(tintColor);
    tintedColorRef.current.copy(baseMaterial.color).lerp(nightTintRef.current, nightFactor);
    tintedColorRef.current.multiplyScalar(1 - nightFactor * darkenScale);
    material.color.copy(tintedColorRef.current);
    // Color changes don't require shader recompilation.
  }, [material, baseMaterial, nightFactor, tintColor, darkenScale]);

  return material;
};
