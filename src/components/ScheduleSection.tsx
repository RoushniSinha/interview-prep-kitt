import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  CheckCircle2,
  GripVertical,
  ArrowRightLeft,
  LayoutGrid,
  List,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Kit, Schedule, ScheduleDay, Question } from '../core/types';
import { PersonalInterviewCalendar } from './PersonalInterviewCalendar';

interface ScheduleSectionProps {
  kit: Kit;
  onUpdateSchedule?: (updatedSchedule: Schedule) => void;
  onRegenerateSchedule: () => void;
  isRegenerating?: boolean;
  onNavigateToChecklist?: () => void;
  onNavigateToMock?: () => void;
}

interface DraggedTaskPayload {
  questionId: string;
  sourceDay: number;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  kit,
  onUpdateSchedule,
  onRegenerateSchedule,
  isRegenerating,
  onNavigateToChecklist,
  onNavigateToMock,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'interview_dates'>('calendar');
  const [draggedTask, setDraggedTask] = useState<DraggedTaskPayload | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const totalMinutes = kit.schedule.days.reduce((acc, d) => acc + d.minutes, 0);

  // Derive starting calendar date from researched_at or current date
  const getCalendarDateForDay = (dayIndex: number): string => {
    const baseDate = kit.source.researched_at ? new Date(kit.source.researched_at) : new Date();
    // Add (dayIndex - 1) days to the anchor date
    const targetDate = new Date(baseDate.getTime() + (dayIndex - 1) * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper: compute standard duration for a question based on its difficulty
  const getQuestionMinutes = (qId: string): number => {
    const q = kit.questions.find((item) => item.id === qId);
    if (!q) return 30;
    return q.difficulty === 1 ? 15 : q.difficulty === 3 ? 45 : 30;
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, questionId: string, sourceDay: number) => {
    const payload: DraggedTaskPayload = { questionId, sourceDay };
    setDraggedTask(payload);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== targetDay) {
      setDragOverDay(targetDay);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetDay: number) => {
    // Only clear if leaving this specific drop target
    if (dragOverDay === targetDay) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault();
    setDragOverDay(null);

    let payload = draggedTask;
    if (!payload) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) payload = JSON.parse(raw);
      } catch {
        // Fallback
      }
    }

    if (!payload || payload.sourceDay === targetDay) {
      setDraggedTask(null);
      return;
    }

    moveTask(payload.questionId, payload.sourceDay, targetDay);
    setDraggedTask(null);
  };

  // Core Task Moving Logic: updates schedule and preserves Appendix A integer constraints
  const moveTask = (questionId: string, fromDayNum: number, toDayNum: number) => {
    if (fromDayNum === toDayNum) return;

    const taskMinutes = getQuestionMinutes(questionId);

    const updatedDays: ScheduleDay[] = kit.schedule.days.map((day) => {
      // 1. Remove from source day
      if (day.day === fromDayNum) {
        const filteredQIds = day.question_ids.filter((id) => id !== questionId);
        // Decrease minutes but enforce strict positive integer >= 15
        const newMinutes = Math.max(15, day.minutes - taskMinutes);
        return {
          ...day,
          question_ids: filteredQIds,
          minutes: newMinutes,
          focus: filteredQIds.length === 0 ? 'Self-Review & High-Yield Rehearsal' : day.focus,
        };
      }

      // 2. Add to destination day
      if (day.day === toDayNum) {
        const alreadyHas = day.question_ids.includes(questionId);
        const newQIds = alreadyHas ? day.question_ids : [...day.question_ids, questionId];
        const newMinutes = alreadyHas ? day.minutes : day.minutes + taskMinutes;
        return {
          ...day,
          question_ids: newQIds,
          minutes: newMinutes,
        };
      }

      return day;
    });

    const updatedSchedule: Schedule = {
      ...kit.schedule,
      days: updatedDays,
    };

    if (onUpdateSchedule) {
      onUpdateSchedule(updatedSchedule);
    }

    // Temporary feedback notification
    setFeedbackMessage(`Rescheduled [${questionId.toUpperCase()}] from Day ${fromDayNum} to Day ${toDayNum}`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Visual Study Timeline
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">Interactive Drag & Drop</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              {kit.schedule.days_available}-Day Calendar & Task Allocation
            </h2>
            <p className="text-xs text-slate-500">
              Drag questions across dates on the visual timeline to personalize your pacing. Durations automatically recalibrate with integer precision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Study Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Sequential List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('interview_dates')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === 'interview_dates'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Personal Interview Calendar</span>
              </button>
            </div>

            <div className="text-right text-xs hidden sm:block">
              <span className="text-slate-400">Total Program:</span>{' '}
              <strong className="text-slate-900 font-mono">{totalMinutes} mins</strong> ({Math.round((totalMinutes / 60) * 10) / 10} hrs)
            </div>

            <button
              onClick={onRegenerateSchedule}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              title="Recalculate deterministic optimal schedule based on question difficulties"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Re-Pack Schedule</span>
            </button>
          </div>
        </div>

        {/* Live Feedback Notification Banner */}
        {feedbackMessage && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs text-emerald-800 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{feedbackMessage}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Auto-saved</span>
          </div>
        )}

        {/* ===================================================================
            VIEW 1: Interactive Calendar Timeline Grid (Drag and Drop)
            =================================================================== */}
        {viewMode === 'calendar' && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {kit.schedule.days.map((day) => {
                const scheduledQuestions = kit.questions.filter((q) =>
                  day.question_ids.includes(q.id)
                );
                const isDragTarget = dragOverDay === day.day;
                const calendarDate = getCalendarDateForDay(day.day);

                // Workload categorization
                const workloadColor =
                  day.minutes > 60
                    ? 'text-amber-600 bg-amber-50 border-amber-200'
                    : day.minutes >= 30
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-200'
                    : 'text-slate-600 bg-slate-50 border-slate-200';

                return (
                  <div
                    key={day.day}
                    onDragOver={(e) => handleDragOver(e, day.day)}
                    onDragLeave={(e) => handleDragLeave(e, day.day)}
                    onDrop={(e) => handleDrop(e, day.day)}
                    className={`flex flex-col rounded-xl border transition-all duration-150 min-h-[320px] ${
                      isDragTarget
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-400 ring-offset-1'
                        : 'border-slate-200 bg-white shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    {/* Date Column Header */}
                    <div className="border-b border-slate-100 p-3.5 bg-slate-50/70 rounded-t-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                            {day.day}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Day {day.day}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {calendarDate}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono font-semibold border ${workloadColor}`}
                        >
                          {day.minutes}m
                        </span>
                        <span className="text-slate-400">
                          {scheduledQuestions.length} {scheduledQuestions.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>

                      <p
                        className="mt-1.5 text-[11px] font-medium text-slate-700 truncate"
                        title={day.focus}
                      >
                        {day.focus}
                      </p>
                    </div>

                    {/* Draggable Task List Container */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[380px]">
                      {scheduledQuestions.length === 0 ? (
                        <div
                          className={`h-full min-h-[140px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition ${
                            isDragTarget
                              ? 'border-indigo-400 bg-indigo-100/30 text-indigo-700'
                              : 'border-slate-200 text-slate-400'
                          }`}
                        >
                          <CalendarIcon className="h-5 w-5 mb-1 opacity-50" />
                          <span className="text-[11px] font-medium">
                            {isDragTarget ? 'Drop task to assign here' : 'Open Review Day'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Drag any task to reschedule
                          </span>
                        </div>
                      ) : (
                        scheduledQuestions.map((q) => {
                          const estMinutes = getQuestionMinutes(q.id);

                          return (
                            <div
                              key={q.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, q.id, day.day)}
                              className="group relative rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-grab active:cursor-grabbing"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                                    {q.id.toUpperCase()}
                                  </span>
                                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                                    {q.category}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  {estMinutes}m
                                </span>
                              </div>

                              <p
                                className="mt-1.5 text-xs text-slate-800 font-medium line-clamp-2 leading-snug"
                                title={q.prompt}
                              >
                                {q.prompt}
                              </p>

                              {/* Accessible Quick-Move Dropdown */}
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">
                                  {q.difficulty === 3 ? '★★★ Level 3' : q.difficulty === 2 ? '★★☆ Level 2' : '★☆☆ Level 1'}
                                </span>

                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      moveTask(q.id, day.day, parseInt(e.target.value, 10));
                                    }
                                  }}
                                  className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none hover:bg-slate-100 cursor-pointer"
                                  title="Quick move to another day"
                                >
                                  <option value="">Move to...</option>
                                  {kit.schedule.days.map((d) => (
                                    <option key={d.day} value={d.day} disabled={d.day === day.day}>
                                      Day {d.day} ({getCalendarDateForDay(d.day)})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Column Footer */}
                    <div className="border-t border-slate-100 p-2 bg-slate-50/40 text-center">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Day {day.day} of {kit.schedule.days_available}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 2: Sequential List View (Original structured layout)
            =================================================================== */}
        {viewMode === 'list' && (
          <div className="mt-6 space-y-4">
            {kit.schedule.days.map((day) => {
              const scheduledQuestions = kit.questions.filter((q) =>
                day.question_ids.includes(q.id)
              );
              const calendarDate = getCalendarDateForDay(day.day);

              return (
                <div
                  key={day.day}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                        {String(day.day).padStart(2, '0')}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{day.focus}</h4>
                        <span className="text-xs text-slate-400">{calendarDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{day.minutes} Integer Minutes</span>
                      <span>·</span>
                      <span>{scheduledQuestions.length} Questions</span>
                    </div>
                  </div>

                  {/* Questions assigned for this day */}
                  <div className="mt-3 divide-y divide-slate-100">
                    {scheduledQuestions.length === 0 ? (
                      <p className="text-xs italic text-slate-400 py-1">
                        No questions assigned. High-yield concept revision and rehearsal time.
                      </p>
                    ) : (
                      scheduledQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="py-2.5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-1 rounded mt-0.5">
                              {q.id}
                            </span>
                            <div>
                              <p className="font-medium text-slate-800">{q.prompt}</p>
                              <span className="text-slate-400 capitalize">
                                {q.category} · Level {q.difficulty}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-slate-500">
                              {getQuestionMinutes(q.id)}m
                            </span>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  moveTask(q.id, day.day, parseInt(e.target.value, 10));
                                }
                              }}
                              className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none hover:bg-slate-50"
                            >
                              <option value="">Move...</option>
                              {kit.schedule.days.map((d) => (
                                <option key={d.day} value={d.day} disabled={d.day === day.day}>
                                  Day {d.day}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================================
            VIEW 3: Personal Interview Calendar (Manual Logging & Countdowns)
            =================================================================== */}
        {viewMode === 'interview_dates' && (
          <div className="mt-4">
            <PersonalInterviewCalendar
              kit={kit}
              onNavigateToChecklist={onNavigateToChecklist}
              onNavigateToMock={onNavigateToMock}
            />
          </div>
        )}
      </div>
    </div>
  );
};
