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

const PENDING_KEY = 'pendingSignIn';

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState(
    () => localStorage.getItem(PENDING_KEY) === 'true',
  );

  useEffect(() => {
    // If we know a redirect was initiated, wait for it to complete
    if (localStorage.getItem(PENDING_KEY) === 'true') {
      getRedirectResult(auth)
        .then((result) => {
          localStorage.removeItem(PENDING_KEY);
          setPendingRedirect(false);
          if (result?.user) {
            setUser(result.user);
          } else {
            // Redirect result was empty — state may have been lost; ask user to retry
            setAuthError('Sign-in could not be completed. Please try again.');
            setUser(null);
          }
        })
        .catch((err: Error) => {
          localStorage.removeItem(PENDING_KEY);
          setPendingRedirect(false);
          setAuthError(err.message);
          setUser(null);
        });
    }

    return onAuthStateChanged(auth, (u) => {
      // Only update from onAuthStateChanged when we're not mid-redirect
      if (localStorage.getItem(PENDING_KEY) !== 'true') {
        setUser(u);
      }
    });
  }, []);

  async function signIn() {
    try {
      setAuthError(null);
      localStorage.setItem(PENDING_KEY, 'true');
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (err) {
      localStorage.removeItem(PENDING_KEY);
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  async function signOutUser() {
    localStorage.removeItem(PENDING_KEY);
    await signOut(auth);
    setUser(null);
  }

  return { user, signIn, signOut: signOutUser, authError, pendingRedirect };
}
