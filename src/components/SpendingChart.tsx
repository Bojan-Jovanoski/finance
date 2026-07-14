import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';
import type { Category, Expense } from '@/db/types';
import { formatMKD } from '@/utils/format';

const COLORS = [
  '#c8622e', '#b23b34', '#3f8f63', '#3aa0a6', '#5b6bd6',
  '#4f8ad6', '#cf4d92', '#8bbf3f', '#7d5bd6', '#d69a2e',
  '#6a7052', '#a16207', '#0f766e',
];

interface SpendingChartProps {
  expenses: Expense[];
  categories: Category[];
  onSelectCategory: (id: string) => void;
}

interface ChartEntry {
  id: string;
  name: string;
  value: number;
  color: string;
  limit?: number;
}

type ChartType = 'pie' | 'bar';

export function SpendingChart({ expenses, categories, onSelectCategory }: SpendingChartProps) {
  const [chartType, setChartType] = useState<ChartType>('pie');
  const categoryMap = new Map(categories.map((c) => [c.id!, c]));
  // Stable color per category: keyed by the category's position in the
  // name-ordered categories list, so a category keeps its color regardless of
  // how expenses reorder on add/edit/live-sync.
  const colorByCategory = new Map(categories.map((c, i) => [c.id!, COLORS[i % COLORS.length]]));

  const grouped = expenses.reduce<Map<string, number>>((acc, exp) => {
    acc.set(exp.categoryId, (acc.get(exp.categoryId) ?? 0) + exp.amount);
    return acc;
  }, new Map());

  const data: ChartEntry[] = Array.from(grouped.entries())
    .map(([id, value]) => ({
      id,
      name: categoryMap.get(id)?.name ?? 'Unknown',
      value,
      color: colorByCategory.get(id) ?? COLORS[COLORS.length - 1],
      limit: categoryMap.get(id)?.monthlyLimit,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <p className="text-sm text-ink-soft">No expenses yet this month.</p>
      </div>
    );
  }

  const barHeight = Math.max(220, data.length * 40);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Spending by category</span>
        <div className="inline-flex border border-rule-bold rounded-md overflow-hidden">
          {(['pie', 'bar'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                chartType === type ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {chartType === 'pie' ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={2}
              dataKey="value"
              onClick={(entry: ChartEntry) => onSelectCategory(entry.id)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatMKD(value), 'Amount']}
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid #B4B2A6',
                background: '#F7F6F2',
                boxShadow: 'none',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono, monospace',
                padding: '6px 10px',
                color: '#23261D',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 76, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fontSize: 11, fill: '#6A6F60' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              radius={[0, 2, 2, 0]}
              onClick={(entry: ChartEntry) => onSelectCategory(entry.id)}
              style={{ cursor: 'pointer' }}
              barSize={18}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => formatMKD(v)}
                style={{ fontSize: 10, fill: '#6A6F60', fontFamily: 'IBM Plex Mono, monospace' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="border-t border-ink">
        {data.map((entry) => {
          const limitPct = entry.limit ? Math.round((entry.value / entry.limit) * 100) : null;
          const overLimit = limitPct !== null && limitPct > 100;
          const nearLimit = limitPct !== null && limitPct >= 80 && limitPct <= 100;

          return (
            <button
              key={entry.id}
              onClick={() => onSelectCategory(entry.id)}
              className="w-full flex items-center gap-3 px-2 py-2.5 text-left border-b border-rule hover:bg-ledgerbar transition-colors group"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-ink truncate">{entry.name}</p>
                  {entry.limit && (
                    <span
                      className={`shrink-0 font-mono text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-sm border ${
                        overLimit
                          ? 'text-debit border-debit/40 bg-debit/10'
                          : nearLimit
                          ? 'text-caution border-caution/40 bg-caution/10'
                          : 'text-credit border-credit/30 bg-credit/10'
                      }`}
                    >
                      {overLimit ? `${limitPct}% · over` : `${limitPct}% of limit`}
                    </span>
                  )}
                </div>
                {entry.limit && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-ledgerbar rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className={`h-full ${overLimit ? 'bg-debit' : nearLimit ? 'bg-caution' : 'bg-credit'}`}
                        style={{ width: `${Math.min(100, limitPct!)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {formatMKD(entry.value)} / {formatMKD(entry.limit)}
                    </span>
                  </div>
                )}
              </div>
              <span className="font-mono text-[11px] text-ink-soft w-10 text-right">
                {Math.round((entry.value / total) * 100)}%
              </span>
              <span className={`font-mono text-sm font-medium w-24 text-right ${overLimit ? 'text-debit' : 'text-ink'}`}>
                {formatMKD(entry.value)}
              </span>
              <svg className="w-3.5 h-3.5 text-rule-bold group-hover:text-ink transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
        <div className="flex items-center px-2 pt-3 border-t-2 border-double border-ink">
          <span className="text-sm font-medium text-ink flex-1">Total debits</span>
          <span className="font-mono text-sm font-semibold text-ink">{formatMKD(total)}</span>
        </div>
      </div>
    </div>
  );
}
