import React, { useEffect, useMemo } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { getLocationLabel, getDistrictType, DistrictType } from '../types';

interface MapModalProps {
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  const locations = useMemo(() => [
    { title: "CENTRAL BAZAAR", name: "Al-Buzuriyah Souq", hoverName: "City Center", x: 0, y: 0, type: "market", desc: "Central bazaar south of the Great Mosque", color: "amber", importance: 3 },
    { title: "GREAT MOSQUE", name: "Umayyad Mosque", hoverName: "Religious Center", x: 0, y: 2, type: "mosque", desc: "The Great Mosque of Damascus, heart of the city", color: "emerald", importance: 5 },
    { title: "SOUQ AXIS", name: "Market Corridor", hoverName: "North-South Souq", x: 0, y: 1, type: "market", desc: "Main souq corridor linking market to the mosque", color: "yellow", importance: 2 },
    { title: "JEWISH QUARTER", name: "Al-Yahud", hoverName: "South-Central", x: 0, y: -1, type: "jewish", desc: "Jewish quarter with synagogues and kosher markets", color: "indigo", importance: 2 },
    { title: "AL-MIDAN GATE", name: "Midan", hoverName: "Southern Gate", x: 1, y: -1, type: "road", desc: "Southern gate route with stables and caravans", color: "orange", importance: 2 },
    { title: "CHRISTIAN QUARTER", name: "Bab Touma", hoverName: "Eastern District", x: 2, y: 0, type: "residential", desc: "Christian district at eastern end of Via Recta", color: "blue", importance: 2 },
    { title: "STRAIGHT STREET", name: "Via Recta", hoverName: "Main Artery", x: 1, y: 0, type: "road", desc: "Roman straight street lined with colonnades", color: "yellow", importance: 3 },
    { title: "BAB SHARQI", name: "Bab Sharqi", hoverName: "Eastern Gate", x: 2, y: 1, type: "gate", desc: "Eastern gate and entry road into the city", color: "slate", importance: 1 },
    { title: "HILLSIDE QUARTER", name: "Al-Salihiyya", hoverName: "Mountain Slopes", x: -1, y: 2, type: "hillside", desc: "Hillside quarter on Mount Qassioun's slopes", color: "green", importance: 1 },
    { title: "WEALTHY QUARTER", name: "Al-Qaymariyya", hoverName: "Northwest", x: -1, y: 1, type: "wealthy", desc: "Wealthy merchant quarter northwest of center", color: "purple", importance: 2 },
    { title: "SOUTHERN QUARTER", name: "Al-Shaghour", hoverName: "Far South", x: 0, y: -2, type: "poor", desc: "Dense southern quarter outside old walls", color: "red", importance: 1 },
    { title: "RURAL FARMLANDS", name: "The Ghouta", hoverName: "Irrigated Oasis", x: 1, y: 3, type: "outskirts", desc: "Fertile orchards and farmland irrigated by Barada", color: "lime", importance: 1 },
    { title: "DESERT OUTSKIRTS", name: "Eastern Badlands", hoverName: "Desert Edge", x: 3, y: 0, type: "outskirts", desc: "Arid desert fringe to the east", color: "sand", importance: 1 },
    { title: "SILK MARKET", name: "Khan al-Harir", hoverName: "Caravanserai", x: -2, y: 0, type: "caravanserai", desc: "Silk merchants' caravanserai and lodging", color: "orange", importance: 2 },
    { title: "MAMLUK FORTRESS", name: "The Citadel", hoverName: "Fortress", x: -1, y: 0, type: "civic", desc: "Military fortress in northwestern corner of old city", color: "red", importance: 3 },
    { title: "MOUNTAIN SHRINE", name: "Mount Qassioun", hoverName: "Sacred Peak", x: -2, y: 2, type: "landmark", desc: "Sacred mountain overlooking Damascus from northwest", color: "emerald", importance: 2 },
    { title: "SOUTHERN ROAD", name: "Hauran Highway", hoverName: "Trade Route", x: 1, y: -2, type: "landmark", desc: "Trade route to the fertile Hauran plateau", color: "yellow", importance: 1 },
  ], []);

  // Generate generic grid tiles (procedural locations)
  const genericTiles = useMemo(() => {
    const tiles: Array<{ x: number; y: number; label: string; districtType: DistrictType }> = [];
    const majorCoords = new Set(locations.map(loc => `${loc.x},${loc.y}`));

    // Generate a grid of tiles within radius 3
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        const key = `${x},${y}`;
        if (!majorCoords.has(key)) {
          const label = getLocationLabel(x, y);
          const districtType = getDistrictType(x, y);
          tiles.push({ x, y, label, districtType });
        }
      }
    }

    return tiles;
  }, [locations]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-w-6xl w-full bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        style={{
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 1px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-amber-500/10 max-h-[45vh] md:max-h-none overflow-hidden bg-gradient-to-br from-slate-900/50 to-transparent">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xs text-amber-400/80 uppercase tracking-[0.25em] font-semibold mb-1">Damascus — 1348 CE</h4>
              <div className="h-px w-32 bg-gradient-to-r from-amber-500/50 to-transparent"></div>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-amber-100/50 hover:text-amber-100 hover:border-amber-500/30"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-gradient-to-br from-black/40 to-slate-900/40 backdrop-blur-sm border border-amber-500/10 rounded-xl p-8 relative overflow-hidden shadow-inner">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(245 158 11) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>

            {/* Radial gradient from center */}
            <div className="absolute inset-0 bg-radial-gradient opacity-20" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 60%)'
            }}></div>

            <svg viewBox="0 0 500 500" className="w-full h-full relative z-10">
              <defs>
                {/* Glowing effect for river */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Gradient for river */}
                <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4a7c8a" stopOpacity="0.6"/>
                  <stop offset="50%" stopColor="#6aa4b8" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#4a7c8a" stopOpacity="0.6"/>
                </linearGradient>
              </defs>

              {/* Barada River - sleek and glowing */}
              <path d="M0,75 Q120,70 250,90 Q380,108 500,105"
                fill="none" stroke="url(#riverGradient)" strokeWidth="10" opacity="0.6" strokeLinecap="round"
                filter="url(#glow)" />
              <path d="M0,75 Q120,70 250,90 Q380,108 500,105"
                fill="none" stroke="#a0d4e8" strokeWidth="2" opacity="0.4" strokeLinecap="round" />

              {/* City Walls - refined */}
              <ellipse cx="250" cy="250" rx="210" ry="190"
                fill="none" stroke="#64748b" strokeWidth="2" opacity="0.2" strokeDasharray="12 6" />
              <ellipse cx="250" cy="250" rx="210" ry="190"
                fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.3" />

              {/* Via Recta - main road */}
              <line x1="80" y1="250" x2="420" y2="250"
                stroke="#94a3b8" strokeWidth="2" opacity="0.2" strokeDasharray="8 4" />

              {/* Connection lines between related districts (subtle) */}
              <line x1="250" y1="250" x2="250" y2="160" stroke="#fbbf24" strokeWidth="1" opacity="0.1" />
              <line x1="250" y1="250" x2="300" y2="250" stroke="#fbbf24" strokeWidth="1" opacity="0.1" />

              {/* Great Mosque - prominent landmark */}
              <g transform="translate(250, 140)">
                <circle cx="0" cy="25" r="40" fill="#10b981" opacity="0.05" filter="url(#glow)" />
                <rect x="-25" y="10" width="50" height="40" fill="#064e3b" opacity="0.3" rx="2" />
                <rect x="-22" y="13" width="44" height="34" fill="#065f46" opacity="0.4" rx="1" />
                <ellipse cx="0" cy="15" rx="20" ry="12" fill="#10b981" opacity="0.5" />
                <ellipse cx="0" cy="15" rx="16" ry="10" fill="#34d399" opacity="0.4" />
                <circle cx="0" cy="12" r="6" fill="#fbbf24" opacity="0.7" />
                <rect x="18" y="-5" width="5" height="20" fill="#065f46" opacity="0.6" />
                <circle cx="20.5" cy="-7" r="3.5" fill="#fbbf24" opacity="0.6" />
              </g>

              {/* Mount Qassioun - stylized mountain */}
              <g transform="translate(50, 100)">
                <path d="M-25,55 L0,-5 L25,55 Z" fill="#1e293b" opacity="0.3" />
                <path d="M-18,50 L0,5 L18,50 Z" fill="#334155" opacity="0.4" />
                <path d="M-12,45 L0,12 L12,45 Z" fill="#475569" opacity="0.5" />
                <circle cx="0" cy="18" r="3" fill="#10b981" opacity="0.6" />
                <text x="0" y="75" textAnchor="middle" className="text-[7px] fill-slate-400 font-medium tracking-wide" opacity="0.7">
                  MT. QASSIOUN
                </text>
              </g>

              {/* Ghouta orchards - modern dots */}
              <g opacity="0.4">
                <circle cx="420" cy="350" r="4" fill="#84cc16" opacity="0.6" />
                <circle cx="445" cy="330" r="3" fill="#a3e635" opacity="0.5" />
                <circle cx="470" cy="360" r="5" fill="#65a30d" opacity="0.7" />
                <circle cx="435" cy="370" r="3" fill="#84cc16" opacity="0.5" />
                <text x="445" y="390" textAnchor="middle" className="text-[7px] fill-lime-400/60 font-light italic tracking-wide">
                  Ghouta Oasis
                </text>
              </g>

              {/* Desert - minimalist */}
              <g opacity="0.25">
                <circle cx="40" cy="360" r="3" fill="#d97706" opacity="0.3" />
                <circle cx="60" cy="350" r="4" fill="#f59e0b" opacity="0.4" />
                <circle cx="50" cy="375" r="2" fill="#d97706" opacity="0.3" />
                <text x="50" y="395" textAnchor="middle" className="text-[7px] fill-amber-400/50 font-light italic tracking-wide">
                  Syrian Desert
                </text>
              </g>

              {/* Generic grid tiles - procedural locations */}
              {genericTiles.map((tile) => {
                const isCurrent = tile.x === currentX && tile.y === currentY;
                const svgX = 250 + tile.x * 50;
                const svgY = 250 - tile.y * 45;

                // Muted colors for generic districts by type
                const districtColorMap: Record<DistrictType, { fill: string; stroke: string; text: string }> = {
                  MARKET: { fill: '#b8985c', stroke: '#d4b88a', text: '#d4b88a' },
                  RESIDENTIAL: { fill: '#6b7280', stroke: '#9ca3af', text: '#9ca3af' },
                  ROADSIDE: { fill: '#8b7a5a', stroke: '#a89978', text: '#a89978' },
                  ALLEYS: { fill: '#5a6370', stroke: '#7b8794', text: '#7b8794' },
                  WEALTHY: { fill: '#8b7ba5', stroke: '#a89bc4', text: '#a89bc4' },
                  HOVELS: { fill: '#8b6a5a', stroke: '#a8856f', text: '#a8856f' },
                  CIVIC: { fill: '#6a7a9a', stroke: '#8898b8', text: '#8898b8' },
                  JEWISH_QUARTER: { fill: '#6a6ab5', stroke: '#8888c8', text: '#8888c8' },
                  CHRISTIAN_QUARTER: { fill: '#6a8ab5', stroke: '#88a8c8', text: '#88a8c8' },
                  UMAYYAD_MOSQUE: { fill: '#5a9a7a', stroke: '#78b898', text: '#78b898' },
                  SALHIYYA: { fill: '#6a8a5a', stroke: '#88a878', text: '#88a878' },
                  CARAVANSERAI: { fill: '#b87a4a', stroke: '#d49868', text: '#d49868' },
                  MOUNTAIN_SHRINE: { fill: '#5a8a6a', stroke: '#78a888', text: '#78a888' },
                  SOUTHERN_ROAD: { fill: '#9a8a5a', stroke: '#b8a878', text: '#b8a878' },
                  STRAIGHT_STREET: { fill: '#9a9a6a', stroke: '#b8b888', text: '#b8b888' },
                  SOUQ_AXIS: { fill: '#b89a5a', stroke: '#d6b878', text: '#d6b878' },
                  MIDAN: { fill: '#b88a5a', stroke: '#d6a878', text: '#d6a878' },
                  BAB_SHARQI: { fill: '#7a8a9a', stroke: '#98a8b8', text: '#98a8b8' },
                  OUTSKIRTS_FARMLAND: { fill: '#6a9a5a', stroke: '#88b878', text: '#88b878' },
                  OUTSKIRTS_DESERT: { fill: '#c8906a', stroke: '#e6ae88', text: '#e6ae88' },
                  OUTSKIRTS_SCRUBLAND: { fill: '#7a8a5a', stroke: '#98a878', text: '#98a878' },
                };

                const colors = districtColorMap[tile.districtType] || { fill: '#64748b', stroke: '#94a3b8', text: '#94a3b8' };

                return (
                  <g key={`generic-${tile.x}-${tile.y}`} className="cursor-pointer group/tile" onClick={() => onSelectLocation(tile.x, tile.y)}>
                    {/* Current location indicator for generic tiles */}
                    {isCurrent && (
                      <circle cx={svgX} cy={svgY} r="12" stroke={colors.stroke} strokeWidth="1.5" fill="none" opacity="0.3">
                        <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Generic dot - smaller with district-specific color */}
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={isCurrent ? 4 : 3}
                      fill={colors.fill}
                      opacity={isCurrent ? 0.7 : 0.45}
                      className="transition-all duration-200"
                    />
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={isCurrent ? 6 : 5}
                      stroke={colors.stroke}
                      strokeWidth="0.5"
                      fill="none"
                      opacity={isCurrent ? 0.5 : 0.25}
                      className="transition-all duration-200 group-hover/tile:opacity-65"
                    />

                    {/* Label - show on hover or if current */}
                    <text
                      x={svgX}
                      y={svgY - 8}
                      textAnchor="middle"
                      className={`text-[6px] font-medium tracking-wide pointer-events-none transition-opacity duration-200 ${isCurrent ? 'opacity-80' : 'opacity-0 group-hover/tile:opacity-70'}`}
                      fill={colors.text}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                    >
                      {tile.label}
                    </text>
                  </g>
                );
              })}

              {/* District markers with smart label positioning */}
              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                const svgX = 250 + loc.x * 50;
                const svgY = 250 - loc.y * 45;

                // Smart label positioning - push labels away from center
                const angle = Math.atan2(svgY - 250, svgX - 250);
                const isNearCenter = Math.abs(loc.x) <= 1 && Math.abs(loc.y) <= 1;
                const labelDistance = isNearCenter ? 45 : 28;
                const labelX = svgX + Math.cos(angle) * labelDistance;
                const labelY = svgY + Math.sin(angle) * labelDistance;

                // Size based on importance
                const baseRadius = loc.importance >= 3 ? 7 : 5;

                const colorMap: Record<string, { bg: string; ring: string; glow: string; text: string }> = {
                  amber: { bg: '#f59e0b', ring: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)', text: '#fef3c7' },
                  emerald: { bg: '#10b981', ring: '#34d399', glow: 'rgba(16, 185, 129, 0.6)', text: '#d1fae5' },
                  yellow: { bg: '#eab308', ring: '#facc15', glow: 'rgba(234, 179, 8, 0.6)', text: '#fef9c3' },
                  indigo: { bg: '#6366f1', ring: '#818cf8', glow: 'rgba(99, 102, 241, 0.6)', text: '#e0e7ff' },
                  orange: { bg: '#f97316', ring: '#fb923c', glow: 'rgba(249, 115, 22, 0.6)', text: '#fed7aa' },
                  blue: { bg: '#3b82f6', ring: '#60a5fa', glow: 'rgba(59, 130, 246, 0.6)', text: '#dbeafe' },
                  red: { bg: '#ef4444', ring: '#f87171', glow: 'rgba(239, 68, 68, 0.6)', text: '#fee2e2' },
                  purple: { bg: '#a855f7', ring: '#c084fc', glow: 'rgba(168, 85, 247, 0.6)', text: '#f3e8ff' },
                  green: { bg: '#22c55e', ring: '#4ade80', glow: 'rgba(34, 197, 94, 0.6)', text: '#dcfce7' },
                  lime: { bg: '#84cc16', ring: '#a3e635', glow: 'rgba(132, 204, 22, 0.6)', text: '#ecfccb' },
                  sand: { bg: '#f59e0b', ring: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)', text: '#fef3c7' },
                  slate: { bg: '#64748b', ring: '#94a3b8', glow: 'rgba(148, 163, 184, 0.5)', text: '#e2e8f0' },
                };

                const colors = colorMap[loc.color] || colorMap.amber;

                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    {/* Hover glow effect */}
                    <circle
                      cx={svgX} cy={svgY} r="24" fill={colors.glow}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(12px)' }}
                    />

                    {/* Current location indicator */}
                    {isCurrent && (
                      <>
                        <circle cx={svgX} cy={svgY} r="20" stroke={colors.ring} strokeWidth="2" fill="none" opacity="0.2">
                          <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={svgX} cy={svgY} r="14" stroke={colors.ring} strokeWidth="1.5" fill="none" opacity="0.4" />
                      </>
                    )}

                    {/* Main dot */}
                    <circle
                      cx={svgX} cy={svgY}
                      r={isCurrent ? baseRadius + 2 : baseRadius}
                      fill={colors.bg}
                      className="transition-all duration-200 drop-shadow-lg"
                      opacity={isCurrent ? 1 : 0.85}
                    />

                    {/* Outer ring */}
                    <circle
                      cx={svgX} cy={svgY}
                      r={isCurrent ? baseRadius + 5 : baseRadius + 3}
                      stroke={colors.ring}
                      strokeWidth="1"
                      fill="none"
                      className="transition-all duration-200 group-hover/node:opacity-80"
                      opacity={isCurrent ? 0.5 : 0.25}
                    />

                    {/* Labels - only show on hover or if current */}
                    <g className={`pointer-events-none transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100'}`}>
                      <text
                        x={labelX} y={labelY}
                        textAnchor="middle"
                        className="text-[7px] font-semibold tracking-wide"
                        fill={colors.text}
                        opacity="0.95"
                        style={{
                          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.9))'
                        }}
                      >
                        {loc.title}
                      </text>
                      <text
                        x={labelX} y={labelY + 10}
                        textAnchor="middle"
                        className="text-[6px] font-light italic tracking-wide"
                        fill={colors.text}
                        opacity="0.8"
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}
                      >
                        {loc.hoverName}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="w-full md:w-80 p-6 flex flex-col gap-4 overflow-hidden min-h-0 bg-gradient-to-br from-slate-950/80 to-slate-900/60 backdrop-blur-sm">
          <div className="pb-4 border-b border-amber-500/10">
            <h3 className="text-lg font-bold text-amber-100 uppercase tracking-[0.15em] mb-1">Fast Travel</h3>
            <p className="text-[11px] text-slate-400 tracking-wide">Select a district to visit</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 custom-scrollbar">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  disabled={isCurrent}
                  className={`w-full text-left p-2 rounded-xl border transition-all group ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/30 cursor-default'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-amber-500/30 hover:shadow-[0_0_25px_rgba(245,158,11,0.1)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="font-bold text-[11px] text-amber-100/90 uppercase tracking-[0.15em] leading-tight mb-0.5">
                        {loc.title}
                      </div>
                      <div className="text-sm text-slate-300 italic font-light tracking-wide">
                        {loc.name}
                      </div>
                    </div>
                    {isCurrent && <MapPin size={14} className="text-amber-400" />}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400/80">{loc.desc}</p>
                  {!isCurrent && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 uppercase tracking-[0.2em]">
                      <Navigation size={11} /> Travel Here
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-500 text-center font-light tracking-wider border-t border-white/5 pt-4">
            Damascus, Pearl of the East
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.5);
        }
      `}</style>
    </div>
  );
};
