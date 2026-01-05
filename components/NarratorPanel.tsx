import React from 'react';

export interface NarratorHighlightEntry {
  term: string;
  kind: 'npc' | 'family' | 'merchant' | 'special' | 'building' | 'object' | 'interior-npc' | 'interior-prop';
  id?: string;
  position?: [number, number, number];
}

interface NarratorPanelProps {
  visible: boolean;
  narratorKey: number;
  message: string;
  narratorOpen: boolean;
  narratorHistory: string[];
  highlights?: {
    entries: NarratorHighlightEntry[];
  };
  onHighlightSelect?: (entry: NarratorHighlightEntry) => void;
  onOpenTransparency?: () => void;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightClassForKind = (kind: NarratorHighlightEntry['kind']) => {
  if (kind === 'family') return 'text-rose-300';
  if (kind === 'npc' || kind === 'merchant' || kind === 'special' || kind === 'interior-npc') return 'text-emerald-300';
  return 'text-amber-300';
};

const renderHighlighted = (
  text: string,
  highlights: NarratorPanelProps['highlights'],
  onHighlightSelect?: (entry: NarratorHighlightEntry) => void
) => {
  if (!highlights) return text;
  const terms = highlights.entries
    .filter((entry) => entry.term)
    .map((entry) => ({
      ...entry,
      className: highlightClassForKind(entry.kind)
    }));

  if (terms.length === 0) return text;
  terms.sort((a, b) => b.term.length - a.term.length);

  const regexes = terms.map((entry) => ({
    entry,
    regex: new RegExp(escapeRegExp(entry.term), 'gi')
  }));

  const nodes: Array<string | JSX.Element> = [];
  let index = 0;

  while (index < text.length) {
    let bestMatch: { index: number; length: number; entry: NarratorHighlightEntry; className: string } | null = null;

    regexes.forEach((item) => {
      item.regex.lastIndex = index;
      const match = item.regex.exec(text);
      if (!match) return;
      const start = match.index;
      const length = match[0].length;
      const className = highlightClassForKind(item.entry.kind);
      if (!bestMatch || start < bestMatch.index || (start === bestMatch.index && length > bestMatch.length)) {
        bestMatch = { index: start, length, entry: item.entry, className };
      }
    });

    if (!bestMatch) {
      nodes.push(text.slice(index));
      break;
    }

    if (bestMatch.index > index) {
      nodes.push(text.slice(index, bestMatch.index));
    }

    const matchedText = text.slice(bestMatch.index, bestMatch.index + bestMatch.length);
    const clickable = Boolean(onHighlightSelect && bestMatch.entry.position);
    nodes.push(
      <span
        key={`${bestMatch.index}-${matchedText}`}
        className={`${bestMatch.className} ${clickable ? 'cursor-pointer hover:underline' : ''}`}
        onClick={() => {
          if (clickable && onHighlightSelect) {
            onHighlightSelect(bestMatch.entry);
          }
        }}
      >
        {matchedText}
      </span>
    );
    index = bestMatch.index + bestMatch.length;
  }

  return nodes;
};

const isPlayerLine = (text: string) => text.trim().toLowerCase().startsWith('you:');

export const NarratorPanel: React.FC<NarratorPanelProps> = React.memo(({ visible, narratorKey, message, narratorOpen, narratorHistory, highlights, onHighlightSelect, onOpenTransparency }) => {
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

        <div className="relative rounded-2xl px-5 py-4 bg-black/20 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/[0.06]">
          <button
            type="button"
            onClick={onOpenTransparency}
            className="text-[8px] uppercase tracking-[0.5em] text-white/40 mb-2 font-light hover:text-amber-200/80 transition-colors"
          >
            The Narrator
          </button>

          {narratorOpen ? (
            <div className="max-h-64 md:max-h-72 overflow-y-auto pr-1 text-[13px] md:text-[15px] leading-relaxed text-white/80 font-light tracking-[0.02em]" style={{ fontFamily: 'Lato, sans-serif' }}>
              {narratorHistory.length > 0
                ? narratorHistory.map((entry, idx) => {
                    const playerLine = isPlayerLine(entry);
                    return (
                      <p
                        key={`${entry}-${idx}`}
                        className={`mb-3 last:mb-0 ${playerLine ? 'text-amber-100/80 text-right' : ''}`}
                      >
                      {playerLine
                        ? <span className="text-amber-200/70 italic">{entry}</span>
                        : renderHighlighted(entry, highlights, onHighlightSelect)}
                    </p>
                  );
                })
                : renderHighlighted(message, highlights, onHighlightSelect)}
            </div>
          ) : (
            <div
              className="text-[13px] md:text-[15px] leading-relaxed text-white/75 font-light tracking-[0.02em]"
              style={{
                fontFamily: 'Lato, sans-serif',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 5,
                overflow: 'hidden'
              }}
            >
              {isPlayerLine(message)
                ? <span className="text-amber-200/70 italic">{message}</span>
                : renderHighlighted(message, highlights, onHighlightSelect)}
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
