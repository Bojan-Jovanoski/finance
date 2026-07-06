import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Expense } from '@/db/types';

export function useExpenses(month: string) {
  const expenses =
    useLiveQuery(() => db.expenses.where('month').equals(month).toArray(), [month]) ?? [];

  async function addExpense(data: Omit<Expense, 'id' | 'month'>) {
    const expenseMonth = data.date.slice(0, 7);
    await db.expenses.add({ ...data, month: expenseMonth });
  }

  async function updateExpense(id: number, data: Partial<Omit<Expense, 'id' | 'month'>>) {
    const updates: Partial<Expense> = { ...data };
    if (data.date) {
      updates.month = data.date.slice(0, 7);
    }
    await db.expenses.update(id, updates);
  }

  async function deleteExpense(id: number) {
    await db.expenses.delete(id);
  }

  return { expenses, addExpense, updateExpense, deleteExpense };
}
