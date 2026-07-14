import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Expense } from '@/db/types';

// Reactively loads every expense whose `month` is in the given list.
// Firestore's `in` operator supports up to 30 values, so keep ranges within
// that (e.g. the last 6–12 months). Returns `loading` until the first snapshot.
export function useExpensesInRange(months: string[]) {
  const [expenses, setExpenses] = useState<Expense[] | undefined>(undefined);
  const key = months.join(',');

  useEffect(() => {
    if (months.length === 0) {
      setExpenses([]);
      return;
    }
    const q = query(
      collection(firestore, 'households', HOUSEHOLD_ID, 'expenses'),
      where('month', 'in', months),
    );
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
    });
    // `key` captures the month list; `months` identity is unstable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { expenses: expenses ?? [], loading: expenses === undefined };
}
