import { SaveKitPayloadSchema } from '../src/controllers/kitController';
import { env } from '../src/config/env';

export function runPersistenceTests() {
  console.log('\n--- Running Persistence & Environment Tests ---');

  // 1. Verify Env Loader
  if (!env.PORT || !env.MONGODB_URI || !env.DB_NAME) {
    throw new Error('Env config validation failed to load required values');
  }
  console.log('✓ Typed environment loader validates configuration successfully');

  // 2. Valid Payload according to Appendix A
  const validPayload = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.example',
      role: 'Staff Infrastructure Engineer',
      location: 'Remote, US',
      jd_chars: 1420,
      researched_at: '2026-09-24T00:00:00Z',
      pages_used: ['https://acme.example/about', 'https://acme.example/eng'],
    },
    company_brief: {
      summary: 'Acme is an enterprise cloud observability platform.',
      what_they_do: 'Builds real-time streaming telemetry engines.',
      sources: ['https://acme.example'],
    },
    role: {
      title: 'Staff Infrastructure Engineer',
      seniority: 'Staff',
      responsibilities: ['Architect multi-region Kafka ingestion'],
      requirements: [
        {
          id: 'r1',
          text: 'Deep knowledge of Raft consensus protocol',
          kind: 'technical' as const,
          priority: 'must' as const,
        },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain leader election mechanics in Raft.',
        answer_outline: 'Randomized election timer, quorum votes, log matching property.',
        difficulty: 3 as const,
        isPinned: true,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What triggers a Raft leader election?',
        back: 'Heartbeat timeout expiry on follower nodes.',
        requirement_ids: ['r1'],
        confidence: 3,
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        {
          day: 1,
          focus: 'Raft consensus architecture',
          question_ids: ['q1'],
          minutes: 45,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
    upsert: true,
  };

  const parseResult = SaveKitPayloadSchema.safeParse(validPayload);
  if (!parseResult.success) {
    throw new Error(`Expected valid payload to pass Zod schema validation: ${JSON.stringify(parseResult.error.format())}`);
  }
  console.log('✓ SaveKitPayloadSchema successfully validates Appendix A Kit payload');

  // 3. Invalid payload (missing required field)
  const invalidPayload = {
    ...validPayload,
    source: {
      ...validPayload.source,
      company: '', // Empty company should fail
    },
  };
  const invalidResult = SaveKitPayloadSchema.safeParse(invalidPayload);
  if (invalidResult.success) {
    throw new Error('Expected invalid payload with empty company to fail validation');
  }
  console.log('✓ SaveKitPayloadSchema correctly rejects payload with empty company');
}
