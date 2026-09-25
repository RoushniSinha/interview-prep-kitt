/**
 * Offline Queue & IndexedDB Persistence Service
 *
 * Implements an IndexedDB-backed offline queue for capturing candidate edits
 * (question modifications, custom additions, pins, company notes, flashcards)
 * during network dropouts or offline sessions.
 *
 * Automatically synchronizes queued mutations to Cloud Firestore and the backend API
 * (which updates disk storage & MongoDB) once connectivity is restored.
 */

import { Kit, StoredKit } from '../core/types';

export interface PendingEdit {
  id: string;
  kitId: string;
  userId?: string;
  timestamp: number;
  action: string;
  entityId?: string;
  kit: Kit;
  attempts: number;
  lastAttempt?: number;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTimestamp: number | null;
  lastSyncError: string | null;
}

const DB_NAME = 'interview_prep_offline_db';
const DB_VERSION = 1;
const STORE_PENDING_EDITS = 'pending_edits';
const STORE_CACHED_KITS = 'cached_kits';
const STORE_SYNC_META = 'sync_meta';

export function isBrowserOnline(): boolean {
  if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
    return typeof window.navigator.onLine === 'boolean' ? window.navigator.onLine : true;
  }
  return true;
}

// In-memory status state & subscriber set
let currentStatus: SyncStatus = {
  isOnline: isBrowserOnline(),
  pendingCount: 0,
  isSyncing: false,
  lastSyncTimestamp: null,
  lastSyncError: null,
};

const subscribers = new Set<(status: SyncStatus) => void>();

function notifySubscribers() {
  const statusSnapshot = { ...currentStatus };
  subscribers.forEach((sub) => {
    try {
      sub(statusSnapshot);
    } catch (err) {
      console.error('[OfflineQueue] Subscriber notification error:', err);
    }
  });
}

function updateStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifySubscribers();
}

/**
 * Resolves IndexedDB implementation across browser, workers, or Node test environments.
 */
function getIDBFactory(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB) {
    return (globalThis as any).indexedDB;
  }
  return null;
}

/**
 * Initializes and opens the IndexedDB database.
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getIDBFactory();
    if (!idb) {
      reject(new Error('IndexedDB is not supported in this runtime environment.'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;

      // 1. Pending edits queue store
      if (!db.objectStoreNames.contains(STORE_PENDING_EDITS)) {
        const editsStore = db.createObjectStore(STORE_PENDING_EDITS, { keyPath: 'id' });
        editsStore.createIndex('kitId', 'kitId', { unique: false });
        editsStore.createIndex('timestamp', 'timestamp', { unique: false });
        editsStore.createIndex('status', 'status', { unique: false });
      }

      // 2. Offline cached kits store
      if (!db.objectStoreNames.contains(STORE_CACHED_KITS)) {
        const kitsStore = db.createObjectStore(STORE_CACHED_KITS, { keyPath: '_id' });
        kitsStore.createIndex('userId', 'userId', { unique: false });
        kitsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 3. Metadata store (e.g. sync metrics)
      if (!db.objectStoreNames.contains(STORE_SYNC_META)) {
        db.createObjectStore(STORE_SYNC_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn('[OfflineQueue] IndexedDB upgrade blocked by an open connection.');
    };
  });
}

/**
 * Retrieves the count of queued pending edits.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_EDITS, 'readonly');
      const store = tx.objectStore(STORE_PENDING_EDITS);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result || 0;
        updateStatus({ pendingCount: count });
        resolve(count);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Error getting pending count:', err);
    return 0;
  }
}

/**
 * Enqueues a pending edit mutation in IndexedDB.
 * Coalesces with existing pending edits for the same kit to maintain a pristine latest snapshot.
 */
export async function enqueuePendingEdit(params: {
  kitId: string;
  userId?: string;
  action?: string;
  entityId?: string;
  kit: Kit;
}): Promise<PendingEdit> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PENDING_EDITS, STORE_CACHED_KITS], 'readwrite');
    const editsStore = tx.objectStore(STORE_PENDING_EDITS);
    const kitsStore = tx.objectStore(STORE_CACHED_KITS);

    const kitIdIndex = editsStore.index('kitId');
    const existingReq = kitIdIndex.getAll(params.kitId);

    existingReq.onsuccess = () => {
      const existingItems: PendingEdit[] = existingReq.result || [];
      const pendingItem = existingItems.find((item) => item.status === 'pending');

      const editRecord: PendingEdit = {
        id: pendingItem ? pendingItem.id : `edit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        kitId: params.kitId,
        userId: params.userId || 'usr_anonymous',
        timestamp: Date.now(),
        action: params.action || 'edit',
        entityId: params.entityId || pendingItem?.entityId,
        kit: params.kit,
        attempts: pendingItem ? pendingItem.attempts : 0,
        status: 'pending',
      };

      editsStore.put(editRecord);

      // Also update local cached kit representation for immediate offline retrieval
      const cachedKitReq = kitsStore.get(params.kitId);
      cachedKitReq.onsuccess = () => {
        const existingKitRecord: StoredKit | undefined = cachedKitReq.result;
        if (existingKitRecord) {
          const updatedCached: StoredKit = {
            ...existingKitRecord,
            kit: params.kit,
            updatedAt: new Date().toISOString(),
          };
          kitsStore.put(updatedCached);
        }
      };

      tx.oncomplete = async () => {
        const count = await getPendingCount();
        updateStatus({ pendingCount: count, lastSyncError: null });
        console.log(`[OfflineQueue] Enqueued edit for kit ${params.kitId} (pending items: ${count}).`);
        resolve(editRecord);
      };

      tx.onerror = () => reject(tx.error || new Error('Transaction failed while enqueuing edit.'));
    };

    existingReq.onerror = () => reject(existingReq.error);
  });
}

/**
 * Retrieves all pending edits from IndexedDB sorted chronologically (FIFO).
 */
export async function getPendingEdits(): Promise<PendingEdit[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_EDITS, 'readonly');
      const store = tx.objectStore(STORE_PENDING_EDITS);
      const req = store.getAll();

      req.onsuccess = () => {
        const edits: PendingEdit[] = req.result || [];
        // Sort FIFO by timestamp
        edits.sort((a, b) => a.timestamp - b.timestamp);
        updateStatus({ pendingCount: edits.length });
        resolve(edits);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Error reading pending edits:', err);
    return [];
  }
}

/**
 * Removes a successfully synchronized edit from the queue.
 */
export async function removePendingEdit(id: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_EDITS, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_EDITS);
    const req = store.delete(id);

    req.onsuccess = async () => {
      const count = await getPendingCount();
      updateStatus({ pendingCount: count });
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Updates a pending edit's status and attempt count.
 */
export async function updatePendingEditStatus(
  id: string,
  status: 'pending' | 'syncing' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_EDITS, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_EDITS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const edit: PendingEdit | undefined = getReq.result;
      if (edit) {
        edit.status = status;
        edit.lastAttempt = Date.now();
        if (status === 'failed') {
          edit.attempts = (edit.attempts || 0) + 1;
          edit.errorMessage = errorMessage;
        }
        store.put(edit);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Clears all pending edits from the queue.
 */
export async function clearAllPendingEdits(): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_EDITS, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_EDITS);
    const req = store.clear();

    req.onsuccess = () => {
      updateStatus({ pendingCount: 0, lastSyncError: null });
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// Offline Kit Cache Functions
// ==========================================

/**
 * Caches a StoredKit document into IndexedDB for zero-latency offline access.
 */
export async function cacheKitInIndexedDB(kit: StoredKit): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHED_KITS, 'readwrite');
      const store = tx.objectStore(STORE_CACHED_KITS);
      const req = store.put({
        ...kit,
        _id: kit._id || (kit as any).id,
        id: kit._id || (kit as any).id,
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Failed to cache kit in IndexedDB:', err);
  }
}

/**
 * Caches multiple kits in bulk into IndexedDB.
 */
export async function cacheKitsInIndexedDB(kits: StoredKit[]): Promise<void> {
  if (!kits || kits.length === 0) return;
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHED_KITS, 'readwrite');
      const store = tx.objectStore(STORE_CACHED_KITS);

      kits.forEach((k) => {
        store.put({
          ...k,
          _id: k._id || (k as any).id,
          id: k._id || (k as any).id,
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Failed to bulk cache kits in IndexedDB:', err);
  }
}

/**
 * Retrieves all cached kits from IndexedDB when offline.
 */
export async function getCachedKitsFromIndexedDB(): Promise<StoredKit[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHED_KITS, 'readonly');
      const store = tx.objectStore(STORE_CACHED_KITS);
      const req = store.getAll();

      req.onsuccess = () => {
        const kits: StoredKit[] = req.result || [];
        resolve(kits);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Failed to read cached kits from IndexedDB:', err);
    return [];
  }
}

/**
 * Retrieves a single cached kit from IndexedDB by ID.
 */
export async function getCachedKitFromIndexedDB(kitId: string): Promise<StoredKit | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHED_KITS, 'readonly');
      const store = tx.objectStore(STORE_CACHED_KITS);
      const req = store.get(kitId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[OfflineQueue] Failed to read kit ${kitId} from IndexedDB:`, err);
    return null;
  }
}

// ==========================================
// Synchronization Engine
// ==========================================

export interface SyncHandlers {
  syncFirestore?: (kit: Kit, kitId: string) => Promise<any>;
  syncApi?: (kitId: string, kit: Kit, action?: string, entityId?: string) => Promise<any>;
  onProgress?: (synced: number, total: number) => void;
  force?: boolean;
}

/**
 * Flushes and synchronizes the offline queue to Cloud Firestore and the Backend API.
 */
export async function syncOfflineQueue(
  handlers: SyncHandlers = {}
): Promise<{ success: number; failed: number; total: number; message: string }> {
  const isOnline = handlers.force !== undefined ? handlers.force : isBrowserOnline();
  updateStatus({ isOnline });

  if (!isOnline) {
    return {
      success: 0,
      failed: 0,
      total: currentStatus.pendingCount,
      message: 'Network is currently offline. Synchronizations deferred.',
    };
  }

  if (currentStatus.isSyncing) {
    return {
      success: 0,
      failed: 0,
      total: currentStatus.pendingCount,
      message: 'Synchronization already in progress.',
    };
  }

  updateStatus({ isSyncing: true, lastSyncError: null });

  try {
    const pendingEdits = await getPendingEdits();
    if (pendingEdits.length === 0) {
      updateStatus({ isSyncing: false, pendingCount: 0 });
      return { success: 0, failed: 0, total: 0, message: 'Queue is empty.' };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const edit of pendingEdits) {
      await updatePendingEditStatus(edit.id, 'syncing');

      try {
        const promises: Promise<any>[] = [];

        // 1. Sync to Cloud Firestore if handler provided
        if (handlers.syncFirestore) {
          promises.push(handlers.syncFirestore(edit.kit, edit.kitId));
        }

        // 2. Sync to Backend API (which updates disk JSON and MongoDB)
        if (handlers.syncApi) {
          promises.push(handlers.syncApi(edit.kitId, edit.kit, edit.action, edit.entityId));
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }

        // If synchronization succeeded, remove from queue
        await removePendingEdit(edit.id);
        successCount++;

        if (handlers.onProgress) {
          handlers.onProgress(successCount, pendingEdits.length);
        }
      } catch (err: any) {
        console.error(`[OfflineQueue] Error syncing edit ${edit.id}:`, err);
        failedCount++;
        await updatePendingEditStatus(edit.id, 'failed', err?.message || 'Sync failed');

        // If network was severed mid-sync, pause queue execution
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          updateStatus({ isOnline: false, lastSyncError: 'Network disconnected during synchronization.' });
          break;
        }
      }
    }

    const remainingCount = await getPendingCount();
    updateStatus({
      isSyncing: false,
      pendingCount: remainingCount,
      lastSyncTimestamp: Date.now(),
      lastSyncError: failedCount > 0 ? `${failedCount} items could not be synchronized.` : null,
    });

    return {
      success: successCount,
      failed: failedCount,
      total: pendingEdits.length,
      message: `Synchronized ${successCount} of ${pendingEdits.length} edits.`,
    };
  } catch (err: any) {
    console.error('[OfflineQueue] Fatal synchronization loop error:', err);
    updateStatus({ isSyncing: false, lastSyncError: err?.message || 'Synchronization failed.' });
    return {
      success: 0,
      failed: 1,
      total: currentStatus.pendingCount,
      message: err?.message || 'Synchronization failed.',
    };
  }
}

/**
 * Subscribes to real-time sync status updates.
 */
export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  subscribers.add(listener);
  // Emit immediate current status snapshot
  listener({ ...currentStatus });

  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Returns the current synchronous snapshot of sync status.
 */
export function getSyncStatusSnapshot(): SyncStatus {
  return { ...currentStatus };
}

/**
 * Sets up automatic synchronization triggers on 'online' network events and periodic heartbeat.
 */
export function setupAutoSync(getHandlers: () => SyncHandlers): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check initial count
  getPendingCount();

  const handleOnline = async () => {
    console.log('[OfflineQueue] Network reconnected. Triggering auto-sync...');
    updateStatus({ isOnline: true });
    const handlers = getHandlers();
    await syncOfflineQueue(handlers);
  };

  const handleOffline = () => {
    console.log('[OfflineQueue] Network disconnected. Switched to offline queue mode.');
    updateStatus({ isOnline: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic heartbeat: sync every 25 seconds if online and there are pending edits
  const intervalId = setInterval(async () => {
    if (navigator.onLine && !currentStatus.isSyncing) {
      const count = await getPendingCount();
      if (count > 0) {
        console.log(`[OfflineQueue] Heartbeat detected ${count} pending edits. Syncing...`);
        const handlers = getHandlers();
        await syncOfflineQueue(handlers);
      }
    }
  }, 25000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}
