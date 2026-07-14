import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Budget } from '@/db/types';

// All monthly budget docs, keyed by month id ("YYYY-MM"). There's only one doc
// per month, so loading the whole collection is cheap. Used to line spending up
// against the income/savings set for each month.
export function useAllBudgets() {
  const [budgets, setBudgets] = useState<Record<string, Budget>>({});

  useEffect(() => {
    const ref = collection(firestore, 'households', HOUSEHOLD_ID, 'budgets');
    return onSnapshot(ref, (snap) => {
      const map: Record<string, Budget> = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() } as Budget; });
      setBudgets(map);
    });
  }, []);

  return budgets;
}
