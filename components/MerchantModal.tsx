import React, { useState } from 'react';
import { MerchantNPC, PlayerStats, MerchantItem, PlayerItem, MerchantType, CompoundRecipe } from '../types';
import { Coins, Package, ShoppingCart, TrendingUp, Sparkles, X, FlaskConical, Scale, LayoutGrid, List, BookOpen } from 'lucide-react';
import { ApothecaryCompoundingPanel } from './ApothecaryCompoundingPanel';
import { ItemIcon } from './items/ItemIcon';

interface MerchantModalProps {
  merchant: MerchantNPC;
  playerStats: PlayerStats;
  onClose: () => void;
  onPurchase: (item: MerchantItem, quantity: number) => void;
  onSell: (playerItem: PlayerItem, quantity: number) => void;
  onCompound?: (recipe: CompoundRecipe, totalCost: number, ingredientsToBuy: { name: string; price: number }[]) => void;
}

type ViewMode = 'grid' | 'list' | 'ledger';

export const MerchantModal: React.FC<MerchantModalProps> = ({
  merchant,
  playerStats,
  onClose,
  onPurchase,
  onSell,
  onCompound
}) => {
  const [selectedTab, setSelectedTab] = useState<'buy' | 'sell' | 'compound'>('buy');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const isApothecary = merchant.type === MerchantType.APOTHECARY;

  const getFinalPrice = (basePrice: number) => {
    return Math.round(basePrice * merchant.haggleModifier);
  };

  const getSellPrice = (basePrice: number) => {
    return Math.round(basePrice * 0.7);
  };

  const rarityMeta = {
    common: {
      border: 'border-slate-600/30',
      bg: 'bg-slate-800/20',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      glow: '',
      rowBg: 'hover:bg-slate-800/30'
    },
    uncommon: {
      border: 'border-sky-500/30',
      bg: 'bg-sky-900/10',
      text: 'text-sky-400',
      dot: 'bg-sky-400',
      glow: 'shadow-[0_0_12px_rgba(56,189,248,0.15)]',
      rowBg: 'hover:bg-sky-900/20'
    },
    rare: {
      border: 'border-purple-500/40',
      bg: 'bg-purple-900/15',
      text: 'text-purple-400',
      dot: 'bg-purple-400',
      glow: 'shadow-[0_0_16px_rgba(168,85,247,0.2)]',
      rowBg: 'hover:bg-purple-900/20'
    }
  };

  const tabs = [
    { id: 'buy' as const, label: 'Buy', icon: ShoppingCart },
    { id: 'sell' as const, label: 'Sell', icon: TrendingUp },
    ...(isApothecary && onCompound ? [{ id: 'compound' as const, label: 'Compound', icon: FlaskConical }] : [])
  ];

  const viewModes = [
    { id: 'grid' as const, icon: LayoutGrid, label: 'Grid' },
    { id: 'list' as const, icon: List, label: 'List' },
    { id: 'ledger' as const, icon: BookOpen, label: 'Ledger' }
  ];

  // Render buy item based on view mode
  const renderBuyItem = (item: MerchantItem) => {
    const finalPrice = getFinalPrice(item.basePrice);
    const canAfford = playerStats.currency >= finalPrice;
    const hasSpace = playerStats.inventory.reduce((sum, i) => sum + i.quantity, 0) < playerStats.maxInventorySlots;
    const meta = rarityMeta[item.rarity];
    const canBuy = canAfford && hasSpace && item.quantity > 0;

    if (viewMode === 'grid') {
      return (
        <div
          key={item.id}
          className={`rounded-xl border ${meta.border} ${meta.bg} ${meta.glow} p-4 transition-all hover:border-amber-500/40 backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-black/30 border border-amber-800/30 flex items-center justify-center shrink-0">
              <ItemIcon name={item.name} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-100 leading-tight">{item.name}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${meta.text}`}>{item.rarity}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-amber-100/50 leading-relaxed mb-3">{item.description}</p>
          {item.effects && item.effects.length > 0 && (
            <div className="mb-3 space-y-1">
              {item.effects.map((effect, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <Sparkles size={10} className="text-emerald-500" />
                  {effect.type === 'heal' ? `+${effect.value} Health` : `+${effect.value} ${effect.type}`}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-amber-500" />
              <span className="text-amber-100 font-mono font-bold">{finalPrice}</span>
            </div>
            <div className="text-[10px] text-amber-200/40 uppercase tracking-wider">
              Stock: <span className="font-mono text-amber-200/60">{item.quantity}</span>
            </div>
          </div>
          <button
            onClick={() => onPurchase(item, 1)}
            disabled={!canBuy}
            className={`w-full mt-2 py-2.5 rounded-lg font-semibold text-[10px] tracking-widest uppercase transition-all ${
              canBuy
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md hover:shadow-amber-500/25 active:scale-[0.98]'
                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {item.quantity === 0 ? 'Out of Stock' : !canAfford ? 'Insufficient Funds' : !hasSpace ? 'Inventory Full' : 'Purchase'}
          </button>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          className={`flex items-center gap-4 p-3 rounded-lg border ${meta.border} ${meta.bg} transition-all hover:border-amber-500/40`}
        >
          <div className="w-9 h-9 rounded-lg bg-black/30 border border-amber-800/30 flex items-center justify-center shrink-0">
            <ItemIcon name={item.name} size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <h3 className="text-sm font-semibold text-amber-100 truncate">{item.name}</h3>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${meta.text}`}>{item.rarity}</span>
            </div>
            <p className="text-[10px] text-amber-100/40 truncate mt-0.5">{item.description}</p>
          </div>
          {item.effects && item.effects.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-[10px] text-emerald-400">
              <Sparkles size={10} />
              <span>{item.effects.map(e => e.type === 'heal' ? `+${e.value}HP` : `+${e.value}`).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-amber-200/50 text-[10px]">
            <span>x{item.quantity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coins size={14} className="text-amber-500" />
            <span className="text-amber-100 font-mono font-bold">{finalPrice}</span>
          </div>
          <button
            onClick={() => onPurchase(item, 1)}
            disabled={!canBuy}
            className={`px-4 py-2 rounded-lg font-semibold text-[10px] tracking-widest uppercase transition-all ${
              canBuy
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-white/5 text-slate-500 cursor-not-allowed'
            }`}
          >
            {canBuy ? 'Buy' : 'N/A'}
          </button>
        </div>
      );
    }

    // Ledger mode - rendered as table rows
    return null;
  };

  // Render sell item based on view mode
  const renderSellItem = (playerItem: PlayerItem) => {
    const baseItem = merchant.inventory.items.find(i => i.id === playerItem.itemId);
    if (!baseItem) return null;

    const sellPrice = getSellPrice(baseItem.basePrice);
    const meta = rarityMeta[baseItem.rarity];

    if (viewMode === 'grid') {
      return (
        <div
          key={playerItem.id}
          className={`rounded-xl border ${meta.border} ${meta.bg} ${meta.glow} p-4 transition-all hover:border-emerald-500/40 backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-black/30 border border-emerald-800/30 flex items-center justify-center shrink-0">
              <ItemIcon name={baseItem.name} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-100 leading-tight">{baseItem.name}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${meta.text}`}>{baseItem.rarity}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-amber-100/50 leading-relaxed mb-3">{baseItem.description}</p>
          <div className="flex justify-between items-center py-2 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-emerald-500" />
              <span className="text-emerald-400 font-mono font-bold">{sellPrice}</span>
            </div>
            <div className="text-[10px] text-amber-200/40 uppercase tracking-wider">
              Owned: <span className="font-mono text-amber-200/60">{playerItem.quantity}</span>
            </div>
          </div>
          <button
            onClick={() => onSell(playerItem, 1)}
            className="w-full mt-2 py-2.5 rounded-lg font-semibold text-[10px] tracking-widest uppercase transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-500/25 active:scale-[0.98]"
          >
            Sell for {sellPrice}
          </button>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div
          key={playerItem.id}
          className={`flex items-center gap-4 p-3 rounded-lg border ${meta.border} ${meta.bg} transition-all hover:border-emerald-500/40`}
        >
          <div className="w-9 h-9 rounded-lg bg-black/30 border border-emerald-800/30 flex items-center justify-center shrink-0">
            <ItemIcon name={baseItem.name} size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <h3 className="text-sm font-semibold text-amber-100 truncate">{baseItem.name}</h3>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${meta.text}`}>{baseItem.rarity}</span>
            </div>
            <p className="text-[10px] text-amber-100/40 truncate mt-0.5">{baseItem.description}</p>
          </div>
          <div className="flex items-center gap-2 text-amber-200/50 text-[10px]">
            <span>x{playerItem.quantity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coins size={14} className="text-emerald-500" />
            <span className="text-emerald-400 font-mono font-bold">{sellPrice}</span>
          </div>
          <button
            onClick={() => onSell(playerItem, 1)}
            className="px-4 py-2 rounded-lg font-semibold text-[10px] tracking-widest uppercase transition-all bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Sell
          </button>
        </div>
      );
    }

    return null;
  };

  // Ledger view component
  const LedgerView = ({ items, mode }: { items: MerchantItem[] | PlayerItem[]; mode: 'buy' | 'sell' }) => {
    const isBuy = mode === 'buy';

    return (
      <div className="rounded-xl border border-amber-900/30 overflow-hidden" style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(120,80,40,0.08), rgba(80,50,20,0.12))',
      }}>
        {/* Ledger header with decorative elements */}
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-amber-600/70 font-semibold">
              {isBuy ? 'Merchant Inventory' : 'Your Goods'}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[36px_2fr_3fr_1fr_1fr_100px] gap-2 px-4 py-2 border-b border-amber-900/20 bg-black/20 text-[9px] uppercase tracking-widest text-amber-500/60 font-semibold">
          <div></div>
          <div>Item</div>
          <div>Description</div>
          <div className="text-center">{isBuy ? 'Stock' : 'Owned'}</div>
          <div className="text-right">Price</div>
          <div className="text-center">Action</div>
        </div>

        {/* Ledger rows */}
        <div className="divide-y divide-amber-900/10">
          {(items as any[]).map((item, index) => {
            const actualItem = isBuy ? item as MerchantItem : merchant.inventory.items.find(i => i.id === (item as PlayerItem).itemId);
            if (!actualItem) return null;

            const price = isBuy ? getFinalPrice(actualItem.basePrice) : getSellPrice(actualItem.basePrice);
            const quantity = isBuy ? actualItem.quantity : (item as PlayerItem).quantity;
            const meta = rarityMeta[actualItem.rarity];
            const canAfford = playerStats.currency >= price;
            const hasSpace = playerStats.inventory.reduce((sum, i) => sum + i.quantity, 0) < playerStats.maxInventorySlots;
            const canBuy = isBuy && canAfford && hasSpace && actualItem.quantity > 0;

            return (
              <div
                key={isBuy ? actualItem.id : (item as PlayerItem).id}
                className={`grid grid-cols-[36px_2fr_3fr_1fr_1fr_100px] gap-2 px-4 py-3 items-center transition-colors ${meta.rowBg} ${index % 2 === 0 ? 'bg-black/5' : ''}`}
              >
                <div className="w-8 h-8 rounded bg-black/30 border border-amber-800/20 flex items-center justify-center">
                  <ItemIcon name={actualItem.name} size={20} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
                  <span className="text-sm text-amber-100 font-medium truncate">{actualItem.name}</span>
                </div>
                <div className="text-[11px] text-amber-200/50 truncate pr-2">
                  {actualItem.description}
                  {actualItem.effects && actualItem.effects.length > 0 && (
                    <span className="ml-2 text-emerald-400">
                      ({actualItem.effects.map(e => e.type === 'heal' ? `+${e.value}HP` : `+${e.value}`).join(', ')})
                    </span>
                  )}
                </div>
                <div className="text-center text-amber-200/60 font-mono text-sm">{quantity}</div>
                <div className="text-right flex items-center justify-end gap-1">
                  <Coins size={12} className={isBuy ? 'text-amber-500' : 'text-emerald-500'} />
                  <span className={`font-mono font-bold text-sm ${isBuy ? 'text-amber-100' : 'text-emerald-400'}`}>{price}</span>
                </div>
                <div className="flex justify-center">
                  {isBuy ? (
                    <button
                      onClick={() => onPurchase(actualItem, 1)}
                      disabled={!canBuy}
                      className={`px-3 py-1.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all ${
                        canBuy
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {actualItem.quantity === 0 ? 'None' : !canAfford ? 'Poor' : !hasSpace ? 'Full' : 'Buy'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSell(item as PlayerItem, 1)}
                      className="px-3 py-1.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ledger footer with totals */}
        <div className="bg-amber-950/30 border-t border-amber-900/40 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] text-amber-500/60">
            <span>{(items as any[]).length} {isBuy ? 'items available' : 'items to sell'}</span>
            <div className="flex items-center gap-4">
              {isBuy && (
                <span>
                  Total value: <span className="text-amber-300 font-mono font-semibold">
                    {(items as MerchantItem[]).reduce((sum, item) => sum + getFinalPrice(item.basePrice) * item.quantity, 0)}
                  </span>
                </span>
              )}
              {!isBuy && (
                <span>
                  Potential earnings: <span className="text-emerald-400 font-mono font-semibold">
                    {(items as PlayerItem[]).reduce((sum, item) => {
                      const baseItem = merchant.inventory.items.find(i => i.id === item.itemId);
                      return sum + (baseItem ? getSellPrice(baseItem.basePrice) * item.quantity : 0);
                    }, 0)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-end p-6 md:p-10 pointer-events-auto">
      {/* Backdrop with radial gradient mask */}
      <div
        className="absolute inset-0 backdrop-blur-md -z-10"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 35% 50% at 25% 50%, transparent 20%, black 65%)',
          maskImage: 'radial-gradient(ellipse 35% 50% at 25% 50%, transparent 20%, black 65%)'
        }}
      />
      <div className="absolute inset-0 bg-black/60 -z-20" onClick={onClose} />

      {/* Main Modal */}
      <div className="w-full max-w-5xl max-h-[92vh] md:max-h-[88vh] bg-slate-950/80 border border-amber-900/40 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-4 md:p-6 border-b border-amber-900/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
                <Scale size={24} className="text-amber-500" />
              </div>
              <div>
                <h2 className="historical-font text-amber-400 text-xl md:text-2xl tracking-widest">
                  {merchant.stats.name}
                </h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/40 mt-0.5">
                  {merchant.stats.profession}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 transition-colors -mr-2"
            >
              <X size={22} />
            </button>
          </div>

          {/* Player Stats Bar */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-700/30 flex items-center justify-center">
                <Coins size={16} className="text-amber-500" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-amber-500/50">Your Gold</div>
                <div className="text-amber-100 font-mono font-semibold">{playerStats.currency}</div>
              </div>
            </div>
            <div className="w-px h-8 bg-amber-800/20" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-700/30 flex items-center justify-center">
                <Package size={16} className="text-amber-500" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-amber-500/50">Inventory</div>
                <div className="text-amber-100 font-mono font-semibold">
                  {playerStats.inventory.reduce((sum, item) => sum + item.quantity, 0)}/{playerStats.maxInventorySlots}
                </div>
              </div>
            </div>
            {merchant.haggleModifier !== 1 && (
              <>
                <div className="w-px h-8 bg-amber-800/20" />
                <div className="flex items-center gap-2">
                  <div className={`text-[9px] uppercase tracking-widest ${merchant.haggleModifier < 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {merchant.haggleModifier < 1 ? 'Discount' : 'Markup'}: {Math.abs(Math.round((1 - merchant.haggleModifier) * 100))}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs and View Mode */}
        <div className="px-4 md:px-6 py-3 border-b border-amber-900/20 bg-black/20 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-amber-600/30 p-1 text-[10px] uppercase tracking-[0.25em]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              const isCompound = tab.id === 'compound';
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-4 py-2 rounded-full transition-all font-semibold flex items-center gap-2 ${
                    isActive
                      ? isCompound
                        ? 'bg-purple-500/80 text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                        : 'bg-amber-500/90 text-black shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                      : isCompound
                        ? 'text-purple-300/60 hover:text-purple-200 hover:bg-purple-900/25'
                        : 'text-amber-200/60 hover:text-amber-200 hover:bg-amber-900/25'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          {selectedTab !== 'compound' && (
            <div className="flex items-center gap-1 rounded-lg bg-black/30 border border-amber-800/20 p-1">
              {viewModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`p-2 rounded transition-all ${
                      isActive
                        ? 'bg-amber-600/80 text-white'
                        : 'text-amber-400/50 hover:text-amber-300 hover:bg-amber-900/20'
                    }`}
                    title={mode.label}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {selectedTab === 'compound' && isApothecary && onCompound ? (
            <ApothecaryCompoundingPanel
              playerInventory={playerStats.inventory}
              merchantInventory={merchant.inventory.items}
              playerCurrency={playerStats.currency}
              onCompound={onCompound}
            />
          ) : selectedTab === 'buy' ? (
            viewMode === 'ledger' ? (
              <LedgerView items={merchant.inventory.items} mode="buy" />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
                {merchant.inventory.items.map(item => renderBuyItem(item))}
              </div>
            )
          ) : (
            playerStats.inventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-amber-900/10 border border-amber-800/20 flex items-center justify-center mb-4">
                  <Package size={40} className="text-amber-900/30" />
                </div>
                <div className="text-amber-200/30 text-sm uppercase tracking-widest font-medium">
                  Your inventory is empty
                </div>
                <p className="text-amber-200/20 text-xs mt-2">Purchase items to sell them later</p>
              </div>
            ) : viewMode === 'ledger' ? (
              <LedgerView items={playerStats.inventory} mode="sell" />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
                {playerStats.inventory.map(item => renderSellItem(item))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
