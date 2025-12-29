import React, { useEffect, useRef } from 'react';
import { PlagueStatus } from '../types';
import { getPlagueTypeLabel } from '../utils/plague';

interface PlagueUIProps {
  plague: PlagueStatus;
  showPlagueModal: boolean;
  plagueNotification: string | null;
  onCloseModal: () => void;
  onClearNotification: () => void;
  onModalPauseToggle: (paused: boolean) => void;
}

export const PlagueUI: React.FC<PlagueUIProps> = ({
  plague,
  showPlagueModal,
  plagueNotification,
  onCloseModal,
  onClearNotification,
  onModalPauseToggle
}) => {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (showPlagueModal && !wasOpenRef.current) {
      wasOpenRef.current = true;
      onModalPauseToggle(true);
    }
    if (!showPlagueModal && wasOpenRef.current) {
      wasOpenRef.current = false;
      onModalPauseToggle(false);
    }
  }, [onModalPauseToggle, showPlagueModal]);

  useEffect(() => {
    if (!plagueNotification) return;
    const timer = setTimeout(() => onClearNotification(), 4000);
    return () => clearTimeout(timer);
  }, [onClearNotification, plagueNotification]);

  return (
    <>
      {/* Plague Symptom Notification Toast */}
      {plagueNotification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-top duration-500">
          <div className="bg-gradient-to-r from-red-950/95 via-red-900/95 to-red-950/95 border border-red-700/50 px-6 py-3 rounded-lg shadow-2xl backdrop-blur-sm">
            <p className="text-red-200 text-sm italic tracking-wide text-center">
              {plagueNotification}
            </p>
          </div>
        </div>
      )}

      {/* Plague Caught Modal - pauses game */}
      {showPlagueModal && (
        <div className="absolute inset-0 z-[180] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-gradient-to-b from-[#2a1a10] to-[#1a0f08] border-4 border-amber-900/50 p-10 rounded-lg shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
            {/* Sickly parchment effect */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

            {/* Plague symbol */}
            <div className="text-5xl mb-2 opacity-90">🦠</div>

            <h2 className="text-3xl text-amber-500 mb-2 tracking-tight uppercase font-bold">
              The Pestilence Takes Hold
            </h2>

            <div className="w-20 h-0.5 bg-amber-700/40 mx-auto mb-4"></div>

            <p className="text-amber-200/90 text-lg mb-4 leading-relaxed">
              You have been infected with the <span className="font-bold text-red-400">{getPlagueTypeLabel(plague.plagueType)}</span> plague.
            </p>

            <div className="bg-black/40 rounded-lg p-4 mb-6 text-left border border-amber-900/30">
              {plague.plagueType === 'bubonic' && (
                <p className="text-amber-300/80 text-sm leading-relaxed">
                  The bubonic plague spreads through flea bites. Expect fever, weakness, and painful swellings called buboes.
                  If the buboes burst or are lanced, your chances of survival improve. You have perhaps 8-12 days.
                </p>
              )}
              {plague.plagueType === 'pneumonic' && (
                <p className="text-amber-300/80 text-sm leading-relaxed">
                  The pneumonic plague attacks the lungs. Expect rapid fever, bloody cough, and difficulty breathing.
                  This is the deadliest form—few survive beyond 3-5 days.
                </p>
              )}
              {plague.plagueType === 'septicemic' && (
                <p className="text-amber-300/80 text-sm leading-relaxed">
                  The septicemic plague poisons the blood itself. Expect rapid decline, bleeding beneath the skin, and blackening of extremities.
                  This form is almost always fatal within 2-3 days.
                </p>
              )}
            </div>

            <p className="text-amber-400/70 text-sm mb-6">
              Estimated survival chance: <span className="font-bold text-amber-300">{plague.survivalChance}%</span>
            </p>

            <button
              onClick={onCloseModal}
              className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-10 py-3 rounded-full tracking-widest transition-all shadow-lg active:scale-95 uppercase"
            >
              Continue
            </button>

            <div className="mt-6 text-[10px] text-amber-900/50 uppercase tracking-widest">
              "Lord have mercy upon us"
            </div>
          </div>
        </div>
      )}
    </>
  );
};
