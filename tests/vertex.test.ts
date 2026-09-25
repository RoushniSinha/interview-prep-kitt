import assert from 'assert';
import {
  VertexAgentService,
  VertexServiceConfigSchema,
  sanitizeSourceUrl,
  extractDomain,
  calculateDecorrelatedJitter,
  DEGRADED_HONEST_FALLBACK,
  DiscoveryEngineConverseResponse,
} from '../src/services/vertexAgentService';

export async function runVertexTests() {
  console.log('\n--- Running Vertex AI Agent Builder & Resilience Tests ---');

  // Test 1: Configuration Schema Validation
  const validConfig = {
    GCP_PROJECT_ID: 'test-project-123',
    VERTEX_ENGINE_ID: 'test-engine-456',
  };
  const parsedConfig = VertexServiceConfigSchema.safeParse(validConfig);
  assert.strictEqual(parsedConfig.success, true, 'Valid config should parse');
  if (parsedConfig.success) {
    assert.strictEqual(parsedConfig.data.GCP_LOCATION, 'global', 'Default location should be global');
    assert.strictEqual(parsedConfig.data.VERTEX_TIMEOUT_MS, 15000, 'Default timeout should be 15000');
    assert.strictEqual(parsedConfig.data.VERTEX_MAX_RETRIES, 3, 'Default max retries should be 3');
  }
  console.log('✓ VertexServiceConfigSchema enforces required keys and sensible defaults');

  // Test 2: Reject incomplete configuration
  const invalidConfig = {
    GCP_LOCATION: 'us-central1',
    // Missing GCP_PROJECT_ID and VERTEX_ENGINE_ID
  };
  const invalidParse = VertexServiceConfigSchema.safeParse(invalidConfig);
  assert.strictEqual(invalidParse.success, false, 'Incomplete config must fail validation');
  console.log('✓ VertexServiceConfigSchema rejects missing required fields');

  // Test 3: Unvalidated environment does not crash worker; returns honest degraded fallback
  const unconfiguredService = new VertexAgentService({
    GCP_PROJECT_ID: '', // intentionally invalid
    VERTEX_ENGINE_ID: '',
  });
  const fallbackResult = await unconfiguredService.queryGroundedResearch('Staff Engineer', 'https://example.com');
  assert.strictEqual(fallbackResult.isDegradedFallback, true, 'Must indicate degraded fallback');
  assert.strictEqual(fallbackResult.summary, DEGRADED_HONEST_FALLBACK.summary);
  assert.strictEqual(fallbackResult.what_they_do, DEGRADED_HONEST_FALLBACK.what_they_do);
  assert.deepStrictEqual(fallbackResult.sources, []);
  console.log('✓ Unconfigured VertexAgentService falls back gracefully without crashing worker');

  // Test 4: URL Sanitization & UTM Tracking Stripping
  const dirtyUrl = 'https://stripe.com/jobs/staff-eng?utm_source=linkedin&utm_medium=cpc&utm_campaign=hiring_2026&ref=hackernews#section';
  const cleanUrl = sanitizeSourceUrl(dirtyUrl);
  assert.strictEqual(cleanUrl, 'https://stripe.com/jobs/staff-eng#section', 'Must strip all utm and ref parameters');

  const invalidUrl = 'not-a-valid-url';
  assert.strictEqual(sanitizeSourceUrl(invalidUrl), null, 'Invalid URLs must return null');
  console.log('✓ sanitizeSourceUrl correctly strips UTMs, referral tokens, and rejects malformed URLs');

  // Test 5: Extract Domain
  assert.strictEqual(extractDomain('https://www.stripe.com/docs/api'), 'stripe.com');
  assert.strictEqual(extractDomain('stripe.com'), 'stripe.com');
  console.log('✓ extractDomain normalizes hostnames correctly');

  // Test 6: Decorrelated Jitter Calculation
  const jitter1 = calculateDecorrelatedJitter(1000, 1000, 10000);
  assert.strictEqual(jitter1 >= 1000 && jitter1 <= 10000, true, 'Jitter must be within bounds');
  console.log('✓ calculateDecorrelatedJitter produces bounded backoff durations');

  // Test 7: Successful Grounded Response & Citation Extraction Mock
  const mockSuccessPayload: DiscoveryEngineConverseResponse = {
    reply: {
      reply: `What They Do:
Stripe builds economic infrastructure for the internet, operating global payment rails, billing engines, and financial APIs in Ruby, Go, and Java.

Culture & Interview Process:
Engineering culture emphasizes deep technical rigor, collaborative code review, and high customer trust. The interview process consists of practical coding sessions, distributed systems architecture design, and values alignment rounds.`,
      summary: {
        summaryWithMetadata: {
          references: [
            {
              title: 'Stripe Engineering Overview',
              uri: 'https://stripe.com/about?utm_source=discovery_engine',
            },
            {
              title: 'Stripe Careers',
              uri: 'https://stripe.com/jobs?ref=google_search',
            },
          ],
        },
      },
    },
    searchResults: [
      {
        id: 'doc1',
        document: {
          derivedStructData: {
            link: 'https://stripe.com/blog/infrastructure',
          },
        },
      },
    ],
  };

  let attemptsCount = 0;
  const mockFetch: typeof fetch = async () => {
    attemptsCount++;
    return new Response(JSON.stringify(mockSuccessPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const service = new VertexAgentService({
    GCP_PROJECT_ID: 'mock-proj',
    VERTEX_ENGINE_ID: 'mock-engine',
    VERTEX_MAX_RETRIES: 2,
    VERTEX_TIMEOUT_MS: 5000,
    fetchFn: mockFetch,
    endpointUrlOverride: 'https://mock.discoveryengine.googleapis.com/converse',
  });

  const groundedResult = await service.queryGroundedResearch('Staff Infrastructure Engineer', 'https://stripe.com');
  assert.strictEqual(groundedResult.isDegradedFallback, false, 'Must be a successful grounded result');
  assert.strictEqual(attemptsCount, 1, 'Should succeed on first attempt');
  assert.strictEqual(groundedResult.what_they_do.includes('economic infrastructure'), true);
  assert.strictEqual(groundedResult.summary.includes('Engineering culture emphasizes'), true);
  assert.strictEqual(groundedResult.sources.includes('https://stripe.com/about'), true, 'Must include clean citation');
  assert.strictEqual(groundedResult.sources.includes('https://stripe.com/jobs'), true, 'Must include clean citation');
  assert.strictEqual(groundedResult.sources.includes('https://stripe.com/blog/infrastructure'), true);
  console.log('✓ VertexAgentService correctly parses Converse response and extracts clean citations');

  // Test 8: Circuit Breaking & Retry on 429 / 503 with Retry-After header
  let retryAttempts = 0;
  const mockRetryFetch: typeof fetch = async () => {
    retryAttempts++;
    if (retryAttempts === 1) {
      return new Response('Rate limited', {
        status: 429,
        headers: { 'Retry-After': '0' },
      });
    }
    if (retryAttempts === 2) {
      return new Response('Service Unavailable', {
        status: 503,
      });
    }
    return new Response(JSON.stringify(mockSuccessPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const retryingService = new VertexAgentService({
    GCP_PROJECT_ID: 'mock-proj',
    VERTEX_ENGINE_ID: 'mock-engine',
    VERTEX_MAX_RETRIES: 3,
    VERTEX_TIMEOUT_MS: 5000,
    fetchFn: mockRetryFetch,
    endpointUrlOverride: 'https://mock.discoveryengine.googleapis.com/converse',
  });

  const retryResult = await retryingService.queryGroundedResearch('Staff Infrastructure Engineer', 'https://stripe.com');
  assert.strictEqual(retryResult.isDegradedFallback, false);
  assert.strictEqual(retryAttempts, 3, 'Must have retried through 429 and 503 to succeed on attempt 3');
  console.log('✓ VertexAgentService recovers via Exponential Backoff on 429 and 503');

  // Test 9: Zero Search Results -> Returns Honest Degraded Fallback
  const mockZeroHitsPayload: DiscoveryEngineConverseResponse = {
    reply: {
      reply: '',
    },
    searchResults: [],
  };

  const zeroHitService = new VertexAgentService({
    GCP_PROJECT_ID: 'mock-proj',
    VERTEX_ENGINE_ID: 'mock-engine',
    fetchFn: async () => new Response(JSON.stringify(mockZeroHitsPayload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    endpointUrlOverride: 'https://mock.discoveryengine.googleapis.com/converse',
  });

  const zeroHitResult = await zeroHitService.queryGroundedResearch('Lead Engineer', 'https://obscure-stealth-startup.example');
  assert.strictEqual(zeroHitResult.isDegradedFallback, true, 'Zero search hits must trigger honest degraded fallback');
  assert.strictEqual(zeroHitResult.summary, DEGRADED_HONEST_FALLBACK.summary);
  console.log('✓ VertexAgentService returns unhallucinated fallback on zero search results');
}
