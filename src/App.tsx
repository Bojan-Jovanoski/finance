import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { MonthSetup } from '@/components/MonthSetup';
import { CategoryDrillDown } from '@/components/CategoryDrillDown';
import { CategoryManager } from '@/components/CategoryManager';
import { DataPortability } from '@/components/DataPortability';
import { LoginScreen } from '@/components/LoginScreen';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import { currentMonth } from '@/utils/format';

function AppContent({ uid }: { uid: string }) {
  const [month, setMonth] = useState(currentMonth);
  const { budget } = useMonthBudget(uid, month);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDataPortability, setShowDataPortability] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <Header
        month={month}
        onMonthChange={setMonth}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onOpenDataPortability={() => setShowDataPortability(true)}
        onSignOut={signOut}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {budget === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : budget === null ? (
          <MonthSetup uid={uid} month={month} />
        ) : (
          <Dashboard
            uid={uid}
            month={month}
            budget={budget}
            onSelectCategory={setSelectedCategoryId}
          />
        )}
      </main>

      {selectedCategoryId !== null && (
        <CategoryDrillDown
          uid={uid}
          categoryId={selectedCategoryId}
          month={month}
          onClose={() => setSelectedCategoryId(null)}
        />
      )}
      {showCategoryManager && (
        <CategoryManager uid={uid} onClose={() => setShowCategoryManager(false)} />
      )}
      {showDataPortability && (
        <DataPortability uid={uid} onClose={() => setShowDataPortability(false)} />
      )}
    </>
  );
}

export default function App() {
  const { user, signIn, authError } = useAuth();

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null) {
    return <LoginScreen onSignIn={signIn} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AppContent uid={user.uid} />
      <UpdatePrompt />
    </div>
  );
}
