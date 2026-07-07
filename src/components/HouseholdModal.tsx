import { useState } from 'react';
import { Modal } from './Modal';

interface HouseholdModalProps {
  uid: string;
  members: string[];
  onAddMember: (memberUid: string) => Promise<void>;
  onClose: () => void;
}

export function HouseholdModal({ uid, members, onAddMember, onClose }: HouseholdModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) { setError('Paste your partner’s link code.'); return; }
    if (members.includes(trimmed)) { setError('That person is already a member.'); return; }
    setError('');
    setBusy(true);
    try {
      await onAddMember(trimmed);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member.');
    } finally {
      setBusy(false);
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
    <Modal title="Household" onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Members</h3>
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <code className="text-xs break-all">{m}</code>
                {m === uid && <span className="text-xs text-slate-400">(you)</span>}
              </li>
            ))}
          </ul>
        </div>

        <hr className="border-slate-100" />

        <form onSubmit={handleAdd} className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Add your partner</h3>
          <p className="text-xs text-slate-500">
            Ask your partner to sign in, copy the link code shown on their screen, and paste it here.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste link code…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {busy ? 'Adding…' : 'Add member'}
          </button>
        </form>

        <hr className="border-slate-100" />

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Your link code</h3>
          <p className="text-xs text-slate-500">Share this if your partner needs to add you instead.</p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 break-all select-all">
              {uid}
            </code>
            <button
              onClick={copyCode}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
