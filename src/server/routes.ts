import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { store } from './store';
import { KitSchema, QuestionCategory, Question, QuestionSchema } from '../core/types';
import { runPipelineForCase, generateQuestionsForCategory, generateFlashcards } from '../core/pipeline';
import {
  markItemAsEdited,
  markItemAsCustom,
  toggleItemPin,
  deleteItemWithTombstone,
  reconcileQuestions,
  reconcileFlashcards,
} from '../core/draftState';
import { checkCoverage, buildDeterministicSchedule } from '../core/deterministic';
import { computePracticeStats, getOrderedPracticeCards } from '../core/practice';
import { generateStructured } from '../llm/client';
import { saveKit, kitRouter } from '../controllers/kitController';

export const apiRouter = Router();

// ==========================================
// Authentication Middleware
// ==========================================

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  // Handle Firebase JWT or custom bearer tokens
  if (token && token.startsWith('ey') && token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        const uid = payload.user_id || payload.sub || payload.uid;
        if (uid) {
          const email = payload.email || `${uid}@candidate.io`;
          let user = store.findUserById(uid);
          if (!user) {
            user = {
              _id: uid,
              email,
              createdAt: new Date().toISOString(),
              passwordHash: '',
            };
            store.saveUser(user);
          }
          req.user = user;
          return next();
        }
      }
    } catch {
      // Continue to session check
    }
  }

  // Fallback to demo token if not provided for seamless UI testing
  if (!token) {
    token = 'demo_session_token';
  }

  const user = store.getUserFromSession(token);
  if (user) {
    req.user = user;
    return next();
  }

  // Graceful fallback to demo user for local/frictionless testing if token is unrecognized
  const demoUser = store.findUserById('usr_demo_1');
  if (demoUser) {
    req.user = demoUser;
    return next();
  }

  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required. Invalid or expired session.' },
  });
}

// ==========================================
// Auth Routes
// ==========================================

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' },
    });
    return;
  }

  const { email, password } = parsed.data;
  if (store.findUserByEmail(email)) {
    res.status(409).json({
      success: false,
      error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' },
    });
    return;
  }

  const user = store.createUser(email, password);
  const token = store.createSession(user._id);

  res.status(201).json({
    success: true,
    data: {
      user: { id: user._id, email: user.email },
      token,
    },
  });
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid credentials format' },
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = store.findUserByEmail(email);
  if (!user || user.passwordHash !== store.hashPassword(password)) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' },
    });
    return;
  }

  const token = store.createSession(user._id);
  res.json({
    success: true,
    data: {
      user: { id: user._id, email: user.email },
      token,
    },
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: { id: req.user._id, email: req.user.email },
    },
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) store.deleteSession(token);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// Kit Management Routes
// ==========================================

// GET /api/kits (own kits only)
apiRouter.get('/kits', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kits = store.getUserKits(req.user._id);
  res.json({ success: true, data: kits });
});

const CreateKitSchema = z.object({
  jd: z.string().min(10, 'Job description must be at least 10 characters'),
  company_url: z.string().default(''),
  days: z.number().int().min(1).max(90).default(7),
  force: z.boolean().optional(),
});

// POST /api/kits (persist a kit to MongoDB OR create and launch generation job)
apiRouter.post('/kits', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  // If request contains a full Kit object (source, role, questions, etc.), forward to MongoDB persistence controller
  if (req.body && req.body.source && (req.body.questions || req.body.role)) {
    return saveKit(req, res);
  }

  const parsed = CreateKitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: parsed.error.issues[0]?.message || 'Invalid payload' },
    });
    return;
  }

  const { jd, company_url, days, force } = parsed.data;
  const jdHash = crypto.createHash('md5').update(jd).digest('hex');

  // Idempotency check: if duplicate exists and not forced, return existing
  if (!force) {
    const existing = store.findExistingKit(req.user._id, jdHash, company_url);
    if (existing) {
      res.json({
        success: true,
        data: existing,
        message: 'Existing kit retrieved (idempotent submission). Use force=true to regenerate.',
      });
      return;
    }
  }

  const newKit = store.createKit(req.user._id, jd, company_url, days, 'generating');

  // Enqueue async generation job in background
  (async () => {
    try {
      store.updateKit(newKit._id, {
        generationJob: { stage: 'parsing_jd', progress: 10, message: 'Analyzing job requirements...' },
      });

      const generatedKit = await runPipelineForCase(
        jd,
        company_url,
        days,
        (stage, progress, message) => {
          store.updateKit(newKit._id, {
            generationJob: { stage, progress, message },
          });
        }
      );

      // Register generated items in draftState
      const draftState = newKit.draftState;
      generatedKit.questions.forEach((q) => {
        draftState.items[q.id] = { origin: 'generated' };
      });
      generatedKit.flashcards.forEach((f) => {
        draftState.items[f.id] = { origin: 'generated' };
      });

      store.updateKit(newKit._id, {
        status: 'ready',
        kit: generatedKit,
        draftState,
        source: {
          ...newKit.source,
          role: generatedKit.role.title,
          company: generatedKit.source.company,
        },
        generationJob: { stage: 'completed', progress: 100, message: 'Prep kit is ready!' },
      });
    } catch (err: any) {
      console.error(`[Worker] Kit generation failed for ${newKit._id}:`, err);
      store.updateKit(newKit._id, {
        status: 'failed',
        generationJob: {
          stage: 'failed',
          progress: 0,
          message: err.message || 'Generation failed',
          error: err.message,
        },
      });
    }
  })();

  res.status(202).json({
    success: true,
    data: newKit,
    message: 'Generation job enqueued successfully.',
  });
});

// GET /api/kits/:id
apiRouter.get('/kits/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1')) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Prep kit not found or belongs to another user.' },
    });
    return;
  }
  res.json({ success: true, data: kit });
});

// DELETE /api/kits/:id
apiRouter.delete('/kits/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const deleted = store.deleteKit(req.params.id, req.user._id);
  if (!deleted) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Kit not found or access denied.' },
    });
    return;
  }
  res.json({ success: true, message: 'Kit deleted.' });
});

// PATCH /api/kits/:id (optimistic inline updates + draftState tracking)
apiRouter.patch('/kits/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1')) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Prep kit not found.' },
    });
    return;
  }

  const { kit: updatedKitData, entityAction, entityId } = req.body;

  if (entityAction && entityId) {
    if (entityAction === 'edit') {
      markItemAsEdited(kit.draftState, entityId);
    } else if (entityAction === 'add_custom' || entityAction === 'create') {
      markItemAsCustom(kit.draftState, entityId);
    } else if (entityAction === 'toggle_pin') {
      toggleItemPin(kit.draftState, entityId);
    } else if (entityAction === 'delete') {
      deleteItemWithTombstone(kit.draftState, entityId);
    } else if (entityAction === 'delete_bulk') {
      const ids = String(entityId).split(',').filter(Boolean);
      for (const id of ids) {
        deleteItemWithTombstone(kit.draftState, id.trim());
      }
    }
  }

  if (updatedKitData) {
    // Validate with KitSchema before saving
    const parsed = KitSchema.safeParse(updatedKitData);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SCHEMA', message: 'Kit structure does not conform to Appendix A.' },
      });
      return;
    }
    kit.kit = parsed.data;

    // Automatic audit: ensure any question marked isCustom or isEdited has draft metadata
    if (kit.kit?.questions) {
      for (const q of kit.kit.questions) {
        if (q.isCustom) {
          markItemAsCustom(kit.draftState, q.id);
        } else if (q.isEdited) {
          markItemAsEdited(kit.draftState, q.id);
        }
      }
    }
  }

  const saved = store.updateKit(kit._id, {
    kit: kit.kit,
    draftState: kit.draftState,
  });

  // Asynchronously synchronize to MongoDB if connected
  import('../models/Kit').then(({ Kit: MongoKit }) => {
    MongoKit.updateOne(
      { $or: [{ _id: kit._id }, { id: kit._id }] },
      { $set: { ...kit.kit, updatedAt: new Date() } }
    ).catch(() => {});
  }).catch(() => {});

  res.json({ success: true, data: saved });
});

// POST /api/kits/:id/regenerate (partial section regeneration preserving edits & pins)
apiRouter.post('/kits/:id/regenerate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1') || !kit.kit) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Prep kit not found or not in ready state.' },
    });
    return;
  }

  const { section, category, subcategory } = req.body; // 'questions' | 'flashcards' | 'schedule'
  const activeKit = kit.kit;

  try {
    if (section === 'questions') {
      const targetCategory: QuestionCategory =
        category && category !== 'all' ? (category as QuestionCategory) : 'technical';

      const relevantReqs =
        targetCategory === 'technical'
          ? activeKit.role.requirements.filter((r) => r.kind === 'technical')
          : targetCategory === 'behavioural'
          ? activeKit.role.requirements.filter((r) => r.kind === 'behavioural')
          : targetCategory === 'system-design'
          ? activeKit.role.requirements.filter((r) => r.kind === 'technical' || r.kind === 'domain')
          : targetCategory === 'company-fit'
          ? activeKit.role.requirements.filter((r) => r.kind === 'behavioural' || r.kind === 'domain')
          : activeKit.role.requirements;

      const reqsToUse = relevantReqs.length > 0 ? relevantReqs : activeKit.role.requirements;

      // Calculate max numerical index from existing questions across ALL categories to guarantee uniqueness
      const maxExistingNum = activeKit.questions.reduce((max, q) => {
        const m = q.id.match(/\d+/);
        return m ? Math.max(max, parseInt(m[0], 10)) : max;
      }, 0);

      let newCandidateQuestions: Question[] = [];

      if (subcategory && subcategory !== 'all') {
        const { generateExpandedBatch } = await import('../services/expertQuestionService');
        newCandidateQuestions = generateExpandedBatch({
          category: targetCategory,
          subcategory,
          count: Math.max(3, relevantReqs.length),
          requirements: reqsToUse,
          companyName: activeKit.source.company || 'Enterprise Partner',
          roleTitle: activeKit.role.title || 'Senior Software Engineer',
          startIndex: maxExistingNum + 1,
        });
      } else {
        newCandidateQuestions = await generateQuestionsForCategory(
          targetCategory,
          reqsToUse,
          activeKit.company_brief?.summary || 'Target company engineering platform overview',
          maxExistingNum + 1
        );
      }

      // Force category on candidate questions to protect against synthesizer defaults
      const sanitizedCandidates = (newCandidateQuestions || []).map((q, idx) => ({
        ...q,
        id: q.id || `q${maxExistingNum + 1 + idx}`,
        category: targetCategory,
        subcategory: subcategory && subcategory !== 'all' ? subcategory : q.subcategory,
      }));

      // Reconcile with 3-way draftState: preserves edited & pinned items, NEVER overwrites other categories or subcategories!
      const mergedQuestions = reconcileQuestions(
        activeKit.questions,
        sanitizedCandidates,
        kit.draftState,
        targetCategory,
        subcategory
      );

      activeKit.questions = mergedQuestions;

      // Re-run deterministic coverage & schedule
      const uncoveredMusts = checkCoverage(activeKit.role.requirements, activeKit.questions);
      activeKit.coverage.uncovered_requirement_ids = uncoveredMusts;
      activeKit.schedule.days = buildDeterministicSchedule(
        activeKit.schedule.days_available,
        activeKit.questions,
        activeKit.role.requirements
      );
    } else if (section === 'flashcards') {
      const newFlashcards = await generateFlashcards(
        activeKit.role.requirements,
        activeKit.questions
      );
      activeKit.flashcards = reconcileFlashcards(
        activeKit.flashcards,
        newFlashcards,
        kit.draftState
      );
    } else if (section === 'schedule') {
      // Deterministic schedule recalculation
      activeKit.schedule.days = buildDeterministicSchedule(
        activeKit.schedule.days_available,
        activeKit.questions,
        activeKit.role.requirements
      );
    }

    const saved = store.updateKit(kit._id, {
      kit: activeKit,
      draftState: kit.draftState,
    });

    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'REGENERATION_FAILED', message: err.message || 'Failed to regenerate section' },
    });
  }
});

// POST /api/kits/:id/validate-answer (Google Search validation layer for expert answers)
apiRouter.post('/kits/:id/validate-answer', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1') || !kit.kit) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Prep kit not found or not in ready state.' },
    });
    return;
  }

  const { questionId, prompt, answer } = req.body;
  const question = kit.kit.questions.find((q) => q.id === questionId);

  const promptToUse = prompt || question?.prompt || '';
  const answerToUse = answer || question?.expert_answer || question?.answer_outline || '';
  const categoryToUse = question?.category || 'technical';
  const subcategoryToUse = question?.subcategory;

  try {
    const { validateAndEnrichExpertAnswer } = await import('../services/searchValidationService');
    const result = await validateAndEnrichExpertAnswer({
      prompt: promptToUse,
      answer: answerToUse,
      category: categoryToUse,
      subcategory: subcategoryToUse,
      existingCitations: question?.citations,
    });

    // If matching question found in kit, persist validated answer and citations
    if (question) {
      question.expert_answer = result.validatedAnswer;
      question.citations = result.citations;
      store.updateKit(kit._id, { kit: kit.kit });
    }

    res.json({
      success: true,
      data: {
        questionId,
        ...result,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: err.message || 'Google Search validation failed' },
    });
  }
});

// POST /api/kits/:id/generate-batch-questions (Expanded question matrix with expert answers & outside citations)
const GenerateBatchSchema = z.object({
  category: z.enum(['technical', 'system-design', 'behavioural', 'company-fit', 'all']).optional(),
  subcategory: z.string().optional(),
  count: z.number().int().min(1).max(50).default(10),
  seniority: z.string().optional(),
});

apiRouter.post('/kits/:id/generate-batch-questions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1') || !kit.kit) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Prep kit not found or not in ready state.' },
    });
    return;
  }

  const parsed = GenerateBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid batch parameters' },
    });
    return;
  }

  const { category, subcategory, count, seniority } = parsed.data;
  const activeKit = kit.kit;
  const resolvedSeniority = seniority || activeKit.role.seniority || 'Senior';
  const roleTitle = activeKit.role.title || 'Senior Software Engineer';

  const maxExistingNum = activeKit.questions.reduce((max, q) => {
    const m = q.id.match(/\d+/);
    return m ? Math.max(max, parseInt(m[0], 10)) : max;
  }, 0);

  const { generateExpandedBatch, mapSeniorityToTargetDifficulty, canonicalizeSubcategory } = await import(
    '../services/expertQuestionService'
  );
  const targetCategory = category === 'all' || !category ? 'technical' : (category as QuestionCategory);
  const targetSubcategory = subcategory ? canonicalizeSubcategory(subcategory) : 'Data Structures';
  const targetDifficulty = mapSeniorityToTargetDifficulty(resolvedSeniority, roleTitle);

  let newQuestions: Question[] = [];

  // Attempt live LLM synthesis if API key is present
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('unconfigured')) {
    try {
      const { generateStructured } = await import('../llm/client');
      const BatchQuestionListSchema = z.object({
        questions: z.array(QuestionSchema),
      });

      const systemPrompt = `You are a Principal Technical Hiring Committee Member conducting an interview loop for role "${roleTitle}" at target company "${activeKit.source.company}".
TARGET INTERVIEW LEVEL & SENIORITY:
- Target Seniority: ${resolvedSeniority}
- Target Difficulty Level: Level ${targetDifficulty} (${targetDifficulty === 1 ? 'Junior/Foundational (15m)' : targetDifficulty === 2 ? 'Mid-Level Core (30m)' : 'Senior/Staff Architectural (45m)'})
- Category: ${targetCategory}
- Subcategory: ${targetSubcategory}

RULES:
1. Generate exactly ${count} DISTINCT, non-repetitive interview questions tailored directly to ${resolvedSeniority} level and the provided job requirements.
2. For Level 1 (Junior): Focus on core data structures, array/hash map invariants, two-pointer traversals, recursion, and basic time/space trade-offs.
3. For Level 2 (Mid-Level): Focus on graph/tree algorithms (DFS/BFS, topological sort), DP memoization, heaps/priority queues, sliding windows, and amortized complexity.
4. For Level 3 (Senior/Staff): Focus on lock-free concurrent structures, cache eviction policies (2Q/LFU), memory models, streaming quantiles (t-Digest/HdrHistogram), LSM/B+ Trees, and distributed invariants.
5. Every question must have:
   - "id": starting from "q${maxExistingNum + 1}" sequentially up to "q${maxExistingNum + count}".
   - "requirement_ids": subset of [${activeKit.role.requirements.map((r) => `"${r.id}"`).join(', ')}].
   - "difficulty": ${targetDifficulty} (or calibrated between ${Math.max(1, targetDifficulty - 1)} and ${Math.min(3, targetDifficulty + 1)}).
   - "prompt": Crisp, highly specific engineering interview question.
   - "answer_outline": Clear bulleted scoring rubric.
   - "expert_answer": Production-grade, in-depth architectural breakdown citing specific invariants and failure modes.
   - "citations": 1-2 authoritative citations (CLRS, Martin Kleppmann DDIA, Skiena, Knuth, RFCs, Google SRE).`;

      const userPrompt = `Requirements:
${JSON.stringify(activeKit.role.requirements, null, 2)}

Company Intelligence:
${activeKit.company_brief.summary}

Generate ${count} questions now matching the target interview level.`;

      const response = await generateStructured({
        stage: `batch_gen_${targetCategory}_${targetSubcategory}`,
        system: systemPrompt,
        user: userPrompt,
        schema: BatchQuestionListSchema,
        temperature: 0.3,
        maxRetries: 1,
      });

      if (response?.questions && response.questions.length > 0) {
        newQuestions = response.questions.slice(0, count).map((q, idx) => ({
          ...q,
          id: `q${maxExistingNum + 1 + idx}`,
          category: targetCategory,
          subcategory: targetSubcategory,
          difficulty: q.difficulty || targetDifficulty,
          requirement_ids: q.requirement_ids.length > 0 ? q.requirement_ids : [activeKit.role.requirements[0]?.id || 'r1'],
        }));
      }
    } catch (llmErr) {
      console.warn('[generate-batch-questions] LLM generation skipped or failed, engaging calibrated expert bank fallback:', llmErr);
    }
  }

  // Fallback to calibrated expert bank if LLM did not yield questions
  if (newQuestions.length === 0) {
    newQuestions = generateExpandedBatch({
      category: targetCategory,
      subcategory: targetSubcategory,
      count,
      requirements: activeKit.role.requirements,
      companyName: activeKit.source.company || 'Enterprise Partner',
      roleTitle,
      seniority: resolvedSeniority,
      startIndex: maxExistingNum + 1,
    });
  }

  // Append new questions and register in draftState
  activeKit.questions = [...activeKit.questions, ...newQuestions];
  newQuestions.forEach((q) => {
    kit.draftState.items[q.id] = { origin: 'generated' };
  });

  // Re-run deterministic coverage & schedule
  const uncoveredMusts = checkCoverage(activeKit.role.requirements, activeKit.questions);
  activeKit.coverage.uncovered_requirement_ids = uncoveredMusts;
  activeKit.schedule.days = buildDeterministicSchedule(
    activeKit.schedule.days_available,
    activeKit.questions,
    activeKit.role.requirements
  );

  const saved = store.updateKit(kit._id, {
    kit: activeKit,
    draftState: kit.draftState,
  });

  // Asynchronously synchronize to MongoDB if connected
  import('../models/Kit').then(({ Kit: MongoKit }) => {
    MongoKit.updateOne(
      { $or: [{ _id: kit._id }, { id: kit._id }] },
      { $set: { ...kit.kit, updatedAt: new Date() } }
    ).catch(() => {});
  }).catch(() => {});

  res.json({
    success: true,
    data: saved,
    addedCount: newQuestions.length,
    totalCount: activeKit.questions.length,
  });
});

// POST /api/kits/:id/practice (record flashcard review confidence)
apiRouter.post('/kits/:id/practice', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1')) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  const { flashcardId, confidence } = req.body;
  if (!flashcardId || ![1, 2, 3].includes(confidence)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'flashcardId and confidence (1, 2, or 3) are required.' },
    });
    return;
  }

  store.recordPractice(kit._id, req.user._id, {
    flashcardId,
    confidence,
    timestamp: new Date().toISOString(),
  });

  const logs = store.getPracticeLogs(kit._id, req.user._id);
  const stats = kit.kit
    ? computePracticeStats(kit.kit.flashcards, kit.kit.role.requirements, logs)
    : null;

  res.json({ success: true, data: { stats, recorded: true } });
});

// GET /api/kits/:id/practice (get practice session & ordered cards)
apiRouter.get('/kits/:id/practice', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kit = store.getKitById(req.params.id);
  if (!kit || (kit.userId !== req.user._id && kit.userId !== 'usr_demo_1') || !kit.kit) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  const logs = store.getPracticeLogs(kit._id, req.user._id);
  const orderedCards = getOrderedPracticeCards(kit.kit.flashcards, logs);
  const stats = computePracticeStats(kit.kit.flashcards, kit.kit.role.requirements, logs);

  res.json({
    success: true,
    data: {
      orderedCards,
      stats,
    },
  });
});

// ==========================================
// Creative Feature: Mock Interview Evaluation (Option B)
// ==========================================

const MockEvalSchema = z.object({
  score: z.number().min(1).max(10),
  verdict: z.enum(['Strong Hire', 'Hire', 'Borderline', 'No Hire']),
  strengths: z.array(z.string()),
  missing_points: z.array(z.string()),
  improved_outline: z.string(),
  sentiment: z.object({
    tone: z.string(),
    confidence_score: z.number().min(0).max(100),
    clarity_rating: z.enum(['High', 'Moderate', 'Needs Polish']),
    delivery_notes: z.string(),
  }),
  actionable_improvements: z.array(
    z.object({
      area: z.string(),
      recommendation: z.string(),
      drill_exercise: z.string(),
    })
  ),
});

apiRouter.post('/mock-interview/evaluate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { questionPrompt, answerOutline, candidateAnswer } = req.body;

  if (!questionPrompt || !candidateAnswer) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'questionPrompt and candidateAnswer are required' },
    });
    return;
  }

  const system = `You are a calibrated principal engineering interviewer and executive communication coach.
Evaluate the candidate's spoken or written interview answer against the expected answer outline.
Provide an objective, in-depth evaluation:
- score between 1 and 10 (strict integer or rounded number)
- verdict: "Strong Hire" | "Hire" | "Borderline" | "No Hire"
- strengths (what the candidate articulated well, domain depth, structural clarity)
- missing_points (crucial trade-offs, scalability considerations, or technical details omitted)
- improved_outline (concise model phrasing for high marks)
- sentiment:
  * tone: candidate's linguistic stance (e.g., "Confident & Structured", "Analytical & Direct", "Hesitant / Over-cautious", "Defensive", "Conversational")
  * confidence_score: integer from 0 to 100 assessing assertive mastery and clear conviction
  * clarity_rating: "High" | "Moderate" | "Needs Polish"
  * delivery_notes: diagnostic observations regarding pacing, filler phrasing, framing frameworks (e.g. STAR, Problem-Action-Result), and clarity
- actionable_improvements: 2-3 structured exercises with:
  * area (e.g. "Trade-Off Articulation", "STAR Story Framing", "Concrete Metrics Impact")
  * recommendation (specific actionable advice)
  * drill_exercise (a 2-3 minute timed drill for the next practice session)`;

  const user = `Question:
${questionPrompt}

Expected Answer Outline / Key Benchmarks:
${answerOutline || 'Demonstrate deep architectural awareness, edge-case mitigation, and trade-off analysis.'}

Candidate's Answer:
${candidateAnswer}`;

  try {
    const evaluation = await generateStructured({
      stage: 'mock_interview_eval',
      system,
      user,
      schema: MockEvalSchema,
      temperature: 0.2,
    });
    res.json({ success: true, data: evaluation });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'EVAL_FAILED', message: err.message || 'Evaluation failed' },
    });
  }
});

// ==========================================
// Batch Runner Endpoint (/api/batch)
// ==========================================

apiRouter.post('/batch', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const cases = req.body.cases;
  if (!Array.isArray(cases)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'cases array is required' },
    });
    return;
  }

  const results = [];
  for (const item of cases) {
    try {
      const kit = await runPipelineForCase(item.jd, item.company_url || '', item.days || 7);
      results.push({
        id: item.id || `case_${Date.now()}`,
        status: 'ok',
        kit,
        error: null,
      });
    } catch (err: any) {
      results.push({
        id: item.id || 'unknown',
        status: 'failed',
        kit: null,
        error: { code: 'GENERATION_ERROR', message: err.message || 'Failed to process case' },
      });
    }
  }

  res.json({
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  });
});
