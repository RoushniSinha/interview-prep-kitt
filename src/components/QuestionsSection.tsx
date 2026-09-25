import React, { useState, useMemo } from 'react';
import {
  Pin,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  Plus,
  Sparkles,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Layers,
  CheckCircle2,
  Zap,
  Filter,
} from 'lucide-react';
import { Kit, Question, KitDraftState, QuestionCategory } from '../core/types';
import {
  CATEGORY_DEFINITIONS,
  SubcategoryMeta,
  canonicalizeSubcategory,
  mapSeniorityToTargetDifficulty,
  getDifficultyLevelLabel,
  matchSubcategory,
} from '../services/expertQuestionService';

interface QuestionsSectionProps {
  kit: Kit;
  draftState: KitDraftState;
  onUpdateQuestions: (questions: Question[], action?: string, entityId?: string) => void;
  onRegenerateCategory: (category: string, subcategory?: string) => void;
  onGenerateBatch?: (options: { category?: string; subcategory?: string; count: number; seniority?: string }) => Promise<void>;
  onTogglePin: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  isRegenerating?: boolean;
  regenerationError?: string | null;
  onClearRegenerationError?: () => void;
  onValidateAnswer?: (questionId: string, prompt?: string, answer?: string) => Promise<any>;
}

const HEAD_CATEGORIES: QuestionCategory[] = ['technical', 'system-design', 'behavioural', 'company-fit'];

export const QuestionsSection: React.FC<QuestionsSectionProps> = ({
  kit,
  draftState,
  onUpdateQuestions,
  onRegenerateCategory,
  onGenerateBatch,
  onTogglePin,
  onDeleteQuestion,
  isRegenerating,
  regenerationError,
  onClearRegenerationError,
  onValidateAnswer,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('technical');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  // Per-subcategory state management
  const [regeneratingSubcategory, setRegeneratingSubcategory] = useState<string | null>(null);
  const [expandingSubcategory, setExpandingSubcategory] = useState<string | null>(null);
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Record<string, boolean>>({});

  // Google Search Validation state
  const [validatingQuestionId, setValidatingQuestionId] = useState<string | null>(null);
  const [validationSuccessId, setValidationSuccessId] = useState<string | null>(null);

  // Expanded answer states
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Question editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editExpertAnswer, setEditExpertAnswer] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');

  // Add question form state
  const [isAdding, setIsAdding] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newExpertAnswer, setNewExpertAnswer] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<1 | 2 | 3>(2);
  const [newSubcategory, setNewSubcategory] = useState<string>('');
  const [newReqId, setNewReqId] = useState<string>(kit.role.requirements[0]?.id || 'r1');

  // Batch generation state
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // Available subcategories for the active head category
  const activeSubcategories = useMemo((): SubcategoryMeta[] => {
    if (activeCategory === 'all') {
      const allSubs: SubcategoryMeta[] = [];
      HEAD_CATEGORIES.forEach((cat) => {
        CATEGORY_DEFINITIONS[cat]?.subcategories.forEach((s) => allSubs.push(s));
      });
      return allSubs;
    }
    const cat = activeCategory as QuestionCategory;
    return CATEGORY_DEFINITIONS[cat]?.subcategories || [];
  }, [activeCategory]);

  const toggleAnswerExpanded = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (q: Question) => {
    let text = `Question: ${q.prompt}\nCategory: ${q.category} > ${q.subcategory || 'General'}\nLevel: ${q.difficulty}\n\nEvaluator Outline:\n${q.answer_outline}`;
    if (q.expert_answer) {
      text += `\n\nExpert Answer:\n${q.expert_answer}`;
    }
    if (q.citations && q.citations.length > 0) {
      text += `\n\nAuthoritative Citations & Literature:\n` + q.citations.map((c) => `- ${c.title} (${c.source})${c.url ? ' ' + c.url : ''}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditPrompt(q.prompt);
    setEditAnswer(q.answer_outline);
    setEditExpertAnswer(q.expert_answer || '');
    setEditSubcategory(q.subcategory || '');
  };

  const saveEdit = (q: Question) => {
    const trimmedPrompt = editPrompt.trim() || q.prompt;
    const trimmedAnswer = editAnswer.trim() || q.answer_outline;
    const isModified =
      trimmedPrompt !== q.prompt ||
      trimmedAnswer !== q.answer_outline ||
      editExpertAnswer !== (q.expert_answer || '') ||
      editSubcategory !== (q.subcategory || '');

    const updated = kit.questions.map((item) => {
      if (item.id === q.id) {
        return {
          ...item,
          prompt: trimmedPrompt,
          answer_outline: trimmedAnswer,
          expert_answer: editExpertAnswer.trim() || undefined,
          subcategory: editSubcategory.trim() || item.subcategory,
          isEdited: isModified ? true : item.isEdited,
        };
      }
      return item;
    });

    onUpdateQuestions(updated, 'edit', q.id);
    setEditingQuestionId(null);
  };

  const handleSelectCategory = (cat: string) => {
    if (editingQuestionId) {
      const q = kit.questions.find((item) => item.id === editingQuestionId);
      if (q) saveEdit(q);
    }
    setActiveCategory(cat);
    setSelectedSubcategory('all');
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    const maxNum = kit.questions.reduce((max, q) => {
      const m = q.id.match(/\d+/);
      return m ? Math.max(max, parseInt(m[0], 10)) : max;
    }, 0);
    const nextId = `q${maxNum + 1}`;

    const targetCat: QuestionCategory = (activeCategory === 'all' ? 'technical' : activeCategory) as QuestionCategory;
    const chosenSub =
      newSubcategory ||
      (selectedSubcategory !== 'all' ? selectedSubcategory : activeSubcategories[0]?.name || 'General');

    const newQuestion: Question = {
      id: nextId,
      requirement_ids: [newReqId],
      category: targetCat,
      subcategory: chosenSub,
      prompt: newPrompt.trim(),
      answer_outline: newAnswer.trim() || 'Evaluator outline: Core architecture, trade-offs, and failure mitigations.',
      expert_answer: newExpertAnswer.trim() || undefined,
      difficulty: newDifficulty,
      isCustom: true,
      isPinned: true,
    };

    onUpdateQuestions([...kit.questions, newQuestion], 'add_custom', nextId);
    setIsAdding(false);
    setNewPrompt('');
    setNewAnswer('');
    setNewExpertAnswer('');
    setNewSubcategory('');
  };

  const handleTriggerBatchGeneration = async (count: number, specificSubcategory?: string) => {
    setIsGeneratingBatch(true);
    setBatchSuccessMsg(null);
    try {
      const sub = specificSubcategory || (selectedSubcategory !== 'all' ? selectedSubcategory : undefined);
      const canonSub = sub ? canonicalizeSubcategory(sub) : undefined;
      if (onGenerateBatch) {
        await onGenerateBatch({
          category: activeCategory === 'all' ? undefined : activeCategory,
          subcategory: canonSub,
          count,
          seniority: kit.role.seniority,
        });
      } else {
        // Fallback directly to client-side batch generator
        const { generateExpandedBatch } = await import('../services/expertQuestionService');
        const maxNum = kit.questions.reduce((max, q) => {
          const m = q.id.match(/\d+/);
          return m ? Math.max(max, parseInt(m[0], 10)) : max;
        }, 0);

        const newBatch = generateExpandedBatch({
          category: activeCategory === 'all' ? undefined : (activeCategory as QuestionCategory),
          subcategory: canonSub,
          count,
          requirements: kit.role.requirements,
          companyName: kit.source.company || 'Enterprise Partner',
          roleTitle: kit.role.title || 'Senior Software Engineer',
          seniority: kit.role.seniority || 'Senior',
          startIndex: maxNum + 1,
        });

        onUpdateQuestions([...kit.questions, ...newBatch], 'add_custom');
      }

      setBatchSuccessMsg(
        `Successfully generated and saved ${count} questions calibrated for ${kit.role.seniority || 'Role'} level with expert answers and verified citations!`
      );
      setTimeout(() => setBatchSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Batch generation failed:', err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Dedicated per-subcategory regeneration
  const handleRegenerateSubcategory = async (subName: string) => {
    setRegeneratingSubcategory(subName);
    setBatchSuccessMsg(null);
    try {
      await onRegenerateCategory(activeCategory, subName);
      setBatchSuccessMsg(
        `Subcategory "${subName}" regenerated successfully with verified expert citations! All other subcategories and edits remain preserved.`
      );
      setTimeout(() => setBatchSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to regenerate subcategory:', err);
    } finally {
      setRegeneratingSubcategory(null);
    }
  };

  // Dedicated per-subcategory expansion (+5 or +10)
  const handleExpandSubcategory = async (subName: string, count: number) => {
    setExpandingSubcategory(subName);
    setBatchSuccessMsg(null);
    try {
      await handleTriggerBatchGeneration(count, subName);
      setBatchSuccessMsg(
        `Added ${count} authoritative questions with deep solutions and literature citations to "${subName}".`
      );
      setTimeout(() => setBatchSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to expand subcategory:', err);
    } finally {
      setExpandingSubcategory(null);
    }
  };

  const toggleSubcategoryCollapse = (subName: string) => {
    setCollapsedSubcategories((prev) => ({
      ...prev,
      [subName]: !prev[subName],
    }));
  };

  // Live Google Search Validation for an answer
  const handleTriggerGoogleSearchValidation = async (q: Question) => {
    setValidatingQuestionId(q.id);
    try {
      if (onValidateAnswer) {
        await onValidateAnswer(q.id, q.prompt, q.expert_answer || q.answer_outline);
      } else {
        const { validateAndEnrichExpertAnswer } = await import('../services/searchValidationService');
        const validation = await validateAndEnrichExpertAnswer({
          prompt: q.prompt,
          answer: q.expert_answer || q.answer_outline,
          category: q.category,
          subcategory: q.subcategory,
          existingCitations: q.citations,
        });
        const updated = kit.questions.map((item) => {
          if (item.id === q.id) {
            return {
              ...item,
              expert_answer: validation.validatedAnswer,
              citations: validation.citations,
            };
          }
          return item;
        });
        onUpdateQuestions(updated, 'edit', q.id);
      }

      setValidationSuccessId(q.id);
      setExpandedAnswers((prev) => ({ ...prev, [q.id]: true }));
      setTimeout(() => setValidationSuccessId(null), 4000);
    } catch (err: any) {
      console.error('Validation error:', err);
    } finally {
      setValidatingQuestionId(null);
    }
  };

  // Filter questions according to active filters
  const filteredQuestions = useMemo(() => {
    return kit.questions.filter((q) => {
      // Category filter
      if (activeCategory !== 'all' && q.category !== activeCategory) {
        return false;
      }
      // Subcategory filter with canonical matching
      if (selectedSubcategory !== 'all') {
        const qSub = canonicalizeSubcategory(q.subcategory);
        const selSub = canonicalizeSubcategory(selectedSubcategory);
        if (qSub !== selSub && !matchSubcategory(selectedSubcategory, q.subcategory)) {
          return false;
        }
      }
      // Difficulty filter
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPrompt = q.prompt.toLowerCase().includes(query);
        const matchesOutline = q.answer_outline.toLowerCase().includes(query);
        const matchesSub = q.subcategory?.toLowerCase().includes(query);
        const matchesExpert = q.expert_answer?.toLowerCase().includes(query);
        const matchesCitations = q.citations?.some(
          (c) => c.title.toLowerCase().includes(query) || c.source.toLowerCase().includes(query)
        );
        if (!matchesPrompt && !matchesOutline && !matchesSub && !matchesExpert && !matchesCitations) {
          return false;
        }
      }
      return true;
    });
  }, [kit.questions, activeCategory, selectedSubcategory, difficultyFilter, searchQuery]);

  // Grouped questions by subcategory for Grouped View (canonicalized to prevent fragmented groups)
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Question[]> = {};
    filteredQuestions.forEach((q) => {
      const sub = canonicalizeSubcategory(q.subcategory) || 'General Competencies';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(q);
    });
    return groups;
  }, [filteredQuestions]);

  return (
    <div className="space-y-6">
      {/* Regeneration / Generation Banners */}
      {(isRegenerating || isGeneratingBatch) && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/80 backdrop-blur-sm p-4 text-xs text-indigo-900 shadow-sm animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-indigo-950">
              Generating expert question matrix with verified literature citations...
            </p>
            <p className="text-indigo-700 text-[11px] mt-0.5">
              Strict multi-tier persistence active: Custom questions, user edits, and pin protections are preserved across Cloud Firestore, IndexedDB, and server stores.
            </p>
          </div>
        </div>
      )}

      {batchSuccessMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 backdrop-blur-sm p-3.5 text-xs text-emerald-900 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="font-medium">{batchSuccessMsg}</p>
        </div>
      )}

      {regenerationError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm">
          <div>
            <p className="font-semibold text-rose-950">Generation Notice</p>
            <p className="text-rose-700 text-[11px] mt-0.5">{regenerationError}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRegenerateCategory(activeCategory)}
              className="rounded bg-rose-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-800 transition"
            >
              Retry
            </button>
            {onClearRegenerationError && (
              <button
                onClick={onClearRegenerationError}
                className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-100 transition"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Head Category Segmented Tabs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              All Categories ({kit.questions.length})
            </button>
            {HEAD_CATEGORIES.map((cat) => {
              const count = kit.questions.filter((q) => q.category === cat).length;
              const isActive = activeCategory === cat;
              const meta = CATEGORY_DEFINITIONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{meta?.name || cat.replace('-', ' ')}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Custom Question</span>
            </button>
          </div>
        </div>

        {/* Subcategories Filter Chips */}
        {activeSubcategories.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Subcategory:
            </span>
            <button
              onClick={() => setSelectedSubcategory('all')}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                selectedSubcategory === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              All Subcategories ({activeCategory === 'all' ? kit.questions.length : kit.questions.filter((q) => q.category === activeCategory).length})
            </button>
            {activeSubcategories.map((sub) => {
              const count = kit.questions.filter((q) => q.subcategory === sub.name).length;
              const isSelected = selectedSubcategory === sub.name;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.name)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-700 text-white font-medium shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                  title={sub.description}
                >
                  <span>{sub.name}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Volume Generator & Controls Toolbar */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-sky-50/90 backdrop-blur-md p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Expanded Question Matrix Generator
              </h4>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                Peer-Reviewed Citations
              </span>
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-900 border border-purple-200 shadow-2xs">
                🎯 Calibrated for: {kit.role.seniority || 'Senior'} (Level {mapSeniorityToTargetDifficulty(kit.role.seniority, kit.role.title)})
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Generating interview-grade questions calibrated directly for <strong className="text-slate-800">{kit.role.title} ({kit.role.seniority || 'Senior'})</strong> with deep answers, rubrics, and literature citations.
            </p>
          </div>

          {/* Preset Generation Count Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Generate Bundle:</span>
            <button
              onClick={() => handleTriggerBatchGeneration(10)}
              disabled={isGeneratingBatch || isRegenerating}
              className="flex items-center gap-1 rounded-xl bg-white border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-900 shadow-xs hover:bg-indigo-50 hover:border-indigo-300 transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>+10 Questions</span>
            </button>

            <button
              onClick={() => handleTriggerBatchGeneration(25)}
              disabled={isGeneratingBatch || isRegenerating}
              className="flex items-center gap-1 rounded-xl bg-white border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-900 shadow-xs hover:bg-indigo-50 hover:border-indigo-300 transition disabled:opacity-50"
              title="20–30 Questions Standard Deep Dive"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>+25 Questions (20–30)</span>
            </button>

            <button
              onClick={() => handleTriggerBatchGeneration(35)}
              disabled={isGeneratingBatch || isRegenerating}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
              title="30–40 Questions Master Prep Vault"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>+35 Questions (30–40)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search, Difficulty, and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, subcategories, expert answers, or citations..."
            className="w-full rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            {(['all', 1, 2, 3] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  difficultyFilter === diff
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {diff === 'all' ? 'All Levels' : `L${diff}`}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`rounded-md px-2.5 py-1 font-medium transition flex items-center gap-1 ${
                viewMode === 'grouped' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>By Subcategory</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flat List
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Question Form */}
      {isAdding && (
        <form
          onSubmit={handleAddQuestion}
          className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Create Custom Question ({activeCategory})
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Subcategory</label>
              <input
                type="text"
                value={newSubcategory}
                onChange={(e) => setNewSubcategory(e.target.value)}
                placeholder="e.g. Concurrency & Thread Safety"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Difficulty Level</label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(parseInt(e.target.value, 10) as 1 | 2 | 3)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={1}>Level 1: Junior / Warm-up (15m)</option>
                <option value={2}>Level 2: Mid-level / Core (30m)</option>
                <option value={3}>Level 3: Senior / Architectural (45m)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Linked Requirement</label>
              <select
                value={newReqId}
                onChange={(e) => setNewReqId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {kit.role.requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.text.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Question Prompt</label>
            <textarea
              required
              rows={2}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. How do you design an event-driven system with guaranteed at-least-once delivery and idempotency?"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Evaluator Rubric Outline</label>
            <textarea
              rows={2}
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="What a high-scoring candidate mentions..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Expert Answer (Optional Deep Technical Solution)</label>
            <textarea
              rows={3}
              value={newExpertAnswer}
              onChange={(e) => setNewExpertAnswer(e.target.value)}
              placeholder="Detailed architectural breakdown, step-by-step reasoning, invariants, and trade-offs..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Save Question
            </button>
          </div>
        </form>
      )}

      {/* Question Cards Renderer */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-700">No questions found matching criteria</h4>
          <p className="mt-1 text-xs text-slate-500">
            Generate questions using the bundle generator above or adjust your search filter.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => handleTriggerBatchGeneration(10)}
              className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              Generate 10 Questions
            </button>
          </div>
        </div>
      ) : viewMode === 'grouped' ? (
        // Grouped By Subcategory
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([subName, questions]) => {
            const isSubRegenerating = regeneratingSubcategory === subName;
            const isSubExpanding = expandingSubcategory === subName;
            const isCollapsed = Boolean(collapsedSubcategories[subName]);
            const subMeta = activeSubcategories.find(
              (s) => s.name === subName || s.name.toLowerCase() === subName.toLowerCase()
            );

            return (
              <div
                key={subName}
                className="rounded-2xl border border-slate-200/90 bg-white/85 backdrop-blur-md p-5 shadow-sm space-y-4 transition"
              >
                {/* Subcategory Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleSubcategoryCollapse(subName)}
                      className="text-slate-400 hover:text-slate-700 transition"
                      title={isCollapsed ? 'Expand subcategory' : 'Collapse subcategory'}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{subName}</h3>
                        <span className="text-xs text-slate-500 font-mono font-medium">({questions.length} questions)</span>
                        {isSubRegenerating && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Regenerating subcategory...
                          </span>
                        )}
                        {isSubExpanding && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                            <Plus className="h-3 w-3 animate-spin" /> Expanding subcategory...
                          </span>
                        )}
                      </div>

                      {/* Level Calibration & Target Role Info */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                          Role: {kit.role.seniority || 'Senior'} ({kit.role.title})
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 font-medium">
                          {(() => {
                            const targetDiff = mapSeniorityToTargetDifficulty(kit.role.seniority, kit.role.title);
                            const matchingCount = questions.filter((q) => q.difficulty === targetDiff).length;
                            const l1 = questions.filter((q) => q.difficulty === 1).length;
                            const l2 = questions.filter((q) => q.difficulty === 2).length;
                            const l3 = questions.filter((q) => q.difficulty === 3).length;
                            return (
                              <>
                                <span>Level Calibration: </span>
                                {l1 > 0 && <span className="text-emerald-700 font-semibold">{l1} L1 (Junior) </span>}
                                {l2 > 0 && <span className="text-indigo-700 font-semibold">{l2} L2 (Mid) </span>}
                                {l3 > 0 && <span className="text-purple-700 font-semibold">{l3} L3 (Senior/Staff)</span>}
                                <span className="text-slate-400 font-normal"> ({matchingCount} calibrated for target level)</span>
                              </>
                            );
                          })()}
                        </span>
                        {subMeta?.primaryLiterature && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500">
                              Literature: <span className="font-medium text-slate-700">{subMeta.primaryLiterature}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subcategory Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRegenerateSubcategory(subName)}
                      disabled={isSubRegenerating || isRegenerating}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      title={`Regenerate questions strictly for "${subName}". Preserves your edits and pins in this subcategory, and leaves all other subcategories untouched.`}
                    >
                      <RefreshCw className={`h-3 w-3 text-indigo-600 ${isSubRegenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate Subcategory</span>
                    </button>

                    <button
                      onClick={() => handleExpandSubcategory(subName, 5)}
                      disabled={isSubExpanding || isGeneratingBatch}
                      className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      title={`Add +5 more verified questions to "${subName}"`}
                    >
                      <Plus className="h-3 w-3 text-indigo-600" />
                      <span>+5</span>
                    </button>

                    <button
                      onClick={() => handleExpandSubcategory(subName, 10)}
                      disabled={isSubExpanding || isGeneratingBatch}
                      className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 transition shadow-2xs"
                      title={`Add +10 deep architectural questions to "${subName}"`}
                    >
                      <Plus className="h-3 w-3 text-purple-600" />
                      <span>+10</span>
                    </button>
                  </div>
                </div>

                {/* Question items within this subcategory */}
                {!isCollapsed && (
                  <div className="space-y-3.5">
                    {questions.map((q) => renderQuestionCard(q))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Flat List View
        <div className="space-y-3.5">
          {filteredQuestions.map((q) => renderQuestionCard(q))}
        </div>
      )}
    </div>
  );

  function renderQuestionCard(q: Question) {
    const meta = draftState.items[q.id];
    const isCustom = q.isCustom || meta?.origin === 'pinned';
    const isEdited = q.isEdited || meta?.origin === 'edited';
    const isPinned = q.isPinned;
    const isEditing = editingQuestionId === q.id;
    const isExpanded = !!expandedAnswers[q.id];
    const hasExpertAnswer = !!q.expert_answer;
    const hasCitations = q.citations && q.citations.length > 0;
    const isValidating = validatingQuestionId === q.id;
    const isValidationSuccess = validationSuccessId === q.id;

    return (
      <div
        key={q.id}
        className={`rounded-xl border p-4.5 transition ${
          isEditing
            ? 'border-indigo-400 bg-white shadow-md'
            : isPinned
            ? 'border-amber-200/90 bg-amber-50/20'
            : 'border-slate-200/90 bg-white/95 hover:border-slate-300 shadow-xs'
        }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              {q.id}
            </span>

            {/* Subcategory Chip */}
            {q.subcategory && (
              <span className="font-semibold text-indigo-700 bg-indigo-50/90 border border-indigo-100 px-2 py-0.5 rounded">
                {q.subcategory}
              </span>
            )}

            <span className="text-slate-300">·</span>

            {/* Interview Level & Role Calibration Badge */}
            {(() => {
              const info = getDifficultyLevelLabel(q.difficulty);
              const targetLevel = mapSeniorityToTargetDifficulty(kit.role.seniority, kit.role.title);
              const isMatch = q.difficulty === targetLevel;
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-0.5 rounded-full border shadow-2xs ${
                      q.difficulty === 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : q.difficulty === 2
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {info.levelTitle} ({info.durationMinutes}m)
                  </span>

                  {isMatch ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded shadow-2xs"
                      title={`This question directly matches the expected interview bar for ${kit.role.seniority || 'Role'}`}
                    >
                      🎯 Target Bar: {kit.role.seniority || 'Senior'}
                    </span>
                  ) : q.difficulty > targetLevel ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded"
                      title="Advanced / Stretch architectural concept beyond baseline"
                    >
                      ⚡ Stretch Level
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                      title="Fundamental / Warm-up core concept"
                    >
                      🌱 Foundational
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Linked requirements */}
            <div className="flex items-center gap-1">
              {q.requirement_ids.map((rId) => (
                <span
                  key={rId}
                  className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                  title="Linked Requirement ID"
                >
                  {rId}
                </span>
              ))}
            </div>

            {/* Status tags */}
            {isCustom && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                <Sparkles className="h-3 w-3 text-emerald-700" /> Custom
              </span>
            )}
            {isPinned && !isCustom && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            {isEdited && !isPinned && !isCustom && (
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Edited
              </span>
            )}

            {/* Citations Grounded Status Badge */}
            {hasCitations && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Grounded ({q.citations!.length} Citations)
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Google Search Validation Trigger */}
            <button
              onClick={() => handleTriggerGoogleSearchValidation(q)}
              disabled={isValidating}
              className={`rounded px-2 py-1 text-[11px] font-medium transition flex items-center gap-1 border ${
                isValidating
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 animate-pulse'
                  : isValidationSuccess
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
              title="Validate expert answer via Google Search and retrieve high-authority RFC/documentation citations"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-indigo-600" />
                  <span>Verifying Search...</span>
                </>
              ) : isValidationSuccess ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Grounded & Verified</span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 text-indigo-500" />
                  <span>Search Validate</span>
                </>
              )}
            </button>

            <button
              onClick={() => copyToClipboard(q)}
              className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Copy question and expert answer to clipboard"
            >
              {copiedId === q.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={() => onTogglePin(q.id)}
              className={`rounded p-1 transition ${
                isPinned
                  ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isPinned ? 'Unpin question' : 'Pin question (protects from regeneration)'}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>

            {!isEditing && (
              <button
                onClick={() => startEdit(q)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Edit question text"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={() => onDeleteQuestion(q.id)}
              className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Delete question"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Question Body */}
        <div className="mt-3 space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Subcategory</label>
                <input
                  type="text"
                  value={editSubcategory}
                  onChange={(e) => setEditSubcategory(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Question Prompt</label>
                <textarea
                  rows={2}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Expected Evaluator Outline</label>
                <textarea
                  rows={3}
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Expert Answer</label>
                <textarea
                  rows={4}
                  value={editExpertAnswer}
                  onChange={(e) => setEditExpertAnswer(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingQuestionId(null)}
                  className="rounded px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEdit(q)}
                  className="flex items-center gap-1 rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Edit</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {q.prompt}
              </p>

              {/* Rubric outline */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Evaluator Expected Outline:
                </span>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                  {q.answer_outline}
                </p>
              </div>

              {/* Expert Answer & Citations Drawer Toggle */}
              {(hasExpertAnswer || hasCitations) && (
                <div className="pt-1">
                  <button
                    onClick={() => toggleAnswerExpanded(q.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>
                      {isExpanded ? 'Hide Expert Answer & Literature Citations' : 'View Deep Expert Answer & Verified Outside Citations'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Expanded Expert Content */}
                  {isExpanded && (
                    <div className="mt-2.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 space-y-3.5 text-xs text-slate-800 animate-in fade-in duration-200">
                      {hasExpertAnswer && (
                        <div>
                          <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Staff/Principal Engineer Deep Solution Breakdown:</span>
                          </div>
                          <div className="mt-2 text-slate-800 leading-relaxed whitespace-pre-line text-xs bg-white/80 p-3.5 rounded-lg border border-indigo-100/80 font-normal">
                            {q.expert_answer}
                          </div>
                        </div>
                      )}

                      {/* Authoritative Citations & Literature */}
                      {hasCitations && (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-indigo-700" /> Authoritative Outside Literature & Standard Citations:
                          </span>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.citations!.map((cit, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-white p-3 border border-indigo-100 shadow-2xs space-y-1"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-bold text-slate-900 text-xs leading-snug">
                                    {cit.title}
                                  </h5>
                                  {cit.url && (
                                    <a
                                      href={cit.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 shrink-0"
                                      title="Open reference paper / source"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-indigo-700">{cit.source}</p>
                                {cit.snippet && (
                                  <p className="text-[11px] text-slate-600 italic mt-1 leading-snug">
                                    "{cit.snippet}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
};
