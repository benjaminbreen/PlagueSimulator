import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Heart, Coins, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';
import {
  MedicalTreatment,
  MedicalEstablishmentType,
  PlagueStatus,
  PlagueType,
  ItemEffect,
  BuboLocation
} from '../types';
import {
  MEDICAL_TREATMENTS,
  ESTABLISHMENTS,
  getTreatmentsForEstablishment,
  canReceiveTreatment,
  getEfficacyMultiplier
} from '../utils/medicalTreatments';
import { TreatmentAnimation } from './medical/TreatmentAnimations';
import { TreatmentIcon } from './medical/TreatmentIcons';

interface MedicalTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentType: MedicalEstablishmentType;
  practitionerName: string;
  playerPlague: PlagueStatus;
  playerCurrency: number;
  playerSkinTone?: string;
  onTreatment: (treatmentId: string, cost: number) => void;
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  none: { bg: 'bg-emerald-900/30', text: 'text-emerald-300', border: 'border-emerald-700/50', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]' },
  low: { bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700/50', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]' },
  medium: { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700/50', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.2)]' },
  high: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700/50', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' }
};

// Format effect for display
const formatEffect = (effect: ItemEffect): string => {
  if (effect.type === 'symptomRelief' && effect.stat) {
    if (effect.stat === 'all') return `All symptoms -${Math.abs(effect.value)}%`;
    if (effect.stat === 'survivalChance') return `Survival +${effect.value}%`;
    const statName = effect.stat.charAt(0).toUpperCase() + effect.stat.slice(1);
    return effect.value < 0 ? `${statName} ${effect.value}` : `${statName} +${effect.value}`;
  }
  if (effect.type === 'debuff' && effect.stat === 'weakness') {
    return `Weakness +${effect.value}`;
  }
  if (effect.type === 'plagueProtection') {
    return `${effect.value}% protection (${effect.duration}h)`;
  }
  return '';
};

// Treatment Card for Selection Grid
const TreatmentCard: React.FC<{
  treatment: MedicalTreatment;
  establishment: MedicalEstablishmentType;
  playerCurrency: number;
  plagueStatus: PlagueStatus;
  onSelect: () => void;
}> = ({ treatment, establishment, playerCurrency, plagueStatus, onSelect }) => {
  const establishmentInfo = ESTABLISHMENTS[establishment];
  const adjustedCost = Math.round(treatment.cost * establishmentInfo.priceModifier);
  const canAfford = playerCurrency >= adjustedCost;
  const eligibility = canReceiveTreatment(treatment, {
    buboes: plagueStatus.buboes,
    weakness: plagueStatus.weakness,
    gangrene: plagueStatus.gangrene
  });
  const riskStyle = RISK_COLORS[treatment.riskLevel];
  const isDisabled = !canAfford || !eligibility.canReceive;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`relative group rounded-xl border-2 ${riskStyle.border} bg-slate-900/60 p-4
        transition-all duration-200 text-left
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : `hover:bg-slate-800/60 hover:${riskStyle.glow} hover:scale-[1.02]`}`}
    >
      {/* Icon */}
      <div className="flex items-center justify-center mb-3">
        <div className={`w-16 h-16 rounded-xl ${riskStyle.bg} flex items-center justify-center`}>
          <TreatmentIcon treatmentId={treatment.id} size={44} />
        </div>
      </div>

      {/* Name */}
      <h3 className="text-amber-100 font-semibold text-center historical-font text-sm mb-1">
        {treatment.nameEn}
      </h3>

      {/* Arabic name */}
      <p className="text-amber-200/50 text-xs text-center mb-2" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
        {treatment.nameAr}
      </p>

      {/* Cost */}
      <div className="flex items-center justify-center gap-1.5">
        <Coins size={12} className="text-amber-500" />
        <span className={`text-sm ${canAfford ? 'text-amber-200' : 'text-red-400'}`}>
          {adjustedCost}
        </span>
      </div>

      {/* Risk badge */}
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${riskStyle.bg} ${riskStyle.text}`}>
        {treatment.riskLevel === 'none' ? 'Safe' : treatment.riskLevel}
      </div>

      {/* Disabled reason tooltip */}
      {isDisabled && (
        <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-black/80 text-red-300 text-[10px] px-2 py-1 rounded">
            {!canAfford ? 'Insufficient funds' : eligibility.reason}
          </span>
        </div>
      )}
    </button>
  );
};

// Detail View for Selected Treatment
const TreatmentDetailView: React.FC<{
  treatment: MedicalTreatment;
  establishment: MedicalEstablishmentType;
  plagueStatus: PlagueStatus;
  playerCurrency: number;
  playerSkinTone: string;
  efficacyMultiplier: number;
  onBack: () => void;
  onTreatment: (treatmentId: string, cost: number) => void;
}> = ({ treatment, establishment, plagueStatus, playerCurrency, playerSkinTone, efficacyMultiplier, onBack, onTreatment }) => {
  const [isActivating, setIsActivating] = useState(false);

  const establishmentInfo = ESTABLISHMENTS[establishment];
  const adjustedCost = Math.round(treatment.cost * establishmentInfo.priceModifier);
  const canAfford = playerCurrency >= adjustedCost;
  const eligibility = canReceiveTreatment(treatment, {
    buboes: plagueStatus.buboes,
    weakness: plagueStatus.weakness,
    gangrene: plagueStatus.gangrene
  });
  const riskStyle = RISK_COLORS[treatment.riskLevel];
  const effectiveSuccessChance = Math.min(100, treatment.successChance + establishmentInfo.efficacyBonus);

  // Handle the treatment activation sequence
  const handleActivateTreatment = () => {
    setIsActivating(true);
    // Play activation animation for 2.5 seconds, then apply treatment
    setTimeout(() => {
      onTreatment(treatment.id, adjustedCost);
    }, 2500);
  };

  const positiveEffects = treatment.effects.filter(e =>
    (e.type === 'symptomRelief' && e.value < 0) ||
    (e.type === 'symptomRelief' && e.stat === 'survivalChance' && e.value > 0) ||
    e.type === 'plagueProtection'
  );
  const negativeEffects = treatment.effects.filter(e =>
    e.type === 'debuff' || (e.type === 'symptomRelief' && e.value > 0 && e.stat !== 'survivalChance')
  );

  // Get bubo location for lancing animation
  const buboLocation = plagueStatus.buboLocation === BuboLocation.GROIN ? 'groin' :
    plagueStatus.buboLocation === BuboLocation.ARMPIT ? 'armpit' :
    plagueStatus.buboLocation === BuboLocation.NECK ? 'neck' : 'groin';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      {/* Back button - disabled during activation */}
      <button
        onClick={onBack}
        disabled={isActivating}
        className={`flex items-center gap-2 transition-colors mb-4 group ${
          isActivating ? 'text-amber-400/30 cursor-not-allowed' : 'text-amber-400/70 hover:text-amber-300'
        }`}
      >
        <ArrowLeft size={16} className={isActivating ? '' : 'group-hover:-translate-x-1 transition-transform'} />
        <span className="text-sm">Back to treatments</span>
      </button>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 overflow-y-auto">
        {/* Left: Animation */}
        <div className="flex flex-col">
          <div className={`relative rounded-2xl border-2 ${riskStyle.border} bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 flex-1 ${isActivating ? riskStyle.glow : ''}`}>
            <div className={`w-full h-[280px] flex items-center justify-center transition-all duration-300 ${isActivating ? 'scale-105' : ''}`}>
              <TreatmentAnimation
                treatmentId={treatment.id}
                skinTone={playerSkinTone}
                buboLocation={buboLocation}
                isActivating={isActivating}
              />
            </div>
            {/* Activation overlay text */}
            {isActivating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 px-6 py-3 rounded-xl animate-pulse">
                  <p className="text-amber-300 historical-font tracking-wide text-lg">Applying treatment...</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats under animation */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-blue-300">{effectiveSuccessChance}% success</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-amber-400" />
              <span className={canAfford ? 'text-amber-200' : 'text-red-400'}>{adjustedCost} dirhams</span>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b border-amber-900/30 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl text-amber-400 historical-font tracking-wide">
                  {treatment.nameEn}
                </h2>
                <p className="text-lg text-amber-200/60 mt-1" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
                  {treatment.nameAr} <span className="text-amber-400/40 text-sm">({treatment.transliteration})</span>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                {treatment.riskLevel === 'none' ? 'Safe' : `${treatment.riskLevel.charAt(0).toUpperCase() + treatment.riskLevel.slice(1)} Risk`}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">Procedure</div>
            <p className="text-amber-100/80 text-sm italic leading-relaxed">
              "{treatment.description}"
            </p>
          </div>

          {/* Effects Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Benefits */}
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={14} className="text-emerald-400" />
                <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">Benefits</span>
              </div>
              <ul className="space-y-1.5">
                {positiveEffects.map((effect, i) => (
                  <li key={i} className="text-emerald-200 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {formatEffect(effect)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className={`rounded-xl border ${riskStyle.border} ${riskStyle.bg} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className={riskStyle.text} />
                <span className={`text-[10px] uppercase tracking-widest ${riskStyle.text} font-semibold opacity-80`}>Risks</span>
              </div>
              {negativeEffects.length > 0 ? (
                <ul className="space-y-1.5">
                  {negativeEffects.map((effect, i) => (
                    <li key={i} className={`${riskStyle.text} text-sm flex items-center gap-2`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${riskStyle.text.replace('text', 'bg')}`} />
                      {formatEffect(effect)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-200/50 text-sm">None</p>
              )}
              {treatment.riskDescription && (
                <p className="text-amber-200/40 text-xs mt-3 italic border-t border-white/10 pt-2">
                  {treatment.riskDescription}
                </p>
              )}
            </div>
          </div>

          {/* Efficacy info */}
          {efficacyMultiplier !== 1.0 && (
            <div className={`rounded-xl border p-3 flex items-center gap-3 ${
              efficacyMultiplier > 1 ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-orange-700/40 bg-orange-950/20'
            }`}>
              <Activity size={16} className={efficacyMultiplier > 1 ? 'text-emerald-400' : 'text-orange-400'} />
              <div>
                <span className={`text-sm ${efficacyMultiplier > 1 ? 'text-emerald-300' : 'text-orange-300'}`}>
                  {Math.round(efficacyMultiplier * 100)}% treatment efficacy
                </span>
                <p className="text-amber-200/40 text-xs">
                  {efficacyMultiplier > 1 ? 'Early intervention bonus' : 'Reduced effectiveness at this disease stage'}
                </p>
              </div>
            </div>
          )}

          {/* Requirements Warning */}
          {!eligibility.canReceive && (
            <div className="rounded-xl border border-red-700/50 bg-red-950/30 p-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-red-300 text-sm">{eligibility.reason}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleActivateTreatment}
            disabled={!canAfford || !eligibility.canReceive || isActivating}
            className={`w-full py-4 rounded-xl font-semibold transition-all historical-font tracking-wide text-lg ${
              isActivating
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white/80 cursor-wait animate-pulse'
                : canAfford && eligibility.canReceive
                ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg shadow-amber-900/30 hover:shadow-amber-800/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isActivating ? 'Applying Treatment...' :
             !canAfford ? `Need ${adjustedCost - playerCurrency} more dirhams` :
             !eligibility.canReceive ? 'Cannot receive treatment' :
             `Undergo ${treatment.nameEn}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MedicalTreatmentModal: React.FC<MedicalTreatmentModalProps> = ({
  isOpen,
  onClose,
  establishmentType,
  practitionerName,
  playerPlague,
  playerCurrency,
  playerSkinTone = 'hsl(28, 35%, 55%)',
  onTreatment
}) => {
  const [selectedTreatment, setSelectedTreatment] = useState<MedicalTreatment | null>(null);

  if (!isOpen) return null;

  const establishmentInfo = ESTABLISHMENTS[establishmentType];
  const availableTreatments = getTreatmentsForEstablishment(establishmentType);

  const efficacyMultiplier = useMemo(() => {
    if (playerPlague.state === 0) return 1.0;
    return getEfficacyMultiplier(playerPlague.daysInfected, playerPlague.plagueType);
  }, [playerPlague.daysInfected, playerPlague.plagueType, playerPlague.state]);

  const handleClose = () => {
    setSelectedTreatment(null);
    onClose();
  };

  const handleTreatment = (treatmentId: string, cost: number) => {
    onTreatment(treatmentId, cost);
    setSelectedTreatment(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop with radial mask */}
      <div
        className="absolute inset-0 backdrop-blur-md -z-10"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 55% 60% at 50% 50%, transparent 15%, black 60%)',
          maskImage: 'radial-gradient(ellipse 55% 60% at 50% 50%, transparent 15%, black 60%)'
        }}
        onClick={handleClose}
      />
      <div className="absolute inset-0 bg-black/70 -z-20" onClick={handleClose} />

      {/* Modal */}
      <div className={`relative w-full ${selectedTreatment ? 'max-w-4xl' : 'max-w-3xl'} max-h-[90vh] bg-slate-950/90 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-amber-900/30 bg-gradient-to-b from-amber-950/30 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-amber-400/60 hover:text-amber-300 hover:bg-amber-900/30 transition-colors"
          >
            <X size={22} />
          </button>

          <div className="text-center pr-8">
            <p className="text-amber-200/50 text-lg mb-1" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
              {establishmentInfo.nameAr}
            </p>
            <h1 className="text-2xl md:text-3xl text-amber-400 historical-font tracking-widest">
              MEDICAL TREATMENTS
            </h1>
            <p className="text-amber-200/60 mt-2 text-sm">
              {practitionerName}, {establishmentInfo.transliteration}
            </p>
          </div>

          {/* Player Status Bar */}
          <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-amber-900/20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-amber-700/30">
              <Coins size={14} className="text-amber-500" />
              <span className="text-amber-200 text-sm font-medium">{playerCurrency} dirhams</span>
            </div>
            {playerPlague.state > 0 && efficacyMultiplier < 1.0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-950/40 border border-orange-700/40">
                <Activity size={14} className="text-orange-400" />
                <span className="text-orange-300 text-sm">Late stage: {Math.round(efficacyMultiplier * 100)}% efficacy</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {selectedTreatment ? (
            <TreatmentDetailView
              treatment={selectedTreatment}
              establishment={establishmentType}
              plagueStatus={playerPlague}
              playerCurrency={playerCurrency}
              playerSkinTone={playerSkinTone}
              efficacyMultiplier={efficacyMultiplier}
              onBack={() => setSelectedTreatment(null)}
              onTreatment={handleTreatment}
            />
          ) : (
            <>
              {/* Treatment selection grid */}
              {availableTreatments.length === 0 ? (
                <p className="text-amber-200/50 text-center py-12">
                  No treatments available at this establishment.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {availableTreatments.map(treatment => (
                    <TreatmentCard
                      key={treatment.id}
                      treatment={treatment}
                      establishment={establishmentType}
                      playerCurrency={playerCurrency}
                      plagueStatus={playerPlague}
                      onSelect={() => setSelectedTreatment(treatment)}
                    />
                  ))}
                </div>
              )}

              {/* Footer hint */}
              <p className="text-amber-200/30 text-xs text-center mt-6 italic">
                Select a treatment to view details and undergo the procedure
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalTreatmentModal;
