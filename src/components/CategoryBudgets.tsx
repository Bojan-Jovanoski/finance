import { formatMKD } from '@/utils/format';
import type { Category, Expense } from '@/db/types';

interface CategoryBudgetsProps {
  categories: Category[];
  expenses: Expense[];
  onSelectCategory: (id: string) => void;
  onManageCategories: () => void;
}

// Progress toward each category's monthly limit for the selected month.
// Unlike the spending chart's legend, this lists limited categories even when
// nothing has been spent in them yet — so limits stay visible before they bite.
export function CategoryBudgets({ categories, expenses, onSelectCategory, onManageCategories }: CategoryBudgetsProps) {
  const spentByCategory = new Map<string, number>();
  for (const e of expenses) {
    spentByCategory.set(e.categoryId, (spentByCategory.get(e.categoryId) ?? 0) + e.amount);
  }

  const rows = categories
    .filter((c) => typeof c.monthlyLimit === 'number' && c.monthlyLimit > 0)
    .map((c) => {
      const spent = spentByCategory.get(c.id!) ?? 0;
      const limit = c.monthlyLimit!;
      return { id: c.id!, name: c.name, spent, limit, pct: Math.round((spent / limit) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-white border border-rule rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <span className="eyebrow">Category budgets</span>
        {rows.length > 0 && (
          <button
            onClick={onManageCategories}
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink transition-colors"
          >
            Edit limits
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No category limits set yet.{' '}
          <button onClick={onManageCategories} className="underline hover:text-ink transition-colors">
            Set monthly limits
          </button>{' '}
          to track spending against a cap.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((r) => {
            const over = r.pct > 100;
            const near = r.pct >= 80 && r.pct <= 100;
            const remaining = r.limit - r.spent;
            return (
              <li key={r.id}>
                <button onClick={() => onSelectCategory(r.id)} className="w-full text-left group">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-ink group-hover:underline">{r.name}</span>
                    <span className="font-mono text-xs text-ink-soft">
                      <span className={`font-medium ${over ? 'text-debit' : 'text-ink'}`}>{formatMKD(r.spent)}</span>
                      {' / '}{formatMKD(r.limit)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-ledgerbar border border-rule rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${over ? 'bg-debit' : near ? 'bg-caution' : 'bg-credit'}`}
                      style={{ width: `${Math.min(100, r.pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`font-mono text-[11px] ${over ? 'text-debit' : near ? 'text-caution' : 'text-ink-soft'}`}>
                      {r.pct}% used
                    </span>
                    <span className={`font-mono text-[11px] ${over ? 'text-debit' : 'text-ink-soft'}`}>
                      {over ? `${formatMKD(-remaining)} over` : `${formatMKD(remaining)} left`}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
