import React from 'react';
import { UI } from './UI';
import { MerchantModal } from './MerchantModal';
import { GuideModal } from './HistoricalGuide';
import { LootModal, LootModalData, LootItem } from './LootModal';
import { ObserveController } from './observe/ObserveController';
import { PlagueUI } from './PlagueUI';
import { Toast, ToastMessage } from './Toast';
import { BuildingMetadata, MerchantNPC, MerchantItem, PlayerItem } from '../types';

interface AppShellProps {
  observeMode: boolean;
  transitioning: boolean;
  gameLoading: boolean;
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
  onPurchase: (item: MerchantItem, quantity: number) => void;
  onSell: (item: PlayerItem, quantity: number) => void;
  showGuideModal: boolean;
  selectedGuideEntryId: string | null;
  onCloseGuideModal: () => void;
  interiorInfo: string | null;
  sceneMode: 'outdoor' | 'interior';
  nearSpeakableNpc: any | null;
  nearChest: { id: string; label: string; position: [number, number, number]; locationName: string } | null;
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
}

export const AppShell = React.memo(({
  observeMode,
  transitioning,
  gameLoading,
  uiProps,
  performanceIndicator,
  showEnterModal,
  nearBuilding,
  onConfirmEnter,
  onCloseEnterModal,
  showMerchantModal,
  nearMerchant,
  onCloseMerchant,
  onPurchase,
  onSell,
  showGuideModal,
  selectedGuideEntryId,
  onCloseGuideModal,
  interiorInfo,
  sceneMode,
  nearSpeakableNpc,
  nearChest,
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
  onLootClose
}: AppShellProps) => {
  return (
    <>
      <div
        className={`absolute inset-0 z-50 bg-black transition-opacity duration-500 pointer-events-none ${
          transitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Initial loading overlay - fades out after assets load */}
      <div
        className={`absolute inset-0 z-[200] bg-stone-950 flex flex-col items-center justify-center transition-opacity duration-1000 ${
          gameLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h1 className="text-5xl md:text-7xl text-amber-100/90 tracking-[0.25em] font-light mb-4"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          DAMASCUS
        </h1>
        <p className="text-2xl md:text-3xl text-amber-200/60 tracking-[0.5em] font-light"
           style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          1348
        </p>
        <div className="mt-12 w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </div>

      {!observeMode && (
        <UI {...uiProps} />
      )}

      {/* Subtle Performance Indicator - only shows when adjusting, click to dismiss */}
      {!observeMode && performanceIndicator.show && (
        <div
          className="absolute top-2 right-2 bg-black/60 text-yellow-400 text-xs px-3 py-1.5 rounded-md border border-yellow-600/30 backdrop-blur-sm font-mono z-50 cursor-pointer hover:bg-black/80 transition-colors"
          onClick={performanceIndicator.onDismiss}
          title="Click to dismiss"
        >
          ⚡ Adaptive Quality Active {performanceIndicator.shadowsDisabled && '(shadows off)'}
        </div>
      )}

      {/* Building Interaction Modal */}
      {!observeMode && showEnterModal && nearBuilding && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#f2e7d5] border-4 border-amber-900/50 p-8 rounded-lg shadow-2xl max-w-md w-full text-center historical-font relative overflow-hidden">
            {/* Parchment effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

            <h2 className="text-3xl text-amber-900 mb-6 tracking-tighter uppercase font-bold border-b border-amber-900/20 pb-4">
              Enter {getBuildingLabel(nearBuilding.type)}?
            </h2>

            <p className="text-amber-950 text-xl mb-8 leading-relaxed">
              Enter the {getBuildingLabel(nearBuilding.type)} of the {nearBuilding.ownerProfession} <span className="font-bold text-amber-900">{nearBuilding.ownerName}</span>?
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={onConfirmEnter}
                className="bg-amber-900 hover:bg-amber-800 text-white px-10 py-3 rounded-full tracking-widest transition-all shadow-lg active:scale-95"
              >
                YES
              </button>
              <button
                onClick={onCloseEnterModal}
                className="bg-transparent border-2 border-amber-900 text-amber-900 hover:bg-amber-900/10 px-10 py-3 rounded-full tracking-widest transition-all active:scale-95"
              >
                NOT NOW
              </button>
            </div>

            <div className="mt-8 text-[10px] text-amber-900/40 uppercase tracking-widest">
              Seek refuge or seek fortune within.
            </div>
          </div>
        </div>
      )}

      {/* Merchant Modal */}
      {!observeMode && showMerchantModal && nearMerchant && (
        <MerchantModal
          merchant={nearMerchant}
          playerStats={uiProps.playerStats}
          onClose={onCloseMerchant}
          onPurchase={onPurchase}
          onSell={onSell}
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

      {/* Merchant Interaction Prompt */}
      {!observeMode && sceneMode === 'outdoor' && nearMerchant && !showMerchantModal && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">E</span> to trade with {nearMerchant.stats.name}
        </div>
      )}

      {/* NPC Speak Prompt (only when no merchant nearby) */}
      {!observeMode && sceneMode === 'outdoor' && nearSpeakableNpc && !nearMerchant && !showEncounterModal && !showMerchantModal && !showEnterModalActive && !showPlayerModal && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">E</span> to speak to {nearSpeakableNpc.stats.name}
        </div>
      )}

      {/* Chest Interaction Prompt (both interior and outdoor) */}
      {!observeMode && nearChest && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-amber-600/60 text-amber-200 text-sm tracking-wide z-50 pointer-events-none animate-pulse">
          Press <span className="font-bold text-amber-400">O</span> to open {nearChest.label}
        </div>
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

      {/* Toast Notifications */}
      <Toast
        messages={toastMessages}
        onDismiss={onDismissToast}
      />
    </>
  );
});

AppShell.displayName = 'AppShell';
