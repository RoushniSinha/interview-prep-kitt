import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Kit, StoredKit, User, FlashcardPracticeLog } from '../core/types';
import { createInitialDraftState } from '../core/draftState';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'kits_store.json');

interface SerializedStoreData {
  users: [string, User][];
  kits: [string, StoredKit][];
  sessions: [string, string][];
  practiceLogs: [string, FlashcardPracticeLog[]][];
}

// Persistent store backed by disk storage & memory cache
class AppStore {
  private users: Map<string, User> = new Map();
  private kits: Map<string, StoredKit> = new Map();
  private sessions: Map<string, string> = new Map(); // token -> userId
  private practiceLogs: Map<string, FlashcardPracticeLog[]> = new Map(); // `${kitId}_${userId}` -> logs

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();

    // Ensure default demo user exists for frictionless testing
    if (!this.users.has('usr_demo_1')) {
      const defaultUser: User = {
        _id: 'usr_demo_1',
        email: 'candidate@interviewkit.io',
        passwordHash: this.hashPassword('candidate123'),
        createdAt: new Date().toISOString(),
      };
      this.users.set(defaultUser._id, defaultUser);
      this.sessions.set('demo_session_token', defaultUser._id);
      this.persistToDisk();
    }
  }

  private ensureDataDirectory(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[AppStore] Failed to ensure data directory:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        if (raw.trim()) {
          const data: SerializedStoreData = JSON.parse(raw);
          if (Array.isArray(data.users)) this.users = new Map(data.users);
          if (Array.isArray(data.kits)) this.kits = new Map(data.kits);
          if (Array.isArray(data.sessions)) this.sessions = new Map(data.sessions);
          if (Array.isArray(data.practiceLogs)) this.practiceLogs = new Map(data.practiceLogs);

          // Self-heal kits left in 'generating' across process restarts
          for (const kit of this.kits.values()) {
            if (kit.status === 'generating') {
              if (kit.kit) {
                kit.status = 'ready';
              } else {
                kit.status = 'failed';
                kit.generationJob = {
                  stage: 'failed',
                  progress: 0,
                  message: 'Generation session interrupted. Please re-trigger generation.',
                  error: 'Generation interrupted by server reboot',
                };
              }
            }
          }

          console.log(`[AppStore] Successfully loaded ${this.kits.size} prep kits and ${this.users.size} users from disk.`);
        }
      }
    } catch (err) {
      console.warn('[AppStore] Error reading store from disk (initializing fresh):', err);
    }
  }

  private persistToDisk(): void {
    try {
      this.ensureDataDirectory();
      const payload: SerializedStoreData = {
        users: Array.from(this.users.entries()),
        kits: Array.from(this.kits.entries()),
        sessions: Array.from(this.sessions.entries()),
        practiceLogs: Array.from(this.practiceLogs.entries()),
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[AppStore] Failed to persist data to disk:', err);
    }
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(`salt_kit_${password}`).digest('hex');
  }

  // --- Auth & Users ---
  findUserByEmail(email: string): User | undefined {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return undefined;
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  saveUser(user: User): void {
    this.users.set(user._id, user);
    this.persistToDisk();
  }

  createUser(email: string, password: string): User {
    const user: User = {
      _id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: email.toLowerCase(),
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    this.users.set(user._id, user);
    this.persistToDisk();
    return user;
  }

  createSession(userId: string): string {
    const token = `sess_${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, userId);
    this.persistToDisk();
    return token;
  }

  getUserFromSession(token?: string): User | undefined {
    if (!token) return undefined;
    const userId = this.sessions.get(token);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  deleteSession(token?: string): void {
    if (token) {
      this.sessions.delete(token);
      this.persistToDisk();
    }
  }

  // --- Kits & Jobs ---
  getUserKits(userId: string): StoredKit[] {
    return Array.from(this.kits.values())
      .filter((k) => k.userId === userId || k.userId === 'usr_demo_1')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getKitById(id: string): StoredKit | undefined {
    return this.kits.get(id);
  }

  findExistingKit(userId: string, jdHash: string, companyUrl: string): StoredKit | undefined {
    for (const k of this.kits.values()) {
      if (
        k.userId === userId &&
        k.source.company_url === companyUrl &&
        crypto.createHash('md5').update(k.source.jd).digest('hex') === jdHash
      ) {
        return k;
      }
    }
    return undefined;
  }

  createKit(
    userId: string,
    jd: string,
    companyUrl: string,
    days: number,
    initialStatus: 'draft' | 'generating' = 'generating'
  ): StoredKit {
    const id = `kit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newKit: StoredKit = {
      _id: id,
      userId,
      status: initialStatus,
      source: {
        company: companyUrl ? companyUrl.replace(/https?:\/\//, '').split('.')[0] : 'Company',
        company_url: companyUrl || '',
        role: 'Pending Extraction',
        days,
        jd,
      },
      kit: null,
      draftState: createInitialDraftState(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationJob: {
        stage: 'queued',
        progress: 0,
        message: 'Generation job enqueued...',
      },
    };

    this.kits.set(id, newKit);
    this.persistToDisk();
    return newKit;
  }

  updateKit(id: string, updates: Partial<StoredKit>): StoredKit | undefined {
    const existing = this.kits.get(id);
    if (!existing) return undefined;

    const updated: StoredKit = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.kits.set(id, updated);
    this.persistToDisk();
    return updated;
  }

  deleteKit(id: string, userId: string): boolean {
    const existing = this.kits.get(id);
    if (!existing || (existing.userId !== userId && existing.userId !== 'usr_demo_1')) return false;
    const deleted = this.kits.delete(id);
    if (deleted) {
      this.persistToDisk();
    }
    return deleted;
  }

  // --- Practice Logs ---
  recordPractice(kitId: string, userId: string, log: FlashcardPracticeLog): void {
    const key = `${kitId}_${userId}`;
    const logs = this.practiceLogs.get(key) || [];
    logs.push(log);
    this.practiceLogs.set(key, logs);
    this.persistToDisk();
  }

  getPracticeLogs(kitId: string, userId: string): FlashcardPracticeLog[] {
    const key = `${kitId}_${userId}`;
    return this.practiceLogs.get(key) || [];
  }
}

export const store = new AppStore();
