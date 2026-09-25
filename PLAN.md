# Interview Prep Kit — System Architecture & Technical Plan

## 1. System Overview & Charter
Interview Prep Kit is an autonomous multi-step preparation engine for job candidates. Given a raw Job Description (JD), target company URL, and days remaining until interview, the system:
1. Conducts defensive web crawling & link ranking to gather company intelligence (while defending against SSRF, robots.txt restrictions, and prompt injections).
2. Deconstructs the job description into discrete, stable-ID requirements (`must` vs `nice`, categorized as `technical`, `behavioural`, or `domain`).
3. Synthesizes an honest company brief strictly from retrieved evidence (never hallucinating missing facts).
4. Generates targeted technical, behavioural, and domain interview questions linked to specific requirement IDs.
5. Employs a **strictly deterministic coverage auditor** to find unaddressed must-haves, invoking a second-pass gap-closing loop up to `MAX_PASSES` (default 2).
6. Allocates a **strictly deterministic integer-minute study schedule** across exactly $N$ days, placing high-difficulty and must-have items earlier.
7. Produces flashcards and provides a **Practice Mode** with confidence ratings (1–3) and weak spots analysis.
8. Enforces a 3-way draft state reconciliation (`generated` | `edited` | `pinned`) so section regeneration preserves user modifications and tombstones deleted items.
9. Provides a standardized batch evaluation CLI: `npm run evaluate -- --input <cases.json> --output <kits.json>` meeting Appendix B specifications.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (BROWSER)                                  |
|  React 19 + Tailwind CSS + Lucide Icons                                           |
|  - Dashboard & Kit Repository                                                     |
|  - Real-time Stage Stepper & Generation Progress                                  |
|  - Interactive Kit View (Inline Markdown/Text Edits, Pinning, Category Reorder)  |
|  - Flashcard Practice Arena & Confidence Weighted Drill                           |
|  - Weak Spots & Coverage Matrix Inspection                                        |
+----------------------------------------+------------------------------------------+
                                         | REST API (/api/*)
                                         v
+-----------------------------------------------------------------------------------+
|                        FULL-STACK EXPRESS RUNTIME (server.ts)                     |
|                                                                                   |
|  +---------------------+   +---------------------+   +--------------------------+ |
|  |   Auth & Session    |   |    Kit Controller   |   |   Batch Evaluation CLI   | |
|  | - Token / Cookie    |   | - CRUD & Optimistic |   | - scripts/evaluate.ts    | |
|  | - Tenant Isolation  |   | - Regenerate Section|   | - Local Fixture Server   | |
|  +---------------------+   +---------------------+   +--------------------------+ |
|                                         |                                         |
|  +------------------------------------------------------------------------------+ |
|  |                          ORCHESTRATION PIPELINE                              | |
|  |                                                                              | |
|  |  Stage 1: parseJobDescription (Gemini 3.8 Flash, strict Zod)                 | |
|  |  Stage 2: researchCompany (Defensive BFS Crawler + SSRF Guard)              | |
|  |  Stage 3: buildCompanyBrief (Grounded Synthesis, zero hallucination)         | |
|  |  Stage 4: searchPublicDiscussion (Best-effort Glassdoor/Reddit intelligence) | |
|  |  Stage 5: generateQuestionsForRequirement (Per-requirement isolation)        | |
|  |  Stage 6: generateFlashcardsForRequirements                                  | |
|  |  Stage 7: allocateSchedule [DETERMINISTIC BIN-PACKING - NO LLM]              | |
|  |  Stage 8: checkCoverage [DETERMINISTIC SET MATH - NO LLM]                    | |
|  |  Stage 9: Gap-Closing Loop (Pass 2 for uncovered must-haves, max 2 passes)   | |
|  +------------------------------------------------------------------------------+ |
|                                         |                                         |
|  +---------------------+   +---------------------+   +--------------------------+ |
|  | LLM Provider Client |   |   Scraper Engine    |   | Persistence / In-Memory  | |
|  | - Gemini 3.8 Flash  |   | - robots.txt parser |   |   Store (with DraftState | |
|  | - Token-Bucket RL   |   | - Heuristic ranker  |   |   & Tombstones)          | |
|  | - Backoff & Retry   |   | - SSRF / IP filter  |   |                          | |
|  +---------------------+   +---------------------+   +--------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. Directory & Folder Structure

```
├── .env.example                # Documented runtime environment variables
├── PLAN.md                     # Architectural charter & engineering blueprint
├── README.md                   # Complete documentation, setup, algorithm defense
├── index.html                  # HTML entry point with synchronized metadata
├── metadata.json               # Capabilities & metadata
├── package.json                # Dependencies, build & evaluate scripts
├── server.ts                   # Express server entry point mounting Vite & API routes
├── scripts/
│   ├── evaluate.ts             # Batch CLI runner: npm run evaluate -- -i <in> -o <out>
│   └── test-fixtures-server.ts # Local HTTP mock server for offline batch verification
├── src/
│   ├── App.tsx                 # Top-level React container & state manager
│   ├── main.tsx                # Client bootstrap
│   ├── index.css               # Tailwind v4 theme styling
│   ├── components/
│   │   ├── AuthModal.tsx       # Sign-in / session dialog
│   │   ├── CoverageAudit.tsx   # Visual deterministic coverage matrix
│   │   ├── FlashcardViewer.tsx # Interactive Practice Mode & confidence rating
│   │   ├── KitEditor.tsx       # Full kit editor with pinned/edited state indicators
│   │   ├── MockInterview.tsx   # Interactive timed mock interview feature
│   │   ├── NewKitModal.tsx     # Case submission form (JD, URL, Days)
│   │   ├── ProgressStepper.tsx # Real-time generation progress bar & stage logs
│   │   ├── ScheduleView.tsx    # Day-by-day integer-minute schedule viewer
│   │   └── WeakSpotsReport.tsx # Analysis of lowest-confidence requirements
│   ├── core/
│   │   ├── types.ts            # Canonical Appendix A & B schemas and Zod contracts
│   │   ├── draftState.ts       # 3-Way State reconciliation (generated/edited/pinned)
│   │   ├── deterministic.ts    # checkCoverage & buildDeterministicSchedule (NO LLM)
│   │   ├── practice.ts         # Confidence-weighted spaced repetition engine
│   │   └── pipeline.ts         # Full 9-stage orchestrator
│   ├── llm/
│   │   ├── client.ts           # Provider abstraction with Gemini 3.8 Flash
│   │   ├── rateLimiter.ts      # Token-bucket rate limiter & concurrency gate
│   │   └── retry.ts            # Exponential backoff with jitter & error classifier
│   ├── scraper/
│   │   ├── crawler.ts          # BFS link discovery with heuristic link scoring
│   │   ├── security.ts         # SSRF IP validator & prompt injection delimiters
│   │   └── htmlCleaner.ts      # Main text extraction & boilerplate removal
│   └── server/
│       ├── store.ts            # User sessions, Kit persistence, and job queue
│       └── routes.ts           # Express endpoints matching Stage 6 specification
└── tests/
    ├── deterministic.test.ts   # Tests for schedule allocation & coverage checking
    ├── draftState.test.ts      # Tests for edit/pin preservation during regeneration
    ├── structure.test.ts       # Appendix A schema compliance tests
    ├── batch.test.ts           # End-to-end evaluation runner with local test fixture
    └── run-all.ts              # Automated test runner suite
```

---

## 4. Canonical Appendix A Data Models

```ts
export interface Requirement {
  id: string; // Stable: "r1", "r2", ...
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

export interface Question {
  id: string; // Stable: "q1", "q2", ...
  requirement_ids: string[]; // Links back to Requirement.id
  category: string; // 'technical' | 'behavioural' | 'system-design' | 'company-fit'
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3; // 1: Junior/Warm-up, 2: Mid-level, 3: Senior/Architectural
}

export interface Flashcard {
  id: string; // "f1", "f2", ...
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number; // 1 to N
  focus: string;
  question_ids: string[];
  minutes: number; // Integer minutes strictly
}

export interface Kit {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
}
```

---

## 5. Draft State Model (Generated / Edited / Pinned)

To guarantee that user modifications are **never destroyed** when regenerating a category or section:
- Every field or item maintains an `origin`:
  * `'generated'`: Created by the AI pipeline. Overwritten on regeneration if unmodified.
  * `'edited'`: Modified by the user. Kept intact upon regeneration; new model outputs are preserved alongside as `pendingRegeneration` so the user can accept or reject.
  * `'pinned'`: Explicitly pinned by the user (or manually hand-crafted). Never touched or deleted by regeneration.
- `tombstones`: List of deleted IDs so LLM regeneration does not resurrect items the user explicitly discarded.
- `lastGeneratedHash`: SHA-256 / DJB2 checksum of the AI-generated text to unambiguously detect whether the content was edited by the user.

---

## 6. The Two Deterministic Algorithms (NO LLM)

### A. Coverage Gap Detection
Calculated via set mathematics:
1. Aggregate all `requirement_ids` referenced across all generated questions.
2. For every requirement marked `priority === 'must'`, verify whether its `id` is present in the covered set.
3. If any must-haves are missing, output them as `uncovered_requirement_ids` and feed them into Pass 2.

### B. Schedule Bin-Packing
Calculated via deterministic arithmetic:
1. Sort questions: higher difficulty (3 $\to$ 1) and must-have requirement linkages first.
2. Allocate across exactly `days_available` day slots using round-robin bin packing.
3. Enforce integer minutes: each question consumes `difficulty * 15` integer minutes (e.g. 15, 30, or 45 mins).
4. Assign day focuses by dominant question category, reserving the final day for "Final Review & High-Yield Rehearsal".

---

## 7. API Specification
- `POST /api/auth/register` & `POST /api/auth/login` & `POST /api/auth/logout`: Auth session management.
- `GET /api/kits`: Fetch all kits owned by authenticated user.
- `POST /api/kits`: Enqueue new kit generation job (with duplicate idempotency).
- `GET /api/kits/:id`: Fetch kit content, execution status, and live generation log.
- `PATCH /api/kits/:id`: Optimistic inline editing with draftState updates.
- `POST /api/kits/:id/regenerate`: Targeted partial regeneration with edit/pin reconciliation.
- `POST /api/kits/:id/practice`: Record flashcard review confidence ratings (1–3).
- `POST /api/batch`: Multi-case runner for batch evaluation.
- `POST /api/mock-interview/evaluate`: Creative feature evaluating user practice responses.
