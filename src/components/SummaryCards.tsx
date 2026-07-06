import { useState } from 'react';
import { formatMKD } from '@/utils/format';
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
    const incChanged = parseFloat(income) !== budget.income;
    const savChanged = parseFloat(savingsGoal) !== budget.savingsGoal;
    if (incChanged || savChanged) {
      setConfirmDiscard(true);
    } else {
      setEditing(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {isOverBudget && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">
              You're <strong>{formatMKD(Math.abs(remaining))}</strong> over budget — eating into savings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            label="Income"
            value={formatMKD(budget.income)}
            color="slate"
            editing={editing}
            editContent={
              <input
                type="number"
                min="0"
                step="1"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-600 pb-0.5"
              />
            }
          />
          <Card
            label="Savings goal"
            value={formatMKD(budget.savingsGoal)}
            color="indigo"
            editing={editing}
            editContent={
              <input
                type="number"
                min="0"
                step="1"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-600 pb-0.5"
              />
            }
          />
          <Card
            label="Total spent"
            value={formatMKD(totalSpent)}
            sub={spendable > 0 ? `${Math.min(100, Math.round((totalSpent / spendable) * 100))}% of budget` : undefined}
            color={isOverBudget ? 'red' : 'slate'}
          />
          <Card
            label="Remaining"
            value={formatMKD(Math.abs(remaining))}
            sub={isOverBudget ? 'over budget' : 'left to spend'}
            color={isOverBudget ? 'red' : remaining < spendable * 0.2 ? 'amber' : 'green'}
          />
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <form onSubmit={handleSave} className="flex items-center gap-2">
              <button
                type="submit"
                className="text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
              >
                Save changes
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
            </form>
          ) : (
            <button
              onClick={() => {
                setIncome(String(budget.income));
                setSavingsGoal(String(budget.savingsGoal));
                setEditing(true);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit budget
            </button>
          )}
        </div>
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          message="Discard unsaved changes to income and savings goal?"
          confirmLabel="Discard"
          onConfirm={() => {
            setEditing(false);
            setConfirmDiscard(false);
            setIncome(String(budget.income));
            setSavingsGoal(String(budget.savingsGoal));
          }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </>
  );
}

type CardColor = 'slate' | 'indigo' | 'red' | 'amber' | 'green';

function Card({
  label,
  value,
  sub,
  color,
  editing,
  editContent,
}: {
  label: string;
  value: string;
  sub?: string;
  color: CardColor;
  editing?: boolean;
  editContent?: React.ReactNode;
}) {
  const accent: Record<CardColor, string> = {
    slate: 'text-slate-900',
    indigo: 'text-indigo-700',
    red: 'text-red-600',
    amber: 'text-amber-600',
    green: 'text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      {editing && editContent ? (
        editContent
      ) : (
        <p className={`text-base font-semibold ${accent[color]}`}>{value}</p>
      )}
      {sub && !editing && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
