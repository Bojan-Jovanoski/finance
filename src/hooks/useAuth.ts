import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from '@/db/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser, (err) => {
      setAuthError(err.message);
    });
  }, []);

  async function signIn() {
    try {
      setAuthError(null);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('popup-blocked') || err.message.includes('popup-closed')) {
          setAuthError('Popup was blocked. Open the app in Safari (not the home screen shortcut) and try again.');
        } else {
          setAuthError(err.message);
        }
      }
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, signIn, signOut: signOutUser, authError, pendingRedirect: false };
}
