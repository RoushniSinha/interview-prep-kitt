import assert from 'assert';
import {
  createInitialDraftState,
  markItemAsEdited,
  toggleItemPin,
  deleteItemWithTombstone,
  reconcileQuestions,
} from '../src/core/draftState';
import { Question } from '../src/core/types';

export function runDraftStateTests() {
  console.log('\n--- Running Draft State Reconciliation Tests ---');

  const draftState = createInitialDraftState();

  const initialQuestions: Question[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Original Q1', answer_outline: 'A1', difficulty: 2 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Original Q2', answer_outline: 'A2', difficulty: 3 },
    { id: 'q3', requirement_ids: ['r1'], category: 'technical', prompt: 'Original Q3', answer_outline: 'A3', difficulty: 1 },
  ];

  // User edits q1
  markItemAsEdited(draftState, 'q1');
  initialQuestions[0].prompt = 'User edited prompt for Q1';

  // User pins q2
  toggleItemPin(draftState, 'q2');

  // Candidate questions from new LLM run
  const newGeneratedQuestions: Question[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'AI newly generated Q1', answer_outline: 'New A1', difficulty: 2 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'AI newly generated Q2', answer_outline: 'New A2', difficulty: 3 },
    { id: 'q3', requirement_ids: ['r1'], category: 'technical', prompt: 'AI newly generated Q3 replaced', answer_outline: 'New A3', difficulty: 2 },
    { id: 'q4', requirement_ids: ['r1'], category: 'technical', prompt: 'Brand new Q4', answer_outline: 'New A4', difficulty: 1 },
  ];

  const merged = reconcileQuestions(initialQuestions, newGeneratedQuestions, draftState, 'technical');

  // Assertion 1: q1 kept the user edit
  const q1 = merged.find((q) => q.id === 'q1');
  assert.ok(q1, 'q1 must exist in merged questions');
  assert.strictEqual(q1.prompt, 'User edited prompt for Q1', 'q1 must retain user edit');
  assert.ok(draftState.items['q1'].pendingRegeneration, 'q1 must have candidate saved in pendingRegeneration');

  // Assertion 2: q2 is pinned and untouched
  const q2 = merged.find((q) => q.id === 'q2');
  assert.ok(q2, 'q2 must exist in merged questions');
  assert.strictEqual(q2.prompt, 'Original Q2', 'q2 was pinned and must not be altered');

  // Assertion 3: q3 was generated (unedited, unpinned) and got replaced by the new output
  const q3 = merged.find((q) => q.id === 'q3');
  assert.ok(q3, 'q3 must exist');
  assert.strictEqual(q3.prompt, 'AI newly generated Q3 replaced', 'q3 must be updated with newly generated content');

  // Assertion 4: new q4 was appended
  const q4 = merged.find((q) => q.id === 'q4');
  assert.ok(q4, 'New question q4 must be included in merged result');

  // Assertion 5: Tombstones prevent resurrection
  deleteItemWithTombstone(draftState, 'q4');
  const mergedAfterTombstone = reconcileQuestions(
    merged.filter((q) => q.id !== 'q4'),
    [{ id: 'q4', requirement_ids: ['r1'], category: 'technical', prompt: 'Ghost Q4', answer_outline: 'G', difficulty: 1 }],
    draftState,
    'technical'
  );
  assert.strictEqual(
    mergedAfterTombstone.some((q) => q.id === 'q4'),
    false,
    'Tombstoned item must not be resurrected on regeneration'
  );

  console.log('✓ DraftState reconciliation correctly preserves edits, protects pins, updates generated items, and honors tombstones.');
}
