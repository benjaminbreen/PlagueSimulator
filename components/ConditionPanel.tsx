import React from 'react';
import { BookOpenText, Cross, FlaskConical } from 'lucide-react';
import { ActiveEffect, AgentState, PlagueStatus } from '../types';
import {
  ConditionLogEntry,
  getConditionCourse,
  getConditionHeadline,
  getConditionSuggestion,
  getPrimarySymptoms,
  getProtectionSummaries
} from '../utils/condition';

interface ConditionPanelProps {
  plague: PlagueStatus;
  activeEffects: ActiveEffect[];
  simTime: number;
  currentTaskTitle?: string | null;
  recentConditionLog: ConditionLogEntry[];
  onOpenHealth: () => void;
  onOpenInventory: () => void;
  onAskNarrator: (question: string) => void;
}

const toneClasses: Record<'stable' | 'warning' | 'danger' | 'critical', { border: string; accent: string; glow: string; badge: string }> = {
  stable: {
    border: 'border-emerald-500/35',
    accent: 'text-emerald-300',
    glow: 'shadow-[0_0_28px_rgba(16,185,129,0.12)]',
    badge: 'bg-emerald-500/14 text-emerald-200'
  },
  warning: {
    border: 'border-amber-500/35',
    accent: 'text-amber-200',
    glow: 'shadow-[0_0_28px_rgba(245,158,11,0.12)]',
    badge: 'bg-amber-500/14 text-amber-100'
  },
  danger: {
    border: 'border-orange-500/40',
    accent: 'text-orange-200',
    glow: 'shadow-[0_0_28px_rgba(249,115,22,0.14)]',
    badge: 'bg-orange-500/14 text-orange-100'
  },
  critical: {
    border: 'border-red-500/45',
    accent: 'text-red-200',
    glow: 'shadow-[0_0_32px_rgba(239,68,68,0.18)]',
    badge: 'bg-red-500/16 text-red-100'
  }
};

export const ConditionPanel: React.FC<ConditionPanelProps> = ({
  plague,
  activeEffects,
  simTime,
  currentTaskTitle,
  recentConditionLog,
  onOpenHealth,
  onOpenInventory,
  onAskNarrator
}) => {
  const headline = getConditionHeadline(plague);
  const tone = toneClasses[headline.tone];
  const symptoms = getPrimarySymptoms(plague).slice(0, plague.state === AgentState.HEALTHY ? 2 : 3);
  const protections = getProtectionSummaries(activeEffects, simTime);
  const recentEntry = recentConditionLog[0];
  const suggestion = getConditionSuggestion(plague, activeEffects, currentTaskTitle);
  const protectionSummary = protections.slice(0, 2).join(' • ');
  const consultationPrompts = plague.state === AgentState.HEALTHY
    ? [
        'Where would I find an apothecary?',
        'What should I keep watch for?'
      ]
    : [
        'How am I feeling right now?',
        'Where is the nearest apothecary?'
      ];

  return (
    <div className={`w-full md:w-[420px] rounded-[1.2rem] border ${tone.border} ${tone.glow} bg-[linear-gradient(180deg,rgba(10,10,10,0.9),rgba(20,12,6,0.82))] backdrop-blur-xl overflow-hidden`}>
      <div className="border-b border-white/6 px-4 py-3 md:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-amber-300/55">Condition</div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className={`text-lg font-semibold ${tone.accent}`} style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                {headline.title}
              </h2>
              <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${tone.badge}`}>
                {plague.state === AgentState.HEALTHY ? 'well' : plague.state === AgentState.INCUBATING ? 'exposed' : 'sick'}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-amber-50/68">{headline.detail}</p>
          </div>
          <button
            onClick={onOpenHealth}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs uppercase tracking-[0.2em] text-amber-100/78 transition-colors hover:bg-white/[0.08]"
            title="Open body dossier"
          >
            <Cross size={14} />
            Body
          </button>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3 md:px-5 md:py-4">
        <div className="rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(68,35,13,0.26),rgba(10,10,10,0.2))] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {symptoms.map((symptom) => (
              <span
                key={symptom}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-amber-50/76"
              >
                {symptom}
              </span>
            ))}
          </div>
          <div className="mt-2 text-sm leading-relaxed text-amber-50/68">
            {getConditionCourse(plague)}
          </div>
          {protectionSummary && (
            <div className="mt-2 text-[11px] leading-relaxed text-amber-200/62">
              Protective measures in effect: {protectionSummary}
            </div>
          )}
          {currentTaskTitle && (
            <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-amber-300/58">
              Immediate need: {currentTaskTitle}
            </div>
          )}
          <div className="mt-2 text-sm leading-relaxed text-amber-50/82">
            {suggestion}
          </div>
          {recentEntry && (
            <div className="mt-2 border-t border-white/8 pt-2 text-[12px] leading-relaxed text-amber-50/62">
              <span className="uppercase tracking-[0.22em] text-amber-300/52">Last tried</span>
              <span className="ml-2 text-amber-50/74">{recentEntry.title}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {consultationPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onAskNarrator(prompt)}
              className="rounded-full border border-amber-400/18 bg-black/18 px-3 py-1.5 text-[11px] text-amber-50/74 transition-colors hover:bg-black/28 hover:text-amber-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAskNarrator('How am I feeling right now?')}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-amber-50/84 transition-colors hover:bg-white/[0.08]"
          >
            <BookOpenText size={16} />
            Ask the narrator
          </button>
          <button
            onClick={onOpenInventory}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-amber-50/84 transition-colors hover:bg-white/[0.08]"
          >
            <FlaskConical size={16} />
            Open satchel
          </button>
        </div>
      </div>
    </div>
  );
};
