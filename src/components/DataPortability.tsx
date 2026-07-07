import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { firestore } from '@/db/firebase';
import {
  collection, getDocs, doc, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { HOUSEHOLD_ID } from '@/config/household';
import type { ExportData, Budget, Expense, Category } from '@/db/types';

interface DataPortabilityProps {
  onClose: () => void;
}

export function DataPortability({ onClose }: DataPortabilityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  async function handleExport() {
    const [budgetsSnap, expensesSnap, categoriesSnap] = await Promise.all([
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'budgets')),
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'expenses')),
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'categories')),
    ]);

    const data: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      budgets: budgetsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget)),
      expenses: expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)),
      categories: categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ExportData;
        if (parsed.version !== 1 || !Array.isArray(parsed.budgets) || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.categories)) {
          setImportError('Invalid backup file format.');
          return;
        }
        setPendingImport(parsed);
      } catch {
        setImportError('Could not parse the file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function confirmImport() {
    if (!pendingImport) return;

    // Delete existing data
    const [budgetsSnap, expensesSnap, categoriesSnap] = await Promise.all([
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'budgets')),
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'expenses')),
      getDocs(collection(firestore, 'households', HOUSEHOLD_ID, 'categories')),
    ]);
    await Promise.all([
      ...budgetsSnap.docs.map((d) => deleteDoc(d.ref)),
      ...expensesSnap.docs.map((d) => deleteDoc(d.ref)),
      ...categoriesSnap.docs.map((d) => deleteDoc(d.ref)),
    ]);

    // Write new data in batches of 499
    const writes: Array<() => void> = [];
    pendingImport.budgets.forEach((b) => {
      const { id, ...data } = b;
      writes.push(() => batch.set(doc(firestore, 'households', HOUSEHOLD_ID, 'budgets', id), data));
    });
    pendingImport.expenses.forEach((e) => {
      const { id, ...data } = e;
      writes.push(() => batch.set(doc(firestore, 'households', HOUSEHOLD_ID, 'expenses', id ?? crypto.randomUUID()), data));
    });
    pendingImport.categories.forEach((c) => {
      const { id, ...data } = c;
      writes.push(() => batch.set(doc(firestore, 'households', HOUSEHOLD_ID, 'categories', id ?? crypto.randomUUID()), data));
    });

    let batch = writeBatch(firestore);
    let count = 0;
    for (const write of writes) {
      write();
      count++;
      if (count === 499) {
        await batch.commit();
        batch = writeBatch(firestore);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();

    setPendingImport(null);
    setImportSuccess(true);
    setTimeout(() => { setImportSuccess(false); onClose(); }, 1500);
  }

  return (
    <>
      <Modal title="Backup & Restore" onClose={onClose} maxWidth="max-w-sm">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Export</h3>
            <p className="text-xs text-slate-500">Download all your data as a JSON file.</p>
            <button onClick={handleExport}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download backup
            </button>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Restore</h3>
            <p className="text-xs text-slate-500">
              Restore from a backup file. <strong className="text-slate-700">Replaces all current data.</strong>
            </p>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2.5 text-sm font-medium rounded-xl border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${
                importSuccess ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importSuccess ? 'Restored successfully' : 'Choose backup file'}
            </button>
            {importError && <p className="text-xs text-red-500">{importError}</p>}
          </div>
        </div>
      </Modal>

      {pendingImport && (
        <ConfirmDialog
          message={`This will replace all current data with the backup from ${new Date(pendingImport.exportedAt).toLocaleDateString()}. This cannot be undone.`}
          confirmLabel="Restore" variant="warning"
          onConfirm={confirmImport} onCancel={() => setPendingImport(null)} />
      )}
    </>
  );
}
