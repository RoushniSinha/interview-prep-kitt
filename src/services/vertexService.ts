import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';
import env from '../config/env';

// ============================================================================
// 1. Configuration & Type Safety Schemas
// ============================================================================

export const VertexServiceConfigSchema = z.object({
  GCP_PROJECT_ID: z.string().min(1, 'GCP_PROJECT_ID is required'),
  GCP_LOCATION: z.string().default('global'),
  VERTEX_ENGINE_ID: z.string().min(1, 'VERTEX_ENGINE_ID is required'),
  VERTEX_DATA_STORE_ID: z.string().optional().default('company-research-datastore_1790224511792'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  VERTEX_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  VERTEX_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  // Optional test / mocking injection hooks
  fetchFn: z.custom<typeof fetch>().optional(),
  endpointUrlOverride: z.string().url().optional(),
  authClient: z.any().optional(),
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

/**
 * Honest, un-hallucinated fallback payload per Assessment Section 10 & Appendix A.
 * Returned when target domain has zero results, is 404, or is unindexed.
 */
export const DEGRADED_HONEST_FALLBACK: Readonly<GroundedResearchResult> = Object.freeze({
  summary: 'No verifiable public hiring or interview records were found for this company domain.',
  what_they_do: 'Company operations could not be independently verified from public index sources.',
  sources: [],
  isDegradedFallback: true,
});

// ============================================================================
// 3. Discovery Engine API Response Schemas
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

export interface DiscoveryEngineSearchResultItem {
  id?: string;
  document?: {
    id?: string;
    name?: string;
    derivedStructData?: {
      link?: string;
      url?: string;
      title?: string;
      snippets?: Array<{ snippet?: string; htmlSnippet?: string }>;
      extractive_segments?: Array<{ pageNumber?: string; content?: string }>;
      extractive_answers?: Array<{ pageNumber?: string; content?: string }>;
    };
    structData?: {
      link?: string;
      url?: string;
      title?: string;
      description?: string;
    };
  };
}

export interface DiscoveryEngineSearchResponse {
  results?: DiscoveryEngineSearchResultItem[];
  totalSize?: number;
  attributionToken?: string;
  summary?: DiscoveryEngineSummary;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

// ============================================================================
// 4. Utility Functions: Sanitization, Parsing & Jitter
// ============================================================================

/**
 * Strips tracking query parameters (utm_*, ref, etc.) and returns clean normalized URLs.
 */
export function sanitizeSourceUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return null;
    }
    const parsed = new URL(trimmed);

    // Strip common tracking and referrer query parameters
    const trackingPrefixes = ['utm_', 'ref', 'fbclid', 'gclid', 'msclkid', 'twclid', 'mc_cid', 'mc_eid'];
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (trackingPrefixes.some((p) => lower.startsWith(p)) || lower === 'ref' || lower === 'ref_src') {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach((k) => parsed.searchParams.delete(k));

    // Strip hash tracking
    if (parsed.hash && (parsed.hash.includes('utm_') || parsed.hash.includes('ref='))) {
      parsed.hash = '';
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts a normalized domain hostname from a raw URL.
 */
export function extractDomain(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const formatted = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

/**
 * Full Decorrelated Jitter Exponential Backoff algorithm.
 * Sleep = min(capMs, randBetween(baseMs, prevSleepMs * 3))
 */
export function calculateDecorrelatedJitter(
  attempt: number,
  baseMs = 1000,
  capMs = 12000,
  prevSleepMs = 1000
): number {
  const min = baseMs;
  const max = Math.min(capMs, Math.max(baseMs, prevSleepMs * 3));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// 5. Structured Telemetry Logging Interface
// ============================================================================

export interface VertexTelemetryLog {
  timestamp: string;
  service: 'VertexAgentService';
  action: 'queryGroundedResearch';
  attempt: number;
  latencyMs: number;
  httpStatus: number | null;
  citationCount: number;
  query: string;
  companyUrl: string;
  status: 'SUCCESS' | 'RETRYABLE_ERROR' | 'DEGRADED_RESPONSE' | 'CONFIG_UNAVAILABLE_FALLBACK' | 'FATAL_ERROR';
  message?: string;
  retryInMs?: number;
}

// ============================================================================
// 6. Production VertexAgentService Implementation
// ============================================================================

export class VertexAgentService {
  private config: VertexServiceConfig;
  private isConfigured = false;
  private auth: GoogleAuth | null = null;
  private fetchImpl: typeof fetch;

  constructor(userConfig?: Partial<VertexServiceConfig>) {
    const candidateConfig = {
      GCP_PROJECT_ID: userConfig?.GCP_PROJECT_ID || env.GCP_PROJECT_ID || '',
      GCP_LOCATION: userConfig?.GCP_LOCATION || env.GCP_LOCATION || 'global',
      VERTEX_ENGINE_ID: userConfig?.VERTEX_ENGINE_ID || env.VERTEX_ENGINE_ID || '',
      VERTEX_DATA_STORE_ID: userConfig?.VERTEX_DATA_STORE_ID || env.VERTEX_DATA_STORE_ID || 'company-research-datastore_1790224511792',
      GOOGLE_APPLICATION_CREDENTIALS: userConfig?.GOOGLE_APPLICATION_CREDENTIALS || env.GOOGLE_APPLICATION_CREDENTIALS,
      VERTEX_TIMEOUT_MS: userConfig?.VERTEX_TIMEOUT_MS ?? env.VERTEX_TIMEOUT_MS ?? 15000,
      VERTEX_MAX_RETRIES: userConfig?.VERTEX_MAX_RETRIES ?? env.VERTEX_MAX_RETRIES ?? 3,
      fetchFn: userConfig?.fetchFn,
      endpointUrlOverride: userConfig?.endpointUrlOverride,
      authClient: userConfig?.authClient,
    };

    const parsed = VertexServiceConfigSchema.safeParse(candidateConfig);
    if (parsed.success) {
      this.config = parsed.data;
      this.isConfigured = Boolean(this.config.GCP_PROJECT_ID && this.config.VERTEX_ENGINE_ID);
    } else {
      // Graceful degraded mode when config is incomplete
      this.config = {
        GCP_PROJECT_ID: candidateConfig.GCP_PROJECT_ID || '',
        GCP_LOCATION: candidateConfig.GCP_LOCATION || 'global',
        VERTEX_ENGINE_ID: candidateConfig.VERTEX_ENGINE_ID || '',
        VERTEX_DATA_STORE_ID: candidateConfig.VERTEX_DATA_STORE_ID,
        GOOGLE_APPLICATION_CREDENTIALS: candidateConfig.GOOGLE_APPLICATION_CREDENTIALS,
        VERTEX_TIMEOUT_MS: 15000,
        VERTEX_MAX_RETRIES: 3,
        fetchFn: userConfig?.fetchFn,
        endpointUrlOverride: userConfig?.endpointUrlOverride,
        authClient: userConfig?.authClient,
      };
      this.isConfigured = false;
    }

    this.fetchImpl = this.config.fetchFn || globalThis.fetch.bind(globalThis);

    // Initialize GoogleAuth client supporting ambient or local service credentials
    if (this.isConfigured && !this.config.authClient) {
      try {
        const authOptions: { scopes: string[]; keyFilename?: string } = {
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        };
        if (this.config.GOOGLE_APPLICATION_CREDENTIALS) {
          authOptions.keyFilename = this.config.GOOGLE_APPLICATION_CREDENTIALS;
        }
        this.auth = new GoogleAuth(authOptions);
      } catch (authInitErr) {
        console.warn('[VertexAgentService] GoogleAuth initialization deferred:', authInitErr instanceof Error ? authInitErr.message : authInitErr);
      }
    }
  }

  /**
   * Generates the target REST endpoint URL:
   * https://${GCP_LOCATION}-discoveryengine.googleapis.com/v1alpha/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/collections/default_collection/engines/${VERTEX_ENGINE_ID}/servingConfigs/default_search:search
   */
  public getEndpointUrl(): string {
    if (this.config.endpointUrlOverride) {
      return this.config.endpointUrlOverride;
    }
    const loc = this.config.GCP_LOCATION || 'global';
    const proj = this.config.GCP_PROJECT_ID;
    const engine = this.config.VERTEX_ENGINE_ID;
    return `https://${loc}-discoveryengine.googleapis.com/v1alpha/projects/${proj}/locations/${loc}/collections/default_collection/engines/${engine}/servingConfigs/default_search:search`;
  }

  /**
   * Retrieves an OAuth 2.0 Bearer token via GoogleAuth or injected auth client.
   */
  public async getAccessToken(): Promise<string | null> {
    if (this.config.authClient && typeof this.config.authClient.getAccessToken === 'function') {
      const customToken = await this.config.authClient.getAccessToken();
      return typeof customToken === 'string' ? customToken : customToken?.token || null;
    }

    if (!this.auth) {
      try {
        const authOptions: { scopes: string[]; keyFilename?: string } = {
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        };
        if (this.config.GOOGLE_APPLICATION_CREDENTIALS) {
          authOptions.keyFilename = this.config.GOOGLE_APPLICATION_CREDENTIALS;
        }
        this.auth = new GoogleAuth(authOptions);
      } catch {
        return null;
      }
    }

    try {
      const client = await this.auth.getClient();
      const tokenResult = await client.getAccessToken();
      return tokenResult.token || null;
    } catch (err) {
      console.warn('[VertexAgentService] Unable to acquire GCP access token (ambient or file credentials unavailable).');
      return null;
    }
  }

  /**
   * Grounded search query mechanics against Google Cloud Discovery Engine Search:
   * 1. Query targeting role requirements & company culture
   * 2. PageSize 5 with snippetSpec & summaryResultSpec
   * 3. Citation & snippet deduplication
   * 4. Bounded AbortController timeout
   * 5. Decorrelated Jitter retry backoff on 429/500/503
   * 6. Non-fatal degradation fallback on 0 results, 404, or unindexed domains
   */
  public async queryGroundedResearch(
    queryOrRole: string,
    companyUrl: string
  ): Promise<GroundedResearchResult> {
    const domain = extractDomain(companyUrl);
    const naturalQuery = queryOrRole.includes(domain) || !domain
      ? queryOrRole
      : `${queryOrRole} engineering culture interview process architecture requirements ${domain}`;

    // 1. Guard against unconfigured environments
    if (!this.isConfigured) {
      this.logTelemetry({
        timestamp: new Date().toISOString(),
        service: 'VertexAgentService',
        action: 'queryGroundedResearch',
        attempt: 0,
        latencyMs: 0,
        httpStatus: null,
        citationCount: 0,
        query: naturalQuery,
        companyUrl,
        status: 'CONFIG_UNAVAILABLE_FALLBACK',
        message: 'Vertex AI configuration is unconfigured or missing required project/engine IDs. Returning un-hallucinated degraded fallback.',
      });
      return { ...DEGRADED_HONEST_FALLBACK };
    }

    const endpointUrl = this.getEndpointUrl();
    const maxRetries = this.config.VERTEX_MAX_RETRIES;
    let prevSleepMs = 1000;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.VERTEX_TIMEOUT_MS);

      try {
        const accessToken = await this.getAccessToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Configure search request according to Discovery Engine Search spec
        const requestPayload = {
          query: naturalQuery,
          pageSize: 5,
          contentSearchSpec: {
            snippetSpec: {
              returnSnippet: true,
            },
            summaryResultSpec: {
              summaryResultCount: 3,
            },
            summarySpec: {
              summaryResultCount: 3,
              includeCitations: true,
              ignoreAdversarialQuery: true,
              ignoreNonSummarySeekingQuery: true,
            },
            extractiveContentSpec: {
              maxExtractiveAnswerCount: 1,
            },
          },
        };

        const response = await this.fetchImpl(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        // Check for 404 (Engine or Datastore not found / unindexed)
        if (response.status === 404) {
          this.logTelemetry({
            timestamp: new Date().toISOString(),
            service: 'VertexAgentService',
            action: 'queryGroundedResearch',
            attempt,
            latencyMs,
            httpStatus: 404,
            citationCount: 0,
            query: naturalQuery,
            companyUrl,
            status: 'DEGRADED_RESPONSE',
            message: 'Discovery Engine returned 404 (Resource or domain index not found). Returning honest degraded fallback.',
          });
          return { ...DEGRADED_HONEST_FALLBACK };
        }

        // Handle retryable status codes: 429, 500, 503
        if (response.status === 429 || response.status === 500 || response.status === 503) {
          if (attempt <= maxRetries) {
            let backoffMs = calculateDecorrelatedJitter(attempt, 1000, 12000, prevSleepMs);
            prevSleepMs = backoffMs;

            const retryAfterHeader = response.headers.get('Retry-After');
            if (retryAfterHeader) {
              const parsedSeconds = parseInt(retryAfterHeader, 10);
              if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
                backoffMs = Math.min(15000, parsedSeconds * 1000);
              }
            }

            this.logTelemetry({
              timestamp: new Date().toISOString(),
              service: 'VertexAgentService',
              action: 'queryGroundedResearch',
              attempt,
              latencyMs,
              httpStatus: response.status,
              citationCount: 0,
              query: naturalQuery,
              companyUrl,
              retryInMs: backoffMs,
              status: 'RETRYABLE_ERROR',
            });

            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          this.logTelemetry({
            timestamp: new Date().toISOString(),
            service: 'VertexAgentService',
            action: 'queryGroundedResearch',
            attempt,
            latencyMs,
            httpStatus: response.status,
            citationCount: 0,
            query: naturalQuery,
            companyUrl,
            status: 'DEGRADED_RESPONSE',
            message: `Discovery Engine error ${response.status}: ${errText.slice(0, 200)}`,
          });
          return { ...DEGRADED_HONEST_FALLBACK };
        }

        const data: DiscoveryEngineSearchResponse = await response.json();
        return this.parseDiscoveryEngineResponse(data, latencyMs, naturalQuery, companyUrl);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        const isAbort = (err as Error)?.name === 'AbortError';

        if (attempt <= maxRetries && isAbort) {
          const backoffMs = calculateDecorrelatedJitter(attempt, 1000, 10000, prevSleepMs);
          prevSleepMs = backoffMs;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        this.logTelemetry({
          timestamp: new Date().toISOString(),
          service: 'VertexAgentService',
          action: 'queryGroundedResearch',
          attempt,
          latencyMs,
          httpStatus: null,
          citationCount: 0,
          query: naturalQuery,
          companyUrl,
          status: 'DEGRADED_RESPONSE',
          message: `Network/Abort exception caught: ${(err as Error)?.message}. Engaging honest fallback.`,
        });

        return { ...DEGRADED_HONEST_FALLBACK };
      }
    }

    return { ...DEGRADED_HONEST_FALLBACK };
  }

  /**
   * Parses the Discovery Engine Search response, extracting summaries, extractive snippets,
   * citations, and deduplicated sanitized URLs.
   */
  public parseDiscoveryEngineResponse(
    data: DiscoveryEngineSearchResponse,
    latencyMs: number,
    query: string,
    companyUrl: string
  ): GroundedResearchResult {
    const results = data.results || [];
    const totalResults = data.totalSize ?? results.length;

    // Check for zero results / empty payload
    if (totalResults === 0 || results.length === 0) {
      this.logTelemetry({
        timestamp: new Date().toISOString(),
        service: 'VertexAgentService',
        action: 'queryGroundedResearch',
        attempt: 1,
        latencyMs,
        httpStatus: 200,
        citationCount: 0,
        query,
        companyUrl,
        status: 'DEGRADED_RESPONSE',
        message: 'Discovery Engine returned 0 indexed results for target query. Applying honest fallback.',
      });
      return { ...DEGRADED_HONEST_FALLBACK };
    }

    // 1. Extract and sanitize all source URLs from search results and references
    const rawSources: string[] = [];

    // From summary metadata references
    const references = data.summary?.summaryWithMetadata?.references || [];
    for (const ref of references) {
      if (ref.uri) rawSources.push(ref.uri);
      if (ref.url) rawSources.push(ref.url);
    }

    // From citation metadata
    const citations = data.summary?.summaryWithMetadata?.citationMetadata?.citations || [];
    for (const citation of citations) {
      if (citation.sources) {
        for (const src of citation.sources) {
          if (src.uri) rawSources.push(src.uri);
          if (src.url) rawSources.push(src.url);
        }
      }
    }

    // From search result items
    for (const item of results) {
      const derived = item.document?.derivedStructData;
      if (derived?.link) rawSources.push(derived.link);
      if (derived?.url) rawSources.push(derived.url);
      const struct = item.document?.structData;
      if (struct?.link) rawSources.push(struct.link);
      if (struct?.url) rawSources.push(struct.url);
    }

    // Deduplicate and sanitize
    const sanitizedSources = Array.from(
      new Set(
        rawSources
          .map((u) => sanitizeSourceUrl(u))
          .filter((u): u is string => Boolean(u))
      )
    );

    // 2. Extract grounded summary text
    let summaryText =
      data.summary?.summaryText ||
      data.summary?.summary ||
      data.summary?.summaryWithMetadata?.summary ||
      '';

    // 3. Extract extractive snippets and descriptions for what_they_do
    const snippetList: string[] = [];
    for (const item of results) {
      const derived = item.document?.derivedStructData;
      if (derived?.extractive_answers) {
        for (const ans of derived.extractive_answers) {
          if (ans.content) snippetList.push(ans.content.trim());
        }
      }
      if (derived?.snippets) {
        for (const snip of derived.snippets) {
          if (snip.snippet) snippetList.push(snip.snippet.trim());
        }
      }
      if (item.document?.structData?.description) {
        snippetList.push(item.document.structData.description.trim());
      }
    }

    if (!summaryText && snippetList.length > 0) {
      summaryText = snippetList.slice(0, 2).join(' ');
    }

    let whatTheyDoText = '';
    if (snippetList.length > 0) {
      whatTheyDoText = snippetList.slice(0, 3).join(' ');
    } else {
      whatTheyDoText = summaryText;
    }

    // If completely empty after search, trigger honest fallback
    if (!summaryText.trim() && sanitizedSources.length === 0) {
      return { ...DEGRADED_HONEST_FALLBACK };
    }

    this.logTelemetry({
      timestamp: new Date().toISOString(),
      service: 'VertexAgentService',
      action: 'queryGroundedResearch',
      attempt: 1,
      latencyMs,
      httpStatus: 200,
      citationCount: sanitizedSources.length,
      query,
      companyUrl,
      status: 'SUCCESS',
    });

    return {
      summary: summaryText.trim() || DEGRADED_HONEST_FALLBACK.summary,
      what_they_do: whatTheyDoText.trim() || DEGRADED_HONEST_FALLBACK.what_they_do,
      sources: sanitizedSources,
      isDegradedFallback: false,
    };
  }

  private logTelemetry(log: VertexTelemetryLog): void {
    console.log(JSON.stringify(log));
  }
}

// Export both standard names for seamless developer interoperability
export const VertexService = VertexAgentService;
export default VertexAgentService;
