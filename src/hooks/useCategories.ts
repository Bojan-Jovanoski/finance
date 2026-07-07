import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, deleteField,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import type { Category } from '@/db/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const q = query(collection(firestore, 'households', HOUSEHOLD_ID, 'categories'), orderBy('name'));
    return onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
    });
  }, []);

  async function addCategory(name: string) {
    await addDoc(collection(firestore, 'households', HOUSEHOLD_ID, 'categories'), {
      name: name.trim(),
      isDefault: false,
    });
  }

  async function renameCategory(id: string, name: string) {
    await updateDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'categories', id), { name: name.trim() });
  }

  async function setCategoryLimit(id: string, limit: number | null) {
    await updateDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'categories', id), {
      monthlyLimit: limit !== null ? limit : deleteField(),
    });
  }

  async function deleteCategory(id: string) {
    const other = categories.find((c) => c.name === 'Other');
    if (other?.id && other.id !== id) {
      const expensesRef = collection(firestore, 'households', HOUSEHOLD_ID, 'expenses');
      const snap = await getDocs(query(expensesRef, where('categoryId', '==', id)));
      const batch = writeBatch(firestore);
      snap.docs.forEach((d) => batch.update(d.ref, { categoryId: other.id }));
      await batch.commit();
    }
    await deleteDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'categories', id));
  }

  function getCategoryById(id: string): Category | undefined {
    return categories.find((c) => c.id === id);
  }

  return { categories, addCategory, renameCategory, deleteCategory, getCategoryById, setCategoryLimit };
}
