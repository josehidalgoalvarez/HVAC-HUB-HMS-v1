import React from 'react';
import { useInventory } from '../../hooks/useData';

export const SyncStatusIndicator: React.FC = () => {
  const { isSyncing, lastSyncedAt } = useInventory();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formatDate = (ts: number) => {
    try {
      const d = new Date(ts);
      const month = d.toLocaleDateString(undefined, { month: 'short' });
      const day = d.getDate();
      const time = formatTime(ts);
      return `${month} ${day}, ${time}`;
    } catch {
      return '';
    }
  };

  // State 1: Syncing...
  if (isSyncing) {
    return (
      <div
        data-testid="sync-status-indicator"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-primary dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
      >
        <span className="material-symbols-outlined text-[13px] animate-spin">
          progress_activity
        </span>
        <span>Syncing…</span>
      </div>
    );
  }

  // State 2: Offline or failed fetch (fallback to cached data)
  if (!isOnline) {
    return (
      <div
        data-testid="sync-status-indicator"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
      >
        <span className="material-symbols-outlined text-[13px]">
          cloud_off
        </span>
        <span>
          {lastSyncedAt
            ? `Offline — showing saved data from ${formatDate(lastSyncedAt)}`
            : 'Offline — showing saved data'}
        </span>
      </div>
    );
  }

  // State 3: Successfully updated
  if (lastSyncedAt) {
    return (
      <div
        data-testid="sync-status-indicator"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-text-sub-light dark:bg-neutral-800/60 dark:text-text-sub-dark border border-gray-200/60 dark:border-gray-800"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Updated {formatTime(lastSyncedAt)}</span>
      </div>
    );
  }

  return null;
};

export default SyncStatusIndicator;
