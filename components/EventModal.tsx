import React, { useMemo, useEffect, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { EventInstance, PlayerStats, EventOption } from '../types';
import { EventOptionButton } from './EventOptionButton';

interface EventModalProps {
  event: EventInstance;
  playerStats: PlayerStats;
  onChoose: (option: EventOption) => void;
}

function getOptionState(option: EventOption, playerStats: PlayerStats): { disabled: boolean; reason?: string } {
  if (!option.requirements) return { disabled: false };
  const { stat, min, max } = option.requirements;
  const value = playerStats[stat] as number;

  if (min !== undefined && value < min) {
    return { disabled: true, reason: `Requires ${stat} ${min}+` };
  }
  if (max !== undefined && value > max) {
    return { disabled: true, reason: `Requires ${stat} ${max}-` };
  }
  return { disabled: false };
}

export const EventModal: React.FC<EventModalProps> = ({ event, playerStats, onChoose }) => {
  const options = useMemo(() => event.content.options.slice(0, 4), [event.content.options]);
  const [selectedOption, setSelectedOption] = useState<EventOption | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [event.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedOption) return;
      const index = Number(e.key) - 1;
      if (Number.isNaN(index) || index < 0 || index >= options.length) return;

      const option = options[index];
      const { disabled } = getOptionState(option, playerStats);
      if (!disabled) {
        setSelectedOption(option);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChoose, options, playerStats, selectedOption]);

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-black/90 via-black/80 to-black/90 border border-amber-800/50 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-6 py-5 border-b border-amber-900/40 bg-gradient-to-r from-amber-950/40 via-black/60 to-amber-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-amber-500/60">
              <AlertTriangle size={12} className="text-amber-500/70" />
              Decision
            </div>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400/50">
              <Sparkles size={12} />
              Press 1-4
            </div>
          </div>
          <h2 className="mt-3 text-2xl text-amber-100 font-semibold tracking-tight">{event.content.title}</h2>
        </div>
        <div className="px-6 py-6">
          <p className="text-[15px] text-amber-100/70 leading-relaxed mb-6">
            {event.content.body}
          </p>
          {selectedOption ? (
            <div className="rounded-xl border border-amber-800/40 bg-black/50 p-4">
              <div className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">Outcome</div>
              <p className="text-[14px] text-amber-100/80 leading-relaxed">
                {selectedOption.outcomeText || 'The moment passes without further incident.'}
              </p>
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={() => onChoose(selectedOption)}
                  className="px-4 py-2 rounded-md text-[11px] uppercase tracking-widest bg-amber-700/80 text-amber-50 hover:bg-amber-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((option, index) => {
                const { disabled, reason } = getOptionState(option, playerStats);
                return (
                    <EventOptionButton
                      key={option.id}
                      option={option}
                      index={index}
                      disabled={disabled}
                      disabledReason={reason}
                      onSelect={(chosen) => setSelectedOption(chosen)}
                    />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
