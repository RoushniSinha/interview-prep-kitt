import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { Kit } from '../core/types';

interface CoverageSectionProps {
  kit: Kit;
}

export const CoverageSection: React.FC<CoverageSectionProps> = ({ kit }) => {
  const uncoveredSet = new Set(kit.coverage.uncovered_requirement_ids || []);

  const mustRequirements = kit.role.requirements.filter((r) => r.priority === 'must');
  const niceRequirements = kit.role.requirements.filter((r) => r.priority === 'nice');

  const coveredMustsCount = mustRequirements.filter((r) => !uncoveredSet.has(r.id)).length;
  const coveragePercent =
    mustRequirements.length === 0
      ? 100
      : Math.round((coveredMustsCount / mustRequirements.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header Metric Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Deterministic Verification Engine
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Must-Have Requirement Coverage ({coveragePercent}%)
            </h2>
            <p className="text-xs text-slate-500">
              Evaluated strictly with set arithmetic: all 'must' requirements must be mapped to valid questions.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400">Coverage Passes:</span>{' '}
              <strong className="text-slate-900 font-mono">
                {kit.coverage.passes} {kit.coverage.passes > 1 ? '(Pass 2 Closed Gaps)' : '(Pass 1)'}
              </strong>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              {coveragePercent === 100 ? (
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              )}
            </div>
          </div>
        </div>

        {/* Uncovered Warning Alert if any */}
        {uncoveredSet.size > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Uncovered Must-Have Requirements Detected:</span>
            </div>
            <p className="mt-1">
              The following required competencies currently lack targeted questions:{' '}
              <strong>{Array.from(uncoveredSet).join(', ')}</strong>.
            </p>
          </div>
        )}

        {/* Requirements Coverage Matrix */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Requirement Mapping Matrix
          </h3>
          <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {kit.role.requirements.map((req) => {
              const isUncovered = uncoveredSet.has(req.id);
              const coveringQuestions = kit.questions.filter((q) =>
                q.requirement_ids.includes(req.id)
              );

              return (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="flex items-start gap-3 max-w-xl">
                    <span className="font-mono font-bold text-slate-500 mt-0.5">{req.id}</span>
                    <div>
                      <p className="font-medium text-slate-800">{req.text}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="capitalize">{req.kind}</span>
                        <span>·</span>
                        <span className={req.priority === 'must' ? 'font-semibold text-rose-600' : 'text-slate-500'}>
                          {req.priority === 'must' ? 'Mandatory Must-Have' : 'Nice-to-Have'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {coveringQuestions.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">
                          {coveringQuestions.length} Question(s)
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          ({coveringQuestions.map((q) => q.id).join(', ')})
                        </span>
                      </div>
                    ) : req.priority === 'must' ? (
                      <span className="flex items-center gap-1 font-semibold text-rose-600">
                        <AlertTriangle className="h-4 w-4" /> Uncovered Must
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Optional (Nice-to-Have)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
