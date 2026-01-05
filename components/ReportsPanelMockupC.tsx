import React, { useState } from 'react';
import { ChevronDown, Heart, Shield, Coins, PieChart, List, Skull, ShieldAlert, Package, Users } from 'lucide-react';
import { GuideTab } from './HistoricalGuide';
import { NPCStats, FamilyMember, AgentState } from '../types';
import { FamilyPortrait } from './FamilyPortrait';

/**
 * ReportsPanel - Production Version
 * Combines the best elements from all mockups with full functionality.
 */

interface ReportsPanelProps {
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
    buildingPosition: [number, number, number];
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
    age: number;
    gender: 'Male' | 'Female';
    family: string;
    familyMembers: FamilyMember[];
    inventory: any[];
    maxInventorySlots: number;
    // Appearance fields for portrait
    skinTone?: string;
    hairColor?: string;
    hairStyle?: 'short' | 'medium' | 'long' | 'covered';
    headwearStyle?: 'scarf' | 'cap' | 'turban' | 'fez' | 'straw' | 'taqiyah' | 'none';
    headwearColor?: string;
    facialHair?: 'none' | 'stubble' | 'short_beard' | 'full_beard' | 'mustache' | 'goatee';
    healthState?: AgentState;
  };
  daysSinceOutbreak?: number;
  // Callbacks
  onNavigateToHousehold?: (buildingPosition: [number, number, number]) => void;
  onNavigateToDeceased?: () => void;
  onShowPlayerModal?: () => void;
  onOpenFamilyDossier?: () => void;
  onOpenInventoryDossier?: () => void;
  onSelectFamilyMember?: (member: FamilyMember) => void;
  // Epidemiology mode
  params?: {
    infectionRate: number;
    hygieneLevel: number;
    quarantine: boolean;
  };
  onChangeParam?: (key: string, value: any) => void;
  showDemographicsOverlay?: boolean;
  setShowDemographicsOverlay?: (value: boolean) => void;
  // Inventory (resolved entries with names)
  inventoryEntries?: Array<{
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    rarity: 'common' | 'uncommon' | 'rare';
  }>;
  onSelectInventoryItem?: (item: any) => void;
  // Guide tab
  currentBiomeLabel?: string;
  nearbyNPCs?: NPCStats[];
  onOpenGuideModal?: () => void;
  onSelectGuideEntry?: (entryId: string) => void;
  playerInfected?: boolean;
}

// Donut chart component
const DonutChart: React.FC<{ stats: ReportsPanelProps['stats']; size?: number }> = ({ stats, size = 80 }) => {
  const total = stats.healthy + stats.incubating + stats.infected + stats.deceased;
  if (total === 0) return null;

  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: stats.healthy, color: '#4CAF50' },  // emerald-500
    { value: stats.incubating, color: '#eab308' },
    { value: stats.infected, color: '#dc2626' },
    { value: stats.deceased, color: '#374151' },
  ];

  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashArray = pct * circumference;
          const dashOffset = -offset;
          offset += dashArray;
          return (
            <circle
              key={i}
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-amber-100">{total}</div>
          <div className="text-[10px] uppercase tracking-widest text-amber-400/60">souls</div>
        </div>
      </div>
    </div>
  );
};

// Stat row for list view
const StatRow: React.FC<{
  label: string;
  value: number;
  total: number;
  dotColor: string;
  textColor: string;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ label, value, total, dotColor, textColor, onClick, clickable }) => (
  <div
    className={`flex items-center justify-between py-2 border-b border-amber-900/20 last:border-0 ${
      clickable ? 'cursor-pointer hover:bg-amber-900/20 -mx-2 px-2 rounded transition-colors' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-2.5">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      <span className={`text-[15px] ${textColor}`}>{label}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className={`font-mono text-base ${textColor}`}>{value}</span>
      <span className="text-sm text-amber-100/40 w-10 text-right">
        {total > 0 ? `${Math.round((value / total) * 100)}%` : '—'}
      </span>
    </div>
  </div>
);

// Inline progress bar
const InlineBar: React.FC<{ value: number; max?: number; colorClass?: string }> = ({
  value,
  max = 100,
  colorClass = 'bg-amber-500/60'
}) => (
  <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
    <div
      className={`h-full ${colorClass} rounded-full transition-all duration-300`}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
);

// Direction arrow badge
const DirectionBadge: React.FC<{ direction: string }> = ({ direction }) => {
  const dir = direction.toLowerCase();
  const arrows: Record<string, string> = {
    'north': '↑', 'south': '↓', 'east': '→', 'west': '←',
    'northeast': '↗', 'northwest': '↖', 'southeast': '↘', 'southwest': '↙',
  };
  const arrow = Object.entries(arrows).find(([key]) => dir.includes(key))?.[1] || '•';

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-900/30 text-amber-300/80 text-[10px] font-bold">
      {arrow}
    </span>
  );
};

// Morale status
const getMoraleStatus = (panic: number): { label: string; className: string } => {
  if (panic < 20) return { label: 'Calm', className: 'text-emerald-400' };
  if (panic < 40) return { label: 'Uneasy', className: 'text-yellow-400' };
  if (panic < 60) return { label: 'Anxious', className: 'text-orange-400' };
  if (panic < 80) return { label: 'Fearful', className: 'text-red-400' };
  return { label: 'Desperate', className: 'text-red-500' };
};

export const ReportsPanelMockupC: React.FC<ReportsPanelProps> = ({
  stats,
  moraleStats,
  infectedHouseholds,
  playerStats,
  daysSinceOutbreak = 1,
  onNavigateToHousehold,
  onNavigateToDeceased,
  onShowPlayerModal,
  onOpenFamilyDossier,
  onOpenInventoryDossier,
  onSelectFamilyMember,
  params,
  onChangeParam,
  showDemographicsOverlay,
  setShowDemographicsOverlay,
  inventoryEntries = [],
  onSelectInventoryItem,
  currentBiomeLabel = '',
  nearbyNPCs = [],
  onOpenGuideModal,
  onSelectGuideEntry,
  playerInfected = false
}) => {
  const [activeTab, setActiveTab] = useState<'epidemic' | 'player' | 'guide'>('epidemic');
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [householdsExpanded, setHouseholdsExpanded] = useState(true);
  const [epidemiologyExpanded, setEpidemiologyExpanded] = useState(false);

  const total = stats.healthy + stats.incubating + stats.infected + stats.deceased;
  const moraleStatus = getMoraleStatus(moraleStats.avgPanic);

  return (
    <div className="w-full md:w-[460px] pointer-events-auto">
      {/* Main container - frosted glass */}
      <div className="bg-black/75 backdrop-blur-md rounded-lg border border-amber-400/25 shadow-lg overflow-hidden">

        {/* Header with pill tabs */}
        <div
          className="flex items-center justify-between px-5 py-2.5 cursor-pointer select-none border-b border-amber-900/40"
          onClick={(e) => {
            // Only collapse if clicking the header area, not the tabs
            if ((e.target as HTMLElement).closest('button')) return;
            setCollapsed(!collapsed);
          }}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={16}
              className={`text-amber-500/70 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">Reports Panel</span>
          </div>

          {/* Pill tabs in header */}
          {!collapsed && (
            <div className="flex gap-1.5 bg-amber-950/40 p-1.5 rounded-full border border-amber-900/40">
              {(['epidemic', 'player', 'guide'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab);
                  }}
                  className={`px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full transition-all
                    ${activeTab === tab
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-amber-200/50 hover:text-amber-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {!collapsed && (
          <>

            {/* Content */}
            <div className="p-5 max-h-[560px] overflow-y-auto">

              {activeTab === 'epidemic' && (
                <div className="space-y-4 px-1 ">

                  {/* Population section with view toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] uppercase tracking-[0.2em] text-amber-500/80 font-medium">Population</span>
                      {/* View toggle */}
                      <div className="flex items-center bg-black/30 rounded p-0.5">
                        <button
                          onClick={() => setViewMode('chart')}
                          className={`p-1 rounded transition-all ${
                            viewMode === 'chart' ? 'bg-amber-900/50 text-amber-300' : 'text-amber-100/30 hover:text-amber-100/50'
                          }`}
                          title="Chart view"
                        >
                          <PieChart size={10} />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1 rounded transition-all ${
                            viewMode === 'list' ? 'bg-amber-900/50 text-amber-300' : 'text-amber-100/30 hover:text-amber-100/50'
                          }`}
                          title="List view"
                        >
                          <List size={10} />
                        </button>
                      </div>
                    </div>

                    {viewMode === 'chart' ? (
                      /* Chart view - donut with legend */
                      <div className="flex items-center gap-5">
                        <DonutChart stats={stats} size={90} />
                        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="text-[15px] text-green-400/90">Healthy</span>
                            </div>
                            <span className="font-mono text-lg text-green-400">{stats.healthy}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                              <span className="text-[15px] text-yellow-300/90">Incubating</span>
                            </div>
                            <span className="font-mono text-lg text-yellow-300/90">{stats.incubating}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                              <span className="text-[15px] text-red-400">Infected</span>
                            </div>
                            <span className="font-mono text-lg text-red-400">{stats.infected}</span>
                          </div>
                          <div
                            className={`flex items-center justify-between ${
                              stats.deceased > 0 && onNavigateToDeceased ? 'cursor-pointer hover:text-gray-200' : ''
                            }`}
                            onClick={() => stats.deceased > 0 && onNavigateToDeceased?.()}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                              <span className="text-[15px] text-gray-400">Deceased</span>
                            </div>
                            <span className="font-mono text-lg text-gray-400">{stats.deceased}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* List view - rows */
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <StatRow label="Healthy" value={stats.healthy} total={total} dotColor="bg-green-500" textColor="text-green-400/80" />
                        <StatRow label="Incubating" value={stats.incubating} total={total} dotColor="bg-yellow-500" textColor="text-yellow-300/80" />
                        <StatRow label="Infected" value={stats.infected} total={total} dotColor="bg-red-600" textColor="text-red-400" />
                        <StatRow
                          label="Deceased"
                          value={stats.deceased}
                          total={total}
                          dotColor="bg-gray-600"
                          textColor="text-gray-400"
                          onClick={() => stats.deceased > 0 && onNavigateToDeceased?.()}
                          clickable={stats.deceased > 0 && !!onNavigateToDeceased}
                        />
                      </div>
                    )}
                  </div>

                  {/* Civic Morale - side by side meters */}
                  <div className="pt-4 border-t border-amber-900/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] uppercase tracking-[0.2em] text-amber-500/80 font-medium">Civic Morale</span>
                      <span className={`text-[13px] px-2 py-1 rounded-full uppercase tracking-wider font-medium ${moraleStatus.className} ${
                        moraleStats.avgPanic < 20 ? 'bg-emerald-900/30' :
                        moraleStats.avgPanic < 40 ? 'bg-yellow-900/30' :
                        moraleStats.avgPanic < 60 ? 'bg-orange-900/30' :
                        'bg-red-900/30'
                      }`}>
                        {moraleStatus.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] text-amber-100/80">Awareness</span>
                          <span className="font-mono text-sm text-amber-300/80">{Math.round(moraleStats.avgAwareness)}%</span>
                        </div>
                        <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-700 to-amber-500"
                            style={{ width: `${moraleStats.avgAwareness}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] text-amber-100/80">Panic</span>
                          <span className="font-mono text-sm text-amber-300/80">{Math.round(moraleStats.avgPanic)}%</span>
                        </div>
                        <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              moraleStats.avgPanic < 30 ? 'bg-gradient-to-r from-emerald-700 to-emerald-500' :
                              moraleStats.avgPanic < 50 ? 'bg-gradient-to-r from-yellow-700 to-yellow-500' :
                              moraleStats.avgPanic < 70 ? 'bg-gradient-to-r from-orange-700 to-orange-500' :
                              'bg-gradient-to-r from-red-800 to-red-500'
                            }`}
                            style={{ width: `${moraleStats.avgPanic}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Infected Households */}
                  {infectedHouseholds.length > 0 && (
                    <div className="pt-4 border-t border-amber-900/30">
                      <button
                        className="flex items-center justify-between w-full text-left mb-2"
                        onClick={() => setHouseholdsExpanded(!householdsExpanded)}
                      >
                        <span className="text-[13px] uppercase tracking-[0.2em] text-red-400/80 font-medium">
                          Infected Households
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-red-400/60">{infectedHouseholds.length}</span>
                          <ChevronDown
                            size={14}
                            className={`text-red-400/50 transition-transform ${householdsExpanded ? '' : '-rotate-90'}`}
                          />
                        </div>
                      </button>

                      {householdsExpanded && (
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                          {infectedHouseholds.slice(0, 5).map((h) => {
                            const count = h.infectedCount + h.deceasedCount;
                            const personWord = count === 1 ? 'person' : 'people';
                            return (
                              <div
                                key={h.buildingId}
                                onClick={() => onNavigateToHousehold?.(h.buildingPosition)}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-amber-900/20
                                  ${h.status === 'deceased' ? 'opacity-50' : ''}`}
                              >
                                <DirectionBadge direction={h.direction} />
                                <span className="flex-1 text-[13px] text-amber-100/70 truncate">
                                  <span className={`font-mono ${h.status === 'deceased' ? 'text-gray-500' : 'text-red-400/80'}`}>
                                    {count}
                                  </span>
                                  <span className="text-amber-100/50"> {personWord} in home of </span>
                                  <span className="text-amber-200/90">{h.npcName}</span>
                                  <span className="text-amber-100/40"> to the {h.direction}</span>
                                </span>
                              </div>
                            );
                          })}
                          {infectedHouseholds.length > 5 && (
                            <div className="text-sm text-amber-100/40 py-1 px-2">
                              +{infectedHouseholds.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Epidemiology Mode - collapsible */}
                  {params && onChangeParam && (
                    <div className="pt-4 border-t border-amber-900/30">
                      <button
                        className="flex items-center justify-between w-full text-left group"
                        onClick={() => setEpidemiologyExpanded(!epidemiologyExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full transition-colors ${epidemiologyExpanded ? 'bg-amber-400' : 'bg-amber-600/50'}`} />
                          <span className="text-[13px] uppercase tracking-[0.2em] text-amber-500/80 group-hover:text-amber-400 transition-colors font-medium">
                            Epidemiology Mode
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`text-amber-500/60 transition-transform duration-300 ${epidemiologyExpanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                      </button>

                      <div className={`overflow-hidden transition-all duration-300 ease-out ${
                        epidemiologyExpanded ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="bg-gradient-to-b from-amber-950/30 to-black/40 rounded-lg p-3 border border-amber-900/30 space-y-4">
                          {/* Sliders side by side */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-amber-100/80 flex items-center gap-1.5">
                                  <Skull size={14} className="text-red-400/70" />
                                  Virulence
                                </span>
                                <span className="font-mono text-sm text-red-400/80">{Math.round(params.infectionRate * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0" max="1" step="0.01"
                                value={params.infectionRate}
                                onChange={(e) => onChangeParam('infectionRate', parseFloat(e.target.value))}
                                className="w-full h-2.5 bg-slate-600/50 rounded-lg appearance-none cursor-pointer accent-red-500"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-amber-100/80">Sanitation</span>
                                <span className="font-mono text-sm text-sky-300">{Math.round(params.hygieneLevel * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={params.hygieneLevel}
                                onChange={(e) => onChangeParam('hygieneLevel', parseFloat(e.target.value))}
                                className="w-full h-2.5 bg-slate-600/50 rounded-lg appearance-none cursor-pointer accent-sky-500"
                              />
                            </div>
                          </div>

                          {/* Quarantine + Demographics row */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => onChangeParam('quarantine', !params.quarantine)}
                              className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-[11px] tracking-widest uppercase ${
                                params.quarantine
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/20 border border-amber-400/50'
                                  : 'bg-black/40 border border-amber-800/40 text-amber-300/60 hover:bg-amber-900/30 hover:text-amber-200'
                              }`}
                            >
                              <ShieldAlert size={14} />
                              {params.quarantine ? 'Quarantine On' : 'Quarantine'}
                            </button>

                            {setShowDemographicsOverlay && (
                              <button
                                onClick={() => setShowDemographicsOverlay(!showDemographicsOverlay)}
                                className={`py-2.5 px-4 rounded-lg text-[11px] uppercase tracking-widest transition-all ${
                                  showDemographicsOverlay
                                    ? 'bg-amber-700/50 text-amber-200 border border-amber-600/50'
                                    : 'bg-black/40 border border-amber-800/40 text-amber-300/50 hover:text-amber-200'
                                }`}
                              >
                               Demographic Overlay
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'player' && (
                <div className="space-y-4">
                  {/* Player identity card */}
                  <div className="bg-gradient-to-br from-amber-950/40 to-black/30 rounded-lg p-3.5 px-3 border border-amber-800/30">
                    <div className="flex items-start gap-3.5">
                      <div className="flex-shrink-0">
                        <FamilyPortrait
                          name={playerStats.name}
                          gender={playerStats.gender}
                          age={playerStats.age}
                          skinTone={playerStats.skinTone}
                          hairColor={playerStats.hairColor}
                          hairStyle={playerStats.hairStyle}
                          headwearStyle={playerStats.headwearStyle}
                          headwearColor={playerStats.headwearColor}
                          facialHair={playerStats.facialHair}
                          healthState={playerStats.healthState}
                          size={64}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-amber-100 tracking-wide">{playerStats.name}</h3>
                            <p className="text-sm text-amber-300/60 mt-0.5">{playerStats.profession}</p>
                            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-800/40 text-amber-300/70 uppercase tracking-wider border border-amber-700/20">
                              {playerStats.socialClass}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {onShowPlayerModal && (
                              <button
                                onClick={onShowPlayerModal}
                                className="text-[11px] text-amber-200/90 uppercase tracking-wider hover:text-amber-300 transition-colors px-2.5 py-1.5 rounded border border-amber-700/50 hover:border-amber-600/50 bg-black/20"
                              >
                                Details
                              </button>
                            )}
                            {/* Currency display */}
                            <div className="flex items-center gap-2 bg-gradient-to-r from-green-900/50 to-emerald-800/30 px-3 py-2 rounded-lg border border-amber-600/30">
                              <Coins size={16} className="text-green-400" />
                              <span className="text-sm font-semibold text-green-200">{Math.round(playerStats.currency)}</span>
                              <span className="text-[10px] text-green-400/70 uppercase tracking-wider">Dirhams</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-emerald-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart size={14} className="text-emerald-400" />
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400/80">Health</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className={`text-xl font-bold leading-none ${
                          playerStats.health > 60 ? 'text-emerald-400' :
                          playerStats.health > 30 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {Math.round(playerStats.health)}
                        </span>
                        <span className="text-[11px] text-emerald-400/50 mb-0.5">%</span>
                      </div>
                      <div className="mt-2 h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            playerStats.health > 60 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                            playerStats.health > 30 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            'bg-gradient-to-r from-red-700 to-red-500'
                          }`}
                          style={{ width: `${playerStats.health}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-3 border border-sky-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-sky-400" />
                        <span className="text-[11px] uppercase tracking-wider text-sky-400/80">Reputation</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-bold leading-none text-sky-400">{Math.round(playerStats.reputation)}</span>
                        <span className="text-[11px] text-sky-400/50 mb-0.5">%</span>
                      </div>
                      <div className="mt-2 h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-600 to-sky-400"
                          style={{ width: `${playerStats.reputation}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick info */}
                  <div className="flex justify-between text-base px-5 py-0">
                    <div className="text-center">
                      <div className="text-lg text-amber-100/90 font-medium">{playerStats.age}</div>
                      <div className="text-amber-300/70 text-[10px] uppercase tracking-wider">Age</div>
                    </div>
                    <div className="w-px bg-amber-800/30" />
                    <div className="text-center">
                      <div className="text-lg text-amber-100/90 font-medium">{playerStats.gender}</div>
                      <div className="text-amber-300/70 text-[10px] uppercase tracking-wider">Gender</div>
                    </div>
                    <div className="w-px bg-amber-800/30" />
                    <div className="text-center">
                      <div className="text-lg text-amber-100/90 font-medium">{playerStats.familyMembers?.length || 0}</div>
                      <div className="text-amber-300/70 text-[10px] uppercase tracking-wider">Family</div>
                    </div>
                  </div>

                  {/* Household section - only if has family */}
                  {playerStats.familyMembers && playerStats.familyMembers.length > 0 && (
                    <div className="pt-2 border-t border-amber-900/30">
                      <div className="bg-black/20 rounded-lg px-4 py-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2.5">
                            <Users size={18} className="text-amber-500/70" />
                            <span className="text-sm text-amber-100/80">Household</span>
                          </div>
                          {onOpenFamilyDossier && (
                            <button
                              onClick={onOpenFamilyDossier}
                              className="text-[11px] text-amber-300/90  uppercase tracking-wider hover:text-amber-300 transition-colors flex items-center gap-1.5"
                            >
                              View All
                              <ChevronDown size={14} className="-rotate-90" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-amber-100/60 leading-relaxed">
                          {(() => {
                            const alive = playerStats.familyMembers.filter(m => m.alive);
                            if (alive.length === 0) return <span className="text-amber-100/40 italic">No living family members</span>;

                            return (
                              <>
                                <span className="text-amber-100/50">Your household includes: </span>
                                {alive.map((member, index) => {
                                  const isLast = index === alive.length - 1;
                                  const isSecondToLast = index === alive.length - 2;
                                  const relationship = member.relationship === 'spouse'
                                    ? (member.gender === 'Male' ? 'husband' : 'wife')
                                    : member.relationship === 'child'
                                      ? (member.gender === 'Male' ? 'son' : 'daughter')
                                      : member.relationship;
                                  return (
                                    <span key={member.id}>
                                      <button
                                        onClick={() => onSelectFamilyMember?.(member)}
                                        className="text-amber-200/90 hover:text-amber-100 hover:underline transition-colors cursor-pointer"
                                      >
                                        {member.name}
                                      </button>
                                      <span className="text-amber-100/40"> ({relationship}, {member.age})</span>
                                      {!isLast && (isSecondToLast && alive.length > 2 ? ', and ' : isSecondToLast ? ' and ' : ', ')}
                                    </span>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Inventory section */}
                  <div className="pt-3 border-t border-amber-900/30">
                    <div className="bg-black/20 rounded-lg px-4 py-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <Package size={18} className="text-amber-500/70" />
                          <span className="text-sm text-amber-100/80">Inventory</span>
                          <span className="text-xs font-mono text-amber-300/80 bg-amber-900/30 px-2 py-0.5 rounded">
                            {inventoryEntries.length}/{playerStats.maxInventorySlots || 10}
                          </span>
                        </div>
                        {(onOpenInventoryDossier || onShowPlayerModal) && (
                          <button
                            onClick={() => onOpenInventoryDossier ? onOpenInventoryDossier() : onShowPlayerModal?.()}
                            className="text-[11px] text-amber-300/90 uppercase tracking-wider hover:text-amber-300 transition-colors flex items-center gap-1.5"
                          >
                            View All
                            <ChevronDown size={14} className="-rotate-90" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-amber-100/60 leading-relaxed">
                        {inventoryEntries.length > 0 ? (
                          <>
                            <span className="text-amber-100/50">Items in your possession: </span>
                            {inventoryEntries.map((item, index) => {
                              const isLast = index === inventoryEntries.length - 1;
                              const isSecondToLast = index === inventoryEntries.length - 2;
                              return (
                                <span key={item.id}>
                                  <button
                                    onClick={() => onSelectInventoryItem?.(item)}
                                    className="text-amber-200/90 hover:text-amber-100 hover:underline transition-colors cursor-pointer"
                                  >
                                    {item.name}
                                  </button>
                                  {!isLast && (isSecondToLast && inventoryEntries.length > 2 ? ', and ' : isSecondToLast ? ' and ' : ', ')}
                                </span>
                              );
                            })}
                          </>
                        ) : (
                          <span className="text-amber-100/40 italic">No items carried</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="space-y-4">
                  {/* Guide header */}
                  <div className="rounded-lg p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-900/40 border border-amber-600/30 flex items-center justify-center">
                          <span className="text-amber-400/70 text-xl">📜</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-amber-100">Historical Guide</h4>
                          <p className="text-sm text-amber-400/60">Damascus, 1348 CE</p>
                        </div>
                      </div>
                      {onOpenGuideModal && (
                        <button
                          onClick={onOpenGuideModal}
                          className="text-[11px] text-amber-200/80 uppercase tracking-wider hover:text-amber-300 transition-colors px-3 py-2 rounded border border-amber-700/50 hover:border-amber-600/50 bg-black/30 hover:bg-black/40"
                        >
                          View Full Guide
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-amber-100/50 leading-relaxed mt-2">
                      Educational info about medieval medicine, Islamic society, and the Plague.
                    </p>
                  </div>

                  {/* GuideTab content */}
                  <div className="rounded-lg  overflow-hidden">
                    <GuideTab
                      currentBiome={currentBiomeLabel}
                      nearbyNPCs={nearbyNPCs}
                      onOpenEncyclopedia={onOpenGuideModal ?? (() => {})}
                      onSelectEntry={onSelectGuideEntry ?? (() => {})}
                      playerInfected={playerInfected}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPanelMockupC;
