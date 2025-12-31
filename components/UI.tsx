
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
  MessageSquare
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
  /** Drop an inventory item near the player */
  onDropItem?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }) => void;
  /** Drop an inventory item at a screen coordinate */
  onDropItemAtScreen?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }, clientX: number, clientY: number) => void;
  perfDebug?: {
    schedulePhase: number;
    scheduleActive: boolean;
    lastScheduleMs: number;
    lastScheduleSimTime: number;
  };
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

const MiniMap: React.FC<{ data: MiniMapData | null; sceneMode: 'outdoor' | 'interior'; onClose: () => void; onToggle: () => void }> = ({ data, sceneMode, onClose, onToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minimapSize, setMinimapSize] = useState(() => (window.innerWidth < 640 ? 150 : 220));

  useEffect(() => {
    const handleResize = () => {
      setMinimapSize(window.innerWidth < 640 ? 150 : 220);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || sceneMode !== 'outdoor') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = minimapSize;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
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

    ctx.strokeStyle = 'rgba(102, 133, 160, 0.15)';
    ctx.lineWidth = 1;
    [0.3, 0.55, 0.8].forEach((t) => {
      ctx.beginPath();
      ctx.arc(0, 0, radius * t, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();

    const scale = radius / data.radius;
    const viewYaw = Number.isFinite(data.player.cameraYaw) ? data.player.cameraYaw : data.player.yaw;
    const cos = Math.cos(-viewYaw);
    const sin = Math.sin(-viewYaw);
    const project = (x: number, z: number) => {
      const dx = x - data.player.x;
      const dz = z - data.player.z;
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return { x: rx * scale, y: rz * scale };
    };

    data.buildings.forEach((b) => {
      const p = project(b.x, b.z);
      const distSq = p.x * p.x + p.y * p.y;
      if (distSq > radius * radius) return;
      const dist = Math.sqrt(distSq) / radius;
      // Exponential fade for buildings - more aggressive
      const alpha = Math.pow(1 - dist, 2.2);
      if (alpha < 0.15) return; // Cull very faint buildings

      let color = '#58616b';
      if (b.type === BuildingType.COMMERCIAL) color = '#8a6a3e';
      else if (b.type === BuildingType.RELIGIOUS) color = '#6d8a97';
      else if (b.type === BuildingType.CIVIC) color = '#8b6a5a';
      else if (b.type === BuildingType.SCHOOL) color = '#7b7aa6';
      else if (b.type === BuildingType.MEDICAL) color = '#6f8a76';
      else if (b.type === BuildingType.HOSPITALITY) color = '#8a7a5c';

      const size = Math.max(6, Math.min(24, b.size * scale));

      // Fill the building footprint for better visibility
      ctx.fillStyle = color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.globalAlpha = alpha * 0.35; // Semi-transparent fill
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);

      // Stroke for definition
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.85; // Stronger stroke
      ctx.lineWidth = 1.6;
      ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);

      // Door notch
      const notch = Math.max(3, size * 0.18);
      const half = size / 2;
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
    });

    // Sort NPCs by distance and limit to closest 15 (like Witcher 3/Skyrim)
    const maxNpcsShown = 15;
    const npcFadeStartRadius = 0.5; // Start fading at 50% of radius
    const npcCullRadius = 0.75; // Don't show beyond 75% of radius

    const sortedNpcs = data.npcs
      .map((npc) => {
        const p = project(npc.x, npc.z);
        const distSq = p.x * p.x + p.y * p.y;
        const dist = Math.sqrt(distSq) / radius;
        return { npc, p, dist, distSq };
      })
      .filter(({ dist }) => dist < npcCullRadius) // Cull distant NPCs
      .sort((a, b) => a.distSq - b.distSq) // Sort by distance
      .slice(0, maxNpcsShown); // Limit to closest N

    sortedNpcs.forEach(({ npc, p, dist }) => {
      // Exponential fade - aggressive falloff beyond fade start
      let alpha = 1.0;
      if (dist > npcFadeStartRadius) {
        const fadeRange = npcCullRadius - npcFadeStartRadius;
        const fadeProgress = (dist - npcFadeStartRadius) / fadeRange;
        alpha = Math.pow(1 - fadeProgress, 2.5); // Cubic falloff
      }
      alpha = Math.max(0.2, alpha);

      const glow = npc.state === AgentState.INFECTED ? '#ef4444'
        : npc.state === AgentState.INCUBATING ? '#f59e0b'
        : '#8fe3ff';

      ctx.shadowBlur = 10;
      ctx.shadowColor = glow;
      ctx.fillStyle = glow;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Special NPCs - distinct markers with labels
    data.specialNPCs.forEach((specialNPC) => {
      const p = project(specialNPC.x, specialNPC.z);
      const distSq = p.x * p.x + p.y * p.y;
      if (distSq > radius * radius) return;
      const dist = Math.sqrt(distSq) / radius;

      // Less aggressive fade for special NPCs so they're visible from farther
      const alpha = Math.pow(1 - dist, 1.5);
      if (alpha < 0.15) return;

      // Colors and labels for each type
      let color = '#fff';
      let label = '';
      if (specialNPC.type === 'SUFI_MYSTIC') {
        color = '#a78bfa'; // Purple for mystic
        label = 'SUFI';
      } else if (specialNPC.type === 'ASTROLOGER') {
        color = '#60a5fa'; // Blue for scholar/astronomer
        label = 'ASTRO';
      } else if (specialNPC.type === 'SCRIBE') {
        color = '#fbbf24'; // Gold for scribe
        label = 'SCRIBE';
      }

      // Draw star shape marker
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.9;

      // 5-pointed star
      ctx.beginPath();
      const spikes = 5;
      const outerRadius = 5;
      const innerRadius = 2.5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Inner glow
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Label text above star
      ctx.globalAlpha = alpha * 0.85;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#000';
      ctx.fillStyle = color;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, 0, -8);

      ctx.restore();
      ctx.globalAlpha = 1;
    });

    if (data.landmarks && data.landmarks.length > 0) {
      data.landmarks.forEach((lm) => {
        const p = project(lm.x, lm.z);
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq > radius * radius) return;
        const dist = Math.sqrt(distSq) / radius;
        const alpha = Math.pow(1 - dist, 2.1);
        if (alpha < 0.2) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(210, 190, 140, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '8px Lato, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(230, 210, 160, 0.9)';
        ctx.fillText(lm.label.toUpperCase(), 0, 4);
        ctx.restore();
      });
    }

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f7c66a';
    ctx.fillStyle = '#f7c66a';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [data, minimapSize, sceneMode]);

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

  return (
    <div className="absolute top-20 right-6 pointer-events-auto group">
      <div
        className="rounded-full p-[3px]"
        style={{ background: 'linear-gradient(135deg, #7a5a2e, #d3a45a 45%, #6b4b22)' }}
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
        className="mt-2 text-[9px] uppercase tracking-[0.3em] text-amber-200/60 text-center cursor-pointer hover:text-amber-100 transition-colors"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' }}
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
            enableArmSwing={false}
            showGroundShadow={false}
            distanceFromCamera={0}
          />
        </group>
      </Canvas>
    </div>
  );
};

export const UI: React.FC<UIProps> = ({ params, setParams, stats, playerStats, devSettings, setDevSettings, nearBuilding, buildingInfection, onFastTravel, selectedNpc, minimapData, sceneMode, mapX, mapY, overworldPath, pickupPrompt, climbablePrompt, isClimbing, onClimbInput, onTriggerPickup, onTriggerClimb, pickupToast, currentWeather, pushCharge, moraleStats, actionSlots, onTriggerAction, onTriggerPush, simTime, showPlayerModal, setShowPlayerModal, showEncounterModal, setShowEncounterModal, conversationHistories, onConversationResult, onTriggerConversationEvent, selectedNpcActivity, selectedNpcNearbyInfected, selectedNpcNearbyDeceased, selectedNpcRumors, activeEvent, onResolveEvent, onTriggerDebugEvent, llmEventsEnabled, setLlmEventsEnabled, lastEventNote, showDemographicsOverlay, setShowDemographicsOverlay, onForceNpcState, onForceAllNpcState, isNPCInitiatedEncounter = false, isFollowingAfterDismissal = false, onResetFollowingState, nearbyNPCs = [], onOpenGuideModal, onSelectGuideEntry, infectedHouseholds, onNavigateToHousehold, onDropItem, onDropItemAtScreen, perfDebug }) => {
  const [showSettings, setShowSettings] = useState(false);
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
  const [dossierTab, setDossierTab] = useState<'overview' | 'health' | 'inventory'>('overview');
  const [inventoryView, setInventoryView] = useState<'list' | 'grid'>('list');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryEntry | null>(null);
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
    setNarratorOpen
  } = useNarration(params.mapX, params.mapY, params.timeOfDay);
  const perspectiveTimeoutRef = useRef<number | null>(null);

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
    const order = [CameraMode.FIRST_PERSON, CameraMode.OVER_SHOULDER, CameraMode.THIRD_PERSON, CameraMode.OVERHEAD];
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
        />
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
        onOpenPlayerModal={() => setShowPlayerModal(true)}
        onToggleMobilePerspectiveMenu={() => setShowMobilePerspectiveMenu(prev => !prev)}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />

      <MobilePerspectiveMenu
        visible={showMobilePerspectiveMenu}
        cameraMode={params.cameraMode}
        onChange={(mode) => handleChange('cameraMode', mode)}
        onClose={() => setShowMobilePerspectiveMenu(false)}
      />

      {/* CENTER LOCATION PILLS */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-xs md:max-w-md pointer-events-none">
        {/* Mobile toggle buttons row */}
        <div className="md:hidden flex items-center gap-2 pointer-events-auto">
          {/* Left button - Reports Panel */}
          <button
            onClick={() => setMobileReportsPanelVisible(!mobileReportsPanelVisible)}
            className={`p-2.5 rounded-full border shadow-lg transition-all active:scale-95 ${
              mobileReportsPanelVisible
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-black/70 border-amber-600/40 text-amber-500 hover:bg-black/90'
            }`}
            title="Toggle Reports"
          >
            <FileText size={18} />
          </button>

          {/* Center - Map button */}
          <button
            onClick={() => setShowMap(true)}
            className="bg-black/60 hover:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-amber-600/40 text-amber-500 shadow-xl flex items-center gap-2 transition-all group active:scale-95"
          >
            <div className="bg-amber-500/10 p-1 rounded-full group-hover:bg-amber-500/20 transition-colors">
              <MapIcon size={14} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="historical-font text-[10px] whitespace-nowrap tracking-wider font-bold">
                {getLocationLabel(params.mapX, params.mapY)}
              </span>
            </div>
          </button>

          {/* Right button - Narrator Panel */}
          <button
            onClick={() => setMobileNarratorVisible(!mobileNarratorVisible)}
            className={`p-2.5 rounded-full border shadow-lg transition-all active:scale-95 ${
              mobileNarratorVisible
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-black/70 border-amber-600/40 text-amber-500 hover:bg-black/90'
            }`}
            title="Toggle Narrator"
          >
            <MessageSquare size={18} />
          </button>
        </div>

        {/* Desktop - Original map button */}
        <button
          onClick={() => setShowMap(true)}
          className="hidden md:flex bg-black/60 hover:bg-black/80 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-500 shadow-xl items-center gap-3 pointer-events-auto transition-all group active:scale-95"
        >
          <div className="bg-amber-500/10 p-1 rounded-full group-hover:bg-amber-500/20 transition-colors">
            <MapIcon size={14} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="historical-font text-[10px] md:text-xs whitespace-nowrap tracking-wider font-bold">
              {getLocationLabel(params.mapX, params.mapY)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-amber-500/40 font-light mt-1">Open Overworld Map</span>
          </div>
        </button>

        {nearBuilding && (() => {
          const infectionState = buildingInfection?.[nearBuilding.id];
          const isInfected = infectionState?.status === 'infected' || infectionState?.status === 'deceased';
          const isDeceased = infectionState?.status === 'deceased';

          return (
            <div className={`backdrop-blur-lg p-3 rounded-xl shadow-2xl w-full transition-all duration-300 animate-in fade-in slide-in-from-top-4 pointer-events-auto ${
              isInfected
                ? 'bg-red-950/80 border-2 border-red-500/60'
                : 'bg-black/60 border border-amber-600/30'
            }`}>
              {/* Plague warning banner */}
              {isInfected && (
                <div className={`flex items-center justify-center gap-2 mb-2 py-1.5 rounded-lg ${
                  isDeceased ? 'bg-red-900/60' : 'bg-red-800/50'
                } animate-pulse`}>
                  <span className="text-red-200 font-black text-xs uppercase tracking-[0.2em]">
                    {isDeceased ? '☠ DEATH HOUSE ☠' : '⚠ PLAGUE HOUSE ⚠'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold text-[10px] historical-font tracking-tight uppercase ${
                  isInfected ? 'text-red-300' : 'text-amber-400'
                }`}>
                  {getBuildingTypeLabel(nearBuilding.type)}
                </h3>
                <Info size={12} className={isInfected ? 'text-red-400/50' : 'text-amber-600/50'} />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-2 ${isInfected ? 'text-red-100' : 'text-amber-100'}`}>
                  <User size={10} className={isInfected ? 'text-red-400/70' : 'text-amber-500/70'} />
                  <span className="text-xs font-semibold">{nearBuilding.ownerName}</span>
                  <span className={`text-[10px] ${isInfected ? 'text-red-100/50' : 'text-amber-100/50'}`}>Age {nearBuilding.ownerAge}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border font-bold ${
                    isInfected
                      ? 'text-red-300/80 bg-red-950/50 border-red-700/30'
                      : 'text-amber-400/80 bg-amber-950/50 border-amber-900/30'
                  }`}>
                    {nearBuilding.ownerProfession}
                  </span>
                </div>
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
        {/* Reports Panel - Hidden by default on mobile, slides in from left */}
        <div className={`
          fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-auto
          transition-transform duration-300 ease-out
          md:transform-none md:opacity-100
          ${mobileReportsPanelVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Mobile backdrop */}
          {mobileReportsPanelVisible && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 -z-10"
              onClick={() => setMobileReportsPanelVisible(false)}
            />
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setMobileReportsPanelVisible(false)}
            className="md:hidden absolute top-4 right-4 z-10 p-2 rounded-full bg-black/80 border border-amber-600/40 text-amber-500"
          >
            <X size={20} />
          </button>
          <div className="h-full md:h-auto overflow-y-auto md:overflow-visible bg-black/95 md:bg-transparent pt-16 md:pt-0">
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
              moraleStats={moraleStats}
              alchemistTableCollapsed={alchemistTableCollapsed}
              setAlchemistTableCollapsed={setAlchemistTableCollapsed}
              params={params}
              onChangeParam={handleChange}
              showDemographicsOverlay={showDemographicsOverlay}
              setShowDemographicsOverlay={setShowDemographicsOverlay}
              playerStats={playerStats}
              onShowPlayerModal={() => setShowPlayerModal(true)}
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
            />
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

        {/* Pickup Prompt - clickable for mobile */}
        {pickupPrompt && (
          <button
            onClick={onTriggerPickup}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.25)] pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none"
          >
            <span className="flex items-center gap-2">
              <span className="hidden md:inline opacity-60">[SHIFT]</span>
              {pickupPrompt}
            </span>
          </button>
        )}
        {/* Climb Prompt - clickable for mobile */}
        {climbablePrompt && !pickupPrompt && !isClimbing && (
          <button
            onClick={onTriggerClimb}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-sky-700/50 text-sky-200 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.25)] pointer-events-auto cursor-pointer hover:bg-sky-900/40 hover:border-sky-500/70 active:bg-sky-800/50 active:scale-95 transition-all touch-manipulation select-none"
          >
            <span className="flex items-center gap-2">
              <span className="hidden md:inline opacity-60">[C]</span>
              {climbablePrompt}
            </span>
          </button>
        )}

        {/* Climbing Controls - shows when actively climbing */}
        {isClimbing && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {/* Climbing status with keyboard hint */}
            <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-500/50 text-sky-300 text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              Climbing <span className="text-sky-400/60 ml-1">(↑/↓ keys)</span>
            </div>
            {/* Arrow controls for mobile - hold to climb continuously */}
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
              <div className="flex gap-1">
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
              </div>
              <button
                className="mt-1 px-4 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-red-500/50 text-red-300 text-[9px] uppercase tracking-wider active:bg-red-900/50 active:scale-95 transition-all touch-manipulation shadow-lg"
                onClick={() => onClimbInput?.('cancel')}
              >
                Cancel (C)
              </button>
            </div>
          </div>
        )}
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
              {pushCharge >= 1 ? 'Release to Push!' : 'Hold Shift...'}
            </div>
            <div className="w-32 h-2 bg-black/60 rounded-full border border-amber-700/50 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${pushCharge >= 1 ? 'bg-amber-400 animate-pulse' : 'bg-amber-600'}`}
                style={{ width: `${Math.min(100, pushCharge * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-6">
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
        buildApparelEntry={buildApparelEntry}
        onClose={() => setShowPlayerModal(false)}
        getHealthStatusLabel={getHealthStatusLabel}
        getPlagueTypeLabel={getPlagueTypeLabel}
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
          player={playerStats}
          environment={{
            timeOfDay: params.timeOfDay,
            weather: currentWeather,
            mapX: params.mapX,
            mapY: params.mapY,
            nearbyInfected: selectedNpcNearbyInfected,
            nearbyDeceased: selectedNpcNearbyDeceased,
            currentActivity: selectedNpcActivity,
            localRumors: selectedNpcRumors
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

      {/* Action Bar - only show in outdoor mode */}
      {sceneMode === 'outdoor' && (
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
            inventoryItems={inventoryEntries}
            onOpenItemModal={(item) => setSelectedInventoryItem(item)}
            onDropItemAtScreen={onDropItemAtScreen}
          />
      )}
    </div>
  );
};
