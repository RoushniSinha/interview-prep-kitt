import assert from 'assert';
import {
  checkCoverage,
  allocateSchedule,
} from '../../src/pipeline/deterministic';
import { Requirement, Question } from '../../src/core/types';

export function runDeterministicUnitTests() {
  console.log('\n--- Running Deterministic Pipeline Unit Tests ---');

  // --------------------------------------------------------------------------
  // 1. Coverage Gap Isolation
  // --------------------------------------------------------------------------
  console.log('\n[1. Coverage Gap Isolation Tests]');

  const testRequirements: Requirement[] = [
    { id: 'r1', text: 'Distributed systems experience', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Go proficiency', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Kubernetes orchestration', kind: 'technical', priority: 'nice' },
    { id: 'r4', text: 'Cross-functional leadership', kind: 'behavioural', priority: 'must' },
  ];

  const questionsCoveringR1AndR3: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain Raft leader election.',
      answer_outline: 'Outline.',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r3'],
      category: 'technical',
      prompt: 'Explain Kubelet reconciliation.',
      answer_outline: 'Outline.',
      difficulty: 2,
    },
  ];

  // r1 is covered (must). r3 is covered (nice).
  // Uncovered must-haves: r2 and r4. r3 is 'nice' so it's not in the gap list.
  const gaps = checkCoverage(testRequirements, questionsCoveringR1AndR3);
  assert.deepStrictEqual(gaps.sort(), ['r2', 'r4'].sort(), 'Uncovered must requirements must be r2 and r4');
  console.log('✓ checkCoverage isolates uncovered "must" requirements without flagging "nice" items');

  // When all must-haves are covered
  const questionsCoveringAllMust: Question[] = [
    ...questionsCoveringR1AndR3,
    { id: 'q3', requirement_ids: ['r2'], category: 'technical', prompt: 'Go routines.', answer_outline: 'A', difficulty: 2 },
    { id: 'q4', requirement_ids: ['r4'], category: 'behavioural', prompt: 'Leadership scenario.', answer_outline: 'A', difficulty: 1 },
  ];
  const noGaps = checkCoverage(testRequirements, questionsCoveringAllMust);
  assert.strictEqual(noGaps.length, 0, 'Fully covered requirements must yield 0 gaps');
  console.log('✓ checkCoverage returns empty gap array when all must requirements are satisfied');

  // Tombstones test: if q1 is tombstoned, r1 becomes uncovered
  const gapsWithTombstone = checkCoverage(testRequirements, questionsCoveringAllMust, ['q1']);
  assert.ok(gapsWithTombstone.includes('r1'), 'Tombstoned question must not count towards requirement coverage');
  console.log('✓ checkCoverage respects tombstones and invalidates coverage from deleted questions');

  // --------------------------------------------------------------------------
  // 2. Schedule Allocation: 1-Day vs 14-Day Distribution
  // --------------------------------------------------------------------------
  console.log('\n[2. Schedule Allocation Tests: 1-Day vs 14-Day]');

  // Test 1-Day Schedule
  const oneDaySchedule = allocateSchedule(testRequirements, questionsCoveringAllMust, 1);
  assert.strictEqual(oneDaySchedule.length, 1, '1-day schedule must have exactly 1 day entry');
  assert.strictEqual(oneDaySchedule[0].day, 1);
  assert.strictEqual(oneDaySchedule[0].focus, 'Comprehensive Intensive Interview Preparation');
  assert.strictEqual(oneDaySchedule[0].question_ids.length, 4, 'All 4 questions must be packed into day 1');
  assert.strictEqual(Number.isInteger(oneDaySchedule[0].minutes), true, 'Minutes must be integer');
  assert.ok(oneDaySchedule[0].minutes > 0, 'Minutes must be strictly positive');
  // diff 3(45) + diff 2(30) + diff 2(30) + diff 1(15) = 120 minutes
  assert.strictEqual(oneDaySchedule[0].minutes, 120, '1-day minutes must equal sum of question durations');
  console.log('✓ 1-day schedule correctly condenses all questions with comprehensive focus');

  // Test 14-Day Schedule
  const fourteenDaySchedule = allocateSchedule(testRequirements, questionsCoveringAllMust, 14);
  assert.strictEqual(fourteenDaySchedule.length, 14, '14-day schedule must contain exactly 14 day elements');

  // Verify all days have positive integer minutes
  for (const day of fourteenDaySchedule) {
    assert.strictEqual(Number.isInteger(day.day), true, `Day ${day.day} index must be integer`);
    assert.strictEqual(Number.isInteger(day.minutes), true, `Day ${day.day} minutes must be integer`);
    assert.ok(day.minutes > 0, `Day ${day.day} minutes (${day.minutes}) must be strictly positive`);
    assert.ok(day.focus.length > 0, `Day ${day.day} focus must not be empty`);
  }

  // Verify final day designation
  const lastDay = fourteenDaySchedule[13];
  assert.strictEqual(lastDay.day, 14);
  assert.strictEqual(lastDay.focus, 'Final Review & High-Yield Rehearsal');
  console.log('✓ 14-day schedule guarantees 14 discrete days, positive integer durations, and final review focus');

  // Verify priority front-loading
  // Question with difficulty 3 covering must-have requirement should be on day 1
  const day1Questions = fourteenDaySchedule[0].question_ids;
  assert.ok(day1Questions.includes('q1'), 'Highest difficulty must question (q1) must be front-loaded on day 1');
  console.log('✓ Must-have and high-difficulty questions are front-loaded on earlier days');

  // Empty questions input test
  const emptySchedule = allocateSchedule(testRequirements, [], 5);
  assert.strictEqual(emptySchedule.length, 5, 'Empty questions must still yield exactly 5 days');
  assert.strictEqual(emptySchedule.every((d) => d.minutes === 30), true, 'Empty schedule days must normalize to 30m baseline');
  console.log('✓ Schedule allocation with zero questions normalizes cleanly with positive integer baselines');

  console.log('✓ All Deterministic Pipeline unit tests PASSED successfully');
}

if (process.argv[1]?.endsWith('deterministic.test.ts')) {
  runDeterministicUnitTests();
}
