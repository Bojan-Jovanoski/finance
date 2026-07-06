import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/db/types';

interface CategoryManagerProps {
  uid: string;
  onClose: () => void;
}

export function CategoryManager({ uid, onClose }: CategoryManagerProps) {
  const { categories, addCategory, renameCategory, deleteCategory } = useCategories(uid);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  async function handleRename(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty.'); return; }
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) { setEditError('Name already taken.'); return; }
    await renameCategory(id, trimmed);
    setEditingId(null);
    setEditError('');
  }

  const isOther = (c: Category) => c.name === 'Other';

  return (
    <>
      <Modal title="Categories" onClose={onClose} maxWidth="max-w-md">
        <div className="p-6 space-y-5">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name…" maxLength={50}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Add</button>
          </form>
          {addError && <p className="text-xs text-red-500 -mt-3">{addError}</p>}

          <ul className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-2 py-2">
                {editingId === cat.id ? (
                  <>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus maxLength={50}
                      className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cat.id!); if (e.key === 'Escape') { setEditingId(null); setEditError(''); } }} />
                    {editError && <span className="text-xs text-red-500">{editError}</span>}
                    <button onClick={() => handleRename(cat.id!)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                    <button onClick={() => { setEditingId(null); setEditError(''); }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700">
                      {cat.name}
                      {cat.isDefault && <span className="ml-1.5 text-xs text-slate-400">default</span>}
                    </span>
                    <button onClick={() => { setEditingId(cat.id!); setEditName(cat.name); setEditError(''); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Rename">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => !isOther(cat) && setDeleteTarget(cat)} disabled={isOther(cat)}
                      title={isOther(cat) ? '"Other" cannot be deleted' : 'Delete'}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isOther(cat) ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog message={`Delete "${deleteTarget.name}"? Any expenses in this category will be moved to "Other".`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteCategory(deleteTarget.id!); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
