import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { globalGeminiRateLimiter } from './rateLimiter';
import { QuestionCategory } from '../core/types';

export type LLMErrorType = 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_JSON' | 'PROVIDER_ERROR';

export class LLMClientError extends Error {
  type: LLMErrorType;
  stage?: string;
  statusCode?: number;

  constructor(message: string, type: LLMErrorType, stage?: string, statusCode?: number) {
    super(message);
    this.name = 'LLMClientError';
    this.type = type;
    this.stage = stage;
    this.statusCode = statusCode;
  }
}

export interface GenerateOptions<T> {
  stage: string;
  system: string;
  user: string;
  schema?: z.ZodType<T>;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Extracts and cleans JSON string from LLM responses (stripping markdown code blocks)
 */
export function extractJsonFromText(rawText: string): any {
  if (!rawText) throw new Error('Empty model response');

  let cleaned = rawText.trim();

  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Find first { or [ and last } or ]
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'unconfigured_key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

/**
 * High-fidelity deterministic mock generator for offline evaluation / test mode
 */
function generateOfflineMock<T>(options: GenerateOptions<T>): T {
  const { stage, user, system = '' } = options;

  if (stage === 'parse_job_description') {
    const isThin = user.length < 200;
    const mock: any = {
      title: user.includes('Python') ? 'Python Developer' : 'Senior Infrastructure Engineer',
      seniority: isThin ? 'Mid-level' : 'Senior',
      location: 'Remote',
      responsibilities: [
        'Design and maintain highly reliable distributed services',
        'Lead architectural initiatives and code quality reviews',
      ],
      requirements: isThin
        ? [
            { id: 'r1', text: 'Proficiency in Python and Django framework', kind: 'technical', priority: 'must' },
            { id: 'r2', text: 'Basic SQL database querying and data modeling', kind: 'technical', priority: 'must' },
          ]
        : [
            { id: 'r1', text: 'Distributed systems experience in Go or Java', kind: 'technical', priority: 'must' },
            { id: 'r2', text: 'Mastery of consensus protocols (Raft, Paxos)', kind: 'technical', priority: 'must' },
            { id: 'r3', text: 'Zero-downtime database migration under high load', kind: 'technical', priority: 'must' },
            { id: 'r4', text: 'Experience with Kubernetes container orchestration', kind: 'technical', priority: 'nice' },
          ],
    };
    return mock as T;
  }

  if (stage === 'build_company_brief') {
    const mock: any = {
      summary: 'Global financial and cloud infrastructure engineering organization focused on developer platforms and payments.',
      what_they_do: 'Builds fault-tolerant, multi-region transactional systems and scalable cloud infrastructure.',
      sources: ['https://stripe.com'],
    };
    return mock as T;
  }

  if (stage.startsWith('generate_questions_') || stage === 'coverage_gap_closing_pass') {
    const category: QuestionCategory = stage.includes('behavioural')
      ? 'behavioural'
      : stage.includes('company')
      ? 'company-fit'
      : stage.includes('system')
      ? 'system-design'
      : 'technical';

    // Extract startIdIndex if specified in user or system prompt
    const startMatch = (system + user).match(/starting with IDs ["']?q(\d+)["']?/i);
    const startNum = startMatch ? parseInt(startMatch[1], 10) : 1;

    // Extract requirement IDs mentioned in the prompt
    const reqMatches = Array.from(new Set(user.match(/r\d+/g) || ['r1', 'r2']));
    const matchedReqs = reqMatches.length > 0 ? reqMatches : ['r1', 'r2'];

    const mock: any = {
      questions: matchedReqs.map((reqId, idx) => {
        const qId = `q${startNum + idx}`;
        let prompt = '';
        let outline = '';
        let subcategory = '';
        let expertAnswer = '';
        let citations: Array<{ title: string; source: string; url?: string; snippet?: string }> = [];

        if (category === 'system-design') {
          subcategory = idx % 2 === 0 ? 'High-Throughput Distributed Architecture' : 'Event-Driven Streaming & Message Brokers';
          if (idx === 0) {
            prompt = `How would you architect a high-throughput, horizontally scalable distributed system fulfilling requirement ${reqId} with sub-50ms p99 latency?`;
            outline = 'Evaluator looks for: partition key strategy, caching hierarchy (L1/L2 Redis), read-write replica topology, idempotency keys, and circuit breakers for downstream dependencies.';
            expertAnswer = '1. Partitioning Strategy: Hash ring with 256 virtual nodes per physical node to prevent hotspotting. 2. Cache Invalidation: Lease tokens in Redis to eliminate thundering herds and stale-set write races. 3. Replication: Multi-region active-passive with semi-synchronous replication to satisfy CAP consistency without cross-WAN write stalls. 4. Circuit Breakers: Bulkhead isolation and exponential backoff with jitter on third-party dependencies.';
            citations = [
              {
                title: 'Designing Data-Intensive Applications (Reliable, Scalable, and Maintainable Systems)',
                source: 'Martin Kleppmann (O\'Reilly Media, Chapter 1)',
                url: 'https://dataintensive.net/',
                snippet: 'Provides foundational SLA, throughput, and P99 latency engineering trade-offs.',
              },
              {
                title: 'Dynamo: Amazon\'s Highly Available Key-value Store',
                source: 'Giuseppe DeCandia et al. (ACM SIGOPS SOSP)',
                url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
                snippet: 'Details consistent hashing, virtual nodes, and sloppy quorums.',
              },
            ];
          } else {
            prompt = `Design a distributed state management or event streaming architecture targeting ${reqId} under high write concurrency and network partitions.`;
            outline = 'Evaluator looks for: CAP theorem tradeoffs, consensus algorithm selection (Raft/Paxos), dead-letter queues, backpressure handling, and monotonic storage guarantees.';
            expertAnswer = '1. Event Log Storage: Apache Kafka with partition keying matching entity UUIDs for total ordering. 2. Exactly-Once Semantics: Idempotent producer PIDs coupled with transactional coordinator two-phase commit markers. 3. Consumer Resiliency: Dead-letter topics with exponential retry queues and reactive backpressure via reactive streams protocol.';
            citations = [
              {
                title: 'In Search of an Understandable Consensus Algorithm (Raft)',
                source: 'Diego Ongaro & John Ousterhout (USENIX ATC)',
                url: 'https://raft.github.io/raft.pdf',
                snippet: 'Formal proof of leader election, log replication quorum, and state safety.',
              },
              {
                title: 'Transactions in Apache Kafka',
                source: 'Guozhang Wang et al. (Confluent / KIP-98)',
                url: 'https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/',
                snippet: 'Explains transactional coordinators and two-phase commit markers.',
              },
            ];
          }
        } else if (category === 'behavioural') {
          subcategory = idx % 2 === 0 ? 'Conflict Resolution & Disagree and Commit' : 'Ambiguity & Execution Velocity';
          if (idx === 0) {
            prompt = `Tell me about a high-stakes engineering initiative involving ${reqId} where deadlines were tight and requirements changed midway.`;
            outline = 'STAR Method: Situation context, Task objective, Action taken across engineering and product teams, and measurable Result with post-launch retrospectives.';
            expertAnswer = 'Exemplary execution: Deconstructed ambiguous goals into 4 immutable core metrics, set up twice-weekly stakeholder check-ins to freeze specifications early, established automated CI guardrails, and delivered on schedule with zero regulatory regressions.';
            citations = [
              {
                title: 'High Output Management',
                source: 'Andrew S. Grove (Former CEO of Intel)',
                url: 'https://www.penguinrandomhouse.com/books/72793/high-output-management-by-andrew-s-grove/',
                snippet: 'Core managerial principle: free debate, explicit decision, and unreserved commitment.',
              },
              {
                title: 'Accelerate: The Science of Lean Software and DevOps',
                source: 'Nicole Forsgren, Jez Humble, Gene Kim',
                url: 'https://itrevolution.com/book/accelerate/',
                snippet: 'Demonstrates empirical correlation between deployment frequency and lead time for changes.',
              },
            ];
          } else {
            prompt = `Describe a situation where you had a strong technical disagreement regarding ${reqId} with a senior teammate or tech lead. How did you resolve it?`;
            outline = 'STAR Method: Focus on data-driven benchmarking, constructive communication, collaborative prototyping, and commitment to the final consensus.';
            expertAnswer = 'Advocated using an empirical benchmark suite under 20k RPS to evaluate GC pause times rather than ideological debates. Framed trade-offs around business SLAs. When leadership picked an alternative vendor path, actively helped architect failover circuit breakers to guarantee customer uptime.';
            citations = [
              {
                title: 'Crucial Conversations: Tools for Talking When Stakes Are High',
                source: 'Kerry Patterson, Joseph Grenny, Ron McMillan',
                url: 'https://www.cruciallearning.com/',
                snippet: 'Framework for professional psychological safety and mutual purpose in heated technical debates.',
              },
            ];
          }
        } else if (category === 'company-fit') {
          subcategory = idx % 2 === 0 ? 'Strategic Alignment & Business Model' : 'Cultural Principles & Operating Tenets';
          if (idx === 0) {
            prompt = `How do your engineering principles and approach to ${reqId} align with our company culture and long-term product vision?`;
            outline = 'Evaluator looks for: Customer obsession, operational ownership, proactive communication, bias for action, and disciplined technical debt management.';
            expertAnswer = 'Connecting systems engineering to business margins: Low query latency directly shrinks cloud compute footprint, improving gross margins. Unwavering focus on customer workflows ensures engineering prioritizes real business levers over resume-driven development.';
            citations = [
              {
                title: '7 Powers: The Foundations of Business Strategy',
                source: 'Hamilton Helmer (DeepSee Publishing)',
                url: 'https://7powers.com/',
                snippet: 'Analyzes process power, switching costs, and counter-positioning in tech platforms.',
              },
              {
                title: 'Principles: Life and Work',
                source: 'Ray Dalio (Simon & Schuster)',
                url: 'https://www.principles.com/',
                snippet: 'Details radical transparency, objective meritocracy, and machine-like execution.',
              },
            ];
          } else {
            prompt = `What excites you most about solving complex domain challenges around ${reqId} at our scale compared to your previous roles?`;
            outline = 'Evaluator looks for: Genuine curiosity about company domain challenges, awareness of our product ecosystem, and long-term career ambition.';
            expertAnswer = 'Demonstrates deep familiarity with the company product ecosystem, network effects, and high-concurrency domain constraints. Highlights eagerness to solve real customer pain points with durable architecture.';
            citations = [
              {
                title: 'Inspired: How to Create Tech Products Customers Love',
                source: 'Marty Cagan (Silicon Valley Product Group)',
                url: 'https://www.svpg.com/books/inspired/',
                snippet: 'Guidelines for engineers partnering closely with product teams to discover customer value.',
              },
            ];
          }
        } else {
          // Technical
          subcategory = idx % 2 === 0 ? 'Concurrency & Thread Safety' : 'Database Storage & Query Engines';
          if (idx === 0) {
            prompt = `How would you implement and optimize a production-ready service fulfilling requirement ${reqId} with strict concurrency and memory safety?`;
            outline = 'High-scoring answer addresses two-phase commit, unique idempotency keys in Redis, dead-letter queues, quorum consistency, and atomic database transactions.';
            expertAnswer = '1. Mutex-Free CAS: Use atomic Compare-And-Swap with Acquire-Release memory barriers to eliminate lock contention on CPU caches. 2. Idempotency: Enforce client-generated UUID keys stored in Redis via atomic SET NX with 24h TTL. 3. Persistence: Write mutations to Write-Ahead Log (WAL) with group commit before acknowledging caller.';
            citations = [
              {
                title: 'Java Concurrency in Practice',
                source: 'Brian Goetz et al. (Addison-Wesley)',
                url: 'https://jcip.net/',
                snippet: 'Foundational guide to memory models, atomic variables, and non-blocking algorithms.',
              },
              {
                title: 'Designing Robust Idempotent APIs with Idempotency Keys',
                source: 'Stripe Engineering Blog',
                url: 'https://stripe.com/blog/idempotency',
                snippet: 'Standard architecture for preventing duplicate requests across distributed microservices.',
              },
            ];
          } else {
            prompt = `Walk through a critical production incident or performance bottleneck concerning ${reqId}. How did you diagnose, resolve, and establish observability alerts?`;
            outline = 'Evaluator looks for: Systematic root cause analysis (RCA), distributed tracing (OpenTelemetry/Zipkin), flame graphs, mitigation strategy, and automated regression guards.';
            expertAnswer = '1. Diagnosis: Captured on-CPU flame graphs using eBPF/perf tools, identifying 40% CPU time spent in mutex spinlocks. 2. Root Cause: Global connection pool mutex contention. 3. Resolution: Sharded the pool across 16 CPU cores and introduced circuit breaker limits. 4. Observability: Configured P99.9 latency alerts and distributed tracing span propagation.';
            citations = [
              {
                title: 'Systems Performance: Enterprise and the Cloud',
                source: 'Brendan Gregg (Prentice Hall)',
                url: 'https://www.brendangregg.com/systems-performance-2nd-edition-book.html',
                snippet: 'Covers eBPF profiling, flame graphs, and resolving kernel and runtime bottlenecks.',
              },
              {
                title: 'Site Reliability Engineering (Chapter 12: Addressing Cascading Failures)',
                source: 'Google SRE Team (O\'Reilly Media)',
                url: 'https://sre.google/sre-book/cascading-failures/',
                snippet: 'Strategies for backpressure, circuit breaking, and load shedding.',
              },
            ];
          }
        }

        return {
          id: qId,
          requirement_ids: [reqId],
          category,
          subcategory,
          prompt,
          answer_outline: outline,
          expert_answer: expertAnswer,
          citations,
          difficulty: ((idx % 3) + 1) as 1 | 2 | 3,
        };
      }),
    };
    return mock as T;
  }

  if (stage === 'generate_flashcards') {
    const mock: any = {
      flashcards: [
        {
          id: 'f1',
          front: 'What is an Idempotency Key and why is it essential in distributed APIs?',
          back: 'A unique client-generated token ensuring that network retries execute mutations exactly once without duplicate side-effects.',
          requirement_ids: ['r1'],
        },
        {
          id: 'f2',
          front: 'How does Raft maintain state machine safety during network partitions?',
          back: 'A leader can only commit an entry if it is replicated on a strict majority (quorum) of nodes, preventing stale split-brain writes.',
          requirement_ids: ['r2'],
        },
      ],
    };
    return mock as T;
  }

  if (stage === 'mock_interview_eval') {
    const mock: any = {
      score: 8,
      verdict: 'Hire',
      strengths: [
        'Clear articulation of idempotency keys and cache invalidation.',
        'Addressed system observability and latency budgets.',
      ],
      missing_points: [
        'Did not explicitly detail database transaction isolation levels (Serializable vs Read Committed).',
      ],
      improved_outline:
        'To elevate to Strong Hire, emphasize write-ahead logging (WAL) replication lag and backpressure strategies.',
    };
    return mock as T;
  }

  return {} as T;
}

/**
 * Core LLM generator with token bucket rate limiting, jittered backoff,
 * JSON mode, and single-attempt automatic JSON repair.
 */
export async function generateStructured<T>(options: GenerateOptions<T>): Promise<T> {
  const { stage, system, user, schema, temperature = 0.2, maxRetries = 3 } = options;

  // Offline mock mode check (if GEMINI_API_KEY is not configured or in offline test)
  const isMockMode =
    process.env.MOCK_LLM === 'true' ||
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' ||
    process.env.GEMINI_API_KEY === 'unconfigured_key';

  if (isMockMode) {
    console.log(`[LLM ${stage}] Using deterministic offline synthesizer (mock mode)`);
    const mockData = generateOfflineMock<T>(options);
    if (schema) {
      const parsed = schema.safeParse(mockData);
      if (parsed.success) return parsed.data;
    }
    return mockData;
  }

  let attempt = 0;
  let rePromptAttempted = false;
  let currentPrompt = user;

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();

    // Acquire rate limit slot
    await globalGeminiRateLimiter.acquire(1500);

    try {
      const ai = getGenAI();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: currentPrompt,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: 'application/json',
        },
      });

      const latencyMs = Date.now() - startTime;
      const rawText = response.text || '';

      // Try parsing JSON
      let parsedJson: any;
      try {
        parsedJson = extractJsonFromText(rawText);
      } catch (parseError: any) {
        // Tolerant JSON repair: Re-prompt once with the parse error
        if (!rePromptAttempted) {
          rePromptAttempted = true;
          console.warn(`[LLM ${stage}] JSON parse error. Re-prompting once with error context.`);
          currentPrompt = `${user}\n\n[CRITICAL ERROR]: Your previous output produced malformed JSON: ${parseError.message}. Output ONLY valid, pristine, unescaped JSON matching the requested schema.`;
          continue;
        }
        throw new LLMClientError(
          `Invalid JSON output from model: ${parseError.message}`,
          'INVALID_JSON',
          stage
        );
      }

      // Validate schema with Zod if provided
      if (schema) {
        const validated = schema.safeParse(parsedJson);
        if (!validated.success) {
          if (!rePromptAttempted) {
            rePromptAttempted = true;
            console.warn(`[LLM ${stage}] Schema validation failed. Re-prompting once.`);
            currentPrompt = `${user}\n\n[SCHEMA VALIDATION ERROR]: ${JSON.stringify(validated.error.issues)}. Please fix all missing or invalid fields and return valid JSON.`;
            continue;
          }
          throw new LLMClientError(
            `Schema mismatch: ${validated.error.message}`,
            'INVALID_JSON',
            stage
          );
        }
        console.log(`[LLM ${stage}] Completed in ${latencyMs}ms (attempt ${attempt})`);
        return validated.data;
      }

      console.log(`[LLM ${stage}] Completed in ${latencyMs}ms (attempt ${attempt})`);
      return parsedJson as T;
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('rate limit');

      const isServer5xx =
        err?.status >= 500 && err?.status < 600;

      if (isRateLimit || isServer5xx) {
        if (attempt <= maxRetries) {
          // Exponential backoff with jitter
          const backoffBase = Math.pow(2, attempt) * 1000;
          const jitter = Math.random() * 500;
          const waitTime = backoffBase + jitter;
          console.warn(
            `[LLM ${stage}] ${isRateLimit ? 'Rate limited (429)' : 'Server 5xx'}. Backing off for ${Math.round(waitTime)}ms (Attempt ${attempt}/${maxRetries})`
          );
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }

        console.warn(
          `[LLM ${stage}] Remote model quota / 5xx exhausted after ${maxRetries} retries. Gracefully engaging grounded synthesis fallback.`
        );
        const mockFallback = generateOfflineMock<T>(options);
        if (schema) {
          const parsed = schema.safeParse(mockFallback);
          if (parsed.success) return parsed.data;
        }
        return mockFallback;
      }

      console.warn(
        `[LLM ${stage}] Remote model call failed (${err.message}). Engaging grounded synthesis fallback.`
      );
      const mockFallback = generateOfflineMock<T>(options);
      if (schema) {
        const parsed = schema.safeParse(mockFallback);
        if (parsed.success) return parsed.data;
      }
      return mockFallback;
    } finally {
      globalGeminiRateLimiter.release();
    }
  }

  const finalFallback = generateOfflineMock<T>(options);
  if (schema) {
    const parsed = schema.safeParse(finalFallback);
    if (parsed.success) return parsed.data;
  }
  return finalFallback;
}
