import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BIOME_COLORS, buildOverworldGrid } from '../utils/overworld';
import { OverworldPathNode } from '../hooks/useOverworldPath';

type OverworldMapProps = {
  centerX: number;
  centerY: number;
  path: OverworldPathNode[];
  sceneMode: 'outdoor' | 'interior';
  onToggle: () => void;
  onTravelRequest?: (mapX: number, mapY: number, label: string) => void;
};

const GRID_RADIUS = 3;

export const OverworldMap: React.FC<OverworldMapProps> = ({ centerX, centerY, path, sceneMode, onToggle, onTravelRequest }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minimapSize, setMinimapSize] = useState(() => (window.innerWidth < 640 ? 150 : 240));
  const [hoverLabel, setHoverLabel] = useState<{ label: string; biome: string } | null>(null);
  const tiles = useMemo(() => buildOverworldGrid(centerX, centerY, GRID_RADIUS), [centerX, centerY]);
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
    const gridCount = GRID_RADIUS * 2 + 1;
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
      const dx = tile.mapX - centerX;
      const dy = tile.mapY - centerY;

      // Skip outer corner tiles to fit circular shape better
      const isCorner = (Math.abs(dx) === GRID_RADIUS && Math.abs(dy) === GRID_RADIUS);
      if (isCorner) return;

      const col = dx + GRID_RADIUS;
      const row = GRID_RADIUS - dy;
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
      if (label.includes('Mosque')) return '🕌';
      if (label === 'Market') return '🏪';
      if (label === 'Caravanserai') return '🐫';
      if (label.includes('Mountain Shrine')) return '⛰️';
      if (label === 'Civic') return '🏛️';
      if (label.includes('Bab Sharqi')) return '🚪';
      if (label.includes('Wealthy')) return '💎';
      if (label === 'Al-Salihiyya') return '🌳';
      if (label.includes('Christian')) return '✝️';
      if (label.includes('Jewish')) return '✡️';
      if (label.includes('Ghouta')) return '🌾';
      if (label.includes('Desert')) return '🏜️';
      return null;
    };

    tiles.forEach((tile) => {
      if (!tile.isMajor) return;
      const emoji = getEmoji(tile.label);
      if (!emoji) return;
      const dx = tile.mapX - centerX;
      const dy = tile.mapY - centerY;

      // Skip outer corner tiles
      const isCorner = (Math.abs(dx) === GRID_RADIUS && Math.abs(dy) === GRID_RADIUS);
      if (isCorner) return;

      const col = dx + GRID_RADIUS;
      const row = GRID_RADIUS - dy;
      const x = originX + col * tileSize + 1;
      const y = originY + row * tileSize + 1;
      const pad = 2;
      const w = tileSize - pad;
      const h = tileSize - pad;
      ctx.font = `${Math.floor(tileSize * 0.45)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, x + w / 2, y + h / 2);
    });

    const pathPoints = path
      .map((node) => ({
        dx: node.mapX - centerX,
        dy: node.mapY - centerY
      }))
      .filter((p) => Math.abs(p.dx) <= GRID_RADIUS && Math.abs(p.dy) <= GRID_RADIUS)
      .map((p) => ({
        x: originX + (p.dx + GRID_RADIUS + 0.5) * tileSize,
        y: originY + (GRID_RADIUS - p.dy + 0.5) * tileSize
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

    const centerXpx = originX + (GRID_RADIUS + 0.5) * tileSize;
    const centerYpx = originY + (GRID_RADIUS + 0.5) * tileSize;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 226, 150, 0.95)';
    ctx.strokeStyle = '#f6dba2';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(centerXpx, centerYpx, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

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
  }, [centerX, centerY, tiles, path, minimapSize, sceneMode]);

  if (sceneMode !== 'outdoor') return null;

  const handleHover = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = minimapSize;
    const padding = 16;
    const gridCount = GRID_RADIUS * 2 + 1;
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
    const mapX = centerX + (col - GRID_RADIUS);
    const mapY = centerY + (GRID_RADIUS - row);
    const entry = tileIndex.get(`${mapX},${mapY}`);
    if (entry) {
      setHoverLabel(entry);
    } else {
      setHoverLabel(null);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!onTravelRequest) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const size = minimapSize;
    const padding = 16;
    const gridCount = GRID_RADIUS * 2 + 1;
    const gridSize = size - padding * 2;
    const tileSize = gridSize / gridCount;
    const localX = event.clientX - rect.left - padding;
    const localY = event.clientY - rect.top - padding;

    if (localX < 0 || localY < 0 || localX > gridSize || localY > gridSize) return;

    const col = Math.floor(localX / tileSize);
    const row = Math.floor(localY / tileSize);

    if (col < 0 || row < 0 || col >= gridCount || row >= gridCount) return;

    const mapX = centerX + (col - GRID_RADIUS);
    const mapY = centerY + (GRID_RADIUS - row);

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
        onMouseMove={handleHover}
        onMouseLeave={() => setHoverLabel(null)}
        className="rounded-full p-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #1a1f28, #4f3b22 45%, #121720)' }}
        aria-label="Overworld Map - Click to fast travel"
      >
        <div className="relative rounded-full p-[8px] bg-black/85 border border-amber-900/30 shadow-[0_0_28px_rgba(120,165,210,0.2)]">
          <canvas ref={canvasRef} className="rounded-full block" />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 25%, rgba(200,220,255,0.08), transparent 55%)' }}
          />
        </div>
      </button>
      <div
        onClick={onToggle}
        className="mt-2 text-[9px] uppercase tracking-[0.3em] text-amber-200/60 text-center cursor-pointer hover:text-amber-100 transition-colors"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' }}
      >
        Overworld Grid
      </div>
      <div
        className="mt-1 text-[10px] text-center text-amber-100/80 tracking-[0.2em] font-semibold"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' }}
      >
        {hoverLabel ? `${hoverLabel.label} · ${hoverLabel.biome}` : ' '}
      </div>
    </div>
  );
};
