import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, deleteField,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import type { Category } from '@/db/types';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Electricity', isDefault: true },
  { name: 'Water', isDefault: true },
  { name: 'Internet/Phone', isDefault: true },
  { name: 'Bills Other', isDefault: true },
  { name: 'Subscriptions', isDefault: true },
  { name: 'Groceries', isDefault: true },
  { name: 'Transport', isDefault: true },
  { name: 'Dining Out', isDefault: true },
  { name: 'Health', isDefault: true },
  { name: 'Entertainment', isDefault: true },
  { name: 'Clothing', isDefault: true },
  { name: 'Household', isDefault: true },
  { name: 'Other', isDefault: true },
];

async function seedDefaultCategories(uid: string) {
  const batch = writeBatch(firestore);
  DEFAULT_CATEGORIES.forEach((cat) => {
    const ref = doc(collection(firestore, 'users', uid, 'categories'));
    batch.set(ref, cat);
  });
  await batch.commit();
}

export function useCategories(uid: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    const q = query(collection(firestore, 'users', uid, 'categories'), orderBy('name'));
    return onSnapshot(q, (snap) => {
      if (snap.empty && !seeded.current) {
        seeded.current = true;
        seedDefaultCategories(uid);
        return;
      }
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
    });
  }, [uid]);

  async function addCategory(name: string) {
    await addDoc(collection(firestore, 'users', uid, 'categories'), {
      name: name.trim(),
      isDefault: false,
    });
  }

  async function renameCategory(id: string, name: string) {
    await updateDoc(doc(firestore, 'users', uid, 'categories', id), { name: name.trim() });
  }

  async function setCategoryLimit(id: string, limit: number | null) {
    await updateDoc(doc(firestore, 'users', uid, 'categories', id), {
      monthlyLimit: limit !== null ? limit : deleteField(),
    });
  }

  async function deleteCategory(id: string) {
    const other = categories.find((c) => c.name === 'Other');
    if (other?.id && other.id !== id) {
      const expensesRef = collection(firestore, 'users', uid, 'expenses');
      const snap = await getDocs(query(expensesRef, where('categoryId', '==', id)));
      const batch = writeBatch(firestore);
      snap.docs.forEach((d) => batch.update(d.ref, { categoryId: other.id }));
      await batch.commit();
    }
    await deleteDoc(doc(firestore, 'users', uid, 'categories', id));
  }

  function getCategoryById(id: string): Category | undefined {
    return categories.find((c) => c.id === id);
  }

  return { categories, addCategory, renameCategory, deleteCategory, getCategoryById, setCategoryLimit };
}
