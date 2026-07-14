import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { defaultDateForMonth, monthDateBounds, formatMKD } from '@/utils/format';

interface QuickAddFormProps {
  month: string;
}

const fieldLabel = 'block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1.5';
const underline = 'w-full bg-transparent border-0 border-b border-rule-bold px-0.5 py-1.5 text-ink focus:outline-none focus:border-ink transition-colors';

export function QuickAddForm({ month }: QuickAddFormProps) {
  const { categories, getCategoryById } = useCategories();
  const { expenses, addExpense } = useExpenses(month);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateForMonth(month));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const dateBounds = monthDateBounds(month);

  // Warn if the entered amount would push the chosen category over its monthly limit.
  const selectedCat = categoryId ? getCategoryById(categoryId) : undefined;
  const limitWarning = (() => {
    if (!selectedCat?.monthlyLimit) return null;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return null;
    const spentInCat = expenses
      .filter((e) => e.categoryId === categoryId)
      .reduce((s, e) => s + e.amount, 0);
    const projected = spentInCat + num;
    if (projected <= selectedCat.monthlyLimit) return null;
    return `This puts ${selectedCat.name} at ${formatMKD(projected)}, over its ${formatMKD(selectedCat.monthlyLimit)} limit.`;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { setError('Enter a positive amount.'); return; }
    if (!categoryId) { setError('Select a category.'); return; }
    const entry = { amount: Math.round(num), categoryId, description: description.trim(), date };

    // Optimistic: with offline persistence the write is durably queued in
    // IndexedDB immediately (the promise only resolves once the server acks,
    // which never happens while offline). So we confirm as soon as it's queued
    // and only surface an error if the write is actually rejected.
    setError('');
    setAmount('');
    setDescription('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);

    try {
      await addExpense(entry);
    } catch (err) {
      console.error('Failed to record expense', err);
      setSuccess(false);
      setError(`Could not save ${formatMKD(entry.amount)}. Please add it again.`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative border-[1.5px] border-ink bg-white p-5 pt-6">
      <span className="absolute -top-2 left-4 bg-white px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        New entry
      </span>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>Amount</label>
          <div className="relative">
            <input
              type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className={`${underline} font-mono text-2xl font-semibold pr-8`}
            />
            <span className="absolute right-0 bottom-2 font-mono text-[11px] text-ink-soft pointer-events-none">ДЕН</span>
          </div>
        </div>
        <div>
          <label className={fieldLabel}>Date</label>
          <input type="date" value={date} min={dateBounds.min} max={dateBounds.max} onChange={(e) => setDate(e.target.value)} className={`${underline} font-mono text-lg sm:text-2xl`} />
        </div>
      </div>

      <div className="mt-4">
        <label className={fieldLabel}>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${underline} text-sm`}>
          <option value="">Select category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {limitWarning && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-debit">
            <span aria-hidden>⚠</span>
            <span>{limitWarning}</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className={fieldLabel}>Memo <span className="normal-case tracking-normal text-ink-soft">(optional)</span></label>
        <input
          type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Lidl groceries" maxLength={200}
          className={`${underline} text-sm`}
        />
      </div>

      {error && <p className="text-xs text-debit mt-3">{error}</p>}

      <button
        type="submit"
        className={`mt-5 w-full py-3 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
          success ? 'bg-credit text-white' : 'bg-ink text-paper hover:bg-black'
        }`}
      >
        {success ? '✓ Recorded' : 'Record expense'}
      </button>
    </form>
  );
}
