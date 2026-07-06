import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import type { Budget } from '@/db/types';

export function useMonthBudget(uid: string, month: string) {
  const [budget, setBudget] = useState<Budget | null | undefined>(undefined);

  useEffect(() => {
    const ref = doc(firestore, 'users', uid, 'budgets', month);
    return onSnapshot(ref, (snap) => {
      setBudget(snap.exists() ? ({ id: snap.id, ...snap.data() } as Budget) : null);
    });
  }, [uid, month]);

  async function saveBudget(income: number, savingsGoal: number) {
    await setDoc(doc(firestore, 'users', uid, 'budgets', month), { income, savingsGoal });
  }

  return { budget, saveBudget };
}
