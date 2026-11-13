import React from 'react';
import { Correction } from '../../../types/domain';
import { formatDateTime } from '../../../utils/dateUtils';

interface TicketCorrectionsSectionProps {
  corrections: Correction[];
}

export const TicketCorrectionsSection: React.FC<TicketCorrectionsSectionProps> = ({ corrections }) => {
  return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">history_edu</span>
          <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
            Edit History
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
            {corrections.length}
          </span>
        </div>

        {corrections.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No edits made to this ticket yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
            {corrections.map((corr) => (
              <div
                key={corr.id}
                className="text-xs pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex items-center justify-between text-gray-400 text-xs">
                  <span className="font-mono font-bold text-primary">
                    field: {corr.fieldName || (corr as any).field_name}
                  </span>
                  <span>{formatDateTime(corr.createdAt || (corr as any).created_at)}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                  <span className="text-red-500 line-through truncate max-w-[140px]">
                    {corr.oldValue ?? (corr as any).old_value ?? 'null'}
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                  <span className="text-emerald-500 font-bold truncate max-w-[140px]">
                    {corr.newValue ?? (corr as any).new_value ?? 'null'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    By: {corr.changedBy || (corr as any).changed_by_name || 'System / Tech'}
                  </span>
                  {corr.reason && <span className="italic">"{corr.reason}"</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
};
