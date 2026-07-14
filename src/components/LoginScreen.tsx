interface LoginScreenProps {
  onSignIn: () => void;
  error?: string | null;
}

export function LoginScreen({ onSignIn, error }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-paper font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-rule-bold rounded-md px-7 pt-7 pb-6">
          {/* Statement masthead */}
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Shared household ledger</p>
              <h1 className="text-xl font-bold text-ink tracking-tight mt-1.5">Personal Finance</h1>
            </div>
            <div className="w-9 h-9 rounded-full border-[1.5px] border-ink flex items-center justify-center font-mono font-semibold text-lg text-ink shrink-0">
              $
            </div>
          </div>

          <div className="border-t-2 border-ink mt-3.5" />

          <p className="text-sm text-ink-soft leading-relaxed mt-4">
            One budget for the two of you — income, spending and savings, kept in sync.
          </p>

          <button
            onClick={onSignIn}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-ink text-ink text-sm font-medium rounded-md hover:bg-ledgerbar transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {error && (
            <div className="mt-4 border border-debit/25 bg-debit/5 rounded-md px-3.5 py-3 text-left">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-debit mb-1">Sign-in error</p>
              <p className="text-xs text-debit break-words leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-soft mt-4">
          Access limited to household members
        </p>
      </div>
    </div>
  );
}
