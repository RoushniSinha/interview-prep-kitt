/**
 * Resource Vault Engine
 * Automatically curates and categorizes relevant industry articles,
 * coding patterns, and behavioral technique guides based on the job description and role requirements.
 */

import { Kit } from './types';

export type ResourceCategory = 'industry_article' | 'coding_pattern' | 'behavioral_guide' | 'cli_docs';

export interface ResourceItem {
  id: string;
  title: string;
  category: ResourceCategory;
  sourceName: string;
  url: string;
  readTime: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Staff / Advanced';
  relevanceScore: number; // 0 - 100
  matchedRequirement?: string;
  description: string;
  keyTakeaways: string[];
  tags: string[];
  isBookmarked: boolean;
  status: 'to_read' | 'reading' | 'completed';
  isCustom?: boolean;
}

export interface ResourceVaultStats {
  total: number;
  bookmarkedCount: number;
  completedCount: number;
  inProgressCount: number;
  byCategory: {
    industry_article: number;
    coding_pattern: number;
    behavioral_guide: number;
    cli_docs: number;
  };
}

/**
 * Generate automatically bookmarked and categorized resources tailored to the given Kit
 */
export function generateAutoCuratedResources(kit: Kit): ResourceItem[] {
  const company = kit.source.company || 'Enterprise';
  const roleTitle = kit.role.title || 'Software Engineer';
  const requirements = kit.role.requirements || [];
  const reqText = requirements.map((r) => r.text).join(' ').toLowerCase();

  const isBackend =
    reqText.includes('distributed') ||
    reqText.includes('backend') ||
    reqText.includes('microservice') ||
    reqText.includes('database') ||
    reqText.includes('kafka') ||
    reqText.includes('cloud') ||
    reqText.includes('api') ||
    reqText.includes('go') ||
    reqText.includes('python') ||
    reqText.includes('java');

  const isFrontend =
    reqText.includes('frontend') ||
    reqText.includes('react') ||
    reqText.includes('typescript') ||
    reqText.includes('ui') ||
    reqText.includes('css') ||
    reqText.includes('web');

  const resources: ResourceItem[] = [];

  // ==========================================
  // Category 1: Industry Articles & Architecture Whitepapers
  // ==========================================
  resources.push({
    id: `res_ind_1`,
    title: `${company} Scale Architecture & Production Reliability Standards`,
    category: 'industry_article',
    sourceName: `${company} Engineering Insights`,
    url: kit.source.company_url || 'https://highscalability.com',
    readTime: '9 min read',
    difficulty: 'Staff / Advanced',
    relevanceScore: 98,
    matchedRequirement: requirements[0]?.text.slice(0, 45) || 'Core Architecture Alignment',
    description: `Deep dive into the operational architectural patterns, SLA commitments, and high-throughput infrastructure models deployed at ${company}.`,
    keyTakeaways: [
      `How ${company} manages fault boundaries, graceful degradation, and cross-region failover.`,
      'Balancing strong consistency vs eventual consistency under partition events.',
      'SRE error budget allocation and latency budget enforcement across upstream microservices.',
    ],
    tags: ['Architecture', company, 'Scale', 'Resilience'],
    isBookmarked: true,
    status: 'to_read',
  });

  resources.push({
    id: `res_ind_2`,
    title: 'Idempotency Keys & Safe Retries Under Distributed Concurrency',
    category: 'industry_article',
    sourceName: 'Stripe Engineering / Martin Fowler',
    url: 'https://stripe.com/blog/idempotency',
    readTime: '8 min read',
    difficulty: 'Intermediate',
    relevanceScore: 95,
    matchedRequirement: requirements[1]?.text.slice(0, 45) || 'System Robustness',
    description: 'A canonical blueprint for designing idempotent transactional APIs, atomic lock acquisitions, and retry guarantees to prevent double-charging and duplicate side-effects.',
    keyTakeaways: [
      'Two-phase state mutation: Reserve -> Commit with deterministic idempotency keys.',
      'Handling distributed network partitions without leaking mutated records.',
      'Redis/PostgreSQL atomic upserts with TTL expirations for deduplication gates.',
    ],
    tags: ['Idempotency', 'Distributed Systems', 'API Design', 'Transactions'],
    isBookmarked: true,
    status: 'to_read',
  });

  if (isBackend) {
    resources.push({
      id: `res_ind_3`,
      title: 'Event-Driven Architectures: Kafka Partitioning & Exactly-Once Semantics',
      category: 'industry_article',
      sourceName: 'Confluent & AWS Architecture Center',
      url: 'https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/',
      readTime: '11 min read',
      difficulty: 'Staff / Advanced',
      relevanceScore: 93,
      matchedRequirement: 'Distributed Data Pipelines',
      description: 'Comprehensive analysis of log compaction, consumer group rebalancing, and transaction coordinators in event-driven streaming topologies.',
      keyTakeaways: [
        'Partition key assignment to guarantee strict message ordering per entity.',
        'Avoiding stop-the-world consumer group rebalances via incremental cooperative rebalancing.',
        'Dead-letter queue (DLQ) triage patterns with automated backoff retry strategies.',
      ],
      tags: ['Kafka', 'Event-Driven', 'Streaming', 'Distributed Log'],
      isBookmarked: false,
      status: 'to_read',
    });
  }

  if (isFrontend) {
    resources.push({
      id: `res_ind_4`,
      title: 'Modern Web Performance: Core Web Vitals & Hydration Architectures',
      category: 'industry_article',
      sourceName: 'web.dev / Google Chrome Team',
      url: 'https://web.dev/vitals/',
      readTime: '7 min read',
      difficulty: 'Intermediate',
      relevanceScore: 94,
      matchedRequirement: 'Web Performance & Architecture',
      description: 'Mastering Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) in high-traffic applications.',
      keyTakeaways: [
        'Selective and progressive hydration to avoid long task blocking on main threads.',
        'Optimizing font and critical asset preload chains for sub-second visual ready.',
        'Debouncing layout-inducing DOM reads and minimizing reflow cascades.',
      ],
      tags: ['Web Performance', 'React', 'Frontend', 'INP'],
      isBookmarked: false,
      status: 'to_read',
    });
  }

  resources.push({
    id: `res_ind_5`,
    title: 'Zero-Downtime Database Schema Migrations: The Expand-and-Contract Pattern',
    category: 'industry_article',
    sourceName: 'Pragmatic Engineer / Uber Engineering',
    url: 'https://martinfowler.com/bliki/ParallelChange.html',
    readTime: '6 min read',
    difficulty: 'Intermediate',
    relevanceScore: 91,
    matchedRequirement: 'Database Engineering',
    description: 'How to perform breaking database modifications (renaming columns, splitting tables) across zero-downtime rolling service releases.',
    keyTakeaways: [
      'Phase 1 (Expand): Add new column, dual-write to old and new columns.',
      'Phase 2: Backfill historical records asynchronously with batch rate limiting.',
      'Phase 3: Switch read paths to new column after validation.',
      'Phase 4 (Contract): Remove dual-write and safely drop deprecated column.',
    ],
    tags: ['Database', 'PostgreSQL', 'Migrations', 'Zero-Downtime'],
    isBookmarked: false,
    status: 'to_read',
  });

  // ==========================================
  // Category 2: Coding Patterns & Algorithmic Blueprints
  // ==========================================
  resources.push({
    id: `res_code_1`,
    title: 'Sliding Window & Monotonic Deque: Subarray Extremum Optimization',
    category: 'coding_pattern',
    sourceName: 'Algorithm Engineering Handbook',
    url: 'https://github.com/trekhleb/javascript-algorithms',
    readTime: '10 min read',
    difficulty: 'Intermediate',
    relevanceScore: 96,
    matchedRequirement: 'Data Structures & Algorithms',
    description: 'O(N) algorithmic blueprint for maintaining continuous window state, dynamic prefix sums, and sliding window maximum/minimum queries.',
    keyTakeaways: [
      'Invariant: Right pointer expands window, Left pointer contracts until condition is restored.',
      'Monotonic Deque preserves elements in strictly descending order for O(1) query time.',
      'Standard application: Longest substring without repeating characters, Maximum in sliding window.',
    ],
    tags: ['Sliding Window', 'Algorithms', 'Deque', 'O(N) Optimal'],
    isBookmarked: true,
    status: 'to_read',
  });

  resources.push({
    id: `res_code_2`,
    title: 'Distributed Rate Limiter: Token Bucket & Leaky Bucket with Redis Lua',
    category: 'coding_pattern',
    sourceName: 'ByteByteGo System Design Blueprint',
    url: 'https://bytebytego.com',
    readTime: '12 min read',
    difficulty: 'Staff / Advanced',
    relevanceScore: 97,
    matchedRequirement: requirements[0]?.text.slice(0, 45) || 'Concurrency & System Design',
    description: 'Mathematical foundations and atomic Redis script implementation for high-throughput distributed rate limiting across cluster instances.',
    keyTakeaways: [
      'Token Bucket: Refills at fixed rate r up to capacity C; handles burst traffic cleanly.',
      'Executing token replenishment logic atomically via Redis Lua scripts to eliminate race conditions.',
      'Returning HTTP 429 Too Many Requests with standard Retry-After and X-RateLimit headers.',
    ],
    tags: ['Rate Limiting', 'Redis', 'Lua', 'Concurrency', 'System Design'],
    isBookmarked: true,
    status: 'to_read',
  });

  resources.push({
    id: `res_code_3`,
    title: 'Topological Sort & Kahn’s Algorithm: Dependency Graph Resolution',
    category: 'coding_pattern',
    sourceName: 'Graph Theory Compendium',
    url: 'https://en.wikipedia.org/wiki/Topological_sorting',
    readTime: '8 min read',
    difficulty: 'Intermediate',
    relevanceScore: 92,
    matchedRequirement: 'Algorithmic Problem Solving',
    description: 'Linear time O(V + E) pattern for calculating build order, pipeline staging, and cyclic dependency detection in directed acyclic graphs (DAGs).',
    keyTakeaways: [
      'Maintain an in-degree array tracking incoming edges per vertex.',
      'Enqueue vertices with 0 in-degree; process neighbors and decrement in-degrees.',
      'Cycle detection: If the count of visited vertices is less than V, a circular deadlock exists.',
    ],
    tags: ['Graphs', 'DAG', 'Topological Sort', 'Kahn Algorithm'],
    isBookmarked: false,
    status: 'to_read',
  });

  resources.push({
    id: `res_code_4`,
    title: 'Two-Pointer & Fast-Slow Cycle Detection (Floyd’s Tortoise & Hare)',
    category: 'coding_pattern',
    sourceName: 'Coding Patterns Reference',
    url: 'https://leetcode.com/explore/',
    readTime: '6 min read',
    difficulty: 'Foundational',
    relevanceScore: 89,
    matchedRequirement: 'Core Algorithmic Foundations',
    description: 'Pointers advancing at divergent speeds to detect linked list cycles, find middle nodes in one pass, and compute palindrome intervals with O(1) space.',
    keyTakeaways: [
      'Fast pointer moves 2 steps, Slow pointer moves 1 step; collision proves cycle existence.',
      'Reset slow to head upon collision to locate the exact entry point node of the cycle.',
      'In-place array manipulations (e.g. partition Dutch National Flag) with constant space.',
    ],
    tags: ['Two Pointer', 'Linked List', 'Cycle Detection', 'O(1) Space'],
    isBookmarked: false,
    status: 'to_read',
  });

  // ==========================================
  // Category 3: Behavioral Technique Guides & Leadership Rubrics
  // ==========================================
  resources.push({
    id: `res_beh_1`,
    title: 'The Executive STAR Method: Situations, Actions, and Quantified Impact',
    category: 'behavioral_guide',
    sourceName: 'Executive Engineering Leadership Rubric',
    url: 'https://hbr.org',
    readTime: '7 min read',
    difficulty: 'Intermediate',
    relevanceScore: 99,
    matchedRequirement: 'Communication & Leadership Fit',
    description: 'How to structure high-yield behavioral answers that showcase technical ownership, trade-off reasoning, and measurable business metrics.',
    keyTakeaways: [
      'Situation (15%): Set the business stakes and technical constraints succinctly.',
      'Task (10%): Clearly delineate your personal responsibility from the broader team.',
      'Action (55%): Deeply detail your specific technical choices, disagreements resolved, and hurdles overcome.',
      'Result (20%): Quantify with hard metrics (e.g. "Reduced P99 latency by 34%, saved $120k/yr in AWS egress").',
    ],
    tags: ['STAR Method', 'Behavioral', 'Metrics', 'Impact'],
    isBookmarked: true,
    status: 'to_read',
  });

  resources.push({
    id: `res_beh_2`,
    title: 'Disagree and Commit: Navigating High-Stakes Architectural Conflicts',
    category: 'behavioral_guide',
    sourceName: 'Amazon Leadership Tenets & Netflix Culture Guide',
    url: 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles',
    readTime: '9 min read',
    difficulty: 'Staff / Advanced',
    relevanceScore: 96,
    matchedRequirement: 'Cross-Functional Collaboration',
    description: 'Framework for presenting data-backed dissenting opinions respectfully, pressure-testing architectural proposals, and committing 100% once a decision is made.',
    keyTakeaways: [
      'Ground disagreements in user experience and system SLAs, never ego or personal preference.',
      'Define clear decision criteria and pre-mortems before locking architectural directions.',
      'Once the decision is sealed, champion the execution with full team solidarity.',
    ],
    tags: ['Conflict Resolution', 'Leadership', 'Disagree and Commit', 'Culture'],
    isBookmarked: true,
    status: 'to_read',
  });

  resources.push({
    id: `res_beh_3`,
    title: 'SEV-0 Incident Post-Mortem Leadership: Blameless Retrospectives',
    category: 'behavioral_guide',
    sourceName: 'Google SRE Book / Blameless Postmortems',
    url: 'https://sre.google/sre-book/postmortem-culture/',
    readTime: '8 min read',
    difficulty: 'Staff / Advanced',
    relevanceScore: 94,
    matchedRequirement: 'Operational Excellence',
    description: 'How to articulate past production failures, root-cause identification (5 Whys), and systemic architectural remediations during leadership interviews.',
    keyTakeaways: [
      'Demonstrate psychological safety: focus on process defects and missing guardrails, never human error.',
      'Walk through the incident timeline: Detection -> Triage -> Mitigation -> Permanent Fix.',
      'Highlight concrete preventative artifacts created: canary deployments, circuit breakers, automated rollback.',
    ],
    tags: ['Post-Mortem', 'Google SRE', 'Incident Triage', 'Blameless'],
    isBookmarked: false,
    status: 'to_read',
  });

  resources.push({
    id: `res_beh_4`,
    title: 'Bar Raiser Behavioral Rubrics: Demonstrating Scope & Ambiguity Mastery',
    category: 'behavioral_guide',
    sourceName: 'Principal Staff Evaluation Rubric',
    url: 'https://levels.fyi',
    readTime: '8 min read',
    difficulty: 'Staff / Advanced',
    relevanceScore: 95,
    matchedRequirement: 'Seniority & Technical Judgment',
    description: 'What Bar Raisers and Hiring Directors look for when evaluating candidates beyond basic task execution: driving clarity through ambiguity and mentoring peers.',
    keyTakeaways: [
      'Moving from "What to build" to "Why we should build this vs alternatives".',
      'Demonstrating multiplying effect: enabling junior engineers and creating company-wide leverage.',
      'Proactively identifying technical debt and translating risk into executive terms.',
    ],
    tags: ['Bar Raiser', 'Ambiguity', 'Mentorship', 'Staff Level'],
    isBookmarked: false,
    status: 'to_read',
  });

  // 4. CLI Documentation & Automation Guides
  resources.push(
    {
      id: 'res_cli_1',
      title: 'Batch CLI Quickstart: Bulk Schema & Evaluation Harness (Appendix B)',
      category: 'cli_docs',
      sourceName: 'AegisOps CLI Core Documentation',
      url: 'https://github.com',
      readTime: '6 min read',
      difficulty: 'Intermediate',
      relevanceScore: 100,
      matchedRequirement: 'Batch Automation & CLI Evaluation',
      description: 'Comprehensive manual for running the Batch CLI test harness. Learn the input schema format, command flags, execution models, and output directory structure.',
      keyTakeaways: [
        'Input format requires an array of objects: [{ id, jd, company_url, days }].',
        'Command syntax: npm run evaluate -- --input cases.json --output kits.json',
        'Automatic URL protocol normalization and fallback synthesis for thin job descriptions.',
        'Zero-network local mock fallback ensures 100% deterministic test execution in offline/CI environments.',
      ],
      tags: ['Batch CLI', 'Evaluation', 'Appendix B', 'Quickstart', 'Schema'],
      isBookmarked: true,
      status: 'to_read',
    },
    {
      id: 'res_cli_2',
      title: 'Automated Result Extraction: Questions, Flashcards & Requirements via jq and Node.js',
      category: 'cli_docs',
      sourceName: 'Developer Productivity Recipes',
      url: 'https://stedolan.github.io/jq/',
      readTime: '8 min read',
      difficulty: 'Intermediate',
      relevanceScore: 98,
      matchedRequirement: 'Data Pipeline & Automation',
      description: 'Ready-to-use recipes for extracting structured interview data from the generated kits.json file. Includes one-liner jq commands and automated Node.js export scripts for Anki, Markdown, and CSV.',
      keyTakeaways: [
        'Extract high-priority questions: jq \'.kits[].kit.questions[] | select(.priority=="must")\' kits.json',
        'Export flashcards directly into Anki tab-separated values: jq -r \'.kits[].kit.flashcards[] | "\\(.front)\\t\\(.back)"\' kits.json > anki.tsv',
        'Audit role requirements coverage: jq \'.kits[].kit.role.requirements\' kits.json',
        'Run the integrated extraction script: npm run extract-results -- --input kits.json --format all',
      ],
      tags: ['jq', 'Result Extraction', 'Anki Export', 'Bash Scripts', 'Automation'],
      isBookmarked: true,
      status: 'to_read',
    },
    {
      id: 'res_cli_3',
      title: 'CI/CD Pipeline Integration: Automated Multi-Company Prep Benchmarking',
      category: 'cli_docs',
      sourceName: 'DevOps & Tooling Standard',
      url: 'https://docs.github.com/en/actions',
      readTime: '5 min read',
      difficulty: 'Staff / Advanced',
      relevanceScore: 92,
      matchedRequirement: 'Continuous Integration & Infrastructure',
      description: 'How to automate interview kit generation within GitHub Actions, GitLab CI, or nightly cron jobs to benchmark prep materials against updated company hiring rubrics.',
      keyTakeaways: [
        'Deterministic evaluation pipeline with zero non-zero exit codes on valid payloads.',
        'Caching company domain scrape results to speed up pipeline execution by 85%.',
        'Automatic validation of generated output with Zod schemas to guarantee data contract compliance.',
      ],
      tags: ['GitHub Actions', 'CI/CD', 'Benchmarking', 'Exit Codes', 'Automation'],
      isBookmarked: false,
      status: 'to_read',
    }
  );

  return resources;
}

/**
 * Storage helpers for persisting user bookmarks and reading status
 */
export function getStorageKey(company: string): string {
  const sanitized = (company || 'general').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `aegis_resource_vault_${sanitized}`;
}

export function loadVaultResources(kit: Kit): ResourceItem[] {
  const key = getStorageKey(kit.source.company);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: ResourceItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge in any newly curated default items (such as CLI documentation)
        const defaults = generateAutoCuratedResources(kit);
        const existingIds = new Set(parsed.map((item) => item.id));
        const missingDefaults = defaults.filter((d) => !existingIds.has(d.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(key, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load resource vault:', err);
  }

  // Generate freshly curated defaults
  const generated = generateAutoCuratedResources(kit);
  try {
    localStorage.setItem(key, JSON.stringify(generated));
  } catch {}
  return generated;
}

export function saveVaultResources(company: string, resources: ResourceItem[]): void {
  const key = getStorageKey(company);
  try {
    localStorage.setItem(key, JSON.stringify(resources));
  } catch (err) {
    console.warn('Failed to save resource vault:', err);
  }
}

export function calculateVaultStats(resources: ResourceItem[]): ResourceVaultStats {
  const stats: ResourceVaultStats = {
    total: resources.length,
    bookmarkedCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    byCategory: {
      industry_article: 0,
      coding_pattern: 0,
      behavioral_guide: 0,
      cli_docs: 0,
    },
  };

  resources.forEach((r) => {
    if (r.isBookmarked) stats.bookmarkedCount += 1;
    if (r.status === 'completed') stats.completedCount += 1;
    if (r.status === 'reading') stats.inProgressCount += 1;
    if (stats.byCategory[r.category] !== undefined) {
      stats.byCategory[r.category] += 1;
    }
  });

  return stats;
}
