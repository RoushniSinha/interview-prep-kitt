import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  X,
  User,
  Building2,
  Calendar,
  Layers,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Kit, StoredKit } from '../core/types';
import { downloadKitPdf, generateKitPdf, PdfExportOptions } from '../services/pdfExportService';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: Kit;
  storedKit?: StoredKit | null;
  userEmail?: string;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  kit,
  storedKit,
  userEmail = 'candidate@interviewkit.io',
}) => {
  // Candidate Profile Customizations
  const [candidateName, setCandidateName] = useState('Alex Rivera');
  const [candidateEmail, setCandidateEmail] = useState(userEmail);
  const [candidatePhone, setCandidatePhone] = useState('+1 (555) 329-8401');
  const [candidateLocation, setCandidateLocation] = useState(kit.source.location || 'San Francisco, CA');

  // Section Inclusions
  const [includeResume, setIncludeResume] = useState(true);
  const [includeBrief, setIncludeBrief] = useState(true);
  const [includeRequirements, setIncludeRequirements] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);

  // Status feedback
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'resume' | 'summary' | 'schedule'>('resume');

  if (!isOpen) return null;

  const exportOptions: PdfExportOptions = {
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLocation,
    includeResumeSection: includeResume,
    includeCompanyBrief: includeBrief,
    includeRequirements,
    includeQuestions,
    includeSchedule,
    includeFlashcards,
  };

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      downloadKitPdf(kit, storedKit, exportOptions);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    // Generate PDF blob and open print preview safely
    try {
      const doc = generateKitPdf(kit, storedKit, exportOptions);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch (err) {
      console.error('Print preview failed:', err);
    }
  };

  const handleCopyMarkdown = () => {
    let md = `# ${candidateName} — Targeted Executive Resume & Interview Preparation Summary\n`;
    md += `**Email:** ${candidateEmail} | **Phone:** ${candidatePhone} | **Location:** ${candidateLocation}\n`;
    md += `**Target Role:** ${kit.role.title} (${kit.role.seniority}) at ${kit.source.company}\n\n`;

    if (includeResume) {
      md += `## 1. Targeted Executive Profile\n`;
      md += `Experienced ${kit.role.seniority} engineer aligned with ${kit.source.company}. Proven track record in scalable systems, distributed consensus, and rapid product execution.\n\n`;
      md += `### Core Competencies\n`;
      kit.role.requirements.forEach((r) => {
        md += `- **[${r.priority.toUpperCase()}]** ${r.text} (${r.kind})\n`;
      });
      md += `\n`;
    }

    if (includeBrief) {
      md += `## 2. Company Research & Intelligence\n`;
      md += `**Summary:** ${kit.company_brief.summary}\n\n`;
      md += `**What They Do:** ${kit.company_brief.what_they_do}\n\n`;
    }

    if (includeSchedule) {
      md += `## 3. Deterministic Study Schedule (${kit.schedule.days_available} Days)\n`;
      kit.schedule.days.forEach((d) => {
        md += `- **Day ${d.day}:** ${d.focus} (${d.minutes} mins) — ${d.question_ids.length} questions\n`;
      });
      md += `\n`;
    }

    if (includeQuestions) {
      md += `## 4. Curated Interview Questions\n`;
      kit.questions.forEach((q, i) => {
        md += `### Q${i + 1} (${q.category.toUpperCase()}, Difficulty ${q.difficulty}/3)\n`;
        md += `**Prompt:** ${q.prompt}\n`;
        md += `**Outline:** ${q.answer_outline}\n\n`;
      });
    }

    navigator.clipboard.writeText(md).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Export Formatted PDF Resume & Prep Kit
              </h2>
              <p className="text-xs text-slate-500">
                Generate an executive publication-grade document for {kit.role.title} at {kit.source.company}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Customization Controls */}
          <div className="md:col-span-5 border-r border-slate-200 p-6 space-y-6 bg-slate-50/40">
            {/* Candidate Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Candidate Header Details
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Full Name / Title
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none"
                  placeholder="e.g. Alex Rivera"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={candidateLocation}
                  onChange={(e) => setCandidateLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Document Sections Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document Sections to Include
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeResume}
                    onChange={(e) => setIncludeResume(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>1. Tailored Executive Resume & Role Fit</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBrief}
                    onChange={(e) => setIncludeBrief(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>2. Company Intelligence & Strategic Brief</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRequirements}
                    onChange={(e) => setIncludeRequirements(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>3. Requirements Evaluation Matrix ({kit.role.requirements.length})</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSchedule}
                    onChange={(e) => setIncludeSchedule(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>4. Deterministic Study Schedule ({kit.schedule.days_available} days)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQuestions}
                    onChange={(e) => setIncludeQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>5. High-Yield Question Bank ({kit.questions.length})</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFlashcards}
                    onChange={(e) => setIncludeFlashcards(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>6. Active Recall Flashcards ({kit.flashcards.length})</span>
                </label>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Target Seniority:</span>
                <span className="font-semibold text-slate-800">{kit.role.seniority}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Study Duration:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {kit.schedule.days.reduce((acc, d) => acc + d.minutes, 0)} mins
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Must-Have Criteria:</span>
                <span className="font-semibold text-emerald-700">
                  {kit.role.requirements.filter((r) => r.priority === 'must').length} covered
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Document Preview */}
          <div className="md:col-span-7 p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  onClick={() => setActivePreviewTab('resume')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePreviewTab === 'resume'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Resume Profile
                </button>
                <button
                  onClick={() => setActivePreviewTab('summary')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePreviewTab === 'summary'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Brief & Intel
                </button>
                <button
                  onClick={() => setActivePreviewTab('schedule')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePreviewTab === 'schedule'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Study Schedule
                </button>
              </div>

              <span className="text-[11px] text-slate-400">Standard A4 Layout · Vector PDF</span>
            </div>

            {/* Simulated PDF Paper Canvas */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-inner text-slate-800 text-xs min-h-[380px] max-h-[460px] overflow-y-auto font-sans">
              {/* Paper Header */}
              <div className="border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900">{candidateName}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {candidateEmail} · {candidatePhone} · {candidateLocation}
                </p>
                <p className="text-[11px] font-medium text-indigo-700 mt-1">
                  Candidate for: {kit.role.title} at {kit.source.company}
                </p>
              </div>

              {activePreviewTab === 'resume' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-indigo-200 pb-1 mb-2">
                      Targeted Executive Profile
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11.5px]">
                      Accomplished {kit.role.seniority} engineer equipped with verified competencies matching {kit.source.company}&apos;s mission. Demonstrated track record in high-velocity software engineering, robust API development, and distributed computing.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                    <p className="font-semibold text-indigo-900 text-[11px]">Core Competencies Alignment:</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                      <li>
                        <strong>Technical:</strong>{' '}
                        {kit.role.requirements.filter((r) => r.kind === 'technical').map((r) => r.text).slice(0, 3).join(', ')}
                      </li>
                      <li>
                        <strong>Leadership:</strong>{' '}
                        {kit.role.requirements.filter((r) => r.kind === 'behavioural').map((r) => r.text).slice(0, 2).join(', ') || 'Cross-functional engineering mentorship and technical delivery'}
                      </li>
                    </ul>
                  </div>

                  {kit.role.responsibilities.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1 mb-2">
                        Target Responsibilities
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                        {kit.role.responsibilities.slice(0, 4).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activePreviewTab === 'summary' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-indigo-200 pb-1 mb-2">
                      Company Strategic Intelligence
                    </h4>
                    <p className="text-slate-700 leading-relaxed text-[11.5px]">
                      {kit.company_brief.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1 mb-2">
                      What They Do & Engineering Culture
                    </h4>
                    <p className="text-slate-700 leading-relaxed text-[11.5px]">
                      {kit.company_brief.what_they_do}
                    </p>
                  </div>

                  {kit.company_brief.sources.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-500 text-[10.5px]">Verified Grounding Sources:</p>
                      <ul className="list-disc pl-4 text-slate-500 text-[10.5px]">
                        {kit.company_brief.sources.slice(0, 3).map((s, i) => (
                          <li key={i} className="truncate">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activePreviewTab === 'schedule' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-indigo-200 pb-1 mb-2">
                    {kit.schedule.days_available}-Day Deterministic Study Allocation
                  </h4>
                  <div className="space-y-2">
                    {kit.schedule.days.map((d) => (
                      <div
                        key={d.day}
                        className="flex items-center justify-between border-b border-slate-200 pb-2 text-[11.5px]"
                      >
                        <div>
                          <span className="font-bold text-slate-900 mr-2">Day {d.day}:</span>
                          <span className="text-slate-700">{d.focus}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-indigo-700 font-semibold">{d.minutes}m</span>
                          <span className="text-slate-400">({d.question_ids.length} Qs)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              title="Copy markdown text for Notion / Obsidian"
            >
              {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              title="Open browser print dialog"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print Preview</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition active:scale-98 disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-indigo-400" />
              <span>{isGenerating ? 'Synthesizing PDF...' : 'Download Formatted PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
