import React, { useEffect, useCallback } from 'react';
import { BookOpen, X, Landmark } from 'lucide-react';
import { GravestonePreview3D } from './GravestonePreview3D';

export interface ReadableEpitaph {
  name: string;
  age: number;
  title?: string;
  inscription?: string;
}

export interface MausoleumEpitaph {
  name: string;
  title: string;
  deathYear: number;
  deathYearCE: number;
  inscription: string;
  historicalNote?: string;
}

interface ReadModalProps {
  epitaph: ReadableEpitaph | MausoleumEpitaph;
  graveShape?: 'rectangular' | 'arch' | 'peaked' | 'platform';
  graveType?: 'flat' | 'raised' | 'double_marker';
  graveScale?: number;
  isMausoleum?: boolean;
  onClose: () => void;
}

// Type guard to check if epitaph is a mausoleum epitaph
const isMausoleumEpitaph = (epitaph: ReadableEpitaph | MausoleumEpitaph): epitaph is MausoleumEpitaph => {
  return 'deathYear' in epitaph;
};

export const ReadModal: React.FC<ReadModalProps> = ({ epitaph, graveShape, graveType, graveScale, isMausoleum, onClose }) => {
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

  const isMausoleumType = isMausoleum || isMausoleumEpitaph(epitaph);

  return (
    <div className="absolute inset-0 z-[140] flex items-center justify-center p-3 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
      {/* Desktop: side-by-side layout. Mobile: full screen */}
      <div className={`w-full h-full md:max-w-5xl md:max-h-[85vh] md:h-auto bg-gradient-to-br ${isMausoleumType ? 'from-stone-950/98 via-emerald-950/40 to-stone-950/98 border-emerald-800/40' : 'from-stone-950/98 via-stone-900/95 to-stone-950/98 border-amber-800/30'} border md:rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300`}>
        {/* Header */}
        <div className={`px-4 md:px-6 py-3 md:py-4 border-b ${isMausoleumType ? 'border-emerald-900/30 bg-gradient-to-r from-emerald-950/30 via-transparent to-emerald-950/30' : 'border-amber-900/30 bg-gradient-to-r from-amber-950/20 via-transparent to-amber-950/20'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMausoleumType ? (
                <Landmark size={18} className="text-emerald-500/70" />
              ) : (
                <BookOpen size={18} className="text-amber-500/70" />
              )}
              <span className={`text-[10px] md:text-xs uppercase tracking-[0.3em] ${isMausoleumType ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>
                {isMausoleumType ? 'Reading Mausoleum Inscription' : 'Reading Inscription'}
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 ${isMausoleumType ? 'hover:bg-emerald-900/20' : 'hover:bg-amber-900/20'} rounded-lg transition-colors`}
              aria-label="Close"
            >
              <X size={18} className={isMausoleumType ? 'text-emerald-500/70' : 'text-amber-500/70'} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${!isMausoleumType ? 'md:grid md:grid-cols-2 md:divide-x md:divide-amber-900/20' : ''}`}>
          {/* Left side: 3D View (desktop only, gravestones only) */}
          {!isMausoleumType && (
            <div className="hidden md:flex items-center justify-center bg-stone-950/30 p-4">
              <div className="w-full h-full">
                <GravestonePreview3D
                  epitaph={epitaph as ReadableEpitaph}
                  graveShape={graveShape}
                  graveType={graveType}
                  graveScale={graveScale}
                />
              </div>
            </div>
          )}

          {/* Right side: Epitaph Text */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-xl mx-auto">
              {isMausoleumType && isMausoleumEpitaph(epitaph) ? (
                <>
                  {/* Mausoleum Epitaph Layout */}
                  {/* Drop cap for the name */}
                  <div className="mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-6xl md:text-7xl font-serif text-emerald-600/90 leading-none pt-2 select-none">
                        {epitaph.name.charAt(0)}
                      </span>
                      <div className="flex-1 pt-3">
                        <h1 className="text-xl md:text-2xl font-serif text-emerald-100 leading-tight">
                          {epitaph.name.substring(1)}
                        </h1>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-6 pb-6 border-b border-emerald-900/30">
                    <div className="text-sm uppercase tracking-[0.15em] text-emerald-500/50 mb-2">
                      Title & Position
                    </div>
                    <p className="text-base md:text-lg font-serif text-emerald-200/90 leading-relaxed">
                      {epitaph.title}
                    </p>
                  </div>

                  {/* Death Year */}
                  <div className="mb-6 pb-6 border-b border-emerald-900/30">
                    <div className="text-sm uppercase tracking-[0.15em] text-emerald-500/50 mb-2">
                      Died
                    </div>
                    <p className="text-base md:text-lg font-serif text-emerald-200/80">
                      {epitaph.deathYearCE} CE ({epitaph.deathYear} AH)
                    </p>
                  </div>

                  {/* Main Inscription */}
                  <div className="mb-8">
                    <div className="text-sm uppercase tracking-[0.15em] text-emerald-500/50 mb-4">
                      Carved Inscription
                    </div>
                    <blockquote className="relative bg-emerald-950/30 rounded-lg p-5 border border-emerald-900/30">
                      <p className="text-base md:text-lg font-serif text-emerald-100/90 leading-relaxed italic">
                        {epitaph.inscription}
                      </p>
                    </blockquote>
                  </div>

                  {/* Historical Note */}
                  {epitaph.historicalNote && (
                    <div className="mt-8 pt-6 border-t border-emerald-900/30">
                      <div className="text-sm uppercase tracking-[0.15em] text-emerald-500/50 mb-3">
                        Historical Context
                      </div>
                      <p className="text-sm md:text-base text-emerald-300/70 leading-relaxed">
                        {epitaph.historicalNote}
                      </p>
                    </div>
                  )}

                  {/* Footer decoration */}
                  <div className="mt-10 pt-6 border-t border-emerald-900/30 flex items-center justify-center gap-2">
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-emerald-700/40 to-transparent"></div>
                    <div className="text-emerald-700/50 text-xl font-serif select-none">☪</div>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-emerald-700/40 to-transparent"></div>
                  </div>
                </>
              ) : (
                <>
                  {/* Gravestone Epitaph Layout (original) */}
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
                  {'age' in epitaph && (
                    <div className="mb-6 pb-6 border-b border-amber-900/20">
                      <div className="text-base md:text-lg font-serif text-amber-200/80 italic">
                        Aged {epitaph.age} years
                      </div>
                    </div>
                  )}

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
                  {'inscription' in epitaph && epitaph.inscription && (
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className={`px-4 md:px-6 py-3 border-t ${isMausoleumType ? 'border-emerald-900/30' : 'border-amber-900/30'} bg-stone-950/50 text-center text-[10px] md:text-xs ${isMausoleumType ? 'text-emerald-500/40' : 'text-amber-500/40'} uppercase tracking-widest flex-shrink-0`}>
          Press R or ESC to close
        </div>
      </div>
    </div>
  );
};
