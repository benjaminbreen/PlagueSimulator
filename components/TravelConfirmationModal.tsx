import React, { useEffect } from 'react';

type TravelConfirmationModalProps = {
  destinationName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const TravelConfirmationModal: React.FC<TravelConfirmationModalProps> = ({
  destinationName,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onCancel}
    >
      <div
        className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 border-2 border-amber-700/50 rounded-lg shadow-2xl p-6 max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 40px rgba(217, 119, 6, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        <h2
          className="text-xl font-bold text-amber-100 text-center mb-4"
          style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}
        >
          Travel to {destinationName}?
        </h2>

        <p className="text-amber-200/80 text-center text-sm mb-6">
          You will be transported to this location instantly.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 font-semibold rounded border border-amber-500/50 shadow-lg transition-all hover:scale-105"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
          >
            Yes
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gradient-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-stone-200 font-semibold rounded border border-stone-600/50 shadow-lg transition-all hover:scale-105"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};
