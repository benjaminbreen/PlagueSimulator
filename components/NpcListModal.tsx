import React from 'react';

export interface NpcListEntry {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  profession: string | null;
  location: 'interior' | 'outdoor' | 'unknown';
  direction: string | null;
  distance: number | null;
}

interface NpcListModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: NpcListEntry[];
}

export const NpcListModal: React.FC<NpcListModalProps> = ({ isOpen, onClose, entries }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-amber-800/50 bg-black/90 shadow-2xl select-text">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-amber-300/70">NPC List</div>
            <div className="text-sm text-amber-100/80">NPCs on this map</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-amber-300/70 hover:text-amber-100 hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-amber-100/80">
          {entries.length === 0 ? (
            <div className="text-amber-200/60 text-sm">No NPCs tracked on this map yet.</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-3 text-[10px] uppercase tracking-[0.25em] text-amber-400/70 pb-2 border-b border-amber-900/40">
                <div>Name</div>
                <div>Age</div>
                <div>Gender</div>
                <div>Profession</div>
                <div>Location</div>
                <div>Direction</div>
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-3 text-[12px] text-amber-100/80 border-b border-amber-950/40 py-2"
                >
                  <div className="truncate">{entry.name}</div>
                  <div>{entry.age ?? '—'}</div>
                  <div>{entry.gender ?? '—'}</div>
                  <div className="truncate">{entry.profession ?? '—'}</div>
                  <div>{entry.location === 'interior' ? 'indoors' : entry.location === 'outdoor' ? 'outdoors' : 'unknown'}</div>
                  <div>
                    {entry.direction
                      ? `${entry.direction}${entry.distance ? ` (${Math.round(entry.distance)}m)` : ''}`
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
