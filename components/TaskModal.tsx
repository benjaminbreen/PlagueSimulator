import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { PlayerTask } from '../types';
import { BIOME_COLORS, buildOverworldGrid } from '../utils/overworld';
import { getLocationLabel } from '../types';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  currentX: number;
  currentY: number;
  task?: PlayerTask | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ open, onClose, currentX, currentY, task }) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const grid = useMemo(() => buildOverworldGrid(0, 0, 3), []);
  const tileSize = 58;
  const gridSize = tileSize * 7;
  const minX = -3;
  const minY = -3;
  const roundedCurrent = useMemo(() => ({ x: Math.round(currentX), y: Math.round(currentY) }), [currentX, currentY]);

  const target = task?.target;
  const targetCoords = target?.mapX !== undefined && target?.mapY !== undefined
    ? { x: target.mapX, y: target.mapY }
    : null;
  const hoveredInfo = hoveredTile
    ? grid.find((tile) => tile.mapX === hoveredTile.x && tile.mapY === hoveredTile.y) ?? null
    : null;
  const isHoveredTarget = hoveredTile && targetCoords
    ? hoveredTile.x === targetCoords.x && hoveredTile.y === targetCoords.y
    : false;
  const activeDestination = isHoveredTarget
    ? targetCoords
    : selectedDestination;

  const shortenLabel = useCallback((label: string) => {
    const cleaned = label.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    const maxLen = 11;
    if (cleaned.length <= maxLen) return cleaned;
    const words = cleaned.split(' ');
    if (words.length >= 2) {
      const first = words[0].slice(0, maxLen);
      const second = words[1].slice(0, maxLen);
      return `${first} ${second}`;
    }
    return cleaned.slice(0, maxLen);
  }, []);

  const directionInstruction = useMemo(() => {
    const destination = targetCoords;
    if (!destination) return null;
    const dx = destination.x - roundedCurrent.x;
    const dy = destination.y - roundedCurrent.y;
    if (dx === 0 && dy === 0) return 'You are already at your destination.';

    const steps = [];
    if (dx !== 0) {
      const dir = dx > 0 ? 'east' : 'west';
      const count = Math.abs(dx);
      const interimLabel = getLocationLabel(roundedCurrent.x + dx, roundedCurrent.y);
      steps.push(`Go ${dir} ${count} ${count === 1 ? 'square' : 'squares'} to ${interimLabel}`);
    }
    if (dy !== 0) {
      const dir = dy > 0 ? 'north' : 'south';
      const count = Math.abs(dy);
      const interimLabel = getLocationLabel(destination.x, destination.y);
      steps.push(`then ${dir} ${count} ${count === 1 ? 'square' : 'squares'} to reach ${interimLabel}`);
    }
    return `${steps.join(', ')}.`;
  }, [roundedCurrent.x, roundedCurrent.y, targetCoords]);

  const getTileFromClient = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = gridSize / rect.width;
    const scaleY = gridSize / rect.height;
    const localX = (clientX - rect.left) * scaleX;
    const localY = (clientY - rect.top) * scaleY;
    const col = Math.max(0, Math.min(6, Math.floor(localX / tileSize)));
    const row = Math.max(0, Math.min(6, Math.floor(localY / tileSize)));
    const mapX = minX + col;
    const mapY = minY + (6 - row);
    return { x: mapX, y: mapY };
  }, [gridSize, minX, minY, tileSize]);

  const pathPoints = useMemo(() => {
    if (!activeDestination) return null;
    const start = {
      x: (roundedCurrent.x - minX) * tileSize + tileSize / 2,
      y: (6 - (roundedCurrent.y - minY)) * tileSize + tileSize / 2
    };
    const mid = {
      x: (activeDestination.x - minX) * tileSize + tileSize / 2,
      y: (6 - (roundedCurrent.y - minY)) * tileSize + tileSize / 2
    };
    const end = {
      x: (activeDestination.x - minX) * tileSize + tileSize / 2,
      y: (6 - (activeDestination.y - minY)) * tileSize + tileSize / 2
    };
    return { start, mid, end };
  }, [activeDestination, minX, minY, roundedCurrent.x, roundedCurrent.y, tileSize]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    setSelectedDestination(null);
  }, [targetCoords?.x, targetCoords?.y]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-w-7xl w-full bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[94vh]"
        style={{
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 1px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 p-6 md:p-12 border-b md:border-b-0 md:border-r border-amber-500/10 bg-gradient-to-br from-slate-900/50 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xs text-amber-400/80 uppercase tracking-[0.25em] font-semibold mb-1">Task Briefing</h4>
              <div className="h-px w-36 bg-gradient-to-r from-amber-500/50 to-transparent"></div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-amber-100/50 hover:text-amber-100 hover:border-amber-500/30"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-gradient-to-br from-black/40 to-slate-900/40 backdrop-blur-sm border border-amber-500/10 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-inner">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(245 158 11) 1px, transparent 0)',
                backgroundSize: '36px 36px'
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(245,158,11,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.2) 1px, transparent 1px)',
                backgroundSize: '58px 58px'
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl border border-amber-400/10"
              style={{ boxShadow: 'inset 0 0 40px rgba(12,12,12,0.65)' }}
            />
            <div className="relative flex items-center justify-center" ref={gridContainerRef}>
              <svg
                viewBox={`0 0 ${gridSize} ${gridSize}`}
                className="w-full h-full max-w-[640px] max-h-[640px]"
                style={{ imageRendering: 'crisp-edges' }}
                ref={svgRef}
              >
                <defs>
                  <filter id="taskGlow">
                    <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="pathGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                    <stop offset="45%" stopColor="#fde68a" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {pathPoints && (
                  <>
                    <path
                      d={`M ${pathPoints.start.x} ${pathPoints.start.y} L ${pathPoints.mid.x} ${pathPoints.mid.y} L ${pathPoints.end.x} ${pathPoints.end.y}`}
                      fill="none"
                      stroke="url(#pathGlow)"
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#taskGlow)"
                      opacity={0.7}
                    />
                    <path
                      d={`M ${pathPoints.start.x} ${pathPoints.start.y} L ${pathPoints.mid.x} ${pathPoints.mid.y} L ${pathPoints.end.x} ${pathPoints.end.y}`}
                      fill="none"
                      stroke="rgba(255,248,220,0.95)"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="10 10"
                    >
                      <animate attributeName="stroke-dashoffset" values="0;-26" dur="1.2s" repeatCount="indefinite" />
                    </path>
                  </>
                )}
                {grid.map((tile) => {
                  const svgX = (tile.mapX - minX) * tileSize;
                  const svgY = (6 - (tile.mapY - minY)) * tileSize;
                  const isCurrent = tile.mapX === roundedCurrent.x && tile.mapY === roundedCurrent.y;
                  const isTarget = targetCoords && tile.mapX === targetCoords.x && tile.mapY === targetCoords.y;
                  const isHovered = hoveredTile?.x === tile.mapX && hoveredTile?.y === tile.mapY;
                  const colors = BIOME_COLORS[tile.biome];
                  const shortLabel = shortenLabel(tile.label).toUpperCase();
                  const labelParts = shortLabel.split(' ');

                  return (
                    <g
                      key={`${tile.mapX},${tile.mapY}`}
                    >
                      <rect
                        x={svgX}
                        y={svgY}
                        width={tileSize}
                        height={tileSize}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={1}
                        fillOpacity={tile.isMajor ? 0.92 : 0.65}
                        strokeOpacity={tile.isMajor ? 0.7 : 0.4}
                        className="transition-all duration-200"
                      />
                      <rect
                        x={svgX + 2}
                        y={svgY + 2}
                        width={tileSize - 4}
                        height={tileSize - 4}
                        fill="rgba(255,255,255,0.04)"
                        stroke="none"
                        pointerEvents="none"
                      />
                      <title>{`${getLocationLabel(tile.mapX, tile.mapY)} · ${tile.label} · ${tile.biome}`}</title>

                      <text
                        x={svgX + tileSize / 2}
                        y={svgY + tileSize / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="7"
                        fill="rgba(255,248,235,0.92)"
                        stroke="rgba(6,6,6,0.7)"
                        strokeWidth="1"
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {labelParts.length > 1 ? (
                          <>
                            <tspan x={svgX + tileSize / 2} dy="-3">{labelParts[0]}</tspan>
                            <tspan x={svgX + tileSize / 2} dy="7">{labelParts[1]}</tspan>
                          </>
                        ) : (
                          <tspan>{labelParts[0]}</tspan>
                        )}
                      </text>

                      {isTarget && (
                        <rect
                          x={svgX + 4}
                          y={svgY + 4}
                          width={tileSize - 8}
                          height={tileSize - 8}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth={2.5}
                          opacity={0.95}
                          filter="url(#taskGlow)"
                        />
                      )}

                      {isCurrent && (
                        <>
                          <circle
                            cx={svgX + tileSize / 2}
                            cy={svgY + tileSize / 2}
                            r={6}
                            fill="#fbbf24"
                            className="drop-shadow-lg"
                          />
                          <circle
                            cx={svgX + tileSize / 2}
                            cy={svgY + tileSize / 2}
                            r={10}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            opacity={0.35}
                            className="animate-ping"
                            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                          />
                        </>
                      )}

                      {isHovered && (
                        <rect
                          x={svgX + 2}
                          y={svgY + 2}
                          width={tileSize - 4}
                          height={tileSize - 4}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          opacity={0.6}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
              <div
                className="absolute inset-0 cursor-pointer"
                onMouseMove={(event) => {
                  const container = gridContainerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const tile = getTileFromClient(event.clientX, event.clientY, rect);
                  if (!tile) return;
                  setHoveredTile(tile);
                }}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={(event) => {
                  if (!targetCoords) return;
                  const container = gridContainerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const tile = getTileFromClient(event.clientX, event.clientY, rect);
                  if (!tile) return;
                  if (tile.x === targetCoords.x && tile.y === targetCoords.y) {
                    setSelectedDestination({ x: targetCoords.x, y: targetCoords.y });
                  }
                }}
                onTouchMove={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  const container = gridContainerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const tile = getTileFromClient(touch.clientX, touch.clientY, rect);
                  if (!tile) return;
                  setHoveredTile(tile);
                }}
                onTouchEnd={() => setHoveredTile(null)}
              />
            </div>
          </div>
          <div className="mt-4 bg-black/55 border border-amber-500/20 rounded-xl px-4 py-3 text-[12px] text-amber-100/80 shadow-lg">
            {hoveredInfo ? (
              <>
                <span className="text-amber-200/90">{getLocationLabel(hoveredInfo.mapX, hoveredInfo.mapY)}</span>
                <span className="text-amber-300/60"> · {hoveredInfo.label}</span>
                <span className="text-amber-300/40"> · {hoveredInfo.biome}</span>
              </>
            ) : (
              <span className="text-amber-200/60">Hover a tile for details.</span>
            )}
          </div>
        </div>

        <div className="w-full md:w-[28rem] p-6 md:p-9 bg-gradient-to-b from-black/40 to-black/20">
          <div className="flex items-center gap-2 text-amber-200/80 uppercase tracking-widest text-[11px]">
            <Navigation size={14} />
            Current Task
          </div>
          <div className="mt-4 space-y-3 select-text">
            {task ? (
              <>
                <div className="text-xl text-amber-100 font-semibold">{task.title}</div>
                <div className="text-sm text-amber-100/70 leading-relaxed">{task.description}</div>
                {task.target?.locationLabel && (
                  <div className="mt-2 text-[12px] text-amber-300/60 uppercase tracking-wider">
                    Target: {task.target.locationLabel}
                  </div>
                )}
                {targetCoords && (
                  <div className="text-[12px] text-amber-200/60">
                    {getLocationLabel(targetCoords.x, targetCoords.y)}
                  </div>
                )}
                {directionInstruction && (
                  <div className="mt-3 text-sm text-amber-100/70 leading-relaxed">
                    {directionInstruction}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-amber-100/60">No active task has been assigned yet.</div>
            )}
          </div>

          <div className="mt-8 space-y-3 text-[11px] text-amber-200/60">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-amber-300/60" />
              You are here
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-amber-400/80 rounded-sm shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
              Task destination
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
