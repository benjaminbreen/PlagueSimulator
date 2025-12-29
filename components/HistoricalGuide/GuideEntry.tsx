// GuideEntry - Renders individual encyclopedia entry content
import React from 'react';
import { ExternalLink, Link2, Gamepad2, ScrollText } from 'lucide-react';
import { GuideEntry, CATEGORY_LABELS } from './types';

interface GuideEntryRendererProps {
  entry: GuideEntry;
  relatedEntries: GuideEntry[];
  onSelectRelated: (entry: GuideEntry) => void;
  onOpenWikipedia: () => void;
}

export const GuideEntryRenderer: React.FC<GuideEntryRendererProps> = ({
  entry,
  relatedEntries,
  onSelectRelated,
  onOpenWikipedia,
}) => {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-amber-800/30">
        <span className="text-[10px] text-amber-500/60 uppercase tracking-[0.2em] font-bold">
          {CATEGORY_LABELS[entry.category]}
        </span>
        <h1 className="historical-font text-2xl text-amber-200 mt-1">
          {entry.title}
        </h1>
        {entry.subtitle && (
          <p className="text-sm text-amber-400/60 mt-1 italic">
            {entry.subtitle}
          </p>
        )}
      </div>

      {/* Main Description */}
      <div className="mb-6">
        <p className="text-base text-amber-100/90 leading-relaxed whitespace-pre-line">
          {entry.fullDescription}
        </p>
      </div>

      {/* Historical Context Section */}
      <div className="mt-6 p-4 bg-amber-900/20 rounded-lg border border-amber-800/40">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText size={14} className="text-amber-500" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Historical Context
          </h3>
        </div>
        <p className="text-sm text-amber-100/80 leading-relaxed whitespace-pre-line">
          {entry.historicalContext}
        </p>
      </div>

      {/* In-Game Relevance Section */}
      <div className="mt-4 p-4 bg-emerald-900/20 rounded-lg border border-emerald-800/40">
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 size={14} className="text-emerald-500" />
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            In the Simulation
          </h3>
        </div>
        <p className="text-sm text-emerald-100/80 leading-relaxed whitespace-pre-line">
          {entry.inGameRelevance}
        </p>
      </div>

      {/* Related Entries */}
      {relatedEntries.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-amber-500/60" />
            <h3 className="text-xs font-bold text-amber-500/60 uppercase tracking-wider">
              Related Entries
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedEntries.map(related => (
              <button
                key={related.id}
                onClick={() => onSelectRelated(related)}
                className="px-3 py-1.5 bg-amber-900/30 hover:bg-amber-800/40
                           border border-amber-800/40 rounded-lg
                           text-xs text-amber-200 hover:text-amber-100
                           transition-colors"
              >
                {related.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {entry.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-black/30 rounded text-[10px] text-amber-400/50"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Wikipedia Link */}
      {entry.wikipediaSearchTerm && (
        <div className="mt-8 pt-6 border-t border-amber-900/30">
          <button
            onClick={onOpenWikipedia}
            className="flex items-center gap-2 px-4 py-2.5
                       bg-blue-900/40 hover:bg-blue-800/50
                       border border-blue-700/40 rounded-lg
                       text-sm text-blue-200 hover:text-blue-100
                       transition-colors"
          >
            <ExternalLink size={16} />
            Read more on Wikipedia
          </button>
        </div>
      )}
    </div>
  );
};
