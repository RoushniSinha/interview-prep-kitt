import React from 'react';
import { Sparkles, Terminal, FileText, Plus, Layers, User as UserIcon, LogOut, Database } from 'lucide-react';
import { useFirebase } from '../firebase';

interface HeaderProps {
  user: { id: string; email: string } | null;
  onNewKit: () => void;
  onOpenBatch: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  activeKitId?: string;
  onBackToDashboard: () => void;
  pendingEditCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNewKit,
  onOpenBatch,
  onOpenAuth,
  onLogout,
  activeKitId,
  onBackToDashboard,
  pendingEditCount = 0,
  isSyncing = false,
  onSyncNow,
}) => {
  const { user: firebaseUser, isOnline, signOut } = useFirebase();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Fallback
    }
    onLogout();
  };

  const displayEmail = firebaseUser?.email || user?.email;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2.5 text-left transition hover:opacity-85 focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <Layers className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-900">
                  Interview Prep Kit
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">v1.0</span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Multi-Step Career Orchestrator</p>
            </div>
          </button>

          {activeKitId && (
            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
              <span>/</span>
              <button
                onClick={onBackToDashboard}
                className="hover:text-slate-800 transition"
              >
                Dashboard
              </button>
              <span>/</span>
              <span className="font-mono text-slate-600">Active Prep Kit</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenBatch}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition sm:flex"
            title="Upload or evaluate multiple candidate test cases"
          >
            <Terminal className="h-3.5 w-3.5 text-slate-500" />
            <span>Batch CLI</span>
          </button>

          <button
            onClick={onNewKit}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>New Prep Kit</span>
          </button>

          {/* Firebase / Cloud Sync & IndexedDB Indicator */}
          {pendingEditCount > 0 ? (
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="Click to synchronize offline edits to Cloud Firestore"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="font-mono font-semibold">{pendingEditCount} queued</span>
            </button>
          ) : (
            <div
              className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:flex"
              title={isOnline ? 'Cloud Firestore & IndexedDB Synced' : 'Offline Mode - Edits saved locally in IndexedDB'}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="font-mono">{isOnline ? 'Cloud Sync' : 'Offline'}</span>
            </div>
          )}

          {/* User Session */}
          <div className="ml-2 flex items-center border-l border-slate-200 pl-3">
            {displayEmail ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-slate-600 lg:inline-block max-w-[140px] truncate font-mono">
                  {displayEmail}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
