import React from 'react';
import { CheckCircle2, Circle, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface ProgressStepperProps {
  currentStage: string;
  progressPercent: number;
  message: string;
  error?: string;
  onRetry?: () => void;
}

const STAGES = [
  { id: 'parsing_jd', label: 'Parse Job Description & Extract Requirements' },
  { id: 'crawling_company', label: 'Company Research & Link Ranking (Defensive Crawler)' },
  { id: 'synthesizing_brief', label: 'Synthesize Grounded Company Intelligence' },
  { id: 'generating_questions', label: 'Generate Categorized Technical & Behavioural Questions' },
  { id: 'generating_flashcards', label: 'Generate Revision Flashcards' },
  { id: 'checking_coverage', label: 'Deterministic Coverage Audit (Pass 1)' },
  { id: 'gap_closing_pass', label: 'Second-Pass Targeted Gap Filling (Pass 2)' },
  { id: 'allocating_schedule', label: 'Deterministic Integer-Minute Schedule Bin Packing' },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStage,
  progressPercent,
  message,
  error,
  onRetry,
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Orchestration In Progress
          </span>
          <h3 className="text-base font-semibold text-slate-900">
            Synthesizing Autonomous Prep Kit
          </h3>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-slate-900">{progressPercent}%</span>
          <p className="text-xs text-slate-400">Non-blocking background pipeline</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all duration-500 ${
            error ? 'bg-rose-500' : 'bg-slate-900'
          }`}
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="italic">{message || 'Processing stage...'}</span>
        <span>{error ? 'Pipeline Halted' : 'Live State Sync'}</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Generation halted: {error}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-white hover:bg-rose-700 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Pipeline</span>
            </button>
          )}
        </div>
      )}

      {/* Stage Steps */}
      <div className="mt-6 space-y-3">
        {STAGES.map((s, idx) => {
          let status: 'completed' | 'current' | 'pending' = 'pending';
          if (progressPercent === 100 || idx < currentStageIndex) {
            status = 'completed';
          } else if (idx === currentStageIndex) {
            status = 'current';
          }

          return (
            <div key={s.id} className="flex items-center gap-3 text-xs">
              {status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : status === 'current' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
              <span
                className={`font-medium ${
                  status === 'completed'
                    ? 'text-slate-800'
                    : status === 'current'
                    ? 'font-semibold text-indigo-700'
                    : 'text-slate-400'
                }`}
              >
                0{idx + 1}. {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
