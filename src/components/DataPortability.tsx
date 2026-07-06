import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { db } from '@/db/database';
import type { ExportData } from '@/db/types';

interface DataPortabilityProps {
  onClose: () => void;
}

export function DataPortability({ onClose }: DataPortabilityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  async function handleExport() {
    const [budgets, expenses, categories] = await Promise.all([
      db.budgets.toArray(),
      db.expenses.toArray(),
      db.categories.toArray(),
    ]);

    const data: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      budgets,
      expenses,
      categories,
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

    await db.transaction('rw', db.budgets, db.expenses, db.categories, async () => {
      await db.budgets.clear();
      await db.expenses.clear();
      await db.categories.clear();
      await db.budgets.bulkPut(pendingImport.budgets);
      await db.expenses.bulkPut(pendingImport.expenses);
      await db.categories.bulkPut(pendingImport.categories);
    });

    setPendingImport(null);
    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      onClose();
    }, 1500);
  }

  return (
    <>
      <Modal title="Backup & Restore" onClose={onClose} maxWidth="max-w-sm">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Export</h3>
            <p className="text-xs text-slate-500">
              Download all your data as a JSON file. Use it as a backup or to transfer data.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
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
              Restore from a previously exported backup file.{' '}
              <strong className="text-slate-700">This replaces all current data.</strong>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2.5 text-sm font-medium rounded-xl border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${
                importSuccess
                  ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
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
          confirmLabel="Restore"
          variant="warning"
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </>
  );
}
