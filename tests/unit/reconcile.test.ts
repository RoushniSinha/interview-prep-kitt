import assert from 'assert';
import {
  createInitialDraftState,
  markItemAsEdited,
  toggleItemPin,
  deleteItemWithTombstone,
  reconcileQuestions,
} from '../../src/pipeline/deterministic';
import { Question } from '../../src/core/types';

export function runReconcileUnitTests() {
  console.log('\n--- Running State Reconciliation & Regeneration Unit Tests ---');

  const draftState = createInitialDraftState();

  const existingQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Original Technical Q1',
      answer_outline: 'Original Answer Outline',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'Original Technical Q2',
      answer_outline: 'Original Outline 2',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Vanilla Generated Q3',
      answer_outline: 'Vanilla Outline',
      difficulty: 1,
    },
    {
      id: 'q_beh_1',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Tell me about a time you resolved a conflict.',
      answer_outline: 'STAR method response.',
      difficulty: 1,
    },
  ];

  // 1. User edits q1
  markItemAsEdited(draftState, 'q1');
  existingQuestions[0].prompt = 'Custom User-Edited Technical Q1';

  // 2. User pins q2
  toggleItemPin(draftState, 'q2');

  // Candidate questions produced by regenerating 'technical' category
  const incomingQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'AI Proposed Regeneration for Q1',
      answer_outline: 'New AI Outline 1',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'AI Proposed Regeneration for Q2',
      answer_outline: 'New AI Outline 2',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Newly Generated Q3 Replacement',
      answer_outline: 'New Outline 3',
      difficulty: 2,
    },
    {
      id: 'q4',
      requirement_ids: ['r1', 'r2'],
      category: 'technical',
      prompt: 'Freshly Added Q4',
      answer_outline: 'Outline 4',
      difficulty: 3,
    },
  ];

  // Execute reconciliation targeting 'technical' category
  const reconciled = reconcileQuestions(
    'technical',
    existingQuestions,
    incomingQuestions,
    draftState
  );

  // Assertion 1: Unaffected category questions (behavioural) remain intact
  const behQ = reconciled.find((q) => q.id === 'q_beh_1');
  assert.ok(behQ, 'Questions in other categories (behavioural) must be preserved');
  assert.strictEqual(behQ.prompt, 'Tell me about a time you resolved a conflict.');
  console.log('✓ Cross-category isolation verified: Unaffected categories preserved');

  // Assertion 2: User-edited q1 is preserved with custom prompt
  const q1 = reconciled.find((q) => q.id === 'q1');
  assert.ok(q1, 'Edited question q1 must exist in reconciled list');
  assert.strictEqual(q1.prompt, 'Custom User-Edited Technical Q1', 'Edited prompt must be preserved untouched');
  assert.ok(draftState.items['q1'].pendingRegeneration, 'Incoming candidate must be staged in pendingRegeneration');
  assert.strictEqual(
    draftState.items['q1'].pendingRegeneration.prompt,
    'AI Proposed Regeneration for Q1'
  );
  console.log('✓ Edited question preserved with candidate saved to pendingRegeneration');

  // Assertion 3: Pinned question q2 is untouched
  const q2 = reconciled.find((q) => q.id === 'q2');
  assert.ok(q2, 'Pinned question q2 must exist in reconciled list');
  assert.strictEqual(q2.prompt, 'Original Technical Q2', 'Pinned prompt must remain immutable');
  console.log('✓ Pinned question protected from overwriting during category regeneration');

  // Assertion 4: Unedited/unpinned generated question q3 is replaced by incoming candidate
  const q3 = reconciled.find((q) => q.id === 'q3');
  assert.ok(q3, 'Generated question q3 must exist');
  assert.strictEqual(q3.prompt, 'Newly Generated Q3 Replacement', 'Unedited generated question must be refreshed');
  console.log('✓ Vanilla generated question successfully replaced by new AI generation');

  // Assertion 5: New question q4 was appended
  const q4 = reconciled.find((q) => q.id === 'q4');
  assert.ok(q4, 'New question q4 must be merged into reconciled output');
  assert.strictEqual(q4.prompt, 'Freshly Added Q4');
  console.log('✓ Fresh incoming question correctly merged with unique ID');

  // Assertion 6: Tombstones prevent resurrecting deleted items
  deleteItemWithTombstone(draftState, 'q4');
  assert.ok(draftState.tombstones.includes('q4'), 'q4 must be in tombstones');

  const afterDeleteQuestions = reconciled.filter((q) => q.id !== 'q4');
  const attemptResurrectQuestions: Question[] = [
    {
      id: 'q4',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Zombie Q4',
      answer_outline: 'Outline',
      difficulty: 1,
    },
  ];

  const reconciledAfterTombstone = reconcileQuestions(
    'technical',
    afterDeleteQuestions,
    attemptResurrectQuestions,
    draftState
  );

  const resurrectCheck = reconciledAfterTombstone.find((q) => q.id === 'q4');
  assert.strictEqual(resurrectCheck, undefined, 'Tombstoned question q4 must NOT be resurrected');
  console.log('✓ Tombstones prevent resurrection of deleted entities across regenerations');

  // Assertion 7: Developing a question and answer in 'technical', switching to 'system-design', and regenerating
  // MUST NEVER delete or overwrite the technical questions or their answers!
  const questionsBeforeSwitch: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'User developed prompt in Technical',
      answer_outline: 'User developed comprehensive answer outline in Technical',
      difficulty: 2,
      isEdited: true,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'Original unedited technical question',
      answer_outline: 'Original technical outline',
      difficulty: 1,
    },
  ];

  const crossCategoryDraftState = createInitialDraftState();
  markItemAsEdited(crossCategoryDraftState, 'q1');

  // Generator produces new candidate questions for 'system-design' (which may start with q1, q2 or arbitrary IDs)
  const incomingSystemDesign: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'system-design',
      prompt: 'How would you architect a distributed key-value store with eventual consistency?',
      answer_outline: 'SSTables, LSM Trees, quorum read/writes, gossip protocol.',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'system-design',
      prompt: 'Design a global rate limiter handling 1M RPS.',
      answer_outline: 'Token bucket, sliding window counter in Redis cluster, local memory batching.',
      difficulty: 2,
    },
  ];

  const crossReconciled = reconcileQuestions(
    'system-design',
    questionsBeforeSwitch,
    incomingSystemDesign,
    crossCategoryDraftState
  );

  // Both technical questions MUST still exist with exact answers untouched!
  const techQ1 = crossReconciled.find((q) => q.id === 'q1');
  assert.ok(techQ1, 'Technical q1 must still exist');
  assert.strictEqual(techQ1.prompt, 'User developed prompt in Technical');
  assert.strictEqual(techQ1.answer_outline, 'User developed comprehensive answer outline in Technical');
  assert.strictEqual(techQ1.category, 'technical');

  const techQ2 = crossReconciled.find((q) => q.id === 'q2');
  assert.ok(techQ2, 'Technical q2 must still exist');
  assert.strictEqual(techQ2.prompt, 'Original unedited technical question');
  assert.strictEqual(techQ2.category, 'technical');

  // System design questions MUST have been added with new unique IDs and correct category
  const sysDesignQuestions = crossReconciled.filter((q) => q.category === 'system-design');
  assert.strictEqual(sysDesignQuestions.length, 2, 'Must have 2 system-design questions');
  assert.ok(sysDesignQuestions.every((q) => q.id !== 'q1' && q.id !== 'q2'), 'System design questions must have unique IDs, not clashing with technical q1/q2');
  console.log('✓ Cross-category switch & regenerate verified: Previous questions and answers strictly preserved, new category fetched successfully');

  // Assertion 8: Subcategory Isolation (Technical -> Data Structures vs System Design)
  // Regenerating 'Data Structures' must NOT replace or touch 'System Design' questions within 'technical'
  const subcategoryQuestions: Question[] = [
    {
      id: 'tech_ds_1',
      requirement_ids: ['r1'],
      category: 'technical',
      subcategory: 'Data Structures',
      prompt: 'Implement an LRU Cache in O(1)',
      answer_outline: 'Doubly-linked list + Hash Map',
      difficulty: 2,
    },
    {
      id: 'tech_sd_1',
      requirement_ids: ['r2'],
      category: 'technical',
      subcategory: 'System Design',
      prompt: 'Design a distributed rate limiter with sliding window',
      answer_outline: 'Redis sorted sets with ZADD/ZREMRANGEBYSCORE',
      difficulty: 3,
    },
  ];

  const subcategoryDraftState = createInitialDraftState();
  const incomingDsBatch: Question[] = [
    {
      id: 'incoming_ds_2',
      requirement_ids: ['r1'],
      category: 'technical',
      subcategory: 'Data Structures',
      prompt: 'Find the median of two sorted arrays in O(log(min(n, m)))',
      answer_outline: 'Binary search on partition points',
      difficulty: 3,
    },
  ];

  const subReconciled = reconcileQuestions(
    'technical',
    subcategoryQuestions,
    incomingDsBatch,
    subcategoryDraftState,
    'Data Structures' // Target subcategory isolation
  );

  // 'System Design' question MUST remain unchanged
  const preservedSdQuestion = subReconciled.find((q) => q.id === 'tech_sd_1');
  assert.ok(preservedSdQuestion, 'System Design question in technical must be strictly preserved');
  assert.strictEqual(preservedSdQuestion.subcategory, 'System Design');

  // Incoming 'Data Structures' question must be added
  const newDsQuestion = subReconciled.find((q) => q.prompt.includes('median of two sorted arrays'));
  assert.ok(newDsQuestion, 'New Data Structures question must be present');
  console.log('✓ Subcategory isolation verified: Regenerating a subcategory preserves sibling subcategories in the same parent category');

  console.log('✓ All State Reconciliation & Regeneration unit tests PASSED successfully');
}

if (process.argv[1]?.endsWith('reconcile.test.ts')) {
  runReconcileUnitTests();
}
