// WikipediaPanel - Displays Wikipedia content for an entry
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, Globe, BookOpen } from 'lucide-react';
import { WikipediaResponse } from './types';
import { getWikipediaContent } from '../../utils/wikipediaApi';

interface WikipediaPanelProps {
  searchTerm: string;
  entryTitle: string;
  onBack: () => void;
}

export const WikipediaPanel: React.FC<WikipediaPanelProps> = ({
  searchTerm,
  entryTitle,
  onBack,
}) => {
  const [content, setContent] = useState<WikipediaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getWikipediaContent(searchTerm);
        if (cancelled) return;

        if (result) {
          setContent(result);
        } else {
          setError('Could not find Wikipedia article for this topic.');
        }
      } catch (err) {
        if (cancelled) return;
        setError('Failed to load Wikipedia content. Please try again.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchContent();

    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 px-3 py-2
                   bg-amber-900/30 hover:bg-amber-800/40
                   border border-amber-700/40 rounded-lg
                   text-sm text-amber-300 hover:text-amber-200 transition-all group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="historical-font tracking-wide">Back to {entryTitle}</span>
      </button>

      {/* Header with Wikipedia branding */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-blue-800/30">
        <div className="p-2 bg-blue-950/40 rounded-lg border border-blue-700/30">
          <Globe size={20} className="text-blue-400" />
        </div>
        <div>
          <h3 className="historical-font text-sm text-blue-300 uppercase tracking-[0.15em]">
            Wikipedia
          </h3>
          <p className="text-[10px] text-blue-400/50 mt-0.5">External Reference</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="relative flex items-center justify-center py-20 bg-gradient-to-b from-blue-950/20 to-transparent rounded-xl border border-blue-900/30">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
          <div className="text-center">
            <div className="relative inline-block">
              <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
              <BookOpen size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" />
            </div>
            <p className="historical-font text-sm text-blue-300/70 tracking-wide">
              Retrieving knowledge...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="relative flex items-center justify-center py-16 bg-gradient-to-b from-red-950/20 to-transparent rounded-xl border border-red-900/30">
          <div className="text-center">
            <AlertCircle size={36} className="text-red-500/60 mx-auto mb-4" />
            <p className="text-sm text-red-300/70">{error}</p>
            <button
              onClick={onBack}
              className="mt-6 px-5 py-2.5 bg-amber-900/40 hover:bg-amber-800/50
                         border border-amber-700/40 rounded-lg
                         text-sm text-amber-200 transition-all
                         historical-font tracking-wide"
            >
              Return to entry
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {content && !loading && (
        <div className="relative bg-gradient-to-br from-blue-950/30 to-blue-900/20 rounded-xl border-2 border-blue-800/40 overflow-hidden shadow-xl">
          {/* Texture overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />

          {/* Thumbnail */}
          {content.thumbnail && (
            <div className="relative w-full h-56 overflow-hidden border-b-2 border-blue-800/30">
              <img
                src={content.thumbnail}
                alt={content.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
            </div>
          )}

          {/* Article Content */}
          <div className="relative p-6">
            <h1 className="historical-font text-2xl text-blue-200 mb-5 tracking-wide">
              {content.title}
            </h1>

            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-blue-100/80 leading-relaxed text-sm whitespace-pre-line">
                {content.extract}
              </p>
            </div>

            {/* Full Article Link */}
            <div className="mt-8 pt-5 border-t-2 border-blue-800/30">
              <a
                href={content.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3
                           bg-gradient-to-r from-blue-900/50 to-blue-800/40
                           hover:from-blue-800/60 hover:to-blue-700/50
                           border-2 border-blue-600/40 rounded-lg
                           text-sm text-blue-200 hover:text-blue-100
                           transition-all group shadow-lg shadow-blue-900/20"
              >
                <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                <span className="historical-font tracking-wider">Open full article on Wikipedia</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Decorative bottom flourish */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-700/30" />
        <Globe size={10} className="text-blue-600/30" />
        <div className="w-12 h-px bg-gradient-to-l from-transparent to-blue-700/30" />
      </div>
    </div>
  );
};
