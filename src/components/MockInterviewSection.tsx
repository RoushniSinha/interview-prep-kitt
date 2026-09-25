import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Timer,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Brain,
  ListOrdered,
  ChevronRight,
  ClipboardList,
  Target,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { Kit, Question } from '../core/types';
import { recordDailyActivity } from '../core/streakTracker';

interface MockInterviewSectionProps {
  kit: Kit;
  onNavigateToChecklist?: () => void;
}

interface SentimentAnalysis {
  tone: string;
  confidence_score: number;
  clarity_rating: 'High' | 'Moderate' | 'Needs Polish';
  delivery_notes: string;
}

interface ActionableImprovement {
  area: string;
  recommendation: string;
  drill_exercise: string;
}

interface EvaluationResult {
  score: number;
  verdict: 'Strong Hire' | 'Hire' | 'Borderline' | 'No Hire';
  strengths: string[];
  missing_points: string[];
  improved_outline: string;
  sentiment?: SentimentAnalysis;
  actionable_improvements?: ActionableImprovement[];
}

interface RecordedSessionItem {
  id: string;
  questionId: string;
  questionPrompt: string;
  category: string;
  candidateAnswer: string;
  timeSpentSecs: number;
  targetSeconds: number;
  evaluation: EvaluationResult;
  timestamp: string;
}

// Preset durations in seconds
const TIMER_PRESETS = [
  { label: '2 min (Rapid)', seconds: 120, desc: 'Elevator pitch / quick technical check' },
  { label: '3 min (Standard)', seconds: 180, desc: 'Behavioral STAR / concept breakdown' },
  { label: '5 min (Deep-dive)', seconds: 300, desc: 'System architecture / comprehensive trade-off' },
];

export const MockInterviewSection: React.FC<MockInterviewSectionProps> = ({
  kit,
  onNavigateToChecklist,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    kit.questions[0]?.id || ''
  );
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sub-view toggle: Rehearsal Studio vs Cumulative Session Feedback Report
  const [activeSubView, setActiveSubView] = useState<'rehearse' | 'session_report'>('rehearse');
  const [recordedSessions, setRecordedSessions] = useState<RecordedSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem(`aegis_mock_sessions_${kit.source.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [copiedReport, setCopiedReport] = useState(false);

  // Focus-Mode Timer States
  const [targetSeconds, setTargetSeconds] = useState<number>(180); // default 3m
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'expired'>('idle');
  const [isFocusModeExpanded, setIsFocusModeExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recordedElapsedTime, setRecordedElapsedTime] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const selectedQuestion = kit.questions.find((q) => q.id === selectedQuestionId);

  // Persist session history
  useEffect(() => {
    try {
      localStorage.setItem(
        `aegis_mock_sessions_${kit.source.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        JSON.stringify(recordedSessions)
      );
    } catch {}
  }, [recordedSessions, kit.source.company]);

  // Play a soft pleasant audio chime using browser Web Audio API
  const playTimeExpiredChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      gain2.gain.setValueAtTime(0.14, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.85);
    } catch {}
  };

  // Timer Tick
  useEffect(() => {
    if (timerStatus === 'running') {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerStatus('expired');
            playTimeExpiredChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStatus, soundEnabled]);

  const handleSelectPreset = (secs: number) => {
    setTargetSeconds(secs);
    setSecondsRemaining(secs);
    setTimerStatus('idle');
  };

  const handleStartTimer = () => {
    if (secondsRemaining <= 0) setSecondsRemaining(targetSeconds);
    setTimerStatus('running');
  };

  const handlePauseTimer = () => setTimerStatus('paused');

  const handleResetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsRemaining(targetSeconds);
    setTimerStatus('idle');
  };

  const handleAdd30s = () => {
    setSecondsRemaining((prev) => prev + 30);
    if (timerStatus === 'expired') setTimerStatus('running');
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCandidateAnswer(e.target.value);
    if (timerStatus === 'idle' && e.target.value.trim().length > 0) {
      setTimerStatus('running');
    }
  };

  const wordCount = candidateAnswer.trim()
    ? candidateAnswer.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const estimatedSpokenMinutes = (wordCount / 140).toFixed(1);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const progressPercent =
    targetSeconds > 0 ? Math.max(0, Math.min(100, (secondsRemaining / targetSeconds) * 100)) : 0;
  const elapsed = targetSeconds - secondsRemaining;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !candidateAnswer.trim()) return;

    if (timerStatus === 'running') setTimerStatus('paused');
    setRecordedElapsedTime(elapsed);

    setIsEvaluating(true);
    setError(null);

    try {
      const res = await fetch('/api/mock-interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPrompt: selectedQuestion.prompt,
          answerOutline: selectedQuestion.answer_outline,
          candidateAnswer: candidateAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Evaluation request failed');
      }

      const evalData: EvaluationResult = data.data;
      setEvaluation(evalData);

      // Record in cumulative session journal
      const newSessionItem: RecordedSessionItem = {
        id: `sess_${Date.now()}`,
        questionId: selectedQuestion.id,
        questionPrompt: selectedQuestion.prompt,
        category: selectedQuestion.category,
        candidateAnswer: candidateAnswer.trim(),
        timeSpentSecs: Math.max(1, elapsed),
        targetSeconds,
        evaluation: evalData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setRecordedSessions((prev) => [newSessionItem, ...prev]);

      // Record activity in daily streak tracker
      recordDailyActivity('mock_interview', {
        kitId: kit.source.company,
        company: kit.source.company,
        notes: `Mock response for question [${selectedQuestion.id}]: score ${evalData.score}/10 (${evalData.verdict})`,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Aggregated Session Metrics
  const totalAnswersRecorded = recordedSessions.length;
  const avgScore =
    totalAnswersRecorded > 0
      ? (
          recordedSessions.reduce((acc, s) => acc + s.evaluation.score, 0) /
          totalAnswersRecorded
        ).toFixed(1)
      : '0.0';

  const strongHireCount = recordedSessions.filter((s) => s.evaluation.verdict === 'Strong Hire').length;
  const hireCount = recordedSessions.filter((s) => s.evaluation.verdict === 'Hire').length;
  const borderlineCount = recordedSessions.filter((s) => s.evaluation.verdict === 'Borderline').length;
  const noHireCount = recordedSessions.filter((s) => s.evaluation.verdict === 'No Hire').length;

  const avgConfidence =
    totalAnswersRecorded > 0
      ? Math.round(
          recordedSessions.reduce(
            (acc, s) => acc + (s.evaluation.sentiment?.confidence_score || 70),
            0
          ) / totalAnswersRecorded
        )
      : 0;

  // Copy Markdown summary of Post-Interview Report
  const handleCopyReport = () => {
    let text = `# Mock Interview Post-Session Feedback Report\n`;
    text += `Company: ${kit.source.company} | Role: ${kit.role.title}\n`;
    text += `Questions Answered: ${totalAnswersRecorded} | Average Score: ${avgScore}/10 | Average Confidence: ${avgConfidence}%\n\n`;
    text += `## Answered Questions & Sentiment Trajectory\n\n`;
    recordedSessions.forEach((s, idx) => {
      text += `### ${idx + 1}. [${s.questionId}] ${s.questionPrompt}\n`;
      text += `- Score: ${s.evaluation.score}/10 (${s.evaluation.verdict})\n`;
      text += `- Duration: ${formatTime(s.timeSpentSecs)} / ${formatTime(s.targetSeconds)}\n`;
      if (s.evaluation.sentiment) {
        text += `- Tone: ${s.evaluation.sentiment.tone} (Confidence: ${s.evaluation.sentiment.confidence_score}%, Clarity: ${s.evaluation.sentiment.clarity_rating})\n`;
        text += `- Delivery Notes: ${s.evaluation.sentiment.delivery_notes}\n`;
      }
      if (s.evaluation.actionable_improvements?.length) {
        text += `- Key Improvement Drills:\n`;
        s.evaluation.actionable_improvements.forEach((drill) => {
          text += `  * ${drill.area}: ${drill.recommendation} (Drill: ${drill.drill_exercise})\n`;
        });
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div
      className={`space-y-6 ${
        isFocusModeExpanded
          ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 p-4 sm:p-8 backdrop-blur-md'
          : ''
      }`}
    >
      <div
        className={`rounded-xl border border-slate-200 bg-white shadow-xs ${
          isFocusModeExpanded ? 'mx-auto max-w-4xl p-8' : 'p-6'
        }`}
      >
        {/* Header Strip & Sub-navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                AI Interview Simulator
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-mono text-slate-500">
                {totalAnswersRecorded} Questions Rehearsed
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Timed Rehearsal & Post-Interview Feedback Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Practice candidate responses against benchmark outlines with real-time countdown constraints, sentiment diagnostics, and targeted drills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Companion Link to Interview Day Checklist */}
            {onNavigateToChecklist && (
              <button
                onClick={onNavigateToChecklist}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Day-of Checklist</span>
              </button>
            )}

            {/* Sub-view Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveSubView('rehearse')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeSubView === 'rehearse'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Rehearsal Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView('session_report')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeSubView === 'session_report'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Feedback Report</span>
                {totalAnswersRecorded > 0 && (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                    {totalAnswersRecorded}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                soundEnabled
                  ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
              }`}
              title={soundEnabled ? 'Chime on time expiration enabled' : 'Chime muted'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => setIsFocusModeExpanded(!isFocusModeExpanded)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              title={isFocusModeExpanded ? 'Exit Focus HUD' : 'Expand Focus HUD'}
            >
              {isFocusModeExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-600" />}
              <span className="hidden sm:inline">{isFocusModeExpanded ? 'Exit' : 'Focus'}</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            SUBVIEW 1: REHEARSAL STUDIO (Countdown Timer, Input, Evaluator)
            =================================================================== */}
        {activeSubView === 'rehearse' && (
          <div>
            {/* Focus-Mode Countdown Timer Control Panel */}
            <div
              className={`mt-5 rounded-xl border p-4 transition-all duration-200 ${
                timerStatus === 'expired'
                  ? 'border-rose-300 bg-rose-50/70 text-rose-950'
                  : secondsRemaining <= 30 && timerStatus === 'running'
                  ? 'border-amber-300 bg-amber-50/60 text-amber-950'
                  : 'border-slate-200 bg-slate-50/80 text-slate-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Timer Display & Presets */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold shadow-xs transition ${
                        timerStatus === 'expired'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : secondsRemaining <= 30 && timerStatus === 'running'
                          ? 'bg-amber-500 text-white'
                          : timerStatus === 'running'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-tight ${
                            timerStatus === 'expired'
                              ? 'text-rose-600'
                              : secondsRemaining <= 30 && timerStatus === 'running'
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatTime(secondsRemaining)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          / {formatTime(targetSeconds)}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium block">
                        {timerStatus === 'expired' ? (
                          <span className="text-rose-700 font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Time Limit Expired — Wrap Up Your Response
                          </span>
                        ) : secondsRemaining <= 30 && timerStatus === 'running' ? (
                          <span className="text-amber-700 font-semibold">30s Warning: Conclude Key Arguments</span>
                        ) : timerStatus === 'running' ? (
                          <span className="text-indigo-600 font-medium">Session in progress (Timing active)</span>
                        ) : timerStatus === 'paused' ? (
                          <span className="text-slate-500">Timer paused</span>
                        ) : (
                          <span className="text-slate-500">Ready to rehearse question</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 border-t border-slate-200/60 pt-2 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                    {TIMER_PRESETS.map((preset) => (
                      <button
                        key={preset.seconds}
                        type="button"
                        onClick={() => handleSelectPreset(preset.seconds)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          targetSeconds === preset.seconds
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2">
                  {timerStatus === 'running' ? (
                    <button
                      type="button"
                      onClick={handlePauseTimer}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{timerStatus === 'paused' ? 'Resume' : 'Start Timer'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAdd30s}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    title="Add 30s bonus time"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>30s</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                    title="Reset timer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full transition-all duration-300 ${
                    timerStatus === 'expired'
                      ? 'bg-rose-500'
                      : secondsRemaining <= 30
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Selector */}
            <div className="mt-5">
              <label className="block text-xs font-semibold text-slate-700">Select Practice Question</label>
              <select
                value={selectedQuestionId}
                onChange={(e) => {
                  setSelectedQuestionId(e.target.value);
                  setEvaluation(null);
                  setCandidateAnswer('');
                  handleResetTimer();
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                {kit.questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.id}] ({q.category.toUpperCase()}) {q.prompt.slice(0, 80)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Active Question Prompt Display */}
            {selectedQuestion && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span className="uppercase tracking-wider">
                    Target Question Prompt · {selectedQuestion.category.toUpperCase()}
                  </span>
                  <span className="font-mono">
                    {selectedQuestion.difficulty === 3
                      ? '★★★ Level 3 (Advanced)'
                      : selectedQuestion.difficulty === 2
                      ? '★★☆ Level 2 (Intermediate)'
                      : '★☆☆ Level 1 (Foundational)'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
                  {selectedQuestion.prompt}
                </p>
              </div>
            )}

            {/* Answer Submission Form */}
            <form onSubmit={handleEvaluate} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Candidate Response (Spoken or Written)
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Words: <strong className="font-mono text-slate-800">{wordCount}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Pacing: <strong className="font-mono text-slate-800">~{estimatedSpokenMinutes}m spoken</strong>
                    </span>
                  </div>
                </div>

                <textarea
                  required
                  rows={isFocusModeExpanded ? 10 : 7}
                  value={candidateAnswer}
                  onChange={handleAnswerChange}
                  placeholder="Articulate your approach clearly: state the problem context, architectural decisions, trade-offs, edge cases, and measurable outcomes..."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 leading-relaxed font-sans"
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedQuestion) {
                      setCandidateAnswer(
                        `In our previous distributed architecture, we solved this exact scaling challenge. We introduced an idempotent processing pipeline using Redis and PostgreSQL with row-level advisory locks to prevent duplicate state transitions. We decoupled asynchronous tasks with a dead-letter worker queue, which cut our p99 latency by 64% while supporting 25,000 concurrent writes.`
                      );
                      if (timerStatus === 'idle') setTimerStatus('running');
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Insert Calibrated Benchmark Answer
                </button>

                <div className="flex items-center gap-3">
                  {isFocusModeExpanded && (
                    <button
                      type="button"
                      onClick={() => setIsFocusModeExpanded(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close Focus Window
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isEvaluating || !candidateAnswer.trim()}
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition active:scale-98 disabled:opacity-50"
                  >
                    {isEvaluating ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Evaluating Response & Sentiment...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Submit & Calibrate Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* Active Question Evaluation Display */}
            {evaluation && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-fadeIn">
                {/* Top Scorecard Strip */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      Calibrated Evaluation Result
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-3xl font-extrabold text-slate-900">
                        {evaluation.score} / 10
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          evaluation.verdict === 'Strong Hire'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evaluation.verdict === 'Hire'
                            ? 'bg-blue-100 text-blue-800'
                            : evaluation.verdict === 'Borderline'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {evaluation.verdict}
                      </span>
                    </div>
                  </div>

                  {recordedElapsedTime !== null && (
                    <div className="text-right text-xs text-slate-500">
                      <span>Delivery Time:</span>{' '}
                      <strong className="font-mono text-slate-800">
                        {formatTime(recordedElapsedTime)}
                      </strong>{' '}
                      / {formatTime(targetSeconds)}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {recordedElapsedTime <= targetSeconds
                          ? '✓ Delivered within time limit'
                          : '⚠ Exceeded target duration'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sentiment & Linguistic Delivery Analysis */}
                {evaluation.sentiment && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                        <Brain className="h-4 w-4 text-indigo-600" />
                        <span>Sentiment & Delivery Analysis</span>
                      </div>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                        Tone: {evaluation.sentiment.tone}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white p-3 border border-indigo-100">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Confidence Score</span>
                          <span className="font-mono font-bold text-indigo-600">
                            {evaluation.sentiment.confidence_score}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${evaluation.sentiment.confidence_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg bg-white p-3 border border-indigo-100 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Clarity & Articulation</span>
                          <span className="font-semibold text-slate-800">
                            {evaluation.sentiment.clarity_rating} Clarity
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium">Evaluated</span>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
                      <strong>Delivery Notes:</strong> {evaluation.sentiment.delivery_notes}
                    </p>
                  </div>
                )}

                {/* Articulated Strengths & Omitted Points */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Articulated Strengths</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {evaluation.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span>Omitted Points & Trade-Offs</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {evaluation.missing_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actionable Improvements & Targeted Drills */}
                {evaluation.actionable_improvements && evaluation.actionable_improvements.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2.5">
                      <Target className="h-4 w-4 text-slate-700" />
                      <span>Actionable Improvements for Next Session</span>
                    </div>

                    <div className="space-y-2.5">
                      {evaluation.actionable_improvements.map((drill, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{drill.area}</span>
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                              Target Drill
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600">{drill.recommendation}</p>
                          <div className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-700 border-l-2 border-indigo-500">
                            <strong>Recommended Drill:</strong> {drill.drill_exercise}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Phrasing */}
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Calibrated Benchmark Talking Points
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">
                    {evaluation.improved_outline}
                  </p>
                </div>

                {/* Footer action to view overall report */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Saved to session journal ({recordedSessions.length} answers recorded)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubView('session_report')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>View Full Post-Interview Feedback Report</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            SUBVIEW 2: POST-INTERVIEW FEEDBACK REPORT
            =================================================================== */}
        {activeSubView === 'session_report' && (
          <div className="mt-6 space-y-6">
            {/* Report Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Executive Post-Interview Feedback Report
                </h3>
                <p className="text-xs text-slate-500">
                  Synthesized across {totalAnswersRecorded} recorded interview answers for {kit.source.company} ({kit.role.title}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  {copiedReport ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedReport ? 'Report Copied!' : 'Copy Markdown Report'}</span>
                </button>

                {recordedSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear recorded interview session history?')) {
                        setRecordedSessions([]);
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-600 transition"
                    title="Clear history"
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>

            {totalAnswersRecorded === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <FileCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">No Interview Answers Recorded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Rehearse questions in the Rehearsal Studio with the countdown timer. Your evaluations, sentiment scores, and drill plans will automatically synthesize into this executive report.
                </p>
                <button
                  onClick={() => setActiveSubView('rehearse')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition"
                >
                  Start First Rehearsal
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Aggregate KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Average Score
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-mono font-extrabold text-slate-900">
                        {avgScore}
                      </span>
                      <span className="text-xs text-slate-400">/ 10</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Avg Confidence
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-mono font-extrabold text-indigo-600">
                        {avgConfidence}%
                      </span>
                      <span className="text-xs text-slate-400">assertiveness</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Hire Verdicts
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-mono font-extrabold text-emerald-600">
                        {strongHireCount + hireCount}
                      </span>
                      <span className="text-xs text-slate-400">of {totalAnswersRecorded}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Borderline / Risk
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-mono font-extrabold text-amber-600">
                        {borderlineCount + noHireCount}
                      </span>
                      <span className="text-xs text-slate-400">need polish</span>
                    </div>
                  </div>
                </div>

                {/* Session Journal List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Detailed Question Logs & Sentiment Breakdown
                  </h4>

                  {recordedSessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              #{totalAnswersRecorded - index} [{session.questionId.toUpperCase()}]
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-400">
                              {session.category}
                            </span>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{session.timestamp}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-900">
                            {session.questionPrompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              session.evaluation.verdict === 'Strong Hire'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.evaluation.verdict === 'Hire'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {session.evaluation.score}/10 · {session.evaluation.verdict}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {formatTime(session.timeSpentSecs)}
                          </span>
                        </div>
                      </div>

                      {/* Candidate Answer Excerpt */}
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-100 line-clamp-2">
                        "{session.candidateAnswer}"
                      </p>

                      {/* Sentiment & Coaching Tips */}
                      {session.evaluation.sentiment && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-500">
                            Tone: <strong className="text-slate-800">{session.evaluation.sentiment.tone}</strong>
                          </span>
                          <span>·</span>
                          <span className="text-slate-500">
                            Confidence: <strong className="text-indigo-600 font-mono">{session.evaluation.sentiment.confidence_score}%</strong>
                          </span>
                          <span>·</span>
                          <span className="text-slate-500">
                            Clarity: <strong className="text-slate-800">{session.evaluation.sentiment.clarity_rating}</strong>
                          </span>
                        </div>
                      )}

                      {/* Drills for this question */}
                      {session.evaluation.actionable_improvements &&
                        session.evaluation.actionable_improvements.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700 block mb-1">
                              Actionable Improvements:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {session.evaluation.actionable_improvements.map((drill, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="rounded bg-slate-50 p-2 text-[11px] border border-slate-200/80"
                                >
                                  <strong className="text-slate-800">{drill.area}:</strong>{' '}
                                  <span className="text-slate-600">{drill.recommendation}</span>
                                  <div className="mt-1 text-[10px] text-indigo-700 font-medium">
                                    Drill: {drill.drill_exercise}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
