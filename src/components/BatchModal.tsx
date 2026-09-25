import React, { useState, useMemo } from 'react';
import {
  X,
  Terminal,
  Download,
  Copy,
  Check,
  Play,
  FileJson,
  Link,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Code2,
  ExternalLink,
  RotateCcw,
  Layers,
  FolderGit2,
  Database,
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { BatchCase, BatchCaseSchema, StoredKit, Kit } from '../core/types';
import {
  convertTextAndLinkToBatchCase,
  deriveCaseId,
  normalizeCompanyUrl,
  formatBatchCasesJson,
  generateCliCommand,
  convertStoredKitsToBatchCases,
} from '../core/batchConverter';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  kits?: StoredKit[];
}

const SAMPLE_BATCH_INPUT = `[
  {
    "id": "stripe_infra",
    "jd": "Staff Infrastructure Engineer. Must know Go, distributed consensus, and multi-region replication. Preferred: Raft or Paxos experience.",
    "company_url": "https://stripe.com",
    "days": 5
  },
  {
    "id": "thin_python",
    "jd": "Python Developer needed. Must know Django.",
    "company_url": "",
    "days": 2
  }
]`;

export const BatchModal: React.FC<BatchModalProps> = ({ isOpen, onClose, kits = [] }) => {
  const [activeTab, setActiveTab] = useState<'converter' | 'my_kits' | 'runner'>('converter');

  // Converter inputs
  const [inputUrl, setInputUrl] = useState('https://stripe.com');
  const [inputText, setInputText] = useState(
    'Staff Distributed Systems Engineer. Lead high-throughput payment routing, consensus protocols, and idempotent settlement pipelines. Experience with Go, Raft/Paxos, and zero-downtime database migrations required.'
  );
  const [inputCustomId, setInputCustomId] = useState('');
  const [inputDays, setInputDays] = useState(7);

  // Multi-case queue in converter
  const [caseQueue, setCaseQueue] = useState<BatchCase[]>([
    {
      id: 'stripe_distributed_systems',
      company_url: 'https://stripe.com',
      jd: 'Staff Distributed Systems Engineer. Lead high-throughput payment routing, consensus protocols, and idempotent settlement pipelines. Experience with Go, Raft/Paxos, and zero-downtime database migrations required.',
      days: 7,
    },
  ]);

  // Evaluator runner state
  const [jsonInput, setJsonInput] = useState(SAMPLE_BATCH_INPUT);
  const [isRunning, setIsRunning] = useState(false);
  const [outputJson, setOutputJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'json' | 'cli' | 'output' | 'my_kits_json' | 'my_kits_cli' | null>(null);

  // My Kits tab format mode: 'batch_cases' | 'full_kits'
  const [myKitsFormat, setMyKitsFormat] = useState<'batch_cases' | 'full_kits'>('batch_cases');

  // Derive BatchCases from user stored kits
  const myKitsBatchCases = useMemo(() => {
    return convertStoredKitsToBatchCases(kits);
  }, [kits]);

  // Extract full kits snapshot
  const myKitsFullSnapshot = useMemo(() => {
    return kits
      .filter((k) => k.kit)
      .map((k) => ({
        id: k._id,
        source: {
          company: k.source.company,
          company_url: normalizeCompanyUrl(k.source.company_url || ''),
          role: k.source.role,
          days: k.source.days,
          jd: k.source.jd,
        },
        kit: k.kit,
      }));
  }, [kits]);

  const activeMyKitsJson = useMemo(() => {
    if (myKitsFormat === 'batch_cases') {
      return JSON.stringify(myKitsBatchCases, null, 2);
    }
    return JSON.stringify(myKitsFullSnapshot, null, 2);
  }, [myKitsFormat, myKitsBatchCases, myKitsFullSnapshot]);

  if (!isOpen) return null;

  // Derive live preview for current converter input
  const currentDerivedId = deriveCaseId(inputCustomId, inputUrl, inputText);
  const currentPreviewCase: BatchCase = {
    id: currentDerivedId,
    jd: inputText.trim(),
    company_url: normalizeCompanyUrl(inputUrl),
    days: inputDays,
  };

  const handleAddCaseToQueue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const newCase = convertTextAndLinkToBatchCase({
        id: inputCustomId.trim() || undefined,
        jd: inputText.trim(),
        company_url: inputUrl.trim(),
        days: inputDays,
      });

      setCaseQueue((prev) => [...prev, newCase]);
      // Reset inputs for next case
      setInputText('');
      setInputUrl('');
      setInputCustomId('');
      setInputDays(7);
    } catch (err: any) {
      setError(`Validation Error: ${err.message}`);
    }
  };

  const handleRemoveCase = (index: number) => {
    setCaseQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const currentBatchJson =
    caseQueue.length > 0
      ? formatBatchCasesJson(caseQueue)
      : formatBatchCasesJson([currentPreviewCase]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(currentBatchJson);
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCliCommand = () => {
    const cmd = generateCliCommand('cases.json', 'kits.json');
    navigator.clipboard.writeText(cmd);
    setCopiedType('cli');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCasesJson = () => {
    const blob = new Blob([currentBatchJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cases.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToWebRunner = (customJson?: string) => {
    setJsonInput(customJson || currentBatchJson);
    setActiveTab('runner');
  };

  // Actions for My Kits Bulk Export
  const handleCopyMyKitsJson = () => {
    navigator.clipboard.writeText(activeMyKitsJson);
    setCopiedType('my_kits_json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMyKitsCliCommand = () => {
    const cmd = generateCliCommand('my_kits_batch.json', 'evaluated_kits.json');
    navigator.clipboard.writeText(cmd);
    setCopiedType('my_kits_cli');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadMyKitsJson = () => {
    const blob = new Blob([activeMyKitsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = myKitsFormat === 'batch_cases' ? `my_kits_batch.json` : `my_kits_full_dump.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunBatch = async () => {
    setError(null);
    setOutputJson(null);

    let parsedCases;
    try {
      parsedCases = JSON.parse(jsonInput);
      if (!Array.isArray(parsedCases)) {
        throw new Error('Input JSON must be an array of cases: [{ id, jd, company_url, days }]');
      }
    } catch (err: any) {
      setError(`JSON Syntax Error: ${err.message}`);
      return;
    }

    setIsRunning(true);

    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: parsedCases }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Batch evaluation failed');
      }

      setOutputJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || 'Batch run failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyOutput = () => {
    if (!outputJson) return;
    navigator.clipboard.writeText(outputJson);
    setCopiedType('output');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadOutput = () => {
    if (!outputJson) return;
    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_kits_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Terminal className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Batch CLI Automation & Evaluator (Appendix B)
                </h3>
                <span className="rounded bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700">
                  CLI & CI/CD Compatible
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bulk export interview kits, normalize web links, and generate structured JSON payloads for automated CLI evaluation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-2">
          {/* TAB 1: CONVERTER */}
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'converter'
                ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Text & Link to CLI JSON</span>
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] text-indigo-800">
              {caseQueue.length}
            </span>
          </button>

          {/* TAB 2: MY KITS EXPORT */}
          <button
            onClick={() => setActiveTab('my_kits')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'my_kits'
                ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Export All My Kits for Batch CLI</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
              {kits.length} Kits
            </span>
          </button>

          {/* TAB 3: RUNNER */}
          <button
            onClick={() => setActiveTab('runner')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'runner'
                ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Batch CLI Test Harness Runner</span>
          </button>
        </div>

        {/* TAB 1: TEXT & LINK CONVERTER */}
        {activeTab === 'converter' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Input Form - 6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Input Job Details & Link</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputUrl('https://github.com');
                        setInputText(
                          'Senior Site Reliability Engineer. Manage Kubernetes multi-cluster, Terraform infrastructure-as-code, and 99.99% availability SLAs for global developer platforms.'
                        );
                        setInputCustomId('github_sre');
                        setInputDays(5);
                      }}
                      className="text-[11px] font-medium text-indigo-600 hover:underline"
                    >
                      Fill Sample
                    </button>
                  </div>

                  {/* Link Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Link className="h-3 w-3 text-slate-500" />
                        <span>Company Website or Job Posting Link:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Auto-normalizes URL</span>
                    </label>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="e.g. https://stripe.com or company.com/jobs/123"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  {/* Text Description / JD */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Job Description / Role Requirements Text:
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {inputText.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste any job description, bulleted responsibilities, or technical requirements here..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  {/* ID & Days */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Case ID (Optional):
                      </label>
                      <input
                        type="text"
                        value={inputCustomId}
                        onChange={(e) => setInputCustomId(e.target.value)}
                        placeholder={`e.g. ${currentDerivedId}`}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preparation Days (1-90):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={inputDays}
                        onChange={(e) => setInputDays(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  {/* Add to Queue Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={!inputText.trim()}
                      onClick={() => handleAddCaseToQueue()}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-40 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Case to Batch Queue ({caseQueue.length} queued)</span>
                    </button>
                  </div>
                </div>

                {/* Queue Summary Chips */}
                {caseQueue.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Queued Batch Cases ({caseQueue.length})</span>
                      <button
                        type="button"
                        onClick={() => setCaseQueue([])}
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {caseQueue.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 truncate">
                              {item.id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              ({item.company_url || 'no link'} · {item.days}d)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCase(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Generated JSON & CLI Export - 6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Code2 className="h-4 w-4 text-indigo-400" />
                      <span>Conforming Batch JSON (cases.json)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition"
                      >
                        {copiedType === 'json' ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCasesJson}
                        className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 transition"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Formatted Code Display */}
                  <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-900/90 p-3 font-mono text-[11px] text-emerald-300 leading-relaxed border border-slate-800/80">
                    {currentBatchJson}
                  </pre>

                  {/* Ready-to-use CLI Execution Snippet */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Run directly in terminal CLI:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCliCommand}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {copiedType === 'cli' ? (
                          <span className="text-emerald-400 font-bold">Copied command!</span>
                        ) : (
                          <span>Copy Command</span>
                        )}
                      </button>
                    </div>
                    <code className="block rounded bg-black/50 p-2 font-mono text-[10px] text-slate-300 select-all">
                      npm run evaluate -- --input cases.json --output kits.json
                    </code>
                  </div>
                </div>

                {/* Transfer to Web Runner CTA */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Want to run this batch right in the browser?
                    </span>
                    <span className="text-[11px] text-indigo-700">
                      Executes the identical multi-step pipeline without opening terminal.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendToWebRunner(currentBatchJson)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
                  >
                    <span>Run in Web Harness</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPORT ALL MY KITS FOR BATCH CLI */}
        {activeTab === 'my_kits' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Action Bar & Metrics */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-indigo-600" />
                    <span>All Interview Kits Bulk Export</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                      {kits.length} Kits Staged
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-formatted JSON data structure containing all your saved interview kits, job descriptions, and source URLs.
                  </p>
                </div>

                {/* Format Toggle */}
                <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMyKitsFormat('batch_cases')}
                    className={`rounded-md px-3 py-1 transition ${
                      myKitsFormat === 'batch_cases'
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Batch CLI Format (cases.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMyKitsFormat('full_kits')}
                    className={`rounded-md px-3 py-1 transition ${
                      myKitsFormat === 'full_kits'
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Kits Dump (kits.json)
                  </button>
                </div>
              </div>

              {/* Summary Badges */}
              <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Saved Kits</span>
                  <strong className="text-base font-extrabold text-slate-900">{kits.length}</strong>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Verified Source URLs</span>
                  <strong className="text-base font-extrabold text-indigo-600">
                    {kits.filter((k) => k.source?.company_url).length} / {kits.length}
                  </strong>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Questions</span>
                  <strong className="text-base font-extrabold text-emerald-600">
                    {kits.reduce((acc, k) => acc + (k.kit?.questions?.length || 0), 0)}
                  </strong>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Flashcards</span>
                  <strong className="text-base font-extrabold text-amber-600">
                    {kits.reduce((acc, k) => acc + (k.kit?.flashcards?.length || 0), 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Split View: Left is JSON preview with Copy/Download; Right is Kit Inventory List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Formatted JSON Export Box - 7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Code2 className="h-4 w-4 text-emerald-400" />
                      <span>
                        {myKitsFormat === 'batch_cases'
                          ? 'Pre-Formatted BatchCase Array (cases.json)'
                          : 'Complete Kit Payloads Array (kits.json)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyMyKitsJson}
                        className="flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                      >
                        {copiedType === 'my_kits_json' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied JSON!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Batch JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMyKitsJson}
                        className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Pre block */}
                  <pre className="max-h-80 overflow-y-auto rounded-lg bg-slate-900/90 p-3 font-mono text-[11px] text-emerald-300 leading-relaxed border border-slate-800/80">
                    {activeMyKitsJson}
                  </pre>

                  {/* Quick Action Commands */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Run all my kits with Batch CLI:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyMyKitsCliCommand}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {copiedType === 'my_kits_cli' ? (
                          <span className="text-emerald-400 font-bold">Copied command!</span>
                        ) : (
                          <span>Copy Terminal Command</span>
                        )}
                      </button>
                    </div>
                    <code className="block rounded bg-black/50 p-2 font-mono text-[10px] text-slate-300 select-all">
                      npm run evaluate -- --input my_kits_batch.json --output evaluated_kits.json
                    </code>
                  </div>
                </div>

                {/* Transfer to Web Runner */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Run all {kits.length} kits in the Browser Test Harness
                    </span>
                    <span className="text-[11px] text-indigo-700">
                      Transfers the pre-formatted JSON directly into the web runner with 1-click.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendToWebRunner(JSON.stringify(myKitsBatchCases, null, 2))}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
                  >
                    <span>Load Into Runner</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column (Kit Inventory List - 5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Included Kit Sources ({kits.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">100% Appendix B Conforming</span>
                </div>

                {kits.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                    No interview kits saved yet. Create a kit or use the Text & Link converter!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {kits.map((item, idx) => {
                      const company = item.source?.company || item.kit?.source?.company || 'Company';
                      const role = item.source?.role || item.kit?.role?.title || 'Role';
                      const url = item.source?.company_url || item.kit?.source?.company_url || '';
                      const days = item.source?.days || item.kit?.schedule?.days_available || 7;
                      const qCount = item.kit?.questions?.length || 0;
                      const fCount = item.kit?.flashcards?.length || 0;

                      return (
                        <div
                          key={item._id || idx}
                          className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs hover:border-indigo-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">{company}</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-600 font-medium">{role}</span>
                              </div>
                              <span className="font-mono text-[10px] text-indigo-600 block mt-0.5">
                                ID: {deriveCaseId(`${company}_${role}`, url, item.source?.jd)}
                              </span>
                            </div>

                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                              {days}d prep
                            </span>
                          </div>

                          {/* Source URL display */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Link className="h-3 w-3 text-slate-400 shrink-0" />
                            {url ? (
                              <a
                                href={normalizeCompanyUrl(url)}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate hover:text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                <span>{url}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="italic text-slate-400">No company URL (direct JD only)</span>
                            )}
                          </div>

                          {/* Stats footer */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                            <span>{qCount} Questions · {fCount} Flashcards</span>
                            <span className="text-emerald-600 font-medium">Ready for Batch CLI</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BATCH EVALUATOR WEB RUNNER */}
        {activeTab === 'runner' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Input Cases Array JSON (Appendix B Schema):
                </label>
                <div className="flex items-center gap-3">
                  {kits.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setJsonInput(JSON.stringify(myKitsBatchCases, null, 2))}
                      className="text-xs text-emerald-600 hover:underline font-semibold"
                    >
                      Paste All My Kits ({kits.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setJsonInput(SAMPLE_BATCH_INPUT)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Reset to Sample Cases
                  </button>
                </div>
              </div>
              <textarea
                rows={8}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="mt-1.5 w-full font-mono text-xs rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {outputJson && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Output Ready (Appendix B Compliant)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyOutput}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      {copiedType === 'output' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedType === 'output' ? 'Copied' : 'Copy Output'}</span>
                    </button>
                    <button
                      onClick={handleDownloadOutput}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>
                <pre className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-100 font-mono">
                  {outputJson}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunBatch}
                disabled={isRunning || !jsonInput.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {isRunning ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Running Batch Cases...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Execute Batch Evaluation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>Terminal CLI:</span>
            <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800">
              npm run evaluate -- --input cases.json --output kits.json
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
