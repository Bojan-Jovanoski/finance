import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { MonthSetup } from '@/components/MonthSetup';
import { CategoryDrillDown } from '@/components/CategoryDrillDown';
import { CategoryManager } from '@/components/CategoryManager';
import { DataPortability } from '@/components/DataPortability';
import { LoginScreen } from '@/components/LoginScreen';
import { HouseholdSetup } from '@/components/HouseholdSetup';
import { HouseholdModal } from '@/components/HouseholdModal';
import { HistoryModal } from '@/components/HistoryModal';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import { currentMonth } from '@/utils/format';

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
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

  return (
    <>
      <Header
        month={month}
        onMonthChange={setMonth}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onOpenDataPortability={() => setShowDataPortability(true)}
        onOpenHousehold={() => setShowHousehold(true)}
        onOpenHistory={() => setShowHistory(true)}
        onSignOut={onSignOut}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {budget === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : budget === null ? (
          <MonthSetup month={month} />
        ) : (
          <Dashboard
            month={month}
            budget={budget}
            onSelectCategory={setSelectedCategoryId}
          />
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
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
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
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
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
    <div className="min-h-screen bg-slate-50 font-sans">
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
