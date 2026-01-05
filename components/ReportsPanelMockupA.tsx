import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Skull, Heart, AlertTriangle, Users, TrendingUp, TrendingDown, Minus, Home, Package, Coins, Star, Shield, MapPin } from 'lucide-react';

/**
 * MOCKUP A: Visual/Graphical Approach
 * - Mini donut chart for epidemic stats
 * - Direction icons instead of text
 * - Mood indicator with emoji
 * - Card-based sections with icons
 * - More color and visual hierarchy
 */

interface MockupAProps {
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

// Mini donut chart component
const DonutChart: React.FC<{ stats: MockupAProps['stats'] }> = ({ stats }) => {
  const total = stats.healthy + stats.incubating + stats.infected + stats.deceased;
  const healthyPct = (stats.healthy / total) * 100;
  const incubatingPct = (stats.incubating / total) * 100;
  const infectedPct = (stats.infected / total) * 100;
  const deceasedPct = (stats.deceased / total) * 100;

  // Calculate stroke-dasharray for each segment
  const circumference = 2 * Math.PI * 40;

  let offset = 0;
  const segments = [
    { pct: healthyPct, color: '#94a3b8', label: 'Healthy' },
    { pct: incubatingPct, color: '#eab308', label: 'Incubating' },
    { pct: infectedPct, color: '#ef4444', label: 'Infected' },
    { pct: deceasedPct, color: '#4b5563', label: 'Deceased' },
  ];

  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => {
          const dashArray = (seg.pct / 100) * circumference;
          const dashOffset = -offset;
          offset += dashArray;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{total}</div>
          <div className="text-[8px] uppercase tracking-wider text-amber-400/60">Total</div>
        </div>
      </div>
    </div>
  );
};

// Direction arrow icon
const DirectionIcon: React.FC<{ direction: string }> = ({ direction }) => {
  const dir = direction.toLowerCase();
  const arrows: Record<string, string> = {
    'north': '↑', 'south': '↓', 'east': '→', 'west': '←',
    'northeast': '↗', 'northwest': '↖', 'southeast': '↘', 'southwest': '↙',
  };
  const arrow = Object.entries(arrows).find(([key]) => dir.includes(key))?.[1] || '•';

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-900/40 text-amber-300 text-xs font-bold">
      {arrow}
    </span>
  );
};

// Mood indicator
const MoodIndicator: React.FC<{ panic: number }> = ({ panic }) => {
  const getMood = () => {
    if (panic < 16) return { emoji: '😌', label: 'Calm', color: 'text-emerald-400' };
    if (panic < 36) return { emoji: '😐', label: 'Uneasy', color: 'text-yellow-400' };
    if (panic < 56) return { emoji: '😟', label: 'Anxious', color: 'text-orange-400' };
    if (panic < 76) return { emoji: '😰', label: 'Fearful', color: 'text-red-400' };
    return { emoji: '😱', label: 'Panicked', color: 'text-red-600' };
  };

  const mood = getMood();

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl">{mood.emoji}</span>
      <span className={`text-sm font-bold uppercase tracking-wider ${mood.color}`}>{mood.label}</span>
    </div>
  );
};

// Stat row with trend
const StatRow: React.FC<{
  label: string;
  value: number;
  color: string;
  dotColor: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ label, value, color, dotColor, trend = 'stable' }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      <span className={`text-xs uppercase tracking-wide ${color}`}>{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-base font-bold ${color}`}>{value}</span>
      {trend === 'up' && <TrendingUp size={12} className="text-red-400" />}
      {trend === 'down' && <TrendingDown size={12} className="text-emerald-400" />}
      {trend === 'stable' && <Minus size={12} className="text-gray-500" />}
    </div>
  </div>
);

export const ReportsPanelMockupA: React.FC<MockupAProps> = ({
  stats,
  moraleStats,
  infectedHouseholds,
  playerStats,
  daysSinceOutbreak = 1
}) => {
  const [activeTab, setActiveTab] = useState<'epidemic' | 'player' | 'guide'>('epidemic');
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: 'epidemic' as const, label: 'Epidemic', icon: <AlertTriangle size={14} /> },
    { id: 'player' as const, label: 'Player', icon: <Users size={14} /> },
    { id: 'guide' as const, label: 'Guide', icon: <Star size={14} /> },
  ];

  return (
    <div className="w-[400px] pointer-events-auto">
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-md rounded-xl border border-amber-700/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-900/30 to-transparent border-b border-amber-800/30 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={16}
              className={`text-amber-500 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Reports</span>
          </div>

          {/* Day counter badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-950/50 border border-red-800/40">
            <Skull size={12} className="text-red-400" />
            <span className="text-[10px] font-bold text-red-300">Day {daysSinceOutbreak}</span>
          </div>
        </div>

        {/* Tabs */}
        {!collapsed && (
          <div className="flex border-b border-amber-900/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all
                  ${activeTab === tab.id
                    ? 'text-amber-300 bg-amber-900/20 border-b-2 border-amber-500'
                    : 'text-amber-100/40 hover:text-amber-100/70 hover:bg-amber-900/10'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {!collapsed && (
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {activeTab === 'epidemic' && (
              <div className="space-y-4">
                {/* Stats with donut chart */}
                <div className="flex gap-4">
                  <DonutChart stats={stats} />
                  <div className="flex-1">
                    <StatRow label="Healthy" value={stats.healthy} color="text-slate-300" dotColor="bg-slate-400" />
                    <StatRow label="Incubating" value={stats.incubating} color="text-yellow-300" dotColor="bg-yellow-500" trend="up" />
                    <StatRow label="Infected" value={stats.infected} color="text-red-400" dotColor="bg-red-500" />
                    <StatRow label="Deceased" value={stats.deceased} color="text-gray-500" dotColor="bg-gray-600" />
                  </div>
                </div>

                {/* Infected Households */}
                {infectedHouseholds.length > 0 && (
                  <div className="bg-black/30 rounded-lg border border-red-900/30 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-red-400/70 mb-2 flex items-center gap-2">
                      <Home size={12} />
                      Infected Households
                    </div>
                    <div className="space-y-2">
                      {infectedHouseholds.slice(0, 5).map((h) => (
                        <div
                          key={h.buildingId}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-red-900/20
                            ${h.status === 'deceased' ? 'bg-gray-900/30 border border-gray-700/30' : 'bg-red-950/30 border border-red-800/30'}`}
                        >
                          <DirectionIcon direction={h.direction} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-amber-100 truncate">{h.npcName}</div>
                            <div className="text-[10px] text-amber-100/50">{h.direction}</div>
                          </div>
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${h.status === 'deceased' ? 'bg-gray-700 text-gray-300' : 'bg-red-800 text-red-200'}`}>
                            {h.infectedCount + h.deceasedCount} ill
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Civic Morale */}
                <div className="bg-black/30 rounded-lg border border-amber-900/30 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-amber-500/70">Civic Morale</span>
                    <MoodIndicator panic={moraleStats.avgPanic} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-amber-100/60">Plague Awareness</span>
                        <span className="font-mono text-amber-300">{Math.round(moraleStats.avgAwareness)}%</span>
                      </div>
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                          style={{ width: `${moraleStats.avgAwareness}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-amber-100/60">Public Panic</span>
                        <span className="font-mono text-amber-300">{Math.round(moraleStats.avgPanic)}%</span>
                      </div>
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            moraleStats.avgPanic < 36 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                            moraleStats.avgPanic < 56 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            moraleStats.avgPanic < 76 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                            'bg-gradient-to-r from-red-700 to-red-500'
                          }`}
                          style={{ width: `${moraleStats.avgPanic}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flavor text in "newspaper" style */}
                  <div className="mt-3 p-2 bg-amber-950/30 rounded border border-amber-800/20">
                    <div className="text-[8px] uppercase tracking-widest text-amber-600/60 mb-1">The Damascene Chronicle</div>
                    <p className="text-[11px] italic text-amber-100/60 leading-relaxed">
                      {moraleStats.avgPanic < 16 ? '"The streets feel peaceful today. Merchants call out their wares with confidence."' :
                       moraleStats.avgPanic < 36 ? '"Whispers of sickness spread through the souq. Some stalls close early."' :
                       moraleStats.avgPanic < 56 ? '"People hurry past, avoiding eye contact. The call to prayer echoes over empty streets."' :
                       moraleStats.avgPanic < 76 ? '"Fear spreads faster than the plague itself. The gates see more departures than arrivals."' :
                       '"The city trembles on the edge of chaos. God preserve us all."'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'player' && (
              <div className="space-y-4">
                {/* Player card */}
                <div className="bg-gradient-to-br from-amber-900/20 to-transparent rounded-lg border border-amber-700/30 p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar placeholder */}
                    <div className="w-16 h-16 rounded-lg bg-amber-900/40 border border-amber-600/30 flex items-center justify-center">
                      <Users size={28} className="text-amber-400/60" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-amber-100">{playerStats.name}</h3>
                      <p className="text-sm text-amber-300/70">{playerStats.profession}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-800/40 text-amber-300 uppercase tracking-wider">
                          {playerStats.socialClass}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats bars */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-lg border border-emerald-900/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart size={14} className="text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">Health</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">{Math.round(playerStats.health)}%</div>
                    <div className="h-1.5 bg-black/50 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                        style={{ width: `${playerStats.health}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg border border-sky-900/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={14} className="text-sky-400" />
                      <span className="text-[10px] uppercase tracking-wider text-sky-400/70">Reputation</span>
                    </div>
                    <div className="text-2xl font-bold text-sky-300">{Math.round(playerStats.reputation)}%</div>
                    <div className="h-1.5 bg-black/50 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full"
                        style={{ width: `${playerStats.reputation}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Wealth */}
                <div className="bg-black/30 rounded-lg border border-amber-900/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins size={16} className="text-amber-400" />
                      <span className="text-[10px] uppercase tracking-wider text-amber-400/70">Wealth</span>
                    </div>
                    <div className="text-xl font-bold text-amber-300">
                      {Math.round(playerStats.currency)} <span className="text-sm font-normal text-amber-400/60">dirhams</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="text-center py-8 text-amber-100/40">
                <Star size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Historical guide content</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPanelMockupA;
