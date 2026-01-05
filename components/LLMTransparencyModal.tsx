import React from 'react';

interface LLMTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Array<{
    id: string;
    prompt: string;
    response: string;
  }>;
}

export const LLMTransparencyModal: React.FC<LLMTransparencyModalProps> = ({ isOpen, onClose, entries }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-amber-800/50 bg-black/90 shadow-2xl select-text">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-amber-300/70">LLM Transparency</div>
            <div className="text-sm text-amber-100/80">Last 5 narrator exchanges</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-amber-300/70 hover:text-amber-100 hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4 text-amber-100/80">
          {entries.length === 0 ? (
            <div className="text-amber-200/60 text-sm">No narrator requests yet.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-amber-900/40 bg-black/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400/70 mb-2">Prompt</div>
                <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-amber-100/80 font-light select-text">{entry.prompt}</pre>
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400/70 mt-4 mb-2">Response</div>
                <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-amber-100/80 font-light select-text">{entry.response}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
