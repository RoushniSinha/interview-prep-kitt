import { runDeterministicTests } from './deterministic.test';
import { runDraftStateTests } from './draftState.test';
import { runStructureTests } from './structure.test';
import { runPersistenceTests } from './persistence.test';
import { runVertexTests } from './vertex.test';
import { runVertexServiceTests } from './vertexService.test';
import { runSchemaTests } from './unit/schema.test';
import { runDeterministicUnitTests } from './unit/deterministic.test';
import { runReconcileUnitTests } from './unit/reconcile.test';
import { runScraperUnitTests } from './unit/scraper.test';
import { runPdfExportTests } from './unit/pdfExport.test';
import { runOfflineQueueTests } from './offlineQueue.test';
import { runBatchCommandIntegrationTests } from './integration/batchCommand.test';
import { runBatchTests } from './batch.test';

async function main() {
  console.log('====================================================');
  console.log('       INTERVIEW PREP KIT — TEST SUITE RUNNER       ');
  console.log('====================================================');

  try {
    // 1. Deliverable 5: Core Unit Tests
    runSchemaTests();
    runDeterministicUnitTests();
    runReconcileUnitTests();
    runScraperUnitTests();
    runPdfExportTests();
    await runOfflineQueueTests();

    // 2. Deterministic & Persistence Regression Tests
    runDeterministicTests();
    runDraftStateTests();
    runStructureTests();
    runPersistenceTests();

    // 3. Vertex AI Discovery Engine & Resilience Tests
    await runVertexTests();
    await runVertexServiceTests();

    // 4. Batch CLI & LLM Integration Tests (enabled when RUN_BATCH_TESTS=true)
    if (process.env.GEMINI_API_KEY && process.env.RUN_BATCH_TESTS === 'true') {
      await runBatchCommandIntegrationTests();
      await runBatchTests();
    } else {
      console.log('\n[Note] Set RUN_BATCH_TESTS=true with GEMINI_API_KEY to run end-to-end LLM batch tests.');
    }

    console.log('\n====================================================');
    console.log('       ALL REQUIRED UNIT & DOMAIN TESTS PASSED!     ');
    console.log('====================================================\n');
  } catch (err: unknown) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  }
}

main();
