import { useState } from 'react';
import { formatMKD } from '@/utils/format';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import type { Budget } from '@/db/types';
import { ConfirmDialog } from './ConfirmDialog';

interface SummaryCardsProps {
  uid: string;
  budget: Budget;
  totalSpent: number;
  month: string;
}

export function SummaryCards({ uid, budget, totalSpent, month }: SummaryCardsProps) {
  const { saveBudget } = useMonthBudget(uid, month);
  const [editing, setEditing] = useState(false);
  const [income, setIncome] = useState(String(budget.income));
  const [savingsGoal, setSavingsGoal] = useState(String(budget.savingsGoal));
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const spendable = budget.income - budget.savingsGoal;
  const remaining = spendable - totalSpent;
  const isOverBudget = remaining < 0;
  const spentPct = spendable > 0 ? Math.min(100, Math.round((totalSpent / spendable) * 100)) : 0;

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
      <div className="space-y-3">
        {isOverBudget && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-700">
              Over budget by <strong>{formatMKD(Math.abs(remaining))}</strong>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Income"
            value={formatMKD(budget.income)}
            accent="slate"
            editing={editing}
            editContent={
              <input
                type="number" min="0" step="1" value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full text-lg font-bold bg-transparent border-b-2 border-indigo-400 focus:outline-none focus:border-indigo-600 pb-0.5"
              />
            }
          />
          <StatCard
            label="Savings goal"
            value={formatMKD(budget.savingsGoal)}
            accent="indigo"
            editing={editing}
            editContent={
              <input
                type="number" min="0" step="1" value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full text-lg font-bold bg-transparent border-b-2 border-indigo-400 focus:outline-none focus:border-indigo-600 pb-0.5"
              />
            }
          />

          <div className={`bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border p-4 col-span-2 ${isOverBudget ? 'border-red-100' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Spent this month</p>
                <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatMKD(totalSpent)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">{isOverBudget ? 'Over budget' : 'Remaining'}</p>
                <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : remaining < spendable * 0.2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatMKD(Math.abs(remaining))}
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? 'bg-red-500' : spentPct > 80 ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${spentPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{spentPct}% of {formatMKD(spendable)} budget used</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          {editing ? (
            <form onSubmit={handleSave} className="flex items-center gap-2">
              <button type="submit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                Save changes
              </button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Cancel
              </button>
              {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
            </form>
          ) : (
            <button
              onClick={() => { setIncome(String(budget.income)); setSavingsGoal(String(budget.savingsGoal)); setEditing(true); }}
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
          onConfirm={() => { setEditing(false); setConfirmDiscard(false); setIncome(String(budget.income)); setSavingsGoal(String(budget.savingsGoal)); }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </>
  );
}

type CardAccent = 'slate' | 'indigo';

function StatCard({ label, value, accent, editing, editContent }: {
  label: string; value: string; accent: CardAccent;
  editing?: boolean; editContent?: React.ReactNode;
}) {
  const valueColor: Record<CardAccent, string> = {
    slate: 'text-slate-900',
    indigo: 'text-indigo-700',
  };
  const dotColor: Record<CardAccent, string> = {
    slate: 'bg-slate-300',
    indigo: 'bg-indigo-400',
  };
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-100 p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[accent]}`} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      {editing && editContent ? editContent : (
        <p className={`text-lg font-bold ${valueColor[accent]}`}>{value}</p>
      )}
    </div>
  );
}
