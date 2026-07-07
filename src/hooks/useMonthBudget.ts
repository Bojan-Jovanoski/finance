import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Budget } from '@/db/types';

export function useMonthBudget(month: string) {
  const [budget, setBudget] = useState<Budget | null | undefined>(undefined);

  useEffect(() => {
    const ref = doc(firestore, 'households', HOUSEHOLD_ID, 'budgets', month);
    return onSnapshot(ref, (snap) => {
      setBudget(snap.exists() ? ({ id: snap.id, ...snap.data() } as Budget) : null);
    });
  }, [month]);

  async function saveBudget(income: number, savingsGoal: number) {
    await setDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'budgets', month), { income, savingsGoal });
  }

  return { budget, saveBudget };
}
