import assert from 'assert';
import { KitSchema, BatchOutputPayloadSchema, validateKit } from '../src/core/types';

export function runStructureTests() {
  console.log('\n--- Running Appendix A & B Structure Tests ---');

  const validKit = {
    source: {
      company: 'Stripe',
      company_url: 'https://stripe.com',
      role: 'Staff Infrastructure Engineer',
      location: 'Remote',
      jd_chars: 1450,
      researched_at: '2026-09-23T19:00:00.000Z',
      pages_used: ['https://stripe.com/about'],
    },
    company_brief: {
      summary: 'Stripe is an economic infrastructure platform for the internet.',
      what_they_do: 'Builds payment processing, banking-as-a-service, and financial APIs.',
      sources: ['https://stripe.com/about'],
    },
    role: {
      title: 'Staff Infrastructure Engineer',
      seniority: 'Staff',
      responsibilities: ['Architect distributed systems', 'Lead fault-tolerance initiatives'],
      requirements: [
        { id: 'r1', text: 'Distributed systems expertise in Go or Java', kind: 'technical' as const, priority: 'must' as const },
        { id: 'r2', text: 'Proven cross-functional technical leadership', kind: 'behavioural' as const, priority: 'must' as const },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'How would you architect an idempotent payment processing pipeline with sub-millisecond p99 latency?',
        answer_outline: 'Covers two-phase commit, distributed consensus, ledger audit logging, and cache invalidation.',
        difficulty: 3 as const,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is idempotency key caching and why is it critical in fintech APIs?',
        back: 'Guarantees that retry calls do not cause double-charging by checking a cached unique mutation token.',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'Distributed Systems Deep Dive', question_ids: ['q1'], minutes: 45 },
        { day: 2, focus: 'System Architecture Rehearsal', question_ids: [], minutes: 30 },
        { day: 3, focus: 'Final Review & High-Yield Rehearsal', question_ids: [], minutes: 30 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: ['r2'],
      passes: 1,
    },
  };

  // Valid kit must parse without error
  const parsed = KitSchema.safeParse(validKit);
  assert.strictEqual(parsed.success, true, 'Valid Kit must satisfy KitSchema');
  console.log('✓ Valid KitSchema verified successfully');

  // Test validateKit helper function
  const helperRes = validateKit(validKit);
  assert.strictEqual(helperRes.success, true, 'validateKit must return success: true for valid payload');
  if (helperRes.success) {
    assert.strictEqual(helperRes.data.source.company, 'Stripe');
  }
  console.log('✓ validateKit helper function returns typed success envelope');

  // Rejection 1: Non-integer minutes
  const invalidMinutesKit = JSON.parse(JSON.stringify(validKit));
  invalidMinutesKit.schedule.days[0].minutes = 45.5; // Float not allowed!
  assert.strictEqual(KitSchema.safeParse(invalidMinutesKit).success, false, 'KitSchema must reject non-integer minutes');
  console.log('✓ KitSchema correctly rejects float durations');

  // Rejection 1b: String duration minutes
  const invalidStringMinutesKit = JSON.parse(JSON.stringify(validKit));
  invalidStringMinutesKit.schedule.days[0].minutes = '45m';
  assert.strictEqual(KitSchema.safeParse(invalidStringMinutesKit).success, false, 'KitSchema must reject string durations');
  console.log('✓ KitSchema correctly rejects string durations for minutes');

  // Rejection 2: Invalid requirement kind
  const invalidKindKit = JSON.parse(JSON.stringify(validKit));
  invalidKindKit.role.requirements[0].kind = 'unsupported_kind';
  assert.strictEqual(KitSchema.safeParse(invalidKindKit).success, false, 'KitSchema must reject invalid requirement kinds');
  console.log('✓ KitSchema correctly rejects invalid requirement kinds');

  // Rejection 3: Missing required root properties
  const missingPropKit = JSON.parse(JSON.stringify(validKit));
  delete (missingPropKit as any).company_brief;
  assert.strictEqual(KitSchema.safeParse(missingPropKit).success, false, 'KitSchema must reject missing root properties');
  console.log('✓ KitSchema correctly rejects missing root properties');

  // Rejection 4: Invalid company_url
  const invalidUrlKit = JSON.parse(JSON.stringify(validKit));
  invalidUrlKit.source.company_url = 'not-a-valid-url';
  assert.strictEqual(KitSchema.safeParse(invalidUrlKit).success, false, 'KitSchema must reject invalid URL');
  console.log('✓ KitSchema correctly rejects invalid company_url');

  // Rejection 5: Undefined requirement ID in questions (Cross-Entity Invariant)
  const undefinedReqKit = JSON.parse(JSON.stringify(validKit));
  undefinedReqKit.questions[0].requirement_ids = ['r99_unknown'];
  const undefinedReqRes = validateKit(undefinedReqKit);
  assert.strictEqual(undefinedReqRes.success, false, 'KitSchema must reject undefined requirement IDs in questions');
  console.log('✓ KitSchema invariant enforces questions requirement_ids match defined role requirements');

  // Rejection 6: Empty requirement_ids array in questions
  const emptyReqIdsKit = JSON.parse(JSON.stringify(validKit));
  emptyReqIdsKit.questions[0].requirement_ids = [];
  assert.strictEqual(KitSchema.safeParse(emptyReqIdsKit).success, false, 'Questions must target at least one requirement');
  console.log('✓ KitSchema enforces non-empty requirement_ids for questions');

  // Flashcards confidence support
  const flashcardConfidenceKit = JSON.parse(JSON.stringify(validKit));
  flashcardConfidenceKit.flashcards[0].confidence = 'high';
  assert.strictEqual(KitSchema.safeParse(flashcardConfidenceKit).success, true, 'Flashcards accept low|medium|high confidence');
  flashcardConfidenceKit.flashcards[0].confidence = 'ultra';
  assert.strictEqual(KitSchema.safeParse(flashcardConfidenceKit).success, false, 'Flashcards reject invalid confidence enum');
  console.log('✓ Flashcard confidence strictly validated for enum ("low" | "medium" | "high")');

  // Appendix B Batch output schema
  const batchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: [
      {
        id: 'case_1',
        status: 'ok' as const,
        kit: validKit,
        error: null,
      },
      {
        id: 'case_2',
        status: 'failed' as const,
        kit: null,
        error: { code: 'NETWORK_TIMEOUT', message: 'Failed to fetch host' },
      },
    ],
  };

  const parsedBatch = BatchOutputPayloadSchema.safeParse(batchOutput);
  assert.strictEqual(parsedBatch.success, true, 'Batch output payload must satisfy BatchOutputPayloadSchema');
  console.log('✓ BatchOutputPayloadSchema verified successfully');
}
