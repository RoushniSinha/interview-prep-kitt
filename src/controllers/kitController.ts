import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Kit } from '../models/Kit';
import { authMiddleware, AuthenticatedRequest } from '../server/routes';

// ==========================================
// Zod Request Validation Schema
// ==========================================

const ExtendedQuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.string(),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isEdited: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

const ExtendedFlashcardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
  confidence: z.number().int().min(1).max(3).optional(),
});

export const SaveKitPayloadSchema = z.object({
  source: z.object({
    company: z.string().min(1, 'Company name is required'),
    company_url: z.string().default(''),
    role: z.string().min(1, 'Role title is required'),
    location: z.string().default('Remote'),
    jd_chars: z.number().int().nonnegative().default(0),
    researched_at: z.string().default(() => new Date().toISOString()),
    pages_used: z.array(z.string()).default([]),
  }),
  company_brief: z.object({
    summary: z.string().min(1, 'Company summary is required'),
    what_they_do: z.string().min(1, 'Company description is required'),
    sources: z.array(z.string()).default([]),
  }),
  role: z.object({
    title: z.string().min(1, 'Role title is required'),
    seniority: z.string().default('Mid'),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        kind: z.enum(['technical', 'behavioural', 'domain']),
        priority: z.enum(['must', 'nice']),
      })
    ),
  }),
  questions: z.array(ExtendedQuestionSchema),
  flashcards: z.array(ExtendedFlashcardSchema),
  schedule: z.object({
    days_available: z.number().int().min(1),
    days: z.array(
      z.object({
        day: z.number().int().min(1),
        focus: z.string().min(1),
        question_ids: z.array(z.string()),
        minutes: z.number().int().min(1),
      })
    ),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()).default([]),
    passes: z.number().int().min(1).default(1),
  }),
  upsert: z.boolean().optional(),
});

export type SaveKitPayload = z.infer<typeof SaveKitPayloadSchema>;

/**
 * Normalizes user identifier into a valid Mongoose ObjectId
 */
function resolveUserObjectId(rawUserId?: string): mongoose.Types.ObjectId {
  if (!rawUserId) {
    return new mongoose.Types.ObjectId();
  }
  if (mongoose.Types.ObjectId.isValid(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  // Deterministic 24-character hex fallback for string session identifiers
  const hex = Buffer.from(rawUserId).toString('hex').padEnd(24, '0').slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
}

// ==========================================
// Kit Controller Functions
// ==========================================

/**
 * POST /api/kits
 * Persists an Interview Prep Kit to MongoDB with strict Zod validation
 * and duplicate conflict / upsert handling.
 */
export async function saveKit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // 1. Validate payload against Zod schema
    const validationResult = SaveKitPayloadSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid kit payload structure',
          details: validationResult.error.format(),
        },
      });
      return;
    }

    const kitData = validationResult.data;
    const shouldUpsert = kitData.upsert === true || req.query.upsert === 'true';

    // 2. Resolve authenticated user ID
    const rawUserId = req.user?._id || req.user?.id || 'demo_user';
    const userObjectId = resolveUserObjectId(rawUserId);

    // 3. Duplicate detection
    const existingKit = await Kit.findOne({
      userId: userObjectId,
      'source.company': kitData.source.company,
      'source.role': kitData.source.role,
    });

    if (existingKit && !shouldUpsert) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_KIT',
          message: `A kit for "${kitData.source.company} - ${kitData.source.role}" already exists for this user. Pass ?upsert=true or { "upsert": true } to update.`,
        },
        data: {
          existingKitId: existingKit._id,
        },
      });
      return;
    }

    // 4. Persistence: Upsert or Create
    let savedDocument;
    if (existingKit && shouldUpsert) {
      savedDocument = await Kit.findByIdAndUpdate(
        existingKit._id,
        {
          ...kitData,
          userId: userObjectId,
        },
        { new: true, runValidators: true }
      );
    } else {
      savedDocument = await Kit.create({
        ...kitData,
        userId: userObjectId,
      });
    }

    res.status(201).json({
      success: true,
      message: shouldUpsert && existingKit ? 'Kit updated successfully.' : 'Kit created successfully.',
      data: {
        id: savedDocument?._id,
        kit: savedDocument,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[KitController] Failed to persist kit to MongoDB:', error.message);

    res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_ERROR',
        message: 'Internal server error while saving kit to database.',
        details: error.message,
      },
    });
  }
}

/**
 * GET /api/kits
 * Retrieves all stored kits for the authenticated user
 */
export async function getKits(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rawUserId = req.user?._id || req.user?.id || 'demo_user';
    const userObjectId = resolveUserObjectId(rawUserId);

    const kits = await Kit.find({ userId: userObjectId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: kits,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to retrieve kits from database.',
        details: error.message,
      },
    });
  }
}

/**
 * GET /api/kits/:id
 * Retrieves a single kit by ID with tenant isolation
 */
export async function getKitById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid MongoDB ObjectId provided.' },
      });
      return;
    }

    const rawUserId = req.user?._id || req.user?.id || 'demo_user';
    const userObjectId = resolveUserObjectId(rawUserId);

    const kit = await Kit.findOne({ _id: id, userId: userObjectId });
    if (!kit) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kit not found or access denied.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: kit,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
    });
  }
}

// ==========================================
// Express Router Wiring
// ==========================================

export const kitRouter = Router();

kitRouter.post('/', authMiddleware, saveKit);
kitRouter.get('/', authMiddleware, getKits);
kitRouter.get('/:id', authMiddleware, getKitById);

export default kitRouter;
