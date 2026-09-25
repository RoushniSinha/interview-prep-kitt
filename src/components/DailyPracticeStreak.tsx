import React from 'react';
import {
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  ArrowRight,
  Zap,
  Clock,
  Layers,
  Mic,
} from 'lucide-react';
import { useDailyStreak } from '../core/streakTracker';

interface DailyPracticeStreakProps {
  onOpenPracticeArena?: () => void;
  onNavigateToMock?: () => void;
  variant?: 'card' | 'compact';
}

export const DailyPracticeStreak: React.FC<DailyPracticeStreakProps> = ({
  onOpenPracticeArena,
  onNavigateToMock,
  variant = 'card',
}) => {
  const { streak, seedDemoStreak } = useDailyStreak();

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 shadow-2xs">
        <Flame
          className={`h-4 w-4 ${
            streak.currentStreak > 0
              ? 'text-amber-500 fill-amber-500 animate-pulse'
              : 'text-slate-400'
          }`}
        />
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-900">
            {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
          </span>
          <span className="text-[10px] text-slate-500">Streak</span>
        </div>
        {streak.hasPracticedToday ? (
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Done
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800">
            Pending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-amber-50/30 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs transition ${
              streak.currentStreak > 0
                ? 'bg-amber-500 text-white shadow-amber-200'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Flame className={`h-6 w-6 ${streak.currentStreak > 0 ? 'fill-white animate-pulse' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Daily Practice Streak
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">Continuous Active Recall</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="font-mono text-2xl font-extrabold text-slate-900">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'} In A Row
              </h3>
              {streak.bestStreak > 0 && (
                <span className="flex items-center gap-1 rounded bg-amber-100/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                  <Trophy className="h-3 w-3 text-amber-600" />
                  Best: {streak.bestStreak}d
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {streak.hasPracticedToday ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Practiced Today</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
              <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>Practice Today to Keep Streak Alive</span>
            </div>
          )}

          {streak.currentStreak === 0 && (
            <button
              onClick={seedDemoStreak}
              className="text-[11px] text-slate-400 hover:text-slate-700 underline"
              title="Populate test streak data"
            >
              Demo Streak
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Visual Activity Heatmap */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
          <span>Last 7 Days Activity</span>
          <span className="text-[11px] text-slate-400">
            {streak.totalDaysPracticed} total active days recorded
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {streak.recentWeek.map((day) => {
            const hasActivity = day.practiced;
            return (
              <div
                key={day.date}
                className={`flex flex-col items-center justify-between rounded-xl border p-2.5 transition text-center ${
                  day.isToday
                    ? hasActivity
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-300 ring-offset-1'
                      : 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-300 ring-offset-1'
                    : hasActivity
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-100 bg-slate-50/60'
                }`}
                title={`${day.date}: ${day.flashcardCount} flashcard reviews, ${day.mockInterviewCount} mock interviews`}
              >
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  {day.dayName}
                </span>

                <div className="my-1.5">
                  {hasActivity ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 text-xs font-mono">
                      {day.dayNumber}
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] font-medium ${
                    day.isToday
                      ? 'font-bold text-slate-900'
                      : hasActivity
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {day.isToday ? 'Today' : `${day.flashcardCount + day.mockInterviewCount} done`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Strip */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Complete at least <strong>1 flashcard</strong> or <strong>1 mock response</strong> daily to advance your streak.
        </p>

        <div className="flex items-center gap-2">
          {onOpenPracticeArena && (
            <button
              onClick={onOpenPracticeArena}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Practice Flashcards</span>
            </button>
          )}

          {onNavigateToMock && (
            <button
              onClick={onNavigateToMock}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <Mic className="h-3.5 w-3.5 text-indigo-400" />
              <span>Mock Interview</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
