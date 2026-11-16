import { useEffect, useRef, useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { useMerchantCategories } from '@/hooks/useMerchantCategories';
import { defaultDateForMonth, monthDateBounds, formatMKD } from '@/utils/format';
import { receiptScanEnabled, scanReceipt, warmReceiptModel, checkReceiptServer, type ReceiptServerStatus } from '@/utils/receiptScan';

interface QuickAddFormProps {
  month: string;
}

const fieldLabel = 'block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1.5';
const underline = 'w-full bg-transparent border-0 border-b border-rule-bold px-0.5 py-1.5 text-ink focus:outline-none focus:border-ink transition-colors';

export function QuickAddForm({ month }: QuickAddFormProps) {
  const { categories, getCategoryById } = useCategories();
  const { expenses, addExpense } = useExpenses(month);
  const { categoryForMerchant, rememberMerchantCategory } = useMerchantCategories();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateForMonth(month));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const [scannedMerchant, setScannedMerchant] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [serverStatus, setServerStatus] = useState<ReceiptServerStatus>('checking');
  const fileInput = useRef<HTMLInputElement>(null);

  const dateBounds = monthDateBounds(month);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  async function refreshServerStatus() {
    if (!receiptScanEnabled || !navigator.onLine) return;
    setServerStatus('checking');
    setServerStatus(await checkReceiptServer());
  }

  // Check the home PC on load, and again whenever the app comes back into view.
  useEffect(() => {
    refreshServerStatus();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshServerStatus(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refreshServerStatus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refreshServerStatus);
    };
  }, []);

  function pickPicture() {
    if (serverStatus !== 'ready') { refreshServerStatus(); return; }
    warmReceiptModel();
    fileInput.current?.click();
  }

  // Fills the form from a receipt photo. Nothing is saved until the user taps Record.
  async function handlePicture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setScanNote('');
    setScannedMerchant(null);
    setScanning(true);
    try {
      const result = await scanReceipt(file, categories);
      if (!result.amount) {
        setError('Could not find a total on that picture. Enter it by hand.');
        return;
      }
      setAmount(String(result.amount));
      setScannedMerchant(result.merchant);

      // A category picked for this shop before wins over the model's guess.
      const remembered = result.merchant ? categoryForMerchant(result.merchant) : undefined;
      const rememberedCat = remembered ? getCategoryById(remembered) : undefined;
      const scannedCategoryId = rememberedCat?.id ?? result.categoryId;
      if (scannedCategoryId) setCategoryId(scannedCategoryId);
      const memo = [result.merchant, result.summary].filter(Boolean).join(': ');
      if (memo) setDescription(memo.slice(0, 200));

      const notes = ['Filled from receipt — check and record.'];
      if (result.original) {
        const { amount: orig, currency, rate } = result.original;
        notes.push(`Converted from ${orig.toLocaleString('de-DE')} ${currency} at ${rate.toLocaleString('de-DE')} ден.`);
      }
      if (result.date && result.date >= dateBounds.min && result.date <= dateBounds.max) {
        setDate(result.date);
      } else if (result.date) {
        notes.push(`Receipt is dated ${result.date}, outside this month, so the date was left as is.`);
      }
      if (rememberedCat) notes.push(`${rememberedCat.name}, as last time for ${result.merchant}.`);
      if (!scannedCategoryId) notes.push('Pick a category.');
      setScanNote(notes.join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the receipt.');
      refreshServerStatus();
    } finally {
      setScanning(false);
    }
  }

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

  const isDirty = amount !== '' || categoryId !== '' || description !== '' || date !== defaultDateForMonth(month) || !!scanNote || !!error;

  function clearForm() {
    setAmount('');
    setCategoryId('');
    setDescription('');
    setDate(defaultDateForMonth(month));
    setError('');
    setScanNote('');
    setScannedMerchant(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { setError('Enter a positive amount.'); return; }
    if (!categoryId) { setError('Select a category.'); return; }
    const entry = { amount: Math.round(num), categoryId, description: description.trim(), date };

    // Remember the category chosen for a scanned shop, so the next scan uses it.
    if (scannedMerchant) {
      rememberMerchantCategory(scannedMerchant, categoryId).catch((err) => console.error('Failed to remember category', err));
      setScannedMerchant(null);
    }

    // Optimistic: with offline persistence the write is durably queued in
    // IndexedDB immediately (the promise only resolves once the server acks,
    // which never happens while offline). So we confirm as soon as it's queued
    // and only surface an error if the write is actually rejected.
    setError('');
    setScanNote('');
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
      {isDirty && !scanning && (
        <button
          type="button" onClick={clearForm}
          className="absolute -top-2 right-4 bg-white px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft hover:text-ink transition-colors"
        >
          Clear
        </button>
      )}

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

      {scanNote && <p className="text-xs text-credit mt-3">{scanNote}</p>}
      {error && <p className="text-xs text-debit mt-3">{error}</p>}

      <button
        type="submit"
        className={`mt-5 w-full py-3 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
          success ? 'bg-credit text-white' : 'bg-ink text-paper hover:bg-black'
        }`}
      >
        {success ? '✓ Recorded' : 'Record expense'}
      </button>

      {receiptScanEnabled && online && (
        <>
          <input ref={fileInput} type="file" accept="image/*" onChange={handlePicture} className="hidden" />
          <button
            type="button" onClick={pickPicture} disabled={scanning || serverStatus === 'checking'}
            className={`mt-2 w-full py-2.5 border border-rule-bold font-mono text-xs uppercase tracking-[0.1em] hover:bg-ledgerbar transition-colors disabled:opacity-60 disabled:cursor-wait ${
              serverStatus === 'ready' ? 'text-ink' : 'text-ink-soft'
            }`}
          >
            {scanning ? 'Reading receipt…'
              : serverStatus === 'ready' ? 'Add from picture'
              : serverStatus === 'checking' ? 'Checking home PC…'
              : serverStatus === 'not-ready' ? 'Receipt reader starting · tap to retry'
              : 'Home PC offline · tap to retry'}
          </button>
        </>
      )}
    </form>
  );
}
