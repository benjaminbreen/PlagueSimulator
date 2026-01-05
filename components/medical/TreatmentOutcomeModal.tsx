import React, { useEffect, useState } from 'react';
import { X, Droplet, Clock, Flame, Pill, Heart, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { TreatmentOutcome, OutcomeLevel, ProceduralDetail } from '../../utils/medicalTreatments';
import { TreatmentAnimation } from './TreatmentAnimations';

interface TreatmentOutcomeModalProps {
  outcome: TreatmentOutcome | null;
  onClose: () => void;
  playerSkinTone?: string;
}

const OUTCOME_COLORS: Record<OutcomeLevel, {
  bg: string;
  border: string;
  text: string;
  glow: string;
  icon: string;
}> = {
  remarkable: {
    bg: 'from-emerald-950/90 to-emerald-900/70',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
    icon: 'text-emerald-400'
  },
  success: {
    bg: 'from-amber-950/90 to-amber-900/70',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]',
    icon: 'text-amber-400'
  },
  partial: {
    bg: 'from-yellow-950/90 to-stone-900/70',
    border: 'border-yellow-600/40',
    text: 'text-yellow-300',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.15)]',
    icon: 'text-yellow-400'
  },
  failure: {
    bg: 'from-stone-950/90 to-stone-900/70',
    border: 'border-stone-600/40',
    text: 'text-stone-300',
    glow: 'shadow-[0_0_20px_rgba(120,113,108,0.15)]',
    icon: 'text-stone-400'
  },
  complication: {
    bg: 'from-red-950/90 to-red-900/70',
    border: 'border-red-500/50',
    text: 'text-red-300',
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.3)]',
    icon: 'text-red-400'
  }
};

const OUTCOME_LABELS: Record<OutcomeLevel, string> = {
  remarkable: 'Remarkable Success',
  success: 'Treatment Successful',
  partial: 'Partial Success',
  failure: 'Treatment Failed',
  complication: 'Complication'
};

// Icon component for procedural details
const DetailIcon: React.FC<{ icon?: ProceduralDetail['icon']; className?: string }> = ({ icon, className = '' }) => {
  const baseClass = `w-4 h-4 ${className}`;
  switch (icon) {
    case 'blood':
      return <Droplet className={baseClass} />;
    case 'time':
      return <Clock className={baseClass} />;
    case 'cups':
      return (
        <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4h8v12a4 4 0 01-8 0V4z" />
          <path d="M6 4h12" />
        </svg>
      );
    case 'blade':
      return (
        <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L8 12h8L12 2z" />
          <rect x="10" y="12" width="4" height="8" rx="1" />
        </svg>
      );
    case 'iron':
      return <Flame className={baseClass} />;
    case 'medicine':
      return <Pill className={baseClass} />;
    case 'prayer':
      return <Sparkles className={baseClass} />;
    default:
      return <Heart className={baseClass} />;
  }
};

export const TreatmentOutcomeModal: React.FC<TreatmentOutcomeModalProps> = ({
  outcome,
  onClose,
  playerSkinTone = 'hsl(28, 35%, 55%)'
}) => {
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isClosing, setIsClosing] = useState(false);

  // Auto-close timer
  useEffect(() => {
    if (!outcome) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [outcome]);

  // Reset timer when outcome changes
  useEffect(() => {
    if (outcome) {
      setTimeRemaining(60);
      setIsClosing(false);
    }
  }, [outcome]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  if (!outcome) return null;

  const colors = OUTCOME_COLORS[outcome.outcomeLevel];
  const isPositive = outcome.outcomeLevel === 'remarkable' || outcome.outcomeLevel === 'success';
  const isNegative = outcome.outcomeLevel === 'failure' || outcome.outcomeLevel === 'complication';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.glow}
          transition-all duration-200 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          animate-in zoom-in-95 fade-in duration-300`}
        style={{
          background: `linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)`
        }}
      >
        {/* Animated gradient header */}
        <div className={`relative h-32 bg-gradient-to-r ${colors.bg} overflow-hidden`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, ${isPositive ? 'rgba(16,185,129,0.3)' : isNegative ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'} 0%, transparent 50%)`,
              animation: 'pulse 3s ease-in-out infinite'
            }} />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* Timer indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 text-white/60 text-xs">
            <Clock size={12} />
            <span>Auto-close in {timeRemaining}s</span>
          </div>

          {/* Title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className={`text-xs uppercase tracking-[0.4em] ${colors.text} mb-2 font-semibold`}>
              {OUTCOME_LABELS[outcome.outcomeLevel]}
            </div>
            <h1 className="text-3xl md:text-4xl text-white historical-font tracking-wide">
              {outcome.title}
            </h1>
            <p className="text-lg text-white/60 mt-1" style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
              {outcome.titleAr}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Left: Animation + Cost */}
            <div className="space-y-4">
              {/* Treatment animation */}
              <div className={`rounded-xl border ${colors.border} bg-slate-900/60 p-3`}>
                <div className="h-[180px] flex items-center justify-center">
                  <TreatmentAnimation
                    treatmentId={outcome.treatmentId}
                    skinTone={playerSkinTone}
                  />
                </div>
              </div>

              {/* Cost paid */}
              <div className="rounded-xl border border-amber-700/30 bg-amber-950/30 p-3">
                <div className="text-[10px] uppercase tracking-widest text-amber-400/60 mb-1">Treatment Cost</div>
                <div className="flex items-center gap-2 text-amber-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" className="text-amber-600" />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" className="text-amber-200">D</text>
                  </svg>
                  <span className="text-lg font-semibold">{outcome.cost} dirhams</span>
                </div>
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-5">
              {/* Flavor text */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-amber-100/90 leading-relaxed italic">
                  "{outcome.flavorText}"
                </p>
              </div>

              {/* Procedural details */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-3">Procedure Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {outcome.proceduralDetails.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-white/5 last:border-0">
                      <DetailIcon icon={detail.icon} className="text-amber-400/70 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-amber-200/50 text-xs">{detail.label}</div>
                        <div className="text-amber-100 text-sm truncate">{detail.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Effects summary */}
              {outcome.effectsSummary.length > 0 && (
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-3">Effects on Your Condition</div>
                  <div className="flex flex-wrap gap-2">
                    {outcome.effectsSummary.map((effect, i) => {
                      const isGood = (effect.stat === 'survivalChance' && effect.change > 0) ||
                                     (effect.stat !== 'survivalChance' && effect.stat !== 'weakness' && effect.change < 0);
                      const isBad = (effect.stat === 'weakness' && effect.change > 0) ||
                                    (effect.stat !== 'weakness' && effect.stat !== 'survivalChance' && effect.change > 0) ||
                                    (effect.stat === 'survivalChance' && effect.change < 0);

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                            isGood ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300' :
                            isBad ? 'border-red-700/50 bg-red-950/30 text-red-300' :
                            'border-slate-600/50 bg-slate-800/30 text-slate-300'
                          }`}
                        >
                          {isGood ? <TrendingDown size={14} /> :
                           isBad ? <TrendingUp size={14} /> :
                           <Minus size={14} />}
                          <span className="text-sm">
                            {effect.label}: {effect.change > 0 ? '+' : ''}{effect.change}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Practitioner quote */}
              <div className={`rounded-xl border ${colors.border} bg-gradient-to-r ${colors.bg} p-4`}>
                <div className="flex gap-3">
                  {/* Practitioner icon */}
                  <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7 text-amber-200/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                      <path d="M9 14l-2 6" />
                      <path d="M15 14l2 6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">The Practitioner Says</div>
                    <p className={`${colors.text} italic leading-relaxed`}>
                      "{outcome.practitionerComment}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Continue button */}
        <div className="p-4 border-t border-white/10 bg-slate-950/50">
          <button
            onClick={handleClose}
            className={`w-full py-4 rounded-xl font-semibold historical-font tracking-wide text-lg transition-all
              ${isPositive
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                : isNegative
                ? 'bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-900/30'
                : 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg shadow-amber-900/30'
              }`}
          >
            Continue On
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default TreatmentOutcomeModal;
