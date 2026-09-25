import React, { useState } from 'react';
import { ExternalLink, Edit2, Check, FileText, Download } from 'lucide-react';
import { Kit } from '../core/types';

interface CompanyBriefSectionProps {
  kit: Kit;
  onUpdateBrief: (summary: string, whatTheyDo: string) => void;
  isSaving?: boolean;
  onOpenExportPdf?: () => void;
}

export const CompanyBriefSection: React.FC<CompanyBriefSectionProps> = ({
  kit,
  onUpdateBrief,
  isSaving,
  onOpenExportPdf,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(kit.company_brief.summary);
  const [whatTheyDo, setWhatTheyDo] = useState(kit.company_brief.what_they_do);

  const handleSave = () => {
    onUpdateBrief(summary, whatTheyDo);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Formatted PDF Export Promo Card */}
      {onOpenExportPdf && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Formatted PDF Resume & Preparation Summary Document
              </h3>
              <p className="text-xs text-slate-600">
                Export an executive publication-grade document combining tailored career alignment, company intel, study schedule, and question bank.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenExportPdf}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition active:scale-98"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            <span>Export Formatted PDF</span>
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company Intelligence
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              {kit.source.company || 'Target Organization'} — Executive Brief
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Edit Brief</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {/* Executive Summary */}
          <div>
            <label className="text-xs font-medium text-slate-500">Synthesis Summary</label>
            {isEditing ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:border-slate-900 focus:outline-none"
              />
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{kit.company_brief.summary}</p>
            )}
          </div>

          {/* What They Do */}
          <div className="border-t border-slate-100 pt-4">
            <label className="text-xs font-medium text-slate-500">Core Mission & Technical Scope</label>
            {isEditing ? (
              <textarea
                value={whatTheyDo}
                onChange={(e) => setWhatTheyDo(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:border-slate-900 focus:outline-none"
              />
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{kit.company_brief.what_they_do}</p>
            )}
          </div>

          {/* Verification Pages Used */}
          <div className="border-t border-slate-100 pt-4">
            <label className="text-xs font-medium text-slate-500">
              Grounded Citation Sources ({kit.company_brief.sources.length})
            </label>
            {kit.company_brief.sources.length === 0 ? (
              <p className="mt-1.5 text-xs italic text-slate-400">
                No live web pages fetched (either URL was not supplied or was inaccessible). Brief synthesized purely from job description.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {kit.company_brief.sources.map((src, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-mono text-slate-400">[{idx + 1}]</span>
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 hover:underline transition truncate max-w-xl"
                    >
                      <span className="truncate">{src}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
