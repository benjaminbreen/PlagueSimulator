
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SimulationParams, SimulationStats, PlayerStats, DevSettings, CameraMode, BuildingMetadata, BuildingType, MiniMapData, getLocationLabel, NPCStats, AgentState, ActionSlotState, ActionId } from '../types';
import { MoraleStats } from './Agents';
import { ActionBar } from './ActionBar';
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
  ArrowUpDown,
  ChevronDown
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
  currentWeather: string;
  pushCharge: number;
  moraleStats: MoraleStats;
  actionSlots: ActionSlotState;
  onTriggerAction: (actionId: ActionId) => void;
  simTime: number;
  showPlayerModal: boolean;
  setShowPlayerModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const WeatherModal: React.FC<{
  timeOfDay: number;
  currentWeather: string;
  onClose: () => void;
}> = ({ timeOfDay, currentWeather, onClose }) => {
  // Calculate temperature based on time of day (Damascus 1348 climate)
  const getTemperature = () => {
    const hour = timeOfDay;
    // Summer temperatures in Damascus (simplified model)
    // Peak heat around 2-3 PM, coolest before dawn
    const baseTemp = 28; // Average
    const variation = 12; // Temperature swing
    const tempCurve = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    return Math.round(baseTemp + tempCurve * variation);
  };

  const temperature = getTemperature();

  const weatherDescriptions = {
    CLEAR: {
      name: 'Clear Skies',
      desc: 'The sun blazes overhead, casting sharp shadows across the dusty streets.',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      humidity: '15-25%',
      visibility: 'Excellent'
    },
    OVERCAST: {
      name: 'Overcast',
      desc: 'Gray clouds blanket the sky, diffusing the harsh sunlight.',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      humidity: '45-60%',
      visibility: 'Moderate'
    },
    SANDSTORM: {
      name: 'Dust Storm',
      desc: 'Choking dust sweeps through the alleys, obscuring the distant hills.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      humidity: '5-10%',
      visibility: 'Poor'
    }
  };

  const weatherInfo = weatherDescriptions[currentWeather as keyof typeof weatherDescriptions] || weatherDescriptions.CLEAR;

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="max-w-md w-full bg-black/80 backdrop-blur-md border border-amber-800/50 rounded-lg shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-900/40">
          <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Weather Report</h4>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-amber-100/50 hover:text-amber-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Weather Status */}
          <div className={`${weatherInfo.bgColor} ${weatherInfo.borderColor} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-2xl font-bold ${weatherInfo.color} uppercase tracking-wide`}>
                {weatherInfo.name}
              </div>
              <div className={`w-3 h-3 rounded-full ${weatherInfo.color.replace('text-', 'bg-')} shadow-lg`}></div>
            </div>
            <p className="text-xs text-amber-100/60 leading-relaxed">
              {weatherInfo.desc}
            </p>
          </div>

          {/* Temperature Display */}
          <div className="bg-black/50 border border-amber-900/40 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1">Temperature</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-bold text-white">{temperature}°</span>
                  <span className="text-sm text-amber-100/40 font-mono">C</span>
                </div>
                <div className="text-[10px] text-amber-100/30 font-mono mt-1">
                  {Math.round(temperature * 9/5 + 32)}°F
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-2">Time</div>
                <div className="text-sm font-mono text-amber-100/80">
                  {Math.floor(timeOfDay)}:{String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Atmospheric Conditions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 border border-amber-900/30 rounded-lg p-3">
              <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1.5">Humidity</div>
              <div className="text-lg font-mono text-white">{weatherInfo.humidity}</div>
            </div>
            <div className="bg-black/30 border border-amber-900/30 rounded-lg p-3">
              <div className="text-[9px] text-amber-500/50 uppercase tracking-widest mb-1.5">Visibility</div>
              <div className="text-lg font-mono text-white">{weatherInfo.visibility}</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-[10px] text-amber-100/30 italic text-center pt-2 border-t border-white/5">
            Damascus, Summer 1348
          </div>
        </div>
      </div>
    </div>
  );
};

const MapModal: React.FC<{
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  // Historical Damascus locations with accurate positioning
  // Each location has a descriptive title and historical name
  const locations = [
    { title: "CENTRAL BAZAAR", name: "Al-Buzuriyah Souq", hoverName: "Spice Market District", x: 0, y: 0, type: "market", desc: "Central bazaar near the Umayyad Mosque", color: "amber" },
    { title: "EASTERN DISTRICT", name: "Bab Sharqi Quarter", hoverName: "Eastern Gate Quarter", x: 1, y: 1, type: "alley", desc: "Eastern gate district with narrow alleys", color: "slate" },
    { title: "HILLSIDE QUARTER", name: "Al-Salihiyya", hoverName: "Mount Qassioun Slopes", x: -2, y: 1, type: "hillside", desc: "Hillside quarter on Mount Qassioun's slopes", color: "green" },
    { title: "WEALTHY QUARTER", name: "Al-Qaymariyya", hoverName: "Merchant District", x: -1, y: 2, type: "wealthy", desc: "Wealthy merchant quarter northwest of center", color: "purple" },
    { title: "SOUTHERN QUARTER", name: "Al-Shaghour", hoverName: "Dense Urban District", x: 0, y: -2, type: "poor", desc: "Dense southern quarter outside old walls", color: "red" },
    { title: "CHRISTIAN QUARTER", name: "Bab Touma", hoverName: "Eastern Christian District", x: 1, y: -1, type: "residential", desc: "Ancient Christian district, eastern old city", color: "blue" },
    { title: "RURAL FARMLANDS", name: "The Ghouta", hoverName: "Irrigated Oasis Lands", x: 2, y: 2, type: "outskirts", desc: "Fertile orchards and farmland irrigated by Barada", color: "lime" },
    { title: "DESERT OUTSKIRTS", name: "Northern Track", hoverName: "Arid Scrublands", x: -3, y: -1, type: "outskirts", desc: "Sparse desert fringe north of the silk market", color: "sand" },
    { title: "SILK MARKET", name: "Khan al-Harir", hoverName: "Silk Caravanserai", x: -2, y: -2, type: "caravanserai", desc: "Silk merchants' caravanserai and lodging", color: "orange" },
    { title: "MAMLUK FORTRESS", name: "The Citadel", hoverName: "Damascus Citadel", x: 2, y: -1, type: "civic", desc: "Military fortress in northwestern old city", color: "red" },
    { title: "MOUNTAIN SHRINE", name: "Mount Qassioun", hoverName: "Sacred Mountain Peak", x: -3, y: 3, type: "landmark", desc: "Sacred mountain overlooking Damascus from northwest", color: "emerald" },
    { title: "SOUTHERN ROAD", name: "Hauran Highway", hoverName: "Southern Trade Route", x: 1, y: -3, type: "landmark", desc: "Trade route to the fertile Hauran plateau", color: "yellow" },
  ];

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-6xl w-full bg-black/80 backdrop-blur-md border border-amber-800/50 rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Map Visualization */}
        <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-amber-900/40">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Damascus Map — 1348</h4>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded transition-colors text-amber-100/50 hover:text-amber-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* SVG Map of Historical Damascus */}
          <div className="bg-black/30 border border-amber-900/30 rounded-lg p-6 relative overflow-hidden">
            <svg viewBox="0 0 500 500" className="w-full h-full">
              {/* Barada River - flows from northwest */}
              <path d="M0,80 Q120,70 250,90 Q380,110 500,100" fill="none" stroke="#4a7c8a" strokeWidth="8" opacity="0.4" />
              <path d="M0,80 Q120,70 250,90 Q380,110 500,100" fill="none" stroke="#6aa4b8" strokeWidth="3" opacity="0.6" />

              {/* City Walls (irregular oval) */}
              <ellipse cx="250" cy="270" rx="160" ry="180" fill="none" stroke="#8b7355" strokeWidth="3" strokeDasharray="8 4" opacity="0.3" />

              {/* Straight Street (Via Recta) - Roman road */}
              <line x1="120" y1="270" x2="380" y2="270" stroke="#6b5a45" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.5" />

              {/* Umayyad Mosque - central landmark */}
              <rect x="220" y="200" width="60" height="50" fill="#8a7355" stroke="#d4af37" strokeWidth="1.5" opacity="0.6" />
              <circle cx="250" cy="225" r="8" fill="#d4af37" opacity="0.7" />
              <text x="250" y="263" textAnchor="middle" className="text-[8px] fill-amber-300/50 font-bold">UMAYYAD</text>

              {/* Mount Qassioun - northwest, prominent landmark */}
              <path d="M10,140 L50,80 L90,140 Z" fill="#3a4a3a" opacity="0.4" />
              <path d="M25,125 L50,95 L75,125 Z" fill="#4a5a4a" opacity="0.5" />
              <circle cx="50" cy="105" r="3" fill="#6a8a6a" opacity="0.6" />
              <text x="50" y="158" textAnchor="middle" className="text-[8px] fill-emerald-300/50 font-semibold">Mt. Qassioun</text>

              {/* Ghouta farmlands - indicated by scattered vegetation */}
              <circle cx="420" cy="350" r="4" fill="#7a9a5a" opacity="0.3" />
              <circle cx="440" cy="330" r="3" fill="#7a9a5a" opacity="0.25" />
              <circle cx="460" cy="360" r="5" fill="#7a9a5a" opacity="0.35" />
              <text x="440" y="390" textAnchor="middle" className="text-[7px] fill-lime-300/40 italic">Ghouta</text>

              {/* Desert outskirts - faint dunes */}
              <path d="M20,350 Q40,330 60,350" fill="none" stroke="#bca27a" strokeWidth="4" opacity="0.25" />
              <path d="M30,370 Q55,345 80,370" fill="none" stroke="#c7ad85" strokeWidth="3" opacity="0.2" />
              <text x="55" y="390" textAnchor="middle" className="text-[7px] fill-amber-300/35 italic">Desert</text>

              {/* Location Markers */}
              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                const svgX = 250 + loc.x * 70;
                const svgY = 270 - loc.y * 65;

                const colorMap = {
                  amber: { bg: 'fill-amber-500', ring: 'stroke-amber-400', text: 'fill-amber-300', glow: 'rgba(251, 191, 36, 0.4)' },
                  slate: { bg: 'fill-slate-500', ring: 'stroke-slate-400', text: 'fill-slate-300', glow: 'rgba(148, 163, 184, 0.4)' },
                  green: { bg: 'fill-green-500', ring: 'stroke-green-400', text: 'fill-green-300', glow: 'rgba(34, 197, 94, 0.4)' },
                  purple: { bg: 'fill-purple-500', ring: 'stroke-purple-400', text: 'fill-purple-300', glow: 'rgba(168, 85, 247, 0.4)' },
                  red: { bg: 'fill-red-500', ring: 'stroke-red-400', text: 'fill-red-300', glow: 'rgba(239, 68, 68, 0.4)' },
                  blue: { bg: 'fill-blue-500', ring: 'stroke-blue-400', text: 'fill-blue-300', glow: 'rgba(59, 130, 246, 0.4)' },
                  lime: { bg: 'fill-lime-500', ring: 'stroke-lime-400', text: 'fill-lime-300', glow: 'rgba(132, 204, 22, 0.4)' },
                  sand: { bg: 'fill-amber-400', ring: 'stroke-amber-300', text: 'fill-amber-200', glow: 'rgba(245, 158, 11, 0.35)' },
                  orange: { bg: 'fill-orange-500', ring: 'stroke-orange-400', text: 'fill-orange-300', glow: 'rgba(249, 115, 22, 0.4)' },
                  emerald: { bg: 'fill-emerald-500', ring: 'stroke-emerald-400', text: 'fill-emerald-300', glow: 'rgba(16, 185, 129, 0.4)' },
                  yellow: { bg: 'fill-yellow-500', ring: 'stroke-yellow-400', text: 'fill-yellow-300', glow: 'rgba(234, 179, 8, 0.4)' },
                };

                const colors = colorMap[loc.color as keyof typeof colorMap];

                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    {/* Glassomorphic glow on hover */}
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="18"
                      fill={colors.glow}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(8px)' }}
                    />
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="14"
                      fill={colors.glow}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(4px)' }}
                    />

                    {/* Current location indicator - expanding pulse */}
                    {isCurrent && (
                      <>
                        <circle cx={svgX} cy={svgY} r="16" className={colors.ring} strokeWidth="2" fill="none" opacity="0.3">
                          <animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={svgX} cy={svgY} r="12" className={colors.ring} strokeWidth="2" fill="none" opacity="0.6" />
                      </>
                    )}

                    {/* Main location marker */}
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={isCurrent ? "7" : "5"}
                      className={`${colors.bg} transition-all duration-200`}
                      opacity={isCurrent ? "1" : "0.8"}
                    />
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="9"
                      className={`${colors.ring} transition-all duration-200 group-hover/node:opacity-70`}
                      strokeWidth="1.5"
                      fill="none"
                      opacity={isCurrent ? "0.5" : "0.3"}
                    />

                    {/* Labels - always show title, detailed info on hover */}
                    <g className="pointer-events-none">
                      {/* Default label - always visible */}
                      <text
                        x={svgX}
                        y={svgY - 16}
                        textAnchor="middle"
                        className={`text-[8px] ${colors.text} font-bold transition-opacity group-hover/node:opacity-0`}
                        opacity="0.7"
                      >
                        {loc.title}
                      </text>

                      {/* Hover label - detailed two-line */}
                      <g className="opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <text
                          x={svgX}
                          y={svgY - 24}
                          textAnchor="middle"
                          className={`text-[9px] ${colors.text} font-bold`}
                        >
                          {loc.title}
                        </text>
                        <text
                          x={svgX}
                          y={svgY - 14}
                          textAnchor="middle"
                          className={`text-[8px] ${colors.text} italic`}
                          opacity="0.8"
                        >
                          {loc.hoverName}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Location List */}
        <div className="w-full md:w-96 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="pb-3 border-b border-amber-900/40">
            <h3 className="text-lg font-bold text-amber-100 uppercase tracking-wider">Fast Travel</h3>
            <p className="text-[10px] text-amber-100/40 mt-1">Select a district to visit</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  disabled={isCurrent}
                  className={`w-full text-left p-3 rounded-lg border transition-all group ${
                    isCurrent
                      ? 'bg-amber-900/40 border-amber-700/60 cursor-default'
                      : 'bg-black/30 border-amber-900/30 hover:bg-amber-900/20 hover:border-amber-700/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="font-bold text-[11px] text-amber-100/90 uppercase tracking-widest leading-tight">
                        {loc.title}
                      </div>
                      <div className="text-sm text-amber-200/70 font-serif italic mt-0.5">
                        {loc.name}
                      </div>
                    </div>
                    {isCurrent && (
                      <MapPin size={14} className="text-amber-500" />
                    )}
                  </div>
                  <p className="text-[11px] leading-snug text-amber-100/50">
                    {loc.desc}
                  </p>
                  {!isCurrent && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 uppercase tracking-widest">
                      <Navigation size={12} /> Travel Here
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[9px] text-amber-100/30 text-center italic border-t border-white/5 pt-3">
            Damascus, Pearl of the East
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
    data.district === 'OUTSKIRTS_FARMLAND' ? 'Ghouta Farmlands' :
    data.district === 'OUTSKIRTS_DESERT' ? 'Desert Outskirts' :
    data.district === 'CARAVANSERAI' ? 'Caravanserai' :
    data.district === 'SOUTHERN_ROAD' ? 'Southern Road' :
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

export const UI: React.FC<UIProps> = ({ params, setParams, stats, playerStats, devSettings, setDevSettings, nearBuilding, onFastTravel, selectedNpc, minimapData, sceneMode, pickupPrompt, pickupToast, currentWeather, pushCharge, moraleStats, actionSlots, onTriggerAction, simTime, showPlayerModal, setShowPlayerModal }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [reportTab, setReportTab] = useState<'epidemic' | 'player'>('epidemic');
  const [settingsTab, setSettingsTab] = useState<'about' | 'dev'>('about');
  const [showPerspective, setShowPerspective] = useState(true);
  const [fps, setFps] = useState(0);
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'rarity' | 'quantity'>('name');
  const [tabPulse, setTabPulse] = useState<'epidemic' | 'player' | null>(null);
  const [reportsPanelCollapsed, setReportsPanelCollapsed] = useState(false);
  const [alchemistTableCollapsed, setAlchemistTableCollapsed] = useState(true);

  useEffect(() => {
    if (!tabPulse) return;
    const timer = window.setTimeout(() => setTabPulse(null), 260);
    return () => window.clearTimeout(timer);
  }, [tabPulse]);
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
          <div
            className="flex items-center gap-2 text-amber-100/90 cursor-pointer hover:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors"
            onClick={() => setShowWeather(true)}
            title="View Weather Report"
          >
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
        
        {/* Reports Panel */}
        <div className="self-end md:self-start mt-12 md:mt-0 w-full md:w-[420px]">
          <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg border border-amber-800/50 shadow-lg pointer-events-auto">
            <div
              className={`flex items-center justify-between ${reportsPanelCollapsed ? '' : 'mb-3 border-b border-amber-900/40 pb-2'} cursor-pointer select-none group`}
              onClick={() => setReportsPanelCollapsed(!reportsPanelCollapsed)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  size={14}
                  className={`text-amber-500/60 transition-transform duration-300 ${reportsPanelCollapsed ? '-rotate-90' : ''}`}
                />
                <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold group-hover:text-amber-500/80 transition-colors">Reports Panel</h4>
              </div>
              <div className="flex gap-1 bg-amber-950/40 p-1 rounded-full border border-amber-900/40" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setReportTab('epidemic');
                    setTabPulse('epidemic');
                  }}
                  className={`relative px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all overflow-hidden ${
                    reportTab === 'epidemic' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  <span className={`absolute inset-0 rounded-full bg-amber-300/30 blur-[2px] transition-all duration-300 ${tabPulse === 'epidemic' ? 'opacity-100 scale-110' : 'opacity-0 scale-95'}`} />
                  Epidemic
                </button>
                <button
                  onClick={() => {
                    setReportTab('player');
                    setTabPulse('player');
                  }}
                  className={`relative px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all overflow-hidden ${
                    reportTab === 'player' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  <span className={`absolute inset-0 rounded-full bg-amber-300/30 blur-[2px] transition-all duration-300 ${tabPulse === 'player' ? 'opacity-100 scale-110' : 'opacity-0 scale-95'}`} />
                  Player
                </button>
              </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-out ${reportsPanelCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
            {reportTab === 'epidemic' ? (
              <div className="space-y-4">
                <div>
                  <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-3 font-bold">Epidemic Report</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                      <span className="font-mono text-lg">{stats.healthy}</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Healthy</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-300">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <span className="font-mono text-lg">{stats.incubating}</span>
                      <span className="text-[10px] uppercase tracking-wider text-yellow-300/70">Incubating</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                      <span className="font-mono text-lg">{stats.infected}</span>
                      <span className="text-[10px] uppercase tracking-wider text-red-400/70">Infected</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                      <span className="font-mono text-lg">{stats.deceased}</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-600">Deceased</span>
                    </div>
                  </div>
                </div>

                {/* Civic Morale Section */}
                <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Civic Morale</span>
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${
                      moraleStats.avgPanic < 16 ? 'text-emerald-400' :
                      moraleStats.avgPanic < 36 ? 'text-yellow-400' :
                      moraleStats.avgPanic < 56 ? 'text-orange-400' :
                      moraleStats.avgPanic < 76 ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {moraleStats.avgPanic < 16 ? 'Calm' :
                       moraleStats.avgPanic < 36 ? 'Uneasy' :
                       moraleStats.avgPanic < 56 ? 'Anxious' :
                       moraleStats.avgPanic < 76 ? 'Fearful' : 'Panicked'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="font-bold">Plague Awareness</span>
                        <span className="font-mono">{Math.round(moraleStats.avgAwareness)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-600 to-amber-400"
                          style={{ width: `${Math.min(100, moraleStats.avgAwareness)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="font-bold">Public Panic</span>
                        <span className="font-mono">{Math.round(moraleStats.avgPanic)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            moraleStats.avgPanic < 36 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                            moraleStats.avgPanic < 56 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            moraleStats.avgPanic < 76 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                            'bg-gradient-to-r from-red-700 to-red-500'
                          }`}
                          style={{ width: `${Math.min(100, moraleStats.avgPanic)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[9px] text-amber-100/40 italic mt-2">
                      {moraleStats.avgPanic < 16 ? '"The streets feel peaceful today."' :
                       moraleStats.avgPanic < 36 ? '"Whispers of sickness in the souq..."' :
                       moraleStats.avgPanic < 56 ? '"People hurry past, avoiding eye contact."' :
                       moraleStats.avgPanic < 76 ? '"Fear spreads faster than the plague itself."' :
                       '"The city trembles on the edge of chaos."'}
                    </div>
                  </div>
                </div>

                {/* Alchemist's Table - Collapsible */}
                <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none group"
                    onClick={() => setAlchemistTableCollapsed(!alchemistTableCollapsed)}
                  >
                    <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Alchemist's Table</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-amber-100/30 italic group-hover:text-amber-100/50 transition-colors">
                        {alchemistTableCollapsed ? 'Click to expand' : 'Click to collapse'}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-amber-500/50 transition-transform duration-300 ${alchemistTableCollapsed ? '-rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  <div className={`overflow-hidden transition-all duration-300 ease-out ${alchemistTableCollapsed ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100 mt-3 pt-3 border-t border-white/10'}`}>
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
                          onClick={(e) => { e.stopPropagation(); handleChange('quarantine', !params.quarantine); }}
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
                  <div className="text-[10px] text-amber-100/70 mt-1">
                    {selectedNpc.stats.gender}, {selectedNpc.stats.age} years · {selectedNpc.stats.socialClass}
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
                  <label className="flex items-center justify-between">
                    <span className="text-amber-300/80">City walls</span>
                    <input
                      type="checkbox"
                      checked={devSettings.showCityWalls}
                      onChange={(e) => setDevSettings(prev => ({ ...prev, showCityWalls: e.target.checked }))}
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
        <div className="absolute inset-0 z-[70] flex items-center justify-start p-6 md:p-10 pointer-events-auto">
          {/* Selective blur backdrop - blurs everything except spotlight around player */}
          <div
            className="absolute inset-0 backdrop-blur-md -z-10"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)',
              maskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)'
            }}
          />
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0 bg-black/60 -z-20"
          />
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

      {/* Action Bar - only show in outdoor mode */}
      {sceneMode === 'outdoor' && (
        <ActionBar
          actionSlots={actionSlots}
          onTriggerAction={onTriggerAction}
          simTime={simTime}
          playerStats={playerStats}
        />
      )}
    </div>
  );
};
