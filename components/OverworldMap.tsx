import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BIOME_COLORS, buildOverworldGrid } from '../utils/overworld';
import { OverworldPathNode } from '../hooks/useOverworldPath';

type OverworldMapProps = {
  centerX: number;
  centerY: number;
  path: OverworldPathNode[];
  sceneMode: 'outdoor' | 'interior';
  onToggle: () => void;
  onTravelRequest?: (mapX: number, mapY: number, label: string) => void;
  isNight?: boolean;
};

// Zoom levels: 0.5 = zoomed out 2x, 1.0 = default, 2.0 = zoomed in 2x
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const DEFAULT_ZOOM = 1.0;
const BASE_GRID_RADIUS = 3;

export const OverworldMap: React.FC<OverworldMapProps> = ({ centerX, centerY, path, sceneMode, onToggle, onTravelRequest, isNight = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minimapSize, setMinimapSize] = useState(() => (window.innerWidth < 640 ? 150 : 240));
  const [hoverLabel, setHoverLabel] = useState<{ label: string; biome: string } | null>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Calculate grid radius based on zoom (zoomed out = more tiles)
  // At zoom 1.0: radius 3 = 7x7 grid
  // At zoom 2.0: radius 2 = 5x5 grid (zoomed in, larger tiles)
  // At zoom 0.5: radius 6 = 13x13 grid (zoomed out, smaller tiles)
  const gridRadius = Math.max(2, Math.ceil(BASE_GRID_RADIUS / zoom));

  // Effective center with pan offset (in tile coordinates)
  const effectiveCenterX = centerX - Math.round(panOffset.x);
  const effectiveCenterY = centerY + Math.round(panOffset.y);

  const tiles = useMemo(() => buildOverworldGrid(effectiveCenterX, effectiveCenterY, gridRadius), [effectiveCenterX, effectiveCenterY, gridRadius]);
  const tileIndex = useMemo(() => {
    const map = new Map<string, { label: string; biome: string }>();
    tiles.forEach((tile) => {
      map.set(`${tile.mapX},${tile.mapY}`, { label: tile.label, biome: tile.biome });
    });
    return map;
  }, [tiles]);

  useEffect(() => {
    const handleResize = () => {
      setMinimapSize(window.innerWidth < 640 ? 150 : 240);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (sceneMode !== 'outdoor') return;
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

    const padding = 16;
    const gridCount = gridRadius * 2 + 1;
    const gridSize = size - padding * 2;
    const tileSize = gridSize / gridCount;
    const originX = padding;
    const originY = padding;

    const bg = ctx.createRadialGradient(size * 0.35, size * 0.3, size * 0.1, size / 2, size / 2, size);
    bg.addColorStop(0, '#0f141b');
    bg.addColorStop(1, '#05070a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(130, 160, 190, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridCount; i++) {
      const x = originX + i * tileSize;
      const y = originY + i * tileSize;
      ctx.beginPath();
      ctx.moveTo(x, originY);
      ctx.lineTo(x, originY + gridSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(originX, y);
      ctx.lineTo(originX + gridSize, y);
      ctx.stroke();
    }

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    tiles.forEach((tile) => {
      const dx = tile.mapX - effectiveCenterX;
      const dy = tile.mapY - effectiveCenterY;

      // Skip outer corner tiles to fit circular shape better
      const isCorner = (Math.abs(dx) === gridRadius && Math.abs(dy) === gridRadius);
      if (isCorner) return;

      const col = dx + gridRadius;
      const row = gridRadius - dy;
      const x = originX + col * tileSize + 1;
      const y = originY + row * tileSize + 1;
      const pad = tile.isInterstitial ? 4 : 2;
      const w = tileSize - pad;
      const h = tileSize - pad;
      const palette = BIOME_COLORS[tile.biome];
      const alpha = tile.isInterstitial ? 0.22 : 0.5;
      roundRect(x + pad / 2, y + pad / 2, w, h, 4);
      ctx.fillStyle = palette.fill;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (tile.isMajor) {
        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = palette.stroke;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw emoji icons for key landmarks
    const getEmoji = (label: string): string | null => {
      // Religious sites
      if (label.includes('Mosque')) return '🕌';
      if (label.includes('Mountain Shrine')) return '⛩️';
      // Specific quarters - Jewish Quarter only gets Star of David
      if (label === 'Jewish Quarter') return '✡️';
      if (label.includes('Christian')) return '✝️';
      // Markets and trade
      if (label === 'Market') return '🏪';
      if (label === 'Souq Axis') return '🛒';
      if (label === 'Caravanserai') return '🐫';
      // Civic and wealthy
      if (label === 'Civic') return '🏛️';
      if (label.includes('Wealthy')) return '💎';
      if (label === 'Al-Salihiyya') return '🌳';
      // Poor areas - use different emoji than Star of David
      if (label === 'Hovels') return '🏚️';
      if (label === 'Alleys') return '🏚️';
      // Gates and roads
      if (label.includes('Bab Sharqi')) return '🚪';
      if (label === 'Al-Midan') return '🚪';
      if (label === 'Southern Road') return '🛤️';
      if (label === 'Straight Street') return '🛣️';
      if (label === 'Roadside') return '🛖';
      // Rural and outskirts
      if (label.includes('Ghouta')) return '🌾';
      if (label.includes('Desert')) return '🏜️';
      if (label === 'Scrublands') return '🌵';
      // Generic residential
      if (label === 'Residential') return '🏠';
      return null;
    };

    tiles.forEach((tile) => {
      if (!tile.isMajor) return;
      const emoji = getEmoji(tile.label);
      if (!emoji) return;
      const dx = tile.mapX - effectiveCenterX;
      const dy = tile.mapY - effectiveCenterY;

      // Skip outer corner tiles
      const isCorner = (Math.abs(dx) === gridRadius && Math.abs(dy) === gridRadius);
      if (isCorner) return;

      const col = dx + gridRadius;
      const row = gridRadius - dy;
      const x = originX + col * tileSize + 1;
      const y = originY + row * tileSize + 1;
      const pad = 2;
      const w = tileSize - pad;
      const h = tileSize - pad;
      // Scale emoji size based on zoom, with min/max bounds
      const emojiSize = Math.max(8, Math.min(20, Math.floor(tileSize * 0.45)));
      ctx.font = `${emojiSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, x + w / 2, y + h / 2);
    });

    // Draw path if visible
    const pathPoints = path
      .map((node) => ({
        dx: node.mapX - effectiveCenterX,
        dy: node.mapY - effectiveCenterY
      }))
      .filter((p) => Math.abs(p.dx) <= gridRadius && Math.abs(p.dy) <= gridRadius)
      .map((p) => ({
        x: originX + (p.dx + gridRadius + 0.5) * tileSize,
        y: originY + (gridRadius - p.dy + 0.5) * tileSize
      }));

    if (pathPoints.length > 1) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(226, 192, 106, 0.85)';
      ctx.strokeStyle = 'rgba(226, 192, 106, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw player position (actual player location, accounting for pan)
    const playerDx = centerX - effectiveCenterX;
    const playerDy = centerY - effectiveCenterY;
    if (Math.abs(playerDx) <= gridRadius && Math.abs(playerDy) <= gridRadius) {
      const playerXpx = originX + (playerDx + gridRadius + 0.5) * tileSize;
      const playerYpx = originY + (gridRadius - playerDy + 0.5) * tileSize;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 226, 150, 0.95)';
      ctx.strokeStyle = '#f6dba2';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(playerXpx, playerYpx, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(200, 214, 230, 0.7)';
    ctx.font = '700 9px Lato, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', size / 2, 6);

    ctx.strokeStyle = 'rgba(160, 190, 220, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();

    // Draw zoom indicator
    if (zoom !== DEFAULT_ZOOM) {
      ctx.fillStyle = 'rgba(200, 214, 230, 0.6)';
      ctx.font = '700 8px Lato, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${zoom.toFixed(1)}x`, size - 8, size - 6);
    }
  }, [centerX, centerY, effectiveCenterX, effectiveCenterY, tiles, path, minimapSize, sceneMode, gridRadius, zoom]);

  // Reset pan when player moves to a new tile
  const prevCenterRef = useRef({ x: centerX, y: centerY });
  useEffect(() => {
    if (prevCenterRef.current.x !== centerX || prevCenterRef.current.y !== centerY) {
      setPanOffset({ x: 0, y: 0 });
      prevCenterRef.current = { x: centerX, y: centerY };
    }
  }, [centerX, centerY]);

  // Wheel handler for zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  }, []);

  // Mouse handlers for panning
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Only start panning on right-click or middle-click, or if shift is held
    if (event.button === 2 || event.button === 1 || event.shiftKey) {
      event.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        offsetX: panOffset.x,
        offsetY: panOffset.y
      };
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (isPanning) {
      const dx = (event.clientX - panStartRef.current.x) / (minimapSize / gridRadius / 2);
      const dy = (event.clientY - panStartRef.current.y) / (minimapSize / gridRadius / 2);
      setPanOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy
      });
    } else {
      // Normal hover handling
      const rect = event.currentTarget.getBoundingClientRect();
      const size = minimapSize;
      const padding = 16;
      const gridCount = gridRadius * 2 + 1;
      const gridSize = size - padding * 2;
      const tileSize = gridSize / gridCount;
      const localX = event.clientX - rect.left - padding;
      const localY = event.clientY - rect.top - padding;
      if (localX < 0 || localY < 0 || localX > gridSize || localY > gridSize) {
        setHoverLabel(null);
        return;
      }
      const col = Math.floor(localX / tileSize);
      const row = Math.floor(localY / tileSize);
      if (col < 0 || row < 0 || col >= gridCount || row >= gridCount) {
        setHoverLabel(null);
        return;
      }
      const mapX = effectiveCenterX + (col - gridRadius);
      const mapY = effectiveCenterY + (gridRadius - row);
      const entry = tileIndex.get(`${mapX},${mapY}`);
      if (entry) {
        setHoverLabel(entry);
      } else {
        setHoverLabel(null);
      }
    }
  }, [isPanning, minimapSize, gridRadius, effectiveCenterX, effectiveCenterY, tileIndex]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setHoverLabel(null);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(MAX_ZOOM, prev + 0.25));
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(MIN_ZOOM, prev - 0.25));
  }, []);

  const handleResetView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(DEFAULT_ZOOM);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  if (sceneMode !== 'outdoor') return null;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Don't trigger click if we were panning
    if (isPanning) return;
    if (!onTravelRequest) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const size = minimapSize;
    const padding = 16;
    const gridCount = gridRadius * 2 + 1;
    const gridSize = size - padding * 2;
    const tileSize = gridSize / gridCount;
    const localX = event.clientX - rect.left - padding;
    const localY = event.clientY - rect.top - padding;

    if (localX < 0 || localY < 0 || localX > gridSize || localY > gridSize) return;

    const col = Math.floor(localX / tileSize);
    const row = Math.floor(localY / tileSize);

    if (col < 0 || row < 0 || col >= gridCount || row >= gridCount) return;

    const mapX = effectiveCenterX + (col - gridRadius);
    const mapY = effectiveCenterY + (gridRadius - row);

    // Don't allow travel to current location
    if (mapX === centerX && mapY === centerY) return;

    const entry = tileIndex.get(`${mapX},${mapY}`);
    if (entry) {
      onTravelRequest(mapX, mapY, entry.label);
    }
  };

  return (
    <div className="absolute top-20 right-6 pointer-events-auto group">
      <button
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="rounded-full p-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #1a1f28, #4f3b22 45%, #121720)' }}
        aria-label="Overworld Map - Click to fast travel, scroll to zoom, shift+drag to pan"
      >
        <div className="relative rounded-full p-[8px] bg-black/85 border border-amber-900/30 shadow-[0_0_28px_rgba(120,165,210,0.2)]">
          <canvas ref={canvasRef} className="rounded-full block" />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 25%, rgba(200,220,255,0.08), transparent 55%)' }}
          />
        </div>
      </button>
      {/* Zoom controls */}
      <div className="flex justify-center gap-1 mt-1">
        <button
          onClick={handleZoomOut}
          className="w-5 h-5 rounded text-[10px] bg-black/60 text-amber-200/70 hover:text-amber-100 hover:bg-black/80 transition-colors border border-amber-900/20"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleResetView}
          className="px-1.5 h-5 rounded text-[8px] bg-black/60 text-amber-200/70 hover:text-amber-100 hover:bg-black/80 transition-colors border border-amber-900/20"
          title="Reset view"
        >
          ⟲
        </button>
        <button
          onClick={handleZoomIn}
          className="w-5 h-5 rounded text-[10px] bg-black/60 text-amber-200/70 hover:text-amber-100 hover:bg-black/80 transition-colors border border-amber-900/20"
          title="Zoom in"
        >
          +
        </button>
      </div>
      <div
        onClick={onToggle}
        className={`mt-1 text-[9px] uppercase tracking-[0.3em] text-center cursor-pointer transition-all duration-200 ${
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
        Overworld Grid
      </div>
      <div
        className={`mt-1 text-[10px] text-center tracking-[0.15em] font-semibold ${
          isNight
            ? 'text-amber-100/80'
            : 'text-amber-50'
        }`}
        style={{
          textShadow: isNight
            ? '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'
            : '0 1px 3px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)'
        }}
      >
        {hoverLabel ? `${hoverLabel.label} · ${hoverLabel.biome}` : ' '}
      </div>
    </div>
  );
};
