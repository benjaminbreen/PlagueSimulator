import React, { useEffect, useCallback } from 'react';
import { X, BookOpen, Cpu, Users, Gamepad2, ExternalLink } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[301] pointer-events-none overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-3xl bg-gradient-to-b from-stone-900 to-stone-950 rounded-2xl border border-amber-800/40 shadow-2xl pointer-events-auto"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 text-amber-400 hover:text-amber-300 transition-colors rounded-full hover:bg-white/10"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="px-6 md:px-8 pt-6 pb-4 border-b border-amber-900/20 text-center">
              <h1 className="text-2xl md:text-4xl font-bold text-amber-500 historical-font tracking-tight">
                PLAGUE SIMULATOR
              </h1>
              <p className="text-amber-200/50 text-xs md:text-sm uppercase tracking-[0.3em] mt-1">Damascus, 1348</p>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 py-6 md:py-8 space-y-8 max-h-[70vh] overflow-y-auto" style={{ fontFamily: 'Lato, system-ui, sans-serif' }}>
              {/* What is this? */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen size={20} className="text-amber-500 flex-shrink-0" />
                  <h2 className="text-base md:text-lg font-bold text-amber-200 uppercase tracking-wide">What is this?</h2>
                </div>
                <div className="text-amber-100/90 text-base md:text-lg leading-relaxed space-y-4 pl-0 md:pl-8">
                  <p>
                    <span className="text-amber-400 font-semibold">Plague Simulator</span> is an educational simulation
                    that transports you to Damascus in 1348, at the height of the Black Death pandemic. Walk the streets
                    of a medieval Islamic city, interact with its diverse inhabitants, and witness how one of history's
                    deadliest pandemics transformed urban life.
                  </p>
                  <p>
                    Designed for use in <span className="text-amber-300">university history courses</span>,
                    this simulation is also intended for anyone curious about medieval history, the history of disease,
                    or the daily lives of people in the premodern Islamic world.
                  </p>
                </div>
              </section>

              {/* How to Play */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Gamepad2 size={20} className="text-amber-500 flex-shrink-0" />
                  <h2 className="text-base md:text-lg font-bold text-amber-200 uppercase tracking-wide">How to Play</h2>
                </div>
                <div className="text-amber-100/90 text-base leading-relaxed pl-0 md:pl-8 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-black/40 rounded-xl p-4 border border-amber-900/30">
                      <div className="text-amber-400 font-bold text-sm uppercase tracking-wide mb-2">Movement</div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">Arrow keys or WASD to walk. Hold Shift to run.</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-amber-900/30">
                      <div className="text-amber-400 font-bold text-sm uppercase tracking-wide mb-2">Camera</div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">Press V to cycle through camera perspectives.</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-amber-900/30">
                      <div className="text-amber-400 font-bold text-sm uppercase tracking-wide mb-2">Interact</div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">Press E near NPCs to speak or trade. Press O to open containers.</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-amber-900/30">
                      <div className="text-amber-400 font-bold text-sm uppercase tracking-wide mb-2">Buildings</div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">Approach buildings and press Return to enter. Press Escape to exit.</p>
                    </div>
                  </div>
                  <p className="text-amber-100/60 text-sm mt-4 italic">
                    Use the Reports Panel to track the epidemic, view your inventory, and access the Historical Guide
                    for context about the people and places you encounter.
                  </p>
                </div>
              </section>

              {/* Technology */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Cpu size={20} className="text-amber-500 flex-shrink-0" />
                  <h2 className="text-base md:text-lg font-bold text-amber-200 uppercase tracking-wide">Technology</h2>
                </div>
                <div className="text-amber-100/90 text-base md:text-lg leading-relaxed pl-0 md:pl-8 space-y-4">
                  <p>
                    This simulation was built with the assistance of <span className="text-amber-300 font-medium">Claude Opus 4.5</span>,
                    Anthropic's most capable AI model, which handled the majority of the coding. The 3D graphics use
                    React Three Fiber and Three.js.
                  </p>
                  <p>
                    NPC conversations are powered by <span className="text-amber-300 font-medium">Google's Gemini 2.5 Flash-Lite</span>,
                    allowing for dynamic, contextual dialogue that responds to the game state and historical setting.
                  </p>
                  <p>
                    The <span className="text-amber-300 font-medium">Historical Guide</span> integrates with the Wikipedia API to
                    provide additional educational content, making it easy to learn more about the religions, ethnicities,
                    professions, and daily life of medieval Damascus.
                  </p>
                </div>
              </section>

              {/* Credits */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Users size={20} className="text-amber-500 flex-shrink-0" />
                  <h2 className="text-base md:text-lg font-bold text-amber-200 uppercase tracking-wide">Credits</h2>
                </div>
                <div className="text-amber-100/90 text-base md:text-lg leading-relaxed pl-0 md:pl-8 space-y-4">
                  <p>
                    Created by <span className="text-amber-300 font-semibold">Benjamin Breen</span>, Associate Professor
                    of History at the University of California, Santa Cruz, with substantial coding assistance from
                    Claude Opus 4.5.
                  </p>
                  <p>
                    The historical research draws on primary sources from medieval Islamic historians and travelers,
                    as well as modern scholarship on the Black Death and Mamluk-era Damascus.
                    <span className="text-amber-300 font-medium"> Wikipedia</span> served as an invaluable resource both for research
                    and as a source of accessible educational content in the Guide panel.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-5">
                    <a
                      href="https://en.wikipedia.org/wiki/Black_Death"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900/30 border border-amber-700/40 rounded-full text-sm text-amber-300 hover:bg-amber-900/50 transition-colors"
                    >
                      <ExternalLink size={14} />
                      Black Death on Wikipedia
                    </a>
                    <a
                      href="https://en.wikipedia.org/wiki/Damascus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900/30 border border-amber-700/40 rounded-full text-sm text-amber-300 hover:bg-amber-900/50 transition-colors"
                    >
                      <ExternalLink size={14} />
                      Damascus on Wikipedia
                    </a>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="pt-6 border-t border-amber-900/30 text-center">
                <p className="text-amber-200/50 text-sm uppercase tracking-widest">
                  An experiment in AI-assisted historical education
                </p>
                <p className="text-amber-200/40 text-xs mt-2">
                  Version 1.0 &middot; 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
