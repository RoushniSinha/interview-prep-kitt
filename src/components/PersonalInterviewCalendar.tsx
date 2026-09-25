import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Bell,
  BellRing,
  ExternalLink,
  Download,
  Video,
  User,
  Sparkles,
  Timer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Kit } from '../core/types';

export interface LoggedInterview {
  id: string;
  roundTitle: string;
  stage: 'Recruiter Screen' | 'Technical / Coding' | 'System Architecture' | 'Behavioral / Values' | 'Executive Onsite' | 'Final Round';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  interviewerNames?: string;
  meetingLink?: string;
  prepNotes?: string;
  isCompleted?: boolean;
}

interface PersonalInterviewCalendarProps {
  kit: Kit;
  onNavigateToChecklist?: () => void;
  onNavigateToMock?: () => void;
}

export const PersonalInterviewCalendar: React.FC<PersonalInterviewCalendarProps> = ({
  kit,
  onNavigateToChecklist,
  onNavigateToMock,
}) => {
  const storageKey = `aegis_personal_interviews_${kit.source.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const [interviews, setInterviews] = useState<LoggedInterview[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default sample for first view
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const dateStr = defaultDate.toISOString().split('T')[0];

    return [
      {
        id: 'int_default_1',
        roundTitle: `${kit.source.company} · System Architecture & Scalability Round`,
        stage: 'System Architecture',
        date: dateStr,
        time: '14:30',
        interviewerNames: 'Staff Platform Engineer & Engineering Manager',
        meetingLink: 'https://meet.google.com/xyz-prep-demo',
        prepNotes: 'Focus on distributed cache invalidation, database sharding trade-offs, and STAR leadership stories.',
        isCompleted: false,
      },
    ];
  });

  const [isAddingInterview, setIsAddingInterview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  // Form states
  const [roundTitle, setRoundTitle] = useState('');
  const [stage, setStage] = useState<LoggedInterview['stage']>('Technical / Coding');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [interviewerNames, setInterviewerNames] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [prepNotes, setPrepNotes] = useState('');

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(interviews));
    } catch {}
  }, [interviews, storageKey]);

  // Request browser notification permission
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatusMsg('Browser notifications are not supported in this browser.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        setNotificationStatusMsg('✓ Automated browser reminders enabled for upcoming interviews.');
        new Notification(`AegisOps Interview Calendar`, {
          body: `Reminders enabled for your upcoming ${kit.source.company} interview rounds!`,
          icon: '/favicon.ico',
        });
      } else {
        setNotificationStatusMsg('Notification permissions denied.');
      }
    } catch {
      setNotificationStatusMsg('Unable to request notifications.');
    }

    setTimeout(() => setNotificationStatusMsg(null), 4000);
  };

  // Helper: compute human countdown
  const getCountdown = (dateStr: string, timeStr: string) => {
    const target = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (diffMs < -2 * 60 * 60 * 1000) {
      return { text: 'Past Event', isUrgent: false, isPast: true, hoursLeft: -1 };
    }
    if (diffMs <= 0 && diffMs >= -2 * 60 * 60 * 1000) {
      return { text: 'Interview In Progress Now!', isUrgent: true, isPast: false, hoursLeft: 0 };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h away`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m away`;
    } else {
      text = `Starts in ${minutes}m!`;
    }

    const isUrgent = totalHours <= 24;
    return { text, isUrgent, isPast: false, hoursLeft: totalHours };
  };

  const handleSaveInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundTitle.trim() || !date) return;

    if (editingId) {
      setInterviews((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                roundTitle: roundTitle.trim(),
                stage,
                date,
                time,
                interviewerNames: interviewerNames.trim(),
                meetingLink: meetingLink.trim(),
                prepNotes: prepNotes.trim(),
              }
            : item
        )
      );
      setEditingId(null);
    } else {
      const newInterview: LoggedInterview = {
        id: `int_${Date.now()}`,
        roundTitle: roundTitle.trim(),
        stage,
        date,
        time,
        interviewerNames: interviewerNames.trim(),
        meetingLink: meetingLink.trim(),
        prepNotes: prepNotes.trim(),
        isCompleted: false,
      };
      setInterviews((prev) => [...prev, newInterview]);
    }

    // Reset Form
    setRoundTitle('');
    setDate('');
    setTime('10:00');
    setInterviewerNames('');
    setMeetingLink('');
    setPrepNotes('');
    setIsAddingInterview(false);
  };

  const handleStartEdit = (item: LoggedInterview) => {
    setEditingId(item.id);
    setRoundTitle(item.roundTitle);
    setStage(item.stage);
    setDate(item.date);
    setTime(item.time || '10:00');
    setInterviewerNames(item.interviewerNames || '');
    setMeetingLink(item.meetingLink || '');
    setPrepNotes(item.prepNotes || '');
    setIsAddingInterview(true);
  };

  const handleDelete = (id: string) => {
    setInterviews((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setInterviews((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isCompleted: !i.isCompleted } : i))
    );
  };

  // Export event as .ics iCalendar file
  const handleExportICS = (item: LoggedInterview) => {
    const startDate = new Date(`${item.date}T${item.time || '09:00'}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1-hour slot

    const formatDateForICS = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AegisOps//Personal Interview Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${item.id}@aegisops.io`,
      `DTSTAMP:${formatDateForICS(new Date())}`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${item.roundTitle}`,
      `DESCRIPTION:${item.prepNotes || 'Interview round preparation via AegisOps Kit'}`,
      item.meetingLink ? `LOCATION:${item.meetingLink}` : `LOCATION:${kit.source.company}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${item.roundTitle} starts in 30 minutes!`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${kit.source.company.toLowerCase()}_${item.stage.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Sort upcoming chronologically
  const sortedInterviews = [...interviews].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return timeA - timeB;
  });

  const nextUpcoming = sortedInterviews.find((i) => !i.isCompleted && !getCountdown(i.date, i.time).isPast);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Candidate Operations Hub
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">{kit.source.company} Rounds</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Personal Interview Calendar & Real-Time Countdowns
            </h2>
            <p className="text-xs text-slate-500">
              Log your real-world interview dates, track automated milestone countdowns, and export calendar invites with synchronized pre-interview reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                title="Enable desktop notifications for upcoming interviews"
              >
                <Bell className="h-3.5 w-3.5 text-indigo-600" />
                <span>Enable Reminders</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
                <BellRing className="h-3.5 w-3.5 text-emerald-600" />
                <span>Reminders Active</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setRoundTitle('');
                setDate('');
                setTime('10:00');
                setInterviewerNames('');
                setMeetingLink('');
                setPrepNotes('');
                setIsAddingInterview(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Interview Date</span>
            </button>
          </div>
        </div>

        {notificationStatusMsg && (
          <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs text-indigo-800">
            {notificationStatusMsg}
          </div>
        )}

        {/* Immediate Next Interview Milestone Banner */}
        {nextUpcoming && (
          <div className="mt-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Timer className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    Next Real-World Interview Milestone
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {nextUpcoming.roundTitle}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {new Date(nextUpcoming.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at {nextUpcoming.time}
                    {nextUpcoming.interviewerNames && ` · Panel: ${nextUpcoming.interviewerNames}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-mono text-xl font-extrabold text-indigo-900">
                    {getCountdown(nextUpcoming.date, nextUpcoming.time).text}
                  </span>
                  <span className="block text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                    Automated Countdown
                  </span>
                </div>

                {nextUpcoming.meetingLink && (
                  <a
                    href={nextUpcoming.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Join Link</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Actions for Next Interview */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-indigo-100 pt-3 text-xs">
              <span className="text-slate-500 font-medium">Recommended Prep Protocol:</span>
              {onNavigateToChecklist && (
                <button
                  onClick={onNavigateToChecklist}
                  className="flex items-center gap-1 text-indigo-700 font-semibold hover:underline"
                >
                  <span>Verify Audio/Video & Checklist</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
              {onNavigateToMock && (
                <button
                  onClick={onNavigateToMock}
                  className="flex items-center gap-1 text-indigo-700 font-semibold hover:underline"
                >
                  <span>Rehearse Mock Answers</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal / Form to Log New or Edit Interview */}
        {isAddingInterview && (
          <form
            onSubmit={handleSaveInterview}
            className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-xs animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Scheduled Interview Round' : 'Log Upcoming Real-World Interview Date'}
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingInterview(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Interview Title / Round Name *</label>
                <input
                  type="text"
                  required
                  value={roundTitle}
                  onChange={(e) => setRoundTitle(e.target.value)}
                  placeholder={`e.g., ${kit.source.company} Round 2: System Architecture & Scalability`}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Interview Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="Recruiter Screen">Recruiter Screen</option>
                  <option value="Technical / Coding">Technical / Coding</option>
                  <option value="System Architecture">System Architecture</option>
                  <option value="Behavioral / Values">Behavioral / Values</option>
                  <option value="Executive Onsite">Executive Onsite</option>
                  <option value="Final Round">Final Round</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Interviewer Names / Panel (Optional)</label>
                <input
                  type="text"
                  value={interviewerNames}
                  onChange={(e) => setInterviewerNames(e.target.value)}
                  placeholder="e.g., Sarah Chen (Staff Eng) & Alex Miller (EM)"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Meeting Link / Bridge (Optional)</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="e.g., https://meet.google.com/abc-defg-hij"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Key Preparation Notes & Focus</label>
                <textarea
                  rows={2}
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="e.g., Emphasize Kafka partitioning, idempotency keys, and cross-functional leadership example..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingInterview(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                {editingId ? 'Update Interview' : 'Save Interview Date'}
              </button>
            </div>
          </form>
        )}

        {/* List of Scheduled Interviews */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Scheduled Rounds ({sortedInterviews.length})</span>
            <span className="text-[11px] text-slate-400">Click iCal icon to export to Google / Apple Calendar</span>
          </div>

          {sortedInterviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No interview dates logged yet. Click <strong>"Log Interview Date"</strong> above to schedule your real-world interview countdowns.
            </div>
          ) : (
            sortedInterviews.map((item) => {
              const countdown = getCountdown(item.date, item.time);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition ${
                    item.isCompleted
                      ? 'border-slate-200 bg-slate-50/50 opacity-70'
                      : countdown.isUrgent
                      ? 'border-amber-300 bg-amber-50/30 shadow-2xs'
                      : 'border-slate-200 bg-white shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item.id)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition shrink-0"
                      title={item.isCompleted ? 'Mark as upcoming' : 'Mark as completed'}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          item.isCompleted
                            ? 'text-emerald-600 fill-emerald-100'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            item.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {item.roundTitle}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.stage}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          {item.date} at {item.time}
                        </span>

                        {item.interviewerNames && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {item.interviewerNames}
                          </span>
                        )}

                        {item.meetingLink && (
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Meeting Link</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {item.prepNotes && (
                        <p className="mt-1.5 text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                          {item.prepNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side: Countdown and Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                    <div className="text-left sm:text-right">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold font-mono inline-block ${
                          item.isCompleted
                            ? 'bg-slate-100 text-slate-500'
                            : countdown.isPast
                            ? 'bg-slate-100 text-slate-400'
                            : countdown.isUrgent
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {item.isCompleted ? '✓ Completed' : countdown.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleExportICS(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Download .ics Calendar Invite"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Edit round"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                        title="Delete round"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
