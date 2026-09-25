import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload, AlertCircle, Database } from 'lucide-react';
import { SyncStatus } from '../services/offlineQueue';

interface OfflineSyncBannerProps {
  syncStatus: SyncStatus;
  onSyncNow: () => void;
  toastMessage?: string | null;
  onDismissToast?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  syncStatus,
  onSyncNow,
  toastMessage,
  onDismissToast,
}) => {
  const { isOnline, pendingCount, isSyncing, lastSyncError } = syncStatus;

  // Render toast notification if present
  if (toastMessage) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 text-xs text-indigo-950 shadow-xs animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
        {onDismissToast && (
          <button
            onClick={onDismissToast}
            className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold px-2 py-0.5 rounded hover:bg-indigo-100 transition"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // If user is offline
  if (!isOnline) {
    return (
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/95 p-4 text-xs text-amber-950 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-900 shrink-0">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-amber-950">
                Offline Mode Active &mdash; Zero Data Loss Protection Enabled
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {pendingCount > 0 ? (
                  <span>
                    <strong>{pendingCount} edit{pendingCount === 1 ? '' : 's'}</strong> safely stored in local IndexedDB. Your edits will auto-synchronize to Cloud Firestore & backend once reconnected.
                  </span>
                ) : (
                  'All question modifications, custom answers, and flashcard practices are stored locally in IndexedDB.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-2 py-1 font-mono text-[10px] text-amber-900 font-semibold">
              <Database className="h-3 w-3" /> IndexedDB Active
            </span>
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If online but has pending unsynced edits
  if (pendingCount > 0) {
    return (
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 text-xs text-indigo-950 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-200 text-indigo-900 shrink-0">
              <CloudUpload className="h-4 w-4 text-indigo-700" />
            </div>
            <div>
              <p className="font-semibold text-indigo-950">
                {isSyncing
                  ? 'Synchronizing offline edits to Cloud Firestore & database...'
                  : `${pendingCount} offline edit${pendingCount === 1 ? '' : 's'} queued in IndexedDB.`}
              </p>
              <p className="text-indigo-800 text-[11px] mt-0.5">
                {lastSyncError ? (
                  <span className="text-rose-700 font-medium">Notice: {lastSyncError}</span>
                ) : (
                  'Edits created while disconnected are ready to sync to your persistent cloud storage.'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
