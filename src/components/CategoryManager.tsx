import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useCategories } from '@/hooks/useCategories';
import { formatMKD } from '@/utils/format';
import type { Category } from '@/db/types';

interface CategoryManagerProps {
  uid: string;
  onClose: () => void;
}

export function CategoryManager({ uid, onClose }: CategoryManagerProps) {
  const { categories, addCategory, renameCategory, deleteCategory, setCategoryLimit } = useCategories(uid);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) { setAddError('Enter a name.'); return; }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) { setAddError('Category already exists.'); return; }
    await addCategory(trimmed);
    setNewName('');
    setAddError('');
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id!);
    setEditName(cat.name);
    setEditLimit(cat.monthlyLimit ? String(cat.monthlyLimit) : '');
    setEditError('');
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty.'); return; }
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setEditError('Name already taken.');
      return;
    }
    const limitVal = editLimit.trim() === '' ? null : parseFloat(editLimit);
    if (limitVal !== null && (isNaN(limitVal) || limitVal <= 0)) {
      setEditError('Limit must be a positive number.');
      return;
    }
    const cat = categories.find((c) => c.id === id);
    if (cat && trimmed !== cat.name) await renameCategory(id, trimmed);
    const newLimit = limitVal !== null ? Math.round(limitVal) : null;
    const existingLimit = cat?.monthlyLimit ?? null;
    if (newLimit !== existingLimit) await setCategoryLimit(id, newLimit);
    setEditingId(null);
    setEditError('');
  }

  const isOther = (c: Category) => c.name === 'Other';

  return (
    <>
      <Modal title="Categories" onClose={onClose} maxWidth="max-w-md">
        <div className="p-5 space-y-5">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name…" maxLength={50}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Add
            </button>
          </form>
          {addError && <p className="text-xs text-red-500 -mt-3">{addError}</p>}

          <ul className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <li key={cat.id} className="py-2.5">
                {editingId === cat.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        autoFocus maxLength={50} placeholder="Category name"
                        className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(cat.id!); if (e.key === 'Escape') { setEditingId(null); setEditError(''); } }}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number" min="0" step="1" value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        placeholder="Monthly limit (optional)"
                        className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">ден</span>
                    </div>
                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(cat.id!)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditError(''); }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        {cat.name}
                        {cat.isDefault && <span className="ml-1.5 text-xs text-slate-400">default</span>}
                      </p>
                      {cat.monthlyLimit && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Limit: {formatMKD(cat.monthlyLimit)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(cat)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => !isOther(cat) && setDeleteTarget(cat)}
                      disabled={isOther(cat)}
                      title={isOther(cat) ? '"Other" cannot be deleted' : 'Delete'}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                        isOther(cat) ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"? Any expenses in this category will be moved to "Other".`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteCategory(deleteTarget.id!); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
