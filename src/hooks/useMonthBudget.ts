import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Budget } from '@/db/types';

export function useMonthBudget(month: string) {
  // Returns undefined while loading, null if not found, Budget if found
  const result = useLiveQuery(
    async () => {
      const budget = await db.budgets.get(month);
      return budget ?? null;
    },
    [month],
  );

  async function saveBudget(income: number, savingsGoal: number) {
    await db.budgets.put({ id: month, income, savingsGoal });
  }

  return {
    budget: result as Budget | null | undefined,
    isLoading: result === undefined,
    saveBudget,
  };
}
