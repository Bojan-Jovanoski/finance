import { SummaryCards } from './SummaryCards';
import { SpendingChart } from './SpendingChart';
import { QuickAddForm } from './QuickAddForm';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import type { Budget } from '@/db/types';

interface DashboardProps {
  uid: string;
  month: string;
  budget: Budget;
  onSelectCategory: (id: string) => void;
}

export function Dashboard({ uid, month, budget, onSelectCategory }: DashboardProps) {
  const { expenses } = useExpenses(uid, month);
  const { categories } = useCategories(uid);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <SummaryCards uid={uid} budget={budget} totalSpent={totalSpent} month={month} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Spending by category</h2>
          <SpendingChart
            expenses={expenses}
            categories={categories}
            onSelectCategory={onSelectCategory}
          />
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Add expense</h2>
          <QuickAddForm uid={uid} month={month} />
        </div>
      </div>
    </div>
  );
}
