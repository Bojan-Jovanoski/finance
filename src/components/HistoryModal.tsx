import { Modal } from './Modal';
import { useCategories } from '@/hooks/useCategories';
import { useRecentExpenses, createdAtToDate } from '@/hooks/useRecentExpenses';
import { formatMKD, formatRelativeTime } from '@/utils/format';

interface HistoryModalProps {
  onClose: () => void;
}

export function HistoryModal({ onClose }: HistoryModalProps) {
  const recent = useRecentExpenses();
  const { getCategoryById } = useCategories();

  return (
    <Modal title="Recently added" onClose={onClose} maxWidth="max-w-md">
      <div className="p-5">
        {recent === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-8">
            Nothing added yet. Newly added expenses will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {recent.map((exp) => {
              const when = createdAtToDate(exp.createdAt);
              const category = getCategoryById(exp.categoryId);
              return (
                <li key={exp.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink">
                      {category?.name ?? 'Uncategorised'}
                      {exp.description && (
                        <span className="text-ink-soft"> · {exp.description}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {exp.createdByName ?? 'Someone'}
                      {when && <> · {formatRelativeTime(when)}</>}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-medium text-ink whitespace-nowrap">
                    {formatMKD(exp.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
