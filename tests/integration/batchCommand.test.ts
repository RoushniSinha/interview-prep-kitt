import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createFixtureServer } from '../../scripts/test-fixtures-server';
import { BatchOutputPayloadSchema } from '../../src/core/types';
import { KitSchema } from '../../src/validation/kitValidator';

export async function runBatchCommandIntegrationTests() {
  console.log('\n--- Running Batch CLI Evaluation Integration Tests (port 8099) ---');

  const PORT = 8099;
  const fixtureServer = createFixtureServer(PORT);

  await new Promise<void>((resolve) => {
    fixtureServer.listen(PORT, '127.0.0.1', () => {
      console.log(`[Test Server] Local fixture server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });

  const tempInputDir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(tempInputDir)) {
    fs.mkdirSync(tempInputDir, { recursive: true });
  }

  const testInputPath = path.join(tempInputDir, 'batch_cli_test_cases.json');
  const testOutputPath = path.join(tempInputDir, 'batch_cli_test_output.json');

  // Prepare input test cases
  const inputCases = [
    {
      id: 'case_nexus_handbook',
      jd: `Staff Distributed Systems Engineer.
Must have 5+ years Go or Rust systems programming.
Must have deep experience with distributed consensus algorithms (Raft, Paxos).
Nice to have Kubernetes and eBPF observability.
Core responsibility is building fault-tolerant storage engines.`,
      company_url: `http://localhost:${PORT}/engineering-handbook`,
      days: 3,
    },
    {
      id: 'case_unreachable_404',
      jd: `Backend Python Developer. Must have Django, PostgreSQL, and REST API experience.`,
      company_url: `http://localhost:${PORT}/non-existent-domain-404`,
      days: 2,
    },
  ];

  fs.writeFileSync(testInputPath, JSON.stringify(inputCases, null, 2), 'utf-8');

  try {
    console.log(`[Batch CLI Test] Invoking evaluate CLI runner on ${testInputPath}...`);

    // Execute CLI command via npm run evaluate with custom args
    const envVars = {
      ...process.env,
      ALLOW_PRIVATE_NETWORK: 'true',
      ALLOW_LOCALHOST: 'true',
    };

    const cmd = `npx tsx scripts/evaluate.ts --input "${testInputPath}" --output "${testOutputPath}"`;
    const execOutput = execSync(cmd, { env: envVars, stdio: 'pipe' }).toString();
    console.log('[Batch CLI Test] CLI Output:\n', execOutput.split('\n').slice(-5).join('\n'));

    // Verify output file exists
    assert.ok(fs.existsSync(testOutputPath), 'Evaluation output JSON file must exist');

    const rawOutput = fs.readFileSync(testOutputPath, 'utf-8');
    const parsedOutput = JSON.parse(rawOutput);

    // Appendix B Envelope Validations
    const schemaValidation = BatchOutputPayloadSchema.safeParse(parsedOutput);
    assert.strictEqual(
      schemaValidation.success,
      true,
      'Batch output must strictly conform to Appendix B BatchOutputPayload schema'
    );

    assert.strictEqual(parsedOutput.version, '1.0', 'Output payload must specify version "1.0"');
    assert.ok(parsedOutput.generated_at, 'Output payload must specify generated_at timestamp');
    assert.strictEqual(parsedOutput.kits.length, 2, 'Output payload must contain exactly 2 kits');

    // Case 1 Assertions: Handbook Live Crawl
    const case1 = parsedOutput.kits.find((k: any) => k.id === 'case_nexus_handbook');
    assert.ok(case1, 'Case 1 must be present in output');
    assert.strictEqual(case1.status, 'ok', 'Case 1 should succeed');
    assert.ok(case1.kit, 'Case 1 kit must not be null');
    assert.strictEqual(case1.kit.schedule.days.length, 3, 'Case 1 schedule must have exactly 3 days');
    assert.strictEqual(case1.kit.schedule.days_available, 3, 'Case 1 days_available must be 3');
    assert.ok(case1.kit.questions.length > 0, 'Case 1 must generate questions');
    assert.strictEqual(KitSchema.safeParse(case1.kit).success, true, 'Case 1 kit must satisfy Appendix A KitSchema');
    console.log('✓ Case 1 validated: Successfully crawled handbook fixture and generated compliant kit');

    // Case 2 Assertions: 404 Site Graceful Handling
    const case2 = parsedOutput.kits.find((k: any) => k.id === 'case_unreachable_404');
    assert.ok(case2, 'Case 2 must be present in output');
    if (case2.status === 'ok') {
      assert.ok(case2.kit, 'Case 2 kit must exist');
      assert.strictEqual(case2.kit.schedule.days.length, 2, 'Case 2 schedule must have 2 days');
      assert.strictEqual(KitSchema.safeParse(case2.kit).success, true, 'Case 2 kit must satisfy Appendix A KitSchema');
    } else {
      assert.strictEqual(case2.status, 'failed');
      assert.ok(case2.error?.message, 'Failed case must provide structured error message');
    }
    console.log('✓ Case 2 validated: 404 endpoint handled safely without crashing batch processor');

  } finally {
    // Teardown fixture server and clean up temp files
    await new Promise<void>((resolve) => {
      fixtureServer.close(() => {
        console.log('[Test Server] Fixture server closed.');
        resolve();
      });
    });

    try {
      if (fs.existsSync(testInputPath)) fs.unlinkSync(testInputPath);
      if (fs.existsSync(testOutputPath)) fs.unlinkSync(testOutputPath);
    } catch {
      // ignore cleanup errors
    }
  }

  console.log('✓ All Batch Evaluation Integration tests PASSED successfully!');
}

if (process.argv[1]?.endsWith('batchCommand.test.ts')) {
  runBatchCommandIntegrationTests();
}
