import React from 'react';
import { PlagueStatus, AgentState, PlagueType } from '../types';
import { getSymptomLabels, getHealthStatusLabel, getPlagueTypeLabel } from '../utils/plague';
import { Activity } from 'lucide-react';

interface SicknessMeterProps {
  plague: PlagueStatus;
  hasPlayerMoved: boolean;
  onClickDossier: () => void;
}

export const SicknessMeter: React.FC<SicknessMeterProps> = ({
  plague,
  hasPlayerMoved,
  onClickDossier
}) => {
  // Don't show until player has moved
  if (!hasPlayerMoved) {
    return null;
  }

  const healthStatus = getHealthStatusLabel(plague);
  const symptoms = getSymptomLabels(plague);

  // Color scheme based on state
  const getColorScheme = () => {
    if (plague.state === AgentState.HEALTHY || plague.state === AgentState.INCUBATING) {
      return {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-600/40',
        text: 'text-emerald-400',
        barFilled: 'bg-emerald-500',
        barEmpty: 'bg-emerald-950/40',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]'
      };
    }

    if (plague.overallSeverity < 40) {
      return {
        bg: 'bg-amber-950/40',
        border: 'border-amber-600/40',
        text: 'text-amber-400',
        barFilled: 'bg-amber-500',
        barEmpty: 'bg-amber-950/40',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
      };
    }

    if (plague.overallSeverity < 70) {
      return {
        bg: 'bg-orange-950/40',
        border: 'border-orange-600/40',
        text: 'text-orange-400',
        barFilled: 'bg-orange-500',
        barEmpty: 'bg-orange-950/40',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]'
      };
    }

    // Critical
    return {
      bg: 'bg-red-950/40',
      border: 'border-red-600/40',
      text: 'text-red-400',
      barFilled: 'bg-red-500 animate-pulse',
      barEmpty: 'bg-red-950/40',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
    };
  };

  const colors = getColorScheme();
  const progressPercent = plague.state === AgentState.HEALTHY || plague.state === AgentState.INCUBATING
    ? 100
    : plague.overallSeverity;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClickDossier();
      }}
      className={`
        ${colors.bg} ${colors.border} ${colors.glow}
        backdrop-blur-md border rounded-lg
        px-4 py-2 transition-all cursor-pointer
        hover:bg-opacity-60 active:scale-[0.98]
        flex flex-col gap-1.5 min-w-[320px]
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className={colors.text} />
          <span className={`${colors.text} font-bold text-[10px] uppercase tracking-widest`}>
            {plague.state === AgentState.INFECTED
              ? `PLAGUE: ${getPlagueTypeLabel(plague.plagueType)}`
              : `HEALTH: ${healthStatus}`
            }
          </span>
        </div>
        {plague.state === AgentState.INFECTED && (
          <span className={`${colors.text} text-[9px] font-bold`}>
            Day {plague.daysInfected}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div
          className={`${colors.barFilled} h-full transition-all duration-500 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2">
          <span className="text-[9px] font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* Symptoms / Status */}
      {plague.state === AgentState.INFECTED && symptoms.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {symptoms.map((symptom, i) => (
            <span key={i} className={`${colors.text} font-medium`}>
              {symptom}
              {i < symptoms.length - 1 && <span className="mx-1">•</span>}
            </span>
          ))}
        </div>
      ) : plague.state === AgentState.INCUBATING ? (
        <div className="text-[10px] text-amber-400/60 font-medium">
          ⚠️ Minor fatigue
        </div>
      ) : null}

      {/* Survival Chance (only when infected) */}
      {plague.state === AgentState.INFECTED && (
        <div className="flex items-center justify-between text-[9px] border-t border-white/10 pt-1.5 mt-0.5">
          <span className={`${colors.text} opacity-60`}>
            Survival: {plague.survivalChance}%
          </span>
          <span className={`${colors.text} opacity-60`}>
            Click for details
          </span>
        </div>
      )}
    </button>
  );
};
