import {
  Requirement,
  Question,
  ScheduleDay,
  QuestionCategory,
  KitDraftState,
  Flashcard,
} from '../core/types';

// ============================================================================
// 1. Deterministic Coverage Gap Analysis (Set Mathematics, Non-LLM)
// ============================================================================

/**
 * Isolated deterministic coverage check.
 * Identifies 'must' requirements that lack question coverage.
 * Filters out tombstoned questions and tombstoned requirements.
 */
export function checkCoverage(
  requirements: Pick<Requirement, 'id' | 'priority'>[],
  questions: Pick<Question, 'id' | 'requirement_ids'>[],
  tombstones?: string[] | Set<string> | KitDraftState
): string[] {
  let tombstoneSet: Set<string>;
  if (tombstones instanceof Set) {
    tombstoneSet = tombstones;
  } else if (Array.isArray(tombstones)) {
    tombstoneSet = new Set(tombstones);
  } else if (tombstones && Array.isArray((tombstones as KitDraftState).tombstones)) {
    tombstoneSet = new Set((tombstones as KitDraftState).tombstones);
  } else {
    tombstoneSet = new Set();
  }

  // 1. Gather all covered requirement IDs from non-tombstoned questions
  const coveredIds = new Set<string>();
  for (const q of questions) {
    if (q.id && tombstoneSet.has(q.id)) {
      continue;
    }
    if (Array.isArray(q.requirement_ids)) {
      for (const reqId of q.requirement_ids) {
        coveredIds.add(reqId);
      }
    }
  }

  // 2. Identify uncovered must-have requirements (excluding tombstoned requirements)
  return requirements
    .filter((req) => req.priority === 'must' && !tombstoneSet.has(req.id) && !coveredIds.has(req.id))
    .map((req) => req.id);
}

// ============================================================================
// 2. Deterministic Schedule Allocator (Strict Integer Minutes, Non-LLM)
// ============================================================================

/**
 * Allocates questions across exactly `daysAvailable` days (1 to 90).
 * Guarantees:
 * - schedule.days exact length matching daysAvailable.
 * - schedule.days[].minutes: strict positive integer minutes (15/30/45 or 30m baseline).
 * - Priority & difficulty front-loading: must-haves and difficulty 3 placed earlier.
 * - Normalizes empty/gap days with 30-minute review focus.
 */
export function allocateSchedule(
  requirementsOrDays: Requirement[] | number,
  questionsOrRequirements: Question[] | Requirement[],
  daysAvailableOrQuestions?: number | Question[]
): ScheduleDay[] {
  // Support both (requirements, questions, daysAvailable) and (daysAvailable, questions, requirements)
  let daysAvail: number;
  let questions: Question[];
  let requirements: Requirement[];

  if (typeof requirementsOrDays === 'number') {
    daysAvail = requirementsOrDays;
    questions = (questionsOrRequirements as unknown as Question[]) || [];
    requirements = (daysAvailableOrQuestions as unknown as Requirement[]) || [];
  } else {
    requirements = (requirementsOrDays as unknown as Requirement[]) || [];
    questions = (questionsOrRequirements as unknown as Question[]) || [];
    daysAvail = typeof daysAvailableOrQuestions === 'number' ? daysAvailableOrQuestions : 7;
  }

  const days = Math.max(1, Math.min(90, Math.floor(daysAvail)));

  // If there are no questions, return normalized integer baseline schedule
  if (!questions || questions.length === 0) {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      focus: days === 1
        ? 'Comprehensive Intensive Interview Preparation'
        : i === days - 1
        ? 'Final Review & High-Yield Rehearsal'
        : 'Core Concept Preparation & Self-Study',
      question_ids: [],
      minutes: 30, // Strict positive integer minutes
    }));
  }

  // 1. Sort questions: must-have requirements first, then difficulty descending (3 -> 2 -> 1)
  const mustReqIdSet = new Set(
    requirements.filter((r) => r.priority === 'must').map((r) => r.id)
  );

  const sortedQuestions = [...questions].sort((a, b) => {
    const aIsMust = a.requirement_ids?.some((id) => mustReqIdSet.has(id)) || false;
    const bIsMust = b.requirement_ids?.some((id) => mustReqIdSet.has(id)) || false;

    if (aIsMust !== bIsMust) {
      return aIsMust ? -1 : 1; // Must-haves front-loaded
    }
    const diffA = a.difficulty || 2;
    const diffB = b.difficulty || 2;
    if (diffA !== diffB) {
      return diffB - diffA; // Harder questions (3 -> 1) earlier
    }
    return a.id.localeCompare(b.id);
  });

  // 2. Initialize exactly `days` days
  const schedule: ScheduleDay[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    focus: '',
    question_ids: [],
    minutes: 0,
  }));

  // 3. Bin-pack / round-robin questions across days
  sortedQuestions.forEach((q, idx) => {
    const targetDayIndex = idx % days;
    const targetDay = schedule[targetDayIndex];
    targetDay.question_ids.push(q.id);

    // Duration calculation: 15, 30, or 45 strict integer minutes
    const diff = q.difficulty === 1 ? 15 : q.difficulty === 3 ? 45 : 30;
    targetDay.minutes += diff;
  });

  // 4. Assign deterministic, professional day focuses & normalize empty days
  schedule.forEach((day, idx) => {
    const dayCategories = day.question_ids
      .map((qid) => questions.find((q) => q.id === qid)?.category)
      .filter((cat): cat is QuestionCategory => Boolean(cat));

    // Find dominant category for the day
    let dominantCat = 'Core Competency';
    if (dayCategories.length > 0) {
      const counts: Record<string, number> = {};
      for (const c of dayCategories) {
        counts[c] = (counts[c] || 0) + 1;
      }
      dominantCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }

    if (days === 1) {
      day.focus = 'Comprehensive Intensive Interview Preparation';
    } else if (idx === days - 1) {
      day.focus = 'Final Review & High-Yield Rehearsal';
    } else if (day.question_ids.length === 0) {
      day.focus = 'Concept Reinforcement & Restructured Review';
    } else {
      const formattedCategory = dominantCat
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      day.focus = `${formattedCategory} Deep Dive`;
    }

    // Integer baseline guarantee: strictly positive integer minutes
    if (day.minutes <= 0) {
      day.minutes = 30;
    }
  });

  return schedule;
}

export const buildDeterministicSchedule = (
  daysAvailable: number,
  questions: Question[],
  requirements: Requirement[]
) => allocateSchedule(requirements, questions, daysAvailable);

// ============================================================================
// 3. Draft State Reconciliation & Preservation Engine
// ============================================================================

/**
 * Fast deterministic string hash for change detection
 */
export function computeContentHash(content: unknown): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function createInitialDraftState(): KitDraftState {
  return {
    items: {},
    tombstones: [],
  };
}

export function registerGeneratedItems(
  draftState: KitDraftState,
  items: Array<{ id: string; [key: string]: unknown }>
): void {
  for (const item of items) {
    if (!draftState.items[item.id]) {
      draftState.items[item.id] = {
        origin: 'generated',
        lastGeneratedHash: computeContentHash(item),
      };
    }
  }
}

export function markItemAsEdited(draftState: KitDraftState, id: string): void {
  const current = draftState.items[id] || { origin: 'edited' };
  draftState.items[id] = {
    ...current,
    origin: 'edited',
  };
}

export function toggleItemPin(draftState: KitDraftState, id: string): boolean {
  const current = draftState.items[id] || { origin: 'generated' };
  const isPinned = current.origin === 'pinned';
  draftState.items[id] = {
    ...current,
    origin: isPinned ? 'generated' : 'pinned',
  };
  return !isPinned;
}

export function markItemAsCustom(draftState: KitDraftState, id: string): void {
  draftState.items[id] = {
    origin: 'pinned',
    isCustom: true,
  };
}

export function deleteItemWithTombstone(draftState: KitDraftState, id: string): void {
  if (!draftState.tombstones.includes(id)) {
    draftState.tombstones.push(id);
  }
  delete draftState.items[id];
}

/**
 * Reconciles questions during category regeneration.
 * Supports both signatures:
 * 1) (targetCategory, existingQuestions, incomingQuestions, tombstones)
 * 2) (existingQuestions, incomingQuestions, draftState, targetCategory)
 *
 * Rules:
 * 1. Preserves existing questions in other categories completely untouched.
 * 2. Preserves questions that are 'edited', 'pinned', or 'isCustom' in the target category.
 * 3. Wipes vanilla unpinned/unedited 'generated' questions in the targetCategory.
 * 4. Skips incoming questions that are in tombstones (deleted items never resurrect).
 * 5. Merges new incoming questions, ensuring unique IDs that never collide with any preserved question.
 */
export function reconcileQuestions(
  arg1: any,
  arg2: any,
  arg3?: any,
  arg4?: any,
  arg5?: any
): Question[] {
  let targetCategory: string | undefined;
  let targetSubcategory: string | undefined;
  let existingQuestions: Question[];
  let incomingQuestions: Question[];
  let draftState: KitDraftState | undefined;
  let tombstoneList: string[] = [];

  if (Array.isArray(arg1)) {
    // Signature: (existingQuestions, incomingQuestions, draftState, targetCategory, targetSubcategory)
    existingQuestions = arg1;
    incomingQuestions = arg2;
    if (arg3 && 'tombstones' in arg3 && 'items' in arg3) {
      draftState = arg3 as KitDraftState;
      tombstoneList = draftState.tombstones;
    } else if (Array.isArray(arg3)) {
      tombstoneList = arg3;
    } else if (arg3 instanceof Set) {
      tombstoneList = Array.from(arg3);
    }
    targetCategory = arg4;
    targetSubcategory = arg5;
  } else {
    // Signature: (targetCategory, existingQuestions, incomingQuestions, tombstones, targetSubcategory)
    targetCategory = arg1;
    existingQuestions = arg2 || [];
    incomingQuestions = arg3 || [];
    if (arg4 && 'tombstones' in arg4 && 'items' in arg4) {
      draftState = arg4 as KitDraftState;
      tombstoneList = draftState.tombstones;
    } else if (Array.isArray(arg4)) {
      tombstoneList = arg4;
    } else if (arg4 instanceof Set) {
      tombstoneList = Array.from(arg4);
    }
    targetSubcategory = arg5;
  }

  if (!draftState) {
    draftState = {
      items: {},
      tombstones: [...tombstoneList],
    };
  }

  const tombstoneSet = new Set(draftState.tombstones);
  const result: Question[] = [];
  const preservedIds = new Set<string>();

  const existingMap = new Map<string, Question>();
  for (const q of existingQuestions) {
    existingMap.set(q.id, q);
  }

  // Find highest numeric ID suffix in existing questions to prevent collisions
  let maxIdNum = 0;
  for (const q of existingQuestions) {
    const match = q.id.match(/\d+/);
    if (match) {
      const n = parseInt(match[0], 10);
      if (n > maxIdNum) maxIdNum = n;
    }
  }
  let nextIdCounter = Math.max(maxIdNum + 1, existingQuestions.length + 1);

  // 1. Process existing questions
  for (const q of existingQuestions) {
    // If tombstoned (user explicitly deleted), skip permanently
    if (tombstoneSet.has(q.id)) {
      continue;
    }

    // If outside the target category (when a specific category is being regenerated), ALWAYS preserve untouched!
    if (targetCategory && targetCategory !== 'all' && q.category !== targetCategory) {
      result.push(q);
      preservedIds.add(q.id);
      continue;
    }

    // If outside the target subcategory (when a specific subcategory is being regenerated), ALWAYS preserve untouched!
    if (targetSubcategory && targetSubcategory !== 'all' && q.subcategory !== targetSubcategory) {
      result.push(q);
      preservedIds.add(q.id);
      continue;
    }

    const meta = draftState.items[q.id];
    const isPinned = meta?.origin === 'pinned' || Boolean((q as any).isPinned);
    const isEdited =
      meta?.origin === 'edited' ||
      Boolean(meta?.isCustom) ||
      Boolean((q as any).isEdited) ||
      Boolean((q as any).isCustom);

    // Preserved if pinned, edited, or custom
    if (isPinned || isEdited) {
      result.push(q);
      preservedIds.add(q.id);
    }
    // Otherwise, it was unedited/unpinned 'generated' inside targetCategory -> wiped for regeneration
  }

  // 2. Incorporate incoming questions
  for (const rawNewQ of incomingQuestions) {
    // If tombstoned, strictly skip (prevent resurrection)
    if (tombstoneSet.has(rawNewQ.id)) {
      continue;
    }

    // Guarantee the incoming question has the target category
    const categoryToUse: QuestionCategory =
      targetCategory && targetCategory !== 'all'
        ? (targetCategory as QuestionCategory)
        : rawNewQ.category;

    let finalId = rawNewQ.id;

    // Check if ID is already occupied by a preserved question
    if (preservedIds.has(finalId)) {
      const existing = existingMap.get(finalId);
      const meta = existing ? draftState.items[existing.id] : null;

      // Case A: Conflicting item is in the SAME category being regenerated
      if (existing && existing.category === categoryToUse) {
        if (meta?.origin === 'edited' || (existing as any)?.isEdited) {
          // Staged as pendingRegeneration so candidate can be reviewed
          if (meta) {
            meta.pendingRegeneration = { ...rawNewQ, category: categoryToUse };
          }
          continue;
        } else if (meta?.origin === 'pinned' || (existing as any)?.isPinned) {
          // Pinned is untouchable; skip candidate
          continue;
        }
      }

      // Case B: Conflicting item is from another category or another preserved item.
      // Must allocate a guaranteed unique ID so the preserved question is NEVER overwritten!
      do {
        finalId = `q${nextIdCounter++}`;
      } while (preservedIds.has(finalId) || existingMap.has(finalId));
    }

    const assignedQ: Question = {
      ...rawNewQ,
      id: finalId,
      category: categoryToUse,
      subcategory:
        targetSubcategory && targetSubcategory !== 'all'
          ? rawNewQ.subcategory || targetSubcategory
          : rawNewQ.subcategory,
    };

    result.push(assignedQ);
    preservedIds.add(finalId);
    draftState.items[finalId] = {
      origin: 'generated',
      lastGeneratedHash: computeContentHash(assignedQ),
    };
  }

  return result;
}

export function reconcileFlashcards(
  existingCards: Flashcard[],
  newCards: Flashcard[],
  draftState: KitDraftState
): Flashcard[] {
  const result: Flashcard[] = [];
  const tombstoneSet = new Set(draftState.tombstones);
  const preservedIds = new Set<string>();

  for (const card of existingCards) {
    if (tombstoneSet.has(card.id)) continue;
    const meta = draftState.items[card.id];
    if (meta?.origin === 'pinned' || meta?.origin === 'edited') {
      result.push(card);
      preservedIds.add(card.id);
    }
  }

  let nextIdCounter = existingCards.length + 1;
  for (const card of newCards) {
    if (tombstoneSet.has(card.id)) continue;

    let finalId = card.id;
    while (preservedIds.has(finalId)) {
      finalId = `f${nextIdCounter++}`;
    }

    const assignedCard: Flashcard = { ...card, id: finalId };
    result.push(assignedCard);
    preservedIds.add(finalId);
    draftState.items[finalId] = {
      origin: 'generated',
      lastGeneratedHash: computeContentHash(assignedCard),
    };
  }

  return result;
}
