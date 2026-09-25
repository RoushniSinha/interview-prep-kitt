import React, { useState } from 'react';
import {
  Terminal,
  Code2,
  Copy,
  Check,
  FileCode,
  Download,
  ExternalLink,
  Workflow,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight,
  Database,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

export const CliDocumentationHub: React.FC = () => {
  const [activeRecipe, setActiveRecipe] = useState<'cli_extractor' | 'jq_scripts' | 'node_script' | 'github_actions'>('cli_extractor');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 via-white to-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <Terminal className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-800">
                APPENDIX B CLI HARNESS
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">Headless Bulk Automation</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
              CLI Documentation & Automated Result Extraction
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Use generated JSON files with the Batch CLI to evaluate prep kits in bulk and automatically extract interview questions, Anki flashcard decks, and coverage reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <code className="rounded-lg bg-slate-900 text-emerald-400 px-3 py-1.5 font-bold shadow-xs">
            npm run evaluate -- --input cases.json --output kits.json
          </code>
        </div>
      </div>

      {/* Step-by-Step Architectural Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
              STEP 1
            </span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Prepare Input JSON</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Generate <code className="text-indigo-600 font-mono">cases.json</code> via web Batch modal or <code className="text-indigo-600 font-mono">npm run create-case</code>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
              STEP 2
            </span>
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Execute Batch Evaluation</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Run the headless multi-step agent pipeline via <code className="text-indigo-600 font-mono">npm run evaluate</code>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
              STEP 3
            </span>
            <Database className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Inspect kits.json</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Conforming Appendix B output payload with full company briefs, questions, and flashcards.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="rounded bg-indigo-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-800">
              STEP 4
            </span>
            <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <h4 className="text-xs font-bold text-indigo-950">Automated Extraction</h4>
          <p className="text-[11px] text-indigo-700 leading-normal">
            Extract into Anki TSV flashcards, consolidated Markdown study books, or CSV spreadsheets.
          </p>
        </div>
      </div>

      {/* Recipe Selector Tab Strip */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveRecipe('cli_extractor')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeRecipe === 'cli_extractor'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>1. Automated Extractor CLI (`extract-results`)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRecipe('jq_scripts')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeRecipe === 'jq_scripts'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>2. One-Liner `jq` Recipes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRecipe('node_script')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeRecipe === 'node_script'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>3. Programmatic Node.js Pipeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRecipe('github_actions')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeRecipe === 'github_actions'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>4. CI/CD GitHub Actions</span>
            </button>
          </div>
        </div>

        {/* RECIPE 1: AUTOMATED EXTRACTOR CLI */}
        {activeRecipe === 'cli_extractor' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Built-In Multi-Target Extractor CLI</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 font-bold">
                      Zero Configuration
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The project includes a ready-to-run extraction script (<code className="font-mono text-indigo-600">scripts/extract-results.ts</code>) that automatically parses the generated <code className="font-mono text-indigo-600">kits.json</code> into structured outputs.
                  </p>
                </div>
              </div>

              {/* Extraction Commands Table */}
              <div className="space-y-2 pt-1">
                {/* Command 1: Extract All */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Export Everything (Questions TSV, Anki Deck, and Consolidated Markdown Study Guide):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard('npm run extract-results -- --input kits.json --format all --output ./extracted_kits/', 'cmd_all')
                      }
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      {copiedSnippet === 'cmd_all' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 font-mono text-[11px] text-emerald-300 select-all">
                    npm run extract-results -- --input kits.json --format all --output ./extracted_kits/
                  </code>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-0.5">
                    <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5">
                      ✓ <code className="font-mono">all_questions.tsv</code>
                    </span>
                    <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5">
                      ✓ <code className="font-mono">anki_flashcards.tsv</code>
                    </span>
                    <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5">
                      ✓ <code className="font-mono">study_guide.md</code>
                    </span>
                  </div>
                </div>

                {/* Command 2: Anki Only */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Export Directly into Anki TSV Spaced-Repetition Deck:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard('npm run extract-results -- --input kits.json --format anki --output flashcards.tsv', 'cmd_anki')
                      }
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      {copiedSnippet === 'cmd_anki' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 font-mono text-[11px] text-emerald-300 select-all">
                    npm run extract-results -- --input kits.json --format anki --output flashcards.tsv
                  </code>
                  <p className="text-[10px] text-slate-500">
                    Import in Anki: <strong>File → Import → select flashcards.tsv → Field separator: Tab</strong>. Cards include company & seniority tags automatically!
                  </p>
                </div>

                {/* Command 3: Questions Priority */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Filter High-Yield "Must-Have" Questions Only:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard('npm run extract-results -- --input kits.json --format questions --priority must --output must_questions.tsv', 'cmd_q')
                      }
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      {copiedSnippet === 'cmd_q' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 font-mono text-[11px] text-emerald-300 select-all">
                    npm run extract-results -- --input kits.json --format questions --priority must --output must_questions.tsv
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RECIPE 2: JQ ONE-LINERS */}
        {activeRecipe === 'jq_scripts' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Instant Shell Processing with `jq`
              </h4>
              <p className="text-xs text-slate-500">
                If you have <code className="font-mono text-indigo-600">jq</code> installed on Linux / macOS / WSL, extract specific subsets of data in milliseconds directly in bash pipelines.
              </p>

              {/* JQ 1: Questions */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-bold text-slate-200">
                    # 1. Extract all questions with company & category to TSV
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `jq -r '.kits[].kit | select(. != null) | .questions[] | "\\(.priority)\\t\\(.category)\\t\\(.text)"' kits.json > questions.tsv`,
                        'jq_q'
                      )
                    }
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedSnippet === 'jq_q' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSnippet === 'jq_q' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[11px] text-emerald-300 select-all leading-relaxed">
                  jq -r '.kits[].kit | select(. != null) | .questions[] | "\(.priority)\t\(.category)\t\(.text)"' kits.json &gt; questions.tsv
                </code>
              </div>

              {/* JQ 2: Flashcards */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-bold text-slate-200">
                    # 2. Extract Flashcards (Front &lt;TAB&gt; Back) for Anki
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `jq -r '.kits[].kit | select(. != null) | .flashcards[] | "\\(.front)\\t\\(.back)"' kits.json > anki_cards.tsv`,
                        'jq_anki'
                      )
                    }
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedSnippet === 'jq_anki' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSnippet === 'jq_anki' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[11px] text-emerald-300 select-all leading-relaxed">
                  jq -r '.kits[].kit | select(. != null) | .flashcards[] | "\(.front)\t\(.back)"' kits.json &gt; anki_cards.tsv
                </code>
              </div>

              {/* JQ 3: Role Requirements */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-bold text-slate-200">
                    # 3. Extract Role Requirements Audit Matrix
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `jq -r '.kits[].kit | select(. != null) | .role.requirements[] | "\\(.priority)\\t\\(.text)"' kits.json`,
                        'jq_req'
                      )
                    }
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedSnippet === 'jq_req' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSnippet === 'jq_req' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[11px] text-emerald-300 select-all leading-relaxed">
                  jq -r '.kits[].kit | select(. != null) | .role.requirements[] | "\(.priority)\t\(.text)"' kits.json
                </code>
              </div>
            </div>
          </div>
        )}

        {/* RECIPE 3: PROGRAMMATIC NODE.JS PIPELINE */}
        {activeRecipe === 'node_script' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Custom Node.js / TypeScript Extraction Script
                  </h4>
                  <p className="text-xs text-slate-500">
                    Drop this script into your own automation tooling to parse, filter, or sync prep kits into Postgres, Notion, or internal sheets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `import fs from 'fs';

// Read evaluated Batch CLI output
const data = JSON.parse(fs.readFileSync('kits.json', 'utf-8'));

for (const caseResult of data.kits) {
  if (caseResult.status !== 'ok') {
    console.error(\`Case \${caseResult.id} failed: \${caseResult.error?.message}\`);
    continue;
  }

  const { kit } = caseResult;
  console.log(\`=== \${kit.source.company} (\${kit.role.title}) ===\`);
  console.log(\`Company Mission: \${kit.company_brief.summary}\`);

  // Extract High-Priority Questions
  const mustQuestions = kit.questions.filter((q: any) => q.priority === 'must');
  console.log(\`Must-Have Questions (\${mustQuestions.length}):\`);
  mustQuestions.forEach((q: any, i: number) => {
    console.log(\`  \${i + 1}. [\${q.category}] \${q.text}\`);
  });
}`,
                      'node_script_copy'
                    )
                  }
                  className="flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  {copiedSnippet === 'node_script_copy' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Node.js Script</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-300 leading-relaxed border border-slate-800">
{`import fs from 'fs';

// Read evaluated Batch CLI output
const data = JSON.parse(fs.readFileSync('kits.json', 'utf-8'));

for (const caseResult of data.kits) {
  if (caseResult.status !== 'ok') {
    console.error(\`Case \${caseResult.id} failed: \${caseResult.error?.message}\`);
    continue;
  }

  const { kit } = caseResult;
  console.log(\`=== \${kit.source.company} (\${kit.role.title}) ===\`);
  console.log(\`Company Mission: \${kit.company_brief.summary}\`);

  // Extract High-Priority Questions
  const mustQuestions = kit.questions.filter((q: any) => q.priority === 'must');
  console.log(\`Must-Have Questions (\${mustQuestions.length}):\`);
  mustQuestions.forEach((q: any, i: number) => {
    console.log(\`  \${i + 1}. [\${q.category}] \${q.text}\`);
  });
}`}
              </pre>
            </div>
          </div>
        )}

        {/* RECIPE 4: CI/CD GITHUB ACTIONS */}
        {activeRecipe === 'github_actions' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    GitHub Actions Continuous Prep Workflow
                  </h4>
                  <p className="text-xs text-slate-500">
                    Save this to <code className="font-mono text-indigo-600">.github/workflows/batch-eval.yml</code> to run nightly regression testing or automatically generate prep kits on git push.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `name: Batch Interview Prep Evaluation

on:
  push:
    paths:
      - 'cases.json'
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Batch CLI Evaluation
        run: npm run evaluate -- --input cases.json --output kits.json

      - name: Extract Structured Results
        run: npm run extract-results -- --input kits.json --format all --output ./results/

      - name: Upload Extracted Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: interview-prep-kits
          path: |
            kits.json
            results/`,
                      'gh_actions_copy'
                    )
                  }
                  className="flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  {copiedSnippet === 'gh_actions_copy' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied YAML!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Workflow YAML</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-300 leading-relaxed border border-slate-800">
{`name: Batch Interview Prep Evaluation

on:
  push:
    paths:
      - 'cases.json'
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Batch CLI Evaluation
        run: npm run evaluate -- --input cases.json --output kits.json

      - name: Extract Structured Results
        run: npm run extract-results -- --input kits.json --format all --output ./results/

      - name: Upload Extracted Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: interview-prep-kits
          path: |
            kits.json
            results/`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
