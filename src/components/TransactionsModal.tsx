import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useExpensesInRange } from '@/hooks/useExpensesInRange';
import { useCategories } from '@/hooks/useCategories';
import { formatMKD, formatShortDate, recentMonths, currentMonth } from '@/utils/format';

// How far back the search window reaches. Firestore `in` caps at 30 months.
const MONTHS_BACK = 24;

type SortField = 'date' | 'amount';

interface TransactionsModalProps {
  onClose: () => void;
}

export function TransactionsModal({ onClose }: TransactionsModalProps) {
  const months = useMemo(() => recentMonths(MONTHS_BACK, currentMonth()), []);
  const { expenses, loading } = useExpensesInRange(months);
  const { categories, getCategoryById } = useCategories();

  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [person, setPerson] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Distinct spender names present in the data, for the person filter.
  const people = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) if (e.createdByName) set.add(e.createdByName);
    return [...set].sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    const rows = expenses.filter((e) => {
      if (categoryId && e.categoryId !== categoryId) return false;
      if (person && e.createdByName !== person) return false;
      if (q) {
        const catName = getCategoryById(e.categoryId)?.name ?? '';
        const hay = `${e.description} ${catName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows.sort((a, b) => {
      const cmp = sortField === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [expenses, text, categoryId, person, sortField, sortDir, getCategoryById]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? <span className="text-rule-bold">↕</span> : <span className="text-ink">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  const selectClass = 'bg-transparent border border-rule-bold rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-ink';

  return (
    <Modal title="Transactions" onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search memo or category…"
            className="flex-1 min-w-[160px] bg-transparent border-b border-rule-bold px-0.5 py-1.5 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {people.length > 1 && (
            <select value={person} onChange={(e) => setPerson(e.target.value)} className={selectClass}>
              <option value="">Anyone</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-10">
            {expenses.length === 0 ? 'No transactions in the last 24 months.' : 'No transactions match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule-bold">
                  <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft cursor-pointer hover:text-ink select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                    Date <SortIcon field="date" />
                  </th>
                  <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft whitespace-nowrap">Category</th>
                  <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft w-full">Memo</th>
                  <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft cursor-pointer hover:text-ink select-none whitespace-nowrap" onClick={() => toggleSort('amount')}>
                    Amount <SortIcon field="amount" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-ledgerbar hover:bg-ledgerbar">
                    <td className="py-2.5 pr-4 text-ink-soft whitespace-nowrap font-mono text-xs">
                      {formatShortDate(e.date)} <span className="text-rule-bold">'{e.date.slice(2, 4)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-ink whitespace-nowrap">{getCategoryById(e.categoryId)?.name ?? 'Other'}</td>
                    <td className="py-2.5 pr-4 text-ink-soft truncate max-w-[220px]">
                      {e.description || <span className="text-rule-bold italic">—</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-left font-mono font-medium text-ink whitespace-nowrap">{formatMKD(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-double border-ink">
                  <td colSpan={3} className="pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                    {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td className="pt-3 pr-4 text-left font-mono font-semibold text-ink whitespace-nowrap">{formatMKD(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
