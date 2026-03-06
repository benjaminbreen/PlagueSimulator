import React from 'react';
import { BookOpenText, Cross, FlaskConical, MapPin, RotateCcw, ScrollText, Users } from 'lucide-react';
import { GameOverSummary } from '../utils/gameOverSummary';

interface GameOverPanelProps {
  summary: GameOverSummary;
  onRestart: () => void;
}

const toneClasses: Record<NonNullable<GameOverSummary['metrics'][number]['tone']>, string> = {
  neutral: 'border-white/10 bg-white/[0.03] text-amber-50/70',
  warning: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-100',
  danger: 'border-red-500/24 bg-red-500/[0.08] text-red-100',
  highlight: 'border-sky-500/18 bg-sky-500/[0.08] text-sky-100'
};

export const GameOverPanel: React.FC<GameOverPanelProps> = ({ summary, onRestart }) => {
  return (
    <div className="absolute inset-0 z-[200] bg-[radial-gradient(circle_at_top,rgba(120,24,24,0.22),transparent_42%),linear-gradient(180deg,rgba(7,7,7,0.96),rgba(18,10,8,0.98))] backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-5 md:px-8 md:py-8">
        <div className="relative max-h-[92vh] w-full overflow-hidden rounded-[2rem] border border-red-900/40 bg-[linear-gradient(180deg,rgba(18,12,10,0.98),rgba(11,11,11,0.96))] shadow-[0_25px_100px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(120,24,24,0.18),transparent)] pointer-events-none" />
          <div className="relative max-h-[92vh] overflow-y-auto p-5 md:p-8">
            <div className="flex flex-col gap-6 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="text-[11px] uppercase tracking-[0.34em] text-red-200/55">Final Reckoning</div>
                <h2 className="mt-2 text-3xl font-semibold text-red-100 md:text-5xl" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                  {summary.reason}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-amber-50/74 md:text-lg">
                  {summary.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-amber-100/76">
                    {summary.dateLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-amber-100/76">
                    {summary.locationLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-amber-100/76">
                    {summary.districtLabel}
                  </span>
                </div>
              </div>

              <button
                onClick={onRestart}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/28 bg-red-600/85 px-6 py-3 text-sm uppercase tracking-[0.24em] text-red-50 transition-all hover:bg-red-500"
              >
                <RotateCcw size={16} />
                Begin Anew
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
              <div className="grid gap-6">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5 md:p-6">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                    <ScrollText size={14} />
                    Historian's Debrief
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-amber-50/82 md:text-[15px]">
                    {summary.historianView}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                      <Cross size={14} />
                      Period Understanding
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-amber-50/74">
                      {summary.periodView}
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                      <MapPin size={14} />
                      City And Quarter
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-amber-50/74">
                      {summary.cityView}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                    <Users size={14} />
                    Household Consequence
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-amber-50/74">
                    {summary.householdView}
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5 md:p-6">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-amber-300/56">Session Snapshot</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {summary.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={`rounded-2xl border p-3 ${toneClasses[metric.tone ?? 'neutral']}`}
                      >
                        <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">{metric.label}</div>
                        <div className="mt-1 text-xl font-semibold">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                    <FlaskConical size={14} />
                    Remedies And Procedures
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-amber-50/74">
                    {summary.remedyView}
                  </p>
                  <div className="mt-4 space-y-3">
                    {summary.recentAttempts.length > 0 ? summary.recentAttempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                        <div className="text-sm font-medium text-amber-50/84">{attempt.title}</div>
                        <div className="mt-1 text-sm leading-relaxed text-amber-50/62">{attempt.detail}</div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-sm leading-relaxed text-amber-50/60">
                        No meaningful treatment or remedy attempt was recorded before the run ended.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-300/56">
                    <BookOpenText size={14} />
                    What This Run Teaches
                  </div>
                  <div className="mt-4 space-y-3">
                    {summary.lessons.map((lesson) => (
                      <div key={lesson} className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-sm leading-relaxed text-amber-50/74">
                        {lesson}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
