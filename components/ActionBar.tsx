import React, { useState } from 'react';
import { ActionSlotState, ActionId, PLAYER_ACTIONS, PlayerStats, ItemAppearance } from '../types';
import { AlertTriangle, Heart, Eye, Sparkles, Coins, Cross, Package } from 'lucide-react';

interface ActionBarProps {
  actionSlots: ActionSlotState;
  onTriggerAction: (actionId: ActionId) => void;
  simTime: number;
  playerStats: PlayerStats;
  inventoryItems: Array<{
    id: string;
    itemId: string;
    name: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare';
    category: string;
    appearance?: ItemAppearance;
  }>;
  onOpenItemModal: (item: {
    id: string;
    itemId: string;
    name: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare';
    category: string;
    appearance?: ItemAppearance;
  }) => void;
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
  playerStats,
  inventoryItems,
  onOpenItemModal
}) => {
  const [showInventory, setShowInventory] = useState(false);
  const itemsToShow = inventoryItems.slice(0, 8);
  const slots = [...itemsToShow];
  while (slots.length < 8) {
    slots.push({
      id: `empty-${slots.length}`,
      itemId: '',
      name: 'Empty',
      description: '',
      rarity: 'common',
      category: 'Empty'
    });
  }

  const getItemIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('dagger') || lower.includes('sword')) return '🗡️';
    if (lower.includes('bread') || lower.includes('fig') || lower.includes('olive') || lower.includes('apricot')) return '🥖';
    if (lower.includes('satchel') || lower.includes('bag')) return '🧺';
    if (lower.includes('water') || lower.includes('waterskin')) return '🪣';
    if (lower.includes('herb') || lower.includes('spice') || lower.includes('mint') || lower.includes('cumin')) return '🧪';
    if (lower.includes('candle')) return '🕯️';
    if (lower.includes('lamp')) return '🏺';
    if (lower.includes('cloth') || lower.includes('robe') || lower.includes('headscarf') || lower.includes('tunic')) return '🧵';
    return '📦';
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 pointer-events-auto">
      <div
        className={`
          absolute bottom-20 right-0 w-[320px]
          rounded-2xl border border-amber-700/40
          bg-black/85 backdrop-blur-lg shadow-2xl
          transition-all duration-200 origin-bottom-right
          ${showInventory ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3 pointer-events-none'}
        `}
      >
        <div className="px-4 py-3 border-b border-amber-800/40 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-amber-400/70">Inventory</div>
          <div className="text-[9px] text-amber-200/60">{inventoryItems.length} items</div>
        </div>
        <div className="p-3 grid grid-cols-4 gap-2">
          {slots.map((item) => {
            const isEmpty = item.itemId === '';
            return (
              <button
                key={item.id}
                onClick={() => !isEmpty && onOpenItemModal(item)}
                disabled={isEmpty}
                className={`
                  h-16 rounded-xl border
                  ${isEmpty ? 'border-white/5 bg-white/5 text-amber-200/20' : 'border-amber-600/40 bg-amber-600/10 hover:bg-amber-600/20 text-amber-100'}
                  flex flex-col items-center justify-center gap-1 text-[10px] transition-all
                `}
              >
                <div className="text-lg">{isEmpty ? '•' : getItemIcon(item.name)}</div>
                <div className="text-[9px] uppercase tracking-widest text-amber-200/70">
                  {isEmpty ? 'Empty' : item.name.length > 10 ? `${item.name.slice(0, 9)}…` : item.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
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
        <div className="relative group">
          <button
            onClick={() => setShowInventory((prev) => !prev)}
            className={`
              relative w-14 h-14 rounded-lg
              bg-black/80 backdrop-blur-md
              border transition-all duration-200
              flex flex-col items-center justify-center gap-0.5
              border-amber-700/60 hover:border-amber-500/80 hover:bg-amber-900/30
              hover:scale-105 active:scale-95
            `}
          >
            <div className="relative z-10 text-amber-400">
              <Package size={20} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-amber-600 text-white">
              4
            </div>
          </button>

          <div className="
            absolute bottom-full right-0 mb-2 w-40 p-2.5
            bg-black/95 backdrop-blur-md rounded-lg
            border border-amber-800/50 shadow-xl
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity duration-150
            z-50
          ">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-bold text-sm">Inventory</span>
              <span className="text-amber-600/60 text-[10px] uppercase tracking-wider">[4]</span>
            </div>
            <p className="text-amber-100/70 text-[10px] leading-relaxed">
              Quick access to carried items.
            </p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-center mt-1.5">
        <span className="text-[8px] text-amber-600/40 uppercase tracking-[0.2em]">Actions</span>
      </div>
    </div>
  );
};
