import { z } from 'zod';
export * from '../validation/kitValidator';
import {
  KitSchema,
  Kit,
  SourceSchema,
  CompanyBriefSchema,
  RoleSchema,
  RequirementSchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleDaySchema,
  ScheduleSchema,
  CoverageSchema,
  validateKit,
} from '../validation/kitValidator';

// ==========================================
// Appendix B: Batch Evaluator Payload Schemas
// ==========================================

export const BatchCaseSchema = z.object({
  id: z.string(),
  jd: z.string().min(1),
  company_url: z.string(),
  days: z.number().int().min(1).max(90).default(7),
});

export type BatchCase = z.infer<typeof BatchCaseSchema>;

export const BatchOutputCaseSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: KitSchema.nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).nullable(),
});

export type BatchOutputCase = z.infer<typeof BatchOutputCaseSchema>;

export const BatchOutputPayloadSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  kits: z.array(BatchOutputCaseSchema),
});

export type BatchOutputPayload = z.infer<typeof BatchOutputPayloadSchema>;

// ==========================================
// Stage 9: Draft State Reconciliation Types
// ==========================================

export type OriginType = 'generated' | 'edited' | 'pinned';

export interface DraftItemMeta {
  origin: OriginType;
  lastGeneratedHash?: string;
  isCustom?: boolean;
  pendingRegeneration?: any;
}

export interface KitDraftState {
  items: Record<string, DraftItemMeta>; // key is entity id or JSON path, e.g. "q1", "r2", "company_brief"
  tombstones: string[]; // deleted item IDs that must not be resurrected
}

export interface StoredKit {
  _id: string;
  id?: string;
  userId: string;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  source: {
    company: string;
    company_url: string;
    role: string;
    days: number;
    jd: string;
  };
  kit: Kit | null;
  draftState: KitDraftState;
  createdAt: string;
  updatedAt: string;
  generationJob?: {
    stage: string;
    progress: number;
    message: string;
    error?: string;
  };
}

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface FlashcardPracticeLog {
  flashcardId: string;
  confidence: 1 | 2 | 3; // 1: Poor, 2: Moderate, 3: Confident
  timestamp: string;
}

export interface PracticeSession {
  kitId: string;
  userId: string;
  logs: FlashcardPracticeLog[];
  updatedAt: string;
}
