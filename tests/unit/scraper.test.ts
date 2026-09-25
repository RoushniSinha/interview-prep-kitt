import assert from 'assert';
import { isSafeUrl } from '../../src/scraper/security';

export function runScraperUnitTests() {
  console.log('\n--- Running SSRF Security & Scraper Unit Tests ---');

  const originalEnv = { ...process.env };

  try {
    // ------------------------------------------------------------------------
    // 1. Production Mode: Strict SSRF Blocking
    // ------------------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_PRIVATE_NETWORK = 'false';
    process.env.ALLOW_LOCALHOST = 'false';

    console.log('\n[1. Production SSRF Blocking Tests]');

    // Public web targets must succeed
    assert.strictEqual(isSafeUrl('https://stripe.com/jobs').safe, true, 'Public HTTPS URL must be safe');
    assert.strictEqual(isSafeUrl('http://example.com/careers').safe, true, 'Public HTTP URL must be safe');

    // Cloud metadata endpoints must be blocked
    assert.strictEqual(
      isSafeUrl('http://169.254.169.254/latest/meta-data/').safe,
      false,
      'AWS / Link-local metadata IP must be blocked'
    );
    assert.strictEqual(
      isSafeUrl('http://metadata.google.internal/computeMetadata/v1/').safe,
      false,
      'GCP metadata hostname must be blocked'
    );

    // Private IPv4 ranges must be blocked in production
    assert.strictEqual(isSafeUrl('http://10.0.0.5:8080/admin').safe, false, 'Class A private IP 10.0.0.0/8 must be blocked');
    assert.strictEqual(isSafeUrl('http://172.16.50.1/status').safe, false, 'Class B private IP 172.16.0.0/12 must be blocked');
    assert.strictEqual(isSafeUrl('http://192.168.1.100/config').safe, false, 'Class C private IP 192.168.0.0/16 must be blocked');

    // Loopback / localhost must be blocked in strict production
    assert.strictEqual(isSafeUrl('http://127.0.0.1:8080').safe, false, '127.0.0.1 must be blocked in prod');
    assert.strictEqual(isSafeUrl('http://localhost:5000').safe, false, 'localhost must be blocked in prod');
    console.log('✓ Production mode strictly blocks private IPs, cloud metadata, and loopback endpoints');

    // Reject non-http/https protocols
    assert.strictEqual(isSafeUrl('file:///etc/passwd').safe, false, 'file:// protocol must be rejected');
    assert.strictEqual(isSafeUrl('ftp://ftp.example.com').safe, false, 'ftp:// protocol must be rejected');
    assert.strictEqual(isSafeUrl('javascript:alert(1)').safe, false, 'javascript: protocol must be rejected');
    console.log('✓ Invalid protocols (file, ftp, javascript) rejected');

    // ------------------------------------------------------------------------
    // 2. Evaluation Mode: Localhost Allowed when ALLOW_PRIVATE_NETWORK=true
    // ------------------------------------------------------------------------
    console.log('\n[2. Evaluation Mode: ALLOW_PRIVATE_NETWORK=true]');
    process.env.ALLOW_PRIVATE_NETWORK = 'true';

    // Localhost fixtures for batch evaluation on port 8099
    assert.strictEqual(
      isSafeUrl('http://localhost:8099/handbook').safe,
      true,
      'localhost must be permitted when ALLOW_PRIVATE_NETWORK=true'
    );
    assert.strictEqual(
      isSafeUrl('http://127.0.0.1:8099/team').safe,
      true,
      '127.0.0.1 must be permitted when ALLOW_PRIVATE_NETWORK=true'
    );

    // Metadata endpoints MUST remain blocked even when ALLOW_PRIVATE_NETWORK=true
    assert.strictEqual(
      isSafeUrl('http://169.254.169.254/latest/meta-data').safe,
      false,
      'Cloud metadata must remain blocked even when ALLOW_PRIVATE_NETWORK=true'
    );
    assert.strictEqual(
      isSafeUrl('http://metadata.google.internal').safe,
      false,
      'GCP metadata must remain blocked even when ALLOW_PRIVATE_NETWORK=true'
    );
    console.log('✓ Localhost allowed for batch evaluation while maintaining metadata blocking');

  } finally {
    process.env = originalEnv;
  }

  console.log('✓ All SSRF Guard & Scraper unit tests PASSED successfully');
}

if (process.argv[1]?.endsWith('scraper.test.ts')) {
  runScraperUnitTests();
}
