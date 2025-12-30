import React from 'react';
import { X } from 'lucide-react';
import { AgentState, PlayerStats, ItemAppearance } from '../types';

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

interface PlayerDossierModalProps {
  open: boolean;
  playerStats: PlayerStats;
  dossierTab: 'overview' | 'health' | 'inventory';
  onChangeTab: (tab: 'overview' | 'health' | 'inventory') => void;
  inventoryView: 'list' | 'grid';
  onChangeInventoryView: (view: 'list' | 'grid') => void;
  inventoryEntries: InventoryEntry[];
  onSelectInventoryItem: (entry: InventoryEntry) => void;
  onDropItem?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }) => void;
  buildApparelEntry: (type: 'robe' | 'headwear') => InventoryEntry;
  onClose: () => void;
  getHealthStatusLabel: (plague: PlayerStats['plague']) => string;
  getPlagueTypeLabel: (plagueType: PlayerStats['plague']['plagueType']) => string;
}

export const PlayerDossierModal: React.FC<PlayerDossierModalProps> = ({
  open,
  playerStats,
  dossierTab,
  onChangeTab,
  inventoryView,
  onChangeInventoryView,
  inventoryEntries,
  onSelectInventoryItem,
  onDropItem,
  buildApparelEntry,
  onClose,
  getHealthStatusLabel,
  getPlagueTypeLabel
}) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-start p-6 md:p-10 pointer-events-auto">
      <div
        className="absolute inset-0 backdrop-blur-md -z-10"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)',
          maskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)'
        }}
      />
      <div className="absolute inset-0 bg-black/60 -z-20" />
      <div className="w-full max-w-4xl h-[88vh] bg-slate-950/70 border border-amber-900/40 rounded-2xl shadow-2xl p-6 md:p-10 animate-in slide-in-from-left-8 fade-in overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-900/30 pb-4">
          <div>
            <h3 className="historical-font text-amber-400 text-2xl tracking-widest">Player Dossier</h3>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/40 mt-1">Civic & Medical Record</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/50 border border-amber-600/40 p-1.5 text-[10px] uppercase tracking-[0.35em] shadow-[0_0_18px_rgba(245,158,11,0.2)]">
              {(['overview', 'health', 'inventory'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onChangeTab(tab)}
                  className={`px-4 py-1.5 rounded-full transition-all font-semibold ${
                    dossierTab === tab
                      ? 'bg-amber-500/90 text-black shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                      : 'text-amber-200/60 hover:text-amber-200 hover:bg-amber-900/25'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-amber-400 hover:text-amber-300">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="mt-6 h-[calc(85vh-140px)] overflow-y-auto pr-2">
          {dossierTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-amber-50/85 text-[12px]">
              <div className="lg:col-span-2 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Identity</div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span>Name</span><span className="font-bold">{playerStats.name}</span></div>
                      <div className="flex justify-between"><span>Age</span><span>{playerStats.age}</span></div>
                      <div className="flex justify-between"><span>Profession</span><span>{playerStats.profession}</span></div>
                      <div className="flex justify-between"><span>Social Class</span><span>{playerStats.socialClass}</span></div>
                      <div className="flex justify-between"><span>Family</span><span>{playerStats.family}</span></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Appearance</div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Skin</span>
                        <div>{playerStats.skinDescription}</div>
                      </div>
                      <div>
                        <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Hair</span>
                        <div>{playerStats.hairDescription}</div>
                      </div>
                      <button
                        onClick={() => onSelectInventoryItem(buildApparelEntry('robe'))}
                        className="text-left group"
                      >
                        <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Robe</span>
                        <div className="text-amber-100 group-hover:text-amber-200 transition-colors">
                          {playerStats.robeDescription}
                        </div>
                      </button>
                      <button
                        onClick={() => onSelectInventoryItem(buildApparelEntry('headwear'))}
                        className="text-left group"
                      >
                        <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Headwear</span>
                        <div className="text-amber-100 group-hover:text-amber-200 transition-colors">
                          {playerStats.headwearDescription}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Attributes</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Strength: <span className="font-bold">{playerStats.strength}</span></div>
                      <div>Piety: <span className="font-bold">{playerStats.piety}</span></div>
                      <div>Perceptiveness: <span className="font-bold">{playerStats.perceptiveness}</span></div>
                      <div>Neuroticism: <span className="font-bold">{playerStats.neuroticism}</span></div>
                      <div>Charisma: <span className="font-bold">{playerStats.charisma}</span></div>
                      <div>Humoral Balance: <span className="font-bold">{playerStats.humoralBalance}</span></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Four Humors</div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span>Blood</span><span className="font-bold">{playerStats.humors.blood}</span></div>
                      <div className="flex justify-between"><span>Phlegm</span><span className="font-bold">{playerStats.humors.phlegm}</span></div>
                      <div className="flex justify-between"><span>Yellow Bile</span><span className="font-bold">{playerStats.humors.yellowBile}</span></div>
                      <div className="flex justify-between"><span>Black Bile</span><span className="font-bold">{playerStats.humors.blackBile}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-transparent to-amber-500/10 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Current Health</div>
                  <div className="text-lg font-semibold text-amber-100">{getHealthStatusLabel(playerStats.plague)}</div>
                  <div className="mt-2 text-[11px] text-amber-200/60">
                    {playerStats.healthHistory}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Wardrobe</div>
                  <div className="text-[11px] text-amber-100/80">{playerStats.clothing.join(', ')}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Accessories</div>
                  <div className="text-[11px] text-amber-100/80">{playerStats.accessories.length ? playerStats.accessories.join(', ') : 'None noted'}</div>
                </div>
              </div>
            </div>
          )}

          {dossierTab === 'health' && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 text-amber-50/85 text-[12px]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-5">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-4">Vital Map</div>
                  <div
                    className="relative mx-auto h-[420px] w-[220px] rounded-[28px] border border-white/5"
                    style={{
                      backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.05), transparent 40%), radial-gradient(circle at 40% 30%, rgba(245,158,11,0.12), transparent 60%)',
                    }}
                  >
                    <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.08),transparent_55%)]" />
                    <div className={`absolute left-[86px] top-[6px] h-12 w-12 rounded-full border border-amber-400/40 bg-amber-400/10 ${playerStats.plague.delirium > 0 ? 'shadow-[0_0_22px_rgba(124,58,237,0.5)] border-purple-400/70' : ''}`} />
                    <div className={`absolute left-[60px] top-[52px] h-5 w-5 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'ears') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[60px] top-[52px] h-5 w-5 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'ears') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[98px] top-[52px] h-10 w-8 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'neck' ? 'shadow-[0_0_22px_rgba(168,85,247,0.55)] border-purple-400/70' : ''}`} />
                    <div className={`absolute left-[80px] top-[60px] h-6 w-6 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'eyes') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[116px] top-[60px] h-6 w-6 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'eyes') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[95px] top-[80px] h-5 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'mouth') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[100px] top-[92px] h-4 w-8 rounded-full border border-amber-400/20 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'throat') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[78px] top-[96px] h-[136px] w-20 rounded-[22px] border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.coughingBlood > 0 ? 'shadow-[0_0_22px_rgba(239,68,68,0.55)] border-red-400/70' : ''}`} />
                    <div className={`absolute left-[70px] top-[110px] h-12 w-16 rounded-[18px] border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.weakness > 0 ? 'shadow-[0_0_18px_rgba(245,158,11,0.45)]' : ''}`} />
                    <div className={`absolute left-[78px] top-[120px] h-10 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/10 ${playerStats.plague.coughingBlood > 0 || playerStats.baselineAilments.some(a => a.zone === 'lungs') ? 'shadow-[0_0_18px_rgba(239,68,68,0.45)] border-red-400/70' : ''}`} />
                    <div className={`absolute right-[78px] top-[120px] h-10 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/10 ${playerStats.plague.coughingBlood > 0 || playerStats.baselineAilments.some(a => a.zone === 'lungs') ? 'shadow-[0_0_18px_rgba(239,68,68,0.45)] border-red-400/70' : ''}`} />
                    <div className={`absolute left-[26px] top-[112px] h-24 w-12 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'armpit' ? 'shadow-[0_0_22px_rgba(168,85,247,0.55)] border-purple-400/70' : ''}`} />
                    <div className={`absolute right-[26px] top-[112px] h-24 w-12 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'armpit' ? 'shadow-[0_0_22px_rgba(168,85,247,0.55)] border-purple-400/70' : ''}`} />
                    <div className={`absolute left-[18px] top-[150px] h-16 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'upper arms') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[18px] top-[150px] h-16 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'upper arms') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[18px] top-[200px] h-16 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'lower arms') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[18px] top-[200px] h-16 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'lower arms') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[14px] top-[255px] h-10 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'hands') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[14px] top-[255px] h-10 w-10 rounded-full border border-amber-400/30 bg-amber-500/10 ${playerStats.baselineAilments.some(a => a.zone === 'hands') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[64px] top-[180px] h-[72px] w-24 rounded-[20px] border border-amber-400/30 bg-amber-500/10 ${playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'groin' ? 'shadow-[0_0_22px_rgba(168,85,247,0.55)] border-purple-400/70' : ''}`} />
                    <div className={`absolute left-[68px] top-[210px] h-[104px] w-[72px] rounded-[18px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'abdomen') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[70px] top-[130px] h-16 w-16 rounded-[20px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'chest') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[78px] top-[285px] h-16 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'thighs') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[78px] top-[285px] h-16 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'thighs') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[78px] top-[335px] h-16 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'calves') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute right-[78px] top-[335px] h-16 w-12 rounded-[18px] border border-amber-400/20 bg-amber-500/5 ${playerStats.baselineAilments.some(a => a.zone === 'calves') ? 'shadow-[0_0_16px_rgba(59,130,246,0.6)] border-sky-400/70' : ''}`} />
                    <div className={`absolute left-[78px] top-[385px] h-10 w-12 rounded-[16px] border border-amber-400/20 bg-amber-500/5 ${playerStats.plague.gangrene > 0 ? 'shadow-[0_0_22px_rgba(15,23,42,0.7)] border-slate-400/70' : ''}`} />
                    <div className={`absolute right-[78px] top-[385px] h-10 w-12 rounded-[16px] border border-amber-400/20 bg-amber-500/5 ${playerStats.plague.gangrene > 0 ? 'shadow-[0_0_22px_rgba(15,23,42,0.7)] border-slate-400/70' : ''}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1">Status</div>
                      <div className="text-lg font-semibold text-amber-100">
                        {playerStats.plague.state === AgentState.INFECTED
                          ? `${getPlagueTypeLabel(playerStats.plague.plagueType)} plague`
                          : playerStats.plague.state === AgentState.INCUBATING
                            ? 'Incubating plague'
                            : getHealthStatusLabel(playerStats.plague)
                        }
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-amber-300/70">
                      <div>Day {playerStats.plague.daysInfected}</div>
                      <div>Survival {playerStats.plague.survivalChance}%</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all"
                      style={{ width: `${playerStats.plague.state === AgentState.HEALTHY ? 100 : Math.max(30, playerStats.plague.overallSeverity)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-3">Symptoms</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const symptomEntries = [
                        ...(playerStats.plague.fever > 0 ? [{ label: 'Fever', zone: 'systemic', systemic: true }] : []),
                        ...(playerStats.plague.weakness > 0 ? [{ label: 'Weakness', zone: 'systemic', systemic: true }] : []),
                        ...(playerStats.plague.buboes > 0 ? [{ label: 'Buboes', zone: playerStats.plague.buboLocation }] : []),
                        ...(playerStats.plague.coughingBlood > 0 ? [{ label: 'Coughing blood', zone: 'lungs' }] : []),
                        ...(playerStats.plague.skinBleeding > 0 ? [{ label: 'Skin bleeding', zone: 'systemic', systemic: true }] : []),
                        ...(playerStats.plague.delirium > 0 ? [{ label: 'Delirium', zone: 'head' }] : []),
                        ...(playerStats.plague.gangrene > 0 ? [{ label: 'Gangrene', zone: 'feet' }] : []),
                        ...playerStats.baselineAilments.map((ailment) => ({
                          label: ailment.label,
                          zone: ailment.zone,
                          systemic: ailment.systemic
                        }))
                      ];

                      if (symptomEntries.length === 0) {
                        return <span className="text-emerald-300/80 text-sm">No reported symptoms.</span>;
                      }

                      return symptomEntries.map((entry, index) => (
                        <span key={`${entry.label}-${index}`} className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200/80">
                          {entry.label}
                          <span className="ml-2 text-[10px] uppercase tracking-widest text-amber-200/50">
                            {entry.systemic ? 'systemic' : entry.zone}
                          </span>
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-3">Baseline Ailments</div>
                  {playerStats.baselineAilments.length === 0 ? (
                    <div className="text-emerald-300/80 text-sm">No chronic ailments noted.</div>
                  ) : (
                    <div className="space-y-2 text-[11px] text-amber-200/80">
                      {playerStats.baselineAilments.map((ailment) => (
                        <div key={ailment.id} className="flex items-center justify-between">
                          <span>{ailment.label}</span>
                          <span className="text-[10px] uppercase tracking-widest text-amber-200/50">
                            {ailment.systemic ? 'systemic' : ailment.zone}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-3">Symptom Intensity</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    {[
                      { label: 'Fever', value: playerStats.plague.fever, tone: 'from-orange-500 to-red-500' },
                      { label: 'Weakness', value: playerStats.plague.weakness, tone: 'from-amber-500 to-orange-400' },
                      { label: 'Buboes', value: playerStats.plague.buboes, tone: 'from-purple-500 to-fuchsia-400' },
                      { label: 'Coughing Blood', value: playerStats.plague.coughingBlood, tone: 'from-red-500 to-rose-400' },
                      { label: 'Skin Bleeding', value: playerStats.plague.skinBleeding, tone: 'from-red-600 to-red-400' },
                      { label: 'Delirium', value: playerStats.plague.delirium, tone: 'from-purple-500 to-indigo-400' },
                      { label: 'Gangrene', value: playerStats.plague.gangrene, tone: 'from-slate-500 to-gray-400' }
                    ].filter((entry) => entry.value > 0).map((entry) => (
                      <div key={entry.label} className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <div className="flex justify-between mb-2">
                          <span className="text-amber-200/70">{entry.label}</span>
                          <span className="text-amber-300">{Math.round(entry.value)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${entry.tone}`} style={{ width: `${entry.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {dossierTab === 'inventory' && (
            <div className="space-y-5 text-amber-50/85 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1">Inventory</div>
                  <div className="text-amber-200/80 text-sm">Items carried: {playerStats.inventory.length} / {playerStats.maxInventorySlots}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeInventoryView('list')}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border ${
                      inventoryView === 'list' ? 'bg-amber-600/80 text-black border-amber-400/70' : 'border-white/10 text-amber-200/60 hover:text-amber-200'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => onChangeInventoryView('grid')}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border ${
                      inventoryView === 'grid' ? 'bg-amber-600/80 text-black border-amber-400/70' : 'border-white/10 text-amber-200/60 hover:text-amber-200'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              {inventoryView === 'list' ? (
                <div className="space-y-3">
                  {inventoryEntries.map((entry) => {
                    const name = entry.name.toLowerCase();
                    const icon = name.includes('dagger') || name.includes('sword') ? '🗡️'
                      : name.includes('bread') || name.includes('fig') || name.includes('olive') || name.includes('apricot') ? '🥖'
                      : name.includes('satchel') || name.includes('bag') ? '🧺'
                      : name.includes('water') || name.includes('waterskin') ? '🪣'
                      : name.includes('herb') || name.includes('spice') ? '🧪'
                      : '📦';
                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectInventoryItem(entry)}
                        className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-black/40 border border-amber-500/40 flex items-center justify-center text-lg">
                            {icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-amber-100">{entry.name}</div>
                              <div className="text-[10px] text-amber-200/50">x{entry.quantity}</div>
                            </div>
                            <div className="text-[10px] text-amber-200/50 mt-1">{entry.description}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                              {entry.rarity}
                            </span>
                            {onDropItem && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDropItem({ inventoryId: entry.id, itemId: entry.itemId, label: entry.name, appearance: entry.appearance });
                                }}
                                className="text-[9px] uppercase tracking-widest text-amber-300/70 hover:text-amber-200"
                              >
                                Drop
                              </button>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {inventoryEntries.map((entry) => {
                    const name = entry.name.toLowerCase();
                    const icon = name.includes('dagger') || name.includes('sword') ? '🗡️'
                      : name.includes('bread') || name.includes('fig') || name.includes('olive') || name.includes('apricot') ? '🥖'
                      : name.includes('satchel') || name.includes('bag') ? '🧺'
                      : name.includes('water') || name.includes('waterskin') ? '🪣'
                      : name.includes('herb') || name.includes('spice') ? '🧪'
                      : '📦';
                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectInventoryItem(entry)}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-10 rounded-full bg-black/40 border border-amber-500/40 flex items-center justify-center text-lg">
                            {icon}
                          </div>
                          <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                            {entry.rarity}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-amber-100">{entry.name}</div>
                        <div className="text-[10px] text-amber-200/50 mt-1">{entry.description}</div>
                        <div className="mt-3 flex items-center justify-between text-[10px] text-amber-200/70">
                          <span>Qty: {entry.quantity}</span>
                          {onDropItem && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                onDropItem({ inventoryId: entry.id, itemId: entry.itemId, label: entry.name, appearance: entry.appearance });
                              }}
                              className="uppercase tracking-widest text-amber-300/70 hover:text-amber-200"
                            >
                              Drop
                            </button>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
