import { SummaryCards } from './SummaryCards';
import { SpendingChart } from './SpendingChart';
import { QuickAddForm } from './QuickAddForm';
import { CategoryBudgets } from './CategoryBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import type { Budget } from '@/db/types';

interface DashboardProps {
  month: string;
  budget: Budget;
  onSelectCategory: (id: string) => void;
  onManageCategories: () => void;
}

export function Dashboard({ month, budget, onSelectCategory, onManageCategories }: DashboardProps) {
  const { expenses } = useExpenses(month);
  const { categories } = useCategories();
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-8">
      <SummaryCards budget={budget} totalSpent={totalSpent} month={month} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <div className="space-y-6 lg:space-y-8">
          <div className="bg-white border border-rule rounded-lg p-5">
            <SpendingChart
              expenses={expenses}
              categories={categories}
              onSelectCategory={onSelectCategory}
            />
          </div>
          <CategoryBudgets
            categories={categories}
            expenses={expenses}
            onSelectCategory={onSelectCategory}
            onManageCategories={onManageCategories}
          />
        </div>
        <QuickAddForm month={month} />
      </div>
    </div>
  );
}
