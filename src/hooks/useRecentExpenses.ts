import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Expense } from '@/db/types';

// Most-recently-added expenses across the whole household, newest first.
// Ordered by createdAt, so only items added after the sharing/attribution
// update appear here (older/migrated items have no createdAt and are excluded).
export function useRecentExpenses(max = 50) {
  const [expenses, setExpenses] = useState<Expense[] | undefined>(undefined);

  useEffect(() => {
    const q = query(
      collection(firestore, 'households', HOUSEHOLD_ID, 'expenses'),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
    });
  }, [max]);

  return expenses;
}

// Firestore Timestamp -> Date, tolerant of the pending-write window where a
// server timestamp is still null locally.
export function createdAtToDate(value: unknown): Date | null {
  const ts = value as { toDate?: () => Date } | null | undefined;
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}
