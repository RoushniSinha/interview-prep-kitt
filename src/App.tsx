import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Kit, StoredKit, Question, Flashcard } from './core/types';
import { Header } from './components/Header';
import { NewKitModal } from './components/NewKitModal';
import { BatchModal } from './components/BatchModal';
import { AuthModal } from './components/AuthModal';
import { ProgressStepper } from './components/ProgressStepper';
import { CompanyBriefSection } from './components/CompanyBriefSection';
import { RequirementsSection } from './components/RequirementsSection';
import { QuestionsSection } from './components/QuestionsSection';
import { ScheduleSection } from './components/ScheduleSection';
import { FlashcardsSection } from './components/FlashcardsSection';
import { PracticeArena } from './components/PracticeArena';
import { CoverageSection } from './components/CoverageSection';
import { MockInterviewSection } from './components/MockInterviewSection';
import { WeakSpotsSection } from './components/WeakSpotsSection';
import { InterviewDayChecklist } from './components/InterviewDayChecklist';
import { ResourceVaultSection } from './components/ResourceVaultSection';
import { SalaryNegotiationSimulator } from './components/SalaryNegotiationSimulator';
import { DailyPracticeStreak } from './components/DailyPracticeStreak';
import { ExportPdfModal } from './components/ExportPdfModal';
import { DynamicVibrantBackground } from './components/DynamicVibrantBackground';
import { PracticeStats } from './core/practice';
import { useFirebase, saveKitToFirestore, deleteKitFromFirestore, subscribeToUserKits } from './firebase';
import {
  enqueuePendingEdit,
  syncOfflineQueue,
  setupAutoSync,
  subscribeToSyncStatus,
  cacheKitInIndexedDB,
  cacheKitsInIndexedDB,
  getCachedKitsFromIndexedDB,
  SyncStatus,
} from './services/offlineQueue';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';

export default function App() {
  const { user: firebaseUser } = useFirebase();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('prep_token') || 'demo_session_token'
  );
  const [kits, setKits] = useState<StoredKit[]>([]);
  const [activeKitId, setActiveKitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'requirements'
    | 'questions'
    | 'flashcards'
    | 'schedule'
    | 'coverage'
    | 'mock_interview'
    | 'weak_spots'
    | 'checklist'
    | 'resources'
    | 'salary_negotiation'
  >('overview');

  // Offline Queue & Synchronization State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncTimestamp: null,
    lastSyncError: null,
  });
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Modals
  const [isNewKitOpen, setIsNewKitOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPracticeArenaOpen, setIsPracticeArenaOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Loading states
  const [isLoadingKits, setIsLoadingKits] = useState(false);
  const [isSubmittingNewKit, setIsSubmittingNewKit] = useState(false);
  const [isRegeneratingSection, setIsRegeneratingSection] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const [practiceStats, setPracticeStats] = useState<PracticeStats | null>(null);

  // Headers helper with auth token
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  // Synchronize Firebase Auth user state
  useEffect(() => {
    if (firebaseUser) {
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || 'candidate@interviewkit.io',
      });
      firebaseUser.getIdToken().then((t) => setToken(t)).catch(() => {});
    }
  }, [firebaseUser]);

  // Real-time Firestore sync when authenticated with Firebase
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeToUserKits(firebaseUser.uid, (firestoreKits) => {
      if (firestoreKits.length > 0) {
        setKits((prev) => {
          const map = new Map<string, StoredKit>();
          firestoreKits.forEach((k) => map.set(k.id || k._id, k));
          prev.forEach((k) => {
            const key = k.id || k._id;
            if (!map.has(key)) map.set(key, k);
          });
          return Array.from(map.values());
        });
      }
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  // Initial user check fallback
  useEffect(() => {
    if (firebaseUser) return;
    fetch('/api/auth/me', { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setUser(data.data.user);
        } else {
          // Default to demo user
          setUser({ id: 'usr_demo_1', email: 'candidate@interviewkit.io' });
        }
      })
      .catch(() => {
        setUser({ id: 'usr_demo_1', email: 'candidate@interviewkit.io' });
      });
  }, [firebaseUser, getHeaders]);

  // Save local backup to localStorage and IndexedDB on changes
  useEffect(() => {
    if (kits.length > 0) {
      try {
        localStorage.setItem('aistudio_interview_kits_backup', JSON.stringify(kits));
        cacheKitsInIndexedDB(kits).catch(() => {});
      } catch (e) {
        // Ignore quota/private browsing errors
      }
    }
  }, [kits]);

  // Set up auto-sync subscription & background worker
  useEffect(() => {
    const unsubscribeStatus = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    const cleanupAutoSync = setupAutoSync(() => ({
      syncFirestore: async (kitData, kitId) => {
        if (firebaseUser) {
          await saveKitToFirestore(kitData, kitId);
        }
      },
      syncApi: async (kitId, kitData, action, entityId) => {
        const res = await fetch(`/api/kits/${kitId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            kit: kitData,
            entityAction: action,
            entityId,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'API sync failed');
        }
        setKits((prev) => prev.map((k) => (k._id === kitId ? data.data : k)));
        return data;
      },
      onProgress: (synced, total) => {
        setSyncToastMessage(`Synchronized ${synced}/${total} offline edits to cloud.`);
        setTimeout(() => setSyncToastMessage(null), 3500);
      },
    }));

    return () => {
      unsubscribeStatus();
      cleanupAutoSync();
    };
  }, [firebaseUser, getHeaders]);

  // Fetch Kits with local IndexedDB fallback
  const fetchKits = useCallback(async () => {
    setIsLoadingKits(true);
    try {
      const res = await fetch('/api/kits', { headers: getHeaders() });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          if (data.data.length > 0) {
            setKits(data.data);
            cacheKitsInIndexedDB(data.data).catch(() => {});
          } else {
            // Check IndexedDB local cache if server is empty
            const cached = await getCachedKitsFromIndexedDB();
            if (cached && cached.length > 0) {
              setKits(cached);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load kits from network, falling back to IndexedDB:', err);
      try {
        const cached = await getCachedKitsFromIndexedDB();
        if (cached && cached.length > 0) {
          setKits(cached);
        }
      } catch (e) {
        // Fallback to localStorage if IndexedDB fails
        const local = localStorage.getItem('aistudio_interview_kits_backup');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) setKits(parsed);
          } catch (_) {}
        }
      }
    } finally {
      setIsLoadingKits(false);
    }
  }, [getHeaders]);

  // Manual sync trigger
  const handleManualSync = async () => {
    if (syncStatus.isSyncing) return;
    try {
      const res = await syncOfflineQueue({
        syncFirestore: async (kitData, kitId) => {
          if (firebaseUser) {
            await saveKitToFirestore(kitData, kitId);
          }
        },
        syncApi: async (kitId, kitData, action, entityId) => {
          const r = await fetch(`/api/kits/${encodeURIComponent(kitId)}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
              kit: kitData,
              entityAction: action,
              entityId,
            }),
          });
          if (!r.ok || !(r.headers.get('content-type') || '').includes('application/json')) {
            throw new Error(`API sync failed with status ${r.status}`);
          }
          const data = await r.json();
          if (!data.success) throw new Error(data.error?.message || 'API sync failed');
          setKits((prev) => prev.map((k) => (k._id === kitId || (k as any).id === kitId ? data.data : k)));
          return data;
        },
      });

      if (res.success > 0) {
        setSyncToastMessage(`Successfully synchronized ${res.success} offline edits to Cloud Firestore!`);
        setTimeout(() => setSyncToastMessage(null), 4000);
        await fetchKits();
      } else if (res.total === 0) {
        setSyncToastMessage('All edits are up to date in Cloud Firestore & database.');
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Manual sync failed:', err);
    }
  };

  useEffect(() => {
    fetchKits();
  }, [fetchKits]);

  // Polling for generating kit status with automatic Firestore synchronization
  const activeKit = kits.find((k) => k._id === activeKitId || (k as any).id === activeKitId);

  useEffect(() => {
    const kitId = activeKit?._id || (activeKit as any)?.id;
    if (!activeKit || activeKit.status !== 'generating' || !kitId) return;

    let pollCount = 0;
    const maxPolls = 60; // Stop polling after 2 minutes if server is unresponsive

    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setKits((prev) =>
          prev.map((k) =>
            (k._id === kitId || (k as any).id === kitId)
              ? {
                  ...k,
                  status: 'failed',
                  generationJob: {
                    stage: 'failed',
                    progress: 0,
                    message: 'Generation timed out. Please try again.',
                    error: 'Timeout',
                  },
                }
              : k
          )
        );
        return;
      }

      try {
        const res = await fetch(`/api/kits/${encodeURIComponent(kitId)}`, { headers: getHeaders() });
        if (!res.ok) {
          if (res.status === 404) {
            // Kit not found on server (e.g. wiped or offline); stop polling
            clearInterval(interval);
          }
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          // Dev server restarting or HTML returned; skip non-JSON safely
          return;
        }

        const data = await res.json();
        if (data?.success && data.data) {
          setKits((prev) =>
            prev.map((k) => (k._id === kitId || (k as any).id === kitId ? data.data : k))
          );
          // When newly generated kit transitions to ready, automatically persist to Cloud Firestore
          if (data.data.status === 'ready' && data.data.kit && firebaseUser) {
            saveKitToFirestore(data.data.kit, data.data._id || kitId).catch((err) =>
              console.warn('[Firestore] Automatic persistence notice:', err)
            );
          }
          if (data.data.status === 'ready' || data.data.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.warn('Notice while polling kit status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeKit?.status, activeKit?._id, (activeKit as any)?.id, getHeaders, firebaseUser]);

  // Load practice stats when active kit changes
  useEffect(() => {
    const kitId = activeKit?._id || (activeKit as any)?.id;
    if (!activeKit || activeKit.status !== 'ready' || !kitId) return;

    fetch(`/api/kits/${encodeURIComponent(kitId)}/practice`, { headers: getHeaders() })
      .then((res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : null;
      })
      .then((data) => {
        if (data?.success) {
          setPracticeStats(data.data.stats);
        }
      })
      .catch(() => {});
  }, [activeKit?.status, activeKit?._id, (activeKit as any)?.id, getHeaders]);

  // Create new Kit
  const handleCreateKit = async (jd: string, companyUrl: string, days: number) => {
    setIsSubmittingNewKit(true);
    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ jd, company_url: companyUrl, days }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewKitOpen(false);
        await fetchKits();
        setActiveKitId(data.data._id);
      }
    } catch (err) {
      console.error('Failed to create kit:', err);
    } finally {
      setIsSubmittingNewKit(false);
    }
  };

  // Delete Kit
  const handleDeleteKit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (firebaseUser) {
        await deleteKitFromFirestore(id).catch((err) =>
          console.warn('Failed to delete kit from Firestore:', err)
        );
      }
      await fetch(`/api/kits/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (activeKitId === id) setActiveKitId(null);
      await fetchKits();
    } catch (err) {
      console.error('Failed to delete kit:', err);
    }
  };

  // Patch active kit updates (inline edits, pins, deletes, custom additions) with IndexedDB offline queue
  const patchKit = async (updatedKitData: Kit, action?: string, entityId?: string) => {
    if (!activeKit) return;

    let updatedKitRecord: StoredKit | null = null;

    // 1. Optimistically update local React state so UI feedback is instant
    setKits((prev) =>
      prev.map((k) => {
        if (k._id === activeKit._id) {
          const newDraft = { ...k.draftState, items: { ...k.draftState.items } };
          if (action === 'edit' && entityId) {
            newDraft.items[entityId] = { ...(newDraft.items[entityId] || {}), origin: 'edited' };
          } else if (action === 'add_custom' && entityId) {
            newDraft.items[entityId] = { origin: 'pinned', isCustom: true };
          } else if (action === 'toggle_pin' && entityId) {
            const isP = newDraft.items[entityId]?.origin === 'pinned';
            newDraft.items[entityId] = { ...(newDraft.items[entityId] || {}), origin: isP ? 'generated' : 'pinned' };
          } else if (action === 'delete' && entityId) {
            if (!newDraft.tombstones.includes(entityId)) {
              newDraft.tombstones = [...newDraft.tombstones, entityId];
            }
            delete newDraft.items[entityId];
          } else if (action === 'delete_bulk' && entityId) {
            const ids = entityId.split(',').filter(Boolean);
            ids.forEach((id) => {
              if (!newDraft.tombstones.includes(id)) {
                newDraft.tombstones = [...newDraft.tombstones, id];
              }
              delete newDraft.items[id];
            });
          }
          const record: StoredKit = {
            ...k,
            kit: updatedKitData,
            draftState: newDraft,
            updatedAt: new Date().toISOString(),
          };
          updatedKitRecord = record;
          return record;
        }
        return k;
      })
    );

    // 2. Persist immediately to IndexedDB offline kit cache for instantaneous local loading
    if (updatedKitRecord) {
      cacheKitInIndexedDB(updatedKitRecord).catch(() => {});
    }

    // 3. Network Check: If user is offline, enqueue in IndexedDB and return gracefully
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueuePendingEdit({
        kitId: activeKit._id,
        userId: user?.id,
        action: action || 'edit',
        entityId,
        kit: updatedKitData,
      });
      setSyncToastMessage('Offline Mode: Edit saved locally in IndexedDB. Will auto-sync when online.');
      setTimeout(() => setSyncToastMessage(null), 4500);
      return;
    }

    // 4. Online: Synchronize to Cloud Firestore & backend API simultaneously
    try {
      const promises: Promise<any>[] = [];

      if (firebaseUser) {
        promises.push(
          saveKitToFirestore(updatedKitData, activeKit._id || (activeKit as any).id)
        );
      }

      const apiPromise = fetch(`/api/kits/${activeKit._id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          kit: updatedKitData,
          entityAction: action,
          entityId,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Server rejected patch');
        }
        return data;
      });

      promises.push(apiPromise);
      const results = await Promise.all(promises);
      const apiResult = results[results.length - 1];

      if (apiResult?.data) {
        setKits((prev) =>
          prev.map((k) => (k._id === activeKit._id ? apiResult.data : k))
        );
        cacheKitInIndexedDB(apiResult.data).catch(() => {});
      }
    } catch (networkOrSyncError: any) {
      console.warn('[patchKit] Network interruption; queuing in IndexedDB:', networkOrSyncError);
      await enqueuePendingEdit({
        kitId: activeKit._id,
        userId: user?.id,
        action: action || 'edit',
        entityId,
        kit: updatedKitData,
      });
      setSyncToastMessage('Network interruption: Edit stored safely in IndexedDB queue. Auto-syncing once reconnected.');
      setTimeout(() => setSyncToastMessage(null), 5000);
    }
  };

  // Regenerate Category / Subcategory (preserving edits, custom questions, and other categories/subcategories)
  const handleRegenerateCategory = async (category: string, subcategory?: string) => {
    if (!activeKit) return;
    setIsRegeneratingSection(true);
    setRegenerationError(null);

    try {
      // 1. Flush current in-memory kit data to backend to make sure all edits are recorded before regeneration
      if (activeKit.kit) {
        await fetch(`/api/kits/${activeKit._id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ kit: activeKit.kit }),
        }).catch(() => {});
      }

      // 2. Call backend regeneration endpoint
      const res = await fetch(`/api/kits/${activeKit._id}/regenerate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ section: 'questions', category, subcategory }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setKits((prev) =>
          prev.map((k) => (k._id === activeKit._id ? data.data : k))
        );
        if (firebaseUser && data.data.kit) {
          saveKitToFirestore(data.data.kit, activeKit._id || (activeKit as any).id).catch(() => {});
        }
      } else {
        const errorMsg = data?.error?.message || 'Failed to synthesize questions for category.';
        setRegenerationError(errorMsg);
      }
    } catch (err: any) {
      console.error('Failed to regenerate category:', err);
      setRegenerationError(err?.message || 'Network error while regenerating questions.');
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Google Search validation for individual question expert answer
  const handleValidateAnswer = async (questionId: string, prompt?: string, answer?: string) => {
    if (!activeKit || !activeKit.kit) return null;
    try {
      const res = await fetch(`/api/kits/${activeKit._id}/validate-answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ questionId, prompt, answer }),
      });
      const data = await res.json();
      if (data?.success && data.data) {
        const updatedQuestions = activeKit.kit.questions.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              expert_answer: data.data.validatedAnswer || q.expert_answer,
              citations: data.data.citations || q.citations,
            };
          }
          return q;
        });
        const updatedKit: Kit = { ...activeKit.kit, questions: updatedQuestions };
        patchKit(updatedKit, 'edit', questionId);
        return data.data;
      }
    } catch (err) {
      console.warn('Backend validation failed, executing client-side validation fallback:', err);
      const { validateAndEnrichExpertAnswer } = await import('./services/searchValidationService');
      const q = activeKit.kit.questions.find((item) => item.id === questionId);
      if (q) {
        const fallbackResult = await validateAndEnrichExpertAnswer({
          prompt: prompt || q.prompt,
          answer: answer || q.expert_answer || q.answer_outline,
          category: q.category,
          subcategory: q.subcategory,
          existingCitations: q.citations,
        });
        const updatedQuestions = activeKit.kit.questions.map((item) => {
          if (item.id === questionId) {
            return {
              ...item,
              expert_answer: fallbackResult.validatedAnswer,
              citations: fallbackResult.citations,
            };
          }
          return item;
        });
        patchKit({ ...activeKit.kit, questions: updatedQuestions }, 'edit', questionId);
        return fallbackResult;
      }
    }
    return null;
  };

  // Generate Batch Questions (+10, +25, +35)
  const handleGenerateBatchQuestions = async (options: {
    category?: string;
    subcategory?: string;
    count: number;
    seniority?: string;
  }) => {
    if (!activeKit || !activeKit.kit) return;
    setIsRegeneratingSection(true);
    setRegenerationError(null);

    const payload = {
      ...options,
      seniority: options.seniority || activeKit.kit.role.seniority || 'Senior',
    };

    try {
      const res = await fetch(`/api/kits/${activeKit._id}/generate-batch-questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setKits((prev) =>
          prev.map((k) => (k._id === activeKit._id ? data.data : k))
        );
        if (data.data.kit) {
          saveKitToFirestore(data.data.kit, activeKit._id || (activeKit as any).id).catch(() => {});
        }
      } else {
        const errorMsg = data?.error?.message || 'Failed to generate question batch.';
        setRegenerationError(errorMsg);
      }
    } catch (err: any) {
      console.error('Failed to generate batch questions:', err);
      // Fallback to client-side generator if offline
      try {
        const { generateExpandedBatch } = await import('./services/expertQuestionService');
        const maxNum = activeKit.kit.questions.reduce((max, q) => {
          const m = q.id.match(/\d+/);
          return m ? Math.max(max, parseInt(m[0], 10)) : max;
        }, 0);

        const newBatch = generateExpandedBatch({
          category: options.category === 'all' || !options.category ? undefined : (options.category as any),
          subcategory: options.subcategory,
          count: options.count,
          requirements: activeKit.kit.role.requirements,
          companyName: activeKit.kit.source.company || 'Enterprise Partner',
          roleTitle: activeKit.kit.role.title || 'Senior Software Engineer',
          seniority: activeKit.kit.role.seniority || 'Senior',
          startIndex: maxNum + 1,
        });

        const updatedKit: Kit = {
          ...activeKit.kit,
          questions: [...activeKit.kit.questions, ...newBatch],
        };
        patchKit(updatedKit, 'add_custom');
      } catch (clientErr: any) {
        setRegenerationError(err?.message || 'Error while generating questions.');
      }
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Regenerate Flashcards
  const handleRegenerateFlashcards = async () => {
    if (!activeKit) return;
    setIsRegeneratingSection(true);

    try {
      const res = await fetch(`/api/kits/${activeKit._id}/regenerate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ section: 'flashcards' }),
      });

      const data = await res.json();
      if (data.success) {
        setKits((prev) =>
          prev.map((k) => (k._id === activeKit._id ? data.data : k))
        );
      }
    } catch (err) {
      console.error('Failed to regenerate flashcards:', err);
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Re-run Schedule Allocation
  const handleRegenerateSchedule = async () => {
    if (!activeKit) return;
    setIsRegeneratingSection(true);

    try {
      const res = await fetch(`/api/kits/${activeKit._id}/regenerate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ section: 'schedule' }),
      });

      const data = await res.json();
      if (data.success) {
        setKits((prev) =>
          prev.map((k) => (k._id === activeKit._id ? data.data : k))
        );
      }
    } catch (err) {
      console.error('Failed to re-pack schedule:', err);
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Record practice confidence
  const handleRecordConfidence = async (flashcardId: string, confidence: 1 | 2 | 3): Promise<PracticeStats | null> => {
    if (!activeKit) return null;

    try {
      const res = await fetch(`/api/kits/${activeKit._id}/practice`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ flashcardId, confidence }),
      });

      const data = await res.json();
      if (data.success && data.data?.stats) {
        setPracticeStats(data.data.stats);
        return data.data.stats;
      }
    } catch (err) {
      console.error('Failed to record practice confidence:', err);
    }
    return null;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900 font-sans antialiased">
      {/* Dynamic Vibrant Ambient Background */}
      <DynamicVibrantBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top Navbar */}
        <Header
          user={user}
          onNewKit={() => setIsNewKitOpen(true)}
          onOpenBatch={() => setIsBatchOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={() => {
            setToken(null);
            localStorage.removeItem('prep_token');
            setUser(null);
          }}
          activeKitId={activeKitId || undefined}
          onBackToDashboard={() => setActiveKitId(null)}
          pendingEditCount={syncStatus.pendingCount}
          isSyncing={syncStatus.isSyncing}
          onSyncNow={handleManualSync}
        />

      {/* Main Layout Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Offline Queue & Sync Status Banner */}
        <OfflineSyncBanner
          syncStatus={syncStatus}
          onSyncNow={handleManualSync}
          toastMessage={syncToastMessage}
          onDismissToast={() => setSyncToastMessage(null)}
        />
        {!activeKitId ? (
          /* ==========================================
             Dashboard / Launchpad View
             ========================================== */
          <div className="space-y-8">
            {/* Hero / Executive Metric Strip */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-md p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Autonomous Multi-Step Assessment Kit
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Interview Preparation Workspace
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Defensive company crawler, prompt-injection sanitized extraction, deterministic schedule bin-packing, and active-recall flashcard repetition.
                  </p>
                </div>

                <button
                  onClick={() => setIsNewKitOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  <span>Synthesize New Kit</span>
                </button>
              </div>

              {/* Metric Chips */}
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-slate-500">Total Kits Synthesized</span>
                  <p className="font-mono text-xl font-bold text-slate-900">{kits.length}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Ready Kits</span>
                  <p className="font-mono text-xl font-bold text-emerald-600">
                    {kits.filter((k) => k.status === 'ready').length}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">In Pipeline</span>
                  <p className="font-mono text-xl font-bold text-indigo-600">
                    {kits.filter((k) => k.status === 'generating').length}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Batch CLI Ready</span>
                  <p className="font-mono text-xl font-bold text-slate-700">Appendix B</p>
                </div>
              </div>

              {/* Daily Practice Streak Tracker */}
              <div className="mt-8">
                <DailyPracticeStreak
                  onOpenPracticeArena={() => {
                    const readyKit = kits.find((k) => k.status === 'ready' && k.kit);
                    if (readyKit) {
                      setActiveKitId(readyKit._id);
                      setIsPracticeArenaOpen(true);
                    }
                  }}
                  onNavigateToMock={() => {
                    const readyKit = kits.find((k) => k.status === 'ready' && k.kit);
                    if (readyKit) {
                      setActiveKitId(readyKit._id);
                      setActiveTab('mock_interview');
                    }
                  }}
                />
              </div>
            </div>

            {/* Kits Workspace Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Your Generated Prep Kits</h3>
                <span className="text-xs text-slate-500">{kits.length} items</span>
              </div>

              {isLoadingKits && kits.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading workspaces...</div>
              ) : kits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">No Prep Kits Yet</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    Paste any job description and company URL to generate an autonomous, calibrated interview kit in seconds.
                  </p>
                  <button
                    onClick={() => setIsNewKitOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Kit</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {kits.map((kit) => (
                    <div
                      key={kit._id}
                      onClick={() => setActiveKitId(kit._id)}
                      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs transition hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <div>
                        {/* Top row */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400 uppercase">
                            {kit.source.company || 'Company'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                              kit.status === 'ready'
                                ? 'bg-emerald-50 text-emerald-700'
                                : kit.status === 'generating'
                                ? 'bg-indigo-50 text-indigo-700 animate-pulse'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {kit.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="mt-2 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {kit.kit?.role.title || kit.source.role || 'Software Engineer'}
                        </h4>

                        {/* Metadata row */}
                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {kit.source.days} Days
                          </span>
                          {kit.kit && (
                            <>
                              <span>·</span>
                              <span>{kit.kit.questions.length} Questions</span>
                              <span>·</span>
                              <span>{kit.kit.flashcards.length} Cards</span>
                            </>
                          )}
                        </div>

                        {/* Status detail */}
                        {kit.status === 'generating' && (
                          <div className="mt-3 rounded bg-indigo-50/70 p-2 text-[11px] text-indigo-900">
                            <span>{kit.generationJob?.message || 'Processing...'}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                        <span>{new Date(kit.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteKit(kit._id, e)}
                            className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Kit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-600 transition" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeKit?.status === 'generating' ? (
          /* ==========================================
             Generating Progress View
             ========================================== */
          <div className="py-12">
            <ProgressStepper
              currentStage={activeKit.generationJob?.stage || 'parsing_jd'}
              progressPercent={activeKit.generationJob?.progress || 10}
              message={activeKit.generationJob?.message || 'Processing pipeline stages...'}
              error={activeKit.generationJob?.error}
              onRetry={() => {
                handleCreateKit(activeKit.source.jd, activeKit.source.company_url, activeKit.source.days);
              }}
            />
          </div>
        ) : activeKit?.kit ? (
          /* ==========================================
             Active Kit Workbench View
             ========================================== */
          <div className="space-y-6">
            {/* Top Kit Summary Bar */}
            <div className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{activeKit.kit.source.company}</span>
                    <span>·</span>
                    <span>{activeKit.kit.source.location || 'Remote'}</span>
                    <span>·</span>
                    <span className="font-mono text-slate-400">
                      Researched {new Date(activeKit.kit.source.researched_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    {activeKit.kit.role.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <DailyPracticeStreak variant="compact" />

                  <button
                    onClick={() => setIsExportPdfOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition active:scale-98"
                    title="Export formatted PDF resume and preparation summary document"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Export PDF Resume & Kit</span>
                  </button>

                  <button
                    onClick={() => setIsPracticeArenaOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition active:scale-98"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Practice Flashcards</span>
                  </button>

                  <button
                    onClick={() => setActiveKitId(null)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    All Kits
                  </button>
                </div>
              </div>

              {/* Workbench Tab Strip */}
              <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
                {[
                  { id: 'overview', label: 'Overview & Brief' },
                  { id: 'requirements', label: `Requirements (${activeKit.kit.role.requirements.length})` },
                  { id: 'questions', label: `Questions (${activeKit.kit.questions.length})` },
                  { id: 'flashcards', label: `Flashcards (${activeKit.kit.flashcards.length})` },
                  { id: 'schedule', label: `Schedule (${activeKit.kit.schedule.days_available}d)` },
                  { id: 'coverage', label: 'Coverage Audit' },
                  { id: 'mock_interview', label: 'AI Mock Interview' },
                  { id: 'weak_spots', label: 'Weak Spots' },
                  { id: 'checklist', label: 'Interview Day Checklist' },
                  { id: 'resources', label: 'Resource Vault' },
                  { id: 'salary_negotiation', label: 'Salary Negotiation' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Section Content */}
            {activeTab === 'overview' && (
              <CompanyBriefSection
                kit={activeKit.kit}
                onOpenExportPdf={() => setIsExportPdfOpen(true)}
                onUpdateBrief={(summary, whatTheyDo) => {
                  const updated: Kit = {
                    ...activeKit.kit!,
                    company_brief: {
                      ...activeKit.kit!.company_brief,
                      summary,
                      what_they_do: whatTheyDo,
                    },
                  };
                  patchKit(updated, 'edit', 'company_brief');
                }}
              />
            )}

            {activeTab === 'requirements' && (
              <RequirementsSection
                kit={activeKit.kit}
                onUpdateRole={(updatedRole) => {
                  const updated: Kit = { ...activeKit.kit!, role: updatedRole };
                  patchKit(updated);
                }}
              />
            )}

            {activeTab === 'questions' && (
              <QuestionsSection
                kit={activeKit.kit}
                draftState={activeKit.draftState}
                onUpdateQuestions={(questions, action, entityId) => {
                  const updated: Kit = { ...activeKit.kit!, questions };
                  patchKit(updated, action || 'edit', entityId);
                }}
                onRegenerateCategory={handleRegenerateCategory}
                onGenerateBatch={handleGenerateBatchQuestions}
                onTogglePin={(qId) => {
                  patchKit(activeKit.kit!, 'toggle_pin', qId);
                }}
                onDeleteQuestion={(qId) => {
                  const filtered = activeKit.kit!.questions.filter((q) => q.id !== qId);
                  const updated: Kit = { ...activeKit.kit!, questions: filtered };
                  patchKit(updated, 'delete', qId);
                }}
                onDeleteQuestions={(qIds) => {
                  const toDeleteSet = new Set(qIds);
                  const filtered = activeKit.kit!.questions.filter((q) => !toDeleteSet.has(q.id));
                  const updated: Kit = { ...activeKit.kit!, questions: filtered };
                  patchKit(updated, 'delete_bulk', qIds.join(','));
                }}
                isRegenerating={isRegeneratingSection}
                regenerationError={regenerationError}
                onClearRegenerationError={() => setRegenerationError(null)}
                onValidateAnswer={handleValidateAnswer}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsSection
                kit={activeKit.kit}
                onLaunchPractice={() => setIsPracticeArenaOpen(true)}
                onUpdateFlashcards={(flashcards) => {
                  const updated: Kit = { ...activeKit.kit!, flashcards };
                  patchKit(updated);
                }}
                onRegenerateFlashcards={handleRegenerateFlashcards}
                isRegenerating={isRegeneratingSection}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleSection
                kit={activeKit.kit}
                onUpdateSchedule={(updatedSchedule) => {
                  if (activeKit?.kit) {
                    const updated: Kit = { ...activeKit.kit, schedule: updatedSchedule };
                    patchKit(updated, 'edit', 'schedule');
                  }
                }}
                onRegenerateSchedule={handleRegenerateSchedule}
                isRegenerating={isRegeneratingSection}
                onNavigateToChecklist={() => setActiveTab('checklist')}
                onNavigateToMock={() => setActiveTab('mock_interview')}
              />
            )}

            {activeTab === 'coverage' && (
              <CoverageSection kit={activeKit.kit} />
            )}

            {activeTab === 'mock_interview' && (
              <MockInterviewSection
                kit={activeKit.kit}
                onNavigateToChecklist={() => setActiveTab('checklist')}
              />
            )}

            {activeTab === 'weak_spots' && (
              <WeakSpotsSection
                kit={activeKit.kit}
                stats={practiceStats}
                onJumpToPractice={() => setIsPracticeArenaOpen(true)}
              />
            )}

            {activeTab === 'checklist' && (
              <InterviewDayChecklist kit={activeKit.kit} />
            )}

            {activeTab === 'resources' && (
              <ResourceVaultSection kit={activeKit.kit} />
            )}

            {activeTab === 'salary_negotiation' && (
              <SalaryNegotiationSimulator kit={activeKit.kit} />
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-rose-600">
            Error loading prep kit details.
          </div>
        )}
      </main>

      {/* Practice Arena Fullscreen Modal */}
      {isPracticeArenaOpen && activeKit?.kit && (
        <PracticeArena
          kit={activeKit.kit}
          kitId={activeKit._id}
          onClose={() => setIsPracticeArenaOpen(false)}
          onRecordConfidence={handleRecordConfidence}
          initialStats={practiceStats}
        />
      )}

      {/* Creation Modal */}
      <NewKitModal
        isOpen={isNewKitOpen}
        onClose={() => setIsNewKitOpen(false)}
        onSubmit={handleCreateKit}
        isLoading={isSubmittingNewKit}
      />

      {/* Batch Modal */}
      <BatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        kits={kits}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser, newToken) => {
          setUser(newUser);
          setToken(newToken);
          localStorage.setItem('prep_token', newToken);
          fetchKits();
        }}
      />

      {/* Export Formatted PDF Resume & Prep Kit Modal */}
      {isExportPdfOpen && activeKit?.kit && (
        <ExportPdfModal
          isOpen={isExportPdfOpen}
          onClose={() => setIsExportPdfOpen(false)}
          kit={activeKit.kit}
          storedKit={activeKit}
          userEmail={user?.email}
        />
      )}
      </div>
    </div>
  );
}
