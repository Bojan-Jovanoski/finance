import {
  collection, doc, getDocs, writeBatch,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import type { Category } from '@/db/types';

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
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

// Commits queued writes in chunks, respecting Firestore's 500-op batch limit.
async function commitInChunks(ops: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  let batch = writeBatch(firestore);
  let count = 0;
  for (const op of ops) {
    op(batch);
    count++;
    if (count === 499) {
      await batch.commit();
      batch = writeBatch(firestore);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

// One-time, non-destructive copy of a user's personal data (the old
// users/{uid}/... layout) into the shared household. The originals are left
// untouched, so this can be re-run safely and the old copy remains as a backup.
// If the user had no categories, the household is seeded with the defaults.
export async function migratePersonalDataToHousehold(uid: string, householdId: string) {
  const src = (name: string) => collection(firestore, 'users', uid, name);
  const dst = (name: string) => collection(firestore, 'households', householdId, name);

  const [budgetsSnap, expensesSnap, categoriesSnap] = await Promise.all([
    getDocs(src('budgets')),
    getDocs(src('expenses')),
    getDocs(src('categories')),
  ]);

  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  budgetsSnap.docs.forEach((d) => {
    ops.push((batch) => batch.set(doc(dst('budgets'), d.id), d.data()));
  });
  expensesSnap.docs.forEach((d) => {
    ops.push((batch) => batch.set(doc(dst('expenses'), d.id), d.data()));
  });

  if (categoriesSnap.empty) {
    DEFAULT_CATEGORIES.forEach((cat) => {
      ops.push((batch) => batch.set(doc(dst('categories')), cat));
    });
  } else {
    categoriesSnap.docs.forEach((d) => {
      ops.push((batch) => batch.set(doc(dst('categories'), d.id), d.data()));
    });
  }

  await commitInChunks(ops);
}
