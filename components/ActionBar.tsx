import React from 'react';
import { ActionSlotState, ActionId, PLAYER_ACTIONS, PlayerStats } from '../types';
import { AlertTriangle, Heart, Eye, Sparkles, Coins, Cross } from 'lucide-react';

interface ActionBarProps {
  actionSlots: ActionSlotState;
  onTriggerAction: (actionId: ActionId) => void;
  simTime: number;
  playerStats: PlayerStats;
}

const getActionIcon = (iconName: string, size: number = 18) => {
  switch (iconName) {
    case 'AlertTriangle': return <AlertTriangle size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Eye': return <Eye size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Coins': return <Coins size={size} />;
    case 'Cross': return <Cross size={size} />;
    default: return <Eye size={size} />;
  }
};

interface ActionButtonProps {
  actionId: ActionId;
  hotkey: '1' | '2' | '3';
  cooldownEnd: number;
  simTime: number;
  playerStats: PlayerStats;
  onTrigger: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  actionId,
  hotkey,
  cooldownEnd,
  simTime,
  playerStats,
  onTrigger
}) => {
  const action = PLAYER_ACTIONS[actionId];
  const isOnCooldown = simTime < cooldownEnd;
  const cooldownRemaining = isOnCooldown ? Math.ceil(cooldownEnd - simTime) : 0;
  const meetsRequirements = !action.requiresCharisma || playerStats.charisma >= action.requiresCharisma;
  const isReady = !isOnCooldown && meetsRequirements;

  // Calculate cooldown progress for visual indicator
  const cooldownProgress = isOnCooldown && action.cooldownSeconds > 0
    ? (cooldownEnd - simTime) / action.cooldownSeconds
    : 0;

  return (
    <div className="relative group">
      <button
        onClick={() => isReady && onTrigger()}
        disabled={!isReady}
        className={`
          relative w-14 h-14 rounded-lg
          bg-black/80 backdrop-blur-md
          border transition-all duration-200
          flex flex-col items-center justify-center gap-0.5
          ${isReady
            ? 'border-amber-700/60 hover:border-amber-500/80 hover:bg-amber-900/30 cursor-pointer'
            : 'border-gray-700/40 cursor-not-allowed opacity-60'}
          ${isReady ? 'hover:scale-105 active:scale-95' : ''}
        `}
      >
        {/* Cooldown overlay */}
        {isOnCooldown && (
          <div
            className="absolute inset-0 bg-black/60 rounded-lg overflow-hidden"
            style={{
              clipPath: `inset(${(1 - cooldownProgress) * 100}% 0 0 0)`
            }}
          />
        )}

        {/* Icon */}
        <div className={`relative z-10 ${isReady ? 'text-amber-400' : 'text-gray-500'}`}>
          {getActionIcon(action.icon, 20)}
        </div>

        {/* Hotkey badge */}
        <div className={`
          absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold
          flex items-center justify-center
          ${isReady ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'}
        `}>
          {hotkey}
        </div>

        {/* Cooldown timer */}
        {isOnCooldown && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="text-white text-sm font-bold font-mono">
              {cooldownRemaining}s
            </span>
          </div>
        )}
      </button>

      {/* Tooltip */}
      <div className="
        absolute bottom-full right-0 mb-2 w-48 p-2.5
        bg-black/95 backdrop-blur-md rounded-lg
        border border-amber-800/50 shadow-xl
        opacity-0 group-hover:opacity-100
        pointer-events-none transition-opacity duration-150
        z-50
      ">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 font-bold text-sm">{action.name}</span>
          <span className="text-amber-600/60 text-[10px] uppercase tracking-wider">[{hotkey}]</span>
        </div>
        <p className="text-amber-100/70 text-[10px] leading-relaxed">
          {action.description}
        </p>
        {action.cooldownSeconds > 0 && (
          <div className="mt-1.5 text-[9px] text-amber-500/50 uppercase tracking-wider">
            Cooldown: {action.cooldownSeconds}s
          </div>
        )}
        {action.requiresCharisma && (
          <div className={`mt-1 text-[9px] uppercase tracking-wider ${
            meetsRequirements ? 'text-emerald-500/70' : 'text-red-500/70'
          }`}>
            Requires {action.requiresCharisma} Charisma
          </div>
        )}
      </div>
    </div>
  );
};

export const ActionBar: React.FC<ActionBarProps> = ({
  actionSlots,
  onTriggerAction,
  simTime,
  playerStats
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 pointer-events-auto">
      <div className="flex gap-2">
        <ActionButton
          actionId={actionSlots.slot1}
          hotkey="1"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot1] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot1)}
        />
        <ActionButton
          actionId={actionSlots.slot2}
          hotkey="2"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot2] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot2)}
        />
        <ActionButton
          actionId={actionSlots.slot3}
          hotkey="3"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot3] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot3)}
        />
      </div>

      {/* Label */}
      <div className="text-center mt-1.5">
        <span className="text-[8px] text-amber-600/40 uppercase tracking-[0.2em]">Actions</span>
      </div>
    </div>
  );
};
