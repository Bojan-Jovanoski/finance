import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';
import { useExpensesInRange } from '@/hooks/useExpensesInRange';
import { useAllBudgets } from '@/hooks/useAllBudgets';
import { formatMKD, formatMonthShort, formatMonthLabel, recentMonths } from '@/utils/format';

const MONTHS_BACK = 6;

interface SavingsTrackerProps {
  month: string;
}

// Tracks what was *actually* saved each month (income − spend) against the
// savings goal set for that month. Overspending shows up here as bars falling
// short of — or below — the goal line, which the monthly summary can't show
// on its own.
export function SavingsTracker({ month }: SavingsTrackerProps) {
  const months = recentMonths(MONTHS_BACK, month);
  const { expenses, loading } = useExpensesInRange(months);
  const budgets = useAllBudgets();

  const spentByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  for (const e of expenses) {
    if (spentByMonth.has(e.month)) spentByMonth.set(e.month, spentByMonth.get(e.month)! + e.amount);
  }

  const data = months.map((m) => {
    const budget = budgets[m];
    if (!budget) return { month: m, label: formatMonthShort(m), saved: null, goal: null };
    return {
      month: m,
      label: formatMonthShort(m),
      saved: budget.income - (spentByMonth.get(m) ?? 0),
      goal: budget.savingsGoal,
    };
  });

  const withData = data.filter((d) => d.saved !== null) as { month: string; label: string; saved: number; goal: number }[];
  const cumulative = withData.reduce((s, d) => s + d.saved, 0);
  const current = data.find((d) => d.month === month);
  const hasData = withData.length > 0;

  return (
    <div className="bg-white rounded-lg border border-rule p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="eyebrow">Savings tracker</h2>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
          Actual vs goal · {MONTHS_BACK}mo
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasData ? (
        <p className="text-sm text-ink-soft py-8 text-center">Set an income and savings goal for a month to start tracking.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6A6F60', fontFamily: 'IBM Plex Mono, monospace' }}
                axisLine={{ stroke: '#B4B2A6' }}
                tickLine={false}
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke="#B4B2A6" />
              <Tooltip
                cursor={{ fill: '#F1F0EA' }}
                formatter={(value: number, name: string) => [formatMKD(value), name === 'saved' ? 'Saved' : 'Goal']}
                labelFormatter={(_label, payload) => (payload?.[0] ? formatMonthLabel(payload[0].payload.month) : '')}
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
              <Bar dataKey="saved" radius={[2, 2, 0, 0]} barSize={30}>
                {data.map((d) => {
                  const met = d.saved !== null && d.goal !== null && d.saved >= d.goal;
                  const positive = d.saved !== null && d.saved >= 0;
                  return (
                    <Cell key={d.month} fill={met ? '#3B5540' : positive ? '#d69a2e' : '#9C2A24'} />
                  );
                })}
              </Bar>
              <Line
                dataKey="goal"
                type="monotone"
                stroke="#23261D"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={{ r: 2.5, fill: '#23261D' }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-credit" /> Met goal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Short</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-ink" /> Goal</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-4">
            {current && current.saved !== null ? (
              <Stat
                label={`Saved in ${formatMonthShort(month)}`}
                value={formatMKD(current.saved)}
                sub={
                  current.saved >= current.goal!
                    ? `${formatMKD(current.saved - current.goal!)} over goal`
                    : `${formatMKD(current.goal! - current.saved)} short of goal`
                }
                tone={current.saved >= current.goal! ? 'credit' : 'debit'}
              />
            ) : (
              <Stat label={`Saved in ${formatMonthShort(month)}`} value="—" sub="no budget set" />
            )}
            <Stat label={`Saved over ${withData.length}mo`} value={formatMKD(cumulative)} sub="cumulative actual" tone={cumulative >= 0 ? 'credit' : 'debit'} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'credit' | 'debit' }) {
  const toneClass = tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-ink';
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className={`font-mono tabular-nums text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-soft mt-0.5">{sub}</p>
    </div>
  );
}
