import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { Analysis } from '@/components/Analysis';
import { MonthSetup } from '@/components/MonthSetup';
import { CategoryDrillDown } from '@/components/CategoryDrillDown';
import { CategoryManager } from '@/components/CategoryManager';
import { DataPortability } from '@/components/DataPortability';
import { LoginScreen } from '@/components/LoginScreen';
import { HouseholdSetup } from '@/components/HouseholdSetup';
import { HouseholdModal } from '@/components/HouseholdModal';
import { HistoryModal } from '@/components/HistoryModal';
import { TransactionsModal } from '@/components/TransactionsModal';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import { useRecentExpenses } from '@/hooks/useRecentExpenses';
import { useSeenHistory } from '@/hooks/useSeenHistory';
import { currentMonth } from '@/utils/format';

function Spinner() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
        active ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function AppContent({
  user,
  members,
  addMember,
  onSignOut,
}: {
  user: User;
  members: string[];
  addMember: (memberUid: string) => Promise<void>;
  onSignOut: () => void;
}) {
  const [month, setMonth] = useState(currentMonth);
  const { budget } = useMonthBudget(month);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDataPortability, setShowDataPortability] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [historyThreshold, setHistoryThreshold] = useState(0);
  const [view, setView] = useState<'overview' | 'analysis'>('overview');

  const recent = useRecentExpenses();
  const { unseenCount, lastSeenAt, markAllSeen } = useSeenHistory(recent, user.uid);

  function openHistory() {
    setHistoryThreshold(lastSeenAt); // freeze cutoff before marking seen, to flag new rows
    markAllSeen();
    setShowHistory(true);
  }

  return (
    <>
      <Header
        month={month}
        onMonthChange={setMonth}
        unseenCount={unseenCount}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onOpenDataPortability={() => setShowDataPortability(true)}
        onOpenHousehold={() => setShowHousehold(true)}
        onOpenHistory={openHistory}
        onOpenTransactions={() => setShowTransactions(true)}
        onSignOut={onSignOut}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {budget === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : budget === null ? (
          <MonthSetup month={month} />
        ) : (
          <div className="space-y-6">
            <div className="flex border border-rule-bold rounded-md overflow-hidden w-full max-w-xs mx-auto">
              <TabButton active={view === 'overview'} onClick={() => setView('overview')}>Overview</TabButton>
              <TabButton active={view === 'analysis'} onClick={() => setView('analysis')}>Analysis</TabButton>
            </div>
            {view === 'overview' ? (
              <Dashboard
                month={month}
                budget={budget}
                onSelectCategory={setSelectedCategoryId}
                onManageCategories={() => setShowCategoryManager(true)}
              />
            ) : (
              <Analysis month={month} budget={budget} />
            )}
          </div>
        )}
      </main>

      {selectedCategoryId !== null && (
        <CategoryDrillDown
          categoryId={selectedCategoryId}
          month={month}
          onClose={() => setSelectedCategoryId(null)}
        />
      )}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          spendable={budget ? budget.income - budget.savingsGoal : undefined}
        />
      )}
      {showDataPortability && (
        <DataPortability onClose={() => setShowDataPortability(false)} />
      )}
      {showHousehold && (
        <HouseholdModal
          uid={user.uid}
          members={members}
          onAddMember={addMember}
          onClose={() => setShowHousehold(false)}
        />
      )}
      {showHistory && (
        <HistoryModal
          recent={recent}
          currentUid={user.uid}
          seenThreshold={historyThreshold}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showTransactions && (
        <TransactionsModal onClose={() => setShowTransactions(false)} />
      )}
    </>
  );
}

function HouseholdGate({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { household, status, createHousehold, addMember } = useHousehold(user.uid);

  if (status === 'loading') return <Spinner />;

  if (status !== 'linked') {
    return (
      <HouseholdSetup
        uid={user.uid}
        status={status}
        onCreate={createHousehold}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper font-sans">
      <AppContent
        user={user}
        members={household?.members ?? []}
        addMember={addMember}
        onSignOut={onSignOut}
      />
      <UpdatePrompt />
    </div>
  );
}

export default function App() {
  const { user, signIn, signOut, authError, pendingRedirect } = useAuth();

  if (user === undefined || pendingRedirect) return <Spinner />;

  if (user === null) {
    return <LoginScreen onSignIn={signIn} error={authError} />;
  }

  return <HouseholdGate user={user} onSignOut={signOut} />;
}
