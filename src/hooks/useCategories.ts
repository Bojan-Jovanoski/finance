import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Category } from '@/db/types';

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) ?? [];

  async function addCategory(name: string) {
    await db.categories.add({ name: name.trim(), isDefault: false });
  }

  async function renameCategory(id: number, name: string) {
    await db.categories.update(id, { name: name.trim() });
  }

  async function deleteCategory(id: number) {
    const other = await db.categories.where('name').equals('Other').first();
    const fallbackId = other?.id ?? id;
    if (fallbackId !== id) {
      await db.expenses.where('categoryId').equals(id).modify({ categoryId: fallbackId });
    }
    await db.categories.delete(id);
  }

  function getCategoryById(id: number): Category | undefined {
    return categories.find((c) => c.id === id);
  }

  return { categories, addCategory, renameCategory, deleteCategory, getCategoryById };
}
