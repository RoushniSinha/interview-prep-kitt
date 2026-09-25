/**
 * Daily Practice Streak Tracker
 * Tracks consecutive days where the candidate completed at least one practice flashcard or mock interview session.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ActivityEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD in local time
  timestamp: string; // full ISO string
  type: 'flashcard' | 'mock_interview';
  kitId?: string;
  company?: string;
  notes?: string;
}

export interface DayStreakSummary {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  dayNumber: number; // 1-31
  isToday: boolean;
  practiced: boolean;
  flashcardCount: number;
  mockInterviewCount: number;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  hasPracticedToday: boolean;
  totalActivitiesCount: number;
  totalDaysPracticed: number;
  lastPracticedDate: string | null;
  recentWeek: DayStreakSummary[];
  activities: ActivityEntry[];
}

const STORAGE_KEY = 'aegis_prep_daily_activity_log';
const EVENT_NAME = 'aegis_activity_updated';

// Helper: Format date to local YYYY-MM-DD
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Load activities from localStorage
export function loadActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load activity log:', err);
  }
  return [];
}

// Save activity log
function saveActivityLog(logs: ActivityEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (err) {
    console.warn('Failed to save activity log:', err);
  }
}

/**
 * Record a flashcard or mock interview completion
 */
export function recordDailyActivity(
  type: 'flashcard' | 'mock_interview',
  meta: { kitId?: string; company?: string; notes?: string } = {}
): void {
  const currentLogs = loadActivityLog();
  const now = new Date();
  const dateStr = getLocalDateString(now);

  const newEntry: ActivityEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: dateStr,
    timestamp: now.toISOString(),
    type,
    kitId: meta.kitId,
    company: meta.company,
    notes: meta.notes,
  };

  const updated = [newEntry, ...currentLogs];
  // Retain up to 365 entries
  saveActivityLog(updated.slice(0, 365));
}

/**
 * Calculate streak and analytics from activity logs
 */
export function calculateStreakData(logs: ActivityEntry[] = loadActivityLog()): StreakData {
  const todayStr = getLocalDateString(new Date());

  // Group unique practiced dates
  const practicedDatesSet = new Set<string>();
  const dateCounts: Record<string, { flashcard: number; mock: number }> = {};

  logs.forEach((log) => {
    practicedDatesSet.add(log.date);
    if (!dateCounts[log.date]) {
      dateCounts[log.date] = { flashcard: 0, mock: 0 };
    }
    if (log.type === 'flashcard') {
      dateCounts[log.date].flashcard += 1;
    } else {
      dateCounts[log.date].mock += 1;
    }
  });

  const hasPracticedToday = practicedDatesSet.has(todayStr);

  // Compute Current Streak
  // If practiced today, start counting from today backwards.
  // If not practiced today, start checking from yesterday. If yesterday was practiced, streak is still alive!
  let currentStreak = 0;
  const cursorDate = new Date();

  if (!hasPracticedToday) {
    // Step back to yesterday
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  while (true) {
    const checkStr = getLocalDateString(cursorDate);
    if (practicedDatesSet.has(checkStr)) {
      currentStreak += 1;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Compute Best (Longest) All-Time Streak
  const sortedDates = Array.from(practicedDatesSet).sort(); // ascending 'YYYY-MM-DD'
  let bestStreak = 0;
  let tempStreak = 0;
  let previousDate: Date | null = null;

  for (const dStr of sortedDates) {
    const [y, m, d] = dStr.split('-').map(Number);
    const curr = new Date(y, m - 1, d);

    if (!previousDate) {
      tempStreak = 1;
    } else {
      const diffMs = curr.getTime() - previousDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    previousDate = curr;
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // Generate Recent 7-Day Window (Past 6 days + Today)
  const recentWeek: DayStreakSummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayCounts = dateCounts[dStr] || { flashcard: 0, mock: 0 };

    recentWeek.push({
      date: dStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: dStr === todayStr,
      practiced: practicedDatesSet.has(dStr),
      flashcardCount: dayCounts.flashcard,
      mockInterviewCount: dayCounts.mock,
    });
  }

  const sortedDescending = Array.from(practicedDatesSet).sort().reverse();
  const lastPracticedDate = sortedDescending[0] || null;

  return {
    currentStreak: Math.max(currentStreak, hasPracticedToday ? 1 : 0),
    bestStreak: Math.max(bestStreak, currentStreak),
    hasPracticedToday,
    totalActivitiesCount: logs.length,
    totalDaysPracticed: practicedDatesSet.size,
    lastPracticedDate,
    recentWeek,
    activities: logs.slice(0, 20),
  };
}

/**
 * React hook to listen for streak changes
 */
export function useDailyStreak(): {
  streak: StreakData;
  recordActivity: (type: 'flashcard' | 'mock_interview', meta?: { kitId?: string; company?: string }) => void;
  seedDemoStreak: () => void;
} {
  const [streak, setStreak] = useState<StreakData>(() => calculateStreakData());

  const refreshStreak = useCallback(() => {
    setStreak(calculateStreakData());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refreshStreak();
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshStreak]);

  // Seed demo data for first-time or preview testing
  const seedDemoStreak = useCallback(() => {
    const today = new Date();
    const demoEntries: ActivityEntry[] = [];

    // Seed 4 consecutive days including today
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);

      demoEntries.push({
        id: `demo_${Date.now()}_${i}_1`,
        date: dStr,
        timestamp: d.toISOString(),
        type: 'flashcard',
        company: 'Stripe',
        notes: 'Reviewed distributed architecture flashcards',
      });

      if (i % 2 === 0) {
        demoEntries.push({
          id: `demo_${Date.now()}_${i}_2`,
          date: dStr,
          timestamp: d.toISOString(),
          type: 'mock_interview',
          company: 'Stripe',
          notes: 'Mock interview on rate limiting algorithms',
        });
      }
    }

    saveActivityLog(demoEntries);
  }, []);

  return {
    streak,
    recordActivity: (type, meta) => recordDailyActivity(type, meta),
    seedDemoStreak,
  };
}
