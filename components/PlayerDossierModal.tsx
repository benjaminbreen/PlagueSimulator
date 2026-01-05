import React, { useState } from 'react';
import { X, Pill, Users, Home, ChevronRight, Navigation } from 'lucide-react';
import { AgentState, PlayerStats, ItemAppearance, PlayerItem, FamilyMember } from '../types';
import { ItemIcon } from './items/ItemIcon';
import { isConsumableItem, getItemEffectDescription } from '../utils/plague';
import { getRelationshipLabel } from '../utils/family';
import { FamilyMemberModal } from './FamilyMemberModal';
import { FamilyPortrait } from './FamilyPortrait';

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
  dossierTab: 'overview' | 'health' | 'inventory' | 'family';
  onChangeTab: (tab: 'overview' | 'health' | 'inventory' | 'family') => void;
  inventoryView: 'list' | 'grid';
  onChangeInventoryView: (view: 'list' | 'grid') => void;
  inventoryEntries: InventoryEntry[];
  onSelectInventoryItem: (entry: InventoryEntry) => void;
  onDropItem?: (item: { inventoryId: string; itemId: string; label: string; appearance?: ItemAppearance }) => void;
  onConsumeItem?: (playerItem: PlayerItem) => void;
  buildApparelEntry: (type: 'robe' | 'headwear') => InventoryEntry;
  onClose: () => void;
  getHealthStatusLabel: (plague: PlayerStats['plague']) => string;
  getPlagueTypeLabel: (plagueType: PlayerStats['plague']['plagueType']) => string;
  /** Home building info for display */
  homeBuildingType?: string;
  /** District name where home is located */
  homeDistrictName?: string;
  /** Whether player is currently on their home tile */
  isOnHomeTile?: boolean;
  /** Navigate to home tile */
  onGoHome?: () => void;
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
  onConsumeItem,
  buildApparelEntry,
  onClose,
  getHealthStatusLabel,
  getPlagueTypeLabel,
  homeBuildingType,
  homeDistrictName,
  isOnHomeTile,
  onGoHome
}) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);

  if (!open) return null;

  // Helper to check if a zone is affected by any ailment or symptom
  const isZoneAffected = (zone: string): boolean => {
    if (playerStats.baselineAilments.some(a => a.zone === zone)) return true;
    if (zone === 'head' && playerStats.plague.delirium > 0) return true;
    if (zone === 'neck' && playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'neck') return true;
    if (zone === 'lungs' && playerStats.plague.coughingBlood > 0) return true;
    if (zone === 'armpit' && playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'armpit') return true;
    if (zone === 'groin' && playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'groin') return true;
    if ((zone === 'feet' || zone === 'legs') && playerStats.plague.gangrene > 0) return true;
    return false;
  };

  // Get zone highlight style based on hover and affected state
  const getZoneStyle = (zone: string, defaultFill: string, defaultStroke: string) => {
    const isHovered = hoveredZone === zone ||
      (hoveredZone === 'systemic' && ['torso', 'head', 'arms', 'legs'].includes(zone)) ||
      (hoveredZone === 'ears' && zone === 'ears') ||
      (hoveredZone === 'hearing' && zone === 'ears');
    const isAffected = isZoneAffected(zone);

    if (isHovered) {
      return {
        fill: 'rgba(250,204,21,0.4)',
        stroke: 'rgba(250,204,21,0.9)',
        filter: 'url(#glow-yellow)'
      };
    }
    if (isAffected) {
      return {
        fill: 'rgba(59,130,246,0.25)',
        stroke: 'rgba(59,130,246,0.6)',
        filter: ''
      };
    }
    return { fill: defaultFill, stroke: defaultStroke, filter: '' };
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-start p-5 md:p-10 pointer-events-auto">
      <div
        className="absolute inset-0 backdrop-blur-md -z-10"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)',
          maskImage: 'radial-gradient(ellipse 35% 50% at 75% 50%, transparent 20%, black 65%)'
        }}
      />
      <div className="absolute inset-0 bg-black/60 -z-20" />
      <div className="w-full max-w-3xl max-h-[92vh] md:max-h-[79vh] bg-slate-950/70 border border-amber-900/40 rounded-2xl shadow-2xl p-4 md:p-6 animate-in slide-in-from-left-8 fade-in overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-900/30 pb-4">
          <div>
            <h3 className="historical-font text-amber-300 text-2xl tracking-wide">Player Dossier</h3>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/40 mt-1">Civic & Medical Record</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/50 border border-amber-600/40 p-1.5 text-[10px] uppercase tracking-[0.35em] shadow-[0_0_18px_rgba(245,158,11,0.2)]">
              {(['overview', 'health', 'inventory', 'family'] as const).map((tab) => (
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
            <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 transition-colors -mr-2">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="mt-4 md:mt-6 flex-1 overflow-y-auto pr-2 min-h-0">
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
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 md:gap-6 text-amber-50/85 text-[12px]">
              <div className="space-y-4 md:space-y-6">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-3 md:p-5">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2 md:mb-4">Vital Map</div>
                  {/* SVG Human Figure Vital Map */}
                  <div className="flex justify-center">
                    <div className="origin-top scale-[0.65] md:scale-100 h-[273px] md:h-[420px]">
                      <svg viewBox="0 0 120 220" className="w-[180px] h-[420px]" style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.15))' }}>
                        <defs>
                          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(245,158,11,0.15)" />
                            <stop offset="100%" stopColor="rgba(245,158,11,0.05)" />
                          </linearGradient>
                          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                          <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                        </defs>

                        {/* Base body silhouette */}
                        <g strokeWidth="0.5">
                          {/* Head */}
                          {(() => {
                            const headStyle = hoveredZone === 'head' || hoveredZone === 'delirium'
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : playerStats.plague.delirium > 0
                                ? { fill: 'rgba(168,85,247,0.3)', stroke: 'rgba(168,85,247,0.7)', filter: 'url(#glow-purple)' }
                                : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <ellipse cx="60" cy="18" rx="14" ry="16" {...headStyle} />;
                          })()}

                          {/* Ears */}
                          {(() => {
                            const earsAffected = playerStats.baselineAilments.some(a => a.zone === 'ears' || a.label?.toLowerCase().includes('hearing'));
                            const earsHovered = hoveredZone === 'ears' || hoveredZone?.includes('hearing');
                            const earStyle = earsHovered
                              ? { fill: 'rgba(250,204,21,0.5)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : earsAffected
                                ? { fill: 'rgba(59,130,246,0.35)', stroke: 'rgba(59,130,246,0.7)', filter: 'url(#glow-blue)' }
                                : { fill: 'rgba(245,158,11,0.1)', stroke: 'rgba(245,158,11,0.25)', filter: '' };
                            return (
                              <>
                                <ellipse cx="44" cy="18" rx="3" ry="5" {...earStyle} />
                                <ellipse cx="76" cy="18" rx="3" ry="5" {...earStyle} />
                              </>
                            );
                          })()}

                          {/* Neck */}
                          {(() => {
                            const neckHovered = hoveredZone === 'neck' || hoveredZone === 'throat';
                            const neckBuboes = playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'neck';
                            const throatAffected = playerStats.baselineAilments.some(a => a.zone === 'throat' || a.zone === 'neck');
                            const neckStyle = neckHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : neckBuboes
                                ? { fill: 'rgba(168,85,247,0.4)', stroke: 'rgba(168,85,247,0.7)', filter: 'url(#glow-purple)' }
                                : throatAffected
                                  ? { fill: 'rgba(59,130,246,0.25)', stroke: 'rgba(59,130,246,0.6)', filter: 'url(#glow-blue)' }
                                  : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <rect x="54" y="32" width="12" height="10" rx="3" {...neckStyle} />;
                          })()}

                          {/* Torso */}
                          {(() => {
                            const torsoHovered = hoveredZone === 'torso' || hoveredZone === 'chest' || hoveredZone === 'lungs' || hoveredZone === 'abdomen' || hoveredZone === 'systemic';
                            const torsoStyle = torsoHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : playerStats.plague.coughingBlood > 0
                                ? { fill: 'rgba(239,68,68,0.25)', stroke: 'rgba(239,68,68,0.6)', filter: 'url(#glow-red)' }
                                : playerStats.plague.weakness > 0
                                  ? { fill: 'rgba(245,158,11,0.2)', stroke: 'rgba(245,158,11,0.5)', filter: 'url(#glow-amber)' }
                                  : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 38 42 Q 32 50 32 70 L 32 95 Q 32 100 38 105 L 42 110 L 42 120 Q 42 125 48 125 L 72 125 Q 78 125 78 120 L 78 110 L 82 105 Q 88 100 88 95 L 88 70 Q 88 50 82 42 Z" {...torsoStyle} />;
                          })()}

                          {/* Left Arm */}
                          {(() => {
                            const armsHovered = hoveredZone === 'arms' || hoveredZone === 'upper arms' || hoveredZone === 'lower arms' || hoveredZone === 'hands' || hoveredZone === 'systemic';
                            const armsAffected = playerStats.baselineAilments.some(a => a.zone === 'upper arms' || a.zone === 'lower arms' || a.zone === 'hands');
                            const armStyle = armsHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : armsAffected
                                ? { fill: 'rgba(59,130,246,0.25)', stroke: 'rgba(59,130,246,0.6)', filter: '' }
                                : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 32 48 Q 22 52 18 65 L 12 95 Q 10 105 8 115 L 6 130 Q 4 136 8 140 L 14 142 Q 18 142 18 138 L 20 120 L 24 95 Q 26 80 32 68" {...armStyle} />;
                          })()}

                          {/* Right Arm */}
                          {(() => {
                            const armsHovered = hoveredZone === 'arms' || hoveredZone === 'upper arms' || hoveredZone === 'lower arms' || hoveredZone === 'hands' || hoveredZone === 'systemic';
                            const armsAffected = playerStats.baselineAilments.some(a => a.zone === 'upper arms' || a.zone === 'lower arms' || a.zone === 'hands');
                            const armStyle = armsHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : armsAffected
                                ? { fill: 'rgba(59,130,246,0.25)', stroke: 'rgba(59,130,246,0.6)', filter: '' }
                                : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 88 48 Q 98 52 102 65 L 108 95 Q 110 105 112 115 L 114 130 Q 116 136 112 140 L 106 142 Q 102 142 102 138 L 100 120 L 96 95 Q 94 80 88 68" {...armStyle} />;
                          })()}

                          {/* Pelvis/Hips */}
                          {(() => {
                            const groinHovered = hoveredZone === 'groin' || hoveredZone === 'pelvis';
                            const groinBuboes = playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'groin';
                            const pelvisStyle = groinHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : groinBuboes
                                ? { fill: 'rgba(168,85,247,0.4)', stroke: 'rgba(168,85,247,0.7)', filter: 'url(#glow-purple)' }
                                : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 42 120 L 38 135 Q 36 142 42 145 L 48 148 L 48 150 L 42 152 Q 38 154 40 160 L 78 160 Q 82 154 78 152 L 72 150 L 72 148 L 78 145 Q 84 142 82 135 L 78 120" {...pelvisStyle} />;
                          })()}

                          {/* Left Leg */}
                          {(() => {
                            const legsHovered = hoveredZone === 'legs' || hoveredZone === 'thighs' || hoveredZone === 'calves' || hoveredZone === 'feet' || hoveredZone === 'systemic';
                            const legsAffected = playerStats.baselineAilments.some(a => a.zone === 'thighs' || a.zone === 'calves' || a.zone === 'feet' || a.zone === 'legs');
                            const legStyle = legsHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : playerStats.plague.gangrene > 0
                                ? { fill: 'rgba(15,23,42,0.5)', stroke: 'rgba(100,116,139,0.8)', filter: '' }
                                : legsAffected
                                  ? { fill: 'rgba(59,130,246,0.25)', stroke: 'rgba(59,130,246,0.6)', filter: '' }
                                  : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 42 155 L 40 175 L 38 195 Q 38 200 40 205 L 40 215 Q 40 220 46 220 L 50 218 Q 52 216 50 212 L 48 200 L 50 175 L 52 155" {...legStyle} />;
                          })()}

                          {/* Right Leg */}
                          {(() => {
                            const legsHovered = hoveredZone === 'legs' || hoveredZone === 'thighs' || hoveredZone === 'calves' || hoveredZone === 'feet' || hoveredZone === 'systemic';
                            const legsAffected = playerStats.baselineAilments.some(a => a.zone === 'thighs' || a.zone === 'calves' || a.zone === 'feet' || a.zone === 'legs');
                            const legStyle = legsHovered
                              ? { fill: 'rgba(250,204,21,0.4)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : playerStats.plague.gangrene > 0
                                ? { fill: 'rgba(15,23,42,0.5)', stroke: 'rgba(100,116,139,0.8)', filter: '' }
                                : legsAffected
                                  ? { fill: 'rgba(59,130,246,0.25)', stroke: 'rgba(59,130,246,0.6)', filter: '' }
                                  : { fill: 'url(#bodyGradient)', stroke: 'rgba(245,158,11,0.3)', filter: '' };
                            return <path d="M 78 155 L 80 175 L 82 195 Q 82 200 80 205 L 80 215 Q 80 220 74 220 L 70 218 Q 68 216 70 212 L 72 200 L 70 175 L 68 155" {...legStyle} />;
                          })()}
                        </g>

                        {/* Armpit bubo indicators */}
                        {(() => {
                          const armpitHovered = hoveredZone === 'armpit';
                          const armpitBuboes = playerStats.plague.buboes > 0 && playerStats.plague.buboLocation === 'armpit';
                          if (armpitHovered || armpitBuboes) {
                            const style = armpitHovered
                              ? { fill: 'rgba(250,204,21,0.5)', stroke: 'rgba(250,204,21,0.9)', filter: 'url(#glow-yellow)' }
                              : { fill: 'rgba(168,85,247,0.5)', stroke: 'rgba(168,85,247,0.8)', filter: 'url(#glow-purple)' };
                            return (
                              <>
                                <circle cx="34" cy="55" r="6" {...style} />
                                <circle cx="86" cy="55" r="6" {...style} />
                              </>
                            );
                          }
                          return null;
                        })()}

                        {/* Lung indicators for coughing blood */}
                        {(playerStats.plague.coughingBlood > 0 || hoveredZone === 'lungs') && (
                          <>
                            <ellipse cx="50" cy="65" rx="8" ry="12"
                              fill={hoveredZone === 'lungs' ? 'rgba(250,204,21,0.4)' : 'rgba(239,68,68,0.3)'}
                              stroke={hoveredZone === 'lungs' ? 'rgba(250,204,21,0.9)' : 'rgba(239,68,68,0.6)'}
                              strokeWidth="0.5"
                              filter={hoveredZone === 'lungs' ? 'url(#glow-yellow)' : ''}
                            />
                            <ellipse cx="70" cy="65" rx="8" ry="12"
                              fill={hoveredZone === 'lungs' ? 'rgba(250,204,21,0.4)' : 'rgba(239,68,68,0.3)'}
                              stroke={hoveredZone === 'lungs' ? 'rgba(250,204,21,0.9)' : 'rgba(239,68,68,0.6)'}
                              strokeWidth="0.5"
                              filter={hoveredZone === 'lungs' ? 'url(#glow-yellow)' : ''}
                            />
                          </>
                        )}

                        {/* Skin bleeding indicator - dotted pattern */}
                        {(playerStats.plague.skinBleeding > 0 || hoveredZone === 'skin') && (
                          <g fill={hoveredZone === 'skin' ? 'rgba(250,204,21,0.8)' : 'rgba(239,68,68,0.6)'}>
                            <circle cx="45" cy="80" r="1.5" />
                            <circle cx="75" cy="85" r="1.5" />
                            <circle cx="55" cy="100" r="1.5" />
                            <circle cx="65" cy="95" r="1.5" />
                            <circle cx="50" cy="115" r="1.5" />
                            <circle cx="70" cy="110" r="1.5" />
                          </g>
                        )}

                        {/* Face details */}
                        <g strokeWidth="0.5">
                          {/* Eyes */}
                          {(() => {
                            const eyesHovered = hoveredZone === 'eyes';
                            const eyesAffected = playerStats.baselineAilments.some(a => a.zone === 'eyes' || a.label?.toLowerCase().includes('vision') || a.label?.toLowerCase().includes('sight'));
                            const eyeStyle = eyesHovered
                              ? { fill: 'rgba(250,204,21,0.6)', stroke: 'rgba(250,204,21,0.9)' }
                              : eyesAffected
                                ? { fill: 'rgba(59,130,246,0.5)', stroke: 'rgba(59,130,246,0.7)' }
                                : { fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.25)' };
                            return (
                              <>
                                <circle cx="55" cy="15" r="2" {...eyeStyle} />
                                <circle cx="65" cy="15" r="2" {...eyeStyle} />
                              </>
                            );
                          })()}

                          {/* Mouth */}
                          {(() => {
                            const mouthHovered = hoveredZone === 'mouth';
                            const mouthAffected = playerStats.baselineAilments.some(a => a.zone === 'mouth');
                            const mouthStroke = mouthHovered
                              ? 'rgba(250,204,21,0.9)'
                              : mouthAffected
                                ? 'rgba(59,130,246,0.6)'
                                : 'rgba(245,158,11,0.25)';
                            return <path d="M 57 23 Q 60 26 63 23" stroke={mouthStroke} fill="none" />;
                          })()}
                        </g>
                      </svg>
                    </div>
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
                        <span
                          key={`${entry.label}-${index}`}
                          className={`px-3 py-1 rounded-full border text-[11px] cursor-pointer transition-all ${
                            hoveredZone === entry.zone || (entry.systemic && hoveredZone === 'systemic')
                              ? 'border-yellow-400/60 bg-yellow-500/20 text-yellow-200'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-200/80 hover:border-amber-400/50'
                          }`}
                          onMouseEnter={() => setHoveredZone(entry.zone)}
                          onMouseLeave={() => setHoveredZone(null)}
                        >
                          {entry.label}
                          <span className="ml-2 text-[10px] uppercase tracking-widest opacity-60">
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
                    <div className="space-y-2 text-[11px]">
                      {playerStats.baselineAilments.map((ailment) => (
                        <div
                          key={ailment.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            hoveredZone === ailment.zone
                              ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/40'
                              : 'text-amber-200/80 hover:bg-white/5 border border-transparent'
                          }`}
                          onMouseEnter={() => setHoveredZone(ailment.zone)}
                          onMouseLeave={() => setHoveredZone(null)}
                        >
                          <span>{ailment.label}</span>
                          <span className="text-[10px] uppercase tracking-widest opacity-60">
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
                      { label: 'Fever', value: playerStats.plague.fever, tone: 'from-orange-500 to-red-500', zone: 'systemic' },
                      { label: 'Weakness', value: playerStats.plague.weakness, tone: 'from-amber-500 to-orange-400', zone: 'systemic' },
                      { label: 'Buboes', value: playerStats.plague.buboes, tone: 'from-purple-500 to-fuchsia-400', zone: playerStats.plague.buboLocation },
                      { label: 'Coughing Blood', value: playerStats.plague.coughingBlood, tone: 'from-red-500 to-rose-400', zone: 'lungs' },
                      { label: 'Skin Bleeding', value: playerStats.plague.skinBleeding, tone: 'from-red-600 to-red-400', zone: 'skin' },
                      { label: 'Delirium', value: playerStats.plague.delirium, tone: 'from-purple-500 to-indigo-400', zone: 'head' },
                      { label: 'Gangrene', value: playerStats.plague.gangrene, tone: 'from-slate-500 to-gray-400', zone: 'feet' }
                    ].filter((entry) => entry.value > 0).map((entry) => (
                      <div
                        key={entry.label}
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          hoveredZone === entry.zone
                            ? 'border-yellow-400/50 bg-yellow-500/10'
                            : 'border-white/10 bg-black/30 hover:border-white/20'
                        }`}
                        onMouseEnter={() => setHoveredZone(entry.zone)}
                        onMouseLeave={() => setHoveredZone(null)}
                      >
                        <div className="flex justify-between mb-2">
                          <span className={hoveredZone === entry.zone ? 'text-yellow-200' : 'text-amber-200/70'}>{entry.label}</span>
                          <span className={hoveredZone === entry.zone ? 'text-yellow-300' : 'text-amber-300'}>{Math.round(entry.value)}%</span>
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
                    const canConsume = isConsumableItem(entry.effects as any);
                    const effectDescription = getItemEffectDescription(entry.effects as any);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectInventoryItem(entry)}
                        className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative h-10 w-10 rounded-lg bg-black/40 border border-amber-500/40 flex items-center justify-center overflow-hidden">
                            <ItemIcon name={entry.name} size={36} />
                            {canConsume && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500/90 border border-emerald-300/50 flex items-center justify-center">
                                <Pill size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-amber-100">{entry.name}</div>
                              <div className="text-[10px] text-amber-200/50">x{entry.quantity}</div>
                            </div>
                            <div className="text-[10px] text-amber-200/50 mt-1">{entry.description}</div>
                            {canConsume && effectDescription && (
                              <div className="text-[9px] text-emerald-300/70 mt-1 flex items-center gap-1">
                                <Pill size={10} />
                                {effectDescription}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                              {entry.rarity}
                            </span>
                            <div className="flex items-center gap-2">
                              {onConsumeItem && canConsume && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onConsumeItem({ id: entry.id, itemId: entry.itemId, quantity: entry.quantity, acquiredAt: entry.acquiredAt });
                                  }}
                                  className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-600/80 text-white hover:bg-emerald-500 transition-colors"
                                >
                                  Use
                                </button>
                              )}
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
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {inventoryEntries.map((entry) => {
                    const canConsume = isConsumableItem(entry.effects as any);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectInventoryItem(entry)}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="relative h-12 w-12 rounded-lg bg-black/40 border border-amber-500/40 flex items-center justify-center overflow-hidden">
                            <ItemIcon name={entry.name} size={44} />
                            {canConsume && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/90 border border-emerald-300/50 flex items-center justify-center">
                                <Pill size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                            {entry.rarity}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-amber-100">{entry.name}</div>
                        <div className="text-[10px] text-amber-200/50 mt-1">{entry.description}</div>
                        <div className="mt-3 flex items-center justify-between text-[10px] text-amber-200/70">
                          <span>Qty: {entry.quantity}</span>
                          <div className="flex items-center gap-2">
                            {onConsumeItem && canConsume && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onConsumeItem({ id: entry.id, itemId: entry.itemId, quantity: entry.quantity, acquiredAt: entry.acquiredAt });
                                }}
                                className="uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-600/80 text-white hover:bg-emerald-500 transition-colors"
                              >
                                Use
                              </button>
                            )}
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
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {dossierTab === 'family' && (
            <div className="space-y-5 text-amber-50/85 text-[12px]">
              <div className="flex items-center gap-3 mb-4">
                <Users size={20} className="text-amber-400" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70">Household</div>
                  <div className="text-amber-200/80 text-sm">{playerStats.family}</div>
                </div>
              </div>

              {playerStats.familyMembers.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                  <Users size={48} className="mx-auto text-amber-900/40 mb-4" />
                  <div className="text-amber-200/60 text-sm">No immediate family in Damascus</div>
                  <div className="text-amber-200/40 text-[11px] mt-2">
                    You make your way through the city alone.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerStats.familyMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedFamilyMember(member)}
                      className={`rounded-xl border p-4 backdrop-blur transition-all cursor-pointer group ${
                        member.alive
                          ? 'border-white/10 bg-white/5 hover:border-amber-500/30 hover:bg-amber-500/5'
                          : 'border-red-900/30 bg-red-950/20 hover:border-red-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <FamilyPortrait
                            name={member.name}
                            gender={member.gender}
                            age={member.age}
                            skinTone={member.appearance?.skinTone ?? playerStats.skinTone}
                            hairColor={member.appearance?.hairColor ?? playerStats.hairColor}
                            hairStyle={member.appearance?.hairStyle}
                            headwearStyle={member.appearance?.headwearStyle}
                            headwearColor={member.appearance?.headwearColor}
                            facialHair={member.appearance?.facialHair}
                            isDeceased={!member.alive}
                            size={48}
                          />
                          <div>
                            <div className="font-semibold text-amber-100">{member.name}</div>
                            <div className="text-[10px] text-amber-200/50 uppercase tracking-widest">
                              {getRelationshipLabel(member.relationship, member.gender)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-full ${
                            member.alive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {member.alive ? 'Living' : 'Deceased'}
                          </div>
                          <ChevronRight size={16} className="text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-200/70">
                        <div>
                          <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Age</span>
                          <div>{member.age} years</div>
                        </div>
                        <div>
                          <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Gender</span>
                          <div>{member.gender}</div>
                        </div>
                      </div>

                      {member.relationship === 'child' && member.age < 7 && (
                        <div className="mt-3 text-[10px] text-amber-200/50 italic">
                          A young child in your care.
                        </div>
                      )}
                      {member.relationship === 'parent' && (
                        <div className="mt-3 text-[10px] text-amber-200/50 italic">
                          An elder of the household.
                        </div>
                      )}

                      <div className="mt-3 text-[9px] text-amber-400/50 group-hover:text-amber-400/80 transition-colors text-right">
                        Click for details
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {playerStats.homeBuildingId && (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 p-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Home size={16} className="text-amber-400" />
                      <div className="text-[10px] uppercase tracking-widest text-amber-400/70">Residence</div>
                    </div>
                    {onGoHome && (
                      <button
                        onClick={() => {
                          onGoHome();
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                          isOnHomeTile
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50'
                        }`}
                      >
                        <Navigation size={12} />
                        {isOnHomeTile ? 'View Home' : 'Go Home'}
                      </button>
                    )}
                  </div>
                  <div className="text-amber-200/80 text-sm">
                    {homeBuildingType ? (
                      <>
                        Your family resides in a <span className="text-amber-100 font-medium">{homeBuildingType}</span>
                        {homeDistrictName && (
                          <span className="text-amber-200/70"> in the {homeDistrictName} district</span>
                        )}
                      </>
                    ) : (
                      <>
                        Your family resides in Damascus
                        {playerStats.homeMapPosition && (
                          <span className="text-amber-200/50 text-[10px] ml-2">
                            (District {playerStats.homeMapPosition.mapX}, {playerStats.homeMapPosition.mapY})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {playerStats.familyMembers.some(m => !m.alive) && (
                <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-red-400/70 mb-2">Mourning</div>
                  <div className="text-red-200/70 text-[11px]">
                    {playerStats.familyMembers.filter(m => !m.alive).length} family{' '}
                    {playerStats.familyMembers.filter(m => !m.alive).length === 1 ? 'member has' : 'members have'}{' '}
                    passed away. May God have mercy on their souls.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Family Member Detail Modal */}
      <FamilyMemberModal
        isOpen={selectedFamilyMember !== null}
        onClose={() => setSelectedFamilyMember(null)}
        member={selectedFamilyMember}
        playerGender={playerStats.gender}
        playerProfession={playerStats.profession}
        socialClass={playerStats.socialClass}
        skinTone={selectedFamilyMember?.appearance?.skinTone ?? playerStats.skinTone}
        hairColor={selectedFamilyMember?.appearance?.hairColor ?? playerStats.hairColor}
      />
    </div>
  );
};
