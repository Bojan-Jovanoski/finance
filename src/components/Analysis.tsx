import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { formatMKD, formatShortDate } from '@/utils/format';
import type { Budget } from '@/db/types';

interface AnalysisProps {
  month: string;
  budget: Budget;
}

export function Analysis({ month, budget }: AnalysisProps) {
  const { expenses } = useExpenses(month);
  const { getCategoryById } = useCategories();

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-rule p-8 text-center">
        <p className="text-sm text-ink-soft">No expenses this month yet — add some to see the analysis.</p>
      </div>
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const count = expenses.length;
  const avg = Math.round(total / count);

  const biggest = expenses.reduce((m, e) => (e.amount > m.amount ? e : m), expenses[0]);

  // Totals by category
  const catTotals = new Map<string, number>();
  for (const e of expenses) catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
  let topCatId = '';
  let topCatAmt = 0;
  catTotals.forEach((amt, id) => { if (amt > topCatAmt) { topCatAmt = amt; topCatId = id; } });

  // Totals by day
  const dayTotals = new Map<string, number>();
  for (const e of expenses) dayTotals.set(e.date, (dayTotals.get(e.date) ?? 0) + e.amount);
  let busyDay = '';
  let busyAmt = 0;
  dayTotals.forEach((amt, d) => { if (amt > busyAmt) { busyAmt = amt; busyDay = d; } });

  // Totals by person (attribution only exists on newer expenses)
  const spenderTotals = new Map<string, number>();
  let unattributed = 0;
  for (const e of expenses) {
    if (e.createdByName) spenderTotals.set(e.createdByName, (spenderTotals.get(e.createdByName) ?? 0) + e.amount);
    else unattributed += e.amount;
  }
  const spenders = [...spenderTotals.entries()].sort((a, b) => b[1] - a[1]);
  const spenderMax = Math.max(unattributed, ...spenders.map(([, amt]) => amt), 1);

  // Categories over their monthly limit
  const overLimit = [...catTotals.entries()]
    .map(([id, amt]) => ({ cat: getCategoryById(id), amt }))
    .filter((x) => x.cat?.monthlyLimit && x.amt > (x.cat.monthlyLimit ?? 0))
    .sort((a, b) => (b.amt - (b.cat!.monthlyLimit ?? 0)) - (a.amt - (a.cat!.monthlyLimit ?? 0)));

  const topCatPct = total > 0 ? Math.round((topCatAmt / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Biggest expense" value={formatMKD(biggest.amount)} mono
          sub={`${getCategoryById(biggest.categoryId)?.name ?? 'Uncategorised'}${biggest.description ? ` · ${biggest.description}` : ''} · ${formatShortDate(biggest.date)}`} />
        <MetricCard label="Top category" value={getCategoryById(topCatId)?.name ?? 'Uncategorised'}
          sub={`${formatMKD(topCatAmt)} · ${topCatPct}% of spend`} />
        <MetricCard label="Transactions" value={String(count)} mono
          sub={`${formatMKD(avg)} average each`} />
        <MetricCard label="Busiest day" value={busyDay ? formatShortDate(busyDay) : '—'} mono
          sub={formatMKD(busyAmt)} />
      </div>

      <div className="bg-white rounded-lg border border-rule p-5">
        <h2 className="eyebrow mb-4">Who spent what</h2>
        {spenders.length === 0 && unattributed === 0 ? (
          <p className="text-sm text-ink-soft">No attributed spending yet.</p>
        ) : (
          <div className="space-y-3">
            {spenders.map(([name, amt]) => (
              <SpenderRow key={name} name={name} amount={amt} total={total} max={spenderMax} />
            ))}
            {unattributed > 0 && (
              <SpenderRow name="Added before sharing" amount={unattributed} total={total} max={spenderMax} muted />
            )}
          </div>
        )}
      </div>

      {overLimit.length > 0 && (
        <div className="bg-white rounded-lg border border-rule p-5">
          <h2 className="eyebrow mb-3">Over monthly limit</h2>
          <ul className="space-y-2">
            {overLimit.map(({ cat, amt }) => (
              <li key={cat!.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{cat!.name}</span>
                <span className="font-mono text-ink-soft">
                  <span className="font-medium text-debit">{formatMKD(amt)}</span>
                  {' '}/ {formatMKD(cat!.monthlyLimit!)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-ink-soft px-1">
        Analysis for <span className="font-mono">{formatMKD(total)}</span> spent of <span className="font-mono">{formatMKD(budget.income - budget.savingsGoal)}</span> budget this month.
      </p>
    </div>
  );
}

function MetricCard({ label, value, sub, mono }: { label: string; value: string; sub: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-rule p-4">
      <p className="eyebrow mb-1.5">{label}</p>
      <p className={`text-lg font-semibold text-ink truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
      <p className="text-xs text-ink-soft mt-1 line-clamp-2">{sub}</p>
    </div>
  );
}

function SpenderRow({ name, amount, total, max, muted }: {
  name: string; amount: number; total: number; max: number; muted?: boolean;
}) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  const barPct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${muted ? 'text-ink-soft italic' : 'text-ink'}`}>{name}</span>
        <span className="font-mono text-sm">
          <span className={`font-semibold ${muted ? 'text-ink-soft' : 'text-ink'}`}>{formatMKD(amount)}</span>
          <span className="text-ink-soft ml-1.5 text-xs">{pct}%</span>
        </span>
      </div>
      <div className="h-2 bg-ledgerbar border border-rule overflow-hidden">
        <div className={`h-full ${muted ? 'bg-rule-bold' : 'bg-ink'}`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}
