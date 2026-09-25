import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Timer,
  Activity,
  CheckCircle2,
  RotateCcw,
  Zap,
  Target,
  FileCheck,
  Brain,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { Flashcard, Kit, FlashcardPracticeLog } from '../core/types';
import { getOrderedPracticeCards, computePracticeStats, PracticeStats } from '../core/practice';
import { recordDailyActivity } from '../core/streakTracker';

// Declare Web Speech API types for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface PracticeArenaProps {
  kit: Kit;
  kitId: string;
  onClose: () => void;
  onRecordConfidence: (flashcardId: string, confidence: 1 | 2 | 3) => Promise<PracticeStats | null>;
  initialStats?: PracticeStats | null;
}

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'have', 'experience',
  'deep', 'strong', 'understanding', 'ability', 'knowledge', 'proven', 'track',
  'record', 'years', 'using', 'skills', 'good', 'work', 'working', 'team',
  'including', 'such', 'well', 'into', 'over', 'must', 'nice', 'plus', 'about',
  'system', 'their', 'there', 'they', 'what', 'when', 'where', 'which'
]);

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of', 'honestly'];

export const PracticeArena: React.FC<PracticeArenaProps> = ({
  kit,
  kitId,
  onClose,
  onRecordConfidence,
  initialStats,
}) => {
  const [logs, setLogs] = useState<FlashcardPracticeLog[]>([]);
  const [orderedQueue, setOrderedQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<PracticeStats | null>(initialStats || null);

  // Speech-to-text states
  const [isVerbalPracticeOpen, setIsVerbalPracticeOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechDuration, setSpeechDuration] = useState(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    const queue = getOrderedPracticeCards(kit.flashcards, logs);
    setOrderedQueue(queue);
    setStats(computePracticeStats(kit.flashcards, kit.role.requirements, logs));
  }, [kit, logs]);

  const currentCard = orderedQueue[currentIndex] || orderedQueue[0];

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += trans + ' ';
          } else {
            interimChunk += trans;
          }
        }

        if (finalChunk) {
          setTranscript((prev) => prev + finalChunk);
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Soft timeout, ignore
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If we intended to keep listening, restart gracefully
        if (isListening) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech API init error:', err);
      setIsSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Timer for speech duration
  useEffect(() => {
    if (isListening) {
      timerIntervalRef.current = setInterval(() => {
        setSpeechDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setSpeechError(null);

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.warn('Failed to start speech recognition:', err);
        setSpeechError('Failed to start microphone. Please check permissions.');
      }
    }
  };

  const handleResetSpeech = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
    setTranscript('');
    setInterimTranscript('');
    setSpeechDuration(0);
    setSpeechError(null);
  };

  // Switch card helper: resets speech buffer for the next question
  const advanceToNextCard = (newQueue: Flashcard[], nextIdx: number) => {
    handleResetSpeech();
    setIsRevealed(false);
    setIsSubmitting(false);
    setOrderedQueue(newQueue);
    setCurrentIndex(nextIdx);
  };

  const handleRate = async (confidence: 1 | 2 | 3) => {
    if (!currentCard || isSubmitting) return;

    setIsSubmitting(true);
    const newLog: FlashcardPracticeLog = {
      flashcardId: currentCard.id,
      confidence,
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);

    // Call server to persist
    const newStats = await onRecordConfidence(currentCard.id, confidence);
    if (newStats) setStats(newStats);

    // Record activity in daily streak tracker
    recordDailyActivity('flashcard', {
      kitId,
      company: kit.source.company,
      notes: `Flashcard [${currentCard.id}] reviewed with confidence level ${confidence}`,
    });

    // Advance to next card
    if (currentIndex + 1 < orderedQueue.length) {
      advanceToNextCard(orderedQueue, currentIndex + 1);
    } else {
      // Re-order queue with latest confidence data
      const nextQueue = getOrderedPracticeCards(kit.flashcards, updatedLogs);
      advanceToNextCard(nextQueue, 0);
    }
  };

  // Requirement keyword analysis
  const fullSpokenText = (transcript + ' ' + interimTranscript).trim();
  const lowerSpokenText = fullSpokenText.toLowerCase();

  // Words count & WPM
  const wordsArray = fullSpokenText ? fullSpokenText.split(/\s+/).filter(Boolean) : [];
  const wordCount = wordsArray.length;
  const wpm = speechDuration > 0 ? Math.round((wordCount / speechDuration) * 60) : 0;

  // Count filler words
  const fillerCount = useMemo(() => {
    if (!lowerSpokenText) return 0;
    let count = 0;
    FILLER_WORDS.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerSpokenText.match(regex);
      if (matches) count += matches.length;
    });
    return count;
  }, [lowerSpokenText]);

  // Requirement mapping & match checks
  const requirementsAnalysis = useMemo(() => {
    return kit.role.requirements.map((req) => {
      // Extract keywords from requirement text
      const words = req.text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

      const matchedWords = words.filter((w) => lowerSpokenText.includes(w));
      const isCardRelated = currentCard?.requirement_ids?.includes(req.id);
      const isMatched = matchedWords.length > 0;

      return {
        id: req.id,
        text: req.text,
        kind: req.kind,
        priority: req.priority,
        isCardRelated,
        isMatched,
        matchedWords: Array.from(new Set(matchedWords)),
      };
    });
  }, [kit.role.requirements, currentCard, lowerSpokenText]);

  const matchedRequirementsCount = requirementsAnalysis.filter((r) => r.isMatched).length;
  const matchPercentage =
    kit.role.requirements.length > 0
      ? Math.round((matchedRequirementsCount / kit.role.requirements.length) * 100)
      : 0;

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">No flashcards available in this kit.</p>
          <button
            onClick={onClose}
            className="mt-4 rounded bg-slate-900 px-4 py-2 text-xs font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-white overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-3.5 shrink-0 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-xs shadow-xs">
            SP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Spaced Repetition & Verbal Practice Arena</h3>
              <span className="rounded bg-indigo-950 border border-indigo-700/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                Speech-to-Text Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Confidence-Weighted Review · Card {currentIndex + 1} of {orderedQueue.length}
            </p>
          </div>
        </div>

        {/* Real-time stats badges */}
        {stats && (
          <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
            <div>
              <span>Cards Reviewed:</span>{' '}
              <strong className="text-white">{stats.reviewedCardsCount} / {stats.totalCards}</strong> ({stats.percentSeen}%)
            </div>
            <div>
              <span>Confident:</span>{' '}
              <strong className="text-emerald-400">{stats.percentConfident}%</strong>
            </div>
            <div>
              <span>Req Coverage:</span>{' '}
              <strong className="text-indigo-400">
                {stats.requirementBreakdown.filter((r) => r.status === 'mastered').length} / {stats.requirementBreakdown.length}
              </strong>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsVerbalPracticeOpen(!isVerbalPracticeOpen)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isVerbalPracticeOpen
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>{isVerbalPracticeOpen ? 'Verbal Mode ON' : 'Enable Verbal Mode'}</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 sm:p-6 gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Flashcard Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Card Frame */}
            <div
              onClick={() => !isRevealed && setIsRevealed(true)}
              className="relative min-h-[360px] w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl transition hover:border-slate-700 flex flex-col justify-between"
            >
              <div>
                {/* Card Metadata */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-400">{currentCard.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 font-medium">{kit.source.company}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    {currentCard.requirement_ids.map((r) => (
                      <span key={r} className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="my-5">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Active Recall Prompt</span>
                  </span>
                  <h2 className="mt-2 text-lg font-medium leading-relaxed text-slate-100">
                    {currentCard.front}
                  </h2>

                  {/* Verbal prompt nudge */}
                  {isVerbalPracticeOpen && !isRevealed && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-900/50 bg-indigo-950/40 p-3 text-xs text-indigo-200">
                      <Mic className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>
                        Speak your answer aloud into the microphone before flipping. The engine will transcribe and analyze your keywords against the job requirements in real-time!
                      </span>
                    </div>
                  )}

                  {/* Revealed Answer Outline */}
                  {isRevealed && (
                    <div className="mt-6 border-t border-slate-800 pt-5 transition animate-fadeIn">
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Calibrated High-Scoring Outline</span>
                      </span>
                      <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                        {currentCard.back}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Bottom Indicator */}
              <div className="border-t border-slate-800/80 pt-3">
                {!isRevealed ? (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Click card or button to reveal answer outline</span>
                    </div>
                    <span className="text-slate-500 font-mono">Space to flip</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">
                      Compare your spoken keywords with the outline, then rate your recall:
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Deck: Reveal or Rating Buttons */}
            {isRevealed ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleRate(1)}
                  className="flex flex-col items-center justify-center rounded-xl border border-rose-900/60 bg-rose-950/40 p-3.5 text-rose-300 hover:bg-rose-900/60 transition active:scale-98 shadow-sm"
                >
                  <span className="font-bold text-sm">1. Needs Work</span>
                  <span className="text-[10px] text-rose-400/80">Re-queue immediately</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleRate(2)}
                  className="flex flex-col items-center justify-center rounded-xl border border-amber-900/60 bg-amber-950/40 p-3.5 text-amber-300 hover:bg-amber-900/60 transition active:scale-98 shadow-sm"
                >
                  <span className="font-bold text-sm">2. Getting There</span>
                  <span className="text-[10px] text-amber-400/80">Moderate grasp</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleRate(3)}
                  className="flex flex-col items-center justify-center rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3.5 text-emerald-300 hover:bg-emerald-900/60 transition active:scale-98 shadow-sm"
                >
                  <span className="font-bold text-sm">3. Confident</span>
                  <span className="text-[10px] text-emerald-400/80">Solid active recall</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsRevealed(true)}
                  className="rounded-xl bg-indigo-600 px-8 py-3 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 transition active:scale-98"
                >
                  Reveal Answer Outline & Compare
                </button>
              </div>
            )}
          </div>

          {/* Speech-to-Text & Real-Time Keyword Analysis Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
              
              {/* Header & Recording Trigger */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Live Speech Transcription
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isListening ? 'Streaming audio...' : 'Microphone standby'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {fullSpokenText && (
                      <button
                        type="button"
                        onClick={handleResetSpeech}
                        className="rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white"
                        title="Clear current transcription"
                      >
                        <RotateCcw className="h-3 w-3 inline mr-1" />
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!isSpeechSupported}
                      onClick={toggleListening}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-md transition ${
                        isListening
                          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/30'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3.5 w-3.5" />
                          <span>Stop Mic</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          <span>Start Recording</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {speechError && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{speechError}</span>
                  </div>
                )}

                {/* Telemetry Bar (Duration, Words, WPM, Filler words) */}
                <div className="mt-3.5 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Speaking Time</span>
                    <span className="font-mono text-sm font-bold text-white mt-0.5">
                      {formatTime(speechDuration)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Word Count</span>
                    <span className="font-mono text-sm font-bold text-indigo-400 mt-0.5">
                      {wordCount}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Pace (WPM)</span>
                    <span
                      className={`font-mono text-sm font-bold mt-0.5 ${
                        wpm >= 110 && wpm <= 160
                          ? 'text-emerald-400'
                          : wpm > 160
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {wpm}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Filler Words</span>
                    <span
                      className={`font-mono text-sm font-bold mt-0.5 ${
                        fillerCount > 4 ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {fillerCount}
                    </span>
                  </div>
                </div>

                {/* Live Transcript Display Box */}
                <div className="mt-3.5 min-h-[140px] max-h-[220px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs leading-relaxed text-slate-200">
                  {fullSpokenText ? (
                    <div>
                      <span>{transcript}</span>
                      {interimTranscript && (
                        <span className="text-slate-400 italic"> {interimTranscript}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                      <Mic className="h-6 w-6 text-slate-600 mb-1" />
                      <span>Press "Start Recording" and speak your answer.</span>
                      <span className="text-[10px] text-slate-600 mt-1">
                        Keywords matching the job requirements will highlight automatically below.
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-Time Keyword & Requirement Radar */}
                <div className="mt-4 border-t border-slate-800 pt-3.5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Job Requirements Keyword Match</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-400">
                      {matchedRequirementsCount}/{kit.role.requirements.length} Matched ({matchPercentage}%)
                    </span>
                  </div>

                  {/* Progress meter */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 mb-3">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${matchPercentage}%` }}
                    />
                  </div>

                  {/* Requirements match chips */}
                  <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                    {requirementsAnalysis.map((req) => (
                      <div
                        key={req.id}
                        className={`flex items-start justify-between gap-2 rounded-lg border p-2 text-[11px] transition ${
                          req.isMatched
                            ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-200'
                            : req.isCardRelated
                            ? 'border-indigo-800/60 bg-indigo-950/20 text-slate-300'
                            : 'border-slate-800/60 bg-slate-950/30 text-slate-400'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 flex-1">
                          {req.isMatched ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="line-clamp-2 leading-tight">{req.text}</span>
                            {req.matchedWords.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {req.matchedWords.map((word) => (
                                  <span
                                    key={word}
                                    className="rounded bg-emerald-900/60 border border-emerald-700/60 px-1.5 py-0.2 text-[9px] font-mono font-bold text-emerald-300"
                                  >
                                    ✓ {word}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {req.isCardRelated && (
                          <span className="rounded bg-indigo-900/60 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 shrink-0">
                            Card Focus
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fluency Coach Snippet */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  {wpm < 100 && speechDuration > 5
                    ? '💡 Pacing tip: Try picking up the pace slightly (Target: 120-150 WPM).'
                    : wpm > 170
                    ? '💡 Pacing tip: Take deliberate pauses between key points to sound authoritative.'
                    : '✓ Pacing is calibrated in the optimal interview zone.'}
                </span>
                <span className="font-mono text-slate-500 text-[10px]">Speech Engine v2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
