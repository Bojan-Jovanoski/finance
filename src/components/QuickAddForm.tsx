import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { defaultDateForMonth } from '@/utils/format';

interface QuickAddFormProps {
  month: string;
}

const fieldLabel = 'block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1.5';
const underline = 'w-full bg-transparent border-0 border-b border-rule-bold px-0.5 py-1.5 text-ink focus:outline-none focus:border-ink transition-colors';

export function QuickAddForm({ month }: QuickAddFormProps) {
  const { categories } = useCategories();
  const { addExpense } = useExpenses(month);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateForMonth(month));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { setError('Enter a positive amount.'); return; }
    if (!categoryId) { setError('Select a category.'); return; }
    setError('');
    await addExpense({ amount: Math.round(num), categoryId, description: description.trim(), date });
    setAmount('');
    setDescription('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
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
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${underline} font-mono text-2xl`} />
        </div>
      </div>

      <div className="mt-4">
        <label className={fieldLabel}>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${underline} text-sm`}>
          <option value="">Select category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
