import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { BuildingMetadata, InteriorSpec, PlayerStats } from '../types';
import { getItemDetailsByItemId } from '../utils/merchantItems';
import { PickupInfo } from '../utils/pushables';

interface InventoryInteractionsArgs {
  sceneMode: 'outdoor' | 'interior';
  interiorBuilding: BuildingMetadata | null;
  interiorSpec: InteriorSpec | null;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  r3fRef: React.MutableRefObject<{ camera: THREE.Camera | null; gl: THREE.WebGLRenderer | null }>;
  dropRaycaster: THREE.Raycaster;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  setPickupToast: React.Dispatch<React.SetStateAction<{ message: string; id: number } | null>>;
  simTime: number;
}

export const useInventoryInteractions = ({
  sceneMode,
  interiorBuilding,
  interiorSpec,
  playerPositionRef,
  r3fRef,
  dropRaycaster,
  setPlayerStats,
  setPickupToast,
  simTime
}: InventoryInteractionsArgs) => {
  const [dropRequests, setDropRequests] = useState<import('../types').DroppedItemRequest[]>([]);

  const handlePickupItem = useCallback((pickup: PickupInfo) => {
    setPlayerStats(prev => {
      if (pickup.type === 'coin' && pickup.value) {
        setPickupToast({ message: `Picked up ${pickup.label}`, id: Date.now() });
        return {
          ...prev,
          currency: prev.currency + pickup.value
        };
      }
      if (!pickup.itemId) return prev;
      const currentInventorySize = prev.inventory.reduce((sum, i) => sum + i.quantity, 0);
      if (currentInventorySize + 1 > prev.maxInventorySlots) {
        setPickupToast({ message: 'Inventory full', id: Date.now() });
        return prev;
      }
      const existingItemIndex = prev.inventory.findIndex(i => i.itemId === pickup.itemId);
      let newInventory = [...prev.inventory];
      if (existingItemIndex >= 0) {
        newInventory[existingItemIndex] = {
          ...newInventory[existingItemIndex],
          quantity: newInventory[existingItemIndex].quantity + 1
        };
      } else {
        newInventory.push({
          id: `player-item-${Date.now()}`,
          itemId: pickup.itemId,
          quantity: 1,
          acquiredAt: simTime
        });
      }
      setPickupToast({ message: `Picked up ${pickup.label}`, id: Date.now() });
      return {
        ...prev,
        inventory: newInventory
      };
    });
  }, [setPickupToast, setPlayerStats, simTime]);

  const handleDropItem = useCallback((item: { inventoryId: string; itemId: string; label: string; appearance?: import('../types').ItemAppearance }, dropPosition?: [number, number, number]) => {
    const position = dropPosition
      ? { x: dropPosition[0], y: dropPosition[1], z: dropPosition[2] }
      : playerPositionRef.current;
    const offsetX = dropPosition ? 0 : 0.4 + Math.random() * 0.2;
    const offsetZ = dropPosition ? 0 : 0.2 + Math.random() * 0.2;
    const dropId = `drop-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const details = getItemDetailsByItemId(item.itemId);
    const label = details?.name ?? item.label ?? item.itemId;
    const dropLocation = sceneMode === 'interior' ? 'interior' : 'outdoor';
    const interiorId = interiorBuilding?.id ?? interiorSpec?.buildingId ?? undefined;
    const material = (() => {
      if (item.appearance?.type === 'robe' || item.appearance?.type === 'headwear') return 'cloth';
      switch (details?.category) {
        case 'METALSMITH': return 'metal';
        case 'TEXTILE': return 'cloth';
        case 'APOTHECARY': return 'ceramic';
        case 'TRADER': return 'wood';
        default: return 'cloth';
      }
    })();

    setPlayerStats(prev => {
      const existingIndex = prev.inventory.findIndex((entry) => entry.id === item.inventoryId);
      if (existingIndex === -1) {
        return prev;
      }
      const nextInventory = [...prev.inventory];
      const target = nextInventory[existingIndex];
      if (target.quantity <= 1) {
        nextInventory.splice(existingIndex, 1);
      } else {
        nextInventory[existingIndex] = { ...target, quantity: target.quantity - 1 };
      }
      return { ...prev, inventory: nextInventory };
    });

    setDropRequests(prev => {
      const next = [
        ...prev,
        {
          id: dropId,
          itemId: item.itemId,
          label,
          position: [position.x + offsetX, position.y + 0.1, position.z + offsetZ],
          location: dropLocation,
          interiorId,
          material,
          appearance: item.appearance
        }
      ];
      return next.length > 200 ? next.slice(-200) : next;
    });

    setPickupToast({ message: `Dropped ${label}`, id: Date.now() });
  }, [interiorBuilding, interiorSpec, playerPositionRef, sceneMode, setPickupToast, setPlayerStats]);

  const handleDropItemAtScreen = useCallback((item: { inventoryId: string; itemId: string; label: string; appearance?: import('../types').ItemAppearance }, clientX: number, clientY: number) => {
    const { camera, gl } = r3fRef.current;
    if (!camera || !gl) {
      handleDropItem(item);
      return;
    }
    const rect = gl.domElement.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      handleDropItem(item);
      return;
    }
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    dropRaycaster.setFromCamera({ x, y }, camera);
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (dropRaycaster.ray.intersectPlane(plane, hit)) {
      handleDropItem(item, [hit.x, hit.y, hit.z]);
      return;
    }
    handleDropItem(item);
  }, [dropRaycaster, handleDropItem, r3fRef]);

  return {
    dropRequests,
    handlePickupItem,
    handleDropItem,
    handleDropItemAtScreen
  };
};
