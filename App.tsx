
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MoraleStats } from './components/Agents';
import { SimulationParams, SimulationStats, SimulationCounts, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, CONSTANTS, InteriorSpec, InteriorNarratorState, InteriorPropType, getLocationLabel, getDistrictType, NPCStats, AgentState, MerchantNPC, MiniMapData, ActionSlotState, ActionId, PLAYER_ACTIONS, PlayerActionEvent, ConversationSummary, NpcStateOverride, NPCRecord, BuildingInfectionState, PlagueType, SocialClass } from './types';
import { generatePlayerStats, seededRandom } from './utils/procedural';
import { generateInteriorSpec } from './utils/interior';
import { createTileNPCRegistry, getTileKey, hashToSeed as hashToSeedTile } from './utils/npcRegistry';
import { shouldNpcBeHome } from './utils/npcSchedule';
import { advanceNpcHealth, applyHouseholdExposure, ensureNpcPlagueMeta, resetNpcPlagueMeta } from './utils/npcHealth';
import { updateBuildingInfections } from './utils/buildingInfection';
import { initializePlague, progressPlague, getPlagueTypeLabel, exposePlayerToPlague } from './utils/plague';
import { SimulationShell } from './components/SimulationShell';
import { AppShell } from './components/AppShell';
import { usePlagueMonitor } from './hooks/usePlagueMonitor';
import { useSimulationClock } from './hooks/useSimulationClock';
import { useModalState } from './hooks/useModalState';
import { useInventoryInteractions } from './hooks/useInventoryInteractions';
import { useEncounterState } from './hooks/useEncounterState';
import { checkBiomeRandomEvent, getBiomeForDistrict } from './utils/eventTriggers';
import { ToastMessage } from './components/Toast';
import { LootItem } from './components/LootModal';
import { calculateDirection, formatDistrictName } from './utils/directions';
import { buildObservePrompt } from './utils/observeContext';
import { useObserveMode } from './hooks/useObserveMode';
import { useOverworldPath } from './hooks/useOverworldPath';
import { useEventSystem } from './hooks/useEventSystem';

function App() {
  const [params, setParams] = useState<SimulationParams>({
    infectionRate: 0.02,
    hygieneLevel: 0.6,
    quarantine: false,
    simulationSpeed: 1,
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
  const [mapEntrySpawn, setMapEntrySpawn] = useState<{ mapX: number; mapY: number; position: [number, number, number] } | null>(null);
  const overworldPath = useOverworldPath(params.mapX, params.mapY, stats.simTime);
  const [gameLoading, setGameLoading] = useState(true); // Initial loading state
  const [nearBuilding, setNearBuilding] = useState<BuildingMetadata | null>(null);
  const {
    showEnterModal,
    setShowEnterModal,
    showMerchantModal,
    setShowMerchantModal,
    showPlayerModal,
    setShowPlayerModal,
    showEncounterModal,
    setShowEncounterModal,
    showGuideModal,
    setShowGuideModal,
    lootModalData,
    setLootModalData
  } = useModalState();
  const [sceneMode, setSceneMode] = useState<'outdoor' | 'interior'>('outdoor');
  const [interiorSpec, setInteriorSpec] = useState<InteriorSpec | null>(null);
  const [interiorNarrator, setInteriorNarrator] = useState<InteriorNarratorState | null>(null);
  const [interiorBuilding, setInteriorBuilding] = useState<BuildingMetadata | null>(null);
  const [activeInteriorFloor, setActiveInteriorFloor] = useState(0);
  const {
    selectedNpc,
    setSelectedNpc,
    nearSpeakableNpc,
    setNearSpeakableNpc,
    isNPCInitiatedEncounter,
    setIsNPCInitiatedEncounter,
    isFollowingAfterDismissal,
    setIsFollowingAfterDismissal,
    selectedNpcActivity,
    setSelectedNpcActivity,
    selectedNpcNearbyInfected,
    setSelectedNpcNearbyInfected,
    selectedNpcNearbyDeceased,
    setSelectedNpcNearbyDeceased,
    selectedNpcRumors,
    setSelectedNpcRumors
  } = useEncounterState();
  const lastOutdoorIdsRef = useRef<string[]>([]);
  const lastStatsUpdateRef = useRef(0);
  const lastMoraleUpdateRef = useRef(0);
  const pushTriggerRef = useRef<number | null>(null);
  const scheduleWorkRef = useRef<{
    registry: { npcMap: Map<string, NPCRecord>; lastScheduleSimTime: number };
    phase: number;
  } | null>(null);
  const [perfDebug, setPerfDebug] = useState({
    schedulePhase: -1,
    scheduleActive: false,
    lastScheduleMs: 0,
    lastScheduleSimTime: 0
  });
  const [nearMerchant, setNearMerchant] = useState<MerchantNPC | null>(null);
  const [nearChest, setNearChest] = useState<{ id: string; label: string; position: [number, number, number]; locationName: string } | null>(null);
  const [nearBirdcage, setNearBirdcage] = useState<{ id: string; label: string; position: [number, number, number]; locationName: string } | null>(null);
  const [nearStairs, setNearStairs] = useState<{ id: string; label: string; position: [number, number, number]; type: InteriorPropType } | null>(null);
  const [selectedGuideEntryId, setSelectedGuideEntryId] = useState<string | null>(null);
  const [worldFlags, setWorldFlags] = useState<Record<string, boolean | number | string>>(() => {
    try {
      const raw = localStorage.getItem('worldFlags');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const npcThreatMemoryRef = useRef<Record<string, { count: number; lastSimTime: number }>>({});
  const [showDemographicsOverlay, setShowDemographicsOverlay] = useState(false);
  const [npcStateOverride, setNpcStateOverride] = useState<NpcStateOverride | null>(null);
  const [tileBuildings, setTileBuildings] = useState<BuildingMetadata[]>([]);
  const [outdoorNpcPool, setOutdoorNpcPool] = useState<NPCRecord[]>([]);
  const [buildingInfectionState, setBuildingInfectionState] = useState<Record<string, BuildingInfectionState>>({});
  const tileRegistriesRef = useRef<Map<string, { npcMap: Map<string, NPCRecord>; lastScheduleSimTime: number }>>(new Map());
  const buildingInfectionRef = useRef<Map<string, Map<string, BuildingInfectionState>>>(new Map());
  const npcActivityRef = useRef<Map<string, { lastPos: THREE.Vector3; lastSimTime: number; activity: string; location: 'outdoor' | 'interior' }>>(new Map());
  const rumorPoolRef = useRef<Map<import('./types').DistrictType, Array<{ text: string; simTime: number }>>>(new Map());
  const scheduleTickRef = useRef(0);
  const offscreenHealthCursorRef = useRef(0);
  const simTimeRef = useRef(0);
  const timeOfDayRef = useRef(12);
  const lastSimCommitRef = useRef(0);
  const seededInitialInfectionsRef = useRef(false);
  const [minimapData, setMinimapData] = useState<MiniMapData | null>(null);
  const [pickupPrompt, setPickupPrompt] = useState<string | null>(null);
  const [climbablePrompt, setClimbablePrompt] = useState<string | null>(null);
  const [isClimbing, setIsClimbing] = useState(false);
  const climbInputRef = useRef<'up' | 'down' | 'cancel' | null>(null);
  const pickupTriggerRef = useRef<boolean>(false);  // Mobile/touch trigger for pickup
  const climbTriggerRef = useRef<boolean>(false);   // Mobile/touch trigger for initiating climb
  const [pickupToast, setPickupToast] = useState<{ message: string; id: number } | null>(null);
  const r3fRef = useRef<{ camera: THREE.Camera | null; gl: THREE.WebGLRenderer | null }>({ camera: null, gl: null });
  const dropRaycaster = useMemo(() => new THREE.Raycaster(), []);
  const [pushCharge, setPushCharge] = useState(0);
  const [currentWeather, setCurrentWeather] = useState<string>('CLEAR');
  const [moraleStats, setMoraleStats] = useState<MoraleStats>({
    avgAwareness: 0,
    avgPanic: 0,
    agentCount: 0
  });
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const toastIdCounter = useRef(0);
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [cameraViewTarget, setCameraViewTarget] = useState<[number, number, number] | null>(null);
  // Handle navigation to infected household
  const handleNavigateToHousehold = useCallback((buildingPosition: [number, number, number]) => {
    // Switch to overhead camera mode
    setParams(prev => ({ ...prev, cameraMode: CameraMode.OVERHEAD }));
    // Set camera view target (only moves camera, not player)
    // Will stay locked until player moves
    setCameraViewTarget(buildingPosition);
  }, []);

  // Clear camera view target when player starts moving
  const handlePlayerStartMove = useCallback(() => {
    if (cameraViewTarget) {
      setCameraViewTarget(null);
    }
  }, [cameraViewTarget]);

  const getDistrictScale = useCallback((district: ReturnType<typeof getDistrictType>) => {
    if (district === 'WEALTHY') return 1.35;
    if (district === 'HOVELS') return 0.65;
    if (district === 'CIVIC') return 1.2;
    return 1.0;
  }, []);

  const exitInterior = useCallback(() => {
    if (!interiorBuilding) {
      setSceneMode('outdoor');
      setInteriorSpec(null);
      setInteriorNarrator(null);
      setInteriorBuilding(null);
      setActiveInteriorFloor(0);
      setNearStairs(null);
      return;
    }
    const district = interiorBuilding.district ?? getDistrictType(params.mapX, params.mapY);
    const districtScale = getDistrictScale(district);
    const half = (CONSTANTS.BUILDING_SIZE * districtScale * (interiorBuilding.sizeScale ?? 1)) / 2;
    const offset = half + 1.6;
    const [bx, by, bz] = interiorBuilding.position;
    const doorSide = interiorBuilding.doorSide;
    const spawn: [number, number, number] = doorSide === 0
      ? [bx, by, bz + offset]
      : doorSide === 1
        ? [bx, by, bz - offset]
        : doorSide === 2
          ? [bx + offset, by, bz]
          : [bx - offset, by, bz];
    setMapEntrySpawn({ mapX: params.mapX, mapY: params.mapY, position: spawn });
    setSceneMode('outdoor');
    setInteriorSpec(null);
    setInteriorNarrator(null);
    setInteriorBuilding(null);
    setActiveInteriorFloor(0);
    setNearStairs(null);
  }, [getDistrictScale, interiorBuilding, params.mapX, params.mapY]);

  // Calculate infected households for epidemic report
  const infectedHouseholds = useMemo(() => {
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (!registry || !buildingInfectionState) return [];

    const households: import('./types').InfectedHouseholdInfo[] = [];
    const buildingMap = new Map(tileBuildings.map(b => [b.id, b]));

    // Group NPCs by building
    const npcsByBuilding = new Map<string, NPCRecord[]>();
    registry.npcMap.forEach((record) => {
      if (!record.homeBuildingId) return;
      const building = buildingMap.get(record.homeBuildingId);
      if (!building) return;
      const infectionState = buildingInfectionState[record.homeBuildingId];
      if (!infectionState || infectionState.status === 'clear') return;

      if (!npcsByBuilding.has(record.homeBuildingId)) {
        npcsByBuilding.set(record.homeBuildingId, []);
      }
      npcsByBuilding.get(record.homeBuildingId)!.push(record);
    });

    // Create household entries
    npcsByBuilding.forEach((npcs, buildingId) => {
      const building = buildingMap.get(buildingId);
      if (!building) return;

      const infectionState = buildingInfectionState[buildingId];
      if (!infectionState || infectionState.status === 'clear') return;

      const infectedCount = npcs.filter(n => n.state === AgentState.INFECTED).length;
      const deceasedCount = npcs.filter(n => n.state === AgentState.DECEASED).length;

      // Find a representative NPC (owner or first infected/deceased)
      const owner = npcs.find(n => n.role === 'owner');
      const representativeNpc = owner || npcs[0];

      if (representativeNpc) {
        const direction = calculateDirection(
          playerPositionRef.current.x,
          playerPositionRef.current.z,
          building.position[0],
          building.position[2]
        );

        households.push({
          buildingId,
          npcName: representativeNpc.stats.name,
          direction,
          status: infectionState.status as 'infected' | 'deceased',
          infectedCount,
          deceasedCount,
          buildingPosition: building.position
        });
      }
    });

    // Sort by severity (deceased first, then infected)
    return households.sort((a, b) => {
      if (a.status === 'deceased' && b.status !== 'deceased') return -1;
      if (a.status !== 'deceased' && b.status === 'deceased') return 1;
      return 0;
    });
  }, [buildingInfectionState, tileBuildings, params.mapX, params.mapY]);

  // Conversation history state (session-only, keyed by NPC id)
  const [conversationHistories, setConversationHistories] = useState<ConversationSummary[]>([]);

  // Game over state (fall death, plague death, etc.)
  const [gameOver, setGameOver] = useState<{ reason: string; description: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('worldFlags', JSON.stringify(worldFlags));
    } catch {
      // Ignore storage errors.
    }
  }, [worldFlags]);

  // Initial loading screen - gives assets time to load before revealing game
  useEffect(() => {
    const timeout = window.setTimeout(() => setGameLoading(false), 2500);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleForceNpcState = useCallback((id: string, state: AgentState) => {
    setNpcStateOverride({ id, state, nonce: Date.now() });
    setSelectedNpc((prev) => {
      if (!prev || prev.stats.id !== id) return prev;
      return { ...prev, state };
    });
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (registry) {
      const record = registry.npcMap.get(id);
      if (record) {
        record.state = state;
        record.stateStartTime = stats.simTime;
        record.lastUpdateSimTime = stats.simTime;
      }
    }
  }, [params.mapX, params.mapY, stats.simTime]);

  const handleForceAllNpcState = useCallback((state: AgentState) => {
    setNpcStateOverride({ id: '*', state, nonce: Date.now() });
    setSelectedNpc((prev) => (prev ? { ...prev, state } : prev));
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (registry) {
      registry.npcMap.forEach((record) => {
        record.state = state;
        record.stateStartTime = stats.simTime;
        record.lastUpdateSimTime = stats.simTime;
      });
    }
  }, []);

  // Action system state
  const [actionSlots, setActionSlots] = useState<ActionSlotState>({
    slot1: 'warn',
    slot2: 'encourage',
    slot3: 'observe',
    cooldowns: { heal: 0, warn: 0, encourage: 0, observe: 0, pray: 0, trade: 0 },
    lastTriggered: null
  });
  const [actionEvent, setActionEvent] = useState<PlayerActionEvent | null>(null);

  const lastOutdoorMap = useRef<{ mapX: number; mapY: number } | null>(null);
  const playerSeed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);
  const forcedPlagueTimeRef = useRef(Math.max(1, seededRandom(playerSeed + 731) * 23));
  const forcedPlagueTriggeredRef = useRef(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const stats = generatePlayerStats(playerSeed, { districtType: getDistrictType(params.mapX, params.mapY) });

    // Generate starting inventory (profession/class/gender-aware)
    let s = playerSeed + 999;
    const rand = () => seededRandom(s++);
    const startingInventory: import('./types').PlayerItem[] = [];
    const addItem = (itemId: string, quantity = 1) => {
      startingInventory.push({
        id: `player-start-${startingInventory.length}`,
        itemId,
        quantity,
        acquiredAt: 0
      });
    };

    const pickUnique = (items: Array<{ id: string; quantity: number }>, count: number) => {
      const pool = [...items];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const index = Math.floor(rand() * pool.length);
        const choice = pool.splice(index, 1)[0];
        addItem(choice.id, choice.quantity);
      }
    };

    const classBasics: Array<{ id: string; quantity: number }> = [];
    if (stats.socialClass === SocialClass.PEASANT) {
      classBasics.push(
        { id: 'start-twine', quantity: 1 },
        { id: 'start-linen-scrap', quantity: 2 },
        { id: 'start-olives', quantity: 2 },
        { id: 'start-chickpeas', quantity: 2 },
        { id: 'start-candle-stub', quantity: 1 },
        { id: 'start-sandals', quantity: 1 },
        { id: 'start-copper-amulet', quantity: 1 }
      );
    } else if (stats.socialClass === SocialClass.MERCHANT) {
      classBasics.push(
        { id: 'start-waterskin', quantity: 1 },
        { id: 'start-candles', quantity: 1 },
        { id: 'start-satchel', quantity: 1 },
        { id: 'start-dates', quantity: 2 },
        { id: 'start-olives', quantity: 2 },
        { id: 'start-coin-purse', quantity: 1 },
        { id: 'start-sandals', quantity: 1 },
        { id: 'start-prayer-beads', quantity: 1 }
      );
    } else if (stats.socialClass === SocialClass.CLERGY) {
      classBasics.push(
        { id: 'start-prayer-rug', quantity: 1 },
        { id: 'start-incense', quantity: 1 },
        { id: 'start-manuscript', quantity: 1 },
        { id: 'start-candles', quantity: 1 },
        { id: 'start-prayer-beads', quantity: 1 },
        { id: 'start-writing-reed', quantity: 2 },
        { id: 'start-soap', quantity: 1 }
      );
    } else if (stats.socialClass === SocialClass.NOBILITY) {
      classBasics.push(
        { id: 'start-satchel', quantity: 1 },
        { id: 'start-perfume', quantity: 1 },
        { id: 'start-rose-water', quantity: 1 },
        { id: 'start-pistachios', quantity: 2 },
        { id: 'start-sugar', quantity: 1 },
        { id: 'start-kohl-container', quantity: 1 },
        { id: 'start-soap', quantity: 1 }
      );
    }

    const genderBasics: Array<{ id: string; quantity: number }> = [];
    if (stats.gender === 'Female') {
      genderBasics.push(
        { id: 'start-headscarf', quantity: 1 },
        { id: 'start-kohl', quantity: 1 },
        { id: 'start-henna', quantity: 1 }
      );
    } else {
      genderBasics.push(
        { id: 'start-belt-sash', quantity: 1 },
        { id: 'start-kohl', quantity: 1 }
      );
    }

    const professionBasics: Array<{ id: string; quantity: number }> = [];
    if (stats.profession.match(/Merchant|Trader|Draper|Textile|Weaver|Dyer|Carpenter/i)) {
      professionBasics.push(
        { id: 'start-linen-cloth', quantity: 1 },
        { id: 'start-indigo', quantity: 1 }
      );
    }
    if (stats.profession.match(/Apothecary|Herbalist|Hakim/i)) {
      professionBasics.push(
        { id: 'start-mint', quantity: 2 },
        { id: 'start-aloe', quantity: 1 },
        { id: 'start-honey', quantity: 1 },
        { id: 'start-myrrh', quantity: 1 }
      );
    }
    if (stats.profession.match(/Midwife|Washer of the Dead/i)) {
      professionBasics.push(
        { id: 'start-burial-shroud', quantity: 1 },
        { id: 'start-camphor', quantity: 1 },
        { id: 'start-soap', quantity: 1 }
      );
    }
    if (stats.profession.match(/Henna Artist|Matchmaker/i)) {
      professionBasics.push(
        { id: 'start-henna', quantity: 2 },
        { id: 'start-kohl', quantity: 1 },
        { id: 'start-rose-water', quantity: 1 }
      );
    }
    if (stats.profession.match(/Coppersmith|Metalsmith|Blacksmith|Goldsmith/i)) {
      professionBasics.push(
        { id: 'start-bronze-bell', quantity: 1 },
        { id: 'start-iron-nails', quantity: 2 },
        { id: 'start-iron-key', quantity: 1 }
      );
    }
    if (stats.profession.match(/Guard|Soldier|Officer|Mamluk/i)) {
      professionBasics.push(
        { id: 'start-dagger', quantity: 1 },
        { id: 'start-waterskin', quantity: 1 }
      );
    }
    if (stats.profession.match(/Bread Seller|Water-Carrier|Porter|Servant|Cook|Innkeeper/i)) {
      professionBasics.push(
        { id: 'start-waterskin', quantity: 1 },
        { id: 'start-sesame-oil', quantity: 1 }
      );
    }
    if (stats.profession.match(/Imam|Muezzin|Qadi|Sufi|Scholar|Scribe/i)) {
      professionBasics.push(
        { id: 'start-writing-reed', quantity: 3 },
        { id: 'start-manuscript', quantity: 1 },
        { id: 'start-prayer-beads', quantity: 1 }
      );
    }
    if (stats.profession.match(/Silk|Spice|Grain|Commercial Agent|Funduq/i)) {
      professionBasics.push(
        { id: 'start-pistachios', quantity: 1 },
        { id: 'start-pepper', quantity: 1 },
        { id: 'start-satchel', quantity: 1 }
      );
    }
    if (stats.profession.match(/Barber/i)) {
      professionBasics.push(
        { id: 'start-soap', quantity: 1 },
        { id: 'start-aloe', quantity: 1 }
      );
    }

    pickUnique(classBasics, Math.max(3, Math.min(5, classBasics.length)));
    pickUnique(genderBasics, Math.min(2, genderBasics.length));
    pickUnique(professionBasics, Math.min(4, professionBasics.length));

    if (startingInventory.length < 4) {
      pickUnique(
        [
          { id: 'start-dates', quantity: 2 },
          { id: 'start-olives', quantity: 2 },
          { id: 'start-dried-figs', quantity: 2 },
          { id: 'start-apricots', quantity: 2 },
          { id: 'start-chickpeas', quantity: 2 },
          { id: 'start-pomegranate', quantity: 1 },
          { id: 'start-prayer-beads', quantity: 1 },
          { id: 'start-soap', quantity: 1 }
        ],
        4 - startingInventory.length
      );
    }

    return {
      ...stats,
      currency: 100, // Starting dirhams
      inventory: startingInventory,
      maxInventorySlots: 20,
      plague: initializePlague()
    };
  });

  // Plague notification state
  const [showPlagueModal, setShowPlagueModal] = useState(false);
  const [plagueNotification, setPlagueNotification] = useState<string | null>(null);
  const prevSimSpeedRef = useRef(params.simulationSpeed);

  usePlagueMonitor({
    plague: playerStats.plague,
    onShowInfectedModal: () => setShowPlagueModal(true),
    onNotify: (message) => setPlagueNotification(message),
    onDeath: (summary) => setGameOver(summary)
  });

  const handlePlagueModalPauseToggle = useCallback((paused: boolean) => {
    if (paused) {
      prevSimSpeedRef.current = params.simulationSpeed;
      setParams(prev => ({ ...prev, simulationSpeed: 0.01 }));
    } else {
      setParams(prev => ({
        ...prev,
        simulationSpeed: prev.simulationSpeed === 0.01 ? prevSimSpeedRef.current : prev.simulationSpeed
      }));
    }
  }, [params.simulationSpeed, setParams]);

  const handleClearSelectedNpc = useCallback(() => setSelectedNpc(null), []);
  const handlePlayerPositionUpdate = useCallback((pos: THREE.Vector3) => {
    playerPositionRef.current.copy(pos);
  }, []);
  const handleClimbInput = useCallback((dir: 'up' | 'down' | 'cancel') => {
    climbInputRef.current = dir;
  }, []);
  const handleTriggerPickup = useCallback(() => {
    pickupTriggerRef.current = true;
  }, []);
  const handleTriggerClimb = useCallback(() => {
    climbTriggerRef.current = true;
  }, []);
  const handleResetFollowingState = useCallback(() => setIsFollowingAfterDismissal(false), []);
  const handleDismissToast = useCallback((id: string) => {
    setToastMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const {
    dropRequests,
    handlePickupItem,
    handleDropItem,
    handleDropItemAtScreen
  } = useInventoryInteractions({
    sceneMode,
    interiorBuilding,
    interiorSpec,
    playerPositionRef,
    r3fRef,
    dropRaycaster,
    setPlayerStats,
    setPickupToast,
    simTime: stats.simTime
  });

  const observePrompt = useMemo(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const biome = getBiomeForDistrict(district);
    return buildObservePrompt({
      player: playerStats,
      params,
      district,
      biome,
      weather: currentWeather,
      sceneMode,
      interiorInfo: null,
      nearbyBuildings: tileBuildings
    });
  }, [currentWeather, params, playerStats, sceneMode, tileBuildings]);

  const {
    observeMode,
    observeLines,
    observeLineCount,
    startObserveMode,
    stopObserveMode
  } = useObserveMode({
    params,
    observePrompt,
    setParams,
    setShowEncounterModal,
    setShowMerchantModal,
    setShowEnterModal,
    setShowPlayerModal
  });

  const {
    activeEvent,
    llmEventsEnabled,
    setLlmEventsEnabled,
    lastEventNote,
    tryTriggerEvent,
    resolveEvent,
    handleConversationResult,
    handleTriggerConversationEvent,
    handleDebugEvent
  } = useEventSystem({
    params,
    currentWeather,
    playerStats,
    statsSimTime: stats.simTime,
    outdoorNpcPool,
    setOutdoorNpcPool,
    setConversationHistories,
    setPlayerStats,
    setSelectedNpc,
    setShowEncounterModal,
    setIsNPCInitiatedEncounter,
    setIsFollowingAfterDismissal,
    setWorldFlags,
    npcThreatMemoryRef
  });

  useEffect(() => {
    if (!activeEvent) return;
    setShowEncounterModal(false);
    setShowMerchantModal(false);
    setShowEnterModal(false);
  }, [activeEvent]);

  // Handle NPC-initiated encounters (friendly NPCs approaching the player)
  const handleNPCInitiatedEncounter = useCallback((npc: { stats: NPCStats; state: AgentState }) => {
    // Don't trigger if any modal is already open
    if (showMerchantModal || showEnterModal || showPlayerModal || showEncounterModal || activeEvent) return;

    tryTriggerEvent({
      when: 'npcApproach',
      targetType: 'npcProfession',
      targetId: npc.stats.profession,
      contextOverrides: {
        npc: {
          id: npc.stats.id,
          name: npc.stats.name,
          profession: npc.stats.profession,
          socialClass: npc.stats.socialClass,
          disposition: npc.stats.disposition,
          panic: npc.stats.panicLevel,
          religion: npc.stats.religion
        }
      },
      source: 'conversation'
    });

    setSelectedNpc(npc);
    setIsNPCInitiatedEncounter(true);
    setShowEncounterModal(true);
  }, [activeEvent, showMerchantModal, showEnterModal, showPlayerModal, showEncounterModal, tryTriggerEvent]);

  useEffect(() => {
    if (forcedPlagueTriggeredRef.current) return;
    if (playerStats.plague.state !== AgentState.HEALTHY) {
      forcedPlagueTriggeredRef.current = true;
      return;
    }
    if (stats.simTime < forcedPlagueTimeRef.current) return;

    const baseSeed = playerSeed + 9001;
    let infectedPlague = exposePlayerToPlague(playerStats.plague, 'airborne', 1, stats.simTime, baseSeed);
    if (infectedPlague.state === AgentState.HEALTHY) {
      infectedPlague = exposePlayerToPlague(playerStats.plague, 'flea', 1, stats.simTime, baseSeed + 1);
    }
    if (infectedPlague.state === AgentState.HEALTHY) {
      infectedPlague = exposePlayerToPlague(playerStats.plague, 'contact', 1, stats.simTime, baseSeed + 2);
    }
    if (infectedPlague.state === AgentState.HEALTHY) {
      infectedPlague = {
        ...playerStats.plague,
        state: AgentState.INCUBATING,
        exposureTime: stats.simTime,
        plagueType: playerStats.plague.plagueType === PlagueType.NONE ? PlagueType.BUBONIC : playerStats.plague.plagueType
      };
    }

    forcedPlagueTriggeredRef.current = true;
    setPlayerStats(prev => ({
      ...prev,
      plague: infectedPlague
    }));
  }, [playerSeed, playerStats.plague, stats.simTime]);

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
    showTorches: false,
    showNPCs: true,
    showRats: true,
    showMiasma: true,
    showCityWalls: true,
    showSoundDebug: false,
    showEventDebug: false,
  });

  useEffect(() => {
    if (sceneMode === 'interior') {
      setMinimapData(null);
    }
    setPickupPrompt(null);
  }, [sceneMode]);

  useEffect(() => {
    simTimeRef.current = stats.simTime;
  }, [stats.simTime]);

  useEffect(() => {
    timeOfDayRef.current = params.timeOfDay;
  }, [params.timeOfDay]);

  useEffect(() => {
    if (!pickupToast) return;
    const timeout = window.setTimeout(() => {
      setPickupToast(prev => (prev?.id === pickupToast.id ? null : prev));
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [pickupToast]);

  // Performance tracking for adaptive resolution
  const [performanceDegraded, setPerformanceDegraded] = useState(false);
  const [indicatorDismissed, setIndicatorDismissed] = useState(false);
  const lastPerfChangeRef = useRef(0);
  const shadowsDisabledByPerf = useRef(false); // Track if we disabled shadows due to low FPS
  const PERF_DEBOUNCE_MS = 2000; // Debounce performance state changes by 2 seconds
  const LOW_FPS_THRESHOLD = 5; // Disable shadows below this FPS

  useSimulationClock({
    simulationSpeed: params.simulationSpeed,
    simTimeRef,
    timeOfDayRef,
    lastSimCommitRef,
    setStats,
    setParams,
    setPlayerStats
  });

  // Handler for opening chests in interiors
  const handleOpenChest = useCallback((chest: { id: string; label: string; position: [number, number, number]; locationName: string }) => {
    // Generate random loot for the chest (1-3 items)
    const numItems = 1 + Math.floor(Math.random() * 3);
    const possibleItems = [
      // Common items
      { itemId: 'chest-silver-coin', itemName: 'Silver Dirham', rarity: 'common' as const, category: 'CURRENCY' },
      { itemId: 'chest-incense', itemName: 'Frankincense', rarity: 'common' as const, category: 'APOTHECARY' },
      { itemId: 'chest-medicine', itemName: 'Medicinal Herbs', rarity: 'common' as const, category: 'APOTHECARY' },
      { itemId: 'chest-scroll', itemName: 'Parchment Scroll', rarity: 'common' as const, category: 'SCHOLARLY' },
      { itemId: 'start-soap', itemName: 'Aleppo Soap', rarity: 'common' as const, category: 'TRADER' },
      { itemId: 'start-sesame-oil', itemName: 'Sesame Oil', rarity: 'common' as const, category: 'TRADER' },
      { itemId: 'start-copper-amulet', itemName: 'Copper Amulet', rarity: 'common' as const, category: 'METALSMITH' },
      { itemId: 'start-iron-key', itemName: 'Iron Key', rarity: 'common' as const, category: 'METALSMITH' },
      { itemId: 'start-prayer-beads', itemName: 'Prayer Beads', rarity: 'common' as const, category: 'TRADER' },
      { itemId: 'start-kohl', itemName: 'Kohl Powder', rarity: 'common' as const, category: 'APOTHECARY' },
      { itemId: 'start-henna', itemName: 'Henna Powder', rarity: 'common' as const, category: 'APOTHECARY' },
      // Uncommon items
      { itemId: 'chest-gold-coin', itemName: 'Gold Dinar', rarity: 'uncommon' as const, category: 'CURRENCY' },
      { itemId: 'chest-silk-cloth', itemName: 'Silk Fabric', rarity: 'uncommon' as const, category: 'TEXTILE' },
      { itemId: 'chest-spice', itemName: 'Precious Spices', rarity: 'uncommon' as const, category: 'TRADER' },
      { itemId: 'start-indigo', itemName: 'Indigo Dye Cake', rarity: 'uncommon' as const, category: 'TEXTILE' },
      { itemId: 'start-pistachios', itemName: 'Pistachio Nuts', rarity: 'uncommon' as const, category: 'TRADER' },
      { itemId: 'start-sugar', itemName: 'Sugar Loaf', rarity: 'uncommon' as const, category: 'TRADER' },
      { itemId: 'start-myrrh', itemName: 'Myrrh Resin', rarity: 'uncommon' as const, category: 'APOTHECARY' },
      { itemId: 'start-kohl-container', itemName: 'Silver Kohl Container', rarity: 'uncommon' as const, category: 'METALSMITH' },
      // Rare items
      { itemId: 'chest-jewelry', itemName: 'Silver Bracelet', rarity: 'rare' as const, category: 'METALSMITH' },
      { itemId: 'start-compass', itemName: 'Geometric Compass', rarity: 'rare' as const, category: 'METALSMITH' },
      { itemId: 'start-perfume', itemName: 'Musk Perfume', rarity: 'rare' as const, category: 'APOTHECARY' },
    ];

    const items: Array<{ itemId: string; itemName: string; rarity: 'common' | 'uncommon' | 'rare'; category: string }> = [];
    for (let i = 0; i < numItems; i++) {
      // Weight towards common items
      const roll = Math.random();
      const targetRarity = roll < 0.6 ? 'common' : roll < 0.9 ? 'uncommon' : 'rare';
      const eligible = possibleItems.filter(item => item.rarity === targetRarity);
      const selected = eligible.length > 0
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : possibleItems[Math.floor(Math.random() * possibleItems.length)];
      items.push(selected);
    }

    setLootModalData({
      type: 'chest',
      sourceObjectName: chest.label,
      sourceLocation: chest.locationName,
      items,
      isTheft: true,
    });

    // Clear near chest after opening
    setNearChest(null);
  }, [setLootModalData]);

  const handleOpenBirdcage = useCallback((birdcage: { id: string; label: string; position: [number, number, number]; locationName: string }) => {
    setLootModalData({
      type: 'chest',
      sourceObjectName: birdcage.label,
      sourceLocation: birdcage.locationName,
      items: [{
        itemId: 'caged-songbird',
        itemName: 'Caged Songbird',
        rarity: 'uncommon',
        category: 'ANIMAL'
      }],
      isTheft: true
    });

    setNearBirdcage(null);
  }, [setLootModalData]);

  // Mobile/touch trigger for speaking to NPC (equivalent to pressing E)
  const handleTriggerSpeakToNpc = useCallback(() => {
    if (nearSpeakableNpc && !nearMerchant && !showEncounterModal && !showMerchantModal && !showEnterModal && !showPlayerModal) {
      setSelectedNpc(nearSpeakableNpc);
      setIsNPCInitiatedEncounter(false);
      setIsFollowingAfterDismissal(false);
      tryTriggerEvent({
        when: 'npcApproach',
        targetType: 'npcProfession',
        targetId: nearSpeakableNpc.stats.profession,
        contextOverrides: {
          npc: {
            id: nearSpeakableNpc.stats.id,
            name: nearSpeakableNpc.stats.name,
            profession: nearSpeakableNpc.stats.profession,
            socialClass: nearSpeakableNpc.stats.socialClass,
            disposition: nearSpeakableNpc.stats.disposition,
            panic: nearSpeakableNpc.stats.panicLevel,
            religion: nearSpeakableNpc.stats.religion
          }
        },
        source: 'player'
      });
      setShowEncounterModal(true);
    }
  }, [nearSpeakableNpc, nearMerchant, showEncounterModal, showMerchantModal, showEnterModal, showPlayerModal, tryTriggerEvent]);

  // Mobile/touch trigger for trading with merchant (equivalent to pressing E near merchant)
  const handleTriggerMerchant = useCallback(() => {
    if (nearMerchant && !showMerchantModal && !showEncounterModal) {
      setShowMerchantModal(true);
      tryTriggerEvent({
        when: 'merchantOpen',
        targetType: 'merchantAny',
        targetId: 'any',
        source: 'environment'
      });
    }
  }, [nearMerchant, showMerchantModal, showEncounterModal, tryTriggerEvent]);

  // Mobile/touch trigger for opening chest (equivalent to pressing O)
  const handleTriggerOpenChest = useCallback(() => {
    if (nearChest && !lootModalData && !showMerchantModal && !showEncounterModal) {
      handleOpenChest(nearChest);
    }
  }, [nearChest, lootModalData, showMerchantModal, showEncounterModal, handleOpenChest]);

  const handleTriggerOpenBirdcage = useCallback(() => {
    if (nearBirdcage && !lootModalData && !showMerchantModal && !showEncounterModal) {
      handleOpenBirdcage(nearBirdcage);
    }
  }, [nearBirdcage, lootModalData, showMerchantModal, showEncounterModal, handleOpenBirdcage]);

  const handleTriggerUseStairs = useCallback(() => {
    if (sceneMode !== 'interior' || !interiorSpec || !nearStairs) return;
    const floors = interiorSpec.floors ?? [];
    if (floors.length < 2) return;
    const nextFloor = activeInteriorFloor === 0 ? 1 : 0;
    setActiveInteriorFloor(nextFloor);
    setInteriorNarrator(floors[nextFloor]?.narratorState ?? interiorSpec.narratorState);
    setNearStairs(null);
  }, [sceneMode, interiorSpec, nearStairs, activeInteriorFloor]);

  // Global Key Listener for Interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sceneMode === 'interior' && e.key === 'Escape') {
        setSceneMode('outdoor');
        setInteriorSpec(null);
        setInteriorNarrator(null);
        setInteriorBuilding(null);
        setActiveInteriorFloor(0);
        setNearStairs(null);
        return;
      }
      if (e.key === 'e' && sceneMode === 'interior' && nearStairs && !lootModalData && !showMerchantModal && !showEncounterModal && !showEnterModal && !showPlayerModal) {
        handleTriggerUseStairs();
        return;
      }
      if (e.key === 'Enter' && sceneMode === 'outdoor' && nearBuilding && nearBuilding.isOpen && !showEnterModal) {
        setShowEnterModal(true);
      }
      // Open merchant modal with 'E' key (merchants take priority over regular NPCs)
      if (e.key === 'e' && sceneMode === 'outdoor' && nearMerchant && !showMerchantModal && !showEncounterModal) {
        setShowMerchantModal(true);
        tryTriggerEvent({
          when: 'merchantOpen',
          targetType: 'merchantAny',
          targetId: 'any',
          source: 'environment'
        });
      }
      // Open encounter modal with 'E' key when near an NPC (but not if near a merchant)
      else if (e.key === 'e' && sceneMode === 'outdoor' && nearSpeakableNpc && !nearMerchant && !showEncounterModal && !showMerchantModal && !showEnterModal && !showPlayerModal) {
        setSelectedNpc(nearSpeakableNpc);
        setIsNPCInitiatedEncounter(false);
        setIsFollowingAfterDismissal(false);
        tryTriggerEvent({
          when: 'npcApproach',
          targetType: 'npcProfession',
          targetId: nearSpeakableNpc.stats.profession,
          contextOverrides: {
            npc: {
              id: nearSpeakableNpc.stats.id,
              name: nearSpeakableNpc.stats.name,
              profession: nearSpeakableNpc.stats.profession,
              socialClass: nearSpeakableNpc.stats.socialClass,
              disposition: nearSpeakableNpc.stats.disposition,
              panic: nearSpeakableNpc.stats.panicLevel,
              religion: nearSpeakableNpc.stats.religion
            }
          },
          source: 'player'
        });
        setShowEncounterModal(true);
      }
      // Close merchant modal with Escape
      if (e.key === 'Escape' && showMerchantModal) {
        setShowMerchantModal(false);
      }
      // Open chest with 'O' key when near a chest (works in both interior and outdoor)
      if (e.key === 'o' && nearChest && !lootModalData && !showMerchantModal && !showEncounterModal) {
        handleOpenChest(nearChest);
      }
      // Open birdcage with 'O' key when near a birdcage
      if (e.key === 'o' && !nearChest && nearBirdcage && !lootModalData && !showMerchantModal && !showEncounterModal) {
        handleOpenBirdcage(nearBirdcage);
      }
      if (e.key === '4' && selectedNpc && !showEncounterModal && !showMerchantModal && !showEnterModal && !showPlayerModal) {
        e.preventDefault();
        setIsNPCInitiatedEncounter(false); // Player-initiated, not NPC
        tryTriggerEvent({
          when: 'npcApproach',
          targetType: 'npcProfession',
          targetId: selectedNpc.stats.profession,
          contextOverrides: {
            npc: {
              id: selectedNpc.stats.id,
              name: selectedNpc.stats.name,
              profession: selectedNpc.stats.profession,
              socialClass: selectedNpc.stats.socialClass,
              disposition: selectedNpc.stats.disposition,
              panic: selectedNpc.stats.panicLevel,
              religion: selectedNpc.stats.religion
            }
          },
          source: 'conversation'
        });
        setShowEncounterModal(true);
      }
      if (e.key === 'Escape' && showEncounterModal) {
        setShowEncounterModal(false);
        setIsNPCInitiatedEncounter(false);
      }
      if (e.key === 'Escape' && observeMode) {
        stopObserveMode();
      }
      if (e.key === '3' && selectedNpc && !showEncounterModal && !showMerchantModal && !showEnterModal && !showPlayerModal) {
        e.preventDefault();
        setShowEncounterModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearBuilding, showEnterModal, nearMerchant, nearSpeakableNpc, showMerchantModal, sceneMode, selectedNpc, showEncounterModal, showPlayerModal, tryTriggerEvent, observeMode, stopObserveMode, nearChest, nearBirdcage, lootModalData, handleOpenChest, handleOpenBirdcage, nearStairs, handleTriggerUseStairs]);

  // Push trigger function
  const triggerPush = useCallback(() => {
    // Set push trigger ref to full charge (1.0)
    if (pushTriggerRef.current !== null) {
      pushTriggerRef.current = 1.0;
    }
  }, []);

  // Action trigger function
  const triggerAction = useCallback((actionId: ActionId) => {
    const action = PLAYER_ACTIONS[actionId];
    const currentTime = stats.simTime;

    // Check cooldown
    const cooldownEnd = actionSlots.cooldowns[actionId] || 0;
    if (currentTime < cooldownEnd) {
      return; // Still on cooldown
    }

    // Check charisma requirement
    if (action.requiresCharisma && playerStats.charisma < action.requiresCharisma) {
      return; // Doesn't meet requirement
    }

    if (actionId === 'observe') {
      startObserveMode();
      if (action.cooldownSeconds > 0) {
        setActionSlots(prev => ({
          ...prev,
          cooldowns: {
            ...prev.cooldowns,
            [actionId]: currentTime + action.cooldownSeconds
          },
          lastTriggered: {
            actionId,
            timestamp: Date.now(),
            position: [playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z]
          }
        }));
      }
      return;
    }

    // Create action event
    const event: PlayerActionEvent = {
      actionId,
      position: [playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z],
      timestamp: Date.now(),
      effect: action.effect,
      radius: action.radius
    };

    setActionEvent(event);

    // Set cooldown
    if (action.cooldownSeconds > 0) {
      setActionSlots(prev => ({
        ...prev,
        cooldowns: {
          ...prev.cooldowns,
          [actionId]: currentTime + action.cooldownSeconds
        },
        lastTriggered: {
          actionId,
          timestamp: Date.now(),
          position: event.position
        }
      }));
    }

    // Clear action event after a short delay
    setTimeout(() => setActionEvent(null), 500);
  }, [actionSlots.cooldowns, playerStats.charisma, stats.simTime]);

  // Action hotkey listener (1, 2, 3, 4, 5)
  useEffect(() => {
    const handleActionKey = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showMerchantModal || showEnterModal || showPlayerModal || showEncounterModal) return;
      if (sceneMode !== 'outdoor') return;

      if (e.key === '1') {
        // Push action
        e.preventDefault();
        triggerPush();
      } else if (e.key === '2') {
        // Inventory toggle - handled by ActionBar component
        // Don't prevent default here so ActionBar can handle it
      } else if (e.key === '3') {
        // Action slot 1 (was hotkey 1)
        e.preventDefault();
        if (selectedNpc) return; // Don't trigger if NPC is selected
        triggerAction(actionSlots.slot1);
      } else if (e.key === '4') {
        // Action slot 2 (was hotkey 2)
        e.preventDefault();
        triggerAction(actionSlots.slot2);
      } else if (e.key === '5') {
        // Action slot 3 (was hotkey 3)
        e.preventDefault();
        triggerAction(actionSlots.slot3);
      }
    };

    window.addEventListener('keydown', handleActionKey);
    return () => window.removeEventListener('keydown', handleActionKey);
  }, [actionSlots.slot1, actionSlots.slot2, actionSlots.slot3, triggerAction, triggerPush, showMerchantModal, showEnterModal, showPlayerModal, showEncounterModal, sceneMode, selectedNpc]);

  const handleMapChange = useCallback((dx: number, dy: number, entrySpawn?: [number, number, number]) => {
    setTransitioning(true);
    setTimeout(() => {
      const nextX = params.mapX + dx;
      const nextY = params.mapY + dy;
      if (entrySpawn) {
        setMapEntrySpawn({ mapX: nextX, mapY: nextY, position: entrySpawn });
      } else {
        setMapEntrySpawn(null);
      }
      const nextDistrict = getDistrictType(nextX, nextY);
      tryTriggerEvent({
        when: 'districtEnter',
        targetType: 'district',
        targetId: nextDistrict,
        contextOverrides: {
          environment: {
            district: nextDistrict,
            timeOfDay: params.timeOfDay,
            weather: currentWeather
          }
        },
        source: 'environment'
      });
      setParams(prev => ({
        ...prev,
        mapX: nextX,
        mapY: nextY,
      }));
      setTransitioning(false);
    }, 600);
  }, [currentWeather, params.mapX, params.mapY, params.timeOfDay, tryTriggerEvent]);

  useEffect(() => {
    setTileBuildings([]);
    setOutdoorNpcPool([]);
    setBuildingInfectionState({});
  }, [params.mapX, params.mapY]);

  const canvasCamera = useMemo(() => ({ position: [20, 20, 20] as [number, number, number], fov: 45 }), []);
  const canvasDpr = useMemo(() => (performanceDegraded ? [1, 1.35] : [1, 1.7]) as [number, number], [performanceDegraded]);
  const canvasGl = useMemo(() => ({ toneMappingExposure: 1.05 }), []);

  const handleFastTravel = useCallback((x: number, y: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setMapEntrySpawn(null);
      const nextDistrict = getDistrictType(x, y);
      tryTriggerEvent({
        when: 'districtEnter',
        targetType: 'district',
        targetId: nextDistrict,
        contextOverrides: {
          environment: {
            district: nextDistrict,
            timeOfDay: params.timeOfDay,
            weather: currentWeather
          }
        },
        source: 'environment'
      });
      setParams(prev => ({
        ...prev,
        mapX: x,
        mapY: y,
      }));
      setTransitioning(false);
    }, 800);
  }, [currentWeather, params.timeOfDay, tryTriggerEvent]);

  const handleStatsUpdate = useCallback((counts: SimulationCounts) => {
    const now = performance.now() * 0.001;
    if (now - lastStatsUpdateRef.current < 0.6) return;
    lastStatsUpdateRef.current = now;
    setStats(prev => {
      if (prev.healthy === counts.healthy &&
          prev.incubating === counts.incubating &&
          prev.infected === counts.infected &&
          prev.deceased === counts.deceased) {
        return prev;
      }
      return { ...prev, ...counts };
    });
  }, []);

  const handleMoraleUpdate = useCallback((morale: MoraleStats) => {
    const now = performance.now() * 0.001;
    if (now - lastMoraleUpdateRef.current < 0.8) return;
    lastMoraleUpdateRef.current = now;
    const prev = moraleStats;
    if (prev &&
        Math.abs(prev.avgAwareness - morale.avgAwareness) < 0.5 &&
        Math.abs(prev.avgPanic - morale.avgPanic) < 0.5 &&
        prev.agentCount === morale.agentCount) {
      return;
    }
    setMoraleStats(morale);
  }, [moraleStats]);

  const setBuildingInfectionSnapshot = useCallback((nextMap: Map<string, BuildingInfectionState>) => {
    const nextRecord: Record<string, BuildingInfectionState> = {};
    nextMap.forEach((value, key) => {
      nextRecord[key] = value;
    });
    setBuildingInfectionState((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextRecord);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key]?.status === nextRecord[key]?.status)) {
        return prev;
      }
      return nextRecord;
    });
  }, []);

  const ensureTileRegistry = useCallback((buildings: BuildingMetadata[]) => {
    if (buildings.length === 0) return null;
    const tileKey = getTileKey(params.mapX, params.mapY);
    let registry = tileRegistriesRef.current.get(tileKey);
    if (!registry) {
      const district = getDistrictType(params.mapX, params.mapY);
      const tileSeed = hashToSeedTile(tileKey);
      const seedInitial = !seededInitialInfectionsRef.current;
      registry = createTileNPCRegistry(buildings, district, stats.simTime, tileSeed, CONSTANTS.AGENT_COUNT, seedInitial);
      if (seedInitial) {
        seededInitialInfectionsRef.current = true;
      }
      tileRegistriesRef.current.set(tileKey, registry);
    }
    return registry;
  }, [params.mapX, params.mapY, stats.simTime]);

  const updateRegistryForSchedule = useCallback((registry: { npcMap: Map<string, NPCRecord>; lastScheduleSimTime: number }) => {
    const timeOfDay = params.timeOfDay;
    const lockedBuildingId = sceneMode === 'interior' ? interiorBuilding?.id ?? null : null;
    registry.npcMap.forEach((record) => {
      if (lockedBuildingId && record.homeBuildingId === lockedBuildingId) {
        record.location = 'interior';
        return;
      }
      // Keep infected and deceased NPCs inside their homes
      if (record.homeBuildingId && (record.state === AgentState.INFECTED || record.state === AgentState.DECEASED)) {
        record.location = 'interior';
        return;
      }
      if (record.homeBuildingId) {
        const shouldHome = shouldNpcBeHome(record, timeOfDay);
        record.location = shouldHome ? 'interior' : 'outdoor';
      } else {
        record.location = 'outdoor';
      }
    });
    registry.lastScheduleSimTime = stats.simTime;
  }, [params.timeOfDay, stats.simTime, sceneMode, interiorBuilding]);

  const updateOffscreenHealth = useCallback((registry: { npcMap: Map<string, NPCRecord> }) => {
    const householdRisk = new Map<string, boolean>();
    registry.npcMap.forEach((record) => {
      if (!record.homeBuildingId) return;
      if (record.location !== 'interior') return;
      if (record.state === AgentState.INFECTED || record.state === AgentState.INCUBATING) {
        householdRisk.set(record.homeBuildingId, true);
      }
    });

    const npcList = Array.from(registry.npcMap.values());
    const CHUNK_COUNT = 4;
    const chunkSize = Math.max(1, Math.ceil(npcList.length / CHUNK_COUNT));
    const start = (offscreenHealthCursorRef.current % CHUNK_COUNT) * chunkSize;
    const end = Math.min(npcList.length, start + chunkSize);
    for (let i = start; i < end; i++) {
      const record = npcList[i];
      const timeSinceUpdate = stats.simTime - record.lastUpdateSimTime;
      if (record.location === 'outdoor' && timeSinceUpdate < 0.5) continue;
      if (timeSinceUpdate >= 0.25) {
        const prevState = record.state;
        if (record.location === 'interior' && record.homeBuildingId && householdRisk.get(record.homeBuildingId)) {
          applyHouseholdExposure(record, stats.simTime, timeSinceUpdate);
        }
        const stateChanged = advanceNpcHealth(record, stats.simTime);

        // Trigger toast when NPC becomes infected
        if (stateChanged && record.state === AgentState.INFECTED && prevState === AgentState.INCUBATING && record.homeBuildingId) {
          const building = tileBuildings.find((b) => b.id === record.homeBuildingId);
          if (building) {
            const direction = calculateDirection(
              playerPositionRef.current.x,
              playerPositionRef.current.z,
              building.position[0],
              building.position[2]
            );
            const district = formatDistrictName(getDistrictType(params.mapX, params.mapY));
            const id = `infection-${toastIdCounter.current++}`;
            const message = `${record.stats.name} is now infected with plague in their home to the ${direction} of the ${district} area`;
            setToastMessages((prev) => [...prev, { id, message, duration: 6000 }]);
          }
        }

        record.lastUpdateSimTime = stats.simTime;
      }
    }
    offscreenHealthCursorRef.current = (offscreenHealthCursorRef.current + 1) % CHUNK_COUNT;
  }, [stats.simTime, tileBuildings, params.mapX, params.mapY]);

  const getBuildingLabel = useCallback((type: BuildingType) => {
    switch (type) {
      case BuildingType.RESIDENTIAL: return 'Private Residence';
      case BuildingType.COMMERCIAL: return 'Merchant Stall';
      case BuildingType.RELIGIOUS: return 'Holy Sanctuary';
      case BuildingType.CIVIC: return 'Governor\'s Office';
      case BuildingType.SCHOOL: return 'Madrasa';
      case BuildingType.MEDICAL: return 'Clinic';
      case BuildingType.HOSPITALITY: return 'Inn';
      default: return 'Structure';
    }
  }, []);

  const getDistrictActivityLabel = useCallback((districtType: import('./types').DistrictType) => {
    const labels: Record<import('./types').DistrictType, string> = {
      MARKET: 'the market street',
      WEALTHY: 'a wealthy residential lane',
      HOVELS: 'a cramped lane',
      CIVIC: 'the civic quarter',
      RESIDENTIAL: 'a residential street',
      ALLEYS: 'a narrow alley',
      JEWISH_QUARTER: 'the Jewish quarter street',
      CHRISTIAN_QUARTER: 'the Christian quarter street',
      UMAYYAD_MOSQUE: 'the mosque precinct',
      SALHIYYA: 'the hillside district',
      OUTSKIRTS_FARMLAND: 'the farmland edge',
      OUTSKIRTS_DESERT: 'the desert fringe',
      CARAVANSERAI: 'the caravanserai yard',
      MOUNTAIN_SHRINE: 'the mountain path',
      SOUTHERN_ROAD: 'the southern road',
      STRAIGHT_STREET: 'the straight street',
      SOUQ_AXIS: 'the souq corridor',
      MIDAN: 'the southern gate road',
      BAB_SHARQI: 'the eastern gate road'
    };
    return labels[districtType] ?? 'the street';
  }, []);

  const buildNpcActivityLabel = useCallback((location: 'outdoor' | 'interior', isMoving: boolean) => {
    if (location === 'interior') {
      const buildingType = interiorBuilding?.type ?? interiorSpec?.buildingType ?? null;
      const placeLabel = buildingType ? getBuildingLabel(buildingType) : 'Building';
      const place = placeLabel.toLowerCase();
      return isMoving ? `moving through a ${place}` : `inside a ${place}`;
    }
    const districtType = getDistrictType(params.mapX, params.mapY);
    const area = getDistrictActivityLabel(districtType);
    return isMoving ? `walking through ${area}` : `standing in ${area}`;
  }, [getDistrictActivityLabel, getBuildingLabel, interiorBuilding, interiorSpec, params.mapX, params.mapY]);

  const getCurrentNpcActivity = useCallback((npcId: string) => {
    const entry = npcActivityRef.current.get(npcId);
    if (entry?.activity) return entry.activity;
    const districtType = getDistrictType(params.mapX, params.mapY);
    const area = getDistrictActivityLabel(districtType);
    return sceneMode === 'interior' ? 'inside a building' : `standing in ${area}`;
  }, [getDistrictActivityLabel, params.mapX, params.mapY, sceneMode]);

  const getNpcNearbyCounts = useCallback((npcId: string) => {
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (!registry) return { infected: 0, deceased: 0 };
    const subjectPos = npcActivityRef.current.get(npcId)?.lastPos;
    if (!subjectPos) return { infected: 0, deceased: 0 };
    let infected = 0;
    let deceased = 0;
    const radiusSq = 15 * 15;
    registry.npcMap.forEach((record) => {
      if (record.id === npcId) return;
      const pos = npcActivityRef.current.get(record.id)?.lastPos;
      if (!pos) return;
      const distSq = pos.distanceToSquared(subjectPos);
      if (distSq <= radiusSq) {
        if (record.state === AgentState.INFECTED) infected++;
        if (record.state === AgentState.DECEASED) deceased++;
      }
    });
    return { infected, deceased };
  }, [params.mapX, params.mapY]);

  const addDistrictRumor = useCallback((district: import('./types').DistrictType, text: string, simTime: number) => {
    const pool = rumorPoolRef.current.get(district) ?? [];
    const fresh = pool.filter((entry) => simTime - entry.simTime <= 24);
    if (!fresh.some((entry) => entry.text === text)) {
      fresh.unshift({ text, simTime });
    }
    if (fresh.length > 6) fresh.length = 6;
    rumorPoolRef.current.set(district, fresh);
  }, []);

  const getDistrictRumors = useCallback((district: import('./types').DistrictType, simTime: number) => {
    const pool = rumorPoolRef.current.get(district) ?? [];
    const fresh = pool.filter((entry) => simTime - entry.simTime <= 24);
    if (fresh.length !== pool.length) {
      rumorPoolRef.current.set(district, fresh);
    }
    return fresh.map((entry) => entry.text).slice(0, 2);
  }, []);

  const handleNpcUpdate = useCallback((id: string, state: AgentState, pos: THREE.Vector3, awareness: number, panic: number, location: 'outdoor' | 'interior', plagueMeta?: import('./types').NPCPlagueMeta) => {
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (!registry) return;
    const record = registry.npcMap.get(id);
    if (!record) return;
    const prevState = record.state;
    if (record.state !== state) {
      record.state = state;
      record.stateStartTime = stats.simTime;
      if (state === AgentState.INCUBATING) {
        ensureNpcPlagueMeta(record, stats.simTime);
      } else if (state === AgentState.INFECTED) {
        ensureNpcPlagueMeta(record, stats.simTime);
        if (record.plagueMeta) {
          record.plagueMeta.onsetTime = stats.simTime;
        }
      } else if (state === AgentState.HEALTHY) {
        resetNpcPlagueMeta(record);
      }
    }
    if (plagueMeta) {
      record.plagueMeta = plagueMeta;
    }
    record.lastUpdateSimTime = stats.simTime;
    record.stats.awarenessLevel = awareness;
    record.stats.panicLevel = panic;
    record.location = location;
    if (location === 'outdoor') {
      record.lastOutdoorPos = [pos.x, pos.y, pos.z];
    }

    if (prevState !== AgentState.DECEASED && state === AgentState.DECEASED) {
      const district = getDistrictType(params.mapX, params.mapY);
      const building = record.homeBuildingId
        ? tileBuildings.find((entry) => entry.id === record.homeBuildingId)
        : null;
      const profession = record.stats.profession.toLowerCase();
      const ownerName = building?.ownerName ?? record.stats.name;
      const placeHint = building ? `near the ${building.ownerProfession?.toLowerCase() ?? 'homes'}` : district.toLowerCase().replace(/_/g, ' ');
      const rumorText = `${ownerName}, a ${profession}, died ${placeHint}.`;
      addDistrictRumor(district, rumorText, stats.simTime);
    }

    const activityEntry = npcActivityRef.current.get(id);
    const lastPos = activityEntry?.lastPos ?? pos.clone();
    const dist = pos.distanceTo(lastPos);
    const isMoving = location === 'outdoor' && dist > 0.35;
    const activity = buildNpcActivityLabel(location, isMoving);
    npcActivityRef.current.set(id, {
      lastPos: pos.clone(),
      lastSimTime: stats.simTime,
      activity,
      location
    });
  }, [addDistrictRumor, buildNpcActivityLabel, params.mapX, params.mapY, stats.simTime, tileBuildings]);

  const handleBuildingsUpdate = useCallback((buildings: BuildingMetadata[]) => {
    scheduleTickRef.current = 0;
    scheduleWorkRef.current = null;
    setPerfDebug((prev) => ({
      ...prev,
      schedulePhase: -1,
      scheduleActive: false
    }));
    setTileBuildings(buildings);
  }, []);

  useEffect(() => {
    if (tileBuildings.length === 0) return;
    const registry = ensureTileRegistry(tileBuildings);
    if (!registry) return;
    const scheduleInterval = 1.5;
    const shouldRun = scheduleTickRef.current === 0 || stats.simTime - scheduleTickRef.current >= scheduleInterval;
    if (shouldRun && !scheduleWorkRef.current) {
      scheduleTickRef.current = stats.simTime;
      scheduleWorkRef.current = { registry, phase: 0 };
      setPerfDebug((prev) => ({
        ...prev,
        schedulePhase: 0,
        scheduleActive: true,
        lastScheduleMs: performance.now(),
        lastScheduleSimTime: stats.simTime
      }));
    }
    const work = scheduleWorkRef.current;
    if (!work) return;
    if (work.phase === 0) {
      updateRegistryForSchedule(work.registry);
      work.phase = 1;
      setPerfDebug((prev) => ({
        ...prev,
        schedulePhase: 1,
        scheduleActive: true,
        lastScheduleMs: performance.now(),
        lastScheduleSimTime: stats.simTime
      }));
      return;
    }
    if (work.phase === 1) {
      updateOffscreenHealth(work.registry);
      work.phase = 2;
      setPerfDebug((prev) => ({
        ...prev,
        schedulePhase: 2,
        scheduleActive: true,
        lastScheduleMs: performance.now(),
        lastScheduleSimTime: stats.simTime
      }));
      return;
    }
    if (work.phase === 2) {
      const outdoor = Array.from(work.registry.npcMap.values())
        .filter((record) => record.location === 'outdoor')
        .sort((a, b) => {
          const priority = (state: AgentState) => {
            if (state === AgentState.INFECTED) return 0;
            if (state === AgentState.INCUBATING) return 1;
            if (state === AgentState.HEALTHY) return 2;
            return 3;
          };
          const diff = priority(a.state) - priority(b.state);
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        });
      const nextIds = outdoor.map((record) => record.id);
      const prevIds = lastOutdoorIdsRef.current;
      const sameIds = nextIds.length === prevIds.length && nextIds.every((id, idx) => id === prevIds[idx]);
      if (!sameIds) {
        lastOutdoorIdsRef.current = nextIds;
        setOutdoorNpcPool(outdoor);
      }
      if (sceneMode === 'outdoor' && selectedNpc && !outdoor.some((record) => record.id === selectedNpc.stats.id)) {
        setSelectedNpc(null);
      }
      work.phase = 3;
      setPerfDebug((prev) => ({
        ...prev,
        schedulePhase: 3,
        scheduleActive: true,
        lastScheduleMs: performance.now(),
        lastScheduleSimTime: stats.simTime
      }));
      return;
    }
    const tileKey = getTileKey(params.mapX, params.mapY);
    const prevInfection = buildingInfectionRef.current.get(tileKey) ?? new Map();
    const nextInfection = updateBuildingInfections(tileBuildings, work.registry.npcMap, prevInfection, stats.simTime);
    buildingInfectionRef.current.set(tileKey, nextInfection);
    setBuildingInfectionSnapshot(nextInfection);
    scheduleWorkRef.current = null;
    setPerfDebug((prev) => ({
      ...prev,
      schedulePhase: 4,
      scheduleActive: false,
      lastScheduleMs: performance.now(),
      lastScheduleSimTime: stats.simTime
    }));
  }, [stats.simTime, tileBuildings, ensureTileRegistry, updateRegistryForSchedule, updateOffscreenHealth, setBuildingInfectionSnapshot, params.mapX, params.mapY, sceneMode, selectedNpc]);

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
    const registry = ensureTileRegistry(tileBuildings);
    if (registry) {
      const syncedNpcs = spec.npcs.map((npc) => {
        const record = registry.npcMap.get(npc.id);
        if (!record) return npc;
        record.location = 'interior';
        return {
          ...npc,
          stats: record.stats,
          state: record.state,
          plagueMeta: record.plagueMeta
        };
      });
      spec.npcs = syncedNpcs;
      if (spec.floors?.[0]) {
        spec.floors[0].npcs = syncedNpcs;
      }
    }
    setInteriorSpec(spec);
    setInteriorNarrator(spec.floors?.[0]?.narratorState ?? spec.narratorState);
    setInteriorBuilding(building);
    setActiveInteriorFloor(0);
    setNearStairs(null);
    lastOutdoorMap.current = { mapX: params.mapX, mapY: params.mapY };
    setNearBuilding(null);
    setSceneMode('interior');

    tryTriggerEvent({
      when: 'interiorEnter',
      targetType: 'interiorAny',
      targetId: 'any',
      contextOverrides: {
        environment: {
          district: getDistrictType(params.mapX, params.mapY),
          timeOfDay: params.timeOfDay,
          weather: currentWeather
        }
      },
      source: 'environment'
    });

    tryTriggerEvent({
      when: 'interiorEnter',
      targetType: 'buildingType',
      targetId: building.type,
      contextOverrides: {
        environment: {
          district: getDistrictType(params.mapX, params.mapY),
          timeOfDay: params.timeOfDay,
          weather: currentWeather
        }
      },
      source: 'environment'
    });

    if (building.district) {
      tryTriggerEvent({
        when: 'interiorEnter',
        targetType: 'buildingDistrict',
        targetId: building.district,
        contextOverrides: {
          environment: {
            district: building.district,
            timeOfDay: params.timeOfDay,
            weather: currentWeather
          }
        },
        source: 'environment'
      });
    }
  }, [currentWeather, ensureTileRegistry, hashToSeed, params.mapX, params.mapY, params.timeOfDay, tileBuildings, tryTriggerEvent]);

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

  // Loot modal handlers
  const handleLootAccept = useCallback((items: LootItem[]) => {
    if (items.length === 0) {
      setLootModalData(null);
      return;
    }

    const isBirdcageTheft = lootModalData?.sourceObjectName === 'Birdcage' && lootModalData.isTheft;

    // Check inventory space
    const currentInventorySize = playerStats.inventory.reduce((sum, i) => sum + i.quantity, 0);
    if (currentInventorySize + items.length > playerStats.maxInventorySlots) {
      setToastMessages(prev => [...prev, {
        id: `loot-warning-${toastIdCounter.current++}`,
        message: 'Not enough inventory space!',
        duration: 3000
      }]);
      return;
    }

    // Add items to inventory
    setPlayerStats(prev => {
      const newInventory = [...prev.inventory];

      items.forEach(lootItem => {
        // Check if this item type already exists in inventory
        const existingIndex = newInventory.findIndex(i => i.itemId === lootItem.itemId);

        if (existingIndex >= 0) {
          newInventory[existingIndex] = {
            ...newInventory[existingIndex],
            quantity: newInventory[existingIndex].quantity + 1
          };
        } else {
          newInventory.push({
            id: `player-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            itemId: lootItem.itemId,
            quantity: 1,
            acquiredAt: stats.simTime
          });
        }
      });

      return {
        ...prev,
        inventory: newInventory
      };
    });

    if (isBirdcageTheft) {
      setPlayerStats(prev => ({
        ...prev,
        reputation: Math.max(0, prev.reputation - 2)
      }));
    }

    // Show toast
    const itemNames = items.map(i => i.itemName).join(', ');
    setToastMessages(prev => [...prev, {
      id: `loot-pickup-${toastIdCounter.current++}`,
      message: `Picked up: ${itemNames}`,
      duration: 3000
    }]);

    // Close modal
    setLootModalData(null);

    if (isBirdcageTheft) {
      const eventRoll = seededRandom(playerSeed + Math.floor(stats.simTime) * 7 + items.length * 11);
      const eventId = eventRoll < 0.34
        ? 'event_birdcage_theft_scolded'
        : eventRoll < 0.67
          ? 'event_birdcage_theft_neighbor'
          : 'event_birdcage_theft_patrol';
      handleTriggerConversationEvent(eventId);
    }
  }, [handleTriggerConversationEvent, lootModalData, playerSeed, playerStats.inventory, playerStats.maxInventorySlots, stats.simTime]);

  const handleLootDecline = useCallback(() => {
    setLootModalData(null);
  }, [setLootModalData]);

  const handleLootClose = useCallback(() => {
    setLootModalData(null);
  }, [setLootModalData]);

  // Handler for showing loot modal from Simulation (shattered objects)
  const handleShowLootModal = useCallback((data: {
    type: 'shatter';
    sourceObjectName: string;
    items: Array<{
      itemId: string;
      itemName: string;
      rarity: 'common' | 'uncommon' | 'rare';
      category: string;
    }>;
  }) => {
    setLootModalData({
      type: data.type,
      sourceObjectName: data.sourceObjectName,
      items: data.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        rarity: item.rarity,
        category: item.category,
      })),
    });
  }, [setLootModalData]);

  const handlePlagueExposure = useCallback((updatedPlague: import('./types').PlagueStatus) => {
    setPlayerStats(prev => ({
      ...prev,
      plague: updatedPlague
    }));
  }, []);

  // Handle fall damage from jumping off rooftops
  const handleFallDamage = useCallback((fallHeight: number, fatal: boolean) => {
    if (fatal) {
      // Fatal fall - game over
      const stories = Math.floor(fallHeight / 3);
      setGameOver({
        reason: 'Fallen to Death',
        description: `You fell ${stories > 2 ? 'from a great height' : 'from a rooftop'}, ${fallHeight.toFixed(1)} cubits to the unforgiving stones below. Your journey ends here in the narrow streets of Damascus.`
      });
    } else {
      // Non-fatal fall - reduce strength significantly
      const damage = Math.floor((fallHeight - 3) * 15); // 15 damage per unit above threshold
      setPlayerStats(prev => ({
        ...prev,
        strength: Math.max(1, prev.strength - damage),
        healthStatus: prev.strength - damage <= 20 ? 'Gravely injured' : 'Injured'
      }));
    }
  }, []);

  useEffect(() => {
    if (interiorNarrator) {
      (window as any).__interiorState = interiorNarrator;
    }
  }, [interiorNarrator]);

  const interiorInfo = useMemo(() => {
    if (sceneMode !== 'interior' || !interiorSpec) return null;
    const building = interiorBuilding;
    const location = getLocationLabel(params.mapX, params.mapY);
    const ownerName = building?.ownerName ?? 'Resident';
    const profession = building?.ownerProfession ?? interiorSpec.profession;
    const type = building?.type ?? interiorSpec.buildingType;
    const activeFloor = interiorSpec.floors?.[activeInteriorFloor];
    const lowerProf = profession.toLowerCase();
    let placeLabel = getBuildingLabel(type);
    if (type === BuildingType.COMMERCIAL) {
      if (lowerProf.includes('inn') || lowerProf.includes('sherbet')) placeLabel = 'Cafe';
      else if (lowerProf.includes('khan') || lowerProf.includes('caravanserai')) placeLabel = 'Caravanserai';
      else placeLabel = 'Shop';
    }
    const activeNpcs = activeFloor?.npcs ?? interiorSpec.npcs;
    const guestCount = Math.max(0, activeNpcs.filter((npc) => npc.role !== 'owner').length);
    const guestLabel = activeFloor?.floorType === 'private'
      ? 'Private upper rooms'
      : guestCount === 0
        ? 'No other customers present'
        : `Other customers present: ${guestCount}`;
    return `${placeLabel} of ${ownerName} in the ${location} district. ${guestLabel}.`;
  }, [sceneMode, interiorSpec, interiorBuilding, params.mapX, params.mapY, activeInteriorFloor]);

  const stairsPromptLabel = useMemo(() => {
    if (!nearStairs) return null;
    const goingUp = activeInteriorFloor === 0;
    if (nearStairs.type === InteriorPropType.LADDER) {
      return goingUp ? 'Climb up' : 'Climb down';
    }
    return goingUp ? 'Go upstairs' : 'Go downstairs';
  }, [nearStairs, activeInteriorFloor]);

  // Get nearby NPCs for the Historical Guide context
  const nearbyNPCs = useMemo(() => {
    const tileKey = getTileKey(params.mapX, params.mapY);
    const registry = tileRegistriesRef.current.get(tileKey);
    if (!registry) return [];

    const npcs: NPCStats[] = [];
    registry.npcMap.forEach((record) => {
      if (record.location === 'outdoor' && record.state !== 'dead') {
        npcs.push(record.stats);
      }
    });

    return npcs.slice(0, 10); // Limit to 10 for performance
  }, [params.mapX, params.mapY, stats.simTime]); // Re-compute when tile or time changes

  // Handler to open guide modal to a specific entry
  const handleOpenGuideEntry=useCallback((entryId: string) => {
    setSelectedGuideEntryId(entryId);
    setShowGuideModal(true);
  }, []);

  // Handler to open guide modal
  const handleOpenGuideModal = useCallback(() => {
    setSelectedGuideEntryId(null);
    setShowGuideModal(true);
  }, []);

  useEffect(() => {
    if (!selectedNpc || !showEncounterModal) return;
    setSelectedNpcActivity(getCurrentNpcActivity(selectedNpc.stats.id));
    const counts = getNpcNearbyCounts(selectedNpc.stats.id);
    setSelectedNpcNearbyInfected(counts.infected);
    setSelectedNpcNearbyDeceased(counts.deceased);
    const district = getDistrictType(params.mapX, params.mapY);
    setSelectedNpcRumors(getDistrictRumors(district, stats.simTime));
  }, [getCurrentNpcActivity, getDistrictRumors, getNpcNearbyCounts, params.mapX, params.mapY, selectedNpc, showEncounterModal, stats.simTime]);

  const performanceMonitorConfig = useMemo(() => ({
    lastPerfChangeRef,
    shadowsDisabledByPerf,
    perfDebounceMs: PERF_DEBOUNCE_MS,
    lowFpsThreshold: LOW_FPS_THRESHOLD,
    setPerformanceDegraded,
    setIndicatorDismissed,
    devSettings,
    setDevSettings
  }), [devSettings, setDevSettings]);

  const uiProps = useMemo(() => ({
    params,
    setParams,
    stats,
    playerStats,
    devSettings,
    setDevSettings,
    nearBuilding,
    buildingInfection: buildingInfectionState,
    onFastTravel: handleFastTravel,
    selectedNpc,
    minimapData,
    sceneMode,
    mapX: params.mapX,
    mapY: params.mapY,
    overworldPath,
    pickupPrompt,
    climbablePrompt,
    isClimbing,
    onClimbInput: handleClimbInput,
    onTriggerPickup: handleTriggerPickup,
    onTriggerClimb: handleTriggerClimb,
    pickupToast: pickupToast?.message ?? null,
    currentWeather,
    pushCharge,
    moraleStats,
    actionSlots,
    onTriggerAction: triggerAction,
    onTriggerPush: triggerPush,
    simTime: stats.simTime,
    showPlayerModal,
    setShowPlayerModal,
    showEncounterModal,
    setShowEncounterModal,
    conversationHistories,
    onConversationResult: handleConversationResult,
    onTriggerConversationEvent: handleTriggerConversationEvent,
    selectedNpcActivity,
    selectedNpcNearbyInfected,
    selectedNpcNearbyDeceased,
    selectedNpcRumors,
    activeEvent,
    onResolveEvent: resolveEvent,
    onTriggerDebugEvent: handleDebugEvent,
    llmEventsEnabled,
    setLlmEventsEnabled,
    lastEventNote,
    showDemographicsOverlay,
    setShowDemographicsOverlay,
    onForceNpcState: handleForceNpcState,
    onForceAllNpcState: handleForceAllNpcState,
    isNPCInitiatedEncounter,
    isFollowingAfterDismissal,
    onResetFollowingState: handleResetFollowingState,
    nearbyNPCs,
    onOpenGuideModal: handleOpenGuideModal,
    onSelectGuideEntry: handleOpenGuideEntry,
    infectedHouseholds,
    onNavigateToHousehold: handleNavigateToHousehold,
    onDropItem: handleDropItem,
    onDropItemAtScreen: handleDropItemAtScreen,
    perfDebug
  }), [
    actionSlots,
    activeEvent,
    buildingInfectionState,
    climbablePrompt,
    conversationHistories,
    currentWeather,
    devSettings,
    handleClimbInput,
    handleTriggerPickup,
    handleTriggerClimb,
    handleConversationResult,
    handleDebugEvent,
    handleDropItem,
    handleDropItemAtScreen,
    handleFastTravel,
    handleForceAllNpcState,
    handleForceNpcState,
    handleNavigateToHousehold,
    handleOpenGuideEntry,
    handleOpenGuideModal,
    handleResetFollowingState,
    handleTriggerConversationEvent,
    infectedHouseholds,
    isClimbing,
    isFollowingAfterDismissal,
    isNPCInitiatedEncounter,
    lastEventNote,
    llmEventsEnabled,
    minimapData,
    moraleStats,
    nearBuilding,
    nearbyNPCs,
    overworldPath,
    params,
    perfDebug,
    pickupPrompt,
    pickupToast,
    playerStats,
    pushCharge,
    sceneMode,
    selectedNpc,
    selectedNpcActivity,
    selectedNpcNearbyDeceased,
    selectedNpcNearbyInfected,
    selectedNpcRumors,
    setDevSettings,
    setLlmEventsEnabled,
    setParams,
    setShowEncounterModal,
    setShowPlayerModal,
    showDemographicsOverlay,
    showEncounterModal,
    showPlayerModal,
    stats.simTime,
    stats,
    triggerAction,
    triggerPush
  ]);

  const simulationShellProps = useMemo(() => ({
    transitioning,
    sceneMode,
    interiorSpec,
    params,
    stats,
    devSettings,
    playerStats,
    canvasCamera,
    canvasDpr,
    canvasGl,
    r3fRef,
    onClearSelectedNpc: handleClearSelectedNpc,
    onStatsUpdate: handleStatsUpdate,
    onMapChange: handleMapChange,
    onNearBuilding: setNearBuilding,
    onBuildingsUpdate: handleBuildingsUpdate,
    onNearMerchant: setNearMerchant,
    onNearSpeakableNpc: setNearSpeakableNpc,
    onNpcSelect: setSelectedNpc,
    onNpcUpdate: handleNpcUpdate,
    selectedNpcId: selectedNpc?.stats.id ?? null,
    onMinimapUpdate: setMinimapData,
    onPickupPrompt: setPickupPrompt,
    onClimbablePrompt: setClimbablePrompt,
    onClimbingStateChange: setIsClimbing,
    climbInputRef,
    pickupTriggerRef,
    climbTriggerRef,
    onPickupItem: handlePickupItem,
    onWeatherUpdate: setCurrentWeather,
    onPushCharge: setPushCharge,
    pushTriggerRef,
    onMoraleUpdate: handleMoraleUpdate,
    actionEvent,
    showDemographicsOverlay,
    npcStateOverride,
    npcPool: outdoorNpcPool,
    buildingInfection: buildingInfectionState,
    onPlayerPositionUpdate: handlePlayerPositionUpdate,
    dossierMode: showPlayerModal,
    onPlagueExposure: handlePlagueExposure,
    onNPCInitiatedEncounter: handleNPCInitiatedEncounter,
    onFallDamage: handleFallDamage,
    cameraViewTarget,
    onPlayerStartMove: handlePlayerStartMove,
    dropRequests,
    observeMode,
    gameLoading,
    mapEntrySpawn,
    activeFloorIndex: activeInteriorFloor,
    onExitInterior: exitInterior,
    onNearChest: setNearChest,
    onNearStairs: setNearStairs,
    onNearBirdcage: setNearBirdcage,
    onShowLootModal: handleShowLootModal,
    performanceMonitor: performanceMonitorConfig
  }), [
    actionEvent,
    buildingInfectionState,
    cameraViewTarget,
    canvasCamera,
    canvasDpr,
    canvasGl,
    devSettings,
    dropRequests,
    gameLoading,
    handleBuildingsUpdate,
    handleClearSelectedNpc,
    handleFallDamage,
    handleMapChange,
    handleMoraleUpdate,
    handleNPCInitiatedEncounter,
    handleNpcUpdate,
    handlePickupItem,
    handlePlayerPositionUpdate,
    handlePlagueExposure,
    handlePlayerStartMove,
    handleShowLootModal,
    handleStatsUpdate,
    activeInteriorFloor,
    interiorSpec,
    mapEntrySpawn,
    exitInterior,
    npcStateOverride,
    observeMode,
    outdoorNpcPool,
    params,
    performanceMonitorConfig,
    playerStats,
    sceneMode,
    selectedNpc?.stats.id,
    setIsClimbing,
    setMinimapData,
    setNearBuilding,
    setNearChest,
    setNearStairs,
    setNearBirdcage,
    setNearMerchant,
    setNearSpeakableNpc,
    setPickupPrompt,
    setClimbablePrompt,
    setPushCharge,
    setCurrentWeather,
    setSelectedNpc,
    showDemographicsOverlay,
    showPlayerModal,
    stats,
    transitioning
  ]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <AppShell
        observeMode={observeMode}
        transitioning={transitioning}
        gameLoading={gameLoading}
        uiProps={uiProps}
        performanceIndicator={{
          show: !observeMode && performanceDegraded && !indicatorDismissed,
          shadowsDisabled: shadowsDisabledByPerf.current,
          onDismiss: () => setIndicatorDismissed(true)
        }}
        showEnterModal={showEnterModal}
        nearBuilding={nearBuilding}
        getBuildingLabel={getBuildingLabel}
        onConfirmEnter={() => {
          if (!nearBuilding) return;
          setShowEnterModal(false);
          enterInterior(nearBuilding);
        }}
        onCloseEnterModal={() => setShowEnterModal(false)}
        showMerchantModal={showMerchantModal}
        nearMerchant={nearMerchant}
        onCloseMerchant={() => setShowMerchantModal(false)}
        onTriggerMerchant={handleTriggerMerchant}
        onPurchase={handlePurchase}
        onSell={handleSell}
        showGuideModal={showGuideModal}
        selectedGuideEntryId={selectedGuideEntryId}
        onCloseGuideModal={() => {
          setShowGuideModal(false);
          setSelectedGuideEntryId(null);
        }}
        interiorInfo={interiorInfo}
        sceneMode={sceneMode}
        nearSpeakableNpc={nearSpeakableNpc}
        onTriggerSpeakToNpc={handleTriggerSpeakToNpc}
        nearChest={nearChest}
        onTriggerOpenChest={handleTriggerOpenChest}
        nearStairs={nearStairs}
        stairsPromptLabel={stairsPromptLabel}
        onTriggerUseStairs={handleTriggerUseStairs}
        nearBirdcage={nearBirdcage}
        onTriggerOpenBirdcage={handleTriggerOpenBirdcage}
        showEncounterModal={showEncounterModal}
        showPlayerModal={showPlayerModal}
        showEnterModalActive={showEnterModal}
        observeLines={observeLines}
        observeLineCount={observeLineCount}
        onObserveReturn={stopObserveMode}
        plague={playerStats.plague}
        showPlagueModal={showPlagueModal}
        plagueNotification={plagueNotification}
        onClosePlagueModal={() => setShowPlagueModal(false)}
        onClearPlagueNotification={() => setPlagueNotification(null)}
        onPlaguePauseToggle={handlePlagueModalPauseToggle}
        gameOver={gameOver}
        onRestart={() => window.location.reload()}
        toastMessages={toastMessages}
        onDismissToast={handleDismissToast}
        lootModalData={lootModalData}
        onLootAccept={handleLootAccept}
        onLootDecline={handleLootDecline}
        onLootClose={handleLootClose}
      />

      <SimulationShell {...simulationShellProps} />
    </div>
  );
}

export default App;
