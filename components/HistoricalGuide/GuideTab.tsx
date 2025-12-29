// GuideTab Component - Contextual historical guide for Reports Panel
import React from 'react';
import { Book, ChevronRight, MapPin, Users, Heart } from 'lucide-react';
import { NPCStats } from '../../types';
import { GuideContextItem, GuideEntry } from './types';
import { getContextualEntries } from '../../utils/guideContext';
import { findGuideEntry } from '../../utils/historicalGuideData';

interface GuideTabProps {
  currentBiome: string;
  nearbyNPCs: NPCStats[];
  onOpenEncyclopedia: () => void;
  onSelectEntry: (entryId: string) => void;
  playerInfected?: boolean;
}

// Entry card with full description
const EntryCard: React.FC<{
  entry: GuideEntry;
  reason?: string;
  onSelect: () => void;
  accent?: 'red' | 'amber';
}> = ({ entry, reason, onSelect, accent = 'amber' }) => {
  const accentColors = accent === 'red'
    ? 'bg-red-900/30 hover:bg-red-800/40 border-red-700/50'
    : 'bg-black/30 hover:bg-amber-900/20 border-amber-900/30';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg transition-all group border ${accentColors}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h6 className="text-sm font-bold text-amber-100">
            {entry.title}
          </h6>
          {entry.subtitle && (
            <span className="text-xs text-amber-400/60 block mt-0.5">
              {entry.subtitle}
            </span>
          )}
          <p className="text-xs text-amber-100/70 mt-1.5 line-clamp-2 leading-relaxed">
            {entry.shortDescription}
          </p>
          {reason && (
            <span className="text-[10px] text-amber-500/50 mt-1.5 inline-block uppercase tracking-wider">
              {reason}
            </span>
          )}
        </div>
        <ChevronRight
          size={16}
          className="text-amber-500/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
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
  playerInfected = false,
}) => {
  // Get contextual entries based on current location and nearby NPCs
  const contextItems = React.useMemo(
    () => getContextualEntries(currentBiome, nearbyNPCs, 10),
    [currentBiome, nearbyNPCs]
  );

  // Separate by type for display
  const locationItems = contextItems.filter(item => item.entry.category === 'districts');
  const peopleItems = contextItems.filter(item =>
    item.entry.category === 'ethnicities' ||
    item.entry.category === 'religions' ||
    item.entry.category === 'professions'
  );

  // Get plague entry if player is infected
  const plagueEntry = playerInfected ? findGuideEntry('black-death-overview') : null;

  return (
    <div className="space-y-3">
      {/* Player Health Status - highest priority */}
      {plagueEntry && (
        <div>
          <h5 className="text-[10px] text-red-400/70 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
            <Heart size={10} />
            Health Status
          </h5>
          <div className="max-h-32 overflow-y-auto">
            <EntryCard
              entry={plagueEntry}
              reason="You are infected"
              onSelect={() => onSelectEntry(plagueEntry.id)}
              accent="red"
            />
          </div>
        </div>
      )}

      {/* Location Section */}
      {locationItems.length > 0 && (
        <div>
          <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
            <MapPin size={10} />
            Current Location
          </h5>
          <div className="max-h-36 overflow-y-auto">
            <div className="space-y-2">
              {locationItems.map(item => (
                <EntryCard
                  key={item.entry.id}
                  entry={item.entry}
                  onSelect={() => onSelectEntry(item.entry.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nearby People Section */}
      {peopleItems.length > 0 && (
        <div>
          <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
            <Users size={10} />
            Nearby People ({peopleItems.length})
          </h5>
          <div className="max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {peopleItems.map(item => (
                <EntryCard
                  key={item.entry.id}
                  entry={item.entry}
                  reason={item.reason}
                  onSelect={() => onSelectEntry(item.entry.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {contextItems.length === 0 && !plagueEntry && (
        <div className="text-center py-6">
          <Book size={24} className="text-amber-500/30 mx-auto mb-2" />
          <p className="text-xs text-amber-100/40 italic">
            No contextual information available
          </p>
          <p className="text-[10px] text-amber-100/30 mt-1">
            Move closer to people or locations to see relevant history
          </p>
        </div>
      )}

      {/* Open Encyclopedia Button */}
      <button
        onClick={onOpenEncyclopedia}
        className="w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-600
                   rounded-lg text-xs font-bold text-white uppercase tracking-wider
                   transition-all flex items-center justify-center gap-2 shadow-md"
      >
        <Book size={14} />
        Open Encyclopedia
      </button>
    </div>
  );
};
