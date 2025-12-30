import React from 'react';

interface NarratorPanelProps {
  visible: boolean;
  narratorKey: number;
  message: string;
  narratorOpen: boolean;
  narratorHistory: string[];
}

export const NarratorPanel: React.FC<NarratorPanelProps> = React.memo(({ visible, narratorKey, message, narratorOpen, narratorHistory }) => {
  void narratorKey;

  return (
    <div
      className={`w-[320px] md:w-[360px] max-w-[92vw] transition-all ease-in-out ${
        visible ? 'duration-[5000ms]' : 'duration-[2000ms]'
      } ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-3 pointer-events-none'
      } ${narratorOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="relative">
        <div className="absolute -inset-4 rounded-3xl bg-white/[0.02] blur-xl" />

        <div className="relative rounded-2xl px-4 py-3 bg-black/20 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/[0.06]">
          <div className="text-[8px] uppercase tracking-[0.5em] text-white/40 mb-2 font-light">
            The Narrator
          </div>

          {narratorOpen ? (
            <div className="max-h-48 overflow-y-auto pr-1 text-[15px] md:text-[17px] leading-relaxed text-white/80 font-light tracking-[0.02em]" style={{ fontFamily: 'Lato, sans-serif' }}>
              {narratorHistory.length > 0
                ? narratorHistory.map((entry, idx) => (
                    <p key={`${entry}-${idx}`} className="mb-3 last:mb-0">
                      {entry}
                    </p>
                  ))
                : message}
            </div>
          ) : (
            <div
              className="text-[15px] md:text-[17px] leading-relaxed text-white/75 font-light tracking-[0.02em]"
              style={{
                fontFamily: 'Lato, sans-serif',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 5,
                overflow: 'hidden'
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.narratorKey === nextProps.narratorKey &&
    prevProps.visible === nextProps.visible &&
    prevProps.narratorOpen === nextProps.narratorOpen &&
    prevProps.message === nextProps.message &&
    prevProps.narratorHistory === nextProps.narratorHistory
  );
});

NarratorPanel.displayName = 'NarratorPanel';
