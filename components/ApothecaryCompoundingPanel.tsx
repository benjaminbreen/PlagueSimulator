import React, { useState, useMemo } from 'react';
import { Check, X, Beaker, Coins, ShoppingCart, Filter, Sparkles, FlaskConical } from 'lucide-react';
import {
  CompoundRecipe,
  CompoundCategory,
  PlayerItem,
  MerchantItem,
  ItemEffect
} from '../types';
import {
  COMPOUND_RECIPES,
  COMPOUND_CATEGORIES,
  checkIngredients,
  getCategoryInfo
} from '../utils/apothecaryRecipes';
import { getItemDetailsByItemId, findItemByName } from '../utils/merchantItems';

interface ApothecaryCompoundingPanelProps {
  playerInventory: PlayerItem[];
  merchantInventory: MerchantItem[];
  playerCurrency: number;
  onCompound: (recipe: CompoundRecipe, totalCost: number, ingredientsToBuy: { name: string; price: number }[]) => void;
}

const CategoryTab: React.FC<{
  category: CompoundCategory | 'all';
  label: string;
  labelAr?: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ category, label, labelAr, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      isActive
        ? 'bg-amber-700 text-amber-100 shadow-lg'
        : 'bg-amber-900/30 text-amber-300 hover:bg-amber-800/40'
    }`}
  >
    <span>{label}</span>
    {labelAr && (
      <span className="block text-xs opacity-70" dir="rtl">{labelAr}</span>
    )}
  </button>
);

const RecipeCard: React.FC<{
  recipe: CompoundRecipe;
  playerInventory: { name: string; quantity: number }[];
  merchantInventory: MerchantItem[];
  playerCurrency: number;
  onCompound: (recipe: CompoundRecipe, totalCost: number, ingredientsToBuy: { name: string; price: number }[]) => void;
}> = ({ recipe, playerInventory, merchantInventory, playerCurrency, onCompound }) => {
  const ingredientCheck = checkIngredients(recipe, playerInventory);

  // Calculate cost of missing ingredients from merchant
  const ingredientsToBuy: { name: string; price: number; available: boolean }[] = [];
  let buyingCost = 0;

  for (const missing of ingredientCheck.missing) {
    const merchantItem = merchantInventory.find(i => i.name === missing && i.quantity > 0);
    if (merchantItem) {
      ingredientsToBuy.push({ name: missing, price: merchantItem.basePrice, available: true });
      buyingCost += merchantItem.basePrice;
    } else {
      ingredientsToBuy.push({ name: missing, price: 0, available: false });
    }
  }

  const totalCost = recipe.fee + buyingCost;
  const canAfford = playerCurrency >= totalCost;
  const allIngredientsAvailable = ingredientsToBuy.every(i => i.available || ingredientCheck.available.find(a => a.name === i.name && a.have >= a.need));
  const canCompound = (ingredientCheck.hasAll || (allIngredientsAvailable && ingredientsToBuy.every(i => i.available))) && canAfford;

  // Format effect for display
  const formatEffect = (effect: ItemEffect): string => {
    if (effect.type === 'symptomRelief' && effect.stat) {
      if (effect.stat === 'all') return `All symptoms ${effect.value}`;
      if (effect.stat === 'survivalChance') return `Survival +${effect.value}%`;
      const change = effect.value < 0 ? effect.value : `+${effect.value}`;
      return `${effect.stat.charAt(0).toUpperCase() + effect.stat.slice(1)} ${change}`;
    }
    if (effect.type === 'heal') {
      return `Heal +${effect.value}`;
    }
    if (effect.type === 'plagueProtection' && effect.duration) {
      return `${effect.value}% protection (${effect.duration}h)`;
    }
    if (effect.type === 'debuff' && effect.stat === 'weakness') {
      return `Weakness +${effect.value}`;
    }
    return '';
  };

  const positiveEffects = recipe.effects.filter(e =>
    (e.type === 'symptomRelief' && e.value < 0) ||
    (e.type === 'symptomRelief' && e.stat === 'survivalChance') ||
    e.type === 'heal' ||
    e.type === 'plagueProtection'
  );
  const negativeEffects = recipe.effects.filter(e => e.type === 'debuff');

  return (
    <div className={`rounded-lg border-2 ${
      ingredientCheck.hasAll
        ? 'border-emerald-700/50 bg-gradient-to-b from-emerald-950/30 to-stone-900/60'
        : 'border-amber-800/30 bg-gradient-to-b from-amber-950/30 to-stone-900/60'
    } overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {ingredientCheck.hasAll ? (
                <Check size={18} className="text-emerald-400" />
              ) : (
                <X size={18} className="text-amber-500" />
              )}
              <h3 className="text-lg font-bold text-amber-100" style={{ fontFamily: 'Cinzel, serif' }}>
                {recipe.nameEn}
              </h3>
            </div>
            <p className="text-amber-200/70 text-base mt-0.5" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
              {recipe.nameAr}
              <span className="text-amber-400/50 text-sm ml-2">({recipe.transliteration})</span>
            </p>
          </div>
          <div className="text-right">
            <span className="px-2 py-1 rounded bg-amber-900/40 text-amber-300 text-xs">
              {getCategoryInfo(recipe.category)?.nameEn}
            </span>
          </div>
        </div>

        <p className="text-amber-100/70 text-sm mt-3 italic leading-relaxed">
          "{recipe.description}"
        </p>

        {/* Ingredients */}
        <div className="mt-4 bg-stone-900/50 rounded-lg p-3 border border-amber-900/30">
          <h4 className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Beaker size={12} />
            Required Ingredients
          </h4>
          <ul className="space-y-1.5">
            {ingredientCheck.available.map((ing, i) => {
              const hasEnough = ing.have >= ing.need;
              const merchantItem = merchantInventory.find(m => m.name === ing.name && m.quantity > 0);

              return (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {hasEnough ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <X size={14} className="text-red-400" />
                    )}
                    <span className={hasEnough ? 'text-emerald-200' : 'text-red-300'}>
                      {ing.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ing.have}/{ing.need}
                    </span>
                    {!hasEnough && merchantItem && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <ShoppingCart size={10} />
                        Buy: {merchantItem.basePrice}
                      </span>
                    )}
                    {!hasEnough && !merchantItem && (
                      <span className="text-xs text-stone-500">Not in stock</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Effects */}
        <div className="mt-3 flex flex-wrap gap-2">
          {positiveEffects.map((effect, i) => (
            <span key={i} className="px-2 py-1 bg-emerald-900/40 text-emerald-300 text-xs rounded-full">
              {formatEffect(effect)}
            </span>
          ))}
          {negativeEffects.map((effect, i) => (
            <span key={i} className="px-2 py-1 bg-red-900/40 text-red-300 text-xs rounded-full">
              {formatEffect(effect)}
            </span>
          ))}
        </div>

        {/* Cost & Action */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-amber-900/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-amber-400" />
              <span className="text-amber-200 text-sm">Fee: {recipe.fee}</span>
            </div>
            {buyingCost > 0 && (
              <div className="flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-amber-400" />
                <span className="text-amber-200 text-sm">+ {buyingCost} ingredients</span>
              </div>
            )}
            <span className={`font-semibold ${canAfford ? 'text-amber-100' : 'text-red-400'}`}>
              = {totalCost} total
            </span>
          </div>

          <button
            onClick={() => onCompound(recipe, totalCost, ingredientsToBuy.filter(i => i.available).map(i => ({ name: i.name, price: i.price })))}
            disabled={!canCompound}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
              canCompound
                ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <FlaskConical size={14} />
            {ingredientCheck.hasAll ? 'Compound' : 'Buy & Compound'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ApothecaryCompoundingPanel: React.FC<ApothecaryCompoundingPanelProps> = ({
  playerInventory,
  merchantInventory,
  playerCurrency,
  onCompound
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CompoundCategory | 'all'>('all');

  // Convert player inventory to name/quantity format
  const inventoryByName = useMemo(() => {
    const result: { name: string; quantity: number }[] = [];
    for (const item of playerInventory) {
      const details = getItemDetailsByItemId(item.itemId);
      if (details) {
        const existing = result.find(r => r.name === details.name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          result.push({ name: details.name, quantity: item.quantity });
        }
      }
    }
    return result;
  }, [playerInventory]);

  // Filter recipes by category
  const filteredRecipes = useMemo(() => {
    if (selectedCategory === 'all') return COMPOUND_RECIPES;
    return COMPOUND_RECIPES.filter(r => r.category === selectedCategory);
  }, [selectedCategory]);

  // Sort recipes: those with all ingredients first
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      const aCheck = checkIngredients(a, inventoryByName);
      const bCheck = checkIngredients(b, inventoryByName);
      if (aCheck.hasAll && !bCheck.hasAll) return -1;
      if (!aCheck.hasAll && bCheck.hasAll) return 1;
      return 0;
    });
  }, [filteredRecipes, inventoryByName]);

  // Count available recipes
  const availableCount = useMemo(() => {
    return COMPOUND_RECIPES.filter(r => checkIngredients(r, inventoryByName).hasAll).length;
  }, [inventoryByName]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amber-900/30 bg-gradient-to-b from-amber-950/40 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-amber-100" style={{ fontFamily: 'Cinzel, serif' }}>
                Compounding
              </h2>
              <p className="text-amber-300/60 text-xs" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
                صَيْدَلَة (Ṣaydalah)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-sm">
              {availableCount} recipe{availableCount !== 1 ? 's' : ''} ready
            </span>
            <div className="flex items-center gap-1.5 bg-amber-900/40 px-3 py-1.5 rounded-lg">
              <Coins size={14} className="text-amber-400" />
              <span className="text-amber-200 font-semibold">{playerCurrency}</span>
            </div>
          </div>
        </div>

        {/* Your Ingredients Summary */}
        {inventoryByName.length > 0 && (
          <div className="bg-stone-900/50 rounded-lg p-2 border border-amber-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Beaker size={12} className="text-amber-400" />
              <span className="text-amber-300 text-xs uppercase tracking-wide">Your Ingredients</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {inventoryByName.slice(0, 10).map((item, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-900/30 text-amber-200 text-xs rounded">
                  {item.name} ×{item.quantity}
                </span>
              ))}
              {inventoryByName.length > 10 && (
                <span className="px-2 py-0.5 text-amber-400 text-xs">
                  +{inventoryByName.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          <Filter size={14} className="text-amber-500 flex-shrink-0" />
          <CategoryTab
            category="all"
            label="All"
            isActive={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {COMPOUND_CATEGORIES.map(cat => (
            <CategoryTab
              key={cat.category}
              category={cat.category}
              label={cat.nameEn}
              labelAr={cat.nameAr}
              isActive={selectedCategory === cat.category}
              onClick={() => setSelectedCategory(cat.category)}
            />
          ))}
        </div>
      </div>

      {/* Recipes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedRecipes.length === 0 ? (
          <p className="text-amber-200/60 text-center py-8">
            No recipes in this category.
          </p>
        ) : (
          sortedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              playerInventory={inventoryByName}
              merchantInventory={merchantInventory}
              playerCurrency={playerCurrency}
              onCompound={onCompound}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ApothecaryCompoundingPanel;
