import React from 'react';
import { Activity, Calendar, Sun, Moon, Pause, Play, FastForward, Keyboard, MousePointer2, Camera, Menu, X, Cloud, CloudMoon, Wind, Users } from 'lucide-react';
import { AgentState, PlayerStats } from '../types';
import { getReputationTier, getReputationLabel, getReputationColorClass, getReputationBgClass } from '../utils/reputation';

interface TopStatusBarProps {
  dateStr: string;
  timeStr: string;
  isDaytime: boolean;
  currentWeather: string;
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
  onOpenAbout: () => void;
  reputation?: number;
}

// Get speed icon and label
const getSpeedInfo = (speed: number) => {
  if (speed === 0.01) return { icon: Pause, label: 'Paused', color: 'bg-red-700 text-white' };
  if (speed === 1) return { icon: Play, label: '1x', color: 'bg-amber-700 text-white' };
  return { icon: FastForward, label: '4x', color: 'bg-amber-700 text-white' };
};

// Get weather icon based on current weather and time of day
const getWeatherIcon = (weather: string, isDaytime: boolean) => {
  switch (weather) {
    case 'SANDSTORM':
      return { icon: Wind, color: 'text-orange-400' };
    case 'OVERCAST':
      return isDaytime
        ? { icon: Cloud, color: 'text-slate-400' }
        : { icon: CloudMoon, color: 'text-slate-400' };
    case 'CLEAR':
    default:
      return isDaytime
        ? { icon: Sun, color: 'text-amber-400' }
        : { icon: Moon, color: 'text-indigo-400' };
  }
};

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  dateStr,
  timeStr,
  isDaytime,
  currentWeather,
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
  onToggleSettings,
  onOpenAbout,
  reputation
}) => {
  // Reputation display
  const reputationTier = reputation !== undefined ? getReputationTier(reputation) : null;
  const reputationLabel = reputationTier ? getReputationLabel(reputationTier) : null;
  const reputationColorClass = reputationTier ? getReputationColorClass(reputationTier) : '';
  const reputationBgClass = reputationTier ? getReputationBgClass(reputationTier) : '';
  const speedInfo = getSpeedInfo(simulationSpeed);
  const SpeedIcon = speedInfo.icon;
  const weatherInfo = getWeatherIcon(currentWeather, isDaytime);
  const WeatherIcon = weatherInfo.icon;
  const bodyState = plague.state === AgentState.HEALTHY
    ? { label: 'Steady', text: 'text-emerald-300', bg: 'bg-emerald-500/12 border-emerald-400/20' }
    : plague.state === AgentState.INCUBATING
      ? { label: 'Exposed', text: 'text-amber-200', bg: 'bg-amber-500/12 border-amber-400/20' }
      : plague.overallSeverity >= 70
        ? { label: 'Critical', text: 'text-red-200', bg: 'bg-red-500/12 border-red-400/20' }
        : { label: 'Ill', text: 'text-orange-200', bg: 'bg-orange-500/12 border-orange-400/20' };

  return (
    <div
      className="w-full h-10 md:h-16 bg-black/80 backdrop-blur-md border-b border-amber-800/30 px-2 md:px-6 flex items-center justify-between pointer-events-auto cursor-pointer shadow-xl"
      onClick={onToggleMinimize}
    >
      {/* Left: Title - clickable for About modal */}
      <button
        className="group flex flex-col items-start transition-all duration-300"
        onClick={(e) => { e.stopPropagation(); onOpenAbout(); }}
      >
        <h1 className="text-sm md:text-xl mt-1 font-bold text-amber-500 historical-font tracking-[0.08em] leading-none transition-all duration-300 group-hover:text-amber-300 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.34)]">
          DAMASCUS 1348
        </h1>
        <span className="text-[8px] md:text-[11px] text-amber-200/60 uppercase tracking-[0.2em] md:tracking-[0.32em] font-light transition-all duration-300 group-hover:text-amber-100/80">A City Under Plague</span>
      </button>

      {/* Mobile: Ultra-compact center controls */}
      <div
        className="md:hidden flex items-center gap-1.5"
        onClick={e => e.stopPropagation()}
      >
        {/* Time with weather icon */}
        <div
          className="flex items-center gap-1 text-amber-100/90 px-2 py-1 rounded-lg active:bg-amber-900/30 transition-colors"
          onClick={onOpenWeather}
        >
          <WeatherIcon size={12} className={weatherInfo.color} />
          <span className="text-[10px] font-mono">{timeStr}</span>
        </div>

        {/* Speed toggle - just icon, cycles through speeds */}
        <button
          onClick={() => {
            if (simulationSpeed === 0.01) onSetSimulationSpeed(1);
            else if (simulationSpeed === 1) onSetSimulationSpeed(4);
            else onSetSimulationSpeed(0.01);
          }}
          className={`p-1.5 rounded-lg transition-all ${speedInfo.color}`}
        >
          <SpeedIcon size={14} />
        </button>
      </div>

      {/* Desktop: Full center controls */}
      <div
        className="hidden md:flex items-center gap-6 bg-amber-950/20 px-6 py-2 rounded-full border border-amber-800/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Date */}
        <div className="flex items-center gap-2 text-amber-100/90">
          <Calendar size={14} className="text-amber-500" />
          <span className="text-xs font-mono tracking-widest uppercase">{dateStr}</span>
        </div>
        <div className="w-px h-4 bg-amber-800/30" />

        {/* Time */}
        <div
          className="flex items-center gap-2 text-amber-100/90 cursor-pointer hover:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors"
          onClick={onOpenWeather}
          title="View Weather Report"
        >
          <WeatherIcon size={14} className={weatherInfo.color} />
          <span className="text-xs font-mono tracking-widest">{timeStr}</span>
        </div>

        <div className="w-px h-4 bg-amber-800/30" />

        {/* Speed Controls */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
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
          <div className="hidden lg:flex items-center gap-3 mr-4">
            {/* Reputation indicator */}
            {reputationTier && (
              <button
                onClick={onOpenPlayerModal}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${reputationBgClass} border border-white/10 hover:border-white/20 transition-all`}
                title={`Reputation: ${reputationLabel} (${reputation})`}
              >
                <Users size={12} className={reputationColorClass} />
                <span className={`text-[10px] font-medium ${reputationColorClass}`}>{reputationLabel}</span>
              </button>
            )}
            <button
              onClick={onOpenPlayerModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bodyState.bg} hover:border-white/20 transition-all`}
              title="Open body and symptoms"
            >
              <Activity size={12} className={bodyState.text} />
              <span className={`text-[10px] uppercase tracking-[0.2em] ${bodyState.text}`}>Body</span>
              <span className={`text-[10px] font-medium ${bodyState.text}`}>{bodyState.label}</span>
            </button>
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
