import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { useExpensesInRange } from '@/hooks/useExpensesInRange';
import { formatMKD, formatMonthShort, formatMonthLabel, recentMonths } from '@/utils/format';

const MONTHS_BACK = 6;

interface SpendingTrendProps {
  month: string; // the currently selected month — highlighted in the chart
}

export function SpendingTrend({ month }: SpendingTrendProps) {
  const months = recentMonths(MONTHS_BACK, month);
  const { expenses, loading } = useExpensesInRange(months);

  const totalByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  for (const e of expenses) {
    if (totalByMonth.has(e.month)) totalByMonth.set(e.month, totalByMonth.get(e.month)! + e.amount);
  }

  const data = months.map((m) => ({
    month: m,
    label: formatMonthShort(m),
    value: totalByMonth.get(m) ?? 0,
    current: m === month,
  }));

  const monthsWithSpend = data.filter((d) => d.value > 0);
  const avg = monthsWithSpend.length
    ? Math.round(monthsWithSpend.reduce((s, d) => s + d.value, 0) / monthsWithSpend.length)
    : 0;
  const peak = data.reduce((m, d) => (d.value > m.value ? d : m), data[0]);
  const hasData = monthsWithSpend.length > 0;

  return (
    <div className="bg-white rounded-lg border border-rule p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="eyebrow">Spending trend</h2>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
          Last {MONTHS_BACK} months
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasData ? (
        <p className="text-sm text-ink-soft py-8 text-center">No spending recorded in this period yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6A6F60', fontFamily: 'IBM Plex Mono, monospace' }}
                axisLine={{ stroke: '#B4B2A6' }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#F1F0EA' }}
                formatter={(value: number) => [formatMKD(value), 'Spent']}
                labelFormatter={(_label, payload) =>
                  payload?.[0] ? formatMonthLabel(payload[0].payload.month) : ''
                }
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
              <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={34}>
                {data.map((d) => (
                  <Cell key={d.month} fill={d.current ? '#23261D' : '#B4B2A6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-4">
            <Stat label="Monthly average" value={formatMKD(avg)} sub="across months with spend" />
            <Stat label="Highest month" value={formatMKD(peak.value)} sub={formatMonthLabel(peak.month)} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-mono tabular-nums text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-soft mt-0.5">{sub}</p>
    </div>
  );
}
