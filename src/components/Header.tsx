import { useEffect, useRef, useState } from 'react';
import { formatMonthLabel, prevMonth, nextMonth, currentMonth } from '@/utils/format';

interface HeaderProps {
  month: string;
  onMonthChange: (month: string) => void;
  unseenCount: number;
  onOpenCategoryManager: () => void;
  onOpenDataPortability: () => void;
  onOpenHousehold: () => void;
  onOpenHistory: () => void;
  onOpenTransactions: () => void;
  onSignOut: () => void;
}

export function Header({
  month,
  onMonthChange,
  unseenCount,
  onOpenCategoryManager,
  onOpenDataPortability,
  onOpenHousehold,
  onOpenHistory,
  onOpenTransactions,
  onSignOut,
}: HeaderProps) {
  const isCurrentMonth = month === currentMonth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  function runAndClose(fn: () => void) {
    setMenuOpen(false);
    fn();
  }

  return (
    <header className="bg-paper/95 backdrop-blur border-b-2 border-ink sticky top-0 z-40 safe-top">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center font-mono font-semibold text-ink">
            $
          </div>
          <span className="font-semibold text-ink text-sm hidden sm:block tracking-tight">Finance</span>
        </div>

        <div className="flex items-center gap-0.5 mx-auto">
          <button
            onClick={() => onMonthChange(prevMonth(month))}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-soft hover:text-ink hover:bg-ledgerbar transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onMonthChange(currentMonth())}
            className={`px-2 h-8 font-mono text-sm font-medium rounded-md transition-colors w-[128px] text-center ${
              isCurrentMonth ? 'text-ink' : 'text-ink-soft hover:text-ink hover:bg-ledgerbar'
            }`}
          >
            {formatMonthLabel(month)}
          </button>
          <button
            onClick={() => onMonthChange(nextMonth(month))}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-soft hover:text-ink hover:bg-ledgerbar transition-colors"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              menuOpen ? 'text-ink bg-ledgerbar' : 'text-ink-soft hover:text-ink hover:bg-ledgerbar'
            }`}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {unseenCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-debit text-paper font-mono text-[10px] font-semibold leading-none">
                {unseenCount > 9 ? '9+' : unseenCount}
              </span>
            )}
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-1.5 w-52 bg-white rounded-md shadow-lg border border-rule-bold py-1.5 z-50">
              <MenuItem label="Recently added" badge={unseenCount} onClick={() => runAndClose(onOpenHistory)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </MenuItem>
              <MenuItem label="Transactions" onClick={() => runAndClose(onOpenTransactions)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </MenuItem>
              <MenuItem label="Household" onClick={() => runAndClose(onOpenHousehold)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.5-4.66" />
              </MenuItem>
              <MenuItem label="Categories" onClick={() => runAndClose(onOpenCategoryManager)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </MenuItem>
              <MenuItem label="Backup & restore" onClick={() => runAndClose(onOpenDataPortability)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </MenuItem>
              <div className="my-1 border-t border-rule" />
              <MenuItem label="Sign out" onClick={() => runAndClose(onSignOut)}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ label, onClick, children, badge = 0 }: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ledgerbar active:bg-rule transition-colors"
    >
      <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {children}
      </svg>
      {label}
      {badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-debit text-paper font-mono text-[10px] font-semibold leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
