import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';
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

  const grouped = expenses.reduce<Map<string, number>>((acc, exp) => {
    acc.set(exp.categoryId, (acc.get(exp.categoryId) ?? 0) + exp.amount);
    return acc;
  }, new Map());

  const data: ChartEntry[] = Array.from(grouped.entries())
    .map(([id, value], i) => ({
      id,
      name: categoryMap.get(id)?.name ?? 'Unknown',
      value,
      color: COLORS[i % COLORS.length],
      limit: categoryMap.get(id)?.monthlyLimit,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm text-slate-400">No expenses yet</p>
      </div>
    );
  }

  const barHeight = Math.max(220, data.length * 40);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Total <span className="font-semibold text-slate-700">{formatMKD(total)}</span>
        </p>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['pie', 'bar'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                chartType === type
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
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
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                fontSize: '12px',
                padding: '8px 12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 76, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              radius={[0, 5, 5, 0]}
              onClick={(entry: ChartEntry) => onSelectCategory(entry.id)}
              style={{ cursor: 'pointer' }}
              barSize={20}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => formatMKD(v)}
                style={{ fontSize: 10, fill: '#94a3b8' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-0.5">
        {data.map((entry) => {
          const limitPct = entry.limit ? Math.round((entry.value / entry.limit) * 100) : null;
          const overLimit = limitPct !== null && limitPct > 100;
          const nearLimit = limitPct !== null && limitPct >= 80 && limitPct <= 100;

          return (
            <button
              key={entry.id}
              onClick={() => onSelectCategory(entry.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-slate-100 transition-colors group text-left ${
                overLimit ? 'hover:bg-red-50' : 'hover:bg-slate-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 truncate">{entry.name}</p>
                {entry.limit && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className={`h-full rounded-full ${overLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, limitPct!)}%` }}
                      />
                    </div>
                    <span className={`text-xs tabular-nums ${overLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-slate-400'}`}>
                      {limitPct}% of {formatMKD(entry.limit)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!entry.limit && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    {Math.round((entry.value / total) * 100)}%
                  </span>
                )}
                <span className={`text-sm font-semibold tabular-nums ${overLimit ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatMKD(entry.value)}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-slate-200 group-hover:text-indigo-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
