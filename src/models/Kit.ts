import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Requirement Subdocument
export interface IRequirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

const RequirementSubSchema = new Schema<IRequirement>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
    priority: { type: String, enum: ['must', 'nice'], required: true },
  },
  { _id: false }
);

// Citation Subdocument
export interface ICitation {
  title: string;
  source: string;
  url?: string;
  snippet?: string;
}

const CitationSubSchema = new Schema<ICitation>(
  {
    title: { type: String, required: true },
    source: { type: String, required: true },
    url: { type: String },
    snippet: { type: String },
  },
  { _id: false }
);

// Question Subdocument
export interface IQuestion {
  id: string;
  requirement_ids: string[];
  category: string;
  subcategory?: string;
  prompt: string;
  answer_outline: string;
  expert_answer?: string;
  citations?: ICitation[];
  difficulty: number;
  isEdited?: boolean;
  isCustom?: boolean;
  isPinned?: boolean;
}

const QuestionSubSchema = new Schema<IQuestion>(
  {
    id: { type: String, required: true },
    requirement_ids: [{ type: String }],
    category: { type: String, required: true },
    subcategory: { type: String },
    prompt: { type: String, required: true },
    answer_outline: { type: String, required: true },
    expert_answer: { type: String },
    citations: [CitationSubSchema],
    difficulty: { type: Number, required: true, min: 1, max: 3 },
    isEdited: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  { _id: false }
);

// Flashcard Subdocument
export interface IFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence?: number;
}

const FlashcardSubSchema = new Schema<IFlashcard>(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: [{ type: String }],
    confidence: { type: Number, min: 1, max: 3 },
  },
  { _id: false }
);

// Schedule Day Subdocument
export interface IScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

const ScheduleDaySubSchema = new Schema<IScheduleDay>(
  {
    day: { type: Number, required: true, min: 1 },
    focus: { type: String, required: true },
    question_ids: [{ type: String }],
    minutes: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Kit Document Interface
export interface IKitDocument extends Document {
  userId: Types.ObjectId;
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
    requirements: IRequirement[];
  };
  questions: IQuestion[];
  flashcards: IFlashcard[];
  schedule: {
    days_available: number;
    days: IScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const KitMongooseSchema = new Schema<IKitDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      company: { type: String, required: true, trim: true },
      company_url: { type: String, default: '' },
      role: { type: String, required: true, trim: true },
      location: { type: String, default: 'Remote' },
      jd_chars: { type: Number, required: true, default: 0 },
      researched_at: { type: String, required: true },
      pages_used: [{ type: String }],
    },
    company_brief: {
      summary: { type: String, required: true },
      what_they_do: { type: String, required: true },
      sources: [{ type: String }],
    },
    role: {
      title: { type: String, required: true },
      seniority: { type: String, default: 'Mid' },
      responsibilities: [{ type: String }],
      requirements: [RequirementSubSchema],
    },
    questions: [QuestionSubSchema],
    flashcards: [FlashcardSubSchema],
    schedule: {
      days_available: { type: Number, required: true, min: 1 },
      days: [ScheduleDaySubSchema],
    },
    coverage: {
      uncovered_requirement_ids: [{ type: String }],
      passes: { type: Number, required: true, default: 1 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on userId, company, and role for quick retrieval
KitMongooseSchema.index({ userId: 1, 'source.company': 1, 'source.role': 1 });

export const Kit: Model<IKitDocument> =
  mongoose.models.Kit || mongoose.model<IKitDocument>('Kit', KitMongooseSchema);

export default Kit;
