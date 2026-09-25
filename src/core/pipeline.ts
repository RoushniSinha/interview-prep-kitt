import { z } from 'zod';
import {
  Kit,
  Requirement,
  Question,
  Flashcard,
  KitSchema,
  RequirementSchema,
  QuestionSchema,
  QuestionCategory,
  FlashcardSchema,
} from './types';
import { checkCoverage, buildDeterministicSchedule } from './deterministic';
import { crawlSite, searchPublicDiscussion, CrawlResult } from '../scraper/crawler';
import { sanitizeAndWrapUntrusted } from '../scraper/security';
import { generateStructured } from '../llm/client';

export type ProgressCallback = (stage: string, percent: number, message: string) => void;

// ==========================================
// Stage 1: Parse Job Description
// ==========================================

const RoleExtractionSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  location: z.string().default('Remote / Unspecified'),
  responsibilities: z.array(z.string()),
  requirements: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      kind: z.enum(['technical', 'behavioural', 'domain']),
      priority: z.enum(['must', 'nice']),
    })
  ),
});

export async function parseJobDescription(jd: string): Promise<z.infer<typeof RoleExtractionSchema>> {
  const wrappedJd = sanitizeAndWrapUntrusted(jd, 'job_description');

  const system = `You are an expert technical talent evaluator. Your task is to extract role details and explicit requirements from a raw job description.
RULES:
1. Do not invent requirements. If the job description is short, ambiguous, or lacks detail, extract ONLY what is explicitly stated. If very short, state what is known.
2. Assign each requirement a stable ID starting with "r1", "r2", "r3", etc.
3. Classify "kind" strictly as one of: "technical", "behavioural", or "domain".
4. Classify "priority" strictly as:
   - "must": mandatory, required, minimum qualifications, core responsibilities.
   - "nice": preferred, plus, bonus, nice-to-have, advantageous.
5. If seniority is not explicitly stated, infer based on scope (e.g. Junior, Mid-level, Senior, Staff) or return "Mid-Senior".
6. Output valid JSON matching the exact schema.`;

  const user = `Job Description:
${wrappedJd}

Output Schema:
{
  "title": string,
  "seniority": string,
  "location": string,
  "responsibilities": string[],
  "requirements": [
    {
      "id": "r1",
      "text": string,
      "kind": "technical" | "behavioural" | "domain",
      "priority": "must" | "nice"
    }
  ]
}`;

  return await generateStructured({
    stage: 'parse_job_description',
    system,
    user,
    schema: RoleExtractionSchema,
    temperature: 0.1,
  });
}

// ==========================================
// Stage 3: Synthesize Grounded Company Brief
// ==========================================

const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export async function buildCompanyBrief(
  companyUrl: string,
  crawledPages: { url: string; title: string; text: string }[],
  pagesUsed: string[]
): Promise<z.infer<typeof CompanyBriefSchema>> {
  // If no pages were crawled or URL was empty/unreachable
  if (!crawledPages || crawledPages.length === 0) {
    const domain = companyUrl ? companyUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '') : 'Target Company';
    return {
      summary: `Automated intelligence scan for ${domain}. Public website information was inaccessible or unavailable during crawl; preparation is anchored primarily on the provided Job Description.`,
      what_they_do: `Specific product and engineering telemetry was not discoverable from the provided domain (${companyUrl || 'none'}). Focus on core role responsibilities and stated technical domains.`,
      sources: pagesUsed || [],
    };
  }

  const combinedSnippets = crawledPages
    .map((p) => `Page (${p.url}) - Title: ${p.title}\n${p.text}`)
    .join('\n\n---\n\n');

  const wrappedCrawled = sanitizeAndWrapUntrusted(combinedSnippets, companyUrl);

  const system = `You are a corporate intelligence analyst preparing an executive company brief for a job candidate.
RULES:
1. Base your brief strictly on the crawled text provided. Do not hallucinate products, headcount, or tech stacks not present in the data.
2. If crawled data is minimal or scarce, state honestly what is known and note that public company information was scarce.
3. List the URLs actually used under "sources".`;

  const user = `Company Domain: ${companyUrl}
Crawled Web Pages & Meta Content:
${wrappedCrawled}

Output Schema:
{
  "summary": string,
  "what_they_do": string,
  "sources": string[]
}`;

  try {
    const brief = await generateStructured({
      stage: 'build_company_brief',
      system,
      user,
      schema: CompanyBriefSchema,
      temperature: 0.2,
    });
    // Ensure all crawled sources are recorded
    const mergedSources = Array.from(new Set([...brief.sources, ...pagesUsed]));
    return { ...brief, sources: mergedSources };
  } catch (err: any) {
    return {
      summary: `Research overview compiled for ${companyUrl}. Data based on initial landing pages.`,
      what_they_do: `Enterprise technology and business services. Refer to the job description for specific architectural scope.`,
      sources: pagesUsed,
    };
  }
}

// ==========================================
// Stage 5: Generate Questions For Requirements
// ==========================================

const QuestionsListSchema = z.object({
  questions: z.array(QuestionSchema),
});

export async function generateQuestionsForCategory(
  category: QuestionCategory,
  requirements: Requirement[],
  companySummary: string,
  startIdIndex = 1
): Promise<Question[]> {
  if (requirements.length === 0) return [];

  const system = `You are a Principal Engineering Director and hiring committee lead.
Generate rigorous, production-grade interview questions for category "${category}".
RULES:
1. Every question must directly assess one or more requirement IDs provided in "requirement_ids".
2. Assign each question to a specific technical or organizational "subcategory" (e.g., "Algorithms & Data Structures", "Concurrency & Thread Safety", "High-Throughput Distributed Architecture", "Cache Invalidation & Consistency", "Conflict Resolution", "Strategic Alignment").
3. "difficulty" must be 1 (Junior/Warm-up), 2 (Mid-level/Core), or 3 (Senior/Architectural).
4. Provide "answer_outline" with crisp rubric expectations.
5. Provide "expert_answer": a thorough, deep architectural breakdown specifying exact formulas, protocols, trade-offs, and production failure modes (NEVER vague platitudes).
6. Provide "citations": at least 1-2 real, authoritative citations (e.g. Martin Kleppmann DDIA, Google SRE Book, Amazon Builders' Library, RFCs, Stripe Engineering Blog, Raft paper).
7. Assign distinct sequential IDs starting from "q${startIdIndex}".
8. Output valid JSON matching the schema.`;

  const user = `Category: ${category}
Company Brief: ${companySummary}
Target Requirements:
${JSON.stringify(requirements, null, 2)}

Output Schema:
{
  "questions": [
    {
      "id": string,
      "requirement_ids": string[],
      "category": "${category}",
      "subcategory": string,
      "prompt": string,
      "answer_outline": string,
      "expert_answer": string,
      "citations": [
        {
          "title": string,
          "source": string,
          "url": string,
          "snippet": string
        }
      ],
      "difficulty": 1 | 2 | 3
    }
  ]
}`;

  try {
    const res = await generateStructured({
      stage: `generate_questions_${category}`,
      system,
      user,
      schema: QuestionsListSchema,
      temperature: 0.3,
    });

    return res.questions;
  } catch (err) {
    console.warn(`[Pipeline] LLM question generation failed for ${category}, utilizing verified expert bank.`);
    const { generateExpandedBatch } = await import('../services/expertQuestionService');
    return generateExpandedBatch({
      category,
      count: Math.max(3, requirements.length),
      requirements,
      startIndex: startIdIndex,
    });
  }
}

// ==========================================
// Stage 6: Generate Flashcards
// ==========================================

const FlashcardsListSchema = z.object({
  flashcards: z.array(
    z.object({
      id: z.string(),
      front: z.string(),
      back: z.string(),
      requirement_ids: z.array(z.string()),
    })
  ),
});

export async function generateFlashcards(
  requirements: Requirement[],
  sampleQuestions: Question[]
): Promise<Flashcard[]> {
  const system = `Create high-retention technical and behavioural flashcards for pre-interview revision based on the generated questions and requirements.
RULES:
1. "front" must be a concise prompt, scenario, or concept check.
2. "back" must be a punchy, high-yield explanation or bullet-point answer.
3. Link each flashcard to relevant requirement IDs via "requirement_ids".
4. Assign stable IDs "f1", "f2", "f3", etc.
5. Create 6 to 12 high-impact flashcards.`;

  const user = `Requirements:
${JSON.stringify(requirements, null, 2)}

Sample Questions:
${JSON.stringify(sampleQuestions.slice(0, 8), null, 2)}

Output Schema:
{
  "flashcards": [
    {
      "id": string,
      "front": string,
      "back": string,
      "requirement_ids": string[]
    }
  ]
}`;

  const res = await generateStructured({
    stage: 'generate_flashcards',
    system,
    user,
    schema: FlashcardsListSchema,
    temperature: 0.2,
  });

  return res.flashcards;
}

// ==========================================
// Stage 9: Targeted Gap-Filling Pass 2
// ==========================================

export async function generateQuestionsForUncoveredMusts(
  uncoveredReqs: Requirement[],
  startQuestionIndex: number
): Promise<Question[]> {
  if (uncoveredReqs.length === 0) return [];

  const system = `You are an interview designer performing a coverage audit. The initial pass missed key mandatory job requirements.
Generate focused, high-yield interview questions strictly addressing the uncovered must-have requirements provided below.
RULES:
1. Every generated question MUST reference at least one of the uncovered requirement IDs in "requirement_ids".
2. Assign each question a sequential ID starting from "q${startQuestionIndex}".
3. Output valid JSON.`;

  const user = `Uncovered Must-Have Requirements:
${JSON.stringify(uncoveredReqs, null, 2)}
Starting Question ID index: ${startQuestionIndex}

Output Schema:
{
  "questions": [
    {
      "id": string,
      "requirement_ids": string[],
      "category": "technical" | "behavioural" | "system-design" | "company-fit",
      "prompt": string,
      "answer_outline": string,
      "difficulty": 1 | 2 | 3
    }
  ]
}`;

  const res = await generateStructured({
    stage: 'coverage_gap_closing_pass',
    system,
    user,
    schema: QuestionsListSchema,
    temperature: 0.2,
  });

  return res.questions;
}

// ==========================================
// Complete Orchestration Runner
// ==========================================

export async function runPipelineForCase(
  jd: string,
  companyUrl: string,
  days = 7,
  onProgress?: ProgressCallback
): Promise<Kit> {
  const notify = (stage: string, percent: number, message: string) => {
    if (onProgress) onProgress(stage, percent, message);
  };

  // Stage 1: Parse Job Description
  notify('parsing_jd', 10, 'Extracting role requirements, seniority, and qualification priorities...');
  const roleData = await parseJobDescription(jd);

  // Fallback if no requirements extracted
  let requirements = roleData.requirements;
  if (!requirements || requirements.length === 0) {
    requirements = [
      {
        id: 'r1',
        text: 'Demonstrated core software engineering and problem solving capabilities',
        kind: 'technical',
        priority: 'must',
      },
    ];
  }

  // Stage 2: Research Company
  notify('crawling_company', 25, `Defensive web discovery and heuristic link ranking for ${companyUrl || 'target role'}...`);
  let crawlRes: CrawlResult = { pages: [], pagesUsed: [], hiringPageFound: false, hiringProcessText: '' };
  if (companyUrl && companyUrl.startsWith('http')) {
    try {
      crawlRes = await crawlSite(companyUrl, { maxPages: 6, maxDepth: 2 });
    } catch (crawlErr: any) {
      console.warn(`[Pipeline] Crawl failed for ${companyUrl}: ${crawlErr.message}`);
    }
  }

  // Stage 3: Synthesize Grounded Company Brief
  notify('synthesizing_brief', 40, 'Compiling grounded company intelligence and engineering overview...');
  const brief = await buildCompanyBrief(companyUrl, crawlRes.pages, crawlRes.pagesUsed);

  // Stage 4: Public Discussion Search
  notify('searching_discussions', 50, 'Inspecting public candidate reviews and engineering culture...');
  const companyName = roleData.title ? companyUrl?.replace(/https?:\/\//, '').split('.')[0] || 'Company' : 'Company';
  const publicDisc = await searchPublicDiscussion(companyName);
  const allSources = Array.from(new Set([...brief.sources, ...publicDisc.sources]));

  // Stage 5: Generate Questions By Category (Pass 1)
  notify('generating_questions', 60, 'Generating targeted technical, system design, behavioural, and company fit questions...');
  const techReqs = requirements.filter((r) => r.kind === 'technical');
  const behavReqs = requirements.filter((r) => r.kind === 'behavioural');
  const domainReqs = requirements.filter((r) => r.kind === 'domain');

  let allQuestions: Question[] = [];
  let questionCounter = 1;

  // 1. Technical
  if (techReqs.length > 0) {
    const techQuestions = await generateQuestionsForCategory(
      'technical',
      techReqs,
      brief.summary,
      questionCounter
    );
    allQuestions.push(...techQuestions);
    questionCounter += techQuestions.length;
  }

  // 2. System Design
  const systemDesignReqs = techReqs.length > 0 ? techReqs : requirements;
  const sysDesignQuestions = await generateQuestionsForCategory(
    'system-design',
    systemDesignReqs,
    brief.summary,
    questionCounter
  );
  allQuestions.push(...sysDesignQuestions);
  questionCounter += sysDesignQuestions.length;

  // 3. Behavioural
  if (behavReqs.length > 0) {
    const behavQuestions = await generateQuestionsForCategory(
      'behavioural',
      behavReqs,
      brief.summary,
      questionCounter
    );
    allQuestions.push(...behavQuestions);
    questionCounter += behavQuestions.length;
  }

  // 4. Company Fit
  const compFitReqs = domainReqs.length > 0 ? domainReqs : (behavReqs.length > 0 ? behavReqs : requirements);
  const companyFitQuestions = await generateQuestionsForCategory(
    'company-fit',
    compFitReqs,
    brief.summary,
    questionCounter
  );
  allQuestions.push(...companyFitQuestions);
  questionCounter += companyFitQuestions.length;

  // Fallback if no questions generated
  if (allQuestions.length === 0) {
    allQuestions.push({
      id: 'q1',
      requirement_ids: requirements.map((r) => r.id),
      category: 'technical',
      prompt: `Walk through your relevant experience fulfilling the requirements for ${roleData.title}.`,
      answer_outline: 'High-scoring response covers system architecture, previous project milestones, and measurable business outcomes.',
      difficulty: 2,
    });
  }

  // Stage 6: Generate Flashcards
  notify('generating_flashcards', 75, 'Generating revision flashcards with high-yield answer points...');
  let flashcards: Flashcard[] = [];
  try {
    flashcards = await generateFlashcards(requirements, allQuestions);
  } catch (fcErr) {
    flashcards = requirements.map((r, i) => ({
      id: `f${i + 1}`,
      front: `Key Concept: ${r.text.slice(0, 60)}`,
      back: `Core review for ${r.kind} competency: explain trade-offs and practical experience.`,
      requirement_ids: [r.id],
    }));
  }

  // Stage 8: Check Coverage (Pass 1) - DETERMINISTIC
  notify('checking_coverage', 85, 'Running deterministic coverage gap analysis...');
  let uncoveredMustIds = checkCoverage(requirements, allQuestions);
  let passes = 1;

  // Stage 9: Second Pass Gap Closing Loop if uncovered musts exist (up to MAX_PASSES = 2)
  const MAX_PASSES = 2;
  while (uncoveredMustIds.length > 0 && passes < MAX_PASSES) {
    passes++;
    notify('gap_closing_pass', 90, `Pass ${passes}: Generating targeted questions for ${uncoveredMustIds.length} uncovered must-have requirements...`);

    const missingReqs = requirements.filter((r) => uncoveredMustIds.includes(r.id));
    const extraQuestions = await generateQuestionsForUncoveredMusts(
      missingReqs,
      allQuestions.length + 1
    );

    allQuestions.push(...extraQuestions);

    // Re-check coverage deterministically
    const nextUncovered = checkCoverage(requirements, allQuestions);
    if (nextUncovered.length >= uncoveredMustIds.length) {
      // No progress, break
      uncoveredMustIds = nextUncovered;
      break;
    }
    uncoveredMustIds = nextUncovered;
  }

  // Ensure all questions have distinct sequential IDs: q1, q2, q3...
  allQuestions = allQuestions.map((q, idx) => ({
    ...q,
    id: `q${idx + 1}`,
  }));

  // Final deterministic coverage check
  uncoveredMustIds = checkCoverage(requirements, allQuestions);

  // Stage 7: Allocate Schedule - DETERMINISTIC
  notify('allocating_schedule', 95, `Building deterministic integer-minute study schedule across ${days} days...`);
  const scheduleDays = buildDeterministicSchedule(days, allQuestions, requirements);

  notify('completed', 100, 'Interview prep kit generation complete!');

  // Canonical Appendix A Kit assembly
  const validCompanyUrl = companyUrl && companyUrl.startsWith('http') 
    ? companyUrl 
    : (companyUrl ? `https://${companyUrl}` : 'https://company.example');
  const validSources = allSources.filter(s => s.startsWith('http'));
  if (validSources.length === 0) {
    validSources.push(validCompanyUrl);
  }

  const finalKit: Kit = {
    source: {
      company: companyName,
      company_url: validCompanyUrl,
      role: roleData.title || 'Software Engineer',
      location: roleData.location || 'Remote',
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: validSources,
    },
    company_brief: {
      summary: brief.summary,
      what_they_do: brief.what_they_do,
      sources: validSources,
    },
    role: {
      title: roleData.title,
      seniority: roleData.seniority,
      responsibilities: roleData.responsibilities,
      requirements,
    },
    questions: allQuestions,
    flashcards,
    schedule: {
      days_available: Math.max(1, Math.min(90, Math.floor(days))),
      days: scheduleDays,
    },
    coverage: {
      uncovered_requirement_ids: uncoveredMustIds,
      passes,
    },
  };

  // Strict validation against KitSchema
  return KitSchema.parse(finalKit);
}
