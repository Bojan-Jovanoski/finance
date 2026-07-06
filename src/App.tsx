import { useState } from 'react';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { MonthSetup } from '@/components/MonthSetup';
import { CategoryDrillDown } from '@/components/CategoryDrillDown';
import { CategoryManager } from '@/components/CategoryManager';
import { DataPortability } from '@/components/DataPortability';
import { useMonthBudget } from '@/hooks/useMonthBudget';
import { currentMonth } from '@/utils/format';

function AppContent({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const { budget } = useMonthBudget(month);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDataPortability, setShowDataPortability] = useState(false);

  return (
    <>
      <Header
        month={month}
        onMonthChange={setMonth}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onOpenDataPortability={() => setShowDataPortability(true)}
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
    </>
  );
}

export default function App() {
  const [month, setMonth] = useState(currentMonth);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AppContent month={month} setMonth={setMonth} />
    </div>
  );
}
