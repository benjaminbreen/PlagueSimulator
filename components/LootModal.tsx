import React, { useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Sparkles, X } from 'lucide-react';
import { ItemAppearance } from '../types';

// Types for loot modal system
export interface LootItem {
  itemId: string;
  itemName: string;
  description?: string;
  rarity: 'common' | 'uncommon' | 'rare';
  category: string;
  appearance?: ItemAppearance;
}

export interface LootModalData {
  type: 'shatter' | 'chest';
  sourceObjectName: string;  // "Clay Jar", "Wooden Crate", "Ornate Chest"
  sourceLocation?: string;   // "Market District", "Ibn Khalil's House"
  items: LootItem[];
  isTheft?: boolean;         // For chests - taking items might be theft
}

interface LootModalProps {
  data: LootModalData;
  onAccept: (items: LootItem[]) => void;
  onDecline: () => void;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: 'text-stone-300',
  uncommon: 'text-emerald-400',
  rare: 'text-amber-400',
};

const RARITY_BG = {
  common: 'bg-stone-800/50 border-stone-600/30',
  uncommon: 'bg-emerald-900/30 border-emerald-600/30',
  rare: 'bg-amber-900/30 border-amber-600/30',
};

const LootItemDisplay: React.FC<{ item: LootItem; index: number }> = ({ item, index }) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${RARITY_BG[item.rarity]} transition-all hover:scale-[1.02]`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-amber-800/30">
        <Package size={20} className={RARITY_COLORS[item.rarity]} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${RARITY_COLORS[item.rarity]}`}>
          {item.itemName}
        </div>
        <div className="text-[11px] text-amber-100/50 uppercase tracking-wider">
          {item.category} &middot; {item.rarity}
        </div>
      </div>
    </div>
  );
};

export const LootModal: React.FC<LootModalProps> = ({
  data,
  onAccept,
  onDecline,
  onClose
}) => {
  const { type, sourceObjectName, sourceLocation, items, isTheft } = data;

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
      e.preventDefault();
      onAccept(items);
    } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
      e.preventDefault();
      onDecline();
    }
  }, [items, onAccept, onDecline]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isShatter = type === 'shatter';
  const headerIcon = isShatter ? Sparkles : Package;
  const HeaderIcon = headerIcon;

  return (
    <div className="absolute inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div
        className="w-full max-w-md bg-gradient-to-b from-stone-900/95 via-stone-900/90 to-stone-950/95 border border-amber-800/40 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-900/30 bg-gradient-to-r from-amber-950/30 via-transparent to-amber-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-500/60">
              <HeaderIcon size={12} className="text-amber-500/70" />
              {isShatter ? 'Discovery' : 'Container'}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-amber-100/40 hover:text-amber-100/80 hover:bg-amber-900/30 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <h2 className="mt-2 text-xl text-amber-100 font-semibold tracking-tight">
            {isShatter ? (
              <>You broke the <span className="text-amber-400">{sourceObjectName}</span>!</>
            ) : (
              <>You opened the <span className="text-amber-400">{sourceObjectName}</span></>
            )}
          </h2>
          {sourceLocation && (
            <div className="mt-1 text-[11px] text-amber-100/40">
              in {sourceLocation}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {/* Found text */}
          <div className="text-sm text-amber-100/70 mb-4">
            {items.length === 0 ? (
              <span className="text-amber-100/50 italic">It was empty...</span>
            ) : items.length === 1 ? (
              <>You found something inside:</>
            ) : (
              <>You found {items.length} items inside:</>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2 mb-4">
              {items.map((item, i) => (
                <LootItemDisplay key={item.itemId} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Theft warning */}
          {isTheft && items.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/30 mb-4">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-[12px] text-red-200/80 leading-relaxed">
                Taking these items might be construed as <span className="text-red-400 font-medium">theft</span>.
                If witnessed, this could damage your reputation.
              </div>
            </div>
          )}

          {/* Action prompt */}
          {items.length > 0 && (
            <div className="text-center text-[11px] text-amber-100/50 mb-4">
              {isTheft ? 'Take the items?' : 'Pick up the items?'}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {items.length > 0 ? (
              <>
                <button
                  onClick={onDecline}
                  className="flex-1 px-4 py-2.5 rounded-lg text-[11px] uppercase tracking-widest bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 border border-stone-600/30 transition-colors"
                >
                  <span className="opacity-60 mr-1">[N]</span> Leave it
                </button>
                <button
                  onClick={() => onAccept(items)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-[11px] uppercase tracking-widest transition-colors ${
                    isTheft
                      ? 'bg-red-900/50 text-red-100 hover:bg-red-800/60 border border-red-700/40'
                      : 'bg-amber-800/70 text-amber-50 hover:bg-amber-700/70 border border-amber-600/40'
                  }`}
                >
                  <span className="opacity-60 mr-1">[Y]</span> {isTheft ? 'Take it' : 'Pick up'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg text-[11px] uppercase tracking-widest bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 border border-stone-600/30 transition-colors"
              >
                <span className="opacity-60 mr-1">[ESC]</span> Close
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-amber-900/20 bg-black/30">
          <div className="text-[10px] text-amber-100/30 text-center">
            Press <span className="text-amber-400/60">Y</span> to accept or <span className="text-amber-400/60">N</span> to decline
          </div>
        </div>
      </div>
    </div>
  );
};

export default LootModal;
