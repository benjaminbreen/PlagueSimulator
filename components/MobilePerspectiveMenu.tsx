import React from 'react';
import { CameraMode } from '../types';
import { Eye, User, Camera, Layers } from 'lucide-react';

interface MobilePerspectiveMenuProps {
  visible: boolean;
  cameraMode: CameraMode;
  onChange: (mode: CameraMode) => void;
  onClose: () => void;
}

export const MobilePerspectiveMenu: React.FC<MobilePerspectiveMenuProps> = ({ visible, cameraMode, onChange, onClose }) => {
  if (!visible) return null;

  return (
    <div className="absolute top-16 right-4 md:hidden pointer-events-auto bg-black/80 backdrop-blur-lg border border-amber-900/50 rounded-xl shadow-2xl p-2 w-44">
      <div className="text-[9px] uppercase tracking-widest text-amber-500/80 font-bold mb-1 px-2">
        Perspective
      </div>
      <div className="grid grid-cols-1 gap-1">
        <button
          onClick={() => {
            onChange(CameraMode.FIRST_PERSON);
            onClose();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.FIRST_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Eye size={12} /> First Person
        </button>
        <button
          onClick={() => {
            onChange(CameraMode.OVER_SHOULDER);
            onClose();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.OVER_SHOULDER ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <User size={12} /> Over Shoulder
        </button>
        <button
          onClick={() => {
            onChange(CameraMode.THIRD_PERSON);
            onClose();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.THIRD_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Camera size={12} /> Orbit View
        </button>
        <button
          onClick={() => {
            onChange(CameraMode.OVERHEAD);
            onClose();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${cameraMode === CameraMode.OVERHEAD ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Layers size={12} /> Overhead Map
        </button>
      </div>
    </div>
  );
};
