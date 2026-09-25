import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { Kit, StoredKit } from '../core/types';

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Saves or updates a user profile document in /users/{userId}.
 */
export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userDocRef);
    if (!existing.exists()) {
      const profile: UserProfile = {
        userId: user.uid,
        email: user.email || 'candidate@interviewkit.io',
        displayName: user.displayName || user.email?.split('@')[0] || 'Candidate',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, profile);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves an Interview Prep Kit to Firestore in /kits/{kitId}.
 */
export async function saveKitToFirestore(kit: Kit | StoredKit, kitId?: string): Promise<string> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Candidate must be authenticated to persist kits to Firestore.');
  }

  const stored = kit as Partial<StoredKit>;
  const id = kitId || stored.id || stored._id || `kit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `kits/${id}`;

  try {
    const kitDocRef = doc(db, 'kits', id);
    const now = new Date().toISOString();

    const kitPayload = {
      ...kit,
      id,
      _id: id,
      userId: currentUid,
      createdAt: stored.createdAt || now,
      updatedAt: now,
    };

    await setDoc(kitDocRef, kitPayload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a kit from Firestore.
 */
export async function deleteKitFromFirestore(kitId: string): Promise<void> {
  const path = `kits/${kitId}`;
  try {
    const kitDocRef = doc(db, 'kits', kitId);
    await deleteDoc(kitDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for the active candidate's kits.
 */
export function subscribeToUserKits(
  userId: string,
  onUpdate: (kits: StoredKit[]) => void
): Unsubscribe {
  const path = 'kits';
  try {
    const q = query(collection(db, 'kits'), where('userId', '==', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const loadedKits: StoredKit[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          loadedKits.push({
            ...data,
            _id: docSnap.id,
            id: docSnap.id,
          } as StoredKit);
        });
        // Sort descending by updated/created timestamp
        loadedKits.sort((a, b) => {
          const tA = new Date(b.updatedAt || b.createdAt).getTime();
          const tB = new Date(a.updatedAt || a.createdAt).getTime();
          return tA - tB;
        });
        onUpdate(loadedKits);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
