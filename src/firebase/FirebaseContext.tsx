import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider, testConnection } from './config';
import { syncUserProfile } from './firestoreService';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  isOnline: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
  error: null,
});

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial health check
    testConnection().then((ok) => setIsOnline(ok));

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
        if (firebaseUser) {
          try {
            await syncUserProfile(firebaseUser);
          } catch (err: unknown) {
            console.error('Failed to sync candidate profile to Firestore:', err);
          }
        }
      },
      (err) => {
        console.error('Auth state change listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      await syncUserProfile(result.user);
      return result.user;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('Firebase Google Sign-In error:', err);
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        loading,
        isOnline,
        signInWithGoogle,
        signOut,
        error,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
