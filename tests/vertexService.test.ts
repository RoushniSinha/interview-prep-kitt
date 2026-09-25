import assert from 'assert';
import {
  VertexAgentService,
  VertexService,
  VertexServiceConfigSchema,
  sanitizeSourceUrl,
  extractDomain,
  calculateDecorrelatedJitter,
  DEGRADED_HONEST_FALLBACK,
  DiscoveryEngineSearchResponse,
} from '../src/services/vertexService';
import {
  EnvSchema,
  StrictVertexEnvSchema,
  formatEnvDiagnostics,
  validateEnv,
} from '../src/config/env';

export async function runVertexServiceTests() {
  console.log('\n====================================================');
  console.log('--- Vertex AI Search & Discovery Engine Test Suite ---');
  console.log('====================================================');

  // --------------------------------------------------------------------------
  // Group 1: Deliverable 1 - Typed Environment & Schema Diagnostics
  // --------------------------------------------------------------------------
  console.log('\n[Group 1: Typed Environment & Schema Diagnostics]');

  // Test 1.1: Valid environment configuration parsing
  const testValidEnv = {
    PORT: '5000',
    ALLOW_PRIVATE_NETWORK: 'true',
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true&w=majority',
    GCP_PROJECT_ID: 'interview-prep-kit-prod',
    GCP_LOCATION: 'global',
    VERTEX_ENGINE_ID: 'interview-grounding-engine',
    VERTEX_DATA_STORE_ID: 'company-research-datastore_1790224511792',
    GOOGLE_APPLICATION_CREDENTIALS: './secrets/gcp-key.json',
    VERTEX_TIMEOUT_MS: '15000',
    VERTEX_MAX_RETRIES: '3',
    JWT_SECRET: 'super_secret_session_key_123452619',
  };
  const envValidation = validateEnv(testValidEnv);
  assert.strictEqual(envValidation.success, true, 'Valid environment dictionary must pass validation');
  if (envValidation.success) {
    assert.strictEqual(envValidation.data.PORT, 5000);
    assert.strictEqual(envValidation.data.ALLOW_PRIVATE_NETWORK, true);
    assert.strictEqual(envValidation.data.GCP_LOCATION, 'global');
    assert.strictEqual(envValidation.data.VERTEX_TIMEOUT_MS, 15000);
    assert.strictEqual(envValidation.data.VERTEX_MAX_RETRIES, 3);
  }
  console.log('✓ validateEnv successfully parses valid configuration with coerced types');

  // Test 1.2: Human-readable diagnostic reporting on invalid configuration
  const invalidEnv = {
    PORT: '-8080', // Invalid: negative integer
    VERTEX_TIMEOUT_MS: 'invalid_timeout', // Invalid: not a number
    MONGODB_URI: '', // Invalid: empty string
  };
  const invalidResult = EnvSchema.safeParse(invalidEnv);
  assert.strictEqual(invalidResult.success, false, 'Invalid environment must fail parsing');
  if (!invalidResult.success) {
    const diagnosticReport = formatEnvDiagnostics(invalidResult.error);
    assert.ok(diagnosticReport.includes('ENVIRONMENT CONFIGURATION DIAGNOSTIC ERROR'));
    assert.ok(diagnosticReport.includes('PORT'));
    assert.ok(diagnosticReport.includes('VERTEX_TIMEOUT_MS'));
    assert.ok(diagnosticReport.includes('Remediation:'));
  }
  console.log('✓ formatEnvDiagnostics provides clear human-readable remediation guidance');

  // Test 1.3: StrictVertexEnvSchema detects missing Vertex project & engine IDs
  const missingVertexConfig = {
    PORT: 5000,
    MONGODB_URI: 'mongodb+srv://valid.uri/db',
    GCP_PROJECT_ID: '', // empty
    VERTEX_ENGINE_ID: '', // empty
  };
  const strictCheck = StrictVertexEnvSchema.safeParse(missingVertexConfig);
  assert.strictEqual(strictCheck.success, false, 'StrictVertexEnvSchema must reject empty GCP project/engine IDs');
  console.log('✓ StrictVertexEnvSchema strictly validates required Vertex parameters');

  // --------------------------------------------------------------------------
  // Group 2: Deliverable 2 - Vertex REST Endpoint & Authentication
  // --------------------------------------------------------------------------
  console.log('\n[Group 2: Vertex REST Endpoint & Authentication]');

  // Test 2.1: Target REST Endpoint URL formulation
  const service = new VertexAgentService({
    GCP_PROJECT_ID: 'acme-corp-prod',
    GCP_LOCATION: 'global',
    VERTEX_ENGINE_ID: 'acme-research-engine',
  });
  const expectedEndpoint =
    'https://global-discoveryengine.googleapis.com/v1alpha/projects/acme-corp-prod/locations/global/collections/default_collection/engines/acme-research-engine/servingConfigs/default_search:search';
  assert.strictEqual(service.getEndpointUrl(), expectedEndpoint, 'Endpoint URL must strictly match Discovery Engine REST spec');
  console.log('✓ getEndpointUrl constructs canonical Discovery Engine v1alpha Search REST endpoint');

  // Test 2.2: Dual class export alias (VertexService === VertexAgentService)
  assert.strictEqual(VertexService, VertexAgentService, 'VertexService must be an alias of VertexAgentService');
  console.log('✓ Export contract satisfies both VertexService and VertexAgentService naming');

  // Test 2.3: Authentication client injection and access token resolution
  const mockAuthClient = {
    getAccessToken: async () => 'ya29.mock_oauth2_access_token_12345',
  };
  const authenticatedService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    authClient: mockAuthClient,
  });
  const token = await authenticatedService.getAccessToken();
  assert.strictEqual(token, 'ya29.mock_oauth2_access_token_12345', 'Should resolve token via auth client');
  console.log('✓ getAccessToken resolves OAuth2 credentials cleanly');

  // --------------------------------------------------------------------------
  // Group 3: Deliverable 2 - Grounded Search Query Mechanics
  // --------------------------------------------------------------------------
  console.log('\n[Group 3: Grounded Search Query Mechanics]');

  // Test 3.1: URL Sanitization & Tracking Parameter Stripping
  const dirtyUrl1 = 'https://stripe.com/jobs/staff-eng?utm_source=linkedin&utm_medium=cpc&utm_campaign=hiring_2026&ref=career_page#heading';
  const cleanUrl1 = sanitizeSourceUrl(dirtyUrl1);
  assert.strictEqual(cleanUrl1, 'https://stripe.com/jobs/staff-eng#heading', 'Must strip tracking parameters but preserve path/clean hash');

  const dirtyUrl2 = 'https://engineering.atlassian.com/culture?fbclid=IwAR234&gclid=CjwKCAiA#utm_content=footer';
  const cleanUrl2 = sanitizeSourceUrl(dirtyUrl2);
  assert.strictEqual(cleanUrl2, 'https://engineering.atlassian.com/culture', 'Must strip fbclid, gclid, and tracking hash');

  const malformedUrl = 'not-a-valid-http-url';
  assert.strictEqual(sanitizeSourceUrl(malformedUrl), null, 'Must reject malformed URL');
  console.log('✓ sanitizeSourceUrl rigorously strips tracking parameters and validates URLs');

  // Test 3.2: Domain Extraction
  assert.strictEqual(extractDomain('https://www.netflix.com/jobs'), 'netflix.com');
  assert.strictEqual(extractDomain('http://engineering.stripe.com/blog?page=1'), 'engineering.stripe.com');
  assert.strictEqual(extractDomain('github.com'), 'github.com');
  console.log('✓ extractDomain correctly normalizes company domain hostnames');

  // Test 3.3: Search Query Execution & Request Spec
  let interceptedPayload: any = null;
  let interceptedHeaders: any = null;

  const mockSearchResponse: DiscoveryEngineSearchResponse = {
    totalSize: 2,
    results: [
      {
        id: 'doc-1',
        document: {
          id: 'doc-1',
          name: 'projects/test/locations/global/collections/default_collection/dataStores/ds/branches/0/documents/doc-1',
          derivedStructData: {
            title: 'Stripe Engineering Culture and Architecture',
            link: 'https://stripe.com/blog/engineering-culture?utm_source=twitter',
            snippets: [
              {
                snippet: 'Stripe uses Ruby, Go, and TypeScript with horizontally scaled distributed databases.',
              },
            ],
            extractive_answers: [
              {
                content: 'Stripe operates global payments infrastructure handling billions of API calls daily.',
              },
            ],
          },
        },
      },
      {
        id: 'doc-2',
        document: {
          id: 'doc-2',
          derivedStructData: {
            title: 'Stripe Interview Guide',
            link: 'https://stripe.com/jobs/interviewing?ref=jobs_portal',
            snippets: [
              {
                snippet: 'The technical assessment focuses on clean API design, distributed systems, and real-world debugging.',
              },
            ],
          },
        },
      },
    ],
    summary: {
      summaryText: 'Stripe engineering emphasizes scalable distributed systems, developer velocity, and rigorous API reliability.',
      summaryWithMetadata: {
        summary: 'Stripe engineering emphasizes scalable distributed systems, developer velocity, and rigorous API reliability.',
        references: [
          {
            title: 'Stripe Culture',
            uri: 'https://stripe.com/culture?utm_campaign=recruiting',
          },
        ],
      },
    },
  };

  const mockFetchFn: typeof fetch = async (url, options) => {
    interceptedPayload = JSON.parse(options?.body as string);
    interceptedHeaders = options?.headers;
    return new Response(JSON.stringify(mockSearchResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const activeService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    authClient: mockAuthClient,
    fetchFn: mockFetchFn,
  });

  const searchResult = await activeService.queryGroundedResearch(
    'Staff Infrastructure Engineer',
    'https://stripe.com'
  );

  // Verify outgoing request payload conforms to specifications
  assert.ok(interceptedPayload.query.includes('Staff Infrastructure Engineer'));
  assert.ok(interceptedPayload.query.includes('stripe.com'));
  assert.strictEqual(interceptedPayload.pageSize, 5, 'Page size must be 5');
  assert.strictEqual(interceptedPayload.contentSearchSpec.snippetSpec.returnSnippet, true);
  assert.strictEqual(interceptedPayload.contentSearchSpec.summaryResultSpec.summaryResultCount, 3);
  assert.strictEqual(interceptedHeaders.Authorization, 'Bearer ya29.mock_oauth2_access_token_12345');

  // Verify parsed grounded result contract
  assert.strictEqual(searchResult.isDegradedFallback, false);
  assert.ok(searchResult.summary.includes('Stripe engineering emphasizes'));
  assert.ok(searchResult.what_they_do.includes('payments infrastructure'));
  assert.ok(searchResult.sources.length >= 2, 'Should contain clean deduplicated sources');
  for (const src of searchResult.sources) {
    assert.strictEqual(src.includes('utm_'), false, 'All tracking parameters must be cleanly eliminated');
    assert.strictEqual(src.includes('ref='), false, 'Referral tracking must be stripped');
  }
  console.log('✓ queryGroundedResearch verifies search payload spec, summaries, and deduplicated citations');

  // --------------------------------------------------------------------------
  // Group 4: Deliverable 2 - Resilient Fault Handling & Timeouts
  // --------------------------------------------------------------------------
  console.log('\n[Group 4: Resilient Fault Handling & Timeouts]');

  // Test 4.1: Decorrelated Jitter Calculation
  const jitter1 = calculateDecorrelatedJitter(1, 1000, 10000, 1000);
  assert.ok(jitter1 >= 1000 && jitter1 <= 10000, `Jitter1 out of bounds: ${jitter1}`);
  const jitter2 = calculateDecorrelatedJitter(2, 1000, 10000, jitter1);
  assert.ok(jitter2 >= 1000 && jitter2 <= 10000, `Jitter2 out of bounds: ${jitter2}`);
  console.log('✓ calculateDecorrelatedJitter produces bounded, randomized backoff windows');

  // Test 4.2: Recovery on transient HTTP 429 and 503 errors
  let attemptCount = 0;
  const transientErrorFetch: typeof fetch = async () => {
    attemptCount++;
    if (attemptCount === 1) {
      return new Response(JSON.stringify({ error: { code: 429, message: 'Resource exhausted' } }), {
        status: 429,
        headers: { 'Retry-After': '1', 'Content-Type': 'application/json' },
      });
    }
    if (attemptCount === 2) {
      return new Response(JSON.stringify({ error: { code: 503, message: 'Service temporarily unavailable' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Attempt 3 succeeds
    return new Response(JSON.stringify(mockSearchResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const resilientService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    VERTEX_MAX_RETRIES: 3,
    authClient: mockAuthClient,
    fetchFn: transientErrorFetch,
  });

  const resilientResult = await resilientService.queryGroundedResearch('Staff Engineer', 'https://stripe.com');
  assert.strictEqual(attemptCount, 3, 'Must have retried through 429 and 503 before succeeding');
  assert.strictEqual(resilientResult.isDegradedFallback, false, 'Succeeded after transient retries');
  console.log('✓ VertexAgentService recovers gracefully over transient 429 and 503 responses');

  // Test 4.3: AbortController Timeout Protection
  const delayedFetch: typeof fetch = async (url, options) => {
    return new Promise((resolve, reject) => {
      const signal = options?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }
    });
  };

  const timeoutService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    VERTEX_TIMEOUT_MS: 50, // Short timeout
    VERTEX_MAX_RETRIES: 0,
    authClient: mockAuthClient,
    fetchFn: delayedFetch,
  });

  const timeoutResult = await timeoutService.queryGroundedResearch('Lead Engineer', 'https://example.com');
  assert.strictEqual(timeoutResult.isDegradedFallback, true, 'Timeout must engage honest fallback without throwing');
  assert.strictEqual(timeoutResult.summary, DEGRADED_HONEST_FALLBACK.summary);
  console.log('✓ AbortController timeout bounds long-running requests and triggers non-fatal fallback');

  // --------------------------------------------------------------------------
  // Group 5: Non-Fatal Degradation Fallback (Assessment Section 10)
  // --------------------------------------------------------------------------
  console.log('\n[Group 5: Non-Fatal Degradation Fallback (Assessment Section 10)]');

  // Test 5.1: Zero search results returned
  const emptyFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ totalSize: 0, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const emptyService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    authClient: mockAuthClient,
    fetchFn: emptyFetch,
  });

  const emptyResult = await emptyService.queryGroundedResearch('Founder', 'https://stealth-company.internal');
  assert.strictEqual(emptyResult.isDegradedFallback, true);
  assert.strictEqual(
    emptyResult.summary,
    'No verifiable public hiring or interview records were found for this company domain.'
  );
  assert.strictEqual(
    emptyResult.what_they_do,
    'Company operations could not be independently verified from public index sources.'
  );
  assert.deepStrictEqual(emptyResult.sources, []);
  console.log('✓ Zero results return canonical, un-hallucinated fallback payload');

  // Test 5.2: 404 Not Found (Unindexed domain or non-existent engine)
  const notFoundFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { code: 404, message: 'Not found' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const notFoundService = new VertexAgentService({
    GCP_PROJECT_ID: 'test-proj',
    VERTEX_ENGINE_ID: 'test-eng',
    authClient: mockAuthClient,
    fetchFn: notFoundFetch,
  });

  const notFoundResult = await notFoundService.queryGroundedResearch('DevOps Engineer', 'https://unknown-domain.xyz');
  assert.strictEqual(notFoundResult.isDegradedFallback, true);
  assert.deepStrictEqual(notFoundResult.sources, []);
  console.log('✓ 404 Not Found engages non-fatal degradation without crashing worker');

  // Test 5.3: Unconfigured environment safety
  const unconfiguredService = new VertexAgentService({
    GCP_PROJECT_ID: '',
    VERTEX_ENGINE_ID: '',
  });
  const unconfiguredResult = await unconfiguredService.queryGroundedResearch('Engineer', 'https://stripe.com');
  assert.strictEqual(unconfiguredResult.isDegradedFallback, true);
  assert.strictEqual(unconfiguredResult.summary, DEGRADED_HONEST_FALLBACK.summary);
  console.log('✓ Unconfigured service instance defaults to honest fallback gracefully');

  console.log('\n====================================================');
  console.log('    ALL VERTEX AI SEARCH & CONVERSATION TESTS PASSED!');
  console.log('====================================================\n');
}

// Allow standalone execution via `tsx tests/vertexService.test.ts`
if (process.argv[1]?.includes('vertexService.test')) {
  runVertexServiceTests().catch((err) => {
    console.error('Vertex test runner failed:', err);
    process.exit(1);
  });
}
