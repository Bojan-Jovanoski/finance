import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import type { Expense } from '@/db/types';

export function useExpenses(uid: string, month: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'users', uid, 'expenses'),
      where('month', '==', month),
    );
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
    });
  }, [uid, month]);

  async function addExpense(data: Omit<Expense, 'id' | 'month'>) {
    await addDoc(collection(firestore, 'users', uid, 'expenses'), {
      ...data,
      month: data.date.slice(0, 7),
    });
  }

  async function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'month'>>) {
    const updates: Partial<Expense> = { ...data };
    if (data.date) updates.month = data.date.slice(0, 7);
    await updateDoc(doc(firestore, 'users', uid, 'expenses', id), updates);
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(firestore, 'users', uid, 'expenses', id));
  }

  return { expenses, addExpense, updateExpense, deleteExpense };
}
