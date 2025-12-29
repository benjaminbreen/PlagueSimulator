import React from 'react';
import { EventOption } from '../types';

interface EventOptionButtonProps {
  option: EventOption;
  index: number;
  disabled: boolean;
  disabledReason?: string;
  onSelect: (option: EventOption) => void;
}

export const EventOptionButton: React.FC<EventOptionButtonProps> = ({
  option,
  index,
  disabled,
  disabledReason,
  onSelect
}) => {
  return (
    <button
      onClick={() => onSelect(option)}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
        disabled
          ? 'bg-stone-900/40 border-stone-700/40 text-stone-500 cursor-not-allowed'
          : 'bg-black/60 border-amber-800/40 text-amber-100 hover:border-amber-500/70 hover:bg-amber-900/20 hover:shadow-[0_0_12px_rgba(251,191,36,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
            disabled ? 'bg-stone-800 text-stone-500' : 'bg-amber-900/60 text-amber-200'
          }`}>
            {index + 1}
          </div>
          <span className="text-sm leading-snug">{option.label}</span>
        </div>
        {option.consequenceText && (
          <span className="text-[10px] uppercase tracking-widest text-amber-400/60">
            {option.consequenceText}
          </span>
        )}
      </div>
      {disabled && disabledReason && (
        <div className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">
          {disabledReason}
        </div>
      )}
    </button>
  );
};
