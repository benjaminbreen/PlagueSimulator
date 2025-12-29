// GuideNavigation - Sidebar navigation for encyclopedia
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Scroll, Cross, Users, Briefcase, Building2, Sun, Skull } from 'lucide-react';
import { GuideEntry, GuideCategory } from './types';

// Category icons for visual interest
const CATEGORY_ICONS: Record<GuideCategory, React.ReactNode> = {
  religions: <Cross size={12} />,
  ethnicities: <Users size={12} />,
  professions: <Briefcase size={12} />,
  districts: <Building2 size={12} />,
  dailyLife: <Sun size={12} />,
  thePlague: <Skull size={12} />,
};

interface GuideNavigationProps {
  categories: GuideCategory[];
  categoryLabels: Record<GuideCategory, string>;
  selectedCategory: GuideCategory;
  onSelectCategory: (category: GuideCategory) => void;
  categoryEntries: GuideEntry[];
  selectedEntry: GuideEntry | null;
  onSelectEntry: (entry: GuideEntry) => void;
}

export const GuideNavigation: React.FC<GuideNavigationProps> = ({
  categories,
  categoryLabels,
  selectedCategory,
  onSelectCategory,
  categoryEntries,
  selectedEntry,
  onSelectEntry,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<GuideCategory>>(
    new Set([selectedCategory])
  );

  const toggleCategory = (category: GuideCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
    onSelectCategory(category);
  };

  return (
    <div className="relative w-60 border-r-2 border-amber-900/50 bg-gradient-to-b from-[#0d0907] to-[#0a0704] overflow-y-auto flex-shrink-0">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />

      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />

      <div className="relative p-4">
        {/* Header with scroll icon */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
          <Scroll size={14} className="text-amber-600/70" />
          <h3 className="historical-font text-xs text-amber-500 uppercase tracking-[0.2em]">
            Index
          </h3>
        </div>

        <div className="space-y-1">
          {categories.map(category => {
            const isExpanded = expandedCategories.has(category);
            const isSelected = selectedCategory === category;

            return (
              <div key={category} className="relative">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group
                    ${isSelected
                      ? 'bg-gradient-to-r from-amber-900/50 to-amber-800/40 text-amber-100 border border-amber-700/40 shadow-lg shadow-amber-900/20'
                      : 'text-amber-400/70 hover:bg-amber-900/20 hover:text-amber-300 border border-transparent'
                    }`}
                >
                  {/* Category icon */}
                  <span className={`transition-colors ${isSelected ? 'text-amber-400' : 'text-amber-600/50 group-hover:text-amber-500/70'}`}>
                    {CATEGORY_ICONS[category]}
                  </span>

                  {/* Chevron */}
                  <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight size={10} className="text-amber-600/50" />
                  </span>

                  <span className="historical-font text-[11px] tracking-wide truncate flex-1">
                    {categoryLabels[category]}
                  </span>

                  {/* Entry count badge */}
                  {isSelected && (
                    <span className="text-[9px] text-amber-500/50 bg-black/30 px-1.5 py-0.5 rounded">
                      {categoryEntries.length}
                    </span>
                  )}
                </button>

                {/* Category Entries */}
                {isExpanded && isSelected && (
                  <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-amber-800/40 pl-3 py-1">
                    {categoryEntries.map((entry, index) => (
                      <button
                        key={entry.id}
                        onClick={() => onSelectEntry(entry)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-all truncate group flex items-center gap-2
                          ${selectedEntry?.id === entry.id
                            ? 'bg-amber-700/40 text-amber-100 border-l-2 border-amber-400 -ml-[2px] pl-[12px]'
                            : 'text-amber-300/60 hover:text-amber-100 hover:bg-amber-900/30'
                          }`}
                      >
                        {/* Decorative bullet */}
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                          selectedEntry?.id === entry.id ? 'bg-amber-400' : 'bg-amber-700/50 group-hover:bg-amber-500/50'
                        }`} />
                        <span className="truncate">{entry.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Decorative bottom flourish */}
        <div className="mt-6 pt-4 border-t border-amber-900/30">
          <div className="flex items-center justify-center gap-2 text-amber-700/30">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-amber-700/30" />
            <span className="text-[8px] tracking-[0.3em] uppercase">Finis</span>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-amber-700/30" />
          </div>
        </div>
      </div>
    </div>
  );
};
