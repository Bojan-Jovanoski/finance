import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { formatMKD, formatShortDate } from '@/utils/format';
import type { Expense } from '@/db/types';

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
}

export function CategoryDrillDown({ categoryId, month, onClose }: CategoryDrillDownProps) {
  const { expenses, updateExpense, deleteExpense } = useExpenses(month);
  const { getCategoryById } = useCategories();

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

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function startEdit(exp: Expense) {
    setEditingId(exp.id!);
    setEditState({ amount: String(exp.amount), description: exp.description, date: exp.date });
    setEditError('');
  }

  async function saveEdit(id: string) {
    const num = parseFloat(editState.amount);
    if (isNaN(num) || num <= 0) { setEditError('Enter a positive amount.'); return; }
    await updateExpense(id, { amount: Math.round(num), description: editState.description.trim(), date: editState.date });
    setEditingId(null);
    setEditError('');
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? <span className="text-slate-300">↕</span> : <span className="text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  return (
    <>
      <Modal title={category?.name ?? 'Category'} onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-6 space-y-4">
          {categoryExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No expenses in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                      Date <SortIcon field="date" />
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-800 select-none w-full" onClick={() => toggleSort('description')}>
                      Description <SortIcon field="description" />
                    </th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => toggleSort('amount')}>
                      Amount <SortIcon field="amount" />
                    </th>
                    <th className="py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((exp) =>
                    editingId === exp.id ? (
                      <EditRow key={exp.id} state={editState} error={editError} onChange={setEditState}
                        onSave={() => saveEdit(exp.id!)} onCancel={() => { setEditingId(null); setEditError(''); }} />
                    ) : (
                      <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                        <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap text-xs">{formatShortDate(exp.date)}</td>
                        <td className="py-2.5 pr-4 text-slate-700 truncate max-w-[200px]">
                          {exp.description || <span className="text-slate-300 italic">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-medium text-slate-800 whitespace-nowrap">{formatMKD(exp.amount)}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(exp)} title="Edit"
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button onClick={() => setDeleteTargetId(exp.id!)} title="Delete"
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
                  <tr className="border-t border-slate-200">
                    <td colSpan={2} className="pt-3 text-xs font-medium text-slate-500">
                      {categoryExpenses.length} expense{categoryExpenses.length !== 1 ? 's' : ''}
                    </td>
                    <td className="pt-3 text-right font-semibold text-slate-900 whitespace-nowrap">{formatMKD(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
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

function EditRow({ state, error, onChange, onSave, onCancel }: {
  state: EditState; error: string;
  onChange: (s: EditState) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <tr className="border-b border-indigo-100 bg-indigo-50/50">
      <td className="py-1.5 pr-3">
        <input type="date" value={state.date} onChange={(e) => onChange({ ...state, date: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </td>
      <td className="py-1.5 pr-3">
        <input type="text" value={state.description} onChange={(e) => onChange({ ...state, description: e.target.value })} placeholder="Description"
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </td>
      <td className="py-1.5 pr-3">
        <input type="number" min="1" step="1" value={state.amount} onChange={(e) => onChange({ ...state, amount: e.target.value })}
          className="w-full px-2 py-1 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </td>
      <td className="py-1.5">
        <div className="flex items-center gap-1">
          <button onClick={onSave} title="Save" className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button onClick={onCancel} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
