import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  Video,
  Mic,
  Monitor,
  Building2,
  Coffee,
  Wifi,
  FileText,
  ExternalLink,
  ShieldCheck,
  Clock,
  Printer,
} from 'lucide-react';
import { Kit } from '../core/types';

interface ChecklistItem {
  id: string;
  category: 'environment' | 'technology' | 'company' | 'mindset';
  title: string;
  description: string;
  isCompleted: boolean;
  isCustom?: boolean;
}

interface InterviewDayChecklistProps {
  kit: Kit;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'isCompleted'>[] = [
  {
    id: 'c1',
    category: 'environment',
    title: 'Prepare background & workspace lighting',
    description: 'Ensure a clean, professional, distraction-free environment. Place light source in front of you to eliminate backlight shadows.',
  },
  {
    id: 'c2',
    category: 'technology',
    title: 'Test audio, microphone & webcam feed',
    description: 'Verify mic input clarity, test webcam framing at eye level, and use wired or stable headphones to eliminate room acoustic feedback.',
  },
  {
    id: 'c3',
    category: 'company',
    title: 'Review company mission & operating tenets',
    description: 'Ground yourself in the company values, product scope, and engineering architecture highlights documented in your Kit brief.',
  },
  {
    id: 'c4',
    category: 'environment',
    title: 'Stage fresh water & physical notepad',
    description: 'Place a glass of water nearby to keep vocal cords clear, alongside a pen and blank paper for rapid system design diagrams.',
  },
  {
    id: 'c5',
    category: 'technology',
    title: 'Verify internet stability & close resource-heavy apps',
    description: 'Close unnecessary browser tabs, Slack/Discord notifications, and ensure stable 5GHz Wi-Fi or Ethernet connection.',
  },
  {
    id: 'c6',
    category: 'mindset',
    title: 'Rehearse high-yield STAR & architecture stories',
    description: 'Mentally run through your 3 flagship stories: a complex incident recovery, a technical consensus battle, and a system scale win.',
  },
  {
    id: 'c7',
    category: 'environment',
    title: 'Log into video bridge 3 to 5 minutes early',
    description: 'Eliminate last-minute software update surprises or microphone permission popups by entering the waiting room early.',
  },
];

export const InterviewDayChecklist: React.FC<InterviewDayChecklistProps> = ({ kit }) => {
  const storageKey = `aegis_prep_checklist_${kit.source.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CHECKLIST.map((item) => ({ ...item, isCompleted: false }));
  });

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'environment' | 'technology' | 'company' | 'mindset'>('environment');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Storage unavailable fallback
    }
  }, [items, storageKey]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom_${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      description: 'Custom pre-interview task',
      isCompleted: false,
      isCustom: true,
    };

    setItems((prev) => [...prev, newItem]);
    setNewTitle('');
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMarkAllDone = () => {
    setItems((prev) => prev.map((item) => ({ ...item, isCompleted: true })));
  };

  const handleReset = () => {
    setItems(DEFAULT_CHECKLIST.map((item) => ({ ...item, isCompleted: false })));
  };

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter((item) => item.category === filterCategory);

  const getCategoryIcon = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'environment':
        return <Coffee className="h-4 w-4 text-amber-600" />;
      case 'technology':
        return <Video className="h-4 w-4 text-blue-600" />;
      case 'company':
        return <Building2 className="h-4 w-4 text-indigo-600" />;
      case 'mindset':
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Pre-Flight Protocol
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-mono text-slate-500">{kit.source.company} Interview</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Interview Day Checklist & Readiness Verification
            </h2>
            <p className="text-xs text-slate-500">
              Systematic pre-interview checklist to eliminate technical friction, calibrate your environment, and ground yourself in company context before connecting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllDone}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Mark All Done
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
              title="Reset to default items"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Readiness Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-2xl font-extrabold text-slate-900">
                  {percentComplete}%
                </span>
                <span className="text-xs text-slate-500">
                  ({completedCount} of {totalCount} items verified)
                </span>
              </div>
            </div>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              percentComplete === 100
                ? 'bg-emerald-100 text-emerald-800'
                : percentComplete >= 60
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {percentComplete === 100
                ? '✓ Fully Prepared to Connect'
                : percentComplete >= 60
                ? 'Good Progress — Final Checks Remaining'
                : 'Pending Pre-Interview Setup'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                percentComplete === 100
                  ? 'bg-emerald-500'
                  : percentComplete >= 60
                  ? 'bg-indigo-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Quick Company Mission Anchor Card */}
        {kit.company_brief && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Company Mission & Target Culture Anchor ({kit.source.company})</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
              <strong>Core Mission:</strong> {kit.company_brief.summary}
            </p>
            {kit.company_brief.what_they_do && (
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                <strong>What They Do:</strong> {kit.company_brief.what_they_do}
              </p>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'environment', label: 'Environment & Space' },
              { id: 'technology', label: 'Audio & Video Tech' },
              { id: 'company', label: 'Company Context' },
              { id: 'mindset', label: 'Rehearsal & Mindset' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  filterCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredItems.length} items
          </span>
        </div>

        {/* Checklist Items */}
        <div className="mt-4 space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`group flex items-start justify-between gap-3 rounded-xl border p-3.5 transition cursor-pointer select-none ${
                item.isCompleted
                  ? 'border-emerald-200 bg-emerald-50/25 text-slate-700'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItem(item.id);
                  }}
                  className="mt-0.5 text-slate-400 group-hover:text-slate-600 transition shrink-0"
                >
                  {item.isCompleted ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {item.title}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 capitalize">
                      {getCategoryIcon(item.category)}
                      <span>{item.category}</span>
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${item.isCompleted ? 'text-slate-400' : 'text-slate-600'} leading-snug`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {item.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="text-slate-300 hover:text-rose-600 transition p-1"
                  title="Remove custom task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Custom Item Form */}
        <form onSubmit={handleAddItem} className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
          <span className="text-xs font-semibold text-slate-700 block">Add Custom Pre-Interview Task</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Review system design trade-offs for distributed cache..."
              className="flex-1 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="environment">Environment</option>
              <option value="technology">Technology</option>
              <option value="company">Company</option>
              <option value="mindset">Mindset</option>
            </select>

            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
