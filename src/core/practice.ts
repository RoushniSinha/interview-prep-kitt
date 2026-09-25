import { Flashcard, FlashcardPracticeLog, Requirement } from './types';

export interface PracticeStats {
  totalCards: number;
  reviewedCardsCount: number;
  percentSeen: number;
  confidentCardsCount: number; // confidence >= 2
  percentConfident: number;
  weakRequirementIds: string[];
  requirementBreakdown: {
    requirementId: string;
    requirementText: string;
    priority: 'must' | 'nice';
    totalCards: number;
    averageConfidence: number;
    status: 'needs_work' | 'progressing' | 'mastered';
  }[];
}

/**
 * Deterministically orders cards for the next review session:
 * 1. Cards never reviewed yet
 * 2. Lowest last recorded confidence (1 -> 2 -> 3)
 * 3. Oldest last-reviewed timestamp
 */
export function getOrderedPracticeCards(
  flashcards: Flashcard[],
  logs: FlashcardPracticeLog[]
): Flashcard[] {
  const latestLogByCard = new Map<string, FlashcardPracticeLog>();
  for (const log of logs) {
    latestLogByCard.set(log.flashcardId, log);
  }

  return [...flashcards].sort((a, b) => {
    const logA = latestLogByCard.get(a.id);
    const logB = latestLogByCard.get(b.id);

    // Rule 1: Never-seen cards first
    if (!logA && logB) return -1;
    if (logA && !logB) return 1;
    if (!logA && !logB) return 0;

    // Rule 2: Lowest confidence first (1: Poor, 2: Moderate, 3: Confident)
    if (logA!.confidence !== logB!.confidence) {
      return logA!.confidence - logB!.confidence;
    }

    // Rule 3: Oldest timestamp first
    const timeA = new Date(logA!.timestamp).getTime();
    const timeB = new Date(logB!.timestamp).getTime();
    return timeA - timeB;
  });
}

/**
 * Computes deep practice analytics, overall confidence score, and weak requirements
 */
export function computePracticeStats(
  flashcards: Flashcard[],
  requirements: Requirement[],
  logs: FlashcardPracticeLog[]
): PracticeStats {
  const totalCards = flashcards.length;
  const latestLogByCard = new Map<string, FlashcardPracticeLog>();
  for (const log of logs) {
    latestLogByCard.set(log.flashcardId, log);
  }

  const reviewedCardsCount = flashcards.filter((f) => latestLogByCard.has(f.id)).length;
  const percentSeen = totalCards === 0 ? 0 : Math.round((reviewedCardsCount / totalCards) * 100);

  const confidentCardsCount = flashcards.filter(
    (f) => (latestLogByCard.get(f.id)?.confidence ?? 0) >= 2
  ).length;
  const percentConfident =
    totalCards === 0 ? 0 : Math.round((confidentCardsCount / totalCards) * 100);

  // Group by requirement
  const requirementBreakdown = requirements.map((req) => {
    const linkedCards = flashcards.filter((f) => f.requirement_ids.includes(req.id));
    const linkedLogs = linkedCards
      .map((c) => latestLogByCard.get(c.id))
      .filter((l): l is FlashcardPracticeLog => Boolean(l));

    let avgConf = 0;
    if (linkedLogs.length > 0) {
      const sum = linkedLogs.reduce((acc, l) => acc + l.confidence, 0);
      avgConf = Math.round((sum / linkedLogs.length) * 10) / 10;
    }

    let status: 'needs_work' | 'progressing' | 'mastered' = 'needs_work';
    if (linkedLogs.length > 0 && avgConf >= 2.5) {
      status = 'mastered';
    } else if (linkedLogs.length > 0 && avgConf >= 1.5) {
      status = 'progressing';
    }

    return {
      requirementId: req.id,
      requirementText: req.text,
      priority: req.priority,
      totalCards: linkedCards.length,
      averageConfidence: avgConf,
      status,
    };
  });

  // Weak requirements are those with status 'needs_work' or lowest average confidence
  const weakRequirementIds = requirementBreakdown
    .filter((r) => r.status === 'needs_work' || r.averageConfidence < 2)
    .sort((a, b) => {
      // Must-haves take priority in weak spots
      if (a.priority !== b.priority) return a.priority === 'must' ? -1 : 1;
      return a.averageConfidence - b.averageConfidence;
    })
    .map((r) => r.requirementId);

  return {
    totalCards,
    reviewedCardsCount,
    percentSeen,
    confidentCardsCount,
    percentConfident,
    weakRequirementIds,
    requirementBreakdown,
  };
}
