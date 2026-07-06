import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
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
    // If a redirect sign-in was started, wait for it to resolve
    if (localStorage.getItem(PENDING_KEY) === 'true') {
      getRedirectResult(auth)
        .then((result) => {
          localStorage.removeItem(PENDING_KEY);
          setPendingRedirect(false);
          if (!result) {
            // Redirect result lost — typical on iOS Safari
            setAuthError(
              'Sign-in could not complete after redirect. On iPhone, open this page in Safari (not the home screen app) and try again.',
            );
            setUser(null);
          }
          // If result is present, onAuthStateChanged will fire with the user
        })
        .catch((err: Error) => {
          localStorage.removeItem(PENDING_KEY);
          setPendingRedirect(false);
          setAuthError(err.message);
          setUser(null);
        });
    }

    return onAuthStateChanged(auth, (u) => {
      if (localStorage.getItem(PENDING_KEY) !== 'true') {
        setUser(u);
      }
    });
  }, []);

  async function signIn() {
    try {
      setAuthError(null);
      // Try popup first — works on desktop Chrome/Safari and iOS Safari browser
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — not an error
        return;
      }

      if (code === 'auth/popup-blocked') {
        // Browser blocked the popup — fall back to full-page redirect
        // Works on desktop Firefox/Chrome; note iOS Safari may lose sessionStorage
        try {
          localStorage.setItem(PENDING_KEY, 'true');
          setPendingRedirect(true);
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } catch (redirectErr) {
          localStorage.removeItem(PENDING_KEY);
          setPendingRedirect(false);
          setAuthError(redirectErr instanceof Error ? redirectErr.message : 'Sign-in failed');
        }
        return;
      }

      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  async function signOutUser() {
    localStorage.removeItem(PENDING_KEY);
    await signOut(auth);
  }

  return { user, signIn, signOut: signOutUser, authError, pendingRedirect };
}
