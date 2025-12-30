import React from 'react';

interface ObserveControllerProps {
  observeMode: boolean;
  lines: string[];
  lineCount: number;
  onReturn?: () => void;
}

export const ObserveController: React.FC<ObserveControllerProps> = ({ observeMode, lines, lineCount, onReturn }) => {
  if (!observeMode) return null;
  return (
    <div className="absolute inset-0 z-[160] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.82),rgba(0,0,0,0.45),rgba(0,0,0,0.7))]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#3b2415]/30 via-transparent to-black/50 mix-blend-multiply"></div>
      <div className="relative w-full max-w-2xl px-8 text-center space-y-4">
        {lines.slice(0, lineCount).map((line, index) => (
          <div
            key={`${line}-${index}`}
            className="text-amber-50/95 text-lg md:text-[22px] tracking-[0.01em] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-4 duration-1200"
            style={{
              fontFamily: '"Fraunces", "Cinzel", serif',
              animationDelay: `${index * 180}ms`
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-full border border-amber-200/70 bg-black/70 px-6 py-2 text-[11px] uppercase tracking-[0.22em] text-amber-50 hover:bg-black/85"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
