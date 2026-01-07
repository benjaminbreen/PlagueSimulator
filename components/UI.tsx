
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SimulationParams, SimulationStats, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, BuildingInfectionState, MiniMapData, getLocationLabel, NPCStats, AgentState, ActionSlotState, ActionId, EventInstance, EventEffect, EventOption, SocialClass, ItemAppearance } from '../types';
import { MoraleStats } from './Agents';
import { ActionBar } from './ActionBar';
import { Humanoid } from './Humanoid';
import { seededRandom } from '../utils/procedural';
import { getItemDetailsByItemId } from '../utils/merchantItems';
import {
  Layers,
  Eye,
  Info,
  User,
  Map as MapIcon,
  Activity,
  X,
  FileText,
  MessageSquare,
  Home
} from 'lucide-react';
import { BiomeAmbience, useBiomeAmbiencePreview, AMBIENCE_INFO, BiomeType } from './audio/BiomeAmbience';
import { AdhanSynth, MelodyName } from './audio/synthesis/AdhanSynth';
import { SoundDebugPanel } from './audio/SoundDebugPanel';
import { EncounterModal } from './EncounterModal/EncounterModal';
import { EventModal } from './EventModal';
import { ConversationSummary } from '../types';
import { OverworldMap } from './OverworldMap';
import { TravelConfirmationModal } from './TravelConfirmationModal';
import { ConversationImpact } from '../utils/friendliness';
import { getHealthStatusLabel, getPlagueTypeLabel } from '../utils/plague';
import { ItemPreview3D } from './ItemPreview3D';
import { Compass } from './Compass';
import { PerspectiveMenu } from './PerspectiveMenu';
import { MobilePerspectiveMenu } from './MobilePerspectiveMenu';
import { TopStatusBar } from './TopStatusBar';
import { WeatherModal } from './WeatherModal';
import { useNarration } from './useNarration';
import { MapModal } from './MapModal';
import { PlayerDossierModal } from './PlayerDossierModal';
import { SettingsModal } from './SettingsModal';
import { ReportsPanel } from './ReportsPanel';
import { ReportsPanelMockupC } from './ReportsPanelMockupC';
import { AboutModal } from './AboutModal';
import { FamilyMemberModal } from './FamilyMemberModal';
import { FamilyMember } from '../types';
import { buildNarratorPrompt, NarratorContext } from '../utils/narratorPrompt';
import { NarratorHighlightEntry } from './NarratorPanel';
import { LLMTransparencyModal } from './LLMTransparencyModal';
import { NpcListModal, NpcListEntry } from './NpcListModal';

interface UIProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  stats: SimulationStats;
  playerStats: PlayerStats;
  devSettings: DevSettings;
  setDevSettings: React.Dispatch<React.SetStateAction<DevSettings>>;
  nearBuilding: BuildingMetadata | null;
  buildingInfection?: Record<string, BuildingInfectionState>;
  onFastTravel: (x: number, y: number) => void;
  selectedNpc: { stats: NPCStats; state: AgentState } | null;
  minimapData: MiniMapData | null;
  sceneMode: 'outdoor' | 'interior';
  mapX: number;
  mapY: number;
  overworldPath: { mapX: number; mapY: number; enteredAtSimTime: number }[];
  pickupPrompt: string | null;
  climbablePrompt: string | null;
  isClimbing: boolean;
  onClimbInput?: (direction: 'up' | 'down' | 'cancel' | null) => void;
  onTriggerPickup?: () => void;  // Trigger pickup action (mobile/touch)
  onTriggerClimb?: () => void;   // Trigger climb initiation (mobile/touch)
  pickupToast: string | null;
  currentWeather: string;
  pushCharge: number;
  moraleStats: MoraleStats;
  actionSlots: ActionSlotState;
  onTriggerAction: (actionId: ActionId) => void;
  onTriggerPush?: () => void;
  simTime: number;
  showPlayerModal: boolean;
  setShowPlayerModal: React.Dispatch<React.SetStateAction<boolean>>;
  showMerchantModal?: boolean;
  showEncounterModal: boolean;
  setShowEncounterModal: React.Dispatch<React.SetStateAction<boolean>>;
  conversationHistories: ConversationSummary[];
  /** Handler for when conversation ends - receives npcId, summary, and impact for disposition updates */
  onConversationResult: (npcId: string, summary: ConversationSummary, impact: ConversationImpact, meta?: { action?: 'end_conversation' | null }) => void;
  /** Handler for triggering events from conversation actions (e.g., NPC dismissing player) */
  onTriggerConversationEvent?: (eventId: string, npcContext?: { npcId: string; npcName: string }, delayMs?: number) => void;
  selectedNpcActivity: string;
  selectedNpcNearbyInfected: number;
  selectedNpcNearbyDeceased: number;
  selectedNpcRumors: string[];
  activeEvent: EventInstance | null;
  onResolveEvent: (option: EventOption) => void;
  onTriggerDebugEvent: () => void;
  llmEventsEnabled: boolean;
  setLlmEventsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  lastEventNote: string | null;
  showDemographicsOverlay: boolean;
  setShowDemographicsOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  onForceNpcState: (id: string, state: AgentState) => void;
  onForceAllNpcState: (state: AgentState) => void;
  /** Whether the current encounter was initiated by an NPC approaching the player */
  isNPCInitiatedEncounter?: boolean;
  /** Whether the player insisted on following after being dismissed - NPC is angry/fearful */
  isFollowingAfterDismissal?: boolean;
  /** Callback to reset the following state when encounter ends */
  onResetFollowingState?: () => void;
  /** Nearby NPCs for historical guide context */
  nearbyNPCs?: NPCStats[];
  /** Callback to open the historical guide modal */
  onOpenGuideModal?: () => void;
  /** Callback to open guide modal to a specific entry */
  onSelectGuideEntry?: (entryId: string) => void;
  /** List of infected households for epidemic report */
  infectedHouseholds: import('../types').InfectedHouseholdInfo[];
  /** Callback to navigate to an infected household */
  onNavigateToHousehold?: (buildingPosition: [number, number, number]) => void;
  /** Callback to navigate to deceased NPCs (cycles through all deceased) */
  onNavigateToDeceased?: () => void;
  /** Drop an inventory item near the player */
  onDropItem?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }) => void;
  /** Drop an inventory item at a screen coordinate */
  onDropItemAtScreen?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }, clientX: number, clientY: number) => void;
  /** Consume an inventory item (use its effects) */
  onConsumeItem?: (playerItem: import('../types').PlayerItem) => void;
  /** Build a narrator context snapshot for LLM */
  getNarratorContext?: () => NarratorContext;
  /** Highlight a narrator target in-world */
  onNarratorHighlight?: (entry: NarratorHighlightEntry) => void;
  /** Build NPC list entries for debugging */
  getNpcListEntries?: () => NpcListEntry[];
  perfDebug?: {
    schedulePhase: number;
    scheduleActive: boolean;
    lastScheduleMs: number;
    lastScheduleSimTime: number;
  };
  /** Callback to trigger entering a building (same as pressing Enter) */
  onTriggerEnterBuilding?: () => void;
  /** Home building type for dossier display */
  homeBuildingType?: string;
  /** District name where home is located */
  homeDistrictName?: string;
  /** Whether player is currently on their home tile */
  isOnHomeTile?: boolean;
  /** Navigate to home tile */
  onGoHome?: () => void;
  /** Unequip headwear to reveal hair */
  onUnequipHeadwear?: () => void;
  /** Equip headwear from inventory */
  onEquipHeadwear?: () => void;
  /** Whether player is in a private space (bedroom, upper floor) - NPCs react with alarm */
  isInPrivateSpace?: boolean;
  /** Current building type for social appropriateness checks */
  currentBuildingType?: import('../types').BuildingType;
  /** Current building profession for context */
  currentBuildingProfession?: string;
}

interface InventoryEntry {
  id: string;
  itemId: string;
  quantity: number;
  acquiredAt: number;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
  category: string;
  effects?: Array<{ type: string; value: number }>;
  appearance?: ItemAppearance;
}

const MiniMap: React.FC<{ data: MiniMapData | null; sceneMode: 'outdoor' | 'interior'; onClose: () => void; onToggle: () => void; isNight?: boolean }> = ({ data, sceneMode, onClose, onToggle, isNight = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [minimapSize, setMinimapSize] = useState(() => (window.innerWidth < 640 ? 150 : 220));
  const lastRenderRef = useRef(0);
  const lastSizeRef = useRef(0);

  // Expanded size is larger
  const displaySize = expanded ? Math.min(window.innerWidth - 48, window.innerHeight - 200, 400) : minimapSize;

  useEffect(() => {
    const handleResize = () => {
      setMinimapSize(window.innerWidth < 640 ? 150 : 220);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || sceneMode !== 'outdoor') return;

    // Throttle renders to ~12fps (83ms) - minimap doesn't need 60fps
    const now = performance.now();
    if (now - lastRenderRef.current < 83 && lastSizeRef.current === displaySize) return;
    lastRenderRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = displaySize;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35);

    // Only resize canvas when size actually changes
    if (lastSizeRef.current !== size) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      lastSizeRef.current = size;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = size / 2 - 8;

    ctx.save();
    ctx.translate(center, center);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();

    const bg = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    bg.addColorStop(0, '#0b0f14');
    bg.addColorStop(1, '#06080b');
    ctx.fillStyle = bg;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(102, 133, 160, 0.12)';
    ctx.lineWidth = 1;
    [0.35, 0.65, 0.9].forEach((t) => {
      ctx.beginPath();
      ctx.arc(0, 0, radius * t, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Fixed north-up map projection (no rotation)
    const scale = radius / data.radius;

    // Project function - NO rotation, north is always up
    // In Three.js: +Z is typically "into screen" / south, -Z is forward/north
    // On canvas: -Y is up. We negate Z so things ahead of player appear above.
    const project = (x: number, z: number) => {
      const dx = x - data.player.x;
      const dz = z - data.player.z;
      // X maps to horizontal, -Z maps to up (north)
      return { x: dx * scale, y: -dz * scale };
    };

    // Helper to get edge position for off-screen POIs
    const getEdgePosition = (x: number, z: number) => {
      const dx = x - data.player.x;
      const dz = z - data.player.z;
      const angle = Math.atan2(-dz, dx); // Negate dz to match projection
      const edgeRadius = radius - 12;
      return {
        x: Math.cos(angle) * edgeRadius,
        y: Math.sin(angle) * edgeRadius,
        angle
      };
    };

    // Track off-screen POIs for edge indicators
    const offScreenPOIs: Array<{ x: number; z: number; color: string; label: string }> = [];

    // Get building color and label based on type
    const getBuildingInfo = (type: BuildingType) => {
      switch (type) {
        case BuildingType.COMMERCIAL: return { color: '#8a6a3e', label: 'SHOP' };
        case BuildingType.RELIGIOUS: return { color: '#6d8a97', label: 'MOSQUE' };
        case BuildingType.CIVIC: return { color: '#8b6a5a', label: 'CIVIC' };
        case BuildingType.SCHOOL: return { color: '#7b7aa6', label: 'SCHOOL' };
        case BuildingType.MEDICAL: return { color: '#6f8a76', label: 'HOSPITAL' };
        case BuildingType.HOSPITALITY: return { color: '#8a7a5c', label: 'INN' };
        default: return { color: '#58616b', label: '' };
      }
    };

    // Collect labeled buildings (non-residential) for smart labeling
    const labeledBuildings: Array<{
      p: { x: number; y: number };
      dist: number;
      alpha: number;
      bSize: number;
      color: string;
      label: string;
      doorSide: number;
    }> = [];

    data.buildings.forEach((b) => {
      const p = project(b.x, b.z);
      const distSq = p.x * p.x + p.y * p.y;
      if (distSq > radius * radius) return;
      const dist = Math.sqrt(distSq) / radius;
      const alpha = Math.pow(1 - dist, 2.2);
      if (alpha < 0.15) return;

      const { color, label } = getBuildingInfo(b.type);
      const bSize = Math.max(6, Math.min(24, b.size * scale));
      const isEnterable = b.enterable !== false;

      // Draw building shape - minimal shadows for performance
      ctx.fillStyle = color;
      ctx.shadowBlur = 0; // Removed per-building shadows
      ctx.globalAlpha = alpha * (isEnterable ? 0.5 : 0.35);
      ctx.fillRect(p.x - bSize / 2, p.y - bSize / 2, bSize, bSize);

      // Stroke - brighter for enterable buildings
      ctx.strokeStyle = isEnterable ? '#4ade80' : color;
      ctx.globalAlpha = alpha * (isEnterable ? 1.0 : 0.85);
      ctx.lineWidth = isEnterable ? 2.2 : 1.6;
      ctx.strokeRect(p.x - bSize / 2, p.y - bSize / 2, bSize, bSize);

      // Door notch
      const notch = Math.max(3, bSize * 0.18);
      const half = bSize / 2;
      let nx = 0;
      let ny = 0;
      if (b.doorSide === 0) ny = half;
      else if (b.doorSide === 1) ny = -half;
      else if (b.doorSide === 2) nx = half;
      else nx = -half;
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.x + nx - (ny !== 0 ? notch : 0), p.y + ny - (nx !== 0 ? notch : 0));
      ctx.lineTo(p.x + nx + (ny !== 0 ? notch : 0), p.y + ny + (nx !== 0 ? notch : 0));
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Track non-residential buildings for labeling
      if (label) {
        labeledBuildings.push({ p, dist, alpha, bSize, color, label, doorSide: b.doorSide });
      }
    });

    // Draw labels for closest 6 non-residential buildings
    const maxLabels = 6;
    const labelFadeStart = 0.4; // Start fading labels at 40% radius

    labeledBuildings
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxLabels)
      .forEach(({ p, dist, alpha, bSize, color, label }) => {
        // Extra fade for labels - only show clearly for close buildings
        let labelAlpha = alpha;
        if (dist > labelFadeStart) {
          const fadeProgress = (dist - labelFadeStart) / (1 - labelFadeStart);
          labelAlpha = alpha * Math.pow(1 - fadeProgress, 1.5);
        }
        if (labelAlpha < 0.2) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Label background for readability
        ctx.font = 'bold 8px sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.globalAlpha = Math.min(1, labelAlpha * 0.85);
        ctx.fillStyle = '#000';
        ctx.fillRect(-textWidth / 2 - 3, bSize / 2 + 1, textWidth + 6, 11);

        // Label text
        ctx.globalAlpha = Math.min(1, labelAlpha * 1.1);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, 0, bSize / 2 + 2);

        ctx.restore();
      });

    // NPCs
    const maxNpcsShown = 15;
    const npcFadeStartRadius = 0.5;
    const npcCullRadius = 0.75;

    const sortedNpcs = data.npcs
      .map((npc) => {
        const p = project(npc.x, npc.z);
        const distSq = p.x * p.x + p.y * p.y;
        const dist = Math.sqrt(distSq) / radius;
        return { npc, p, dist, distSq };
      })
      .filter(({ dist }) => dist < npcCullRadius)
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, maxNpcsShown);

    sortedNpcs.forEach(({ npc, p, dist }) => {
      let alpha = 1.0;
      if (dist > npcFadeStartRadius) {
        const fadeRange = npcCullRadius - npcFadeStartRadius;
        const fadeProgress = (dist - npcFadeStartRadius) / fadeRange;
        alpha = Math.pow(1 - fadeProgress, 2.5);
      }
      alpha = Math.max(0.2, alpha);

      const glow = npc.state === AgentState.INFECTED ? '#ef4444'
        : npc.state === AgentState.INCUBATING ? '#f59e0b'
        : '#8fe3ff';

      // Draw NPC dot - no shadow for performance, slightly larger for visibility
      ctx.shadowBlur = 0;
      ctx.fillStyle = glow;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Special NPCs - with edge indicators for off-screen
    data.specialNPCs.forEach((specialNPC) => {
      const p = project(specialNPC.x, specialNPC.z);
      const distSq = p.x * p.x + p.y * p.y;

      let color = '#fff';
      let label = '';
      if (specialNPC.type === 'SUFI_MYSTIC') {
        color = '#a78bfa';
        label = 'SUFI';
      } else if (specialNPC.type === 'ASTROLOGER') {
        color = '#60a5fa';
        label = 'ASTRO';
      } else if (specialNPC.type === 'SCRIBE') {
        color = '#fbbf24';
        label = 'SCRIBE';
      }

      // If off-screen, add to edge indicators
      if (distSq > radius * radius) {
        offScreenPOIs.push({ x: specialNPC.x, z: specialNPC.z, color, label });
        return;
      }

      const dist = Math.sqrt(distSq) / radius;
      const alpha = Math.pow(1 - dist, 1.5);
      if (alpha < 0.15) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.9;

      // 5-pointed star
      ctx.beginPath();
      const spikes = 5;
      const outerRad = 5;
      const innerRad = 2.5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRad : innerRad;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Label background pill for readability
      ctx.font = 'bold 9px sans-serif';
      const npcTextWidth = ctx.measureText(label).width;
      ctx.globalAlpha = Math.min(1, alpha * 0.9);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.roundRect(-npcTextWidth / 2 - 4, -20, npcTextWidth + 8, 12, 3);
      ctx.fill();

      // Label text
      ctx.globalAlpha = Math.min(1, alpha * 1.1);
      ctx.fillStyle = color;
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, 0, -9);

      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // Landmarks
    if (data.landmarks && data.landmarks.length > 0) {
      data.landmarks.forEach((lm) => {
        const p = project(lm.x, lm.z);
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq > radius * radius) return;
        const dist = Math.sqrt(distSq) / radius;
        const alpha = Math.pow(1 - dist, 1.8);
        if (alpha < 0.2) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Landmark dot
        ctx.globalAlpha = Math.min(1, alpha * 1.1);
        ctx.fillStyle = '#e8d9a8';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#d4c896';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label background
        ctx.font = 'bold 8px sans-serif';
        const lmText = lm.label.toUpperCase();
        const lmTextWidth = ctx.measureText(lmText).width;
        ctx.globalAlpha = Math.min(1, alpha * 0.85);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.fillRect(-lmTextWidth / 2 - 3, 4, lmTextWidth + 6, 11);

        // Label text
        ctx.globalAlpha = Math.min(1, alpha * 1.1);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e8d9a8';
        ctx.fillText(lmText, 0, 5);
        ctx.restore();
      });
    }

    // === MERCHANT ICONS ===
    if (data.merchants && data.merchants.length > 0) {
      data.merchants.forEach((merchant) => {
        const p = project(merchant.x, merchant.z);
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq > radius * radius) return;
        const dist = Math.sqrt(distSq) / radius;
        const alpha = Math.pow(1 - dist, 1.6);
        if (alpha < 0.2) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Gold coin icon for merchant - no shadow for performance
        const coinColor = '#f59e0b';
        const coinSize = expanded ? 5 : 4;

        // Coin circle
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = coinColor;
        ctx.beginPath();
        ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(-coinSize * 0.2, -coinSize * 0.2, coinSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // "$" symbol
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#78350f';
        ctx.font = `bold ${expanded ? 6 : 5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);

        // Label in expanded mode
        if (expanded && merchant.profession) {
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = '#000';
          const labelText = merchant.profession.toUpperCase().slice(0, 10);
          const labelWidth = ctx.measureText(labelText).width;
          ctx.fillRect(-labelWidth / 2 - 2, coinSize + 2, labelWidth + 4, 9);

          ctx.globalAlpha = alpha;
          ctx.fillStyle = coinColor;
          ctx.font = 'bold 7px sans-serif';
          ctx.fillText(labelText, 0, coinSize + 7);
        }

        ctx.restore();
      });
    }

    // Player home marker
    if (data.playerHome) {
      const p = project(data.playerHome.x, data.playerHome.z);
      const distSq = p.x * p.x + p.y * p.y;

      // If home is off-screen, add edge indicator
      if (distSq > radius * radius) {
        offScreenPOIs.push({ x: data.playerHome.x, z: data.playerHome.z, color: '#fbbf24', label: 'HOME' });
      } else {
        const dist = Math.sqrt(distSq) / radius;
        const alpha = Math.max(0.4, Math.pow(1 - dist, 1.2));

        ctx.save();
        ctx.translate(p.x, p.y);

        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 400);
        ctx.shadowBlur = 16 * pulse;
        ctx.shadowColor = '#fbbf24';
        ctx.globalAlpha = alpha * 0.6 * pulse;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-4, -1, 8, 6);

        ctx.beginPath();
        ctx.moveTo(-5, -1);
        ctx.lineTo(0, -6);
        ctx.lineTo(5, -1);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#92400e';
        ctx.fillRect(-1.5, 1, 3, 4);

        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#000';
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('HOME', 0, -8);

        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // === EDGE INDICATORS for off-screen POIs ===
    offScreenPOIs.forEach((poi) => {
      const edge = getEdgePosition(poi.x, poi.z);

      ctx.save();
      ctx.translate(edge.x, edge.y);
      ctx.rotate(edge.angle);

      // Chevron arrow pointing outward
      ctx.shadowBlur = 8;
      ctx.shadowColor = poi.color;
      ctx.fillStyle = poi.color;
      ctx.globalAlpha = 0.85;

      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-2, -4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // === COMPASS ROSE in top-left corner ===
    ctx.save();
    const compassX = -radius + 18;
    const compassY = -radius + 18;
    ctx.translate(compassX, compassY);

    // Compass background
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#0a0d10';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(210, 180, 120, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // North pointer (red/gold)
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d4a056';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#d4a056';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    // South pointer (darker)
    ctx.fillStyle = '#4a4a4a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    // N label
    ctx.fillStyle = '#d4a056';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000';
    ctx.fillText('N', 0, -10);

    ctx.restore();

    // === CAMERA VIEW CONE - Shows where camera is looking ===
    const cameraYaw = Number.isFinite(data.player.cameraYaw) ? data.player.cameraYaw : data.player.yaw;
    const characterYaw = data.player.yaw;
    const fovAngle = Math.PI / 3; // 60 degree field of view
    const coneLength = radius * 0.65; // How far the cone extends

    ctx.save();
    // Canvas rotation is clockwise for positive angles
    // With Y-flipped projection, we rotate by positive yaw
    ctx.rotate(cameraYaw);

    // Cone gradient - fades out toward edges
    const coneGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coneLength);
    coneGradient.addColorStop(0, 'rgba(135, 206, 250, 0.3)');
    coneGradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.15)');
    coneGradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

    ctx.fillStyle = coneGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Draw cone arc pointing "up" (-Y direction) before rotation
    ctx.arc(0, 0, coneLength, -Math.PI / 2 - fovAngle / 2, -Math.PI / 2 + fovAngle / 2);
    ctx.closePath();
    ctx.fill();

    // Cone edge lines for clarity
    ctx.strokeStyle = 'rgba(135, 206, 250, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(-Math.PI / 2 - fovAngle / 2) * coneLength,
      Math.sin(-Math.PI / 2 - fovAngle / 2) * coneLength
    );
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(-Math.PI / 2 + fovAngle / 2) * coneLength,
      Math.sin(-Math.PI / 2 + fovAngle / 2) * coneLength
    );
    ctx.stroke();

    ctx.restore();

    // === PLAYER ARROW - Shows character facing direction ===
    ctx.save();
    ctx.rotate(characterYaw); // Character facing direction (positive to match Y-flip)

    // Outer glow
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#f7c66a';

    // Arrow body
    ctx.fillStyle = '#f7c66a';
    ctx.beginPath();
    ctx.moveTo(0, -9);      // Tip (points in facing direction)
    ctx.lineTo(5, 7);       // Bottom right
    ctx.lineTo(0, 3);       // Notch
    ctx.lineTo(-5, 7);      // Bottom left
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#fffaed';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(2, 3);
    ctx.lineTo(0, 1);
    ctx.lineTo(-2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.restore();
  }, [data, displaySize, sceneMode, expanded]);

  if (!data || sceneMode !== 'outdoor') return null;

  const districtLabel = data.district === 'MARKET' ? 'Market' :
    data.district === 'WEALTHY' ? 'Wealthy Quarter' :
    data.district === 'HOVELS' ? 'Poor Hovels' :
    data.district === 'CIVIC' ? 'Civic District' :
    data.district === 'ALLEYS' ? 'Narrow Alleys' :
    data.district === 'JEWISH_QUARTER' ? 'Jewish Quarter (Al-Yahud)' :
    data.district === 'CHRISTIAN_QUARTER' ? 'Christian Quarter' :
    data.district === 'UMAYYAD_MOSQUE' ? 'Great Mosque' :
    data.district === 'SALHIYYA' ? 'Al-Salihiyya' :
    data.district === 'OUTSKIRTS_FARMLAND' ? 'Ghouta Farmlands' :
    data.district === 'OUTSKIRTS_DESERT' ? 'Desert Outskirts' :
    data.district === 'CARAVANSERAI' ? 'Caravanserai' :
    data.district === 'SOUTHERN_ROAD' ? 'Southern Road' :
    data.district === 'STRAIGHT_STREET' ? 'Straight Street' :
    data.district === 'SOUQ_AXIS' ? 'Souq Axis' :
    data.district === 'MIDAN' ? 'Al-Midan' :
    data.district === 'BAB_SHARQI' ? 'Bab Sharqi' :
    'Residential';

  // When expanded, center the minimap on screen
  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={() => setExpanded(false)}
      >
        <div
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-full p-[4px]"
            style={{ background: 'linear-gradient(135deg, #7a5a2e, #d3a45a 45%, #6b4b22)' }}
          >
            <div
              className="relative rounded-full p-[8px] bg-black/90 border-2 border-amber-900/50 shadow-[0_0_40px_rgba(210,164,90,0.5)]"
              aria-label="Expanded Minimap"
            >
              <canvas ref={canvasRef} className="rounded-full block" />
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), transparent 55%)' }}
              />
            </div>
          </div>
          {/* Legend */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] text-amber-100/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border-2 border-[#4ade80] bg-[#4ade80]/30"></span>
              <span>Enterable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
              <span>Merchant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#8fe3ff]"></span>
              <span>NPC</span>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={() => setExpanded(false)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 border border-amber-700/60 text-amber-200 hover:text-white hover:bg-black/90 flex items-center justify-center text-lg"
          >
            ×
          </button>
          {/* District label */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm uppercase tracking-[0.3em] text-amber-100 whitespace-nowrap"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            {districtLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-6 pointer-events-auto group">
      <div
        className="rounded-full p-[3px] cursor-pointer transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #7a5a2e, #d3a45a 45%, #6b4b22)' }}
        onClick={() => setExpanded(true)}
        title="Click to expand"
      >
        <div
          className="relative rounded-full p-[6px] bg-black/80 border border-amber-900/40 shadow-[0_0_24px_rgba(210,164,90,0.35)]"
          aria-label="Local Minimap"
        >
          <canvas ref={canvasRef} className="rounded-full block" />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.12), transparent 55%)' }}
          />
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute top-2 right-2 rounded-full border border-amber-700/50 bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-widest text-amber-200/80 opacity-0 transition-opacity duration-200 hover:text-amber-100 group-hover:opacity-100"
          >
            Close
          </button>
        </div>
      </div>
      <div
        onClick={onToggle}
        className={`mt-2 text-[9px] uppercase tracking-[0.3em] text-center cursor-pointer transition-all duration-200 ${
          isNight
            ? 'text-amber-200/60 hover:text-amber-100'
            : 'text-amber-100 hover:text-white'
        }`}
        style={{
          textShadow: isNight
            ? '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'
            : '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)'
        }}
      >
        {districtLabel}
      </div>
    </div>
  );
};

const PortraitRenderOnce: React.FC = () => {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [invalidate]);
  return null;
};

const NpcPortrait: React.FC<{
  npc: NPCStats;
  sizeClassName?: string;
  frameClassName?: string;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  lookAtY?: number;
  groupOffsetY?: number;
}> = ({
  npc,
  sizeClassName = 'w-12 h-12',
  frameClassName = 'rounded-full',
  cameraPosition = [0, 1.4, 2.3],
  cameraFov = 24,
  lookAtY = 1.4,
  groupOffsetY = -1.45
}) => {
  const seed = Number(npc.id.split('-')[1] || '1');
  const tone = seededRandom(seed + 11);
  const skin = `hsl(${26 + Math.round(tone * 8)}, ${28 + Math.round(tone * 18)}%, ${30 + Math.round(tone * 18)}%)`;
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
  const hair = hairPalette[Math.floor(seededRandom(seed + 17) * hairPalette.length)];
  const scarfPalette = ['#d6c2a4', '#c7b08c', '#c2a878', '#bfa57e'];
  const scarf = scarfPalette[Math.floor(seededRandom(seed + 29) * scarfPalette.length)];
  const robePalette = ['#6f6a3f', '#7b5a4a', '#6b5a45', '#5c4b3a', '#4a4f59'];
  const robe = robePalette[Math.floor(seededRandom(seed + 41) * robePalette.length)];
  const accentPalette = ['#e1d3b3', '#d9c9a8', '#cbb58c', '#bfa57e'];
  const accent = accentPalette[Math.floor(seededRandom(seed + 43) * accentPalette.length)];
  const headwearPalette = ['#8b2e2e', '#1f1f1f', '#cbb48a', '#7b5a4a', '#3f5d7a'];
  const headwearIndex = Math.floor(seededRandom(seed + 55) * headwearPalette.length);
  const headwear = npc.headwearStyle === 'straw'
    ? '#cbb48a'
    : npc.headwearStyle === 'fez'
      ? (seededRandom(seed + 57) > 0.5 ? '#8b2e2e' : '#cbb48a')
      : headwearPalette[headwearIndex];

  return (
    <div className={`${sizeClassName} ${frameClassName} border border-amber-800/50 bg-black/40 overflow-hidden`}>
      <Canvas
        frameloop="demand"
        camera={{ position: cameraPosition, fov: cameraFov }}
        dpr={1}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, lookAtY, 0);
        }}
      >
        <PortraitRenderOnce />
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 2, 2]} intensity={0.7} />
        <group position={[0, groupOffsetY, 0]}>
          <Humanoid
            color={npc.gender === 'Female' ? robe : '#5c4b3a'}
            headColor={skin}
            turbanColor={headwear}
            headscarfColor={scarf}
            robeAccentColor={accent}
            hairColor={hair}
            eyeColor={npc.eyeColor}
            gender={npc.gender}
            hairStyle={npc.hairStyle}
            headwearStyle={npc.headwearStyle}
            robeHasTrim={npc.robeHasTrim}
            robeHemBand={npc.robeHemBand}
            robeSpread={npc.robeSpread}
            robeOverwrap={npc.robeOverwrap}
            robePattern={npc.robePattern}
            sleeveCoverage={npc.sleeveCoverage}
            footwearStyle={npc.footwearStyle}
            footwearColor={npc.footwearColor}
            accessories={npc.accessories}
            mouthExpression={npc.charisma != null ? Math.max(-1, Math.min(1, (npc.charisma - 8) / 6)) : 0}
            enableArmSwing={false}
            showGroundShadow={false}
            distanceFromCamera={0}
          />
        </group>
      </Canvas>
    </div>
  );
};

export const UI: React.FC<UIProps> = ({ params, setParams, stats, playerStats, devSettings, setDevSettings, nearBuilding, buildingInfection, onFastTravel, selectedNpc, minimapData, sceneMode, mapX, mapY, overworldPath, pickupPrompt, climbablePrompt, isClimbing, onClimbInput, onTriggerPickup, onTriggerClimb, pickupToast, currentWeather, pushCharge, moraleStats, actionSlots, onTriggerAction, onTriggerPush, simTime, showPlayerModal, setShowPlayerModal, showMerchantModal = false, showEncounterModal, setShowEncounterModal, conversationHistories, onConversationResult, onTriggerConversationEvent, selectedNpcActivity, selectedNpcNearbyInfected, selectedNpcNearbyDeceased, selectedNpcRumors, activeEvent, onResolveEvent, onTriggerDebugEvent, llmEventsEnabled, setLlmEventsEnabled, lastEventNote, showDemographicsOverlay, setShowDemographicsOverlay, onForceNpcState, onForceAllNpcState, isNPCInitiatedEncounter = false, isFollowingAfterDismissal = false, onResetFollowingState, nearbyNPCs = [], onOpenGuideModal, onSelectGuideEntry, infectedHouseholds, onNavigateToHousehold, onNavigateToDeceased, onDropItem, onDropItemAtScreen, onConsumeItem, getNarratorContext, onNarratorHighlight, getNpcListEntries, perfDebug, onTriggerEnterBuilding, homeBuildingType, homeDistrictName, isOnHomeTile, onGoHome, onUnequipHeadwear, onEquipHeadwear, isInPrivateSpace = false, currentBuildingType, currentBuildingProfession }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [reportTab, setReportTab] = useState<'epidemic' | 'player' | 'guide'>('epidemic');
  const [settingsTab, setSettingsTab] = useState<'about' | 'music' | 'dev'>('about');
  const [showPerspective, setShowPerspective] = useState(true);
  const [perfStats, setPerfStats] = useState({
    fps: 0,
    avgFps: 0,
    avgMs: 0,
    p95Ms: 0,
    longFrames: 0,
    heapMB: null as number | null,
    now: performance.now()
  });
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'rarity' | 'quantity'>('name');
  const [tabPulse, setTabPulse] = useState<'epidemic' | 'player' | 'guide' | null>(null);
  const [reportsPanelCollapsed, setReportsPanelCollapsed] = useState(false);
  const [alchemistTableCollapsed, setAlchemistTableCollapsed] = useState(true);
  const [spreadRate, setSpreadRate] = useState<number | null>(null);
  const prevStatsRef = useRef<{ infected: number; incubating: number; simTime: number } | null>(null);
  const [hasPlayerMoved, setHasPlayerMoved] = useState(false);
  const [showHealthMeter, setShowHealthMeter] = useState(false);
  const [dossierTab, setDossierTab] = useState<'overview' | 'health' | 'inventory' | 'family'>('overview');
  const [inventoryView, setInventoryView] = useState<'list' | 'grid'>('list');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryEntry | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [travelDestination, setTravelDestination] = useState<{ mapX: number; mapY: number; label: string } | null>(null);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [minimapMode, setMinimapMode] = useState<'local' | 'overworld'>('local');
  const [showMobilePerspectiveMenu, setShowMobilePerspectiveMenu] = useState(false);
  // Mobile-specific panel visibility (default to hidden on mobile)
  const [mobileReportsPanelVisible, setMobileReportsPanelVisible] = useState(false);
  const [mobileNarratorVisible, setMobileNarratorVisible] = useState(false);
  const {
    narratorMessage,
    narratorKey,
    narratorHistory,
    narratorOpen,
    setNarratorOpen,
    pushNarration
  } = useNarration(params.mapX, params.mapY, params.timeOfDay);
  const [narratorLoading, setNarratorLoading] = useState(false);
  const [narratorExchanges, setNarratorExchanges] = useState<Array<{ player: string; narrator: string }>>([]);
  const narratorPendingQuestionRef = useRef<string | null>(null);
  const [llmTransparencyOpen, setLlmTransparencyOpen] = useState(false);
  const [npcListModalOpen, setNpcListModalOpen] = useState(false);
  const [npcListEntries, setNpcListEntries] = useState<NpcListEntry[]>([]);
  const [llmTransparencyEntries, setLlmTransparencyEntries] = useState<Array<{ id: string; prompt: string; response: string }>>([]);
  const perspectiveTimeoutRef = useRef<number | null>(null);

  const summarizeNarratorOutput = useCallback((text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const sentences = normalized.match(/[^.!?]+[.!?]+/g) ?? [normalized];
    return sentences.slice(0, 4).join(' ').trim();
  }, []);

  const sanitizeNarratorMemory = useCallback((text: string, allowedTerms: string[]) => {
    const allowed = new Set(allowedTerms.map((term) => term.toLowerCase()));
    return text.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, (match) => {
      const normalized = match.toLowerCase();
      if (allowed.has(normalized)) return match;
      return 'someone';
    });
  }, []);

  useEffect(() => {
    setNarratorExchanges([]);
  }, [params.mapX, params.mapY, sceneMode]);

  const narratorHighlights = useMemo(() => {
    if (!getNarratorContext) {
      return { entries: [] };
    }
    const context = getNarratorContext();
    const entries: NarratorHighlightEntry[] = [];

    context.nearbyNpcs.forEach((npc) => {
      entries.push({
        term: npc.label,
        kind: npc.kind ?? 'npc',
        id: npc.id,
        position: npc.position
      });
    });

    context.nearbyObjects.forEach((obj) => {
      entries.push({
        term: obj.label,
        kind: obj.kind ?? 'object',
        id: obj.id,
        position: obj.position
      });
    });

    context.nearbyBuildings.forEach((building) => {
      entries.push({
        term: building.label,
        kind: building.kind ?? 'building',
        id: building.id,
        position: building.position
      });
    });

    const familyNames = playerStats.familyMembers?.map((member) => member.name) ?? [];
    familyNames.forEach((name) => {
      if (entries.some((entry) => entry.term === name)) return;
      entries.push({ term: name, kind: 'family' });
    });

    return {
      entries
    };
  }, [getNarratorContext, playerStats.familyMembers, params.mapX, params.mapY, sceneMode]);

  const handleNarratorSubmit = useCallback(async (question: string) => {
    if (!getNarratorContext || narratorLoading) return;
    setNarratorOpen(true);
    setNarratorLoading(true);
    try {
      pushNarration(`You: ${question}`);
      narratorPendingQuestionRef.current = question;
      const baseContext = getNarratorContext();
      const context = {
        ...baseContext,
        recentExchanges: narratorExchanges
      };
      const allowedTerms = [
        baseContext.locationLabel,
        baseContext.district,
        ...(baseContext.nearbyBuildings.map((entry) => entry.label)),
        ...(baseContext.nearbyNpcs.map((entry) => entry.label)),
        ...(baseContext.nearbyObjects.map((entry) => entry.label)),
        ...(baseContext.nearbyDistricts?.map((entry) => entry.locationLabel) ?? []),
      ].filter(Boolean);
      const prompt = buildNarratorPrompt(question, context);
      const response = await fetch('/api/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) {
        throw new Error(`Narrator request failed (${response.status})`);
      }
      const data = await response.json();
      if (typeof data.text === 'string' && data.text.trim()) {
        const trimmed = data.text.trim();
        pushNarration(trimmed);
        setLlmTransparencyEntries((prev) => {
          const next = [...prev, {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            prompt,
            response: trimmed
          }];
          return next.slice(-5);
        });
        setNarratorExchanges((prev) => {
          const sanitized = sanitizeNarratorMemory(summarizeNarratorOutput(trimmed), allowedTerms);
          const next = [...prev, {
            player: narratorPendingQuestionRef.current ?? question,
            narrator: sanitized
          }];
          return next.slice(-5);
        });
      } else {
        const fallback = 'No clear answer comes; the scene refuses to explain itself.';
        pushNarration(fallback);
        setLlmTransparencyEntries((prev) => {
          const next = [...prev, {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            prompt,
            response: fallback
          }];
          return next.slice(-5);
        });
        setNarratorExchanges((prev) => {
          const sanitized = sanitizeNarratorMemory(summarizeNarratorOutput(fallback), allowedTerms);
          const next = [...prev, {
            player: narratorPendingQuestionRef.current ?? question,
            narrator: sanitized
          }];
          return next.slice(-5);
        });
      }
    } catch (error) {
      console.error('Narrator request failed:', error);
      const fallback = 'No clear answer comes; the scene refuses to explain itself.';
      pushNarration(fallback);
      setLlmTransparencyEntries((prev) => {
        const next = [...prev, {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          prompt,
          response: fallback
        }];
        return next.slice(-5);
      });
      setNarratorExchanges((prev) => {
        const sanitized = sanitizeNarratorMemory(summarizeNarratorOutput(fallback), allowedTerms);
        const next = [...prev, {
          player: narratorPendingQuestionRef.current ?? question,
          narrator: sanitized
        }];
        return next.slice(-5);
      });
    } finally {
      narratorPendingQuestionRef.current = null;
      setNarratorLoading(false);
    }
  }, [getNarratorContext, narratorExchanges, narratorLoading, pushNarration, sanitizeNarratorMemory, setNarratorOpen, summarizeNarratorOutput]);

  // Biome ambience preview for settings
  const { currentPreview, playPreview, stopPreview } = useBiomeAmbiencePreview();

  // Sacred tune (Adhan) preview for settings
  const [currentAdhanPreview, setCurrentAdhanPreview] = useState<MelodyName | null>(null);
  const adhanSynthRef = useRef<AdhanSynth | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAdhanPreview = useCallback((melody: MelodyName) => {
    // Stop any currently playing adhan
    if (adhanSynthRef.current) {
      adhanSynthRef.current.stop();
    }

    // Initialize audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;

    // Resume context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create new synth and connect to output
    const synth = new AdhanSynth(ctx);
    synth.connect(ctx.destination);
    adhanSynthRef.current = synth;

    // Play the selected melody
    setCurrentAdhanPreview(melody);
    synth.play({
      melody,
      gain: 0.175,  // Quieter volume
      reverbWet: 0.6,
      onComplete: () => {
        setCurrentAdhanPreview(null);
      }
    });
  }, []);

  const stopAdhanPreview = useCallback(() => {
    if (adhanSynthRef.current) {
      adhanSynthRef.current.stop();
      adhanSynthRef.current = null;
    }
    setCurrentAdhanPreview(null);
  }, []);

  // Cleanup adhan synth on unmount
  useEffect(() => {
    return () => {
      if (adhanSynthRef.current) {
        adhanSynthRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Track player movement (for sickness meter visibility)
  useEffect(() => {
    if (hasPlayerMoved) return; // Already moved

    const handleKeyPress = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        setHasPlayerMoved(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasPlayerMoved]);

  useEffect(() => {
    if (playerStats.plague.state !== AgentState.HEALTHY) {
      setShowHealthMeter(true);
    }
  }, [playerStats.plague.state]);

  useEffect(() => {
    if (!tabPulse) return;
    const timer = window.setTimeout(() => setTabPulse(null), 260);
    return () => window.clearTimeout(timer);
  }, [tabPulse]);
  const inventoryEntries = useMemo<InventoryEntry[]>(() => {
    const rarityRank: Record<'common' | 'uncommon' | 'rare', number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
    };
    const entries = playerStats.inventory.map((item) => {
      const details = getItemDetailsByItemId(item.itemId);
      return {
        ...item,
        name: details?.name ?? item.itemId,
        description: details?.description ?? 'No description available.',
        rarity: details?.rarity ?? 'common',
        category: details?.category ?? 'Unknown',
        effects: details?.effects ?? []
      };
    });
    entries.sort((a, b) => {
      if (inventorySortBy === 'quantity') {
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      } else if (inventorySortBy === 'rarity') {
        if (rarityRank[b.rarity] !== rarityRank[a.rarity]) {
          return rarityRank[b.rarity] - rarityRank[a.rarity];
        }
      } else {
        const nameOrder = a.name.localeCompare(b.name);
        if (nameOrder !== 0) return nameOrder;
      }
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [playerStats.inventory, inventorySortBy]);

  const apparelRarity: InventoryEntry['rarity'] =
    playerStats.socialClass === SocialClass.NOBILITY ? 'rare'
      : playerStats.socialClass === SocialClass.MERCHANT ? 'uncommon'
      : 'common';

  const buildApparelEntry = (type: 'robe' | 'headwear'): InventoryEntry => {
    const isRobe = type === 'robe';
    const name = isRobe ? playerStats.robeDescription : playerStats.headwearDescription;
    const description = isRobe ? playerStats.robeDescription : playerStats.headwearDescription;
    return {
      id: `player-apparel-${type}`,
      itemId: `apparel-${type}`,
      quantity: 1,
      acquiredAt: 0,
      name,
      description,
      rarity: apparelRarity,
      category: 'Apparel',
      appearance: {
        type,
        baseColor: isRobe ? playerStats.robeBaseColor : playerStats.headwearColor,
        accentColor: isRobe ? playerStats.robeAccentColor : undefined,
        headwearStyle: isRobe ? undefined : playerStats.headwearStyle,
        robeHasSash: isRobe ? playerStats.robeHasSash : undefined,
        robeHasTrim: isRobe ? playerStats.robeHasTrim : undefined,
        robeHemBand: isRobe ? playerStats.robeHemBand : undefined,
        robeOverwrap: isRobe ? playerStats.robeOverwrap : undefined,
        robeSleeves: isRobe ? playerStats.robeSleeves : undefined,
        robePattern: isRobe ? playerStats.robePattern : undefined,
        robeSpread: isRobe ? playerStats.robeSpread : undefined
      }
    };
  };

  React.useEffect(() => {
    if (!devSettings.showPerfPanel) return;
    const bufferSize = 120;
    const samples = new Array<number>(bufferSize).fill(0);
    let sampleCount = 0;
    let sampleIndex = 0;
    let sampleSum = 0;
    let lastFrame = performance.now();
    let lastReport = lastFrame;
    let frames = 0;
    let rafId = 0;
    const loop = (now: number) => {
      frames += 1;
      const frameMs = now - lastFrame;
      lastFrame = now;
      if (frameMs > 0 && frameMs < 1000) {
        if (sampleCount < bufferSize) {
          sampleCount += 1;
        } else {
          sampleSum -= samples[sampleIndex];
        }
        samples[sampleIndex] = frameMs;
        sampleSum += frameMs;
        sampleIndex = (sampleIndex + 1) % bufferSize;
      }

      if (now - lastReport >= 500) {
        const fps = Math.round((frames * 1000) / (now - lastReport));
        const avgMs = sampleCount ? sampleSum / sampleCount : 0;
        const avgFps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
        const sorted = samples.slice(0, sampleCount).sort((a, b) => a - b);
        const p95Index = sorted.length ? Math.floor((sorted.length - 1) * 0.95) : 0;
        const p95Ms = sorted.length ? sorted[p95Index] : 0;
        let longFrames = 0;
        for (let i = 0; i < sampleCount; i++) {
          if (samples[i] > 33.3) longFrames += 1;
        }
        const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
        const heapMB = memory ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : null;
        setPerfStats({
          fps,
          avgFps,
          avgMs,
          p95Ms,
          longFrames,
          heapMB,
          now
        });
        frames = 0;
        lastReport = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [devSettings.showPerfPanel]);

  useEffect(() => {
    if (!selectedInventoryItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedInventoryItem(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedInventoryItem]);

  useEffect(() => {
    const prev = prevStatsRef.current;
    if (prev) {
      const deltaTime = simTime - prev.simTime;
      if (deltaTime > 0.1) {
        const currentTotal = stats.infected + stats.incubating;
        const prevTotal = prev.infected + prev.incubating;
        const perHour = (currentTotal - prevTotal) / deltaTime;
        setSpreadRate(Number.isFinite(perHour) ? perHour : null);
      }
    }
    prevStatsRef.current = { infected: stats.infected, incubating: stats.incubating, simTime };
  }, [stats.infected, stats.incubating, simTime]);

  const handleChange = (key: keyof SimulationParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleChange('uiMinimized', !params.uiMinimized);
    }
  };

  const cyclePerspective = () => {
    const order = [
      CameraMode.FIRST_PERSON,
      CameraMode.OVER_SHOULDER,
      CameraMode.THIRD_PERSON,
      CameraMode.ISOMETRIC,
      CameraMode.OVERHEAD
    ];
    const idx = order.indexOf(params.cameraMode);
    const next = order[(idx + 1) % order.length];
    handleChange('cameraMode', next);
    setShowPerspective(true);
  };

  const showPerspectiveMenu = useCallback((openMobileMenu: boolean) => {
    setShowPerspective(true);
    if (perspectiveTimeoutRef.current) {
      window.clearTimeout(perspectiveTimeoutRef.current);
    }
    perspectiveTimeoutRef.current = window.setTimeout(() => setShowPerspective(false), 10000);
    if (openMobileMenu && window.innerWidth < 768) {
      setShowMobilePerspectiveMenu(true);
    }
  }, []);

  const handleTravelRequest = (mapX: number, mapY: number, label: string) => {
    setTravelDestination({ mapX, mapY, label });
  };

  const handleTravelConfirm = () => {
    if (travelDestination) {
      onFastTravel(travelDestination.mapX, travelDestination.mapY);
      setTravelDestination(null);
      setMinimapMode('local'); // Switch back to local map after travel
    }
  };

  const handleTravelCancel = () => {
    setTravelDestination(null);
  };

  const getBuildingTypeLabel = (type: BuildingType) => {
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
  };

  const getNpcHealthMeta = (state: AgentState) => {
    switch (state) {
      case AgentState.HEALTHY: return { label: 'Sound', color: 'text-green-400', dot: 'bg-green-500' };
      case AgentState.INCUBATING: return { label: 'Incubating', color: 'text-yellow-300', dot: 'bg-yellow-500' };
      case AgentState.INFECTED: return { label: 'Afflicted', color: 'text-orange-400', dot: 'bg-orange-500' };
      case AgentState.DECEASED: return { label: 'Fallen', color: 'text-gray-500', dot: 'bg-gray-600' };
      default: return { label: 'Unknown', color: 'text-gray-400', dot: 'bg-gray-500' };
    }
  };

  const getHeldItemLabel = (item?: NPCStats['heldItem']) => {
    switch (item) {
      case 'staff': return 'Shepherd’s staff';
      case 'hammer': return 'Smithing hammer';
      case 'waterskin': return 'Waterskin';
      case 'ledger': return 'Ledger';
      case 'spear': return 'Spear';
      case 'tray': return 'Bread tray';
      case 'plank': return 'Wood plank';
      case 'sack': return 'Sack';
      default: return '—';
    }
  };

  const getRarityMeta = (rarity: 'common' | 'uncommon' | 'rare') => {
    switch (rarity) {
      case 'rare': return { label: 'Rare', color: 'text-amber-300' };
      case 'uncommon': return { label: 'Uncommon', color: 'text-emerald-300' };
      default: return { label: 'Common', color: 'text-amber-100/60' };
    }
  };

  const getNpcInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return 'NPC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const getReligionColor = (value: string) => {
    switch (value) {
      case 'Sunni Islam': return 'text-amber-200';
      case 'Shia Islam': return 'text-amber-300';
      case 'Eastern Orthodox': return 'text-sky-200';
      case 'Armenian Apostolic': return 'text-rose-200';
      case 'Syriac Orthodox': return 'text-cyan-200';
      case 'Jewish': return 'text-emerald-200';
      case 'Druze': return 'text-violet-200';
      default: return 'text-amber-100';
    }
  };

  const getEthnicityColor = (value: string) => {
    switch (value) {
      case 'Arab': return 'text-amber-100';
      case 'Aramaean/Syriac': return 'text-cyan-200';
      case 'Kurdish': return 'text-lime-200';
      case 'Turkic': return 'text-sky-200';
      case 'Circassian': return 'text-indigo-200';
      case 'Armenian': return 'text-rose-200';
      case 'Greek/Rum': return 'text-blue-200';
      case 'Persian': return 'text-purple-200';
      default: return 'text-amber-100';
    }
  };

  const getDateStr = () => {
    const startDate = new Date(1348, 5, 1);
    const currentDate = new Date(startDate.getTime() + stats.simTime * 60 * 60 * 1000);
    return currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getTimeStr = () => {
    const h = Math.floor(params.timeOfDay);
    const m = Math.floor((params.timeOfDay - h) * 60);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') {
        cyclePerspective();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [params.cameraMode]);

  // Command+P / Ctrl+P to toggle performance panel
  useEffect(() => {
    const handlePerfPanelToggle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setDevSettings(prev => ({ ...prev, showPerfPanel: !prev.showPerfPanel }));
      }
    };
    window.addEventListener('keydown', handlePerfPanelToggle);
    return () => window.removeEventListener('keydown', handlePerfPanelToggle);
  }, [setDevSettings]);

  useEffect(() => {
    showPerspectiveMenu(false);
    return () => {
      if (perspectiveTimeoutRef.current) {
        window.clearTimeout(perspectiveTimeoutRef.current);
      }
    };
  }, [params.cameraMode]);

  const formatHeight = (scale: number) => `${Math.round(scale * 170)} cm`;
  const formatWeight = (scale: number) => `${Math.round(scale * 70)} kg`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10 text-amber-50">
      {minimapVisible && minimapMode === 'local' && (
        <MiniMap
          data={minimapData}
          sceneMode={sceneMode}
          onClose={() => setMinimapVisible(false)}
          onToggle={() => setMinimapMode('overworld')}
          isNight={params.timeOfDay <= 6 || params.timeOfDay >= 18}
        />
      )}
      {minimapVisible && minimapMode === 'overworld' && (
        <OverworldMap
          centerX={mapX}
          centerY={mapY}
          path={overworldPath}
          sceneMode={sceneMode}
          onToggle={() => setMinimapMode('local')}
          onTravelRequest={handleTravelRequest}
          isNight={params.timeOfDay <= 6 || params.timeOfDay >= 18}
        />
      )}

      {/* Go Home button - positioned to left of minimap (responsive for mobile/desktop minimap sizes) */}
      {playerStats.homeBuildingId && playerStats.homeMapPosition && sceneMode === 'outdoor' && onGoHome && (
        <div className="absolute top-20 right-[180px] sm:right-[252px] z-20 pointer-events-auto group">
          <button
            onClick={onGoHome}
            className={`
              w-11 h-11 rounded-xl flex items-center justify-center
              transition-all duration-200 shadow-lg
              ${mapX === playerStats.homeMapPosition?.mapX && mapY === playerStats.homeMapPosition?.mapY
                ? 'bg-amber-900/70 border-2 border-amber-500/60 text-amber-300 hover:bg-amber-800/80 hover:scale-105'
                : 'bg-black/70 border-2 border-amber-700/50 text-amber-400 hover:bg-amber-900/40 hover:border-amber-500/70 hover:scale-105'
              }
            `}
          >
            <Home size={20} />
          </button>
          {/* Styled tooltip */}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2 mt-2
            px-3 py-2 min-w-[140px]
            bg-black/95 backdrop-blur-md rounded-lg
            border border-amber-800/50 shadow-xl
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity duration-150
            z-50 text-center
          ">
            <div className="text-amber-400 font-semibold text-xs mb-0.5">
              {mapX === playerStats.homeMapPosition?.mapX && mapY === playerStats.homeMapPosition?.mapY
                ? '🏠 View Home'
                : '🏠 Return Home'
              }
            </div>
            <p className="text-amber-100/70 text-[10px] leading-relaxed">
              {mapX === playerStats.homeMapPosition?.mapX && mapY === playerStats.homeMapPosition?.mapY
                ? 'Center camera on your residence'
                : 'Travel to your residence'
              }
            </p>
          </div>
        </div>
      )}

      <TopStatusBar
        dateStr={getDateStr()}
        timeStr={getTimeStr()}
        isDaytime={params.timeOfDay > 6 && params.timeOfDay < 18}
        simulationSpeed={params.simulationSpeed}
        onSetSimulationSpeed={(speed) => handleChange('simulationSpeed', speed)}
        onOpenWeather={() => setShowWeather(true)}
        onToggleMinimize={toggleMinimize}
        showMovementHint={!hasPlayerMoved && !showHealthMeter && playerStats.plague.state === AgentState.HEALTHY}
        onShowHealthMeter={() => setShowHealthMeter(true)}
        plague={playerStats.plague}
        hasPlayerMoved={hasPlayerMoved}
        showHealthMeter={showHealthMeter}
        onOpenPlayerModal={() => {
          setDossierTab('health');
          setShowPlayerModal(true);
        }}
        onToggleMobilePerspectiveMenu={() => setShowMobilePerspectiveMenu(prev => !prev)}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onOpenAbout={() => setShowAbout(true)}
      />

      <MobilePerspectiveMenu
        visible={showMobilePerspectiveMenu}
        cameraMode={params.cameraMode}
        onChange={(mode) => handleChange('cameraMode', mode)}
        onClose={() => setShowMobilePerspectiveMenu(false)}
      />

      {/* CENTER LOCATION PILLS */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-xs md:max-w-md pointer-events-none px-2">
        {/* Mobile toggle buttons row - 44px touch targets */}
        <div className="md:hidden flex items-center justify-center gap-2 pointer-events-auto w-full max-w-[340px]">
          {/* Left button - Reports Panel */}
          <button
            onClick={() => setMobileReportsPanelVisible(!mobileReportsPanelVisible)}
            className={`w-11 h-11 rounded-full border shadow-lg transition-all active:scale-95 flex-shrink-0 flex items-center justify-center ${
              mobileReportsPanelVisible
                ? 'bg-amber-600/90 border-amber-500 text-white'
                : 'bg-black/40 border-amber-600/30 text-amber-500'
            }`}
            title="Toggle Reports"
          >
            <FileText size={18} />
          </button>

          {/* Center - Map button - truncates location name */}
          <button
            onClick={() => {
              setShowMap(true);
              setMobileReportsPanelVisible(false);
            }}
            className="bg-black/40 backdrop-blur-md px-3 h-11 rounded-full border border-amber-600/30 text-amber-500 shadow-lg flex items-center gap-1.5 transition-all active:scale-95 min-w-0 flex-1 max-w-[180px]"
          >
            <div className="bg-amber-500/10 p-1.5 rounded-full flex-shrink-0">
              <MapIcon size={14} />
            </div>
            <span className="historical-font text-[10px] tracking-wider font-bold truncate">
              {getLocationLabel(params.mapX, params.mapY)}
            </span>
          </button>

          {/* Right button - Narrator Panel */}
          <button
            onClick={() => setMobileNarratorVisible(!mobileNarratorVisible)}
            className={`w-11 h-11 rounded-full border shadow-lg transition-all active:scale-95 flex-shrink-0 flex items-center justify-center ${
              mobileNarratorVisible
                ? 'bg-amber-600/90 border-amber-500 text-white'
                : 'bg-black/40 border-amber-600/30 text-amber-500'
            }`}
            title="Toggle Narrator"
          >
            <MessageSquare size={18} />
          </button>
        </div>

        {/* Desktop - Original map button */}
        <button
          onClick={() => {
            setShowMap(true);
            setMobileReportsPanelVisible(false);
          }}
          className="hidden md:flex bg-black/30 hover:bg-black/55 backdrop-blur-md px-4 py-2 rounded-full border border-amber-400/20 text-amber-400 shadow-lg items-center gap-2 pointer-events-auto transition-all group active:scale-95"
        >
          <div className="bg-amber-500/10 p-1 rounded-full group-hover:bg-amber-500/20 transition-colors">
            <MapIcon size={14} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="historical-font text-[10px] md:text-xs whitespace-nowrap tracking-wider font-bold">
              {getLocationLabel(params.mapX, params.mapY)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-amber-400/40 font-light mt-1">Open Overworld Map</span>
          </div>
        </button>

        {nearBuilding && (() => {
          const infectionState = buildingInfection?.[nearBuilding.id];
          const isInfected = infectionState?.status === 'infected' || infectionState?.status === 'deceased';
          const isDeceased = infectionState?.status === 'deceased';
          const isPlayerHome = nearBuilding.id === playerStats.homeBuildingId;
          // Allow entry to open buildings OR infected/deceased plague houses OR player's home
          const canEnter = (nearBuilding.isOpen || isInfected || isPlayerHome) && onTriggerEnterBuilding;

          return (
            <div
              onClick={canEnter ? onTriggerEnterBuilding : undefined}
              className={`backdrop-blur-lg p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-2xl w-full transition-all duration-300 animate-in fade-in slide-in-from-top-4 pointer-events-auto ${
                isInfected
                  ? 'bg-red-950/80 border-2 border-red-500/60'
                  : 'bg-black/60 border border-amber-600/30'
              } ${canEnter ? 'cursor-pointer hover:bg-black/70 hover:border-amber-500/50' : ''}`}
            >
              {/* Plague warning banner */}
              {isInfected && (
                <div className={`flex items-center justify-center gap-2 mb-1.5 sm:mb-2 py-1 sm:py-1.5 rounded-lg ${
                  isDeceased ? 'bg-red-900/60' : 'bg-red-800/50'
                } animate-pulse`}>
                  <span className="text-red-200 font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                    {isDeceased ? '☠ DEATH HOUSE ☠' : '⚠ PLAGUE HOUSE ⚠'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                {/* Left side: Building info */}
                <div className="flex flex-col min-w-0">
                  <h3 className={`font-bold text-[9px] sm:text-[10px] historical-font tracking-tight uppercase ${
                    isInfected ? 'text-red-300' : 'text-amber-400'
                  }`}>
                    {getBuildingTypeLabel(nearBuilding.type)}
                  </h3>
                  <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${isInfected ? 'text-red-100' : 'text-amber-100'}`}>
                    <User size={10} className={`hidden sm:block ${isInfected ? 'text-red-400/70' : 'text-amber-500/70'}`} />
                    <span className="text-[11px] sm:text-xs font-semibold truncate">{nearBuilding.ownerName}</span>
                    <span className={`text-[9px] sm:text-[10px] ${isInfected ? 'text-red-100/50' : 'text-amber-100/50'}`}>Age {nearBuilding.ownerAge}</span>
                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded border font-bold ${
                      isInfected
                        ? 'text-red-300/80 bg-red-950/50 border-red-700/30'
                        : 'text-amber-400/80 bg-amber-950/50 border-amber-900/30'
                    }`}>
                      {nearBuilding.ownerProfession}
                    </span>
                  </div>
                </div>

                {/* Right side: Enter prompt */}
                {canEnter && (
                  <div className="flex flex-col items-end gap-1">
                    {/* Warning for entering closed plague house */}
                    {!nearBuilding.isOpen && isInfected && (
                      <span className="text-[8px] sm:text-[9px] text-red-300/90 italic">
                        {isDeceased ? 'Door unsealed by death' : 'Quarantine broken'}
                      </span>
                    )}
                    <div
                      className={`flex-shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border ${
                        isInfected
                          ? 'border-red-500/50 bg-red-900/40'
                          : 'border-amber-500/40 bg-amber-900/30'
                      }`}
                      style={{
                        boxShadow: isInfected
                          ? '0 0 12px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.1)'
                          : '0 0 12px rgba(251, 191, 36, 0.3), inset 0 0 8px rgba(251, 191, 36, 0.1)'
                      }}
                    >
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          isInfected ? 'text-red-200' : 'text-amber-200'
                        }`}
                        style={{
                          textShadow: isInfected
                            ? '0 0 8px rgba(239, 68, 68, 0.8), 0 0 16px rgba(239, 68, 68, 0.5)'
                            : '0 0 8px rgba(251, 191, 36, 0.8), 0 0 16px rgba(251, 191, 36, 0.5)'
                        }}
                      >
                        <span className="hidden sm:inline">Press </span>RETURN<span className="hidden sm:inline"> to enter</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* OVERWORLD MAP MODAL */}
      {showMap && (
        <MapModal
          currentX={params.mapX}
          currentY={params.mapY}
          onClose={() => setShowMap(false)}
          onSelectLocation={(x, y) => {
            onFastTravel(x, y);
            setShowMap(false);
          }}
        />
      )}

      {/* WEATHER MODAL */}
      {showWeather && (
        <WeatherModal
          timeOfDay={params.timeOfDay}
          currentWeather={currentWeather}
          onClose={() => setShowWeather(false)}
        />
      )}

      {/* FLOATING WINDOWS */}
      <div className={`flex flex-col flex-1 justify-between p-4 md:p-6 transition-all duration-500 ${params.uiMinimized ? 'opacity-0 scale-95 pointer-events-none translate-y-4' : 'opacity-100 scale-100'}`}>
        {/* Reports Panel - Hidden by default on mobile, slides in from left with swipe-to-dismiss */}
        {/* Also hidden when merchant modal is open */}
        <div
          className={`
            fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-auto
            w-[70vw] max-w-[320px] md:w-auto md:max-w-none
            transition-all duration-300 ease-out
            ${showMerchantModal ? 'opacity-0 pointer-events-none md:-translate-x-full' : 'md:transform-none md:opacity-100'}
            ${mobileReportsPanelVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (e.currentTarget as any)._touchStartX = touch.clientX;
            (e.currentTarget as any)._touchStartY = touch.clientY;
          }}
          onTouchEnd={(e) => {
            const startX = (e.currentTarget as any)._touchStartX;
            const startY = (e.currentTarget as any)._touchStartY;
            if (startX === undefined) return;
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            // Swipe left to close (negative deltaX, mostly horizontal)
            if (deltaX < -50 && deltaY < 80) {
              setMobileReportsPanelVisible(false);
            }
          }}
        >
          {/* Mobile backdrop - proper z-index for click handling */}
          {mobileReportsPanelVisible && (
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMobileReportsPanelVisible(false);
              }}
            />
          )}
          {/* Mobile swipe hint + close button */}
          <div className="md:hidden absolute top-4 right-3 z-[60] flex items-center gap-2">
            <span className="text-[9px] text-amber-400/60 uppercase tracking-wider">← swipe</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileReportsPanelVisible(false);
              }}
              className="p-2 rounded-full bg-amber-600 border border-amber-500 text-white shadow-lg active:scale-95 transition-transform"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-full md:h-auto overflow-y-auto md:overflow-visible bg-black/95 md:bg-transparent pt-14 pb-8 md:pt-0 md:pb-0 max-h-screen">
            <ReportsPanelMockupC
              stats={{
                healthy: stats.healthy,
                incubating: stats.incubating,
                infected: stats.infected,
                deceased: stats.deceased,
              }}
              moraleStats={{
                avgPanic: moraleStats.avgPanic,
                avgAwareness: moraleStats.avgAwareness,
              }}
              infectedHouseholds={infectedHouseholds}
              playerStats={playerStats}
              daysSinceOutbreak={(simTime / 24) + 1}
              onNavigateToHousehold={onNavigateToHousehold}
              onNavigateToDeceased={onNavigateToDeceased}
              onShowPlayerModal={() => {
                setShowPlayerModal(true);
                setMobileReportsPanelVisible(false);
              }}
              onOpenFamilyDossier={() => {
                setDossierTab('family');
                setShowPlayerModal(true);
                setMobileReportsPanelVisible(false);
              }}
              onOpenInventoryDossier={() => {
                setDossierTab('inventory');
                setInventoryView('grid');
                setShowPlayerModal(true);
                setMobileReportsPanelVisible(false);
              }}
              onSelectFamilyMember={setSelectedFamilyMember}
              params={{
                infectionRate: params.infectionRate,
                hygieneLevel: params.hygieneLevel,
                quarantine: params.quarantine,
              }}
              onChangeParam={handleChange}
              showDemographicsOverlay={showDemographicsOverlay}
              setShowDemographicsOverlay={setShowDemographicsOverlay}
              inventoryEntries={inventoryEntries}
              onSelectInventoryItem={setSelectedInventoryItem}
              currentBiomeLabel={getLocationLabel(params.mapX, params.mapY)}
              nearbyNPCs={nearbyNPCs}
              onOpenGuideModal={onOpenGuideModal}
              onSelectGuideEntry={onSelectGuideEntry}
              playerInfected={playerStats.plague.state !== AgentState.HEALTHY}
              onPopulationChartClick={() => {
                if (getNpcListEntries) {
                  setNpcListEntries(getNpcListEntries());
                }
                setNpcListModalOpen(true);
              }}
            />
            {/* ORIGINAL ReportsPanel - kept for reference
            <ReportsPanel
              reportTab={reportTab}
              setReportTab={setReportTab}
              tabPulse={tabPulse}
              setTabPulse={setTabPulse}
              reportsPanelCollapsed={reportsPanelCollapsed}
              setReportsPanelCollapsed={setReportsPanelCollapsed}
              stats={stats}
              infectedHouseholds={infectedHouseholds}
              onNavigateToHousehold={onNavigateToHousehold}
              onNavigateToDeceased={onNavigateToDeceased}
              moraleStats={moraleStats}
              alchemistTableCollapsed={alchemistTableCollapsed}
              setAlchemistTableCollapsed={setAlchemistTableCollapsed}
              params={params}
              onChangeParam={handleChange}
              showDemographicsOverlay={showDemographicsOverlay}
              setShowDemographicsOverlay={setShowDemographicsOverlay}
              playerStats={playerStats}
              onShowPlayerModal={() => {
                setShowPlayerModal(true);
                setMobileReportsPanelVisible(false);
              }}
              inventoryEntries={inventoryEntries}
              onDropItem={onDropItem}
              inventorySortBy={inventorySortBy}
              setInventorySortBy={setInventorySortBy}
              getRarityMeta={getRarityMeta}
              formatHeight={formatHeight}
              formatWeight={formatWeight}
              currentBiomeLabel={getLocationLabel(params.mapX, params.mapY)}
              nearbyNPCs={nearbyNPCs}
              onOpenGuideModal={onOpenGuideModal}
              onSelectGuideEntry={onSelectGuideEntry}
              playerInfected={playerStats.plague.state !== AgentState.HEALTHY}
              onOpenFamilyDossier={() => {
                setDossierTab('family');
                setShowPlayerModal(true);
                setMobileReportsPanelVisible(false);
              }}
            />
            */}
          </div>
        </div>

        {selectedNpc && (
          <div className="self-end md:self-start mt-4 w-full md:w-[420px]">
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg border border-amber-800/50 shadow-lg pointer-events-auto">
              <div className="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
                <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">NPC Profile</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase tracking-widest font-bold ${getNpcHealthMeta(selectedNpc.state).color}`}>
                    {getNpcHealthMeta(selectedNpc.state).label}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${getNpcHealthMeta(selectedNpc.state).dot}`}></div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <NpcPortrait npc={selectedNpc.stats} />
                <div className="flex-1">
                  <div className="text-amber-100 font-semibold">{selectedNpc.stats.name}</div>
                  <div className="text-[10px] text-amber-500/70 uppercase tracking-widest mt-1">
                    {selectedNpc.stats.profession}
                  </div>
                  <div className="text-[10px] text-amber-100/70 mt-1 flex flex-wrap items-center gap-1">
                    <span>{selectedNpc.stats.gender}, {selectedNpc.stats.age} years</span>
                    <span className="text-amber-500/40">•</span>
                    <span className="text-amber-100/90">{selectedNpc.stats.profession}</span>
                    <span className="text-amber-500/40">•</span>
                    <span className={`${getReligionColor(selectedNpc.stats.religion)}`}>{selectedNpc.stats.religion}</span>
                    <span className="text-amber-500/40">•</span>
                    <span className={`${getEthnicityColor(selectedNpc.stats.ethnicity)}`}>{selectedNpc.stats.ethnicity}</span>
                  </div>
                </div>
                {selectedNpc.stats.goalOfDay && (
                  <div className="text-[10px] text-amber-100/70 max-w-[140px]">
                    <div className="uppercase tracking-widest text-amber-500/60 text-[9px] mb-1">Goal</div>
                    <div className="text-amber-100/80 leading-tight">{selectedNpc.stats.goalOfDay}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-4 text-[10px] text-amber-100/80">
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Mood</div>
                  <div className="font-semibold truncate">{selectedNpc.stats.mood}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Carrying</div>
                  <div className="font-semibold truncate">{getHeldItemLabel(selectedNpc.stats.heldItem)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Headwear</div>
                  <div className="font-semibold truncate">{selectedNpc.stats.headwearStyle ?? 'none'}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Footwear</div>
                  <div className="font-semibold truncate">{selectedNpc.stats.footwearStyle ?? '—'}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Sleeves</div>
                  <div className="font-semibold truncate">{selectedNpc.stats.sleeveCoverage ?? '—'}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60 text-[9px]">Accessories</div>
                  <div className="font-semibold truncate">{selectedNpc.stats.accessories?.length ? selectedNpc.stats.accessories.join(', ') : '—'}</div>
                </div>
              </div>

              {/* Morale Stats */}
              <div className="border-t border-amber-900/40 pt-3 mt-3 space-y-2">
                <div className="text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="uppercase tracking-widest text-amber-500/60">Awareness</span>
                    <span className="font-mono text-amber-100/60">{Math.round(selectedNpc.stats.awarenessLevel)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, selectedNpc.stats.awarenessLevel)}%` }} />
                  </div>
                </div>
                <div className="text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="uppercase tracking-widest text-amber-500/60">Panic</span>
                    <span className="font-mono text-amber-100/60">{Math.round(selectedNpc.stats.panicLevel)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      selectedNpc.stats.panicLevel < 36 ? 'bg-emerald-500' :
                      selectedNpc.stats.panicLevel < 56 ? 'bg-yellow-500' :
                      selectedNpc.stats.panicLevel < 76 ? 'bg-orange-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.min(100, selectedNpc.stats.panicLevel)}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-amber-100/70">
                <span className="uppercase tracking-widest text-amber-500/60">Encounter</span>
                <button
                  onClick={() => setShowEncounterModal(true)}
                  className="px-3 py-1 rounded-full border border-amber-700/60 bg-amber-600/10 text-amber-200 hover:bg-amber-600/20"
                >
                  Click to speak to {selectedNpc.stats.name}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Unified contextual prompt - with safe area */}
        <div className="md:hidden absolute bottom-safe left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Pickup Prompt */}
          {pickupPrompt && !isClimbing && (
            <button
              onClick={onTriggerPickup}
              className="bg-amber-600/90 backdrop-blur-md px-5 py-3 rounded-xl border border-amber-500/70 text-white text-xs font-medium shadow-lg active:scale-95 transition-all touch-manipulation select-none"
            >
              {pickupPrompt}
            </button>
          )}
          {/* Climb Prompt */}
          {climbablePrompt && !pickupPrompt && !isClimbing && (
            <button
              onClick={onTriggerClimb}
              className="bg-sky-600/90 backdrop-blur-md px-5 py-3 rounded-xl border border-sky-500/70 text-white text-xs font-medium shadow-lg active:scale-95 transition-all touch-manipulation select-none"
            >
              {climbablePrompt}
            </button>
          )}
          {/* Climbing Controls - simplified for mobile */}
          {isClimbing && (
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full p-2 border border-sky-500/50">
              <button
                className="w-10 h-10 rounded-full bg-sky-600/80 text-white flex items-center justify-center active:scale-95 transition-all touch-manipulation"
                onPointerDown={(e) => { e.preventDefault(); onClimbInput?.('up'); }}
                onPointerUp={() => onClimbInput?.(null as any)}
                onPointerLeave={() => onClimbInput?.(null as any)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                className="w-10 h-10 rounded-full bg-sky-600/80 text-white flex items-center justify-center active:scale-95 transition-all touch-manipulation"
                onPointerDown={(e) => { e.preventDefault(); onClimbInput?.('down'); }}
                onPointerUp={() => onClimbInput?.(null as any)}
                onPointerLeave={() => onClimbInput?.(null as any)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                className="px-3 py-2 rounded-full bg-red-600/80 text-white text-[10px] uppercase font-medium active:scale-95 transition-all touch-manipulation"
                onClick={() => onClimbInput?.('cancel')}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Desktop: Original prompts */}
        <div className="hidden md:block">
          {/* Pickup Prompt */}
          {pickupPrompt && (
            <button
              onClick={onTriggerPickup}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.25)] pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none"
            >
              <span className="flex items-center gap-2">
                <span className="opacity-60">[SHIFT]</span>
                {pickupPrompt}
              </span>
            </button>
          )}
          {/* Climb Prompt */}
          {climbablePrompt && !pickupPrompt && !isClimbing && (
            <button
              onClick={onTriggerClimb}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-sky-700/50 text-sky-200 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.25)] pointer-events-auto cursor-pointer hover:bg-sky-900/40 hover:border-sky-500/70 active:bg-sky-800/50 active:scale-95 transition-all touch-manipulation select-none"
            >
              <span className="flex items-center gap-2">
                <span className="opacity-60">[C]</span>
                {climbablePrompt}
              </span>
            </button>
          )}

          {/* Climbing Controls - desktop */}
          {isClimbing && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
              <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-500/50 text-sky-300 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                Climbing <span className="text-sky-400/60 ml-1">(↑/↓ keys)</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  className="w-12 h-12 bg-black/70 backdrop-blur-md rounded-lg border border-sky-500/50 text-sky-300 flex items-center justify-center active:bg-sky-900/50 active:scale-95 transition-all touch-manipulation shadow-lg select-none"
                  onPointerDown={(e) => { e.preventDefault(); onClimbInput?.('up'); }}
                  onPointerUp={() => onClimbInput?.(null as any)}
                  onPointerLeave={() => onClimbInput?.(null as any)}
                  onPointerCancel={() => onClimbInput?.(null as any)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  className="w-12 h-12 bg-black/70 backdrop-blur-md rounded-lg border border-sky-500/50 text-sky-300 flex items-center justify-center active:bg-sky-900/50 active:scale-95 transition-all touch-manipulation shadow-lg select-none"
                  onPointerDown={(e) => { e.preventDefault(); onClimbInput?.('down'); }}
                  onPointerUp={() => onClimbInput?.(null as any)}
                  onPointerLeave={() => onClimbInput?.(null as any)}
                  onPointerCancel={() => onClimbInput?.(null as any)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  className="mt-1 px-4 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-red-500/50 text-red-300 text-[9px] uppercase tracking-wider active:bg-red-900/50 active:scale-95 transition-all touch-manipulation shadow-lg"
                  onClick={() => onClimbInput?.('cancel')}
                >
                  Cancel (C)
                </button>
              </div>
            </div>
          )}
        </div>
        {pickupToast && (
          <div
            className={`absolute bottom-36 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full border text-[10px] uppercase tracking-widest pointer-events-none shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-md ${
              pickupToast.toLowerCase().startsWith('dropped')
                ? 'bg-gradient-to-r from-amber-900/90 via-black/80 to-amber-900/90 border-amber-400/70 text-amber-100 shadow-[0_0_40px_rgba(245,158,11,0.55)]'
                : 'bg-gradient-to-r from-amber-950/90 via-black/80 to-amber-950/90 border-amber-500/50 text-amber-100'
            }`}
          >
            {pickupToast.toLowerCase().startsWith('dropped') ? '⬇ ' : ''}
            {pickupToast}
          </div>
        )}

        {/* Push Charge Meter - shows when holding shift near a pushable object */}
        {pushCharge > 0 && (
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            <div className="text-[9px] uppercase tracking-widest text-amber-400/80">
              {pushCharge >= 1 ? 'Release to Shove!' : 'Hold Shift to Push...'}
            </div>
            <div className="w-32 h-2 bg-black/60 rounded-full border border-amber-700/50 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${pushCharge >= 1 ? 'bg-amber-400 animate-pulse' : 'bg-amber-600'}`}
                style={{ width: `${Math.min(100, pushCharge * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="hidden md:block absolute bottom-6 left-6">
          <Compass minimapData={minimapData} onClick={() => showPerspectiveMenu(true)} />
        </div>

        {/* Mobile Movement Hint - shows only on mobile before first movement */}
        {!hasPlayerMoved && sceneMode === 'outdoor' && (
          <div className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none animate-pulse">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-700/30 text-amber-200/70 text-xs tracking-wider flex flex-col items-center gap-0.5">
              <span>Tap anywhere to move</span>
              {params.cameraMode === CameraMode.FIRST_PERSON && (
                <span className="text-[10px] text-amber-200/50">Swipe to look around</span>
              )}
            </div>
          </div>
        )}

        {/* Mobile Camera Controls - compact buttons for camera rotation (first-person mode only) */}
        {sceneMode === 'outdoor' && params.cameraMode === CameraMode.FIRST_PERSON && (
          <div className="md:hidden absolute bottom-6 right-6 pointer-events-auto">
            <div className="flex flex-col items-center gap-1 opacity-60">
              <button
                className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 text-white/70 flex items-center justify-center active:bg-white/20 active:scale-95 transition-all touch-manipulation"
                onPointerDown={() => {
                  window.dispatchEvent(new CustomEvent('mobileCameraRotate', { detail: { direction: 'up' } }));
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div className="flex gap-1">
                <button
                  className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 text-white/70 flex items-center justify-center active:bg-white/20 active:scale-95 transition-all touch-manipulation"
                  onPointerDown={() => {
                    // Rotate camera left - we'll use a custom event
                    window.dispatchEvent(new CustomEvent('mobileCameraRotate', { detail: { direction: 'left' } }));
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 text-white/70 flex items-center justify-center active:bg-white/20 active:scale-95 transition-all touch-manipulation"
                  onPointerDown={() => {
                    // Rotate camera right
                    window.dispatchEvent(new CustomEvent('mobileCameraRotate', { detail: { direction: 'right' } }));
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 text-white/70 flex items-center justify-center active:bg-white/20 active:scale-95 transition-all touch-manipulation"
                onPointerDown={() => {
                  // Simulate downward camera look
                  window.dispatchEvent(new CustomEvent('mobileCameraRotate', { detail: { direction: 'down' } }));
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">
          <PerspectiveMenu
            visible={showPerspective}
            cameraMode={params.cameraMode}
            onChange={(mode) => handleChange('cameraMode', mode)}
          />
        </div>
      </div>

      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.5em] text-amber-100/20 pointer-events-none transition-opacity duration-700 ${params.uiMinimized ? 'opacity-100' : 'opacity-0'}`}>
        Click Top Bar to Restore Interface
      </div>

      {devSettings.showPerfPanel && (
        <div className="absolute bottom-6 right-6 z-50 bg-black/70 backdrop-blur-md border border-amber-900/40 rounded-lg p-4 text-amber-100 pointer-events-auto w-56">
          <div className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">Performance</div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-amber-200/70">FPS</span>
            <span className="font-mono text-lg">{perfStats.fps}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest mb-3">
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">Avg FPS</span>
              <span className="font-mono">{perfStats.avgFps}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">Avg ms</span>
              <span className="font-mono">{perfStats.avgMs.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">P95 ms</span>
              <span className="font-mono">{perfStats.p95Ms.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">Long</span>
              <span className="font-mono">{perfStats.longFrames}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">Sched</span>
              <span className="font-mono">
                {perfDebug?.scheduleActive
                  ? `P${perfDebug.schedulePhase}`
                  : 'idle'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-200/60">Sched Age</span>
              <span className="font-mono">
                {perfDebug?.lastScheduleMs
                  ? `${Math.max(0, (perfStats.now - perfDebug.lastScheduleMs) / 1000).toFixed(2)}s`
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between col-span-2">
              <span className="text-amber-200/60">Heap MB</span>
              <span className="font-mono">{perfStats.heapMB ?? '—'}</span>
            </div>
          </div>
          <div className="space-y-2 text-[10px] uppercase tracking-widest">
            <label className="flex items-center justify-between">
              <span>Hover Wireframe</span>
              <input type="checkbox" checked={devSettings.showHoverWireframe} onChange={(e) => setDevSettings(prev => ({ ...prev, showHoverWireframe: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Shadows</span>
              <input type="checkbox" checked={devSettings.showShadows} onChange={(e) => setDevSettings(prev => ({ ...prev, showShadows: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Clouds</span>
              <input type="checkbox" checked={devSettings.showClouds} onChange={(e) => setDevSettings(prev => ({ ...prev, showClouds: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Fog</span>
              <input type="checkbox" checked={devSettings.showFog} onChange={(e) => setDevSettings(prev => ({ ...prev, showFog: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Torches</span>
              <input type="checkbox" checked={devSettings.showTorches} onChange={(e) => setDevSettings(prev => ({ ...prev, showTorches: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>NPCs</span>
              <input type="checkbox" checked={devSettings.showNPCs} onChange={(e) => setDevSettings(prev => ({ ...prev, showNPCs: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Rats</span>
              <input type="checkbox" checked={devSettings.showRats} onChange={(e) => setDevSettings(prev => ({ ...prev, showRats: e.target.checked }))} className="accent-amber-600" />
            </label>
            <label className="flex items-center justify-between">
              <span>Miasma</span>
              <input type="checkbox" checked={devSettings.showMiasma} onChange={(e) => setDevSettings(prev => ({ ...prev, showMiasma: e.target.checked }))} className="accent-amber-600" />
            </label>
          </div>
        </div>
      )}

      {devSettings.showSoundDebug && (
        <SoundDebugPanel
          onClose={() => setDevSettings(prev => ({ ...prev, showSoundDebug: false }))}
        />
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        llmEventsEnabled={llmEventsEnabled}
        setLlmEventsEnabled={setLlmEventsEnabled}
        currentPreview={currentPreview}
        playPreview={playPreview}
        stopPreview={stopPreview}
        currentAdhanPreview={currentAdhanPreview}
        playAdhanPreview={playAdhanPreview}
        stopAdhanPreview={stopAdhanPreview}
        devSettings={devSettings}
        setDevSettings={setDevSettings}
        onTriggerDebugEvent={onTriggerDebugEvent}
        lastEventNote={lastEventNote}
        spreadRate={spreadRate}
        mapX={params.mapX}
        mapY={params.mapY}
        stats={stats}
        selectedNpc={selectedNpc}
        onForceNpcState={onForceNpcState}
        onForceAllNpcState={onForceAllNpcState}
      />

      <PlayerDossierModal
        open={showPlayerModal}
        playerStats={playerStats}
        dossierTab={dossierTab}
        onChangeTab={setDossierTab}
        inventoryView={inventoryView}
        onChangeInventoryView={setInventoryView}
        inventoryEntries={inventoryEntries}
        onSelectInventoryItem={setSelectedInventoryItem}
        onDropItem={onDropItem}
        onConsumeItem={onConsumeItem}
        buildApparelEntry={buildApparelEntry}
        onClose={() => setShowPlayerModal(false)}
        getHealthStatusLabel={getHealthStatusLabel}
        getPlagueTypeLabel={getPlagueTypeLabel}
        homeBuildingType={homeBuildingType}
        homeDistrictName={homeDistrictName}
        isOnHomeTile={isOnHomeTile}
        onGoHome={onGoHome}
        onUnequipHeadwear={onUnequipHeadwear}
        onEquipHeadwear={onEquipHeadwear}
      />

      {selectedInventoryItem && (
        <div
          className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-6 pointer-events-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInventoryItem(null);
            }
          }}
        >
          <div className="w-full max-w-4xl rounded-2xl border border-amber-900/40 bg-slate-950/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/30">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-amber-400/70">Inventory Item</div>
                <div className="text-xl text-amber-100 font-semibold mt-1">{selectedInventoryItem.name}</div>
              </div>
              <button
                onClick={() => setSelectedInventoryItem(null)}
                className="text-amber-400 hover:text-amber-300"
              >
                <X size={22} />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 p-6">
              <div className="h-[380px]">
                <ItemPreview3D
                  itemId={selectedInventoryItem.itemId}
                  name={selectedInventoryItem.name}
                  category={selectedInventoryItem.category}
                  rarity={selectedInventoryItem.rarity}
                  appearance={selectedInventoryItem.appearance}
                />
                <div className="mt-3 text-[10px] uppercase tracking-widest text-amber-400/60">
                  Drag to rotate · Scroll to zoom
                </div>
              </div>
              <div className="space-y-4 text-amber-50/80 text-[12px]">
                {onDropItem && (
                  <button
                    onClick={() => onDropItem({ inventoryId: selectedInventoryItem.id, itemId: selectedInventoryItem.itemId, label: selectedInventoryItem.name, appearance: selectedInventoryItem.appearance })}
                    className="w-full rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-200 hover:bg-amber-500/20"
                  >
                    Drop Item
                  </button>
                )}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Details</div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Category</span><span>{selectedInventoryItem.category}</span></div>
                    <div className="flex justify-between"><span>Rarity</span><span className="uppercase">{selectedInventoryItem.rarity}</span></div>
                    <div className="flex justify-between"><span>Quantity</span><span>{selectedInventoryItem.quantity}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Description</div>
                  <div className="text-amber-200/80 text-sm leading-relaxed">
                    {selectedInventoryItem.description}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Effects</div>
                  {selectedInventoryItem.effects && selectedInventoryItem.effects.length > 0 ? (
                    <div className="space-y-2">
                      {selectedInventoryItem.effects.map((effect, index) => (
                        <div key={`${effect.type}-${index}`} className="flex justify-between text-[11px] text-amber-200/80">
                          <span>{effect.type}</span>
                          <span>{effect.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-200/60">No known effects.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeEvent && (
        <EventModal
          event={activeEvent}
          playerStats={playerStats}
          onChoose={onResolveEvent}
        />
      )}

      {showEncounterModal && selectedNpc && (
        <EncounterModal
          npc={selectedNpc.stats}
          npcState={selectedNpc.state}
          player={playerStats}
          environment={{
            timeOfDay: params.timeOfDay,
            weather: currentWeather,
            mapX: params.mapX,
            mapY: params.mapY,
            nearbyInfected: selectedNpcNearbyInfected,
            nearbyDeceased: selectedNpcNearbyDeceased,
            currentActivity: selectedNpcActivity,
            localRumors: selectedNpcRumors,
            isInterior: sceneMode === 'interior',
            isPrivateSpace: isInPrivateSpace,
            buildingType: currentBuildingType,
            buildingProfession: currentBuildingProfession
          }}
          publicMorale={moraleStats}
          simulationStats={stats}
          conversationHistory={conversationHistories}
          onClose={() => {
            setShowEncounterModal(false);
            if (onResetFollowingState) onResetFollowingState();
          }}
          onConversationResult={onConversationResult}
          onTriggerEvent={onTriggerConversationEvent}
          isNPCInitiated={isNPCInitiatedEncounter}
          isFollowingAfterDismissal={isFollowingAfterDismissal}
        />
      )}

      {travelDestination && (
        <TravelConfirmationModal
          destinationName={travelDestination.label}
          onConfirm={handleTravelConfirm}
          onCancel={handleTravelCancel}
        />
      )}

      {/* Family Member Modal - opened from Reports Panel */}
      <FamilyMemberModal
        isOpen={selectedFamilyMember !== null}
        onClose={() => setSelectedFamilyMember(null)}
        member={selectedFamilyMember}
        playerGender={playerStats.gender}
        playerProfession={playerStats.profession}
        socialClass={playerStats.socialClass}
        skinTone={playerStats.skinTone}
        hairColor={playerStats.hairColor}
      />

      {/* Action Bar - show in both outdoor and interior modes */}
      {(sceneMode === 'outdoor' || sceneMode === 'interior') && (
          <ActionBar
            actionSlots={actionSlots}
            onTriggerAction={onTriggerAction}
            onTriggerPush={onTriggerPush}
            simTime={simTime}
            playerStats={playerStats}
            narratorMessage={narratorMessage}
            narratorKey={narratorKey}
            narratorHistory={narratorHistory}
            narratorOpen={narratorOpen}
            onToggleNarrator={setNarratorOpen}
            mobileNarratorVisible={mobileNarratorVisible}
            onNarratorSubmit={handleNarratorSubmit}
            narratorLoading={narratorLoading}
            narratorHighlights={narratorHighlights}
            onNarratorHighlightSelect={onNarratorHighlight}
            onOpenTransparency={() => setLlmTransparencyOpen(true)}
            inventoryItems={inventoryEntries}
            onOpenItemModal={(item) => setSelectedInventoryItem(item)}
            onDropItemAtScreen={onDropItemAtScreen}
          />
      )}

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      <LLMTransparencyModal
        isOpen={llmTransparencyOpen}
        onClose={() => setLlmTransparencyOpen(false)}
        entries={llmTransparencyEntries}
      />

      <NpcListModal
        isOpen={npcListModalOpen}
        onClose={() => setNpcListModalOpen(false)}
        entries={npcListEntries}
      />
    </div>
  );
};
