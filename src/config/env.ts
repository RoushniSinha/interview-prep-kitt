import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env variables into process.env
dotenv.config();

/**
 * Production Environment Zod Schema with Coercion and Sensible Defaults.
 */
export const EnvSchema = z.object({
  // Server & Network
  PORT: z.coerce
    .number()
    .int('PORT must be an integer')
    .positive('PORT must be a positive integer')
    .default(5000),

  ALLOW_PRIVATE_NETWORK: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),

  // Database Persistence (MongoDB Atlas)
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI cannot be empty')
    .default(
      'mongodb+srv://<username>:<password>@cluster0.gulp5qi.mongodb.net/interview_prep_db?retryWrites=true&w=majority'
    ),

  DB_NAME: z.string().default('interview_prep_db'),

  // Google Cloud Vertex AI Search & Conversation (Discovery Engine)
  GCP_PROJECT_ID: z
    .string()
    .min(1, 'GCP_PROJECT_ID must be a non-empty string')
    .optional()
    .default('your-gcp-project-id'),

  GCP_LOCATION: z.string().min(1).default('global'),

  VERTEX_ENGINE_ID: z
    .string()
    .min(1, 'VERTEX_ENGINE_ID must be a non-empty string')
    .optional()
    .default('your-vertex-engine-id'),

  VERTEX_DATA_STORE_ID: z
    .string()
    .default('company-research-datastore_1790224511792'),

  GOOGLE_APPLICATION_CREDENTIALS: z.string().default('./secrets/gcp-key.json'),

  VERTEX_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive('VERTEX_TIMEOUT_MS must be positive')
    .default(15000),

  VERTEX_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0, 'VERTEX_MAX_RETRIES cannot be negative')
    .default(3),

  // LLM Orchestration
  GEMINI_API_KEY: z
    .string()
    .optional(),

  // Security & Session
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').default('super_secret_session_key_123452619'),

  // Runtime Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Strict schema for verifying production Vertex AI readiness.
 */
export const StrictVertexEnvSchema = EnvSchema.extend({
  GCP_PROJECT_ID: z.string().min(1, 'GCP_PROJECT_ID is strictly required for Vertex AI Search'),
  VERTEX_ENGINE_ID: z.string().min(1, 'VERTEX_ENGINE_ID is strictly required for Vertex AI Search'),
});

/**
 * Converts a ZodError into a human-readable diagnostic report with actionable remediation guidance.
 */
export function formatEnvDiagnostics(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.') || 'root';
    let remediation = `Check your .env file or deployment secrets for "${path}".`;

    if (path.includes('PORT')) {
      remediation = 'Set PORT to a valid TCP port number (e.g. 5000 or 8080).';
    } else if (path.includes('GCP_PROJECT_ID')) {
      remediation = 'Set GCP_PROJECT_ID to your active Google Cloud project ID (e.g. "my-project-123").';
    } else if (path.includes('VERTEX_ENGINE_ID')) {
      remediation = 'Set VERTEX_ENGINE_ID to your Discovery Engine Search app ID.';
    } else if (path.includes('MONGODB_URI')) {
      remediation = 'Provide a valid MongoDB Atlas connection URI.';
    } else if (path.includes('TIMEOUT')) {
      remediation = 'Set timeout in milliseconds as a positive integer (e.g. 15000).';
    }

    return `  • [${path}]: ${issue.message}\n    → Remediation: ${remediation}`;
  });

  return [
    '╔════════════════════════════════════════════════════════════════════════════════╗',
    '║                 ENVIRONMENT CONFIGURATION DIAGNOSTIC ERROR                     ║',
    '╚════════════════════════════════════════════════════════════════════════════════╝',
    'The application encountered validation errors while parsing environment variables:',
    '',
    ...issues,
    '',
    'Refer to .env.example for canonical configuration keys and formats.',
  ].join('\n');
}

/**
 * Validates any key-value environment dictionary against EnvSchema.
 */
export function validateEnv(
  customEnv: Record<string, string | undefined> = process.env
): { success: true; data: EnvConfig } | { success: false; diagnostics: string; error: z.ZodError } {
  const result = EnvSchema.safeParse(customEnv);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const diagnostics = formatEnvDiagnostics(result.error);
  return { success: false, diagnostics, error: result.error };
}

/**
 * Loads and validates environment variables on application startup.
 */
export function loadEnv(): EnvConfig {
  const validated = validateEnv(process.env);
  if (!validated.success) {
    console.error('\n' + validated.diagnostics + '\n');
    throw new Error(
      `[EnvStartupError] Invalid environment configuration:\n${validated.diagnostics}`
    );
  }
  return validated.data;
}

export const env = loadEnv();
export default env;
