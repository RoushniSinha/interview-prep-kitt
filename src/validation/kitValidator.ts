import { z } from 'zod';

// ============================================================================
// 1. Source Schema & Invariants
// ============================================================================
export const SourceSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  company_url: z.string().url('company_url must be a valid URL string'),
  role: z.string().min(1, 'Role title is required'),
  location: z.string().min(1, 'Location is required'),
  jd_chars: z.number().int('jd_chars must be an integer').min(0, 'jd_chars must be non-negative'),
  researched_at: z.string().datetime({ offset: true, message: 'researched_at must be an ISO 8601 date string' }),
  pages_used: z.array(z.string().url('Each page_used must be a valid URL string')),
});

export type Source = z.infer<typeof SourceSchema>;

// ============================================================================
// 2. Company Brief Schema & Invariants
// ============================================================================
export const CompanyBriefSchema = z.object({
  summary: z.string().min(1, 'Company summary is required'),
  what_they_do: z.string().min(1, 'what_they_do description is required'),
  sources: z.array(z.string().url('Each source must be a valid URL string')),
});

export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

// ============================================================================
// 3. Role & Requirements Schemas & Invariants
// ============================================================================
export const RequirementSchema = z.object({
  id: z.string().min(1, 'Requirement ID is required'), // e.g. "r1", "r2"
  text: z.string().min(1, 'Requirement text cannot be empty'),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

export type Requirement = z.infer<typeof RequirementSchema>;

export const RoleSchema = z.object({
  title: z.string().min(1, 'Role title is required'),
  seniority: z.string().min(1, 'Seniority level is required'),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export type Role = z.infer<typeof RoleSchema>;

// ============================================================================
// 4. Question Schema & Invariants
// ============================================================================
export const QuestionCategoryEnum = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);
export type QuestionCategory = z.infer<typeof QuestionCategoryEnum>;

export const CitationSchema = z.object({
  title: z.string().min(1, 'Citation title is required'),
  source: z.string().min(1, 'Citation source is required'),
  url: z.string().optional(),
  snippet: z.string().optional(),
  verified: z.boolean().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'), // e.g. "q1"
  requirement_ids: z.array(z.string()).min(1, 'Questions must target at least one requirement ID'),
  category: QuestionCategoryEnum,
  subcategory: z.string().optional(),
  prompt: z.string().min(1, 'Question prompt is required'),
  answer_outline: z.string().min(1, 'Answer outline is required'),
  expert_answer: z.string().optional(),
  citations: z.array(CitationSchema).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isCustom: z.boolean().optional(),
  isEdited: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

// ============================================================================
// 5. Flashcard Schema & Invariants
// ============================================================================
export const FlashcardConfidenceEnum = z.enum(['low', 'medium', 'high']);
export type FlashcardConfidence = z.infer<typeof FlashcardConfidenceEnum>;

export const FlashcardSchema = z.object({
  id: z.string().min(1, 'Flashcard ID is required'), // e.g. "f1"
  front: z.string().min(1, 'Front prompt is required'),
  back: z.string().min(1, 'Back answer is required'),
  requirement_ids: z.array(z.string()),
  confidence: FlashcardConfidenceEnum.optional(),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

// ============================================================================
// 6. Schedule Day & Schedule Schemas & Invariants
// ============================================================================
export const ScheduleDaySchema = z.object({
  day: z.number().int('Day index must be an integer').min(1, 'Day index must be >= 1'),
  focus: z.string().min(1, 'Daily focus is required'),
  question_ids: z.array(z.string()),
  minutes: z.number().int('Minutes must be a strict integer').positive('Minutes must be strictly greater than 0'),
});

export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

export const ScheduleSchema = z.object({
  days_available: z.number().int('days_available must be an integer').min(1, 'days_available must be >= 1'),
  days: z.array(ScheduleDaySchema),
});

export type Schedule = z.infer<typeof ScheduleSchema>;

// ============================================================================
// 7. Coverage Schema & Invariants
// ============================================================================
export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int('passes must be an integer').min(0, 'passes must be >= 0'),
});

export type Coverage = z.infer<typeof CoverageSchema>;

// ============================================================================
// Root Kit Schema with Cross-Entity Referencing Invariants
// ============================================================================
export const BaseKitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

export const KitSchema = BaseKitSchema.superRefine((kit, ctx) => {
  // Collect all defined requirement IDs
  const definedRequirementIds = new Set(kit.role.requirements.map((r) => r.id));

  // Invariant 4: Questions requirement_ids must match defined requirement IDs
  kit.questions.forEach((question, qIdx) => {
    question.requirement_ids.forEach((reqId, rIdx) => {
      if (!definedRequirementIds.has(reqId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question '${question.id}' references requirement_id '${reqId}' which is not defined in role.requirements.`,
          path: ['questions', qIdx, 'requirement_ids', rIdx],
        });
      }
    });
  });
});

export type Kit = z.infer<typeof KitSchema>;

// ============================================================================
// Validation Helper Function
// ============================================================================
export type ValidateKitResult<T = Kit> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodFormattedError<T> };

/**
 * Validates any candidate payload against the complete interview kit contract.
 * Returns { success: true, data } on success or { success: false, errors } on failure.
 */
export function validateKit(payload: unknown): ValidateKitResult<Kit> {
  const result = KitSchema.safeParse(payload);
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  return {
    success: false,
    errors: result.error.format(),
  };
}

export default validateKit;
