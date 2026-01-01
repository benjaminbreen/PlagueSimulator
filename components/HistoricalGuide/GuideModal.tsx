// GuideModal - Full-screen encyclopedia modal
import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Book } from 'lucide-react';
import { GuideEntry, GuideCategory, CATEGORY_LABELS, CATEGORY_ORDER } from './types';
import { GUIDE_ENTRIES, getEntriesByCategory, findGuideEntry } from '../../utils/historicalGuideData';
import { searchEntries, getRelatedEntries } from '../../utils/guideContext';
import { GuideNavigation } from './GuideNavigation';
import { GuideEntryRenderer } from './GuideEntry';
import { WikipediaPanel } from './WikipediaPanel';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntryId?: string | null;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  initialEntryId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory>('religions');
  const [selectedEntry, setSelectedEntry] = useState<GuideEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuideEntry[]>([]);
  const [showWikipedia, setShowWikipedia] = useState(false);

  // Handle initial entry selection
  useEffect(() => {
    if (isOpen && initialEntryId) {
      const entry = findGuideEntry(initialEntryId);
      if (entry) {
        setSelectedEntry(entry);
        setSelectedCategory(entry.category);
      }
    }
  }, [isOpen, initialEntryId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showWikipedia) {
          setShowWikipedia(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, showWikipedia]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchEntries(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelectEntry = useCallback((entry: GuideEntry) => {
    setSelectedEntry(entry);
    setSelectedCategory(entry.category);
    setSearchQuery('');
    setSearchResults([]);
    setShowWikipedia(false);
  }, []);

  const handleCategorySelect = useCallback((category: GuideCategory) => {
    setSelectedCategory(category);
    // Select first entry in category
    const entries = getEntriesByCategory(category);
    if (entries.length > 0) {
      setSelectedEntry(entries[0]);
    }
    setShowWikipedia(false);
  }, []);

  if (!isOpen) return null;

  const categoryEntries = getEntriesByCategory(selectedCategory);
  const relatedEntries = selectedEntry ? getRelatedEntries(selectedEntry) : [];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-gradient-to-b from-stone-900 to-stone-950 rounded-xl border border-amber-800/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header with integrated search */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-amber-900/40 bg-black/40">
          <div className="flex items-center gap-3">
            <Book size={20} className="text-amber-500" />
            <div>
              <h2 className="historical-font text-lg text-amber-300 tracking-wide">
                Historical Guide
              </h2>
              <p className="text-[10px] text-amber-500/50 uppercase tracking-wider">
                Damascus, 1348
              </p>
            </div>
          </div>

          {/* Search Bar - inline */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="w-full pl-9 pr-4 py-1.5 bg-black/40 border border-amber-900/40 rounded-lg
                           text-amber-100 text-sm placeholder:text-amber-500/40
                           focus:outline-none focus:border-amber-600/60 transition-colors"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900 border border-amber-800/50 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
                  {searchResults.slice(0, 10).map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      className="w-full text-left px-4 py-2 hover:bg-amber-900/30 transition-colors border-b border-amber-900/20 last:border-b-0"
                    >
                      <span className="text-sm text-amber-100 font-medium">{entry.title}</span>
                      <span className="text-xs text-amber-500/60 ml-2">({CATEGORY_LABELS[entry.category]})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-amber-900/30 transition-colors"
            >
              <X size={20} className="text-amber-400" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <GuideNavigation
            categories={CATEGORY_ORDER}
            categoryLabels={CATEGORY_LABELS}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            categoryEntries={categoryEntries}
            selectedEntry={selectedEntry}
            onSelectEntry={handleSelectEntry}
          />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-stone-950/50">
            {showWikipedia && selectedEntry?.wikipediaSearchTerm ? (
              <WikipediaPanel
                searchTerm={selectedEntry.wikipediaSearchTerm}
                entryTitle={selectedEntry.title}
                onBack={() => setShowWikipedia(false)}
              />
            ) : selectedEntry ? (
              <GuideEntryRenderer
                entry={selectedEntry}
                relatedEntries={relatedEntries}
                onSelectRelated={handleSelectEntry}
                onOpenWikipedia={() => setShowWikipedia(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-amber-500/40">
                <div className="text-center">
                  <Book size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select an entry to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
