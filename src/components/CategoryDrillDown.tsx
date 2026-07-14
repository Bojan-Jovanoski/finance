import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { formatMKD, formatShortDate, formatMonthLabel } from '@/utils/format';
import type { Category, Expense } from '@/db/types';

type SortField = 'date' | 'description' | 'amount';
type SortDir = 'asc' | 'desc';

interface CategoryDrillDownProps {
  categoryId: string;
  month: string;
  onClose: () => void;
}

interface EditState {
  amount: string;
  description: string;
  date: string;
  categoryId: string;
}

export function CategoryDrillDown({ categoryId, month, onClose }: CategoryDrillDownProps) {
  const { expenses, updateExpense, deleteExpense } = useExpenses(month);
  const { categories, getCategoryById } = useCategories();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ amount: '', description: '', date: '' });
  const [editError, setEditError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const category = getCategoryById(categoryId);
  const categoryExpenses = expenses.filter((e) => e.categoryId === categoryId);

  const sorted = [...categoryExpenses].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') cmp = a.date.localeCompare(b.date);
    else if (sortField === 'description') cmp = a.description.localeCompare(b.description);
    else cmp = a.amount - b.amount;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = categoryExpenses.reduce((s, e) => s + e.amount, 0);
  const limit = category?.monthlyLimit;
  const hasLimit = typeof limit === 'number' && limit > 0;
  const remaining = hasLimit ? limit - total : 0;
  const isOver = hasLimit && remaining < 0;
  const spentPct = hasLimit ? Math.min(100, Math.round((total / limit) * 100)) : 0;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function startEdit(exp: Expense) {
    setEditingId(exp.id!);
    setEditState({ amount: String(exp.amount), description: exp.description, date: exp.date, categoryId: exp.categoryId });
    setEditError('');
  }

  async function saveEdit(id: string) {
    const num = parseFloat(editState.amount);
    if (isNaN(num) || num <= 0) { setEditError('Enter a positive amount.'); return; }
    if (!editState.categoryId) { setEditError('Select a category.'); return; }
    await updateExpense(id, {
      amount: Math.round(num),
      description: editState.description.trim(),
      date: editState.date,
      categoryId: editState.categoryId,
    });
    setEditingId(null);
    setEditError('');
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? <span className="text-rule-bold">↕</span> : <span className="text-ink">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  return (
    <>
      <Modal title={category?.name ?? 'Category'} onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-6 space-y-5">
          {/* Statement summary — the category's standing for the month at a glance. */}
          <section className="bg-ledgerbar border border-rule rounded-md px-4 pt-3.5 pb-4">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="eyebrow">Category statement</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
                {formatMonthLabel(month)}
              </span>
            </div>

            {hasLimit ? (
              <>
                <Line label="Monthly limit" value={formatMKD(limit)} />
                <Line label="Spent" value={`−${formatMKD(total)}`} tone="debit" rule />
                <Line
                  label={isOver ? 'Over by' : 'Remaining'}
                  value={`${isOver ? '−' : ''}${formatMKD(Math.abs(remaining))}`}
                  grand
                  tone={isOver ? 'debit' : 'credit'}
                />
                <div className="mt-3.5">
                  <div className="h-1.5 bg-white border border-rule rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${isOver ? 'bg-debit' : 'bg-ink'}`}
                      style={{ width: `${isOver ? 100 : spentPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="font-mono text-[11px] text-ink-soft">{spentPct}% of limit used</span>
                    <span className="font-mono text-[11px] text-ink-soft">{formatMKD(limit)}</span>
                  </div>
                </div>
              </>
            ) : (
              <Line label="Total spent" value={formatMKD(total)} grand />
            )}
          </section>

          {categoryExpenses.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-8">No expenses in this category.</p>
          ) : (
            <div>
              <div className="eyebrow mb-2">Entries</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rule-bold">
                      <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft cursor-pointer hover:text-ink select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                        Date <SortIcon field="date" />
                      </th>
                      <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft cursor-pointer hover:text-ink select-none whitespace-nowrap w-full" onClick={() => toggleSort('description')}>
                        Description <SortIcon field="description" />
                      </th>
                      <th className="text-left py-2 pr-4 font-mono uppercase text-[10px] tracking-wider font-normal text-ink-soft cursor-pointer hover:text-ink select-none whitespace-nowrap" onClick={() => toggleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((exp) =>
                      editingId === exp.id ? (
                        <EditRow key={exp.id} state={editState} error={editError} categories={categories} onChange={setEditState}
                          onSave={() => saveEdit(exp.id!)} onCancel={() => { setEditingId(null); setEditError(''); }} />
                      ) : (
                        <tr key={exp.id} className="border-b border-ledgerbar hover:bg-ledgerbar group">
                          <td className="py-2.5 pr-4 text-ink-soft whitespace-nowrap font-mono text-sm">{formatShortDate(exp.date)}</td>
                          <td className="py-2.5 pr-4 text-ink truncate max-w-[200px]">
                            {exp.description || <span className="text-rule-bold italic">—</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-left font-mono font-medium text-ink whitespace-nowrap">{formatMKD(exp.amount)}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(exp)} title="Edit"
                                className="w-6 h-6 flex items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-white transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button onClick={() => setDeleteTargetId(exp.id!)} title="Delete"
                                className="w-6 h-6 flex items-center justify-center rounded text-ink-soft hover:text-debit hover:bg-debit/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-double border-ink">
                      <td colSpan={2} className="pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                        {categoryExpenses.length} entr{categoryExpenses.length !== 1 ? 'ies' : 'y'}
                      </td>
                      <td className="pt-3 pr-4 text-left font-mono font-semibold text-ink whitespace-nowrap">{formatMKD(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {deleteTargetId !== null && (
        <ConfirmDialog message="Delete this expense? This cannot be undone." confirmLabel="Delete"
          onConfirm={() => { deleteExpense(deleteTargetId); setDeleteTargetId(null); }}
          onCancel={() => setDeleteTargetId(null)} />
      )}
    </>
  );
}

/* Leader-dot statement line — label, dotted rule, mono right-aligned figure. */
function Line({ label, value, rule, grand, tone }: {
  label: string;
  value: string;
  rule?: boolean;
  grand?: boolean;
  tone?: 'debit' | 'credit';
}) {
  const toneClass = tone === 'debit' ? 'text-debit' : tone === 'credit' ? 'text-credit' : 'text-ink';
  return (
    <div className={`flex items-baseline py-1 ${rule ? 'border-t border-rule mt-1 pt-2' : ''} ${grand ? 'border-t-2 border-double border-ink mt-1 pt-2.5' : ''}`}>
      <span className={`text-sm ${grand ? 'text-ink font-medium' : 'text-ink'}`}>{label}</span>
      <span className="flex-1 mx-2 border-b border-dotted border-rule-bold translate-y-[-3px]" />
      <span className={`font-mono tabular-nums whitespace-nowrap ${grand ? `text-lg font-semibold ${toneClass}` : tone ? toneClass : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}

function EditRow({ state, error, categories, onChange, onSave, onCancel }: {
  state: EditState; error: string; categories: Category[];
  onChange: (s: EditState) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <tr className="border-b border-rule bg-ledgerbar/50">
      <td className="py-1.5 pr-3 align-top">
        <input type="date" value={state.date} onChange={(e) => onChange({ ...state, date: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-rule rounded-md focus:outline-none focus:ring-1 focus:ring-ink" />
      </td>
      <td className="py-1.5 pr-3 align-top">
        <div className="space-y-1.5">
          <select value={state.categoryId} onChange={(e) => onChange({ ...state, categoryId: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-rule rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-ink"
            title="Move to category">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={state.description} onChange={(e) => onChange({ ...state, description: e.target.value })} placeholder="Description"
            className="w-full px-2 py-1 text-xs border border-rule rounded-md focus:outline-none focus:ring-1 focus:ring-ink" />
        </div>
        {error && <p className="text-xs text-debit mt-0.5">{error}</p>}
      </td>
      <td className="py-1.5 pr-3 align-top">
        <input type="number" min="1" step="1" value={state.amount} onChange={(e) => onChange({ ...state, amount: e.target.value })}
          className="w-full px-2 py-1 text-xs text-right border border-rule rounded-md focus:outline-none focus:ring-1 focus:ring-ink" />
      </td>
      <td className="py-1.5 align-top">
        <div className="flex items-center gap-1">
          <button onClick={onSave} title="Save" className="w-6 h-6 flex items-center justify-center rounded text-credit hover:bg-ledgerbar transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button onClick={onCancel} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded text-ink-soft hover:bg-rule transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
