import { useState } from 'react';
import type { HouseholdStatus } from '@/hooks/useHousehold';

interface HouseholdSetupProps {
  uid: string;
  status: Extract<HouseholdStatus, 'none' | 'exists-not-member'>;
  onCreate: () => Promise<void>;
  onSignOut: () => void;
}

export function HouseholdSetup({ uid, status, onCreate, onSignOut }: HouseholdSetupProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      await onCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up the household.');
      setCreating(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the code is selectable below */
    }
  }

  return (
    <div className="min-h-screen bg-ledgerbar flex items-center justify-center px-4">
      <div className="bg-white rounded-md border border-rule-bold p-8 w-full max-w-md">
        {status === 'none' ? (
          <>
            <h2 className="text-lg font-semibold text-ink">Set up your shared household</h2>
            <p className="text-sm text-ink-soft mt-1 mb-6">
              This creates one shared space for your finances and copies your existing data into it.
              Your partner can then be added so you both see the same budgets and expenses.
            </p>
            {error && <p className="text-xs text-debit mb-3">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-2.5 bg-ink hover:bg-black disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {creating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {creating ? 'Setting up…' : 'Create shared household'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-ink">Ask your partner to add you</h2>
            <p className="text-sm text-ink-soft mt-1 mb-5">
              The shared household already exists. Send this link code to your partner and ask them
              to add you from their <strong className="text-ink">Household</strong> screen.
              Once added, reload this page.
            </p>
            <label className="block text-xs font-medium text-ink-soft mb-1">Your link code</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-ledgerbar border border-rule rounded-lg text-ink break-all select-all">
                {uid}
              </code>
              <button
                onClick={copyCode}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  copied ? 'bg-credit text-white' : 'bg-ink hover:bg-ink text-white'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </>
        )}

        <button
          onClick={onSignOut}
          className="mt-6 text-xs text-ink-soft hover:text-ink-soft transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
