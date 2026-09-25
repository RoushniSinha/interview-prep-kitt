/**
 * Unit & Integration Tests for Offline Queue (IndexedDB)
 *
 * Verifies:
 * 1. IndexedDB database initialization and store creation
 * 2. Enqueuing pending edits while disconnected
 * 3. FIFO order & coalescing edits for the same kit
 * 4. Local offline kit caching and instant retrieval
 * 5. Multi-target synchronization to Cloud Firestore & backend (MongoDB/Disk)
 * 6. Resilient retry on network errors (zero data loss guarantee)
 */

import 'fake-indexeddb/auto';
import {
  openIndexedDB,
  enqueuePendingEdit,
  getPendingEdits,
  getPendingCount,
  removePendingEdit,
  clearAllPendingEdits,
  cacheKitInIndexedDB,
  getCachedKitsFromIndexedDB,
  getCachedKitFromIndexedDB,
  syncOfflineQueue,
  subscribeToSyncStatus,
  SyncStatus,
} from '../src/services/offlineQueue';
import { Kit, StoredKit } from '../src/core/types';

// Mock minimal valid Kit conforming to Appendix A
function createMockKit(company = 'Acme Corp', role = 'Staff Engineer'): Kit {
  return {
    source: {
      company,
      company_url: 'https://acme.example.com',
      role,
      location: 'San Francisco, CA',
      jd_chars: 1200,
      researched_at: new Date().toISOString(),
      pages_used: ['https://acme.example.com/about'],
    },
    company_brief: {
      summary: 'Acme provides autonomous infrastructure.',
      what_they_do: 'Global platform operations.',
      sources: ['https://acme.example.com/about'],
    },
    role: {
      title: role,
      seniority: 'Staff',
      responsibilities: ['Architect scalable systems', 'Mentor junior engineers'],
      requirements: [
        { id: 'req_1', text: 'Distributed systems expertise', kind: 'technical', priority: 'must' },
        { id: 'req_2', text: 'Cross-functional leadership', kind: 'behavioural', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q_1',
        prompt: 'How do you design a high-throughput event log?',
        category: 'technical',
        requirement_ids: ['req_1'],
        answer_outline: 'Partitioning strategies, compaction, leader election',
        difficulty: 3,
        isEdited: true,
      },
      {
        id: 'q_2',
        prompt: 'Tell me about a complex migration you spearheaded.',
        category: 'behavioural',
        requirement_ids: ['req_2'],
        answer_outline: 'Situation & stakes, risk mitigation, business impact',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'fc_1',
        front: 'What is Raft log compaction?',
        back: 'Snapshotting state machine data to truncate log length.',
        requirement_ids: ['req_1'],
        confidence: 'medium',
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'System Architecture', question_ids: ['q_1'], minutes: 45 },
        { day: 2, focus: 'Leadership', question_ids: ['q_2'], minutes: 30 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 Starting Offline Queue (IndexedDB) Test Suite');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err?.message || err}`);
      failed++;
    }
  }

  // 1. IndexedDB Open Test
  await test('1. IndexedDB initializes stores cleanly', async () => {
    const db = await openIndexedDB();
    if (!db.objectStoreNames.contains('pending_edits')) {
      throw new Error('Missing pending_edits object store');
    }
    if (!db.objectStoreNames.contains('cached_kits')) {
      throw new Error('Missing cached_kits object store');
    }
  });

  // 2. Enqueue pending edits
  await test('2. Enqueues a pending edit when disconnected', async () => {
    await clearAllPendingEdits();
    const mockKit = createMockKit();
    const kitId = 'kit_test_101';

    const edit = await enqueuePendingEdit({
      kitId,
      userId: 'usr_test_1',
      action: 'edit',
      entityId: 'q_1',
      kit: mockKit,
    });

    if (!edit.id || edit.kitId !== kitId) {
      throw new Error('Failed to generate valid pending edit record');
    }

    const count = await getPendingCount();
    if (count !== 1) {
      throw new Error(`Expected count 1, got ${count}`);
    }

    const edits = await getPendingEdits();
    if (edits.length !== 1 || edits[0].entityId !== 'q_1') {
      throw new Error('Stored edit does not match enqueued payload');
    }
  });

  // 3. Coalescing edits for the same kit
  await test('3. Coalesces subsequent edits for the same kit snapshot', async () => {
    const kitId = 'kit_test_101';
    const updatedKit = createMockKit();
    updatedKit.questions[0].prompt = 'Updated prompt offline';

    await enqueuePendingEdit({
      kitId,
      userId: 'usr_test_1',
      action: 'edit',
      entityId: 'q_1',
      kit: updatedKit,
    });

    const count = await getPendingCount();
    if (count !== 1) {
      throw new Error(`Expected coalesced count 1, got ${count}`);
    }

    const edits = await getPendingEdits();
    if (edits[0].kit.questions[0].prompt !== 'Updated prompt offline') {
      throw new Error('Coalesced edit did not update to latest snapshot');
    }
  });

  // 4. Offline Kit Cache
  await test('4. Caches and retrieves kit locally in IndexedDB', async () => {
    const mockKit = createMockKit('CloudCorp', 'Principal Architect');
    const storedKit: StoredKit = {
      _id: 'kit_cloudcorp_99',
      id: 'kit_cloudcorp_99',
      userId: 'usr_test_1',
      status: 'ready',
      source: {
        company: mockKit.source.company,
        company_url: mockKit.source.company_url,
        role: mockKit.source.role,
        days: 3,
        jd: 'Architect distributed fault-tolerant systems...',
      },
      kit: mockKit,
      draftState: { items: {}, tombstones: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await cacheKitInIndexedDB(storedKit);

    const retrieved = await getCachedKitFromIndexedDB('kit_cloudcorp_99');
    if (!retrieved || retrieved._id !== 'kit_cloudcorp_99') {
      throw new Error('Failed to retrieve cached kit from IndexedDB');
    }
    if (retrieved.kit?.source.company !== 'CloudCorp') {
      throw new Error('Retrieved cached kit contents mismatch');
    }

    const all = await getCachedKitsFromIndexedDB();
    if (!all.some((k) => k._id === 'kit_cloudcorp_99')) {
      throw new Error('Bulk getCachedKitsFromIndexedDB did not find kit');
    }
  });

  // 5. Synchronization Engine (Success Path)
  await test('5. Synchronizes pending edits to Firestore & Backend handlers', async () => {
    let firestoreSynced = false;
    let apiSynced = false;

    const res = await syncOfflineQueue({
      force: true,
      syncFirestore: async (kitData, kitId) => {
        if (kitId === 'kit_test_101' && kitData.questions.length > 0) {
          firestoreSynced = true;
        }
      },
      syncApi: async (kitId, kitData, action, entityId) => {
        if (kitId === 'kit_test_101') {
          apiSynced = true;
        }
      },
    });

    if (res.success !== 1 || res.failed !== 0) {
      throw new Error(`Expected 1 success, got ${JSON.stringify(res)}`);
    }

    if (!firestoreSynced) {
      throw new Error('Firestore sync handler was not called');
    }
    if (!apiSynced) {
      throw new Error('API sync handler was not called');
    }

    // Queue should now be empty
    const remaining = await getPendingCount();
    if (remaining !== 0) {
      throw new Error(`Queue should be empty after sync, found ${remaining}`);
    }
  });

  // 6. Resilient Error Handling (Network Interruption during sync)
  await test('6. Keeps item in queue if sync handler throws network error', async () => {
    const mockKit = createMockKit();
    await enqueuePendingEdit({
      kitId: 'kit_retry_55',
      action: 'add_custom',
      kit: mockKit,
    });

    const res = await syncOfflineQueue({
      force: true,
      syncFirestore: async () => {
        throw new Error('Network timeout: Failed to connect to Cloud Firestore');
      },
    });

    if (res.failed !== 1 || res.success !== 0) {
      throw new Error(`Expected 1 failure, got ${JSON.stringify(res)}`);
    }

    // Item must remain in queue so zero data is lost
    const remaining = await getPendingCount();
    if (remaining !== 1) {
      throw new Error(`Item was incorrectly removed after failure! Remaining: ${remaining}`);
    }

    const edits = await getPendingEdits();
    if (edits[0].attempts !== 1) {
      throw new Error(`Attempt count should be 1, got ${edits[0].attempts}`);
    }

    // Clean up
    await clearAllPendingEdits();
  });

  console.log('\n--------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('--------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`${failed} offline queue tests failed.`);
  }
}

export const runOfflineQueueTests = runTests;

if (process.argv[1]?.includes('offlineQueue.test')) {
  runTests().catch((err) => {
    console.error('Test runner encountered an unhandled exception:', err);
    process.exit(1);
  });
}
