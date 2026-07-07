import { useState } from 'react';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import { formatMonthLabel } from '@/utils/format';

interface MonthSetupProps {
  month: string;
}

export function MonthSetup({ month }: MonthSetupProps) {
  const { saveBudget } = useMonthBudget(month);
  const [income, setIncome] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inc = parseFloat(income);
    const sav = parseFloat(savingsGoal);
    if (!income || isNaN(inc) || inc < 0) { setError('Enter a valid income amount.'); return; }
    if (!savingsGoal || isNaN(sav) || sav < 0) { setError('Enter a valid savings goal.'); return; }
    if (sav > inc) { setError('Savings goal cannot exceed income.'); return; }
    setError('');
    saveBudget(Math.round(inc), Math.round(sav));
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Set up {formatMonthLabel(month)}</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your income and savings goal to get started.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly income</label>
            <div className="relative">
              <input type="number" min="0" step="1" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0"
                className="w-full px-4 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">ден</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Savings goal</label>
            <div className="relative">
              <input type="number" min="0" step="1" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="0"
                className="w-full px-4 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">ден</span>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
            Get started
          </button>
        </form>
      </div>
    </div>
  );
}
