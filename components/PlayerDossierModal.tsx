import React, { useState } from 'react';
import { X, Pill, Users, Home, ChevronRight, Navigation, Coins, BarChart3, Hexagon } from 'lucide-react';
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
  /** Unequip headwear to reveal hair */
  onUnequipHeadwear?: () => void;
  /** Equip headwear from inventory */
  onEquipHeadwear?: () => void;
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
  onGoHome,
  onUnequipHeadwear,
  onEquipHeadwear
}) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [attributesView, setAttributesView] = useState<'radar' | 'bars'>('radar');
  const [hoveredAttribute, setHoveredAttribute] = useState<string | null>(null);
  const [hoveredHumor, setHoveredHumor] = useState<string | null>(null);
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);

  // Attribute definitions with gameplay descriptions
  const attributeInfo: Record<string, {
    label: string;
    color: string;
    glowColor: string;
    description: string;
    getValue: () => number;
  }> = {
    strength: {
      label: 'Strength',
      color: 'rgb(239, 68, 68)',
      glowColor: 'rgba(239, 68, 68, 0.6)',
      description: 'Physical power. Affects combat, carrying capacity, and labor tasks. Higher strength helps resist certain plague symptoms.',
      getValue: () => playerStats.strength
    },
    piety: {
      label: 'Piety',
      color: 'rgb(168, 85, 247)',
      glowColor: 'rgba(168, 85, 247, 0.6)',
      description: 'Religious devotion. Improves interactions with clergy, access to religious healing, and provides spiritual comfort during illness.',
      getValue: () => playerStats.piety
    },
    perceptiveness: {
      label: 'Perceptiveness',
      color: 'rgb(56, 189, 248)',
      glowColor: 'rgba(56, 189, 248, 0.6)',
      description: 'Awareness and insight. Helps detect threats, find hidden items, notice symptoms early, and read people\'s intentions.',
      getValue: () => playerStats.perceptiveness
    },
    charisma: {
      label: 'Charisma',
      color: 'rgb(251, 191, 36)',
      glowColor: 'rgba(251, 191, 36, 0.6)',
      description: 'Social influence. Affects trade prices, persuasion, reputation gains, and the willingness of others to help you.',
      getValue: () => playerStats.charisma
    },
    calmness: {
      label: 'Calmness',
      color: 'rgb(99, 102, 241)',
      glowColor: 'rgba(99, 102, 241, 0.6)',
      description: 'Mental fortitude. Resists panic and delirium, improves decision-making under stress, and helps maintain composure during plague.',
      getValue: () => 20 - playerStats.neuroticism
    }
  };

  // Humor definitions with dynamic status descriptions
  const getHumorLevel = (value: number): 'deficient' | 'low' | 'balanced' | 'elevated' | 'excess' => {
    if (value < 15) return 'deficient';
    if (value < 35) return 'low';
    if (value < 65) return 'balanced';
    if (value < 85) return 'elevated';
    return 'excess';
  };

  const humorInfo: Record<string, {
    label: string;
    arabicName: string;
    color: string;
    glowColor: string;
    element: string;
    quality: string;
    organ: string;
    temperament: string;
    baseDescription: string;
    getValue: () => number;
    getStatusDescription: () => string;
  }> = {
    blood: {
      label: 'Blood',
      arabicName: 'Dam (دم)',
      color: 'rgb(239, 68, 68)',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      element: 'Air',
      quality: 'Hot & Moist',
      organ: 'Heart',
      temperament: 'Sanguine',
      baseDescription: 'Associated with vitality, courage, and optimism. Excess causes fever and inflammation; deficiency leads to weakness and pallor.',
      getValue: () => playerStats.humors.blood,
      getStatusDescription: () => {
        const level = getHumorLevel(playerStats.humors.blood);
        const val = playerStats.humors.blood;
        if (level === 'deficient') return `Severely deficient (${val}). You appear pale and weak. Bloodletting is contraindicated; strengthening foods like red meat and wine are recommended.`;
        if (level === 'low') return `Below balance (${val}). Your vitality is diminished. Consider warming foods and moderate exercise to restore vigor.`;
        if (level === 'balanced') return `Well balanced (${val}). Your sanguine humor is in harmony, supporting good health and positive temperament.`;
        if (level === 'elevated') return `Elevated (${val}). You may feel unusually energetic or hot-tempered. Cooling foods and rest may help.`;
        return `In excess (${val}). Risk of fever and inflammation. Bloodletting or cupping may be advised by a physician.`;
      }
    },
    phlegm: {
      label: 'Phlegm',
      arabicName: 'Balgham (بلغم)',
      color: 'rgb(96, 165, 250)',
      glowColor: 'rgba(96, 165, 250, 0.5)',
      element: 'Water',
      quality: 'Cold & Moist',
      organ: 'Brain',
      temperament: 'Phlegmatic',
      baseDescription: 'Governs calmness, sleep, and moisture. Excess causes lethargy and respiratory issues; deficiency leads to dryness and restlessness.',
      getValue: () => playerStats.humors.phlegm,
      getStatusDescription: () => {
        const level = getHumorLevel(playerStats.humors.phlegm);
        const val = playerStats.humors.phlegm;
        if (level === 'deficient') return `Severely deficient (${val}). You suffer from dryness and cannot rest properly. Moistening foods and cool drinks are needed.`;
        if (level === 'low') return `Below balance (${val}). Your sleep may be disturbed and skin dry. Increase intake of soups and watery foods.`;
        if (level === 'balanced') return `Well balanced (${val}). Your phlegmatic humor supports restful sleep and emotional stability.`;
        if (level === 'elevated') return `Elevated (${val}). You may feel sluggish or congested. Warming spices and activity can help.`;
        return `In excess (${val}). Risk of lethargy and respiratory congestion. Expectorants and warming treatments advised.`;
      }
    },
    yellowBile: {
      label: 'Yellow Bile',
      arabicName: 'Ṣafrāʾ (صفراء)',
      color: 'rgb(250, 204, 21)',
      glowColor: 'rgba(250, 204, 21, 0.5)',
      element: 'Fire',
      quality: 'Hot & Dry',
      organ: 'Liver',
      temperament: 'Choleric',
      baseDescription: 'Drives ambition, digestion, and heat. Excess causes anger and bilious fever; deficiency weakens digestion and resolve.',
      getValue: () => playerStats.humors.yellowBile,
      getStatusDescription: () => {
        const level = getHumorLevel(playerStats.humors.yellowBile);
        const val = playerStats.humors.yellowBile;
        if (level === 'deficient') return `Severely deficient (${val}). Your digestion is weak and you lack drive. Bitter herbs and warming foods may help.`;
        if (level === 'low') return `Below balance (${val}). You may feel indecisive or have slow digestion. Light bitter tonics are recommended.`;
        if (level === 'balanced') return `Well balanced (${val}). Your choleric humor supports good digestion and healthy ambition.`;
        if (level === 'elevated') return `Elevated (${val}). You may feel irritable or hot. Cooling foods and avoiding spices recommended.`;
        return `In excess (${val}). Risk of bilious fever and anger. Purging or cooling treatments may be needed.`;
      }
    },
    blackBile: {
      label: 'Black Bile',
      arabicName: 'Sawdāʾ (سوداء)',
      color: 'rgb(100, 116, 139)',
      glowColor: 'rgba(100, 116, 139, 0.5)',
      element: 'Earth',
      quality: 'Cold & Dry',
      organ: 'Spleen',
      temperament: 'Melancholic',
      baseDescription: 'Associated with contemplation and structure. Excess causes melancholy and dark thoughts; deficiency leads to flightiness.',
      getValue: () => playerStats.humors.blackBile,
      getStatusDescription: () => {
        const level = getHumorLevel(playerStats.humors.blackBile);
        const val = playerStats.humors.blackBile;
        if (level === 'deficient') return `Severely deficient (${val}). You may feel unfocused and lacking structure. Grounding activities and earthy foods help.`;
        if (level === 'low') return `Below balance (${val}). Your mind may wander too freely. Root vegetables and regular routine recommended.`;
        if (level === 'balanced') return `Well balanced (${val}). Your melancholic humor supports clear thinking and steady temperament.`;
        if (level === 'elevated') return `Elevated (${val}). You may feel withdrawn or overly serious. Music and pleasant company can lighten the spirit.`;
        return `In excess (${val}). Risk of deep melancholy and dark thoughts. Theriac or musical therapy may be prescribed.`;
      }
    }
  };

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
            <div className="space-y-6 text-amber-50/85 text-[13px]">
              {/* Header: Portrait + Identity + Key Stats */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Portrait and Identity */}
                <div className="flex items-start gap-4">
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
                      headscarfStyle={playerStats.headscarfStyle}
                      headscarfPattern={playerStats.headscarfPattern}
                      headscarfAccentColor={playerStats.headscarfAccentColor}
                      headscarfColor={playerStats.headscarfColor}
                      turbanPattern={playerStats.turbanPattern}
                      turbanAccentColor={playerStats.turbanAccentColor}
                      facialHair={playerStats.facialHair}
                      facialHairColor={playerStats.facialHairColor}
                      eyeColor={playerStats.eyeColor}
                      mouthExpression={Math.max(-1, Math.min(1, (playerStats.charisma - 8) / 6))}
                      accessories={playerStats.accessories}
                      healthState={playerStats.plague?.state}
                      size={100}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-amber-100 tracking-wide">{playerStats.name}</h2>
                    <p className="text-base text-amber-300/70 mt-1">{playerStats.profession}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-800/40 text-amber-300/80 uppercase tracking-wider border border-amber-700/30">
                        {playerStats.socialClass}
                      </span>
                      <span className="text-amber-200/50 text-sm">{playerStats.age} years old</span>
                    </div>
                    <p className="text-sm text-amber-200/50 mt-2">{playerStats.family}</p>
                  </div>
                </div>

                {/* Key Stats: Currency, Reputation, Health */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Currency */}
                  <div className="rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-900/30 to-black/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins size={16} className="text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400/70">Wealth</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">{Math.round(playerStats.currency)}</div>
                    <div className="text-[10px] text-emerald-400/50 uppercase tracking-wider">Dirhams</div>
                  </div>

                  {/* Reputation */}
                  <div className="rounded-xl border border-sky-800/40 bg-gradient-to-br from-sky-900/30 to-black/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-sky-400/70">Reputation</span>
                    </div>
                    <div className="text-2xl font-bold text-sky-300">{Math.round(playerStats.reputation)}%</div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
                        style={{ width: `${playerStats.reputation}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-sky-400/50 mt-1.5">
                      {playerStats.reputation >= 80 ? 'Highly esteemed' :
                       playerStats.reputation >= 60 ? 'Well regarded' :
                       playerStats.reputation >= 40 ? 'Known locally' :
                       playerStats.reputation >= 20 ? 'Little known' : 'Obscure'}
                    </div>
                  </div>

                  {/* Health Quick View */}
                  <button
                    onClick={() => onChangeTab('health')}
                    className="rounded-xl border border-amber-800/40 bg-gradient-to-br from-amber-900/20 to-black/30 p-4 text-left hover:border-amber-600/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-amber-400/70">Health</span>
                      <ChevronRight size={14} className="text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className={`text-base font-semibold ${
                      playerStats.plague.state === AgentState.HEALTHY ? 'text-emerald-300' :
                      playerStats.plague.state === AgentState.INCUBATING ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {getHealthStatusLabel(playerStats.plague)}
                    </div>
                    <div className="text-[10px] text-amber-200/40 mt-1">Click for details</div>
                  </button>
                </div>
              </div>

              {/* Main Content: Attributes + Humors + Appearance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Attributes */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] uppercase tracking-widest text-amber-400/70">Attributes</div>
                    <div className="flex items-center gap-1 bg-black/30 rounded-full p-0.5">
                      <button
                        onClick={() => setAttributesView('radar')}
                        className={`p-1.5 rounded-full transition-all ${
                          attributesView === 'radar' ? 'bg-amber-600/80 text-white' : 'text-amber-400/50 hover:text-amber-400'
                        }`}
                        title="Radar view"
                      >
                        <Hexagon size={12} />
                      </button>
                      <button
                        onClick={() => setAttributesView('bars')}
                        className={`p-1.5 rounded-full transition-all ${
                          attributesView === 'bars' ? 'bg-amber-600/80 text-white' : 'text-amber-400/50 hover:text-amber-400'
                        }`}
                        title="Bars view"
                      >
                        <BarChart3 size={12} />
                      </button>
                    </div>
                  </div>

                  {attributesView === 'radar' ? (
                    /* Enhanced Radar Chart */
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <svg viewBox="0 0 300 200" className="w-52 h-44">
                          <defs>
                            {/* Gradient fills for each attribute */}
                            <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="rgba(245,158,11,0.15)" />
                              <stop offset="100%" stopColor="transparent" />
                            </radialGradient>
                            <linearGradient id="radarFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="rgba(245,158,11,0.35)" />
                              <stop offset="50%" stopColor="rgba(168,85,247,0.25)" />
                              <stop offset="100%" stopColor="rgba(56,189,248,0.3)" />
                            </linearGradient>
                            <filter id="attrGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                            <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Center glow */}
                          <circle cx="160" cy="130" r="90" fill="url(#radarCenterGlow)" />

                          {/* Background pentagon levels with subtle color */}
                          {[0.25, 0.5, 0.75, 1].map((level, i) => {
                            const points = [0, 1, 2, 3, 4].map(j => {
                              const angle = (j * 72 - 90) * Math.PI / 180;
                              const r = 75 * level;
                              return `${160 + r * Math.cos(angle)},${130 + r * Math.sin(angle)}`;
                            }).join(' ');
                            return (
                              <polygon
                                key={i}
                                points={points}
                                fill="none"
                                stroke={`rgba(245,158,11,${0.08 + i * 0.04})`}
                                strokeWidth="1"
                                strokeDasharray={i === 3 ? "none" : "2,4"}
                              />
                            );
                          })}

                          {/* Axis lines with color gradient toward each attribute */}
                          {(['strength', 'piety', 'perceptiveness', 'charisma', 'calmness'] as const).map((key, i) => {
                            const angle = (i * 72 - 90) * Math.PI / 180;
                            const info = attributeInfo[key];
                            const isHovered = hoveredAttribute === key;
                            return (
                              <line
                                key={key}
                                x1="160"
                                y1="130"
                                x2={160 + 75 * Math.cos(angle)}
                                y2={130 + 75 * Math.sin(angle)}
                                stroke={isHovered ? info.color : 'rgba(245,158,11,0.2)'}
                                strokeWidth={isHovered ? 2 : 1}
                                style={{ transition: 'all 0.2s ease' }}
                              />
                            );
                          })}

                          {/* Data polygon with gradient fill */}
                          {(() => {
                            const normalizeAttr = (val: number) => Math.min(1, Math.max(0.1, (val - 4) / 18));
                            const attrKeys = ['strength', 'piety', 'perceptiveness', 'charisma', 'calmness'] as const;
                            const attrs = attrKeys.map(key => normalizeAttr(attributeInfo[key].getValue()));
                            const points = attrs.map((val, i) => {
                              const angle = (i * 72 - 90) * Math.PI / 180;
                              const r = 75 * val;
                              return `${160 + r * Math.cos(angle)},${130 + r * Math.sin(angle)}`;
                            }).join(' ');
                            return (
                              <polygon
                                points={points}
                                fill="url(#radarFillGradient)"
                                stroke="rgba(245,158,11,0.9)"
                                strokeWidth="2"
                                filter="url(#attrGlow)"
                                style={{ transition: 'all 0.3s ease' }}
                              />
                            );
                          })()}

                          {/* Data points at vertices with color coding */}
                          {(['strength', 'piety', 'perceptiveness', 'charisma', 'calmness'] as const).map((key, i) => {
                            const normalizeAttr = (val: number) => Math.min(1, Math.max(0.1, (val - 4) / 18));
                            const angle = (i * 72 - 90) * Math.PI / 180;
                            const info = attributeInfo[key];
                            const val = normalizeAttr(info.getValue());
                            const r = 75 * val;
                            const x = 160 + r * Math.cos(angle);
                            const y = 130 + r * Math.sin(angle);
                            const isHovered = hoveredAttribute === key;
                            return (
                              <g key={key}>
                                {/* Outer glow when hovered */}
                                {isHovered && (
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="12"
                                    fill={info.glowColor}
                                    style={{ transition: 'all 0.2s ease' }}
                                  />
                                )}
                                {/* Data point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isHovered ? 7 : 5}
                                  fill={info.color}
                                  stroke="rgba(0,0,0,0.5)"
                                  strokeWidth="1"
                                  style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                />
                              </g>
                            );
                          })}

                          {/* Labels positioned outside with full names */}
                          {(['strength', 'piety', 'perceptiveness', 'charisma', 'calmness'] as const).map((key, i) => {
                            const angle = (i * 72 - 90) * Math.PI / 180;
                            const info = attributeInfo[key];
                            const val = info.getValue();
                            const isHovered = hoveredAttribute === key;
                            const labelR = 105;
                            const x = 160 + labelR * Math.cos(angle);
                            const y = 130 + labelR * Math.sin(angle);
                            // Adjust text anchor and position based on which vertex
                            // i=0: top (Strength), i=1: top-right (Piety), i=2: bottom-right (Perceptiveness)
                            // i=3: bottom-left (Charisma), i=4: top-left (Calmness)
                            const textAnchor = i === 0 ? 'middle' : i === 1 || i === 2 ? 'start' : 'end';
                            const labelDy = i === 0 ? -6 : i === 2 || i === 3 ? 2 : -2;
                            const valueDy = i === 0 ? 10 : i === 2 || i === 3 ? 18 : 14;
                            // Horizontal offset for left/right labels
                            const labelDx = i === 1 || i === 2 ? 4 : i === 3 || i === 4 ? -4 : 0;
                            return (
                              <g
                                key={key}
                                onMouseEnter={() => setHoveredAttribute(key)}
                                onMouseLeave={() => setHoveredAttribute(null)}
                                style={{ cursor: 'pointer' }}
                              >
                                {/* Invisible hit area for hover */}
                                <circle cx={x + labelDx} cy={y + labelDy + 6} r="30" fill="transparent" />
                                {/* Label */}
                                <text
                                  x={x + labelDx}
                                  y={y + labelDy}
                                  textAnchor={textAnchor}
                                  dominantBaseline="middle"
                                  className="text-[12px] font-semibold transition-all duration-200"
                                  fill={isHovered ? info.color : 'rgba(251,191,36,0.75)'}
                                >
                                  {info.label}
                                </text>
                                {/* Value - always color-coded, bigger on hover */}
                                <text
                                  x={x + labelDx}
                                  y={y + valueDy}
                                  textAnchor={textAnchor}
                                  dominantBaseline="middle"
                                  className={`font-bold font-mono transition-all duration-200 ${isHovered ? 'text-[15px]' : 'text-[14px]'}`}
                                  fill={info.color}
                                  filter={isHovered ? 'url(#textGlow)' : undefined}
                                  style={{ opacity: isHovered ? 1 : 0.85 }}
                                >
                                  {Math.round(val)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Tooltip area */}
                      <div className="h-10 w-full px-2 mt-1">
                        {hoveredAttribute ? (
                          <div className="text-center animate-in fade-in duration-150">
                            <div className="text-[12px] text-amber-200/90 leading-snug">
                              {attributeInfo[hoveredAttribute].description}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-amber-200/30 italic pt-1">
                            Hover for details
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Enhanced Bar Chart with tooltips */
                    <div className="space-y-2.5 pt-1">
                      {(['strength', 'piety', 'perceptiveness', 'charisma', 'calmness'] as const).map((key) => {
                        const info = attributeInfo[key];
                        const value = info.getValue();
                        const isHovered = hoveredAttribute === key;
                        return (
                          <div
                            key={key}
                            className={`rounded-lg p-2.5 transition-all duration-200 cursor-pointer ${
                              isHovered ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                            onMouseEnter={() => setHoveredAttribute(key)}
                            onMouseLeave={() => setHoveredAttribute(null)}
                          >
                            <div className="flex justify-between text-[11px] mb-1.5">
                              <span
                                className="font-medium transition-colors duration-200"
                                style={{ color: isHovered ? info.color : 'rgba(253,230,138,0.7)' }}
                              >
                                {info.label}
                              </span>
                              <span
                                className="font-mono font-bold transition-colors duration-200"
                                style={{ color: isHovered ? info.color : 'rgba(252,211,77,1)' }}
                              >
                                {Math.round(value)}
                              </span>
                            </div>
                            <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(value / 20) * 100}%`,
                                  background: `linear-gradient(90deg, ${info.color}aa, ${info.color})`,
                                  boxShadow: isHovered ? `0 0 10px ${info.glowColor}` : 'none'
                                }}
                              />
                            </div>
                            {/* Inline tooltip on hover */}
                            {isHovered && (
                              <div className="mt-2 text-[10px] text-amber-200/70 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                                {info.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Four Humors Visual - Enhanced */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-[12px] uppercase tracking-widest text-amber-400/70 mb-2">Four Humors</div>

                  <div className="flex flex-col items-center">
                    {/* Enhanced Quadrant Diagram */}
                    <svg viewBox="0 0 240 200" className="w-64 h-52">
                      <defs>
                        {/* Gradients for each quadrant */}
                        <radialGradient id="bloodGradR" cx="70%" cy="30%" r="60%">
                          <stop offset="0%" stopColor="rgba(239,68,68,0.5)" />
                          <stop offset="100%" stopColor="rgba(239,68,68,0.15)" />
                        </radialGradient>
                        <radialGradient id="phlegmGradR" cx="30%" cy="30%" r="60%">
                          <stop offset="0%" stopColor="rgba(96,165,250,0.5)" />
                          <stop offset="100%" stopColor="rgba(96,165,250,0.15)" />
                        </radialGradient>
                        <radialGradient id="yellowBileGradR" cx="70%" cy="70%" r="60%">
                          <stop offset="0%" stopColor="rgba(250,204,21,0.5)" />
                          <stop offset="100%" stopColor="rgba(250,204,21,0.15)" />
                        </radialGradient>
                        <radialGradient id="blackBileGradR" cx="30%" cy="70%" r="60%">
                          <stop offset="0%" stopColor="rgba(100,116,139,0.5)" />
                          <stop offset="100%" stopColor="rgba(100,116,139,0.15)" />
                        </radialGradient>
                        <filter id="humorGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Four quadrants as interactive paths */}
                      {/* Blood - Top Right (Sanguine) */}
                      <g
                        onMouseEnter={() => setHoveredHumor('blood')}
                        onMouseLeave={() => setHoveredHumor(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <path
                          d="M 120 100 L 120 20 A 80 80 0 0 1 200 100 Z"
                          fill={hoveredHumor === 'blood' ? 'rgba(239,68,68,0.4)' : 'url(#bloodGradR)'}
                          stroke={hoveredHumor === 'blood' ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.4)'}
                          strokeWidth={hoveredHumor === 'blood' ? 2 : 1}
                          filter={hoveredHumor === 'blood' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        {/* Value indicator */}
                        <circle
                          cx="160"
                          cy="60"
                          r={6 + (playerStats.humors.blood / 100) * 14}
                          fill={humorInfo.blood.color}
                          opacity={hoveredHumor === 'blood' ? 1 : 0.8}
                          filter={hoveredHumor === 'blood' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <text
                          x="160"
                          y="60"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] fill-white font-bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {playerStats.humors.blood}
                        </text>
                      </g>

                      {/* Yellow Bile - Bottom Right (Choleric) */}
                      <g
                        onMouseEnter={() => setHoveredHumor('yellowBile')}
                        onMouseLeave={() => setHoveredHumor(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <path
                          d="M 120 100 L 200 100 A 80 80 0 0 1 120 180 Z"
                          fill={hoveredHumor === 'yellowBile' ? 'rgba(250,204,21,0.4)' : 'url(#yellowBileGradR)'}
                          stroke={hoveredHumor === 'yellowBile' ? 'rgba(250,204,21,0.9)' : 'rgba(250,204,21,0.4)'}
                          strokeWidth={hoveredHumor === 'yellowBile' ? 2 : 1}
                          filter={hoveredHumor === 'yellowBile' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <circle
                          cx="160"
                          cy="140"
                          r={6 + (playerStats.humors.yellowBile / 100) * 14}
                          fill={humorInfo.yellowBile.color}
                          opacity={hoveredHumor === 'yellowBile' ? 1 : 0.8}
                          filter={hoveredHumor === 'yellowBile' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <text
                          x="160"
                          y="140"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] fill-black font-bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {playerStats.humors.yellowBile}
                        </text>
                      </g>

                      {/* Black Bile - Bottom Left (Melancholic) */}
                      <g
                        onMouseEnter={() => setHoveredHumor('blackBile')}
                        onMouseLeave={() => setHoveredHumor(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <path
                          d="M 120 100 L 120 180 A 80 80 0 0 1 40 100 Z"
                          fill={hoveredHumor === 'blackBile' ? 'rgba(100,116,139,0.5)' : 'url(#blackBileGradR)'}
                          stroke={hoveredHumor === 'blackBile' ? 'rgba(100,116,139,0.9)' : 'rgba(100,116,139,0.4)'}
                          strokeWidth={hoveredHumor === 'blackBile' ? 2 : 1}
                          filter={hoveredHumor === 'blackBile' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <circle
                          cx="80"
                          cy="140"
                          r={6 + (playerStats.humors.blackBile / 100) * 14}
                          fill={humorInfo.blackBile.color}
                          opacity={hoveredHumor === 'blackBile' ? 1 : 0.8}
                          filter={hoveredHumor === 'blackBile' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <text
                          x="80"
                          y="140"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] fill-white font-bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {playerStats.humors.blackBile}
                        </text>
                      </g>

                      {/* Phlegm - Top Left (Phlegmatic) */}
                      <g
                        onMouseEnter={() => setHoveredHumor('phlegm')}
                        onMouseLeave={() => setHoveredHumor(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <path
                          d="M 120 100 L 40 100 A 80 80 0 0 1 120 20 Z"
                          fill={hoveredHumor === 'phlegm' ? 'rgba(96,165,250,0.4)' : 'url(#phlegmGradR)'}
                          stroke={hoveredHumor === 'phlegm' ? 'rgba(96,165,250,0.9)' : 'rgba(96,165,250,0.4)'}
                          strokeWidth={hoveredHumor === 'phlegm' ? 2 : 1}
                          filter={hoveredHumor === 'phlegm' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <circle
                          cx="80"
                          cy="60"
                          r={6 + (playerStats.humors.phlegm / 100) * 14}
                          fill={humorInfo.phlegm.color}
                          opacity={hoveredHumor === 'phlegm' ? 1 : 0.8}
                          filter={hoveredHumor === 'phlegm' ? 'url(#humorGlow)' : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        <text
                          x="80"
                          y="60"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] fill-white font-bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {playerStats.humors.phlegm}
                        </text>
                      </g>

                      {/* Center circle with balance */}
                      <circle cx="120" cy="100" r="28" fill="rgba(0,0,0,0.7)" stroke="rgba(245,158,11,0.5)" strokeWidth="2" />
                      <text x="120" y="95" textAnchor="middle" className="text-[8px] fill-amber-400/80 uppercase tracking-wider">Balance</text>
                      <text x="120" y="110" textAnchor="middle" className="text-[14px] fill-amber-300 font-bold">{playerStats.humoralBalance}%</text>

                      {/* Corner labels with qualities */}
                      <text x="200" y="15" textAnchor="end" className="text-[9px] fill-red-400/90 font-semibold">Blood</text>
                      <text x="200" y="26" textAnchor="end" className="text-[7px] fill-red-300/60">Hot & Moist</text>

                      <text x="235" y="150" textAnchor="end" className="text-[9px] fill-yellow-400/90 font-semibold">Yellow Bile</text>
                      <text x="235" y="161" textAnchor="end" className="text-[7px] fill-yellow-300/60">Hot & Dry</text>

                      <text x="5" y="150" textAnchor="start" className="text-[9px] fill-slate-400/90 font-semibold">Black Bile</text>
                      <text x="5" y="161" textAnchor="start" className="text-[7px] fill-slate-300/60">Cold & Dry</text>

                      <text x="40" y="15" textAnchor="start" className="text-[9px] fill-blue-400/90 font-semibold">Phlegm</text>
                      <text x="40" y="26" textAnchor="start" className="text-[7px] fill-blue-300/60">Cold & Moist</text>
                    </svg>

                    {/* Tooltip area */}
                    <div className="h-14 w-full px-1 mt-1">
                      {hoveredHumor ? (
                        <div className="animate-in fade-in duration-150 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[13px] font-bold"
                              style={{ color: humorInfo[hoveredHumor].color }}
                            >
                              {humorInfo[hoveredHumor].label}
                            </span>
                            <span className="text-[10px] text-amber-200/50 font-amiri">
                              {humorInfo[hoveredHumor].arabicName}
                            </span>
                            <span className="text-[9px] text-amber-200/40">
                              {humorInfo[hoveredHumor].element} • {humorInfo[hoveredHumor].temperament}
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-200/80 leading-snug">
                            {humorInfo[hoveredHumor].getStatusDescription()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-[10px] text-amber-200/30 italic pt-1">
                          Hover for details
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Appearance */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70">Appearance</div>
                  <button
                    className="text-[9px] uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition-colors"
                    onClick={() => setAppearanceExpanded((prev) => !prev)}
                  >
                    {appearanceExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Skin</span>
                    <div className="text-amber-100/80 mt-1">{playerStats.skinDescription}</div>
                  </div>
                  <div>
                    <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Hair</span>
                    <div className="text-amber-100/80 mt-1">{playerStats.hairDescription}</div>
                  </div>
                  <button
                    onClick={() => onSelectInventoryItem(buildApparelEntry('robe'))}
                    className="text-left group"
                  >
                    <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Robe</span>
                    <div className="text-amber-100/80 mt-1 group-hover:text-amber-200 transition-colors">
                      {playerStats.robeDescription}
                    </div>
                  </button>
                  <div className="group relative">
                    <button
                      onClick={() => onSelectInventoryItem(buildApparelEntry('headwear'))}
                      className="text-left w-full"
                    >
                      <span className="text-amber-500/60 uppercase tracking-widest text-[9px]">Headwear</span>
                      <div className="text-amber-100/80 mt-1 group-hover:text-amber-200 transition-colors">
                        {playerStats.headwearStyle === 'none' ? 'None (hair visible)' : playerStats.headwearDescription}
                      </div>
                    </button>
                    {playerStats.headwearStyle !== 'none' && onUnequipHeadwear && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnequipHeadwear();
                        }}
                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] px-2 py-1 rounded bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-700/50"
                      >
                        Unequip
                      </button>
                    )}
                  </div>
                </div>
                {appearanceExpanded && (
                  <div className="mt-4 border-t border-white/10 pt-4 text-[11px] text-amber-100/80 space-y-1">
                    <div>Gender: {playerStats.gender}</div>
                    <div>Age: {playerStats.age}</div>
                    <div>Height: {playerStats.height.toFixed(2)}</div>
                    <div>Weight: {playerStats.weight.toFixed(2)}</div>
                    <div>Skin tone: {playerStats.skinTone}</div>
                    <div>Hair style: {playerStats.hairStyle}</div>
                    <div>Hair color: {playerStats.hairColor}</div>
                    <div>Facial hair: {playerStats.facialHair ?? 'none'}</div>
                    <div>Headwear style: {playerStats.headwearStyle}</div>
                    <div>Headwear color: {playerStats.headwearColor}</div>
                    <div>Headwear garment: {playerStats.headwearGarmentType ?? 'none'}</div>
                    <div>Headscarf style: {playerStats.headscarfStyle ?? 'none'}</div>
                    <div>Headscarf pattern: {playerStats.headscarfPattern ?? 'none'}</div>
                    <div>Headscarf accent: {playerStats.headscarfAccentColor ?? 'none'}</div>
                    <div>Turban pattern: {playerStats.turbanPattern ?? 'none'}</div>
                    <div>Turban accent: {playerStats.turbanAccentColor ?? 'none'}</div>
                    <div>Robe base: {playerStats.robeBaseColor}</div>
                    <div>Robe accent: {playerStats.robeAccentColor}</div>
                    <div>Robe pattern: {playerStats.robePattern}</div>
                    <div>Robe pattern scale: {playerStats.robePatternScale?.toFixed(2) ?? 'n/a'}</div>
                    <div>Robe trim: {playerStats.robeHasTrim ? 'yes' : 'no'}</div>
                    <div>Robe hem band: {playerStats.robeHemBand ? 'yes' : 'no'}</div>
                    <div>Robe sash: {playerStats.robeHasSash ? 'yes' : 'no'}</div>
                    <div>Robe sleeves: {playerStats.robeSleeves ? 'yes' : 'no'}</div>
                    <div>Robe overwrap: {playerStats.robeOverwrap ? 'yes' : 'no'}</div>
                    <div>Robe spread: {playerStats.robeSpread.toFixed(2)}</div>
                    <div>Sash pattern: {playerStats.sashPattern ?? 'none'}</div>
                    <div>Sleeve coverage: {playerStats.sleeveCoverage}</div>
                    <div>Footwear: {playerStats.footwearStyle}</div>
                    <div>Footwear color: {playerStats.footwearColor}</div>
                    <div>Footwear description: {playerStats.footwearDescription}</div>
                    <div>Accessories: {playerStats.accessories.length ? playerStats.accessories.join(', ') : 'none'}</div>
                    <div>Clothing items: {playerStats.clothing.length ? playerStats.clothing.join(', ') : 'none'}</div>
                  </div>
                )}
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
                  {/* Unequipped headwear - shows at top of inventory */}
                  {playerStats.unequippedHeadwear && (
                    <div className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-900/20 p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-10 w-10 rounded-lg bg-black/40 border border-amber-500/40 flex items-center justify-center overflow-hidden">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: playerStats.unequippedHeadwear.color }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-amber-100">{playerStats.unequippedHeadwear.description}</div>
                          </div>
                          <div className="text-[10px] text-amber-200/50 mt-1">Unequipped headwear</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                            Apparel
                          </span>
                          {onEquipHeadwear && (
                            <button
                              onClick={onEquipHeadwear}
                              className="text-[9px] uppercase tracking-widest px-3 py-1 rounded-full bg-amber-600/80 text-white hover:bg-amber-500 transition-colors"
                            >
                              Equip
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                  {/* Unequipped headwear - shows in grid */}
                  {playerStats.unequippedHeadwear && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="relative h-12 w-12 rounded-lg bg-black/40 border border-amber-500/40 flex items-center justify-center overflow-hidden">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: playerStats.unequippedHeadwear.color }}
                          />
                        </div>
                        <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-300/70">
                          Apparel
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-amber-100">{playerStats.unequippedHeadwear.description}</div>
                      <div className="text-[10px] text-amber-200/50 mt-1">Unequipped</div>
                      <div className="mt-3 flex items-center justify-end">
                        {onEquipHeadwear && (
                          <button
                            onClick={onEquipHeadwear}
                            className="text-[9px] uppercase tracking-widest px-3 py-1 rounded-full bg-amber-600/80 text-white hover:bg-amber-500 transition-colors"
                          >
                            Equip
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
                            headscarfStyle={member.appearance?.headscarfStyle}
                            headscarfPattern={member.appearance?.headscarfPattern}
                            headscarfAccentColor={member.appearance?.headscarfAccentColor}
                            headscarfColor={member.appearance?.headwearColor}
                            turbanPattern={member.appearance?.turbanPattern}
                            turbanAccentColor={member.appearance?.turbanAccentColor}
                            facialHair={member.appearance?.facialHair}
                            facialHairColor={member.appearance?.facialHairColor}
                            eyeColor={member.appearance?.eyeColor}
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
