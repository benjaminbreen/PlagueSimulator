import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { buildOverworldGrid, BIOME_COLORS, OverworldBiome } from '../utils/overworld';

interface MapModalProps {
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  // Major/unique districts with special flagging
  const majorDistricts = useMemo(() => [
    { x: 0, y: 0, name: "Al-Buzuriyah Souq", desc: "Central bazaar", icon: "🏛️" },
    { x: 0, y: 2, name: "Umayyad Mosque", desc: "Great Mosque", icon: "🕌" },
    { x: 0, y: 1, name: "Market Corridor", desc: "North-South Souq", icon: "🏪" },
    { x: 0, y: -1, name: "Al-Yahud", desc: "Jewish quarter", icon: "✡️" },
    { x: 1, y: -1, name: "Midan Gate", desc: "Southern gate", icon: "🏇" },
    { x: 2, y: 0, name: "Bab Touma", desc: "Christian quarter", icon: "✝️" },
    { x: 1, y: 0, name: "Via Recta", desc: "Straight Street", icon: "🛤️" },
    { x: 2, y: 1, name: "Bab Sharqi", desc: "Eastern gate", icon: "🚪" },
    { x: -1, y: 2, name: "Al-Salihiyya", desc: "Hillside quarter", icon: "⛰️" },
    { x: -1, y: 1, name: "Al-Qaymariyya", desc: "Wealthy quarter", icon: "💎" },
    { x: 0, y: -2, name: "Al-Shaghour", desc: "Southern quarter", icon: "🏘️" },
    { x: 1, y: 3, name: "The Ghouta", desc: "Farmlands", icon: "🌾" },
    { x: 3, y: 0, name: "Eastern Badlands", desc: "Desert edge", icon: "🏜️" },
    { x: -2, y: 0, name: "Khan al-Harir", desc: "Silk market", icon: "🧵" },
    { x: -1, y: 0, name: "The Citadel", desc: "Mamluk fortress", icon: "🏰" },
    { x: -2, y: 2, name: "Mount Qassioun", desc: "Sacred mountain", icon: "🏔️" },
    { x: 1, y: -2, name: "Hauran Highway", desc: "Trade route", icon: "🛣️" },
  ], []);

  // Build the full overworld grid
  const grid = useMemo(() => {
    const radius = 5; // Show larger area than minimap
    const allTiles = buildOverworldGrid(currentX, currentY, radius);

    const tiles = allTiles.map(tileData => {
      const major = majorDistricts.find(d => d.x === tileData.mapX && d.y === tileData.mapY);

      return {
        x: tileData.mapX,
        y: tileData.mapY,
        biome: tileData.biome,
        isMajor: tileData.isMajor || !!major,
        name: major?.name,
        desc: major?.desc,
        icon: major?.icon
      };
    });

    return tiles;
  }, [currentX, currentY, majorDistricts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const tileSize = 32;
  const gridRadius = 5;
  const gridWidth = (gridRadius * 2 + 1) * tileSize;
  const gridHeight = (gridRadius * 2 + 1) * tileSize;

  // Calculate grid bounds for coordinate mapping
  const minX = currentX - gridRadius;
  const minY = currentY - gridRadius;

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
        <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-amber-500/10 max-h-[45vh] md:max-h-none overflow-hidden bg-gradient-to-br from-slate-900/50 to-transparent">
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

            <div className="flex items-center justify-center">
              <svg
                viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                className="w-full h-full max-w-[500px] max-h-[500px]"
                style={{ imageRendering: 'crisp-edges' }}
              >
                <defs>
                  {/* Glow filter for major districts */}
                  <filter id="majorGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Render all tiles */}
                {grid.map(tile => {
                  const svgX = (tile.x - minX) * tileSize;
                  const svgY = (gridRadius * 2 - (tile.y - minY)) * tileSize; // Flip Y axis
                  const isCurrent = tile.x === currentX && tile.y === currentY;
                  const isHovered = hoveredTile?.x === tile.x && hoveredTile?.y === tile.y;
                  const colors = BIOME_COLORS[tile.biome];

                  return (
                    <g
                      key={`${tile.x},${tile.y}`}
                      className="cursor-pointer group/tile"
                      onClick={() => onSelectLocation(tile.x, tile.y)}
                      onMouseEnter={() => setHoveredTile({ x: tile.x, y: tile.y })}
                      onMouseLeave={() => setHoveredTile(null)}
                    >
                      {/* Base tile */}
                      <rect
                        x={svgX}
                        y={svgY}
                        width={tileSize}
                        height={tileSize}
                        fill={colors.fill}
                        stroke={tile.isMajor ? colors.stroke : 'transparent'}
                        strokeWidth={tile.isMajor ? 1.5 : 0}
                        opacity={tile.isMajor ? 0.8 : 0.4}
                        className="transition-all duration-200"
                      />

                      {/* Major district border */}
                      {tile.isMajor && (
                        <rect
                          x={svgX}
                          y={svgY}
                          width={tileSize}
                          height={tileSize}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth={isCurrent ? 3 : (isHovered ? 2.5 : 1.5)}
                          opacity={isCurrent ? 1 : (isHovered ? 0.8 : 0.5)}
                          className="transition-all duration-200"
                          filter={isCurrent || isHovered ? 'url(#majorGlow)' : undefined}
                        />
                      )}

                      {/* Current location pulse */}
                      {isCurrent && (
                        <>
                          <rect
                            x={svgX - 2}
                            y={svgY - 2}
                            width={tileSize + 4}
                            height={tileSize + 4}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            opacity={0.3}
                            className="animate-ping"
                          />
                          <circle
                            cx={svgX + tileSize / 2}
                            cy={svgY + tileSize / 2}
                            r={4}
                            fill="#fbbf24"
                            className="drop-shadow-lg"
                          />
                        </>
                      )}

                      {/* Icon for major districts */}
                      {tile.icon && (
                        <text
                          x={svgX + tileSize / 2}
                          y={svgY + tileSize / 2 + 5}
                          textAnchor="middle"
                          className="text-[14px] pointer-events-none"
                          opacity={isCurrent || isHovered ? 1 : 0.7}
                        >
                          {tile.icon}
                        </text>
                      )}

                      {/* Hover highlight */}
                      {isHovered && !isCurrent && (
                        <rect
                          x={svgX}
                          y={svgY}
                          width={tileSize}
                          height={tileSize}
                          fill="white"
                          opacity={0.1}
                          className="pointer-events-none"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover tooltip */}
            {hoveredTile && (() => {
              const tile = grid.find(t => t.x === hoveredTile.x && t.y === hoveredTile.y);
              if (!tile) return null;

              return (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-amber-500/30 rounded-lg px-4 py-2 pointer-events-none backdrop-blur-sm">
                  <div className="text-xs text-amber-100 font-semibold flex items-center gap-2">
                    {tile.icon && <span>{tile.icon}</span>}
                    <span>{tile.name || `${tile.biome.charAt(0).toUpperCase()}${tile.biome.slice(1)}`}</span>
                  </div>
                  {tile.desc && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{tile.desc}</div>
                  )}
                  <div className="text-[9px] text-slate-500 mt-1">
                    ({tile.x}, {tile.y})
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50" style={{ backgroundColor: BIOME_COLORS.marketplace.fill }}></div>
              <span className="text-slate-400">Market</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50" style={{ backgroundColor: BIOME_COLORS.religious.fill }}></div>
              <span className="text-slate-400">Religious</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50" style={{ backgroundColor: BIOME_COLORS.wealthy.fill }}></div>
              <span className="text-slate-400">Wealthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50" style={{ backgroundColor: BIOME_COLORS.hovels.fill }}></div>
              <span className="text-slate-400">Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50" style={{ backgroundColor: BIOME_COLORS.farmland.fill }}></div>
              <span className="text-slate-400">Farm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-amber-500/50 opacity-50" style={{ backgroundColor: BIOME_COLORS.desert.fill }}></div>
              <span className="text-slate-400">Desert</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-amber-500/70"></div>
              <span className="text-amber-300/80">Major District</span>
            </div>
          </div>
        </div>

        {/* Sidebar with major districts only */}
        <div className="w-full md:w-96 p-6 flex flex-col gap-4 overflow-hidden min-h-0 bg-gradient-to-br from-slate-950/80 to-slate-900/60 backdrop-blur-sm">
          <div className="pb-4 border-b border-amber-500/10">
            <h3 className="text-lg font-bold text-amber-100 uppercase tracking-[0.15em] mb-1">Fast Travel</h3>
            <p className="text-[11px] text-slate-400 tracking-wide">Major districts & landmarks</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 custom-scrollbar">
            {majorDistricts.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              const tile = grid.find(t => t.x === loc.x && t.y === loc.y);
              const colors = tile ? BIOME_COLORS[tile.biome] : null;

              return (
                <button
                  key={`${loc.x},${loc.y}`}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  disabled={isCurrent}
                  className={`w-full text-left p-3 rounded-xl border transition-all group ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/30 cursor-default'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-amber-500/30 hover:shadow-[0_0_25px_rgba(245,158,11,0.1)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {loc.icon && <span className="text-lg">{loc.icon}</span>}
                    <div className="flex-1">
                      <div className="text-sm text-amber-100/90 font-semibold tracking-wide leading-tight">
                        {loc.name}
                      </div>
                      <div className="text-[11px] text-slate-400 italic">
                        {loc.desc}
                      </div>
                    </div>
                    {isCurrent && <MapPin size={14} className="text-amber-400" />}
                  </div>

                  {colors && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.fill }}></div>
                      <span>({loc.x}, {loc.y})</span>
                    </div>
                  )}

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

      <style jsx>{`
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
