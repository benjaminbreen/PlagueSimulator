
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SimulationParams, SimulationStats, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, MiniMapData, getLocationLabel, NPCStats, AgentState } from '../types';
import { Humanoid } from './Humanoid';
import { seededRandom } from '../utils/procedural';
import { getItemDetailsByItemId } from '../utils/merchantItems';
import {
  Pause,
  Play,
  FastForward,
  Skull,
  ShieldAlert,
  Sun,
  Moon,
  Camera,
  Layers,
  Eye,
  Info,
  MapPin,
  User,
  Menu,
  X,
  Calendar,
  MousePointer2,
  Keyboard,
  Map as MapIcon,
  Navigation,
  Package,
  ArrowUpDown
} from 'lucide-react';

interface UIProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  stats: SimulationStats;
  playerStats: PlayerStats;
  devSettings: DevSettings;
  setDevSettings: React.Dispatch<React.SetStateAction<DevSettings>>;
  nearBuilding: BuildingMetadata | null;
  onFastTravel: (x: number, y: number) => void;
  selectedNpc: { stats: NPCStats; state: AgentState } | null;
  minimapData: MiniMapData | null;
  sceneMode: 'outdoor' | 'interior';
  pickupPrompt: string | null;
  pickupToast: string | null;
}

const MapModal: React.FC<{
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  const locations = [
    { name: "Main Road (Al-Buzuriyah)", x: 0, y: 0, type: "Road", desc: "The bustling spine of the city, lined with spices and silks." },
    { name: "Narrow Alleys (Bab Sharqi)", x: 1, y: 1, type: "Alley", desc: "Claustrophobic streets where the miasma lingers longest." },
    { name: "Al-Salihiyya (Hillside Quarter)", x: -2, y: 1, type: "Hillside", desc: "A terraced quarter on the slopes, gardens and stone steps rising above the city." },
    { name: "Wealthy Quarter (Al-Qaymariyya)", x: -1, y: 2, type: "Wealthy", desc: "Ornate mansions behind high walls. The plague spares few." },
    { name: "Poor Hovels (Al-Shaghour)", x: 0, y: -2, type: "Hovels", desc: "Density and decay make this a breeding ground for death." },
    { name: "Player's Home", x: 1, y: -1, type: "Home", desc: "A modest courtyard house. Your only sanctuary." },
    { name: "Outskirts (Rural Fringe)", x: 2, y: 2, type: "Outskirts", desc: "Sparse dwellings and palms where the city thins into fields and hills." },
    { name: "Caravanserai (Pilgrims' Road)", x: -2, y: -2, type: "Caravanserai", desc: "A fortified inn for caravans and merchants outside the city walls." },
    { name: "Mamluk Citadel", x: 2, y: -1, type: "Civic", desc: "Seat of the governor. Heavily guarded against the frantic crowds." },
  ];

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in-95 pointer-events-auto">
      <div className="max-w-4xl w-full bg-[#f4e4bc] border-8 border-[#3d2817] rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col md:flex-row h-[90vh]">
        {/* Parchment Texture Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] mix-blend-multiply"></div>
        
        {/* Left Side: Map Visual */}
        <div className="relative flex-1 bg-[#dcc69c] border-b md:border-b-0 md:border-r-4 border-[#3d2817] p-8 overflow-hidden group">
          <div className="absolute top-4 left-4 text-[#3d2817] historical-font font-bold text-xl uppercase opacity-40">Map of Damascus — 1348 AD</div>
          
          {/* Stylized SVG Map of Damascus */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-lg opacity-80">
              {/* City Walls */}
              <path d="M100,50 L300,50 L350,150 L320,350 L80,350 L50,150 Z" fill="#c4b593" stroke="#3d2817" strokeWidth="4" />
              {/* Barada River */}
              <path d="M0,40 Q200,20 400,60" fill="none" stroke="#5a7a8a" strokeWidth="12" strokeOpacity="0.5" />
              {/* Straight Street (Suq al-Tawila) */}
              <line x1="100" y1="200" x2="330" y2="200" stroke="#8b4513" strokeWidth="4" strokeDasharray="4 2" />
              {/* Umayyad Mosque Landmark */}
              <rect x="180" y="140" width="40" height="40" fill="#a89f91" stroke="#3d2817" strokeWidth="2" />
              <circle cx="200" cy="160" r="10" fill="#c2b280" />
              
              {/* Interactive Location Nodes */}
              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                // Map logical coords to SVG space
                const svgX = 200 + loc.x * 60;
                const svgY = 200 - loc.y * 60;
                
                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    <circle 
                      cx={svgX} 
                      cy={svgY} 
                      r={isCurrent ? 8 : 6} 
                      fill={isCurrent ? "#ef4444" : "#3d2817"} 
                      className="transition-all hover:r-10"
                    />
                    {isCurrent && (
                      <circle cx={svgX} cy={svgY} r={12} fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
                    )}
                    <text 
                      x={svgX} 
                      y={svgY - 15} 
                      textAnchor="middle" 
                      className="text-[8px] md:text-[10px] historical-font fill-[#3d2817] font-bold uppercase tracking-tighter opacity-0 group-hover/node:opacity-100 transition-opacity"
                    >
                      {loc.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Location Info & List */}
        <div className="w-full md:w-80 p-6 flex flex-col gap-6 bg-[#efe0bc] z-10">
          <div className="flex justify-between items-center border-b-2 border-[#3d2817] pb-2">
            <h3 className="historical-font text-2xl text-[#3d2817] font-bold italic tracking-tighter">Fast Travel</h3>
            <button onClick={onClose} className="text-[#3d2817] hover:scale-110 transition-transform">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  className={`w-full text-left p-3 border-2 transition-all group ${
                    isCurrent 
                      ? 'bg-[#3d2817] border-[#3d2817] text-[#f4e4bc]' 
                      : 'border-[#3d2817]/20 hover:border-[#3d2817] hover:bg-[#3d2817]/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="historical-font font-bold text-sm tracking-tight uppercase">
                      {loc.name}
                    </span>
                    {isCurrent && <MapPin size={12} />}
                  </div>
                  <p className={`text-[10px] leading-tight ${isCurrent ? 'text-amber-100/70' : 'text-[#3d2817]/60'}`}>
                    {loc.desc}
                  </p>
                  {!isCurrent && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[#3d2817] uppercase tracking-widest">
                      <Navigation size={10} /> Commute to district
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-[#3d2817]/40 text-center italic border-t border-[#3d2817]/20 pt-4">
            "By the grace of the Barada, we travel safely."
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniMap: React.FC<{ data: MiniMapData | null; sceneMode: 'outdoor' | 'interior' }> = ({ data, sceneMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || sceneMode !== 'outdoor') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 220;
    const dpr = window.devicePixelRatio || 1;
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
  }, [data, sceneMode]);

  if (!data || sceneMode !== 'outdoor') return null;

  const districtLabel = data.district === 'MARKET' ? 'Market' :
    data.district === 'WEALTHY' ? 'Wealthy Quarter' :
    data.district === 'HOVELS' ? 'Poor Hovels' :
    data.district === 'CIVIC' ? 'Civic District' :
    data.district === 'ALLEYS' ? 'Narrow Alleys' :
    data.district === 'SALHIYYA' ? 'Al-Salihiyya' :
    data.district === 'OUTSKIRTS' ? 'Outskirts' :
    data.district === 'CARAVANSERAI' ? 'Caravanserai' :
    'Residential';

  return (
    <div className="absolute top-20 right-6 pointer-events-none">
      <div
        className="rounded-full p-[3px]"
        style={{ background: 'linear-gradient(135deg, #7a5a2e, #d3a45a 45%, #6b4b22)' }}
      >
        <div className="relative rounded-full p-[6px] bg-black/80 border border-amber-900/40 shadow-[0_0_24px_rgba(210,164,90,0.35)]">
          <canvas ref={canvasRef} className="rounded-full block" />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.12), transparent 55%)' }}
          />
        </div>
      </div>
      <div className="mt-2 text-[9px] uppercase tracking-[0.3em] text-amber-200/60 text-center">
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

const NpcPortrait: React.FC<{ npc: NPCStats }> = ({ npc }) => {
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
    <div className="w-12 h-12 rounded-full border border-amber-800/50 bg-black/40 overflow-hidden">
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 1.4, 2.3], fov: 24 }}
        dpr={1}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.4, 0);
        }}
      >
        <PortraitRenderOnce />
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 2, 2]} intensity={0.7} />
        <group position={[0, -1.45, 0]}>
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

export const UI: React.FC<UIProps> = ({ params, setParams, stats, playerStats, devSettings, setDevSettings, nearBuilding, onFastTravel, selectedNpc, minimapData, sceneMode, pickupPrompt, pickupToast }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [reportTab, setReportTab] = useState<'epidemic' | 'player'>('epidemic');
  const [settingsTab, setSettingsTab] = useState<'about' | 'dev'>('about');
  const [showPerspective, setShowPerspective] = useState(true);
  const [fps, setFps] = useState(0);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'rarity' | 'quantity'>('name');
  const inventoryEntries = useMemo(() => {
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

  React.useEffect(() => {
    if (!devSettings.showPerfPanel) return;
    let last = performance.now();
    let frames = 0;
    let rafId = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [devSettings.showPerfPanel]);

  const handleChange = (key: keyof SimulationParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleChange('uiMinimized', !params.uiMinimized);
    }
  };

  const cyclePerspective = () => {
    const order = [CameraMode.THIRD_PERSON, CameraMode.OVERHEAD, CameraMode.FIRST_PERSON];
    const idx = order.indexOf(params.cameraMode);
    const next = order[(idx + 1) % order.length];
    handleChange('cameraMode', next);
    setShowPerspective(true);
  };

  const getBuildingTypeLabel = (type: BuildingType) => {
    switch (type) {
      case BuildingType.RESIDENTIAL: return 'Private Residence';
      case BuildingType.COMMERCIAL: return 'Merchant Stall';
      case BuildingType.RELIGIOUS: return 'Holy Sanctuary';
      case BuildingType.CIVIC: return 'Governor\'s Office';
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
    setShowPerspective(true);
    const timer = window.setTimeout(() => setShowPerspective(false), 10000);
    return () => window.clearTimeout(timer);
  }, [params.cameraMode]);

  const formatHeight = (scale: number) => `${Math.round(scale * 170)} cm`;
  const formatWeight = (scale: number) => `${Math.round(scale * 70)} kg`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10 text-amber-50">
      <MiniMap data={minimapData} sceneMode={sceneMode} />
      
      {/* TOP NAV BAR */}
      <div 
        className="w-full h-16 bg-black/80 backdrop-blur-md border-b border-amber-900/30 px-6 flex items-center justify-between pointer-events-auto cursor-pointer shadow-xl"
        onClick={toggleMinimize}
      >
        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
          <h1 className="text-lg md:text-xl font-bold text-amber-500 historical-font tracking-tighter leading-none">
            PLAGUE SIMULATOR
          </h1>
          <span className="text-[10px] text-amber-200/50 uppercase tracking-[0.3em] font-light">DAMASCUS 1348</span>
        </div>

        <div 
          className="hidden md:flex items-center gap-6 bg-amber-950/20 px-6 py-2 rounded-full border border-amber-800/20"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-amber-100/90">
            <Calendar size={14} className="text-amber-500" />
            <span className="text-xs font-mono tracking-widest uppercase">{getDateStr()}</span>
          </div>
          <div className="w-px h-4 bg-amber-800/30" />
          <div className="flex items-center gap-2 text-amber-100/90">
            {params.timeOfDay > 6 && params.timeOfDay < 18 ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
            <span className="text-xs font-mono tracking-widest">{getTimeStr()}</span>
          </div>
          
          <div className="w-px h-4 bg-amber-800/30 ml-2" />
          
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button 
              onClick={() => handleChange('simulationSpeed', 0)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 0 ? 'bg-red-700 text-white shadow-[0_0_10px_rgba(185,28,28,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Freeze Simulation"
            >
              <Pause size={14} />
            </button>
            <button 
              onClick={() => handleChange('simulationSpeed', 1)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 1 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Normal Speed"
            >
              <Play size={14} />
            </button>
            <button 
              onClick={() => handleChange('simulationSpeed', 4)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 4 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Fast Forward"
            >
              <FastForward size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
          <div className="hidden lg:flex flex-col items-end mr-4 text-[9px] text-amber-500/50 uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2"><span>Arrows to Move</span><Keyboard size={10}/></div>
            <div className="flex items-center gap-2"><span>V to Change Perspective</span><MousePointer2 size={10}/></div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-amber-500 hover:text-amber-400 transition-colors"
          >
            {showSettings ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* CENTER LOCATION PILLS */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-xs md:max-w-md pointer-events-none">
        <button 
          onClick={() => setShowMap(true)}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-500 shadow-xl flex items-center gap-3 pointer-events-auto transition-all group active:scale-95"
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

        {nearBuilding && (
          <div className="bg-black/60 backdrop-blur-lg p-3 rounded-xl border border-amber-600/30 shadow-2xl w-full transition-all duration-300 animate-in fade-in slide-in-from-top-4 pointer-events-auto">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-amber-400 font-bold text-[10px] historical-font tracking-tight uppercase">
                {getBuildingTypeLabel(nearBuilding.type)}
              </h3>
              <Info size={12} className="text-amber-600/50" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-amber-100">
                <User size={10} className="text-amber-500/70" />
                <span className="text-xs font-semibold">{nearBuilding.ownerName}</span>
                <span className="text-[10px] text-amber-100/50">Age {nearBuilding.ownerAge}</span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <span className="text-[9px] uppercase tracking-widest text-amber-400/80 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/30 font-bold">
                  {nearBuilding.ownerProfession}
                </span>
              </div>
            </div>
          </div>
        )}
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

      {/* FLOATING WINDOWS */}
      <div className={`flex flex-col flex-1 justify-between p-4 md:p-6 transition-all duration-500 ${params.uiMinimized ? 'opacity-0 scale-95 pointer-events-none translate-y-4' : 'opacity-100 scale-100'}`}>
        
        {/* Reports Panel */}
        <div className="self-end md:self-start mt-12 md:mt-0 w-full md:w-[360px]">
          <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg border border-amber-800/50 shadow-lg pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
              <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Reports Panel</h4>
              <div className="flex gap-1 bg-amber-950/40 p-1 rounded-full border border-amber-900/40">
                <button
                  onClick={() => setReportTab('epidemic')}
                  className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all ${
                    reportTab === 'epidemic' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  Epidemic
                </button>
                <button
                  onClick={() => setReportTab('player')}
                  className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all ${
                    reportTab === 'player' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  Player
                </button>
              </div>
            </div>

            {reportTab === 'epidemic' ? (
              <div className="space-y-4">
                <div className="text-right md:text-left">
                  <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-3 font-bold">Epidemic Report</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-white">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 min-w-[70px]">Healthy</span>
                      <span className="font-mono text-lg">{stats.healthy}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-yellow-300">
                      <span className="text-[10px] uppercase tracking-wider text-yellow-300/70 min-w-[70px]">Incubating</span>
                      <span className="font-mono text-lg">{stats.incubating}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-red-400">
                      <span className="text-[10px] uppercase tracking-wider text-red-400/70 min-w-[70px]">Infected</span>
                      <span className="font-mono text-lg">{stats.infected}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-gray-500">
                      <span className="text-[10px] uppercase tracking-wider text-gray-600 min-w-[70px]">Deceased</span>
                      <span className="font-mono text-lg">{stats.deceased}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Alchemist's Table</span>
                    <div className="text-[9px] text-amber-100/30 italic">Drag to modify</div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold"><Skull size={10}/> Contact Virulence</span>
                        <span className="font-mono">{Math.round(params.infectionRate * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01"
                        value={params.infectionRate}
                        onChange={(e) => handleChange('infectionRate', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold">Sanitation Protocol</span>
                        <span className="font-mono">{Math.round(params.hygieneLevel * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={params.hygieneLevel}
                        onChange={(e) => handleChange('hygieneLevel', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleChange('quarantine', !params.quarantine)}
                        className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-[10px] tracking-widest uppercase border ${
                          params.quarantine 
                            ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <ShieldAlert size={14} />
                        {params.quarantine ? 'QUARANTINE ENFORCED' : 'Enable Quarantine'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-[12px] text-amber-50/90">
                <div className="flex items-center justify-between">
                  <div className="historical-font text-amber-400 text-sm uppercase tracking-widest">Player Report</div>
                  <button
                    onClick={() => setShowPlayerModal(true)}
                    className="text-[10px] text-amber-100/40 uppercase tracking-[0.2em] hover:text-amber-100/70 transition-colors"
                  >
                    More Info
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Name</div>
                    <div className="font-bold">{playerStats.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Profession</div>
                    <div className="font-bold">{playerStats.profession}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Class</div>
                    <div className="font-bold">{playerStats.socialClass}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Age</div>
                    <div className="font-bold">{playerStats.age} Years</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Gender</div>
                    <div className="font-bold">{playerStats.gender}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Health</div>
                    <div className="font-bold text-emerald-300">{playerStats.healthStatus}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Height</div>
                    <div className="font-bold">{formatHeight(playerStats.height)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Weight</div>
                    <div className="font-bold">{formatWeight(playerStats.weight)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Skin</div>
                    <div className="font-bold">{playerStats.skinDescription}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Hair</div>
                    <div className="font-bold">{playerStats.hairDescription}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Robe</div>
                    <div className="font-bold">{playerStats.robeDescription}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Headwear</div>
                    <div className="font-bold">{playerStats.headwearDescription}</div>
                  </div>
                </div>
                <div className="border-t border-amber-900/40 pt-3 text-[11px] text-amber-100/70">
                  <span className="uppercase tracking-widest text-amber-500/60">Family</span>
                  <div className="mt-1">{playerStats.family}</div>
                </div>
                <div className="border-t border-amber-900/40 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/70">
                      <Package size={12} className="text-amber-500/70" />
                      Inventory
                      <span className="text-amber-100/40">{playerStats.inventory.length}/{playerStats.maxInventorySlots}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-amber-100/50">
                      <ArrowUpDown size={12} className="text-amber-500/60" />
                      <button
                        onClick={() => setInventorySortBy('name')}
                        className={inventorySortBy === 'name' ? 'text-amber-200' : 'hover:text-amber-200'}
                      >
                        Name
                      </button>
                      <span className="text-amber-500/40">·</span>
                      <button
                        onClick={() => setInventorySortBy('rarity')}
                        className={inventorySortBy === 'rarity' ? 'text-amber-200' : 'hover:text-amber-200'}
                      >
                        Rarity
                      </button>
                      <span className="text-amber-500/40">·</span>
                      <button
                        onClick={() => setInventorySortBy('quantity')}
                        className={inventorySortBy === 'quantity' ? 'text-amber-200' : 'hover:text-amber-200'}
                      >
                        Qty
                      </button>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-auto pr-1 space-y-2 text-[11px]">
                    {inventoryEntries.length === 0 ? (
                      <div className="text-amber-100/50 italic">No items carried.</div>
                    ) : (
                      inventoryEntries.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-amber-100">{item.name}</div>
                            <div className="text-[10px] text-amber-100/50">{item.description}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-[9px] uppercase tracking-widest ${getRarityMeta(item.rarity).color}`}>
                              {getRarityMeta(item.rarity).label}
                            </div>
                            <div className="text-[11px] font-mono text-amber-200/80">x{item.quantity}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {selectedNpc && (
          <div className="self-end md:self-start mt-4 w-full md:w-[360px]">
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
                  <div className="text-[10px] text-amber-100/70 mt-1">
                    {selectedNpc.stats.gender}, {selectedNpc.stats.age} years · {selectedNpc.stats.socialClass}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] text-amber-100/80">
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60">Mood</div>
                  <div className="font-semibold">{selectedNpc.stats.mood}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60">Carrying</div>
                  <div className="font-semibold">{getHeldItemLabel(selectedNpc.stats.heldItem)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60">Footwear</div>
                  <div className="font-semibold">{selectedNpc.stats.footwearStyle ?? '—'}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60">Headwear</div>
                  <div className="font-semibold">{selectedNpc.stats.headwearStyle ?? 'none'}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest text-amber-500/60">Sleeves</div>
                  <div className="font-semibold">{selectedNpc.stats.sleeveCoverage ?? '—'}</div>
                </div>
              </div>

              {selectedNpc.stats.goalOfDay && (
                <div className="border-t border-amber-900/40 pt-3 mt-3 text-[10px] text-amber-100/70">
                  <span className="uppercase tracking-widest text-amber-500/60">Goal</span>
                  <div className="mt-1">{selectedNpc.stats.goalOfDay}</div>
                </div>
              )}

              {selectedNpc.stats.accessories && selectedNpc.stats.accessories.length > 0 && (
                <div className="border-t border-amber-900/40 pt-3 mt-3 text-[10px] text-amber-100/70">
                  <span className="uppercase tracking-widest text-amber-500/60">Accessories</span>
                  <div className="mt-1">{selectedNpc.stats.accessories.join(', ')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {pickupPrompt && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest pointer-events-none shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            {pickupPrompt}
          </div>
        )}
        {pickupToast && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-950/90 via-black/80 to-amber-950/90 backdrop-blur-md px-5 py-2 rounded-full border border-amber-500/50 text-amber-100 text-[10px] uppercase tracking-widest pointer-events-none shadow-[0_0_30px_rgba(245,158,11,0.35)]">
            {pickupToast}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">
          {showPerspective && (
            <div className="bg-black/70 backdrop-blur-lg p-3 rounded-xl border border-amber-900/50 shadow-2xl flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-widest text-amber-500/80 font-bold mb-1 px-1">Observation Perspective</span>
              <div className="grid grid-cols-1 gap-1">
                <button 
                  onClick={() => handleChange('cameraMode', CameraMode.THIRD_PERSON)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.THIRD_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  <Camera size={12} /> Orbit View
                </button>
                <button 
                  onClick={() => handleChange('cameraMode', CameraMode.OVERHEAD)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.OVERHEAD ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  <Layers size={12} /> Overhead Map
                </button>
                <button 
                  onClick={() => handleChange('cameraMode', CameraMode.FIRST_PERSON)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.FIRST_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  <Eye size={12} /> First Person
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SETTINGS MENU OVERLAY */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center pointer-events-auto p-6 md:p-10 animate-in fade-in zoom-in-95">
          <button 
            onClick={() => setShowSettings(false)}
            className="absolute top-6 right-6 p-4 text-amber-500 hover:text-amber-400"
          >
            <X size={32} />
          </button>
          
          <div className="max-w-3xl w-full bg-black/60 border border-amber-900/40 rounded-xl shadow-2xl p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-900/30 pb-4">
              <div>
                <h2 className="historical-font text-3xl md:text-4xl text-amber-500 tracking-tighter">DAMASCUS 1348</h2>
                <p className="text-amber-100/50 uppercase tracking-[0.35em] text-xs mt-2">Simulated Reality Engine</p>
              </div>
              <div className="flex gap-2 bg-amber-950/40 p-1 rounded-full border border-amber-900/40">
                <button
                  onClick={() => setSettingsTab('about')}
                  className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
                    settingsTab === 'about' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/60 hover:text-amber-200'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setSettingsTab('dev')}
                  className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
                    settingsTab === 'dev' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/60 hover:text-amber-200'
                  }`}
                >
                  Dev Panel
                </button>
              </div>
            </div>

            {settingsTab === 'about' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 text-sm text-amber-50/80 leading-relaxed">
                <div>
                  <h3 className="historical-font text-amber-400 text-lg mb-4">About</h3>
                  <p>In 1348, the Black Death reached Damascus from Gaza. This simulation explores infection dynamics across the city’s marketplaces and quarters. Observe, intervene, and learn the patterns of spread.</p>
                  <div className="mt-6 p-4 bg-amber-950/30 border border-amber-900/40 rounded-lg">
                    <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">Controls</h4>
                    <ul className="text-[11px] space-y-1">
                      <li><span className="text-amber-200">ARROWS:</span> Move character</li>
                      <li><span className="text-amber-200">WASD:</span> Adjust camera / look</li>
                      <li><span className="text-amber-200">SHIFT:</span> Sprint</li>
                      <li><span className="text-amber-200">PAUSE:</span> Stop time & movement</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="historical-font text-amber-400 text-lg mb-4">Simulation</h3>
                  <ul className="space-y-2 list-disc pl-4">
                    <li>Pathogens spread via proximity (2m contact).</li>
                    <li>Incubation period: 1 simulation hour.</li>
                    <li>Symptoms emerge after 2 hours.</li>
                    <li>Mortality peaks at 24 hours.</li>
                    <li>Rats appear when sanitation falls below 40%.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-6 text-amber-50/80">
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 uppercase tracking-widest text-xs font-bold">Developer Controls</div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                    <input
                      type="checkbox"
                      checked={devSettings.enabled}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="accent-amber-600"
                    />
                    Enable
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Weather Override</label>
                    <select
                      value={devSettings.weatherOverride}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, weatherOverride: e.target.value as DevSettings['weatherOverride'] }))}
                      className="mt-2 w-full bg-black/50 border border-amber-900/40 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="auto">Auto</option>
                      <option value="CLEAR">Clear</option>
                      <option value="OVERCAST">Overcast</option>
                      <option value="SANDSTORM">Sandstorm</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Fog Density Scale</label>
                    <input
                      type="range"
                      min="0.4"
                      max="2"
                      step="0.05"
                      value={devSettings.fogDensityScale}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, fogDensityScale: parseFloat(e.target.value) }))}
                      className="mt-3 w-full accent-amber-600"
                    />
                    <div className="text-[10px] mt-1 text-amber-200/60">{devSettings.fogDensityScale.toFixed(2)}x</div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Cloud Cover Override</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={devSettings.cloudCoverOverride ?? 0}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, cloudCoverOverride: parseFloat(e.target.value) }))}
                      className="mt-3 w-full accent-amber-600"
                    />
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-amber-200/60">{(devSettings.cloudCoverOverride ?? 0).toFixed(2)}</span>
                      <button
                        onClick={() => setDevSettings(prev => ({ ...prev, cloudCoverOverride: null }))}
                        className="uppercase tracking-widest text-amber-300/70 hover:text-amber-300"
                      >
                        Reset to Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Humidity Override</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={devSettings.humidityOverride ?? 0}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, humidityOverride: parseFloat(e.target.value) }))}
                      className="mt-3 w-full accent-amber-600"
                    />
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-amber-200/60">{(devSettings.humidityOverride ?? 0).toFixed(2)}</span>
                      <button
                        onClick={() => setDevSettings(prev => ({ ...prev, humidityOverride: null }))}
                        className="uppercase tracking-widest text-amber-300/70 hover:text-amber-300"
                      >
                        Reset to Auto
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] uppercase tracking-widest">
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Perf Panel</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showPerfPanel}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showPerfPanel: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Hover Wireframe</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showHoverWireframe}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showHoverWireframe: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Shadows</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showShadows}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showShadows: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Clouds</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showClouds}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showClouds: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Fog</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showFog}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showFog: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Torches</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showTorches}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showTorches: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">NPCs</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showNPCs}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showNPCs: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Rats</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showRats}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showRats: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">Miasma</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showMiasma}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showMiasma: e.target.checked }))}
                      className="accent-amber-600"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-center mt-10">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-3 rounded-full historical-font tracking-widest text-lg transition-all shadow-[0_0_30px_rgba(217,119,6,0.2)]"
              >
                RETURN TO OBSERVATION
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.5em] text-amber-100/20 pointer-events-none transition-opacity duration-700 ${params.uiMinimized ? 'opacity-100' : 'opacity-0'}`}>
        Click Top Bar to Restore Interface
      </div>

      {devSettings.showPerfPanel && (
        <div className="absolute bottom-6 right-6 z-50 bg-black/70 backdrop-blur-md border border-amber-900/40 rounded-lg p-4 text-amber-100 pointer-events-auto w-56">
          <div className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">Performance</div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-amber-200/70">FPS</span>
            <span className="font-mono text-lg">{fps}</span>
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

      {showPlayerModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-start bg-black/70 backdrop-blur-sm p-6 md:p-10 pointer-events-auto">
          <div className="w-full max-w-3xl h-[85vh] bg-black/75 border border-amber-900/40 rounded-xl shadow-2xl p-6 md:p-10 animate-in slide-in-from-left-8 fade-in overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-4">
              <div>
                <h3 className="historical-font text-amber-400 text-2xl tracking-widest">Player Dossier</h3>
                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/40 mt-1">Detailed Record</div>
              </div>
              <button onClick={() => setShowPlayerModal(false)} className="text-amber-400 hover:text-amber-300">
                <X size={24} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-amber-50/85 text-[12px]">
              <div className="space-y-3">
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Name</span><div className="font-bold">{playerStats.name}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Age</span><div>{playerStats.age} Years</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Class</span><div>{playerStats.socialClass}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Profession</span><div>{playerStats.profession}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Family</span><div>{playerStats.family}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Health History</span><div>{playerStats.healthHistory}</div></div>
              </div>

              <div className="space-y-3">
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Skin</span><div>{playerStats.skinDescription}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Hair</span><div>{playerStats.hairDescription}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Robe</span><div>{playerStats.robeDescription}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Headwear</span><div>{playerStats.headwearDescription}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Footwear</span><div>{playerStats.footwearDescription}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Accessories</span><div>{playerStats.accessories.length ? playerStats.accessories.join(', ') : 'None noted'}</div></div>
                <div><span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Clothing</span><div>{playerStats.clothing.join(', ')}</div></div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-amber-50/85 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">Attributes</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Strength: <span className="font-bold">{playerStats.strength}</span></div>
                  <div>Piety: <span className="font-bold">{playerStats.piety}</span></div>
                  <div>Perceptiveness: <span className="font-bold">{playerStats.perceptiveness}</span></div>
                  <div>Neuroticism: <span className="font-bold">{playerStats.neuroticism}</span></div>
                  <div>Charisma: <span className="font-bold">{playerStats.charisma}</span></div>
                  <div>Humoral Balance: <span className="font-bold">{playerStats.humoralBalance}</span></div>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">Four Humors</div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Blood</span><span className="font-bold">{playerStats.humors.blood}</span></div>
                  <div className="flex justify-between"><span>Phlegm</span><span className="font-bold">{playerStats.humors.phlegm}</span></div>
                  <div className="flex justify-between"><span>Yellow Bile</span><span className="font-bold">{playerStats.humors.yellowBile}</span></div>
                  <div className="flex justify-between"><span>Black Bile</span><span className="font-bold">{playerStats.humors.blackBile}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
