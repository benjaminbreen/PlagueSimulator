import React, { useEffect, useState } from 'react';
import { UI } from './UI';
import { MerchantModal } from './MerchantModal';
import { MedicalTreatmentModal } from './MedicalTreatmentModal';
import { GuideModal } from './HistoricalGuide';
import { LootModal, LootModalData, LootItem } from './LootModal';
import { ObserveController } from './observe/ObserveController';
import { PlagueUI } from './PlagueUI';
import { Toast, ToastMessage } from './Toast';
import { BuildingMetadata, MerchantNPC, MerchantItem, PlayerItem, MedicalEstablishmentType } from '../types';
import { MedicalModalState } from '../hooks/useModalState';
import { ESTABLISHMENTS, TreatmentOutcome } from '../utils/medicalTreatments';
import { TreatmentOutcomeModal } from './medical/TreatmentOutcomeModal';

// Format time of day to readable string
const formatTimeOfDay = (hour: number): string => {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 10) return 'early morning';
  if (hour >= 10 && hour < 12) return 'late morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 21) return 'evening';
  return 'night';
};

interface AppShellProps {
  observeMode: boolean;
  transitioning: boolean;
  gameLoading: boolean;
  onStartGame: () => void;
  uiProps: React.ComponentProps<typeof UI>;
  performanceIndicator: {
    show: boolean;
    shadowsDisabled: boolean;
    onDismiss: () => void;
  };
  showEnterModal: boolean;
  nearBuilding: BuildingMetadata | null;
  getBuildingLabel: (type: any) => string;
  onConfirmEnter: () => void;
  onCloseEnterModal: () => void;
  showMerchantModal: boolean;
  nearMerchant: MerchantNPC | null;
  onCloseMerchant: () => void;
  onTriggerMerchant?: () => void;  // Mobile/touch trigger for trading
  onPurchase: (item: MerchantItem, quantity: number) => void;
  onSell: (item: PlayerItem, quantity: number) => void;
  onCompound?: (recipe: import('../types').CompoundRecipe, totalCost: number, ingredientsToBuy: { name: string; price: number }[]) => void;
  showGuideModal: boolean;
  selectedGuideEntryId: string | null;
  onCloseGuideModal: () => void;
  interiorInfo: string | null;
  sceneMode: 'outdoor' | 'interior';
  nearSpeakableNpc: any | null;
  onTriggerSpeakToNpc?: () => void;  // Mobile/touch trigger for speaking to NPC
  nearChest: { id: string; label: string; position: [number, number, number]; locationName: string } | null;
  onTriggerOpenChest?: () => void;   // Mobile/touch trigger for opening chest
  nearStairs: { id: string; label: string; position: [number, number, number]; type: import('../types').InteriorPropType } | null;
  stairsPromptLabel: string | null;
  onTriggerUseStairs?: () => void;
  nearRoofHatch: { id: string; position: [number, number, number] } | null;
  roofHatchPromptLabel: string | null;
  onTriggerExitViaRoofHatch?: () => void;
  nearRooftopHatch: { buildingId: string; position: [number, number, number] } | null;
  onTriggerEnterViaRooftopHatch?: () => void;
  nearBirdcage: { id: string; label: string; position: [number, number, number]; locationName: string } | null;
  onTriggerOpenBirdcage?: () => void;
  showEncounterModal: boolean;
  showPlayerModal: boolean;
  showEnterModalActive: boolean;
  observeLines: string[];
  observeLineCount: number;
  onObserveReturn: () => void;
  plague: any;
  showPlagueModal: boolean;
  plagueNotification: string | null;
  onClosePlagueModal: () => void;
  onClearPlagueNotification: () => void;
  onPlaguePauseToggle: (paused: boolean) => void;
  gameOver: { reason: string; description: string } | null;
  onRestart: () => void;
  toastMessages: ToastMessage[];
  onDismissToast: (id: string) => void;
  lootModalData: LootModalData | null;
  onLootAccept: (items: LootItem[]) => void;
  onLootDecline: () => void;
  onLootClose: () => void;
  // Medical treatment modal
  medicalModal: MedicalModalState | null;
  onCloseMedicalModal: () => void;
  onMedicalTreatment: (treatmentId: string, cost: number) => void;
  playerCurrency: number;
  // Medical building detection
  isInMedicalBuilding: boolean;
  onTriggerMedicalTreatment?: () => void;
  // Player skin tone for medical animations
  playerSkinTone?: string;
  // Treatment outcome modal
  treatmentOutcome: TreatmentOutcome | null;
  onCloseTreatmentOutcome: () => void;
}

export const AppShell = React.memo(({
  observeMode,
  transitioning,
  gameLoading,
  onStartGame,
  uiProps,
  performanceIndicator,
  showEnterModal,
  nearBuilding,
  onConfirmEnter,
  onCloseEnterModal,
  showMerchantModal,
  nearMerchant,
  onCloseMerchant,
  onTriggerMerchant,
  onPurchase,
  onSell,
  onCompound,
  showGuideModal,
  selectedGuideEntryId,
  onCloseGuideModal,
  interiorInfo,
  sceneMode,
  nearSpeakableNpc,
  onTriggerSpeakToNpc,
  nearChest,
  onTriggerOpenChest,
  nearStairs,
  stairsPromptLabel,
  onTriggerUseStairs,
  nearRoofHatch,
  roofHatchPromptLabel,
  onTriggerExitViaRoofHatch,
  nearRooftopHatch,
  onTriggerEnterViaRooftopHatch,
  nearBirdcage,
  onTriggerOpenBirdcage,
  showEncounterModal,
  showPlayerModal,
  showEnterModalActive,
  getBuildingLabel,
  observeLines,
  observeLineCount,
  onObserveReturn,
  plague,
  showPlagueModal,
  plagueNotification,
  onClosePlagueModal,
  onClearPlagueNotification,
  onPlaguePauseToggle,
  gameOver,
  onRestart,
  toastMessages,
  onDismissToast,
  lootModalData,
  onLootAccept,
  onLootDecline,
  onLootClose,
  medicalModal,
  onCloseMedicalModal,
  onMedicalTreatment,
  playerCurrency,
  isInMedicalBuilding,
  onTriggerMedicalTreatment,
  playerSkinTone,
  treatmentOutcome,
  onCloseTreatmentOutcome
}: AppShellProps) => {
  const [showAbout, setShowAbout] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);

  // Allow Enter key to start game from loading screen
  useEffect(() => {
    if (!gameLoading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameLoading, onStartGame]);

  return (
    <>
      {/* Scene transition fade overlay */}
      <div
        className={`absolute inset-0 z-50 bg-black transition-opacity duration-300 ease-in-out pointer-events-none ${
          transitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Initial loading overlay - fades out after assets load */}
      <div
        onClick={() => setSkipIntro(true)}
        className={`absolute inset-0 z-[200] bg-stone-950 flex flex-col items-center justify-center transition-opacity duration-1000 ${
          gameLoading ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h1 className={`text-5xl md:text-7xl text-amber-100/90 tracking-[0.25em] font-light mb-4 ${!skipIntro && 'animate-[fadeIn_1s_ease-out_forwards]'}`}
            style={{ fontFamily: 'Cinzel, Georgia, serif', opacity: skipIntro ? 1 : undefined }}>
          DAMASCUS
        </h1>
        <p className={`text-2xl md:text-3xl text-amber-200/60 tracking-[0.5em] font-light ${!skipIntro && 'animate-[fadeIn_1s_ease-out_forwards]'}`}
           style={{ fontFamily: 'Cinzel, Georgia, serif', opacity: skipIntro ? 1 : undefined }}>
          1348
        </p>
        <div className={`mt-8 w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent ${!skipIntro && 'animate-[fadeIn_1s_ease-out_0.5s_forwards]'}`}
             style={{ opacity: skipIntro ? 1 : 0 }} />

        {/* Contextual introduction - staggered fade-in */}
        {uiProps.playerStats && (
          <div className="mt-8 max-w-lg text-center px-6">
            <p className={`text-amber-200/70 text-sm md:text-base leading-relaxed ${!skipIntro && 'animate-[fadeIn_1s_ease-out_1s_forwards]'}`}
               style={{ fontFamily: 'Lato, Georgia, serif', opacity: skipIntro ? 1 : 0 }}>
              It is {formatTimeOfDay(uiProps.params?.timeOfDay ?? 12)} in the{' '}
              <span className="text-amber-100">Al-Buzuriyah Souq</span> of Damascus.
            </p>
            <p className={`text-amber-200/70 text-sm md:text-base leading-relaxed mt-3 ${!skipIntro && 'animate-[fadeIn_1s_ease-out_2s_forwards]'}`}
               style={{ fontFamily: 'Lato, Georgia, serif', opacity: skipIntro ? 1 : 0 }}>
              You are <span className="text-amber-100">{uiProps.playerStats.name}</span>,{' '}
              a {uiProps.playerStats.profession.toLowerCase()},{' '}
              aged {uiProps.playerStats.age} years.
            </p>
            <p className={`text-amber-200/80 text-lg md:text-xl mt-6 italic ${!skipIntro && 'animate-[fadeIn_1s_ease-out_3s_forwards]'}`}
               style={{
                 fontFamily: 'Lato, Georgia, serif',
                 opacity: skipIntro ? 1 : 0
               }}>
              It is the year of the <span className="plague-word">plague</span>...
            </p>

            {/* Begin button */}
            <button
              onClick={onStartGame}
              className={`mt-8 px-8 py-3 bg-transparent border border-amber-600/50 text-amber-200/90 rounded-full tracking-[0.2em] uppercase text-sm hover:bg-amber-900/30 hover:border-amber-500/70 transition-all duration-300 ${!skipIntro && 'animate-[fadeIn_1s_ease-out_4s_forwards]'}`}
              style={{ fontFamily: 'Cinzel, Georgia, serif', opacity: skipIntro ? 1 : 0 }}
            >
              Begin My Day
            </button>
          </div>
        )}

        {/* About button at bottom */}
        <button
          onClick={() => setShowAbout(!showAbout)}
          className={`absolute bottom-6 text-amber-200/40 text-xs tracking-widest hover:text-amber-200/70 transition-colors ${!skipIntro && 'animate-[fadeIn_1s_ease-out_5s_forwards]'}`}
          style={{ opacity: skipIntro ? 1 : 0 }}
        >
          About
        </button>

        {/* About text box */}
        {showAbout && (
          <div
            className="absolute bottom-14 bg-black/80 border border-amber-700/30 rounded-lg px-6 py-4 max-w-md text-center backdrop-blur-sm animate-[fadeIn_0.3s_ease-out_forwards]"
          >
            <p className="text-amber-200/80 text-sm leading-relaxed" style={{ fontFamily: 'Lato, Georgia, serif' }}>
              This is the beta version of an educational history simulation game designed by Benjamin Breen at UC Santa Cruz for use in teaching the history of medicine.
            </p>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-3 text-amber-300/60 text-xs hover:text-amber-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Keyframes for fade-in and plague animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes plagueReveal {
            0% {
              opacity: 0;
              transform: scale(1);
              text-shadow: none;
              filter: blur(3px);
              color: rgb(180, 140, 100);
            }
            30% {
              opacity: 0.7;
              filter: blur(1px);
              color: rgb(200, 100, 80);
            }
            60% {
              opacity: 1;
              transform: scale(1.06);
              filter: blur(0);
              color: rgb(220, 80, 70);
              text-shadow:
                0 0 12px rgba(255, 80, 80, 0.9),
                0 0 25px rgba(200, 50, 50, 0.7),
                0 0 40px rgba(160, 30, 30, 0.5),
                0 0 60px rgba(120, 20, 20, 0.3);
            }
            100% {
              opacity: 1;
              transform: scale(1.04);
              filter: blur(0);
              color: rgb(220, 70, 60);
              text-shadow:
                0 0 10px rgba(220, 60, 60, 0.8),
                0 0 20px rgba(180, 40, 40, 0.6),
                0 0 35px rgba(140, 25, 25, 0.4),
                0 0 50px rgba(100, 15, 15, 0.2);
            }
          }

          @keyframes plagueFlicker {
            0%, 100% {
              text-shadow:
                0 0 10px rgba(220, 60, 60, 0.8),
                0 0 20px rgba(180, 40, 40, 0.6),
                0 0 35px rgba(140, 25, 25, 0.4);
              transform: scale(1.04);
            }
            20% {
              text-shadow:
                0 0 14px rgba(255, 90, 70, 0.9),
                0 0 28px rgba(210, 55, 55, 0.75),
                0 0 45px rgba(170, 35, 35, 0.55);
              transform: scale(1.055);
            }
            40% {
              text-shadow:
                0 0 8px rgba(190, 45, 45, 0.7),
                0 0 16px rgba(150, 30, 30, 0.5),
                0 0 28px rgba(110, 18, 18, 0.3);
              transform: scale(1.025);
            }
            60% {
              text-shadow:
                0 0 15px rgba(250, 85, 75, 0.95),
                0 0 30px rgba(200, 50, 50, 0.7),
                0 0 50px rgba(160, 30, 30, 0.5);
              transform: scale(1.065);
            }
            80% {
              text-shadow:
                0 0 9px rgba(200, 50, 50, 0.75),
                0 0 18px rgba(160, 35, 35, 0.55),
                0 0 32px rgba(120, 20, 20, 0.35);
              transform: scale(1.035);
            }
          }

          .plague-word {
            display: inline-block;
            animation:
              plagueReveal 1.5s ease-out 3.5s forwards,
              plagueFlicker 3s ease-in-out 5s infinite;
            font-weight: 500;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>

      {!observeMode && (
        <UI {...uiProps} />
      )}


      {/* Building Interaction Modal */}
      {!observeMode && showEnterModal && nearBuilding && (() => {
        const isPlayerHome = uiProps.playerStats?.homeBuildingId === nearBuilding.id;
        return (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`${isPlayerHome
              ? 'bg-gradient-to-b from-emerald-50 to-green-100 border-4 border-emerald-700/60'
              : 'bg-[#f2e7d5] border-4 border-amber-900/50'
            } p-8 rounded-lg shadow-2xl max-w-md w-full text-center historical-font relative overflow-hidden`}>
              {/* Parchment/texture effect */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

              {/* Home glow effect */}
              {isPlayerHome && (
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-200/20 to-transparent pointer-events-none"></div>
              )}

              <h2 className={`text-3xl mb-6 tracking-tighter uppercase font-bold border-b pb-4 ${
                isPlayerHome
                  ? 'text-emerald-800 border-emerald-700/20'
                  : 'text-amber-900 border-amber-900/20'
              }`}>
                {isPlayerHome ? 'Enter Your Home?' : `Enter ${getBuildingLabel(nearBuilding.type)}?`}
              </h2>

              <p className={`text-xl mb-8 leading-relaxed ${isPlayerHome ? 'text-emerald-950' : 'text-amber-950'}`}>
                {isPlayerHome ? (
                  <>Return to your dwelling, where your family awaits.</>
                ) : (
                  <>Enter the {getBuildingLabel(nearBuilding.type)} of the {nearBuilding.ownerProfession} <span className={`font-bold ${isPlayerHome ? 'text-emerald-800' : 'text-amber-900'}`}>{nearBuilding.ownerName}</span>?</>
                )}
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onConfirmEnter}
                  className={`${isPlayerHome
                    ? 'bg-emerald-700 hover:bg-emerald-600'
                    : 'bg-amber-900 hover:bg-amber-800'
                  } text-white px-10 py-3 rounded-full tracking-widest transition-all shadow-lg active:scale-95`}
                >
                  {isPlayerHome ? 'ENTER' : 'YES'}
                </button>
                <button
                  onClick={onCloseEnterModal}
                  className={`bg-transparent border-2 ${isPlayerHome
                    ? 'border-emerald-700 text-emerald-800 hover:bg-emerald-700/10'
                    : 'border-amber-900 text-amber-900 hover:bg-amber-900/10'
                  } px-10 py-3 rounded-full tracking-widest transition-all active:scale-95`}
                >
                  NOT NOW
                </button>
              </div>

              <div className={`mt-8 text-[10px] uppercase tracking-widest ${
                isPlayerHome ? 'text-emerald-700/50' : 'text-amber-900/40'
              }`}>
                {isPlayerHome ? 'Home is where the heart finds rest.' : 'Seek refuge or seek fortune within.'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Merchant Modal */}
      {!observeMode && showMerchantModal && nearMerchant && (
        <MerchantModal
          merchant={nearMerchant}
          playerStats={uiProps.playerStats}
          onClose={onCloseMerchant}
          onPurchase={onPurchase}
          onSell={onSell}
          onCompound={onCompound}
        />
      )}

      {/* Loot Modal - for shattered objects and opened chests */}
      {!observeMode && lootModalData && (
        <LootModal
          data={lootModalData}
          onAccept={onLootAccept}
          onDecline={onLootDecline}
          onClose={onLootClose}
        />
      )}

      {/* Medical Treatment Modal */}
      {!observeMode && medicalModal && (
        <MedicalTreatmentModal
          isOpen={medicalModal.isOpen}
          establishmentType={medicalModal.establishmentType}
          practitionerName={medicalModal.practitionerName}
          playerPlague={plague}
          playerCurrency={playerCurrency}
          playerSkinTone={playerSkinTone}
          onTreatment={onMedicalTreatment}
          onClose={onCloseMedicalModal}
        />
      )}

      {/* Historical Guide Modal */}
      {!observeMode && (
        <GuideModal
          isOpen={showGuideModal}
          onClose={onCloseGuideModal}
          initialEntryId={selectedGuideEntryId}
        />
      )}

      {!observeMode && sceneMode === 'interior' && interiorInfo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[11px] tracking-wide z-50 pointer-events-none max-w-[88vw] text-center">
          {interiorInfo}
        </div>
      )}
      {!observeMode && sceneMode === 'interior' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-amber-600/40 text-amber-200 text-[10px] uppercase tracking-widest z-50 pointer-events-none">
          Press Esc to Exit
        </div>
      )}

      {/* Merchant Interaction Prompt - clickable for mobile */}
      {!observeMode && sceneMode === 'outdoor' && nearMerchant && !showMerchantModal && !showEncounterModal && !showEnterModalActive && !showPlayerModal && (
        <button
          onClick={onTriggerMerchant}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[E]</span>
          Trade with {nearMerchant.stats.name}
        </button>
      )}

      {/* NPC Speak Prompt - clickable for mobile (only when no merchant nearby) */}
      {!observeMode && sceneMode === 'outdoor' && nearSpeakableNpc && !nearMerchant && !nearRooftopHatch && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && (
        <button
          onClick={onTriggerSpeakToNpc}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[E]</span>
          Speak to {nearSpeakableNpc.stats.name}
        </button>
      )}

      {/* Rooftop Hatch Entry Prompt - outdoor only, when on rooftop near hatch */}
      {!observeMode && sceneMode === 'outdoor' && nearRooftopHatch && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && (
        <button
          onClick={onTriggerEnterViaRooftopHatch}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-sky-600/60 text-sky-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-sky-900/40 hover:border-sky-500/70 active:bg-sky-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[E]</span>
          Enter through roof hatch
        </button>
      )}

      {/* Medical Treatment Prompt - interior medical buildings (always visible) */}
      {!observeMode && sceneMode === 'interior' && isInMedicalBuilding && !medicalModal && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && !lootModalData && onTriggerMedicalTreatment && (
        <button
          onClick={onTriggerMedicalTreatment}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-emerald-600/60 text-emerald-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-emerald-900/40 hover:border-emerald-500/70 active:bg-emerald-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[T]</span>
          Seek Medical Treatment
        </button>
      )}

      {/* Chest Interaction Prompt - clickable for mobile (both interior and outdoor) */}
      {!observeMode && nearChest && (
        <button
          onClick={onTriggerOpenChest}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[O]</span>
          Open {nearChest.label}
        </button>
      )}

      {/* Stairs/Ladder Interaction Prompt - interior only */}
      {!observeMode && sceneMode === 'interior' && nearStairs && !nearChest && !nearBirdcage && !nearRoofHatch && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && !lootModalData && (
        <button
          onClick={onTriggerUseStairs}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[E]</span>
          {stairsPromptLabel ?? 'Use stairs'}
        </button>
      )}

      {/* Roof Hatch Interaction Prompt - interior only, top floor */}
      {!observeMode && sceneMode === 'interior' && nearRoofHatch && !nearChest && !nearBirdcage && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && !lootModalData && (
        <button
          onClick={onTriggerExitViaRoofHatch}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-sky-600/60 text-sky-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-sky-900/40 hover:border-sky-500/70 active:bg-sky-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[E]</span>
          {roofHatchPromptLabel ?? 'Climb to rooftop'}
        </button>
      )}

      {/* Birdcage Interaction Prompt */}
      {!observeMode && nearBirdcage && !nearChest && (
        <button
          onClick={onTriggerOpenBirdcage}
          className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-auto cursor-pointer hover:bg-amber-900/40 hover:border-amber-500/70 active:bg-amber-800/50 active:scale-95 transition-all touch-manipulation select-none animate-pulse"
        >
          <span className="hidden md:inline opacity-60 mr-1">[O]</span>
          Open {nearBirdcage.label}
        </button>
      )}

      <ObserveController
        observeMode={observeMode}
        lines={observeLines}
        lineCount={observeLineCount}
        onReturn={onObserveReturn}
      />

      {!observeMode && (
        <PlagueUI
          plague={plague}
          showPlagueModal={showPlagueModal}
          plagueNotification={plagueNotification}
          onCloseModal={onClosePlagueModal}
          onClearNotification={onClearPlagueNotification}
          onModalPauseToggle={onPlaguePauseToggle}
        />
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-[#1a1209] border-4 border-red-900/60 p-10 rounded-lg shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
            {/* Dark parchment effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

            {/* Skull or death symbol */}
            <div className="text-6xl mb-4 opacity-80">💀</div>

            <h2 className="text-4xl text-red-700 mb-4 tracking-tight uppercase font-bold">
              {gameOver.reason}
            </h2>

            <div className="w-16 h-0.5 bg-red-900/40 mx-auto mb-6"></div>

            <p className="text-amber-200/80 text-lg mb-8 leading-relaxed italic">
              {gameOver.description}
            </p>

            <p className="text-amber-400/60 text-sm mb-8">
              Damascus, 1348
            </p>

            <button
              onClick={onRestart}
              className="bg-red-900 hover:bg-red-800 text-amber-100 px-12 py-4 rounded-full tracking-widest transition-all shadow-lg active:scale-95 text-lg uppercase"
            >
              Begin Anew
            </button>

            <div className="mt-8 text-[10px] text-amber-900/50 uppercase tracking-widest">
              "In the midst of life we are in death"
            </div>
          </div>
        </div>
      )}

      {/* Treatment Outcome Modal */}
      {treatmentOutcome && (
        <TreatmentOutcomeModal
          outcome={treatmentOutcome}
          onClose={onCloseTreatmentOutcome}
          playerSkinTone={playerSkinTone}
        />
      )}

      {/* Toast Notifications */}
      <Toast
        messages={toastMessages}
        onDismiss={onDismissToast}
      />
    </>
  );
});

AppShell.displayName = 'AppShell';
