import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Category, Expense } from '@/db/types';
import { formatMKD } from '@/utils/format';

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16',
  '#64748b', '#a16207', '#0f766e',
];

interface SpendingChartProps {
  expenses: Expense[];
  categories: Category[];
  onSelectCategory: (id: number) => void;
}

interface ChartEntry {
  id: number;
  name: string;
  value: number;
  color: string;
}

export function SpendingChart({ expenses, categories, onSelectCategory }: SpendingChartProps) {
  const categoryMap = new Map(categories.map((c) => [c.id!, c]));

  const grouped = expenses.reduce<Map<number, number>>((acc, exp) => {
    acc.set(exp.categoryId, (acc.get(exp.categoryId) ?? 0) + exp.amount);
    return acc;
  }, new Map());

  const data: ChartEntry[] = Array.from(grouped.entries())
    .map(([id, value], i) => ({
      id,
      name: categoryMap.get(id)?.name ?? 'Unknown',
      value,
      color: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        No expenses yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            onClick={(entry: ChartEntry) => onSelectCategory(entry.id)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatMKD(value)}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-1.5">
        {data.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectCategory(entry.id)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group text-left"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-700 flex-1 truncate">{entry.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {Math.round((entry.value / total) * 100)}%
              </span>
              <span className="text-sm font-medium text-slate-800">{formatMKD(entry.value)}</span>
              <svg
                className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
