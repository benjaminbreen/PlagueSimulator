import React, { useEffect, useCallback, useMemo } from 'react';
import { X, Heart, MessageCircle, Clock, Sparkles, Users } from 'lucide-react';
import { FamilyMember, SocialClass, AgentState } from '../types';
import { getRelationshipLabel, generateFamilyMemberProfile, FamilyMemberProfile } from '../utils/family';
import { FamilyPortrait } from './FamilyPortrait';

interface FamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember | null;
  playerGender: 'Male' | 'Female';
  playerProfession: string;
  socialClass: SocialClass;
  healthState?: AgentState; // From registry if available
  skinTone?: string;
  hairColor?: string;
}

export const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  playerGender,
  playerProfession,
  socialClass,
  healthState,
  skinTone,
  hairColor
}) => {
  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Generate profile deterministically from member data
  const profile: FamilyMemberProfile | null = useMemo(() => {
    if (!member) return null;
    return generateFamilyMemberProfile(member, playerGender, playerProfession, socialClass);
  }, [member, playerGender, playerProfession, socialClass]);

  if (!isOpen || !member || !profile) return null;

  const relationLabel = getRelationshipLabel(member.relationship, member.gender);
  const pronoun = member.gender === 'Male' ? 'He' : 'She';
  const possessive = member.gender === 'Male' ? 'His' : 'Her';

  // Determine health status display
  const getHealthDisplay = () => {
    if (!member.alive) {
      return { label: 'Deceased', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
    }
    if (healthState === AgentState.INFECTED) {
      return { label: 'Infected', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' };
    }
    if (healthState === AgentState.SYMPTOMATIC) {
      return { label: 'Symptomatic', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
    }
    if (healthState === AgentState.RECOVERING) {
      return { label: 'Recovering', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    }
    return { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
  };

  const health = getHealthDisplay();

  // Relationship quality color
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'devoted': return 'text-pink-400';
      case 'close': return 'text-amber-400';
      case 'respectful': return 'text-blue-400';
      case 'strained': return 'text-gray-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[301] pointer-events-none overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className={`relative w-full max-w-lg bg-gradient-to-b rounded-2xl border shadow-2xl pointer-events-auto ${
              member.alive
                ? 'from-stone-900 to-stone-950 border-amber-800/40'
                : 'from-stone-900 to-red-950/30 border-red-800/40'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 text-amber-400 hover:text-amber-300 transition-colors rounded-full hover:bg-white/10"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-amber-900/20">
              <div className="flex items-center gap-4">
                <FamilyPortrait
                  name={member.name}
                  gender={member.gender}
                  age={member.age}
                  skinTone={member.appearance?.skinTone ?? skinTone}
                  hairColor={member.appearance?.hairColor ?? hairColor}
                  hairStyle={member.appearance?.hairStyle}
                  headwearStyle={member.appearance?.headwearStyle}
                  headwearColor={member.appearance?.headwearColor}
                  facialHair={member.appearance?.facialHair}
                  healthState={healthState}
                  isDeceased={!member.alive}
                  size={64}
                />
                <div>
                  <h2 className="text-2xl font-bold text-amber-100">{member.name}</h2>
                  <div className="text-amber-400/70 text-sm uppercase tracking-widest">
                    Your {relationLabel}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${health.bg} ${health.color} border ${health.border}`}>
                      {health.label}
                    </span>
                    <span className="text-amber-200/50 text-xs">{member.age} years old</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Physical Description */}
              <div className="text-amber-200/80 text-sm italic">
                {profile.physicalDescription}
              </div>

              {/* Personality Traits */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  <Sparkles size={12} />
                  Temperament
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.traits.map((trait, idx) => (
                    <span
                      key={trait}
                      className={`px-3 py-1 rounded-full text-xs border ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-white/5 text-amber-200/70 border-white/10'
                      }`}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Backstory */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  <Clock size={12} />
                  History
                </div>
                <div className="text-amber-200/80 text-sm leading-relaxed bg-white/5 rounded-lg p-3 border border-white/5">
                  {profile.backstory}
                </div>
              </div>

              {/* Relationship */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  <Users size={12} />
                  Your Bond
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs uppercase tracking-wider ${getQualityColor(profile.relationshipQuality)}`}>
                    {profile.relationshipQuality}
                  </span>
                </div>
                <div className="text-amber-200/70 text-sm">
                  {profile.relationshipDescription}
                </div>
              </div>

              {/* Daily Life */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  <Heart size={12} />
                  Daily Life
                </div>
                <div className="text-amber-200/70 text-sm">
                  {pronoun} {profile.dailyHabit}.
                </div>
              </div>

              {/* Voice */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  <MessageCircle size={12} />
                  Manner of Speech
                </div>
                <div className="text-amber-200/70 text-sm italic">
                  {profile.voice}.
                </div>
              </div>

              {/* Current Concerns */}
              <div className="border-t border-amber-900/30 pt-4">
                <div className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  {possessive} Mind These Days
                </div>
                <div className="text-amber-200/60 text-sm">
                  {pronoun} {profile.currentConcern}.
                </div>
              </div>

              {/* Deceased memorial */}
              {!member.alive && (
                <div className="border-t border-red-900/30 pt-4">
                  <div className="text-red-300/80 text-sm text-center italic">
                    May God have mercy on {member.gender === 'Male' ? 'his' : 'her'} soul.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-900/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 rounded-lg text-amber-200 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
