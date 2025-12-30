import React, { useMemo } from 'react';
import { Navigation } from 'lucide-react';
import { MiniMapData } from '../types';

interface CompassProps {
  minimapData: MiniMapData | null;
  onClick?: () => void;
}

export const Compass: React.FC<CompassProps> = ({ minimapData, onClick }) => {
  const compassMeta = useMemo(() => {
    const yaw = minimapData?.player
      ? (Number.isFinite(minimapData.player.cameraYaw) ? minimapData.player.cameraYaw : minimapData.player.yaw)
      : 0;
    const deg = ((yaw * 180) / Math.PI + 360) % 360;
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % labels.length;
    return { deg, label: labels[index] };
  }, [minimapData?.player]);

  return (
    <div className="hidden md:flex flex-col items-center gap-1 pointer-events-auto">
      <button
        onClick={onClick}
        className="group relative h-12 w-12 rounded-full bg-black/30 border border-white/10 backdrop-blur-md text-white/70 hover:text-white/90 hover:bg-black/40 transition-all duration-200 shadow-lg"
        title="Change Perspective"
      >
        <div className="absolute inset-2 rounded-full border border-white/10" />
        <Navigation
          size={18}
          className="mx-auto transition-transform duration-300"
          style={{ transform: `rotate(${compassMeta.deg}deg)` }}
        />
      </button>
      <div className="text-[9px] uppercase tracking-[0.35em] text-white/60">
        {compassMeta.label}
      </div>
    </div>
  );
};
