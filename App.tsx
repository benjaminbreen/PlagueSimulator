
import React, { useState, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Simulation } from './components/Simulation';
import { InteriorScene } from './components/InteriorScene';
import { UI } from './components/UI';
import { MerchantModal } from './components/MerchantModal';
import { SimulationParams, SimulationStats, SimulationCounts, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, CONSTANTS, InteriorSpec, InteriorNarratorState, getLocationLabel, NPCStats, AgentState, MerchantNPC, MiniMapData } from './types';
import { generatePlayerStats, seededRandom } from './utils/procedural';
import { generateInteriorSpec } from './utils/interior';

function App() {
  const [params, setParams] = useState<SimulationParams>({
    infectionRate: 0.02,
    hygieneLevel: 0.6,
    quarantine: false,
    simulationSpeed: 0.01,
    timeOfDay: 12,
    cameraMode: CameraMode.THIRD_PERSON,
    mapX: 0,
    mapY: 0,
    uiMinimized: false,
  });

  const [stats, setStats] = useState<SimulationStats>({
    healthy: 0,
    incubating: 0,
    infected: 0,
    deceased: 0,
    daysPassed: 0,
    simTime: 0,
  });

  const [transitioning, setTransitioning] = useState(false);
  const [nearBuilding, setNearBuilding] = useState<BuildingMetadata | null>(null);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [sceneMode, setSceneMode] = useState<'outdoor' | 'interior'>('outdoor');
  const [interiorSpec, setInteriorSpec] = useState<InteriorSpec | null>(null);
  const [interiorNarrator, setInteriorNarrator] = useState<InteriorNarratorState | null>(null);
  const [interiorBuilding, setInteriorBuilding] = useState<BuildingMetadata | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
  const [nearMerchant, setNearMerchant] = useState<MerchantNPC | null>(null);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [minimapData, setMinimapData] = useState<MiniMapData | null>(null);
  const [pickupPrompt, setPickupPrompt] = useState<string | null>(null);
  const [pickupToast, setPickupToast] = useState<{ message: string; id: number } | null>(null);
  const [currentWeather, setCurrentWeather] = useState<string>('CLEAR');
  const lastOutdoorMap = useRef<{ mapX: number; mapY: number } | null>(null);
  const playerSeed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const stats = generatePlayerStats(playerSeed);

    // Generate starting inventory
    const rand = () => seededRandom(playerSeed + 999);
    const startingInventory: import('./types').PlayerItem[] = [];

    // Basic starting items (2-3 random items)
    const basicItems = [
      { id: 'item-merchant-bread-seller-0', name: 'Dried Figs', quantity: 2 },
      { id: 'item-merchant-bread-seller-1', name: 'Olives', quantity: 3 },
      { id: 'item-merchant-bread-seller-2', name: 'Dried Apricots', quantity: 2 },
      { id: 'item-merchant-coppersmith-0', name: 'Leather Waterskin', quantity: 1 },
      { id: 'item-merchant-bread-seller-6', name: 'Candles (Set of 6)', quantity: 1 }
    ];

    const itemCount = 2 + Math.floor(rand() * 2); // 2-3 items
    for (let i = 0; i < itemCount; i++) {
      const item = basicItems[Math.floor(rand() * basicItems.length)];
      startingInventory.push({
        id: `player-start-${i}`,
        itemId: item.id,
        quantity: item.quantity,
        acquiredAt: 0
      });
    }

    // Profession-specific starting item
    if (stats.profession.includes('Merchant') || stats.profession.includes('Trader')) {
      startingInventory.push({
        id: 'player-start-merchant',
        itemId: 'item-merchant-merchant-3', // Leather Satchel
        quantity: 1,
        acquiredAt: 0
      });
    } else if (stats.profession.includes('Apothecary') || stats.profession.includes('Herbalist')) {
      startingInventory.push({
        id: 'player-start-herbalist',
        itemId: 'item-merchant-apothecary-0', // Dates
        quantity: 3,
        acquiredAt: 0
      });
    } else if (stats.profession.includes('Guard') || stats.profession.includes('Soldier')) {
      startingInventory.push({
        id: 'player-start-guard',
        itemId: 'item-merchant-metalsmith-0', // Damascus Steel Dagger
        quantity: 1,
        acquiredAt: 0
      });
    }

    return {
      ...stats,
      currency: 100, // Starting dirhams
      inventory: startingInventory,
      maxInventorySlots: 20
    };
  });
  const [devSettings, setDevSettings] = useState<DevSettings>({
    enabled: false,
    weatherOverride: 'auto',
    cloudCoverOverride: null,
    humidityOverride: null,
    fogDensityScale: 1,
    showPerfPanel: false,
    showHoverWireframe: false,
    showShadows: true,
    showClouds: true,
    showFog: true,
    showTorches: true,
    showNPCs: true,
    showRats: true,
    showMiasma: true,
  });

  useEffect(() => {
    if (sceneMode === 'interior') {
      setMinimapData(null);
    }
    setPickupPrompt(null);
  }, [sceneMode]);

  useEffect(() => {
    if (!pickupToast) return;
    const timeout = window.setTimeout(() => {
      setPickupToast(prev => (prev?.id === pickupToast.id ? null : prev));
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [pickupToast]);

  // Performance tracking for adaptive resolution
  const [performanceDegraded, setPerformanceDegraded] = useState(false);

  // Time tracking
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 10000;
      lastTime = now;

      if (params.simulationSpeed > 0) {
        const simHoursDelta = dt * params.simulationSpeed / CONSTANTS.REAL_SECONDS_PER_SIM_HOUR;
        
        setStats(prev => ({
          ...prev,
          simTime: prev.simTime + simHoursDelta,
          daysPassed: (prev.simTime + simHoursDelta) / 24,
        }));

        setParams(prev => {
          let newTime = prev.timeOfDay + simHoursDelta;
          if (newTime >= 24) newTime -= 24;
          return { ...prev, timeOfDay: newTime };
        });
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [params.simulationSpeed]);

  // Global Key Listener for Interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sceneMode === 'interior' && e.key === 'Escape') {
        setSceneMode('outdoor');
        setInteriorSpec(null);
        setInteriorNarrator(null);
        setInteriorBuilding(null);
        return;
      }
      if (e.key === 'Enter' && sceneMode === 'outdoor' && nearBuilding && nearBuilding.isOpen && !showEnterModal) {
        setShowEnterModal(true);
      }
      // Open merchant modal with 'E' key
      if (e.key === 'e' && sceneMode === 'outdoor' && nearMerchant && !showMerchantModal) {
        setShowMerchantModal(true);
      }
      // Close merchant modal with Escape
      if (e.key === 'Escape' && showMerchantModal) {
        setShowMerchantModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearBuilding, showEnterModal, nearMerchant, showMerchantModal, sceneMode]);

  const handleMapChange = useCallback((dx: number, dy: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setParams(prev => ({
        ...prev,
        mapX: prev.mapX + dx,
        mapY: prev.mapY + dy,
      }));
      setTransitioning(false);
    }, 600);
  }, []);

  const handleFastTravel = useCallback((x: number, y: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setParams(prev => ({
        ...prev,
        mapX: x,
        mapY: y,
      }));
      setTransitioning(false);
    }, 800);
  }, []);

  const handleStatsUpdate = useCallback((counts: SimulationCounts) => {
    setStats(prev => ({ ...prev, ...counts }));
  }, []);

  const hashToSeed = useCallback((input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
  }, []);

  const enterInterior = useCallback((building: BuildingMetadata) => {
    const seed = hashToSeed(building.id);
    const spec = generateInteriorSpec(building, seed);
    setInteriorSpec(spec);
    setInteriorNarrator(spec.narratorState);
    setInteriorBuilding(building);
    lastOutdoorMap.current = { mapX: params.mapX, mapY: params.mapY };
    setNearBuilding(null);
    setSceneMode('interior');
  }, [hashToSeed, params.mapX, params.mapY]);

  const handlePurchase = useCallback((item: import('./types').MerchantItem, quantity: number) => {
    if (!nearMerchant) return;

    const finalPrice = Math.round(item.basePrice * nearMerchant.haggleModifier) * quantity;

    // Check if player can afford
    if (playerStats.currency < finalPrice) {
      console.log('Cannot afford this item');
      return;
    }

    // Check if merchant has stock
    if (item.quantity < quantity) {
      console.log('Merchant does not have enough stock');
      return;
    }

    // Check inventory space
    const currentInventorySize = playerStats.inventory.reduce((sum, i) => sum + i.quantity, 0);
    if (currentInventorySize + quantity > playerStats.maxInventorySlots) {
      console.log('Not enough inventory space');
      return;
    }

    // Update player stats
    setPlayerStats(prev => {
      // Deduct currency
      const newCurrency = prev.currency - finalPrice;

      // Add to inventory (or update existing)
      const existingItemIndex = prev.inventory.findIndex(i => i.itemId === item.id);
      let newInventory = [...prev.inventory];

      if (existingItemIndex >= 0) {
        newInventory[existingItemIndex] = {
          ...newInventory[existingItemIndex],
          quantity: newInventory[existingItemIndex].quantity + quantity
        };
      } else {
        newInventory.push({
          id: `player-item-${Date.now()}`,
          itemId: item.id,
          quantity,
          acquiredAt: stats.simTime
        });
      }

      return {
        ...prev,
        currency: newCurrency,
        inventory: newInventory
      };
    });

    // Update merchant inventory (reduce quantity)
    setNearMerchant(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          items: prev.inventory.items.map(i =>
            i.id === item.id
              ? { ...i, quantity: i.quantity - quantity }
              : i
          )
        }
      };
    });
  }, [nearMerchant, playerStats.currency, playerStats.inventory, playerStats.maxInventorySlots, stats.simTime]);

  const handleSell = useCallback((playerItem: import('./types').PlayerItem, quantity: number) => {
    if (!nearMerchant) return;

    // Find the base item
    const baseItem = nearMerchant.inventory.items.find(i => i.id === playerItem.itemId);
    if (!baseItem) return;

    const sellPrice = Math.round(baseItem.basePrice * 0.7) * quantity;

    // Check if player has enough to sell
    const inventoryItem = playerStats.inventory.find(i => i.id === playerItem.id);
    if (!inventoryItem || inventoryItem.quantity < quantity) {
      console.log('Not enough items to sell');
      return;
    }

    // Update player stats
    setPlayerStats(prev => {
      // Add currency
      const newCurrency = prev.currency + sellPrice;

      // Remove from inventory
      let newInventory = prev.inventory.map(i =>
        i.id === playerItem.id
          ? { ...i, quantity: i.quantity - quantity }
          : i
      ).filter(i => i.quantity > 0); // Remove items with 0 quantity

      return {
        ...prev,
        currency: newCurrency,
        inventory: newInventory
      };
    });
  }, [nearMerchant, playerStats.inventory]);

  const handlePickupItem = useCallback((pickup: import('./utils/pushables').PickupInfo) => {
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
          acquiredAt: stats.simTime
        });
      }
      setPickupToast({ message: `Picked up ${pickup.label}`, id: Date.now() });
      return {
        ...prev,
        inventory: newInventory
      };
    });
  }, [stats.simTime]);

  useEffect(() => {
    if (interiorNarrator) {
      (window as any).__interiorState = interiorNarrator;
    }
  }, [interiorNarrator]);

  const getBuildingLabel = (type: BuildingType) => {
    switch (type) {
      case BuildingType.RESIDENTIAL: return 'Private Residence';
      case BuildingType.COMMERCIAL: return 'Merchant Stall';
      case BuildingType.RELIGIOUS: return 'Holy Sanctuary';
      case BuildingType.CIVIC: return 'Governor\'s Office';
      default: return 'Structure';
    }
  };
  const interiorInfo = useMemo(() => {
    if (sceneMode !== 'interior' || !interiorSpec) return null;
    const building = interiorBuilding;
    const location = getLocationLabel(params.mapX, params.mapY);
    const ownerName = building?.ownerName ?? 'Resident';
    const profession = building?.ownerProfession ?? interiorSpec.profession;
    const type = building?.type ?? interiorSpec.buildingType;
    const lowerProf = profession.toLowerCase();
    let placeLabel = getBuildingLabel(type);
    if (type === BuildingType.COMMERCIAL) {
      if (lowerProf.includes('inn') || lowerProf.includes('sherbet')) placeLabel = 'Cafe';
      else if (lowerProf.includes('khan') || lowerProf.includes('caravanserai')) placeLabel = 'Caravanserai';
      else placeLabel = 'Shop';
    }
    const guestCount = Math.max(0, interiorSpec.npcs.filter((npc) => npc.role !== 'owner').length);
    const guestLabel = guestCount === 0 ? 'No other customers present' : `Other customers present: ${guestCount}`;
    return `${placeLabel} of ${ownerName} in the ${location} district. ${guestLabel}.`;
  }, [sceneMode, interiorSpec, interiorBuilding, params.mapX, params.mapY]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <div 
        className={`absolute inset-0 z-50 bg-black transition-opacity duration-500 pointer-events-none ${
          transitioning ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      <UI
        params={params}
        setParams={setParams}
        stats={stats}
        playerStats={playerStats}
        devSettings={devSettings}
        setDevSettings={setDevSettings}
        nearBuilding={nearBuilding}
        onFastTravel={handleFastTravel}
        selectedNpc={selectedNpc}
        minimapData={minimapData}
        sceneMode={sceneMode}
        pickupPrompt={pickupPrompt}
        pickupToast={pickupToast?.message ?? null}
        currentWeather={currentWeather}
      />

      {/* Subtle Performance Indicator - only shows when adjusting */}
      {performanceDegraded && devSettings.showPerfPanel && (
        <div className="absolute top-2 right-2 bg-black/60 text-yellow-400 text-xs px-3 py-1.5 rounded-md border border-yellow-600/30 backdrop-blur-sm font-mono z-50">
          ⚡ Adaptive Quality Active
        </div>
      )}

      {/* Building Interaction Modal */}
      {showEnterModal && nearBuilding && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#f2e7d5] border-4 border-amber-900/50 p-8 rounded-lg shadow-2xl max-w-md w-full text-center historical-font relative overflow-hidden">
            {/* Parchment effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

            <h2 className="text-3xl text-amber-900 mb-6 tracking-tighter uppercase font-bold border-b border-amber-900/20 pb-4">
              Enter {getBuildingLabel(nearBuilding.type)}?
            </h2>

            <p className="text-amber-950 text-xl mb-8 leading-relaxed">
              Enter the {getBuildingLabel(nearBuilding.type)} of the {nearBuilding.ownerProfession} <span className="font-bold text-amber-900">{nearBuilding.ownerName}</span>?
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowEnterModal(false);
                  enterInterior(nearBuilding);
                }}
                className="bg-amber-900 hover:bg-amber-800 text-white px-10 py-3 rounded-full tracking-widest transition-all shadow-lg active:scale-95"
              >
                YES
              </button>
              <button
                onClick={() => setShowEnterModal(false)}
                className="bg-transparent border-2 border-amber-900 text-amber-900 hover:bg-amber-900/10 px-10 py-3 rounded-full tracking-widest transition-all active:scale-95"
              >
                NOT NOW
              </button>
            </div>

            <div className="mt-8 text-[10px] text-amber-900/40 uppercase tracking-widest">
              Seek refuge or seek fortune within.
            </div>
          </div>
        </div>
      )}

      {/* Merchant Modal */}
      {showMerchantModal && nearMerchant && (
        <MerchantModal
          merchant={nearMerchant}
          playerStats={playerStats}
          onClose={() => setShowMerchantModal(false)}
          onPurchase={handlePurchase}
          onSell={handleSell}
        />
      )}

      {sceneMode === 'interior' && interiorInfo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[11px] tracking-wide z-50 pointer-events-none max-w-[88vw] text-center">
          {interiorInfo}
        </div>
      )}
      {sceneMode === 'interior' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[10px] uppercase tracking-widest z-50 pointer-events-none">
          Press Esc to Exit
        </div>
      )}

      {/* Merchant Interaction Prompt */}
      {sceneMode === 'outdoor' && nearMerchant && !showMerchantModal && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">E</span> to trade with {nearMerchant.stats.name}
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [20, 20, 20], fov: 45 }}
        dpr={[1, 2]}
        gl={{ toneMappingExposure: 1.05 }}
        onPointerDownCapture={() => setSelectedNpc(null)}
        onPointerMissed={() => setSelectedNpc(null)}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        {/* Adaptive Performance - automatically adjusts resolution based on FPS */}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <PerformanceMonitor
          onIncline={() => setPerformanceDegraded(false)}
          onDecline={() => setPerformanceDegraded(true)}
          flipflops={3}
          onChange={({ factor }) => {
            // Log performance changes in dev mode
            if (devSettings.enabled && devSettings.showPerfPanel) {
              console.log(`Performance factor: ${factor.toFixed(2)}x`);
            }
          }}
        />

        <Suspense fallback={null}>
          {!transitioning && sceneMode === 'outdoor' && (
            <Simulation
              params={params}
              simTime={stats.simTime}
              devSettings={devSettings}
              playerStats={playerStats}
              onStatsUpdate={handleStatsUpdate}
              onMapChange={handleMapChange}
              onNearBuilding={setNearBuilding}
              onNearMerchant={setNearMerchant}
              onNpcSelect={setSelectedNpc}
              selectedNpcId={selectedNpc?.stats.id ?? null}
              onMinimapUpdate={setMinimapData}
              onPickupPrompt={setPickupPrompt}
              onPickupItem={handlePickupItem}
              onWeatherUpdate={setCurrentWeather}
            />
          )}
          {!transitioning && sceneMode === 'interior' && interiorSpec && (
            <InteriorScene
              spec={interiorSpec}
              params={params}
              playerStats={playerStats}
              onPickupPrompt={setPickupPrompt}
              onPickupItem={handlePickupItem}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
