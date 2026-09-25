import React, { useState } from 'react';
import { X, Sparkles, Building2, Calendar, FileText, ArrowRight } from 'lucide-react';

interface NewKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jd: string, companyUrl: string, days: number) => void;
  isLoading: boolean;
}

const SAMPLE_PRESETS = [
  {
    name: 'Stripe — Staff Infrastructure',
    companyUrl: 'https://stripe.com',
    days: 7,
    jd: `Staff Infrastructure Engineer, Global Payments.
Requirements:
- Must have 8+ years experience designing high-throughput distributed systems in Go or Java.
- Must have proven mastery of database internals, consensus protocols (Raft, Paxos), and transactional integrity.
- Must demonstrate experience with zero-downtime database migrations under high write load.
- Nice to have experience with AWS or cloud networking primitives.
- Nice to have contributions to open-source distributed storage or database tooling.
Responsibilities:
- Lead the architecture of Stripe's multi-region transaction ledger.
- Partner with security and reliability teams to guarantee 99.999% availability.
- Mentor senior engineers and drive infrastructure architectural reviews.`,
  },
  {
    name: 'Vercel — Senior Full-Stack Next.js',
    companyUrl: 'https://vercel.com',
    days: 5,
    jd: `Senior Full-Stack Engineer, Frontend Cloud Platforms.
Must have deep technical mastery of React 19, Next.js App Router, and TypeScript.
Must have extensive experience profiling edge compute runtimes, web vitals, and streaming SSR.
Must have strong cross-functional communication and ability to work asynchronously.
Bonus: Experience with Rust, Turbopack, or WebAssembly.
Bonus: Experience with edge cache invalidation strategies and CDN architecture.`,
  },
  {
    name: 'Thin 2-Line JD (Edge Case Test)',
    companyUrl: '',
    days: 3,
    jd: `Junior Python Developer needed for automation scripts and data ingestion. Must know Django and basic SQL.`,
  },
];

export const NewKitModal: React.FC<NewKitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim()) return;
    onSubmit(jd.trim(), companyUrl.trim(), days);
  };

  const loadPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setJd(preset.jd);
    setCompanyUrl(preset.companyUrl);
    setDays(preset.days);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generate New Prep Kit</h2>
            <p className="text-xs text-slate-500">
              Autonomous company intelligence, requirement extraction & deterministic scheduling.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="mt-3">
          <span className="text-xs font-medium text-slate-500">Quick Test Presets:</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => loadPreset(p)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Job Description (JD) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={7}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the raw job description, requirements, or responsibilities..."
              className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>{jd.length} characters</span>
              <span>Requirements will be extracted into stable IDs with priority tags</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Company Website URL (Optional)
              </label>
              <div className="relative mt-1.5">
                <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Shallow crawl for handbook, culture & hiring pages (SSRF protected)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Days Until Interview
              </label>
              <div className="relative mt-1.5">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Deterministic integer-minute bin packing across exactly {days} day(s)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !jd.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Enqueuing...</span>
                </>
              ) : (
                <>
                  <span>Synthesize Prep Kit</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
