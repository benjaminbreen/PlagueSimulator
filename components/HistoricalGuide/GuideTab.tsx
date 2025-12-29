// GuideTab Component - Contextual historical guide for Reports Panel
import React from 'react';
import { Book, ChevronRight, MapPin, Users } from 'lucide-react';
import { NPCStats } from '../../types';
import { GuideContextItem, GuideEntry } from './types';
import { getContextualEntries } from '../../utils/guideContext';

interface GuideTabProps {
  currentBiome: string;
  nearbyNPCs: NPCStats[];
  onOpenEncyclopedia: () => void;
  onSelectEntry: (entryId: string) => void;
}

const ContextEntry: React.FC<{
  item: GuideContextItem;
  onSelect: () => void;
}> = ({ item, onSelect }) => {
  const { entry, relevance, reason } = item;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group
        ${relevance === 'high'
          ? 'bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/50'
          : 'bg-black/30 hover:bg-amber-900/20 border border-amber-900/30'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h6 className="text-[11px] font-bold text-amber-100 truncate">
              {entry.title}
            </h6>
            {entry.subtitle && (
              <span className="text-[9px] text-amber-400/50 truncate hidden sm:inline">
                {entry.subtitle}
              </span>
            )}
          </div>
          <p className="text-[10px] text-amber-100/60 mt-1 line-clamp-2 leading-relaxed">
            {entry.shortDescription}
          </p>
          <span className="text-[8px] text-amber-500/50 mt-1 inline-block uppercase tracking-wider">
            {reason}
          </span>
        </div>
        <ChevronRight
          size={14}
          className="text-amber-500/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
        />
      </div>
    </button>
  );
};

export const GuideTab: React.FC<GuideTabProps> = ({
  currentBiome,
  nearbyNPCs,
  onOpenEncyclopedia,
  onSelectEntry,
}) => {
  // Get contextual entries based on current location and nearby NPCs
  const contextItems = React.useMemo(
    () => getContextualEntries(currentBiome, nearbyNPCs, 8),
    [currentBiome, nearbyNPCs]
  );

  // Separate by type for display
  const locationItems = contextItems.filter(item => item.entry.category === 'districts');
  const peopleItems = contextItems.filter(item =>
    item.entry.category === 'ethnicities' ||
    item.entry.category === 'religions' ||
    item.entry.category === 'professions'
  );

  return (
    <div className="space-y-4">
      {/* Location Section */}
      {locationItems.length > 0 && (
        <div>
          <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
            <MapPin size={10} />
            Current Location
          </h5>
          <div className="space-y-1.5">
            {locationItems.map(item => (
              <ContextEntry
                key={item.entry.id}
                item={item}
                onSelect={() => onSelectEntry(item.entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Nearby People Section */}
      {peopleItems.length > 0 && (
        <div>
          <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
            <Users size={10} />
            Nearby People
          </h5>
          <div className="space-y-1.5">
            {peopleItems.slice(0, 5).map(item => (
              <ContextEntry
                key={item.entry.id}
                item={item}
                onSelect={() => onSelectEntry(item.entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {contextItems.length === 0 && (
        <div className="text-center py-6">
          <Book size={24} className="text-amber-500/30 mx-auto mb-2" />
          <p className="text-[10px] text-amber-100/40 italic">
            No contextual information available
          </p>
          <p className="text-[9px] text-amber-100/30 mt-1">
            Move closer to people or locations to see relevant history
          </p>
        </div>
      )}

      {/* Open Encyclopedia Button */}
      <button
        onClick={onOpenEncyclopedia}
        className="w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-600
                   rounded-lg text-xs font-bold text-white uppercase tracking-wider
                   transition-all duration-200 flex items-center justify-center gap-2
                   shadow-md"
      >
        <Book size={14} />
        Open Encyclopedia
      </button>
    </div>
  );
};
