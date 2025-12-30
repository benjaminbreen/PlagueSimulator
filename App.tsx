
import React, { useState, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Simulation } from './components/Simulation';
import { MoraleStats } from './components/Agents';
import { InteriorScene } from './components/InteriorScene';
import { UI } from './components/UI';
import { MerchantModal } from './components/MerchantModal';
import { GuideModal } from './components/HistoricalGuide';
import { SimulationParams, SimulationStats, SimulationCounts, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, CONSTANTS, InteriorSpec, InteriorNarratorState, getLocationLabel, getDistrictType, NPCStats, AgentState, MerchantNPC, MiniMapData, ActionSlotState, ActionId, PLAYER_ACTIONS, PlayerActionEvent, ConversationSummary, NpcStateOverride, NPCRecord, BuildingInfectionState, EventInstance, EventEffect, EventContextSnapshot, EventDefinition, EventOption, PlagueType, SocialClass } from './types';
import { generatePlayerStats, seededRandom } from './utils/procedural';
import { getItemDetailsByItemId } from './utils/merchantItems';
import { generateInteriorSpec } from './utils/interior';
import { createTileNPCRegistry, getTileKey, hashToSeed as hashToSeedTile } from './utils/npcRegistry';
import { shouldNpcBeHome } from './utils/npcSchedule';
import { advanceNpcHealth, applyHouseholdExposure, ensureNpcPlagueMeta, resetNpcPlagueMeta } from './utils/npcHealth';
import { updateBuildingInfections } from './utils/buildingInfection';
import { initializePlague, progressPlague, getPlagueTypeLabel, exposePlayerToPlague } from './utils/plague';
import { ConversationImpact, applyConversationImpact } from './utils/friendliness';
import { PlagueUI } from './components/PlagueUI';
import { ObserveController } from './components/observe/ObserveController';
import { usePlagueMonitor } from './hooks/usePlagueMonitor';
import { checkBiomeRandomEvent, checkConversationTrigger, getBiomeForDistrict } from './utils/eventTriggers';
import { getEventsForBiome, getEventById } from './utils/events/catalog';
import { evaluateTriggers, TriggerState } from './utils/events/triggerSystem';
import { TriggerTargetType, TriggerWhen } from './utils/events/triggerCatalog';
import { Toast, ToastMessage } from './components/Toast';
import { calculateDirection, formatDistrictName } from './utils/directions';
import { buildObservePrompt } from './utils/observeContext';
import { useObserveMode } from './hooks/useObserveMode';
import { useOverworldPath } from './hooks/useOverworldPath';

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
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [sceneMode, setSceneMode] = useState<'outdoor' | 'interior'>('outdoor');
  const [interiorSpec, setInteriorSpec] = useState<InteriorSpec | null>(null);
  const [interiorNarrator, setInteriorNarrator] = useState<InteriorNarratorState | null>(null);
  const [interiorBuilding, setInteriorBuilding] = useState<BuildingMetadata | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
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
  const [nearSpeakableNpc, setNearSpeakableNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [isNPCInitiatedEncounter, setIsNPCInitiatedEncounter] = useState(false);
  const [isFollowingAfterDismissal, setIsFollowingAfterDismissal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedGuideEntryId, setSelectedGuideEntryId] = useState<string | null>(null);
  const [selectedNpcActivity, setSelectedNpcActivity] = useState('');
  const [selectedNpcNearbyInfected, setSelectedNpcNearbyInfected] = useState(0);
  const [selectedNpcNearbyDeceased, setSelectedNpcNearbyDeceased] = useState(0);
  const [selectedNpcRumors, setSelectedNpcRumors] = useState<string[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventInstance | null>(null);
  const [eventQueue, setEventQueue] = useState<EventInstance[]>([]);
  const [llmEventsEnabled, setLlmEventsEnabled] = useState(false);
  const [worldFlags, setWorldFlags] = useState<Record<string, boolean | number | string>>(() => {
    try {
      const raw = localStorage.getItem('worldFlags');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [lastEventNote, setLastEventNote] = useState<string | null>(null);
  const eventCooldownsRef = useRef<Record<string, number>>({});
  const npcThreatMemoryRef = useRef<Record<string, { count: number; lastSimTime: number }>>({});
  const suppressDismissalEventRef = useRef(false);
  // Track NPC that dismissed player for handling "insist on following" option
  const dismissedNpcRef = useRef<{ npcId: string; npcName: string } | null>(null);
  const initialTriggerState = useMemo<TriggerState>(() => {
    try {
      const raw = localStorage.getItem('eventTriggerState');
      return raw ? JSON.parse(raw) : { counts: {}, lastTriggeredDay: {} };
    } catch {
      return { counts: {}, lastTriggeredDay: {} };
    }
  }, []);
  const triggerStateRef = useRef<TriggerState>(initialTriggerState);
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
  const [minimapData, setMinimapData] = useState<MiniMapData | null>(null);
  const [pickupPrompt, setPickupPrompt] = useState<string | null>(null);
  const [climbablePrompt, setClimbablePrompt] = useState<string | null>(null);
  const [isClimbing, setIsClimbing] = useState(false);
  const climbInputRef = useRef<'up' | 'down' | 'cancel' | null>(null);
  const [pickupToast, setPickupToast] = useState<{ message: string; id: number } | null>(null);
  const [dropRequests, setDropRequests] = useState<import('./types').DroppedItemRequest[]>([]);
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
    if (!activeEvent) return;
    setShowEncounterModal(false);
    setShowMerchantModal(false);
    setShowEnterModal(false);
  }, [activeEvent]);

  useEffect(() => {
    try {
      localStorage.setItem('worldFlags', JSON.stringify(worldFlags));
    } catch {
      // Ignore storage errors.
    }
  }, [worldFlags]);

  useEffect(() => {
    if (!lastEventNote) return;
    const timeout = window.setTimeout(() => setLastEventNote(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [lastEventNote]);

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
        { id: 'start-dried-figs', quantity: 2 },
        { id: 'start-candle-stub', quantity: 1 }
      );
    } else if (stats.socialClass === SocialClass.MERCHANT) {
      classBasics.push(
        { id: 'start-waterskin', quantity: 1 },
        { id: 'start-candles', quantity: 1 },
        { id: 'start-satchel', quantity: 1 },
        { id: 'start-dates', quantity: 2 },
        { id: 'start-olives', quantity: 2 }
      );
    } else if (stats.socialClass === SocialClass.CLERGY) {
      classBasics.push(
        { id: 'start-prayer-rug', quantity: 1 },
        { id: 'start-incense', quantity: 1 },
        { id: 'start-manuscript', quantity: 1 },
        { id: 'start-candles', quantity: 1 }
      );
    } else if (stats.socialClass === SocialClass.NOBILITY) {
      classBasics.push(
        { id: 'start-satchel', quantity: 1 },
        { id: 'start-perfume', quantity: 1 },
        { id: 'start-rose-water', quantity: 1 },
        { id: 'start-olives', quantity: 2 }
      );
    }

    const genderBasics: Array<{ id: string; quantity: number }> = [];
    if (stats.gender === 'Female') {
      genderBasics.push({ id: 'start-headscarf', quantity: 1 });
    } else {
      genderBasics.push({ id: 'start-belt-sash', quantity: 1 });
    }

    const professionBasics: Array<{ id: string; quantity: number }> = [];
    if (stats.profession.match(/Merchant|Trader|Draper|Textile|Weaver|Dyer|Carpenter/i)) {
      professionBasics.push({ id: 'start-linen-cloth', quantity: 1 });
    }
    if (stats.profession.match(/Apothecary|Herbalist|Midwife/i)) {
      professionBasics.push(
        { id: 'start-mint', quantity: 2 },
        { id: 'start-cumin', quantity: 1 },
        { id: 'start-honey', quantity: 1 }
      );
    }
    if (stats.profession.match(/Coppersmith|Metalsmith/i)) {
      professionBasics.push(
        { id: 'start-bronze-bell', quantity: 1 },
        { id: 'start-iron-nails', quantity: 2 }
      );
    }
    if (stats.profession.match(/Guard|Soldier|Officer/i)) {
      professionBasics.push({ id: 'item-merchant-metalsmith-0', quantity: 1 });
    }
    if (stats.profession.match(/Bread Seller|Water-Carrier|Porter|Servant/i)) {
      professionBasics.push({ id: 'start-waterskin', quantity: 1 });
    }

    pickUnique(classBasics, Math.max(2, Math.min(4, classBasics.length)));
    pickUnique(genderBasics, Math.min(1, genderBasics.length));
    pickUnique(professionBasics, Math.min(3, professionBasics.length));

    if (startingInventory.length < 3) {
      pickUnique(
        [
          { id: 'start-dates', quantity: 2 },
          { id: 'start-olives', quantity: 2 },
          { id: 'start-dried-figs', quantity: 2 },
          { id: 'start-apricots', quantity: 2 }
        ],
        3 - startingInventory.length
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

  const enqueueEvent = useCallback((event: EventInstance) => {
    if (!activeEvent) {
      setActiveEvent(event);
    } else {
      setEventQueue(prev => [...prev, event]);
    }
  }, [activeEvent]);

  const buildEventContext = useCallback((overrides?: Partial<EventContextSnapshot>): EventContextSnapshot => {
    const district = getDistrictType(params.mapX, params.mapY);
    return {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      environment: {
        district,
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      },
      ...overrides
    };
  }, [currentWeather, params.mapX, params.mapY, params.timeOfDay, playerStats]);

  const makeEventInstance = useCallback((def: EventDefinition, source: EventInstance['source'], context: EventContextSnapshot): EventInstance => {
    return {
      id: `${def.id}-${Date.now()}`,
      source,
      context,
      content: {
        title: def.title,
        body: def.body,
        options: def.options
      },
      definitionId: def.id
    };
  }, []);

  const mapEffectKey = useCallback((effectKey: string): EventEffect[] => {
    switch (effectKey) {
      case 'end_conversation':
        return [{ type: 'endConversation' }];
      case 'bribe_small':
        return [{ type: 'playerStat', stat: 'currency', delta: -2 }];
      case 'bribe_large':
        return [{ type: 'playerStat', stat: 'currency', delta: -5 }];
      case 'health_up':
        return [{ type: 'playerStat', stat: 'health', delta: 5 }];
      case 'health_down':
        return [{ type: 'playerStat', stat: 'health', delta: -5 }];
      case 'reputation_up':
        return [{ type: 'playerStat', stat: 'reputation', delta: 3 }];
      case 'reputation_down':
        return [{ type: 'playerStat', stat: 'reputation', delta: -3 }];
      case 'wealth_up':
        return [{ type: 'playerStat', stat: 'wealth', delta: 4 }];
      case 'wealth_down':
        return [{ type: 'playerStat', stat: 'wealth', delta: -4 }];
      case 'flee':
        return [{ type: 'worldFlag', key: 'fled', value: true }];
      case 'appeal_faith':
        return [{ type: 'playerStat', stat: 'piety', delta: 1 }];
      case 'calm_crowd':
        return [{ type: 'worldFlag', key: 'calmed_crowd', value: true }];
      case 'escalate':
        return [{ type: 'worldFlag', key: 'escalated', value: true }];
      default:
        return [];
    }
  }, []);

  const buildLlmEventInstance = useCallback((baseEvent: EventInstance, payload: {
    title: string;
    body: string;
    options: Array<{
      id?: string;
      label: string;
      effectKey: string;
      outcomeText?: string;
      followupEventId?: string;
      requirements?: { stat?: 'charisma' | 'piety' | 'currency' | 'health' | 'reputation' | 'wealth'; min?: number; max?: number };
    }>;
  }): EventInstance => {
    const options = payload.options
      .filter(option => typeof option.label === 'string' && option.label.trim().length > 0)
      .slice(0, 4)
      .map((option, index) => ({
        id: option.id || `opt-${index + 1}`,
        label: option.label.trim(),
        outcomeText: option.outcomeText,
        followupEventId: option.followupEventId && getEventById(option.followupEventId)
          ? option.followupEventId
          : undefined,
        requirements: option.requirements?.stat ? {
          stat: option.requirements.stat,
          min: option.requirements.min,
          max: option.requirements.max
        } : undefined,
        effects: mapEffectKey(option.effectKey)
      }));

    return {
      ...baseEvent,
      content: {
        title: payload.title,
        body: payload.body,
        options
      }
    };
  }, [mapEffectKey]);

  const enqueueEventWithOptionalLLM = useCallback(async (event: EventInstance) => {
    if (!llmEventsEnabled) {
      enqueueEvent(event);
      return;
    }

    try {
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: event.context,
          eventSeed: event.definitionId
        })
      });

      if (!response.ok) {
        enqueueEvent(event);
        return;
      }

      const data = await response.json();
      const text = data.response;
      if (!text) {
        enqueueEvent(event);
        return;
      }

      const parsed = JSON.parse(text);
      const validOptions = Array.isArray(parsed.options) && parsed.options.length >= 2;
      if (!parsed.title || !parsed.body || !validOptions) {
        enqueueEvent(event);
        return;
      }

      const llmEvent = buildLlmEventInstance(event, parsed);
      if (llmEvent.content.options.length < 2) {
        enqueueEvent(event);
        return;
      }
      enqueueEvent(llmEvent);
    } catch {
      enqueueEvent(event);
    }
  }, [buildLlmEventInstance, enqueueEvent, llmEventsEnabled]);

  const tryTriggerEvent = useCallback((params: {
    when: TriggerWhen;
    targetType: TriggerTargetType;
    targetId: string;
    contextOverrides?: Partial<EventContextSnapshot>;
    source: EventInstance['source'];
  }) => {
    const dayIndex = Math.floor(stats.simTime);
    const def = evaluateTriggers({
      when: params.when,
      targetType: params.targetType,
      targetId: params.targetId,
      dayIndex,
      state: triggerStateRef.current
    });
    if (!def) return;

    const context = buildEventContext(params.contextOverrides);
    const event = makeEventInstance(def, params.source, context);
    setLastEventNote(`${params.when}:${params.targetType}:${params.targetId}`);
    try {
      localStorage.setItem('eventTriggerState', JSON.stringify(triggerStateRef.current));
    } catch {
      // Ignore storage errors.
    }
    void enqueueEventWithOptionalLLM(event);
  }, [buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, stats.simTime]);

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

  const applyEffects = useCallback((effects: EventEffect[]) => {
    effects.forEach(effect => {
      if (effect.type === 'playerStat') {
        const clampStat = (stat: EventEffect['stat'], value: number) => {
          if (stat === 'health' || stat === 'reputation' || stat === 'wealth') {
            return Math.max(0, Math.min(100, value));
          }
          return value;
        };
        setPlayerStats(prev => ({
          ...prev,
          [effect.stat]: clampStat(
            effect.stat,
            (prev[effect.stat] as number) + effect.delta
          )
        }));
      } else if (effect.type === 'npcStat') {
        setOutdoorNpcPool(prev => prev.map(record => {
          if (record.stats.id !== effect.npcId) return record;
          return {
            ...record,
            stats: {
              ...record.stats,
              disposition: effect.stat === 'disposition' ? record.stats.disposition + effect.delta : record.stats.disposition,
              panicLevel: effect.stat === 'panic' ? record.stats.panicLevel + effect.delta : record.stats.panicLevel
            }
          };
        }));
      } else if (effect.type === 'worldFlag') {
        setWorldFlags(prev => ({ ...prev, [effect.key]: effect.value }));
      } else if (effect.type === 'triggerEvent') {
        const def = getEventById(effect.eventId);
        if (!def) return;
        const context = buildEventContext();
        void enqueueEventWithOptionalLLM(makeEventInstance(def, 'system', context));
      } else if (effect.type === 'endConversation') {
        setShowEncounterModal(false);
      }
    });
  }, [buildEventContext, makeEventInstance, enqueueEventWithOptionalLLM]);

  const resolveEvent = useCallback((option: EventOption) => {
    applyEffects(option.effects);

    // Handle "insist on following" option for dismissed NPC
    if (option.id === 'insist_follow' && dismissedNpcRef.current) {
      const dismissedNpc = dismissedNpcRef.current;

      // Lower NPC disposition significantly (-25) and increase panic (+15)
      setOutdoorNpcPool(prev => prev.map(record => {
        if (record.stats.id !== dismissedNpc.npcId) return record;
        return {
          ...record,
          stats: {
            ...record.stats,
            disposition: Math.max(0, record.stats.disposition - 25),
            panicLevel: Math.min(100, record.stats.panicLevel + 15)
          }
        };
      }));

      // Reopen encounter modal with the now-angry NPC after a brief delay
      const npcRecord = outdoorNpcPool.find(r => r.stats.id === dismissedNpc.npcId);
      if (npcRecord) {
        setTimeout(() => {
          setSelectedNpc(npcRecord);
          setIsNPCInitiatedEncounter(false);
          setIsFollowingAfterDismissal(true); // NPC will be angry/fearful
          setShowEncounterModal(true);
        }, 500);
      }

      // Clear the dismissed NPC ref
      dismissedNpcRef.current = null;
    }

    if (option.followupEventId) {
      const def = getEventById(option.followupEventId);
      if (def) {
        const context = buildEventContext();
        const followup = makeEventInstance(def, 'system', context);
        void enqueueEventWithOptionalLLM(followup);
      }
    }
    setEventQueue(prev => {
      const [next, ...rest] = prev;
      setActiveEvent(next || null);
      return rest;
    });
  }, [applyEffects, buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, outdoorNpcPool]);

  // Handle conversation end - save summary and apply impact to NPC disposition
  const handleConversationResult = useCallback((npcId: string, summary: ConversationSummary, impact: ConversationImpact, meta?: { action?: 'end_conversation' | null }) => {
    // Save conversation summary to history
    setConversationHistories(prev => [...prev, summary]);

    // Apply impact to NPC disposition and panic in the pool
    setOutdoorNpcPool(prev => prev.map(record => {
      if (record.stats.id !== npcId) return record;

      // Apply the conversation impact to update disposition and panic
      const { newDisposition, newPanicLevel } = applyConversationImpact(record.stats, impact);

      return {
        ...record,
        stats: {
          ...record.stats,
          disposition: newDisposition,
          panicLevel: newPanicLevel
        }
      };
    }));

    const npcRecord = outdoorNpcPool.find(record => record.stats.id === npcId);
    if (!npcRecord) return;

    const threatEntry = npcThreatMemoryRef.current[npcId];
    const recentWindow = 1;
    let threatCount = threatEntry?.count ?? 0;
    if (impact.threatLevel >= 40 || impact.offenseLevel >= 50) {
      if (!threatEntry || stats.simTime - threatEntry.lastSimTime > recentWindow) {
        threatCount = 1;
      } else {
        threatCount += 1;
      }
      npcThreatMemoryRef.current[npcId] = { count: threatCount, lastSimTime: stats.simTime };
    }

    const context: EventContextSnapshot = {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      npc: {
        id: npcRecord.stats.id,
        name: npcRecord.stats.name,
        profession: npcRecord.stats.profession,
        socialClass: npcRecord.stats.socialClass,
        disposition: npcRecord.stats.disposition,
        panic: npcRecord.stats.panicLevel,
        religion: npcRecord.stats.religion
      },
      environment: {
        district: getDistrictType(params.mapX, params.mapY),
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      },
      flags: {
        threatMemory: threatCount
      }
    };

    const dayIndex = Math.floor(stats.simTime);
    const recentIds = Object.keys(eventCooldownsRef.current).filter(id => eventCooldownsRef.current[id] === dayIndex);
    const convoEvent = checkConversationTrigger(context, impact, recentIds);
    if (convoEvent) {
      eventCooldownsRef.current[convoEvent.definitionId || convoEvent.id] = dayIndex;
      if (meta?.action === 'end_conversation') {
        suppressDismissalEventRef.current = true;
      }
      void enqueueEventWithOptionalLLM(convoEvent);
    }
  }, [currentWeather, enqueueEventWithOptionalLLM, outdoorNpcPool, params.mapX, params.mapY, params.timeOfDay, playerStats, stats.simTime]);

  // Handle triggering events from conversation actions (e.g., NPC dismissing player)
  const handleTriggerConversationEvent = useCallback((eventId: string, npcContext?: { npcId: string; npcName: string }, delayMs = 0) => {
    if (eventId === 'npc_dismissed_player' && suppressDismissalEventRef.current) {
      suppressDismissalEventRef.current = false;
      return;
    }
    const def = getEventById(eventId);
    if (!def) return;

    // Store NPC context for handling "insist on following" option
    if (npcContext) {
      dismissedNpcRef.current = npcContext;
    }

    // Build context with NPC info if available
    const npcRecord = npcContext ? outdoorNpcPool.find(r => r.stats.id === npcContext.npcId) : undefined;
    const contextOverrides: Partial<EventContextSnapshot> = npcRecord ? {
      npc: {
        id: npcRecord.stats.id,
        name: npcRecord.stats.name,
        profession: npcRecord.stats.profession,
        socialClass: npcRecord.stats.socialClass,
        religion: npcRecord.stats.religion,
        disposition: npcRecord.stats.disposition,
        panic: npcRecord.stats.panicLevel
      }
    } : undefined;

    const context = buildEventContext(contextOverrides);
    const event = makeEventInstance(def, 'system', context);
    if (delayMs > 0) {
      window.setTimeout(() => {
        setShowEncounterModal(false);
        void enqueueEventWithOptionalLLM(event);
      }, delayMs);
    } else {
      setShowEncounterModal(false);
      void enqueueEventWithOptionalLLM(event);
    }
  }, [buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, outdoorNpcPool]);

  const handleDebugEvent = useCallback(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const biome = getBiomeForDistrict(district);
    const candidates = getEventsForBiome(biome);
    if (candidates.length === 0) return;

    const context: EventContextSnapshot = {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      environment: {
        district,
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      }
    };

    const event = makeEventInstance(candidates[0], 'system', context);
    void enqueueEventWithOptionalLLM(event);
  }, [currentWeather, enqueueEventWithOptionalLLM, makeEventInstance, params.mapX, params.mapY, params.timeOfDay, playerStats]);

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

  // Time tracking
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 10000;
      lastTime = now;

      if (params.simulationSpeed > 0) {
        const simHoursDelta = dt * params.simulationSpeed / CONSTANTS.REAL_SECONDS_PER_SIM_HOUR;

        simTimeRef.current += simHoursDelta;
        timeOfDayRef.current += simHoursDelta;
        if (timeOfDayRef.current >= 24) timeOfDayRef.current -= 24;

        const commitInterval = 0.1;
        if ((now - lastSimCommitRef.current) / 1000 >= commitInterval) {
          lastSimCommitRef.current = now;
          const nextSimTime = simTimeRef.current;
          const nextTimeOfDay = timeOfDayRef.current;
          setStats(prev => ({
            ...prev,
            simTime: nextSimTime,
            daysPassed: nextSimTime / 24,
          }));
          setParams(prev => ({
            ...prev,
            timeOfDay: nextTimeOfDay
          }));
          setPlayerStats(prevPlayer => ({
            ...prevPlayer,
            plague: progressPlague(prevPlayer.plague, nextSimTime)
          }));
        }
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
  }, [nearBuilding, showEnterModal, nearMerchant, nearSpeakableNpc, showMerchantModal, sceneMode, selectedNpc, showEncounterModal, showPlayerModal, tryTriggerEvent, observeMode, stopObserveMode]);

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
  const canvasDpr = useMemo(() => [1, 2] as [number, number], []);
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
      registry = createTileNPCRegistry(buildings, district, stats.simTime, tileSeed, CONSTANTS.AGENT_COUNT);
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
      const outdoor = Array.from(work.registry.npcMap.values()).filter((record) => record.location === 'outdoor');
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
      spec.npcs = spec.npcs.map((npc) => {
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
    }
    setInteriorSpec(spec);
    setInteriorNarrator(spec.narratorState);
    setInteriorBuilding(building);
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

  const handleDropItem = useCallback((item: { inventoryId: string; itemId: string; label: string; appearance?: import('./types').ItemAppearance }, dropPosition?: [number, number, number]) => {
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
  }, [sceneMode, interiorBuilding, interiorSpec]);

  const handleDropItemAtScreen = useCallback((item: { inventoryId: string; itemId: string; label: string; appearance?: import('./types').ItemAppearance }, clientX: number, clientY: number) => {
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
  }, [dropRaycaster, handleDropItem]);

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

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <div
        className={`absolute inset-0 z-50 bg-black transition-opacity duration-500 pointer-events-none ${
          transitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Initial loading overlay - fades out after assets load */}
      <div
        className={`absolute inset-0 z-[200] bg-stone-950 flex flex-col items-center justify-center transition-opacity duration-1000 ${
          gameLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h1 className="text-5xl md:text-7xl text-amber-100/90 tracking-[0.25em] font-light mb-4"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          DAMASCUS
        </h1>
        <p className="text-2xl md:text-3xl text-amber-200/60 tracking-[0.5em] font-light"
           style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          1348
        </p>
        <div className="mt-12 w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </div>

      {!observeMode && (
      <UI
        params={params}
        setParams={setParams}
        stats={stats}
        playerStats={playerStats}
        devSettings={devSettings}
        setDevSettings={setDevSettings}
        nearBuilding={nearBuilding}
        buildingInfection={buildingInfectionState}
        onFastTravel={handleFastTravel}
        selectedNpc={selectedNpc}
        minimapData={minimapData}
        sceneMode={sceneMode}
        mapX={params.mapX}
        mapY={params.mapY}
        overworldPath={overworldPath}
        pickupPrompt={pickupPrompt}
        climbablePrompt={climbablePrompt}
        isClimbing={isClimbing}
        onClimbInput={(dir) => { climbInputRef.current = dir; }}
        pickupToast={pickupToast?.message ?? null}
        currentWeather={currentWeather}
        pushCharge={pushCharge}
        moraleStats={moraleStats}
        actionSlots={actionSlots}
        onTriggerAction={triggerAction}
        onTriggerPush={triggerPush}
        simTime={stats.simTime}
        showPlayerModal={showPlayerModal}
        setShowPlayerModal={setShowPlayerModal}
        showEncounterModal={showEncounterModal}
        setShowEncounterModal={setShowEncounterModal}
        conversationHistories={conversationHistories}
        onConversationResult={handleConversationResult}
        onTriggerConversationEvent={handleTriggerConversationEvent}
        selectedNpcActivity={selectedNpcActivity}
        selectedNpcNearbyInfected={selectedNpcNearbyInfected}
        selectedNpcNearbyDeceased={selectedNpcNearbyDeceased}
        selectedNpcRumors={selectedNpcRumors}
        activeEvent={activeEvent}
        onResolveEvent={resolveEvent}
        onTriggerDebugEvent={handleDebugEvent}
        llmEventsEnabled={llmEventsEnabled}
        setLlmEventsEnabled={setLlmEventsEnabled}
        lastEventNote={lastEventNote}
        showDemographicsOverlay={showDemographicsOverlay}
        setShowDemographicsOverlay={setShowDemographicsOverlay}
        onForceNpcState={handleForceNpcState}
        onForceAllNpcState={handleForceAllNpcState}
        isNPCInitiatedEncounter={isNPCInitiatedEncounter}
        isFollowingAfterDismissal={isFollowingAfterDismissal}
        onResetFollowingState={() => setIsFollowingAfterDismissal(false)}
        nearbyNPCs={nearbyNPCs}
        onOpenGuideModal={handleOpenGuideModal}
        onSelectGuideEntry={handleOpenGuideEntry}
        infectedHouseholds={infectedHouseholds}
        onNavigateToHousehold={handleNavigateToHousehold}
        onDropItem={handleDropItem}
        onDropItemAtScreen={handleDropItemAtScreen}
        perfDebug={perfDebug}
      />
      )}

      {/* Subtle Performance Indicator - only shows when adjusting, click to dismiss */}
      {!observeMode && performanceDegraded && !indicatorDismissed && (
        <div
          className="absolute top-2 right-2 bg-black/60 text-yellow-400 text-xs px-3 py-1.5 rounded-md border border-yellow-600/30 backdrop-blur-sm font-mono z-50 cursor-pointer hover:bg-black/80 transition-colors"
          onClick={() => setIndicatorDismissed(true)}
          title="Click to dismiss"
        >
          ⚡ Adaptive Quality Active {shadowsDisabledByPerf.current && '(shadows off)'}
        </div>
      )}

      {/* Building Interaction Modal */}
      {!observeMode && showEnterModal && nearBuilding && (
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
      {!observeMode && showMerchantModal && nearMerchant && (
        <MerchantModal
          merchant={nearMerchant}
          playerStats={playerStats}
          onClose={() => setShowMerchantModal(false)}
          onPurchase={handlePurchase}
          onSell={handleSell}
        />
      )}

      {/* Historical Guide Modal */}
      {!observeMode && (
        <GuideModal
          isOpen={showGuideModal}
          onClose={() => {
            setShowGuideModal(false);
            setSelectedGuideEntryId(null);
          }}
          initialEntryId={selectedGuideEntryId}
        />
      )}

      {!observeMode && sceneMode === 'interior' && interiorInfo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[11px] tracking-wide z-50 pointer-events-none max-w-[88vw] text-center">
          {interiorInfo}
        </div>
      )}
      {!observeMode && sceneMode === 'interior' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[10px] uppercase tracking-widest z-50 pointer-events-none">
          Press Esc to Exit
        </div>
      )}

      {/* Merchant Interaction Prompt */}
      {!observeMode && sceneMode === 'outdoor' && nearMerchant && !showMerchantModal && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">E</span> to trade with {nearMerchant.stats.name}
        </div>
      )}

      {/* NPC Speak Prompt (only when no merchant nearby) */}
      {!observeMode && sceneMode === 'outdoor' && nearSpeakableNpc && !nearMerchant && !showEncounterModal && !showMerchantModal && !showEnterModal && !showPlayerModal && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">E</span> to speak to {nearSpeakableNpc.stats.name}
        </div>
      )}

      <Canvas
        shadows
        camera={canvasCamera}
        dpr={canvasDpr}
        gl={canvasGl}
        onPointerDownCapture={() => setSelectedNpc(null)}
        onPointerMissed={() => setSelectedNpc(null)}
        onCreated={({ gl, camera }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          r3fRef.current = { gl, camera };
        }}
      >
        {/* Adaptive Performance - automatically adjusts resolution based on FPS */}
        {/* AdaptiveDpr disabled - can cause resize loops with PerformanceMonitor */}
        {/* <AdaptiveDpr /> */}
        <AdaptiveEvents />
        <PerformanceMonitor
          onIncline={() => {
            const now = Date.now();
            if (now - lastPerfChangeRef.current > PERF_DEBOUNCE_MS) {
              lastPerfChangeRef.current = now;
              setPerformanceDegraded(false);
              setIndicatorDismissed(false); // Reset dismissal when performance recovers
              // Re-enable shadows if we disabled them due to low FPS
              if (shadowsDisabledByPerf.current) {
                shadowsDisabledByPerf.current = false;
                setDevSettings(prev => ({ ...prev, showShadows: true }));
              }
            }
          }}
          onDecline={() => {
            const now = Date.now();
            if (now - lastPerfChangeRef.current > PERF_DEBOUNCE_MS) {
              lastPerfChangeRef.current = now;
              setPerformanceDegraded(true);
            }
          }}
          flipflops={5}
          onChange={({ factor, fps }) => {
            // Log performance changes in dev mode
            if (devSettings.enabled && devSettings.showPerfPanel) {
              console.log(`Performance: ${fps?.toFixed(1) ?? '?'} FPS, factor: ${factor.toFixed(2)}x`);
            }
            // Disable shadows when FPS drops below threshold
            if (fps !== undefined && fps < LOW_FPS_THRESHOLD && devSettings.showShadows && !shadowsDisabledByPerf.current) {
              shadowsDisabledByPerf.current = true;
              setDevSettings(prev => ({ ...prev, showShadows: false }));
              setPerformanceDegraded(true);
              console.log(`[Performance] Shadows disabled due to low FPS (${fps.toFixed(1)} < ${LOW_FPS_THRESHOLD})`);
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
              onBuildingsUpdate={handleBuildingsUpdate}
              onNearMerchant={setNearMerchant}
              onNpcSelect={setSelectedNpc}
              onNpcUpdate={handleNpcUpdate}
              selectedNpcId={selectedNpc?.stats.id ?? null}
              onMinimapUpdate={setMinimapData}
              onPickupPrompt={setPickupPrompt}
              onClimbablePrompt={setClimbablePrompt}
              onClimbingStateChange={setIsClimbing}
              climbInputRef={climbInputRef}
              onPickupItem={handlePickupItem}
              onWeatherUpdate={setCurrentWeather}
              onPushCharge={setPushCharge}
              pushTriggerRef={pushTriggerRef}
              onMoraleUpdate={handleMoraleUpdate}
              actionEvent={actionEvent}
              showDemographicsOverlay={showDemographicsOverlay}
              npcStateOverride={npcStateOverride}
              npcPool={outdoorNpcPool}
              buildingInfection={buildingInfectionState}
              onPlayerPositionUpdate={(pos) => playerPositionRef.current.copy(pos)}
              dossierMode={showPlayerModal}
              onPlagueExposure={handlePlagueExposure}
              onNPCInitiatedEncounter={handleNPCInitiatedEncounter}
              onFallDamage={handleFallDamage}
              cameraViewTarget={cameraViewTarget}
              onPlayerStartMove={handlePlayerStartMove}
              dropRequests={dropRequests}
              onNearSpeakableNpc={setNearSpeakableNpc}
              observeMode={observeMode}
              gameLoading={gameLoading}
              mapEntrySpawn={mapEntrySpawn}
            />
          )}
          {!transitioning && sceneMode === 'interior' && interiorSpec && (
            <InteriorScene
              spec={interiorSpec}
              params={params}
              simTime={stats.simTime}
              playerStats={playerStats}
              onPickupPrompt={setPickupPrompt}
              onPickupItem={handlePickupItem}
              onNpcSelect={setSelectedNpc}
              onNpcUpdate={handleNpcUpdate}
              selectedNpcId={selectedNpc?.stats.id ?? null}
              showDemographicsOverlay={showDemographicsOverlay}
              npcStateOverride={npcStateOverride}
              onPlagueExposure={handlePlagueExposure}
              onPlayerPositionUpdate={(pos) => playerPositionRef.current.copy(pos)}
              dropRequests={dropRequests}
              observeMode={observeMode}
            />
          )}
        </Suspense>
      </Canvas>

      <ObserveController
        observeMode={observeMode}
        lines={observeLines}
        lineCount={observeLineCount}
        onReturn={stopObserveMode}
      />

      {!observeMode && (
        <PlagueUI
          plague={playerStats.plague}
          showPlagueModal={showPlagueModal}
          plagueNotification={plagueNotification}
          onCloseModal={() => setShowPlagueModal(false)}
          onClearNotification={() => setPlagueNotification(null)}
          onModalPauseToggle={(paused) => {
            if (paused) {
              prevSimSpeedRef.current = params.simulationSpeed;
              setParams(prev => ({ ...prev, simulationSpeed: 0.01 }));
            } else {
              setParams(prev => ({
                ...prev,
                simulationSpeed: prev.simulationSpeed === 0.01 ? prevSimSpeedRef.current : prev.simulationSpeed
              }));
            }
          }}
        />
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-[#1a1209] border-4 border-red-900/60 p-10 rounded-lg shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
            {/* Dark parchment effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

            {/* Skull or death symbol */}
            <div className="text-6xl mb-4 opacity-80">💀</div>

            <h2 className="text-4xl text-red-700 mb-4 tracking-tight uppercase font-bold">
              {gameOver.reason}
            </h2>

            <div className="w-16 h-0.5 bg-red-900/40 mx-auto mb-6"></div>

            <p className="text-amber-200/80 text-lg mb-8 leading-relaxed italic">
              {gameOver.description}
            </p>

            <p className="text-amber-400/60 text-sm mb-8">
              Damascus, 1348
            </p>

            <button
              onClick={() => window.location.reload()}
              className="bg-red-900 hover:bg-red-800 text-amber-100 px-12 py-4 rounded-full tracking-widest transition-all shadow-lg active:scale-95 text-lg uppercase"
            >
              Begin Anew
            </button>

            <div className="mt-8 text-[10px] text-amber-900/50 uppercase tracking-widest">
              "In the midst of life we are in death"
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toast
        messages={toastMessages}
        onDismiss={(id) => setToastMessages((prev) => prev.filter((msg) => msg.id !== id))}
      />
    </div>
  );
}

export default App;
