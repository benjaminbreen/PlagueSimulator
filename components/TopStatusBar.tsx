import React, { useState } from 'react';
import { Calendar, Sun, Moon, Pause, Play, FastForward, Keyboard, MousePointer2, Camera, Menu, X, ChevronDown } from 'lucide-react';
import { PlayerStats } from '../types';
import { SicknessMeter } from './SicknessMeter';

interface TopStatusBarProps {
  dateStr: string;
  timeStr: string;
  isDaytime: boolean;
  simulationSpeed: number;
  onSetSimulationSpeed: (speed: number) => void;
  onOpenWeather: () => void;
  onToggleMinimize: () => void;
  showMovementHint: boolean;
  onShowHealthMeter: () => void;
  plague: PlayerStats['plague'];
  hasPlayerMoved: boolean;
  showHealthMeter: boolean;
  onOpenPlayerModal: () => void;
  onToggleMobilePerspectiveMenu: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

// Get speed icon and label
const getSpeedInfo = (speed: number) => {
  if (speed === 0.01) return { icon: Pause, label: 'Paused', color: 'bg-red-700 text-white' };
  if (speed === 1) return { icon: Play, label: '1x', color: 'bg-amber-700 text-white' };
  return { icon: FastForward, label: '4x', color: 'bg-amber-700 text-white' };
};

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  dateStr,
  timeStr,
  isDaytime,
  simulationSpeed,
  onSetSimulationSpeed,
  onOpenWeather,
  onToggleMinimize,
  showMovementHint,
  onShowHealthMeter,
  plague,
  hasPlayerMoved,
  showHealthMeter,
  onOpenPlayerModal,
  onToggleMobilePerspectiveMenu,
  showSettings,
  onToggleSettings
}) => {
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedInfo = getSpeedInfo(simulationSpeed);
  const SpeedIcon = speedInfo.icon;

  return (
    <div
      className="w-full h-12 md:h-16 bg-black/80 backdrop-blur-md border-b border-amber-900/30 px-3 md:px-6 flex items-center justify-between pointer-events-auto cursor-pointer shadow-xl"
      onClick={onToggleMinimize}
    >
      {/* Left: Title - compact on mobile */}
      <div className="flex flex-col" onClick={e => e.stopPropagation()}>
        <h1 className="text-sm md:text-xl font-bold text-amber-500 historical-font tracking-tighter leading-none">
          PLAGUE SIM
          <span className="hidden md:inline">ULATOR</span>
        </h1>
        <span className="hidden md:block text-[10px] text-amber-200/50 uppercase tracking-[0.3em] font-light">DAMASCUS 1348</span>
      </div>

      {/* Center: Date, Time, Speed */}
      <div
        className="flex items-center gap-2 md:gap-6 bg-amber-950/20 px-2 md:px-6 py-1.5 md:py-2 rounded-full border border-amber-800/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Date - hidden on mobile, shown on tablet+ */}
        <div className="hidden sm:flex items-center gap-2 text-amber-100/90">
          <Calendar size={14} className="text-amber-500" />
          <span className="text-xs font-mono tracking-widest uppercase">{dateStr}</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-amber-800/30" />

        {/* Time - always visible, compact on mobile */}
        <div
          className="flex items-center gap-1.5 md:gap-2 text-amber-100/90 cursor-pointer hover:bg-amber-900/20 px-1.5 md:px-2 py-1 rounded-lg transition-colors"
          onClick={onOpenWeather}
          title="View Weather Report"
        >
          {isDaytime ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
          <span className="text-[10px] md:text-xs font-mono tracking-wider md:tracking-widest">{timeStr}</span>
        </div>

        <div className="w-px h-4 bg-amber-800/30" />

        {/* Speed Controls - Desktop: all buttons, Mobile: expandable */}
        {/* Desktop version */}
        <div className="hidden md:flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => onSetSimulationSpeed(0.01)}
            className={`p-1.5 rounded transition-all ${simulationSpeed === 0.01 ? 'bg-red-700 text-white shadow-[0_0_10px_rgba(185,28,28,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
            title="Freeze Simulation"
          >
            <Pause size={14} />
          </button>
          <button
            onClick={() => onSetSimulationSpeed(1)}
            className={`p-1.5 rounded transition-all ${simulationSpeed === 1 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
            title="Normal Speed"
          >
            <Play size={14} />
          </button>
          <button
            onClick={() => onSetSimulationSpeed(4)}
            className={`p-1.5 rounded transition-all ${simulationSpeed === 4 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
            title="Fast Forward"
          >
            <FastForward size={14} />
          </button>
        </div>

        {/* Mobile version - expandable speed control */}
        <div className="md:hidden relative">
          <button
            onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
            className={`flex items-center gap-1 p-1.5 rounded-lg transition-all ${speedInfo.color}`}
          >
            <SpeedIcon size={14} />
            <ChevronDown size={10} className={`transition-transform ${speedMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {speedMenuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSpeedMenuOpen(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-black/95 border border-amber-800/40 rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => { onSetSimulationSpeed(0.01); setSpeedMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors ${
                    simulationSpeed === 0.01 ? 'bg-red-700/50 text-white' : 'text-amber-100 hover:bg-amber-900/30'
                  }`}
                >
                  <Pause size={14} />
                  <span className="text-xs font-medium">Pause</span>
                </button>
                <button
                  onClick={() => { onSetSimulationSpeed(1); setSpeedMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors ${
                    simulationSpeed === 1 ? 'bg-amber-700/50 text-white' : 'text-amber-100 hover:bg-amber-900/30'
                  }`}
                >
                  <Play size={14} />
                  <span className="text-xs font-medium">Normal</span>
                </button>
                <button
                  onClick={() => { onSetSimulationSpeed(4); setSpeedMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors ${
                    simulationSpeed === 4 ? 'bg-amber-700/50 text-white' : 'text-amber-100 hover:bg-amber-900/30'
                  }`}
                >
                  <FastForward size={14} />
                  <span className="text-xs font-medium">Fast (4x)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Settings and controls */}
      <div className="flex items-center gap-2 md:gap-4" onClick={e => e.stopPropagation()}>
        {showMovementHint ? (
          <button
            type="button"
            onClick={onShowHealthMeter}
            className="hidden lg:flex flex-col items-end mr-4 text-[9px] text-amber-500/50 uppercase tracking-widest font-bold hover:text-amber-300/80 transition-colors"
          >
            <div className="flex items-center gap-2"><span>Arrows to Move</span><Keyboard size={10} /></div>
            <div className="flex items-center gap-2"><span>V to Change Perspective</span><MousePointer2 size={10} /></div>
          </button>
        ) : (
          <div className="hidden lg:block mr-4">
            <SicknessMeter
              plague={plague}
              hasPlayerMoved={hasPlayerMoved || showHealthMeter}
              onClickDossier={onOpenPlayerModal}
            />
          </div>
        )}
        <button
          onClick={onToggleMobilePerspectiveMenu}
          className="md:hidden p-1.5 text-amber-500 hover:text-amber-400 transition-colors"
          title="Change Perspective"
        >
          <Camera size={18} />
        </button>
        <button
          onClick={onToggleSettings}
          className="p-1.5 md:p-2 text-amber-500 hover:text-amber-400 transition-colors"
        >
          {showSettings ? <X size={20} className="md:w-6 md:h-6" /> : <Menu size={20} className="md:w-6 md:h-6" />}
        </button>
      </div>
    </div>
  );
};
