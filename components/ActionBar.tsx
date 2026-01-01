import React, { useState } from 'react';
import { ActionSlotState, ActionId, PLAYER_ACTIONS, PlayerStats, ItemAppearance } from '../types';
import { AlertTriangle, Heart, Eye, Sparkles, Coins, Cross, Package, Hand } from 'lucide-react';
import { NarratorPanel } from './NarratorPanel';
import { NarratorInput } from './NarratorInput';

interface ActionBarProps {
  actionSlots: ActionSlotState;
  onTriggerAction: (actionId: ActionId) => void;
  onTriggerPush?: () => void;
  simTime: number;
  playerStats: PlayerStats;
  narratorMessage?: string | null;
  narratorKey?: number;
  narratorHistory?: string[];
  narratorOpen?: boolean;
  onToggleNarrator?: (open: boolean) => void;
  mobileNarratorVisible?: boolean;
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
  onDropItemAtScreen?: (item: {
    inventoryId: string;
    itemId: string;
    label: string;
    appearance?: ItemAppearance;
  }, clientX: number, clientY: number) => void;
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
  hotkey: '1' | '2' | '3' | '4' | '5';
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
          bg-black/50 backdrop-blur-md
          border transition-all duration-200
          flex flex-col items-center justify-center gap-0.5
          ${isReady
            ? 'border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/20 cursor-pointer'
            : 'border-gray-700/30 cursor-not-allowed opacity-60'}
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

// Push button component
interface PushButtonProps {
  onTrigger: () => void;
}

const PushButton: React.FC<PushButtonProps> = ({ onTrigger }) => {
  return (
    <div className="relative group">
      <button
        onClick={onTrigger}
        className="
          relative w-14 h-14 rounded-lg
          bg-black/50 backdrop-blur-md
          border border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/20
          transition-all duration-200
          flex flex-col items-center justify-center gap-0.5
          hover:scale-105 active:scale-95 cursor-pointer
        "
      >
        {/* Icon */}
        <div className="relative z-10 text-amber-400">
          <Hand size={20} />
        </div>

        {/* Hotkey badge */}
        <div className="
          absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold
          flex items-center justify-center
          bg-amber-600 text-white
        ">
          1
        </div>
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
          <span className="text-amber-400 font-bold text-sm">Push</span>
          <span className="text-amber-600/60 text-[10px] uppercase tracking-wider">[1]</span>
        </div>
        <p className="text-amber-100/70 text-[10px] leading-relaxed">
          Push nearby objects with full force. Same as holding Shift until charged.
        </p>
      </div>
    </div>
  );
};

export const ActionBar: React.FC<ActionBarProps> = ({
  actionSlots,
  onTriggerAction,
  onTriggerPush,
  simTime,
  playerStats,
  narratorMessage,
  narratorKey,
  narratorHistory = [],
  narratorOpen = false,
  onToggleNarrator,
  mobileNarratorVisible = false,
  inventoryItems,
  onOpenItemModal,
  onDropItemAtScreen
}) => {
  const [showInventory, setShowInventory] = useState(false);
  const dragItemRef = React.useRef<null | ActionBarProps['inventoryItems'][number]>(null);
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [narratorVisible, setNarratorVisible] = useState(false);

  // Mobile collapsed state - auto-collapse after inactivity
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const autoCollapseTimerRef = React.useRef<number | null>(null);

  // Auto-collapse after 5 seconds of inactivity on mobile
  React.useEffect(() => {
    if (mobileExpanded) {
      if (autoCollapseTimerRef.current) {
        window.clearTimeout(autoCollapseTimerRef.current);
      }
      autoCollapseTimerRef.current = window.setTimeout(() => {
        setMobileExpanded(false);
      }, 5000);
    }
    return () => {
      if (autoCollapseTimerRef.current) {
        window.clearTimeout(autoCollapseTimerRef.current);
      }
    };
  }, [mobileExpanded]);

  // Reset timer on any action
  const resetAutoCollapse = () => {
    if (autoCollapseTimerRef.current) {
      window.clearTimeout(autoCollapseTimerRef.current);
    }
    if (mobileExpanded) {
      autoCollapseTimerRef.current = window.setTimeout(() => {
        setMobileExpanded(false);
      }, 5000);
    }
  };

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
    if (lower.includes('dagger') || lower.includes('scimitar') || lower.includes('sword')) return '🗡️';
    if (lower.includes('iron nail') || lower.includes('nail')) return '🔨';
    if (lower.includes('olive')) return '🫒';
    if (lower.includes('lemon')) return '🍋';
    if (lower.includes('fig') || lower.includes('dates') || lower.includes('apricot')) return '🍇';
    if (lower.includes('bread')) return '🥖';
    if (lower.includes('satchel') || lower.includes('bag')) return '🧺';
    if (lower.includes('water') || lower.includes('waterskin')) return '🪣';
    if (lower.includes('herb') || lower.includes('spice') || lower.includes('mint') || lower.includes('cumin') || lower.includes('cardamom') || lower.includes('saffron')) return '🫙';
    if (lower.includes('incense') || lower.includes('resin') || lower.includes('myrrh')) return '🪔';
    if (lower.includes('candle')) return '🕯️';
    if (lower.includes('lamp') || lower.includes('ewer') || lower.includes('bowl') || lower.includes('plate') || lower.includes('vessel') || lower.includes('amphora')) return '🏺';
    if (lower.includes('cloth') || lower.includes('robe') || lower.includes('headscarf') || lower.includes('tunic') || lower.includes('cloak') || lower.includes('kaftan')) return '🧵';
    if (lower.includes('manuscript') || lower.includes('book') || lower.includes('ledger')) return '📜';
    if (lower.includes('bell')) return '🔔';
    if (lower.includes('mirror')) return '🪞';
    if (lower.includes('rug') || lower.includes('carpet')) return '🧿';
    if (lower.includes('perfume') || lower.includes('rose water')) return '🧴';
    if (lower.includes('twine') || lower.includes('rope')) return '🪢';
    return '📦';
  };

  React.useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: PointerEvent) => {
      setDragPosition({ x: event.clientX, y: event.clientY });
    };
    const handleUp = (event: PointerEvent) => {
      if (dragItemRef.current && onDropItemAtScreen) {
        onDropItemAtScreen(
          {
            inventoryId: dragItemRef.current.id,
            itemId: dragItemRef.current.itemId,
            label: dragItemRef.current.name,
            appearance: dragItemRef.current.appearance
          },
          event.clientX,
          event.clientY
        );
      }
      dragItemRef.current = null;
      dragStartRef.current = null;
      setDragging(false);
      setDragPosition(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, onDropItemAtScreen]);

  // Keyboard listener for "2" key to toggle inventory
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '2') {
        e.preventDefault();
        setShowInventory(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-show/hide narrator based on message state
  React.useEffect(() => {
    // Show panel if narrator is open or there's a message
    const shouldBeVisible = narratorOpen || !!narratorMessage;

    // Only update state if it needs to change
    setNarratorVisible(prev => {
      if (prev !== shouldBeVisible) {
        return shouldBeVisible;
      }
      return prev;
    });
  }, [narratorMessage, narratorOpen]);

  return (
    <div className="fixed bottom-safe-sm md:bottom-6 right-4 md:right-6 z-40 pointer-events-auto">
      {dragging && dragItemRef.current && dragPosition && (
        <div
          className="fixed z-[120] pointer-events-none"
          style={{ left: dragPosition.x - 24, top: dragPosition.y - 24 }}
        >
          <div className="h-12 w-12 rounded-xl border border-amber-400/50 bg-black/80 text-amber-100 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            {getItemIcon(dragItemRef.current.name)}
          </div>
        </div>
      )}
      {/* Narrator Panel - Desktop: normal behavior, Mobile: controlled by toggle */}
      <div className={`
        absolute bottom-64 md:bottom-72 right-2 md:right-0 mb-3 flex flex-col items-end gap-4
        transition-all duration-300 z-40
        ${mobileNarratorVisible ? 'translate-x-0 opacity-100' : 'md:translate-x-0 md:opacity-100 translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none md:pointer-events-auto'}
      `}>
        {/* On desktop, show when narratorMessage/narratorOpen. On mobile, show when mobileNarratorVisible */}
        {((narratorMessage || narratorOpen) || mobileNarratorVisible) && (
          <NarratorPanel
            visible={narratorVisible}
            narratorKey={narratorKey}
            message={narratorMessage || narratorHistory[narratorHistory.length - 1] || ''}
            narratorOpen={narratorOpen}
            narratorHistory={narratorHistory}
          />
        )}
        <NarratorInput onOpen={() => onToggleNarrator?.(true)} />
      </div>
      <div
        className={`
          absolute bottom-20 md:bottom-24 right-0 w-[280px] md:w-[360px]
          max-w-[85vw]
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
                onPointerDown={(event) => {
                  if (isEmpty || !onDropItemAtScreen) return;
                  dragItemRef.current = item;
                  dragStartRef.current = { x: event.clientX, y: event.clientY };
                  setDragPosition({ x: event.clientX, y: event.clientY });
                }}
                onPointerUp={(event) => {
                  if (isEmpty) return;
                  if (dragStartRef.current && !dragging) {
                    onOpenItemModal(item);
                  }
                  dragStartRef.current = null;
                  dragItemRef.current = null;
                }}
                onPointerMove={(event) => {
                  if (!dragStartRef.current || dragging) return;
                  const dx = event.clientX - dragStartRef.current.x;
                  const dy = event.clientY - dragStartRef.current.y;
                  if (Math.hypot(dx, dy) > 6) {
                    setDragging(true);
                  }
                }}
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
      {/* Mobile: Collapsed toggle button - 44px minimum touch targets */}
      <div className="md:hidden">
        {!mobileExpanded ? (
          <button
            onClick={() => setMobileExpanded(true)}
            className="w-14 h-14 rounded-full bg-amber-600/90 backdrop-blur-md border border-amber-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <Package size={22} />
          </button>
        ) : (
          <div className="flex gap-1 items-center bg-black/70 backdrop-blur-md rounded-full p-1 border border-amber-800/40">
            {/* Push Button - Hotkey 1 */}
            {onTriggerPush && (
              <button
                onClick={() => { onTriggerPush(); resetAutoCollapse(); }}
                className="w-11 h-11 rounded-full bg-black/80 border border-amber-700/60 text-amber-400 flex items-center justify-center active:scale-95 transition-all"
              >
                <Hand size={18} />
              </button>
            )}
            {/* Inventory Button */}
            <button
              onClick={() => { setShowInventory((prev) => !prev); resetAutoCollapse(); }}
              className="w-11 h-11 rounded-full bg-black/80 border border-amber-700/60 text-amber-400 flex items-center justify-center active:scale-95 transition-all"
            >
              <Package size={18} />
            </button>
            {/* Action Slots */}
            <button
              onClick={() => { onTriggerAction(actionSlots.slot1); resetAutoCollapse(); }}
              className="w-11 h-11 rounded-full bg-black/80 border border-amber-700/60 text-amber-400 flex items-center justify-center active:scale-95 transition-all"
            >
              {getActionIcon(PLAYER_ACTIONS[actionSlots.slot1].icon, 18)}
            </button>
            <button
              onClick={() => { onTriggerAction(actionSlots.slot2); resetAutoCollapse(); }}
              className="w-11 h-11 rounded-full bg-black/80 border border-amber-700/60 text-amber-400 flex items-center justify-center active:scale-95 transition-all"
            >
              {getActionIcon(PLAYER_ACTIONS[actionSlots.slot2].icon, 18)}
            </button>
            <button
              onClick={() => { onTriggerAction(actionSlots.slot3); resetAutoCollapse(); }}
              className="w-11 h-11 rounded-full bg-black/80 border border-amber-700/60 text-amber-400 flex items-center justify-center active:scale-95 transition-all"
            >
              {getActionIcon(PLAYER_ACTIONS[actionSlots.slot3].icon, 18)}
            </button>
            {/* Close button */}
            <button
              onClick={() => setMobileExpanded(false)}
              className="w-9 h-9 rounded-full bg-stone-800/80 border border-stone-600/40 text-stone-400 flex items-center justify-center active:scale-95 transition-all ml-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Desktop: Full action bar */}
      <div className="hidden md:flex gap-2">
        {/* Push Button - Hotkey 1 */}
        {onTriggerPush && <PushButton onTrigger={onTriggerPush} />}

        {/* Inventory Button - Hotkey 2 */}
        <div className="relative group">
          <button
            onClick={() => setShowInventory((prev) => !prev)}
            className={`
              relative w-14 h-14 rounded-lg
              bg-black/50 backdrop-blur-md
              border transition-all duration-200
              flex flex-col items-center justify-center gap-0.5
              border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/20
              hover:scale-105 active:scale-95
            `}
          >
            <div className="relative z-10 text-amber-400">
              <Package size={20} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-amber-600 text-white">
              2
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
              <span className="text-amber-600/60 text-[10px] uppercase tracking-wider">[2]</span>
            </div>
            <p className="text-amber-100/70 text-[10px] leading-relaxed">
              Quick access to carried items.
            </p>
          </div>
        </div>

        {/* Action Slot 1 - Hotkey 3 */}
        <ActionButton
          actionId={actionSlots.slot1}
          hotkey="3"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot1] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot1)}
        />

        {/* Action Slot 2 - Hotkey 4 */}
        <ActionButton
          actionId={actionSlots.slot2}
          hotkey="4"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot2] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot2)}
        />

        {/* Action Slot 3 - Hotkey 5 */}
        <ActionButton
          actionId={actionSlots.slot3}
          hotkey="5"
          cooldownEnd={actionSlots.cooldowns[actionSlots.slot3] || 0}
          simTime={simTime}
          playerStats={playerStats}
          onTrigger={() => onTriggerAction(actionSlots.slot3)}
        />
      </div>

      {/* Label - desktop only */}
      <div className="hidden md:block text-center mt-1.5">
        <span className="text-[8px] text-amber-600/40 uppercase tracking-[0.2em]">Actions</span>
      </div>
    </div>
  );
};
