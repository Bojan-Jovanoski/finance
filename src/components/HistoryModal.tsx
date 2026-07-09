import { Modal } from './Modal';
import { useCategories } from '@/hooks/useCategories';
import { createdAtToDate } from '@/hooks/useRecentExpenses';
import { formatMKD, formatRelativeTime } from '@/utils/format';
import type { Expense } from '@/db/types';

interface HistoryModalProps {
  recent: Expense[] | undefined;
  currentUid: string;
  seenThreshold: number; // items from others newer than this were unseen when opened
  onClose: () => void;
}

export function HistoryModal({ recent, currentUid, seenThreshold, onClose }: HistoryModalProps) {
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
              const isNew =
                exp.createdBy !== currentUid &&
                !!when &&
                when.getTime() > seenThreshold;
              return (
                <li key={exp.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink flex items-center gap-2">
                      <span>
                        {category?.name ?? 'Uncategorised'}
                        {exp.description && (
                          <span className="text-ink-soft"> · {exp.description}</span>
                        )}
                      </span>
                      {isNew && (
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-debit border border-debit rounded px-1 leading-tight">
                          New
                        </span>
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
