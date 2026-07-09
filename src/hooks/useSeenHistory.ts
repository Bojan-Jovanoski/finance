import { useCallback, useState } from 'react';
import { createdAtToDate } from './useRecentExpenses';
import type { Expense } from '@/db/types';

// Per-user "seen" tracking for the Recently-added history, stored locally.
// Kept in localStorage keyed by uid (not Firestore) — it's a per-device read
// marker, cheap, and needs no schema/rules changes.
function storageKey(uid: string) {
  return `history:lastSeen:${uid}`;
}

export function useSeenHistory(recent: Expense[] | undefined, uid: string) {
  // Seed to "now" on first ever load so a returning user doesn't get a huge
  // count for history that predates this feature. After that, tracked forward.
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const stored = localStorage.getItem(storageKey(uid));
    if (stored) return Number(stored);
    const now = Date.now();
    localStorage.setItem(storageKey(uid), String(now));
    return now;
  });

  const markAllSeen = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(storageKey(uid), String(now));
    setLastSeenAt(now);
  }, [uid]);

  // Count only the *other* member's items added after we last looked.
  const unseenCount = (recent ?? []).filter((exp) => {
    if (exp.createdBy === uid) return false;
    const when = createdAtToDate(exp.createdAt);
    return when ? when.getTime() > lastSeenAt : false;
  }).length;

  return { unseenCount, lastSeenAt, markAllSeen };
}
