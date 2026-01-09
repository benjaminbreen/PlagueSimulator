import React, { useEffect, useCallback } from 'react';
import { BookOpen, X } from 'lucide-react';
import { GravestonePreview3D } from './GravestonePreview3D';

export interface ReadableEpitaph {
  name: string;
  age: number;
  title?: string;
  inscription?: string;
}

interface ReadModalProps {
  epitaph: ReadableEpitaph;
  graveShape?: 'rectangular' | 'arch' | 'peaked' | 'platform';
  graveType?: 'flat' | 'raised' | 'double_marker';
  graveScale?: number;
  onClose: () => void;
}

export const ReadModal: React.FC<ReadModalProps> = ({ epitaph, graveShape, graveType, graveScale, onClose }) => {
  // Keyboard handler - R or Escape to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="absolute inset-0 z-[140] flex items-center justify-center p-3 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
      {/* Desktop: side-by-side layout. Mobile: full screen */}
      <div className="w-full h-full md:max-w-5xl md:max-h-[80vh] md:h-auto bg-gradient-to-br from-stone-950/98 via-stone-900/95 to-stone-950/98 border border-amber-800/30 md:rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-amber-900/30 bg-gradient-to-r from-amber-950/20 via-transparent to-amber-950/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-amber-500/70" />
              <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-amber-500/60">
                Reading Inscription
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-amber-900/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-amber-500/70" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto md:grid md:grid-cols-2 md:divide-x md:divide-amber-900/20">
          {/* Left side: 3D View (desktop only) */}
          <div className="hidden md:flex items-center justify-center bg-stone-950/30 p-4">
            <div className="w-full h-full">
              <GravestonePreview3D
                epitaph={epitaph}
                graveShape={graveShape}
                graveType={graveType}
                graveScale={graveScale}
              />
            </div>
          </div>

          {/* Right side: Epitaph Text */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-xl mx-auto">
              {/* Drop cap for the name */}
              <div className="mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-7xl md:text-8xl font-serif text-amber-600/90 leading-none pt-2 select-none">
                    {epitaph.name.charAt(0)}
                  </span>
                  <div className="flex-1 pt-4">
                    <h1 className="text-2xl md:text-3xl font-serif text-amber-100 leading-tight">
                      {epitaph.name.substring(1)}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Age */}
              <div className="mb-6 pb-6 border-b border-amber-900/20">
                <div className="text-base md:text-lg font-serif text-amber-200/80 italic">
                  Aged {epitaph.age} years
                </div>
              </div>

              {/* Title/Descriptor */}
              {epitaph.title && (
                <div className="mb-8">
                  <div className="text-sm uppercase tracking-[0.2em] text-amber-500/50 mb-2">
                    In Life
                  </div>
                  <p className="text-lg md:text-xl font-serif text-amber-100/90 leading-relaxed">
                    {epitaph.title}
                  </p>
                </div>
              )}

              {/* Quranic Inscription */}
              {epitaph.inscription && (
                <div className="mt-10 pt-8 border-t border-amber-900/20">
                  <div className="text-sm uppercase tracking-[0.2em] text-amber-500/50 mb-4">
                    Inscription
                  </div>
                  <blockquote className="relative">
                    <div className="absolute -left-4 top-0 text-6xl text-amber-700/20 font-serif leading-none select-none">
                      "
                    </div>
                    <p className="text-base md:text-lg font-serif text-amber-200/80 italic leading-relaxed pl-6">
                      {epitaph.inscription}
                    </p>
                    <div className="absolute -right-2 bottom-0 text-6xl text-amber-700/20 font-serif leading-none select-none">
                      "
                    </div>
                  </blockquote>
                </div>
              )}

              {/* Footer decoration */}
              <div className="mt-12 pt-8 border-t border-amber-900/20 flex items-center justify-center gap-2">
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"></div>
                <div className="text-amber-700/40 text-2xl font-serif select-none">✦</div>
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-4 md:px-6 py-3 border-t border-amber-900/30 bg-stone-950/50 text-center text-[10px] md:text-xs text-amber-500/40 uppercase tracking-widest flex-shrink-0">
          Press R or ESC to close
        </div>
      </div>
    </div>
  );
};
