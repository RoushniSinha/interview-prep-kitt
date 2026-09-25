import assert from 'assert';
import http from 'http';
import { createFixtureServer } from '../scripts/test-fixtures-server';
import { runPipelineForCase } from '../src/core/pipeline';
import { BatchCase, KitSchema } from '../src/core/types';

export async function runBatchTests() {
  console.log('\n--- Running Batch & Edge-Case Fixture Tests (5 Cases) ---');

  // Allow localhost for test fixture server
  process.env.ALLOW_LOCALHOST = 'true';

  const PORT = 8099;
  const fixtureServer = createFixtureServer(PORT);

  await new Promise<void>((resolve) => {
    fixtureServer.listen(PORT, '127.0.0.1', () => {
      console.log(`[Test Fixture] Server online on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });

  const testCases: BatchCase[] = [
    // Case 1: Standard Full-Stack Role with live fixture crawler
    {
      id: 'case_1_fullstack',
      jd: `Staff Full-Stack Engineer at Nexus Cloud.
Must have minimum 5 years TypeScript and React experience.
Must have deep experience designing distributed REST and GraphQL APIs.
Nice to have experience with Kubernetes container orchestration and Terraform.
Responsibilities include mentoring junior engineers and leading system architecture.`,
      company_url: `http://127.0.0.1:${PORT}`,
      days: 5,
    },
    // Case 2: Senior Systems Engineer
    {
      id: 'case_2_systems',
      jd: `Principal Systems Engineer.
Required: Go or Rust systems programming, Linux kernel tuning, high-throughput network services.
Preferred: Experience with eBPF and distributed consensus (Raft/Paxos).`,
      company_url: `http://127.0.0.1:${PORT}`,
      days: 3,
    },
    // Case 3: Thin 2-line JD (honest minimal extraction without hallucination)
    {
      id: 'case_3_thin_jd',
      jd: `Looking for a Python Developer. Must know Django.`,
      company_url: '',
      days: 2,
    },
    // Case 4: No hiring page discoverable
    {
      id: 'case_4_no_hiring_page',
      jd: `Frontend Engineer with React and Tailwind CSS expertise. Must have accessible design knowledge.`,
      company_url: `http://127.0.0.1:${PORT}/no-hiring-site`,
      days: 4,
    },
    // Case 5: Unreachable URL (404/invalid) -> honest brief with pages_used: []
    {
      id: 'case_5_unreachable_site',
      jd: `Data Engineer. Required: Apache Spark, SQL, and data warehouse modeling. Bonus: Snowflake.`,
      company_url: `http://127.0.0.1:${PORT}/non-existent-page-404`,
      days: 7,
    },
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const c = testCases[i];
    console.log(`\nTesting Case ${i + 1}/5: ${c.id}`);
    const startTime = Date.now();

    const kit = await runPipelineForCase(c.jd, c.company_url, c.days, (stage, pct, msg) => {
      // quiet log
    });

    const elapsed = Date.now() - startTime;
    console.log(`  Completed in ${elapsed}ms. Status: OK.`);

    // Strict assertions on result
    assert.strictEqual(KitSchema.safeParse(kit).success, true, `Kit for ${c.id} must be schema valid`);
    assert.strictEqual(kit.schedule.days.length, c.days, `Schedule must have exactly ${c.days} days`);
    assert.ok(kit.questions.length > 0, 'Must generate questions');
    assert.ok(kit.role.requirements.length > 0, 'Must extract requirements');

    // Case specific checks
    if (c.id === 'case_3_thin_jd') {
      // Must not invent 20 requirements from a 2-line JD
      assert.ok(kit.role.requirements.length <= 4, 'Thin JD must not produce hallucinated excess requirements');
    }

    if (c.id === 'case_5_unreachable_site') {
      // Must produce kit with honest brief despite unreachable URL
      assert.ok(kit.company_brief.summary.length > 0, 'Brief must be present even when URL fails');
    }

    results.push(kit);
  }

  // Close fixture server
  await new Promise<void>((resolve) => {
    fixtureServer.close(() => resolve());
  });

  console.log(`\n✓ All 5 batch cases successfully validated against Appendix A schemas and operational rules!`);
}
