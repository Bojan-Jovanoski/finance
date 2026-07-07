import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { auth, firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Expense } from '@/db/types';

export function useExpenses(month: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'households', HOUSEHOLD_ID, 'expenses'),
      where('month', '==', month),
    );
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
    });
  }, [month]);

  async function addExpense(data: Pick<Expense, 'amount' | 'categoryId' | 'description' | 'date'>) {
    const user = auth.currentUser;
    await addDoc(collection(firestore, 'households', HOUSEHOLD_ID, 'expenses'), {
      ...data,
      month: data.date.slice(0, 7),
      createdBy: user?.uid ?? null,
      createdByName: user?.displayName ?? user?.email ?? null,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'month'>>) {
    const updates: Partial<Expense> = { ...data };
    if (data.date) updates.month = data.date.slice(0, 7);
    await updateDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'expenses', id), updates);
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'expenses', id));
  }

  return { expenses, addExpense, updateExpense, deleteExpense };
}
