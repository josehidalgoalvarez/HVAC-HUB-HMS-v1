import React, { useState, useEffect } from 'react';
import { outbox } from '../../src/offline/outbox';
import apiClient from '../../src/api/client';

export const OfflineStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = outbox.subscribe((count) => {
      setUnsyncedCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await outbox.sync(apiClient);
    } catch (e) {
      console.warn('[OfflineStatusBadge] Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no unsynced changes, stay unobtrusive
  if (isOnline && unsyncedCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold transition-all duration-300 animate-slideDown">
      {!isOnline ? (
        <div className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-full border border-amber-600 shadow-sm">
          <span className="material-symbols-outlined text-[16px] animate-pulse">cloud_off</span>
          <span>Offline Mode</span>
          {unsyncedCount > 0 && (
            <span className="bg-amber-700/80 text-amber-100 text-[11px] px-1.5 py-0.5 rounded-full font-mono">
              {unsyncedCount} unsynced {unsyncedCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-brand-blue text-white px-3 py-1 rounded-full border border-blue-600 shadow-sm">
          <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
          <span>{unsyncedCount} unsynced {unsyncedCount === 1 ? 'change' : 'changes'}</span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="ml-1 px-2 py-0.5 bg-white text-brand-blue rounded-full text-[11px] hover:bg-gray-100 font-extrabold uppercase"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineStatusBadge;
