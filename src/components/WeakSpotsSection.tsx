import React from 'react';
import { AlertCircle, Target, Award, ArrowRight } from 'lucide-react';
import { Kit } from '../core/types';
import { PracticeStats } from '../core/practice';

interface WeakSpotsSectionProps {
  kit: Kit;
  stats: PracticeStats | null;
  onJumpToPractice: () => void;
}

export const WeakSpotsSection: React.FC<WeakSpotsSectionProps> = ({
  kit,
  stats,
  onJumpToPractice,
}) => {
  const weakReqs = stats?.requirementBreakdown?.filter(
    (r) => r.status === 'needs_work' || r.averageConfidence < 2
  ) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Diagnostic Telemetry
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Candidate Weak Spots & Targeted Intervention
            </h2>
            <p className="text-xs text-slate-500">
              Synthesized from active recall logs and coverage audit. Prioritize must-have requirements with low confidence scores.
            </p>
          </div>

          <button
            onClick={onJumpToPractice}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <span>Launch Focused Drill</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {weakReqs.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            <Award className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-800">No Critical Weak Spots Detected</p>
            <p className="mt-1">
              Complete review rounds in the Practice Arena to record candidate confidence ratings.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Priority Focus Areas ({weakReqs.length} requirements needing reinforcement)
            </h3>

            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {weakReqs.map((w) => (
                <div key={w.requirementId} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-slate-400 mt-0.5">{w.requirementId}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{w.requirementText}</p>
                      <span className={`text-[11px] font-medium ${w.priority === 'must' ? 'text-rose-600' : 'text-slate-500'}`}>
                        {w.priority === 'must' ? 'Mandatory Must-Have' : 'Nice-to-Have'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-amber-600">
                      Avg: {w.averageConfidence || 'Unreviewed'} / 3.0
                    </div>
                    <span className="text-[10px] text-slate-400">{w.totalCards} cards available</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested 30-min drill */}
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Recommended 30-Minute High-Yield Study Drill:
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-indigo-950">
                <li>1. 10m: Review Flashcards for <strong>{weakReqs[0]?.requirementId || 'r1'}</strong> in the Practice Arena.</li>
                <li>2. 15m: Rehearse a mock interview answer addressing core trade-offs and edge-cases.</li>
                <li>3. 5m: Re-rate flashcard confidence to lock in spaced repetition schedule.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
