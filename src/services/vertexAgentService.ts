import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';

// ============================================================================
// 1. Configuration & Type Safety Schemas
// ============================================================================

export const VertexServiceConfigSchema = z.object({
  GCP_PROJECT_ID: z.string().min(1, 'GCP_PROJECT_ID is required'),
  GCP_LOCATION: z.string().default('global'),
  VERTEX_ENGINE_ID: z.string().min(1, 'VERTEX_ENGINE_ID is required'),
  VERTEX_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  VERTEX_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  // Optional test / mocking injection hooks
  fetchFn: z.custom<typeof fetch>().optional(),
  endpointUrlOverride: z.string().url().optional(),
});

export type VertexServiceConfig = z.infer<typeof VertexServiceConfigSchema>;

// ============================================================================
// 2. Data Contract Interfaces
// ============================================================================

export interface GroundedResearchResult {
  summary: string;
  what_they_do: string;
  sources: string[];
  isDegradedFallback: boolean;
}

// Canonical Anti-Hallucination Honest Fallback Payload
export const DEGRADED_HONEST_FALLBACK: Readonly<GroundedResearchResult> = Object.freeze({
  summary: 'No verifiable public hiring or interview records were found for this domain.',
  what_they_do: 'Business operations could not be independently verified from public index sources.',
  sources: [],
  isDegradedFallback: true,
});

// ============================================================================
// 3. Discovery Engine Converse API Schema & Types (Strictly Typed)
// ============================================================================

export interface DiscoveryEngineCitationSource {
  referenceIndex?: number;
  uri?: string;
  url?: string;
}

export interface DiscoveryEngineCitation {
  startIndex?: number;
  endIndex?: number;
  sources?: DiscoveryEngineCitationSource[];
}

export interface DiscoveryEngineReference {
  title?: string;
  uri?: string;
  url?: string;
  document?: string;
}

export interface DiscoveryEngineSummaryWithMetadata {
  summary?: string;
  references?: DiscoveryEngineReference[];
  citationMetadata?: {
    citations?: DiscoveryEngineCitation[];
  };
}

export interface DiscoveryEngineSummary {
  summaryText?: string;
  summary?: string;
  summaryWithMetadata?: DiscoveryEngineSummaryWithMetadata;
}

export interface DiscoveryEngineExtractiveSegment {
  pageNumber?: string;
  content?: string;
}

export interface DiscoveryEngineDocumentData {
  link?: string;
  url?: string;
  title?: string;
  snippets?: Array<{ snippet?: string; htmlSnippet?: string }>;
  extractive_segments?: DiscoveryEngineExtractiveSegment[];
}

export interface DiscoveryEngineSearchResult {
  id?: string;
  document?: {
    id?: string;
    name?: string;
    derivedStructData?: DiscoveryEngineDocumentData;
    structData?: DiscoveryEngineDocumentData;
  };
}

export interface DiscoveryEngineGroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface DiscoveryEngineGroundingSupport {
  groundingChunkIndices?: number[];
  confidenceScore?: number;
}

export interface DiscoveryEngineGroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: DiscoveryEngineGroundingChunk[];
  groundingSupports?: DiscoveryEngineGroundingSupport[];
}

export interface DiscoveryEngineConverseResponse {
  reply?: {
    reply?: string;
    summary?: DiscoveryEngineSummary;
  };
  searchResults?: DiscoveryEngineSearchResult[];
  conversation?: {
    name?: string;
    state?: string;
  };
  groundingMetadata?: DiscoveryEngineGroundingMetadata;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

// ============================================================================
// 4. URL Sanitization & Domain Extraction Utilities
// ============================================================================

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'ref',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
]);

/**
 * Strips UTM and advertising tracking query parameters from cited URLs.
 */
export function sanitizeSourceUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    // Protocol must be HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.has(lower) || lower.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    let cleanUrl = parsed.toString();
    if (cleanUrl.endsWith('?')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    return cleanUrl;
  } catch {
    return null;
  }
}

/**
 * Extracts a normalized domain or hostname for query grounding and filter targeting.
 */
export function extractDomain(rawUrl: string): string {
  try {
    const withProto = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

// ============================================================================
// 5. Decorrelated Jitter Exponential Backoff Calculation
// ============================================================================

/**
 * Calculates Decorrelated Jitter sleep duration (Full Jitter / Decorrelated formula).
 * sleep = min(cap, rand(min, prevSleep * 3))
 */
export function calculateDecorrelatedJitter(
  prevSleepMs: number,
  minBackoffMs = 1000,
  maxBackoffMs = 10000
): number {
  const ceiling = Math.max(minBackoffMs, prevSleepMs * 3);
  const jittered = Math.floor(Math.random() * (ceiling - minBackoffMs + 1)) + minBackoffMs;
  return Math.min(maxBackoffMs, jittered);
}

// ============================================================================
// 6. Principal Vertex Agent Builder Service
// ============================================================================

export class VertexAgentService {
  private config: VertexServiceConfig | null = null;
  private configError: string | null = null;
  private auth: GoogleAuth;
  private fetchFn: typeof fetch;

  constructor(configOverrides?: Partial<VertexServiceConfig>) {
    // Resolve configuration from process.env + explicit overrides
    const rawConfig = {
      GCP_PROJECT_ID: configOverrides?.GCP_PROJECT_ID ?? process.env.GCP_PROJECT_ID,
      GCP_LOCATION: configOverrides?.GCP_LOCATION ?? process.env.GCP_LOCATION ?? 'global',
      VERTEX_ENGINE_ID: configOverrides?.VERTEX_ENGINE_ID ?? process.env.VERTEX_ENGINE_ID,
      VERTEX_TIMEOUT_MS: configOverrides?.VERTEX_TIMEOUT_MS ?? (process.env.VERTEX_TIMEOUT_MS ? Number(process.env.VERTEX_TIMEOUT_MS) : 15000),
      VERTEX_MAX_RETRIES: configOverrides?.VERTEX_MAX_RETRIES ?? (process.env.VERTEX_MAX_RETRIES ? Number(process.env.VERTEX_MAX_RETRIES) : 3),
      fetchFn: configOverrides?.fetchFn,
      endpointUrlOverride: configOverrides?.endpointUrlOverride,
    };

    const parsed = VertexServiceConfigSchema.safeParse(rawConfig);
    if (parsed.success) {
      this.config = parsed.data;
    } else {
      const errorMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      this.configError = errorMsg;
    }

    this.fetchFn = configOverrides?.fetchFn ?? globalThis.fetch;
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Builds the target Discovery Engine Converse REST endpoint URL.
   */
  private buildEndpointUrl(): string {
    if (!this.config) {
      throw new Error('VertexServiceConfig is not loaded.');
    }
    if (this.config.endpointUrlOverride) {
      return this.config.endpointUrlOverride;
    }

    const location = this.config.GCP_LOCATION;
    const host = location === 'global' ? 'discoveryengine.googleapis.com' : `${location}-discoveryengine.googleapis.com`;
    return `https://${host}/v1alpha/projects/${this.config.GCP_PROJECT_ID}/locations/${location}/collections/default_collection/engines/${this.config.VERTEX_ENGINE_ID}/servingConfigs/default_search:converse`;
  }

  /**
   * Retrieves an active OAuth 2.0 authorization header via ADC / GoogleAuth.
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const client = await this.auth.getClient();
      const rawHeaders = (await client.getRequestHeaders()) as unknown as Record<string, string>;
      return rawHeaders || {};
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : String(err);
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'VertexAgentService',
          action: 'getAuthHeaders',
          status: 'AUTH_WARNING',
          message: `Unable to acquire GoogleAuth client token (${errorStr}). Request will proceed with default credentials if available.`,
        })
      );
      return {};
    }
  }

  /**
   * Queries Vertex AI Agent Builder Discovery Engine for grounded intelligence.
   * Guarantees anti-hallucination fallback on failure or zero search hits.
   */
  public async queryGroundedResearch(
    roleTitle: string,
    companyUrl: string
  ): Promise<GroundedResearchResult> {
    const startTime = Date.now();
    const domain = extractDomain(companyUrl);

    // Fail-safe check: If configuration is incomplete or missing, return honest fallback without crashing
    if (!this.config) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'VertexAgentService',
          action: 'queryGroundedResearch',
          attempt: 0,
          latencyMs: Date.now() - startTime,
          httpStatus: null,
          citationCount: 0,
          roleTitle,
          companyUrl,
          status: 'CONFIG_UNAVAILABLE_FALLBACK',
          message: `Vertex AI configuration is missing or invalid: ${this.configError}. Returning unhallucinated degraded fallback.`,
        })
      );
      return { ...DEGRADED_HONEST_FALLBACK };
    }

    const endpointUrl = this.buildEndpointUrl();
    const maxRetries = this.config.VERTEX_MAX_RETRIES;
    const timeoutMs = this.config.VERTEX_TIMEOUT_MS;

    let currentSleepMs = 1000;
    let lastHttpStatus: number | null = null;
    let lastError: Error | null = null;

    // Build the Converse query payload
    const queryPrompt = `Synthesize grounded public intelligence for role "${roleTitle}" at target company domain "${domain}" (${companyUrl}). Detail: 1) What the company does, business model, product domain, and primary tech stack. 2) Engineering culture, interview evaluation mechanics, and hiring process style.`;

    const requestBody = {
      query: {
        text: queryPrompt,
      },
      summarySpec: {
        summaryResultCount: 5,
        includeCitations: true,
        ignoreAdversarialQuery: true,
        ignoreNonSummarySeekingQuery: true,
        modelSpec: {
          version: 'gemini-1.5-flash/default',
        },
      },
      filter: domain && domain.includes('.') ? `site:"${domain}"` : undefined,
    };

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const attemptStart = Date.now();
      const abortController = new AbortController();
      const timeoutHandle = setTimeout(() => {
        abortController.abort(new Error(`Vertex AI Converse request exceeded timeout of ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const authHeaders = await this.getAuthHeaders();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeaders,
        };

        const response = await this.fetchFn(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        clearTimeout(timeoutHandle);
        const latencyMs = Date.now() - attemptStart;
        lastHttpStatus = response.status;

        // Handle retryable status codes: 429 (Resource Exhausted), 500 (Internal), 503 (Unavailable)
        if ([429, 500, 503].includes(response.status)) {
          let waitMs = calculateDecorrelatedJitter(currentSleepMs);

          // Honor Retry-After header if provided
          const retryAfterHeader = response.headers.get('retry-after');
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              waitMs = parsedSeconds * 1000;
            } else {
              const parsedDate = Date.parse(retryAfterHeader);
              if (!isNaN(parsedDate)) {
                const diff = parsedDate - Date.now();
                if (diff > 0) waitMs = diff;
              }
            }
          }

          currentSleepMs = waitMs;

          console.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              service: 'VertexAgentService',
              action: 'queryGroundedResearch',
              attempt,
              latencyMs,
              httpStatus: response.status,
              citationCount: 0,
              roleTitle,
              companyUrl,
              retryInMs: waitMs,
              status: 'RETRYABLE_ERROR',
            })
          );

          if (attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          } else {
            break;
          }
        }

        // Non-OK terminal responses (e.g. 400 Bad Request, 403 Forbidden, 404 Not Found)
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          console.error(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              service: 'VertexAgentService',
              action: 'queryGroundedResearch',
              attempt,
              latencyMs,
              httpStatus: response.status,
              citationCount: 0,
              roleTitle,
              companyUrl,
              errorBody: errorBody.slice(0, 300),
              status: 'HTTP_NON_OK_TERMINAL',
            })
          );
          break;
        }

        // Parse and validate response
        const data = (await response.json()) as DiscoveryEngineConverseResponse;
        const parsedResult = this.parseConverseResponse(data, companyUrl);

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'VertexAgentService',
            action: 'queryGroundedResearch',
            attempt,
            latencyMs,
            httpStatus: response.status,
            citationCount: parsedResult.sources.length,
            roleTitle,
            companyUrl,
            status: parsedResult.isDegradedFallback ? 'DEGRADED_RESPONSE' : 'SUCCESS',
          })
        );

        return parsedResult;
      } catch (err: unknown) {
        clearTimeout(timeoutHandle);
        const latencyMs = Date.now() - attemptStart;
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;

        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');
        console.warn(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'VertexAgentService',
            action: 'queryGroundedResearch',
            attempt,
            latencyMs,
            httpStatus: lastHttpStatus,
            citationCount: 0,
            roleTitle,
            companyUrl,
            error: error.message,
            isTimeout,
            status: attempt <= maxRetries ? 'TRANSIENT_EXCEPTION_RETRY' : 'TRANSIENT_EXCEPTION_EXHAUSTED',
          })
        );

        if (attempt <= maxRetries) {
          const waitMs = calculateDecorrelatedJitter(currentSleepMs);
          currentSleepMs = waitMs;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    // All attempts exhausted or non-recoverable error encountered -> Return clean honest degraded fallback
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'VertexAgentService',
        action: 'queryGroundedResearch',
        totalLatencyMs: Date.now() - startTime,
        httpStatus: lastHttpStatus,
        citationCount: 0,
        roleTitle,
        companyUrl,
        finalError: lastError?.message,
        status: 'EXHAUSTED_RETRIES_FALLBACK',
      })
    );

    return { ...DEGRADED_HONEST_FALLBACK };
  }

  /**
   * Parses the Discovery Engine Converse response payload, extracts citations,
   * dedupes sanitized URLs, and splits content into summary and what_they_do.
   */
  private parseConverseResponse(
    data: DiscoveryEngineConverseResponse,
    fallbackUrl: string
  ): GroundedResearchResult {
    // 1. Extract text body from summary or direct reply
    const rawSummaryText =
      data.reply?.summary?.summaryText ||
      data.reply?.summary?.summaryWithMetadata?.summary ||
      data.reply?.summary?.summary ||
      data.reply?.reply ||
      '';

    const text = rawSummaryText.trim();

    // 2. Extract citations from summaryWithMetadata, citations, groundingMetadata, and searchResults
    const candidateUrls: string[] = [];

    // From summary references
    const references = data.reply?.summary?.summaryWithMetadata?.references;
    if (Array.isArray(references)) {
      for (const ref of references) {
        if (ref.uri) candidateUrls.push(ref.uri);
        if (ref.url) candidateUrls.push(ref.url);
      }
    }

    // From citation metadata
    const citations = data.reply?.summary?.summaryWithMetadata?.citationMetadata?.citations;
    if (Array.isArray(citations)) {
      for (const citation of citations) {
        if (Array.isArray(citation.sources)) {
          for (const s of citation.sources) {
            if (s.uri) candidateUrls.push(s.uri);
            if (s.url) candidateUrls.push(s.url);
          }
        }
      }
    }

    // From grounding metadata chunks
    const groundingChunks = data.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) candidateUrls.push(chunk.web.uri);
      }
    }

    // From searchResults derivedStructData
    if (Array.isArray(data.searchResults)) {
      for (const res of data.searchResults) {
        const link = res.document?.derivedStructData?.link || res.document?.derivedStructData?.url;
        if (link) candidateUrls.push(link);
        const structLink = res.document?.structData?.link || res.document?.structData?.url;
        if (structLink) candidateUrls.push(structLink);
      }
    }

    // Sanitize and deduplicate URLs
    const sanitizedSources: string[] = [];
    const seen = new Set<string>();

    for (const raw of candidateUrls) {
      const clean = sanitizeSourceUrl(raw);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        sanitizedSources.push(clean);
      }
    }

    // 3. Fallback check: If text is empty or search hits are 0
    if (!text || (sanitizedSources.length === 0 && (!data.searchResults || data.searchResults.length === 0))) {
      return { ...DEGRADED_HONEST_FALLBACK };
    }

    // 4. Synthesize summary and what_they_do from text
    const { summary, what_they_do } = this.partitionIntelligence(text);

    return {
      summary,
      what_they_do,
      sources: sanitizedSources.length > 0 ? sanitizedSources : [fallbackUrl].filter((u) => u.startsWith('http')),
      isDegradedFallback: false,
    };
  }

  /**
   * Intelligently partitions synthesized findings into summary (culture, hiring, evaluation)
   * and what_they_do (business model, products, tech stack).
   */
  private partitionIntelligence(text: string): { summary: string; what_they_do: string } {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const whatTheyDoParts: string[] = [];
    const summaryParts: string[] = [];
    let currentSection: 'what_they_do' | 'summary' | 'unknown' = 'unknown';

    const isWhatTheyDoHeader = (l: string): boolean => {
      const clean = l.replace(/^#+\s*/, '').replace(/[:\s]+$/, '').toLowerCase();
      return ['what they do', 'business model', 'overview', 'tech stack', 'products', 'product', 'company overview'].includes(clean) ||
        (l.length < 35 && /^(what they do|overview|business model)[:\s]*$/i.test(l));
    };

    const isSummaryHeader = (l: string): boolean => {
      const clean = l.replace(/^#+\s*/, '').replace(/[:\s]+$/, '').toLowerCase();
      return ['culture & interview process', 'culture and interview process', 'culture', 'interview process', 'hiring process', 'evaluation', 'engineering culture'].includes(clean) ||
        (l.length < 40 && /^(culture|interview|hiring|evaluation|values)[:\s]/i.test(l)) ||
        (l.length < 40 && /[:\s]*interview/i.test(l) && l.endsWith(':'));
    };

    for (const line of lines) {
      if (isWhatTheyDoHeader(line)) {
        currentSection = 'what_they_do';
        continue;
      }
      if (isSummaryHeader(line)) {
        currentSection = 'summary';
        continue;
      }

      if (currentSection === 'what_they_do') {
        whatTheyDoParts.push(line);
      } else if (currentSection === 'summary') {
        summaryParts.push(line);
      } else {
        const lower = line.toLowerCase();
        if (
          lower.includes('interview') ||
          lower.includes('rounds') ||
          lower.includes('culture') ||
          lower.includes('hiring') ||
          lower.includes('evaluation')
        ) {
          summaryParts.push(line);
        } else {
          whatTheyDoParts.push(line);
        }
      }
    }

    let what_they_do = whatTheyDoParts.join('\n\n').trim();
    let summary = summaryParts.join('\n\n').trim();

    // Fallbacks if one side was empty
    if (!what_they_do && summary) {
      what_they_do = summary;
    } else if (!summary && what_they_do) {
      summary = what_they_do;
    } else if (!summary && !what_they_do) {
      summary = text;
      what_they_do = text;
    }

    return { summary, what_they_do };
  }
}

export default VertexAgentService;
