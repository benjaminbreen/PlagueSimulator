import React, { useState } from 'react';
import { MerchantNPC, PlayerStats, MerchantItem, PlayerItem } from '../types';
import { Coins, Package, ShoppingCart, TrendingUp, Sparkles, X } from 'lucide-react';

interface MerchantModalProps {
  merchant: MerchantNPC;
  playerStats: PlayerStats;
  onClose: () => void;
  onPurchase: (item: MerchantItem, quantity: number) => void;
  onSell: (playerItem: PlayerItem, quantity: number) => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  merchant,
  playerStats,
  onClose,
  onPurchase,
  onSell
}) => {
  const [selectedTab, setSelectedTab] = useState<'buy' | 'sell'>('buy');

  const getFinalPrice = (basePrice: number) => {
    return Math.round(basePrice * merchant.haggleModifier);
  };

  const getSellPrice = (basePrice: number) => {
    return Math.round(basePrice * 0.7);
  };

  const rarityMeta = {
    common: {
      border: 'border-gray-600/40',
      glow: 'hover:shadow-gray-500/20',
      text: 'text-gray-400',
      dot: 'bg-gray-500'
    },
    uncommon: {
      border: 'border-blue-500/40',
      glow: 'hover:shadow-blue-500/20',
      text: 'text-blue-400',
      dot: 'bg-blue-500'
    },
    rare: {
      border: 'border-purple-500/50',
      glow: 'hover:shadow-purple-500/30',
      text: 'text-purple-400',
      dot: 'bg-purple-500'
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-black/90 backdrop-blur-md border border-amber-800/50 rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] md:max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="border-b border-amber-900/40 bg-black/50 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl text-amber-100 font-semibold tracking-tight mb-1">
                {merchant.stats.name}
              </h2>
              <p className="text-xs text-amber-100/50 uppercase tracking-widest">
                {merchant.stats.profession}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-amber-500 hover:text-amber-400 transition-colors hover:bg-white/10 rounded-full -mr-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="bg-black/40 px-3 md:px-6 py-2 md:py-3 border-b border-amber-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-8 flex-wrap">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Coins size={14} className="text-amber-500 md:w-4 md:h-4" />
              <span className="hidden md:inline text-xs uppercase tracking-wider text-amber-500/60">Currency</span>
              <span className="text-amber-100 font-mono text-sm md:text-base font-semibold">{playerStats.currency}</span>
            </div>
            <div className="w-px h-4 md:h-5 bg-amber-800/30" />
            <div className="flex items-center gap-1.5 md:gap-2">
              <Package size={14} className="text-amber-500 md:w-4 md:h-4" />
              <span className="hidden md:inline text-xs uppercase tracking-wider text-amber-500/60">Inventory</span>
              <span className="text-amber-100 font-mono text-sm md:text-base font-semibold">
                {playerStats.inventory.reduce((sum, item) => sum + item.quantity, 0)}/{playerStats.maxInventorySlots}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-amber-900/30">
          <button
            onClick={() => setSelectedTab('buy')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'buy'
                ? 'bg-amber-700/90 text-white'
                : 'text-amber-200/50 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <ShoppingCart size={14} />
            Buy
          </button>
          <button
            onClick={() => setSelectedTab('sell')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'sell'
                ? 'bg-amber-700/90 text-white'
                : 'text-amber-200/50 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <TrendingUp size={14} />
            Sell
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'buy' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchant.inventory.items.map((item) => {
                const finalPrice = getFinalPrice(item.basePrice);
                const canAfford = playerStats.currency >= finalPrice;
                const hasSpace = playerStats.inventory.reduce((sum, i) => sum + i.quantity, 0) < playerStats.maxInventorySlots;
                const meta = rarityMeta[item.rarity];

                return (
                  <div
                    key={item.id}
                    className={`bg-black/60 backdrop-blur-sm border ${meta.border} rounded-lg p-4 transition-all ${meta.glow} hover:border-amber-600/60 shadow-lg relative`}
                  >
                    {/* Rarity Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></div>
                      <span className={`text-[9px] font-semibold uppercase tracking-widest ${meta.text}`}>
                        {item.rarity}
                      </span>
                    </div>

                    <div className="pr-20 mb-3">
                      <h3 className="text-sm font-semibold text-amber-100 mb-1.5">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-amber-100/50 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    {/* Effects */}
                    {item.effects && item.effects.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {item.effects.map((effect, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                            <Sparkles size={11} className="text-emerald-500" />
                            {effect.type === 'heal' ? `+${effect.value} Health` : `+${effect.value} ${effect.type}`}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Price & Stock */}
                    <div className="flex justify-between items-center mb-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Coins size={13} className="text-amber-500" />
                        <span className="text-amber-100 font-mono font-semibold text-sm">{finalPrice}</span>
                      </div>
                      <div className="text-[10px] text-amber-100/40 uppercase tracking-wider">
                        Stock: <span className="font-mono text-amber-100/60">{item.quantity}</span>
                      </div>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => onPurchase(item, 1)}
                      disabled={!canAfford || !hasSpace || item.quantity === 0}
                      className={`w-full py-2.5 rounded font-semibold text-[10px] tracking-widest uppercase transition-all ${
                        canAfford && hasSpace && item.quantity > 0
                          ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-md active:scale-[0.98]'
                          : 'bg-white/5 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {item.quantity === 0 ? 'Out of Stock' : !canAfford ? 'Insufficient Funds' : !hasSpace ? 'Inventory Full' : 'Purchase'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerStats.inventory.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <Package size={56} className="text-amber-900/20 mb-4" />
                  <div className="text-amber-100/30 text-sm uppercase tracking-widest font-medium">
                    Inventory Empty
                  </div>
                </div>
              ) : (
                playerStats.inventory.map((playerItem) => {
                  const baseItem = merchant.inventory.items.find(i => i.id === playerItem.itemId);
                  if (!baseItem) return null;

                  const sellPrice = getSellPrice(baseItem.basePrice);
                  const meta = rarityMeta[baseItem.rarity];

                  return (
                    <div
                      key={playerItem.id}
                      className={`bg-black/60 backdrop-blur-sm border ${meta.border} rounded-lg p-4 transition-all ${meta.glow} hover:border-green-600/60 shadow-lg relative`}
                    >
                      {/* Rarity Indicator */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></div>
                        <span className={`text-[9px] font-semibold uppercase tracking-widest ${meta.text}`}>
                          {baseItem.rarity}
                        </span>
                      </div>

                      <div className="pr-20 mb-3">
                        <h3 className="text-sm font-semibold text-amber-100 mb-1.5">
                          {baseItem.name}
                        </h3>
                        <p className="text-[11px] text-amber-100/50 leading-snug">
                          {baseItem.description}
                        </p>
                      </div>

                      {/* Price & Quantity */}
                      <div className="flex justify-between items-center mb-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Coins size={13} className="text-green-500" />
                          <span className="text-green-400 font-mono font-semibold text-sm">{sellPrice}</span>
                        </div>
                        <div className="text-[10px] text-amber-100/40 uppercase tracking-wider">
                          Owned: <span className="font-mono text-amber-100/60">{playerItem.quantity}</span>
                        </div>
                      </div>

                      {/* Sell Button */}
                      <button
                        onClick={() => onSell(playerItem, 1)}
                        className="w-full bg-green-700 hover:bg-green-600 text-white py-2.5 rounded font-semibold text-[10px] tracking-widest uppercase transition-all shadow-md active:scale-[0.98]"
                      >
                        Sell
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
