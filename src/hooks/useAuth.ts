import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from '@/db/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err: Error) => {
      setAuthError(err.message);
    });
    return onAuthStateChanged(auth, setUser, (err) => {
      setAuthError(err.message);
    });
  }, []);

  async function signIn() {
    try {
      setAuthError(null);
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, signIn, signOut: signOutUser, authError };
}
