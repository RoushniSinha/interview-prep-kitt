import assert from 'assert';
import {
  KitSchema,
  QuestionSchema,
  ScheduleDaySchema,
  ScheduleSchema,
  RequirementSchema,
  validateKit,
  Kit,
} from '../../src/validation/kitValidator';

export function runSchemaTests() {
  console.log('\n--- Running Appendix A Schema Contract Unit Tests ---');

  // 1. Difficulty: Integer 1 | 2 | 3 only
  const validDifficulties = [1, 2, 3];
  for (const diff of validDifficulties) {
    const res = QuestionSchema.safeParse({
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Describe Raft consensus protocol.',
      answer_outline: 'Explain leader election, log replication, and safety.',
      difficulty: diff,
    });
    assert.strictEqual(res.success, true, `Difficulty ${diff} must be valid`);
  }

  // Reject float difficulty (e.g. 2.5)
  const floatDiff = QuestionSchema.safeParse({
    id: 'q1',
    requirement_ids: ['r1'],
    category: 'technical',
    prompt: 'Describe Raft.',
    answer_outline: 'Explain Raft.',
    difficulty: 2.5,
  });
  assert.strictEqual(floatDiff.success, false, 'Float difficulty must be rejected');

  // Reject out-of-range difficulty (0, 4, -1)
  assert.strictEqual(
    QuestionSchema.safeParse({
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Describe Raft.',
      answer_outline: 'Explain Raft.',
      difficulty: 0,
    }).success,
    false,
    'Difficulty 0 must be rejected'
  );

  assert.strictEqual(
    QuestionSchema.safeParse({
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Describe Raft.',
      answer_outline: 'Explain Raft.',
      difficulty: 4,
    }).success,
    false,
    'Difficulty 4 must be rejected'
  );

  // Reject string difficulty ("2", "hard")
  assert.strictEqual(
    QuestionSchema.safeParse({
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Describe Raft.',
      answer_outline: 'Explain Raft.',
      difficulty: '2' as any,
    }).success,
    false,
    'String difficulty must be rejected'
  );
  console.log('✓ Question difficulty strictly restricted to integer literals 1 | 2 | 3');

  // 2. Schedule Day Minutes: Strict positive integer minutes
  const validScheduleDay = ScheduleDaySchema.safeParse({
    day: 1,
    focus: 'Core System Design Deep Dive',
    question_ids: ['q1'],
    minutes: 45,
  });
  assert.strictEqual(validScheduleDay.success, true, 'Valid schedule day must pass');

  // Reject string minutes like "45 mins"
  const stringMinutes = ScheduleDaySchema.safeParse({
    day: 1,
    focus: 'Core Concept Prep',
    question_ids: ['q1'],
    minutes: '45 mins' as any,
  });
  assert.strictEqual(stringMinutes.success, false, 'String minutes label must be rejected');

  // Reject float minutes like 30.5
  const floatMinutes = ScheduleDaySchema.safeParse({
    day: 1,
    focus: 'Core Concept Prep',
    question_ids: ['q1'],
    minutes: 30.5,
  });
  assert.strictEqual(floatMinutes.success, false, 'Float minutes must be rejected');

  // Reject zero or negative minutes
  assert.strictEqual(
    ScheduleDaySchema.safeParse({
      day: 1,
      focus: 'Core Concept Prep',
      question_ids: [],
      minutes: 0,
    }).success,
    false,
    'Zero minutes must be rejected'
  );

  assert.strictEqual(
    ScheduleDaySchema.safeParse({
      day: 1,
      focus: 'Core Concept Prep',
      question_ids: [],
      minutes: -15,
    }).success,
    false,
    'Negative minutes must be rejected'
  );
  console.log('✓ ScheduleDay minutes strictly enforce positive integer minutes');

  // 3. Question requirement_ids must reference defined role requirements
  const validKitData: Kit = {
    source: {
      company: 'Stripe',
      company_url: 'https://stripe.com',
      role: 'Staff Infrastructure Engineer',
      location: 'Remote, US',
      jd_chars: 1450,
      researched_at: '2026-08-16T05:30:00.000Z',
      pages_used: ['https://stripe.com/jobs'],
    },
    company_brief: {
      summary: 'Global payments technology platform.',
      what_they_do: 'Builds economic infrastructure for the internet.',
      sources: ['https://stripe.com/about'],
    },
    role: {
      title: 'Staff Infrastructure Engineer',
      seniority: 'Staff',
      responsibilities: ['Architect globally distributed consensus storage.'],
      requirements: [
        { id: 'r1', text: 'Distributed systems experience', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Go proficiency', kind: 'technical', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain Raft leader election invariants.',
        answer_outline: 'Explain terms, candidate states, and majority voting.',
        difficulty: 3,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What guarantees safety in Raft leader election?',
        back: 'A candidate must contain all committed entries to win election.',
        requirement_ids: ['r1'],
        confidence: 'high',
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'Distributed Systems Deep Dive', question_ids: ['q1'], minutes: 45 },
        { day: 2, focus: 'Go Deep Dive', question_ids: [], minutes: 30 },
        { day: 3, focus: 'Final Review & High-Yield Rehearsal', question_ids: [], minutes: 30 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: ['r2'],
      passes: 1,
    },
  };

  const validResult = validateKit(validKitData);
  assert.strictEqual(validResult.success, true, 'Valid kit must pass Appendix A validation');

  // Cross-entity reference test: Question referencing nonexistent requirement "r99"
  const invalidRefKit = JSON.parse(JSON.stringify(validKitData));
  invalidRefKit.questions[0].requirement_ids = ['r99'];
  const invalidRefResult = KitSchema.safeParse(invalidRefKit);
  assert.strictEqual(invalidRefResult.success, false, 'Kit with dangling requirement_ids must fail validation');
  if (!invalidRefResult.success) {
    const errorText = JSON.stringify(invalidRefResult.error.issues);
    assert.ok(errorText.includes('r99'), 'Error issue must identify dangling requirement r99');
  }
  console.log('✓ Cross-entity referential integrity verified (dangling requirement IDs caught)');

  // Missing required top-level fields
  const missingCompanyBrief = JSON.parse(JSON.stringify(validKitData));
  delete missingCompanyBrief.company_brief;
  assert.strictEqual(KitSchema.safeParse(missingCompanyBrief).success, false, 'Kit without company_brief must fail');

  console.log('✓ All Appendix A Schema unit tests PASSED successfully');
}

if (process.argv[1]?.endsWith('schema.test.ts')) {
  runSchemaTests();
}
