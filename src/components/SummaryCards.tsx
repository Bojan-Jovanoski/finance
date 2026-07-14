import { useState } from 'react';
import { formatMKD, isCurrentMonth, daysInMonth, currentDayOfMonth } from '@/utils/format';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import type { Budget } from '@/db/types';
import { ConfirmDialog } from './ConfirmDialog';

interface SummaryCardsProps {
  budget: Budget;
  totalSpent: number;
  month: string;
}

export function SummaryCards({ budget, totalSpent, month }: SummaryCardsProps) {
  const { saveBudget } = useMonthBudget(month);
  const [editing, setEditing] = useState(false);
  const [income, setIncome] = useState(String(budget.income));
  const [savingsGoal, setSavingsGoal] = useState(String(budget.savingsGoal));
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const spendable = budget.income - budget.savingsGoal;
  const remaining = spendable - totalSpent;
  const isOverBudget = remaining < 0;
  const spentPct = spendable > 0 ? Math.min(100, Math.round((totalSpent / spendable) * 100)) : 0;

  // What actually ends up saved = income − spend (identity: savingsGoal + remaining).
  // When over budget this drops below the goal, so overspending really does eat savings.
  const actualSaved = budget.income - totalSpent;

  // Month-end projection at the current spending pace (current month only).
  const showProjection = isCurrentMonth(month) && totalSpent > 0;
  const dim = daysInMonth(month);
  const dayNo = Math.min(currentDayOfMonth(), dim);
  const projected = dayNo > 0 ? Math.round((totalSpent / dayNo) * dim) : totalSpent;
  const projectedOver = projected - spendable; // positive → projected to overshoot spendable

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const inc = parseFloat(income);
    const sav = parseFloat(savingsGoal);
    if (isNaN(inc) || inc < 0) { setError('Invalid income.'); return; }
    if (isNaN(sav) || sav < 0) { setError('Invalid savings goal.'); return; }
    if (sav > inc) { setError('Savings goal cannot exceed income.'); return; }
    saveBudget(Math.round(inc), Math.round(sav));
    setEditing(false);
    setError('');
  }

  function handleCancelEdit() {
    const changed = parseFloat(income) !== budget.income || parseFloat(savingsGoal) !== budget.savingsGoal;
    if (changed) { setConfirmDiscard(true); } else { setEditing(false); }
  }

  return (
    <>
      <section>
        <div className="eyebrow mb-3">Statement summary</div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <EditLine label="Income" value={income} onChange={setIncome} />
            <EditLine label="Savings goal" value={savingsGoal} onChange={setSavingsGoal} />
            {error && <p className="text-xs text-debit">{error}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="font-mono text-xs uppercase tracking-wider bg-ink text-paper px-3 py-1.5 rounded-md hover:bg-black transition-colors">
                Save
              </button>
              <button type="button" onClick={handleCancelEdit} className="text-xs text-ink-soft hover:text-ink transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <Line label="Income" value={formatMKD(budget.income)} />
            <Line label="Savings goal" value={`−${formatMKD(budget.savingsGoal)}`} tone="credit" />
            <Line label="Spendable" value={formatMKD(spendable)} rule />
            <Line label="Spent this month" value={`−${formatMKD(totalSpent)}`} tone="debit" />
            <Line
              label="Remaining"
              value={`${isOverBudget ? '−' : ''}${formatMKD(Math.abs(remaining))}`}
              grand
              tone={isOverBudget ? 'debit' : 'credit'}
            />

            <div className="mt-4">
              <div className="h-1.5 bg-ledgerbar border border-rule rounded-sm overflow-hidden">
                <div
                  className={`h-full ${isOverBudget ? 'bg-debit' : 'bg-ink'}`}
                  style={{ width: `${isOverBudget ? 100 : spentPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[11px] text-ink-soft">{spentPct}% of budget used</span>
                <span className="font-mono text-[11px] text-ink-soft">{formatMKD(spendable)}</span>
              </div>
            </div>

            {showProjection && (
              <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-2.5">
                <span className="text-xs text-ink-soft">Projected month-end pace</span>
                <span className="font-mono text-xs">
                  <span className="font-medium text-ink">{formatMKD(projected)}</span>
                  <span className={`ml-2 ${projectedOver > 0 ? 'text-debit' : 'text-credit'}`}>
                    {projectedOver > 0
                      ? `${formatMKD(projectedOver)} over`
                      : `${formatMKD(-projectedOver)} to spare`}
                  </span>
                </span>
              </div>
            )}

            {isOverBudget && (
              <p className="mt-2.5 text-xs text-debit leading-relaxed">
                {actualSaved >= 0
                  ? `Over budget — you'll actually save ${formatMKD(actualSaved)} of your ${formatMKD(budget.savingsGoal)} goal (${formatMKD(budget.savingsGoal - actualSaved)} short).`
                  : `Over budget — spending exceeds income by ${formatMKD(-actualSaved)}, dipping into savings.`}
              </p>
            )}

            <button
              onClick={() => { setIncome(String(budget.income)); setSavingsGoal(String(budget.savingsGoal)); setEditing(true); }}
              className="mt-3 text-xs text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit budget
            </button>
          </>
        )}
      </section>

      {confirmDiscard && (
        <ConfirmDialog
          message="Discard unsaved changes to income and savings goal?"
          confirmLabel="Discard"
          onConfirm={() => { setEditing(false); setConfirmDiscard(false); setIncome(String(budget.income)); setSavingsGoal(String(budget.savingsGoal)); }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </>
  );
}

function Line({ label, value, muted, rule, grand, tone }: {
  label: string;
  value: string;
  muted?: boolean;
  rule?: boolean;
  grand?: boolean;
  tone?: 'debit' | 'credit';
}) {
  const toneClass = tone === 'debit' ? 'text-debit' : tone === 'credit' ? 'text-credit' : 'text-ink';
  return (
    <div
      className={`flex items-baseline py-1.5 ${rule ? 'border-t border-rule-bold mt-1 pt-2.5' : ''} ${grand ? 'border-t-2 border-double border-ink mt-1 pt-3' : ''}`}
    >
      <span className={`text-sm ${muted ? 'text-ink-soft' : grand ? 'text-ink font-medium' : 'text-ink'}`}>{label}</span>
      <span className="flex-1 mx-2 border-b border-dotted border-rule-bold translate-y-[-3px]" />
      <span className={`font-mono tabular-nums whitespace-nowrap ${grand ? `text-xl font-semibold ${toneClass}` : tone ? toneClass : muted ? 'text-ink-soft' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}

function EditLine({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-baseline py-1.5">
      <label className="text-sm text-ink">{label}</label>
      <span className="flex-1 mx-2 border-b border-dotted border-rule-bold translate-y-[-3px]" />
      <input
        type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-32 text-right font-mono tabular-nums text-ink bg-transparent border-b border-ink focus:outline-none focus:border-b-2 pb-0.5"
      />
    </div>
  );
}
