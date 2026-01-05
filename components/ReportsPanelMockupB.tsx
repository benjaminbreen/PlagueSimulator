import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

/**
 * MOCKUP B: Minimal/Typographic Approach
 * - Clean typography with strong hierarchy
 * - Horizontal data rows, no cards
 * - Subtle separators instead of boxes
 * - Monospace numbers for alignment
 * - Muted palette, fewer colors
 * - Text-based indicators, no emoji
 * - Compact and scannable
 */

interface MockupBProps {
  stats: {
    healthy: number;
    incubating: number;
    infected: number;
    deceased: number;
  };
  moraleStats: {
    avgPanic: number;
    avgAwareness: number;
  };
  infectedHouseholds: Array<{
    buildingId: string;
    npcName: string;
    direction: string;
    infectedCount: number;
    deceasedCount: number;
    status: string;
  }>;
  playerStats: {
    name: string;
    profession: string;
    health: number;
    reputation: number;
    currency: number;
    socialClass: string;
  };
  daysSinceOutbreak?: number;
}

// Inline progress bar - very subtle
const InlineBar: React.FC<{ value: number; max?: number; color?: string }> = ({
  value,
  max = 100,
  color = 'bg-amber-500/60'
}) => (
  <div className="w-20 h-1 bg-black/30 rounded-full overflow-hidden">
    <div
      className={`h-full ${color} rounded-full transition-all duration-300`}
      style={{ width: `${(value / max) * 100}%` }}
    />
  </div>
);

// Status text for morale levels
const getMoraleLabel = (panic: number): { text: string; className: string } => {
  if (panic < 16) return { text: 'Tranquil', className: 'text-emerald-400' };
  if (panic < 36) return { text: 'Uneasy', className: 'text-yellow-400' };
  if (panic < 56) return { text: 'Anxious', className: 'text-orange-400' };
  if (panic < 76) return { text: 'Fearful', className: 'text-red-400' };
  return { text: 'Desperate', className: 'text-red-500' };
};

export const ReportsPanelMockupB: React.FC<MockupBProps> = ({
  stats,
  moraleStats,
  infectedHouseholds,
  playerStats,
  daysSinceOutbreak = 1
}) => {
  const [activeTab, setActiveTab] = useState<'epidemic' | 'player' | 'guide'>('epidemic');
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHouseholds, setExpandedHouseholds] = useState(false);

  const totalPop = stats.healthy + stats.incubating + stats.infected + stats.deceased;
  const moraleLabel = getMoraleLabel(moraleStats.avgPanic);

  return (
    <div className="w-[340px] pointer-events-auto font-mono">
      <div className="bg-black/90 backdrop-blur-sm border border-amber-900/50 shadow-xl">
        {/* Minimal header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-amber-900/30 cursor-pointer select-none"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <ChevronRight
              size={12}
              className={`text-amber-600 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            />
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-500">Reports</span>
          </div>
          <span className="text-[10px] text-red-400/70">Day {daysSinceOutbreak}</span>
        </div>

        {!collapsed && (
          <>
            {/* Tab bar - text only, underline active */}
            <div className="flex border-b border-amber-900/20">
              {(['epidemic', 'player', 'guide'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[9px] uppercase tracking-[0.2em] transition-colors
                    ${activeTab === tab
                      ? 'text-amber-400 border-b border-amber-500'
                      : 'text-amber-100/30 hover:text-amber-100/50'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div className="p-3 max-h-[450px] overflow-y-auto text-xs">

              {activeTab === 'epidemic' && (
                <div className="space-y-4">

                  {/* Population header with total */}
                  <div className="flex items-baseline justify-between border-b border-amber-900/20 pb-2">
                    <span className="text-[10px] uppercase tracking-widest text-amber-600/80">Population</span>
                    <span className="text-amber-100/50">{totalPop} total</span>
                  </div>

                  {/* Stats as horizontal rows */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-amber-100/60 w-20">Healthy</span>
                      <span className="text-amber-100/40 w-12 text-right">{stats.healthy}</span>
                      <span className="text-amber-100/30 w-12 text-right">{((stats.healthy/totalPop)*100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-yellow-400/80 w-20">Incubating</span>
                      <span className="text-yellow-400/60 w-12 text-right">{stats.incubating}</span>
                      <span className="text-yellow-400/40 w-12 text-right">{((stats.incubating/totalPop)*100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-red-400/90 w-20">Infected</span>
                      <span className="text-red-400/70 w-12 text-right">{stats.infected}</span>
                      <span className="text-red-400/50 w-12 text-right">{((stats.infected/totalPop)*100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-500 w-20">Deceased</span>
                      <span className="text-gray-500 w-12 text-right">{stats.deceased}</span>
                      <span className="text-gray-500/70 w-12 text-right">{((stats.deceased/totalPop)*100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-amber-900/20 pt-3">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-amber-600/80">City Morale</span>
                      <span className={`text-[10px] uppercase tracking-wider ${moraleLabel.className}`}>
                        {moraleLabel.text}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-100/50">Awareness</span>
                        <div className="flex items-center gap-2">
                          <InlineBar value={moraleStats.avgAwareness} color="bg-amber-500/60" />
                          <span className="text-amber-100/40 w-8 text-right">{Math.round(moraleStats.avgAwareness)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-100/50">Panic</span>
                        <div className="flex items-center gap-2">
                          <InlineBar
                            value={moraleStats.avgPanic}
                            color={moraleStats.avgPanic > 50 ? 'bg-red-500/70' : 'bg-amber-500/60'}
                          />
                          <span className="text-amber-100/40 w-8 text-right">{Math.round(moraleStats.avgPanic)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Infected households - collapsible list */}
                  {infectedHouseholds.length > 0 && (
                    <div className="border-t border-amber-900/20 pt-3">
                      <button
                        className="flex items-center justify-between w-full text-left"
                        onClick={() => setExpandedHouseholds(!expandedHouseholds)}
                      >
                        <span className="text-[10px] uppercase tracking-widest text-red-500/80">
                          Infected Households
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400/60">{infectedHouseholds.length}</span>
                          <ChevronRight
                            size={12}
                            className={`text-red-500/60 transition-transform ${expandedHouseholds ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </button>

                      {expandedHouseholds && (
                        <div className="mt-2 space-y-1 pl-2 border-l border-red-900/30">
                          {infectedHouseholds.slice(0, 8).map((h) => (
                            <div
                              key={h.buildingId}
                              className={`flex items-center justify-between py-1.5 px-2 cursor-pointer hover:bg-red-900/10 transition-colors
                                ${h.status === 'deceased' ? 'text-gray-500' : 'text-amber-100/70'}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-[10px] text-amber-500/50 w-4">{h.direction.slice(0, 1).toUpperCase()}</span>
                                <span className="truncate">{h.npcName}</span>
                              </div>
                              <span className={`text-[10px] tabular-nums ${h.status === 'deceased' ? 'text-gray-600' : 'text-red-400/70'}`}>
                                {h.infectedCount + h.deceasedCount} ill
                              </span>
                            </div>
                          ))}
                          {infectedHouseholds.length > 8 && (
                            <div className="text-[10px] text-amber-100/30 py-1 px-2">
                              +{infectedHouseholds.length - 8} more...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'player' && (
                <div className="space-y-4">
                  {/* Player identity */}
                  <div className="border-b border-amber-900/20 pb-3">
                    <div className="text-lg text-amber-100">{playerStats.name}</div>
                    <div className="text-amber-400/60">{playerStats.profession}</div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-100/30 mt-1">
                      {playerStats.socialClass}
                    </div>
                  </div>

                  {/* Stats as clean rows */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-100/50">Health</span>
                      <div className="flex items-center gap-3">
                        <InlineBar
                          value={playerStats.health}
                          color={playerStats.health > 60 ? 'bg-emerald-500/70' : playerStats.health > 30 ? 'bg-yellow-500/70' : 'bg-red-500/70'}
                        />
                        <span className={`w-10 text-right tabular-nums ${
                          playerStats.health > 60 ? 'text-emerald-400' :
                          playerStats.health > 30 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {Math.round(playerStats.health)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-amber-100/50">Reputation</span>
                      <div className="flex items-center gap-3">
                        <InlineBar value={playerStats.reputation} color="bg-sky-500/60" />
                        <span className="text-sky-400 w-10 text-right tabular-nums">
                          {Math.round(playerStats.reputation)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-900/20">
                      <span className="text-amber-100/50">Wealth</span>
                      <span className="text-amber-300 tabular-nums">
                        {Math.round(playerStats.currency)} <span className="text-amber-100/30">dir.</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick status line */}
                  <div className="pt-3 border-t border-amber-900/20">
                    <div className="text-[10px] uppercase tracking-widest text-amber-600/60 mb-2">Status</div>
                    <div className="text-amber-100/50 text-[11px] leading-relaxed">
                      {playerStats.health > 80 ? 'Feeling strong and healthy.' :
                       playerStats.health > 60 ? 'In good condition.' :
                       playerStats.health > 40 ? 'Some fatigue setting in.' :
                       playerStats.health > 20 ? 'Weakened. Rest advisable.' :
                       'Dangerously unwell.'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="py-6 text-center text-amber-100/30">
                  <div className="text-[10px] uppercase tracking-widest mb-2">Historical Guide</div>
                  <p className="text-[11px]">Context and information</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPanelMockupB;
