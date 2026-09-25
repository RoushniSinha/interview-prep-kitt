import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  MessageSquare,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Briefcase,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Sliders,
  Send,
  Building,
  Target,
  FileText,
} from 'lucide-react';
import { Kit } from '../core/types';
import {
  getMarketCompensation,
  getNegotiationScenarios,
  getNegotiationScriptTemplates,
  NegotiationScenario,
  NegotiationScenarioChoice,
  CompensationBreakdown,
} from '../core/salarySimulator';

interface SalaryNegotiationSimulatorProps {
  kit: Kit;
}

export const SalaryNegotiationSimulator: React.FC<SalaryNegotiationSimulatorProps> = ({ kit }) => {
  const scenarios = useMemo(() => getNegotiationScenarios(kit), [kit]);
  const market = useMemo(() => getMarketCompensation(kit), [kit]);
  const scriptTemplates = useMemo(() => getNegotiationScriptTemplates(kit), [kit]);

  const [activeTab, setActiveTab] = useState<'simulator' | 'benchmarks' | 'scripts' | 'calculator'>('simulator');
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<NegotiationScenarioChoice | null>(null);
  const [leverageScore, setLeverageScore] = useState<number>(70); // 0 to 100
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Custom response mode
  const [customResponse, setCustomResponse] = useState('');
  const [customFeedback, setCustomFeedback] = useState<{
    score: number;
    analysis: string;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  // TC Calculator state
  const [calcBase, setCalcBase] = useState<number>(market.baseSalary.percentile50);
  const [calcEquityAnnual, setCalcEquityAnnual] = useState<number>(market.equityAnnual.percentile50);
  const [calcSignOn, setCalcSignOn] = useState<number>(market.signOnBonus.percentile50);
  const [calcBonusPct, setCalcBonusPct] = useState<number>(market.targetBonusPct.p50);

  const activeScenario = scenarios[selectedScenarioIndex] || scenarios[0];
  const activeStep = activeScenario.steps[0];

  const handleSelectChoice = (choice: NegotiationScenarioChoice) => {
    setSelectedChoice(choice);
    setLeverageScore((prev) => Math.max(0, Math.min(100, prev + choice.leverageScoreChange)));
  };

  const handleResetScenario = () => {
    setSelectedChoice(null);
    setCustomResponse('');
    setCustomFeedback(null);
    setLeverageScore(70);
  };

  const handleEvaluateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customResponse.trim()) return;

    const lower = customResponse.toLowerCase();
    const mentionsMarket = lower.includes('market') || lower.includes('data') || lower.includes('benchmark');
    const mentionsNumbers = /\$\d+|\d+k|\d{3,}/.test(lower);
    const mentionsEnthusiasm = lower.includes('excited') || lower.includes('thrilled') || lower.includes('love') || lower.includes('team');
    const mentionsCommitment = lower.includes('sign') || lower.includes('accept') || lower.includes('close');
    const isAdversarial = lower.includes('insulting') || lower.includes('ridiculous') || lower.includes('unacceptable') || lower.includes('walk away');

    let score = 65;
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (mentionsEnthusiasm) {
      score += 10;
      strengths.push('Expressed genuine excitement and positive tone toward the team');
    } else {
      improvements.push('Add an opening statement expressing enthusiasm for the team and product');
    }

    if (mentionsMarket) {
      score += 10;
      strengths.push('Grounded requests in objective market benchmarks rather than personal expenses');
    } else {
      improvements.push('Cite industry market data or Levels.fyi/P90 peer benchmarks to justify the adjustment');
    }

    if (mentionsNumbers) {
      score += 10;
      strengths.push('Provided concrete figures rather than leaving the recruiter to guess');
    } else {
      improvements.push('Give specific dollar figures for Base, Equity, and Sign-on');
    }

    if (mentionsCommitment) {
      score += 10;
      strengths.push('Offered a closing commitment ("If we reach these numbers, I will sign immediately")');
    } else {
      improvements.push('Include a closing condition to give the recruiter strong leverage with finance');
    }

    if (isAdversarial) {
      score -= 30;
      improvements.push('Remove confrontational language; treat negotiation as collaborative problem-solving');
    }

    score = Math.max(20, Math.min(100, score));

    setCustomFeedback({
      score,
      analysis:
        score >= 80
          ? 'Exceptional verbal delivery! Your response strikes the golden balance of enthusiasm, market-grounded numbers, and collaborative closing leverage.'
          : score >= 60
          ? 'Solid foundation. With a few tweaks to emphasize closing commitment and market data, this counter will be highly effective.'
          : 'High risk of friction. Pivot away from subjective complaints and focus on objective value and market percentiles.',
      strengths,
      improvements,
    });
  };

  const handleCopyScript = (script: { id: string; template: string }) => {
    navigator.clipboard.writeText(script.template);
    setCopiedScriptId(script.id);
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  // Calculator computations
  const annualBonusDollars = Math.round(calcBase * (calcBonusPct / 100));
  const totalFirstYearComp = calcBase + calcEquityAnnual + calcSignOn + annualBonusDollars;
  const fourYearTotalComp = calcBase * 4 + calcEquityAnnual * 4 + calcSignOn + annualBonusDollars * 4;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Offer Strategy Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {kit.source.company} · {kit.role.title}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-600" />
              <span>Salary Negotiation Simulator & Tactical Offer Lab</span>
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl mt-1 leading-relaxed">
              Interactive roleplay scenarios, market compensation bands (P25 to P90), and battle-tested scripts calibrated to maximize your Total Compensation (TC) at {kit.source.company}.
            </p>
          </div>

          {/* Navigation Pill Strip */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Interactive Scenarios</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'benchmarks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Market Benchmarks</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'calculator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>TC Calculator</span>
            </button>

            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'scripts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Battle Scripts</span>
            </button>
          </div>
        </div>

        {/* Quick Market Summary Metric Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-medium text-slate-500">Median Base (P50)</span>
            <p className="font-mono text-xl font-bold text-slate-900 mt-0.5">
              ${(market.baseSalary.percentile50 / 1000).toFixed(0)}k
            </p>
            <span className="text-[10px] text-slate-400">P75: ${(market.baseSalary.percentile75 / 1000).toFixed(0)}k</span>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <span className="text-[11px] font-medium text-indigo-800">Annual Equity Grant</span>
            <p className="font-mono text-xl font-bold text-indigo-900 mt-0.5">
              ${(market.equityAnnual.percentile50 / 1000).toFixed(0)}k/yr
            </p>
            <span className="text-[10px] text-indigo-600">4-yr grant: ${(market.equityAnnual.percentile50 * 4 / 1000).toFixed(0)}k</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <span className="text-[11px] font-medium text-emerald-800">Target Sign-On Bonus</span>
            <p className="font-mono text-xl font-bold text-emerald-900 mt-0.5">
              ${(market.signOnBonus.percentile50 / 1000).toFixed(0)}k
            </p>
            <span className="text-[10px] text-emerald-700">P75: ${(market.signOnBonus.percentile75 / 1000).toFixed(0)}k</span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <span className="text-[11px] font-medium text-amber-800">Negotiation Leverage</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="font-mono text-xl font-bold text-amber-900">{leverageScore}/100</p>
              <span className={`text-[10px] font-semibold ${leverageScore >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {leverageScore >= 75 ? 'High Bargaining Power' : 'Moderate'}
              </span>
            </div>
            <span className="text-[10px] text-amber-700">Dynamic score based on choices</span>
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE SCENARIOS */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scenario Picker */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Negotiation Scenario
            </span>
            <div className="space-y-2">
              {scenarios.map((scen, idx) => {
                const isSelected = idx === selectedScenarioIndex;
                return (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setSelectedScenarioIndex(idx);
                      handleResetScenario();
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-indigo-700">{scen.category}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {scen.difficulty}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{scen.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {scen.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Tactical Tip Box */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                <ShieldAlert className="h-4 w-4" />
                <span>Executive Negotiation Tenet</span>
              </div>
              "Recruiters expect top candidates to counter-offer. Negotiation is not viewed as greed—it demonstrates commercial acumen, technical confidence, and self-advocacy."
            </div>
          </div>

          {/* Right Column (2 spans): Interactive Dialogue Stage */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              {/* Scenario Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    Active Scenario #{selectedScenarioIndex + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{activeScenario.title}</h3>
                </div>

                <button
                  type="button"
                  onClick={handleResetScenario}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  title="Reset conversation state"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restart</span>
                </button>
              </div>

              {/* Context Callout */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Situation Context:</strong> {activeStep.contextNote}
              </div>

              {/* Recruiter / Hiring Manager Speech Bubble */}
              <div className="mt-6 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
                  <Building className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-none border border-slate-200 bg-slate-100/70 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{activeStep.speakerTitle}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Live Call</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {activeStep.speakerPrompt}
                  </p>
                </div>
              </div>

              {/* Candidate Response Phase */}
              {!selectedChoice ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Choose Your Verbal Counter Strategy:
                    </span>
                    <span className="text-[11px] text-slate-400">Select one or write custom response below</span>
                  </div>

                  <div className="space-y-3">
                    {activeStep.choices.map((choice) => {
                      const badge = {
                        optimal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        acceptable: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                        suboptimal: 'bg-amber-50 text-amber-800 border-amber-200',
                        hazardous: 'bg-rose-50 text-rose-800 border-rose-200',
                      }[choice.tacticRating];

                      return (
                        <div
                          key={choice.id}
                          onClick={() => handleSelectChoice(choice)}
                          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-indigo-500 hover:bg-indigo-50/20"
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-slate-900">{choice.label}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                              {choice.tacticRating.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{choice.responsePreview}"
                          </p>
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                            <span>{choice.financialImpactOutcome}</span>
                            <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                              Simulate Response <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Or Write Custom Answer */}
                  <form onSubmit={handleEvaluateCustom} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Or Practice Your Own Custom Counter-Proposal:
                    </span>
                    <textarea
                      rows={3}
                      value={customResponse}
                      onChange={(e) => setCustomResponse(e.target.value)}
                      placeholder="Type what you would say verbatim on the phone call with the recruiter..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Evaluates anchoring, collaborative tone, and closing commitments
                      </span>
                      <button
                        type="submit"
                        disabled={!customResponse.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Evaluate My Custom Counter</span>
                      </button>
                    </div>

                    {customFeedback && (
                      <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4 text-xs animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900">Coach Feedback on Your Pitch</span>
                          <span className="font-mono text-sm font-bold text-indigo-600">
                            Score: {customFeedback.score}/100
                          </span>
                        </div>
                        <p className="mt-2 text-slate-700 leading-relaxed">{customFeedback.analysis}</p>

                        {customFeedback.strengths.length > 0 && (
                          <div className="mt-3">
                            <span className="font-semibold text-emerald-700">Tactical Strengths:</span>
                            <ul className="mt-1 space-y-1">
                              {customFeedback.strengths.map((s, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-slate-600">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {customFeedback.improvements.length > 0 && (
                          <div className="mt-3">
                            <span className="font-semibold text-amber-700">Recommended Improvements:</span>
                            <ul className="mt-1 space-y-1">
                              {customFeedback.improvements.map((im, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-slate-600">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  <span>{im}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                /* Selected Choice Dialogue Output & Recruiter Reaction */
                <div className="mt-6 space-y-5 animate-fadeIn">
                  {/* Candidate Speech */}
                  <div className="flex items-start gap-3.5 justify-end">
                    <div className="flex-1 rounded-2xl rounded-tr-none border border-indigo-200 bg-indigo-50/70 p-4 shadow-2xs text-right">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                          Your Spoken Counter
                        </span>
                        <span className="font-bold text-slate-900">You</span>
                      </div>
                      <p className="text-sm text-slate-900 font-medium leading-relaxed text-left">
                        "{selectedChoice.fullSpeech}"
                      </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs">
                      You
                    </div>
                  </div>

                  {/* Recruiter Live Reply */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none border border-slate-200 bg-slate-100/70 p-4 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900">{activeStep.speakerTitle}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Reaction</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">
                        {selectedChoice.recruiterReply}
                      </p>
                    </div>
                  </div>

                  {/* Coach Post-Mortem & Impact */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-indigo-600" />
                        <span>Negotiation Coach Analysis</span>
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {selectedChoice.financialImpactOutcome}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      {selectedChoice.coachFeedback}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResetScenario}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Try Another Choice
                    </button>
                    {selectedScenarioIndex + 1 < scenarios.length && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScenarioIndex((prev) => prev + 1);
                          handleResetScenario();
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                      >
                        <span>Next Scenario: {scenarios[selectedScenarioIndex + 1].title}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARKET BENCHMARKS */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Market Compensation Intel
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Calibrated Compensation Percentiles ({market.currency})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Derived from real-world verified peer submissions for {kit.role.title} at {kit.source.location || 'US/Global'} tech scale.
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-mono font-semibold text-slate-700">
                Location: {kit.source.location || 'US Benchmark'}
              </span>
            </div>

            {/* Percentile Distribution Bars */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Base Salary Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Annual Base Salary
                </span>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
                  ${(market.baseSalary.percentile50 / 1000).toFixed(0)}k{' '}
                  <span className="text-xs font-normal text-slate-500">median</span>
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>P25 (Entry into Band):</span>
                    <span className="font-mono font-bold">${(market.baseSalary.percentile25 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>P50 (Market Median):</span>
                    <span className="font-mono font-bold text-indigo-600">${(market.baseSalary.percentile50 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P75 (High Leverage Counter):</span>
                    <span className="font-mono font-bold text-emerald-600">${(market.baseSalary.percentile75 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P90 (Top of Band):</span>
                    <span className="font-mono font-bold text-slate-900">${(market.baseSalary.percentile90 / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>

              {/* Annual Equity Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Annual Equity / RSU Grant
                </span>
                <p className="mt-1 font-mono text-2xl font-bold text-indigo-900">
                  ${(market.equityAnnual.percentile50 / 1000).toFixed(0)}k{' '}
                  <span className="text-xs font-normal text-indigo-600">/ year</span>
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>P25 (Standard Grant):</span>
                    <span className="font-mono font-bold">${(market.equityAnnual.percentile25 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>P50 (Median Grant):</span>
                    <span className="font-mono font-bold text-indigo-600">${(market.equityAnnual.percentile50 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P75 (Senior Target):</span>
                    <span className="font-mono font-bold text-emerald-600">${(market.equityAnnual.percentile75 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P90 (Staff / Bar Raiser):</span>
                    <span className="font-mono font-bold text-slate-900">${(market.equityAnnual.percentile90 / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>

              {/* Sign-on Bonus Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  First-Year Signing Bonus
                </span>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-900">
                  ${(market.signOnBonus.percentile50 / 1000).toFixed(0)}k{' '}
                  <span className="text-xs font-normal text-emerald-600">lump sum</span>
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>P25 (Discretionary):</span>
                    <span className="font-mono font-bold">${(market.signOnBonus.percentile25 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>P50 (Standard Bridge):</span>
                    <span className="font-mono font-bold text-indigo-600">${(market.signOnBonus.percentile50 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P75 (Competing Offer Match):</span>
                    <span className="font-mono font-bold text-emerald-600">${(market.signOnBonus.percentile75 / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>P90 (Relocation & High Lever):</span>
                    <span className="font-mono font-bold text-slate-900">${(market.signOnBonus.percentile90 / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Compensation First Year Table */}
            <div className="mt-8">
              <h4 className="text-sm font-bold text-slate-900 mb-3">
                Total Target First-Year Compensation (TC) Models
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Band Tier</th>
                      <th className="py-3 px-4">Base Salary</th>
                      <th className="py-3 px-4">Annual Equity</th>
                      <th className="py-3 px-4">Sign-On Bonus</th>
                      <th className="py-3 px-4 font-bold text-slate-900">Total Year 1 Comp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-600">P25 (Entry Band)</td>
                      <td className="py-3 px-4 font-mono">${(market.baseSalary.percentile25 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.equityAnnual.percentile25 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.signOnBonus.percentile25 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ${((market.baseSalary.percentile25 + market.equityAnnual.percentile25 + market.signOnBonus.percentile25) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                    <tr className="bg-indigo-50/30">
                      <td className="py-3 px-4 font-bold text-indigo-900">P50 (Market Median)</td>
                      <td className="py-3 px-4 font-mono">${(market.baseSalary.percentile50 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.equityAnnual.percentile50 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.signOnBonus.percentile50 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        ${((market.baseSalary.percentile50 + market.equityAnnual.percentile50 + market.signOnBonus.percentile50) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-emerald-800">P75 (Recommended Target)</td>
                      <td className="py-3 px-4 font-mono">${(market.baseSalary.percentile75 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.equityAnnual.percentile75 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.signOnBonus.percentile75 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        ${((market.baseSalary.percentile75 + market.equityAnnual.percentile75 + market.signOnBonus.percentile75) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-purple-900">P90 (Staff / Top 10%)</td>
                      <td className="py-3 px-4 font-mono">${(market.baseSalary.percentile90 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.equityAnnual.percentile90 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono">${(market.signOnBonus.percentile90 / 1000).toFixed(0)}k</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-900">
                        ${((market.baseSalary.percentile90 + market.equityAnnual.percentile90 + market.signOnBonus.percentile90) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TC CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Interactive Financial Modeler
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Total Compensation (TC) Counter-Offer Calculator
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjust levers to model your proposed package and visualize first-year earnings vs 4-year cumulative wealth creation.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Sliders */}
            <div className="space-y-5 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-800 mb-1.5">
                  <span>Base Salary</span>
                  <span className="font-mono text-sm text-indigo-600 font-bold">${calcBase.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={market.baseSalary.percentile25 * 0.8}
                  max={market.baseSalary.percentile90 * 1.2}
                  step={5000}
                  value={calcBase}
                  onChange={(e) => setCalcBase(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>P25: ${(market.baseSalary.percentile25 / 1000).toFixed(0)}k</span>
                  <span>P50: ${(market.baseSalary.percentile50 / 1000).toFixed(0)}k</span>
                  <span>P90: ${(market.baseSalary.percentile90 / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-800 mb-1.5">
                  <span>Annual Equity / Stock Grant</span>
                  <span className="font-mono text-sm text-indigo-600 font-bold">${calcEquityAnnual.toLocaleString()}/yr</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={market.equityAnnual.percentile90 * 1.5}
                  step={5000}
                  value={calcEquityAnnual}
                  onChange={(e) => setCalcEquityAnnual(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  4-Year Total Equity Grant: ${(calcEquityAnnual * 4).toLocaleString()}
                </span>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-800 mb-1.5">
                  <span>First-Year Sign-On Bonus</span>
                  <span className="font-mono text-sm text-emerald-600 font-bold">${calcSignOn.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={market.signOnBonus.percentile90 * 1.5}
                  step={5000}
                  value={calcSignOn}
                  onChange={(e) => setCalcSignOn(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-800 mb-1.5">
                  <span>Target Annual Performance Bonus (%)</span>
                  <span className="font-mono text-sm text-slate-800 font-bold">{calcBonusPct}% (${annualBonusDollars.toLocaleString()})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={2.5}
                  value={calcBonusPct}
                  onChange={(e) => setCalcBonusPct(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer"
                />
              </div>
            </div>

            {/* Right: Summary Visual Card */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Projected Compensation Breakdown
                </span>

                <div className="mt-4 border-b border-slate-200 pb-4">
                  <span className="text-xs text-slate-500">Total First-Year Target Cash & Equity (TC):</span>
                  <p className="font-mono text-3xl font-extrabold text-slate-900 mt-1">
                    ${totalFirstYearComp.toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Base Salary (Guaranteed Cash):</span>
                    <span className="font-mono font-bold">${calcBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span>Annual Equity (RSUs):</span>
                    <span className="font-mono font-bold">${calcEquityAnnual.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Target Performance Bonus ({calcBonusPct}%):</span>
                    <span className="font-mono font-bold">${annualBonusDollars.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Sign-On Bonus (First Year Only):</span>
                    <span className="font-mono font-bold">${calcSignOn.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-900 p-4 text-white">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">4-Year Cumulative Earnings Projection:</span>
                  <span className="font-mono text-lg font-bold text-emerald-400">
                    ${fourYearTotalComp.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Includes 4-year equity vesting and 4x target performance bonus.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BATTLE SCRIPTS */}
      {activeTab === 'scripts' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scriptTemplates.map((script) => (
              <div
                key={script.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      {script.stage}
                    </span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                      {script.category.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{script.title}</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{script.summary}</p>

                  {/* Script Text Box */}
                  <div className="mt-3 relative rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {script.template}
                  </div>

                  {/* Pro Tips */}
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tactical Execution Tips:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {script.proTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopyScript(script)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                  >
                    {copiedScriptId === script.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Script Template</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
