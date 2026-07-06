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

  useEffect(() => {
    // Pick up the result when Google redirects back to the app
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function signIn() {
    await signInWithRedirect(auth, new GoogleAuthProvider());
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, signIn, signOut: signOutUser };
}
