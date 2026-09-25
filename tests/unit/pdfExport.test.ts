import assert from 'assert';
import { generateKitPdf } from '../../src/services/pdfExportService';
import { Kit } from '../../src/core/types';

export function runPdfExportTests() {
  console.log('\n--- Running PDF Resume & Prep Kit Export Unit Tests ---');

  const testKit: Kit = {
    source: {
      company: 'Datadog',
      company_url: 'https://datadoghq.com',
      role: 'Staff Distributed Systems Engineer',
      location: 'New York / Remote',
      jd_chars: 1800,
      researched_at: '2026-08-16T05:30:00.000Z',
      pages_used: ['https://datadoghq.com/careers', 'https://datadoghq.com/engineering'],
    },
    company_brief: {
      summary: 'Observability and security platform for cloud applications.',
      what_they_do: 'Processes trillions of metrics daily using distributed streaming systems.',
      sources: ['https://datadoghq.com/about'],
    },
    role: {
      title: 'Staff Distributed Systems Engineer',
      seniority: 'Staff',
      responsibilities: [
        'Architect high-throughput timeseries ingestion pipelines.',
        'Drive cross-team consensus on storage engine evolutions.',
        'Mentor senior engineers in fault-tolerant distributed algorithms.',
      ],
      requirements: [
        { id: 'r1', text: '5+ years Go or Rust systems programming', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Distributed consensus (Raft, Paxos)', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Kafka or timeseries databases', kind: 'domain', priority: 'nice' },
        { id: 'r4', text: 'Cross-functional technical leadership', kind: 'behavioural', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1', 'r2'],
        category: 'technical',
        prompt: 'How would you mitigate Raft log compaction latency spikes in a high-write cluster?',
        answer_outline: 'Discuss snapshotting in separate goroutines, chunked streaming, and LSM compactions.',
        difficulty: 3,
      },
      {
        id: 'q2',
        requirement_ids: ['r4'],
        category: 'behavioural',
        prompt: 'Describe a situation where you had to push back on an unscalable architecture proposed by leadership.',
        answer_outline: 'Framework: STAR. Emphasize data-driven metrics, risk assessment, and collaborative consensus.',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is the Raft Election Safety property?',
        back: 'At most one leader can be elected in a given term.',
        requirement_ids: ['r2'],
        confidence: 'high',
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'Distributed Systems Deep Dive', question_ids: ['q1'], minutes: 45 },
        { day: 2, focus: 'Leadership & Behavioural Rehearsal', question_ids: ['q2'], minutes: 30 },
        { day: 3, focus: 'Final Review & High-Yield Rehearsal', question_ids: [], minutes: 30 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };

  // Test 1: Generate Full PDF with all sections enabled
  const fullDoc = generateKitPdf(testKit, null, {
    candidateName: 'Jordan Vance',
    candidateEmail: 'jordan.vance@techleader.io',
    candidatePhone: '+1 (555) 789-0123',
    candidateLocation: 'Seattle, WA',
    includeResumeSection: true,
    includeCompanyBrief: true,
    includeRequirements: true,
    includeQuestions: true,
    includeSchedule: true,
    includeFlashcards: true,
  });

  assert.ok(fullDoc, 'PDF Document must be created');
  const pageCount = fullDoc.getNumberOfPages();
  assert.ok(pageCount >= 1, `PDF must contain pages (actual: ${pageCount})`);

  // Verify binary output generation
  const pdfArrayBuffer = fullDoc.output('arraybuffer');
  assert.ok(pdfArrayBuffer.byteLength > 1000, 'PDF output buffer must contain rendered content');
  console.log(`✓ Full PDF generated successfully (${pageCount} pages, ${pdfArrayBuffer.byteLength} bytes)`);

  // Test 2: Generate PDF with specific section toggles
  const resumeOnlyDoc = generateKitPdf(testKit, null, {
    candidateName: 'Taylor Morgan',
    includeResumeSection: true,
    includeCompanyBrief: false,
    includeRequirements: false,
    includeQuestions: false,
    includeSchedule: false,
    includeFlashcards: false,
  });
  assert.ok(resumeOnlyDoc.getNumberOfPages() >= 1, 'Resume-only PDF must generate cleanly');
  console.log('✓ Targeted section toggle verified: Resume-only generation works cleanly');

  // Test 3: Edge Case: Minimal Kit with 0 responsibilities and empty sources
  const minimalKit: Kit = {
    ...testKit,
    company_brief: { summary: 'Stealth Co.', what_they_do: 'AI R&D', sources: [] },
    role: { ...testKit.role, responsibilities: [] },
    questions: [],
    flashcards: [],
  };
  const minimalDoc = generateKitPdf(minimalKit, null, {
    candidateName: 'Anonymous Candidate',
  });
  assert.ok(minimalDoc.getNumberOfPages() >= 1, 'Minimal kit must not throw and generate valid PDF');
  console.log('✓ Minimal kit edge case safely handled without exceptions');

  console.log('✓ All PDF Export unit tests PASSED successfully!');
}

if (process.argv[1]?.endsWith('pdfExport.test.ts')) {
  runPdfExportTests();
}
