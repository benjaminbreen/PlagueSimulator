import React from 'react';
import { CameraMode } from '../types';
import { Eye, User, Camera, Layers } from 'lucide-react';

interface PerspectiveMenuProps {
  visible: boolean;
  cameraMode: CameraMode;
  onChange: (mode: CameraMode) => void;
}

export const PerspectiveMenu: React.FC<PerspectiveMenuProps> = ({ visible, cameraMode, onChange }) => {
  if (!visible) return null;

  return (
    <div className="hidden md:block bg-black/70 backdrop-blur-lg p-3 rounded-xl border border-amber-900/50 shadow-2xl flex flex-col gap-2">
      <span className="text-[9px] uppercase tracking-widest text-amber-500/80 font-bold mb-1 px-1">Observation Perspective</span>
      <div className="grid grid-cols-1 gap-1">
        <button
          onClick={() => onChange(CameraMode.FIRST_PERSON)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.FIRST_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Eye size={12} /> First Person
        </button>
        <button
          onClick={() => onChange(CameraMode.OVER_SHOULDER)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.OVER_SHOULDER ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <User size={12} /> Over Shoulder
        </button>
        <button
          onClick={() => onChange(CameraMode.THIRD_PERSON)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.THIRD_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Camera size={12} /> Orbit View
        </button>
        <button
          onClick={() => onChange(CameraMode.OVERHEAD)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.OVERHEAD ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Layers size={12} /> Overhead Map
        </button>
      </div>
    </div>
  );
};
