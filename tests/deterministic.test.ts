import assert from 'assert';
import { checkCoverage, buildDeterministicSchedule } from '../src/core/deterministic';
import { Requirement, Question } from '../src/core/types';

export function runDeterministicTests() {
  console.log('\n--- Running Deterministic Algorithm Tests ---');

  // Test 1: checkCoverage finds missing 'must' requirements
  const sampleReqs: Requirement[] = [
    { id: 'r1', text: 'Proficiency in TypeScript', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Experience with Kubernetes', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'GraphQL knowledge', kind: 'technical', priority: 'nice' },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain TS generics',
      answer_outline: 'High scoring answer mentions variance and constraints',
      difficulty: 2,
    },
  ];

  const uncovered = checkCoverage(sampleReqs, sampleQuestions);
  assert.strictEqual(uncovered.length, 1, 'Should find exactly 1 uncovered must requirement');
  assert.strictEqual(uncovered[0], 'r2', 'Uncovered requirement must be r2');
  console.log('✓ checkCoverage successfully identifies uncovered must-haves');

  // Test 2: 'nice' requirements do not count as uncovered musts
  const coveredQuestions: Question[] = [
    ...sampleQuestions,
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'Kubernetes deployment strategies',
      answer_outline: 'Canary vs Blue-Green',
      difficulty: 3,
    },
  ];

  const uncovered2 = checkCoverage(sampleReqs, coveredQuestions);
  assert.strictEqual(uncovered2.length, 0, 'All must-haves are covered; r3 (nice) is excluded');
  console.log('✓ checkCoverage ignores nice-to-have omissions');

  // Test 3: buildDeterministicSchedule allocates exactly N days
  const daysTarget = 5;
  const schedule = buildDeterministicSchedule(daysTarget, coveredQuestions, sampleReqs);
  assert.strictEqual(schedule.length, daysTarget, `Schedule must have exactly ${daysTarget} days`);

  // Test 4: Duration minutes must be integer
  for (const day of schedule) {
    assert.strictEqual(Number.isInteger(day.minutes), true, 'Day minutes must be strictly integer');
    assert.strictEqual(day.minutes > 0, true, 'Day minutes must be positive');
  }
  console.log('✓ buildDeterministicSchedule enforces integer minutes and exact day count');

  // Test 5: Higher difficulty (3 -> 1) and must-have items are prioritized earlier
  const multiQuestions: Question[] = [
    { id: 'q_easy', requirement_ids: ['r3'], category: 'technical', prompt: 'easy', answer_outline: 'ans', difficulty: 1 },
    { id: 'q_hard_must', requirement_ids: ['r1'], category: 'system-design', prompt: 'hard must', answer_outline: 'ans', difficulty: 3 },
  ];

  const schedule2 = buildDeterministicSchedule(2, multiQuestions, sampleReqs);
  assert.strictEqual(schedule2[0].question_ids.includes('q_hard_must'), true, 'Day 1 must contain high-priority hard must question');
  console.log('✓ buildDeterministicSchedule prioritizes high difficulty & must requirements earlier');
}
