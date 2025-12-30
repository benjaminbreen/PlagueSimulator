import React from 'react';
import { ArrowUpDown, ChevronDown, Package, ShieldAlert, Skull } from 'lucide-react';
import { AgentState, InfectedHouseholdInfo, ItemAppearance, NPCStats, PlayerStats, SimulationParams, SimulationStats } from '../types';
import { MoraleStats } from './Agents';
import { GuideTab } from './HistoricalGuide';

interface InventoryEntry {
  id: string;
  itemId: string;
  quantity: number;
  acquiredAt: number;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
  category: string;
  effects?: Array<{ type: string; value: number }>;
  appearance?: ItemAppearance;
}

interface ReportsPanelProps {
  reportTab: 'epidemic' | 'player' | 'guide';
  setReportTab: (tab: 'epidemic' | 'player' | 'guide') => void;
  tabPulse: 'epidemic' | 'player' | 'guide' | null;
  setTabPulse: (tab: 'epidemic' | 'player' | 'guide' | null) => void;
  reportsPanelCollapsed: boolean;
  setReportsPanelCollapsed: (collapsed: boolean) => void;
  stats: SimulationStats;
  infectedHouseholds: InfectedHouseholdInfo[];
  onNavigateToHousehold?: (buildingPosition: [number, number, number]) => void;
  moraleStats: MoraleStats;
  alchemistTableCollapsed: boolean;
  setAlchemistTableCollapsed: (collapsed: boolean) => void;
  params: SimulationParams;
  onChangeParam: (key: keyof SimulationParams, value: any) => void;
  showDemographicsOverlay: boolean;
  setShowDemographicsOverlay: (value: boolean) => void;
  playerStats: PlayerStats;
  onShowPlayerModal: () => void;
  inventoryEntries: InventoryEntry[];
  onDropItem?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }) => void;
  inventorySortBy: 'name' | 'rarity' | 'quantity';
  setInventorySortBy: (value: 'name' | 'rarity' | 'quantity') => void;
  getRarityMeta: (rarity: 'common' | 'uncommon' | 'rare') => { label: string; color: string };
  formatHeight: (scale: number) => string;
  formatWeight: (scale: number) => string;
  currentBiomeLabel: string;
  nearbyNPCs?: NPCStats[];
  onOpenGuideModal?: () => void;
  onSelectGuideEntry?: (entryId: string) => void;
  playerInfected: boolean;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  reportTab,
  setReportTab,
  tabPulse,
  setTabPulse,
  reportsPanelCollapsed,
  setReportsPanelCollapsed,
  stats,
  infectedHouseholds,
  onNavigateToHousehold,
  moraleStats,
  alchemistTableCollapsed,
  setAlchemistTableCollapsed,
  params,
  onChangeParam,
  showDemographicsOverlay,
  setShowDemographicsOverlay,
  playerStats,
  onShowPlayerModal,
  inventoryEntries,
  onDropItem,
  inventorySortBy,
  setInventorySortBy,
  getRarityMeta,
  formatHeight,
  formatWeight,
  currentBiomeLabel,
  nearbyNPCs = [],
  onOpenGuideModal,
  onSelectGuideEntry,
  playerInfected
}) => {
  return (
    <div className="self-end md:self-start mt-12 md:mt-0 w-full md:w-[420px]">
      <div className="bg-black/80 backdrop-blur-md p-4 rounded-lg border border-amber-800/50 shadow-lg pointer-events-auto">
        <div
          className={`flex items-center justify-between ${reportsPanelCollapsed ? '' : 'mb-3 border-b border-amber-900/40 pb-2'} cursor-pointer select-none group`}
          onClick={() => setReportsPanelCollapsed(!reportsPanelCollapsed)}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={14}
              className={`text-amber-500/60 transition-transform duration-300 ${reportsPanelCollapsed ? '-rotate-90' : ''}`}
            />
            <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold group-hover:text-amber-500/80 transition-colors">Reports Panel</h4>
          </div>
          <div className="flex gap-1 bg-amber-950/40 p-1 rounded-full border border-amber-900/40" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setReportTab('epidemic');
                setTabPulse('epidemic');
              }}
              className={`relative px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all overflow-hidden ${
                reportTab === 'epidemic' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
              }`}
            >
              <span className={`absolute inset-0 rounded-full bg-amber-300/30 blur-[2px] transition-all duration-300 ${tabPulse === 'epidemic' ? 'opacity-100 scale-110' : 'opacity-0 scale-95'}`} />
              Epidemic
            </button>
            <button
              onClick={() => {
                setReportTab('player');
                setTabPulse('player');
              }}
              className={`relative px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all overflow-hidden ${
                reportTab === 'player' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
              }`}
            >
              <span className={`absolute inset-0 rounded-full bg-amber-300/30 blur-[2px] transition-all duration-300 ${tabPulse === 'player' ? 'opacity-100 scale-110' : 'opacity-0 scale-95'}`} />
              Player
            </button>
            <button
              onClick={() => {
                setReportTab('guide');
                setTabPulse('guide');
              }}
              className={`relative px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all overflow-hidden ${
                reportTab === 'guide' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
              }`}
            >
              <span className={`absolute inset-0 rounded-full bg-amber-300/30 blur-[2px] transition-all duration-300 ${tabPulse === 'guide' ? 'opacity-100 scale-110' : 'opacity-0 scale-95'}`} />
              Guide
            </button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-out ${reportsPanelCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
          {reportTab === 'epidemic' ? (
            <div className="space-y-4">
              <div>
                <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-3 font-bold">Epidemic Report</h5>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <span className="font-mono text-lg">{stats.healthy}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Healthy</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <span className="font-mono text-lg">{stats.incubating}</span>
                    <span className="text-[10px] uppercase tracking-wider text-yellow-300/70">Incubating</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                    <span className="font-mono text-lg">{stats.infected}</span>
                    <span className="text-[10px] uppercase tracking-wider text-red-400/70">Infected</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                    <span className="font-mono text-lg">{stats.deceased}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600">Deceased</span>
                  </div>
                </div>

                {infectedHouseholds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-900/30">
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60 mb-2">Infected Households</div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {infectedHouseholds.map((household) => (
                        <div
                          key={household.buildingId}
                          onClick={() => onNavigateToHousehold?.(household.buildingPosition)}
                          className={`text-[10px] leading-relaxed cursor-pointer hover:bg-amber-900/20 px-2 py-1 rounded transition-colors ${
                            household.status === 'deceased' ? 'text-gray-400 hover:text-gray-300' : 'text-red-400/90 hover:text-red-300'
                          }`}
                        >
                          <span className="font-mono">
                            {household.infectedCount + household.deceasedCount}
                          </span>
                          {' '}person{household.infectedCount + household.deceasedCount > 1 ? 's' : ''} in the home of{' '}
                          <span className="text-amber-200/90">{household.npcName}</span>
                          {' '}to the{' '}
                          <span className="text-amber-300/80">{household.direction}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Civic Morale</span>
                  <span className={`text-[9px] uppercase tracking-widest font-bold ${
                    moraleStats.avgPanic < 16 ? 'text-emerald-400' :
                    moraleStats.avgPanic < 36 ? 'text-yellow-400' :
                    moraleStats.avgPanic < 56 ? 'text-orange-400' :
                    moraleStats.avgPanic < 76 ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {moraleStats.avgPanic < 16 ? 'Calm' :
                     moraleStats.avgPanic < 36 ? 'Uneasy' :
                     moraleStats.avgPanic < 56 ? 'Anxious' :
                     moraleStats.avgPanic < 76 ? 'Fearful' : 'Panicked'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                      <span className="font-bold">Plague Awareness</span>
                      <span className="font-mono">{Math.round(moraleStats.avgAwareness)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-600 to-amber-400"
                        style={{ width: `${Math.min(100, moraleStats.avgAwareness)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                      <span className="font-bold">Public Panic</span>
                      <span className="font-mono">{Math.round(moraleStats.avgPanic)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          moraleStats.avgPanic < 36 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                          moraleStats.avgPanic < 56 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                          moraleStats.avgPanic < 76 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                          'bg-gradient-to-r from-red-700 to-red-500'
                        }`}
                        style={{ width: `${Math.min(100, moraleStats.avgPanic)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[9px] text-amber-100/40 italic mt-2">
                    {moraleStats.avgPanic < 16 ? '"The streets feel peaceful today."' :
                     moraleStats.avgPanic < 36 ? '"Whispers of sickness in the souq..."' :
                     moraleStats.avgPanic < 56 ? '"People hurry past, avoiding eye contact."' :
                     moraleStats.avgPanic < 76 ? '"Fear spreads faster than the plague itself."' :
                     '"The city trembles on the edge of chaos."'}
                  </div>
                </div>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                <div
                  className="flex items-center justify-between cursor-pointer select-none group"
                  onClick={() => setAlchemistTableCollapsed(!alchemistTableCollapsed)}
                >
                  <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Alchemist's Table</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-amber-100/30 italic group-hover:text-amber-100/50 transition-colors">
                      {alchemistTableCollapsed ? 'Click to expand' : 'Click to collapse'}
                    </span>
                    <ChevronDown
                      size={12}
                      className={`text-amber-500/50 transition-transform duration-300 ${alchemistTableCollapsed ? '-rotate-90' : ''}`}
                    />
                  </div>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-out ${alchemistTableCollapsed ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100 mt-3 pt-3 border-t border-white/10'}`}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold"><Skull size={10} /> Contact Virulence</span>
                        <span className="font-mono">{Math.round(params.infectionRate * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={params.infectionRate}
                        onChange={(e) => onChangeParam('infectionRate', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold">Sanitation Protocol</span>
                        <span className="font-mono">{Math.round(params.hygieneLevel * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={params.hygieneLevel}
                        onChange={(e) => onChangeParam('hygieneLevel', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onChangeParam('quarantine', !params.quarantine); }}
                        className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-[10px] tracking-widest uppercase border ${
                          params.quarantine
                            ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <ShieldAlert size={14} />
                        {params.quarantine ? 'QUARANTINE ENFORCED' : 'Enable Quarantine'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <label className="flex items-center justify-between text-[10px] uppercase tracking-widest text-amber-200/70">
                        <span>Demographics Overlay</span>
                        <input
                          type="checkbox"
                          checked={showDemographicsOverlay}
                          onChange={(e) => setShowDemographicsOverlay(e.target.checked)}
                          className="accent-amber-600"
                        />
                      </label>
                      <div className="text-[9px] text-amber-100/40 mt-1 italic">
                        Floating tags follow nearby NPCs.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : reportTab === 'player' ? (
            <div className="space-y-3 text-[12px] text-amber-50/90">
              <div className="flex items-center justify-between">
                <div className="historical-font text-amber-400 text-sm uppercase tracking-widest">Player Report</div>
                <button
                  onClick={onShowPlayerModal}
                  className="text-[10px] text-amber-100/40 uppercase tracking-[0.2em] hover:text-amber-100/70 transition-colors"
                >
                  More Info
                </button>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-amber-500/70">Wealth</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-900/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-200/90">
                    {Math.max(0, Math.round(playerStats.currency))} Dirhams
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                      <span className="font-bold">Health</span>
                      <span className="font-mono">{Math.round(playerStats.health)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-600 to-emerald-400"
                        style={{ width: `${Math.min(100, Math.max(0, playerStats.health))}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                      <span className="font-bold">Reputation</span>
                      <span className="font-mono">{Math.round(playerStats.reputation)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-600 to-sky-400"
                        style={{ width: `${Math.min(100, Math.max(0, playerStats.reputation))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Name</div>
                  <div className="font-bold">{playerStats.name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Profession</div>
                  <div className="font-bold">{playerStats.profession}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Class</div>
                  <div className="font-bold">{playerStats.socialClass}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Age</div>
                  <div className="font-bold">{playerStats.age} Years</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Gender</div>
                  <div className="font-bold">{playerStats.gender}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Health</div>
                  <div className="font-bold text-emerald-300">{playerStats.healthStatus}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Height</div>
                  <div className="font-bold">{formatHeight(playerStats.height)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Weight</div>
                  <div className="font-bold">{formatWeight(playerStats.weight)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Robe</div>
                  <div className="font-bold">{playerStats.robeDescription}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/60">Headwear</div>
                  <div className="font-bold">{playerStats.headwearDescription}</div>
                </div>
              </div>
              <div className="border-t border-amber-900/40 pt-3 text-[11px] text-amber-100/70">
                <span className="uppercase tracking-widest text-amber-500/60">Family</span>
                <div className="mt-1">{playerStats.family}</div>
              </div>
              <div className="border-t border-amber-900/40 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/70">
                    <Package size={12} className="text-amber-500/70" />
                    Inventory
                    <span className="text-amber-100/40">{playerStats.inventory.length}/{playerStats.maxInventorySlots}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-amber-100/50">
                    <ArrowUpDown size={12} className="text-amber-500/60" />
                    <button
                      onClick={() => setInventorySortBy('name')}
                      className={inventorySortBy === 'name' ? 'text-amber-200' : 'hover:text-amber-200'}
                    >
                      Name
                    </button>
                    <span className="text-amber-500/40">·</span>
                    <button
                      onClick={() => setInventorySortBy('rarity')}
                      className={inventorySortBy === 'rarity' ? 'text-amber-200' : 'hover:text-amber-200'}
                    >
                      Rarity
                    </button>
                    <span className="text-amber-500/40">·</span>
                    <button
                      onClick={() => setInventorySortBy('quantity')}
                      className={inventorySortBy === 'quantity' ? 'text-amber-200' : 'hover:text-amber-200'}
                    >
                      Qty
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-auto pr-1 space-y-2 text-[11px]">
                  {inventoryEntries.length === 0 ? (
                    <div className="text-amber-100/50 italic">No items carried.</div>
                  ) : (
                    inventoryEntries.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-amber-100">{item.name}</div>
                            {onDropItem && (
                              <button
                                onClick={() => onDropItem({ inventoryId: item.id, itemId: item.itemId, label: item.name, appearance: item.appearance })}
                                className="text-[9px] uppercase tracking-widest text-amber-300/70 hover:text-amber-200"
                              >
                                Drop
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-amber-100/50">{item.description}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[9px] uppercase tracking-widest ${getRarityMeta(item.rarity).color}`}>
                            {getRarityMeta(item.rarity).label}
                          </div>
                          <div className="text-[11px] font-mono text-amber-200/80">x{item.quantity}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <GuideTab
                currentBiome={currentBiomeLabel}
                nearbyNPCs={nearbyNPCs}
                onOpenEncyclopedia={onOpenGuideModal ?? (() => {})}
                onSelectEntry={onSelectGuideEntry ?? (() => {})}
                playerInfected={playerInfected}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
